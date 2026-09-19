import { createClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { resolveRange, type RangeKey } from '@/lib/date-range';
import {
  fetchRevenueByHour, fetchDishPerformance, fetchCategorySales, fetchPaymentMethods, fetchTableTurnaround,
} from '@/lib/data/analytics';
import {
  RevenueByHourChart, TopDishesChart, CategorySalesChart, PaymentMethodsChart, TableTurnaroundChart,
} from '@/components/owner/Charts';
import { DateRangeFilter } from '@/components/owner/DateRangeFilter';

export default async function OwnerAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const member = await getCurrentMember();
  if (!member) return null;
  const supabase = await createClient();

  const sp = await searchParams;
  const rangeKey = (sp.range as RangeKey) ?? 'today';
  const range = resolveRange(rangeKey, sp.from, sp.to);

  const [revenueByHour, dishes, categorySales, paymentMethods, turnaround] = await Promise.all([
    fetchRevenueByHour(supabase, member.restaurantId, range),
    fetchDishPerformance(supabase, member.restaurantId, range),
    fetchCategorySales(supabase, member.restaurantId, range),
    fetchPaymentMethods(supabase, member.restaurantId, range),
    fetchTableTurnaround(supabase, member.restaurantId, range),
  ]);

  const lowPerformers = [...dishes]
    .filter((d) => d.views >= 3)
    .sort((a, b) => a.conversion - b.conversion)
    .slice(0, 5);

  return (
    <div className="p-8 max-w-6xl space-y-10">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-3xl text-cream mb-1">Analytics</h1>
          <p className="text-cream/40 text-sm">Computed live from orders, payments, and menu view/click events — no hard-coded numbers.</p>
        </div>
        <DateRangeFilter current={rangeKey} />
      </div>

      <ChartCard title="Revenue by Hour" subtitle={range.label}>
        <RevenueByHourChart data={revenueByHour} />
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Top Selling Dishes" subtitle="By revenue">
          <TopDishesChart data={dishes} />
        </ChartCard>
        <ChartCard title="Category Sales" subtitle="Share of completed-order revenue">
          <CategorySalesChart data={categorySales} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Payment Methods" subtitle="Succeeded payments">
          <PaymentMethodsChart data={paymentMethods} />
        </ChartCard>
        <ChartCard title="Table Turnaround" subtitle="Avg. minutes from order to completion">
          <TableTurnaroundChart data={turnaround} />
        </ChartCard>
      </div>

      <ChartCard title="Video → Order Conversion" subtitle="Dishes with views but low order conversion">
        {lowPerformers.length === 0 ? (
          <p className="text-sm text-cream/30 py-8 text-center">Not enough view data yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-cream/40 border-b border-white/5">
                <th className="py-2 font-normal">Dish</th>
                <th className="py-2 font-normal text-right">Views</th>
                <th className="py-2 font-normal text-right">Added to Cart</th>
                <th className="py-2 font-normal text-right">Orders</th>
                <th className="py-2 font-normal text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {lowPerformers.map((d) => (
                <tr key={d.menuItemId} className="border-b border-white/5 last:border-0">
                  <td className="py-2 text-cream">{d.name}</td>
                  <td className="py-2 text-right text-cream/60">{d.views}</td>
                  <td className="py-2 text-right text-cream/60">{d.addToCart}</td>
                  <td className="py-2 text-right text-cream/60">{d.orderCount}</td>
                  <td className="py-2 text-right text-gold">{d.conversion.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-bg-secondary border border-white/5 p-5">
      <h2 className="font-serif text-lg text-cream">{title}</h2>
      {subtitle && <p className="text-xs text-cream/40 mb-3">{subtitle}</p>}
      {children}
    </div>
  );
}
