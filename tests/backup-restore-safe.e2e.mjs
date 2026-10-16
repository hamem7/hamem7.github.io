// tests/backup-restore-safe.e2e.mjs — اختبار الاستعادة الآمنة (لقطة أمان + تراجع + رجوع تلقائي عند الفشل) في متصفح حقيقي.
// الاستعمال: PLAYWRIGHT_MODULE_DIR=$(dirname $(npm root -g)) PW_CHROMIUM=/opt/pw-browsers/chromium node tests/backup-restore-safe.e2e.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(process.env.PLAYWRIGHT_MODULE_DIR ? path.join(process.env.PLAYWRIGHT_MODULE_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };
const srv = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = path.join(REPO, p);
  if (!f.startsWith(REPO) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0);
await new Promise(r => srv.on('listening', r));
const WEB = `http://localhost:${srv.address().port}`;

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {}) });
const page = await (await browser.newContext()).newPage();
const errors = []; page.on('pageerror', e => errors.push(String(e)));
await page.goto(WEB + '/privacy.html');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('✅', m); } else { fail++; console.log('❌', m); } };

const result = await page.evaluate(async () => {
  const B = await import('/core/backupRestore.js');
  const mk = (name, ver, stores) => new Promise((res, rej) => {
    const r = indexedDB.open(name, ver);
    r.onupgradeneeded = e => stores.forEach(([s, kp, auto]) => e.target.result.createObjectStore(s, auto ? { keyPath: kp, autoIncrement: true } : { keyPath: kp }));
    r.onsuccess = e => res(e.target.result); r.onerror = e => rej(e.target.error);
  });
  const put = (db, s, v) => new Promise((res, rej) => { const tx = db.transaction(s, 'readwrite'); tx.objectStore(s).put(v); tx.oncomplete = res; tx.onerror = e => rej(e.target.error); });
  const names = async () => { const db = await new Promise(r => indexedDB.open('DarHamStudents').onsuccess = e => r(e.target.result)); const all = await new Promise(r => { const q = db.transaction('students').objectStore('students').getAll(); q.onsuccess = () => r(q.result); }); db.close(); return all.map(x => x.name).sort(); };
  const asFile = (obj) => new File([typeof obj === 'string' ? obj : JSON.stringify(obj)], 'b.json', { type: 'application/json' });
  const out = {};

  const st = await mk('DarHamStudents', 1, [['students', 'id', true]]);
  const hw = await mk('DarHamHomeworks', 2, [['homeworks', 'id'], ['submissions', 'id']]);
  await put(st, 'students', { name: 'A' }); await put(st, 'students', { name: 'B' });
  // نسخة "قديمة" فيها A,B
  const oldPayload = await B.buildBackupPayload();
  out.noSafetyInPayload = !('DarHamSafety' in oldPayload.databases);
  // بعد النسخة أُضيف طالب جديد C
  await put(st, 'students', { name: 'C' });
  out.before = await names();

  // معلومات قبل التأكيد
  out.inspect = await B.inspectBackupFile(asFile(oldPayload));
  out.snapBefore = await B.getSafetySnapshotInfo();

  // ملف غير صالح لا يغيّر شيئاً
  try { await B.restoreFromBackupFile(asFile('not json')); out.badThrows = 'no'; } catch (e) { out.badThrows = e.message; }
  out.afterBad = await names();

  // استعادة النسخة القديمة
  await B.restoreFromBackupFile(asFile(oldPayload));
  out.afterRestore = await names();
  out.snapAfter = !!(await B.getSafetySnapshotInfo());

  // التراجع يُرجع C
  await B.restoreFromSafetySnapshot();
  out.afterUndo = await names();

  // فشل أثناء الاستعادة → رجوع تلقائي للوضع السابق (سجل بلا مفتاح في مخزن homeworks)
  const bad = JSON.parse(JSON.stringify(oldPayload));
  bad.databases.DarHamHomeworks.stores.homeworks = [{ noId: true }];
  try { await B.restoreFromBackupFile(asFile(bad)); out.rbThrows = 'no'; } catch (e) { out.rbThrows = e.message; }
  out.afterRollback = await names();

  // الاحتفاظ بآخر 3 لقطات فقط + اللقطة لا تدخل النسخة
  for (let i = 0; i < 4; i++) await B.saveSafetySnapshot('t');
  const sdb = await new Promise(r => indexedDB.open('DarHamSafety').onsuccess = e => r(e.target.result));
  out.snapCount = await new Promise(r => { const q = sdb.transaction('snapshots').objectStore('snapshots').count(); q.onsuccess = () => r(q.result); });
  sdb.close();
  out.noSafetyInPayload2 = !('DarHamSafety' in (await B.buildBackupPayload()).databases);
  return out;
});

console.log(JSON.stringify(result));
ok(result.noSafetyInPayload && result.noSafetyInPayload2, 'قاعدة لقطات الأمان لا تدخل النسخة الاحتياطية');
ok(result.inspect.studentsInBackup === 2 && result.inspect.studentsNow === 3 && !!result.inspect.exportedAt, 'inspect: عدد طلاب النسخة 2 والحاليين 3 والتاريخ موجود');
ok(result.snapBefore === null, 'لا توجد لقطة قبل أي استعادة');
ok(result.badThrows === 'INVALID_JSON' && result.afterBad.join() === 'A,B,C', 'ملف تالف يُرفض ولا يغيّر البيانات');
ok(result.afterRestore.join() === 'A,B' && result.snapAfter, 'الاستعادة تُرجع A,B بلا تكرار وتُنشئ لقطة أمان');
ok(result.afterUndo.join() === 'A,B,C', 'التراجع يُعيد الطالب C الأحدث');
ok(result.rbThrows === 'RESTORE_FAILED_ROLLED_BACK' && result.afterRollback.join() === 'A,B,C', 'فشل الاستعادة يُرجع الوضع السابق تلقائياً');
ok(result.snapCount === 3, 'يُحتفظ بآخر 3 لقطات فقط');
ok(errors.length === 0, 'لا أخطاء صفحة: ' + errors.join('|'));
console.log(`\n${pass} passed, ${fail} failed`);
await browser.close(); srv.close();
process.exit(fail ? 1 : 0);
