import { StyleSheet, Switch, Text, View } from 'react-native';

import { useAuth } from '@/src/providers/AuthProvider';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

export default function ProfileScreen() {
  const { signOut, user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile & Settings</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Text style={styles.cardBody}>{user?.email ?? 'Signed in user'}</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Location sharing</Text>
        <View style={styles.row}>
          <Text style={styles.cardBody}>Enable for nearby date promos</Text>
          <Switch value />
        </View>
      </View>
      <Text style={styles.logout} onPress={() => signOut()}>
        Sign out
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 16,
    gap: 12,
  },
  title: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: '600',
  },
  cardBody: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  logout: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    textDecorationLine: 'underline',
    marginTop: 8,
  },
});

