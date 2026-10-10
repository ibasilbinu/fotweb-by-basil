"""FotWeb by Basil: Streamlit host for the football analytics workspace."""

from pathlib import Path

import streamlit as st
import streamlit.components.v1 as components

from postmatch import load_results


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
      [data-testid="stHeader"] { background: transparent; }
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

fotweb_workspace(post_match_data=post_match_data, key="fotweb-workspace", default=None)
