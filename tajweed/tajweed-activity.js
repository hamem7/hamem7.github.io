// tajweed/tajweed-activity.js
//
// 🌟 [جديد بالكامل — المراحل 2+4+5] مشغّل الأنشطة التفاعلية المُقيَّمة لمسار "أبطال التجويد":
// اختر الحكم، اكتشف الحكم داخل الآية، اربط الحكم بحروفه، تطبيق على آية جديدة، تحدي المرحلة،
// وجولة المراجعة الإلزامية (§5). شاشة منفصلة تماماً عن tajweed-map.js (تُفتَح منها عبر
// openTajweedActivityScreen في core/app.js)، بنفس فلسفة العزل المعمارية للمنصة. كل منطق توليد
// الأسئلة والتصحيح "خالص" في engine/tajweedEngine.js — هذا الملف فقط يعرض الأسئلة، يستقبل
// إجابات الطالب، ويحفظ النتيجة (إتقان + جلسة + جدول مراجعة + أوسمة) عبر database/tajweedDB.js
// وdatabase/reviewScheduleDB.js.
import { AppState, openTajweedSection, t } from '../core/app.js';
import { TAJWEED_STAGES, getTajweedStage, getTajweedRule, getAllRulesFlat, getStageRuleIds, isMushafRule } from '../engine/tajweedRulesCatalog.js';
import {
    generateChooseRuleQuestion, generateLinkQuestion, generateDiscoverQuestion, generateApplyQuestion,
    buildStageChallengeQuestions, buildReviewQuestions, applySessionToMastery, computeAllStageProgress, isStageUnlocked,
    generateAnnotatedQuestion, generateIdentifyQuestion, buildExamQuestions,
    evaluateSessionAchievements, TAJWEED_BADGE_CATALOG,
    // 🌟🌟 [جديد ٢٨ سبتمبر] بوّابة تسميع المعلم — راجع تعليق الاستيراد أدناه عند استخدامهما
    buildTeacherCheckpointCriteria, computeCheckpointScore
} from '../engine/tajweedEngine.js';
import {
    getAyahForExample, syncStudentTajweedProgress, pickStudentExamples, loadAnnotationIndex, highlightWordsHTML,
    highlightForTajweed, makeConflictChecker, buildExamSources, playTajweedAudio
} from './tajweed-shared.js';
import {
    ensureJourney, canTakeExam, canTeacherCheck, applyGameResult, applyExamResult, applyTeacherResult, applyTeacherApproval,
    nextGameKey, setResume, statusFromJourney, journeyStep, EXAM_PASS_SCORE, EXAM_SIZE, EXAM_MIN_SIZE, TEACHER_PASS_SCORE, GAMES_PASS_SCORE
} from '../engine/tajweedJourney.js';
import { gamesForRuleId, GAME_KEYS } from '../engine/tajweedPath.js';
import { buildVariedExamQuestions, examKindsOf } from '../engine/tajweedExamVariety.js';
import { buildAyahAudioUrl } from '../database/kidsAudioDB.js';
// 🌟 [جديد] تدريبات الحروف والأزواج المستوحاة من كتاب «فتوحات الرحمن» (اجمع الحروف، الدخيل، صنّف، اربط، صِل المثال)
import { buildRuleLetterGameQuestions, buildStageTreeQuestions } from '../engine/tajweedLetterGames.js';
import { buildExamplesLinkQuestion } from './tajweed-letters-ui.js';
import { openParentSummary } from './tajweed-summary.js';
// 🌟 [مرحلة «تعرّف على مصحفك»] أسئلتها من آيات حفظ الطالب (أو أقرب نطاق إليه): اختيار، ضغط داخل الآية، ووصل
import { buildMushafQuestions, buildMushafStageChallenge, lessonOfRule, isMushafQuestionType } from '../engine/tajweedMushaf.js';
import { getMushafCtx, renderMushafQuestionHTML, handleMushafClick } from './tajweed-mushaf-ui.js';

let params = null;
let questions = [];
let qIndex = 0;
let touchedRuleIds = new Set();
let masteryBeforeMap = {}; // ruleId -> {status, dimensions}
let stageProgressBefore = {};
// المراحل التي اجتاز الطالب تحديها (محفوظة في tajweedProgress.passedStages)
const passedStagesOf = () => (AppState.currentStudent && AppState.currentStudent.tajweedProgress && AppState.currentStudent.tajweedProgress.passedStages) || [];
let questionResults = []; // {ruleId, correct}
// 🌟 حالة خاصة لنشاط "اربط الحكم بحروفه" (متعدد الأزواج في "سؤال" واحد)
let linkSelectedName = null;
let linkSelectedLetter = null;
let linkMatchedRuleIds = new Set();
let linkWrongAttempts = 0;
let answerLocked = false; // يمنع نقر متكرر على نفس السؤال قبل الانتقال للتالي
// 🌟🌟 [جديد ٢٨ سبتمبر] حالة خاصة بشاشة "سمّع لي" — تقييمات المعلم لكل معيار {criterionKey: 'yes'|'partial'|'no'}
let checkpointRatings = {};
let checkpointNote = '';
let checkpointOutcome = null; // {score, approved} بعد إرسال «سمّع لي»
let examReview = [];           // تفاصيل أسئلة الاختبار لشاشة المراجعة بعد النتيجة
let examKinds = [];            // أنواع أسئلة الاختبار الجاري (تُحفظ مع النتيجة فلا تتكرر تشكيلتها)
const RESUMABLE_MODES = ['practice', 'letters', 'tree', 'link', 'mushaf', 'exam'];   // أنشطة المسار: يُحفظ مكانها فيكمل الطالب منه
// 🌟 حالة لوح «اجمع حروف الحكم» (سؤال متعدد النقرات): تُصفَّر عند ظهور السؤال لأول مرة فقط
let collectIndex = -1;
let collectFound = new Set();   // فهارس اللوحات الصحيحة المضغوطة
let collectWrong = new Set();   // فهارس اللوحات الخاطئة المضغوطة
let collectErrors = 0;
// 🌟 [مسار متصل] الانتقال التلقائي للسؤال التالي (بلا زر)، وسلسلة ألعاب الحكم ثم التحدي، ومنع تكرار الأسئلة داخل السلسلة
let advanceTimer = null;
let seenSigs = new Set();      // بصمات الأسئلة التي ظهرت في هذه السلسلة (ألعاب + تحدٍّ) فلا تُعاد
let chainBadges = [];
let activityToken = 0;         // يتغيّر عند الخروج فلا تكمل سلسلة معلّقة بعد مغادرة الشاشة          // أوسمة ربحها الطالب في ألعاب السلسلة تُعرض مع النتيجة الأخيرة
const clearAdvance = () => { if (advanceTimer) { clearTimeout(advanceTimer); advanceTimer = null; } };

export async function initTajweedActivity() {
    params = AppState.tajweedActivityParams;
    AppState.tajweedActivityParams = null;
    // خطّاف اختبارات المتصفح فقط: خامل في الاستعمال العادي ولا يعمل إلا إذا فعّلته الاختبارات بعلامة في localStorage (tests/tajweed-mushaf.e2e.mjs)
    try { if (localStorage.getItem('dh_e2e_hooks')) window.__tjwQuestion = () => questions[qIndex] || null; } catch (e) { /* لا تخزين: لا خطّاف */ }

    const titleEl = document.getElementById('tjwa-title');
    if (titleEl && params && params.mode === 'exam') titleEl.textContent = t('tjw_exam_title');
    if (titleEl && params && params.mode === 'tree') titleEl.textContent = t('tjw_tree_activity_title');
    if (titleEl && params && params.mode === 'letters') titleEl.textContent = t('tjw_letters_activity_title');
    const exitBtn = document.getElementById('tjwa-btn-exit');
    if (exitBtn) exitBtn.addEventListener('click', () => { clearAdvance(); activityToken++; openTajweedSection(); });

    const container = document.getElementById('tjwa-container');
    if (container) container.addEventListener('click', handleActivityClick);

    if (!params || !AppState.currentStudent || !AppState.tajweedManager) {
        if (container) container.innerHTML = `<div class="tjw-empty-state">${t('tjw_activity_error')}</div>`;
        return;
    }

    await bootMode();
}

// يبني النشاط الحالي (params) ويعرضه: أسئلة جديدة أو استكمال من نقطة التوقف، أو اعتماد المعلم بضغطة. يُستدعى عند فتح الشاشة
// وعند الانتقال بين ألعاب المسار والاختبار والاعتماد دون العودة للخريطة.
async function bootMode() {
    const container = document.getElementById('tjwa-container');
    container.innerHTML = `<div class="tjw-loading">${t('sim_loading')}</div>`;
    const titleEl = document.getElementById('tjwa-title');
    if (titleEl) titleEl.textContent = params.mode === 'exam' ? t('tjw_exam_title') : params.mode === 'tree' ? t('tjw_tree_activity_title') : params.mode === 'letters' ? t('tjw_letters_activity_title') : t('tjw_activity_title');
    clearAdvance();
    examKinds = [];
    const resuming = !!(params.resume && Array.isArray(params.resume.questions) && params.resume.questions.length);
    if (!params.chainPos || params.chainPos === 1) { seenSigs = new Set(); chainBadges = []; }
    if (resuming && Array.isArray(params.resume.seen)) seenSigs = new Set(params.resume.seen);
    if (!resuming) await buildQuestions();
    else await buildQuestions({ keep: true });
    if (!resuming) questions.forEach(q => seenSigs.add(sigOf(q)));
    qIndex = 0;
    questionResults = [];
    touchedRuleIds = new Set();
    // 🌟 [مسار الحكم] استكمال من نقطة التوقف: الأسئلة نفسها ومكانها ونتائجها حتى الآن
    if (resuming) {
        questions = params.resume.questions;
        qIndex = Math.min(params.resume.qIndex || 0, questions.length - 1);
        questionResults = params.resume.results || [];
        examReview = params.resume.review || [];
        examKinds = params.resume.kinds || [];
        (params.resume.touched || []).forEach(r => touchedRuleIds.add(r));
        params = { ...params, resume: null };
    }
    setupPauseButton();
    if (params.mode === 'teacher_approve') {
        // اعتماد المعلم بضغطة: يُسجَّل الاعتماد ثم تُنهى الجلسة بنفس مسار النتيجة (أوسمة، إتمام مرحلة…)
        if (questions.length) {
            const rid = questions[0].ruleId;
            await updateRuleMastery(rid, 'teacher_checkpoint', 100);
            await updateRuleJourney(rid, r => applyTeacherApproval(r));
            questionResults = [{ ruleId: rid, correct: true }];
            qIndex = 1;
        }
    }
    renderProgress();
    renderCurrentQuestion();
}

// ============================================================
// إيقاف الدرس واستكماله: يُحفظ النشاط الجاري (أسئلته ومكانه ونتائجه) داخل رحلة الحكم لهذا الطالب، فيكمل منه المرة القادمة.
// يُحفظ تلقائياً مع كل سؤال، فالخروج بأي طريقة لا يضيّع المكان.
// ============================================================
const pathRuleIdOf = () => (params && (params.ruleId || params.pathRuleId)) || null;
const canResumeHere = () => !!(params && RESUMABLE_MODES.includes(params.mode) && pathRuleIdOf() && questions.length && qIndex < questions.length);

function snapshotNow() {
    return {
        mode: params.mode, stageId: params.stageId || null, ruleId: params.ruleId || null, pathRuleId: pathRuleIdOf(),
        chain: params.chain || null, chainPos: params.chainPos || null, chainTotal: params.chainTotal || null, seen: [...seenSigs],
        questions, qIndex, results: questionResults, review: examReview, kinds: examKinds, touched: [...touchedRuleIds]
    };
}

async function saveResume(snapshot) {
    const rid = pathRuleIdOf();
    if (!rid) return;
    try { await updateRuleJourney(rid, r => setResume(r, snapshot)); } catch (e) { /* الحفظ التلقائي لا يعطّل الدرس */ }
}
const autosaveResume = () => { if (canResumeHere()) return saveResume(snapshotNow()); };

function setupPauseButton() {
    const btn = document.getElementById('tjwa-btn-pause');
    if (!btn) return;
    btn.style.display = canResumeHere() ? '' : 'none';
    btn.onclick = async () => {
        if (!canResumeHere()) return;
        clearAdvance();
        await saveResume(snapshotNow());
        const { openParentSummary } = await import('./tajweed-summary.js');
        await openParentSummary({ studentId: AppState.currentStudent.id, ruleId: pathRuleIdOf(), kind: 'lesson', onClose: () => openTajweedSection() });
    };
}

// ============================================================
// بناء طابور الأسئلة حسب وضع النشاط (mode)
// ============================================================
// بصمة السؤال لمنع التكرار: مفتاح أسئلة المصحف، أو الآية (أي سؤال آخر على الآية نفسها تكرار)، أو نوع السؤال مع حرفه/حكمه
function sigOf(q) {
    if (q.key) return q.key;
    if (q.ayahText) return 'a:' + String(q.ayahText).replace(/<[^>]*>/g, '').slice(0, 80);
    const pair = q.pair ? q.pair.a + q.pair.b : null;
    return [q.type, q.ruleId, q.letters, q.letter, pair, q.first, q.text, q.textKey, q.claimNameKey, q.correctRuleId, q.correctLetter, q.riddle && q.riddle.letter]
        .filter(x => x != null).join('|');
}
const DEDUPE_MODES = ['practice', 'letters', 'tree', 'link', 'mushaf', 'exam'];

// يبني الأسئلة ثم يستبعد ما ظهر من قبل في السلسلة: يعيد التوليد (عشوائياً) حتى ست مرات بحثاً عن تشكيلة جديدة كلها، فإن لم توجد تُملأ من المكرَّر
// حتى الحدّ الأدنى فقط (الاختبار EXAM_MIN_SIZE، وغيره ثلاثة).
async function buildQuestions(opts = {}) {
    await buildQuestionsOnce();
    if (opts.keep || !pathRuleIdOf() || !DEDUPE_MODES.includes(params.mode) || !questions.length) return;
    const fresh = (list) => { const inList = new Set(); return list.filter(q => { const g = sigOf(q); if (seenSigs.has(g) || inList.has(g)) return false; inList.add(g); return true; }); };
    let best = { all: questions, kinds: examKinds, kept: fresh(questions) };
    for (let i = 0; i < 6 && best.kept.length < best.all.length; i++) {
        await buildQuestionsOnce();
        const kept = fresh(questions);
        if (kept.length > best.kept.length) best = { all: questions, kinds: examKinds, kept };
    }
    const min = params.mode === 'exam' ? EXAM_MIN_SIZE : Math.min(3, best.all.length);
    const out = best.kept.slice();
    for (const q of best.all) { if (out.length >= min) break; if (!out.includes(q)) out.push(q); }
    questions = out;
    examKinds = examKindsOf(questions);
}

async function buildQuestionsOnce() {
    const studentId = AppState.currentStudent.id;
    const allMastery = await AppState.tajweedManager.getMasteryByStudent(studentId);
    masteryBeforeMap = {};
    allMastery.forEach(m => { masteryBeforeMap[m.ruleId] = { status: m.status, dimensions: { ...m.dimensions } }; });
    stageProgressBefore = computeAllStageProgress(allMastery, passedStagesOf());

    questions = [];
    linkMatchedRuleIds = new Set();
    linkWrongAttempts = 0;
    collectIndex = -1; // 🌟 يُعاد تصفير لوح «اجمع الحروف» مع كل بناء جديد للأسئلة (إعادة المحاولة)

    if (params.mode === 'practice') {
        const rule = getTajweedRule(params.stageId, params.ruleId);
        if (!rule) return;
        if (isMushafRule(rule)) {
            questions = buildMushafQuestions(lessonOfRule(rule), await getMushafCtx(AppState.currentStudent), { mode: 'practice', size: 5, exclude: seenSigs });
            return;
        }
        // 🌟 آيات من حفظ الطالب نفسه إن وُجد الحكم في نطاق حفظه (جدول التوسيم)، وإلا أمثلة الكتالوج
        const mine = await pickStudentExamples(rule, AppState.currentStudent, 3);
        const conflicts = makeConflictChecker(await loadAnnotationIndex());
        const asSource = (m) => ({ ayahInfo: m.ayahInfo, occurrences: m.occurrences, surah: m.surah, ayah: m.ayah });
        let discoverQ = mine[0] ? generateAnnotatedQuestion('discover_in_ayah', rule, mine[0].ayahInfo, mine[0].occurrences) : null;
        let applyQ = mine[1] ? generateAnnotatedQuestion('apply_new_ayah', rule, mine[1].ayahInfo, mine[1].occurrences) : null;
        const idMine = mine[2] || mine[0];
        let identifyQ = idMine ? generateIdentifyQuestion(rule, asSource(idMine), { conflicts }) : null;
        if (!discoverQ || !applyQ || !identifyQ) {
            const [exAyah, practiceAyah] = await Promise.all([
                getAyahForExample(rule.example.surah, rule.example.ayah),
                getAyahForExample(rule.practiceExample.surah, rule.practiceExample.ayah)
            ]);
            discoverQ = discoverQ || generateDiscoverQuestion(rule, exAyah);
            applyQ = applyQ || generateApplyQuestion(rule, practiceAyah);
            identifyQ = identifyQ || generateIdentifyQuestion(rule, { ayahInfo: exAyah, highlight: rule.example.highlight, firstOnly: rule.example.firstOnly, surah: rule.example.surah, ayah: rule.example.ayah }, { conflicts });
        }
        questions = [generateChooseRuleQuestion(rule), identifyQ, discoverQ, applyQ].filter(Boolean);
    } else if (params.mode === 'mushaf') {
        // 🌟 «استكشف المصحف»: ضغط داخل الآية ووصل (أسئلة تفاعلية) قبل أسئلة التعرّف
        const rule = getTajweedRule(params.stageId, params.ruleId);
        questions = rule && isMushafRule(rule) ? buildMushafQuestions(lessonOfRule(rule), await getMushafCtx(AppState.currentStudent), { mode: 'explore', size: 5, exclude: seenSigs }) : [];
    } else if (params.mode === 'link') {
        const q = generateLinkQuestion(params.stageId);
        const examplesQ = await buildExamplesLinkQuestion(params.stageId); // «صِل المثال بحكمه» بنص من المنصة
        questions = [q, examplesQ].filter(Boolean);
    } else if (params.mode === 'letters') {
        // 🌟 [جديد] «ألعاب الحروف» لحكم واحد: لعبة إضافية مستقلة عن رحلة الحكم (لا تغيّر خطوات الشرح/التطبيق/الاختبار)
        const rule = getTajweedRule(params.stageId, params.ruleId);
        questions = rule ? buildRuleLetterGameQuestions(rule) : [];
    } else if (params.mode === 'tree') {
        // 🌟 [جديد] «شجرة الحكم»: تصنيف حروف (أو أزواج) المرحلة بين أحكامها
        questions = buildStageTreeQuestions(params.stageId);
    } else if (params.mode === 'challenge') {
        const stage = getTajweedStage(params.stageId);
        if (!stage) return;
        if (stage.mushaf) { questions = buildMushafStageChallenge(await getMushafCtx(AppState.currentStudent), 5); return; }
        const ayahInfoByRuleId = {};
        for (const rule of stage.rules) {
            ayahInfoByRuleId[rule.id] = await entryForRule(rule);
        }
        questions = buildStageChallengeQuestions(params.stageId, ayahInfoByRuleId);
    } else if (params.mode === 'review') {
        const dueRules = (params.dueRuleIds || [])
            .map(rid => getAllRulesFlat().find(x => x.rule.id === rid))
            .filter(Boolean)
            .map(x => x.rule);
        const ayahInfoByRuleId = {};
        const classic = dueRules.filter(r => !isMushafRule(r));
        for (const rule of classic) {
            ayahInfoByRuleId[rule.id] = await entryForRule(rule);
        }
        questions = classic.length ? buildReviewQuestions(classic, ayahInfoByRuleId) : [];
        const mkDue = dueRules.filter(isMushafRule);
        if (mkDue.length) {
            const mkCtx = await getMushafCtx(AppState.currentStudent);
            mkDue.forEach(r => questions.push(...buildMushafQuestions(lessonOfRule(r), mkCtx, { mode: 'review', size: 2 })));
            questions = questions.sort(() => Math.random() - 0.5).slice(0, 5);
        }
    } else if (params.mode === 'exam') {
        // 🌟 [رحلة الحكم] اختبار الحكم: لا يُفتح إلا بعد شرح وتطبيق ناجح (ولا يُعاد بعد رسوب قبل تطبيق جديد)
        const rule = getTajweedRule(params.stageId, params.ruleId);
        if (!rule) return;
        const rec = await AppState.tajweedManager.getMasteryRecord(studentId, rule.id);
        if (!canTakeExam(ensureJourney(rec))) return;
        if (isMushafRule(rule)) {
            questions = buildMushafQuestions(lessonOfRule(rule), await getMushafCtx(AppState.currentStudent), { mode: 'exam', size: EXAM_SIZE, prevKinds: ensureJourney(rec).examKinds || [], exclude: seenSigs });
            if (questions.length < EXAM_MIN_SIZE) questions = [];
            examKinds = examKindsOf(questions);
            examReview = [];
            return;
        }
        const sources = await buildExamSources(rule, AppState.currentStudent);
        const conflicts = makeConflictChecker(await loadAnnotationIndex());
        const prevKinds = ensureJourney(rec).examKinds || [];
        let built = buildVariedExamQuestions(rule, sources, { conflicts, prevKinds, lang: AppState.currentLang === 'en' ? 'en' : 'ar' });
        if (built.length < EXAM_MIN_SIZE) built = buildExamQuestions(rule, sources, { conflicts });
        questions = built.length >= EXAM_MIN_SIZE ? built : [];
        examKinds = examKindsOf(questions);
        examReview = [];
    } else if (params.mode === 'teacher_approve') {
        // 🌟 [مسار الحكم] اعتماد المعلم بضغطة واحدة بعد اجتياز الاختبار (التقييم المفصّل بالسماع يبقى خياراً: teacher_checkpoint)
        const rule = getTajweedRule(params.stageId, params.ruleId);
        if (!rule) return;
        const recAp = await AppState.tajweedManager.getMasteryRecord(studentId, rule.id);
        if (!canTeacherCheck(ensureJourney(recAp))) return;
        questions = [{ type: 'teacher_approve', ruleId: rule.id }];
    } else if (params.mode === 'teacher_checkpoint') {
        // 🌟🌟 [جديد ٢٨ سبتمبر] بوّابة تسميع المعلم — "سؤال" واحد فقط من نوع خاص يحمل معايير
        // التقييم + الآيتين المرجعيتين (للتصفّح، لا لبناء سؤال MCQ). راجع §2 من مستند التعميق.
        const rule = getTajweedRule(params.stageId, params.ruleId);
        if (!rule || isMushafRule(rule)) return;   // دروس المصحف يُعتمد فيها بضغطة واحدة (teacher_approve)
        // 🌟 «سمّع لي» بعد اجتياز اختبار الحكم فقط (الخطوة الرابعة من رحلة الحكم)
        const recCp = await AppState.tajweedManager.getMasteryRecord(studentId, rule.id);
        if (!canTeacherCheck(ensureJourney(recCp))) return;
        checkpointRatings = {};
        checkpointNote = '';
        checkpointOutcome = null;
        // 🌟 المعلم يسمّع الطالب على آيات من حفظه إن وُجد الحكم فيها، وإلا آيتا الكتالوج
        const mine = await pickStudentExamples(rule, AppState.currentStudent, 2);
        let exAyah = mine[0] ? mine[0].ayahInfo : await getAyahForExample(rule.example.surah, rule.example.ayah);
        let practiceAyah = mine[1] ? mine[1].ayahInfo : await getAyahForExample(rule.practiceExample.surah, rule.practiceExample.ayah);
        questions = [{
            type: 'teacher_checkpoint',
            ruleId: rule.id,
            criteria: buildTeacherCheckpointCriteria(rule),
            exAyah,
            practiceAyah
        }];
    }
}

// 🌟 مدخل آية لحكم واحد في التحدي والمراجعة: آية من حفظ الطالب ({ayahInfo, occurrences}) إن وُجدت، وإلا
// آية مثال الكتالوج (ayahInfo مباشرة) — buildStageChallengeQuestions/buildReviewQuestions تتعامل مع الاثنين
async function entryForRule(rule) {
    const mine = await pickStudentExamples(rule, AppState.currentStudent, 1);
    if (mine[0]) return { ayahInfo: mine[0].ayahInfo, occurrences: mine[0].occurrences };
    return getAyahForExample(rule.example.surah, rule.example.ayah);
}

function renderProgress() {
    const el = document.getElementById('tjwa-progress');
    if (!el) return;
    if (questions.length === 0) { el.innerHTML = ''; return; }
    // 🌟 [إعادة تصميم] شريط تقدّم مرئي بدل نص فقط: يمتلئ بعدد الأسئلة المنجزة
    const current = Math.min(qIndex + 1, questions.length);
    const pct = Math.round((qIndex / questions.length) * 100);
    const chainLabel = params && params.chainTotal ? `<span class="tjw-chain-label">${t('tjw_chain_step').replace('{i}', params.chainPos || 1).replace('{n}', params.chainTotal)}</span>` : '';
    el.innerHTML = `<div class="tjw-progress-bar"><span style="width:${pct}%;"></span></div>
        <span class="tjw-progress-label">${chainLabel}${t('tjw_question_label')} ${current} / ${questions.length}</span>`;
}

// ============================================================
// عرض السؤال الحالي
// ============================================================
function renderCurrentQuestion() {
    const container = document.getElementById('tjwa-container');
    if (!container) return;
    answerLocked = false;

    if (questions.length === 0) {
        container.innerHTML = `<div class="tjw-empty-state">${t('tjw_activity_error')}</div>`;
        return;
    }
    if (qIndex >= questions.length) {
        finishSession();
        return;
    }

    const q = questions[qIndex];
    if (q.type === 'choose_rule') container.innerHTML = renderChooseRuleHTML(q);
    else if (q.type === 'discover_in_ayah' || q.type === 'apply_new_ayah') container.innerHTML = renderDiscoverHTML(q);
    else if (q.type === 'identify_rule') container.innerHTML = renderIdentifyHTML(q);
    else if (q.type === 'link_rule_letters') container.innerHTML = renderLinkHTML(q);
    else if (isMushafQuestionType(q.type)) container.innerHTML = renderMushafQuestionHTML(q);
    else if (q.type === 'tf_statement') container.innerHTML = renderTfHTML(q);
    else if (q.type === 'spot_rule') container.innerHTML = renderSpotHTML(q);
    else if (q.type === 'teacher_checkpoint') container.innerHTML = renderTeacherCheckpointHTML(q);
    else if (q.type === 'classify_letter' || q.type === 'classify_pair') container.innerHTML = renderClassifyHTML(q);
    else if (q.type === 'odd_letter' || q.type === 'pair_link') container.innerHTML = renderLetterChoiceHTML(q);
    else if (q.type === 'letter_collect') {
        if (collectIndex !== qIndex) { collectIndex = qIndex; collectFound = new Set(); collectWrong = new Set(); collectErrors = 0; }
        container.innerHTML = renderLetterCollectHTML(q);
    }
    else container.innerHTML = `<div class="tjw-empty-state">${t('tjw_activity_error')}</div>`;
}

function renderChooseRuleHTML(q) {
    const optionsHTML = q.options.map(opt => `
        <button class="tjw-answer-btn" data-choose-rule="${opt.ruleId}">${t(opt.nameKey)}</button>
    `).join('');
    // 🌟 لغز «من أنا؟» (تنويع الاختبار): عدد حروف الحكم وأحد حروفه بدل عرض الحروف كلها
    if (q.riddle) {
        return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${fillVars(t('tjw_ex_riddle'), { n: q.riddle.n, letter: q.riddle.letter })}</p>
            <div class="tjw-answer-grid">${optionsHTML}</div>
        </div>`;
    }
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${t('tjw_act_choose_prompt')}</p>
            <div class="tjw-letters-display">${q.letters}</div>
            <div class="tjw-answer-grid">${optionsHTML}</div>
        </div>`;
}

const fillVars = (str, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), str);

function renderDiscoverHTML(q) {
    const promptKey = q.type === 'apply_new_ayah' ? 'tjw_act_apply_prompt' : 'tjw_act_discover_prompt';
    const audioBtnHTML = q.audioNumber
        ? `<button class="tjw-listen-btn" data-tjw-audio="${buildAyahAudioUrl(q.audioNumber)}">🔊 ${t('tjw_listen_btn')}</button>`
        : '';
    const optionsHTML = q.options.map(opt => `
        <button class="tjw-answer-btn tjw-word-btn" data-discover-option="${opt.index}">${opt.word}</button>
    `).join('');
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${t(promptKey)}</p>
            <div class="tjw-activity-ayah-box">
                ${q.fromHifz ? `<div class="tjw-hifz-tag">📖 ${t('tjw_from_hifz')}</div>` : ''}
                <div class="tjw-example-text">${q.ayahText}</div>
                <div class="tjw-example-ref">${q.surahName || ''}</div>
                ${audioBtnHTML}
            </div>
            <div class="tjw-answer-grid">${optionsHTML}</div>
        </div>`;
}

// 🌟 سؤال «ما حكم الكلمة المظلَّلة؟»: الآية بالكلمة موسومة والخيارات أسماء أحكام (يعيد معالج data-choose-rule)
function renderIdentifyHTML(q) {
    const ayahHTML = q.occurrences ? highlightWordsHTML(q.ayahText, q.occurrences) : highlightForTajweed(q.ayahText, q.highlight, q.firstOnly);
    const audioBtnHTML = (q.audioNumber && (params.mode !== 'exam' || q.listenFirst))
        ? `<button class="tjw-listen-btn" data-tjw-audio="${buildAyahAudioUrl(q.audioNumber)}">🔊 ${t('tjw_listen_btn')}</button>` : '';
    const optionsHTML = q.options.map(opt => `<button class="tjw-answer-btn" data-choose-rule="${opt.ruleId}">${t(opt.nameKey)}</button>`).join('');
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${t(q.listenFirst ? 'tjw_ex_listen_prompt' : 'tjw_act_identify_prompt')}</p>
            <div class="tjw-activity-ayah-box">
                ${q.fromHifz ? `<div class="tjw-hifz-tag">📖 ${t('tjw_from_hifz')}</div>` : ''}
                <div class="tjw-example-text">${ayahHTML}</div>
                <div class="tjw-example-ref">${q.surahName || ''}</div>
                ${audioBtnHTML}
            </div>
            <div class="tjw-answer-grid">${optionsHTML}</div>
        </div>`;
}

// 🌟 «صح أم خطأ» (عن حرف أو قاعدة): خياران
function renderTfHTML(q) {
    const stmt = q.text ? q.text : fillVars(t(q.textKey), { letter: q.letter, rule: t(q.ruleNameKey) });
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${t('tjw_ex_tf_prompt')}</p>
            <div class="tjw-letters-display tjw-tf-statement">${stmt}</div>
            <div class="tjw-answer-grid">
                <button class="tjw-answer-btn" data-tf-option="true">${t('tjw_ex_true')}</button>
                <button class="tjw-answer-btn" data-tf-option="false">${t('tjw_ex_false')}</button>
            </div>
        </div>`;
}

// 🌟 «أين الخطأ؟»: طالب يدّعي حكماً للكلمة المظلَّلة؛ المطلوب الحكم على ادّعائه واختيار الصواب
function renderSpotHTML(q) {
    const ayahHTML = q.occurrences ? highlightWordsHTML(q.ayahText, q.occurrences) : highlightForTajweed(q.ayahText, q.highlight, q.firstOnly);
    const optionsHTML = q.options.map(opt => `<button class="tjw-answer-btn" data-spot-option="${opt.value}">${opt.value === 'ok' ? t('tjw_ex_spot_ok') : fillVars(t('tjw_ex_spot_wrong'), { rule: t(opt.nameKey) })}</button>`).join('');
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${fillVars(t('tjw_ex_spot_prompt'), { rule: t(q.claimNameKey) })}</p>
            <div class="tjw-activity-ayah-box">
                ${q.fromHifz ? `<div class="tjw-hifz-tag">📖 ${t('tjw_from_hifz')}</div>` : ''}
                <div class="tjw-example-text">${ayahHTML}</div>
                <div class="tjw-example-ref">${q.surahName || ''}</div>
            </div>
            <div class="tjw-answer-grid">${optionsHTML}</div>
        </div>`;
}

const ruleNameOf = (ruleId) => { const f = getAllRulesFlat().find(x => x.rule.id === ruleId); return f ? t(f.rule.nameKey) : ''; };

// 🌟 «إلى أي حكم ينتمي هذا الحرف/الزوج؟»: يعيد استعمال معالج data-choose-rule (الخيارات أسماء أحكام)
function renderClassifyHTML(q) {
    const isPair = q.type === 'classify_pair';
    const stem = isPair ? `${q.pair.a} <span class="tjw-pair-plus">+</span> ${q.pair.b}` : q.letter;
    const optionsHTML = q.options.map(opt => `<button class="tjw-answer-btn" data-choose-rule="${opt.ruleId}">${t(opt.nameKey)}</button>`).join('');
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${t(isPair ? 'tjw_act_classify_pair_prompt' : 'tjw_act_classify_letter_prompt')}</p>
            <div class="tjw-letters-display tjw-big-letter">${stem}</div>
            <div class="tjw-answer-grid">${optionsHTML}</div>
        </div>`;
}

// 🌟 الحرف الدخيل / اربط الحرفين: خيارات حروف بمعالج data-letter-option
function renderLetterChoiceHTML(q) {
    const name = ruleNameOf(q.ruleId);
    const prompt = q.type === 'pair_link'
        ? t('tjw_act_pair_link_prompt').replace('{a}', q.first).replace('{rule}', name)
        : t(q.askNot ? 'tjw_act_odd_not_prompt' : 'tjw_act_odd_is_prompt').replace('{rule}', name);
    const stem = q.type === 'pair_link' ? `<div class="tjw-letters-display tjw-big-letter">${q.first}</div>` : '';
    const optionsHTML = q.options.map(l => `<button class="tjw-answer-btn tjw-letter-opt" data-letter-option="${l}">${l}</button>`).join('');
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${prompt}</p>
            ${stem}
            <div class="tjw-answer-grid tjw-letter-grid">${optionsHTML}</div>
        </div>`;
}

// 🌟 «اجمع حروف الحكم» (دوائر الحروف في الكتاب): لوح مبعثر، يضغط الطالب كل حروف الحكم
function renderLetterCollectHTML(q) {
    const name = ruleNameOf(q.ruleId);
    const doneAll = collectFound.size >= q.targets.length;
    const tilesHTML = q.tiles.map((x, i) => `<button class="tjw-letter-tile ${collectFound.has(i) ? 'is-right' : ''} ${collectWrong.has(i) ? 'is-wrong' : ''}"
        data-collect-tile="${i}" ${(collectFound.has(i) || collectWrong.has(i) || doneAll) ? 'disabled' : ''}>${x.letter}</button>`).join('');
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${t('tjw_act_collect_prompt').replace('{rule}', name).replace('{n}', q.targets.length)}</p>
            <div class="tjw-collect-count">${collectFound.size} / ${q.targets.length}</div>
            <div class="tjw-letter-board">${tilesHTML}</div>
        </div>`;
}

function renderLinkHTML(q) {
    const namesHTML = q.namesCol.map(item => `
        <button class="tjw-answer-btn tjw-link-item ${linkMatchedRuleIds.has(item.ruleId) ? 'tjw-link-matched' : ''}"
            data-link-name="${item.ruleId}" ${linkMatchedRuleIds.has(item.ruleId) ? 'disabled' : ''}>${t(item.nameKey)}</button>
    `).join('');
    const lettersHTML = q.lettersCol.map(item => `
        <button class="tjw-answer-btn tjw-link-item ${linkMatchedRuleIds.has(item.ruleId) ? 'tjw-link-matched' : ''}"
            data-link-letter="${item.ruleId}" ${linkMatchedRuleIds.has(item.ruleId) ? 'disabled' : ''}>${item.html || item.letters}</button>
    `).join('');
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${t(q.kind === 'examples' ? 'tjw_act_link_examples_prompt' : 'tjw_act_link_prompt')}</p>
            <div class="tjw-link-columns">
                <div class="tjw-link-col">${namesHTML}</div>
                <div class="tjw-link-col">${lettersHTML}</div>
            </div>
        </div>`;
}

// 🌟🌟 [جديد ٢٨ سبتمبر] شاشة "سمّع لي" — تعرض للمعلم الآيتين المرجعيتين للحكم (ليستمع لتلاوة
// الطالب عليهما مباشرة، بلا أي تصحيح آلي للتلاوة بالذكاء الاصطناعي — قرار معماري ثابت للمنصة)
// ثم يقيّم كل معيار (مخرج الحرف / الخطأ الشائع) بثلاث درجات: نعم أتقنه تماماً / جزئياً / لا،
// مع ملاحظة نصية اختيارية يكتبها المعلم بحرّية. راجع buildTeacherCheckpointCriteria في
// tajweedEngine.js لمصدر المعايير.
function renderTeacherCheckpointHTML(q) {
    const audioExBtn = q.exAyah
        ? `<button class="tjw-listen-btn" data-tjw-audio="${buildAyahAudioUrl(q.exAyah.number)}">🔊 ${t('tjw_listen_btn')}</button>` : '';
    const audioPracticeBtn = q.practiceAyah
        ? `<button class="tjw-listen-btn" data-tjw-audio="${buildAyahAudioUrl(q.practiceAyah.number)}">🔊 ${t('tjw_listen_btn')}</button>` : '';

    const criteriaHTML = q.criteria.map(c => {
        const text = c.text ? t(c.text) : t(c.textKey); // 🌟 معايير المخرج/الخطأ الشائع نصوص عربية أصلية في الكتالوج → تُترجم وقت العرض
        const current = checkpointRatings[c.key];
        const rate = (val, icon, key) => `<button class="tjw-rate-btn ${current === val ? 'tjw-rate-selected tjw-rate-' + val : ''}"
            data-checkpoint-rate="${c.key}" data-rate-value="${val}">${icon} ${t(key)}</button>`;
        return `
        <div class="tjw-checkpoint-criterion">
            <p class="tjw-checkpoint-criterion-text">${text}</p>
            <div class="tjw-checkpoint-rate-row">
                ${rate('yes', '✅', 'tjw_checkpoint_rate_yes')}
                ${rate('partial', '➖', 'tjw_checkpoint_rate_partial')}
                ${rate('no', '❌', 'tjw_checkpoint_rate_no')}
            </div>
        </div>`;
    }).join('');

    return `
        <div class="tjw-activity-card tjw-checkpoint-card">
            <p class="tjw-activity-prompt">${t('tjw_checkpoint_prompt')}</p>
            <div class="tjw-activity-ayah-box">
                <div class="tjw-example-text">${q.exAyah ? q.exAyah.text : ''}</div>
                <div class="tjw-example-ref">${q.exAyah ? q.exAyah.surahName || '' : ''}</div>
                ${audioExBtn}
            </div>
            <div class="tjw-activity-ayah-box">
                <div class="tjw-example-text">${q.practiceAyah ? q.practiceAyah.text : ''}</div>
                <div class="tjw-example-ref">${q.practiceAyah ? q.practiceAyah.surahName || '' : ''}</div>
                ${audioPracticeBtn}
            </div>
            <div class="tjw-checkpoint-criteria-list">${criteriaHTML}</div>
            <textarea id="tjwa-checkpoint-note" class="tjw-checkpoint-note"
                placeholder="${t('tjw_checkpoint_note_placeholder')}">${checkpointNote}</textarea>
            <button class="tjw-cta-btn" data-action="submit-checkpoint">✅ ${t('tjw_checkpoint_submit_btn')}</button>
        </div>`;
}

// ============================================================
// معالجة النقرات
// ============================================================
async function handleActivityClick(e) {
    const audioBtn = e.target.closest('[data-tjw-audio]');
    if (audioBtn) {
        playTajweedAudio(audioBtn.dataset.tjwAudio);
        return;
    }

    // اللمس على لوحة التفسير يتخطى الانتظار (الانتقال تلقائي بعد كل إجابة، بلا زر «التالي»)
    if (advanceTimer && e.target.closest('.tjw-feedback')) { goNextQuestion(); return; }

    const restartBtn = e.target.closest('[data-action="retry-activity"]');
    if (restartBtn) {
        await buildQuestions();
        qIndex = 0;
        questionResults = [];
        touchedRuleIds = new Set();
        renderProgress();
        renderCurrentQuestion();
        return;
    }

    // 🌟 [مسار الحكم] من شاشة نتيجة لعبة إلى اللعبة التالية أو التحدي (الاختبار)، ومن نتيجة اختبار راسب إلى لعبة جديدة، ومن اجتياز الاختبار
    // إلى اعتماد المعلم، دون العودة للخريطة.
    const goBtn = e.target.closest('[data-action="go-exam"], [data-action="go-game"], [data-action="approve-now"], [data-action="go-chain"]');
    if (goBtn) {
        const ruleId = pathRuleIdOf();
        const base = { stageId: params.stageId, studentId: AppState.currentStudent.id, ruleId, pathRuleId: ruleId };
        const act = goBtn.dataset.action;
        if (act === 'go-chain') {
            const games = gamesForRuleId(ruleId), first = games[0];
            params = { ...base, mode: first, ruleId: (first === 'practice' || first === 'letters' || first === 'mushaf') ? ruleId : null, chain: [...games.slice(1), 'exam'], chainPos: 1, chainTotal: games.length + 1 };
        } else if (act === 'go-exam') params = { ...base, mode: 'exam' };
        else if (act === 'approve-now') params = { ...base, mode: 'teacher_approve' };
        else {
            const game = goBtn.dataset.game || 'practice';
            params = { ...base, mode: game, ruleId: (game === 'practice' || game === 'letters' || game === 'mushaf') ? ruleId : null };
        }
        await bootMode();
        return;
    }

    // 🌟 [جديد] «ملخص جاهز للولي» من شاشة النتيجة: بعد «سمّع لي» يُفتح ملخص الحكم، وغير ذلك ملخص الحصة
    if (e.target.closest('[data-action="parent-summary"]')) {
        openParentSummary({ studentId: AppState.currentStudent.id, ruleId: pathRuleIdOf(), kind: pathRuleIdOf() ? 'lesson' : 'session' });
        return;
    }

    // 🌟 بعد اعتماد المعلم للحكم: «بدء حكم جديد» يعيد الطالب إلى الخريطة ويفتح حكمه التالي مباشرة (بلا إعادة اختيار الاسم)
    if (e.target.closest('[data-action="new-rule"]')) {
        AppState.tajweedAutoEnter = { studentId: AppState.currentStudent.id, after: 'continue' };
        openTajweedSection();
        return;
    }

    // 🌟 «إنهاء»: يفتح الملخص الجاهز للولي ليُرسَل، وعند إغلاقه نعود للخريطة
    if (e.target.closest('[data-action="finish-session"]')) {
        openParentSummary({ studentId: AppState.currentStudent.id, ruleId: pathRuleIdOf(), kind: pathRuleIdOf() ? 'lesson' : 'session', onClose: () => openTajweedSection() });
        return;
    }

    if (e.target.closest('[data-action="back-to-map"]')) {
        openTajweedSection();
        return;
    }

    // 🌟🌟 [جديد ٢٨ سبتمبر] نقرات شاشة "سمّع لي" — خارج آلية answerLocked المستخدَمة لأسئلة
    // MCQ العادية، لأن هذه الشاشة تسمح بتغيير التقييم قبل الإرسال النهائي
    const rateBtn = e.target.closest('[data-checkpoint-rate]');
    if (rateBtn) {
        const noteEl = document.getElementById('tjwa-checkpoint-note');
        if (noteEl) checkpointNote = noteEl.value;
        checkpointRatings[rateBtn.dataset.checkpointRate] = rateBtn.dataset.rateValue;
        renderCurrentQuestion();
        return;
    }

    const submitCheckpointBtn = e.target.closest('[data-action="submit-checkpoint"]');
    if (submitCheckpointBtn) {
        const q = questions[qIndex];
        const noteEl = document.getElementById('tjwa-checkpoint-note');
        if (noteEl) checkpointNote = noteEl.value;
        const allRated = q.criteria.every(c => checkpointRatings[c.key]);
        if (!allRated) {
            alert(t('tjw_checkpoint_incomplete_alert'));
            return;
        }
        const scorePercent = computeCheckpointScore(checkpointRatings);
        await updateRuleMastery(q.ruleId, 'teacher_checkpoint', scorePercent);
        // 🌟 [رحلة الحكم] الاعتماد (متقن) يتم هنا: بعد اجتياز الاختبار وبدرجة تسميع ≥ 70%
        const teacherRes = await updateRuleJourney(q.ruleId, r => applyTeacherResult(r, scorePercent));
        checkpointOutcome = { score: scorePercent, approved: teacherRes.approved };
        questionResults.push({ ruleId: q.ruleId, correct: scorePercent >= TEACHER_PASS_SCORE });
        qIndex++;
        renderProgress();
        renderCurrentQuestion();
        return;
    }

    // 🌟 لوح «اجمع حروف الحكم»: متعدد النقرات فلا يدخل في قفل الإجابة الواحدة
    const collectBtn = e.target.closest('[data-collect-tile]');
    if (collectBtn && !answerLocked) {
        const q = questions[qIndex];
        const i = Number(collectBtn.dataset.collectTile);
        if (collectFound.has(i) || collectWrong.has(i)) return;
        if (q.tiles[i].isTarget) collectFound.add(i); else { collectWrong.add(i); collectErrors++; }
        const finished = collectFound.size >= q.targets.length;
        if (finished) answerLocked = true;
        document.getElementById('tjwa-container').innerHTML = renderLetterCollectHTML(q);
        if (finished) {
            const scorePercent = Math.max(0, 100 - collectErrors * 15);
            await updateRuleMastery(q.ruleId, 'letter_collect', scorePercent);
            questionResults.push({ ruleId: q.ruleId, correct: scorePercent >= 70 });
            showFeedback(q.ruleId, scorePercent >= 70);
            showNextButton();
        }
        return;
    }

    if (answerLocked) return;

    // 🌟 [مرحلة «تعرّف على مصحفك»] أسئلة الاختيار والضغط داخل الآية والوصل
    const mkQ = questions[qIndex];
    if (mkQ && isMushafQuestionType(mkQ.type)) {
        const mk = handleMushafClick(e, mkQ, { exam: params.mode === 'exam' });
        if (mk) {
            const mkContainer = document.getElementById('tjwa-container');
            if (mk.redraw) mkContainer.innerHTML = renderMushafQuestionHTML(mkQ);
            if (!mk.done) return;
            answerLocked = true;
            if (params.mode === 'exam') {
                await recordQuestionResult(mkQ.ruleId, mk.correct, mk.detail);
                advanceAfterExamAnswer();
                return;
            }
            await recordQuestionResult(mkQ.ruleId, mk.correct);
            const card = mkContainer.querySelector('.tjw-activity-card') || mkContainer;
            const box = document.createElement('div');
            box.className = `tjw-feedback ${mk.correct ? 'is-good' : 'is-bad'}`;
            box.innerHTML = mk.feedbackHTML;
            card.appendChild(box);
            showNextButton();
            return;
        }
    }

    const chooseBtn = e.target.closest('[data-choose-rule]');
    if (chooseBtn) {
        const q = questions[qIndex];
        const isCorrect = chooseBtn.dataset.chooseRule === q.correctRuleId;
        answerLocked = true;
        if (params.mode === 'exam') {   // الاختبار: لا ألوان ولا تفسير أثناءه، تُسجَّل الإجابة وتُراجَع بعد النتيجة
            const correctOpt = q.options.find(o => o.ruleId === q.correctRuleId);
            const pickedOpt = q.options.find(o => o.ruleId === chooseBtn.dataset.chooseRule);
            chooseBtn.classList.add('tjw-answer-picked');
            await recordQuestionResult(q.ruleId, isCorrect, { correctLabel: t(correctOpt.nameKey), yourLabel: t(pickedOpt.nameKey) });
            advanceAfterExamAnswer();
            return;
        }
        markChoiceButtons('[data-choose-rule]', 'data-choose-rule', q.correctRuleId, chooseBtn);
        await recordQuestionResult(q.ruleId, isCorrect);
        showFeedback(q.ruleId, isCorrect);
        showNextButton();
        return;
    }

    const discoverBtn = e.target.closest('[data-discover-option]');
    if (discoverBtn) {
        const q = questions[qIndex];
        const isCorrect = Number(discoverBtn.dataset.discoverOption) === q.correctIndex;
        answerLocked = true;
        if (params.mode === 'exam') {
            const correctOpt = q.options.find(o => o.index === q.correctIndex);
            const pickedOpt = q.options.find(o => o.index === Number(discoverBtn.dataset.discoverOption));
            discoverBtn.classList.add('tjw-answer-picked');
            await recordQuestionResult(q.ruleId, isCorrect, { correctLabel: correctOpt.word, yourLabel: pickedOpt.word });
            advanceAfterExamAnswer();
            return;
        }
        markChoiceButtons('[data-discover-option]', 'data-discover-option', String(q.correctIndex), discoverBtn);
        await recordQuestionResult(q.ruleId, isCorrect);
        showFeedback(q.ruleId, isCorrect);
        showNextButton();
        return;
    }

    const tfBtn = e.target.closest('[data-tf-option]');
    if (tfBtn) {
        const q = questions[qIndex];
        const picked = tfBtn.dataset.tfOption === 'true';
        const isCorrect = picked === q.truth;
        answerLocked = true;
        if (params.mode === 'exam') {
            tfBtn.classList.add('tjw-answer-picked');
            await recordQuestionResult(q.ruleId, isCorrect, { correctLabel: t(q.truth ? 'tjw_ex_true' : 'tjw_ex_false'), yourLabel: t(picked ? 'tjw_ex_true' : 'tjw_ex_false') });
            advanceAfterExamAnswer();
            return;
        }
        markChoiceButtons('[data-tf-option]', 'data-tf-option', String(q.truth), tfBtn);
        await recordQuestionResult(q.ruleId, isCorrect);
        showFeedback(q.ruleId, isCorrect);
        showNextButton();
        return;
    }

    const spotBtn = e.target.closest('[data-spot-option]');
    if (spotBtn) {
        const q = questions[qIndex];
        const picked = spotBtn.dataset.spotOption;
        const isCorrect = picked === q.correctValue;
        answerLocked = true;
        const labelOf = (v) => v === 'ok' ? t('tjw_ex_spot_ok') : fillVars(t('tjw_ex_spot_wrong'), { rule: t((q.options.find(o => o.value === v) || {}).nameKey) });
        if (params.mode === 'exam') {
            spotBtn.classList.add('tjw-answer-picked');
            await recordQuestionResult(q.ruleId, isCorrect, { correctLabel: labelOf(q.correctValue), yourLabel: labelOf(picked) });
            advanceAfterExamAnswer();
            return;
        }
        markChoiceButtons('[data-spot-option]', 'data-spot-option', q.correctValue, spotBtn);
        await recordQuestionResult(q.ruleId, isCorrect);
        showFeedback(q.ruleId, isCorrect);
        showNextButton();
        return;
    }

    const letterOptBtn = e.target.closest('[data-letter-option]');
    if (letterOptBtn) {
        const q = questions[qIndex];
        const picked = letterOptBtn.dataset.letterOption;
        const isCorrect = picked === q.correctLetter;
        answerLocked = true;
        if (params.mode === 'exam') {
            letterOptBtn.classList.add('tjw-answer-picked');
            await recordQuestionResult(q.ruleId, isCorrect, { correctLabel: q.correctLetter, yourLabel: picked });
            advanceAfterExamAnswer();
            return;
        }
        markChoiceButtons('[data-letter-option]', 'data-letter-option', q.correctLetter, letterOptBtn);
        await recordQuestionResult(q.ruleId, isCorrect);
        showFeedback(q.ruleId, isCorrect);
        showNextButton();
        return;
    }

    const nameBtn = e.target.closest('[data-link-name]');
    if (nameBtn && !nameBtn.disabled) {
        linkSelectedName = nameBtn.dataset.linkName;
        highlightSelection('[data-link-name]', linkSelectedName);
        await tryResolveLinkPair();
        return;
    }
    const letterBtn = e.target.closest('[data-link-letter]');
    if (letterBtn && !letterBtn.disabled) {
        linkSelectedLetter = letterBtn.dataset.linkLetter;
        highlightSelection('[data-link-letter]', linkSelectedLetter);
        await tryResolveLinkPair();
        return;
    }
}

function highlightSelection(selector, ruleId) {
    document.querySelectorAll(selector).forEach(btn => btn.classList.remove('tjw-link-selected'));
    document.querySelectorAll(selector).forEach(b => {
        const val = b.getAttribute(selector === '[data-link-name]' ? 'data-link-name' : 'data-link-letter');
        if (val === ruleId) b.classList.add('tjw-link-selected');
    });
}

async function tryResolveLinkPair() {
    if (!linkSelectedName || !linkSelectedLetter) return;
    const q = questions[qIndex];
    if (linkSelectedName === linkSelectedLetter) {
        linkMatchedRuleIds.add(linkSelectedName);
    } else {
        linkWrongAttempts++;
    }
    linkSelectedName = null;
    linkSelectedLetter = null;

    if (linkMatchedRuleIds.size >= q.namesCol.length) {
        answerLocked = true;
        const scorePercent = Math.max(0, 100 - linkWrongAttempts * 15);
        const stageRuleIds = q.namesCol.map(n => n.ruleId); // 🌟 أحكام هذا السؤال (سؤال «صِل المثال» قد يضمّ بعض أحكام المرحلة فقط)
        // 🌟 نشاط "اربط الحكم بحروفه" يحدّث كل أحكام المرحلة معاً بنفس الدرجة الموحّدة (نتيجة
        // واحدة لكل المرحلة، وليس سؤالاً منفصلاً لكل حكم) — لذا نحدّث الإتقان لكل حكم بدون
        // تكرار تسجيله في questionResults (الذي يُستخدَم لحساب "عدد الأسئلة/الإجابات الصحيحة"
        // المعروضة في شاشة النتيجة)، ثم نسجّل نتيجة واحدة فقط تمثّل النشاط بالكامل
        for (const ruleId of stageRuleIds) {
            await updateRuleMastery(ruleId, 'link_rule_letters', scorePercent);
        }
        questionResults.push({ ruleId: stageRuleIds[0] || null, correct: scorePercent >= 70 });
        renderCurrentQuestion();
        showNextButton();
    } else {
        renderCurrentQuestion();
    }
}

function markChoiceButtons(selector, attr, correctValue, clickedBtn) {
    document.querySelectorAll(selector).forEach(btn => {
        btn.disabled = true;
        const val = btn.getAttribute(attr);
        if (val === correctValue) btn.classList.add('tjw-answer-correct');
        else if (btn === clickedBtn) btn.classList.add('tjw-answer-wrong');
    });
}

// 🌟 [إعادة تصميم] لوحة تفسير بعد كل إجابة: كانت الإجابة الخاطئة تتلوّن بالأحمر دون أي شرح،
// فصار الطالب يرى اسم الحكم وتعريفه في الحالتين فيتعلّم من الخطأ لا يكتفي بمعرفته
function showFeedback(ruleId, isCorrect) {
    const flat = getAllRulesFlat().find(x => x.rule.id === ruleId);
    if (!flat) return;
    const container = document.getElementById('tjwa-container');
    const card = container.querySelector('.tjw-activity-card') || container;
    const box = document.createElement('div');
    box.className = `tjw-feedback ${isCorrect ? 'is-good' : 'is-bad'}`;
    box.innerHTML = `
        <div class="tjw-feedback-title">${t(isCorrect ? 'tjw_feedback_correct' : 'tjw_feedback_wrong')}</div>
        <div><span class="tjw-feedback-rule">${t('tjw_feedback_rule_label')} ${t(flat.rule.nameKey)}</span> — ${t(flat.rule.defKey)}</div>`;
    card.appendChild(box);
}

function goNextQuestion() {
    clearAdvance();
    linkMatchedRuleIds = new Set(); linkWrongAttempts = 0; linkSelectedName = null; linkSelectedLetter = null;
    qIndex++;
    renderProgress();
    renderCurrentQuestion();
    autosaveResume();
}

// بعد كل إجابة: الانتقال للسؤال التالي (أو النتيجة) تلقائياً؛ الصحيحة بسرعة والخاطئة أبطأ ليقرأ الطالب التفسير، واللمس على التفسير يتخطى الانتظار
function showNextButton() {
    clearAdvance();
    const wrong = !!document.querySelector('#tjwa-container .tjw-feedback.is-bad');
    const at = qIndex;
    advanceTimer = setTimeout(() => { advanceTimer = null; if (qIndex === at) goNextQuestion(); }, wrong ? 3200 : 1200);
}

// ============================================================
// تحديث سجل الإتقان لحكم واحد فوراً (المرحلة 3) — بلا أي تسجيل في questionResults، حتى
// تستطيع "اربط الحكم بحروفه" استدعاءها لعدة أحكام معاً بنتيجة موحّدة دون مضاعفة عدّاد الأسئلة
// المعروض في شاشة النتيجة (راجع tryResolveLinkPair أعلاه)
// 🌟 كل كتابة على سجل الإتقان تمرّ بطابور واحد: الحفظ التلقائي لنقطة التوقف (بعد كل سؤال) لا يتسابق مع تسجيل نتيجة السؤال التالي
// (قراءة ثم كتابة لنفس السجل) فيُضيّع أحدهما تحديث الآخر.
let writeChain = Promise.resolve();
const queued = (fn) => { const p = writeChain.then(fn, fn); writeChain = p.catch(() => {}); return p; };

const updateRuleMastery = (ruleId, activityType, scorePercent) => queued(() => updateRuleMasteryNow(ruleId, activityType, scorePercent));
async function updateRuleMasteryNow(ruleId, activityType, scorePercent) {
    if (!ruleId) return;
    const stageId = (getAllRulesFlat().find(x => x.rule.id === ruleId) || {}).stageId;
    const record = await AppState.tajweedManager.getOrCreateMasteryRecord(AppState.currentStudent.id, stageId, ruleId);
    const updated = applySessionToMastery(record, activityType, scorePercent);
    await AppState.tajweedManager.saveMastery(updated);
    touchedRuleIds.add(ruleId);
}

// 🌟 [رحلة الحكم] تعديل خطوات الرحلة في سجل الحكم: apply(record) ترجع سجلاً جديداً أو {record, ...}؛
// تُحدَّث حالة الإتقان (status) من الرحلة فيصير «متقن» عند الاعتماد فقط. تُعيد ما أرجعته apply.
const updateRuleJourney = (ruleId, apply) => queued(() => updateRuleJourneyNow(ruleId, apply));
async function updateRuleJourneyNow(ruleId, apply) {
    const stageId = (getAllRulesFlat().find(x => x.rule.id === ruleId) || {}).stageId;
    const record = await AppState.tajweedManager.getOrCreateMasteryRecord(AppState.currentStudent.id, stageId, ruleId);
    const out = apply(record);
    const updated = out.record || out;
    updated.status = statusFromJourney(updated, updated.status);
    if (updated.status === 'mastered' && !updated.masteredAt) updated.masteredAt = new Date().toISOString();
    if (updated.status !== 'mastered') updated.masteredAt = null;
    await AppState.tajweedManager.saveMastery(updated);
    touchedRuleIds.add(ruleId);
    return out.record ? out : { record: updated };
}

// جولة مراجعة: حكم معتمد يرسب فيها (<60%) يعود «يحتاج مراجعة»، وينجح (≥70%) فيعود «متقن»
async function updateReviewStatus(ruleId, avgPercent) {
    const rec = await AppState.tajweedManager.getMasteryRecord(AppState.currentStudent.id, ruleId);
    if (!rec || !ensureJourney(rec).teacherApprovedAt) return;
    let status = rec.status;
    if (avgPercent < 60) status = 'needs_review';
    else if (avgPercent >= 70 && rec.status === 'needs_review') status = 'mastered';
    if (status !== rec.status) { rec.status = status; rec.masteredAt = status === 'mastered' ? (rec.masteredAt || new Date().toISOString()) : null; await AppState.tajweedManager.saveMastery(rec); }
}

// ============================================================
// تسجيل نتيجة سؤال فردي واحد فور الإجابة عليه: يحدّث الإتقان (عبر updateRuleMastery أعلاه)
// ويضيف السؤال لقائمة نتائج الجلسة (المستخدَمة لحساب الدرجة الكلية في شاشة النتيجة)
// ============================================================
function advanceAfterExamAnswer() {
    setTimeout(() => { qIndex++; renderProgress(); renderCurrentQuestion(); autosaveResume(); }, 350);
}

async function recordQuestionResult(ruleId, isCorrect, detail) {
    if (!ruleId) return;
    let effectiveActivityType;
    if (params.mode === 'exam') effectiveActivityType = 'exam';
    else if (params.mode === 'practice') effectiveActivityType = questions[qIndex].type;
    else if (params.mode === 'challenge') effectiveActivityType = 'stage_challenge';
    else if (params.mode === 'review') effectiveActivityType = 'review';
    else if (params.mode === 'tree' || params.mode === 'letters' || params.mode === 'mushaf') effectiveActivityType = questions[qIndex].type;
    const scorePercent = isCorrect ? 100 : 0;

    await updateRuleMastery(ruleId, effectiveActivityType, scorePercent);
    questionResults.push({ ruleId, correct: isCorrect });
    if (detail && !isCorrect) examReview.push({ n: qIndex + 1, ...detail });
}

// ============================================================
// إنهاء الجلسة: حفظ سجل الجلسة + جدول المراجعة (للمراجعة) + الأوسمة + مزامنة تقدّم الطالب
// ============================================================
async function finishSession() {
    const container = document.getElementById('tjwa-container');
    container.innerHTML = `<div class="tjw-loading">${t('sim_loading')}</div>`;

    const studentId = AppState.currentStudent.id;
    const sessionMode = params.mode === 'teacher_approve' ? 'teacher_checkpoint' : params.mode;   // اعتماد الضغطة الواحدة يُسجَّل كجلسة اعتماد المعلم
    const ruleKey = params.ruleId || params.pathRuleId || null;
    const totalQuestions = questionResults.length;
    const correctCount = questionResults.filter(r => r.correct).length;
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const isPerfect = totalQuestions > 0 && correctCount === totalQuestions;

    // 🌟 [المرحلة 4] كل جلسة نشاط (وليس فقط جولات المراجعة) تُحدِّث جدول reviewScheduleDB لكل
    // حكم لمسته — هذا ما "يزرع" أول موعد مراجعة لأي حكم فور بدء التدرّب عليه، وإلا لن تظهر
    // أي مراجعة "مستحقة" أبداً (لا بوّابة فعلية تمنع فتح أحكام جديدة) طالما الطالب لم يدخل
    // جولة مراجعة من الأساس — تناقض منطقي واضح بدون هذا التحديث الشامل. جولة المراجعة نفسها
    // (mode==='review') تحسب متوسط نتائج أسئلتها الفعلية لكل حكم (قد يتكرر الحكم بأكثر من
    // سؤال)، بينما بقية الأوضاع تستخدم الدرجة الإجمالية لكل الجلسة موحّدة لكل حكم لمسته —
    // تبسيط معقول [افتراض صريح] بدل تتبّع درجة منفصلة لكل سؤال متعلّق بنفس الحكم في كل مكان.
    if (params.mode === 'review') {
        const byRule = {};
        questionResults.forEach(r => {
            byRule[r.ruleId] = byRule[r.ruleId] || [];
            byRule[r.ruleId].push(r.correct ? 100 : 0);
        });
        for (const ruleId of Object.keys(byRule)) {
            const avg = Math.round(byRule[ruleId].reduce((a, b) => a + b, 0) / byRule[ruleId].length);
            await AppState.reviewScheduleManager.recordRuleReviewResult(studentId, ruleId, avg);
            await updateReviewStatus(ruleId, avg);
        }
    } else {
        for (const ruleId of touchedRuleIds) {
            await AppState.reviewScheduleManager.recordRuleReviewResult(studentId, ruleId, scorePercent);
        }
    }

    // 🌟 حفظ سجل الجلسة (tajweed_sessions) — activityType هنا هو "وضع" النشاط ككل (mode)،
    // بخلاف effectiveActivityType الداخلي المستخدَم لتحديث كل بُعد على حدة أعلاه. لجلسات
    // "سمّع لي" فقط نحفظ ملاحظة المعلم النصية الاختيارية معها (🌟🌟 جديد ٢٨ سبتمبر)
    await AppState.tajweedManager.addSession({
        studentId,
        stageId: params.stageId || null,
        ruleId: ruleKey,
        activityType: sessionMode,
        totalQuestions,
        correctCount,
        scorePercent,
        ...(params.mode === 'teacher_checkpoint' && checkpointNote ? { teacherNote: checkpointNote } : {})
    });

    // 🌟 [مسار الحكم] نتيجة لعبة تدخل متوسط ألعاب الحكم (≥75% يُنجز الخطوة)، ونتيجة الاختبار (≥80%) تُنجز الثالثة؛ وانتهاء النشاط يمسح نقطة التوقف
    let examOutcome = null;
    if (ruleKey && RESUMABLE_MODES.includes(params.mode)) await saveResume(null);
    if (GAME_KEYS.includes(params.mode) && ruleKey) {
        await updateRuleJourney(ruleKey, r => applyGameResult(r, params.mode, scorePercent, gamesForRuleId(ruleKey)));
    } else if (params.mode === 'exam' && ruleKey) {
        const out = await updateRuleJourney(ruleKey, r => applyExamResult(r, scorePercent, new Date(), examKinds));
        examOutcome = { passed: out.passed };
    }

    const allMasteryAfter = await AppState.tajweedManager.getMasteryByStudent(studentId);
    // 🌟 «تحدي المرحلة»: الدرجة ≥ حدّ النجاح تعني اجتياز المرحلة وفتح التالية
    const challengePassed = params.mode === 'challenge' && !!params.stageId && scorePercent >= EXAM_PASS_SCORE;
    const nextStage = challengePassed ? TAJWEED_STAGES[TAJWEED_STAGES.findIndex(s => s.id === params.stageId) + 1] : null;
    const wasNextLocked = !!nextStage && !isStageUnlocked(nextStage.id, stageProgressBefore);
    const stageProgressAfter = computeAllStageProgress(allMasteryAfter, [...passedStagesOf(), ...(challengePassed ? [params.stageId] : [])]);
    const ruleRecAfter = allMasteryAfter.find(m => m.ruleId === ruleKey) || null;
    const journeyAfter = ruleKey ? ensureJourney(ruleRecAfter) : null;
    const stepAfter = journeyAfter ? journeyStep(journeyAfter) : null;

    // 🌟 حكم "اكتُشف إتقانه للتو" — أول حكم ضمن الأحكام التي لمسناها هذه الجلسة تحوّل إلى
    // 'mastered' الآن وما كانش كذلك قبلها
    let justMasteredRuleId = null;
    let wasNeedsReviewBeforeThisSession = false;
    touchedRuleIds.forEach(ruleId => {
        const before = masteryBeforeMap[ruleId];
        const after = allMasteryAfter.find(m => m.ruleId === ruleId);
        if (after && after.status === 'mastered' && (!before || before.status !== 'mastered') && !justMasteredRuleId) {
            justMasteredRuleId = ruleId;
        }
        if (before && before.status === 'needs_review') wasNeedsReviewBeforeThisSession = true;
    });

    let justCompletedStageId = null;
    Object.keys(stageProgressAfter).forEach(stageId => {
        const before = stageProgressBefore[stageId];
        const after = stageProgressAfter[stageId];
        if (after.status === 'completed' && (!before || before.status !== 'completed')) {
            justCompletedStageId = stageId;
        }
    });

    const allSessions = await AppState.tajweedManager.getSessionsByStudent(studentId);
    const distinctPracticeDaysCount = new Set(allSessions.map(s => new Date(s.timestamp).toISOString().slice(0, 10))).size;

    // 🔥 سلسلة مراجعة متتالية بالأيام — تُحسَب فقط من جلسات وضع "review"
    let currentStreakDays = 0;
    if (params.mode === 'review') {
        const reviewDays = [...new Set(allSessions.filter(s => s.activityType === 'review').map(s => new Date(s.timestamp).toISOString().slice(0, 10)))].sort();
        let best = 0, current = 0, prevDay = null;
        reviewDays.forEach(d => {
            current = prevDay && (new Date(d) - new Date(prevDay)) / 86400000 === 1 ? current + 1 : 1;
            best = Math.max(best, current);
            prevDay = d;
        });
        currentStreakDays = best;
    }

    const ctx = {
        studentId,
        allMastery: allMasteryAfter,
        allSessions,
        justMasteredRuleId,
        justCompletedStageId,
        lastActivityWasPerfect: isPerfect,
        lastActivityType: sessionMode,
        lastActivitySucceeded: isPerfect || scorePercent >= 70,
        wasNeedsReviewBeforeThisSession,
        currentStreakDays,
        distinctPracticeDaysCount
    };

    const earnedCandidates = evaluateSessionAchievements(ctx);
    const earnedBadges = [];
    for (const cand of earnedCandidates) {
        const def = TAJWEED_BADGE_CATALOG[cand.badgeKey];
        if (!def) continue;
        if (!def.repeatable) {
            const already = await AppState.tajweedManager.hasAchievement(studentId, cand.badgeKey);
            if (already) continue;
        }
        await AppState.tajweedManager.addAchievement({ studentId, badgeKey: cand.badgeKey, meta: cand.meta || null });
        earnedBadges.push(def);
    }

    await syncStudentTajweedProgress(AppState.currentStudent, sessionMode, ruleKey, challengePassed ? params.stageId : null);

    // 🌟 [سلسلة الحكم] لعبة في سلسلة: تُسجَّل نتيجتها ثم تبدأ اللعبة التالية (أو التحدي) مباشرة بلا شاشة نتيجة؛ تتوقف السلسلة عند شاشة
    // النتيجة فقط إن لم يبلغ متوسط الألعاب الحدّ فلا يُفتح التحدي (تُعرض «أعد ألعاب الحكم»)
    if (GAME_KEYS.includes(params.mode) && ruleKey && params.chain && params.chain.length && (params.chain[0] !== 'exam' || stepAfter === 'exam')) {
        chainBadges.push(...earnedBadges);
        await continueChain({ prevMode: params.mode, scorePercent, nextMode: params.chain[0] });
        return;
    }
    if (params.mode === 'exam') {
        const allBadges = [...chainBadges, ...earnedBadges]; chainBadges = [];
        renderExamResultScreen({ scorePercent, correctCount, totalQuestions, passed: !!(examOutcome && examOutcome.passed), earnedBadges: allBadges });
        return;
    }
    if (chainBadges.length) { earnedBadges.unshift(...chainBadges); chainBadges = []; }
    renderResultScreen({ challengeResult: params.mode === 'challenge' ? { passed: challengePassed, unlockedStage: wasNextLocked ? nextStage : null } : null, scorePercent, correctCount, totalQuestions, earnedBadges, justMasteredRuleId, justCompletedStageId, stageProgressAfter, stepAfter, journeyAfter, ruleKey });
}

// شاشة عبور قصيرة بين لعبتين من سلسلة الحكم (لا زرّ: تنتقل وحدها)، ثم تبدأ اللعبة التالية أو التحدي الأخير
async function continueChain({ prevMode, scorePercent, nextMode }) {
    const token = activityToken, ruleId = pathRuleIdOf();
    const container = document.getElementById('tjwa-container');
    const progressEl = document.getElementById('tjwa-progress');
    if (progressEl) progressEl.innerHTML = '';
    const isExam = nextMode === 'exam';
    container.innerHTML = `<div class="tjw-chain-pass">
        <div class="tjw-chain-emoji">${isExam ? '🏁' : '🎮'}</div>
        <h2 class="tjw-result-headline">${t('tjw_chain_done').replace('{game}', t('tjw_game_' + prevMode)).replace('{n}', scorePercent)}</h2>
        <p class="tjw-result-sub">${isExam ? t('tjw_chain_to_challenge') : t('tjw_chain_next').replace('{game}', t('tjw_game_' + nextMode))}</p></div>`;
    await new Promise(r => setTimeout(r, 1500));
    if (token !== activityToken || !document.getElementById('tjwa-container')) return;
    const base = { stageId: params.stageId, studentId: AppState.currentStudent.id, ruleId, pathRuleId: ruleId, chain: params.chain.slice(1), chainPos: (params.chainPos || 1) + 1, chainTotal: params.chainTotal };
    params = isExam ? { ...base, mode: 'exam' } : { ...base, mode: nextMode, ruleId: (nextMode === 'practice' || nextMode === 'letters' || nextMode === 'mushaf') ? ruleId : null };
    await bootMode();
}

function renderResultScreen({ challengeResult, scorePercent, correctCount, totalQuestions, earnedBadges, justMasteredRuleId, justCompletedStageId, stageProgressAfter, stepAfter, journeyAfter, ruleKey }) {
    const container = document.getElementById('tjwa-container');
    const progressEl = document.getElementById('tjwa-progress');
    if (progressEl) progressEl.innerHTML = '';

    const badgesHTML = earnedBadges.length > 0 ? `
        <div class="tjw-earned-badges">
            ${earnedBadges.map(def => `
                <div class="tjw-badge-chip">
                    <span class="tjw-badge-chip-icon">${def.icon}</span>
                    <span>${t(def.nameKey)}</span>
                </div>`).join('')}
        </div>` : '';

    const masteredNoteHTML = justMasteredRuleId
        ? `<p class="tjw-result-note">✅ ${t('tjw_rule_mastered_note')}</p>` : '';
    const stageNoteHTML = justCompletedStageId
        ? `<p class="tjw-result-note">🎉 ${t('tjw_stage_completed_note')}</p>` : '';

    // 🌟 نتيجة «تحدي المرحلة»: نجاح يفتح المرحلة التالية، أو حدّ النجاح المطلوب
    const challengeHTML = !challengeResult ? ''
        : challengeResult.passed
            ? `<p class="tjw-result-note">🏆 ${t('tjw_challenge_passed')}</p>${challengeResult.unlockedStage ? `<p class="tjw-result-note">🔓 ${t('tjw_challenge_unlocked').replace('{stage}', t(challengeResult.unlockedStage.nameKey))}</p>` : ''}`
            : `<p class="tjw-result-note tjw-result-note-warn">${t('tjw_challenge_failed').replace('{n}', EXAM_PASS_SCORE)}</p>`;

    // 🌟 [مسار الحكم] بعد لعبة: اللعبة التالية، أو التحدي إن بلغ متوسط الألعاب الحد (75%)، أو إعادة أضعف لعبة لرفع المتوسط.
    // وبعد اعتماد المعلم: رسالة الاعتماد. (حُذف زر «الحكم التالي»: كان يقفز متجاوزاً درس الحكم التالي وخطوات رحلته.)
    let journeyHTML = '';
    const gameName = (k) => t('tjw_game_' + k);
    if (GAME_KEYS.includes(params.mode) && ruleKey && journeyAfter) {
        if (stepAfter === 'exam') {
            journeyHTML = `<p class="tjw-result-note">🎯 ${t('tjw_path_games_done')}</p>
                <button class="tjw-cta-btn" data-action="go-exam">📝 ${t('tjw_path_start_challenge')}</button>`;
        } else if (stepAfter === 'practice') {
            const next = nextGameKey(journeyAfter, gamesForRuleId(ruleKey));
            if (journeyAfter.gamesAvg != null) {
                journeyHTML = `<p class="tjw-result-note tjw-result-note-warn">${t('tjw_path_games_avg').replace('{n}', journeyAfter.gamesAvg).replace('{p}', GAMES_PASS_SCORE)}</p>
                    ${next ? `<button class="tjw-cta-btn" data-action="go-chain">${t('tjw_path_replay_all')}</button>` : ''}`;
            } else if (next) {
                journeyHTML = `<button class="tjw-cta-btn" data-action="go-game" data-game="${next}">${t('tjw_path_next_game').replace('{game}', gameName(next))}</button>`;
            }
        }
    } else if (params.mode === 'teacher_approve') {
        journeyHTML = `<p class="tjw-result-note">✅ ${t('tjw_approved_done')}</p>`;
    } else if (params.mode === 'teacher_checkpoint' && checkpointOutcome) {
        journeyHTML = checkpointOutcome.approved
            ? `<p class="tjw-result-note">✅ ${t('tjw_checkpoint_approved')}</p>`
            : `<p class="tjw-result-note tjw-result-note-warn">${t('tjw_checkpoint_not_approved').replace('{n}', TEACHER_PASS_SCORE)}</p>`;
    }

    // انتهى الحكم (اعتمده المعلم): يُعرض «بدء حكم جديد» أو «إنهاء» بدل «العودة للخريطة»
    const ruleDone = params.mode === 'teacher_approve' || (params.mode === 'teacher_checkpoint' && !!(checkpointOutcome && checkpointOutcome.approved));

    const nextRuleId = ruleDone && AppState.currentStudent.tajweedProgress ? AppState.currentStudent.tajweedProgress.currentRuleId : null;

    const headlineKey = scorePercent >= 80 ? 'tjw_result_great' : scorePercent >= 50 ? 'tjw_result_good' : 'tjw_result_retry';
    const ringColor = scorePercent >= 80 ? 'var(--tjw-good)' : scorePercent >= 50 ? 'var(--tjw-gold-deep)' : 'var(--tjw-accent)';

    container.innerHTML = `
        <div class="tjw-result-card">
            <div class="tjw-result-ring" style="--p:${scorePercent}; --c:${ringColor};"><span class="tjw-result-score">${scorePercent}%</span></div>
            <h2 class="tjw-result-headline">${t(headlineKey)}</h2>
            <p class="tjw-result-sub">${correctCount} / ${totalQuestions} ${t('tjw_correct_answers_unit')}</p>
            ${masteredNoteHTML}
            ${stageNoteHTML}
            ${challengeHTML}
            ${badgesHTML}
            <div class="tjw-result-actions">
                ${journeyHTML}
                ${params.mode === 'teacher_approve' ? '' : `<button class="tjw-outline-btn" data-action="retry-activity">🔁 ${t('tjw_retry_activity_btn')}</button>`}
                <button class="tjw-outline-btn" data-action="parent-summary">${t(ruleKey ? 'tjw_lesson_summary_btn' : 'tjw_sum_btn')}</button>
                ${ruleDone
                    ? `${nextRuleId ? `<button class="tjw-cta-btn" data-action="new-rule">▶️ ${t('tjw_new_rule_named_btn').replace('{rule}', ruleNameOf(nextRuleId))}</button>` : ''}
                       <button class="${nextRuleId ? 'tjw-outline-btn' : 'tjw-cta-btn'}" data-action="finish-session">🏁 ${t('tjw_finish_session_btn')}</button>`
                    : `<button class="${journeyHTML ? 'tjw-outline-btn' : 'tjw-cta-btn'}" data-action="back-to-map">🏠 ${t('tjw_back_to_map_btn')}</button>`}
            </div>
        </div>`;
}

// 🌟 [رحلة الحكم] شاشة نتيجة اختبار الحكم: نجاح/رسوب بدرجة النجاح، ثم مراجعة الأسئلة الخاطئة (الصواب وإجابته)
function renderExamResultScreen({ scorePercent, correctCount, totalQuestions, passed, earnedBadges }) {
    const container = document.getElementById('tjwa-container');
    const progressEl = document.getElementById('tjwa-progress');
    if (progressEl) progressEl.innerHTML = '';
    const ringColor = passed ? 'var(--tjw-good)' : 'var(--tjw-accent)';
    const reviewHTML = examReview.length > 0 ? `
        <div class="tjw-exam-review">
            <h3>${t('tjw_exam_review_title')}</h3>
            <ul>${examReview.map(it => `<li><span class="tjw-exam-review-n">${t('tjw_question_label')} ${it.n}</span>
                <span>${t('tjw_exam_correct_label')} <b class="tjw-ok">${it.correctLabel}</b></span>
                <span>${t('tjw_exam_your_label')} <b class="tjw-bad">${it.yourLabel}</b></span></li>`).join('')}</ul>
        </div>` : '';
    const badgesHTML = earnedBadges.length > 0 ? `<div class="tjw-earned-badges">${earnedBadges.map(def => `<div class="tjw-badge-chip"><span class="tjw-badge-chip-icon">${def.icon}</span><span>${t(def.nameKey)}</span></div>`).join('')}</div>` : '';
    container.innerHTML = `
        <div class="tjw-result-card">
            <div class="tjw-result-ring" style="--p:${scorePercent}; --c:${ringColor};"><span class="tjw-result-score">${scorePercent}%</span></div>
            <h2 class="tjw-result-headline">${t(passed ? 'tjw_exam_passed' : 'tjw_exam_failed')}</h2>
            <p class="tjw-result-sub">${correctCount} / ${totalQuestions} ${t('tjw_correct_answers_unit')} — ${t('tjw_exam_pass_mark').replace('{n}', EXAM_PASS_SCORE)}</p>
            ${passed ? `<p class="tjw-result-note">🎤 ${t('tjw_awaiting_teacher_note')}</p>` : `<p class="tjw-result-note tjw-result-note-warn">${t('tjw_exam_fail_hint')}</p>`}
            ${badgesHTML}
            ${reviewHTML}
            <div class="tjw-result-actions">
                ${passed ? `<button class="tjw-cta-btn" data-action="approve-now">${t('tjw_approve_btn')}</button>` : `<button class="tjw-cta-btn" data-action="go-chain">🎯 ${t('tjw_exam_go_practice')}</button>`}
                <button class="tjw-outline-btn" data-action="parent-summary">${t('tjw_lesson_summary_btn')}</button>
                <button class="tjw-outline-btn" data-action="back-to-map">🏠 ${t('tjw_back_to_map_btn')}</button>
            </div>
        </div>`;
}
