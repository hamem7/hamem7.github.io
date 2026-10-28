// tests/wordMeaningEnglish.test.js — ترجمة معاني الكلمات: node tests/wordMeaningEnglish.test.js
// كل معنى في wordMeanings.json له ترجمة إنجليزية بنفس الترتيب في wordMeanings.en.json، وكل ترجمة ≤ 4 كلمات (بلا حروف عربية).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shortMeaning, loadWordMeaningsEn, meaningEn, distinctInEnglish, MAX_MEANING_WORDS_EN } from '../engine/wordMeaningData.js';

const read = (f) => JSON.parse(readFileSync(new URL('../database/data/' + f, import.meta.url), 'utf8'));
const ar = read('wordMeanings.json'), en = read('wordMeanings.en.json');
const words = (s) => s.split(/\s+/).filter(Boolean).length;

let total = 0;
assert.deepEqual(Object.keys(en), Object.keys(ar), 'نفس السور');
for (const s of Object.keys(ar)) {
    assert.equal(en[s].length, ar[s].length, `سورة ${s}: عدد المعاني يطابق العربي`);
    en[s].forEach((txt, i) => {
        total++;
        assert.equal(typeof txt, 'string', `سورة ${s} #${i}`);
        assert.ok(txt.trim(), `ترجمة فارغة: ${s} #${i} ${ar[s][i][1]}`);
        assert.ok(words(txt) <= MAX_MEANING_WORDS_EN, `أكثر من ${MAX_MEANING_WORDS_EN} كلمات: ${s} #${i} «${txt}»`);
        assert.ok(!/[؀-ۿ]/.test(txt), `حروف عربية في الإنجليزية: ${txt}`);
    });
}
assert.equal(total, 6727);   // السراج أولاً؛ مخلوف فقط لآيات بلا مدخل في السراج

// المحمِّل + البحث بالمعنى العربي (المختصر أو الكامل)
globalThis.fetch = async (u) => ({ ok: true, json: async () => read(String(u).includes('.en.') ? 'wordMeanings.en.json' : 'wordMeanings.json') });
const map = await loadWordMeaningsEn();
assert.ok(map && map.size > 5000, 'الخريطة جاهزة');
assert.equal(meaningEn('يوم الجزاء والحساب.'), 'Day of Judgment');
assert.equal(meaningEn(shortMeaning(ar['1'][5][2])), en['1'][5]);
assert.equal(meaningEn('نص غير موجود'), null);

// المشتتات: لا يظهر خياران متطابقان بالإنجليزية
const e = en['1'][0];
const sameEn = ar['1'].filter((r, i) => en['1'][i] === e).map(r => r[2]);
assert.deepEqual(distinctInEnglish(ar['1'][0][2], [...sameEn, 'نص غير موجود']), ['نص غير موجود']);

console.log('ok', total);
