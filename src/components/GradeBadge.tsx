import { gradeTone, type GradeTone } from "@/lib/format";

const TONES: Record<GradeTone, string> = {
  ok: "bg-ok-soft text-ok",
  mid: "bg-mid-soft text-mid",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  absent: "bg-absent-soft text-absent",
};

export function GradeBadge({ grade, size = "md" }: { grade: string; size?: "sm" | "md" | "lg" }) {
  const tone = gradeTone(grade);
  const absent = tone === "absent";
  const sizes = absent
    ? { sm: "h-7 px-2 text-[11px]", md: "h-9 px-2.5 text-xs", lg: "h-14 px-3 text-sm" }
    : { sm: "h-7 min-w-7 text-xs", md: "h-9 min-w-9 text-sm", lg: "h-14 min-w-14 text-xl" };
  return (
    <span
      className={`inline-grid place-items-center rounded-lg px-1.5 font-display font-bold ${TONES[tone]} ${sizes[size]}`}
      title={tone === "absent" ? "Absent" : `Grade ${grade}`}
    >
      {absent ? "Absent" : grade}
    </span>
  );
}

export const toneText: Record<GradeTone, string> = {
  ok: "text-ok", mid: "text-mid", warn: "text-warn", bad: "text-bad", absent: "text-absent",
};
