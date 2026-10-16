// engine/accountProgress.js — «اكتمال الحساب»: دالة خالصة. العناصر بالترتيب الذي يُستكمل به الإعداد.
// profile = اسم + تاريخ ميلاد + صورة، email = إيميل Google مربوط، drive = نسخ Drive مفعّل، backup = توجد نسخة (Drive أو ملف).
export const PROGRESS_KEYS = ['profile', 'email', 'drive', 'backup'];

export function accountProgress({ name = '', photo = '', dob = '', email = '', driveOn = false, hasBackup = false } = {}) {
    const done = {
        profile: !!(name && photo && dob),
        email: !!email,
        drive: !!driveOn,
        backup: !!hasBackup
    };
    const items = PROGRESS_KEYS.map(key => ({ key, done: done[key] }));
    const n = items.filter(i => i.done).length;
    return { items, pct: Math.round((n / items.length) * 100), next: (items.find(i => !i.done) || {}).key || null };
}
