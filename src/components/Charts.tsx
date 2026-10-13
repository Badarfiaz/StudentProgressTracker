"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, titleCase } from "@/lib/format";
import type { SubjectSummary } from "@/lib/stats";

const INK = "#1E2A4A";
const FAINT = "#8A93A8";
const LINE = "#DFE3EC";
const MARKER = "#F2C21B";

type TrendPoint = { date: string; percentage: number; classAverage: number | null; subject: string; grade: string };

function TrendTooltip({ active, payload }: { active?: boolean; payload?: { payload: TrendPoint }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm shadow-lift">
      <p className="font-bold">{titleCase(p.subject)}</p>
      <p className="text-ink-soft">{formatDate(p.date)}</p>
      <p className="mt-1">
        <span className="font-bold">{p.percentage}%</span> ({p.grade})
        {p.classAverage != null && <span className="text-ink-faint">, class {p.classAverage}%</span>}
      </p>
    </div>
  );
}

export function TrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={LINE} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, false)} tick={{ fill: FAINT, fontSize: 12 }} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis domain={[0, 100]} tick={{ fill: FAINT, fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}`} />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: LINE }} />
        <Line type="monotone" dataKey="classAverage" stroke={FAINT} strokeDasharray="4 4" strokeWidth={1.5} dot={false} name="Class average" connectNulls />
        <Line type="monotone" dataKey="percentage" stroke={INK} strokeWidth={2.5} dot={{ r: 4, fill: MARKER, stroke: INK, strokeWidth: 2 }} activeDot={{ r: 6 }} name="Score" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SubjectCompareChart({ subjects }: { subjects: SubjectSummary[] }) {
  const data = subjects
    .filter((s) => s.average !== null)
    .map((s) => ({
      name: titleCase(s.subject),
      Student: Math.round(s.average!),
      Class: s.classAverage !== null ? Math.round(s.classAverage) : null,
    }));
  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 52)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barGap={2}>
        <CartesianGrid stroke={LINE} horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={{ fill: FAINT, fontSize: 12 }} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={84} tick={{ fill: INK, fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: "#F4F6FA" }} formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: 12, borderColor: LINE }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 13 }} />
        <Bar dataKey="Student" fill={INK} radius={[0, 6, 6, 0]} barSize={14} />
        <Bar dataKey="Class" fill={LINE} radius={[0, 6, 6, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}
