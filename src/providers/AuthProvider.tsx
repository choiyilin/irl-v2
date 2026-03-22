import { Session, User } from '@supabase/supabase-js';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

import { env } from '@/src/config/env';
import { fetchLegacyOnboardingSignals, hasFinishedAppOnboarding } from '@/src/lib/authRouting';
import { supabase } from '@/src/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  /** False while resolving whether a signed-in user may enter the main app (includes legacy DB check). */
  isAuthReady: boolean;
  /** Signed-in user may use tabs (metadata complete or legacy profile/photos in DB). */
  canEnterMainApp: boolean;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function ensureProfileExists(user: User) {
  const fallbackName = user.email?.split('@')[0] ?? 'IRL User';
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      display_name: fallbackName,
    },
    {
      onConflict: 'id',
      ignoreDuplicates: true,
    },
  );

  if (error) {
    console.error('Failed to ensure profile row exists:', error.message);
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** null = not needed (signed out or metadata already complete) or still fetching */
  const [legacyOnboardingOk, setLegacyOnboardingOk] = useState<boolean | null>(null);

  const user = session?.user ?? null;
  const metadataOnboardingDone = user ? hasFinishedAppOnboarding(user) : false;
  const onboardingCheckPending = Boolean(user && !metadataOnboardingDone && legacyOnboardingOk === null);
  const isAuthReady = !isLoading && !onboardingCheckPending;
  const canEnterMainApp = Boolean(session && (metadataOnboardingDone || legacyOnboardingOk === true));

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Failed to load session:', error.message);
      }
      if (isMounted) {
        setSession(data.session ?? null);
        setIsLoading(false);
      }
      if (data.session?.user) {
        await ensureProfileExists(data.session.user);
      }
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
      if (nextSession?.user) {
        ensureProfileExists(nextSession.user);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const metadataGateKey = user
    ? `${user.user_metadata?.has_completed_signup_profile}-${user.user_metadata?.has_uploaded_photos}`
    : '';

  useEffect(() => {
    if (!user?.id) {
      setLegacyOnboardingOk(null);
      return;
    }
    if (hasFinishedAppOnboarding(user)) {
      setLegacyOnboardingOk(null);
      return;
    }

    let cancelled = false;
    setLegacyOnboardingOk(null);

    (async () => {
      const signals = await fetchLegacyOnboardingSignals(user.id);
      if (cancelled) return;
      setLegacyOnboardingOk(signals.canEnterMainApp);
      if (signals.hasProfilePhotos) {
        const { error } = await supabase.auth.updateUser({
          data: { has_uploaded_photos: true },
        });
        if (error) {
          console.warn('Could not backfill has_uploaded_photos:', error.message);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, metadataGateKey]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      isAuthReady,
      canEnterMainApp,
      isConfigured: env.isSupabaseConfigured,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          throw new Error(error.message);
        }
      },
      signUp: async (email, password) => {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          throw new Error(error.message);
        }
      },
      signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
          throw new Error(error.message);
        }
      },
    }),
    [canEnterMainApp, isAuthReady, isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider');
  }
  return context;
}

