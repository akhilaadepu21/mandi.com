import type { SupabaseClient } from '@supabase/supabase-js';
import type { TableStatus } from '@/types/database';

export interface StaffTable {
  id: string;
  table_number: number;
  status: TableStatus;
  occupied_at: string | null;
  seats: number | null;
  is_disabled: boolean;
}

export async function fetchTables(supabase: SupabaseClient, restaurantId: string): Promise<StaffTable[]> {
  const { data, error } = await supabase
    .from('restaurant_tables')
    .select('id, table_number, status, occupied_at, seats, is_disabled')
    .eq('restaurant_id', restaurantId)
    .order('table_number', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface StaffRequest {
  id: string;
  table_id: string;
  table_number: number;
  type: string;
  status: string;
  created_at: string;
}

export async function fetchPendingRequests(supabase: SupabaseClient, restaurantId: string): Promise<StaffRequest[]> {
  const { data, error } = await supabase
    .from('customer_requests')
    .select('id, table_id, type, status, created_at, restaurant_tables(table_number)')
    .eq('restaurant_id', restaurantId)
    .in('status', ['pending', 'acknowledged'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    id: r.id,
    table_id: r.table_id,
    table_number: r.restaurant_tables?.table_number ?? 0,
    type: r.type,
    status: r.status,
    created_at: r.created_at,
  }));
}
