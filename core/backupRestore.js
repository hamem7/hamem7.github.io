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
// ⚠️ [افتراض صريح]: النسخة الاحتياطية تشمل قواعد IndexedDB فقط، وليس مفاتيح localStorage
// (اللغة المختارة، آخر إصدار شوهد، تلميحات الأقسام...) لأنها إعدادات عرض/تذكيرات جهاز بحتة
// وليست "بيانات" يخشى المعلم ضياعها، وإعادة ضبطها تلقائياً بعد أي استرجاع غير ضارة إطلاقاً.

import { APP_VERSION } from './version.js';

const LAST_BACKUP_STORAGE_KEY = 'dh_last_backup_at';

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
    'DarHamKidsAudio'
];

// 🌟 سرد كل قواعد بيانات المنصة تلقائياً عبر indexedDB.databases() المدمجة في المتصفح
// (مدعومة في Chrome/Edge وFirefox وSafari الحديثة — نفضّلها على أي قائمة يدوية لأنها تلتقط
// أي قاعدة بيانات جديدة تُضاف للمشروع مستقبلاً بلا حاجة لتعديل هذا الملف). لو المتصفح لا
// يدعمها أو رجعت فارغة لأي سبب، نرجع للقائمة اليدوية أعلاه كخط رجوع آمن.
async function listAllDatabaseNames() {
    if (typeof indexedDB.databases === 'function') {
        try {
            const list = await indexedDB.databases();
            const names = (list || []).map(d => d.name).filter(Boolean);
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
export async function buildBackupPayload() {
    const dbNames = await listAllDatabaseNames();
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
        databases
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
}

// يُستخدم من نافذة ملف المعلم لعرض "آخر نسخة احتياطية: ..." — يرجع null لو لم تُؤخَذ أي
// نسخة بعد على هذا الجهاز (حالة طبيعية تماماً، لا تختلف عن أي بيانات اختيارية أخرى بالمنصة)
export function getLastBackupAt() {
    return localStorage.getItem(LAST_BACKUP_STORAGE_KEY);
}

// 🌟 استرجاع نسخة احتياطية من ملف اختاره المعلم — يرمي استثناءً بنص واضح (INVALID_JSON أو
// INVALID_FORMAT) لو الملف تالف أو ليس نسخة احتياطية من دار حم أصلاً، تتولى الواجهة ترجمته
// لرسالة مناسبة للمعلم. كل مخزن يُفرَّغ بالكامل (store.clear()) قبل إعادة إدراج سجلات
// النسخة الاحتياطية فيه — استرجاع مطابق تماماً للحظة أخذ النسخة، بلا سجلات "يتيمة" قديمة
// متبقية من قبل الاسترجاع. مخزن موجود في ملف النسخة الاحتياطية لكن غير موجود في هذا الإصدار
// من الكود الحالي يُتخطّى بأمان (توافق خلفي/أمامي، بنفس فلسفة المشروع في عدم كسر أي شيء).
export async function restoreFromBackupFile(file) {
    const text = await file.text();
    let payload;
    try {
        payload = JSON.parse(text);
    } catch (e) {
        throw new Error('INVALID_JSON');
    }
    if (!payload || typeof payload !== 'object' || !payload.databases || typeof payload.databases !== 'object') {
        throw new Error('INVALID_FORMAT');
    }

    let restoredStores = 0;
    let restoredRecords = 0;
    let skippedStores = 0;

    for (const [dbName, dbPayload] of Object.entries(payload.databases)) {
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
                await new Promise((resolve, reject) => {
                    const tx = db.transaction(storeName, 'readwrite');
                    const store = tx.objectStore(storeName);
                    store.clear();
                    (records || []).forEach(record => {
                        store.put(deserializeRecordFromBackup(record));
                    });
                    tx.oncomplete = () => resolve();
                    tx.onerror = (e) => reject(e.target.error);
                });
                restoredStores++;
                restoredRecords += (records || []).length;
            } catch (e) {
                console.warn(`تعذر استرجاع المخزن "${storeName}" من "${dbName}":`, e);
            }
        }
        db.close();
    }

    return { restoredStores, restoredRecords, skippedStores };
}
