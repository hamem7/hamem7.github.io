// engine/syncMerge.js
// ==========================================
// 🌟 [جديد 2026-10-13 — مزامنة سجل الطالب بين أجهزة المعلم] منطق الدمج الخالص (لا DOM ولا شبكة ولا قواعد بيانات) — يُختبر بـNode:
//   node tests/syncMerge.test.js
//
// المبدأ: بيانات الطالب القابلة للمزامنة "تراكمية" (سجل تقييمات + أحداث أداء)، فالدمج = اتحاد بلا حذف أبداً:
//   - لا يُحذف شيء محلي بسبب المزامنة، ودمج نفس البيانات مرتين لا يغيّر شيئاً (idempotent)، وترتيب الدمج لا يهم (commutative).
//   - الاستثناء الوحيد: إعادة اعتماد نفس التسليم تُنتج نسخة جديدة من أحداثه، فنُبقي أحدث نسخة فقط (وإلا ضوعف احتسابها).
// يُقسَّم ما يُرفع إلى "أجزاء" بالشهر (ثابتة التقسيم لنفس المجموعة) كي لا تتجاوز خلية الخادم، ولا يعاد رفع إلا الجزء الذي تغيّر.
// ==========================================

// ---------- أدوات أساسية ----------
export function stableStringify(v) {
    if (v === null || typeof v !== 'object') return JSON.stringify(v === undefined ? null : v);
    if (Array.isArray(v)) return '[' + v.map(stableStringify).join(',') + ']';
    return '{' + Object.keys(v).filter(k => v[k] !== undefined).sort().map(k => JSON.stringify(k) + ':' + stableStringify(v[k])).join(',') + '}';
}

// بصمة نصية سريعة (FNV-1a 32bit + الطول) — للمقارنة فقط لا للأمان
export function hashOf(v) {
    const s = typeof v === 'string' ? v : stableStringify(v);
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16) + '.' + s.length;
}

// ---------- أحداث الأداء ----------
const HW_SOURCES = new Set(['homework', 'backfill_homework']);

// مفتاح الحدث بلا الحقول المحلية (id التلقائي وstudentId الذي يختلف بين الأجهزة)
export function eventKey(ev) {
    const { id, studentId, ...rest } = ev || {};
    return stableStringify(rest);
}

export function stripLocalEventFields(ev) {
    const { id, studentId, ...rest } = ev || {};
    return rest;
}

// أحداث التسليم الواحد (refId) تُعامل كوحدة: يفوز مصدر 'homework' على 'backfill_homework'، ثم الأحدث ts. أحداث بقية المصادر اتحاد بسيط.
function winnerKeyOfGroups(events) {
    const groups = new Map();
    events.forEach(ev => {
        if (!ev || !HW_SOURCES.has(ev.source) || ev.refId === undefined || ev.refId === null) return;
        const g = String(ev.refId);
        const rank = (ev.source === 'homework' ? 1e15 : 0) + (Number(ev.ts) || 0);
        const cur = groups.get(g);
        if (!cur || rank > cur.rank) groups.set(g, { rank, source: ev.source, ts: Number(ev.ts) || 0 });
    });
    return groups;
}

/**
 * يدمج أحداث محلية وبعيدة.
 * يرجع { merged, toAdd, supersededGroups }:
 *   merged            : القائمة النهائية بلا id/studentId (مرتّبة ثابتاً)
 *   toAdd             : أحداث بعيدة جديدة تُضاف محلياً (بلا id/studentId)
 *   supersededGroups  : [{ refId, sources:[...] }] مجموعات تسليم محلية حلّت محلها نسخة أحدث → تُحذف أحداثها المحلية قبل إضافة toAdd
 */
export function mergeEvents(local, remote) {
    const L = (local || []).filter(Boolean), R = (remote || []).filter(Boolean);
    const all = new Map();                         // key → event(بلا حقول محلية)
    const origin = new Map();                      // key → { local, remote }
    const put = (ev, side) => {
        const k = eventKey(ev);
        if (!all.has(k)) all.set(k, stripLocalEventFields(ev));
        const o = origin.get(k) || { local: false, remote: false };
        o[side] = true; origin.set(k, o);
    };
    L.forEach(e => put(e, 'local')); R.forEach(e => put(e, 'remote'));

    const winners = winnerKeyOfGroups([...all.values()]);
    const merged = [];
    const dropped = new Set();                     // مفاتيح أحداث خسرت أمام نسخة أحدث
    all.forEach((ev, k) => {
        if (HW_SOURCES.has(ev.source) && ev.refId !== undefined && ev.refId !== null) {
            const w = winners.get(String(ev.refId));
            if (w && (ev.source !== w.source || (Number(ev.ts) || 0) !== w.ts)) { dropped.add(k); return; }
        }
        merged.push(ev);
    });
    merged.sort((a, b) => (Number(a.ts) || 0) - (Number(b.ts) || 0) || (eventKey(a) < eventKey(b) ? -1 : 1));

    const toAdd = [];
    merged.forEach(ev => { const o = origin.get(eventKey(ev)); if (o.remote && !o.local) toAdd.push(ev); });

    const sup = new Map();
    dropped.forEach(k => {
        const o = origin.get(k);
        if (!o.local) return;                      // خاسر بعيد فقط: لا شيء محلي يُحذف
        const ev = all.get(k);
        const key = String(ev.refId);
        if (!sup.has(key)) sup.set(key, new Set());
        sup.get(key).add(ev.source);
    });
    const supersededGroups = [...sup.entries()].map(([refId, srcs]) => ({ refId, sources: [...srcs] }));
    return { merged, toAdd, supersededGroups };
}

// ---------- سجل التقييمات (history_<id>) ----------
export function historyKey(entry) {
    if (entry && entry.submissionId) return 'sub:' + entry.submissionId;
    return 'h:' + stableStringify(entry);
}

/** اتحاد بمفتاح submissionId (أو المحتوى)، والأحدث timestamp يفوز عند التعارض. يرجع { merged, added, changed } */
export function mergeHistory(local, remote) {
    const out = new Map();
    let added = 0, changed = 0;
    (local || []).filter(Boolean).forEach(e => out.set(historyKey(e), e));
    (remote || []).filter(Boolean).forEach(e => {
        const k = historyKey(e);
        const cur = out.get(k);
        if (!cur) { out.set(k, e); added++; return; }
        if ((Number(e.timestamp) || 0) > (Number(cur.timestamp) || 0)) { out.set(k, e); changed++; }
    });
    const merged = [...out.values()];
    // ترتيب ثابت: حسب الزمن ثم المفتاح (المدخلات بلا timestamp تُعتبر الأقدم)
    merged.sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0) || (historyKey(a) < historyKey(b) ? -1 : 1));
    return { merged, added, changed };
}

// ---------- ملف الطالب (للإنشاء على جهاز جديد فقط) ----------
export const PROFILE_EXCLUDED = new Set(['id', 'avatar']);

export function profileOf(student) {
    const out = {};
    Object.keys(student || {}).forEach(k => { if (!PROFILE_EXCLUDED.has(k) && student[k] !== undefined && typeof student[k] !== 'function') out[k] = student[k]; });
    return out;
}

export function normalizeName(s) {
    return String(s || '').replace(/[ً-ٰـ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * يطابق ملفات بعيدة بطلاب محليين لم يُزامَنوا بعد (بلا syncUid) بالاسم عند التطابق الفريد من الجهتين فقط.
 * remoteProfiles: [{uid, name}] ، localStudents: [{id, name, syncUid?}] → Map(localId → uid)
 */
export function adoptByUniqueName(remoteProfiles, localStudents) {
    const knownUids = new Set((localStudents || []).filter(s => s.syncUid).map(s => s.syncUid));
    const freeRemote = (remoteProfiles || []).filter(p => p && !knownUids.has(p.uid));
    const freeLocal = (localStudents || []).filter(s => !s.syncUid);
    const count = (list, f) => { const m = new Map(); list.forEach(x => { const n = normalizeName(f(x)); m.set(n, (m.get(n) || 0) + 1); }); return m; };
    const rc = count(freeRemote, p => p.name), lc = count(freeLocal, s => s.name);
    const out = new Map();
    freeLocal.forEach(s => {
        const n = normalizeName(s.name);
        if (!n || lc.get(n) !== 1 || rc.get(n) !== 1) return;
        const p = freeRemote.find(r => normalizeName(r.name) === n);
        if (p) out.set(s.id, p.uid);
    });
    return out;
}

// ---------- التقسيم إلى أجزاء ----------
export const MAX_PART_CHARS = 200000;      // أقل بكثير من حد الخادم (≈330000) ليتسع تضخّم JSON

const monthOf = (ts) => {
    const t = Number(ts);
    if (!t || !isFinite(t)) return '0000-00';
    const d = new Date(t);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
};

/**
 * items مرتّبة ثابتاً. يرجع Map: partKey → مصفوفة. التقسيم حتمي لنفس المجموعة (فيتطابق على كل الأجهزة).
 * kind: 'e' أحداث | 'h' سجل. مفتاح الجزء: <uid>:<kind>:<YYYY-MM> أو <uid>:<kind>:<YYYY-MM>.<n> عند التجاوز.
 */
export function partitionItems(uid, kind, items, tsOf, maxChars = MAX_PART_CHARS) {
    const byMonth = new Map();
    (items || []).forEach(it => {
        const m = monthOf(tsOf(it));
        if (!byMonth.has(m)) byMonth.set(m, []);
        byMonth.get(m).push(it);
    });
    const out = new Map();
    [...byMonth.keys()].sort().forEach(m => {
        const list = byMonth.get(m);
        let cur = [], size = 2, n = 0;
        const flush = () => { out.set(`${uid}:${kind}:${m}${n ? '.' + n : ''}`, cur); n++; cur = []; size = 2; };
        list.forEach(it => {
            const len = JSON.stringify(it).length + 1;
            if (cur.length && size + len > maxChars) flush();
            cur.push(it); size += len;
        });
        if (cur.length) flush();
    });
    return out;
}

export const profileKey = (uid) => `${uid}:s`;
export const isProfileKey = (key) => /^[^:]+:s$/.test(key);
export function uidOfKey(key) { const i = String(key).indexOf(':'); return i > 0 ? key.slice(0, i) : null; }
export function kindOfKey(key) { const m = /^[^:]+:([seh])(?::|$)/.exec(String(key)); return m ? m[1] : null; }

export function newSyncUid(rand = Math.random) {
    let s = 'S';
    for (let i = 0; i < 16; i++) s += Math.floor(rand() * 16).toString(16);
    return s;
}
