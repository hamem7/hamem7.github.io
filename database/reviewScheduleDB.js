// database/reviewScheduleDB.js
// 🌟 قاعدة بيانات جديدة لنظام "المراجعة المتباعدة" (على نمط Anki/Duolingo) —
// سجل واحد لكل طالب (keyPath = studentId) يحفظ متى آخر مرة رُوجعت فيها
// آخر درجة اعتمدها المعلم يدوياً لهذا الطالب، ومتى موعد المراجعة القادمة.
// الوحدة المتابَعة هنا هي "الطالب نفسه" بنطاق حفظه الحالي (student.memoFrom
// و student.memoTo، وهما موجودان أصلاً في سجل الطالب) — وليست وحدة تفصيلية
// جديدة (لا حزب ولا ربع)، بناءً على تفضيل المعلم الصريح 🌟
export function initReviewScheduleDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("DarHamReviewSchedule", 1);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains("review_schedule")) {
                db.createObjectStore("review_schedule", { keyPath: "studentId" });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

export class ReviewScheduleManager {
    constructor(db) {
        this.db = db;
    }

    getSchedule(studentId) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("review_schedule", "readonly");
            const store = tx.objectStore("review_schedule");
            const request = store.get(studentId);
            request.onsuccess = () => resolve(request.result || null);
        });
    }

    getAllSchedules() {
        return new Promise((resolve) => {
            const tx = this.db.transaction("review_schedule", "readonly");
            const store = tx.objectStore("review_schedule");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    setSchedule(entry) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("review_schedule", "readwrite");
            const store = tx.objectStore("review_schedule");
            const request = store.put(entry);
            request.onsuccess = () => resolve(request.result);
        });
    }

    // 🌟 قلب نظام المراجعة المتباعدة: يُستدعى فقط بعد اعتماد المعلم للدرجة
    // النهائية يدوياً (عند حفظ التصحيح اليدوي)، وليس عند كل واجب تلقائي —
    // بناءً على اتفاق صريح مع المعلم أن نقطة التحديث هي اعتماد الدرجة يدوياً.
    // منطق تقريبي مبسّط (وليس خوارزمية SM-2 كاملة بكل تعقيدها): كل أداء ممتاز
    // يُبعد موعد المراجعة القادمة (تعزيز الثقة)، وكل أداء ضعيف يُعيد الفاصل
    // الزمني لليوم التالي مباشرة (المادة "هشة" وتحتاج مراجعة عاجلة).
    async recordReviewResult(studentId, scorePercent) {
        const existing = await this.getSchedule(studentId);
        let intervalDays = existing ? existing.intervalDays : 1;

        if (scorePercent >= 90) {
            intervalDays = Math.min(60, Math.round(intervalDays * 2));
        } else if (scorePercent >= 70) {
            intervalDays = Math.min(45, Math.round(intervalDays * 1.5));
        } else if (scorePercent >= 50) {
            intervalDays = Math.max(1, intervalDays);
        } else {
            intervalDays = 1;
        }

        const now = new Date();
        const nextDue = new Date(now.getTime() + intervalDays * 86400000);

        const entry = {
            studentId,
            lastReviewedAt: now.toISOString(),
            nextDueAt: nextDue.toISOString(),
            intervalDays,
            lastScore: scorePercent
        };

        await this.setSchedule(entry);
        return entry;
    }
}
