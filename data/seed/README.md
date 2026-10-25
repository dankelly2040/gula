# Seed data

Raw inputs for the Pizza Quest map. Fetched October 22, 2026.

- `seattle-districts.geojson`: 20 district polygons. City of Seattle Neighborhood Map Atlas (`nma_nhoods_main`), open data, WGS84.
- `seattle-neighborhoods.geojson`: 94 neighborhood polygons from the same atlas (`nma_nhoods_sub`).
- `osm-seattle-pizza.json`: 183 named pizza places inside Seattle city limits from OpenStreetMap via Overpass. License ODbL; attribution "© OpenStreetMap contributors" is required wherever the data is shown.
- `osm-seattle-pizza.overpassql`: the query that produced it. Re-run against an Overpass endpoint to refresh.

Apple MapKit results from `PizzaPlacesModule` are display only and must never be merged into these files.
