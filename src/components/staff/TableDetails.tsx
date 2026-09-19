'use client';

import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { formatPrice, statusLabel } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { toast } from '../shared/Toast';
import type { StaffTable } from '@/lib/data/tables';
import type { StaffOrder } from '@/lib/data/orders';

export function TableDetails({
  table,
  order,
  restaurantId,
  actorName,
  onClose,
  onChanged,
}: {
  table: StaffTable | null;
  order?: StaffOrder;
  restaurantId: string;
  actorName: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  if (!table) return null;

  const markCleaned = async () => {
    const supabase = createClient();
    const { error } = await supabase.from('restaurant_tables').update({ status: 'available' }).eq('id', table.id);
    if (error) return toast.error('Could not update table.');
    await supabase.from('audit_logs').insert({
      restaurant_id: restaurantId,
      actor_name: actorName,
      action: `${actorName} marked Table ${table.table_number} as cleaned/available`,
    });
    toast.success(`Table ${table.table_number} is now available.`);
    onChanged();
    onClose();
  };

  const markServed = async () => {
    if (!order) return;
    const supabase = createClient();
    const { error } = await supabase.rpc('rpc_update_order_status', { p_order_id: order.id, p_status: 'served' });
    if (error) return toast.error('Could not update order.');
    toast.success('Marked as served.');
    onChanged();
  };

  return (
    <Modal open={!!table} onClose={onClose} side="bottom">
      <div className="p-5">
        <h2 className="font-serif text-2xl text-cream mb-1">Table {table.table_number}</h2>
        <p className="text-xs uppercase tracking-wide text-gold mb-5">{table.status}</p>

        {order ? (
          <div className="rounded-xl bg-bg-primary border border-white/10 p-4 mb-4">
            <div className="flex justify-between mb-3">
              <span className="text-cream font-medium">Order #{order.order_number}</span>
              <span className="text-xs uppercase text-gold">{statusLabel(order.status)}</span>
            </div>
            <ul className="space-y-1 mb-3">
              {order.items.map((item) => (
                <li key={item.id} className="text-sm text-cream/70">
                  {item.quantity}× {item.name} {item.portion && `(${item.portion})`}
                </li>
              ))}
            </ul>
            <div className="flex justify-between text-cream font-semibold border-t border-white/10 pt-2">
              <span>Total</span><span className="text-gold">{formatPrice(order.total)}</span>
            </div>
            {order.status === 'ready' && (
              <Button onClick={markServed} className="w-full mt-4">Mark Served</Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-cream/40 mb-4">No active order for this table.</p>
        )}

        <Button variant="secondary" onClick={markCleaned} className="w-full">
          Mark Table Available (Cleaned)
        </Button>
      </div>
    </Modal>
  );
}
