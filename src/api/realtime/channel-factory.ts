import { type RealtimeChannel, type RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { type AppSupabaseClient } from '@/api/supabase/client';
import { type Database } from '@/api/supabase/types.generated';
import { createLogger } from '@/lib/logger';

const log = createLogger('realtime');

type Tables = Database['public']['Tables'];
type TableName = keyof Tables;
type Row<T extends TableName> = Tables[T]['Row'];

export type ChangeHandler<T extends TableName> = (payload: RealtimePostgresChangesPayload<Row<T>>) => void;

type Subscription<T extends TableName> = Readonly<{
  unsubscribe: () => void;
}>;

type ChannelEntry = {
  readonly channel: RealtimeChannel;
  readonly handlers: Set<ChangeHandler<TableName>>;
  refCount: number;
};

export type ChannelFactory = Readonly<{
  subscribe: <T extends TableName>(
    table: T,
    filter: string | undefined,
    handler: ChangeHandler<T>,
  ) => Subscription<T>;
  closeAll: () => void;
}>;

const channelKey = (table: string, filter: string | undefined): string =>
  filter === undefined ? table : `${table}::${filter}`;

export const createChannelFactory = (client: AppSupabaseClient): ChannelFactory => {
  const channels = new Map<string, ChannelEntry>();

  const subscribe = <T extends TableName>(
    table: T,
    filter: string | undefined,
    handler: ChangeHandler<T>,
  ): Subscription<T> => {
    const key = channelKey(table, filter);
    const existing = channels.get(key);
    if (existing !== undefined) {
      existing.handlers.add(handler as ChangeHandler<TableName>);
      existing.refCount += 1;
      return {
        unsubscribe: () => releaseHandler(key, handler as ChangeHandler<TableName>),
      };
    }

    const handlers = new Set<ChangeHandler<TableName>>();
    handlers.add(handler as ChangeHandler<TableName>);

    const channel = client
      .channel(`db:${key}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table, ...(filter !== undefined && { filter }) },
        (payload) => {
          for (const h of handlers) {
            h(payload as RealtimePostgresChangesPayload<Row<TableName>>);
          }
        },
      )
      .subscribe((status) => {
        log.debug(`channel ${key} status: ${status}`);
      });

    channels.set(key, { channel, handlers, refCount: 1 });

    return {
      unsubscribe: () => releaseHandler(key, handler as ChangeHandler<TableName>),
    };
  };

  const releaseHandler = (key: string, handler: ChangeHandler<TableName>): void => {
    const entry = channels.get(key);
    if (entry === undefined) {
      return;
    }
    entry.handlers.delete(handler);
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
      void entry.channel.unsubscribe();
      channels.delete(key);
    }
  };

  const closeAll = (): void => {
    for (const entry of channels.values()) {
      void entry.channel.unsubscribe();
    }
    channels.clear();
  };

  return { subscribe, closeAll };
};
