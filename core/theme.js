// core/theme.js — زر تبديل المظهر في الترويسة (#theme-toggle-btn): تلقائي ← فاتح ← داكن. المنطق الأساسي في core/themeInit.js.
import { tl } from './langBridge.js';

const ICONS = {
    auto: '<path d="M12 3a9 9 0 1 0 0 18V3z" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="9"/>',
    light: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    dark: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'
};

// أزرار المظهر: زر الترويسة، وزر بطاقة الشاشة الرئيسية (الترويسة مخفية هناك — components/homeFast.js)
const BTN_SELECTOR = '#theme-toggle-btn, #dh-fast-theme';

export function refreshThemeButton() {
    const api = window.DHTheme;
    if (!api) return;
    const pref = api.get();
    const label = pref === 'light' ? tl('theme_light', 'المظهر: فاتح')
        : pref === 'dark' ? tl('theme_dark', 'المظهر: داكن')
        : tl('theme_auto', 'المظهر: تلقائي (حسب الجهاز)');
    const hint = tl('theme_toggle_hint', 'اضغط للتبديل');
    document.querySelectorAll(BTN_SELECTOR).forEach(btn => {
        btn.setAttribute('data-mode', pref);
        btn.title = label + ' — ' + hint;
        btn.setAttribute('aria-label', label);
        const svg = btn.querySelector('svg');
        if (svg) svg.innerHTML = ICONS[pref] || ICONS.auto;
    });
}

// يربط زراً (يُنشأ ديناميكياً أيضاً) بدورة المظهر؛ يُستدعى مرة لكل زر
export function bindThemeButton(btn) {
    if (!btn || btn.dataset.dhBound) return;
    btn.dataset.dhBound = '1';
    btn.addEventListener('click', () => window.DHTheme?.cycle());
    refreshThemeButton();
}

export function initThemeToggle() {
    bindThemeButton(document.getElementById('theme-toggle-btn'));
    // تغيّر المظهر (من أي زر أو من إعداد الجهاز) أو اللغة: نحدّث أيقونة وعنوان كل الأزرار
    document.addEventListener('app-theme-changed', refreshThemeButton);
    document.addEventListener('app-lang-changed', refreshThemeButton);
    refreshThemeButton();
}
