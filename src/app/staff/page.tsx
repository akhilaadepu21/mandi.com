import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/auth';
import { FloorMap } from '@/components/staff/FloorMap';
import { AccessDenied } from '@/components/shared/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const access = await checkRouteAccess('staff');

  if (!access.allowed) {
    if (access.reason === 'not_signed_in') redirect('/login?next=/staff');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AccessDenied reason={access.reason} />
      </div>
    );
  }

  const member = access.member;
  return <FloorMap restaurantId={member.restaurantId} restaurantName={member.restaurantName} actorName={member.fullName ?? member.email ?? 'Staff'} />;
}
