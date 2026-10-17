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
import { getTajweedStage, getTajweedRule, getAllRulesFlat, getStageRuleIds } from '../engine/tajweedRulesCatalog.js';
import {
    generateChooseRuleQuestion, generateLinkQuestion, generateDiscoverQuestion, generateApplyQuestion,
    buildStageChallengeQuestions, buildReviewQuestions, applySessionToMastery, computeAllStageProgress,
    generateAnnotatedQuestion, generateIdentifyQuestion, buildExamQuestions,
    evaluateSessionAchievements, TAJWEED_BADGE_CATALOG,
    // 🌟🌟 [جديد ٢٨ سبتمبر] بوّابة تسميع المعلم — راجع تعليق الاستيراد أدناه عند استخدامهما
    buildTeacherCheckpointCriteria, computeCheckpointScore
} from '../engine/tajweedEngine.js';
import {
    getAyahForExample, syncStudentTajweedProgress, pickStudentExamples, loadAnnotationIndex, highlightWordsHTML,
    highlightForTajweed, makeConflictChecker, buildExamSources
} from './tajweed-shared.js';
import {
    ensureJourney, canTakeExam, canTeacherCheck, applyPracticeResult, applyExamResult, applyTeacherResult,
    statusFromJourney, journeyStep, EXAM_PASS_SCORE, EXAM_MIN_SIZE, TEACHER_PASS_SCORE, PRACTICE_PASS_SCORE
} from '../engine/tajweedJourney.js';
import { buildAyahAudioUrl } from '../database/kidsAudioDB.js';
// 🌟 [جديد] تدريبات الحروف والأزواج المستوحاة من كتاب «فتوحات الرحمن» (اجمع الحروف، الدخيل، صنّف، اربط، صِل المثال)
import { buildRuleLetterGameQuestions, buildStageTreeQuestions } from '../engine/tajweedLetterGames.js';
import { buildExamplesLinkQuestion } from './tajweed-letters-ui.js';

let params = null;
let questions = [];
let qIndex = 0;
let touchedRuleIds = new Set();
let masteryBeforeMap = {}; // ruleId -> {status, dimensions}
let stageProgressBefore = {};
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
// 🌟 حالة لوح «اجمع حروف الحكم» (سؤال متعدد النقرات): تُصفَّر عند ظهور السؤال لأول مرة فقط
let collectIndex = -1;
let collectFound = new Set();   // فهارس اللوحات الصحيحة المضغوطة
let collectWrong = new Set();   // فهارس اللوحات الخاطئة المضغوطة
let collectErrors = 0;

export async function initTajweedActivity() {
    params = AppState.tajweedActivityParams;
    AppState.tajweedActivityParams = null;

    const titleEl = document.getElementById('tjwa-title');
    if (titleEl && params && params.mode === 'exam') titleEl.textContent = t('tjw_exam_title');
    if (titleEl && params && params.mode === 'tree') titleEl.textContent = t('tjw_tree_activity_title');
    if (titleEl && params && params.mode === 'letters') titleEl.textContent = t('tjw_letters_activity_title');
    const exitBtn = document.getElementById('tjwa-btn-exit');
    if (exitBtn) exitBtn.addEventListener('click', () => openTajweedSection());

    const container = document.getElementById('tjwa-container');
    if (container) container.addEventListener('click', handleActivityClick);

    if (!params || !AppState.currentStudent || !AppState.tajweedManager) {
        if (container) container.innerHTML = `<div class="tjw-empty-state">${t('tjw_activity_error')}</div>`;
        return;
    }

    container.innerHTML = `<div class="tjw-loading">${t('sim_loading')}</div>`;
    await buildQuestions();
    qIndex = 0;
    questionResults = [];
    touchedRuleIds = new Set();
    renderProgress();
    renderCurrentQuestion();
}

// ============================================================
// بناء طابور الأسئلة حسب وضع النشاط (mode)
// ============================================================
async function buildQuestions() {
    const studentId = AppState.currentStudent.id;
    const allMastery = await AppState.tajweedManager.getMasteryByStudent(studentId);
    masteryBeforeMap = {};
    allMastery.forEach(m => { masteryBeforeMap[m.ruleId] = { status: m.status, dimensions: { ...m.dimensions } }; });
    stageProgressBefore = computeAllStageProgress(allMastery);

    questions = [];
    linkMatchedRuleIds = new Set();
    linkWrongAttempts = 0;
    collectIndex = -1; // 🌟 يُعاد تصفير لوح «اجمع الحروف» مع كل بناء جديد للأسئلة (إعادة المحاولة)

    if (params.mode === 'practice') {
        const rule = getTajweedRule(params.stageId, params.ruleId);
        if (!rule) return;
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
        for (const rule of dueRules) {
            ayahInfoByRuleId[rule.id] = await entryForRule(rule);
        }
        questions = buildReviewQuestions(dueRules, ayahInfoByRuleId);
    } else if (params.mode === 'exam') {
        // 🌟 [رحلة الحكم] اختبار الحكم: لا يُفتح إلا بعد شرح وتطبيق ناجح (ولا يُعاد بعد رسوب قبل تطبيق جديد)
        const rule = getTajweedRule(params.stageId, params.ruleId);
        if (!rule) return;
        const rec = await AppState.tajweedManager.getMasteryRecord(studentId, rule.id);
        if (!canTakeExam(ensureJourney(rec))) return;
        const sources = await buildExamSources(rule, AppState.currentStudent);
        const conflicts = makeConflictChecker(await loadAnnotationIndex());
        const built = buildExamQuestions(rule, sources, { conflicts });
        questions = built.length >= EXAM_MIN_SIZE ? built : [];
        examReview = [];
    } else if (params.mode === 'teacher_checkpoint') {
        // 🌟🌟 [جديد ٢٨ سبتمبر] بوّابة تسميع المعلم — "سؤال" واحد فقط من نوع خاص يحمل معايير
        // التقييم + الآيتين المرجعيتين (للتصفّح، لا لبناء سؤال MCQ). راجع §2 من مستند التعميق.
        const rule = getTajweedRule(params.stageId, params.ruleId);
        if (!rule) return;
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
    el.innerHTML = `<div class="tjw-progress-bar"><span style="width:${pct}%;"></span></div>
        <span class="tjw-progress-label">${t('tjw_question_label')} ${current} / ${questions.length}</span>`;
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
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${t('tjw_act_choose_prompt')}</p>
            <div class="tjw-letters-display">${q.letters}</div>
            <div class="tjw-answer-grid">${optionsHTML}</div>
        </div>`;
}

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
    const audioBtnHTML = (q.audioNumber && params.mode !== 'exam')
        ? `<button class="tjw-listen-btn" data-tjw-audio="${buildAyahAudioUrl(q.audioNumber)}">🔊 ${t('tjw_listen_btn')}</button>` : '';
    const optionsHTML = q.options.map(opt => `<button class="tjw-answer-btn" data-choose-rule="${opt.ruleId}">${t(opt.nameKey)}</button>`).join('');
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${t('tjw_act_identify_prompt')}</p>
            <div class="tjw-activity-ayah-box">
                ${q.fromHifz ? `<div class="tjw-hifz-tag">📖 ${t('tjw_from_hifz')}</div>` : ''}
                <div class="tjw-example-text">${ayahHTML}</div>
                <div class="tjw-example-ref">${q.surahName || ''}</div>
                ${audioBtnHTML}
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
        const audio = new Audio(audioBtn.dataset.tjwAudio);
        audio.play().catch(() => {});
        return;
    }

    const nextBtn = e.target.closest('[data-action="next-question"]');
    if (nextBtn) {
        linkMatchedRuleIds = new Set(); linkWrongAttempts = 0; linkSelectedName = null; linkSelectedLetter = null;
        qIndex++;
        renderProgress();
        renderCurrentQuestion();
        return;
    }

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

    // 🌟 [رحلة الحكم] من شاشة نتيجة التطبيق إلى الاختبار، ومن نتيجة اختبار راسب إلى تطبيق جديد (للحكم نفسه)
    const goBtn = e.target.closest('[data-action="go-exam"], [data-action="go-practice"]');
    if (goBtn) {
        params = { mode: goBtn.dataset.action === 'go-exam' ? 'exam' : 'practice', stageId: params.stageId, ruleId: params.ruleId, studentId: AppState.currentStudent.id };
        const titleEl = document.getElementById('tjwa-title');
        if (titleEl) titleEl.textContent = params.mode === 'exam' ? t('tjw_exam_title') : t('tjw_activity_title');
        document.getElementById('tjwa-container').innerHTML = `<div class="tjw-loading">${t('sim_loading')}</div>`;
        await buildQuestions();
        qIndex = 0;
        questionResults = [];
        touchedRuleIds = new Set();
        renderProgress();
        renderCurrentQuestion();
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

function showNextButton() {
    const container = document.getElementById('tjwa-container');
    const btn = document.createElement('button');
    btn.className = 'tjw-cta-btn tjw-next-question-btn';
    btn.dataset.action = 'next-question';
    btn.textContent = qIndex + 1 >= questions.length ? `✅ ${t('tjw_finish_activity_btn')}` : `➡️ ${t('tjw_next_question_btn')}`;
    container.appendChild(btn);
}

// ============================================================
// تحديث سجل الإتقان لحكم واحد فوراً (المرحلة 3) — بلا أي تسجيل في questionResults، حتى
// تستطيع "اربط الحكم بحروفه" استدعاءها لعدة أحكام معاً بنتيجة موحّدة دون مضاعفة عدّاد الأسئلة
// المعروض في شاشة النتيجة (راجع tryResolveLinkPair أعلاه)
async function updateRuleMastery(ruleId, activityType, scorePercent) {
    if (!ruleId) return;
    const stageId = (getAllRulesFlat().find(x => x.rule.id === ruleId) || {}).stageId;
    const record = await AppState.tajweedManager.getOrCreateMasteryRecord(AppState.currentStudent.id, stageId, ruleId);
    const updated = applySessionToMastery(record, activityType, scorePercent);
    await AppState.tajweedManager.saveMastery(updated);
    touchedRuleIds.add(ruleId);
}

// 🌟 [رحلة الحكم] تعديل خطوات الرحلة في سجل الحكم: apply(record) ترجع سجلاً جديداً أو {record, ...}؛
// تُحدَّث حالة الإتقان (status) من الرحلة فيصير «متقن» عند الاعتماد فقط. تُعيد ما أرجعته apply.
async function updateRuleJourney(ruleId, apply) {
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
    setTimeout(() => { qIndex++; renderProgress(); renderCurrentQuestion(); }, 350);
}

async function recordQuestionResult(ruleId, isCorrect, detail) {
    if (!ruleId) return;
    let effectiveActivityType;
    if (params.mode === 'exam') effectiveActivityType = 'exam';
    else if (params.mode === 'practice') effectiveActivityType = questions[qIndex].type;
    else if (params.mode === 'challenge') effectiveActivityType = 'stage_challenge';
    else if (params.mode === 'review') effectiveActivityType = 'review';
    else if (params.mode === 'tree' || params.mode === 'letters') effectiveActivityType = questions[qIndex].type;
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
        ruleId: params.ruleId || null,
        activityType: params.mode,
        totalQuestions,
        correctCount,
        scorePercent,
        ...(params.mode === 'teacher_checkpoint' && checkpointNote ? { teacherNote: checkpointNote } : {})
    });

    // 🌟 [رحلة الحكم] نتيجة التطبيق تُنجز الخطوة الثانية (≥60%)، ونتيجة الاختبار الثالثة (≥80%)
    let examOutcome = null;
    if (params.mode === 'practice' && params.ruleId) {
        await updateRuleJourney(params.ruleId, r => applyPracticeResult(r, scorePercent));
    } else if (params.mode === 'exam' && params.ruleId) {
        const out = await updateRuleJourney(params.ruleId, r => applyExamResult(r, scorePercent));
        examOutcome = { passed: out.passed };
    }

    const allMasteryAfter = await AppState.tajweedManager.getMasteryByStudent(studentId);
    const stageProgressAfter = computeAllStageProgress(allMasteryAfter);
    const ruleRecAfter = allMasteryAfter.find(m => m.ruleId === params.ruleId) || null;
    const stepAfter = params.ruleId ? journeyStep(ensureJourney(ruleRecAfter)) : null;

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
        lastActivityType: params.mode,
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

    await syncStudentTajweedProgress(AppState.currentStudent, params.mode, params.ruleId);

    if (params.mode === 'exam') {
        renderExamResultScreen({ scorePercent, correctCount, totalQuestions, passed: !!(examOutcome && examOutcome.passed), earnedBadges });
        return;
    }
    renderResultScreen({ scorePercent, correctCount, totalQuestions, earnedBadges, justMasteredRuleId, justCompletedStageId, stageProgressAfter, stepAfter });
}

function renderResultScreen({ scorePercent, correctCount, totalQuestions, earnedBadges, justMasteredRuleId, justCompletedStageId, stageProgressAfter, stepAfter }) {
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

    // 🌟 [رحلة الحكم] بعد التطبيق: الناجح (≥60%) ينتقل لاختبار الحكم، وإلا يعيد التطبيق. وبعد «سمّع لي» تُعرض نتيجة الاعتماد.
    // (حُذف زر «الحكم التالي»: كان يقفز لتطبيق الحكم التالي متجاوزاً درسه وخطوات رحلته.)
    let journeyHTML = '';
    if (params.mode === 'practice') {
        if (stepAfter === 'exam') {
            journeyHTML = `<p class="tjw-result-note">🎯 ${t('tjw_practice_done_note')}</p>
                <button class="tjw-cta-btn" data-action="go-exam">📝 ${t('tjw_step_exam_cta')}</button>`;
        } else if (scorePercent < PRACTICE_PASS_SCORE) {
            journeyHTML = `<p class="tjw-result-note tjw-result-note-warn">${t('tjw_practice_fail_note').replace('{n}', PRACTICE_PASS_SCORE)}</p>`;
        }
    } else if (params.mode === 'teacher_checkpoint' && checkpointOutcome) {
        journeyHTML = checkpointOutcome.approved
            ? `<p class="tjw-result-note">✅ ${t('tjw_checkpoint_approved')}</p>`
            : `<p class="tjw-result-note tjw-result-note-warn">${t('tjw_checkpoint_not_approved').replace('{n}', TEACHER_PASS_SCORE)}</p>`;
    }

    const headlineKey = scorePercent >= 80 ? 'tjw_result_great' : scorePercent >= 50 ? 'tjw_result_good' : 'tjw_result_retry';
    const ringColor = scorePercent >= 80 ? 'var(--tjw-good)' : scorePercent >= 50 ? 'var(--tjw-gold-deep)' : 'var(--tjw-accent)';

    container.innerHTML = `
        <div class="tjw-result-card">
            <div class="tjw-result-ring" style="--p:${scorePercent}; --c:${ringColor};"><span class="tjw-result-score">${scorePercent}%</span></div>
            <h2 class="tjw-result-headline">${t(headlineKey)}</h2>
            <p class="tjw-result-sub">${correctCount} / ${totalQuestions} ${t('tjw_correct_answers_unit')}</p>
            ${masteredNoteHTML}
            ${stageNoteHTML}
            ${badgesHTML}
            <div class="tjw-result-actions">
                ${journeyHTML}
                <button class="tjw-outline-btn" data-action="retry-activity">🔁 ${t('tjw_retry_activity_btn')}</button>
                <button class="tjw-cta-btn" data-action="back-to-map">🏠 ${t('tjw_back_to_map_btn')}</button>
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
                ${passed ? '' : `<button class="tjw-cta-btn" data-action="go-practice">🎯 ${t('tjw_exam_go_practice')}</button>`}
                <button class="${passed ? 'tjw-cta-btn' : 'tjw-outline-btn'}" data-action="back-to-map">🏠 ${t('tjw_back_to_map_btn')}</button>
            </div>
        </div>`;
}
