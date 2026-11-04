// tests/teacherReportEngine.test.mjs — محرك «تقرير المعلم الشهري» (دوال خالصة)
import assert from 'node:assert/strict';
import { aggregateMonth, buildTeacherReport, achievementsOf, tierOf, longestStreak, LADDERS, deltaOf, gameSecondsFromEvents, juzOfAyah } from '../engine/teacherReportEngine.js';
import { JUZ_STARTS as REAL_STARTS } from '../engine/reviewParts.js';

let failed = 0;
const test = async (name, fn) => { try { await fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, e.message); } };

const stu = (id, o = {}) => ({
  id, name: 'طالب ' + id,
  att: { present: 4, absent: 0, expected: 4, minutes: 180 },
  games: { total: 10, weakness: 2, seconds: 600 },
  duels: [], homework: { count: 1 }, memo: { newAyahs: 20 },
  review: { total: 100, distinct: 60, surahs: [112, 113], juz: [30] },
  tajweed: { sessions: 1 }, stars: 1, days: ['2026-10-01', '2026-10-02'], ...o
});

await test('المجاميع: حلقات وساعات وألعاب ووقت', () => {
  const a = aggregateMonth([stu(1), stu(2, { att: { present: 6, absent: 1, expected: 7, minutes: 360 } })]);
  assert.equal(a.sessions.count, 10);
  assert.equal(a.sessions.hours, 9);
  assert.equal(a.games.total, 20);
  assert.equal(a.games.minutes, 20);
  assert.equal(a.studentsActive, 2);
});

await test('المواجهة المشتركة بين طالبين تُعدّ مرة واحدة للمعلم', () => {
  const a = aggregateMonth([stu(1, { duels: [{ id: 7, won: true }] }), stu(2, { duels: [{ id: 7, won: false }, { id: 8, won: null }] })]);
  assert.equal(a.duels.matches, 2);
  assert.equal(a.duels.wins, 1);
});

await test('الحفظ: عدد الطلاب والآيات والنسبة؛ من لم يسجَّل حفظه لا يُعدّ', () => {
  const a = aggregateMonth([stu(1), stu(2, { memo: null }), stu(3, { memo: { newAyahs: 30 } })]);
  assert.equal(a.memo.students, 2);
  assert.equal(a.memo.ayahs, 50);
  assert.equal(a.memo.pctQuran, 0.8);
});

await test('المراجعة: السور المختلفة تُدمج بين الطلاب بلا تكرار', () => {
  const a = aggregateMonth([stu(1), stu(2, { review: { total: 40, distinct: 10, surahs: [113, 114], juz: [30, 29] } })]);
  assert.deepEqual(a.review.surahNumbers, [112, 113, 114]);
  assert.equal(a.review.juz, 2);
  assert.equal(a.review.ayahs, 140);
});

await test('أطول سلسلة أيام متتالية', () => {
  assert.equal(longestStreak(['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-07', '2026-10-08']), 3);
  assert.equal(longestStreak([]), 0);
  assert.equal(longestStreak(['2026-10-31', '2026-11-01']), 2);
});

await test('الدرجات والمستوى والهدف التالي', () => {
  assert.equal(tierOf(7, LADDERS.sessions), 0);
  assert.equal(tierOf(8, LADDERS.sessions), 1);
  assert.equal(tierOf(40, LADDERS.sessions), 3);
  const empty = achievementsOf(aggregateMonth([]));
  assert.equal(empty.level.key, 'starter');
  assert.equal(empty.earned.length, 0);
  const rich = achievementsOf(aggregateMonth(Array.from({ length: 16 }, (_, i) => stu(i, { att: { present: 3, absent: 0, expected: 3, minutes: 180 }, memo: { newAyahs: 40 }, duels: [{ id: i, won: true }] }))));
  assert.ok(rich.level.index >= 3, 'مستوى متقدّم لنشاط غزير: ' + rich.level.key);
  assert.ok(rich.nextGoal && rich.nextGoal.remaining > 0);
});

await test('الفرق عن الشهر السابق: null إن لم يكن فيه نشاط (لا مقارنة مضلِّلة بصفر)', () => {
  const cur = aggregateMonth([stu(1)]);
  assert.equal(deltaOf(cur, aggregateMonth([])), null);
  const prev = aggregateMonth([stu(1, { games: { total: 4, weakness: 0, seconds: 100 } })]);
  assert.equal(deltaOf(cur, prev).games, 6);
});

await test('تقرير فارغ: empty=true ولا ينهار', () => {
  const r = buildTeacherReport({ curFacts: [], prevFacts: [], year: 2026, monthIndex0: 9 });
  assert.equal(r.empty, true);
  assert.equal(r.sessions.count, 0);
});

await test('أبرز الطلاب: لا يُسمّى طالب بقيمة صفر', () => {
  const a = aggregateMonth([stu(1, { memo: null }), stu(2, { memo: { newAyahs: 55 } })]);
  assert.equal(a.spotlight.memorizer.id, 2);
  const b = aggregateMonth([stu(1, { memo: null })]);
  assert.equal(b.spotlight.memorizer, null);
});

await test('وقت الألعاب: المسجَّل + تقدير الأسئلة بلا زمن بمتوسط المسجَّل، وخارج الشهر مستبعد', () => {
  const ts = new Date(2026, 9, 5).getTime(), old = new Date(2026, 8, 5).getTime();
  const ev = [
    { source: 'game', ts, timeSec: 10 }, { source: 'game', ts, timeSec: 30 }, { source: 'game', ts, timeSec: null },
    { source: 'game', ts: old, timeSec: 999 }, { source: 'homework', ts, timeSec: 999 }
  ];
  assert.equal(gameSecondsFromEvents(ev, 2026, 9), 60);
  assert.equal(gameSecondsFromEvents([], 2026, 9), 0);
});

await test('رقم الجزء لآية', () => {
  assert.equal(juzOfAyah(1, 1), 1);
  assert.equal(juzOfAyah(2, 142), 2);
  assert.equal(juzOfAyah(112, 1), 30);
  assert.equal(juzOfAyah(67, 1), 29);
  assert.equal(juzOfAyah(null, 1), null);
});

await test('جدول بدايات الأجزاء مطابق للأصل في reviewParts', () => {
  REAL_STARTS.forEach(([s, a], i) => assert.equal(juzOfAyah(s, a), i + 1));
});

if (failed) { console.log(`\n✗ ${failed} اختبار فشل`); process.exit(1); }
console.log('\n✓ كل اختبارات محرك تقرير المعلم نجحت');
