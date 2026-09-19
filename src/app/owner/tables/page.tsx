import { createClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { fetchTables } from '@/lib/data/tables';
import { TablesManager } from '@/components/owner/TablesManager';

export default async function OwnerTablesPage() {
  const member = await getCurrentMember();
  if (!member) return null;
  const supabase = await createClient();
  const tables = await fetchTables(supabase, member.restaurantId);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-serif text-3xl text-cream mb-1">Tables</h1>
      <p className="text-cream/40 text-sm mb-8">Manage dining tables. Each gets its own QR code under QR Codes.</p>
      <TablesManager restaurantId={member.restaurantId} initialTables={tables} />
    </div>
  );
}
