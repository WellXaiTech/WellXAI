// Shared WebAuthn (passkey) config -- rpID must exactly match the domain
// Digital Asset Links is published on (public/.well-known/assetlinks.json),
// or Android refuses to let the app register/use passkeys against it at
// all. expectedOrigin covers both the website itself and the native app's
// origin, which Android derives from the app's signing cert fingerprint
// per the android:apk-key-hash: scheme WebAuthn defines for native apps.
export const RP_NAME = "ChatGiZa";
export const RP_ID = "chatgiza.com";

// The Android APK origin string Google's Credential Manager sends as
// `origin` when a passkey ceremony happens inside the native app (not a
// browser) -- built from the release cert's SHA-256 fingerprint, base64url
// encoded without padding. See public/.well-known/assetlinks.json for the
// same fingerprint (BF:06:AB:90:E4:8A:FD:39:AD:A7:57:92:CE:C2:12:F8:5B:6D:D5:3E:18:89:CA:D8:BF:35:13:B7:DE:45:6D:92)
// in its usual colon-separated hex form. If this app is ever re-signed
// with a different key, both this constant and assetlinks.json need the
// new fingerprint or native passkeys silently stop working.
export const ANDROID_APK_ORIGIN = "android:apk-key-hash:vwarkOSK_Tmtp1eSzsIS-Ftt1T4YicrYvzUTt95FbZI";

export const EXPECTED_ORIGINS = [`https://${RP_ID}`, `https://www.${RP_ID}`, ANDROID_APK_ORIGIN];
