// database/dualTestsDB.js
//
// 🌟 [تحديث كامل] كان هذا الملف هيكلاً فارغاً تماماً (مخزن dual_tests بلا أي تصميم حقول
// فعلي، ودالتان فقط getAllTests/saveTest). تم بناء تصميم البيانات الكامل هنا بناءً على نقاش
// تفصيلي مطوَّل مع المعلم (راجع مستند المشروع "تصميم-نظام-الاختبارات-الثنائية.md" لكل تفاصيل
// القرارات). الفكرة الجوهرية: فصل "الاختبار المحفوظ" (بنك أسئلة قابل لإعادة الاستخدام مع
// طلاب مختلفين) عن "المواجهة الفعلية" (تشغيل حقيقي لطالبين محددين على هذا الاختبار) — بالضبط
// زي فصل homeworkDB (تعريف الواجب) عن تسليمات الطلاب، تجنباً لتكرار كتابة الأسئلة كل مرة. 🌟

export const DUALTESTS_DB_NAME = "DarHamDualTests";
// 🌟 رفعنا رقم الإصدار من 1 إلى 2 لإضافة مخزن dual_matches، ومن 2 إلى 3 لإضافة مخزن
// dual_test_achievements (الأوسمة/الإنجازات) — نفس فلسفة النمو التدريجي: onupgradeneeded
// يتحقق من كل مخزن على حدة قبل إنشائه، فلا يفقد أي معلم بياناته الموجودة فعلاً.
export const DUALTESTS_DB_VERSION = 3;
export const DUALTESTS_STORE = "dual_tests";
// 🌟 مخزن المواجهات الفعلية المُلعَبة — منفصل عن بنك الأسئلة
export const DUALMATCHES_STORE = "dual_matches";
// 🌟 [جديد] مخزن أوسمة/إنجازات "الاختبارات الثنائية" — سجل واحد لكل وسام حصل عليه طالب،
// يُقرأ لعرضه في ملف الطالب الشخصي (راجع student/student.js)
export const DUALTEST_ACHIEVEMENTS_STORE = "dual_test_achievements";

export function initDualTestsDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open(DUALTESTS_DB_NAME, DUALTESTS_DB_VERSION);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains(DUALTESTS_STORE)) {
                db.createObjectStore(DUALTESTS_STORE, { keyPath: "id", autoIncrement: true });
            }
            // 🌟 مخزن المواجهات — مرتبط بالاختبار عبر الحقل testId (بلا فهرس منفصل
            // حالياً، حجم الاستخدام المتوقع لمعلم واحد لا يستدعي index مخصصاً؛ getAll ثم
            // فلترة بالذاكرة كافية تماماً، بنفس أسلوب بقية قواعد بيانات المنصة)
            if (!db.objectStoreNames.contains(DUALMATCHES_STORE)) {
                db.createObjectStore(DUALMATCHES_STORE, { keyPath: "id", autoIncrement: true });
            }
            // 🌟 [جديد] مخزن الأوسمة — مرتبط بالطالب عبر الحقل studentId، بنفس فلسفة "بلا
            // فهرس مخصص، getAll ثم فلترة بالذاكرة" المستخدمة في بقية هذا الملف
            if (!db.objectStoreNames.contains(DUALTEST_ACHIEVEMENTS_STORE)) {
                db.createObjectStore(DUALTEST_ACHIEVEMENTS_STORE, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 🌟 [جديد] بنية "جولة فارغة" داخل الاختبار المحفوظ — تُستخدم عند إنشاء اختبار جديد لتوليد
// الجولات الثلاث الثابتة (١: النصف الأول، ٢: النصف الثاني، ٣: النطاق كاملاً)، حسب القرار
// المعتمد من المعلم. mainQuestions/swapQuestions تُملأ يدوياً بالكامل من المعلم — لا توليد تلقائي.
// 🌟 [مُحدَّث] rangeFrom/rangeTo أصبحت {surah} فقط (بلا ayah) — بطلب صريح من المعلم: الطبيعي
// أن يختبر الطالب السورة كاملة وليس جزءاً منها، فلم يعد هناك داعٍ لتحديد رقم آية لحدود الجولة.
// أي اختبار قديم محفوظ فيه ayah من التصميم السابق لن يُفقَد (يبقى في IndexedDB كما هو، فقط
// لم تعد الواجهة تعرضه أو تستخدمه)، تماشياً مع مبدأ عدم حذف أي تخزين قديم فجأة.
export function createEmptyRound(roundNumber, defaultLabel) {
    return {
        roundNumber,
        label: defaultLabel || "",
        rangeFrom: { surah: null },
        rangeTo: { surah: null },
        // كل سؤال: { number, fromText, toText, points }
        mainQuestions: [],
        // كل سؤال احتياطي: { code, fromText, toText } — الرمز مستقل وليس مخصصاً للاعب الأول
        // أو الثاني (الطالب نفسه يختار الرمز وقت التبديل)
        swapQuestions: []
    };
}

// 🌟 [جديد] بناء كائن اختبار جديد فارغ بالجولات الثلاث الثابتة جاهزة للتعبئة
export function createEmptyDualTest() {
    return {
        status: 'draft', // 'draft' | 'ready'
        defaultStudentIdA: null,
        defaultStudentNameA: '',
        defaultStudentIdB: null,
        defaultStudentNameB: '',
        rounds: [
            createEmptyRound(1, ''),
            createEmptyRound(2, ''),
            createEmptyRound(3, '')
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

export class DualTestsManager {
    constructor(db) {
        this.db = db;
    }

    // ===================== بنك الاختبارات (dual_tests) =====================

    // لجلب كل الاختبارات سواء كانت مسودة أو جاهزة
    getAllTests() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(DUALTESTS_STORE, "readonly");
            const store = tx.objectStore(DUALTESTS_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    getTestById(id) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(DUALTESTS_STORE, "readonly");
            const store = tx.objectStore(DUALTESTS_STORE);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
        });
    }

    // لحفظ اختبار جديد أو تحديث مسودة/اختبار جاهز موجود (نفس put القديمة، تعمل للحالتين)
    saveTest(testData) {
        return new Promise((resolve) => {
            testData.updatedAt = new Date().toISOString();
            const tx = this.db.transaction(DUALTESTS_STORE, "readwrite");
            const store = tx.objectStore(DUALTESTS_STORE);
            const request = store.put(testData);
            request.onsuccess = () => resolve(request.result);
        });
    }

    deleteTest(id) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(DUALTESTS_STORE, "readwrite");
            const store = tx.objectStore(DUALTESTS_STORE);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
        });
    }

    // ===================== المواجهات الفعلية (dual_matches) =====================

    getAllMatches() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(DUALMATCHES_STORE, "readonly");
            const store = tx.objectStore(DUALMATCHES_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    // 🌟 [جديد] كل مواجهات اختبار محفوظ معيّن — يُستخدم لعرض "سجل مواجهات هذا الاختبار"
    // عند إعادة استخدامه مع طلاب آخرين (فلترة بالذاكرة، بلا فهرس مخصص — راجع الملاحظة أعلاه)
    getMatchesByTestId(testId) {
        return this.getAllMatches().then(all => all.filter(m => m.testId === testId));
    }

    getMatchById(id) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(DUALMATCHES_STORE, "readonly");
            const store = tx.objectStore(DUALMATCHES_STORE);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result || null);
        });
    }

    saveMatch(matchData) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(DUALMATCHES_STORE, "readwrite");
            const store = tx.objectStore(DUALMATCHES_STORE);
            const request = store.put(matchData);
            request.onsuccess = () => resolve(request.result);
        });
    }

    deleteMatch(id) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(DUALMATCHES_STORE, "readwrite");
            const store = tx.objectStore(DUALMATCHES_STORE);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
        });
    }

    // ===================== الأوسمة/الإنجازات (dual_test_achievements) =====================
    // 🌟 [جديد] سجل واحد لكل وسام حصل عليه طالب — تُقرأ من student/student.js لعرضها في
    // ملف الطالب الشخصي. راجع engine/dualTestEngine.js (evaluateMatchAchievements) لمنطق
    // تحديد متى يُمنَح كل وسام.

    getAllAchievements() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(DUALTEST_ACHIEVEMENTS_STORE, "readonly");
            const store = tx.objectStore(DUALTEST_ACHIEVEMENTS_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    getAchievementsByStudent(studentId) {
        return this.getAllAchievements().then(all => all.filter(a => String(a.studentId) === String(studentId)));
    }

    // يمنع منح نفس الوسام "لمرة واحدة" مرتين لنفس الطالب (بعض الأوسمة أدناه متكررة بطبيعتها
    // ولا تستخدم هذا الفحص — راجع evaluateMatchAchievements)
    hasAchievement(studentId, badgeKey) {
        return this.getAchievementsByStudent(studentId).then(list => list.some(a => a.badgeKey === badgeKey));
    }

    addAchievement(record) {
        return new Promise((resolve) => {
            record.earnedAt = record.earnedAt || new Date().toISOString();
            const tx = this.db.transaction(DUALTEST_ACHIEVEMENTS_STORE, "readwrite");
            const store = tx.objectStore(DUALTEST_ACHIEVEMENTS_STORE);
            const request = store.add(record);
            request.onsuccess = () => resolve(request.result);
        });
    }
}
