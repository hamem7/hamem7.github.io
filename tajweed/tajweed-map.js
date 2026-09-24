// tajweed/tajweed-map.js
//
// 🌟 [مُحدَّث — المراحل 1+2+3+5] منطق شاشات "أبطال التجويد". كان هذا الملف "تصفّح فقط"
// (المرحلة 1)، وأصبح الآن يعرض خريطة تقدّم حقيقية بقفل/فتح المراحل (§3)، شارات إتقان لكل
// حكم (§4)، بوّابة مراجعة مستحقة (§5)، أزرار فتح أنشطة تفاعلية مُقيَّمة (§6، عبر
// tajweed/tajweed-activity.js)، ولوحة "أبطال التجويد" غير المؤذية (§9). راجع
// "التصور-المعماري-الكامل-لمسار-التجويد.md" للتصميم الكامل. نفس بنية similarities.js بالضبط:
// حاوية واحدة (#tjw-container) يُعاد رسم محتواها بالكامل حسب "الحالة" الحالية.
import { AppState, loadSplashScreen, openTajweedActivityScreen, t } from '../core/app.js';
import { buildAyahAudioUrl } from '../database/kidsAudioDB.js';
import { TAJWEED_STAGES, getTajweedStage, getTajweedRule } from '../engine/tajweedRulesCatalog.js';
import { computeAllStageProgress, isStageUnlocked, ruleOverallPercent, TAJWEED_BADGE_CATALOG } from '../engine/tajweedEngine.js';
import { getAyahForExample, highlightForTajweed } from './tajweed-shared.js';
// 🌟 [جديد] بطاقة "الترحيب بالطالب" المشتركة — نفس المكوّن المستخدَم فعلياً في شاشة تسجيل
// الدخول الأساسية (شاشة التقييم) بعد اختيار اسم الطالب مباشرة، راجع student/student.js
// (setupLoginListeners) للاستخدام الأصلي. نستوردها هنا لعرضها بنفس الطريقة تماماً بعد اختيار
// الطالب في شاشة "أبطال التجويد" (renderPickStudentHTML/submitPickedStudent أسفل هذا الملف)
import { showStudentWelcome } from '../components/welcomeBanner.js';

// 🌟 مكدّس تنقل بسيط بين حالات العرض داخل #tjw-container فقط (بلا أي علاقة بـ
// loadScreen/navigation.js الخاص بالمنصة ككل) — بنفس فلسفة navStack في similarities.js
let navStack = [];
let currentView = { view: 'pickStudent', params: null };

// 🌟 [جديد — المرحلة 4] بوّابة المراجعة تُحسَب مرة واحدة عند دخول شاشة التصفّح وتُخزَّن هنا —
// تُعاد قراءتها من IndexedDB في كل مرة تُعاد فيها شاشة التصفّح (بعد العودة من نشاط مثلاً)
let dueRuleIdsCache = [];

export function initTajweedMap() {
    const exitBtn = document.getElementById('tjw-btn-exit');
    if (exitBtn) exitBtn.addEventListener('click', loadSplashScreen);

    const levelBackBtn = document.getElementById('tjw-btn-level-back');
    if (levelBackBtn) levelBackBtn.addEventListener('click', goBackLevel);

    const container = document.getElementById('tjw-container');
    if (container) container.addEventListener('click', handleContainerClick);

    // 🌟 [قرار مُعتمَد — القسم 17 نقطة 3 من المستند المعماري]: الدخول لقسم "أبطال التجويد"
    // يبدأ دائماً باختيار اسم الطالب من جديد، بلا اعتماد صامت على AppState.currentStudent
    navStack = [];
    currentView = { view: 'pickStudent', params: null };
    render();
}

function pushView(view, params) {
    navStack.push(currentView);
    currentView = { view, params };
    render();
}

function goBackLevel() {
    if (navStack.length === 0) return;
    currentView = navStack.pop();
    render();
}

async function render() {
    const container = document.getElementById('tjw-container');
    const backBtn = document.getElementById('tjw-btn-level-back');
    if (backBtn) backBtn.style.display = navStack.length > 0 ? '' : 'none';
    if (!container) return;

    container.innerHTML = `<div class="tjw-loading">${t('sim_loading')}</div>`;

    let html = '';
    if (currentView.view === 'pickStudent') html = await renderPickStudentHTML();
    else if (currentView.view === 'browse') html = await renderBrowseHTML();
    else if (currentView.view === 'ruleDetail') html = await renderRuleDetailHTML(currentView.params);
    else if (currentView.view === 'leaderboard') html = await renderLeaderboardHTML();

    container.innerHTML = html;

    // 🌟 [جديد] بعد حقن شاشة اختيار الطالب (حقل بحث + قائمة منسدلة)، نملأ الـ datalist ونربط
    // أحداث حقل البحث — بنفس أسلوب populateStudentsDropdown/setupLoginListeners في
    // student/student.js بالضبط، لكن بمعرّفات tjw- منعزلة تماماً حتى لا تتعارض مع قائمة شاشة
    // تسجيل الدخول الأساسية إن كانت مفتوحة في تبويب آخر
    if (currentView.view === 'pickStudent') await setupPickStudentScreen();
}

async function handleContainerClick(e) {
    // 🌟 زر "🔊 استمع" له منطق تشغيل مباشر (وليس تنقّلاً بين شاشات) — يُعالَج أولاً
    const audioBtn = e.target.closest('[data-tjw-audio]');
    if (audioBtn) {
        playRuleAudio(audioBtn);
        return;
    }

    // 🌟 تبديل عرض "ماذا لاحظت؟ → شاهدت، ماذا يعني؟" داخل بطاقة التفصيل نفسها
    const noticeBtn = e.target.closest('[data-tjw-reveal]');
    if (noticeBtn) {
        const card = noticeBtn.closest('.tjw-rule-card');
        if (card) card.classList.add('tjw-revealed');
        return;
    }

    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'pick-student') {
        const studentId = btn.dataset.id;
        const students = await AppState.studentManager.getAllStudents();
        // 🌟 [افتراض صريح]: معرّف الطالب قد يكون رقمياً — نقارن كنص للتوافق مع أي شكل تخزين
        const student = students.find(s => String(s.id) === String(studentId));
        if (!student) return;
        AppState.currentStudent = student;
        navStack = [];
        currentView = { view: 'browse', params: null };
        render();
    } else if (action === 'change-student') {
        navStack = [];
        currentView = { view: 'pickStudent', params: null };
        render();
    } else if (action === 'pick-student-submit') {
        // 🌟 [جديد] زر "ابدأ الرحلة" في شاشة اختيار الطالب (حقل بحث + قائمة منسدلة) —
        // راجع submitPickedStudent أسفل هذا الملف
        submitPickedStudent();
    } else if (action === 'open-rule') {
        const stageId = btn.dataset.stage, ruleId = btn.dataset.rule;
        // 🌟 [المرحلة 4 — بوّابة المراجعة] لو فيه مراجعة مستحقة ولسه ما اتعملتش هذه الجلسة،
        // نمنع فتح حكم "لم يبدأه الطالب بعد" (available) — الأحكام الجارية يظل بإمكانه إكمالها
        const mastery = await AppState.tajweedManager.getMasteryRecord(AppState.currentStudent.id, ruleId);
        // 🌟 [ملاحظة دقيقة]: "بدأه الطالب" يُحدَّد بعدد المحاولات (attemptsCount) وليس status
        // فقط، لأن محاولة أولى بنتيجة صفر بالمئة قد تُبقي status على 'available' (لا تقدّم
        // فعلي في أي بُعد بعد) رغم وجود محاولة حقيقية — راجع computeMasteryStatus في
        // engine/tajweedEngine.js
        const isBrandNew = !mastery || (mastery.attemptsCount || 0) === 0;
        if (isBrandNew && dueRuleIdsCache.length > 0) {
            alert(t('tjw_review_gate_alert'));
            return;
        }
        pushView('ruleDetail', { stageId, ruleId });
    } else if (action === 'open-leaderboard') {
        pushView('leaderboard', null);
    } else if (action === 'start-review') {
        startActivity('review', { stageId: null, ruleId: null, dueRuleIds: dueRuleIdsCache });
    } else if (action === 'start-practice') {
        startActivity('practice', { stageId: btn.dataset.stage, ruleId: btn.dataset.rule });
    } else if (action === 'start-link') {
        startActivity('link', { stageId: btn.dataset.stage, ruleId: null });
    } else if (action === 'start-challenge') {
        startActivity('challenge', { stageId: btn.dataset.stage, ruleId: null });
    }
}

function startActivity(mode, { stageId, ruleId, dueRuleIds }) {
    openTajweedActivityScreen({
        mode,
        stageId,
        ruleId,
        dueRuleIds: dueRuleIds || [],
        studentId: AppState.currentStudent.id
    });
}

function playRuleAudio(btn) {
    const url = btn.dataset.tjwAudio;
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(() => { /* تجاهل بصمت — غالباً انقطاع إنترنت مؤقت */ });
}

// ============================================================
// شاشة اختيار الطالب
// ============================================================
// 🌟 [عدّل بالكامل] استبدلنا شبكة أزرار الطلاب القديمة (تصلح لعدد قليل جداً من الطلاب فقط
// وتُظهر كل اسم داخل مربع منفصل) بحقل بحث + قائمة منسدلة (datalist) + زر واحد، بنفس نمط
// شاشة "تسجيل الدخول" الأساسية بالضبط في student/login.html (راجع populateStudentsDropdown/
// setupLoginListeners في student/student.js) — بطلب صريح من المعلم ليكون اختيار الطالب هنا
// مطابقاً لباقي أقسام المنصة. القائمة تُملأ فعلياً من setupPickStudentScreen أسفل هذا الملف
// (بعد حقن هذا الـ HTML في الحاوية مباشرة، نفس ترتيب loadLoginScreen)، وليس هنا، تفادياً لأي
// مشكلة تهريب HTML من اسم طالب يحتوي على علامات اقتباس (نفس أسلوب DOM API الآمن المستخدَم في
// populateStudentsDropdown الأصلية بدل بناء نص <option> يدوياً) 🌟
async function renderPickStudentHTML() {
    const students = (await AppState.studentManager.getAllStudents()).filter(s => !s.isHidden);

    if (students.length === 0) {
        return `
            <div class="tjw-empty-state">
                <div class="tjw-empty-icon">🌟</div>
                <p>${t('tjw_no_students')}</p>
            </div>`;
    }

    return `
        <div class="tjw-pick-student">
            <div class="tjw-pick-card">
                <label class="tjw-pick-label" for="tjw-student-search-input">${t('tjw_pick_label')}</label>
                <input type="text" id="tjw-student-search-input" autocomplete="off"
                       class="tjw-pick-input" placeholder="${t('search_student_ph')}">
                <datalist id="tjw-student-datalist"></datalist>
                <button type="button" class="tjw-pick-submit-btn" data-action="pick-student-submit">${t('tjw_start_journey_btn')}</button>
            </div>
            <button class="tjw-link-btn tjw-leaderboard-entry" data-action="open-leaderboard">🏆 ${t('tjw_leaderboard_title')}</button>
        </div>`;
}

// 🌟 [جديد] يملأ الـ datalist ويربط أحداث حقل البحث — يُستدعى من render() فور حقن شاشة
// الاختيار في الحاوية (لأن العناصر يجب أن تكون في الـ DOM فعلاً قبل ربط أي مستمع عليها).
// نفس منطق إظهار/إخفاء القائمة المنسدلة حسب وجود نص في الحقل (لا تظهر إلا بعد كتابة حرف واحد
// على الأقل) من setupLoginListeners في student/student.js بالضبط، لكن بمعرّفات tjw- منعزلة
async function setupPickStudentScreen() {
    const input = document.getElementById('tjw-student-search-input');
    const dataList = document.getElementById('tjw-student-datalist');
    if (!input || !dataList) return; // لا يوجد طلاب — شاشة الحالة الفارغة معروضة بدلاً من هذا

    const students = (await AppState.studentManager.getAllStudents()).filter(s => !s.isHidden);
    dataList.innerHTML = '';
    students.forEach(s => {
        const option = document.createElement('option');
        option.value = s.name;
        dataList.appendChild(option);
    });

    input.removeAttribute('list');
    input.addEventListener('input', function () {
        if (this.value.trim().length > 0) {
            this.setAttribute('list', 'tjw-student-datalist');
        } else {
            this.removeAttribute('list');
        }
    });
    input.addEventListener('focus', function () {
        if (this.value.trim().length === 0) {
            this.removeAttribute('list');
        }
    });
    // 🌟 [جديد] زر Enter من لوحة المفاتيح يبدأ الرحلة مباشرة، بلا حاجة للوصول بالفأرة لزر
    // "ابدأ الرحلة" — تسهيلاً على المعلم الذي اعتاد نفس السلوك في شاشة تسجيل الدخول
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitPickedStudent();
        }
    });
}

// 🌟 [جديد] يتحقق من الاسم المكتوب/المختار في حقل البحث، ثم يبدأ رحلة الطالب — بنفس تسلسل
// معالج زر "دخول سريع للتقييم" في setupLoginListeners (student/student.js) بالضبط: تحقّق من
// وجود نص، بحث عن الطالب بالاسم الحرفي الكامل، ثم AppState.currentStudent + بطاقة الترحيب
// المشتركة showStudentWelcome قبل الانتقال مباشرة (بلا await عليها عمداً — نفس فلسفة عدم
// حجب الانتقال الموثَّقة في التعليق الأصلي بجانب استدعائها في student/student.js)
async function submitPickedStudent() {
    const input = document.getElementById('tjw-student-search-input');
    const typedName = input ? input.value.trim() : '';
    if (!typedName) {
        alert(t('tjw_pick_name_required_alert'));
        return;
    }

    const students = await AppState.studentManager.getAllStudents();
    const student = students.find(s => s.name === typedName);
    if (!student) {
        alert(t('login_name_not_found_alert'));
        return;
    }

    AppState.currentStudent = student;
    // 🌟 [افتراض صريح]: قسم "أبطال التجويد" يُفعِّل دائماً ثيم الكبار (switchTheme('adult') في
    // openTajweedSection بـ core/app.js) بصرف النظر عن AppState.isKidsMode القادم من تنقّل
    // سابق، فمرّرنا kids:false صراحة هنا حتى تطابق بطاقة الترحيب نفس مظهر الشاشة الفعلي أمام
    // المعلم بدل الاعتماد على قيمة isKidsMode القديمة المحتمَلة من قسم آخر
    showStudentWelcome(student, { kids: false });

    navStack = [];
    currentView = { view: 'browse', params: null };
    render();
}

// ============================================================
// شاشة خريطة التقدّم: المراحل والأحكام (§3) + بوّابة المراجعة (§5)
// ============================================================
async function renderBrowseHTML() {
    const student = AppState.currentStudent;
    const allMastery = await AppState.tajweedManager.getMasteryByStudent(student.id);
    const masteryByRule = {};
    allMastery.forEach(m => { masteryByRule[m.ruleId] = m; });
    const stageProgress = computeAllStageProgress(allMastery);

    // 🌟 المراجعة المستحقة تُحسَب فقط من الأحكام التي بدأها الطالب فعلاً (بعدد محاولات ≥ 1،
    // راجع الملاحظة أعلاه في handleContainerClick حول سبب استخدام attemptsCount بدل status)
    const startedRuleIds = allMastery.filter(m => (m.attemptsCount || 0) > 0).map(m => m.ruleId);
    dueRuleIdsCache = startedRuleIds.length > 0
        ? await AppState.reviewScheduleManager.getDueRuleIds(student.id, startedRuleIds)
        : [];

    const reviewBannerHTML = dueRuleIdsCache.length > 0 ? `
        <div class="tjw-review-banner">
            <span>🔔 ${t('tjw_review_due_banner').replace('{n}', dueRuleIdsCache.length)}</span>
            <button class="tjw-pill-btn" data-action="start-review">${t('tjw_start_review_btn')}</button>
        </div>` : '';

    const stagesHTML = TAJWEED_STAGES.map(stage => {
        const unlocked = isStageUnlocked(stage.id, stageProgress);
        const progress = stageProgress[stage.id] || { status: 'locked', percentComplete: 0 };

        if (!unlocked) {
            return `
                <section class="tjw-stage-section tjw-stage-locked" style="--tjw-stage-color: var(${stage.colorVar});">
                    <h2 class="tjw-stage-title">
                        <span class="tjw-stage-icon">🔒</span>
                        <span>${t(stage.nameKey)}</span>
                    </h2>
                    <p class="tjw-stage-locked-note">${t('tjw_stage_locked_note')}</p>
                </section>`;
        }

        const tilesHTML = stage.rules.map(rule => {
            const mastery = masteryByRule[rule.id];
            const pct = mastery ? ruleOverallPercent(mastery.dimensions) : 0;
            const status = mastery ? mastery.status : 'available';
            const statusIcon = { available: '', in_progress: '⏳', mastered: '✅', needs_review: '🔁' }[status] || '';
            const isDue = dueRuleIdsCache.includes(rule.id);
            return `
            <button class="tjw-rule-tile ${isDue ? 'tjw-rule-tile-due' : ''}" data-action="open-rule" data-stage="${stage.id}" data-rule="${rule.id}" style="--tjw-tile-color: var(${stage.colorVar});">
                <span class="tjw-rule-tile-status">${statusIcon}</span>
                <span class="tjw-rule-tile-letters">${rule.letters.split(' ')[0]}</span>
                <span class="tjw-rule-tile-name">${t(rule.nameKey)}</span>
                <span class="tjw-rule-tile-bar"><span class="tjw-rule-tile-bar-fill" style="width:${pct}%;"></span></span>
            </button>`;
        }).join('');

        const canChallenge = stage.rules.some(r => masteryByRule[r.id] && (masteryByRule[r.id].attemptsCount || 0) > 0);

        return `
            <section class="tjw-stage-section" style="--tjw-stage-color: var(${stage.colorVar});">
                <h2 class="tjw-stage-title">
                    <span class="tjw-stage-icon">${stage.icon}</span>
                    <span>${t(stage.nameKey)}</span>
                    <span class="tjw-stage-percent">${progress.percentComplete}%</span>
                </h2>
                <div class="tjw-stage-progress-track"><div class="tjw-stage-progress-fill" style="width:${progress.percentComplete}%; background: var(${stage.colorVar});"></div></div>
                <div class="tjw-rule-tiles">${tilesHTML}</div>
                <div class="tjw-stage-actions">
                    <button class="tjw-outline-btn" data-action="start-link" data-stage="${stage.id}">🔗 ${t('tjw_link_activity_btn')}</button>
                    <button class="tjw-outline-btn" data-action="start-challenge" data-stage="${stage.id}" ${canChallenge ? '' : 'disabled'}>🏆 ${t('tjw_challenge_btn')}</button>
                </div>
            </section>`;
    }).join('');

    return `
        <div class="tjw-browse">
            <div class="tjw-browse-header">
                <span>${t('tjw_browsing_intro').replace('{name}', student ? student.name : '')}</span>
                <div class="tjw-browse-header-actions">
                    <button class="tjw-link-btn" data-action="open-leaderboard">🏆 ${t('tjw_leaderboard_title')}</button>
                    <button class="tjw-link-btn" data-action="change-student">${t('tjw_change_student')}</button>
                </div>
            </div>
            ${reviewBannerHTML}
            ${stagesHTML}
        </div>`;
}

// ============================================================
// بطاقة تفصيل الحكم — الآن مع زر "ابدأ التدرّب" الفعلي (المرحلة 2)
// ============================================================
async function renderRuleDetailHTML({ stageId, ruleId }) {
    const stage = getTajweedStage(stageId);
    const rule = getTajweedRule(stageId, ruleId);
    if (!stage || !rule) return `<div class="tjw-empty-state">${t('tjw_rule_not_found')}</div>`;

    const ayahInfo = await getAyahForExample(rule.example.surah, rule.example.ayah);
    const ayahHTML = ayahInfo
        ? highlightForTajweed(ayahInfo.text, rule.example.highlight)
        : t('tjw_example_unavailable');
    const audioBtnHTML = ayahInfo
        ? `<button class="tjw-listen-btn" data-tjw-audio="${buildAyahAudioUrl(ayahInfo.number)}">🔊 ${t('tjw_listen_btn')}</button>`
        : '';
    const surahRefHTML = ayahInfo
        ? `<div class="tjw-example-ref">${ayahInfo.surahName} — ${t('tjw_ayah_word')} ${rule.example.ayah}</div>`
        : '';

    const mastery = AppState.currentStudent
        ? await AppState.tajweedManager.getMasteryRecord(AppState.currentStudent.id, ruleId)
        : null;
    const pct = mastery ? ruleOverallPercent(mastery.dimensions) : 0;
    const statusLabel = mastery && mastery.status === 'mastered' ? t('tjw_status_mastered')
        : mastery && mastery.status === 'needs_review' ? t('tjw_status_needs_review')
        : mastery && mastery.status === 'in_progress' ? t('tjw_status_in_progress')
        : t('tjw_status_available');

    return `
        <div class="tjw-rule-card" style="--tjw-card-color: var(${stage.colorVar});">
            <div class="tjw-rule-card-frame" aria-hidden="true"></div>
            <div class="tjw-rule-card-eyebrow">${t(stage.nameKey)}</div>

            <div class="tjw-rule-symbol">${renderRuleSymbol(stage, rule)}</div>

            <h2 class="tjw-rule-card-name">${t(rule.nameKey)}</h2>
            <p class="tjw-rule-card-def">${t(rule.defKey)}</p>
            <div class="tjw-rule-letters">
                <span class="tjw-rule-letters-label">${t('tjw_letters_label')}</span>
                <span class="tjw-rule-letters-value">${rule.letters}</span>
            </div>

            <div class="tjw-example-box">
                <div class="tjw-example-text">${ayahHTML}</div>
                ${surahRefHTML}
                <div class="tjw-example-note">${t('tjw_example_source_note')}</div>
                ${audioBtnHTML}
            </div>

            <div class="tjw-notice-box">
                <div class="tjw-notice-question">${t(rule.noticeKey)}</div>
                <button class="tjw-pill-btn" data-tjw-reveal="1">${t('tjw_reveal_btn')}</button>
                <div class="tjw-notice-answer">${t(rule.defKey)}</div>
            </div>

            <div class="tjw-mastery-box">
                <div class="tjw-mastery-row">
                    <span>${statusLabel}</span>
                    <span>${pct}%</span>
                </div>
                <div class="tjw-stage-progress-track"><div class="tjw-stage-progress-fill" style="width:${pct}%; background: var(${stage.colorVar});"></div></div>
                <button class="tjw-cta-btn" data-action="start-practice" data-stage="${stageId}" data-rule="${ruleId}">🎯 ${t('tjw_start_practice_btn')}</button>
            </div>
        </div>`;
}

// 🌟 رمز البطاقة المرئي — بلا تغيير عن المرحلة 1
function renderRuleSymbol(stage, rule) {
    if (stage.id === 'qalqalah') {
        return `
            <svg width="120" height="120" viewBox="0 0 140 140" aria-hidden="true">
                <circle cx="70" cy="70" r="14" fill="var(${stage.colorVar})"></circle>
                <circle cx="70" cy="70" r="34" fill="none" stroke="var(${stage.colorVar})" stroke-width="4" opacity="0.55"></circle>
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(${stage.colorVar})" stroke-width="3" opacity="0.3"></circle>
                <circle cx="70" cy="70" r="66" fill="none" stroke="var(${stage.colorVar})" stroke-width="2" opacity="0.15"></circle>
            </svg>`;
    }
    return `
        <div class="tjw-letter-badge" style="border-color: var(${stage.colorVar}); color: var(${stage.colorVar});">
            ${rule.letters.split(' ')[0]}
        </div>`;
}

// ============================================================
// لوحة "أبطال التجويد" (§9) — فئات متعددة غير مؤذية، بلا ترتيب تراكمي كلي أبداً
// ============================================================
async function renderLeaderboardHTML() {
    const allStudents = (await AppState.studentManager.getAllStudents()).filter(s => !s.isHidden);
    const [allSessions, allAchievements] = await Promise.all([
        Promise.all(allStudents.map(s => AppState.tajweedManager.getSessionsByStudent(s.id))),
        Promise.all(allStudents.map(s => AppState.tajweedManager.getAchievementsByStudent(s.id)))
    ]);

    // 🥇 الأكثر تقدّماً هذا الأسبوع — عدد الجلسات المسجَّلة آخر 7 أيام لكل طالب
    const weekAgo = Date.now() - 7 * 86400000;
    const progressThisWeek = allStudents.map((s, i) => {
        const sessions = allSessions[i] || [];
        const count = sessions.filter(sess => new Date(sess.timestamp).getTime() >= weekAgo).length;
        return { student: s, count };
    }).filter(x => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);

    // 🔥 أطول سلسلة مراجعة — أكبر عدد أيام تقويمية متتالية فيها جلسة نشاط واحدة على الأقل
    const streaks = allStudents.map((s, i) => {
        const sessions = allSessions[i] || [];
        const days = [...new Set(sessions.map(sess => new Date(sess.timestamp).toISOString().slice(0, 10)))].sort();
        let best = 0, current = 0, prevDay = null;
        days.forEach(d => {
            if (prevDay) {
                const diff = (new Date(d) - new Date(prevDay)) / 86400000;
                current = diff === 1 ? current + 1 : 1;
            } else {
                current = 1;
            }
            best = Math.max(best, current);
            prevDay = d;
        });
        return { student: s, streak: best };
    }).filter(x => x.streak > 1).sort((a, b) => b.streak - a.streak).slice(0, 5);

    // 🏅 آخر من حصل على وسام جديد
    const latestBadges = allStudents.map((s, i) => {
        const ach = allAchievements[i] || [];
        if (ach.length === 0) return null;
        const latest = ach.reduce((a, b) => new Date(a.earnedAt) > new Date(b.earnedAt) ? a : b);
        return { student: s, achievement: latest };
    }).filter(Boolean).sort((a, b) => new Date(b.achievement.earnedAt) - new Date(a.achievement.earnedAt)).slice(0, 5);

    const buildList = (items, renderRow, emptyKey) => items.length === 0
        ? `<p class="tjw-leaderboard-empty">${t(emptyKey)}</p>`
        : `<ol class="tjw-leaderboard-list">${items.map(renderRow).join('')}</ol>`;

    return `
        <div class="tjw-leaderboard">
            <h2 class="tjw-leaderboard-heading">🏆 ${t('tjw_leaderboard_title')}</h2>

            <section class="tjw-leaderboard-section">
                <h3>📈 ${t('tjw_lb_progress_week')}</h3>
                ${buildList(progressThisWeek, x => `<li><span>${x.student.name}</span><span>${x.count} ${t('tjw_lb_sessions_unit')}</span></li>`, 'tjw_lb_empty')}
            </section>

            <section class="tjw-leaderboard-section">
                <h3>🔥 ${t('tjw_lb_review_streak')}</h3>
                ${buildList(streaks, x => `<li><span>${x.student.name}</span><span>${x.streak} ${t('tjw_lb_days_unit')}</span></li>`, 'tjw_lb_empty')}
            </section>

            <section class="tjw-leaderboard-section">
                <h3>🏅 ${t('tjw_lb_latest_badge')}</h3>
                ${buildList(latestBadges, x => {
                    const def = TAJWEED_BADGE_CATALOG[x.achievement.badgeKey];
                    const label = def ? `${def.icon} ${t(def.nameKey)}` : x.achievement.badgeKey;
                    return `<li><span>${x.student.name}</span><span>${label}</span></li>`;
                }, 'tjw_lb_empty')}
            </section>
        </div>`;
}
