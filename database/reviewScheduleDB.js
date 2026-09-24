// database/reviewScheduleDB.js
// 🌟 قاعدة بيانات جديدة لنظام "المراجعة المتباعدة" (على نمط Anki/Duolingo) —
// سجل واحد لكل طالب (keyPath = studentId) يحفظ متى آخر مرة رُوجعت فيها
// آخر درجة اعتمدها المعلم يدوياً لهذا الطالب، ومتى موعد المراجعة القادمة.
// الوحدة المتابَعة هنا هي "الطالب نفسه" بنطاق حفظه الحالي (student.memoFrom
// و student.memoTo، وهما موجودان أصلاً في سجل الطالب) — وليست وحدة تفصيلية
// جديدة (لا حزب ولا ربع)، بناءً على تفضيل المعلم الصريح 🌟
// 🌟 [جديد — المرحلة 4] مخزن ثانٍ منفصل تماماً "tajweed_rule_review" لمراجعة أحكام مسار
// التجويد لكل (طالب × حكم) على حدة — بطلب صريح من §5 في المستند المعماري: "تمديد خوارزمية
// reviewScheduleDB.js الموجودة لتعمل لكل (طالب × حكم) على حدة". لم نُعدّل مخزن review_schedule
// الأصلي (لا نغيّر keyPath ولا نلمس بياناته) لأنه يخدم مراجعة نطاق الحفظ العام (memoFrom/
// memoTo) وهو استخدام مختلف تماماً — رفعنا رقم الإصدار من 1 إلى 2 فقط لإضافة المخزن الجديد،
// بنفس نمط onupgradeneeded المتحقق من كل مخزن على حدة المستخدَم في dualTestsDB.js، فلا يُفقَد
// أي جدول مراجعة عام محفوظ فعلاً لأي طالب.
export function initReviewScheduleDB() {
    return new Promise((resolve, reject) => {
        let request = indexedDB.open("DarHamReviewSchedule", 2);
        request.onupgradeneeded = (e) => {
            let db = e.target.result;
            if (!db.objectStoreNames.contains("review_schedule")) {
                db.createObjectStore("review_schedule", { keyPath: "studentId" });
            }
            // 🌟 بلا فهرس مخصّص (autoIncrement + getAll ثم فلترة بالذاكرة)، بنفس فلسفة بقية
            // قواعد بيانات المنصة — حجم الاستخدام المتوقع لمعلم واحد لا يستدعي index مخصصاً
            if (!db.objectStoreNames.contains("tajweed_rule_review")) {
                db.createObjectStore("tajweed_rule_review", { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
    });
}

// 🌟 [جديد — المرحلة 4] خوارزمية الفاصل الزمني المتصاعد نفسها المستخدمة أدناه في
// recordReviewResult، استُخرجَت كدالة خالصة مشتركة حتى لا تتكرر بنفس الأرقام في مكانين —
// recordRuleReviewResult (لكل حكم) تستدعيها أيضاً بلا أي تكرار للمنطق
function computeNextInterval(scorePercent, previousIntervalDays) {
    let intervalDays = previousIntervalDays || 1;
    if (scorePercent >= 90) {
        intervalDays = Math.min(60, Math.round(intervalDays * 2));
    } else if (scorePercent >= 70) {
        intervalDays = Math.min(45, Math.round(intervalDays * 1.5));
    } else if (scorePercent >= 50) {
        intervalDays = Math.max(1, intervalDays);
    } else {
        intervalDays = 1;
    }
    return intervalDays;
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
        // 🌟 [مُحدَّث] استُخرج حساب الفاصل الزمني إلى computeNextInterval المشتركة أعلاه —
        // نفس الأرقام والمنطق تماماً، فقط بلا تكرار الكود مع recordRuleReviewResult الجديدة
        let intervalDays = computeNextInterval(scorePercent, existing ? existing.intervalDays : 1);

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

    // ===================== المرحلة 4: مراجعة أبطال التجويد لكل (طالب × حكم) =====================

    getAllRuleSchedules() {
        return new Promise((resolve) => {
            const tx = this.db.transaction("tajweed_rule_review", "readonly");
            const store = tx.objectStore("tajweed_rule_review");
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
        });
    }

    getRuleSchedulesByStudent(studentId) {
        return this.getAllRuleSchedules().then(all => all.filter(r => String(r.studentId) === String(studentId)));
    }

    getRuleSchedule(studentId, ruleId) {
        return this.getAllRuleSchedules().then(all =>
            all.find(r => String(r.studentId) === String(studentId) && r.ruleId === ruleId) || null
        );
    }

    saveRuleSchedule(entry) {
        return new Promise((resolve) => {
            const tx = this.db.transaction("tajweed_rule_review", "readwrite");
            const store = tx.objectStore("tajweed_rule_review");
            const request = store.put(entry);
            request.onsuccess = () => resolve(request.result);
        });
    }

    // 🌟 نفس منطق recordReviewResult أعلاه بالضبط (خوارزمية computeNextInterval المشتركة)،
    // لكن مفتوحة على (studentId, ruleId) معاً بدل studentId فقط — تُستدعى من شاشة نشاط
    // "المراجعة" في tajweed/tajweed-activity.js فور إتمام جولة مراجعة لحكم معيّن
    async recordRuleReviewResult(studentId, ruleId, scorePercent) {
        const existing = await this.getRuleSchedule(studentId, ruleId);
        const intervalDays = computeNextInterval(scorePercent, existing ? existing.intervalDays : 1);

        const now = new Date();
        const nextDue = new Date(now.getTime() + intervalDays * 86400000);

        const entry = {
            id: existing ? existing.id : undefined,
            studentId,
            ruleId,
            lastReviewedAt: now.toISOString(),
            nextDueAt: nextDue.toISOString(),
            intervalDays,
            lastScore: scorePercent
        };
        if (entry.id === undefined) delete entry.id;

        const id = await this.saveRuleSchedule(entry);
        entry.id = existing ? existing.id : id;
        return entry;
    }

    // 🌟 [جديد] يُرجع معرّفات الأحكام "المستحقة" فعلاً لطالب معيّن من بين مجموعة أحكام مُمرَّرة
    // (عادة كل الأحكام التي بدأ الطالب التدرّب عليها بالفعل، status !== 'available') — حكم لم
    // يُراجَع أبداً (لا سجل له هنا بعد) لا يُعتبر "مستحقاً" لأنه لم يُقفَل بعد أصلاً، بل عادي جديد
    async getDueRuleIds(studentId, ruleIds) {
        const schedules = await this.getRuleSchedulesByStudent(studentId);
        const now = new Date();
        const dueIds = [];
        ruleIds.forEach(ruleId => {
            const sched = schedules.find(s => s.ruleId === ruleId);
            if (sched && new Date(sched.nextDueAt) <= now) {
                dueIds.push(ruleId);
            }
        });
        return dueIds;
    }
}
