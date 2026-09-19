import type { SupabaseClient } from '@supabase/supabase-js';

export interface PlatformRestaurant {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_demo: boolean;
  created_at: string;
  plan: string | null;
  subscription_status: string | null;
  totalOrders: number;
  totalRevenue: number;
}

export async function fetchPlatformOverview(supabase: SupabaseClient) {
  const [restaurantsRes, subsRes, ordersRes] = await Promise.all([
    supabase.from('restaurants').select('id, name, slug, is_active, is_demo, created_at'),
    supabase.from('subscriptions').select('restaurant_id, plan, status'),
    supabase.from('orders').select('restaurant_id, total, status'),
  ]);

  const restaurants = restaurantsRes.data ?? [];
  const subs = new Map((subsRes.data ?? []).map((s) => [s.restaurant_id, s]));
  const orders = ordersRes.data ?? [];

  const byRestaurant = new Map<string, { count: number; revenue: number }>();
  for (const o of orders) {
    const agg = byRestaurant.get(o.restaurant_id) ?? { count: 0, revenue: 0 };
    agg.count += 1;
    if (o.status === 'completed') agg.revenue += Number(o.total);
    byRestaurant.set(o.restaurant_id, agg);
  }

  const result: PlatformRestaurant[] = restaurants.map((r) => {
    const sub = subs.get(r.id);
    const agg = byRestaurant.get(r.id) ?? { count: 0, revenue: 0 };
    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      is_active: r.is_active,
      is_demo: r.is_demo,
      created_at: r.created_at,
      plan: sub?.plan ?? null,
      subscription_status: sub?.status ?? null,
      totalOrders: agg.count,
      totalRevenue: agg.revenue,
    };
  });

  const platformRevenue = result.reduce((sum, r) => sum + r.totalRevenue, 0);
  const platformOrders = result.reduce((sum, r) => sum + r.totalOrders, 0);

  return { restaurants: result, platformRevenue, platformOrders };
}
