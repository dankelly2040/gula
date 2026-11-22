import { Directory, File, Paths } from 'expo-file-system';

// The subject lift writes the pizza cutout (a PNG on transparency) to the
// system temp directory, which iOS clears on its own schedule. When a log is
// saved the cutout is copied here, into the app's documents, under the log's
// id. Nothing about it is stored on the log record: the id is the key, so the
// path survives a reinstall renumbering the app container, and sync never
// has to know about it.

const known = new Map<string, string | null>();

function cutoutFile(logId: string): File {
  return new File(Paths.document, 'cutouts', `${logId}.png`);
}

/** Copy a freshly lifted cutout into permanent storage for this log. */
export function keepCutout(tempUri: string, logId: string): void {
  try {
    const dir = new Directory(Paths.document, 'cutouts');
    if (!dir.exists) dir.create({ intermediates: true });
    const dest = cutoutFile(logId);
    if (dest.exists) dest.delete();
    new File(tempUri).copy(dest);
    known.set(logId, dest.uri);
  } catch {
    // The log still has its photo; the cutout is a nicety.
    known.set(logId, null);
  }
}

/** Remove a log's cutout, for a deleted log or a replaced photo. */
export function dropCutout(logId: string): void {
  try {
    const file = cutoutFile(logId);
    if (file.exists) file.delete();
  } catch {
    // Nothing to clean up.
  }
  known.set(logId, null);
}

/** The stored cutout for a log, or null when it has none. */
export function cutoutUriFor(logId: string): string | null {
  const cached = known.get(logId);
  if (cached !== undefined) return cached;
  let uri: string | null = null;
  try {
    const file = cutoutFile(logId);
    uri = file.exists ? file.uri : null;
  } catch {
    uri = null;
  }
  known.set(logId, uri);
  return uri;
}
