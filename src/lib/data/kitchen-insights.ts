import type { SupabaseClient } from '@supabase/supabase-js';
import type { DateRange } from '@/lib/date-range';

export interface DishRating { menuItemId: string; name: string; avgRating: number; ratingCount: number; }

export interface KitchenPerformance {
  avgPrepTimeMinutes: number | null;
  ordersPreparing: number;
  ordersWaiting: number;
  ordersReady: number;
  ordersCompleted: number;
}

export async function fetchDishRatings(supabase: SupabaseClient, restaurantId: string): Promise<DishRating[]> {
  const [ratingsRes, itemsRes] = await Promise.all([
    supabase.from('menu_item_ratings').select('menu_item_id, rating').eq('restaurant_id', restaurantId),
    supabase.from('menu_items').select('id, name').eq('restaurant_id', restaurantId),
  ]);

  const names = new Map((itemsRes.data ?? []).map((i) => [i.id, i.name]));
  const totals = new Map<string, { sum: number; count: number }>();

  for (const r of ratingsRes.data ?? []) {
    const agg = totals.get(r.menu_item_id) ?? { sum: 0, count: 0 };
    agg.sum += r.rating;
    agg.count += 1;
    totals.set(r.menu_item_id, agg);
  }

  return Array.from(totals.entries())
    .map(([menuItemId, { sum, count }]) => ({
      menuItemId,
      name: names.get(menuItemId) ?? 'Unknown dish',
      avgRating: Math.round((sum / count) * 10) / 10,
      ratingCount: count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating || b.ratingCount - a.ratingCount);
}

/**
 * "Currently preparing/waiting/ready" are live operational counts (not
 * date-ranged — a kitchen cares about right now); avg prep time and
 * completed count respect the selected range.
 */
export async function fetchKitchenPerformance(supabase: SupabaseClient, restaurantId: string, range: DateRange): Promise<KitchenPerformance> {
  const [liveRes, rangedRes] = await Promise.all([
    supabase.from('orders').select('status').eq('restaurant_id', restaurantId).in('status', ['placed', 'accepted', 'preparing', 'ready']),
    supabase
      .from('orders')
      .select('status, accepted_at, ready_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', range.from)
      .lte('created_at', range.to),
  ]);

  const live = liveRes.data ?? [];
  const ranged = rangedRes.data ?? [];

  const prepTimes = ranged
    .filter((o) => o.accepted_at && o.ready_at)
    .map((o) => (new Date(o.ready_at!).getTime() - new Date(o.accepted_at!).getTime()) / 60000);

  return {
    avgPrepTimeMinutes: prepTimes.length > 0 ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length : null,
    ordersPreparing: live.filter((o) => o.status === 'preparing').length,
    ordersWaiting: live.filter((o) => o.status === 'placed' || o.status === 'accepted').length,
    ordersReady: live.filter((o) => o.status === 'ready').length,
    ordersCompleted: ranged.filter((o) => o.status === 'completed').length,
  };
}
