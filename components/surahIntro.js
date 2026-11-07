// components/surahIntro.js — 📖 شاشة «تعرّف على السورة» (كل سور القرآن، مع تبويب بالأجزاء 1–30).
// قائمة السور (تبويبات الأجزاء + بحث) ← بطاقة السورة للعرض على الطلاب (ملخّص مبسّط + معنى الاسم + رسالة السورة + الأسماء
// + البطاقة الصوتية والفيديو) مع التنقل للسابقة/التالية وتكبير الخط. البيانات في components/surahIntroData.js.
import { t, tf, surahNameLocal, isEnglish } from '../core/i18n.js';
import { SURAH_INTRO } from './surahIntroData.js';
import { surahCardUrls } from '../engine/surahCards.js';
import { loadScreen, switchTheme } from '../core/navigation.js';

// فتح الشاشة (يُستدعى من onclick زر الرئيسية مباشرة)؛ الرجوع يستورد الرئيسية عند الحاجة فقط
export function openSurahIntro() {
    switchTheme('adult');
    document.body.style.backgroundImage = '';
    return loadScreen({
        templateUrl: 'components/surah-intro-screen.html',
        initFunction: () => initSurahIntro({ onBack: () => import('../core/app.js').then(m => m.loadSplashScreen()) })
    });
}

const JUZ = Array.from({ length: 30 }, (_, i) => i + 1);
const inJuz = (s, j) => s.j[0] <= j && j <= s.j[1];
const juzLabel = s => s.j[0] === s.j[1] ? s.j[0] : `${s.j[0]}–${s.j[1]}`;
const st = { juz: 30, q: '', cur: null, fs: 1.15 };
let onBack = null;
// إعادة البناء عند تبديل اللغة (والشاشة مفتوحة فقط)
document.addEventListener('app-lang-changed', () => { if (document.getElementById('si-screen')) render(); });

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
// أي نص قرآني بين ﴿ ﴾ يُلفّ بعنصر يحمل .quran-text بنفسه (قاعدة الخط القرآني)
const withQuran = s => esc(s).replace(/﴿[^﴾]*﴾/g, m => `<span class="quran-text">${m}</span>`);
const norm = s => String(s).replace(/[ً-ْٰـ]/g, '').replace(/[أإآ]/g, 'ا').toLowerCase();
const body = () => document.getElementById('si-body');

export function initSurahIntro(opts = {}) {
    onBack = opts.onBack || null;
    st.cur = null;
    const back = document.getElementById('btn-back-surah-intro');
    back?.setAttribute('aria-label', t('ms_back'));
    back?.setAttribute('title', t('ms_back'));
    back?.addEventListener('click', () => { if (st.cur) { st.cur = null; render(); } else if (onBack) onBack(); });
    render();
}

function render() {
    const root = document.getElementById('si-screen');
    if (!root || !body()) return;
    root.style.setProperty('--si-fs', st.fs + 'rem');
    st.cur ? renderCard() : renderList();
}

function renderList() {
    const q = norm(st.q.trim());
    const list = SURAH_INTRO.filter(s => q
        ? norm(surahNameLocal(s.n)).includes(q) || String(s.n) === q
        : inJuz(s, st.juz));
    body().innerHTML = `
        <div class="si-tools si-juz-row" role="tablist">
            ${JUZ.map(j => `<button type="button" class="si-tab${!q && j === st.juz ? ' is-on' : ''}" data-juz="${j}" role="tab" aria-selected="${!q && j === st.juz}" title="${esc(tf('si_juz', { n: j }))}">${j}</button>`).join('')}
        </div>
        <div class="si-tools" style="margin-top:10px">
            <span class="si-juz-now">${esc(q ? '' : tf('si_juz', { n: st.juz }))}</span>
            <input type="search" class="si-search" id="si-q" value="${esc(st.q)}" placeholder="${esc(t('si_search'))}" aria-label="${esc(t('si_search'))}">
        </div>
        <div class="si-grid" style="margin-top:12px">
            ${list.map(s => `<button type="button" class="si-tile" data-n="${s.n}">
                <span class="si-tile-ic" aria-hidden="true">${s.ic}</span>
                <span class="si-tile-name">${esc(surahNameLocal(s.n))}</span>
                <span class="si-tile-meta">${esc(tf('si_num', { n: s.n }))} · ${esc(tf('si_ayahs', { n: s.ay }))}</span>
            </button>`).join('') || `<p class="si-empty">${esc(t('si_empty'))}</p>`}
        </div>`;
    body().querySelectorAll('.si-tab').forEach(b => b.addEventListener('click', () => { st.juz = +b.dataset.juz; st.q = ''; render(); }));
    body().querySelectorAll('.si-tile').forEach(b => b.addEventListener('click', () => { st.cur = +b.dataset.n; render(); window.scrollTo({ top: 0 }); }));
    const inp = document.getElementById('si-q');
    inp.addEventListener('input', () => {
        st.q = inp.value; renderList();
        const again = document.getElementById('si-q'); again.focus(); again.setSelectionRange(again.value.length, again.value.length);
    });
}

// تكبير صورة كلمات السورة: طبقة فوق الشاشة تبدأ من أسفل الترويسة؛ تُغلق بالضغط على الخلفية أو ✕ أو Esc.
// داخل الطبقة: تكبير إضافي بأزرار + / − أو عجلة الفأرة أو القرص بإصبعين أو النقر المزدوج، والسحب للتنقل.
function openZoom(src, alt) {
    document.getElementById('si-zoom')?.remove();
    const ov = document.createElement('div');
    ov.id = 'si-zoom';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', alt);
    const h = document.getElementById('main-header');
    ov.style.top = (h ? Math.max(0, Math.round(h.getBoundingClientRect().bottom)) : 0) + 'px';
    const zi = t('si_zoom_in'), zo = t('si_zoom_out'), cl = t('si_close');
    ov.innerHTML = `<button type="button" class="si-zoom-x" data-a="close" aria-label="${esc(cl)}" title="${esc(cl)}">✕</button>
        <div class="si-zoom-ctl"><button type="button" data-a="in" aria-label="${esc(zi)}" title="${esc(zi)}">+</button><button type="button" data-a="out" aria-label="${esc(zo)}" title="${esc(zo)}">−</button></div>
        <img src="${esc(src)}" alt="${esc(alt)}" draggable="false">`;
    const img = ov.querySelector('img');
    let sc = 1, x = 0, y = 0;
    const apply = () => {
        if (sc <= 1) { sc = 1; x = 0; y = 0; }
        img.style.transform = `translate(${x}px,${y}px) scale(${sc})`;
        ov.classList.toggle('is-zoomed', sc > 1);
    };
    const setScale = v => { sc = Math.min(5, Math.max(1, v)); apply(); };
    const close = () => { ov.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); else if (e.key === '+' || e.key === '=') setScale(sc * 1.4); else if (e.key === '-') setScale(sc / 1.4); };
    // سحب بإصبع واحد/فأرة + قرص بإصبعين
    const ptrs = new Map(); let pinch = 0, moved = false;
    img.addEventListener('pointerdown', e => { img.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); moved = false; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
    img.addEventListener('pointermove', e => {
        const p = ptrs.get(e.pointerId); if (!p) return;
        if (ptrs.size === 2) {
            p.x = e.clientX; p.y = e.clientY;
            const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinch) setScale(sc * d / pinch); pinch = d; moved = true;
        } else if (sc > 1) {
            x += e.clientX - p.x; y += e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; moved = true; apply();
        }
    });
    const up = e => { ptrs.delete(e.pointerId); pinch = 0; };
    img.addEventListener('pointerup', up); img.addEventListener('pointercancel', up);
    img.addEventListener('click', e => { e.stopPropagation(); });
    img.addEventListener('dblclick', e => { e.stopPropagation(); if (!moved) setScale(sc > 1 ? 1 : 2.5); });
    ov.addEventListener('wheel', e => { e.preventDefault(); setScale(sc * (e.deltaY < 0 ? 1.2 : 1 / 1.2)); }, { passive: false });
    ov.addEventListener('click', e => {
        const a = e.target.closest?.('[data-a]')?.dataset.a;
        if (a === 'in') setScale(sc * 1.4); else if (a === 'out') setScale(sc / 1.4); else close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
    ov.querySelector('.si-zoom-x').focus();
}

function renderCard() {
    const i = SURAH_INTRO.findIndex(s => s.n === st.cur);
    const s = SURAH_INTRO[i], prev = SURAH_INTRO[i - 1], next = SURAH_INTRO[i + 1];
    const en = isEnglish();
    const cards = surahCardUrls(s.n);
    const book = (k, txt) => `<div class="si-sec"><h2>${esc(t(k))}</h2><p lang="ar" dir="rtl">${withQuran(txt)}</p>${en ? `<div class="si-book-note">${esc(t('si_book_note'))}</div>` : ''}</div>`;
    body().innerHTML = `
        <div class="si-tools" style="margin-bottom:12px">
            <button type="button" class="si-btn" id="si-list">☰ ${esc(t('si_list'))}</button>
            <button type="button" class="si-btn" id="si-big" aria-label="${esc(t('si_bigger'))}" title="${esc(t('si_bigger'))}">A+</button>
            <button type="button" class="si-btn" id="si-small" aria-label="${esc(t('si_smaller'))}" title="${esc(t('si_smaller'))}">A−</button>
        </div>
        <article class="si-card">
            <div class="si-card-top">
                <span class="si-card-ic" aria-hidden="true">${s.ic}</span>
                <div>
                    <h2 class="si-card-name">${esc((en ? 'Surah ' : 'سورة ') + surahNameLocal(s.n))}</h2>
                    <div class="si-chips">
                        <span class="si-chip">${esc(tf('si_num', { n: s.n }))}</span>
                        <span class="si-chip">${esc(tf('si_ayahs', { n: s.ay }))}</span>
                        <span class="si-chip${s.md ? ' md' : ''}">${esc(t(s.md ? 'si_madani' : 'si_makki'))}</span>
                        <span class="si-chip">${esc(tf('si_juz', { n: juzLabel(s) }))}</span>
                    </div>
                </div>
            </div>
            <div class="si-card-row">
                <div class="si-sec kid"><h2>🌟 ${esc(t('si_simple'))}</h2><p>${esc(en ? s.ke : s.ka)}</p></div>
                ${book('si_goal', s.goal)}
            </div>
            <div class="si-books">
                ${book('si_meaning', s.mean)}
                ${book('si_names', s.names)}
            </div>
            <div class="si-media">
                ${s.audio ? `<audio controls preload="none" src="${esc(s.audio)}" aria-label="${esc(t('si_audio'))}" title="${esc(t('si_audio'))}"></audio>` : ''}
                ${s.yt ? `<a class="si-btn" href="https://www.youtube.com/watch?v=${esc(s.yt)}" target="_blank" rel="noopener">▶ ${esc(t('si_video'))}</a>` : ''}
            </div>
            ${cards.length ? `<div class="si-sec si-words"><h2>🖼️ ${esc(t('si_words'))}</h2><div class="si-words-grid">${cards.map((u, k) => `<img src="${u}" loading="lazy" decoding="async" alt="${esc(tf('si_words_img', { n: k + 1, total: cards.length }))}">`).join('')}</div></div>` : ''}
        </article>
        <div class="si-nav" style="margin-top:12px">
            <button type="button" class="si-btn" id="si-prev" ${prev ? '' : 'disabled'}>${en ? '←' : '→'} ${esc(t('si_prev'))}${prev ? ' · ' + esc(surahNameLocal(prev.n)) : ''}</button>
            <button type="button" class="si-btn" id="si-next" ${next ? '' : 'disabled'}>${esc(t('si_next'))}${next ? ' · ' + esc(surahNameLocal(next.n)) : ''} ${en ? '→' : '←'}</button>
        </div>`;
    const go = n => { st.cur = n; if (!inJuz(SURAH_INTRO.find(x => x.n === n), st.juz)) st.juz = SURAH_INTRO.find(x => x.n === n).j[0]; render(); window.scrollTo({ top: 0 }); };
    document.getElementById('si-list').addEventListener('click', () => { if (!inJuz(s, st.juz)) st.juz = s.j[0]; st.q = ''; st.cur = null; render(); });
    document.getElementById('si-big').addEventListener('click', () => { st.fs = Math.min(2, st.fs + 0.15); render(); });
    document.getElementById('si-small').addEventListener('click', () => { st.fs = Math.max(0.95, st.fs - 0.15); render(); });
    body().querySelectorAll('.si-words-grid img').forEach(img => img.addEventListener('click', () => openZoom(img.src, img.alt)));
    if (prev) document.getElementById('si-prev').addEventListener('click', () => go(prev.n));
    if (next) document.getElementById('si-next').addEventListener('click', () => go(next.n));
}
