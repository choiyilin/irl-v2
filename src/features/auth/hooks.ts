import { useMutation } from '@tanstack/react-query';

import { type AuthError, signIn, signOut, signUp } from './api';
import { type SignInValues, type SignUpValues } from './schemas';

export const useSignIn = () =>
  useMutation<void, AuthError, SignInValues>({
    mutationFn: async (values) => {
      const r = await signIn(values);
      if (!r.ok) {
        throw r.error;
      }
    },
  });

export const useSignUp = () =>
  useMutation<void, AuthError, SignUpValues>({
    mutationFn: async (values) => {
      const r = await signUp(values);
      if (!r.ok) {
        throw r.error;
      }
    },
  });

export const useSignOut = () =>
  useMutation<void, AuthError, void>({
    mutationFn: async () => {
      const r = await signOut();
      if (!r.ok) {
        throw r.error;
      }
    },
  });
