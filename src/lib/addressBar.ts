// Shared by every "type something, get a real search or a real website"
// entry point in the app (Build's Live preview address bar, Home's "+"
// menu) so the URL-vs-search detection can't quietly drift between them.

export function isLikelyUrl(query: string): boolean {
  const firstToken = query.split(/\s+/)[0];
  return /^https?:\/\//i.test(query) || (!query.includes(" ") && /\.[a-z]{2,}(\/|$)/i.test(firstToken));
}

// A literal URL resolves to itself (adding https:// if missing); anything
// else becomes a Google search for it.
export function resolveAddressBarUrl(query: string): string {
  const trimmed = query.trim();
  return isLikelyUrl(trimmed)
    ? /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`
    : `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
}

// Opens the query in a real new tab. There's no way to show most real
// sites (Google included) embedded inside the app itself: the destination
// sends X-Frame-Options/CSP headers specifically blocking that, a security
// policy on the destination's own server no code here can work around --
// same reason a fresh browser tab, not an inline iframe, is still how
// Home's own "Open a website" works.
export function openExternalQuery(query: string) {
  if (!query.trim()) return;
  window.open(resolveAddressBarUrl(query), "_blank", "noopener,noreferrer");
}
