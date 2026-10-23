// tests/drive-backup.e2e.mjs — النسخ الاحتياطي على Google Drive في متصفح حقيقي، مع محاكاة لـGoogle Identity وDrive REST
// (لا اتصال بـGoogle الحقيقي: التجربة الحقيقية بحساب المعلم تبقى يدوية).
// الاستعمال: PLAYWRIGHT_MODULE_DIR=$(dirname $(npm root -g)) PW_CHROMIUM=/opt/pw-browsers/chromium node tests/drive-backup.e2e.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
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

// ---- Drive REST مُحاكى في الذاكرة ----
const drive = { files: new Map(), seq: 0, corruptDownload: false, failDeleteIds: new Set() };
const DAY = 24 * 3600 * 1000;
function addFile(name, bytes, createdMs, props = {}) { const id = 'f' + (++drive.seq); drive.files.set(id, { id, name, bytes, createdTime: new Date(createdMs).toISOString(), appProperties: props }); return id; }
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };
function parseMultipart(buf, ct) {
  const boundary = /boundary=(.+)$/.exec(ct)[1];
  const delim = Buffer.from('--' + boundary);
  const parts = []; let idx = buf.indexOf(delim);
  while (idx !== -1) {
    const next = buf.indexOf(delim, idx + delim.length); if (next === -1) break;
    const seg = buf.subarray(idx + delim.length + 2, next - 2);   // نزيل \r\n من الطرفين
    const hdrEnd = seg.indexOf('\r\n\r\n');
    parts.push(seg.subarray(hdrEnd + 4)); idx = next;
  }
  return { meta: JSON.parse(parts[0].toString('utf8')), data: parts[1] };
}
async function driveRoute(route) {
  const req = route.request(); const u = new URL(req.url()); const m = req.method();
  if (m === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  const json = (o, status = 200) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(o) });
  if (!/^Bearer tok/.test(req.headers()['authorization'] || '')) return json({ error: 'unauth' }, 401);
  if (u.pathname === '/upload/drive/v3/files' && m === 'POST') {
    const { meta, data } = parseMultipart(req.postDataBuffer(), req.headers()['content-type']);
    if (!(meta.parents || []).includes('appDataFolder')) return json({ error: 'bad parent' }, 400);
    const id = addFile(meta.name, Buffer.from(data), Date.now() + drive.seq, meta.appProperties || {});
    return json({ id, name: meta.name, size: String(data.length) });
  }
  if (u.pathname === '/drive/v3/files' && m === 'GET') {
    if (u.searchParams.get('spaces') !== 'appDataFolder') return json({ error: 'wrong space' }, 400);
    const list = [...drive.files.values()].sort((a, b) => Date.parse(b.createdTime) - Date.parse(a.createdTime))
      .map(f => ({ id: f.id, name: f.name, size: String(f.bytes.length), createdTime: f.createdTime, appProperties: f.appProperties }));
    return json({ files: list });
  }
  const mm = /^\/drive\/v3\/files\/([^/]+)$/.exec(u.pathname);
  if (mm) {
    const f = drive.files.get(mm[1]);
    if (!f) return json({ error: 'not found' }, 404);
    if (m === 'GET') {
      let b = f.bytes; if (drive.corruptDownload) { b = Buffer.from(b); b[b.length - 1] ^= 0xff; }
      return route.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/octet-stream' }, body: b });
    }
    if (m === 'DELETE') { if (drive.failDeleteIds.has(f.id)) return json({ error: 'x' }, 500); drive.files.delete(f.id); return route.fulfill({ status: 204, headers: CORS }); }
  }
  return json({ error: 'unhandled ' + m + ' ' + u.pathname }, 400);
}

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const ctx = await browser.newContext({ locale: 'ar' });
await ctx.route('https://www.googleapis.com/**', driveRoute);
// Google Identity مُحاكى: window.__gis.mode = ok | denied | silentfail
await ctx.addInitScript(() => {
  window.__gis = { mode: 'ok', requests: [] };
  window.google = { accounts: { oauth2: {
    initTokenClient(cfg) { return { requestAccessToken() {
      window.__gis.requests.push({ prompt: cfg.prompt, scope: cfg.scope, client: cfg.client_id });
      setTimeout(() => {
        if (window.__gis.mode === 'ok') cfg.callback({ access_token: 'tok-' + window.__gis.requests.length, expires_in: 3600, scope: cfg.scope });
        else if (window.__gis.mode === 'denied') cfg.callback({ error: 'access_denied' });
        else cfg.error_callback({ type: 'popup_failed_to_open' });
      }, 0);
    } }; },
    hasGrantedAllScopes: () => true, revoke() { window.__gis.revoked = true; }
  } } };
});
const page = await ctx.newPage();
const errors = []; page.on('pageerror', e => errors.push(String(e)));
await page.goto(WEB + '/privacy.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('✅', m); } else { fail++; console.log('❌', m); } };

// تحضير بيانات: طلاب A,B + قاعدة صوت الأطفال (يجب ألا تدخل نسخة Drive)
await page.evaluate(async () => {
  const mk = (name, ver, stores) => new Promise((res, rej) => { const r = indexedDB.open(name, ver);
    r.onupgradeneeded = e => stores.forEach(([s, kp, auto]) => e.target.result.createObjectStore(s, auto ? { keyPath: kp, autoIncrement: true } : { keyPath: kp }));
    r.onsuccess = e => res(e.target.result); r.onerror = e => rej(e.target.error); });
  const put = (db, s, v) => new Promise((res, rej) => { const tx = db.transaction(s, 'readwrite'); tx.objectStore(s).put(v); tx.oncomplete = res; tx.onerror = e => rej(e.target.error); });
  const st = await mk('DarHamStudents', 1, [['students', 'id', true]]);
  const au = await mk('DarHamKidsAudio', 1, [['audio', 'number']]);
  await put(st, 'students', { name: 'A' }); await put(st, 'students', { name: 'B' });
  await put(au, 'audio', { number: 1, note: 'must-not-be-in-drive-backup' });
});
const names = () => page.evaluate(async () => { const db = await new Promise(r => indexedDB.open('DarHamStudents').onsuccess = e => r(e.target.result)); const all = await new Promise(r => { const q = db.transaction('students').objectStore('students').getAll(); q.onsuccess = () => r(q.result); }); db.close(); return all.map(x => x.name).sort().join(); });
const addStudent = (n) => page.evaluate(async (n) => { const db = await new Promise(r => indexedDB.open('DarHamStudents').onsuccess = e => r(e.target.result)); await new Promise(r => { const tx = db.transaction('students', 'readwrite'); tx.objectStore('students').put({ name: n }); tx.oncomplete = r; }); db.close(); }, n);
const clearStudents = () => page.evaluate(async () => { const db = await new Promise(r => indexedDB.open('DarHamStudents').onsuccess = e => r(e.target.result)); await new Promise(r => { const tx = db.transaction('students', 'readwrite'); tx.objectStore('students').clear(); tx.oncomplete = r; }); db.close(); });
const run = (opts) => page.evaluate(async (o) => { const D = await import('/core/driveBackup.js'); return D.runDriveBackup(o); }, opts);
const ls = (k) => page.evaluate(k => localStorage.getItem(k), k);

// 1) نسخة ناجحة
let r = await run({ interactive: true });
ok(r.ok && r.students === 2 && drive.files.size === 1, '1) نسخة ناجحة ترفع ملفاً واحداً (طالبان)');
const f1 = [...drive.files.values()][0];
ok(f1.name.startsWith('dh-backup-') && f1.name.endsWith('.json.gz') && f1.bytes[0] === 0x1f && f1.bytes[1] === 0x8b, '1) الملف مضغوط gzip وباسم بتاريخ');
const payload1 = JSON.parse(zlib.gunzipSync(f1.bytes).toString('utf8'));
ok(!!payload1.databases.DarHamStudents && !payload1.databases.DarHamKidsAudio && !payload1.databases.DarHamDatabase && !payload1.databases.DarHamSafety, '1) حمولة Drive تستثني الصوتيات والقرآن ولقطات الأمان');
ok((await page.evaluate(() => window.__gis.requests[0])).scope === 'https://www.googleapis.com/auth/drive.appdata', '1) الصلاحية المطلوبة drive.appdata فقط');
ok((await ls('dh_drive_enabled')) === '1' && !!(await ls('dh_drive_last_ok')), '1) سُجّل التفعيل وآخر نجاح');
const lsAll = await page.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
ok(!/tok-/.test(lsAll), '1) رمز الدخول لا يُخزَّن في localStorage');

// 2) لا طلاب → لا رفع
await clearStudents();
r = await run({ interactive: true });
ok(r.ok && r.skipped === 'no_students' && drive.files.size === 1, '2) جهاز بلا طلاب لا يرفع نسخة فارغة');
ok((await ls('dh_drive_enabled')) === '1', '2) ومع ذلك يُعدّ Drive مربوطاً (ليظهر الاسترجاع على الجهاز الجديد)');

// 3) استرجاع من Drive ثم التراجع
await addStudent('A'); await addStudent('B');          // نعيد الوضع
await addStudent('C');                                  // بيانات أحدث من النسخة
const restoreResult = await page.evaluate(async (id) => {
  const D = await import('/core/driveBackup.js'); const B = await import('/core/backupRestore.js');
  const list = await D.listBackupsForRestore();
  const file = await D.downloadBackupAsFile(list[0].id, list[0].name);
  const info = await B.inspectBackupFile(file);
  await B.restoreFromBackupFile(file);
  return { n: list.length, info };
});
ok(restoreResult.n === 1 && restoreResult.info.studentsInBackup === 2, '3) قائمة Drive وتنزيل النسخة وفكّ الضغط وفحصها');
ok((await names()) === 'A,B', '3) الاستعادة من Drive تُرجع A,B دون تكرار');
await page.evaluate(async () => (await import('/core/backupRestore.js')).restoreFromSafetySnapshot());
ok((await names()) === 'A,B,A,B,C'.split(',').sort().join() || (await names()).includes('C'), '3) التراجع يُرجع الطالب الأحدث C');

// 4) الاحتفاظ: 10 نسخ قديمة + الجديدة
await clearStudents(); await addStudent('A');
const NOW = Date.now();
for (let i = 1; i <= 12; i++) addFile(`dh-backup-old${i}.json.gz`, zlib.gzipSync('{}'), NOW - (40 + i) * DAY);
const before = drive.files.size;
r = await run({ interactive: true });
const sizeAfter = drive.files.size;
const newest = [...drive.files.values()].sort((a, b) => Date.parse(b.createdTime) - Date.parse(a.createdTime))[0];
ok(r.ok && r.deleted > 0 && sizeAfter < before + 1 && newest.name === r.name, `4) الاحتفاظ يحذف القديم (${before + 1}→${sizeAfter}) ويُبقي الجديدة`);

// 5) فشل التحقق: لا يُحذف شيء من القديم، والجديدة المعطوبة تُحذف
const keepIds = new Set(drive.files.keys());
drive.corruptDownload = true;
r = await run({ interactive: true });
drive.corruptDownload = false;
ok(!r.ok && r.code === 'VERIFY_FAILED' && [...keepIds].every(id => drive.files.has(id)) && drive.files.size === keepIds.size, '5) فشل التحقق: النسخ السابقة كلها سليمة والمعطوبة محذوفة');

// 6) فشل الإذن الصامت ثم النجاح التفاعلي (إعادة تحميل = فتح المنصة من جديد: الرمز في الذاكرة يضيع)
await page.reload();
await page.evaluate(() => { window.__gis.mode = 'silentfail'; });
r = await run({ interactive: false });
ok(!r.ok && r.code === 'AUTH_REQUIRED' && (await ls('dh_drive_needs_reconnect')) === '1', '6) فشل الإذن الصامت يُسجَّل «يحتاج إعادة ربط»');
ok((await page.evaluate(() => window.__gis.requests.length)) === 0, '6) الطلب الصامت لا يطلب من Google إطلاقاً (لا نافذة بلا نقرة، فلا حظر منبثقات)');
await page.evaluate(() => { window.__gis.mode = 'ok'; });
r = await run({ interactive: true });
ok(r.ok && (await ls('dh_drive_needs_reconnect')) === null, '6) النسخ التفاعلي بعدها ينجح ويمسح علامة إعادة الربط');

// 7) رفض الإذن
await page.reload();
await page.evaluate(() => { window.__gis.mode = 'denied'; });
const filesBefore = drive.files.size;
r = await run({ interactive: true });
ok(!r.ok && r.code === 'ACCESS_DENIED' && drive.files.size === filesBefore, '7) رفض الإذن لا يرفع شيئاً ويُرجع ACCESS_DENIED');
await page.evaluate(() => { window.__gis.mode = 'ok'; });

// 8) بدون إنترنت (فشل الشبكة) لا يكسر شيئاً
await ctx.route('https://www.googleapis.com/**', r2 => r2.abort('internetdisconnected'));
r = await run({ interactive: true });
ok(!r.ok && r.code === 'NETWORK', '8) انقطاع الإنترنت: يفشل برمز NETWORK دون أخطاء صفحة');
await ctx.unroute('https://www.googleapis.com/**');
await ctx.route('https://www.googleapis.com/**', driveRoute);

// 9) التلقائي: لا يعمل قبل 24 ساعة، ويعمل بعدها
const auto = await page.evaluate(async () => {
  const D = await import('/core/driveBackup.js');
  D.setDriveAuto(true);
  const sched = []; const orig = window.setTimeout; window.setTimeout = (fn, ms) => { sched.push(ms); return 0; };
  D.maybeAutoDriveBackup(); const recent = sched.length;
  localStorage.setItem('dh_drive_last_ok', new Date(Date.now() - 25 * 3600 * 1000).toISOString());
  D.maybeAutoDriveBackup(); const stale = sched.length;
  window.setTimeout = orig;
  return { recent, stale };
});
ok(auto.recent === 0 && auto.stale === 1, '9) التلقائي لا يعمل قبل 24 ساعة ويُجدول بعدها');

// 10) الفصل
await page.evaluate(async () => (await import('/core/driveBackup.js')).disconnectDrive());
ok((await ls('dh_drive_enabled')) === null && (await ls('dh_drive_auto')) === null && await page.evaluate(() => window.__gis.revoked === true), '10) الفصل يمسح الإعدادات ويسحب الإذن');

ok(errors.length === 0, 'لا أخطاء صفحة: ' + errors.join('|'));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
