export type RangeKey = 'today' | 'yesterday' | '7d' | '30d' | 'custom';

export interface DateRange {
  from: string; // ISO
  to: string; // ISO, exclusive upper bound
  label: string;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function resolveRange(key: RangeKey, customFrom?: string, customTo?: string): DateRange {
  const now = new Date();

  switch (key) {
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { from: startOfDay(y).toISOString(), to: endOfDay(y).toISOString(), label: 'Yesterday' };
    }
    case '7d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 6);
      return { from: startOfDay(from).toISOString(), to: endOfDay(now).toISOString(), label: 'Last 7 Days' };
    }
    case '30d': {
      const from = new Date(now);
      from.setDate(from.getDate() - 29);
      return { from: startOfDay(from).toISOString(), to: endOfDay(now).toISOString(), label: 'Last 30 Days' };
    }
    case 'custom': {
      if (customFrom && customTo) {
        return {
          from: startOfDay(new Date(customFrom)).toISOString(),
          to: endOfDay(new Date(customTo)).toISOString(),
          label: `${customFrom} → ${customTo}`,
        };
      }
      // Fall through to today if a custom range wasn't fully specified.
    }
    // eslint-disable-next-line no-fallthrough
    case 'today':
    default:
      return { from: startOfDay(now).toISOString(), to: endOfDay(now).toISOString(), label: 'Today' };
  }
}

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: 'custom', label: 'Custom' },
];
