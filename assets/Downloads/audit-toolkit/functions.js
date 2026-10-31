/* ================================================================
   Audit Toolkit - Custom Functions registration (=AT.___())
   (c) Ritesh Punyani - riteshpunyani.github.io
   Every function here is a thin wrapper around the pure logic in
   core/fuzzy.js and core/workpaper.js, so the same code that is
   unit-tested in Node (tests/run.js) is what runs inside Excel.
   ================================================================ */
/* global ATFuzzy, ATWorkpaper, CustomFunctions */

function flattenRange(range) {
  const out = [];
  (function walk(x) { if (Array.isArray(x)) x.forEach(walk); else if (x !== '' && x != null) out.push(x); })(range);
  return out;
}

/**
 * Similarity (0-1) between two names/strings.
 * @customfunction FUZZYSCORE
 */
function FUZZYSCORE(text1, text2) {
  return ATFuzzy.fuzzyScore(String(text1 == null ? '' : text1), String(text2 == null ? '' : text2));
}

/**
 * Best fuzzy match for a value inside a range. Spills [value, score, reason].
 * @customfunction FUZZYLOOKUP
 */
function FUZZYLOOKUP(value, lookupRange, threshold) {
  const list = flattenRange(lookupRange).map(String);
  const hit = ATFuzzy.fuzzyLookup(String(value == null ? '' : value), list, threshold == null ? 0.7 : Number(threshold));
  if (!hit) return [['', '', 'No match at or above threshold']];
  return [[hit.value, hit.score, hit.reason]];
}

/** Keeps only digit characters.
 * @customfunction DIGITSONLY
 */
function DIGITSONLY(text) {
  return ATWorkpaper.digitsOnly(text);
}

/** Keeps only letters (or a custom character set).
 * @customfunction LETTERSONLY
 */
function LETTERSONLY(text, keepSet) {
  return ATWorkpaper.lettersOnly(text, keepSet);
}

/** Normalises lookalike characters (O/0, I/l/1, S/5, B/8, Z/2, or your own map).
 * @customfunction NORMALISECHARS
 */
function NORMALISECHARS(text, mapRange) {
  return ATWorkpaper.normaliseChars(text, mapRange == null ? undefined : mapRange);
}

/** Splits a name into First / Middle / Last.
 * @customfunction PARSENAME
 */
function PARSENAME(text) {
  const n = ATWorkpaper.parseName(text);
  return [[n.first, n.middle, n.last]];
}

/** Text between a start marker and the end marker that follows it.
 * @customfunction BETWEEN
 */
function BETWEEN(text, startDelimiter, endDelimiter, occurrence) {
  return ATWorkpaper.between(text, startDelimiter, endDelimiter, occurrence == null ? 1 : Number(occurrence));
}

/** Which red-flag keyword matched, or blank.
 * @customfunction KEYWORDFLAG
 */
function KEYWORDFLAG(text, keywordRange) {
  const list = keywordRange == null ? undefined : flattenRange(keywordRange);
  return ATWorkpaper.keywordFlag(text, list);
}

/** Parses a date in several common formats; blank if it genuinely cannot be read.
 * @customfunction SMARTDATE
 */
function SMARTDATE(text) {
  const d = ATWorkpaper.smartDate(text);
  return d === null ? '' : d;
}

CustomFunctions.associate('FUZZYSCORE', FUZZYSCORE);
CustomFunctions.associate('FUZZYLOOKUP', FUZZYLOOKUP);
CustomFunctions.associate('DIGITSONLY', DIGITSONLY);
CustomFunctions.associate('LETTERSONLY', LETTERSONLY);
CustomFunctions.associate('NORMALISECHARS', NORMALISECHARS);
CustomFunctions.associate('PARSENAME', PARSENAME);
CustomFunctions.associate('BETWEEN', BETWEEN);
CustomFunctions.associate('KEYWORDFLAG', KEYWORDFLAG);
CustomFunctions.associate('SMARTDATE', SMARTDATE);
