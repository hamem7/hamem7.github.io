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
export async function ensureQuranLoaded() { 
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
                    const response = await fetch('https://api.alquran.cloud/v1/quran/quran-uthmani'); 
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    const data = await response.json(); 
                    // تحقق من شكل البيانات (114 سورة) قبل الكتابة حتى لا نخزّن استجابة ناقصة/تالفة كأنها المصحف
                    if (!data || !data.data || !Array.isArray(data.data.surahs) || data.data.surahs.length !== 114) {
                        throw new Error('BAD_QURAN_PAYLOAD');
                    }
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
