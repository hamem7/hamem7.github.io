// tests/monthCoverage.test.js — coverageForWindow (تغطية المراجعة في التقرير الشهري)
//   node tests/monthCoverage.test.js
import assert from 'node:assert/strict';
import { coverageForWindow, buildPath } from '../engine/trackingEngine.js';
const surahsData = [{ number: 114, ayahsCount: 6 }, { number: 113, ayahsCount: 5 }, { number: 112, ayahsCount: 4 }];
const path = buildPath(surahsData, { direction: 'backward', fromSurah: 114, toSurah: 112, frontierAyah: 4 });
const D = (m, d = 10) => new Date(2026, m, d).getTime();
const from = D(9, 1), to = D(10, 1);
const ev = (surah, ayah, ts, source = 'game') => ({ surah, ayah, ts, source, segment: surah === 114 ? '114:1-6' : surah === 113 ? '113:1-5' : '112:1-4' });
let pass = 0, fail = 0; const t = (n, f) => { try { f(); pass++; console.log('PASS ', n); } catch (e) { fail++; console.log('FAIL ', n, e.message); } };

t('المجموع = آيات المسار (6+5+4)', () => assert.equal(path.total, 15));
t('بلا أحداث في الشهر: null', () => assert.equal(coverageForWindow([ev(114, 1, D(8))], path, from, to), null));
t('تُحسب الآيات المختلفة فقط (التكرار مرة واحدة)', () => {
    const c = coverageForWindow([ev(114, 1, D(9)), ev(114, 1, D(9, 12)), ev(114, 2, D(9)), ev(113, 3, D(9, 20), 'homework')], path, from, to);
    assert.equal(c.tested, 3); assert.equal(c.total, 15); assert.equal(c.pct, 20);
    assert.equal(c.surahsCovered, 2); assert.equal(c.surahsTotal, 3); assert.deepEqual(c.missing, [112]);
});
t('لا يُحسب: خطأ القائمة/الاستيراد، خارج المسار، بلا رقم آية، خارج الشهر', () => {
    const c = coverageForWindow([ev(114, 1, D(9)), ev(114, 2, D(9), 'weakness'), ev(114, 3, D(9), 'backfill_homework'),
        ev(112, 4, D(9)) /* بعد حد التقدّم (4 آيات: مسموحة) */, { ...ev(113, null, D(9)) }, ev(113, 2, D(10, 5))], path, from, to);
    assert.equal(c.tested, 2); // 114:1 و112:4
});
t('حدّ المسار: آية بعد نقطة التوقف لا تُحتسب', () => {
    const p2 = buildPath(surahsData, { direction: 'backward', fromSurah: 114, toSurah: 112, frontierAyah: 2 });
    const c = coverageForWindow([ev(112, 2, D(9)), ev(112, 4, D(9))], p2, from, to);
    assert.equal(c.tested, 1);
});
console.log(`\n${pass} نجح، ${fail} فشل`); process.exit(fail ? 1 : 0);
