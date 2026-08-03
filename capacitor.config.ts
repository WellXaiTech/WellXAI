import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.wellxai.chatgiza",
  appName: "ChatGiZa",
  webDir: "public",
  server: {
    // The apex domain 308-redirects to www (Vercel's canonical domain) — a
    // different host, which Capacitor's WebView refuses to load internally
    // and hands off to the system browser instead. Pointing straight at the
    // final host avoids that redirect (and the resulting "app always opens
    // Chrome" behavior) entirely.
    url: "https://www.chatgiza.com",
    androidScheme: "https",
  },
};

export default config;
