import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PizzaLog, UserProfile } from './types';

const LOGS_KEY = '@gula/pizza-logs';
const PROFILE_KEY = '@gula/profile';

export async function getLogs(): Promise<PizzaLog[]> {
  const raw = await AsyncStorage.getItem(LOGS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as PizzaLog[];
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

export async function deleteLog(id: string): Promise<void> {
  const logs = await getLogs();
  const filtered = logs.filter((l) => l.id !== id);
  await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(filtered));
}

export async function getProfile(): Promise<UserProfile | null> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as UserProfile;
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
