// core/homeworkApi.js
// ==========================================================
// 🌟🌟 [جديد] واجهة نظام الواجبات مع الخادم الجديد — تحلّ محل الدوال المستخدمة سابقاً من core/firebase.js
// ==========================================================
// أبقينا نفس أسماء الدوال القديمة حيث يتطابق المعنى (getSubmissionsFromCloud، getSubmissionsNeedingGrading،
// getAllSubmissionsFromCloud) حتى تبقى الشاشات المستدعية (settings/homework-prep.js، reports/monthly-report.js)
// بأقل تغيير ممكن. الدوال التي لم يعد لها معنى (طوابير إعادة الرفع للواجبات) أُبقيت كدوال فارغة آمنة
// حتى لا ينكسر أي استدعاء قديم لم نتوقعه — راجع التعليق فوق كل واحدة.
//
// ⚠️ افتراض صريح: تسليم الطالب الذي "ينتظر تصحيحاً" = حالته في الخادم submitted أو graded وبه سؤال يدوي بلا
// درجة (نفس تعريف submissionNeedsGrading المستخدم سابقاً بلا أي تغيير).
import { call, callWithRetry, ApiError, clearTeacherKey } from './api.js';
import { submissionNeedsGrading } from './submissionStatus.js';
import { t } from './i18n.js';

// معرّف الواجب الجديد: HW_ + 32 خانة سداسية عشوائية (122 بت) يولّدها الخادم — غير قابل للتخمين.
// أي معرّف لا يطابق هذا الشكل هو واجب قديم من نظام Firebase (كان HW_<وقت>).
export const HW_ID_RE = /^HW_[0-9a-f]{32}$/;
export const isServerHomeworkId = (id) => HW_ID_RE.test(String(id || ''));

// رسالة خطأ مفهومة للمستخدم (ثنائية اللغة عبر i18n) من أي خطأ اتصال/خادم
export function friendlyErrorText(e) {
    if (!(e instanceof ApiError)) return String((e && e.message) || e);
    const map = {
        NETWORK: 'hw_err_network', TIMEOUT: 'hw_err_timeout', BAD_RESPONSE: 'hw_err_bad_response',
        UNAUTHORIZED: 'hw_err_unauthorized', LOCKED: 'hw_err_locked', NOT_FOUND: 'hw_err_not_found',
        CLOSED: 'hw_err_closed', ALREADY_SUBMITTED: 'hw_err_already', BUSY: 'hw_err_busy',
        NOT_PERSISTED: 'hw_err_not_persisted', PERSIST_VERIFY_FAILED: 'hw_err_not_persisted',
        UNGRADED_QUESTIONS: 'hw_err_ungraded', VERSION_CONFLICT: 'hw_err_conflict'
    };
    return map[e.code] ? t(map[e.code]) : (t('hw_err_generic') + ' (' + (e.code || e.kind) + ')');
}

// نداء خاص بالمعلم: لو رفض الخادم المفتاح نمسحه محلياً فيُطلب من المعلم إدخاله من جديد في الدخول التالي
async function teacherCall(action, params, opts = {}) {
    try { return await call(action, params, { teacher: true, ...opts }); }
    catch (e) { if (e instanceof ApiError && e.code === 'UNAUTHORIZED') clearTeacherKey(); throw e; }
}

// ---------- المعلم: نشر واجب ----------
// homework = {questions, assignedStudentName, assignedStudentId, meta}. لا يوجد "نجاح" إلا بعد persisted:true.
export function publishHomeworkToServer(homework) {
    return teacherCall('createHomework', { homework }, { write: true, timeoutMs: 30000 });
}

// ---------- الطالب/المعلم: قراءة الواجب العام (بلا إجابات صحيحة أبداً) ----------
export async function fetchPublicHomework(id) {
    const r = await callWithRetry('getHomework', { id }, {}, 3);
    return r.homework;
}

// ---------- المعلم: تسليمات الطلاب ----------
const withDocId = (s) => ({ ...s, docId: s.id });   // docId اسم قديم يستخدمه homework-prep.js

export async function getSubmissionsFromCloud(hwId) {
    const r = await teacherCall('listSubmissions', { hwId });
    return r.submissions.map(withDocId);            // مرتَّبة من الأحدث للأقدم من الخادم
}

export async function getSubmissionsNeedingGrading() {
    const r = await teacherCall('listSubmissions', { statuses: ['submitted', 'graded'] });
    return r.submissions.filter(submissionNeedsGrading).map(withDocId);
}

// 🌟 للتقرير الشهري: النتائج "المعتمدة" فقط (درجة نهائية اعتمدها المعلم) عبر كل الواجبات
export async function getAllSubmissionsFromCloud() {
    const r = await teacherCall('listSubmissions', { statuses: ['approved'] });
    return r.submissions.map(withDocId);
}

// ---------- المعلم: تصحيح واعتماد ----------
// manualScores = {<qid>: درجة}. الخادم يعيد حساب الدرجة من الإجابات المخزّنة (لا يثق بأي درجة من العميل).
// studentId = معرّف الطالب في سجل المعلم المحلي (يُخزَّن مع التسليم ليقرأه التقرير الشهري).
export async function gradeSubmissionOnServer(submissionId, manualScores, studentId, expectedVersion) {
    const params = { submissionId, manualScores, finalize: true };
    if (studentId !== undefined && studentId !== null) params.studentId = studentId;
    if (expectedVersion !== undefined) params.expectedVersion = expectedVersion;
    const r = await teacherCall('gradeSubmission', params, { write: true, timeoutMs: 30000 });
    return withDocId(r.submission);
}

// ---------- دوال قديمة أُبقيت فارغة عمداً (لا تؤثر على أي شيء) ----------
// كان الواجب يُحفظ محلياً ثم يُرفع لاحقاً بطابور إعادة محاولة، والآن النشر لا يُعرض رابطه إلا بعد تأكيد
// الخادم (لا وجود لحالة "محفوظ محلياً فقط" لواجب منشور)، وتسليمات الطلاب تُدار بـ core/submitQueue.js على جهاز الطالب.
export function queuePendingHomeworkSync() { /* لا شيء */ }
export function flushPendingHomeworkSync() { return Promise.resolve({ sent: 0, remaining: 0 }); }
export function isHomeworkPendingSync() { return false; }
export function getPendingSubmissionsCountForHomework() { return 0; }
