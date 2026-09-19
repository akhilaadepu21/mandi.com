'use client';

import { useState } from 'react';
import { Star, Check } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '../shared/Toast';
import type { OrderTrackingItem } from '@/types/database';

export function RatingPrompt({ orderId, accessToken, items }: { orderId: string; accessToken: string; items: OrderTrackingItem[] }) {
  const [submitted, setSubmitted] = useState<Set<string>>(new Set());

  return (
    <div className="rounded-2xl bg-bg-secondary border border-gold/20 p-5 mt-6">
      <p className="font-serif text-lg text-cream mb-1">Rate Your Order</p>
      <p className="text-xs text-cream/40 mb-4">Help other guests — and the kitchen — by rating what you had.</p>
      <div className="space-y-4">
        {items.map((item) => (
          <RatingRow
            key={item.id}
            orderId={orderId}
            accessToken={accessToken}
            item={item}
            done={submitted.has(item.id)}
            onDone={() => setSubmitted((prev) => new Set(prev).add(item.id))}
          />
        ))}
      </div>
    </div>
  );
}

function RatingRow({
  orderId, accessToken, item, done, onDone,
}: {
  orderId: string; accessToken: string; item: OrderTrackingItem; done: boolean; onDone: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (rating === 0) return toast.error('Pick a star rating first.');
    setSubmitting(true);
    const { error } = await createClient().rpc('rpc_submit_rating', {
      p_order_id: orderId,
      p_access_token: accessToken,
      p_order_item_id: item.id,
      p_rating: rating,
      p_review: review || null,
    });
    setSubmitting(false);
    if (error) return toast.error('Could not submit rating.');
    toast.success(`Thanks for rating ${item.name}!`);
    onDone();
  };

  if (done) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <Check className="w-4 h-4" /> {item.name} — rated
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-cream mb-1.5">{item.name}{item.portion ? ` (${item.portion})` : ''}</p>
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
          >
            <Star className={`w-6 h-6 ${(hover || rating) >= n ? 'text-gold fill-gold' : 'text-cream/20'}`} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="flex gap-2">
          <input
            value={review}
            onChange={(e) => setReview(e.target.value)}
            placeholder="Optional review (e.g. 'Very tasty')"
            className="flex-1 rounded-lg bg-bg-primary border border-white/10 px-3 py-1.5 text-xs text-cream placeholder:text-cream/30 focus:border-gold/50 outline-none"
          />
          <button onClick={submit} disabled={submitting} className="text-xs px-3 py-1.5 rounded-lg bg-gold text-bg-primary font-medium disabled:opacity-50">
            Submit
          </button>
        </div>
      )}
    </div>
  );
}
