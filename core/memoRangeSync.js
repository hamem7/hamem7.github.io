// core/memoRangeSync.js
// =============================================================================
// تمديد «نطاق الحفظ» (student.memoTo) تلقائيًا عندما يتقدّم الطالب في الحفظ.
// يُستدعى بعد كل تأكيد «نهاية شهر» (saveEnding في database/monthlyMemorizationDB.js).
// القاعدة: النطاق يتسع فقط ولا يضيق أبدًا؛ الحفظ ينزل من رقم السورة الأكبر (الناس=114) إلى الأصغر،
// فإذا كانت سورة الموضع الجديد أصغر رقمًا من سورة memoTo صار memoTo = تلك السورة.
// =============================================================================
import { AppState, tf, surahNameLocal } from './app.js';

function showRangeToast(msg) {
    try {
        const el = document.createElement('div');
        el.textContent = msg;
        el.setAttribute('role', 'status');
        el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:20000;max-width:90vw;'
            + 'padding:12px 18px;border-radius:14px;font-weight:700;font-size:.95rem;text-align:center;'
            + 'background:var(--dh-surface-3,#fff);color:var(--dh-ink,#10241c);border:1px solid var(--dh-border-strong,#cfc9b0);'
            + 'box-shadow:0 10px 30px rgba(0,0,0,.25);';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 4500);
    } catch (e) { /* الإشعار اختياري */ }
}

export async function extendMemoRangeOnProgress(studentId, position) {
    const surahs = AppState.surahsData || [];
    if (!position || !surahs.length || !AppState.studentManager) return false;
    const students = await AppState.studentManager.getAllStudents();
    const student = students.find(s => String(s.id) === String(studentId));
    if (!student || !student.memoFrom || !student.memoTo) return false;

    const num = (name) => { const x = surahs.find(s => s.name === name); return x ? x.number : null; };
    const fromN = num(student.memoFrom), toN = num(student.memoTo);
    const reached = surahs.find(s => s.number === position.surahNumber);
    if (fromN == null || toN == null || !reached) return false;

    // داخل النطاق أصلًا، أو قبل بدايته (موضع غير منطقي لهذا النطاق): لا تغيير
    if (reached.number >= toN || reached.number > fromN) return false;

    student.memoTo = reached.name;
    await AppState.studentManager.updateStudent(student);
    if (AppState.currentStudent && String(AppState.currentStudent.id) === String(student.id)) {
        AppState.currentStudent.memoTo = reached.name;
    }
    showRangeToast(tf('memo_range_auto_extended', { name: student.name || '', to: surahNameLocal(reached.name) }));
    return true;
}
