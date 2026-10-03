// components/gameFullscreen.js
// 🌟 [جديد 2026-10-03] زر "⛶ ملء الشاشة" لشاشة الاختبار (كبار/أطفال) — للعرض أمام الطلاب على الكمبيوتر.
// يقيس ارتفاع الترويسة (--dh-game-header-h) لتملأ اللوحة باقي الشاشة بالضبط، ويُخفي الترويسة ويطلب
// ملء الشاشة من المتصفح عند الضغط. الخروج (Esc أو الزر نفسه أو مغادرة الشاشة) يعيد كل شيء كما كان.
// راجع css/gameFullscreen.css
import { t } from '../core/app.js';

const isGameScreen = () => /Game\.html$/.test(document.body.dataset.dhScreen || '');

function measureHeader() {
    const h = document.getElementById('main-header');
    const px = h && document.body.dataset.gameFs !== '1' ? h.offsetHeight : 0;
    document.documentElement.style.setProperty('--dh-game-header-h', px + 'px');
}

function setFs(on) {
    if (on) document.body.dataset.gameFs = '1';
    else delete document.body.dataset.gameFs;
    const btn = document.getElementById('btn-game-fullscreen');
    if (btn) {
        const key = on ? 'game_fs_exit' : 'game_fs_enter';
        btn.setAttribute('data-i18n', key); // يُحدَّث تلقائياً عند تبديل اللغة (applyLanguage)
        btn.textContent = t(key);
    }
    measureHeader();
}

async function toggle() {
    const on = document.body.dataset.gameFs !== '1';
    if (on) {
        setFs(true);
        try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.(); } catch (_) { /* إخفاء الترويسة وحده يكفي */ }
    } else {
        setFs(false);
        try { if (document.fullscreenElement) await document.exitFullscreen(); } catch (_) {}
    }
}

export function initGameFullscreen() {
    const exitBtn = document.getElementById('btn-exit-game');
    if (exitBtn && !document.getElementById('btn-game-fullscreen')) {
        const btn = document.createElement('button');
        btn.id = 'btn-game-fullscreen';
        btn.className = 'btn btn-outline game-fs-btn';
        btn.addEventListener('click', toggle);
        exitBtn.after(btn);
    }
    setFs(document.body.dataset.gameFs === '1' && !!document.fullscreenElement);
}

// Esc من المتصفح يُنهي ملء الشاشة → نعيد الترويسة
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.dataset.gameFs === '1') setFs(false);
});
// مغادرة شاشة الاختبار (تقرير/لوحة) → خروج من ملء الشاشة
document.addEventListener('dh:screen', () => {
    if (isGameScreen()) return;
    delete document.body.dataset.gameQ;
    if (document.body.dataset.gameFs === '1') {
        delete document.body.dataset.gameFs;
        if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    }
});
window.addEventListener('resize', () => { if (isGameScreen()) measureHeader(); });
