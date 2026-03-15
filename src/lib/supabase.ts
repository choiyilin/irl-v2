import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/src/config/env';

const fallbackUrl = 'https://example.supabase.co';
const fallbackAnonKey = 'public-anon-key';
const isBrowserRuntime = typeof window !== 'undefined';

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
      storage: isBrowserRuntime ? AsyncStorage : undefined,
      autoRefreshToken: isBrowserRuntime,
      persistSession: isBrowserRuntime,
      detectSessionInUrl: false,
    },
  },
);

