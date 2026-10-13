# FotWeb ISL 2026–27 automation

The user authorizes verified data updates to `ibasilbinu/fotweb-by-basil`, `main`,
through the end of this season. Streamlit serves https://fotweb.streamlit.app/.
This document is the current execution contract; it supersedes older timing and
coverage descriptions in POST_MATCH_UPDATES.md. Its source-preservation rules
and the repository validators still apply.

## Schedule (Asia/Kolkata / IST)

| Check | Target | GitHub UTC cron |
| --- | --- | --- |
| Morning streams and published fixtures | 08:00 daily | `30 2 * * *` |
| New YouTube schedules, fixtures, missing results and enrichment | Hourly at :43 | `13 * * * *` |
| 17:00 starting XIs | 16:30 | `0 11 * * *` |
| 19:30 starting XIs | 19:00 | `30 13 * * *` |
| 17:00 final results | 19:10 | `40 13 * * *` |
| 19:30 final results | 21:45 | `15 16 * * *` |
| Match-window retries | Every 10 minutes, 15:37–00:27 | `7,17,27,37,47,57 10-18 * * *` |

ChatGPT has independent backup tasks for the five explicit times and an hourly
check at :17. A lineup run also checks streams. Match checks select fixtures by
actual published kickoff, so corrected times and later-phase fixtures use the
same importer. Sources may publish late; delayed scores and XIs remain pending
and are retried. GitHub cron and ChatGPT tasks can be delayed; these are target
check times, not a guarantee of exact execution or instant YouTube notification.
YouTube is polled; no YouTube webhook subscription is connected.

## Sources

- Streams: https://www.youtube.com/@IndianSuperLeague/streams, including upcoming
  broadcasts. Check channel ID `UCJk-aQ7NZtqYtpcqKDt_vZg`, both clubs, scheduled
  start and English-language evidence. Scan up to 100 latest Live-tab entries
  against every published future fixture, not only the next 14 days. Unlabelled
  default streams may use the documented paired Hindi alternative or an already
  creator-confirmed/verified English link. Never guess a video ID or language.
  The current official Live listing may refresh the title and ended state of an
  existing verified English video for the same past fixture. New URLs still
  require complete channel, start-time, club and language verification.
- Starting XIs, FT/AET/PEN, events and statistics: the fixture's official ISL
  match centre, `https://www.indiansuperleague.com/matchcentre/{id}`. Require the
  exact match, clubs, season and IST date. Only confirmed full starting XIs.
- New phases and rescheduling:
  https://www.indiansuperleague.com/schedule-fixtures and its season-pinned
  https://www.indiansuperleague.com/schedule-fixtures/2026 page. Do not overwrite
  a saved full schedule with a partial/empty response. Never invent phase two.
- If the direct importer fails, the ChatGPT backup checks official ISL reports,
  AIFF and official clubs, then reputable independent reporting. Publish FT only
  on official confirmation or agreement between two independent credible
  reports. Keep lineup provenance restricted to the official ISL match centre.
  Do not scrape FotMob. Do not manufacture unavailable metrics or narratives.

## Writer and verification

1. Read the latest `main`, code, validators and all four data snapshots. In a
   temporary checkout install yt-dlp and run `python automated_update.py KIND`.
   Kinds: hourly, morning, lineup-early, lineup-late, post-match-early,
   post-match-late, match-retry. A ChatGPT backup without shell/network access
   can apply the same source and validation rules with its connected tools.
2. Keep independent source failures isolated. Preserve working links and prior
   stats when a source omits data. A confirmed final score does not wait for
   optional statistics. Invalid fields are logged and retried. A verified
   reschedule invalidates the old pre-match XI and broadcast association until
   their date is reverified. Preserve sourced Inter Kashi venues when blank in
   the schedule; keep conflicting fixture dates flagged pending confirmation.
3. Validate with `season.py`, `postmatch.py`, `update_log.py`. Publish
   `data/isl-season.json`, `data/isl-results.json`, `data/update-log.json` and
   `data/automation-state.json` in one conflict-aware commit. On conflict read
   latest main and retry; never force push or overwrite another writer's update.
   GitHub Actions does this with its repository token; no personal token needed.
4. Log the actual completion time, kind, source links, pending items and errors,
   including no-change checks. Failed sources produce a failing Action even if
   good partial data was published. Read back the commit. Distinguish committed
   data from visibly verified site deployment. The live app reloads repository
   data every 60 seconds once Streamlit receives the commit.

## Phase continuation and season completion

`data/automation-state.json` stores the original phase-one IDs, progress, pending
items and source outcomes. Fixture discovery runs throughout phase one and
continues hourly during any gap until the next phase is published. New fixtures
receive all the same stream, lineup and result checks. It continues through
playoffs and the final; do not stop because the initial fixture list ends.

Only a completed official **Final** with a verified winner marks the season
complete automatically. A semi-final or a league-table leader cannot do this.
After seven days of final-data enrichment the importer becomes a no-op. If ISL
uses a different championship format, a backup may record completion only after
an explicit official season-ending champion announcement, retaining its URL.
No guessed season-end date. Backup tasks may pause themselves only after that
verified completion and enrichment window; never pause because of no changes,
a transient source failure or a missing future-phase schedule.

## Backup health checks

On the hourly backup, inspect both source-check workflow run outcomes and the
actual data log. Check the saved task schedules are enabled. If an existing
FotWeb task was disabled before completion, restore its documented schedule
without creating duplicates. A recent inspector or empty workflow is not proof
that scores were published. Repair routine source/parser failures within this
repository's update scope when evidence is clear; validate and exercise the
writer. Report genuine publication/access failures with the exact error.
Never bypass an approval rejection. Report failures and newly published data;
suppress routine no-change notifications. Do not claim uninterrupted service.

## Tests

`python -m pip install yt-dlp`

`python -m unittest discover -s tests -v`

Regression coverage includes official identity, apostrophes in payloads, full XIs,
optional-data failures, preserved snapshots, distant scheduled streams, duplicate
pairings, partial YouTube failures, phase transitions, extra time, penalties,
verified final winners and retries of old unresolved results.
