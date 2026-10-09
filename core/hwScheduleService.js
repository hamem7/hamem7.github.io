// core/hwScheduleService.js
// ==========================================================
// 🌟 [جديد — تذكير الواجب الأسبوعي] طبقة الربط بين المحرك الخالص (engine/hwSchedule.js) وبيانات المنصة: جدول كل طالب في ملفه
// (student.hwSchedule = { days:[...], startTs, snoozeUntil?, auto })، وأيام العمل في localStorage، وآخر واجب منشور لكل طالب
// من سجل الواجبات المحلي. تُستعمل في «مهام اليوم» (components/homeQuickview.js) وشاشة «جدول الأسبوع» (components/weekSchedule.js).
//
// قرارات المعلم: أيام العمل السبت إلى الخميس (افتراضياً، قابلة للتعديل)؛ الأيام تختلف من طالب لآخر ويوزّعها النظام تلقائياً
// بحيث لا تزدحم (الطاقة اليومية = إجمالي الخانات ÷ أيام العمل)؛ يستمر التذكير متأخراً يوماً بيوم حتى يُعدّ الواجب.
// فشل أي دالة هنا لا يُوقف الشاشة الرئيسية (المستدعي يلتقط الأخطاء).
// ==========================================================

import { AppState } from './app.js';
import {
    DEFAULT_WORKDAYS, DEFAULT_PER_WEEK, chooseDays, assignSchedules, rebalanceAll, weekSummary, dueInfo, nextWorkdayKey
} from '../engine/hwSchedule.js';

const WORKDAYS_KEY = 'dh_hw_workdays';
const FIRSTRUN_KEY = 'dh_hw_sched_first_v1';

export function getWorkDays() {
    try {
        const v = JSON.parse(localStorage.getItem(WORKDAYS_KEY));
        if (Array.isArray(v) && v.length && v.every(d => Number.isInteger(d) && d >= 0 && d <= 6)) return [...new Set(v)];
    } catch (e) { /* الافتراضي */ }
    return DEFAULT_WORKDAYS.slice();
}
export function setWorkDays(days) {
    const clean = [...new Set((days || []).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))];
    if (!clean.length) return;
    // نخزّن بترتيب الأسبوع العربي (السبت أولاً) ليظهر الجدول مرتّباً
    const order = [6, 0, 1, 2, 3, 4, 5];
    clean.sort((a, b) => order.indexOf(a) - order.indexOf(b));
    try { localStorage.setItem(WORKDAYS_KEY, JSON.stringify(clean)); } catch (e) { /* لا شيء */ }
}

const daysOf = (s) => (s && s.hwSchedule && Array.isArray(s.hwSchedule.days)) ? s.hwSchedule.days : null;

// عدد مرات الواجب الأسبوعية لطالب (من جدوله) — يدخل في حساب دورة المراجعة
export function perWeekOf(student) {
    const d = daysOf(student);
    return d && d.length ? d.length : DEFAULT_PER_WEEK;
}

async function visibleStudents() {
    const all = (await AppState.studentManager.getAllStudents()) || [];
    return all.filter(s => !s.isHidden);
}

// ترتيب العرض: السبت أولاً ثم الأحد … كما في أيام العمل
const orderWorkdays = (days) => { const wd = getWorkDays(); return days.slice().sort((a, b) => wd.indexOf(a) - wd.indexOf(b)); };

// يوزّع تلقائياً كل طالب ظاهر بلا جدول (أول تشغيل: الجميع؛ وفيما بعد: الطلاب الجدد) — لا يلمس من له جدول ولا الموقوف
let ensuring = null;
export function ensureSchedules() {
    if (!ensuring) ensuring = doEnsure().finally(() => { ensuring = null; });
    return ensuring;
}
async function doEnsure() {
    const students = await visibleStudents();
    const items = students.map(s => ({ id: s.id, days: daysOf(s) }));
    const out = assignSchedules(items, { workDays: getWorkDays(), perWeek: DEFAULT_PER_WEEK });
    const now = Date.now();
    for (const [id, days] of out) {
        const s = students.find(x => x.id === id);
        s.hwSchedule = { days: orderWorkdays(days), startTs: now, auto: true };
        await AppState.studentManager.updateStudent(s);
    }
    let first = false;
    try { first = !localStorage.getItem(FIRSTRUN_KEY) && out.size > 0; if (out.size > 0 || students.length) localStorage.setItem(FIRSTRUN_KEY, String(now)); } catch (e) { /* لا شيء */ }
    return { assigned: out.size, firstRun: first, total: students.length };
}

// نموذج جدول الأسبوع: الطلاب وأيامهم وحمل كل يوم مقابل الطاقة
export async function getWeekModel() {
    const students = await visibleStudents();
    const workDays = getWorkDays();
    const items = students.map(s => ({ id: s.id, days: daysOf(s) || [] }));
    return { students, workDays, summary: weekSummary(items, workDays) };
}

export async function setStudentDays(student, days) {
    const clean = [...new Set((days || []).filter(d => Number.isInteger(d) && d >= 0 && d <= 6))];
    student.hwSchedule = { ...(student.hwSchedule || {}), days: clean, startTs: Date.now(), auto: false, snoozeUntil: null };
    await AppState.studentManager.updateStudent(student);
}

// يضبط عدد مرات الواجب الأسبوعية لطالب (1 أو 2): يختار له أيامًا جديدة بحسب ازدحام باقي الطلاب. لا يغيّر شيئاً إن كان العدد نفسه
export async function setStudentPerWeek(student, perWeek) {
    const n = perWeek === 1 ? 1 : 2;
    if (daysOf(student) && daysOf(student).length === n) return false;
    const workDays = getWorkDays();
    const load = {};
    workDays.forEach(d => { load[d] = 0; });
    (await visibleStudents()).forEach(s => {
        if (s.id === student.id) return;
        (daysOf(s) || []).forEach(d => { if (d in load) load[d]++; });
    });
    await setStudentDays(student, orderWorkdays(chooseDays({ perWeek: n, workDays, load })));
    return true;
}

// إعادة توزيع الجميع (عدا الموقوفين) توزيعاً متوازناً جديداً
export async function rebalanceAllStudents() {
    const students = await visibleStudents();
    const out = rebalanceAll(students.map(s => ({ id: s.id, days: daysOf(s) })), { workDays: getWorkDays(), perWeek: DEFAULT_PER_WEEK });
    const now = Date.now();
    for (const [id, days] of out) {
        const s = students.find(x => x.id === id);
        s.hwSchedule = { days: orderWorkdays(days), startTs: now, auto: true };
        await AppState.studentManager.updateStudent(s);
    }
    return out.size;
}

// تأجيل تذكير طالب إلى يوم العمل التالي (يعود متأخراً بعدها إن لم يُعدّ الواجب)
export async function snoozeStudent(student) {
    student.hwSchedule = { ...(student.hwSchedule || {}), snoozeUntil: nextWorkdayKey(Date.now(), getWorkDays()) };
    await AppState.studentManager.updateStudent(student);
}

// آخر واجب منشور لكل طالب (بالاسم، كبقية شاشات الواجبات): Map اسم ← وقت
async function lastPublishedByName() {
    const m = new Map();
    try {
        ((await AppState.homeworkManager.getAllHomeworks()) || []).forEach(h => {
            if (h.status !== 'published' || !h.assignedStudentName) return;
            const ts = Date.parse(h.createdAt) || 0;
            if (ts > (m.get(h.assignedStudentName) || 0)) m.set(h.assignedStudentName, ts);
        });
    } catch (e) { /* بلا واجبات محلية: كل المواعيد قائمة */ }
    return m;
}

// الطلاب الذين حان موعد واجبهم (اليوم أو متأخراً) ولم يُعدّ لهم واجب بعد، مع طاقة اليوم المتوازنة
export async function listDueToday(now = Date.now()) {
    const students = await visibleStudents();
    const last = await lastPublishedByName();
    const rows = [];
    students.forEach(s => {
        const info = dueInfo({
            days: daysOf(s), today: now, lastHomeworkTs: last.get(s.name) || 0,
            startTs: (s.hwSchedule && s.hwSchedule.startTs) || 0, snoozeUntil: (s.hwSchedule && s.hwSchedule.snoozeUntil) || null
        });
        if (info && !info.snoozed) rows.push({ student: s, ...info });
    });
    rows.sort((a, b) => (b.lateDays - a.lateDays) || String(a.student.name).localeCompare(String(b.student.name), 'ar'));
    const { capacity } = weekSummary(students.map(s => ({ id: s.id, days: daysOf(s) || [] })), getWorkDays());
    return { rows, capacity, over: rows.length > capacity };
}
