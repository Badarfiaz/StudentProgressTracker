"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Download, FileUp, Loader2, Search, Trash2, X } from "lucide-react";
import { useStudent } from "@/components/StudentProvider";
import { useAuth } from "@/components/AuthProvider";
import { GradeBadge } from "@/components/GradeBadge";
import { Modal } from "@/components/Modal";
import { deleteRecord } from "@/lib/records";
import { downloadReport } from "@/lib/export";
import { performance } from "@/lib/insights";
import { formatDate, formatMonth, monthKey, ordinal, pct, titleCase } from "@/lib/format";
import type { ResultRecord } from "@/lib/types";

type Attendance = "all" | "sat" | "absent";
type Sort = "newest" | "oldest" | "highest" | "lowest";

export default function RecordsPage() {
  return (
    <Suspense>
      <Records />
    </Suspense>
  );
}

function Records() {
  const { student, records } = useStudent();
  const { isAdmin } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const [q, setQ] = useState("");
  const subject = params.get("subject") ?? "all";
  const [attendance, setAttendance] = useState<Attendance>("all");
  const [month, setMonth] = useState("all");
  const [sort, setSort] = useState<Sort>("newest");
  const [openId, setOpenId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<ResultRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [making, setMaking] = useState(false);

  const setSubject = (key: string) => {
    const sp = new URLSearchParams(params.toString());
    if (key === "all") sp.delete("subject");
    else sp.set("subject", key);
    router.replace(`/records${sp.size ? `?${sp}` : ""}`, { scroll: false });
  };

  const subjects = useMemo(() => {
    const m = new Map<string, string>();
    records.forEach((r) => m.set(r.subjectKey, r.subject));
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [records]);

  const months = useMemo(
    () => [...new Set(records.map((r) => monthKey(r.examDateISO)))].sort().reverse(),
    [records],
  );

  const filtered = useMemo(() => {
    const terms = q.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const list = records.filter((r) => {
      if (subject !== "all" && r.subjectKey !== subject) return false;
      if (attendance === "sat" && r.isAbsent) return false;
      if (attendance === "absent" && !r.isAbsent) return false;
      if (month !== "all" && monthKey(r.examDateISO) !== month) return false;
      if (!terms.length) return true;
      const hay = [
        r.subject, r.examType, r.grade, r.remarks, r.examNo, r.examDate, formatDate(r.examDateISO), r.month,
        r.isAbsent ? "absent" : "present",
      ].join(" ").toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
    const score = (r: ResultRecord) => (r.isAbsent ? -1 : r.percentage ?? -1);
    return list.sort((a, b) => {
      if (sort === "oldest") return a.examDateISO.localeCompare(b.examDateISO);
      if (sort === "highest") return score(b) - score(a) || b.examDateISO.localeCompare(a.examDateISO);
      if (sort === "lowest") return score(a) - score(b) || b.examDateISO.localeCompare(a.examDateISO);
      return b.examDateISO.localeCompare(a.examDateISO);
    });
  }, [records, q, subject, attendance, month, sort]);

  const groups = useMemo(() => {
    if (sort === "highest" || sort === "lowest") return [{ key: "", items: filtered }];
    const out: { key: string; items: ResultRecord[] }[] = [];
    for (const r of filtered) {
      const k = monthKey(r.examDateISO);
      const last = out[out.length - 1];
      if (last?.key === k) last.items.push(r);
      else out.push({ key: k, items: [r] });
    }
    return out;
  }, [filtered, sort]);

  const sat = filtered.filter((r) => !r.isAbsent && r.percentage !== null);
  const avg = sat.length ? sat.reduce((a, r) => a + r.percentage!, 0) / sat.length : null;
  const hasFilters = q || subject !== "all" || attendance !== "all" || month !== "all";

  async function confirmDelete() {
    if (!toDelete || !student || !isAdmin) return;
    setDeleting(true);
    try {
      await deleteRecord(student.regId, toDelete.id);
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  async function makePdf() {
    if (!student) return;
    setMaking(true);
    try {
      const note = hasFilters ? "Filtered view" : undefined;
      await downloadReport(filtered, student, note);
    } finally {
      setMaking(false);
    }
  }

  if (!student) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">All tests</h1>
          <p className="mt-1 text-ink-soft">Every saved test for {titleCase(student.fullName)}.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={makePdf} disabled={!filtered.length || making}>
            {making ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}Download PDF
          </button>
          <Link href="/upload" className="btn-outline"><FileUp size={16} />Add results</Link>
        </div>
      </header>

      <div className="panel space-y-3 p-3 sm:p-4">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            className="field pl-11"
            placeholder="Search subject, grade, remarks, exam type or date"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search records"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Select label="Subject" value={subject} onChange={setSubject}>
            <option value="all">All subjects</option>
            {subjects.map(([k, name]) => <option key={k} value={k}>{titleCase(name)}</option>)}
          </Select>
          <Select label="Month" value={month} onChange={setMonth}>
            <option value="all">Any month</option>
            {months.map((m) => <option key={m} value={m}>{formatMonth(m)}</option>)}
          </Select>
          <Select label="Attendance" value={attendance} onChange={(v) => setAttendance(v as Attendance)}>
            <option value="all">Sat and absent</option>
            <option value="sat">Sat the test</option>
            <option value="absent">Absent</option>
          </Select>
          <Select label="Sort" value={sort} onChange={(v) => setSort(v as Sort)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest score</option>
            <option value="lowest">Lowest score</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="text-ink-soft" aria-live="polite">
          <span className="font-bold text-ink">{filtered.length}</span> result{filtered.length === 1 ? "" : "s"}
          {avg !== null && <>, averaging <span className="font-bold text-ink">{pct(avg)}</span></>}
          {filtered.length - sat.length > 0 && <>, {filtered.length - sat.length} absent</>}
        </p>
        {hasFilters && (
          <button
            className="btn-ghost px-2.5 py-1.5"
            onClick={() => { setQ(""); setSubject("all"); setAttendance("all"); setMonth("all"); }}
          >
            <X size={14} />Clear filters
          </button>
        )}
      </div>

      {records.length === 0 ? (
        <div className="panel p-10 text-center">
          <h2 className="text-xl font-bold">No records yet</h2>
          <p className="mt-1 text-ink-soft">Results appear here once a sheet is added.</p>
          <Link href="/upload" className="btn-primary mt-5"><FileUp size={16} />Add results</Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="panel p-10 text-center">
          <h2 className="text-lg font-bold">Nothing matches these filters</h2>
          <p className="mt-1 text-ink-soft">Try a different search or clear the filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key || "all"}>
              {g.key && <h2 className="mb-2 px-1 text-sm font-bold text-ink-soft">{formatMonth(g.key)}</h2>}
              <ul className="panel divide-y divide-line overflow-hidden">
                {g.items.map((r) => (
                  <RecordRow
                    key={r.id}
                    r={r}
                    open={openId === r.id}
                    onToggle={() => setOpenId(openId === r.id ? null : r.id)}
                    onDelete={isAdmin ? () => setToDelete(r) : undefined}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Modal open={!!toDelete} onClose={() => setToDelete(null)} title="Delete this record?">
        {toDelete && (
          <>
            <p className="text-ink-soft">
              {titleCase(toDelete.subject)} on {formatDate(toDelete.examDateISO)} will be removed. You can add it back
              by uploading the sheet again.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button className="btn-outline" onClick={() => setToDelete(null)}>Cancel</button>
              <button className="btn bg-bad text-white hover:bg-bad/90" onClick={confirmDelete} disabled={deleting}>
                <Trash2 size={16} />Delete record
              </button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

function Select({
  label, value, onChange, children,
}: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <select
        className="field cursor-pointer appearance-none pr-9 text-sm font-semibold"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint" />
    </label>
  );
}

function RecordRow({
  r, open, onToggle, onDelete,
}: { r: ResultRecord; open: boolean; onToggle: () => void; onDelete?: () => void }) {
  const cs = r.classStats;
  const vsClass = !r.isAbsent && cs?.classAverage != null && r.percentage != null ? r.percentage - cs.classAverage : null;
  return (
    <li>
      <button
        onClick={onToggle}
        aria-expanded={open}
        className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-paper sm:grid-cols-[auto_1fr_8rem_6rem_auto] sm:px-5"
      >
        <GradeBadge grade={r.grade} />
        <div className="min-w-0">
          <p className="truncate font-bold">{titleCase(r.subject)}</p>
          <p className="truncate text-sm text-ink-faint">
            {formatDate(r.examDateISO)}{r.examType && `, ${r.examType}`}{r.remarks && `, ${r.remarks}`}
          </p>
          {!r.isAbsent && r.percentage != null && (
            <p className={`text-xs font-bold ${{ ok: "text-ok", mid: "text-mid", warn: "text-warn", bad: "text-bad", absent: "text-absent" }[performance(r.percentage).tone]}`}>
              {performance(r.percentage).label}
            </p>
          )}
        </div>
        <p className="hidden text-sm sm:block">
          {r.isAbsent ? <span className="text-absent">Absent</span> : <><span className="font-bold">{r.marks}</span><span className="text-ink-faint"> / {r.totalMarks}</span></>}
        </p>
        <p className="hidden font-display text-lg font-bold sm:block">{r.isAbsent ? "–" : `${r.percentage}%`}</p>
        <span className="flex items-center gap-2">
          <span className="font-display font-bold sm:hidden">{r.isAbsent ? "AB" : `${r.percentage}%`}</span>
          <ChevronDown size={18} className={`text-ink-faint transition-transform ${open ? "rotate-180" : ""}`} />
        </span>
      </button>

      {open && (
        <div className="animate-rise border-t border-dashed border-line bg-paper/60 px-4 py-4 sm:px-5">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
            <Detail label="Marks" value={r.isAbsent ? "Absent" : `${r.marks} of ${r.totalMarks}`} />
            <Detail label="Position" value={cs?.position ? `${ordinal(cs.position)} of ${cs.present} who sat` : "–"} />
            <Detail
              label="Class average"
              value={cs?.classAverage != null ? `${pct(cs.classAverage, 1)}${vsClass !== null ? ` (${vsClass >= 0 ? "+" : ""}${vsClass.toFixed(0)})` : ""}` : "–"}
            />
            <Detail label="Top marks in class" value={cs?.highestMarks != null ? `${cs.highestMarks} / ${r.totalMarks}` : "–"} />
            <Detail label="Class attendance" value={cs ? `${cs.present} of ${cs.totalStudents} sat` : "–"} />
            <Detail label="Exam" value={[r.examType, r.examNo && `no. ${r.examNo}`].filter(Boolean).join(", ") || "–"} />
            <Detail label="Class" value={[r.className, r.section].filter(Boolean).join(" ") || "–"} />
            <Detail label="Session" value={r.session || "–"} />
          </dl>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <p className="text-xs text-ink-faint">
              From {r.sourceFileName ?? "an uploaded sheet"}
              {r.updatedAt && `, saved ${new Date(r.updatedAt).toLocaleDateString()}`}
            </p>
            {onDelete && (
              <button className="btn-ghost px-2.5 py-1.5 text-bad hover:bg-bad-soft" onClick={onDelete}>
                <Trash2 size={14} />Delete
              </button>
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
