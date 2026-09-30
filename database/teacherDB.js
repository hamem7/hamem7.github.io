// database/teacherDB.js
// 🌟 ملف ملف المعلم الشخصي (اسم، صورة، تاريخ ميلاد، الختم) — تطبيقنا مخصص لمعلم واحد
// فقط، لذلك نكتفي بسجل واحد ثابت المعرّف (id: 'main') بدل نظام حسابات متعددة.
// نفس نمط بقية ملفات database/*.js في المشروع (IndexedDB) للتناسق ولأن الصورة/الختم
// قد تكون صوراً كبيرة نسبياً (base64) لا يصلح تخزينها في localStorage المحدود بحجم صغير جداً.

const PROFILE_ID = 'main';

export function initTeacherDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("DarHamTeacher", 1);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains("profile")) {
                db.createObjectStore("profile", { keyPath: "id" });
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

export class TeacherManager {
    constructor(db) {
        this.db = db;
    }

    // يُعيد null إن لم يكمل المعلم بياناته بعد (حالة طبيعية تماماً، وليست خطأ)
    getProfile() {
        return new Promise((resolve) => {
            try {
                const tx = this.db.transaction("profile", "readonly");
                const store = tx.objectStore("profile");
                const request = store.get(PROFILE_ID);
                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => resolve(null);
            } catch (e) {
                console.warn("تعذر قراءة ملف المعلم:", e);
                resolve(null);
            }
        });
    }

    // 🌟 حفظ جزئي دائماً: أي حقل غير مُمرَّر يبقى كما كان محفوظاً سابقاً، حتى لا يفقد
    // المعلم الختم مثلاً عند حفظ الاسم فقط من نافذة مختلفة.
    async saveProfile(partialData) {
        const existing = (await this.getProfile()) || {};
        const record = { ...existing, ...partialData, id: PROFILE_ID };
        return new Promise((resolve) => {
            const tx = this.db.transaction("profile", "readwrite");
            const store = tx.objectStore("profile");
            const request = store.put(record);
            request.onsuccess = () => resolve(record);
        });
    }
}
