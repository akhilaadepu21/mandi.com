import type { SupabaseClient } from '@supabase/supabase-js';
import type { DateRange } from '@/lib/date-range';

export interface OwnerMetrics {
  totalSales: number;
  totalOrders: number;
  avgOrderValue: number;
  activeTables: number;
  totalTables: number;
  tableOccupancyPct: number;
  avgPrepTimeMinutes: number | null;
  completedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  grossSales: number;
  discounts: number;
  tax: number;
  serviceCharges: number;
  netSales: number;
}

const PENDING_STATUSES = ['placed', 'accepted', 'preparing', 'ready', 'served'];

export async function computeOwnerMetrics(supabase: SupabaseClient, restaurantId: string, range: DateRange): Promise<OwnerMetrics> {
  const [ordersRes, tablesRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, subtotal, tax, service_charge, discount, status, accepted_at, ready_at')
      .eq('restaurant_id', restaurantId)
      .gte('created_at', range.from)
      .lte('created_at', range.to),
    supabase.from('restaurant_tables').select('id, status').eq('restaurant_id', restaurantId),
  ]);

  const orders = ordersRes.data ?? [];
  const tables = tablesRes.data ?? [];

  const completed = orders.filter((o) => o.status === 'completed');
  const pending = orders.filter((o) => PENDING_STATUSES.includes(o.status));
  const cancelled = orders.filter((o) => o.status === 'cancelled');
  const nonCancelled = orders.filter((o) => o.status !== 'cancelled');

  const totalSales = completed.reduce((sum, o) => sum + Number(o.total), 0);
  const grossSales = completed.reduce((sum, o) => sum + Number(o.subtotal), 0);
  const discounts = completed.reduce((sum, o) => sum + Number(o.discount), 0);
  const tax = completed.reduce((sum, o) => sum + Number(o.tax), 0);
  const serviceCharges = completed.reduce((sum, o) => sum + Number(o.service_charge), 0);

  const prepTimes = orders
    .filter((o) => o.accepted_at && o.ready_at)
    .map((o) => (new Date(o.ready_at!).getTime() - new Date(o.accepted_at!).getTime()) / 60000);

  const activeTables = tables.filter((t) => t.status !== 'available').length;

  return {
    totalSales,
    totalOrders: nonCancelled.length,
    avgOrderValue: completed.length > 0 ? totalSales / completed.length : 0,
    activeTables,
    totalTables: tables.length,
    tableOccupancyPct: tables.length > 0 ? (activeTables / tables.length) * 100 : 0,
    avgPrepTimeMinutes: prepTimes.length > 0 ? prepTimes.reduce((a, b) => a + b, 0) / prepTimes.length : null,
    completedOrders: completed.length,
    pendingOrders: pending.length,
    cancelledOrders: cancelled.length,
    grossSales,
    discounts,
    tax,
    serviceCharges,
    netSales: totalSales,
  };
}

export interface RecentOrderRow {
  id: string;
  order_number: number;
  table_number: number;
  status: string;
  total: number;
  created_at: string;
}

export async function fetchRecentOrders(supabase: SupabaseClient, restaurantId: string, limit = 10): Promise<RecentOrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, total, created_at, restaurant_tables(table_number)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    table_number: o.restaurant_tables?.table_number ?? 0,
    status: o.status,
    total: Number(o.total),
    created_at: o.created_at,
  }));
}
