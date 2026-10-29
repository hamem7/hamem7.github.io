// js/mushaf-explore.js — «استكشف الصفحة»: صفحة مصحف مطبوع حقيقية (صورة من المصحف) عليها دبابيس ذهبية مرقمة عند مواضع العلامات.
// يضغط الطفل على الدبوس (أو بند الفهرس) فتظهر بطاقة العلامة: صورتها الحقيقية مقتطعة من الصفحة نفسها + اسمها وتعريفها (نصوص المنصة المعتمدة).
// لا رسم ولا خط من عندنا هنا: الصفحة والعلامات صور من المصحف المطبوع (انظر tools/crop-signs.py).
import { EXPLORE, SIGNS, PARTS, signImg, partImg, pageImg, PAGE_W, PAGE_H } from '../data/mushaf.js';
import { t, tx, num } from './i18n.js';
import { esc } from './ui.js';

const infoOf = (p) => (p.sign ? { img: signImg(p.sign), name: SIGNS[p.sign].name, def: SIGNS[p.sign].def, abbr: SIGNS[p.sign].abbr } : { img: partImg(p.part), name: PARTS[p.part].name, def: PARTS[p.part].def });

export function exploreHTML(lessonId, pageIdx = 0) {
  const pages = EXPLORE[lessonId]; const pg = pages[Math.min(pageIdx, pages.length - 1)];
  // نافذة مكبرة حول الدبابيس (لتقرأ العلامات الصغيرة على الهاتف)
  const xs = pg.pins.map((p) => p.x), ys = pg.pins.map((p) => p.y);
  const W = Math.min(PAGE_W, Math.max(480, Math.max(...xs) - Math.min(...xs) + 380)); const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const left = Math.min(Math.max(cx - W / 2, 0), PAGE_W - W);
  const H = Math.min(PAGE_H, Math.max(W * 0.62, Math.max(...ys) - Math.min(...ys) + 300)); const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const top = Math.min(Math.max(cy - H / 2, 0), PAGE_H - H);
  const pinsHTML = pg.pins.map((p, i) => `<button type="button" class="pin" data-n="${i + 1}" style="left:${((p.x - left) / W * 100).toFixed(2)}%;top:${((p.y - top) / H * 100).toFixed(2)}%" aria-label="${esc(tx(infoOf(p).name))}">${num(i + 1)}</button>`).join('');
  const legend = pg.pins.map((p, i) => { const inf = infoOf(p); return `<li><button type="button" class="pin-leg" data-pinsel="${i + 1}"><b class="pn">${num(i + 1)}</b><img class="leg-img" src="${esc(inf.img)}" alt=""><span>${esc(tx(inf.name))}</span></button></li>`; }).join('');
  const tabs = pages.length > 1 ? `<div class="tabs page-tabs" role="tablist">${pages.map((q, i) => `<button type="button" role="tab" aria-selected="${i === pageIdx}" class="${i === pageIdx ? 'on' : ''}" data-page="${i}">${esc(tx(q.label))}</button>`).join('')}</div>` : '';
  return `<div class="explore" data-lesson="${lessonId}" data-page="${pageIdx}" data-pins='${JSON.stringify(pg.pins.map((p) => ({ sign: p.sign || null, part: p.part || null })))}'>
    ${tabs}
    <figure class="realpage"><div class="rp-frame" style="aspect-ratio:${W.toFixed(0)} / ${H.toFixed(0)}"><img class="rp-img" src="${pageImg(pg.page)}" alt="${esc(t('mk_page_alt', { n: num(pg.page) }))}" style="width:${(PAGE_W / W * 100).toFixed(2)}%;left:${(-left / W * 100).toFixed(3)}%;top:${(-top / H * 100).toFixed(3)}%">${pinsHTML}</div><figcaption>${esc(t('mk_page_n', { n: num(pg.page) }))} · ${esc(tx(pg.label))}</figcaption></figure>
    <p class="explore-hint" role="note">${t('mk_explore_hint')}</p>
    <ol class="pin-legend">${legend}</ol>
    <div class="pin-info" aria-live="polite" data-empty="${esc(t('mk_explore_empty'))}"></div>
  </div>`;
}

export function bindExplore(scope) {
  const root = scope.querySelector('.explore'); if (!root) return;
  const lesson = root.dataset.lesson; const pins = JSON.parse(root.dataset.pins); const info = root.querySelector('.pin-info');
  const pick = (n) => {
    const p = pins[Number(n) - 1]; if (!p) return; const inf = infoOf(p);
    root.querySelectorAll('.pin').forEach((b) => b.classList.toggle('sel', b.dataset.n === String(n)));
    root.querySelectorAll('.pin-leg').forEach((b) => b.classList.toggle('sel', b.dataset.pinsel === String(n)));
    info.innerHTML = `<div class="info-card"><img class="info-img" src="${esc(inf.img)}" alt="${esc(tx(inf.name))}"><div><b>${esc(tx(inf.name))}${inf.abbr ? ` <span class="tag">${esc(inf.abbr)}</span>` : ''}</b><p>${esc(tx(inf.def))}</p></div></div>`;
    info.classList.remove('flash'); void info.offsetWidth; info.classList.add('flash');
  };
  root.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-page]'); if (tab) { root.outerHTML = exploreHTML(lesson, Number(tab.dataset.page)); bindExplore(scope); return; }
    const b = e.target.closest('.pin, .pin-leg'); if (b) pick(b.dataset.n || b.dataset.pinsel);
  });
}
