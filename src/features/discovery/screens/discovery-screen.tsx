import MapView, { Marker } from 'react-native-maps';
import { StyleSheet } from 'react-native-unistyles';

import { ACTIVE_CITY, getCity } from '@/config/city';
import { Screen, Text } from '@/ui';

import { usePromotions } from '../hooks';

export const DiscoveryScreen = () => {
  const city = getCity(ACTIVE_CITY);
  const { data, isLoading, isError } = usePromotions(city.bbox);

  return (
    <Screen edges={['top', 'left', 'right']}>
      <Text variant="heading">Discover</Text>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: city.center.latitude,
          longitude: city.center.longitude,
          latitudeDelta: city.defaultLatitudeDelta,
          longitudeDelta: city.defaultLongitudeDelta,
        }}
      >
        {(data ?? []).map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            title={p.business_name}
            description={p.description ?? undefined}
          />
        ))}
      </MapView>
      {isLoading && <Text muted>Loading promotions…</Text>}
      {isError && <Text muted>Could not load promotions.</Text>}
    </Screen>
  );
};

const styles = StyleSheet.create((theme) => ({
  map: {
    flex: 1,
    marginVertical: theme.space.md,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
  },
}));
