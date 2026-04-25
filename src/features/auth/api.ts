import { supabase } from '@/api/supabase/client';
import { err, ok, type Result } from '@/lib/result';

import { type SignInValues, type SignUpValues } from './schemas';

export type AuthError = Readonly<{ code: string; message: string }>;

export const signIn = async (values: SignInValues): Promise<Result<void, AuthError>> => {
  const { error } = await supabase.auth.signInWithPassword(values);
  if (error !== null) {
    return err({ code: error.code ?? 'AUTH_ERROR', message: error.message });
  }
  return ok(undefined);
};

export const signUp = async (values: SignUpValues): Promise<Result<void, AuthError>> => {
  const { error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
  });
  if (error !== null) {
    return err({ code: error.code ?? 'AUTH_ERROR', message: error.message });
  }
  return ok(undefined);
};

export const signOut = async (): Promise<Result<void, AuthError>> => {
  const { error } = await supabase.auth.signOut();
  if (error !== null) {
    return err({ code: error.code ?? 'AUTH_ERROR', message: error.message });
  }
  return ok(undefined);
};
