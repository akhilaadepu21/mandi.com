import { NextResponse } from 'next/server';
import { getCurrentMember, roleAllowed, hasPermission } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { STAFF_ROLES } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

function generateTempPassword() {
  return `Mandi-${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 100)}!`;
}

export async function POST(req: Request) {
  const member = await getCurrentMember();
  if (!member || !roleAllowed(member.role, ['owner', 'manager', 'super_admin'])) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  if (!hasPermission(member, 'manage_staff')) {
    return NextResponse.json({ error: 'forbidden', message: 'You do not have permission to manage staff.' }, { status: 403 });
  }

  const body = await req.json();
  const { email, fullName, phone, role, permissions } = body as {
    email: string; fullName: string; phone?: string; role: string; permissions: string[];
  };

  if (!email || !fullName || !STAFF_ROLES.includes(role as any)) {
    return NextResponse.json({ error: 'invalid_request', message: 'Name, email, and a valid role are required.' }, { status: 400 });
  }

  // Only an owner may create another manager — a manager can create chefs/staff but not peers.
  if (role === 'manager' && member.role !== 'owner' && member.role !== 'super_admin') {
    return NextResponse.json({ error: 'forbidden', message: 'Only an owner can create a manager account.' }, { status: 403 });
  }

  const admin = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createErr || !created.user) {
    return NextResponse.json({ error: 'create_failed', message: createErr?.message ?? 'Could not create login.' }, { status: 400 });
  }

  const { data: membership, error: memberErr } = await admin
    .from('restaurant_members')
    .insert({
      restaurant_id: member.restaurantId,
      user_id: created.user.id,
      role,
      email,
      full_name: fullName,
      phone: phone || null,
      permissions: permissions ?? [],
      invited_by: member.userId,
    })
    .select()
    .single();

  if (memberErr) {
    // Roll back the orphaned auth user so a failed invite doesn't leave a dangling login.
    await admin.auth.admin.deleteUser(created.user.id);
    return NextResponse.json({ error: 'create_failed', message: memberErr.message }, { status: 400 });
  }

  await admin.from('audit_logs').insert({
    restaurant_id: member.restaurantId,
    user_id: member.userId,
    actor_name: member.fullName ?? member.email ?? 'Owner',
    action: `Created staff account for ${fullName} (${role})`,
  });

  return NextResponse.json({ member: membership, tempPassword, email });
}
