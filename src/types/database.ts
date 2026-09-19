export type UserRole = 'customer' | 'owner' | 'manager' | 'chef' | 'staff' | 'super_admin';
export type TableStatus = 'available' | 'occupied' | 'ordering' | 'preparing' | 'ready' | 'serving' | 'billing' | 'cleaning';
export type OrderStatus = 'placed' | 'accepted' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type SpiceLevel = 'none' | 'mild' | 'medium' | 'hot' | 'extra_hot';
export type RequestType = 'water' | 'extra_cutlery' | 'call_waiter' | 'clean_table' | 'bill_please';
export type RequestStatus = 'pending' | 'acknowledged' | 'resolved';
export type PaymentMethod = 'upi' | 'card' | 'wallet' | 'cash';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
export type SubscriptionPlan = 'starter' | 'pro' | 'enterprise';
export type PricingType = 'single' | 'variants' | 'package';

export interface Restaurant {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  hero_video_url: string | null;
  hero_poster_url: string | null;
  address: string | null;
  phone: string | null;
  opening_hours: Record<string, string> | null;
  primary_color: string;
  is_demo: boolean;
  is_active: boolean;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
}

export interface MenuItemPortion {
  id: string;
  menu_item_id: string;
  label: string;
  price: number | null;
  sort_order: number;
  is_enabled: boolean;
}

export interface MenuMedia {
  id: string;
  menu_item_id: string;
  video_url: string | null;
  video_url_webm: string | null;
  poster_url: string | null;
  thumbnail_url: string | null;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  slug: string;
  description: string | null;
  ingredients: string[] | null;
  pricing_type: PricingType;
  base_price: number | null;
  is_veg: boolean;
  spice_level: SpiceLevel;
  prep_time_minutes: number | null;
  rating: number | null;
  is_featured: boolean;
  is_available: boolean;
  serves_people: number | null;
  sort_order: number;
  portions?: MenuItemPortion[];
  media?: MenuMedia | null;
}

export interface CartLine {
  key: string; // menuItemId + portionId, unique per configuration
  menuItemId: string;
  name: string;
  portionId: string | null;
  portionLabel: string | null;
  price: number;
  quantity: number;
  specialInstructions: string;
}

export interface OrderTrackingItem {
  id: string;
  name: string;
  portion: string | null;
  price: number;
  quantity: number;
  special_instructions: string | null;
}

export interface OrderTracking {
  order_id: string;
  order_number: number;
  status: OrderStatus;
  table_number: number;
  restaurant_name: string;
  subtotal: number;
  tax: number;
  service_charge: number;
  discount: number;
  total: number;
  special_instructions: string | null;
  estimated_ready_minutes: number | null;
  created_at: string;
  items: OrderTrackingItem[];
}

export interface ResolvedTable {
  restaurant_id: string;
  table_id: string;
  qr_token: string;
  table_status: TableStatus;
  table_is_disabled: boolean;
  restaurant_name: string;
  restaurant_tagline: string | null;
  restaurant_logo_url: string | null;
  restaurant_hero_video_url: string | null;
  restaurant_hero_poster_url: string | null;
  primary_color: string;
}

export interface StaffMember {
  id: string; // restaurant_members.id
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  permissions: string[];
  is_disabled: boolean;
  created_at: string;
}
