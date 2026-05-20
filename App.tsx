import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
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
import { SettingsModal } from './src/components/SettingsModal';
import { formatTime } from './src/format';
import { checkAndNotify } from './src/notifications/check';
import { registerDrawdownTask } from './src/notifications/background';
import {
  configureAndroidChannel,
  configureNotificationHandler,
  ensureNotificationPermissions,
} from './src/notifications/setup';
import {
  AlertSettings,
  DEFAULT_SETTINGS,
  INTERVAL_OPTIONS,
  loadSettings,
  pruneFiredState,
  saveSettings,
} from './src/notifications/settings';
import {
  loadFired,
  resetFired,
  saveFired,
} from './src/notifications/thresholds';

configureNotificationHandler();

export default function App() {
  return (
    <SafeAreaProvider>
      <Dashboard />
    </SafeAreaProvider>
  );
}

function formatThresholdLabel(t: number): string {
  return Number.isInteger(t) ? `${t}` : t.toFixed(1);
}

function intervalLabel(minutes: number): string {
  const preset = INTERVAL_OPTIONS.find((o) => o.value === minutes);
  if (preset) return preset.label;
  if (minutes < 60) return `${minutes} min`;
  const h = minutes / 60;
  return Number.isInteger(h) ? `${h} hour${h === 1 ? '' : 's'}` : `${minutes} min`;
}

function Dashboard() {
  const [results, setResults] = useState<QuoteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [settings, setSettings] = useState<AlertSettings>(DEFAULT_SETTINGS);
  const [settingsVisible, setSettingsVisible] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchAllQuotes(MARKETS);
    setResults(data);
    setLastUpdated(Date.now());
    checkAndNotify(data).catch(() => {});
  }, []);

  useEffect(() => {
    (async () => {
      const loaded = await loadSettings();
      setSettings(loaded);
      await configureAndroidChannel();
      const granted = await ensureNotificationPermissions();
      if (granted) {
        try {
          await registerDrawdownTask(loaded.intervalMinutes);
        } catch {
          // Background fetch may be unavailable (e.g. Expo Go). Foreground
          // checks still work.
        }
      }
    })();
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const onResetAlerts = useCallback(() => {
    Alert.alert(
      'Reset drawdown alerts?',
      'Every threshold becomes eligible to fire again the next time an index crosses it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            resetFired().catch(() => {});
          },
        },
      ],
    );
  }, []);

  const onSaveSettings = useCallback(
    async (next: AlertSettings) => {
      const intervalChanged = next.intervalMinutes !== settings.intervalMinutes;
      const thresholdsChanged =
        next.thresholds.length !== settings.thresholds.length ||
        next.thresholds.some((t, i) => t !== settings.thresholds[i]);

      await saveSettings(next);
      setSettings(next);
      setSettingsVisible(false);

      if (thresholdsChanged) {
        const fired = await loadFired();
        await saveFired(pruneFiredState(fired, next.thresholds));
      }
      if (intervalChanged) {
        try {
          await registerDrawdownTask(next.intervalMinutes);
        } catch {
          // ignore — background fetch unavailable
        }
      }
      checkAndNotify(results).catch(() => {});
    },
    [settings, results],
  );

  const sections = useMemo(() => {
    const groups = new Map<string, QuoteResult[]>();
    for (const r of results) {
      const g = r.market.group;
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(r);
    }
    return Array.from(groups, ([title, data]) => ({ title, data }));
  }, [results]);

  const thresholdSummary = settings.thresholds
    .map((t) => `-${formatThresholdLabel(t)}%`)
    .join(' / ');

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.title}>Market Indicators</Text>
          <Text style={styles.subtitle}>
            {lastUpdated
              ? `Updated ${formatTime(lastUpdated)}`
              : 'Distance from all-time highs'}
          </Text>
        </View>
        <Pressable
          onPress={() => setSettingsVisible(true)}
          hitSlop={10}
          style={({ pressed }) => [
            styles.gearBtn,
            pressed && styles.gearBtnPressed,
          ]}
          accessibilityLabel="Open settings"
        >
          <Text style={styles.gearIcon}>⚙</Text>
        </Pressable>
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
            <View style={styles.footerBlock}>
              <Pressable
                onPress={onResetAlerts}
                style={({ pressed }) => [
                  styles.resetBtn,
                  pressed && styles.resetBtnPressed,
                ]}
              >
                <Text style={styles.resetBtnText}>Reset drawdown alerts</Text>
              </Pressable>
              <Text style={styles.footer}>
                Pull down to refresh · Data: Yahoo Finance (unofficial)
              </Text>
              <Text style={styles.footerSmall}>
                {settings.thresholds.length === 0
                  ? 'No thresholds set — open settings to add'
                  : `Alerts at ${thresholdSummary} · Checks every ${intervalLabel(
                      settings.intervalMinutes,
                    )}`}
              </Text>
            </View>
          }
        />
      )}

      <SettingsModal
        visible={settingsVisible}
        initial={settings}
        onCancel={() => setSettingsVisible(false)}
        onSave={onSaveSettings}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f6f8' },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerText: { flex: 1 },
  title: { color: '#16181d', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#6b7280', fontSize: 13, marginTop: 4 },
  gearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginLeft: 12,
  },
  gearBtnPressed: { backgroundColor: '#f3f4f6' },
  gearIcon: { fontSize: 18, color: '#374151' },
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
  footerBlock: { paddingHorizontal: 16, marginTop: 18 },
  resetBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  resetBtnPressed: { backgroundColor: '#f3f4f6' },
  resetBtnText: { color: '#374151', fontSize: 13, fontWeight: '600' },
  footer: {
    color: '#9ca3af',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 14,
  },
  footerSmall: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
