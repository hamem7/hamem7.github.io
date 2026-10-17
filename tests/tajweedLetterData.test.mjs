// tests/tajweedLetterData.test.mjs — node tests/tajweedLetterData.test.mjs
// فحوص بيانات الحروف والأزواج: لا نصّ قرآنياً مكتوباً في الملفات، فكل مرجع (سورة/آية/عبارة) يجب أن توجد عبارته
// فعلاً في مصحف المنصة المحلي، والحرف المقصود هو أول حرف من الكلمة المحدَّدة، والحرفان متجاوران في الأزواج.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { LETTER_EXAMPLES, splitLetterExample } from '../engine/tajweedLetterExamples.js';
import { LETTER_PAIRS, pairPhrase } from '../engine/tajweedLetterPairs.js';
import { getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import { cleanAyahText } from '../engine/quranEngine.js';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

const quran = JSON.parse(fs.readFileSync(new URL('../database/quran-uthmani.json', import.meta.url), 'utf8')).data.surahs;
const ayahText = (s, a) => { const x = quran[s - 1] && quran[s - 1].ayahs[a - 1]; return x ? cleanAyahText(x.text) : null; };
const strip = (s) => s.replace(/[ً-ٰٟۖ-ۭ]/g, '');
const base = (c) => ({ 'أ': 'ء', 'إ': 'ء', 'ؤ': 'ء', 'ئ': 'ء', 'ٱ': 'ا' }[c] || c);
const ruleIds = new Set(getAllRulesFlat().map(x => x.rule.id));

test('كل حكم في ملفَّي البيانات موجود في الكتالوج', () => {
    [...Object.keys(LETTER_EXAMPLES), ...Object.keys(LETTER_PAIRS)].forEach(id => assert.ok(ruleIds.has(id), id));
});

test('أمثلة الحروف: العبارة موجودة في الآية، والحرف المقصود أول حرف الكلمة المحدَّدة (أو الحرف رقم n)', () => {
    for (const [ruleId, byLetter] of Object.entries(LETTER_EXAMPLES)) {
        for (const [letter, e] of Object.entries(byLetter)) {
            const text = ayahText(e.s, e.a);
            assert.ok(text, `${ruleId}/${letter}: لا آية ${e.s}:${e.a}`);
            const parts = splitLetterExample(text, e);
            assert.ok(parts, `${ruleId}/${letter}: العبارة «${e.h}» غير موجودة في ${e.s}:${e.a}`);
            if (e.whole) assert.ok(new RegExp(letter + '[\\u064B-\\u065F]*\\u0651').test(parts.mark), `${ruleId}/${letter}: الكلمة «${parts.mark}» ليس فيها ${letter} مشدَّدة`);
            else assert.equal(base(strip(parts.mark)[0]), letter, `${ruleId}/${letter}: الحرف المظلَّل «${parts.mark}»`);
            if (e.n) assert.ok(/[\u0652\u06E1]/.test(parts.mark), `${ruleId}/${letter}: الحرف المظلَّل ليس ساكناً`);
        }
    }
});

test('أمثلة الحروف تغطي كل حروف الأحكام التي يمكن تعدادها (حروف الكتالوج)', () => {
    const flat = getAllRulesFlat();
    for (const [ruleId, byLetter] of Object.entries(LETTER_EXAMPLES)) {
        const rule = flat.find(x => x.rule.id === ruleId).rule;
        const letters = rule.letters.split(/\s+/).map(strip);
        assert.deepEqual(new Set(Object.keys(byLetter)), new Set(letters), ruleId);
    }
});

test('الأزواج: العبارة موجودة في الآية والحرفان متجاوران فيها', () => {
    for (const [ruleId, pairs] of Object.entries(LETTER_PAIRS)) {
        for (const p of pairs) {
            const text = ayahText(p.s, p.v);
            assert.ok(text, `${ruleId}: لا آية ${p.s}:${p.v}`);
            const phrase = pairPhrase(text, p);
            assert.ok(phrase, `${ruleId}: «${p.h}» غير موجودة في ${p.s}:${p.v}`);
            const letters = [...strip(phrase).replace(/\s+/g, '')].map(base).join('');
            assert.ok(letters.includes(base(p.a) + base(p.b)), `${ruleId}: ${p.a}${p.b} غير متجاورين في «${phrase}»`);
        }
    }
});

test('الأزواج: لا تكرار داخل الحكم الواحد، والمثلان حرفاهما متماثلان فقط', () => {
    for (const [ruleId, pairs] of Object.entries(LETTER_PAIRS)) {
        const keys = pairs.map(p => p.a + p.b);
        assert.equal(new Set(keys).size, keys.length, ruleId);
        pairs.forEach(p => assert.equal(p.a === p.b, ruleId === 'mithlain', `${ruleId}: ${p.a}${p.b}`));
    }
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
