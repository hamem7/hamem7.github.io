// tests/backup-alerts.backend.test.mjs — النسخ الاحتياطي الأسبوعي + تنبيه المالك + سقف SyncData الإجمالي (backend/Code.gs عبر المحاكي).
// الاستعمال: node tests/backup-alerts.backend.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { createTeacherBackend } = await import(pathToFileURL(path.join(REPO, 'Dar-Ham-Homework-Lab/dev/gas-emulator.mjs')).href);
const CODE = path.join(REPO, 'backend/Code.gs');
let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('✅', name); } catch (e) { fail++; console.log('❌', name, '\n    ', e.message); }
}

// محاكاة Drive / Mail / Session / ScriptApp (غير موجودة في المحاكي الأساسي)
function installGoogleMocks(sb, { failCopy = false } = {}) {
  const files = []; const mails = []; let triggers = [];
  const mkFile = (name) => ({ name, trashed: false, getName() { return this.name; }, setTrashed(v) { this.trashed = v; }, getId() { return 'id_' + name; } });
  const folder = { getFiles: () => { const l = files.filter(f => !f.trashed); let i = 0; return { hasNext: () => i < l.length, next: () => l[i++] }; } };
  sb.DriveApp = {
    getFoldersByName: () => ({ hasNext: () => true, next: () => folder }),
    createFolder: () => folder,
    getFileById: () => ({ makeCopy: (name) => { if (failCopy) throw new Error('Exception: No item with the given ID could be found'); const f = mkFile(name); files.push(f); return f; } })
  };
  sb.MailApp = { sendEmail: (to, subject, body) => mails.push({ to, subject, body }) };
  sb.Session = { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) };
  sb.ScriptApp = {
    WeekDay: { SUNDAY: 'SUNDAY' },
    getProjectTriggers: () => triggers.map(h => ({ getHandlerFunction: () => h })),
    deleteTrigger: (t) => { triggers = triggers.filter(h => h !== t.getHandlerFunction()); },
    newTrigger: (h) => ({ timeBased() { return this; }, onWeekDay() { return this; }, everyDays() { return this; }, atHour() { return this; }, create() { triggers.push(h); } })
  };
  return { files, mails, triggers: () => triggers };
}
function mk(opts) { const r = createTeacherBackend({ codePath: CODE }); const g = installGoogleMocks(r.be.sandbox, opts); return { ...r, g }; }

await test('backupNamesToTrim_ يُبقي أحدث 8 نسخ فقط ويتجاهل الملفات الغريبة', () => {
  const { be } = mk();
  const names = []; for (let d = 1; d <= 11; d++) names.push('DarHam-Backup-2026-10-' + String(d).padStart(2, '0') + '_0400');
  names.push('ملف-آخر.txt');
  const drop = be.sandbox.backupNamesToTrim_(names, 8);
  assert.deepEqual([...drop].sort(), names.slice(0, 3));
});

await test('backupSpreadsheet ينشئ نسخة باسم مؤرَّخ ولا يرسل بريداً عند النجاح', () => {
  const { be, g } = mk();
  const r = be.sandbox.backupSpreadsheet();
  assert.match(r.name, /^DarHam-Backup-\d{4}-\d{2}-\d{2}_\d{4}$/);
  assert.equal(g.files.length, 1); assert.equal(g.mails.length, 0);
});

await test('بعد 10 نسخ تبقى 8 غير محذوفة والأقدم في المهملات', () => {
  const { be, g } = mk();
  for (let d = 1; d <= 10; d++) g.files.push({ name: 'DarHam-Backup-2026-09-' + String(d).padStart(2, '0') + '_0400', trashed: false, getName() { return this.name; }, setTrashed(v) { this.trashed = v; } });
  be.sandbox.backupSpreadsheet();
  const alive = g.files.filter(f => !f.trashed);
  assert.equal(alive.length, 8);
  assert.ok(alive.some(f => f.name.includes('2026-09-10')));
  assert.ok(!alive.some(f => f.name.includes('2026-09-01')));
});

await test('فشل النسخ يرسل بريد تنبيه فيه اسم العملية والخطأ والخطوة، ثم يرمي الخطأ', () => {
  const { be, g } = mk({ failCopy: true });
  assert.throws(() => be.sandbox.backupSpreadsheet(), /No item with the given ID/);
  assert.equal(g.mails.length, 1);
  const m = g.mails[0];
  assert.equal(m.to, 'owner@example.com');
  assert.match(m.subject, /backupSpreadsheet/);
  for (const part of ['العملية:', 'وقت الفشل:', 'نص الخطأ:', 'No item with the given ID', 'السبب المرجّح', 'Executions']) assert.ok(m.body.includes(part), part);
});

await test('dailyCleanup الناجح لا يرسل بريداً', () => {
  const { be, g } = mk();
  be.sandbox.dailyCleanup();
  assert.equal(g.mails.length, 0);
});

await test('dailyCleanup يرسل تنبيهاً عندما يتعذّر القفل (BUSY)', () => {
  const { be, g } = mk();
  be.hooks.lockBusy = true;
  assert.throws(() => be.sandbox.dailyCleanup());
  assert.equal(g.mails.length, 1); assert.match(g.mails[0].subject, /dailyCleanup/);
});

await test('فشل إرسال البريد نفسه لا يُسقط العملية الأصلية (يرجع false)', () => {
  const { be, g } = mk(); be.sandbox.MailApp = { sendEmail: () => { throw new Error('mail down'); } };
  assert.equal(be.sandbox.notifyOwnerFailure_('x', new Error('boom')), false);
});

await test('installBackupTrigger يمنع تكرار المشغِّل', () => {
  const { be, g } = mk();
  be.sandbox.installBackupTrigger(); be.sandbox.installBackupTrigger();
  assert.deepEqual(g.triggers(), ['backupSpreadsheet']);
  be.sandbox.removeBackupTrigger(); assert.deepEqual(g.triggers(), []);
});

await test('السقف الإجمالي لـ SyncData يرفض صفاً جديداً بـ LIMIT_REACHED', () => {
  const { be, auth } = mk();
  be.sandbox.MAX_SYNC_ROWS_TOTAL = 2;
  const ok = be.post({ action: 'syncPush', ...auth, items: [{ key: 'k:a1', expectedRev: 0, data: { v: 1 } }, { key: 'k:a2', expectedRev: 0, data: { v: 1 } }] });
  assert.equal(ok.ok, true);
  const r = be.post({ action: 'syncPush', ...auth, items: [{ key: 'k:a3', expectedRev: 0, data: { v: 1 } }] });
  assert.equal(r.ok, false); assert.equal(r.code, 'LIMIT_REACHED');
  const upd = be.post({ action: 'syncPush', ...auth, items: [{ key: 'k:a1', expectedRev: ok.written[0].rev, data: { v: 2 } }] });
  assert.equal(upd.ok, true);   // تحديث صف موجود لا يتأثر بالسقف
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
