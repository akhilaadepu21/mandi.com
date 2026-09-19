'use client';

import { useState } from 'react';
import { OrderTimer } from './OrderTimer';
import { createClient } from '@/lib/supabase/client';
import { toast } from '../shared/Toast';
import type { StaffOrder } from '@/lib/data/orders';
import type { OrderStatus } from '@/types/database';

const NEXT_ACTION: Partial<Record<OrderStatus, { label: string; next: OrderStatus; color: string }>> = {
  placed: { label: 'ACCEPT', next: 'accepted', color: 'bg-blue-600 hover:bg-blue-500' },
  accepted: { label: 'START PREPARING', next: 'preparing', color: 'bg-purple-600 hover:bg-purple-500' },
  preparing: { label: 'MARK READY', next: 'ready', color: 'bg-amber-600 hover:bg-amber-500' },
  ready: { label: 'MARK SERVED', next: 'served', color: 'bg-green-600 hover:bg-green-500' },
};

const timeAnchor = (order: StaffOrder) =>
  order.ready_at || order.preparing_at || order.accepted_at || order.created_at;

export function OrderCard({ order, onChanged }: { order: StaffOrder; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const action = NEXT_ACTION[order.status as OrderStatus];

  const advance = async () => {
    if (!action) return;
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('rpc_update_order_status', { p_order_id: order.id, p_status: action.next });
    setBusy(false);
    if (error) {
      toast.error('Could not update order status.');
      return;
    }
    onChanged();
  };

  return (
    <div className="rounded-xl bg-neutral-900 border-2 border-neutral-700 p-4 text-white">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl font-extrabold">#{order.order_number}</span>
        <OrderTimer since={timeAnchor(order)} />
      </div>
      <p className="text-lg font-bold text-amber-400 mb-3">TABLE {order.table_number}</p>

      <ul className="space-y-1 mb-3">
        {order.items.map((item) => (
          <li key={item.id} className="text-base">
            <span className="font-semibold">{item.quantity}×</span> {item.name}
            {item.portion && <span className="text-neutral-400"> ({item.portion})</span>}
            {item.special_instructions && (
              <div className="text-sm text-amber-300 pl-4">→ {item.special_instructions}</div>
            )}
          </li>
        ))}
      </ul>

      {order.special_instructions && (
        <p className="text-sm text-amber-300 mb-3 border-t border-neutral-700 pt-2">Note: {order.special_instructions}</p>
      )}

      {action && (
        <button
          onClick={advance}
          disabled={busy}
          className={`w-full py-3 rounded-lg text-white font-extrabold text-base tracking-wide transition-colors disabled:opacity-50 ${action.color}`}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
