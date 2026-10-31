/* ================================================================
   Audit Toolkit - Fuzzy Match engine
   (c) Ritesh Punyani - riteshpunyani.github.io
   Ported, not rewritten, from the matching engine proven in
   Watchlist Name Screener / RPT Screener / Ghost Employee Checker
   (Products/_src/tools/watchlist/tool.js + core/util.js).
   Works unchanged in Node (tests) and in the browser (Office.js runtime).
   ================================================================ */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ATFuzzy = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- small string helpers (from core/util.js) ---------- */
  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function fold(s) { return str(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function words(s) { return fold(s).replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean); }

  function jaroWinkler(a, b) {
    if (a === b) return 1;
    const la = a.length, lb = b.length;
    if (!la || !lb) return 0;
    const range = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
    const am = new Uint8Array(la), bm = new Uint8Array(lb);
    let m = 0;
    for (let i = 0; i < la; i++) {
      const lo = Math.max(0, i - range), hi = Math.min(lb - 1, i + range);
      for (let j = lo; j <= hi; j++) if (!bm[j] && a[i] === b[j]) { am[i] = bm[j] = 1; m++; break; }
    }
    if (!m) return 0;
    let t = 0, k = 0;
    for (let i = 0; i < la; i++) if (am[i]) { while (!bm[k]) k++; if (a[i] !== b[k]) t++; k++; }
    const j = (m / la + m / lb + (m - t / 2) / m) / 3;
    let p = 0; while (p < 4 && p < la && p < lb && a[p] === b[p]) p++;
    return j + p * 0.1 * (1 - j);
  }

  /* ---------- name normalisation (from watchlist/tool.js) ---------- */
  const LEGAL = new Set(('pvt private ltd limited llp llc inc incorporated corp corporation co company plc gmbh ag sa sas srl bv nv oy ab as spa pte pty kk ' +
    'fze fzc fzco wll est establishment trading traders enterprises enterprise industries international intl group holdings holding the and of ' +
    'opc sdn bhd jsc ooo zao pjsc oao tbk').split(' '));
  const TITLES = new Set('mr mrs ms miss dr prof shri smt sri kumari km sir dame lord lady sheikh shaikh haji hajji alhaji md mohd mohammed'.split(' ').filter((w) => !['mohammed', 'md', 'mohd'].includes(w)));

  function phon(w) {
    let s = w;
    s = s.replace(/ph/g, 'f').replace(/ck/g, 'k').replace(/q/g, 'k').replace(/x/g, 'ks').replace(/z/g, 's').replace(/w/g, 'v').replace(/y/g, 'i').replace(/c(?=[eiy])/g, 's').replace(/c/g, 'k');
    s = s.replace(/dh/g, 'd').replace(/th/g, 't').replace(/kh/g, 'k').replace(/gh/g, 'g').replace(/sh/g, 's').replace(/ch/g, 's').replace(/bh/g, 'b').replace(/jh/g, 'j').replace(/h(?![aeiou])/g, '');
    s = s.replace(/(.)\1+/g, '$1');
    s = s[0] + s.slice(1).replace(/[aeiou]/g, '');
    return s;
  }

  function prep(raw, dropLegal) {
    let toks = words(raw);
    toks = toks.filter((t) => !TITLES.has(t));
    let core = dropLegal ? toks.filter((t) => !LEGAL.has(t)) : toks;
    if (!core.length) core = toks;
    const joined = core.join(' ');
    return { raw: str(raw).trim(), toks: core, joined, flat: core.join(''), sorted: core.slice().sort().join(' '), ph: core.map(phon), init: core.map((t) => t[0]).join('') };
  }

  /* similarity 0-100 with a short reason */
  function score(a, b) {
    if (!a.flat || !b.flat) return [0, ''];
    if (a.joined === b.joined) return [100, 'Exact match'];
    if (a.flat === b.flat) return [99, 'Same letters, different spacing'];
    if (a.sorted === b.sorted) return [97, 'Same words, different order'];
    const tsim = (t, u) => {
      if (t.length === 1 || u.length === 1) return t[0] === u[0] ? 0.85 : 0;
      let v = jaroWinkler(t, u);
      if (v < 0.92 && phon(t) === phon(u)) v = 0.92;
      return v >= 0.85 ? v : 0;
    };
    const pairs = [];
    for (let i = 0; i < a.toks.length; i++) for (let j = 0; j < b.toks.length; j++) { const v = tsim(a.toks[i], b.toks[j]); if (v > 0) pairs.push([v, i, j]); }
    pairs.sort((p, q) => q[0] - p[0]);
    const ua = new Set(), ub = new Set(); let sum = 0;
    for (const [v, i, j] of pairs) { if (ua.has(i) || ub.has(j)) continue; ua.add(i); ub.add(j); sum += v; }
    const na = a.toks.length, nb = b.toks.length;
    const dice = (2 * sum) / (na + nb);
    const contain = Math.min(na, nb) >= 2 ? (sum / Math.min(na, nb)) * 0.9 : 0;
    const jw = jaroWinkler(a.flat, b.flat);
    const phonEq = a.ph.slice().sort().join(' ') === b.ph.slice().sort().join(' ');
    let s = dice, why = 'Similar words';
    if (contain > s) { s = contain; why = 'Name contained in longer name'; }
    if (jw * 0.95 > s && Math.abs(a.flat.length - b.flat.length) <= 3) { s = jw * 0.95; why = 'Similar spelling'; }
    if (phonEq && s < 0.93) { s = 0.93; why = 'Sounds alike (transliteration)'; }
    return [Math.round(s * 100), why];
  }

  /* ---------- public, higher-level helpers for the add-in ---------- */

  /** Similarity score (0-1) between two strings, ignoring case/accents/punctuation. */
  function fuzzyScore(text1, text2, opts) {
    opts = opts || {};
    const a = prep(text1, opts.ignoreLegalWords !== false);
    const b = prep(text2, opts.ignoreLegalWords !== false);
    const [sc] = score(a, b);
    return sc / 100;
  }

  /**
   * Best match for `value` inside `list` (an array of strings).
   * Returns { value, score, reason, index } or null if nothing scores >= threshold.
   */
  function fuzzyLookup(value, list, threshold, opts) {
    opts = opts || {};
    threshold = threshold == null ? 0.7 : threshold;
    const a = prep(value, opts.ignoreLegalWords !== false);
    let best = null;
    for (let i = 0; i < list.length; i++) {
      const cand = str(list[i]);
      if (!cand) continue;
      const b = prep(cand, opts.ignoreLegalWords !== false);
      const [sc, why] = score(a, b);
      if (sc / 100 >= threshold && (!best || sc > best.score * 100)) {
        best = { value: cand, score: sc / 100, reason: why, index: i };
      }
    }
    return best;
  }

  /**
   * Batch match List A against List B (arrays of { name, id, ...extra }).
   * extra fields `pan`/`bank`/`phone` on either side, when both present and
   * equal, boost the score and are reported as corroboration.
   * Returns an array of { aIndex, bIndex, aName, bName, score, reason, corroboration[] }
   * sorted by score, limited to `maxPerA` results per List A row.
   */
  function batchMatch(listA, listB, options) {
    const opts = Object.assign({ threshold: 70, strongFrom: 90, ignoreLegalWords: true, maxPerA: 10 }, options || {});
    const prepped = (arr) => arr.map((r) => ({ r, p: prep(r.name, opts.ignoreLegalWords) }));
    const A = prepped(listA), B = prepped(listB);
    const results = [];
    for (let i = 0; i < A.length; i++) {
      const a = A[i];
      if (!a.p.flat) continue;
      const matches = [];
      for (let j = 0; j < B.length; j++) {
        const b = B[j];
        if (!b.p.flat) continue;
        let [sc, why] = score(a.p, b.p);
        if (sc < opts.threshold - 15) continue;
        const corroboration = [];
        for (const field of ['pan', 'bank', 'phone', 'id']) {
          const av = a.r[field], bv = b.r[field];
          if (av && bv) {
            if (str(av).trim().toLowerCase() === str(bv).trim().toLowerCase()) { sc = Math.max(sc, 99); corroboration.push(field.toUpperCase() + ' matches'); }
            else corroboration.push(field.toUpperCase() + ' differs');
          }
        }
        if (sc < opts.threshold) continue;
        matches.push({ bIndex: j, bName: b.r.name, score: sc, reason: why, corroboration });
      }
      matches.sort((x, y) => y.score - x.score);
      for (const m of matches.slice(0, opts.maxPerA)) {
        results.push({ aIndex: i, aName: a.r.name, bIndex: m.bIndex, bName: m.bName, score: m.score, strong: m.score >= opts.strongFrom, reason: m.reason, corroboration: m.corroboration });
      }
    }
    results.sort((x, y) => y.score - x.score);
    return results;
  }

  return { str, fold, words, jaroWinkler, phon, prep, score, fuzzyScore, fuzzyLookup, batchMatch };
});
