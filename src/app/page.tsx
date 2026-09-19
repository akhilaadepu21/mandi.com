import Link from 'next/link';
import { ChefHat, Users, LayoutDashboard, QrCode } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center bg-geo-pattern">
      <p className="text-xs tracking-[0.3em] text-gold uppercase mb-4">Restaurant Operating System</p>
      <h1 className="font-serif text-5xl sm:text-6xl text-cream mb-4">MANDI.COM</h1>
      <p className="text-cream/60 max-w-md mb-10">
        One connected platform for ordering, kitchen, staff, billing and business intelligence — built for Arabian Mandi dining.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl w-full">
        <Card href="/r/mandi-com/table/5" icon={QrCode} label="Customer Menu" hint="Table 5 demo" />
        <Card href="/kitchen" icon={ChefHat} label="Kitchen" hint="Staff login" />
        <Card href="/staff" icon={Users} label="Staff Floor" hint="Staff login" />
        <Card href="/owner" icon={LayoutDashboard} label="Owner Dashboard" hint="Staff login" />
      </div>

      <p className="text-xs text-cream/30 mt-10">
        Demo logins: owner@mandi.com · chef@mandi.com · staff@mandi.com · admin@mandi.com — password mandi1234
      </p>
    </div>
  );
}

function Card({ href, icon: Icon, label, hint }: { href: string; icon: React.ElementType; label: string; hint: string }) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 hover:border-gold/40 bg-bg-secondary p-5 transition-colors"
    >
      <Icon className="w-6 h-6 text-gold" />
      <span className="text-sm text-cream font-medium">{label}</span>
      <span className="text-[10px] text-cream/40">{hint}</span>
    </Link>
  );
}
