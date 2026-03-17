import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/src/config/env';

const fallbackUrl = 'https://example.supabase.co';
const fallbackAnonKey = 'public-anon-key';
// We intentionally do NOT persist sessions so the app always starts on Sign In.
// Session lives only in-memory for the current app run.

if (!env.isSupabaseConfigured) {
  console.warn(
    'Supabase env vars are missing. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.',
  );
}

export const supabase = createClient(
  env.supabaseUrl ?? fallbackUrl,
  env.supabaseAnonKey ?? fallbackAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  },
);

