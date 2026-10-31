/* ================================================================
   Audit Toolkit - Workpaper functions (text cleanup, parsing, flagging, dates)
   (c) Ritesh Punyani - riteshpunyani.github.io
   Pure functions, no Office.js dependency - usable in Node tests and
   in the browser (custom-functions runtime wraps these).
   ================================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ATWorkpaper = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function str(v) { return v === null || v === undefined ? '' : String(v); }

  /** Keep only digit characters. */
  function digitsOnly(text) {
    return str(text).split('').filter((c) => c >= '0' && c <= '9').join('');
  }

  /** Keep only letter characters (a-z, A-Z) by default, or any character in `keepSet` if supplied. */
  function lettersOnly(text, keepSet) {
    const t = str(text);
    if (keepSet) {
      const set = new Set(str(keepSet).split(''));
      return t.split('').filter((c) => set.has(c)).join('');
    }
    return t.split('').filter((c) => /[a-zA-Z]/.test(c)).join('');
  }

  const DEFAULT_CHARMAP = { O: '0', I: '1', l: '1', S: '5', B: '8', Z: '2' };

  /**
   * Replace lookalike characters using a map (default: O->0, I->1, l->1, S->5, B->8, Z->2).
   * `map` may be a plain object {from:to}, or an array of [from,to] pairs
   * (the shape a 2-column Excel range comes in as).
   */
  function normaliseChars(text, map) {
    let m = DEFAULT_CHARMAP;
    if (Array.isArray(map)) {
      m = {};
      for (const row of map) {
        if (!row) continue;
        const from = Array.isArray(row) ? row[0] : row.from;
        const to = Array.isArray(row) ? row[1] : row.to;
        if (from != null && to != null && str(from) !== '') m[str(from)] = str(to);
      }
    } else if (map && typeof map === 'object') {
      m = map;
    }
    return str(text).split('').map((c) => (m.hasOwnProperty(c) ? m[c] : c)).join('');
  }

  const TITLES = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'shri', 'smt', 'sri', 'sir', 'dame']);
  const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv']);

  /**
   * Split a full name into { first, middle, last }, handling titles, suffixes,
   * and any number of middle names (not just a fixed two-slot split).
   */
  function parseName(text) {
    let toks = str(text).trim().split(/\s+/).filter(Boolean);
    toks = toks.filter((t) => !TITLES.has(t.toLowerCase().replace(/\.$/, '')));
    let suffix = '';
    if (toks.length > 1 && SUFFIXES.has(toks[toks.length - 1].toLowerCase().replace(/\.$/, ''))) {
      suffix = toks.pop();
    }
    if (!toks.length) return { first: '', middle: '', last: '', suffix };
    if (toks.length === 1) return { first: toks[0], middle: '', last: '', suffix };
    const first = toks[0];
    const last = toks[toks.length - 1];
    const middle = toks.slice(1, -1).join(' ');
    return { first, middle, last, suffix };
  }

  /** Text between the `occurrence`-th startDelimiter and the endDelimiter that follows it. */
  function between(text, startDelimiter, endDelimiter, occurrence) {
    const t = str(text);
    occurrence = occurrence || 1;
    let from = -1;
    for (let i = 0; i < occurrence; i++) {
      from = t.indexOf(startDelimiter, from + 1);
      if (from === -1) return '';
    }
    const start = from + startDelimiter.length;
    const end = t.indexOf(endDelimiter, start);
    if (end === -1) return '';
    return t.slice(start, end).trim();
  }

  const DEFAULT_KEYWORDS = ['cash', 'personal', 'adjustment', 'write-off', 'advance', 'urgent'];

  /** First keyword from `keywords` (default: a standard red-flag list) found in `text`, or '' if none. Case-insensitive. */
  function keywordFlag(text, keywords) {
    const t = str(text).toLowerCase();
    const list = (keywords && keywords.length ? flatten(keywords) : DEFAULT_KEYWORDS).map(str).filter(Boolean);
    for (const kw of list) {
      if (t.indexOf(kw.toLowerCase()) !== -1) return kw;
    }
    return '';
  }

  function flatten(range) {
    const out = [];
    (function walk(x) { if (Array.isArray(x)) x.forEach(walk); else if (x != null && x !== '') out.push(x); })(range);
    return out;
  }

  const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12 };

  /**
   * Parse a date string in one of several common formats (DD/MM/YYYY, YYYY-MM-DD,
   * "15 June 2026", "June 15, 2026", DD-Mon-YY...) into a JS Date, or returns
   * null if the string genuinely could not be read - never guesses silently.
   */
  function smartDate(text) {
    const t = str(text).trim();
    if (!t) return null;

    // YYYY-MM-DD or YYYY/MM/DD
    let m = t.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (m) return mkDate(+m[1], +m[2], +m[3]);

    // DD/MM/YYYY or DD-MM-YYYY (day-first, matches the Indian/British convention used throughout this toolkit)
    m = t.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (m) {
      let [, d, mo, y] = m;
      y = y.length === 2 ? (+y > 50 ? '19' + y : '20' + y) : y;
      return mkDate(+y, +mo, +d);
    }

    // "15 June 2026" / "15-Jun-26" / "15 Jun 2026"
    m = t.match(/^(\d{1,2})[\s-]+([A-Za-z]{3,9})[\s-]+(\d{2,4})$/);
    if (m) {
      const mo = MONTHS[m[2].slice(0, 3).toLowerCase()];
      if (mo) { let y = m[3]; y = y.length === 2 ? (+y > 50 ? '19' + y : '20' + y) : y; return mkDate(+y, mo, +m[1]); }
    }

    // "June 15, 2026" / "June 15 2026"
    m = t.match(/^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/);
    if (m) {
      const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
      if (mo) return mkDate(+m[3], mo, +m[2]);
    }

    // last resort: let the JS engine try, but only accept it if it round-trips sensibly
    const d = new Date(t);
    if (!isNaN(d.getTime()) && d.getFullYear() > 1900 && d.getFullYear() < 2200) return d;

    return null;
  }

  function mkDate(y, mo, d) {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(y, mo - 1, d);
    // reject e.g. 31 Feb silently rolling over to March
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
    return dt;
  }

  /** Convert a JS Date between US Eastern time and IST, correctly across the US DST changeover (post-2007 rule). */
  function tzConvertEasternToIST(date) {
    const y = date.getFullYear();
    const sundayOnOrAfter = (d) => { const wd = d.getDay(); const add = (7 - wd) % 7; const r = new Date(d); r.setDate(d.getDate() + add); return r; };
    const dstStart = new Date(sundayOnOrAfter(new Date(y, 2, 1)).getTime()); dstStart.setDate(dstStart.getDate() + 7);
    const dstEnd = sundayOnOrAfter(new Date(y, 10, 1));
    const isDst = date >= dstStart && date < dstEnd;
    const hours = isDst ? 9.5 : 10.5;
    return new Date(date.getTime() + hours * 3600 * 1000);
  }

  return { digitsOnly, lettersOnly, normaliseChars, parseName, between, keywordFlag, smartDate, tzConvertEasternToIST, DEFAULT_CHARMAP, DEFAULT_KEYWORDS };
});
