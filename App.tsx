import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { fetchAllQuotes, QuoteResult } from './src/api/yahoo';
import { MARKETS } from './src/markets';
import { IndexCard } from './src/components/IndexCard';
import { formatTime } from './src/format';

export default function App() {
  return (
    <SafeAreaProvider>
      <Dashboard />
    </SafeAreaProvider>
  );
}

function Dashboard() {
  const [results, setResults] = useState<QuoteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const load = useCallback(async () => {
    const data = await fetchAllQuotes(MARKETS);
    setResults(data);
    setLastUpdated(Date.now());
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const sections = useMemo(() => {
    const groups = new Map<string, QuoteResult[]>();
    for (const r of results) {
      const g = r.market.group;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(r);
    }
    return Array.from(groups, ([title, data]) => ({ title, data }));
  }, [results]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Market Indicators</Text>
        <Text style={styles.subtitle}>
          {lastUpdated
            ? `Updated ${formatTime(lastUpdated)}`
            : 'Distance from all-time highs'}
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Loading indices…</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.market.symbol}
          renderItem={({ item }) => <IndexCard result={item} />}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#16a34a"
            />
          }
          ListFooterComponent={
            <Text style={styles.footer}>
              Pull down to refresh · Data: Yahoo Finance (unofficial)
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f6f8' },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  title: { color: '#16181d', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#6b7280', marginTop: 12 },
  listContent: { paddingBottom: 32 },
  sectionHeader: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 4,
  },
  footer: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 16,
  },
});
