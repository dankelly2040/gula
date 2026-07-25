internal import ExpoModulesCore
import MapKit

/**
 * Nearby pizza place search backed by MapKit's MKLocalSearch: on-device,
 * no API key, same POI data as Apple Maps. Results are display-only per
 * Apple's MapKit terms; they are never written to the spots table. A venue
 * becomes a persistent community spot only when the user logs a pizza there.
 */
class PizzaPlacesModule: Module {
  public func definition() -> ModuleDefinition {
    AsyncFunction("searchNearby") { (lat: Double, lng: Double, radiusMeters: Double) -> [[String: Any?]] in
      let request = MKLocalSearch.Request()
      request.naturalLanguageQuery = "pizza"
      request.resultTypes = .pointOfInterest
      request.region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: lat, longitude: lng),
        latitudinalMeters: radiusMeters,
        longitudinalMeters: radiusMeters
      )

      let response = try await MKLocalSearch(request: request).start()
      let origin = CLLocation(latitude: lat, longitude: lng)

      return response.mapItems.map { item in
        let coordinate = item.placemark.coordinate
        let distance = origin.distance(
          from: CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        )
        return [
          "name": item.name ?? "Pizza place",
          "lat": coordinate.latitude,
          "lng": coordinate.longitude,
          "address": item.placemark.title,
          "distanceMeters": distance,
        ]
      }
      .sorted { ($0["distanceMeters"] as? Double ?? 0) < ($1["distanceMeters"] as? Double ?? 0) }
    }
  }
}
