"""Read and validate FotWeb's public hourly / post-match check log.

The update task writes this file after *every* run, including no-data-change
runs. The timestamps in the log are real task execution times, not estimates
and not the schedule/result data's last modified times.
"""
import json
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse

KINDS = {"hourly", "morning", "lineup-early", "lineup-late",
         "post-match-early", "post-match-late", "match-retry"}
OUTCOMES = {"updated", "no-change", "partial", "error", "unrecorded"}
MAX_CHECKS = 336  # Most recent ~14 days, including special checks.


def validate_update_log(data):
    if not isinstance(data, dict) or data.get("schemaVersion") != 1 or data.get("season") != "2026-27":
        raise ValueError("Invalid update log metadata")
    checks = data.get("checks")
    if not isinstance(checks, list) or len(checks) > MAX_CHECKS:
        raise ValueError("Invalid or oversized update log")
    previous = None
    seen = set()
    for record in checks:
        if not isinstance(record, dict) or set(record) != {
                "checkedAt", "kind", "outcome", "summary", "links"}:
            raise ValueError("Invalid update log entry")
        timestamp = record["checkedAt"]
        if not isinstance(timestamp, str):
            raise ValueError("Invalid update log timestamp")
        when = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        if when.tzinfo is None:
            raise ValueError("Update log timestamps must contain a timezone")
        if previous is not None and when > previous:
            raise ValueError("Update log must be newest first")
        previous = when
        key = (timestamp, record["kind"])
        if key in seen:
            raise ValueError("Duplicate update log entry")
        seen.add(key)
        if record["kind"] not in KINDS or record["outcome"] not in OUTCOMES:
            raise ValueError("Unknown update check kind or outcome")
        summary = record["summary"]
        if not isinstance(summary, str) or not (3 <= len(summary) <= 400):
            raise ValueError("Invalid update check summary")
        links = record["links"]
        if not isinstance(links, list) or len(links) > 8:
            raise ValueError("Invalid update check links")
        for item in links:
            if not isinstance(item, dict) or set(item) != {"label", "url"}:
                raise ValueError("Invalid update check link")
            label, url = item["label"], item["url"]
            if not isinstance(label, str) or not (1 <= len(label) <= 80):
                raise ValueError("Invalid update check link label")
            if not isinstance(url, str):
                raise ValueError("Invalid update check URL")
            parsed = urlparse(url)
            if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
                raise ValueError("Update check links must be HTTPS URLs")
    return data


def load_update_log(path: Path):
    return validate_update_log(json.loads(path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    import sys
    load_update_log(Path(sys.argv[1] if len(sys.argv) > 1 else "data/update-log.json"))
    print("FotWeb update log validated")
