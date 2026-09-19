'use client';

import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

export function Hero({
  restaurantName,
  tagline,
  tableNumber,
  heroVideoUrl,
  heroPosterUrl,
  onExplore,
}: {
  restaurantName: string;
  tagline: string | null;
  tableNumber: number;
  heroVideoUrl: string | null;
  heroPosterUrl: string | null;
  onExplore: () => void;
}) {
  const [videoOk, setVideoOk] = useState(!!heroVideoUrl);

  return (
    <div className="relative h-[78vh] min-h-[520px] overflow-hidden -mx-4">
      <div className="absolute inset-0 bg-geo-pattern opacity-40" />
      {videoOk && heroVideoUrl ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={heroPosterUrl ?? undefined}
          onError={() => setVideoOk(false)}
        >
          <source src={heroVideoUrl} type="video/mp4" />
        </video>
      ) : heroPosterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={heroPosterUrl} alt={restaurantName} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[#241a10] via-[#17110c] to-[#0A0908]" />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/40 to-black/50" />

      <motion.div
        animate={{ y: [0, -14, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute right-8 top-24 w-24 h-24 rounded-full bg-gold/10 blur-2xl"
      />

      <div className="relative h-full flex flex-col items-center justify-center text-center px-6">
        <span className="inline-block rounded-full border border-gold/40 px-3 py-1 text-xs tracking-widest text-gold uppercase mb-6">
          Table {tableNumber}
        </span>
        <p className="text-xs tracking-[0.3em] text-cream/60 uppercase mb-3">Authentic Arabian Cuisine</p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="font-serif text-5xl sm:text-6xl leading-[1.05] text-cream text-balance"
        >
          Taste the<br />Tradition.
        </motion.h1>
        <p className="mt-4 text-cream/60 max-w-xs">Experience the Mandi — {tagline ?? 'Arabian Food'}.</p>

        <button
          onClick={onExplore}
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gold text-bg-primary px-7 py-3.5 font-medium hover:bg-gold-amber transition-colors"
        >
          Explore Menu
        </button>

        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-6"
        >
          <ChevronDown className="w-5 h-5 text-cream/40" />
        </motion.div>
      </div>
    </div>
  );
}
