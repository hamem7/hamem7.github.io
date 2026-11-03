// tests/scope-extras.e2e.mjs — «السور الإضافية خارج المسار المتصل»: المحرّر داخل المنصة (إضافة/تعديل طالب) والتخزين.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/path/to/node_modules node tests/scope-extras.e2e.mjs [siteRoot]
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
  // الجولة التعريفية ونافذة «الحفظ الشهري» تغطيان الشاشة للمستخدم الجديد: تُزالان كما يفعل المعلم عند إغلاقهما
  await page.evaluate(() => setInterval(() => document.querySelectorAll('.dh-tour-root,.mmt-overlay,.mmb-overlay,.ham-dialog-overlay').forEach(e => e.remove()), 150));

  console.log('\n=== إضافة طالب: الخطوة 3 ===');
  await page.evaluate(() => document.getElementById('btn-my-students-main').click());
  await page.waitForSelector('#btn-add-student', { timeout: 15000 });
  await page.click('#btn-add-student');
  await page.waitForSelector('#stu-name', { state: 'visible' });
  await page.fill('#stu-name', 'طالب السور المتفرقة');
  await page.click('#add-gender-seg button[data-g="boy"]');
  for (let i = 0; i < 2; i++) { await page.click('#btn-add-step-next'); await sleep(150); }
  const ed = page.locator('#stu-extra-box .dhx-box');
  check('E1 المحرّر ظاهر في الخطوة 3 تحت المسار المتصل', await ed.isVisible());
  check('E2 العنوان يوضّح أنها سور إضافية خارج المسار المتصل', /خارج المسار المتصل/.test(await ed.innerText()));
  check('E3 زرّان: سورة متفرقة / عدة سور', (await ed.locator('[data-open]').count()) === 2);
  await pickTo(36);
  await sleep(100);
  // سورة متفرقة (كاملة)
  await openPanel(ed, 'one');
  await ed.locator('[data-one-surah]').selectOption('18');
  await ed.locator('[data-add-one]').click();
  check('E4 إضافة سورة كاملة (الكهف) تظهر كصف', /الكهف/.test(await ed.locator('.dhx-list').innerText()));
  // جزء من سورة
  await openPanel(ed, 'one');
  await ed.locator('[data-one-surah]').selectOption('10');
  await ed.locator('[data-one-part]').check();
  await ed.locator('[data-one-a1]').fill('1'); await ed.locator('[data-one-a2]').fill('55');
  await ed.locator('[data-add-one]').click();
  check('E5 جزء من سورة (يونس 1–55)', /يونس \(1–55\)/.test(await ed.locator('.dhx-list').innerText()));
  // عدة سور بالشارات: البقرة + آل عمران → تُدمج مع المقاطع المتجاورة
  await openPanel(ed, 'many');
  await ed.locator('[data-chip="2"]').click(); await ed.locator('[data-chip="3"]').click();
  await ed.locator('[data-chip="9"]').click();
  const txt = await ed.locator('.dhx-list').innerText();
  check('E6 الشارات المتجاورة تُدمج في صف واحد (البقرة ← آل عمران)', /البقرة ← آل عمران/.test(txt), txt.replace(/\n/g, ' | '));
  check('E7 سور المسار المتصل مقفلة', (await ed.locator('.dhx-chip.main[disabled]').count()) > 70);
  await ed.locator('[data-chip="3"]').click();   // إزالة آل عمران
  check('E8 إزالة سورة من الوسط تقسم المقطع', !/آل عمران/.test(await ed.locator('.dhx-list').innerText()));
  const stat = await ed.locator('.dhx-stat').innerText();
  check('E9 إحصاء عدد الآيات ظاهر', /إجمالي الحفظ/.test(stat) && /\d/.test(stat), stat.replace(/\n/g, ' | '));
  await shot('add-step3');
  await ed.locator('[data-close]').first().click();
  // مدى
  await openPanel(ed, 'many');
  await ed.locator('[data-rg-from]').selectOption('12'); await ed.locator('[data-rg-to]').selectOption('14');
  await ed.locator('[data-add-range]').click();
  check('E10 مدى بين سورتين (يوسف ← إبراهيم)', /يوسف ← إبراهيم/.test(await ed.locator('.dhx-list').innerText()));
  // تغيير المسار المتصل ليغطي سورة إضافية: تُطرح تلقائيًا
  await pickTo(18);
  await sleep(150);
  check('E11 توسّع المسار المتصل فوق الكهف يحذفه من الإضافي تلقائيًا', !/الكهف/.test(await ed.locator('.dhx-list').innerText()));
  await pickTo(36);
  await sleep(100);
  await openPanel(ed, 'one');
  await ed.locator('[data-one-surah]').selectOption('18'); await ed.locator('[data-add-one]').click();
  await ed.locator('[data-close]').first().click();

  console.log('\n=== الحفظ والتخزين ===');
  await page.click('#btn-add-step-next').catch(() => {});
  await sleep(200);
  const saveBtn = page.locator('#btn-save-new-student, #btn-add-save, [data-act="save-new"]');
  const saveId = await page.evaluate(() => [...document.querySelectorAll('#add-modal button')].filter(b => b.offsetParent && /حفظ/.test(b.innerText)).map(b => b.id));
  console.log('   أزرار الحفظ المرئية:', JSON.stringify(saveId));
  if (saveId[0]) await page.click('#' + saveId[0]);
  await sleep(800);
  const stored = await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const all = await AppState.studentManager.getAllStudents();
    return all.find(s => s.name === 'طالب السور المتفرقة') || null;
  });
  check('S1 الطالب حُفظ مع memoExtra', stored && Array.isArray(stored.memoExtra) && stored.memoExtra.length > 0, JSON.stringify(stored && stored.memoExtra));
  check('S2 المقاطع بترتيب المصحف بلا تداخل مع المسار المتصل', stored && stored.memoExtra.every((e, i, a) => (e.s1 < e.s2 || (e.s1 === e.s2 && e.a1 <= e.a2)) && (i === 0 || a[i - 1].s2 < e.s1 || (a[i - 1].s2 === e.s1 && a[i - 1].a2 < e.a1)) && e.s2 < 36));

  console.log('\n=== ملف الطالب ===');
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    const all = await AppState.studentManager.getAllStudents();
    AppState.currentStudent = all.find(s => s.name === 'طالب السور المتفرقة');
    const m = await import('/student/student.js');
    await m.loadStudentProfileScreen();
  });
  await page.waitForSelector('#prof-scope-card .dhp-card', { timeout: 15000 });
  const card = await page.locator('#prof-scope-card').innerText();
  check('P1 بطاقة نطاق الحفظ تعرض المسار المتصل والسور الإضافية والإحصاء', /الناس/.test(norm(card)) && /سور إضافية/.test(card) && /الكهف/.test(card) && /إجمالي الحفظ/.test(card), card.replace(/\n/g, ' | '));
  await shot('profile-card');

  console.log('\n=== تعديل سريع من ملف الطالب ===');
  await page.evaluate(() => document.getElementById('btn-prof-edit-all').click());
  await page.waitForSelector('#pfe-extra-box .dhx-box', { state: 'visible' });
  const ped = page.locator('#pfe-extra-box .dhx-box');
  check('M1 المحرّر ظاهر في لوحة التعديل ومحمَّل بقيمة الطالب', /الكهف/.test(await ped.locator('.dhx-list').innerText()));
  await ped.locator('.dhx-x').last().click();                       // حذف الكهف
  await openPanel(ped, 'one');
  await ped.locator('[data-one-surah]').selectOption('29'); await ped.locator('[data-add-one]').click();
  check('M2 حذف مقطع وإضافة آخر (العنكبوت)', !/الكهف/.test(await ped.locator('.dhx-list').innerText()) && /العنكبوت/.test(await ped.locator('.dhx-list').innerText()));
  await page.click('#pfe-save');
  await sleep(800);
  const after = await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js');
    return (await AppState.studentManager.getAllStudents()).find(s => s.name === 'طالب السور المتفرقة');
  });
  check('M3 التعديل خُزِّن (العنكبوت موجود والكهف غير موجود)', after.memoExtra.some(e => e.s1 === 29) && !after.memoExtra.some(e => e.s1 === 18), JSON.stringify(after.memoExtra));
  await page.waitForSelector('#prof-scope-card .dhp-card', { timeout: 10000 });
  check('M4 البطاقة تتحدث بعد الحفظ', /العنكبوت/.test(await page.locator('#prof-scope-card').innerText()));

  console.log('\n=== حذف الكل ثم الإنجليزية ===');
  await page.evaluate(() => document.getElementById('btn-prof-edit-all').click());
  await page.waitForSelector('#pfe-extra-box .dhx-box', { state: 'visible' });
  const ped2 = page.locator('#pfe-extra-box .dhx-box');
  while (await ped2.locator('.dhx-x').count()) await ped2.locator('.dhx-x').first().click();
  await page.click('#pfe-save'); await sleep(700);
  const cleared = await page.evaluate(async () => { const { AppState } = await import('/core/app.js'); return (await AppState.studentManager.getAllStudents()).find(s => s.name === 'طالب السور المتفرقة'); });
  check('M5 حذف كل السور الإضافية يزيل الحقل (طالب كما كان)', !('memoExtra' in cleared));
  await page.evaluate(async () => { const { toggleLanguage } = await import('/core/i18n.js'); toggleLanguage(); });
  await sleep(500);
  check('L1 الصفحة صارت إنجليزية LTR', await page.evaluate(() => document.documentElement.dir === 'ltr'));
  await page.evaluate(() => document.getElementById('btn-prof-edit-all').click());
  await page.waitForSelector('#pfe-extra-box .dhx-box', { state: 'visible' });
  const en = await page.locator('#pfe-extra-box .dhx-box').innerText();
  check('L2 نصوص المحرّر بالإنجليزية', /Extra surahs outside the continuous track/.test(en) && /A scattered surah/.test(en) && /Several surahs/.test(en) && /Total memorized/.test(en), en.replace(/\n/g, ' | '));
  await shot('edit-en');
  await page.evaluate(async () => { const { toggleLanguage } = await import('/core/i18n.js'); toggleLanguage(); });
  await sleep(300);

  console.log('\nأخطاء الصفحة:', pageErrors.length);
  check('Z1 لا أخطاء جافاسكربت', pageErrors.length === 0, pageErrors.join(' | '));
} catch (e) {
  await shot('failure').catch(() => {});
  console.log('OVERLAYS', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('body *')].filter(e => { const c = getComputedStyle(e); return c.position === 'fixed' && e.offsetParent !== undefined && e.getBoundingClientRect().width > 300; }).map(e => e.tagName + '#' + e.id + '.' + String(e.className).slice(0, 60))).catch(() => [])));
  console.log('EXCEPTION', e.message); check('X لا استثناء', false, e.message);
}
await browser.close(); srv.close();
const failed = results.filter(r => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} نجح`);
process.exit(failed ? 1 : 0);
