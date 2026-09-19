export function formatPrice(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'Price not configured';
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function spiceLabel(level: string): string {
  switch (level) {
    case 'none': return 'No spice';
    case 'mild': return 'Mild';
    case 'medium': return 'Medium';
    case 'hot': return 'Hot';
    case 'extra_hot': return 'Extra Hot';
    default: return level;
  }
}

export function spiceIcons(level: string): number {
  switch (level) {
    case 'none': return 0;
    case 'mild': return 1;
    case 'medium': return 2;
    case 'hot': return 3;
    case 'extra_hot': return 4;
    default: return 1;
  }
}

export const ORDER_STAGES = ['placed', 'accepted', 'preparing', 'ready', 'served', 'completed'] as const;

export function statusLabel(status: string): string {
  switch (status) {
    case 'placed': return 'Order Placed';
    case 'accepted': return 'Accepted';
    case 'preparing': return 'Preparing';
    case 'ready': return 'Ready';
    case 'served': return 'Served';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return status;
  }
}
