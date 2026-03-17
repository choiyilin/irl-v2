import { Platform, Text, View } from 'react-native';

import { colors } from '@/src/theme/colors';
import { typography } from '@/src/theme/typography';

import type { DiscoveryMapProps } from './types';

type NativeMapViewProps = {
  style?: DiscoveryMapProps['style'];
  initialRegion: DiscoveryMapProps['region'];
  onRegionChangeComplete: DiscoveryMapProps['onRegionChangeComplete'];
  children?: React.ReactNode;
};

type NativeMarkerProps = {
  coordinate: { latitude: number; longitude: number };
  pinColor?: string;
  onPress: () => void;
  children?: React.ReactNode;
};

type NativeCalloutProps = {
  children?: React.ReactNode;
};

type NativeMapModule = {
  default: React.ComponentType<NativeMapViewProps>;
  Marker: React.ComponentType<NativeMarkerProps>;
  Callout: React.ComponentType<NativeCalloutProps>;
};

export function DiscoveryMap({
  style,
  promotions,
  region,
  selectedPromotionId,
  onSelectPromotion,
  onRegionChangeComplete,
}: DiscoveryMapProps): React.JSX.Element {
  if (Platform.OS === 'web') {
    return (
      <View
        style={[
          style,
          {
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 18,
            paddingVertical: 20,
            backgroundColor: '#DCDCDC',
            gap: 4,
          },
        ]}>
        <Text
          style={{
            color: colors.text,
            fontFamily: typography.fontFamily,
            fontSize: 16,
            fontWeight: '700',
            textAlign: 'center',
          }}>
          Map preview is available on iOS/Android
        </Text>
        <Text
          style={{
            color: colors.mutedText,
            fontFamily: typography.fontFamily,
            fontSize: 14,
            textAlign: 'center',
          }}>
          You can still browse promotions below.
        </Text>
      </View>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mapsModule = require('react-native-maps') as NativeMapModule;
  const MapView = mapsModule.default;
  const Marker = mapsModule.Marker;
  const Callout = mapsModule.Callout;

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
