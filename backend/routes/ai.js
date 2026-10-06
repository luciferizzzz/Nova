const express = require('express');
const { summarizeEvent, summarizeTimelineDay } = require('../services/aiSummarizer');

const router = express.Router();

function readSettings(db) {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const settings = {};
  for (const r of rows) settings[r.key] = r.value;
  return settings;
}

router.post('/events/:id/summarize', async (req, res) => {
  try {
    const db = req.db;
    const id = Number(req.params.id);
    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const articleRows = db.prepare(`
      SELECT b.id, b.judul, b.konten, b.gambar, b.kategori, b.negara, b.sumber, b.link_asli, b.created_at
      FROM event_articles ea
      JOIN berita b ON b.id = ea.article_id
      WHERE ea.event_id = ?
      ORDER BY b.created_at DESC
    `).all(id);

    const settings = readSettings(db);
    const result = await summarizeEvent({ event, articles: articleRows, settings });

    if (result.text) {
      db.prepare(`
        UPDATE events
        SET summary = ?, summary_provider = ?, summary_model = ?,
            summary_generated_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).run(result.text, result.provider || null, result.model || null, id);
      const updated = db.prepare('SELECT * FROM events WHERE id = ?').get(id);
      return res.json({
        ok: true,
        summary: result.text,
        event: updated,
        ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {})
      });
    }

    return res.json({ ok: false, message: 'No summary generated' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/timeline/daily-summary', async (req, res) => {
  try {
    const db = req.db;
    const { date } = req.body || {};
    if (!date) return res.status(400).json({ error: 'date required (YYYY-MM-DD)' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
    }
    const settings = readSettings(db);

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
    if (!result.text) {
      return res.json({ ok: false, date, message: 'No summary generated', provider: result.provider });
    }
    res.json({
      ok: true,
      date,
      summary: result.text,
      provider: result.provider,
      ...(result.fallbackReason ? { fallbackReason: result.fallbackReason } : {})
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
