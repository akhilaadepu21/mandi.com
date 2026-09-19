'use client';

import { useRealtimeOrders } from '@/hooks/useRealtimeOrders';
import { OrderCard } from './OrderCard';
import { ErrorState } from '../shared/States';
import type { OrderStatus } from '@/types/database';

const COLUMNS: { status: OrderStatus; label: string }[] = [
  { status: 'placed', label: 'NEW' },
  { status: 'accepted', label: 'ACCEPTED' },
  { status: 'preparing', label: 'PREPARING' },
  { status: 'ready', label: 'READY' },
  { status: 'served', label: 'SERVED' },
];

export function OrderBoard({ restaurantId }: { restaurantId: string }) {
  const { orders, loading, error, reload } = useRealtimeOrders(restaurantId);

  if (error) return <ErrorState title="Could not load orders" description={error} onRetry={reload} />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4">
      {COLUMNS.map((col) => {
        const columnOrders = orders.filter((o) => o.status === col.status);
        return (
          <div key={col.status} className="bg-neutral-950 rounded-2xl p-3 min-h-[70vh]">
            <div className="flex items-center justify-between mb-3 px-1">
              <h2 className="text-white font-extrabold text-lg tracking-wide">{col.label}</h2>
              <span className="bg-neutral-800 text-white text-sm font-bold rounded-full w-7 h-7 flex items-center justify-center">
                {columnOrders.length}
              </span>
            </div>
            <div className="space-y-3">
              {!loading && columnOrders.length === 0 && (
                <p className="text-neutral-600 text-sm text-center py-8">No orders</p>
              )}
              {columnOrders.map((order) => (
                <OrderCard key={order.id} order={order} onChanged={reload} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
