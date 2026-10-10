"""Validate the published ISL schedule and participating clubs."""

import json
from datetime import datetime
from urllib.parse import urlparse


def validate_season(data):
    def require(condition, message):
        if not condition:
            raise ValueError(message)

    def https(value):
        require(isinstance(value, str), "Invalid source")
        p = urlparse(value)
        require(p.scheme == "https" and bool(p.hostname) and not p.username and not p.password, "Invalid source")

    require(data.get("schemaVersion") == 1 and data.get("season") == "2026-27", "Invalid season metadata")
    require(isinstance(data.get("teams"), list) and 2 <= len(data["teams"]) <= 30, "Invalid clubs")
    require(isinstance(data.get("fixtures"), list) and len(data["fixtures"]) <= 1000, "Invalid schedule")
    require(datetime.fromisoformat(data["verifiedAt"].replace("Z", "+00:00")).tzinfo is not None, "Timestamp needs timezone")
    https(data["sourceUrl"])
    ids = set()
    for t in data["teams"]:
        require(isinstance(t.get("id"), str) and t["id"].isdigit() and t["id"] not in ids, "Invalid club ID")
        ids.add(t["id"])
        require(isinstance(t.get("name"), str) and 0 < len(t["name"]) <= 120, "Invalid club name")
        require(isinstance(t.get("short"), str) and len(t["short"]) <= 10, "Invalid club abbreviation")
        https(t["profileUrl"])
        logo = t.get("logo")
        if logo is not None:
            https(logo)
            p = urlparse(logo)
            require(p.hostname == "www.indiansuperleague.com" and p.path == f"/static-assets/images/club/{t['id']}.png", "Invalid crest URL")
    fids = set()
    for f in data["fixtures"]:
        require(isinstance(f.get("id"), str) and f["id"] not in fids, "Duplicate fixture")
        fids.add(f["id"])
        require(f["homeId"] in ids and f["awayId"] in ids and f["homeId"] != f["awayId"], "Invalid fixture clubs")
        kickoff = datetime.fromisoformat(f["kickoff"])
        require(kickoff.tzinfo is not None and kickoff.year in (2026, 2027), "Invalid kickoff")
        require(f.get("status") in ("NS", "PST", "CANC"), "Invalid fixture status")
        require(f.get("phase") in ("league", "playoff", "unknown"), "Invalid stage")
        require(f.get("venue") is None or (isinstance(f["venue"], str) and len(f["venue"]) <= 300), "Invalid venue")
        https(f["sourceUrl"])
    return data


def load_season(path):
    return validate_season(json.loads(path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    from pathlib import Path
    import sys
    load_season(Path(sys.argv[1] if len(sys.argv) > 1 else "data/isl-season.json"))
    print("ISL season validated")
