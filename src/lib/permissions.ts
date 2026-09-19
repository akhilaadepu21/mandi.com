import type { UserRole } from '@/types/database';

export const PERMISSIONS = [
  'view_orders',
  'manage_tables',
  'handle_requests',
  'mark_served',
  'view_billing',
  'manage_menu',
  'view_analytics',
  'manage_staff',
  'manage_qr',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PERMISSION_LABELS: Record<Permission, string> = {
  view_orders: 'View Orders',
  manage_tables: 'Manage Tables',
  handle_requests: 'Handle Customer Requests',
  mark_served: 'Mark Served',
  view_billing: 'View Billing',
  manage_menu: 'Manage Menu',
  view_analytics: 'View Analytics',
  manage_staff: 'Manage Staff',
  manage_qr: 'Manage QR Codes',
};

/** Sensible starting point when creating a new staff account — owner can adjust before or after creation. */
export const DEFAULT_PERMISSIONS: Record<Extract<UserRole, 'manager' | 'chef' | 'staff'>, Permission[]> = {
  manager: ['view_orders', 'manage_tables', 'handle_requests', 'mark_served', 'view_billing', 'manage_menu', 'view_analytics', 'manage_qr'],
  chef: ['view_orders'],
  staff: ['view_orders', 'handle_requests', 'mark_served'],
};

export const STAFF_ROLES = ['manager', 'chef', 'staff'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
