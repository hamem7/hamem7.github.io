// database/tajweedDB.js
//
// 🌟 [جديد بالكامل — المرحلة 3] قاعدة بيانات "أبطال التجويد" المعزولة تمامًا (DarHamTajweed)،
// بنفس فلسفة الفصل المعماري المعتمدة في database/dualTestsDB.js: ثلاثة مخازن منفصلة داخل
// قاعدة واحدة، بلا فهارس مخصّصة (getAll ثم فلترة بالذاكرة — حجم الاستخدام المتوقع لمعلم واحد
// لا يستدعي index مخصصاً، بنفس أسلوب بقية قواعد بيانات المنصة). راجع
// "التصور-المعماري-الكامل-لمسار-التجويد.md" §3 لتصميم البيانات الكامل.
//
//   tajweed_rule_mastery   → سجل واحد لكل (studentId × ruleId): 5 أبعاد إتقان (0-100) + حالة
//   tajweed_sessions       → سجل تاريخي لكل جلسة نشاط (سؤال/مجموعة أسئلة) لعبها الطالب
//   tajweed_achievements   → نفس بنية dual_test_achievements حرفيًا {id, studentId, badgeKey, earnedAt, meta}

export const TAJWEED_DB_NAME = "DarHamTajweed";
export const TAJWEED_DB_VERSION = 1;
export const TAJWEED_MASTERY_STORE = "tajweed_rule_mastery";
export const TAJWEED_SESSIONS_STORE = "tajweed_sessions";
export const TAJWEED_ACHIEVEMENTS_STORE = "tajweed_achievements";

export function initTajweedDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open(TAJWEED_DB_NAME, TAJWEED_DB_VERSION);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains(TAJWEED_MASTERY_STORE)) {
                db.createObjectStore(TAJWEED_MASTERY_STORE, { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(TAJWEED_SESSIONS_STORE)) {
                db.createObjectStore(TAJWEED_SESSIONS_STORE, { keyPath: "id", autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(TAJWEED_ACHIEVEMENTS_STORE)) {
                db.createObjectStore(TAJWEED_ACHIEVEMENTS_STORE, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 🌟 سجل إتقان فارغ جاهز لحكم لم يبدأ الطالب التدرّب عليه بعد — الأبعاد الخمسة صفر، والحالة
// 'available' (متاح لكن لم يُلمَس بعد). راجع §4 من المستند المعماري لتعريف كل بُعد.
export function createEmptyMasteryRecord(studentId, stageId, ruleId) {
    return {
        studentId,
        stageId,
        ruleId,
        dimensions: { knows: 0, distinguishes: 0, discovers: 0, applies: 0, recalls: 0 },
        status: 'available', // 'available' | 'in_progress' | 'mastered' | 'needs_review'
        attemptsCount: 0,
        lastPracticedAt: null,
        masteredAt: null
    };
}

export class TajweedManager {
    constructor(db) {
        this.db = db;
    }

    // ===================== الإتقان (tajweed_rule_mastery) =====================

    getAllMastery() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(TAJWEED_MASTERY_STORE, "readonly");
            const store = tx.objectStore(TAJWEED_MASTERY_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    getMasteryByStudent(studentId) {
        return this.getAllMastery().then(all => all.filter(m => String(m.studentId) === String(studentId)));
    }

    getMasteryRecord(studentId, ruleId) {
        return this.getAllMastery().then(all =>
            all.find(m => String(m.studentId) === String(studentId) && m.ruleId === ruleId) || null
        );
    }

    saveMastery(record) {
        return new Promise((resolve) => {
            const tx = this.db.transaction(TAJWEED_MASTERY_STORE, "readwrite");
            const store = tx.objectStore(TAJWEED_MASTERY_STORE);
            const request = store.put(record);
            request.onsuccess = () => resolve(request.result);
        });
    }

    // 🌟 يجلب السجل الموجود أو يُنشئ سجلاً فارغاً جديداً ويحفظه — نقطة دخول واحدة موحّدة
    // تستخدمها كل شاشات النشاط بدل تكرار منطق "موجود أم لا" في كل مكان
    async getOrCreateMasteryRecord(studentId, stageId, ruleId) {
        const existing = await this.getMasteryRecord(studentId, ruleId);
        if (existing) return existing;
        const fresh = createEmptyMasteryRecord(studentId, stageId, ruleId);
        const id = await this.saveMastery(fresh);
        fresh.id = id;
        return fresh;
    }

    // ===================== الجلسات (tajweed_sessions) =====================

    getAllSessions() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(TAJWEED_SESSIONS_STORE, "readonly");
            const store = tx.objectStore(TAJWEED_SESSIONS_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    getSessionsByStudent(studentId) {
        return this.getAllSessions().then(all => all.filter(s => String(s.studentId) === String(studentId)));
    }

    addSession(session) {
        return new Promise((resolve) => {
            session.timestamp = session.timestamp || new Date().toISOString();
            const tx = this.db.transaction(TAJWEED_SESSIONS_STORE, "readwrite");
            const store = tx.objectStore(TAJWEED_SESSIONS_STORE);
            const request = store.add(session);
            request.onsuccess = () => resolve(request.result);
        });
    }

    // ===================== الأوسمة (tajweed_achievements) =====================
    // 🌟 نفس بنية/منطق dual_test_achievements في database/dualTestsDB.js حرفيًا

    getAllAchievements() {
        return new Promise((resolve) => {
            const tx = this.db.transaction(TAJWEED_ACHIEVEMENTS_STORE, "readonly");
            const store = tx.objectStore(TAJWEED_ACHIEVEMENTS_STORE);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    getAchievementsByStudent(studentId) {
        return this.getAllAchievements().then(all => all.filter(a => String(a.studentId) === String(studentId)));
    }

    hasAchievement(studentId, badgeKey) {
        return this.getAchievementsByStudent(studentId).then(list => list.some(a => a.badgeKey === badgeKey));
    }

    addAchievement(record) {
        return new Promise((resolve) => {
            record.earnedAt = record.earnedAt || new Date().toISOString();
            const tx = this.db.transaction(TAJWEED_ACHIEVEMENTS_STORE, "readwrite");
            const store = tx.objectStore(TAJWEED_ACHIEVEMENTS_STORE);
            const request = store.add(record);
            request.onsuccess = () => resolve(request.result);
        });
    }
}
