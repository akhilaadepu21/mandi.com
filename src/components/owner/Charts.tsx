'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { formatPrice } from '@/lib/format';
import type { HourlyRevenue, DishPerformance, CategorySales, PaymentMethodSlice } from '@/lib/data/analytics';

const CATEGORICAL = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#9085e9'];
const GOLD = '#C89B3C';
const GRID = '#2c2c2a';
const MUTED = '#898781';

const tooltipStyle = { background: '#17110C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12, color: '#F5EFE3' };

export function RevenueByHourChart({ data }: { data: HourlyRevenue[] }) {
  const active = data.filter((d) => d.revenue > 0);
  if (active.length === 0) return <EmptyChart label="No completed orders yet" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="hour" tick={{ fill: MUTED, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} interval={2} />
        <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} width={40} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPrice(v)} />
        <Bar dataKey="revenue" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TopDishesChart({ data }: { data: DishPerformance[] }) {
  const top = [...data].sort((a, b) => b.revenue - a.revenue).filter((d) => d.revenue > 0).slice(0, 8);
  if (top.length === 0) return <EmptyChart label="No completed orders yet" />;
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, top.length * 36)}>
      <BarChart data={top} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" tick={{ fill: MUTED, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis type="category" dataKey="name" width={160} tick={{ fill: '#F5EFE3', fontSize: 12 }} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPrice(v)} />
        <Bar dataKey="revenue" fill={GOLD} radius={[0, 4, 4, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CategorySalesChart({ data }: { data: CategorySales[] }) {
  const active = data.filter((d) => d.revenue > 0);
  if (active.length === 0) return <EmptyChart label="No completed orders yet" />;
  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={active} dataKey="revenue" nameKey="name" cx="50%" cy="50%" outerRadius={90} paddingAngle={2}>
          {active.map((_, i) => <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} stroke="#17110C" strokeWidth={2} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => formatPrice(v)} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#F5EFE3' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PaymentMethodsChart({ data }: { data: PaymentMethodSlice[] }) {
  if (data.length === 0) return <EmptyChart label="No payments recorded yet" />;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="count" nameKey="method" cx="50%" cy="50%" outerRadius={80} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={CATEGORICAL[i % CATEGORICAL.length]} stroke="#17110C" strokeWidth={2} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#F5EFE3' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function TableTurnaroundChart({ data }: { data: { table: string; avgMinutes: number }[] }) {
  if (data.length === 0) return <EmptyChart label="No completed orders yet" />;
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="table" tick={{ fill: MUTED, fontSize: 11 }} axisLine={{ stroke: GRID }} tickLine={false} />
        <YAxis tick={{ fill: MUTED, fontSize: 11 }} axisLine={false} tickLine={false} width={40} unit="m" />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `${v} min`} />
        <Bar dataKey="avgMinutes" fill={CATEGORICAL[0]} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return <div className="h-[200px] flex items-center justify-center text-sm text-cream/30">{label}</div>;
}
