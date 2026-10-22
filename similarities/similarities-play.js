// similarities/similarities-play.js
//
// 🌟 [جديد] شاشة لعب "ركن المتشابهات" التفاعلية — تستهلك engine/similarityEngine.js (منطق
// بحت بلا أي DOM) لبناء جولة أسئلة اختيار من متعدد (MCQ)، وتعرضها هنا سؤالاً بعد الآخر
// بتصحيح تلقائي فوري (نفس فلسفة ألعاب الأطفال الحالية في games/kidsGame.js: صوت نجاح/خطأ +
// كونفيتي + توست تشجيع) لكن بواجهة DOM مستقلة تماماً (معزولة عن games/kidsGame.html/js
// بالكامل) بنفس فلسفة عزل similarities.js عن games/ وsettings/ — حتى لا يخاطر أي تعديل هنا
// بكسر شاشة ألعاب الأطفال الحالية الشغالة فعلياً.
//
// هدف اللعبة (بطلب صريح من المعلم): تعريف الطفل على المتشابهات وتسهيل حفظها، لا تقييمه
// رسمياً — لذلك كل إجابة تُصحَّح آلياً وفورياً بلا أي تدخل من المعلم (بخلاف نمط "التسميع
// اليدوي" المستخدم في بقية شاشات المنصة).
//
// 🌟 [عدّل — 2026-09-16، الجولة الثانية] كانت الشاشة تلعب مجموعة واحدة فقط (AppState.
// similarityGamePlayGroupId). بطلب صريح من المعلم أصبح نطاق اللعب أوسع: "لعبة السورة
// بالكامل" أو "لعبة الجزء بالكامل" — تُجمع كل مجموعات النطاق المطلوب معاً في جولة واحدة
// (buildGameRound الجديدة تستقبل مصفوفة مجموعات، راجع engine/similarityEngine.js). لذلك
// PlayState أصبح يحمل مصفوفة groups بدل مجموعة واحدة، وكل سؤال يحمل بيانات مجموعته الخاصة
// (anchorPhrase/scope) بدل الاعتماد على مجموعة ثابتة للجولة كلها (راجع buildOccurrenceHTML/
// renderQuestion أدناه).
import { AppState, loadSplashScreen, t } from '../core/app.js';
import { showToastEncouragement, triggerConfetti } from '../components/ui.js';
import { JUZ_BUCKETS, bucketTitle } from './similarities.js';
import { buildGameRound } from '../engine/similarityEngine.js';
import { ensureSimilarityQuran, questionTextToHTML, stripHizbMark, localizedQuestionText, pairOptionLabel } from '../engine/similarityQuestions.js';
import { groupSignature, groupAnswersBySignature, summarizeByType, levelOf } from '../engine/similarityMastery.js';

// 🌟 نفس آلية الصوت المستخدمة في games/kidsGame.js بالضبط (Web Audio API المدمجة في
// المتصفح، بلا أي ملف صوتي خارجي) — نسخة مستقلة هنا (وليست استيراداً من kidsGame.js) حتى
// تبقى شاشة اللعب هذه معزولة تماماً بلا أي أثر جانبي على GameState الخاص بألعاب الأطفال.
const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContextCtor();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSuccessSound() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5);
    osc.stop(audioCtx.currentTime + 0.5);
}

// 🌟 [تعديل] نفس التعديل المطبَّق على playErrorSound في games/kidsGame.js بالضبط —
// النغمة "sawtooth" الحادة بحجم صوت كامل (gain=1 افتراضياً) كانت بتخوّف الطفل لما يجاوب
// غلط في لعبة المتشابهات (نفس الآلية المنسوخة من kidsGame.js، فنفس المشكلة موجودة هنا
// أيضاً). استبدلناها بنفس النغمة الهادئة "sine" بحجم صوت منخفض 🌟
function playErrorSound() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(392, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    osc.stop(audioCtx.currentTime + 0.35);
}

// 🌟 [عدّل — 2026-09-16، الجولة الثانية] group الواحدة أصبحت groups (مصفوفة) + scopeTitle
// (عنوان النطاق المعروض في شريط العنوان: اسم السورة أو اسم الجزء) — بلا حاجة لأي تخزين دائم
// (لا تقارير، لا حفظ في سجل الطالب)، لأن هذه لعبة تعريف/تدريب سريعة وليست تقييماً رسمياً
// يُحفظ لملف الطالب (بخلاف ألعاب الأطفال الرسمية في games/kidsGame.js).
// 🌟 [جديد — 2026-09-23] allGroupsPool: كل مجموعات المتشابهات في المنصة (لا فقط مجموعات نطاق
// الجولة الحالية) — يُحمَّل مرة واحدة عند بدء اللعبة ويُخزَّن هنا لإعادة استخدامه في "العب مرة
// أخرى" بلا إعادة استعلام IndexedDB. يلزم لسؤال "التعرّف" (sim_recognition) الذي يحتاج مشتتات
// دخيلة من مجموعات أخرى تماماً — راجع تعليق generateRecognitionQuestions في
// engine/similarityEngine.js.
let PlayState = { groups: [], scopeTitle: '', round: null, currentIndex: 0, correctCount: 0, student: null, answers: [], sigById: new Map() };

// 🌟 [2026-10-11] آخر طالب لعب (تذكّر بسيط لتسهيل الاختيار) — كل قراءة/كتابة محمية بـtry/catch
const LAST_STUDENT_KEY = 'dh_sim_last_student';
function readLastStudentId() { try { return localStorage.getItem(LAST_STUDENT_KEY); } catch (e) { return null; } }
function writeLastStudentId(id) { try { localStorage.setItem(LAST_STUDENT_KEY, String(id)); } catch (e) { /* لا شيء */ } }

function escapeHtmlText(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 🌟 [جديد] يحل مجموعات اللعب الفعلية + عنوان النطاق من كائن scope الممرَّر عبر
// AppState.similarityGamePlayScope — راجع تعليق رأس الملف وتعليق الحقل في core/app.js.
async function resolveScopeGroups(scope) {
    if (!scope || !AppState.similaritiesManager) return { groups: [], title: '' };
    // 🌟 [2026-10-03] ننتظر تحميل الـ Seed الذي صار في الخلفية أثناء الإقلاع (core/app.js)
    if (AppState.similaritiesReady) await AppState.similaritiesReady;

    if (scope.type === 'surah') {
        const groups = await AppState.similaritiesManager.getInternalBySurah(scope.surahNumber);
        const surahInfo = (AppState.surahsData || []).find(s => s.number === scope.surahNumber);
        return { groups, title: surahInfo ? surahInfo.name : '' };
    }

    if (scope.type === 'juz') {
        const all = await AppState.similaritiesManager.getAllSimilarities();
        if (scope.juzId === 'amma') {
            return { groups: all.filter(r => r.scope === 'juzAmma'), title: t('sim_juz_amma') };
        }
        const bucket = JUZ_BUCKETS.find(b => b.id === scope.juzId);
        if (!bucket) return { groups: [], title: '' };
        const groups = all.filter(r => r.scope === 'internal' && (r.surahs || []).some(sn => sn >= bucket.from && sn <= bucket.to));
        return { groups, title: bucketTitle(bucket) };
    }

    return { groups: [], title: '' };
}

export async function initSimilarityGamePlay() {
    // 🌟 نفس فكرة dualTestPlayMatchId في core/app.js بالضبط: حقل "لقطة واحدة" يُقرأ هنا مرة
    // واحدة ثم يُفرَّغ فوراً حتى لا يؤثر على أي فتح لاحق عادي للشاشة
    const scope = AppState.similarityGamePlayScope;
    AppState.similarityGamePlayScope = null;

    const exitBtn = document.getElementById('simplay-btn-exit');
    if (exitBtn) exitBtn.addEventListener('click', () => loadSplashScreen());

    const container = document.getElementById('simplay-container');
    if (!container) return;

    if (!scope) {
        container.innerHTML = `<div class="sim-empty">${t('sim_no_data')}</div>`;
        return;
    }

    const { groups, title } = await resolveScopeGroups(scope);
    if (groups.length === 0) {
        container.innerHTML = `<div class="sim-empty">${t('sim_no_data')}</div>`;
        return;
    }

    const anchorEl = document.getElementById('simplay-anchor');
    if (anchorEl) anchorEl.textContent = ''; // 🌟 يُحدَّث لاحقاً لكل سؤال على حدة (راجع renderQuestion)
    const titleEl = document.getElementById('simplay-title');
    if (titleEl) titleEl.textContent = `${t('sim_game_title')} — ${title}`;

    // نص الآيات يُقرأ من مصحف المنصة (لا من fullText في بيانات المجموعات)
    try { await ensureSimilarityQuran(AppState.quranEngine); }
    catch (e) { console.warn('تعذّر تحميل المصحف لأسئلة المتشابهات:', e); container.innerHTML = `<div class="sim-empty">${t('sim_no_data')}</div>`; return; }

    const round = buildGameRound(groups);
    // 🛡️ خط دفاع صريح (لا نفترض صمتاً أن كل مجموعة صالحة للعب): لو لم تتوفر بيانات كافية
    // (كل المجموعات بموضع واحد، أو كل مواضعها بنفس رقم آية/سورة...) نعرض رسالة ودّية للمعلم
    // بدل شاشة أسئلة فارغة أو خطأ برمجي — راجع تعليق buildGameRound في
    // engine/similarityEngine.js لتفاصيل الحالات المُستبعَدة.
    if (!round.hasEnoughData) {
        container.innerHTML = `<div class="sim-empty">${t('sim_game_not_enough_data')}</div>`;
        return;
    }

    PlayState = { groups, scopeTitle: title, round, currentIndex: 0, correctCount: 0, student: null, answers: [],
        sigById: new Map(groups.map(g => [g.groupId, groupSignature(g)])) };
    await showStudentPicker();
}

// 🌟 [2026-10-11] اختيار الطالب قبل الجولة: لتُحفظ نتيجته ويُقاس إتقانه لكل مجموعة. «بدون حفظ» يبقي
// السلوك القديم (لعب تدريبي حر بلا تسجيل).
async function showStudentPicker() {
    const container = document.getElementById('simplay-container');
    if (!container) return;
    let students = [];
    try { students = AppState.studentManager ? await AppState.studentManager.getAllStudents() : []; } catch (e) { students = []; }
    const lastId = readLastStudentId();
    const btns = students.map(st => `<button class="btn sim-pick-student-btn${String(st.id) === lastId ? ' sim-pick-last' : ''}" data-student="${escapeHtmlText(st.id)}">${escapeHtmlText(st.name)}</button>`).join('');
    container.innerHTML = `
        <div class="sim-group-card sim-pick-student">
            <div class="sim-play-prompt">${t('sim_pick_student_title')}</div>
            <p class="sim-pick-hint">${students.length ? t('sim_pick_student_hint') : t('sim_pick_no_students')}</p>
            <div class="sim-pick-grid">${btns}</div>
            <button class="btn btn-outline sim-pick-guest" id="simplay-guest">${t('sim_pick_guest_btn')}</button>
        </div>`;
    const anchorEl = document.getElementById('simplay-anchor');
    if (anchorEl) anchorEl.textContent = '';
    const progEl = document.getElementById('simplay-progress');
    if (progEl) progEl.textContent = '';
    const begin = (student) => {
        PlayState.student = student;
        if (student) writeLastStudentId(student.id);
        initAudio();
        renderQuestion();
    };
    container.querySelectorAll('.sim-pick-student-btn').forEach(b => {
        b.addEventListener('click', () => begin(students.find(st => String(st.id) === b.dataset.student) || null));
    });
    document.getElementById('simplay-guest')?.addEventListener('click', () => begin(null));
}

function updateProgressUI() {
    const el = document.getElementById('simplay-progress');
    if (el) el.textContent = `${PlayState.currentIndex + 1} / ${PlayState.round.questions.length}`;
}

// 🌟 [إعادة كتابة] الأسئلة الأربعة (من أي سورة؟ / أكمل الآية / ماذا بعدها؟ / ما قبلها؟) يولّدها engine/similarityQuestions.js
// بنص سؤال كامل جاهز (الآيات بين ﴿ ﴾ والسياق داخله، بلا أي رقم آية)، فلا حاجة لبناء سياق خاص بكل نوع هنا:
// نعرض نص السؤال كما هو ثم الخيارات. الخيارات القرآنية آيات/نهايات آيات تُعرض بسطر مستقل لكل خيار.
const SURAH_OPTION_TYPES = new Set(['sim_pair', 'sim_notin']);

function buildOptionsHTML(q) {
    const isSurah = SURAH_OPTION_TYPES.has(q.type);
    return q.options.map((opt, i) => {
        const classes = ['btn', 'btn-outline', 'sim-play-option-btn'];
        if (!isSurah) classes.push('quran-text', 'sim-play-option-fulltext');
        return `<button class="${classes.join(' ')}" data-opt="${encodeURIComponent(String(opt))}">${escapeHtmlText(SURAH_OPTION_TYPES.has(q.type) ? pairOptionLabel(opt) : ((q.optionsDisplay && q.optionsDisplay[i]) || opt))}</button>`;
    }).join('');
}

async function renderQuestion() {
    const container = document.getElementById('simplay-container');
    if (!container) return;
    updateProgressUI();

    const q = PlayState.round.questions[PlayState.currentIndex];

    // صندوق العنوان الذهبي (#simplay-anchor) يعرض عبارة مجموعة هذا السؤال تحديداً (الجولة تخلط مجموعات مختلفة)
    const anchorEl = document.getElementById('simplay-anchor');
    if (anchorEl) anchorEl.textContent = `« ${stripHizbMark(q.anchorPhrase)} »`;

    const optionsExtraClass = SURAH_OPTION_TYPES.has(q.type) ? '' : ' sim-play-options-fulltext';
    container.innerHTML = `
        <div class="sim-group-card">
            <div class="sim-play-prompt sim-q-text">${questionTextToHTML(localizedQuestionText(q))}</div>
            <div class="sim-play-options${optionsExtraClass}">${buildOptionsHTML(q)}</div>
            <div class="sim-play-feedback" id="simplay-feedback"></div>
        </div>`;

    container.querySelectorAll('.sim-play-option-btn').forEach(btn => {
        btn.addEventListener('click', () => handleAnswer(btn, q));
    });
}

function handleAnswer(btn, q) {
    // 🛡️ تعطيل كل الأزرار فور أول اختيار — يمنع نقرات متعددة سريعة قبل انتقال السؤال التالي
    document.querySelectorAll('.sim-play-option-btn').forEach(b => b.disabled = true);

    const chosen = decodeURIComponent(btn.dataset.opt);
    const isCorrect = String(chosen) === String(q.correctAnswer);
    const feedbackEl = document.getElementById('simplay-feedback');
    PlayState.answers.push({
        sig: PlayState.sigById.get(q.groupId) || q.groupId, groupId: q.groupId, anchorPhrase: q.anchorPhrase,
        surahs: (PlayState.groups.find(g => g.groupId === q.groupId) || {}).surahs || [],
        scope: q.scope, type: q.type, isCorrect
    });

    if (isCorrect) {
        // 🌟 نفس فئات .btn-correct/.btn-wrong المستخدمة فعلياً في شاشات التقييم الأخرى تحت
        // ثيم "الكبار" (adults.css) — إعادة استخدام بدل اختراع ألوان جديدة، حفاظاً على نفس
        // الهوية البصرية المعتمدة في المنصة.
        btn.classList.add('btn-correct');
        playSuccessSound();
        PlayState.correctCount++;
        if (feedbackEl) feedbackEl.textContent = t('sim_game_correct_feedback');
        showToastEncouragement('toast-encouragement');
    } else {
        btn.classList.add('btn-wrong');
        playErrorSound();
        // 🌟 نُظهر الإجابة الصحيحة أيضاً حتى يتعلّم الطفل من خطئه فوراً بدل الاكتفاء بتعليمه
        // أنه أخطأ فقط — هذا بالضبط ما يُرسِّخ حفظ الفرق بين المتشابهات (هدف اللعبة الأساسي)
        document.querySelectorAll('.sim-play-option-btn').forEach(b => {
            if (decodeURIComponent(b.dataset.opt) === String(q.correctAnswer)) b.classList.add('btn-correct');
        });
        if (feedbackEl) feedbackEl.textContent = t('sim_game_wrong_feedback');
    }

    setTimeout(nextQuestion, 1400);
}

function nextQuestion() {
    PlayState.currentIndex++;
    if (PlayState.currentIndex >= PlayState.round.questions.length) {
        renderResultsScreen();
    } else {
        renderQuestion();
    }
}

async function renderResultsScreen() {
    const container = document.getElementById('simplay-container');
    if (!container) return;
    triggerConfetti();
    playSuccessSound();
    const total = PlayState.round.questions.length;
    const staleAnchor = document.getElementById('simplay-anchor');
    if (staleAnchor) staleAnchor.textContent = ''; // صندوق عنوان آخر سؤال لا معنى له في شاشة النتيجة

    // 🌟 [2026-10-11] حفظ الجولة لملف الطالب وحساب تغيّر إتقان كل مجموعة. أي فشل في الحفظ لا يُسقط شاشة
    // النتيجة: تظهر النتيجة مع تنبيه أن الحفظ تعذّر.
    let changes = null, saveFailed = false;
    if (PlayState.student && AppState.similaritiesManager) {
        try {
            changes = await AppState.similaritiesManager.recordRound(
                PlayState.student.id,
                groupAnswersBySignature(PlayState.answers),
                { scopeTitle: PlayState.scopeTitle, total, correct: PlayState.correctCount, byType: summarizeByType(PlayState.answers), groupsCount: new Set(PlayState.answers.map(a => a.sig)).size }
            );
        } catch (e) { console.warn('تعذّر حفظ نتيجة المتشابهات:', e); saveFailed = true; }
    }

    const levelLabel = (rec) => t('sim_level_' + levelOf(rec));
    let detailsHTML = '';
    if (changes) {
        const weak = changes.filter(c => PlayState.answers.some(a => a.sig === c.sig && !a.isCorrect));
        const up = changes.filter(c => levelOf(c.after) !== levelOf(c.before) && !weak.includes(c) && c.after.box > c.before.box);
        const row = (c) => `<li><span class="quran-text sim-res-anchor">« ${escapeHtmlText(stripHizbMark(c.after.anchorPhrase))} »</span><span class="sim-level-chip sim-level-${levelOf(c.after)}">${levelLabel(c.after)}</span></li>`;
        // الجولة الواحدة قد تمسّ 17 مجموعة: نعرض أول 5 من كل قائمة ثم عدد الباقي
        const list = (arr) => `<ul class="sim-res-list">${arr.slice(0, 5).map(row).join('')}</ul>${arr.length > 5 ? `<p class="sim-res-more">+${arr.length - 5}</p>` : ''}`;
        detailsHTML = `
            <p class="sim-res-saved">${t('sim_results_saved_for')} <strong>${escapeHtmlText(PlayState.student.name)}</strong></p>
            ${weak.length ? `<h4 class="sim-res-h sim-res-weak">${t('sim_results_weak_title')}</h4>${list(weak)}` : ''}
            ${up.length ? `<h4 class="sim-res-h sim-res-up">${t('sim_results_improved_title')}</h4>${list(up)}` : ''}`;
    } else if (saveFailed) {
        detailsHTML = `<p class="sim-res-saved sim-res-failed">${t('sim_results_save_failed')}</p>`;
    } else {
        detailsHTML = `<p class="sim-res-saved">${t('sim_results_not_saved')}</p>`;
    }

    container.innerHTML = `
        <div class="sim-group-card sim-play-results">
            <div class="sim-play-results-title">${t('sim_game_results_title')}</div>
            <div class="sim-play-results-score">${PlayState.correctCount} / ${total}</div>
            ${detailsHTML}
            <button class="btn btn-outline" id="simplay-btn-again">${t('sim_game_play_again_btn')}</button>
        </div>`;
    document.getElementById('simplay-btn-again')?.addEventListener('click', () => {
        // 🌟 إعادة بناء الجولة من الصفر (وليس فقط خلط نفس المصفوفة القديمة) حتى تتغيّر
        // المشتتات عشوائياً أيضاً في كل محاولة — ولأن buildGameRound تختار عشوائياً من كل
        // الأسئلة المتاحة (سقف MAX_ROUND_QUESTIONS)، هذا يعني أيضاً مجموعة فرعية مختلفة من
        // الأسئلة نفسها في كل محاولة لو النطاق أكبر من السقف، بدل تكرار نفس الخيارات بالضبط
        // (نفس الطالب يستمر في الجولة التالية بلا إعادة اختيار)
        PlayState.round = buildGameRound(PlayState.groups);
        PlayState.currentIndex = 0;
        PlayState.correctCount = 0;
        PlayState.answers = [];
        renderQuestion();
    });
}
