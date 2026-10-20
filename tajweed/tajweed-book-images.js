// tajweed/tajweed-book-images.js
//
// 🌟 عرض صور كتاب «التجويد المصور» (د. أيمن رشدي سويد) في «أبطال التجويد»: شريط صور داخل درس الحكم،
// ولوحة «مخارج الحروف» الكاملة (الـ17 مخرجاً مع صورها)، ونافذة تكبير بأسهم وتنقّل بلوحة المفاتيح.
// كل عرض يحمل نسبة الكتاب لصاحبه. البيانات في engine/tajweedBookImages.js.
import { t, AppState } from '../core/app.js';
import { BOOK_IMAGES, MAKHARIJ_IMAGES, RULE_BOOK_IMAGES, bookImageUrl } from '../engine/tajweedBookImages.js';
import { buildMakharijLegendHTML } from './tajweed-illustrations-art.js';

const isEn = () => AppState.currentLang === 'en';
const titleOf = (id) => (BOOK_IMAGES[id] ? (isEn() ? BOOK_IMAGES[id].en : BOOK_IMAGES[id].ar) : '');
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// صورة مصغّرة تفتح النافذة؛ إن لم تُحمَّل الصورة تختفي بدل أن تظهر مكسورة
function thumbHTML(ids, i) {
    const id = ids[i];
    return `<button type="button" class="tjw-book-thumb" data-tjw-book="${ids.join(',')}" data-i="${i}" aria-label="${esc(titleOf(id))}">
        <img src="${bookImageUrl(id)}" alt="${esc(titleOf(id))}" loading="lazy" onerror="this.closest('.tjw-book-thumb').remove()"><span>${esc(titleOf(id))}</span></button>`;
}
const creditHTML = () => `<p class="tjw-book-credit">${t('tjw_book_credit')}</p>`;

export function renderBookStripHTML(ruleId) {
    const ids = RULE_BOOK_IMAGES[ruleId];
    if (!ids || !ids.length) return '';
    return `<section class="tjw-book"><h3 class="tjw-section-title">${t('tjw_book_title')}</h3>
        <div class="tjw-book-strip">${ids.map((_, i) => thumbHTML(ids, i)).join('')}</div>${creditHTML()}</section>`;
}

export const makharijButtonHTML = () => `<button class="tjw-link-btn" data-tjw-open-makharij="1">🗺️ ${t('tjw_book_makharij_btn')}</button>`;

function makharijPanelHTML() {
    const legend = buildMakharijLegendHTML(k => t('tjw_mkh_' + k), (n) => {
        const ids = MAKHARIJ_IMAGES[n] || [];
        return ids.length ? `<div class="tjw-mkh-imgs">${ids.map((_, i) => thumbHTML(ids, i)).join('')}</div>` : '';
    });
    return `<div class="tjw-book-overlay" role="dialog" aria-modal="true" aria-label="${esc(t('tjw_book_makharij_title'))}">
        <div class="tjw-book-panel"><button type="button" class="tjw-book-close" data-tjw-book-close="1" aria-label="${esc(t('tjw_book_close'))}">✕</button>
        <h2>${t('tjw_book_makharij_title')}</h2>${creditHTML()}${legend}</div></div>`;
}

// ------------------------------------------------------------
// النوافذ
// ------------------------------------------------------------
let lightbox = null;
function closeLightbox() { if (lightbox) { lightbox.remove(); lightbox = null; } }
function showLightbox(ids, i) {
    closeLightbox();
    let idx = i;
    const el = document.createElement('div');
    el.className = 'tjw-book-overlay tjw-book-lightbox';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    const paint = () => {
        el.innerHTML = `<div class="tjw-book-panel tjw-book-lb"><button type="button" class="tjw-book-close" data-tjw-lb-close="1" aria-label="${esc(t('tjw_book_close'))}">✕</button>
            <img src="${bookImageUrl(ids[idx])}" alt="${esc(titleOf(ids[idx]))}"><h3>${esc(titleOf(ids[idx]))}</h3>${creditHTML()}
            ${ids.length > 1 ? `<div class="tjw-book-nav"><button type="button" class="tjw-outline-btn" data-lb="1">${t('tjw_book_next')}</button><span>${idx + 1} / ${ids.length}</span><button type="button" class="tjw-outline-btn" data-lb="-1">${t('tjw_book_prev')}</button></div>` : ''}</div>`;
    };
    el.addEventListener('click', (e) => {
        if (e.target === el || e.target.closest('[data-tjw-lb-close]')) return closeLightbox();
        const nav = e.target.closest('[data-lb]');
        if (nav) { idx = (idx + Number(nav.dataset.lb) + ids.length) % ids.length; paint(); }
    });
    el.tabIndex = -1;
    el.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeLightbox();
        else if (ids.length > 1 && e.key === 'ArrowLeft') { idx = (idx + 1) % ids.length; paint(); }
        else if (ids.length > 1 && e.key === 'ArrowRight') { idx = (idx - 1 + ids.length) % ids.length; paint(); }
    });
    paint();
    document.body.appendChild(el); el.focus();
    lightbox = el;
}

let panel = null;
function closePanel() { if (panel) { panel.remove(); panel = null; } }

// مرة واحدة لكل صفحة: تفويض النقر على كل ما يخصّ الصور (يعمل لأي شاشة تُدرج الشريط أو الزر)
if (!window.__tjwBookBound) {
    window.__tjwBookBound = true;
    document.addEventListener('click', (e) => {
        const th = e.target.closest && e.target.closest('[data-tjw-book]');
        if (th) { showLightbox(th.dataset.tjwBook.split(','), Number(th.dataset.i) || 0); return; }
        if (e.target.closest && e.target.closest('[data-tjw-open-makharij]')) {
            closePanel();
            const wrap = document.createElement('div'); wrap.innerHTML = makharijPanelHTML();
            panel = wrap.firstElementChild;
            panel.addEventListener('click', (ev) => { if (ev.target === panel || ev.target.closest('[data-tjw-book-close]')) closePanel(); });
            document.body.appendChild(panel);
        }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lightbox) closePanel(); });
}
