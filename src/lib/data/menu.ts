import type { SupabaseClient } from '@supabase/supabase-js';
import type { MenuCategory, MenuItem } from '@/types/database';

export async function fetchMenuForOwner(supabase: SupabaseClient, restaurantId: string) {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*, menu_items(*, menu_item_portions(*), menu_media(*))')
    .eq('restaurant_id', restaurantId)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const categories: MenuCategory[] = [];
  const itemsByCategory: Record<string, MenuItem[]> = {};

  for (const cat of data ?? []) {
    const rawItems = (cat as any).menu_items ?? [];
    const items: MenuItem[] = rawItems
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((i: any) => {
        const { menu_item_portions, menu_media, ...itemFields } = i;
        return {
          ...itemFields,
          portions: (menu_item_portions ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
          media: (menu_media ?? [])[0] ?? null,
        };
      });

    const { menu_items, ...category } = cat as any;
    categories.push(category);
    itemsByCategory[category.id] = items;
  }

  return { categories, itemsByCategory };
}

export async function fetchMenu(supabase: SupabaseClient, restaurantId: string) {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*, menu_items(*, menu_item_portions(*), menu_media(*))')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;

  const categories: MenuCategory[] = [];
  const itemsByCategory: Record<string, MenuItem[]> = {};

  for (const cat of data ?? []) {
    const rawItems = (cat as any).menu_items ?? [];
    const items: MenuItem[] = rawItems
      .filter((i: any) => i.is_available)
      .sort((a: any, b: any) => a.sort_order - b.sort_order)
      .map((i: any) => {
        const { menu_item_portions, menu_media, ...itemFields } = i;
        return {
          ...itemFields,
          portions: (menu_item_portions ?? [])
            .filter((p: any) => p.is_enabled)
            .sort((a: any, b: any) => a.sort_order - b.sort_order),
          media: (menu_media ?? [])[0] ?? null,
        };
      });

    if (items.length === 0) continue;

    const { menu_items, ...category } = cat as any;
    categories.push(category);
    itemsByCategory[category.id] = items;
  }

  return { categories, itemsByCategory };
}
