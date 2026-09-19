'use client';

import { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import { useIntersectionPlay } from '@/hooks/useIntersectionPlay';
import type { MenuMedia } from '@/types/database';

/**
 * Fallback chain: video -> poster image -> generic food placeholder.
 * A media failure at any stage must never block ordering.
 */
export function DishVideo({
  media,
  name,
  className = '',
  large = false,
}: {
  media: MenuMedia | null | undefined;
  name: string;
  className?: string;
  large?: boolean;
}) {
  const { ref, errored, setErrored } = useIntersectionPlay<HTMLVideoElement>();
  const [posterErrored, setPosterErrored] = useState(false);

  const hasVideo = !!media?.video_url && !errored;
  const hasPoster = !!media?.poster_url && !posterErrored;

  return (
    <div className={`relative overflow-hidden bg-[#1c140d] ${className}`}>
      {hasVideo ? (
        <video
          ref={ref}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          loop
          playsInline
          preload="metadata"
          poster={media?.poster_url ?? undefined}
          onError={() => setErrored(true)}
        >
          {media?.video_url_webm && <source src={media.video_url_webm} type="video/webm" />}
          <source src={media!.video_url!} type="video/mp4" />
        </video>
      ) : hasPoster ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media!.poster_url!}
          alt={name}
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setPosterErrored(true)}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#241a10] to-[#0f0a06] bg-geo-pattern">
          <UtensilsCrossed className={large ? 'w-10 h-10 text-gold/40' : 'w-6 h-6 text-gold/40'} />
          {large && <span className="text-xs text-cream/30">Video coming soon</span>}
        </div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/0 to-black/10 pointer-events-none" />
    </div>
  );
}
