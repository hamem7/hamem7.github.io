// components/badgeCard.js
// =============================================================================
// 🖼️ بطاقة الوسام كصورة PNG (1080×1350) للحفظ أو الإرسال عبر واتساب لولي الأمر. تُرسَم على canvas مباشرة (بلا مكتبات خارجية).
// المشاركة: على الهاتف تفتح قائمة المشاركة بالملف نفسه؛ على الحاسوب تُنزَّل الصورة ثم يُفتح واتساب برسالة جاهزة يرفقها المعلم.
// =============================================================================
import { AppState, t } from '../core/app.js';
import { tf } from '../core/i18n.js';
import '../core/i18n-badges.js';
import { medalSVG } from './badgeReveal.js';
import { getBadgeDef } from '../engine/badgesEngine.js';

const COLORS = { bronze: ['#e7b58a', '#b87333', '#6b3d17'], silver: ['#f4f7fb', '#b9c3d1', '#6d7787'], gold: ['#fff0b3', '#e8b923', '#9a6b00'], diamond: ['#e0f7ff', '#7dd3fc', '#6366f1'] };
const isEn = () => AppState.currentLang === 'en';
const first = (s) => String(s || '').trim().split(/\s+/)[0] || '';
const nf = (n) => (isEn() ? String(n) : Number(n).toLocaleString('ar-EG', { useGrouping: false }));

function medalImage(r) {
  const [c1, c2, c3] = COLORS[r.tierKey];
  const svg = medalSVG(getBadgeDef(r.key) ? getBadgeDef(r.key).icon : r.icon, r.tierKey)
    .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')
    .replace(/var\(--t1\)/g, c1).replace(/var\(--t2\)/g, c2).replace(/var\(--t3\)/g, c3)
    .replace(/<g clip-path[^>]*><rect class="shine"[^>]*\/><\/g>/, '');
  return new Promise((resolve, reject) => {
    const img = new Image(); img.onload = () => resolve(img); img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
function wrap(ctx, text, maxW) {
  const words = String(text).split(/\s+/), lines = []; let line = '';
  for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; } else line = test; }
  if (line) lines.push(line); return lines;
}

export async function buildBadgeCard(r, student) {
  try { await document.fonts.ready; } catch (e) { /* اختياري */ }
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'), kids = !!AppState.isKidsMode, [c1, c2] = COLORS[r.tierKey];
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  if (kids) { bg.addColorStop(0, '#5b3fd6'); bg.addColorStop(1, '#130b3d'); } else { bg.addColorStop(0, '#12382c'); bg.addColorStop(1, '#020605'); }
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 520, 40, W / 2, 520, 520); glow.addColorStop(0, c2 + '66'); glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = c2 + '99'; ctx.lineWidth = 6; ctx.strokeRect(36, 36, W - 72, H - 72);
  const img = await medalImage(r); ctx.drawImage(img, W / 2 - 250, 150, 500, 625);
  const dir = isEn() ? 'ltr' : 'rtl'; ctx.direction = dir; ctx.textAlign = 'center';
  const font = (w, px) => `${w} ${px}px "IBM Plex Sans Arabic", system-ui, sans-serif`;
  ctx.fillStyle = '#ffffffcc'; ctx.font = font(700, 40); ctx.fillText(t('bdg_kicker'), W / 2, 112);
  const g = ctx.createLinearGradient(0, 800, 0, 880); g.addColorStop(0, '#fff'); g.addColorStop(1, c2);
  ctx.fillStyle = g; ctx.font = font(800, 96); ctx.fillText(t('bdg_' + r.key + '_name'), W / 2, 870);
  ctx.fillStyle = c2; ctx.font = font(800, 46); ctx.fillText(tf('bdg_tier_chip', { tier: t('bdg_tier_' + r.tierKey) }), W / 2, 940);
  ctx.fillStyle = '#fff'; ctx.font = font(700, 58); ctx.fillText(first(student && student.name), W / 2, 1030);
  ctx.fillStyle = '#ffffffd9'; ctx.font = font(500, 40);
  const reason = tf('bdg_reason', { desc: t('bdg_' + r.key + '_desc'), n: nf(Math.round(r.value)) });
  wrap(ctx, reason, W - 220).slice(0, 3).forEach((ln, i) => ctx.fillText(ln, W / 2, 1104 + i * 56));
  ctx.fillStyle = '#ffffff99'; ctx.font = font(600, 34); ctx.fillText(t('bdg_card_footer'), W / 2, H - 70);
  return new Promise((resolve) => cv.toBlob(resolve, 'image/png'));
}

// اسم ملف بحروف لاتينية فقط (يسلم من تشويه الأسماء العربية في بعض المتصفحات وتطبيقات المشاركة)
const fileName = (r, student) => `badge-${r.key}-${r.tierKey}-${student && student.id != null ? student.id : 'x'}.png`;
const message = (r, student) => tf('bdg_card_msg', { name: first(student && student.name), badge: t('bdg_' + r.key + '_name'), tier: t('bdg_tier_n_' + r.tierKey) });

function download(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 60000);
}

export async function saveBadgeCard(r, student) {
  const blob = await buildBadgeCard(r, student); if (blob) download(blob, fileName(r, student));
}

export async function shareBadgeCardWhatsApp(r, student) {
  const blob = await buildBadgeCard(r, student); if (!blob) return;
  const file = new File([blob], fileName(r, student), { type: 'image/png' }), msg = message(r, student);
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: msg }); return; }
    catch (e) { if (e && e.name === 'AbortError') return; console.warn('[badgeCard] تعذرت المشاركة المباشرة:', e); }
  }
  download(blob, file.name);
  const ok = typeof window.hamConfirm === 'function' ? await window.hamConfirm(t('bdg_card_wa_note'), { ok: t('bdg_card_wa_btn'), cancel: t('bdg_close') }) : true;
  if (ok) { const u = 'https://wa.me/?text=' + encodeURIComponent(msg); const w = window.open(u, '_blank', 'noopener'); if (!w) location.href = u; }
}
