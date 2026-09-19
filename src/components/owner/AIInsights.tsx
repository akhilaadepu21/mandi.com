import { TrendingUp, AlertTriangle, Info } from 'lucide-react';
import type { Insight } from '@/lib/data/insights';

const ICONS: Record<Insight['severity'], React.ElementType> = {
  positive: TrendingUp,
  warning: AlertTriangle,
  info: Info,
};
const STYLES: Record<Insight['severity'], string> = {
  positive: 'border-green-500/20 text-green-400',
  warning: 'border-amber-500/20 text-amber-400',
  info: 'border-blue-500/20 text-blue-400',
};

export function AIInsights({ insights }: { insights: Insight[] }) {
  return (
    <div className="space-y-3">
      {insights.map((insight, i) => {
        const Icon = ICONS[insight.severity];
        return (
          <div key={i} className={`rounded-2xl bg-bg-secondary border p-4 flex gap-3 ${STYLES[insight.severity]}`}>
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-cream font-medium">{insight.headline}</p>
              <p className="text-sm text-cream/50 mt-1">{insight.explanation}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
