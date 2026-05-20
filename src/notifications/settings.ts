import AsyncStorage from '@react-native-async-storage/async-storage';
import { FiredState } from './thresholds';

export interface AlertSettings {
  /** Drawdown magnitudes (positive numbers, % below peak). Sorted ascending. */
  thresholds: number[];
  /** Minimum interval between background checks, in minutes. Floor: 15. */
  intervalMinutes: number;
}

export const DEFAULT_SETTINGS: AlertSettings = {
  thresholds: [10, 12, 15, 18, 20],
  intervalMinutes: 15,
};

export const INTERVAL_OPTIONS: ReadonlyArray<{
  value: number;
  label: string;
}> = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hour' },
  { value: 120, label: '2 hours' },
  { value: 360, label: '6 hours' },
  { value: 720, label: '12 hours' },
  { value: 1440, label: '24 hours' },
];

export const MIN_INTERVAL_MINUTES = 15;
export const THRESHOLD_MIN = 0.1;
export const THRESHOLD_MAX = 99.9;

const STORAGE_KEY = 'drawdown-settings-v1';

export async function loadSettings(): Promise<AlertSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      thresholds:
        normalizeThresholds(parsed?.thresholds) ?? DEFAULT_SETTINGS.thresholds,
      intervalMinutes:
        normalizeInterval(parsed?.intervalMinutes) ??
        DEFAULT_SETTINGS.intervalMinutes,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(s: AlertSettings): Promise<void> {
  const cleaned: AlertSettings = {
    thresholds:
      normalizeThresholds(s.thresholds) ?? DEFAULT_SETTINGS.thresholds,
    intervalMinutes:
      normalizeInterval(s.intervalMinutes) ?? DEFAULT_SETTINGS.intervalMinutes,
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
}

/**
 * Drop fired-state entries that reference thresholds no longer in the active
 * list, so re-adding a threshold later re-arms it.
 */
export function pruneFiredState(
  fired: FiredState,
  thresholds: readonly number[],
): FiredState {
  const allow = new Set(thresholds);
  const next: FiredState = {};
  for (const [symbol, list] of Object.entries(fired)) {
    const kept = list.filter((t) => allow.has(t));
    if (kept.length) next[symbol] = kept;
  }
  return next;
}

function normalizeThresholds(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  const seen = new Set<number>();
  for (const raw of v) {
    if (typeof raw !== 'number' || !isFinite(raw)) continue;
    const rounded = Math.round(raw * 10) / 10;
    if (rounded < THRESHOLD_MIN || rounded > THRESHOLD_MAX) continue;
    seen.add(rounded);
  }
  const sorted = Array.from(seen).sort((a, b) => a - b);
  return sorted.length ? sorted : null;
}

function normalizeInterval(v: unknown): number | null {
  if (typeof v !== 'number' || !isFinite(v)) return null;
  const rounded = Math.round(v);
  if (rounded < MIN_INTERVAL_MINUTES) return null;
  return rounded;
}
