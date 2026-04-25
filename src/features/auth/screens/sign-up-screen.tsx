import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Screen, Text } from '@/ui';

import { useSignUp } from '../hooks';
import { type SignUpValues, SignUpSchema } from '../schemas';

export const SignUpScreen = () => {
  const { mutateAsync, isPending, error } = useSignUp();
  const { control, handleSubmit, formState } = useForm<SignUpValues>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { email: '', password: '', confirm: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync(values);
    router.replace('/(onboarding)/0');
  });

  return (
    <Screen>
      <Text variant="heading">Create your account</Text>
      <View style={styles.field}>
        <Controller
          control={control}
          name="email"
          render={({ field, fieldState }) => (
            <>
              <TextInput
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={field.onChange}
                value={field.value}
                placeholder="Email"
                style={styles.input}
              />
              {fieldState.error !== undefined && (
                <Text variant="caption" muted>
                  {fieldState.error.message}
                </Text>
              )}
            </>
          )}
        />
      </View>
      <View style={styles.field}>
        <Controller
          control={control}
          name="password"
          render={({ field, fieldState }) => (
            <>
              <TextInput
                accessibilityLabel="Password"
                secureTextEntry
                onChangeText={field.onChange}
                value={field.value}
                placeholder="Password (8+ characters)"
                style={styles.input}
              />
              {fieldState.error !== undefined && (
                <Text variant="caption" muted>
                  {fieldState.error.message}
                </Text>
              )}
            </>
          )}
        />
      </View>
      <View style={styles.field}>
        <Controller
          control={control}
          name="confirm"
          render={({ field, fieldState }) => (
            <>
              <TextInput
                accessibilityLabel="Confirm password"
                secureTextEntry
                onChangeText={field.onChange}
                value={field.value}
                placeholder="Confirm password"
                style={styles.input}
              />
              {fieldState.error !== undefined && (
                <Text variant="caption" muted>
                  {fieldState.error.message}
                </Text>
              )}
            </>
          )}
        />
      </View>
      {error !== null && (
        <Text variant="caption" muted>
          {error.message}
        </Text>
      )}
      <Button
        label="Continue"
        onPress={onSubmit}
        loading={isPending}
        disabled={!formState.isValid}
      />
    </Screen>
  );
};

const styles = StyleSheet.create((theme) => ({
  field: { marginVertical: theme.space.sm },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.space.md,
    color: theme.colors.text,
  },
}));
