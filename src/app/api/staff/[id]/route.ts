import { NextResponse } from 'next/server';
import { getCurrentMember, roleAllowed, hasPermission } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

async function loadTarget(admin: ReturnType<typeof createAdminClient>, id: string, restaurantId: string) {
  const { data: target } = await admin.from('restaurant_members').select('*').eq('id', id).maybeSingle();
  if (!target || target.restaurant_id !== restaurantId) return null;
  return target;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member || !roleAllowed(member.role, ['owner', 'manager', 'super_admin'])) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!hasPermission(member, 'manage_staff')) {
    return NextResponse.json({ error: 'forbidden', message: 'You do not have permission to manage staff.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const target = await loadTarget(admin, id, member.restaurantId);
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (target.user_id === member.userId) {
    return NextResponse.json({ error: 'forbidden', message: 'You cannot change your own staff account here.' }, { status: 403 });
  }
  if ((target.role === 'owner' || target.role === 'manager') && member.role !== 'owner' && member.role !== 'super_admin') {
    return NextResponse.json({ error: 'forbidden', message: 'Only an owner can modify a manager or owner account.' }, { status: 403 });
  }

  const patch = (await req.json()) as Partial<{
    full_name: string; phone: string | null; role: string; permissions: string[]; is_disabled: boolean;
  }>;

  const allowed: Record<string, unknown> = {};
  for (const key of ['full_name', 'phone', 'role', 'permissions', 'is_disabled'] as const) {
    if (key in patch) allowed[key] = patch[key];
  }

  const { data: updated, error } = await admin.from('restaurant_members').update(allowed).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: 'update_failed', message: error.message }, { status: 400 });

  if ('is_disabled' in allowed) {
    await admin.from('audit_logs').insert({
      restaurant_id: member.restaurantId,
      user_id: member.userId,
      actor_name: member.fullName ?? member.email ?? 'Owner',
      action: `${allowed.is_disabled ? 'Disabled' : 'Enabled'} staff account for ${target.full_name ?? target.email}`,
    });
  }

  return NextResponse.json({ member: updated });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const member = await getCurrentMember();
  if (!member || !roleAllowed(member.role, ['owner', 'manager', 'super_admin'])) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!hasPermission(member, 'manage_staff')) {
    return NextResponse.json({ error: 'forbidden', message: 'You do not have permission to manage staff.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const target = await loadTarget(admin, id, member.restaurantId);
  if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  if (target.user_id === member.userId) {
    return NextResponse.json({ error: 'forbidden', message: 'You cannot delete your own staff account here.' }, { status: 403 });
  }
  if ((target.role === 'owner' || target.role === 'manager') && member.role !== 'owner' && member.role !== 'super_admin') {
    return NextResponse.json({ error: 'forbidden', message: 'Only an owner can remove a manager or owner account.' }, { status: 403 });
  }

  const { error } = await admin.from('restaurant_members').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'delete_failed', message: error.message }, { status: 400 });

  // Best-effort: also remove the login itself. If this fails the restaurant
  // access is already revoked (the membership row is gone), which is what
  // actually matters for tenant security.
  await admin.auth.admin.deleteUser(target.user_id).catch(() => {});

  await admin.from('audit_logs').insert({
    restaurant_id: member.restaurantId,
    user_id: member.userId,
    actor_name: member.fullName ?? member.email ?? 'Owner',
    action: `Deleted staff account for ${target.full_name ?? target.email}`,
  });

  return NextResponse.json({ success: true });
}
