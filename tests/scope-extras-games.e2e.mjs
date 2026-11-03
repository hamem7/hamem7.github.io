// tests/scope-extras-games.e2e.mjs — «السور الإضافية خارج المسار المتصل» في الألعاب الفردية: قوائم السور والأجزاء ومجموعة الأسئلة.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/path/to/node_modules node tests/scope-extras-games.e2e.mjs [siteRoot]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');
const [siteRoot = REPO] = process.argv.slice(2);

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(siteRoot, p);
  if (!f.startsWith(siteRoot) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
await new Promise(r => srv.on('listening', r));
const WEB = `http://localhost:${srv.address().port}`;

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1100, height: 1000 } });
await ctx.route('**/*', (route) => { const u = new URL(route.request().url()); return u.hostname === 'localhost' ? route.continue() : route.abort(); });
const page = await ctx.newPage();
const pageErrors = [];
page.on('dialog', d => d.dismiss().catch(() => {}));
page.on('pageerror', e => { pageErrors.push(e.message); console.log(`   [pageerror] ${e.message}`); });
const results = [];
function check(name, cond, detail = '') { results.push({ name, ok: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
// يختار سورة في قائمة «إلى» حسب رقمها (قيمة الخيار = اسم السورة)
const pickTo = (n) => page.evaluate((num) => { const sel = document.getElementById('stu-memo-to'); import('/core/app.js').then(({ AppState }) => { sel.value = AppState.surahsData.find(x => x.number === num).name; sel.dispatchEvent(new Event('change', { bubbles: true })); }); }, n);
// يفتح لوحة المحرّر المطلوبة فقط إن لم تكن مفتوحة (الضغط على زرها المفتوح يطويها)
const openPanel = async (ed, kind) => { if (!(await ed.locator(`[data-open="${kind}"].is-on`).count())) await ed.locator(`[data-open="${kind}"]`).click(); };
const norm = (x) => String(x || '').replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, '').replace(/[\u0671\u0622\u0623\u0625]/g, 'ا');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const shot = async (name) => { if (process.env.SHOTS) await page.screenshot({ path: path.join(process.env.SHOTS, name + '.png'), fullPage: true }); };

try {
  await page.goto(WEB + '/index.html');
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await sleep(800);
  await page.evaluate(() => setInterval(() => document.querySelectorAll('.dh-tour-root,.mmt-overlay,.mmb-overlay,.ham-dialog-overlay').forEach(e => e.remove()), 150));

  // طالب: الناس ← يس + (البقرة ← يونس آية 55) + الكهف
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const by = (n) => AppState.surahsData.find(s => s.number === n).name;
    await AppState.studentManager.addStudent({ name: 'طالب الألعاب', type: 'adult', gender: 'boy', memoFrom: by(114), memoTo: by(36),
      memoExtra: [{ s1: 2, a1: 1, s2: 10, a2: 55 }, { s1: 18, a1: 1, s2: 18, a2: 110 }] });
    AppState.currentStudent = (await AppState.studentManager.getAllStudents()).find(s => s.name === 'طالب الألعاب');
    AppState.isKidsMode = false;
    const m = await import('/core/app.js');
    await m.loadDashboardScreen();
  });
  await page.waitForSelector('#scope-student', { timeout: 15000 });
  await sleep(600);
  await page.click('#scope-student');
  await sleep(400);
  // يفتح لوحة الألعاب من جديد (بعد إعادة تحميل الصفحة) لنفس الطالب المحفوظ في قاعدة البيانات
  const openDash = async (scope) => {
    await page.reload(); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(600);
    await page.evaluate(() => setInterval(() => document.querySelectorAll('.dh-tour-root,.mmt-overlay,.mmb-overlay,.ham-dialog-overlay').forEach(e => e.remove()), 150));
    await page.evaluate(async () => { const m = await import('/core/app.js'); m.AppState.currentStudent = (await m.AppState.studentManager.getAllStudents()).find(s => s.name === 'طالب الألعاب'); m.AppState.isKidsMode = false; await m.loadDashboardScreen(); });
    await page.waitForSelector('#scope-student', { timeout: 15000 }); await sleep(600);
    await page.click('#' + scope); await sleep(400);
  };
  const opts = (id) => page.evaluate((i) => [...document.querySelectorAll(`#${i} option`)].map(o => o.textContent.trim()), id);

  console.log('\n=== نطاق حفظ الطالب: السور في القوائم ===');
  const surahOpts = await opts('surah-select');
  check('G1 قائمة «سورة محددة» تضم السور الإضافية بوسم «إضافية»', surahOpts.some(x => /البقرة/.test(norm(x)) && /إضافية/.test(x)) && surahOpts.some(x => /الكهف/.test(norm(x)) && /إضافية/.test(x)), surahOpts.filter(x => /إضافية/.test(x)).slice(0, 4).join(' | '));
  check('G2 السورة الجزئية تُظهر الآيات المحفوظة (يونس 1–55)', surahOpts.some(x => /يونس/.test(norm(x)) && /1–55/.test(x)), surahOpts.find(x => /يونس/.test(norm(x))));
  check('G3 السور غير المحفوظة لا تظهر (مثل هود والأنعام؟ لا — الأنعام داخل البقرة←يونس، وهود غير محفوظة)', !surahOpts.some(x => /هود/.test(norm(x))) && !surahOpts.some(x => /مريم/.test(norm(x))));
  check('G4 المسار المتصل ما زال ظاهراً (الناس، يس)', surahOpts.some(x => /الناس/.test(norm(x))) && surahOpts.some(x => /يس/.test(norm(x))));
  check('G5 «عدة سور» (من/إلى) تضم الإضافية أيضاً', (await opts('range-from-surah')).some(x => /البقرة/.test(norm(x)) && /إضافية/.test(x)));
  const note = await page.locator('#scope-note').innerText();
  check('G6 ملاحظة النطاق تذكر الآيات الإضافية', /السور الإضافية/.test(note), note);
  const juz = await opts('juz-select');
  check('G7 الجزء الأول (البقرة) ظاهر لأن الطالب حفظ جزءاً منه', juz.some(x => /\b1\b|الم/.test(x)), juz.slice(-3).join(' | '));

  console.log('\n=== سورة محددة: يونس ===');
  await page.evaluate(() => { document.querySelector('input[name="evalType"][value="surah"]').click(); });
  await sleep(200);
  await page.selectOption('#surah-select', '10'); await sleep(200);
  const range = await page.evaluate(() => [document.getElementById('ayah-from').value, document.getElementById('ayah-to').value]);
  check('G8 مدى الآيات يبدأ على 1–55 (الجزء المحفوظ)', range[0] === '1' && range[1] === '55', range.join('-'));

  console.log('\n=== كل النطاق: المسار المتصل + الإضافي ===');
  await page.evaluate(() => { document.querySelector('input[name="evalType"][value="all"]').click(); });
  await sleep(500);
  const allTxt = await page.locator('#kids-all-range').innerText();
  check('G9 سطر «كل النطاق» يسرد السور الإضافية', /الكهف/.test(norm(allTxt)) && /البقرة/.test(norm(allTxt)), allTxt);
  await page.evaluate(() => { document.getElementById('q-count-all').value = 10; });
  const startAndRead = async () => {
    await page.evaluate(() => { document.getElementById('btn-start-mission').click(); });
    await sleep(600);
    // موضع الحفظ الشهري غير مسجَّل لطالب جديد: تذكير المنصة الأصلي، نختار «أكمل بالنطاق الحالي»
    await page.evaluate(() => { document.querySelector('div[role="dialog"][aria-modal="true"] .btn-outline')?.click(); });
    await sleep(2500);
    return page.evaluate(async () => { const g = await import('/games/adultGame.js'); const p = g.GameState.pool;
      return { n: p.length, s: [...new Set(p.map(a => a.surahNumber))].sort((a, b) => a - b), has10_55: p.some(a => a.surahNumber === 10 && a.numberInSurah === 55), has10_56: p.some(a => a.surahNumber === 10 && a.numberInSurah === 56), text: g.GameState.evalRangeText }; });
  };
  const all = await startAndRead();
  check('G10 مجموعة أسئلة «كل النطاق» تضم السور الإضافية والمتصلة', all.s.includes(2) && all.s.includes(18) && all.s.includes(36) && all.s.includes(114) && all.s.includes(10), JSON.stringify(all.s.slice(0, 12)) + ' … n=' + all.n);
  check('G11 يونس 1–55 فقط (55 داخل و56 خارج)', all.has10_55 && !all.has10_56);
  check('G12 لا سور غير محفوظة (هود 11 / مريم 19 / الأنفال 35 غير موجودة)', !all.s.includes(11) && !all.s.includes(19) && !all.s.includes(35), all.text);
  check('G13 نص التقرير يذكر الإضافي', /\+/.test(all.text) && /الكهف/.test(norm(all.text)), all.text);

  console.log('\n=== عدة سور (من - إلى) داخل نطاق الطالب ===');
  await openDash('scope-student');
  await page.evaluate(() => { document.querySelector('input[name="evalType"][value="range"]').click(); });
  await sleep(300);
  await page.selectOption('#range-from-surah', '2'); await page.selectOption('#range-to-surah', '114');
  await page.evaluate(() => { document.getElementById('q-count-range').value = 10; });
  const rg = await startAndRead();
  check('R1 «من البقرة إلى الناس» لا تُدخل السور غير المحفوظة بينهما', rg.s.includes(2) && rg.s.includes(18) && rg.s.includes(114) && !rg.s.includes(11) && !rg.s.includes(19) && !rg.s.includes(35) && rg.has10_55 && !rg.has10_56, JSON.stringify(rg.s.slice(0, 14)));

  console.log('\n=== كل المصحف: لا يتأثر ===');
  await openDash('scope-all');
  const full = await opts('surah-select');
  check('A1 «كل المصحف» تعرض السور كلها (هود موجودة، ولا وسم إضافية)', full.some(x => /هود/.test(norm(x))) && !full.some(x => /إضافية/.test(x)), full.length + ' option');

  console.log('\nأخطاء الصفحة:', pageErrors.length);
  check('Z1 لا أخطاء جافاسكربت', pageErrors.length === 0, pageErrors.join(' | '));
} catch (e) {
  await shot('failure-games').catch(() => {});
  console.log('EXCEPTION', e.message); check('X لا استثناء', false, e.message);
}
await browser.close(); srv.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} نجح`);
process.exit(failed ? 1 : 0);
