// tests/seenLedger.test.js — دفتر «ما رآه الطالب» + إزاحة الشرائح في pickTargetAyah
//   node tests/seenLedger.test.js
import assert from 'node:assert/strict';
const store = new Map();
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const { setSeenStudent, recordSeen, seenRank, pickLeastSeen, MAX_ENTRIES } = await import('../engine/seenLedger.js');
const { pickTargetAyah, setActiveChunkOffset, newChunkOffset } = await import('../engine/quranEngine.js');

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('PASS ', n); } catch (e) { fail++; console.log('FAIL ', n, '\n   ', e.message); } };
const mkPool = (surah, n, from = 1) => Array.from({ length: n }, (_, i) => ({ surahNumber: surah, numberInSurah: from + i, text: 'x' }));

t('بلا طالب: لا أثر ولا أخطاء', () => { setSeenStudent(null); recordSeen(mkPool(1, 1)[0]); assert.equal(seenRank(mkPool(1, 1)[0]), 0); assert.equal(store.size, 0); });
t('دفتر لكل طالب مستقل', () => {
    const a = mkPool(2, 1)[0];
    setSeenStudent('s1'); recordSeen(a); assert.ok(seenRank(a) > 0);
    setSeenStudent('s2'); assert.equal(seenRank(a), 0);
    setSeenStudent('s1'); assert.ok(seenRank(a) > 0); // يُستعاد من التخزين
});
t('المفتاح بالآية لا بالنطاق: يتذكر عبر نطاقات مختلفة', () => {
    setSeenStudent('s3'); recordSeen({ surahNumber: 5, numberInSurah: 7 });
    assert.ok(seenRank({ surahNumber: 5, numberInSurah: 7, number: 999 }) > 0);
});
t('pickLeastSeen يفضّل غير المرئي ثم الأقدم', () => {
    setSeenStudent('s4'); const p = mkPool(3, 3);
    recordSeen(p[0]); recordSeen(p[1]);
    for (let i = 0; i < 20; i++) assert.equal(pickLeastSeen(p), p[2]);
    recordSeen(p[2]);
    for (let i = 0; i < 20; i++) assert.equal(pickLeastSeen(p), p[0]);
});
t('التقليم: لا يتجاوز الحد ويُبقي الأحدث', () => {
    setSeenStudent('s5');
    for (let i = 1; i <= MAX_ENTRIES + 5; i++) recordSeen({ surahNumber: 9, numberInSurah: i });
    const d = JSON.parse(store.get('qseen_s5'));
    assert.ok(Object.keys(d.m).length <= MAX_ENTRIES);
    assert.ok(seenRank({ surahNumber: 9, numberInSurah: MAX_ENTRIES + 5 }) > 0);
    assert.equal(seenRank({ surahNumber: 9, numberInSurah: 1 }), 0);
});
t('تخزين تالف: يعمل دفتراً فارغاً', () => { store.set('qseen_bad', '{oops'); setSeenStudent('bad'); assert.equal(seenRank(mkPool(1, 1)[0]), 0); });

// محاكاة اختبارات متتالية: نسبة تكرار الآية بين اختبارين متتاليين (بدون ثم مع الدفتر والإزاحة)
function run(useLedger, tests, pool, q) {
    setSeenStudent(useLedger ? 'sim' + Math.random() : null); setActiveChunkOffset(null);
    let prev = null, rep = 0, total = 0;
    for (let k = 0; k < tests; k++) {
        if (useLedger) setActiveChunkOffset(newChunkOffset(pool.length));
        const cur = [];
        for (let i = 0; i < q; i++) { const a = pickTargetAyah(pool, i, q); cur.push(a.surahNumber + ":" + a.numberInSurah); recordSeen(a); }
        assert.equal(new Set(cur).size, q, 'لا تكرار داخل الاختبار الواحد');
        if (prev) { rep += cur.filter(x => prev.includes(x)).length; total += q; }
        prev = cur;
    }
    setActiveChunkOffset(null);
    return rep / total;
}
t('محاكاة: سورة 50 آية، 15 سؤالاً — التكرار ينخفض كثيراً', () => {
    const pool = mkPool(7, 50); const base = run(false, 200, pool, 15), withL = run(true, 200, pool, 15);
    console.log(`      قبل=${(base * 100).toFixed(1)}%  بعد=${(withL * 100).toFixed(1)}%`);
    assert.ok(withL < base / 3);
});
t('محاكاة: جزء 208 آيات، 20 سؤالاً', () => {
    const pool = [...mkPool(2, 150), ...mkPool(3, 58)]; const base = run(false, 200, pool, 20), withL = run(true, 200, pool, 20);
    console.log(`      قبل=${(base * 100).toFixed(1)}%  بعد=${(withL * 100).toFixed(1)}%`);
    assert.ok(withL < base / 3 || withL < 0.01);
});
t('محاكاة: نطاق = عدد الأسئلة (لا مفر من التكرار) لا ينكسر', () => { run(true, 5, mkPool(8, 10), 10); });
console.log(`\n${pass} نجح، ${fail} فشل`); process.exit(fail ? 1 : 0);
