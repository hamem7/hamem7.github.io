// engine/backupRetention.js — سياسة الاحتفاظ بنسخ Google Drive الاحتياطية (دالة خالصة بلا أي وصول لشبكة أو متصفح).
// السياسة: نُبقي آخر 7 نسخ، ثم أحدث نسخة من كل أسبوع من آخر 4 أسابيع، ثم أحدث نسخة من كل شهر من آخر 6 أشهر.
// ما عدا ذلك يُرشَّح للحذف. لا يُرشَّح شيء أبداً إن كان عدد النسخ ≤ 7، ولا تُحذف أحدث نسخة مهما كانت المدخلات.
// المدخل: [{ id, createdTime }] (createdTime بالمللي ثانية أو نص ISO). المخرج: مصفوفة id للحذف.

export const KEEP_LATEST = 7;
export const KEEP_WEEKS = 4;
export const KEEP_MONTHS = 6;
const DAY = 24 * 3600 * 1000;

const toMs = (v) => (typeof v === 'number' ? v : Date.parse(v));

export function selectBackupsToDelete(items, now = Date.now()) {
    const list = (items || [])
        .map(x => ({ id: x.id, t: toMs(x.createdTime) }))
        .filter(x => x.id && Number.isFinite(x.t))
        .sort((a, b) => b.t - a.t);               // الأحدث أولاً
    if (list.length <= KEEP_LATEST) return [];

    const keep = new Set(list.slice(0, KEEP_LATEST).map(x => x.id));

    const seenWeek = new Set();
    for (const x of list) {
        const w = Math.floor((now - x.t) / (7 * DAY));
        if (w >= 0 && w < KEEP_WEEKS && !seenWeek.has(w)) { seenWeek.add(w); keep.add(x.id); }
    }

    const nowD = new Date(now);
    const seenMonth = new Set();
    for (const x of list) {
        const d = new Date(x.t);
        const m = (nowD.getUTCFullYear() - d.getUTCFullYear()) * 12 + (nowD.getUTCMonth() - d.getUTCMonth());
        if (m >= 0 && m < KEEP_MONTHS && !seenMonth.has(m)) { seenMonth.add(m); keep.add(x.id); }
    }

    return list.filter(x => !keep.has(x.id)).map(x => x.id);
}
