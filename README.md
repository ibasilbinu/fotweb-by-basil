# FotWeb by Basil ⚽

A public Streamlit workspace for Indian Super League **2026–27**. It displays
published fixtures, participating clubs, verified results and post-match analysis.
There are no demonstration results or fictional player records.

Live site: https://fotweb.streamlit.app/

## Current content

- Official participating club list and official club crests.
- Creator’s Corner: an About Basil page with contact and profile icons.
- A universal top-bar Back button restores the previous in-app view, including
  any selected club, fixture filters or opened match report. On direct entry
  to a section without prior in-app history, it returns to Season overview.
- All 78 published Phase 1 fixtures, 10 October 2026–17 January 2027.
- Fixtures & results filtered using the All clubs / individual club dropdown,
  month and match status. This selection is local to Fixtures & results.
- Kickoff times in IST, published venues, and explicit Venue TBC labels.
- Bottom-centred Watch live links to announced official ISL English YouTube streams.
  Completed broadcasts appear as Watch replay; unannounced streams have no button.
- Points totals calculated from verified league-stage FT results.
- Season Overview also shows one selected section at a time: Season summary,
  Season player leaders, Upcoming fixtures, Points table or Match
  analysis information. Its selector is independent of Team Dashboard.
- Club Analytics combines all clubs’ per-match points into one form chart,
  with club colours, a selectable legend and hover/tap/focus match details.
- Season Overview shows league-wide top-five player leaderboards for scorers,
  assists, recorded goal contributions, yellow cards and red cards. Players'
  clubs and published-stat coverage are shown, with no invented totals.
- Club dashboards with their schedule, results and any sourced match statistics.
- Team Dashboard has a chronological form line graph showing points earned per
  completed league match (win 3, draw 1, loss 0), with match details. It updates
  from verified results, showing an empty state before the first match.
- Team Dashboard displays one selected section at a time: Summary, Team form,
  Squad & coach, Top players, Club fixtures & results, Points earned, Team
  statistics or Club information. The selection persists when switching clubs
  and is restored by in-app Back navigation.
- Team Dashboard shows official squad lists grouped by position, player portraits
  with silhouette fallbacks, shirt numbers when published and the head coach.
  Each club includes the source link and squad verification time.
- Team Dashboard adds separate points earned at home and away, plus top-five
  player lists for scorers, assists, recorded goals + assists, yellow cards and
  red cards. Counts come only from verified league-stage results, named card
  events and available player-level statistics. Missing values remain unavailable.
- Team Dashboard has local Competition, Season and Club selectors. The currently
  published options are Indian Super League and 2026–27, plus all 13 clubs;
  selecting a club refreshes its dashboard without filtering Season Overview
  or Fixtures & Results. Other competitions/seasons are not invented.
- Club Analytics: per-match points form, attack/defence rankings,
  two-club statistical comparisons and a league possession-vs-shots scatter plot.
  Computes only from verified completed league results; displays game counts,
  metric-specific availability and early-season caveats. No paid data feed.

- Click any fixture in Fixtures & results to open a match-details page: confirmed
  upcoming starting XIs when published, or the existing eight-section verified
  report after full time. No separate Match Reports navigation tab.
- Match reports retain their source links; unavailable statistics and pre-match
  lineups remain explicitly unavailable rather than being predicted.

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
