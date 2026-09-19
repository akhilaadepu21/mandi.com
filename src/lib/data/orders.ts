import type { SupabaseClient } from '@supabase/supabase-js';

export interface StaffOrder {
  id: string;
  order_number: number;
  status: string;
  table_id: string;
  table_number: number;
  special_instructions: string | null;
  total: number;
  created_at: string;
  accepted_at: string | null;
  preparing_at: string | null;
  ready_at: string | null;
  items: { id: string; name: string; portion: string | null; quantity: number; special_instructions: string | null }[];
}

export async function fetchActiveOrders(supabase: SupabaseClient, restaurantId: string): Promise<StaffOrder[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id, order_number, status, table_id, special_instructions, total, created_at, accepted_at, preparing_at, ready_at, restaurant_tables(table_number), order_items(id, name_snapshot, portion_label_snapshot, quantity, special_instructions)')
    .eq('restaurant_id', restaurantId)
    .in('status', ['placed', 'accepted', 'preparing', 'ready', 'served'])
    .order('created_at', { ascending: true });

  if (error) throw error;

  return (data ?? []).map((o: any) => ({
    id: o.id,
    order_number: o.order_number,
    status: o.status,
    table_id: o.table_id,
    table_number: o.restaurant_tables?.table_number ?? 0,
    special_instructions: o.special_instructions,
    total: Number(o.total),
    created_at: o.created_at,
    accepted_at: o.accepted_at,
    preparing_at: o.preparing_at,
    ready_at: o.ready_at,
    items: (o.order_items ?? []).map((i: any) => ({
      id: i.id,
      name: i.name_snapshot,
      portion: i.portion_label_snapshot,
      quantity: i.quantity,
      special_instructions: i.special_instructions,
    })),
  }));
}
