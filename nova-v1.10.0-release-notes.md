# NOVA v1.6.0 — Phase 9: Geo Mapping

Released: 2026-10-19  
Branch: master  
Tag: v1.6.0  

## Added

- **Location Enricher (Milestone A)** — koordinat event diisi otomatis dari **gazetteer offline** (±122 tempat: 27 negara + 52 kota Indonesia + 43 kota internasional) saat scan, dengan **input manual** sebagai fallback (Hybrid A+B, nol geocoding online); `locationEnricher.js` (`matchLocation` + alias, hanya mengisi `latitude IS NULL`), hook di `eventEngine.detectEvents` (startup + scheduler + `/scan`), kolom aditif `location_name`/`location_source`, endpoint `POST /api/events/enrich` + `PUT`/`DELETE /api/events/:id/location`, baris LOCATION + tombol "ATUR LOKASI" di `/events`, i18n id/en/ja/ko
- **Map View (Milestone B)** — halaman `/map` (dari placeholder) peta 2D **Leaflet** dengan pin event: `L.circleMarker` warna `--cat-*` dikumpulkan **cluster**, popup judul + badge kategori + tombol ATUR LOKASI (delegasi `popupopen`), **legend tombol toggle** berhitungan, panel UNMAPPED EVENTS dengan **pick-on-map**, toolbar **Enrich Unmapped / Fit to mapped / Reset view**, page hint `NN / 200 mapped`; i18n `map.*` 14 key (id/en/ja/ko)
- **Tile dasar ESRI ArcGIS Canvas** — `World_Dark_Gray_Base` / `World_Light_Gray_Base` mengikuti tema + layer label transparan; gratis, tanpa API key, tanpa filter CSS
- **Test suite geo** — `tests/location.test.js` / `npm run test:location` (**22 assertion**) dan `tests/map.test.js` / `npm run test:map` (**15 assertion**)

## Fixed

- **Peta menampilkan "ACCESS BLOCKED"** — `tile.openstreetmap.org` menolak pemakaian oleh app pihak ketiga (Tile Usage Policy: PNG statis 6933 byte + header `x-blocked: Access denied`); CARTO CDN diuji sebagai pengganti tapi hanya mengembalikan placeholder statis (MD5 identik lintas koordinat) → tile dialihkan ke **ESRI Canvas** (diverifikasi dari dalam Chrome)
- **Versi di halaman About** — sebelumnya hardcode `0.1.0` sejak awal proyek; kini dibaca dari `package.json` via define `__APP_VERSION__` (`vite.config.js`) sehingga otomatis ikut bump

## Technical

- Versi **1.5.0 → 1.6.0** (root + frontend); `backend/package.json` yang tertinggal di `0.1.0` ikut disamakan + lock
- Dependency baru: `leaflet`, `leaflet.markercluster` (frontend)
- Skema aditif murni (`ADDED_COLUMNS`) — tanpa DROP, database lama tetap jalan
- Endpoint & data lama tidak berubah (backward compatible)
- Branch `feature/geo-mapping` di-merge ke `master` dengan `--no-ff` (`526d44e`)
- `.gitignore` menampung file sisa baca note (`NOVA_CONTEXT.md`, `nova-filelist.txt`, `nova-notes-full.txt`)

## Tests

- `npm run test:location` → **22/22 pass**
- `npm run test:map` → **15/15 pass**
- `npm run test:ai` → **48/48 pass** (regresi)
- `npm run test:analytics` → **67/67 pass** (regresi)
- Total **152/152 pass**
- Frontend build: **83 modul** sukses (JS 500 kB / gzip 152 kB)
- E2E Chrome headless `/map` → **15/15 pass**, 0 error console
