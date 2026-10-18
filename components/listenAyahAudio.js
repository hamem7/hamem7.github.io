// components/listenAyahAudio.js
//
// 🎧 [2026-10-18] مشغّل صوت الآية الموحَّد (الشيخ المنشاوي) لسؤالَي «استمع وكمّل» و«استمع وخمّن الآية». يُستورد بأثر جانبي
// من adultGame.js وkidsGame.js. الزر (من engine/ayahAudio.js: listenBodyHTML) يستدعي window.playListenAyahAudio(this)
// ويحمل رقم الآية في data-n/data-s/data-a، والمشغّل يبحث عن <audio> الشقيق (بلا معرّفات، فيعمل في «علاج الخطأ» أيضاً).
// الترتيب: ① النسخة المخزَّنة محلياً (تعمل بلا إنترنت) ② البث المباشر مع تجريب المصادر بالترتيب (الأخف أولاً) ثم تخزين الملف
// في الخلفية للمرة القادمة (إن سمح المصدر بذلك). لو فشلت كل المصادر ينبَّه المستخدم.
import { AppState, t } from '../core/app.js';
import { ayahAudioSources } from '../engine/ayahAudio.js';

async function cachedUrl(audio, n) {
    if (!n || !AppState.kidsAudioManager) return null;
    try {
        const blob = await AppState.kidsAudioManager.getAudio(n);
        if (!blob) return null;
        // object URL واحد لكل آية (لا يُعاد بناؤه مع كل ضغطة)
        if (audio.dataset.cachedFor !== String(n)) { audio.src = URL.createObjectURL(blob); audio.dataset.cachedFor = String(n); }
        return audio.src;
    } catch (e) { return null; }
}

window.playListenAyahAudio = async function (btn) {
    const audio = btn && btn.parentElement && btn.parentElement.querySelector('audio');
    if (!audio) return;
    const n = Number(btn.dataset.n) || 0, s = Number(btn.dataset.s), a = Number(btn.dataset.a);
    const stop = () => btn.classList.remove('playing');
    const fail = () => { stop(); alert(t('kids_listen_audio_error')); };
    audio.onended = stop;
    audio.onpause = stop;
    btn.classList.add('playing');

    // ① مخزَّن محلياً
    if (await cachedUrl(audio, n)) {
        audio.currentTime = 0;
        audio.play().catch(fail);
        return;
    }
    // ② بث مباشر: نجرّب المصادر بالترتيب؛ عند أول نجاح نخزّن الملف بصمت
    const sources = ayahAudioSources(n, s, a);
    let i = 0;
    const tryNext = () => {
        if (i >= sources.length) return fail();
        audio.src = sources[i++];
        audio.currentTime = 0;
        audio.play().catch(() => { /* الخطأ يصل عبر onerror أدناه */ });
    };
    audio.onerror = tryNext;
    audio.onplaying = () => {
        audio.onerror = null;
        if (n && AppState.kidsAudioManager) AppState.kidsAudioManager.cacheAyah({ number: n, surahNumber: s, numberInSurah: a }).catch(() => {});
    };
    tryNext();
};

// 🌟 توافق مع أسئلة «استمع وخمّن الآية» المحفوظة قبل التوحيد في «علاج الخطأ» (جسمها القديم: <audio id=kids-listen-audio-player src=…> وزر ينادي هذه الدالة)
window.playKidsListenAyahAudio = function () {
    const audio = document.getElementById('kids-listen-audio-player');
    if (audio) { audio.currentTime = 0; audio.play().catch(() => alert(t('kids_listen_audio_error'))); }
};
