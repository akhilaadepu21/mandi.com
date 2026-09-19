'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { RANGE_OPTIONS, type RangeKey } from '@/lib/date-range';

export function DateRangeFilter({ current }: { current: RangeKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setRange = (key: RangeKey) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === 'custom') {
      const from = prompt('From date (YYYY-MM-DD)?');
      const to = prompt('To date (YYYY-MM-DD)?');
      if (!from || !to) return;
      params.set('range', 'custom');
      params.set('from', from);
      params.set('to', to);
    } else {
      params.set('range', key);
      params.delete('from');
      params.delete('to');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-2 flex-wrap">
      {RANGE_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          onClick={() => setRange(opt.key)}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            current === opt.key ? 'bg-gold text-bg-primary border-gold' : 'border-white/10 text-cream/50 hover:border-gold/40'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
