// Simple hardcoded allowlist, not full RBAC -- deliberately minimal until
// there's an actual need for tiered admin permissions.
function adminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().has(email.toLowerCase());
}

// The real (mixed-case, as configured) addresses -- for actually sending
// mail to, as opposed to isAdminEmail's lowercase Set used only for
// membership checks.
export function adminEmailList(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}
