# FotWeb Android APK (beta)

This native Android **WebView** app opens the original site at
https://fotweb.streamlit.app/ (not the GitHub Pages PWA). The existing
Streamlit/GitHub data updates remain unchanged. Official YouTube watch links,
source references and other external links open in the user's browser.

## Build

Push an Android-related change to `main` to run
`.github/workflows/build-android-apk.yml`. It uses Android Gradle Plugin
8.7.3, Java 17, Gradle 8.11.1 and Android SDK 35. The icon is generated using
`pwa/make_icons.py`.

The workflow produces a release-signed APK in GitHub Releases (tag
`android-v1.0.0`) at:

https://github.com/ibasilbinu/fotweb-by-basil/releases/download/android-v1.0.0/FotWeb.apk

The download is a file attachment, not an installation web page. Android may
require permission to install apps from the user's browser.

## Important: beta signing

The first automated build creates a temporary **release** signing certificate
that is deleted with the runner, because the repository has no private signing
credentials. No signing secrets are committed. This yields an installable APK
but **subsequent APK updates cannot be installed over this beta** using a
different signing key. Users would need to uninstall the beta first.

Before maintaining a long-lived version, generate a permanent private keystore,
save it securely, configure it through GitHub Actions secrets and adjust the
workflow signing step. Then publish a new stable Android version with its
permanent signing certificate. Never commit the private keystore/password.
