// tests/memoScope.test.js — السور الإضافية خارج المسار المتصل: node tests/memoScope.test.js
import assert from 'node:assert/strict';
import { normalizeExtras, studentExtras, extraSurahSlices, extraAyahCount, memoStats, scopeSlices, rangeSlices, inSlices, filterPoolBySlices, describeExtra } from '../engine/memoScope.js';

const AY = [7,286,200,176,120,165,206,75,129,109,123,111,43,52,99,128,111,110,98,135,112,78,118,64,77,227,93,88,69,60,34,30,73,54,45,83,182,88,75,85,54,53,89,59,37,35,38,29,18,45,60,49,62,55,78,96,29,22,24,13,14,11,11,18,12,12,30,52,52,44,28,28,20,56,40,31,50,40,46,42,29,19,36,25,22,17,19,26,30,20,15,21,11,8,8,19,5,8,8,11,11,8,3,9,5,4,7,3,6,3,5,4,5,6];
const NAMES = {114: 'الناس', 36: 'يس', 2: 'البقرة', 10: 'يونس', 18: 'الكهف'};
const sd = AY.map((n, i) => ({ number: i + 1, name: NAMES[i + 1] || 'س' + (i + 1), ayahsCount: n }));
assert.equal(AY.reduce((a, b) => a + b, 0), 6236);
const stu = { memoFrom: 'الناس', memoTo: 'يس' };
const E = (s1, a1, s2, a2) => ({ s1, a1, s2, a2 });

// ١) مثال المعلم: الناس←يس + البقرة←منتصف يونس
let ex = normalizeExtras(sd, [E(2, 1, 10, 55)], stu);
assert.deepEqual(ex, [E(2, 1, 10, 55)]);
assert.equal(extraAyahCount(sd, ex), AY.slice(1, 9).reduce((a, b) => a + b, 0) + 55);

// ٢) ما يقع داخل المسار المتصل يُطرح، والفاتحة لا تدخل
assert.deepEqual(normalizeExtras(sd, [E(114, 1, 114, 6)], stu), []);
assert.deepEqual(normalizeExtras(sd, [E(1, 1, 3, 5)], stu), [E(2, 1, 3, 5)]);
assert.deepEqual(normalizeExtras(sd, [E(30, 1, 40, 10)], stu), [E(30, 1, 35, 45)]);       // يُقصّ عند حدّ يس
assert.deepEqual(normalizeExtras(sd, [E(30, 1, 120 > 114 ? 114 : 114, 6)], stu), [E(30, 1, 35, 45)]);

// ٣) دمج المتجاور والمتداخل وترتيب المصحف (الكهف + مريم + طه = مقطع واحد)
ex = normalizeExtras(sd, [E(20, 1, 20, 135), E(18, 1, 18, 110), E(19, 1, 19, 98), E(2, 1, 2, 286)], stu);
assert.deepEqual(ex, [E(2, 1, 2, 286), E(18, 1, 20, 135)]);
assert.deepEqual(normalizeExtras(sd, [E(5, 1, 6, 50), E(6, 40, 7, 10)], stu), [E(5, 1, 7, 10)]);

// ٤) مقطع معكوس الترتيب يُصحَّح، ومدخلات تالفة تُهمل
assert.deepEqual(normalizeExtras(sd, [E(10, 55, 2, 1)], stu), [E(2, 1, 10, 55)]);
assert.deepEqual(normalizeExtras(sd, [null, {}, E(0, 1, 2, 3), E(2, 1, 200, 3), 'x'], stu), []);
assert.deepEqual(normalizeExtras(sd, undefined, stu), []);
assert.deepEqual(normalizeExtras(sd, [E(2, 0, 2, 9999)], stu), [E(2, 1, 2, 286)]);         // الآيات تُقصّ للمدى الصحيح

// ٥) بلا مسار متصل صالح: لا يُطرح شيء سوى الفاتحة
assert.deepEqual(normalizeExtras(sd, [E(114, 1, 114, 6)], {}), [E(114, 1, 114, 6)]);
assert.deepEqual(normalizeExtras(sd, [E(114, 1, 114, 6)], { memoFrom: 'يس', memoTo: 'الناس' }), [E(114, 1, 114, 6)]);   // اتجاه معكوس = غير صالح

// ٦) التفصيل حسب السورة والإحصاءات
const slices = extraSurahSlices(sd, [E(2, 1, 10, 55)]);
assert.equal(slices.length, 9);
assert.equal(slices[0].full, true);
assert.deepEqual(slices[8], { surah: 10, from: 1, to: 55, count: 55, full: false });
const st = memoStats(sd, { ...stu, memoExtra: [E(2, 1, 10, 55)] });
assert.equal(st.main, AY.slice(35, 114).reduce((a, b) => a + b, 0));
assert.equal(st.mainSurahs, 79);
assert.equal(st.extraSurahs, 9);
assert.equal(st.total, st.main + st.extra);
assert.equal(memoStats(sd, {}).total, 0);

// ٧) شرائح النطاق كله والتصفية
const sc = scopeSlices(sd, { ...stu, memoExtra: [E(2, 1, 10, 55)] });
assert.ok(inSlices(sc, 114, 3) && inSlices(sc, 36, 83) && inSlices(sc, 10, 55) && inSlices(sc, 2, 100));
assert.ok(!inSlices(sc, 10, 56) && !inSlices(sc, 11, 1) && !inSlices(sc, 35, 1) && !inSlices(sc, 1, 1));
const pool = [{ surahNumber: 10, numberInSurah: 55 }, { surahNumber: 10, numberInSurah: 56 }, { surahNumber: 20, numberInSurah: 1 }, { surahNumber: 36, numberInSurah: 5 }];
assert.deepEqual(filterPoolBySlices(pool, sc).map(a => a.surahNumber + ':' + a.numberInSurah), ['10:55', '36:5']);

// ٨) المسار المتصل يتسع (memoTo يصغر) فيختفي الإضافي المتداخل تلقائيًا
assert.deepEqual(studentExtras(sd, { memoFrom: 'الناس', memoTo: 'يونس', memoExtra: [E(2, 1, 10, 55)] }), [E(2, 1, 9, 129)]);

// ٩) الوصف
const nm = (n) => NAMES[n] || 'س' + n;
assert.equal(describeExtra(E(18, 1, 18, 110), sd, nm), 'الكهف');
assert.equal(describeExtra(E(10, 1, 10, 55), sd, nm), 'يونس (1–55)');
assert.equal(describeExtra(E(2, 1, 10, 55), sd, nm), 'البقرة ← يونس آية 55');
// ١٠) إضافة/حذف سورة من قائمة وحالة السورة
import { addToExtras, removeFromExtras, surahState } from '../engine/memoScope.js';
let cur = addToExtras(sd, [], E(18, 1, 18, 110), stu);
cur = addToExtras(sd, cur, E(19, 1, 19, 98), stu);
assert.deepEqual(cur, [E(18, 1, 19, 98)]);
cur = removeFromExtras(sd, cur, E(18, 1, 18, 110), stu);
assert.deepEqual(cur, [E(19, 1, 19, 98)]);
assert.deepEqual(removeFromExtras(sd, [E(2, 1, 10, 55)], E(5, 1, 5, 120), stu), [E(2, 1, 4, 176), E(6, 1, 10, 55)]);
assert.deepEqual(removeFromExtras(sd, [E(2, 1, 2, 286)], E(2, 100, 2, 100), stu), [E(2, 1, 2, 99), E(2, 101, 2, 286)]);
const ss = { ...stu, memoExtra: [E(2, 1, 10, 55)] };
assert.equal(surahState(sd, ss, studentExtras(sd, ss), 114), 'main');
assert.equal(surahState(sd, ss, studentExtras(sd, ss), 1), 'main');
assert.equal(surahState(sd, ss, studentExtras(sd, ss), 5), 'extra');
assert.equal(surahState(sd, ss, studentExtras(sd, ss), 10), 'part');
assert.equal(surahState(sd, ss, studentExtras(sd, ss), 18), '');
console.log('memoScope.test.js ✓');

// ٧) نقطة التوقف: الطالب من الناس حتى الملك (٦٧) آية ١٥ — rangeSlices لا تتجاوز آية ١٥ في الملك
{
    const sdK = sd;
    const range = { ok: true, fromSurah: 114, toSurah: 67, frontierAyah: 15 };
    const sl = rangeSlices(sdK, range, [], 2);
    assert.deepEqual(sl.find(x => x.surah === 67), { surah: 67, from: 1, to: 15 });
    assert.deepEqual(sl.find(x => x.surah === 68), { surah: 68, from: 1, to: 52 });   // ما قبلها كاملاً
    assert.ok(!sl.find(x => x.surah === 66));                                         // لا شيء بعد سورة التوقف
    const pool = [];
    for (let s = 66; s <= 68; s++) for (let a = 1; a <= AY[s - 1]; a++) pool.push({ surahNumber: s, numberInSurah: a });
    const f = filterPoolBySlices(pool, sl);
    assert.equal(f.filter(a => a.surahNumber === 67).length, 15);
    assert.ok(!f.some(a => a.surahNumber === 66));
    // الصغار: أدنى سورة ٤٦ — إن وقف قبلها (٢٠) تُقصّ لتبدأ من ٤٦ كاملةً دون مفاجأة
    const kidsSl = rangeSlices(sdK, { ok: true, fromSurah: 114, toSurah: 30, frontierAyah: 10 }, [], 46);
    assert.equal(kidsSl[0].surah, 46);
    assert.equal(kidsSl[0].to, AY[45]);
    const kidsSl2 = rangeSlices(sdK, { ok: true, fromSurah: 114, toSurah: 67, frontierAyah: 15 }, [], 46);
    assert.deepEqual(kidsSl2.find(x => x.surah === 67), { surah: 67, from: 1, to: 15 });
    console.log('rangeSlices ✓');
}

// ٨) المجاور داخل النطاق فقط: آخر آية في البِركة (الملك ١٥) لا يُسأل «ماذا بعدها؟»
{
    const { neighborOk } = await import('../engine/quranEngine.js');
    const pool = []; for (let a = 1; a <= 15; a++) pool.push({ surahNumber: 67, numberInSurah: a });
    const ok = neighborOk(pool);
    assert.equal(ok(pool[14], 1), false);   // ١٥ → ١٦ خارج
    assert.equal(ok(pool[13], 1), true);
    assert.equal(ok(pool[0], -1), false);
    assert.equal(ok({ surahNumber: 66, numberInSurah: 3 }, 1), false);
    console.log('neighborOk ✓');
}
