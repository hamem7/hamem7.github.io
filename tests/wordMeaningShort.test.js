// tests/wordMeaningShort.test.js — معاني الكلمات ≤ 5 كلمات في الواجب: node tests/wordMeaningShort.test.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { shortMeaning, MAX_MEANING_WORDS } from '../engine/quranEngine.js';
import { HomeworkEngine } from '../engine/homeworkEngine.js';

const words = (s) => s.split(/\s+/).filter(Boolean).length;
assert.equal(shortMeaning('الطريق الذي لا عوج فيه؛ وهو الإسلام.'), 'الطريق الذي لا عوج فيه');
assert.equal(shortMeaning('يوم الجزاء والحساب.'), 'يوم الجزاء والحساب');
assert.equal(shortMeaning('كلمة واحدة طويلة جدا بلا فاصل أبدا هنا'), null);

globalThis.fetch = async (u) => ({ ok: true, json: async () => JSON.parse(readFileSync(new URL('../database/data/wordMeanings.json', import.meta.url), 'utf8')) });
const QURAN = JSON.parse(readFileSync(new URL('../database/quran-uthmani.json', import.meta.url), 'utf8')).data.surahs;
const pool = QURAN.find(s => s.number === 2).ayahs.slice(0, 60).map(a => ({ ...a, surahNumber: 2, surahName: 'البقرة' }));
const eng = new HomeworkEngine();
let n = 0;
for (let i = 0; i < 60; i++) {
    const q = await eng.createWordMeaningQuestion(pool[i], pool, {});
    if (!q) continue;
    n++;
    for (const o of q.options) assert.ok(words(o) <= MAX_MEANING_WORDS, o);
}
assert.ok(n > 20, 'يجب أن تتولد أسئلة');
console.log('ok', n);
