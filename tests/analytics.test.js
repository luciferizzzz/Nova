#!/usr/bin/env node
// Smoke test Fase 8 — Analytics & Insights.
// Fitur A: "Also reported by" (corroboration antar sumber).
// Dijalankan terhadap server yang hidup: npm start / nova, lalu `npm run test:analytics`.
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

  console.log('=== GUARD & AUTENTIKASI ===');
  const saved = cookie;
  cookie = '';
  const unauth = await call('GET', '/api/berita/whatever/corroboration');
  cookie = saved;
  check('corroboration tanpa login ditolak', unauth.status === 401, `HTTP ${unauth.status}`);

  console.log('\n=== ALSO REPORTED BY (Fitur A) ===');
  // Cari event yang anggotanya dari >= 2 sumber berbeda (data corroboration).
  const list = await call('GET', '/api/events?limit=50');
  let target = null;
  for (const ev of (list.json?.events || [])) {
    const d = await call('GET', `/api/events/${ev.id}`);
    const arts = d.json?.articles || [];
    const srcs = new Set(arts.map((a) => a.sumber));
    if (arts.length >= 2 && srcs.size >= 2) { target = { ev, articles: arts }; break; }
  }
  check('ada event lintas sumber', !!target,
    target ? `${target.articles.length} artikel / ${new Set(target.articles.map((a) => a.sumber)).size} sumber` : 'tidak ditemukan');

  if (target) {
    const article = target.articles[0];
    let r = await call('GET', `/api/berita/${encodeURIComponent(article.slug)}/corroboration`);
    check('GET corroboration', r.status === 200, `HTTP ${r.status}`);
    check('event terisi (stable_id + judul)', !!r.json?.event?.stable_id && !!r.json?.event?.title);
    check('sourceCount >= 1', typeof r.json?.sourceCount === 'number' && r.json.sourceCount >= 1, `sourceCount=${r.json?.sourceCount}`);
    check('sources tidak memuat sumber artikel sendiri',
      !(r.json?.sources || []).some((s) => s.sumber === article.sumber), article.sumber);
    check('articles tidak memuat artikel sendiri',
      !(r.json?.articles || []).some((a) => a.id === article.id));
    check('articles hanya dari sumber lain',
      (r.json?.articles || []).every((a) => a.sumber && a.sumber !== article.sumber));
    check('event.article_count = total anggota event',
      r.json?.event?.article_count === target.articles.length,
      `${r.json?.event?.article_count} vs ${target.articles.length}`);
    check('sources konsisten dengan articles',
      (r.json?.articles || []).length >= (r.json?.sources || []).length);
  }

  console.log('\n=== SLUG TIDAK ADA ===');
  let r = await call('GET', '/api/berita/slug-tidak-ada-xyz-999/corroboration');
  check('slug tidak ada -> 404', r.status === 404, `HTTP ${r.status}`);

  console.log('\n=== BENTUK RESPONS (artikel apa pun) ===');
  const any = await call('GET', '/api/berita?limit=1');
  let sample = any.json?.[0];
  if (sample) {
    r = await call('GET', `/api/berita/${encodeURIComponent(sample.slug)}/corroboration`);
    check('artikel valid -> 200 + bentuk benar',
      r.status === 200 && typeof r.json?.sourceCount === 'number' &&
      Array.isArray(r.json?.sources) && Array.isArray(r.json?.articles));
  } else {
    check('ada minimal 1 artikel untuk sampel', false, 'DB kosong');
  }

  console.log('\n=== REGRESI ===');
  for (const p of ['/api/berita?limit=3', '/api/berita/stats', '/api/events?limit=3', '/api/timeline?days=7']) {
    const x = await call('GET', p);
    check(`GET ${p}`, x.status === 200, `HTTP ${x.status}`);
  }

  exit(fail ? 1 : 0);
})();
