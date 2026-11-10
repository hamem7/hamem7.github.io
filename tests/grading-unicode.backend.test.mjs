// tests/grading-unicode.backend.test.mjs — التصحيح الآلي لا يتأثر بترتيب علامات التشكيل (شدّة/حركة) الذي ترجعه بعض الأجهزة
// (مثل iOS 15: نص NFC) ولا بشكل السكون ولا بالمسافات الخفية. المفتاح مخزَّن بالترتيب الأصلي (الشدّة أولاً).
// الاستعمال: node tests/grading-unicode.backend.test.mjs
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { createTeacherBackend } = await import(pathToFileURL(path.join(REPO, 'Dar-Ham-Homework-Lab/dev/gas-emulator.mjs')).href);

let pass = 0, fail = 0;
async function test(name, fn) { try { await fn(); pass++; console.log('✅', name); } catch (e) { fail++; console.log('❌', name, '\n    ', e.message); } }

// المفتاح: الشدّة قبل الحركة (U+0651 ثم U+064E/U+064F)؛ جهاز iOS القديم يرجعها NFC (الحركة قبل الشدّة)
const KEY1 = 'وَإِنَّا', KEY2 = 'مُّبِينُّ', W1 = 'ٱلسَّمَآءِ', W2 = 'ٱلْأَرْضِ';
const nfc = (s) => s.normalize('NFC');
assert.notEqual(KEY1, nfc(KEY1), 'يجب أن يختلف المفتاح عن NFC في هذا الاختبار');

function run(answers) {
  const { be, auth } = createTeacherBackend({ codePath: path.join(REPO, 'backend/Code.gs') });
  const questions = [
    { id: 'q1', type: 'mcq', title: 'a', options: [KEY1, 'x'], correctAnswer: KEY1, points: 1 },
    { id: 'q2', type: 'dropdown', title: 'b', options: [KEY2, 'x'], correctAnswer: KEY2, points: 1 },
    { id: 'q3', type: 'checkbox', title: 'c', options: [KEY1, KEY2, 'x'], correctAnswer: [KEY1, KEY2], points: 1 },
    { id: 'q4', type: 'matrix_order', title: 'd', options: [KEY2, KEY1], correctAnswer: [KEY1, KEY2], points: 2 },
    { id: 'q5', type: 'dual_dropdown', title: 'e', options1: [W1, 'y'], options2: [W2, 'z'], correctAnswer: [W1, W2], points: 2 }
  ];
  const hw = be.post({ action: 'createHomework', ...auth, homework: { questions, assignedStudentName: 'غيث' } });
  const hwId = hw.homework ? hw.homework.id : hw.id;
  return be.post({ action: 'submit', hwId, clientSubmissionId: 'c_aaaaaaaaaaaa', studentName: 'غيث', answers });
}
const ok = (r) => { assert.ok(r.ok, JSON.stringify(r)); return r.feedback; };

await test('إجابات NFC (جهاز iOS قديم) تُحتسب صحيحة في كل أنواع الأسئلة', () => {
  const fb = ok(run({ q1: nfc(KEY1), q2: nfc(KEY2), q3: [nfc(KEY2), nfc(KEY1)], q4: [nfc(KEY1), nfc(KEY2)], q5: [nfc(W1), nfc(W2)] }));
  assert.ok(fb.every(f => f.state === 'correct'), JSON.stringify(fb));
});
await test('الإجابات بالترتيب الأصلي ما زالت صحيحة', () => {
  const fb = ok(run({ q1: KEY1, q2: KEY2, q3: [KEY1, KEY2], q4: [KEY1, KEY2], q5: [W1, W2] }));
  assert.ok(fb.every(f => f.state === 'correct'), JSON.stringify(fb));
});
await test('الإجابة الخاطئة فعلاً تبقى خاطئة', () => {
  const fb = ok(run({ q1: 'x', q2: 'x', q3: [KEY1, 'x'], q4: [KEY2, KEY1], q5: ['y', 'z'] }));
  assert.ok(fb.every(f => f.state !== 'correct'), JSON.stringify(fb));
});
console.log(`\n${pass} نجح، ${fail} فشل`);
process.exit(fail ? 1 : 0);
