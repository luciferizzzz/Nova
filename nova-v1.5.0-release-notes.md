# NOVA v1.5.0 — Phase 8: Analytics & Insights

Released: 2026-10-17  
Branch: master  
Tag: v1.5.0  

## Added

- **"Also reported by" (Fitur A)** — corroboration lintas sumber di halaman detail artikel; endpoint `GET /api/berita/:slug/corroboration`, panel "ALSO REPORTED BY", i18n id/en/ja/ko
- **Trending velocity (Fitur B)** — tab Trending kini berbasis laju artikel/jam per event; endpoint `GET /api/trending`, panel `TrendingPanel`, i18n id/en/ja/ko
- **Categories page (Fitur C)** — agregasi per kategori di `/categories`; endpoint `GET /api/categories`, `categoryEngine`, halaman `/categories`, i18n id/en/ja/ko
- **Analytics dashboard (Fitur D)** — ringkasan read-only di `/analytics`; endpoint `GET /api/analytics/summary`, `analyticsEngine`, halaman `/analytics`, i18n id/en/ja/ko; smoke test Phase 8 (+21 → total 67)

## Fixed

- `frontend/src/utils/format.js` — `lastHoursISO()` menerima string chip filter (`'1h'/'6h'/'24h'`), mencegah crash Dashboard/AllNews

## Technical

- Nol tabel/kolom/dependency baru; reuse `categoryEngine`, guard tanpa login
- Branch `feature/analytics-insights` di-merge ke `master` dengan `--no-ff`
- Optimasi storage: hapus index redundan `idx_berita_slug`, VACUUM & WAL checkpoint → `nova.db` 12.73 MB → 11.27 MB (-~1.46 MB)

## Tests

- `npm run test:analytics` → **67/67 pass**
- `npm run test:ai` → **48/48 pass** (regresi)
- Frontend build: **72 modul** sukses
