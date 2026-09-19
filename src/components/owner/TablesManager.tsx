'use client';

import { useState } from 'react';
import { Plus, Trash2, Ban, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '../shared/Toast';
import { Button } from '../shared/Button';
import type { StaffTable } from '@/lib/data/tables';

export function TablesManager({ restaurantId, initialTables }: { restaurantId: string; initialTables: StaffTable[] }) {
  const [tables, setTables] = useState(initialTables);
  const [newSeats, setNewSeats] = useState('4');
  const supabase = createClient();

  const addTable = async () => {
    const nextNumber = tables.length > 0 ? Math.max(...tables.map((t) => t.table_number)) + 1 : 1;
    const seats = Number(newSeats) || null;
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({ restaurant_id: restaurantId, table_number: nextNumber, seats })
      .select()
      .single();
    if (error || !data) return toast.error('Could not add table.');
    setTables((prev) => [...prev, data]);
    toast.success(`Table ${nextNumber} added.`);
  };

  const toggleDisabled = async (table: StaffTable) => {
    const { error } = await supabase.from('restaurant_tables').update({ is_disabled: !table.is_disabled }).eq('id', table.id);
    if (error) return toast.error('Could not update table.');
    setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, is_disabled: !t.is_disabled } : t)));
    toast.success(`Table ${table.table_number} ${table.is_disabled ? 'enabled' : 'disabled'}.`);
  };

  const removeTable = async (id: string, tableNumber: number) => {
    if (!confirm(`Are you sure you want to remove Table ${tableNumber}?`)) return;
    const { error } = await supabase.from('restaurant_tables').delete().eq('id', id);
    if (error) {
      toast.error('This table has order history and can\'t be deleted — disable it instead to keep the records intact.');
      return;
    }
    setTables((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div>
      <div className="flex items-end gap-2 mb-6">
        <label className="block">
          <span className="block text-xs text-cream/50 mb-1">Seats</span>
          <input
            value={newSeats}
            onChange={(e) => setNewSeats(e.target.value)}
            className="w-20 rounded-lg bg-bg-secondary border border-white/10 px-3 py-2 text-sm text-cream"
          />
        </label>
        <Button size="sm" onClick={addTable}><Plus className="w-3.5 h-3.5" /> Add Table</Button>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
        {tables.map((t) => (
          <div key={t.id} className={`relative rounded-xl border p-4 text-center ${t.is_disabled ? 'bg-bg-secondary/40 border-red-500/20' : 'bg-bg-secondary border-white/5'}`}>
            <p className={`text-xl font-bold ${t.is_disabled ? 'text-cream/30' : 'text-cream'}`}>{t.table_number}</p>
            <p className="text-[10px] uppercase text-cream/40 mt-1">{t.is_disabled ? 'Disabled' : t.status}</p>
            {t.seats && <p className="text-[10px] text-cream/30">{t.seats} seats</p>}
            <div className="absolute top-1.5 right-1.5 flex gap-1">
              <button onClick={() => toggleDisabled(t)} title={t.is_disabled ? 'Enable' : 'Disable'} className="text-cream/20 hover:text-gold">
                {t.is_disabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
              </button>
              <button onClick={() => removeTable(t.id, t.table_number)} title="Delete" className="text-cream/20 hover:text-red-400">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
