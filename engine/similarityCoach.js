// engine/similarityCoach.js
//
// 🌟 [2026-11-07] «مدرّب المتشابهات» — منطق بحت (بلا DOM ولا IndexedDB) فيُختبر بـ Node.
// الهدف (بطلب المعلم): أن يستفيد المعلم من ركن المتشابهات مع طلابه مباشرة، لا أن يتصفح الأجزاء فقط:
//   - لكل طالب: المجموعات المتشابهة الواقعة كلها داخل محفوظه (memoFrom…memoTo)،
//   - «تدريب اليوم»: جولة قصيرة تختار له أولاً ما حان موعد مراجعته، ثم ما أخطأ فيه، ثم متشابهات جديدة من محفوظه،
//   - ملخّص سريع لبطاقة الطالب (متقن / يحتاج تثبيتاً / حان موعده / لم يبدأ).
// يعيد استخدام نموذج الإتقان الموجود (engine/similarityMastery.js) بلا أي تغيير في شكل البيانات المحفوظة.

import { groupSignature, levelOf, isDue, accuracyOf } from './similarityMastery.js';

// عدد المجموعات في «تدريب اليوم» (كل مجموعة تولّد عدة أسئلة، والجولة مسقوفة في similarityEngine)
export const DAILY_GROUPS = 8;

// نطاق التدريب: محفوظ الطالب (memorizedSurahsOf)، وإن لم يُحدَّد نطاقه بعد فجزء عمّ (78–114) — أول ما يحفظه أغلب الطلاب،
// بدل كل متشابهات المصحف (1600+ مجموعة لا معنى لنسبة إتقانها). isDefault يُعرض للمعلم ليحدّد النطاق من ملف الطالب.
export const AMMA_FALLBACK = Object.freeze({ from: 78, to: 114 });
export function coachMemo(memo) {
    if (memo && memo.size) return { memo, isDefault: false };
    const out = new Set();
    for (let n = AMMA_FALLBACK.from; n <= AMMA_FALLBACK.to; n++) out.add(n);
    return { memo: out, isDefault: true };
}

// سور المجموعة (من مواضعها، أو من حقل surahs احتياطاً)
export function groupSurahs(g) {
    const fromOcc = (g && g.occurrences || []).map(o => Number(o.surahNumber)).filter(Boolean);
    const list = fromOcc.length ? fromOcc : (g && g.surahs || []).map(Number).filter(Boolean);
    return [...new Set(list)];
}

// المجموعة تخص الطالب إن كانت كل سورها داخل محفوظه (memo = Set أرقام سور، أو null = بلا نطاق مسجّل)
export function groupInMemo(g, memo) {
    if (!memo) return true;
    const ss = groupSurahs(g);
    return ss.length > 0 && ss.every(s => memo.has(s));
}

// المجموعات المتاحة للطالب (المعطّلة عن الطلاب تُستبعد بالمرشّح الممرَّر من الشاشة إن وُجد)
// ⚠️ أسئلة الطالب في الألعاب («في أي سورتين؟» و«أي سورة لم ترد؟» — STUDENT_SIM_TYPES في similarityEngine) لا تُولَّد
// إلا لمجموعة تمتد على سورتين فأكثر؛ متشابهات السورة مع نفسها تبقى للتصفّح والواجب ولا تُحسب في التدريب.
export function eligibleGroups(groups, memo, isPlayable = () => true) {
    return (groups || []).filter(g => g && isPlayable(g) && groupSurahs(g).length >= 2 && groupInMemo(g, memo));
}

// خطة «تدريب اليوم»: due ← ضعيفة (الأقل دقة أولاً) ← جديدة ← متقنة (احتياط لملء الجولة فقط)
export function planStudentRound(groups, records, memo, { now = Date.now(), limit = DAILY_GROUPS, isPlayable, canAsk = null } = {}) {
    const bySig = new Map((records || []).map(r => [r.sig, r]));
    const due = [], weak = [], fresh = [], rest = [];
    eligibleGroups(groups, memo, isPlayable).forEach(g => {
        const rec = bySig.get(groupSignature(g));
        if (!rec || !rec.attempts) { fresh.push(g); return; }
        if (isDue(rec, now)) { due.push({ g, rec }); return; }
        const lv = levelOf(rec, now);
        if (lv === 'learning' || lv === 'improving') weak.push({ g, rec });
        else rest.push({ g, rec });
    });
    due.sort((a, b) => (a.rec.dueAt || 0) - (b.rec.dueAt || 0));
    weak.sort((a, b) => (accuracyOf(a.rec) ?? 100) - (accuracyOf(b.rec) ?? 100));
    // الجديدة: نبدأ بالأقرب لآخر ما حفظه (أصغر رقم سورة داخل النطاق — الحفظ يسير من الناس صعوداً)،
    // وبلا نطاق مسجّل نبدأ من آخر المصحف (جزء عمّ) لأنه أول ما يحفظه أغلب الطلاب
    const minS = (g) => Math.min(...groupSurahs(g));
    fresh.sort((a, b) => memo ? minS(a) - minS(b) : minS(b) - minS(a));
    rest.sort((a, b) => (a.rec.lastAt || 0) - (b.rec.lastAt || 0));

    const picked = [];
    // canAsk (اختياري): يتحقق أن المجموعة تولّد سؤالاً فعلاً لهذا الطالب (يحتاج المصحف محمَّلاً — من شاشة اللعب فقط)
    const take = (arr) => { for (const x of arr) { if (picked.length >= limit) break; const g = x.g || x; if (!canAsk || canAsk(g)) picked.push(g); } };
    take(due); take(weak); take(fresh); take(rest);
    return {
        groups: picked,
        counts: { due: due.length, weak: weak.length, fresh: fresh.length, mastered: rest.length },
        eligible: due.length + weak.length + fresh.length + rest.length
    };
}

// ملخّص بطاقة الطالب في ركن المتشابهات
export function studentCoachSummary(groups, records, memo, { now = Date.now(), isPlayable } = {}) {
    const plan = planStudentRound(groups, records, memo, { now, limit: 0, isPlayable });
    const { due, weak, fresh, mastered } = plan.counts;
    const total = plan.eligible;
    const practiced = total - fresh;
    const masteredPct = total ? Math.round((mastered / total) * 100) : 0;
    const hardest = (records || [])
        .filter(r => r.attempts >= 2 && accuracyOf(r) < 80)
        .sort((a, b) => accuracyOf(a) - accuracyOf(b))
        .slice(0, 3);
    return { total, practiced, due, weak, fresh, mastered, masteredPct, hardest };
}
