#!/usr/bin/env node
// Gera assets/data/noticias.json a partir de feeds RSS/Atom reais.
// Sem IA: só busca, filtra por palavra-chave e ordena. Roda local (node scripts/build-noticias.mjs)
// ou automaticamente via GitHub Action (.github/workflows/update-noticias.yml).

import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_PATH = join(__dirname, '..', 'assets', 'data', 'noticias.json');

// Feeds de notícias gerais (fontes reais e confiáveis) — filtrados por palavra-chave
// de imigração/Austrália aqui no script, já que nenhuma das duas mantém um feed
// dedicado só de imigração.
const NEWS_FEEDS = [
  { source: 'SBS News', url: 'https://www.sbs.com.au/news/feed' },
  { source: 'SBS News · Austrália', url: 'https://www.sbs.com.au/news/topic/australia/feed' },
  { source: 'ABC News', url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
];

// Canal oficial do cliente no YouTube (No So Far Away / Austrália Sem Fronteiras).
const YOUTUBE_CHANNEL_ID = 'UCwzrKl1SL-jhN0zwhczws8g';
const YOUTUBE_FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;

// Palavras-chave usadas pra filtrar as notícias gerais — pura correspondência de
// texto, nada de IA. Cobre PT e EN porque as fontes são em inglês.
const KEYWORDS = [
  'visa', 'visto', 'immigra', 'imigra', 'migrant', 'migrante', 'migração',
  'refugee', 'refugiado', 'asylum', 'asilo', 'skilled worker', 'sponsor',
  'citizenship', 'cidadania', 'permanent residency', 'residência permanente',
  'home affairs', 'border force', 'international student', 'estudante internacional',
  'working holiday', 'deportation', 'deportação',
];

const MAX_NEWS_ITEMS = 9;
const MAX_VIDEO_ITEMS = 6;

function decodeEntities(str = '') {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function stripTags(str = '') {
  return decodeEntities(str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')).trim();
}

function extractTag(block, tag) {
  const re = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i');
  const m = block.match(re);
  return m ? decodeEntities(m[1]) : '';
}

function extractAttr(block, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*/?\\s*>`, 'i');
  const m = block.match(re);
  return m ? m[1] : '';
}

// Parser mínimo pra RSS 2.0 (<item>) — suficiente pros feeds usados aqui,
// sem depender de nenhuma lib externa de XML.
function parseRss(xml, source) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
  return items.map((block) => ({
    source,
    title: stripTags(extractTag(block, 'title')),
    link: stripTags(extractTag(block, 'link')) || extractAttr(block, 'guid', 'isPermaLink'),
    description: stripTags(extractTag(block, 'description')),
    pubDate: extractTag(block, 'pubDate'),
  }));
}

// Parser mínimo pra Atom (<entry>) — usado só pro feed do YouTube.
function parseAtom(xml) {
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  return entries.map((block) => {
    const videoId = extractTag(block, 'yt:videoId');
    const linkHref = extractAttr(block, 'link', 'href');
    return {
      videoId,
      title: stripTags(extractTag(block, 'title')),
      link: linkHref || (videoId ? `https://www.youtube.com/watch?v=${videoId}` : ''),
      published: extractTag(block, 'published'),
      thumbnail: videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '',
    };
  });
}

function matchesKeywords(item) {
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  return KEYWORDS.some((kw) => haystack.includes(kw));
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NoSoFarAwayNoticiasBot/1.0)' },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.text();
}

async function main() {
  const newsResults = [];
  for (const feed of NEWS_FEEDS) {
    try {
      const xml = await fetchText(feed.url);
      const items = parseRss(xml, feed.source).filter(matchesKeywords);
      newsResults.push(...items);
      console.log(`[ok] ${feed.source}: ${items.length} itens relevantes (de ${parseRss(xml, feed.source).length} no feed)`);
    } catch (err) {
      console.warn(`[erro] ${feed.source}: ${err.message}`);
    }
  }

  newsResults.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  const news = newsResults.slice(0, MAX_NEWS_ITEMS).map((item) => ({
    source: item.source,
    title: item.title,
    link: item.link,
    description: item.description.slice(0, 220),
    pubDate: item.pubDate,
  }));

  let videos = [];
  try {
    const xml = await fetchText(YOUTUBE_FEED);
    videos = parseAtom(xml).slice(0, MAX_VIDEO_ITEMS);
    console.log(`[ok] YouTube: ${videos.length} vídeos`);
  } catch (err) {
    console.warn(`[erro] YouTube: ${err.message}`);
  }

  const data = {
    updated_at: new Date().toISOString(),
    news,
    videos,
  };

  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`\nGravado em ${OUT_PATH}: ${news.length} notícias, ${videos.length} vídeos.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
