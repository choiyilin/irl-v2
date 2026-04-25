import { type ZodTypeAny } from 'zod';

import {
  BirthdateSchema,
  FreeFieldSchema,
  GenderSchema,
  HeightSchema,
  InterestedInSchema,
  NameSchema,
  OrientationSchema,
} from './schemas';

export type OnboardingField =
  | 'name'
  | 'birthdate'
  | 'gender'
  | 'orientation'
  | 'interestedIn'
  | 'photos'
  | 'occupation'
  | 'education'
  | 'city'
  | 'hometown'
  | 'height';

export type OnboardingStep = Readonly<{
  id: number;
  field: OnboardingField;
  title: string;
  schema: ZodTypeAny;
}>;

export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStep> = [
  { id: 0, field: 'name', title: 'What’s your name?', schema: NameSchema },
  { id: 1, field: 'birthdate', title: 'When were you born?', schema: BirthdateSchema },
  { id: 2, field: 'gender', title: 'Your gender', schema: GenderSchema },
  { id: 3, field: 'orientation', title: 'Sexual orientation', schema: OrientationSchema },
  { id: 4, field: 'interestedIn', title: 'Interested in seeing', schema: InterestedInSchema },
  { id: 5, field: 'photos', title: 'Add 6 photos', schema: FreeFieldSchema },
  { id: 6, field: 'occupation', title: 'What do you do?', schema: FreeFieldSchema },
  { id: 7, field: 'education', title: 'Education', schema: FreeFieldSchema },
  { id: 8, field: 'city', title: 'Current city', schema: FreeFieldSchema },
  { id: 9, field: 'hometown', title: 'Hometown', schema: FreeFieldSchema },
  { id: 10, field: 'height', title: 'Height', schema: HeightSchema },
] as const;

export const findStep = (id: number): OnboardingStep | undefined =>
  ONBOARDING_STEPS.find((s) => s.id === id);

export const nextStep = (id: number): OnboardingStep | undefined => findStep(id + 1);
export const isLastStep = (id: number): boolean => id === ONBOARDING_STEPS.length - 1;
