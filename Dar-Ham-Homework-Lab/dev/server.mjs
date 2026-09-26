// dev/server.mjs — local dev server: static Lab files + an Apps Script /exec EMULATOR.
//   node dev/server.mjs            -> Lab at http://localhost:8080  (API at http://localhost:8081/macros/s/DEV/exec)
//
// The emulator runs the real backend/Code.gs (see gas-emulator.mjs) and mimics the
// Apps Script HTTP shape: /exec answers 302 -> another ORIGIN (like script.googleusercontent.com)
// and both hops carry Access-Control-Allow-Origin:*. Bodies are text/plain (no preflight).
// It ALSO has a chaos switch so tests can break the network in specific ways.
//
// ⚠️ This is an emulator. Google may behave differently (latency, quotas, redirect quirks).
//    Only diagnostics.html against a real deployment can prove that.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createBackend } from './gas-emulator.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.md': 'text/plain; charset=utf-8' };

export function startDevServer({ webPort = 8080, apiPort = 8081, echoPort = 8082, latencyMs = 120, quiet = true } = {}) {
  const backend = createBackend();
  const teacherKey = backend.setup();
  const chaos = { mode: 'none', count: 0, ms: 0 };
  const echo = new Map();
  let counter = 0;
  const stats = { execRequests: 0, chaosHits: 0 };

  const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' };

  // ---------- static ----------
  const web = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let p = decodeURIComponent(u.pathname);
    if (p === '/') p = '/index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });

  // ---------- "script.google.com" ----------
  function takeChaos() {
    if (chaos.mode === 'none' || chaos.count === 0) return null;
    if (chaos.count > 0) chaos.count--;
    stats.chaosHits++;
    return chaos.mode;
  }
  function readBody(req) { return new Promise(r => { let b = ''; req.on('data', d => b += d); req.on('end', () => r(b)); }); }

  const api = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') { // real Apps Script cannot answer preflights -> emulate that faithfully
      res.writeHead(405, {}); return res.end();
    }
    if (u.pathname === '/__chaos') {
      const b = JSON.parse((await readBody(req)) || '{}');
      chaos.mode = b.mode || 'none'; chaos.count = b.count === undefined ? -1 : b.count; chaos.ms = b.ms || 0;
      res.writeHead(200, cors); return res.end(JSON.stringify({ ok: true, chaos }));
    }
    if (u.pathname === '/__state') {
      const rows = (name) => { const sh = backend.ss.getSheetByName(name); return sh ? sh.getLastRow() - 1 : 0; };
      res.writeHead(200, { ...cors, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ homeworks: rows('Homeworks'), submissions: rows('Submissions'), teacherKey, stats }));
    }
    if (!u.pathname.endsWith('/exec')) { res.writeHead(404, cors); return res.end('nope'); }

    stats.execRequests++;
    const c = takeChaos();
    const body = req.method === 'POST' ? await readBody(req) : '';
    if (c === 'down') return req.socket.destroy();                       // connection refused/reset
    if (c === 'http500') { res.writeHead(500, cors); return res.end('boom'); }
    if (c === 'slow') await new Promise(r => setTimeout(r, chaos.ms || 15000));
    await new Promise(r => setTimeout(r, latencyMs));

    let payload;
    if (c === 'html') {
      payload = { raw: '<!DOCTYPE html><html><body>Google Drive: Sorry, unable to open the file at this time.</body></html>', type: 'text/html' };
    } else {
      const out = req.method === 'POST' ? backend.post(body) : backend.get(Object.fromEntries(u.searchParams));
      payload = { raw: JSON.stringify(out), type: 'application/json' };
    }
    if (c === 'drop_response') return req.socket.destroy();               // WRITE HAPPENED, client never hears back
    const key = 'k' + (++counter);
    echo.set(key, payload);
    res.writeHead(302, { ...cors, Location: `http://localhost:${echoPort}/macros/echo?user_content_key=${key}` });
    res.end();
  });

  const echoSrv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const p = echo.get(u.searchParams.get('user_content_key'));
    if (!p) { res.writeHead(404, cors); return res.end('gone'); }
    res.writeHead(200, { ...cors, 'Content-Type': p.type + '; charset=utf-8' });
    res.end(p.raw);
  });

  return new Promise((resolve) => {
    let n = 0; const done = () => { if (++n === 3) resolve({
      backend, teacherKey, chaos, stats,
      webUrl: `http://localhost:${webPort}`, apiUrl: `http://localhost:${apiPort}/macros/s/DEV/exec`,
      setChaos: (mode, count = -1, ms = 0) => { chaos.mode = mode; chaos.count = count; chaos.ms = ms; },
      close: () => { web.close(); api.close(); echoSrv.close(); web.closeAllConnections?.(); api.closeAllConnections?.(); echoSrv.closeAllConnections?.(); }
    }); };
    web.listen(webPort, done); api.listen(apiPort, done); echoSrv.listen(echoPort, done);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = await startDevServer({ quiet: false });
  console.log(`\nDar Ham Homework Lab — LOCAL EMULATOR (not Google)\n  Lab:        ${s.webUrl}\n  API URL:    ${s.apiUrl}\n  Teacher key: ${s.teacherKey}\n`);
}
