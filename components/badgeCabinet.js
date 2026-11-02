// components/badgeCabinet.js — «خزانة الأوسمة» في ملف الطالب: كل الأوسمة الـ14، المنال منها بأعلى درجة بلغها (بأثر رجعي من البيانات
// المؤرَّخة)، وغير المنال بظل مع شرط الحصول وعتباته. الضغط على وسام يشرح كيف يُنال أو يعيد مشهده.
import { AppState, t } from '../core/app.js';
import { tf } from '../core/i18n.js';
import '../core/i18n-badges.js';
import { esc } from '../core/escape.js';
import { BADGE_DEFS, TIER_KEYS } from '../engine/badgesEngine.js';
import { badgeHistory, consistencyTitle } from '../core/badgeService.js';
import { medalSVG, TIER_VARS, playBadge, showCeremony, maybeShowNewGoals } from './badgeReveal.js';
import { loadGoalState, goalName, goalIcon, goalToReveal, nextGoalHint, pctText } from '../core/goalsService.js';
import { MILESTONES, juzTierKey } from '../engine/goalsEngine.js';
import { juzLabel } from '../engine/reviewParts.js';

const isEn = () => AppState.currentLang === 'en';
const num = (n) => (isEn() ? String(n) : Number(n).toLocaleString('ar-EG', { useGrouping: false }));

// قسم «أهدافي»: وسام لكل جزء (30) + المراحل الكبرى (7) + الهدف التالي بشريط تقدم
function goalsBlock(state) {
  const earnedIds = new Set(state.earned.map(e => e.id));
  const mini = (id, icon, tierKey, label, kind, ref) => `<button type="button" class="gl-card${earnedIds.has(id) ? '' : ' locked'}" data-id="${id}" title="${esc(label)}" style="${earnedIds.has(id) ? TIER_VARS[tierKey] : '--t1:#9aa0a6;--t2:#7b8086;--t3:#555a60'}">
      <span class="m">${medalSVG(icon, earnedIds.has(id) ? tierKey : 'bronze').replace('class="shine"', 'class="shine" style="display:none"')}</span><small>${esc(label)}</small></button>`;
  const juz = Array.from({ length: 30 }, (_, i) => 30 - i).map(j => mini('juz_' + j, num(j), juzTierKey(j), juzLabel(j, t))).join('');
  const ms = MILESTONES.map(m => mini(m.id, ({ ms_3: '🌱', ms_5: '🌿', ms_quarter: '🌙', ms_10: '⛰️', ms_half: '🌓', ms_20: '🏆', ms_khatm: '👑' })[m.id], m.tierKey, t('goal_' + m.id + '_name'))).join('');
  const hint = nextGoalHint(state, null);
  return `<div class="gl-sec"><div class="gl-head"><b>${esc(t('goal_sec_title'))}</b><span>${esc(tf('goal_juz_count', { n: num(state.fullJuz) }))}</span></div>
    <p style="margin:2px 0 8px;color:var(--dh-ink-soft);font-size:.85rem">${esc(t('goal_sec_sub'))}</p>
    ${hint ? `<div class="gl-next"><div>${esc(hint.text)}</div><div class="gl-bar"><i style="width:${Math.max(4, Math.round(hint.pct * 100))}%"></i></div></div>` : ''}
    <div class="gl-grid gl-ms">${ms}</div><div class="gl-grid">${juz}</div></div>`;
}

export async function renderBadgeCabinet(student, container) {
  if (!container) return;
  let hist;
  try { hist = await badgeHistory(student); } catch (e) { console.warn('[badgeCabinet]', e); container.innerHTML = ''; return; }
  const now = new Date();
  const thisMonth = hist.months.find(m => m.year === now.getFullYear() && m.month === now.getMonth());
  const bestBy = Object.fromEntries(hist.best.map(b => [b.key, b]));
  const cards = BADGE_DEFS.map(def => {
    const b = bestBy[def.key], earned = b && b.bestTier >= 0, tk = earned ? TIER_KEYS[b.bestTier] : null;
    const title = b ? consistencyTitle(b.goldMonths) : null;
    return `<button type="button" class="bdgc-card${earned ? '' : ' locked'}" data-k="${def.key}" style="${earned ? TIER_VARS[tk] : '--t1:#9aa0a6;--t2:#7b8086;--t3:#555a60'}">
      <span class="m">${medalSVG(def.icon, tk || 'bronze').replace('class="shine"', 'class="shine" style="display:none"')}</span>
      <b>${esc(t('bdg_' + def.key + '_name'))}</b>
      <small>${earned ? esc(tf('bdg_cabinet_best', { tier: t('bdg_tier_n_' + tk) })) : esc(t('bdg_cabinet_locked'))}</small>
      ${earned && b.months > 1 ? `<small>${esc(tf('bdg_cabinet_months', { n: num(b.months) }))}</small>` : ''}
      ${title ? `<small class="ttl">🔥 ${esc(t('bdg_title_' + title))}</small>` : ''}</button>`;
  }).join('');
  let goalState = null;
  try { goalState = await loadGoalState(student); } catch (e) { console.warn('[badgeCabinet] الأهداف:', e); }
  container.innerHTML = `<style>
    .gl-sec{color:var(--dh-ink);margin-bottom:16px;padding:12px;border-radius:16px;border:1.5px solid var(--dh-border-strong);background:var(--dh-surface-2)}
    .gl-head{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center}
    .gl-head span{color:var(--dh-ink-soft);font-size:.85rem;font-weight:700}
    .gl-next{color:var(--dh-ink);margin:6px 0 10px;padding:10px 12px;border-radius:12px;background:var(--dh-surface-3);border:1px dashed var(--dh-border-strong);font-weight:700;line-height:1.6}
    .gl-bar{height:9px;border-radius:999px;background:var(--dh-border);overflow:hidden;margin-top:6px}.gl-bar i{display:block;height:100%;background:linear-gradient(90deg,#d4a017,#f6d57a);border-radius:inherit}
    .gl-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:6px;margin-top:8px}
    .gl-card{display:grid;justify-items:center;gap:0;padding:6px 2px;border-radius:12px;border:1px solid var(--dh-border);background:var(--dh-surface-3);color:var(--dh-ink);cursor:pointer;font:inherit}
    .gl-card .m svg{width:46px;filter:drop-shadow(0 3px 4px rgba(0,0,0,.3))}.gl-card.locked .m{opacity:.3;filter:grayscale(1)}.gl-card small{font-size:.66rem;color:var(--dh-ink-soft);text-align:center;line-height:1.3}
    .bdgc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px}
    .bdgc-card{display:grid;justify-items:center;gap:2px;padding:10px 6px;border-radius:14px;border:1.5px solid var(--dh-border-strong);background:var(--dh-surface-3);color:var(--dh-ink);cursor:pointer;font:inherit}
    .bdgc-card .m svg{width:64px;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))} .bdgc-card.locked .m{opacity:.35;filter:grayscale(1)}
    .bdgc-card small{color:var(--dh-ink-soft);font-size:.74rem;text-align:center} .bdgc-card .ttl{color:var(--dh-warn,#b45309);font-weight:800}
    .bdgc-info{margin-top:10px;padding:12px;border-radius:14px;border:1.5px dashed var(--dh-border-strong);background:var(--dh-surface-2);display:none;line-height:1.8}
    .bdgc-act{margin:8px 0;border:0;border-radius:12px;padding:9px 16px;font-weight:800;cursor:pointer;background:var(--dh-gold-500,#e8b923);color:#2b2100}
  </style>
  ${goalState ? goalsBlock(goalState) : `<p style="color:var(--dh-ink-soft)">${esc(t('goal_empty'))}</p>`}
  <p style="margin:0 0 8px;color:var(--dh-ink-soft)">${esc(t('bdg_cabinet_sub'))}</p>
  ${thisMonth ? `<button type="button" class="bdgc-act" id="bdgc-ceremony">🎬 ${esc(t('bdg_cabinet_ceremony'))}</button>` : `<p>${esc(t('bdg_cabinet_empty'))}</p>`}
  <div class="bdgc-grid">${cards}</div><div class="bdgc-info" id="bdgc-info"></div><p style="color:var(--dh-ink-soft);font-size:.8rem">${esc(t('bdg_cabinet_tap'))}</p>`;
  container.querySelectorAll('.gl-card:not(.locked)').forEach(c => c.addEventListener('click', () => {
    const g = goalState.earned.find(e => e.id === c.dataset.id); if (g) playBadge(goalToReveal(g, goalState), student);
  }));
  if (goalState) maybeShowNewGoals(student);
  container.querySelector('#bdgc-ceremony')?.addEventListener('click', () => showCeremony(thisMonth.earned, student));
  container.querySelector('.bdgc-grid').onclick = (e) => {
    const c = e.target.closest('.bdgc-card'); if (!c) return;
    const def = BADGE_DEFS.find(d => d.key === c.dataset.k), info = container.querySelector('#bdgc-info');
    const cur = thisMonth && thisMonth.earned.find(r => r.key === def.key);
    info.style.display = 'block';
    info.innerHTML = `<b>${esc(t('bdg_' + def.key + '_name'))}</b> — ${esc(t('bdg_' + def.key + '_desc'))}<br>
      ${esc(t('bdg_cabinet_thresholds'))}: ${esc(tf('bdg_rep_tiers_line', { a: num(def.th[0]), b: num(def.th[1]), c: num(def.th[2]), d: num(def.th[3]) }))}
      ${cur ? `<br><button type="button" class="bdgc-act" id="bdgc-replay">${esc(t('bdg_cabinet_replay'))}</button>` : ''}`;
    info.querySelector('#bdgc-replay')?.addEventListener('click', () => playBadge(cur, student));
  };
}
