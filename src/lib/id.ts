import * as Crypto from 'expo-crypto';

/** UUID v4, so local records can sync to Postgres uuid columns unchanged. */
export function generateId(): string {
  return Crypto.randomUUID();
}
