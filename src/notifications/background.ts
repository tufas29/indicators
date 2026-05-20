import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { fetchAllQuotes } from '../api/yahoo';
import { MARKETS } from '../markets';
import { checkAndNotify } from './check';
import { MIN_INTERVAL_MINUTES } from './settings';

export const DRAWDOWN_TASK = 'drawdown-check-v1';

TaskManager.defineTask(DRAWDOWN_TASK, async () => {
  try {
    const results = await fetchAllQuotes(MARKETS);
    const fired = await checkAndNotify(results);
    return fired > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

/**
 * Register the background-fetch task with the given minimum interval. If the
 * task is already registered we re-register so the OS picks up the new
 * interval. OS throttling may still produce longer real-world gaps.
 */
export async function registerDrawdownTask(
  intervalMinutes: number,
): Promise<void> {
  const minutes = Math.max(MIN_INTERVAL_MINUTES, Math.round(intervalMinutes));
  const registered = await TaskManager.isTaskRegisteredAsync(DRAWDOWN_TASK);
  if (registered) {
    await BackgroundFetch.unregisterTaskAsync(DRAWDOWN_TASK);
  }
  await BackgroundFetch.registerTaskAsync(DRAWDOWN_TASK, {
    minimumInterval: minutes * 60,
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterDrawdownTask(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(DRAWDOWN_TASK);
  if (registered) await BackgroundFetch.unregisterTaskAsync(DRAWDOWN_TASK);
}
