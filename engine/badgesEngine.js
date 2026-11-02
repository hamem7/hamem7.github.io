// engine/badgesEngine.js
// =============================================================================
// 🏅 محرّك الأوسمة الشهرية — دوال خالصة (بلا DOM ولا قاعدة بيانات)، مصدر الحقيقة الوحيد لتعريف الأوسمة وعتباتها.
// المبدأ: كل وسام يُحسب من أحداث مسجَّلة فعلًا فقط، بعتبات ثابتة معلنة، فلا وسام بلا دليل. الأوسمة اليدوية خارج هذا المحرّك.
//
// الدرجات: bronze < silver < gold < diamond. كل وسام له عتبات th[0..3]؛ الدرجة = أعلى عتبة بلغتها القيمة.
// قيمة غير متوفرة (null) = «لا بيانات لهذا الشهر» → الوسام يُتجاهل (لا يُعرض ولا يُحتسب) بدل تخمين رقم.
// منع التلاعب: الألعاب تُحتسب بحدّ أقصى لعبتين في اليوم الواحد (MAX_GAMES_PER_DAY).
// =============================================================================

export const TIER_KEYS = ['bronze', 'silver', 'gold', 'diamond'];
export const MAX_GAMES_PER_DAY = 2;
export const SKILLED_MIN_SCORE = 90;     // الماهر
export const ACTIVE_MIN_SCORE = 50;      // المثابر: لعبة جادّة لا مجرد ضغط
export const FIXER_MIN_SCORE = 80;       // المُصلِح
export const PERFECT_SCORE = 100;        // الكامل
export const RISER_MIN_GAMES = 3;        // الصاعد: عدد ألعاب كل شهر ليصحّ القياس
export const STEADY_DIAMOND_MIN_SESSIONS = 8;

// الأوسمة (14 درجاتية). unit: مفتاح وحدة العرض؛ group: مجموعة العرض في التقرير والخزانة.
export const BADGE_DEFS = [
    { key: 'skilled',  icon: '🎯', group: 'games',     th: [4, 8, 12, 16],  unit: 'games' },
    { key: 'perfect',  icon: '💯', group: 'games',     th: [1, 3, 5, 8],    unit: 'games' },
    { key: 'active',   icon: '🎮', group: 'games',     th: [4, 8, 12, 20],  unit: 'games' },
    { key: 'fixer',    icon: '🛠️', group: 'games',     th: [1, 3, 5, 8],    unit: 'games' },
    { key: 'riser',    icon: '📈', group: 'games',     th: [1, 5, 10, 15],  unit: 'points' },
    { key: 'hero',     icon: '🏅', group: 'memorize',  th: [10, 25, 50, 100], unit: 'ayahs' },
    { key: 'rasikh',   icon: '🧠', group: 'memorize',  th: [1, 2, 3, 5],    unit: 'parts' },
    { key: 'star',     icon: '⭐', group: 'engage',    th: [3, 6, 10, 15],  unit: 'questions' },
    { key: 'steady',   icon: '📅', group: 'engage',    th: [75, 90, 100, 100], unit: 'percent' },
    { key: 'tjLearn',  icon: '📚', group: 'tajweed',   th: [1, 2, 4, 6],    unit: 'rules' },
    { key: 'tjApply',  icon: '✍️', group: 'tajweed',   th: [1, 2, 4, 6],    unit: 'rules' },
    { key: 'tjExam',   icon: '💡', group: 'tajweed',   th: [1, 2, 3, 5],    unit: 'rules' },
    { key: 'tjMaster', icon: '📖', group: 'tajweed',   th: [1, 2, 3, 5],    unit: 'rules' },
    { key: 'duelist',  icon: '⚔️', group: 'duels',     th: [1, 3, 6, 10],   unit: 'wins' }
];
export const BADGE_GROUPS = ['games', 'memorize', 'engage', 'tajweed', 'duels'];
export const getBadgeDef = (key) => BADGE_DEFS.find(b => b.key === key) || null;

const dayKey = (ts) => { const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };

/** يعدّ العناصر المطابقة بحدّ أقصى cap لكل يوم تقويمي (يمنع تكديس ألعاب يوم واحد). */
export function countCappedPerDay(games, predicate, cap = MAX_GAMES_PER_DAY) {
    const perDay = {};
    let n = 0;
    for (const g of games || []) {
        if (!g || typeof g.timestamp !== 'number' || !predicate(g)) continue;
        const k = dayKey(g.timestamp);
        perDay[k] = (perDay[k] || 0) + 1;
        if (perDay[k] <= cap) n++;
    }
    return n;
}

const avgScore = (games) => {
    const a = (games || []).filter(g => g && typeof g.score === 'number');
    return a.length ? a.reduce((s, g) => s + g.score, 0) / a.length : null;
};

/** درجة القيمة: فهرس 0..3 أو -1 إن لم تبلغ العتبة الأولى. العتبات المكرّرة (steady) تُعالَج بقاعدة خاصة. */
export function tierIndexFor(value, th) {
    let idx = -1;
    for (let i = 0; i < th.length; i++) if (value >= th[i]) idx = i;
    return idx;
}

/**
 * يحسب قيمة كل وسام من مدخلات الشهر. المدخلات (كلها اختيارية؛ المفقود = null = لا يُحسب):
 *  games: [{timestamp, score, mode}]  ألعاب فردية في الشهر (بلا واجبات)     prevGames: ألعاب الشهر السابق
 *  stars: عدد الإجابات المميزة في الشهر  | newAyahs: آيات الحفظ الجديد | reviewParts: أجزاء المراجعة المسجَّلة
 *  attendance: {expected, present} | tajweed: {learned, practiced, examFirstTry, approved} | duelWins
 */
export function computeBadgeValues(input = {}) {
    const g = Array.isArray(input.games) ? input.games : null;
    const v = {};
    if (g) {
        v.skilled = countCappedPerDay(g, x => x.score >= SKILLED_MIN_SCORE);
        v.perfect = countCappedPerDay(g, x => x.score >= PERFECT_SCORE);
        v.active = countCappedPerDay(g, x => x.score >= ACTIVE_MIN_SCORE);
        v.fixer = countCappedPerDay(g, x => x.mode === 'weakness' && x.score >= FIXER_MIN_SCORE);
        const prev = Array.isArray(input.prevGames) ? input.prevGames : null;
        if (prev && g.length >= RISER_MIN_GAMES && prev.length >= RISER_MIN_GAMES) {
            v.riser = Math.max(0, Math.round(avgScore(g) - avgScore(prev)));
        } else v.riser = null;
    }
    v.hero = Number.isFinite(input.newAyahs) ? Math.max(0, input.newAyahs) : null;
    v.rasikh = Number.isFinite(input.reviewParts) ? Math.max(0, input.reviewParts) : null;
    v.star = Number.isFinite(input.stars) ? Math.max(0, input.stars) : null;
    const a = input.attendance;
    v.steady = a && a.expected > 0 ? Math.min(100, Math.round((a.present / a.expected) * 100)) : null;
    const tj = input.tajweed;
    v.tjLearn = tj ? tj.learned : null;
    v.tjApply = tj ? tj.practiced : null;
    v.tjExam = tj ? tj.examFirstTry : null;
    v.tjMaster = tj ? tj.approved : null;
    v.duelist = Number.isFinite(input.duelWins) ? input.duelWins : null;
    return v;
}

/** يحوّل القيم إلى نتائج الأوسمة: [{key, icon, group, value, tier (0..3|-1), tierKey, next:{at,remaining}|null, unit}] */
export function computeMonthBadges(input = {}) {
    const values = computeBadgeValues(input);
    const out = [];
    for (const def of BADGE_DEFS) {
        const value = values[def.key];
        if (value == null) continue; // لا بيانات ← لا وسام ولا عدّاد
        let tier = tierIndexFor(value, def.th);
        // المواظب: الماسي = حضور كامل مع حدّ أدنى للحصص حتى لا يُمنح عن حصة أو حصتين
        if (def.key === 'steady') {
            const exp = input.attendance ? input.attendance.expected : 0;
            tier = value >= 100 && exp >= STEADY_DIAMOND_MIN_SESSIONS ? 3 : Math.min(tierIndexFor(value, def.th), 2);
        }
        const nextAt = tier >= 3 ? null : (def.key === 'steady' && tier === 2 ? 100 : def.th[tier + 1]);
        out.push({
            key: def.key, icon: def.icon, group: def.group, unit: def.unit, value, tier,
            tierKey: tier >= 0 ? TIER_KEYS[tier] : null,
            next: nextAt == null ? null : { at: nextAt, remaining: Math.max(nextAt - value, 0) }
        });
    }
    return out;
}

/** الأوسمة المكتسبة فقط (tier ≥ 0)، مع المجموع حسب الدرجة — لعرض «أوسمتك هذا الشهر». */
export function summarizeEarned(results) {
    const earned = (results || []).filter(r => r.tier >= 0);
    const byTier = { bronze: 0, silver: 0, gold: 0, diamond: 0 };
    earned.forEach(r => { byTier[r.tierKey]++; });
    return { earned, total: earned.length, byTier };
}

/** أقرب وسام لم يُنل بعد (لتحفيز الشهر القادم): أصغر remaining نسبيًا. */
export function closestToNext(results) {
    const c = (results || []).filter(r => r.next && r.next.remaining > 0 && r.next.at > 0);
    c.sort((a, b) => (a.next.remaining / a.next.at) - (b.next.remaining / b.next.at));
    return c[0] || null;
}
