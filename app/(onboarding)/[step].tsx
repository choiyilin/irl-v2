import { useLocalSearchParams } from 'expo-router';

import { OnboardingStepScreen } from '@/features/onboarding';

export default function OnboardingStepRoute() {
  const { step } = useLocalSearchParams<{ step: string }>();
  const stepId = Number.parseInt(step ?? '0', 10);
  return <OnboardingStepScreen stepId={Number.isFinite(stepId) ? stepId : 0} />;
}
