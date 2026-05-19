import { StyleSheet, Text, View } from 'react-native';
import { QuoteResult } from '../api/yahoo';
import {
  formatNumber,
  formatSigned,
  formatSignedPercent,
} from '../format';

const UP = '#16a34a';
const DOWN = '#dc2626';
// Lighter red used only for the drawdown bar fill, so the strong red stays
// reserved for the numeric label.
const DOWN_BAR = '#f87171';
const MUTED = '#6b7280';

export function IndexCard({ result }: { result: QuoteResult }) {
  const { market, quote, error } = result;

  if (error || !quote) {
    return (
      <View style={[styles.card, styles.errorCard]}>
        <Text style={styles.name}>{market.name}</Text>
        <Text style={styles.errorText} numberOfLines={2}>
          {error ?? 'No data'}
        </Text>
      </View>
    );
  }

  const dayColor = quote.change >= 0 ? UP : DOWN;
  // fromPeakPercent is <= 0. The deeper the drawdown, the more red.
  const drawdown = quote.fromPeakPercent;
  const atPeak = drawdown > -0.05;
  const peakColor = atPeak ? UP : DOWN;
  const barColor = atPeak ? UP : DOWN_BAR;
  const barWidth = `${Math.max(0, Math.min(100, 100 + drawdown))}%` as const;

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View>
          <Text style={styles.name}>{market.name}</Text>
          <Text style={styles.symbol}>{market.symbol}</Text>
        </View>
        <View style={styles.priceCol}>
          <Text style={styles.price}>
            {formatNumber(quote.price, quote.currency)}
          </Text>
          <Text style={[styles.change, { color: dayColor }]}>
            {formatSigned(quote.change)} (
            {formatSignedPercent(quote.changePercent)})
          </Text>
        </View>
      </View>

      <View style={styles.peakBlock}>
        <View style={styles.peakHeader}>
          <Text style={styles.peakLabel}>From all-time high</Text>
          <Text style={[styles.peakValue, { color: peakColor }]}>
            {atPeak ? 'At peak' : `${drawdown.toFixed(2)}%`}
          </Text>
        </View>
        <View style={styles.track}>
          <View
            style={[
              styles.fill,
              { width: barWidth, backgroundColor: barColor },
            ]}
          />
        </View>
        <Text style={styles.athText}>
          Peak {formatNumber(quote.allTimeHigh, quote.currency)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  errorCard: { borderWidth: 1, borderColor: DOWN, backgroundColor: '#fef2f2' },
  errorText: { color: DOWN, marginTop: 6, fontSize: 13 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  name: { color: '#16181d', fontSize: 18, fontWeight: '700' },
  symbol: { color: MUTED, fontSize: 12, marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  price: { color: '#16181d', fontSize: 18, fontWeight: '700' },
  change: { fontSize: 13, marginTop: 2, fontWeight: '600' },
  peakBlock: { marginTop: 14 },
  peakHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  peakLabel: { color: MUTED, fontSize: 13 },
  peakValue: { fontSize: 14, fontWeight: '700' },
  track: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 4 },
  athText: { color: MUTED, fontSize: 12, marginTop: 6 },
});
