/* Same-page installation for the original Streamlit site, no APK download. */
(() => {
  const SELECTOR = '#installFotWeb, .sidebar-install-fotweb';
  const PWA_ORIGIN = 'https://ibasilbinu.github.io';
  let inPwaWrapper = false;
  const dialog = document.createElement('dialog');
  dialog.id = 'fotwebInstallHelp';
  dialog.innerHTML =
    '<div class="install-head"><strong>Install FotWeb</strong><button type="button" id="closeFotwebInstall" aria-label="Close">×</button></div>' +
    '<div id="fotwebInstallSteps"></div>' +
    '<p class="install-note">Installation is handled by your browser. Streamlit Cloud may use its own name and icon.</p>' +
    '<button type="button" class="install-done">Got it</button>';
  document.body.appendChild(dialog);
  dialog.querySelector('#closeFotwebInstall').onclick = () => dialog.close();
  dialog.querySelector('.install-done').onclick = () => dialog.close();
  const showHelp = () => {
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/i.test(ua);
    const android = /Android/i.test(ua);
    const steps = ios ?
      ['Open this website in Safari.', 'Tap Share.', 'Choose Add to Home Screen.'] :
      android ?
      ['Open the browser’s three-dot menu.', 'Choose Install app or Add to Home screen.', 'Confirm installation.'] :
      ['Open the browser menu.', 'Choose Install app or Create shortcut.', 'Confirm installation.'];
    const target = dialog.querySelector('#fotwebInstallSteps');
    target.replaceChildren(...steps.map((step, i) => {
      const p = document.createElement('p'); p.textContent = (i + 1) + '. ' + step; return p;
    }));
    if (!dialog.open) dialog.showModal();
  };
  document.addEventListener('click', e => {
    if (!(e.target instanceof Element) || !e.target.closest(SELECTOR)) return;
    e.preventDefault();
    if (inPwaWrapper) {
      window.top.postMessage({type:'fotweb:pwa-install-request'}, PWA_ORIGIN);
      return;
    }
    try {
      const bridge = window.parent.__fotwebPwa;
      if (bridge?.installed()) return;
      if (bridge?.request()) return;
    } catch (_) {}
    showHelp();
  });
  window.addEventListener('message', e => {
    if(e.source !== window.top || e.origin !== PWA_ORIGIN || e.data?.type !== 'fotweb:pwa-ready')return;
    inPwaWrapper=true;
    if(e.data.installed) document.querySelectorAll(SELECTOR).forEach(el=>el.hidden=true);
  });
  if(window.top !== window) window.top.postMessage({type:'fotweb:pwa-probe'}, PWA_ORIGIN);
})();