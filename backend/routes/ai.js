const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { getDb } = require('../database/db');
const { summarizeEvent, summarizeTimelineDay } = require('../services/aiSummarizer');

const router = express.Router();

function getSettings() {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  return settings;
}

router.post('/events/:id/summarize', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const db = getDb();
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const articleRows = db.prepare(`
      SELECT b.id, b.judul, b.konten, b.gambar, b.kategori, b.negara, b.sumber, b.link_asli, b.created_at
      FROM event_articles ea
      JOIN berita b ON b.id = ea.article_id
      WHERE ea.event_id = ?
      ORDER BY b.created_at DESC
    `).all(id);

    const settings = getSettings();
    const result = await summarizeEvent({ event, articles: articleRows, settings });

    if (result.text) {
      db.prepare(`UPDATE events SET summary = ?, summary_provider = ?, summary_model = ?, summary_generated_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
        .run(result.text, result.provider || null, result.model || null, id);
      const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      return res.json({ ok: true, summary: result.text, event: updated });
    }

    return res.json({ ok: false, message: 'No summary generated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/timeline/daily-summary', requireAuth, async (req, res) => {
  try {
    const { date } = req.body || {};
    if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
    const db = getDb();
    const settings = getSettings();

    const events = db.prepare(`
      SELECT id, title, summary, category, created_at
      FROM events
      WHERE date(created_at) = ?
      ORDER BY created_at ASC
    `).all(date);

    const headlines = db.prepare(`
      SELECT id, judul, sumber, kategori, negara, created_at
      FROM berita
      WHERE date(created_at) = ?
      ORDER BY created_at DESC
      LIMIT 12
    `).all(date);

    const result = await summarizeTimelineDay({ date, events, headlines, settings });
    res.json({ ok: true, date, summary: result.text, provider: result.provider });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
