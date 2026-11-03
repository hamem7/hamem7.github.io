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
export const PERFECT_SCORE = 100;        // العلامة الكاملة، والماهر بالقرآن، ومصحّح الأخطاء
export const RISER_MIN_GAMES = 3;        // النجم الصاعد: عدد ألعاب كل شهر ليصحّ القياس
// «حلقة» = يوم لعب فيه الطالب. الماهر بالقرآن/مصحّح الأخطاء = أطول سلسلة حلقات متتالية في كل منها لعبة بنتيجة ١٠٠٪
// (أي حلقة لعب فيها دون ١٠٠٪ تقطع السلسلة). مصحّح الأخطاء يعدّ حلقات «تحدي الأخطاء» فقط.
// تجويد التطبيق: مجموع الأسئلة الصحيحة في ألعاب التجويد خلال الشهر.

// الأوسمة (٩ درجاتية — بطلب صاحب المنصة لا أوسمة غيرها). unit: مفتاح وحدة العرض؛ group: مجموعة العرض في التقرير والخزانة.
export const BADGE_DEFS = [
    { key: 'skilled',  icon: '🎯', group: 'games',     th: [3, 5, 7, 10],   unit: 'sessions' },
    { key: 'fixer',    icon: '🛠️', group: 'games',     th: [3, 5, 7, 10],   unit: 'sessions' },
    { key: 'riser',    icon: '📈', group: 'games',     th: [2, 3, 4, 6],    unit: 'months' },
    { key: 'hero',     icon: '🏅', group: 'memorize',  th: [40, 80, 120, 200], unit: 'ayahs' },
    { key: 'reviewer', icon: '🔁', group: 'memorize',  th: [300, 600, 900, 1500], unit: 'ayahs' },
    { key: 'rasikh',   icon: '🧠', group: 'memorize',  th: [5, 10, 20, 30], unit: 'parts' },
    { key: 'star',     icon: '⭐', group: 'engage',    th: [20, 30, 40, 60], unit: 'questions' },
    { key: 'tjApply',  icon: '✍️', group: 'tajweed',   th: [50, 100, 200, 300], unit: 'questions' },
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

/** أطول سلسلة «حلقات» (أيام لعب) متتالية كل منها فيه لعبة بنتيجة ١٠٠٪. include: أي الألعاب تُعدّ حلقة. */
export function perfectSessionStreak(games, include = () => true) {
    const days = {};
    for (const g of games || []) {
        if (!g || typeof g.timestamp !== 'number' || !include(g)) continue;
        const d = new Date(g.timestamp), k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        days[k] = days[k] || (typeof g.score === 'number' && g.score >= PERFECT_SCORE);
    }
    let best = 0, run = 0;
    for (const k of Object.keys(days).map(Number).sort((a, b) => a - b)) { run = days[k] ? run + 1 : 0; best = Math.max(best, run); }
    return best;
}

/** النجم الصاعد: عدد الأشهر المتتالية (حتى هذا الشهر) التي ارتفع فيها متوسط النتائج عن الشهر الذي قبله.
 *  monthAvgs: [متوسط هذا الشهر، الذي قبله، ...] و null لشهر بلا ألعاب كافية. يُرجع null إن تعذّر القياس أصلًا. */
export function risingMonths(monthAvgs) {
    const a = Array.isArray(monthAvgs) ? monthAvgs : [];
    if (a.length < 2 || a[0] == null || a[1] == null) return null;
    let n = 0;
    for (let i = 0; i + 1 < a.length && a[i] != null && a[i + 1] != null && a[i] > a[i + 1]; i++) n++;
    return n;
}

const avgScore = (games) => {
    const a = (games || []).filter(g => g && typeof g.score === 'number');
    return a.length ? a.reduce((s, g) => s + g.score, 0) / a.length : null;
};

/** درجة القيمة: فهرس 0..3 أو -1 إن لم تبلغ العتبة الأولى.  */
export function tierIndexFor(value, th) {
    let idx = -1;
    for (let i = 0; i < th.length; i++) if (value >= th[i]) idx = i;
    return idx;
}

/**
 * يحسب قيمة كل وسام من مدخلات الشهر. المدخلات (كلها اختيارية؛ المفقود = null = لا يُحسب):
 *  games: [{timestamp, score, mode}]  ألعاب فردية في الشهر (بلا واجبات)     prevGames: ألعاب الشهر السابق
 *  monthAvgs: [متوسط هذا الشهر، السابق، ...] (null لشهر بلا ٣ ألعاب) — للنجم الصاعد؛ إن غاب يُقاس من games/prevGames
 *  stars: عدد الإجابات المميزة في الشهر  | newAyahs: آيات الحفظ الجديد | reviewParts: أجزاء المراجعة المسجَّلة
 *  reviewQuestions: «دفتر المراجعة» = آيات ظهرت له في الألعاب الفردية والواجب المنزلي (عند التسليم) خلال الشهر | tajweedCorrect: أسئلة صحيحة في ألعاب التجويد
 *  duelWins
 */
export function computeBadgeValues(input = {}) {
    const g = Array.isArray(input.games) ? input.games : null;
    const v = {};
    if (g) {
        v.skilled = perfectSessionStreak(g);
        v.fixer = perfectSessionStreak(g, x => x.mode === 'weakness');
    }
    if (Array.isArray(input.monthAvgs)) v.riser = risingMonths(input.monthAvgs);
    else if (g) {
        const prev = Array.isArray(input.prevGames) ? input.prevGames : null;
        const ok = (x) => x && x.length >= RISER_MIN_GAMES;
        v.riser = ok(g) && ok(prev) ? risingMonths([avgScore(g), avgScore(prev)]) : null;
    }
    v.hero = Number.isFinite(input.newAyahs) ? Math.max(0, input.newAyahs) : null;
    v.reviewer = Number.isFinite(input.reviewQuestions) ? Math.max(0, input.reviewQuestions) : null;
    v.rasikh = Number.isFinite(input.reviewParts) ? Math.max(0, input.reviewParts) : null;
    v.star = Number.isFinite(input.stars) ? Math.max(0, input.stars) : null;
    v.tjApply = Number.isFinite(input.tajweedCorrect) ? input.tajweedCorrect : null;
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
        const tier = tierIndexFor(value, def.th);
        const nextAt = tier >= 3 ? null : def.th[tier + 1];
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
