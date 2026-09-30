// database/studentDB.js

export function initStudentDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("DarHamStudents", 1);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains("students")) {
                db.createObjectStore("students", { keyPath: "id", autoIncrement: true });
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

// 🌟 [إصلاح تدقيق ما قبل الإطلاق] كانت كل دوال هذا المدير تحلّ الـ Promise عند request.onsuccess فقط، بلا أي onerror
// ولا انتظار لاكتمال المعاملة: لو فشلت الكتابة (امتلاء التخزين مثلاً) يبقى الـ Promise معلقاً للأبد فتظهر واجهة
// "تم الحفظ" أو تتجمّد الشاشة بينما لم يُحفظ الطالب. الآن: الكتابات تحلّ عند tx.oncomplete (تأكيد الحفظ الفعلي)
// وترفض عند الخطأ/الإلغاء. الواجهة العامة (أسماء الدوال والقيم المُرجعة) كما هي بلا أي تغيير.
export class StudentManager {
    constructor(db) {
        this.db = db;
    }

    getAllStudents() {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("students", "readonly");
            const store = tx.objectStore("students");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    addStudent(studentData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("students", "readwrite");
            const store = tx.objectStore("students");
            studentData.totalScore = 0;
            // 🌟 عدّادا المحاولات والإجابات الصحيحة — أساس حساب نسبة الإتقان الحقيقية
            // (0-100%) في بطاقة "نظرة سريعة" بالشاشة الرئيسية، بدل استخدام totalScore
            // التراكمي (نقاط بلا سقف) كأنه نسبة مئوية
            studentData.totalAttempts = 0;
            studentData.totalCorrect = 0;
            const request = store.add(studentData);
            let newId;
            request.onsuccess = () => { newId = request.result; };
            tx.oncomplete = () => resolve(newId);
            tx.onerror = () => reject(tx.error || request.error);
            tx.onabort = () => reject(tx.error || request.error);
        });
    }

    updateStudent(studentData) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("students", "readwrite");
            const store = tx.objectStore("students");
            const request = store.put(studentData);
            let key;
            request.onsuccess = () => { key = request.result; };
            tx.oncomplete = () => resolve(key);
            tx.onerror = () => reject(tx.error || request.error);
            tx.onabort = () => reject(tx.error || request.error);
        });
    }

    deleteStudent(id) {
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction("students", "readwrite");
            const store = tx.objectStore("students");
            store.delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }
}
