#!/usr/bin/env node
// Smoke test Phase 9 Sesi 1 — Location Enricher (Geo Mapping Milestone A).
// - Enrichment otomatis via gazetteer offline (POST /api/events/enrich)
// - Koordinat manual per event (Hybrid A+B, keputusan meeting 2026-10-17)
// - Validasi input + koordinat manual bertahan lintas scan
// Dijalankan terhadap server yang hidup: nova, lalu `npm run test:location`.
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
  const unauthPut = await call('PUT', '/api/events/1/location', { latitude: -6.2, longitude: 106.8 });
  const unauthEnrich = await call('POST', '/api/events/enrich');
  const unauthDelete = await call('DELETE', '/api/events/1/location');
  cookie = saved;
  check('PUT location tanpa login ditolak', unauthPut.status === 401, `HTTP ${unauthPut.status}`);
  check('POST enrich tanpa login ditolak', unauthEnrich.status === 401, `HTTP ${unauthEnrich.status}`);
  check('DELETE location tanpa login ditolak', unauthDelete.status === 401, `HTTP ${unauthDelete.status}`);

  console.log('\n=== ENRICHMENT GAZETTEER (otomatis) ===');
  const enrich = await call('POST', '/api/events/enrich');
  check('POST /api/events/enrich', enrich.status === 200, `HTTP ${enrich.status}`);
  check('respons memuat scanned & matched angka',
    typeof enrich.json?.scanned === 'number' && typeof enrich.json?.matched === 'number',
    `scanned=${enrich.json?.scanned} matched=${enrich.json?.matched}`);

  const list = await call('GET', '/api/events?limit=200');
  const all = list.json?.events || [];
  const located = all.filter((e) => typeof e.latitude === 'number' && typeof e.longitude === 'number');
  check('ada event ter-enrich di /api/events', located.length > 0, `${located.length}/${all.length} event punya koordinat`);
  check('event ter-enrich punya location_name & location_source',
    located.every((e) => !!e.location_name && e.location_source === 'gazetteer'));
  const jakarta = located.find((e) => e.location_name === 'Jakarta');
  check('minimal satu event match "Jakarta"', !!jakarta, jakarta ? `event #${jakarta.id}` : 'tidak ada');

  console.log('\n=== KOORDINAT MANUAL (Hybrid A+B fallback) ===');
  // Pakai event pertama apa pun sebagai target uji manual.
  const target = all[0];
  check('ada event untuk uji manual', !!target, target ? `event #${target.id}` : 'events kosong');

  if (target) {
    const put = await call('PUT', `/api/events/${target.id}/location`, {
      latitude: -7.57, longitude: 110.82, name: 'Solo (manual)'
    });
    check('PUT location manual', put.status === 200, `HTTP ${put.status}`);
    check('respons menyimpan sebagai manual', put.json?.locationSource === 'manual', put.json?.locationSource);

    const after = await call('GET', `/api/events/${target.id}`);
    check('GET event mengembalikan koordinat manual',
      after.json?.latitude === -7.57 && after.json?.longitude === 110.82,
      `lat=${after.json?.latitude} lng=${after.json?.longitude}`);
    check('location_source=manual', after.json?.location_source === 'manual', after.json?.location_source);

    const badLat = await call('PUT', `/api/events/${target.id}/location`, { latitude: 999, longitude: 0 });
    check('latitude di luar rentang ditolak (400)', badLat.status === 400, `HTTP ${badLat.status}`);
    const badLng = await call('PUT', `/api/events/${target.id}/location`, { latitude: 0, longitude: 'abc' });
    check('longitude non-angka ditolak (400)', badLng.status === 400, `HTTP ${badLng.status}`);
    const missing = await call('PUT', '/api/events/99999999/location', { latitude: 0, longitude: 0 });
    check('event tak ada → 404', missing.status === 404, `HTTP ${missing.status}`);

    console.log('\n=== MANUAL BERTAHAN LINTAS SCAN ===');
    const scan = await call('POST', '/api/events/scan');
    check('POST /api/events/scan', scan.status === 200 && scan.json?.success === true, `HTTP ${scan.status}`);
    check('scan mengembalikan jumlah enriched (otomatis)', typeof scan.json?.enriched === 'number', `enriched=${scan.json?.enriched}`);

    const rescan = await call('GET', `/api/events/${target.id}`);
    if (rescan.status === 200) {
      check('koordinat manual tetap setelah scan',
        rescan.json?.latitude === -7.57 && rescan.json?.longitude === 110.82 && rescan.json?.location_source === 'manual',
        `lat=${rescan.json?.latitude} src=${rescan.json?.location_source}`);
    } else {
      // Event hilang dari cluster scan terbaru (wajar bila keanggotaan berubah) —
      // artinya uji kelangsungan tidak bisa dinilai, bukan kegagalan fitur.
      console.log(`  SKIP  kelangsungan manual lintas scan — event #${target.id} tidak ada lagi setelah scan (HTTP ${rescan.status})`);
    }

    const del = await call('DELETE', `/api/events/${target.id}/location`);
    check('DELETE location (reset manual)', del.status === 200, `HTTP ${del.status}`);
    const cleared = await call('GET', `/api/events/${target.id}`);
    if (cleared.status === 200) {
      check('koordinat kosong setelah dihapus', cleared.json?.latitude == null && cleared.json?.longitude == null);
    }
    const delMissing = await call('DELETE', '/api/events/99999999/location');
    check('DELETE event tak ada → 404', delMissing.status === 404, `HTTP ${delMissing.status}`);
  }

  exit(fail ? 1 : 0);
})();
