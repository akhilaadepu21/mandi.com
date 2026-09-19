'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { fetchActiveOrders, type StaffOrder } from '@/lib/data/orders';

/**
 * True Supabase Realtime for staff/kitchen/owner: authenticated members
 * subscribe to postgres_changes on `orders`, which Realtime authorizes
 * against the same RLS policies as a normal select — a chef only ever
 * receives changes for their own restaurant.
 */
export function useRealtimeOrders(restaurantId: string) {
  const [orders, setOrders] = useState<StaffOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = useRef(createClient());

  const reload = async () => {
    try {
      const data = await fetchActiveOrders(supabase.current, restaurantId);
      setOrders(data);
      setError(null);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();

    const channel = supabase.current
      .channel(`kitchen-orders-${restaurantId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `restaurant_id=eq.${restaurantId}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, reload)
      .subscribe();

    return () => {
      supabase.current.removeChannel(channel);
    };
  }, [restaurantId]);

  return { orders, loading, error, reload };
}
