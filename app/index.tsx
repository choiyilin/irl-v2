import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { hasFinishedAppOnboarding } from "@/src/lib/authRouting";
import { useAuth } from "@/src/providers/AuthProvider";
import { colors } from "@/src/theme/colors";

export default function Index() {
  const { isLoading, session } = useAuth();

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  if (session) {
    if (!hasFinishedAppOnboarding(session.user)) {
      return <Redirect href="/(auth)/sign-up" />;
    }
    return <Redirect href="/(tabs)/explore" />;
  }

  return <Redirect href="/(auth)/sign-in" />;
}
