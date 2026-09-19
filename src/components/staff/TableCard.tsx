'use client';

import { formatPrice } from '@/lib/format';
import type { StaffTable } from '@/lib/data/tables';
import type { StaffOrder } from '@/lib/data/orders';

const STATUS_STYLES: Record<string, string> = {
  available: 'border-white/10 text-cream/40',
  occupied: 'border-blue-500/50 text-blue-300 bg-blue-950/30',
  ordering: 'border-amber-500/50 text-amber-300 bg-amber-950/30',
  preparing: 'border-purple-500/50 text-purple-300 bg-purple-950/30',
  ready: 'border-green-500/50 text-green-300 bg-green-950/30',
  serving: 'border-cyan-500/50 text-cyan-300 bg-cyan-950/30',
  billing: 'border-gold/60 text-gold bg-gold/10',
  cleaning: 'border-red-500/40 text-red-300 bg-red-950/20',
};

export function TableCard({ table, order, onClick }: { table: StaffTable; order?: StaffOrder; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition-transform hover:scale-[1.03] ${STATUS_STYLES[table.status]}`}
    >
      <span className="text-2xl font-bold">{table.table_number}</span>
      <span className="text-[10px] uppercase tracking-wide">{table.status}</span>
      {order && <span className="text-xs font-medium">{formatPrice(order.total)}</span>}
    </button>
  );
}
