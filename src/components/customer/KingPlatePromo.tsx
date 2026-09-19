'use client';

import { motion } from 'framer-motion';
import { DishVideo } from './DishVideo';
import { formatPrice } from '@/lib/format';
import type { MenuItem } from '@/types/database';

export function KingPlatePromo({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="relative rounded-3xl overflow-hidden border border-gold/30 my-8"
    >
      <DishVideo media={item.media} name={item.name} large className="aspect-[16/10]" />
      <div className="absolute inset-0 flex flex-col justify-end p-6">
        <span className="text-xs tracking-[0.25em] text-gold uppercase mb-2">
          {item.serves_people ? `${item.serves_people} People Package` : 'Event Package'}
        </span>
        <h2 className="font-serif text-3xl text-cream mb-2">{item.name}</h2>
        <p className="text-sm text-cream/70 max-w-md mb-4">{item.description}</p>
        <div className="flex items-center gap-4">
          <span className="text-gold font-medium">{formatPrice(item.base_price)}</span>
          <button
            onClick={onOpen}
            className="rounded-full bg-gold text-bg-primary px-6 py-2.5 text-sm font-medium hover:bg-gold-amber transition-colors"
          >
            Order King Plate
          </button>
        </div>
      </div>
    </motion.section>
  );
}
