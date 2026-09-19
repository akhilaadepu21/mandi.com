'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  side?: 'center' | 'right' | 'bottom';
}

export function Modal({ open, onClose, children, side = 'center' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  const panelVariants = {
    center: {
      initial: { opacity: 0, scale: 0.95, y: 12 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.97, y: 8 },
      className: 'items-center justify-center p-4',
      panel: 'w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl',
    },
    right: {
      initial: { x: '100%' },
      animate: { x: 0 },
      exit: { x: '100%' },
      className: 'items-stretch justify-end',
      panel: 'h-full w-full max-w-md overflow-y-auto',
    },
    bottom: {
      initial: { y: '100%' },
      animate: { y: 0 },
      exit: { y: '100%' },
      className: 'items-end justify-center',
      panel: 'w-full max-h-[92vh] overflow-y-auto rounded-t-2xl',
    },
  }[side];

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex" style={{}}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <div className={`relative flex w-full ${panelVariants.className}`}>
            <motion.div
              initial={panelVariants.initial}
              animate={panelVariants.animate}
              exit={panelVariants.exit}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className={`relative bg-bg-secondary border border-gold/20 shadow-2xl ${panelVariants.panel}`}
            >
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/40 hover:bg-black/60 text-cream"
              >
                <X className="w-4 h-4" />
              </button>
              {children}
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
