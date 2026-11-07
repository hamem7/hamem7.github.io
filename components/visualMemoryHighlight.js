// components/visualMemoryHighlight.js
// تظليل الآية المطلوبة بالأصفر على صورة صفحة المصحف في سؤال «الذاكرة البصرية» — يظهر فقط عند «إظهار الإجابة».
// البيانات: assets/mushaf/ayah/pNNN.json (نِسَب مئوية من الصورة؛ تُولَّد عبر .github/workflows/fetch-ayah-rects.yml).
// الطبقة <div class="vm-hl-layer" data-page data-s data-a> موضوعة فوق الصورة؛ إن لم توجد البيانات تبقى فارغة ولا يتأثر السؤال.
const pageCache = new Map();

function loadPage(n) {
    if (!pageCache.has(n)) {
        const url = `assets/mushaf/ayah/p${String(n).padStart(3, '0')}.json`;
        pageCache.set(n, fetch(url).then(r => (r.ok ? r.json() : null)).catch(() => null));
    }
    return pageCache.get(n);
}

export async function paintHighlightLayer(layer) {
    if (!layer) return;
    const page = +layer.dataset.page, s = +layer.dataset.s, a = +layer.dataset.a;
    layer.replaceChildren();
    layer.style.display = 'none';
    if (!page || !s || !a) return;
    const data = await loadPage(page);
    const rects = data && data[`${s}:${a}`];
    if (!rects || !rects.length) return;
    for (const [x1, y1, x2, y2] of rects) {
        const d = document.createElement('div');
        d.style.cssText = `position:absolute; left:${x1}%; top:${y1}%; width:${x2 - x1}%; height:${y2 - y1}%; background:rgba(255,214,0,.55); mix-blend-mode:multiply; border-radius:3px; opacity:0; transition:opacity .35s ease;`;
        layer.appendChild(d);
    }
    layer.style.display = 'block';
    requestAnimationFrame(() => requestAnimationFrame(() => { layer.querySelectorAll('div').forEach(d => { d.style.opacity = '1'; }); }));
}

// عند «إظهار الإجابة»: ظلّل الآية في كل طبقات السؤال الظاهرة
export function showVisualHighlights(root = document) {
    root.querySelectorAll('.vm-hl-layer[data-page]:not(#zoomModal .vm-hl-layer)').forEach(l => { paintHighlightLayer(l); });
}
// عند «إخفاء الإجابة»: أخفِ التظليل
export function hideVisualHighlights(root = document) {
    root.querySelectorAll('.vm-hl-layer').forEach(l => { l.style.display = 'none'; l.replaceChildren(); });
}

// نافذة التكبير: الصفحتان من اسم ملف الصورة، والآية من وسيطَي الدالة
export function paintZoomHighlights(imgR, imgL, s, a) {
    const pg = u => { const m = /page(\d+)\.webp/.exec(String(u || '')); return m ? +m[1] : 0; };
    [['zoom-hl-right', imgR], ['zoom-hl-left', imgL]].forEach(([id, src]) => {
        const l = document.getElementById(id);
        if (!l) return;
        l.dataset.page = pg(src); l.dataset.s = s || ''; l.dataset.a = a || '';
        paintHighlightLayer(l);
    });
}
