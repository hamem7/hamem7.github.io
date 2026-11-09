// core/studentRollover.js
// 🌟 [جديد] تحديث تلقائي لبيانات الطالب مع مرور الزمن:
//  ١) العمر: يُحسب دائماً من تاريخ الميلاد (calcAge) فيزيد تلقائياً يوم الميلاد دون أي تخزين.
//  ٢) الصف الدراسي: يُرقّى تلقائياً مع بداية كل عام دراسي جديد (يبدأ العام في 1 أغسطس بعد انتهاء العام السابق).
//     يحفظ كل طالب `gradeYear` = العام الدراسي الذي صفه صحيح فيه؛ كل ما تأخر عن العام الحالي يُرقّى بعدد الأعوام الفائتة.
//     الطالب القديم بلا gradeYear يُختم بالعام الحالي دون ترقية (لا نعرف متى ضُبط صفه). تعديل الصف يدوياً يختم العام الحالي.
export const GRADE_LADDER = [
    'التمهيدي', 'الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي',
    'الأول الإعدادي', 'الثاني الإعدادي', 'الثالث الإعدادي', 'الأول الثانوي', 'الثاني الثانوي', 'الثالث الثانوي', 'المرحلة الجامعية'
];
// آخر درجتين ('المرحلة الجامعية' و'خريج جامعي') لا يُرقّى منهما تلقائياً: مدة الجامعة تختلف

const YEAR_START_MONTH = 7; // أغسطس (0-based)

export function currentAcademicYear(now = new Date()) {
    return now.getMonth() >= YEAR_START_MONTH ? now.getFullYear() : now.getFullYear() - 1;
}

// عمر دقيق بالسنوات الكاملة (يزيد يوم الميلاد نفسه)؛ null لو التاريخ غير صالح
export function calcAge(dobStr, now = new Date()) {
    if (!dobStr) return null;
    const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(dobStr));
    let y, mo, d;
    if (m) { y = +m[1]; mo = +m[2] - 1; d = +m[3]; }
    else { const dt = new Date(dobStr); if (isNaN(dt)) return null; y = dt.getFullYear(); mo = dt.getMonth(); d = dt.getDate(); }
    let age = now.getFullYear() - y;
    if (now.getMonth() < mo || (now.getMonth() === mo && now.getDate() < d)) age--;
    return age < 0 ? null : age;
}

// يختم الطالب بالعام الدراسي الحالي (يُستدعى عند إضافة الطالب أو تعديل صفه يدوياً)
export function stampGradeYear(student) {
    if (student) student.gradeYear = currentAcademicYear();
    return student;
}

// يُرقّي كل الطلاب المستحقين ويحفظهم؛ يُرجع [{ id, name, from, to }] لمن تغيّر صفه
export async function rolloverStudentGrades(manager, now = new Date()) {
    const cur = currentAcademicYear(now);
    const students = await manager.getAllStudents();
    const changes = [];
    for (const s of students) {
        const idx = GRADE_LADDER.indexOf(s.grade);
        let dirty = false;
        if (idx >= 0 && typeof s.gradeYear === 'number' && s.gradeYear < cur) {
            const to = Math.min(idx + (cur - s.gradeYear), GRADE_LADDER.length - 1);
            if (to !== idx) { changes.push({ id: s.id, name: s.name, from: s.grade, to: GRADE_LADDER[to] }); s.grade = GRADE_LADDER[to]; }
            s.gradeYear = cur; dirty = true;
        } else if (typeof s.gradeYear !== 'number' || (idx < 0 && s.gradeYear !== cur)) {
            s.gradeYear = cur; dirty = true;
        }
        if (dirty) { try { await manager.updateStudent(s); } catch (e) { console.warn('[rollover]', e); } }
    }
    return changes;
}
