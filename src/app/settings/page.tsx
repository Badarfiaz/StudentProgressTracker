"use client";

import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useStudent } from "@/components/StudentProvider";
import { StudentForm } from "@/components/StudentForm";
import { titleCase } from "@/lib/format";

export default function SettingsPage() {
  const { student, records } = useStudent();
  const [saved, setSaved] = useState(false);
  if (!student) return null;

  return (
    <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-[1fr_1.1fr]">
      <div>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Student</h1>
        <p className="mt-2 leading-relaxed text-ink-soft">
          Result sheets are matched by Reg. ID. Changing it switches the app to that student. Saved results stay with
          the Reg. ID they belong to and come back if you switch again.
        </p>
        <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-line">
          <p className="text-sm text-ink-faint">Following now</p>
          <p className="mt-1 font-display text-2xl font-bold">{titleCase(student.fullName)}</p>
          <p className="text-sm text-ink-soft">Reg. ID {student.regId}, {records.length} saved result{records.length === 1 ? "" : "s"}</p>
        </div>
      </div>
      <div className="panel p-6 sm:p-7">
        <h2 className="mb-5 text-xl font-bold">Edit details</h2>
        <StudentForm
          key={`${student.regId}-${student.fullName}`}
          initial={student}
          submitLabel="Save details"
          onSaved={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}
        />
        {saved && (
          <p role="status" className="mt-3 flex items-center gap-2 text-sm font-semibold text-ok">
            <CheckCircle2 size={16} />Details saved
          </p>
        )}
      </div>
    </div>
  );
}
