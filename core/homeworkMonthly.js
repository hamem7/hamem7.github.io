// core/homeworkMonthly.js
// ==========================================================
// 🌙 يطبّق ثيمة الواجب الشهرية (هجرية) على شاشات الطالب: الترحيب والحل ونافذة الإنجاز.
// البيانات والمنطق النقي في config/monthly-themes.js؛ هذا الملف يضيف عناصر DOM (صورة الشهر، زخرفة، شارة، وسام)
// ويضبط متغيرات الألوان --hm-* (فاتح/داكن) على جذر الشاشة، وتنسيقها في css/homework-monthly.css.
// أي خلل هنا لا يجوز أن يمنع الواجب: كل الدوال المُصدَّرة محاطة بـ try/catch وتتجاهل الفشل (تبقى الشاشة بمظهرها العادي).
// ==========================================================
import { AppState } from './app.js';
import { activeMonth, getTheme, themeColors, assetUrl, encouragement, FLAGS, COLOR_KEYS } from '../config/monthly-themes.js';

let cssLoaded = false;
const lang = () => (AppState.currentLang === 'en' ? 'en' : 'ar');
const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark';

function ensureCss() {
    if (cssLoaded || document.getElementById('hm-css')) { cssLoaded = true; return; }
    cssLoaded = true;
    const l = document.createElement('link');
    l.id = 'hm-css'; l.rel = 'stylesheet'; l.href = new URL('../css/homework-monthly.css', import.meta.url).href;
    document.head.appendChild(l);
}

export function currentTheme() {
    try { const n = activeMonth(); return n ? getTheme(n) : null; } catch (e) { return null; }
}

function paintVars(el, th) {
    const c = themeColors(th, isDark());
    COLOR_KEYS.forEach(k => el.style.setProperty('--hm-' + k, c[k]));
    const u = k => 'url("' + assetUrl(th.n, k) + '")';
    el.style.setProperty('--hm-hero-url', u('hero'));
    el.style.setProperty('--hm-strip-url', u(FLAGS.STRIP[th.n] ? 'strip' : 'hero'));
    el.style.setProperty('--hm-medal-url', u(FLAGS.MEDALP[th.n] ? 'medal' : 'hero'));
    if (FLAGS.MEDAL_IMG[th.n]) el.style.setProperty('--hm-mascot-url', u('medal'));
}

// يضبط المتغيرات ويتابع تبديل المظهر (فاتح/داكن) طالما العنصر في الصفحة
function activate(el, th) {
    ensureCss();
    el.setAttribute('data-hm', String(th.n));
    if (FLAGS.PROG && FLAGS.PROG[th.n]) el.setAttribute('data-hm-prog', FLAGS.PROG[th.n]);
    paintVars(el, th);
    const mo = new MutationObserver(() => { if (!el.isConnected) { mo.disconnect(); return; } paintVars(el, th); });
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

function cornerImg(n, side) {
    const o = FLAGS.ORI[n]; if (!o) return null;
    let sx = o.includes('r') ? -1 : 1; const sy = o.includes('b') ? -1 : 1; if (side === 'r') sx = -sx;
    const img = document.createElement('img');
    img.className = 'hm-orn ' + side; img.alt = ''; img.src = assetUrl(n, 'corner'); img.style.transform = 'scale(' + sx + ',' + sy + ')';
    img.onerror = () => img.remove();
    return img;
}

function onLang(fn, root) {
    const h = () => { if (!root.isConnected) { document.removeEventListener('app-lang-changed', h); return; } try { fn(); } catch (e) { /* لا شيء */ } };
    document.addEventListener('app-lang-changed', h);
}

// ---------- شاشة الترحيب ----------
export function decorateWelcome() {
    try {
        const th = currentTheme(); const root = document.querySelector('.hww-screen'); if (!th || !root) return;
        const card = root.querySelector('.hww-card'); if (!card || card.querySelector('.hm-hero')) return;
        activate(root, th);
        const hero = document.createElement('div'); hero.className = 'hm-hero'; hero.setAttribute('role', 'img');
        card.insertBefore(hero, card.firstChild);
        ['l', 'r'].forEach(s => { const c = cornerImg(th.n, s); if (c) card.insertBefore(c, hero.nextSibling); });
        let cap = null;
        if (th.ar.cap) { cap = document.createElement('div'); cap.className = 'hm-cap'; hero.appendChild(cap); }
        const title = card.querySelector('.hww-title'), sub = card.querySelector('.hww-sub');
        const badge = document.createElement('div'); badge.className = 'hm-badge';
        const thumb = document.createElement('span'); thumb.className = 'hm-thumb'; const bt = document.createElement('span'); badge.append(thumb, bt);
        if (title) title.parentNode.insertBefore(badge, title);
        [title, sub].forEach(el => { if (el) el.removeAttribute('data-i18n'); });   // نصوص الشهر لا يستبدلها المترجم
        const paint = () => {
            const x = th[lang()];
            hero.setAttribute('aria-label', x.name);
            if (cap) cap.textContent = x.cap;
            bt.textContent = x.badge; if (title) title.textContent = x.title; if (sub) sub.textContent = x.sub;
        };
        paint(); onLang(paint, root);
    } catch (e) { /* الشاشة تعمل بلا ثيمة */ }
}

// ---------- شاشة الحل ----------
export function decoratePlay() {
    try {
        const th = currentTheme(); const root = document.querySelector('.hp-screen'); if (!th || !root) return;
        const head = root.querySelector('#hp-head'); if (!head || head.querySelector('.hm-strip')) return;
        activate(root, th);
        const strip = document.createElement('div'); strip.className = 'hm-strip'; head.insertBefore(strip, head.firstChild);
        const eye = head.querySelector('.hp-eyebrow');
        let bt = null;
        if (eye) {
            eye.removeAttribute('data-i18n'); eye.textContent = '';
            const thumb = document.createElement('span'); thumb.className = 'hm-thumb'; bt = document.createElement('span'); eye.append(thumb, bt);
        }
        const paint = () => { if (bt) bt.textContent = th[lang()].badge; };
        paint(); onLang(paint, root);
    } catch (e) { /* الشاشة تعمل بلا ثيمة */ }
}

// عبارة تشجيع الشهر لعدد المجاب؛ null = استعمل العبارة الافتراضية
export function monthlyEncouragement(n, total) {
    try { const th = currentTheme(); return th ? encouragement(th, lang(), n, total) : null; } catch (e) { return null; }
}

// ---------- نافذة الإنجاز (آخر صفحة) ----------
// يُستدعى من renderSubmissionStatus: عند التأكيد الحقيقي من الخادم فقط تظهر مكافأة الشهر؛ في بقية الحالات تُزال.
export function renderResultExtras(confirmed) {
    try {
        const modal = document.getElementById('hp-result-modal'); if (!modal) return;
        const icon = document.getElementById('hp-result-icon');
        const card = modal.querySelector('.hp-modal-card');
        card.querySelectorAll('.hm-result, .hm-logo-end').forEach(e => e.remove());
        const th = currentTheme();
        if (!th || !confirmed) { if (icon) icon.style.display = ''; return; }
        activate(modal, th);
        const x = th[lang()], box = document.createElement('div'); box.className = 'hm-result';
        const add = (el) => { if (el) box.appendChild(el); return el; };
        if (FLAGS.DECO[th.n]) { const d = document.createElement('img'); d.className = 'hm-deco'; d.alt = ''; d.src = assetUrl(th.n, 'deco'); d.onerror = () => d.remove(); add(d); }
        if (FLAGS.MEDAL_IMG[th.n]) { const m = document.createElement('img'); m.className = 'hm-medal-img'; m.alt = x.medal; m.src = assetUrl(th.n, 'medal'); add(m); }
        else { const m = document.createElement('div'); m.className = 'hm-medal'; m.setAttribute('role', 'img'); m.setAttribute('aria-label', x.medal); const g = document.createElement('b'); g.textContent = th.glyph; m.appendChild(g); add(m); }
        const lab = document.createElement('span'); lab.className = 'hm-medal-label'; lab.textContent = x.medal; add(lab);
        if (x.quote) { const q = document.createElement('p'); q.className = 'hm-quote'; q.textContent = x.quote; add(q); }
        const done = document.createElement('p'); done.className = 'hm-done'; done.textContent = x.done; add(done);
        if (icon) icon.style.display = 'none';
        const score = document.getElementById('hp-result-score');
        if (score) score.parentNode.insertBefore(box, score.nextSibling); else card.insertBefore(box, card.firstChild);
        if (FLAGS.LOGO_END[th.n]) {
            const l = document.createElement('img'); l.className = 'hm-logo-end'; l.alt = x.name; l.src = assetUrl(th.n, 'logo'); l.onerror = () => l.remove();
            card.appendChild(l);
        }
    } catch (e) { /* لا شيء */ }
}
