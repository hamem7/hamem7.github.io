// =============================================================================
// reports/monthly-quarter.js
// 🌟 [جديد] «حصاد ثلاثة أشهر» — وضع ثانٍ داخل شاشة التقرير الشهري (reports/monthly-report.js):
// يجمع مستوى الطالب خلال الشهر المختار والشهرين السابقين له، ويقارن بينها في:
//   • الحفظ الجديد (سجل الحفظ الشهري: نهاية الشهر، أو نقطة المنتصف مؤقتاً)
//   • الألعاب الفردية (غرفة اللعب — history_<id> المحلي، بلا جلسات علاج الأخطاء)
//   • الواجب المنزلي (المعتمد في السجل المحلي + الخادم إن سجّل المعلم الدخول، بلا تكرار)
//   • الاختبارات الثنائية (المكتملة فقط، إن وجدت)
//   • الأخطاء المعالَجة
// ثم يبني «قراءة في الأداء» آلية صادقة: لا حكم بلا رقمين على الأقل، ولا مستوى من أقل من 3 أدلّة.
//
// العرض: خمسة أقسام .pdf-block داخل #mrq-root (فيعمل تقسيم صفحات PDF والتصدير كما هو):
//   1) الملخص: شارة المسار + أربع بطاقات (الإجمالي، المتوسط، أعمدة الأشهر الثلاثة، التغيّر)
//   2) تطوّر المستوى: خط لمتوسط الألعاب وخط لمتوسط الواجبات فوق أحزمة «منازل القمر» (60/75/90)
//   3) مصفوفة المقارنة: صف لكل مؤشر وعمود لكل شهر بتظليل نسبي وأفضل شهر ★ وعمود التغيّر
//   4) الحفظ والتدريب: رسمان متجاوران (لا محور مزدوج) + رحلة الموضع عبر الأشهر الثلاثة
//   5) قراءة في الأداء: ملاحظات مرقّمة + توصيات الفترة القادمة
// ألوان ثابتة وSVG مضمَّن فقط (html2canvas لا يحلّ var())، وبلا letter-spacing على النص العربي.
// التقرير ورقة فاتحة دائماً بقصد (reports/ ضمن INTENTIONAL_LIGHT في tools/gen-dark-theme.mjs).
// =============================================================================

import { AppState, t, surahNameLocal } from '../core/app.js';
import { esc } from '../core/escape.js';
import { isFixSessionEntry } from '../core/fixSessionLog.js';
import { studentOutcomeInMatch } from '../engine/dualTestEngine.js';
import { getSurahInfo, calcMemorizationProgress } from '../engine/memorizationEngine.js';

export const QUARTER_MONTHS = 3;
const MIN_EVIDENCE = 3;          // نفس قاعدة التقرير الشهري: لا «مستوى» من أقل من 3 أدلّة
const CLOUD_TIMEOUT_MS = 9000;

// 🎨 هوية «حصاد 3 أشهر» مستقلة عن الشهري (زمردي وذهبي): «ليل وأصيل» — كحلي ليلي + نحاسي/كهرماني.
// ألوان المسلسلات (مُتحقَّق منها لعمى الألوان، والقيم مكتوبة على كل عمود): ألعاب أزرق · واجبات نحاسي · ثنائية فيروزي
const C_GAMES = '#3a6bc4', C_HW = '#d0803a', C_DUAL = '#23998b', C_MEMO = '#12234d';

const isEn = () => AppState.currentLang === 'en';
const locale = () => (isEn() ? 'en-US' : 'ar-EG') + '-u-nu-latn';
const fmt = (s, vals) => String(s).replace(/\{(\w+)\}/g, (m, k) => (vals && vals[k] != null ? vals[k] : m));
const avg = (arr) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;
const fwd = () => (isEn() ? '→' : '←');

function monthName(y, m0, opts = { month: 'long' }) {
  try { return new Intl.DateTimeFormat(locale(), opts).format(new Date(y, m0, 1)); }
  catch (e) { return `${m0 + 1}/${y}`; }
}
function posLabel(p) {
  if (!p) return '';
  const info = getSurahInfo(AppState.surahsData, p.s);
  return `${info ? surahNameLocal(info.name) : '؟'} ${p.a}`;
}

// -----------------------------------------------------------------------------
// 1) التسميات: الفترة الميلادية والهجرية للأشهر الثلاثة
// -----------------------------------------------------------------------------
function periodLabels(months) {
  const a = months[0], b = months[months.length - 1];
  const sameYear = a.year === b.year;
  const hero = sameYear
    ? `${monthName(a.year, a.m0)} – ${monthName(b.year, b.m0)} ${b.year}`
    : `${monthName(a.year, a.m0)} ${a.year} – ${monthName(b.year, b.m0)} ${b.year}`;
  const lastDay = new Date(b.year, b.m0 + 1, 0).getDate();
  const range = fmt(t('mrq_period_range'), { a: `1 ${monthName(a.year, a.m0)}`, b: `${lastDay} ${monthName(b.year, b.m0)}` });
  let hijri = '';
  try {
    const loc = (isEn() ? 'en-US' : 'ar-SA') + '-u-ca-islamic-umalqura-nu-latn';
    const f = new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric' });
    const parts = (dt) => { const o = {}; f.formatToParts(dt).forEach(p => { o[p.type] = p.value; }); return o; };
    const pa = parts(new Date(a.year, a.m0, 1)), pb = parts(new Date(b.year, b.m0 + 1, 0));
    if (pa.month && pb.month) {
      hijri = pa.year === pb.year ? `${pa.month} – ${pb.month} ${pb.year} ${t('mr2_hijri_suffix')}` : `${pa.month} ${pa.year} – ${pb.month} ${pb.year} ${t('mr2_hijri_suffix')}`;
    }
  } catch (e) { /* بلا هجري */ }
  // اسم الملف/الأرشيف: أرقام وحروف فقط
  const file = `${monthName(a.year, a.m0)} ${monthName(b.year, b.m0)} ${b.year}`;
  return { hero, range, hijri, file };
}

// -----------------------------------------------------------------------------
// 2) جمع البيانات
// -----------------------------------------------------------------------------
export async function collectQuarterData(student, year, monthIndex0) {
  const months = [];
  for (let k = QUARTER_MONTHS - 1; k >= 0; k--) {
    const dt = new Date(year, monthIndex0 - k, 1);
    const y = dt.getFullYear(), m0 = dt.getMonth();
    months.push({
      year: y, m0, start: dt.getTime(), end: new Date(y, m0 + 1, 1).getTime(),
      name: monthName(y, m0), short: monthName(y, m0, { month: 'short' }),
      games: [], hw: [], duals: { n: 0, w: 0, l: 0, t: 0 }, errors: 0, memo: null
    });
  }
  const idxOf = (ts) => { const n = typeof ts === 'number' ? ts : new Date(ts).getTime(); return isNaN(n) ? -1 : months.findIndex(m => n >= m.start && n < m.end); };
  const sid = student && student.id;

  // (أ) السجل المحلي: الألعاب الفردية + الواجبات المعتمدة
  const seenSubs = new Set();
  try {
    const hist = JSON.parse(localStorage.getItem(`history_${sid}`) || '[]');
    (Array.isArray(hist) ? hist : []).forEach(e => {
      if (!e || typeof e.timestamp !== 'number') return;
      if (e.source === 'homework' && e.approved) {
        if (e.submissionId !== undefined && e.submissionId !== null) seenSubs.add(String(e.submissionId));
        const i = idxOf(e.timestamp);
        if (i >= 0 && typeof e.score === 'number') months[i].hw.push(e.score);
        return;
      }
      if (e.hwId || isFixSessionEntry(e)) return;
      const i = idxOf(e.timestamp);
      if (i >= 0) months[i].games.push(typeof e.score === 'number' ? e.score : 0);
    });
  } catch (e) { console.error('[monthly-quarter.js] تعذر قراءة السجل المحلي:', e); }

  // (ب) الخادم: تسليمات لم تُسجَّل محلياً (اعتُمدت من جهاز آخر مثلاً) — بلا طلب دخول داخل التقرير
  let hwCloud = 'skipped';
  try {
    const { isTeacherAuthed } = await import('../core/api.js');
    if (isTeacherAuthed()) {
      const { getAllSubmissionsFromCloud } = await import('../core/homeworkApi.js');
      const subs = await Promise.race([getAllSubmissionsFromCloud(), new Promise(r => setTimeout(() => r(null), CLOUD_TIMEOUT_MS))]);
      if (Array.isArray(subs)) {
        hwCloud = 'ok';
        subs.forEach(s => {
          if (String(s.studentId) !== String(sid)) return;
          if (s.id !== undefined && s.id !== null && seenSubs.has(String(s.id))) return;
          const i = idxOf(s.timestamp);
          const sc = typeof s.score === 'number' ? s.score : s.finalScore;
          if (i >= 0 && typeof sc === 'number') months[i].hw.push(sc);
        });
      } else hwCloud = 'error';
    }
  } catch (e) { hwCloud = 'error'; console.error('[monthly-quarter.js] تعذر جلب الواجبات من الخادم:', e); }

  // (ج) الاختبارات الثنائية المكتملة
  try {
    if (AppState.dualTestsManager) {
      const all = await AppState.dualTestsManager.getAllMatches();
      (all || []).forEach(m => {
        if (m.status !== 'completed' || !m.finishedAt) return;
        if (String(m.studentIdA) !== String(sid) && String(m.studentIdB) !== String(sid)) return;
        const i = idxOf(m.finishedAt);
        if (i < 0) return;
        const o = studentOutcomeInMatch(m, sid);
        const d = months[i].duals;
        if (!o) return;
        d.n++; if (o === 'win') d.w++; else if (o === 'loss') d.l++; else d.t++;
      });
    }
  } catch (e) { console.error('[monthly-quarter.js] تعذر جلب المواجهات الثنائية:', e); }

  // (د) الأخطاء المعالَجة
  (Array.isArray(student && student.resolvedWeaknesses) ? student.resolvedWeaknesses : []).forEach(w => {
    const i = w && w.dateResolved ? idxOf(w.dateResolved) : -1;
    if (i >= 0) months[i].errors++;
  });

  // (هـ) الحفظ: سجل كل شهر (النهاية، أو نقطة المنتصف كموضع مؤقت)
  if (AppState.monthlyMemorizationManager) {
    for (const m of months) {
      try {
        const rec = await AppState.monthlyMemorizationManager.getRecord(sid, m.year, m.m0 + 1);
        if (!rec || !rec.beginning) continue;
        const begin = { s: rec.beginning.surahNumber, a: rec.beginning.ayahNumber };
        const endRef = rec.ending || rec.mid;
        const end = endRef ? { s: endRef.surahNumber, a: endRef.ayahNumber } : null;
        let n = null, provisional = false;
        if (rec.ending && typeof rec.newAyahs === 'number') n = rec.newAyahs;
        else if (endRef) {
          const calc = calcMemorizationProgress(AppState.surahsData, { surahNumber: begin.s, ayahNumber: begin.a }, { surahNumber: end.s, ayahNumber: end.a });
          if (calc && calc.valid) { n = calc.newAyahs; provisional = !rec.ending; }
        }
        m.memo = { n, provisional, begin, end };
      } catch (e) { console.error('[monthly-quarter.js] تعذر جلب سجل الحفظ:', e); }
    }
  }

  return deriveQuarter(months, hwCloud);
}

// -----------------------------------------------------------------------------
// 3) الاشتقاق: مؤشرات كل شهر + الإجمالي + المسار + الملاحظات
// -----------------------------------------------------------------------------
function deriveQuarter(months, hwCloud) {
  months.forEach(m => {
    m.gamesN = m.games.length; m.gamesAvg = avg(m.games); m.gamesBest = m.games.length ? Math.max(...m.games) : null;
    m.hwN = m.hw.length; m.hwAvg = avg(m.hw);
    m.memoN = m.memo && typeof m.memo.n === 'number' ? m.memo.n : null;
    m.practice = m.gamesN + m.hwN + m.duals.n;
    const lv = [];
    if (m.gamesN) lv.push(m.gamesAvg);
    if (m.hwN) lv.push(m.hwAvg);
    m.level = avg(lv);
    m.levelThin = m.level != null && (m.gamesN + m.hwN) < MIN_EVIDENCE;
    m.active = m.practice > 0 || (m.memoN || 0) > 0 || m.errors > 0;
  });
  const allGames = months.flatMap(m => m.games), allHw = months.flatMap(m => m.hw);
  const tot = {
    memo: months.some(m => m.memoN != null) ? months.reduce((s, m) => s + (m.memoN || 0), 0) : null,
    memoProvisional: months.some(m => m.memo && m.memo.provisional),
    gamesN: allGames.length, gamesAvg: avg(allGames),
    hwN: allHw.length, hwAvg: avg(allHw),
    dualN: months.reduce((s, m) => s + m.duals.n, 0), dualW: months.reduce((s, m) => s + m.duals.w, 0),
    dualL: months.reduce((s, m) => s + m.duals.l, 0), dualT: months.reduce((s, m) => s + m.duals.t, 0),
    errors: months.reduce((s, m) => s + m.errors, 0),
    activeMonths: months.filter(m => m.active).length
  };
  const used = [], excluded = [];
  [{ key: 'games', avg: tot.gamesAvg, n: tot.gamesN }, { key: 'hw', avg: tot.hwAvg, n: tot.hwN }]
    .filter(p => p.avg != null).forEach(p => (p.n >= MIN_EVIDENCE ? used : excluded).push(p));
  tot.level = avg(used.map(p => p.avg));
  tot.levelParts = { used, excluded };

  // المسار: أول قيمة متاحة مقابل آخر قيمة متاحة لكل مؤشر
  const span = (get) => {
    const pts = months.map((m, i) => ({ i, v: get(m) })).filter(p => typeof p.v === 'number');
    if (pts.length < 2) return null;
    const a = pts[0], b = pts[pts.length - 1];
    return { from: a.v, to: b.v, d: b.v - a.v, fromM: months[a.i], toM: months[b.i] };
  };
  const trends = {
    memo: span(m => m.memoN),
    level: span(m => (m.levelThin ? null : m.level)),
    practice: span(m => (m.active ? m.practice : null)),
    gamesAvg: span(m => m.gamesAvg), hwAvg: span(m => m.hwAvg)
  };
  const sgn = (tr, tol) => !tr ? 0 : tr.d > tol ? 1 : tr.d < -tol ? -1 : 0;
  const signals = [sgn(trends.memo, Math.max(2, (trends.memo && trends.memo.from * 0.1) || 0)), sgn(trends.level, 3), sgn(trends.practice, 1)];
  const known = [trends.memo, trends.level, trends.practice].filter(Boolean).length;
  const score = signals.reduce((s, v) => s + v, 0);
  const verdict = tot.activeMonths < 2 || !known ? 'early' : score >= 1 ? 'rising' : score <= -1 ? 'support' : 'steady';

  const q = { months, tot, trends, verdict, hwCloud, labels: periodLabels(months) };
  const firstMemo = months.find(m => m.memo && m.memo.begin);
  const lastMemo = months.slice().reverse().find(m => m.memo && m.memo.end);
  q.journey = firstMemo && lastMemo ? { from: posLabel(firstMemo.memo.begin), to: posLabel(lastMemo.memo.end), stations: months.map(m => (m.memo && m.memo.end ? posLabel(m.memo.end) : null)) } : null;
  q.insights = buildInsights(q);
  q.tips = buildTips(q);
  q.hasAnyData = tot.activeMonths > 0;
  return q;
}

function buildInsights(q) {
  const { tot, trends, months } = q;
  const out = [];
  const push = (tone, key, vals) => out.push({ tone, text: fmt(t(key), vals) });
  if (trends.memo) {
    const tr = trends.memo;
    push(tr.d > 0 ? 'up' : tr.d < 0 ? 'down' : 'same', tr.d > 0 ? 'mrq_in_memo_up' : tr.d < 0 ? 'mrq_in_memo_down' : 'mrq_in_memo_same', { a: tr.from, b: tr.to, ma: tr.fromM.name, mb: tr.toM.name });
  } else if (tot.memo != null) push('info', 'mrq_in_memo_total', { n: tot.memo });
  if (trends.level) {
    const tr = trends.level;
    push(tr.d > 2 ? 'up' : tr.d < -2 ? 'down' : 'same', tr.d > 2 ? 'mrq_in_level_up' : tr.d < -2 ? 'mrq_in_level_down' : 'mrq_in_level_same', { a: tr.from, b: tr.to, ma: tr.fromM.name, mb: tr.toM.name, d: Math.abs(tr.d) });
  }
  // صلة التدريب بالحفظ: تُذكر فقط حين يوجد شهران على الأقل فيهما الرقمان معاً، وبقمّة واحدة واضحة لكل منهما
  const both = months.filter(m => m.memoN != null && m.active);
  if (both.length >= 2) {
    const peak = (get) => { const mx = Math.max(...both.map(get)); const top = both.filter(m => get(m) === mx); return top.length === 1 && mx > 0 ? top[0] : null; };
    const pM = peak(m => m.memoN), pP = peak(m => m.practice);
    if (pM && pP) {
      if (pM === pP) push('up', 'mrq_in_link_same', { m: pM.name });
      else push('info', 'mrq_in_link_diff', { mm: pM.name, mp: pP.name });
    }
  }
  if (tot.activeMonths === QUARTER_MONTHS) push('up', 'mrq_in_consistent', {});
  else {
    const idle = months.filter(m => !m.active).map(m => m.name);
    if (idle.length && idle.length < QUARTER_MONTHS) push('down', 'mrq_in_idle', { m: idle.join(t('mrq_list_sep')) });
  }
  if (tot.gamesN >= MIN_EVIDENCE && tot.hwN >= MIN_EVIDENCE && Math.abs(tot.gamesAvg - tot.hwAvg) >= 5) {
    push('info', tot.gamesAvg > tot.hwAvg ? 'mrq_in_games_gt_hw' : 'mrq_in_hw_gt_games', { g: tot.gamesAvg, h: tot.hwAvg });
  }
  if (tot.dualN) push(tot.dualW >= tot.dualL ? 'up' : 'info', 'mrq_in_dual', { n: tot.dualN, w: tot.dualW, l: tot.dualL, t: tot.dualT });
  if (tot.errors) push('up', 'mrq_in_errors', { n: tot.errors });
  return out.slice(0, 6);
}

function buildTips(q) {
  const { tot, trends } = q;
  const tips = [];
  if (trends.memo && trends.memo.d < 0) tips.push('mrq_tip_memo');
  if (tot.level != null && tot.level < 75) tips.push('mrq_tip_review');
  if (tot.hwN < MIN_EVIDENCE) tips.push('mrq_tip_hw');
  if (tot.gamesN < MIN_EVIDENCE) tips.push('mrq_tip_games');
  if (!tot.dualN) tips.push('mrq_tip_dual');
  if (!tips.length) tips.push('mrq_tip_keep');
  return tips.slice(0, 3).map(k => t(k));
}

// -----------------------------------------------------------------------------
// 4) العرض
// -----------------------------------------------------------------------------
const VERDICT_ICON = { rising: '▲', steady: '◆', support: '▼', early: '✦' };

function deltaChip(tr, unit = '') {
  if (!tr) return `<span class="mrq-dc na">—</span>`;
  const cls = tr.d > 0 ? 'up' : tr.d < 0 ? 'down' : 'same';
  return `<span class="mrq-dc ${cls}">${tr.d > 0 ? '▲' : tr.d < 0 ? '▼' : '='} ${Math.abs(tr.d)}${unit}</span>`;
}

// أعمدة صغيرة للأشهر الثلاثة داخل بطاقة المؤشر (قيمة مكتوبة فوق كل عمود — لا يعتمد الفهم على اللون)
function miniBars(months, get, color) {
  const vals = months.map(get);
  const mx = Math.max(1, ...vals.filter(v => typeof v === 'number'));
  return `<div class="mrq-mini">${months.map((m, i) => {
    const v = vals[i];
    const h = typeof v === 'number' ? Math.max(4, Math.round(v / mx * 46)) : 0;
    return `<div class="mrq-mini-c"><b>${typeof v === 'number' ? v : '—'}</b><i style="height:${h}px;background:${typeof v === 'number' ? color : 'transparent'}"></i><span>${esc(m.short)}</span></div>`;
  }).join('')}</div>`;
}

function kpiCard({ icon, label, total, unit, sub, bars, chip }) {
  return `<div class="mrq-kpi">
    <div class="mrq-kpi-h"><span class="mrq-kpi-ic">${icon}</span><b>${esc(label)}</b>${chip}</div>
    <div class="mrq-kpi-v"><span class="mrq-n">${total}</span><span class="mrq-u">${esc(unit)}</span></div>
    <div class="mrq-kpi-s">${sub}</div>
    ${bars}
  </div>`;
}

const ICONS = {
  memo: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f2c27e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z"/><path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/></svg>`,
  games: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f2c27e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="4"/><path d="M6 12h4M8 10v4"/><circle cx="16" cy="11" r="1"/><circle cx="18" cy="13" r="1"/></svg>`,
  hw: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f2c27e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/></svg>`,
  dual: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#f2c27e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><circle cx="16" cy="8" r="3"/><path d="M2 20c0-3 3-5 6-5s6 2 6 5"/><path d="M14 15.5c.6-.3 1.3-.5 2-.5 3 0 6 2 6 5"/></svg>`
};

function renderOverview(q) {
  const { tot, months, trends, verdict } = q;
  const dualTrend = (() => {
    const pts = months.map(m => m.duals.n);
    return pts.some(v => v) ? { d: pts[pts.length - 1] - pts[0] } : null;
  })();
  const pctSub = (a, n) => a != null ? fmt(t('mrq_kpi_avg'), { v: a }) + (n < MIN_EVIDENCE ? ` <em>${esc(t('mrq_thin'))}</em>` : '') : esc(t('mrq_kpi_none'));
  const cards = [
    kpiCard({ icon: ICONS.memo, label: t('mrq_kpi_memo'), total: tot.memo != null ? tot.memo : '—', unit: t('mmp_ayahs_unit'),
      sub: tot.memo != null ? esc(t(tot.memoProvisional ? 'mrq_kpi_memo_prov' : 'mrq_kpi_memo_sub')) : esc(t('mrq_kpi_memo_none')),
      bars: miniBars(months, m => m.memoN, C_MEMO), chip: deltaChip(trends.memo) }),
    kpiCard({ icon: ICONS.games, label: t('mrq_kpi_games'), total: tot.gamesN, unit: t('mr_cmp_u_session'),
      sub: pctSub(tot.gamesAvg, tot.gamesN), bars: miniBars(months, m => m.gamesN, C_GAMES), chip: deltaChip(months.some(m => m.gamesN) ? { d: months[2].gamesN - months[0].gamesN } : null) }),
    kpiCard({ icon: ICONS.hw, label: t('mrq_kpi_hw'), total: tot.hwN, unit: t('mrq_u_hw'),
      sub: pctSub(tot.hwAvg, tot.hwN), bars: miniBars(months, m => m.hwN, C_HW), chip: deltaChip(months.some(m => m.hwN) ? { d: months[2].hwN - months[0].hwN } : null) }),
    kpiCard({ icon: ICONS.dual, label: t('mrq_kpi_dual'), total: tot.dualN, unit: t('mrq_u_dual'),
      sub: tot.dualN ? esc(fmt(t('mrq_kpi_dual_sub'), { w: tot.dualW, l: tot.dualL, t: tot.dualT })) : esc(t('mrq_kpi_dual_none')),
      bars: miniBars(months, m => m.duals.n, C_DUAL), chip: deltaChip(dualTrend) })
  ].join('');
  const vText = fmt(t('mrq_verdict_' + verdict + '_txt'), { n: tot.activeMonths });
  return `<div class="pdf-block mrq-sec mrq-first" id="mrq-overview">
    <div class="section-title">${esc(t('mrq_title'))}</div>
    <div class="section-sub">${esc(fmt(t('mrq_sub'), { a: months[0].name, b: months[months.length - 1].name }))}</div>
    <div class="mrq-verdict v-${verdict}">
      <div class="mrq-vbadge"><span>${VERDICT_ICON[verdict]}</span></div>
      <div class="mrq-vtext"><small>${esc(t('mrq_verdict_lbl'))}</small><b>${esc(t('mrq_verdict_' + verdict))}</b><p>${esc(vText)}</p></div>
      <div class="mrq-vmonths">${months.map(m => `<span class="${m.active ? 'on' : ''}"><i></i>${esc(m.short)}</span>`).join('')}</div>
    </div>
    <div class="mrq-kpis">${cards}</div>
  </div>`;
}

// خط المستوى: محور واحد 0–100 مع أحزمة المنازل؛ الزمن يجري باتجاه القراءة (يمين→يسار بالعربية) ليطابق أعمدة المصفوفة
function renderLevel(q) {
  const { months } = q;
  const has = months.some(m => m.gamesAvg != null || m.hwAvg != null);
  if (!has) return '';
  const W = 660, H = 236, padL = 78, padR = 78, padT = 18, padB = 34;
  const rtl = !isEn();
  const n = months.length;
  const xOf = (i) => { const p = padL + (W - padL - padR) * (i / (n - 1)); return rtl ? W - p : p; };
  const yMin = 40;
  const yOf = (v) => padT + (H - padT - padB) * (1 - (Math.max(yMin, v) - yMin) / (100 - yMin));
  const bands = [
    { from: 90, to: 100, fill: '#e3e9f6', key: 'full' }, { from: 75, to: 90, fill: '#eef2fa', key: 'gibbous' },
    { from: 60, to: 75, fill: '#fbf1e6', key: 'quarter' }, { from: yMin, to: 60, fill: '#fdf8f3', key: 'crescent' }
  ];
  const bandSvg = bands.map(b => {
    const y1 = yOf(b.to), y2 = yOf(b.from);
    const lx = rtl ? 8 : W - 8;
    return `<rect x="0" y="${y1.toFixed(1)}" width="${W}" height="${(y2 - y1).toFixed(1)}" fill="${b.fill}"/>
      <text x="${lx}" y="${((y1 + y2) / 2 + 4).toFixed(1)}" text-anchor="${rtl ? 'start' : 'end'}" class="mrq-band-t">${esc(t('mr2_moon_' + b.key))}</text>`;
  }).join('');
  const grid = [60, 75, 90].map(v => `<line x1="${rtl ? 44 : padL - 10}" x2="${rtl ? W - padR + 10 : W - 44}" y1="${yOf(v).toFixed(1)}" y2="${yOf(v).toFixed(1)}" stroke="#c3cadb" stroke-dasharray="3 4"/>
    <text x="${rtl ? W - 6 : 6}" y="${(yOf(v) + 4).toFixed(1)}" text-anchor="${rtl ? 'end' : 'start'}" class="mrq-ax">${v}%</text>`).join('');
  const series = [
    { key: 'gamesAvg', nKey: 'gamesN', color: C_GAMES, label: t('mrq_s_games') },
    { key: 'hwAvg', nKey: 'hwN', color: C_HW, label: t('mrq_s_hw') }
  ];
  // في كل شهر: قيمة السلسلة الأعلى فوق نقطتها والأدنى تحتها، حتى لا تتراكب القيم المتقاربة
  const dyOf = (s, m) => {
    const other = series.find(o => o !== s);
    const ov = other ? m[other.key] : null;
    if (ov == null) return -12;
    return m[s.key] > ov || (m[s.key] === ov && s === series[0]) ? -12 : 21;
  };
  const lines = series.map(s => {
    const pts = months.map((m, i) => ({ i, v: m[s.key], n: m[s.nKey], m })).filter(p => p.v != null);
    if (!pts.length) return '';
    const path = pts.map((p, k) => `${k ? 'L' : 'M'}${xOf(p.i).toFixed(1)} ${yOf(p.v).toFixed(1)}`).join(' ');
    const dots = pts.map(p => `<g><title>${esc(`${s.label} · ${p.m.name}: ${p.v}% (${p.n})`)}</title>
      <circle cx="${xOf(p.i).toFixed(1)}" cy="${yOf(p.v).toFixed(1)}" r="6" fill="${p.n < MIN_EVIDENCE ? '#ffffff' : s.color}" stroke="${s.color}" stroke-width="2.5"/>
      <text x="${xOf(p.i).toFixed(1)}" y="${(yOf(p.v) + dyOf(s, p.m)).toFixed(1)}" text-anchor="middle" class="mrq-val">${p.v}%</text></g>`).join('');
    return `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>${dots}`;
  }).join('');
  const xl = months.map((m, i) => `<text x="${xOf(i).toFixed(1)}" y="${H - 10}" text-anchor="middle" class="mrq-xl">${esc(m.name)}</text>`).join('');
  const lvl = months.map(m => `<div class="mrq-lv${m.level == null ? ' na' : ''}"><span>${esc(m.name)}</span><b>${m.level != null ? m.level + '%' : '—'}</b>${m.level != null ? `<small>${esc(m.levelThin ? t('mrq_thin') : t('mr2_moon_' + phaseKey(m.level)))}</small>` : ''}</div>`).join('');
  return `<div class="pdf-block mrq-sec" id="mrq-level">
    <div class="section-title">${esc(t('mrq_level_title'))}</div>
    <div class="section-sub">${esc(t('mrq_level_sub'))}</div>
    <div class="mrq-chart-card">
      <div class="mrq-legend">${series.map(s => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}<span class="hollow"><i></i>${esc(t('mrq_legend_thin'))}</span></div>
      <svg viewBox="0 0 ${W} ${H}" class="mrq-svg" role="img" aria-label="${esc(t('mrq_level_title'))}">${bandSvg}${grid}${lines}${xl}</svg>
      <div class="mrq-lvrow">${lvl}</div>
    </div>
  </div>`;
}
function phaseKey(v) { return v >= 90 ? 'full' : v >= 75 ? 'gibbous' : v >= 60 ? 'quarter' : 'crescent'; }

function renderMatrix(q) {
  const { months, trends } = q;
  const rows = [
    { l: t('mrq_r_memo'), get: m => m.memoN, tr: trends.memo, prov: m => m.memo && m.memo.provisional },
    { l: t('mrq_r_games'), get: m => (m.active ? m.gamesN : null) },
    { l: t('mrq_r_games_avg'), get: m => m.gamesAvg, pct: true, tr: trends.gamesAvg },
    { l: t('mrq_r_hw'), get: m => (m.active ? m.hwN : null) },
    { l: t('mrq_r_hw_avg'), get: m => m.hwAvg, pct: true, tr: trends.hwAvg },
    { l: t('mrq_r_dual'), get: m => (m.active ? m.duals.n : null), show: m => (m.duals.n ? fmt(t('mrq_dual_cell'), { n: m.duals.n, w: m.duals.w }) : null), hide: !q.tot.dualN },
    { l: t('mrq_r_errors'), get: m => (m.active ? m.errors : null), hide: !q.tot.errors },
    { l: t('mrq_r_level'), get: m => m.level, pct: true, tr: trends.level, strong: true }
  ].filter(r => !r.hide);
  const spanOf = (get) => {
    const pts = months.map(get).filter(v => typeof v === 'number');
    return pts.length >= 2 ? { d: pts[pts.length - 1] - pts[0] } : null;
  };
  const body = rows.map(r => {
    const vals = months.map(r.get);
    const nums = vals.filter(v => typeof v === 'number');
    const mx = nums.length ? Math.max(...nums) : 0;
    const best = nums.length >= 2 && mx > 0 && nums.filter(v => v === mx).length === 1 ? mx : null;
    const tr = r.tr !== undefined ? r.tr : spanOf(r.get);
    const cells = months.map((m, i) => {
      const v = vals[i];
      if (typeof v !== 'number') return `<td class="na">—</td>`;
      const k = mx > 0 ? v / mx : 0;
      const bg = heat(k);
      const txt = r.show ? (r.show(m) || '0') : `${v}${r.pct ? '%' : ''}`;
      return `<td style="background:${bg}"${k > 0.72 ? ' class="hi"' : ''}>${esc(String(txt))}${r.prov && r.prov(m) ? '<sup>*</sup>' : ''}${best === v ? '<span class="mrq-star">★</span>' : ''}</td>`;
    }).join('');
    return `<tr${r.strong ? ' class="strong"' : ''}><th>${esc(r.l)}</th>${cells}<td class="chg">${deltaChip(tr, r.pct ? '%' : '')}</td></tr>`;
  }).join('');
  const anyProv = months.some(m => m.memo && m.memo.provisional);
  return `<div class="pdf-block mrq-sec" id="mrq-matrix">
    <div class="section-title">${esc(t('mrq_matrix_title'))}</div>
    <div class="section-sub">${esc(t('mrq_matrix_sub'))}</div>
    <table class="mrq-table">
      <thead><tr><th>${esc(t('mrq_col_metric'))}</th>${months.map(m => `<th>${esc(m.name)}<small>${m.year}</small></th>`).join('')}<th>${esc(t('mrq_col_change'))}</th></tr></thead>
      <tbody>${body}</tbody>
    </table>
    <div class="mrq-foot">★ ${esc(t('mrq_best_note'))}${anyProv ? ` · <sup>*</sup> ${esc(t('mrq_prov_note'))}` : ''} · ${esc(t('mrq_change_note'))}</div>
  </div>`;
}
function heat(k) {
  // من الأبيض إلى أزرق فاتح (#cfdbf2) — تظليل نسبي داخل الصف، لا يحمل معنى وحده (القيمة مكتوبة)
  const a = [255, 255, 255], b = [207, 219, 242];
  const c = a.map((x, i) => Math.round(x + (b[i] - x) * Math.max(0, Math.min(1, k))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// رسمان متجاوران بمحورين مستقلين (لا محور مزدوج): الحفظ الجديد · حجم التدريب (مكدّس بالنوع)
function renderLink(q) {
  const { months, journey } = q;
  const hasMemo = months.some(m => m.memoN != null);
  const hasPr = months.some(m => m.practice > 0);
  if (!hasMemo && !hasPr) return '';
  const rtl = !isEn();
  const W = 300, H = 190, padT = 24, padB = 30, bw = 46;
  const n = months.length;
  const xOf = (i) => { const p = 30 + (W - 60) * (i + 0.5) / n; return rtl ? W - p : p; };
  const base = H - padB, plotH = H - padT - padB;
  const xl = months.map((m, i) => `<text x="${xOf(i).toFixed(1)}" y="${H - 9}" text-anchor="middle" class="mrq-xl">${esc(m.short)}</text>`).join('');
  const axis = `<line x1="12" x2="${W - 12}" y1="${base}" y2="${base}" stroke="#c3cadb"/>`;
  const rr = (x, y, w, h, fill, title, roundTop) => {
    if (h <= 0) return '';
    const r = Math.min(4, h);
    const d = roundTop
      ? `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`
      : `M${x} ${y + h} V${y} H${x + w} V${y + h} Z`;
    return `<path d="${d}" fill="${fill}"><title>${esc(title)}</title></path>`;
  };
  const memoMax = Math.max(1, ...months.map(m => m.memoN || 0));
  const memoBars = months.map((m, i) => {
    if (m.memoN == null) return `<text x="${xOf(i).toFixed(1)}" y="${base - 8}" text-anchor="middle" class="mrq-val mute">—</text>`;
    const h = Math.max(m.memoN ? 3 : 0, m.memoN / memoMax * plotH);
    return rr(xOf(i) - bw / 2, base - h, bw, h, C_MEMO, `${m.name}: ${m.memoN}`, true) +
      `<text x="${xOf(i).toFixed(1)}" y="${(base - h - 7).toFixed(1)}" text-anchor="middle" class="mrq-val">${m.memoN}</text>`;
  }).join('');
  const prMax = Math.max(1, ...months.map(m => m.practice));
  const segs = [{ k: 'gamesN', c: C_GAMES, l: t('mrq_s_games_n') }, { k: 'hwN', c: C_HW, l: t('mrq_s_hw_n') }, { k: 'dualN', c: C_DUAL, l: t('mrq_s_dual_n') }];
  const prBars = months.map((m, i) => {
    let y = base; let out = '';
    const parts = segs.map(s => ({ ...s, v: s.k === 'dualN' ? m.duals.n : m[s.k] })).filter(s => s.v > 0);
    parts.forEach((s, j) => {
      const h = s.v / prMax * plotH;
      const gap = j ? 2 : 0;
      out += rr(xOf(i) - bw / 2, y - h + gap, bw, Math.max(0, h - gap), s.c, `${m.name} · ${s.l}: ${s.v}`, j === parts.length - 1);
      y -= h;
    });
    return out + `<text x="${xOf(i).toFixed(1)}" y="${(y - 7).toFixed(1)}" text-anchor="middle" class="mrq-val${m.practice ? '' : ' mute'}">${m.practice}</text>`;
  }).join('');
  const linkText = (() => {
    const both = months.filter(m => m.memoN != null && m.active);
    if (both.length < 2) return t('mrq_link_need');
    const peak = (get) => { const mx = Math.max(...both.map(get)); const top = both.filter(m => get(m) === mx); return top.length === 1 && mx > 0 ? top[0] : null; };
    const pM = peak(m => m.memoN), pP = peak(m => m.practice);
    if (pM && pP) return pM === pP ? fmt(t('mrq_in_link_same'), { m: pM.name }) : fmt(t('mrq_in_link_diff'), { mm: pM.name, mp: pP.name });
    return t('mrq_link_flat');
  })();
  const jr = journey ? `<div class="mrq-journey">
      <span class="mrq-j-lbl">${esc(t('mrq_journey_lbl'))}</span>
      <span class="mrq-j-pos">${esc(journey.from)}</span>
      ${months.map((m, i) => journey.stations[i] ? `<span class="mrq-j-arr">${fwd()}</span><span class="mrq-j-st"><small>${esc(m.short)}</small>${esc(journey.stations[i])}</span>` : '').join('')}
    </div>` : '';
  return `<div class="pdf-block mrq-sec" id="mrq-link">
    <div class="section-title">${esc(t('mrq_link_title'))}</div>
    <div class="section-sub">${esc(t('mrq_link_sub'))}</div>
    <div class="mrq-pair">
      <div class="mrq-chart-card"><div class="mrq-ch-t">${esc(t('mrq_ch_memo'))}</div>
        <svg viewBox="0 0 ${W} ${H}" class="mrq-svg" role="img" aria-label="${esc(t('mrq_ch_memo'))}">${axis}${memoBars}${xl}</svg></div>
      <div class="mrq-chart-card"><div class="mrq-ch-t">${esc(t('mrq_ch_practice'))}</div>
        <svg viewBox="0 0 ${W} ${H}" class="mrq-svg" role="img" aria-label="${esc(t('mrq_ch_practice'))}">${axis}${prBars}${xl}</svg>
        <div class="mrq-legend sm">${segs.map(s => `<span><i style="background:${s.c}"></i>${esc(s.l)}</span>`).join('')}</div></div>
    </div>
    <div class="mrq-link-note"><b>${esc(t('mrq_link_note_lbl'))}</b> ${esc(linkText)}</div>
    ${jr}
  </div>`;
}

function renderInsights(q) {
  const ic = { up: '▲', down: '▼', same: '=', info: '•' };
  const list = q.insights.length ? q.insights : [{ tone: 'info', text: t('mrq_in_none') }];
  return `<div class="pdf-block mrq-sec" id="mrq-insights">
    <div class="section-title">${esc(t('mrq_ins_title'))}</div>
    <div class="mrq-ins">
      <ol class="mrq-ins-list">${list.map(x => `<li class="${x.tone}"><span class="mrq-ins-ic">${ic[x.tone] || '•'}</span><span>${esc(x.text)}</span></li>`).join('')}</ol>
      <div class="mrq-tips"><div class="mrq-tips-h">${esc(t('mrq_tips_title'))}</div>
        <ul>${q.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    </div>
  </div>`;
}

export function renderQuarterHtml(q) {
  if (!q || !q.hasAnyData) {
    return `<div class="pdf-block mrq-sec mrq-first" id="mrq-overview">
      <div class="section-title">${esc(t('mrq_title'))}</div>
      <div class="mrq-empty">${esc(t('mrq_empty'))}</div></div>`;
  }
  return renderOverview(q) + renderLevel(q) + renderMatrix(q) + renderLink(q) + renderInsights(q);
}

// -----------------------------------------------------------------------------
// 5) الرسالة التلقائية لولي الأمر + سطر المصادر (للوضع الفصلي)
// -----------------------------------------------------------------------------
export function buildQuarterNote(q, name) {
  if (!q || !q.hasAnyData) return fmt(t('mrq_note_empty'), { name });
  const { tot, months } = q;
  const parts = [fmt(t('mrq_note_open'), { name, a: months[0].name, b: months[months.length - 1].name })];
  if (tot.memo) parts.push(fmt(t('mrq_note_memo'), { n: tot.memo }));
  if (tot.gamesN) parts.push(fmt(t('mrq_note_games'), { n: tot.gamesN, avg: tot.gamesAvg }));
  if (tot.hwN) parts.push(fmt(t('mrq_note_hw'), { n: tot.hwN, avg: tot.hwAvg }));
  if (tot.dualN) parts.push(fmt(t('mrq_note_dual'), { n: tot.dualN, w: tot.dualW }));
  parts.push(t('mrq_note_v_' + q.verdict));
  parts.push(t('mrq_note_close'));
  return parts.join(' ');
}

export function quarterSourcesHtml(q) {
  if (!q) return '';
  const p = [];
  if (q.tot.gamesN) p.push(t('mr_src_games').replace('{n}', q.tot.gamesN));
  if (q.tot.hwN) p.push(t('mr_src_hw').replace('{n}', q.tot.hwN));
  if (q.tot.dualN) p.push(fmt(t('mrq_src_dual'), { n: q.tot.dualN }));
  const memoMonths = q.months.filter(m => m.memoN != null).length;
  if (memoMonths) p.push(fmt(t('mrq_src_memo'), { n: memoMonths }));
  if (q.hwCloud === 'skipped') p.push(t('mrq_src_hw_local'));
  return p.length ? `<b>${t('mr_src_title')}</b> ${esc(p.join(' · '))}. ${t('mr_src_rule')}` : '';
}

// -----------------------------------------------------------------------------
// 5ب) ألوان SVG الهيرو في الوضع الفصلي: تُبدَّل كسمات (fill/stroke/stop-color) لا كـ CSS، لأن html2canvas يرسم
// SVG المضمَّن كصورة مستقلة بلا تنسيقات الصفحة — فتطابق الصورة/PDF المصدَّر ما يظهر على الشاشة. الأصل يُحفظ ويُعاد.
// -----------------------------------------------------------------------------
const HERO_SVG_MAP = { '#06231c': '#0a1631', '#0b3d30': '#12234d', '#164f40': '#1b2d5e', '#147c5e': '#2b4a94', '#d4af37': '#d0803a', '#f0d878': '#f2c27e' };
const SVG_ATTRS = ['fill', 'stroke', 'stop-color'];
export function applyQuarterSvgTheme(root, on) {
  if (!root) return;
  root.querySelectorAll('svg, svg *').forEach(el => {
    SVG_ATTRS.forEach(a => {
      const key = 'data-mrq-' + a;
      if (on) {
        const cur = (el.getAttribute(a) || '').toLowerCase();
        if (HERO_SVG_MAP[cur]) { el.setAttribute(key, el.getAttribute(a)); el.setAttribute(a, HERO_SVG_MAP[cur]); }
      } else if (el.hasAttribute(key)) {
        el.setAttribute(a, el.getAttribute(key)); el.removeAttribute(key);
      }
    });
  });
}

// -----------------------------------------------------------------------------
// 6) التنسيق — محصور تحت .page.mr2 #mrq-root، ألوان ثابتة (html2canvas)
// -----------------------------------------------------------------------------
export const QUARTER_STYLES = `
  /* مبدّل وضع التقرير (شهري / ٣ أشهر) — شريط الأدوات فقط، لا يُصدَّر */
  #report-screen .mr-view-toggle{display:inline-flex; background:#3a352a; border:1px solid #6a634f; border-radius:12px; padding:3px; gap:3px;}
  #report-screen .mr-view-btn{font-family:'Cairo',sans-serif; font-size:12.5px; font-weight:800; border:0; background:transparent; color:#c2b393; border-radius:9px; padding:7px 14px; cursor:pointer; margin:0; min-width:0; box-shadow:none;}
  #report-screen .mr-view-btn.active{background:#d4af37; color:#2b2620;}
  #report-screen .mr-view-btn:focus-visible{outline:2px solid #d4af37; outline-offset:2px;}

  /* إخفاء أقسام الشهر في الوضع الفصلي (والعكس) — يبقى الهيرو والرسالة والتوقيع والمصادر والتذييل */
  #report-screen .page.mr2.mrq-on > .pdf-block:not(.mr2-hero):not(.note-box):not(.closing):not(.mr2-sources):not(.mr2-footer){display:none !important;}
  #report-screen .page.mr2.mrq-on > .mrx-wrap{display:none !important;}
  #report-screen .page.mr2:not(.mrq-on) > #mrq-root{display:none !important;}
  #report-screen .page.mr2 > #mrq-root > .pdf-block{margin:0 48px 22px;}
  #report-screen .page.mr2 > #mrq-root > .mrq-first{margin-top:40px;}

  /* =====================================================================================
     🎨 هوية الوضع الفصلي على الصفحة كلها (.mrq-on): «ليل وأصيل» — كحلي ليلي + نحاسي/كهرماني + ورق أبيض مائل للزرقة،
     حتى يتميّز «حصاد 3 أشهر» عن التقرير الشهري (زمردي + ذهبي + ورق كريمي) من أول نظرة. ألوان SVG في الهيرو (القمر، الزخرفة،
     النجمة) تُبدَّل كسمات من JS (applyQuarterSvgTheme) لأن html2canvas يرسم SVG المضمَّن بلا تنسيقات الصفحة.
     ===================================================================================== */
  #report-screen .page.mr2.mrq-on{background-color:#fbfcff; color:#13203f;}
  #report-screen .page.mr2.mrq-on .mr2-hero{background:#0a1631; border-bottom-color:#d0803a;}
  #report-screen .page.mr2.mrq-on .mr2-hero-frame{border-color:rgba(208,128,58,.45);}
  #report-screen .page.mr2.mrq-on .mr2-brand-sub, #report-screen .page.mr2.mrq-on .mr2-eyebrow{color:#e9a866;}
  #report-screen .page.mr2.mrq-on .mr2-eyebrow::before{background:#d0803a;}
  #report-screen .page.mr2.mrq-on .mr2-period-month, #report-screen .page.mr2.mrq-on .mr2-verse,
  #report-screen .page.mr2.mrq-on .mr2-fig-num, #report-screen .page.mr2.mrq-on .mr2-scope{color:#f2c27e;}
  #report-screen .page.mr2.mrq-on .mr2-period-hijri, #report-screen .page.mr2.mrq-on .mr2-grade{color:#b9c4e0;}
  #report-screen .page.mr2.mrq-on .mr2-scope{border-color:rgba(208,128,58,.65);}
  #report-screen .page.mr2.mrq-on .mr2-avatar{background:#d0803a;}
  #report-screen .page.mr2.mrq-on .mr2-avatar-inner{background:#12234d; color:#f2c27e;}
  #report-screen .page.mr2.mrq-on .mr2-fig-sep{background:rgba(208,128,58,.6);}
  #report-screen .page.mr2.mrq-on .section-title{color:#12234d;}
  #report-screen .page.mr2.mrq-on .section-title::before{background:#d0803a;}
  #report-screen .page.mr2.mrq-on .section-title::after{background:#d9deea;}
  #report-screen .page.mr2.mrq-on .section-sub{color:#4b5878;}
  #report-screen .page.mr2.mrq-on .note-box{background:#12234d;}
  #report-screen .page.mr2.mrq-on .note-box::after{color:#d0803a;}
  #report-screen .page.mr2.mrq-on .note-label{color:#f2c27e;}
  #report-screen .page.mr2.mrq-on .note-text{color:#eef1f8;}
  #report-screen .page.mr2.mrq-on .closing{border-top-color:#d9deea;}
  #report-screen .page.mr2.mrq-on .sig-name{color:#12234d;}
  #report-screen .page.mr2.mrq-on .teacher-line{border-bottom-color:#4b5878;}
  #report-screen .page.mr2.mrq-on .teacher-label{color:#4b5878;}
  #report-screen .page.mr2.mrq-on .mr2-sources{background:#f1f4fa; border-color:#dfe3ee; color:#4b5878;}
  #report-screen .page.mr2.mrq-on .mr2-sources b{color:#12234d;}
  #report-screen .page.mr2.mrq-on .mr2-footer{background:#0a1631; border-top-color:#d0803a;}
  #report-screen .page.mr2.mrq-on .mr2-footer-bless{color:#f2c27e;}
  #report-screen .page.mr2.mrq-on .mr2-footer-meta{color:#b9c4e0;}
  #report-screen .page.mr2.mrq-on .mr2-footer-meta b{color:#eef1f8;}

  #report-screen .page.mr2 .mrq-empty{background:#f1f4fa; border:1px dashed #cfd6e6; border-radius:14px; padding:22px; text-align:center; color:#4b5878; font-weight:600; margin-top:12px; line-height:1.9;}

  /* شارة المسار */
  #report-screen .page.mr2 .mrq-verdict{display:flex; align-items:center; gap:16px; margin:14px 0 14px; background:#12234d; border:1px solid #d0803a; border-radius:18px; padding:14px 18px; color:#eef1f8; position:relative; overflow:hidden;}
  #report-screen .page.mr2 .mrq-verdict::after{content:''; position:absolute; top:-40px; bottom:-40px; width:160px; background:#2b4a94; opacity:.35; transform:skewX(-18deg); right:-60px;}
  #report-screen .page.mr2[dir="ltr"] .mrq-verdict::after{right:auto; left:-60px;}
  #report-screen .page.mr2 .mrq-vbadge{flex:none; width:58px; height:58px; border-radius:50%; border:2px solid #d0803a; background:#0a1631; display:flex; align-items:center; justify-content:center; position:relative; z-index:1;}
  #report-screen .page.mr2 .mrq-vbadge span{font-size:24px; color:#f2c27e; line-height:1;}
  #report-screen .page.mr2 .v-support .mrq-vbadge span{color:#f3b49b;}
  #report-screen .page.mr2 .mrq-vtext{flex:1; min-width:0; position:relative; z-index:1;}
  #report-screen .page.mr2 .mrq-vtext small{display:block; font-size:11.5px; color:#a9b6d6; font-weight:600;}
  #report-screen .page.mr2 .mrq-vtext b{display:block; font-family:'Reem Kufi','Amiri',serif; font-size:22px; color:#f2c27e; font-weight:600; line-height:1.35;}
  #report-screen .page.mr2 .mrq-vtext p{margin:2px 0 0; font-size:12.5px; color:#e8ecf6; line-height:1.7;}
  #report-screen .page.mr2 .mrq-vmonths{display:flex; gap:6px; position:relative; z-index:1; flex:none;}
  #report-screen .page.mr2 .mrq-vmonths span{display:flex; flex-direction:column; align-items:center; gap:4px; font-size:11px; color:#a9b6d6; font-weight:600; min-width:40px;}
  #report-screen .page.mr2 .mrq-vmonths i{width:14px; height:14px; border-radius:50%; border:2px solid #6c7aa3; display:block; box-sizing:border-box;}
  #report-screen .page.mr2 .mrq-vmonths .on{color:#eef1f8;}
  #report-screen .page.mr2 .mrq-vmonths .on i{background:#f2c27e; border-color:#f2c27e;}

  /* البطاقات الأربع */
  #report-screen .page.mr2 .mrq-kpis{display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px;}
  #report-screen .page.mr2 .mrq-kpi{background:#ffffff; border:1px solid #d9deea; border-radius:16px; padding:11px 12px 10px; display:flex; flex-direction:column; gap:3px; min-width:0; box-shadow:0 2px 0 #e4e8f1;}
  #report-screen .page.mr2 .mrq-kpi-h{display:flex; align-items:center; gap:6px;}
  #report-screen .page.mr2 .mrq-kpi-h b{font-size:12.5px; color:#13203f; font-weight:700; flex:1; min-width:0; line-height:1.35;}
  #report-screen .page.mr2 .mrq-kpi-ic{flex:none; width:28px; height:28px; border-radius:9px; background:#12234d; display:flex; align-items:center; justify-content:center;}
  #report-screen .page.mr2 .mrq-kpi-v{display:flex; align-items:baseline; gap:6px; margin-top:4px;}
  #report-screen .page.mr2 .mrq-n{font-family:'Reem Kufi','Amiri',serif; font-size:34px; color:#12234d; line-height:1; font-weight:600;}
  #report-screen .page.mr2 .mrq-u{font-size:12px; color:#4b5878; font-weight:600;}
  #report-screen .page.mr2 .mrq-kpi-s{font-size:11.5px; color:#4b5878; font-weight:600; min-height:18px;}
  #report-screen .page.mr2 .mrq-kpi-s em{font-style:normal; font-size:10.5px; color:#7d86a3; background:#eef1f8; border-radius:99px; padding:0 6px;}
  #report-screen .page.mr2 .mrq-mini{display:grid; grid-template-columns:repeat(3,1fr); gap:6px; align-items:end; height:84px; border-top:1px dashed #dfe3ee; padding-top:6px; margin-top:4px;}
  #report-screen .page.mr2 .mrq-mini-c{display:flex; flex-direction:column; align-items:center; justify-content:flex-end; gap:2px; height:100%;}
  #report-screen .page.mr2 .mrq-mini-c b{font-size:11px; color:#13203f; font-weight:700;}
  #report-screen .page.mr2 .mrq-mini-c i{display:block; width:70%; max-width:26px; border-radius:4px 4px 0 0;}
  #report-screen .page.mr2 .mrq-mini-c span{font-size:10px; color:#6a7390; font-weight:600; white-space:nowrap;}
  #report-screen .page.mr2 .mrq-dc{flex:none; font-size:11px; font-weight:800; border-radius:99px; padding:1px 8px; white-space:nowrap;}
  #report-screen .page.mr2 .mrq-dc.up{background:#e5f4ec; color:#1f7a55;}
  #report-screen .page.mr2 .mrq-dc.down{background:#fbe7e3; color:#a63a2a;}
  #report-screen .page.mr2 .mrq-dc.same{background:#f1efe8; color:#6b6b63;}
  #report-screen .page.mr2 .mrq-dc.na{background:transparent; color:#b0b6c9;}

  /* بطاقات الرسوم */
  #report-screen .page.mr2 .mrq-chart-card{background:#ffffff; border:1px solid #d9deea; border-radius:16px; padding:10px 12px 10px; margin-top:12px; min-width:0;}
  /* direction:ltr: إحداثيات SVG فيزيائية (text-anchor start = يسار) في الاتجاهين؛ النص العربي داخلها يُشكَّل كما هو */
  #report-screen .page.mr2 .mrq-svg{display:block; width:100%; height:auto; direction:ltr;}
  #report-screen .page.mr2 .mrq-ax{font-family:'Cairo',sans-serif; font-size:11px; font-weight:600; fill:#7d86a3;}
  #report-screen .page.mr2 .mrq-band-t{font-family:'Cairo',sans-serif; font-size:10.5px; font-weight:700; fill:#8e96b0;}
  #report-screen .page.mr2 .mrq-val{font-family:'Cairo',sans-serif; font-size:12px; font-weight:800; fill:#13203f;}
  #report-screen .page.mr2 .mrq-val.mute{fill:#b0b6c9;}
  #report-screen .page.mr2 .mrq-xl{font-family:'Cairo',sans-serif; font-size:12px; font-weight:700; fill:#4b5878;}
  #report-screen .page.mr2 .mrq-legend{display:flex; flex-wrap:wrap; gap:6px 16px; font-size:12px; font-weight:600; color:#13203f; margin-bottom:4px;}
  #report-screen .page.mr2 .mrq-legend.sm{font-size:11px; gap:4px 12px; margin:4px 0 0; justify-content:center;}
  #report-screen .page.mr2 .mrq-legend span{display:inline-flex; align-items:center; gap:6px;}
  #report-screen .page.mr2 .mrq-legend i{display:inline-block; width:12px; height:12px; border-radius:3px;}
  #report-screen .page.mr2 .mrq-legend .hollow i{border-radius:50%; border:2.5px solid #7d86a3; background:#ffffff; box-sizing:border-box;}
  #report-screen .page.mr2 .mrq-lvrow{display:grid; grid-template-columns:repeat(3,1fr); gap:8px; border-top:1px dashed #dfe3ee; padding-top:8px; margin-top:4px;}
  #report-screen .page.mr2 .mrq-lv{text-align:center; background:#f1f4fa; border-radius:12px; padding:6px 4px;}
  #report-screen .page.mr2 .mrq-lv span{display:block; font-size:11px; color:#4b5878; font-weight:600;}
  #report-screen .page.mr2 .mrq-lv b{display:block; font-family:'Reem Kufi','Amiri',serif; font-size:22px; color:#12234d; font-weight:600; line-height:1.2;}
  #report-screen .page.mr2 .mrq-lv small{font-size:10.5px; color:#a65f22; font-weight:700;}
  #report-screen .page.mr2 .mrq-lv.na b{color:#b0b6c9;}

  /* مصفوفة المقارنة */
  #report-screen .page.mr2 .mrq-table{width:100%; border-collapse:separate; border-spacing:0; margin-top:12px; background:#ffffff; border:1px solid #d9deea; border-radius:14px; overflow:hidden;}
  #report-screen .page.mr2 .mrq-table thead th{background:#12234d; color:#eef1f8; font-size:12.5px; font-weight:700; padding:9px 8px; text-align:center; border:0;}
  #report-screen .page.mr2 .mrq-table thead th small{display:block; font-size:10px; color:#a9b6d6; font-weight:600;}
  #report-screen .page.mr2 .mrq-table thead th:first-child{text-align:start; padding-inline-start:14px;}
  #report-screen .page.mr2 .mrq-table tbody th{text-align:start; font-size:12.5px; color:#13203f; font-weight:600; padding:8px 14px; border-top:1px solid #e8ebf3; background:#fbfcff; white-space:nowrap;}
  #report-screen .page.mr2 .mrq-table tbody td{text-align:center; font-family:'Reem Kufi','Cairo',sans-serif; font-size:16px; color:#13203f; font-weight:600; padding:7px 6px; border-top:1px solid #e8ebf3; border-inline-start:1px solid #eef0f6; position:relative;}
  #report-screen .page.mr2 .mrq-table tbody td.hi{color:#12234d;}
  #report-screen .page.mr2 .mrq-table tbody td.na{color:#b0b6c9;}
  #report-screen .page.mr2 .mrq-table tbody td.chg{background:#fbfcff; font-family:'IBM Plex Sans Arabic','Cairo',sans-serif;}
  #report-screen .page.mr2 .mrq-table tbody td sup{font-size:10px; color:#a65f22;}
  #report-screen .page.mr2 .mrq-table tr.strong th, #report-screen .page.mr2 .mrq-table tr.strong td{border-top:2px solid #d0803a; font-weight:700;}
  #report-screen .page.mr2 .mrq-star{position:absolute; top:3px; inset-inline-end:5px; font-size:11px; color:#c8742f;}
  #report-screen .page.mr2 .mrq-foot{font-size:11px; color:#6a7390; margin-top:6px; line-height:1.7;}

  /* الحفظ والتدريب */
  #report-screen .page.mr2 .mrq-pair{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
  #report-screen .page.mr2 .mrq-ch-t{font-size:12.5px; font-weight:700; color:#13203f; margin-bottom:2px;}
  #report-screen .page.mr2 .mrq-link-note{margin-top:10px; background:#eef2fa; border-inline-start:4px solid #2b4a94; border-radius:10px; padding:9px 12px; font-size:12.5px; color:#13203f; line-height:1.8;}
  #report-screen .page.mr2 .mrq-link-note b{color:#12234d;}
  #report-screen .page.mr2 .mrq-journey{display:flex; flex-wrap:wrap; align-items:center; gap:6px 8px; margin-top:10px; border:1px dashed #d0803a; border-radius:12px; padding:9px 12px; background:#fbfcff;}
  #report-screen .page.mr2 .mrq-j-lbl{font-size:11.5px; color:#4b5878; font-weight:700;}
  #report-screen .page.mr2 .mrq-j-pos, #report-screen .page.mr2 .mrq-j-st{font-family:'Amiri',serif; font-size:15px; font-weight:700; color:#1c3470;}
  #report-screen .page.mr2 .mrq-j-st small{font-family:'IBM Plex Sans Arabic','Cairo',sans-serif; font-size:10px; color:#7d86a3; font-weight:600; margin-inline-end:4px;}
  #report-screen .page.mr2 .mrq-j-arr{color:#d0803a; font-weight:800;}

  /* قراءة في الأداء */
  #report-screen .page.mr2 .mrq-ins{display:grid; grid-template-columns:1.45fr 1fr; gap:12px; margin-top:12px;}
  #report-screen .page.mr2 .mrq-ins-list{list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:7px;}
  #report-screen .page.mr2 .mrq-ins-list li{display:flex; align-items:flex-start; gap:10px; background:#ffffff; border:1px solid #d9deea; border-radius:12px; padding:8px 12px; font-size:12.5px; color:#13203f; line-height:1.75; font-weight:500;}
  #report-screen .page.mr2 .mrq-ins-ic{flex:none; width:22px; height:22px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; margin-top:2px; background:#f1efe8; color:#6b6b63;}
  #report-screen .page.mr2 .mrq-ins-list li.up .mrq-ins-ic{background:#e5f4ec; color:#1f7a55;}
  #report-screen .page.mr2 .mrq-ins-list li.down .mrq-ins-ic{background:#fbe7e3; color:#a63a2a;}
  #report-screen .page.mr2 .mrq-ins-list li.info .mrq-ins-ic{background:#fbeedd; color:#a65f22;}
  #report-screen .page.mr2 .mrq-tips{background:#12234d; border:1px solid #d0803a; border-radius:16px; padding:12px 14px; color:#eef1f8;}
  #report-screen .page.mr2 .mrq-tips-h{font-family:'Reem Kufi','Amiri',serif; font-size:17px; color:#f2c27e; font-weight:600; margin-bottom:6px;}
  #report-screen .page.mr2 .mrq-tips ul{margin:0; padding-inline-start:18px; display:flex; flex-direction:column; gap:6px;}
  #report-screen .page.mr2 .mrq-tips li{font-size:12.5px; line-height:1.75; color:#e8ecf6;}
  #report-screen .page.mr2 .mrq-tips li::marker{color:#d0803a;}

  @media (max-width:760px){
    #report-screen .page.mr2 > #mrq-root > .pdf-block{margin:0 16px 16px;}
    #report-screen .page.mr2 .mrq-kpis{grid-template-columns:repeat(2,minmax(0,1fr));}
    #report-screen .page.mr2 .mrq-pair, #report-screen .page.mr2 .mrq-ins{grid-template-columns:1fr;}
    #report-screen .page.mr2 .mrq-verdict{flex-wrap:wrap;}
  }
`;
