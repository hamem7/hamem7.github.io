// tests/student-feedback.backend.test.mjs — المراجعة الفورية للطالب بعد التسليم (backend/Code.gs الحقيقي عبر محاكي Apps Script).
// القاعدة: حالة كل سؤال آلي + الإجابة الصحيحة للخاطئ فقط، وبلا أي درجة/نقاط/نسبة في ردّ الطالب.
// الاستعمال: node tests/student-feedback.backend.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { createTeacherBackend } = await import(pathToFileURL(path.join(REPO, 'Dar-Ham-Homework-Lab/dev/gas-emulator.mjs')).href);

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('✅', name); } catch (e) { fail++; console.log('❌', name, '\n    ', e.message); }
}
const questions = () => [
  { id: 'q1', type: 'mcq', title: 'x', options: ['a', 'b'], correctAnswer: 'a', points: 1 },
  { id: 'q2', type: 'mcq', title: 'y', options: ['a', 'b'], correctAnswer: 'a', points: 1 },
  { id: 'q3', type: 'written_blank', title: 'z', correctAnswer: 'كلمة', points: 1, needsManualGrading: true },
  { id: 'q4', type: 'matrix_order', title: 'm', options: ['1', '2', '3'], correctAnswer: ['1', '2', '3'], points: 3 },
  { id: 'q5', type: 'dual_dropdown', title: 'd', options1: ['x', 'y'], options2: ['p', 'q'], correctAnswer: ['x', 'p'], points: 2 }
];
function setup() {
  const { be, auth } = createTeacherBackend({ codePath: path.join(REPO, 'backend/Code.gs') });
  const hw = be.post({ action: 'createHomework', ...auth, homework: { questions: questions(), assignedStudentName: 'سارة' } });
  return { be, hwId: hw.homework ? hw.homework.id : hw.id };
}
const send = (be, hwId, answers, cid = 'c_aaaaaaaaaaaa') => be.post({ action: 'submit', hwId, clientSubmissionId: cid, studentName: 'سارة', answers });

await test('الردّ يحوي حالة كل سؤال، والإجابة الصحيحة للخاطئ والجزئي فقط', () => {
  const { be, hwId } = setup();
  const r = send(be, hwId, { q1: 'a', q2: 'b', q3: 'x', q4: ['1', '3', '2'], q5: ['x', 'q'] });
  assert.equal(r.ok, true); assert.equal(r.persisted, true);
  const f = Object.fromEntries(r.feedback.map(x => [x.qid, x]));
  assert.equal(f.q1.state, 'correct'); assert.equal('correct' in f.q1, false);
  assert.equal(f.q2.state, 'wrong'); assert.equal(f.q2.correct, 'a');
  assert.equal(f.q3.state, 'manual'); assert.equal('correct' in f.q3, false);   // اليدوي: لا حكم ولا مفتاح
  assert.equal(f.q4.state, 'partial'); assert.deepEqual(f.q4.correct, ['1', '2', '3']);
  assert.equal(f.q5.state, 'partial'); assert.deepEqual(f.q5.correct, ['x', 'p']);
});

await test('لا درجة ولا نقاط ولا نسبة في ردّ الطالب', () => {
  const { be, hwId } = setup();
  const r = send(be, hwId, { q1: 'a', q2: 'a' });
  const txt = JSON.stringify(r);
  for (const k of ['score', 'Score', 'earned', 'totalPoints', 'provisional', 'finalScore']) assert.equal(txt.includes(k), false, 'يسرّب ' + k);
});

await test('إعادة الإرسال بنفس المعرّف (duplicate) تعيد نفس المراجعة', () => {
  const { be, hwId } = setup();
  const a = send(be, hwId, { q1: 'b', q2: 'a' });
  const b = send(be, hwId, { q1: 'b', q2: 'a' });
  assert.equal(b.duplicate, true);
  assert.deepEqual(b.feedback, a.feedback);
});

console.log(`\n${pass} نجح، ${fail} فشل`);
process.exit(fail ? 1 : 0);
