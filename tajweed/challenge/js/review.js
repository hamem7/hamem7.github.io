// js/review.js — «مراجعة المحطة»: خريطة ذهنية للمحطة + خلاصة كل درس (من data/stories.js) مع نجوم الطالب + ورقة عمل للطباعة.
// ورقة العمل صفحة مستقلة تُفتح للطباعة: عنوان المحطة، سطر لاسم الطالب والتاريخ، خلاصة كل درس، وتمرين لكل حكم
// (آية من أمثلة الدرس — من data/pool.js — يضع الطالب دائرة حول موضع الحكم). الخط القرآني من خط المنصة نفسه (Amiri Quran).
import { STAGES, META, RULES } from '../data/rules.js';
import { STORIES } from '../data/stories.js';
import { POOL, SURAHS } from '../data/pool.js';
import { lessonExamples } from './engine.js';
import { STAGE_ICONS } from './viz.js';
import { t, tx, num, getLang } from './i18n.js';
import * as store from './store.js';
import { esc, starsHTML, ruleName } from './ui.js';

// كلمات طويلة تُقسم على سطرين داخل عقدة الخريطة
function wrapLabel(s, max = 14) {
  const w = s.split(/\s+/); const out = ['']; for (const x of w) { if ((out[out.length - 1] + ' ' + x).trim().length > max && out[out.length - 1]) out.push(x); else out[out.length - 1] = (out[out.length - 1] + ' ' + x).trim(); }
  return out.slice(0, 3);
}
export function mindMapSVG(st) {
  const ids = st.rules; const n = ids.length; const W = 640, H = n > 8 ? 560 : 460, cx = W / 2, cy = H / 2, R = n > 8 ? 220 : 165;
  const nodes = ids.map((id, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n; const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a) * (n > 8 ? 0.82 : 0.78);
    const r = store.getRule(id); const done = (r.lv[3] || 0) >= 1; const lines = wrapLabel(tx(META[id].name));
    return `<path class="mm-link" d="M${cx} ${cy} L${x} ${y}"/><g class="mm-node${done ? ' done' : ''}"><rect x="${x - 62}" y="${y - 12 - lines.length * 9}" width="124" height="${24 + lines.length * 18}" rx="14"/>${lines.map((l, k) => `<text x="${x}" y="${y - lines.length * 9 + 8 + k * 18}" text-anchor="middle">${esc(l)}</text>`).join('')}${done ? `<text class="mm-ok" x="${x + 54}" y="${y - lines.length * 9 - 2}" text-anchor="middle">✓</text>` : ''}</g>`;
  }).join('');
  const center = wrapLabel(tx(st.name), 16);
  return `<svg class="mindmap" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(tx(st.name))}">${nodes}<g class="mm-center"><circle cx="${cx}" cy="${cy}" r="${n > 8 ? 74 : 68}"/>${center.map((l, k) => `<text x="${cx}" y="${cy - center.length * 10 + 16 + k * 20}" text-anchor="middle">${esc(l)}</text>`).join('')}</g></svg>`;
}

export function reviewHTML(stageId, { crumb, stageStyle }) {
  const st = STAGES.find((s) => s.id === stageId);
  const cards = st.rules.map((id) => {
    const L = STORIES[id]; const r = store.getRule(id); const best = Math.max(r.lv[1] || 0, r.lv[2] || 0, r.lv[3] || 0);
    return `<article class="rv-card"><header><b>${esc(ruleName(id))}</b>${starsHTML(best)}</header><ul>${(L ? L.recap : []).map((x) => `<li>${esc(tx(x))}</li>`).join('')}</ul>
      <footer><a class="btn ghost sm" href="#/learn/${id}">${t('review_lesson')}</a><a class="btn ghost sm" href="#/rule/${id}">${t('rv_levels')}</a></footer></article>`;
  }).join('');
  return `${crumb([{ href: '#/', label: esc(t('app_title')) }, { label: esc(t('rv_title', { stage: tx(st.name) })) }])}
    <section class="review-page" ${stageStyle(st)}>
      <header class="rv-head"><span class="stage-ico" aria-hidden="true">${STAGE_ICONS[st.icon]}</span><div><h1>${esc(t('rv_title', { stage: tx(st.name) }))}</h1><p class="lead">${esc(tx(st.blurb))}</p></div></header>
      <div class="rv-actions"><button type="button" class="btn primary" data-rv="print">🖨️ ${t('rv_print')}</button><a class="btn accent" href="#/stage/${st.id}">🏁 ${t('stage_challenge')}</a></div>
      <figure class="rv-map">${mindMapSVG(st)}<figcaption>${t('rv_map_cap')}</figcaption></figure>
      <h2>${t('rv_cards')}</h2><div class="rv-cards">${cards}</div>
    </section>`;
}

// ───────── ورقة العمل للطباعة ─────────
const FONTS = new URL('../../../css/fonts.css', import.meta.url).href;
export function worksheetHTML(stageId) {
  const st = STAGES.find((s) => s.id === stageId); const ar = getLang() === 'ar';
  const items = st.rules.map((id, i) => {
    const L = STORIES[id]; let ex = '';
    if (RULES[id]) {
      const e = lessonExamples(id)[1] || lessonExamples(id)[0]; const [s, a] = e.key.split(':').map(Number);
      ex = `<div class="ex"><p class="ins">✏️ ${esc(t('ws_circle', { rule: tx(META[id].name) }))}</p><p class="ayah quran-text" dir="rtl" lang="ar">${esc(POOL[e.key].w.join(' '))}</p><small>${esc(t('from_ayah', { s: ar ? SURAHS[s].ar : SURAHS[s].en, a: num(a) }))}</small></div>`;
    } else ex = `<div class="ex"><p class="ins">✏️ ${esc(t('ws_write'))}</p><div class="lines"><i></i><i></i></div></div>`;
    return `<section class="it"><h2>${num(i + 1)}. ${esc(ruleName(id))}</h2><ul>${(L ? L.recap : []).map((x) => `<li>${esc(tx(x))}</li>`).join('')}</ul>${ex}</section>`;
  }).join('');
  return `<!doctype html><html lang="${ar ? 'ar' : 'en'}" dir="${ar ? 'rtl' : 'ltr'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(t('ws_title', { stage: tx(st.name) }))}</title>
    <link rel="stylesheet" href="${FONTS}"><style>
    body{font-family:'IBM Plex Sans Arabic',Tahoma,sans-serif;color:#10241c;background:#fff;margin:0;padding:24px 28px;line-height:1.7}
    h1{font-size:1.5rem;margin:0 0 4px;color:#0d5c46} .meta{display:flex;gap:24px;flex-wrap:wrap;border-bottom:2px solid #d4af37;padding-bottom:10px;margin-bottom:14px}
    .meta span{flex:1;min-width:180px;border-bottom:1px dashed #999;padding-bottom:2px}
    .it{border:1.5px solid #ddd;border-radius:14px;padding:10px 14px;margin:0 0 12px;break-inside:avoid}
    .it h2{font-size:1.1rem;margin:0 0 4px;color:#0d5c46} ul{margin:0 0 6px;padding-inline-start:20px}
    .quran-text{font-family:'Amiri Quran',serif!important;font-weight:400!important;line-height:2.2!important;letter-spacing:normal!important}
    .ayah{font-size:1.7rem;text-align:center;margin:4px 0;border:1px dashed #bbb;border-radius:10px;padding:4px 10px} .ins{margin:0;font-weight:700}
    .lines i{display:block;border-bottom:1px dashed #999;height:28px} small{color:#555}
    .foot{text-align:center;color:#777;font-size:.8rem;margin-top:10px} @media print{body{padding:0 6mm}.noprint{display:none}}
    </style></head><body>
    <h1>📝 ${esc(t('ws_title', { stage: tx(st.name) }))}</h1>
    <div class="meta"><span>${esc(t('ws_name'))}:</span><span>${esc(t('ws_date'))}:</span><span>${esc(t('ws_teacher'))}:</span></div>
    ${items}
    <p class="foot">${esc(t('app_title'))} — ${esc(t('ws_foot'))}</p>
    <p class="noprint" style="text-align:center"><button onclick="print()" style="font:inherit;padding:8px 20px;border-radius:10px">🖨️ ${esc(t('rv_print'))}</button></p>
    </body></html>`;
}
export function openWorksheet(stageId) {
  const w = window.open('', '_blank'); if (!w) return false;
  w.document.open(); w.document.write(worksheetHTML(stageId)); w.document.close();
  w.addEventListener('load', () => { try { w.focus(); w.print(); } catch { /* المتصفح يمنع الطباعة التلقائية */ } });
  return true;
}
