package com.wellxai.chatgiza;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
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
  }
}
