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
    evaluateSessionAchievements, TAJWEED_BADGE_CATALOG, isStageUnlocked
} from '../engine/tajweedEngine.js';
import { getAyahForExample, syncStudentTajweedProgress } from './tajweed-shared.js';
import { buildAyahAudioUrl } from '../database/kidsAudioDB.js';

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

export async function initTajweedActivity() {
    params = AppState.tajweedActivityParams;
    AppState.tajweedActivityParams = null;

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

    if (params.mode === 'practice') {
        const rule = getTajweedRule(params.stageId, params.ruleId);
        if (!rule) return;
        const [exAyah, practiceAyah] = await Promise.all([
            getAyahForExample(rule.example.surah, rule.example.ayah),
            getAyahForExample(rule.practiceExample.surah, rule.practiceExample.ayah)
        ]);
        questions = [
            generateChooseRuleQuestion(rule),
            generateDiscoverQuestion(rule, exAyah),
            generateApplyQuestion(rule, practiceAyah)
        ].filter(Boolean);
    } else if (params.mode === 'link') {
        const q = generateLinkQuestion(params.stageId);
        questions = q ? [q] : [];
    } else if (params.mode === 'challenge') {
        const stage = getTajweedStage(params.stageId);
        if (!stage) return;
        const ayahInfoByRuleId = {};
        for (const rule of stage.rules) {
            ayahInfoByRuleId[rule.id] = await getAyahForExample(rule.example.surah, rule.example.ayah);
        }
        questions = buildStageChallengeQuestions(params.stageId, ayahInfoByRuleId);
    } else if (params.mode === 'review') {
        const dueRules = (params.dueRuleIds || [])
            .map(rid => getAllRulesFlat().find(x => x.rule.id === rid))
            .filter(Boolean)
            .map(x => x.rule);
        const ayahInfoByRuleId = {};
        for (const rule of dueRules) {
            ayahInfoByRuleId[rule.id] = await getAyahForExample(rule.example.surah, rule.example.ayah);
        }
        questions = buildReviewQuestions(dueRules, ayahInfoByRuleId);
    }
}

function renderProgress() {
    const el = document.getElementById('tjwa-progress');
    if (!el) return;
    if (questions.length === 0) { el.textContent = ''; return; }
    el.textContent = `${t('tjw_question_label')} ${Math.min(qIndex + 1, questions.length)} / ${questions.length}`;
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
    else if (q.type === 'link_rule_letters') container.innerHTML = renderLinkHTML(q);
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
                <div class="tjw-example-text">${q.ayahText}</div>
                <div class="tjw-example-ref">${q.surahName || ''}</div>
                ${audioBtnHTML}
            </div>
            <div class="tjw-answer-grid">${optionsHTML}</div>
        </div>`;
}

function renderLinkHTML(q) {
    const namesHTML = q.namesCol.map(item => `
        <button class="tjw-answer-btn tjw-link-item ${linkMatchedRuleIds.has(item.ruleId) ? 'tjw-link-matched' : ''}"
            data-link-name="${item.ruleId}" ${linkMatchedRuleIds.has(item.ruleId) ? 'disabled' : ''}>${t(item.nameKey)}</button>
    `).join('');
    const lettersHTML = q.lettersCol.map(item => `
        <button class="tjw-answer-btn tjw-link-item ${linkMatchedRuleIds.has(item.ruleId) ? 'tjw-link-matched' : ''}"
            data-link-letter="${item.ruleId}" ${linkMatchedRuleIds.has(item.ruleId) ? 'disabled' : ''}>${item.letters}</button>
    `).join('');
    return `
        <div class="tjw-activity-card">
            <p class="tjw-activity-prompt">${t('tjw_act_link_prompt')}</p>
            <div class="tjw-link-columns">
                <div class="tjw-link-col">${namesHTML}</div>
                <div class="tjw-link-col">${lettersHTML}</div>
            </div>
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

    const nextRuleBtn = e.target.closest('[data-action="go-next-rule"]');
    if (nextRuleBtn) {
        params = { mode: 'practice', stageId: nextRuleBtn.dataset.stage, ruleId: nextRuleBtn.dataset.rule, studentId: AppState.currentStudent.id };
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

    if (answerLocked) return;

    const chooseBtn = e.target.closest('[data-choose-rule]');
    if (chooseBtn) {
        const q = questions[qIndex];
        const isCorrect = chooseBtn.dataset.chooseRule === q.correctRuleId;
        answerLocked = true;
        markChoiceButtons('[data-choose-rule]', 'data-choose-rule', q.correctRuleId, chooseBtn);
        await recordQuestionResult(q.ruleId, isCorrect);
        showNextButton();
        return;
    }

    const discoverBtn = e.target.closest('[data-discover-option]');
    if (discoverBtn) {
        const q = questions[qIndex];
        const isCorrect = Number(discoverBtn.dataset.discoverOption) === q.correctIndex;
        answerLocked = true;
        markChoiceButtons('[data-discover-option]', 'data-discover-option', String(q.correctIndex), discoverBtn);
        await recordQuestionResult(q.ruleId, isCorrect);
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
        const stageRuleIds = getStageRuleIds(params.stageId);
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

// ============================================================
// تسجيل نتيجة سؤال فردي واحد فور الإجابة عليه: يحدّث الإتقان (عبر updateRuleMastery أعلاه)
// ويضيف السؤال لقائمة نتائج الجلسة (المستخدَمة لحساب الدرجة الكلية في شاشة النتيجة)
// ============================================================
async function recordQuestionResult(ruleId, isCorrect) {
    if (!ruleId) return;
    let effectiveActivityType;
    if (params.mode === 'practice') effectiveActivityType = questions[qIndex].type;
    else if (params.mode === 'challenge') effectiveActivityType = 'stage_challenge';
    else if (params.mode === 'review') effectiveActivityType = 'review';
    const scorePercent = isCorrect ? 100 : 0;

    await updateRuleMastery(ruleId, effectiveActivityType, scorePercent);
    questionResults.push({ ruleId, correct: isCorrect });
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
        }
    } else {
        for (const ruleId of touchedRuleIds) {
            await AppState.reviewScheduleManager.recordRuleReviewResult(studentId, ruleId, scorePercent);
        }
    }

    // 🌟 حفظ سجل الجلسة (tajweed_sessions) — activityType هنا هو "وضع" النشاط ككل (mode)،
    // بخلاف effectiveActivityType الداخلي المستخدَم لتحديث كل بُعد على حدة أعلاه
    await AppState.tajweedManager.addSession({
        studentId,
        stageId: params.stageId || null,
        ruleId: params.ruleId || null,
        activityType: params.mode,
        totalQuestions,
        correctCount,
        scorePercent
    });

    const allMasteryAfter = await AppState.tajweedManager.getMasteryByStudent(studentId);
    const stageProgressAfter = computeAllStageProgress(allMasteryAfter);

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

    renderResultScreen({ scorePercent, correctCount, totalQuestions, earnedBadges, justMasteredRuleId, justCompletedStageId, stageProgressAfter });
}

function renderResultScreen({ scorePercent, correctCount, totalQuestions, earnedBadges, justMasteredRuleId, justCompletedStageId, stageProgressAfter }) {
    const container = document.getElementById('tjwa-container');
    const progressEl = document.getElementById('tjwa-progress');
    if (progressEl) progressEl.textContent = '';

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

    // 🌟 [إصلاح] زر "الحكم التالي" لا يُعرَض أبداً لو الحكم التالي في مرحلة ما زالت مقفلة —
    // بلا هذا الفحص، إتمام آخر حكم في مرحلة (قبل إتقان بقية أحكامها) كان يسمح بالقفز مباشرة
    // لأول حكم في المرحلة التالية عبر هذا الزر تحديداً، متجاوزاً قفل المرحلة المعروض في
    // خريطة التقدّم (tajweed-map.js لا يعرض أصلاً أي بطاقة حكم لمرحلة مقفلة)
    let nextRuleBtnHTML = '';
    if (params.mode === 'practice') {
        const next = nextRuleAfter(params.stageId, params.ruleId);
        if (next && stageProgressAfter && isStageUnlocked(next.stageId, stageProgressAfter)) {
            nextRuleBtnHTML = `<button class="tjw-cta-btn" data-action="go-next-rule" data-stage="${next.stageId}" data-rule="${next.ruleId}">➡️ ${t('tjw_next_rule_btn')}</button>`;
        }
    }

    container.innerHTML = `
        <div class="tjw-result-card">
            <div class="tjw-result-score">${scorePercent}%</div>
            <p class="tjw-result-sub">${correctCount} / ${totalQuestions} ${t('tjw_correct_answers_unit')}</p>
            ${masteredNoteHTML}
            ${stageNoteHTML}
            ${badgesHTML}
            <div class="tjw-result-actions">
                <button class="tjw-outline-btn" data-action="retry-activity">🔁 ${t('tjw_retry_activity_btn')}</button>
                ${nextRuleBtnHTML}
                <button class="tjw-cta-btn" data-action="back-to-map">🏠 ${t('tjw_back_to_map_btn')}</button>
            </div>
        </div>`;
}

function nextRuleAfter(stageId, ruleId) {
    const flat = getAllRulesFlat();
    const idx = flat.findIndex(x => x.stageId === stageId && x.rule.id === ruleId);
    if (idx === -1 || idx + 1 >= flat.length) return null;
    return { stageId: flat[idx + 1].stageId, ruleId: flat[idx + 1].rule.id };
}
