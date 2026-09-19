'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useCartStore, cartCount, cartSubtotal } from '@/lib/cart-store';
import { formatPrice } from '@/lib/format';

export function StickyCartBar() {
  const lines = useCartStore((s) => s.lines);
  const open = useCartStore((s) => s.open);
  const count = cartCount(lines);
  const subtotal = cartSubtotal(lines);

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.button
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          onClick={open}
          className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-md rounded-2xl bg-gold text-bg-primary px-5 py-4 flex items-center justify-between shadow-2xl shadow-black/50"
        >
          <span className="font-medium text-sm">{count} item{count > 1 ? 's' : ''} · {formatPrice(subtotal)}</span>
          <span className="font-semibold text-sm">View Cart →</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
