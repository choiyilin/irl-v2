import { router } from 'expo-router';

import { Button, Screen, Text } from '@/ui';

import { findStep, isLastStep, nextStep } from '../steps';

export type OnboardingStepScreenProps = Readonly<{ stepId: number }>;

export const OnboardingStepScreen = ({ stepId }: OnboardingStepScreenProps) => {
  const step = findStep(stepId);
  if (step === undefined) {
    return (
      <Screen>
        <Text variant="title">Unknown step</Text>
      </Screen>
    );
  }
  const onContinue = (): void => {
    if (isLastStep(stepId)) {
      router.replace('/(tabs)/explore');
      return;
    }
    const next = nextStep(stepId);
    if (next !== undefined) {
      router.push({ pathname: '/(onboarding)/[step]', params: { step: String(next.id) } });
    }
  };
  return (
    <Screen>
      <Text variant="heading">{step.title}</Text>
      <Text variant="caption" muted>
        Step {stepId + 1} of 11
      </Text>
      {/* TODO: render the step-specific form using step.field + step.schema. */}
      <Button label="Continue" onPress={onContinue} />
    </Screen>
  );
};
