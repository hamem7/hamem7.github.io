// previews/games-shared.js — منطق مشترك لمعاينتي شكل الألعاب (games-a-focus / games-b-adventure)
// يعرض 3 أسئلة نموذجية (اختيار — ترتيب كلمات — تقييم المعلم) بالعربية والإنجليزية، كبار/صغار، فاتح/داكن.
const T = {
  ar: { home: 'الرئيسية', brand: 'رحلة إتقان القرآن', sub: 'منصة حمّ', adult: 'الكبار', kids: 'الصغار', student: 'أحمد',
    q1: 'اختر الكلمات الناقصة', q1k: 'اختر الكلمات الناقصة يا بطل! 🎯', q2: 'رتّب كلمات الآية', q2k: 'رتّب كلمات الآية يا بطل 🧩',
    q3: 'ماذا قبلها؟', q3k: 'ماذا قبلها يا بطل؟', tapHint: 'اضغط الكلمات بالترتيب الصحيح', showAns: 'إظهار الإجابة',
    right: 'إجابة صحيحة', rightK: 'أحسنت ⭐', note: 'ملاحظة', ok: 'أحسنت! إجابة صحيحة', okK: 'رائع يا بطل! ⭐', bad: 'ليست هذه، حاول مرة أخرى', badK: 'قريب! جرّب مرة ثانية 💪',
    next: 'التالي', pause: 'حفظ والعودة لاحقًا', exit: 'خروج وإنهاء', full: 'ملء الشاشة', sound: 'المؤثرات الصوتية', more: 'خيارات',
    qOf: (a, b) => `سؤال ${a} من ${b}`, done: 'انتهت المعاينة — أعد التجربة', again: 'من جديد', stars: 'نجوم', streak: 'متتالية', acc: 'الدقة',
    path: 'مسار الرحلة', st: ['البداية', 'الوادي', 'الجبل', 'القمة'], answer: 'الإجابة', note2: 'ملاحظة: الأسئلة هنا نماذج ثابتة للمعاينة فقط' },
  en: { home: 'Home', brand: 'Quran Mastery Journey', sub: 'Ham Platform', adult: 'Adults', kids: 'Kids', student: 'Ahmad',
    q1: 'Choose the missing words', q1k: 'Pick the missing words, champ! 🎯', q2: 'Order the ayah words', q2k: 'Put the words in order, champ 🧩',
    q3: 'What comes before it?', q3k: 'What comes before it, champ?', tapHint: 'Tap the words in the right order', showAns: 'Show answer',
    right: 'Fully correct', rightK: 'Well done ⭐', note: 'Note', ok: 'Well done! Correct', okK: 'Awesome, champ! ⭐', bad: 'Not this one, try again', badK: 'So close! Try again 💪',
    next: 'Next', pause: 'Save & resume later', exit: 'Exit & finish', full: 'Full screen', sound: 'Sound effects', more: 'Options',
    qOf: (a, b) => `Question ${a} of ${b}`, done: 'Preview finished — try again', again: 'Restart', stars: 'Stars', streak: 'Streak', acc: 'Accuracy',
    path: 'Journey path', st: ['Start', 'Valley', 'Mountain', 'Summit'], answer: 'Answer', note2: 'Note: these questions are fixed samples for preview only' }
};
const QS = [
  { kind: 'mcq', key: 'q1', ayah: 'وَثَمُودَ ..... ٱلصَّخْرَ بِٱلْوَادِ', opts: ['ٱلَّذِينَ طَغَوْا۟', 'ٱلَّذِينَ جَابُوا۟', 'ٱلَّذِينَ كَذَّبُوا۟'], correct: 1 },
  { kind: 'order', key: 'q2', words: ['لَآ', 'أَعْبُدُ', 'مَا', 'تَعْبُدُونَ'] },
  { kind: 'teacher', key: 'q3', ayah: 'هَلْ ثُوِّبَ ٱلْكُفَّارُ مَا كَانُوا۟ يَفْعَلُونَ', ans: 'عَلَى ٱلْأَرَآئِكِ يَنظُرُونَ' }
];
const TOTAL = 8;
const S = { lang: 'ar', mode: 'adult', i: 0, res: [], streak: 0, picked: [], secs: 30 * 60 };
const $ = (s, r = document) => r.querySelector(s);
const t = (k) => T[S.lang][k];
const shuffle = (a) => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
let hooks = {};

function applyChrome() {
  const h = document.documentElement;
  h.lang = S.lang; h.dir = S.lang === 'ar' ? 'rtl' : 'ltr';
  document.body.classList.toggle('kids', S.mode === 'kids');
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', b.dataset.mode === S.mode));
  $('#lang-btn').textContent = S.lang === 'ar' ? 'English' : 'العربية';
}

function render() {
  applyChrome();
  const box = $('#q-body'); const q = QS[S.i % QS.length]; const kids = S.mode === 'kids';
  hideFeedback();
  if (S.res.length >= TOTAL) {
    box.innerHTML = `<div class="q-done"><div class="q-done-ico">${kids ? '🏆' : '✅'}</div><p>${t('done')}</p><button class="b b-pri" id="again">${t('again')}</button></div>`;
    $('#again').onclick = () => { S.i = 0; S.res = []; S.streak = 0; render(); };
    hooks.progress?.(S); return;
  }
  let html = `<div class="q-chip">${t(q.key + (kids ? 'k' : ''))}</div>`;
  if (q.kind === 'mcq') {
    html += `<div class="ayah quran-text">﴿ ${q.ayah} ﴾</div><div class="opts">` +
      q.opts.map((o, j) => `<button class="opt quran-text" data-j="${j}">${o}</button>`).join('') + '</div>';
  } else if (q.kind === 'order') {
    S.picked = [];
    html += `<p class="hint">${t('tapHint')}</p><div class="slots">${q.words.map(() => '<span class="slot quran-text">…</span>').join('')}</div>` +
      `<div class="words">${shuffle(q.words.map((w, j) => ({ w, j }))).map(x => `<button class="word quran-text" data-j="${x.j}">${x.w}</button>`).join('')}</div>`;
  } else {
    html += `<div class="ayah quran-text">﴿ ${q.ayah} ﴾</div><button class="b b-ghost" id="show">👁️ ${t('showAns')}</button>` +
      `<div class="ans" hidden><span class="ans-l">${t('answer')}</span><div class="quran-text">﴿ ${q.ans} ﴾</div></div>`;
  }
  box.innerHTML = html;
  box.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    if (+b.dataset.j === q.correct) { b.classList.add('is-ok'); finish(true); } else { b.classList.add('is-bad'); feedback(false); setTimeout(() => b.classList.remove('is-bad'), 600); }
  });
  box.querySelectorAll('.word').forEach(b => b.onclick = () => {
    const need = S.picked.length;
    if (+b.dataset.j !== need) { b.classList.add('is-bad'); feedback(false); setTimeout(() => b.classList.remove('is-bad'), 600); return; }
    S.picked.push(need); b.disabled = true; const sl = box.querySelectorAll('.slot')[need]; sl.textContent = b.textContent; sl.classList.add('filled');
    if (S.picked.length === q.words.length) finish(true);
  });
  const show = $('#show', box);
  if (show) show.onclick = () => { $('.ans', box).hidden = false; show.hidden = true; hooks.teacher?.(true); };
  hooks.teacher?.(false);
  hooks.progress?.(S);
}

function feedback(ok) {
  const kids = S.mode === 'kids'; const f = $('#feedback');
  f.className = 'feedback show ' + (ok ? 'ok' : 'bad');
  $('#fb-text').textContent = t(ok ? (kids ? 'okK' : 'ok') : (kids ? 'badK' : 'bad'));
  $('#fb-next').hidden = !ok;
  if (!ok) setTimeout(hideFeedback, 1400);
}
function hideFeedback() { const f = $('#feedback'); if (f) f.className = 'feedback'; }
function finish(ok) {
  S.res.push(ok); S.streak = ok ? S.streak + 1 : 0;
  hooks.progress?.(S); feedback(ok);
  if (ok && S.mode === 'kids') hooks.celebrate?.();
}
export function teacherEval(ok) { if (!ok) { S.res.push(false); S.streak = 0; next(); return; } finish(true); }
export function next() { S.i++; render(); }
export const t2 = t;

export function boot(h = {}) {
  hooks = h;
  try { S.lang = localStorage.getItem('pv_games_lang') || 'ar'; S.mode = localStorage.getItem('pv_games_mode') || 'adult'; } catch (e) {}
  $('#lang-btn').onclick = () => { S.lang = S.lang === 'ar' ? 'en' : 'ar'; try { localStorage.setItem('pv_games_lang', S.lang); } catch (e) {} render(); };
  $('#theme-btn').onclick = () => { const h = document.documentElement; const dark = h.dataset.theme === 'dark' || (!h.dataset.theme && matchMedia('(prefers-color-scheme: dark)').matches); h.dataset.theme = dark ? 'light' : 'dark'; };
  document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => { S.mode = b.dataset.mode; try { localStorage.setItem('pv_games_mode', S.mode); } catch (e) {} render(); });
  $('#fb-next').onclick = next;
  $('#btn-right')?.addEventListener('click', () => teacherEval(true));
  $('#btn-note')?.addEventListener('click', () => teacherEval(false));
  setInterval(() => { if (S.secs > 0) S.secs--; hooks.tick?.(S); }, 1000);
  render();
}
export { S, T };
