import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

/**
 * Compress a slice photo and upload it to Supabase storage (brief §8).
 * Photos are resized to max 1600 px and re-encoded as JPEG before upload.
 */
/**
 * The local file could not be read, so retrying will never help.
 *
 * Photos live in Library/Caches, which iOS is free to purge, and the app
 * container is renumbered on reinstall. Callers need to tell that apart from
 * a network failure: one should be given up on, the other retried.
 */
export class PhotoUnreadableError extends Error {
  constructor(readonly localUri: string, cause: unknown) {
    super(`local photo could not be read: ${localUri}`);
    this.name = 'PhotoUnreadableError';
    this.cause = cause;
  }
}

export async function uploadPhoto(localUri: string, userId: string, logId: string): Promise<string> {
  let arrayBuffer: ArrayBuffer;
  try {
    const context = ImageManipulator.manipulate(localUri);
    context.resize({ width: 1600 });
    const rendered = await context.renderAsync();
    const compressed = await rendered.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });

    const response = await fetch(compressed.uri);
    arrayBuffer = await response.arrayBuffer();
  } catch (e) {
    // Everything above is local work, so a failure here means the source
    // file is gone or unreadable.
    throw new PhotoUnreadableError(localUri, e);
  }

  // Anything below is the network, and is worth retrying.
  const path = `${userId}/${logId}.jpg`;
  const { error } = await supabase.storage
    .from('pizza-photos')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('pizza-photos').getPublicUrl(path);
  return data.publicUrl;
}
