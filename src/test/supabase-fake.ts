// Hand-rolled Supabase client fake for unit tests. Type-checked against the
// generated Database type so any schema drift breaks the build.
//
// Use via `jest.mock('@/api/supabase/client', () => ({ supabase: makeSupabaseFake({ ... }) }))`.

import { type Database } from '@/api/supabase/types.generated';

type Tables = Database['public']['Tables'];
type RowOf<T extends keyof Tables> = Tables[T]['Row'];

type Store = {
  [T in keyof Tables]: ReadonlyArray<RowOf<T>>;
};

const emptyStore = (): Store => ({
  profiles: [],
  profile_photos: [],
  profile_likes: [],
  matches: [],
  chat_rooms: [],
  chat_room_members: [],
  chat_messages: [],
  chat_receipts: [],
  business_promotions: [],
  promotion_tickets: [],
  push_tokens: [],
});

export type SupabaseFake = Readonly<{
  store: Store;
  reset: () => void;
  seed: (partial: Partial<Store>) => void;
}>;

export const makeSupabaseFake = (initial: Partial<Store> = {}): SupabaseFake => {
  const state: { current: Store } = { current: { ...emptyStore(), ...initial } };
  return {
    get store() {
      return state.current;
    },
    reset: () => {
      state.current = emptyStore();
    },
    seed: (partial) => {
      state.current = { ...state.current, ...partial };
    },
  };
};
