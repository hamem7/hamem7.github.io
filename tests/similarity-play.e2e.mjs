// tests/similarity-play.e2e.mjs — شاشة لعب ركن المتشابهات (جزء عمّ) بالأسئلة الأربعة.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node-tools/node_modules node tests/similar-in-games.e2e.mjs [outDir]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');
const outDir = process.argv[2] || null; if (outDir) fs.mkdirSync(outDir, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(REPO, p);
  if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
await new Promise(r => srv.on('listening', r)); const WEB = `http://localhost:${srv.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1180, height: 900 } });
await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort());
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => { errs.push(e.message); console.log('   [pageerror]', e.message); }); page.on('dialog', d => d.dismiss().catch(() => {}));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0; const check = (n, c, d = '') => { c ? ok++ : bad++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(2500);
await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());


const out = process.argv[2] || null;
await page.evaluate(async () => { const m = await import('/core/app.js'); window.__APP = m; });
await page.evaluate(() => window.__APP.openSimilarityGame({ type: 'juz', juzId: 'amma' }));
await page.waitForSelector('#simplay-container', { timeout: 20000 });
await page.waitForSelector('#simplay-guest', { timeout: 20000 });
await page.click('#simplay-guest');
await page.waitForSelector('.sim-play-option-btn', { timeout: 20000 });
const seen = [];
for (let i = 0; i < 18; i++) {
  await page.waitForSelector('.sim-play-option-btn:not([disabled])', { timeout: 10000 });
  const info = await page.evaluate(() => ({ q: document.querySelector('.sim-q-text').innerText, opts: [...document.querySelectorAll('.sim-play-option-btn')].map(b => b.innerText) }));
  seen.push(info);
  if (i === 0 && out) await page.screenshot({ path: path.join(out, 'play-1.png') });
  await page.click('.sim-play-option-btn');
  await sleep(1550);
  if (await page.$('#simplay-btn-again')) break;
}
check('شاشة اللعب تعرض نص السؤال الكامل مع 3–4 خيارات', seen.length > 0 && seen.every(s => s.q.length > 20 && s.opts.length >= 3 && s.opts.length <= 4));
check('لا رقم داخل نص السؤال أو الخيارات في شاشة اللعب', seen.every(s => !/[0-9\u0660-\u0669]/.test(s.q + s.opts.join(''))));
check('ظهرت شاشة النتيجة بعد الجولة', !!(await page.$('#simplay-btn-again')), 'عدد الأسئلة ' + seen.length);
console.log(seen.slice(0, 3).map(s => s.q.replace(/\n+/g, ' ⏎ ') + '\n   ' + s.opts.join(' | ')).join('\n'));
check('بلا أخطاء جافاسكربت', errs.length === 0, errs.join(' | '));
console.log(`${ok} PASS / ${bad} FAIL`); await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
