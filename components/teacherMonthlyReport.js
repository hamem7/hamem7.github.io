// components/teacherMonthlyReport.js
// =============================================================================
// 📊 «تقرير المعلم الشهري» — شاشة تحفيزية تلخّص عطاء المعلم في شهر: الحلقات وساعاتها، الحفظ الجديد مع الطلاب، المراجعة
// (آيات/سور/أجزاء)، الألعاب الفردية ووقتها، المواجهات الثنائية، أيام العطاء، مقارنة بالشهر الماضي، نجوم الطلاب،
// أوسمة المعلم (برونزي/فضي/ذهبي) ومستواه وهدفه القادم.
//
// • الحسابات كلها في engine/teacherReportEngine.js (خالص ومُختبَر) وجمع البيانات في core/teacherReportService.js.
// • الشاشة تُحقن فوق المحتوى وتحت الترويسة الوحيدة #main-header (لا ترويسة خاصة بها) — انظر placeBelowMainHeader.
// • ثنائية اللغة والاتجاه (RTL/LTR) والمظهر الداكن بالرموز (--dh-*) بلا ألوان فاتحة ثابتة.
// • لغة التقرير تحفيزية بالكامل: لا لوم ولا أحمر؛ النقص عن الشهر الماضي يُعرض بحياد، والصفر يُقابَل بدعوة لبداية جديدة.
// =============================================================================
import { AppState, surahNameLocal } from '../core/app.js';
import { t, tf } from '../core/i18n.js';
import '../core/i18n-teacherreport.js';
import { loadTeacherMonthReport } from '../core/teacherReportService.js';
import { LADDERS, LADDER_KEYS, LEVEL_KEYS, LEVEL_MIN_POINTS } from '../engine/teacherReportEngine.js';

const STYLE_ID = 'tmr-styles';
const MONTHS_BACK = 12;                // الحالي + 11 سابقة
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const locale = () => (AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US') + '-u-nu-latn';
const isAr = () => AppState.currentLang === 'ar';
const monthLabel = (y, m0) => { try { return new Intl.DateTimeFormat(locale(), { month: 'long', year: 'numeric' }).format(new Date(y, m0, 1)); } catch (e) { return `${m0 + 1}/${y}`; } };
const nf = (n) => { try { return new Intl.NumberFormat(locale()).format(n); } catch (e) { return String(n); } };

/** مدة نصية من دقائق: "٣ ساعة و١٢ دقيقة" / "45 دقيقة". */
export function formatMinutes(totalMin) {
    const min = Math.max(0, Math.round(Number(totalMin) || 0));
    const h = Math.floor(min / 60), m = min % 60;
    if (h && m) return tf('tr_dur_hm', { h: nf(h), m: nf(m) });
    if (h) return tf('tr_dur_h', { h: nf(h) });
    return tf('tr_dur_m', { m: nf(m) });
}

const MEDAL = { 1: '🥉', 2: '🥈', 3: '🥇' };
const ACH_ICON = { sessions: '🕌', hours: '⏳', memoStudents: '🌱', memoAyahs: '📖', reviewAyahs: '🔁', reviewSurahs: '🧭', games: '🎮', duels: '⚔️', activeDays: '🌙', homeworkMade: '📝', similarity: '🔀', tajweedChallenge: '🎙️' };

function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = `
.tmr-overlay{position:fixed;top:0;right:0;bottom:0;left:0;z-index:10000;background:var(--dh-surface-0);overflow-y:auto;font-family:'IBM Plex Sans Arabic',sans-serif;color:var(--dh-ink);}
.tmr-wrap{max-width:980px;margin:0 auto;padding:14px 16px 40px;box-sizing:border-box;}
.tmr-wrap[dir="rtl"]{direction:rtl;}.tmr-wrap[dir="ltr"]{direction:ltr;}
.tmr-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px;}
.tmr-bar h2{margin:0;font-size:1.35rem;font-weight:700;flex:1;min-width:160px;color:var(--dh-ink) !important;text-shadow:none !important;}
.tmr-btn{background:var(--dh-surface-3);border:1px solid var(--dh-border-strong);color:var(--dh-ink);min-height:44px;min-width:44px;border-radius:12px;padding:0 14px;cursor:pointer;font-family:inherit;font-weight:700;font-size:.92rem;display:inline-flex;align-items:center;justify-content:center;gap:6px;}
.tmr-btn:hover{border-color:var(--dh-ok-ink);}
.tmr-btn:focus-visible{outline:3px solid var(--dh-focus);outline-offset:2px;}
.tmr-btn[disabled]{opacity:.4;cursor:default;}
.tmr-monthnav{display:flex;align-items:center;gap:8px;}
.tmr-month{font-weight:700;min-width:130px;text-align:center;}
.tmr-hero{border-radius:22px;padding:22px 20px;color:var(--dh-on-emerald);background-image:radial-gradient(circle at 15% 10%,rgba(255,255,255,.14),transparent 35%),radial-gradient(circle at 90% 90%,rgba(212,175,55,.28),transparent 40%),linear-gradient(135deg,#06231c,#0d5c46 60%,#147c5e);background-color:#0d5c46;margin-bottom:16px;}
.tmr-hero h3{margin:0 0 4px;font-size:1.5rem;font-weight:700;color:var(--dh-on-emerald) !important;text-shadow:none !important;}
.tmr-hero .tmr-sub{opacity:.9;margin:0 0 14px;font-size:1rem;}
.tmr-lvl{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);border-radius:16px;padding:12px 14px;}
.tmr-lvl-ico{width:54px;height:54px;border-radius:50%;background:var(--dh-gold-500);color:var(--dh-on-gold);display:grid;place-items:center;font-size:1.7rem;flex:none;}
.tmr-lvl-main{flex:1;min-width:200px;}
.tmr-lvl-lab{font-size:.8rem;opacity:.85;}
.tmr-lvl-name{font-size:1.25rem;font-weight:700;}
.tmr-prog{height:10px;border-radius:99px;background:rgba(255,255,255,.22);overflow:hidden;margin:8px 0 4px;}
.tmr-prog>i{display:block;height:100%;background:var(--dh-gold-500);border-radius:99px;}
.tmr-lvl-note{font-size:.82rem;opacity:.92;}
.tmr-msg{margin:14px 2px 0;font-size:1.02rem;line-height:1.9;}
.tmr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(270px,1fr));gap:12px;margin-bottom:16px;}
.tmr-card{background:var(--dh-surface-2);border:1px solid var(--dh-border);border-radius:18px;padding:14px 14px 12px;}
.tmr-card .tmr-ico{font-size:1.4rem;}
.tmr-num{font-size:2.1rem;font-weight:700;line-height:1.15;color:var(--dh-ok-ink);}
.tmr-lab{font-weight:700;font-size:.98rem;}
.tmr-subtxt{color:var(--dh-ink-soft);font-size:.86rem;margin-top:2px;}
.tmr-delta{display:inline-block;margin-top:8px;font-size:.78rem;font-weight:700;border-radius:99px;padding:3px 10px;background:var(--dh-surface-0);color:var(--dh-ink-soft);}
.tmr-delta.up{background:var(--dh-ok-bg);color:var(--dh-ok);}
.tmr-sec{background:var(--dh-surface-2);border:1px solid var(--dh-border);border-radius:18px;padding:16px;margin-bottom:16px;}
.tmr-sec h4{margin:0 0 10px;font-size:1.12rem;font-weight:700;color:var(--dh-ok-ink) !important;text-shadow:none !important;}
.tmr-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;}
.tmr-time{background:var(--dh-surface-3);border:1px solid var(--dh-border-soft);border-radius:14px;padding:12px;}
.tmr-time b{display:block;font-size:1.5rem;color:var(--dh-ok-ink);}
.tmr-line{line-height:1.9;margin:0 0 8px;}
.tmr-map{display:grid;grid-template-columns:repeat(auto-fill,minmax(26px,1fr));gap:4px;margin-top:8px;}
.tmr-cell{height:26px;border-radius:7px;background:var(--dh-surface-3);border:1px solid var(--dh-border-soft);font-size:.62rem;display:grid;place-items:center;color:var(--dh-ink-soft);}
.tmr-cell.on{background:var(--dh-gold-500);border-color:var(--dh-gold-ink);color:var(--dh-on-gold);font-weight:700;}
.tmr-hint{color:var(--dh-ink-soft);font-size:.82rem;margin:6px 0 0;}
.tmr-stars{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;}
.tmr-star{background:var(--dh-surface-3);border:1px solid var(--dh-border-soft);border-radius:14px;padding:10px 12px;}
.tmr-star small{display:block;color:var(--dh-ink-soft);font-weight:700;}
.tmr-star b{display:block;font-size:1.08rem;margin:2px 0;}
.tmr-ach{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;}
.tmr-badge{display:flex;gap:10px;align-items:center;background:var(--dh-surface-3);border:1px solid var(--dh-border-soft);border-radius:14px;padding:10px 12px;}
.tmr-badge.off{opacity:.5;}
.tmr-badge .tmr-bi{font-size:1.6rem;flex:none;}
.tmr-badge b{display:block;font-size:.98rem;}
.tmr-badge span{font-size:.8rem;color:var(--dh-ink-soft);}
.tmr-next{display:flex;gap:10px;align-items:center;background:var(--dh-warn-bg);border:1px solid var(--dh-border);border-radius:14px;padding:10px 14px;margin-top:12px;font-weight:700;}
.tmr-table{width:100%;border-collapse:collapse;font-size:.92rem;}
.tmr-table th,.tmr-table td{padding:8px 10px;border-bottom:1px solid var(--dh-border-soft);text-align:center;}
.tmr-table th:first-child,.tmr-table td:first-child{text-align:start;}
.tmr-table th{color:var(--dh-ink-soft);font-size:.8rem;}
.tmr-scroll{overflow-x:auto;}
.tmr-closing{text-align:center;line-height:2;font-size:1.02rem;padding:8px 6px;color:var(--dh-ok-ink);font-weight:700;}
.tmr-note{color:var(--dh-ink-soft);font-size:.8rem;line-height:1.8;margin-top:6px;}
.tmr-empty{text-align:center;padding:36px 16px;}
.tmr-empty .tmr-big{font-size:3rem;}
.tmr-load{text-align:center;padding:60px 16px;font-weight:700;color:var(--dh-ink-soft);}
.tmr-toast{position:fixed;bottom:22px;inset-inline:0;margin:auto;width:max-content;max-width:90vw;background:var(--dh-emerald-700);color:var(--dh-on-emerald);padding:10px 18px;border-radius:99px;font-weight:700;z-index:10001;}
@media (max-width:600px){.tmr-wrap{padding:10px 12px 90px;}.tmr-num{font-size:1.8rem;}.tmr-hero h3{font-size:1.25rem;}.tmr-bar h2{font-size:1.15rem;}}
@media print{
  body>*:not(.tmr-overlay){display:none !important;}
  .tmr-overlay{position:static !important;overflow:visible !important;background:transparent !important;}
  .tmr-noprint{display:none !important;}
  .tmr-hero,.tmr-card,.tmr-sec{break-inside:avoid;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
}
`;
    document.head.appendChild(st);
}

// الشاشة تبدأ من أسفل الترويسة الوحيدة (#main-header) — لا ترويسة خاصة بها
function placeBelowMainHeader(overlay) {
    const h = document.getElementById('main-header');
    if (h) overlay.style.top = Math.max(0, Math.round(h.getBoundingClientRect().bottom)) + 'px';
}

function deltaChip(d) {
    if (d == null) return '';
    if (d > 0) return `<span class="tmr-delta up">${esc(tf('tr_delta_up', { n: nf(d) }))}</span>`;
    if (d < 0) return `<span class="tmr-delta">${esc(tf('tr_delta_down', { n: nf(Math.abs(d)) }))}</span>`;
    return `<span class="tmr-delta">${esc(t('tr_delta_same'))}</span>`;
}

function statCard(icon, num, label, sub, delta) {
    return `<div class="tmr-card"><div class="tmr-ico" aria-hidden="true">${icon}</div><div class="tmr-num">${esc(nf(num))}</div><div class="tmr-lab">${esc(label)}</div>${sub ? `<div class="tmr-subtxt">${esc(sub)}</div>` : ''}${deltaChip(delta)}</div>`;
}

function teacherNameLine() {
    const tp = AppState.currentTeacher || {};
    const fem = tp.gender === 'female';
    const name = (tp.name || '').trim();
    return name ? tf(fem ? 'tr_hero_name_f' : 'tr_hero_name_m', { name }) : t(fem ? 'tr_hero_anon_f' : 'tr_hero_anon_m');
}

function heroHtml(r) {
    const lvKey = r.level.key;
    const prevMin = LEVEL_MIN_POINTS[r.level.index], nextMin = r.level.nextAt;
    const pct = nextMin == null ? 100 : Math.max(4, Math.round(((r.points - prevMin) / (nextMin - prevMin)) * 100));
    const nextName = nextMin == null ? '' : t('tr_lvl_' + LEVEL_KEYS[r.level.index + 1]);
    const note = nextMin == null ? t('tr_lvl_top') : tf('tr_lvl_next', { n: nf(r.level.toNext), name: nextName });
    return `<section class="tmr-hero" aria-label="${esc(t('tr_lvl_label'))}">
      <h3>${esc(teacherNameLine())}</h3>
      <p class="tmr-sub">${esc(tf('tr_hero_sub', { month: monthLabel(r.year, r.monthIndex0) }))}</p>
      <div class="tmr-lvl">
        <div class="tmr-lvl-ico" aria-hidden="true">🏅</div>
        <div class="tmr-lvl-main">
          <div class="tmr-lvl-lab">${esc(t('tr_lvl_label'))} · ${esc(tf('tr_lvl_pts', { n: nf(r.points), max: nf(r.maxPoints) }))}</div>
          <div class="tmr-lvl-name">${esc(t('tr_lvl_' + lvKey))}</div>
          <div class="tmr-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><i style="width:${pct}%"></i></div>
          <div class="tmr-lvl-note">${esc(note)}</div>
        </div>
      </div>
      <p class="tmr-msg">${esc(t('tr_msg_' + lvKey))}</p>
    </section>`;
}

function statsHtml(r) {
  const d = r.delta || {};
  const cards = [
    statCard('🕌', r.sessions.count, t('tr_c_sessions'), tf('tr_c_sessions_sub', { h: nf(r.sessions.hours), n: nf(r.sessions.students) }), r.delta ? d.sessions : null),
    statCard('🌱', r.memo.students, t('tr_c_memo'), tf('tr_c_memo_sub', { n: nf(r.memo.ayahs) }), null),
    statCard('🔁', r.review.ayahs, t('tr_c_review'), tf('tr_c_review_sub', { s: nf(r.review.surahs), j: nf(r.review.juz) }), r.delta ? d.reviewAyahs : null),
    statCard('🎮', r.games.total, t('tr_c_games'), tf('tr_c_games_sub', { n: nf(r.games.players) }), r.delta ? d.games : null),
    statCard('⚔️', r.duels.matches, t('tr_c_duels'), tf('tr_c_duels_sub', { n: nf(r.duels.participants) }), r.delta ? d.duels : null),
    statCard('🌙', r.activeDays, t('tr_c_days'), tf('tr_c_days_sub', { n: nf(r.longestStreak) }), null)
  ];
  const acc = (c, q) => (q > 0 ? Math.round((c / q) * 100) : 0);
  cards.push(statCard('📝', r.homework.made, t('tr_c_hwmade'), tf('tr_c_hwmade_sub', { q: nf(r.homework.madeQuestions), s: nf(r.homework.assignedStudents) }), r.delta ? d.homeworkMade : null));
  cards.push(statCard('📥', r.homework.submitted, t('tr_c_hwsub'), '', null));
  cards.push(statCard('🔀', r.similarity.rounds, t('tr_c_sim'), r.similarity.questions ? tf('tr_c_acc_sub', { n: nf(r.similarity.questions), p: nf(acc(r.similarity.correct, r.similarity.questions)) }) : tf('tr_c_players_sub', { n: nf(r.similarity.players) }), r.delta ? d.similarity : null));
  cards.push(statCard('🎙️', r.tajweed.challenge, t('tr_c_tjc'), tf('tr_c_tjc_sub', { n: nf(r.tajweed.sessions), l: nf(r.tajweed.learned) }), r.delta ? d.tajweed : null));
  return `<div class="tmr-grid">${cards.join('')}</div>`;
}

function timeHtml(r) {
  const none = t('tr_time_none');
  return `<section class="tmr-sec"><h4>⏱️ ${esc(t('tr_time_title'))}</h4><div class="tmr-two">
    <div class="tmr-time"><b>${r.sessions.minutes ? esc(formatMinutes(r.sessions.minutes)) : esc(none)}</b><span class="tmr-subtxt">${esc(t('tr_time_sessions'))}</span></div>
    <div class="tmr-time"><b>${r.games.minutes ? esc(formatMinutes(r.games.minutes)) : esc(none)}</b><span class="tmr-subtxt">${esc(t('tr_time_games'))}</span></div>
  </div></section>`;
}

function quranHtml(r) {
  const on = new Set(r.review.surahNumbers);
  let cells = '';
  for (let n = 1; n <= 114; n++) {
    const nm = surahNameLocal(n);
    cells += `<div class="tmr-cell${on.has(n) ? ' on' : ''}" title="${esc(nm)}" aria-label="${esc(nm)}">${n}</div>`;
  }
  const memoLine = r.memo.ayahs > 0
    ? tf('tr_q_memo', { n: nf(r.memo.ayahs), pct: nf(r.memo.pctQuran), p: nf(r.memo.pages) })
    : t('tr_q_memo_none');
  return `<section class="tmr-sec"><h4>📖 ${esc(t('tr_q_title'))}</h4>
    <p class="tmr-line">${esc(memoLine)}</p>
    <p class="tmr-line">${esc(tf('tr_q_review', { s: nf(r.review.surahs) }))}</p>
    <div class="tmr-lab">${esc(t('tr_q_map'))}</div>
    <div class="tmr-map" dir="rtl">${cells}</div>
    <p class="tmr-hint">${esc(t('tr_q_map_hint'))}</p></section>`;
}

function spotlightHtml(r) {
  const sp = r.spotlight, items = [];
  const add = (key, o) => { if (o) items.push(`<div class="tmr-star"><small>${esc(t('tr_sp_' + key))}</small><b>${esc(o.name)}</b><span class="tmr-subtxt">${esc(tf('tr_sp_' + key + '_v', { n: nf(o.value) }))}</span></div>`); };
  add('memorizer', sp.memorizer); add('reviewer', sp.reviewer); add('gamer', sp.gamer); add('devoted', sp.devoted);
  if (!items.length) return '';
  const stars = r.stars > 0 ? `<p class="tmr-hint">${esc(tf('tr_sp_stars', { n: nf(r.stars) }))}</p>` : '';
  return `<section class="tmr-sec"><h4>🌟 ${esc(t('tr_sp_title'))}</h4><div class="tmr-stars">${items.join('')}</div>${stars}</section>`;
}

function achievementsHtml(r) {
  const earned = new Map(r.earned.map(e => [e.key, e]));
  const badges = LADDER_KEYS.map(k => {
    const e = earned.get(k), ladder = LADDERS[k];
    const tier = e ? e.tier : 0;
    const desc = tier >= 3 ? t('tr_tier_3') : tf('tr_ach_need', { n: nf(ladder[tier]), unit: t('tr_unit_' + k) });
    return `<div class="tmr-badge${tier ? '' : ' off'}"><div class="tmr-bi" aria-hidden="true">${tier ? MEDAL[tier] : ACH_ICON[k]}</div><div><b>${esc(t('tr_ach_' + k))}</b><span>${tier ? esc(t('tr_tier_' + tier)) + ' · ' : ''}${esc(desc)}</span></div></div>`;
  }).join('');
  const g = r.nextGoal;
  const next = g
    ? `<div class="tmr-next"><span aria-hidden="true">🎯</span><span>${esc(t('tr_next_title'))}: ${esc(tf('tr_next_text', { n: nf(g.remaining), unit: t('tr_unit_' + g.key), name: t('tr_ach_' + g.key), tier: t('tr_tier_' + g.tier) }))}</span></div>`
    : `<div class="tmr-next"><span aria-hidden="true">🏆</span><span>${esc(t('tr_next_none'))}</span></div>`;
  return `<section class="tmr-sec"><h4>🏆 ${esc(t('tr_ach_title'))}</h4><div class="tmr-ach">${badges}</div><p class="tmr-hint">${esc(t('tr_ach_hint'))}</p>${next}</section>`;
}

function tableHtml(r) {
  const rows = r.students || [];
  if (!rows.length) return '';
  const dash = (n, suf = '') => (n ? nf(n) + suf : '—');
  const body = rows.map(s => `<tr><td>${esc(s.name)}${s.hidden ? ` <small class="tmr-subtxt">(${esc(t('tr_hidden_tag'))})</small>` : ''}</td><td>${nf(s.sessions)}</td><td>${nf(s.games)}</td><td>${dash(s.duels)}</td><td>${dash(s.newAyahs)}</td><td>${dash(s.reviewAyahs)}</td><td>${dash(s.hwAssigned)}</td><td>${dash(s.hwSubmitted)}</td><td>${dash(s.similarity)}</td><td>${dash(s.tajweed)}</td><td>${dash(s.stars, ' ⭐')}</td></tr>`).join('');
  return `<section class="tmr-sec"><h4>👥 ${esc(tf('tr_tbl_title_n', { n: nf(rows.length) }))}</h4><div class="tmr-scroll"><table class="tmr-table"><thead><tr>
    <th>${esc(t('tr_col_student'))}</th><th>${esc(t('tr_col_sessions'))}</th><th>${esc(t('tr_col_games'))}</th><th>${esc(t('tr_col_duels'))}</th><th>${esc(t('tr_col_memo'))}</th><th>${esc(t('tr_col_review'))}</th><th>${esc(t('tr_col_hwmade'))}</th><th>${esc(t('tr_col_hwsub'))}</th><th>${esc(t('tr_col_sim'))}</th><th>${esc(t('tr_col_tj'))}</th><th>${esc(t('tr_col_stars'))}</th>
  </tr></thead><tbody>${body}</tbody></table></div></section>`;
}

function emptyHtml(r) {
  return `<section class="tmr-sec tmr-empty"><div class="tmr-big" aria-hidden="true">🌙</div><h4>${esc(t('tr_empty_title'))}</h4><p class="tmr-line">${esc(t('tr_empty_text'))}</p></section>`;
}

/** نص ملخص قابل للنسخ (واتساب) بلغة الواجهة. */
export function shareText(r) {
  const lines = [
    tf('tr_share_head', { month: monthLabel(r.year, r.monthIndex0) }),
    tf('tr_share_sessions', { n: nf(r.sessions.count), h: nf(r.sessions.hours) }),
    tf('tr_share_memo', { s: nf(r.memo.students), n: nf(r.memo.ayahs) }),
    tf('tr_share_review', { n: nf(r.review.ayahs), s: nf(r.review.surahs) }),
    tf('tr_share_games', { n: nf(r.games.total), m: nf(r.games.minutes) }),
    tf('tr_share_duels', { n: nf(r.duels.matches) }),
    tf('tr_share_hw', { m: nf(r.homework.made), s: nf(r.homework.submitted) }),
    tf('tr_share_sim', { n: nf(r.similarity.rounds) }),
    tf('tr_share_tj', { n: nf(r.tajweed.challenge) }),
    tf('tr_share_level', { name: t('tr_lvl_' + r.level.key) })
  ];
  return lines.join('\n');
}

function toast(text) {
  const el = document.createElement('div');
  el.className = 'tmr-toast tmr-noprint';
  el.setAttribute('role', 'status');
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2200);
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch (e) { /* احتياطي */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); ta.remove(); return ok;
  } catch (e) { return false; }
}

/** يفتح شاشة تقرير المعلم لشهر (الافتراضي: الشهر الحالي). */
export function openTeacherMonthlyReport(opts = {}) {
  ensureStyles();
  document.getElementById('tmr-overlay')?.remove();
  const now = new Date();
  const base = { y: now.getFullYear(), m: now.getMonth() };
  let sel = { y: opts.year != null ? opts.year : base.y, m: opts.monthIndex0 != null ? opts.monthIndex0 : base.m };
  let current = null, token = 0;

  const overlay = document.createElement('div');
  overlay.className = 'tmr-overlay';
  overlay.id = 'tmr-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', t('tr_title'));
  placeBelowMainHeader(overlay);
  document.body.appendChild(overlay);
  const onResize = () => placeBelowMainHeader(overlay);
  window.addEventListener('resize', onResize);

  const monthsBack = (y, m) => (base.y - y) * 12 + (base.m - m);
  const close = () => {
    window.removeEventListener('resize', onResize);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('app-lang-changed', rerender);
    overlay.remove();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  const shell = (inner) => {
    const back = monthsBack(sel.y, sel.m);
    return `<div class="tmr-wrap" dir="${isAr() ? 'rtl' : 'ltr'}">
      <div class="tmr-bar">
        <button type="button" class="tmr-btn tmr-noprint" id="tmr-close" aria-label="${esc(t('tr_close'))}"><span aria-hidden="true">✕</span> ${esc(t('tr_close'))}</button>
        <h2>📊 ${esc(t('tr_title'))}</h2>
        <div class="tmr-monthnav tmr-noprint">
          <button type="button" class="tmr-btn" id="tmr-prev" aria-label="${esc(t('tr_prev_month'))}"${back >= MONTHS_BACK - 1 ? ' disabled' : ''}><span aria-hidden="true">${isAr() ? '▶' : '◀'}</span></button>
          <span class="tmr-month" aria-live="polite">${esc(monthLabel(sel.y, sel.m))}</span>
          <button type="button" class="tmr-btn" id="tmr-next" aria-label="${esc(t('tr_next_month'))}"${back <= 0 ? ' disabled' : ''}><span aria-hidden="true">${isAr() ? '◀' : '▶'}</span></button>
        </div>
        <button type="button" class="tmr-btn tmr-noprint" id="tmr-copy"${current && !current.empty ? '' : ' disabled'}>📋 ${esc(t('tr_copy'))}</button>
        <button type="button" class="tmr-btn tmr-noprint" id="tmr-print"${current && !current.empty ? '' : ' disabled'}>🖨️ ${esc(t('tr_print'))}</button>
      </div>${inner}</div>`;
  };

  const bind = () => {
    overlay.querySelector('#tmr-close').onclick = close;
    overlay.querySelector('#tmr-prev').onclick = () => go(-1);
    overlay.querySelector('#tmr-next').onclick = () => go(1);
    overlay.querySelector('#tmr-copy').onclick = async () => { if (current) toast(t((await copyText(shareText(current))) ? 'tr_copied' : 'tr_copy_fail')); };
    overlay.querySelector('#tmr-print').onclick = () => window.print();
    const retry = overlay.querySelector('#tmr-retry');
    if (retry) retry.onclick = () => load();
  };

  function go(dir) {
    const d = new Date(sel.y, sel.m + dir, 1);
    const nb = monthsBack(d.getFullYear(), d.getMonth());
    if (nb < 0 || nb > MONTHS_BACK - 1) return;
    sel = { y: d.getFullYear(), m: d.getMonth() };
    load();
  }

  function render() {
    if (!current) return;
    const r = current;
    const body = r.empty
      ? emptyHtml(r)
      : heroHtml(r) + statsHtml(r) + timeHtml(r) + quranHtml(r) + spotlightHtml(r) + achievementsHtml(r) + tableHtml(r)
        + `<p class="tmr-closing">${esc(t('tr_closing'))}</p><p class="tmr-note">${esc(t('tr_note'))}</p>`;
    overlay.innerHTML = shell(body);
    bind();
    overlay.scrollTop = 0;
  }
  const rerender = () => { if (current) render(); else overlay.innerHTML = shell(`<div class="tmr-load">${esc(t('tr_loading'))}</div>`), bind(); };
  document.addEventListener('app-lang-changed', rerender);

  async function load() {
    const my = ++token;
    current = null;
    overlay.innerHTML = shell(`<div class="tmr-load" role="status">⏳ ${esc(t('tr_loading'))}</div>`);
    bind();
    try {
      const rep = await loadTeacherMonthReport(sel.y, sel.m, { now: new Date() });
      if (my !== token) return;       // المعلم انتقل لشهر آخر أثناء الحساب
      current = rep;
      render();
    } catch (e) {
      if (my !== token) return;
      console.error('[teacherMonthlyReport] تعذر إعداد التقرير:', e);
      overlay.innerHTML = shell(`<div class="tmr-load">${esc(t('tr_load_error'))}<br><br><button type="button" class="tmr-btn" id="tmr-retry">${esc(t('tr_retry'))}</button></div>`);
      bind();
    }
  }
  load();
  return { close };
}
