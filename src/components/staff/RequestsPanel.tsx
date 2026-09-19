'use client';

import { Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '../shared/Toast';
import { EmptyState } from '../shared/States';
import type { StaffRequest } from '@/lib/data/tables';

const LABELS: Record<string, string> = {
  water: 'Water',
  extra_cutlery: 'Extra Cutlery',
  call_waiter: 'Call Waiter',
  clean_table: 'Clean Table',
  bill_please: 'Bill Please',
};

export function RequestsPanel({ requests, onChanged }: { requests: StaffRequest[]; onChanged: () => void }) {
  const resolve = async (id: string, status: 'acknowledged' | 'resolved') => {
    const supabase = createClient();
    const patch: Record<string, unknown> = { status };
    if (status === 'acknowledged') patch.acknowledged_at = new Date().toISOString();
    if (status === 'resolved') patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from('customer_requests').update(patch).eq('id', id);
    if (error) return toast.error('Could not update request.');
    onChanged();
  };

  if (requests.length === 0) {
    return <EmptyState icon={Bell} title="No active requests" description="Customer calls for staff will show up here instantly." />;
  }

  return (
    <div className="space-y-2">
      {requests.map((r) => (
        <div key={r.id} className="flex items-center justify-between rounded-xl bg-bg-secondary border border-white/5 px-4 py-3">
          <div>
            <p className="text-cream font-medium">Table {r.table_number} — {LABELS[r.type] ?? r.type}</p>
            <p className="text-xs text-cream/40">{new Date(r.created_at).toLocaleTimeString()}</p>
          </div>
          <div className="flex gap-2">
            {r.status === 'pending' && (
              <button onClick={() => resolve(r.id, 'acknowledged')} className="text-xs px-3 py-1.5 rounded-full bg-blue-600/20 text-blue-300 hover:bg-blue-600/30">
                Acknowledge
              </button>
            )}
            <button onClick={() => resolve(r.id, 'resolved')} className="text-xs px-3 py-1.5 rounded-full bg-green-600/20 text-green-300 hover:bg-green-600/30">
              Resolve
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
