// components/gameSound.js
// زر "🔊/🔇" في شاشتي اختبار الكبار والصغار: يكتم المؤثرات الصوتية (نجاح/خطأ/تأكيد المطابقة) فقط.
// تلاوة الآيات (لعبة "استمع وخمّن الآية") غير متأثرة. الاختيار يُحفظ على الجهاز بين الجلسات.
import { t } from '../core/app.js';

const KEY = 'darham_sfx_muted';

export function isSfxMuted() {
    try { return localStorage.getItem(KEY) === '1'; } catch (_) { return false; }
}

function setMuted(muted) {
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (_) { /* التخزين غير متاح: يبقى الكتم لهذه الجلسة فقط */ }
}

function render(btn) {
    const key = isSfxMuted() ? 'sfx_unmute_btn' : 'sfx_mute_btn';
    btn.setAttribute('data-i18n', key); // يُحدَّث تلقائياً عند تبديل اللغة
    btn.textContent = t(key);
}

export function initGameSoundToggle() {
    const exitBtn = document.getElementById('btn-exit-game');
    if (!exitBtn) return;
    let btn = document.getElementById('btn-game-sound');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-game-sound';
        btn.className = 'btn btn-outline';
        btn.style.cssText = 'width: 100%; margin-top: 10px; padding: 10px;';
        btn.addEventListener('click', () => { setMuted(!isSfxMuted()); render(btn); });
        exitBtn.after(btn);
    }
    render(btn);
}
