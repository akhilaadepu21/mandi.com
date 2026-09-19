import { redirect } from 'next/navigation';
import { checkRouteAccess } from '@/lib/auth';
import { OwnerShell } from '@/components/owner/OwnerShell';
import { AccessDenied } from '@/components/shared/AccessDenied';

export const dynamic = 'force-dynamic';

export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const access = await checkRouteAccess('owner');

  if (!access.allowed) {
    if (access.reason === 'not_signed_in') redirect('/login?next=/owner');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <AccessDenied reason={access.reason} />
      </div>
    );
  }

  return <OwnerShell restaurantName={access.member.restaurantName}>{children}</OwnerShell>;
}
