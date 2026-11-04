// reports/monthly-extras.js
// =============================================================================
// أقسام التقرير الشهري الجديدة (تُحقن في صفحة التقرير القائمة دون المساس ببقية منطقها):
//   أوسمة الشهر + مفتاح الأوسمة · الحضور والساعات · التجويد (نظري/عملي) · الطريق إلى الختم · خطة الشهر القادم (مبدئية)
//   · مؤشر اكتمال البيانات (للمعلم فقط: لا يدخل التصدير).
// الألوان قيم ثابتة (لا var()) لأن html2canvas يلتقط الصفحة للتصدير — نفس قاعدة monthly-report.identity.js.
// كل نص عبر t()/tf() من i18n-badges.js (عربي/English). لا تمسّ أي نص قرآني ولا خطًا قرآنيًا هنا.
// =============================================================================
import { AppState, t, surahNameLocal } from '../core/app.js';
import { tf } from '../core/i18n.js';
import { esc } from '../core/escape.js';
import '../core/i18n-badges.js';
import { loadStudentContext, inputsForMonth, evidenceTimestamps } from '../core/badgeService.js';
import { computeMonthBadges, summarizeEarned, closestToNext, BADGE_DEFS } from '../engine/badgesEngine.js';
import { summarizeMonth, evidenceDays, hasSchedule } from '../engine/attendanceEngine.js';
import { ensureJourney } from '../engine/tajweedJourney.js';
import { paceFrom, projectMilestones, buildPathMap, weightsFromPages, unitsBetween, buildNextMonthPlan, sessionsToFinish } from '../engine/khatmPlan.js';
import { ayahIndex, juzBounds, juzLabel, JUZ_COUNT, summarizeReview } from '../engine/reviewParts.js';
import { getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import { SKILLS } from '../engine/skillMap.js';
import { skillLabel } from '../components/skillProfile.js';
import { loadGoalState, goalsEarnedInMonth, goalName, goalIcon, nextGoalHint } from '../core/goalsService.js';
import { juzTierKey } from '../engine/goalsEngine.js';

const TIER_COLORS = { bronze: ['#e7b58a', '#b87333'], silver: ['#f4f7fb', '#9aa6b6'], gold: ['#fff0b3', '#d4a017'], diamond: ['#e0f7ff', '#4fb3e8'] };
const isEn = () => AppState.currentLang === 'en';
const num = (n) => (isEn() ? String(n) : Number(n).toLocaleString('ar-EG', { useGrouping: false }));
const firstName = (s) => String(s || '').trim().split(/\s+/)[0] || '';
const fmtDate = (d) => d.toLocaleDateString(isEn() ? 'en-GB' : 'ar-EG', { month: 'long', year: 'numeric' });
const tierName = (k) => t('bdg_tier_n_' + k);

export const EXTRAS_STYLES = `
  #report-screen .mrx{margin:18px 0; padding:16px 18px; border-radius:16px; background:#fffdf6; border:1.5px solid #e6dcbc; page-break-inside:avoid;}
  #report-screen .mrx .section-sub{margin-bottom:10px;}
  #report-screen .mrx-grid{display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:8px 12px;}
  #report-screen .mrx-medal{display:flex; gap:10px; align-items:flex-start; padding:8px 10px; border-radius:12px; background:#ffffff; border:1.5px solid #eadfbd; page-break-inside:avoid; break-inside:avoid;}
  #report-screen .mrx-medal .disc{width:42px; height:42px; flex:none; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:21px; border:2px solid rgba(255,255,255,.7);}
  #report-screen .mrx-medal .tx{min-width:0; flex:1;}
  #report-screen .mrx-medal b{font-size:13.5px; color:#164f40;}
  #report-screen .mrx-medal small{display:block; font-size:11.5px; color:#6b6b63; line-height:1.5;}
  #report-screen .mrx-medal small.why{font-size:11px; margin-top:2px;}
  #report-screen .mrx-chip{display:inline-block; margin-inline-start:6px; padding:0 8px; border-radius:999px; font-size:11.5px; font-weight:700; color:#1a1300;}
  #report-screen .mrx-total{font-size:15px; font-weight:800; color:#164f40; margin-bottom:8px;}
  #report-screen .mrx-closest{margin-top:10px; font-size:13px; color:#8a6221;}
  #report-screen .mrx-group{font-size:12.5px; font-weight:800; color:#8a6221; margin:10px 0 2px;}
  #report-screen .mrx-kv{display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin:6px 0;}
  #report-screen .mrx-kv div{background:#fff; border:1px solid #eadfbd; border-radius:12px; padding:8px 10px; text-align:center;}
  #report-screen .mrx-kv b{display:block; font-size:20px; color:#164f40;}
  #report-screen .mrx-kv span{font-size:11.5px; color:#6b6b63;}
  #report-screen .mrx-note{font-size:12px; color:#6b6b63; margin-top:6px; line-height:1.7;}
  #report-screen .mrx-row{display:flex; justify-content:space-between; gap:10px; padding:7px 0; border-top:1px dashed #e6dcbc; font-size:13px;}
  #report-screen .mrx-row b{color:#164f40;}
  #report-screen .mrx-plan-warn{background:#fff6dc; border:1px solid #ecd58a; color:#6f5410; border-radius:12px; padding:9px 12px; font-size:12.5px; line-height:1.8; margin-bottom:8px;}
  /* خطة الشهر القادم — نفس هوية «رحلة الحفظ» الزمردية (ألوان ثابتة لأجل html2canvas، بلا inset/var/letter-spacing) */
  #report-screen .mrx-pl-head{display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap;}
  #report-screen .mrx-pl-tag{font-size:11px; font-weight:800; color:#8a6a12; border:1.5px dashed #c9a643; background:#fbf4dc; border-radius:99px; padding:3px 12px;}
  #report-screen .mrx-pl-disc{font-size:12.5px; color:#4a6058; line-height:1.8; margin:6px 0 12px;}
  #report-screen .mrx-pl-box{background:#0b3d30; border:1px solid #d4af37; border-radius:16px; padding:18px 18px 16px; color:#f6f3e8; display:flex; flex-direction:column; gap:16px;}
  #report-screen .mrx-pl-sum{display:grid; grid-template-columns:repeat(3,1fr); gap:10px;}
  #report-screen .mrx-pl-s{background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:10px 12px; display:flex; align-items:center; gap:10px;}
  #report-screen .mrx-pl-s .ic{flex:none; width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(240,216,120,.13); font-size:17px;}
  #report-screen .mrx-pl-s b{display:block; font-family:'Amiri',serif; font-size:23px; line-height:1.1; color:#f0d878;}
  #report-screen .mrx-pl-s span{display:block; font-size:11px; color:#d7e4dd; margin-top:2px; line-height:1.45;}
  #report-screen .mrx-pl-wh{display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; font-size:12.5px; font-weight:700; color:#d7e4dd;}
  #report-screen .mrx-pl-wh small{font-size:11px; font-weight:500; color:#9fb8ad;}
  #report-screen .mrx-pl-track{display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-top:-4px;}
  #report-screen .mrx-pl-w{position:relative; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:13px; padding:10px 10px 9px; display:flex; flex-direction:column; gap:7px; min-width:0;}
  #report-screen .mrx-pl-w .n{display:flex; align-items:center; justify-content:center; width:22px; height:22px; margin:0 auto; border-radius:50%; font-family:'Amiri',serif; font-weight:700; font-size:12px; background:#072a21; border:2px solid #d4af37; color:#f0d878;}
  #report-screen .mrx-pl-w.first .n{background:#f0d878; color:#0b3d30;}
  #report-screen .mrx-pl-w h5{margin:0; font-size:12px; font-weight:800; color:#f0d878; text-align:center;}
  #report-screen .mrx-pl-it{display:flex; flex-direction:column; gap:1px; border-top:1px dashed rgba(240,216,120,.22); padding-top:6px;}
  #report-screen .mrx-pl-it small{font-size:10.5px; font-weight:700; color:#9fb8ad; display:flex; align-items:center; gap:5px;}
  #report-screen .mrx-pl-it small i{width:8px; height:8px; border-radius:50%; flex:none; display:inline-block;}
  #report-screen .mrx-pl-it span{font-size:11.5px; color:#f6f3e8; line-height:1.55;}
  #report-screen .mrx-pl-it span b{font-family:'Amiri',serif; font-size:14px; color:#f0d878;}
  #report-screen .mrx-pl-it span em{font-style:normal; color:#9fb8ad;}
  #report-screen .mrx-pl-it.opt span{color:#9fb8ad;}
  #report-screen .mrx-pl .d-new{background:#f0d878;}
  #report-screen .mrx-pl .d-near{background:#9ee0bf;}
  #report-screen .mrx-pl .d-far{background:#8fb7e8;}
  #report-screen .mrx-pl-side{display:flex; gap:10px; flex-wrap:wrap;}
  #report-screen .mrx-pl-tg{flex:1; min-width:200px; display:flex; align-items:center; gap:10px; background:rgba(212,175,55,.14); border:1px solid rgba(212,175,55,.5); border-radius:14px; padding:9px 12px;}
  #report-screen .mrx-pl-tg .ic{font-size:19px;}
  #report-screen .mrx-pl-tg small{display:block; font-size:10.5px; color:#d7e4dd; font-weight:600;}
  #report-screen .mrx-pl-tg b{font-family:'Amiri',serif; font-size:16px; color:#f0d878;}
  #report-screen .mrx-pl-foot{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
  #report-screen .mrx-pl-f{background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:10px 12px;}
  #report-screen .mrx-pl-f h4{margin:0 0 5px; font-size:12px; font-weight:700; color:#d7e4dd;}
  #report-screen .mrx-pl-f ul{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:4px;}
  #report-screen .mrx-pl-f li{font-size:11.5px; color:#c9d8d0; line-height:1.6; display:flex; gap:6px;}
  #report-screen .mrx-pl-f li::before{content:"✓"; color:#f0d878; font-weight:800;}
  #report-screen .mrx-pl-f.chg li::before{content:"↻"; color:#e9b97a;}
  #report-screen .mrx-teacher{background:#eef6ff; border:1.5px dashed #8ab4e8; color:#1f4c85;}
  #report-screen .mrx-teacher button{margin-top:8px; border:0; border-radius:10px; padding:7px 14px; font-weight:700; background:#1f4c85; color:#fff; cursor:pointer;}
`;

// ---------- جمع البيانات ----------
async function weakestSkill(d) {
  const sum = d.skillSummary;
  if (!sum || !sum.stats) return null;
  const rows = SKILLS.map(sk => ({ sk, st: sum.stats[sk] })).filter(x => x.st && x.st.count > 0 && x.st.acc !== null).sort((a, b) => a.st.acc - b.st.acc);
  return rows.length && rows[0].st.acc < 0.85 ? skillLabel(rows[0].sk) : null;
}

function currentPositionIdx(surahsData, rec) {
  const e = rec && rec.ending;
  if (!e) return null;
  let sum = 0;
  for (const s of surahsData) if (s.number > e.surahNumber) sum += s.ayahsCount;
  return sum + e.ayahNumber;
}
const beginIdx = (surahsData, rec) => {
  const b = rec && rec.beginning; if (!b) return null;
  let sum = 0; for (const s of surahsData) if (s.number > b.surahNumber) sum += s.ayahsCount;
  return sum + b.ayahNumber;
};

async function buildKhatm(d, ctx, att, asOf = new Date()) {
  const surahs = ctx.surahsData;
  if (!surahs || surahs.length !== 114) return null;
  const recs = ctx.records.filter(r => r.ending && r.beginning).sort((a, b) => (a.year * 12 + a.month) - (b.year * 12 + b.month));
  if (!recs.length) return null;
  let weights = null, pathMap = null;
  try {
    const pages = AppState.quranEngine && await AppState.quranEngine.getAyahPages();
    if (pages) { weights = weightsFromPages(pages); pathMap = buildPathMap(surahs); }
  } catch (e) { /* نكمل بالآيات */ }
  const pageMode = !!(weights && pathMap);
  const unit = (lo, hi) => unitsBetween(lo, hi, weights, pathMap);
  // بدون أرقام الصفحات نقرّب الآية بـ604/6236 صفحة حتى تبقى الوحدة «صفحات تقريبية»
  const scale = pageMode ? 1 : 604 / 6236;
  const posIdx = currentPositionIdx(surahs, recs[recs.length - 1]);
  const doneUnits = unit(0, posIdx) * scale;
  // صفحات أعلى N جزء بترتيب المسار (الجزء 30 فما دون): حجم لا موضع (حدود الأجزاء تقطع السور)
  const juzPages = [];
  for (let j = JUZ_COUNT; j >= 1; j--) {
    const b = juzBounds(surahs, j); if (!b) return null;
    const lo = ayahIndex(surahs, b.start.surah, b.start.ayah) - 1, hi = ayahIndex(surahs, b.end.surah, b.end.ayah);
    let p = 0;
    for (let i = lo; i < hi; i++) p += weights ? weights[i] : (604 / 6236);
    juzPages.push(p);
  }
  const cum = (n) => { let s = 0; for (let i = 0; i < Math.floor(n); i++) s += juzPages[i]; if (n % 1) s += juzPages[Math.floor(n)] * (n % 1); return s; };
  let curJuz = 1; while (curJuz < JUZ_COUNT && cum(curJuz) <= doneUnits) curJuz++;
  const remaining = { juz: Math.max(cum(curJuz) - doneUnits, 0), five: cum(5) - doneUnits, quarter: cum(7.5) - doneUnits, half: cum(15) - doneUnits, khatm: cum(30) - doneUnits };
  // الوتيرة: آخر 3 أشهر مقفلة ببيانات. لا تخمين: يُحسب الشهر فقط إذا وُجد جدول وتأكدت كل حصصه (حضر/غاب/لم تُعقد)؛
  // وإلا يُستبعد (لا نقسم الحفظ على حصص لم نتأكد منها ولا على عدد افتراضي)
  const evAll = evidenceDays(evidenceTimestamps(ctx));
  let excludedMonths = 0;
  const months = [];
  for (const r of recs.filter(r => r.locked || r.ending)) {
    const lo = beginIdx(surahs, r), hi = currentPositionIdx(surahs, r);
    if (!(hi > lo)) continue;
    const sm = hasSchedule(ctx.student) ? summarizeMonth(ctx.student, r.year, r.month - 1, evAll) : null;
    if (!sm || !sm.complete || !(sm.present > 0)) { excludedMonths++; continue; }
    months.push({ newUnits: unit(lo, hi) * scale, sessions: sm.present });
  }
  const sessionsPerMonth = hasSchedule(ctx.student) ? Math.max(ctx.student.schedule.days.length * 4, 1) : null;
  if (!sessionsPerMonth) return { pace: { perSession: 0, perMonth: 0, basis: 'none', monthsUsed: 0 }, proj: [], remaining, curJuz, sessionsPerMonth: null, sessionsToFinishJuz: null, monthsUsed: 0, excludedMonths, posIdx, weights, pathMap, pageMode };
  const pace = paceFrom(months, sessionsPerMonth);
  const proj = projectMilestones({ pace, remaining, sessionsPerMonth, attendancePct: att && att.pct != null ? att.pct : null, now: asOf });
  return { pace, proj, remaining, curJuz, sessionsPerMonth, sessionsToFinishJuz: sessionsToFinish(remaining.juz, pace), monthsUsed: pace.monthsUsed, excludedMonths, posIdx, weights, pathMap, pageMode };
}

function tajweedMonth(d, ctx) {
  const y = d.year, m = d.monthIndex0;
  if (!ctx.mastery.length) return null;
  const a = new Date(y, m, 1).getTime(), b = new Date(y, m + 1, 1).getTime();
  const within = (iso) => { const ts = iso ? Date.parse(iso) : NaN; return Number.isFinite(ts) && ts >= a && ts < b; };
  const c = { learned: 0, practiced: 0, exam: 0, examFirst: 0, approved: 0 };
  ctx.mastery.forEach(rec => {
    const j = ensureJourney(rec);
    if (within(j.learnedAt)) c.learned++;
    if (within(j.practicePassedAt)) c.practiced++;
    if (within(j.examPassedAt)) c.exam++;
    const first = (j.examAttempts || [])[0];
    if (first && first.passed && within(first.at)) c.examFirst++;
    if (within(j.teacherApprovedAt)) c.approved++;
  });
  return (c.learned + c.practiced + c.exam + c.approved) ? c : { ...c, none: true };
}

function nextTajweedRuleKey(ctx) {
  const done = new Set(ctx.mastery.filter(r => ensureJourney(r).teacherApprovedAt).map(r => r.ruleId));
  const hit = getAllRulesFlat().find(x => !done.has(x.rule.id));
  return hit ? hit.rule.nameKey : null;
}

// ---------- خطة الشهر القادم: نطاقات أسبوعية تقريبية (مسار المنصة: الناس ← الفاتحة، والآيات تصاعديًا داخل السورة) ----------
const PATH_TOTAL = 6236;
/** فهرس الحفظ (1 = أول آية في الناس) لموضع {s,a} — نفس صيغة currentPositionIdx. */
function pathIdxOf(surahsData, s, a) {
  let sum = 0; for (const x of surahsData) if (x.number > s) sum += x.ayahsCount;
  return sum + a;
}
/** عكس pathIdxOf: فهرس الحفظ ← {s,a}. */
function pathRef(surahsData, k) {
  const sorted = [...surahsData].sort((x, y) => y.number - x.number);
  let acc = 0;
  for (const x of sorted) { if (k <= acc + x.ayahsCount) return { s: x.number, a: k - acc }; acc += x.ayahsCount; }
  return null;
}
/** الحفظ الجديد للأسابيع الأربعة: من الآية التالية لموضع الطالب، بمقدار ربع الوحدات المتوقعة لكل أسبوع (أهداف تراكمية فلا يتراكم التقريب). */
/* مُصدَّرة للاختبار */ export function weeklyNewRanges(surahsData, khatm, newUnits) {
  if (!khatm || !(newUnits > 0) || !(khatm.posIdx >= 0)) return null;
  const w = (k) => (khatm.pageMode ? (khatm.weights[khatm.pathMap[k - 1]] || 0) : 604 / 6236);
  const out = [];
  let k = khatm.posIdx + 1, cum = 0;
  for (let wk = 1; wk <= 4; wk++) {
    if (k > PATH_TOTAL) { out.push(null); continue; }
    const start = k, target = newUnits * wk / 4;
    while (k <= PATH_TOTAL && (cum < target || k === start)) { cum += w(k); k++; }
    out.push({ from: pathRef(surahsData, start), to: pathRef(surahsData, k - 1) });
  }
  return out;
}
/** المراجعة القريبة: محفوظ هذا الشهر (بين موضعي البداية والنهاية) مقسومًا أربعة أرباع متتالية. */
export function weeklyNearRanges(surahsData, journey) {
  if (!journey || !journey.hasEnding || !journey.beginPos || !journey.endPos) return null;
  const b = pathIdxOf(surahsData, journey.beginPos.s, journey.beginPos.a), e = pathIdxOf(surahsData, journey.endPos.s, journey.endPos.a);
  const lo = Math.min(b, e), hi = Math.max(b, e), n = hi - lo + 1;
  if (!(n > 1)) return null;
  return [0, 1, 2, 3].map(i => {
    const a = lo + Math.round(n * i / 4), z = lo + Math.round(n * (i + 1) / 4) - 1;
    return z >= a ? { from: pathRef(surahsData, a), to: pathRef(surahsData, z) } : null;
  });
}

export async function collectExtras(d) {
  const student = d.student, y = d.year, m = d.monthIndex0;
  let ctx = await loadStudentContext(student);
  const now = new Date();
  const isCurrent = now.getFullYear() === y && now.getMonth() === m;
  // عزل الشهور: في شهر سابق نقصّ السياق عند نهاية ذلك الشهر فلا تدخل سجلات/إتقان أشهر لاحقة في الختم والمراجعة والتجويد،
  // ونحسب التوقعات من آخر يوم في الشهر لا من تاريخ اليوم.
  const asOf = isCurrent ? now : new Date(y, m + 1, 0, 12);
  if (!isCurrent) {
    const cut = y * 12 + m;
    const endTs = new Date(y, m + 1, 1).getTime();
    ctx = {
      ...ctx,
      records: (ctx.records || []).filter(r => r.year * 12 + (r.month - 1) <= cut),
      mastery: (ctx.mastery || []).filter(rec => { const a = ensureJourney(rec).teacherApprovedAt; return !a || Date.parse(a) < endTs; })
    };
  }
  const input = inputsForMonth(ctx, y, m, now);
  const results = computeMonthBadges(input);
  const summary = summarizeEarned(results);
  const ev = evidenceDays(evidenceTimestamps(ctx));
  const att = summarizeMonth(student, y, m, ev, isCurrent ? now : null);
  const khatm = await buildKhatm(d, ctx, att, asOf);
  const tj = tajweedMonth(d, ctx);
  const weak = await weakestSkill(d);
  const nextRule = nextTajweedRuleKey(ctx);
  // خطة الشهر القادم
  const rev = d.reviewSummary;
  // المراجعة البعيدة: أجزاء المحفوظ الأقدم مراجعةً (التي لم تُراجَع قط أولًا) — من سجلات المراجعة الشهرية
  const farParts = [];
  if (khatm) {
    const last = {};
    ctx.records.forEach(r => { if (r.review) { const stamp = r.year * 12 + r.month; (summarizeReview(r.review, ctx.surahsData)?.entries || []).forEach(e => { last[e.juz] = Math.max(last[e.juz] || -1, stamp); }); } });
    const memorized = []; for (let j = 30; j >= Math.max(31 - khatm.curJuz, 1); j--) memorized.push(j);
    memorized.sort((a, b) => (last[a] ?? -1) - (last[b] ?? -1) || b - a).slice(0, 4).forEach(j => farParts.push(j));
  }
  const sessionsNext = khatm ? khatm.sessionsPerMonth : (hasSchedule(student) ? Math.max(student.schedule.days.length * 4, 1) : null);
  const plan = buildNextMonthPlan({
    pace: khatm ? khatm.pace : null,
    sessionsNext,
    thisMonthNewAyahs: d.journey && d.journey.hasEnding ? d.journey.newAyahs : null,
    nearReviewRange: d.journey && d.journey.hasEnding ? true : null,
    farReviewParts: farParts,
    nextTajweedRule: nextRule, focusSkill: weak
  });
  plan.scheduleKnown = sessionsNext != null;
  plan.pacePerSession = khatm && khatm.pace && khatm.pace.perSession > 0 ? khatm.pace.perSession : null;
  try {
    plan.weeksNew = weeklyNewRanges(ctx.surahsData, khatm, plan.newUnits);
    plan.weeksNear = weeklyNearRanges(ctx.surahsData, d.journey);
  } catch (e) { plan.weeksNew = plan.weeksNear = null; }
  // اكتمال البيانات (للمعلم)
  const issues = [];
  if (!hasSchedule(student)) issues.push({ k: 'cmp_no_schedule' });
  else if (att.unconfirmed > 0) issues.push({ k: 'cmp_unconfirmed', n: att.unconfirmed, att: true });
  if (att.hoursMissing > 0) issues.push({ k: 'cmp_hours_missing' });
  if (!(d.journey && d.journey.hasEnding)) issues.push({ k: 'cmp_no_ending' });
  if (!d.gameEvalEntries || !d.gameEvalEntries.length) issues.push({ k: 'cmp_no_games' });
  // أهداف الحفظ الدائمة (أوسمة الأجزاء والمراحل)
  let goals = null;
  try {
    const gs = await loadGoalState(student);
    // شهر سابق: نعرض فقط ما نِيل في ذلك الشهر؛ عدد الأجزاء الكلي و«الهدف التالي» حالة اليوم فلا تظهر
    if (gs) goals = { state: gs, current: isCurrent, newEarned: gs.earned.filter(e => goalsEarnedInMonth(student, y, m).includes(e.id)), hint: isCurrent ? nextGoalHint(gs) : null };
  } catch (e) { /* اختياري */ }
  return { results, summary, closest: closestToNext(results), att, khatm, tj, plan, issues, hasReview: !!rev, goals };
}

// ---------- العرض ----------
// وسام مكتسب: اسمه ودرجته + سطر صغير «لماذا حصل عليه» بالعدد الفعلي (مذكّر/مؤنث، والمعدود مطابَق للعدد)
const isFemaleStudent = (st) => !!st && (st.gender === 'girl' || st.gender === 'female' || ['👧🏻', '👩🏻', '🧕🏻'].includes(st.avatar));
function countPhrase(noun, n) {
  const f = String(t('bdg_cnt_' + noun) || '').split('|');
  if (isEn()) return `${num(n)} ${n === 1 ? f[0] : (f[1] || f[0])}`;
  if (n === 1) return f[4];
  if (n === 2) return f[1];
  if (n >= 3 && n <= 10) return `${num(n)} ${f[2]}`;
  return `${num(n)} ${f[3]}`;
}
const whyOf = (r, female) => {
  const n = Math.round(r.value);
  const noun = t('bdg_' + r.key + '_why_noun');
  return tf('bdg_' + r.key + (female ? '_why_f' : '_why'), { n: num(n), c: noun ? countPhrase(noun, n) : num(n) });
};
const medalHtml = (r, female) => {
  const [c1, c2] = TIER_COLORS[r.tierKey];
  return `<div class="mrx-medal"><div class="disc" style="background:linear-gradient(135deg,${c1},${c2});">${r.icon}</div>
    <div class="tx"><b>${esc(t('bdg_' + r.key + '_name'))}</b><span class="mrx-chip" style="background:linear-gradient(135deg,${c1},${c2});">${esc(tierName(r.tierKey))}</span>
    <small class="why">${esc(whyOf(r, female))}</small></div></div>`;
};

function badgesSection(d, x) {
  const name = firstName(d.name);
  const head = `<div class="section-title">${esc(t('bdg_rep_title'))}</div><div class="section-sub">${esc(tf('bdg_rep_sub', { name }))}</div>`;
  let body;
  if (!x.summary.total) {
    body = `<div class="mrx-note">${esc(t('bdg_rep_none'))}</div>`;
  } else {
    const order = { diamond: 0, gold: 1, silver: 2, bronze: 3 };
    const sorted = [...x.summary.earned].sort((a, b) => order[a.tierKey] - order[b.tierKey]);
    body = `<div class="mrx-total">${esc(tf('bdg_rep_total', { n: num(x.summary.total) }))}</div><div class="mrx-grid">${sorted.map(r => medalHtml(r, isFemaleStudent(d.student))).join('')}</div>`;
  }
  const c = x.closest;
  const closest = c ? `<div class="mrx-closest">${esc(tf('bdg_rep_closest', { badge: t('bdg_' + c.key + '_name'), k: num(Math.ceil(c.next.remaining)) }))}</div>` : '';
  return `<div class="mrx pdf-block" id="mr-badges-block">${head}${body}${closest}</div>`;
}

function goalsSection(d, x) {
  const g = x.goals;
  if (!g) return '';
  const tierOf = (e) => e.tierKey || (e.kind === 'juz' ? juzTierKey(e.juz) : 'gold');
  const chip = (e) => { const [c1, c2] = TIER_COLORS[tierOf(e)]; return `<span class="mrx-chip" style="background:linear-gradient(135deg,${c1},${c2});margin:3px;font-size:12.5px;padding:3px 12px;">${esc(goalIcon(e))} ${esc(goalName(e))}</span>`; };

  const news = g.newEarned.length ? `<div class="mrx-group">${esc(t('goal_rep_new'))}</div><div>${g.newEarned.map(chip).join('')}</div>` : `<div class="mrx-note">${esc(t('goal_rep_none'))}</div>`;
  const next = g.hint ? `<div class="mrx-closest">${esc(g.hint.text)}</div><div style="height:9px;border-radius:999px;background:#eadfbd;overflow:hidden;margin-top:6px;"><i style="display:block;height:100%;width:${Math.max(4, Math.round(g.hint.pct * 100))}%;background:linear-gradient(90deg,#d4a017,#f6d57a);"></i></div>` : '';
  return `<div class="mrx pdf-block" id="mr-goals-block"><div class="section-title">${esc(t('goal_rep_title'))}</div>${g.current === false ? '' : `<div class="section-sub">${esc(tf('goal_juz_count', { n: num(g.state.fullJuz) }))}</div>`}${news}${next}<div class="mrx-note">${esc(t('goal_rep_basis'))}</div></div>`;
}

function attendanceSection(d, x) {
  const a = x.att;
  const head = `<div class="section-title">${esc(t('att_rep_title'))}</div><div class="section-sub">${esc(t('att_rep_sub'))}</div>`;
  if (!a.hasSchedule && !a.extra) return `<div class="mrx pdf-block" id="mr-att-block">${head}<div class="mrx-note">${esc(t('att_rep_no_schedule'))}</div></div>`;
  const kv = (n, label) => `<div><b>${num(n)}</b><span>${esc(label)}</span></div>`;
  const cells = [kv(a.expected, t('att_rep_expected')), kv(a.present, t('att_rep_present'))];
  if (a.absent) cells.push(kv(a.absent, t('att_rep_absent')));
  if (a.cancelled) cells.push(kv(a.cancelled, t('att_rep_cancelled')));
  if (a.extra) cells.push(kv(a.extra, t('att_rep_extra')));
  // لا تخمين: ما دام في الشهر حصة غير مؤكَّدة لا تُعرض الساعات ولا النسبة، ويُذكر النقص صراحةً
  // (والتصدير نفسه محجوب حتى يستكمل المعلم البيانات — انظر ensureReportDataComplete في monthly-report.js)
  if (a.unconfirmed > 0) {
    cells.push(kv(a.unconfirmed, t('att_rep_unconfirmed')));
    return `<div class="mrx pdf-block" id="mr-att-block">${head}<div class="mrx-kv">${cells.join('')}</div>
    <div class="mrx-plan-warn" style="margin:8px 0 0;">${esc(tf('att_rep_incomplete', { n: num(a.unconfirmed) }))}</div></div>`;
  }
  const warns = [];
  if (a.hoursMissing > 0) warns.push(esc(t('att_rep_hours_incomplete')));
  else cells.push(`<div><b>${num(a.hours)}</b><span>${esc(t('att_rep_hours'))}</span></div>`);
  if (a.pct != null) cells.push(`<div><b>${num(a.pct)}٪</b><span>${esc(t('att_rep_pct'))}</span></div>`.replace('٪', isEn() ? '%' : '٪'));
  return `<div class="mrx pdf-block" id="mr-att-block">${head}<div class="mrx-kv">${cells.join('')}</div>
    ${warns.length ? `<div class="mrx-plan-warn" style="margin:8px 0 0;">${warns.join('<br>')}</div>` : `<div class="mrx-note">${esc(tf('att_rep_session_len', { n: num(a.minutes) }))} · ${esc(t('att_rep_note_hours'))}</div>`}</div>`;
}

function tajweedSection(d, x) {
  const c = x.tj;
  const head = `<div class="section-title">${esc(t('tjr_title'))}</div><div class="section-sub">${esc(t('tjr_sub'))}</div>`;
  if (!c || c.none) return `<div class="mrx pdf-block" id="mr-tjr-block">${head}<div class="mrx-note">${esc(t('tjr_none'))}</div></div>`;
  const row = (label, n, extra = '') => `<div class="mrx-row"><span>${esc(label)}${extra}</span><b>${num(n)}</b></div>`;
  return `<div class="mrx pdf-block" id="mr-tjr-block">${head}
    <div class="mrx-group">${esc(t('tjr_theory'))}</div>
    ${row(t('tjr_learned'), c.learned)}${row(t('tjr_practiced'), c.practiced)}${row(t('tjr_exam'), c.exam, c.examFirst ? ` (${esc(t('tjr_exam_first'))}: ${num(c.examFirst)})` : '')}
    <div class="mrx-group">${esc(t('tjr_practice'))}</div>
    ${row(t('tjr_approved'), c.approved)}</div>`;
}

// «خطة الشهر القادم» — توقعات لا التزام: ملخص بثلاثة أرقام، ثم خريطة الأسابيع الأربعة (حفظ جديد/مراجعة قريبة/بعيدة بنطاقات
// تقريبية)، ثم التجويد ومحور التركيز، ثم «على ماذا بُنيت» و«قد تتغيّر إذا…». كل الأرقام من بيانات حقيقية؛ ما لا يُحسب يُترك للمعلم.
const half = (x) => Math.max(Math.round(x * 2) / 2, 0.5);
function refRange(r) {
  if (!r || !r.from || !r.to) return '';
  const sn = (n) => surahNameLocal(n);
  if (r.from.s === r.to.s) return r.from.a === r.to.a ? `${sn(r.from.s)} ${num(r.from.a)}` : `${sn(r.from.s)} ${num(r.from.a)}–${num(r.to.a)}`;
  return `${sn(r.from.s)} ${num(r.from.a)} – ${sn(r.to.s)} ${num(r.to.a)}`;
}
function planSection(d, x) {
  const p = x.plan;
  const name = firstName(d.name);
  const hasNew = p.newUnits != null && p.newUnits > 0;
  const tile = (ic, val, label) => `<div class="mrx-pl-s"><div class="ic">${ic}</div><div><b>${val}</b><span>${esc(label)}</span></div></div>`;
  const tiles = tile('📖', hasNew ? '≈ ' + num(half(p.newUnits)) : '—', hasNew ? tf('pln_s_new', { s: num(p.sessions) }) : t('pln_new_none'))
    + tile('🔁', p.thisMonthNewAyahs != null ? num(p.thisMonthNewAyahs) : '—', t('pln_s_near'))
    + tile('📚', p.farReviewParts.length ? num(Math.min(p.farReviewParts.length, 4)) : '—', t('pln_s_far'));
  const item = (cls, label, html, opt) => `<div class="mrx-pl-it${opt ? ' opt' : ''}"><small><i class="${cls}"></i>${esc(label)}</small><span>${html}</span></div>`;
  const weeks = [0, 1, 2, 3].map(i => {
    const nw = p.weeksNew && p.weeksNew[i];
    const newHtml = hasNew
      ? (nw ? `<b>≈ ${num(half(p.newUnits / 4))}</b> ${esc(t('pln_w_pages'))} · ${esc(refRange(nw))}` : esc(t('pln_w_done')))
      : esc(t('pln_w_teacher'));
    const nr = p.weeksNear && p.weeksNear[i];
    const nearHtml = nr ? esc(refRange(nr)) + (i === 3 ? ` <em>${esc(t('pln_w_near_all'))}</em>` : '') : esc(t('pln_w_near_q' + (i + 1)));
    const fj = p.farReviewParts[i];
    const farHtml = fj != null ? esc(juzLabel(fj, t)) : esc(t('pln_w_far_any'));
    return `<div class="mrx-pl-w${i === 0 ? ' first' : ''}"><span class="n">${num(i + 1)}</span><h5>${esc(tf('pln_week', { n: num(i + 1) }))}</h5>
      ${item('d-new', t('pln_new'), newHtml, !hasNew)}${item('d-near', t('pln_near'), nearHtml)}${item('d-far', t('pln_far'), farHtml, fj == null)}</div>`;
  }).join('');
  const tj = `<div class="mrx-pl-tg"><span class="ic">🎙️</span><div><small>${esc(t('pln_tj_k'))}</small><b>${esc(p.nextTajweedRule ? t(p.nextTajweedRule) : t('pln_tajweed_none'))}</b></div></div>`;
  const fc = p.focusSkill ? `<div class="mrx-pl-tg"><span class="ic">💡</span><div><small>${esc(t('pln_fc_k'))}</small><b>${esc(p.focusSkill)}</b></div></div>` : '';
  const basis = [
    p.pacePerSession ? tf('pln_b_pace', { name, p: num(Math.round(p.pacePerSession * 10) / 10) }) : t('pln_b_nopace'),
    p.scheduleKnown ? tf('pln_b_sched', { s: num(p.sessions) }) : t('pln_b_nosched'),
    t('pln_b_review')
  ];
  const li = (arr) => arr.map(v => `<li>${esc(v)}</li>`).join('');
  return `<div class="mrx mrx-pl pdf-block" id="mr-plan2-block">
    <div class="mrx-pl-head"><div class="section-title">${esc(t('pln_title'))}</div><span class="mrx-pl-tag">${esc(t('pln_tag'))}</span></div>
    <div class="mrx-pl-disc">${esc(t('pln_disclaimer'))}</div>
    <div class="mrx-pl-box">
      <div class="mrx-pl-sum">${tiles}</div>
      <div class="mrx-pl-wh"><span>${esc(t('pln_weeks_title'))}</span><small>${esc(t('pln_weeks_sub'))}</small></div>
      <div class="mrx-pl-track">${weeks}</div>
      <div class="mrx-pl-side">${tj}${fc}</div>
      <div class="mrx-pl-foot">
        <div class="mrx-pl-f"><h4>${esc(t('pln_b_title'))}</h4><ul>${li(basis)}</ul></div>
        <div class="mrx-pl-f chg"><h4>${esc(t('pln_c_title'))}</h4><ul>${li([t('pln_c1'), t('pln_c2'), t('pln_c3')])}</ul></div>
      </div>
    </div>
  </div>`;
}

function completenessSection(x) {
  const body = x.issues.length
    ? `<div>${esc(t('cmp_missing'))}</div><ul style="margin:6px 0 0; padding-inline-start:18px;">${x.issues.map(i => `<li>${esc(i.n != null ? tf(i.k, { n: num(i.n) }) : t(i.k))}</li>`).join('')}</ul>${x.issues.some(i => i.att) ? `<button type="button" id="mrx-open-att">${esc(t('cmp_open_att'))}</button>` : ''}`
    : `<div>${esc(t('cmp_ok'))}</div>`;
  return `<div class="mrx mrx-teacher" id="mr-complete-block" data-export-skip="1"><div class="section-title" style="color:#1f4c85;">${esc(t('cmp_title'))}</div>${body}</div>`;
}

/** يحقن الأقسام في الصفحة قبل «خطة الشهر القادم» القديمة (التي تُخفى لتحلّ محلها الخطة المحسوبة). */
export function renderExtras(d) {
  const x = d.extras;
  const host = document.getElementById('mr-plan-block');
  if (!host) return;
  if (!x) { host.style.display = ''; return; }
  if (!document.getElementById('mrx-style')) {
    const st = document.createElement('style'); st.id = 'mrx-style'; st.textContent = EXTRAS_STYLES; document.head.appendChild(st);
  }
  document.querySelectorAll('.mrx-wrap').forEach(n => n.remove());
  const wrap = document.createElement('div');
  wrap.className = 'mrx-wrap';
  wrap.innerHTML = badgesSection(d, x) + goalsSection(d, x) + attendanceSection(d, x) + tajweedSection(d, x) + planSection(d, x) + completenessSection(x);
  host.parentNode.insertBefore(wrap, host);
  host.style.display = 'none';
  const btn = wrap.querySelector('#mrx-open-att');
  if (btn) btn.onclick = async () => {
    try {
      const done = await (await import('../components/attendancePrompt.js')).confirmMissingAttendance({ studentId: d.student && d.student.id, reportMonth: { year: d.year, monthIndex0: d.monthIndex0 } });
      if (done && typeof d.onDataChanged === 'function') d.onDataChanged();
    } catch (e) { console.warn(e); }
  };
}
