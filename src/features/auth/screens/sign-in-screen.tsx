import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Button, Screen, Text } from '@/ui';

import { useSignIn } from '../hooks';
import { type SignInValues, SignInSchema } from '../schemas';

export const SignInScreen = () => {
  const { mutateAsync, isPending, error } = useSignIn();
  const { control, handleSubmit, formState } = useForm<SignInValues>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync(values);
    router.replace('/(tabs)/explore');
  });

  return (
    <Screen>
      <Text variant="heading">Welcome back</Text>
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
                style={styles.input}
                placeholder="Email"
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
                style={styles.input}
                placeholder="Password"
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
        label="Sign in"
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
