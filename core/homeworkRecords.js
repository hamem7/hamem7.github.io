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
    return students.find(s => normalizeName(s.name) === n) || null;
}

export async function createLocalStudent(name) {
    const student = { id: 'std_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6), name: String(name).trim(), isHidden: false };
    await AppState.studentManager.addStudent(student);
    return student;
}

// يُرجع { verified, delta }. verified = تمت قراءة السطر من التخزين بعد كتابته للتأكد.
export async function recordApprovedResult(student, submission) {
    const key = 'history_' + student.id;
    const list = readStudentHistory(student.id);
    const idx = list.findIndex(h => h.submissionId === submission.id);
    const prev = idx >= 0 ? list[idx] : null;
    const approvedMs = Date.parse(submission.approvedAt) || Date.now();
    const entry = {
        date: new Date(approvedMs).toLocaleDateString('ar-EG'),
        range: `واجب منزلي (${(submission.details || []).length} أسئلة)`,
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
    return { verified: !!back && back.score === submission.finalScore, delta };
}
