// core/submissionStatus.js
// ==========================================
// 🌟🌟 [جديد] دالة واحدة مشتركة لتحديد حالة تصحيح تسليم الطالب
// ==========================================
// السياق: راجعنا نظام الواجبات بالكامل مع المعلم (المرحلة 1: طبقة المزامنة في core/firebase.js
// وcore/netUtils.js). هذه المرحلة (2) تعالج نقطة ضعف أصغر لكن حقيقية: "هل هذا التسليم بحاجة
// تصحيح يدوي من المعلم؟" كانت تُحسب بنفس المقارنة بالضبط (details[].needsManualGrading === true
// و manualScore لسه undefined) في مكانين منفصلين تماماً: core/firebase.js (دالة
// getSubmissionsNeedingGrading) وsettings/homework-prep.js (دالة loadSubmissionsInline). أي
// تعديل مستقبلي على تعريف "بحاجة تصحيح" (مثلاً لو أُضيف نوع سؤال جديد له قواعد مختلفة) كان لازم
// يُطبَّق في المكانين معاً يدوياً، وأي نسيان لأحدهما يعني أن شاشة تعرض حالة مختلفة عن الأخرى لنفس
// التسليم بالضبط. الآن: دالة واحدة فقط، يستوردها الاثنان.
export function submissionNeedsGrading(submission) {
    return !!(submission && Array.isArray(submission.details) && submission.details.some(
        d => d.needsManualGrading && d.manualScore === undefined
    ));
}

// ==========================================
// 🌟🌟 [جديد — المرحلة 3] إبقاء نسخة السجل المحلي (history_<studentId>) متزامنة بعد التصحيح اليدوي
// ==========================================
// المشكلة الفعلية (تأكّدنا منها بقراءة الكود قبل التنفيذ): games/homework-play.js يكتب نسخة من
// كل تسليم واجب في history_<studentId> المحلي لحظة التسليم، بالدرجة **الأولية التلقائية** فقط.
// لو المعلم صحّح الواجب يدويًا بعد ذلك (saveManualGrades في settings/homework-prep.js)، هذا
// التصحيح يحدّث Firestore فقط عبر updateSubmissionInCloud — ولا يمسّ نسخة history_ المحلية
// إطلاقًا. النتيجة: student/student.js (جدول "سجل التقييمات السابقة") وreports/report.js (رسم
// "الأداء عبر آخر التقييمات") يقرآن من history_ المحلي مباشرة، فيظلان يعرضان الدرجة الأولية
// القديمة للأبد حتى بعد التصحيح — بينما reports/monthly-report.js وحده تجنّب هذه المشكلة
// تحديدًا بقراءته من Firestore مباشرة لدرجات الواجبات (راجع تعليقه الصريح أعلى الملف). هذه
// الدالة تحل المشكلة من جذرها: تُستدعى من saveManualGrades فتُبقي النسختين متطابقتين دائمًا،
// بدل الاعتماد على أن تتذكر كل شاشة جديدة القراءة من المصدر "الصحيح" بعينه.
export function syncSubmissionScoreToLocalHistory(studentId, hwId, newScore) {
    if (!studentId || !hwId) return false;
    try {
        const historyKey = `history_${studentId}`;
        const historyArray = JSON.parse(localStorage.getItem(historyKey)) || [];
        const idx = historyArray.findIndex(h => h.hwId === hwId);
        // 🌟 لو مفيش نسخة محلية لهذا التسليم أصلاً (مثلاً الطالب حل الواجب من جهاز تاني غير
        // جهاز المعلم، فمفيش history_ محلي عنده على جهاز المعلم من الأساس) — لا شيء نحدّثه هنا،
        // وهذا طبيعي تمامًا وليس خطأ.
        if (idx === -1) return false;
        historyArray[idx].score = newScore;
        localStorage.setItem(historyKey, JSON.stringify(historyArray));
        return true;
    } catch (e) {
        console.error("تعذر تحديث نسخة السجل المحلي (history_) بعد التصحيح اليدوي:", e);
        return false;
    }
}
