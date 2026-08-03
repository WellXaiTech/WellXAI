package com.wellxai.chatgiza;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  private static final String HOME_URL = "https://chatgiza.com/chatgiza";

  // The very first onResume() fires right after onCreate(), while Capacitor
  // is still asynchronously navigating the WebView to server.url for the
  // first time — calling loadUrl() ourselves at that moment races Capacitor's
  // own navigation setup and was sending launches out to Chrome instead of
  // opening the app. Only check on resumes AFTER that initial one, when a
  // blank WebView actually means "came back from somewhere and got stuck".
  private boolean hasResumedBefore = false;

  // Google blocks signing in from inside an embedded WebView (its own
  // anti-phishing policy), so tapping "Continue with Google" hands off to the
  // system browser instead — coming back to the app afterwards, the WebView
  // is sometimes left on a blank/failed page rather than the live site,
  // because nothing tells it to reload. If it's ever blank on a later
  // resume, just reload the site instead of leaving the user on a white screen.
  @Override
  public void onResume() {
    super.onResume();
    if (hasResumedBefore) {
      WebView webView = this.bridge.getWebView();
      String url = webView.getUrl();
      if (url == null || url.equals("about:blank")) {
        webView.loadUrl(HOME_URL);
      }
    }
    hasResumedBefore = true;
  }

  @Override
  public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    // Android's system WebView (unlike Chrome) doesn't reliably honor the
    // page's own <meta name="viewport"> for remotely-loaded content unless
    // these are set explicitly — without them it renders the desktop-width
    // layout shrunk to fit the screen instead of the responsive mobile one.
    WebSettings settings = this.bridge.getWebView().getSettings();
    settings.setUseWideViewPort(true);
    settings.setLoadWithOverviewMode(true);

    // WebView (unlike Chrome) multiplies CSS text-size by the device's own
    // accessibility "Font size" setting on top of the page's own responsive
    // sizing — on a phone with a larger font-size preference this makes text
    // and the elements sized around it balloon and clip off-screen. Pinning
    // this to 100 makes the app always render at the size the live site
    // itself specifies, matching what a normal browser tab would show.
    settings.setTextZoom(100);
    settings.setSupportZoom(false);
    settings.setBuiltInZoomControls(false);
    settings.setDisplayZoomControls(false);
  }
}
