# FotWeb Android APK (beta)

This native Android **WebView** app opens the original site at
https://fotweb.streamlit.app/ (not the GitHub Pages PWA). The existing
Streamlit/GitHub data updates remain unchanged. Official YouTube watch links,
source references and other external links open in their respective installed
apps or browser.

## Build

Push an Android-related change to `main` to run
`.github/workflows/build-android-apk.yml`. It uses Android Gradle Plugin
8.7.3, Java 17, Gradle 8.11.1 and Android SDK 35. The icon is generated using
`pwa/make_icons.py`.

The v1.1.1 workflow publishes the APK in GitHub Releases (tag
`android-v1.1.1`) at:

https://github.com/ibasilbinu/fotweb-by-basil/releases/download/android-v1.1.1/FotWeb.apk

The download is a file attachment, not an installation web page. Android may
require permission to install apps from the user's browser.

## Important: beta signing

The automated build creates a temporary **release** signing certificate that
is deleted with the runner, because the repository has no private signing
credentials. This yields an installable APK but **subsequent APK updates cannot
be installed over a prior beta** using a different signing key. Users must
uninstall the previous beta before installing this build.

Before maintaining a long-lived version, generate a permanent private keystore,
save it securely, configure it through GitHub Actions secrets and adjust the
workflow signing step. Then publish a new stable Android version with its
permanent signing certificate. Never commit the private keystore/password.

## FotWeb v1.1.1 Android window

FotWeb renders its Streamlit workspace inside a full-screen native WebView,
without launching Chrome as its main screen. Club/team navigation stays in the
app. Links opened with `target="_blank"` (including official YouTube watch
links) are captured by a temporary WebView and routed to Android's
external app/browser handler. First-party FotWeb links continue in the app.
The original beta signing certificates were temporary, so uninstall the
previous beta before installing v1.1.1.
