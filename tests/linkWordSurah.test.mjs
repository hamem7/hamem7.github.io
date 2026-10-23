// tests/linkWordSurah.test.mjs
// اختبار «اربط الكلمة بسورتها» على نص القرآن الحقيقي (بلا DOM):  node tests/linkWordSurah.test.mjs
// يتحقق أن كل كلمة/مقطع: (١) صحيح حرفياً من آية في سورته، (٢) لا يرد في أي سورة أخرى من الجولة (إجابة واحدة)،
// (٣) ليس اسم سورة من الخيارات، (٤) لا يكون من الكلمات الشائعة الملتبسة؛ للكبار والصغار ولنطاقات مختلفة.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { QuranEngine, wordKey, wordStem, splitAyahWords, wordIsSurahName, cleanName } from '../engine/quranEngine.js';

const QURAN = JSON.parse(readFileSync(new URL('../database/quran-uthmani.json', import.meta.url), 'utf8')).data.surahs;
const eng = new QuranEngine(null);
eng.getSurah = async (n) => QURAN.find(s => s.number === n);
const poolOf = (from, to) => QURAN.filter(s => s.number >= from && s.number <= to).flatMap(s =>
    s.ayahs.map(a => ({ ...a, surahNumber: s.number, surahName: cleanName(s.name) })));
const surahText = (n) => ' ' + QURAN.find(s => s.number === n).ayahs.map(a => splitAyahWords(a.text).map(wordKey).join(' ')).join(' | ') + ' ';
const occurs = (text, n) => surahText(n).includes(' ' + text.split(/\s+/).map(wordKey).join(' ') + ' ');

let pass = 0, fail = 0;
async function test(name, fn) { try { await fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; process.exitCode = 1; console.log('❌ ' + name + '\n   ' + e.message); } }

const RANGES = { 'جزء عمّ (78-114)': [78, 114], 'الملك-الحاقة': [67, 69], 'الضحى-الناس': [93, 114], 'البقرة-النساء': [2, 4], 'الكهف-الأنبياء': [18, 21] };
const COMMON = ['تحتها', 'والذي', 'الناس'].map(w => wordStem(wordKey(w)));
const seenWords = new Set();

for (const [label, [a, b]] of Object.entries(RANGES)) {
    for (const isKids of [false, true]) {
        await test(`${label} — ${isKids ? 'صغار' : 'كبار'} (60 جولة)`, async () => {
            const pool = poolOf(a, b);
            for (let i = 0; i < 60; i++) {
                const d = await eng.generateLinkWordSurahGame(pool, isKids);
                assert.ok(d, 'لم تُولَّد جولة');
                assert.equal(d.type, isKids ? 'kids_link_word_surah' : 'link_word_surah');
                assert.ok(d.starts.length >= 2 && d.starts.length === d.ends.length);
                const nums = d.starts.map(s => s.id);
                for (const s of d.starts) {
                    seenWords.add(s.text);
                    assert.ok(!COMMON.includes(wordStem(wordKey(s.text))), `كلمة شائعة: ${s.text}`);
                    assert.ok(occurs(s.text, s.id), `«${s.text}» ليست في سورتها ${s.id}`);
                    // النص القرآني بتشكيله كما في المصحف (كلمة/كلمات متتالية من آية)
                    assert.ok(QURAN.find(q => q.number === s.id).ayahs.some(ay => ` ${splitAyahWords(ay.text).join(' ')} `.includes(` ${s.text} `)), `نص غير مطابق للمصحف: ${s.text}`);
                    for (const o of nums.filter(n => n !== s.id)) assert.ok(!occurs(s.text, o), `«${s.text}» ترد أيضاً في السورة ${o} من نفس الجولة`);
                    for (const e of d.ends) assert.ok(!s.text.split(' ').some(w => wordIsSurahName(w, e.text)), `«${s.text}» تكشف اسم ${e.text}`);
                }
                assert.equal(new Set(d.starts.map(s => s.text)).size, d.starts.length);
                assert.equal(new Set(d.ends.map(s => s.text)).size, d.ends.length);
            }
        });
    }
}

await test('الكلمات الثلاث المذكورة لا تُختار أبداً، والمميّزة تُختار فعلاً', async () => {
    const pool = poolOf(1, 114);
    for (let i = 0; i < 40; i++) {
        const d = await eng.generateLinkWordSurahGame(pool, false);
        for (const s of d.starts) assert.ok(!COMMON.includes(wordStem(wordKey(s.text))), s.text);
    }
    console.log('   أمثلة مختارة:', [...seenWords].slice(0, 12).join(' | '));
});

console.log(`\n${pass} passed, ${fail} failed`);
