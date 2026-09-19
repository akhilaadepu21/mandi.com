import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from '@/types/database';

interface CartState {
  scopeKey: string | null;
  lines: CartLine[];
  isOpen: boolean;
  setScope: (key: string) => void;
  addLine: (line: Omit<CartLine, 'key'>) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeLine: (key: string) => void;
  clear: () => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      scopeKey: null,
      lines: [],
      isOpen: false,
      setScope: (key) => {
        if (get().scopeKey !== key) {
          set({ scopeKey: key, lines: [] });
        }
      },
      addLine: (line) => {
        const key = `${line.menuItemId}:${line.portionId ?? 'default'}`;
        set((state) => {
          const existing = state.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: state.lines.map((l) =>
                l.key === key ? { ...l, quantity: l.quantity + line.quantity } : l
              ),
            };
          }
          return { lines: [...state.lines, { ...line, key }] };
        });
      },
      updateQuantity: (key, quantity) => {
        set((state) => ({
          lines:
            quantity <= 0
              ? state.lines.filter((l) => l.key !== key)
              : state.lines.map((l) => (l.key === key ? { ...l, quantity } : l)),
        }));
      },
      removeLine: (key) => set((state) => ({ lines: state.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    }),
    {
      name: 'mandi-cart',
      partialize: (state) => ({ scopeKey: state.scopeKey, lines: state.lines }),
    }
  )
);

export function cartSubtotal(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.price * l.quantity, 0);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
