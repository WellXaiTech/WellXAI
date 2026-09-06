export type ParsedReminder = { runAt: string; prompt: string };

const REMINDER_RE = /\[\[REMINDER_START\]\]([\s\S]*?)\[\[REMINDER_END\]\]/;

// The model emits runAt as naive local time ("YYYY-MM-DDTHH:mm", no
// timezone), the same format ScheduledPanel's own datetime-local input
// uses -- new Date(...) parses that string as local time in the
// browser's own timezone, which is exactly what ScheduledPanel's manual
// "Schedule" button already relies on (new Date(when).toISOString()), so
// a reminder created by the model lands in the same stored format as
// one created by hand.
export function extractReminder(text: string): ParsedReminder | null {
  const match = text.match(REMINDER_RE);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1]);
    if (!parsed || typeof parsed.runAt !== "string" || typeof parsed.prompt !== "string" || !parsed.prompt.trim()) {
      return null;
    }
    const date = new Date(parsed.runAt);
    if (Number.isNaN(date.getTime())) return null;
    return { runAt: date.toISOString(), prompt: parsed.prompt.trim() };
  } catch {
    return null;
  }
}

// The marker block is plumbing for the app, never something a reader
// should see rendered as raw JSON in the chat -- same reasoning and
// streaming-safe pattern as stripSourceMarkers/stripPdfMarkers: strip a
// complete block anywhere, and strip from an opening tag to the end of
// the string too, so a reply mid-stream never flashes raw JSON before
// the closing tag has arrived yet.
export function stripReminderMarkers(text: string): string {
  return text
    .replace(/\n?\[\[REMINDER_START\]\][\s\S]*?\[\[REMINDER_END\]\]/g, "")
    .replace(/\n?\[\[REMINDER_START\]\][\s\S]*$/g, "");
}
