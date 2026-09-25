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
| `POST` | `/api/watchlist` | Tambah watchlist (`{ keyword }`) |
| `DELETE` | `/api/watchlist/:id` | Hapus watchlist |
| `GET` | `/api/events` | Daftar peristiwa + hitung per kategori; query `q`, `category`, `limit` (≤200), `offset` |
| `GET` | `/api/events/:id` | Detail peristiwa + daftar artikel terkait (flag `bookmarked`) |
| `POST` | `/api/events/scan` | Jalankan ulang deteksi peristiwa secara manual |
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
│   ├── services/        # rssFetcher, rssSources, scheduler, eventEngine, session
│   ├── utils/           # password (Argon2id)
│   └── server.js        # Entry point API
├── cli/                 # CLI `nova` (start/status/doctor)
├── frontend/            # Dashboard React (Vite)
│   └── src/
│       ├── components/  # Sidebar, NewsCard, GlobePanel, StatCard, dll
│       ├── i18n/        # Terjemahan id/en/ja/ko
│       ├── pages/       # Dashboard, AllNews, ArticleDetail, Events, Search,
│       │                #   Bookmarks, SavedSearches, Watchlist, Sources, Settings, …
│       └── services/    # api.js (klien API)
└── data/                # Database & cache lokal (diabaikan git)
```

## Roadmap

- [x] **Fase 1–2** Foundation & auth (CLI, server, SQLite, password lokal)
- [x] **Fase 3** News Engine (RSS, scheduler, manajemen sumber)
- [x] **Fase 4** Dashboard UI
- [x] **Fase 5** Settings & Utilities (i18n, import/export, about, CLI)
- [ ] **Fase 6** Intelligence (saved searches ✅, watchlist ✅, events ✅ — menunggu: AI summary, topik, peta interaktif, analitik, timeline)
- [ ] **Fase 7** AI Layer (ringkasan berita, analisis tren)

## Lisensi

[MIT](LICENSE)