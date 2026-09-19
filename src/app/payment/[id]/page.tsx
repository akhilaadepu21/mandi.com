'use client';

import { Suspense, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { CreditCard, Smartphone, Wallet, Banknote, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Loading, ErrorState } from '@/components/shared/States';
import { ToastViewport, toast } from '@/components/shared/Toast';
import { useOrderTracker } from '@/hooks/useOrderTracker';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/format';
import type { PaymentMethod } from '@/types/database';

const METHODS: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { id: 'upi', label: 'UPI', icon: Smartphone },
  { id: 'card', label: 'Card', icon: CreditCard },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
  { id: 'cash', label: 'Cash', icon: Banknote },
];

function PaymentPageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>('upi');
  const [paying, setPaying] = useState(false);
  const { loading, order } = useOrderTracker(params.id, token);

  if (!token) {
    return <div className="min-h-screen flex items-center justify-center"><ErrorState title="Missing order link" /></div>;
  }
  if (loading) return <Loading label="Loading order…" />;
  if (!order) return <div className="min-h-screen flex items-center justify-center"><ErrorState title="Order not found" /></div>;

  const pay = async () => {
    setPaying(true);
    const supabase = createClient();
    const { error } = await supabase.rpc('rpc_record_sandbox_payment', {
      p_order_id: params.id,
      p_access_token: token,
      p_method: method,
    });
    setPaying(false);
    if (error) {
      toast.error('Sandbox payment failed. Please try again.');
      return;
    }
    toast.success('Sandbox payment successful.');
    router.push(`/receipt/${params.id}?token=${token}`);
  };

  return (
    <div className="min-h-screen max-w-md mx-auto px-4 pt-10 pb-16">
      <div className="flex items-center gap-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs px-4 py-3 mb-8">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        Sandbox payment mode — no real money moves. Built to swap in a live gateway later.
      </div>

      <h1 className="font-serif text-2xl text-cream mb-1">Pay for Order #{order.order_number}</h1>
      <p className="text-cream/50 text-sm mb-6">Table {order.table_number} · {order.restaurant_name}</p>

      <div className="rounded-2xl bg-bg-secondary border border-white/5 p-5 mb-6">
        <div className="flex justify-between text-cream font-semibold text-lg">
          <span>Total Due</span>
          <span className="text-gold">{formatPrice(order.total)}</span>
        </div>
      </div>

      <p className="text-xs uppercase tracking-wide text-cream/40 mb-3">Payment Method</p>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {METHODS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMethod(id)}
            className={`flex flex-col items-center gap-2 rounded-2xl border py-5 transition-colors ${
              method === id ? 'border-gold bg-gold/10 text-gold' : 'border-white/10 text-cream/60 hover:border-gold/40'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>

      <Button onClick={pay} loading={paying} size="lg" className="w-full">
        Pay {formatPrice(order.total)} (Sandbox)
      </Button>
      <ToastViewport />
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={<Loading />}>
      <PaymentPageInner />
    </Suspense>
  );
}
