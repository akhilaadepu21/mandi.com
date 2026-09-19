import { formatDistanceToNow } from 'date-fns';
import { createClient } from '@/lib/supabase/server';
import { getCurrentMember, hasPermission } from '@/lib/auth';
import { fetchStaff, fetchAuditLogs } from '@/lib/data/staff';
import { StaffManager } from '@/components/owner/StaffManager';

export default async function OwnerStaffPage() {
  const member = await getCurrentMember();
  if (!member) return null;

  const supabase = await createClient();
  const canManage = hasPermission(member, 'manage_staff');
  const [staff, logs] = await Promise.all([
    fetchStaff(supabase, member.restaurantId),
    fetchAuditLogs(supabase, member.restaurantId),
  ]);

  return (
    <div className="p-8 max-w-5xl">
      <h1 className="font-serif text-3xl text-cream mb-1">Staff Management</h1>
      <p className="text-cream/40 text-sm mb-8">
        Every staff member gets their own login. Disabling an account revokes access immediately.
      </p>

      <StaffManager initialStaff={staff} canManage={canManage} />

      <h2 className="font-serif text-xl text-cream mt-10 mb-4">Recent Activity</h2>
      <div className="rounded-2xl bg-bg-secondary border border-white/5 divide-y divide-white/5">
        {logs.length === 0 && <p className="px-4 py-6 text-sm text-cream/30">No activity logged yet.</p>}
        {logs.map((log) => (
          <div key={log.id} className="px-4 py-3 flex items-center justify-between text-sm">
            <span className="text-cream/70">{log.action}</span>
            <span className="text-xs text-cream/30 shrink-0 ml-4">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
