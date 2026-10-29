// js/ui.js — عناصر عرض مشتركة (آية، شارات، وسيلة إيضاح) بلا حالة.
import { POOL, SURAHS } from '../data/pool.js';
import { RULES, LETTER_NAMES } from '../data/rules.js';
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
export function ayahHTML(key, { hl = null, mode = 'plain', accepted = null } = {}) {
  const v = POOL[key]; const parts = [];
  v.w.forEach((w, i) => {
    const map = hl && hl[i] ? hl[i] : null;
    const inner = wordHTML(w);
    const cls = `w quran-text${map ? ' has-hl' : ''}${accepted && accepted.includes(i) ? ' accepted' : ''}`;
    parts.push(mode === 'tap'
      ? `<button type="button" class="${cls} tapw" data-w="${i}">${inner}</button>`
      : `<span class="${cls}" data-w="${i}"${hlAttr(map)}>${inner}</span>`);
    if (v.wq[i]) parts.push(`<span class="waqf quran-text" aria-hidden="true">${esc(v.wq[i])}</span>`);
  });
  return `<div class="ayah decor" dir="rtl" lang="ar">${parts.join(' ')}</div>`;
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

export const ruleName = (id) => tx(RULES[id].name);

export function starsHTML(n, max = 3) {
  return `<span class="stars" role="img" aria-label="${n}/${max}">${Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('')}</span>`;
}

export function audioBtn(key) {
  return `<button type="button" class="btn-ghost audio-btn" data-audio="${key}" aria-label="${esc(t('listen'))}"><span aria-hidden="true">🔊</span> <span class="lbl">${t('listen')}</span></button>`;
}
