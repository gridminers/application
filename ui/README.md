# Gridminers UI

Angular 22 Frontend zur Visualisierung der Investitionsanträge aus dem
[Gridminers-Backend](../backend/README.md). Die App lädt Anträge und
Kostenkennzahlen über die REST-API und stellt sie als Diagramme (ECharts) und
auf einer Karte (Leaflet) dar.

Generiert mit [Angular CLI](https://github.com/angular/angular-cli) 22.0.1.

## Seiten

| Route             | Inhalt                                            |
|-------------------|---------------------------------------------------|
| `/`               | Landing / Übersicht (Netzdaten Braunschweig)      |
| `/sparte-assets`  | Auswertung nach Sparte und Assets                 |
| `/gewerke`        | Auswertung nach Gewerken                          |
| `/kostenvergleich`| Plan-/Ist-Kostenvergleich                         |
| `/strassen`       | Straßendetails                                    |
| `/karte`          | Leaflet-Karte mit hervorgehobenen Straßen         |

Alle Feature-Routen werden lazy geladen (`app.routes.ts`).

## Backend-Anbindung

API-Aufrufe gehen an `/api` und werden im Dev-Server per
[`proxy.conf.json`](proxy.conf.json) an das Backend (`http://localhost:8000`)
weitergeleitet. Der Proxy ist in `angular.json` (Target `serve`) verdrahtet, ein
laufendes Backend ist also Voraussetzung für echte Daten. Im Docker-Build
übernimmt nginx ([`nginx.conf`](nginx.conf)) dieselbe `/api`-Weiterleitung an den
`backend`-Service.

## Development server

To start a local development server, run:

```bash
npm start          # entspricht: ng serve (inkl. API-Proxy)
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Building

To build the project run:

```bash
npm run build      # entspricht: ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Map street geometry

The map page highlights managed streets using **precomputed** street geometry,
shipped as the static asset `public/street-geometry.json`. This avoids any live
geocoding at runtime (which previously hit the public Overpass/Nominatim APIs
and tripped HTTP 429 errors).

The asset is generated from the Braunschweig street register (`../straßen.txt`)
by a one-time script. Regenerate it whenever the register changes:

```bash
npm run build:streets
```

The script issues a single Overpass query, merges the segments per street, keeps
only the streets in the register, and writes the asset. Override the Overpass
endpoint if the default mirrors are unavailable:

```bash
OVERPASS_ENDPOINT="https://maps.mail.ru/osm/tools/overpass/api/interpreter" npm run build:streets
```

The name-normalization rule in `scripts/build-street-geometry.mjs` must stay in
sync with `normalizeStreetName` in
`src/app/core/services/street-geometry-store.ts`.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
npm test           # entspricht: ng test
```

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
