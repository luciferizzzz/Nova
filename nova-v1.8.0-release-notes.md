# NOVA v1.8.0 — Globe 3D Nyata di Panel Dashboard

Released: 2026-10-22  
Branch: master  
Tag: v1.8.0  

## Added

- **Globe 3D di panel dashboard** — panel `GLOBE` di dashboard bukan lagi link statis ke `/globe`, sekarang me-render **globe.gl sungguhan** (bumi `earth-night.jpg` + bump `earth-topology.png`, atmosfer `#3a7bd5`)
  - **Interaktif penuh** — drag untuk memutar, scroll untuk zoom; sebelumnya panel hanya `<Link>`
  - **Auto-rotate lambat** (`autoRotateSpeed 0.35`, ~171 detik/orbit) supaya panel terasa hidup tanpa mengganggu
  - **Kamera auto-fit** ke centroid event terpetak saat mount (`fitOnLoad`, `fitAltitude 2.0`) — event NOVA mayoritas di Indonesia, jadi globe tidak lagi mulai dari lat 0/lng 0
  - **Marker diperbesar** (`pointRadius 1.1`, ~4× luas marker `/globe`) supaya terlihat & bisa diklik di kanvas 964×318
  - **Klik marker → `/globe`** — panel jadi pintu masuk ke halaman globe penuh
  - **Overlay** — judul `GLOBE`, legend titik per kategori, hitungan "N / M events with coordinates", tombol **Open full globe**, dan baris error bila fetch gagal; overlay `pointer-events: none` sehingga drag/zoom tetap tembus
- **`frontend/src/hooks/useGlobe.js`** (baru) — logika globe.gl diekstrak dari `Globe3D.jsx` agar dipakai bersama oleh `/globe` dan panel dashboard:
  - init globe + `resize` listener + cleanup `_destructor()` (wajib untuk `React.StrictMode`)
  - warna kategori dari token `--cat-*` via `getComputedStyle` + `MutationObserver` (`data-theme` / `data-accent`) — ikut berubah saat tema/aksen diganti
  - pause `requestAnimationFrame` saat tab tidak terlihat (`visibilitychange`)
  - opsi: `onPointClick`, `flyToOnClick`, `autoRotate`, `autoRotateSpeed`, `pointRadius`, `fitOnLoad`, `fitAltitude`
- **Lazy-load `GlobePanel`** — `React.lazy` + `Suspense` di `Dashboard.jsx` dengan fallback memakai `.globe-placeholder`; chunk globe **1,94 MB tidak masuk bundle utama** (main `index.js` tetap 504 kB)

## Changed

- `Globe3D.jsx` — ditulis ulang memakai hook bersama; perilaku halaman `/globe` **tidak berubah** (fly-to saat klik marker, filter legend, UNMAPPED, toolbar, modal Set Location)
- `index.css` — tambah `.globe-mini-canvas`, `.globe-mini-overlay`, `.globe-mini-top/bottom`, `.globe-mini-title`, `.globe-mini-open`, `.globe-mini-legend-item`, `.globe-mini-count`, `.globe-mini-error`; `.globe-panel` dapat `position: relative` + `overflow: hidden`
- **Nol endpoint backend baru** — tetap `GET /api/events?limit=200`
- **Nol key i18n baru** — reuse `globe.title`, `globe.open`, `globe3d.mappedCount`

## Fixed

- **3 defect yang hanya muncul saat dirender** (build hijau tidak menangkapnya; ditemukan lewat verifikasi browser CDP):
  - marker panel nyaris tak terlihat — `pointRadius 0.35` ≈ **1 px** di kanvas 318 px tinggi (`radius_px ≈ R × tan(pointRadius)`); dinaikkan ke `1.1` → terukur **153–161 piksel marker** di crop tengah
  - kamera mulai di lat 0/lng 0 sementara marker menggerombol di Indonesia → globe tampak kosong; diperbaiki dengan `fitOnLoad` berbasis centroid
  - dugaan "klik marker gagal" ternyata artefak tes: `globe.gl` punya `clickAfterDrag: false`, sehingga **setiap `pointermove` saat tombol ditekan membatalkan klik**; di `/globe` marker hanya 1–2 px sehingga meleset 1 px sudah gagal — tes diperbaiki dengan grid pencarian ±4 px + jeda settle

## Technical

- Versi **1.7.0 → 1.8.0** (root + frontend + backend + lock)
- Branch `feature/dashboard-globe-mini` di-merge ke `master` dengan `--no-ff` (`7208d5c`) — 1 commit fitur `b0c3d08`
- Chunk hasil build: main `index.js` **504,24 kB** (gzip 153,60 kB) · `useGlobe-*.js` **1.937,89 kB** (gzip 550,08 kB) · `Globe3D-*.js` 4,77 kB · `GlobePanel-*.js` 1,24 kB · CSS 73,27 kB — **505 modul**
- Tidak ada dependency baru (globe.gl sudah ada sejak v1.7.0)

## Tests

- **152/152 pass** regresi backend di `master`: `test:ai` 48/48 · `test:analytics` 67/67 · `test:location` 22/22 · `test:map` 15/15
- Verifikasi Chrome headless (CDP) globe: **16/16 PASS** — panel dashboard me-render kanvas, marker terlihat, klik marker → `/globe`, halaman `/globe` tetap normal
- Siklus navigasi dashboard → `/globe` → dashboard: **9/9 PASS** — selalu tepat **1 kanvas**, nol warning WebGL (bukti `_destructor()` bekerja)
- Uji rotasi 8 frame: marker bergeser → auto-rotate aktif
- Responsive 1600 / 1200 / 1100 / 900 px: tanpa overflow; switch tema gelap→terang: tanpa error, warna marker ikut berubah
- Build produksi: **505 modul**, 17,89 s

## Known Issues / Backlog

- Belum ada suite otomatis `tests/globe.test.js` — verifikasi globe masih manual via CDP
- Marker `/globe` masih kecil di zoom default (`pointRadius 0.4`, ~1–2 px) — target klik sempit; panel dashboard sudah memakai `1.1`
- Clustering marker globe belum ada
- "Pick on globe" (klik area kosong → koordinat) & toggle "show unmapped only" masih no-op
