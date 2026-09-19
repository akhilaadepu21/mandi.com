import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveRange, type DateRange } from '@/lib/date-range';
import { computeOwnerMetrics } from './metrics';
import { fetchRevenueByHour, fetchDishPerformance, fetchTableTurnaround, fetchCategorySales } from './analytics';
import { fetchDishRatings, fetchKitchenPerformance } from './kitchen-insights';

export interface Insight {
  headline: string;
  explanation: string;
  severity: 'info' | 'positive' | 'warning';
}

/**
 * Deterministic, explainable business insights — every headline is derived
 * directly from the numbers in `explanation`, computed from real orders,
 * ratings, and kitchen timestamps. No language model is involved here; this
 * is a rules engine so it can never hallucinate a number. The AI Assistant
 * (separate, LLM-backed) is where free-form Q&A happens.
 */
export async function generateInsights(supabase: SupabaseClient, restaurantId: string, range?: DateRange): Promise<Insight[]> {
  const effectiveRange = range ?? resolveRange('today');
  const yesterdayRange = resolveRange('yesterday');

  const [metrics, revenueByHour, dishes, turnaround, categories, ratings, kitchenToday, kitchenYesterday] = await Promise.all([
    computeOwnerMetrics(supabase, restaurantId, effectiveRange),
    fetchRevenueByHour(supabase, restaurantId, effectiveRange),
    fetchDishPerformance(supabase, restaurantId, effectiveRange),
    fetchTableTurnaround(supabase, restaurantId, effectiveRange),
    fetchCategorySales(supabase, restaurantId, effectiveRange),
    fetchDishRatings(supabase, restaurantId),
    fetchKitchenPerformance(supabase, restaurantId, effectiveRange),
    fetchKitchenPerformance(supabase, restaurantId, yesterdayRange),
  ]);

  const insights: Insight[] = [];

  const topByQuantity = [...dishes].sort((a, b) => b.quantitySold - a.quantitySold)[0];
  if (topByQuantity && topByQuantity.quantitySold > 0) {
    insights.push({
      headline: `${topByQuantity.name} was your highest-selling dish (${effectiveRange.label.toLowerCase()}) with ${topByQuantity.quantitySold} units.`,
      explanation: `${topByQuantity.name} sold ${topByQuantity.quantitySold} units across ${topByQuantity.orderCount} orders, generating ${topByQuantity.revenue.toFixed(0)} — the most of any dish in this period.`,
      severity: 'positive',
    });
  }

  const busiestHour = [...revenueByHour].sort((a, b) => b.revenue - a.revenue)[0];
  if (busiestHour && busiestHour.revenue > 0) {
    const secondBusiest = [...revenueByHour].sort((a, b) => b.revenue - a.revenue)[1];
    insights.push({
      headline: secondBusiest && secondBusiest.revenue > 0
        ? `Your busiest period was ${busiestHour.hour}–${secondBusiest.hour}.`
        : `${busiestHour.hour} is your busiest period.`,
      explanation: `Orders completed in the ${busiestHour.hour} hour generated ${busiestHour.revenue.toFixed(0)} — more than any other hour in ${effectiveRange.label.toLowerCase()}.`,
      severity: 'info',
    });
  }

  const topRated = ratings.find((r) => r.ratingCount >= 2);
  if (topRated) {
    const alsoHighSales = dishes.find((d) => d.menuItemId === topRated.menuItemId && d.quantitySold > 0);
    insights.push({
      headline: alsoHighSales
        ? `${topRated.name} has high sales and a ${topRated.avgRating.toFixed(1)} average rating.`
        : `${topRated.name} is your highest-rated dish (${topRated.avgRating.toFixed(1)}★).`,
      explanation: `${topRated.name} has a ${topRated.avgRating.toFixed(1)}-star average across ${topRated.ratingCount} customer rating${topRated.ratingCount === 1 ? '' : 's'}.`,
      severity: 'positive',
    });
  }

  if (turnaround.length > 1) {
    const avg = turnaround.reduce((s, t) => s + t.avgMinutes, 0) / turnaround.length;
    const slow = turnaround.filter((t) => t.avgMinutes > avg * 1.3).sort((a, b) => b.avgMinutes - a.avgMinutes)[0];
    if (slow) {
      insights.push({
        headline: `Table ${slow.table.replace('T', '')} has a higher-than-average turnaround time.`,
        explanation: `Table ${slow.table.replace('T', '')} averages ${slow.avgMinutes.toFixed(0)} minutes from order to completion, vs a ${avg.toFixed(0)}-minute average across all tables.`,
        severity: 'warning',
      });
    }
  }

  if (kitchenToday.avgPrepTimeMinutes && kitchenYesterday.avgPrepTimeMinutes) {
    const change = ((kitchenToday.avgPrepTimeMinutes - kitchenYesterday.avgPrepTimeMinutes) / kitchenYesterday.avgPrepTimeMinutes) * 100;
    if (Math.abs(change) >= 10) {
      insights.push({
        headline: `Average kitchen preparation time ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(0)}% compared with yesterday.`,
        explanation: `Today's average prep time is ${kitchenToday.avgPrepTimeMinutes.toFixed(0)} min vs ${kitchenYesterday.avgPrepTimeMinutes.toFixed(0)} min yesterday.`,
        severity: change > 0 ? 'warning' : 'positive',
      });
    }
  }

  const lowConversion = [...dishes]
    .filter((d) => d.views >= 3 && d.conversion < 15)
    .sort((a, b) => a.conversion - b.conversion)[0];
  if (lowConversion) {
    insights.push({
      headline: `${lowConversion.name} receives views but has a low order conversion rate.`,
      explanation: `${lowConversion.name} was viewed ${lowConversion.views} times but converted to only ${lowConversion.orderCount} orders (${lowConversion.conversion.toFixed(0)}% conversion). Consider a better video, a price check, or featuring it more prominently.`,
      severity: 'warning',
    });
  }

  const topCategory = [...categories].sort((a, b) => b.revenue - a.revenue)[0];
  if (topCategory && topCategory.revenue > 0) {
    insights.push({
      headline: `${topCategory.name} is your top revenue category.`,
      explanation: `${topCategory.name} accounts for ${topCategory.revenue.toFixed(0)} in completed-order revenue, the largest share of any category tracked.`,
      severity: 'info',
    });
  }

  if (metrics.totalTables > 0 && metrics.tableOccupancyPct > 70) {
    insights.push({
      headline: `Table occupancy is high right now (${metrics.tableOccupancyPct.toFixed(0)}%).`,
      explanation: `${metrics.activeTables} of ${metrics.totalTables} tables are currently occupied. Consider flagging incoming walk-ins about wait times.`,
      severity: 'warning',
    });
  }

  if (insights.length === 0) {
    insights.push({
      headline: 'Not enough order history yet to generate insights.',
      explanation: 'Insights are computed from completed orders, ratings, and menu analytics events. Place a few demo orders through the customer flow to see this fill in.',
      severity: 'info',
    });
  }

  return insights;
}
