// reports/reportArchive.js
// ==========================================================
// 🗂️ أرشيف التقارير الصادرة: عند كل تصدير ناجح (صورة/PDF/واتساب) من تقارير التقييم الفردي أو الاختبار الثنائي أو
// الشهري تُحفظ نسخة صورة مضغوطة من التقرير + بياناته الوصفية (النوع، الطالب، التاريخ) تلقائياً، ليعرضها المعلم لاحقاً من
// شاشة «الشهادات والتقارير ← التقارير السابقة» ويعيد تنزيلها أو مشاركتها.
//
// لماذا صورة لا بيانات؟ التقارير الثلاثة تُرسم من ملفات ضخمة مستقلة وتعتمد على بيانات حية قد تتغير لاحقاً (درجات جديدة،
// تنظيف تلقائي)؛ والصورة تحفظ التقرير **كما صدر بالضبط** دون لمس منطق أي تقرير. تُحفظ بعرض ≤1100px وجودة JPEG 0.82
// (نحو 150–500KB للتقرير) وبسقف 60 تقريراً (الأقدم يُحذف تلقائياً).
//
// 🌟 العزل: الدالة المصدَّرة archiveReport لا ترمي أبداً (أي فشل يُبتلع) حتى لا يتعطل التصدير الأصلي بسببها.
// القاعدتان (meta للبيانات الوصفية الخفيفة / files للصور) منفصلتان حتى لا تُحمَّل الصور عند عرض القائمة.
// ==========================================================
const DB_NAME = 'DarHamReportsArchive';
const META = 'meta';
const FILES = 'files';
const MAX_REPORTS = 60;
const MAX_WIDTH = 1100;

let dbPromise = null;
function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id', autoIncrement: true });
            if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES, { keyPath: 'id' });
        };
        request.onsuccess = (e) => {
            const db = e.target.result;
            db.onversionchange = () => { try { db.close(); } catch (err) { /* لا شيء */ } dbPromise = null; };
            resolve(db);
        };
        request.onerror = () => { dbPromise = null; reject(request.error); };
        request.onblocked = () => console.warn('ترقية قاعدة أرشيف التقارير محجوبة بتبويب آخر للمنصة.');
    });
    return dbPromise;
}

function tx(stores, mode, fn) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const t = db.transaction(stores, mode);
        let out;
        fn(t, (v) => { out = v; });
        t.oncomplete = () => resolve(out);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error);
    }));
}

function canvasToJpegBlob(canvas) {
    const scale = Math.min(1, MAX_WIDTH / canvas.width);
    let src = canvas;
    if (scale < 1) {
        src = document.createElement('canvas');
        src.width = Math.round(canvas.width * scale);
        src.height = Math.round(canvas.height * scale);
        const ctx = src.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, src.width, src.height);
        ctx.drawImage(canvas, 0, 0, src.width, src.height);
    }
    return new Promise(resolve => src.toBlob(resolve, 'image/jpeg', 0.82)).then(blob => ({ blob, w: src.width, h: src.height }));
}

export function listArchivedReports() {
    return tx([META], 'readonly', (t, set) => { const r = t.objectStore(META).getAll(); r.onsuccess = () => set(r.result || []); })
        .then(list => list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
}

export function getArchivedReportFile(id) {
    return tx([FILES], 'readonly', (t, set) => { const r = t.objectStore(FILES).get(id); r.onsuccess = () => set(r.result ? r.result.blob : null); });
}

export function deleteArchivedReport(id) {
    return tx([META, FILES], 'readwrite', (t) => { t.objectStore(META).delete(id); t.objectStore(FILES).delete(id); });
}

/**
 * يحفظ التقرير المُصدَّر. kind: 'individual' | 'dual' | 'monthly'
 * name: اسم الطالب (أو «أ × ب» للاختبار الثنائي) | sub: سطر وصفي (النطاق/الشهر/التاريخ) | canvas: لقطة التقرير
 * التقرير نفسه (نفس النوع + الاسم + الوصف) يُستبدل بأحدث تصدير بدل التكرار (تصدير PNG ثم PDF لنفس التقرير = سجل واحد).
 */
export async function archiveReport({ kind, name, sub, canvas }) {
    try {
        if (!canvas || !canvas.width || !canvas.height || !window.indexedDB) return;
        const { blob, w, h } = await canvasToJpegBlob(canvas);
        if (!blob) return;
        const meta = { kind, name: String(name || ''), sub: String(sub || ''), w, h, size: blob.size, createdAt: Date.now() };
        const existing = (await listArchivedReports()).filter(r => r.kind === kind && r.name === meta.name && r.sub === meta.sub);
        const id = await tx([META, FILES], 'readwrite', (t, set) => {
            existing.forEach(r => { t.objectStore(META).delete(r.id); t.objectStore(FILES).delete(r.id); });
            const req = t.objectStore(META).add(meta);
            req.onsuccess = () => { t.objectStore(FILES).put({ id: req.result, blob }); set(req.result); };
        });
        const all = await listArchivedReports();
        if (all.length > MAX_REPORTS) await Promise.all(all.slice(MAX_REPORTS).map(r => deleteArchivedReport(r.id)));
        return id;
    } catch (err) {
        console.warn('تعذّر حفظ نسخة التقرير في الأرشيف:', err);
    }
}
