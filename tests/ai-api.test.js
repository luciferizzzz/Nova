#!/usr/bin/env node
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
    console.error(`[tests] NOVA tidak bisa dijangkau di ${BASE}. Jalankan server dulu: npm start / nova`);
    process.exit(2);
  }
  if (health.status !== 200) {
    console.error(`[tests] /api/health → HTTP ${health.status} (bukan 200). Server/token salah?`);
    process.exit(2);
  }

  await call('POST', '/api/auth/login', { password: '123456' });

  // ID event berubah tiap re-scan (defect stable event ID), jadi selalu ambil ID live.
  const tl = await call('GET', '/api/timeline?days=30');
  const days = tl.json.days;
  const day = days.find((d) => d.count > 20).day;
  const list = await call('GET', '/api/events?limit=5');
  const liveId = list.json.events[0].id;

  console.log(`konteks: day=${day} (${days.find((d) => d.day === day).count} artikel), eventId=${liveId}\n`);

  console.log('=== GUARD & AUTENTIKASI ===');
  check('tanpa login ditolak', (await (async () => { const c = cookie; cookie = ''; const r = await call('POST', '/api/ai/timeline/daily-summary', { date: day }); cookie = c; return r; })()).status === 401);
  check('login', (await call('GET', '/api/events?limit=1')).status === 200);

  console.log('\n=== PATH (regresi bug 4 Okt) ===');
  let r = await call('POST', `/api/events/${liveId}/summarize`);
  check('path LAMA /api/events/... ditolak', r.status === 404, `HTTP ${r.status}`);
  r = await call('POST', `/api/ai/events/${liveId}/summarize`);
  check('path BENAR /api/ai/... diterima', r.status === 200 || r.json?.ok === false, `HTTP ${r.status}`);

  console.log('\n=== VALIDASI INPUT ===');
  check('tanpa date -> 400', (await call('POST', '/api/ai/timeline/daily-summary', {})).status === 400);
  check('format date salah -> 400', (await call('POST', '/api/ai/timeline/daily-summary', { date: '25-09-2026' })).status === 400);
  r = await call('POST', '/api/ai/events/99999999/summarize');
  check('event tidak ada -> 404', r.status === 404, r.json?.error);

  console.log('\n=== AI DISABLED (default) ===');
  await call('PUT', '/api/setting', { ai_enabled: 'false', ai_provider: 'extractive' });
  r = await call('POST', `/api/ai/events/${liveId}/summarize`);
  check('event -> ok:false (bukan 500)', r.status === 200 && r.json?.ok === false, `HTTP ${r.status} ok=${r.json?.ok}`);
  r = await call('POST', '/api/ai/timeline/daily-summary', { date: day });
  check('daily -> ok:false (bukan 500)', r.status === 200 && r.json?.ok === false, `HTTP ${r.status} ok=${r.json?.ok} provider=${r.json?.provider}`);

  console.log('\n=== AI AKTIF — extractive ===');
  await call('PUT', '/api/setting', { ai_enabled: 'true', ai_provider: 'extractive' });
  r = await call('POST', `/api/ai/events/${liveId}/summarize`);
  check('event summary generate', r.status === 200 && r.json?.ok === true, `provider=${r.json?.event?.summary_provider}`);
  check('summary tidak kosong', (r.json?.summary || '').length > 40, `${(r.json?.summary || '').length} char`);
  check('summary_provider=extractive', r.json?.event?.summary_provider === 'extractive');
  check('summary_generated_at terisi', !!r.json?.event?.summary_generated_at);
  check('summary_model null (bukan ollama)', r.json?.event?.summary_model === null);
  const evSummary = r.json?.summary;

  r = await call('POST', '/api/ai/timeline/daily-summary', { date: day });
  check('daily summary generate', r.status === 200 && r.json?.ok === true, `provider=${r.json?.provider}`);
  check('daily summary isi, bukan angka', (r.json?.summary || '').length > 150, `${(r.json?.summary || '').length} char`);

  console.log('\n=== KONSISTENSI ===');
  r = await call('POST', `/api/ai/events/${liveId}/summarize`);
  check('regenerate deterministik', r.json?.summary === evSummary);

  console.log('\n=== OLLAMA TIDAK JALAN → fallback ===');
  await call('PUT', '/api/setting', { ai_enabled: 'true', ai_provider: 'ollama' });
  r = await call('POST', `/api/ai/events/${liveId}/summarize`);
  check('tidak error, fallback extractive', r.status === 200 && r.json?.ok === true, `provider=${r.json?.event?.summary_provider}`);

  console.log('\n=== PERSISTENSI & FIELD ===');
  await call('PUT', '/api/setting', { ai_enabled: 'true', ai_provider: 'extractive' });
  await call('POST', `/api/ai/events/${liveId}/summarize`);
  r = await call('GET', `/api/events/${liveId}`);
  check('tersimpan di DB, dibaca ulang dari API', !!r.json?.summary, `len=${(r.json?.summary || '').length}`);
  r = await call('GET', '/api/events?limit=10');
  const withSum = r.json.events.filter((e) => e.summary).length;
  check('GET /api/events menyertakan summary', withSum > 0, `${withSum}/10 event punya summary`);

  console.log('\n=== REGRESI ===');
  for (const p of ['/api/events?limit=3', '/api/timeline?days=7', '/api/berita?limit=3', '/api/sources', '/api/setting', '/api/bookmarks']) {
    const x = await call('GET', p);
    check(`GET ${p}`, x.status === 200, `HTTP ${x.status}`);
  }

  await call('PUT', '/api/setting', { ai_enabled: 'false', ai_provider: 'extractive' });
  exit(fail ? 1 : 0);
})();