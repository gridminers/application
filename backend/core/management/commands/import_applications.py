"""Management command to import JSON files into the application API.

Reads every ``*.json`` file from a given directory and POSTs each one to the
configured import endpoint. After all files have been processed a summary
table (filename + HTTP status code) is printed to stdout.

Place this file at::

    <your_app>/management/commands/import_applications.py

Example usage::

    python manage.py import_applications ./data
    python manage.py import_applications ./data --endpoint https://example.com/api/import/
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

import requests
from django.conf import settings
from django.core.management.base import BaseCommand, CommandError, CommandParser

DEFAULT_ENDPOINT = "http://127.0.0.1:8000/api/applications/import/"
DEFAULT_TIMEOUT = 30.0  # seconds


@dataclass(frozen=True)
class ImportResult:
    """Outcome of importing a single JSON file."""

    filename: str
    status_code: int | None
    detail: str = ""

    @property
    def succeeded(self) -> bool:
        return self.status_code is not None and 200 <= self.status_code < 300

    @property
    def display_status(self) -> str:
        return str(self.status_code) if self.status_code is not None else "ERR"


class Command(BaseCommand):
    help = "Imports all JSON files from a directory by POSTing them to the import API."

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "directory",
            type=Path,
            help="Path to the directory containing the JSON files.",
        )
        parser.add_argument(
            "--endpoint",
            default=getattr(settings, "APPLICATION_IMPORT_ENDPOINT", DEFAULT_ENDPOINT),
            help=(
                "Target API endpoint. Defaults to the APPLICATION_IMPORT_ENDPOINT "
                "setting if present, otherwise %(default)s."
            ),
        )
        parser.add_argument(
            "--timeout",
            type=float,
            default=DEFAULT_TIMEOUT,
            help="Request timeout in seconds (default: %(default)s).",
        )

    def handle(self, *args: object, **options: object) -> None:
        directory: Path = options["directory"]
        endpoint: str = options["endpoint"]
        timeout: float = options["timeout"]

        if not directory.is_dir():
            raise CommandError(f"Directory does not exist: {directory}")

        json_files = sorted(directory.glob("*.json"))
        if not json_files:
            raise CommandError(f"No JSON files found in: {directory}")

        self.stdout.write(f"Sending {len(json_files)} file(s) to {endpoint} ...")

        results = [self._import_file(path, endpoint, timeout) for path in json_files]
        self._print_summary(results)

    def _import_file(self, path: Path, endpoint: str, timeout: float) -> ImportResult:
        """Import a single file, capturing any error instead of aborting the run."""
        try:
            payload = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            return ImportResult(path.name, None, f"could not read/parse: {exc}")

        try:
            response = requests.post(endpoint, json=payload, timeout=timeout)
        except requests.RequestException as exc:
            return ImportResult(path.name, None, f"request failed: {exc}")

        detail = "" if response.ok else self._extract_error_detail(response)
        return ImportResult(path.name, response.status_code, detail)

    @staticmethod
    def _extract_error_detail(response: requests.Response, max_length: int = 300) -> str:
        """Build a readable error message from an API error response.

        Tries to pull a meaningful field out of a JSON body, falls back to the
        raw text, and truncates overly long messages.
        """
        message = ""
        try:
            body = response.json()
        except ValueError:
            message = response.text.strip()
        else:
            if isinstance(body, dict):
                for key in ("detail", "error", "message", "errors"):
                    if key in body:
                        message = str(body[key])
                        break
                else:
                    message = json.dumps(body, ensure_ascii=False)
            else:
                message = str(body)

        message = " ".join(message.split())  # collapse whitespace/newlines
        if not message:
            return "no error body returned"
        if len(message) > max_length:
            message = f"{message[:max_length]}..."
        return message

    def _print_summary(self, results: list[ImportResult]) -> None:
        name_width = max(len(r.filename) for r in results)
        name_width = max(name_width, len("File"))

        self.stdout.write("")
        self.stdout.write(f"{'File':<{name_width}}  Status")
        self.stdout.write(f"{'-' * name_width}  ------")

        for result in results:
            style = self.style.SUCCESS if result.succeeded else self.style.ERROR
            line = f"{result.filename:<{name_width}}  {result.display_status}"
            if result.detail:
                line = f"{line}  ({result.detail})"
            self.stdout.write(style(line))

        succeeded = sum(1 for r in results if r.succeeded)
        failed = len(results) - succeeded
        self.stdout.write("")
        self.stdout.write(f"Done: {succeeded} succeeded, {failed} failed.")