// tests/similarityInject.test.mjs — node tests/similarityInject.test.mjs
import assert from 'node:assert/strict';
import { MUTASHABIHAT_SEED as ALL } from '../database/data/mutashabihatSeed.js';
import { similarCountFor, eligibleGroups, buildSimilarQuestions, injectIntoQueue, occurrenceFirstAyah, cleanOccurrenceText } from '../engine/similarityInject.js';
import { buildHomeworkSimilarityQuestion, buildGameRound } from '../engine/similarityEngine.js';
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
test('مرشّح types: يقتصر على الأنواع المطلوبة فقط (ألعاب الكبار)', () => {
    let n = 0;
    for (let r = 0; r < 40; r++) {
        for (const q of buildSimilarQuestions({ allGroups: ALL, pool, count: 3, kids: false, types: ['sim_pair', 'sim_notin'] })) { n++; assert.ok(['sim_pair', 'sim_notin'].includes(q.kind), q.kind); }
    }
    assert.ok(n > 0);
});
test('الصغار: «في أي سورتين» فقط، 3–4 خيارات، الصحيح بينها، موضعه داخل النطاق، بلا رقم آية', () => {
    let n = 0;
    for (let r = 0; r < 60; r++) {
        const qs = buildSimilarQuestions({ allGroups: ALL, pool, count: 3, kids: true });
        const groups = new Set();
        for (const q of qs) {
            n++;
            assert.ok(['sim_pair', 'sim_notin'].includes(q.kind), q.kind);
            assert.ok(q.options.length >= 3 && q.options.length <= 4, `${q.groupId} خيارات=${q.options.length}`);
            assert.equal(q.options[q.correctIndex], q.correctAnswer);
            assert.equal(new Set(q.options).size, q.options.length);
            assert.ok(!/[0-9\u0660-\u0669]/.test(q.text + q.options.join('')), 'رقم داخل السؤال');
            assert.ok(pool.some(a => a.surahNumber === q.occurrence.surahNumber && a.numberInSurah === q.occurrence.ayahNumber));
            assert.ok(q.pair && q.pair.occurrences.length >= 1 && q.options.every(o => o.split('|').length === (q.kind === 'sim_pair' ? 2 : 1)));
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
            assert.equal(q.options[q.correctIndex], q.correctAnswer); assert.ok(q.options.length >= (q.kind === 'sim_which' ? 2 : 3));
        }
    }
    assert.ok(kinds.size >= 2 && [...kinds].every(k => ['sim_pair', 'sim_notin', 'sim_complete', 'sim_which'].includes(k)), [...kinds].join());
});
test('عدالة المحفوظ: طالب يحفظ من الواقعة إلى الناس ← جواب «سورتين/لم ترد» وسورة الجواب من محفوظه فقط', () => {
    const memorized = new Set(); for (let s = 56; s <= 114; s++) memorized.add(s);
    const wide = []; for (let s = 56; s <= 114; s++) for (let n = 1; n <= 100; n++) wide.push({ surahNumber: s, numberInSurah: n });
    const names = new Map(); let seen = 0;
    for (let r = 0; r < 80; r++) {
        for (const q of buildSimilarQuestions({ allGroups: ALL, pool: wide, count: 6, kids: false, types: ['sim_pair', 'sim_notin'], memorized })) {
            seen++;
            if (q.kind === 'sim_pair') assert.ok(q.pair.surahs.every(s => memorized.has(s)), `${q.groupId} جواب خارج المحفوظ: ${q.pair.surahs}`);
            else {
                const shown = q.pair.surahs.filter(s => memorized.has(s));
                assert.ok(shown.length >= 2, `${q.groupId} سور معروضة خارج المحفوظ`);
            }
        }
    }
    assert.ok(seen > 0);
});
test('عدالة المحفوظ في الواجب وجولات اللعب: كل أنواع الأسئلة من سور المحفوظ فقط', () => {
    const memorized = new Set(); for (let s = 56; s <= 114; s++) memorized.add(s);
    let seen = 0;
    for (const g of ALL.slice(0, 400)) {
        const gens = [];
        for (let r = 0; r < 3; r++) { const q = buildHomeworkSimilarityQuestion(g, { memorized }); if (q) gens.push(q); }
        for (const q of buildGameRound([g], { memorized }).questions) {
            seen++;
            if (q.occurrence) assert.ok(memorized.has(q.occurrence.surahNumber), `${g.groupId} ${q.type} موضع خارج المحفوظ`);
            if (q.pair) assert.ok(q.pair.surahs.filter(s => memorized.has(s)).length >= 2, `${g.groupId}`);
        }
    }
    assert.ok(seen > 0);
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
