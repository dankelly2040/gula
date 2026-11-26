import { Directory, File, Paths } from 'expo-file-system';
import type { PizzaLog } from '../db/types';
import { isLocalUri, keptName, parseKeptName, rebase } from '../features/photo-paths';

// A photo comes out of the camera or the picker into Library/Caches, which
// iOS may clear, under an absolute path that stops working when the app is
// updated (the data folder gets a new id). Until November 2026 that path was
// all a log had, so every photo went blank after an update.
//
// Now a saved log's photo is copied into Documents/photos, named by the log's
// id, and screens ask this module where a log's photo is. The path stored on
// the log (`photoUri`) is only a hint for logs saved by older builds.

type Kept = { uri: string; stamp: number };

let index: Map<string, Kept> | null = null;
const legacy = new Map<string, string | null>();

function photosDir(): Directory {
  return new Directory(Paths.document, 'photos');
}

/** Every kept photo, by log id. Read from disk once. */
function kept(): Map<string, Kept> {
  if (index) return index;
  const found = new Map<string, Kept>();
  try {
    const dir = photosDir();
    if (dir.exists) {
      for (const entry of dir.list()) {
        if (!(entry instanceof File)) continue;
        const parsed = parseKeptName(entry.name);
        if (!parsed) continue;
        const before = found.get(parsed.logId);
        if (!before || parsed.stamp > before.stamp) {
          found.set(parsed.logId, { uri: entry.uri, stamp: parsed.stamp });
        }
      }
    }
  } catch {
    // An unreadable folder means no kept photos; screens fall back.
  }
  index = found;
  return found;
}

function fileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

/**
 * Copy a photo into permanent storage for this log and return where it is
 * now. Null when the copy failed; the caller keeps the path it had.
 */
export function keepPhoto(sourceUri: string, logId: string): string | null {
  if (!isLocalUri(sourceUri)) return null;
  try {
    const dir = photosDir();
    if (!dir.exists) dir.create({ intermediates: true });
    const stamp = Date.now();
    const dest = new File(dir, keptName(logId, stamp));
    new File(sourceUri).copy(dest);
    const before = kept().get(logId);
    kept().set(logId, { uri: dest.uri, stamp });
    if (before && before.uri !== dest.uri) {
      try {
        new File(before.uri).delete();
      } catch {
        // The old copy stays; it is never read again.
      }
    }
    return dest.uri;
  } catch {
    return null;
  }
}

/** Remove a log's kept photo, for a deleted log. */
export function dropPhoto(logId: string): void {
  const before = kept().get(logId);
  kept().delete(logId);
  if (!before) return;
  try {
    new File(before.uri).delete();
  } catch {
    // Nothing to clean up.
  }
}

/**
 * The photo file on this phone for a log, or null. Looks, in order, at the
 * kept copy, at the path on the log, and at the same file under the folder
 * the app has now. A photo found by the last two is copied into permanent
 * storage, so it is found directly from then on.
 */
export function localPhotoFor(log: Pick<PizzaLog, 'id' | 'photoUri'>): string | null {
  const stored = kept().get(log.id);
  if (stored) return stored.uri;

  const hint = log.photoUri;
  if (!hint || !isLocalUri(hint)) return null;
  const known = legacy.get(hint);
  if (known !== undefined) return known;

  let found: string | null = null;
  if (fileExists(hint)) {
    found = hint;
  } else {
    const moved = rebase(hint, { cache: Paths.cache.uri, document: Paths.document.uri });
    if (moved && fileExists(moved)) found = moved;
  }
  if (found) found = keepPhoto(found, log.id) ?? found;
  legacy.set(hint, found);
  return found;
}

/** The photo to show for a log: the file on this phone, else the uploaded copy. */
export function photoFor(log: Pick<PizzaLog, 'id' | 'photoUri' | 'photoUrl'>): string | null {
  return localPhotoFor(log) ?? log.photoUrl ?? (log.photoUri && !isLocalUri(log.photoUri) ? log.photoUri : null);
}
