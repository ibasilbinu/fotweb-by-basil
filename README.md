# FotWeb by Basil ⚽

A public Streamlit workspace for Indian Super League **2026–27**. It displays
published fixtures, participating clubs, verified results and post-match analysis.
There are no demonstration results or fictional player records.

Live site: https://fotweb.streamlit.app/

## Current content

- Official participating club list and official club crests.
- Creator’s Corner: an About Basil page with contact and profile icons.
- All 78 published Phase 1 fixtures, 10 October 2026–17 January 2027.
- Fixtures filtered by club, month, match status or search.
- Kickoff times in IST, published venues, and explicit Venue TBC labels.
- Bottom-centred Watch live links to announced official ISL English YouTube streams.
  Completed broadcasts appear as Watch replay; unannounced streams have no button.
- Points totals calculated from verified league-stage FT results.
- Club dashboards with their schedule, results and any sourced match statistics.
- Club Analytics: interactive team match-by-match trends, attack/defence rankings,
  two-club statistical comparisons and a league possession-vs-shots scatter plot.
  Computes only from verified completed league results; displays game counts,
  metric-specific availability and early-season caveats. No paid data feed.

- Match reports with source links. Missing statistics stay unavailable.

The initial schedule snapshot comes from the official ISL schedule. It is not a
live-score feed. Hourly checks verifies results, schedule changes and official English stream links, then writes updates to
this repository; source publication and checks can be delayed. Refresh the page
for the latest committed data. No API key is required.

## Run locally

Python 3.12 recommended:

```bash
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

## Deploy on Streamlit Community Cloud

Use repository `ibasilbinu/fotweb-by-basil`, branch `main`, entrypoint `app.py`.
The public site is https://fotweb.streamlit.app/.

## Data and validation

- `data/isl-season.json`: sourced clubs and published schedule.
- `data/isl-results.json`: only verified completed-match records.
- `season.py` and `postmatch.py`: validation contracts.
- [POST_MATCH_UPDATES.md](POST_MATCH_UPDATES.md): scheduled update rules.

```bash
python season.py data/isl-season.json
python postmatch.py data/isl-results.json
```

Points: 3 per win, 1 per draw. Display order uses points, goal difference, goals
scored and club name. Official head-to-head tie-breakers, deductions and rulings
can change the official order. Playoffs do not contribute to league points.
Player-level analysis and spatial charts require actual published data; the app
never fills gaps with fabricated statistics. Club crests remain their owners'
marks. FotWeb is an independent fan analytics project.

The component is served from this repository by Streamlit, with no dependency
on ChatGPT hosting. The separate scheduled updater runs through ChatGPT Tasks.
