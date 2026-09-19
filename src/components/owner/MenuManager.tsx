'use client';

import { useRef, useState } from 'react';
import { Plus, Trash2, Upload, Star, StarOff, Loader2, GripVertical } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast } from '../shared/Toast';
import { Button } from '../shared/Button';
import { formatPrice, spiceLabel } from '@/lib/format';
import type { MenuCategory, MenuItem, MenuItemPortion, PricingType, SpiceLevel } from '@/types/database';

const SPICE_LEVELS: SpiceLevel[] = ['none', 'mild', 'medium', 'hot', 'extra_hot'];
const PRICING_TYPES: { value: PricingType; label: string }[] = [
  { value: 'single', label: 'Single Price' },
  { value: 'variants', label: 'Multiple Sizes' },
  { value: 'package', label: 'Package' },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `item-${Date.now()}`;
}

export function MenuManager({
  restaurantId,
  initialCategories,
  initialItems,
}: {
  restaurantId: string;
  initialCategories: MenuCategory[];
  initialItems: Record<string, MenuItem[]>;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [itemsByCategory, setItemsByCategory] = useState(initialItems);
  const [newCategoryName, setNewCategoryName] = useState('');

  const supabase = createClient();

  const refreshCategory = (categoryId: string, updater: (items: MenuItem[]) => MenuItem[]) => {
    setItemsByCategory((prev) => ({ ...prev, [categoryId]: updater(prev[categoryId] ?? []) }));
  };

  const addCategory = async () => {
    if (!newCategoryName.trim()) return;
    const { data, error } = await supabase
      .from('menu_categories')
      .insert({ restaurant_id: restaurantId, name: newCategoryName, slug: slugify(newCategoryName), sort_order: categories.length })
      .select()
      .single();
    if (error || !data) return toast.error('Could not add category.');
    setCategories((prev) => [...prev, data]);
    setItemsByCategory((prev) => ({ ...prev, [data.id]: [] }));
    setNewCategoryName('');
  };

  const addItem = async (categoryId: string) => {
    const name = prompt('Dish name?');
    if (!name?.trim()) return;
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        category_id: categoryId,
        name,
        slug: slugify(name),
        description: '',
        pricing_type: 'single',
        base_price: null,
        is_available: false,
        sort_order: (itemsByCategory[categoryId] ?? []).length,
      })
      .select()
      .single();
    if (error || !data) return toast.error('Could not add dish.');
    refreshCategory(categoryId, (items) => [...items, { ...data, portions: [], media: null }]);
    toast.success(`Added "${name}" — set a price and mark it available.`);
  };

  const deleteItem = async (categoryId: string, itemId: string) => {
    if (!confirm('Delete this dish?')) return;
    const { error } = await supabase.from('menu_items').delete().eq('id', itemId);
    if (error) return toast.error('Could not delete dish.');
    refreshCategory(categoryId, (items) => items.filter((i) => i.id !== itemId));
  };

  const updateItem = async (categoryId: string, itemId: string, patch: Partial<MenuItem>) => {
    refreshCategory(categoryId, (items) => items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)));
    const { error } = await supabase.from('menu_items').update(patch).eq('id', itemId);
    if (error) toast.error('Could not save change.');
  };

  const setPortionsLocal = (categoryId: string, itemId: string, portions: MenuItemPortion[]) => {
    refreshCategory(categoryId, (items) => items.map((i) => (i.id === itemId ? { ...i, portions } : i)));
  };

  return (
    <div className="space-y-8">
      <div className="flex gap-2">
        <input
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          placeholder="New category name…"
          className="rounded-lg bg-bg-secondary border border-white/10 px-3 py-2 text-sm text-cream w-64"
        />
        <Button size="sm" onClick={addCategory}><Plus className="w-3.5 h-3.5" /> Add Category</Button>
      </div>

      {categories.map((cat) => (
        <section key={cat.id}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-xl text-cream">{cat.name}</h2>
            <Button size="sm" variant="secondary" onClick={() => addItem(cat.id)}><Plus className="w-3.5 h-3.5" /> Add Dish</Button>
          </div>
          <div className="space-y-3">
            {(itemsByCategory[cat.id] ?? []).map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onUpdate={(patch) => updateItem(cat.id, item.id, patch)}
                onDelete={() => deleteItem(cat.id, item.id)}
                onPortionsChange={(portions) => setPortionsLocal(cat.id, item.id, portions)}
              />
            ))}
            {(itemsByCategory[cat.id] ?? []).length === 0 && (
              <p className="text-sm text-cream/30 py-3">No dishes yet in this category.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function ItemRow({
  item,
  onUpdate,
  onDelete,
  onPortionsChange,
}: {
  item: MenuItem;
  onUpdate: (patch: Partial<MenuItem>) => void;
  onDelete: () => void;
  onPortionsChange: (portions: MenuItemPortion[]) => void;
}) {
  const [price, setPrice] = useState(item.base_price?.toString() ?? '');
  const [prepTime, setPrepTime] = useState(item.prep_time_minutes?.toString() ?? '');
  const [uploading, setUploading] = useState<'video' | 'poster' | null>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const posterInput = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const savePrice = () => {
    const parsed = price.trim() === '' ? null : Number(price);
    onUpdate({ base_price: Number.isFinite(parsed as number) ? parsed : null });
  };

  const savePrepTime = () => {
    const parsed = prepTime.trim() === '' ? null : Number(prepTime);
    onUpdate({ prep_time_minutes: Number.isFinite(parsed as number) ? parsed : null });
  };

  const changePricingType = (pricingType: PricingType) => {
    onUpdate({ pricing_type: pricingType });
  };

  const addVariant = async () => {
    const portions = item.portions ?? [];
    const { data, error } = await supabase
      .from('menu_item_portions')
      .insert({ menu_item_id: item.id, label: `Size ${portions.length + 1}`, price: null, sort_order: portions.length })
      .select()
      .single();
    if (error || !data) return toast.error('Could not add size.');
    onPortionsChange([...portions, data]);
  };

  const updateVariant = async (portionId: string, patch: Partial<MenuItemPortion>) => {
    const portions = (item.portions ?? []).map((p) => (p.id === portionId ? { ...p, ...patch } : p));
    onPortionsChange(portions);
    const { error } = await supabase.from('menu_item_portions').update(patch).eq('id', portionId);
    if (error) toast.error('Could not save size.');
  };

  const removeVariant = async (portionId: string) => {
    const portions = (item.portions ?? []).filter((p) => p.id !== portionId);
    onPortionsChange(portions);
    const { error } = await supabase.from('menu_item_portions').delete().eq('id', portionId);
    if (error) toast.error('Could not remove size.');
  };

  const upload = async (kind: 'video' | 'poster', file: File) => {
    setUploading(kind);
    const path = `${item.restaurant_id}/${item.id}/${kind}-${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage.from('menu-media').upload(path, file, { upsert: true });
    if (uploadError) {
      setUploading(null);
      toast.error(`Upload failed: ${uploadError.message}`);
      return;
    }
    const { data: urlData } = supabase.storage.from('menu-media').getPublicUrl(path);
    const column = kind === 'video' ? 'video_url' : 'poster_url';
    const { error } = await supabase
      .from('menu_media')
      .upsert({ menu_item_id: item.id, [column]: urlData.publicUrl }, { onConflict: 'menu_item_id' });
    setUploading(null);
    if (error) return toast.error('Could not save media.');
    onUpdate({ media: { ...(item.media ?? { id: '', menu_item_id: item.id, video_url: null, video_url_webm: null, poster_url: null, thumbnail_url: null }), [column]: urlData.publicUrl } });
    toast.success(`${kind === 'video' ? 'Video' : 'Poster'} uploaded.`);
  };

  return (
    <div className="rounded-xl bg-bg-secondary border border-white/5 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => onUpdate({ is_featured: !item.is_featured })} title="Featured">
          {item.is_featured ? <Star className="w-4 h-4 text-gold fill-gold" /> : <StarOff className="w-4 h-4 text-cream/20" />}
        </button>

        <div className="min-w-[160px]">
          <p className="text-cream font-medium">{item.name}</p>
          <p className="text-[11px] text-cream/30">{item.is_veg ? 'Veg' : 'Non-veg'}</p>
        </div>

        <select
          value={item.spice_level}
          onChange={(e) => onUpdate({ spice_level: e.target.value as SpiceLevel })}
          className="rounded-md bg-bg-primary border border-white/10 px-2 py-1 text-xs text-cream"
        >
          {SPICE_LEVELS.map((s) => <option key={s} value={s}>{spiceLabel(s)}</option>)}
        </select>

        <input
          value={prepTime}
          onChange={(e) => setPrepTime(e.target.value)}
          onBlur={savePrepTime}
          placeholder="min"
          className="w-14 rounded-md bg-bg-primary border border-white/10 px-2 py-1 text-xs text-cream"
        />

        <button
          onClick={() => onUpdate({ is_available: !item.is_available })}
          className={`text-xs px-3 py-1.5 rounded-full ${item.is_available ? 'bg-green-600/20 text-green-300' : 'bg-white/5 text-cream/40'}`}
        >
          {item.is_available ? 'Available' : 'Hidden'}
        </button>

        <button onClick={() => videoInput.current?.click()} className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-cream/60 hover:text-gold flex items-center gap-1">
          {uploading === 'video' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Video
        </button>
        <input ref={videoInput} type="file" accept="video/mp4,video/webm" hidden onChange={(e) => e.target.files?.[0] && upload('video', e.target.files[0])} />

        <button onClick={() => posterInput.current?.click()} className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-cream/60 hover:text-gold flex items-center gap-1">
          {uploading === 'poster' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />} Poster
        </button>
        <input ref={posterInput} type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && upload('poster', e.target.files[0])} />

        <button onClick={onDelete} className="ml-auto text-cream/20 hover:text-red-400">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1 mb-3">
          {PRICING_TYPES.map((pt) => (
            <button
              key={pt.value}
              onClick={() => changePricingType(pt.value)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                item.pricing_type === pt.value
                  ? 'bg-gold text-bg-primary border-gold'
                  : 'border-white/10 text-cream/50 hover:border-gold/40'
              }`}
            >
              {pt.label}
            </button>
          ))}
        </div>

        {item.pricing_type === 'variants' ? (
          <div className="space-y-2">
            {(item.portions ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <GripVertical className="w-3.5 h-3.5 text-cream/20 shrink-0" />
                <input
                  defaultValue={p.label}
                  onBlur={(e) => e.target.value.trim() && e.target.value !== p.label && updateVariant(p.id, { label: e.target.value.trim() })}
                  className="w-40 rounded-md bg-bg-primary border border-white/10 px-2 py-1 text-sm text-cream"
                  placeholder="Size name"
                />
                <label className="flex items-center gap-1 text-xs text-cream/50">
                  ₹<VariantPriceInput portion={p} onSave={(price) => updateVariant(p.id, { price })} />
                </label>
                <button
                  onClick={() => updateVariant(p.id, { is_enabled: !p.is_enabled })}
                  className={`text-xs px-2.5 py-1 rounded-full ${p.is_enabled ? 'bg-green-600/20 text-green-300' : 'bg-white/5 text-cream/40'}`}
                >
                  {p.is_enabled ? 'Enabled' : 'Disabled'}
                </button>
                <button onClick={() => removeVariant(p.id)} className="text-cream/20 hover:text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <Button size="sm" variant="secondary" onClick={addVariant}><Plus className="w-3.5 h-3.5" /> Add Size</Button>
          </div>
        ) : (
          <label className="flex items-center gap-1 text-sm text-cream/60">
            {item.pricing_type === 'package' ? 'Package price' : 'Price'}: ₹
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              onBlur={savePrice}
              placeholder="not set"
              className="w-24 rounded-md bg-bg-primary border border-white/10 px-2 py-1 text-cream"
            />
            <span className="text-xs text-cream/30 ml-2">
              Customers see: {formatPrice(price.trim() === '' ? null : Number(price))}
            </span>
          </label>
        )}
      </div>
    </div>
  );
}

function VariantPriceInput({ portion, onSave }: { portion: MenuItemPortion; onSave: (price: number | null) => void }) {
  const [value, setValue] = useState(portion.price?.toString() ?? '');
  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const parsed = value.trim() === '' ? null : Number(value);
        onSave(Number.isFinite(parsed as number) ? parsed : null);
      }}
      placeholder="not set"
      className="w-20 rounded-md bg-bg-primary border border-white/10 px-2 py-1 text-cream"
    />
  );
}
