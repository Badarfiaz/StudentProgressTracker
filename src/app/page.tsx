"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarX2, FileUp, Minus } from "lucide-react";
import { useStudent } from "@/components/StudentProvider";
import { GradeBadge } from "@/components/GradeBadge";
import { formatDate, ordinal, pct, titleCase } from "@/lib/format";
import { gradeDistribution, overallStats, subjectSummaries, trendSeries } from "@/lib/stats";

const TrendChart = dynamic(() => import("@/components/Charts").then((m) => m.TrendChart), { ssr: false });
const SubjectCompareChart = dynamic(() => import("@/components/Charts").then((m) => m.SubjectCompareChart), { ssr: false });

export default function OverviewPage() {
  const { student, records } = useStudent();
  const stats = useMemo(() => overallStats(records), [records]);
  const subjects = useMemo(() => subjectSummaries(records), [records]);
  const grades = useMemo(() => gradeDistribution(records), [records]);
  const trend = useMemo(() => trendSeries(records), [records]);
  const latest = records[0];
  const absences = records.filter((r) => r.isAbsent).slice(0, 5);

  if (!student) return null;

  const classLine = latest
    ? [latest.className && `Class ${latest.className}${latest.section ? ` ${latest.section}` : ""}`, latest.session && `Session ${latest.session}`]
        .filter(Boolean)
        .join(", ")
    : "";

  return (
    <div className="space-y-8">
      {/* Hero: the student, and their newest grades as a report strip */}
      <section className="animate-rise">
        <p className="text-sm font-semibold text-ink-soft">
          Reg. ID {student.regId}
          {classLine && <span className="text-ink-faint">, {classLine}</span>}
        </p>
        <h1 className="mt-1 text-[clamp(2rem,6vw,3.75rem)] font-extrabold leading-[1.02]">
          {titleCase(student.fullName)}
        </h1>

        {records.length > 0 ? (
          <div className="mt-6 -mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
            <ol className="flex min-w-max gap-2.5" aria-label="Latest results">
              {records.slice(0, 6).map((r) => (
                <li key={r.id} className="flex items-center gap-3 rounded-2xl border border-line bg-white py-2.5 pl-2.5 pr-4">
                  <GradeBadge grade={r.grade} />
                  <div className="leading-tight">
                    <p className="text-sm font-bold">{titleCase(r.subject)}</p>
                    <p className="text-xs text-ink-faint">
                      {r.isAbsent ? "Absent" : `${r.marks}/${r.totalMarks}`}, {formatDate(r.examDateISO, false)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          <div className="panel mt-8 flex flex-col items-start gap-4 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">No results saved yet</h2>
              <p className="mt-1 text-ink-soft">Add a result sheet from school and the overview fills in here.</p>
            </div>
            <Link href="/upload" className="btn-primary"><FileUp size={16} />Add results</Link>
          </div>
        )}
      </section>

      {records.length > 0 && (
        <>
          {/* Key numbers: one panel, divided, not four separate cards */}
          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
            <Figure
              label="Average score"
              value={pct(stats.average)}
              note={stats.classAverage !== null ? `Class average ${pct(stats.classAverage)}` : "Across tests sat"}
              highlight
            />
            <Figure
              label="Attendance"
              value={pct(stats.attendance)}
              note={stats.absences ? `Missed ${stats.absences} of ${stats.total} tests` : "No tests missed"}
            />
            <Figure
              label="Typical position"
              value={stats.averagePosition ? ordinal(Math.round(stats.averagePosition)) : "–"}
              note={stats.sat ? `At or above class average in ${stats.beatClass} of ${stats.sat}` : "No tests sat yet"}
            />
            <Figure label="Tests recorded" value={String(stats.total)} note={`${subjects.length} subject${subjects.length === 1 ? "" : "s"}`} />
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="panel p-5 sm:p-6">
              <Heading title="Scores over time" hint="Dashed line is the class average" />
              {trend.length >= 1 ? <TrendChart data={trend} /> : <Quiet>Scores appear after the first test sat.</Quiet>}
            </div>
            <div className="panel p-5 sm:p-6">
              <Heading title="Compared with the class" hint="Average percentage per subject" />
              {subjects.some((s) => s.average !== null) ? (
                <SubjectCompareChart subjects={subjects} />
              ) : (
                <Quiet>No subject averages yet.</Quiet>
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="panel overflow-hidden">
              <div className="p-5 pb-3 sm:p-6 sm:pb-3">
                <Heading title="Subjects" hint="Strongest first. Open one to see every test." />
              </div>
              <ul className="divide-y divide-line">
                {subjects.map((s) => (
                  <li key={s.subjectKey}>
                    <Link
                      href={`/records?subject=${encodeURIComponent(s.subjectKey)}`}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-paper sm:grid-cols-[10rem_1fr_auto] sm:px-6"
                    >
                      <div>
                        <p className="font-bold">{titleCase(s.subject)}</p>
                        <p className="text-xs text-ink-faint">
                          {s.exams} test{s.exams === 1 ? "" : "s"}
                          {s.absences > 0 && `, ${s.absences} missed`}
                        </p>
                      </div>
                      <ScoreBar value={s.average} classValue={s.classAverage} />
                      <div className="flex items-center gap-2 max-sm:col-start-2 max-sm:row-start-1">
                        <Change value={s.change} />
                        <GradeBadge grade={s.latest.grade} size="sm" />
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-6">
              <div className="panel p-5 sm:p-6">
                <Heading title="Grades received" />
                <ul className="mt-4 space-y-2.5">
                  {grades.map((g) => (
                    <li key={g.grade} className="flex items-center gap-3">
                      <GradeBadge grade={g.grade} size="sm" />
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-paper">
                        <div
                          className={`h-full rounded-full ${g.grade === "AB" ? "bg-absent/50" : g.grade === "F" ? "bg-bad" : "bg-ink"}`}
                          style={{ width: `${(g.count / records.length) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-sm font-bold">{g.count}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="panel p-5 sm:p-6">
                <Heading title="Missed tests" />
                {absences.length ? (
                  <ul className="mt-3 divide-y divide-line">
                    {absences.map((r) => (
                      <li key={r.id} className="flex items-center gap-3 py-2.5">
                        <CalendarX2 size={18} className="text-absent" />
                        <span className="flex-1 font-semibold">{titleCase(r.subject)}</span>
                        <span className="text-sm text-ink-faint">{formatDate(r.examDateISO)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Quiet>Present for every recorded test.</Quiet>
                )}
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Figure({ label, value, note, highlight }: { label: string; value: string; note: string; highlight?: boolean }) {
  return (
    <div className="bg-white p-5 sm:p-6">
      <p className="text-sm font-semibold text-ink-soft">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
        <span className={highlight ? "marked" : ""}>{value}</span>
      </p>
      <p className="mt-1 text-xs text-ink-faint sm:text-sm">{note}</p>
    </div>
  );
}

function Heading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-2">
      <h2 className="text-lg font-bold">{title}</h2>
      {hint && <p className="text-sm text-ink-faint">{hint}</p>}
    </div>
  );
}

function Quiet({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-ink-faint">{children}</p>;
}

function ScoreBar({ value, classValue }: { value: number | null; classValue: number | null }) {
  if (value === null) return <p className="col-span-2 text-sm text-ink-faint sm:col-span-1">Absent every time</p>;
  return (
    <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
      <div className="relative h-2.5 flex-1 rounded-full bg-paper">
        <div className="h-full rounded-full bg-ink" style={{ width: `${value}%` }} />
        {classValue !== null && (
          <span
            className="absolute -top-1 h-[18px] w-0.5 rounded bg-marker ring-2 ring-white"
            style={{ left: `${classValue}%` }}
            title={`Class average ${classValue.toFixed(0)}%`}
          />
        )}
      </div>
      <span className="w-11 text-right font-display font-bold">{value.toFixed(0)}%</span>
    </div>
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null) return null;
  const v = Math.round(value);
  if (v === 0) return <Minus size={16} className="text-ink-faint" aria-label="No change" />;
  const up = v > 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`flex items-center text-xs font-bold ${up ? "text-ok" : "text-bad"}`} title="Change since previous test">
      <Icon size={15} />
      {Math.abs(v)}
    </span>
  );
}
