import { overallStats, subjectSummaries } from "./stats";
import { titleCase } from "./format";
import type { ResultRecord } from "./types";

export type Tone = "ok" | "mid" | "warn" | "bad" | "absent";

/** Plain-language band for a percentage, so parents don't have to decode grades. */
export function performance(p: number | null | undefined): { label: string; tone: Tone } {
  if (p === null || p === undefined || Number.isNaN(p)) return { label: "No score", tone: "absent" };
  if (p >= 85) return { label: "Excellent", tone: "ok" };
  if (p >= 70) return { label: "Good", tone: "mid" };
  if (p >= 50) return { label: "Fair", tone: "warn" };
  return { label: "Needs help", tone: "bad" };
}

export interface Insights {
  firstName: string;
  headline: string;
  tone: Tone;
  points: { tone: Tone; text: string }[];
  strongest: { subject: string; average: number } | null;
  weakest: { subject: string; average: number } | null;
  /** Average of the latest three tests minus the three before; null if fewer than four tests */
  momentum: number | null;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function buildInsights(records: ResultRecord[], fullName: string): Insights | null {
  const stats = overallStats(records);
  if (stats.average === null) return null;

  const firstName = titleCase(fullName).split(" ")[0] || "Your child";
  const subjects = subjectSummaries(records).filter((s) => s.average !== null);
  const strongest = subjects[0] ? { subject: subjects[0].subject, average: subjects[0].average! } : null;
  const last = subjects[subjects.length - 1];
  const weakest = subjects.length > 1 && last ? { subject: last.subject, average: last.average! } : null;

  const sat = records
    .filter((r) => !r.isAbsent && r.percentage !== null)
    .sort((a, b) => b.examDateISO.localeCompare(a.examDateISO));
  const recent = mean(sat.slice(0, 3).map((r) => r.percentage!));
  const before = mean(sat.slice(3, 6).map((r) => r.percentage!));
  const momentum = sat.length >= 4 && recent !== null && before !== null ? recent - before : null;

  const perf = performance(stats.average);
  const vsClass = stats.classAverage !== null ? stats.average - stats.classAverage : null;

  let headline: string;
  if (perf.tone === "ok") headline = `${firstName} is doing excellently, averaging ${Math.round(stats.average)}%.`;
  else if (perf.tone === "mid") headline = `${firstName} is doing well, averaging ${Math.round(stats.average)}%.`;
  else if (perf.tone === "warn") headline = `${firstName} is managing, averaging ${Math.round(stats.average)}%, with room to grow.`;
  else headline = `${firstName} needs some extra support, averaging ${Math.round(stats.average)}%.`;

  const points: Insights["points"] = [];
  if (vsClass !== null) {
    const d = Math.round(Math.abs(vsClass));
    if (d < 2) points.push({ tone: "mid", text: "Right in line with the class average." });
    else if (vsClass > 0) points.push({ tone: "ok", text: `${d} points above the class average.` });
    else points.push({ tone: "warn", text: `${d} points below the class average.` });
  }
  if (momentum !== null) {
    const m = Math.round(Math.abs(momentum));
    if (m < 2) points.push({ tone: "mid", text: "Recent tests are steady compared with earlier ones." });
    else if (momentum > 0) points.push({ tone: "ok", text: `Recent tests are up ${m} points on earlier ones. Keep it going.` });
    else points.push({ tone: "warn", text: `Recent tests are down ${m} points on earlier ones. Worth a chat.` });
  }
  if (strongest) points.push({ tone: "ok", text: `Strongest subject: ${titleCase(strongest.subject)} (${Math.round(strongest.average)}%).` });
  if (weakest && weakest.average < 70) {
    points.push({ tone: weakest.average < 50 ? "bad" : "warn", text: `Needs most attention: ${titleCase(weakest.subject)} (${Math.round(weakest.average)}%).` });
  }
  if (stats.absences > 0) {
    points.push({ tone: "warn", text: `Missed ${stats.absences} test${stats.absences === 1 ? "" : "s"}. Absences are left out of the averages.` });
  }
  if (stats.failed > 0) {
    points.push({ tone: "bad", text: `${stats.failed} test${stats.failed === 1 ? "" : "s"} below the pass mark (grade F).` });
  }

  return { firstName, headline, tone: perf.tone, points, strongest, weakest, momentum };
}
