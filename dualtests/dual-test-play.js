// dualtests/dual-test-play.js
//
// 🌟 [جديد بالكامل] منطق شاشة اللعب الفعلية لـ"الاختبارات الثنائية". ملف مستقل تماماً في
// مجلد dualtests/ الجديد، بجانب dual-test-setup.js. راجع مستند المشروع
// "تصميم-نظام-الاختبارات-الثنائية.md" لكل القرارات المعتمدة من المعلم.
//
// 🌟 افتراضات صريحة غير محسومة بتوضيح مباشر من المعلم (مذكورة هنا حتى لا تُعتبر نهائية بصمت):
// 1) مدة المؤقت الافتراضية لكل سؤال = 60 ثانية ثابتة لكل الأسئلة (لا حقل في تصميم الاختبار
//    لتحديد مدة مخصصة). المؤقت بصري بحت فقط كما تقرر — لا يحدث أي شيء تلقائي عند وصوله للصفر.
// 2) القرعة (تحديد من يبدأ الاختيار) تُجرى فقط قبل الجولة الأولى؛ الجولتان الثانية والثالثة
//    يبدأ فيهما الطالب الآخر (تبديل تلقائي لمن بدأ الجولة السابقة)، لضمان عدالة تقريبية.
// 3) تقدّم المباراة (الأسئلة المُجابة) يُحفَظ في قاعدة البيانات فقط عند اكتمال كل جولة
//    كاملة (ملخص الجولة)، وليس سؤالاً بسؤال أثناء اللعب — فلو أُغلق المتصفح منتصف جولة
//    تُفقَد تلك الجولة الجزئية فقط (الجولات المكتملة سابقاً تبقى محفوظة بأمان).
// 4) عند استخدام "تبديل"، يُصفَّر عداد أخطاء هذا السؤال تحديداً (بداية نظيفة مع السؤال
//    البديل)، والأخطاء المسجَّلة فعلاً قبل التبديل (إن وُجدت) تبقى محسوبة ضمن نقاط الطالب.
// 5) "مين يلعب الرقم التالي" (دور بالتبادل) مؤشر إرشادي فقط للمعلم — لا قفل برمجي صارم
//    يمنع النقر، لأن المعلم هو من يدير التسلسل فعلياً مع الطالبَين حضورياً.

import { AppState, loadSplashScreen, t } from '../core/app.js';
import { openModal, closeModal, triggerConfetti } from '../components/ui.js';
import {
    computeQuestionScore, QUESTION_POINTS, computeRoundWinner, computeSeriesResult,
    evaluateMatchAchievements, BADGE_CATALOG
} from '../engine/dualTestEngine.js';
// 🌟 [جديد] أصوات بسيطة (نغمة خطأ/نجاح/فوز) — ملف مستقل معزول، راجع تعليقاته لتفاصيل الأسلوب
// 🌟 [جديد] playDrawTickSound/playDrawLandSound لشاشة القرعة الجديدة ملء الشاشة (راجع runNameDraw)
import { playMistakeSound, playSuccessSound, playWinSound, playDrawTickSound, playDrawLandSound } from './dual-test-sounds.js';

const QUESTION_SECONDS = 60; // 🌟 افتراض رقم 1 أعلاه — القيمة الافتراضية، غير مستخدمة فعلياً حالياً (المؤقت مُعطَّل، انظر TIMER_ENABLED)

// 🌟 [جديد] المؤقت مُعطَّل مؤقتاً بطلب صريح من المعلم ("قم بإلغاء المؤقت الي حين اطلب منك
// تفعيله") — كل دوال المؤقت أدناه (startTimer/stopTimer/updateTimerDisplay) باقية كاملة بلا
// حذف، فقط استدعاؤها من renderQuestionView مشروط بهذا العلم؛ لتفعيله مستقبلاً يكفي تغييره
// إلى true (والعنصر #dtp-timer في dual-test-play.html يحتاج حذف display:none منه وقتها أيضاً)
const TIMER_ENABLED = false;

let test = null;           // الاختبار المحفوظ (بنك الأسئلة الثابت)
let match = null;          // سجل المواجهة الحالي (يُحفَظ تدريجياً في dual_matches)
let roundState = null;     // حالة الجولة الجارية فقط (تُبنى من جديد كل جولة)
let activeQuestion = null; // السؤال المفتوح حالياً أمام أحد الطالبَين
let timerInterval = null;
let timerSecondsLeft = QUESTION_SECONDS;
// 🌟 [جديد] آخر نقاط مُعروضة فعلياً على الشاشة (لا تُساوي بالضرورة roundState.scoreA/B لحظة
// الرسم) — تُستخدَم فقط لحساب "العد التصاعدي" البصري من القيمة القديمة للجديدة عند كل تحديث،
// وتُصفَّر مع كل جولة جديدة (راجع startRoundFlow) حتى لا يبدأ العدّاد من نقاط الجولة السابقة
let lastScorebarScores = { A: 0, B: 0 };

// ===================== نقطة الدخول =====================

export async function initDualTestPlay() {
    const matchId = AppState.dualTestPlayMatchId;
    AppState.dualTestPlayMatchId = null; // 🌟 يُقرأ مرة واحدة فقط، نفس نمط homeworkPrepPrefillStudentName

    if (!matchId) { loadSplashScreen(); return; }

    match = await AppState.dualTestsManager.getMatchById(matchId);
    if (!match) { alert('تعذر العثور على المواجهة.'); loadSplashScreen(); return; }

    test = await AppState.dualTestsManager.getTestById(match.testId);
    if (!test) { alert('تعذر العثور على الاختبار المرتبط بهذه المواجهة.'); loadSplashScreen(); return; }

    document.getElementById('dtp-back-btn')?.addEventListener('click', () => {
        if (confirm('العودة الآن ستُنهي هذه الجلسة دون حفظ الجولة الجارية إن وُجدت. متابعة؟')) {
            loadSplashScreen();
        }
    });

    document.getElementById('dtp-swap-cancel-btn')?.addEventListener('click', () => closeModal('dtp-swap-modal'));

    startRoundFlow();
}

// ===================== أدوات مساعدة عامة =====================

function studentName(key) { return key === 'A' ? match.studentNameA : match.studentNameB; }

function renderAvatarHTML(name, avatar) {
    if (avatar && avatar.length < 10) return avatar; // إيموجي
    if (avatar) return `<img src="${avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;" alt="${name}">`;
    return '👤';
}

async function getStudentAvatar(studentId) {
    try {
        const students = await AppState.studentManager.getAllStudents();
        const s = students.find(st => String(st.id) === String(studentId));
        return s ? s.avatar : null;
    } catch (e) { return null; }
}

function showView(viewId) {
    // 🌟 [مُحدَّث] أُضيفت 'dtp-draw-view' — شاشة القرعة الجديدة ملء الشاشة (راجع runNameDraw
    // أدناه)، بديل عجلة الدوران القديمة المدمجة داخل بطاقة VS
    ['dtp-welcome-view', 'dtp-draw-view', 'dtp-board-view', 'dtp-question-view', 'dtp-round-summary-view', 'dtp-final-view']
        .forEach(id => { const el = document.getElementById(id); if (el) el.style.display = (id === viewId) ? 'block' : 'none'; });
}

// 🌟 [جديد] تصنيف الدرجة (كاملة/متوسطة/منخفضة) لتلوين عرضها — يُستخدَم في شاشة السؤال حياً
// وفي نافذة ملخص النتيجة، حتى يميّز المعلم بلمحة سريعة درجة قوية من درجة تحتاج متابعة
function pointsRatingClass(score) {
    if (score >= QUESTION_POINTS) return 'pts-full';
    if (score >= QUESTION_POINTS / 2) return 'pts-mid';
    return 'pts-low';
}

// 🌟 [جديد] إعادة تشغيل حركة CSS على عنصر (لأن تعديل textContent وحده لا يُعيد حركات
// animation المرتبطة مباشرة بالعنصر — يُستخدَم لاهتزاز بطاقة السؤال عند كل خطأ جديد)
function retriggerAnimation(el, animClass) {
    if (!el) return;
    el.classList.remove(animClass);
    void el.offsetWidth; // فرض إعادة رسم (reflow) حتى تُقبَل إعادة إضافة الصنف كبداية جديدة للحركة
    el.classList.add(animClass);
}

// ===================== الترحيب / VS =====================

async function startRoundFlow() {
    const roundIndex = match.currentRoundIndex;
    const round = test.rounds[roundIndex];

    // 🌟 تحديد من يبدأ الاختيار في هذه الجولة (افتراض رقم 2 أعلاه)
    let starter;
    if (roundIndex === 0) {
        starter = Math.random() < 0.5 ? 'A' : 'B';
    } else {
        starter = match.lastRoundStarter === 'A' ? 'B' : 'A';
    }

    roundState = {
        roundIndex,
        round,
        mainStatus: round.mainQuestions.map(() => 'available'),
        swapStatus: round.swapQuestions.map(() => 'available'),
        scoreA: 0, scoreB: 0,
        mistakesA: 0, mistakesB: 0,
        helperUsed: { A: false, B: false },
        swapUsed: { A: false, B: false },
        swapCode: { A: null, B: null },
        currentTurn: starter,
        roundStarter: starter,
        questionsLog: []
    };
    lastScorebarScores = { A: 0, B: 0 }; // 🌟 تصفير تتبّع العد التصاعدي مع بداية كل جولة جديدة

    document.getElementById('dtp-round-label').textContent = t('dtp_round_label').replace('{n}', roundIndex + 1);
    document.getElementById('dtp-name-a').textContent = match.studentNameA;
    document.getElementById('dtp-name-b').textContent = match.studentNameB;
    document.getElementById('dtp-roundswon-a').textContent = match.roundsWonA || 0;
    document.getElementById('dtp-roundswon-b').textContent = match.roundsWonB || 0;

    const avatarA = await getStudentAvatar(match.studentIdA);
    const avatarB = await getStudentAvatar(match.studentIdB);
    document.getElementById('dtp-avatar-a').innerHTML = renderAvatarHTML(match.studentNameA, avatarA);
    document.getElementById('dtp-avatar-b').innerHTML = renderAvatarHTML(match.studentNameB, avatarB);

    // 🌟 [مُحدَّث] القرعة نفسها أصبحت شاشة مستقلة ملء الشاشة (dtp-draw-view، راجع runNameDraw
    // أدناه) بديلاً لعجلة الدوران القديمة المدمجة هنا داخل بطاقة VS — بطلب صريح من المعلم بعد
    // عدم إعجابه بشكل العجلة. الضغط على "🚀 ابدأ الجولة" هنا فقط ينتقل لشاشة القرعة ويشغّلها.
    const startBtn = document.getElementById('dtp-start-round-btn');
    startBtn.onclick = () => {
        startBtn.disabled = true;
        showView('dtp-draw-view');
        runNameDraw(starter, () => {
            startBtn.disabled = false;
            renderBoardView();
        });
    };

    showView('dtp-welcome-view');
}

// 🌟 [جديد بالكامل] شاشة القرعة ملء الشاشة بأسلوب "سلوت مشين" — اسما الطالبَين يتبادلان
// بسرعة تتناقص تدريجياً (تسريع/تباطؤ بصري بحت لا علاقة له بتحديد starter نفسه، المحسوم مسبقاً
// في startRoundFlow) ثم يستقران بالضبط على اسم الطالب starter بخط ضخم يملأ جزءاً كبيراً من
// الشاشة. بديل عجلة الدوران القديمة (spinWheelTo سابقاً) بطلب صريح من المعلم. لا مكتبة خارجية
// — فقط setTimeout متتالية بفواصل زمنية متزايدة + الأصوات المستقلة في dual-test-sounds.js.
function runNameDraw(starter, onDone) {
    const heading = document.getElementById('dtp-draw-heading');
    const nameEl = document.getElementById('dtp-draw-name');
    const resultEl = document.getElementById('dtp-draw-result');
    if (!heading || !nameEl || !resultEl) { onDone(); return; }

    const finalName = studentName(starter);
    const otherName = studentName(starter === 'A' ? 'B' : 'A');

    heading.textContent = t('dtp_coin_flip_start_msg');
    resultEl.textContent = '';
    nameEl.classList.remove('dtp-draw-landed');

    // 🌟 احترام تفضيل تقليل الحركة — نستقر مباشرة على الاسم النهائي بلا أي تبديل متكرر
    const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        nameEl.textContent = finalName;
        nameEl.classList.add('dtp-draw-landed');
        resultEl.textContent = t('dtp_coin_flip_result_msg').replace('{name}', finalName);
        playDrawLandSound();
        setTimeout(onDone, 900);
        return;
    }

    // 🌟 افتراض صريح غير محسوم بتوضيح مباشر من المعلم: تسلسل الفواصل الزمنية (مللي ثانية)
    // بين كل تبديل اسم — يبدأ سريعاً جداً (80) وينتهي بطيئاً (420) قبل الاستقرار، إحساس
    // تشويقي بصري بحت، قابل للتعديل بسهولة لو رغب المعلم في وتيرة مختلفة
    const sequence = [80, 80, 90, 100, 110, 130, 150, 180, 220, 270, 330, 420];
    let i = 0;
    let showFinal = false;

    function flip() {
        showFinal = !showFinal;
        nameEl.textContent = showFinal ? finalName : otherName;
        retriggerAnimation(nameEl, 'dtp-draw-tick-anim');
        playDrawTickSound();

        i++;
        if (i < sequence.length) {
            setTimeout(flip, sequence[i]);
        } else {
            nameEl.textContent = finalName; // 🌟 الاستقرار النهائي دائماً على starter المحسوم مسبقاً
            nameEl.classList.add('dtp-draw-landed');
            playDrawLandSound();
            resultEl.textContent = t('dtp_coin_flip_result_msg').replace('{name}', finalName);
            setTimeout(onDone, 1400);
        }
    }

    flip();
}

// ===================== لوحة الأسئلة =====================

function renderBoardView() {
    document.getElementById('dtp-board-round-title').textContent = t('dtp_round_label').replace('{n}', roundState.roundIndex + 1);
    renderScorebar('dtp-scorebar');

    const grid = document.getElementById('dtp-board-grid');
    grid.innerHTML = roundState.round.mainQuestions.map((q, i) => {
        const status = roundState.mainStatus[i];
        if (status === 'available') {
            return `<div class="dtp-board-cell" data-index="${i}">${q.number}</div>`;
        }
        const icon = status === 'swapped' ? '🔄' : '✅';
        return `<div class="dtp-board-cell dtp-cell-done">${icon}</div>`;
    }).join('');

    grid.querySelectorAll('.dtp-board-cell:not(.dtp-cell-done)').forEach(cell => {
        cell.addEventListener('click', () => {
            const idx = parseInt(cell.dataset.index, 10);
            openQuestion({ kind: 'main', mainIndex: idx, question: roundState.round.mainQuestions[idx] });
        });
    });

    document.getElementById('dtp-end-round-btn').onclick = () => {
        if (confirm('إنهاء الجولة الآن يدوياً؟ الأسئلة المتبقية على اللوحة تبقى بلا إجابة.')) {
            finishRound();
        }
    };

    showView('dtp-board-view');
}

function renderScorebar(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;
    // 🌟 [جديد] القيم القديمة (قبل هذا الرسم) — نبني بها العنصر أولاً، ثم نُحرّكه بصرياً
    // تصاعدياً للقيمة الجديدة (راجع animateScoreCountUp)، بدل قفزة رقمية مفاجئة بلا حركة
    const prevA = lastScorebarScores.A;
    const prevB = lastScorebarScores.B;
    const sideHTML = (key) => {
        const active = roundState.currentTurn === key ? 'dtp-turn-active' : '';
        const helperUsed = roundState.helperUsed[key] ? 'used' : '';
        const swapUsed = roundState.swapUsed[key] ? 'used' : '';
        const displayScore = key === 'A' ? prevA : prevB;
        const mistakes = key === 'A' ? roundState.mistakesA : roundState.mistakesB;
        return `
        <div class="dtp-score-side ${active}">
            <span class="dtp-score-name">${studentName(key)}</span>
            <span class="dtp-score-points" data-score-side="${key}">${displayScore}</span>
            <span class="dtp-score-icons">
                <span class="${helperUsed}" title="${t('dtp_btn_helper')}">💡</span>
                <span class="${swapUsed}" title="${t('dtp_btn_swap')}">🔄</span>
                <span title="${t('dtp_mistakes_count_label').replace('{n}', mistakes)}">❌${mistakes}</span>
            </span>
        </div>`;
    };
    el.innerHTML = sideHTML('A') + sideHTML('B');

    animateScoreCountUp(el.querySelector('[data-score-side="A"]'), prevA, roundState.scoreA);
    animateScoreCountUp(el.querySelector('[data-score-side="B"]'), prevB, roundState.scoreB);
    lastScorebarScores = { A: roundState.scoreA, B: roundState.scoreB };

    updateScorebarTension(el, roundState.scoreA, roundState.scoreB);
}

// 🌟 [جديد] عد تصاعدي بصري لنقاط طالب من القيمة القديمة للجديدة (بند 1 من طلبات المعلم —
// "تجربة بصرية أعمق")، ثم "نطّة" popIn خفيفة عند الوصول للرقم النهائي فقط
function animateScoreCountUp(el, from, to) {
    if (!el) return;
    if (from === to) { el.textContent = to; return; }
    const duration = 450;
    const startTime = performance.now();
    function step(now) {
        const progress = Math.min(1, (now - startTime) / duration);
        const current = from + (to - from) * progress;
        el.textContent = Math.round(current * 100) / 100;
        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            el.textContent = to;
            retriggerAnimation(el, 'dtp-score-pop-anim');
        }
    }
    requestAnimationFrame(step);
}

// 🌟 [جديد] "لحظة حاسمة" — توهج ذهبي نابض على شريط النقاط كله عندما يبقى الفرق بين
// الطالبين درجة واحدة أو أقل (وبعد بدء التسجيل فعلياً، حتى لا يظهر التوهج عند 0-0). افتراض
// صريح غير محسوم بتوضيح مباشر من المعلم لعتبة "الفرق البسيط جداً" — اخترتُ فرق ≤ 1 نقطة كبداية
// معقولة، قابلة للتعديل بسهولة (المتغير THRESHOLD أدناه) لو رغب المعلم في عتبة مختلفة
function updateScorebarTension(el, scoreA, scoreB) {
    if (!el) return;
    const THRESHOLD = 1;
    const diff = Math.abs(scoreA - scoreB);
    const hasStarted = scoreA > 0 || scoreB > 0;
    el.classList.toggle('dtp-tension', hasStarted && diff > 0 && diff <= THRESHOLD);
}

// ===================== شاشة السؤال =====================

function openQuestion({ kind, mainIndex, swapIndex, question, originalMainIndex }) {
    activeQuestion = {
        kind, mainIndex, swapIndex, question, originalMainIndex,
        forStudent: roundState.currentTurn,
        mistakesThisQuestion: 0,
        wasSwapped: false,
        helperUsedOnThis: false // 🌟 [جديد] هل استُخدمت المساعدة أثناء هذا السؤال تحديداً (لعرضها عند الاعتماد)
    };
    renderQuestionView();
}

function renderQuestionView() {
    renderScorebar('dtp-question-scorebar');

    document.getElementById('dtp-question-turn').textContent =
        t('dtp_question_turn_label').replace('{name}', studentName(activeQuestion.forStudent));

    // 🌟 [مُحدَّث] عرض "من"/"إلى" في كتلتين منفصلتين بخط كبير بدل نص مُنسَّق واحد (بند 5 من طلبات
    // المعلم — خط يناسب قراءة الأطفال من موبايل/آيباد)، بدل الاعتماد على formatQuestionRange
    document.getElementById('dtp-question-from').textContent = activeQuestion.question.fromText || '';
    document.getElementById('dtp-question-to').textContent = activeQuestion.question.toText || '';

    document.getElementById('dtp-mistakes-counter').textContent =
        t('dtp_mistakes_count_label').replace('{n}', activeQuestion.mistakesThisQuestion);

    // 🌟 الدرجة الحالية المتوقعة لهذا السؤال — تتحدّث حياً مع كل ضغطة "تسجيل خطأ"، حتى يرى
    // المعلم قبل الاعتماد كم ستكون الدرجة النهائية من أصل QUESTION_POINTS (10)، بتلوين يعكس
    // مستوى الدرجة (أخضر كاملة / ذهبي متوسطة / أحمر منخفضة)
    const liveScore = computeQuestionScore(activeQuestion.mistakesThisQuestion);
    const currentPointsEl = document.getElementById('dtp-current-points');
    currentPointsEl.textContent = t('dtp_current_points_label').replace('{score}', liveScore).replace('{max}', QUESTION_POINTS);
    currentPointsEl.className = 'dtp-current-points ' + pointsRatingClass(liveScore);

    const studentKey = activeQuestion.forStudent;
    document.getElementById('dtp-btn-helper').disabled = roundState.helperUsed[studentKey];
    document.getElementById('dtp-btn-swap').disabled = roundState.swapUsed[studentKey]
        || roundState.swapStatus.every(s => s !== 'available');

    if (TIMER_ENABLED) startTimer(); // 🌟 المؤقت مُعطَّل حالياً — راجع تعريف TIMER_ENABLED أعلاه
    showView('dtp-question-view');

    document.getElementById('dtp-btn-mistake').onclick = onMistakeClick;
    document.getElementById('dtp-btn-helper').onclick = onHelperClick;
    document.getElementById('dtp-btn-swap').onclick = onSwapClick;
    document.getElementById('dtp-btn-finish').onclick = onFinishQuestionClick;
}

function startTimer() {
    stopTimer();
    timerSecondsLeft = QUESTION_SECONDS;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timerSecondsLeft--;
        updateTimerDisplay();
        if (timerSecondsLeft <= 0) stopTimer(); // 🌟 بصري فقط — لا يحدث أي احتساب تلقائي
    }, 1000);
}

function stopTimer() {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = null;
}

function updateTimerDisplay() {
    const el = document.getElementById('dtp-timer');
    if (!el) return;
    const m = Math.max(0, Math.floor(timerSecondsLeft / 60));
    const s = Math.max(0, timerSecondsLeft % 60);
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    el.classList.toggle('timer-warning', timerSecondsLeft <= 10);
}

// 🌟 [مُحدَّث] الضغط على "تسجيل خطأ" لم يعد يخصم من نقاط الطالب مباشرة — فقط يزيد عدّاد
// أخطاء هذا السؤال تحديداً (وعدّاد أخطاء الطالب الكلي في الجولة، للإحصائية). الخصم الفعلي من
// نقاط الطالب يُحتسَب كله دفعة واحدة عند "✅ اعتماد الإجابة" (راجع onFinishQuestionClick)،
// بحيث تكون الدرجة النهائية لكل سؤال = 10 كاملة أو أقل بمقدار الأخطاء المسجَّلة له.
function onMistakeClick() {
    const key = activeQuestion.forStudent;
    activeQuestion.mistakesThisQuestion++;
    if (key === 'A') roundState.mistakesA++; else roundState.mistakesB++;
    renderQuestionView();
    // 🌟 [جديد] اهتزاز بصري خفيف لبطاقة السؤال عند كل خطأ — لفتة انتباه لطيفة بلا إزعاج
    retriggerAnimation(document.querySelector('.dtp-question-card'), 'dtp-shake-anim');
    playMistakeSound(); // 🌟 [جديد] نغمة تنبيه قصيرة عند تسجيل الخطأ — بطلب صريح من المعلم
}

// 🌟 [مُحدَّث] بطلب صريح من المعلم: زر "مساعدة" ليس له أي علاقة بمحتوى القرآن — المعلم نفسه
// هو من يساعد الطالب صوتياً وقت اللعب، وكل ما يفعله الزر برمجياً هو تسجيل أن الطالب استخدم
// حقه في المساعدة (مرة واحدة لكل جولة) حتى يظهر ذلك في شريط النقاط والتقرير لاحقاً.
function onHelperClick() {
    const key = activeQuestion.forStudent;
    if (roundState.helperUsed[key]) return;

    roundState.helperUsed[key] = true;
    activeQuestion.helperUsedOnThis = true; // 🌟 لعرضها في ملخص اعتماد هذا السؤال تحديداً
    document.getElementById('dtp-btn-helper').disabled = true;
    renderScorebar('dtp-question-scorebar');
}

function onSwapClick() {
    const key = activeQuestion.forStudent;
    if (roundState.swapUsed[key]) return;

    const available = roundState.round.swapQuestions
        .map((q, i) => ({ q, i }))
        .filter(({ i }) => roundState.swapStatus[i] === 'available');

    if (available.length === 0) { alert(t('dtp_no_swap_available_alert')); return; }

    const list = document.getElementById('dtp-swap-codes-list');
    list.innerHTML = available.map(({ q, i }) =>
        `<button type="button" class="dtp-swap-code-btn" data-swap-index="${i}">${q.code}</button>`
    ).join('');

    list.querySelectorAll('button[data-swap-index]').forEach(btn => {
        btn.addEventListener('click', () => {
            const swapIndex = parseInt(btn.dataset.swapIndex, 10);
            applySwap(swapIndex);
            closeModal('dtp-swap-modal');
        });
    });

    openModal('dtp-swap-modal');
}

function applySwap(swapIndex) {
    const key = activeQuestion.forStudent;
    const swapQuestion = roundState.round.swapQuestions[swapIndex];

    roundState.swapStatus[swapIndex] = 'used';
    roundState.swapUsed[key] = true;
    roundState.swapCode[key] = swapQuestion.code;

    // السؤال الأصلي على اللوحة لا يرجع أبداً — يُعلَّم "اتبدّل" نهائياً
    const originalMainIndex = activeQuestion.kind === 'main' ? activeQuestion.mainIndex : activeQuestion.originalMainIndex;
    roundState.mainStatus[originalMainIndex] = 'swapped';

    activeQuestion = {
        kind: 'swap', swapIndex, question: swapQuestion, originalMainIndex,
        forStudent: key,
        mistakesThisQuestion: 0, // 🌟 افتراض رقم 4 أعلاه
        wasSwapped: true
    };

    renderQuestionView();
}

// 🌟 [مُحدَّث] "✅ اعتماد الإجابة" — يحسب درجة السؤال (كاملة 10 أو أقل حسب الأخطاء)، يضيفها
// لرصيد الطالب في الجولة، يسجّل كل تفاصيل السؤال في questionsLog، ثم يعرض للمعلم ملخصاً فورياً
// (نافذة dtp-question-result-modal) بعدد الأخطاء والدرجة المكتسَبة والخصم واستخدام المساعدة،
// قبل الانتقال فعلياً للسؤال التالي أو نهاية الجولة — بطلب صريح من المعلم.
function onFinishQuestionClick() {
    if (!activeQuestion) return;
    stopTimer();

    const key = activeQuestion.forStudent;
    const mistakes = activeQuestion.mistakesThisQuestion;
    const earnedPoints = computeQuestionScore(mistakes);
    const deduction = Math.round((QUESTION_POINTS - earnedPoints) * 100) / 100;
    const helperUsedOnThis = activeQuestion.helperUsedOnThis;

    if (key === 'A') roundState.scoreA = Math.round((roundState.scoreA + earnedPoints) * 100) / 100;
    else roundState.scoreB = Math.round((roundState.scoreB + earnedPoints) * 100) / 100;

    roundState.questionsLog.push({
        kind: activeQuestion.kind,
        ref: activeQuestion.kind === 'main' ? activeQuestion.question.number : activeQuestion.question.code,
        student: key,
        mistakes,
        earnedPoints,
        deduction,
        helperUsed: helperUsedOnThis,
        wasSwapped: activeQuestion.wasSwapped
    });

    if (activeQuestion.kind === 'main' && roundState.mainStatus[activeQuestion.mainIndex] === 'available') {
        roundState.mainStatus[activeQuestion.mainIndex] = 'answered';
    }
    // لو كان سؤالاً بديلاً (swap)، الحالة الأصلية اتعلّمت 'swapped' مسبقاً وقت التبديل نفسه

    // 🌟 [جديد] نغمة نجاح صاعدة عند اعتماد إجابة بلا أي خطأ فيها فقط — بطلب صريح من المعلم
    // ("نغمة نجاح عند الإجابة الصحيحة")؛ سؤال به أخطاء مسجَّلة (حتى لو اعتُمد لاحقاً) لا يُشغّلها
    if (mistakes === 0) playSuccessSound();

    showQuestionResultModal(key, { mistakes, earnedPoints, deduction, helperUsedOnThis });
}

// 🌟 [جديد] عرض ملخص نتيجة السؤال فور اعتماده — يبقى ظاهراً حتى يضغط المعلم "متابعة"
function showQuestionResultModal(key, info) {
    document.getElementById('dtp-result-student-name').textContent = studentName(key);
    document.getElementById('dtp-result-points').textContent = `${info.earnedPoints} / ${QUESTION_POINTS}`;
    document.getElementById('dtp-result-mistakes').textContent = info.mistakes;
    document.getElementById('dtp-result-deduction').textContent = info.deduction > 0 ? `-${info.deduction}` : '0';
    document.getElementById('dtp-result-helper').textContent = info.helperUsedOnThis ? t('dtp_yes') : t('dtp_no');

    // 🌟 [جديد] لون بطاقة الدرجة يعكس مستواها (نفس منطق pointsRatingClass المستخدم حياً أثناء السؤال)
    const pointsBox = document.querySelector('#dtp-question-result-modal .dtp-result-points-box');
    if (pointsBox) pointsBox.className = 'dtp-result-points-box ' + pointsRatingClass(info.earnedPoints);

    document.getElementById('dtp-result-continue-btn').onclick = () => {
        closeModal('dtp-question-result-modal');
        advanceAfterQuestion(key);
    };

    openModal('dtp-question-result-modal');
}

// 🌟 [جديد] الانتقال الفعلي بعد إغلاق ملخص النتيجة — فُصل عن onFinishQuestionClick حتى يبقى
// ملخص السؤال ظاهراً قبل تغيّر الشاشة للوحة أو لنهاية الجولة
function advanceAfterQuestion(key) {
    roundState.currentTurn = key === 'A' ? 'B' : 'A';
    activeQuestion = null;

    if (roundState.mainStatus.every(s => s !== 'available')) {
        finishRound();
    } else {
        renderBoardView();
    }
}

// ===================== نهاية الجولة =====================

async function finishRound() {
    stopTimer();

    const roundWinner = computeRoundWinner(roundState.scoreA, roundState.scoreB);
    const roundResult = {
        roundNumber: roundState.roundIndex + 1,
        scoreA: roundState.scoreA, scoreB: roundState.scoreB,
        mistakesA: roundState.mistakesA, mistakesB: roundState.mistakesB,
        helperUsedA: roundState.helperUsed.A, helperUsedB: roundState.helperUsed.B,
        swapUsedA: roundState.swapUsed.A, swapUsedB: roundState.swapUsed.B,
        swapCodeA: roundState.swapCode.A, swapCodeB: roundState.swapCode.B,
        roundWinner,
        questionsLog: roundState.questionsLog
    };

    match.rounds.push(roundResult);
    match.lastRoundStarter = roundState.roundStarter;

    try { await AppState.dualTestsManager.saveMatch(match); } catch (e) { /* best-effort */ }

    document.getElementById('dtp-summary-title').textContent = t('dtp_summary_title').replace('{n}', roundResult.roundNumber);
    document.getElementById('dtp-summary-name-a').textContent = match.studentNameA;
    document.getElementById('dtp-summary-name-b').textContent = match.studentNameB;
    document.getElementById('dtp-summary-score-a').textContent = roundResult.scoreA;
    document.getElementById('dtp-summary-score-b').textContent = roundResult.scoreB;

    const badgeEl = document.getElementById('dtp-summary-winner-badge');
    if (roundWinner === 'tie') {
        badgeEl.innerHTML = `<span class="dtp-winner-badge dtp-tie-badge">${t('dtp_tie_label')}</span>`;
    } else {
        const winnerName = roundWinner === 'A' ? match.studentNameA : match.studentNameB;
        badgeEl.innerHTML = `<span class="dtp-winner-badge">${t('dtp_winner_label').replace('{name}', winnerName)}</span>`;
    }

    const nextBtn = document.getElementById('dtp-summary-next-btn');
    const isLastRound = match.rounds.length >= 3;
    nextBtn.textContent = isLastRound ? t('dtp_view_final_btn') : t('dtp_next_round_btn');
    nextBtn.onclick = () => {
        if (isLastRound) {
            finishMatch();
        } else {
            match.currentRoundIndex = match.rounds.length;
            startRoundFlow();
        }
    };

    showView('dtp-round-summary-view');
}

// ===================== نهاية المواجهة =====================

async function finishMatch() {
    const series = computeSeriesResult(match.rounds);
    match.roundsWonA = series.roundsWonA;
    match.roundsWonB = series.roundsWonB;
    match.roundsTied = series.roundsTied;
    match.totalPointsA = series.totalPointsA;
    match.totalPointsB = series.totalPointsB;
    match.result = series.result;
    match.status = 'completed';
    match.finishedAt = new Date().toISOString();

    try { await AppState.dualTestsManager.saveMatch(match); } catch (e) { /* best-effort */ }

    document.getElementById('dtp-final-name-a').textContent = match.studentNameA;
    document.getElementById('dtp-final-name-b').textContent = match.studentNameB;
    document.getElementById('dtp-final-rounds-a').textContent = t('dtp_final_rounds_label').replace('{n}', series.roundsWonA);
    document.getElementById('dtp-final-rounds-b').textContent = t('dtp_final_rounds_label').replace('{n}', series.roundsWonB);
    document.getElementById('dtp-final-points-a').textContent = t('dtp_final_points_label').replace('{n}', series.totalPointsA);
    document.getElementById('dtp-final-points-b').textContent = t('dtp_final_points_label').replace('{n}', series.totalPointsB);

    const badgeEl = document.getElementById('dtp-final-winner-badge');
    if (series.result === 'tie') {
        badgeEl.innerHTML = `<span class="dtp-winner-badge dtp-tie-badge">${t('dtp_final_tie_label')}</span>`;
    } else {
        const winnerName = series.result === 'A_win' ? match.studentNameA : match.studentNameB;
        badgeEl.innerHTML = `<span class="dtp-winner-badge">${t('dtp_final_winner_label').replace('{name}', winnerName)}</span>`;
        // 🌟 [جديد] احتفال بصري (كونفيتي) عند وجود فائز فعلي — إعادة استخدام مكوّن triggerConfetti
        // الموجود أصلاً في components/ui.js (يعتمد على canvas#confetti العام في index.html)، بلا
        // أي مكتبة جديدة، ولا يُستدعى عند التعادل حتى لا يبدو احتفالاً غير مبرَّر
        try { triggerConfetti(); } catch (e) { /* best-effort — لا يعطّل عرض النتيجة لو فشل */ }
        // 🌟 [جديد] احتفال صوتي (تصفيق مُصطنَع + نغمات) عند وجود فائز فعلي فقط — بطلب صريح من
        // المعلم ("صوت تصفيق أو تكبير عند الفوز النهائي"). راجع تعليق أعلى dual-test-sounds.js:
        // هذا تقريب مُصطنَع بالكامل (Web Audio API)، وليس تسجيلاً حقيقياً لتصفيق أو تكبير
        try { playWinSound(); } catch (e) { /* best-effort */ }
    }

    // 🌟 [جديد] تقييم ومنح الأوسمة/الإنجازات المستحقة لكلا الطالبَين بعد اكتمال المواجهة (بند 3
    // من طلبات المعلم) — تُقرأ كل المواجهات المكتملة (تتضمّن هذه المواجهة نفسها بعد حفظها أعلاه)
    // ثم تُقيَّم عبر evaluateMatchAchievements، وتُحفَظ الأوسمة الجديدة فقط في dual_test_achievements
    let newBadgesA = [], newBadgesB = [];
    try {
        const allMatches = await AppState.dualTestsManager.getAllMatches();
        newBadgesA = await evaluateAndSaveAchievements(match.studentIdA, match, allMatches);
        newBadgesB = await evaluateAndSaveAchievements(match.studentIdB, match, allMatches);
    } catch (e) { /* best-effort — فشل تقييم الأوسمة لا يعطّل عرض النتيجة النهائية */ }
    renderBadgesReveal(newBadgesA, newBadgesB);

    document.getElementById('dtp-final-back-btn').onclick = () => loadSplashScreen();

    showView('dtp-final-view');
}

// 🌟 [جديد] تقييم أوسمة طالب واحد وحفظ الجديد منها فقط في قاعدة البيانات — الأوسمة غير
// القابلة للتكرار (repeatable: false) تُفحَص أولاً عبر hasAchievement حتى لا تُمنَح مرتين لنفس
// الطالب؛ الأوسمة القابلة للتكرار تُحفَظ في كل مرة يستحقها الطالب فيها من جديد
async function evaluateAndSaveAchievements(studentId, currentMatch, allMatches) {
    const earned = evaluateMatchAchievements(studentId, currentMatch, allMatches);
    const shown = [];
    for (const item of earned) {
        const badgeDef = BADGE_CATALOG[item.badgeKey];
        if (!badgeDef) continue;
        if (!badgeDef.repeatable) {
            const already = await AppState.dualTestsManager.hasAchievement(studentId, item.badgeKey);
            if (already) continue;
        }
        await AppState.dualTestsManager.addAchievement({
            studentId,
            badgeKey: item.badgeKey,
            matchId: currentMatch.id,
            meta: item.meta || null
        });
        shown.push({ badgeKey: item.badgeKey, icon: badgeDef.icon, nameKey: badgeDef.nameKey, meta: item.meta || null });
    }
    return shown;
}

// 🌟 [جديد] عرض بطاقة "أوسمة جديدة" في شاشة النتيجة النهائية — تظهر فقط لو استحق أي طرف
// وساماً جديداً في هذه المواجهة تحديداً، وتبقى مخفية تماماً غير ذلك (بلا بطاقة فارغة مزعجة)
function renderBadgesReveal(badgesA, badgesB) {
    const container = document.getElementById('dtp-badges-reveal');
    if (!container) return;
    const all = [
        ...badgesA.map(b => ({ ...b, side: 'A' })),
        ...badgesB.map(b => ({ ...b, side: 'B' }))
    ];
    if (all.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    const chipsHTML = all.map(b => `
        <span class="dtp-badge-chip">
            <span class="dtp-badge-chip-icon">${b.icon}</span>
            ${t(b.nameKey)} — ${studentName(b.side)}
        </span>`).join('');
    container.innerHTML = `<div class="dtp-badges-reveal-title">${t('dtp_new_badges_title')}</div>${chipsHTML}`;
    container.style.display = 'block';
}
