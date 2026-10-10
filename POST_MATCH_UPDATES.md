# ISL 2026–27 post-match updates

The ChatGPT task **FotWeb post-match updates** checks hourly for completed ISL
2026–27 matches, verifies public reports, and commits meaningful changes to
`data/isl-results.json` on `main`. Streamlit picks up repository changes.
This is a ChatGPT task, not a GitHub Actions workflow or a live-score API.
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
- Advanced dashboards remain clearly labelled sample/imported data. The verified
  results collection does not supply missing shot locations or player statistics.

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
latest branch head and base tree; change only the results file. Publish a
fast-forward commit with an expected-head guard, never a force-push. If the
branch changes concurrently, reread and merge before retrying.
