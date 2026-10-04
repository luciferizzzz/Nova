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
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.response || parsed.text || '');
        } catch (e) {
          reject(new Error('Invalid Ollama response: ' + data.slice(0, 200)));
        }
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
    return { text: text.trim(), provider: 'extractive_fallback' };
  }
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
    const parts = [];
    if (events.length > 0) parts.push(`${events.length} event(s)`);
    if (headlines.length > 0) parts.push(`${headlines.length} headline(s)`);
    return { text: parts.length > 0 ? `Summary for ${date}: ${parts.join(', ')}.` : '', provider: 'extractive' };
  } catch (e) {
    const parts = [];
    if (events.length > 0) parts.push(`${events.length} event(s)`);
    if (headlines.length > 0) parts.push(`${headlines.length} headline(s)`);
    return { text: parts.length > 0 ? `Summary for ${date}: ${parts.join(', ')}.` : '', provider: 'extractive_fallback' };
  }
}

module.exports = {
  summarizeEvent,
  summarizeTimelineDay
};
