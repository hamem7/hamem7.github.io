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

await test('mcq_next/mcq_prev صعب: ٤–٥ خيارات فريدة كلها من السورة نفسها، والآية الطويلة تُعرض جزئياً', async () => {
    let partial = 0, total = 0;
    for (const key of ['mcq_next', 'mcq_prev']) {
        for (const a of sample(60)) {
            const q = await engine.createQuestionByKey(key, a, POOL, HARD);
            if (!q) continue;
            total++;
            assertValidMcq(q, key);
            assert.ok(q.options.length >= 4 && q.options.length <= 5, `${key}: ${q.options.length} خيارات`);
            const sameSurah = new Set(POOL.filter(p => p.surahNumber === a.surahNumber).map(p => cleanAyahText(p.text)));
            assert.ok(q.options.every(o => sameSurah.has(o)), `${key}: خيار من خارج السورة`);
            assert.ok(key === 'mcq_next' ? /(تلي|بعد) هذه/.test(q.title) : /(تَسبِق|قبل) هذه/.test(q.title), q.title);
            if (words(a).length >= 7) { assert.ok(q.text.includes('…'), 'الآية الطويلة يجب أن تُعرض جزئياً'); partial++; }
            assert.ok(!q.title.includes('بآيتين'), 'سؤال التخطي أُلغي');
        }
    }
    assert.ok(total > 60 && partial > 10, `total=${total} partial=${partial}`);
});

await test('dropdown صعب: أربعة خيارات والكلمة المخفية طويلة وغير وظيفية', async () => {
    let n = 0;
    for (const a of sample(80)) {
        const q = await engine.createQuestionByKey('dropdown', a, POOL, HARD);
        if (!q) continue;
        n++;
        assertValidMcq(q, 'dropdown');
        assert.equal(q.options.length, 4);
        assert.ok(q.correctAnswer.replace(/[ً-ٰٟۖ-ۭـ]/g, '').length >= 4 || words(a).length < 8, 'كلمة قصيرة مخفية: ' + q.correctAnswer);
    }
    assert.ok(n > 40);
});

await test('dual_dropdown صعب: أربعة خيارات لكل فراغ والمفتاحان ضمنها', async () => {
    let n = 0;
    for (const a of sample(120, p => words(p).length >= 7)) {
        const q = await engine.createQuestionByKey('dual_dropdown', a, POOL, HARD);
        if (!q) continue;
        n++;
        assert.equal(q.options1.length, 4); assert.equal(q.options2.length, 4);
        assert.ok(q.options1.includes(q.correctAnswer[0]) && q.options2.includes(q.correctAnswer[1]));
        assert.equal(new Set(q.options1).size, 4); assert.equal(new Set(q.options2).size, 4);
        assert.equal(q.points, 2);
    }
    assert.ok(n > 20);
});

await test('ayah_ending صعب: نصف الآية مخفي (٤+ كلمات) وأربعة خيارات فريدة والمفتاح ضمنها', async () => {
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

await test('mcq_surah صعب: أربعة خيارات فريدة', async () => {
    for (const a of sample(30)) {
        const q = await engine.createQuestionByKey('mcq_surah', a, POOL, HARD);
        assertValidMcq(q, 'mcq_surah');
        assert.equal(q.options.length, 4);
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
        if (q) { assert.ok(q.options.length <= 4); assert.ok(!q.text.includes('…')); assert.ok(!q.title.includes('بآيتين')); }
        const d = await engine.createQuestionByKey('dropdown', a, POOL, {});
        if (d) assert.equal(d.options.length, 4);
    }
});

await test('buildQuestionForPlan: مستوى الصعوبة من الصيغة نفسها (التالية متوسطة بآية كاملة، السابقة صعبة بنصف آية)', async () => {
    // ليست آخر آية في سورتها (لا آية «تالية» لها فيرجع المولّد null عمداً)، وإلا يفشل الاختبار عشوائياً
    const a = sample(1, p => p.numberInSurah > 2 && words(p).length >= 8 && POOL.some(x => x.surahNumber === p.surahNumber && x.numberInSurah === p.numberInSurah + 1))[0];
    const next = await engine.buildQuestionForPlan('mcq_next', a, POOL, { allowFallback: false });
    const prev = await engine.buildQuestionForPlan('mcq_prev', a, POOL, { allowFallback: false });
    assert.ok(next && !next.question.text.includes('…'), 'التالية متوسطة: الآية كاملة');
    assert.ok(prev && prev.question.text.includes('…'), 'السابقة صعبة: نصف الآية');
    assert.equal(await engine.buildQuestionForPlan('visual_page', a, POOL, { allowFallback: false }), null);
    assert.equal(await engine.buildQuestionForPlan('intruder_word', a, POOL, { allowFallback: false }), null);
});

await test('around_ayah: آية ويكتب الطالب السابقة والتالية (تصحيح يدوي، نقطتان)', async () => {
    for (const a of sample(40, p => p.numberInSurah > 1)) {
        const r = await engine.buildQuestionForPlan('around_ayah', a, POOL, { allowFallback: false });
        const surah = await surahsFake.getSurah(a.surahNumber);
        if (a.numberInSurah >= surah.ayahs.length) { assert.equal(r, null); continue; }
        assert.ok(r && r.fmt === 'around_ayah', 'الصيغة الفعلية around_ayah');
        const q = r.question;
        assert.equal(q.type, 'around_ayah');
        assert.equal(q.points, 2);
        assert.equal(q.needsManualGrading, true);
        assert.ok(q.text.includes(cleanAyahText(a.text)));
        assert.ok(q.correctAnswer.includes(cleanAyahText(surah.ayahs[a.numberInSurah - 2].text)));
        assert.ok(q.correctAnswer.includes(cleanAyahText(surah.ayahs[a.numberInSurah].text)));
    }
});

console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل، من إجمالي ${pass + fail} اختبار.`);
