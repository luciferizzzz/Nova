# NOVA — Local News Intelligence System

Sistem agregasi berita **local-first** yang berjalan di laptop/PC Anda. NOVA mengambil berita dari sumber RSS, menyimpannya dalam SQLite lokal, dan menampilkan dashboard web yang dapat diakses hanya lewat `http://localhost:3000`.

> **100% offline & pribadi.** Tidak ada akun, tidak ada server cloud, tidak ada data yang keluar dari perangkat Anda.

## Fitur

### Foundation (Fase 1–2)
- Backend Node.js + Express + SQLite (`node:sqlite`, tanpa dependensi eksternal)
- Autentikasi lokal (Argon2id, hashed)
- CLI `nova`

### News Engine (Fase 3)
- Agregasi RSS multi-sumber (Detik, Kompas, CNN Indonesia, Tempo, Reuters, dan sumber kustom)
- Scheduler refresh otomatis (default tiap 30 menit)
- API berita, sumber, bookmark, dan pengaturan
- Manajemen sumber (tambah/hapus/aktifkan, RSS URL kustom)

### Frontend (Fase 4)
- Dashboard UI: statistik, berita terbaru, sorotan, peta global
- Daftar berita, detail artikel, bookmark, kategori, pencarian TLDR, dan filter
- Mode terang/gelap, layout responsif

### Settings & Utilities (Fase 5)
- Pengaturan lengkap: bahasa, negara, tema, interval RSS, ganti password
- **Multi-language**: Indonesia, English, 日本語, 한국어 (fondasi i18n)
- **Import/Export data** (JSON & CSV)
- Halaman **Tentang**
- CLI `nova` dengan subperintah `start` / `status` / `doctor`

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
RSS_REFRESH_INTERVAL=30
```

## Struktur

```
Nova/
├── backend/        # API Express, database SQLite, RSS scheduler
├── cli/            # CLI `nova` (start/status/doctor)
├── frontend/       # Dashboard React (Vite)
│   └── src/
│       ├── i18n/   # Terjemahan id/en/ja/ko
│       ├── pages/  # Settings, About, Export, Import, dll
│       └── components/
└── data/           # Database lokal (diabaikan git)
```

## Roadmap

- [x] **Fase 1–2** Foundation & auth (CLI, server, SQLite, password lokal)
- [x] **Fase 3** News Engine (RSS, scheduler, manajemen sumber)
- [x] **Fase 4** Dashboard UI
- [x] **Fase 5** Settings & Utilities (i18n, import/export, about, CLI)
- [ ] **Fase 6** Intelligence (AI Summary, topik, watchlist)
- [ ] **Fase 7** AI Layer

## Lisensi

[MIT](LICENSE)