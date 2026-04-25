import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react';

import { type ChannelFactory, createChannelFactory } from '@/api/realtime/channel-factory';
import { supabase } from '@/api/supabase/client';

const RealtimeContext = createContext<ChannelFactory | null>(null);

export const useRealtime = (): ChannelFactory => {
  const v = useContext(RealtimeContext);
  if (v === null) {
    throw new Error('useRealtime called outside RealtimeProvider');
  }
  return v;
};

export const RealtimeProvider = ({ children }: { children: ReactNode }) => {
  const factory = useMemo(() => createChannelFactory(supabase), []);
  useEffect(() => () => factory.closeAll(), [factory]);
  return <RealtimeContext.Provider value={factory}>{children}</RealtimeContext.Provider>;
};
