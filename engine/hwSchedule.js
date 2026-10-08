// engine/hwSchedule.js
// ==========================================
// 🌟 [جديد — تذكير الواجب الأسبوعي] جدول الواجبات الأسبوعي لكل طالب: توزيع الأيام تلقائياً حتى لا تزدحم على المعلم،
// وحساب «حان موعد واجب هذا الطالب» (يوم الموعد ثم متأخراً يوماً بيوم) حتى يُعدّ له واجب. ملف خالص (بلا DOM ولا قاعدة بيانات)،
// يُختبر بـNode: node tests/hwSchedule.test.js
//
// الأيام بترقيم JavaScript (getDay): 0=الأحد … 5=الجمعة، 6=السبت. أيام العمل الافتراضية: السبت إلى الخميس (قرار المعلم).
// الطالب بلا أيام (مصفوفة فارغة) = موقوف (لا تذكير ولا يُعاد توزيعه)؛ أما غير المسنَد (null/undefined) فيُوزَّع تلقائياً.
// ==========================================

export const DEFAULT_WORKDAYS = [6, 0, 1, 2, 3, 4];
export const WEEKDAY_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const WEEKDAY_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const DEFAULT_PER_WEEK = 2;
export const MIN_GAP_DAYS = 2;          // أقل فاصل مفضَّل بين واجبي الطالب
export const LEAD_DAYS = 2;             // واجب أُعدّ قبل موعده بيومين فأقل يُحسب لذلك الموعد
export const LOOKBACK_DAYS = 14;        // لا نعدّ مواعيد أقدم من أسبوعين (حتى لا تتراكم)

const DAY_MS = 86400000;

export function startOfDay(ts) {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}
function addDays(ts, n) {
    const d = new Date(ts);
    d.setDate(d.getDate() + n);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}
export function dayKey(ts) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// الطاقة اليومية المتوازنة = إجمالي خانات الأسبوع ÷ عدد أيام العمل (مقرَّبة للأعلى): تعتمد على عدد الطلاب المسجَّلين
export function capacityFor(totalSlots, workDaysCount) {
    return workDaysCount > 0 ? Math.max(1, Math.ceil(totalSlots / workDaysCount)) : 0;
}

function combos(arr, k) {
    const out = [];
    const rec = (start, cur) => {
        if (cur.length === k) { out.push(cur.slice()); return; }
        for (let i = start; i < arr.length; i++) { cur.push(arr[i]); rec(i + 1, cur); cur.pop(); }
    };
    rec(0, []);
    return out;
}

// الفواصل الدائرية بين أيام أسبوع (بالأيام الفعلية، مع الالتفاف للأسبوع التالي)
export function gapsOf(days) {
    const s = [...days].sort((a, b) => a - b);
    if (s.length < 2) return [7];
    const gaps = [];
    for (let i = 0; i < s.length; i++) gaps.push(i === s.length - 1 ? s[0] + 7 - s[i] : s[i + 1] - s[i]);
    return gaps;
}

// يختار أيام طالب (perWeek أيام من أيام العمل): الأقل ازدحاماً أولاً، ثم الأكثر تباعداً بالتساوي، وفاصل ≥ يومين ما أمكن
export function chooseDays({ perWeek = DEFAULT_PER_WEEK, workDays = DEFAULT_WORKDAYS, load = {} }) {
    const k = Math.min(perWeek, workDays.length);
    if (k <= 0) return [];
    const ideal = 7 / k;
    let best = null, bestCost = Infinity;
    combos(workDays, k).forEach(combo => {
        const gaps = gapsOf(combo);
        const gapPenalty = k === 1 ? 0 : gaps.reduce((a, g) => a + (g - ideal) ** 2, 0) + (Math.min(...gaps) < MIN_GAP_DAYS ? 50 : 0);
        const loadCost = combo.reduce((a, d) => a + ((load[d] || 0) + 1) ** 2, 0);
        const cost = loadCost * 10 + gapPenalty;
        if (cost < bestCost - 1e-9) { bestCost = cost; best = combo; }
    });
    return best;
}

// items: [{ id, days }] — days: مصفوفة (مسنَدة، تُحترم) أو null/undefined (تُوزَّع الآن). يرجع Map: id ← الأيام الجديدة للجدد فقط
export function assignSchedules(items, { workDays = DEFAULT_WORKDAYS, perWeek = DEFAULT_PER_WEEK } = {}) {
    const load = {};
    workDays.forEach(d => { load[d] = 0; });
    items.forEach(it => (it.days || []).forEach(d => { if (d in load) load[d]++; }));
    const out = new Map();
    items.filter(it => !Array.isArray(it.days)).forEach(it => {
        const days = chooseDays({ perWeek, workDays, load });
        days.forEach(d => { load[d]++; });
        out.set(it.id, days);
    });
    return out;
}

// إعادة توزيع الجميع من الصفر (عدا الموقوفين: أيامهم مصفوفة فارغة)
export function rebalanceAll(items, opts) {
    const fresh = items.map(it => ({ id: it.id, days: (Array.isArray(it.days) && it.days.length === 0) ? [] : null }));
    const assigned = assignSchedules(fresh, opts);
    const out = new Map();
    fresh.forEach(it => { if (assigned.has(it.id)) out.set(it.id, assigned.get(it.id)); });
    return out;
}

// ملخص الأسبوع: لكل يوم عمل أسماء طلابه وعددهم مقابل الطاقة المتوازنة
export function weekSummary(items, workDays = DEFAULT_WORKDAYS) {
    const perDay = workDays.map(day => ({ day, ids: [] }));
    let totalSlots = 0;
    items.forEach(it => (it.days || []).forEach(d => {
        const slot = perDay.find(x => x.day === d);
        if (slot) { slot.ids.push(it.id); totalSlots++; }
    }));
    const capacity = capacityFor(totalSlots, workDays.length);
    perDay.forEach(x => { x.count = x.ids.length; x.over = x.count > capacity; });
    return { perDay, capacity, totalSlots };
}

// يوم العمل التالي بعد today (مفتاح yyyy-mm-dd) — لتأجيل تذكير إلى الغد/أول يوم عمل
export function nextWorkdayKey(todayTs, workDays = DEFAULT_WORKDAYS) {
    for (let i = 1; i <= 7; i++) {
        const ts = addDays(todayTs, i);
        if (workDays.includes(new Date(ts).getDay())) return dayKey(ts);
    }
    return dayKey(addDays(todayTs, 1));
}

// هل حان موعد واجب لهذا الطالب؟ يرجع null أو { slotTs, lateDays, missed, snoozed, capped }
//   days        : أيام الطالب الأسبوعية
//   lastHomeworkTs: وقت آخر واجب منشور له (0 = لا شيء)
//   startTs     : متى بدأ هذا الجدول (مواعيد قبله لا تُحسب، فلا يظهر الجميع «متأخراً» عند التشغيل الأول)
//   snoozeUntil : مفتاح يوم (yyyy-mm-dd) مؤجَّل حتى بلوغه
// قاعدة الإسقاط: واجب واحد يُغطّي كل المواعيد حتى يومين بعده (لا نكدّس مواعيد فائتة) — فيظهر الطالب صفاً واحداً.
export function dueInfo({ days, today, lastHomeworkTs = 0, startTs = 0, snoozeUntil = null, lookbackDays = LOOKBACK_DAYS, leadDays = LEAD_DAYS }) {
    if (!Array.isArray(days) || !days.length) return null;
    const t0 = startOfDay(today);
    const lastHw = lastHomeworkTs ? startOfDay(lastHomeworkTs) : -Infinity;
    const start = startTs ? startOfDay(startTs) : -Infinity;
    let earliest = null, missed = 0;
    for (let back = lookbackDays; back >= 0; back--) {
        const d = addDays(t0, -back);
        if (d < start) continue;
        if (!days.includes(new Date(d).getDay())) continue;
        if (lastHw >= addDays(d, -leadDays)) continue;      // مغطّى بواجب نُشر قرب هذا الموعد أو بعده
        missed++;
        if (earliest === null) earliest = d;
    }
    if (earliest === null) return null;
    const lateDays = Math.round((t0 - earliest) / DAY_MS);
    return { slotTs: earliest, lateDays, missed, capped: lateDays >= lookbackDays, snoozed: !!(snoozeUntil && dayKey(t0) < snoozeUntil) };
}
