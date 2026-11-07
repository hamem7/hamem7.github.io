// core/i18n-stars.js
// نصوص رُتب النجوم الذهبية (عربي/English) — تُدمج في كائن translations الذي تستعمله المنصة كلها (core/i18n.js).
// أسماء الرُّتب نفسها في core/goldStars.js (STAR_RANKS) وهذه الدوال تعرضها بلغة الواجهة.
import { translations, tf, isEnglish } from './i18n.js';
import { getStarRank, nextStarGoal, getGoldStars } from './goldStars.js';

Object.assign(translations.ar, {
    star_rank_up: 'ترقّيتَ إلى رتبة «{rank}»!',
    star_total: 'مجموع نجومك: {n}',
    star_next: 'باقي {k} ⭐ على {goal}',
    star_next_crown: 'باقي {k} ⭐ على {goal}',
    star_top: 'وصلتَ لأعلى رتبة — ما شاء الله!',
    star_rank_line: 'رتبتك: {icon} {rank}'
});
Object.assign(translations.en, {
    star_rank_up: 'You reached the rank “{rank}”!',
    star_total: 'Your total stars: {n}',
    star_next: '{k} ⭐ to go for {goal}',
    star_next_crown: '{k} ⭐ to go for {goal}',
    star_top: 'You reached the top rank — Masha’Allah!',
    star_rank_line: 'Your rank: {icon} {rank}'
});

const lang = () => (isEnglish() ? 'en' : 'ar');
export const starRankName = (rank) => (rank ? rank[lang()] : '');
// «باقي 2 ⭐ على 🏆» + اسم الرتبة؛ '' إن لم يكن للطالب نجوم، ورسالة القمة إن لم يبقَ هدف
export function starProgressLine(student) {
    const n = getGoldStars(student);
    if (!n) return '';
    const g = nextStarGoal(n);
    if (!g) return tf('star_top');
    return tf(g.crownStep ? 'star_next_crown' : 'star_next', { k: g.left, goal: `${g.icon} ${g[lang()]}` });
}
export function starRankLine(student) {
    const r = getStarRank(getGoldStars(student));
    return r ? tf('star_rank_line', { icon: r.icon, rank: starRankName(r) }) : '';
}
