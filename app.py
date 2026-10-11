"""FotWeb by Basil: Streamlit host for the football analytics workspace."""

from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

from postmatch import load_results
from season import load_season
from update_log import load_update_log
from datetime import datetime
from zoneinfo import ZoneInfo


ROOT = Path(__file__).resolve().parent

st.set_page_config(
    page_title="FotWeb by Basil",
    page_icon="⚽",
    layout="wide",
    initial_sidebar_state="collapsed",
)

# The component is served from this repository, not from the earlier ChatGPT Site.
# No external website or credentials are required by the app.
st.markdown(
    """
    <style>
      .stApp { background: #0b0e11; }
      .block-container { padding: 1rem 0 0 !important; max-width: 100% !important; }
      /* FotWeb has its own header inside the component. Hide Streamlit's
         entire host header and toolbar, including its three-dot menu. */
      [data-testid="stHeader"],
      [data-testid="stToolbar"],
      .stAppHeader,
      .stAppToolbar,
      .stToolbar {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        visibility: hidden !important;
      }
      /* Suppress Community Cloud's Fork/GitHub and deploy controls,
         including any reserved spacing; retain the three-dot MainMenu. */
      [data-testid="stToolbarActions"],
      .stToolbarActions,
      [data-testid="stToolbarActionButton"],
      .stToolbarActionButton,
      [data-testid="stAppDeployButton"],
      .stDeployButton {
        display: none !important;
        width: 0 !important;
        min-width: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      [data-testid="stMainMenuItem-print"],
      [data-testid="stMainMenuItem-recordScreencast"] { display: none !important; }
      [data-testid="stMainBlockContainer"] { padding-top: 1rem !important; }
      iframe[title*="fotweb_workspace"] { display: block; border: 0; }
    </style>
    """,
    unsafe_allow_html=True,
)

fotweb_workspace = components.declare_component(
    "fotweb_workspace", path=str(ROOT / "frontend")
)
try:
    post_match_data = load_results(ROOT / "data" / "isl-results.json")
except (ValueError, KeyError, TypeError, OSError):
    st.warning("Post-match results are temporarily unavailable. Please try again later.")
    post_match_data = None

try:
    season_data = load_season(ROOT / "data" / "isl-season.json")
except (ValueError, KeyError, TypeError, OSError):
    st.error("The ISL schedule is temporarily unavailable. Please try again later.")
    st.stop()

try:
    update_log = load_update_log(ROOT / "data" / "update-log.json")
except (ValueError, KeyError, TypeError, OSError):
    update_log = {"schemaVersion": 1, "season": "2026-27", "checks": []}

fotweb_workspace(
    season_data=season_data,
    update_log=update_log,
    post_match_data=post_match_data,
    today=datetime.now(ZoneInfo("Asia/Kolkata")).date().isoformat(),
    key="fotweb-workspace",
    default=None,
)
