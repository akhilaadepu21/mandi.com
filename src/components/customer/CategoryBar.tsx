'use client';

import type { MenuCategory } from '@/types/database';

export function CategoryBar({
  categories,
  active,
  onSelect,
}: {
  categories: MenuCategory[];
  active: string | null;
  onSelect: (id: string | null) => void;
}) {
  return (
    <div className="sticky top-[64px] z-30 bg-bg-primary/95 backdrop-blur border-b border-white/5 -mx-4 px-4 py-3">
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => onSelect(null)}
          className={`shrink-0 px-4 py-1.5 rounded-full text-sm border transition-colors ${
            active === null ? 'bg-gold text-bg-primary border-gold' : 'border-white/15 text-cream/60 hover:border-gold/40'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm border transition-colors ${
              active === c.id ? 'bg-gold text-bg-primary border-gold' : 'border-white/15 text-cream/60 hover:border-gold/40'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
}
