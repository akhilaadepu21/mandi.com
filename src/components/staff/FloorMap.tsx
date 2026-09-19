'use client';

import { useState } from 'react';
import { useStaffFloor } from '@/hooks/useStaffFloor';
import { TableCard } from './TableCard';
import { TableDetails } from './TableDetails';
import { RequestsPanel } from './RequestsPanel';
import { Loading } from '../shared/States';
import { SignOutButton } from '../shared/SignOutButton';
import { ToastViewport } from '../shared/Toast';
import type { StaffTable } from '@/lib/data/tables';

export function FloorMap({ restaurantId, restaurantName, actorName }: { restaurantId: string; restaurantName: string; actorName: string }) {
  const { tables, orders, requests, loading, reload } = useStaffFloor(restaurantId);
  const [selected, setSelected] = useState<StaffTable | null>(null);

  if (loading) return <Loading label="Loading floor…" />;

  const orderForTable = (tableId: string) => orders.find((o) => o.table_id === tableId);

  return (
    <div className="min-h-screen max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-2xl text-cream">Floor — {restaurantName}</h1>
          <p className="text-xs text-cream/40">Tap a table for details</p>
        </div>
        <SignOutButton className="text-cream/50 hover:text-gold p-2" />
      </div>

      {requests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm uppercase tracking-wide text-gold mb-3">Requests ({requests.length})</h2>
          <RequestsPanel requests={requests} onChanged={reload} />
        </div>
      )}

      <h2 className="text-sm uppercase tracking-wide text-cream/40 mb-3">Tables</h2>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {tables.map((t) => (
          <TableCard key={t.id} table={t} order={orderForTable(t.id)} onClick={() => setSelected(t)} />
        ))}
      </div>

      <TableDetails
        table={selected}
        order={selected ? orderForTable(selected.id) : undefined}
        restaurantId={restaurantId}
        actorName={actorName}
        onClose={() => setSelected(null)}
        onChanged={reload}
      />
      <ToastViewport />
    </div>
  );
}
