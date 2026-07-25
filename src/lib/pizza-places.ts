import { requireNativeModule } from 'expo';

export type PizzaPlace = {
  name: string;
  lat: number;
  lng: number;
  address: string | null;
  distanceMeters: number;
};

type PizzaPlacesNative = {
  searchNearby(lat: number, lng: number, radiusMeters: number): Promise<PizzaPlace[]>;
};

// Inline module (src/native/PizzaPlacesModule.swift). Missing only when the
// native build predates the module; degrade to no results instead of crashing.
let native: PizzaPlacesNative | null = null;
try {
  native = requireNativeModule<PizzaPlacesNative>('PizzaPlacesModule');
} catch {
  native = null;
}

export async function searchPizzaPlacesNearby(
  lat: number,
  lng: number,
  radiusMeters = 4000
): Promise<PizzaPlace[]> {
  if (!native) return [];
  try {
    return await native.searchNearby(lat, lng, radiusMeters);
  } catch {
    return [];
  }
}
