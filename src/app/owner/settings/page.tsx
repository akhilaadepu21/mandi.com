import { createClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { RestaurantSettingsForm } from '@/components/owner/RestaurantSettingsForm';
import { AccessDenied } from '@/components/shared/AccessDenied';

export default async function OwnerSettingsPage() {
  const member = await getCurrentMember();
  if (!member) return null;

  if (member.role !== 'owner' && member.role !== 'super_admin') {
    return (
      <div className="p-8">
        <AccessDenied reason="wrong_role" />
      </div>
    );
  }

  const supabase = await createClient();
  const { data: restaurant } = await supabase.from('restaurants').select('*').eq('id', member.restaurantId).single();
  if (!restaurant) return null;

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="font-serif text-3xl text-cream mb-1">Settings</h1>
      <p className="text-cream/40 text-sm mb-8">Restaurant details shown across the customer menu and receipts.</p>
      <RestaurantSettingsForm restaurant={restaurant} />
    </div>
  );
}
