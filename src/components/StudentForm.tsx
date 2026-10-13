"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { saveStudent } from "@/lib/records";
import type { Student } from "@/lib/types";

export function StudentForm({
  initial,
  submitLabel,
  onSaved,
}: {
  initial?: Student | null;
  submitLabel: string;
  onSaved?: () => void;
}) {
  const [regId, setRegId] = useState(initial?.regId ?? "");
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const regValid = /^\d+$/.test(regId.trim());
  const canSave = regValid && fullName.trim().length >= 2 && !saving;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await saveStudent({ regId, fullName });
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="regId" className="label">Reg. ID</label>
        <input
          id="regId"
          inputMode="numeric"
          autoComplete="off"
          className="field font-display text-lg tracking-wide"
          placeholder="e.g. 3397"
          value={regId}
          onChange={(e) => setRegId(e.target.value.replace(/\D/g, ""))}
        />
        {regId && !regValid && <p className="mt-1 text-sm text-bad">Reg. ID is numbers only.</p>}
      </div>
      <div>
        <label htmlFor="fullName" className="label">Full name</label>
        <input
          id="fullName"
          autoComplete="off"
          className="field uppercase"
          placeholder="As written on the sheet"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      {error && <p className="rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{error}</p>}
      <button type="submit" disabled={!canSave} className="btn-primary w-full py-3">
        {saving && <Loader2 size={16} className="animate-spin" />}
        {submitLabel}
      </button>
    </form>
  );
}
