'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, UtensilsCrossed, QrCode, BarChart3, Sparkles, Grid3x3, Users, Receipt, Settings } from 'lucide-react';
import { SignOutButton } from '../shared/SignOutButton';

const NAV = [
  { href: '/owner', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/owner/orders', label: 'Orders', icon: Receipt },
  { href: '/owner/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/owner/tables', label: 'Tables', icon: Grid3x3 },
  { href: '/owner/qr', label: 'QR Codes', icon: QrCode },
  { href: '/owner/staff', label: 'Staff', icon: Users },
  { href: '/owner/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/owner/ai', label: 'AI Insights', icon: Sparkles },
  { href: '/owner/settings', label: 'Settings', icon: Settings },
];

export function OwnerShell({ restaurantName, children }: { restaurantName: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 shrink-0 border-r border-white/5 bg-bg-secondary flex flex-col">
        <div className="p-5 border-b border-white/5">
          <p className="font-serif text-lg text-cream">MANDI.COM</p>
          <p className="text-[11px] text-gold/70 uppercase tracking-wide">{restaurantName}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                  active ? 'bg-gold/15 text-gold' : 'text-cream/60 hover:bg-white/5 hover:text-cream'
                }`}
              >
                <Icon className="w-4 h-4" /> {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <SignOutButton className="flex items-center gap-2 text-xs text-cream/40 hover:text-red-400 px-3 py-2" />
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
