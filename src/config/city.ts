export type CityKey = 'nyc';

export type City = Readonly<{
  key: CityKey;
  displayName: string;
  center: Readonly<{ latitude: number; longitude: number }>;
  bbox: Readonly<{ north: number; south: number; east: number; west: number }>;
  defaultLatitudeDelta: number;
  defaultLongitudeDelta: number;
}>;

const NYC: City = {
  key: 'nyc',
  displayName: 'New York City',
  center: { latitude: 40.7414, longitude: -73.9897 },
  bbox: { north: 40.917577, south: 40.477399, east: -73.700272, west: -74.25909 },
  defaultLatitudeDelta: 0.05,
  defaultLongitudeDelta: 0.05,
};

const CITIES: Readonly<Record<CityKey, City>> = { nyc: NYC };

export const ACTIVE_CITY: CityKey = 'nyc';

export const getCity = (key: CityKey = ACTIVE_CITY): City => CITIES[key];
