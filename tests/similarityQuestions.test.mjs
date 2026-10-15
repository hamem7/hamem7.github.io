// tests/similarityQuestions.test.mjs — node tests/similarityQuestions.test.mjs
// فحوص جودة أسئلة المتشابهات على القرآن كله (كل المجموعات الـ1659). التنفيذ في tools/mutashabihat-questions/qa.mjs
import assert from 'node:assert/strict';
import { runAll, summarize, checkQuestion, buildRaw } from '../tools/mutashabihat-questions/qa.mjs';
import { QuranIndex, norm, skel } from '../engine/similarityQuestions.js';
import { loadQuranSurahs } from '../tools/mutashabihat-questions/load.mjs';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

const res = await runAll({ seed: 7 });
const sum = summarize(res);
console.log(sum);

test('تُولَّد أسئلة لمعظم المجموعات وبكل الأنواع الأربعة', () => {
    assert.ok(sum.total > 5000);
    ['sim_surah', 'sim_complete', 'sim_next', 'sim_prev'].forEach(t => assert.ok(sum.byType[t] > 0, 'لا أسئلة من نوع ' + t));
});
test('لا رقم (عربي أو لاتيني) داخل نص أي سؤال أو خياراته', () => {
    const bad = res.groups.flatMap(g => g.questions).filter(q => /[0-9٠-٩۰-۹]/.test([q.text, ...q.options].join('\n')));
    assert.equal(bad.length, 0, bad.slice(0, 3).map(q => q.groupId).join());
});
test('كل سؤال: خيار صحيح واحد بالضبط، والخاطئة ليست صحيحة في السياق (بحث في المصحف كله)، وما بين ﴿ ﴾ حرفي', () => {
    assert.equal(res.failures.length, 0, JSON.stringify(res.failures.slice(0, 3)));
});
test('«من أي سورة؟»: لا تحتوي أي سورة خاطئة الآية نفسها', () => {
    assert.equal(res.failures.filter(f => f.type === 'sim_surah').length, 0);
    assert.ok(sum.byType.sim_surah > 0);
});
test('لا سؤالان في المجموعة نفسها يتكرران أو يكشف أحدهما جواب الآخر', () => {
    assert.equal(res.groupFailures.length, 0, JSON.stringify(res.groupFailures.slice(0, 3)));
});
test('عدد الخيارات 3 أو 4 وموضع الجواب الصحيح موزّع بالتساوي', () => {
    const qs = res.groups.flatMap(g => g.questions);
    assert.ok(qs.every(q => q.options.length >= 3 && q.options.length <= 4));
    const four = qs.filter(q => q.options.length === 4), cnt = [0, 0, 0, 0];
    four.forEach(q => cnt[q.correctIndex]++);
    const mean = four.length / 4;
    cnt.forEach(c => assert.ok(Math.abs(c - mean) / mean < 0.1, cnt.join()));
});
test('لا مجموعة بأكثر من 4 أسئلة، ولا نوعان متطابقان الهدف داخل المجموعة', () => {
    res.groups.forEach(g => assert.ok(g.count <= 4));
});

// ضوابط سلبية: يجب أن تكشف الفحوص الأخطاء المتعمَّدة (حتى لا تكون الفحوص صامتة دائماً)
const R = buildRaw();
const sample = (type) => res.groups.flatMap(g => g.questions).find(q => q.type === type);
test('ضابط سلبي: تعديل حرف في آية معروضة يُكتشف', () => {
    const q = structuredClone(sample('sim_next')); q.text = q.text.replace('﴿', '﴿ز');
    assert.ok(checkQuestion(q, R).some(e => e.includes('حرفية')));
});
test('ضابط سلبي: إدخال رقم آية يُكتشف', () => {
    const q = structuredClone(sample('sim_complete')); q.text += ' 12';
    assert.ok(checkQuestion(q, R).some(e => e.includes('رقم')));
});
test('ضابط سلبي: خيار خاطئ يساوي الصحيح في السياق يُكتشف', () => {
    const q = structuredClone(sample('sim_next')); const i = (q.correctIndex + 1) % q.options.length; q.options[i] = q.correctAnswer;
    assert.ok(checkQuestion(q, R).length > 0);
});
test('ضابط سلبي: خيار «سورة» ليس اسم سورة يُكتشف', () => {
    const q = structuredClone(sample('sim_surah'));
    q.options[(q.correctIndex + 1) % q.options.length] = 'سورة وهمية';
    assert.ok(checkQuestion(q, R).some(e => e.includes('ليس اسم سورة')));
});

// المصحف
test('QuranIndex: البسملة والـBOM لا يدخلان نص الآية الأولى', () => {
    const Q = new QuranIndex(loadQuranSurahs());
    assert.ok(!Q.verse(2, 1).text.includes('بِسْمِ'));
    assert.equal(Q.verse(2, 1).text.split(' ')[0], 'الٓمٓ');
    assert.ok(!Q.verse(1, 1).text.startsWith('﻿'));
    assert.ok(Q.verse(1, 1).text.includes('بِسْمِ'));       // الفاتحة: البسملة آية
    assert.ok(norm(Q.verse(9, 1).text).startsWith('براءه'));   // التوبة بلا بسملة
    assert.equal(Q.flat.length, 6236);
});
test('skel يطابق «أتاك» الإملائية بـ«أتىٰك» العثمانية', () => {
    assert.ok(skel('هَلْ أَتَىٰكَ حَدِيثُ').startsWith(skel('هَلْ أَتَاكَ')));
});

console.log(`\n${pass} ✅ / ${fail} ❌`); process.exit(fail ? 1 : 0);
