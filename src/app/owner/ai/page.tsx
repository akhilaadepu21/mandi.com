import { createClient } from '@/lib/supabase/server';
import { getCurrentMember } from '@/lib/auth';
import { generateInsights } from '@/lib/data/insights';
import { AIInsights } from '@/components/owner/AIInsights';
import { AIAssistantChat } from '@/components/owner/AIAssistantChat';

export default async function OwnerAIPage() {
  const member = await getCurrentMember();
  if (!member) return null;
  const supabase = await createClient();
  const insights = await generateInsights(supabase, member.restaurantId);

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="font-serif text-3xl text-cream mb-1">AI Business Insights</h1>
      <p className="text-cream/40 text-sm mb-8">
        Every insight below is computed live from your orders and menu analytics — each one names the exact numbers behind it.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-sm uppercase tracking-wide text-cream/40 mb-3">Insights</h2>
          <AIInsights insights={insights} />
        </div>
        <div>
          <h2 className="text-sm uppercase tracking-wide text-cream/40 mb-3">AI Assistant</h2>
          <AIAssistantChat />
        </div>
      </div>
    </div>
  );
}
