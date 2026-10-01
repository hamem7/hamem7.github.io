// tests/cleanup.test.mjs — run: node tests/cleanup.test.mjs
// 🌟 [جديد 2026-10-01] اختبارات التنظيف التلقائي (computeCleanup_/runCleanup_) عبر محاكي Apps Script.
// القواعد: واجب معتمد بالكامل يُحذف بعد 20 يوماً من اعتماد آخر تسليم؛ واجب بلا تسليمات يُحذف بعد 14 يوماً من إنشائه؛
// أي واجب ينتظر تصحيحاً لا يُحذف أبداً.
import assert from 'node:assert/strict';
import { createBackend } from '../dev/gas-emulator.mjs';

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('✅', name); }
  catch (e) { fail++; console.log('❌', name, '\n    ', e.stack || e.message); }
}
const cid = () => 'c_' + Math.random().toString(36).slice(2, 12) + Date.now();
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d) => new Date(Date.now() - d * DAY).toISOString();
const Q = { id: 'w1', type: 'written_blank', text: 't', points: 2, correctAnswer: 'x', needsManualGrading: true };

function fresh() { const be = createBackend(); const key = be.setup(); return { be, key }; }
function mkHw(be, key) { return be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [Q] } }).id; }
function submit(be, hwId, name) { return be.post({ action: 'submit', hwId, clientSubmissionId: cid(), studentName: name, answers: { w1: 'x' } }).submissionId; }
function approve(be, key, subId) { return be.post({ action: 'gradeSubmission', teacherKey: key, submissionId: subId, manualScores: { w1: 2 }, finalize: true }); }
// تعديل أعمدة الأعمدة الثابتة مباشرة في الشيت لمحاكاة مرور الزمن: HW col2=createdAt ؛ SUB col14=approvedAt
function setHwCreated(be, hwId, iso) { const d = be.ss.getSheetByName('Homeworks').data; const r = d.findIndex((row, i) => i > 0 && row && row[0] === hwId); d[r][1] = iso; }
function setSubApproved(be, subId, iso) { const d = be.ss.getSheetByName('Submissions').data; const r = d.findIndex((row, i) => i > 0 && row && row[0] === subId); d[r][13] = iso; }
const hwIds = (be, key) => be.post({ action: 'listHomeworks', teacherKey: key }).homeworks.map(h => h.id);
const subCount = (be, key, statuses) => be.post({ action: 'listSubmissions', teacherKey: key, ...(statuses ? { statuses } : {}) }).submissions.length;
const run = (be, dry = false) => dry ? be.sandbox.previewCleanup() : be.sandbox.dailyCleanup();

await test('approved homework older than 20 days is deleted together with ALL its submissions; newer/others untouched', () => {
  const { be, key } = fresh();
  const old = mkHw(be, key), fresh19 = mkHw(be, key);
  const s1 = submit(be, old, 'أحمد'), s2 = submit(be, old, 'بدر'), s3 = submit(be, fresh19, 'جمال');
  [s1, s2, s3].forEach(s => approve(be, key, s));
  setSubApproved(be, s1, daysAgo(30)); setSubApproved(be, s2, daysAgo(21));   // آخر اعتماد قبل 21 يوماً
  setSubApproved(be, s3, daysAgo(19));
  const r = run(be);
  assert.equal(r.homeworks, 1); assert.equal(r.approved, 1); assert.equal(r.submissions, 2);
  assert.deepEqual(hwIds(be, key), [fresh19]);
  assert.equal(subCount(be, key, ['approved']), 1);        // شهادات الواجب المحذوف اختفت مع تسليماته
});

await test('20 days is counted from the LATEST approval, not from creation', () => {
  const { be, key } = fresh();
  const h = mkHw(be, key); setHwCreated(be, h, daysAgo(90));
  const a = submit(be, h, 'أحمد'), b = submit(be, h, 'بدر');
  approve(be, key, a); approve(be, key, b);
  setSubApproved(be, a, daysAgo(60)); setSubApproved(be, b, daysAgo(2));   // الأخير اعتُمد قبل يومين
  assert.equal(run(be).homeworks, 0);
  assert.deepEqual(hwIds(be, key), [h]);
});

await test('a homework waiting for grading is NEVER deleted (even if very old), also when only one of its submissions is approved', () => {
  const { be, key } = fresh();
  const h = mkHw(be, key); setHwCreated(be, h, daysAgo(400));
  const a = submit(be, h, 'أحمد'); submit(be, h, 'بدر');                         // الثاني لم يُصحَّح
  approve(be, key, a); setSubApproved(be, a, daysAgo(200));
  const r = run(be);
  assert.equal(r.homeworks, 0); assert.equal(r.skippedWaitingGrading, 1);
  assert.deepEqual(hwIds(be, key), [h]);
});

await test('a homework nobody submitted is deleted after 14 days from creation (not before)', () => {
  const { be, key } = fresh();
  const old = mkHw(be, key), recent = mkHw(be, key);
  setHwCreated(be, old, daysAgo(15)); setHwCreated(be, recent, daysAgo(13));
  const r = run(be);
  assert.equal(r.empty, 1);
  assert.deepEqual(hwIds(be, key), [recent]);
});

await test('only-voided submissions: homework is left alone (conservative); voided submissions do not block an otherwise approved homework', () => {
  const { be, key } = fresh();
  const onlyVoid = mkHw(be, key); setHwCreated(be, onlyVoid, daysAgo(100));
  const v = submit(be, onlyVoid, 'أحمد'); be.post({ action: 'voidSubmission', teacherKey: key, submissionId: v });
  const mixed = mkHw(be, key);
  const a = submit(be, mixed, 'بدر'), v2 = submit(be, mixed, 'جمال');
  approve(be, key, a); setSubApproved(be, a, daysAgo(25)); be.post({ action: 'voidSubmission', teacherKey: key, submissionId: v2 });
  const r = run(be);
  assert.equal(r.homeworks, 1); assert.equal(r.submissions, 2);            // mixed + سطرَيه (المعتمد والملغى)
  assert.deepEqual(hwIds(be, key), [onlyVoid]);
});

await test('invalid/missing approvedAt on an approved submission → homework is kept', () => {
  const { be, key } = fresh();
  const h = mkHw(be, key); const a = submit(be, h, 'أحمد'); approve(be, key, a);
  setSubApproved(be, a, 'not-a-date');
  assert.equal(run(be).homeworks, 0);
  assert.deepEqual(hwIds(be, key), [h]);
});

await test('previewCleanup reports the plan but deletes nothing', () => {
  const { be, key } = fresh();
  const h = mkHw(be, key); const a = submit(be, h, 'أحمد'); approve(be, key, a); setSubApproved(be, a, daysAgo(40));
  const r = run(be, true);
  assert.equal(r.dryRun, true); assert.equal(r.homeworks, 1);
  assert.deepEqual(hwIds(be, key), [h]); assert.equal(subCount(be, key), 1);
});

await test('after a cleanup the sheets still work: rows are compact, new homework/submit/grade/list behave normally', () => {
  const { be, key } = fresh();
  const ids = [];
  for (let i = 0; i < 6; i++) { const h = mkHw(be, key); ids.push(h); const s = submit(be, h, 'طالب' + i); approve(be, key, s); setSubApproved(be, s, daysAgo(i % 2 ? 40 : 1)); }
  const r = run(be);
  assert.equal(r.homeworks, 3);
  const left = hwIds(be, key); assert.equal(left.length, 3);
  assert.equal(subCount(be, key), 3);
  const h2 = mkHw(be, key); const s2 = submit(be, h2, 'جديد2'); assert.equal(approve(be, key, s2).ok, true);
  assert.equal(hwIds(be, key).length, 4); assert.equal(subCount(be, key), 4);
  assert.equal(run(be).homeworks, 0);                                      // تشغيل ثانٍ: لا شيء جديد
});

await test('cleanup on empty sheets is a harmless no-op', () => {
  const { be } = fresh();
  const r = run(be); assert.equal(r.homeworks, 0); assert.equal(r.errors.length, 0);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
