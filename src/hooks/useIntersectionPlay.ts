'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Plays a <video> only while it's visible in the viewport, pauses otherwise.
 * Never lets a playback failure block the rest of the UI — callers should
 * fall back to the poster image on `error`.
 */
export function useIntersectionPlay<T extends HTMLVideoElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  const [errored, setErrored] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setVisible(entry.isIntersecting);
      },
      { threshold: 0.35 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || errored) return;
    if (visible) {
      el.play().catch(() => setErrored(true));
    } else {
      el.pause();
    }
  }, [visible, errored]);

  return { ref, errored, setErrored };
}
