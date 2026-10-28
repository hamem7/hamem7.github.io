// tests/account-screen.e2e.mjs — شاشة «حسابي والنسخ الاحتياطي» داخل المنصة الحقيقية (index.html) مع Google Identity وDrive مُحاكيين.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=$(dirname $(npm root -g)) PW_CHROMIUM=/opt/pw-browsers/chromium node tests/account-screen.e2e.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html';
  const f = path.join(REPO, p);
  if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
await new Promise(r => srv.on('listening', r));
const WEB = `http://localhost:${srv.address().port}`;

// ---- Drive مُحاكى ----
const drive = { files: new Map(), seq: 0, email: 'teacher@example.com' };
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
function parseMultipart(buf, ct) {
  const delim = Buffer.from('--' + /boundary=(.+)$/.exec(ct)[1]); const parts = []; let idx = buf.indexOf(delim);
  while (idx !== -1) { const next = buf.indexOf(delim, idx + delim.length); if (next === -1) break;
    const seg = buf.subarray(idx + delim.length + 2, next - 2); parts.push(seg.subarray(seg.indexOf('\r\n\r\n') + 4)); idx = next; }
  return { meta: JSON.parse(parts[0].toString('utf8')), data: parts[1] };
}
async function driveRoute(route) {
  const req = route.request(); const u = new URL(req.url()); const m = req.method();
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  const json = (o, status = 200) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(o) });
  if (u.pathname === '/drive/v3/about') return json({ user: { emailAddress: drive.email } });
  if (u.pathname === '/upload/drive/v3/files' && m === 'POST') {
    const { meta, data } = parseMultipart(req.postDataBuffer(), req.headers()['content-type']);
    const id = 'f' + (++drive.seq);
    drive.files.set(id, { id, name: meta.name, bytes: Buffer.from(data), createdTime: new Date(Date.now() + drive.seq).toISOString(), appProperties: meta.appProperties || {} });
    return json({ id, name: meta.name, size: String(data.length) });
  }
  if (u.pathname === '/drive/v3/files' && m === 'GET') {
    return json({ files: [...drive.files.values()].sort((a, b) => Date.parse(b.createdTime) - Date.parse(a.createdTime)).map(f => ({ id: f.id, name: f.name, size: String(f.bytes.length), createdTime: f.createdTime, appProperties: f.appProperties })) });
  }
  const mm = /^\/drive\/v3\/files\/([^/]+)$/.exec(u.pathname); const f = mm && drive.files.get(mm[1]);
  if (f && m === 'GET') return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/octet-stream' }, body: f.bytes });
  if (f && m === 'DELETE') { drive.files.delete(f.id); return route.fulfill({ status: 204, headers: CORS }); }
  return json({ error: 'unhandled' }, 400);
}

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar', viewport: { width: 1100, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(() => {
  // الجولات الإرشادية تغطي الشاشة أول مرة: نعلّمها «شوهدت» كما لو أن المعلم أنهاها
  try { const seen = {}; ['home', 'install', 'kids', 'adults', 'homework', 'certificates', 'dual'].forEach(k => { seen[k] = true; }); localStorage.setItem('dh_seen_tours', JSON.stringify(seen)); } catch (e) { /* لا شيء */ }
  // نافذة «الحفظ الشهري» التلقائية تغطي الشاشة بعد كل إعادة تحميل (مرة يومياً): نعلّمها «ظهرت اليوم»
  try { localStorage.setItem('darham_monthly_memo_bulk_last_auto_shown', new Date().toISOString().slice(0, 10)); } catch (e) { /* لا شيء */ }
  // alert/confirm صارا نافذتين مخصصتين (core/dialog.js: .ham-dialog-overlay): نسجّل نصها ونضغط «موافق» تلقائياً كما يفعل المعلم
  new MutationObserver(() => {
    const ov = document.querySelector('.ham-dialog-overlay');
    if (!ov || ov.dataset.seen) return;
    ov.dataset.seen = '1';
    try { window.__recordDialog(ov.querySelector('.ham-dialog-msg').textContent); } catch (e) { /* لا شيء */ }
    setTimeout(() => ov.querySelector('.ham-dialog-btn:not(.ham-dialog-btn-cancel)')?.click(), 60);
  }).observe(document, { childList: true, subtree: true });
  window.__gis = { requests: [] };
  window.google = { accounts: {
    id: { initialize() {}, renderButton() {}, prompt() {}, disableAutoSelect() {} },
    oauth2: {
      initTokenClient(cfg) { return { requestAccessToken() {
        window.__gis.requests.push({ prompt: cfg.prompt, hint: cfg.login_hint });
        setTimeout(() => cfg.callback({ access_token: 'tok-' + window.__gis.requests.length, expires_in: 3600, scope: cfg.scope }), 0);
      } }; },
      hasGrantedAllScopes: () => true, revoke() {}
    } } };
});
await ctx.route('**/*', async (route) => {
  const u = new URL(route.request().url());
  if (u.hostname === 'localhost') return route.continue();
  if (u.hostname === 'www.googleapis.com') return driveRoute(route);
  if (u.href.startsWith('https://accounts.google.com/gsi/client')) return route.fulfill({ status: 200, contentType: 'text/javascript', body: '' });
  return route.abort();
});
const page = await ctx.newPage();
const dialogs = [];
await page.exposeFunction('__recordDialog', (m) => { dialogs.push(m); });
page.on('dialog', d => { dialogs.push(d.message()); d.accept().catch(() => {}); });
const errors = []; page.on('pageerror', e => { errors.push(e.message); console.log('   [pageerror]', e.message); });

let pass = 0, fail = 0;
const ok = (c, m, d = '') => { if (c) { pass++; console.log('✅', m); } else { fail++; console.log('❌', m, d); } };
const txt = (sel) => page.locator(sel).innerText();
const vis = (sel) => page.locator(sel).isVisible();

await page.goto(WEB + '/index.html');
await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
await page.waitForTimeout(1200);

// 1) الرئيسية: زر «حسابي والنسخ» ظاهر، بلا نقطة (لا طلاب بعد)
ok(await vis('#home-account-btn'), '1) زر «حسابي والنسخ» ظاهر في الرئيسية');
ok(!(await vis('#home-account-dot')), '1) لا نقطة تنبيه ما دام لا يوجد طلاب');

// 2) بعد إضافة طالب بلا نسخة: نقطة حمراء
const addStudent = (name) => page.evaluate(async (name) => { const { AppState } = await import('/core/app.js'); return AppState.studentManager.addStudent({ name, type: 'adult' }); }, name);
const names = () => page.evaluate(async () => { const { AppState } = await import('/core/app.js'); return (await AppState.studentManager.getAllStudents()).map(s => s.name).sort().join(); });
await addStudent('أحمد');
await page.evaluate(() => document.dispatchEvent(new CustomEvent('dh:backup-health')));
await page.waitForFunction(() => !document.getElementById('home-account-dot').hidden, null, { timeout: 5000 }).catch(() => {});
ok((await vis('#home-account-dot')) && (await page.getAttribute('#home-account-dot', 'data-level')) === 'bad', '2) طالب بلا أي نسخة ← نقطة حمراء على زر حسابي');

// 3) فتح الشاشة من زر الرئيسية
await page.click('#home-account-btn');
await page.waitForSelector('#acct-screen', { timeout: 10000 });
await page.waitForTimeout(400);
ok((await page.getAttribute('#acct-status', 'data-level')) === 'bad' && (await txt('#acct-status-title')).includes('لا توجد'), '3) شاشة حسابي: الحالة «لا توجد أي نسخة»');
ok(!(await vis('#acct-drive-rows')) && (await txt('#acct-drive-backup-btn')).includes('ربط'), '3) Drive غير مربوط: زر الربط ظاهر والتفاصيل مخفية');
ok(await vis('#acct-drive-restore-btn'), '3) زر «استرجاع من Drive» ظاهر دائماً (جهاز جديد)');
ok(await page.evaluate(() => document.body.classList.contains('dh-core-screen')), '3) الشاشة من الشاشات الأساسية (الشريط السفلي يظهر على الهاتف)');

// 4) ربط Drive من بطاقة الحالة (CTA) ينسخ ويحوّل الحالة إلى «محمية»
await page.click('#acct-status-cta');
await page.waitForFunction(() => document.getElementById('acct-status').dataset.level === 'ok', null, { timeout: 15000 }).catch(() => {});
ok((await page.getAttribute('#acct-status', 'data-level')) === 'ok' && (await txt('#acct-status-title')).includes('محمية'), '4) بعد النسخ على Drive: الحالة «بياناتك محمية»');
ok(drive.files.size === 1, '4) ملف واحد على Drive');
ok((await vis('#acct-drive-rows')) && (await txt('#acct-drive-email')) === 'teacher@example.com', '4) يظهر الحساب المرتبط (بريد Drive)');
ok((await txt('#acct-drive-count')).includes('1'), '4) عدد النسخ = 1');
ok((await txt('#acct-status-lines')).includes('طالب'), '4) سطر Drive في بطاقة الحالة يذكر عدد الطلاب');
ok(await vis('#header-account-btn') && (await page.getAttribute('#header-account-dot', 'data-level')) === 'ok', '4) أيقونة الترويسة ظاهرة في شاشة حسابي ونقطة الحالة خضراء (سليم) بعد النسخ');
ok(dialogs.some(d => d.includes('تم النسخ إلى Drive')), '4) رسالة نجاح للمعلم');

// 5) عدم تطابق الحساب مع حساب الواجبات ← تحذير + «اعتمد»
await page.evaluate(() => localStorage.setItem('dh_hw_teacher_email', 'other@school.edu'));
await page.evaluate(async () => { const m = await import('/core/app.js'); m.openAccountScreen(); });
await page.waitForTimeout(800);
ok(await vis('#acct-drive-mismatch'), '5) حساب Drive ≠ حساب الواجبات ← صندوق تنبيه');
await page.click('#acct-drive-mismatch-keep');
ok(!(await vis('#acct-drive-mismatch')) && (await page.evaluate(() => localStorage.getItem('dh_drive_custom'))) === '1', '5) «اعتمد هذا الحساب» يُخفي التنبيه ويحفظ الاختيار');
await page.evaluate(() => { localStorage.removeItem('dh_drive_custom'); localStorage.setItem('dh_hw_teacher_email', 'teacher@example.com'); });

// 6) نسخة على الجهاز
await page.evaluate(async () => { const m = await import('/core/app.js'); m.openAccountScreen(); });
await page.waitForSelector('#acct-local-backup-btn');
await page.waitForTimeout(500);
const dl = page.waitForEvent('download', { timeout: 15000 }).catch(() => null);
await page.click('#acct-local-backup-btn');
ok(!!(await dl), '6) زر «نسخة احتياطية الآن» ينزّل ملفاً');
await page.waitForTimeout(600);
ok(!(await txt('#acct-local-last')).includes('لم تُؤخَذ'), '6) سطر «آخر نسخة على جهازك» يتحدث');

// 7) الاستعادة من Drive عبر الواجهة (طالب جديد بعد النسخة يُحفظ في لقطة الأمان)
await addStudent('سارة');
ok((await names()) === 'أحمد,سارة', '7) تحضير: طالبان على الجهاز');
await page.click('#acct-drive-restore-btn');
await page.waitForSelector('#acct-drive-picker', { state: 'visible', timeout: 10000 });
ok((await page.locator('#acct-drive-select option').count()) === 1, '7) قائمة النسخ فيها نسخة واحدة');
dialogs.length = 0;
const reloaded = page.waitForEvent('load', { timeout: 20000 }).catch(() => null);
await page.click('#acct-drive-pick-go');
await reloaded;
await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
await page.waitForTimeout(800);
ok(dialogs.some(d => d.includes('عدد الطلاب في النسخة: 1') && d.includes('الحاليين: 2')), '7) رسالة التأكيد تعرض 1 مقابل 2', JSON.stringify(dialogs));
ok((await names()) === 'أحمد', '7) بعد الاستعادة: أحمد فقط (بلا تكرار)');

// 8) التراجع عن الاستعادة
await page.evaluate(async () => { const m = await import('/core/app.js'); m.openAccountScreen(); });
await page.waitForSelector('#acct-local-undo-btn', { state: 'attached' });
await page.waitForFunction(() => document.getElementById('acct-local-undo-btn').style.display !== 'none', null, { timeout: 8000 }).catch(() => {});
ok(await vis('#acct-local-undo-btn'), '8) زر «التراجع عن آخر استعادة» ظاهر بعد الاستعادة');
const reloaded2 = page.waitForEvent('load', { timeout: 20000 }).catch(() => null);
await page.click('#acct-local-undo-btn');
await reloaded2;
await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
await page.waitForTimeout(800);
ok((await names()) === 'أحمد,سارة', '8) التراجع يُعيد سارة');

// 9) تغيير حساب Drive: يطلب قائمة الحسابات، ويصفّر آخر نسخة/عدد النسخ (تخص الحساب القديم)
await page.evaluate(async () => { const m = await import('/core/app.js'); m.openAccountScreen(); });
await page.waitForSelector('#acct-drive-change');
await page.waitForTimeout(500);
drive.email = 'second@gmail.com';
dialogs.length = 0;
await page.click('#acct-drive-change');
await page.waitForFunction(() => document.getElementById('acct-drive-email').textContent === 'second@gmail.com', null, { timeout: 10000 }).catch(() => {});
ok((await txt('#acct-drive-email')) === 'second@gmail.com', '9) الحساب الجديد يظهر');
ok((await page.evaluate(() => window.__gis.requests.at(-1).prompt)) === 'select_account', '9) طُلبت قائمة الحسابات (select_account)');
ok(dialogs.some(d => d.includes('second@gmail.com') && d.includes('الحساب القديم')), '9) رسالة تشرح أن النسخ القديمة تبقى في الحساب السابق');
ok((await txt('#acct-drive-last')).includes('لم تُؤخذ'), '9) آخر نسخة على Drive صُفِّرت (تخص الحساب القديم)');
ok((await page.evaluate(() => localStorage.getItem('dh_drive_custom'))) === '1', '9) اختيار حساب مختلف عن حساب الواجبات يُسجَّل اختياراً مقصوداً');

// 10) رابط نافذة الملف الشخصي يفتح الشاشة
await page.evaluate(async () => { const m = await import('/core/app.js'); await m.loadSplashScreen(); });
await page.waitForSelector('#teacher-profile-open-account-btn', { state: 'attached', timeout: 10000 });
await page.evaluate(() => document.getElementById('teacher-profile-open-account-btn').click());
await page.waitForSelector('#acct-screen', { timeout: 10000 });
ok(true, '10) زر «حسابي والنسخ الاحتياطي» في نافذة الملف الشخصي يفتح الشاشة');

// 11) زر «الرئيسية» داخل الشاشة
await page.click('#btn-back-account');
await page.waitForSelector('#btn-my-students-main', { timeout: 10000 });
ok(true, '11) زر الرجوع يعيد إلى الرئيسية');

// 12) حساب موحَّد: عند ربط Drive تُقترح على Google حسابُ الواجبات (login_hint)
await page.evaluate(() => { localStorage.removeItem('dh_drive_custom'); localStorage.setItem('dh_hw_teacher_email', 'hw@school.edu'); });
await page.reload();
await page.waitForSelector('#btn-my-students-main', { timeout: 30000 });
await page.evaluate(async () => { const D = await import('/core/driveBackup.js'); await D.runDriveBackup({ interactive: true }); });
ok((await page.evaluate(() => window.__gis.requests.at(-1).hint)) === 'hw@school.edu', '12) نافذة Google تُقترح عليها حساب الواجبات (login_hint)');

// 13) أول دخول: «إضافة بياناتي» + بطاقة اكتمال الحساب؛ وبعد حفظ اسم يصير «تعديل بياناتي»
await page.evaluate(async () => { const m = await import('/core/app.js'); m.AppState.currentTeacher = {}; m.openAccountScreen(); });
await page.waitForSelector('#acct-screen', { timeout: 10000 });
ok((await page.textContent('#acct-edit-btn')).includes('إضافة'), '13) ملف فارغ: الزر «إضافة بياناتي»');
ok(await page.evaluate(() => !document.getElementById('acct-progress-card').hidden), '13) بطاقة اكتمال الحساب ظاهرة');
await page.evaluate(async () => { const m = await import('/core/app.js'); m.AppState.currentTeacher = { name: 'أحمد' }; m.openAccountScreen(); });
await page.waitForSelector('#acct-screen', { timeout: 10000 });
ok((await page.textContent('#acct-edit-btn')).includes('تعديل'), '13) بعد وجود بيانات: الزر «تعديل بياناتي»');

ok(errors.length === 0, 'لا أخطاء صفحة: ' + errors.join(' | '));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
