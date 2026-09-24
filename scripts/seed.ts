/**
 * Seeds the demo restaurant "Mandi.com" using the restaurant's actual menu
 * card as the source of truth. Every price below is transcribed directly
 * from that card — nothing is estimated. Where the card doesn't label which
 * price maps to which size (Raan Tandoori Mutton Mandi, Ghee Roast Mandi,
 * Egg Cheese Mandi), the variants are seeded with generic "Option N" labels
 * instead of guessing Small/Medium/Large — rename them in /owner/menu once
 * confirmed with the restaurant.
 *
 * Re-running this fully replaces the "mandi-com" demo restaurant (and its
 * orders/tables/menu) with a clean, correct copy — it does not try to merge
 * with whatever was seeded before.
 *
 * Run with: npm run seed
 */
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

type SpiceLevel = 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot';
type Variant = { label: string; price: number };

interface BaseItem {
  name: string;
  isVeg?: boolean;
  spiceLevel?: SpiceLevel;
  prepTime?: number;
  featured?: boolean;
  servesPeople?: number;
  description: string;
}

type SeedItem =
  | (BaseItem & { pricingType: 'single' | 'package'; price: number })
  | (BaseItem & { pricingType: 'variants'; variants: Variant[] });

const SIZES = (small: number, medium: number, large: number, xl: number): Variant[] => [
  { label: 'Small', price: small },
  { label: 'Medium', price: medium },
  { label: 'Large', price: large },
  { label: 'Extra Large', price: xl },
];

const CATEGORIES: { name: string; items: SeedItem[] }[] = [
  {
    name: "Chicken Mandi's",
    items: [
      { name: 'Mandi Faham Chicken', pricingType: 'variants', variants: SIZES(319, 569, 819, 1069), spiceLevel: 'medium', prepTime: 25, featured: true, description: 'Slow-smoked chicken over fragrant basmati, finished with traditional faham spice.' },
      { name: 'Mandi Fried Chicken', pricingType: 'variants', variants: SIZES(319, 569, 819, 1069), spiceLevel: 'hot', prepTime: 22, description: 'Crisp fried chicken served over classic mandi rice.' },
      { name: 'Peshwari Chicken Mandi', pricingType: 'variants', variants: SIZES(319, 569, 819, 1069), spiceLevel: 'medium', prepTime: 25, description: 'Chicken mandi in the Peshwari style, layered with warm whole spices.' },
      { name: 'Mandi Regal Tandoori Chicken', pricingType: 'variants', variants: SIZES(319, 569, 819, 1069), spiceLevel: 'medium', prepTime: 28, description: 'Tandoor-charred chicken with smoky char, served with mandi rice.' },
      { name: 'Mandi KFC Chicken', pricingType: 'variants', variants: SIZES(319, 569, 819, 1069), spiceLevel: 'hot', prepTime: 24, description: 'Crispy fried chicken, KFC-style, served over mandi rice.' },
      {
        name: 'Mixed Platter Mandi', pricingType: 'variants',
        variants: [{ label: 'Medium', price: 799 }, { label: 'Large', price: 949 }, { label: 'Extra Large', price: 1149 }],
        spiceLevel: 'medium', prepTime: 30, featured: true, description: 'A mixed platter of mandi favourites — no Small size offered.',
      },
    ],
  },
  {
    name: 'Veg. Mandi',
    items: [
      { name: 'Paneer Tikka Mandi', pricingType: 'variants', variants: SIZES(299, 479, 669, 919), isVeg: true, spiceLevel: 'medium', prepTime: 20, description: 'Char-grilled paneer tikka over mandi rice.' },
      { name: 'Soyachaap Peshwari Mandi', pricingType: 'variants', variants: SIZES(299, 479, 669, 919), isVeg: true, spiceLevel: 'medium', prepTime: 20, description: 'Soya chaap in the Peshwari style over mandi rice.' },
      { name: 'Peshwari Mushroom Mandi', pricingType: 'variants', variants: SIZES(299, 479, 669, 919), isVeg: true, spiceLevel: 'mild', prepTime: 20, description: 'Mushroom in the Peshwari style, simmered with mandi spices.' },
    ],
  },
  {
    name: "Mandi.com Special Mandi's",
    items: [
      {
        name: 'Banjara Chicken Mandi', pricingType: 'variants',
        variants: [{ label: 'Medium', price: 669 }, { label: 'Large', price: 869 }, { label: 'Extra Large', price: 1169 }],
        spiceLevel: 'mild', prepTime: 28, featured: true, description: 'Mild spicy chicken mandi, Banjara style.',
      },
      {
        name: 'Afghani Chicken Mandi', pricingType: 'variants',
        variants: [{ label: 'Medium', price: 669 }, { label: 'Large', price: 869 }, { label: 'Extra Large', price: 1169 }],
        spiceLevel: 'mild', prepTime: 26, description: 'Malai creamy Afghani-marinated chicken over mandi rice.',
      },
      {
        name: 'Salami Chicken Mandi', pricingType: 'variants',
        variants: [{ label: 'Medium', price: 669 }, { label: 'Large', price: 869 }, { label: 'Extra Large', price: 1169 }],
        spiceLevel: 'medium', prepTime: 26, description: 'Chicken mandi in a yellow/red salami gravy.',
      },
      {
        name: 'Chicken Full Bird Mandi', pricingType: 'variants',
        variants: [{ label: 'Medium', price: 669 }, { label: 'Large', price: 869 }, { label: 'Extra Large', price: 1169 }],
        spiceLevel: 'medium', prepTime: 40, description: 'A full roasted bird over mandi rice.',
      },
      {
        name: 'Arabian Fish Mandi', pricingType: 'variants',
        variants: [{ label: 'Medium', price: 719 }, { label: 'Large', price: 919 }, { label: 'Extra Large', price: 1119 }],
        spiceLevel: 'medium', prepTime: 25, description: 'Crispy-texture fish prepared Arabian-style over mandi rice.',
      },
      {
        name: 'Sea Pomfret Fish Mandi', pricingType: 'variants',
        variants: [{ label: 'Medium', price: 719 }, { label: 'Large', price: 919 }, { label: 'Extra Large', price: 1119 }],
        spiceLevel: 'medium', prepTime: 25, description: 'Flavourful sea pomfret mandi with warm Arabian spice.',
      },
      { name: 'Majilis Mutton Mandi', pricingType: 'single', price: 1349, spiceLevel: 'medium', prepTime: 40, featured: true, description: 'Mutton and rice semi-cooked in a pot, Majilis style.' },
      { name: 'Mudfoon Mutton Mandi', pricingType: 'single', price: 1349, spiceLevel: 'medium', prepTime: 45, description: 'Mutton wrapped in silver foil for a creamy texture.' },
      {
        name: 'Raan Tandoori Mutton Mandi', pricingType: 'variants',
        variants: [{ label: 'Option 1', price: 1199 }, { label: 'Option 2', price: 1349 }],
        spiceLevel: 'medium', prepTime: 45, description: 'Tandoor-roasted mutton leg (Raan) over mandi rice. Menu shows two unlabeled sizes — confirm and rename in /owner/menu.',
      },
      { name: 'Zafrani Mutton Mandi', pricingType: 'single', price: 1349, spiceLevel: 'mild', prepTime: 40, description: 'Saffron-infused mutton mandi.' },
      {
        name: 'Ghee Roast Mandi', pricingType: 'variants',
        variants: [{ label: 'Option 1', price: 749 }, { label: 'Option 2', price: 1049 }, { label: 'Option 3', price: 1349 }],
        spiceLevel: 'medium', prepTime: 24, description: 'Mandi finished in a rich ghee roast. Menu shows three unlabeled sizes — confirm and rename in /owner/menu.',
      },
      {
        name: 'Egg Cheese Mandi', pricingType: 'variants',
        variants: [{ label: 'Option 1', price: 449 }, { label: 'Option 2', price: 679 }, { label: 'Option 3', price: 849 }],
        spiceLevel: 'mild', prepTime: 18, description: 'Eggs filled with cheese and baked. Menu shows three unlabeled sizes — confirm and rename in /owner/menu.',
      },
    ],
  },
  {
    name: "Mutton Mandi's",
    items: [
      { name: 'Mutton Mandi', pricingType: 'variants', variants: SIZES(369, 719, 919, 1219), spiceLevel: 'medium', prepTime: 40, featured: true, description: 'Classic slow-cooked mutton mandi.' },
      { name: 'Mutton Mandi Tandoori', pricingType: 'variants', variants: SIZES(369, 719, 919, 1219), spiceLevel: 'medium', prepTime: 40, description: 'Tandoor-finished mutton mandi.' },
      { name: 'Mutton Mandi Juicy', pricingType: 'variants', variants: SIZES(369, 719, 919, 1219), spiceLevel: 'medium', prepTime: 40, description: 'Extra-juicy mutton mandi.' },
      { name: 'Mutton Fried Mandi', pricingType: 'variants', variants: SIZES(369, 719, 919, 1219), spiceLevel: 'hot', prepTime: 35, description: 'Fried mutton served over mandi rice.' },
      { name: 'Mutton Laham Mandi', pricingType: 'variants', variants: SIZES(369, 719, 919, 1219), spiceLevel: 'medium', prepTime: 40, description: 'Boiled-piece mutton laham mandi.' },
    ],
  },
  {
    name: 'Fish & Prawns Mandi',
    items: [
      { name: 'Mandi Fried Fish', pricingType: 'variants', variants: SIZES(369, 699, 899, 1149), spiceLevel: 'hot', prepTime: 20, description: 'Crisp fried basa fish served with mandi rice.' },
      { name: 'Mandi Grill Fish', pricingType: 'variants', variants: SIZES(369, 699, 899, 1149), spiceLevel: 'medium', prepTime: 22, description: 'Grilled basa fish over mandi rice.' },
      { name: 'Mandi Telipiya Fish', pricingType: 'variants', variants: SIZES(369, 699, 899, 1149), spiceLevel: 'medium', prepTime: 22, description: 'Small-piece tilapia fish mandi.' },
      { name: 'Mandi Red Chilli Prawns', pricingType: 'variants', variants: SIZES(369, 699, 899, 1149), spiceLevel: 'extra_hot', prepTime: 20, description: 'Fried prawns tossed in red chilli, served with mandi rice.' },
    ],
  },
  {
    name: 'Quick Add Ons',
    items: [
      { name: 'Mutton Piece', pricingType: 'single', price: 219, spiceLevel: 'medium', prepTime: 10, description: 'Extra mutton piece for your mandi.' },
      { name: 'Chicken Piece', pricingType: 'single', price: 189, spiceLevel: 'medium', prepTime: 10, description: 'Extra chicken piece for your mandi.' },
      { name: 'Fish Fry Piece', pricingType: 'single', price: 209, spiceLevel: 'medium', prepTime: 10, description: 'Extra fish fry piece.' },
      { name: 'Extra Prawns (12 Pieces)', pricingType: 'single', price: 209, spiceLevel: 'medium', prepTime: 8, description: '12 extra prawns on the side.' },
      { name: 'Extra Rice', pricingType: 'single', price: 179, isVeg: true, spiceLevel: 'none', prepTime: 5, description: 'Extra portion of mandi rice.' },
      { name: 'Extra Dry Fruits', pricingType: 'single', price: 30, isVeg: true, spiceLevel: 'none', prepTime: 3, description: 'Extra dry fruit garnish.' },
      { name: 'Extra Fried Onion', pricingType: 'single', price: 20, isVeg: true, spiceLevel: 'none', prepTime: 3, description: 'Extra fried onion garnish.' },
      { name: 'Extra Mayonnaise', pricingType: 'single', price: 30, isVeg: true, spiceLevel: 'none', prepTime: 2, description: 'Side of mayonnaise.' },
    ],
  },
  {
    name: 'King Plate Mandi',
    items: [
      {
        name: 'King Plate Mandi', pricingType: 'package', price: 6499, servesPeople: 16,
        spiceLevel: 'medium', prepTime: 75, featured: true,
        description: '16-person package (10% discount applied): 2 Mutton Starters, 2 Veg Starters, 2 Chicken Starters, 2 rice fillings with extra complimentary rice, 8 pieces of chicken, 8 pieces of mutton.',
      },
    ],
  },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `item-${Date.now()}`;
}
async function main() {
  console.log('Seeding Mandi.com demo restaurant from the real menu card...');

  // Clean slate: delete any prior "mandi-com" demo restaurant so renamed/
  // removed dishes from earlier (incorrect) seed data don't linger. Cascades
  // take care of most of its tables (menu, staff memberships, etc.), but
  // order_items.menu_item_id/portion_id use "on delete restrict" — Postgres
  // checks restrict constraints immediately per-row (unlike the default
  // "no action", which defers to end-of-statement), so cascading straight
  // from restaurants into menu_items fails with 23503 while order_items
  // rows still reference them. Deleting order_items then orders up front
  // clears that restrict path before the restaurant cascade ever reaches it.
  const { data: existing } = await supabase.from('restaurants').select('id').eq('slug', 'mandi-com').maybeSingle();
  if (existing) {
    const { data: existingOrders, error: ordersSelErr } = await supabase
      .from('orders')
      .select('id')
      .eq('restaurant_id', existing.id);
    if (ordersSelErr) throw ordersSelErr;

    const orderIds = (existingOrders ?? []).map((o) => o.id);
    if (orderIds.length) {
      const { error: oiErr } = await supabase.from('order_items').delete().in('order_id', orderIds);
      if (oiErr) throw oiErr;

      const { error: ordersDelErr } = await supabase.from('orders').delete().eq('restaurant_id', existing.id);
      if (ordersDelErr) throw ordersDelErr;
    }

    const { error: delErr } = await supabase.from('restaurants').delete().eq('id', existing.id);
    if (delErr) throw delErr;
    console.log('Removed previous demo restaurant data.');
  }

  const { data: restaurant, error: rErr } = await supabase
    .from('restaurants')
    .insert({
      slug: 'mandi-com',
      name: 'Mandi.com',
      tagline: 'Arabian Food',
      description: 'Authentic Arabian Mandi — slow-cooked over charcoal, served the traditional way.',
      is_demo: true,
      is_active: true,
      primary_color: '#C89B3C',
    })
    .select()
    .single();

  if (rErr || !restaurant) throw rErr;
  console.log('Restaurant:', restaurant.id);

  // 12 demo tables
  for (let n = 1; n <= 12; n++) {
    const { error } = await supabase.from('restaurant_tables').insert({ restaurant_id: restaurant.id, table_number: n });
    if (error) throw error;
  }
  console.log('Tables 1-12 ready.');

  let categorySort = 0;
  for (const cat of CATEGORIES) {
    const { data: category, error: cErr } = await supabase
      .from('menu_categories')
      .insert({ restaurant_id: restaurant.id, name: cat.name, slug: slugify(cat.name), sort_order: categorySort++ })
      .select()
      .single();
    if (cErr || !category) throw cErr;

    let itemSort = 0;
    for (const item of cat.items) {
      const { data: menuItem, error: iErr } = await supabase
        .from('menu_items')
        .insert({
          restaurant_id: restaurant.id,
          category_id: category.id,
          name: item.name,
          slug: slugify(item.name),
          description: item.description,
          is_veg: item.isVeg ?? false,
          spice_level: item.spiceLevel ?? 'medium',
          prep_time_minutes: item.prepTime ?? 20,
          is_featured: item.featured ?? false,
          serves_people: item.servesPeople ?? null,
          pricing_type: item.pricingType,
          base_price: item.pricingType === 'variants' ? null : item.price,
          is_available: true,
          sort_order: itemSort++,
        })
        .select()
        .single();
      if (iErr || !menuItem) throw iErr;

      if (item.pricingType === 'variants') {
        const rows = item.variants.map((v, idx) => ({
          menu_item_id: menuItem.id,
          label: v.label,
          price: v.price,
          sort_order: idx,
        }));
        const { error: pErr } = await supabase.from('menu_item_portions').insert(rows);
        if (pErr) throw pErr;
      }
    }
    console.log(`  Category "${cat.name}" — ${cat.items.length} items`);
  }

  await supabase.from('subscriptions').insert({ restaurant_id: restaurant.id, plan: 'pro', status: 'active' });

  // Demo staff logins (local/dev only — change or remove before real deployment).
  const demoUsers: { email: string; fullName: string; role: 'owner' | 'chef' | 'staff' | 'manager' | 'super_admin'; permissions: string[] }[] = [
    { email: 'owner@mandi.com', fullName: 'Owner (Demo)', role: 'owner', permissions: [] },
    { email: 'manager@mandi.com', fullName: 'Kiran', role: 'manager', permissions: ['view_orders', 'manage_tables', 'handle_requests', 'mark_served', 'view_billing', 'manage_menu', 'view_analytics', 'manage_qr'] },
    { email: 'chef@mandi.com', fullName: 'Ahmed', role: 'chef', permissions: ['view_orders'] },
    { email: 'staff@mandi.com', fullName: 'Rahul', role: 'staff', permissions: ['view_orders', 'handle_requests', 'mark_served'] },
    { email: 'admin@mandi.com', fullName: 'Platform Admin', role: 'super_admin', permissions: [] },
  ];
  const demoPassword = 'mandi1234';

  for (const u of demoUsers) {
    let userId: string | undefined;
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: u.email,
      password: demoPassword,
      email_confirm: true,
    });
    if (createErr) {
      const { data: list } = await supabase.auth.admin.listUsers();
      userId = list?.users.find((x) => x.email === u.email)?.id;
    } else {
      userId = created.user?.id;
    }
    if (!userId) {
      console.warn(`  Could not create/find user ${u.email}`);
      continue;
    }
    await supabase
      .from('restaurant_members')
      .upsert(
        { restaurant_id: restaurant.id, user_id: userId, role: u.role, email: u.email, full_name: u.fullName, permissions: u.permissions },
        { onConflict: 'restaurant_id,user_id' }
      );
    console.log(`  Demo login: ${u.email} / ${demoPassword} (${u.role})`);
  }

  console.log('\nAll prices transcribed directly from the menu card — nothing estimated.');
  console.log('3 dishes (Raan Tandoori Mutton, Ghee Roast, Egg Cheese Mandi) have unlabeled');
  console.log('size variants on the card — seeded as "Option 1/2/3"; rename them in /owner/menu.');
  console.log('Done. Visit /r/mandi-com/table/5 once the app is running.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
