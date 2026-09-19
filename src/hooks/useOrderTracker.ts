'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { OrderTracking } from '@/types/database';

type FetchState = { loading: boolean; error: string | null; order: OrderTracking | null };

/**
 * Tracks one order's status. Primary channel is Supabase Realtime Broadcast
 * on `order:<id>:<accessToken>` (the token doubles as a capability so an
 * anonymous customer can subscribe without staff auth). A periodic refetch
 * runs alongside it as a resilience fallback in case a broadcast event is
 * dropped or the environment doesn't have broadcast-from-database enabled —
 * this is not a substitute for realtime, it's a safety net.
 */
export function useOrderTracker(orderId: string | null, accessToken: string | null) {
  const [state, setState] = useState<FetchState>({ loading: true, error: null, order: null });
  const supabase = useRef(createClient());

  const fetchOrder = useCallback(async () => {
    if (!orderId || !accessToken) return;
    const { data, error } = await supabase.current.rpc('rpc_get_order_tracking', {
      p_order_id: orderId,
      p_access_token: accessToken,
    });
    if (error) {
      setState({ loading: false, error: error.message, order: null });
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      setState({ loading: false, error: 'Order not found', order: null });
      return;
    }
    setState({
      loading: false,
      error: null,
      order: {
        order_id: row.order_id,
        order_number: row.order_number,
        status: row.status,
        table_number: row.table_number,
        restaurant_name: row.restaurant_name,
        subtotal: Number(row.subtotal),
        tax: Number(row.tax),
        service_charge: Number(row.service_charge),
        discount: Number(row.discount),
        total: Number(row.total),
        special_instructions: row.special_instructions,
        estimated_ready_minutes: row.estimated_ready_minutes,
        created_at: row.created_at,
        items: row.items ?? [],
      },
    });
  }, [orderId, accessToken]);

  useEffect(() => {
    if (!orderId || !accessToken) return;
    fetchOrder();

    const channel = supabase.current
      .channel(`order:${orderId}:${accessToken}`)
      .on('broadcast', { event: 'UPDATE' }, () => fetchOrder())
      .subscribe();

    const interval = setInterval(fetchOrder, 6000);

    return () => {
      supabase.current.removeChannel(channel);
      clearInterval(interval);
    };
  }, [orderId, accessToken, fetchOrder]);

  return state;
}
