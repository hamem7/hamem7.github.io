// tests/sync-logs.backend.test.mjs — اختبار خادم المزامنة ومراقبة الأخطاء (backend/Code.gs الحقيقي عبر محاكي Apps Script).
// الاستعمال: node tests/sync-logs.backend.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { createTeacherBackend } = await import(pathToFileURL(path.join(REPO, 'Dar-Ham-Homework-Lab/dev/gas-emulator.mjs')).href);
process.env.CODE_GS = path.join(REPO, 'backend/Code.gs');

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('✅', name); } catch (e) { fail++; console.log('❌', name, '\n    ', e.message); }
}
function mk() {
  const { be, auth } = createTeacherBackend({ codePath: path.join(REPO, 'backend/Code.gs'), tokens: { t2: { sub: 'teacher-2', email: 't2@example.com' } } });
  const r2 = be.post({ action: 'googleSignIn', idToken: 't2' });
  return { be, a: auth, b: { userId: r2.userId, sessionKey: r2.sessionKey } };
}
const hwBody = () => ({ questions: [{ id: 'q1', type: 'mcq', title: 'x', options: ['a', 'b'], correctAnswer: 'a', points: 1 }] });

// ------------------------------------------------------------ المزامنة
await test('syncPush يحفظ ويتحقق (persisted) ثم syncManifest وsyncPull يعيدان نفس البيانات', () => {
  const { be, a } = mk();
  const r = be.post({ action: 'syncPush', ...a, items: [{ key: 'u1:s', expectedRev: 0, data: { name: 'أحمد' } }, { key: 'u1:h:2026-10', expectedRev: 0, data: [{ a: 1 }] }] });
  assert.equal(r.ok, true); assert.equal(r.persisted, true); assert.equal(r.written.length, 2); assert.equal(r.conflicts.length, 0);
  const m = be.post({ action: 'syncManifest', ...a });
  assert.deepEqual(m.items.map(x => x.key).sort(), ['u1:h:2026-10', 'u1:s']);
  const p = be.post({ action: 'syncPull', ...a, keys: ['u1:s', 'u1:h:2026-10', 'nope:x'] });
  assert.equal(p.items.length, 2);
  assert.deepEqual(p.items.find(x => x.key === 'u1:s').data, { name: 'أحمد' });
  assert.deepEqual(p.items.find(x => x.key === 'u1:h:2026-10').data, [{ a: 1 }]);
});

await test('الكتابة بتفاؤل: expectedRev قديم يعطي conflicts ولا يكتب فوق النسخة الأحدث', () => {
  const { be, a } = mk();
  const first = be.post({ action: 'syncPush', ...a, items: [{ key: 'k:one', expectedRev: 0, data: { v: 1 } }] });
  const rev1 = first.written[0].rev;
  const second = be.post({ action: 'syncPush', ...a, items: [{ key: 'k:one', expectedRev: rev1, data: { v: 2 } }] });
  assert.equal(second.conflicts.length, 0); assert.ok(second.written[0].rev > rev1);
  const stale = be.post({ action: 'syncPush', ...a, items: [{ key: 'k:one', expectedRev: rev1, data: { v: 999 } }] });
  assert.equal(stale.written.length, 0); assert.equal(stale.conflicts.length, 1); assert.equal(stale.conflicts[0].rev, second.written[0].rev);
  const again = be.post({ action: 'syncPush', ...a, items: [{ key: 'k:one', expectedRev: 0, data: { v: 5 } }] });   // «جديد» وهو موجود
  assert.equal(again.conflicts.length, 1);
  assert.deepEqual(be.post({ action: 'syncPull', ...a, keys: ['k:one'] }).items[0].data, { v: 2 });
});

await test('عزل المعلمين: معلم آخر لا يرى ولا يكتب فوق مفاتيح غيره', () => {
  const { be, a, b } = mk();
  be.post({ action: 'syncPush', ...a, items: [{ key: 'shared:key', expectedRev: 0, data: { owner: 'a' } }] });
  assert.equal(be.post({ action: 'syncManifest', ...b }).items.length, 0);
  assert.equal(be.post({ action: 'syncPull', ...b, keys: ['shared:key'] }).items.length, 0);
  const w = be.post({ action: 'syncPush', ...b, items: [{ key: 'shared:key', expectedRev: 0, data: { owner: 'b' } }] });
  assert.equal(w.conflicts.length, 0);   // مفتاحه هو لا مفتاح a
  assert.deepEqual(be.post({ action: 'syncPull', ...a, keys: ['shared:key'] }).items[0].data, { owner: 'a' });
});

await test('بلا جلسة جوجل: كل إجراءات المزامنة تُرفض UNAUTHORIZED', () => {
  const { be } = mk();
  for (const action of ['syncManifest', 'syncPull', 'syncPush', 'listClientErrors']) {
    const r = be.post({ action, keys: ['abc'], items: [{ key: 'abc', data: {} }] });
    assert.equal(r.ok, false); assert.equal(r.code, 'UNAUTHORIZED', action);
  }
});

await test('تحقق المدخلات: مفتاح غير صالح، بيانات ليست كائناً، تكرار مفتاح، عدد كبير، حجم كبير', () => {
  const { be, a } = mk();
  const bad = (items) => be.post({ action: 'syncPush', ...a, items });
  assert.equal(bad([{ key: 'a b', expectedRev: 0, data: {} }]).code, 'BAD_REQUEST');
  assert.equal(bad([{ key: 'abc', expectedRev: 0, data: 'x' }]).code, 'BAD_REQUEST');
  assert.equal(bad([{ key: 'abc', expectedRev: 0, data: {} }, { key: 'abc', expectedRev: 0, data: {} }]).code, 'BAD_REQUEST');
  assert.equal(bad(Array.from({ length: 21 }, (_, i) => ({ key: 'k' + i + 'xx', expectedRev: 0, data: {} }))).code, 'BAD_REQUEST');
  assert.equal(bad([{ key: 'big', expectedRev: 0, data: { s: 'x'.repeat(331000) } }]).code, 'TOO_LARGE');
  assert.equal(be.post({ action: 'syncPull', ...a, keys: [] }).code, 'BAD_REQUEST');
  assert.equal(be.post({ action: 'syncPull', ...a, keys: Array.from({ length: 9 }, (_, i) => 'k' + i + 'xx') }).code, 'BAD_REQUEST');
});

await test('حد الصفوف لكل معلم (3000)', () => {
  const { be, a } = mk();
  vm.runInContext('MAX_SYNC_ROWS_PER_TEACHER = 3', be.sandbox);
  const r = be.post({ action: 'syncPush', ...a, items: ['aaa', 'bbb', 'ccc'].map(k => ({ key: k, expectedRev: 0, data: {} })) });
  assert.equal(r.ok, true);
  const over = be.post({ action: 'syncPush', ...a, items: [{ key: 'ddd', expectedRev: 0, data: {} }] });
  assert.equal(over.code, 'LIMIT_REACHED');
  const upd = be.post({ action: 'syncPush', ...a, items: [{ key: 'aaa', expectedRev: r.written[0].rev, data: { n: 1 } }] });
  assert.equal(upd.ok, true);   // تحديث موجود مسموح
});

await test('بيانات عربية وكبيرة (≈ 250KB) تُحفظ وتُقرأ بلا تلف', () => {
  const { be, a } = mk();
  const data = { arr: Array.from({ length: 2500 }, (_, i) => ({ i, t: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ ' + i })) };
  assert.ok(JSON.stringify(data).length > 150000);
  assert.equal(be.post({ action: 'syncPush', ...a, items: [{ key: 'big:one', expectedRev: 0, data }] }).persisted, true);
  assert.deepEqual(be.post({ action: 'syncPull', ...a, keys: ['big:one'] }).items[0].data, data);
});

// ------------------------------------------------------------ تسجيل الأخطاء
await test('logClientError: يسجّل خطأ لواجب معلم، ويراه صاحبه وحده، ويرجع ok دائماً', () => {
  const { be, a, b } = mk();
  const hw = be.post({ action: 'createHomework', ...a, homework: hwBody() });
  const r = be.post({ action: 'logClientError', hwId: hw.id, kind: 'submit_failed', code: 'NETWORK', message: 'تعذّر الاتصال بالخادم', page: 'student', online: false, ua: 'UA/1' });
  assert.equal(r.ok, true); assert.equal(r.logged, true);
  const mine = be.post({ action: 'listClientErrors', ...a });
  assert.equal(mine.total, 1); assert.equal(mine.items[0].kind, 'submit_failed'); assert.equal(mine.items[0].hwId, hw.id); assert.equal(mine.items[0].online, false);
  assert.equal(be.post({ action: 'listClientErrors', ...b }).total, 0);
});

await test('logClientError: تنظيف المدخلات، نوع مجهول → other، رسالة فارغة تُسقط، معرّف واجب غير صالح يُهمل', () => {
  const { be, a } = mk();
  const r = be.post({ action: 'logClientError', hwId: 'HW_zzz', kind: 'weird', message: '<script>alert(1)</script>  خطأ\n\tطويل ' + 'x'.repeat(500) });
  assert.equal(r.logged, true);
  assert.equal(be.post({ action: 'logClientError', kind: 'js_error', message: '   ' }).logged, false);
  const rows = be.ss.getSheetByName('ClientLogs');
  const text = JSON.stringify(rows.data);
  assert.ok(!text.includes('<script>'));
  assert.ok(text.includes('other'));
});

await test('logClientError: حد المعدل لكل واجب وإسقاط التكرار المتطابق', () => {
  const { be, a } = mk();
  const hw = be.post({ action: 'createHomework', ...a, homework: hwBody() });
  const dup1 = be.post({ action: 'logClientError', hwId: hw.id, kind: 'js_error', message: 'same' });
  const dup2 = be.post({ action: 'logClientError', hwId: hw.id, kind: 'js_error', message: 'same' });
  assert.equal(dup1.logged, true); assert.equal(dup2.logged, false); assert.equal(dup2.dropped, 'duplicate');
  let logged = 1, dropped = 0;
  for (let i = 0; i < 30; i++) { const r = be.post({ action: 'logClientError', hwId: hw.id, kind: 'js_error', message: 'm' + i }); r.logged ? logged++ : dropped++; }
  assert.equal(logged, 10);          // LOG_PER_HW_PER_MIN
  assert.ok(dropped >= 20);
  assert.equal(be.post({ action: 'listClientErrors', ...a, limit: 100 }).total, 10);
});

await test('logClientError: لا يفشل أبداً بوجه الطالب حتى لو الورقة غير موجودة أو القفل مشغول', () => {
  const { be } = mk();
  be.hooks.lockBusy = true;
  const busy = be.post({ action: 'logClientError', kind: 'js_error', message: 'busy case' });
  assert.equal(busy.ok, true); assert.equal(busy.logged, false);
  be.hooks.lockBusy = false;
  delete be.ss.sheets.ClientLogs;
  const missing = be.post({ action: 'logClientError', kind: 'js_error', message: 'missing sheet' });
  assert.equal(missing.ok, true); assert.equal(missing.logged, false);
});

await test('تقليم السجل: عند 1500 صف تُحذف أقدم 500', () => {
  const { be, a } = mk();
  vm.runInContext('LOG_PER_HW_PER_MIN = 100000; LOG_GLOBAL_PER_MIN = 100000; MAX_LOG_ROWS = 20; LOG_TRIM_ROWS = 5', be.sandbox);
  for (let i = 0; i < 24; i++) be.post({ action: 'logClientError', kind: 'js_error', message: 'row ' + i });
  const rows = be.ss.getSheetByName('ClientLogs');
  assert.ok(rows.getLastRow() - 1 <= 20, 'rows=' + (rows.getLastRow() - 1));
  assert.ok(rows.getLastRow() - 1 >= 15);
});

await test('الإجراءات القديمة سليمة: ping/createHomework/getHomework + نسخة الخادم 1.4.0', () => {
  const { be, a } = mk();
  assert.equal(be.get({ action: 'ping' }).version, '1.4.0');
  const hw = be.post({ action: 'createHomework', ...a, homework: hwBody() });
  assert.equal(hw.persisted, true);
  assert.equal(be.get({ action: 'getHomework', id: hw.id }).ok, true);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
