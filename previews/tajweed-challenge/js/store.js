// js/store.js — حفظ التقدم محليا (localStorage) مع بديل في الذاكرة إن تعذر التخزين. لا اتصال بأي قاعدة بيانات للمنصة.
const KEY = 'tjc.progress.v1';
let mem = null;
const blank = () => ({ v: 1, rules: {}, stages: {}, mixed: 0 });
function read() {
  if (mem) return mem;
  try { const raw = localStorage.getItem(KEY); mem = raw ? { ...blank(), ...JSON.parse(raw) } : blank(); } catch { mem = blank(); }
  return mem;
}
function write() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* التخزين غير متاح: نكتفي بالذاكرة */ } }
const ensure = (id) => { const d = read(); return (d.rules[id] ||= { learned: false, lv: { 1: 0, 2: 0, 3: 0 } }); };

export const getRule = (id) => ensure(id);
export function setLearned(id) { ensure(id).learned = true; write(); }
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
