// components/teacherAccount.js
// 🌟 [جديد 2026-10-06] منطق «تغيير الإيميل» المشترك بين شاشة نظام إدارة الواجبات ونافذة بيانات المعلم.
// التغيير = خروج من حساب جوجل الحالي ثم فتح نافذة الدخول لاختيار حساب آخر. لكل حساب واجباته المنفصلة على الخادم.
import { getTeacherEmail, isTeacherAuthed, signOutTeacher } from '../core/api.js';
import { t } from '../core/i18n.js';

/** نص الإيميل الحالي للعرض (أو حالة عدم تسجيل الدخول). */
export function accountEmailText() {
    if (!isTeacherAuthed()) return t('acct_not_signed_in');
    const mail = getTeacherEmail();
    return mail ? `${t('acct_current_prefix')}${mail}` : t('acct_signed_in_unknown');
}

/** يُرجع true لو انتهى بجلسة جوجل صالحة بعد العملية، و false لو أُلغيت أو لم يكتمل الدخول. */
export async function changeTeacherAccount() {
    if (isTeacherAuthed() && !confirm(t('acct_change_confirm'))) return false;
    signOutTeacher();
    const { ensureHomeworkSignIn } = await import('./teacherAuthGate.js');
    return await ensureHomeworkSignIn();
}
