// js/quran.js — عرض النص القرآني وتحديد «السبب» و«الحرف المؤثر» داخل الكلمات (بلا لمس لنص الآية).
// يعرض النص من شرائح حرفية من الكلمة الأصلية، فلا يعدل أي حرف أو علامة. كل عنصر يحمل نصا قرآنيا يحمل الصنف quran-text.
import { clusters } from './arabic.js';

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// مقاطع الكلمة (مخزنة مؤقتا)
const cache = new Map();
export function wordClusters(word) { let c = cache.get(word); if (!c) { c = clusters(word); cache.set(word, c); } return c; }

// يرجع فهرس مقطع النون/التنوين الحامل في آخر الكلمة (التنوين بالفتح يقع قبل الألف الأخيرة)
export function endCarrier(word) {
  const cs = wordClusters(word); const last = cs.length - 1;
  const prev = cs[last - 1];
  if (prev && ['ا', 'ى', 'ی'].includes(cs[last].base) && cs[last].marks.size === 0 && [...prev.marks].some(m => '\u064B\u08F0\u08F1\u08F2\u06E2\u06ED\u064C\u064D'.includes(m))) return last - 1;
  return last;
}

// يرجع { [wordIdx]: { [clusterIdx]: 'cause'|'trigger' } } لموضع حكم من pool.o: [rule,w1,w2,trigger,at,v]
export function locate(occ, words) {
  const [rule, w1, w2, , at] = occ;
  const out = {}; const mark = (w, c, kind) => { if (c < 0) return; (out[w] ||= {})[c] = kind; };
  const lastIdx = (w) => wordClusters(words[w]).length - 1;
  if (rule.startsWith('noon_') || rule.startsWith('meem_')) {
    if (w1 === w2) { mark(w1, at, 'cause'); mark(w1, at + 1, 'trigger'); }
    else { mark(w1, rule.startsWith('meem_') ? lastIdx(w1) : endCarrier(words[w1]), 'cause'); mark(w2, 0, 'trigger'); }
  } else if (rule === 'ghunna' || rule === 'qalqalah' || rule === 'madd_tabii') mark(w1, at, 'cause');
  else if (rule === 'lam_qamari' || rule === 'lam_shamsi') { mark(w1, at - 1, 'cause'); mark(w1, at, 'trigger'); }
  else if (rule === 'madd_muttasil') { mark(w1, at, 'cause'); mark(w1, at + 1, 'trigger'); }
  else if (rule === 'madd_munfasil') {
    const cs = wordClusters(words[w1]); let c = cs.length - 1;
    if (cs[c].marks.has('\u06DF') && c > 0) c -= 1;           // ألف صامتة بعد واو الجماعة: المد على الواو
    mark(w1, c, 'cause'); mark(w2, 0, 'trigger');
  }
  return out;
}

// يرسم كلمة: النص كما هو دائما (كلمة واحدة بلا تقطيع) حتى لا ينكسر وصل الحروف ولا مواضع العلامات.
// التلوين وأزرار اللمس طبقة فوق النص تحسب مواضعها ب Range (انظر decorate).
export function wordHTML(word) { return esc(word); }
// صفة data-hl: «فهرس_المقطع:النوع,...»
export const hlAttr = (map) => (map ? ` data-hl="${Object.entries(map).map(([c, k]) => `${c}:${k}`).join(',')}"` : '');

// ───── طبقة التلوين واللمس ─────
function layer(container) {
  const old = new Map();
  container.querySelectorAll(':scope > .lt-hit').forEach((h) => old.set(h.dataset.ci, h.className));
  container.querySelectorAll(':scope > .hlbox, :scope > .lt-hit').forEach((n) => n.remove());
  const cr = container.getBoundingClientRect();
  const place = (el, r) => { el.style.left = `${r.left - cr.left}px`; el.style.top = `${r.top - cr.top}px`; el.style.width = `${r.width}px`; el.style.height = `${r.height}px`; };
  const rangeOf = (node, c) => { const r = document.createRange(); r.setStart(node, c.s); r.setEnd(node, c.e); return r.getBoundingClientRect(); };
  container.querySelectorAll('.w[data-hl]').forEach((w) => {
    const node = w.firstChild; if (!node || node.nodeType !== 3) return;
    const cs = wordClusters(node.textContent);
    for (const part of w.dataset.hl.split(',')) {
      const [ci, kind] = part.split(':'); const c = cs[Number(ci)]; if (!c) continue;
      const r = rangeOf(node, c); if (!r.width) continue;
      const box = document.createElement('i'); box.className = `hlbox ${kind}`; box.setAttribute('aria-hidden', 'true'); place(box, r); container.appendChild(box);
    }
  });
  if (container.dataset.taps) {
    const node = container.firstChild; if (!node || node.nodeType !== 3) return;
    wordClusters(node.textContent).forEach((c, i) => {
      const r = rangeOf(node, c); if (!r.width) return;
      const hit = document.createElement('button'); hit.type = 'button'; hit.className = old.get(String(i)) || 'lt-hit'; hit.dataset.ci = String(i);
      hit.setAttribute('aria-label', `${i + 1}`); place(hit, r); container.appendChild(hit);
    });
  }
}
export function decorate(scope = document) { scope.querySelectorAll('.decor').forEach(layer); }
export function initDecor(root) {
  let raf = 0; const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => decorate(root)); };
  new MutationObserver((muts) => { if (muts.some((m) => [...m.addedNodes].some((n) => n.nodeType === 1 && !(n.classList.contains('hlbox') || n.classList.contains('lt-hit'))))) run(); }).observe(root, { childList: true, subtree: true });
  window.addEventListener('resize', run);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(run);
  run();
}
