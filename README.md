# ChatGiZa

Next.js app for **ChatGiZa** (a ChatGPT-style assistant). This README is written for a new developer or team picking up the project — it covers what exists, how to run it, and how it's put together.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**, **Tailwind CSS v4**
- **NextAuth (Auth.js v5 beta)** — Google sign-in only
- **OpenAI API** (primary) with an **Anthropic** fallback path, or canned mock replies if neither key is set
- **Stripe** — subscription checkout for paid plans
- **Vercel KV** — optional account-synced chat history (only active when deployed on Vercel with a KV store linked; conversations otherwise persist per-browser in `localStorage`)

> `AGENTS.md` at the project root carries a note for AI coding assistants: this Next.js version has real API differences from older training data — check `node_modules/next/dist/docs/` before assuming an older API shape.

## Getting started

```bash
npm install
cp .env.example .env   # then fill in the values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables (`.env`)

| Variable | Required? | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | Recommended | Powers real chat replies, image generation (`gpt-image-1`), video generation (Sora), and web search / deep research modes. Checked first. |
| `ANTHROPIC_API_KEY` | Optional | Fallback text-chat provider if OpenAI isn't set. Image/video/web-search only work on the OpenAI path. |
| `AUTH_SECRET` | Required for sign-in | Any random string (`openssl rand -base64 32`). |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Required for sign-in | Google OAuth "Web application" client — needs `http://localhost:3000/api/auth/callback/google` (and the production equivalent) as an authorized redirect URI. |
| `STRIPE_SECRET_KEY` | Optional | Powers the "Upgrade plan" checkout flow (`/api/checkout`). Not set → the Upgrade panel will fail to start checkout. |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` (etc.) | Optional | Auto-populated by Vercel when a KV store is linked to the project. Enables account-synced chat history (`/api/history`); without it, history stays local to each browser only. |

If **no** AI key is set at all, the app still runs and replies with clearly-canned text (never labeled "demo" in the UI, but obviously generic) — useful for UI work without burning API credits.

## Project structure

```
src/
  app/
    (marketing)/        # Public site: home, research, products, business, developers, company, foundation, stories
    chatgiza/            # The ChatGiZa app shell (own layout, no marketing nav/footer)
    login/               # Standalone sign-in page
    api/                 # Route handlers: chat, image, video, code, checkout, history, auth
  components/            # ChatSidebar, ChatComposer, ChatMessageBubble, SettingsPanel, AccountMenu, panels for
                          # Projects/Library/Plugins/Scheduled/Code, etc.
  lib/                    # ai.ts (provider logic + prompts), theme.ts, fontSize.ts, assistantColor.ts,
                          # attachments.ts, extractPdfText.ts, generatePdf.ts, stripe.ts, plans.ts
  auth.ts                 # NextAuth config (Google OAuth2, manual endpoints — see note below)
```

## Features

**Marketing site** (`(marketing)` route group) — monochrome, English-only, modeled loosely on openai.com's layout conventions. Standard Navbar/Footer shared across its pages.

**ChatGiZa** (`/chatgiza`) — the actual product, a full ChatGPT-style app:

- Streaming chat replies, markdown rendering, PDF export of any reply, edit-and-resend on user messages
- Real image generation (logos/art) and short video generation (Sora), both auto-detected from plain-language requests or explicitly picked from the composer's "+" menu
- Web search and "deep research" (structured, cited reports) modes
- File/image/PDF attachments, including OCR-style fallback for scanned/image-only PDFs
- Sidebar: Projects, a media Library, KYC placeholders, per-conversation pin/archive/share/rename/delete, a fixed-position "..." menu
- Settings: theme (light/dark/system), text size, reply color, profile/custom instructions, Memory (user-managed facts fed into the system prompt), Language (reply-language preference), **Data controls** (location opt-in, shared-links/archived-chats management, export-all-data, archive-all/delete-all), Company dashboard (KYC-style company profile + team directory, also fed into the system prompt)
- Google sign-in; conversation history persists in `localStorage` per browser, and additionally syncs to Vercel KV per-account when deployed with a KV store linked
- Stripe-backed "Upgrade plan" checkout (`/api/checkout`, `/api/checkout/verify`)

## Android app

`android/` is a **real native Android app** — Kotlin + Jetpack Compose, not a WebView wrapper. It started as a Capacitor-WebView shell, but that was replaced (see git history starting at `52e5801`, "Replace the WebView with a real native Compose app") with native screens built in phases: Chat + sign-in (Phase 1), History (Phase 2), Account (Phase 3), Settings/Projects/Automations/Billing (Phase 4), followed by many rounds of UI polish to match the web app's design. Capacitor is still used for the Android build tooling/project scaffold, but the UI itself is native Compose.

Source lives at `android/app/src/main/java/com/wellxai/chatgiza/` — notably `MainActivity.kt`, which at ~3,700 lines holds most of the UI; splitting it up is worth doing before adding much more to it. The native app talks to this repo's own backend — see `src/app/api/profile`, `billing`, `projects`, `scheduled`, `settings`, `sessions`, `mobile`, `realtime`, `account`, `support`.

**Sign-in**: uses Android's native **Credential Manager API** (`androidx.credentials.CredentialManager` + `GetGoogleIdOption`) — Google's supported native Sign-In-with-Google mechanism. This is why the old "Google blocks OAuth inside embedded WebViews" concern doesn't apply here; there's no WebView involved in sign-in at all.

**Build & distribution**: `.github/workflows/android-apk.yml` builds a signed release APK on every push to `android/**` and publishes it to GitHub Releases at a stable URL — `https://github.com/WellXaiTech/WellXAI/releases/latest/download/app-release.apk`. `src/components/InstallAppPrompt.tsx` (mounted on `/chatgiza`) shows Android web visitors a "Download APK" banner pointing at that same URL. This is a self-distributed **sideload** APK — the signing key (`android/release.keystore`) is intentionally committed to this public repo, which is fine for sideloading but **must not** be reused for a Play Store submission (a leaked public signing key defeats the point of Play App Signing).

**Local Android Studio workflow** (only needed for local debugging — CI doesn't need this):

```bash
npm run android:sync   # re-copy config into the native project after editing capacitor.config.ts
npm run android:open   # opens android/ in Android Studio
```

**Remaining gap for a real Play Store submission** (not started): Play Store needs an `.aab` (Android App Bundle), which the current CI doesn't produce (APK only), and a private upload key separate from the public sideload keystore above — plus the usual Play Console store-listing steps (screenshots, privacy policy URL, content rating, etc.).

## Conventions worth knowing before changing things

- **Theming**: every themed CSS value in `globals.css` is defined in **four places** — `:root` (light default), `@media (prefers-color-scheme: dark)`, `:root[data-theme="dark"]`, `:root[data-theme="light"]` (the last two are the manual override set by the Settings theme picker). Missing one of the four is the most common way to introduce a "works in one theme, broken in the other" bug.
- **Client-side persistence**: most user data (conversations, projects, profile, memory, plugin toggles, language, location) lives in `localStorage` under `chatgiza:*` keys, loaded via a mount-only `useEffect` in `chatgiza/page.tsx` (never read directly in a `useState` initializer — that causes a hydration mismatch, since the server render never sees `localStorage`).
- **Auth quirk**: `src/auth.ts` configures Google as plain OAuth2 with explicit endpoints instead of relying on Auth.js's OIDC discovery. This works around a real Auth.js v5 + Google bug (`CallbackRouteError: response parameter "iss" missing`). Don't "simplify" it back to `Google({ clientId, clientSecret })`.
- **Dropdown/flyout menus** inside scrollable containers (e.g. the sidebar's per-conversation "..." menu) are rendered via `createPortal` into `document.body` with `position: fixed`, not `position: absolute` — the sidebar's conversation list has `overflow-y: auto`, which clips anything absolutely positioned inside it.
- **Never fake a feature**: this codebase's standing convention is an honest placeholder (see `ComingSoonModal.tsx`) over a fabricated one. If you're asked to add something with no real backing implementation, say so and build the honest version instead of simulating success.

## Deployment

Deploys to Vercel. Live deploys were intentionally paused mid-project to focus on local iteration — check with whoever owns the Vercel project before running `vercel --prod`. The Stripe key in use during development was a **live** restricted key, not a test key — treat checkout-flow changes with real-money caution.
