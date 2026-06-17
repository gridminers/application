"""Strict JSON schema enforced via the Responses API `text.format` field.

Azure structured outputs require every property to be listed in `required` and
`additionalProperties` to be false. Nullable fields use the ["string", "null"]
type form.
"""

from prompts import TARGET_FIELDS

EXTRACTION_FORMAT = {
    "type": "json_schema",
    "name": "extraction",
    "strict": True,
    "schema": {
        "type": "object",
        "additionalProperties": False,
        "required": ["targets", "warnings"],
        "properties": {
            "targets": {
                "type": "object",
                "additionalProperties": False,
                "required": list(TARGET_FIELDS),
                "properties": {
                    label: {"type": ["string", "null"]} for label in TARGET_FIELDS
                },
            },
            "warnings": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
    },
}
