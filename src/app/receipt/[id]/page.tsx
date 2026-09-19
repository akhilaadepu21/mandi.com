'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Printer, Download, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Loading, ErrorState } from '@/components/shared/States';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/format';

interface Receipt {
  invoice_number: string;
  table_number: number;
  restaurant_name: string;
  restaurant_address: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  service_charge: number;
  total: number;
  payment_method: string | null;
  is_sandbox: boolean;
  created_at: string;
  items: { name: string; portion: string | null; price: number; quantity: number }[];
}

function ReceiptPageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    createClient()
      .rpc('rpc_get_receipt', { p_order_id: params.id, p_access_token: token })
      .then(({ data, error }) => {
        setLoading(false);
        if (error) return setError(error.message);
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) return setError('Receipt not available yet.');
        setReceipt(row as Receipt);
      });
  }, [params.id, token]);

  if (!token) return <div className="min-h-screen flex items-center justify-center"><ErrorState title="Missing order link" /></div>;
  if (loading) return <Loading label="Loading receipt…" />;
  if (error || !receipt) return <div className="min-h-screen flex items-center justify-center"><ErrorState title="Receipt not found" description={error ?? undefined} /></div>;

  const downloadText = () => {
    const lines = [
      `${receipt.restaurant_name}`,
      receipt.restaurant_address ?? '',
      `Invoice: ${receipt.invoice_number}`,
      `Table: ${receipt.table_number}`,
      `Date: ${new Date(receipt.created_at).toLocaleString()}`,
      '',
      ...receipt.items.map((i) => `${i.name}${i.portion ? ` (${i.portion})` : ''} x${i.quantity} — ${formatPrice(i.price * i.quantity)}`),
      '',
      `Subtotal: ${formatPrice(receipt.subtotal)}`,
      `Tax: ${formatPrice(receipt.tax)}`,
      `Service Charge: ${formatPrice(receipt.service_charge)}`,
      `Total: ${formatPrice(receipt.total)}`,
      '',
      receipt.is_sandbox ? '[SANDBOX PAYMENT — no real money moved]' : '',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${receipt.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen max-w-md mx-auto px-4 pt-10 pb-16 print:text-black">
      <div className="text-center mb-6">
        <h1 className="font-serif text-2xl text-cream">{receipt.restaurant_name}</h1>
        {receipt.restaurant_address && <p className="text-xs text-cream/50 mt-1">{receipt.restaurant_address}</p>}
      </div>

      {receipt.is_sandbox && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs px-4 py-3 mb-6">
          <ShieldCheck className="w-4 h-4 shrink-0" /> Sandbox payment — demo transaction only.
        </div>
      )}

      <div className="rounded-2xl bg-bg-secondary border border-white/5 p-5">
        <div className="flex justify-between text-xs text-cream/40 mb-4">
          <span>{receipt.invoice_number}</span>
          <span>Table {receipt.table_number}</span>
        </div>
        <div className="space-y-2">
          {receipt.items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-cream/80">{item.name}{item.portion ? ` (${item.portion})` : ''} × {item.quantity}</span>
              <span className="text-cream/60">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/5 space-y-1 text-sm text-cream/60">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatPrice(receipt.subtotal)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>{formatPrice(receipt.tax)}</span></div>
          <div className="flex justify-between"><span>Service Charge</span><span>{formatPrice(receipt.service_charge)}</span></div>
          {receipt.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatPrice(receipt.discount)}</span></div>}
          <div className="flex justify-between text-cream font-semibold text-base pt-2">
            <span>Total Paid</span><span className="text-gold">{formatPrice(receipt.total)}</span>
          </div>
        </div>
        {receipt.payment_method && (
          <p className="text-xs text-cream/40 mt-3 uppercase tracking-wide">Paid via {receipt.payment_method}</p>
        )}
      </div>

      <div className="flex gap-3 mt-6 print:hidden">
        <Button variant="secondary" onClick={() => window.print()} className="flex-1">
          <Printer className="w-4 h-4" /> Print
        </Button>
        <Button variant="secondary" onClick={downloadText} className="flex-1">
          <Download className="w-4 h-4" /> Download
        </Button>
      </div>
    </div>
  );
}

export default function ReceiptPage() {
  return (
    <Suspense fallback={<Loading />}>
      <ReceiptPageInner />
    </Suspense>
  );
}
