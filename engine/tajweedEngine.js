// engine/tajweedEngine.js
//
// 🌟 [جديد بالكامل — المراحل 2-5] محرك منطق "أبطال التجويد" الخالص — بلا أي لمس لـ DOM أو
// IndexedDB (بنفس فلسفة engine/dualTestEngine.js وengine/masteryEngine.js بالضبط). كل شيء هنا
// دوال حسابية قابلة للاختبار بمعزل عن الشاشات: توليد أسئلة الأنشطة الخمسة (§6)، تحديث الإتقان
// متعدد الأبعاد (§4)، قفل/فتح المراحل (§3)، وكتالوج الأوسمة (§8). الشاشات في tajweed/*.js
// تستدعي هذه الدوال ثم تحفظ النتيجة عبر database/tajweedDB.js.

import { TAJWEED_STAGES, getTajweedStage, getStageRuleIds, getAllRulesFlat } from './tajweedRulesCatalog.js';

// ============================================================
// أدوات عامة
// ============================================================
export function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function pickRandom(arr, n) {
    return shuffleArray(arr).slice(0, n);
}

// ============================================================
// §4 — الإتقان متعدد الأبعاد
// ============================================================
// 🌟 خريطة كل نوع نشاط ← البُعد الذي يحدّثه، بنفس التصنيف الوارد في §6 من المستند المعماري.
// نشاط "تحدي المرحلة" (stage_challenge) استثناء: يحدّث بُعد "يستدعي" (recalls) لكل الأحكام التي
// غطّاها، وليس بُعداً واحداً فقط — لأنه بطبيعته اختبار استدعاء شامل بعد تعلّم كل الأحكام.
export const ACTIVITY_DIMENSION_MAP = {
    choose_rule: 'knows',
    link_rule_letters: 'distinguishes',
    discover_in_ayah: 'discovers',
    apply_new_ayah: 'applies',
    review: 'recalls',
    stage_challenge: 'recalls'
};

const MASTERY_DIMENSION_KEYS = ['knows', 'distinguishes', 'discovers', 'applies', 'recalls'];
const MASTERY_THRESHOLD = 80;
const WEAK_DIMENSION_THRESHOLD = 60;
// 🌟 [افتراض صريح]: الحد الأدنى لاعتبار فجوة زمنية "حقيقية" بين آخر تدرّب وجلسة الاستدعاء —
// لم يحدّد المستند رقماً دقيقاً (فقط "بعد فجوة زمنية حقيقية")، فاخترت يوماً كاملاً كحد أدنى
// معقول (نفس وحدة القياس المستخدمة أصلاً في خوارزمية reviewScheduleDB.js: intervalDays)
const MIN_RECALL_GAP_DAYS = 1;

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

// 🌟 تحديث بُعد واحد بمعادلة ترجيح بسيطة (٤٠٪ من الأداء السابق + ٦٠٪ من الأداء الحالي) —
// تعطي وزناً أكبر للأداء الأخير (تعكس التحسّن/التراجع بسرعة معقولة) بلا قفزات حادة من سؤال
// واحد فقط. [افتراض صريح]: هذا اختيار مبسّط بديل عن أي خوارزمية تكيّفية معقّدة (زي IRT)، غير
// مذكور رقمياً في المستند المعماري — قابل للتعديل متى رأى المعلم نتائجه عملياً.
function updateDimensionValue(oldValue, scorePercent) {
    return Math.round(clamp((oldValue || 0) * 0.4 + scorePercent * 0.6, 0, 100));
}

// 🌟 يُطبَّق بعد كل جلسة نشاط: يحدّث البُعد المرتبط بنوع النشاط فقط، ويُحدّث lastPracticedAt/
// attemptsCount دائماً. بُعد "recalls" له قاعدة خاصة (راجع MIN_RECALL_GAP_DAYS أعلاه): لا
// يتحدّث إلا لو مرّ يوم كامل على الأقل منذ آخر تدرّب فعلي على هذا الحكم — تطبيقاً حرفياً لشرط
// "استدعاء ناجح بعد فجوة زمنية حقيقية" في §4، حتى لا يُحتسَب سؤال مُعاد فوراً كأنه استدعاء.
export function applySessionToMastery(masteryRecord, activityType, scorePercent) {
    const record = { ...masteryRecord, dimensions: { ...masteryRecord.dimensions } };
    const dimKey = ACTIVITY_DIMENSION_MAP[activityType] || 'knows';
    const now = new Date();

    if (dimKey === 'recalls') {
        const last = record.lastPracticedAt ? new Date(record.lastPracticedAt) : null;
        const gapDays = last ? (now - last) / 86400000 : Infinity;
        if (gapDays >= MIN_RECALL_GAP_DAYS) {
            record.dimensions.recalls = updateDimensionValue(record.dimensions.recalls, scorePercent);
        }
        // لو الفجوة غير كافية: بقية الأبعاد لا تتأثر، فقط نسجّل المحاولة (المنطق أدناه) بلا
        // تحديث recalls — تفادياً لمنح "إتقان" وهمي بإعادة نفس التحدي فوراً عدة مرات
    } else {
        record.dimensions[dimKey] = updateDimensionValue(record.dimensions[dimKey], scorePercent);
    }

    record.attemptsCount = (record.attemptsCount || 0) + 1;
    record.lastPracticedAt = now.toISOString();
    record.status = computeMasteryStatus(record.dimensions, record.status);
    if (record.status === 'mastered' && !record.masteredAt) {
        record.masteredAt = now.toISOString();
    }
    if (record.status !== 'mastered') {
        record.masteredAt = null;
    }
    return record;
}

// 🌟 حالة الإتقان: 'mastered' كل الأبعاد ≥80 (ويشمل ذلك recalls، أي استدعاء ناجح حقيقي فعلاً
// وقع) · 'needs_review' كانت متقنة سابقاً وتراجع بُعد recalls عن الحد · 'in_progress' كل بُعد
// ≥60 لكن لم تكتمل بعد · 'available' لم يبدأ الطالب أو أي بُعد ما زال دون 60 بلا محاولات كافية
export function computeMasteryStatus(dimensions, previousStatus) {
    const values = MASTERY_DIMENSION_KEYS.map(k => dimensions[k] || 0);
    const allMastered = values.every(v => v >= MASTERY_THRESHOLD);
    if (allMastered) return 'mastered';

    if (previousStatus === 'mastered' && dimensions.recalls < MASTERY_THRESHOLD) {
        return 'needs_review';
    }

    const anyWeak = values.some(v => v < WEAK_DIMENSION_THRESHOLD);
    const anyProgress = values.some(v => v > 0);
    if (!anyProgress) return 'available';
    return anyWeak ? 'in_progress' : 'in_progress';
}

// 🌟 نسبة إتقان الحكم الواحد كرقم واحد مبسّط (متوسط الأبعاد الخمسة) — تُستخدَم لعرض شريط تقدّم
// مختصر في بطاقة الحكم بخريطة المراحل، بدل عرض 5 أرقام منفصلة هناك
export function ruleOverallPercent(dimensions) {
    if (!dimensions) return 0;
    const values = MASTERY_DIMENSION_KEYS.map(k => dimensions[k] || 0);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

// ============================================================
// §3 — تقدّم المرحلة وقفل/فتح المراحل
// ============================================================
// [افتراض صريح — لم يحدّده المستند رقمياً]: تُعتبر المرحلة "مكتملة" (تفتح المرحلة التالية)
// فقط عندما يصل كل حكم فيها إلى حالة 'mastered' فعلاً (وليس مجرد لمسه) — التعريف الأكثر
// اتساقاً مع فلسفة "إتقان حقيقي قبل التقدّم" في §4، وقابل للتخفيف لاحقاً (مثلاً 80% من
// الأحكام) لو رأى المعلم أنه متشدّد جداً عملياً.
export function computeStageProgress(stageId, masteryRecordsForStudent) {
    const ruleIds = getStageRuleIds(stageId);
    if (ruleIds.length === 0) return { status: 'locked', percentComplete: 0 };

    const byRule = {};
    masteryRecordsForStudent.forEach(m => { byRule[m.ruleId] = m; });

    let totalPercent = 0;
    let masteredCount = 0;
    let anyTouched = false;

    ruleIds.forEach(ruleId => {
        const rec = byRule[ruleId];
        const pct = rec ? ruleOverallPercent(rec.dimensions) : 0;
        totalPercent += pct;
        if (rec && rec.status === 'mastered') masteredCount++;
        if (rec && (rec.attemptsCount || 0) > 0) anyTouched = true;
    });

    const percentComplete = Math.round(totalPercent / ruleIds.length);
    let status = 'locked';
    if (masteredCount === ruleIds.length) status = 'completed';
    else if (anyTouched) status = 'in_progress';
    else status = 'available';

    return { status, percentComplete };
}

// 🌟 المرحلة الأولى في الكتالوج (القلقلة) مفتوحة دائماً كـ"بوّابة دخول" — أي مرحلة تالية تُفتح
// فقط بعد اكتمال المرحلة التي تسبقها مباشرة (status === 'completed')، بترتيب مصفوفة
// TAJWEED_STAGES نفسها (نفس ترتيب "تحفة الأطفال" المعتمد في §2)
export function isStageUnlocked(stageId, allStageProgress) {
    const idx = TAJWEED_STAGES.findIndex(s => s.id === stageId);
    if (idx <= 0) return true; // أول مرحلة دائماً مفتوحة
    const prevStage = TAJWEED_STAGES[idx - 1];
    const prevProgress = allStageProgress[prevStage.id];
    return !!prevProgress && prevProgress.status === 'completed';
}

// 🌟 يبني كائن stageProgress كاملاً لكل مراحل الكتالوج دفعة واحدة — يُستخدَم لتحديث حقل
// tajweedProgress.stageProgress في سجل الطالب بعد كل جلسة نشاط
export function computeAllStageProgress(masteryRecordsForStudent) {
    const result = {};
    TAJWEED_STAGES.forEach(stage => {
        result[stage.id] = computeStageProgress(stage.id, masteryRecordsForStudent);
    });
    return result;
}

// ============================================================
// §6 — توليد أسئلة الأنشطة الخمسة
// ============================================================

// 1) اختر الحكم — MCQ: تُعرَض حروف الحكم، يختار الطالب اسم الحكم الصحيح من بين 4 خيارات
// (الصحيح + 3 مشتَّتات من أحكام أخرى عبر المرحلتين معاً لصعوبة تمييز حقيقية)
export function generateChooseRuleQuestion(rule) {
    const allOthers = getAllRulesFlat().map(x => x.rule).filter(r => r.id !== rule.id);
    const distractors = pickRandom(allOthers, Math.min(3, allOthers.length));
    const options = shuffleArray([rule, ...distractors]).map(r => ({ ruleId: r.id, nameKey: r.nameKey }));
    return {
        type: 'choose_rule',
        ruleId: rule.id,
        letters: rule.letters,
        correctRuleId: rule.id,
        options
    };
}

// 2) اربط الحكم بحروفه — مطابقة: كل أحكام نفس المرحلة (اسم ↔ حروف)، يربط الطالب كل زوج
export function generateLinkQuestion(stageId) {
    const stage = getTajweedStage(stageId);
    if (!stage || stage.rules.length < 2) return null;
    const namesCol = shuffleArray(stage.rules.map(r => ({ ruleId: r.id, nameKey: r.nameKey })));
    const lettersCol = shuffleArray(stage.rules.map(r => ({ ruleId: r.id, letters: r.letters })));
    return { type: 'link_rule_letters', stageId, namesCol, lettersCol };
}

// 🌟 دالة مشتركة تبني سؤال "اكتشف الحكم" من أي مثال آية (تُستخدَم في اكتشف الحكم داخل الآية
// وتطبيق على آية جديدة معاً — الفرق فقط أي حقل من الحكم يُمرَّر لها: example أو practiceExample)
function buildDiscoverStyleQuestion(type, rule, ayahInfo, exampleMeta) {
    if (!ayahInfo) return null;
    const words = ayahInfo.text.split(/\s+/).filter(Boolean);
    // 🌟 نبحث عن الكلمة (أو أول كلمة من عبارة متعددة الكلمات) المطابقة للتظليل المحدَّد في
    // الكتالوج لتحديد "الإجابة الصحيحة" ضمن كلمات الآية الفعلية المجلوبة من المحرك
    const highlightFirstWord = exampleMeta.highlight.split(/\s+/)[0];
    const correctIndex = words.findIndex(w => w.includes(highlightFirstWord) || highlightFirstWord.includes(w));
    if (correctIndex === -1) return null;

    const otherIndices = words.map((_, i) => i).filter(i => i !== correctIndex);
    const distractorIndices = pickRandom(otherIndices, Math.min(3, otherIndices.length));
    const optionIndices = shuffleArray([correctIndex, ...distractorIndices]);

    return {
        type,
        ruleId: rule.id,
        ayahText: words.join(' '),
        surahName: ayahInfo.surahName,
        audioNumber: ayahInfo.number,
        options: optionIndices.map(i => ({ index: i, word: words[i] })),
        correctIndex
    };
}

// 3) اكتشف الحكم داخل الآية — يستخدم مثال التصفّح الأساسي (example) نفسه الذي شاهده الطالب
export function generateDiscoverQuestion(rule, ayahInfo) {
    return buildDiscoverStyleQuestion('discover_in_ayah', rule, ayahInfo, rule.example);
}

// 4) تطبيق على آية جديدة — يستخدم practiceExample (آية مختلفة عن مثال التصفّح، راجع الملاحظة
// في tajweedRulesCatalog.js حول درجة الثقة بكل مثال إضافي)
export function generateApplyQuestion(rule, practiceAyahInfo) {
    return buildDiscoverStyleQuestion('apply_new_ayah', rule, practiceAyahInfo, rule.practiceExample);
}

// 5) تحدي نهائي للمرحلة — مجموعة مُختلَطة من كل الأحكام: سؤال "اختر الحكم" واحد + سؤال
// "اكتشف الحكم" واحد لكل حكم في المرحلة (يحتاج المستدعي تمرير ayahInfoByRule الجاهزة مسبقاً
// لأن هذه دالة خالصة بلا وصول لـ QuranEngine). 3-5 أسئلة كحد أقصى حسب عدد أحكام المرحلة.
export function buildStageChallengeQuestions(stageId, ayahInfoByRuleId) {
    const stage = getTajweedStage(stageId);
    if (!stage) return [];
    const questions = [];
    stage.rules.forEach(rule => {
        questions.push(generateChooseRuleQuestion(rule));
        const ayahInfo = ayahInfoByRuleId[rule.id];
        const discoverQ = generateDiscoverQuestion(rule, ayahInfo);
        if (discoverQ) questions.push(discoverQ);
    });
    // سقف 5 أسئلة كحد أقصى (§15 من المستند: "سقف أقصى 3-5 أسئلة")
    return shuffleArray(questions).slice(0, 5);
}

// ============================================================
// §5 — بوّابة المراجعة الإلزامية (3-5 أسئلة كحد أقصى من الأحكام المستحقة)
// ============================================================
export function buildReviewQuestions(dueRules, ayahInfoByRuleId) {
    const pool = [];
    dueRules.forEach(rule => {
        pool.push(generateChooseRuleQuestion(rule));
        const ayahInfo = ayahInfoByRuleId[rule.id];
        const discoverQ = generateDiscoverQuestion(rule, ayahInfo);
        if (discoverQ) pool.push(discoverQ);
    });
    return shuffleArray(pool).slice(0, 5);
}

// ============================================================
// §8 — الأوسمة (13 وسام)
// ============================================================
// 🌟 [جديد بالكامل] كتالوج أوسمة "أبطال التجويد" — بنفس نمط BADGE_CATALOG في
// engine/dualTestEngine.js حرفيًا (icon + مفاتيح ترجمة + repeatable). أوسمة "بطل [مرحلة]"
// تُبنى بنمط بارامتري واحد (badgeKeyForStageMaster) بدل تكرار وسام منفصل لكل مرحلة بالكود —
// حاليًا مرحلتان فقط (قلقلة/نون ساكنة) فتظهر منهما وسامان فقط، وأي مرحلة تُضاف مستقبلاً
// تحصل على وسامها تلقائياً بلا أي كود إضافي.
export const TAJWEED_BADGE_CATALOG = {
    first_step: { icon: '👣', nameKey: 'tjw_badge_first_step_name', descKey: 'tjw_badge_first_step_desc', repeatable: false },
    first_mastery: { icon: '🌱', nameKey: 'tjw_badge_first_mastery_name', descKey: 'tjw_badge_first_mastery_desc', repeatable: false },
    stage_master_qalqalah: { icon: '💥', nameKey: 'tjw_badge_stage_master_qalqalah_name', descKey: 'tjw_badge_stage_master_desc', repeatable: false, stageId: 'qalqalah' },
    stage_master_noon_sakinah: { icon: '🔵', nameKey: 'tjw_badge_stage_master_noon_sakinah_name', descKey: 'tjw_badge_stage_master_desc', repeatable: false, stageId: 'noon_sakinah' },
    perfect_challenge: { icon: '🌟', nameKey: 'tjw_badge_perfect_challenge_name', descKey: 'tjw_badge_perfect_challenge_desc', repeatable: true },
    review_streak_3: { icon: '🔥', nameKey: 'tjw_badge_review_streak_name', descKey: 'tjw_badge_review_streak_desc', repeatable: true },
    five_rules_mastered: { icon: '🏅', nameKey: 'tjw_badge_five_rules_name', descKey: 'tjw_badge_five_rules_desc', repeatable: false },
    all_rules_mastered: { icon: '👑', nameKey: 'tjw_badge_all_rules_name', descKey: 'tjw_badge_all_rules_desc', repeatable: false },
    no_mistakes_activity: { icon: '💎', nameKey: 'tjw_badge_no_mistakes_name', descKey: 'tjw_badge_no_mistakes_desc', repeatable: true },
    comeback_review: { icon: '💪', nameKey: 'tjw_badge_comeback_name', descKey: 'tjw_badge_comeback_desc', repeatable: true },
    daily_practice: { icon: '📅', nameKey: 'tjw_badge_daily_practice_name', descKey: 'tjw_badge_daily_practice_desc', repeatable: true },
    ten_sessions: { icon: '📈', nameKey: 'tjw_badge_ten_sessions_name', descKey: 'tjw_badge_ten_sessions_desc', repeatable: false },
    quick_learner: { icon: '⚡', nameKey: 'tjw_badge_quick_learner_name', descKey: 'tjw_badge_quick_learner_desc', repeatable: true }
};

export function badgeKeyForStageMaster(stageId) {
    return `stage_master_${stageId}`;
}

/**
 * تقييم الأوسمة المستحقة فور إتمام جلسة نشاط واحدة — دالة حسابية خالصة (لا تلمس IndexedDB)،
 * بنفس نمط evaluateMatchAchievements في engine/dualTestEngine.js بالضبط. تُرجع مصفوفة
 * {badgeKey, meta?} فارغة لو لم يستحق الطالب أي وسام هذه المرة. الاستدعاء الفعلي (فحص
 * hasAchievement لغير القابل للتكرار ثم addAchievement) يتم من tajweed/*.js عبر
 * AppState.tajweedManager.
 *
 * @param {object} ctx بيانات السياق: { studentId, allMastery (كل سجلات الطالب بعد التحديث),
 *   allSessions (كل جلسات الطالب)، justMasteredRuleId، justCompletedStageId، lastActivityWasPerfect،
 *   currentStreakDays }
 */
export function evaluateSessionAchievements(ctx) {
    const earned = [];
    const masteredCount = (ctx.allMastery || []).filter(m => m.status === 'mastered').length;
    const totalRulesCount = getAllRulesFlat().length;

    // 👣 أول خطوة — أول جلسة نشاط على الإطلاق لهذا الطالب في مسار التجويد
    if ((ctx.allSessions || []).length === 1) {
        earned.push({ badgeKey: 'first_step' });
    }

    // 🌱 أول إتقان — أول حكم يصل لحالة 'mastered'
    if (ctx.justMasteredRuleId && masteredCount === 1) {
        earned.push({ badgeKey: 'first_mastery' });
    }

    // 💥/🔵 بطل [مرحلة] — بنمط بارامتري: أي مرحلة اكتملت الآن تمنح وسامها الخاص تلقائياً
    if (ctx.justCompletedStageId) {
        earned.push({ badgeKey: badgeKeyForStageMaster(ctx.justCompletedStageId), meta: { stageId: ctx.justCompletedStageId } });
    }

    // 🌟 أداء مثالي في تحدي/مراجعة — صفر أخطاء في جلسة تحدي المرحلة أو المراجعة
    if (ctx.lastActivityWasPerfect && (ctx.lastActivityType === 'stage_challenge' || ctx.lastActivityType === 'review')) {
        earned.push({ badgeKey: 'perfect_challenge' });
    }

    // 💎 بلا أخطاء — صفر أخطاء في أي نشاط عادي (قابل للتكرار، منفصل عن وسام التحدي المثالي)
    if (ctx.lastActivityWasPerfect) {
        earned.push({ badgeKey: 'no_mistakes_activity' });
    }

    // 🔥 سلسلة مراجعة — كل مضاعف من 3 أيام متتالية لمراجعة فعلية (يُمرَّر جاهزاً من المستدعي
    // لأنه يعتمد على تاريخ جلسات متعدد الأيام، أنسب حسابه بجانب قراءة IndexedDB مباشرة)
    if (ctx.currentStreakDays && ctx.currentStreakDays > 0 && ctx.currentStreakDays % 3 === 0) {
        earned.push({ badgeKey: 'review_streak_3', meta: { streak: ctx.currentStreakDays } });
    }

    // 🏅 خمسة أحكام متقنة / 👑 كل الأحكام متقنة
    if (masteredCount === 5) {
        earned.push({ badgeKey: 'five_rules_mastered' });
    }
    if (masteredCount === totalRulesCount) {
        earned.push({ badgeKey: 'all_rules_mastered' });
    }

    // 💪 عودة قوية — نجاح في مراجعة لحكم كانت حالته 'needs_review'
    if (ctx.wasNeedsReviewBeforeThisSession && ctx.lastActivityType === 'review' && ctx.lastActivitySucceeded) {
        earned.push({ badgeKey: 'comeback_review' });
    }

    // 📅 ممارسة منتظمة — كل مضاعف من 5 أيام تقويمية مختلفة (وليس بالضرورة متتالية) تدرّب
    // فيها الطالب على مسار التجويد ولو مرة واحدة — يُمرَّر جاهزاً من المستدعي (محسوب من تواريخ
    // allSessions) لتفادي تكرار حساب التواريخ هنا
    if (ctx.distinctPracticeDaysCount && ctx.distinctPracticeDaysCount > 0 && ctx.distinctPracticeDaysCount % 5 === 0) {
        earned.push({ badgeKey: 'daily_practice', meta: { days: ctx.distinctPracticeDaysCount } });
    }

    // 📈 عشر جلسات — أول مرة يصل فيها إجمالي جلسات الطالب لعشرة بالضبط
    if ((ctx.allSessions || []).length === 10) {
        earned.push({ badgeKey: 'ten_sessions' });
    }

    // ⚡ متعلّم سريع — إتقان حكم من أول محاولتين اثنتين فقط (attemptsCount ≤ 2 عند الوصول لـ mastered)
    if (ctx.justMasteredRuleId) {
        const rec = (ctx.allMastery || []).find(m => m.ruleId === ctx.justMasteredRuleId);
        if (rec && (rec.attemptsCount || 0) <= 2) {
            earned.push({ badgeKey: 'quick_learner' });
        }
    }

    return earned;
}
