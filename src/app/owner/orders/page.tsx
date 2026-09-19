import { createClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { fetchRecentOrders } from '@/lib/data/metrics';
import { formatPrice, statusLabel } from '@/lib/format';

export default async function OwnerOrdersPage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const orders = await fetchRecentOrders(supabase, member.restaurantId, 100);

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="font-serif text-3xl text-cream mb-1">Orders</h1>
      <p className="text-cream/40 text-sm mb-8">Most recent 100 orders for {member.restaurantName}.</p>

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
            {orders.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-cream/30">No orders yet.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 text-cream">#{o.order_number}</td>
                <td className="px-4 py-3 text-cream/60">Table {o.table_number}</td>
                <td className="px-4 py-3 text-gold text-xs uppercase">{statusLabel(o.status)}</td>
                <td className="px-4 py-3 text-right text-cream/80">{formatPrice(o.total)}</td>
                <td className="px-4 py-3 text-right text-cream/40 text-xs">{new Date(o.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
