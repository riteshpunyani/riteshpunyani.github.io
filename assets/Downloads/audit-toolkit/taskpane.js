/* ================================================================
   Audit Toolkit - Task pane logic
   (c) Ritesh Punyani - riteshpunyani.github.io
   ================================================================ */
/* global Office, Excel, ATFuzzy */

let state = { listA: null, listB: null };

Office.onReady(() => {
  wireNav();
  wireHome();
  wireMatchWizard();
  wireSettings();
  renderHelp();
  showView(location.hash ? location.hash.slice(1) : 'home');
});

/* ---------------- routing / nav ---------------- */
function showView(name) {
  const names = ['home', 'match', 'settings', 'help'];
  if (names.indexOf(name) === -1) name = 'home';
  names.forEach((n) => { document.getElementById('view-' + n).hidden = n !== name; });
  document.querySelectorAll('.at-navbtn').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
  location.hash = name;
  setStatus('', '');
}

function wireNav() {
  document.querySelectorAll('.at-navbtn').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
}

function wireHome() {
  document.querySelectorAll('#view-home .at-btn[data-view]').forEach((b) => b.addEventListener('click', () => showView(b.dataset.view)));
}

function setStatus(msg, type) {
  const el = document.getElementById('at-status');
  if (!msg) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = msg;
  el.className = 'at-status' + (type ? ' ' + type : '');
}

/* ---------------- Match wizard ---------------- */
function wireMatchWizard() {
  document.querySelectorAll('#view-match .at-steps a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); goToStep(+a.dataset.step); }));
  document.getElementById('btn-next-1').addEventListener('click', () => goToStep(2));
  document.getElementById('btn-back-2').addEventListener('click', () => goToStep(1));
  document.getElementById('btn-next-2').addEventListener('click', () => goToStep(3));
  document.getElementById('btn-back-3').addEventListener('click', () => goToStep(2));

  document.getElementById('btn-pick-a').addEventListener('click', () => pickRange('A'));
  document.getElementById('btn-pick-b').addEventListener('click', () => pickRange('B'));
  document.getElementById('btn-sample-data').addEventListener('click', loadSampleData);

  document.getElementById('thr').addEventListener('input', (e) => { document.getElementById('thr-val').textContent = e.target.value; });
  document.getElementById('hi').addEventListener('input', (e) => { document.getElementById('hi-val').textContent = e.target.value; });

  document.getElementById('btn-run-match').addEventListener('click', runMatch);
  goToStep(1);
}

function goToStep(n) {
  [1, 2, 3].forEach((i) => { document.getElementById('match-step-' + i).hidden = i !== n; });
  document.querySelectorAll('#view-match .at-steps a').forEach((a) => a.classList.toggle('active', +a.dataset.step === n));
  if (n === 3) renderColumnMap();
}

async function pickRange(which) {
  try {
    await Excel.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      range.load(['address', 'values']);
      await context.sync();
      if (!range.values || range.values.length < 2) throw new Error('Select at least a header row and one data row before clicking this button.');
      storeList(which, range.address, range.values);
    });
  } catch (err) {
    setStatus('Could not read the selection: ' + describeError(err), 'bad');
  }
}

function storeList(which, address, values) {
  state['list' + which] = { address, values, headers: values[0].map(String) };
  document.getElementById('pick-' + which.toLowerCase() + '-result').textContent = 'List ' + which + ' set: ' + address + ' (' + (values.length - 1) + ' rows, ' + values[0].length + ' columns)';
  document.getElementById('pick-' + which.toLowerCase() + '-result').className = 'at-result ok';
}

async function loadSampleData() {
  try {
    await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load('items/name');
      await context.sync();
      const existingNames = sheets.items.map((s) => s.name);

      const sampleA = [
        ['Name', 'Country'],
        ['Orion Global Trading LLC', 'UAE'],
        ['Rajesh Kumar Malhotra', 'India'],
        ['Chen Wei Holdings', 'China'],
        ['Fatima Benali', 'France'],
        ['Totally Unrelated Co', 'UK'],
      ];
      const sampleB = [
        ['Name', 'Country'],
        ['ORION GLOBAL TRADING L.L.C.', 'UAE'],
        ['Mr. R.K. Malhotra', 'India'],
        ['Chen Wei Holdings Ltd', 'Hong Kong'],
        ['Fatma Benaly', 'Morocco'],
        ['Nordic Arms Brokerage AB', 'Sweden'],
      ];

      const nameA = uniqueSheetName(existingNames, 'AT Sample List A');
      const nameB = uniqueSheetName(existingNames.concat([nameA]), 'AT Sample List B');
      const shA = sheets.add(nameA);
      const shB = sheets.add(nameB);
      shA.getRangeByIndexes(0, 0, sampleA.length, 2).values = sampleA;
      shB.getRangeByIndexes(0, 0, sampleB.length, 2).values = sampleB;
      shA.activate();
      await context.sync();

      storeList('A', nameA + '!A1:B' + sampleA.length, sampleA);
      storeList('B', nameB + '!A1:B' + sampleB.length, sampleB);
    });
    setStatus('Sample data loaded into two new sheets and set as List A / List B. Go to step 3 and click Run Match.', 'ok');
  } catch (err) {
    setStatus('Could not load sample data: ' + describeError(err), 'bad');
  }
}

function uniqueSheetName(existing, base) {
  if (existing.indexOf(base) === -1) return base;
  let i = 2;
  while (existing.indexOf(base + ' (' + i + ')') !== -1) i++;
  return base + ' (' + i + ')';
}

function guessColumn(headers, patterns) {
  const low = headers.map((h) => String(h).toLowerCase());
  for (const pat of patterns) {
    const idx = low.findIndex((h) => h.indexOf(pat) !== -1);
    if (idx !== -1) return idx;
  }
  return -1;
}

function renderColumnMap() {
  const host = document.getElementById('map-fields');
  host.innerHTML = '';
  if (!state.listA || !state.listB) { host.textContent = 'Pick List A and List B first (steps 1 and 2).'; return; }
  host.appendChild(buildMapSelect('mapNameA', 'Name column in List A', state.listA.headers, guessColumn(state.listA.headers, ['name'])));
  host.appendChild(buildMapSelect('mapNameB', 'Name column in List B', state.listB.headers, guessColumn(state.listB.headers, ['name'])));
  host.appendChild(buildMapSelect('mapIdA', 'ID / PAN / bank / phone column in List A (optional)', state.listA.headers, guessColumn(state.listA.headers, ['pan', 'tax id', 'bank', 'phone', 'id']), true));
  host.appendChild(buildMapSelect('mapIdB', 'ID / PAN / bank / phone column in List B (optional)', state.listB.headers, guessColumn(state.listB.headers, ['pan', 'tax id', 'bank', 'phone', 'id']), true));
}

function buildMapSelect(id, label, headers, preselect, optional) {
  const wrap = document.createElement('label');
  wrap.className = 'at-field';
  wrap.textContent = label;
  const sel = document.createElement('select');
  sel.id = id;
  sel.style.display = 'block';
  sel.style.width = '100%';
  sel.style.marginTop = '4px';
  if (optional) { const o = document.createElement('option'); o.value = '-1'; o.textContent = '(none)'; sel.appendChild(o); }
  headers.forEach((h, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = h; sel.appendChild(o); });
  sel.value = String(preselect === -1 && !optional ? 0 : preselect);
  wrap.appendChild(document.createElement('br'));
  wrap.appendChild(sel);
  return wrap;
}

function rowsToObjects(values, nameIdx, idIdx) {
  const out = [];
  for (let r = 1; r < values.length; r++) {
    const row = values[r];
    out.push({ name: row[nameIdx] == null ? '' : String(row[nameIdx]), id: idIdx >= 0 && row[idIdx] != null ? String(row[idIdx]) : '', _row: r + 1 });
  }
  return out;
}

async function runMatch() {
  const resultEl = document.getElementById('match-run-result');
  resultEl.textContent = '';
  if (!state.listA || !state.listB) { setStatus('Pick List A and List B first.', 'bad'); return; }
  const nameA = +document.getElementById('mapNameA').value;
  const nameB = +document.getElementById('mapNameB').value;
  const idA = +document.getElementById('mapIdA').value;
  const idB = +document.getElementById('mapIdB').value;
  const thr = +document.getElementById('thr').value;
  const hi = +document.getElementById('hi').value;
  const ignoreLegal = document.getElementById('ignoreLegal').checked;
  const maxPer = +document.getElementById('maxPer').value;

  if (hi < thr) { setStatus('"Strong match from" must be at least the match sensitivity threshold.', 'bad'); return; }

  setStatus('Matching ' + (state.listA.values.length - 1) + ' vs ' + (state.listB.values.length - 1) + ' names - this runs locally, nothing is uploaded...', '');

  try {
    const A = rowsToObjects(state.listA.values, nameA, idA);
    const B = rowsToObjects(state.listB.values, nameB, idB);
    const results = ATFuzzy.batchMatch(A, B, { threshold: thr, strongFrom: hi, ignoreLegalWords: ignoreLegal, maxPerA: maxPer });

    await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load('items/name');
      await context.sync();
      const existing = sheets.items.map((s) => s.name);
      const sheetName = uniqueSheetName(existing, 'AT Match Results');
      const sh = sheets.add(sheetName);

      const header = ['Score', 'Strength', 'List A row', 'List A name', 'List B row', 'List B name', 'Why', 'Corroboration', 'Decision (True / False positive)', 'Reviewed by'];
      const rows = results.map((r) => [
        r.score, r.strong ? 'Strong' : 'Possible', A[r.aIndex]._row, r.aName, B[r.bIndex]._row, r.bName, r.reason, r.corroboration.join('; '), '', '',
      ]);
      const data = [header].concat(rows.length ? rows : []);
      const range = sh.getRangeByIndexes(0, 0, data.length, header.length);
      range.values = data;
      range.format.autofitColumns();
      sh.getRange('A1:J1').format.font.bold = true;
      sh.getRange('A1:J1').format.fill.color = '#1f2a44';
      sh.getRange('A1:J1').format.font.color = '#ffffff';
      sh.activate();
      await context.sync();
    });

    if (results.length) {
      setStatus(results.length + ' possible match(es) written to a new sheet. Record your decision in the last two columns.', 'ok');
    } else {
      setStatus('No matches found at this threshold. Try lowering the match sensitivity, or confirm the right columns were mapped.', '');
    }
  } catch (err) {
    setStatus('The match could not be run: ' + describeError(err), 'bad');
  }
}

/* ---------------- Settings ---------------- */
function wireSettings() {
  document.getElementById('btn-insert-settings').addEventListener('click', insertSettingsSheet);
}

async function insertSettingsSheet() {
  const resultEl = document.getElementById('settings-result');
  try {
    await Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load('items/name');
      await context.sync();
      if (sheets.items.some((s) => s.name === 'AT Settings')) {
        context.workbook.worksheets.getItem('AT Settings').activate();
        await context.sync();
        resultEl.textContent = 'AT Settings already exists - opened it.';
        resultEl.className = 'at-result ok';
        return;
      }
      const sh = sheets.add('AT Settings');

      writeTable(sh, 'A1', ['Table 1: Keyword list'], [['cash'], ['personal'], ['adjustment'], ['write-off'], ['advance'], ['urgent']], ['Keyword']);
      writeTable(sh, 'D1', ['Table 2: Lookalike-character map'], [['O', '0'], ['I', '1'], ['l', '1'], ['S', '5'], ['B', '8'], ['Z', '2']], ['From', 'To']);
      writeTable(sh, 'G1', ['Table 3: Legal-suffix ignore list (company names)'], [['Pvt'], ['Private'], ['Ltd'], ['Limited'], ['LLP'], ['LLC'], ['Inc'], ['GmbH'], ['Trading'], ['Group']], ['Suffix']);

      sh.activate();
      await context.sync();
      resultEl.textContent = 'AT Settings sheet inserted.';
      resultEl.className = 'at-result ok';
    });
  } catch (err) {
    resultEl.textContent = 'Could not insert the Settings sheet: ' + describeError(err);
    resultEl.className = 'at-result bad';
  }
}

function writeTable(sheet, topLeft, titleRow, rows, headerRow) {
  const col = topLeft.replace(/\d+/, '');
  const startRow = +topLeft.replace(/\D+/, '');
  sheet.getRange(col + startRow).values = [titleRow];
  sheet.getRange(col + startRow).format.font.bold = true;
  const headerAddr = col + (startRow + 1) + ':' + colOffset(col, headerRow.length - 1) + (startRow + 1);
  sheet.getRange(headerAddr).values = [headerRow];
  sheet.getRange(headerAddr).format.font.bold = true;
  sheet.getRange(headerAddr).format.fill.color = '#1f2a44';
  sheet.getRange(headerAddr).format.font.color = '#ffffff';
  const dataAddr = col + (startRow + 2) + ':' + colOffset(col, headerRow.length - 1) + (startRow + 1 + rows.length);
  if (rows.length) sheet.getRange(dataAddr).values = rows;
}

function colOffset(col, n) {
  let code = col.charCodeAt(0) - 65 + n;
  return String.fromCharCode(65 + code);
}

/* ---------------- Help ---------------- */
const FUNCTION_DOCS = [
  { sig: '=AT.FUZZYSCORE(text1, text2)', desc: 'Similarity between two names, 0 to 1.', ex: '=AT.FUZZYSCORE(A2,"Orion Global Trading LLC")' },
  { sig: '=AT.FUZZYLOOKUP(value, lookupRange, [threshold])', desc: 'Best fuzzy match for a value in a list. Spills value, score, reason.', ex: '=AT.FUZZYLOOKUP(A2, Vendors!B2:B500, 0.8)' },
  { sig: '=AT.DIGITSONLY(text)', desc: 'Keeps only the digits in a piece of text.', ex: '=AT.DIGITSONLY("ah256gh67")  ->  25667' },
  { sig: '=AT.LETTERSONLY(text, [keepSet])', desc: 'Keeps only letters, or only a custom character set.', ex: '=AT.LETTERSONLY(A2,"aeiouAEIOU")' },
  { sig: "=AT.NORMALISECHARS(text, [mapRange])", desc: 'Replaces lookalike characters (O/0, I/l/1, S/5, B/8, Z/2) before comparing IDs.', ex: '=AT.NORMALISECHARS(A2)' },
  { sig: '=AT.PARSENAME(text)', desc: 'Splits a name into First / Middle / Last (spills 3 cells).', ex: '=AT.PARSENAME("Dr. Rahul Kr Sharma Verma")' },
  { sig: '=AT.BETWEEN(text, startDelimiter, endDelimiter, [occurrence])', desc: 'Text between a start marker and the end marker that follows it.', ex: '=AT.BETWEEN(A2,"-",":")' },
  { sig: '=AT.KEYWORDFLAG(text, [keywordRange])', desc: 'Which red-flag keyword was found in the text, or blank.', ex: '=AT.KEYWORDFLAG(A2)' },
  { sig: '=AT.SMARTDATE(text)', desc: 'Parses a date written in several common formats into a real Excel date.', ex: '=AT.SMARTDATE("15 June 2026")' },
];

function renderHelp() {
  const host = document.getElementById('help-list');
  host.innerHTML = '';
  FUNCTION_DOCS.forEach((f) => {
    const div = document.createElement('div');
    div.className = 'at-helpitem';
    div.innerHTML = '<code class="sig">' + f.sig + '</code><div>' + f.desc + '</div><div class="ex">Example: ' + f.ex + '</div>';
    host.appendChild(div);
  });
  const note = document.createElement('p');
  note.className = 'at-note';
  note.textContent = 'The Fuzzy Match wizard (Home tab) handles whole-list matching; these functions are for one-off use inside your own workpaper layout.';
  host.appendChild(note);
}

function describeError(err) {
  if (err && err.message) return err.message;
  return String(err);
}
