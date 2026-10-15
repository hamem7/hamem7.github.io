// tests/dual-test-generator.e2e.mjs — توليد أسئلة الاختبارات الثنائية تلقائياً بميزان واحد (واجهة المعلم).
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node-tools/node_modules node tests/dual-test-generator.e2e.mjs [outDir]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');
const outDir = process.argv[2] || null; if (outDir) fs.mkdirSync(outDir, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(REPO, p);
  if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
await new Promise(r => srv.on('listening', r)); const WEB = `http://localhost:${srv.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0; const check = (n, c, d = '') => { c ? ok++ : bad++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };

for (const vp of [{ name: 'desktop', width: 1180, height: 900 }, { name: 'mobile', width: 390, height: 800 }]) {
  console.log(`\n=== ${vp.name} ===`);
  const ctx = await browser.newContext({ locale: 'ar', viewport: { width: vp.width, height: vp.height } });
  await ctx.route('**/*', r => new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort());
  await ctx.addInitScript(() => { try { localStorage.setItem('dh_seen_tours', JSON.stringify({ home: true, install: true, dual: true, general: true, students: true, kids: true, adult: true, homework: true, homework_prep: true })); } catch (e) {} });
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => { errs.push(e.message); console.log('   [pageerror]', e.message); });
  page.on('console', m => { if (m.type() === 'error') console.log('   [console.error]', m.text().slice(0, 200)); });
  page.on('dialog', d => d.accept().catch(() => {}));
  await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(2500);
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
  await page.evaluate(async () => { const m = await import('/core/app.js'); m.openDualTestSetup(); });
  await page.waitForSelector('#dts-new-test-btn', { timeout: 15000 });
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
  await page.click('#dts-new-test-btn');
  // الخطوة 1: نطاق الجولة 1 = البقرة..آل عمران
  await page.waitForSelector('#dts-rounds-range-container select');
  await page.evaluate(() => {
    const sels = [...document.querySelectorAll('#dts-rounds-range-container select[data-round="0"]')];
    sels.forEach(s => { s.value = s.dataset.roundRange === 'from' ? '2' : '3'; s.dispatchEvent(new Event('change', { bubbles: true })); });
  });
  await page.click('#dts-step1-next-btn'); await sleep(300);
  await page.evaluate(() => document.querySelector('#dts-roundpick-grid button, #dts-roundpick-grid [data-round="0"]')?.click());
  await page.click('#dts-step2-next-btn'); await sleep(400);
  check('الوضع اليدوي افتراضياً: نموذج الإدخال اليدوي ظاهر', !!(await page.$('.dts-qx-composer')) && !(await page.$('.dts-gen-panel')));
  await page.click('[data-entry-mode="auto"]'); await sleep(200);
  check('وضع التوليد: لوحة التوليد ظاهرة والنموذج اليدوي مخفي', !!(await page.$('.dts-gen-panel')) && !(await page.$('.dts-qx-composer')));
  await page.fill('#dts-gen-main', '4'); await page.fill('#dts-gen-swap', '2');
  await page.dispatchEvent('#dts-gen-swap', 'change'); await page.dispatchEvent('#dts-gen-main', 'change'); await sleep(200);
  await page.click('[data-gen-action="generate"]'); await sleep(1200);
  let st = await page.evaluate(() => [...document.querySelectorAll('.dts-gen-auto')].map(c => c.querySelector('.dts-gen-chip')?.innerText));
  check('تم توليد 4 أساسية', st.length === 4, JSON.stringify(st));
  check('كل البطاقات «متوازن»', st.every(x => /متوازن/.test(x) && !/خارج/.test(x)), JSON.stringify(st));
  await page.click('[data-qtab="swap"]'); await sleep(200);
  st = await page.evaluate(() => document.querySelectorAll('.dts-gen-auto').length);
  check('تبويب الاستبدال فيه 2', st === 2, String(st));
  await page.click('[data-qtab="main"]'); await sleep(200);
  if (outDir) await page.screenshot({ path: path.join(outDir, `${vp.name}-generated.png`), fullPage: true });
  // تعديل الحد: إضافة آية بعد النهاية ثم الرجوع
  const before = await page.evaluate(() => document.querySelector('.dts-gen-auto .dts-gen-chip').innerText);
  await page.click('.dts-gen-auto [data-gen-action="edge"][data-edge="end"][data-delta="1"]'); await sleep(300);
  const after = await page.evaluate(() => document.querySelector('.dts-gen-auto .dts-gen-chip').innerText);
  check('تعديل النهاية يغيّر عدد الكلمات ويُحدّث الشارة', before !== after, `${before} -> ${after}`);
  await page.click('.dts-gen-auto [data-gen-action="edge"][data-edge="end"][data-delta="-1"]'); await sleep(300);
  check('الرجوع يعيد العدد نفسه', (await page.evaluate(() => document.querySelector('.dts-gen-auto .dts-gen-chip').innerText)) === before);
  // إعادة توليد سؤال واحد
  const t0 = await page.evaluate(() => document.querySelector('.dts-gen-auto .dts-qx-lines').innerText);
  await page.click('.dts-gen-auto [data-gen-action="regen"]'); await sleep(500);
  const t1 = await page.evaluate(() => document.querySelector('.dts-gen-auto .dts-qx-lines').innerText);
  check('إعادة توليد سؤال تغيّر نصه', t0 !== t1);
  // اعتماد الكل
  await page.click('[data-gen-action="approve-all"]'); await sleep(200);
  check('بعد اعتماد الكل لا يوجد «بانتظار المراجعة»', (await page.evaluate(() => document.querySelectorAll('.dts-gen-chip-pending').length)) === 0);
  check('الحجم موحّد (مقفل) بعد التوليد', !!(await page.$('.dts-gen-locked')));
  // إعادة التوليد لا تمسّ المعتمد وتكمل العدد (لا جديد)
  await page.click('[data-gen-action="generate"]'); await sleep(800);
  check('إعادة التوليد مع اكتمال العدد لا تضيف شيئاً', (await page.evaluate(() => document.querySelectorAll('.dts-gen-auto').length)) === 4);
  // حفظ جاهز ثم التحقق من التخزين
  await page.click('#dts-save-ready-btn'); await sleep(800);
  const saved = await page.evaluate(async () => { const { AppState } = await import('/core/app.js'); const ts = await AppState.dualTestsManager.getAllTests(); const r = ts[0].rounds[0];
    return { n: r.mainQuestions.length, s: r.swapQuestions.length, gt: ts[0].genTargetWords, q: r.mainQuestions[0], codes: r.swapQuestions.map(x => x.code) }; });
  check('حُفظ الاختبار بـ4 أساسية و2 استبدال وهدف 60', saved.n === 4 && saved.s === 2 && saved.gt === 60, JSON.stringify(saved).slice(0, 300));
  check('السؤال المخزَّن يحتوي fromText/toText وmeta', !!(saved.q.fromText && saved.q.toText && saved.q.meta && saved.q.meta.source === 'auto' && saved.q.meta.approved));
  check('رموز الاستبدال فريدة', new Set(saved.codes).size === saved.codes.length, saved.codes.join(','));
  check(`${vp.name}: لا أخطاء JS`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
await browser.close(); srv.close();
console.log(`\n${ok} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
