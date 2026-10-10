"""Validate the published ISL schedule and participating clubs."""

import json
import re
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
        # Upcoming starting XIs are optional and must refer to the fixture's
        # official ISL match centre, never predicted squads or Ground View.
        lineup = f.get("lineups")
        if lineup is not None:
            require(isinstance(lineup, dict), "Invalid pre-match lineup")
            require(set(lineup).issubset({"sourceUrl", "verifiedAt", "home", "away"}),
                    "Unsupported lineup field")
            lineup_url = lineup.get("sourceUrl")
            https(lineup_url)
            parsed = urlparse(lineup_url)
            expected = f"/matchcentre/{f['id']}"
            require(parsed.hostname in ("www.indiansuperleague.com", "indiansuperleague.com")
                    and parsed.path.rstrip("/") == expected and not parsed.query
                    and not parsed.fragment,
                    "Pre-match lineup source must be the official ISL match centre for this fixture")
            require(isinstance(lineup.get("verifiedAt"), str)
                    and datetime.fromisoformat(lineup["verifiedAt"].replace("Z", "+00:00")).tzinfo is not None,
                    "Lineup verification timestamp requires timezone")
            require(any(side in lineup for side in ("home", "away")),
                    "Pre-match lineup requires at least one team")
            for side in ("home", "away"):
                info = lineup.get(side)
                if info is None:
                    continue
                require(isinstance(info, dict) and set(info).issubset({"formation", "starters"}),
                        "Invalid pre-match lineup side")
                if "formation" in info:
                    require(isinstance(info["formation"], str) and 1 <= len(info["formation"]) <= 30,
                            "Invalid confirmed formation")
                if "starters" in info:
                    starters = info["starters"]
                    require(isinstance(starters, list) and len(starters) == 11,
                            "Only confirmed full starting XIs are supported")
                    seen_names = set()
                    for p in starters:
                        require(isinstance(p, dict) and set(p).issubset({"name", "number", "position"}),
                                "Unsupported starter field")
                        name = p.get("name")
                        require(isinstance(name, str) and 0 < len(name.strip()) <= 120
                                and name.casefold() not in seen_names, "Invalid or duplicate starter")
                        seen_names.add(name.casefold())
                        if "number" in p:
                            require(type(p["number"]) is int and 0 <= p["number"] <= 99,
                                    "Invalid starter shirt number")
                        if "position" in p:
                            require(isinstance(p["position"], str) and 1 <= len(p["position"]) <= 40,
                                    "Invalid published player role")
                require("formation" in info or "starters" in info,
                        "Pre-match team lineup must contain a formation or starting XI")
        broadcast = f.get("broadcast")
        if broadcast is not None:
            require(isinstance(broadcast, dict), "Invalid broadcast")
            require(broadcast.get("language") == "English", "Only English commentary is allowed")
            require(broadcast.get("channelUrl") == "https://www.youtube.com/@IndianSuperLeague", "Invalid official channel")
            require(isinstance(broadcast.get("url"), str) and re.fullmatch(r"https://www\.youtube\.com/live/[A-Za-z0-9_-]{11}", broadcast["url"]), "Invalid YouTube live URL")
            title = broadcast.get("title")
            require(isinstance(title, str) and 0 < len(title) <= 300 and re.search(r"\b(?:English|ENG)\b", title, re.I), "Broadcast must specify English")
            require(broadcast.get("status") in ("scheduled", "live", "ended"), "Invalid broadcast status")
            require(datetime.fromisoformat(broadcast["verifiedAt"].replace("Z", "+00:00")).tzinfo is not None, "Broadcast timestamp needs timezone")
    return data


def load_season(path):
    return validate_season(json.loads(path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    from pathlib import Path
    import sys
    load_season(Path(sys.argv[1] if len(sys.argv) > 1 else "data/isl-season.json"))
    print("ISL season validated")
