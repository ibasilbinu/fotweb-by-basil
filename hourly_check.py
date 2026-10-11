"""Hourly FotWeb source availability checks; never invent lineup data."""
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent
season = json.loads((ROOT / "data/isl-season.json").read_text())
results = json.loads((ROOT / "data/isl-results.json").read_text())
log_path = ROOT / "data/update-log.json"
log = json.loads(log_path.read_text())
now = datetime.now(timezone.utc)
teams = {t["id"]: t["name"] for t in season["teams"]}
known = {m["id"] for m in results["matches"]}
import sys
kind = sys.argv[1] if len(sys.argv) > 1 else "hourly"
if kind not in ("hourly", "post-match-early", "post-match-late"):
    raise ValueError("Unknown check kind")
recent = [f for f in season["fixtures"] if
          -timedelta(hours=36) <= datetime.fromisoformat(f["kickoff"]).astimezone(timezone.utc)-now <= timedelta(hours=36)
          and (f["id"] not in known or kind != "hourly")]
links = []
failures = []
for fixture in recent[:6]:
    url = "https://www.indiansuperleague.com/matchcentre/" + fixture["id"]
    try:
        req = Request(url, headers={"User-Agent": "Mozilla/5.0 FotWebSourceCheck/1.0"})
        with urlopen(req, timeout=18) as response:
            html = response.read(350000).decode("utf-8", errors="replace")
            if response.status != 200 or len(html) < 500:
                raise ValueError("Incomplete response")
        links.append({"label": (teams[fixture["homeId"]] + " vs " + teams[fixture["awayId"]])[:80], "url": url})
    except Exception as exc:
        failures.append(fixture["id"] + ": " + type(exc).__name__)
outcome = "partial" if failures else "no-change"
summary = (f"Checked {len(recent[:6])} pending official match pages; no verified lineup import available. "
           + (f"{len(failures)} source requests failed." if failures else "Source requests completed."))
record = {"checkedAt": now.isoformat().replace("+00:00", "Z"), "kind": kind,
          "outcome": outcome, "summary": summary, "links": links[:8]}
log["checks"] = [record] + [x for x in log["checks"] if x["checkedAt"] != record["checkedAt"]][:335]
log_path.write_text(json.dumps(log, indent=2, ensure_ascii=False) + "\n")
from update_log import validate_update_log
validate_update_log(log)
print(summary)
