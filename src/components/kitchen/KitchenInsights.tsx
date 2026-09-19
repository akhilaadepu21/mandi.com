'use client';

import { useEffect, useState } from 'react';
import { Flame, Star, Package, Timer, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchDishPerformance } from '@/lib/data/analytics';
import { fetchDishRatings, fetchKitchenPerformance, type DishRating, type KitchenPerformance } from '@/lib/data/kitchen-insights';
import { resolveRange, RANGE_OPTIONS, type RangeKey } from '@/lib/date-range';
import type { DishPerformance } from '@/lib/data/analytics';

export function KitchenInsights({ restaurantId }: { restaurantId: string }) {
  const [rangeKey, setRangeKey] = useState<RangeKey>('today');
  const [dishes, setDishes] = useState<DishPerformance[]>([]);
  const [ratings, setRatings] = useState<DishRating[]>([]);
  const [performance, setPerformance] = useState<KitchenPerformance | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const range = resolveRange(rangeKey);
    let cancelled = false;

    const load = async () => {
      const [d, r, p] = await Promise.all([
        fetchDishPerformance(supabase, restaurantId, range),
        fetchDishRatings(supabase, restaurantId),
        fetchKitchenPerformance(supabase, restaurantId, range),
      ]);
      if (!cancelled) {
        setDishes(d);
        setRatings(r);
        setPerformance(p);
      }
    };

    load();
    const interval = setInterval(load, 20000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [restaurantId, rangeKey]);

  const mostSold = [...dishes].filter((d) => d.quantitySold > 0).sort((a, b) => b.quantitySold - a.quantitySold).slice(0, 4);
  const mostOrdered = [...dishes].filter((d) => d.orderCount > 0).sort((a, b) => b.orderCount - a.orderCount).slice(0, 4);
  const topRated = ratings.slice(0, 4);

  return (
    <div className="bg-neutral-950 border-b-2 border-neutral-800 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-white font-extrabold text-sm tracking-wide uppercase">Kitchen Insights</h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {RANGE_OPTIONS.filter((r) => r.key !== 'custom').map((opt) => (
              <button
                key={opt.key}
                onClick={() => setRangeKey(opt.key)}
                className={`text-[11px] px-2.5 py-1 rounded-full ${rangeKey === opt.key ? 'bg-amber-500 text-black font-bold' : 'bg-neutral-800 text-neutral-400'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <button onClick={() => setCollapsed((c) => !c)} className="text-neutral-400 hover:text-white p-1">
            {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <InsightCard icon={Flame} title="Most Sold" color="text-amber-400">
            {mostSold.length === 0 ? <Empty /> : mostSold.map((d, i) => (
              <Row key={d.menuItemId} rank={i + 1} label={d.name} value={`${d.quantitySold} orders`} />
            ))}
          </InsightCard>

          <InsightCard icon={Star} title="Top Rated" color="text-yellow-400">
            {topRated.length === 0 ? <Empty label="No ratings yet" /> : topRated.map((r) => (
              <Row key={r.menuItemId} label={r.name} value={`★ ${r.avgRating.toFixed(1)} (${r.ratingCount})`} />
            ))}
          </InsightCard>

          <InsightCard icon={Package} title="Most Ordered" color="text-blue-400">
            {mostOrdered.length === 0 ? <Empty /> : mostOrdered.map((d, i) => (
              <Row key={d.menuItemId} rank={i + 1} label={d.name} value={`${d.orderCount} orders`} />
            ))}
          </InsightCard>

          <InsightCard icon={Timer} title="Performance" color="text-green-400">
            {performance ? (
              <>
                <Row label="Avg Prep" value={performance.avgPrepTimeMinutes ? `${performance.avgPrepTimeMinutes.toFixed(0)} min` : '—'} />
                <Row label="Preparing" value={String(performance.ordersPreparing)} />
                <Row label="Waiting" value={String(performance.ordersWaiting)} />
                <Row label="Ready" value={String(performance.ordersReady)} />
              </>
            ) : <Empty />}
          </InsightCard>
        </div>
      )}
    </div>
  );
}

function InsightCard({ icon: Icon, title, color, children }: { icon: React.ElementType; title: string; color: string; children: React.ReactNode }) {
  return (
    <div className="bg-neutral-900 rounded-xl p-3">
      <p className={`text-xs font-bold uppercase tracking-wide mb-2 flex items-center gap-1.5 ${color}`}>
        <Icon className="w-3.5 h-3.5" /> {title}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Row({ rank, label, value }: { rank?: number; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-neutral-300 truncate">{rank ? `${rank}. ` : ''}{label}</span>
      <span className="text-white font-semibold shrink-0 ml-2">{value}</span>
    </div>
  );
}

function Empty({ label = 'No data yet' }: { label?: string }) {
  return <p className="text-neutral-600 text-xs">{label}</p>;
}
