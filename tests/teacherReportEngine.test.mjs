// tests/teacherReportEngine.test.mjs — محرك «تقرير المعلم الشهري» (دوال خالصة)
import assert from 'node:assert/strict';
import { buildTeacherReport, gameSecondsByKind, juzOfAyah } from '../engine/teacherReportEngine.js';
import { JUZ_STARTS as REAL_STARTS } from '../engine/reviewParts.js';

let failed = 0;
const test = async (name, fn) => { try { await fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, e.message); } };
const stu = (id, o = {}) => ({
  id, name: 'طالب ' + id, hidden: false, att: { present: 4 },
  adult: { games: 5, seconds: 600 }, kids: { games: 2, seconds: 120 }, duels: [],
  homework: { submitted: 1 }, hwAssigned: 1, memo: { newAyahs: 20 },
  review: { total: 100, surahs: [112, 113], juz: [30] }, similarity: { rounds: 2 }, tajweed: { sessions: 3, challenge: 1 }, ...o
});

await test('المجاميع: حلقات وألعاب كبار وصغار ووقت كل منهما', () => {
  const r = buildTeacherReport({ facts: [stu(1), stu(2, { adult: { games: 3, seconds: 300 }, kids: { games: 0, seconds: 0 } })], year: 2026, monthIndex0: 9 });
  assert.equal(r.circles, 8);
  assert.equal(r.adult.games, 8);
  assert.equal(r.adult.minutes, 15);
  assert.equal(r.kids.games, 2);
  assert.equal(r.kids.minutes, 2);
  assert.equal(r.gamesMinutes, 17);
});

await test('المواجهة المشتركة بين طالبين تُعدّ مرة واحدة', () => {
  const r = buildTeacherReport({ facts: [stu(1, { duels: [{ id: 7 }] }), stu(2, { duels: [{ id: 7 }, { id: 8 }] })] });
  assert.equal(r.duels, 2);
});

await test('الحفظ: من لم يُسجَّل حفظه لا يُعدّ', () => {
  const r = buildTeacherReport({ facts: [stu(1), stu(2, { memo: null }), stu(3, { memo: { newAyahs: 30 } })] });
  assert.equal(r.memo.students, 2);
  assert.equal(r.memo.ayahs, 50);
});

await test('المراجعة: السور والأجزاء تُدمج بلا تكرار', () => {
  const r = buildTeacherReport({ facts: [stu(1), stu(2, { review: { total: 40, surahs: [113, 114], juz: [30, 29] } })] });
  assert.equal(r.review.surahs, 3);
  assert.equal(r.review.juz, 2);
  assert.equal(r.review.ayahs, 140);
});

await test('الواجبات والمتشابهات وتحدي التجويد', () => {
  const r = buildTeacherReport({ facts: [stu(1), stu(2)], teacher: { hwMade: 7 } });
  assert.equal(r.homework.made, 7);
  assert.equal(r.homework.submitted, 2);
  assert.equal(r.similarity, 4);
  assert.equal(r.tajweed.challenge, 2);
  assert.equal(r.tajweed.sessions, 6);
});

await test('كل الطلاب في الجدول ولو بلا نشاط، والأنشط أولاً', () => {
  const idle = { id: 9, name: 'خامل', hidden: true, att: null, adult: { games: 0, seconds: 0 }, kids: { games: 0, seconds: 0 }, duels: [], homework: { submitted: 0 }, hwAssigned: 0, memo: null, review: { total: 0, surahs: [], juz: [] }, similarity: { rounds: 0 }, tajweed: { sessions: 0, challenge: 0 } };
  const r = buildTeacherReport({ facts: [idle, stu(1)] });
  assert.equal(r.students.length, 2);
  assert.equal(r.students[0].id, 1);
  assert.equal(r.students[1].hidden, true);
});

await test('تقرير فارغ؛ والواجب المصنوع وحده ليس فارغاً', () => {
  assert.equal(buildTeacherReport({ facts: [] }).empty, true);
  assert.equal(buildTeacherReport({ facts: [], teacher: { hwMade: 2 } }).empty, false);
});

await test('وقت الألعاب: الكبار والصغار منفصلان، والمقدَّر بمتوسط المسجَّل، وخارج الشهر مستبعد', () => {
  const ts = new Date(2026, 9, 5).getTime(), old = new Date(2026, 8, 5).getTime();
  const ev = [
    { source: 'game', ts, refId: 'a', fmt: 'next', timeSec: 10 }, { source: 'game', ts, refId: 'a', fmt: 'next', timeSec: 30 }, { source: 'game', ts, refId: 'a', fmt: 'next', timeSec: null },
    { source: 'game', ts, refId: 'k', fmt: 'kids_mcq', timeSec: 50 },
    { source: 'game', ts: old, refId: 'o', fmt: 'next', timeSec: 999 }, { source: 'homework', ts, refId: 'h', timeSec: 999 }
  ];
  const r = gameSecondsByKind(ev, 2026, 9);
  assert.equal(r.kids, 50);
  assert.equal(r.adult, 10 + 30 + 30);   // المتوسط (10+30+50)/3 = 30
  assert.deepEqual(gameSecondsByKind([], 2026, 9), { adult: 0, kids: 0 });
});

await test('رقم الجزء لآية، والجدول مطابق للأصل', () => {
  assert.equal(juzOfAyah(112, 1), 30);
  assert.equal(juzOfAyah(null, 1), null);
  REAL_STARTS.forEach(([s, a], i) => assert.equal(juzOfAyah(s, a), i + 1));
});

if (failed) { console.log(`\n✗ ${failed} اختبار فشل`); process.exit(1); }
console.log('\n✓ كل اختبارات محرك تقرير المعلم نجحت');
