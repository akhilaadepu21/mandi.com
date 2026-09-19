'use client';

import { Loader2, AlertCircle, Inbox, WifiOff } from 'lucide-react';
import { Button } from './Button';

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-cream/60">
      <Loader2 className="w-6 h-6 animate-spin text-gold" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function EmptyState({ title, description, icon: Icon = Inbox }: { title: string; description?: string; icon?: React.ElementType }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center px-6">
      <Icon className="w-8 h-8 text-gold/50 mb-2" />
      <p className="text-cream font-medium">{title}</p>
      {description && <p className="text-sm text-cream/50 max-w-xs">{description}</p>}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
      <AlertCircle className="w-8 h-8 text-red-400" />
      <p className="text-cream font-medium">{title}</p>
      {description && <p className="text-sm text-cream/50 max-w-xs">{description}</p>}
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry} className="mt-2">
          Try again
        </Button>
      )}
    </div>
  );
}

export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null;
  return (
    <div className="fixed top-0 inset-x-0 z-[90] bg-red-900/90 text-white text-xs py-2 px-4 flex items-center justify-center gap-2">
      <WifiOff className="w-3.5 h-3.5" />
      You&apos;re offline — reconnecting. Your cart is safe, but ordering needs a connection.
    </div>
  );
}
