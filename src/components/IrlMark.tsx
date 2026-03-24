import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

/** Same box as `headerIconBtn` (padding 8) + heart icon 22 — keeps IRL aligned with overview row */
const HEADER_RIGHT_SLOT = 8 + 22 + 8;

function useHeaderPaddingTop(safeTopFromNav?: number) {
  const { top: topFromContext } = useSafeAreaInsets();
  return Math.max(safeTopFromNav ?? topFromContext, 12);
}

/** Plain wordmark (e.g. nested native title slots) */
export function IrlMarkHeader() {
  return (
    <Text style={styles.logo} accessibilityRole="header">
      IRL
    </Text>
  );
}

/**
 * Explore: IRL + matches heart. Same row geometry as `IrlExploreMatchingHeader`
 * (space-between + fixed right slot) so the logo lines up with other tabs.
 */
export function IrlExploreOverviewHeader({
  matchCount,
  onMatchesPress,
  safeTopFromNav,
}: {
  matchCount: number;
  onMatchesPress: () => void;
  /** Prefer navigator `header` callback `insets.top` so it matches other tabs */
  safeTopFromNav?: number;
}) {
  const padTop = useHeaderPaddingTop(safeTopFromNav);
  return (
    <View style={[styles.headerBar, styles.headerBarFullWidth, { paddingTop: padTop }]}>
      <View style={styles.headerRowSpread}>
        <Text style={styles.logo} accessibilityRole="header">
          IRL
        </Text>
        <Pressable
          style={styles.headerIconBtn}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Matches"
          onPress={onMatchesPress}>
          <View>
            <Ionicons name="heart" size={22} color={colors.brandPink} />
            {matchCount > 0 ? (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{matchCount > 99 ? '99+' : String(matchCount)}</Text>
              </View>
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Other tabs: identical row to overview (space-between + same right slot width)
 * so IRL sits in the same place; right side is an invisible spacer.
 */
export function IrlExploreMatchingHeader({ safeTopFromNav }: { safeTopFromNav?: number } = {}) {
  const padTop = useHeaderPaddingTop(safeTopFromNav);
  return (
    <View style={[styles.headerBar, styles.headerBarFullWidth, { paddingTop: padTop }]}>
      <View style={styles.headerRowSpread}>
        <Text style={styles.logo} accessibilityRole="header">
          IRL
        </Text>
        <View style={styles.rightSlotSpacer} pointerEvents="none" />
      </View>
    </View>
  );
}

type MatchesBackBehavior = 'pop' | 'explore';

/**
 * Matches stack: back + IRL. Use `explore` on the list so we always return to the feed
 * (reliable with tab + stack). Use `pop` on match profile to return to the list.
 */
export function IrlExploreMatchingHeaderWithBack({
  safeTopFromNav,
  backBehavior = 'pop',
}: {
  safeTopFromNav?: number;
  backBehavior?: MatchesBackBehavior;
} = {}) {
  const padTop = useHeaderPaddingTop(safeTopFromNav);
  const router = useRouter();
  const onBack = () => {
    if (backBehavior === 'explore') {
      router.replace('/(tabs)/explore');
      return;
    }
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)/explore');
  };
  return (
    <View style={[styles.headerBar, styles.headerBarFullWidth, { paddingTop: padTop }]}>
      <View style={styles.headerRow}>
        <Pressable
          onPress={onBack}
          hitSlop={{ top: 12, bottom: 12, left: 16, right: 12 }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel={backBehavior === 'explore' ? 'Back to explore' : 'Go back'}>
          <Ionicons name="chevron-back" size={28} color={colors.text} />
        </Pressable>
        <Text style={styles.logo} accessibilityRole="header">
          IRL
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    backgroundColor: colors.exploreCanvas,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  headerBarFullWidth: {
    width: '100%',
    alignSelf: 'stretch',
  },
  headerRowSpread: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rightSlotSpacer: {
    width: HEADER_RIGHT_SLOT,
    height: HEADER_RIGHT_SLOT,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backBtn: {
    marginLeft: -8,
    marginRight: 2,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 2,
  },
  logo: {
    fontFamily: typography.fontFamily,
    fontSize: 28,
    fontWeight: '800',
    color: colors.brandPink,
    letterSpacing: -0.5,
  },
  headerIconBtn: {
    width: HEADER_RIGHT_SLOT,
    height: HEADER_RIGHT_SLOT,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifBadge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    fontFamily: typography.fontFamily,
  },
});
