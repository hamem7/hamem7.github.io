// tests/tajweedHomework.test.mjs — أسئلة التجويد في الواجب تُسحب من ملف الطالب (الأحكام المشروحة له)
// تشغيل: node tests/tajweedHomework.test.mjs
import assert from 'node:assert/strict';
import { buildTajweedHomeworkQuestion } from '../engine/tajweedHomework.js';
import { HomeworkEngine } from '../engine/homeworkEngine.js';
import { getAllRulesFlat, isMushafRule } from '../engine/tajweedRulesCatalog.js';

let pass = 0, fail = 0;
const test = async (name, fn) => { try { await fn(); pass++; console.log('✓', name); } catch (e) { fail++; console.log('✗', name, '\n  ', e.message); } };

const flat = getAllRulesFlat().filter(x => !isMushafRule(x.rule));
const names = new Map(flat.map(x => [x.rule.id, 'اسم_' + x.rule.id]));
const learned = ['qalqalah', 'ghunna_wajiba', 'ikhfa_shafawi'].map(id => ({
    id, stageId: flat.find(x => x.rule.id === id).stageId, name: names.get(id), def: 'شرح الحكم كما قرأه الطالب في الدرس ' + id
}));
const profile = { rules: learned, nameOf: (id) => names.get(id) || null, sources: [] };

await test('بلا ملف تجويد أو بلا أحكام مشروحة: null (فيعود السؤال العام)', () => {
    assert.equal(buildTajweedHomeworkQuestion(null), null);
    assert.equal(buildTajweedHomeworkQuestion({ ...profile, rules: [] }), null);
});

await test('«تذكّر الشرح»: نص الشرح حرفياً، والجواب حكم من أحكامه المشروحة، وتصحيح آلي', () => {
    for (let i = 0; i < 40; i++) {
        const { ruleId, question: q } = buildTajweedHomeworkQuestion(profile);
        assert.ok(learned.some(r => r.id === ruleId));
        assert.equal(q.type, 'mcq');
        assert.ok(!q.needsManualGrading);
        const rule = learned.find(r => r.id === ruleId);
        assert.ok(q.title.includes(`«${rule.def}»`), 'الشرح كما هو');
        assert.equal(q.correctAnswer, rule.name);
        assert.ok(q.options.includes(q.correctAnswer));
        assert.equal(new Set(q.options).size, q.options.length);
        assert.ok(q.options.length >= 3);
    }
});

await test('«طبّق الشرح»: كلمة مظلَّلة من آية الحفظ، والمشتِّتات تستبعد الأحكام المتزامنة على الكلمة', () => {
    const src = { ruleId: 'ikhfa_shafawi', surah: 105, ayah: 4, text: 'تَرْمِيهِم بِحِجَارَةٍ مِّن سِجِّيلٍ', occurrences: [{ w1: 0, w2: 1 }], otherRuleIds: ['idgham_shafawi'] };
    let apply = 0;
    for (let i = 0; i < 60; i++) {
        const { question: q } = buildTajweedHomeworkQuestion({ ...profile, sources: [src] });
        if (q.tajweedVariant !== 'apply') continue;
        apply++;
        assert.equal(q.correctAnswer, names.get('ikhfa_shafawi'));
        assert.ok(q.text.includes('<span style='), 'تظليل');
        assert.ok(!q.options.includes(names.get('idgham_shafawi')));
    }
    assert.ok(apply > 0);
});

await test('المحرك: createTajweedExtractQuestion يسحب من ملف الطالب، وبدونه يبقى السؤال اليدوي العام', async () => {
    const ayah = { surahNumber: 2, numberInSurah: 2, text: 'ذَٰلِكَ ٱلْكِتَٰبُ لَا رَيْبَ فِيهِ هُدًى لِّلْمُتَّقِينَ ٱلَّذِينَ يُؤْمِنُونَ بِٱلْغَيْبِ وَيُقِيمُونَ ٱلصَّلَوٰةَ', surahName: 'البقرة' };
    const eng = new HomeworkEngine({});
    const general = await eng.createTajweedExtractQuestion(ayah, [ayah]);
    assert.equal(general.type, 'tajweed_extract');
    eng.tajweedProfile = profile;
    const fromFile = await eng.createTajweedExtractQuestion(ayah, [ayah]);
    assert.equal(fromFile.type, 'mcq');
    assert.ok(fromFile.tajweedRuleId);
});

console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل`);
if (fail) process.exitCode = 1;
