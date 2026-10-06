// certificates/certificatesDB.js
// ==========================================================
// 🏅 سجل الشهادات الصادرة (IndexedDB: DarHamCertificates). نحفظ "لقطة بيانات" صغيرة لكل شهادة (النوع، الطالب، التفاصيل،
// الصيغة، القالب، التاريخ) لا الصورة نفسها — فتُعاد الشهادة طبق الأصل بأي وقت وبحجم بسيط. نفس نمط بقية قواعد المنصة.
// ==========================================================
const DB_NAME = 'DarHamCertificates';
const STORE = 'issued';
const MAX_RECORDS = 500;   // سقف يمنع تضخّم البيانات؛ الأقدم يُحذف تلقائياً عند التجاوز

let dbPromise = null;
function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
        };
        request.onsuccess = (e) => {
            const db = e.target.result;
            db.onversionchange = () => { try { db.close(); } catch (err) { /* لا شيء */ } dbPromise = null; };
            resolve(db);
        };
        request.onerror = () => { dbPromise = null; reject(request.error); };
        request.onblocked = () => console.warn('ترقية قاعدة الشهادات محجوبة بتبويب آخر للمنصة.');
    });
    return dbPromise;
}

function run(mode, fn) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let out;
        fn(store, (v) => { out = v; });
        tx.oncomplete = () => resolve(out);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
    }));
}

export function getAllCertificates() {
    return run('readonly', (store, set) => { const r = store.getAll(); r.onsuccess = () => set(r.result || []); })
        .then(list => list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
}

export async function addCertificate(record) {
    const id = await run('readwrite', (store, set) => { const r = store.add({ ...record, createdAt: Date.now() }); r.onsuccess = () => set(r.result); });
    try {
        const all = await getAllCertificates();
        if (all.length > MAX_RECORDS) await Promise.all(all.slice(MAX_RECORDS).map(r => deleteCertificate(r.id)));
    } catch (e) { /* التنظيف اختياري */ }
    return id;
}

export function deleteCertificate(id) {
    return run('readwrite', (store) => { store.delete(id); });
}
