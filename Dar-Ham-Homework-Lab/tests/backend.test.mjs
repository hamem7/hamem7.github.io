// tests/backend.test.mjs — run: node tests/backend.test.mjs
// Exercises the REAL backend/Code.gs through dev/gas-emulator.mjs (in-memory Sheets mock).
// These are logic tests of OUR code. They do not prove Google-platform behaviour.
import assert from 'node:assert/strict';
import { createBackend } from '../dev/gas-emulator.mjs';
import { HomeworkEngine } from '../vendor/engine/homeworkEngine.js';
import { buildFakeQuranEngine } from './fake-quran.mjs';

let pass = 0, fail = 0;
async function test(name, fn) {
  try { await fn(); pass++; console.log('✅', name); }
  catch (e) { fail++; console.log('❌', name, '\n    ', e.message); }
}

function fresh() {
  const be = createBackend();
  const key = be.setup();
  return { be, key };
}
async function makeQuestions(n = 10) {
  const engine = new HomeworkEngine(buildFakeQuranEngine());
  return engine.generateAutoQuestions({ mode: 'surah', surahNum: 101, startAyah: 1, endAyah: 12, qCount: n });
}
/** Best possible student: answers every auto question correctly. */
function perfectAnswers(questions) {
  const a = {};
  questions.forEach(q => {
    if (q.type === 'matching') { const o = {}; q.correctAnswer.forEach(p => { o[p.left] = p.right; }); a[q.id] = o; }
    else if (q.type === 'written_blank' || q.type === 'write_3_ayahs') a[q.id] = q.correctAnswer;
    else a[q.id] = q.correctAnswer;
  });
  return a;
}
const cid = () => 'c_' + Math.random().toString(36).slice(2, 12) + Date.now();

// ------------------------------------------------------------------ setup / auth
await test('setup() creates both sheets, generates a teacher key, ping reports configured', () => {
  const { be, key } = fresh();
  assert.ok(key && key.length === 12);
  assert.ok(be.ss.getSheetByName('Homeworks') && be.ss.getSheetByName('Submissions'));
  const p = be.get({ action: 'ping' });
  assert.equal(p.ok, true); assert.equal(p.configured, true);
});

await test('teacher actions reject missing/wrong key and never leak data', async () => {
  const { be } = fresh();
  const qs = await makeQuestions(4);
  for (const body of [{ action: 'createHomework', homework: { questions: qs } }, { action: 'listHomeworks' }, { action: 'listSubmissions' }]) {
    assert.equal(be.post(body).code, 'UNAUTHORIZED');
    assert.equal(be.post({ ...body, teacherKey: 'WRONG' }).code, 'UNAUTHORIZED');
  }
});

await test('teacher actions cannot be invoked via GET (keys must not travel in URLs)', () => {
  const { be, key } = fresh();
  assert.equal(be.get({ action: 'listSubmissions', teacherKey: key }).code, 'METHOD_NOT_ALLOWED');
});

await test('brute force: after 20 wrong keys even the right key is locked out', () => {
  const { be, key } = fresh();
  for (let i = 0; i < 20; i++) be.post({ action: 'authCheck', teacherKey: 'nope' + i });
  assert.equal(be.post({ action: 'authCheck', teacherKey: key }).code, 'LOCKED');
});

await test('malformed JSON / unknown action / oversized body are rejected cleanly', () => {
  const { be } = fresh();
  assert.equal(be.post('{not json').code, 'BAD_JSON');
  assert.equal(be.post({ action: 'nope' }).code, 'UNKNOWN_ACTION');
  assert.equal(be.post('x'.repeat(300001)).code, 'TOO_LARGE');
});

// ------------------------------------------------------------------ homework
await test('createHomework: persists, verifies read-back, returns unguessable id (HW_ + 32 hex)', async () => {
  const { be, key } = fresh();
  const r = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: await makeQuestions(8) } });
  assert.equal(r.ok, true); assert.equal(r.persisted, true);
  assert.match(r.id, /^HW_[0-9a-f]{32}$/);
  const ids = new Set();
  for (let i = 0; i < 20; i++) ids.add(be.post({ action: 'createHomework', teacherKey: key, homework: { questions: await makeQuestions(3) } }).id);
  assert.equal(ids.size, 20);
});

await test('createHomework validates questions (empty, duplicate ids, missing answer)', async () => {
  const { be, key } = fresh();
  const qs = await makeQuestions(3);
  assert.equal(be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [] } }).code, 'BAD_REQUEST');
  assert.equal(be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [qs[0], qs[0]] } }).code, 'BAD_REQUEST');
  const noAns = { ...qs[0] }; delete noAns.correctAnswer;
  assert.equal(be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [noAns] } }).code, 'BAD_REQUEST');
});

await test('SECURITY: getHomework (public) never contains correct answers for ANY question type', async () => {
  const { be, key } = fresh();
  // run several generations so every question type appears
  for (let run = 0; run < 6; run++) {
    const qs = await makeQuestions(12);
    const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: qs } });
    const pub = be.get({ action: 'getHomework', id: c.id });
    assert.equal(pub.ok, true);
    const wire = JSON.stringify(pub);
    assert.ok(!wire.includes('correctAnswer'), 'field correctAnswer leaked');
    pub.homework.questions.forEach(q => assert.equal(q.correctAnswer, undefined));
    // free-text answers (written_blank/write_3_ayahs) must not be present anywhere in the payload
    qs.filter(q => q.type === 'write_3_ayahs').forEach(q => assert.ok(!wire.includes(q.correctAnswer), 'write_3_ayahs answer leaked'));
    assert.equal(pub.homework.assignedStudentId, undefined, 'teacher-side student id must not be exposed');
  }
});

await test('getHomework: invalid / unknown / injection-style ids give NOT_FOUND', () => {
  const { be } = fresh();
  for (const id of ['', 'HW_1', 'HW_' + '0'.repeat(32), "HW_' OR 1=1", '../../etc/passwd', undefined]) {
    assert.equal(be.get({ action: 'getHomework', id }).code, 'NOT_FOUND', String(id));
  }
});

await test('closing a homework makes the public link answer CLOSED and blocks new submissions', async () => {
  const { be, key } = fresh();
  const qs = await makeQuestions(4);
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: qs } });
  assert.equal(be.post({ action: 'setHomeworkStatus', teacherKey: key, id: c.id, status: 'closed' }).ok, true);
  assert.equal(be.get({ action: 'getHomework', id: c.id }).code, 'CLOSED');
  assert.equal(be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'سارة', answers: {} }).code, 'CLOSED');
  be.post({ action: 'setHomeworkStatus', teacherKey: key, id: c.id, status: 'published' });
  assert.equal(be.get({ action: 'getHomework', id: c.id }).ok, true);
});

// ------------------------------------------------------------------ submissions
await test('submit: server grades from stored definition; perfect answers => provisional 100 (auto types)', async () => {
  const { be, key } = fresh();
  const qs = await makeQuestions(12);
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: qs } });
  const r = be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'أحمد', answers: perfectAnswers(qs) });
  assert.equal(r.ok, true); assert.equal(r.persisted, true); assert.equal(r.status, 'submitted');
  const list = be.post({ action: 'listSubmissions', teacherKey: key, hwId: c.id });
  assert.equal(list.submissions.length, 1);
  const s = list.submissions[0];
  assert.equal(s.provisionalScore, 100);
  const auto = s.details.filter(d => !d.needsManualGrading);
  assert.ok(auto.every(d => d.isCorrect), 'every auto question should be correct');
});

await test('submit: wrong answers score low; partial credit for matrix_order/dual_dropdown mirrors existing rules', async () => {
  const { be } = fresh();
  const g = be.sandbox.gradeSubmissionData_;
  const q = { id: 'm', type: 'matrix_order', text: 't', points: 4, correctAnswer: ['a', 'b', 'c', 'd'], options: [] };
  const r1 = g([q], { m: ['a', 'b', 'x', 'y'] }, null);
  assert.equal(r1.earnedPoints, 2); assert.equal(r1.finalScore, 50);
  const d = { id: 'd', type: 'dual_dropdown', text: 't', points: 2, correctAnswer: ['w1', 'w2'] };
  assert.equal(g([d], { d: ['w1', 'zz'] }, null).earnedPoints, 1);
  const cb = { id: 'c', type: 'checkbox', text: 't', points: 2, correctAnswer: ['x', 'y'] };
  assert.equal(g([cb], { c: ['y', 'x'] }, null).earnedPoints, 2);       // order-insensitive
  assert.equal(g([cb], { c: ['x'] }, null).earnedPoints, 0);            // all-or-nothing
  const mc = { id: 'q', type: 'mcq', text: 't', points: 1, correctAnswer: 'A', options: ['A', 'B'] };
  assert.equal(g([mc], { q: 'B' }, null).earnedPoints, 0);
  assert.equal(g([mc], {}, null).earnedPoints, 0);                       // unanswered
});

await test('SECURITY: client-supplied score/status/details are ignored (server never trusts client scores)', async () => {
  const { be, key } = fresh();
  const qs = await makeQuestions(6);
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: qs } });
  const r = be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'خالد', answers: {},
    score: 77, status: 'approved', finalScore: 77, details: [{ isCorrect: true }], studentId: 'HACK' });
  assert.equal(r.status, 'submitted');
  const s = be.post({ action: 'listSubmissions', teacherKey: key }).submissions[0];
  assert.equal(s.status, 'submitted');
  assert.equal(s.score, s.provisionalScore); assert.notEqual(s.score, 77); assert.equal(s.finalScore, null);
  assert.notEqual(s.studentId, 'HACK');
  assert.ok(s.details.every(d => d.qid && !d.isCorrect));
});

await test('IDEMPOTENT: replaying the same clientSubmissionId never creates a duplicate', async () => {
  const { be, key } = fresh();
  const qs = await makeQuestions(5);
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: qs } });
  const id = cid();
  const body = { action: 'submit', hwId: c.id, clientSubmissionId: id, studentName: 'ليلى', answers: perfectAnswers(qs) };
  const a = be.post(body), b = be.post(body), d = be.post(body);
  assert.equal(a.duplicate, undefined); assert.equal(b.duplicate, true); assert.equal(d.duplicate, true);
  assert.equal(a.submissionId, b.submissionId);
  assert.equal(be.post({ action: 'listSubmissions', teacherKey: key }).submissions.length, 1);
});

await test('one active submission per student per homework (name-normalised); void allows re-submit', async () => {
  const { be, key } = fresh();
  const qs = await makeQuestions(4);
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: qs } });
  const first = be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'يوسف  محمد', answers: {} });
  assert.equal(first.ok, true);
  const dup = be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: ' يُوسف محمد ', answers: {} });
  assert.equal(dup.code, 'ALREADY_SUBMITTED'); assert.ok(dup.submittedAt);
  assert.equal(be.post({ action: 'voidSubmission', teacherKey: key, submissionId: first.submissionId }).ok, true);
  assert.equal(be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'يوسف محمد', answers: {} }).ok, true);
});

await test('assigned homework: server forces the assigned name/id (client cannot impersonate)', async () => {
  const { be, key } = fresh();
  const qs = await makeQuestions(4);
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: qs, assignedStudentName: 'مريم', assignedStudentId: 77 } });
  const pub = be.get({ action: 'getHomework', id: c.id });
  assert.equal(pub.homework.assignedStudentName, 'مريم');
  const r = be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'someone else', studentId: 999, answers: {} });
  assert.equal(r.ok, true);
  const s = be.post({ action: 'listSubmissions', teacherKey: key }).submissions[0];
  assert.equal(s.studentName, 'مريم'); assert.equal(s.studentId, 77);
});

await test('submit validation: bad ids, missing name, non-object answers', async () => {
  const { be, key } = fresh();
  const qs = await makeQuestions(3);
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: qs } });
  assert.equal(be.post({ action: 'submit', hwId: 'HW_bad', clientSubmissionId: cid(), studentName: 'x y', answers: {} }).code, 'NOT_FOUND');
  assert.equal(be.post({ action: 'submit', hwId: c.id, clientSubmissionId: 'short', studentName: 'x y', answers: {} }).code, 'BAD_REQUEST');
  assert.equal(be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: '', answers: {} }).code, 'BAD_REQUEST');
  assert.equal(be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'اسم', answers: [] }).code, 'BAD_REQUEST');
});

// ------------------------------------------------------------------ grading / approval
await test('grading flow: submitted -> graded (partial) -> approve blocked until all manual scored -> approved', async () => {
  const { be, key } = fresh();
  let qs = await makeQuestions(12);
  // make sure there are at least 2 manual questions
  const manualCount = () => qs.filter(q => q.needsManualGrading).length;
  for (let i = 0; i < 10 && manualCount() < 2; i++) qs = await makeQuestions(12);
  assert.ok(manualCount() >= 2, 'fixture needs manual questions');
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: qs } });
  const sub = be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'هدى', answers: perfectAnswers(qs) });
  const manual = qs.filter(q => q.needsManualGrading);

  // approve immediately => refused (truthful: cannot approve ungraded work)
  assert.equal(be.post({ action: 'gradeSubmission', teacherKey: key, submissionId: sub.submissionId, finalize: true }).code, 'UNGRADED_QUESTIONS');

  // partial save
  let r = be.post({ action: 'gradeSubmission', teacherKey: key, submissionId: sub.submissionId, manualScores: { [manual[0].id]: manual[0].points } });
  assert.equal(r.submission.status, 'graded');
  assert.equal(be.post({ action: 'gradeSubmission', teacherKey: key, submissionId: sub.submissionId, finalize: true }).code, 'UNGRADED_QUESTIONS');

  // score the rest at half points (rounded), then approve
  const scores = {}; manual.slice(1).forEach(q => { scores[q.id] = Math.floor(q.points / 2); });
  r = be.post({ action: 'gradeSubmission', teacherKey: key, submissionId: sub.submissionId, manualScores: scores, finalize: true });
  assert.equal(r.ok, true); assert.equal(r.submission.status, 'approved'); assert.ok(r.submission.approvedAt);

  const total = qs.reduce((s, q) => s + q.points, 0);
  const autoEarned = qs.filter(q => !q.needsManualGrading).reduce((s, q) => s + q.points, 0);
  const manualEarned = manual[0].points + manual.slice(1).reduce((s, q) => s + Math.floor(q.points / 2), 0);
  assert.equal(r.submission.totalPoints, total);
  assert.equal(r.submission.earnedPoints, autoEarned + manualEarned);
  assert.equal(r.submission.finalScore, Math.round(((autoEarned + manualEarned) / total) * 100));
  assert.equal(r.submission.score, r.submission.finalScore);
});

await test('grading clamps manual scores to [0, max] and rejects stale versions', async () => {
  const { be, key } = fresh();
  const q = { id: 'w1', type: 'written_blank', text: 't', points: 2, correctAnswer: 'x', needsManualGrading: true };
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [q] } });
  const sub = be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'نور', answers: { w1: 'x' } });
  const s0 = be.post({ action: 'listSubmissions', teacherKey: key }).submissions[0];
  let r = be.post({ action: 'gradeSubmission', teacherKey: key, submissionId: sub.submissionId, manualScores: { w1: 99 }, finalize: true });
  assert.equal(r.submission.details[0].manualScore, 2); assert.equal(r.submission.finalScore, 100);
  r = be.post({ action: 'gradeSubmission', teacherKey: key, submissionId: sub.submissionId, manualScores: { w1: -5 }, expectedVersion: s0.version });
  assert.equal(r.code, 'VERSION_CONFLICT');
});

await test('teacher can map a free-name submission to a Dar Ham student id on approval', async () => {
  const { be, key } = fresh();
  const q = { id: 'w1', type: 'written_blank', text: 't', points: 2, correctAnswer: 'x', needsManualGrading: true };
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [q] } });
  const sub = be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'Sara', answers: { w1: 'x' } });
  const r = be.post({ action: 'gradeSubmission', teacherKey: key, submissionId: sub.submissionId, manualScores: { w1: 1 }, finalize: true, studentId: 12 });
  assert.equal(r.submission.studentId, 12);
});

// ------------------------------------------------------------------ persistence / storage hazards
await test('PERSISTENCE: a brand-new backend instance on the same spreadsheet sees everything (restart-safe)', async () => {
  const { be, key } = fresh();
  const qs = await makeQuestions(6);
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: qs } });
  const sub = be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'رنا', answers: perfectAnswers(qs) });
  const be2 = createBackend({ spreadsheet: be.ss, props: be.props });   // "new execution", same storage
  assert.equal(be2.get({ action: 'getHomework', id: c.id }).ok, true);
  const list = be2.post({ action: 'listSubmissions', teacherKey: key, hwId: c.id });
  assert.equal(list.submissions[0].id, sub.submissionId);
});

await test('SHEETS HAZARD: names like "=1+1", "12345", "-5" and numeric-looking JSON chunks survive byte-exact', async () => {
  const { be, key } = fresh();
  const q = { id: 'q1', type: 'mcq', text: 't', points: 1, correctAnswer: 'A', options: ['A', 'B'] };
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [q] } });
  for (const name of ['=1+1', '12345', '-5', '@SUM(A1)', '+99']) {
    const r = be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: name, answers: { q1: 'A' } });
    assert.equal(r.ok, true, name);
  }
  const list = be.post({ action: 'listSubmissions', teacherKey: key }).submissions;
  assert.deepEqual(list.map(s => s.studentName).sort(), ['+99', '-5', '12345', '=1+1', '@SUM(A1)'].sort());
});

await test('SHEETS HAZARD: forgetting the text format WOULD corrupt data (proves setNumberFormat is load-bearing)', async () => {
  const be = createBackend();
  be.setup();
  // simulate the mistake: wipe the text-format bookkeeping
  Object.values(be.ss.sheets).forEach(sh => { sh.textCols.clear(); sh.textRows.clear(); });
  const key = be.props.TEACHER_KEY;
  const q = { id: 'q1', type: 'mcq', text: 't', points: 1, correctAnswer: 'A', options: ['A', 'B'] };
  const r = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [q] } });
  // with the format missing, the id column is fine (not numeric) but a numeric-looking student name is coerced
  const c = r.id;
  const s = be.post({ action: 'submit', hwId: c, clientSubmissionId: cid(), studentName: '12345', answers: { q1: 'A' } });
  assert.ok(s.ok, 'submit still succeeds because JSON is authoritative');
  // and the fixed column really was corrupted to a number in the emulated sheet:
  const row = be.ss.getSheetByName('Submissions').data[1];
  assert.equal(typeof row[3], 'number');
});

await test('ROW CAP: >1000 rows do not throw (sheet grows) and text format is re-applied', async () => {
  const { be, key } = fresh();
  const q = { id: 'q1', type: 'mcq', text: 't', points: 1, correctAnswer: 'A', options: ['A', 'B'] };
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [q] } });
  // MAX_SUBMISSIONS_PER_HW = 500, so spread over 3 homeworks to exceed 1000 rows in Submissions
  const hws = [c.id, be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [q] } }).id, be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [q] } }).id];
  let n = 0;
  for (const id of hws) for (let i = 0; i < 400; i++) { const r = be.post({ action: 'submit', hwId: id, clientSubmissionId: cid() + i, studentName: 'طالب ' + (++n) + ' 99', answers: { q1: 'A' } }); if (!r.ok) throw new Error('failed at ' + n + ': ' + r.code + ' ' + r.message); }
  assert.ok(be.ss.getSheetByName('Submissions').maxRows > 1000);
  const last = be.ss.getSheetByName('Submissions').data[n];
  assert.equal(typeof last[3], 'string');
  assert.equal(be.post({ action: 'listSubmissions', teacherKey: key }).submissions.length, 1200);
});

await test('LARGE record spanning several 45k chunks round-trips exactly; oversize is refused (not silently truncated)', async () => {
  const { be, key } = fresh();
  const long = 'ب'.repeat(9000);
  const qs = Array.from({ length: 8 }, (_, i) => ({ id: 'q' + i, type: 'mcq', text: long, points: 1, correctAnswer: 'A', options: ['A', 'B'] }));
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: qs } });
  assert.equal(c.ok, true);
  const pub = be.get({ action: 'getHomework', id: c.id });
  assert.equal(pub.homework.questions[7].text, long);
  const huge = Array.from({ length: 30 }, (_, i) => ({ id: 'z' + i, type: 'mcq', text: 'ب'.repeat(14000), points: 1, correctAnswer: 'A', options: ['A'] }));
  const r = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: huge } });
  assert.equal(r.ok, false); assert.ok(['TOO_LARGE'].includes(r.code));
});

await test('PERSISTENCE PROOF: if the read-back does not match, the API says so instead of confirming', async () => {
  const { be, key } = fresh();
  const q = { id: 'q1', type: 'mcq', text: 't', points: 1, correctAnswer: 'A', options: ['A', 'B'] };
  const c = be.post({ action: 'createHomework', teacherKey: key, homework: { questions: [q] } });
  // sabotage: make setValues silently drop writes for Submissions (simulates a write that "succeeded" but did not stick)
  const sh = be.ss.getSheetByName('Submissions');
  const origGetRange = sh.getRange.bind(sh);
  sh.getRange = (...a) => { const r = origGetRange(...a); const sv = r.setValues.bind(r); r.setValues = (v) => { if (a[0] > 1) return r; return sv(v); }; return r; };
  const r = be.post({ action: 'submit', hwId: c.id, clientSubmissionId: cid(), studentName: 'اسم اسم', answers: { q1: 'A' } });
  assert.equal(r.ok, false); assert.equal(r.code, 'PERSIST_VERIFY_FAILED');
});

await test('lock timeout surfaces as BUSY (client can retry) rather than a false success', async () => {
  const { be } = fresh();
  be.hooks.lockBusy = true;
  const r = be.post({ action: 'submit', hwId: 'HW_' + '0'.repeat(32), clientSubmissionId: cid(), studentName: 'اس م', answers: {} });
  assert.equal(r.code, 'BUSY'); assert.notEqual(r.ok, true);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
