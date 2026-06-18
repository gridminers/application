"""Parser: render the first page of each PDF in ./dump, send it to the Azure
Responses (vision) endpoint, and write a clean JSON of the 19 target fields +
warnings to ./processed_files.

Run once:    python main.py
Watch mode:  python main.py --watch [--interval SECONDS]

In watch mode the script keeps running, polling ./dump for new or changed PDFs
and processing them as they appear (Ctrl+C to stop).
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import sys
import time
from pathlib import Path

import fitz  # PyMuPDF
import requests
from dotenv import load_dotenv

from prompts import build_prompt
from schema import EXTRACTION_FORMAT

# --- Paths (relative to this file) -----------------------------------------
BASE_DIR = Path(__file__).resolve().parent
DUMP_DIR = BASE_DIR / "dump"
OUTPUT_DIR = BASE_DIR / "processed_files"
MANIFEST_PATH = OUTPUT_DIR / ".manifest.json"

# --- Rendering / request tuning --------------------------------------------
RENDER_DPI = 300            # high DPI for OCR-quality scans
TEXT_LAYER_MIN_CHARS = 20   # ignore near-empty text layers
REQUEST_TIMEOUT = 180       # seconds
MAX_RETRIES = 4             # attempts on 429 / 5xx
BACKOFF_BASE = 2.0          # seconds, exponential
POST_TIMEOUT = 30           # seconds, best-effort submit to C&C backend

# --- Watch mode tuning ------------------------------------------------------
WATCH_INTERVAL = 5.0        # seconds between dump-dir polls
STABILITY_CHECKS = 2        # consecutive identical (size, mtime) reads
STABILITY_DELAY = 0.5       # seconds between stability checks


def load_manifest() -> dict[str, str]:
    if MANIFEST_PATH.exists():
        try:
            return json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            print(f"[warn] could not read manifest at {MANIFEST_PATH}; starting fresh")
    return {}


def save_manifest(manifest: dict[str, str]) -> None:
    MANIFEST_PATH.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8"
    )


def sha256_of(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def render_first_page(path: Path) -> tuple[bytes, str | None]:
    """Return (png_bytes, text_layer_or_None) for page 1 of the PDF."""
    with fitz.open(path) as doc:
        if doc.page_count == 0:
            raise ValueError("PDF has no pages")
        page = doc.load_page(0)
        pix = page.get_pixmap(dpi=RENDER_DPI)
        png_bytes = pix.tobytes("png")
        text = page.get_text("text") or ""
    text_layer = text if len(text.strip()) >= TEXT_LAYER_MIN_CHARS else None
    return png_bytes, text_layer


def call_llm(png_bytes: bytes, text_layer: str | None, cfg: dict) -> dict:
    """Send the page to the Responses API and return the parsed JSON dict."""
    b64 = base64.b64encode(png_bytes).decode("ascii")
    payload = {
        "model": cfg["model"],
        "input": [
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": build_prompt(text_layer)},
                    {
                        "type": "input_image",
                        "image_url": f"data:image/png;base64,{b64}",
                    },
                ],
            }
        ],
        "text": {"format": EXTRACTION_FORMAT},
    }
    headers = {"api-key": cfg["api_key"], "Content-Type": "application/json"}
    params = {"api-version": cfg["api_version"]}

    last_err: Exception | None = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.post(
                cfg["endpoint"],
                headers=headers,
                params=params,
                json=payload,
                timeout=REQUEST_TIMEOUT,
            )
        except requests.RequestException as exc:
            last_err = exc
        else:
            if resp.status_code == 200:
                return extract_json(resp.json())
            if resp.status_code in (429,) or resp.status_code >= 500:
                last_err = RuntimeError(
                    f"HTTP {resp.status_code}: {resp.text[:500]}"
                )
            else:
                # Non-retryable (auth, bad model name, bad request, ...).
                raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:500]}")

        if attempt < MAX_RETRIES:
            delay = BACKOFF_BASE * (2 ** (attempt - 1))
            print(f"    retry {attempt}/{MAX_RETRIES - 1} after {delay:.0f}s ({last_err})")
            time.sleep(delay)

    raise RuntimeError(f"exhausted retries: {last_err}")


def extract_json(body: dict) -> dict:
    """Pull the structured JSON text out of a Responses API body and parse it."""
    text = body.get("output_text")
    if not text:
        chunks: list[str] = []
        for item in body.get("output", []):
            if item.get("type") != "message":
                continue
            for part in item.get("content", []):
                if part.get("type") in ("output_text", "text") and part.get("text"):
                    chunks.append(part["text"])
        text = "".join(chunks)
    if not text:
        raise ValueError(f"no text in response: {json.dumps(body)[:500]}")
    return json.loads(text)


def load_config() -> dict:
    load_dotenv(BASE_DIR / ".env")
    api_key = os.environ.get("AZURE_OPENAI_API_KEY", "").strip()
    if not api_key:
        sys.exit("error: AZURE_OPENAI_API_KEY is not set (see .env.example)")
    import_url = os.environ.get("IMPORT_API_URL", "").strip()
    if not import_url:
        sys.exit("error: IMPORT_API_URL is not set (see .env.example)")
    return {
        "api_key": api_key,
        "model": os.environ.get("AZURE_OPENAI_MODEL", "gpt-5.4").strip(),
        "endpoint": os.environ.get(
            "AZURE_OPENAI_ENDPOINT",
            "https://internal-use-ai.cognitiveservices.azure.com/openai/responses",
        ).strip(),
        "api_version": os.environ.get(
            "AZURE_OPENAI_API_VERSION", "2025-04-01-preview"
        ).strip(),
        "import_url": import_url,
    }


def post_result(out: dict, cfg: dict) -> None:
    """Best-effort POST of the result JSON to the C&C backend. Logs status."""
    try:
        resp = requests.post(cfg["import_url"], json=out, timeout=POST_TIMEOUT)
    except requests.RequestException as exc:
        print(f"[post]  submit failed: {exc}")
        return
    print(f"[post]  submit status {resp.status_code}")


def is_stable(path: Path) -> bool:
    """Return True once the file's size and mtime stop changing.

    Guards against picking up a PDF that is still being written/copied into the
    dump directory.
    """
    try:
        prev = path.stat()
    except OSError:
        return False
    for _ in range(STABILITY_CHECKS):
        time.sleep(STABILITY_DELAY)
        try:
            cur = path.stat()
        except OSError:
            return False
        if (cur.st_size, cur.st_mtime) != (prev.st_size, prev.st_mtime):
            return False
        prev = cur
    return True


def process_pdf(path: Path, manifest: dict[str, str], cfg: dict) -> str:
    """Process a single PDF. Returns one of: 'ok', 'skip', 'fail'.

    Updates and persists the manifest on success.
    """
    name = path.name
    try:
        digest = sha256_of(path)
    except OSError as exc:
        print(f"[fail] {name}: cannot read file ({exc})")
        return "fail"

    if digest in manifest:
        print(f"[skip] {name} (already processed -> {manifest[digest]})")
        return "skip"

    print(f"[proc] {name}")
    try:
        png_bytes, text_layer = render_first_page(path)
        result = call_llm(png_bytes, text_layer, cfg)
    except Exception as exc:  # noqa: BLE001 - report and keep going
        print(f"[fail] {name}: {exc}")
        return "fail"

    out = {
        "source_file": name,
        "targets": result.get("targets", {}),
        "warnings": result.get("warnings", []),
    }
    out_name = path.with_suffix(".json").name
    (OUTPUT_DIR / out_name).write_text(
        json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    manifest[digest] = out_name
    save_manifest(manifest)
    print(f"[ok]   {name} -> {out_name}")
    post_result(out, cfg)
    return "ok"


def scan_once(
    manifest: dict[str, str],
    cfg: dict,
    *,
    require_stable: bool = False,
) -> tuple[int, int, int]:
    """Process every pending PDF in the dump directory once.

    Returns a (succeeded, skipped, failed) count tuple.
    """
    succeeded = skipped = failed = 0
    for path in sorted(DUMP_DIR.glob("*.pdf")):
        if require_stable and not is_stable(path):
            print(f"[wait] {path.name} (still being written)")
            continue
        status = process_pdf(path, manifest, cfg)
        if status == "ok":
            succeeded += 1
        elif status == "skip":
            skipped += 1
        else:
            failed += 1
    return succeeded, skipped, failed


def run_once(cfg: dict) -> None:
    manifest = load_manifest()
    pdfs = sorted(DUMP_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"no PDFs found in {DUMP_DIR}")
        return

    succeeded, skipped, failed = scan_once(manifest, cfg)

    print("\n=== run summary ===")
    print(f"succeeded: {succeeded}")
    print(f"skipped:   {skipped}")
    print(f"failed:    {failed}")


def run_watch(cfg: dict, interval: float) -> None:
    manifest = load_manifest()
    print(f"watching {DUMP_DIR} every {interval:g}s (Ctrl+C to stop)")
    try:
        while True:
            succeeded, _, failed = scan_once(manifest, cfg, require_stable=True)
            if succeeded or failed:
                print(f"[scan] processed {succeeded}, failed {failed}")
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\nstopped watching")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--watch",
        action="store_true",
        help="keep running and process new/changed PDFs as they appear",
    )
    parser.add_argument(
        "--interval",
        type=float,
        default=WATCH_INTERVAL,
        metavar="SECONDS",
        help=f"polling interval in watch mode (default: {WATCH_INTERVAL:g})",
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)
    cfg = load_config()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    DUMP_DIR.mkdir(parents=True, exist_ok=True)

    if args.watch:
        run_watch(cfg, args.interval)
    else:
        run_once(cfg)


if __name__ == "__main__":
    main()
