import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types/database';
import type { Permission } from '@/lib/permissions';

export interface CurrentMember {
  userId: string;
  email: string | null;
  fullName: string | null;
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  role: UserRole;
  permissions: string[];
}

type AuthStatus =
  | { status: 'ok'; member: CurrentMember }
  | { status: 'not_signed_in' }
  | { status: 'no_profile' }
  | { status: 'disabled' };

/**
 * Single source of truth for "who is this and what restaurant/role do they
 * have". Distinguishes not-signed-in / no-profile / disabled / ok instead of
 * collapsing them all to null — that collapse was the reason a disabled or
 * profile-less account looked identical to "not logged in" everywhere else
 * in the app. Uses rpc_get_my_membership() (SECURITY DEFINER) specifically
 * because the normal RLS-guarded select on restaurant_members hides a
 * disabled row from its own owner, which made "disabled" indistinguishable
 * from "no profile at all".
 */
async function resolveAuthStatus(): Promise<AuthStatus> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: 'not_signed_in' };

  const { data } = await supabase.rpc('rpc_get_my_membership');
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { status: 'no_profile' };
  if (row.is_disabled) return { status: 'disabled' };

  return {
    status: 'ok',
    member: {
      userId: user.id,
      email: user.email ?? null,
      fullName: row.full_name ?? null,
      restaurantId: row.restaurant_id,
      restaurantName: row.restaurant_name ?? 'Restaurant',
      restaurantSlug: row.restaurant_slug ?? '',
      role: row.role,
      permissions: row.permissions ?? [],
    },
  };
}

/**
 * Returns the signed-in user's restaurant membership, or null if not signed
 * in, no profile, or disabled — kept for existing pages that only ever
 * needed "is there a usable member" (they redirect to /login either way).
 * New protected routes should use checkRouteAccess() instead, since it can
 * tell the three null-cases apart and show the right message.
 */
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const result = await resolveAuthStatus();
  return result.status === 'ok' ? result.member : null;
}

export function roleAllowed(role: UserRole, allowed: UserRole[]): boolean {
  return allowed.includes(role);
}

/** Owner/super_admin always pass. Every other role — including manager —
 * needs the specific permission granted by the owner; manager gets no
 * automatic blanket access. Mirrors the has_permission() SQL function. */
export function hasPermission(member: CurrentMember, permission: Permission): boolean {
  return member.role === 'owner' || member.role === 'super_admin' || member.permissions.includes(permission);
}

// ---------------------------------------------------------------------------
// Centralized route authorization — every protected route (/owner, /staff,
// /kitchen, /super-admin) calls this SAME function instead of hand-rolling
// its own role check, so there is exactly one place that defines who can
// reach which dashboard.
export type RouteKey = 'owner' | 'staff' | 'kitchen' | 'super-admin';

const ROUTE_ROLES: Record<RouteKey, UserRole[]> = {
  owner: ['owner', 'manager', 'super_admin'],
  staff: ['staff', 'owner', 'manager', 'super_admin'],
  kitchen: ['chef', 'owner', 'manager', 'super_admin'],
  'super-admin': ['super_admin'],
};

/** Where a role lands after login when no explicit `next` redirect was requested. */
export const ROLE_HOME: Record<UserRole, string> = {
  super_admin: '/super-admin',
  owner: '/owner',
  manager: '/owner',
  chef: '/kitchen',
  staff: '/staff',
  customer: '/',
};

export type RouteAccess =
  | { allowed: true; member: CurrentMember }
  | { allowed: false; reason: 'not_signed_in' }
  | { allowed: false; reason: 'no_profile' }
  | { allowed: false; reason: 'disabled' }
  | { allowed: false; reason: 'wrong_role'; member: CurrentMember };

export async function checkRouteAccess(route: RouteKey): Promise<RouteAccess> {
  const status = await resolveAuthStatus();

  if (process.env.NODE_ENV !== 'production') {
    // --- AUTH DEBUG (dev-only; stripped automatically in production builds) ---
    console.log('[AUTH DEBUG]', {
      route,
      status: status.status,
      role: status.status === 'ok' ? status.member.role : undefined,
      restaurant: status.status === 'ok' ? status.member.restaurantSlug : undefined,
      result: status.status === 'ok' ? (ROUTE_ROLES[route].includes(status.member.role) ? 'ALLOW' : 'DENY (wrong_role)') : `DENY (${status.status})`,
    });
    // ---------------------------------------------------------------------
  }

  if (status.status !== 'ok') return { allowed: false, reason: status.status };
  if (!ROUTE_ROLES[route].includes(status.member.role)) {
    return { allowed: false, reason: 'wrong_role', member: status.member };
  }
  return { allowed: true, member: status.member };
}
