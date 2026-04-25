import { z } from 'zod';

export const SignInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type SignInValues = z.infer<typeof SignInSchema>;

export const SignUpSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirm: z.string().min(8),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords must match',
  });
export type SignUpValues = z.infer<typeof SignUpSchema>;
