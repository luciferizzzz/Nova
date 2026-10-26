# NOVA v1.10.0 — Source Health Panel

Released: 2026-10-26  
Branch: master  
Tag: v1.10.0  

## Added

- **Source Health Panel di `/sources`** — status kesehatan tiap sumber RSS sekarang terlihat langsung di tabel, bukan hanya lewat log server:
  - Kolom **LAST CHECKED** — kapan sumber terakhir dicek (fallback ke `last_fetch` untuk data lama)
  - Kolom **HEALTH** — badge `OK` atau `ERR xN`; `N` = jumlah gagal berturut-turut
  - Badge `ERR` bisa diklik → baris detail berisi **Last Error** (pesan asli dari `rss-parser`) + **Consecutive failures**
  - **Filter bar berhitungan**: All / Healthy (enabled + active) / Failing (enabled + error) / Disabled
- **Tracking health di backend** — tiga kolom aditif di tabel `sources`:
  - `last_error TEXT` — pesan error terakhir
  - `consecutive_failures INTEGER DEFAULT 0` — counter gagal berturut-turut
  - `last_checked_at DATETIME` — waktu pengecekan terakhir
- **`markSourceStatus(db, id, status, error)`** — saat `error`: simpan `last_error`, naikkan counter, isi `last_checked_at`; saat `active`: reset `last_error = NULL` dan counter ke `0`

## Changed

- `backend/database/schema.js` — `ADDED_COLUMNS.sources` berisi tiga kolom baru; migrasi aditif, tanpa `DROP`, DB lama tetap jalan
- `backend/services/rssFetcher.js` — `markSourceStatus()` menerima parameter `error`; pemanggil di `fetchSingleSource()` mengirim `err.message`
- `frontend/src/pages/Sources.jsx` — state `filter` + `expanded`, filter bar, kolom health, baris detail error
- `frontend/src/index.css` — `.source-filter`, `.filter-group`, `.filter-btn`, `.health-badge`, `.error-row`, `.error-detail`, `.error-count`
- `package.json` + `frontend/package.json` — versi **1.9.0 → 1.10.0**
- `frontend/dist` — build ulang ikut di-commit

## Fixed

- **Penyebab error sumber tidak lagi hilang** — sebelumnya hanya status `error` yang disimpan, pesan aslinya cuma muncul di log; sekarang permanen di `last_error` dan bisa dibaca dari UI
- **Tidak ada indikator gagal berulang** — `consecutive_failures` membedakan timeout sesekali dari sumber yang memang mati
- **Tidak perlu buka log server untuk cek kesehatan feed** — panel `/sources` sudah cukup

## Technical

- Skema aditif murni (`ADDED_COLUMNS`) — kolom lama tidak berubah, endpoint & data lama tetap kompatibel
- `GET /api/sources` otomatis ikut mengembalikan tiga kolom baru (`SELECT s.*`), tanpa perubahan route
- Commit: `5ce00e0` (fix URL feed, 25 Okt) → `ccca471` (panel) → `ec878fc` (filter + detail error) → merge `709d18c` (`--no-ff`) → bump `a5cf50d` → build dist + root bump `f9acb39` → release notes `e9ce8b3`
- Bundle `frontend/dist` memuat `.source-filter`, `.health-badge`, `.error-detail` (terverifikasi di CSS hasil build)
- **Catatan tag:** `v1.10.0` (annotated, "Source Health Panel") menunjuk `a5cf50d`, yaitu commit bump frontend — **belum** memuat `f9acb39` (root `package.json` + dist) dan `e9ce8b3` (release notes). Lihat Known Issues.

## Tests

- **172/172 pass** regresi di salinan DB (`%TEMP%\nova-v110-test`, port 3011): `test:ai` 48/48 · `test:analytics` 67/67 · `test:location` 22/22 · `test:map` 15/15 · `test:live` 20/20
- **Belum ada suite khusus source health** — `package.json` tidak berubah; verifikasi panel lewat kontrak API + data nyata
- **Kontrak API**: `GET /api/sources` mengembalikan `last_error`, `consecutive_failures`, `last_checked_at` untuk 24 sumber
- **Data nyata**: DB produksi mencatat 23 `active` + 1 `error` (Hacker News, `Request timed out after 15000ms`, `consecutive_failures = 1`, `last_checked_at 2026-10-26 04:30:22`); setelah fetch startup di salinan DB, 24/24 `active`
- Semua uji memakai **salinan DB**; `data/nova.db` produksi tidak tersentuh

## Known Issues / Backlog

- `backend/package.json` masih `1.9.0` (root & frontend sudah `1.10.0`)
- Tag `v1.10.0` tidak memuat build dist dan root bump — perlu keputusan retag atau biarkan sebagai anomali
- Label filter (`All/Healthy/Failing/Disabled`) masih hardcoded English; belum masuk i18n id/en/ja/ko
- Belum ada tombol **retry per sumber** — refresh masih global
- Belum ada notifikasi/riwayat perubahan status (mis. sumber pulih setelah N gagal)
- `README.md` belum mencatat v1.10.0
- `Documentation/Source Health.md` di vault masih menandai panel & `last_error` sebagai TODO
- GitHub Release v1.10.0 manual — `gh` masih 403 (token tanpa izin Releases), tag & push tetap sukses
