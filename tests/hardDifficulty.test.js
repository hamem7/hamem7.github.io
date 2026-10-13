// tests/hardDifficulty.test.js
// ==========================================
// اختبارات مستوى «صعب» لمولّدات أسئلة الواجب (engine/homeworkEngine.js) على نص القرآن الحقيقي، بلا DOM:
//   node tests/hardDifficulty.test.js
// نتأكد أن الصعب (١) صالح دائماً: مفتاح ضمن الخيارات، خيارات فريدة، (٢) أصعب فعلاً: خيارات أكثر وعرض أقل،
// (٣) أن المتوسط لم يتغيّر (أربعة خيارات كاملة).
// ==========================================
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HomeworkEngine } from '../engine/homeworkEngine.js';
import { cleanAyahText, splitAyahWords } from '../engine/quranEngine.js';

const QURAN = JSON.parse(readFileSync(new URL('../database/quran-uthmani.json', import.meta.url), 'utf8')).data.surahs;

let pass = 0, fail = 0;
async function test(name, fn) {
    try { await fn(); pass++; console.log(`✅ ${name}`); }
    catch (err) { fail++; console.log(`❌ ${name}\n   ${err.message}`); process.exitCode = 1; }
}

// نطاق حفظ واقعي: ثلاث سور متجاورة (الملك، القلم، الحاقة) كي تتوفر آيات من سور أخرى للمشتتات
const RANGE = [67, 68, 69];
const poolOf = () => RANGE.flatMap(sn => {
    const s = QURAN.find(x => x.number === sn);
    return s.ayahs.map(a => ({ ...a, surahNumber: sn, surahName: s.name, number: sn * 1000 + a.numberInSurah }));
});
const POOL = poolOf();
const surahsFake = {
    async getSurah(n) { const s = QURAN.find(x => x.number === n); return s && { ...s, ayahs: POOL.filter(a => a.surahNumber === n) }; },
    async getAllSurahsList() { return QURAN.map(s => ({ number: s.number, name: s.name, ayahsCount: s.ayahs.length })); }
};
const engine = new HomeworkEngine(surahsFake);
const HARD = { difficulty: 'hard' };
const sample = (n, filter = () => true) => POOL.filter(filter).sort(() => 0.5 - Math.random()).slice(0, n);
const words = (a) => splitAyahWords(a.text);

const assertValidMcq = (q, label) => {
    assert.ok(q, `${label}: لم يُولَّد سؤال`);
    assert.ok(q.options.includes(q.correctAnswer), `${label}: المفتاح "${q.correctAnswer}" خارج الخيارات`);
    assert.equal(new Set(q.options).size, q.options.length, `${label}: خيارات مكررة ${JSON.stringify(q.options)}`);
};

await test('visual_page: لا يُولَّد في الصعب أبداً (التخمين 50%)', async () => {
    for (const a of sample(40)) assert.equal(await engine.createQuestionByKey('visual_page', a, POOL, HARD), null);
});

await test('mcq_next/mcq_prev صعب: ٤–٥ خيارات فريدة كلها من السورة نفسها، والآية الطويلة تُعرض جزئياً', async () => {
    let partial = 0, skip = 0, total = 0;
    for (const key of ['mcq_next', 'mcq_prev']) {
        for (const a of sample(60)) {
            const q = await engine.createQuestionByKey(key, a, POOL, HARD);
            if (!q) continue;
            total++;
            assertValidMcq(q, key);
            assert.ok(q.options.length >= 4 && q.options.length <= 5, `${key}: ${q.options.length} خيارات`);
            const sameSurah = new Set(POOL.filter(p => p.surahNumber === a.surahNumber).map(p => cleanAyahText(p.text)));
            assert.ok(q.options.every(o => sameSurah.has(o)), `${key}: خيار من خارج السورة`);
            assert.ok(key === 'mcq_next' ? q.title.includes('تلي هذه') : q.title.includes('تَسبِق هذه'), q.title);
            if (words(a).length >= 7) { assert.ok(q.text.includes('…'), 'الآية الطويلة يجب أن تُعرض جزئياً'); partial++; }
            if (q.title.includes('تخطَّ')) skip++;
        }
    }
    assert.ok(total > 60 && partial > 10 && skip > 10, `total=${total} partial=${partial} skip=${skip}`);
});

await test('mcq_next صعب بسؤال التخطي: الآية التالية مباشرة موجودة فخّاً ضمن الخيارات وليست المفتاح', async () => {
    let seen = 0;
    const base = POOL.filter(p => p.numberInSurah > 2 && p.numberInSurah < 20 && p.surahNumber === 67);
    for (const a of Array.from({ length: 12 }, () => base).flat()) {   // كل آية 12 مرة: التخطي عشوائي بنسبة 50%
        const q = await engine.createQuestionByKey('mcq_next', a, POOL, HARD);
        if (!q || !q.title.includes('تخطَّ')) continue;
        const surah = POOL.filter(p => p.surahNumber === 67);
        const immediate = cleanAyahText(surah[a.numberInSurah].text);
        const second = cleanAyahText(surah[a.numberInSurah + 1].text);
        assert.equal(q.correctAnswer, second);
        if (immediate !== second) assert.ok(q.options.includes(immediate), 'الفخّ غائب');
        seen++;
    }
    assert.ok(seen > 20, 'seen=' + seen);
});

await test('dropdown صعب: خمسة خيارات والكلمة المخفية طويلة وغير وظيفية', async () => {
    let n = 0;
    for (const a of sample(80)) {
        const q = await engine.createQuestionByKey('dropdown', a, POOL, HARD);
        if (!q) continue;
        n++;
        assertValidMcq(q, 'dropdown');
        assert.equal(q.options.length, 5);
        assert.ok(q.correctAnswer.replace(/[ً-ٰٟۖ-ۭـ]/g, '').length >= 4 || words(a).length < 8, 'كلمة قصيرة مخفية: ' + q.correctAnswer);
    }
    assert.ok(n > 40);
});

await test('dual_dropdown صعب: خمسة خيارات لكل فراغ والمفتاحان ضمنها', async () => {
    let n = 0;
    for (const a of sample(120, p => words(p).length >= 7)) {
        const q = await engine.createQuestionByKey('dual_dropdown', a, POOL, HARD);
        if (!q) continue;
        n++;
        assert.equal(q.options1.length, 5); assert.equal(q.options2.length, 5);
        assert.ok(q.options1.includes(q.correctAnswer[0]) && q.options2.includes(q.correctAnswer[1]));
        assert.equal(new Set(q.options1).size, 5); assert.equal(new Set(q.options2).size, 5);
        assert.equal(q.points, 2);
    }
    assert.ok(n > 20);
});

await test('ayah_ending صعب: نصف الآية مخفي (٤+ كلمات) وخمسة خيارات فريدة والمفتاح ضمنها', async () => {
    let n = 0;
    for (const a of sample(150, p => words(p).length >= 7)) {
        const q = await engine.createQuestionByKey('ayah_ending', a, POOL, HARD);
        if (!q) continue;
        n++;
        assertValidMcq(q, 'ayah_ending');
        assert.ok(q.options.length >= 4 && q.options.length <= 5, `خيارات: ${q.options.length}`);
        assert.ok(q.correctAnswer.split(' ').length >= 4, 'الخاتمة المخفية قصيرة: ' + q.correctAnswer);
    }
    assert.ok(n > 20);
});

await test('intruder_word صعب: كلمة مستبدَلة (عدد كلمات الآية لا يزيد) وخيارات ٤–٥ فريدة', async () => {
    // الآيات القصيرة جداً (قليلة الكلمات المتمايزة) تقع على الإضافة المعتادة، لذا نشترط ٧ كلمات فأكثر للاستبدال
    let n = 0;
    for (const a of sample(150, p => words(p).length >= 7)) {
        const q = await engine.createQuestionByKey('intruder_word', a, POOL, HARD);
        if (!q) continue;
        n++;
        assertValidMcq(q, 'intruder_word');
        assert.ok(q.options.length >= 4 && q.options.length <= 5);
        const shown = q.text.replace(/[﴿﴾ ]/g, ' ').trim().split(/\s+/).filter(Boolean);
        assert.equal(shown.length, words(a).length, 'يجب استبدال كلمة لا إضافة كلمة');
        assert.ok(shown.includes(q.correctAnswer), 'الكلمة المستبدَلة غير ظاهرة في الآية المعروضة');
    }
    assert.ok(n > 30);
});

await test('mcq_surah صعب: خمسة خيارات فريدة', async () => {
    for (const a of sample(30)) {
        const q = await engine.createQuestionByKey('mcq_surah', a, POOL, HARD);
        assertValidMcq(q, 'mcq_surah');
        assert.equal(q.options.length, 5);
    }
});

await test('checkbox صعب: ٣ صحيحة بين ٦ خيارات ونقاطها ٣، وكلها فريدة', async () => {
    for (const a of sample(30)) {
        const q = await engine.createQuestionByKey('checkbox', a, POOL, HARD);
        assert.ok(q);
        assert.equal(q.correctAnswer.length, 3); assert.equal(q.options.length, 6); assert.equal(q.points, 3);
        assert.equal(new Set(q.options).size, 6);
        assert.ok(q.correctAnswer.every(c => q.options.includes(c)));
    }
});

await test('matrix_order صعب: ست آيات والمفتاح بنفس عددها، والمتوسط يبقى أربعاً', async () => {
    let hard = 0;
    for (const a of sample(40)) {
        const q = await engine.createQuestionByKey('matrix_order', a, POOL, HARD);
        if (q) { hard++; assert.equal(q.options.length, 6); assert.equal(q.correctAnswer.length, 6); assert.equal(q.points, 6); }
        const m = await engine.createQuestionByKey('matrix_order', a, POOL, {});
        if (m) assert.equal(m.options.length, 4);
    }
    assert.ok(hard > 20);
});

await test('matching صعب: ٦ أزواج متسقة (٤–٦ إن قصرت السورة)', async () => {
    let n = 0;
    for (const a of sample(60)) {
        const q = await engine.createQuestionByKey('matching', a, POOL, HARD);
        if (!q) continue;
        n++;
        assert.ok(q.correctAnswer.length >= 4 && q.correctAnswer.length <= 6);
        assert.equal(q.leftItems.length, q.rightItems.length);
        assert.equal(q.points, q.correctAnswer.length);
    }
    assert.ok(n > 20);
});

await test('written_blank صعب: كلمتان متجاورتان بتصحيح يدوي، write_3_ayahs يعطي كلمتين فقط', async () => {
    let n = 0;
    for (const a of sample(80, p => words(p).length >= 6)) {
        const q = await engine.createQuestionByKey('written_blank', a, POOL, HARD);
        if (q) { n++; assert.equal(q.correctAnswer.split(' ').length, 2); assert.equal(q.needsManualGrading, true); assert.ok(q.text.includes('[ ....... ....... ]')); }
        const w = await engine.createQuestionByKey('write_3_ayahs', a, POOL, HARD);
        if (w) { const start = w.text.split('﴿')[1].replace(/[ ﴾.]/g, ' ').trim().split(/\s+/); assert.equal(start.length, 2); }
    }
    assert.ok(n > 20);
});

await test('المتوسط لم يتغيّر: mcq_next بأربعة خيارات وبالآية كاملة، dropdown بأربعة', async () => {
    for (const a of sample(40, p => p.numberInSurah < 25)) {
        const q = await engine.createQuestionByKey('mcq_next', a, POOL, {});
        if (q) { assert.ok(q.options.length <= 4); assert.ok(!q.text.includes('…')); assert.ok(!q.title.includes('تخطَّ')); }
        const d = await engine.createQuestionByKey('dropdown', a, POOL, {});
        if (d) assert.equal(d.options.length, 4);
    }
});

await test('buildQuestionForPlan: يمرّر الصعوبة ويبدّل visual_page ببديل صالح', async () => {
    const a = sample(1, p => p.numberInSurah > 2 && words(p).length >= 6)[0];
    const hard = await engine.buildQuestionForPlan('visual_page', a, POOL, { difficulty: 'hard' });
    assert.ok(hard && hard.fmt === 'dropdown', 'البديل في الصعب هو أكمل الفراغ');
    assert.equal(hard.question.options.length, 5);
});

console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل، من إجمالي ${pass + fail} اختبار.`);
