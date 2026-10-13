/* Hide the Android APK download button only inside the installed app. */
(() => {
  const inAndroidWebView = /\bwv\b/i.test(navigator.userAgent) ||
    navigator.userAgent.includes('FotWebAndroid/');
  if (!inAndroidWebView) return;
  document.querySelectorAll('#installFotWeb, .sidebar-install-fotweb').forEach(el => {
    el.hidden = true;
  });
})();