'use client';

import { useState } from 'react';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { EmptyState } from '../shared/States';
import { toast } from '../shared/Toast';
import { useCartStore, cartSubtotal } from '@/lib/cart-store';
import { formatPrice } from '@/lib/format';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export function CartDrawer({ qrToken, restaurantId }: { qrToken: string; restaurantId: string }) {
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.close);
  const lines = useCartStore((s) => s.lines);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeLine = useCartStore((s) => s.removeLine);
  const clear = useCartStore((s) => s.clear);
  const [orderNote, setOrderNote] = useState('');
  const [placing, setPlacing] = useState(false);
  const router = useRouter();

  const subtotal = cartSubtotal(lines);
  const tax = Math.round(subtotal * 0.05 * 100) / 100;
  const serviceCharge = Math.round(subtotal * 0.05 * 100) / 100;
  const total = Math.round((subtotal + tax + serviceCharge) * 100) / 100;

  const placeOrder = async () => {
    if (lines.length === 0) return;
    setPlacing(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc('rpc_place_order', {
      p_qr_token: qrToken,
      p_items: lines.map((l) => ({
        menu_item_id: l.menuItemId,
        portion_id: l.portionId,
        quantity: l.quantity,
        special_instructions: l.specialInstructions,
      })),
      p_special_instructions: orderNote || null,
    });
    setPlacing(false);

    if (error) {
      toast.error('Could not place your order. Please try again.');
      return;
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      toast.error('Could not place your order. Please try again.');
      return;
    }
    clear();
    close();
    router.push(`/order/${row.order_id}?token=${row.access_token}`);
  };

  return (
    <Modal open={isOpen} onClose={close} side="right">
      <div className="flex flex-col h-full">
        <div className="p-5 border-b border-white/5">
          <h2 className="font-serif text-2xl text-cream">Your Order</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {lines.length === 0 ? (
            <EmptyState icon={ShoppingBag} title="Your cart is empty" description="Add a dish from the menu to get started." />
          ) : (
            lines.map((line) => (
              <div key={line.key} className="flex gap-3 items-start pb-4 border-b border-white/5">
                <div className="flex-1">
                  <p className="text-cream font-medium">{line.name}</p>
                  {line.portionLabel && <p className="text-xs text-cream/40">{line.portionLabel}</p>}
                  {line.specialInstructions && (
                    <p className="text-xs text-gold/70 mt-0.5">Note: {line.specialInstructions}</p>
                  )}
                  <div className="flex items-center gap-2 mt-2 rounded-full border border-white/10 w-fit px-1.5 py-0.5">
                    <button onClick={() => updateQuantity(line.key, line.quantity - 1)} className="p-1 text-cream/60 hover:text-gold">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm w-4 text-center">{line.quantity}</span>
                    <button onClick={() => updateQuantity(line.key, line.quantity + 1)} className="p-1 text-cream/60 hover:text-gold">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-gold text-sm font-medium">{formatPrice(line.price * line.quantity)}</p>
                  <button onClick={() => removeLine(line.key)} className="mt-2 text-cream/30 hover:text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {lines.length > 0 && (
          <div className="p-5 border-t border-white/5 space-y-3">
            <textarea
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Notes for the whole order (optional)"
              rows={2}
              className="w-full rounded-xl bg-bg-primary border border-white/10 px-3 py-2 text-sm text-cream placeholder:text-cream/30 focus:border-gold/50 outline-none resize-none"
            />
            <div className="space-y-1 text-sm text-cream/60">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(subtotal)}</span></div>
              <div className="flex justify-between"><span>Tax (5%)</span><span>{formatPrice(tax)}</span></div>
              <div className="flex justify-between"><span>Service Charge (5%)</span><span>{formatPrice(serviceCharge)}</span></div>
              <div className="flex justify-between text-cream font-semibold text-base pt-2 border-t border-white/5">
                <span>Total</span><span className="text-gold">{formatPrice(total)}</span>
              </div>
            </div>
            <Button onClick={placeOrder} loading={placing} size="lg" className="w-full">
              Place Order
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
