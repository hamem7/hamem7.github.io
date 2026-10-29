// js/ui.js — عناصر عرض مشتركة (آية، شارات، وسيلة إيضاح) بلا حالة.
import { POOL, SURAHS } from '../data/pool.js';
import { META, LETTER_NAMES } from '../data/rules.js';
import { X } from '../data/mushaf-texts.js';
import { quarterMarker, JUZ_ORDINALS_AR, pageImg, pageWindow, PAGE_W } from '../data/mushaf.js';
import { wordHTML, hlAttr } from './quran.js';
import { t, tx, num, getLang } from './i18n.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let reviewMode = false;
try { reviewMode = sessionStorage.getItem('tjc.review') === '1' || /[?&]review=1/.test(location.search); } catch { /* لا تخزين */ }
export const isReview = () => reviewMode;
export function setReview(v) { reviewMode = !!v; try { sessionStorage.setItem('tjc.review', v ? '1' : '0'); } catch { /* لا تخزين */ } }

export const badge = (reason) => (reason ? `<span class="badge review" title="${esc(reason)}">⚑ ${t('review_badge')}</span>` : '');
export const reviewNote = (reason) => (reason && reviewMode ? `<p class="review-note">⚑ ${esc(reason)}</p>` : '');

export const surahName = (s) => (getLang() === 'ar' ? SURAHS[s].ar : SURAHS[s].en);
export const ayahLabel = (key) => { const [s, a] = key.split(':').map(Number); return t('from_ayah', { s: surahName(s), a: num(a) }); };

// آية كاملة. hl: {كلمة:{مقطع:'cause'|'trigger'}}، mode: 'plain'|'tap'، onlyRange: [من,إلى] لتقليص العرض
export function ayahHTML(key, { hl = null, mode = 'plain', accepted = null, marks = null, tapMarks = false } = {}) {
  const v = POOL[key]; const parts = [];
  if (v.rb) parts.push(markHTML('\u06DE', 'lead', marks, tapMarks, 'rub'));
  v.w.forEach((w, i) => {
    const map = hl && hl[i] ? hl[i] : null;
    const inner = wordHTML(w);
    const cls = `w quran-text${map ? ' has-hl' : ''}${accepted && accepted.includes(i) ? ' accepted' : ''}`;
    parts.push(mode === 'tap'
      ? `<button type="button" class="${cls} tapw" data-w="${i}">${inner}</button>`
      : `<span class="${cls}" data-w="${i}"${hlAttr(map)}>${inner}</span>`);
    if (v.wq[i]) v.wq[i].split(' ').forEach((tok, k) => parts.push(markHTML(tok, `${i}:${k}`, marks, tapMarks, '')));
  });
  return `<div class="ayah decor" dir="rtl" lang="ar">${parts.join(' ')}</div>`;
}
function markHTML(tok, id, marks, tap, extra) {
  const on = marks && marks.has(id) ? ' mk-on' : '';
  return tap
    ? `<button type="button" class="waqf quran-text tapm${on} ${extra}" data-m="${id}" aria-label="mark">${esc(tok)}</button>`
    : `<span class="waqf quran-text${on} ${extra}" aria-hidden="true">${esc(tok)}</span>`;
}

// ───── وسائط درس المصحف (صور مقتطعة من المصحف المطبوع، تركب عليها النصوص) ─────
const ASSET = 'assets/mushaf/';
export function lanternHTML(q) {
  const m = quarterMarker(q), n = m.lines.length;
  const fs = n === 3 ? (m.lines[0].length > 5 ? 9.5 : 12.5) : (m.kind === 'juz' ? 11.5 : 15);
  const box = m.full ? 'left:19.6%;right:19.8%;top:42.4%;bottom:37.3%' : 'left:19.6%;right:19.8%;top:60.2%;bottom:10.8%';
  return `<div class="lant" role="img" aria-label="${esc(m.lines.join(' '))}"><img src="${ASSET}lantern-${m.full ? 'full' : 'top'}.webp" alt=""><div class="lant-text quran-text" dir="rtl" style="${box};font-size:${fs}cqw">${m.lines.map((l) => `<span>${esc(l)}</span>`).join('')}</div></div>`;
}
export const bannerHTML = (surahNo) => `<div class="banner" role="img" aria-label="${esc(SURAHS[surahNo].ar)}"><img src="${ASSET}banner-blank.webp" alt=""><span class="banner-name quran-text" dir="rtl">س\u064Fور\u064Eة\u064F ${esc(SURAHS[surahNo].ar)}</span></div>`;
// إطار «سجدة» على الهامش: إطار الفانوس الحقيقي من المصحف مكتوب فيه النص (كما في المنصة)
export const frameHTML = (text) => `<div class="lant frame" role="img" aria-label="${esc(text)}"><img src="${ASSET}lantern-frame.webp" alt=""><div class="lant-text quran-text" dir="rtl" style="left:18%;right:19%;top:17%;bottom:21%;font-size:21cqw"><span>${esc(text)}</span></div></div>`;
// رأس الصفحة (اسم الجزء يمينًا واسم السورة يسارًا) — صور الصفحات بلا هوامش فالنص مكتوب كما في المنصة
export const pageHeadHTML = (juz, s) => `<div class="pagehead" dir="rtl"><span class="quran-text">الجزء ${JUZ_ORDINALS_AR[juz - 1]}</span><span class="quran-text">س\u064Fور\u064Eة\u064F ${esc(SURAHS[s].ar)}</span></div><small class="pagehead-cap">${esc(tx(X('mu_juz_caption', { n: num(juz) })))}</small>`;
// صفحة مصحف حقيقية بنافذة مكبّرة ودبوس ذهبي واحد
export function pagePinHTML(page, x, y) {
  const { W, H, left, top } = pageWindow([{ x, y }]);
  return `<figure class="realpage pinq"><div class="rp-frame" style="aspect-ratio:${W.toFixed(0)} / ${H.toFixed(0)}"><img class="rp-img" src="${pageImg(page)}" alt="${esc(t('mk_page_alt', { n: num(page) }))}" style="width:${(PAGE_W / W * 100).toFixed(2)}%;left:${(-left / W * 100).toFixed(3)}%;top:${(-top / H * 100).toFixed(3)}%"><span class="pin static" style="left:${((x - left) / W * 100).toFixed(2)}%;top:${((y - top) / H * 100).toFixed(2)}%" aria-hidden="true">★</span></div></figure>`;
}
export function mediaHTML(m) {
  if (!m) return '';
  if (m.kind === 'glyph') return `<div class="glyph-big quran-text" dir="rtl" aria-hidden="true">${esc(m.glyph)}</div>`;
  if (m.kind === 'img') return `<img class="media-img ${esc(m.cls || '')}" src="${esc(m.src)}" alt="${esc(tx(m.alt))}">`;
  if (m.kind === 'verse') return `<div class="ayah-wrap">${ayahHTML(m.key)}<div class="ayah-meta"><span>${esc(ayahLabel(m.key))}</span></div></div>`;
  if (m.kind === 'lantern') return `<div class="media-lantern">${lanternHTML(m.q)}</div>`;
  if (m.kind === 'banner') return bannerHTML(m.surah);
  if (m.kind === 'pagehead') return `<div class="pagehead-box">${pageHeadHTML(m.juz, m.surah)}</div>`;
  if (m.kind === 'pagepin') return pagePinHTML(m.page, m.x, m.y);
  if (m.kind === 'frame') return `<div class="media-lantern">${frameHTML(m.text)}</div>`;
  return '';
}

// عبارة (كلمة/كلمتان) من آية مع تلوين اختياري
export function spanHTML(key, w1, w2, hl = null) {
  const v = POOL[key]; const out = [];
  for (let i = w1; i <= w2; i++) out.push(`<span class="w quran-text${hl && hl[i] ? ' has-hl' : ''}"${hlAttr(hl && hl[i])}>${wordHTML(v.w[i])}</span>`);
  return `<span class="phrase decor" dir="rtl" lang="ar">${out.join(' ')}</span>`;
}

export const chip = (ch, { small = false } = {}) => {
  const n = LETTER_NAMES[ch];
  return `<span class="lchip${small ? ' sm' : ''}" title="${esc(n ? tx(n) : '')}"><b class="quran-text">${esc(ch)}</b>${n && !small ? `<small>${esc(tx(n))}</small>` : ''}</span>`;
};

const LEG = {
  noon: [{ ar: 'النون الساكنة / التنوين', en: 'Noon sakinah / tanween' }, { ar: 'الحرف التالي', en: 'The next letter' }],
  meem: [{ ar: 'الميم الساكنة', en: 'Meem sakinah' }, { ar: 'الحرف التالي', en: 'The next letter' }],
  lam: [{ ar: 'لام «أل»', en: 'The “al” lam' }, { ar: 'الحرف بعدها', en: 'The letter after it' }],
  qalqalah: [{ ar: 'حرف القلقلة', en: 'The qalqalah letter' }, null],
  ghunna: [{ ar: 'الحرف المشد\u0651د', en: 'The doubled letter' }, null],
  madd_tabii: [{ ar: 'حرف المد\u0651', en: 'The madd letter' }, null],
  madd_muttasil: [{ ar: 'حرف المد\u0651', en: 'The madd letter' }, { ar: 'الهمزة', en: 'The hamza' }],
  madd_munfasil: [{ ar: 'حرف المد\u0651', en: 'The madd letter' }, { ar: 'الهمزة', en: 'The hamza' }]
};
export function legendHTML(ruleId) {
  const key = ruleId.startsWith('noon_') ? 'noon' : ruleId.startsWith('meem_') ? 'meem' : ruleId.startsWith('lam_') ? 'lam' : ruleId;
  const [a, b] = LEG[key] || LEG.noon;
  return `<div class="legend" aria-hidden="true"><span><i class="dot cause"></i>${esc(tx(a))}</span>${b ? `<span><i class="dot trigger"></i>${esc(tx(b))}</span>` : ''}</div>`;
}

export const ruleName = (id) => tx(META[id].name);

export function starsHTML(n, max = 3) {
  return `<span class="stars" role="img" aria-label="${n}/${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;
}

export function audioBtn(key) {
  return `<button type="button" class="btn-ghost audio-btn" data-audio="${key}" aria-label="${esc(t('listen'))}"><span aria-hidden="true">🔊</span> <span class="lbl">${t('listen')}</span></button>`;
}
