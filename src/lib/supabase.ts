import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// When the env vars are absent (e.g. a build environment without them), fall
// back to a placeholder so bundling and startup never crash; every request
// then fails fast and the app's existing local-only degradation takes over.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://missing-config.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'missing-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
