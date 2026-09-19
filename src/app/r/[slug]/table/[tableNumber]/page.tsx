import { createClient } from '@/lib/supabase/server';
import { fetchMenu } from '@/lib/data/menu';
import { CustomerMenuApp } from '@/components/customer/CustomerMenuApp';
import { ErrorState } from '@/components/shared/States';
import type { ResolvedTable } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function TablePage({
  params,
}: {
  params: Promise<{ slug: string; tableNumber: string }>;
}) {
  const { slug, tableNumber } = await params;
  const tableNum = Number(tableNumber);
  const supabase = await createClient();

  if (!Number.isInteger(tableNum) || tableNum <= 0) {
    return <UnavailableScreen reason="This table link looks invalid." />;
  }

  const { data, error } = await supabase.rpc('rpc_resolve_table', {
    p_slug: slug,
    p_table_number: tableNum,
  });

  const table = (Array.isArray(data) ? data[0] : data) as ResolvedTable | undefined;

  if (error || !table) {
    return <UnavailableScreen reason="We couldn't find this restaurant or table. Please re-scan the QR code." />;
  }

  if (table.table_is_disabled) {
    return <UnavailableScreen reason="This table is currently unavailable." />;
  }

  const { categories, itemsByCategory } = await fetchMenu(supabase, table.restaurant_id);

  if (categories.length === 0) {
    return <UnavailableScreen reason="The menu isn't available right now — please check with staff." />;
  }

  return (
    <CustomerMenuApp
      table={table}
      tableNumber={tableNum}
      categories={categories}
      itemsByCategory={itemsByCategory}
    />
  );
}

function UnavailableScreen({ reason }: { reason: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <ErrorState title="Table unavailable" description={reason} />
    </div>
  );
}
