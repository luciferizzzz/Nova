# NOVA v1.7.0 — Phase 9 Milestone C: 3D Globe

Released: 2026-10-21  
Branch: master  
Tag: v1.7.0  

## Added

- **3D Globe (Milestone C)** — halaman **`/globe`** dengan library **globe.gl** (dipilih hasil spike 21 Okt; CesiumJS ditunda karena bundle, MapLibre belum dicoba)
  - Marker per event berkoordinat dari `GET /api/events?limit=200` — `pointAltitude(0.01)`, `pointRadius(0.4)`, `pointColor` per kategori dari token `--cat-*`, `pointLabel` saat hover
  - **Legend + filter kategori** — tombol per kategori dengan hitungan, toggle tampil/sembunyi (filter klien, tanpa refetch)
  - **Panel UNMAPPED EVENTS** — daftar event tanpa koordinat (maks 30), klik → modal set location
  - **Modal SET LOCATION** — form latitude / longitude / location name → `PUT /api/events/:id/location` (endpoint Milestone A)
  - **Toolbar** — `RESET VIEW`, `FIT TO MAPPED` (fokus centroid event terpetak), `ENRICH` (`POST /api/events/enrich`), link ke `/map` + `/events`; overlay "N / M events with coordinates"
  - **Entri nav sidebar** "3D Globe" (setelah `/map`) + `GlobePanel` di dashboard jadi link
  - `React.lazy` + `Suspense` → chunk `Globe3D-*.js` **terpisah dari main chunk**; i18n `globe3d.*` (12 key **flat**) + `nav.globe3d` di en/id/ja/ko
- **CSS `.globe3d-*`** — ~17 class mengikuti pola `.map-layout` (grid `330px + minmax(0,1fr)`, canvas `62vh`, sidebar, legend/dot, panel UNMAPPED, overlay) + `.modal*`/`.form-row` — **design system kini punya komponen modal** (sebelumnya nol); rule responsive `≤1200px`

## Fixed

- **4 defect Milestone C** — ditemukan saat inspeksi kode 21 Okt (3 sesi build hijau menyembunyikannya karena halaman belum pernah dirender di browser), **ditutup di Sesi 4** (`f9a9c88`) dan diverifikasi di browser sungguhan:
  - `onPointClick` menangkap **stale closure** → klik marker tak berefek; kini baca `eventsRef`, efek deps `[]` + cleanup `globe._destructor()` (wajib untuk `React.StrictMode`) — **terverifikasi**: klik marker → modal event nyata terbuka + fly-to
  - **Key i18n `globe3d.*` hilang** → tombol tampil teks mentah; ternyata `ja`/`ko` nol key (bukan cuma 7) dan blok `globe`/`globe3d` **bersarang** adalah kode mati (`t()` lookup datar) — kini 12 key flat ×4 bahasa, **0 key mentah** terukur
  - **CSS `.globe3d-*` nol definisi** → halaman tak ter-layout — kini grid terverifikasi `330px + 858px`, canvas `y=174` di atas fold
  - **Warna kategori hardcoded `CAT_COLORS`** → kini token `--cat-*` via `categoryClass()` + `useMemo` + MutationObserver tema; **A/B legend**: piksel marker `world` 331 → 0 saat dimatikan (bukti itu marker, bukan lampu kota tekstur); warna lama `#7aa2f7` 0 piksel

## Technical

- Dependency baru: `globe.gl ^2.45.0` (frontend; three.js transitif) — hanya dimuat di chunk `/globe`
- `Globe3D.jsx`: `eventsRef` + `themeTick` (MutationObserver `data-theme`/`data-accent` — token `--cat-*` berbeda antara dark/light); heading diseragamkan `<h2>` + `.page-hint`; class tombol ke design system nyata (`apply-btn`/`reset-btn`/`btn-link`/`btn-primary`/`btn-secondary` — class `.btn` lama tak pernah ada di CSS)
- Versi **1.6.0 → 1.7.0** (root + frontend + backend + lock)
- Branch `feature/geo-mapping-3d` di-merge ke `master` dengan `--no-ff` (`3c6d3a6`) — 4 commit: `22dbb07` (Sesi 1 spike) · `9dd6871` (Sesi 2 legend/filter/fly-to/UNMAPPED) · `304a1c7` (Sesi 3 fit/reset) · `f9a9c88` (Sesi 4 nav/CSS/i18n/fix defect)
- Nol endpoint backend baru — reuse `GET /api/events` + endpoint Milestone A

## Tests

- `npm run test:ai` — **48/48 pass** (regresi)
- `npm run test:analytics` — **67/67 pass** (regresi)
- `npm run test:location` — **22/22 pass** (regresi)
- `npm run test:map` — **15/15 pass** (regresi)
- Total **152/152 pass** di `master` pasca-merge
- Frontend build: **504 modul** sukses — main `index.js` 504.07 kB (gzip 153.41 kB) · chunk `Globe3D-*.js` **1.941,17 kB** (gzip 550.90 kB) · CSS 72.28 kB
- Verifikasi Chrome headless CDP `/globe` — **19/19 PASS** (layout grid, i18n bersih, klik marker → modal nyata, legend A/B piksel, toolbar, tanpa overflow) + test marker khusus **6/6 PASS**

## Known Issues / Backlog

- Belum ada suite otomatis `tests/globe.test.js` — verifikasi globe masih manual via CDP
- "Pick on globe" (klik kosong → koordinat) & toggle "show unmapped only" masih no-op
- Clustering marker globe belum ada; marker berukuran kecil di zoom default (target klik sempit)
