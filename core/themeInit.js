// core/themeInit.js — يُحمَّل كسكربت عادي في <head> قبل أي تنسيق ليضبط مظهر المنصة (فاتح/داكن) قبل أول رسم فلا يحدث وميض.
// التفضيل المحفوظ (dh_theme): 'auto' (يتبع إعداد الجهاز — الافتراضي) أو 'light' أو 'dark'.
// النتيجة الفعلية تُكتب على <html data-theme="light|dark"> وتعتمد عليها css/theme-dark.css. الأزرار والواجهة في core/theme.js.
(function () {
    var KEY = 'dh_theme';
    var mq = null;
    try { mq = window.matchMedia('(prefers-color-scheme: dark)'); } catch (e) { /* بلا دعم */ }

    function pref() {
        try { var v = localStorage.getItem(KEY); if (v === 'light' || v === 'dark' || v === 'auto') return v; } catch (e) { /* التخزين محجوب */ }
        return 'auto';
    }
    function resolve(p) { return p === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : p; }
    function apply() {
        var p = pref(), r = resolve(p), de = document.documentElement;
        de.setAttribute('data-theme', r);
        de.setAttribute('data-theme-pref', p);
        de.style.colorScheme = r;
    }
    function set(p) {
        if (p !== 'light' && p !== 'dark' && p !== 'auto') p = 'auto';
        try { localStorage.setItem(KEY, p); } catch (e) { /* غير حرِج */ }
        apply();
        try { document.dispatchEvent(new CustomEvent('app-theme-changed', { detail: { pref: p, theme: resolve(p) } })); } catch (e) { /* غير حرِج */ }
    }

    apply();
    // «تلقائي»: تتبّع تغيّر إعداد الجهاز مباشرة (مثلاً الوضع الليلي المجدول)
    if (mq) {
        var onChange = function () { if (pref() === 'auto') apply(); };
        if (mq.addEventListener) mq.addEventListener('change', onChange); else if (mq.addListener) mq.addListener(onChange);
    }
    window.DHTheme = { get: pref, resolved: function () { return resolve(pref()); }, set: set, cycle: function () { var o = ['auto', 'light', 'dark']; set(o[(o.indexOf(pref()) + 1) % 3]); } };
})();
