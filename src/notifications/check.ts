import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { QuoteResult } from '../api/yahoo';
import { loadSettings } from './settings';
import {
  FiredState,
  loadFired,
  newlyCrossed,
  saveFired,
} from './thresholds';

const ANDROID_CHANNEL = 'drawdown-alerts';

function formatThresholdLabel(t: number): string {
  return Number.isInteger(t) ? `${t}` : t.toFixed(1);
}

async function fireAlert(
  name: string,
  symbol: string,
  threshold: number,
  drawdownPercent: number,
  price: number,
  currency: string,
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${name} down ${formatThresholdLabel(threshold)}% from peak`,
      body: `Now ${drawdownPercent.toFixed(2)}% below all-time high (${price.toFixed(2)} ${currency}).`,
      data: { symbol, threshold },
      ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL } : {}),
    },
    trigger: null,
  });
}

/**
 * Check the given quote results for newly-crossed drawdown thresholds and
 * schedule a local notification for each. Latched: once a threshold has fired
 * for a symbol it is not re-fired until the user removes/re-adds it or hits
 * reset.
 *
 * Returns the number of notifications scheduled.
 */
export async function checkAndNotify(
  results: readonly QuoteResult[],
): Promise<number> {
  const { thresholds } = await loadSettings();
  if (thresholds.length === 0) return 0;

  const fired: FiredState = await loadFired();
  let scheduled = 0;
  let dirty = false;

  for (const { quote } of results) {
    if (!quote) continue;
    const prev = fired[quote.symbol] ?? [];
    const crossed = newlyCrossed(quote.fromPeakPercent, thresholds, prev);
    if (crossed.length === 0) continue;

    for (const t of crossed) {
      await fireAlert(
        quote.name,
        quote.symbol,
        t,
        quote.fromPeakPercent,
        quote.price,
        quote.currency,
      );
      scheduled += 1;
    }

    fired[quote.symbol] = [...prev, ...crossed].sort((a, b) => a - b);
    dirty = true;
  }

  if (dirty) await saveFired(fired);
  return scheduled;
}
