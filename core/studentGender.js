// core/studentGender.js
// ==========================================================
// جنس الطالب لصياغة الشهادات والتقارير والرسائل (مصدر واحد): الحقل المسجَّل student.gender أولاً
// ('girl'/'female' = طالبة)، وللبيانات القديمة نستدل بالصورة الرمزية الأنثوية. غير المسجَّل = مذكر.
// ==========================================================
export const GIRL_AVATARS = ['👧🏻', '👩🏻', '🧕🏻'];
export function isFemaleStudent(student) {
    if (!student) return false;
    if (student.gender === 'girl' || student.gender === 'female') return true;
    if (student.gender === 'boy' || student.gender === 'male') return false;
    return GIRL_AVATARS.includes(student.avatar);
}
