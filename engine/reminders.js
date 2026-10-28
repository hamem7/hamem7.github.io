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
        // أيام الأسبوع (0=أحد … 6=سبت) للتكرار الأسبوعي فقط؛ فارغة = كل 7 أيام من موعد البداية
        days: raw.repeat === 'weekly' && Array.isArray(raw.days)
            ? [...new Set(raw.days.map(Number).filter(n => Number.isInteger(n) && n >= 0 && n <= 6))].sort((a, b) => a - b)
            : [],
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

/**
 * أول موعد متكرر بعد `after` بنفس الساعة (يحترم تغيّر التوقيت الصيفي لأنه يتقدّم بالتاريخ لا بالمللي ثانية).
 * أسبوعي بأيام محددة (days): أقرب يوم من الأيام المختارة بنفس ساعة `at`.
 */
export function nextOccurrence(at, repeat, after, days = []) {
    if (repeat === 'weekly' && days.length) {
        const t = new Date(at);
        const d = new Date(after);
        d.setHours(t.getHours(), t.getMinutes(), 0, 0);
        for (let i = 0; i <= 14; i++) {
            const c = new Date(d.getFullYear(), d.getMonth(), d.getDate() + i, t.getHours(), t.getMinutes(), 0, 0);
            if (days.includes(c.getDay()) && c.getTime() > after) return c.getTime();
        }
    }
    const step = repeat === 'weekly' ? 7 : 1;
    const d = new Date(at);
    const gapDays = Math.floor((after - at) / DAY);
    if (gapDays > step) d.setDate(d.getDate() + Math.floor(gapDays / step) * step);
    while (d.getTime() <= after) d.setDate(d.getDate() + step);
    return d.getTime();
}

/** أول موعد تنبيه لتذكير متكرر جديد: اليوم بهذه الساعة إن لم تفت، وإلا أقرب موعد تالٍ (يومي) أو أقرب يوم مختار (أسبوعي). */
export function firstOccurrence(repeat, days, hour, minute, now) {
    const today = new Date(now);
    today.setHours(hour, minute, 0, 0);
    if (repeat === 'daily') return today.getTime() > now ? today.getTime() : nextOccurrence(today.getTime(), 'daily', now);
    return nextOccurrence(today.getTime(), 'weekly', now, days);
}

/** إكمال التذكير: غير المتكرر يُعلَّم منجزاً، والمتكرر يتقدّم لموعده التالي ويبقى فعّالاً. */
export function complete(r, now) {
    if (r.repeat === 'none') return { ...r, done: true, doneAt: now, snoozeUntil: null };
    return { ...r, at: nextOccurrence(r.at, r.repeat, Math.max(now, r.at), r.days), snoozeUntil: null, doneAt: now };
}

/**
 * «اضبطه وانسه»: التذكير المتكرر الذي لم يُنجَز ومرّ موعده التالي يقفز تلقائياً لآخر موعد حلّ (≤ الآن) فيُنبّه من جديد
 * بدل أن يبقى متأخراً بلا تنبيه إلى الأبد. غير المتكرر والمنجز لا يتغيران.
 */
export function rollForward(r, now) {
    if (r.repeat === 'none' || r.done) return r;
    let next = nextOccurrence(r.at, r.repeat, r.at, r.days);
    if (next > now) return r;
    for (let i = 0; i < 2000; i++) {
        const n2 = nextOccurrence(next, r.repeat, next, r.days);
        if (n2 > now) break;
        next = n2;
    }
    return { ...r, at: next, snoozeUntil: null };
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
