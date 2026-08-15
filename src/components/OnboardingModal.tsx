"use client";

import { useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { checkBirthDate, getMaxBirthDate } from "@/lib/ageGate";

export default function OnboardingModal({
  defaultName,
  onSave,
  onSkip,
}: {
  defaultName: string;
  onSave: (fullName: string, birthDate: string, country: string) => void;
  onSkip: () => void;
}) {
  const [fullName, setFullName] = useState(defaultName);
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const birthDateCheck = checkBirthDate(birthDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6" onClick={onSkip}>
      <div className="card w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-1 text-base font-semibold">Let&apos;s add some details to your account</h2>
        <p className="mb-5 text-sm text-muted">
          This helps provide age-appropriate settings and personalize your experience.
        </p>

        <label className="mb-1 block text-xs text-muted">Full name</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Full name"
          className="mb-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
        />

        <label className="mb-1 block text-xs text-muted">Date of birth</label>
        <div className="mb-4">
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={getMaxBirthDate()}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
          />
          {!birthDateCheck.ok && <p className="mt-1 text-xs text-red-500">{birthDateCheck.reason}</p>}
        </div>

        <label className="mb-1 block text-xs text-muted">Country</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="mb-6 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40"
        >
          <option value="">Select…</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <button
          onClick={() => onSave(fullName.trim(), birthDate, country)}
          disabled={!birthDateCheck.ok}
          className="btn-primary mb-2 w-full rounded-full py-2.5 text-sm font-medium hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Continue
        </button>
        <button
          onClick={onSkip}
          className="w-full rounded-full py-2 text-sm text-muted transition-colors hover:text-foreground"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
