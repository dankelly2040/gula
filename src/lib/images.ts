import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { supabase } from './supabase';

/**
 * Compress a slice photo and upload it to Supabase storage (brief §8).
 * Photos are resized to max 1600 px and re-encoded as JPEG before upload.
 */
export async function uploadPhoto(localUri: string, userId: string, logId: string): Promise<string> {
  const context = ImageManipulator.manipulate(localUri);
  context.resize({ width: 1600 });
  const rendered = await context.renderAsync();
  const compressed = await rendered.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });

  const response = await fetch(compressed.uri);
  const arrayBuffer = await response.arrayBuffer();

  const path = `${userId}/${logId}.jpg`;
  const { error } = await supabase.storage
    .from('pizza-photos')
    .upload(path, arrayBuffer, { contentType: 'image/jpeg', upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from('pizza-photos').getPublicUrl(path);
  return data.publicUrl;
}
