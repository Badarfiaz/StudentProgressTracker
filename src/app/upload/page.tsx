"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Loader2, Trash2, UploadCloud, X } from "lucide-react";
import { useStudent } from "@/components/StudentProvider";
import { GradeBadge } from "@/components/GradeBadge";
import { Modal } from "@/components/Modal";
import { readPdfText } from "@/lib/pdfExtract";
import { nameMismatch, parseResultSheet, ParseError } from "@/lib/pdfParser";
import { findExisting, saveRecord } from "@/lib/records";
import { formatDate, ordinal, titleCase } from "@/lib/format";
import type { ExtractedRecord, ResultRecord } from "@/lib/types";

const MAX_FILES = 8;

type Status = "reading" | "ready" | "error" | "saving" | "saved" | "updated" | "skipped" | "failed";

interface Item {
  id: string;
  file: File;
  status: Status;
  record?: ExtractedRecord;
  error?: string;
  warning?: string;
}

type Choice = "update" | "cancel";

interface PendingDuplicate {
  fileName: string;
  existing: ResultRecord;
  incoming: ExtractedRecord;
  remaining: number;
  resolve: (choice: Choice, applyToRest: boolean) => void;
}

export default function UploadPage() {
  const { student } = useStudent();
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [pending, setPending] = useState<PendingDuplicate | null>(null);
  const [applyToRest, setApplyToRest] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = (id: string, p: Partial<Item>) =>
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...p } : it)));

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      if (!student) return;
      setNotice(null);
      setSummary(null);
      const files = Array.from(incoming);
      const pdfs = files.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
      const messages: string[] = [];
      if (pdfs.length < files.length) messages.push(`${files.length - pdfs.length} file(s) skipped because they aren't PDFs.`);

      const active = items.filter((i) => !["saved", "updated", "skipped"].includes(i.status));
      const room = MAX_FILES - active.length;
      const unique = pdfs.filter((f) => !active.some((i) => i.file.name === f.name && i.file.size === f.size));
      const accepted = unique.slice(0, Math.max(0, room));
      if (unique.length > accepted.length) messages.push(`Up to ${MAX_FILES} sheets at a time. ${unique.length - accepted.length} left out.`);
      if (messages.length) setNotice(messages.join(" "));
      if (!accepted.length) return;

      const newItems: Item[] = accepted.map((file) => ({
        id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
        file,
        status: "reading",
      }));
      setItems([...active, ...newItems]);

      newItems.forEach(async (item) => {
        try {
          const text = await readPdfText(item.file);
          const record = parseResultSheet(text, student);
          const warning = nameMismatch(record.studentName, student.fullName)
            ? `The sheet lists Reg. ID ${record.regId} as ${titleCase(record.studentName)}.`
            : undefined;
          patch(item.id, { status: "ready", record, warning });
        } catch (e) {
          patch(item.id, {
            status: "error",
            error: e instanceof ParseError ? e.message : "This PDF couldn't be read. It may be scanned or password protected.",
          });
        }
      });
    },
    [items, student],
  );

  const askDuplicate = (fileName: string, existing: ResultRecord, incoming: ExtractedRecord, remaining: number) =>
    new Promise<{ choice: Choice; applyToRest: boolean }>((resolve) => {
      setApplyToRest(false);
      setPending({
        fileName,
        existing,
        incoming,
        remaining,
        resolve: (choice, apply) => {
          setPending(null);
          resolve({ choice, applyToRest: apply });
        },
      });
    });

  async function saveAll() {
    const queue = items.filter((i) => i.status === "ready" && i.record);
    if (!queue.length) return;
    setSaving(true);
    setSummary(null);
    const counts = { saved: 0, updated: 0, skipped: 0, failed: 0 };
    let remembered: Choice | null = null;

    for (let idx = 0; idx < queue.length; idx++) {
      const item = queue[idx];
      const rec = item.record!;
      patch(item.id, { status: "saving" });
      try {
        const existing = await findExisting(rec);
        let isUpdate = false;
        if (existing) {
          let choice: Choice | null = remembered;
          if (!choice) {
            const later = queue.slice(idx + 1).length;
            const answer = await askDuplicate(item.file.name, existing, rec, later);
            choice = answer.choice;
            if (answer.applyToRest) remembered = choice;
          }
          if (choice === "cancel") {
            patch(item.id, { status: "skipped" });
            counts.skipped++;
            continue;
          }
          isUpdate = true;
        }
        await saveRecord(rec, item.file.name, isUpdate);
        patch(item.id, { status: isUpdate ? "updated" : "saved" });
        counts[isUpdate ? "updated" : "saved"]++;
      } catch (e) {
        patch(item.id, { status: "failed", error: e instanceof Error ? e.message : "Saving failed." });
        counts.failed++;
      }
    }
    setSaving(false);
    setSummary(counts);
  }

  const readyCount = items.filter((i) => i.status === "ready").length;
  const readingCount = items.filter((i) => i.status === "reading").length;
  const slotsLeft = MAX_FILES - items.filter((i) => !["saved", "updated", "skipped"].includes(i.status)).length;

  if (!student) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Add results</h1>
        <p className="mt-2 text-ink-soft">
          Drop in up to {MAX_FILES} class result sheets. Only the row for{" "}
          <span className="font-bold text-ink">{titleCase(student.fullName)}</span> (Reg. ID {student.regId}) is saved.
          The PDFs themselves stay on this device.
        </p>
      </header>

      <ol className="grid gap-2 sm:grid-cols-3" aria-label="How it works">
        {[
          ["1", "Choose the PDFs", "The result sheets you got from school."],
          ["2", "Check the preview", "We find your child's row automatically."],
          ["3", "Press Save", "Marks are stored. The PDFs are not."],
        ].map(([n, t, d]) => (
          <li key={n} className="flex items-start gap-3 rounded-2xl bg-white p-3.5 ring-1 ring-line">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-marker font-display text-sm font-extrabold">{n}</span>
            <span className="text-sm leading-snug"><b className="block">{t}</b><span className="text-ink-soft">{d}</span></span>
          </li>
        ))}
      </ol>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`rounded-3xl border-2 border-dashed p-8 text-center transition-colors sm:p-12 ${
          dragging ? "border-ink bg-marker-soft" : "border-line bg-white"
        } ${saving ? "pointer-events-none opacity-60" : ""}`}
      >
        <UploadCloud className="mx-auto text-ink" size={40} strokeWidth={1.6} />
        <p className="mt-3 font-display text-xl font-bold">Drag result sheets here, or tap the button</p>
        <p className="mt-1 text-sm text-ink-faint">PDF only, {slotsLeft} of {MAX_FILES} slots free</p>
        <button
          type="button"
          className="btn-primary mt-5 px-6 py-3.5 text-base"
          onClick={() => inputRef.current?.click()}
          disabled={slotsLeft <= 0 || saving}
        >
          Choose PDFs
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {notice && (
        <p role="status" className="flex items-start gap-2 rounded-2xl bg-warn-soft px-4 py-3 text-sm text-warn">
          <AlertTriangle size={18} className="mt-px shrink-0" />{notice}
        </p>
      )}

      {summary && (
        <div role="status" className="animate-rise flex flex-col gap-3 rounded-2xl bg-ok-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold text-ok">
            {[
              summary.saved && `${summary.saved} saved`,
              summary.updated && `${summary.updated} updated`,
              summary.skipped && `${summary.skipped} kept as before`,
              summary.failed && `${summary.failed} failed`,
            ].filter(Boolean).join(", ") || "Nothing to save."}
          </p>
          <Link href="/records" className="btn-outline">View records</Link>
        </div>
      )}

      {items.length > 0 && (
        <section aria-label="Selected sheets" className="space-y-3">
          {items.map((item) => (
            <FileRow
              key={item.id}
              item={item}
              onRemove={saving ? undefined : () => setItems((l) => l.filter((i) => i.id !== item.id))}
            />
          ))}

          <div className="sticky bottom-20 z-10 flex flex-col-reverse gap-3 rounded-2xl border border-line bg-white/95 p-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between md:bottom-4">
            <button className="btn-ghost" onClick={() => { setItems([]); setSummary(null); setNotice(null); }} disabled={saving}>
              Clear list
            </button>
            <button className="btn-primary px-6 py-3" onClick={saveAll} disabled={saving || readyCount === 0 || readingCount > 0}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {saving ? "Saving" : readingCount > 0 ? "Reading sheets" : `Save ${readyCount} result${readyCount === 1 ? "" : "s"}`}
            </button>
          </div>
        </section>
      )}

      <Modal
        open={!!pending}
        onClose={() => pending?.resolve("cancel", false)}
        title={pending ? `${titleCase(pending.incoming.subject)} on ${formatDate(pending.incoming.examDateISO)} is already saved` : ""}
      >
        {pending && (
          <>
            <p className="text-ink-soft">
              <span className="font-semibold text-ink">{pending.fileName}</span> has a result for the same subject and date.
              Update the saved record with this sheet, or cancel to keep it as it is.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Compare title="Saved" r={pending.existing} />
              <Compare title="From this sheet" r={pending.incoming} fresh />
            </div>
            {pending.remaining > 0 && (
              <label className="mt-5 flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#1E2A4A]"
                  checked={applyToRest}
                  onChange={(e) => setApplyToRest(e.target.checked)}
                />
                Do the same for other duplicates in this batch
              </label>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="btn-outline" onClick={() => pending.resolve("cancel", applyToRest)}>Cancel</button>
              <button className="btn-primary" onClick={() => pending.resolve("update", applyToRest)}>Update record</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

const STATUS_TEXT: Record<Status, string> = {
  reading: "Reading",
  ready: "Ready to save",
  error: "Not added",
  saving: "Saving",
  saved: "Saved",
  updated: "Updated",
  skipped: "Kept saved version",
  failed: "Save failed",
};

function FileRow({ item, onRemove }: { item: Item; onRemove?: () => void }) {
  const r = item.record;
  const done = ["saved", "updated"].includes(item.status);
  const bad = item.status === "error" || item.status === "failed";
  return (
    <article
      className={`animate-rise rounded-2xl border bg-white p-4 sm:p-5 ${
        bad ? "border-bad/30" : done ? "border-ok/30" : "border-line"
      }`}
    >
      <div className="flex items-center gap-3">
        <FileText size={18} className="shrink-0 text-ink-faint" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold" title={item.file.name}>{item.file.name}</p>
        <span
          className={`flex items-center gap-1.5 text-xs font-bold ${
            bad ? "text-bad" : done ? "text-ok" : item.status === "skipped" ? "text-absent" : "text-ink-soft"
          }`}
        >
          {(item.status === "reading" || item.status === "saving") && <Loader2 size={13} className="animate-spin" />}
          {done && <CheckCircle2 size={14} />}
          {STATUS_TEXT[item.status]}
        </span>
        {onRemove && !done && item.status !== "saving" && (
          <button className="rounded-lg p-1.5 text-ink-faint hover:bg-paper hover:text-ink" onClick={onRemove} aria-label={`Remove ${item.file.name}`}>
            {item.status === "error" ? <Trash2 size={16} /> : <X size={16} />}
          </button>
        )}
      </div>

      {item.error && <p className="mt-3 rounded-xl bg-bad-soft px-3.5 py-2.5 text-sm text-bad">{item.error}</p>}

      {r && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
          <GradeBadge grade={r.grade} size="lg" />
          <div className="min-w-[8rem]">
            <p className="font-display text-xl font-bold">{titleCase(r.subject)}</p>
            <p className="text-sm text-ink-faint">
              {formatDate(r.examDateISO)}{r.examType && `, ${r.examType}`}
            </p>
          </div>
          <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Stat label="Marks" value={r.isAbsent ? "Absent" : `${r.marks} / ${r.totalMarks}`} />
            {!r.isAbsent && <Stat label="Score" value={`${r.percentage}%`} />}
            {r.classStats.position && <Stat label="Position" value={`${ordinal(r.classStats.position)} of ${r.classStats.present}`} />}
            {r.remarks && <Stat label="Remarks" value={r.remarks} />}
          </dl>
        </div>
      )}

      {item.warning && (
        <p className="mt-3 flex items-start gap-2 text-sm text-warn">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          {item.warning} Check the Reg. ID on the Student page if this is wrong.
        </p>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}

function Compare({ title, r, fresh }: { title: string; r: ExtractedRecord; fresh?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 ${fresh ? "bg-marker-soft" : "bg-paper"}`}>
      <p className="text-xs font-bold text-ink-soft">{title}</p>
      <div className="mt-2 flex items-center gap-3">
        <GradeBadge grade={r.grade} />
        <div>
          <p className="font-display text-lg font-bold leading-tight">{r.isAbsent ? "Absent" : `${r.marks}/${r.totalMarks}`}</p>
          <p className="text-xs text-ink-faint">{r.examType || "No exam type"}{r.examNo && `, no. ${r.examNo}`}</p>
        </div>
      </div>
      {r.remarks && <p className="mt-2 text-sm text-ink-soft">{r.remarks}</p>}
    </div>
  );
}
