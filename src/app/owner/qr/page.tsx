import { createClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { fetchTables } from '@/lib/data/tables';
import { QRManager } from '@/components/owner/QRManager';

export default async function OwnerQRPage() {
  const member = await getCurrentMember();
  if (!member) return null;
  const supabase = await createClient();
  const tables = await fetchTables(supabase, member.restaurantId);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-serif text-3xl text-cream mb-1">QR Codes</h1>
      <p className="text-cream/40 text-sm mb-8">Each code links straight to that table&apos;s menu — no app, no login.</p>
      <QRManager restaurantId={member.restaurantId} slug={member.restaurantSlug} initialTables={tables} />
    </div>
  );
}
