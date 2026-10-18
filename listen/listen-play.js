// listen/listen-play.js
//
// 🌟 [جديد — 2026-10-18] لعبة «استمع للشيخ… ثم كمّل»: يسمع الطالب آية بصوت الشيخ المنشاوي ثم يُكمل بصوته الآية
// التي بعدها (أو التي قبلها)، ثم يكشف الإجابة ويحكم على نفسه (أو يحكم المعلم). لا تعرّف آلي على التلاوة.
// الأسئلة تُبنى من نطاق حفظ الطالب (memoFrom/memoTo) أو نطاق مخصّص — راجع engine/listenEngine.js.
// معزولة عن games/ وsimilarities/ (بادئة ls-)، ولا تحفظ شيئاً في ملف الطالب (لعبة تدريب لا تقييم رسمي)
// عدا تذكّر آخر طالب لعب (localStorage محمي بـtry/catch).
import { AppState, loadSplashScreen, t, tf } from '../core/app.js';
import { translations, surahNameLocal } from '../core/i18n.js';
import { showToastEncouragement, triggerConfetti } from '../components/ui.js';
import { toQuranicSukun } from '../engine/quranEngine.js';
import { stripBasmala, stripHizbMark } from '../engine/similarityQuestions.js';
import { MIN_SURAH, ayahAudioUrl, studentSurahs, customSurahs, buildRound, retryRound, hintOf, summarize, DEFAULT_RECITER } from '../engine/listenEngine.js';

// ---------------------------------------------------------------------------
// 🌟 الترجمات (تُدمج في القاموس المركزي دون الكتابة فوق أي مفتاح موجود)
const KEYS = {
    ar: {
        ls_loading: '⏳ جاري التحميل...',
        ls_title: 'استمع للشيخ… ثم كمّل',
        ls_title_prev: 'استمع للشيخ… ثم قُل التي قبلها',
        ls_prompt_next: 'كمّل!',
        ls_prompt_prev: 'ما قبلها؟',
        ls_listening: 'جارٍ تشغيل الصوت…',
        ls_loading_audio: 'جارٍ تحميل الصوت…',
        ls_tap_replay: 'اضغط الزر لتسمع الآية مرة أخرى',
        ls_play_aria: 'استمع إلى الآية',
        ls_audio_error: 'تعذّر تشغيل الصوت. تأكّد من اتصال الإنترنت ثم اضغط الزر للمحاولة مرة أخرى.',
        ls_in_surah: 'سورة {name}',
        ls_hint_btn: '💡 تلميح',
        ls_reveal_btn: '👁️ أظهر الإجابة',
        ls_answer_ref: '{name} — الآية {n}',
        ls_hear_answer: '🔊 اسمع الإجابة',
        ls_grade_title: 'كيف كان إكمالك؟',
        ls_got_it: '✅ أكملتها',
        ls_not_yet: '🔁 أحتاج مراجعة',
        ls_next: 'السؤال التالي ⬅',
        ls_finish: 'عرض النتيجة 🎉',
        ls_setup_who: 'من الذي سيلعب؟',
        ls_guest: '👤 بدون طالب',
        ls_setup_scope: 'النطاق',
        ls_scope_student: 'نطاق حفظ الطالب',
        ls_scope_custom: 'نطاق مخصّص',
        ls_from: 'من سورة',
        ls_to: 'إلى سورة',
        ls_scope_student_range: 'من سورة {from} إلى سورة {to}',
        ls_scope_no_student: 'اختر طالباً لاستخدام نطاق حفظه، أو اختر نطاقاً مخصّصاً.',
        ls_scope_bad_range: 'لا يوجد نطاق حفظ صالح لهذا الطالب ضمن آخر خمسة أجزاء — اختر نطاقاً مخصّصاً.',
        ls_last5_note: 'اللعبة مخصّصة لآخر خمسة أجزاء (من سورة الأحقاف إلى الناس).',
        ls_setup_mode: 'ماذا يُكمل؟',
        ls_mode_next: 'الآية التي بعدها',
        ls_mode_prev: 'الآية التي قبلها',
        ls_mode_mixed: 'مختلط',
        ls_setup_count: 'عدد الأسئلة',
        ls_hide_surah: 'إخفاء اسم السورة (أصعب)',
        ls_start: 'ابدأ اللعب 🎧',
        ls_reciter: 'القارئ: {name}',
        ls_no_questions: 'النطاق المختار صغير جداً ولا يكفي لسؤال واحد. اختر نطاقاً أوسع.',
        ls_res_title: 'انتهت الجولة!',
        ls_res_score: '{c} من {n}',
        ls_res_pct: '{p}٪ إكمال صحيح',
        ls_res_hints: 'استخدمت التلميح في {h} سؤال',
        ls_res_perfect: 'ما شاء الله! أكملت كل الآيات.',
        ls_res_missed: 'آيات تحتاج مراجعة',
        ls_retry_missed: '🔁 راجع ما أخطأت فيه',
        ls_again: '🎧 جولة جديدة',
        ls_back_setup: '⚙️ تغيير الإعدادات',
        ls_hear: 'استمع'
    },
    en: {
        ls_loading: '⏳ Loading...',
        ls_title: 'Listen to the Sheikh… then continue',
        ls_title_prev: 'Listen to the Sheikh… then say the verse before it',
        ls_prompt_next: 'Continue!',
        ls_prompt_prev: 'The verse before?',
        ls_listening: 'Playing audio…',
        ls_loading_audio: 'Loading audio…',
        ls_tap_replay: 'Tap the button to hear the verse again',
        ls_play_aria: 'Listen to the verse',
        ls_audio_error: 'Could not play the audio. Check your internet connection and tap the button to try again.',
        ls_in_surah: 'Surah {name}',
        ls_hint_btn: '💡 Hint',
        ls_reveal_btn: '👁️ Show answer',
        ls_answer_ref: '{name} — verse {n}',
        ls_hear_answer: '🔊 Hear the answer',
        ls_grade_title: 'How was your recitation?',
        ls_got_it: '✅ I got it',
        ls_not_yet: '🔁 Needs review',
        ls_next: 'Next question ➡',
        ls_finish: 'See result 🎉',
        ls_setup_who: 'Who is playing?',
        ls_guest: '👤 No student',
        ls_setup_scope: 'Scope',
        ls_scope_student: "Student's memorization range",
        ls_scope_custom: 'Custom range',
        ls_from: 'From surah',
        ls_to: 'To surah',
        ls_scope_student_range: 'From {from} to {to}',
        ls_scope_no_student: "Pick a student to use their range, or choose a custom range.",
        ls_scope_bad_range: 'This student has no valid memorization range within the last five juz — choose a custom range.',
        ls_last5_note: 'This game covers the last five juz (Al-Ahqaf to An-Nas).',
        ls_setup_mode: 'What to continue?',
        ls_mode_next: 'The next verse',
        ls_mode_prev: 'The previous verse',
        ls_mode_mixed: 'Mixed',
        ls_setup_count: 'Number of questions',
        ls_hide_surah: 'Hide the surah name (harder)',
        ls_start: 'Start 🎧',
        ls_reciter: 'Reciter: {name}',
        ls_no_questions: 'The chosen range is too small for even one question. Choose a wider range.',
        ls_res_title: 'Round complete!',
        ls_res_score: '{c} of {n}',
        ls_res_pct: '{p}% completed correctly',
        ls_res_hints: 'You used the hint on {h} question(s)',
        ls_res_perfect: 'Masha Allah! You completed every verse.',
        ls_res_missed: 'Verses to review',
        ls_retry_missed: '🔁 Review my mistakes',
        ls_again: '🎧 New round',
        ls_back_setup: '⚙️ Change settings',
        ls_hear: 'Listen'
    }
};
['ar', 'en'].forEach(lang => Object.keys(KEYS[lang]).forEach(k => { if (!(k in translations[lang])) translations[lang][k] = KEYS[lang][k]; }));

// ---------------------------------------------------------------------------
const LAST_STUDENT_KEY = 'dh_listen_last_student';
const readLast = () => { try { return localStorage.getItem(LAST_STUDENT_KEY); } catch (e) { return null; } };
const writeLast = (id) => { try { localStorage.setItem(LAST_STUDENT_KEY, String(id)); } catch (e) { /* لا شيء */ } };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONS = {
    replay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.6-5.9"/><path d="M20 3.5v4.6h-4.6" fill="none"/></svg>',
    playing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M6 10v4M10 7v10M14 5v14M18 9v6"/></svg>',
    loading: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M12 3a9 9 0 1 1-9 9"/></svg>'
};

// الحالة: لقطة واحدة لكل فتح للشاشة
let S = null;
let audio = null;       // عنصر Audio واحد يُعاد استخدامه
let audioToken = 0;     // لتجاهل أحداث صوت قديمة بعد الانتقال لسؤال آخر
const surahCache = new Map();

// 🌟 اسم السورة بلغة الواجهة عبر مترجم المنصة المركزي (يعمل بالرقم)
const surahNameDisplay = (n) => surahNameLocal(n);

async function ayahText(surah, ayah) {
    let s = surahCache.get(surah);
    if (!s) { s = await AppState.quranEngine.getSurah(surah); surahCache.set(surah, s); }
    const a = s && s.ayahs && s.ayahs.find(x => x.numberInSurah === ayah);
    if (!a) return '';
    // 🌟 نص الآية الأولى في بيانات المنصة يبدأ بالبسملة (عدا الفاتحة والتوبة) — لا تُعرض كجزء من الإجابة
    const raw = surah === 1 ? a.text : stripBasmala(a.text);
    return toQuranicSukun(stripHizbMark(raw)).trim();
}

// ---------------------------------------------------------------------------
// الصوت
function stopAudio() {
    audioToken++;
    if (audio) { try { audio.pause(); } catch (e) { /* لا شيء */ } }
}
// يشغّل رابطاً ويستدعي onState('loading'|'playing'|'ended'|'error')
function playUrl(url, onState) {
    stopAudio();
    const token = audioToken;
    if (!audio) audio = new Audio();
    audio.preload = 'auto';
    audio.onplaying = () => { if (token === audioToken) onState('playing'); };
    audio.onended = () => { if (token === audioToken) onState('ended'); };
    audio.onerror = () => { if (token === audioToken) onState('error'); };
    audio.src = url;
    onState('loading');
    const p = audio.play();
    if (p && p.catch) p.catch(() => { if (token === audioToken) onState('error'); });
}

// ---------------------------------------------------------------------------
export async function initListenGame() {
    const exit = document.getElementById('ls-btn-exit');
    if (exit) exit.addEventListener('click', () => { stopAudio(); loadSplashScreen(); });
    const container = document.getElementById('ls-container');
    if (!container) return;
    if (AppState.quranReady) { try { await AppState.quranReady; } catch (e) { /* يُعالج أدناه */ } }

    let students = [];
    try { students = AppState.studentManager ? await AppState.studentManager.getAllStudents() : []; } catch (e) { students = []; }
    const surahs = (AppState.surahsData || []).filter(s => s.number >= MIN_SURAH).sort((a, b) => a.number - b.number);   // 🌟 آخر خمسة أجزاء فقط
    if (!surahs.length) { container.innerHTML = `<div class="ls-empty">${t('ls_loading')}</div>`; return; }

    const lastId = readLast();
    const last = students.find(s => String(s.id) === lastId) || null;
    S = {
        students, surahs, student: last, scope: 'student', from: 114, to: 105,
        mode: 'next', count: 10, hideSurah: false,
        questions: [], idx: 0, answers: [], hinted: false, revealed: false
    };
    renderSetup();
}

// ---------------------------------------------------------------------------
// 1) شاشة الإعداد
function studentScope() { return S.student ? studentSurahs(S.surahs, S.student) : { ok: false, reason: 'no_student', surahs: [] }; }

function renderSetup() {
    stopAudio();
    const container = document.getElementById('ls-container');
    const prog = document.getElementById('ls-progress'); if (prog) prog.textContent = '';
    const sc = studentScope();
    if (!sc.ok && S.scope === 'student') S.scope = 'custom';
    if (S.student && sc.ok && !S._scopeTouched) S.scope = 'student';

    const stuBtns = S.students.map(st => `<button type="button" class="ls-chip${String(st.id) === readLast() ? ' is-last' : ''}" data-stu="${esc(st.id)}" aria-pressed="${S.student && S.student.id === st.id}">${esc(st.name)}</button>`).join('');
    const opts = (sel) => S.surahs.map(s => `<option value="${s.number}"${s.number === sel ? ' selected' : ''}>${esc(surahNameDisplay(s.number))}</option>`).join('');
    const chip = (attr, val, cur, label) => `<button type="button" class="ls-chip" data-${attr}="${val}" aria-pressed="${String(cur) === String(val)}">${label}</button>`;

    let scopeNote = '';
    if (!S.student) scopeNote = `<p class="ls-note">${t('ls_scope_no_student')}</p>`;
    else if (!sc.ok) scopeNote = `<p class="ls-note is-warn">${t('ls_scope_bad_range')}</p>`;
    else scopeNote = `<p class="ls-note">${tf('ls_scope_student_range', { from: esc(surahNameDisplay(sc.surahs[sc.surahs.length - 1])), to: esc(surahNameDisplay(sc.surahs[0])) })}</p>`;

    container.innerHTML = `
        <div class="ls-pill"><span aria-hidden="true">🎧</span><span>${t('ls_title')}</span></div>
        <div class="ls-meta">${tf('ls_reciter', { name: DEFAULT_RECITER.name[AppState.currentLang === 'en' ? 'en' : 'ar'] })}</div>

        <div class="ls-setup-h">${t('ls_setup_who')}</div>
        <div class="ls-chips">${stuBtns}<button type="button" class="ls-chip" data-stu="" aria-pressed="${!S.student}">${t('ls_guest')}</button></div>

        <div class="ls-setup-h">${t('ls_setup_scope')}</div>
        <p class="ls-note">${t('ls_last5_note')}</p>
        <div class="ls-chips">
            <button type="button" class="ls-chip" data-scope="student" aria-pressed="${S.scope === 'student'}" ${sc.ok ? '' : 'disabled'}>${t('ls_scope_student')}</button>
            <button type="button" class="ls-chip" data-scope="custom" aria-pressed="${S.scope === 'custom'}">${t('ls_scope_custom')}</button>
        </div>
        ${S.scope === 'custom' ? `<div class="ls-range-row">
            <label>${t('ls_from')} <select class="ls-select" id="ls-from">${opts(S.from)}</select></label>
            <label>${t('ls_to')} <select class="ls-select" id="ls-to">${opts(S.to)}</select></label>
        </div>` : scopeNote}

        <div class="ls-setup-h">${t('ls_setup_mode')}</div>
        <div class="ls-chips">${chip('mode', 'next', S.mode, t('ls_mode_next'))}${chip('mode', 'prev', S.mode, t('ls_mode_prev'))}${chip('mode', 'mixed', S.mode, t('ls_mode_mixed'))}</div>

        <div class="ls-setup-h">${t('ls_setup_count')}</div>
        <div class="ls-chips">${[5, 10, 15, 20].map(n => chip('count', n, S.count, n)).join('')}</div>

        <label class="ls-check"><input type="checkbox" id="ls-hide" ${S.hideSurah ? 'checked' : ''}> ${t('ls_hide_surah')}</label>
        <p class="ls-note is-warn" id="ls-setup-msg" role="alert" hidden></p>
        <button type="button" class="ls-btn ls-btn-primary ls-start" id="ls-start">${t('ls_start')}</button>`;

    container.querySelectorAll('[data-stu]').forEach(b => b.addEventListener('click', () => {
        S.student = S.students.find(s => String(s.id) === b.dataset.stu) || null;
        S._scopeTouched = false;
        if (S.student) writeLast(S.student.id);
        renderSetup();
    }));
    container.querySelectorAll('[data-scope]').forEach(b => b.addEventListener('click', () => { S.scope = b.dataset.scope; S._scopeTouched = true; renderSetup(); }));
    container.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => { S.mode = b.dataset.mode; renderSetup(); }));
    container.querySelectorAll('[data-count]').forEach(b => b.addEventListener('click', () => { S.count = +b.dataset.count; renderSetup(); }));
    container.querySelector('#ls-from')?.addEventListener('change', e => { S.from = +e.target.value; });
    container.querySelector('#ls-to')?.addEventListener('change', e => { S.to = +e.target.value; });
    container.querySelector('#ls-hide')?.addEventListener('change', e => { S.hideSurah = e.target.checked; });
    container.querySelector('#ls-start').addEventListener('click', startRound);
}

function startRound() {
    const sc = studentScope();
    const nums = (S.scope === 'student' && sc.ok) ? sc.surahs : customSurahs(S.from, S.to);
    const qs = buildRound(S.surahs, nums, { mode: S.mode, count: S.count });
    if (!qs.length) {
        const m = document.getElementById('ls-setup-msg');
        if (m) { m.textContent = t('ls_no_questions'); m.hidden = false; }
        return;
    }
    beginQuestions(qs);
}

function beginQuestions(qs) {
    S.questions = qs; S.idx = 0; S.answers = [];
    renderQuestion();
}

// ---------------------------------------------------------------------------
// 2) شاشة السؤال
function setPlayUI(state) {
    const btn = document.getElementById('ls-play'); const st = document.getElementById('ls-status');
    if (!btn) return;
    btn.classList.toggle('is-playing', state === 'playing');
    btn.classList.toggle('is-loading', state === 'loading');
    btn.innerHTML = state === 'playing' ? ICONS.playing : state === 'loading' ? ICONS.loading : ICONS.replay;
    if (!st) return;
    st.classList.toggle('is-error', state === 'error');
    st.textContent = state === 'playing' ? t('ls_listening') : state === 'loading' ? t('ls_loading_audio') : state === 'error' ? t('ls_audio_error') : t('ls_tap_replay');
}

function playQuestionAudio() {
    const q = S.questions[S.idx];
    playUrl(ayahAudioUrl(q.surah, q.ayah), setPlayUI);
}

function renderQuestion() {
    const q = S.questions[S.idx];
    S.hinted = false; S.revealed = false;
    const container = document.getElementById('ls-container');
    const prog = document.getElementById('ls-progress'); if (prog) prog.textContent = `${S.idx + 1} / ${S.questions.length}`;
    const prev = q.dir === 'prev';
    container.innerHTML = `
        <div class="ls-pill"><span aria-hidden="true">🎧</span><span>${t(prev ? 'ls_title_prev' : 'ls_title')}</span></div>
        <div class="ls-meta">${S.hideSurah ? '' : tf('ls_in_surah', { name: esc(surahNameDisplay(q.surah)) })}</div>
        <button type="button" class="ls-play" id="ls-play" aria-label="${t('ls_play_aria')}">${ICONS.replay}</button>
        <div class="ls-prompt">${t(prev ? 'ls_prompt_prev' : 'ls_prompt_next')}</div>
        <div class="ls-status" id="ls-status" role="status" aria-live="polite"></div>
        <div id="ls-hint-box"></div>
        <div class="ls-actions" id="ls-actions">
            <button type="button" class="ls-btn ls-btn-soft" id="ls-hint">${t('ls_hint_btn')}</button>
            <button type="button" class="ls-btn ls-btn-primary" id="ls-reveal">${t('ls_reveal_btn')}</button>
        </div>
        <div id="ls-answer-box"></div>`;
    document.getElementById('ls-play').addEventListener('click', playQuestionAudio);
    document.getElementById('ls-hint').addEventListener('click', onHint);
    document.getElementById('ls-reveal').addEventListener('click', onReveal);
    setPlayUI('idle');
    playQuestionAudio();   // 🌟 يبدأ الصوت تلقائياً (النقرة السابقة كانت بفعل المستخدم فيسمح المتصفح)
}

async function onHint() {
    const q = S.questions[S.idx];
    const text = await ayahText(q.surah, q.answer);
    S.hinted = true;
    document.getElementById('ls-hint-box').innerHTML = `<div class="ls-hint quran-text">${esc(hintOf(text))}</div>`;
    const b = document.getElementById('ls-hint'); if (b) b.disabled = true;
}

async function onReveal() {
    if (S.revealed) return;
    S.revealed = true;
    const q = S.questions[S.idx];
    const text = await ayahText(q.surah, q.answer);
    const last = S.idx === S.questions.length - 1;
    document.getElementById('ls-actions').hidden = true;
    document.getElementById('ls-hint-box').innerHTML = '';
    document.getElementById('ls-answer-box').innerHTML = `
        <div class="ls-answer">
            <div class="ls-answer-ref">${tf('ls_answer_ref', { name: esc(surahNameDisplay(q.surah)), n: q.answer })}</div>
            <div class="ls-answer-text quran-text">${esc(text)}</div>
            <button type="button" class="ls-btn ls-btn-soft" id="ls-hear">${t('ls_hear_answer')}</button>
        </div>
        <div class="ls-grade-title">${t('ls_grade_title')}</div>
        <div class="ls-actions">
            <button type="button" class="ls-btn ls-btn-ok" id="ls-yes">${t('ls_got_it')}</button>
            <button type="button" class="ls-btn ls-btn-again" id="ls-no">${t('ls_not_yet')}</button>
        </div>`;
    document.getElementById('ls-hear').addEventListener('click', () => playUrl(ayahAudioUrl(q.surah, q.answer), setPlayUI));
    document.getElementById('ls-yes').addEventListener('click', () => grade(true));
    document.getElementById('ls-no').addEventListener('click', () => grade(false));
    // 🌟 بعد الكشف يسمع الطالب الإجابة بصوت الشيخ ليتصحّح نطقه
    playUrl(ayahAudioUrl(q.surah, q.answer), setPlayUI);
}

function grade(ok) {
    const q = S.questions[S.idx];
    S.answers.push({ ...q, ok, hinted: S.hinted });
    stopAudio();
    if (ok) showToastEncouragement();
    if (S.idx + 1 >= S.questions.length) return renderResult();
    S.idx++;
    renderQuestion();
}

// ---------------------------------------------------------------------------
// 3) شاشة النتيجة
async function renderResult() {
    const r = summarize(S.answers);
    const hints = S.answers.filter(a => a.hinted).length;
    const prog = document.getElementById('ls-progress'); if (prog) prog.textContent = '';
    const container = document.getElementById('ls-container');
    const rows = await Promise.all(r.missed.map(async m => {
        const txt = await ayahText(m.surah, m.answer);
        return `<li><div><div class="ls-missed-ref">${tf('ls_answer_ref', { name: esc(surahNameDisplay(m.surah)), n: m.answer })}</div><div class="quran-text">${esc(txt)}</div></div>
            <button type="button" class="ls-mini-play" data-s="${m.surah}" data-a="${m.answer}" aria-label="${t('ls_hear')}">🔊</button></li>`;
    }));
    container.innerHTML = `
        <div class="ls-pill"><span aria-hidden="true">🏁</span><span>${t('ls_res_title')}</span></div>
        <div class="ls-stars" aria-hidden="true">${'⭐'.repeat(r.stars)}${'☆'.repeat(3 - r.stars)}</div>
        <div class="ls-score">${tf('ls_res_score', { c: r.correct, n: r.total })}</div>
        <div class="ls-score-sub">${tf('ls_res_pct', { p: r.pct })}${hints ? '<br>' + tf('ls_res_hints', { h: hints }) : ''}</div>
        ${r.missed.length ? `<div class="ls-setup-h">${t('ls_res_missed')}</div><ul class="ls-missed">${rows.join('')}</ul>` : `<p class="ls-note">${t('ls_res_perfect')}</p>`}
        <div class="ls-actions" style="margin-top:20px">
            ${r.missed.length ? `<button type="button" class="ls-btn ls-btn-primary" id="ls-retry">${t('ls_retry_missed')}</button>` : ''}
            <button type="button" class="ls-btn ${r.missed.length ? 'ls-btn-soft' : 'ls-btn-primary'}" id="ls-again">${t('ls_again')}</button>
            <button type="button" class="ls-btn ls-btn-soft" id="ls-setup">${t('ls_back_setup')}</button>
        </div>`;
    if (r.pct >= 70) { try { triggerConfetti(); } catch (e) { /* لا شيء */ } }
    container.querySelectorAll('.ls-mini-play').forEach(b => b.addEventListener('click', () => playUrl(ayahAudioUrl(+b.dataset.s, +b.dataset.a), () => {})));
    container.querySelector('#ls-retry')?.addEventListener('click', () => { stopAudio(); beginQuestions(retryRound(r.missed)); });
    container.querySelector('#ls-again').addEventListener('click', () => { stopAudio(); startRound(); });
    container.querySelector('#ls-setup').addEventListener('click', renderSetup);
}
