import { ShieldAlert, UserX, Ban } from 'lucide-react';

type DenialReason = 'no_profile' | 'disabled' | 'wrong_role';

const COPY: Record<DenialReason, { icon: React.ElementType; title: string; description: string }> = {
  no_profile: {
    icon: UserX,
    title: 'No restaurant profile found',
    description: "Your account is authenticated, but no restaurant profile is associated with it. Ask the restaurant owner to add you as staff.",
  },
  disabled: {
    icon: Ban,
    title: 'Account disabled',
    description: 'Your account has been disabled. Contact your restaurant administrator.',
  },
  wrong_role: {
    icon: ShieldAlert,
    title: 'Access denied',
    description: "You don't have permission to access this dashboard.",
  },
};

/** Renders the specific denial reason from checkRouteAccess() — never the
 * generic "Not authorized" text, so the actual problem (disabled account,
 * missing profile, wrong role) is always visible instead of guessed at. */
export function AccessDenied({ reason }: { reason: DenialReason }) {
  const { icon: Icon, title, description } = COPY[reason];
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
      <Icon className="w-8 h-8 text-red-400" />
      <p className="text-cream font-medium">{title}</p>
      <p className="text-sm text-cream/50 max-w-xs">{description}</p>
    </div>
  );
}
