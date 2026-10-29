// core/applauseSound.js
// ==========================================
// 👏 تصفيق الدرجة الكاملة: يُشغَّل ملف assets/sounds/applause.mp3 عندما يحصل أي طالب على 100%
// في تقرير المسابقة الفردية أو الثنائية. مرة واحدة لكل تقرير (المفتاح = معرّف التقرير)، ويتوقف
// فور مغادرة شاشة التقرير. الكتم يُحفظ في localStorage.dh_applause = 'off'. ملف خالص بلا استيراد.
// ==========================================

const SRC = 'assets/sounds/applause.mp3';
const MUTE_KEY = 'dh_applause';
const VOLUME = 0.7;
const FADE_MS = 600;

let audio = null;
let watcher = null;
const played = new Set();

export function isApplauseMuted() {
    try { return localStorage.getItem(MUTE_KEY) === 'off'; } catch (e) { return false; }
}

export function setApplauseMuted(muted) {
    try { localStorage.setItem(MUTE_KEY, muted ? 'off' : 'on'); } catch (e) { /* تجاهل */ }
    if (muted) stopApplause();
}

export function stopApplause() {
    if (watcher) { clearInterval(watcher); watcher = null; }
    if (!audio) return;
    const a = audio;
    audio = null;
    try {
        const step = a.volume / 6;
        const fade = setInterval(() => {
            if (a.volume - step <= 0.01) { clearInterval(fade); a.pause(); return; }
            a.volume = Math.max(0, a.volume - step);
        }, FADE_MS / 6);
    } catch (e) { try { a.pause(); } catch (e2) { /* تجاهل */ } }
}

// reportKey: معرّف التقرير لمنع التكرار عند إعادة الرسم (تبديل اللغة مثلاً)
// pageId: عنصر صفحة التقرير؛ إن اختفى من الصفحة يتوقف الصوت
export function playApplauseOnce(reportKey, pageId) {
    if (isApplauseMuted() || played.has(reportKey)) return;
    played.add(reportKey);
    try {
        stopApplause();
        audio = new Audio(SRC);
        audio.volume = VOLUME;
        const p = audio.play();
        if (p && p.catch) p.catch(() => { /* منع التشغيل التلقائي: لا نكسر التقرير */ });
        watcher = setInterval(() => {
            if (!document.getElementById(pageId)) stopApplause();
        }, 500);
        audio.addEventListener('ended', () => { if (watcher) { clearInterval(watcher); watcher = null; } });
    } catch (e) { /* best-effort */ }
}
