// engine/attendanceEngine.js
// =============================================================================
// 📅 محرّك الحضور — دوال خالصة. الأساس:
//   • جدول الطالب student.schedule = { days: [0..6] (0 = الأحد)، minutes: 30|45|60... }
//   • سجل الطالب student.attendance = { 'YYYY-MM-DD': 'present'|'absent'|'cancelled' } (تأكيد المعلم: حضر / غاب / لم تُعقد)
//   • مدة الحصص الفعلية student.attendanceMinutes = { 'YYYY-MM-DD': دقائق } — تُسأل من المعلم لكل يوم حضور (ليست كل الحصص ساعة)؛ الساعات = مجموعها فقط.
//   • الأدلة التلقائية: أي نشاط مسجَّل في اليوم (لعبة فردية، مواجهة ثنائية، جلسة تجويد، تصحيح واجب...) = حاضر.
// يوم مجدول بلا دليل ولا تأكيد = «unconfirmed» — لا يُحتسب حضورًا ولا غيابًا، ويظهر في مؤشر اكتمال البيانات.
// =============================================================================

export const ATTENDANCE_STATUSES = ['present', 'absent', 'cancelled'];
export const DEFAULT_MINUTES = 60;
/** ترتيب عرض أيام الأسبوع: يبدأ الأسبوع يوم السبت (6) ثم الأحد (0) … الجمعة (5). القيم المخزّنة تبقى أرقام getDay(). */
export const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];
export const weekRank = (d) => WEEK_ORDER.indexOf(Number(d));

const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d) => { const x = d instanceof Date ? d : new Date(d); return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`; };

export function hasSchedule(student) {
    const s = student && student.schedule;
    return !!(s && Array.isArray(s.days) && s.days.length);
}

/** أيام الحصص المجدولة في شهر (monthIndex0 = 0..11) كمفاتيح 'YYYY-MM-DD' حتى اليوم (upTo) إن مُرّر. */
export function scheduledDaysInMonth(student, year, monthIndex0, upTo = null) {
    if (!hasSchedule(student)) return [];
    const days = new Set(student.schedule.days.map(Number));
    const out = [];
    const last = new Date(year, monthIndex0 + 1, 0).getDate();
    const cutoff = upTo ? dateKey(upTo) : null;
    for (let d = 1; d <= last; d++) {
        const dt = new Date(year, monthIndex0, d);
        const k = dateKey(dt);
        if (cutoff && k > cutoff) break;
        if (days.has(dt.getDay())) out.push(k);
    }
    return out;
}

/**
 * كل أثر للطالب يُعدّ حضورًا ليوم ظهوره، ولو لم يكتمل النشاط:
 *  • ألعاب فردية (كبار/أطفال بما فيها تحدي الأخطاء) — games: [{timestamp}] (الواجبات المنزلية خارجها لأنها تُحَلّ في البيت)
 *  • اختبار معلّق «حفظ والعودة لاحقًا» — student.pausedEvaluation.pausedAt
 *  • مواجهات ثنائية بكل حالاتها (بدأت/غير مكتملة/مكتملة) — matches: [{studentIdA, studentIdB, startedAt, finishedAt}]
 *  • تجويد: جلسات النشاط، وكل خطوات رحلة الحكم (شرح، تطبيق، اختبار، اعتماد)، ومراجعة الأحكام
 * يرجع أرقام ms (تصلح لـevidenceDays).
 */
export function collectEvidenceTimestamps(student, src = {}) {
    const out = [], sid = String(student && student.id);
    const add = (v) => { const ms = typeof v === 'number' ? v : Date.parse(v); if (Number.isFinite(ms)) out.push(ms); };
    (src.games || []).forEach(g => add(g && g.timestamp));
    if (student && student.pausedEvaluation) add(student.pausedEvaluation.pausedAt);
    (src.matches || []).forEach(m => {
        if (!m || (String(m.studentIdA) !== sid && String(m.studentIdB) !== sid)) return;
        add(m.startedAt); add(m.finishedAt);
    });
    (src.tjSessions || []).forEach(s => { if (s && String(s.studentId) === sid) add(s.timestamp); });
    (src.mastery || []).forEach(r => {
        if (!r || String(r.studentId) !== sid) return;
        add(r.lastPracticedAt); add(r.masteredAt);
        const j = r.journey;
        if (j) { add(j.learnedAt); add(j.practicePassedAt); add(j.examPassedAt); add(j.teacherApprovedAt); add(j.audioAt); (j.examAttempts || []).forEach(a => add(a && a.at)); }
    });
    (src.ruleReviews || []).forEach(r => { if (r && String(r.studentId) === sid) add(r.lastReviewedAt); });
    return out;
}

/** مفاتيح الأيام التي فيها أدلة نشاط: timestamps = أرقام (ms) أو نصوص ISO من كل المصادر. */
export function evidenceDays(timestamps) {
    const s = new Set();
    for (const t of timestamps || []) {
        const ms = typeof t === 'number' ? t : Date.parse(t);
        if (Number.isFinite(ms)) s.add(dateKey(ms));
    }
    return s;
}

/** حالة يوم واحد: تأكيد المعلم يغلب الدليل التلقائي، ثم الدليل، وإلا unconfirmed. */
export function dayStatus(student, key, evidence) {
    const manual = student && student.attendance && student.attendance[key];
    if (ATTENDANCE_STATUSES.includes(manual)) return manual;
    if (evidence && evidence.has(key)) return 'present';
    return 'unconfirmed';
}

/**
 * ملخص حضور شهر. expected = الحصص المجدولة (بلا الملغاة)، present/absent..، unconfirmed.
 * الأيام غير المجدولة التي حضرها الطالب (نشاط بلا جدول) تُحتسب حضورًا إضافيًا (extra) ولا ترفع expected.
 * hours = مجموع المدد الفعلية المسجَّلة (hoursMissing = أيام حضور بلا مدة مسجَّلة). pct = null ما دام في الشهر يوم غير مؤكَّد (complete = false).
 */
export function summarizeMonth(student, year, monthIndex0, evidence, now = null) {
    const minutes = (student && student.schedule && Number(student.schedule.minutes)) || DEFAULT_MINUTES;
    const scheduled = scheduledDaysInMonth(student, year, monthIndex0, now);
    const res = { scheduled: scheduled.length, expected: 0, present: 0, absent: 0, cancelled: 0, unconfirmed: 0, extra: 0, minutes, hours: 0, unconfirmedDays: [], hasSchedule: hasSchedule(student) };
    const sset = new Set(scheduled);
    for (const k of scheduled) {
        const st = dayStatus(student, k, evidence);
        if (st === 'cancelled') { res.cancelled++; continue; }
        res.expected++;
        if (st === 'present') res.present++;
        else if (st === 'absent') res.absent++;
        else { res.unconfirmed++; res.unconfirmedDays.push(k); }
    }
    const prefix = `${year}-${pad(monthIndex0 + 1)}-`;
    if (evidence) for (const k of evidence) if (k.startsWith(prefix) && !sset.has(k) && dayStatus(student, k, evidence) === 'present') res.extra++;
    // الساعات = مجموع المدد الفعلية المسجَّلة لأيام الحضور (المجدولة والإضافية). يوم حضور بلا مدة مسجَّلة = ناقص (لا نفترض مدة الجدول)
    const mins = (student && student.attendanceMinutes) || {};
    const presentKeys = scheduled.filter(k => dayStatus(student, k, evidence) === 'present');
    if (evidence) for (const k of evidence) if (k.startsWith(prefix) && !sset.has(k) && dayStatus(student, k, evidence) === 'present') presentKeys.push(k);
    let totalMin = 0;
    res.minutesMissingDays = [];
    for (const k of presentKeys) { const m = Number(mins[k]); if (m > 0) totalMin += m; else res.minutesMissingDays.push(k); }
    res.hoursMissing = res.minutesMissingDays.length;
    res.totalMinutes = totalMin;
    res.hours = Math.round((totalMin / 60) * 10) / 10;
    // لا تخمين: النسبة لا تُحسب إلا إذا تأكدت كل الحصص المجدولة (يوم بلا دليل ولا تأكيد ≠ غياب)
    res.complete = res.unconfirmed === 0;
    res.pct = res.expected > 0 && res.complete ? Math.round((res.present / res.expected) * 100) : null;
    return res;
}

/** هل يُسأل المعلم اليوم عن هذا الطالب؟ يوم مجدول (الآن أو قبله) بلا دليل ولا تأكيد ولم يُتجاهل. */
export function needsConfirmation(student, key, evidence) {
    if (!hasSchedule(student)) return false;
    const dow = new Date(key + 'T12:00:00').getDay();
    if (!student.schedule.days.map(Number).includes(dow)) return false;
    return dayStatus(student, key, evidence) === 'unconfirmed';
}

/** يضبط تأكيد يوم (يعدّل كائن الطالب ويعيده). status = null يمسح التأكيد. */
export function setDayStatus(student, key, status) {
    if (!student.attendance || typeof student.attendance !== 'object') student.attendance = {};
    if (status == null) delete student.attendance[key];
    else if (ATTENDANCE_STATUSES.includes(status)) student.attendance[key] = status;
    return student;
}

/** يضبط مدة حصة يوم بالدقائق (يعدّل كائن الطالب ويعيده). minutes = null يمسحها. */
export function setDayMinutes(student, key, minutes) {
    if (!student.attendanceMinutes || typeof student.attendanceMinutes !== 'object') student.attendanceMinutes = {};
    const m = Math.round(Number(minutes));
    if (minutes == null) delete student.attendanceMinutes[key];
    else if (m > 0 && m <= 600) student.attendanceMinutes[key] = m;
    return student;
}
