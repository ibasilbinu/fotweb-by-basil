"""Inspect dynamically rendered official ISL lineup pages without guessing players.

This diagnostic preserves page text and captures structured lineup candidates for
manual validation before any match data is published.
"""
import asyncio
import json
import re
import sys
from pathlib import Path
from playwright.async_api import async_playwright

MATCH_ID = sys.argv[1] if len(sys.argv) > 1 else "194636"
if not re.fullmatch(r"[0-9]{4,10}", MATCH_ID):
    raise SystemExit("Invalid match ID")
URL = "https://www.indiansuperleague.com/matchcentre/" + MATCH_ID
OUT = Path("diagnostics")
OUT.mkdir(exist_ok=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 1366, "height": 900})
        responses = []
        async def capture(response):
            if not any(x in response.url.lower() for x in ("lineup", "match", "fixture", "player")):
                return
            if "indiansuperleague.com" not in response.url:
                return
            if len(responses) >= 35:
                return
            try:
                body = await response.text()
                if len(body) < 250000:
                    responses.append({"url": response.url, "status": response.status,
                                      "body": body[:100000]})
            except Exception:
                pass
        page.on("response", capture)
        await page.goto(URL, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_timeout(7000)
        for label in ("Team Lineups", "Lineups", "Lineup"):
            try:
                await page.get_by_text(label, exact=True).first.click(timeout=2500)
                break
            except Exception:
                continue
        await page.wait_for_timeout(4000)
        text = await page.locator("body").inner_text(timeout=15000)
        (OUT / f"isl-{MATCH_ID}-rendered.txt").write_text(text[:100000], encoding="utf-8")
        (OUT / f"isl-{MATCH_ID}-responses.json").write_text(
            json.dumps(responses, indent=2), encoding="utf-8")
        print("Inspected", URL, "rendered characters:", len(text),
              "relevant responses:", len(responses))
        print("Lineup heading found:", "lineup" in text.lower())
        await browser.close()

asyncio.run(main())
