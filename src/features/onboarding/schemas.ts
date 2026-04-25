import { z } from 'zod';

export const Gender = z.enum(['man', 'woman', 'non_binary', 'self_describe']);
export type Gender = z.infer<typeof Gender>;

export const Orientation = z.enum(['straight', 'gay', 'bisexual']);
export type Orientation = z.infer<typeof Orientation>;

export const InterestedInTarget = z.enum(['women', 'men', 'non_binary', 'everyone']);
export type InterestedInTarget = z.infer<typeof InterestedInTarget>;

export const NameSchema = z.object({
  firstName: z.string().min(1).max(40),
  lastName: z.string().min(1).max(40),
});
export type NameValues = z.infer<typeof NameSchema>;

export const BirthdateSchema = z.object({
  birthdate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
});
export type BirthdateValues = z.infer<typeof BirthdateSchema>;

export const GenderSchema = z.object({ gender: Gender });
export type GenderValues = z.infer<typeof GenderSchema>;

export const OrientationSchema = z.object({ orientation: Orientation });
export type OrientationValues = z.infer<typeof OrientationSchema>;

export const InterestedInSchema = z.object({
  interestedIn: z.array(InterestedInTarget).min(1),
});
export type InterestedInValues = z.infer<typeof InterestedInSchema>;

export const FreeFieldSchema = z.object({ value: z.string().max(120) });
export type FreeFieldValues = z.infer<typeof FreeFieldSchema>;

export const HeightSchema = z.object({ heightInches: z.number().int().min(48).max(84) });
export type HeightValues = z.infer<typeof HeightSchema>;
