// tests/hwSchedule.test.js
// ==========================================
// 🌟 [جديد — تذكير الواجب الأسبوعي] اختبارات engine/hwSchedule.js: توزيع أيام الطلاب (متوازن، متباعد، طاقة حسب العدد)،
// وحساب «حان موعد الواجب» (يوم الموعد، التأخر يوماً بيوم، الإسقاط بواجب واحد، التأجيل، بدء الجدول).
//   node tests/hwSchedule.test.js
// ==========================================
import assert from 'node:assert/strict';
import {
  DEFAULT_WORKDAYS, capacityFor, gapsOf, chooseDays, assignSchedules, rebalanceAll, weekSummary, nextWorkdayKey, dueInfo, dayKey, startOfDay
} from '../engine/hwSchedule.js';

let pass = 0, fail = 0; const failures = [];
async function test(name, fn) { try { await fn(); pass++; console.log(`✅ ${name}`); } catch (e) { fail++; failures.push(name); console.log(`❌ ${name}\n   ${e.message}`); } }

// تواريخ ثابتة (ظهراً بالتوقيت المحلي): 2026-10-10 سبت، 11 أحد، 12 اثنين، 13 ثلاثاء، 14 أربعاء، 15 خميس، 16 جمعة
const at = (d, h = 12) => new Date(2026, 9, d, h, 0, 0).getTime();
const SAT = 10, SUN = 11, MON = 12, TUE = 13, WED = 14, THU = 15, FRI = 16;

await test('أيام العمل الافتراضية السبت..الخميس والتواريخ المرجعية صحيحة', () => {
  assert.deepEqual(DEFAULT_WORKDAYS, [6, 0, 1, 2, 3, 4]);
  assert.equal(new Date(at(SAT)).getDay(), 6); assert.equal(new Date(at(THU)).getDay(), 4); assert.equal(new Date(at(FRI)).getDay(), 5);
});
await test('capacityFor: الطاقة = إجمالي الخانات ÷ أيام العمل (للأعلى)', () => {
  assert.equal(capacityFor(20, 6), 4); assert.equal(capacityFor(12, 6), 2); assert.equal(capacityFor(1, 6), 1); assert.equal(capacityFor(0, 6), 1); assert.equal(capacityFor(5, 0), 0);
});
await test('gapsOf: الفواصل الدائرية (السبت+الثلاثاء = 3 و4)', () => {
  assert.deepEqual(gapsOf([6, 2]).sort(), [3, 4]); assert.deepEqual(gapsOf([3]), [7]);
});
await test('chooseDays: طالب أول: يومان متباعدان بفاصل ≥ يومين', () => {
  const d = chooseDays({ perWeek: 2, workDays: DEFAULT_WORKDAYS, load: {} });
  assert.equal(d.length, 2); assert.ok(Math.min(...gapsOf(d)) >= 2); assert.ok(d.every(x => DEFAULT_WORKDAYS.includes(x)));
});
await test('chooseDays: يتجنب الأيام المزدحمة', () => {
  const load = { 6: 3, 2: 3, 0: 0, 3: 0, 1: 1, 4: 1 };
  const d = chooseDays({ perWeek: 2, workDays: DEFAULT_WORKDAYS, load });
  assert.ok(!d.includes(6) && !d.includes(2), JSON.stringify(d));
});
await test('chooseDays: 1 أو 3 مرات أسبوعياً، وأكثر من أيام العمل يُقصّ', () => {
  assert.equal(chooseDays({ perWeek: 1 }).length, 1);
  const three = chooseDays({ perWeek: 3 });
  assert.equal(three.length, 3); assert.ok(Math.min(...gapsOf(three)) >= 2);
  assert.equal(chooseDays({ perWeek: 9, workDays: [6, 0] }).length, 2);
  assert.deepEqual(chooseDays({ perWeek: 0 }), []);
});

for (const N of [1, 2, 3, 7, 10, 25, 40]) {
  await test(`assignSchedules: ${N} طالباً — الجميع مغطّون بيومين متباعدين والحمل ≤ الطاقة المتوازنة`, () => {
    const items = Array.from({ length: N }, (_, i) => ({ id: i + 1, days: null }));
    const out = assignSchedules(items);
    assert.equal(out.size, N);
    out.forEach(days => { assert.equal(new Set(days).size, 2); assert.ok(Math.min(...gapsOf(days)) >= 2, JSON.stringify(days)); });
    const w = weekSummary(items.map(it => ({ id: it.id, days: out.get(it.id) })));
    assert.equal(w.totalSlots, N * 2);
    assert.equal(w.capacity, Math.ceil(N * 2 / 6));
    assert.ok(w.perDay.every(x => x.count <= w.capacity), JSON.stringify(w.perDay.map(x => x.count)));
    assert.ok(Math.max(...w.perDay.map(x => x.count)) - Math.min(...w.perDay.map(x => x.count)) <= 1, JSON.stringify(w.perDay.map(x => x.count)));
  });
}
await test('assignSchedules: عشرة طلاب → 3–4 في اليوم (لا عشرة في يوم واحد) وكل أيام العمل مستعملة', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ id: i, days: null }));
  const out = assignSchedules(items);
  const w = weekSummary(items.map(it => ({ id: it.id, days: out.get(it.id) })));
  assert.deepEqual(w.perDay.map(x => x.count).sort(), [3, 3, 3, 3, 4, 4]);
});
await test('assignSchedules: يحترم الموجود ولا يغيّره، ويضع الجدد في الأقل ازدحاماً، والموقوف لا يُلمس', () => {
  const items = [{ id: 'a', days: [6, 2] }, { id: 'b', days: [6, 2] }, { id: 'p', days: [] }, { id: 'n', days: null }];
  const out = assignSchedules(items);
  assert.equal(out.size, 1); assert.ok(out.has('n'));
  assert.ok(!out.get('n').includes(6) && !out.get('n').includes(2));
});
await test('assignSchedules: حتمي (نفس المدخلات = نفس المخرجات)', () => {
  const items = Array.from({ length: 9 }, (_, i) => ({ id: i, days: null }));
  assert.deepEqual([...assignSchedules(items)], [...assignSchedules(items)]);
});
await test('rebalanceAll: يعيد التوزيع للجميع عدا الموقوفين', () => {
  const items = [{ id: 1, days: [6, 2] }, { id: 2, days: [6, 2] }, { id: 3, days: [6, 2] }, { id: 4, days: [] }];
  const out = rebalanceAll(items);
  assert.equal(out.size, 3); assert.ok(!out.has(4));
  const w = weekSummary([1, 2, 3].map(id => ({ id, days: out.get(id) })));
  assert.ok(w.perDay.every(x => x.count <= 1));
});
await test('weekSummary: يضع علامة over حين يتجاوز اليوم الطاقة', () => {
  const w = weekSummary([{ id: 1, days: [6, 2] }, { id: 2, days: [6, 3] }, { id: 3, days: [6, 4] }, { id: 4, days: [0, 1] }]);
  assert.equal(w.capacity, 2);
  assert.equal(w.perDay.find(x => x.day === 6).over, true);
  assert.equal(w.perDay.find(x => x.day === 0).over, false);
});
await test('nextWorkdayKey: الغد، ويتخطى الجمعة إلى السبت', () => {
  assert.equal(nextWorkdayKey(at(SAT)), dayKey(at(SUN)));
  assert.equal(nextWorkdayKey(at(THU)), dayKey(at(SAT + 7)));
  assert.equal(nextWorkdayKey(at(FRI)), dayKey(at(SAT + 7)));
});

// ============ حان موعد الواجب ============
const SCHED = [6, 2];   // السبت + الثلاثاء
await test('dueInfo: يوم الموعد يظهر (متأخر 0)، ولا شيء في غير يوم الموعد', () => {
  const due = dueInfo({ days: SCHED, today: at(SAT), startTs: at(SAT - 3) });
  assert.deepEqual([due.lateDays, due.missed, due.snoozed], [0, 1, false]);
  assert.equal(dueInfo({ days: SCHED, today: at(SUN), lastHomeworkTs: at(SAT), startTs: at(SAT - 3) }), null);
});
await test('dueInfo: يستمر متأخراً يوماً بيوم حتى يُعدّ الواجب', () => {
  [[SUN, 1], [MON, 2]].forEach(([d, late]) => assert.equal(dueInfo({ days: SCHED, today: at(d), startTs: at(SAT - 3) }).lateDays, late, 'day ' + d));
  const tue = dueInfo({ days: SCHED, today: at(TUE), startTs: at(SAT - 3) });
  assert.deepEqual([tue.lateDays, tue.missed], [3, 2]);   // موعدان فائتان: صف واحد بأقدمهما
});
await test('dueInfo: نشر واجب يُنهي التذكير فوراً ولو كان قبل الموعد بيومين', () => {
  assert.equal(dueInfo({ days: SCHED, today: at(MON), lastHomeworkTs: at(SUN), startTs: at(SAT - 3) }), null);   // أُعدّ الأحد لموعد السبت
  assert.equal(dueInfo({ days: SCHED, today: at(TUE), lastHomeworkTs: at(TUE, 9), startTs: at(SAT - 3) }), null);
  assert.equal(dueInfo({ days: SCHED, today: at(TUE), lastHomeworkTs: at(SUN), startTs: at(SAT - 3) }), null);       // الأحد = قبل موعد الثلاثاء بيومين
  assert.notEqual(dueInfo({ days: SCHED, today: at(TUE), lastHomeworkTs: at(SAT), startTs: at(SAT - 3) }), null);    // السبت لا يغطي الثلاثاء
});
await test('dueInfo: واجب واحد يغطي كل المواعيد الفائتة قبله (لا تكديس)', () => {
  assert.equal(dueInfo({ days: SCHED, today: at(WED), lastHomeworkTs: at(WED), startTs: at(SAT - 3) }), null);
});
await test('dueInfo: بداية الجدول — مواعيد قبل البدء لا تُحسب (لا «متأخر» جماعي عند أول تشغيل)', () => {
  assert.equal(dueInfo({ days: SCHED, today: at(MON), startTs: at(MON) }), null);                       // السبت فات قبل البدء
  assert.equal(dueInfo({ days: [1], today: at(MON), startTs: at(MON) }).lateDays, 0);                   // اليوم موعده وبدأ اليوم
});
await test('dueInfo: التأجيل يخفي الصف حتى بلوغ مفتاح اليوم ثم يعود متأخراً', () => {
  const k = dayKey(at(MON));
  assert.equal(dueInfo({ days: SCHED, today: at(SUN), startTs: at(SAT - 3), snoozeUntil: k }).snoozed, true);
  const back = dueInfo({ days: SCHED, today: at(MON), startTs: at(SAT - 3), snoozeUntil: k });
  assert.deepEqual([back.snoozed, back.lateDays], [false, 2]);
});
await test('dueInfo: سقف النظر للخلف أسبوعان، والموقوف/بلا أيام = null', () => {
  const long = dueInfo({ days: [6], today: at(SAT + 28), startTs: 0 });
  assert.ok(long.lateDays <= 14 && long.capped === true, JSON.stringify(long));
  assert.equal(dueInfo({ days: [], today: at(SAT) }), null);
  assert.equal(dueInfo({ days: null, today: at(SAT) }), null);
});
await test('dueInfo: جدول يومه الجمعة (غير عمل) يعمل أيضاً (القرار للمعلم)', () => {
  assert.equal(dueInfo({ days: [5], today: at(FRI), startTs: at(THU) }).lateDays, 0);
});
await test('startOfDay/dayKey: منتصف الليل المحلي ومفتاح yyyy-mm-dd', () => {
  assert.equal(new Date(startOfDay(at(SAT, 18))).getHours(), 0);
  assert.equal(dayKey(at(SAT)), '2026-10-10');
});

console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل، من إجمالي ${pass + fail} اختبار.`);
if (fail) { console.log('الفاشلة:', failures.join(' | ')); process.exit(1); }
