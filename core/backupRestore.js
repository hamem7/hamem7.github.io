// core/backupRestore.js
// 🌟🌟 [جديد بالكامل] نظام "النسخة الاحتياطية المحلية" لكل بيانات المنصة — بناءً على سؤال
// صريح من المعلم عن مصير بيانات الطلاب عند تحديث الكود، ثم طلبه تذكيراً شهرياً بأخذ نسخة
// احتياطية تبقى على جهازه فقط بلا أي رفع على الإنترنت (نفس فلسفة "لمعلم واحد، بلا مزامنة
// سحابية إجبارية" المتّبعة في كل المشروع). هذا الملف مسؤول فقط عن آلية التصدير/الاسترجاع
// الخام (لا يلمس أي DOM ولا نصوص واجهة)؛ عناصر الواجهة نفسها موزّعة على:
//   - core/app.js: نافذة التذكير الشهري (checkMonthlyBackupReminder)
//   - components/teacherProfile.js + splash.html: زرا "نسخة احتياطية الآن" و"استرجاع"
//     داخل نافذة ملف المعلم (أقرب نقطة موجودة فعلاً لإعدادات المنصة العامة، لعدم وجود
//     شاشة "إعدادات" مستقلة بعد في المشروع).
//
// ⚠️ [افتراض صريح — بقرار المعلم]: النسخة الاحتياطية تشمل كل قاعدة بيانات IndexedDB في
// المنصة بلا أي استثناء، بما في ذلك تخزين نص القرآن المؤقت (DarHamDatabase) وملفات صوت
// آيات ركن الأطفال المؤقتة (DarHamKidsAudio) رغم كونها بيانات قابلة لإعادة التحميل من
// الإنترنت وليست "إنجاز طالب" فعلي — تحذيرنا من حجم الملف الأكبر بسبب الصوتيات وُوجِه
// باختيار المعلم الصريح "كل شيء بلا استثناء" على أن يبقى الأمر بسيطاً وواحداً بلا فلترة.
//
// ⚠️ [افتراض صريح — عُدِّل بعد تدقيق ما قبل الإطلاق]: النسخة تشمل IndexedDB + مفاتيح بيانات الطلاب في localStorage
// (history_* وdarham_avatar_* وغيرها، راجع isBackupLocalStorageKey أعلاه)؛ أما باقي المفاتيح (اللغة،...) فلا تدخل.
// (النص الأصلي القديم للافتراض: قواعد IndexedDB فقط، وليس مفاتيح localStorage
// (اللغة المختارة، آخر إصدار شوهد، تلميحات الأقسام...) لأنها إعدادات عرض/تذكيرات جهاز بحتة
// وليست "بيانات" يخشى المعلم ضياعها، وإعادة ضبطها تلقائياً بعد أي استرجاع غير ضارة إطلاقاً.

import { APP_VERSION } from './version.js';

// 🌟🌟 [إصلاح تدقيق ما قبل الإطلاق] سجل التقييمات (history_<id>) وصور الطلاب (darham_avatar_<id>) وعدّاد التقارير
// وبيانات المعلم القديمة تعيش في localStorage وليست في IndexedDB، وكانت النسخة الشاملة تتجاهلها فتضيع عند الاسترجاع
// على جهاز جديد. هذا التصحيح يضيف هذه المفاتيح فقط (لا اللغة ولا التلميحات) تحت حقل جديد localStorageData
// داخل الملف، بحيث تبقى الملفات القديمة (بلا هذا الحقل) قابلة للاسترجاع كما كانت (توافق خلفي) 🌟
function isBackupLocalStorageKey(key) {
    return key.startsWith('history_') || key.startsWith('darham_avatar_') ||
           key === 'darham_reports_log' || key === 'darham_teacher_name' || key === 'darham_teacher_signature';
}
function collectBackupLocalStorage() {
    const out = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && isBackupLocalStorageKey(key)) out[key] = localStorage.getItem(key);
        }
    } catch (e) { console.warn('تعذر قراءة localStorage للنسخة الاحتياطية:', e); }
    return out;
}

const LAST_BACKUP_STORAGE_KEY = 'dh_last_backup_at';

// 🛟 [جديد — الاستعادة الآمنة] لقطة أمان تُحفظ تلقائياً قبل أي استعادة (والتراجع عنها)، في قاعدة مستقلة لا تدخل
// أبداً في النسخ الاحتياطي ولا تُمسح بالاستعادة. نحتفظ بآخر 3 لقطات فقط. اللقطة تستثني القاعدتين القابلتين لإعادة التحميل
// (نص القرآن وصوت الأطفال) لتبقى صغيرة؛ والاستعادة منها لا تلمسهما لأنهما غائبتان عن حمولتها.
const SAFETY_DB_NAME = 'DarHamSafety';
const SAFETY_STORE = 'snapshots';
const SAFETY_KEEP = 3;
const SAFETY_SKIP_DBS = ['DarHamDatabase', 'DarHamKidsAudio'];

// 🌟 خط رجوع لو تعذّر سرد قواعد البيانات تلقائياً (راجع listAllDatabaseNames أدناه) —
// قائمة يدوية بكل أسماء قواعد بيانات المنصة الحالية (راجع كل ملف database/*.js). أي قاعدة
// بيانات جديدة تُضاف للمشروع مستقبلاً يجب إضافة اسمها هنا أيضاً حتى تبقى مشمولة في هذا
// الخط الاحتياطي، رغم أن المسار الأساسي (indexedDB.databases) لا يحتاج لهذا التحديث اليدوي.
const KNOWN_DB_NAMES_FALLBACK = [
    'DarHamStudents',
    'DarHamHomeworks',
    'DarHamTeacher',
    'DarHamDatabase',
    'DarHamRecitation',
    'DarHamReviewSchedule',
    'DarHamSimilarities',
    'DarHamDualTests',
    'DarHamKidsAudio',
    // 🌟 [إصلاح تدقيق] قاعدتان فعليتان كانتا ناقصتين من القائمة اليدوية (تُستخدمان فقط لو indexedDB.databases() غير مدعومة)
    'DarHamTajweed',
    'DarHamMonthlyMemorization',
    // 🌟 [جديد — الواجب الذكي] سجل أداء الطالب (database/trackingDB.js)
    'DarHamTracking',
    // 🏅 سجل الشهادات الصادرة (certificates/certificatesDB.js)
    'DarHamCertificates'
];

// 🌟 سرد كل قواعد بيانات المنصة تلقائياً عبر indexedDB.databases() المدمجة في المتصفح
// (مدعومة في Chrome/Edge وFirefox وSafari الحديثة — نفضّلها على أي قائمة يدوية لأنها تلتقط
// أي قاعدة بيانات جديدة تُضاف للمشروع مستقبلاً بلا حاجة لتعديل هذا الملف). لو المتصفح لا
// يدعمها أو رجعت فارغة لأي سبب، نرجع للقائمة اليدوية أعلاه كخط رجوع آمن.
async function listAllDatabaseNames() {
    if (typeof indexedDB.databases === 'function') {
        try {
            const list = await indexedDB.databases();
            const names = (list || []).map(d => d.name).filter(Boolean).filter(n => n !== SAFETY_DB_NAME);
            if (names.length > 0) return names;
        } catch (e) {
            console.warn('تعذر سرد قواعد بيانات المنصة تلقائياً، سيُستخدم الخط الاحتياطي الثابت:', e);
        }
    }
    return KNOWN_DB_NAMES_FALLBACK.slice();
}

function openDbByName(name) {
    return new Promise((resolve, reject) => {
        // 🌟 فتح بلا تحديد رقم إصدار عمداً: يفتح القاعدة بإصدارها الحالي كما هو (بدون أي
        // onupgradeneeded)، فلا يخاطر هذا الملف أبداً بتعديل هيكل أي قاعدة بيانات — تلك
        // مسؤولية init*DB() الخاصة بكل قاعدة في database/*.js فقط.
        const request = indexedDB.open(name);
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

function getAllFromStore(db, storeName) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 🌟 تحويل Blob (زي صوت آية مخزَّن في kidsAudioDB) إلى نص Base64 قابل للتضمين داخل JSON —
// بتقسيم المصفوفة لأجزاء صغيرة (chunkSize) قبل String.fromCharCode حتى لا نتجاوز الحد
// الأقصى لعدد المعاملات المسموح به دفعة واحدة في بعض المتصفحات مع الملفات الكبيرة نسبياً.
async function blobToBase64(blob) {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
}

// عكس العملية أعلاه بالضبط — يُعيد بناء Blob من نص Base64 المخزَّن في ملف النسخة الاحتياطية
function base64ToBlob(base64, mimeType) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
}

// 🌟 كل سجلات المنصة حالياً مسطّحة (بلا كائنات متداخلة) بحقل Blob واحد كحد أقصى (حقل
// blob في kidsAudioDB) — لذلك فحص سطحي (مستوى واحد فقط من الحقول) كافٍ تماماً، ولا حاجة
// لفحص متكرر (recursive) أعمق من ذلك حالياً.
async function serializeRecordForExport(record) {
    if (!record || typeof record !== 'object') return record;
    const out = {};
    for (const [key, value] of Object.entries(record)) {
        if (value instanceof Blob) {
            out[key] = { __dh_blob__: true, mimeType: value.type || '', base64: await blobToBase64(value) };
        } else {
            out[key] = value;
        }
    }
    return out;
}

function deserializeRecordFromBackup(record) {
    if (!record || typeof record !== 'object') return record;
    const out = {};
    for (const [key, value] of Object.entries(record)) {
        if (value && typeof value === 'object' && value.__dh_blob__) {
            out[key] = base64ToBlob(value.base64, value.mimeType);
        } else {
            out[key] = value;
        }
    }
    return out;
}

// 🌟 يبني كائن النسخة الاحتياطية الكامل (كل قاعدة بيانات ← كل مخزن ← كل سجلاتها) بلا كتابته
// كملف بعد — مفصولة عن exportFullBackup() أدناه حتى يسهل اختبارها/استخدامها مستقبلاً
// (مثلاً لعرض حجم تقديري قبل التنزيل) دون تكرار منطق القراءة نفسه.
export async function buildBackupPayload({ skipDbs = [] } = {}) {
    const dbNames = (await listAllDatabaseNames()).filter(n => !skipDbs.includes(n));
    const databases = {};

    for (const dbName of dbNames) {
        let db;
        try {
            db = await openDbByName(dbName);
        } catch (e) {
            console.warn(`تعذر فتح قاعدة البيانات "${dbName}" أثناء التصدير، سيتم تخطّيها:`, e);
            continue;
        }

        const storeNames = Array.from(db.objectStoreNames || []);
        const stores = {};
        for (const storeName of storeNames) {
            try {
                const records = await getAllFromStore(db, storeName);
                stores[storeName] = await Promise.all(records.map(serializeRecordForExport));
            } catch (e) {
                console.warn(`تعذرت قراءة المخزن "${storeName}" من "${dbName}" أثناء التصدير، سيتم تخطّيه:`, e);
            }
        }

        databases[dbName] = { version: db.version, stores };
        db.close();
    }

    return {
        meta: {
            app: 'dar-ham',
            appVersion: APP_VERSION,
            exportedAt: new Date().toISOString()
        },
        databases,
        // 🌟 [إصلاح تدقيق] بيانات الطلاب المخزنة في localStorage (سجل التقييمات، الصور...)
        localStorageData: collectBackupLocalStorage()
    };
}

// 🌟 الدالة التي تستدعيها الواجهة فعلياً: تبني النسخة الاحتياطية وتنزّلها مباشرة كملف على
// جهاز المعلم (Blob + رابط تنزيل مؤقت، بلا أي رفع لأي سيرفر) ثم تسجّل توقيت آخر نسخة
// احتياطية محلياً (لعرضها في نافذة ملف المعلم وتحديد موعد التذكير الشهري القادم).
export async function exportFullBackup() {
    const payload = await buildBackupPayload();
    const json = JSON.stringify(payload);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const dateStamp = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `دار-حم-نسخة-احتياطية-${dateStamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    localStorage.setItem(LAST_BACKUP_STORAGE_KEY, new Date().toISOString());
    try { document.dispatchEvent(new CustomEvent('dh:local-backup-done')); } catch (e) { /* لا شيء */ }
}

// يُستخدم من نافذة ملف المعلم لعرض "آخر نسخة احتياطية: ..." — يرجع null لو لم تُؤخَذ أي
// نسخة بعد على هذا الجهاز (حالة طبيعية تماماً، لا تختلف عن أي بيانات اختيارية أخرى بالمنصة)
export function getLastBackupAt() {
    return localStorage.getItem(LAST_BACKUP_STORAGE_KEY);
}

// ---------- لقطة الأمان ----------
function openSafetyDb() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(SAFETY_DB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(SAFETY_STORE)) db.createObjectStore(SAFETY_STORE, { keyPath: 'id', autoIncrement: true });
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = (e) => reject(e.target.error);
    });
}
function idbTx(db, mode, fn) {
    return new Promise((resolve, reject) => {
        const tx = db.transaction(SAFETY_STORE, mode);
        let out;
        try { out = fn(tx.objectStore(SAFETY_STORE)); } catch (e) { reject(e); return; }
        tx.oncomplete = () => resolve(out && 'result' in out ? out.result : out);
        tx.onerror = (e) => reject(e.target.error);
        tx.onabort = (e) => reject(e.target.error || new Error('tx aborted'));
    });
}

/** يحفظ لقطة من الوضع الحالي ويُبقي آخر SAFETY_KEEP فقط. يرمي خطأ لو تعذّر الحفظ (فتُلغى الاستعادة). */
export async function saveSafetySnapshot(reason = 'restore') {
    const payload = await buildBackupPayload({ skipDbs: SAFETY_SKIP_DBS });
    payload.meta.kind = 'safety';
    const db = await openSafetyDb();
    try {
        await idbTx(db, 'readwrite', (store) => {
            store.add({ createdAt: new Date().toISOString(), reason, payload: JSON.stringify(payload) });
        });
        const keys = await idbTx(db, 'readonly', (store) => store.getAllKeys());
        const extra = (keys || []).sort((a, b) => a - b).slice(0, Math.max(0, keys.length - SAFETY_KEEP));
        if (extra.length) await idbTx(db, 'readwrite', (store) => { extra.forEach(k => store.delete(k)); });
    } finally { db.close(); }
}

async function readLatestSafety() {
    if (typeof indexedDB.databases === 'function') {
        try {
            const list = await indexedDB.databases();
            if (!(list || []).some(d => d.name === SAFETY_DB_NAME)) return null;   // لا ننشئ القاعدة فارغة بلا داعٍ
        } catch (e) { /* نكمل بالمحاولة العادية */ }
    }
    const db = await openSafetyDb();
    try {
        const all = await idbTx(db, 'readonly', (store) => store.getAll());
        const rows = (all || []).sort((a, b) => a.id - b.id);
        return rows.length ? rows[rows.length - 1] : null;
    } finally { db.close(); }
}

/** { createdAt } لآخر لقطة أمان، أو null لو لا توجد (لإظهار زر «التراجع عن آخر استعادة»). */
export async function getSafetySnapshotInfo() {
    try { const r = await readLatestSafety(); return r ? { createdAt: r.createdAt } : null; }
    catch (e) { return null; }
}

// ---------- قراءة النسخة والتحقق منها (بلا أي تعديل للبيانات) ----------
async function parseBackupFile(file) {
    const text = await file.text();
    let payload;
    try {
        payload = JSON.parse(text);
    } catch (e) {
        throw new Error('INVALID_JSON');
    }
    // 🌟 [إصلاح فحص الأزرار] ملف "سجل الطلاب" (format: darham_backup أو مصفوفة طلاب قديمة) صيغة مختلفة
    // عن النسخة الشاملة؛ نميّزه برمز خطأ خاص لتُعرض للمعلم رسالة توضّح أين يستعيده بدل "ملف غير صالح" 🌟
    if (Array.isArray(payload) || (payload && payload.format === 'darham_backup')) {
        throw new Error('STUDENTS_ONLY_BACKUP');
    }
    if (!payload || typeof payload !== 'object' || !payload.databases || typeof payload.databases !== 'object') {
        throw new Error('INVALID_FORMAT');
    }
    return payload;
}

function countStudentsIn(payload) {
    const st = payload && payload.databases && payload.databases.DarHamStudents &&
        payload.databases.DarHamStudents.stores && payload.databases.DarHamStudents.stores.students;
    return Array.isArray(st) ? st.length : 0;
}

async function countCurrentStudents() {
    try {
        const db = await openDbByName('DarHamStudents');
        try {
            if (!db.objectStoreNames.contains('students')) return 0;
            return (await getAllFromStore(db, 'students')).length;
        } finally { db.close(); }
    } catch (e) { return 0; }
}

/** معلومات للعرض قبل التأكيد: تاريخ النسخة وعدد الطلاب فيها مقابل الحاليين. يرمي نفس أخطاء الاسترجاع للملف غير الصالح. */
export async function inspectBackupFile(file) {
    const payload = await parseBackupFile(file);
    return {
        exportedAt: (payload.meta && payload.meta.exportedAt) || null,
        studentsInBackup: countStudentsIn(payload),
        studentsNow: await countCurrentStudents()
    };
}

// ---------- تطبيق حمولة على الجهاز ----------
// كل مخزن موجود في الحمولة يُفرَّغ ثم تُدرَج سجلاتها (استرجاع مطابق للحمولة)؛ لذلك لا يُستدعى إلا بعد لقطة أمان.
// مخزن موجود في الحمولة لكن غير موجود في هذا الإصدار من الكود يُتخطّى بأمان (توافق خلفي/أمامي).
async function applyPayload(payload) {
    let restoredStores = 0;
    let restoredRecords = 0;
    let skippedStores = 0;
    let failedStores = 0;

    for (const [dbName, dbPayload] of Object.entries(payload.databases)) {
        if (dbName === SAFETY_DB_NAME) continue;   // لقطات الأمان لا تُستبدل أبداً بمحتوى ملف
        let db;
        try {
            db = await openDbByName(dbName);
        } catch (e) {
            console.warn(`تعذر فتح قاعدة البيانات "${dbName}" أثناء الاسترجاع، سيتم تخطّيها بالكامل:`, e);
            continue;
        }

        const stores = (dbPayload && dbPayload.stores) || {};
        for (const [storeName, records] of Object.entries(stores)) {
            if (!db.objectStoreNames.contains(storeName)) {
                console.warn(`المخزن "${storeName}" غير موجود في قاعدة "${dbName}" الحالية، تم تخطّيه.`);
                skippedStores++;
                continue;
            }
            try {
                // 🌟 [إصلاح] مخزن الطلاب: قبل التفريغ نقرأ السجلات الحالية، وأي طالب سجله في
                // النسخة الاحتياطية بلا صورة نُبقي له صورته الحالية بدل أن تُمحى بالاسترجاع 🌟
                let existingAvatarById = null;
                if (dbName === 'DarHamStudents' && storeName === 'students') {
                    try {
                        const current = await getAllFromStore(db, storeName);
                        existingAvatarById = new Map(current.filter(x => x && x.avatar).map(x => [x.id, x.avatar]));
                    } catch (e) { existingAvatarById = null; }
                }
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(storeName, 'readwrite');
                    const store = tx.objectStore(storeName);
                    store.clear();
                    (records || []).forEach(record => {
                        const restored = deserializeRecordFromBackup(record);
                        if (existingAvatarById && restored && !restored.avatar && existingAvatarById.has(restored.id)) {
                            restored.avatar = existingAvatarById.get(restored.id);
                        }
                        store.put(restored);
                    });
                    tx.oncomplete = () => resolve();
                    tx.onerror = (e) => reject(e.target.error);
                    tx.onabort = (e) => reject(e.target.error || new Error('tx aborted'));   // مثلاً امتلاء التخزين: يُعدّ فشلاً فيُرجَع الوضع السابق
                });
                restoredStores++;
                restoredRecords += (records || []).length;
            } catch (e) {
                failedStores++;
                console.warn(`تعذر استرجاع المخزن "${storeName}" من "${dbName}":`, e);
            }
        }
        db.close();
    }

    // 🌟 [إصلاح تدقيق] استرجاع مفاتيح localStorage الخاصة بالطلاب (لو موجودة في الملف؛ الملفات القديمة بلا الحقل تُتخطّى)
    let restoredLocalKeys = 0;
    const lsData = payload.localStorageData;
    if (lsData && typeof lsData === 'object') {
        for (const [key, value] of Object.entries(lsData)) {
            if (!isBackupLocalStorageKey(key) || typeof value !== 'string') continue;
            try { localStorage.setItem(key, value); restoredLocalKeys++; }
            catch (e) { console.warn('تعذر استرجاع مفتاح localStorage', key, e); }
        }
    }

    return { restoredStores, restoredRecords, skippedStores, failedStores, restoredLocalKeys };
}

/**
 * استرجاع نسخة احتياطية من ملف اختاره المعلم — آمن: (1) يتحقق من الملف قبل أي تعديل، (2) يحفظ لقطة أمان من الوضع الحالي
 * (وإن تعذّر حفظها تُلغى الاستعادة ولا يُمسّ شيء: SAFETY_SNAPSHOT_FAILED)، (3) يطبّق، وإن فشل أي مخزن يُرجع الوضع السابق
 * تلقائياً من اللقطة (RESTORE_FAILED_ROLLED_BACK). يمكن للمعلم لاحقاً التراجع يدوياً عبر restoreFromSafetySnapshot().
 * أخطاء ملف غير صالح: INVALID_JSON / INVALID_FORMAT / STUDENTS_ONLY_BACKUP.
 */
export async function restoreFromBackupFile(file) {
    const payload = await parseBackupFile(file);
    try { await saveSafetySnapshot('before-restore'); }
    catch (e) { console.error('تعذر حفظ لقطة الأمان، أُلغيت الاستعادة:', e); throw new Error('SAFETY_SNAPSHOT_FAILED'); }

    const result = await applyPayload(payload);
    if (result.failedStores > 0) {
        try {
            const snap = await readLatestSafety();
            if (snap) await applyPayload(JSON.parse(snap.payload));
        } catch (e) { console.error('تعذر الرجوع للوضع السابق بعد فشل الاستعادة:', e); }
        throw new Error('RESTORE_FAILED_ROLLED_BACK');
    }
    return result;
}

/** التراجع عن آخر استعادة: يعيد الوضع الذي كان قبلها. يحفظ قبل ذلك لقطة جديدة من الوضع الحالي (فيمكن التراجع عن التراجع). */
export async function restoreFromSafetySnapshot() {
    const snap = await readLatestSafety();
    if (!snap) throw new Error('NO_SAFETY_SNAPSHOT');
    const payload = JSON.parse(snap.payload);
    try { await saveSafetySnapshot('before-undo'); }
    catch (e) { throw new Error('SAFETY_SNAPSHOT_FAILED'); }
    return applyPayload(payload);
}
