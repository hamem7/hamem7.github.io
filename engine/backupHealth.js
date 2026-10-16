// engine/backupHealth.js — «سلامة البيانات» لصفحة حسابي: دالة خالصة بلا متصفح ولا شبكة.
// المدخل: آخر نسخة على Drive وآخر نسخة على الجهاز (نص ISO أو مللي ثانية أو null). المخرج:
//   { level: 'ok' | 'warn' | 'bad', newestMs, ageDays, driveAgeDays, localAgeDays }
// القاعدة: ok = أحدث نسخة (من الاثنين) منذ ≤ WARN_AFTER_DAYS يوماً؛ warn = أقدم من ذلك؛ bad = لا توجد أي نسخة.
export const WARN_AFTER_DAYS = 7;
const DAY = 24 * 3600 * 1000;

const toMs = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = typeof v === 'number' ? v : Date.parse(v);
    return Number.isFinite(n) ? n : null;
};
const ageDays = (ms, now) => (ms === null ? null : Math.max(0, Math.floor((now - ms) / DAY)));

export function backupHealth({ driveAt = null, localAt = null, now = Date.now(), warnAfterDays = WARN_AFTER_DAYS } = {}) {
    const d = toMs(driveAt), l = toMs(localAt);
    const newest = Math.max(d === null ? -Infinity : d, l === null ? -Infinity : l);
    const out = { driveAgeDays: ageDays(d, now), localAgeDays: ageDays(l, now), newestMs: null, ageDays: null };
    if (newest === -Infinity) return { level: 'bad', ...out };
    out.newestMs = newest;
    out.ageDays = ageDays(newest, now);
    return { level: out.ageDays > warnAfterDays ? 'warn' : 'ok', ...out };
}
