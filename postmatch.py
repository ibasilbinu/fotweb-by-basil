"""Validate sourced, completed matches separately from demonstration analytics."""

import json
import math
from datetime import date, datetime
from urllib.parse import urlparse


STAT_LIMITS = {
    "possession": 100, "shots": 300, "shotsOnTarget": 300,
    "corners": 100, "fouls": 200, "xg": 100,
}


def validate_results(data):
    def require(condition, message):
        if not condition:
            raise ValueError(message)

    def timestamp(value):
        require(isinstance(value, str), "Invalid timestamp")
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        require(parsed.tzinfo is not None, "Timestamp must include its timezone")

    require(isinstance(data, dict), "Results must be an object")
    require(data.get("schemaVersion") == 1, "Unsupported results schema")
    require(data.get("season") == "2026-27", "Expected ISL 2026-27")
    if data.get("updatedAt") is not None:
        timestamp(data["updatedAt"])
    matches = data.get("matches")
    require(isinstance(matches, list) and len(matches) <= 1000, "Invalid matches")
    seen = set()
    for match in matches:
        require(isinstance(match, dict), "Invalid match")
        match_id = match.get("id")
        require(isinstance(match_id, str) and 0 < len(match_id) <= 160 and match_id not in seen, "Invalid or duplicate match ID")
        seen.add(match_id)
        date.fromisoformat(match["date"])
        require(match.get("status") in ("FT", "AET", "PEN"), "Only completed matches may be published")
        require(match.get("phase") in ("league", "playoff", "unknown"), "Invalid competition phase")
        for key in ("home", "away"):
            require(isinstance(match.get(key), str) and 0 < len(match[key]) <= 120, "Invalid team name")
        require(match["home"] != match["away"], "Teams must differ")
        for key in ("homeGoals", "awayGoals"):
            require(type(match.get(key)) is int and 0 <= match[key] <= 100, "Invalid final score")
        timestamp(match["verifiedAt"])
        sources = match.get("sources")
        require(isinstance(sources, list) and 1 <= len(sources) <= 20, "A match requires source links")
        for source in sources:
            url = urlparse(source["url"])
            require(url.scheme == "https" and bool(url.hostname) and not url.username and not url.password, "Invalid source URL")
            require(isinstance(source.get("label"), str) and 0 < len(source["label"]) <= 200, "Invalid source label")
        stats = match.get("stats", {})
        require(isinstance(stats, dict), "Invalid stats")
        for side, values in stats.items():
            require(side in ("home", "away") and isinstance(values, dict), "Invalid stats side")
            for key, value in values.items():
                require(key in STAT_LIMITS, "Unsupported statistic")
                require(value is None or (type(value) in (int, float) and math.isfinite(value) and 0 <= value <= STAT_LIMITS[key]), "Invalid statistic value")
        for key in ("venue", "report"):
            if key in match:
                require(isinstance(match[key], str) and len(match[key]) <= 4000, "Invalid match text")
    return data


def load_results(path):
    return validate_results(json.loads(path.read_text(encoding="utf-8")))


if __name__ == "__main__":
    import sys
    from pathlib import Path
    load_results(Path(sys.argv[1] if len(sys.argv) > 1 else "data/isl-results.json"))
    print("Post-match results validated")
