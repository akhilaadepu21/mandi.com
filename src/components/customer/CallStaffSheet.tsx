'use client';

import { useState } from 'react';
import { Droplets, Utensils, Bell, Sparkles, Receipt } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { toast } from '../shared/Toast';
import { createClient } from '@/lib/supabase/client';
import type { RequestType } from '@/types/database';

const OPTIONS: { type: RequestType; label: string; icon: React.ElementType }[] = [
  { type: 'water', label: 'Water', icon: Droplets },
  { type: 'extra_cutlery', label: 'Extra Cutlery', icon: Utensils },
  { type: 'call_waiter', label: 'Call Waiter', icon: Bell },
  { type: 'clean_table', label: 'Clean Table', icon: Sparkles },
  { type: 'bill_please', label: 'Bill Please', icon: Receipt },
];

export function CallStaffSheet({
  open,
  onClose,
  qrToken,
}: {
  open: boolean;
  onClose: () => void;
  qrToken: string;
}) {
  const [sending, setSending] = useState<RequestType | null>(null);

  const send = async (type: RequestType) => {
    setSending(type);
    const supabase = createClient();
    const { error } = await supabase.rpc('rpc_create_request', { p_qr_token: qrToken, p_type: type });
    setSending(null);
    if (error) {
      toast.error('Could not reach staff — please try again.');
      return;
    }
    toast.success('Staff is on the way.');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} side="bottom">
      <div className="p-5">
        <h2 className="font-serif text-xl text-cream mb-4">Call Staff</h2>
        <div className="grid grid-cols-2 gap-3">
          {OPTIONS.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              disabled={sending !== null}
              onClick={() => send(type)}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 hover:border-gold/40 py-5 text-cream/80 hover:text-gold transition-colors disabled:opacity-50"
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
