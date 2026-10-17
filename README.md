# NOVA — Local News Intelligence System

Sistem agregasi berita **local-first** yang berjalan di laptop/PC Anda. NOVA mengambil berita dari sumber RSS, menyimpannya dalam SQLite lokal, dan menampilkan dashboard web yang dapat diakses hanya lewat `http://localhost:3000`.

> **100% offline & pribadi.** Tidak ada akun, tidak ada server cloud, tidak ada data yang keluar dari perangkat Anda.

## Fitur

### Foundation (Fase 1–2)
- Backend Node.js + Express + SQLite (`node:sqlite`, tanpa dependensi eksternal)
- Autentikasi lokal (Argon2id, hashed, session cookie `httpOnly`)
- CLI `nova`

### News Engine (Fase 3)
- Agregasi RSS multi-sumber (Detik, Kompas, CNN Indonesia, Tempo, Reuters, CNN, BBC, The Guardian, Bloomberg, CNBC, TechCrunch, Ars Technica, Hacker News, NHK, Korea Herald, dan sumber kustom)
- Scheduler refresh otomatis (default tiap 30 menit)
- API berita, sumber, bookmark, dan pengaturan
- Manajemen sumber (tambah/hapus/aktifkan, RSS URL kustom)

### Frontend (Fase 4)
- Dashboard UI: statistik, berita terbaru, sorotan
- Daftar berita, detail artikel, bookmark, kategori, pencarian, dan filter (negara/kategori/bahasa/sumber/rentang tanggal)
- Mode terang/gelap, layout responsif

### Settings & Utilities (Fase 5)
- Pengaturan lengkap: bahasa, negara, tema, interval RSS, ganti password
- **Multi-language**: Indonesia (Bahasa Indonesia), English, 日本語, 한국어
- **Import/Export data** (JSON & CSV)
- Halaman **Tentang**
- CLI `nova` dengan subperintah `start` / `status` / `doctor`

### Intelligence (Fase 6)
- **Saved Searches (Pencarian Tersimpan)**: simpan query pencarian berita yang dipakai berulang
- **Watchlist (Pantauan)**: pantau topik/quotes tertentu untuk diberi sorotan di dashboard
- **Events (Peristiwa)**: deteksi dan pengelompokan otomatis artikel terkait menjadi peristiwa, dengan halaman filter + penelusuran terkait (engine clustering berbasis token & Jaccard similarity, window 14 hari)
- **Timeline (Linimasa)**: alur peristiwa per hari, komposisi kategori, top sumber, headline, histogram 24 jam

### AI Layer (Fase 7)
- **AI Summarization**: ringkasan per peristiwa & digest harian (Daily TL;DR) — default **ekstraktif lokal** (tanpa dependensi), provider Ollama opsional via Settings
- **Watchlist Intelligence**: panel intelijen per pantauan — tren 24 jam, sparkline 7 hari, sumber utama, headline terbaru, dan digest AI
- **Topic Analysis**: ekstraksi topik dari judul artikel (frekuensi × keragaman sumber × tren) di halaman `/topics` dengan sparkline, top sources, dan digest AI

### Appearance — Color Themes (v1.4.0)
- **10 tema accent** (Blue, Pink, Red, Purple, Sage, Amber, Teal, Slate, Terracotta, Midnight) × mode terang/gelap = **20 skin**, semua lolos kontras WCAG AA
- Dipasang sebagai **lapisan opsional** (`data-accent`) di atas mode terang/gelap yang sudah ada — tanpa memilih accent, tampilan default tetap identitas NOVA (near-black + crimson)
- Pemilih **Accent** di Settings + warna kategori/status yang konsisten lintas tema

### Analytics & Insights (Fase 8) — berjalan
- **"Also reported by"**: di halaman detail artikel, tampilkan sumber lain yang melaporkan peristiwa yang sama (corroboration lintas sumber), memakai klaster event yang sudah ada
- **Trending velocity**: tab Trending kini diurutkan menurut laju artikel per jam per event (velocity) — menggantikan feed 24 jam biasa; panel menampilkan peringkat event + kecepatan liputan + headline terbaru
- **Categories**: halaman `/categories` mengagregasi berita per kategori — jumlah artikel + porsi, keragaman sumber & negara, tren 7 hari, sparkline harian, sumber teratas, dan headline terbaru (read-only, memakai `berita` yang sudah ada)
- **Analytics dashboard**: halaman `/analytics` merangkum ketiga insight di atas dalam satu tampilan read-only — cakupan corroboration lintas sumber (dengan bar + event paling terverifikasi), event velocity teratas, dan distribusi artikel per kategori; semuanya memakai data yang sudah ada

## Persyaratan

- **Node.js** ≥ 22.5 (menggunakan modul eksperimental `node:sqlite`)
- Browser modern (Chrome / Edge / Firefox)

## Instalasi

```bash
# 1. Clone atau salin folder proyek
git clone https://github.com/luciferizzzz/Nova.git
cd Nova

# 2. Install dependensi backend & frontend
npm install
npm install --prefix frontend

# 3. Jalankan NOVA
npm run dev        # atau: node cli/nova.js
```

Server akan menyala di **`http://localhost:3000`** dan membuka browser secara otomatis.

### Password default

| | |
|---|---|
| Password | `123456` |

Ganti segera dari halaman **Settings → Security**. Password disimpan sebagai hash Argon2id.

## Command

```bash
nova               # start server + buka browser otomatis
nova start         # start server (tanpa buka browser)
nova status        # status server (RUNNING / STOPPED)
nova doctor        # periksa kesehatan: config, dependensi, data, database
```

Jika perintah `nova` belum tersedia di PATH:

```bash
npm link          # di root proyek, lalu gunakan perintah `nova`
```

## Konfigurasi

Salin `.env.example` menjadi `.env` (opsional):

```env
PORT=3000
HOST=localhost
DATABASE_PATH=./data/nova.db
DATA_DIR=./data
RSS_REFRESH_INTERVAL=30
```

## API

Semua endpoint di bawah `/api` memerlukan cookie sesi (login via `POST /api/auth/login`), kecuali `/api/health` dan `/api/auth/status`.

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/health` | Status server |
| `GET` | `/api/status` | Status lengkap (server, database, RSS, scheduler) |
| `GET` | `/api/auth/status` | Status autentikasi |
| `POST` | `/api/auth/login` | Login (`{ password }`) |
| `POST` | `/api/auth/logout` | Logout |
| `POST` | `/api/auth/change-password` | Ganti password (`{ current_password, new_password }`) |
| `GET` | `/api/berita/stats` | Statistik: total artikel, hari ini, sumber, events, negara, ukuran DB |
| `GET` | `/api/berita` | Daftar berita + bookmark; query `negara`, `kategori`, `bahasa`, `sumber`, `q`, `from`, `to`, `limit`, `offset` |
| `GET` | `/api/berita/search` | TLDR search; query `q`, `limit` |
| `GET` | `/api/berita/:slug` | Detail artikel |
| `GET` | `/api/berita/:slug/corroboration` | "Also reported by" — sumber lain yang melaporkan peristiwa sama (corroboration) |
| `GET` | `/api/sources` | Daftar sumber |
| `POST` | `/api/sources` | Tambah sumber |
| `POST` | `/api/sources/refresh` | Force refresh seluruh sumber |
| `PUT` | `/api/sources/:id` | Ubah sumber |
| `DELETE` | `/api/sources/:id` | Hapus sumber |
| `GET` | `/api/setting` | Ambil pengaturan |
| `PUT` | `/api/setting` | Simpan pengaturan |
| `GET` | `/api/bookmarks` | Daftar bookmark |
| `POST` | `/api/bookmarks` | Toggle bookmark artikel |
| `DELETE` | `/api/bookmarks/:id` | Hapus bookmark |
| `GET` | `/api/saved-searches` | Daftar pencarian tersimpan |
| `POST` | `/api/saved-searches` | Simpan pencarian (`{ q, label? }`) |
| `DELETE` | `/api/saved-searches/:id` | Hapus pencarian tersimpan |
| `GET` | `/api/watchlist` | Daftar watchlist |
| `POST` | `/api/watchlist` | Tambah watchlist (`{ name, type, value }`) |
| `DELETE` | `/api/watchlist/:id` | Hapus watchlist |
| `GET` | `/api/watchlist/:id/insights` | Intelijen pantauan: tren 24 jam, sparkline, sumber, headline; query `days` |
| `GET` | `/api/events` | Daftar peristiwa + hitung per kategori; query `q`, `category`, `limit` (≤200), `offset` |
| `GET` | `/api/events/:id` | Detail peristiwa + daftar artikel terkait (flag `bookmarked`) |
| `POST` | `/api/events/scan` | Jalankan ulang deteksi peristiwa secara manual |
| `GET` | `/api/timeline` | Agregasi berita per hari; query `days` (≤120), `from`, `to`, `kategori`, `negara`, `sumber` |
| `GET` | `/api/trending` | Peringkat event menurut velocity (artikel/jam); query `hours` (≤720), `limit` (≤50), `negara`, `kategori`, `sumber`, `bahasa` |
| `GET` | `/api/categories` | Agregasi per kategori: jumlah artikel, sumber, negara, tren, sparkline harian, sumber teratas, headline terbaru; query `days` (≤365), `limit` (≤50) |
| `GET` | `/api/analytics/summary` | Ringkasan Analytics Dashboard (Fase 8 D): total, cakupan corroboration + event paling terverifikasi, event velocity teratas, distribusi kategori; query `hours` (≤720), `days` (≤365), `limit` (≤25) |
| `POST` | `/api/ai/events/:id/summarize` | Ringkasan AI per peristiwa (di-cache di DB) |
| `POST` | `/api/ai/timeline/daily-summary` | Digest harian berita (Daily TL;DR) |
| `GET` | `/api/ai/topics` | Daftar topik hasil ekstraksi; query `days`, `limit` |
| `POST` | `/api/ai/topics/summarize` | Digest AI untuk satu topik (`{ term }`) |
| `POST` | `/api/ai/watchlist/:id/summarize` | Digest AI pantauan (di-cache di DB) |
| `GET` | `/api/export` | Ekspor seluruh data (JSON/CSV) |
| `POST` | `/api/import` | Impor data |

## Struktur

```
Nova/
├── backend/
│   ├── config/          # Konfigurasi + .env loader
│   ├── database/        # Koneksi SQLite + schema (db.js, schema.js)
│   ├── middleware/      # requireAuth, dll
│   ├── routes/          # Express routers (auth, berita, sources, events, …)
│   ├── services/        # rssFetcher, rssSources, scheduler, eventEngine, aiSummarizer, watchlistInsights, topicEngine, categoryEngine, session
│   ├── utils/           # password (Argon2id)
│   └── server.js        # Entry point API
├── cli/                 # CLI `nova` (start/status/doctor)
├── frontend/            # Dashboard React (Vite)
│   └── src/
│       ├── components/  # Sidebar, NewsCard, GlobePanel, StatCard, dll
│       ├── i18n/        # Terjemahan id/en/ja/ko
│       ├── pages/       # Dashboard, AllNews, ArticleDetail, Events, Timeline, Topics, Search,
│       │                #   Bookmarks, SavedSearches, Watchlist, Sources, Settings, …
│       └── services/    # api.js (klien API)
└── data/                # Database & cache lokal (diabaikan git)
```

## Roadmap

- [x] **Fase 1–2** Foundation & auth (CLI, server, SQLite, password lokal)
- [x] **Fase 3** News Engine (RSS, scheduler, manajemen sumber)
- [x] **Fase 4** Dashboard UI
- [x] **Fase 5** Settings & Utilities (i18n, import/export, about, CLI)
- [x] **Fase 6** Intelligence core (saved searches, watchlist, events, timeline) — rilis v1.2.0
- [x] **Fase 7** AI Layer (AI summarization, watchlist intelligence, topic analysis) — rilis v1.3.0
- [x] **Appearance** Color Themes (10 accent × light/dark) — rilis v1.4.0
- [ ] **Fase 8** Analytics & Insights (dashboard, categories, also-reported-by, trending velocity) — 🚧 berjalan di branch `feature/analytics-insights`; **"Also reported by" ✅ · Trending velocity ✅ · Categories ✅ · Analytics dashboard ✅** (menunggu konfirmasi merge)
- [ ] **Fase 9** Geo Mapping (3D globe, event markers, full map) — ⛔ blocked: butuh sumber koordinat

## Lisensi

[MIT](LICENSE)