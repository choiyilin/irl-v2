import Constants from 'expo-constants';
import { z } from 'zod';

const EnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.string().url(),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_SENTRY_DSN: z.string().optional(),
  EXPO_PUBLIC_POSTHOG_API_KEY: z.string().optional(),
  EXPO_PUBLIC_POSTHOG_HOST: z.string().url().default('https://us.i.posthog.com'),
  EXPO_PUBLIC_APP_ENV: z.enum(['development', 'preview', 'production']).default('development'),
});

export type Env = z.infer<typeof EnvSchema>;

const readRawEnv = (): Record<string, unknown> => {
  // process.env is the canonical source for EXPO_PUBLIC_* at runtime; expo-constants is a fallback.
  const fromProcess = process.env;
  const fromExtra = (Constants.expoConfig?.extra ?? {}) as Record<string, unknown>;
  return { ...fromExtra, ...fromProcess };
};

const parsed = EnvSchema.safeParse(readRawEnv());

if (!parsed.success) {
  // Crash fast and loud — the app cannot start without valid env.
  const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env: Env = parsed.data;
