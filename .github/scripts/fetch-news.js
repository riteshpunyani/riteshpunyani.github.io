/**
 * fetch-news.js
 *
 * Fetches Google News RSS for a fixed set of queries and writes a compact,
 * same-origin JSON file that news.html reads at page load. Replaces a live
 * client-side call to a third-party RSS->JSON proxy (api.rss2json.com),
 * which is an unauthenticated free service that can be bot-walled or rate
 * limited at any time without notice (it was, on 2026-10-30 - see commit
 * history / project memory for the diagnosis).
 *
 * Run by .github/workflows/update-news.yml on a schedule. Requires Node 18+
 * for global fetch. No external npm dependencies by design, so there is
 * nothing here that can break from an upstream package update.
 */

const fs = require('fs');
const path = require('path');

// Keys MUST match the data-q attributes on the .feed-tab buttons in news.html.
const QUERIES = [
  'fraud+investigation+compliance+ethics',
  'artificial+intelligence+enterprise+automation',
  'SEBI+RBI+corporate+governance+India',
  'data+privacy+GDPR+cybersecurity',
];

const GN_BASE = 'https://news.google.com/rss/search?hl=en-IN&gl=IN&ceid=IN%3Aen&q=';
const ITEMS_PER_FEED = 12;
const OUT_PATH = path.join(__dirname, '..', '..', 'assets', 'data', 'news.json');

function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(parseInt(n, 10)));
}

function tag(xmlItem, name) {
  const m = xmlItem.match(new RegExp('<' + name + '[^>]*>([\\s\\S]*?)</' + name + '>'));
  return m ? decodeEntities(m[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/, '$1').trim()) : '';
}

function sourceName(xmlItem) {
  const m = xmlItem.match(/<source[^>]*>([\s\S]*?)<\/source>/);
  return m ? decodeEntities(m[1].trim()) : 'Google News';
}

function parseItems(xml) {
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return blocks.slice(0, ITEMS_PER_FEED).map((block) => {
    const rawTitle = tag(block, 'title');
    return {
      title: rawTitle.replace(/ - [^-]+$/, ''), // strip trailing " - Source Name"
      link: tag(block, 'link'),
      pubDate: tag(block, 'pubDate'),
      source: sourceName(block),
    };
  });
}

async function fetchQuery(q) {
  const url = GN_BASE + q;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; riteshpunyani-news-bot/1.0)' } });
  if (!res.ok) {
    throw new Error(`Google News RSS returned HTTP ${res.status} for query "${q}"`);
  }
  const xml = await res.text();
  const items = parseItems(xml);
  if (!items.length) {
    throw new Error(`No items parsed for query "${q}" - feed format may have changed`);
  }
  return items;
}

async function main() {
  // Start from the existing file (if any) so a single failed query doesn't
  // wipe out previously-good data for the other feeds.
  let existing = { generatedAt: null, feeds: {} };
  if (fs.existsSync(OUT_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8'));
    } catch (e) {
      // Corrupt or missing - proceed with a clean object.
    }
  }

  const feeds = { ...existing.feeds };
  const errors = [];

  for (const q of QUERIES) {
    try {
      feeds[q] = await fetchQuery(q);
      console.log(`OK: ${q} (${feeds[q].length} items)`);
    } catch (err) {
      errors.push(err.message);
      console.error(`FAILED: ${err.message} - keeping previous data for this feed if any`);
    }
  }

  const out = { generatedAt: new Date().toISOString(), feeds };
  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
  console.log(`Wrote ${OUT_PATH}`);

  // Fail the workflow run only if every single feed failed (so a transient
  // Google-side hiccup on one query doesn't mark the whole run red while
  // still publishing good data for the rest).
  if (errors.length === QUERIES.length) {
    console.error('All feeds failed:', errors.join(' | '));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
