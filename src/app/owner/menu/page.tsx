import { createClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { fetchMenuForOwner } from '@/lib/data/menu';
import { MenuManager } from '@/components/owner/MenuManager';

export default async function OwnerMenuPage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const { categories, itemsByCategory } = await fetchMenuForOwner(supabase, member.restaurantId);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-serif text-3xl text-cream mb-1">Menu Management</h1>
      <p className="text-cream/40 text-sm mb-8">
        Prices left blank show as &quot;Price not configured&quot; to customers and can&apos;t be ordered until set.
        Choose <strong className="text-cream/60">Single Price</strong>, <strong className="text-cream/60">Multiple Sizes</strong>,
        or <strong className="text-cream/60">Package</strong> per dish to match how it&apos;s priced on your menu card.
      </p>
      <MenuManager restaurantId={member.restaurantId} initialCategories={categories} initialItems={itemsByCategory} />
    </div>
  );
}
