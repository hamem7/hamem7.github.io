// database/monthlyMemorizationDB.js
// =============================================================================
// 🌟 [جديد] قاعدة بيانات "سجل الحفظ الشهري" — سجل واحد لكل (طالب × شهر ميلادي)
// يحفظ موضع بداية الشهر وموضع نهايته (سورة + رقم آية لكل منهما، وليس نطاقًا نصيًا
// كما في student.memoFrom/memoTo الحاليين)، وعدد الآيات المحفوظة حديثًا المحسوب
// آليًا (راجع engine/memorizationEngine.js لمنطق الحساب نفسه — لا يتكرر هنا).
//
// نفس نمط تهيئة بقية قواعد بيانات المنصة بالضبط (راجع database/reviewScheduleDB.js
// كمرجع مباشر): مخزن واحد بمفتاح تلقائي (autoIncrement) بلا أي index مخصّص،
// والفلترة (حسب الطالب/الشهر) تتم في الذاكرة عبر getAll — حجم الاستخدام المتوقع
// لمعلم واحد لا يستدعي تعقيدًا إضافيًا.
//
// ⚠️ [افتراض صريح]: "الشهر" هنا مخزَّن كرقم من 1 إلى 12 (وليس فهرسًا من 0 كما في
// بقية شاشات المنصة مثل reports/monthly-report.js) تجنبًا لأي التباس عند القراءة
// المباشرة لسجلات قاعدة البيانات لاحقًا — التحويل بين الاثنين يتم عند نقطة
// الاستخدام فقط (±1)، وليس داخل هذا الملف.
//
// 🌟 [قفل الشهر — القسم 22 من طلب الميزة]: بمجرد تأكيد "نهاية الشهر" (ending)
// يصبح السجل locked=true تلقائيًا، فلا يتغيّر بصمت لاحقًا حتى لو تغيّر نطاق حفظ
// الطالب الحالي بعدها. فتح السجل للتعديل يتطلب استدعاء صريح لـ unlockRecordForEdit
// (زر "تعديل سجل شهر سابق" في واجهة المستخدم)، وليس أي مسار ضمني آخر.
// =============================================================================

export function initMonthlyMemorizationDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("DarHamMonthlyMemorization", 1);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains("monthly_memorization")) {
                db.createObjectStore("monthly_memorization", { keyPath: "id", autoIncrement: true });
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

export class MonthlyMemorizationManager {
    constructor(db) {
        this.db = db;
    }

    _getAll() {
        return new Promise((resolve) => {
            const tx = this.db.transaction("monthly_memorization", "readonly");
            const store = tx.objectStore("monthly_memorization");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    _put(record) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("monthly_memorization", "readwrite");
            const store = tx.objectStore("monthly_memorization");
            const request = store.put(record);
            request.onsuccess = () => resolve(request.result);
        });
    }

    // كل سجلات طالب معيّن، مرتّبة زمنيًا تصاعديًا (الأقدم أولًا)
    async getAllForStudent(studentId) {
        const all = await this._getAll();
        return all
            .filter(r => String(r.studentId) === String(studentId))
            .sort((a, b) => (a.year - b.year) || (a.month - b.month));
    }

    // سجل شهر بعينه (شهر من 1 إلى 12) لطالب معيّن، أو null لو غير موجود
    async getRecord(studentId, year, month) {
        const mine = await this.getAllForStudent(studentId);
        return mine.find(r => r.year === year && r.month === month) || null;
    }

    // 🌟 آخر سجل لهذا الطالب تم تأكيد "نهايته" فعليًا (locked=true) — يُستخدم لتعبئة
    // موضع "بداية" الشهر التالي تلقائيًا (نفس موضع نهاية الشهر السابق)، تحقيقًا لمبدأ
    // "المعلم يسجّل الحقائق فقط، والنظام يحسب الباقي" (القسم 24 من طلب الميزة) — بلا
    // حاجة لإعادة اختيار نفس الموضع يدويًا كل شهر.
    async getLatestLockedRecord(studentId) {
        const mine = await this.getAllForStudent(studentId);
        const locked = mine.filter(r => r.locked && r.ending);
        return locked.length ? locked[locked.length - 1] : null;
    }

    // تسجيل/تحديث موضع "بداية الشهر" — يُرفَض بصمت (يرجع null) لو السجل مقفولًا
    // أصلاً ولم يُطلَب فتحه صراحةً أولًا عبر unlockRecordForEdit، حماية من الكتابة
    // فوق سجل شهر سابق مؤكَّد بالخطأ.
    async saveBeginning(studentId, year, month, position) {
        let record = await this.getRecord(studentId, year, month);
        if (record && record.locked) return null;
        const now = new Date().toISOString();
        if (!record) {
            record = {
                studentId, year, month,
                beginning: null, ending: null, newAyahs: null,
                locked: false, createdAt: now
            };
        }
        record.beginning = { ...position, recordedAt: now };
        record.updatedAt = now;
        const id = await this._put(record);
        record.id = record.id || id;
        return record;
    }

    // تسجيل/تحديث موضع "نهاية الشهر" + عدد الآيات الجديدة المحسوب مسبقًا (بواسطة
    // engine/memorizationEngine.js عند نقطة الاستدعاء) — يقفل السجل تلقائيًا.
    async saveEnding(studentId, year, month, position, newAyahs) {
        let record = await this.getRecord(studentId, year, month);
        if (record && record.locked) return null;
        const now = new Date().toISOString();
        if (!record) {
            // 🌟 حالة نادرة (نهاية شهر بلا بداية مسجَّلة أصلاً) — لا نمنعها، فقد يكون
            // المعلم بدأ استخدام هذه الميزة منتصف الشهر، لكن نُبقي beginning فارغًا
            // بصراحة بدل اختلاق قيمة له (بنفس مبدأ عدم الاختلاق العام لطلب الميزة)
            record = {
                studentId, year, month,
                beginning: null, ending: null, newAyahs: null,
                locked: false, createdAt: now
            };
        }
        record.ending = { ...position, recordedAt: now };
        record.newAyahs = typeof newAyahs === 'number' ? newAyahs : null;
        record.locked = true;
        record.updatedAt = now;
        const id = await this._put(record);
        record.id = record.id || id;
        return record;
    }

    // 🌟 [جديد] حفظ "مراجعة الشهر" (الأجزاء الخمسة — راجع engine/reviewParts.js) داخل سجل الشهر
    // نفسه بحقل review = { entries: [{juz, from:{surah,ayah}, to:{surah,ayah}}], recordedAt } (الصيغة القديمة parts ما زالت مقروءة). لا يتأثر
    // بقفل الشهر (القفل خاص بموضع الحفظ)، ولا يمس beginning/ending/newAyahs إطلاقًا. لو لا سجل
    // للشهر يُنشأ سجل بلا بداية/نهاية (وقد عُدِّل buildPendingQueue حتى لا يعدّه "طالبًا له سجل").
    async saveReview(studentId, year, month, review) {
        let record = await this.getRecord(studentId, year, month);
        const now = new Date().toISOString();
        if (!record) {
            record = {
                studentId, year, month,
                beginning: null, ending: null, newAyahs: null,
                locked: false, createdAt: now
            };
        }
        // review = { entries: [{juz, from:{surah,ayah}, to:{surah,ayah}}] } (الصيغة الجديدة — راجع engine/reviewParts.js)
        record.review = { ...(review || {}), recordedAt: now };
        record.updatedAt = now;
        const id = await this._put(record);
        record.id = record.id || id;
        return record;
    }

    // 🌟 "تعديل سجل شهر سابق" الصريح (القسم 22) — يفتح القفل فقط، لا يغيّر أي بيانة
    // أخرى بالسجل. بعدها يُستدعى saveBeginning/saveEnding عاديًا لتحديث القيم.
    async unlockRecordForEdit(studentId, year, month) {
        const record = await this.getRecord(studentId, year, month);
        if (!record) return null;
        record.locked = false;
        record.updatedAt = new Date().toISOString();
        await this._put(record);
        return record;
    }
}
