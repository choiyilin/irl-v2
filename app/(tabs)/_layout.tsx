import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { IrlExploreMatchingHeader } from '@/src/components/IrlMark';
import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';

const tabIconStyles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 40,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.brandPink,
  },
});

function TabBarIconWithDot({
  name,
  color,
  focused,
  size = 22,
}: {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
  size?: number;
}) {
  return (
    <View style={tabIconStyles.wrap}>
      <Ionicons name={name} color={color} size={size} />
      {focused ? <View style={tabIconStyles.dot} /> : null}
    </View>
  );
}

function TabHeartIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <TabBarIconWithDot
      name={focused ? 'heart' : 'heart-outline'}
      color={color}
      focused={focused}
      size={24}
    />
  );
}

export default function TabLayout() {
  const { session } = useAuth();

  if (!session) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.exploreCanvas,
          paddingHorizontal: 0,
        },
        headerShadowVisible: false,
        header: (props) => (
          <IrlExploreMatchingHeader safeTopFromNav={props.insets?.top} />
        ),
        tabBarActiveTintColor: colors.brandPink,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarShowLabel: false,
        tabBarStyle: {
          position: 'absolute',
          left: 20,
          right: 20,
          bottom: 24,
          height: 64,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: 999,
          backgroundColor: colors.background,
          borderTopWidth: 0,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 8,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      }}>
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          headerShown: true,
          tabBarIcon: ({ color, focused }) => (
            <TabHeartIcon color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          href: null,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="discovery"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWithDot name="compass-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWithDot name="chatbubble-ellipses-outline" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWithDot name="person-outline" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
