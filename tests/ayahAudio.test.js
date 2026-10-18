// tests/ayahAudio.test.js — سؤال «استمع للشيخ… ثم كمّل»: node tests/ayahAudio.test.js
import assert from 'node:assert/strict';
import { ayahAudioUrl, listenHint, listenBodyHTML, LISTEN_MIN_SURAH } from '../engine/ayahAudio.js';
let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; console.log(`✅ ${name}`); } catch (e) { fail++; console.log(`❌ ${name}\n   ${e.message}`); } }
test('رابط الصوت: المنشاوي بصيغة SSSAAA', () => {
  assert.equal(ayahAudioUrl(112, 3), 'https://everyayah.com/data/Minshawy_Murattal_128kbps/112003.mp3');
  assert.equal(ayahAudioUrl(46, 1), 'https://everyayah.com/data/Minshawy_Murattal_128kbps/046001.mp3');
});
test('آخر خمسة أجزاء تبدأ من الأحقاف', () => assert.equal(LISTEN_MIN_SURAH, 46));
test('تلميح أول كلمتين', () => { assert.equal(listenHint('قُلْ هُوَ ٱللَّهُ أَحَدٌ'), 'قُلْ هُوَ …'); assert.equal(listenHint('تبت'), 'تبت'); });
test('جسم السؤال فيه الصوت والزر', () => {
  const h = listenBodyHTML({ url: 'u.mp3', instruction: 'ا', btnLabel: 'ب', btnClass: 'btn' });
  assert.ok(h.includes('<audio src="u.mp3"') && h.includes('playListenAyahAudio(this)') && h.includes('class="btn"'));
});
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
