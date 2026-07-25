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
