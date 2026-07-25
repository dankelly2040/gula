import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Achievement, PizzaLog, Spot, UserProfile } from './types';

const LOGS_KEY = '@gula/pizza-logs';
const PROFILE_KEY = '@gula/profile';
const SPOTS_KEY = '@gula/spots';
const ACHIEVEMENTS_KEY = '@gula/achievements';
const SYNC_QUEUE_KEY = '@gula/sync-queue';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  return JSON.parse(raw) as T;
}

export async function getLogs(): Promise<PizzaLog[]> {
  const logs = await readJson<PizzaLog[]>(LOGS_KEY, []);
  // Backfill fields added after v1 records were written.
  return logs.map((l) => ({
    ...l,
    photoUrl: l.photoUrl ?? null,
    lat: l.lat ?? null,
    lng: l.lng ?? null,
    isPublic: l.isPublic ?? false,
    updatedAt: l.updatedAt ?? l.timestamp,
  }));
}

export async function saveLog(log: PizzaLog): Promise<void> {
  const logs = await getLogs();
  logs.unshift(log);
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export async function updateLog(updated: PizzaLog): Promise<void> {
  const logs = await getLogs();
  const idx = logs.findIndex((l) => l.id === updated.id);
  if (idx !== -1) {
    logs[idx] = updated;
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  }
}

export async function replaceLogs(logs: PizzaLog[]): Promise<void> {
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(logs));
}

export async function deleteLog(id: string): Promise<void> {
  const logs = await getLogs();
  const filtered = logs.filter((l) => l.id !== id);
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(filtered));
}

export async function getProfile(): Promise<UserProfile | null> {
  return readJson<UserProfile | null>(PROFILE_KEY, null);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function getSpots(): Promise<Spot[]> {
  return readJson<Spot[]>(SPOTS_KEY, []);
}

export async function saveSpot(spot: Spot): Promise<void> {
  const spots = await getSpots();
  if (!spots.some((s) => s.id === spot.id)) {
    spots.push(spot);
    await AsyncStorage.setItem(SPOTS_KEY, JSON.stringify(spots));
  }
}

export async function getAchievements(): Promise<Achievement[]> {
  return readJson<Achievement[]>(ACHIEVEMENTS_KEY, []);
}

export async function saveAchievements(achievements: Achievement[]): Promise<void> {
  await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
}

// ── sync queue ────────────────────────────────────────────────────────────
// Mutations made while the cloud is unreachable, flushed by db/sync.ts.

export type SyncOp =
  | { kind: 'upsert-log'; id: string }
  | { kind: 'delete-log'; id: string }
  | { kind: 'upsert-profile' }
  | { kind: 'upsert-spot'; id: string }
  | { kind: 'upsert-achievement'; id: string };

export async function getSyncQueue(): Promise<SyncOp[]> {
  return readJson<SyncOp[]>(SYNC_QUEUE_KEY, []);
}

export async function enqueueSyncOp(op: SyncOp): Promise<void> {
  const queue = await getSyncQueue();
  const key = JSON.stringify(op);
  if (!queue.some((q) => JSON.stringify(q) === key)) {
    queue.push(op);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  }
}

export async function replaceSyncQueue(queue: SyncOp[]): Promise<void> {
  await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}
