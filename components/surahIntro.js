// components/surahIntro.js — 📖 شاشة «تعرّف على السورة» (سور الأجزاء 26–30).
// قائمة السور (تبويبات الأجزاء + بحث) ← بطاقة السورة للعرض على الطلاب (ملخّص مبسّط + معنى الاسم + رسالة السورة + الأسماء
// + البطاقة الصوتية والفيديو) مع التنقل للسابقة/التالية وتكبير الخط. البيانات في components/surahIntroData.js.
import { t, tf, surahNameLocal, isEnglish } from '../core/i18n.js';
import { SURAH_INTRO } from './surahIntroData.js';
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

const JUZ = [26, 27, 28, 29, 30];
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
        : s.j === st.juz);
    body().innerHTML = `
        <div class="si-tools" role="tablist">
            ${JUZ.map(j => `<button type="button" class="si-tab${!q && j === st.juz ? ' is-on' : ''}" data-juz="${j}" role="tab" aria-selected="${!q && j === st.juz}">${esc(tf('si_juz', { n: j }))}</button>`).join('')}
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

function renderCard() {
    const i = SURAH_INTRO.findIndex(s => s.n === st.cur);
    const s = SURAH_INTRO[i], prev = SURAH_INTRO[i - 1], next = SURAH_INTRO[i + 1];
    const en = isEnglish();
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
                        <span class="si-chip">${esc(tf('si_juz', { n: s.j }))}</span>
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
        </article>
        <div class="si-nav" style="margin-top:12px">
            <button type="button" class="si-btn" id="si-prev" ${prev ? '' : 'disabled'}>${en ? '←' : '→'} ${esc(t('si_prev'))}${prev ? ' · ' + esc(surahNameLocal(prev.n)) : ''}</button>
            <button type="button" class="si-btn" id="si-next" ${next ? '' : 'disabled'}>${esc(t('si_next'))}${next ? ' · ' + esc(surahNameLocal(next.n)) : ''} ${en ? '→' : '←'}</button>
        </div>`;
    const go = n => { st.cur = n; st.juz = SURAH_INTRO.find(x => x.n === n).j; render(); window.scrollTo({ top: 0 }); };
    document.getElementById('si-list').addEventListener('click', () => { st.juz = s.j; st.q = ''; st.cur = null; render(); });
    document.getElementById('si-big').addEventListener('click', () => { st.fs = Math.min(2, st.fs + 0.15); render(); });
    document.getElementById('si-small').addEventListener('click', () => { st.fs = Math.max(0.95, st.fs - 0.15); render(); });
    if (prev) document.getElementById('si-prev').addEventListener('click', () => go(prev.n));
    if (next) document.getElementById('si-next').addEventListener('click', () => go(next.n));
}
