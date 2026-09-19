'use client';

import { Search, ShoppingBag, Bell } from 'lucide-react';
import { useCartStore, cartCount } from '@/lib/cart-store';

export function RestaurantHeader({
  restaurantName,
  tableNumber,
  search,
  onSearch,
  onCallStaff,
}: {
  restaurantName: string;
  tableNumber: number;
  search: string;
  onSearch: (v: string) => void;
  onCallStaff: () => void;
}) {
  const lines = useCartStore((s) => s.lines);
  const openCart = useCartStore((s) => s.open);
  const count = cartCount(lines);

  return (
    <header className="sticky top-0 z-40 bg-bg-primary/90 backdrop-blur border-b border-white/5 -mx-4 px-4">
      <div className="flex items-center justify-between h-16">
        <div>
          <p className="font-serif text-lg leading-none text-cream tracking-wide">{restaurantName.toUpperCase()}</p>
          <p className="text-[10px] tracking-[0.2em] text-gold/70 uppercase">Arabian Food · Table {tableNumber}</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onCallStaff} aria-label="Call staff" className="p-2 rounded-full hover:bg-white/5 text-cream/70 hover:text-gold">
            <Bell className="w-5 h-5" />
          </button>
          <button onClick={openCart} aria-label="View cart" className="relative p-2 rounded-full hover:bg-white/5 text-cream/70 hover:text-gold">
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-gold text-bg-primary text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {count}
              </span>
            )}
          </button>
        </div>
      </div>
      <div className="pb-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-cream/30" />
          <input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search dishes…"
            className="w-full rounded-full bg-bg-secondary border border-white/10 pl-9 pr-4 py-2.5 text-sm text-cream placeholder:text-cream/30 focus:border-gold/50 outline-none"
          />
        </div>
      </div>
    </header>
  );
}
