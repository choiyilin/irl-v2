import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

export default function DiscoveryScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Discovery</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Nearby date deals placeholder</Text>
        <Text style={styles.cardBody}>
          Restaurants, coffee shops, and businesses with date-night promotions will appear here.
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Future navigation</Text>
        <Text style={styles.cardBody}>
          Deal details, map view, save/favorite promotions, and redemption flow.
        </Text>
      </View>
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
});

