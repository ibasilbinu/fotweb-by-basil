# Current unattended execution

See [AUTOMATION.md](AUTOMATION.md) for the authoritative current schedule,
source coverage, phase continuation, writer and recovery instructions. The
GitHub Actions importer now discovers official fixtures, verifies scheduled
streams, publishes confirmed XIs and handles FT/AET/PEN through the final.
The following editorial source and preservation rules continue to apply;
older timing or importer-coverage descriptions are superseded by AUTOMATION.md.

# ISL 2026–27 post-match updates

The ChatGPT task **FotWeb post-match updates** checks hourly for completed ISL
2026–27 matches, verifies public reports, and commits meaningful changes to
`data/isl-results.json` on `main`. Streamlit picks up repository changes.
This is a ChatGPT task, not a GitHub Actions workflow or a live-score API.
It also checks the official fixture schedule for published changes.
Checks and publication can be delayed. Refresh the site for new results.
Manage or pause the task in ChatGPT Tasks.

## Last updated timestamp in Sources & methodology

The website shows **one line only**, `Last updated: <date>, <time> IST`, under
the Sources & methodology dialog. This is the actual completion timestamp of
the most recently recorded scheduled check, not the last modified date of the
season fixture list or verified scores. Do not add an extra history UI.

**After EVERY hourly check, even if no new fixture or result changes were found,**
append its real completion timestamp to `data/update-log.json` using the current
`update_log.py` schema: `checkedAt`, `kind: "hourly"`,
`outcome: "updated" | "no-change" | "partial" | "error"`,
a factual `summary`, and `links`. Validate with `update_log.py`, keep
newest first, retain at most 336 records and use a conflict-aware safe commit.
**This check-log commit is an exception** to the rule against commits without
new football data: it is needed so visitors see when the automated source
check actually ran. Never invent a timestamp, hide source blockers or claim a
football-data change occurred simply because a new check was logged.

## Primary official ISL sources (required each check)

**The Indian Super League's official website is** `https://www.indiansuperleague.com/`.
For ISL 2026–27, check these league-published sources before secondary reporting:

- **Fixture dates, kickoff times, venues, and results:** `https://www.indiansuperleague.com/schedule-fixtures`; explicitly select/confirm season **2026–27**, not the site's default/older season. Cross-check fixture ID and clubs before changing FotWeb records.
- **Official match centre:** use the actual match-specific URL supplied by the fixture listing, or a previously verified `https://www.indiansuperleague.com/matchcentre/MATCH_ID` matching FotWeb's known fixture ID. Check published FT status, starting XIs, match events and available statistics. Never infer data the match centre does not actually publish.
- **League and player statistics:** `https://www.indiansuperleague.com/stats`; explicitly confirm season and whether figures are team-wide, player-wide or specific to a completed match. Do not turn aggregates into fabricated match-level data.
- **Points table:** use the official site's standings page with **2026–27** selected for cross-checking and source attribution.
- **Official streaming:** `https://www.youtube.com/@IndianSuperLeague/streams`, especially **Live → Upcoming**. This is a **different source** from ISL match statistics. Verify each stream's video ID, owner, game, date and English/ENG commentary label before adding its watch button.

**Source freshness caution:** Public search-result snippets or cached copies of the site can show **2025–26** even while the current live fixture page has **2026–27**. Do not mistake a stale search index for a verified current official update. If a current page or YouTube Upcoming list cannot be accessed, disclose the verification blocker in the task alert, retain all previously verified data, and retry in the next check.

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

**Confirmed Inter Kashi home venue:** The official ISL match preview published
10 October 2026 confirms **Shree Shiv Chhatrapati Sports Complex, Balewadi,
Pune** as Inter Kashi's home ground for the season:
https://www.indiansuperleague.com/news/all-indian-inter-kashi-face-star-studded-kerala-blasters
The eight Phase 1 home fixtures (`homeId=2354`) have that sourced venue,
with the official announcement retained as their `sourceUrl`. Do not add a
visible `sourceNote` for this confirmation. Do not restore `Venue TBC` from an older schedule snapshot; change
the venue only if a newer official match-specific source confirms a relocation.
Keep Inter Kashi's away-match venues unchanged.

Never fabricate the unpublished phase. Validate with `season.py`. Retain the
full known schedule if a source response is empty or incomplete. Change
`verifiedAt` only when this snapshot changes; do not commit check timestamps.
Use status `NS`, `PST`, `CANC` for uncompleted fixtures. Results are joined by
fixture ID, or canonical clubs and IST date if no official ID is available.
No frontend code, assets, permissions or secrets should change in this task.

Do not invent fixture corrections where dates disagree: retain and label
conflicting source entries until an official correction is verified.

### Owner-confirmed Bengaluru date correction · 15 October 2026

The site owner explicitly confirmed Bengaluru FC vs East Bengal FC on
**17 December 2026**, resolving the duplicate Match 57 listing. Keep official
fixture `194691` at its published 19:30 IST kickoff; remove November duplicate
`194690`. The retained fixture records `dateConfirmation.source: site-owner`
and `supersedesFixtureIds` so imports preserve this explicit correction.
This is owner confirmation, not a claim that ISL removed its conflicting entry.
The superseded ID does not count as an unplayed phase-one match. Scheduling
times and workflows are unchanged.

## Team Dashboard statistics and coverage

Season Overview also shows league-wide top-five player rankings across all
13 participating clubs, calculated from the same verified player goals,
assists and named card events as Team Dashboard. The rankings list each
player's club, combine recorded contributions by verified player name,
and show an empty state for unverified data. Do not infer zero-valued
player statistics from missing match reports or fill the leaderboard from
unverified transfer/roster sources.

The dashboard uses the existing completed, **league-stage FT** records in
`data/isl-results.json`. Home/away points award 3 for wins and 1 for draws.
Published individual player `goals` and `assists` fields produce top-five
scoring, assist and recorded goal-contribution lists; missing fields do not
count as verified zeroes. Yellow/red individual leaders use named events
(`yellow_card`, `red_card`, `second_yellow_red`). Player names are
matched to the verified lineups and player lists only when unambiguous;
unnamed sanctions remain unavailable. A full team-level card count does
not justify an invented individual card recipient.

## Upcoming-stream priority and 30-minute target

Run the hourly scheduled-stream check on the hour (Asia/Kolkata). The usual
17:00 and 19:30 IST ISL kickoffs receive a 16:00 (60-minute advance) and a
19:00 (30-minute advance) check respectively. Scan the official YouTube
**LIVE -> UPCOMING** listings on **every hourly run**, not only the Videos tab,
recent broadcasts, or items indexed by Google. Inspect the next 14 days
with special priority to matches in the next 3 hours, and commit any verified
new stream as soon as it is published, not at kickoff. An hourly check can
only achieve a 30-minute lead when the official scheduled stream is actually
available and verifiable sufficiently early; do not promise impossible
deadlines for late announcements or unavailable services.

On 11 October 2026 a user reported a further video listed by the official
channel: `https://www.youtube.com/live/r7fCiGAMU3w`. Treat this video ID
as **pending match identification and verification**: check the official
uploader, actual published video title with English/ENG designation, start
time and corresponding 2026–27 fixture. Do not guess that it belongs to
NorthEast United vs Mohun Bagan (or any other fixture) just because that is
the next streamless match. Once independently verified, add its canonical
video URL and the actual metadata to the correct fixture.

If YouTube's LIVE/Upcoming tab or a video's metadata cannot be accessed,
state the verification failure prominently in the hourly report. Never label
that situation a complete successful scan or claim there are no newly
scheduled streams. Preserve all verified prior entries.

## Official English YouTube streams

### Creator-confirmed English scheduled stream (pending independent YouTube metadata)

- Match **194638**, **NorthEast United FC vs Mohun Bagan Super Giant**, **12 October 2026, 7:30 PM IST**: creator supplied `https://www.youtube.com/live/r7fCiGAMU3w` and explicitly confirmed it is the English stream on the official `@IndianSuperLeague` Live list.
- FotWeb shows **Watch live** on this fixture with the exact public caption **`Official ISL YouTube · English · Scheduled stream`** as requested by the creator. The internal data field `streamCandidate` retains that the fixture and English stream were creator-confirmed, rather than independently confirmed by a successful video-metadata lookup. Do not delete the candidate solely because YouTube metadata access or search indexing fails.
- On every hourly check, verify this video's **actual** title, channel ownership, fixture and scheduled date with YouTube Live > Upcoming or official metadata. **An English stream may have no "English"/"ENG" title suffix**; the official channel often labels the *Hindi alternative* instead. Use the documented official-default naming convention with creator confirmation and, when accessible, the matching Hindi-labelled alternative. When the video itself is independently accessible and the fixture/channel match is confirmed, upgrade to `broadcast` with the **actual published title**, `language: "English"`, `languageEvidence: "official-default-unlabelled"` if the title omits English, official channel URL, actual status and verification timestamp. Then remove `streamCandidate`. Do not invent titles or video metadata. If evidence disproves this association, notify and correct it with a source.
- `streamCandidate` schema: canonical `url`, `source: "viewer-submitted"`, `language: "English"`, `languageEvidence: "viewer-confirmed"`, `status: "scheduled"`, and timezone-aware `recordedAt`. It is a clearly sourced, usable watch link; don't invent a YouTube title or label it independently verified.


Check `https://www.youtube.com/@IndianSuperLeague/streams` for scheduled match
streams as well as ongoing broadcasts. **Prioritize the channel's LIVE tab,
including its Upcoming section, not just ordinary Video uploads or past
live broadcasts.** **Do not require the words English or ENG in the title.**
On the official ISL channel, the default English stream may have an unlabelled
title while the separate Hindi stream explicitly says Hindi. Search for
**both unlabelled and English/ENG-labelled** live streams, but exclude Hindi,
regional-language, Vertical, Shorts and other non-match feeds. An unlabelled
title ALONE is not enough to prove English; corroborate official ownership,
fixture clubs/date, the channel's default naming convention and/or a matching
Hindi-labelled alternate stream or creator confirmation. Cross-reference
against the next 14 days of published fixtures and the stream URLs already
recorded. A YouTube Live listing can be available before it is indexed by
ordinary search engines, so an empty web search is NOT proof that no streams
were announced. If a current LIVE-tab listing is not accessible through the
available browsing tools, attempt a supported alternate direct channel feed
or the YouTube live page metadata, and mark the check **PARTIALLY UNVERIFIED**
for streaming if it remains inaccessible. Never report 'no new updates' as
a fully verified finding when this required source could not be checked.
Preserve existing verified stream records and do not guess or invent an
unverified 11-character YouTube video ID. If a user supplies an official
stream URL, validate its title, channel ownership, date and language before
attaching it to the corresponding fixture. Add only videos published by the official
Indian Super League channel, matched to the fixture's clubs, competition, season
and IST scheduled date. Accept either (a) explicitly English/ENG-labelled streams,
or (b) the official channel's **unlabelled default English stream** when its
fixture and uploader are verified and its English classification is supported
by that channel's English-vs-Hindi naming pattern and corroborating evidence.
For case (b), store `languageEvidence: "official-default-unlabelled"` and
retain the **exact published unlabelled title**; never add "English" to it.
Do not add Hindi, regional-language, Vertical, highlights, press conferences,
third-party streams or generic channel links. Unlabelled alone is NOT proof.

An optional fixture `broadcast` object in `data/isl-season.json` contains:
`url` (canonical `https://www.youtube.com/live/VIDEO_ID`), `title` (actual published
title), `channelUrl` (`https://www.youtube.com/@IndianSuperLeague`), `language`
(`English`), `status` (`scheduled`, `live`, `ended`), and `verifiedAt` (timestamp
with timezone). If the actual video title omits English/ENG, add
`languageEvidence: "official-default-unlabelled"` to document how it was
classified as English; `season.py` enforces this. Confirm scheduled status
and date from YouTube's public watch
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

## Fixture-based match details and upcoming XIs

The sidebar does not have a separate Match Reports tab. Every match card in
**Fixtures & results** opens a detail page. When an official completed result
exists in `data/isl-results.json`, the page reuses FotWeb's eight-section
match report. Otherwise it shows an upcoming/pre-match view with kickoff,
venue, status, published official stream, source links and confirmed lineups
when available. Missing XIs explicitly say unavailable; **never publish
predicted lineups or squad lists as a starting XI**.

The existing `data/isl-season.json` fixture may optionally contain a
`lineups` object for confirmed pre-match formation and starters, e.g.:

```json
"lineups": {
  "sourceUrl": "https://www.indiansuperleague.com/matchcentre/194636",
  "verifiedAt": "2026-10-11T16:00:00+05:30",
  "home": {
    "formation": "4-3-3",
    "starters": [{"name": "Verified player", "number": 10}]
  }
}
```

This is a schema illustration only, **not real ISL lineup data**. Real
`starters` must have exactly **11 verified players** on a side; formations
without starters are allowed if independently verified. Both sides may be
added separately as published. The source URL must be the match-specific
official ISL match centre, and the timestamp must contain a timezone.
Only the official published confirmed XI may be used. Team broad position
labels are optional when expressly verified; FotWeb shows a player list only.
Do not collect or reuse Ground View coordinates.

### Named substitutes (all matches)

Each `lineups.home` / `lineups.away` may also contain `substitutes`, using the
same `{name, number?, position?}` player shape. Import only players explicitly
marked on the bench or as used substitutes in the identity-checked official
ISL match-centre payload; never derive the list from a club's squad. Starting
players and substitutes must be distinct. Omit unavailable lists, retain prior
verified lists when later responses omit them, and retry with the existing
lineup checks. Pre-match lists carry the existing lineup source/timestamp;
completed lists carry the result's official source and verification timestamp.
The list appears below the starting XI for each team in upcoming and past
match details. Formations are not displayed. Scheduler times and task settings
are unchanged.

Each hourly check should inspect the next imminent and current day's
uncompleted fixtures (and any other fixtures with newly published official
team announcements) for **confirmed starting XIs and formations**. Add these
to `data/isl-season.json` only when verified, preserving existing valid data
if unavailable, and run `season.py` validation. Completed match reports
continue using `data/isl-results.json`. The UI will switch from pre-match
detail to completed report automatically when a result is committed.

## Detailed eight-section FotWeb reports

Every verified completed match receives an eight-section report in this order:
1. Match overview
2. Lineup (starting XI list with shirt numbers, recorded roles, and sourced formation if available)
3. Match statistics
4. Player stats (individual verified metrics, separately from the lineup)
5. Match timeline
6. Tactical analytics (sourced interpretation only)
7. Advanced analytics (free calculations from verified team/player totals;
   shot breakdown, pass/defensive profiles, recorded player leaders, optional sourced shot map)
8. FotWeb Tactical Verdict

## League-wide team performance trends

The Club Analytics Team performance trends graph overlays all 13 ISL clubs
with colour-coded series and a full legend. It defaults to cumulative league
points but supports per-match shots taken, shots conceded, goals scored, and
goals conceded. Each x-axis match number refers to that club's *own* nth
verified league match; do not align teams by calendar date or pretend a club
has played when it has not. Only the latest 10 match numbers appear when
there is a longer season history. Unplayed clubs remain in the legend with
no point/line. A missing published stat creates a gap, while a real zero
(e.g. zero league points) stays a valid plotted value. No predicted values,
fabricated matchweek outcomes or paid Opta data are used.

## Free derived match analytics

The website automatically computes and displays the following from verified match
statistics already in `data/isl-results.json`, without any paid Opta feed:
- Shot breakdown: attempts on target versus all other attempts
  (`shots - shotsOnTarget`, **including blocked shots**, not simply off target);
  published totals, shot-on-target percentage, and each club's share of total shots.
- Passing/defensive profile: possession, total passes, published pass-accuracy
  percentage, tackles, interceptions, clearances, and `100 * shots / passes`
  when published totals support this simple descriptive ratio.
- Recorded player leaders: top three published individual records for shots,
  passes, tackles and saves. Player coverage may be incomplete, so this is
  **not** an official complete ranking across all players.
- Prior shot-accuracy, shot-conversion and published xG values remain available
  where sourced; **never estimate xG** from aggregate shots.
- True shot-location charts are rendered only if legally usable verified
  shot-level coordinates appear in `shotMap`. Player heat maps, pass maps and
  passing networks require separate event/tracking locations and cannot be
  inferred from aggregates or the formation.

These visualizations compute at page render time: no analytics fields need to be
committed, no Opta credentials are needed, and each future verified match with
the necessary totals receives them automatically. Ensure source facts stay
auditable and never equate these ratios to causal tactical findings.

Missing fields must appear as unavailable; do not fabricate information merely
to populate the layout. **FotWeb uses a list-only lineup model for all matches.**
Show the confirmed starting XI, shirt numbers and individually sourced broad roles
where available, plus official formation if verified. Do not create or retrieve
Ground View positioning or infer individual pitch coordinates.
Starting XIs and individual player statistics are separate sections;
one may be available when the other is not.

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
  penalty_goal, own_goal, penalty_missed, yellow_card, red_card,
  second_yellow_red, substitution, var, other. Optional `addedMinute`,
  `playerIn`, `playerOut`, `assist`, `detail`. Do not guess event timing.
- For **future completed match reports**, include a verified sending-off as one
  event with the player's name, side, and exact minute (plus `addedMinute`
  when documented). Use `red_card` for a directly awarded red card and
  `second_yellow_red` only when an official/reliable source confirms the
  dismissal was for a **second yellow card**. Keep independently verified
  `yellow_card` incidents as their own events, but do not additionally record
  the same dismissal as another `red_card` (avoid duplicate sendings-off).
  This lets the website show a single red symbol, or a yellow card peeking
  out on the left behind a red card, below the match scoreline.
  If only a team-level red-card total is known, do not invent a player,
  dismissal type, or minute. The result can still be published without a
  personalized card event.
- `lineups.home` / `lineups.away`: use only the **official Indian
  Super League match centre** to verify the starting XI and any published
  formation for the exact fixture. Each `starters` entry has `name` and
  optional numeric shirt `number`. Do not use predicted XIs or squad lists,
  and do not silently overwrite previously confirmed data when official
  pages temporarily provide incomplete or inconsistent information.
  The lineup presentation is **always a list**, not a pitch diagram.
  Never collect, populate, or update `pitchPosition` or `positionSourceUrl`.
  Display the formation only when reliably confirmed; otherwise label it
  unavailable. Show the full recorded XI with source-backed player roles
  where available and a link to the official match centre.
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

## Club squad details

Each check also verifies squad and head coach changes on the official squad page
for each club (`profileUrl` from `data/isl-season.json` plus `/squad`).
Maintain `data/isl-squads.json`: schemaVersion 1, season 2026-27, teams with
teamId, sourceUrl, verifiedAt, players and coach. Persons have name, position,
photo (official HTTPS image or null), number (published shirt number or null)
and an optional official profileUrl. Positions: Goalkeeper, Defender,
Midfielder, Forward, Head coach. Preserve the current squad if the source
fails or an unexpectedly empty listing is returned. Never infer transfers,
positions or coaches from old articles. Treat these as official club listings,
not a claim of final league registration. Only change verifiedAt after actually
reading that club's listing successfully. Use `squads.load_squads` with the
season's team IDs to validate before committing. Missing portraits use the
website's silhouette automatically. Preserve other results and navigation.
