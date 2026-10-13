/* Show installation help inside the original Streamlit website.
   No redirects. On the separate PWA shell, request native install. */
(() => {
  const PWA_ORIGIN = 'https://ibasilbinu.github.io';
  const SELECTOR = '#installFotWeb, .sidebar-install-fotweb';
  const dialog = document.getElementById('installHelpDialog');
  const steps = document.getElementById('installHelpSteps');
  let inPwa = false;
  function showInstructions() {
    if (!dialog || !steps) return;
    const ua = navigator.userAgent || '';
    const iOS = /iPad|iPhone|iPod/i.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const android = /Android/i.test(ua);
    if (iOS) {
      steps.innerHTML =
        '<p>1. Open this website in <strong>Safari</strong>.</p>' +
        '<p>2. Tap the <strong>Share</strong> button.</p>' +
        '<p>3. Select <strong>Add to Home Screen</strong> and confirm.</p>';
    } else if (android) {
      steps.innerHTML =
        '<p>1. Open the <strong>⋮ browser menu</strong>.</p>' +
        '<p>2. Tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.</p>' +
        '<p>3. Confirm by tapping <strong>Install</strong> or <strong>Add</strong>.</p>';
    } else {
      steps.innerHTML =
        '<p>1. Open the <strong>browser menu</strong>.</p>' +
        '<p>2. Look for <strong>Install page as app</strong>, <strong>Install app</strong>, or <strong>Create shortcut</strong>.</p>' +
        '<p>3. Follow the installation confirmation.</p>';
    }
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }
  window.addEventListener('message', event => {
    if (event.source !== window.top || event.origin !== PWA_ORIGIN ||
        event.data?.type !== 'fotweb:pwa-ready') return;
    inPwa = true;
    if (event.data.installed) {
      document.querySelectorAll(SELECTOR).forEach(el => { el.hidden = true; });
    }
  });
  document.addEventListener('click', event => {
    const el = event.target instanceof Element ? event.target : null;
    if (!el) return;
    if (el.closest(SELECTOR)) {
      event.preventDefault();
      if (inPwa && window.top !== window) {
        window.top.postMessage({type:'fotweb:pwa-install-request'}, PWA_ORIGIN);
      } else {
        showInstructions();
      }
    }
    if (el.closest('#closeInstallHelp, #doneInstallHelp')) {
      if (typeof dialog?.close === 'function') dialog.close();
      else dialog?.removeAttribute('open');
    }
  });
  if (window.top !== window) {
    window.top.postMessage({type:'fotweb:pwa-probe'}, PWA_ORIGIN);
  }
})();