/* iOS Home Screen installation from original FotWeb, with no redirection.
   Android users retain the signed FotWeb APK download unchanged. */
(() => {
  const elements = Array.from(document.querySelectorAll('#installFotWeb, .sidebar-install-fotweb'));
  // Check GitHub Releases for a newer APK and show a one-time NEW label per version.
  const repo = 'ibasilbinu/fotweb-by-basil';
  const releaseApi = 'https://api.github.com/repos/' + repo + '/releases/latest';
  const compareVersions = (a, b) => {
    const pa = String(a).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    const pb = String(b).replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0) ? 1 : -1;
    }
    return 0;
  };
  const removeBadges = () => document.querySelectorAll('.fotweb-update-badge').forEach(node => node.remove());
  fetch(releaseApi, { headers: { Accept: 'application/vnd.github+json' }, cache: 'no-store' })
    .then(response => { if (!response.ok) throw new Error('Release check unavailable'); return response.json(); })
    .then(release => {
      const latestVersion = String(release.tag_name || '').replace(/^android-v/i, '').replace(/^v/i, '');
      if (!latestVersion) return;
      const apk = (release.assets || []).find(asset => asset.name === 'FotWeb.apk');
      if (apk && apk.browser_download_url) {
        elements.forEach(el => el.href = apk.browser_download_url);
      }
      const currentVersion = elements[0]?.dataset.appVersion || '1.1.1';
      if (compareVersions(latestVersion, currentVersion) <= 0) return;
      const storageKey = 'fotweb-update-seen-' + latestVersion;
      if (localStorage.getItem(storageKey) === '1') return;
      elements.forEach(el => {
        const badge = document.createElement('span');
        badge.className = 'fotweb-update-badge';
        badge.textContent = 'NEW';
        badge.setAttribute('aria-label', 'New Android app version available');
        el.appendChild(badge);
        el.addEventListener('click', () => {
          try { localStorage.setItem(storageKey, '1'); } catch (_) {}
          removeBadges();
        }, { once: true });
      });
    })
    .catch(() => { /* Keep the current download link if GitHub cannot be reached. */ });
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