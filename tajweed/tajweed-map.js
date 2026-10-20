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
import { TAJWEED_STAGES, getTajweedStage, getTajweedRule, getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import { computeAllStageProgress, isStageUnlocked, TAJWEED_BADGE_CATALOG } from '../engine/tajweedEngine.js';
import {
    ensureJourney, journeyStep, journeyPercent, applyLearned, statusFromJourney,
    EXAM_PASS_SCORE, EXAM_SIZE
} from '../engine/tajweedJourney.js';
import { renderStageTreeHTML, renderLetterCardsHTML } from './tajweed-letters-ui.js';
import { renderRuleIllustrationHTML } from './tajweed-illustrations.js';
import { renderBookStripHTML, makharijButtonHTML } from './tajweed-book-images.js';
import { entryState, resetEntryState, loadEntrySummaries, renderEntryHTML, getEntrySummaries } from './tajweed-entry.js';
import { openParentSummary } from './tajweed-summary.js';
import { hasStageTreeActivity, isLetterGameRule } from '../engine/tajweedLetterGames.js';
import { getAyahForExample, highlightForTajweed, pickStudentExamples, highlightWordsHTML, resetLegacyTajweedDataOnce, playTajweedAudio } from './tajweed-shared.js';
// 🌟 [جديد] بطاقة "الترحيب بالطالب" المشتركة — نفس المكوّن المستخدَم فعلياً في شاشة تسجيل
// الدخول الأساسية (شاشة التقييم) بعد اختيار اسم الطالب مباشرة، راجع student/student.js
// (setupLoginListeners) للاستخدام الأصلي. نستوردها هنا لعرضها بنفس الطريقة تماماً بعد اختيار
// الطالب في شاشة "أبطال التجويد" (enterStudent أسفل هذا الملف، بعد ضغط «أكمل» في شاشة الدخول الجديدة)
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
    if (container) container.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.closest && e.target.closest('tr[data-action="entry-row"]')) e.target.closest('tr').click(); });

    // 🌟 [قرار مُعتمَد — القسم 17 نقطة 3 من المستند المعماري]: الدخول لقسم "أبطال التجويد"
    // يبدأ دائماً باختيار اسم الطالب من جديد، بلا اعتماد صامت على AppState.currentStudent
    navStack = [];
    currentView = { view: 'pickStudent', params: null };
    resetEntryState();
    // 🌟 حذف بيانات التجويد القديمة مرة واحدة على الجهاز قبل أي عرض (النظام الجديد يحلّ محلها)
    resetLegacyTajweedDataOnce().catch(() => {}).then(() => render());
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
    // 🌟 عبارة «اختر اسم الطالب…» تخصّ شاشة الاختيار فقط — تُخفى بعد اختيار الطالب حتى لا تضلّل
    // 🌟 [جديد] شاشة الدخول لها ترويستها الخاصة (عنوان + مسار تنقّل + نبذة + زر الطالب/المعلم)، فيُخفى الشريط العلوي
    // وعبارة «اختر اسم الطالب» المكرَّران فيها؛ وعبارة الاختيار القديمة لا تُعرض في أي شاشة بعدها
    const subtitleEl = document.getElementById('tjw-subtitle');
    if (subtitleEl) subtitleEl.style.display = 'none';
    const topbarEl = document.querySelector('.tjw-topbar');
    if (topbarEl) topbarEl.style.display = currentView.view === 'pickStudent' ? 'none' : '';
    if (!container) return;

    container.innerHTML = `<div class="tjw-loading">${t('sim_loading')}</div>`;

    let html = '';
    if (currentView.view === 'pickStudent') {
        await loadEntrySummaries();
        html = renderEntryHTML();
    }
    else if (currentView.view === 'browse') html = await renderBrowseHTML();
    else if (currentView.view === 'ruleDetail') html = await renderRuleDetailHTML(currentView.params);
    else if (currentView.view === 'leaderboard') html = await renderLeaderboardHTML();

    container.innerHTML = html;

    if (currentView.view === 'pickStudent') bindEntryInputs();
}

// 🌟 إعادة رسم شاشة الدخول من البيانات المحمَّلة (بلا قراءة جديدة من قاعدة البيانات): اختيار طالب، تبديل الوضع، الترتيب...
function repaintEntry() {
    const container = document.getElementById('tjw-container');
    if (!container) return;
    container.innerHTML = renderEntryHTML();
    bindEntryInputs();
}

// حقل البحث (يظهر لمن لديهم أكثر من ثمانية طلاب): يصفّي البطاقات أثناء الكتابة ويحافظ على موضع المؤشر
function bindEntryInputs() {
    const input = document.getElementById('tjw-student-search-input');
    if (!input) return;
    input.addEventListener('input', () => {
        entryState.q = input.value;
        const pos = input.selectionStart;
        repaintEntry();
        const again = document.getElementById('tjw-student-search-input');
        if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (e) { /* نوع الحقل لا يدعم المؤشر */ } }
    });
}

// 🌟 دخول طالب من شاشة الدخول إلى رحلته. after: 'continue' يفتح حكمه الحالي، 'review' يبدأ مراجعته، وغير ذلك يعرض الخريطة.
// نمرّ بشاشة الخريطة أولاً (فتحسب المراجعات المستحقة ويُطبَّق قيد «لا حكم جديد قبل المراجعة») ثم نضغط الزر المقصود.
async function enterStudent(studentId, after) {
    const student = (await AppState.studentManager.getAllStudents()).find(s => String(s.id) === String(studentId));
    if (!student) return;
    AppState.currentStudent = student;
    // ثيم الكبار دائماً في هذا القسم (openTajweedSection)، فبطاقة الترحيب بلا kids (راجع التعليق الأصلي)
    showStudentWelcome(student, { kids: false });
    navStack = [];
    currentView = { view: 'browse', params: null };
    await render();
    const sel = after === 'continue' ? '.tjw-hero [data-action="open-rule"]' : after === 'review' ? '[data-action="start-review"]' : null;
    const btn = sel && document.querySelector(sel);
    if (btn) btn.click();
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

    // 🌟 [جديد] بطاقة حرف/زوج تنقلب عند الضغط (وجه الحرف ← كلمة قرآنية من المنصة)
    const flipBtn = e.target.closest('[data-tjw-flip]');
    if (flipBtn) {
        flipBtn.classList.toggle('is-flipped');
        return;
    }

    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action.startsWith('entry-')) {
        // 🌟 [جديد] أحداث شاشة الدخول
        if (action === 'entry-select') {
            const id = btn.dataset.id;
            const s = getEntrySummaries().find(x => String(x.studentId) === String(id));
            entryState.sel = s && entryState.sel !== s.studentId ? s.studentId : null;
            repaintEntry();
        } else if (action === 'entry-row') {
            const s = getEntrySummaries().find(x => String(x.studentId) === String(btn.dataset.id));
            if (s) { entryState.sel = s.studentId; entryState.mode = 'student'; repaintEntry(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        } else if (action === 'entry-mode') { entryState.mode = btn.dataset.mode; repaintEntry();
        } else if (action === 'entry-sort') { entryState.sort = btn.dataset.sort; repaintEntry();
        } else if (action === 'entry-all') { entryState.all = true; repaintEntry();
        } else if (action === 'entry-other') { entryState.sel = null; repaintEntry();
        } else if (action === 'entry-home') { loadSplashScreen();
        } else if (entryState.sel !== null) {
            if (action === 'entry-summary') openParentSummary({ studentId: entryState.sel, kind: 'session' });
            else if (action === 'entry-go') enterStudent(entryState.sel, 'continue');
            else if (action === 'entry-map') enterStudent(entryState.sel, 'map');
            else if (action === 'entry-review') enterStudent(entryState.sel, 'review');
        }
        return;
    }
    if (action === 'parent-summary') {
        // 🌟 [جديد] «ملخص جاهز للولي»: من بطاقة حكم (ملخص الحكم) أو من الخريطة (ملخص الحصة)
        if (AppState.currentStudent) openParentSummary({ studentId: AppState.currentStudent.id, ruleId: btn.dataset.rule || null, kind: btn.dataset.rule ? 'rule' : 'session' });
        return;
    }
    if (action === 'change-student') {
        // «طالب آخر» من الخريطة: نعود لشاشة الدخول دون تحديد مسبق
        navStack = [];
        currentView = { view: 'pickStudent', params: null };
        resetEntryState();
        entryState.initialized = true;
        render();
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
    } else if (action === 'mark-learned') {
        // 🌟 [رحلة الحكم] الخطوة ١: «فهمت» تسجّل أن الطالب تعلّم الحكم ثم ينتقل للتطبيق مباشرة
        const rec = await AppState.tajweedManager.getOrCreateMasteryRecord(AppState.currentStudent.id, btn.dataset.stage, btn.dataset.rule);
        const updated = applyLearned(rec);
        updated.status = statusFromJourney(updated, updated.status);
        await AppState.tajweedManager.saveMastery(updated);
        startActivity('practice', { stageId: btn.dataset.stage, ruleId: btn.dataset.rule });
    } else if (action === 'start-exam') {
        startActivity('exam', { stageId: btn.dataset.stage, ruleId: btn.dataset.rule });
    } else if (action === 'start-practice') {
        startActivity('practice', { stageId: btn.dataset.stage, ruleId: btn.dataset.rule });
    } else if (action === 'start-link') {
        startActivity('link', { stageId: btn.dataset.stage, ruleId: null });
    } else if (action === 'start-letters') {
        startActivity('letters', { stageId: btn.dataset.stage, ruleId: btn.dataset.rule });
    } else if (action === 'start-tree') {
        startActivity('tree', { stageId: btn.dataset.stage, ruleId: null });
    } else if (action === 'start-challenge') {
        startActivity('challenge', { stageId: btn.dataset.stage, ruleId: null });
    } else if (action === 'start-checkpoint') {
        // 🌟🌟 [جديد ٢٨ سبتمبر] "سمّع لي" — بوّابة تسميع المعلم المباشرة (البُعد السادس
        // pronounces). راجع "تعميق-مادة-وتقييم-أبطال-التجويد-المقترح.md" §2. [افتراض صريح]:
        // الزر متاح دائماً على بطاقة الحكم بلا شرط تقدّم أدنى — المعلم نفسه أقدر على تقدير
        // اللحظة المناسبة للتسميع من أي قفل آلي، بخلاف بوّابة المراجعة الآلية الأخرى بالأعلى
        startActivity('teacher_checkpoint', { stageId: btn.dataset.stage, ruleId: btn.dataset.rule });
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
    playTajweedAudio(url);
}

// ============================================================
// شاشة اختيار الطالب → صارت «شاشة الدخول» (tajweed/tajweed-entry.js)
// ============================================================
// 🌟 [استُبدلت بطلب المعلم] كانت حقل بحث + قائمة منسدلة (datalist) مطابقةً لشاشة تسجيل الدخول الأساسية، وصارت بطاقات طلاب
// مع «أكمل من حيث توقفتَ» ولمحة الرحلة ونظرة المعلم على الصف (راجع docs/TAJWEED_JOURNEY.md). الرسم والحالة في
// tajweed-entry.js، والتنقل (enterStudent) هنا. «طالب آخر» من الخريطة تعود إلى هذه الشاشة بلا تحديد مسبق.

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

    // 🌟 [إعادة تصميم] البطاقة الترحيبية: حلقة تقدّم كلية + زر «أكمل رحلتك» يفتح أول حكم غير متقن
    // في أول مرحلة مفتوحة (نفس منطق syncStudentTajweedProgress)، فلا يضيع الطالب بين المراحل
    const flat = getAllRulesFlat();
    const totalRules = flat.length;
    const masteredCount = flat.filter(({ rule }) => masteryByRule[rule.id] && masteryByRule[rule.id].status === 'mastered').length;
    const overallPct = totalRules
        ? Math.round(flat.reduce((sum, { rule }) => sum + (masteryByRule[rule.id] ? journeyPercent(masteryByRule[rule.id]) : 0), 0) / totalRules)
        : 0;
    let continueTarget = null;
    for (const { stageId, rule } of flat) {
        if (!isStageUnlocked(stageId, stageProgress)) continue;
        const m = masteryByRule[rule.id];
        if (!m || m.status !== 'mastered') { continueTarget = { stageId, ruleId: rule.id }; break; }
    }
    const continueBtnHTML = continueTarget
        ? `<div class="tjw-hero-cta"><button class="tjw-cta-btn" data-action="open-rule" data-stage="${continueTarget.stageId}" data-rule="${continueTarget.ruleId}">${t('tjw_continue_btn')}</button></div>`
        : '';

    const heroHTML = `
        <div class="tjw-hero">
            <div class="tjw-ring" style="--p:${overallPct};"><span class="tjw-ring-value">${overallPct}%</span></div>
            <div class="tjw-hero-text">
                <h2 class="tjw-hero-name">${escapeText(student ? student.name : '')}</h2>
                <p class="tjw-hero-sub">${t('tjw_hero_progress').replace('{done}', masteredCount).replace('{total}', totalRules)}</p>
                <div class="tjw-hero-actions">
                    <button class="tjw-link-btn" data-action="open-leaderboard">🏆 ${t('tjw_leaderboard_title')}</button>
                    ${makharijButtonHTML()}
                    <button class="tjw-link-btn" data-action="parent-summary">${t('tjw_sum_btn_session')}</button>
                    <button class="tjw-link-btn" data-action="change-student">${t('tjw_change_student')}</button>
                </div>
            </div>
            ${continueBtnHTML}
        </div>`;

    let activeMarked = false;
    const stagesHTML = TAJWEED_STAGES.map(stage => {
        const unlocked = isStageUnlocked(stage.id, stageProgress);
        const progress = stageProgress[stage.id] || { status: 'locked', percentComplete: 0 };

        if (!unlocked) {
            return `
                <section class="tjw-stage-section tjw-stage-locked" style="--tjw-stage-color: var(${stage.colorVar});">
                    <div class="tjw-stage-node is-locked">🔒</div>
                    <div class="tjw-stage-card">
                        <h2 class="tjw-stage-title"><span>${t(stage.nameKey)}</span></h2>
                        <p class="tjw-stage-locked-note">${t('tjw_stage_locked_note')}</p>
                    </div>
                </section>`;
        }

        const tilesHTML = stage.rules.map(rule => {
            const mastery = masteryByRule[rule.id];
            const pct = mastery ? journeyPercent(mastery) : 0;
            // 🌟 أيقونة الخطوة الحالية من رحلة الحكم (جديد، تعلّم، اجتاز التطبيق، اجتاز الاختبار، متقن)
            const stepIcon = { learn: '', practice: '📖', exam: '📝', awaiting_teacher: '🎤', mastered: '✅' }[journeyStep(ensureJourney(mastery))];
            const statusIcon = (mastery && mastery.status === 'needs_review') ? '🔁' : stepIcon;
            const isDue = dueRuleIdsCache.includes(rule.id);
            return `
            <button class="tjw-rule-tile ${isDue ? 'tjw-rule-tile-due' : ''}" data-action="open-rule" data-stage="${stage.id}" data-rule="${rule.id}" style="--tjw-tile-color: var(${stage.colorVar});">
                <span class="tjw-rule-tile-status">${statusIcon}</span>
                <span class="tjw-rule-tile-letters ${glyphOf(rule).length > 1 ? 'is-long' : ''}">${glyphOf(rule)}</span>
                <span class="tjw-rule-tile-name">${t(rule.nameKey)}</span>
                <span class="tjw-rule-tile-bar"><span class="tjw-rule-tile-bar-fill" style="width:${pct}%;"></span></span>
            </button>`;
        }).join('');

        const canChallenge = stage.rules.some(r => masteryByRule[r.id] && (masteryByRule[r.id].attemptsCount || 0) > 0);
        // 🌟🌟 [جديد ٢٨ سبتمبر] نشاط "اربط الحكم بحروفه" (generateLinkQuestion) يحتاج حكمين
        // على الأقل بالمرحلة ليكون له معنى (مطابقة اسم↔حروف) — بعد دمج القلقلة الصغرى/الكبرى
        // بحكم واحد، مرحلة القلقلة أصبحت بحكم واحد فقط، فيُخفى الزر بدل عرضه ليؤدي لشاشة خطأ
        const linkBtnHTML = stage.rules.length >= 2
            ? `<button class="tjw-outline-btn" data-action="start-link" data-stage="${stage.id}">🔗 ${t('tjw_link_activity_btn')}</button>`
            : '';

        // 🌟 [جديد] «شجرة الحكم»: تصنيف حروف المرحلة (أو أزواجها) بين أحكامها، لكل مرحلة قائمة على حروف أو أزواج
        const treeBtnHTML = hasStageTreeActivity(stage.id)
            ? `<button class="tjw-outline-btn" data-action="start-tree" data-stage="${stage.id}">🌳 ${t('tjw_tree_activity_btn')}</button>`
            : '';

        const done = progress.status === 'completed';
        const isActive = !done && !activeMarked;
        if (isActive) activeMarked = true;
        const nodeClass = done ? 'is-done' : (isActive ? 'is-active' : '');

        return `
            <section class="tjw-stage-section" style="--tjw-stage-color: var(${stage.colorVar});">
                <div class="tjw-stage-node ${nodeClass}">${done ? '✓' : stage.icon}</div>
                <div class="tjw-stage-card">
                    <h2 class="tjw-stage-title">
                        <span>${t(stage.nameKey)}</span>
                        <span class="tjw-stage-percent">${progress.percentComplete}%</span>
                    </h2>
                    <div class="tjw-stage-progress-track"><div class="tjw-stage-progress-fill" style="width:${progress.percentComplete}%; background: var(${stage.colorVar});"></div></div>
                    <div class="tjw-rule-tiles">${tilesHTML}</div>
                    <div class="tjw-stage-actions">
                        ${linkBtnHTML}
                        ${treeBtnHTML}
                        <button class="tjw-outline-btn" data-action="start-challenge" data-stage="${stage.id}" ${canChallenge ? '' : 'disabled'}>🏆 ${t('tjw_challenge_btn')}</button>
                    </div>
                </div>
            </section>`;
    }).join('');

    return `
        <div class="tjw-browse">
            ${heroHTML}
            ${reviewBannerHTML}
            ${stagesHTML}
        </div>`;
}

// 🌟 رمز الحكم على البطاقة: حقل glyph إن وُجد (الأحكام الوصفية كالمدود)، وإلا أول حرف من حروفه
function glyphOf(rule) {
    return rule.glyph || rule.letters.split(' ')[0];
}

// 🌟 تهريب نص يدخل من المستخدم (اسم الطالب) قبل حقنه في innerHTML
function escapeText(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ============================================================
// بطاقة تفصيل الحكم — الآن مع زر "ابدأ التدرّب" الفعلي (المرحلة 2)
// ============================================================
async function renderRuleDetailHTML({ stageId, ruleId }) {
    const stage = getTajweedStage(stageId);
    const rule = getTajweedRule(stageId, ruleId);
    if (!stage || !rule) return `<div class="tjw-empty-state">${t('tjw_rule_not_found')}</div>`;

    // 🌟 مثال الدرس من حفظ الطالب نفسه إن وُجد الحكم في نطاق حفظه (جدول التوسيم)، وإلا مثال الكتالوج
    const mine = AppState.currentStudent ? (await pickStudentExamples(rule, AppState.currentStudent, 1))[0] : null;
    const ayahInfo = mine ? mine.ayahInfo : await getAyahForExample(rule.example.surah, rule.example.ayah);
    const exAyahNumber = mine ? mine.ayah : rule.example.ayah;
    const ayahHTML = ayahInfo
        ? (mine ? highlightWordsHTML(ayahInfo.text, mine.occurrences)
                : highlightForTajweed(ayahInfo.text, rule.example.highlight, rule.example.firstOnly))
        : t('tjw_example_unavailable');
    const audioBtnHTML = ayahInfo
        ? `<button class="tjw-listen-btn" data-tjw-audio="${buildAyahAudioUrl(ayahInfo.number)}">🔊 ${t('tjw_listen_btn')}</button>`
        : '';
    const surahRefHTML = ayahInfo
        ? `<div class="tjw-example-ref">${ayahInfo.surahName} — ${t('tjw_ayah_word')} ${exAyahNumber}</div>`
        : '';

    const mastery = AppState.currentStudent
        ? await AppState.tajweedManager.getMasteryRecord(AppState.currentStudent.id, ruleId)
        : null;
    const journey = ensureJourney(mastery);
    const step = journeyStep(journey);
    const pct = journeyPercent(mastery);
    const statusLabel = mastery && mastery.status === 'needs_review' ? t('tjw_status_needs_review')
        : step === 'mastered' ? t('tjw_status_mastered')
        : step === 'learn' ? t('tjw_status_available') : t('tjw_status_in_progress');

    // 🌟 [رحلة الحكم] شريط الخطوات الأربع: شرح ← تطبيق ← اختبار ← المعلم، والخطوة الحالية بارزة
    const stepIdx = { learn: 0, practice: 1, exam: 2, awaiting_teacher: 3, mastered: 4 }[step];
    const stepDone = [!!journey.learnedAt, !!journey.practicePassedAt, !!journey.examPassedAt, !!journey.teacherApprovedAt];
    const stepperHTML = `<ol class="tjw-stepper">${['learn', 'practice', 'exam', 'teacher'].map((k, i) =>
        `<li class="${stepDone[i] ? 'is-done' : ''} ${i === stepIdx ? 'is-current' : ''}"><span class="tjw-step-dot">${stepDone[i] ? '✓' : i + 1}</span><span class="tjw-step-name">${t('tjw_step_' + k)}</span></li>`).join('')}</ol>`;
    const lastExam = (journey.examAttempts || []).slice(-1)[0];
    const lastExamHTML = lastExam ? `<p class="tjw-last-exam">${t('tjw_last_exam').replace('{n}', lastExam.score)}</p>` : '';
    const dp = { stage: stageId, rule: ruleId };
    const attrs = `data-stage="${dp.stage}" data-rule="${dp.rule}"`;
    let ctaHTML;
    if (step === 'learn') {
        ctaHTML = `<button class="tjw-cta-btn" data-action="mark-learned" ${attrs}>✅ ${t('tjw_step_learn_cta')}</button>`;
    } else if (step === 'practice') {
        ctaHTML = `${!journey.practiceSinceFail ? `<p class="tjw-checkpoint-banner">${t('tjw_retake_hint')}</p>` : ''}
            <button class="tjw-cta-btn" data-action="start-practice" ${attrs}>🎯 ${t('tjw_step_practice_cta')}</button>`;
    } else if (step === 'exam') {
        ctaHTML = `<button class="tjw-cta-btn" data-action="start-exam" ${attrs}>📝 ${t('tjw_step_exam_cta')}</button>
            <button class="tjw-outline-btn" data-action="start-practice" ${attrs}>🎯 ${t('tjw_practice_more_btn')}</button>
            <p class="tjw-exam-info">${t('tjw_exam_info').replace('{n}', EXAM_SIZE).replace('{p}', EXAM_PASS_SCORE)}</p>`;
    } else if (step === 'awaiting_teacher') {
        ctaHTML = `<p class="tjw-checkpoint-banner">🎤 ${t('tjw_awaiting_teacher_note')}</p>
            <button class="tjw-cta-btn" data-action="start-checkpoint" ${attrs}>🎤 ${t('tjw_start_checkpoint_btn')}</button>
            <button class="tjw-outline-btn" data-action="start-practice" ${attrs}>🎯 ${t('tjw_practice_more_btn')}</button>`;
    } else {
        ctaHTML = `<p class="tjw-mastered-banner">✅ ${t('tjw_mastered_step_note')}</p>
            <button class="tjw-outline-btn" data-action="start-practice" ${attrs}>🎯 ${t('tjw_practice_more_btn')}</button>`;
    }

    // 🌟 [إعادة تصميم] حروف الحكم كرقائق منفصلة؛ وإن كان النص وصفاً (مثل «كل الحروف عدا…») يُعرض رقاقة نصية واحدة
    const letterTokens = rule.letters.split(/\s+/).filter(Boolean);
    const lettersAreSingle = letterTokens.every(tok => tok.length <= 2);
    const lettersHTML = lettersAreSingle
        ? letterTokens.map(tok => `<span class="tjw-letter-chip">${tok}</span>`).join('')
        : `<span class="tjw-letter-chip is-text">${rule.letters}</span>`;

    // 🌟 حقلا النطق والخطأ الشائع كانا في الكتالوج بلا أي عرض للطالب — يُعرضان الآن في الدرس
    const howtoHTML = rule.makhrajNote
        ? `<div class="tjw-howto"><h3 class="tjw-section-title">${t('tjw_howto_title')}</h3><p>${t(rule.makhrajNote)}</p></div>` : '';
    const cautionHTML = rule.commonMistakes
        ? `<div class="tjw-caution"><h3 class="tjw-section-title">${t('tjw_caution_title')}</h3><p>${t(rule.commonMistakes)}</p></div>` : '';
    const howtoGridHTML = (howtoHTML || cautionHTML) ? `<div class="tjw-howto-grid">${howtoHTML}${cautionHTML}</div>` : '';

    // 🌟 [جديد] بطاقات الحروف القابلة للقلب (كلمات قرآنية من المنصة) + شجرة الحكم على غرار كتاب «فتوحات الرحمن»
    const illusHTML = await renderRuleIllustrationHTML(rule);
    const cardsInnerHTML = await renderLetterCardsHTML(rule);
    const cardsHTML = cardsInnerHTML
        ? `<section><h3 class="tjw-section-title">${t('tjw_letter_cards_title')}</h3>${cardsInnerHTML}</section>` : '';
    // 🌟 «ألعاب الحروف»: لعبة إضافية مستقلة لكل حكم قائم على حروف أو أزواج، متاحة في كل خطوات الرحلة
    const lettersGameHTML = isLetterGameRule(rule)
        ? `<div class="tjw-lesson-actions tjw-extra-games"><button class="tjw-outline-btn" data-action="start-letters" ${attrs}>🎮 ${t('tjw_letters_play_btn')}</button></div>` : '';
    // 🌟 «ملخص هذا الحكم للولي»: متاح في كل خطوات الرحلة (يلخّص ما تمّ حتى الآن)
    const summaryBtnHTML = AppState.currentStudent
        ? `<div class="tjw-lesson-actions tjw-extra-games"><button class="tjw-outline-btn" data-action="parent-summary" ${attrs}>${t('tjw_sum_btn_rule')}</button></div>` : '';
    const treeHTML = `<section><h3 class="tjw-section-title">${t('tjw_tree_title')}</h3>${renderStageTreeHTML(stageId, ruleId)}</section>`;

    const dimsHTML = ['knows', 'distinguishes', 'discovers', 'applies', 'recalls', 'pronounces'].map(k => {
        const v = mastery ? (mastery.dimensions[k] || 0) : 0;
        return `<div class="tjw-dim"><span>${t('tjw_dim_' + k)}</span><span class="tjw-dim-track"><span class="tjw-dim-fill" style="width:${v}%;"></span></span><span class="tjw-dim-val">${v}%</span></div>`;
    }).join('');

    return `
        <div class="tjw-lesson">
          <article class="tjw-rule-card" style="--tjw-card-color: var(${stage.colorVar});">
            <header class="tjw-lesson-hero">
                <div class="tjw-rule-symbol">${renderRuleSymbol(stage, rule)}</div>
                <div class="tjw-lesson-hero-text">
                    <div class="tjw-rule-card-eyebrow">${t(stage.nameKey)}</div>
                    <h2 class="tjw-rule-card-name">${t(rule.nameKey)}</h2>
                    <p class="tjw-rule-card-def">${t(rule.defKey)}</p>
                </div>
            </header>

            <div class="tjw-lesson-body">
                <section>
                    <h3 class="tjw-section-title">${t('tjw_letters_label')}</h3>
                    <div class="tjw-letter-chips">${lettersHTML}</div>
                </section>

                ${illusHTML}

                ${renderBookStripHTML(rule.id)}

                ${cardsHTML}

                <section class="tjw-example-box">
                    ${mine ? `<div class="tjw-hifz-tag">📖 ${t('tjw_from_hifz')}</div>` : ''}
                    <div class="tjw-example-text">${ayahHTML}</div>
                    ${surahRefHTML}
                    <div class="tjw-example-note">${t(mine ? 'tjw_example_hifz_note' : 'tjw_example_source_note')}</div>
                    ${audioBtnHTML}
                </section>

                <section class="tjw-notice-box">
                    <div class="tjw-notice-question">${t(rule.noticeKey)}</div>
                    <button class="tjw-pill-btn" data-tjw-reveal="1">${t('tjw_reveal_btn')}</button>
                    <div class="tjw-notice-answer">${t(rule.defKey)}</div>
                </section>

                ${treeHTML}

                ${howtoGridHTML}

                <section class="tjw-mastery-box">
                    ${stepperHTML}
                    <div class="tjw-mastery-row">
                        <span>${statusLabel}</span>
                        <span>${pct}%</span>
                    </div>
                    <div class="tjw-stage-progress-track"><div class="tjw-stage-progress-fill" style="width:${pct}%; background: var(${stage.colorVar});"></div></div>
                    ${lastExamHTML}
                    <div class="tjw-lesson-actions">${ctaHTML}</div>
                    ${lettersGameHTML}
                    ${summaryBtnHTML}
                    <details class="tjw-dims-details"><summary>${t('tjw_dims_title')}</summary><div class="tjw-dims">${dimsHTML}</div></details>
                </section>
            </div>
          </article>
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
            ${glyphOf(rule)}
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
