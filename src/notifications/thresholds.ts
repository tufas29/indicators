import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'drawdown-fired-thresholds-v1';

/** symbol -> sorted list of threshold magnitudes already notified (e.g. [10, 12]). */
export type FiredState = Record<string, number[]>;

export async function loadFired(): Promise<FiredState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as FiredState) : {};
  } catch {
    return {};
  }
}

export async function saveFired(state: FiredState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function resetFired(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

/**
 * Given a drawdown percent (e.g. -12.4 meaning 12.4% below peak), the active
 * thresholds, and the thresholds already fired for this symbol, return any
 * thresholds newly crossed and not yet fired.
 */
export function newlyCrossed(
  drawdownPercent: number,
  thresholds: readonly number[],
  alreadyFired: readonly number[],
): number[] {
  const magnitude = -drawdownPercent;
  return thresholds.filter(
    (t) => magnitude >= t && !alreadyFired.includes(t),
  );
}
