# FotWeb by Basil ⚽

FotWeb is an independent football analytics website for the **Indian Super League
2026–27**, created by **Basil Binu**, an aspiring data analyst and football fan.
Follow published fixtures, explore club squads, compare team form and read
source-linked analysis after the final whistle.

**[Visit FotWeb](https://fotweb.streamlit.app/)** · [Optional branded app](https://ibasilbinu.github.io/fotweb-by-basil/)

The current schedule snapshot contains **13 clubs and 78 Phase 1 fixtures**, from
**10 October 2026 to 17 January 2027**. Fixtures and source coverage may change.

## Explore the website

| Page | What it offers |
| --- | --- |
| **Season Overview** | Season summary and season-wide player leaderboards shown together, with no display selector. |
| **Fixtures & Results** | Filter by club, month and match status. Open any fixture for match details, available confirmed starting XIs or a verified completed-match report. |
| **Points Table** | League points, wins, draws, losses, goals for, goals against and goal difference, calculated from verified results. |
| **Clubs This Season** | Participating clubs, official crests, upcoming fixtures and links to their dashboards and official profiles. |
| **Team Dashboard** | Choose a club, then choose the section to display: its summary, form, squad, leading players, fixtures, home/away points, statistics or club information. |
| **Club Analytics** | Compare multiple clubs’ form, explore attack/defence rankings, compare two clubs’ available statistics and inspect the possession-versus-shots chart. |
| **Creator’s Corner** | Meet Basil and find his LinkedIn, GitHub and email links. |

The top bar provides **Home** and **Return to previous page**. The previous-page
button is dimmed and disabled on Home. Elsewhere it restores the previous in-app
view, including selected dashboard sections, clubs, fixture filters and match
details; without an earlier view, it returns to Season Overview.

## Season Overview

Season Overview shows **both sections together**, with no display selector:

- **Season summary:** participating clubs, schedule entries, fixture window,
  verified goals and available disciplinary totals.
- **Season player leaders:** top-five scorers, assists, recorded goals + assists,
  yellow cards and red cards, with each player’s club and data-coverage notes.

Upcoming fixtures remain available in **Fixtures & Results**; the full standings
are available in **Points Table**. Team Dashboard and match report section
selectors are unchanged.

## Team Dashboard

Select **Competition**, **Season** and **Club**, then use **Display section** to
keep the dashboard focused on one topic. Available competition and season options
are currently Indian Super League and 2026–27.

| Section | Details |
| --- | --- |
| **Summary** | Verified league matches played, points, win/draw/loss record, goals for and goals against, plus club information. |
| **Team form** | A chronological line chart of points earned in each completed league match. Hover, tap or focus a point for its date, opponent, home/away venue, score, result and points. An expandable table lists match-by-match form. |
| **Squad & coach** | Published official club squad, grouped into goalkeepers, defenders, midfielders and forwards, with player names, available shirt numbers, portraits and the listed head coach. Missing or failed portraits use silhouettes. |
| **Top players** | Top-five scorers, assists, recorded goals + assists, yellow-card recipients and red-card recipients for the selected club. |
| **Club fixtures & results** | The selected club’s published fixtures and verified results, with links to match details. |
| **Points earned · Home vs away** | Separate home and away points, matches played and win/draw/loss records. |
| **Team statistics** | Available sourced match statistics. Totals use published values; possession uses the average of available match values. |
| **Club information** | Club crest, published fixture count and official club-profile link. |

The selected section stays selected when switching clubs and is restored by
in-app Back navigation. Squad listings include their official source and
verification time; they are published club listings, not a guarantee of final
league registration.

## Club Analytics

**Club form · All teams** combines clubs’ per-match points in one chart:

- **Win = 3 points, draw = 1 point, loss = 0 points.** Values are points earned
  in that match, rather than cumulative points.
- Each club has its own colour. **Select multiple club names** in the legend to
  compare their lines; click a selected club again to remove it.
- **All clubs** resets the comparison. Removing the last selection also shows
  all clubs again.
- **M1, M2, M3…** represent each club’s first, second and third completed league
  matches, rather than shared calendar dates.
- Hover, tap or keyboard-focus a point for the club and match details. Clubs
  without verified completed matches are listed without a plotted line.

Other sections show **attacking output by shots**, **defensive output by shots
allowed**, a **two-club statistical comparison** and an **ISL performance
explorer** plotting available average possession against shots per match.
Coverage and small-sample notes accompany the analysis.

## Fixtures, reports and streams

Kickoff times are displayed in **IST**. Published venues are shown, with
**Venue TBC** when no venue is available. Selecting a fixture opens its details;
confirmed upcoming starting XIs appear when published, while completed matches
open their source-linked reports. Completed reports have a **Display section**
dropdown, like Season Overview and Team Dashboard. The match scoreboard remains
visible while only the chosen section is shown: **Match overview**, **Lineup**,
**Match statistics**, **Player stats**, **Match timeline**, **Tactical analytics**,
**Advanced analytics**, or **FotWeb Tactical Verdict**. Switching sections
retains the match and supports returning to the previous section with the
in-app Back button. All verified source links remain visible below the chosen
section. Reports show available scores, scorers, disciplinary events, lineups,
statistics and analysis without filling data gaps.

Streaming buttons link to recorded official ISL **English YouTube broadcasts**.
Scheduled broadcasts use **Watch live**, while completed broadcasts use
**Watch replay**. Fixtures without a recorded stream link have no watch button.
These links are separate from the fixture’s match-details interaction.

## Data sources and updates

The website reads validated JSON snapshots committed to this repository.
GitHub Actions imports official fixtures, confirmed XIs, streams and completed
results directly, using its repository token. ChatGPT tasks provide independent
backup source checks and publication.

- 08:00 IST: morning stream and fixture discovery.
- Hourly: new official YouTube schedules, future fixtures and result enrichment.
- 16:30 / 19:00 IST: confirmed lineups for 17:00 / 19:30 kickoffs.
- 19:10 / 21:45 IST: final-score checks, with ten-minute match-window retries.
- Continue through phase gaps, new fixtures, playoffs and the confirmed final.

Partial/empty source responses preserve verified data. New phases are discovered
from the official schedule; FT, extra-time and penalty results are supported.
All snapshots validate before publication. Concurrent writers retry from the
latest main without force pushing. Source failures are logged and fail the job,
even when its verified partial data has been published. Streamlit refreshes its
loaded data every 60 seconds after receiving repository changes.

See [AUTOMATION.md](AUTOMATION.md) for exact schedules, sources, recovery and
season-completion rules. Scheduled execution can be delayed; YouTube discovery
is polling, not an instant webhook. Squad discovery still requires sourced
editorial checks. No personal access token or API key is required.

**Sources & methodology** displays a single **Last updated: date, time IST** line
from the most recently recorded source check. A completed check can update that
timestamp even when no football data has changed.

Primary sources include the [official ISL schedule](https://www.indiansuperleague.com/schedule-fixtures),
[standings](https://www.indiansuperleague.com/standings), official club squad pages,
match-specific reports and the [official ISL YouTube channel](https://www.youtube.com/@IndianSuperLeague).
Completed results require an official report or cross-checking against two
independent reputable reports. Individual reports retain their source links.

## Run locally

Python 3.12 is recommended. From the repository directory:

```bash
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

The app uses a Python Streamlit host and a custom HTML/CSS/JavaScript component.
Charts and derived statistics are calculated from the supplied snapshots in the
frontend. No frontend build step is required.

## Repository structure

| Path | Purpose |
| --- | --- |
| `app.py` | Streamlit host, data loading and component setup. |
| `frontend/` | Website pages, navigation, responsive styling, charts and report rendering. |
| `data/isl-season.json` | Participating clubs, published fixtures, venues and recorded broadcast links. |
| `data/isl-results.json` | Verified completed-match records, source links and available statistics. |
| `data/isl-squads.json` | Official club squad and head-coach snapshots. |
| `data/update-log.json` | Recorded source checks used by the Last updated display. |
| `automated_update.py`, `stream_update.py` | Official match and English-stream importers used by Actions. |\n| `season.py`, `postmatch.py`, `squads.py`, `update_log.py` | Data-loading and validation contracts. |
| `POST_MATCH_UPDATES.md` | Source-verification and scheduled-update rules. |
| `requirements.txt` | Python dependencies. |

Validate the schedule, results and update log:

```bash
python season.py data/isl-season.json
python postmatch.py data/isl-results.json
python update_log.py data/update-log.json
```

Validate squads against the participating club IDs:

```python
from pathlib import Path
from season import load_season
from squads import load_squads

season = load_season(Path("data/isl-season.json"))
load_squads(Path("data/isl-squads.json"), {team["id"] for team in season["teams"]})
```

## Deployment

Streamlit Community Cloud uses repository **`ibasilbinu/fotweb-by-basil`**, branch
**`main`**, and entrypoint **`app.py`**. The public website is
**https://fotweb.streamlit.app/**. The component is served by Streamlit directly
from this repository.

## Methodology

League standings and form use verified **league-stage FT results**: three points
for a win, one for a draw and none for a loss. Playoffs do not contribute to league
points. Display ties use points, goal difference, goals scored and club name;
official head-to-head rules, deductions or rulings may change the official order.

Missing statistics stay unavailable rather than becoming zero. Player rankings
use published individual statistics and named events, so incomplete coverage can
undercount contributions. Own goals are excluded from individual scorer totals.
No fictional players, demonstration results, estimated shot locations, invented
xG or predicted lineups are used. Club crests and portraits remain their owners’
property. FotWeb is an independent fan analytics project.

## Install FotWeb on your device

**Install from the original site without redirecting:** Open
https://fotweb.streamlit.app/ and select **Install App** in the top bar or
**Install FotWeb App** in the sidebar. The button opens on-page, device-specific
instructions to use your current browser's **Install app** or **Add to Home screen**
menu without leaving the website. Streamlit Community Cloud cannot reliably
trigger a FotWeb-branded native install prompt from this custom-component iframe;
the installed shortcut may use Streamlit's branding.

The optional FotWeb-branded PWA remains at
https://ibasilbinu.github.io/fotweb-by-basil/ and offers a native install
prompt on supported browsers from its own in-page button. The PWA embeds the
same live Streamlit app and shares all fixture and match-update workflows.



FotWeb remains hosted and automatically updated on Streamlit Community Cloud at
**https://fotweb.streamlit.app/**. Its optional **installable PWA shell** embeds
that same live site, without duplicating match data or modifying automated jobs.

- **Installable URL (after GitHub Pages is enabled):**
  https://ibasilbinu.github.io/fotweb-by-basil/
- On Android or desktop Chrome/Edge, open the installable URL and choose
  **Install FotWeb**. Depending on browser support, the button opens the native
  installation prompt or displays manual menu instructions.
- On iPhone or iPad, open the installable URL in Safari, choose **Share →
  Add to Home Screen**.
- FotWeb uses its own F↗ icon and launches in standalone mode when supported.
  **An internet connection is required for fixtures and analytics**; only the
  installation shell is cached. A Streamlit iframe depends on the normal public
  Streamlit service and its uptime.

**One-time GitHub Pages setup:** On the repository's **Settings → Pages** screen,
set **Build and deployment → Source: GitHub Actions**. The
[Deploy installable FotWeb](.github/workflows/deploy-pwa.yml) workflow then
publishes the contents of pwa/ when the installation shell changes. After enabling
Pages, open **Actions → Deploy installable FotWeb** and select **Re-run failed
jobs** for its initial run (or use **Run workflow**). The workflow
does not alter the deployed Streamlit application, GitHub football update
workflows or verified data. The custom Streamlit Cloud hostname does not itself
become a branded PWA; users install from the GitHub Pages URL.

The PWA consists of [pwa/index.html](pwa/index.html),
[pwa/manifest.webmanifest](pwa/manifest.webmanifest), [pwa/sw.js](pwa/sw.js),
and the logo assets generated by [pwa/make_icons.py](pwa/make_icons.py).
