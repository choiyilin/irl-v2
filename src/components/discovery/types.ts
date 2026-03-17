import type { StyleProp, ViewStyle } from 'react-native';

export type Promotion = {
  id: string;
  business_name: string;
  category: string;
  description: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};

export type Region = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type DiscoveryMapProps = {
  style?: StyleProp<ViewStyle>;
  promotions: Promotion[];
  region: Region;
  selectedPromotionId: string | null;
  onSelectPromotion: (promotionId: string) => void;
  onRegionChangeComplete: (nextRegion: Region) => void;
};
