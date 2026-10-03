// database/quranDB.js

export const QURAN_DB_NAME = "DarHamDatabase";
export const QURAN_DB_VERSION = 1;
export const QURAN_STORE = "quran";

export function initQuranDB() { 
    return new Promise((resolve, reject) => { 
        let request = indexedDB.open(QURAN_DB_NAME, QURAN_DB_VERSION); 
        request.onupgradeneeded = (e) => { 
            let db = e.target.result; 
            if (!db.objectStoreNames.contains(QURAN_STORE)) {
                db.createObjectStore(QURAN_STORE, { keyPath: "number" }); 
            }
        }; 
        request.onsuccess = (e) => {
            const openedDb = e.target.result;
            // 🌟 [إصلاح تدقيق ما قبل الإطلاق] لو فُتحت المنصة في تبويبين وترقّى أحدهما هيكل القاعدة، كان الآخر يحجب الترقية بصمت
            // (تعليق/فشل الإقلاع). الآن يغلق التبويب القديم اتصاله عند طلب الترقية فتكمل الترقية في التبويب الجديد.
            openedDb.onversionchange = () => { try { openedDb.close(); } catch (err) { /* لا شيء */ } };
            resolve(openedDb);
        };
        // 🌟 ترقية محجوبة بتبويب آخر مفتوح: نُنبّه في الكونسول بدل الصمت (الفتح يكتمل تلقائياً بعد إغلاقه)
        request.onblocked = () => console.warn('ترقية قاعدة البيانات محجوبة بتبويب آخر للمنصة — أغلق التبويبات الأخرى.'); 
        request.onerror = (e) => reject(e.target.error); 
    }); 
}

// 🌟 [إصلاح تدقيق ما قبل الإطلاق] كانت هذه الدالة بلا أي معالجة أخطاء فعلية: لو فشل الإنترنت أو رجع الخادم
// خطأ HTTP أو JSON غير صالح، أو رُفضت الكتابة (امتلاء التخزين)، إما يبقى الـ Promise معلّقاً للأبد أو ينهار
// الإقلاع وتبقى الشاشة فارغة بلا أي رسالة. الآن: كل مسار فشل يُرفض بخطأ واضح (code = QURAN_LOAD_FAILED) ليعرضه
// core/app.js برسالة مفهومة وزر "إعادة المحاولة". لا تغيير في السلوك الناجح ولا في بنية البيانات.
// 🌟 [2026-10-03] مصدر نص المصحف: نسخة محلية مرفوعة مع المنصة نفسها (database/quran-uthmani.json — نفس استجابة
// alquran.cloud حرفياً، المبنية على نص "تنزيل" الموثّق) حتى لا يتوقف أول تشغيل على جهاز جديد على خادم خارجي.
// الرابط الخارجي يبقى احتياطياً فقط لو تعذّر الملف المحلي لأي سبب. كلا المصدرين يمرّان بنفس فحص الشكل (114 سورة).
const QURAN_SOURCES = [
    'database/quran-uthmani.json',
    'https://api.alquran.cloud/v1/quran/quran-uthmani'
];

async function fetchQuranPayload() {
    let lastError = null;
    for (const url of QURAN_SOURCES) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('HTTP ' + response.status + ' ' + url);
            const data = await response.json();
            // تحقق من شكل البيانات (114 سورة) قبل الكتابة حتى لا نخزّن استجابة ناقصة/تالفة كأنها المصحف
            if (!data || !data.data || !Array.isArray(data.data.surahs) || data.data.surahs.length !== 114) {
                throw new Error('BAD_QURAN_PAYLOAD ' + url);
            }
            return data;
        } catch (e) {
            lastError = e;
            console.warn('تعذّر تحميل نص المصحف من', url, e);
        }
    }
    throw lastError;
}

export async function ensureQuranLoaded() { 
    // 🌟 [2026-10-03] طلب "تخزين دائم" حتى لا يمسح المتصفح المصحف وبيانات الطلاب تلقائياً عند امتلاء الجهاز
    // (best-effort: بلا انتظار ولا أي رسالة للمستخدم، وأي رفض أو عدم دعم يُتجاهل بصمت)
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* لا شيء */ }

    const db = await initQuranDB(); 
    return new Promise((resolve, reject) => { 
        const fail = (cause) => {
            const err = new Error('QURAN_LOAD_FAILED');
            err.code = 'QURAN_LOAD_FAILED';
            err.cause = cause;
            reject(err);
        };
        let tx;
        try { tx = db.transaction(QURAN_STORE, "readonly"); } catch (e) { return fail(e); }
        const store = tx.objectStore(QURAN_STORE); 
        const countReq = store.count(); 
        countReq.onerror = () => fail(countReq.error);
        countReq.onsuccess = async () => { 
            if (countReq.result === 0) { 
                try { 
                    const data = await fetchQuranPayload();
                    const writeTx = db.transaction(QURAN_STORE, "readwrite"); 
                    const writeStore = writeTx.objectStore(QURAN_STORE); 
                    data.data.surahs.forEach(surah => writeStore.put(surah)); 
                    writeTx.oncomplete = () => resolve(db); 
                    writeTx.onerror = () => fail(writeTx.error);
                    writeTx.onabort = () => fail(writeTx.error);
                } catch (error) { fail(error); } 
            } else { 
                resolve(db); 
            } 
        }; 
    }); 
}
