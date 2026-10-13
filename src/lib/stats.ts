import type { ResultRecord } from "./types";

export interface SubjectSummary {
  subject: string;
  subjectKey: string;
  exams: number;
  absences: number;
  average: number | null;
  classAverage: number | null;
  best: number | null;
  latest: ResultRecord;
  /** latest percentage minus the previous sat exam's percentage */
  change: number | null;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const sat = (rs: ResultRecord[]) => rs.filter((r) => !r.isAbsent && r.percentage !== null);

export function overallStats(records: ResultRecord[]) {
  const present = sat(records);
  const absences = records.length - records.filter((r) => !r.isAbsent).length;
  const positions = present.map((r) => r.classStats?.position).filter((p): p is number => !!p);
  const beatClass = present.filter(
    (r) => r.classStats?.classAverage != null && r.percentage! >= r.classStats.classAverage,
  ).length;
  const failed = present.filter((r) => r.grade === "F").length;

  return {
    total: records.length,
    sat: present.length,
    absences,
    attendance: records.length ? ((records.length - absences) / records.length) * 100 : null,
    average: mean(present.map((r) => r.percentage!)),
    classAverage: mean(present.map((r) => r.classStats?.classAverage).filter((n): n is number => n != null)),
    averagePosition: mean(positions),
    beatClass,
    failed,
  };
}

export function subjectSummaries(records: ResultRecord[]): SubjectSummary[] {
  const groups = new Map<string, ResultRecord[]>();
  for (const r of records) {
    const list = groups.get(r.subjectKey) ?? [];
    list.push(r);
    groups.set(r.subjectKey, list);
  }
  return [...groups.values()]
    .map((list) => {
      const sorted = [...list].sort((a, b) => b.examDateISO.localeCompare(a.examDateISO));
      const present = sat(sorted);
      return {
        subject: sorted[0].subject,
        subjectKey: sorted[0].subjectKey,
        exams: sorted.length,
        absences: sorted.filter((r) => r.isAbsent).length,
        average: mean(present.map((r) => r.percentage!)),
        classAverage: mean(present.map((r) => r.classStats?.classAverage).filter((n): n is number => n != null)),
        best: present.length ? Math.max(...present.map((r) => r.percentage!)) : null,
        latest: sorted[0],
        change: present.length >= 2 ? present[0].percentage! - present[1].percentage! : null,
      };
    })
    .sort((a, b) => (b.average ?? -1) - (a.average ?? -1));
}

export function gradeDistribution(records: ResultRecord[]) {
  const counts = new Map<string, number>();
  for (const r of records) counts.set(r.grade, (counts.get(r.grade) ?? 0) + 1);
  const order = ["A+", "A", "B+", "B", "C+", "C", "D", "E", "F", "AB"];
  return [...counts.entries()]
    .sort(([a], [b]) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    })
    .map(([grade, count]) => ({ grade, count }));
}

export function trendSeries(records: ResultRecord[]) {
  return sat(records)
    .sort((a, b) => a.examDateISO.localeCompare(b.examDateISO))
    .map((r) => ({
      date: r.examDateISO,
      percentage: r.percentage!,
      classAverage: r.classStats?.classAverage ?? null,
      subject: r.subject,
      grade: r.grade,
    }));
}
