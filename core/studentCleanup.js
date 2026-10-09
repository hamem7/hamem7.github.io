// core/studentCleanup.js
// 🌟🌟 [جديد — إصلاح تدقيق ما قبل الإطلاق] تنظيف كل بقايا الطالب عند حذفه نهائياً. كانت deleteStudentAction تحذف سجل الطالب
// وhistory_<id> فقط، فتبقى جلساته وجداول مراجعته وأوسمته وحفظه الشهري في قواعد أخرى فتظهر كـ"طالب شبح" في التقارير.
// حل مدمج بالمتصفح (IndexedDB الخام) بلا اعتماد على كلاسات كل قاعدة، ويتخطّى بأمان أي قاعدة/مخزن غير موجود.
// ⚠️ [افتراض صريح]: مباريات الاختبارات الثنائية (dual_matches) تخص طالبين معاً فلا تُحذف هنا، تبقى كسجل مباراة تاريخي.
// 🌟

// [اسم القاعدة، اسم المخزن]؛ كلها فيها حقل studentId (المقارنة بـString لتشمل المعرّفات الرقمية والنصية)
const STUDENT_LINKED_STORES = [
    ['DarHamRecitation', 'recitation_sessions'],
    ['DarHamReviewSchedule', 'review_schedule'],
    ['DarHamReviewSchedule', 'tajweed_rule_review'],
    ['DarHamMonthlyMemorization', 'monthly_memorization'],
    ['DarHamTracking', 'performance_events'],
    ['DarHamDualTests', 'dual_test_achievements'],
    ['DarHamTajweed', 'tajweed_rule_mastery'],
    ['DarHamTajweed', 'tajweed_sessions'],
    ['DarHamTajweed', 'tajweed_achievements']
];

function purgeStore(dbName, storeName, studentId) {
    return new Promise((resolve) => {
        let req;
        try { req = indexedDB.open(dbName); } catch (e) { return resolve(0); }
        req.onerror = () => resolve(0);
        req.onblocked = () => resolve(0);
        req.onsuccess = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(storeName)) { db.close(); return resolve(0); }
            let removed = 0;
            try {
                const tx = db.transaction(storeName, 'readwrite');
                const cur = tx.objectStore(storeName).openCursor();
                cur.onsuccess = () => {
                    const c = cur.result;
                    if (!c) return;
                    if (c.value && String(c.value.studentId) === String(studentId)) { c.delete(); removed++; }
                    c.continue();
                };
                tx.oncomplete = () => { db.close(); resolve(removed); };
                tx.onerror = tx.onabort = () => { db.close(); resolve(removed); };
            } catch (e) { db.close(); resolve(0); }
        };
        // لو القاعدة غير موجودة أصلاً، open ينشئها فارغة بلا مخازن؛ نحذف هذا الأثر فوراً كي لا نترك قاعدة يتيمة
        req.onupgradeneeded = () => { req.transaction.abort(); };
    });
}

export async function purgeStudentRelatedData(studentId) {
    let total = 0;
    for (const [dbName, storeName] of STUDENT_LINKED_STORES) {
        try { total += await purgeStore(dbName, storeName, studentId); }
        catch (e) { console.warn('تعذر تنظيف', dbName, storeName, e); }
    }
    try {
        localStorage.removeItem(`history_${studentId}`);
        localStorage.removeItem(`darham_avatar_${studentId}`);
    } catch (e) { /* localStorage قد يكون غير متاح — لا يمنع الحذف */ }
    return total;
}
