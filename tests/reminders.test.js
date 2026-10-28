// tests/reminders.test.js
// ==========================================
// 🌟 [جديد — «تذكيراتي»] اختبارات engine/reminders.js: التنظيف، الموعد الفعلي مع التأجيل، التصنيف، الإكمال والتكرار، التأجيل، الأوقات السريعة.
//   node tests/reminders.test.js
// ==========================================
import assert from 'node:assert/strict';
import {
  sanitize, fireAt, isDue, bucketOf, summarize, nextOccurrence, complete, snooze, snoozeUntilTomorrow,
  tomorrowMorning, quickTimes, sortReminders, pruneDone, dayStart
} from '../engine/reminders.js';

let pass = 0, fail = 0; const failures = [];
async function test(name, fn) { try { await fn(); pass++; console.log(`✅ ${name}`); } catch (e) { fail++; failures.push(name); console.log(`❌ ${name}\n   ${e.message}`); } }

const at = (d, h = 12, m = 0) => new Date(2026, 9, d, h, m, 0).getTime();   // أكتوبر 2026
const base = (over = {}) => sanitize({ title: 'اتصال بولي أمر', at: at(14, 16, 30), ...over }, at(14, 9));

await test('sanitize: يرفض العنوان الفارغ والموعد غير الصالح', () => {
  assert.equal(sanitize({ title: '   ', at: 1 }), null);
  assert.equal(sanitize({ title: 'x', at: 'abc' }), null);
  assert.equal(sanitize(null), null);
});
await test('sanitize: القيم الافتراضية والتقييد (النوع/التكرار/الطول)', () => {
  const r = sanitize({ title: '  مهمة   كبيرة ', at: 5, kind: 'zzz', repeat: 'monthly', urgent: 1 }, 100);
  assert.equal(r.title, 'مهمة كبيرة'); assert.equal(r.kind, 'personal'); assert.equal(r.repeat, 'none');
  assert.equal(r.urgent, true); assert.equal(r.done, false); assert.equal(r.snoozeUntil, null); assert.ok(r.id);
  assert.equal(sanitize({ title: 'ا'.repeat(500), at: 5 }).title.length, 140);
});
await test('fireAt/isDue: التأجيل يؤخّر الموعد الفعلي، والمنجز لا يستحق', () => {
  const r = base({ snoozeUntil: at(14, 16, 40) });
  assert.equal(fireAt(r), at(14, 16, 40));
  assert.equal(isDue(r, at(14, 16, 35)), false);
  assert.equal(isDue(r, at(14, 16, 40)), true);
  assert.equal(isDue({ ...base(), done: true }, at(15)), false);
  assert.equal(fireAt(base({ snoozeUntil: at(14, 10) })), at(14, 16, 30));   // تأجيل أقدم من الموعد يُتجاهل
});
await test('bucketOf/summarize: متأخر قبل اليوم، اليوم حتى لو فات وقته، قادم، منجز', () => {
  const now = at(14, 17);
  assert.equal(bucketOf(base({ at: at(13, 9) }), now), 'overdue');
  assert.equal(bucketOf(base({ at: at(14, 8) }), now), 'today');
  assert.equal(bucketOf(base({ at: at(14, 23, 59) }), now), 'today');
  assert.equal(bucketOf(base({ at: at(15, 0, 0) }), now), 'upcoming');
  assert.equal(bucketOf({ ...base(), done: true }, now), 'done');
  const s = summarize([base({ at: at(13) }), base({ at: at(14, 20) }), base({ at: at(16) }), { ...base(), done: true }], now);
  assert.deepEqual(s, { overdue: 1, today: 1, upcoming: 1, done: 1, actionable: 2 });
});
await test('complete: غير المتكرر يصير منجزاً', () => {
  const c = complete(base(), at(14, 16, 31));
  assert.equal(c.done, true); assert.equal(c.doneAt, at(14, 16, 31)); assert.equal(c.snoozeUntil, null);
});
await test('complete: اليومي يتقدّم لليوم التالي بنفس الساعة ويبقى فعّالاً', () => {
  const c = complete(base({ repeat: 'daily' }), at(14, 16, 31));
  assert.equal(c.done, false); assert.equal(c.at, at(15, 16, 30));
});
await test('complete: اليومي المتأخر أياماً يقفز لأول موعد بعد الآن (لا يتراكم)', () => {
  const c = complete(base({ repeat: 'daily', at: at(1, 9, 0) }), at(14, 10, 0));
  assert.equal(c.at, at(15, 9, 0));
  const d = complete(base({ repeat: 'daily', at: at(1, 9, 0) }), at(14, 8, 0));
  assert.equal(d.at, at(14, 9, 0));
});
await test('complete: الأسبوعي يتقدّم 7 أيام ويحافظ على اليوم', () => {
  const c = complete(base({ repeat: 'weekly', at: at(3, 7, 0) }), at(14, 8, 0));
  assert.equal(new Date(c.at).getDay(), new Date(at(3)).getDay());
  assert.equal(c.at, at(17, 7, 0)); assert.ok(c.at > at(14, 8, 0));
});
await test('complete: المتكرر المُنجَز مبكراً لا يُعاد في نفس الموعد', () => {
  const c = complete(base({ repeat: 'daily', at: at(14, 20, 0) }), at(14, 9, 0));
  assert.equal(c.at, at(15, 20, 0));
});
await test('nextOccurrence: دائماً بعد after بصرامة', () => {
  assert.equal(nextOccurrence(at(14, 9), 'daily', at(14, 9)), at(15, 9));
  assert.ok(nextOccurrence(at(1, 9), 'weekly', at(30, 9)) > at(30, 9));
});
await test('snooze/snoozeUntilTomorrow/tomorrowMorning', () => {
  const now = at(14, 16, 31);
  assert.equal(snooze(base(), 10, now).snoozeUntil, now + 10 * 60000);
  assert.equal(snoozeUntilTomorrow(base(), now).snoozeUntil, at(15, 8, 0));
  assert.equal(tomorrowMorning(at(14, 23, 30)), at(15, 8, 0));
});
await test('quickTimes: بعد ساعة، المساء (6 م أو غداً إن كاد يفوت)، غداً صباحاً', () => {
  const q = quickTimes(at(14, 10, 20));
  assert.equal(q.hour, at(14, 11, 20)); assert.equal(q.evening, at(14, 18, 0)); assert.equal(q.tomorrow, at(15, 8, 0));
  assert.equal(quickTimes(at(14, 17, 50)).evening, at(15, 18, 0));
});
await test('sortReminders: غير المنجز بالموعد ثم المنجز الأحدث أولاً', () => {
  const a = base({ id: 'a', at: at(15) }), b = base({ id: 'b', at: at(14) });
  const c = { ...base({ id: 'c' }), done: true, doneAt: 5 }, d = { ...base({ id: 'd' }), done: true, doneAt: 9 };
  assert.deepEqual(sortReminders([c, a, d, b]).map(x => x.id), ['b', 'a', 'd', 'c']);
});
await test('pruneDone: يحذف المنجز الأقدم من 30 يوماً فقط', () => {
  const now = at(30);
  const old = { ...base({ id: 'o' }), done: true, doneAt: now - 31 * 86400000 };
  const recent = { ...base({ id: 'n' }), done: true, doneAt: now - 5 * 86400000 };
  assert.deepEqual(pruneDone([old, recent, base({ id: 'p' })], now).map(x => x.id), ['n', 'p']);
});
await test('dayStart: منتصف الليل المحلي', () => { assert.equal(dayStart(at(14, 23, 59)), at(14, 0, 0)); });

console.log(`\n${pass} نجح · ${fail} فشل`);
if (fail) { console.log('الفاشلة:', failures.join(' | ')); process.exit(1); }
