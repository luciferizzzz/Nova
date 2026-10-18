#!/usr/bin/env node
// Smoke test Phase 9 Sesi 2 — Map View (Geo Mapping Milestone B).
// Milestone B murni frontend (Leaflet 2D) tanpa endpoint baru, jadi yang diuji di sini
// adalah KONTRAK DATA yang dikonsumsi MapView.jsx:
// - GET /api/events mengembalikan kolom latitude/longitude/location_name/location_source
// - minimal ada event terpetak (marker) + koordinat dalam rentang valid
// - filter kategori & limit (dipakai filter bar peta)
// - GET /api/events/:id (dipakai sisi detail)
// Dijalankan terhadap server yang hidup: nova, lalu `npm run test:map`.
const BASE = process.env.NOVA_URL || 'http://localhost:3000';
let cookie = '';
let pass = 0, fail = 0;

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  for (const c of res.headers.getSetCookie?.() || []) cookie = c.split(';')[0];
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

function check(label, cond, detail) {
  if (cond) { pass++; console.log(`  PASS  ${label}${detail ? ' — ' + detail : ''}`); }
  else { fail++; console.log(`  FAIL  ${label}${detail ? ' — ' + detail : ''}`); }
}

function exit(code) {
  console.log(`\n=== TOTAL: ${pass} pass, ${fail} fail ===`);
  process.exit(code);
}

const GEO_KEYS = ['latitude', 'longitude', 'location_name', 'location_source'];

(async () => {
  let health;
  try {
    health = await call('GET', '/api/health');
  } catch (e) {
    console.error(`[tests] NOVA tidak bisa dijangkau di ${BASE}. Jalankan server dulu: nova`);
    process.exit(2);
  }
  if (health.status !== 200) {
    console.error(`[tests] /api/health → HTTP ${health.status} (bukan 200). Server/token salah?`);
    process.exit(2);
  }

  await call('POST', '/api/auth/login', { password: '123456' });

  console.log('=== GUARD & AUTENTIKASI ===');
  const saved = cookie;
  cookie = '';
  const unauthList = await call('GET', '/api/events?limit=200');
  const unauthDetail = await call('GET', '/api/events/1');
  cookie = saved;
  check('GET /api/events tanpa login ditolak', unauthList.status === 401, `HTTP ${unauthList.status}`);
  check('GET /api/events/:id tanpa login ditolak', unauthDetail.status === 401, `HTTP ${unauthDetail.status}`);

  console.log('\n=== KONTRAK DATA PETA (list) ===');
  const list = await call('GET', '/api/events?limit=200');
  check('GET /api/events?limit=200', list.status === 200, `HTTP ${list.status}`);
  const all = list.json?.events || [];
  const total = list.json?.total || 0;
  check('respons memuat total, categories, events',
    typeof total === 'number' && Array.isArray(list.json?.categories) && Array.isArray(all),
    `total=${total} categories=${list.json?.categories?.length}`);
  check('setiap event memuat  kolom geo (nullable)',
    all.length > 0 && all.every((e) => GEO_KEYS.every((k) => k in e)),
    `${all.length} event diperiksa`);

  const mapped = all.filter((e) => typeof e.latitude === 'number' && typeof e.longitude === 'number');
  check('ada event terpetak untuk marker', mapped.length > 0, `${mapped.length}/${all.length}`);
  check('koordinat dalam rentang valid (lat -90..90, lng -180..180)',
    mapped.every((e) =>
      e.latitude >= -90 && e.latitude <= 90 && e.longitude >= -180 && e.longitude <= 180),
    `${mapped.length} marker diperiksa`);
  check('event terpetak punya location_name terisi',
    mapped.every((e) => !!e.location_name),
    `${mapped.length} event diperiksa`);
  check('location_source hanya gazetteer|manual',
    mapped.every((e) => e.location_source === 'gazetteer' || e.location_source === 'manual'),
    [...new Set(mapped.map((e) => e.location_source))].join(','));

  console.log('\n=== FILTER & LIMIT (filter bar peta) ===');
  const limited = await call('GET', '/api/events?limit=5');
  check('limit=5 mengembalikan ≤5 events',
    (limited.json?.events || []).length <= 5 && limited.json?.events.length > 0,
    `${limited.json?.events?.length} events`);
  check('total tetap sama (limit tidak memotong total)', limited.json?.total === total,
    `total=${limited.json?.total} vs ${total}`);
  const cat = list.json?.categories?.[0]?.category;
  if (cat) {
    const filtered = await call('GET', `/api/events?category=${encodeURIComponent(cat)}&limit=200`);
    const rows = filtered.json?.events || [];
    check(`filter kategori "${cat}" hanya mengembalikan kategori itu`,
      rows.length > 0 && rows.every((e) => e.category === cat),
      `${rows.length} events`);
  } else {
    check('kategori tersedia untuk filter', false, 'categories kosong');
  }

  console.log('\n=== DETAIL EVENT (popup/panel) ===');
  const target = mapped[0] || all[0];
  const detail = await call('GET', `/api/events/${target.id}`);
  check('GET /api/events/:id', detail.status === 200, `HTTP ${detail.status}`);
  check('detail memuat kolom geo', GEO_KEYS.every((k) => k in detail.json),
    `event #${target.id}`);
  check('detail memuat articles + stable_id',
    Array.isArray(detail.json?.articles) && !!detail.json?.stable_id,
    `articles=${detail.json?.articles?.length}`);

  exit(fail ? 1 : 0);
})();
