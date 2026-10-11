// tests/due-disappear.e2e.mjs — اختفاء الطالب فوراً من «مهام اليوم» عند إنشاء واجب له (حدث dh:homework-created من database/homeworkDB.js).
// الاستعمال: PW_CHROMIUM=/path/to/chrome PLAYWRIGHT_MODULE_DIR=/path/to/node_modules node tests/due-disappear.e2e.mjs [siteRoot]
// نفس بيئة tests/homework-simplified.e2e.mjs (محاكي Apps Script + زر جوجل مزيّف + بيانات المصحف الحقيقية).
// يغطي: بطاقة «مهام اليوم» في الرئيسية، والعمود الجانبي في شاشة الواجبات (نشر عادي)، وأن «المسودة» لا تُخفي الطالب،
// واستمرار الحالة بعد إعادة التحميل، والنشر الجماعي (الاسم يختفي والشاشة ما زالت مفتوحة)، وغياب أخطاء جافاسكربت.
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
let failNextCreate = 0;     // عدد طلبات createHomework القادمة التي تُقطع (لمحاكاة فشل الشبكة)
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1180, height: 900 } });
await ctx.route('**/*', async (route) => {
  const u = new URL(route.request().url());
  if (u.hostname === 'localhost') return route.continue();
  if (u.href.startsWith(API)) {
    const req = route.request();
    const action = req.method() === 'GET' ? u.searchParams.get('action') : (() => { try { return JSON.parse(req.postData()).action; } catch { return '?'; } })();
    if (action === 'createHomework' && failNextCreate > 0) { failNextCreate--; apiLog.push({ action, ok: false, code: 'CUT' }); return route.abort('failed'); }
    const out = req.method() === 'GET' ? be.get(Object.fromEntries(u.searchParams)) : be.post(req.postData() || '');
    apiLog.push({ action, ok: out.ok, code: out.code });
    return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(out) });
  }
  if (u.href.startsWith('https://accounts.google.com/gsi/client')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: FAKE_GSI });
  return route.abort();
});
const page = await ctx.newPage();
const pageErrors = [];
let dialogMode = 'dismiss';
page.on('dialog', d => (dialogMode === 'accept' ? d.accept() : d.dismiss()).catch(() => {}));
page.on('pageerror', e => { pageErrors.push(e.message); console.log(`   [pageerror] ${e.message}`); });


const results = [];
function check(name, cond, detail = '') { results.push({ name, ok: !!cond }); console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`); }
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const dismissMonthly = async () => { for (let i = 0; i < 3; i++) { const had = await page.evaluate(() => { const b = document.getElementById('mmt-close'); if (b) { b.click(); return true; } return false; }); if (!had) break; await sleep(500); } };
// الاسم من النص الظاهر فعلاً في الصف (لا من خاصية داخلية)، ليصحّ التشغيل على النسخة القديمة أيضاً
const homeNames = () => page.evaluate(() => [...document.querySelectorAll('#home-quickcard-due-list .home-quickcard-due-row .qc-row-name')].map(n => (n.firstChild ? n.firstChild.textContent : n.textContent).trim()));
const sideNames = () => page.evaluate(() => [...document.querySelectorAll('#hwp5-due .hwp5-tcard')].map(c => c.dataset.name));
const pubRecord = (name, status = 'published') => page.evaluate(async ([n, st]) => {
  const { AppState } = await import('/core/app.js');
  await AppState.homeworkManager.createHomework({ id: 'HW_TEST_' + Math.random().toString(36).slice(2, 8), createdAt: new Date().toISOString(), questions: [], status: st, assignedStudentName: n });
}, [name, status]);

try {
  await page.goto(WEB + '/index.html');
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await sleep(800);
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const by = (n) => AppState.surahsData.find(s => s.number === n).name;
    const mgr = AppState.studentManager;
    for (const [nm, to] of [['الأول أ', 78], ['الثاني ب', 80], ['الثالث ج', 82], ['الرابع د', 84], ['الخامس هـ', 86]]) await mgr.addStudent({ name: nm, type: 'adult', memoFrom: by(114), memoTo: by(to) });
    const all = await mgr.getAllStudents();
    for (const s of all) { s.hwSchedule = { days: [new Date().getDay()], startTs: Date.now() - 86400000 * 3, auto: false }; await mgr.updateStudent(s); }
  });
  await page.reload();
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());

  console.log('\n=== الرئيسية: بطاقة «مهام اليوم» ===');
  let names = await homeNames();
  check('H1 الطلاب الخمسة المستحقون ظاهرون في البطاقة', names.length === 5, JSON.stringify(names));
  await pubRecord('الأول أ');
  await sleep(350);
  names = await homeNames();
  check('H2 بعد نشر واجب لـ«الأول أ» يختفي اسمه فوراً (دون إعادة فتح) ويبقى الباقون', !names.includes('الأول أ') && names.length === 4, JSON.stringify(names));
  await pubRecord('الثاني ب', 'draft');
  await sleep(700);
  names = await homeNames();
  check('H3 حفظ «مسودة» لا يُخفي الطالب (لم يُنشر له شيء)', names.includes('الثاني ب') && names.length === 4, JSON.stringify(names));
  await page.reload();
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await sleep(2500);
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
  names = await homeNames();
  check('H4 بعد إعادة التحميل الحالة نفسها (مستمرة لا مجرد إخفاء مؤقت)', !names.includes('الأول أ') && names.includes('الثاني ب') && names.length === 4, JSON.stringify(names));

  console.log('\n=== شاشة الواجبات: العمود الجانبي «مستحق اليوم» ===');
  await page.evaluate(() => document.getElementById('btn-homework-main').click());
  await page.waitForSelector('#fake-gsi-btn, #btn-hero-new', { timeout: 15000 });
  if (await page.locator('#fake-gsi-btn').count()) await page.click('#fake-gsi-btn');
  await page.waitForSelector('#btn-hero-new', { timeout: 20000 });
  await sleep(1500);
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
  await dismissMonthly();
  names = await sideNames();
  check('W1 العمود الجانبي يعرض الأربعة المتبقين', names.length === 4 && !names.includes('الأول أ'), JSON.stringify(names));
  // نشر عادي لـ«الثالث ج» بنقرة «أنشئ» ثم «توليد ونشر مباشرة»
  await page.locator('#hwp5-due .hwp5-go[data-name="الثالث ج"]').click(); await sleep(1800);
  await dismissMonthly();
  await page.fill('#hw-q-count-smart', '5');
  await page.click('#btn-generate-publish');
  await page.waitForSelector('#hw-share-modal', { state: 'visible', timeout: 60000 });
  await sleep(500);
  names = await sideNames();
  check('W2 بمجرد ظهور نافذة المشاركة اختفى «الثالث ج» من العمود (دون إغلاق ولا إعادة فتح)', !names.includes('الثالث ج') && names.length === 3, JSON.stringify(names));
  await page.click('#btn-close-hw-modal'); await sleep(500);
  names = await sideNames();
  check('W3 بعد إغلاق النافذة ما زال غائباً والباقون كما هم', !names.includes('الثالث ج') && names.includes('الثاني ب') && names.includes('الرابع د') && names.includes('الخامس هـ'), JSON.stringify(names));
  // مسودة عبر زر «توليد ومراجعة» ثم «حفظ كمسودة» لا تخفي أحداً
  await page.evaluate(() => document.getElementById('btn-hero-new').click()); await sleep(500);
  await page.fill('#hw-target-student-search', 'الرابع'); await sleep(300);
  await page.click('.hwp2-student-result'); await sleep(1500);
  await page.fill('#hw-q-count-smart', '5');
  await page.click('#btn-generate-hw');
  await page.waitForSelector('#hw-questions-list .quran-text', { timeout: 40000 });
  await page.click('#btn-save-hw-draft'); await sleep(1200);
  names = await sideNames();
  check('W4 «حفظ كمسودة» لطالب لا يُخفي اسمه من العمود', names.includes('الرابع د'), JSON.stringify(names));

  console.log('\n=== الإرسال الجماعي ===');
  await dismissMonthly();
  await page.click('#hw-btn-bulk'); await page.waitForSelector('.bs-ov .bs-rw', { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('.bs-pill.wait'), null, { timeout: 40000 });
  await page.locator('.bs-rw', { hasText: 'الرابع د' }).locator('input[type=checkbox]').check();
  await page.locator('.bs-rw', { hasText: 'الخامس هـ' }).locator('input[type=checkbox]').check();
  for (const n of ['الرابع د', 'الخامس هـ']) for (let i = 0; i < 5; i++) await page.locator('.bs-rw', { hasText: n }).locator('[data-q="-1"]').click();
  await page.click('#bs-prep');
  await page.waitForFunction(() => document.querySelectorAll('.bs-pill.ok').length >= 2, null, { timeout: 90000 });
  await page.click('#bs-pub');
  await page.waitForSelector('#bs-links.on .bs-lk', { timeout: 120000 });
  await sleep(900);
  names = await sideNames();
  check('B1 أثناء بقاء شاشة الإرسال الجماعي مفتوحة اختفى المنشور لهم من العمود خلفها', !names.includes('الرابع د') && !names.includes('الخامس هـ'), JSON.stringify(names));
  const dueTag = await page.evaluate(() => [...document.querySelectorAll('.bs-rw')].filter(r => /الرابع|الخامس/.test(r.innerText)).map(r => r.querySelectorAll('.bs-tag.late, .bs-tag.today').length));
  check('B2 في شاشة الإرسال الجماعي نفسها زالت شارة «متأخر» عمّن نُشر له', dueTag.every(n => n === 0), JSON.stringify(dueTag));
  await page.click('.bs-ov [data-act="close"]'); await sleep(1200);
  names = await sideNames();
  check('B3 بعد الإغلاق لا يبقى إلا «الثاني ب» (المسودة فقط، لم يُنشر له)', names.length === 1 && names[0] === 'الثاني ب', JSON.stringify(names));
  const sec = await page.evaluate(() => getComputedStyle(document.getElementById('hwp5-due-sec')).display);
  check('B4 العمود يبقى ظاهراً لأن فيه طالباً مستحقاً', sec !== 'none');

  console.log('\n=== الرجوع إلى الرئيسية بعد النشر ===');
  await page.evaluate(async () => { const m = await import('/core/app.js'); await m.loadSplashScreen(); });
  await page.waitForSelector('#home-quickcard-due-list .home-quickcard-due-row', { state: 'attached', timeout: 15000 });
  await sleep(2500);
  names = await homeNames();
  check('R1 عند الرجوع للرئيسية: لا يظهر من نُشر لهم (الأول والثالث والرابع والخامس) ويبقى «الثاني ب» فقط', names.length === 1 && names[0] === 'الثاني ب', JSON.stringify(names));

  check('Z لا أخطاء جافاسكربت غير ملتقطة', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  console.log('اختبار توقف بخطأ:', e && e.stack || e);
  results.push({ name: 'اكتمال الاختبار', ok: false });
}
await browser.close(); srv.close();
const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
