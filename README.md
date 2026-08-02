# WellX AI

Next.js app for the WellX AI company website and its AI product, **ChatGiZa** (a ChatGPT-style assistant). This README is written for a new developer or team picking up the project — it covers what exists, how to run it, and how it's put together.

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

`android/` is a real Capacitor-based Android project (not a stub) — it loads the live site (`https://chatgiza.com`, configured in `capacitor.config.ts`) directly in a native WebView, so shipping a change is just deploying the website; the app doesn't need a new Play Store release for ordinary content/UI updates.

Requires **Android Studio** (with the Android SDK) installed locally — not available in this dev environment, so the native build/run/APK steps haven't been tested end-to-end yet:

```bash
npm run android:sync   # re-copy config into the native project after editing capacitor.config.ts
npm run android:open   # opens android/ in Android Studio
```

From Android Studio: let Gradle sync, then Run on an emulator or a device connected via USB debugging. Building a release APK/AAB for the Play Store requires generating a signing key (`Build > Generate Signed Bundle / APK`) — not done yet.

**Known real limitation, not yet solved**: Google sign-in (`signIn("google", ...)`) may be blocked by Google inside a plain embedded WebView (Google actively disallows OAuth sign-in from generic embedded WebViews for security reasons — you'd see "This browser or app may not be secure"). If that happens once this is actually tested on a device, the fix is routing the Google OAuth step through the system browser (Chrome Custom Tabs) instead of the in-app WebView — e.g. Capacitor's `@capacitor/browser` plugin, or a dedicated OAuth plugin — not just the "load the live site" wrapper this is right now. Flagging this now rather than after the fact, since it's a real gap, not a hypothetical one.

## Conventions worth knowing before changing things

- **Theming**: every themed CSS value in `globals.css` is defined in **four places** — `:root` (light default), `@media (prefers-color-scheme: dark)`, `:root[data-theme="dark"]`, `:root[data-theme="light"]` (the last two are the manual override set by the Settings theme picker). Missing one of the four is the most common way to introduce a "works in one theme, broken in the other" bug.
- **Client-side persistence**: most user data (conversations, projects, profile, memory, plugin toggles, language, location) lives in `localStorage` under `chatgiza:*` keys, loaded via a mount-only `useEffect` in `chatgiza/page.tsx` (never read directly in a `useState` initializer — that causes a hydration mismatch, since the server render never sees `localStorage`).
- **Auth quirk**: `src/auth.ts` configures Google as plain OAuth2 with explicit endpoints instead of relying on Auth.js's OIDC discovery. This works around a real Auth.js v5 + Google bug (`CallbackRouteError: response parameter "iss" missing`). Don't "simplify" it back to `Google({ clientId, clientSecret })`.
- **Dropdown/flyout menus** inside scrollable containers (e.g. the sidebar's per-conversation "..." menu) are rendered via `createPortal` into `document.body` with `position: fixed`, not `position: absolute` — the sidebar's conversation list has `overflow-y: auto`, which clips anything absolutely positioned inside it.
- **Never fake a feature**: this codebase's standing convention is an honest placeholder (see `ComingSoonModal.tsx`) over a fabricated one. If you're asked to add something with no real backing implementation, say so and build the honest version instead of simulating success.

## Deployment

Deploys to Vercel. Live deploys were intentionally paused mid-project to focus on local iteration — check with whoever owns the Vercel project before running `vercel --prod`. The Stripe key in use during development was a **live** restricted key, not a test key — treat checkout-flow changes with real-money caution.
