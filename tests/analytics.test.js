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

  console.log('\n=== TRENDING VELOCITY (Fitur B) ===');
  {
    const savedT = cookie;
    cookie = '';
    const unauthT = await call('GET', '/api/trending');
    cookie = savedT;
    check('trending tanpa login ditolak', unauthT.status === 401, `HTTP ${unauthT.status}`);

    const tr = await call('GET', '/api/trending?hours=24&limit=5');
    check('GET /api/trending', tr.status === 200, `HTTP ${tr.status}`);
    check('bentuk respons (hours/since/count/events)',
      tr.json && typeof tr.json.hours === 'number' && typeof tr.json.since === 'string' &&
      typeof tr.json.count === 'number' && Array.isArray(tr.json.events));

    const tev = tr.json?.events || [];
    if (tev.length > 0) {
      check('semua event recent_count >= 1', tev.every((e) => e.recent_count >= 1));
      check('semua event velocity > 0', tev.every((e) => e.velocity > 0));
      check('velocity = recent_count / hours',
        tev.every((e) => Math.abs(e.velocity - e.recent_count / tr.json.hours) < 0.01),
        `contoh ${tev[0].velocity} vs ${(tev[0].recent_count / tr.json.hours).toFixed(2)}`);
      check('total_count >= recent_count', tev.every((e) => e.total_count >= e.recent_count));
      check('source_count >= 1', tev.every((e) => e.source_count >= 1));
      check('last_at terisi', tev.every((e) => !!e.last_at));
      check('events terurut recent_count DESC',
        tev.every((e, i) => i === 0 || tev[i - 1].recent_count >= e.recent_count));
      check('articles per event <= 3 & array',
        tev.every((e) => Array.isArray(e.articles) && e.articles.length <= 3));
      check('articles konsisten (<= recent_count)',
        tev.every((e) => e.articles.length <= e.recent_count));

      // Filter kategori (setingkat artikel) menyempitkan velocity & artikel tampilan.
      const kategori = tev[0].articles[0]?.kategori;
      if (kategori) {
        const trf = await call('GET', `/api/trending?hours=24&kategori=${encodeURIComponent(kategori)}`);
        check('filter kategori -> 200', trf.status === 200, `HTTP ${trf.status}`);
        check('filter kategori: artikel tampilan semua match',
          (trf.json?.events || []).every((e) => (e.articles || []).every((a) => a.kategori === kategori)),
          kategori);
      }
    } else {
      check('ada minimal 1 event trending (24h)', false, 'tidak ada event dengan artikel dalam 24h');
    }
  }

  console.log('\n=== CATEGORIES (Fitur C) ===');
  {
    const savedC = cookie;
    cookie = '';
    const unauthC = await call('GET', '/api/categories');
    cookie = savedC;
    check('categories tanpa login ditolak', unauthC.status === 401, `HTTP ${unauthC.status}`);

    const ca = await call('GET', '/api/categories?days=30');
    check('GET /api/categories', ca.status === 200, `HTTP ${ca.status}`);
    check('bentuk respons (days/since/total/articles/categories)',
      ca.json && typeof ca.json.days === 'number' && typeof ca.json.since === 'string' &&
      typeof ca.json.total === 'number' && typeof ca.json.articles === 'number' &&
      Array.isArray(ca.json.categories));

    const cats = ca.json?.categories || [];
    if (cats.length > 0) {
      check('semua kategori punya nama', cats.every((c) => typeof c.kategori === 'string' && c.kategori.length > 0));
      check('semua count >= 1', cats.every((c) => c.count >= 1));
      check('sources >= 1', cats.every((c) => c.sources >= 1));
      check('countries >= 1', cats.every((c) => c.countries >= 1));
      check('trend = recent - prev', cats.every((c) => c.trend === c.recent - c.prev));
      check('daily berupa array', cats.every((c) => Array.isArray(c.daily)));
      check('panjang daily = days', cats.every((c) => c.daily.length === ca.json.days));
      check('sourceList <= 6', cats.every((c) => Array.isArray(c.sourceList) && c.sourceList.length <= 6));
      check('headlines <= 5', cats.every((c) => Array.isArray(c.headlines) && c.headlines.length <= 5));
      check('headline punya slug', cats.every((c) => c.headlines.every((h) => !!h.slug && !!h.judul)));
      check('categories terurut count DESC',
        cats.every((c, i) => i === 0 || cats[i - 1].count >= c.count));
      check('jumlah artikel kategori <= total artikel window',
        cats.reduce((sum, c) => sum + c.count, 0) <= ca.json.articles);

      const top = cats[0];
      const single = await call('GET', `/api/trending?hours=24&kategori=${encodeURIComponent(top.kategori)}`);
      check('kategori bisa dipakai filter endpoint lain (/api/trending)', single.status === 200, `HTTP ${single.status}`);
    } else {
      check('ada minimal 1 kategori (30 hari)', false, 'DB kosong');
    }
  }

  console.log('\n=== REGRESI ===');
  for (const p of ['/api/berita?limit=3', '/api/berita/stats', '/api/events?limit=3', '/api/timeline?days=7']) {
    const x = await call('GET', p);
    check(`GET ${p}`, x.status === 200, `HTTP ${x.status}`);
  }

  exit(fail ? 1 : 0);
})();
