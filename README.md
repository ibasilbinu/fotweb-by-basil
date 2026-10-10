# FotWeb by Basil ⚽

A football analytics workspace designed for public deployment on **Streamlit Community Cloud**. It runs from this repository and does not depend on ChatGPT hosting, sign-in, APIs or keys.

## What is included

- Season overview and calculated league standings.
- Team dashboards, match filters, shot maps and shot heatmaps.
- Player profiles, squad search and position filters.
- Custom scatter plots with per-90 metrics and minimum-minutes filters.
- Player comparisons and statistical similarity shortlists.
- Tactical board with formations, draggable players and movement arrows.
- Chart SVG, player CSV and analysis report exports.
- Validated JSON imports and a downloadable example dataset.

**Important:** the included dataset is synthetic. Scores, player names and events are illustrative, not official ISL statistics. No live football feed is connected.

## Run on Windows

Open a terminal inside this folder:

```powershell
py -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements.txt
.venv\Scripts\python.exe -m streamlit run app.py
```

Open the local address printed in the terminal.

## Run on macOS or Linux

```bash
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m streamlit run app.py
```

## Create a public GitHub repository

1. Sign in to GitHub and select **New repository**.
2. Name the repository `fotweb-by-basil`.
3. Set visibility to **Public**. Initialize it with a README if using GitHub's file upload interface.
4. Upload the **contents** of this folder, including the `frontend` and `.streamlit` folders. `app.py` and `requirements.txt` must appear at the root of the repository.

Alternatively, from a terminal in this folder (Git must be installed), replace `YOUR_USERNAME` with your actual GitHub username:

```bash
git init -b main
git add .
git commit -m "Create FotWeb by Basil Streamlit app"
git remote add origin https://github.com/YOUR_USERNAME/fotweb-by-basil.git
git push -u origin main
```

For this terminal route, create the GitHub repository empty, without an automatically generated README.

## Publish on Streamlit

1. Sign in at https://share.streamlit.io/ and connect your GitHub account when required.
2. Choose **Create app**, then the option to deploy an existing app from GitHub.
3. Set the repository to your `fotweb-by-basil` repository and branch to `main`.
4. Set the main file path to **`app.py`**.
5. In advanced settings, choose **Python 3.12**.
6. Request **`fotweb-by-basil`** as the app subdomain if available, then deploy. If taken, choose a different subdomain.
7. Verify the app's sharing setting is **Public**. Test its actual deployed URL in an incognito browser.

Streamlit assigns the final `.streamlit.app` address during deployment. A requested subdomain is not reserved by these files. GitHub and Streamlit sign-in must be completed in your own accounts; this archive alone does not create a repository or live deployment.

Official instructions: https://docs.streamlit.io/deploy/streamlit-community-cloud/deploy-your-app/deploy

## Use real data

Open **Manage data** and download the example JSON. Keep its schema and replace the synthetic records with your own licensed or openly available data, then import the file. Imports and saved tactical notes stay in the current browser's local storage and are not shared with other visitors.

To make a dataset the public default, replace the data generator in `frontend/data.js` with a declaration of `SAMPLE_DATA` containing the validated dataset, then commit the change. Do not commit personal uploads, secrets, provider API keys or data you cannot redistribute.

Import is supported up to 15 MB, with 2–50 teams, up to 20 seasons, 2,500 players per season, 2,000 matches and 100,000 total shots. Browser storage capacity may impose a lower limit.

## Metric definitions

- **Standings:** 3 points for a win, 1 for a draw; ties sorted by goal difference and goals scored. This generic ordering may differ from competition-specific tie-break rules.
- **Per 90:** total ÷ minutes × 90; returns zero for zero recorded minutes.
- **xG:** sum of supplied shot xG values. FotWeb does not fit or estimate an xG model.
- **Radar:** per-90 metrics scaled to loaded-pool maxima, not percentile ranks.
- **Similarity:** cosine similarity of five maximum-scaled per-90 metrics, restricted to the same position. It describes statistical profiles, not equal quality or suitability.
- **Pitch:** 105 × 68 metres, with shot coordinates normalized toward the right goal.

## Project structure

| File | Purpose |
| --- | --- |
| `app.py` | Streamlit entrypoint and local component registration |
| `requirements.txt` | Tested Streamlit dependency |
| `.streamlit/config.toml` | Streamlit theme |
| `frontend/index.html` | Workspace layout |
| `frontend/styles.css` | Responsive interface styling |
| `frontend/data.js` | Synthetic example dataset |
| `frontend/app.js` | Analytics, interactions, imports and exports |
| `frontend/streamlit-bridge.js` | Streamlit component handshake and frame sizing |

The UI is a locally served Streamlit custom component, preserving the original FotWeb HTML/CSS/JavaScript workspace. Python starts the Streamlit app; analytics currently run in the browser. No Node installation or frontend build is needed.

## Verification

JavaScript syntax and calculation checks cover all seven workspace views, league standings, score/event consistency, player totals, per-90 output, similarity, import validation, empty filters and saved-data restoration. Streamlit startup is checked with its AppTest runner. Browser layout, component handshake and pointer interactions require a final browser check after deployment.

## Credits

Created by Basil. The workspace concept was inspired by TACTIX by Jeremy; FotWeb uses its own interface and illustrative data. No reference-site source code or dataset is included.
