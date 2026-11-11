// =============================================================================
// reports/parentQaCard.js
// صورة واتساب للتقرير الفردي — نموذج «أسئلة ولي الأمر» (المعتمد من المعلم في
// previews/indiv-report-parent-themes.html). صورة 720×900 (4:5) تُلتقط ×1.5 = 1080×1350
// فتظهر كاملة في فقاعة واتساب دون قصّ. تُبنى بالكامل من بيانات buildReportData() الحقيقية.
//
// المحتوى: الترويسة (الشعار، العنوان، التاريخ، رقم التقرير) ← الطالب (صورته من ملفه وإلا إيموجي
// وإلا أول حرف، والنطاق وعدد الأسئلة والمدة) والنتيجة ← أربعة مربعات بلسان ولي الأمر:
//   ① هل يحفظ السورة/السور/الجزء/المقطع؟  ② أين تعثّر؟  ③ هل تحسّن؟  ④ ماذا نفعل في البيت؟
// ← اسم المعلم يمينًا وختمه يسارًا (من ملف المعلم). بلا ملاحظة المعلم وبلا سطر المنصة في الأسفل.
//
// أربعة تصاميم (t1..t4) تتبدّل تلقائيًا كل 3 شهور حسب تاريخ الاختبار (qaThemeFor)، ويمكن تثبيت
// واحد منها من شريط أدوات التقرير (localStorage: dh_report_qa_theme = auto|t1|t2|t3|t4).
//
// المحتوى يملأ «المساحة الآمنة» لكل تصميم تلقائيًا (fitQaCard) فلا تبقى فراغات، مهما كان عدد الأسئلة.
// النصوص كلها عبر t()/tf() بمفاتيح qa_* في core/i18n.js (عربي/إنجليزي، مذكر/مؤنث بلاحقة _f).
// الخط القرآني غير مستعمل هنا إطلاقًا (أرقام آيات وأسماء سور فقط).
// =============================================================================
import { AppState } from '../core/app.js';
import { t, tf, surahNamesLocal } from '../core/i18n.js';

const isEn = () => AppState.currentLang === 'en';

export const QA_THEMES = ['t1', 't2', 't3', 't4'];
const THEME_KEY = 'dh_report_qa_theme';
// يناير–مارس: 1 · أبريل–يونيو: 2 · يوليو–سبتمبر: 3 · أكتوبر–ديسمبر: 4 (حسب تاريخ الاختبار لا تاريخ اليوم)
export function qaThemeFor(date){
  const d = date instanceof Date && !isNaN(date) ? date : new Date();
  return QA_THEMES[Math.floor(d.getMonth() / 3)];
}
export function getQaThemePref(){
  try { const v = localStorage.getItem(THEME_KEY); if (v === 'auto' || QA_THEMES.includes(v)) return v; } catch (e) { /* تجاهل */ }
  return 'auto';
}
export function setQaThemePref(v){
  try { localStorage.setItem(THEME_KEY, (v === 'auto' || QA_THEMES.includes(v)) ? v : 'auto'); } catch (e) { /* تجاهل */ }
}
export function resolveQaTheme(d){
  const p = getQaThemePref();
  return p === 'auto' ? qaThemeFor(d && d.testDate) : p;
}

// المساحة الآمنة لكل تصميم داخل 720×900: لا تغطي زخارف الخلفية ولا منطقة التذييل
const SAFE = {
  t1: { top: 22, right: 30, bottom: 162, left: 30 },
  t2: { top: 20, right: 28, bottom: 122, left: 28 },
  t3: { top: 26, right: 30, bottom: 114, left: 30 },
  t4: { top: 34, right: 36, bottom: 116, left: 36 }
};

// ---------- صياغة: المؤنث بلاحقة _f إن وُجدت، وتمييز العدد العربي ----------
let girl = false;
function g(key){
  if (girl) { const f = t(key + '_f'); if (f !== key + '_f') return f; }
  return t(key);
}
function gf(key, params){
  let s = g(key);
  Object.keys(params || {}).forEach(k => { s = s.split('{' + k + '}').join(String(params[k])); });
  return s;
}
// صيغ العدد: _one (1) / _two (2) / _few (3–10) / _many (11+) — والإنجليزية _one/_many
function nForm(base, n){
  if (n === 0 && base.startsWith('qa_') && /^qa_(ok|pa|no)$/.test(base)) return t(base + (isEn() ? '_many' : '_few'));
  if (isEn()) return tf(base + (n === 1 ? '_one' : '_many'), { n });
  return tf(base + (n === 1 ? '_one' : n === 2 ? '_two' : n <= 10 ? '_few' : '_many'), { n });
}

// ---------- النطاق: سورة / جزء من سورة / عدة سور / جزء ----------
function scopeInfo(d){
  const surahs = Array.isArray(d.scopeSurahs) ? d.scopeSurahs : [];
  if (d.scopeJuz) return { kind: 'juz', surahs, juz: d.scopeJuz };
  if (surahs.length === 1) {
    const s = surahs[0];
    const partial = s.total > 0 && (s.from > 1 || s.to < s.total);
    return { kind: partial ? 'part' : 'one', surahs };
  }
  if (surahs.length > 1) return { kind: 'few', surahs };
  // بلا مجمّع آيات (مثل جلسة علاج الأخطاء): من سور أسئلة الاختبار نفسها
  const names = [...new Set((d.ledger || []).map(r => r.surahRaw).filter(Boolean))];
  return { kind: names.length > 1 ? 'few' : 'one', surahs: names.map(n => ({ name: n, from: 0, to: 0, total: 0 })) };
}
function scopeLabel(d, sc, deps){
  if (d.isWeakness) return deps.localizeGenerated(d.scope || '');
  const nm = s => surahNamesLocal(s.name);
  if (sc.kind === 'juz') return tf('qa_sc_juz', { n: sc.juz, c: nForm('qa_sn', sc.surahs.length || 1) });
  if (!sc.surahs.length) return deps.localizeGenerated(d.scope || '');
  if (sc.kind === 'part') return tf('qa_sc_part', { s: nm(sc.surahs[0]), a: sc.surahs[0].from, b: sc.surahs[0].to });
  if (sc.kind === 'one') return tf('qa_sc_surah', { s: nm(sc.surahs[0]) });
  if (sc.surahs.length <= 3) return sc.surahs.map(nm).join(' · ');
  return nForm('qa_scm', sc.surahs.length - 1).replace('{s}', nm(sc.surahs[0]));
}

// ---------- ① هل يحفظ؟ ----------
function knowsBox(d, sc){
  const p = d.score, hu = sc.kind === 'juz' || sc.kind === 'part' ? 'hu' : 'ha';
  const ask = { one: 'qa_q1_one', part: 'qa_q1_part', few: 'qa_q1_few', juz: 'qa_q1_juz' }[sc.kind];
  const ans = p >= 90 ? 'qa_k_ex_' + hu : p >= 75 ? 'qa_k_vg_' + hu : p >= 60 ? 'qa_k_g_' + hu : p >= 40 ? 'qa_k_av_' + hu : 'qa_k_low';
  const cls = p >= 60 ? 'ok' : p >= 40 ? 'pa' : 'no';
  return { ask: gf(ask, he()), ans: g(ans), cls };
}

// ---------- ② أين تعثّر؟ ----------
// الأخطاء أولًا ثم ما احتاج مساعدة (تلميح/إعادة ترتيب)، مجمّعة حسب السورة
function problemPlaces(d, deps){
  const by = new Map();
  const add = (r, cls) => {
    const key = r.surahRaw || '';
    if (!by.has(key)) by.set(key, { s: key, items: [], seen: new Set(), loose: 0 });
    const e = by.get(key);
    const v = deps.focusVerseInfo(r.qType, r.ayahNum, r.reciteRanges);
    const labels = v && v.nums ? v.nums.map(String) : v && v.ranges ? v.ranges.map(x => x[0] === x[1] ? String(x[0]) : `${x[0]}–${x[1]}`) : [];
    if (!labels.length) { e.loose++; return; }
    labels.forEach(l => { if (!e.seen.has(l)) { e.seen.add(l); e.items.push({ a: l, cls, n: parseInt(l, 10) || 0 }); } });
  };
  const led = d.ledger || [];
  led.filter(r => r.status === 'wrong').forEach(r => add(r, 'no'));
  led.filter(r => r.status === 'hint' || r.status === 'reorder').forEach(r => add(r, 'pa'));
  return [...by.values()].map(e => ({ s: e.s, items: e.items, count: e.items.length + e.loose }))
    .filter(e => e.count > 0).sort((a, b) => b.count - a.count);
}
// «تسميع السورة من الآية أ إلى الآية ب» (نطاق الاختبار في هذه السورة)، وإن لم يُعرف النطاق نرجع لصيغة العدد
function reciteLabel(e, sc){
  const si = (sc.surahs || []).find(x => x.name === e.s);
  return si && si.from > 0 && si.to >= si.from ? tf('qa_recite_range', { a: si.from, b: si.to }) : nForm('qa_recite', e.count);
}
function placesBox(d, sc, deps){
  const ask = gf('qa_q2', he());
  const groups = problemPlaces(d, deps);
  const all = groups.reduce((a, e) => a + e.count, 0);
  if (!all) return { ask, cls: 'ok', ans: t('qa_none_ans'), det: g('qa_none_det'), vis: `<div class="happy">🌟 ${E(g('qa_none_vis'))}</div>` };
  const ns = groups.filter(e => e.s).length || 1;
  const ans = ns > 1 ? tf('qa_pl_in_many', { p: nForm('qa_place', all), s: nForm('qa_surah', ns) }) : tf('qa_pl_in_one', { p: nForm('qa_place', all) });
  const cls = (d.ledger || []).some(r => r.status === 'wrong') ? 'no' : 'pa';
  const chip = it => `<span class="chip ${it.cls}">${E(tf(/–/.test(it.a) ? 'qa_ayahs' : 'qa_ayah', { n: it.a }))}</span>`;
  let rows = '', det = t('qa_pl_legend');
  const sInfo = sc.surahs.find(s => s.name === groups[0].s);
  // سورة واحدة بأخطاء كثيرة: تجميع حسب أجزاء السورة (أولها/وسطها/آخرها) بدل سرد الأرقام
  if (groups.length === 1 && groups[0].items.length > 6) {
    const from = sInfo && sInfo.from ? sInfo.from : Math.min(...groups[0].items.map(i => i.n));
    const to = sInfo && sInfo.to ? sInfo.to : Math.max(...groups[0].items.map(i => i.n));
    const step = Math.max(1, Math.ceil((to - from + 1) / 3));
    const parts = [0, 1, 2].map(k => { const a = from + k * step, b = k === 2 ? to : Math.min(to, a + step - 1);
      return { k, a, b, c: groups[0].items.filter(i => i.n >= a && i.n <= b).length }; });
    rows = parts.filter(x => x.c).map(x => `<div class="row"><span class="s">${E(t('qa_partl_' + (x.k + 1)))} <small class="ltr">${x.a}–${x.b}</small></span><span class="chip no">${E(nForm('qa_placeN', x.c))}</span></div>`).join('');
    const top = parts.reduce((m, x) => x.c > m.c ? x : m, parts[0]);
    det = tf('qa_pl_spread', { part: t('qa_part_' + (top.k + 1)) });
  } else {
    rows = groups.slice(0, 3).map(e => {
      const name = e.s ? surahNamesLocal(e.s) : '';
      const chips = e.items.length ? e.items.slice(0, 4).map(chip).join('') + (e.items.length > 4 ? `<span class="more">+${e.items.length - 4}</span>` : '')
        : `<span class="chip ${cls}">${E(reciteLabel(e, sc))}</span>`;
      return `<div class="row">${name ? `<span class="s">${E(name)}</span>` : ''}${chips}</div>`;
    }).join('');
    const rest = groups.slice(3), rc = rest.reduce((a, e) => a + e.count, 0);
    if (rest.length) rows += `<div class="more">${E(tf('qa_more', { p: nForm('qa_moreN', rc), s: nForm('qa_surah', rest.length) }))}</div>`;
  }
  return { ask, cls, ans, det, vis: `<div class="rows">${rows}</div>` };
}

// ---------- ③ هل تحسّن؟ (من سُلّم التقدّم: حتى محاولتين سابقتين + اليوم) ----------
function progressBox(d){
  const ask = gf('qa_q3', he());
  if (d.isWeakness) return { ask, cls: 'hm', ans: t('qa_pr_weak'), det: g('qa_pr_weak_det'), vis: '' };
  const prev = (d.ladder || []).filter(s => !s.isCurrent).slice(0, 2).reverse();
  if (!prev.length) return { ask, cls: 'hm', ans: g('qa_pr_first'), det: t('qa_pr_first_det'), vis: '' };
  const last = prev[prev.length - 1].score, diff = d.score - last;
  // صياغة محايدة تراعي مستوى الدرجة الحالية: 97 بعد 100 ليست «تراجعاً»، والانخفاض الكبير (≥10) يبقى أحمر
  const hi = d.score >= 90;
  const key = diff >= 5 ? 'qa_pr_up2' : diff >= 1 ? 'qa_pr_up1'
    : diff >= -2 ? (hi ? 'qa_pr_flat_hi' : 'qa_pr_flat')
    : hi && diff >= -5 ? 'qa_pr_flat_hi'
    : hi && diff > -10 ? 'qa_pr_down_hi'
    : diff > -10 ? 'qa_pr_down' : 'qa_pr_down2';
  const cls = diff >= 1 ? 'ok' : hi && diff > -10 ? 'ok' : diff > -10 ? 'pa' : 'no';
  const det = tf('qa_pr_det', { d: `<span class="ltr">${diff >= 0 ? '+' : ''}${diff}%</span>`, last: `<span class="ltr">${last}%</span>` });
  const bar = (v, l, now) => `<div class="${now ? 'now' : ''}"><b class="ltr">${v}%</b><i style="height:${Math.max(8, Math.round(v * 0.55))}px"></i>${E(l)}</div>`;
  const vis = `<div class="tl">${prev.map(s => bar(s.score, String(s.dateShort || '').slice(0, 5))).join('')}${bar(d.score, t('qa_today'), true)}</div>`;
  return { ask, cls, ans: g(key), detHtml: det, vis };
}

// ---------- ④ ماذا نفعل في البيت؟ (نصوص المعلم المعتمدة) ----------
export function computeQaHomeTasks(d, deps){
  girl = d.gender === 'girl';
  const sc = scopeInfo(d), p = d.score;
  const nm = s => surahNamesLocal(s.name);
  const first = sc.surahs[0];
  const x = sc.kind === 'juz' ? tf('qa_x_juz', { n: sc.juz }) : sc.kind === 'few' ? t('qa_x_few') : first ? tf('qa_x_surah', { s: nm(first) }) : t('qa_x_few');
  const l = sc.kind === 'juz' ? tf('qa_l_juz', { n: sc.juz }) : sc.kind === 'few' ? tf('qa_l_few', { list: deps.focusJoin(sc.surahs.slice(0, 4).map(nm)) }) : first ? tf('qa_l_surah', { s: nm(first) }) : t('qa_x_few');
  const groups = problemPlaces(d, deps);
  const nums = groups.length === 1 && groups[0].s ? groups[0].items.map(i => i.a).sort((a, b) => parseInt(a, 10) - parseInt(b, 10)) : [];
  const w = nums.length && nums.length <= 4 ? tf(nums.length === 1 ? 'qa_w_ayah' : 'qa_w_ayat', { list: deps.focusJoin(nums), s: surahNamesLocal(groups[0].s) }) : t('qa_w_err');
  const P = Object.assign({ x, l, w }, he());
  let head, keys;
  if (p >= 90) { head = 'qa_h_ex'; keys = ['qa_t_ex1', 'qa_t_pray', 'qa_t_tafsir', 'qa_t_ex4']; }
  else if (p >= 60) { head = 'qa_h_mid'; keys = ['qa_t_mid1', 'qa_t_mid2', 'qa_t_mid3', 'qa_t_listen']; }
  else { head = 'qa_h_low'; keys = ['qa_t_low1', 'qa_t_low2', 'pen:qa_t_low3', 'qa_t_listen']; }
  return { head: t(head), tasks: keys.map(k => k.startsWith('pen:') ? { pen: true, text: gf(k.slice(4), P) } : { text: gf(k, P) }) };
}
export function qaHomeTasksText(d, deps){ return computeQaHomeTasks(d, deps).tasks.map(x => x.text).join('\n'); }

// ---------- مساعدات ----------
let E = s => String(s == null ? '' : s);
function he(){ return isEn() ? (girl ? { he: 'she', He: 'She', his: 'her' } : { he: 'he', He: 'He', his: 'his' }) : {}; }
const HOUSE = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none"><rect width="24" height="24" rx="12" fill="#0b3d30"/><path d="M6.5 11.5 12 7l5.5 4.5V17a.8.8 0 0 1-.8.8h-2.9v-3.6h-3.6v3.6H7.3a.8.8 0 0 1-.8-.8z" fill="#fffdf8"/></svg>`;
const tierKey = p => p >= 90 ? 'qa_tier_ex' : p >= 75 ? 'qa_tier_vg' : p >= 60 ? 'qa_tier_g' : p >= 40 ? 'qa_tier_av' : 'qa_tier_low';

// ---------- HTML الصورة ----------
export function buildQaCardHtml(d, deps){
  E = deps.escapeHtml; girl = d.gender === 'girl';
  const theme = resolveQaTheme(d), sf = SAFE[theme], en = isEn();
  const sc = scopeInfo(d);
  const n = (d.ledger || []).length;
  const k1 = knowsBox(d, sc), k2 = placesBox(d, sc, deps), k3 = progressBox(d);
  const hw = computeQaHomeTasks(d, deps);
  const override = d.homeTaskOverride && d.homeTaskOverride.trim();
  const tasks = override ? override.split(/\n+/).map(s => s.trim()).filter(Boolean).map(text => ({ text })) : hw.tasks;
  const tile = (k, v) => `<div class="tile ${k}${v ? '' : ' zero'}"><b>${v}</b><span>${E(nForm('qa_' + k, v))}</span></div>`;
  const pct = x => n ? (x / n * 100).toFixed(2) : 0;

  const av = d.avatar || { type: 'letter', value: (d.name || '؟').charAt(0) };
  const avHtml = av.type === 'image' ? `<img src="${E(av.value)}" alt="">` : `<span class="${av.type === 'emoji' ? 'emo' : 'ltr0'}">${E(av.value)}</span>`;
  const hasDur = d.stats && d.stats.totalTime && d.stats.totalTime !== '—';
  const stampSrc = d.teacher && d.teacher.stamp ? (d.teacher.stampClean || d.teacher.stamp) : '';
  // اسم المعلم من ملفه؛ إن لم يُسجَّل (الاسم الافتراضي «المعلم») لا نكرّره بجوار كلمة «المعلم»
  const rawName = String((d.teacher && d.teacher.name) || '').trim();
  const tName = rawName && rawName !== t('rp_default_teacher') && rawName !== t('qa_teacher') ? rawName : '';
  const corner = theme === 't4' ? ['o1', 'o2', 'o3', 'o4'].map(c => `<img class="${c}" src="assets/report/report-corner-orn.png" alt="">`).join('') : '';
  const card = (cls, num, ask, ans, det, vis, icon) => `<div class="sq c ${cls}"><div class="k">${icon || `<em>${num}</em>`}${E(ask)}</div><div class="ans">${E(ans)}</div>${det ? `<div class="det">${det}</div>` : ''}${vis ? `<div class="vis">${vis}</div>` : ''}</div>`;

  return `<div class="qac ${theme}" id="qa-card" dir="${en ? 'ltr' : 'rtl'}">
    ${theme === 't4' ? `<div class="frame">${corner}</div>` : ''}
    <div class="safe" style="top:${sf.top}px;right:${sf.right}px;bottom:${sf.bottom}px;left:${sf.left}px"><div class="pg">
      <div class="hd"><div class="brand"><img src="assets/brand/${theme === 't4' ? 'ham-logo-light' : 'ham-logo'}.svg" alt=""><div class="t"><small>${E(t('qa_brand_small'))}</small><b>${E(t('qa_title'))}</b></div></div>
        <div class="d">${E(d.dateLong || d.date)}${d.dateHijriLatn ? '<br>' + E(d.dateHijriLatn) : ''}<br>${E(t('qa_report_no'))} <span class="ltr">${E(d.id)}</span></div></div>
      <div class="idr">
        <div class="sq who"><div class="av">${avHtml}</div><div class="wb"><div class="nm">${E(d.name)}${d.grade ? ` <small>· ${E(d.grade)}</small>` : ''}</div>
          <div class="facts"><span>${E(t('qa_f_scope'))}: <b>${E(scopeLabel(d, sc, deps))}</b></span>${n ? `<span>${E(t('qa_f_q'))}: <b>${n}</b></span>` : ''}${hasDur ? `<span>${E(t('qa_f_dur'))}: <b>${E(d.stats.totalTime)}</b></span>` : ''}</div></div></div>
        <div class="sq sc"><div class="p ltr">${d.score}%</div><div class="tier">${E(t(tierKey(d.score)))}</div></div>
      </div>
      <div class="qa">
        ${card(k1.cls, 1, k1.ask, k1.ans, n ? E(tf('qa_of_total', { n: nForm('qa_qg', n) })) : '',
          n ? `<div class="tiles">${tile('ok', d.counts.full)}${tile('pa', d.counts.partial)}${tile('no', d.counts.wrong)}</div><div class="sbar"><i class="ok" style="width:${pct(d.counts.full)}%"></i><i class="pa" style="width:${pct(d.counts.partial)}%"></i><i class="no" style="width:${pct(d.counts.wrong)}%"></i></div>` : '')}
        ${card(k2.cls, 2, k2.ask, k2.ans, E(k2.det), k2.vis)}
        ${card(k3.cls, 3, k3.ask, k3.ans, k3.detHtml || E(k3.det), k3.vis)}
        ${card('hm', 4, t('qa_q4'), hw.head, '', `<ul class="steps">${tasks.map(x => `<li${x.pen ? ' class="pen"' : ''}>${E(x.text)}</li>`).join('')}</ul>`, HOUSE)}
      </div>
      <div class="disc">${E(t('rep_scope_disclaimer'))}</div>
    </div></div>
    <div class="ft"><div class="fbox">
      <div class="tname"><span class="l">${E(t('qa_teacher'))}</span>${tName ? `<span class="n">${E(tName)}</span>` : ''}</div>
      ${stampSrc ? `<div class="tstamp"><img src="${E(stampSrc)}" alt=""></div>` : ''}
    </div></div>
  </div>`;
}

// ملء المساحة الآمنة: أكبر مقياس يجعل المحتوى يتّسع فيها، ثم يُمدّ ما تبقّى داخل المربعات (لا فراغات)
export function fitQaCard(root){
  const safe = root.querySelector('.safe'), pg = root.querySelector('.pg');
  if (!safe || !pg) return;
  const W0 = safe.clientWidth, H0 = safe.clientHeight;
  const fits = s => { pg.style.width = (W0 / s) + 'px'; pg.style.minHeight = '0'; return pg.scrollHeight * s <= H0; };
  let lo = 0.6, hi = 1.35;
  for (let i = 0; i < 14; i++) { const m = (lo + hi) / 2; if (fits(m)) lo = m; else hi = m; }
  fits(lo);
  pg.style.transform = `scale(${lo})`;
  pg.style.minHeight = (H0 / lo) + 'px';
}

// خلفيات التصاميم (background-image لا تُرى كوسم img) — يحمّلها report.js صراحةً قبل الالتقاط
export function qaThemeBackground(theme){
  return { t1: 'assets/report/parent-bg/bg-geo-arch.webp', t2: 'assets/report/parent-bg/bg-sky-mosque.webp', t3: 'assets/report/parent-bg/bg-mandala-paper.webp' }[theme] || '';
}
