// tests/listen-play.e2e.mjs — لعبة «استمع للشيخ… ثم كمّل»: الإعداد ← أسئلة ← نتيجة ← مراجعة الأخطاء (الصوت وهمي: WAV صامت).
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node-tools/node_modules node tests/listen-play.e2e.mjs [outDir]
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
// WAV صامت 0.3 ثانية
const wav = (() => { const n = 2400, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40); return b; })();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 420, height: 860 } });
const audioUrls = [];
await ctx.route('**/*', r => { const u = new URL(r.request().url());
  if (u.hostname === 'everyayah.com') { audioUrls.push(u.pathname); return r.fulfill({ status: 200, contentType: 'audio/wav', body: wav }); }
  return u.hostname === 'localhost' ? r.continue() : r.abort(); });
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => { errs.push(e.message); console.log('   [pageerror]', e.message); }); page.on('dialog', d => d.dismiss().catch(() => {}));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0; const check = (n, c, d = '') => { c ? ok++ : bad++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(2500);
await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
check('بطاقة «استمع وكمّل» في الرئيسية', !!(await page.$('#btn-listen-main')));
await page.evaluate(async () => { const m = await import('/core/app.js'); const L = m.AppState.surahsData; await m.AppState.studentManager.addStudent({ name: 'طالب تجريبي', memoFrom: L.find(s => s.number === 114).name, memoTo: L.find(s => s.number === 105).name }); window.__APP = m; });
await page.click('#btn-listen-main');
await page.waitForSelector('#ls-start', { timeout: 20000 });
if (outDir) await page.screenshot({ path: path.join(outDir, 'listen-1-setup.png') });
await page.click('[data-stu]:not([data-stu=""])');
check('نطاق الطالب مفعّل ويعرض الحدود', /سورة/.test(await page.innerText('.ls-note')) && !(await page.$eval('[data-scope="student"]', b => b.disabled)));
await page.click('[data-mode="mixed"]'); await page.click('[data-count="5"]');
await page.click('#ls-start');
await page.waitForSelector('#ls-play', { timeout: 10000 });
await sleep(600);
check('الصوت يُطلب من everyayah بمجلد المنشاوي', audioUrls.some(p => /Minshawy_Murattal_128kbps\/\d{6}\.mp3$/.test(p)), audioUrls[0]);
const sNums = audioUrls[0].match(/(\d{3})(\d{3})\.mp3/); check('الآية المسموعة ضمن سور النطاق (105..114)', +sNums[1] >= 105 && +sNums[1] <= 114, sNums[1]);
if (outDir) await page.screenshot({ path: path.join(outDir, 'listen-2-question.png') });
check('عدّاد التقدم 1 / 5', (await page.innerText('#ls-progress')).includes('1 / 5'));
await page.click('#ls-hint'); await page.waitForSelector('.ls-hint', { timeout: 3000 }).catch(() => {}); check('التلميح يظهر', !!(await page.$('.ls-hint')));
for (let i = 0; i < 5; i++) {
  await page.waitForSelector('#ls-reveal', { timeout: 5000 });
  await page.click('#ls-reveal');
  await page.waitForSelector('.ls-answer-text', { timeout: 5000 });
  const ans = await page.innerText('.ls-answer-text');
  if (i === 0) { check('نص الإجابة بلا بسملة ولا فاصل نجمة', ans.length > 0 && !/بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ/.test(ans)); if (outDir) await page.screenshot({ path: path.join(outDir, 'listen-3-answer.png') }); }
  await page.click(i % 2 === 0 ? '#ls-yes' : '#ls-no');
}
await page.waitForSelector('.ls-score', { timeout: 5000 });
if (outDir) await page.screenshot({ path: path.join(outDir, 'listen-4-result.png') });
check('النتيجة 3 من 5', /3/.test(await page.innerText('.ls-score')) && /5/.test(await page.innerText('.ls-score')), await page.innerText('.ls-score'));
check('قائمة ما يحتاج مراجعة فيها آيتان', (await page.$$('.ls-missed li')).length === 2);
await page.click('#ls-retry'); await page.waitForSelector('#ls-play');
check('جولة المراجعة من سؤالين', (await page.innerText('#ls-progress')).includes('1 / 2'));
check('بلا أخطاء جافاسكربت', errs.length === 0, errs.join(' | '));
console.log(`${ok} PASS / ${bad} FAIL`); await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
