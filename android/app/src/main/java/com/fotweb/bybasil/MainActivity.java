package com.fotweb.bybasil;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Message;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public final class MainActivity extends Activity {
    private static final String HOME = "https://fotweb.streamlit.app/?embed=true";
    private static final String APP_HOST = "fotweb.streamlit.app";
    private WebView site;
    private ProgressBar progress;

    @Override
    public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(11, 14, 17));
        getWindow().setNavigationBarColor(Color.rgb(11, 14, 17));

        final FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(11, 14, 17));
        site = new WebView(this);
        site.setBackgroundColor(Color.rgb(11, 14, 17));
        root.addView(site, new FrameLayout.LayoutParams(-1, -1));

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        progress.setIndeterminate(false);
        root.addView(progress, new FrameLayout.LayoutParams(-1, dp(3), Gravity.TOP));
        setContentView(root);

        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings settings = site.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setLoadsImagesAutomatically(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);

        // Capture target="_blank" / window.open destinations instead of dropping them.
        settings.setSupportMultipleWindows(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);

        site.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                if (!req.isForMainFrame()) return false;
                return route(req.getUrl());
            }

            @Override
            public void onReceivedError(WebView view,
                                        android.webkit.WebResourceRequest request,
                                        android.webkit.WebResourceError error) {
                if (request.isForMainFrame()) {
                    Toast.makeText(MainActivity.this,
                      "Unable to load FotWeb. Check your internet connection.",
                      Toast.LENGTH_LONG).show();
                }
            }
        });
        site.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int value) {
                if (value >= 100) progress.setVisibility(View.GONE);
                else {
                    progress.setVisibility(View.VISIBLE);
                    progress.setProgress(value);
                }
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                                          boolean isUserGesture, Message resultMsg) {
                // A non-visible WebView captures the popup URL. We never display
                // a second in-app window: first-party URLs load in 'site' and
                // external URLs are sent to Android's app/browser resolver.
                final WebView popup = new WebView(MainActivity.this);
                WebSettings popupSettings = popup.getSettings();
                popupSettings.setJavaScriptEnabled(true);
                popupSettings.setDomStorageEnabled(true);
                popup.setWebViewClient(new WebViewClient() {
                    private boolean handlePopupUrl(Uri uri) {
                        if (uri == null) return true;
                        if ("https".equalsIgnoreCase(uri.getScheme()) &&
                            APP_HOST.equalsIgnoreCase(uri.getHost())) {
                            site.loadUrl(uri.toString());
                        } else {
                            route(uri);
                        }
                        popup.post(() -> {
                            popup.stopLoading();
                            popup.destroy();
                        });
                        return true;
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView popupView,
                                                            WebResourceRequest request) {
                        if (!request.isForMainFrame()) return false;
                        return handlePopupUrl(request.getUrl());
                    }

                    @Override
                    public boolean shouldOverrideUrlLoading(WebView popupView, String url) {
                        return handlePopupUrl(Uri.parse(url));
                    }
                });
                popup.setDownloadListener((url, userAgent, disposition, mime, length) -> {
                    if (url != null) openExternal(Uri.parse(url));
                    popup.post(popup::destroy);
                });

                WebView.WebViewTransport transport =
                    (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
        });

        site.setDownloadListener((url, userAgent, disposition, mime, length) -> {
            if (url != null) openExternal(Uri.parse(url));
        });

        if (state == null) site.loadUrl(HOME);
        else site.restoreState(state);
    }

    private boolean route(Uri url) {
        if (url == null) return true;
        String scheme = url.getScheme();
        if (scheme == null || scheme.equalsIgnoreCase("about") ||
            scheme.equalsIgnoreCase("blob") || scheme.equalsIgnoreCase("data")) {
            return false;
        }
        if (scheme.equalsIgnoreCase("https") &&
            APP_HOST.equalsIgnoreCase(url.getHost())) return false;

        openExternal(url);
        return true;
    }

    private void openExternal(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(intent);
        } catch (ActivityNotFoundException | SecurityException ex) {
            Toast.makeText(this, "No app available for this link", Toast.LENGTH_SHORT).show();
        }
    }

    private int dp(int n) {
        return Math.round(n * getResources().getDisplayMetrics().density);
    }

    @Override
    public void onBackPressed() {
        if (site != null && site.canGoBack()) site.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle saved) {
        if (site != null) site.saveState(saved);
        super.onSaveInstanceState(saved);
    }

    @Override
    protected void onDestroy() {
        if (site != null) {
            site.destroy();
            site = null;
        }
        super.onDestroy();
    }
}
