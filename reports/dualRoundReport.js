// =============================================================================
// reports/dualRoundReport.js
// تقرير «جولة واحدة» من الاختبارات الثنائية — يظهر في نهاية كل جولة (شاشة نتيجة الجولة) بزرّين:
//   • واتساب: صورة 720×900 (تُلتقط ×1.5) بأسئلة ولي الأمر — نفس فكرة صورة التقرير الفردي
//     (reports/parentQaCard.js) لكن بتصميم «مواجهة» مختلف (كحلي + لونا الطالبين) حتى يميّزه ولي الأمر.
//   • PDF: صفحات A4 فيها بيانات الطالبين، الدرجة ومستوى الإتقان، وكل سؤال ظهر لكل طالب برقمه
//     كما اختاره من اللوحة (q.number — أو رمز البديل) ونصّه ودرجته وأخطاؤه.
// المصدر: match.rounds[i] (questionsLog وroundStarter وplayedAt) + test.rounds[i] (بنك الأسئلة).
// الألوان ثابتة عمدًا (ملف يُصدَّر فاتحًا دائمًا — مجلد reports/ مستثنى من فحص الداكن).
// النص القرآني (من/إلى) داخل عناصر تحمل class="quran-text" بنفسها (قاعدة الخط القرآني).
// =============================================================================
import { AppState, t, surahNameLocal } from '../core/app.js';
import { QUESTION_POINTS, MISTAKE_DEDUCTION } from '../engine/dualTestEngine.js';

const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tr = (key, p) => { let s = t(key); Object.keys(p || {}).forEach(k => { s = s.split('{' + k + '}').join(String(p[k])); }); return s; };
const r2 = n => Math.round((n || 0) * 100) / 100;
const isEn = () => AppState.currentLang === 'en';
const tierKey = p => p >= 90 ? 'qa_tier_ex' : p >= 75 ? 'qa_tier_vg' : p >= 60 ? 'qa_tier_g' : p >= 40 ? 'qa_tier_av' : 'qa_tier_low';

function surahLabel(num) {
  const s = num && (AppState.surahsData || []).find(x => x.number === num);
  return s ? surahNameLocal(s.name) : '';
}
export function dualRoundRangeLabel(testRound) {
  const a = surahLabel(testRound && testRound.rangeFrom && testRound.rangeFrom.surah);
  const b = surahLabel(testRound && testRound.rangeTo && testRound.rangeTo.surah);
  if (!a && !b) return t('dts_range_not_set');
  if (a && b && a === b) return a;
  return `${a || '—'} ${isEn() ? '→' : '←'} ${b || '—'}`;
}
export function formatRoundDate(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (isNaN(d)) return '';
  try { return d.toLocaleDateString(isEn() ? 'en-GB' : 'ar-u-nu-latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }); }
  catch (e) { return d.toISOString().slice(0, 10); }
}

async function avatarOf(studentId) {
  try {
    const all = AppState.studentManager ? await AppState.studentManager.getAllStudents() : [];
    const s = all.find(x => String(x.id) === String(studentId));
    if (s && s.avatar) return s.avatar;
  } catch (e) { /* تجاهل */ }
  try { return localStorage.getItem('darham_avatar_' + studentId) || null; } catch (e) { return null; }
}
const avHtml = (name, v) => v ? (v.length < 10 ? `<span class="emo">${E(v)}</span>` : `<img src="${v}" alt="">`) : `<span>${E(String(name || '؟').trim().charAt(0))}</span>`;

function teacher() {
  const tc = AppState.currentTeacher || {};
  let n = '', s = '';
  try { n = localStorage.getItem('darham_teacher_name') || ''; s = localStorage.getItem('darham_teacher_signature') || ''; } catch (e) { /* تجاهل */ }
  return { name: tc.name || AppState.teacherName || n || '', stamp: tc.stamp || s || '' };
}

// ---------- البيانات ----------
async function buildData(match, test, idx) {
  const r = match.rounds[idx] || {};
  const tRound = (test.rounds || [])[idx] || {};
  const qOf = e => e.kind === 'swap'
    ? (tRound.swapQuestions || []).find(q => q.code === e.ref)
    : (tRound.mainQuestions || []).find(q => q.number === e.ref);
  const side = key => {
    const entries = (r.questionsLog || []).filter(e => e.student === key).map(e => Object.assign({}, e, { q: qOf(e) || null }));
    const score = r2(key === 'A' ? r.scoreA : r.scoreB);
    const max = entries.length * QUESTION_POINTS;
    const pct = max ? Math.round(score / max * 100) : 0;
    const mistakes = entries.reduce((s, e) => s + (e.mistakes || 0), 0);
    return {
      key, name: key === 'A' ? match.studentNameA : match.studentNameB,
      id: key === 'A' ? match.studentIdA : match.studentIdB,
      entries, score, max, pct, mistakes, deduction: r2(mistakes * MISTAKE_DEDUCTION),
      clean: entries.filter(e => !e.mistakes).length,
      helper: !!(key === 'A' ? r.helperUsedA : r.helperUsedB),
      swap: !!(key === 'A' ? r.swapUsedA : r.swapUsedB),
      swapCode: key === 'A' ? r.swapCodeA : r.swapCodeB
    };
  };
  const A = side('A'), B = side('B');
  // «هل تحسّن عن الجولة السابقة؟» (من الجولة 2): مستوى الإتقان = درجاته ÷ (عدد أسئلته × 10)
  const prev = idx > 0 ? match.rounds[idx - 1] : null;
  if (prev) [A, B].forEach(sd => {
    const n = (prev.questionsLog || []).filter(e => e.student === sd.key).length;
    const sc = sd.key === 'A' ? prev.scoreA : prev.scoreB;
    sd.prevPct = n ? Math.round((sc || 0) / (n * QUESTION_POINTS) * 100) : null;
  });
  [A.avatar, B.avatar] = await Promise.all([avatarOf(A.id), avatarOf(B.id)]);
  const done = match.rounds.slice(0, idx + 1);
  const series = { a: done.filter(x => x.roundWinner === 'A').length, b: done.filter(x => x.roundWinner === 'B').length };
  const next = idx < 2 ? (test.rounds || [])[idx + 1] : null;
  return {
    idx, n: idx + 1, A, B, winner: r.roundWinner, series, hasPrev: !!prev,
    starter: r.roundStarter ? (r.roundStarter === 'A' ? A.name : B.name) : '',
    date: formatRoundDate(r.playedAt || match.pausedAt),
    range: dualRoundRangeLabel(tRound),
    nextRange: next ? dualRoundRangeLabel(next) : '',
    teacher: teacher()
  };
}

const refOf = q => (q && q.meta && q.meta.surah) ? `${surahLabel(q.meta.surah)} ${q.meta.fromAyah}–${q.meta.toAyah}` : '';
const noOf = e => e.kind === 'swap' ? tr('drr_swap_no', { c: e.ref }) : String(e.ref);

// «أين تعثّر؟»: مواضع الأسئلة التي وقع فيها خطأ (السورة والآيات، وإلا رقم السؤال) مع عدد الأخطاء
function stumbleTxt(s) {
  if (!s.entries.length) return t('drr_no_answers');
  const bad = s.entries.filter(e => e.mistakes > 0).sort((a, b) => b.mistakes - a.mistakes);
  if (!bad.length) return t('drr_no_stumble');
  return bad.slice(0, 3).map(e => tr('drr_stumble_item', { p: refOf(e.q) || tr('drr_q_no', { n: noOf(e) }), n: e.mistakes })).join(isEn() ? ', ' : '، ');
}
function improveTxt(s) {
  if (s.prevPct == null || !s.entries.length) return t('drr_improve_na');
  const dlt = s.pct - s.prevPct, p = { a: s.prevPct, b: s.pct, d: Math.abs(dlt) };
  return tr(dlt > 0 ? 'drr_improve_up' : dlt < 0 ? 'drr_improve_down' : 'drr_improve_same', p);
}

function homeTasks(d) {
  const tasks = [];
  if (d.n < 3) tasks.push(tr('drr_task_next_range', { n: d.n + 1, r: d.nextRange || d.range }));
  [d.A, d.B].forEach(s => {
    const bad = s.entries.filter(e => e.mistakes > 0);
    if (!s.entries.length) return;
    if (!bad.length) { tasks.push(tr('drr_task_clean', { name: s.name })); return; }
    const list = [...new Set(bad.map(e => refOf(e.q) || ('#' + noOf(e))))].slice(0, 3).join(isEn() ? ', ' : '، ');
    tasks.push(tr('drr_task_fix', { name: s.name, list }));
  });
  tasks.push(t('drr_task_daily'));
  return tasks;
}

// html2canvas يرسم نقاط القوائم في الجهة الخاطئة مع RTL — فنكتب النقطة بأنفسنا
const tasksHtml = d => `<div class="tasks">${homeTasks(d).map(x => `<div class="li"><span>✔</span><span>${E(x)}</span></div>`).join('')}</div>`;

// ---------- الأنماط ----------
const CSS = `
.drr{font-family:'IBM Plex Sans Arabic',sans-serif;color:#1d2340;--ink:#1d2340;--sub:#5d6486;--nv:#1f2a5c;--nv2:#3b3f8f;--a:#0f8b8d;--b:#e0662f;--gd:#e6b422;box-sizing:border-box}
.drr *{box-sizing:border-box}
.drr .ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
.drr .hd{background:linear-gradient(120deg,var(--nv),var(--nv2));color:#fff;border-radius:18px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:12px}
.drr .hd .br{display:flex;align-items:center;gap:10px}.drr .hd img{width:42px}
.drr .hd small{display:block;font-size:12px;opacity:.8}.drr .hd b{display:block;font-family:'Amiri',serif;font-size:25px;line-height:1.3}
.drr .hd .rd{text-align:end;font-size:12px;opacity:.9;line-height:1.6}.drr .hd .rd b{font-family:inherit;font-size:16px;color:var(--gd)}
.drr .strip{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
.drr .chip{background:#eef0fb;border:1px solid #cfd3ef;border-radius:999px;padding:3px 12px;font-size:12.5px;color:var(--sub)}.drr .chip b{color:var(--ink)}
.drr .vs{display:grid;grid-template-columns:1fr 46px 1fr;gap:8px;align-items:stretch}
.drr .vsx{display:flex;align-items:center;justify-content:center;font-weight:800;font-size:20px;color:var(--nv2)}
.drr .pl{border-radius:16px;padding:10px 12px;border:2px solid var(--c);background:var(--bg);display:flex;gap:10px;align-items:center;position:relative}
.drr .pl.a{--c:var(--a);--bg:#e3f4f4}.drr .pl.b{--c:var(--b);--bg:#fcebe2}
.drr .pl.win{box-shadow:0 0 0 3px var(--gd)}
.drr .pl .crown{position:absolute;top:-13px;inset-inline-end:12px;background:var(--gd);color:#3a2a00;border-radius:999px;font-size:11px;font-weight:800;padding:1px 10px}
.drr .av{flex:none;width:58px;height:58px;border-radius:50%;border:3px solid var(--c);background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:center;font-family:'Amiri',serif;font-size:28px;font-weight:700;color:var(--c)}
.drr .av img{width:100%;height:100%;object-fit:cover}.drr .av .emo{font-family:sans-serif;font-size:30px}
.drr .pl .nm{font-family:'Amiri',serif;font-size:22px;font-weight:700;line-height:1.2}
.drr .pl .sc{font-size:22px;font-weight:800;color:var(--c)}.drr .pl .sc small{font-size:12px;color:var(--sub);font-weight:600}
.drr .pl .tier{display:inline-block;background:var(--c);color:#fff;border-radius:999px;padding:0 10px;font-size:12px;font-weight:700;margin-inline-start:4px}
.drr .bar{height:7px;border-radius:9px;background:rgba(0,0,0,.08);overflow:hidden;margin-top:4px}.drr .bar i{display:block;height:100%;background:var(--c)}
.drr .qs{display:grid;grid-template-columns:1fr 1fr;gap:8px}.drr-card .qs{flex:1}
.drr .bx{background:#fff;border:1.5px solid #d6d9ef;border-radius:14px;padding:9px 12px;display:flex;flex-direction:column;gap:5px}
.drr .bx.full{grid-column:1/-1}
.drr .bx .k{display:flex;gap:7px;align-items:center;font-weight:700;font-size:13.5px;color:var(--nv)}
.drr .bx .k em{font-style:normal;flex:none;width:24px;height:24px;border-radius:7px;background:var(--nv);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px}
.drr .ln{display:flex;gap:8px;align-items:baseline;font-size:13px}
.drr .ln .who{flex:none;min-width:70px;font-weight:800}.drr .ln .who.a{color:var(--a)}.drr .ln .who.b{color:var(--b)}
.drr .big{font-size:21px;font-weight:800;color:var(--nv)}
.drr .tasks{display:flex;flex-direction:column;gap:3px;font-size:13px;line-height:1.6}.drr .li{display:flex;gap:7px}.drr .li>span:first-child{color:var(--a);font-weight:800}
.drr .ft{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:2px dashed #cfd3ef;padding-top:8px;font-size:13px;color:var(--sub)}
.drr .ft b{color:var(--ink)}.drr .ft img{height:62px;max-width:150px;object-fit:contain}
.drr-card{width:720px;height:900px;background:#f4f5fc;overflow:hidden;position:relative}
.drr-card .pg{position:absolute;top:18px;left:22px;display:flex;flex-direction:column;gap:9px;transform-origin:top left}
.drr-pdf{width:794px;background:#fff;padding:26px 30px}
.drr-pdf .pdf-block{margin-bottom:12px}
.drr-pdf table{width:100%;border-collapse:collapse;font-size:13px}
.drr-pdf th{background:var(--c);color:#fff;padding:6px;font-weight:700}
.drr-pdf td{border-bottom:1px solid #e3e5f3;padding:6px;vertical-align:middle;text-align:center}
.drr-pdf td.tx{text-align:start}
.drr-pdf .qt{font-size:19px;line-height:1.9;color:#1d2340}
.drr-pdf .quran-text{border:0!important;background:none!important;padding:0!important;margin:0!important;box-shadow:none!important;display:inline!important}
.drr-pdf .no{display:inline-block;min-width:34px;padding:2px 8px;border-radius:9px;background:var(--bg);color:var(--c);font-weight:800;border:1.5px solid var(--c)}
.drr-pdf .sec{border-radius:14px;border:2px solid var(--c);overflow:hidden}.drr-pdf .sec.a{--c:var(--a);--bg:#e3f4f4}.drr-pdf .sec.b{--c:var(--b);--bg:#fcebe2}
.drr-pdf .sec h3{margin:0;padding:8px 12px;background:var(--bg);color:var(--c);font-size:16px}
.drr-pdf .tag{font-size:11px;border-radius:7px;padding:0 6px;background:#fff3cf;color:#7a5a00;margin-inline-start:4px}
.drr-pdf .ref{font-size:11px;color:var(--sub)}
`;

// ---------- أجزاء مشتركة ----------
function headHtml(d) {
  return `<div class="hd"><div class="br"><img src="assets/brand/ham-logo-light.svg" alt=""><div><small>${E(t('qa_brand_small'))}</small><b>${E(t('drr_title'))}</b></div></div>
    <div class="rd"><b>${E(tr('drr_round_of', { n: d.n }))}</b><br>${E(d.date)}</div></div>
  <div class="strip"><span class="chip">${E(t('drr_range'))}: <b>${E(d.range)}</b></span>${d.starter ? `<span class="chip">${E(t('drr_starter'))}: <b>${E(d.starter)}</b></span>` : ''}<span class="chip">${E(tr('drr_series', { a: d.A.name, b: d.B.name, x: d.series.a, y: d.series.b }))}</span></div>`;
}
function playerHtml(s, d) {
  const win = d.winner === s.key;
  return `<div class="pl ${s.key.toLowerCase()}${win ? ' win' : ''}">${win ? `<span class="crown">👑 ${E(t('drr_winner'))}</span>` : ''}
    <div class="av">${avHtml(s.name, s.avatar)}</div>
    <div style="flex:1;min-width:0"><div class="nm">${E(s.name)}</div>
      <div><span class="sc ltr">${s.score}<small> / ${s.max}</small></span><span class="tier">${E(t(tierKey(s.pct)))}</span></div>
      <div style="font-size:12px;color:#5d6486">${E(t('drr_mastery'))}: <b class="ltr">${s.pct}%</b></div>
      <div class="bar"><i style="width:${Math.max(3, s.pct)}%"></i></div></div></div>`;
}
const vsHtml = d => `<div class="vs">${playerHtml(d.A, d)}<div class="vsx">VS</div>${playerHtml(d.B, d)}</div>`;
function footHtml(d) {
  return `<div class="ft"><div>${E(t('qa_teacher'))}${d.teacher.name ? `: <b>${E(d.teacher.name)}</b>` : ''}</div>${d.teacher.stamp ? `<img src="${E(d.teacher.stamp)}" alt="">` : ''}</div>`;
}

// ---------- صورة واتساب ----------
function cardHtml(d) {
  const ln = (s, v) => `<div class="ln"><span class="who ${s.key.toLowerCase()}">${E(s.name)}</span><span>${v}</span></div>`;
  const helpTxt = s => [s.helper ? t('drr_help') : '', s.swap ? `${t('drr_swap')} (${E(s.swapCode || '')})` : ''].filter(Boolean).join(' · ') || E(t('drr_none'));
  const winTxt = d.winner === 'tie' ? t('drr_tie') : (d.winner === 'A' ? d.A.name : d.B.name);
  const box = (num, ask, body, cls) => `<div class="bx ${cls || ''}"><div class="k"><em>${num}</em>${E(ask)}</div>${body}</div>`;
  return `<div class="drr drr-card" dir="${isEn() ? 'ltr' : 'rtl'}"><div class="pg">
    ${headHtml(d)}${vsHtml(d)}
    <div class="qs">
      ${box(1, t('drr_q1'), ln(d.A, E(tr('drr_q1_val', { n: d.A.entries.length, f: d.A.clean }))) + ln(d.B, E(tr('drr_q1_val', { n: d.B.entries.length, f: d.B.clean }))))}
      ${box(2, t('drr_q2'), ln(d.A, helpTxt(d.A)) + ln(d.B, helpTxt(d.B)))}
      ${box(3, t('drr_q3'), ln(d.A, E(tr('drr_q3_val', { n: d.A.mistakes, d: d.A.deduction }))) + ln(d.B, E(tr('drr_q3_val', { n: d.B.mistakes, d: d.B.deduction }))))}
      ${box(4, t('drr_q4'), `<div class="big">${d.winner === 'tie' ? '🤝' : '🏆'} ${E(winTxt)}</div>${d.winner !== 'tie' ? `<div style="font-size:12.5px;color:#5d6486">${E(tr('drr_diff', { n: r2(Math.abs(d.A.score - d.B.score)) }))}</div>` : ''}`)}
      ${box(5, t('drr_q_stumble'), ln(d.A, E(stumbleTxt(d.A))) + ln(d.B, E(stumbleTxt(d.B))), d.hasPrev ? '' : 'full')}
      ${d.hasPrev ? box(6, t('drr_q_improve'), ln(d.A, E(improveTxt(d.A))) + ln(d.B, E(improveTxt(d.B)))) : ''}
      ${box(d.hasPrev ? 7 : 6, d.n < 3 ? tr('drr_q5_next', { n: d.n + 1 }) : t('drr_q5_last'), tasksHtml(d), 'full')}
    </div>
    ${footHtml(d)}
  </div></div>`;
}

// ---------- PDF ----------
function pdfHtml(d) {
  const sec = s => {
    const rows = s.entries.map(e => {
      const q = e.q;
      const txt = q ? `<span class="quran-text qt">${E(q.fromText)}</span> <b style="color:#5d6486">… ${E(t('dts_to_label'))} …</b> <span class="quran-text qt">${E(q.toText)}</span>` : E(t('dtr_question_unavailable'));
      const ref = refOf(q);
      return `<tr><td><span class="no ltr">${E(noOf(e))}</span></td>
        <td class="tx">${txt}${ref ? `<div class="ref">${E(ref)}</div>` : ''}${e.helperUsed ? `<span class="tag">${E(t('drr_help'))}</span>` : ''}</td>
        <td>${e.mistakes || 0}</td><td><b class="ltr">${r2(e.earnedPoints)} / ${QUESTION_POINTS}</b></td></tr>`;
    }).join('') || `<tr><td colspan="4">${E(tr('dtr_qcol_empty', { name: s.name }))}</td></tr>`;
    return `<div class="sec ${s.key.toLowerCase()} pdf-block"><h3>${E(tr('drr_pdf_questions_of', { name: s.name }))} — <span class="ltr">${s.score} / ${s.max}</span></h3>
      <table><thead><tr><th style="width:80px">${E(t('drr_col_no'))}</th><th>${E(t('drr_col_text'))}</th><th style="width:70px">${E(t('drr_col_mistakes'))}</th><th style="width:90px">${E(t('drr_col_points'))}</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };
  const ln2 = (s, v) => `<div class="ln"><span class="who ${s.key.toLowerCase()}">${E(s.name)}</span><span>${E(v)}</span></div>`;
  const stat = s => `<div class="ln"><span class="who ${s.key.toLowerCase()}">${E(s.name)}</span><span>${E(tr('drr_q1_val', { n: s.entries.length, f: s.clean }))} · ${E(tr('drr_q3_val', { n: s.mistakes, d: s.deduction }))}${s.helper ? ' · ' + E(t('drr_help')) : ''}${s.swap ? ' · ' + E(t('drr_swap')) : ''}</span></div>`;
  return `<div class="drr drr-pdf" dir="${isEn() ? 'ltr' : 'rtl'}">
    <div class="pdf-block" style="display:flex;flex-direction:column;gap:10px">${headHtml(d)}${vsHtml(d)}<div class="bx">${stat(d.A)}${stat(d.B)}</div>
      <div class="qs"><div class="bx${d.hasPrev ? '' : ' full'}"><div class="k"><em>📍</em>${E(t('drr_q_stumble'))}</div>${ln2(d.A, stumbleTxt(d.A))}${ln2(d.B, stumbleTxt(d.B))}</div>
      ${d.hasPrev ? `<div class="bx"><div class="k"><em>📈</em>${E(t('drr_q_improve'))}</div>${ln2(d.A, improveTxt(d.A))}${ln2(d.B, improveTxt(d.B))}</div>` : ''}</div></div>
    ${sec(d.A)}${sec(d.B)}
    <div class="bx pdf-block"><div class="k"><em>🏠</em>${E(d.n < 3 ? tr('drr_q5_next', { n: d.n + 1 }) : t('drr_q5_last'))}</div>${tasksHtml(d)}</div>
    <div class="pdf-block">${footHtml(d)}</div>
  </div>`;
}

// ---------- الالتقاط والمشاركة ----------
function loadScript(src) {
  return new Promise((res, rej) => {
    if (document.querySelector(`script[src="${src}"]`)) return res();
    const el = document.createElement('script'); el.src = src; el.onload = res; el.onerror = rej; document.head.appendChild(el);
  });
}
async function prepare() {
  if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  if (document.fonts && document.fonts.load) {
    try { await Promise.all(['700 25px Amiri', '20px "Amiri Quran"', '700 14px "IBM Plex Sans Arabic"'].map(f => document.fonts.load(f))); } catch (e) { /* تجاهل */ }
  }
}
async function mount(html) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10000px;top:0;pointer-events:none;';
  host.innerHTML = `<style>${CSS}</style>` + html;
  document.body.appendChild(host);
  await Promise.all(Array.from(host.querySelectorAll('img')).map(img => img.complete ? null : new Promise(r => { img.onload = img.onerror = r; })));
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return host;
}
const fileName = (d, ext) => `${t('drr_file')}_${d.n}_${d.A.name}_${d.B.name}.${ext}`.replace(/[\\/:*?"<>|،,()]/g, ' ').replace(/\s+/g, '_');

async function share(blob, name, mime) {
  const file = new File([blob], name, { type: mime });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: t('drr_title') }); }
    catch (err) { if (!err || err.name !== 'AbortError') throw err; }
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.download = name; a.href = url;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  if (mime === 'image/png') { alert(t('rep_wa_unsupported_note')); window.open('https://wa.me/', '_blank', 'noopener'); }
}

export async function shareDualRoundWhatsApp(match, test, idx) {
  const d = await buildData(match, test, idx);
  await prepare();
  const host = await mount(cardHtml(d));
  let canvas;
  try {
    const card = host.querySelector('.drr-card'), pg = card.querySelector('.pg');
    // أكبر مقياس يجعل المحتوى يتّسع في 676×864 (نفس فكرة fitQaCard)، ثم تُمدّ المربعات لملء ما تبقّى
    const W = 676, H = 864;
    const fits = k => { pg.style.width = (W / k) + 'px'; return pg.scrollHeight * k <= H; };
    let lo = 0.6, hi = 1.4;
    for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
    fits(lo);
    pg.style.right = 'auto';
    pg.style.transform = `scale(${lo})`;
    pg.style.minHeight = (H / lo) + 'px';
    canvas = await window.html2canvas(card, { scale: 1.5, backgroundColor: '#f4f5fc', useCORS: true });
  } finally { host.remove(); }
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  await share(blob, fileName(d, 'png'), 'image/png');
}

export async function exportDualRoundPdf(match, test, idx) {
  const d = await buildData(match, test, idx);
  await prepare();
  if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  const host = await mount(pdfHtml(d));
  try {
    const root = host.querySelector('.drr-pdf');
    const base = root.getBoundingClientRect().top;
    const blocks = Array.from(root.querySelectorAll('.pdf-block')).map(el => { const b = el.getBoundingClientRect(); return { top: b.top - base, bottom: b.bottom - base + 12 }; });
    const scale = 2;
    const canvas = await window.html2canvas(root, { scale, backgroundColor: '#ffffff', useCORS: true });
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    const pw = pdf.internal.pageSize.getWidth(), ph = pdf.internal.pageSize.getHeight();
    const TOP = 18; // هامش علوي للصفحات بعد الأولى (الأولى يكفيها حشو الصفحة نفسها)
    const pxPerPt = root.offsetWidth / pw, pageH = (ph - TOP) * pxPerPt;
    // تقسيم على صفحات دون قصّ قسم من منتصفه (والقسم الأطول من صفحة يُقسَم على حدود الصفحة)
    const pages = []; let start = 0;
    blocks.forEach(b => {
      while (b.bottom - start > pageH) {
        const cut = b.top > start ? b.top : start + pageH;
        pages.push([start, cut]); start = cut;
      }
    });
    pages.push([start, root.offsetHeight]);
    pages.forEach(([a, b], i) => {
      const h = Math.max(1, Math.round((b - a) * scale));
      const c = document.createElement('canvas'); c.width = canvas.width; c.height = h;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, h);
      ctx.drawImage(canvas, 0, Math.round(a * scale), canvas.width, h, 0, 0, canvas.width, h);
      if (i) pdf.addPage();
      pdf.addImage(c.toDataURL('image/png'), 'PNG', 0, i ? TOP : 0, pw, (b - a) / pxPerPt, undefined, 'FAST');
    });
    await share(pdf.output('blob'), fileName(d, 'pdf'), 'application/pdf');
  } finally { host.remove(); }
}
