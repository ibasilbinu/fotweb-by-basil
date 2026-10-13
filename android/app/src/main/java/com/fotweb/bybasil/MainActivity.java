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
import android.webkit.DownloadListener;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

/**
 * A minimal Android companion for the existing, live Streamlit FotWeb site.
 * Sourced football data remains on the existing Streamlit/GitHub pipeline.
 */
public final class MainActivity extends Activity {
    private static final String HOME = "https://fotweb.streamlit.app/";
    private WebView site;
    private ProgressBar progress;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(11, 14, 17));
        getWindow().setNavigationBarColor(Color.rgb(11, 14, 17));

        FrameLayout layout = new FrameLayout(this);
        layout.setBackgroundColor(Color.rgb(11, 14, 17));
        site = new WebView(this);
        layout.addView(site, new FrameLayout.LayoutParams(-1, -1));

        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        FrameLayout.LayoutParams bar = new FrameLayout.LayoutParams(-1, dp(3), Gravity.TOP);
        layout.addView(progress, bar);
        setContentView(layout);

        // Never allow remote debugging of the installed WebView.
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings s = site.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setLoadsImagesAutomatically(true);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setSupportMultipleWindows(true);
        s.setJavaScriptCanOpenWindowsAutomatically(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        site.setBackgroundColor(Color.rgb(11, 14, 17));

        site.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return false;
                Uri url = request.getUrl();
                if (isFotWeb(url)) return false;
                openExternal(url);
                return true;
            }
        });
        site.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress >= 100) progress.setVisibility(View.GONE);
                else {
                    progress.setVisibility(View.VISIBLE);
                    progress.setProgress(newProgress);
                }
            }

            @Override
            public boolean onCreateWindow(WebView view, boolean isDialog,
                                          boolean isUserGesture, Message resultMsg) {
                if (!isUserGesture) return false;
                // Streamlit's watch buttons and sources open in the phone's
                // browser rather than trapping YouTube inside the app.
                final WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override
                    public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) {
                        openExternal(request.getUrl());
                        v.post(v::destroy);
                        return true;
                    }

                    @Override
                    public void onPageFinished(WebView v, String url) {
                        if (url != null && !url.equals("about:blank")) {
                            openExternal(Uri.parse(url));
                        }
                        v.post(v::destroy);
                    }
                });
                WebView.WebViewTransport transport = (WebView.WebViewTransport) resultMsg.obj;
                transport.setWebView(popup);
                resultMsg.sendToTarget();
                return true;
            }
        });
        site.setDownloadListener((url, userAgent, disposition, mime, length) ->
                openExternal(Uri.parse(url)));

        if (savedInstanceState == null) site.loadUrl(HOME);
        else site.restoreState(savedInstanceState);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private boolean isFotWeb(Uri uri) {
        return "https".equalsIgnoreCase(uri.getScheme()) &&
               "fotweb.streamlit.app".equalsIgnoreCase(uri.getHost());
    }

    private void openExternal(Uri uri) {
        try {
            Intent i = new Intent(Intent.ACTION_VIEW, uri);
            i.addCategory(Intent.CATEGORY_BROWSABLE);
            startActivity(i);
        } catch (ActivityNotFoundException exception) {
            Toast.makeText(this, "No app can open this link", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onBackPressed() {
        if (site != null && site.canGoBack()) site.goBack();
        else super.onBackPressed();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        site.saveState(outState);
        super.onSaveInstanceState(outState);
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
