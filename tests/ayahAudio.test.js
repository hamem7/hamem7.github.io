// tests/ayahAudio.test.js — سؤال «استمع للشيخ… ثم كمّل»: node tests/ayahAudio.test.js
import assert from 'node:assert/strict';
import { ayahAudioUrl, ayahAudioSources, listenHint, listenBodyHTML, LISTEN_MIN_SURAH } from '../engine/ayahAudio.js';
let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; console.log(`✅ ${name}`); } catch (e) { fail++; console.log(`❌ ${name}\n   ${e.message}`); } }
test('رابط الصوت: المنشاوي بصيغة SSSAAA', () => {
  assert.equal(ayahAudioUrl(112, 3), 'https://everyayah.com/data/Minshawy_Murattal_128kbps/112003.mp3');
  assert.equal(ayahAudioUrl(46, 1), 'https://everyayah.com/data/Minshawy_Murattal_128kbps/046001.mp3');
});
test('آخر خمسة أجزاء تبدأ من الأحقاف', () => assert.equal(LISTEN_MIN_SURAH, 46));
test('تلميح أول كلمتين', () => { assert.equal(listenHint('قُلْ هُوَ ٱللَّهُ أَحَدٌ'), 'قُلْ هُوَ …'); assert.equal(listenHint('تبت'), 'تبت'); });
test('مصادر الصوت مرتّبة: cdn 64 ثم cdn 128 ثم everyayah، بالمنشاوي', () => {
  const l = ayahAudioSources(6236, 114, 6);
  assert.deepEqual(l, ['https://cdn.islamic.network/quran/audio/64/ar.minshawi/6236.mp3', 'https://cdn.islamic.network/quran/audio/128/ar.minshawi/6236.mp3', 'https://everyayah.com/data/Minshawy_Murattal_128kbps/114006.mp3']);
  assert.equal(ayahAudioSources(0, 112, 3).length, 1);
});
test('جسم السؤال: زر ببيانات الآية وعنصر صوت بلا مصدر ثابت', () => {
  const h = listenBodyHTML({ ayah: { number: 6236, surahNumber: 114, numberInSurah: 6 }, instruction: 'ا', btnLabel: 'ب', btnClass: 'btn' });
  assert.ok(h.includes('<audio preload="none"></audio>') && h.includes('data-n="6236" data-s="114" data-a="6"') && h.includes('playListenAyahAudio(this)') && h.includes('class="btn"'));
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
