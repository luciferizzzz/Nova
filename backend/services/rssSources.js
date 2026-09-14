const defaultSources = [
  // Indonesia
  { name: 'Detik News', rss_url: 'https://news.detik.com/rss', country: 'Indonesia', category: 'World', language: 'id' },
  { name: 'Kompas', rss_url: 'https://rss.kompas.com/computing/', country: 'Indonesia', category: 'Technology', language: 'id' },
  { name: 'CNN Indonesia', rss_url: 'https://www.cnnindonesia.com/nasional/rss', country: 'Indonesia', category: 'World', language: 'id' },
  { name: 'Tempo', rss_url: 'https://rss.tempoiw.com/nasional', country: 'Indonesia', category: 'World', language: 'id' },

  // United States
  { name: 'Reuters', rss_url: 'https://feeds.reuters.com/reuters/topNews', country: 'United States', category: 'World', language: 'en' },
  { name: 'CNN', rss_url: 'http://rss.cnn.com/rss/edition.rss', country: 'United States', category: 'World', language: 'en' },
  { name: 'TechCrunch', rss_url: 'https://techcrunch.com/feed/', country: 'United States', category: 'Technology', language: 'en' },
  { name: 'Ars Technica', rss_url: 'https://feeds.arstechnica.com/arstechnica/index', country: 'United States', category: 'Technology', language: 'en' },
  { name: 'Hacker News', rss_url: 'https://hnrss.org/frontpage', country: 'United States', category: 'Technology', language: 'en' },
  { name: 'Bloomberg', rss_url: 'https://feeds.bloomberg.com/markets/news.rss', country: 'United States', category: 'Economy', language: 'en' },
  { name: 'CNBC', rss_url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html', country: 'United States', category: 'Economy', language: 'en' },
  { name: 'Science Daily', rss_url: 'https://www.sciencedaily.com/rss/all.xml', country: 'United States', category: 'Science', language: 'en' },
  { name: 'Phys.org', rss_url: 'https://phys.org/rss-feed/', country: 'United States', category: 'Science', language: 'en' },
  { name: 'MIT Tech Review AI', rss_url: 'https://www.technologyreview.com/topic/artificial-intelligence/feed', country: 'United States', category: 'Technology', language: 'en' },
  { name: 'WHO News', rss_url: 'https://www.who.int/rss-feeds/news-english.xml', country: 'United States', category: 'Other', language: 'en' },
  { name: 'Variety', rss_url: 'https://variety.com/feed/', country: 'United States', category: 'Other', language: 'en' },

  // United Kingdom
  { name: 'BBC News', rss_url: 'https://feeds.bbci.co.uk/news/rss.xml', country: 'United Kingdom', category: 'World', language: 'en' },
  { name: 'BBC Technology', rss_url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', country: 'United Kingdom', category: 'Technology', language: 'en' },
  { name: 'The Guardian', rss_url: 'https://www.theguardian.com/world/rss', country: 'United Kingdom', category: 'World', language: 'en' },

  // Japan
  { name: 'NHK News', rss_url: 'https://www3.nhk.or.jp/rss/news/cat0.xml', country: 'Japan', category: 'World', language: 'ja' },
  { name: 'NHK Tech', rss_url: 'https://www3.nhk.or.jp/rss/news/cat6.xml', country: 'Japan', category: 'Technology', language: 'ja' },

  // South Korea
  { name: 'Korea Herald', rss_url: 'http://www.koreaherald.com/rss/020200000000.xml', country: 'South Korea', category: 'World', language: 'ko' },

  // Singapore
  { name: 'Channel News Asia', rss_url: 'https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml', country: 'Singapore', category: 'World', language: 'en' },

  // Malaysia
  { name: 'Malay Mail', rss_url: 'https://www.malaymail.com/feed', country: 'Malaysia', category: 'World', language: 'en' }
]

module.exports = { defaultSources }