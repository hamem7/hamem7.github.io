// components/listenAyahAudio.js
//
// 🎧 [جديد 2026-10-18] مشغّل صوت سؤال «استمع للشيخ… ثم كمّل» (ألعاب الكبار والأطفال). يُستورد بأثر جانبي من adultGame.js وkidsGame.js.
// الزر (من engine/ayahAudio.js: listenBodyHTML) يستدعي window.playListenAyahAudio(this) فيشغّل <audio> الشقيق في نفس الحاوية —
// بلا معرّفات، فيعمل أيضاً حين يُعاد عرض جسم السؤال في «علاج الخطأ». يعيد التشغيل من البداية عند كل ضغطة، ويُنبّه لو تعذّر الصوت.
import { t } from '../core/app.js';

window.playListenAyahAudio = function (btn) {
    const audio = btn && btn.parentElement && btn.parentElement.querySelector('audio');
    if (!audio) return;
    const stop = () => btn.classList.remove('playing');
    audio.onended = stop;
    audio.onpause = stop;
    audio.currentTime = 0;
    btn.classList.add('playing');
    audio.play().catch(() => { stop(); alert(t('kids_listen_audio_error')); });
};
