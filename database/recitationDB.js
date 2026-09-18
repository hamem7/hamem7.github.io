// database/recitationDB.js
// 🌟 [جديد بالكامل] قاعدة بيانات "سجل جلسات التسميع" — نفس نمط تهيئة بقية قواعد
// بيانات المنصة بالضبط (راجع reviewScheduleDB.js/similaritiesDB.js). سجل منفصل تمامًا
// عن student.weaknesses (أخطاء غرفة اللعب/الأسئلة داخل adultGame.js/kidsGame.js)
// بقرار صريح من المعلم — راجع مستند المشروع الخاص بهذه الميزة لتفاصيل النقاش:
// أخطاء التسميع المباشر (تسميع متصل حر: حفظ جديد أو مراجعة، وليس سؤالاً منفصلاً من
// غرفة اللعب) لا ترتبط ببنية "سؤال" (questionBody/fullAnswer...) يمكن إعادة تشغيلها
// لاحقًا في شاشة "علاج الخطأ السابق"، فهي ببساطة عدّاد/سجل لحظي لما حدث أثناء الجلسة.
//
// بنية كل جلسة مخزَّنة (راجع recitation/recitation-play.js لنقطة الحفظ الفعلية):
//   { id, studentId, studentName, sessionType: 'new'|'review', rangeFrom, rangeTo,
//     errors: [{type: 'pronounce'|'forgotVerse'|'forgotWord'|'hesitation', note, at}],
//     generalNote, startedAt, finishedAt, timestamp (Date.now() عند الحفظ — لفلترة
//     الشهر في التقرير الشهري بنفس نمط history_${studentId})، sourceSection: 'adult'|'kids' }
export function initRecitationDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("DarHamRecitation", 1);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains("recitation_sessions")) {
                const store = db.createObjectStore("recitation_sessions", { keyPath: "id", autoIncrement: true });
                // 🌟 فهرس على studentId لتسريع استعلام "كل جلسات هذا الطالب" (يُستخدم من ملف
                // الطالب والتقرير الشهري) بدل جلب كل الجلسات من كل الطلاب وفلترتها في الذاكرة
                store.createIndex("studentId", "studentId", { unique: false });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export class RecitationManager {
    constructor(db) {
        this.db = db;
    }

    addSession(session) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("recitation_sessions", "readwrite");
            const store = tx.objectStore("recitation_sessions");
            const request = store.add(session);
            request.onsuccess = () => resolve(request.result);
        });
    }

    getSessionsByStudent(studentId) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("recitation_sessions", "readonly");
            const store = tx.objectStore("recitation_sessions");
            const index = store.index("studentId");
            const request = index.getAll(studentId);
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    deleteSession(id) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("recitation_sessions", "readwrite");
            const store = tx.objectStore("recitation_sessions");
            const request = store.delete(id);
            request.onsuccess = () => resolve();
        });
    }
}
