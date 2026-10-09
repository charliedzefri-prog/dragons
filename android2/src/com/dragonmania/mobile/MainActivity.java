package com.dragonmania.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.FrameLayout;
import android.widget.ProgressBar;

public class MainActivity extends Activity {
    static final String URL = "https://dragonmania.onrender.com/mobile/";
    WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override protected void onCreate(Bundle b) {
        super.onCreate(b);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#5a3313"));
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        final ProgressBar pb = new ProgressBar(this);
        FrameLayout.LayoutParams pl = new FrameLayout.LayoutParams(-2, -2); pl.gravity = android.view.Gravity.CENTER;
        root.addView(pb, pl);
        setContentView(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);
        s.setUserAgentString(s.getUserAgentString() + " DragonmaniaApp/1.1 wv");
        web.setBackgroundColor(Color.parseColor("#5a3313"));
        if (Build.VERSION.SDK_INT >= 21) CookieManager.getInstance().setAcceptThirdPartyCookies(web, true);

        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView v, String url) {
                if (url.startsWith("https://dragonmania.onrender.com")) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception e) {}
                return true;
            }
            @Override public void onPageFinished(WebView v, String url) { pb.setVisibility(View.GONE); }
            @Override public void onReceivedError(WebView v, int code, String desc, String failingUrl) {
                if (failingUrl != null && failingUrl.startsWith(URL))
                    v.loadData("<html><body style='background:#5a3313;color:#fff;font-family:sans-serif;text-align:center;padding-top:40%'>"
                        + "<h2>Нет связи с сервером</h2><p>" + desc + "</p><p><a style='color:#ffcc00;font-size:20px' href='" + URL + "'>Повторить</a></p></body></html>",
                        "text/html; charset=utf-8", "utf-8");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onJsAlert(WebView v, String u, String m, final JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setMessage(m).setCancelable(false)
                    .setPositiveButton("OK", (d, w) -> r.confirm()).show(); return true;
            }
            @Override public boolean onJsConfirm(WebView v, String u, String m, final JsResult r) {
                new AlertDialog.Builder(MainActivity.this).setMessage(m).setCancelable(false)
                    .setPositiveButton("OK", (d, w) -> r.confirm()).setNegativeButton("Отмена", (d, w) -> r.cancel()).show(); return true;
            }
            @Override public boolean onJsPrompt(WebView v, String u, String m, String def, final JsPromptResult r) {
                final android.widget.EditText et = new android.widget.EditText(MainActivity.this); et.setText(def == null ? "" : def);
                new AlertDialog.Builder(MainActivity.this).setMessage(m).setView(et).setCancelable(false)
                    .setPositiveButton("OK", (d, w) -> r.confirm(et.getText().toString())).setNegativeButton("Отмена", (d, w) -> r.cancel()).show(); return true;
            }
        });
        if (b != null) web.restoreState(b); else web.loadUrl(URL);
    }
    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }
    @Override public void onBackPressed() { if (web.canGoBack()) web.goBack(); else super.onBackPressed(); }
    @Override protected void onPause() { super.onPause(); web.onPause(); }
    @Override protected void onResume() { super.onResume(); web.onResume(); }
}
