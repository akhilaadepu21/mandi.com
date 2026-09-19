'use client';

import { useEffect, useMemo, useState } from 'react';
import { RestaurantHeader } from './RestaurantHeader';
import { Hero } from './Hero';
import { CategoryBar } from './CategoryBar';
import { DishCard } from './DishCard';
import { DishModal } from './DishModal';
import { CartDrawer } from './CartDrawer';
import { CallStaffSheet } from './CallStaffSheet';
import { StickyCartBar } from './StickyCartBar';
import { KingPlatePromo } from './KingPlatePromo';
import { ToastViewport } from '../shared/Toast';
import { OfflineBanner } from '../shared/States';
import { useCartStore } from '@/lib/cart-store';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { createClient } from '@/lib/supabase/client';
import type { MenuCategory, MenuItem, ResolvedTable } from '@/types/database';

export function CustomerMenuApp({
  table,
  tableNumber,
  categories,
  itemsByCategory,
}: {
  table: ResolvedTable;
  tableNumber: number;
  categories: MenuCategory[];
  itemsByCategory: Record<string, MenuItem[]>;
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [callStaffOpen, setCallStaffOpen] = useState(false);
  const setScope = useCartStore((s) => s.setScope);
  const online = useOnlineStatus();

  useEffect(() => {
    setScope(`${table.restaurant_id}:${table.table_id}`);
  }, [table.restaurant_id, table.table_id, setScope]);

  const allItems = useMemo(() => Object.values(itemsByCategory).flat(), [itemsByCategory]);
  const kingPlate = useMemo(() => allItems.find((i) => i.pricing_type === 'package'), [allItems]);

  const trackEvent = (event: string, menuItemId: string) => {
    createClient().rpc('rpc_track_event', { p_qr_token: table.qr_token, p_event_type: event, p_menu_item_id: menuItemId });
  };

  const visibleCategories = activeCategory ? categories.filter((c) => c.id === activeCategory) : categories;

  const filterItems = (items: MenuItem[]) => {
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((i) => i.name.toLowerCase().includes(q) || i.description?.toLowerCase().includes(q));
  };

  const scrollToMenu = () => {
    document.getElementById('menu-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen px-4 pb-24 max-w-2xl mx-auto">
      <OfflineBanner online={online} />
      <RestaurantHeader
        restaurantName={table.restaurant_name}
        tableNumber={tableNumber}
        search={search}
        onSearch={setSearch}
        onCallStaff={() => setCallStaffOpen(true)}
      />

      <Hero
        restaurantName={table.restaurant_name}
        tagline={table.restaurant_tagline}
        tableNumber={tableNumber}
        heroVideoUrl={table.restaurant_hero_video_url}
        heroPosterUrl={table.restaurant_hero_poster_url}
        onExplore={scrollToMenu}
      />

      <div id="menu-section" className="pt-6">
        <CategoryBar categories={categories} active={activeCategory} onSelect={setActiveCategory} />

        {kingPlate && !activeCategory && !search && (
          <KingPlatePromo item={kingPlate} onOpen={() => setSelectedItem(kingPlate)} />
        )}

        <div className="space-y-10 mt-6">
          {visibleCategories.map((cat) => {
            const items = filterItems(itemsByCategory[cat.id] ?? []);
            if (items.length === 0) return null;
            return (
              <section key={cat.id}>
                <h2 className="font-serif text-2xl text-cream mb-4">{cat.name}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <DishCard key={item.id} item={item} onOpen={() => setSelectedItem(item)} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <DishModal item={selectedItem} qrToken={table.qr_token} onClose={() => setSelectedItem(null)} onTrackEvent={trackEvent} />
      <CartDrawer qrToken={table.qr_token} restaurantId={table.restaurant_id} />
      <CallStaffSheet open={callStaffOpen} onClose={() => setCallStaffOpen(false)} qrToken={table.qr_token} />
      <StickyCartBar />
      <ToastViewport />
    </div>
  );
}
