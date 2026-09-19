'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, Ban, CheckCircle2, Plus } from 'lucide-react';
import { Button } from '../shared/Button';
import { toast } from '../shared/Toast';
import { createClient } from '@/lib/supabase/client';
import type { StaffTable } from '@/lib/data/tables';

export function QRManager({ restaurantId, slug, initialTables }: { restaurantId: string; slug: string; initialTables: StaffTable[] }) {
  const [tables, setTables] = useState(initialTables);
  const [codes, setCodes] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState('');
  const supabase = createClient();

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!origin) return;
    (async () => {
      const entries = await Promise.all(
        tables.map(async (t) => {
          const url = `${origin}/r/${slug}/table/${t.table_number}`;
          const dataUrl = await QRCode.toDataURL(url, { margin: 1, color: { dark: '#0A0908', light: '#F5EFE3' }, width: 320 });
          return [t.id, dataUrl] as const;
        })
      );
      setCodes(Object.fromEntries(entries));
    })();
  }, [origin, slug, tables]);

  const download = (tableNumber: number, dataUrl: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `mandi-com-table-${tableNumber}-qr.png`;
    a.click();
  };

  const toggleDisabled = async (table: StaffTable) => {
    const { error } = await supabase.from('restaurant_tables').update({ is_disabled: !table.is_disabled }).eq('id', table.id);
    if (error) return toast.error('Could not update QR status.');
    setTables((prev) => prev.map((t) => (t.id === table.id ? { ...t, is_disabled: !t.is_disabled } : t)));
    toast.success(`Table ${table.table_number}'s QR is now ${table.is_disabled ? 'active' : 'disabled'}.`);
  };

  const addTable = async () => {
    const nextNumber = tables.length > 0 ? Math.max(...tables.map((t) => t.table_number)) + 1 : 1;
    const { data, error } = await supabase
      .from('restaurant_tables')
      .insert({ restaurant_id: restaurantId, table_number: nextNumber })
      .select()
      .single();
    if (error || !data) return toast.error('Could not add table.');
    setTables((prev) => [...prev, data]);
    toast.success(`Table ${nextNumber} added — QR generated below.`);
  };

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 print:grid-cols-2">
        {tables.map((t) => (
          <div key={t.id} className={`rounded-2xl border p-5 flex flex-col items-center ${t.is_disabled ? 'bg-bg-secondary/40 border-red-500/20' : 'bg-bg-secondary border-white/5'}`}>
            <p className="font-serif text-lg text-cream mb-1">Table {t.table_number}</p>
            <span className={`text-[10px] uppercase tracking-wide mb-3 ${t.is_disabled ? 'text-red-400' : 'text-green-400'}`}>
              {t.is_disabled ? 'Disabled' : 'Active'}
            </span>
            {codes[t.id] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={codes[t.id]} alt={`QR for table ${t.table_number}`} className={`rounded-lg w-40 h-40 ${t.is_disabled ? 'opacity-30' : ''}`} />
            ) : (
              <div className="w-40 h-40 rounded-lg bg-white/5 animate-pulse" />
            )}
            <div className="flex flex-wrap justify-center gap-2 mt-4 print:hidden">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const dataUrl = codes[t.id];
                  if (dataUrl) download(t.table_number, dataUrl);
                }}
              >
                <Download className="w-3.5 h-3.5" /> Download
              </Button>
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
              <Button size="sm" variant={t.is_disabled ? 'primary' : 'danger'} onClick={() => toggleDisabled(t)}>
                {t.is_disabled ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                {t.is_disabled ? 'Enable' : 'Disable'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={addTable} className="mt-6 print:hidden"><Plus className="w-3.5 h-3.5" /> Add Table</Button>
    </div>
  );
}
