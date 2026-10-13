/* FotWeb is hosted inside Streamlit as a nested iframe. On the installable
   FotWeb public URL, the top-level PWA receives our install request and can
   show the real browser install dialog without any navigation. The original
   streamlit.app origin cannot open that other origin's install dialog. */
(() => {
  const PWA_ORIGIN = 'https://ibasilbinu.github.io';
  const LINK_SELECTOR = '#installFotWeb, .sidebar-install-fotweb';
  let inPwa = false;
  const post = type => {
    if (window.top !== window) window.top.postMessage({ type }, PWA_ORIGIN);
  };
  window.addEventListener('message', event => {
    if (event.source !== window.top || event.origin !== PWA_ORIGIN ||
        event.data?.type !== 'fotweb:pwa-ready') return;
    inPwa = true;
    if (event.data.installed) {
      document.querySelectorAll(LINK_SELECTOR).forEach(link => { link.hidden = true; });
    } else {
      document.querySelectorAll(LINK_SELECTOR).forEach(link => {
        link.removeAttribute('target');
        link.setAttribute('aria-label', 'Install FotWeb without leaving this page');
        link.setAttribute('title', 'Install FotWeb');
      });
    }
  });
  document.addEventListener('click', event => {
    const link = event.target.closest?.(LINK_SELECTOR);
    if (!link || !inPwa) return; // Original Streamlit site: keep explicit install-site link.
    event.preventDefault();
    post('fotweb:pwa-install-request');
  });
  post('fotweb:pwa-probe');
})();