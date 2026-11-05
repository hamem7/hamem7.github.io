// =============================================================================
// reports/reportCard.js
// بطاقة «متابعة ولي الأمر» — «صورة واتساب» الجديدة للتقرير الفردي (النموذج أ المعتمد في
// previews/indiv-report-proposals.html، التبويب ②). تُبنى بالكامل من بيانات buildReportData()
// الحقيقية: لا بيانات تجريبية.
//
// ما يخص هذا الملف:
//   • computeHomeTask(d, deps): «مهمتكم في البيت» من آيات الأخطاء الفعلية + درجة الاختبار + حجم نطاق الاختبار.
//   • buildCardHtml(d, deps): نص HTML البطاقة (عرض 540px، تُلتقط ×2 = 1080).
// يستقبل deps (دوال مساعدة من report.js) بدل استيرادها حتى لا يحدث استيراد دائري.
// النصوص كلها عبر t()/tf() بمفاتيح rc_* و rep_tb_home_* في core/i18n.js (عربي/إنجليزي، مذكر/مؤنث).
//
// 🗂️ أرشفة التصميم السابق: الصورة المختصرة القديمة (الورقة بعد إخفاء جدول الأسئلة) ما زالت في report.js
// (exportPngLegacy) ويُرجَع إليها بتغيير PNG_DESIGN_DEFAULT إلى 'legacy' هناك، أو مؤقتًا من المتصفح:
// localStorage.setItem('dh_report_png_design','legacy'). آخر إصدار قبل التغيير: الإيداع 50d811d.
// =============================================================================
import { AppState } from '../core/app.js';
import { t, tf, surahNamesLocal } from '../core/i18n.js';

const isEn = () => AppState.currentLang === 'en';

// ---------- عدّادات بتمييز العدد العربي (1 سؤال، 2 سؤالان، 3–10 أسئلة، 11+ سؤالًا) ----------
function unitLabel(n, base){
  if (isEn()) return `${n} ${t(base + (n === 1 ? '_one' : '_many'))}`;
  if (n === 1) return t(base + '_one');
  if (n === 2) return t(base + '_two');
  return `${n} ${n <= 10 ? t(base + '_few') : t(base + '_many')}`;
}
// «بنقطة» / «بنقطتين» / «بـ 7 نقاط»  |  "1 point" / "7 points"
function pointsBy(n){
  if (isEn()) return t(n === 1 ? 'rc_by_one' : 'rc_by_many').replace('{n}', n);
  if (n === 1) return t('rc_by_one');
  if (n === 2) return t('rc_by_two');
  return tf(n <= 10 ? 'rc_by_few' : 'rc_by_many', { n });
}
// «4 من 8 أسئلة» — الجزء الأول: 1 «سؤالًا واحدًا»، 2 «سؤالين»، غير ذلك الرقم (العربية)
function kOfN(k, n){
  if (isEn()) return { k: String(k), n: `${n} ${t(n === 1 ? 'rc_q_one' : 'rc_q_many')}` };
  return { k: k === 1 ? 'سؤالًا واحدًا' : k === 2 ? 'سؤالين' : String(k), n: n === 1 ? 'سؤال واحد' : n === 2 ? 'سؤالين' : unitLabel(n, 'rc_q') };
}

// ---------- صياغة حسب الجنس (student.gender: boy/girl؛ غير المسجَّل = مذكر كما في بقية المنصة) ----------
function genderParams(d){
  const girl = d.gender === 'girl';
  const first = String(d.name || '').trim().split(/\s+/)[0] || d.name; // الاسم الأول في الجمل (الاسم الكامل في الترويسة)
  if (isEn()) return { name: first, he: girl ? 'she' : 'he', him: girl ? 'her' : 'him' };
  return {
    name: first, g: girl ? 'ت' : '', reads: girl ? 'تقرأ' : 'يقرأ', says: girl ? 'تسمّع' : 'يسمّع',
    him: girl ? 'لها' : 'له', praise: girl ? 'ها' : 'ه', needs: girl ? 'تحتاج' : 'يحتاج',
    knows: girl ? 'حفظت' : 'حفظ', struggles: girl ? 'تتعثّر' : 'يتعثّر', bless: girl ? 'فيها' : 'فيه'
  };
}

// ---------- مستويات الرسالة (امتداد لـ getTier بمستوى «ضعيف جدًا» أقل من 30%) ----------
function band5(score){
  return score >= 90 ? 'excellent' : score >= 75 ? 'good' : score >= 60 ? 'average' : score >= 30 ? 'weak' : 'veryweak';
}
// الرسالة العلوية: جملة قصيرة بلا أرقام (الأرقام في الدائرة والمربعات) ولا تكرار لما تحتها
function cardMessage(d){
  if (d.score >= 100) return tf('rc_msg_perfect', genderParams(d));
  return tf('rc_msg_' + band5(d.score), genderParams(d));
}

// ---------- آيات المراجعة من أسئلة الاختبار الفعلية ----------
// الخطأ أولًا ثم ما احتاج مساعدة (تلميح/إعادة ترتيب)، بترتيب ورودها
function problemQuestions(d){
  const led = d.ledger || [];
  return led.filter(r => r.status === 'wrong').concat(led.filter(r => r.status === 'hint' || r.status === 'reorder'));
}
const HW_MAX = 6; // أقصى بنود في مهمة البيت؛ الباقي يُؤجَّل لأسبوع تالٍ

// بنود المراجعة: { s: اسم السورة الخام, a, b } لمدى آيات، أو { s } لسورة بلا آية محددة (الترتيب/الربط/المتشابهات...)
function reviewEntries(d, deps){
  const entries = [], seen = new Set();
  const push = e => { const k = `${e.s}|${e.a || ''}|${e.b || ''}`; if (!seen.has(k)) { seen.add(k); entries.push(e); } };
  problemQuestions(d).forEach(r => {
    if (!r.surahRaw) return;
    const v = deps.focusVerseInfo(r.qType, r.ayahNum, r.reciteRanges);
    if (v && v.nums) v.nums.forEach(n => push({ s: r.surahRaw, a: n, b: n }));
    else if (v && v.ranges) v.ranges.forEach(rg => push({ s: r.surahRaw, a: rg[0], b: rg[1] }));
    else push({ s: r.surahRaw });
  });
  // سورة لها آيات محددة لا تُكرَّر كبند «سورة بلا آية»
  const withAyah = new Set(entries.filter(e => e.a).map(e => e.s));
  return entries.filter(e => e.a || !withAyah.has(e.s));
}

// «الآيات 12–15 و27 من سورة الملك» (مع دمج المتجاورة) — وللبند بلا آية «سورة الملك»
function formatEntries(entries, deps){
  const bySurah = new Map();
  entries.forEach(e => { if (!bySurah.has(e.s)) bySurah.set(e.s, []); if (e.a) bySurah.get(e.s).push([e.a, e.b]); });
  const parts = [];
  bySurah.forEach((ranges, surah) => {
    const name = surahNamesLocal(surah);
    if (!ranges.length) { parts.push(tf('rp_loc_surah', { name })); return; }
    ranges.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    const merged = [];
    ranges.forEach(rg => { const l = merged[merged.length - 1]; (l && rg[0] <= l[1] + 1) ? (l[1] = Math.max(l[1], rg[1])) : merged.push([rg[0], rg[1]]); });
    const count = merged.reduce((sum, rg) => sum + (rg[1] - rg[0] + 1), 0);
    const txt = deps.focusJoin(merged.map(rg => rg[0] === rg[1] ? String(rg[0]) : `${rg[0]}–${rg[1]}`));
    parts.push(tf(count === 1 ? 'rc_ay_one' : count === 2 ? 'rc_ay_two' : 'rc_ay_many', { r: txt, s: name }));
  });
  return deps.focusJoin(parts);
}

// نطاق صغير (≈ حتى صفحتين، 30 آية فأقل) ← يُتلى كله؛ أكبر أو مجهول الحجم ← صفحة واحدة كل يوم
const SMALL_SCOPE_AYAHS = 30;
function isSmallScope(d){ return d.scopeAyahCount > 0 && d.scopeAyahCount <= SMALL_SCOPE_AYAHS; }

// «مهمتكم في البيت»: { minutes, head, text, key }
//   الأسلوب والمدة من درجة الاختبار، وماذا يراجعون من آيات الخطأ ثم المساعدة (حتى 6 بنود)،
//   وهل يُتلى النطاق كله أم صفحة كل يوم من حجم نطاق الاختبار. الآيات كلها من نطاق الاختبار نفسه.
export function computeHomeTask(d, deps){
  const band = band5(d.score);
  const problems = problemQuestions(d);
  const entries = reviewEntries(d, deps);
  const shown = entries.slice(0, HW_MAX);
  const more = entries.length > HW_MAX;
  const small = isSmallScope(d);
  const P = genderParams(d);
  Object.assign(P, { ayat: shown.length ? formatEntries(shown, deps) : '', tail: more ? t('rc_hw_tail') : '' });
  const plural = shown.length > 1 || (shown[0] && shown[0].a && shown[0].b > shown[0].a);
  if (isEn()) P.it = plural ? 'them' : 'it';

  const minutes = (band === 'weak' || band === 'veryweak' || entries.length > 10) ? 10 : 5;
  let key;
  if (!problems.length) key = 'perfect_' + (small ? 'small' : 'large');
  else if (!entries.length) key = 'nodata';
  else if (band === 'veryweak') key = 'veryweak_' + (small ? 'small' : 'large');
  else key = band; // weak / average / good / excellent

  if (key === 'veryweak_large' && !P.ayat) P.ayat = t('rc_hw_one_page');
  const text = tf('rc_hw_' + key, P);
  const head = tf(minutes === 10 ? 'rc_hw_head_together' : 'rc_hw_head', { m: unitLabel(minutes, 'rc_min') });
  return { minutes, head, text, key };
}

// ---------- مساعدات العرض ----------
const clockSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#f0d878" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const homeSvg = '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M10 20v-6h4v6"/></svg>';
function starIcon(on){
  return `<svg viewBox="0 0 20 20"><path d="M10 1.6l2.5 5.3 5.6.7-4.1 4 1.1 5.6L10 14.5l-5.1 2.7 1.1-5.6-4.1-4 5.6-.7z" ${on ? 'fill="#d4af37"' : 'fill="none" stroke="#d9cfb8" stroke-width="1.5"'}/></svg>`;
}
function ringSvg(score, color){
  const r = 42, c = 2 * Math.PI * r, off = c * (1 - Math.max(0, Math.min(100, score)) / 100);
  return `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="${r}" fill="none" stroke="#ece4d2" stroke-width="8"/><circle cx="50" cy="50" r="${r}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/></svg>`;
}

// آخر التقييمات: حتى تقييمين سابقين (من الأقدم) + اليوم — d.ladder مبنية أصلًا من history_<id> بقواعد
// الاستبعاد نفسها (الواجبات وجلسات علاج الأخطاء لا تدخل)
function trendOf(d){
  const prev = (d.ladder || []).filter(s => !s.isCurrent).slice(0, 2).reverse();
  if (!prev.length) return { bars: [], text: t('rc_tr_first'), cls: 'flat' };
  const last = prev[prev.length - 1].score, diff = d.score - last, ad = Math.abs(diff);
  let text;
  if (ad === 0) text = tf('rc_tr_same', { last });
  else if (ad <= 2) text = tf('rc_tr_flat', { dir: t(diff < 0 ? 'rc_dir_lower' : 'rc_dir_higher'), by: pointsBy(ad), last });
  else text = tf(diff > 0 ? 'rc_tr_up' : 'rc_tr_down', { by: pointsBy(ad), last });
  const bars = prev.map(s => ({ p: s.score, w: String(s.dateShort || '').slice(0, 5) }));
  bars.push({ p: d.score, w: t('rc_today'), cur: true });
  return { bars, text, cls: ad <= 2 ? 'flat' : diff > 0 ? 'up' : 'down' };
}

// سبب المراجعة بلغة ولي الأمر
function reasonOf(r, deps){
  const ty = String(r.qType || '');
  if (/^(next|listen_next)$/.test(ty)) return t('rc_why_next');
  if (ty === 'previous') return t('rc_why_prev');
  if (/^(complete_ayah|written_blank)$/.test(ty)) return t('rc_why_complete');
  return deps.stripLeadingEmoji(r.type || '');
}
function reviewList(d, deps){
  const out = [], seen = new Set();
  problemQuestions(d).forEach(r => {
    const v = deps.focusVerseInfo(r.qType, r.ayahNum, r.reciteRanges);
    let label = '';
    if (v && v.nums) label = tf('rc_ayah', { n: v.nums[0] });
    else if (v && v.ranges) label = tf('rc_ayah', { n: v.ranges[0][0] === v.ranges[0][1] ? v.ranges[0][0] : `${v.ranges[0][0]}–${v.ranges[0][1]}` });
    else if (r.surahRaw) label = tf('rp_loc_surah', { name: surahNamesLocal(r.surahRaw) });
    const reason = reasonOf(r, deps);
    const k = label + '|' + reason;
    if (seen.has(k) || (!label && !reason)) return;
    seen.add(k);
    out.push({ label, reason });
  });
  return out.slice(0, 3);
}

// ---------- HTML البطاقة ----------
export function buildCardHtml(d, deps){
  const E = deps.escapeHtml, en = isEn(), girl = d.gender === 'girl';
  const P = genderParams(d);
  const hw = computeHomeTask(d, deps);
  const hwText = (d.homeTaskOverride && d.homeTaskOverride.trim()) || hw.text;
  const tr = trendOf(d);
  const trendCol = { up: '#0d5c46', down: '#9e3b2d', flat: '#6f644e' }[tr.cls];
  const col = d.toneColor;

  const bars = tr.bars.map(b => `<div class="bar${b.cur ? ' cur' : ''}"><b>${b.p}%</b><i style="height:${(b.p * 0.486).toFixed(1)}px"></i>${E(b.w)}</div>`).join('');

  // ما أتقنه اليوم: أسطر من بيانات اليوم الفعلية فقط
  const n = (d.ledger || []).length, full = d.counts.full;
  const good = [];
  if (full > 0) good.push(tf('rc_m_full', Object.assign({ g: girl ? 'ت' : '' }, kOfN(full, n))));
  else if (n > 0) good.push(tf('rc_m_done', { g: girl ? 'ت' : '' }));
  if (d.stats && d.stats.avgTime && d.stats.avgTime !== '—') good.push(tf('rc_m_avg', { t: d.stats.avgTime }));

  const rev = reviewList(d, deps);
  const revHtml = rev.length
    ? rev.map(x => `<li>${x.label ? `<b>${E(x.label)}</b>${x.reason ? ': ' : ''}` : ''}${E(x.reason)}</li>`).join('')
    : `<li>${E(t('rc_no_review'))}</li>`;

  // الصورة من ملف الطالب، وإلا إيموجي، وإلا أول حرف من اسمه
  const av = d.avatar || { type: 'letter', value: (d.name || '؟').charAt(0) };
  const avHtml = av.type === 'image' ? `<img src="${E(av.value)}" alt="">` : E(av.value);

  const hasDur = d.stats && d.stats.totalTime && d.stats.totalTime !== '—';
  const stampSrc = d.teacher && d.teacher.stamp ? (d.teacher.stampClean || d.teacher.stamp) : '';
  const stars = [0, 1, 2].map(i => starIcon(i < d.stars)).join('');

  return `<div class="rc" id="rc-card" dir="${en ? 'ltr' : 'rtl'}" style="--tc:${col}">
    <div class="band"><div class="gorn"></div>
      <div class="brandrow">
        <div class="b"><img src="assets/brand/ham-logo-light.svg" alt="">${E(t('rc_title'))}</div>
        <div class="dt">${E(d.dateLong || d.date)}${d.dateHijriLatn ? '<br>' + E(d.dateHijriLatn) : ''}</div>
      </div>
      <div class="hello"><div class="av">${avHtml}</div>
        <div><div class="nm">${E(d.name)}</div>
          <div class="chips">${d.scope ? `<span class="scope">${E(deps.localizeGenerated(d.scope))}</span>` : ''}${n ? `<span class="scope">${E(unitLabel(n, 'rc_q'))}</span>` : ''}${hasDur ? `<span class="scope dur">${clockSvg}${E(tf('rc_test_time', { t: d.stats.totalTime }))}</span>` : ''}</div></div></div>
    </div>
    <div class="body">
      <div class="hero">
        <div class="ring">${ringSvg(d.score, col)}<div class="c">
          <div class="stars">${stars}</div>
          <div class="pct${d.score >= 100 ? ' p3' : ''}" style="color:${col}">${d.score}%</div>
          <div class="tier" style="background:${col}">${E(t('rc_tone_' + d.tier))}</div></div></div>
        <div>
          <div class="msg">${E(cardMessage(d))}</div>
          ${bars ? `<div class="trend">${bars}</div>` : ''}<div class="trendtx" style="color:${trendCol}">${E(tr.text)}</div>
        </div>
      </div>
      <div class="tiles">
        <div class="tile t1"><b>${d.counts.full}</b><span>${E(t('rc_t_full'))}</span></div>
        <div class="tile t2"><b>${d.counts.partial}</b><span>${E(t('rc_t_help'))}</span></div>
        <div class="tile t3"><b>${d.counts.wrong}</b><span>${E(t('rc_t_wrong'))}</span></div>
      </div>
      <div class="two">
        <div class="box"><h5><i style="background:#0d5c46"></i>${E(t(girl ? 'rc_mastered_f' : 'rc_mastered'))}</h5><ul>${good.map(g => `<li>${E(g)}</li>`).join('')}</ul></div>
        <div class="box"><h5><i style="background:#9e3b2d"></i>${E(t('rc_to_review'))}</h5><ul>${revHtml}</ul></div>
      </div>
      <div class="task"><div class="ic">${homeSvg}</div>
        <div><h5>${E(hw.head)}</h5><p>${E(hwText)}</p></div></div>
      <div class="foot">
        <div>${E(t('rc_brand'))}</div>
        <div class="sg"><div><b>${E(d.teacher.name)}</b>${E(t(stampSrc ? 'rep_sign_label_stamp' : 'rep_sign_label_plain'))}</div>${stampSrc ? `<img class="stampimg" src="${E(stampSrc)}" alt="">` : ''}</div>
      </div>
    </div>
  </div>`;
}
