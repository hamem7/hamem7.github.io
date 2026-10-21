// tests/similarityQuestions.test.mjs — node tests/similarityQuestions.test.mjs
// فحوص جودة أسئلة المتشابهات على القرآن كله (كل المجموعات الـ1659). التنفيذ في tools/mutashabihat-questions/qa.mjs
import assert from 'node:assert/strict';
import { runAll, summarize, checkQuestion, buildRaw } from '../tools/mutashabihat-questions/qa.mjs';
import { QuranIndex, norm, skel, shortenOptions, stripHizbMark } from '../engine/similarityQuestions.js';
import { loadQuranSurahs } from '../tools/mutashabihat-questions/load.mjs';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

const res = await runAll({ seed: 7 });
const sum = summarize(res);
const allQsEarly = res.groups.flatMap(g => g.questions);
console.log(sum);

test('تُولَّد أسئلة لمعظم المجموعات وبكل الأنواع', () => {
    assert.ok(sum.total > 1500);
    ['sim_pair', 'sim_complete', 'sim_which', 'sim_match'].forEach(t => assert.ok(sum.byType[t] > 0, 'لا أسئلة من نوع ' + t));
});
test('لا رقم (عربي أو لاتيني) داخل نص أي سؤال أو خياراته', () => {
    const bad = res.groups.flatMap(g => g.questions).filter(q => /[0-9٠-٩۰-۹]/.test([q.text, ...q.options].join('\n')));
    assert.equal(bad.length, 0, bad.slice(0, 3).map(q => q.groupId).join());
});
test('كل سؤال: خيار صحيح واحد بالضبط، والخاطئة ليست صحيحة في السياق (بحث في المصحف كله)، وما بين ﴿ ﴾ حرفي', () => {
    assert.equal(res.failures.length, 0, JSON.stringify(res.failures.slice(0, 3)));
});
test('«في أي سورتين؟»: للأجزاء 26–30 فقط، ولا يوجد نوع «من أي سورة؟» القديم', () => {
    assert.equal(res.failures.filter(f => f.type === 'sim_pair').length, 0);
    assert.ok(sum.byType.sim_pair > 0);
    assert.equal(sum.byType.sim_surah || 0, 0);
    const ps = allQsEarly.filter(q => q.type === 'sim_pair');
    ps.forEach(q => { assert.ok(q.juz >= 26 && q.juz <= 30, q.groupId); assert.equal(q.options.length, 3); assert.equal(q.pair.surahs.length, 2); });
    assert.ok(ps.some(q => q.groupId === 'amma-3' && q.correctAnswer === 'النازعات|الفجر' && /جزء عمّ/.test(q.text)), 'amma-3 (يتذكر الإنسان) النازعات والفجر');
});
test('لا سؤالان في المجموعة نفسها يتكرران أو يكشف أحدهما جواب الآخر', () => {
    assert.equal(res.groupFailures.length, 0, JSON.stringify(res.groupFailures.slice(0, 3)));
});
test('عدد الخيارات 3 أو 4 وموضع الجواب الصحيح موزّع بالتساوي', () => {
    const qs = res.groups.flatMap(g => g.questions).filter(q => q.type === 'sim_pair' || q.type === 'sim_complete');
    assert.ok(qs.every(q => q.options.length >= 3 && q.options.length <= 4));
    const pairs = qs.filter(q => q.type === 'sim_pair'), pc = [0, 0, 0];
    pairs.forEach(q => pc[q.correctIndex]++);
    assert.ok(pc.every(c => c > 0), 'موضع الجواب في sim_pair: ' + pc.join());
    const four = qs.filter(q => q.options.length === 4), cnt = [0, 0, 0, 0];
    four.forEach(q => cnt[q.correctIndex]++);
    const mean = four.length / 4; // لا أسئلة بأربعة خيارات بعد حذف «من أي سورة؟»: يُفحص التوزيع فقط إن وُجدت
    if (four.length) cnt.forEach(c => assert.ok(Math.abs(c - mean) / mean < 0.1, cnt.join()));
    const three = qs.filter(q => q.options.length === 3), c3 = [0, 0, 0];
    three.forEach(q => c3[q.correctIndex]++);
    c3.forEach(c => assert.ok(Math.abs(c - three.length / 3) / (three.length / 3) < 0.1, c3.join()));
});
test('لا مجموعة بأكثر من 4 أسئلة، ولا نوعان متطابقان الهدف داخل المجموعة', () => {
    res.groups.forEach(g => assert.ok(g.count <= 4));
});

// ضوابط سلبية: يجب أن تكشف الفحوص الأخطاء المتعمَّدة (حتى لا تكون الفحوص صامتة دائماً)
const R = buildRaw();
const sample = (type) => res.groups.flatMap(g => g.questions).find(q => q.type === type);
test('ضابط سلبي: تعديل حرف في آية معروضة يُكتشف', () => {
    const q = structuredClone(sample('sim_complete')); q.text = q.text.replace('﴿', '﴿ز');
    assert.ok(checkQuestion(q, R).some(e => e.includes('حرفية')));
});
test('ضابط سلبي: إدخال رقم آية يُكتشف', () => {
    const q = structuredClone(sample('sim_complete')); q.text += ' 12';
    assert.ok(checkQuestion(q, R).some(e => e.includes('رقم')));
});
test('ضابط سلبي: خيار خاطئ يساوي الصحيح في السياق يُكتشف', () => {
    const q = structuredClone(sample('sim_complete')); const i = (q.correctIndex + 1) % q.options.length; q.options[i] = q.correctAnswer;
    assert.ok(checkQuestion(q, R).length > 0);
});
test('ضابط سلبي: جعل الخيار الخاطئ هو الجواب في «في أي سورتين؟» يُكتشف', () => {
    const q = structuredClone(sample('sim_pair'));
    q.options[(q.correctIndex + 1) % 3] = q.correctAnswer;
    assert.ok(checkQuestion(q, R).length > 0);
});
test('ضابط سلبي: خيار «سورتين» باسم سورة وهمي يُكتشف', () => {
    const q = structuredClone(sample('sim_pair'));
    q.options[(q.correctIndex + 1) % 3] = 'وهمية|الفجر';
    assert.ok(checkQuestion(q, R).some(e => e.includes('ليس سورتين صالحتين')));
});

// قصّ الخيارات الطويلة للعرض
test('shortenOptions: خيار ≤14 كلمة يبقى كاملاً، والأطول يُقصّ إلى 12 كلمة + «…»', () => {
    const w = (n, p) => Array.from({ length: n }, (_, i) => p + i).join(' ');
    const d = shortenOptions([w(10, 'أ'), w(30, 'ب'), w(14, 'ج')]);
    assert.equal(d[0], w(10, 'أ')); assert.equal(d[2], w(14, 'ج'));
    assert.equal(d[1], w(12, 'ب') + ' …');
});
test('shortenOptions: خياران متطابقان في أول 12 كلمة يُوسَّع القص حتى يختلفا', () => {
    const common = Array.from({ length: 14 }, (_, i) => 'ك' + i).join(' ');
    const d = shortenOptions([common + ' س1 س2 س3 س4', common + ' ص1 ص2 ص3 ص4']);
    assert.notEqual(norm(d[0]), norm(d[1]));
    assert.ok(d[0].includes('س1') && d[1].includes('ص1'));
});
test('كل الأسئلة: خيار مقصوص واحد على الأقل موجود، وبلا تطابق بعد القص (فحص عبر checkQuestion)', () => {
    const qs = res.groups.flatMap(g => g.questions);
    assert.ok(qs.some(q => q.optionsDisplay.some((d, i) => d !== q.options[i])), 'لا خيار مقصوص في أي سؤال');
    assert.equal(res.failures.filter(f => f.errors.some(e => /قص|عرض|«…»/.test(e))).length, 0);
});
test('ضابط سلبي: تطابق خيارين بعد القص يُكتشف', () => {
    const q = structuredClone(res.groups.flatMap(g => g.questions).find(q => q.type === 'sim_complete' && q.optionsDisplay.some((d, i) => d !== q.options[i])));
    q.optionsDisplay[0] = q.optionsDisplay[1];
    assert.ok(checkQuestion(q, R).some(e => e.includes('متطابقان')));
});
// ۞
test('لا رمز ۞ في أي سؤال ولا خيار', () => {
    assert.ok(!res.groups.flatMap(g => g.questions).some(q => [q.text, ...q.options, ...q.optionsDisplay].join('').includes('\u06DE')));
    assert.equal(stripHizbMark('۞ قُل'), 'قُل');
});
// دعم العبارة في وسط الآية (مفعّل افتراضياً بسقف 15 كلمة): مقارنة بتعطيله صراحةً
const resNoMid = await runAll({ seed: 7, midVerse: false });
const nComplete = (r) => r.groups.reduce((a, g) => a + g.questions.filter(q => q.type === 'sim_complete').length, 0);
test('midVerse الافتراضي: عدد أسئلة «أكمل الآية» أكبر من تعطيله، وصفر إخفاق في الفحوص', () => {
    assert.equal(resNoMid.failures.length, 0, JSON.stringify(resNoMid.failures.slice(0, 2)));
    assert.ok(nComplete(res) > nComplete(resNoMid) * 1.2, `${nComplete(res)} مقابل ${nComplete(resNoMid)}`);
});
test('سقف المطلع: لا مطلع «أكمل الآية» يتجاوز 15 كلمة', () => {
    const lens = res.groups.flatMap(g => g.questions).filter(q => q.type === 'sim_complete')
        .map(q => { const m = q.text.match(/﴿([^﴾]*) \.{6}﴾/); return m[1].split(/\s+/).length; });
    assert.ok(lens.length > 0 && Math.max(...lens) <= 15, 'أطول مطلع ' + Math.max(...lens));
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


// ---- النوعان الجديدان ----
import { toHomeworkQuestion } from '../engine/similarityEngine.js';
const allQs = res.groups.flatMap(g => g.questions);
test('sim_which: خياران، الصحيح يرد في السورة المذكورة والخاطئ لا يرد فيها (فحص QA مستقل)', () => {
    const ws = allQs.filter(q => q.type === 'sim_which');
    assert.ok(ws.length > 0);
    ws.forEach(q => assert.equal(q.options.length, 2));
    assert.equal(res.failures.filter(f => f.type === 'sim_which').length, 0);
});
test('sim_match: ثلاث سور فأكثر، كل آية في سورتها وحدها، وتتحول لسؤال matching للواجب', () => {
    const ms = allQs.filter(q => q.type === 'sim_match');
    assert.ok(ms.length > 0);
    assert.equal(res.failures.filter(f => f.type === 'sim_match').length, 0);
    const h = toHomeworkQuestion(ms[0]);
    assert.equal(h.type, 'matching');
    assert.equal(h.points, h.correctAnswer.length);
    assert.ok(h.leftItems.length >= 3 && h.rightItems.length === h.leftItems.length);
    const w = toHomeworkQuestion(allQs.find(q => q.type === 'sim_which'));
    assert.equal(w.type, 'mcq'); assert.equal(w.options.length, 2);
});
console.log(`\n${pass} ✅ / ${fail} ❌`); process.exit(fail ? 1 : 0);
