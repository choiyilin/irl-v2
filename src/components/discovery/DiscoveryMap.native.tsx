import { Text, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';

import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

import type { DiscoveryMapProps } from './types';

export function DiscoveryMap({
  style,
  promotions,
  region,
  selectedPromotionId,
  onSelectPromotion,
  onRegionChangeComplete,
}: DiscoveryMapProps): React.JSX.Element {
  return (
    <MapView style={style} initialRegion={region} onRegionChangeComplete={onRegionChangeComplete}>
      {promotions.map((promotion) => {
        if (promotion.latitude === null || promotion.longitude === null) {
          return null;
        }

        return (
          <Marker
            key={promotion.id}
            coordinate={{
              latitude: promotion.latitude,
              longitude: promotion.longitude,
            }}
            pinColor={promotion.id === selectedPromotionId ? '#D19B00' : 'rgba(209, 155, 0, 0.55)'}
            onPress={() => onSelectPromotion(promotion.id)}>
            <Callout>
              <View style={{ maxWidth: 220, gap: 4 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: typography.fontFamily,
                    fontSize: 14,
                    fontWeight: '700',
                  }}>
                  {promotion.business_name}
                </Text>
                <Text
                  style={{
                    color: colors.text,
                    fontFamily: typography.fontFamily,
                    fontSize: 13,
                  }}>
                  {promotion.description}
                </Text>
              </View>
            </Callout>
          </Marker>
        );
      })}
    </MapView>
  );
}
