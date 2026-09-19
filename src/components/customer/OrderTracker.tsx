'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { useOrderTracker } from '@/hooks/useOrderTracker';
import { Loading, ErrorState } from '../shared/States';
import { Button } from '../shared/Button';
import { RatingPrompt } from './RatingPrompt';
import { formatPrice, ORDER_STAGES, statusLabel } from '@/lib/format';

export function OrderTracker({ orderId, accessToken }: { orderId: string; accessToken: string }) {
  const { loading, error, order } = useOrderTracker(orderId, accessToken);

  if (loading) return <Loading label="Loading your order…" />;
  if (error || !order) return <ErrorState title="Order not found" description="Check the link or ask staff for help." />;

  const stageIndex = ORDER_STAGES.indexOf(order.status as (typeof ORDER_STAGES)[number]);
  const cancelled = order.status === 'cancelled';

  return (
    <div className="max-w-md mx-auto px-4 pb-16 pt-10">
      <div className="text-center mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-gold mb-2">Order #{order.order_number}</p>
        <h1 className="font-serif text-3xl text-cream">Table {order.table_number}</h1>
        <p className="text-cream/50 text-sm mt-1">{order.restaurant_name}</p>
      </div>

      {cancelled ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-950/30 p-5 text-center text-red-300 mb-8">
          This order was cancelled.
        </div>
      ) : (
        <div className="mb-10">
          <div className="flex justify-between relative">
            <div className="absolute top-3 left-0 right-0 h-0.5 bg-white/10" />
            <motion.div
              className="absolute top-3 left-0 h-0.5 bg-gold"
              initial={{ width: 0 }}
              animate={{ width: `${(stageIndex / (ORDER_STAGES.length - 1)) * 100}%` }}
              transition={{ duration: 0.6 }}
            />
            {ORDER_STAGES.map((stage, i) => (
              <div key={stage} className="relative z-10 flex flex-col items-center gap-2 flex-1">
                <motion.div
                  animate={i <= stageIndex ? { scale: [1, 1.15, 1] } : {}}
                  transition={{ duration: 0.5 }}
                  className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${
                    i <= stageIndex ? 'bg-gold border-gold text-bg-primary' : 'bg-bg-secondary border-white/15 text-transparent'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                </motion.div>
                <span className={`text-[10px] text-center ${i === stageIndex ? 'text-gold font-medium' : 'text-cream/40'}`}>
                  {statusLabel(stage)}
                </span>
              </div>
            ))}
          </div>
          {order.estimated_ready_minutes && stageIndex < 3 && (
            <p className="text-center text-sm text-cream/50 mt-6">
              Estimated preparation: <span className="text-gold">{order.estimated_ready_minutes} minutes</span>
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl bg-bg-secondary border border-white/5 p-5">
        <p className="text-xs uppercase tracking-wide text-cream/40 mb-3">Order Summary</p>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-cream/80">
                {item.name} {item.portion && <span className="text-cream/40">({item.portion})</span>} × {item.quantity}
              </span>
              <span className="text-cream/60">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/5 space-y-1 text-sm text-cream/60">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatPrice(order.tax)}</span></div>
          <div className="flex justify-between"><span>Service Charge</span><span>{formatPrice(order.service_charge)}</span></div>
          <div className="flex justify-between text-cream font-semibold text-base pt-2">
            <span>Total</span><span className="text-gold">{formatPrice(order.total)}</span>
          </div>
        </div>
      </div>

      {!cancelled && (
        <Link href={`/payment/${orderId}?token=${accessToken}`} className="block mt-6">
          <Button size="lg" className="w-full">Pay Now</Button>
        </Link>
      )}

      {order.status === 'completed' && (
        <RatingPrompt orderId={orderId} accessToken={accessToken} items={order.items} />
      )}
    </div>
  );
}
