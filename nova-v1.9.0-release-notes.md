# NOVA v1.9.0 — Live Updates (SSE)

Released: 2026-10-23  
Branch: master  
Tag: v1.9.0  

## Added

- **Notifikasi berita baru real-time via SSE** — menutup PRD Section 7 *Notification control*:
  - `GET /api/live/stream` — `text/event-stream`; frame `ready` saat konek, lalu `event: update` setiap selesai fetch RSS
  - `GET /api/live/status` — observability: jumlah klien SSE aktif + payload update terakhir
  - Broadcaster in-memory (`backend/services/liveUpdates.js`) — tanpa Redis, tanpa dependency baru
- **Badge `↑ N` di top header** — muncul hanya saat ada artikel baru, di antara badge LOCALHOST dan tombol tema; tooltip menyebut jumlah artikel baru + **nama sumber yang gagal** (fakta dari server, tidak bisa ditebak polling)
- **Judul tab `● (N) NOVA — …`** — satu-satunya indikator yang terlihat saat tab di belakang; kembali normal setelah di-acknowledge
- **Acknowledge-only** — klik badge menghapus hitungan lalu memuat ulang dashboard (feed, stats, sources, stories); feed **tidak pernah** berubah sendiri saat sedang dibaca
- **i18n 4 bahasa** — `header.newArticles`, `header.awayArticles`, `header.sourcesFailed`
- **`tests/live.test.js` + `npm run test:live`** — 12 unit broadcaster + 8 HTTP (401, login, handshake, status)

## Changed

- `backend/services/scheduler.js` — setiap siklus cron mengirim hasil `fetchAllSources()` apa adanya (`newArticles`, `okSources`, `failedSourceNames`, `events`, `source: 'scheduler'`)
- `backend/routes/sources.js` — refresh manual juga broadcast (`source: 'manual'`)
- `backend/server.js` — mount `/api/live` di belakang `requireAuth`; fetch awal server menyimpan `lastUpdate` (`source: 'startup'`)
- `frontend/src/App.jsx` — `LiveUpdatesProvider` di dalam `AuthProvider`
- `frontend/src/pages/Dashboard.jsx` — bereaksi pada `refreshToken` (skip saat mount) untuk reload setelah acknowledge
- `README.md` — bagian fitur + 2 baris API + roadmap

## Technical

- Versi **1.8.0 → 1.9.0** (root + frontend + backend + lock)
- Branch `feature/live-updates` di-merge ke `master` dengan `--no-ff` — 1 commit fitur `8435032`
- Stream: heartbeat komentar `: ping` tiap **25 detik** (timer `unref()`), `Cache-Control: no-cache, no-transform` agar `compression()` tidak membuffer frame, cleanup otomatis saat klien putus
- Frontend: satu `EventSource` per tab; reconnect backoff **1 s → 30 s**; berhenti reconnect saat `/api/auth/status` menyatakan sesi habis (401)
- Hitungan **in-memory per tab** — reload = mulai dari 0 (notifikasi, bukan inbox); tidak ada perubahan skema database
- Build: **506 modul** — main `index.js` 506,91 kB (gzip 154,49 kB) · CSS 73,88 kB · chunk globe tetap terpisah

## Tests

- **172/172 pass** regresi backend di `master`: `test:ai` 48/48 · `test:analytics` 67/67 · `test:location` 22/22 · `test:map` 15/15 · `test:live` 20/20
- Verifikasi Chrome headless (CDP) **17/17 PASS** — dashboard bersih, SSE terhubung (`clients: 1`), refresh manual, badge muncul, judul `● (N)`, tooltip sumber gagal, klik = badge hilang + judul normal + reload feed, nol error console
- Uji transport nyata: startup 387 artikel dari 20 sumber (4 gagal) → seed `lastUpdate`; refresh manual 5 artikel/4 gagal → frame `update` diterima klien SSE
- Semua uji memakai **salinan DB** (port 3011) + sumber RSS fixture deterministik; database produksi tidak tersentuh

## Known Issues / Backlog

- Hitungan baru tidak dipersist — reload halaman mengosongkan badge (sesuai desain)
- Belum ada toggle on/off notifikasi di Settings; belum ada notifikasi OS-level
- Sesi hanya diperiksa saat koneksi dibuka; stream yang sudah hidup tidak diputus saat sesi kedaluwarsa (localhost, single-user)
- `failedSourceNames` baru tampil di tooltip — panel **Source health** penuh masih backlog
- GitHub Release `v1.8.0` masih gagal 403 (token `gh` tanpa izin Releases); tag & push tetap sukses
