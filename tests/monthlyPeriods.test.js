// tests/monthlyPeriods.test.js — نوافذ تحديث الموضع (منتصف/نهاية الشهر) وعمر آخر تحديث للموضع
import assert from 'node:assert/strict';
import { periodicDue, latestRecordedPosition } from '../core/monthlyPeriods.js';
import { monthlyStaleness } from '../engine/trackingEngine.js';

let failed = 0;
const test = async (name, fn) => { try { await fn(); console.log('PASS', name); } catch (e) { failed++; console.log('FAIL', name, e.message); } };
const D = (y, m, d) => new Date(y, m - 1, d, 12);

await test('قبل اليوم 15: لا موعد', () => assert.deepEqual(periodicDue(D(2026, 11, 14)), { mid: false, end: false }));
await test('من 15 حتى قبل نافذة النهاية: منتصف فقط', () => {
  assert.deepEqual(periodicDue(D(2026, 11, 15)), { mid: true, end: false });
  assert.deepEqual(periodicDue(D(2026, 11, 27)), { mid: true, end: false });
});
await test('آخر 3 أيام (نوفمبر 30 يوماً: 28–30): نهاية الشهر', () => {
  assert.equal(periodicDue(D(2026, 11, 28)).end, true);
  assert.equal(periodicDue(D(2026, 11, 30)).end, true);
});
await test('فبراير 28 يوماً: النافذة 26–28', () => {
  assert.equal(periodicDue(D(2026, 2, 25)).end, false);
  assert.equal(periodicDue(D(2026, 2, 26)).end, true);
});
await test('آخر موضع مسجَّل: الأحدث تسجيلاً بين النهاية والمنتصف', () => {
  const rec = { ending: { surahNumber: 60, ayahNumber: 3, recordedAt: '2026-11-01T00:00:00Z' }, mid: { surahNumber: 58, ayahNumber: 9, recordedAt: '2026-11-16T00:00:00Z' } };
  assert.deepEqual(latestRecordedPosition(rec), { surahNumber: 58, ayahNumber: 9 });
  assert.equal(latestRecordedPosition({}), null);
});
await test('عمر التحديث: بداية تلقائية (auto) لا تُحدّث، ونقطة المنتصف تُحدّث', () => {
  const NOW = Date.parse('2026-11-20T00:00:00Z'), DAY = 864e5;
  const iso = (daysAgo) => new Date(NOW - daysAgo * DAY).toISOString();
  const autoOnly = [{ beginning: { surahNumber: 60, ayahNumber: 1, auto: true, recordedAt: iso(1) }, updatedAt: iso(1) }];
  assert.equal(monthlyStaleness(autoOnly, NOW).hasRecords, false);
  const withMid = [...autoOnly, { mid: { surahNumber: 59, ayahNumber: 2, recordedAt: iso(3) }, beginning: { surahNumber: 60, ayahNumber: 1, auto: true, recordedAt: iso(30) }, updatedAt: iso(3) }];
  const r = monthlyStaleness(withMid, NOW);
  assert.equal(r.days, 3); assert.equal(r.stale, false);
});
console.log(failed ? `FAILED ${failed}` : 'ALL OK');
process.exit(failed ? 1 : 0);
