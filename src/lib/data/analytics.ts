import type { SupabaseClient } from '@supabase/supabase-js';
import type { DateRange } from '@/lib/date-range';

export interface HourlyRevenue { hour: string; revenue: number; }
export interface DishPerformance { menuItemId: string; name: string; revenue: number; quantitySold: number; orderCount: number; views: number; addToCart: number; conversion: number; }
export interface CategorySales { name: string; revenue: number; }
export interface PaymentMethodSlice { method: string; count: number; }
export interface TableTurnaround { table: string; avgMinutes: number; }

export async function fetchRevenueByHour(supabase: SupabaseClient, restaurantId: string, range: DateRange): Promise<HourlyRevenue[]> {
  const { data } = await supabase
    .from('orders')
    .select('total, created_at')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'completed')
    .gte('created_at', range.from)
    .lte('created_at', range.to);

  const buckets = new Map<number, number>();
  for (const row of data ?? []) {
    const hour = new Date(row.created_at).getHours();
    buckets.set(hour, (buckets.get(hour) ?? 0) + Number(row.total));
  }
  return Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, '0')}:00`,
    revenue: Math.round((buckets.get(h) ?? 0) * 100) / 100,
  }));
}

/**
 * Per-dish performance for the given range: revenue and quantitySold come
 * from completed orders' line items (never cancelled/abandoned carts);
 * orderCount is how many separate order lines included the dish — "most
 * sold" (by quantitySold) and "most ordered" (by orderCount) are genuinely
 * different rankings, both computed here.
 */
export async function fetchDishPerformance(supabase: SupabaseClient, restaurantId: string, range: DateRange): Promise<DishPerformance[]> {
  const [itemsRes, orderItemsRes, eventsRes] = await Promise.all([
    supabase.from('menu_items').select('id, name').eq('restaurant_id', restaurantId),
    supabase
      .from('order_items')
      .select('menu_item_id, name_snapshot, price_snapshot, quantity, orders!inner(restaurant_id, status, created_at)')
      .eq('orders.restaurant_id', restaurantId)
      .eq('orders.status', 'completed')
      .gte('orders.created_at', range.from)
      .lte('orders.created_at', range.to),
    supabase
      .from('analytics_events')
      .select('menu_item_id, event_type')
      .eq('restaurant_id', restaurantId)
      .not('menu_item_id', 'is', null)
      .gte('created_at', range.from)
      .lte('created_at', range.to),
  ]);

  const items = itemsRes.data ?? [];
  const orderItems = orderItemsRes.data ?? [];
  const events = eventsRes.data ?? [];

  const perf = new Map<string, DishPerformance>();
  for (const item of items) {
    perf.set(item.id, { menuItemId: item.id, name: item.name, revenue: 0, quantitySold: 0, orderCount: 0, views: 0, addToCart: 0, conversion: 0 });
  }
  for (const oi of orderItems as any[]) {
    const row = perf.get(oi.menu_item_id);
    if (!row) continue;
    row.revenue += Number(oi.price_snapshot) * oi.quantity;
    row.quantitySold += oi.quantity;
    row.orderCount += 1;
  }
  for (const e of events) {
    const row = e.menu_item_id ? perf.get(e.menu_item_id) : undefined;
    if (!row) continue;
    if (e.event_type === 'dish_view') row.views += 1;
    if (e.event_type === 'dish_added') row.addToCart += 1;
  }
  for (const row of perf.values()) {
    row.conversion = row.views > 0 ? (row.orderCount / row.views) * 100 : 0;
  }
  return Array.from(perf.values());
}

export async function fetchCategorySales(supabase: SupabaseClient, restaurantId: string, range: DateRange): Promise<CategorySales[]> {
  const { data } = await supabase
    .from('order_items')
    .select('price_snapshot, quantity, menu_items!inner(category_id, menu_categories!inner(name, restaurant_id)), orders!inner(restaurant_id, status, created_at)')
    .eq('orders.restaurant_id', restaurantId)
    .eq('orders.status', 'completed')
    .gte('orders.created_at', range.from)
    .lte('orders.created_at', range.to);

  const totals = new Map<string, number>();
  for (const row of (data ?? []) as any[]) {
    const name = row.menu_items?.menu_categories?.name ?? 'Other';
    totals.set(name, (totals.get(name) ?? 0) + Number(row.price_snapshot) * row.quantity);
  }
  return Array.from(totals.entries()).map(([name, revenue]) => ({ name, revenue: Math.round(revenue * 100) / 100 }));
}

export async function fetchPaymentMethods(supabase: SupabaseClient, restaurantId: string, range: DateRange): Promise<PaymentMethodSlice[]> {
  const { data } = await supabase
    .from('payments')
    .select('method, created_at, orders!inner(restaurant_id)')
    .eq('orders.restaurant_id', restaurantId)
    .eq('status', 'succeeded')
    .gte('created_at', range.from)
    .lte('created_at', range.to);

  const counts = new Map<string, number>();
  for (const row of (data ?? []) as any[]) {
    counts.set(row.method, (counts.get(row.method) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([method, count]) => ({ method, count }));
}

export async function fetchTableTurnaround(supabase: SupabaseClient, restaurantId: string, range: DateRange): Promise<TableTurnaround[]> {
  const { data } = await supabase
    .from('orders')
    .select('table_id, created_at, completed_at, restaurant_tables!inner(table_number)')
    .eq('restaurant_id', restaurantId)
    .eq('status', 'completed')
    .not('completed_at', 'is', null)
    .gte('created_at', range.from)
    .lte('created_at', range.to);

  const byTable = new Map<number, number[]>();
  for (const row of (data ?? []) as any[]) {
    const minutes = (new Date(row.completed_at).getTime() - new Date(row.created_at).getTime()) / 60000;
    const tableNumber = row.restaurant_tables?.table_number ?? 0;
    if (!byTable.has(tableNumber)) byTable.set(tableNumber, []);
    byTable.get(tableNumber)!.push(minutes);
  }
  return Array.from(byTable.entries())
    .map(([table, times]) => ({ table: `T${table}`, avgMinutes: Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10 }))
    .sort((a, b) => Number(a.table.slice(1)) - Number(b.table.slice(1)));
}
