// core/quranFontEnhancer.js
//
// 🌟 [2026-10-22] نص القرآن أينما ظهر في المنصة يُرسم بخط المصحف (KFGQPC Uthmanic Hafs)، حتى لو وُلِّد داخل جملة عادية
// (مثل «ما معنى «سَلَٰمٌ»…»، شرائح الواجبات، عنوان الصفحة الرئيسية) لا يمرّ على صنف .quran-text.
// كيف: نلتقط الكلمات التي فيها علامات الرسم العثماني المميِّزة (ۡ ۟ ۠ ٰ ٱ ۥ ۦ وعلامات الوقف…) — لا توجد في الكلام العادي الذي يستعمل
// السكون ْ العادي — ونلفّ كل سلسلة متتالية منها بـ <span class="qf-run"> خطه المصحف. المراقبة خفيفة (تُجمَّع على إطار واحد).
const QMARK = /[ۖ-ۜ۟-۪ۨ-ٰۭٱ]/;
const SYMBOL = /^[۝۞۩﴾﴿]+$/;
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION', 'SVG', 'NOSCRIPT', 'TITLE', 'CODE']);
const QURAN_FONTS = /Uthmanic Hafs|Amiri Quran/i;

const isQuranToken = (tok) => QMARK.test(tok) || SYMBOL.test(tok);

function skipNode(el) {
    for (let p = el; p; p = p.parentElement) {
        if (SKIP_TAGS.has(p.tagName.toUpperCase())) return true;
        if (p.isContentEditable || (p.classList && p.classList.contains('qf-run'))) return true;
    }
    return false;
}

function enhanceTextNode(node) {
    const txt = node.nodeValue;
    if (!txt || !QMARK.test(txt)) return;
    const el = node.parentElement;
    if (!el || skipNode(el)) return;
    const fam = getComputedStyle(el).fontFamily.split(',')[0];
    if (QURAN_FONTS.test(fam)) return;   // خط القرآن أصلاً
    const parts = txt.split(/(\s+)/);   // الفواصل تُحفظ
    const out = [];
    let run = [], any = false;
    const flush = () => { if (run.length) { out.push({ q: true, s: run.join('') }); run = []; } };
    let pendingSpace = '';
    for (const part of parts) {
        if (/^\s+$/.test(part) || part === '') { pendingSpace += part; continue; }
        if (isQuranToken(part)) {
            if (run.length) run.push(pendingSpace); else if (pendingSpace) out.push({ q: false, s: pendingSpace });
            pendingSpace = ''; run.push(part); any = true;
        } else {
            flush();
            if (pendingSpace) out.push({ q: false, s: pendingSpace });
            pendingSpace = ''; out.push({ q: false, s: part });
        }
    }
    flush();
    if (pendingSpace) out.push({ q: false, s: pendingSpace });
    if (!any) return;
    const frag = document.createDocumentFragment();
    out.forEach((o) => {
        if (!o.q) { frag.appendChild(document.createTextNode(o.s)); return; }
        const sp = document.createElement('span');
        sp.className = 'qf-run';
        sp.textContent = o.s;
        frag.appendChild(sp);
    });
    node.replaceWith(frag);
}

function enhanceTree(root) {
    if (!root) return;
    if (root.nodeType === 3) { enhanceTextNode(root); return; }
    if (root.nodeType !== 1 || skipNode(root)) return;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    for (let n = w.nextNode(); n; n = w.nextNode()) if (n.nodeValue && QMARK.test(n.nodeValue)) nodes.push(n);
    nodes.forEach(enhanceTextNode);
}

export function startQuranFontEnhancer() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined' || window.__qfStarted) return;
    window.__qfStarted = true;
    const style = document.createElement('style');
    style.textContent = ".qf-run { font-family: 'Uthmanic Hafs', 'Amiri Quran', serif; font-weight: 400; font-synthesis: none; }";
    document.head.appendChild(style);
    let queue = new Set(), scheduled = false;
    const flush = () => { scheduled = false; const items = [...queue]; queue = new Set(); items.forEach((n) => { if (n.isConnected) enhanceTree(n); }); };
    const schedule = () => { if (!scheduled) { scheduled = true; requestAnimationFrame(flush); } };
    new MutationObserver((muts) => {
        for (const m of muts) {
            if (m.type === 'childList') m.addedNodes.forEach((n) => { if (n.nodeType === 1 || n.nodeType === 3) queue.add(n); });
            else if (m.type === 'characterData') queue.add(m.target);
        }
        schedule();
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    queue.add(document.body); schedule();
}
