export type VerifiedSource = { url: string; title: string };

const SOURCES_RE = /\[\[SOURCES_START\]\]([\s\S]*?)\[\[SOURCES_END\]\]/;

// Idea #8: a "Verified Source Trail" -- unlike a model typing a markdown
// link into its own prose (which it can invent or get wrong), these come
// from the real url_citation annotations OpenAI's search-preview models
// attach when they actually performed a live web search. The backend
// appends them as a JSON marker block (same trick as PDF export's
// [[PDF_START]]/[[PDF_END]]) so the client can pull out real, structured
// data instead of parsing prose links.
export function extractSources(text: string): VerifiedSource[] {
  const match = text.match(SOURCES_RE);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[1]);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is VerifiedSource => !!s && typeof s.url === "string" && typeof s.title === "string"
    );
  } catch {
    return [];
  }
}

// The marker block is a convention for the model/backend, never something
// a reader should see rendered as raw JSON in the chat. The block is always
// appended last, so while it's still streaming in (opened but not yet
// closed) there's nothing after it worth keeping either -- strip from the
// opening tag to the end of the string in that case too, so a reader never
// sees a flash of raw JSON before the closing tag arrives.
export function stripSourceMarkers(text: string): string {
  return text
    .replace(/\n?\[\[SOURCES_START\]\][\s\S]*?\[\[SOURCES_END\]\]/g, "")
    .replace(/\n?\[\[SOURCES_START\]\][\s\S]*$/g, "");
}

export function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
