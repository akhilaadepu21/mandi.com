import { redirect } from 'next/navigation';
import { Building2, IndianRupee, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { checkRouteAccess } from '@/lib/auth';
import { fetchPlatformOverview } from '@/lib/data/platform';
import { MetricCard } from '@/components/owner/MetricCard';
import { SignOutButton } from '@/components/shared/SignOutButton';
import { AccessDenied } from '@/components/shared/AccessDenied';
import { formatPrice } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function SuperAdminPage() {
  const access = await checkRouteAccess('super-admin');
  if (!access.allowed) {
    if (access.reason === 'not_signed_in') redirect('/login?next=/super-admin');
    return <div className="min-h-screen flex items-center justify-center"><AccessDenied reason={access.reason} /></div>;
  }

  const supabase = await createClient();
  const { restaurants, platformRevenue, platformOrders } = await fetchPlatformOverview(supabase);

  return (
    <div className="min-h-screen max-w-6xl mx-auto p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-cream">Platform Admin</h1>
          <p className="text-cream/40 text-sm">Every restaurant on Mandi.com&apos;s Restaurant OS.</p>
        </div>
        <SignOutButton className="text-cream/50 hover:text-gold p-2" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-10">
        <MetricCard label="Restaurants" value={String(restaurants.length)} icon={Building2} />
        <MetricCard label="Platform Revenue" value={formatPrice(platformRevenue)} icon={IndianRupee} sub="Completed orders, all restaurants" />
        <MetricCard label="Platform Orders" value={String(platformOrders)} icon={ShoppingBag} />
      </div>

      <div className="rounded-2xl bg-bg-secondary border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-cream/40 border-b border-white/5">
              <th className="px-4 py-3 font-normal">Restaurant</th>
              <th className="px-4 py-3 font-normal">Plan</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal text-right">Orders</th>
              <th className="px-4 py-3 font-normal text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((r) => (
              <tr key={r.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 text-cream">
                  {r.name} {r.is_demo && <span className="text-[10px] text-gold/70 uppercase ml-2">Demo</span>}
                </td>
                <td className="px-4 py-3 text-cream/60 uppercase text-xs">{r.plan ?? '—'}</td>
                <td className="px-4 py-3 text-cream/60 text-xs uppercase">{r.subscription_status ?? '—'}</td>
                <td className="px-4 py-3 text-right text-cream/80">{r.totalOrders}</td>
                <td className="px-4 py-3 text-right text-gold">{formatPrice(r.totalRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
