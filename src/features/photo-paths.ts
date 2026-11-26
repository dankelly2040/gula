// Where a log's photo is kept, as plain text work with no file access, so it
// can be tested. The file access is in `lib/photos.ts`.

/** A folder that iOS carries over when the app is updated. */
export type ContainerRoot = 'cache' | 'document';

/**
 * iOS gives the app's data folder a new id on every update, so an absolute
 * path saved by one build points nowhere in the next. The folders inside are
 * carried over. This splits an old absolute path into the folder that
 * survives and the path under it, or returns null for anything else.
 *
 *   file:///var/mobile/Containers/Data/Application/<old id>/Library/Caches/Camera/a.jpg
 *     -> { root: 'cache', tail: 'Camera/a.jpg' }
 */
export function containerTail(uri: string): { root: ContainerRoot; tail: string } | null {
  const match = /\/Containers\/Data\/Application\/[^/]+\/(Library\/Caches|Documents)\/(.+)$/.exec(uri);
  if (!match) return null;
  return { root: match[1] === 'Documents' ? 'document' : 'cache', tail: match[2] };
}

/** The same file under the folder the app has now. */
export function rebase(uri: string, roots: Record<ContainerRoot, string>): string | null {
  const found = containerTail(uri);
  if (!found) return null;
  const root = roots[found.root];
  return `${root.endsWith('/') ? root : `${root}/`}${found.tail}`;
}

/**
 * Kept photos are named by log id and the moment they were kept. A replaced
 * photo gets a new name, so nothing that caches by path shows the old one.
 */
export function keptName(logId: string, stamp: number): string {
  return `${logId}_${stamp}.jpg`;
}

/** The log a kept photo belongs to, and when it was kept. */
export function parseKeptName(name: string): { logId: string; stamp: number } | null {
  const match = /^(.+)_(\d+)\.jpg$/.exec(name);
  if (!match) return null;
  return { logId: match[1], stamp: Number(match[2]) };
}

export function isLocalUri(uri: string): boolean {
  return uri.startsWith('file://') || uri.startsWith('/');
}
