// Intentionally minimal -- this is a pure wrapper around chatgiza.com, no
// native capabilities are exposed to the page. contextIsolation stays on
// (see main.ts) as a security default even though nothing is bridged yet.
// (A titleBarOverlay dark/light bridge lived here briefly -- removed along
// with frame:false/titleBarOverlay in main.ts, see that file's comment.)
export {};
