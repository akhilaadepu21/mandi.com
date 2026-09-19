'use client';

import { useEffect, useState } from 'react';
import { Flame, Clock, Minus, Plus, Sparkles } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { DishVideo } from './DishVideo';
import { formatPrice, spiceLabel } from '@/lib/format';
import { useCartStore } from '@/lib/cart-store';
import { toast } from '../shared/Toast';
import { createClient } from '@/lib/supabase/client';
import type { MenuItem } from '@/types/database';

export function DishModal({
  item,
  qrToken,
  onClose,
  onTrackEvent,
}: {
  item: MenuItem | null;
  qrToken: string;
  onClose: () => void;
  onTrackEvent?: (event: string, menuItemId: string) => void;
}) {
  const [portionId, setPortionId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [instructions, setInstructions] = useState('');
  const [pairings, setPairings] = useState<{ menu_item_id: string; name: string }[]>([]);
  const addLine = useCartStore((s) => s.addLine);
  const openCart = useCartStore((s) => s.open);

  useEffect(() => {
    if (item) {
      const enabledPortions = item.portions?.filter((p) => p.is_enabled) ?? [];
      const firstPriced = enabledPortions.find((p) => p.price !== null);
      setPortionId(firstPriced?.id ?? enabledPortions[0]?.id ?? null);
      setQuantity(1);
      setInstructions('');
      setPairings([]);
      onTrackEvent?.('dish_view', item.id);

      createClient()
        .rpc('rpc_frequently_ordered_with', { p_qr_token: qrToken, p_menu_item_id: item.id, p_limit: 3 })
        .then(({ data }) => setPairings(data ?? []));
    }
  }, [item?.id]);

  if (!item) return null;

  const isVariants = item.pricing_type === 'variants';
  const enabledPortions = item.portions?.filter((p) => p.is_enabled) ?? [];
  const selectedPortion = enabledPortions.find((p) => p.id === portionId) ?? null;
  const price = isVariants ? selectedPortion?.price ?? null : item.base_price;
  const priceUnknown = price === null || price === undefined;

  const handleAdd = () => {
    if (priceUnknown) {
      toast.error('This dish isn’t priced yet — ask staff or check back soon.');
      return;
    }
    addLine({
      menuItemId: item.id,
      name: item.name,
      portionId: selectedPortion?.id ?? null,
      portionLabel: selectedPortion?.label ?? null,
      price,
      quantity,
      specialInstructions: instructions.trim(),
    });
    onTrackEvent?.('dish_added', item.id);
    toast.success(`${item.name} added to your order`);
    onClose();
    openCart();
  };

  return (
    <Modal open={!!item} onClose={onClose} side="bottom">
      <DishVideo media={item.media} name={item.name} large className="aspect-video" />
      <div className="p-5">
        <h2 className="font-serif text-2xl text-cream">{item.name}</h2>
        <p className="mt-2 text-sm text-cream/60">{item.description}</p>

        {item.ingredients && item.ingredients.length > 0 && (
          <p className="mt-2 text-xs text-cream/40">Ingredients: {item.ingredients.join(', ')}</p>
        )}

        <div className="mt-4 flex items-center gap-4 text-xs text-cream/50">
          {item.pricing_type === 'package' && (
            <span className="rounded-full bg-gold/15 text-gold px-2.5 py-1 text-[11px] uppercase tracking-wide">Package</span>
          )}
          <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-gold-amber" /> {spiceLabel(item.spice_level)}</span>
          {item.prep_time_minutes && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {item.prep_time_minutes} min</span>}
          {item.serves_people && <span>Serves {item.serves_people}</span>}
        </div>

        {isVariants && enabledPortions.length > 0 && (
          <div className="mt-5">
            <p className="text-xs uppercase tracking-wide text-cream/40 mb-2">Select Portion</p>
            <div className="flex flex-wrap gap-2">
              {enabledPortions.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPortionId(p.id)}
                  className={`px-4 py-2 rounded-full text-sm border transition-colors ${
                    portionId === p.id
                      ? 'bg-gold text-bg-primary border-gold'
                      : 'border-white/15 text-cream/70 hover:border-gold/50'
                  }`}
                >
                  {p.label}
                  {p.price !== null && <span className="ml-1.5 opacity-70">{formatPrice(p.price)}</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5">
          <p className="text-xs uppercase tracking-wide text-cream/40 mb-2">Special instructions</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {['Less spicy', 'No onions', 'Extra sauce'].map((s) => (
              <button
                key={s}
                onClick={() => setInstructions((prev) => (prev ? `${prev}, ${s}` : s))}
                className="text-xs px-3 py-1 rounded-full border border-white/10 text-cream/50 hover:border-gold/40"
              >
                {s}
              </button>
            ))}
          </div>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Any notes for the kitchen…"
            rows={2}
            className="w-full rounded-xl bg-bg-primary border border-white/10 px-3 py-2 text-sm text-cream placeholder:text-cream/30 focus:border-gold/50 outline-none resize-none"
          />
        </div>

        <div className="mt-5 flex items-center justify-between">
          <div className="flex items-center gap-3 rounded-full border border-white/10 px-2 py-1">
            <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="p-1.5 text-cream/70 hover:text-gold">
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-5 text-center text-cream">{quantity}</span>
            <button onClick={() => setQuantity((q) => q + 1)} className="p-1.5 text-cream/70 hover:text-gold">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <span className="font-serif text-xl text-gold">
            {priceUnknown ? formatPrice(null) : formatPrice(price * quantity)}
          </span>
        </div>

        <Button onClick={handleAdd} size="lg" className="w-full mt-5">
          Add to Cart
        </Button>

        {pairings.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/5">
            <p className="text-xs uppercase tracking-wide text-cream/40 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-gold" /> Frequently Ordered Together
            </p>
            <div className="flex flex-wrap gap-2">
              {pairings.map((p) => (
                <span key={p.menu_item_id} className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-cream/60">
                  {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
