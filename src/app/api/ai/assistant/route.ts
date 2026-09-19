import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getCurrentMember, roleAllowed } from '@/lib/auth';
import { generateInsights } from '@/lib/data/insights';
import { computeOwnerMetrics, fetchRecentOrders } from '@/lib/data/metrics';
import { fetchDishPerformance, fetchTableTurnaround, fetchCategorySales } from '@/lib/data/analytics';
import { fetchDishRatings, fetchKitchenPerformance } from '@/lib/data/kitchen-insights';
import { fetchStaff } from '@/lib/data/staff';
import { resolveRange } from '@/lib/date-range';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const member = await getCurrentMember();
  if (!member || !roleAllowed(member.role, ['owner', 'manager', 'super_admin'])) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'not_configured', message: 'AI Assistant is not configured — set ANTHROPIC_API_KEY to enable it.' },
      { status: 503 }
    );
  }

  const { question, history } = (await req.json()) as { question: string; history?: { role: 'user' | 'assistant'; content: string }[] };
  if (!question || typeof question !== 'string') {
    return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  }

  // Every data point comes from this restaurant's own tables, resolved from
  // the authenticated session — never from anything the client could spoof.
  const supabase = await createClient();
  const restaurantId = member.restaurantId;

  const range = resolveRange('30d');

  const [metrics, insights, dishes, turnaround, categories, recentOrders, ratings, kitchen, staff] = await Promise.all([
    computeOwnerMetrics(supabase, restaurantId, range),
    generateInsights(supabase, restaurantId),
    fetchDishPerformance(supabase, restaurantId, range),
    fetchTableTurnaround(supabase, restaurantId, range),
    fetchCategorySales(supabase, restaurantId, range),
    fetchRecentOrders(supabase, restaurantId, 20),
    fetchDishRatings(supabase, restaurantId),
    fetchKitchenPerformance(supabase, restaurantId, range),
    fetchStaff(supabase, restaurantId),
  ]);

  const dataContext = {
    restaurant: member.restaurantName,
    data_window: range.label,
    metrics,
    computed_insights: insights,
    dish_performance: dishes,
    dish_ratings: ratings,
    table_turnaround_minutes: turnaround,
    category_revenue: categories,
    recent_orders: recentOrders,
    kitchen_performance: kitchen,
    staff: staff.map((s) => ({ name: s.full_name, role: s.role, active: !s.is_disabled })),
  };

  const systemPrompt = `You are the AI Business Assistant inside Mandi.com's restaurant owner dashboard, for "${member.restaurantName}".
Answer the owner's question using ONLY the JSON data provided below — it was just queried live from their database.
Cite concrete numbers from the data in your answer. If the data doesn't contain what's needed to answer, say so plainly instead of guessing or inventing a number.
Keep answers concise (under 120 words) and business-focused.

DATA:
${JSON.stringify(dataContext, null, 2)}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 500,
        system: systemPrompt,
        messages: [...(history ?? []), { role: 'user', content: question }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: 'upstream_error', message: errText }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.map((c: any) => c.text).join('') ?? '';
    return NextResponse.json({ answer: text });
  } catch (e: any) {
    return NextResponse.json({ error: 'request_failed', message: e.message }, { status: 500 });
  }
}
