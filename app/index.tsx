import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';

export default function Index() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (session) {
    const hasUploadedPhotos = session.user?.user_metadata?.has_uploaded_photos === true;
    const hasPreferences = session.user?.user_metadata?.has_completed_preferences === true;

    if (!hasUploadedPhotos) {
      return <Redirect href="/photos" />;
    }

    if (!hasPreferences) {
      return <Redirect href="/preferences" />;
    }

    return <Redirect href="/(tabs)/explore" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}

