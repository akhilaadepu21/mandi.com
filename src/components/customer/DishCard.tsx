'use client';

import { motion } from 'framer-motion';
import { Flame, Clock, Plus, Leaf } from 'lucide-react';
import { DishVideo } from './DishVideo';
import { formatPrice, spiceIcons } from '@/lib/format';
import type { MenuItem } from '@/types/database';

export function DishCard({ item, onOpen }: { item: MenuItem; onOpen: () => void }) {
  const isVariants = item.pricing_type === 'variants';
  const cheapestVariantPrice = item.portions
    ?.filter((p) => p.is_enabled && p.price !== null)
    .reduce<number | null>((min, p) => (min === null || p.price! < min ? p.price! : min), null) ?? null;
  const displayPrice = isVariants ? cheapestVariantPrice : item.base_price;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.4 }}
      whileHover={{ y: -3 }}
      onClick={onOpen}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-bg-secondary border border-white/5 hover:border-gold/30 transition-colors"
    >
      <DishVideo media={item.media} name={item.name} className="aspect-[4/3]" />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg text-cream leading-snug">{item.name}</h3>
          {item.is_veg ? (
            <span title="Vegetarian" className="mt-1 shrink-0"><Leaf className="w-3.5 h-3.5 text-green-400" /></span>
          ) : (
            <span title="Non-vegetarian" className="mt-1 shrink-0 w-3.5 h-3.5 rounded-sm border-2 border-red-500 flex items-center justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-cream/50 line-clamp-2">{item.description}</p>

        <div className="mt-3 flex items-center gap-3 text-[11px] text-cream/40">
          {spiceIcons(item.spice_level) > 0 && (
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-gold-amber" /> {spiceIcons(item.spice_level)}/4
            </span>
          )}
          {item.prep_time_minutes && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> {item.prep_time_minutes} min
            </span>
          )}
          {item.pricing_type === 'package' && item.serves_people && (
            <span className="text-gold/70">Package · Serves {item.serves_people}</span>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="text-gold font-medium">
            {isVariants && displayPrice !== null ? 'From ' : ''}
            {formatPrice(displayPrice)}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="flex items-center gap-1 rounded-full bg-gold/10 group-hover:bg-gold text-gold group-hover:text-bg-primary px-3 py-1.5 text-xs font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
      </div>
    </motion.div>
  );
}
