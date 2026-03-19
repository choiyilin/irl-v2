import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DiscoveryMap } from '../../src/components/discovery/DiscoveryMap';
import type { Promotion, Region } from '../../src/components/discovery/types';
import { supabase } from '@/src/lib/supabase';
import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

const DEFAULT_REGION: Region = {
  latitude: 40.7414,
  longitude: -73.9897,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_MAX_HEIGHT = Math.max(340, Math.min(520, SCREEN_HEIGHT * 0.55));
const SHEET_MIN_HEIGHT = 170;
const SHEET_COLLAPSED_OFFSET = SHEET_MAX_HEIGHT - SHEET_MIN_HEIGHT;
const FILTER_OPTIONS = ['All', 'Bars', 'Clubs', 'Restaurants'] as const;

const getPromoBadgeLabel = (description: string): string => {
  const percentMatch = description.match(/(\d{1,2})\s?%/);
  if (percentMatch?.[1]) {
    return `${percentMatch[1]}% Back`;
  }
  if (/free/i.test(description)) {
    return 'Free Bonus';
  }
  return 'IRL Deal';
};

export default function DiscoveryScreen(): React.JSX.Element {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [selectedPromotionId, setSelectedPromotionId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<(typeof FILTER_OPTIONS)[number]>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDealModalVisible, setIsDealModalVisible] = useState(false);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [isClaimingDeal, setIsClaimingDeal] = useState(false);
  const [dealNotice, setDealNotice] = useState('');
  const [availability, setAvailability] = useState<{
    max_claims: number;
    claimed_count: number;
    remaining_count: number;
    already_claimed: boolean;
  } | null>(null);
  const sheetTranslateY = useRef(new Animated.Value(SHEET_COLLAPSED_OFFSET)).current;
  const sheetOffset = useRef(SHEET_COLLAPSED_OFFSET);

  const snapSheet = useCallback(
    (toValue: number) => {
      Animated.spring(sheetTranslateY, {
        toValue,
        useNativeDriver: true,
        tension: 55,
        friction: 10,
      }).start(() => {
        sheetOffset.current = toValue;
      });
    },
    [sheetTranslateY],
  );

  const loadPromotions = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage('');

    const { data, error } = await supabase
      .from('business_promotions')
      .select('id, business_name, category, description, address, latitude, longitude, max_claims')
      .eq('is_active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) {
      setErrorMessage(error.message);
      setPromotions([]);
      setIsLoading(false);
      return;
    }

    const normalizedRows = (data ?? []).filter(
      (row) => typeof row.latitude === 'number' && typeof row.longitude === 'number',
    ) as Promotion[];
    setPromotions(normalizedRows);

    if (normalizedRows.length > 0) {
      const first = normalizedRows[0];
      setRegion((current) => ({
        ...current,
        latitude: first.latitude ?? current.latitude,
        longitude: first.longitude ?? current.longitude,
      }));
      setSelectedPromotionId(first.id);
    } else {
      setSelectedPromotionId(null);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const visiblePromotions = useMemo(() => {
    const latitudeRadius = region.latitudeDelta / 2;
    const longitudeRadius = region.longitudeDelta / 2;

    return promotions.filter((promotion) => {
      if (promotion.latitude === null || promotion.longitude === null) {
        return false;
      }

      const inLatitudeRange =
        promotion.latitude >= region.latitude - latitudeRadius &&
        promotion.latitude <= region.latitude + latitudeRadius;
      const inLongitudeRange =
        promotion.longitude >= region.longitude - longitudeRadius &&
        promotion.longitude <= region.longitude + longitudeRadius;

      return inLatitudeRange && inLongitudeRange;
    });
  }, [promotions, region]);

  const filteredVisiblePromotions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return visiblePromotions.filter((promotion) => {
      if (selectedCategory !== 'All') {
        const normalizedCategory = promotion.category.toLowerCase();
        const selectedKeyword =
          selectedCategory === 'Bars'
            ? 'bar'
            : selectedCategory === 'Clubs'
              ? 'club'
              : 'restaurant';
        const matchesCategory = normalizedCategory.includes(selectedKeyword);
        if (!matchesCategory) {
          return false;
        }
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchable = [
        promotion.business_name,
        promotion.category,
        promotion.description,
        promotion.address ?? '',
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [searchQuery, selectedCategory, visiblePromotions]);

  const selectedPromotion = useMemo(
    () => promotions.find((promotion) => promotion.id === selectedPromotionId) ?? null,
    [promotions, selectedPromotionId],
  );
  const listPromotions = useMemo(() => {
    if (!selectedPromotionId) {
      return filteredVisiblePromotions;
    }

    return filteredVisiblePromotions.filter((promotion) => promotion.id !== selectedPromotionId);
  }, [filteredVisiblePromotions, selectedPromotionId]);

  const handleRegionChangeComplete = (nextRegion: Region) => {
    setRegion(nextRegion);
  };

  const loadAvailability = useCallback(async (promotionId: string) => {
    setIsAvailabilityLoading(true);
    setDealNotice('');
    try {
      const { data, error } = await supabase.rpc('get_promotion_availability', {
        p_promotion_id: promotionId,
      });
      if (error) throw error;

      const row = (Array.isArray(data) ? data[0] : data) as
        | {
            max_claims: number;
            claimed_count: number;
            remaining_count: number;
            already_claimed: boolean;
          }
        | undefined;

      if (!row) {
        throw new Error('Unable to load deal availability.');
      }

      setAvailability(row);
    } catch (error) {
      setAvailability(null);
      setDealNotice(error instanceof Error ? error.message : 'Unable to load deal details.');
    } finally {
      setIsAvailabilityLoading(false);
    }
  }, []);

  const openDealModal = (promotionId: string) => {
    setIsDealModalVisible(true);
    loadAvailability(promotionId);
  };

  const handleSelectPromotion = (promotionId: string) => {
    setSelectedPromotionId(promotionId);
    snapSheet(0);
    openDealModal(promotionId);
  };

  const handleClaimDeal = async () => {
    if (!selectedPromotionId) return;
    setIsClaimingDeal(true);
    setDealNotice('');
    try {
      const { error } = await supabase.rpc('claim_promotion_ticket', {
        p_promotion_id: selectedPromotionId,
      });
      if (error) throw error;

      setDealNotice('Deal claimed. Your ticket is now in Profile > Tickets.');
      await loadAvailability(selectedPromotionId);
    } catch (error) {
      setDealNotice(error instanceof Error ? error.message : 'Unable to claim deal.');
    } finally {
      setIsClaimingDeal(false);
    }
  };

  const remainingDealLabel = useMemo(() => {
    if (!availability) {
      return '';
    }

    if (availability.max_claims === 1) {
      return `${availability.remaining_count} reservation remaining`;
    }

    return `${availability.remaining_count} tickets remaining`;
  }, [availability]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
        onPanResponderMove: (_, gestureState) => {
          const nextY = Math.max(
            0,
            Math.min(SHEET_COLLAPSED_OFFSET, sheetOffset.current + gestureState.dy),
          );
          sheetTranslateY.setValue(nextY);
        },
        onPanResponderRelease: (_, gestureState) => {
          const isFastSwipeUp = gestureState.vy < -0.65;
          const isFastSwipeDown = gestureState.vy > 0.65;
          const halfway = SHEET_COLLAPSED_OFFSET / 2;
          const shouldExpand =
            isFastSwipeUp || (!isFastSwipeDown && sheetOffset.current + gestureState.dy < halfway);

          snapSheet(shouldExpand ? 0 : SHEET_COLLAPSED_OFFSET);
        },
        onPanResponderTerminate: () => {
          snapSheet(sheetOffset.current > SHEET_COLLAPSED_OFFSET / 2 ? SHEET_COLLAPSED_OFFSET : 0);
        },
      }),
    [sheetTranslateY, snapSheet],
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.text} />
        </View>
      ) : null}

      {!isLoading && errorMessage ? (
        <View style={styles.centerState}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Pressable style={styles.refreshButton} onPress={loadPromotions}>
            <Text style={styles.refreshText}>Try again</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !errorMessage ? (
        <>
          <View style={styles.mapWrapper}>
            <DiscoveryMap
              style={styles.map}
              promotions={promotions}
              region={region}
              selectedPromotionId={selectedPromotionId}
              onSelectPromotion={handleSelectPromotion}
              onRegionChangeComplete={handleRegionChangeComplete}
            />
          </View>

          <View style={styles.overlayControls}>
            <View style={styles.searchBar}>
              <Ionicons name="search" size={18} color={colors.tabInactive} />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search restaurants, food, drinks..."
                placeholderTextColor={colors.tabInactive}
                style={styles.searchInput}
              />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContent}>
              {FILTER_OPTIONS.map((category) => {
                const isSelected = category === selectedCategory;
                return (
                  <Pressable
                    key={category}
                    style={[styles.chip, isSelected && styles.chipActive]}
                    onPress={() => setSelectedCategory(category)}>
                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{category}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Animated.View
            style={[styles.sheet, { transform: [{ translateY: sheetTranslateY }] }]}
            {...panResponder.panHandlers}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Venues in view</Text>
              <View style={styles.counterPill}>
                <Text style={styles.counterText}>{filteredVisiblePromotions.length}</Text>
              </View>
            </View>

            {selectedPromotion ? (
              <Pressable
                style={styles.selectedCard}
                onPress={() => handleSelectPromotion(selectedPromotion.id)}>
                <View style={styles.selectedTopRow}>
                  <Text style={styles.selectedName}>{selectedPromotion.business_name}</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{getPromoBadgeLabel(selectedPromotion.description)}</Text>
                  </View>
                </View>
                <Text style={styles.selectedMeta}>
                  {[selectedPromotion.category, selectedPromotion.address].filter(Boolean).join(' • ')}
                </Text>
                <Text style={styles.selectedDescription}>{selectedPromotion.description}</Text>
              </Pressable>
            ) : null}

            <FlatList
              data={listPromotions}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = item.id === selectedPromotionId;
                const badgeLabel = getPromoBadgeLabel(item.description);

                return (
                  <Pressable
                    style={[styles.listCard, isSelected && styles.listCardSelected]}
                    onPress={() => handleSelectPromotion(item.id)}>
                    <View style={styles.listTopRow}>
                      <Text style={styles.listTitle}>{item.business_name}</Text>
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badgeLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.listMeta}>
                      {[item.category, item.address].filter(Boolean).join(' • ')}
                    </Text>
                    <Text style={styles.listDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </Pressable>
                );
              }}
              ListEmptyComponent={
                filteredVisiblePromotions.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.cardTitle}>No promotions in this map area</Text>
                    <Text style={styles.cardBody}>Move the map or clear filters to discover more venues.</Text>
                  </View>
                ) : null
              }
            />
          </Animated.View>
        </>
      ) : null}

      <Modal
        visible={isDealModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDealModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setIsDealModalVisible(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPromotion?.business_name ?? 'Deal details'}
              </Text>
              <Pressable onPress={() => setIsDealModalVisible(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.modalDescription}>
              {selectedPromotion?.description ?? 'Promotion details'}
            </Text>

            {isAvailabilityLoading ? (
              <View style={styles.modalCenter}>
                <ActivityIndicator color={colors.text} />
              </View>
            ) : (
              <>
                {availability ? (
                  <Text style={styles.availabilityText}>{remainingDealLabel}</Text>
                ) : null}
                {dealNotice ? <Text style={styles.modalNotice}>{dealNotice}</Text> : null}
                <Pressable
                  style={[
                    styles.claimButton,
                    (isClaimingDeal ||
                      !availability ||
                      availability.already_claimed ||
                      availability.remaining_count <= 0) &&
                      styles.claimButtonDisabled,
                  ]}
                  disabled={
                    isClaimingDeal ||
                    !availability ||
                    availability.already_claimed ||
                    availability.remaining_count <= 0
                  }
                  onPress={handleClaimDeal}>
                  <Text style={styles.claimButtonText}>
                    {isClaimingDeal
                      ? 'Claiming...'
                      : availability?.already_claimed
                        ? 'Already claimed'
                        : availability && availability.remaining_count <= 0
                          ? 'Sold out'
                          : 'Claim deal'}
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#EFEFEF',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayControls: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.96)',
    paddingHorizontal: 12,
    minHeight: 48,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    paddingVertical: 0,
  },
  chipsContent: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  chipActive: {
    backgroundColor: '#F3C712',
    borderColor: '#E0B300',
  },
  chipText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    fontWeight: '700',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: SHEET_MAX_HEIGHT,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 14,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -2 },
    elevation: 18,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginBottom: 10,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sheetTitle: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: '700',
  },
  counterPill: {
    minWidth: 32,
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#F3C712',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    color: '#1F1F1F',
    fontFamily: typography.fontFamily,
    fontSize: 13,
    fontWeight: '700',
  },
  selectedCard: {
    backgroundColor: '#FFF9DE',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1D66A',
    padding: 14,
    gap: 4,
    marginBottom: 10,
  },
  selectedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  selectedName: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 18,
    fontWeight: '700',
  },
  selectedMeta: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 13,
  },
  selectedDescription: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  listContent: {
    gap: 10,
    paddingBottom: 92,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 4,
  },
  listCardSelected: {
    borderColor: '#E0B300',
    backgroundColor: '#FFF9E8',
  },
  listTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  listTitle: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  listMeta: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 13,
  },
  listDescription: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
  },
  badge: {
    backgroundColor: '#F3C712',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D5A500',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#1F1F1F',
    fontFamily: typography.fontFamily,
    fontSize: 12,
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
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 6,
  },
  refreshButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
  },
  refreshText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 14,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.32)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 20,
    fontWeight: '700',
  },
  modalDescription: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 15,
  },
  modalCenter: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  availabilityText: {
    color: colors.text,
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: '700',
  },
  modalNotice: {
    color: colors.mutedText,
    fontFamily: typography.fontFamily,
    fontSize: 13,
  },
  claimButton: {
    backgroundColor: '#F3C712',
    borderColor: '#D5A500',
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  claimButtonDisabled: {
    opacity: 0.55,
  },
  claimButtonText: {
    color: '#1F1F1F',
    fontFamily: typography.fontFamily,
    fontSize: 15,
    fontWeight: '700',
  },
});

