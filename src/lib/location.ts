import * as Location from 'expo-location';

export type Coords = { lat: number; lng: number };

/**
 * Best-effort current position. Permission is requested contextually
 * (brief §5: location only when Discover or the spot picker needs it).
 */
export async function getCurrentCoords(): Promise<Coords | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
}

/**
 * The current position, only if the user has already allowed location. It
 * never shows the permission prompt, so a screen can call it on arrival.
 */
export async function getCoordsIfAllowed(): Promise<Coords | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const position =
      (await Location.getLastKnownPositionAsync({ maxAge: 5 * 60 * 1000 })) ??
      (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { lat: position.coords.latitude, lng: position.coords.longitude };
  } catch {
    return null;
  }
}

// The phone's geocoder refuses requests that come too fast, so every lookup
// waits for the one before it.
let geocoderLine: Promise<unknown> = Promise.resolve();

function lookUp(lat: number, lng: number): Promise<Location.LocationGeocodedAddress | null> {
  const next = geocoderLine.then(async () => {
    try {
      const [hit] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      return hit ?? null;
    } catch {
      return null;
    }
  });
  geocoderLine = next;
  return next;
}

/**
 * The name people use for the area around a coordinate: the neighborhood if
 * the system knows one, or else the city or the wider area. It asks the
 * phone's own geocoder, which sends the coordinate to the platform's service
 * (Apple on iOS). Null when the geocoder has no answer or is not available.
 */
export async function areaNameAt(lat: number, lng: number): Promise<string | null> {
  const hit = await lookUp(lat, lng);
  return hit?.district || hit?.city || hit?.subregion || hit?.region || null;
}

/** The city around a coordinate, or the wider area where there is no city. */
export async function cityNameAt(lat: number, lng: number): Promise<string | null> {
  const hit = await lookUp(lat, lng);
  return hit?.city || hit?.subregion || hit?.region || null;
}
