'use client';

import { useState } from 'react';
import { Plus, Trash2, ShieldCheck, ShieldOff, Copy, Check } from 'lucide-react';
import { Modal } from '../shared/Modal';
import { Button } from '../shared/Button';
import { toast } from '../shared/Toast';
import { PERMISSIONS, PERMISSION_LABELS, DEFAULT_PERMISSIONS, STAFF_ROLES, type StaffRole } from '@/lib/permissions';
import type { StaffMember } from '@/types/database';

const ROLE_LABELS: Record<StaffRole, string> = { manager: 'Manager', chef: 'Chef', staff: 'Staff / Waiter' };

export function StaffManager({ initialStaff, canManage }: { initialStaff: StaffMember[]; canManage: boolean }) {
  const [staff, setStaff] = useState(initialStaff);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [createdCreds, setCreatedCreds] = useState<{ email: string; tempPassword: string } | null>(null);

  const active = staff.filter((s) => !s.is_disabled).length;

  const patchLocal = (id: string, patch: Partial<StaffMember>) => {
    setStaff((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };

  const toggleDisabled = async (member: StaffMember) => {
    const res = await fetch(`/api/staff/${member.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ is_disabled: !member.is_disabled }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.message ?? 'Could not update account.');
    patchLocal(member.id, { is_disabled: !member.is_disabled });
    toast.success(`${member.full_name} ${member.is_disabled ? 'enabled' : 'disabled'}.`);
  };

  const deleteStaff = async (member: StaffMember) => {
    if (!confirm(`Delete ${member.full_name}'s account? They will immediately lose access.`)) return;
    const res = await fetch(`/api/staff/${member.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) return toast.error(data.message ?? 'Could not delete account.');
    setStaff((prev) => prev.filter((s) => s.id !== member.id));
    toast.success(`${member.full_name}'s account was deleted.`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-cream/50">
          {staff.length} Staff Member{staff.length !== 1 ? 's' : ''} · <span className="text-green-400">{active} Active</span>
          {staff.length - active > 0 && <span className="text-cream/30"> · {staff.length - active} Disabled</span>}
        </p>
        {canManage && (
          <Button size="sm" onClick={() => setShowAdd(true)}><Plus className="w-3.5 h-3.5" /> Add Staff</Button>
        )}
      </div>

      <div className="rounded-2xl bg-bg-secondary border border-white/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-cream/40 border-b border-white/5">
              <th className="px-4 py-3 font-normal">Name</th>
              <th className="px-4 py-3 font-normal">Role</th>
              <th className="px-4 py-3 font-normal">Login</th>
              <th className="px-4 py-3 font-normal">Status</th>
              {canManage && <th className="px-4 py-3 font-normal text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id} className="border-b border-white/5 last:border-0">
                <td className="px-4 py-3 text-cream cursor-pointer" onClick={() => canManage && setEditing(s)}>
                  {s.full_name ?? '—'}
                </td>
                <td className="px-4 py-3 text-cream/60 uppercase text-xs">{s.role}</td>
                <td className="px-4 py-3 text-cream/50 text-xs">{s.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${s.is_disabled ? 'bg-white/5 text-cream/40' : 'bg-green-600/20 text-green-300'}`}>
                    {s.is_disabled ? 'Disabled' : 'Active'}
                  </span>
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => toggleDisabled(s)} title={s.is_disabled ? 'Enable' : 'Disable'} className="text-cream/40 hover:text-gold">
                        {s.is_disabled ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteStaff(s)} title="Delete" className="text-cream/40 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {staff.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-cream/30">No staff accounts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <AddStaffModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onCreated={(m, creds) => {
          setStaff((prev) => [...prev, m]);
          setCreatedCreds(creds);
          setShowAdd(false);
        }}
      />

      <EditStaffModal member={editing} onClose={() => setEditing(null)} onSaved={(patch) => editing && patchLocal(editing.id, patch)} />

      <CredentialsModal creds={createdCreds} onClose={() => setCreatedCreds(null)} />
    </div>
  );
}

function AddStaffModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (member: StaffMember, creds: { email: string; tempPassword: string }) => void;
}) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<StaffRole>('staff');
  const [permissions, setPermissions] = useState<string[]>(DEFAULT_PERMISSIONS.staff);
  const [saving, setSaving] = useState(false);

  const changeRole = (r: StaffRole) => {
    setRole(r);
    setPermissions(DEFAULT_PERMISSIONS[r]);
  };

  const submit = async () => {
    if (!fullName.trim() || !email.trim()) return toast.error('Name and email are required.');
    setSaving(true);
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fullName, email, phone, role, permissions }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return toast.error(data.message ?? 'Could not create staff account.');
    onCreated(data.member, { email: data.email, tempPassword: data.tempPassword });
    setFullName(''); setEmail(''); setPhone(''); setRole('staff'); setPermissions(DEFAULT_PERMISSIONS.staff);
  };

  return (
    <Modal open={open} onClose={onClose} side="bottom">
      <div className="p-5">
        <h2 className="font-serif text-xl text-cream mb-4">Add Staff</h2>
        <div className="space-y-3">
          <Field label="Full Name"><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} /></Field>
          <Field label="Email / Username"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} /></Field>
          <Field label="Phone (optional)"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} /></Field>
          <Field label="Role">
            <div className="flex gap-2">
              {STAFF_ROLES.map((r) => (
                <button key={r} onClick={() => changeRole(r)} className={`px-3 py-1.5 rounded-full text-xs border ${role === r ? 'bg-gold text-bg-primary border-gold' : 'border-white/15 text-cream/60'}`}>
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </Field>
          <PermissionEditor permissions={permissions} onChange={setPermissions} />
        </div>
        <Button onClick={submit} loading={saving} size="lg" className="w-full mt-5">Create Staff Account</Button>
      </div>
    </Modal>
  );
}

function EditStaffModal({ member, onClose, onSaved }: { member: StaffMember | null; onClose: () => void; onSaved: (patch: Partial<StaffMember>) => void }) {
  const [permissions, setPermissions] = useState<string[]>(member?.permissions ?? []);
  const [phone, setPhone] = useState(member?.phone ?? '');
  const [saving, setSaving] = useState(false);

  if (!member) return null;

  const submit = async () => {
    setSaving(true);
    const res = await fetch(`/api/staff/${member.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ permissions, phone: phone || null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return toast.error(data.message ?? 'Could not save changes.');
    onSaved({ permissions, phone: phone || null });
    toast.success('Permissions updated.');
    onClose();
  };

  return (
    <Modal open={!!member} onClose={onClose} side="bottom">
      <div className="p-5">
        <h2 className="font-serif text-xl text-cream mb-1">{member.full_name}</h2>
        <p className="text-xs text-gold uppercase tracking-wide mb-4">{member.role}</p>
        <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} /></Field>
        <div className="mt-3">
          <PermissionEditor permissions={permissions} onChange={setPermissions} />
        </div>
        <Button onClick={submit} loading={saving} size="lg" className="w-full mt-5">Save Changes</Button>
      </div>
    </Modal>
  );
}

function CredentialsModal({ creds, onClose }: { creds: { email: string; tempPassword: string } | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  if (!creds) return null;

  const copy = () => {
    navigator.clipboard.writeText(`Email: ${creds.email}\nPassword: ${creds.tempPassword}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={!!creds} onClose={onClose}>
      <div className="p-6 text-center">
        <h2 className="font-serif text-xl text-cream mb-2">Staff Account Created</h2>
        <p className="text-sm text-cream/50 mb-5">Share these login details with them — this password is shown only once.</p>
        <div className="rounded-xl bg-bg-primary border border-white/10 p-4 text-left space-y-1 mb-4">
          <p className="text-xs text-cream/40">Email</p>
          <p className="text-cream font-mono text-sm mb-2">{creds.email}</p>
          <p className="text-xs text-cream/40">Temporary Password</p>
          <p className="text-cream font-mono text-sm">{creds.tempPassword}</p>
        </div>
        <Button onClick={copy} variant="secondary" className="w-full mb-2">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} {copied ? 'Copied' : 'Copy Credentials'}
        </Button>
        <Button onClick={onClose} className="w-full">Done</Button>
      </div>
    </Modal>
  );
}

function PermissionEditor({ permissions, onChange }: { permissions: string[]; onChange: (p: string[]) => void }) {
  const toggle = (p: string) => {
    onChange(permissions.includes(p) ? permissions.filter((x) => x !== p) : [...permissions, p]);
  };
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-cream/40 mb-2">Permissions</p>
      <div className="grid grid-cols-2 gap-2">
        {PERMISSIONS.map((p) => (
          <label key={p} className="flex items-center gap-2 text-xs text-cream/70">
            <input type="checkbox" checked={permissions.includes(p)} onChange={() => toggle(p)} className="accent-gold" />
            {PERMISSION_LABELS[p]}
          </label>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-cream/50 mb-1">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'w-full rounded-lg bg-bg-primary border border-white/10 px-3 py-2 text-sm text-cream focus:border-gold/50 outline-none';
