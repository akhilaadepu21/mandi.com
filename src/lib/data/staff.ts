import type { SupabaseClient } from '@supabase/supabase-js';
import type { StaffMember } from '@/types/database';

export async function fetchStaff(supabase: SupabaseClient, restaurantId: string): Promise<StaffMember[]> {
  const { data, error } = await supabase
    .from('restaurant_members')
    .select('id, user_id, email, full_name, phone, role, permissions, is_disabled, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export interface AuditLogRow {
  id: string;
  actor_name: string;
  action: string;
  related_order_id: string | null;
  created_at: string;
}

export async function fetchAuditLogs(supabase: SupabaseClient, restaurantId: string, limit = 30): Promise<AuditLogRow[]> {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, actor_name, action, related_order_id, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}
