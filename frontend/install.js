/* Android APK download directly from FotWeb; no PWA installation popup.
   Hide the download action inside the installed Android WebView itself. */
(() => {
  const inApp = /(?:^|[;\\s])wv(?:[;\\s]|$)/i.test(navigator.userAgent) ||
    navigator.userAgent.includes('FotWebAndroid/');
  if (!inApp) return;
  document.querySelectorAll('#installFotWeb, .sidebar-install-fotweb').forEach(node => {
    node.hidden = true;
  });
})();