import Link from 'next/link';
import { IndianRupee, ShoppingBag, Receipt, Grid3x3, PieChart, Timer, Users, QrCode, Sparkles, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { resolveRange, type RangeKey } from '@/lib/date-range';
import { computeOwnerMetrics, fetchRecentOrders } from '@/lib/data/metrics';
import { fetchRevenueByHour, fetchDishPerformance } from '@/lib/data/analytics';
import { fetchKitchenPerformance } from '@/lib/data/kitchen-insights';
import { fetchStaff } from '@/lib/data/staff';
import { fetchTables } from '@/lib/data/tables';
import { MetricCard } from '@/components/owner/MetricCard';
import { RevenueByHourChart } from '@/components/owner/Charts';
import { DateRangeFilter } from '@/components/owner/DateRangeFilter';
import { formatPrice, statusLabel } from '@/lib/format';

export default async function OwnerDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) return null; // layout already guards this

  const supabase = await createClient();
  const sp = await searchParams;
  const rangeKey = (sp.range as RangeKey) ?? 'today';
  const range = resolveRange(rangeKey, sp.from, sp.to);

  const [metrics, recentOrders, revenueByHour, dishes, kitchen, staff, tables] = await Promise.all([
    computeOwnerMetrics(supabase, member.restaurantId, range),
    fetchRecentOrders(supabase, member.restaurantId),
    fetchRevenueByHour(supabase, member.restaurantId, range),
    fetchDishPerformance(supabase, member.restaurantId, range),
    fetchKitchenPerformance(supabase, member.restaurantId, range),
    fetchStaff(supabase, member.restaurantId),
    fetchTables(supabase, member.restaurantId),
  ]);

  const topDishes = [...dishes].filter((d) => d.quantitySold > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const totalDishRevenue = dishes.reduce((sum, d) => sum + d.revenue, 0);

  const activeStaff = staff.filter((s) => !s.is_disabled).length;
  const activeQr = tables.filter((t) => !t.is_disabled).length;
  const occupiedTables = tables.filter((t) => t.status !== 'available').length;

  return (
    <div className="p-8 max-w-6xl">
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl text-cream mb-1">Today&apos;s Business</h1>
          <p className="text-cream/40 text-sm">{range.label} — computed from real orders, never hard-coded.</p>
        </div>
        <DateRangeFilter current={rangeKey} />
      </div>

      {/* TOP: headline metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <MetricCard label="Total Sales" value={formatPrice(metrics.totalSales)} icon={IndianRupee} sub="Completed orders" />
        <MetricCard label="Total Orders" value={String(metrics.totalOrders)} icon={ShoppingBag} sub={`${metrics.completedOrders} completed · ${metrics.pendingOrders} pending`} />
        <MetricCard label="Average Order Value" value={formatPrice(metrics.avgOrderValue)} icon={Receipt} />
        <MetricCard label="Active Tables" value={`${metrics.activeTables} / ${metrics.totalTables}`} icon={Grid3x3} sub={`${metrics.tableOccupancyPct.toFixed(0)}% occupancy`} />
      </div>

      {/* MIDDLE: revenue chart */}
      <div className="rounded-2xl bg-bg-secondary border border-white/5 p-5 mb-10">
        <h2 className="font-serif text-lg text-cream mb-1">Revenue by Hour</h2>
        <p className="text-xs text-cream/40 mb-3">{range.label}</p>
        <RevenueByHourChart data={revenueByHour} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        {/* TOP ITEMS: best sellers */}
        <div className="rounded-2xl bg-bg-secondary border border-white/5 p-5">
          <h2 className="font-serif text-lg text-cream mb-4">Top Selling Items</h2>
          {topDishes.length === 0 ? (
            <p className="text-sm text-cream/30 py-6 text-center">No completed orders in this range yet.</p>
          ) : (
            <div className="space-y-3">
              {topDishes.map((d, i) => (
                <div key={d.menuItemId} className="flex items-center gap-3">
                  <span className="text-cream/30 text-sm w-4">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-cream text-sm">{d.name}</p>
                    <p className="text-xs text-cream/40">{d.quantitySold} sold · {formatPrice(d.revenue)}</p>
                  </div>
                  <span className="text-gold text-sm font-medium">
                    {totalDishRevenue > 0 ? `${((d.revenue / totalDishRevenue) * 100).toFixed(0)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Money flow */}
        <div className="rounded-2xl bg-bg-secondary border border-white/5 p-5">
          <h2 className="font-serif text-lg text-cream mb-4">Daily Money Flow</h2>
          <div className="space-y-2 text-sm">
            <Row label="Gross Sales" value={formatPrice(metrics.grossSales)} />
            <Row label="Discounts" value={`-${formatPrice(metrics.discounts)}`} muted />
            <Row label="Tax" value={formatPrice(metrics.tax)} muted />
            <Row label="Service Charges" value={formatPrice(metrics.serviceCharges)} muted />
            <div className="border-t border-white/10 pt-2 mt-2">
              <Row label="Net Sales" value={formatPrice(metrics.netSales)} bold />
            </div>
          </div>
        </div>
      </div>

      {/* OPERATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        <div className="rounded-2xl bg-bg-secondary border border-white/5 p-5">
          <h2 className="font-serif text-lg text-cream mb-4 flex items-center gap-2"><Timer className="w-4 h-4 text-gold" /> Kitchen Performance</h2>
          <div className="space-y-2 text-sm">
            <Row label="Avg Prep Time" value={kitchen.avgPrepTimeMinutes ? `${kitchen.avgPrepTimeMinutes.toFixed(0)} min` : '—'} />
            <Row label="Preparing" value={String(kitchen.ordersPreparing)} />
            <Row label="Waiting" value={String(kitchen.ordersWaiting)} />
            <Row label="Ready" value={String(kitchen.ordersReady)} />
          </div>
        </div>

        <div className="rounded-2xl bg-bg-secondary border border-white/5 p-5">
          <h2 className="font-serif text-lg text-cream mb-4 flex items-center gap-2"><QrCode className="w-4 h-4 text-gold" /> Tables &amp; QR</h2>
          <div className="space-y-2 text-sm">
            <Row label="Total Tables" value={String(tables.length)} />
            <Row label="Active QR" value={String(activeQr)} />
            <Row label="Occupied" value={String(occupiedTables)} />
            <Row label="Available" value={String(tables.length - occupiedTables)} />
          </div>
          <Link href="/owner/qr" className="text-xs text-gold/70 hover:text-gold flex items-center gap-1 mt-3">
            Manage QR Codes <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="rounded-2xl bg-bg-secondary border border-white/5 p-5">
          <h2 className="font-serif text-lg text-cream mb-4 flex items-center gap-2"><Users className="w-4 h-4 text-gold" /> Staff Overview</h2>
          <p className="text-cream text-sm mb-2">{staff.length} Staff Member{staff.length !== 1 ? 's' : ''}</p>
          <div className="space-y-1">
            {staff.slice(0, 4).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-xs">
                <span className="text-cream/60">{s.full_name} · {s.role}</span>
                <span className={s.is_disabled ? 'text-cream/30' : 'text-green-400'}>{s.is_disabled ? 'Offline' : 'Active'}</span>
              </div>
            ))}
          </div>
          <Link href="/owner/staff" className="text-xs text-gold/70 hover:text-gold flex items-center gap-1 mt-3">
            Manage Staff <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* BOTTOM: AI insights link */}
      <Link href="/owner/ai" className="flex items-center justify-between rounded-2xl bg-gold/10 border border-gold/20 p-5 mb-10 hover:bg-gold/15 transition-colors">
        <span className="flex items-center gap-2 text-cream"><Sparkles className="w-4 h-4 text-gold" /> View AI Business Insights</span>
        <ArrowRight className="w-4 h-4 text-gold" />
      </Link>

      <h2 className="font-serif text-xl text-cream mb-4">Recent Orders</h2>
      <div className="rounded-2xl bg-bg-secondary border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-cream/40 border-b border-white/5">
              <th className="px-4 py-3 font-normal">Order</th>
              <th className="px-4 py-3 font-normal">Table</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal text-right">Total</th>
              <th className="px-4 py-3 font-normal text-right">Time</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-cream/30">No orders yet — place a demo order from /r/mandi-com/table/5</td></tr>
            )}
            {recentOrders.map((o) => (
              <tr key={o.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 text-cream">#{o.order_number}</td>
                <td className="px-4 py-3 text-cream/60">Table {o.table_number}</td>
                <td className="px-4 py-3 text-gold text-xs uppercase">{statusLabel(o.status)}</td>
                <td className="px-4 py-3 text-right text-cream/80">{formatPrice(o.total)}</td>
                <td className="px-4 py-3 text-right text-cream/40 text-xs">{new Date(o.created_at).toLocaleTimeString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className={muted ? 'text-cream/40' : 'text-cream/60'}>{label}</span>
      <span className={bold ? 'text-cream font-semibold' : muted ? 'text-cream/50' : 'text-cream'}>{value}</span>
    </div>
  );
}
