const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDate(iso: string, withYear = true) {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return withYear ? `${d} ${MONTHS[m - 1]} ${y}` : `${d} ${MONTHS[m - 1]}`;
}

export function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function formatMonth(key: string) {
  const [y, m] = key.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}

/** CHEMISTERY -> Chemistery */
export function titleCase(s: string) {
  return s.toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase());
}

export const pct = (n: number | null | undefined, digits = 0) =>
  n === null || n === undefined || Number.isNaN(n) ? "–" : `${n.toFixed(digits)}%`;

export function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
}

export type GradeTone = "ok" | "mid" | "warn" | "bad" | "absent";

export function gradeTone(grade: string): GradeTone {
  const g = grade.toUpperCase();
  if (g === "AB") return "absent";
  if (g.startsWith("A")) return "ok";
  if (g.startsWith("B")) return "mid";
  if (g.startsWith("C") || g.startsWith("D") || g.startsWith("E")) return "warn";
  return "bad";
}
