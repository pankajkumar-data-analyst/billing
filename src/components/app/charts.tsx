"use client";

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const NAVY = "#1a1a2e";
const GOLD = "#F4C430";
const PALETTE = ["#F4C430", "#1a1a2e", "#2d2d44", "#D4A017", "#8a8a9e", "#c9c9d4"];

function compact(n: number): string {
  if (Math.abs(n) >= 1_00_000) return `${(n / 1_00_000).toFixed(1)}L`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export function RevenueTrendChart({ data }: { data: { label: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="label" fontSize={12} />
        <YAxis tickFormatter={compact} fontSize={12} width={48} />
        <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
        <Line type="monotone" dataKey="value" stroke={GOLD} strokeWidth={3} dot={{ fill: NAVY }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function PipelineChart({ data }: { data: { stage: string; count: number }[] }) {
  const formatted = data.map((d) => ({ label: d.stage.replace("_", " "), value: d.count }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="label" fontSize={10} angle={-35} textAnchor="end" interval={0} height={60} />
        <YAxis allowDecimals={false} fontSize={12} width={32} />
        <Tooltip />
        <Bar dataKey="value" fill={NAVY} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function StatusPie({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">No data</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={80} label>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Legend />
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function RevenueByClientChart({ data }: { data: { label: string; value: number }[] }) {
  if (data.length === 0) return <p className="py-10 text-center text-sm text-muted-foreground">No revenue yet</p>;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart layout="vertical" data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis type="number" tickFormatter={compact} fontSize={12} />
        <YAxis type="category" dataKey="label" fontSize={11} width={100} />
        <Tooltip formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
        <Bar dataKey="value" fill={GOLD} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
