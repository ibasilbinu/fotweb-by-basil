/* iOS Home Screen installation from original FotWeb, with no redirection.
   Android users retain the signed FotWeb APK download unchanged. */
(() => {
  const elements = Array.from(document.querySelectorAll('#installFotWeb, .sidebar-install-fotweb'));
  const ua = navigator.userAgent || '';
  const inAndroidApp = /\bwv\b/i.test(ua) || ua.includes('FotWebAndroid/');
  const isiOS = /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  if (inAndroidApp || (isiOS && standalone)) {
    elements.forEach(el => { el.hidden = true; });
    return;
  }
  if (!isiOS) return;

  const dialog = document.createElement('dialog');
  dialog.id = 'fotwebIosInstallDialog';
  dialog.className = 'ios-install-dialog';
  dialog.setAttribute('aria-labelledby', 'fotwebIosInstallTitle');
  dialog.innerHTML = [
    '<div class="ios-install-dialog-heading">',
    '<div><span class="eyebrow">FOTWEB FOR IPHONE &amp; IPAD</span>',
    '<h2 id="fotwebIosInstallTitle">Add FotWeb to your Home Screen</h2></div>',
    '<button type="button" class="ios-install-close" aria-label="Close">×</button>',
    '</div>',
    '<p class="ios-install-lede">Install from this website without going to another page.</p>',
    '<ol class="ios-install-steps">',
    '<li>Open <strong>fotweb.streamlit.app</strong> in <strong>Safari</strong>.</li>',
    '<li>Tap <strong>Share</strong> <span aria-hidden="true">↑</span>.</li>',
    '<li>Choose <strong>Add to Home Screen</strong>.</li>',
    '<li>Enable <strong>Open as Web App</strong> and tap <strong>Add</strong>.</li>',
    '</ol>',
    '<p class="ios-install-hint">FotWeb will appear on your Home Screen. Launch it from that icon for the app experience. Internet is required for updated match data.</p>',
    '<button type="button" class="ios-install-done">Got it</button>'
  ].join('');
  document.body.appendChild(dialog);
  const close = () => { if (dialog.open) dialog.close(); };
  dialog.querySelector('.ios-install-close').addEventListener('click', close);
  dialog.querySelector('.ios-install-done').addEventListener('click', close);
  dialog.addEventListener('click', event => { if (event.target === dialog) close(); });

  elements.forEach(el => {
    el.removeAttribute('download');
    el.setAttribute('href', '#fotwebIosInstallDialog');
    el.setAttribute('title', 'Install FotWeb on iPhone or iPad');
    el.setAttribute('aria-label', 'Install FotWeb on iPhone or iPad');
    el.setAttribute('aria-haspopup', 'dialog');
    if (el.id === 'installFotWeb') {
      const label = el.querySelector('span');
      if (label) label.textContent = 'Install App';
    } else {
      const last = el.lastChild;
      if (last && last.nodeType === Node.TEXT_NODE) last.textContent = ' Install FotWeb for iOS';
    }
    el.addEventListener('click', event => {
      event.preventDefault();
      if (!dialog.open) dialog.showModal();
    });
  });
})();