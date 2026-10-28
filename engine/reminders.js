// engine/reminders.js
// ==========================================================
// 🌟 [جديد — «تذكيراتي» منبّه المعلم الشخصي] منطق بحت (بلا DOM ولا تخزين): تنظيف السجل، موعد التنبيه الفعلي (مع التأجيل)،
// التصنيف إلى متأخر/اليوم/قادم/منجز، إكمال التذكير (التكرار اليومي/الأسبوعي يتقدّم للموعد التالي بنفس الساعة)، التأجيل،
// وأوقات الاختيار السريع. التخزين والتنبيه في core/reminders.js، والواجهة في components/reminders.js.
// تُمرَّر «الآن» (ms) دائماً كوسيط ليبقى الاختبار حتمياً (tests/reminders.test.js).
// ==========================================================

export const KINDS = ['student', 'personal', 'work'];
export const REPEATS = ['none', 'daily', 'weekly'];
export const SNOOZE_MINUTES = [5, 10, 30, 60];

const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;
const MAX_TITLE = 140;
const MAX_NOTE = 400;

export function newReminderId(now = Date.now()) {
    return 'r' + now.toString(36) + Math.random().toString(36).slice(2, 6);
}

/** ينظّف سجلاً خاماً (من التخزين أو النموذج) ويُرجع تذكيراً صالحاً أو null إن لم يصلح. */
export function sanitize(raw, now = Date.now()) {
    if (!raw || typeof raw !== 'object') return null;
    const title = String(raw.title == null ? '' : raw.title).replace(/\s+/g, ' ').trim().slice(0, MAX_TITLE);
    const at = Number(raw.at);
    if (!title || !Number.isFinite(at) || at <= 0) return null;
    const snooze = Number(raw.snoozeUntil);
    const sid = raw.studentId;
    return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : newReminderId(now),
        title,
        note: String(raw.note == null ? '' : raw.note).trim().slice(0, MAX_NOTE),
        at,
        kind: KINDS.includes(raw.kind) ? raw.kind : 'personal',
        repeat: REPEATS.includes(raw.repeat) ? raw.repeat : 'none',
        urgent: !!raw.urgent,
        studentId: (typeof sid === 'number' || (typeof sid === 'string' && sid)) ? sid : null,
        studentName: String(raw.studentName == null ? '' : raw.studentName).trim().slice(0, 80),
        snoozeUntil: Number.isFinite(snooze) && snooze > 0 ? snooze : null,
        done: !!raw.done,
        doneAt: Number.isFinite(Number(raw.doneAt)) && raw.doneAt ? Number(raw.doneAt) : null,
        createdAt: Number.isFinite(Number(raw.createdAt)) && raw.createdAt ? Number(raw.createdAt) : now
    };
}

export function dayStart(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

export function addDays(ts, n) {
    const d = new Date(ts);
    d.setDate(d.getDate() + n);
    return d.getTime();
}

/** الموعد الفعلي للتنبيه: التأجيل إن كان أبعد من الموعد الأصلي، وإلا الموعد نفسه. */
export function fireAt(r) {
    return r.snoozeUntil && r.snoozeUntil > r.at ? r.snoozeUntil : r.at;
}

export function isDue(r, now) {
    return !r.done && fireAt(r) <= now;
}

/** 'done' | 'overdue' (قبل بداية اليوم) | 'today' (حتى نهاية اليوم، حتى لو مرّ وقته) | 'upcoming' */
export function bucketOf(r, now) {
    if (r.done) return 'done';
    const f = fireAt(r);
    const today = dayStart(now);
    if (f < today) return 'overdue';
    if (f < today + DAY) return 'today';
    return 'upcoming';
}

export function summarize(list, now) {
    const out = { overdue: 0, today: 0, upcoming: 0, done: 0, actionable: 0 };
    for (const r of list) out[bucketOf(r, now)]++;
    out.actionable = out.overdue + out.today;
    return out;
}

/** أول موعد متكرر بعد `after` بنفس الساعة (يحترم تغيّر التوقيت الصيفي لأنه يتقدّم بالتاريخ لا بالمللي ثانية). */
export function nextOccurrence(at, repeat, after) {
    const step = repeat === 'weekly' ? 7 : 1;
    const d = new Date(at);
    const gapDays = Math.floor((after - at) / DAY);
    if (gapDays > step) d.setDate(d.getDate() + Math.floor(gapDays / step) * step);
    while (d.getTime() <= after) d.setDate(d.getDate() + step);
    return d.getTime();
}

/** إكمال التذكير: غير المتكرر يُعلَّم منجزاً، والمتكرر يتقدّم لموعده التالي ويبقى فعّالاً. */
export function complete(r, now) {
    if (r.repeat === 'none') return { ...r, done: true, doneAt: now, snoozeUntil: null };
    return { ...r, at: nextOccurrence(r.at, r.repeat, Math.max(now, r.at)), snoozeUntil: null, doneAt: now };
}

export function snooze(r, minutes, now) {
    return { ...r, snoozeUntil: now + minutes * MIN };
}

/** صباح الغد (الساعة 8 افتراضياً) لزر «أجّل لغد». */
export function tomorrowMorning(now, hour = 8) {
    const d = new Date(addDays(dayStart(now), 1));
    d.setHours(hour, 0, 0, 0);
    return d.getTime();
}

export function snoozeUntilTomorrow(r, now) {
    return { ...r, snoozeUntil: tomorrowMorning(now) };
}

/** أوقات الاختيار السريع في نموذج الإضافة. */
export function quickTimes(now) {
    const hour = new Date(now + 60 * MIN);
    hour.setSeconds(0, 0);
    const evening = new Date(now);
    evening.setHours(18, 0, 0, 0);
    if (evening.getTime() < now + 15 * MIN) evening.setTime(addDays(evening.getTime(), 1));
    return { hour: hour.getTime(), evening: evening.getTime(), tomorrow: tomorrowMorning(now) };
}

/** ترتيب القوائم: غير المنجز بحسب الموعد الفعلي تصاعدياً، ثم المنجز (الأحدث إنجازاً أولاً). */
export function sortReminders(list) {
    return list.slice().sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.done) return (b.doneAt || 0) - (a.doneAt || 0);
        return fireAt(a) - fireAt(b);
    });
}

/** المنجز الأقدم من `days` يوماً يُحذف تلقائياً حتى لا يتضخم التخزين. */
export function pruneDone(list, now, days = 30) {
    return list.filter(r => !(r.done && r.doneAt && now - r.doneAt > days * DAY));
}
