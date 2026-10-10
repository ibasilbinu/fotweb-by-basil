"""Validate sourced, completed matches separately from demonstration analytics."""

import json
import math
from datetime import date, datetime
from urllib.parse import urlparse


STAT_LIMITS = {
    "possession": 100, "shots": 300, "shotsOnTarget": 300,
    "corners": 100, "fouls": 200, "xg": 100,
    "passes": 3000, "passAccuracy": 100, "bigChances": 100,
    "offsides": 100, "yellowCards": 30, "redCards": 15,
    "tackles": 300, "interceptions": 300, "clearances": 300, "saves": 100,
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
        def short_text(value, field, max_length=4000):
            require(isinstance(value, str) and 0 < len(value) <= max_length, "Invalid " + field)

        if "matchUrl" in match or "fotmobUrl" in match:
            for key in ("matchUrl", "fotmobUrl"):
                if key in match:
                    parsed = urlparse(match[key])
                    require(parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password, "Invalid match URL")
        if "events" in match:
            events = match["events"]
            require(isinstance(events, list) and len(events) <= 300, "Invalid match events")
            allowed_events = {"goal", "penalty_goal", "own_goal", "penalty_missed", "yellow_card", "red_card", "second_yellow_red", "substitution", "var", "other"}
            for event in events:
                require(isinstance(event, dict) and event.get("side") in ("home", "away") and event.get("type") in allowed_events, "Invalid event")
                require(type(event.get("minute")) is int and 0 <= event["minute"] <= 200, "Invalid event minute")
                if "addedMinute" in event:
                    require(type(event["addedMinute"]) is int and 0 <= event["addedMinute"] <= 100, "Invalid added minute")
                for key in ("player", "playerIn", "playerOut", "assist", "detail"):
                    if key in event:
                        short_text(event[key], key, 250)
        if "lineups" in match:
            require(isinstance(match["lineups"], dict), "Invalid lineups")
            for side, info in match["lineups"].items():
                require(side in ("home", "away") and isinstance(info, dict), "Invalid lineup side")
                if "formation" in info:
                    short_text(info["formation"], "formation", 30)
                if "positionSourceUrl" in info:
                    source = urlparse(info["positionSourceUrl"])
                    match_centre = urlparse(match.get("matchUrl", ""))
                    trusted_hosts = {"indiansuperleague.com", "www.indiansuperleague.com"}
                    require(source.scheme == "https" and source.hostname in trusted_hosts
                            and not source.username and not source.password,
                            "Pitch positions require an official ISL Ground View URL")
                    require(match_centre.scheme == "https" and match_centre.hostname in trusted_hosts
                            and source.path.rstrip("/") == match_centre.path.rstrip("/")
                            and source.path.rstrip("/").startswith("/matchcentre/")
                            and source.path.rstrip("/").split("/")[-1].isdigit(),
                            "Pitch diagram must match this match's official ISL centre")
                    require(isinstance(info.get("formation"), str) and bool(info["formation"].strip()),
                            "An official ISL formation is required for positioned lineups")
                if "starters" in info:
                    require(isinstance(info["starters"], list) and len(info["starters"]) <= 11, "Invalid starting XI")
                    positioned = 0
                    for player in info["starters"]:
                        require(isinstance(player, dict), "Invalid starter")
                        short_text(player.get("name"), "starter name", 120)
                        if "number" in player:
                            require(type(player["number"]) is int and 0 <= player["number"] <= 99, "Invalid shirt number")
                        if "pitchPosition" in player:
                            position = player["pitchPosition"]
                            require(isinstance(position, dict), "Invalid pitch position")
                            require(set(position).issubset({"x", "y", "label"}), "Unsupported pitch position key")
                            for axis in ("x", "y"):
                                value = position.get(axis)
                                require(type(value) in (int, float) and math.isfinite(value) and 0 <= value <= 100,
                                        "Invalid pitch position coordinate")
                            if "label" in position:
                                short_text(position["label"], "position label", 15)
                            positioned += 1
                    if positioned:
                        require(len(info["starters"]) == 11 and positioned == 11,
                                "A sourced pitch diagram must position all 11 starters")
                        require("positionSourceUrl" in info,
                                "Pitch positions require the same match's official ISL Ground View URL")
        if "players" in match:
            require(isinstance(match["players"], list) and len(match["players"]) <= 100, "Invalid players")
            for player in match["players"]:
                require(isinstance(player, dict) and player.get("side") in ("home", "away"), "Invalid player side")
                short_text(player.get("name"), "player name", 120)
                if "position" in player:
                    short_text(player["position"], "position", 40)
                for key in ("goals", "assists", "shots", "passes", "tackles", "saves", "rating"):
                    if key in player:
                        val = player[key]
                        require(type(val) in (int, float) and math.isfinite(val) and 0 <= val <= (10 if key == "rating" else 3000), "Invalid player statistic")
        if "shotMap" in match:
            require(isinstance(match["shotMap"], list) and len(match["shotMap"]) <= 300, "Invalid shot map")
            for shot in match["shotMap"]:
                require(isinstance(shot, dict) and shot.get("side") in ("home", "away") and shot.get("outcome") in ("goal", "saved", "blocked", "missed", "other"), "Invalid shot")
                for key in ("x", "y"):
                    val = shot.get(key)
                    require(type(val) in (int, float) and math.isfinite(val) and 0 <= val <= 100, "Invalid shot coordinate")
                if "xg" in shot:
                    require(type(shot["xg"]) in (int, float) and math.isfinite(shot["xg"]) and 0 <= shot["xg"] <= 1, "Invalid shot xG")
        if "tacticalInsights" in match:
            require(isinstance(match["tacticalInsights"], list) and len(match["tacticalInsights"]) <= 20, "Invalid tactics")
            for insight in match["tacticalInsights"]:
                require(isinstance(insight, dict), "Invalid tactic")
                short_text(insight.get("title"), "tactic title", 200)
                short_text(insight.get("text"), "tactic text")
                parsed = urlparse(insight.get("sourceUrl", ""))
                require(parsed.scheme == "https" and parsed.hostname, "Tactical insight requires evidence URL")
        if "verdict" in match:
            v = match["verdict"]
            require(isinstance(v, dict), "Invalid verdict")
            short_text(v.get("summary"), "verdict summary")
            parsed = urlparse(v.get("sourceUrl", ""))
            require(parsed.scheme == "https" and parsed.hostname, "Verdict requires source URL")
            for key in ("keyFactor", "homeImprovement", "awayImprovement"):
                if key in v:
                    short_text(v[key], key)
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
