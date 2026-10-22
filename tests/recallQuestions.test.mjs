// tests/recallQuestions.test.mjs — node tests/recallQuestions.test.mjs
// سؤالا الاستحضار: «ما الكلمة الناقصة؟» (sim_missing) و«اقرأ الآية من السورة المذكورة» (sim_named)
import assert from 'node:assert/strict';
import { generateRecallQuestions, memorizedSurahsOf, localizedRecallText, verseAt, RECALL_TYPES } from '../engine/recallQuestions.js';
import { mulberry32, norm } from '../engine/similarityQuestions.js';
import { loadQuran } from '../tools/mutashabihat-questions/load.mjs';

const Q = loadQuran();
const surahsData = [...Q.surahs.values()].map(s => ({ number: s.number, name: s.name }));
const nm = (n) => surahsData.find(s => s.number === n).name;
let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

const pool = (s) => Array.from({ length: Q.ayahCount(s) }, (_, i) => ({ surahNumber: s, numberInSurah: i + 1 }));
const mem = memorizedSurahsOf({ memoFrom: nm(114), memoTo: nm(46) }, surahsData);

test('memorizedSurahsOf: من الناس صعوداً حتى الأحقاف بلا الفاتحة، ونطاق معكوس/ناقص = null', () => {
    assert.equal(mem.size, 69); assert.ok(mem.has(114) && mem.has(46) && !mem.has(45) && !mem.has(1));
    assert.equal(memorizedSurahsOf({ memoFrom: nm(2), memoTo: nm(114) }, surahsData), null);
    assert.equal(memorizedSurahsOf({ memoFrom: '', memoTo: '' }, surahsData), null);
    assert.equal(memorizedSurahsOf(null, surahsData), null);
});

const batch = (seed, scope = 46, count = 12) => generateRecallQuestions(Q, mem, pool(scope), { count, rng: mulberry32(seed) });

test('يولّد من النوعين معاً، وكل سؤال من عبارة مختلفة، وموضعه المرجعي داخل نطاق الاختبار', () => {
    let kinds = new Set();
    for (let seed = 1; seed <= 20; seed++) {
        const qs = batch(seed);
        assert.ok(qs.length >= 3, 'عدد قليل: ' + qs.length);
        assert.equal(new Set(qs.map(q => q.groupId)).size, qs.length);
        for (const q of qs) { kinds.add(q.kind); assert.ok(RECALL_TYPES.includes(q.kind)); assert.equal(q.occurrence.surahNumber, 46); }
    }
    assert.deepEqual([...kinds].sort(), [...RECALL_TYPES].sort());
});

test('«ما الكلمة الناقصة؟»: 3 خيارات مختلفة، الصحيح بينها وهو كلمة الآية، والشبيهة من سورة أخرى في المحفوظ', () => {
    let n = 0;
    for (let seed = 1; seed <= 30; seed++) for (const q of batch(seed).filter(q => q.kind === 'sim_missing')) {
        n++;
        assert.equal(q.options.length, 3);
        assert.equal(new Set(q.options.map(norm)).size, 3);
        assert.equal(q.options[q.correctIndex], q.correctAnswer);
        const a = q.reveal.a, b = q.reveal.b;
        assert.equal(a.words[a.mark[0]], q.correctAnswer);
        assert.notEqual(a.surahNumber, b.surahNumber);
        assert.ok(mem.has(b.surahNumber), 'الشبيهة خارج المحفوظ');
        assert.notEqual(norm(a.words[a.mark[0]]), norm(b.words[b.mark[0]]));
        assert.ok(q.options.some(o => norm(o) === norm(b.words[b.mark[0]])), 'كلمة الآية الشبيهة ليست بين الخيارات');
        assert.ok(!/[0-9٠-٩]/.test(q.text), 'رقم في نص السؤال');
        assert.ok(/\.{6}/.test(q.text));
    }
    assert.ok(n > 20, 'أسئلة قليلة جداً: ' + n);
});

test('«ما الكلمة الناقصة؟»: لا يُعرض من الآية ما يكشف الجواب (الباقي بعد الكلمة الناقصة مخفي)', () => {
    for (let seed = 1; seed <= 30; seed++) for (const q of batch(seed).filter(q => q.kind === 'sim_missing')) {
        const a = q.reveal.a, i = a.mark[0];
        const shown = q.stemLine.replace('......', '').trim();
        const stemWords = i === 0 ? shown : a.words.slice(0, i).join(' ');
        if (q.stemLine.endsWith('......')) assert.equal(shown, a.words.slice(0, i).join(' ')), assert.ok(!shown.includes(a.words.slice(i).join(' ')));
        else assert.equal(shown, a.words.slice(i + 1).join(' '));
        assert.ok(stemWords !== undefined);
    }
});

test('«اقرأ الآية من السورة المذكورة»: 2–5 سور، السورة المطلوبة بينها، والآية تحوي العبارة، بلا رقم في السؤال', () => {
    let n = 0;
    for (let seed = 1; seed <= 30; seed++) for (const q of batch(seed).filter(q => q.kind === 'sim_named')) {
        n++;
        const all = [q.reveal.target, ...q.reveal.others];
        assert.ok(all.length >= 2 && all.length <= 5);
        assert.equal(new Set(all.map(v => v.surahNumber)).size, all.length);
        assert.ok(all.every(v => mem.has(v.surahNumber)));
        assert.equal(q.correctIndex, -1); assert.deepEqual(q.options, []);
        const phrase = norm(q.anchorPhrase);
        for (const v of all) assert.ok(norm(verseAt(Q, v.surahNumber, v.ayahNumber).w.join(' ')).includes(phrase), 'الآية بلا العبارة');
        assert.ok(q.text.includes('من محفوظك') && !q.text.includes('محفوظ الطالب'));
        assert.ok(q.text.includes('سورة ' + q.reveal.target.surahName));
        assert.ok(!/آية\s*[0-9٠-٩]|الآية\s*[0-9٠-٩]/.test(q.text), 'رقم آية في نص السؤال');
        assert.equal(q.hints[0].k, 'first'); assert.equal(q.hints[0].word, q.reveal.target.words[0]);
        for (const h of q.hints) if (h.k === 'opts') {
            assert.equal(h.verses.length, 3); assert.equal(new Set(h.verses.map(norm)).size, 3);
            assert.ok(h.verses.includes(q.reveal.target.words.join(' ')));
        }
    }
    assert.ok(n > 20);
});

test('المقارنة بكل المحفوظ لا بنطاق الاختبار: شبيهات الأحقاف تأتي من سور أخرى', () => {
    const outside = new Set();
    for (let seed = 1; seed <= 30; seed++) for (const q of batch(seed)) {
        const others = q.kind === 'sim_missing' ? [q.reveal.b] : q.reveal.others.concat(q.reveal.target);
        others.forEach(v => { if (v.surahNumber !== 46) outside.add(v.surahNumber); });
    }
    assert.ok(outside.size >= 5, 'سور قليلة: ' + [...outside]);
    assert.ok([...outside].every(s => mem.has(s)));
});

test('طالب لم يحفظ سورة الشبيهة: لا تظهر في أسئلته', () => {
    const small = new Set([46, 47, 48]);
    for (let seed = 1; seed <= 20; seed++) for (const q of generateRecallQuestions(Q, small, pool(46), { count: 12, rng: mulberry32(seed) })) {
        const vs = q.kind === 'sim_missing' ? [q.reveal.a, q.reveal.b] : [q.reveal.target, ...q.reveal.others];
        assert.ok(vs.every(v => small.has(v.surahNumber)));
    }
});

test('نص السؤال بلغة الواجهة: في Node يرجع العربي بلا بقايا {}', () => {
    for (const q of batch(3)) {
        const txt = localizedRecallText(q);
        assert.ok(!/\{[a-z]+\}/.test(txt), txt);
        assert.ok(txt.length > 20);
    }
});

test('عدّاد 0 أو بلا محفوظ = لا أسئلة', () => {
    assert.deepEqual(generateRecallQuestions(Q, mem, pool(46), { count: 0 }), []);
    assert.deepEqual(generateRecallQuestions(Q, new Set(), pool(46), { count: 3 }), []);
    assert.deepEqual(generateRecallQuestions(Q, null, pool(46), { count: 3 }), []);
});

console.log(`\n${pass} نجح · ${fail} فشل`); process.exit(fail ? 1 : 0);
