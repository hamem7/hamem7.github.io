// tests/listenEngine.test.js — لعبة «استمع للشيخ… ثم كمّل»: node tests/listenEngine.test.js
import assert from 'node:assert/strict';
import { ayahAudioUrl, studentSurahs, customSurahs, allCandidates, buildRound, retryRound, hintOf, summarize } from '../engine/listenEngine.js';

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; console.log(`✅ ${name}`); } catch (e) { fail++; console.log(`❌ ${name}\n   ${e.message}`); } }

const COUNTS = { 114: 6, 113: 5, 112: 4, 111: 5, 110: 3, 109: 6, 108: 3, 107: 7, 106: 4, 105: 5 };
const surahsData = Object.entries(COUNTS).map(([n, c]) => ({ number: +n, name: 'س' + n, ayahsCount: c }));
surahsData.push({ number: 1, name: 'الفاتحة', ayahsCount: 7 });
const NAMES = { 114: 'الناس', 105: 'الفيل' };
const sd = surahsData.map(s => ({ ...s, name: NAMES[s.number] || s.name }));

test('رابط الصوت: المنشاوي بصيغة SSSAAA', () => {
  assert.equal(ayahAudioUrl(1, 1), 'https://everyayah.com/data/Minshawy_Murattal_128kbps/001001.mp3');
  assert.equal(ayahAudioUrl(114, 6), 'https://everyayah.com/data/Minshawy_Murattal_128kbps/114006.mp3');
  assert.equal(ayahAudioUrl(2, 255), 'https://everyayah.com/data/Minshawy_Murattal_128kbps/002255.mp3');
});
test('نطاق الطالب: الناس ← الفيل = 105..114', () => {
  const r = studentSurahs(sd, { memoFrom: 'الناس', memoTo: 'الفيل' });
  assert.ok(r.ok); assert.deepEqual(r.surahs, [105, 106, 107, 108, 109, 110, 111, 112, 113, 114]);
});
test('نطاق الطالب: غير صالح (معكوس/ناقص) يُرفض مع سبب', () => {
  assert.equal(studentSurahs(sd, { memoFrom: 'الفيل', memoTo: 'الناس' }).ok, false);
  assert.equal(studentSurahs(sd, {}).ok, false);
});
test('الحصر في آخر خمسة أجزاء: نطاق مخصّص وطالب يتجاوزان 46 يُقصّان', () => {
  assert.deepEqual(customSurahs(2, 47), [46, 47]);
  assert.equal(customSurahs(2, 10).length, 0);
  const wide = Array.from({ length: 114 }, (_, i) => ({ number: i + 1, name: 'س' + (i + 1), ayahsCount: 5 }));
  wide[113].name = 'الناس'; wide[1].name = 'البقرة'; wide[104].name = 'الفيل';
  assert.equal(studentSurahs(wide, { memoFrom: 'الناس', memoTo: 'البقرة' }).surahs[0], 46);
});
test('نطاق مخصّص بأي ترتيب', () => { assert.deepEqual(customSurahs(112, 110), [110, 111, 112]); });
test('«بعدها»: لا سؤال على آخر آية، والجواب آية+1 في نفس السورة', () => {
  const c = allCandidates(sd, [112], 'next');
  assert.equal(c.length, 3);
  assert.ok(c.every(q => q.answer === q.ayah + 1 && q.ayah < 4));
});
test('«قبلها»: لا سؤال على الآية الأولى، والجواب آية-1', () => {
  const c = allCandidates(sd, [112], 'prev');
  assert.equal(c.length, 3);
  assert.ok(c.every(q => q.answer === q.ayah - 1 && q.ayah > 1));
});
test('سورة آياتها قليلة (النصر 3) تعطي آيتين لكل اتجاه', () => {
  assert.equal(allCandidates(sd, [110], 'mixed').length, 4);
});
test('الجولة: بلا تكرار لنفس الآية المسموعة وبحد count', () => {
  const r = buildRound(sd, customSurahs(105, 114), { mode: 'mixed', count: 15 });
  assert.equal(r.length, 15);
  assert.equal(new Set(r.map(q => q.surah + ':' + q.ayah)).size, 15);
  assert.ok(r.some(q => q.dir === 'next') && r.some(q => q.dir === 'prev'));
});
test('الجولة: لو النطاق أصغر من count تُرجع المتاح فقط', () => {
  const r = buildRound(sd, [110], { mode: 'next', count: 20 });
  assert.equal(r.length, 2);
});
test('جولة المراجعة تحتفظ بنفس الأسئلة', () => {
  const m = [{ surah: 112, ayah: 2, answer: 3, dir: 'next', ok: false }];
  assert.deepEqual(retryRound(m), [{ surah: 112, ayah: 2, answer: 3, dir: 'next' }]);
});
test('تلميح أول كلمتين', () => { assert.equal(hintOf('قُلْ هُوَ ٱللَّهُ أَحَدٌ'), 'قُلْ هُوَ …'); assert.equal(hintOf('تبت'), 'تبت'); });
test('النتيجة والنجوم', () => {
  const mk = (n, c) => Array.from({ length: n }, (_, i) => ({ ok: i < c }));
  assert.equal(summarize(mk(10, 10)).stars, 3); assert.equal(summarize(mk(10, 7)).stars, 2);
  assert.equal(summarize(mk(10, 4)).stars, 1); assert.equal(summarize(mk(10, 1)).stars, 0);
  assert.equal(summarize([]).pct, 0);
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
