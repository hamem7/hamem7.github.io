// dev/gas-emulator.mjs
// ==========================================================================================
// Runs the REAL backend/Code.gs (unmodified) inside a Node `vm` sandbox with in-memory mocks
// of the Apps Script services it uses (SpreadsheetApp, PropertiesService, LockService,
// CacheService, ContentService, Utilities, Logger).
//
// PURPOSE: prove OUR backend logic (grading, idempotency, auth, persistence read-back,
// row-cap growth, formula/number-corruption safety). It is NOT Google. It cannot prove:
// Google's redirect/CORS behaviour, quotas, cold-start latency, or real Sheets behaviour.
// Those are proven only by dev/../diagnostics.html run against the real deployed /exec URL.
// ==========================================================================================
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CODE = path.join(__dirname, '..', 'backend', 'Code.gs');

class MockRange {
  constructor(sheet, r, c, nr, nc) { Object.assign(this, { sheet, r, c, nr, nc }); }
  _check() {
    if (this.r < 1 || this.c < 1 || this.r + this.nr - 1 > this.sheet.maxRows || this.c + this.nc - 1 > this.sheet.maxCols) {
      throw new Error('The coordinates of the range are outside the dimensions of the sheet.');
    }
  }
  getValues() {
    this._check();
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) {
        const v = (this.sheet.data[this.r - 1 + i] || [])[this.c - 1 + j];
        row.push(v === undefined ? '' : v);
      }
      out.push(row);
    }
    return out;
  }
  setValues(vals) {
    this._check();
    if (vals.length !== this.nr || vals.some(r => r.length !== this.nc)) throw new Error('The number of rows/columns in the data does not match the range.');
    for (let i = 0; i < this.nr; i++) {
      const rr = this.r - 1 + i;
      this.sheet.data[rr] = this.sheet.data[rr] || [];
      for (let j = 0; j < this.nc; j++) {
        let v = vals[i][j];
        const col = this.c + j;
        const isText = this.sheet.textCols.has(col) && this.sheet.textRows.has(this.r + i);
        // Emulate Sheets "typed input" interpretation when the cell is NOT plain-text formatted.
        if (!isText && typeof v === 'string') {
          if (/^=/.test(v)) v = '#FORMULA!';
          else if (/^-?\d+(\.\d+)?$/.test(v.trim())) v = Number(v);
        }
        this.sheet.data[rr][this.c - 1 + j] = v;
      }
    }
    return this;
  }
  setNumberFormat(fmt) {
    this._check();
    for (let i = 0; i < this.nr; i++) for (let j = 0; j < this.nc; j++) {
      // track per-cell text format as row x col
      if (fmt === '@') { this.sheet.textCols.add(this.c + j); this.sheet.textRows.add(this.r + i); }
    }
    return this;
  }
}

class MockSheet {
  constructor(name) { this.name = name; this.data = []; this.maxRows = 1000; this.maxCols = 26; this.textCols = new Set(); this.textRows = new Set(); }
  getMaxRows() { return this.maxRows; }
  getLastRow() { let last = 0; this.data.forEach((r, i) => { if (r && r.some(v => v !== '' && v !== undefined)) last = i + 1; }); return last; }
  getRange(r, c, nr = 1, nc = 1) { return new MockRange(this, r, c, nr, nc); }
  setFrozenRows() {}
  insertRowsAfter(after, n) { this.maxRows += n; }
}

class MockSpreadsheet {
  constructor() { this.sheets = {}; }
  getSheetByName(n) { return this.sheets[n] || null; }
  insertSheet(n) { return (this.sheets[n] = new MockSheet(n)); }
}

export function createBackend(opts = {}) {
  const code = fs.readFileSync(opts.codePath || process.env.CODE_GS || DEFAULT_CODE, 'utf8');
  const ss = opts.spreadsheet || new MockSpreadsheet();
  const props = opts.props || {};
  const cacheStore = new Map();
  const logs = [];
  let clockSkewMs = 0;
  const hooks = { beforeWriteFail: false, lockBusy: false };

  const sandbox = {
    console,
    Logger: { log: (m) => logs.push(String(m)) },
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss, flush: () => {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({ get: k => cacheStore.get(k) ?? null, put: (k, v) => { cacheStore.set(k, v); } }) },
    LockService: { getScriptLock: () => ({
      waitLock: () => { if (hooks.lockBusy) throw new Error('Could not obtain lock'); },
      releaseLock: () => {} }) },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (s) => ({ _c: s, setMimeType() { return this; }, getContent() { return this._c; } })
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      sleep: () => {},
      DigestAlgorithm: { MD5: 'MD5' },
      Charset: { UTF_8: 'UTF_8' },
      computeDigest: (alg, str) => Array.from(crypto.createHash('md5').update(str, 'utf8').digest()).map(b => (b > 127 ? b - 256 : b))
    },
    Date, JSON, Math, Object, Array, String, Number, Error, RegExp, parseInt, isNaN
  };
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox, { filename: 'Code.gs' });

  function unwrap(out) { return JSON.parse(out.getContent()); }
  return {
    ss, props, logs, hooks, sandbox,
    setup: () => sandbox.setup(),
    /** Simulates GET /exec?...  */
    get: (params) => unwrap(sandbox.doGet({ parameter: params })),
    /** Simulates POST /exec with text/plain JSON body */
    post: (body) => unwrap(sandbox.doPost({ postData: { contents: typeof body === 'string' ? body : JSON.stringify(body) } })),
    skewClock: (ms) => { clockSkewMs = ms; }
  };
}
