// tests/ayahCount.test.mjs — «دفتر المراجعة»: كم آية يعرضها كل سؤال (ألعاب + واجب) والعدّ الشهري
//   node tests/ayahCount.test.mjs
import assert from 'node:assert/strict';
const store = new Map();
globalThis.localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const { gameQuestionAyahCount, estimateGameEventAyahs, homeworkQuestionAyahCount, homeworkAyahTotal, reviewCountsForMonth } = await import('../engine/ayahCount.js');

let pass = 0, fail = 0;
const t = (n, f) => { try { f(); pass++; console.log('PASS ', n); } catch (e) { fail++; console.log('FAIL ', n, '\n   ', e.message); } };
const ay = (s, a) => ({ surahNumber: s, numberInSurah: a, surahName: 'x', text: 'x' });

t('ألعاب: آية واحدة للأسئلة العادية', () => {
    for (const type of ['catch', 'guess_surah', 'mistake', 'complete_ayah', 'word_meaning', 'visual_memory', 'similar', 'kids_tf', 'kids_word_order', 'weakness'])
        assert.equal(gameQuestionAyahCount({ type, ayahObj: ay(1, 2) }), 1, type);
});
t('ألعاب: ماذا بعدها/قبلها = 2، بين آيتين/قبلها وبعدها = 3', () => {
    assert.equal(gameQuestionAyahCount({ type: 'next', ayahObj: ay(1, 2) }), 2);
    assert.equal(gameQuestionAyahCount({ type: 'previous', ayahObj: ay(1, 2) }), 2);
    assert.equal(gameQuestionAyahCount({ type: 'listen_next', ayahObj: ay(1, 2) }), 2);
    assert.equal(gameQuestionAyahCount({ type: 'between', ayahObj: ay(1, 2) }), 3);
    assert.equal(gameQuestionAyahCount({ type: 'around', ayahObj: ay(1, 2) }), 3);
    assert.equal(gameQuestionAyahCount({ type: 'kids_mcq', shownAyahs: 2, ayahObj: ay(1, 2) }), 2, 'الأطفال: ماذا بعد/قبل');
});
t('ألعاب: رتب الآيات والربط = كل آيات السؤال، والتسميع = آيات المقطع', () => {
    assert.equal(gameQuestionAyahCount({ type: 'order', original: [ay(1, 1), ay(1, 2), ay(1, 3), ay(1, 4)], ayahObj: ay(1, 1) }), 4);
    assert.equal(gameQuestionAyahCount({ type: 'kids_link_ends', original: [1, 2, 3, 4, 5, 6].map(i => ay(2, i)), ayahObj: ay(2, 1) }), 6);
    assert.equal(gameQuestionAyahCount({ type: 'recite', reciteAyahs: [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => ({ num: n })), ayahObj: ay(3, 1) }), 9);
});
t('ألعاب: الكلمة بالسورة ورتب السور بلا آيات', () => {
    assert.equal(gameQuestionAyahCount({ type: 'link_word_surah', ayahObj: ay(1, 1) }), 0);
    assert.equal(gameQuestionAyahCount({ type: 'kids_order_surahs', original: [ay(1, 1), ay(2, 2)] }), 0);
});
t('أحداث قديمة: تقدير من نوع السؤال', () => {
    assert.equal(estimateGameEventAyahs({ fmt: 'next', ayah: 3 }), 2);
    assert.equal(estimateGameEventAyahs({ fmt: 'order', ayah: 3 }), 4);
    assert.equal(estimateGameEventAyahs({ fmt: 'order', ayah: 3 }, { kidsSession: true }), 3);
    assert.equal(estimateGameEventAyahs({ fmt: 'recite', ayah: 1 }, { surahAyahs: 5 }), 5);
    assert.equal(estimateGameEventAyahs({ fmt: 'recite', ayah: 1 }, { surahAyahs: 40 }), 8);
    assert.equal(estimateGameEventAyahs({ fmt: 'catch', ayah: 1 }), 1);
});
t('واجب: آيات كل صيغة', () => {
    assert.equal(homeworkQuestionAyahCount({ type: 'mcq', title: 'ما هي الآية التي تلي هذه الآية مباشرة؟', text: '﴿ x ﴾' }), 2);
    assert.equal(homeworkQuestionAyahCount({ type: 'mcq', title: 'ما هي الآية التي تَسبِق هذه الآية مباشرة؟', text: '﴿ x ﴾' }), 2);
    assert.equal(homeworkQuestionAyahCount({ type: 'mcq', title: 'في أي سورة تقع هذه الآية؟', text: '﴿ x ﴾' }), 1);
    assert.equal(homeworkQuestionAyahCount({ type: 'around_ayah', text: '﴿ x ﴾' }), 3);
    assert.equal(homeworkQuestionAyahCount({ type: 'write_3_ayahs', correctAnswer: 'a ۞ b ۞ c' }), 3);
    assert.equal(homeworkQuestionAyahCount({ type: 'matrix_order', options: ['a', 'b', 'c', 'd', 'e', 'f'] }), 6);
    assert.equal(homeworkQuestionAyahCount({ type: 'matching', leftItems: [1, 2, 3, 4] }), 4);
    assert.equal(homeworkQuestionAyahCount({ type: 'checkbox', correctAnswer: ['a', 'b'], options: ['a', 'b', 'c', 'd'] }), 2, 'الصحيحة فقط');
    assert.equal(homeworkQuestionAyahCount({ type: 'tajweed_extract', text: '﴿ a ۞ b ﴾' }), 2);
    assert.equal(homeworkQuestionAyahCount({ type: 'dropdown', text: '﴿ x ﴾' }), 1);
    assert.equal(homeworkAyahTotal([{ id: 'q1', type: 'around_ayah' }, { id: 'q2', type: 'matching', leftItems: [1, 2, 3] }]), 6);
});
t('العدّ الشهري: إجمالي = ألعاب + واجب، داخل الشهر فقط', () => {
    const nov = new Date(2026, 10, 5).getTime(), oct = new Date(2026, 9, 30).getTime();
    const r = reviewCountsForMonth({ games: [{ ts: nov, n: 4 }, { ts: nov, n: 2 }, { ts: oct, n: 9 }], homework: [{ ts: nov, n: 20 }] }, 2026, 10);
    assert.deepEqual(r, { games: 6, homework: 20, total: 26 });
    assert.deepEqual(reviewCountsForMonth({ games: null, homework: [] }, 2026, 10), { games: 0, homework: 0, total: 0 });
});
console.log(`\n${pass} pass, ${fail} fail`);
if (fail) process.exit(1);
