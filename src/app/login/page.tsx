'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/shared/Button';
import { createClient } from '@/lib/supabase/client';

const ROLE_HOME: Record<string, string> = {
  super_admin: '/super-admin',
  owner: '/owner',
  manager: '/owner',
  chef: '/kitchen',
  staff: '/staff',
};

function LoginInner() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitNext = searchParams.get('next');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Only follow an explicit `next` when it was actually the reason we got
    // here (bounced off a protected page). Otherwise land each role on its
    // own home — a bare visit to /login must never send everyone to /owner
    // regardless of who they are.
    let destination = explicitNext ?? '/owner';
    if (!explicitNext) {
      const { data } = await supabase.rpc('rpc_get_my_membership');
      const role = Array.isArray(data) ? data[0]?.role : data?.role;
      destination = (role && ROLE_HOME[role]) || '/owner';
    }

    setLoading(false);
    router.push(destination);
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-bg-secondary border border-white/5 p-8">
        <h1 className="font-serif text-2xl text-cream mb-1">MANDI.COM</h1>
        <p className="text-xs text-gold uppercase tracking-widest mb-6">Staff Sign In</p>

        <label className="block text-xs text-cream/50 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl bg-bg-primary border border-white/10 px-3 py-2.5 text-sm text-cream mb-4 focus:border-gold/50 outline-none"
        />

        <label className="block text-xs text-cream/50 mb-1">Password</label>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl bg-bg-primary border border-white/10 px-3 py-2.5 text-sm text-cream mb-4 focus:border-gold/50 outline-none"
        />

        {error && <p className="text-xs text-red-400 mb-4">{error}</p>}

        <Button type="submit" loading={loading} className="w-full" size="lg">Sign In</Button>

        <p className="text-[11px] text-cream/30 mt-5 text-center">
          Demo logins (after seeding): owner@mandi.com / manager@mandi.com / chef@mandi.com / staff@mandi.com — password mandi1234
        </p>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
