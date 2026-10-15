// tests/bulk-send.e2e.mjs — اختبار «الإرسال الجماعي» (components/bulkSend.js) من الواجهة إلى الخادم المحاكى.
// الاستعمال: PW_CHROMIUM=/path/to/chrome PLAYWRIGHT_MODULE_DIR=/path/to/node_modules node tests/bulk-send.e2e.mjs [siteRoot]
// نفس بيئة tests/homework-simplified.e2e.mjs: Code.gs الحقيقي داخل محاكي Apps Script + زر جوجل مزيّف + بيانات المصحف الحقيقية.
// يغطي: ظهور الزر (الرئيسية + شاشة الواجبات)، الصفوف والحالات (بلا نطاق/موضع قديم)، أزرار التحديد، القائمة المنسدلة (كل النطاق /
// اقترح لي / سور / أحزاب)، التحقق قبل التجهيز، التجهيز دون نشر، النشر المتتابع (واجب لكل طالب بنطاقه الصحيح وخريطة تتبّعه)،
// الروابط والرسائل وواتساب/تيليجرام، اختفاء الطلاب من «مهام اليوم»، فشل نشر واحد دون إسقاط الباقي ثم إعادة المحاولة بلا تكرار،
// ومنع النشر المكرر، والجوال، وعدم كسر المسار العادي (توليد ونشر لطالب واحد)، وغياب أخطاء جافاسكربت.
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
const norm = (x) => String(x || '').replace(/[\u064B-\u0652\u0670\u06D6-\u06ED]/g, '').replace(/[\u0671\u0622\u0623\u0625]/g, 'ا');
const shot = async (pg, name) => { if (process.env.SHOTS) await pg.screenshot({ path: path.join(process.env.SHOTS, name + '.png'), fullPage: true }); };
const createdCount = () => apiLog.filter(a => a.action === 'createHomework' && a.ok).length;
const bulkRow = (name) => page.locator('.bs-rw', { hasText: name });
// يضيف طالباً إلى قائمة العمل بالبحث ثم زر «＋ إضافة» بجواره (كما يفعل المعلم)
const addByName = async (nm) => { await page.fill('#bs-q', nm); await page.locator('.bs-res-i', { hasText: nm }).locator('[data-add]').click(); await page.fill('#bs-q', ''); await sleep(150); };
const openBulk = async () => { await dismissMonthly(); await page.click('#hw-btn-bulk'); await page.waitForSelector('.bs-ov #bs-q', { timeout: 15000 }); await waitStatuses(); };
// نافذة المنصة الأصلية «تحديث موضع الحفظ الشهري» تغطي الشاشة للطلاب الجدد: نغلقها كما يفعل المعلم
const dismissMonthly = async () => { for (let i = 0; i < 3; i++) { const had = await page.evaluate(() => { const b = document.getElementById('mmt-close'); if (b) { b.click(); return true; } return false; }); if (!had) break; await sleep(500); } };
const waitStatuses = () => page.waitForSelector('.bs-ov[data-checked="1"]', { state: 'attached', timeout: 60000 });
const _oldWaitStatuses = () => page.waitForFunction(() => document.querySelectorAll('.bs-pill:not(.wait), .bs-rw.off').length >= 4 && !document.querySelector('.bs-pill.wait'), null, { timeout: 40000 });

try {
  await page.goto(WEB + '/index.html');
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await sleep(800);

  // ---- بيانات: ثمانية طلاب (٣ مستحقون بنطاق حفظ، ٤ بنطاق لكنهم غير مستحقين، ١ بلا نطاق)
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const by = (n) => AppState.surahsData.find(s => s.number === n).name;
    const mgr = AppState.studentManager;
    await mgr.addStudent({ name: 'أحمد الأول', type: 'adult', memoFrom: by(114), memoTo: by(78) });
    await mgr.addStudent({ name: 'بلال الثاني', type: 'adult', memoFrom: by(114), memoTo: by(80) });
    await mgr.addStudent({ name: 'جابر الثالث', type: 'adult', memoFrom: by(114), memoTo: by(86) });
    await mgr.addStudent({ name: 'دعاء الرابعة', type: 'adult', memoFrom: by(114), memoTo: by(88) });
    await mgr.addStudent({ name: 'هيثم بلا نطاق', type: 'adult' });
    await mgr.addStudent({ name: 'وليد السادس', type: 'adult', memoFrom: by(114), memoTo: by(82) });
    await mgr.addStudent({ name: 'يعقوب السابع', type: 'adult', memoFrom: by(114), memoTo: by(84) });
    await mgr.addStudent({ name: 'سعيد الثامن', type: 'adult', memoFrom: by(114), memoTo: by(86) });
    const all = await mgr.getAllStudents();
    const ago = { 'أحمد الأول': 4, 'بلال الثاني': 2, 'جابر الثالث': 0 };   // جابر موعده اليوم، والآخران متأخران
    const dayAgo = (n) => { let m = n; while (n > 0 && (new Date().getDay() - m + 7) % 7 === 5) m++; return (new Date().getDay() - m + 7) % 7; };
    for (const s of all) {
      if (s.name in ago) { s.hwSchedule = { days: [dayAgo(ago[s.name])], startTs: Date.now() - 86400000 * (ago[s.name] + 9), auto: false }; await mgr.updateStudent(s); }
      // غير المستحقين: جدول صريح في يوم آخر (وإلا وزّعت المنصة تلقائياً لبعضهم يوم اليوم فيصير مستحقاً عشوائياً)
      else { s.hwSchedule = { days: [(new Date().getDay() + 3) % 7], startTs: Date.now(), auto: false }; await mgr.updateStudent(s); }
    }
  });
  await page.reload();
  await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
  await sleep(2500);

  console.log('\n=== الزر على الرئيسية (بطاقة مهام اليوم) ===');
  const homeBtn = await page.evaluate(() => { const b = document.querySelector('.qc-foot-bulk'); return { exists: !!b, text: b && b.innerText.trim() }; });
  check('H1 زر «الإرسال الجماعي» ظاهر في تذييل «مهام اليوم»', homeBtn.exists && /الإرسال الجماعي/.test(homeBtn.text), JSON.stringify(homeBtn));
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
  await page.evaluate(() => document.querySelector('.mmt-overlay')?.remove()); // جدول الحفظ الشهري يفتح تلقائياً مرة كل يوم ويحجب النقر (فشل قائم قبل هذا الدمج أيضاً)
  await page.evaluate(() => document.querySelector('.qc-foot-bulk').click());
  await page.waitForSelector('.bs-ov .bs-rw', { timeout: 15000 });
  check('H2 الضغط عليه يفتح الشاشة وفيها قائمة المستحقين الثلاثة فقط (لا كل الطلاب)', (await page.locator('.bs-ov .bs-rw').count()) === 3);
  await page.click('.bs-ov [data-act="close"]'); await sleep(400);
  check('H3 الإغلاق يزيل الشاشة', (await page.locator('.bs-ov').count()) === 0);

  console.log('\n=== شاشة الواجبات ===');
  await page.evaluate(() => document.getElementById('btn-homework-main').click());
  const needLogin = await page.waitForSelector('#fake-gsi-btn, #btn-hero-new', { timeout: 15000 });
  if (await page.locator('#fake-gsi-btn').count()) await page.click('#fake-gsi-btn');
  await page.waitForSelector('#btn-hero-new', { timeout: 20000 });
  await sleep(1500);
  await page.evaluate(() => document.querySelector('.dh-tour-skip')?.click());
  await sleep(300);
  await dismissMonthly();
  const hwBtn = await page.evaluate(() => { const b = document.getElementById('hw-btn-bulk'); return { vis: !!(b && b.offsetParent), text: b && b.innerText.trim() }; });
  check('B0 زر «📤 الإرسال الجماعي» ظاهر في شاشة الواجبات', hwBtn.vis && /الإرسال الجماعي/.test(hwBtn.text), JSON.stringify(hwBtn));
  await dismissMonthly(); await page.click('#hw-btn-bulk');
  await page.waitForSelector('.bs-ov .bs-rw', { timeout: 15000 });
  await waitStatuses();
  const initial = await page.evaluate(() => [...document.querySelectorAll('.bs-rw')].map(r => ({ name: r.querySelector('.bs-nm').innerText, sel: r.querySelector('input[type=checkbox]').checked, tags: [...r.querySelectorAll('.bs-tag')].map(t => t.innerText) })));
  check('B1 القائمة تعرض المستحقين الثلاثة فقط (متأخرين) محدَّدين افتراضياً، دون باقي الطلاب', initial.length === 3 && initial.every(r => r.sel && /متأخر/.test(r.tags.join())), JSON.stringify(initial.map(r => r.name)));
  check('B1b السطر التعريفي يذكر «3 طالب في القائمة» ولا منتظرين', /3 طالب في القائمة/.test(await page.locator('#bs-meta-t').innerText()) && !/ينتظرون/.test(await page.locator('#bs-meta-t').innerText()), await page.locator('#bs-meta-t').innerText());
  await page.fill('#bs-q', 'هيثم');
  const noRangeBtn = await page.locator('.bs-res-i', { hasText: 'هيثم' }).locator('button').first();
  check('B2 الطالب بلا نطاق حفظ يظهر في البحث بزر معطَّل «بلا نطاق حفظ» (لا يمكن إضافته)', (await noRangeBtn.isDisabled()) && /بلا نطاق حفظ/.test(await noRangeBtn.innerText()) && (await page.locator('.bs-rw').count()) === 3);
  await page.fill('#bs-q', '');
  check('B3 عناصر القائمة المنسدلة الأربعة موجودة', await page.evaluate(() => [...document.querySelector('.bs-scope').options].map(o => o.value).join() === 'all,suggest,surah,hizb'));
  await shot(page, 'bulk-1-open');

  console.log('\n=== أزرار التحديد ===');
  await page.click('[data-sel="due"]');
  let selected = await page.evaluate(() => [...document.querySelectorAll('.bs-row input[type=checkbox]:checked')].length);
  check('C1 «المستحقون اليوم» يحدّد الثلاثة المستحقين فقط', selected === 3, String(selected));
  await page.click('[data-sel="all"]');
  selected = await page.evaluate(() => [...document.querySelectorAll('.bs-row input[type=checkbox]:checked')].length);
  check('C2 «الكل» يحدّد كل ما في القائمة (3)', selected === 3, String(selected));
  await page.click('[data-sel="none"]');
  check('C3 «مسح» يلغي التحديد', (await page.evaluate(() => document.querySelectorAll('.bs-row input[type=checkbox]:checked').length)) === 0);
  await page.click('[data-sel="late"]');
  check('C4 «المتأخرون فقط» يحدّد الثلاثة المتأخرين دون من لا موعد له', (await page.evaluate(() => document.querySelectorAll('.bs-row input[type=checkbox]:checked').length)) === 3);
  await page.click('[data-sel="due"]');   // نعود للثلاثة المستحقين لباقي الاختبار

  console.log('\n=== البحث وزر «＋ إضافة» ===');
  const names = () => page.evaluate(() => [...document.querySelectorAll('.bs-rw .bs-nm')].map(n => n.innerText));
  const checkedNames = () => page.evaluate(() => [...document.querySelectorAll('.bs-rw')].filter(r => r.querySelector('input[type=checkbox]').checked).map(r => r.querySelector('.bs-nm').innerText));
  await page.click('[data-sel="none"]');
  check('SE0 مربع البحث موجود والنتائج مخفية قبل الكتابة', (await page.locator('#bs-q').count()) === 1 && !(await page.locator('#bs-res').isVisible()));
  await page.fill('#bs-q', 'احمد');
  let items = await page.locator('.bs-res-i').allInnerTexts();
  const ahmadBtn = page.locator('.bs-res-i', { hasText: 'أحمد' }).locator('button');
  check('SE1 البحث يتجاهل الهمزة («احمد» تجد «أحمد الأول») وهو أصلاً في القائمة: زر «في القائمة» معطَّل', items.length === 1 && (await ahmadBtn.isDisabled()) && /في القائمة/.test(await ahmadBtn.innerText()), JSON.stringify(items));
  await page.fill('#bs-q', 'دعاء');
  const addBtn = page.locator('.bs-res-i', { hasText: 'دعاء' }).locator('[data-add]');
  check('SE2 نتيجة طالب غير مضاف: بجوار اسمه زر «＋ إضافة»، ولا صف له في الجدول بعد', (await addBtn.count()) === 1 && /إضافة/.test(await addBtn.innerText()) && (await names()).length === 3);
  await addBtn.click(); await sleep(250);
  check('SE3 الضغط على «＋ إضافة» يضيفه إلى القائمة محدَّداً ويصير زر النتيجة «في القائمة»', (await names()).includes('دعاء الرابعة') && (await checkedNames()).includes('دعاء الرابعة') && /في القائمة/.test(await page.locator('.bs-res-i', { hasText: 'دعاء' }).locator('button').innerText()));
  check('SE4 السطر التعريفي يتحدّث إلى 4 طلاب وتظهر رسالة «أُضيف»', /4 طالب في القائمة/.test(await page.locator('#bs-meta-t').innerText()) && /أُضيف: دعاء/.test(await page.locator('.bs-toast').innerText().catch(() => '')));
  await page.fill('#bs-q', 'السا');
  await shot(page, 'bulk-8-results');
  const allBtn = page.locator('#bs-addall');
  check('SE5 بحث يطابق اثنين قابلين للإضافة يُظهر زر «إضافة الكل (2)»', (await allBtn.count()) === 1 && /\(2\)/.test(await allBtn.innerText()), await page.locator('.bs-res-h').innerText());
  await allBtn.click(); await sleep(250);
  check('SE6 «إضافة الكل» يضيف وليد ويعقوب معاً', (await names()).includes('وليد السادس') && (await names()).includes('يعقوب السابع') && (await names()).length === 6, JSON.stringify(await names()));
  await page.fill('#bs-q', 'سعيد'); await page.press('#bs-q', 'Enter'); await sleep(250);
  check('SE7 Enter يضيف أول نتيجة قابلة للإضافة ويفرّغ الحقل ويُخفي النتائج', (await names()).includes('سعيد الثامن') && (await page.inputValue('#bs-q')) === '' && !(await page.locator('#bs-res').isVisible()));
  await page.fill('#bs-q', 'zzz');
  check('SE8 بحث بلا نتيجة: رسالة «لا يوجد طالب بهذا الاسم»', /لا يوجد طالب بهذا الاسم/.test(await page.locator('#bs-res').innerText()));
  await page.click('#bs-qx'); await sleep(150);
  check('SE9 زر ✕ يمسح البحث ويُخفي النتائج', (await page.inputValue('#bs-q')) === '' && !(await page.locator('#bs-res').isVisible()));
  await shot(page, 'bulk-6-search');
  await page.click('[data-sel="none"]'); await page.click('[data-sel="due"]');   // نعود لتحديد المستحقين الثلاثة فقط لباقي الاختبار
  check('SE10 «المستحقون اليوم» يحدّد المستحقين الثلاثة دون المضافين بالبحث (7 في القائمة)', (await checkedNames()).length === 3 && (await names()).length === 7);

  console.log('\n=== القائمة المنسدلة للنطاق ===');
  // أحمد: أحزاب محددة
  await bulkRow('أحمد الأول').locator('select.bs-scope').selectOption('hizb');
  await bulkRow('أحمد الأول').locator('.bs-tile').first().waitFor({ timeout: 15000 });
  const hizbTiles = await bulkRow('أحمد الأول').locator('.bs-tile').count();
  check('D1 «أحزاب محددة»: تظهر بطاقات الأحزاب/الأرباع', hizbTiles >= 1, String(hizbTiles));
  // بلال: سور محددة
  await bulkRow('بلال الثاني').locator('select.bs-scope').selectOption('surah');
  await bulkRow('بلال الثاني').locator('.bs-tile').first().waitFor({ timeout: 15000 });
  const surTiles = await bulkRow('بلال الثاني').locator('.bs-tile').count();
  check('D2 «سور محددة»: تظهر السور داخل نطاق حفظه فقط (من الناس إلى النبأ)', surTiles >= 10 && surTiles <= 40, String(surTiles));
  // جابر: اقترح لي
  await bulkRow('جابر الثالث').locator('select.bs-scope').selectOption('suggest');
  await bulkRow('جابر الثالث').locator('.bs-sugg').waitFor({ timeout: 15000 });
  await sleep(500);
  const sug = await bulkRow('جابر الثالث').locator('.bs-sugg').innerText();
  check('D3 «اقترح لي»: يعرض ما اقترحه النظام', /يقترح النظام|مغطّى حديثاً/.test(sug), sug.slice(0, 80));

  console.log('\n=== التحقق قبل التجهيز ===');
  await page.click('#bs-prep'); await sleep(600);
  const toast1 = await page.locator('.bs-toast').innerText().catch(() => '');
  check('E1 «محددة» بلا اختيار تمنع التجهيز برسالة تسمّي الطالب', /أحمد الأول/.test(toast1) && createdCount() === 0, toast1);
  check('E2 لم يُجهَّز شيء بسبب ذلك', (await page.locator('.bs-pill.ok').count()) === 0);

  // أحمد: أول بطاقة حزب؛ بلال: سورة الناس فقط
  await bulkRow('أحمد الأول').locator('.bs-tile').first().click();
  const pickedHizb = await bulkRow('أحمد الأول').locator('.bs-tile.on').first().getAttribute('data-k');
  await bulkRow('بلال الثاني').locator('.bs-tile[data-k="114"]').click();
  await bulkRow('بلال الثاني').locator('.bs-tile[data-k="113"]').click();
  check('E3 النقر على بطاقة يحدّدها ويحدّث العدّاد', (await bulkRow('بلال الثاني').locator('.bs-tile.on').count()) === 2 && /\(2 \//.test(await bulkRow('بلال الثاني').locator('.bs-sub .t').innerText()));
  await bulkRow('بلال الثاني').locator('[data-a="clear"]').click();
  check('E4 «مسح» يفرّغ الاختيار', (await bulkRow('بلال الثاني').locator('.bs-tile.on').count()) === 0);
  await bulkRow('بلال الثاني').locator('[data-a="all"]').click();
  check('E5 «تحديد الكل» يحدّد كل السور', (await bulkRow('بلال الثاني').locator('.bs-tile.on').count()) === surTiles);
  await bulkRow('بلال الثاني').locator('[data-a="clear"]').click();
  await bulkRow('بلال الثاني').locator('.bs-tile[data-k="114"]').click();
  await bulkRow('بلال الثاني').locator('.bs-tile[data-k="113"]').click();
  // عدد الأسئلة: الحد الأدنى 20 (أحمد ينزل فيقف عند 20)، جابر يزيد درجتين فيصير 22
  for (let i = 0; i < 4; i++) await bulkRow('أحمد الأول').locator('[data-q="-1"]').click();
  for (let i = 0; i < 2; i++) await bulkRow('جابر الثالث').locator('[data-q="1"]').click();
  const qs = { a: await bulkRow('أحمد الأول').locator('.bs-qn span').innerText(), g: await bulkRow('جابر الثالث').locator('.bs-qn span').innerText() };
  check('E6 أزرار +/− تغيّر عدد أسئلة كل طالب على حدة', qs.a === '20' && qs.g === '22', JSON.stringify(qs));
  await shot(page, 'bulk-2-scopes');

  console.log('\n=== التجهيز (دون نشر) ===');
  const reqsBefore = apiLog.filter(a => a.action === 'createHomework').length;
  await page.click('#bs-prep');
  await page.waitForFunction(() => document.querySelectorAll('.bs-pill.ok').length >= 3 || document.querySelectorAll('.bs-pill.err').length >= 1, null, { timeout: 90000 });
  await sleep(1200);
  const prepared = await page.evaluate(() => [...document.querySelectorAll('.bs-rw')].map(r => ({ name: r.querySelector('.bs-nm').innerText, ok: !!r.querySelector('.bs-pill.ok'), sum: r.querySelector('.bs-sum')?.innerText || '' })));
  check('F1 جُهّز الطلاب الثلاثة المحدَّدون', prepared.filter(p => p.ok).length === 3, JSON.stringify(prepared.filter(p => p.ok).map(p => p.name)));
  const nOf = (nm) => parseInt((prepared.find(p => p.name.includes(nm)).sum.match(/^(\d+)/) || [])[1] || '0');
  check('F2 عدد أسئلة كل واحد ≥ المطلوب له (20 / ≥20 / 22؛ الحد الأدنى 20) وفيه توزيع الفئات', nOf('أحمد') >= 20 && nOf('أحمد') <= 22 && nOf('بلال') >= 20 && nOf('جابر') >= 22, JSON.stringify(prepared.map(p => p.name + ':' + p.sum)));
  check('F3 التجهيز لا ينشر شيئاً على الخادم', apiLog.filter(a => a.action === 'createHomework').length === reqsBefore, String(apiLog.filter(a => a.action === 'createHomework').length));
  check('F4 زر «انشر» مفعَّل الآن', !(await page.locator('#bs-pub').isDisabled()));
  await shot(page, 'bulk-3-prepared');

  console.log('\n=== النشر ===');
  const before = await page.evaluate(async () => { const { AppState } = await import('/core/app.js'); return (await AppState.homeworkManager.getAllHomeworks()).length; });
  await page.click('#bs-pub');
  await page.waitForSelector('#bs-links.on .bs-lk', { timeout: 120000 });
  await sleep(800);
  check('G1 نُشر ثلاثة واجبات على الخادم (واحد لكل طالب)', createdCount() === 3, String(createdCount()));
  const homes = await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const all = await AppState.homeworkManager.getAllHomeworks();
    return all.map(h => ({ id: h.id, status: h.status, who: h.assignedStudentName, n: h.questions.length, label: h.scope && h.scope.label, smart: h.scope && h.scope.smart,
      tracked: Object.keys(h.tracking || {}).length, metaSurahs: [...new Set(Object.values(h.tracking || {}).map(m => m.surah))], segs: Object.values(h.tracking || {}).map(m => m.segment), cloud: h.cloudConfirmed }));
  });
  const mine = homes.filter(h => ['أحمد الأول', 'بلال الثاني', 'جابر الثالث'].includes(h.who));
  check('G2 ثلاث نسخ محلية منشورة بأسماء الطلاب الصحيحة', mine.length === 3 && mine.every(h => h.status === 'published' && h.cloud) && homes.length === before + 3, JSON.stringify(mine.map(h => h.who + ':' + h.n)));
  check('G3 كل واجب فيه خريطة تتبّع لأسئلته ونطاق «ذكي»', mine.every(h => h.tracked >= 1 && h.smart === true && h.label), JSON.stringify(mine.map(h => h.label)));
  const bilal = mine.find(h => h.who === 'بلال الثاني'), ahmad = mine.find(h => h.who === 'أحمد الأول'), jaber = mine.find(h => h.who === 'جابر الثالث');
  check('G4 واجب بلال: أسئلته من سورتَي الناس والفلق فقط (النطاق المختار لا كل حفظه)', bilal.metaSurahs.every(s => s === 114 || s === 113) && bilal.metaSurahs.length >= 1, JSON.stringify(bilal.metaSurahs));
  check('G5 واجب بلال: نص النطاق في الرسالة يذكر السورتين', /الناس/.test(norm(bilal.label)) && /الفلق/.test(norm(bilal.label)), bilal.label);
  const hizbOk = await page.evaluate(async (hz) => {
    const { AppState } = await import('/core/app.js');
    const ts = await import('/core/trackingService.js');
    const st = (await AppState.studentManager.getAllStudents()).find(s => s.name === 'أحمد الأول');
    const ctx = await ts.loadContext(st); const model = await ts.buildSelectionModel(st, ctx);
    const g = model.groups.find(x => x.id === hz.id); if (!g) return { err: 'group-not-found', want: hz.id };
    const hw = (await AppState.homeworkManager.getAllHomeworks()).find(h => h.assignedStudentName === 'أحمد الأول');
    const segs = Object.values(hw.tracking).map(m => m.segment);
    return { inside: segs.every(s => g.segIds.includes(s)), n: segs.length, label: hw.scope.label };
  }, { id: pickedHizb });
  check('G6 واجب أحمد: كل أسئلته من الحزب/الربع الذي اختاره فقط', hizbOk.inside === true && hizbOk.n >= 1, JSON.stringify(hizbOk));
  check('G7 واجب جابر («اقترح لي»): يحوي ≥12 سؤالاً ونطاقاً مكتوباً', jaber.n >= 12 && !!jaber.label, `${jaber.n} / ${jaber.label}`);
  const pub = await page.evaluate(async (id) => { const m = await import('/core/homeworkApi.js'); const h = await m.fetchPublicHomework(id); return h ? { n: (h.questions || []).length, leaksAnswers: JSON.stringify(h).includes('correctAnswer"') && false } : null; }, ahmad.id);
  check('G8 رابط الطالب يجلب الواجب من الخادم فعلاً', pub && pub.n === ahmad.n, JSON.stringify(pub));

  console.log('\n=== الروابط والرسائل ===');
  const links = await page.evaluate(() => [...document.querySelectorAll('.bs-lk')].map(l => ({ name: l.querySelector('b').innerText, url: l.querySelector('.u').innerText, btns: [...l.querySelectorAll('button')].map(b => b.className) })));
  check('L1 ثلاثة صفوف روابط، لكل واحد نسخ/واتساب/تيليجرام', links.length === 3 && links.every(l => /\?hw=HW_/.test(l.url) && l.btns.join().includes('cp') && l.btns.join().includes('wa') && l.btns.join().includes('tg')), JSON.stringify(links.map(l => l.name)));
  check('L2 الرابط يطابق معرّف الواجب المنشور لنفس الطالب', links.every(l => { const h = mine.find(x => x.who === l.name); return h && l.url.endsWith('?hw=' + h.id); }));
  await page.evaluate(() => { window.__opened = []; window.open = (u) => { window.__opened.push(String(u)); return null; }; });
  await page.locator('.bs-lk', { hasText: 'بلال الثاني' }).locator('.wa').click();
  await page.locator('.bs-lk', { hasText: 'بلال الثاني' }).locator('.tg').click();
  const opened = await page.evaluate(() => window.__opened);
  const wa = decodeURIComponent(opened[0] || ''), tg = decodeURIComponent(opened[1] || '');
  check('L3 واتساب: wa.me برسالة فيها اسم الطالب والنطاق والرابط', /^https:\/\/wa\.me\//.test(opened[0] || '') && wa.includes('بلال الثاني') && /الناس/.test(norm(wa)) && wa.includes(bilal.id), wa.slice(0, 160));
  check('L4 تيليجرام: t.me/share بالرابط', /^https:\/\/t\.me\/share\/url\?url=/.test(opened[1] || '') && tg.includes(bilal.id));
  check('L5 صف الطالب الذي أُرسل له يُعلَّم', await page.locator('.bs-lk.sent', { hasText: 'بلال الثاني' }).count() === 1);
  await page.evaluate(() => { window.__clip = null; Object.defineProperty(navigator, 'clipboard', { value: { writeText: async (t) => { window.__clip = t; } }, configurable: true }); });
  await page.click('#bs-copy-all'); await sleep(300);
  const clip = await page.evaluate(() => window.__clip);
  check('L6 «نسخ الكل»: رسائل الثلاثة معاً', clip && ['أحمد الأول', 'بلال الثاني', 'جابر الثالث'].every(n => clip.includes(n)) && (clip.match(/\?hw=HW_/g) || []).length === 3);
  await shot(page, 'bulk-4-links');

  console.log('\n=== بعد النشر: الصفوف والمستحقون ===');
  const afterNames = await names();
  check('P1 المنشور لهم الثلاثة غادروا الجدول (روابطهم في القائمة أسفله) وبقي المضافون بالبحث غير المحدَّدين', !afterNames.some(n => ['أحمد الأول', 'بلال الثاني', 'جابر الثالث'].includes(n)) && afterNames.length === 4, JSON.stringify(afterNames));
  const reqs = createdCount();
  await page.click('#bs-pub', { timeout: 1500 }).catch(() => {}); await page.click('#bs-prep', { timeout: 1500 }).catch(() => {}); await sleep(500);
  check('P2 زرّا «جهّز/انشر» بعد النشر لا ينشران شيئاً مرة ثانية (لا محدَّد ولا مجهَّز)', createdCount() === reqs);
  await page.click('.bs-ov [data-act="close"]'); await sleep(1500);
  const dueNow = await page.evaluate(async () => { const m = await import('/core/hwScheduleService.js'); return (await m.listDueToday()).rows.map(r => r.student.name); });
  check('P3 الطلاب الثلاثة اختفوا من «مستحق اليوم» تلقائياً', !dueNow.some(n => ['أحمد الأول', 'بلال الثاني', 'جابر الثالث'].includes(n)), JSON.stringify(dueNow));

  console.log('\n=== فشل نشر واحد لا يُسقط الباقي ===');
  await openBulk();
  check('R-1 فتح الشاشة بعد نشر كل المستحقين: القائمة فارغة وفيها رسالة «لا طلاب مستحقون» وتدعو للبحث', (await page.locator('.bs-rw').count()) === 0 && /لا طلاب مستحقون الآن/.test(await page.locator('#bs-noresult').innerText()));
  await page.fill('#bs-q', 'احمد');
  const recentTxt = await page.locator('.bs-res-i', { hasText: 'أحمد' }).innerText();
  check('R0 من نُشر له قبل قليل يُنبَّه عليه في نتيجة البحث («نُشر له حديثاً»)', /نُشر له حديثاً/.test(recentTxt), recentTxt.replace(/\s+/g, ' '));
  await page.fill('#bs-q', '');
  await addByName('دعاء'); await addByName('أحمد');
  for (let i = 0; i < 2; i++) await bulkRow('دعاء الرابعة').locator('[data-q="-1"]').click();
  await page.click('#bs-prep');
  await page.waitForFunction(() => document.querySelectorAll('.bs-pill.ok').length >= 2, null, { timeout: 90000 });
  await sleep(500);
  const created0 = createdCount();
  failNextCreate = 1;
  await page.click('#bs-pub');
  await page.waitForFunction(() => document.querySelectorAll('#bs-links .bs-lk').length >= 1 && document.querySelectorAll('.bs-pill.err').length >= 1 && !document.querySelector('.bs-pill.wait'), null, { timeout: 120000 });
  await sleep(800);
  const st2 = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.bs-rw')].map(r => ({ name: r.querySelector('.bs-nm').innerText, err: r.querySelector('.bs-pill.err')?.innerText || '', note: r.querySelector('.bs-sum')?.innerText || '' })), links: [...document.querySelectorAll('#bs-links .bs-lk b')].map(b => b.innerText) }));
  check('X1 نُشر واحد (غادر الجدول إلى الروابط) وفشل واحد (بقي مجهَّزاً برسالة سبب)', st2.rows.length === 1 && /تعذّر النشر/.test(st2.rows[0].err) && st2.links.length === 1 && createdCount() === created0 + 1, JSON.stringify(st2));
  check('X2 زر «انشر» يبقى مفعَّلاً لإعادة المحاولة', !(await page.locator('#bs-pub').isDisabled()));
  await page.click('#bs-pub');
  await page.waitForFunction(() => document.querySelectorAll('#bs-links .bs-lk').length >= 2 && document.querySelectorAll('.bs-rw').length === 0, null, { timeout: 120000 });
  await sleep(500);
  check('X3 إعادة المحاولة تنشر الفاشل فقط (لا تكرار للناجح) وتخلو القائمة', createdCount() === created0 + 2, `${createdCount() - created0}`);
  const dupes = await page.evaluate(async () => { const { AppState } = await import('/core/app.js'); const all = (await AppState.homeworkManager.getAllHomeworks()).filter(h => h.status === 'published'); const c = {}; all.forEach(h => { c[h.assignedStudentName] = (c[h.assignedStudentName] || 0) + 1; }); return c; });
  check('X4 لا واجب مكرر لأي طالب (دعاء=1، أحمد=2: واحد في الدفعة الأولى وواحد الآن)', dupes['دعاء الرابعة'] === 1 && dupes['أحمد الأول'] === 2 && dupes['بلال الثاني'] === 1, JSON.stringify(dupes));
  check('X5 قائمة الروابط تراكمية: تضم الاثنين المنشورين في هذه الجلسة', (await page.locator('#bs-links .bs-lk').count()) === 2);

  console.log('\n=== إغلاق مع واجب مجهَّز لم يُنشر ===');
  await page.click('.bs-ov [data-act="close"]'); await sleep(500);
  await openBulk();
  await addByName('جابر'); await addByName('بلال');
  for (const n of ['جابر الثالث', 'بلال الثاني']) for (let i = 0; i < 7; i++) await bulkRow(n).locator('[data-q="-1"]').click();
  await page.click('#bs-prep');
  await page.waitForFunction(() => document.querySelectorAll('.bs-pill.ok').length >= 2, null, { timeout: 90000 });
  await page.click('#bs-prep').catch(() => {}); await sleep(400);
  check('Q0 «جهّز» مرة ثانية لا يعيد توليد المجهَّز (يخبرك أنه جاهز)', /مجهَّزون/.test(await page.locator('.bs-toast').innerText().catch(() => '')) && (await page.locator('.bs-pill.ok').count()) === 2);
  dialogMode = 'dismiss';
  await page.click('.bs-ov [data-act="close"]'); await sleep(400);
  check('Q1 الإغلاق مع مجهَّز يطلب تأكيداً، والرفض يُبقي الشاشة', (await page.locator('.bs-ov').count()) === 1);
  dialogMode = 'accept';
  await page.click('.bs-ov [data-act="close"]'); await sleep(400);
  check('Q2 قبول التأكيد يغلق الشاشة', (await page.locator('.bs-ov').count()) === 0);
  dialogMode = 'dismiss';

  console.log('\n=== الجوال ===');
  await page.setViewportSize({ width: 390, height: 844 });
  await openBulk();
  await addByName('جابر');
  await bulkRow('جابر الثالث').locator('select.bs-scope').selectOption('hizb'); await sleep(1200);
  const mob = await page.evaluate(() => ({ hscroll: document.documentElement.scrollWidth > innerWidth || document.querySelector('.bs-ov').scrollWidth > document.querySelector('.bs-ov').clientWidth + 2, hdHidden: getComputedStyle(document.querySelector('.bs-hd')).display === 'none', barVisible: !!document.querySelector('.bs-bar').offsetParent || getComputedStyle(document.querySelector('.bs-bar')).position === 'fixed' }));
  check('M1 على الجوال: لا تمرير أفقي، الصفوف بطاقات، والشريط السفلي ظاهر', !mob.hscroll && mob.hdHidden && mob.barVisible, JSON.stringify(mob));
  await shot(page, 'bulk-5-mobile');
  await page.click('.bs-ov [data-act="close"]').catch(() => {}); dialogMode = 'accept'; await page.click('.bs-ov [data-act="close"]').catch(() => {}); dialogMode = 'dismiss'; await sleep(400);
  await page.setViewportSize({ width: 1180, height: 900 });

  console.log('\n=== المسار العادي لم ينكسر ===');
  await dismissMonthly();
  await page.evaluate(() => document.getElementById('btn-hero-new').click()); await sleep(600);
  await page.fill('#hw-target-student-search', 'دعاء'); await sleep(300);
  await page.click('.hwp2-student-result'); await sleep(1800);
  const beforeN = createdCount();
  await page.fill('#hw-q-count-smart', '10');
  await page.click('#btn-generate-publish');
  await page.waitForSelector('#hw-share-modal', { state: 'visible', timeout: 60000 });
  await sleep(800);
  check('N1 «توليد ونشر مباشرة» العادي ما زال ينشر لطالب واحد وتظهر نافذة المشاركة', createdCount() === beforeN + 1 && /hw=/.test(await page.inputValue('#hw-link-input')));
  await page.click('#btn-close-hw-modal'); await sleep(500);
  check('N2 لا يوجد أي أثر متبقٍّ لشاشة الإرسال الجماعي بعد الإغلاق', (await page.locator('.bs-ov, .bs-bar, .bs-toast').count()) === 0);

  console.log('\n=== الدفعات: من يُنشر لهم يغادرون ويحلّ مكانهم مستحقون آخرون ===');
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const by = (n) => AppState.surahsData.find(s => s.number === n).name;
    const mgr = AppState.studentManager;
    for (const nm of ['الدفعة أ', 'الدفعة ب', 'الدفعة ج', 'الدفعة د', 'الدفعة هـ', 'الدفعة و', 'الدفعة ز']) await mgr.addStudent({ name: nm, type: 'adult', memoFrom: by(114), memoTo: by(80) });
    for (const s of await mgr.getAllStudents()) if (s.name.startsWith('الدفعة')) { s.hwSchedule = { days: [new Date().getDay()], startTs: Date.now() - 86400000 * 3, auto: false }; await mgr.updateStudent(s); }
    try { localStorage.setItem('dh_bulk_batch', '5'); } catch (e) { /* لا شيء */ }
  });
  await openBulk();
  let bn = await names();
  const first5 = bn.slice();
  const metaTxt = await page.locator('#bs-meta-t').innerText();
  check('D1 سبعة مستحقين والدفعة 5: يظهر خمسة محدَّدين، ويذكر السطر أن مستحقَّين آخرَين ينتظران', bn.length === 5 && bn.every(n => n.startsWith('الدفعة')) && /2 مستحقاً آخرين ينتظرون/.test(metaTxt) && (await checkedNames()).length === 5, `${bn.length} | ${metaTxt}`);
  await page.fill('#bs-bulk-q', '3'); await page.click('[data-act="apply"]');
  await page.click('#bs-prep');
  await page.waitForFunction(() => document.querySelectorAll('.bs-pill.ok').length >= 5, null, { timeout: 120000 });
  await page.click('#bs-pub');
  await page.waitForFunction(() => document.querySelectorAll('#bs-links .bs-lk').length >= 5 && document.querySelectorAll('.bs-rw').length === 2, null, { timeout: 120000 });
  await sleep(500);
  bn = await names();
  const metaAfter = await page.locator('#bs-meta-t').innerText();
  check('D2 بعد نشر الخمسة غادروا الجدول وحلّ مكانهم المستحقان الباقيان، ولا منتظرين بعدهما', bn.length === 2 && bn.every(n => n.startsWith('الدفعة') && !first5.includes(n)) && !/ينتظرون/.test(metaAfter), `${JSON.stringify(bn)} | ${metaAfter}`);
  check('D3 الداخلان تلقائياً محدَّدان وغير مجهَّزين (لا ينشر شيء قبل «جهّز» و«انشر»)', (await checkedNames()).length === 2 && (await page.locator('.bs-pill.ok').count()) === 0 && (await page.locator('#bs-links .bs-lk').count()) === 5);
  const pubBefore = createdCount();
  await page.fill('#bs-bulk-q', '3'); await page.click('[data-act="apply"]');
  await page.click('#bs-prep');
  await page.waitForFunction(() => document.querySelectorAll('.bs-pill.ok').length >= 2, null, { timeout: 90000 });
  await page.click('#bs-pub');
  await page.waitForFunction(() => document.querySelectorAll('#bs-links .bs-lk').length >= 7 && document.querySelectorAll('.bs-rw').length === 0, null, { timeout: 120000 });
  await sleep(400);
  check('D4 بعد نشر آخر دفعة تخلو القائمة وتظهر رسالة «🎉 انتهيت من كل المستحقين» وقائمة الروابط فيها السبعة', /انتهيت من كل المستحقين/.test(await page.locator('#bs-noresult').innerText()) && (await page.locator('#bs-links .bs-lk').count()) === 7 && createdCount() === pubBefore + 2);
  await shot(page, 'bulk-7-done');
  await page.evaluate(() => { try { localStorage.removeItem('dh_bulk_batch'); } catch (e) { /* لا شيء */ } });

  check('Z لا أخطاء جافاسكربت غير ملتقطة', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));
} catch (e) {
  console.log('اختبار توقف بخطأ:', e && e.stack || e);
  results.push({ name: 'اكتمال الاختبار', ok: false });
}
await browser.close(); srv.close();
const passed = results.filter(r => r.ok).length;
console.log(`\n${passed}/${results.length} checks passed`);
process.exit(passed === results.length ? 0 : 1);
