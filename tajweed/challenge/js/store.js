// js/store.js — حفظ التقدم محليا (localStorage) مع بديل في الذاكرة إن تعذر التخزين. لا اتصال بأي قاعدة بيانات للمنصة.
const BASE = 'tjc.progress.v1';
let KEY = BASE, mem = null;
// التقدّم يُحفظ باسم الطالب الحالي (إن وُجد) حتى لا يختلط تقدّم طلاب الجهاز الواحد
export function setProfile(id) { KEY = id ? `${BASE}.${id}` : BASE; mem = null; }
const blank = () => ({ v: 1, rules: {}, stages: {}, mixed: 0 });
function read() {
  if (mem) return mem;
  try { const raw = localStorage.getItem(KEY); mem = raw ? { ...blank(), ...JSON.parse(raw) } : blank(); } catch { mem = blank(); }
  return mem;
}
function write() { try { mem.t = Date.now(); localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* التخزين غير متاح: نكتفي بالذاكرة */ } }
const ensure = (id) => { const d = read(); return (d.rules[id] ||= { learned: false, lv: { 1: 0, 2: 0, 3: 0 } }); };

export const getRule = (id) => ensure(id);
// تقارير التقدّم للمنصة (تُركَّب في app.js): تُكتب في قاعدة بيانات المنصة باسم الطالب
let sink = null;
export const setSink = (fn) => { sink = fn; };
export const emit = (evt) => { try { sink && sink(evt); } catch (e) { console.error(e); } };
export function setLearned(id) { ensure(id).learned = true; write(); emit({ type: 'learned', ruleId: id }); }
export function setStars(id, level, n) { const r = ensure(id); r.lv[level] = Math.max(r.lv[level] || 0, n); write(); }
export function setStageStars(id, n) { const d = read(); d.stages[id] = Math.max(d.stages[id] || 0, n); write(); }
export const getStageStars = (id) => read().stages[id] || 0;
export function setMixed(n) { const d = read(); d.mixed = Math.max(d.mixed || 0, n); write(); }
export const getMixed = () => read().mixed || 0;
export function reset() { mem = blank(); write(); }
export function totals(ruleIds) {
  let got = 0, max = ruleIds.length * 9, mastered = 0;
  for (const id of ruleIds) { const r = ensure(id); got += (r.lv[1] || 0) + (r.lv[2] || 0) + (r.lv[3] || 0); if ((r.lv[3] || 0) >= 1) mastered++; }
  return { got, max, mastered };
}
// آخر مستوى مفتوح: التعلم ثم ١ ثم ٢ ثم ٣
export function isUnlocked(id, level, review = false) {
  if (review) return true;
  const r = ensure(id);
  if (level === 1) return r.learned;
  return (r.lv[level - 1] || 0) >= 1;
}

// ملخص تقدّم أي ملف طالب دون التبديل إليه (لبطاقات اختيار الطالب)
export function peek(id, ruleIds) {
  let d = null; try { const raw = localStorage.getItem(id ? `${BASE}.${id}` : BASE); d = raw ? JSON.parse(raw) : null; } catch { d = null; }
  let got = 0, mastered = 0, started = 0;
  for (const rid of ruleIds) { const r = d?.rules?.[rid]; if (!r) continue; const n = (r.lv?.[1] || 0) + (r.lv?.[2] || 0) + (r.lv?.[3] || 0); got += n; if ((r.lv?.[3] || 0) >= 1) mastered++; if (n > 0 || r.learned) started++; }
  return { got, max: ruleIds.length * 9, mastered, started, t: d?.t || 0 };
}
