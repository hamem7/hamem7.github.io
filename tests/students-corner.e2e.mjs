// tests/students-corner.e2e.mjs — ركن «طلابي» بعد إعادة الترتيب (محور واحد + ثلاثة تبويبات) داخل المنصة الحقيقية (index.html).
// يفحص: التبويبات، زر «تعديل» الظاهر بجوار الاسم، البحث، «هذا الشهر»، «الحصص والحضور» بحفظ تلقائي (٣٠/٤٥/٦٠ فقط)،
// التخطيط العريض، اللغتان والمظهر الداكن. الاستعمال:
//   PLAYWRIGHT_MODULE_DIR=$(dirname $(npm root -g)) PW_CHROMIUM=/opt/pw-browsers/chromium SHOTS=/tmp/shots node tests/students-corner.e2e.mjs
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(REPO, p);
  if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
await new Promise(r => srv.on('listening', r)); const WEB = `http://localhost:${srv.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  try { const seen = {}; ['home', 'install', 'kids', 'adults', 'homework', 'certificates', 'dual', 'my_students', 'my_students2'].forEach(k => { seen[k] = true; }); localStorage.setItem('dh_seen_tours', JSON.stringify(seen)); } catch (e) {}
  // alert/confirm صارا نافذتين مخصصتين (core/dialog.js): نضغط «موافق» تلقائيًا كما يفعل المعلم
  new MutationObserver(() => { const ov = document.querySelector('.ham-dialog-overlay'); if (!ov || ov.dataset.seen) return; ov.dataset.seen = '1'; setTimeout(() => ov.querySelector('.ham-dialog-btn:not(.ham-dialog-btn-cancel)')?.click(), 60); }).observe(document, { childList: true, subtree: true });
  try { localStorage.setItem('darham_monthly_memo_bulk_last_auto_shown', new Date().toISOString().slice(0, 10)); } catch (e) {}
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => { errors.push(e.message); console.log('   [pageerror]', e.message); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0; const check = (n, c, d = '') => { c ? ok++ : bad++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const shot = async (n) => { if (process.env.SHOTS) { fs.mkdirSync(process.env.SHOTS, { recursive: true }); await page.screenshot({ path: path.join(process.env.SHOTS, n + '.png') }); } };
const students = () => page.evaluate(async () => { const { AppState } = await import('/core/app.js'); return await AppState.studentManager.getAllStudents(); });

try {
  await page.goto(WEB + '/index.html'); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(800);
  await page.evaluate(async () => {
    const { AppState } = await import('/core/app.js'); const m = AppState.studentManager;
    const by = (n) => AppState.surahsData.find(s => s.number === n).name;
    await m.addStudent({ name: 'أحمد محمد علي', type: 'adult', gender: 'boy', grade: 'الثالث الابتدائي', memoFrom: by(114), memoTo: by(78) });
    await m.addStudent({ name: 'مريم عبدالله حسن', type: 'adult', gender: 'girl', grade: 'الأول الإعدادي', memoFrom: by(114), memoTo: by(80) });
    await m.addStudent({ name: 'خالد حسام الدين', type: 'adult', gender: 'boy', memoFrom: by(114), memoTo: by(82), schedule: { days: [0, 2], minutes: 90, since: Date.now() } });
  });
  await page.reload(); await page.waitForSelector('#btn-my-students-main', { timeout: 30000 }); await sleep(2000);
  await page.evaluate(() => { document.querySelector('.mmt-overlay')?.remove(); document.querySelector('.dh-tour-skip')?.click(); });
  await page.evaluate(() => document.getElementById('btn-my-students-main').click());
  await page.waitForSelector('#ms-screen', { timeout: 15000 }); await sleep(1500);

  console.log('\n=== الهيكل ===');
  check('T1 ثلاثة تبويبات', (await page.locator('#ms-tabs .ms-tab').count()) === 3);
  check('T2 تبويب «الطلاب» هو المفتوح افتراضيًا', await page.isVisible('#ms-pane-students') && !(await page.isVisible('#ms-pane-month')));
  check('T3 شريط الأرقام الثلاثة ظاهر', await page.isVisible('#ms-stats') && (await page.textContent('#ms-stat-students')).trim() === '3');
  check('T4 لا يوجد صف اختصارات ولا بطاقة «سجل الطلاب» القديمة', (await page.locator('#btn-all-students, .ms-quick').count()) === 0);
  const wide = await page.evaluate(() => document.getElementById('ms-screen').getBoundingClientRect().width);
  check('T5 على الشاشة العريضة يملأ الركن العرض (> 900px) بعمودين', wide > 900, `${Math.round(wide)}px`);
  await shot('1-students-wide');

  console.log('\n=== تبويب الطلاب ===');
  check('S1 ثلاث بطاقات طلاب', (await page.locator('#all-students-body .as-row').count()) === 3);
  const edit = page.locator('#all-students-body .as-row', { hasText: 'مريم' }).locator('.as-edit');
  check('S2 زر «تعديل» ظاهر في البطاقة (ليس داخل قائمة ⋯ المخفية)', await edit.isVisible() && (await edit.evaluate(e => !e.closest('.as-menu'))));
  await edit.click(); await sleep(400);
  check('S3 الضغط على «تعديل» يفتح نافذة التعديل بالاسم الصحيح', await page.isVisible('#edit-modal') && (await page.inputValue('#edit-stu-name')) === 'مريم عبدالله حسن');
  await page.click('#btn-close-edit-modal'); await sleep(200);
  await page.fill('#as-search', 'خالد'); await sleep(200);
  check('S4 البحث يُظهر طالبًا واحدًا', (await page.locator('#all-students-body .as-row:visible').count()) === 1);
  await page.fill('#as-search', '');
  await page.locator('#all-students-body .as-row', { hasText: 'أحمد' }).locator('.as-more').click();
  check('S5 قائمة ⋯ فيها «إخفاء» و«حذف» فقط (بلا «تعديل»)', (await page.locator('#all-students-body .as-menu-wrap.open .as-menu button').count()) === 2);
  await page.keyboard.press('Escape'); await page.click('#ms-screen .ms-title'); await sleep(200);
  await page.click('#btn-add-student'); await sleep(300);
  check('S6 زر «طالب جديد» الوحيد يفتح نافذة الإضافة', await page.isVisible('#add-modal'));
  await page.click('#btn-close-add-modal'); await sleep(200);

  console.log('\n=== تبويب هذا الشهر ===');
  await page.click('#ms-tabs [data-tab="month"]'); await sleep(300);
  check('M1 خطوتان ظاهرتان وزراهما', await page.isVisible('#btn-monthly-memo-bulk') && await page.isVisible('#btn-monthly-reports-hub'));
  const memoN = (await page.textContent('#ms-stat-memo')).trim();
  check('M2 «المطلوب الآن» يطابق عدد المنتظرين', memoN === '—' || (await page.isVisible('#ms-reminder')) === (memoN !== '0'), `memo=${memoN}`);
  await page.click('#btn-monthly-memo-bulk'); await sleep(1200);
  check('M3 زر الحفظ الشهري يفتح الشاشة الجماعية', (await page.locator('.sh-overlay, .mmb-overlay').count()) > 0);
  await page.evaluate(() => document.querySelector('.sh-overlay .sh-back, .mmb-overlay [data-act="back"], .mmb-overlay .mmb-x')?.click()); await sleep(500);
  await page.evaluate(() => { document.querySelectorAll('.sh-overlay, .mmb-overlay').forEach(e => e.remove()); });

  console.log('\n=== تبويب الحصص والحضور (حفظ تلقائي) ===');
  await page.click('#ms-tabs [data-tab="sched"]'); await sleep(800);
  check('H1 الأسماء كاملة', (await page.locator('#ms-sched-body .ms-acc-h .nm b').allTextContents()).includes('مريم عبدالله حسن'));
  check('H2 لا يوجد أي زر «حفظ» في هذا التبويب', (await page.locator('#ms-sched-body #sched-save, #ms-sched-body [data-sm-save]').count()) === 0);
  await page.locator('#ms-sched-body .ms-acc', { hasText: 'مريم' }).locator('.ms-acc-h').click(); await sleep(200);
  const box = page.locator('#ms-sched-body .ms-acc.open');
  check('H3 الضغط على الاسم يفتح قائمة الأيام تحته', await box.locator('.ms-dayp').isVisible());
  check('H4 خيارات المدة ٣٠ و٤٥ و٦٠ فقط', (await box.locator('.ms-minp button').allTextContents()).join(',') === '30,45,60');
  await box.locator('[data-sm-day="1"]').click(); await sleep(500);
  // أول جدول يُحفظ في المنصة يفتح سؤال «متى يظهر سؤال الحضور؟» مرة واحدة (سلوك قائم): نختار أول خيار كما يفعل المعلم
  check('H3b أول جدول يُحفظ يفتح سؤال وقت الحضور مرة واحدة', await page.isVisible('#dhAttTime'));
  await page.evaluate(() => document.querySelector('#dhAttTime button')?.click()); await sleep(500);
  await page.locator('#ms-sched-body .ms-acc.open [data-sm-day="3"]').click(); await sleep(400);
  await page.locator('#ms-sched-body .ms-acc.open [data-sm-min="45"]').click(); await sleep(600);
  const mar = (await students()).find(s => s.name.startsWith('مريم'));
  check('H5 حُفظت الأيام والمدة تلقائيًا في سجل الطالب', mar.schedule && JSON.stringify(mar.schedule.days) === '[1,3]' && mar.schedule.minutes === 45, JSON.stringify(mar.schedule));
  const h6 = [await page.locator('#ms-sched-body .ms-acc.open .ms-saved').textContent(), await page.locator('#ms-sched-body .ms-acc.open .nm small').textContent()];
  check('H6 ظهر «حُفظ تلقائيًا» وتحدّث الملخص تحت الاسم', /حفظ/.test(h6[0]) && /الثلاثاء|الإثنين|الأربعاء/.test(h6[1]), h6.join(' / '));
  await page.locator('#ms-sched-body .ms-acc', { hasText: 'خالد' }).locator('.ms-acc-h').click(); await sleep(200);
  check('H7 مدة قديمة (٩٠) لطالب سابق تبقى ظاهرة ولا تُفقد', (await page.locator('#ms-sched-body .ms-acc.open .ms-minp button').allTextContents()).join(',') === '30,45,60,90');
  await shot('2-sched-wide');

  console.log('\n=== الجوال / الإنجليزية / الداكن ===');
  await page.setViewportSize({ width: 400, height: 860 }); await sleep(300);
  check('R1 على الجوال لا تمرير أفقي', await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await page.click('#ms-tabs [data-tab="students"]'); await sleep(200); await shot('3-students-mobile');
  await page.evaluate(() => window.DHTheme.set('dark')); await sleep(300); await shot('4-students-dark');
  await page.evaluate(() => document.getElementById('lang-toggle-btn').click()); await sleep(1200);
  await page.evaluate(() => window.DHTheme.set('light'));
  const tabsEn = await page.locator('#ms-tabs .ms-tab').allTextContents();
  check('R2 التبويبات بالإنجليزية', /Students/.test(tabsEn[0]) && /month/i.test(tabsEn[1]) && /Schedule/.test(tabsEn[2]), tabsEn.join('|'));
  check('R3 زر التعديل بالإنجليزية', /Edit/.test(await page.locator('#all-students-body .as-edit').first().textContent()));
  check('R4 «المطلوب الآن» بالإنجليزية', /waiting/i.test(await page.textContent('#ms-reminder-text')), await page.textContent('#ms-reminder-text'));
  await shot('5-students-en');
  check('E1 لا أخطاء JavaScript', errors.length === 0, errors.join(' | '));
} catch (e) { console.log('FATAL', e); bad++; }
console.log(`\n${ok} passed, ${bad} failed`);
await browser.close(); srv.close(); process.exit(bad ? 1 : 0);
