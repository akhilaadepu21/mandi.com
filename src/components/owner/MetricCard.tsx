export function MetricCard({ label, value, sub, icon: Icon }: { label: string; value: string; sub?: string; icon: React.ElementType }) {
  return (
    <div className="rounded-2xl bg-bg-secondary border border-white/5 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs uppercase tracking-wide text-cream/40">{label}</span>
        <Icon className="w-4 h-4 text-gold" />
      </div>
      <p className="font-serif text-2xl text-cream">{value}</p>
      {sub && <p className="text-xs text-cream/40 mt-1">{sub}</p>}
    </div>
  );
}
