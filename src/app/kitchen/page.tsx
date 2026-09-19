import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/auth';
import { KitchenHeader } from '@/components/kitchen/KitchenHeader';
import { KitchenInsights } from '@/components/kitchen/KitchenInsights';
import { OrderBoard } from '@/components/kitchen/OrderBoard';
import { AccessDenied } from '@/components/shared/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function KitchenPage() {
  const access = await checkRouteAccess('kitchen');

  if (!access.allowed) {
    if (access.reason === 'not_signed_in') redirect('/login?next=/kitchen');
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <AccessDenied reason={access.reason} />
      </div>
    );
  }

  const member = access.member;
  return (
    <div className="min-h-screen bg-black">
      <KitchenHeader restaurantName={member.restaurantName} />
      <KitchenInsights restaurantId={member.restaurantId} />
      <OrderBoard restaurantId={member.restaurantId} />
    </div>
  );
}
