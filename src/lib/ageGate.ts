// Shared by the website (OnboardingModal, SettingsPanel) and the single
// `/api/profile` endpoint the native Android app also writes birthDate to
// (see comment in src/app/api/profile/route.ts) -- one rule so "must be at
// least 18" can't drift between them, and stays correct as years pass
// instead of being pinned to a birth year that only means 18 in one year.
export const MIN_AGE = 18;
export const MIN_BIRTH_YEAR = 1900;

// Accepts either a full ISO date ("1990-05-12", from the web date picker)
// or a bare 4-digit year ("1990", from the native app's year field).
export function extractBirthYear(value: string): number | null {
  const match = value.trim().match(/^(\d{4})/);
  if (!match) return null;
  return Number(match[1]);
}

function parseFullDate(value: string): { year: number; month: number; day: number } | null {
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const asDate = new Date(year, month - 1, day);
  const isReal = asDate.getFullYear() === year && asDate.getMonth() === month - 1 && asDate.getDate() === day;
  return isReal ? { year, month, day } : null;
}

// The date input (web) gives an exact birthdate, so the age check is exact
// too. The native app only collects a year, so it's approximated as if born
// Jan 1 of that year -- the most permissive reading, since we don't know
// their actual birthday.
function ageInYears(year: number, month: number, day: number, now: Date): number {
  let age = now.getFullYear() - year;
  const hadBirthdayThisYear = now.getMonth() > month - 1 || (now.getMonth() === month - 1 && now.getDate() >= day);
  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

// The oldest allowed value for a date-of-birth <input type="date" max=...>:
// today's date, MIN_AGE years back. Someone born on exactly this date turns
// MIN_AGE today.
export function getMaxBirthDate(now: Date = new Date()): string {
  const year = now.getFullYear() - MIN_AGE;
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export type BirthDateCheck = { ok: true } | { ok: false; reason: string };

// birthDate is optional (users can skip it) -- this only rejects it when a
// value was actually provided but is out of range or unparseable.
export function checkBirthDate(value: string | undefined | null, now: Date = new Date()): BirthDateCheck {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return { ok: true };

  const year = extractBirthYear(trimmed);
  if (year === null || year < MIN_BIRTH_YEAR || year > now.getFullYear()) {
    return { ok: false, reason: "Enter a valid birth year." };
  }

  const full = parseFullDate(trimmed);
  const age = full ? ageInYears(full.year, full.month, full.day, now) : now.getFullYear() - year;

  if (age < MIN_AGE) {
    return { ok: false, reason: `You must be at least ${MIN_AGE} to use ChatGiZa.` };
  }
  return { ok: true };
}
