// core/goalsService.js
// =============================================================================
// 🎯 خدمة الأهداف الدائمة: تقرأ موضع حفظ الطالب (آخر نهاية/تحديث منتصف شهر في سجلات الحفظ الشهرية) وبداية نطاقه، وتقيّم أوسمة الأجزاء
// والمراحل الكبرى (engine/goalsEngine.js)، وتسجّل الجديد في student.goalLedger = { items: { id: { at, retro } } }.
// أول احتساب لطالب قديم يُسجّل ما أتمّه سابقًا بصمت (retro) ويُعرض أعلى هدف فقط، حتى لا تنهال عليه عشرات المشاهد.
// =============================================================================
import { AppState, t } from './app.js';
import { tf } from './i18n.js';
import './i18n-badges.js';
import { evaluateGoals, pathIndexOf, topGoal, MILESTONES } from '../engine/goalsEngine.js';
import { juzLabel } from '../engine/reviewParts.js';
import { weightsFromPages } from '../engine/khatmPlan.js';
import { TIER_KEYS } from '../engine/badgesEngine.js';

export const MS_ICONS = { ms_3: '🌱', ms_5: '🌿', ms_quarter: '🌙', ms_10: '⛰️', ms_half: '🌓', ms_20: '🏆', ms_khatm: '👑' };
const isEn = () => AppState.currentLang === 'en';
const nf = (n) => (isEn() ? String(n) : Number(n).toLocaleString('ar-EG', { useGrouping: false }));
export const pctText = (p) => nf(Math.round(p * 100)) + (isEn() ? '%' : '٪');

/** حالة أهداف الطالب (null إن لا موضع مسجَّل أو بيانات السور غير جاهزة). */
export async function loadGoalState(student) {
  const surahs = AppState.surahsData || [];
  if (surahs.length !== 114 || !AppState.monthlyMemorizationManager) return null;
  const recs = await AppState.monthlyMemorizationManager.getAllForStudent(student.id);
  let pos = 0;
  for (const r of recs) for (const p of [r.ending, r.mid]) if (p && p.surahNumber) pos = Math.max(pos, pathIndexOf(surahs, p.surahNumber, p.ayahNumber));
  if (!pos) return null;
  const from = surahs.find(s => s.name === student.memoFrom);
  const startIdx = from ? pathIndexOf(surahs, from.number, 1) : 1;
  let weights = null;
  try { const pages = AppState.quranEngine && await AppState.quranEngine.getAyahPages(); if (pages) weights = weightsFromPages(pages); } catch (e) { /* نكمل بالآيات */ }
  return { ...evaluateGoals({ surahsData: surahs, startIdx, posIdx: pos, weights }), posIdx: pos, startIdx };
}

export const goalName = (g) => (g.kind === 'juz' ? tf('goal_juz_name', { juz: juzLabel(g.juz, t) }) : t('goal_' + g.id + '_name'));
export const goalReason = (g) => (g.kind === 'juz' ? tf('goal_juz_reason', { juz: juzLabel(g.juz, t) }) : t('goal_' + g.id + '_reason'));
export const goalIcon = (g) => (g.kind === 'juz' ? nf(g.juz) : MS_ICONS[g.id]);

/** سطر «الهدف التالي» بعد نيل هدف (الجزء الأقرب أولًا، ثم الهدف الكبير). */
export function nextGoalHint(state, justEarned) {
  const nj = state && state.next.juz, nm = state && state.next.milestone;
  const pick = justEarned && justEarned.kind === 'milestone' ? (nm || nj) : (nj || nm);
  if (!pick) return null;
  if (pick === nj) return { pct: nj.pct, text: tf('goal_next_juz', { name: tf('goal_juz_name', { juz: juzLabel(nj.juz, t) }), pct: pctText(nj.pct) }) };
  return { pct: nm.progress, text: tf('goal_next_ms', { name: t('goal_' + nm.id + '_name'), pct: pctText(nm.progress) }) };
}

/** كائن عرض للمشهد السينمائي/البطاقة من هدف منال. */
export function goalToReveal(g, state) {
  const hint = nextGoalHint(state, g);
  const tier = TIER_KEYS.indexOf(g.tierKey);
  return { key: 'goal', id: g.id, tier, tierKey: g.tierKey, value: 0, next: null,
    custom: { name: goalName(g), reason: goalReason(g), icon: goalIcon(g), kicker: t('goal_kicker'), chip: t(g.kind === 'juz' ? 'goal_chip_juz' : 'goal_chip_ms'), nextText: hint ? hint.text : null, nextPct: hint ? hint.pct : 0 } };
}

/** يقارن بالسجل ويحفظ الجديد. يرجع {fresh: [reveal...], retro: bool}. */
export async function awardNewGoals(student) {
  try {
    const state = await loadGoalState(student);
    if (!state) return { fresh: [], retro: false };
    const first = !student.goalLedger || !student.goalLedger.items;
    if (first) student.goalLedger = { items: {} };
    const items = student.goalLedger.items;
    // ترتيب العرض على مسار الحفظ: الأجزاء من 30 نازلًا ثم المراحل الكبرى بترتيبها
    const order = (g) => (g.kind === 'juz' ? 100 - g.juz : 200 + MILESTONES.findIndex(m => m.id === g.id));
    const news = state.earned.filter(g => !(g.id in items)).sort((a, b) => order(a) - order(b));
    if (!news.length) { if (first) await AppState.studentManager.updateStudent(student); return { fresh: [], retro: false }; }
    const now = Date.now();
    news.forEach(g => { items[g.id] = first && news.length > 1 ? { at: null, retro: true } : { at: now }; });
    await AppState.studentManager.updateStudent(student);
    const shown = first && news.length > 1 ? [topGoal(news)] : news;
    return { fresh: shown.map(g => goalToReveal(g, state)), retro: first && news.length > 1 };
  } catch (e) { console.warn('[goalsService] تعذّر تقييم الأهداف:', e); return { fresh: [], retro: false }; }
}

/** أهداف نالها الطالب في شهر معيّن (من السجل): للتقرير الشهري. */
export function goalsEarnedInMonth(student, y, m) {
  const items = (student.goalLedger && student.goalLedger.items) || {};
  const a = new Date(y, m, 1).getTime(), b = new Date(y, m + 1, 1).getTime();
  return Object.entries(items).filter(([, v]) => v && typeof v.at === 'number' && v.at >= a && v.at < b).map(([id]) => id);
}
export { MILESTONES };
