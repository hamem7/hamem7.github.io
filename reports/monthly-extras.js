// reports/monthly-extras.js
// =============================================================================
// أقسام التقرير الشهري الجديدة (تُحقن في صفحة التقرير القائمة دون المساس ببقية منطقها):
//   أوسمة الشهر + مفتاح الأوسمة · الحضور والساعات · التجويد (نظري/عملي) · الطريق إلى الختم · خطة الشهر القادم (مبدئية)
//   · مؤشر اكتمال البيانات (للمعلم فقط: لا يدخل التصدير).
// الألوان قيم ثابتة (لا var()) لأن html2canvas يلتقط الصفحة للتصدير — نفس قاعدة monthly-report.identity.js.
// كل نص عبر t()/tf() من i18n-badges.js (عربي/English). لا تمسّ أي نص قرآني ولا خطًا قرآنيًا هنا.
// =============================================================================
import { AppState, t } from '../core/app.js';
import { tf } from '../core/i18n.js';
import { esc } from '../core/escape.js';
import '../core/i18n-badges.js';
import { loadStudentContext, inputsForMonth, evidenceTimestamps } from '../core/badgeService.js';
import { computeMonthBadges, summarizeEarned, closestToNext, BADGE_DEFS } from '../engine/badgesEngine.js';
import { summarizeMonth, evidenceDays, hasSchedule } from '../engine/attendanceEngine.js';
import { ensureJourney } from '../engine/tajweedJourney.js';
import { paceFrom, projectMilestones, buildPathMap, weightsFromPages, unitsBetween, buildNextMonthPlan, sessionsToFinish } from '../engine/khatmPlan.js';
import { ayahIndex, juzBounds, JUZ_COUNT, summarizeReview } from '../engine/reviewParts.js';
import { getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import { SKILLS } from '../engine/skillMap.js';
import { skillLabel } from '../components/skillProfile.js';
import { loadGoalState, goalsEarnedInMonth, goalName, goalIcon, nextGoalHint } from '../core/goalsService.js';
import { juzTierKey, MILESTONES } from '../engine/goalsEngine.js';

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

async function buildKhatm(d, ctx, att) {
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
  if (!sessionsPerMonth) return { pace: { perSession: 0, perMonth: 0, basis: 'none', monthsUsed: 0 }, proj: [], remaining, curJuz, sessionsPerMonth: null, sessionsToFinishJuz: null, monthsUsed: 0, excludedMonths };
  const pace = paceFrom(months, sessionsPerMonth);
  const proj = projectMilestones({ pace, remaining, sessionsPerMonth, attendancePct: att && att.pct != null ? att.pct : null, now: new Date() });
  return { pace, proj, remaining, curJuz, sessionsPerMonth, sessionsToFinishJuz: sessionsToFinish(remaining.juz, pace), monthsUsed: pace.monthsUsed, excludedMonths };
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

export async function collectExtras(d) {
  const student = d.student, y = d.year, m = d.monthIndex0;
  const ctx = await loadStudentContext(student);
  const now = new Date();
  const input = inputsForMonth(ctx, y, m, now);
  const results = computeMonthBadges(input);
  const summary = summarizeEarned(results);
  const ev = evidenceDays(evidenceTimestamps(ctx));
  const isCurrent = now.getFullYear() === y && now.getMonth() === m;
  const att = summarizeMonth(student, y, m, ev, isCurrent ? now : null);
  const khatm = await buildKhatm(d, ctx, att);
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
    if (gs) goals = { state: gs, newEarned: gs.earned.filter(e => goalsEarnedInMonth(student, y, m).includes(e.id)), hint: nextGoalHint(gs, null) };
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
  return `<div class="mrx pdf-block" id="mr-goals-block"><div class="section-title">${esc(t('goal_rep_title'))}</div><div class="section-sub">${esc(tf('goal_juz_count', { n: num(g.state.fullJuz) }))}</div>${news}${next}<div class="mrx-note">${esc(t('goal_rep_basis'))}</div></div>`;
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

function khatmSection(d, x) {
  const k = x.khatm;
  const head = `<div class="section-title">${esc(t('khm_title'))}</div><div class="section-sub">${esc(tf('khm_sub', { name: firstName(d.name) }))}</div>`;
  if (!k || !k.proj.length) return `<div class="mrx pdf-block" id="mr-khm-block">${head}<div class="mrx-note">${esc(t('khm_none'))}</div></div>`;
  const keyName = { juz: 'khm_m_juz', five: 'khm_m_five', quarter: 'khm_m_quarter', half: 'khm_m_half', khatm: 'khm_m_khatm' };
  const rows = k.proj.map(p => `<div class="mrx-row"><span>${esc(t(keyName[p.key]))}</span>
    <b>${p.done ? esc(t('khm_done')) : esc(tf('khm_row', { s: num(p.sessions), d: fmtDate(p.dateFull) }))}</b></div>
    ${!p.done && p.dateAvg.getTime() !== p.dateFull.getTime() ? `<div class="mrx-note" style="margin:0 0 4px;">${esc(tf('khm_row_avg', { d: fmtDate(p.dateAvg) }))}</div>` : ''}`).join('');
  const pace = `<div class="mrx-note">${esc(tf('khm_pace', { p: num(Math.round(k.pace.perSession * 10) / 10), m: num(Math.round(k.pace.perMonth)) }))}${k.monthsUsed < 2 ? ' · ' + esc(t('khm_basis_default')) : ''}${k.excludedMonths ? ' · ' + esc(tf('khm_excluded', { n: num(k.excludedMonths) })) : ''}</div>`;
  return `<div class="mrx pdf-block" id="mr-khm-block">${head}${pace}${rows}<div class="mrx-note">${esc(t('khm_foot'))}</div></div>`;
}

function planSection(d, x) {
  const p = x.plan;
  const rows = [];
  rows.push([t('pln_new'), p.newUnits != null ? tf('pln_new_val', { n: num(Math.max(Math.round(p.newUnits), 1)), s: num(p.sessions) }) : t('pln_new_none')]);
  rows.push([t('pln_near'), p.thisMonthNewAyahs != null ? tf('pln_near_val', { n: num(p.thisMonthNewAyahs) }) : t('pln_near_none')]);
  rows.push([t('pln_far'), p.farReviewParts.length ? tf('pln_far_val', { parts: p.farReviewParts.map(num).join(isEn() ? ', ' : '، ') }) : t('pln_far_none')]);
  rows.push([t('pln_tajweed'), p.nextTajweedRule ? tf('pln_tajweed_val', { rule: t(p.nextTajweedRule) }) : t('pln_tajweed_none')]);
  if (p.focusSkill) rows.push([t('pln_focus'), tf('pln_focus_val', { skill: p.focusSkill })]);
  const list = rows.map(([a, b]) => `<div class="mrx-row"><b>${esc(a)}</b><span>${esc(b)}</span></div>`).join('');
  return `<div class="mrx pdf-block" id="mr-plan2-block"><div class="section-title">${esc(t('pln_title'))}</div>
    <div class="mrx-plan-warn">${esc(t('pln_disclaimer'))}</div>${list}</div>`;
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
  wrap.innerHTML = badgesSection(d, x) + goalsSection(d, x) + attendanceSection(d, x) + tajweedSection(d, x) + khatmSection(d, x) + planSection(d, x) + completenessSection(x);
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
