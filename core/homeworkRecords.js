// core/homeworkRecords.js
// ==========================================================
// 🌟🌟 [جديد] كتابة نتيجة الواجب "المعتمدة" في سجل الطالب داخل المنصة (جهاز المعلم)
// ==========================================================
// المشكلة القديمة (موثّقة في مستند التدقيق): نتيجة الواجب كانت تُكتب في history_<id> على "جهاز الطالب" بمعرّف
// خاص بذلك الهاتف، فلا تصل أبداً لسجل الطالب الحقيقي عند المعلم. الآن تُكتب هنا على جهاز المعلم عند اعتماد
// النتيجة، بنفس بنية السجل الموجودة أصلاً (history_<studentId> = [{date, range, score, hwId, details}])
// فتعمل كل الشاشات القديمة (student.js، report.js) بلا أي تعديل، مع حقول إضافية لا تؤثر على القراءة القديمة.
//
// ⚠️ افتراض صريح (تجنب حساب النقاط مرتين): إعادة اعتماد نفس التسليم "تستبدل" سطره في السجل ولا تُضيف سطراً
// جديداً، وتُضاف لرصيد نقاط الطالب (totalScore) الفرق فقط بين النقاط الحالية والمُسجَّلة سابقاً (creditedPoints).
import { AppState } from './app.js';

export const normalizeName = (s) => String(s || '').replace(/[ً-ٰٟـ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

export function readStudentHistory(studentId) {
    try { return JSON.parse(localStorage.getItem('history_' + studentId)) || []; } catch (e) { return []; }
}

// إيجاد الطالب في سجل المعلم: أولاً بالمعرّف المُخزَّن مع التسليم (واجب مخصَّص)، ثم بالاسم المطابق.
export async function findLocalStudentForSubmission(sub) {
    const students = await AppState.studentManager.getAllStudents();
    if (sub.studentId !== undefined && sub.studentId !== null && sub.studentId !== '') {
        const byId = students.find(s => String(s.id) === String(sub.studentId));
        if (byId) return byId;
    }
    const n = normalizeName(sub.studentName);
    // 🌟 [إصلاح تدقيق] لو تطابق الاسم مع أكثر من طالب لا نخمّن (كان يُنسب التسليم للأول صامتاً)؛ نرجع null ويسأل المعلم عبر findAmbiguousNameMatches
    const matches = students.filter(s => normalizeName(s.name) === n);
    return matches.length === 1 ? matches[0] : null;
}

// 🌟 [جديد] الطلاب المتطابقو الاسم مع التسليم (يُستخدم فقط عند وجود أكثر من واحد ولا معرّف مخزَّن يحسم الأمر)
export async function findAmbiguousNameMatches(sub) {
    const students = await AppState.studentManager.getAllStudents();
    if (sub.studentId !== undefined && sub.studentId !== null && sub.studentId !== '' &&
        students.some(s => String(s.id) === String(sub.studentId))) return [];
    const n = normalizeName(sub.studentName);
    const matches = students.filter(s => normalizeName(s.name) === n);
    return matches.length > 1 ? matches : [];
}

export async function createLocalStudent(name) {
    // 🌟 [إصلاح تدقيق] بلا id يدوي: مخزن الطلاب autoIncrement فيُعطي رقماً مثل باقي الطلاب (كان 'std_...' النصي يعطّل أزرار شاشة "كل الطلاب")
    const student = { name: String(name).trim(), isHidden: false };
    const newId = await AppState.studentManager.addStudent(student);
    student.id = newId;
    return student;
}

// 🌟 نص نطاق الواجب (اسم السورة/الآيات/الجزء) ليُحفظ في حقل range بسجل الطالب فيظهر كاملاً في السجل
// حتى بعد حذف الواجب من الخادم. scope = الكائن المخزَّن مع الواجب (surah | range | juz)؛ غير صالح → null (بلا تخمين).
export function scopeToText(scope) {
    if (!scope || typeof scope !== 'object') return null;
    if (scope.mode === 'surah' && scope.surahName) {
        return scope.startAyah === scope.endAyah
            ? `سورة ${scope.surahName} (آية ${scope.startAyah})`
            : `سورة ${scope.surahName} (${scope.startAyah}-${scope.endAyah})`;
    }
    if (scope.mode === 'range' && scope.fromName && scope.toName) {
        return scope.fromName === scope.toName ? `سورة ${scope.fromName}` : `من سورة ${scope.fromName} إلى سورة ${scope.toName}`;
    }
    if (scope.mode === 'juz' && scope.juzNum !== undefined && scope.juzNum !== null) return `الجزء ${scope.juzNum}`;
    return null;
}

// يُرجع { verified, delta }. scope (اختياري) = نطاق الواجب لكتابته في range. verified = تمت قراءة السطر من التخزين بعد كتابته للتأكد.
export async function recordApprovedResult(student, submission, scope) {
    const key = 'history_' + student.id;
    const list = readStudentHistory(student.id);
    const idx = list.findIndex(h => h.submissionId === submission.id);
    const prev = idx >= 0 ? list[idx] : null;
    const scopeText = scopeToText(scope);
    const approvedMs = Date.parse(submission.approvedAt) || Date.now();
    const entry = {
        date: new Date(approvedMs).toLocaleDateString('ar-EG'),
        range: scopeText ? `واجب منزلي: ${scopeText}` : ((prev && prev.range) || `واجب منزلي (${(submission.details || []).length} أسئلة)`),
        score: submission.finalScore,                     // نسبة مئوية 0-100 — نفس معنى الحقل الأصلي
        hwId: submission.hwId,
        details: submission.details,
        // حقول إضافية (القراء القدامى يتجاهلونها):
        submissionId: submission.id, source: 'homework', approved: true, timestamp: approvedMs,
        earnedPoints: submission.earnedPoints, totalPoints: submission.totalPoints, creditedPoints: submission.earnedPoints
    };
    if (idx >= 0) list[idx] = entry; else list.push(entry);
    localStorage.setItem(key, JSON.stringify(list));

    const delta = (submission.earnedPoints || 0) - ((prev && prev.creditedPoints) || 0);
    if (delta !== 0) {
        student.totalScore = (student.totalScore || 0) + delta;
        await AppState.studentManager.updateStudent(student);
    }
    const back = readStudentHistory(student.id).find(h => h.submissionId === submission.id);
    // 🌟 [جديد — الواجب الذكي] تغذية سجل أداء الطالب (المهارة/الموضع/الجودة) من هذا التسليم المعتمد. غير حاجزة وبصمت عند أي فشل:
    // اعتماد الدرجة لا يتوقف أبداً على التتبّع. إعادة الاعتماد تستبدل أحداث نفس التسليم فلا تتكرر.
    import('./trackingService.js').then(m => m.recordHomeworkApproval(student, submission))
        .catch(err => console.warn('تعذر تسجيل أداء الواجب في ملف التتبّع:', err));
    return { verified: !!back && back.score === submission.finalScore, delta };
}
