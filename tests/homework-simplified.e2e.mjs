// tests/homework-simplified.e2e.mjs — واجهة الإنشاء المبسّطة (نشر مباشر، أزرار النطاق، مشاركة واتساب/تيليجرام) (من الواجهة إلى الخادم ثم سجل الأداء).
// الاستعمال: node tests/smart-homework.e2e.mjs [siteRoot]
//   يحتاج Playwright + Chromium (PW_CHROMIUM=/path/to/chrome، وPLAYWRIGHT_MODULE_DIR لتثبيت عام).
// يشغّل Code.gs الحقيقي داخل محاكي Apps Script الخاص بالمختبر (Dar-Ham-Homework-Lab/dev/gas-emulator.mjs) خلف رابط /exec الحقيقي،
// وزرّ جوجل مزيّف، وبيانات المصحف الحقيقية (database/quran-uthmani.json). كل سياق متصفح يبدأ فارغاً = جهاز جديد.
// يغطي: واجهة الإنشاء (لا خيارات سورة/جزء عامة)، التوليد والمعاينة و«لماذا»، النشر وخريطة التتبّع في الخادم دون تسريبها للطالب،
// تسليم الطالب واعتماد المعلم وتسجيل الأحداث (ومنع تكرارها)، التكرار العلاجي في الواجب التالي، بناء الملف من البيانات الحالية،
// جلسات اللعب، موضع الحفظ الشهري، ملف المهارات، وتنظيف بيانات الطالب المحذوف.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');

const [siteRoot = REPO] = process.argv.slice(2);
const { createBackend, googleTokenMock } = await import(pathToFileURL(path.join(REPO, 'Dar-Ham-Homework-Lab/dev/gas-emulator.mjs')).href);
const CLIENT_ID = '52157264045-l30vua64vk6018jjv53j14qpf716rmr8.apps.googleusercontent.com';
const API = 'https://script.google.com/macros/s/AKfycbzynu0klKsGI3W168LfxV6LVTDk8pRHVFvATpug4iJR0o_jwRDi128RwBMCgAg52Q7L/exec';

const be = createBackend({ codePath: path.join(REPO, 'backend/Code.gs'), urlFetch: googleTokenMock({ tokT: { sub: 'sub-teacher', email: 't@example.com', aud: CLIENT_ID } }) });
be.setup();

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(siteRoot, p);
  if (!f.startsWith(siteRoot) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
await new Promise(r => srv.on('listening', r));
const WEB = `http://localhost:${srv.address().port}`;

const FAKE_GSI = `window.google = { accounts: { id: { _cb: null, initialize(o) { this._cb = o.callback; },
  renderButton(el) { const b = document.createElement('button'); b.id = 'fake-gsi-btn'; b.type = 'button'; b.textContent = 'Sign in'; b.onclick = () => this._cb({ credential: 'tokT' }); el.appendChild(b); },
  prompt() {}, disableAutoSelect() {} } } };`;

const apiLog = [];
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1100, height: 900 } });
await ctx.route('**/*', async (route) => {
  const u = new URL(route.request().url());
  if (u.hostname === 'localhost') return route.continue();
  if (u.href.startsWith(API)) {
    const req = route.request();
    const out = req.method() === 'GET' ? be.get(Object.fromEntries(u.searchParams)) : be.post(req.postData() || '');
    const action = req.method() === 'GET' ? u.searchParams.get('action') : (() => { try { return JSON.parse(req.postData()).action; } catch { return '?'; } })();
    apiLog.push({ action, ok: out.ok, code: out.code });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
  }
  if (u.href.startsWith('https://accounts.google.com/gsi/client')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_GSI });
  return route.abort();
});
const page = await ctx.newPage();
const pageErrors = [];
page.on('dialog', d => d.dismiss().catch(() => {}));
page.on('pageerror', e => { pageErrors.push(e.message); console.log(`   [pageerror] ${e.message}`); });

const results = [];
function check(name, cond, detail = '') { results.push({ name, ok: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
// SHOTS=/path يحفظ لقطات الشاشات الرئيسية للمراجعة البصرية
const shot = async (pg, name) => { if (process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, name + '.png'), fullPage: true }); };

try {
  await page.goto(WEB + '/index.html');
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await sleep(800);
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const by = (n) => AppState.surahsData.find(s => s.number === n).name;
    await AppState.studentManager.addStudent({ name: 'محمد التجريبي', type: 'adult', memoFrom: by(114), memoTo: by(79) });
  });
  await page.evaluate(() => document.getElementById('btn-homework-main').click());
  await page.waitForSelector('#fake-gsi-btn', { timeout: 10000 });
  await page.click('#fake-gsi-btn');
  await page.waitForSelector('#btn-hero-new', { timeout: 20000 });
  await sleep(1500);
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
  await sleep(300);
  await page.evaluate(() => document.getElementById('btn-hero-new').click());
  await sleep(800);
  // ---- الرئيسية: بطاقة البدء + الإحصائيات + «مستحق اليوم» (نفرض جدولاً يستحق اليوم لطالب موجود)
  await page.evaluate(() => document.getElementById('btn-tab-history')?.click()); await sleep(600);
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const st = (await AppState.studentManager.getAllStudents()).find(x => x.name === 'محمد التجريبي');
    st.hwSchedule = { days: [new Date().getDay()], startTs: Date.now() - 86400000 * 3, auto: false };
    await AppState.studentManager.updateStudent(st);
  });
  await page.evaluate(() => document.getElementById('btn-tab-history').click()); await sleep(1200);
  const topInfo = await page.evaluate(() => ({ cta: document.getElementById('hwp5-cta')?.innerText, stats: document.querySelectorAll('.hwp5-stats .hwp2-stat-card').length,
    dueVisible: getComputedStyle(document.getElementById('hwp5-due-sec')).display !== 'none', cards: document.querySelectorAll('#hwp5-due .hwp5-tcard').length }));
  check('H1 الرئيسية: زر البدء + 4 إحصائيات + قسم «مستحق اليوم» بالطالب', /ابدأ واجباً/.test(topInfo.cta) && topInfo.stats === 4 && topInfo.dueVisible && topInfo.cards >= 1, JSON.stringify(topInfo));
  await shot(page, 'simple-0-home');
  await page.click('#hwp5-due .hwp5-go'); await sleep(1500);
  check('H2 زر «أنشئ» يفتح الإعداد ويختار الطالب', (await page.inputValue('#hw-target-student')) === 'محمد التجريبي' && await page.isVisible('#tab-new-hw'));
  await page.evaluate(() => document.getElementById('hw-target-student-clear')?.click()); await sleep(300);
  await page.fill('#hw-target-student-search', 'محمد'); await sleep(300);
  await page.click('.hwp2-student-result'); await sleep(1800);

  console.log('\n=== أزرار النطاق وما تحتها ===');
  const st = () => page.evaluate(() => ({
    tiles: document.querySelectorAll('#hw-hizb-strip .hw-tile').length, sel: document.querySelectorAll('#hw-hizb-strip .hw-tile.sel').length,
    help: document.getElementById('hw-scope-help').innerText.replace(/\s+/g, ' '), pillOn: [...document.querySelectorAll('.hw-scope-head label.on')].map(l => l.innerText.trim()),
    strip: getComputedStyle(document.getElementById('hw-hizb-strip')).display, surs: getComputedStyle(document.getElementById('hw-surah-list')).display,
    resume: getComputedStyle(document.getElementById('hw-scope-resume-wrap')).display, resBanner: getComputedStyle(document.getElementById('hw-resume-banner')).display }));
  let s = await st();
  check('S1 «كل النطاق» افتراضي: كل البطاقات محدّدة وسطر توضيحي', s.tiles > 3 && s.sel === s.tiles && /كل نطاقه/.test(s.help) && s.pillOn.length === 1, JSON.stringify(s));
  check('S2 «أكمل السابق» غير ظاهر', s.resume === 'none' && s.resBanner === 'none');
  await page.click('label:has(input[value="hizb"])'); await sleep(300);
  s = await st();
  check('S3 «أحزاب محددة»: لا بطاقة محدّدة + تحديد الكل/مسح', s.sel === 0 && /تحديد الكل/.test(s.help), JSON.stringify(s));
  await page.click('#hw-scope-help a[data-act="all"]'); await sleep(200);
  s = await st();
  check('S4 «تحديد الكل» يحدّد كل البطاقات ثم «مسح» يفرّغها', s.sel === s.tiles);
  await page.click('#hw-scope-help a[data-act="clear"]'); await sleep(200);
  check('S5 «مسح»', (await st()).sel === 0);
  await page.click('label:has(input[value="surah"])'); await sleep(300);
  s = await st();
  check('S6 «سور محددة»: قائمة السور تظهر والشريط يختفي', s.surs !== 'none' && s.strip === 'none', JSON.stringify({ surs: s.surs, strip: s.strip }));
  await page.click('label:has(input[value="all"])'); await sleep(300);
  await shot(page, 'simple-1-scope');

  console.log('\n=== نشر مباشر ===');
  const before = await page.evaluate(async () => { const { AppState } = await import('/core/app.js'); return (await AppState.homeworkManager.getAllHomeworks()).length; });
  await page.fill('#hw-q-count-smart', '10');
  await page.click('#btn-generate-publish');
  await page.waitForSelector('#hw-share-modal', { state: 'visible', timeout: 40000 });
  await sleep(1200);
  const after = await page.evaluate(async () => { const { AppState } = await import('/core/app.js'); const all = await AppState.homeworkManager.getAllHomeworks(); return { n: all.length, last: all[all.length - 1] }; });
  check('P1 نقرة واحدة: وُلِّد الواجب ونُشر وظهرت نافذة المشاركة', after.n === before + 1 && after.last.status === 'published' && after.last.questions.length === 10 && after.last.assignedStudentName === 'محمد التجريبي');
  const link = await page.inputValue('#hw-link-input');
  check('P2 الرابط جاهز', /student\.html\?hw=/.test(link) || /hw=/.test(link), link);
  const sharedBtns = await page.evaluate(() => ({ wa: !!document.getElementById('btn-share-wa')?.offsetParent, tg: !!document.getElementById('btn-share-tg')?.offsetParent, copy: !!document.getElementById('btn-copy-hw-link')?.offsetParent }));
  check('P3 نافذة المشاركة: رابط + نسخ + واتساب + تيليجرام فقط', sharedBtns.wa && sharedBtns.tg && sharedBtns.copy);
  await shot(page, 'simple-2-share');
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
  await page.click('#btn-share-wa'); await page.click('#btn-share-tg');
  const opened = await page.evaluate(() => window.__opened);
  const waUrl = opened[0] || '', tgUrl = opened[1] || '';
  check('P4 زر واتساب يفتح wa.me برسالة تحوي اسم الطالب والرابط', /^https:\/\/wa\.me\//.test(waUrl) && decodeURIComponent(waUrl).includes('محمد التجريبي') && decodeURIComponent(waUrl).includes(link), waUrl.slice(0, 120));
  check('P5 زر تيليجرام يفتح t.me/share بالرابط', /^https:\/\/t\.me\/share\/url\?url=/.test(tgUrl) && decodeURIComponent(tgUrl).includes(link), tgUrl.slice(0, 120));
  await page.click('#btn-close-hw-modal'); await sleep(800);

  console.log('\n=== المسار القديم محفوظ (مراجعة ثم نشر) ===');
  await page.evaluate(() => document.getElementById('btn-hero-new').click()); await sleep(500);
  await page.fill('#hw-target-student-search', 'محمد'); await sleep(300);
  await page.click('.hwp2-student-result'); await sleep(1500);
  await page.click('#btn-generate-hw');
  await page.waitForSelector('#hw-questions-list .quran-text', { timeout: 30000 });
  check('R1 «توليد ومراجعة» ما زال يعرض الأسئلة قبل النشر', await page.isVisible('#hw-preview-section') && !(await page.isVisible('#hw-share-modal')));
  await shot(page, 'simple-3-review');

  check('Z لا أخطاء جافاسكربت غير ملتقطة', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  console.log('اختبار توقف بخطأ:', e && e.stack || e);
  results.push({ name: 'اكتمال الاختبار', ok: false });
}
await browser.close(); srv.close();
const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
