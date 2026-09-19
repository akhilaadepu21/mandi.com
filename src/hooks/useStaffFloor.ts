'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchTables, fetchPendingRequests, type StaffTable, type StaffRequest } from '@/lib/data/tables';
import { fetchActiveOrders, type StaffOrder } from '@/lib/data/orders';

export function useStaffFloor(restaurantId: string) {
  const [tables, setTables] = useState<StaffTable[]>([]);
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [requests, setRequests] = useState<StaffRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = useRef(createClient());

  const reload = async () => {
    const [t, o, r] = await Promise.all([
      fetchTables(supabase.current, restaurantId),
      fetchActiveOrders(supabase.current, restaurantId),
      fetchPendingRequests(supabase.current, restaurantId),
    ]);
    setTables(t);
    setOrders(o);
    setRequests(r);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    const channel = supabase.current
      .channel(`staff-floor-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables', filter: `restaurant_id=eq.${restaurantId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'customer_requests', filter: `restaurant_id=eq.${restaurantId}` }, reload)
      .subscribe();
    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [restaurantId]);

  return { tables, orders, requests, loading, reload };
}
