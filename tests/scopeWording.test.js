// tests/scopeWording.test.js — صياغة نطاق رسالة ولي الأمر: node tests/scopeWording.test.js
import assert from 'node:assert/strict';
import { describeScope } from '../engine/scopeWording.js';

const NAMES = { 114: 'الناس', 113: 'الفلق', 86: 'الطارق', 85: 'البروج', 78: 'النبأ', 67: 'الملك', 50: 'ق' };
const surahName = (n) => NAMES[n] || String(n);
const ar = (a) => a, en = (a, e) => e;
const grp = (hizb, first, last, unit = 'hizb', pct = 100, quarter = null) =>
    ({ id: `${unit}:${hizb}${quarter ? '.' + quarter : ''}`, unit, hizb, juz: Math.ceil(hizb / 2), quarter, first: { surah: first, ayah: 1 }, last: { surah: last, ayah: 5 }, pctMemorized: pct });
const model = {
    surahs: [114, 113, 86, 85, 78, 67, 50].map(n => ({ number: n })),
    groups: [grp(60, 114, 85), grp(59, 78, 78), grp(58, 67, 67), grp(57, 67, 50, 'hizb', 40)]
};
const run = (mode, ids, L = ar) => describeScope({ model, selection: { mode, ids }, L, surahName });

assert.equal(run('all', []), 'من سورة الناس إلى سورة ق');
assert.equal(run('surah', [78]), 'سورة النبأ');
assert.equal(run('surah', [114, 113, 86]), 'من سورة الناس إلى سورة الطارق');
assert.equal(run('surah', [114, 86]), 'سورة الناس، سورة الطارق');
assert.equal(run('hizb', ['hizb:60']), 'من سورة الناس إلى سورة البروج');
assert.equal(run('hizb', ['hizb:60', 'hizb:59']), 'جزء عمّ كاملاً');
assert.equal(run('hizb', ['hizb:58', 'hizb:57']), 'من سورة الملك إلى سورة ق');   // الحزب 57 غير مكتمل → بالسور
assert.equal(run('hizb', ['hizb:59']), 'سورة النبأ');
assert.equal(run('hizb', ['hizb:60', 'hizb:59'], en), 'Juz Amma in full');
assert.equal(run('surah', [114, 113, 86], en), 'From Surah الناس to Surah الطارق');
assert.equal(describeScope({ model: null, selection: { mode: 'all' }, L: ar, surahName }), null);
console.log('✅ scopeWording');
