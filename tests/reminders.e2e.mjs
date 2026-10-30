// tests/reminders.e2e.mjs — «تذكيراتي» (منبّه المعلم الشخصي) في متصفح حقيقي: المجموعة في «مهام اليوم»، نموذج الإضافة، التنبيه عند الموعد
// (شريط علوي + نافذة عاجلة)، التأجيل والإكمال، الشاشة الكاملة، النسخة الاحتياطية، المظهر الداكن، والإنجليزية.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=/opt/node-tools/node_modules node tests/reminders.e2e.mjs [outDir]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');
const outDir = process.argv[2] || null; if (outDir) fs.mkdirSync(outDir, { recursive: true });
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.webp': 'image/webp' };
const srv = http.createServer((req, res) => { let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'; const f = path.join(REPO, p);
  if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res); }).listen(0);
await new Promise(r => srv.on('listening', r)); const WEB = `http://localhost:${srv.address().port}`;
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1180, height: 900 } });
await ctx.route('**/*', r => (new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort()));
const page = await ctx.newPage(); const errs = [];
page.on('pageerror', e => { errs.push(e.message); console.log('   [pageerror]', e.message); }); page.on('dialog', d => d.accept().catch(() => {}));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let ok = 0, bad = 0; const check = (n, c, d = '') => { c ? ok++ : bad++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}${d ? '  — ' + d : ''}`); };
const shot = async (n) => { if (outDir) await page.screenshot({ path: path.join(outDir, n + '.png') }); };
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('dh_reminders') || '[]'));

await page.goto(WEB + '/index.html'); await page.waitForSelector('#home-quickcard-reminders .dh-rem-head', { timeout: 30000 }); await sleep(1500);
await page.evaluate(() => { document.querySelector('.dh-tour-skip')?.click(); document.getElementById('whats-new-modal')?.remove(); });

console.log('\n=== المجموعة والإضافة ===');
check('بطاقة «تذكيراتي» مستقلة تحت «مهام اليوم» داخل الغلاف', await page.evaluate(() => { const r = document.getElementById('home-quickcard-reminders'); return !!r && r.previousElementSibling && r.previousElementSibling.id === 'home-quickcard' && r.parentElement.id === 'home-quick-stack'; }));
check('حالة فارغة وزر إضافة', await page.locator('#home-quickcard-reminders .dh-rem-addwide').isVisible());
await page.locator('#home-quickcard-reminders .dh-rem-addwide').click();
check('نموذج الإضافة يفتح', await page.locator('.dh-rem-form .dh-rem-panel').isVisible());
await page.locator('[data-save]').click();
check('حفظ بلا عنوان يعرض خطأ ولا يحفظ', (await page.locator('#dh-rem-f-err').textContent()).trim().length > 0 && (await stored()).length === 0);
await page.fill('#dh-rem-f-title', 'اتصال بولي أمر الطالب أحمد');
await page.locator('[data-kinds] [data-kind="student"]').click();
check('اختيار «طالب» يُظهر قائمة الطلاب', await page.locator('[data-student-wrap]').isVisible());
await page.locator('[data-strip] [data-day]').nth(1).click();
await page.locator('[data-quick] [data-qh="8"]').click();
check('الملخص يوضح «غدًا» والساعة 8:00', /غدًا/.test(await page.locator('#dh-rem-f-sum').innerText()) && /8:00/.test(await page.locator('#dh-rem-f-sum').innerText()));
await page.locator('[data-save]').click();
let list = await stored();
check('حُفظ تذكير واحد بنوع طالب', list.length === 1 && list[0].kind === 'student' && list[0].title.includes('أحمد'));
check('الإضافة لغد صباحاً: لا يظهر في «اليوم» بل في القادمة', (await page.locator('#home-quickcard-reminders .dh-rem-row').count()) === 0);

console.log('\n=== التكرار الأسبوعي: اضبطه وانسه ===');
await page.locator('#home-quickcard-reminders .dh-rem-add').click();
await page.fill('#dh-rem-f-title', 'مراجعة أسبوعية مع الحلقة');
await page.locator('[data-rep="weekly"]').click();
check('اختيار «كل أسبوع» يُظهر أيام الأسبوع ويخفي شريط الأيام', await page.locator('[data-weekly]').isVisible() && !(await page.locator('[data-once]').isVisible()));
for (const c of await page.locator('[data-wd].is-on').all()) await c.click();
await page.locator('[data-wd="6"]').click(); await page.locator('[data-wd="2"]').click();
await page.locator('[data-ap="pm"]').click(); await page.locator('[data-quick] [data-qh="18"]').click();
const sum = await page.locator('#dh-rem-f-sum').innerText();
check('الملخص: كل سبت وثلاثاء 6:00 م + أول تنبيه + عبارة التجدد', /كل/.test(sum) && /6:00/.test(sum) && /أول تنبيه/.test(sum) && /يتجدد/.test(sum), sum.replace(/\n/g, ' | '));
await shot('form-weekly');
await page.locator('[data-save]').click();
list = await stored(); const wk = list.find(r => r.title.includes('أسبوعية'));
check('حُفظ أسبوعياً بأيام [2,6] وبالساعة 18:00 وأول موعد في المستقبل', wk && wk.repeat === 'weekly' && JSON.stringify(wk.days) === '[2,6]' && new Date(wk.at).getHours() === 18 && wk.at > Date.now() && [2, 6].includes(new Date(wk.at).getDay()));
const rolled = await page.evaluate(async () => {   // «اضبطه وانسه»: تأخّر أسبوعين بلا إنجاز → يقفز لآخر موعد ويُنبّه
  const m = await import('/core/reminders.js'); const r = m.getReminders().find(x => x.title.includes('أسبوعية'));
  const old = new Date(r.at); old.setDate(old.getDate() - 14); m.updateReminder(r.id, { at: old.getTime() });
  return null;
});
await page.evaluate(() => window.dispatchEvent(new Event('focus'))); await sleep(600);
list = await stored(); const wk2 = list.find(r => r.title.includes('أسبوعية'));
check('المتأخر أسبوعين يقفز وحده لآخر موعد حلّ (≤ الآن)', wk2.at <= Date.now() && wk2.at > Date.now() - 8 * 86400000);
await page.evaluate(async () => { const m = await import('/core/reminders.js'); m.removeReminder(m.getReminders().find(x => x.title.includes('أسبوعية')).id); });
await page.evaluate(() => document.querySelectorAll('.dh-rem-banner').forEach(b => b.remove()));

console.log('\n=== التنبيه: شريط علوي ===');
const T0 = Date.now();
await page.evaluate(async (now) => {
  const m = await import('/core/reminders.js');
  m.addReminder({ title: 'تجهيز اختبار الغد', kind: 'work', at: now + 1500 });
}, T0);
await page.waitForSelector('.dh-rem-banner', { timeout: 25000 });
check('ظهر شريط التنبيه عند الموعد', (await page.locator('.dh-rem-banner').innerText()).includes('تجهيز اختبار الغد'));
const bannerTop = await page.evaluate(() => { const s = document.getElementById('dh-rem-stack').getBoundingClientRect().top; const h = document.getElementById('main-header').getBoundingClientRect().bottom; return { s, h }; });
check('الشريط تحت الترويسة الموحّدة', bannerTop.s >= Math.round(bannerTop.h) - 1, JSON.stringify(bannerTop));
await shot('banner');
await page.locator('.dh-rem-banner [data-do="snooze"]').click();
await page.locator('.dh-rem-banner [data-sn="30"]').click();
list = await stored(); const w = list.find(r => r.title.includes('تجهيز'));
check('التأجيل 30 دقيقة يختفي الشريط ويضبط snoozeUntil', (await page.locator('.dh-rem-banner').count()) === 0 && w.snoozeUntil && w.snoozeUntil - Date.now() > 29 * 60000);

console.log('\n=== تنبيه عاجل + إكمال + تكرار ===');
await page.evaluate(async () => { const m = await import('/core/reminders.js'); m.addReminder({ title: 'ورد القرآن', kind: 'personal', repeat: 'daily', urgent: true, at: Date.now() + 1200 }); });
await page.waitForSelector('.dh-rem-alert .dh-rem-panel', { timeout: 25000 });
check('النافذة العاجلة وسط الشاشة', (await page.locator('.dh-rem-alert').innerText()).includes('ورد القرآن'));
await shot('urgent');
await page.locator('.dh-rem-alert [data-do="done"]').click();
list = await stored(); const dly = list.find(r => r.title === 'ورد القرآن');
check('إكمال المتكرر يقدّمه ليوم تالٍ ويبقى غير منجز', dly && !dly.done && dly.at > Date.now() + 20 * 3600 * 1000);

console.log('\n=== الفائت عند الفتح ===');
await page.evaluate(() => { const l = JSON.parse(localStorage.getItem('dh_reminders')); l.push({ id: 'old1', title: 'تذكير فاتَ', at: Date.now() - 3600000, kind: 'personal', repeat: 'none' }); localStorage.setItem('dh_reminders', JSON.stringify(l)); });
await page.reload(); await page.waitForSelector('.dh-rem-banner', { timeout: 30000 });
check('بعد إعادة الفتح: شريط «فاتتك» واحد', (await page.locator('.dh-rem-banner').count()) === 1 && (await page.locator('.dh-rem-banner').innerText()).includes('فات'));
await page.evaluate(() => { document.querySelector('.dh-tour-skip')?.click(); document.getElementById('whats-new-modal')?.remove(); });

console.log('\n=== الشاشة الكاملة ===');
await page.locator('.dh-rem-banner [data-do="view"]').click(); await page.waitForSelector('#rem-screen .dh-rem-tile', { timeout: 10000 }); await sleep(700);
check('الشاشة الكاملة تفتح على «اليوم» وفيها الفائت', await page.locator('#rem-screen').isVisible() && (await page.locator('.dh-rem-tile.is-on').getAttribute('data-tab')) === 'today' && (await page.locator('#rem-screen .dh-rem-row.is-late').count()) >= 1);
const scrTop = await page.evaluate(() => ({ s: document.querySelector('#rem-screen').getBoundingClientRect().top, h: document.getElementById('main-header').getBoundingClientRect().bottom }));
check('الشاشة داخل #app-root تحت الترويسة (لا ترويسة خاصة)', scrTop.s >= Math.round(scrTop.h) - 1 && (await page.locator('#app-root #rem-screen').count()) === 1, JSON.stringify(scrTop));
await shot('screen-light');
await page.locator('#rem-screen [data-tab="upcoming"]').click();
check('تبويب «القادمة» يعرض تذكير الغد', (await page.locator('#rem-screen .dh-rem-row').count()) >= 1);
await page.locator('#rem-screen [data-kind="work"]').click();
check('تصفية «عمل» تُظهر المؤجَّل فقط', (await page.locator('#rem-screen .dh-rem-row').count()) <= 1);
await page.locator('#rem-screen [data-kind].dh-rem-chip').first().click();
await page.locator('#rem-screen .dh-rem-row [data-act="edit"]').first().click(); await sleep(300);
check('زر التعديل على الصف يفتح النموذج', await page.locator('.dh-rem-form .dh-rem-panel').isVisible());
await page.locator('.dh-rem-form [data-cancel]').click(); await sleep(200);
const before = (await stored()).length;
await page.locator('#rem-screen .dh-rem-row [data-act="delete"]').first().click(); await page.locator('.ham-dialog-btn:not(.ham-dialog-btn-cancel)').click(); await sleep(500);
await page.locator('#rem-screen .dh-rem-hero [data-act="done"]').click(); await sleep(300);
check('زر الإنجاز في بطاقة «التالي» يعمل', (await stored()).filter(r => r.done).length >= 1);
check('زر الحذف على الصف يحذف التذكير', (await stored()).length === before - 1);
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
await shot('screen-dark');
await page.locator('#rem-screen [data-close]').click();
await sleep(800); check('الرجوع للرئيسية', (await page.locator('#rem-screen').count()) === 0);

console.log('\n=== النسخة الاحتياطية والمظهر والإنجليزية ===');
const bk = await page.evaluate(async () => { const m = await import('/core/backupRestore.js'); const fn = m.buildBackupPayload || m.exportAllData || m.createBackupPayload; return { has: !!fn, names: Object.keys(m).filter(k => /backup|export|payload/i.test(k)) }; });
console.log('   (واجهة النسخ:', bk.names.join(','), ')');
await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
await page.evaluate(() => document.getElementById('lang-toggle-btn')?.click()); await sleep(400);
check('الإنجليزية: عنوان المجموعة مترجم', (await page.locator('#home-quickcard-reminders .dh-rem-title').textContent()).trim() === 'My reminders');
await shot('home-en');

console.log('\n=== الهاتف: لوحة «مهام» ونموذج الإضافة ===');
const mctx = await browser.newContext({ locale: 'ar', viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
await mctx.route('**/*', r => (new URL(r.request().url()).hostname === 'localhost' ? r.continue() : r.abort()));
const mp = await mctx.newPage(); mp.on('pageerror', e => { errs.push(e.message); console.log('   [pageerror]', e.message); });
await mp.goto(WEB + '/index.html'); await mp.waitForSelector('.dh-bnav-item[data-id="tasks"]', { timeout: 30000 }); await sleep(1500);
await mp.evaluate(() => { document.querySelector('.dh-tour-skip')?.click(); document.getElementById('whats-new-modal')?.remove(); });
await mp.evaluate(async () => { const m = await import('/core/reminders.js'); m.addReminder({ title: 'متابعة حفظ الطالب يوسف قبل الاختبار', kind: 'student', at: Date.now() + 3600000 }); });
check('الهاتف: زر «تذكيراتي» في الشريط السفلي بشارة ذهبية = 1', (await mp.locator('.dh-bnav-item[data-id="reminders"] .dh-bnav-badge.is-rem').textContent()) === '1');
check('الهاتف: شارة «مهام» لا تحسب التذكيرات', (await mp.locator('.dh-bnav-item[data-id="tasks"] .dh-bnav-badge').count()) === 0);
await mp.locator('.dh-bnav-item[data-id="tasks"]').click(); await sleep(500);
check('الهاتف: لوحة «مهام» لا تكرّر بطاقة التذكيرات', !(await mp.locator('.dh-sheet-panel #home-quickcard-reminders').isVisible()));
check('الهاتف: لوحة «مهام» تحوي «مهام اليوم» (الغلاف انتقل سليماً)', await mp.locator('.dh-sheet-panel #home-quickcard').count() === 1);
await mp.locator('.dh-sheet-x').click(); await sleep(300);
await mp.locator('.dh-bnav-item[data-id="reminders"]').click(); await sleep(400);
check('الهاتف: الزر يفتح الشاشة الكاملة وفيها التذكير', await mp.locator('#rem-screen .dh-rem-row').count() === 1);
if (outDir) await mp.screenshot({ path: path.join(outDir, 'mobile-screen.png') });
await mp.locator('#rem-screen [data-go="add"]').first().click(); await sleep(300);
await mp.locator('[data-rep="weekly"]').click();
check('الهاتف: نموذج الإضافة يفتح فوق الشاشة', await mp.locator('.dh-rem-form .dh-rem-panel').isVisible());
if (outDir) await mp.screenshot({ path: path.join(outDir, 'mobile-form.png') });
const noScroll = await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
check('الهاتف: لا تمرير أفقي', noScroll);
check('لا أخطاء جافاسكربت', errs.length === 0, errs.join(' | '));
await browser.close(); srv.close();
console.log(`\n${ok} نجح · ${bad} فشل`); process.exit(bad ? 1 : 0);
