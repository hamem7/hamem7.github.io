// tests/similarityInject.test.mjs — node tests/similarityInject.test.mjs
import assert from 'node:assert/strict';
import { MUTASHABIHAT_SEED as ALL } from '../database/data/mutashabihatSeed.js';
import { similarCountFor, eligibleGroups, buildSimilarQuestions, injectIntoQueue, occurrenceFirstAyah, cleanOccurrenceText } from '../engine/similarityInject.js';
import { setSimilarityQuran } from '../engine/similarityQuestions.js';
import { loadQuranSurahs } from '../tools/mutashabihat-questions/load.mjs';
setSimilarityQuran(loadQuranSurahs());

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

// نطاق: كل آيات سورتي الأحقاف (35 آية) والنازعات (46) — الأعداد الحقيقية
const pool = [];
for (let n = 1; n <= 35; n++) pool.push({ surahNumber: 46, numberInSurah: n });
for (let n = 1; n <= 46; n++) pool.push({ surahNumber: 79, numberInSurah: n });
const counts = { 46: 35, 79: 46 };

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
    assert.deepEqual(buildSimilarQuestions({ allGroups: ALL, pool: far, count: 3, kids: true }), []);
});
test('الصغار: «من أي سورة» و«ماذا بعدها» فقط، 3–4 خيارات، الصحيح بينها، موضعه داخل النطاق، بلا رقم آية', () => {
    let n = 0;
    for (let r = 0; r < 60; r++) {
        const qs = buildSimilarQuestions({ allGroups: ALL, pool, count: 3, kids: true });
        const groups = new Set();
        for (const q of qs) {
            n++;
            assert.ok(['sim_surah'].includes(q.kind), q.kind);
            assert.ok(q.options.length >= 3 && q.options.length <= 4, `${q.groupId} خيارات=${q.options.length}`);
            assert.equal(q.options[q.correctIndex], q.correctAnswer);
            assert.equal(new Set(q.options).size, q.options.length);
            assert.ok(!/[0-9\u0660-\u0669]/.test(q.text + q.options.join('')), 'رقم داخل السؤال');
            assert.ok(pool.some(a => a.surahNumber === q.occurrence.surahNumber && a.numberInSurah === q.occurrence.ayahNumber));
            assert.ok(!groups.has(q.groupId)); groups.add(q.groupId);
        }
    }
    assert.ok(n > 0, 'لم يُولَّد أي سؤال');
});
test('الكبار: أنواع متعددة من الأربعة وخيارات سليمة', () => {
    const kinds = new Set();
    for (let r = 0; r < 200; r++) {
        for (const q of buildSimilarQuestions({ allGroups: ALL, pool, count: 3, kids: false })) {
            kinds.add(q.kind);
            assert.equal(q.options[q.correctIndex], q.correctAnswer); assert.ok(q.options.length >= 3);
        }
    }
    assert.ok(kinds.size >= 2 && [...kinds].every(k => ['sim_surah', 'sim_complete'].includes(k)), [...kinds].join());
});
test('injectIntoQueue يستبدل خانات دون تغيير الطول ويحتفظ بـ chunkIndex', () => {
    const queue = Array.from({ length: 20 }, (_, i) => ({ type: 'catch', chunkIndex: i }));
    const sims = buildSimilarQuestions({ allGroups: ALL, pool, count: 2, kids: true });
    injectIntoQueue(queue, sims);
    assert.equal(queue.length, 20);
    assert.equal(queue.filter(q => q.type === 'similar').length, sims.length);
    queue.forEach((q, i) => assert.equal(q.chunkIndex, i));
    JSON.parse(JSON.stringify(queue)); // قابل للتخزين في الاستكمال
});
console.log(`\n${pass} ✅ / ${fail} ❌`); process.exit(fail ? 1 : 0);
