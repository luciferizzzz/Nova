const https = require('https');
const http = require('http');

function truncate(text, max = 4000) {
  if (!text) return '';
  const str = String(text);
  return str.length > max ? str.slice(0, max) : str;
}

async function summarizeWithOllama({ endpoint = 'http://localhost:11434', model = 'llama3.2:3b', prompt, timeout = 60000 }) {
  const url = new URL('/api/generate', endpoint);
  const payload = {
    model,
    prompt,
    stream: false,
    options: {
      temperature: 0.2,
      top_p: 0.9,
      num_predict: 256
    }
  };

  return new Promise((resolve, reject) => {
    const isHttps = url.protocol === 'https:';
    const req = (isHttps ? https : http).request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      timeout
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          reject(new Error('Invalid Ollama response: ' + data.slice(0, 200)));
          return;
        }
        // Ollama membalas HTTP 200 dengan body {"error": ...} untuk model yang
        // tidak terpasang, jadi status code saja tidak cukup untuk tahu gagal.
        if (res.statusCode !== 200) {
          reject(new Error(`Ollama HTTP ${res.statusCode}: ${parsed.error || data.slice(0, 200)}`));
          return;
        }
        if (parsed.error) {
          reject(new Error(`Ollama error: ${parsed.error}`));
          return;
        }
        const text = parsed.response || parsed.text || '';
        if (!text.trim()) {
          reject(new Error('Ollama returned an empty summary'));
          return;
        }
        resolve(text);
      });
    });

    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('Ollama request timeout')); });
    req.write(JSON.stringify(payload));
    req.end();
  });
}

function extractiveSummary(articles, maxSentences = 3) {
  const texts = [];
  for (const a of articles) {
    const title = a.judul || a.title || '';
    const content = a.konten || a.content || '';
    if (title) texts.push(title.trim());
    if (content) {
      const cleaned = String(content).replace(/\s+/g, ' ').trim();
      if (cleaned) texts.push(cleaned.slice(0, 600));
    }
  }
  if (texts.length === 0) return '';

  const combined = texts.join('. ').replace(/\.+/g, '. ');
  const sentences = combined.split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
  const top = sentences.slice(0, maxSentences).join(' ');
  return top || combined.slice(0, 400);
}

async function summarizeEvent({ event, articles, settings }) {
  const provider = (settings.ai_provider || 'extractive').toLowerCase();
  const endpoint = settings.ai_endpoint || 'http://localhost:11434';
  const model = settings.ai_model || 'llama3.2:3b';
  const enabled = settings.ai_enabled === 'true' || settings.ai_enabled === true;

  if (!enabled || provider === 'disabled') return { text: '', provider: 'disabled' };

  const articleList = (articles || []).map((a, i) => {
    return `${i + 1}. ${a.judul || a.title}: ${truncate(a.konten || a.content || '', 1000)}`;
  }).join('\n');

  const prompt = `Summarize this event in 2-3 concise sentences in the same language as the articles. Focus on key facts, who/what/where/when, and main development.\n\nEvent title: ${event.title}\n\nArticles:\n${articleList}\n\nSummary:`;

  try {
    if (provider === 'ollama') {
      const text = await summarizeWithOllama({ endpoint, model, prompt });
      return { text: text.trim(), provider: 'ollama', model };
    }
    const text = extractiveSummary(articles);
    return { text: text.trim(), provider: 'extractive' };
  } catch (e) {
    const text = extractiveSummary(articles);
    return { text: text.trim(), provider: 'extractive_fallback', fallbackReason: e.message };
  }
}

function buildDayExtractive(date, events, headlines, maxEvents = 3, maxHeadlines = 2) {
  const parts = [];
  const eventTitles = events.slice(0, maxEvents).map((e) => String(e.title || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  if (eventTitles.length > 0) parts.push(eventTitles.join('; '));

  const headlineTitles = headlines
    .slice(0, maxHeadlines)
    .map((h) => String(h.judul || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  if (headlineTitles.length > 0) parts.push(`Other headlines: ${headlineTitles.join('; ')}`);

  const counts = [];
  if (events.length > 0) counts.push(`${events.length} tracked event${events.length > 1 ? 's' : ''}`);
  if (headlines.length > 0) counts.push(`${headlines.length} headline${headlines.length > 1 ? 's' : ''}`);
  if (counts.length > 0) parts.push(`(${counts.join(', ')})`);

  if (parts.length === 0) return '';
  const text = `${date}: ${parts.join('. ')}.`;
  return text.length > 700 ? `${text.slice(0, 700).replace(/\s+\S*$/, '')}…` : text;
}

async function summarizeTimelineDay({ date, events = [], headlines = [], settings }) {
  const provider = (settings.ai_provider || 'extractive').toLowerCase();
  const endpoint = settings.ai_endpoint || 'http://localhost:11434';
  const model = settings.ai_model || 'llama3.2:3b';
  const enabled = settings.ai_enabled === 'true' || settings.ai_enabled === true;

  if (!enabled || provider === 'disabled') return { text: '', provider: 'disabled' };

  const eventLines = events.map((e, i) => `${i + 1}. ${e.title}${e.summary ? ' - ' + truncate(e.summary, 200) : ''}`).join('\n');
  const headlineLines = headlines.map((h, i) => `${i + 1}. ${h.judul}`).join('\n');

  const prompt = `Give a TL;DR (1-2 sentences) for ${date} based on these events and headlines. Be neutral and factual.\n\nEvents:\n${eventLines}\n\nTop headlines:\n${headlineLines}\n\nTL;DR:`;

  try {
    if (provider === 'ollama') {
      const text = await summarizeWithOllama({ endpoint, model, prompt });
      return { text: text.trim(), provider: 'ollama', model };
    }
    return { text: buildDayExtractive(date, events, headlines), provider: 'extractive' };
  } catch (e) {
    return { text: buildDayExtractive(date, events, headlines), provider: 'extractive_fallback', fallbackReason: e.message };
  }
}

module.exports = {
  summarizeEvent,
  summarizeTimelineDay
};
