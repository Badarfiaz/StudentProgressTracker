import { formatDate, ordinal, pct, titleCase, gradeTone } from "./format";
import { buildInsights, performance, type Tone } from "./insights";
import { overallStats, subjectSummaries } from "./stats";
import type { ResultRecord, Student } from "./types";

type RGB = [number, number, number];
const INK: RGB = [30, 42, 74];
const SOFT: RGB = [74, 85, 115];
const FAINT: RGB = [138, 147, 168];
const LINE: RGB = [223, 227, 236];
const PAPER: RGB = [244, 246, 250];
const MARKER: RGB = [255, 216, 77];
const WHITE: RGB = [255, 255, 255];
const TONES: Record<Tone, { fg: RGB; bg: RGB }> = {
  ok: { fg: [23, 138, 94], bg: [227, 244, 236] },
  mid: { fg: [44, 111, 183], bg: [228, 238, 249] },
  warn: { fg: [183, 121, 31], bg: [251, 240, 220] },
  bad: { fg: [201, 60, 60], bg: [251, 230, 230] },
  absent: { fg: [107, 116, 137], bg: [236, 238, 243] },
};

/** Build and download a designed, multi-page PDF progress report (cards and bars, not tables). */
export async function downloadReport(records: ResultRecord[], student: Student, filterNote?: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210, H = 297, M = 14, CW = W - M * 2;
  let y = 0;

  const fill = (c: RGB) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: RGB) => doc.setDrawColor(c[0], c[1], c[2]);
  const ink = (c: RGB) => doc.setTextColor(c[0], c[1], c[2]);
  const text = (s: string, x: number, yy: number, size: number, c: RGB, bold = false, align: "left" | "right" | "center" = "left") => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    ink(c);
    doc.text(s, x, yy, { align });
  };
  const fit = (s: string, maxW: number, size: number, bold = false) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    let out = s;
    while (out.length > 1 && doc.getTextWidth(out) > maxW) out = out.slice(0, -2) + "...";
    return out;
  };
  const bar = (x: number, yy: number, w: number, value: number, color: RGB, classValue?: number | null) => {
    fill(PAPER);
    doc.roundedRect(x, yy, w, 2.6, 1.3, 1.3, "F");
    if (value > 0) {
      fill(color);
      doc.roundedRect(x, yy, Math.max(2.6, (w * Math.min(value, 100)) / 100), 2.6, 1.3, 1.3, "F");
    }
    if (classValue != null) {
      fill(MARKER);
      doc.rect(x + (w * classValue) / 100 - 0.4, yy - 1, 0.8, 4.6, "F");
    }
  };
  const section = (title: string, hint?: string) => {
    ensure(14);
    text(title, M, y + 4, 13, INK, true);
    if (hint) text(hint, W - M, y + 4, 8, FAINT, false, "right");
    fill(MARKER);
    doc.rect(M, y + 6.2, 10, 1.1, "F");
    y += 12;
  };
  function ensure(h: number) {
    if (y + h <= H - 16) return;
    doc.addPage();
    y = 16;
  }

  const stats = overallStats(records);
  const insights = buildInsights(records, student.fullName);
  const subjects = subjectSummaries(records);
  const latest = records[0];
  const classLine = latest
    ? [latest.className && `Class ${latest.className}${latest.section ? " " + latest.section : ""}`, latest.session && `Session ${latest.session}`]
        .filter(Boolean).join("   |   ")
    : "";

  // Header band
  fill(INK);
  doc.rect(0, 0, W, 46, "F");
  fill(MARKER);
  doc.rect(M, 12, 14, 1.4, "F");
  text("PROGRESS REPORT", M, 19, 8.5, MARKER, true);
  text(titleCase(student.fullName), M, 31, 23, WHITE, true);
  text(`Reg. ID ${student.regId}${classLine ? "   |   " + classLine : ""}`, M, 38.5, 9.5, [200, 207, 224]);
  text(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }), W - M, 19, 8.5, [200, 207, 224], false, "right");
  y = 56;

  // Key figures
  const figs: [string, string, string][] = [
    ["Average score", pct(stats.average), stats.classAverage !== null ? `Class ${pct(stats.classAverage)}` : "Tests sat"],
    ["Attendance", pct(stats.attendance), stats.absences ? `Missed ${stats.absences} of ${stats.total}` : "No tests missed"],
    ["Typical position", stats.averagePosition ? ordinal(Math.round(stats.averagePosition)) : "-", "In class"],
    ["Tests", String(stats.total), `${subjects.length} subject${subjects.length === 1 ? "" : "s"}`],
  ];
  const gap = 3, cw = (CW - gap * 3) / 4;
  figs.forEach(([label, value, note], i) => {
    const x = M + i * (cw + gap);
    fill(i === 0 ? [255, 243, 196] : PAPER);
    doc.roundedRect(x, y, cw, 25, 3, 3, "F");
    text(label, x + 4, y + 7, 8, SOFT, true);
    text(value, x + 4, y + 17, 18, INK, true);
    text(note, x + 4, y + 22, 7.5, FAINT);
  });
  y += 33;

  // At a glance
  if (insights) {
    const t = TONES[insights.tone];
    const lines = doc.splitTextToSize(insights.headline, CW - 12) as string[];
    const rowH = insights.points.length * 6.2;
    const boxH = 10 + lines.length * 6 + rowH + 4;
    ensure(boxH + 4);
    fill(t.bg);
    doc.roundedRect(M, y, CW, boxH, 3, 3, "F");
    fill(t.fg);
    doc.roundedRect(M, y, 1.8, boxH, 0.9, 0.9, "F");
    text("AT A GLANCE", M + 6, y + 7, 7.5, t.fg, true);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    ink(INK);
    doc.text(lines, M + 6, y + 14);
    let py = y + 14 + lines.length * 6 + 1;
    insights.points.forEach((p) => {
      fill(TONES[p.tone].fg);
      doc.circle(M + 7, py - 1, 1.1, "F");
      text(fit(p.text, CW - 18, 9), M + 11, py, 9, INK);
      py += 6.2;
    });
    y += boxH + 10;
  }

  // Subjects
  if (subjects.length) {
    section("Subjects", "Yellow tick marks the class average");
    subjects.forEach((s) => {
      ensure(13);
      const v = performance(s.average);
      text(fit(titleCase(s.subject), 46, 10, true), M, y + 3.5, 10, INK, true);
      text(`${s.exams} test${s.exams === 1 ? "" : "s"}`, M, y + 8, 7.5, FAINT);
      if (s.average !== null) {
        bar(M + 52, y + 1.6, 80, s.average, TONES[v.tone].fg, s.classAverage);
        text(`${Math.round(s.average)}%`, M + 138, y + 4, 11, INK, true, "right");
        fill(TONES[v.tone].bg);
        doc.roundedRect(W - M - 30, y - 0.6, 30, 6.4, 3.2, 3.2, "F");
        text(v.label, W - M - 15, y + 3.7, 8, TONES[v.tone].fg, true, "center");
      } else {
        text("Absent every time", M + 52, y + 4, 9, FAINT);
      }
      y += 12;
    });
    y += 4;
  }

  // Test cards
  section("Test results", filterNote);
  records.forEach((r) => {
    const h = 20;
    ensure(h + 3);
    const tone = TONES[gradeTone(r.grade)];
    fill(WHITE);
    stroke(LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(M, y, CW, h, 3, 3, "FD");
    fill(tone.bg);
    doc.roundedRect(M + 3.5, y + 3.5, 13, 13, 3, 3, "F");
    text(r.isAbsent ? "Absent" : r.grade, M + 10, y + 11.7, r.isAbsent ? 6.5 : 11, tone.fg, true, "center");

    text(fit(titleCase(r.subject), 70, 11, true), M + 21, y + 8, 11, INK, true);
    const meta = [formatDate(r.examDateISO), r.examType, r.remarks].filter(Boolean).join("  |  ");
    text(fit(meta, 90, 8), M + 21, y + 13.5, 8, FAINT);

    if (r.isAbsent) {
      text("Absent", W - M - 5, y + 11.5, 12, TONES.absent.fg, true, "right");
    } else {
      text(`${r.percentage}%`, W - M - 5, y + 9, 15, INK, true, "right");
      text(`${r.marks} / ${r.totalMarks}`, W - M - 5, y + 14.5, 8.5, SOFT, false, "right");
      bar(M + 21, y + 15.6, 80, r.percentage ?? 0, tone.fg, r.classStats?.classAverage);
      const extra = r.classStats?.position ? `${ordinal(r.classStats.position)} of ${r.classStats.present}` : "";
      if (extra) text(extra, M + 106, y + 17.6, 8, SOFT, true);
    }
    y += h + 3;
  });

  // Footer on every page
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    stroke(LINE);
    doc.line(M, H - 12, W - M, H - 12);
    text("Progress Diary", M, H - 7, 8, FAINT, true);
    text(`Page ${i} of ${pages}`, W - M, H - 7, 8, FAINT, false, "right");
  }

  doc.save(`${student.fullName.trim().replace(/\s+/g, "-").toLowerCase()}-progress-report.pdf`);
}
