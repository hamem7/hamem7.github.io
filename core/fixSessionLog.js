// core/fixSessionLog.js — جلسات «علاج وتصحيح الأخطاء» في سجل الطالب (history_<id>).
// تُحفَظ بالحقل mode:'weakness' ومعها fix:{total,correct,resolved,pendingConfirm,remaining} للجلسات الجديدة.
// السجلات القديمة بلا mode نتعرّف عليها من نص range (نفس خط الرجوع في reports/report.js).
// دوال خالصة بلا DOM: يستعملها ملف الطالب والتقرير الشهري.
// (بلا استيراد من i18n عمداً: تفادياً لدورة استيراد؛ النص الإنجليزي لسجلات قديمة محفوظ بلغة الواجهة وقتها)

const WEAKNESS_RANGE = 'جلسة علاج وتصحيح الأخطاء السابقة';
const WEAKNESS_RANGE_EN = 'Previous mistakes treatment and correction session';

export function isFixSessionEntry(h) {
    return !!h && !h.hwId && h.source !== 'homework' && (h.mode === 'weakness'
        || (typeof h.range === 'string' && (h.range === WEAKNESS_RANGE || h.range === WEAKNESS_RANGE_EN)));
}

/** أرقام الجلسة المحفوظة أو null للسجلات القديمة التي لا تحمل تفصيلاً. */
export function fixDetail(h) {
    const f = h && h.fix;
    if (!f || typeof f !== 'object') return null;
    const n = (x) => (typeof x === 'number' && isFinite(x) && x >= 0 ? x : 0);
    return { total: n(f.total), correct: n(f.correct), resolved: n(f.resolved), pending: n(f.pendingConfirm), remaining: n(f.remaining) };
}

/**
 * جلسات العلاج ضمن [start, end) مرتّبة زمنياً، كل عنصر: {timestamp, date, score, detail|null}.
 * الإجماليات: fixed = مجموع ما ثبت نهائياً في كل الجلسات، وwaiting/left من آخر جلسة لها تفصيل (الحالة الأحدث).
 */
export function collectFixSessions(history, start, end) {
    const list = (Array.isArray(history) ? history : [])
        .filter(h => isFixSessionEntry(h) && typeof h.timestamp === 'number' && h.timestamp >= start && h.timestamp < end)
        .map(h => ({ timestamp: h.timestamp, date: h.date || '', score: typeof h.score === 'number' ? h.score : 0, detail: fixDetail(h) }))
        .sort((a, b) => a.timestamp - b.timestamp);
    const detailed = list.filter(s => s.detail);
    const last = detailed.length ? detailed[detailed.length - 1].detail : null;
    return {
        list,
        count: list.length,
        fixed: detailed.reduce((s, x) => s + x.detail.resolved, 0),
        waiting: last ? last.pending : 0,
        left: last ? last.remaining : 0,
        hasDetail: detailed.length > 0
    };
}
