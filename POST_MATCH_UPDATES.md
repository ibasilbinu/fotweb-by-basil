# ISL 2026–27 post-match updates

The ChatGPT task **FotWeb post-match updates** checks hourly for completed ISL
2026–27 matches, verifies public reports, and commits meaningful changes to
`data/isl-results.json` on `main`. Streamlit picks up repository changes.
This is a ChatGPT task, not a GitHub Actions workflow or a live-score API.
It also checks the official fixture schedule for published changes.
Checks and publication can be delayed. Refresh the site for new results.
Manage or pause the task in ChatGPT Tasks.

## Publication rules

- Prefer match-specific official ISL/AIFF or official club reports. Otherwise
  cross-check two independent reputable match reports.
- Verify competition, season, actual IST date and completed status. Never publish
  ongoing, postponed, cancelled, rumoured or demonstration results.
- Keep canonical club names and a stable fixture ID: official ID if available,
  otherwise `YYYY-MM-DD-home-away` slugs. One record per match, no duplicates.
- Preserve previous records and update existing records for sourced corrections.
- Add only statistics explicitly published for that match. Missing statistics
  stay omitted or null, never zero. Never invent xG, coordinates or player stats.
- Final goals exclude penalty shootouts. Use status `FT`, `AET` or `PEN`.
  Set `phase` to `league`, `playoff` or `unknown` based on verified competition
  stage. Only league-stage FT matches contribute to the table; it is not official.
- Each record has source URLs and a verification timestamp. Reports are short
  original factual summaries, with no copied article text or speculative tactics.
- Commit only additions, new statistics or corrections. Do not change timestamps
  or make a commit when nothing changed. Failure or conflicting sources must
  never erase valid data. Report concrete blockers.
- No demonstration records are used. Team dashboards, reports and league points
  derive from the verified results collection. Missing player statistics and
  spatial event data remain unavailable.

## Data contract

Initial file: `{"schemaVersion":1,"season":"2026-27","updatedAt":null,"matches":[]}`.
Set `updatedAt` to an ISO timestamp with timezone only on meaningful updates.

| Match field | Value |
| --- | --- |
| `id` | Stable string fixture ID |
| `date` | Actual match date in IST, `YYYY-MM-DD` |
| `home`, `away` | Canonical full club names |
| `homeGoals`, `awayGoals` | Nonnegative integer final goals excluding shootout |
| `status` | `FT`, `AET` or `PEN` |
| `phase` | `league`, `playoff` or `unknown` |
| `verifiedAt` | ISO timestamp including timezone |
| `sources` | One or more `{ "label": "Publisher / match report", "url": "https://..." }` |
| `venue` | Optional verified venue string |
| `report` | Optional short original factual summary |
| `stats` | Optional `{ "home": {...}, "away": {...} }` |

Stat keys: `possession` (0–100), `shots`, `shotsOnTarget`, `corners`, `fouls`,
`xg`. Values are numbers or null; omit unknown keys. Source URLs must be HTTPS.
`postmatch.py` validates the full contract, including scores, dates and links.

Before committing run `python3 postmatch.py data/isl-results.json`. Read the
latest branch head and base tree; change only the relevant data files. Publish a
fast-forward commit with an expected-head guard, never a force-push. If the
branch changes concurrently, reread and merge before retrying.

## Schedule snapshot updates

Read `data/isl-season.json` and `season.py` before changing fixtures. The source
URL is the official ISL schedule. Its published match objects include official
`game_id`, club IDs and names, `start_date` with timezone, and venue. Preserve
existing club IDs, profile links and crest URLs. Match result IDs should use the
official fixture IDs from this snapshot; club names should use its canonical
`teams[].name` values. Preserve completed results independently of schedule changes.

Meaningful official schedule changes can update `data/isl-season.json`: new
published fixtures, corrected dates/times/venues, postponements and cancellations.
Never fabricate the unpublished phase. Validate with `season.py`. Retain the
full known schedule if a source response is empty or incomplete. Change
`verifiedAt` only when this snapshot changes; do not commit check timestamps.
Use status `NS`, `PST`, `CANC` for uncompleted fixtures. Results are joined by
fixture ID, or canonical clubs and IST date if no official ID is available.
No frontend code, assets, permissions or secrets should change in this task.

Do not invent fixture corrections where dates disagree: retain and label
conflicting source entries until an official correction is verified.

## Official English YouTube streams

Check `https://www.youtube.com/@IndianSuperLeague/streams` for scheduled match
streams as well as ongoing broadcasts. Add only videos published by the official
Indian Super League channel, matched to the fixture's clubs, competition, season
and IST scheduled date. Require an explicit English or ENG commentary label in
the video title or official description. Do not add Hindi, Vertical, highlights,
press conferences, third-party streams or generic channel links.

An optional fixture `broadcast` object in `data/isl-season.json` contains:
`url` (canonical `https://www.youtube.com/live/VIDEO_ID`), `title` (actual published
title), `channelUrl` (`https://www.youtube.com/@IndianSuperLeague`), `language`
(`English`), `status` (`scheduled`, `live`, `ended`), and `verifiedAt` (timestamp
with timezone). Confirm scheduled status and date from YouTube's public watch
metadata where available. YouTube oEmbed can verify the title and publisher.
Only change a broadcast timestamp when its metadata changes. Preserve working
links during source failures; never guess video IDs or infer live status just
from kickoff time. Retain completed English streams as replays. Remove or replace
links only with evidence of removal, a wrong fixture, language mismatch or an
official replacement. Broadcast updates may change only `data/isl-season.json`,
validated by `season.py`; all other automation restrictions still apply.

Fixture cards show Watch live at the bottom centre once a matching English
stream is announced. Verified completed matches show Watch replay. Unannounced
streams have no watch button or placeholder. Postponed and cancelled
fixtures do not show stream buttons.

## Detailed seven-section FotWeb reports

Every verified completed match receives a seven-section report layout: overview,
statistics, advanced analytics, tactical analysis, player performance and lineups,
timeline, and FotWeb Tactical Verdict. Empty fields must appear as unavailable;
do not fabricate content merely to populate the layout.

The hourly update should also seek and add permitted, verifiable optional fields
when official ISL/AIFF/club sources explicitly publish them. Check each new
field's source and retain existing verified data across runs. Never scrape
FotMob, reuse proprietary data without authorization, or represent a scoreline
as sufficient evidence of a tactical explanation.

Optional record fields:
- `matchUrl`: verified official match centre HTTPS link.
- `fotmobUrl`: optional external reference link only, not a data source to scrape.
- `stats.home` / `stats.away`: existing stats plus `passes`, `passAccuracy`,
  `bigChances`, `offsides`, `yellowCards`, `redCards`, `tackles`,
  `interceptions`, `clearances`, `saves`, where published.
- `events`: array of `{ "minute": 40, "side": "home", "type": "goal",
  "player": "Verified player name" }` objects. Supported types: goal,
  penalty_goal, own_goal, penalty_missed, yellow_card, red_card, substitution,
  var, other. Optional `addedMinute`, `playerIn`, `playerOut`, `assist`,
  `detail`. Do not guess event timing.
- `lineups.home` / `lineups.away`: optional `formation`, `starters`
  array of player objects with `name` and optional numeric `number`.
- `players`: array with `name`, `side`, and optional `position`, `goals`,
  `assists`, `shots`, `passes`, `tackles`, `saves`, `rating`.
  Do not synthesize player ratings or use an unauthorized third-party rating.
- `shotMap`: only if legally accessible actual shot-level locations are
  supplied by a source; each item has `side`, `outcome` and normalized
  0–100 `x`, `y` within a full vertical pitch representation, optional
  `xg` (0–1). Never guess coordinates.
- `tacticalInsights`: evidence-backed observations with `title`, `text`,
  and an HTTPS `sourceUrl` that supports the interpretation.
- `verdict`: original cautious analyst summary with `summary` and
  `sourceUrl`, optionally `keyFactor`, `homeImprovement` and
  `awayImprovement`. Do not infer tactical causes from possession, shots or
  score alone.

Add only sourced fields that validate using the current `postmatch.py` contract.
The existing points table and other sections continue to use the same results file.
