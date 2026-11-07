// js/colormushaf.js — «المصحف الملوّن بأحكام التجويد» (رواية حفص عن عاصم): فهرس السور + صفحة كل سورة كاملةً بخط مجمع الملك فهد V4 الملوّن.
// الألوان داخل الخط نفسه (COLR/CPAL) فلا يُلوَّن شيء بالاجتهاد. كل صفحة مطبوعة لها ملف خط في assets/qpc-v4-tajweed، وتُحمَّل عند الحاجة فقط.
// النص رموز خط (بيانات data/mushaf-color-glyphs.js المولَّدة): الورق عاجي في الفاتح والداكن معًا كالمصحف المطبوع (لوحة اللوحة 0: حبر أسود).
import { CM_SURAHS, CM_PALETTE } from '../data/mushaf-color-index.js';
import { t, tx, num, getLang } from './i18n.js';
import { esc } from './ui.js';

const FONT_BASE = new URL('../assets/qpc-v4-tajweed/', import.meta.url).href;
const ASSET_BANNER = new URL('../assets/mushaf/banner-blank.webp', import.meta.url).href;
const fontUrl = (p) => `${FONT_BASE}p${p}.${p === 328 ? 'woff' : 'woff2'}`;   // الصفحة 328 تنشرها المكتبة بصيغة woff فقط
const famOf = (p) => `QPC4 p${p}`;

// مفتاح الألوان: كل بند يشير إلى فهرس اللون في لوحة الخط (CM_PALETTE) — اللون يُقرأ من الخط لا يُكتب هنا. المعنى مطابَق على مواضع الأحكام (انظر assets/qpc-v4-tajweed/SOURCE.md).
export const CM_LEGEND = [
  { id: 'lazim', c: [3], name: { ar: 'المدّ اللازم', en: 'Obligatory madd (lazim)' }, d: { ar: 'ستّ حركات', en: 'Six counts' } },
  { id: 'wajib', c: [9], name: { ar: 'المدّ المتصل والمنفصل', en: 'Connected & separated madd' }, d: { ar: 'أربع أو خمس حركات', en: 'Four or five counts' } },
  { id: 'arid', c: [4], name: { ar: 'المدّ العارض للسكون واللين', en: 'Pausal madd (arid) & leen' }, d: { ar: 'عند الوقف: حركتان أو أربع أو ست', en: 'When stopping: two, four or six counts' } },
  { id: 'natural', c: [5], name: { ar: 'المدّ بحركتين', en: 'Two-count madd' }, d: { ar: 'الطبيعي وما يُلحق به: الصلة الصغرى والبدل', en: 'Natural madd and what follows it: short silah, badal' } },
  { id: 'ghunna', c: [6], name: { ar: 'الغنّة', en: 'Ghunna (nasalisation)' }, d: { ar: 'تشمل الإخفاء والإدغام بغنّة والنون والميم المشدّدتين', en: 'Covers ikhfa, idgham with ghunna and doubled noon/meem' } },
  { id: 'qalqala', c: [8], name: { ar: 'القلقلة', en: 'Qalqala (echo)' }, d: { ar: 'ق ط ب ج د ساكنة أو موقوفًا عليها', en: 'ق ط ب ج د when sukun or at a stop' } },
  { id: 'tafkhim', c: [7], name: { ar: 'التفخيم', en: 'Tafkhim (heavy letters)' }, d: { ar: 'الحروف المفخّمة: الراء المفخّمة ولام لفظ الجلالة وحروف الاستعلاء', en: 'Heavy letters: heavy raa, laam of Allah, isti‘laa letters' } },
  { id: 'silent', c: [1, 2, 15], name: { ar: 'ما لا يُلفظ', en: 'Not pronounced' }, d: { ar: 'همزة الوصل ولام «ال» الشمسية والحرف المدغَم ونحوها', en: 'Hamzat al-wasl, the laam of “al-” before sun letters, an assimilated letter…' } }
];

const norm = (s) => String(s || '').replace(/[ً-ٰٟۖ-ۭـ]/g, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
const placeTxt = (p) => t(p === 'makkah' ? 'cm_makki' : 'cm_madani');
const sName = (s) => (getLang() === 'ar' ? s.ar : s.en);
const LS_LAST = 'tjc.cm.last', LS_FS = 'tjc.cm.fs';
const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* لا تخزين */ } };
const FS_MIN = 22, FS_MAX = 56, FS_STEP = 4;

// تحميل خطوط الصفحات: FontFace على مستوى المستند (الخطوط المعرَّفة داخل Shadow DOM لا تعمل)، مع تخزين الوعد فلا يُعاد التحميل
const fontLoads = new Map();
function loadPage(p) {
  if (!fontLoads.has(p)) {
    const ff = new FontFace(famOf(p), `url(${fontUrl(p)})`, { display: 'block' });
    const pr = ff.load().then((f) => { document.fonts.add(f); return f; });
    pr.catch(() => fontLoads.delete(p));
    fontLoads.set(p, pr);
  }
  return fontLoads.get(p);
}
let glyphMod = null;
const loadGlyphs = () => (glyphMod ||= import('../data/mushaf-color-glyphs.js'));

export function legendHTML() {
  return `<section class="cm-legend" aria-labelledby="cm-lg-h">
    <h2 id="cm-lg-h">🎨 ${t('cm_legend')}</h2>
    <ul class="cm-lg-list">${CM_LEGEND.map((e) => `<li><span class="cm-sw" aria-hidden="true">${e.c.map((i) => `<i style="background:${CM_PALETTE[i]}"></i>`).join('')}</span>
      <span class="cm-lg-tx"><b>${esc(tx(e.name))}</b><small>${esc(tx(e.d))}</small></span></li>`).join('')}</ul>
    <p class="cm-src">${t('cm_source')}</p>
  </section>`;
}

export function initColorMushaf(H) {
  const { shell, crumb, go } = H; const rootEl = () => H.root();
  let token = 0;

  // ───────── الفهرس ─────────
  function renderIndex() {
    token++;
    const last = Number(lsGet(LS_LAST)) || 0; const lastS = CM_SURAHS.find((s) => s.n === last);
    shell(`
      ${crumb([{ href: '#/', label: esc(t('app_title')) }, { label: esc(t('cm_title')) }])}
      <header class="cm-hero">
        <h1>📖 ${t('cm_title')}</h1>
        <p class="lead">${t('cm_lead')}</p>
        <div class="hero-cta">
          <a class="btn primary big" href="#/quran/${lastS ? lastS.n : 1}">${lastS ? `▶️ ${esc(t('cm_continue', { s: sName(lastS) }))}` : `📖 ${esc(t('cm_start'))}`}</a>
          ${lastS ? `<a class="btn ghost" href="#/quran/1">${esc(t('cm_from_start'))}</a>` : ''}
        </div>
      </header>
      <section class="cm-index" aria-labelledby="cm-ix-h">
        <div class="cm-ix-head"><h2 id="cm-ix-h">☰ ${t('cm_index')}</h2><label class="cm-search"><span aria-hidden="true">🔍</span><input type="search" id="cm-q" placeholder="${esc(t('cm_search'))}" autocomplete="off" aria-label="${esc(t('cm_search'))}"></label></div>
        <div class="cm-chips" role="group" aria-label="${esc(t('cm_filter'))}">
          ${[['all', 'cm_all'], ['makkah', 'cm_makki'], ['madinah', 'cm_madani']].map(([k, key], i) => `<button type="button" class="cm-chip${i === 0 ? ' on' : ''}" data-f="${k}" aria-pressed="${i === 0}">${t(key)}</button>`).join('')}
        </div>
        <ol class="cm-grid" id="cm-grid">${CM_SURAHS.map((s) => tileHTML(s, s.n === last)).join('')}</ol>
        <p class="muted center" id="cm-none" hidden>${t('cm_none')}</p>
      </section>
      ${legendHTML()}`, { cls: 'cm-page' });
    const root = rootEl(); const q = root.querySelector('#cm-q'); let f = 'all';
    const apply = () => {
      const n = norm(q.value); let shown = 0;
      root.querySelectorAll('#cm-grid li').forEach((li) => {
        const s = CM_SURAHS[Number(li.dataset.n) - 1];
        const ok = (f === 'all' || s.place === f) && (!n || String(s.n) === n || norm(s.ar).includes(n) || norm(s.en).includes(n) || norm(s.tr).includes(n));
        li.hidden = !ok; if (ok) shown++;
      });
      root.querySelector('#cm-none').hidden = shown > 0;
    };
    q.addEventListener('input', apply);
    root.querySelectorAll('.cm-chip').forEach((b) => b.addEventListener('click', () => { f = b.dataset.f; root.querySelectorAll('.cm-chip').forEach((x) => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); apply(); }));
  }
  const tileHTML = (s, isLast) => `<li data-n="${s.n}"><a class="cm-tile${isLast ? ' last' : ''}" href="#/quran/${s.n}" ${isLast ? 'aria-current="true"' : ''}>
      <span class="cm-no" aria-hidden="true">${num(s.n)}</span>
      <span class="cm-nm"><b>${esc(sName(s))}</b><small>${esc(getLang() === 'ar' ? s.en : s.ar)}</small></span>
      <span class="cm-mt"><em>${esc(placeTxt(s.place))}</em><small>${esc(t('cm_ayahs', { n: num(s.ayahs) }))}</small></span></a></li>`;

  // ───────── صفحة السورة ─────────
  async function renderSurah(n) {
    const my = ++token;
    const s = CM_SURAHS[n - 1]; lsSet(LS_LAST, String(n));
    const prev = CM_SURAHS[n - 2], next = CM_SURAHS[n];
    const fs = Math.min(FS_MAX, Math.max(FS_MIN, Number(lsGet(LS_FS)) || 34));
    shell(`
      ${crumb([{ href: '#/', label: esc(t('app_title')) }, { href: '#/quran', label: esc(t('cm_title')) }, { label: esc(sName(s)) }])}
      <div class="cm-bar">
        <a class="btn primary" href="#/quran">☰ ${t('cm_index')}</a>
        <label class="cm-jump"><span class="sr">${t('cm_goto')}</span><select id="cm-goto" aria-label="${esc(t('cm_goto'))}">${CM_SURAHS.map((x) => `<option value="${x.n}"${x.n === n ? ' selected' : ''}>${num(x.n)} · ${esc(sName(x))}</option>`).join('')}</select></label>
        ${s.ayahs > 1 ? `<label class="cm-jump"><span class="sr">${t('cm_goto_ayah')}</span><select id="cm-goto-ay" aria-label="${esc(t('cm_goto_ayah'))}"><option value="">${esc(t('cm_goto_ayah'))}</option>${Array.from({ length: s.ayahs }, (_, i) => `<option value="${i + 1}">${num(i + 1)}</option>`).join('')}</select></label>` : ''}
        <span class="cm-fs" role="group" aria-label="${esc(t('cm_size'))}"><button type="button" class="btn ghost sm" data-fs="-1" aria-label="${esc(t('cm_smaller'))}">A−</button><button type="button" class="btn ghost sm" data-fs="1" aria-label="${esc(t('cm_larger'))}">A+</button></span>
      </div>
      <article class="cm-surah" aria-labelledby="cm-sn">
        <div class="banner cm-banner" role="img" aria-label="${esc(s.ar)}"><img src="${ASSET_BANNER}" alt=""><h1 id="cm-sn" class="banner-name quran-text" dir="rtl">سُورَةُ ${esc(s.ar)}</h1></div>
        <p class="cm-meta"><span>${esc(placeTxt(s.place))}</span><span>${esc(t('cm_ayahs', { n: num(s.ayahs) }))}</span><span>${esc(t('cm_page_from', { p: num(s.p) }))}</span>${getLang() === 'ar' ? '' : `<span>${esc(s.tr)}</span>`}</p>
        <div class="cm-paper" dir="rtl" lang="ar" style="--cm-fs:${fs}px">
          <div class="cm-status" id="cm-status" role="status">${t('cm_loading')}</div>
          <div class="cm-basmala" id="cm-basmala" aria-hidden="true"></div>
          <div class="cm-text" id="cm-text" role="document" aria-label="${esc(t('cm_aria', { s: sName(s) }))}"></div>
        </div>
        <nav class="cm-pn" aria-label="${esc(t('cm_prevnext'))}">
          ${prev ? `<a class="btn ghost" href="#/quran/${prev.n}" rel="prev">${getLang() === 'ar' ? '→' : '←'} ${esc(sName(prev))}</a>` : '<span></span>'}
          ${next ? `<a class="btn primary" href="#/quran/${next.n}" rel="next">${esc(sName(next))} ${getLang() === 'ar' ? '←' : '→'}</a>` : '<span></span>'}
        </nav>
      </article>
      ${legendHTML()}`, { cls: 'cm-page cm-surah-page' });
    const root = rootEl();
    root.querySelector('#cm-goto').addEventListener('change', (e) => go(`#/quran/${e.target.value}`));
    root.querySelector('#cm-goto-ay')?.addEventListener('change', (e) => { const a = root.querySelector(`[data-ay="${e.target.value}"]`); if (a) { a.scrollIntoView({ block: 'center', behavior: 'smooth' }); a.classList.add('flash'); setTimeout(() => a.classList.remove('flash'), 2200); } e.target.value = ''; });
    root.querySelectorAll('[data-fs]').forEach((b) => b.addEventListener('click', () => { const paper = root.querySelector('.cm-paper'); const v = Math.min(FS_MAX, Math.max(FS_MIN, (parseInt(paper.style.getPropertyValue('--cm-fs'), 10) || 34) + Number(b.dataset.fs) * FS_STEP)); paper.style.setProperty('--cm-fs', `${v}px`); lsSet(LS_FS, String(v)); }));

    const status = root.querySelector('#cm-status'); const mount = root.querySelector('#cm-text');
    try {
      const G = await loadGlyphs(); if (my !== token) return;
      const ayahs = G.GLYPHS[n];
      // تسلسل القطع بترتيب المصحف: {آية، صفحة، رموز}
      const chunks = []; ayahs.forEach((parts, i) => { for (let k = 0; k < parts.length; k += 2) chunks.push({ a: i + 1, p: parts[k], g: parts[k + 1], first: k === 0 }); });
      const pages = [...new Set(chunks.map((c) => c.p))];
      const wantBasmala = s.bism;                // سورة الفاتحة بسملتها آية؛ والتوبة بلا بسملة
      const all = wantBasmala ? [...new Set([...pages, G.BASMALA[0]])] : pages;
      let done = 0; const upd = () => { status.textContent = t('cm_loading_n', { i: num(done), n: num(all.length) }); };
      upd();
      // نبدأ كل التحميلات معًا، ونرسم القطع بالترتيب كلما جاهزت خطوطها
      all.forEach((p) => loadPage(p).then(() => { done++; if (my === token) upd(); }, () => {}));
      if (wantBasmala) {
        await loadPage(G.BASMALA[0]); if (my !== token) return;
        root.querySelector('#cm-basmala').innerHTML = `<span style="font-family:'${famOf(G.BASMALA[0])}'">${G.BASMALA[1]}</span>`;
      }
      let curA = null, curEl = null;
      for (const c of chunks) {
        await loadPage(c.p); if (my !== token) return;
        if (c.a !== curA) { curA = c.a; curEl = document.createElement('span'); curEl.className = 'cm-ay'; curEl.dataset.ay = String(c.a); mount.appendChild(curEl); mount.appendChild(document.createTextNode(' ')); }
        const run = document.createElement('span'); run.style.fontFamily = `'${famOf(c.p)}'`; run.textContent = `${c.g} `; curEl.appendChild(run);
        if (c.a === 1 && c.first && status.isConnected) status.hidden = true;   // يظهر النص من أول قطعة ولا ينتظر السورة كلها
      }
      status.hidden = true;
    } catch (e) {
      console.error(e);
      if (my === token && status.isConnected) { status.hidden = false; status.innerHTML = `${esc(t('cm_error'))} <button type="button" class="btn ghost sm" id="cm-retry">${esc(t('cm_retry'))}</button>`; status.querySelector('#cm-retry').addEventListener('click', () => renderSurah(n)); }
    }
  }

  return { renderIndex, renderSurah };
}
