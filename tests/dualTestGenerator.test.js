// tests/dualTestGenerator.test.js
// اختبارات توليد أسئلة الاختبارات الثنائية بميزان واحد (engine/dualTestEngine.js) على نص القرآن الحقيقي:
//   node tests/dualTestGenerator.test.js
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    SIZE_PRESETS, balanceBounds, isBalancedWords, windowWordCount, windowsOverlap,
    findCandidateWindows, pickWindows, generateBalancedWindows, ayahExcerpt
} from '../engine/dualTestEngine.js';

const SURAHS = JSON.parse(readFileSync(new URL('../database/quran-uthmani.json', import.meta.url), 'utf8')).data.surahs
    .map(s => ({ number: s.number, name: s.name, ayahs: s.ayahs }));
const range = (a, b) => SURAHS.filter(s => s.number >= a && s.number <= b);

let pass = 0, fail = 0;
function test(name, fn) {
    try { fn(); pass++; console.log(`✅ ${name}`); }
    catch (err) { fail++; console.log(`❌ ${name}\n   ${err.message}`); process.exitCode = 1; }
}

test('حدود الهامش: ±10% مع حد أدنى 3 كلمات', () => {
    assert.deepEqual(balanceBounds(60), { lo: 54, hi: 66 });
    assert.deepEqual(balanceBounds(30), { lo: 27, hi: 33 });
    assert.deepEqual(balanceBounds(15), { lo: 12, hi: 18 });
    assert.ok(isBalancedWords(54, 60) && !isBalancedWords(53, 60) && !isBalancedWords(67, 60));
});

for (const [name, target] of Object.entries(SIZE_PRESETS)) {
    test(`كل الأسئلة داخل الميزان وبلا تداخل (${name} = ${target})`, () => {
        const { lo, hi } = balanceBounds(target);
        for (let rep = 0; rep < 20; rep++) {
            for (const [a, b] of [[1, 114], [2, 9], [50, 114]]) {
                const g = generateBalancedWindows(range(a, b), { mainCount: 6, swapCount: 4, targetWords: target });
                const all = [...g.main, ...g.swap];
                assert.equal(all.length + g.shortage, 10);
                all.forEach(w => {
                    const words = windowWordCount(SURAHS[w.surah - 1], w.from, w.to);
                    assert.equal(words, w.words);
                    assert.ok(words >= lo && words <= hi, `${words} خارج [${lo},${hi}]`);
                });
                for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) assert.ok(!windowsOverlap(all[i], all[j]));
            }
        }
    });
}

test('عدد الأساسية والاستبدال كما طُلب، والأساسية مرتبة بموضعها', () => {
    const g = generateBalancedWindows(range(2, 4), { mainCount: 5, swapCount: 2, targetWords: 60 });
    assert.equal(g.main.length, 5); assert.equal(g.swap.length, 2); assert.equal(g.shortage, 0);
    for (let i = 1; i < g.main.length; i++) assert.ok(g.main[i - 1].surah < g.main[i].surah || (g.main[i - 1].surah === g.main[i].surah && g.main[i - 1].from < g.main[i].from));
});

test('المناطق المشغولة تُتجنَّب', () => {
    const cands = findCandidateWindows(range(2, 2), 60);
    const occupied = [{ surah: 2, from: 1, to: 150 }];
    const { picked } = pickWindows(cands, 5, occupied);
    picked.forEach(w => assert.ok(!windowsOverlap(w, occupied[0])));
});

test('نطاق ضيق جداً يُبلِغ عن النقص بدل أن يخالف الميزان', () => {
    const g = generateBalancedWindows(range(114, 114), { mainCount: 3, swapCount: 1, targetWords: 100 });
    assert.equal(g.main.length + g.swap.length, 0);
    assert.equal(g.shortage, 4);
});

test('مقتطف الآية: كاملة إن قصرت، وإلا 6 كلمات من الطرف مع «…» ولا رقم', () => {
    const ayahs = SURAHS[1].ayahs; // البقرة
    const long = ayahs.find(a => a.numberInSurah === 282).text;
    const st = ayahExcerpt(long, 'start'), en = ayahExcerpt(long, 'end');
    assert.ok(st.endsWith('…') && en.startsWith('…'));
    assert.ok(!/\d/.test(st + en));
    assert.ok(long.includes(st.replace(' …', '').split(' ')[0]));
    assert.ok(long.trim().endsWith(en.replace('… ', '').split(' ').slice(-1)[0]));
    assert.equal(st.replace(' …', '').split(' ').length >= 6, true);
    const short = SURAHS[0].ayahs[1].text; // الحمد لله رب العالمين
    assert.ok(!ayahExcerpt(short, 'start').includes('…'));
});
console.log(`\n${pass} passed, ${fail} failed`);
