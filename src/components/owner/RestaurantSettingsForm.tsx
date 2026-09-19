'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '../shared/Toast';
import { Button } from '../shared/Button';
import type { Restaurant } from '@/types/database';

export function RestaurantSettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const [name, setName] = useState(restaurant.name);
  const [tagline, setTagline] = useState(restaurant.tagline ?? '');
  const [description, setDescription] = useState(restaurant.description ?? '');
  const [address, setAddress] = useState(restaurant.address ?? '');
  const [phone, setPhone] = useState(restaurant.phone ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await createClient()
      .from('restaurants')
      .update({ name, tagline: tagline || null, description: description || null, address: address || null, phone: phone || null })
      .eq('id', restaurant.id);
    setSaving(false);
    if (error) return toast.error('Could not save settings.');
    toast.success('Restaurant settings saved.');
  };

  return (
    <div className="max-w-xl space-y-4">
      <Field label="Restaurant Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
      <Field label="Tagline"><input value={tagline} onChange={(e) => setTagline(e.target.value)} className={inputClass} /></Field>
      <Field label="Description">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className={`${inputClass} resize-none`} />
      </Field>
      <Field label="Address"><input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} /></Field>
      <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} /></Field>
      <Button onClick={save} loading={saving} size="lg">Save Settings</Button>
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

const inputClass = 'w-full rounded-lg bg-bg-secondary border border-white/10 px-3 py-2.5 text-sm text-cream focus:border-gold/50 outline-none';
