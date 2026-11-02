// components/badgeReveal.js
// =============================================================================
// 🎬 المشهد السينمائي للوسام: وسام يصعد بدوران ثلاثي الأبعاد مع إضاءة وجزيئات تتناسب مع الدرجة، ثم اسم الوسام والدرجة
// وسببه بالرقم الحقيقي وشريط ما بقي للدرجة التالية. يُستدعى بعد نهاية الألعاب/المواجهات/جلسات التجويد (maybeShowNewBadges)
// ومن «خزانة الأوسمة» (replay) ومن حفل نهاية الشهر (showCeremony). مدّته ~4 ثوانٍ ويُتخطّى بلمسة، ويحترم «تقليل الحركة».
// الصوت مكتوم افتراضيًا (localStorage.dh_badge_sound = '1' لتفعيله). الأنماط معزولة تحت #dhBadgeStage.
// =============================================================================
import { AppState, t } from '../core/app.js';
import { tf } from '../core/i18n.js';
import '../core/i18n-badges.js';
import { TIER_KEYS, getBadgeDef } from '../engine/badgesEngine.js';

const STYLE_ID = 'dh-badge-reveal-style';
const CSS = `/* ===== المسرح ===== */
#dhBadgeStage { position: fixed; inset: 0; z-index: 9999; display: none; overflow: hidden; color: #fff; text-align: center;
  --t1: #f6d57a; --t2: #e8b923; --t3: #9a6b00; --glow: 232,185,35; }
#dhBadgeStage.on { display: grid; place-items: center; }
#dhBadgeStage[data-mode="adult"] { background: radial-gradient(120% 90% at 50% 18%, #12382c 0%, #07130f 55%, #020605 100%); }
#dhBadgeStage[data-mode="kids"] { background: radial-gradient(120% 90% at 50% 18%, #5b3fd6 0%, #2a1a74 55%, #130b3d 100%); }
#dhBadgeStage::before { content: ""; position: absolute; inset: 0; background: radial-gradient(60% 50% at 50% 40%, rgba(var(--glow),.18), transparent 70%); opacity: 0; animation: dhbr_fadeIn 1.2s .2s forwards; }
#dhBadgeStage[data-tier="bronze"] { --t1:#e7b58a; --t2:#b87333; --t3:#6b3d17; --glow:184,115,51; }
#dhBadgeStage[data-tier="silver"] { --t1:#f4f7fb; --t2:#b9c3d1; --t3:#6d7787; --glow:185,195,209; }
#dhBadgeStage[data-tier="gold"]   { --t1:#fff0b3; --t2:#e8b923; --t3:#9a6b00; --glow:232,185,35; }
#dhBadgeStage[data-tier="diamond"]{ --t1:#e0f7ff; --t2:#7dd3fc; --t3:#6366f1; --glow:125,211,252; }
#dhBadgeStage canvas.fx { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
#dhBadgeStage .content { position: relative; display: grid; gap: 10px; justify-items: center; padding: 20px; width: min(520px, 100%); perspective: 900px; }
#dhBadgeStage .rays { position: absolute; top: 12%; left: 50%; width: 120vmin; height: 120vmin; margin-left: -60vmin; border-radius: 50%; opacity: 0;
  background: repeating-conic-gradient(from 0deg, rgba(var(--glow),.22) 0 6deg, transparent 6deg 18deg);
  -webkit-mask: radial-gradient(circle, #000 0 22%, transparent 62%); mask: radial-gradient(circle, #000 0 22%, transparent 62%);
  animation: dhbr_fadeIn 1.4s .5s forwards, dhbr_spin 40s linear infinite; }
#dhBadgeStage .kicker { font-size: .95rem; letter-spacing: .08em; font-weight: 700; color: rgba(255,255,255,.75); opacity: 0; animation: dhbr_up .6s .15s forwards; }
#dhBadgeStage .medal { width: min(46vw, 210px); filter: drop-shadow(0 18px 30px rgba(0,0,0,.55)) drop-shadow(0 0 28px rgba(var(--glow),.55));
  opacity: 0; transform: translateY(160px) scale(.45) rotateY(720deg); animation: dhbr_rise 1.5s .35s cubic-bezier(.2,.9,.25,1.05) forwards, dhbr_bob 3.2s 2s ease-in-out infinite; }
#dhBadgeStage[data-mode="kids"] .medal { width: min(56vw, 250px); }
#dhBadgeStage .shine { transform: translateX(-260px) skewX(-18deg); animation: dhbr_sweep 1.1s 1.5s ease-in-out 1 forwards, dhbr_sweep 1.1s 3.6s ease-in-out 1 forwards; }
#dhBadgeStage .name { font-size: clamp(1.9rem, 6vw, 2.6rem); font-weight: 800; margin: 6px 0 0; opacity: 0; animation: dhbr_up .7s 1.5s forwards;
  background: linear-gradient(180deg, #fff, rgb(var(--glow))); -webkit-background-clip: text; background-clip: text; color: transparent; }
#dhBadgeStage[data-mode="kids"] .name { font-size: clamp(2.1rem, 7vw, 3rem); }
#dhBadgeStage .tierchip { display: inline-block; padding: 4px 16px; border-radius: 999px; font-weight: 800; font-size: .9rem; color: #1a1300; opacity: 0; animation: dhbr_pop .5s 1.8s forwards;
  background: linear-gradient(135deg, var(--t1), var(--t2)); }
#dhBadgeStage .who { font-size: 1.15rem; font-weight: 700; opacity: 0; animation: dhbr_up .6s 2.0s forwards; }
#dhBadgeStage .why { font-size: 1.02rem; line-height: 1.8; color: rgba(255,255,255,.85); max-width: 30em; opacity: 0; animation: dhbr_up .6s 2.3s forwards; }
#dhBadgeStage .why em { font-style: normal; font-weight: 800; color: rgb(var(--glow)); font-size: 1.2em; }
#dhBadgeStage .prog { width: min(360px, 86%); display: grid; gap: 6px; opacity: 0; animation: dhbr_up .6s 2.7s forwards; }
#dhBadgeStage .prog .bar { height: 10px; border-radius: 999px; background: rgba(255,255,255,.14); overflow: hidden; }
#dhBadgeStage .prog .bar i { display: block; height: 100%; width: 0; border-radius: inherit; background: linear-gradient(90deg, var(--t2), var(--t1)); transition: width 1.4s 3s cubic-bezier(.2,.8,.2,1); }
#dhBadgeStage.shown .prog .bar i { width: var(--p, 60%); }
#dhBadgeStage .prog small { color: rgba(255,255,255,.7); font-size: .85rem; }
#dhBadgeStage .next { margin-top: 8px; border: 0; border-radius: 14px; padding: 12px 34px; font-size: 1.05rem; font-weight: 800; cursor: pointer; opacity: 0; animation: dhbr_up .6s 3.1s forwards;
  background: linear-gradient(135deg, var(--t1), var(--t2)); color: #1a1300; }
#dhBadgeStage .x { position: absolute; top: 14px; inset-inline-end: 14px; z-index: 3; background: rgba(255,255,255,.12); border: 0; color: #fff; width: 38px; height: 38px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; }
#dhBadgeStage /* لوحة الحفل */
.board { position: relative; display: grid; gap: 14px; justify-items: center; width: min(560px, 94vw); padding: 20px; }
#dhBadgeStage .board .ttl2 { margin: 0; font-size: 1.7rem; opacity: 0; animation: dhbr_up .6s .2s forwards; }
#dhBadgeStage .board .count { font-size: 4rem; font-weight: 800; line-height: 1; color: #f6d57a; opacity: 0; animation: dhbr_pop .6s .5s forwards; }
#dhBadgeStage .board .grid { display: flex; flex-wrap: wrap; gap: 14px; justify-content: center; }
#dhBadgeStage .board .mini { width: 92px; display: grid; justify-items: center; gap: 4px; font-size: .8rem; opacity: 0; transform: scale(.4); animation: dhbr_pop .55s forwards; }
#dhBadgeStage .board .mini svg { width: 84px; filter: drop-shadow(0 6px 10px rgba(0,0,0,.5)); }
#dhBadgeStage .board p { margin: 0; color: rgba(255,255,255,.8); opacity: 0; animation: dhbr_up .6s 1.7s forwards; }

@keyframes dhbr_fadeIn { to { opacity: 1; } }
@keyframes dhbr_up { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes dhbr_pop { 0% { opacity: 0; transform: scale(.4); } 70% { transform: scale(1.12); } 100% { opacity: 1; transform: scale(1); } }
@keyframes dhbr_rise { to { opacity: 1; transform: translateY(0) scale(1) rotateY(0); } }
@keyframes dhbr_bob { 0%,100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-9px) rotate(1.5deg); } }
@keyframes dhbr_sweep { to { transform: translateX(300px) skewX(-18deg); } }
@keyframes dhbr_spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  #dhBadgeStage .medal, #dhBadgeStage .rays, #dhBadgeStage .kicker, #dhBadgeStage .name, #dhBadgeStage .tierchip, #dhBadgeStage .who, #dhBadgeStage .why, #dhBadgeStage .prog, #dhBadgeStage .next, #dhBadgeStage .board * { animation-duration: .01s !important; animation-delay: 0s !important; }
#dhBadgeStage .shine { display: none; }
#dhBadgeStage canvas.fx { display: none; }
}
`;

const isEn = () => AppState.currentLang === 'en';
const num = (n) => (isEn() ? String(n) : Number(n).toLocaleString('ar-EG', { useGrouping: false }));
const fixDigits = (s) => (isEn() ? s : String(s).replace(/\d+/g, d => Number(d).toLocaleString('ar-EG', { useGrouping: false })));
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const firstName = (s) => String(s || '').trim().split(/\s+/)[0] || '';
const VARS = { bronze: '--t1:#e7b58a;--t2:#b87333;--t3:#6b3d17', silver: '--t1:#f4f7fb;--t2:#b9c3d1;--t3:#6d7787', gold: '--t1:#fff0b3;--t2:#e8b923;--t3:#9a6b00', diamond: '--t1:#e0f7ff;--t2:#7dd3fc;--t3:#6366f1' };

export const TIER_VARS = VARS;
let uid = 0, fxRAF = 0, actx = null, stage = null;

function ensureStage() {
  if (!document.getElementById(STYLE_ID)) { const st = document.createElement('style'); st.id = STYLE_ID; st.textContent = CSS; document.head.appendChild(st); }
  if (!stage || !stage.isConnected) { stage = document.createElement('div'); stage.id = 'dhBadgeStage'; stage.setAttribute('role', 'dialog'); stage.setAttribute('aria-live', 'polite'); document.body.appendChild(stage); }
  return stage;
}

export function medalSVG(icon, tierKey) {
  const id = ++uid, stars = TIER_KEYS.indexOf(tierKey) + 1;
  const starRow = Array.from({ length: stars }, (_, i) => `<text x="${100 + (i - (stars - 1) / 2) * 20}" y="186" font-size="15" text-anchor="middle" fill="#fff7d6">★</text>`).join('');
  return `<svg viewBox="0 0 200 250" role="img" aria-hidden="true"><defs>
    <linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--t1)"/><stop offset=".5" stop-color="var(--t2)"/><stop offset="1" stop-color="var(--t3)"/></linearGradient>
    <linearGradient id="h${id}" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--t3)"/><stop offset=".55" stop-color="var(--t2)"/><stop offset="1" stop-color="var(--t1)"/></linearGradient>
    <clipPath id="c${id}"><circle cx="100" cy="100" r="82"/></clipPath></defs>
    <polygon points="62,150 100,150 84,244 66,226 44,236" fill="#b3261e"/><polygon points="100,150 138,150 156,236 134,226 116,244" fill="#8f1d17"/>
    <circle cx="100" cy="100" r="90" fill="url(#g${id})"/><circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>
    <circle cx="100" cy="100" r="72" fill="url(#h${id})"/><circle cx="100" cy="100" r="72" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2.5"/>
    <circle cx="100" cy="100" r="64" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.5" stroke-dasharray="3 5"/>
    <text x="100" y="124" font-size="78" text-anchor="middle">${icon}</text>${starRow}
    <g clip-path="url(#c${id})"><rect class="shine" x="-30" y="0" width="38" height="200" fill="rgba(255,255,255,.55)"/></g></svg>`;
}

function stopFx() { cancelAnimationFrame(fxRAF); fxRAF = 0; }
function startFx(cv, tierKey, mode) {
  if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = cv.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 2);
  const W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
  const idx = TIER_KEYS.indexOf(tierKey), count = [40, 80, 150, 230][idx] * (mode === 'kids' ? 1.2 : 1);
  const tierCols = { bronze: ['#e7b58a', '#b87333', '#fff'], silver: ['#f4f7fb', '#b9c3d1', '#fff'], gold: ['#fff0b3', '#e8b923', '#fff'], diamond: ['#e0f7ff', '#7dd3fc', '#a5b4fc', '#fff'] }[tierKey];
  const cols = mode === 'kids' ? ['#ff5d8f', '#ffd23f', '#3ddc97', '#4cc9f0', '#b388ff', '#ff9f1c'] : tierCols;
  const cx = W / 2, cy = H * 0.38, ps = [], t0 = performance.now();
  let burst = false;
  const spawn = () => { for (let i = 0; i < count; i++) { const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.25, sp = (6 + Math.random() * 11) * dpr;
    ps.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: .22 * dpr, w: (5 + Math.random() * 7) * dpr * (mode === 'kids' ? 1.3 : 1), h: (3 + Math.random() * 5) * dpr, r: Math.random() * 6.28, vr: (Math.random() - .5) * .35, c: cols[Math.floor(Math.random() * cols.length)], shape: mode === 'kids' ? Math.floor(Math.random() * 3) : 0, life: 1, drag: .985 }); } };
  const sparkle = () => ps.push({ x: Math.random() * W, y: -10, vx: (Math.random() - .5) * 1.2 * dpr, vy: (1.2 + Math.random() * 1.6) * dpr, g: .004, w: (3 + Math.random() * 4) * dpr, h: 0, r: 0, vr: 0, c: '#fff', shape: 3, life: 1, drag: 1 });
  const frame = (now) => {
    const tt = now - t0; ctx.clearRect(0, 0, W, H);
    if (!burst && tt > 1500) { burst = true; spawn(); }
    if (tt > 1500 && tt < 5200 && idx >= 2 && Math.random() < (idx === 3 ? .6 : .25)) sparkle();
    for (let i = ps.length - 1; i >= 0; i--) { const p = ps[i];
      p.vx *= p.drag; p.vy = p.vy * p.drag + p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; if (tt > 4200) p.life -= .02;
      if (p.y > H + 30 || p.life <= 0) { ps.splice(i, 1); continue; }
      ctx.save(); ctx.globalAlpha = Math.max(p.life, 0); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c;
      if (p.shape === 0) ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); else if (p.shape === 1) { ctx.beginPath(); ctx.arc(0, 0, p.w / 2, 0, 6.283); ctx.fill(); }
      else if (p.shape === 2) { ctx.font = `${p.w * 2}px serif`; ctx.fillText('★', -p.w, p.w); } else { ctx.font = `${p.w * 2.6}px serif`; ctx.fillText('✦', -p.w, p.w); }
      ctx.restore(); }
    if (tt < 9000) fxRAF = requestAnimationFrame(frame); else stopFx();
  };
  fxRAF = requestAnimationFrame(frame);
}

function chime(tierKey) {
  try { if (localStorage.getItem('dh_badge_sound') !== '1') return; } catch (e) { return; }
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99, 1046.5, 1318.5].slice(0, TIER_KEYS.indexOf(tierKey) + 2).forEach((f, i) => {
      const o = actx.createOscillator(), g = actx.createGain(), tm = actx.currentTime + 1.3 + i * .16;
      o.type = 'triangle'; o.frequency.value = f; g.gain.setValueAtTime(0, tm); g.gain.linearRampToValueAtTime(.18, tm + .02); g.gain.exponentialRampToValueAtTime(.0001, tm + 1.2);
      o.connect(g).connect(actx.destination); o.start(tm); o.stop(tm + 1.3);
    });
  } catch (e) { /* الصوت اختياري */ }
  try { navigator.vibrate && navigator.vibrate([40, 40, 80]); } catch (e) { /* اختياري */ }
}

function closeStage() { stopFx(); if (stage) { stage.classList.remove('on', 'shown'); stage.innerHTML = ''; } document.body.style.overflow = ''; }

/** مشهد وسام واحد. r = {key, icon, tier, tierKey, value, next}. opts.btn = نص الزر. يحلّ الوعد عند «التالي» أو الإغلاق. */
export function playBadge(r, student, opts = {}) {
  return new Promise((resolve) => {
    const st = ensureStage(), mode = AppState.isKidsMode ? 'kids' : 'adult';
    st.dataset.mode = mode; st.dataset.tier = r.tierKey; st.className = 'on'; st.classList.remove('shown'); document.body.style.overflow = 'hidden';
    const def = getBadgeDef(r.key), tierName = t('bdg_tier_' + r.tierKey);
    const reason = esc(tf('bdg_reason', { desc: t('bdg_' + r.key + '_desc'), n: `@@${num(Math.round(r.value))}@@` })).replace(/@@(.+?)@@/, '<em>$1</em>');
    let prog = '';
    if (r.next && r.tier < 3) {
      const nextTier = t('bdg_tier_' + TIER_KEYS[r.tier + 1]), pct = Math.max(8, Math.min(95, Math.round((r.value / r.next.at) * 100)));
      prog = `<div class="prog" style="--p:${pct}%"><div class="bar"><i></i></div><small>${esc(tf('bdg_next_left', { k: num(Math.ceil(r.next.remaining)), tier: nextTier }))}</small></div>`;
    }
    st.innerHTML = `<canvas class="fx"></canvas><button class="x" aria-label="${esc(t('bdg_close'))}">✕</button>
      <div class="content"><div class="rays"></div><div class="kicker">${esc(t('bdg_kicker'))}</div>
      <div class="medal">${medalSVG(def ? def.icon : r.icon, r.tierKey)}</div>
      <div class="name" role="heading" aria-level="2">${esc(t('bdg_' + r.key + '_name'))}</div>
      <span class="tierchip">${esc(tf('bdg_tier_chip', { tier: tierName }))}</span>
      <div class="who">${esc(firstName(student && student.name))}</div>
      <p class="why">${reason}</p>${prog}
      <button class="next">${esc(opts.btn || t('bdg_continue'))}</button></div>`;
    startFx(st.querySelector('canvas'), r.tierKey, mode); chime(r.tierKey);
    setTimeout(() => st.classList.add('shown'), 60);
    const keep = !!opts.keepOpen;
    st.querySelector('.next').onclick = () => { if (!keep) closeStage(); else stopFx(); resolve('next'); };
    st.querySelector('.x').onclick = () => { closeStage(); resolve('closed'); };
  });
}

/** أوسمة جديدة بالتتابع (واحد لكل وسام، أعلى درجة). */
export async function showBadges(list, student) {
  const items = [...list].sort((a, b) => b.tier - a.tier);
  for (let i = 0; i < items.length; i++) {
    const last = i === items.length - 1;
    const res = await playBadge(items[i], student, { keepOpen: !last, btn: last ? t('bdg_continue') : t('bdg_next') });
    if (res === 'closed') return;
  }
}

/** حفل الشهر: كل أوسمة الشهر بالتتابع ثم لوحة ختامية بعدّاد وأوسمة مصغّرة. */
export async function showCeremony(earned, student) {
  const items = [...earned].sort((a, b) => b.tier - a.tier);
  if (!items.length) return;
  for (let i = 0; i < items.length; i++) {
    const res = await playBadge(items[i], student, { keepOpen: true, btn: i === items.length - 1 ? t('bdg_summary') : t('bdg_next') });
    if (res === 'closed') return;
  }
  const st = ensureStage(), mode = AppState.isKidsMode ? 'kids' : 'adult';
  stopFx(); st.dataset.tier = 'gold'; st.dataset.mode = mode;
  const minis = items.map((r, i) => `<div class="mini" style="${VARS[r.tierKey]};animation-delay:${.8 + i * .2}s">${medalSVG(r.icon, r.tierKey).replace('class="shine"', 'class="shine" style="display:none"')}<span>${esc(t('bdg_' + r.key + '_name'))}</span></div>`).join('');
  st.innerHTML = `<canvas class="fx"></canvas><button class="x" aria-label="${esc(t('bdg_close'))}">✕</button>
    <div class="board"><div class="ttl2" role="heading" aria-level="2">${esc(t('bdg_board_title'))}</div><div class="count" id="dhBadgeCount">0</div><div>${esc(t('bdg_board_count'))}</div>
    <div class="grid">${minis}</div><p>${esc(t('bdg_board_note'))}</p><button class="next" style="animation-delay:2.2s">${esc(t('bdg_close'))}</button></div>`;
  startFx(st.querySelector('canvas'), 'gold', mode);
  let n = 0; const el = st.querySelector('#dhBadgeCount');
  const tick = setInterval(() => { n++; if (el) el.textContent = num(Math.min(n, items.length)); if (n >= items.length) clearInterval(tick); }, 380);
  const end = () => { clearInterval(tick); closeStage(); };
  st.querySelector('.next').onclick = end; st.querySelector('.x').onclick = end;
}

/** نقطة الدخول للألعاب/المواجهات/التجويد: تقيّم وتعرض الجديد فقط. لا ترمي أخطاء أبدًا ولا تحجب المستدعي. */
let _queue = Promise.resolve();
export function maybeShowNewBadges(student) {
  if (!student) return;
  // بالتتابع: طالبان في مواجهة واحدة لا يتداخل مشهداهما
  _queue = _queue.then(async () => {
    const svc = await import('../core/badgeService.js');
    const fresh = await svc.awardNewBadges(student);
    if (fresh.length) await showBadges(fresh, student);
  }).catch(e => console.warn('[badgeReveal] تعذّر عرض الأوسمة:', e));
}
