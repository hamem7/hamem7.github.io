// tests/similarityInject.test.mjs — node tests/similarityInject.test.mjs
import assert from 'node:assert/strict';
import { MUTASHABIHAT_SEED as ALL } from '../database/data/mutashabihatSeed.js';
import { similarCountFor, eligibleGroups, buildSimilarQuestions, injectIntoQueue, occurrenceFirstAyah, cleanOccurrenceText } from '../engine/similarityInject.js';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

// نطاق: كل آيات سورتي الأحقاف (35 آية) والنازعات (46) — الأعداد الحقيقية
const pool = [];
for (let n = 1; n <= 35; n++) pool.push({ surahNumber: 46, numberInSurah: n });
for (let n = 1; n <= 46; n++) pool.push({ surahNumber: 79, numberInSurah: n });
const counts = { 46: 35, 79: 46 };
const ayahCountOf = (s) => counts[s] || 30;

test('similarCountFor: سؤال لكل 10 وبلا حقن للجلسات الصغيرة', () => {
    assert.equal(similarCountFor(4), 0); assert.equal(similarCountFor(10), 1);
    assert.equal(similarCountFor(20), 2); assert.equal(similarCountFor(30), 3);
});
test('occurrenceFirstAyah يقرأ النطاقات', () => {
    assert.equal(occurrenceFirstAyah({ ayahNumber: 3 }), 3);
    assert.equal(occurrenceFirstAyah({ ayahRange: '15-19' }), 15);
    assert.equal(occurrenceFirstAyah({ ayahRange: '8...19' }), 8);
});
test('cleanOccurrenceText يحذف علامة رقم الآية', () => {
    assert.equal(cleanOccurrenceText('هَلْ أَتَاكَ حَدِيثُ مُوسَى ﴿١٥﴾'), 'هَلْ أَتَاكَ حَدِيثُ مُوسَى');
});
test('لا مجموعات في نطاق خارج الأجزاء 26-30 ← لا أسئلة (تراجع رشيق)', () => {
    const far = [{ surahNumber: 2, numberInSurah: 1 }];
    assert.equal(eligibleGroups(ALL, far).length, 0);
    assert.deepEqual(buildSimilarQuestions({ allGroups: ALL, pool: far, count: 3, kids: true, ayahCountOf }), []);
});
test('الصغار: «الموضع» فقط، 3 خيارات على الأقل، الصحيح بينها، موضعه داخل النطاق', () => {
    for (let r = 0; r < 60; r++) {
        const qs = buildSimilarQuestions({ allGroups: ALL, pool, count: 3, kids: true, ayahCountOf });
        assert.ok(qs.length >= 1);
        const groups = new Set();
        for (const q of qs) {
            assert.equal(q.kind, 'sim_position');
            assert.ok(q.options.length >= 3, `${q.groupId} خيارات=${q.options.length}`);
            assert.ok(q.options.includes(q.correctAnswer));
            assert.equal(new Set(q.options).size, q.options.length);
            assert.ok(pool.some(a => a.surahNumber === q.occurrence.surahNumber && a.numberInSurah === q.occurrence.ayahNumber));
            assert.ok(!groups.has(q.groupId)); groups.add(q.groupId);
        }
    }
});
test('المشتتات الدخيلة لا تكون موضعاً حقيقياً في المجموعة نفسها', () => {
    for (let r = 0; r < 100; r++) {
        for (const q of buildSimilarQuestions({ allGroups: ALL, pool, count: 5, kids: true, ayahCountOf })) {
            const g = ALL.find(x => x.groupId === q.groupId);
            if (g.scope === 'internal') {
                const real = new Set(g.occurrences.map(o => String(o.ayahNumber)));
                // الخيارات الإضافية هي ما ليس موضعاً حقيقياً؛ يجب ألا يتجاوز رقمها عدد آيات السورة
                q.options.forEach(o => assert.ok(+o >= 1 && +o <= ayahCountOf(q.occurrence.surahNumber)));
                assert.ok(real.has(q.correctAnswer));
            }
        }
    }
});
test('الكبار: أنواع الموضع/التمييز/الاستدعاء وخيارات سليمة', () => {
    const kinds = new Set();
    for (let r = 0; r < 200; r++) {
        for (const q of buildSimilarQuestions({ allGroups: ALL, pool, count: 3, kids: false, ayahCountOf })) {
            kinds.add(q.kind);
            assert.ok(q.options.includes(q.correctAnswer)); assert.ok(q.options.length >= 2);
        }
    }
    assert.ok(kinds.has('sim_position') && kinds.has('sim_discrimination') && kinds.has('sim_recall'), [...kinds].join());
});
test('injectIntoQueue يستبدل خانات دون تغيير الطول ويحتفظ بـ chunkIndex', () => {
    const queue = Array.from({ length: 20 }, (_, i) => ({ type: 'catch', chunkIndex: i }));
    const sims = buildSimilarQuestions({ allGroups: ALL, pool, count: 2, kids: true, ayahCountOf });
    injectIntoQueue(queue, sims);
    assert.equal(queue.length, 20);
    assert.equal(queue.filter(q => q.type === 'similar').length, sims.length);
    queue.forEach((q, i) => assert.equal(q.chunkIndex, i));
    JSON.parse(JSON.stringify(queue)); // قابل للتخزين في الاستكمال
});
console.log(`\n${pass} ✅ / ${fail} ❌`); process.exit(fail ? 1 : 0);
