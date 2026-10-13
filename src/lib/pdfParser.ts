import type { ClassStats, ExtractedRecord, PdfTextItem, Student } from "./types";

/**
 * Pure parsing logic for "Subject Result" sheets. It works on positioned text
 * items because the PDF stores the table column by column, not row by row:
 * rows are rebuilt from matching y positions, and columns from matching x
 * positions against the table header (Sr.#, Reg.ID, Student Name ...).
 */

const COLUMN_HEADERS = {
  sr: "Sr.#",
  reg: "Reg.ID",
  name: "Student Name",
  marks: "Marks",
  pct: "%age",
  grade: "Grade",
  remarks: "Remarks",
} as const;
type ColumnKey = keyof typeof COLUMN_HEADERS;

const FIELD_LABELS = [
  "Exam Type",
  "Class Teacher",
  "Subject",
  "Class",
  "Section",
  "Session",
  "Exam Date",
  "Exam No",
  "For the Month",
  "Lesson Ref.",
  "Total Marks",
] as const;
type FieldLabel = (typeof FIELD_LABELS)[number];

const ROW_TOLERANCE = 4.5; // table rows are ~13.5pt apart
const LINE_TOLERANCE = 5;

export class ParseError extends Error {}

const clean = (s: string) => s.replace(/\s+/g, " ").trim();
const center = (it: PdfTextItem) => it.x + it.w / 2;

export function normalizeName(name: string) {
  return name.toUpperCase().replace(/[^A-Z]/g, "");
}

/** Strips stray markers printed after names (^, !, /). */
export function tidyName(name: string) {
  return clean(name.replace(/[^A-Za-z\s.'-]/g, " "));
}

export function subjectKeyOf(subject: string) {
  return subject.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function toNumber(s: string | undefined): number | null {
  if (!s) return null;
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export function toISODate(raw: string): string {
  const m = raw.match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (!m) return "";
  const [, d, mo, yRaw] = m;
  const y = yRaw.length === 2 ? `20${yRaw}` : yRaw;
  return `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

type Row = Record<ColumnKey, string>;

interface PageTable {
  page: number;
  headerY: number;
  rows: Row[];
}

function readTable(items: PdfTextItem[], page: number): PageTable | null {
  const find = (label: string) => items.find((i) => clean(i.str) === label);
  const columns = {} as Partial<Record<ColumnKey, number>>;
  let headerY: number | null = null;

  for (const k of Object.keys(COLUMN_HEADERS) as ColumnKey[]) {
    const h = find(COLUMN_HEADERS[k]);
    if (h) {
      columns[k] = center(h);
      if (k === "reg") headerY = h.y;
    }
  }
  if (headerY === null || columns.name === undefined || columns.grade === undefined) return null;

  const colKeys = Object.keys(columns) as ColumnKey[];
  const nearestColumn = (it: PdfTextItem): ColumnKey => {
    const c = center(it);
    let best = colKeys[0];
    for (const k of colKeys) {
      if (Math.abs(columns[k]! - c) < Math.abs(columns[best]! - c)) best = k;
    }
    return best;
  };

  const top = headerY;
  const body = items.filter((i) => i.y < top - 3 && clean(i.str) !== "");
  const anchors = body.filter((i) => /^\d+$/.test(clean(i.str)) && nearestColumn(i) === "reg");

  const rows = anchors.map((anchor) => {
    const row: Row = { sr: "", reg: "", name: "", marks: "", pct: "", grade: "", remarks: "" };
    body
      .filter((i) => Math.abs(i.y - anchor.y) <= ROW_TOLERANCE)
      .sort((a, b) => a.x - b.x)
      .forEach((cell) => {
        const k = nearestColumn(cell);
        row[k] = clean(`${row[k]} ${cell.str}`);
      });
    row.reg = clean(anchor.str);
    return row;
  });

  return { page, headerY, rows };
}

function readHeaderFields(items: PdfTextItem[], tableHeaderY: number) {
  const top = items.filter((i) => i.y > tableHeaderY + 3);
  const labels = top.filter((i) => (FIELD_LABELS as readonly string[]).includes(clean(i.str)));
  const labelSet = new Set(labels);
  const out: Partial<Record<FieldLabel, string>> = {};

  for (const label of labels) {
    const name = clean(label.str) as FieldLabel;
    const labelEnd = label.x + label.w - 1;
    const nextLabelX = Math.min(
      Infinity,
      ...labels
        .filter((l) => l !== label && Math.abs(l.y - label.y) <= LINE_TOLERANCE && l.x > label.x)
        .map((l) => l.x),
    );
    const value = top
      .filter(
        (i) =>
          !labelSet.has(i) &&
          Math.abs(i.y - label.y) <= LINE_TOLERANCE &&
          i.x >= labelEnd &&
          i.x < nextLabelX,
      )
      .sort((a, b) => a.x - b.x)
      .map((i) => i.str)
      .join(" ");
    if (out[name] === undefined) out[name] = clean(value);
  }
  return out;
}

/** Rebuilds visual lines; used as a regex fallback when positions are unusual. */
function linesOf(items: PdfTextItem[]) {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: PdfTextItem[][] = [];
  for (const it of sorted) {
    const line = lines.find((l) => Math.abs(l[0].y - it.y) <= 3);
    if (line) line.push(it);
    else lines.push([it]);
  }
  return lines.map((l) => clean(l.sort((a, b) => a.x - b.x).map((i) => i.str).join(" ")));
}

function computeClassStats(rows: Row[], studentMarks: number | null, studentAbsent: boolean): ClassStats {
  const sat = rows.filter((r) => r.grade.toUpperCase().replace(/\s/g, "") !== "AB");
  const marks = sat.map((r) => toNumber(r.marks)).filter((n): n is number => n !== null);
  const pcts = sat.map((r) => toNumber(r.pct)).filter((n): n is number => n !== null);
  const failed = sat.filter((r) => r.grade.toUpperCase().trim() === "F").length;
  return {
    totalStudents: rows.length,
    present: sat.length,
    absent: rows.length - sat.length,
    passed: sat.length - failed,
    failed,
    classAverage: pcts.length ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10 : null,
    highestMarks: marks.length ? Math.max(...marks) : null,
    position: studentAbsent || studentMarks === null ? null : 1 + marks.filter((m) => m > studentMarks).length,
  };
}

export function parseResultSheet(items: PdfTextItem[], student: Student): ExtractedRecord {
  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
  const tables = pages
    .map((p) => readTable(items.filter((i) => i.page === p), p))
    .filter((t): t is PageTable => t !== null);

  if (!tables.length) {
    throw new ParseError("This file isn't a subject result sheet. No Reg.ID and Student Name table was found.");
  }

  const allRows = tables.flatMap((t) => t.rows);
  const regId = student.regId.trim();
  const row = allRows.find((r) => r.reg === regId);
  if (!row) throw new ParseError(`Reg. ID ${regId} isn't listed in this sheet.`);

  const headerPage = items.filter((i) => i.page === tables[0].page);
  const fields = readHeaderFields(headerPage, tables[0].headerY);
  const lines = linesOf(headerPage);
  const fromLines = (re: RegExp) => {
    for (const l of lines) {
      const m = l.match(re);
      if (m) return clean(m[1]);
    }
    return "";
  };

  const examDate = fields["Exam Date"] || fromLines(/Exam Date\s*:?\s*(\d{1,2}[.\/-]\d{1,2}[.\/-]\d{2,4})/i);
  const subject = fields["Subject"] || fromLines(/^Subject\s+([A-Za-z][A-Za-z .&-]+?)(?:\s+For the Month|$)/i);
  const examDateISO = toISODate(examDate);

  if (!subject) throw new ParseError("The subject couldn't be read from this sheet.");
  if (!examDateISO) throw new ParseError("The exam date couldn't be read from this sheet.");

  const grade = row.grade.toUpperCase().replace(/\s+/g, "");
  const isAbsent = grade === "AB";
  const marks = isAbsent ? null : toNumber(row.marks);

  return {
    regId,
    studentName: tidyName(row.name) || student.fullName,
    srNo: row.sr,
    school: lines.find((l) => /SCHOOL|ACADEMY|COLLEGE/i.test(l)) ?? "",
    subject: clean(subject).toUpperCase(),
    subjectKey: subjectKeyOf(subject),
    examType: fields["Exam Type"] || fromLines(/Exam Type\s+(\S+)/i),
    examNo: fields["Exam No"] || fromLines(/Exam No\s+(\d+)/i),
    examDate,
    examDateISO,
    month: (fields["For the Month"] || "").replace(/\s*-\s*/g, " "),
    className: fields["Class"] || "",
    section: fields["Section"] || "",
    session: fields["Session"] || "",
    classTeacher: fields["Class Teacher"] || "",
    lessonRef: fields["Lesson Ref."] || "",
    totalMarks: toNumber(fields["Total Marks"] || fromLines(/Total Marks\s+(\d+(?:\.\d+)?)/i)),
    marks,
    percentage: isAbsent ? null : toNumber(row.pct),
    grade,
    remarks: row.remarks === "-" ? "" : row.remarks,
    isAbsent,
    classStats: computeClassStats(allRows, marks, isAbsent),
  };
}

/** True when the name on the sheet clearly differs from the saved name. */
export function nameMismatch(sheetName: string, savedName: string) {
  const a = normalizeName(sheetName);
  const b = normalizeName(savedName);
  return !!a && !!b && !a.includes(b) && !b.includes(a);
}
