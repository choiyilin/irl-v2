import { type Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

import { supabase } from '@/api/supabase/client';
import { userId, type UserId } from '@/lib/brand';

export type SessionState = Readonly<
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; userId: UserId; session: Session }
>;

const SessionContext = createContext<SessionState>({ status: 'loading' });

export const useSession = (): SessionState => useContext(SessionContext);

export const useRequireUserId = (): UserId => {
  const s = useSession();
  if (s.status !== 'authenticated') {
    throw new Error('useRequireUserId called outside an authenticated screen');
  }
  return s.userId;
};

const sessionToState = (session: Session | null): SessionState => {
  if (session === null) {
    return { status: 'unauthenticated' };
  }
  return { status: 'authenticated', userId: userId(session.user.id), session };
};

export const SessionProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const qc = useQueryClient();

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (mounted) {
        setState(sessionToState(data.session));
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(sessionToState(session));
      void qc.invalidateQueries();
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [qc]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
};
