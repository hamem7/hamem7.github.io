// engine/tajweedJourney.js
//
// «رحلة الحكم»: لكل (طالب × حكم) أربع خطوات متتابعة لا يُقفز بينها:
//   ١ شرح (يقرأ الدرس ويضغط «فهمت») ← ٢ تطبيق (جلسة تدرّب بنتيجة ≥ 60%) ← ٣ اختبار (≥ 80%) ← ٤ اعتماد المعلم
//   (تسميع بدرجة ≥ 70%). عند الاعتماد يصبح الحكم «متقناً» فتُفتح المرحلة التالية عبر isStageUnlocked.
// بعد رسوب الاختبار لا يُعاد قبل جلسة تطبيق جديدة ناجحة. دوال خالصة (بلا DOM/قاعدة بيانات)؛ تعيد نسخة من السجل
// ولا تعدّل الأصل. الحالة تُخزَّن داخل سجل الإتقان نفسه في حقل journey (لا مخزن جديد في IndexedDB).

export const PRACTICE_PASS_SCORE = 60;   // نجاح جلسة التطبيق
export const EXAM_PASS_SCORE = 80;       // نجاح اختبار الحكم
export const EXAM_SIZE = 8;              // عدد أسئلة الاختبار (الحد الأدنى المقبول 5 لأحكام قليلة الأمثلة)
export const EXAM_MIN_SIZE = 5;
export const TEACHER_PASS_SCORE = 70;    // اعتماد المعلم (درجة «سمّع لي»)

// 🌟 [مسار الحكم المتصل — 2026-10-21] «التطبيق» صار «حزمة ألعاب» تُلعب متتابعة (تدرّب، حروف، شجرة، ربط). تُنجَز الخطوة حين تُلعب كل
// ألعاب الحكم ويبلغ متوسط نتائجها هذا الحد (بطلب المعلم: «نسبة معينة لكل الأسئلة»). الأقل من 60% في لعبة واحدة بعد رسوب الاختبار
// يكفي لفكّ قفل إعادة الاختبار (كما كان بعد جلسة تطبيق ناجحة).
export const GAMES_PASS_SCORE = 75;

export const JOURNEY_STEPS = ['learn', 'practice', 'exam', 'awaiting_teacher', 'mastered'];

export function emptyJourney() {
    return {
        learnedAt: null,
        practicePassedAt: null, practiceBest: 0, practiceCount: 0,
        practiceSinceFail: true,          // يُصفَّر عند رسوب الاختبار ويعود true بجلسة تطبيق ناجحة
        examAttempts: [],                 // [{at, score, passed}]
        examPassedAt: null,
        teacherApprovedAt: null,
        // مسار الحكم المتصل: آخر نتيجة لكل لعبة {practice, letters, tree, link}، ومتوسطها، ومتى استمع الطالب لمثال بصوت المنشاوي، ونقطة التوقف،
        // وأنواع آخر اختبار (فلا تتكرر تشكيلته في الاختبار التالي)
        gameScores: {}, gamesAvg: null, audioAt: null, resume: null, examKinds: []
    };
}

// يضمن وجود journey: سجلات قديمة بلا الحقل تُترجَم (متقن سابقاً ← معتمد كاملاً؛ بدأ التدرّب ← تعلّم وطبّق)
export function ensureJourney(record) {
    if (record && record.journey) return { ...emptyJourney(), ...record.journey };
    const j = emptyJourney();
    if (!record) return j;
    const stamp = record.masteredAt || record.lastPracticedAt || new Date(0).toISOString();
    if (record.status === 'mastered') {
        j.learnedAt = j.practicePassedAt = j.examPassedAt = j.teacherApprovedAt = stamp;
        j.practiceBest = 100; j.practiceCount = 1;
    } else if ((record.attemptsCount || 0) > 0) {
        j.learnedAt = stamp;
    }
    return j;
}

export function journeyStep(journey) {
    const j = journey || emptyJourney();
    if (!j.learnedAt) return 'learn';
    if (!j.practicePassedAt) return 'practice';
    if (!j.examPassedAt) return j.practiceSinceFail ? 'exam' : 'practice';
    if (!j.teacherApprovedAt) return 'awaiting_teacher';
    return 'mastered';
}

export const canTakeExam = (journey) => journeyStep(journey) === 'exam';
export const canTeacherCheck = (journey) => ['awaiting_teacher', 'mastered'].includes(journeyStep(journey));

// 0..100 يظهر في شريط تقدّم الحكم والمرحلة (٢٥ لكل خطوة منجزة)
export function journeyPercent(record) {
    const j = ensureJourney(record);
    return (j.learnedAt ? 25 : 0) + (j.practicePassedAt ? 25 : 0) + (j.examPassedAt ? 25 : 0) + (j.teacherApprovedAt ? 25 : 0);
}

const withJourney = (record, fn) => { const r = { ...record, journey: ensureJourney(record) }; fn(r.journey); return r; };

export function applyLearned(record, now = new Date()) {
    return withJourney(record, j => { if (!j.learnedAt) j.learnedAt = now.toISOString(); });
}

// نتيجة جلسة تطبيق (٠-١٠٠). النجاح ≥ 60% يُنجز الخطوة ويفكّ قفل الاختبار بعد رسوب سابق.
export function applyPracticeResult(record, scorePercent, now = new Date()) {
    return withJourney(record, j => {
        if (!j.learnedAt) j.learnedAt = now.toISOString();   // طالب مرّ بالتطبيق من خريطة قديمة: يُعتبر تعلّم
        j.practiceCount = (j.practiceCount || 0) + 1;
        j.practiceBest = Math.max(j.practiceBest || 0, Math.round(scorePercent));
        if (scorePercent >= PRACTICE_PASS_SCORE) {
            if (!j.practicePassedAt) j.practicePassedAt = now.toISOString();
            j.practiceSinceFail = true;
        }
    });
}

export function applyExamResult(record, scorePercent, now = new Date(), kinds = null) {
    const passed = scorePercent >= EXAM_PASS_SCORE;
    const out = withJourney(record, j => {
        if (kinds && kinds.length) j.examKinds = kinds;   // تشكيلة أنواع هذا الاختبار: لا يكرّرها الاختبار التالي (engine/tajweedExamVariety.js)
        j.examAttempts = [...(j.examAttempts || []), { at: now.toISOString(), score: Math.round(scorePercent), passed }];
        if (passed) { if (!j.examPassedAt) j.examPassedAt = now.toISOString(); }
        else j.practiceSinceFail = false;
    });
    return { record: out, passed };
}

// درجة «سمّع لي» (٠-١٠٠): تُعتمد فقط بعد اجتياز الاختبار وبدرجة ≥ 70%
export function applyTeacherResult(record, scorePercent, now = new Date()) {
    const j0 = ensureJourney(record);
    const approved = !!j0.examPassedAt && scorePercent >= TEACHER_PASS_SCORE;
    const out = withJourney(record, j => { if (approved && !j.teacherApprovedAt) j.teacherApprovedAt = now.toISOString(); });
    return { record: out, approved };
}

// حالة سجل الإتقان (status) من الرحلة: متقن = معتمد من المعلم؛ needs_review يبقى حتى تنجح مراجعة
export function statusFromJourney(record, previousStatus) {
    const j = ensureJourney(record);
    if (j.teacherApprovedAt) return previousStatus === 'needs_review' ? 'needs_review' : 'mastered';
    const started = j.learnedAt || (record && (record.attemptsCount || 0) > 0);
    return started ? 'in_progress' : 'available';
}

// ============================================================
// مسار الحكم المتصل (ألعاب ← اختبار ← اعتماد بضغطة، مع إيقاف واستكمال)
// ============================================================

// نتيجة لعبة واحدة من حزمة الألعاب. required = مفاتيح ألعاب هذا الحكم (من engine/tajweedPath.js). عند لعب كلها يُحسب المتوسط، وبلوغه
// GAMES_PASS_SCORE يُنجز الخطوة. بعد رسوب اختبار سابق تكفي لعبة ≥60% لفكّ قفل إعادة الاختبار.
export function applyGameResult(record, gameKey, scorePercent, required, now = new Date()) {
    return withJourney(record, j => {
        if (!j.learnedAt) j.learnedAt = now.toISOString();
        const sc = Math.round(scorePercent);
        j.gameScores = { ...(j.gameScores || {}), [gameKey]: sc };
        j.practiceCount = (j.practiceCount || 0) + 1;
        const req = (required && required.length) ? required : [gameKey];
        if (req.every(k => typeof j.gameScores[k] === 'number')) {
            j.gamesAvg = Math.round(req.reduce((a, k) => a + j.gameScores[k], 0) / req.length);
            j.practiceBest = Math.max(j.practiceBest || 0, j.gamesAvg);
            if (j.gamesAvg >= GAMES_PASS_SCORE && !j.practicePassedAt) j.practicePassedAt = now.toISOString();
        }
        if (scorePercent >= PRACTICE_PASS_SCORE) j.practiceSinceFail = true;
    });
}

// الألعاب التي لم تُلعب بعد، أو (بعد لعبها كلها دون بلوغ الحد) الأضعف نتيجةً ليُعاد
export function nextGameKey(journey, required) {
    const j = journey || emptyJourney();
    const scores = j.gameScores || {};
    const missing = (required || []).find(k => typeof scores[k] !== 'number');
    if (missing) return missing;
    if (j.practicePassedAt) return null;
    return [...(required || [])].sort((a, b) => (scores[a] ?? 0) - (scores[b] ?? 0))[0] || null;
}

// اعتماد المعلم بضغطة واحدة (بعد اجتياز الاختبار فقط)
export function applyTeacherApproval(record, now = new Date()) {
    const j0 = ensureJourney(record);
    const approved = !!j0.examPassedAt;
    const out = withJourney(record, j => { if (approved && !j.teacherApprovedAt) j.teacherApprovedAt = now.toISOString(); });
    return { record: out, approved };
}

// الطالب استمع لمثال بصوت المنشاوي في درس الحكم (يُذكر في الملخص فقط إن حدث فعلاً)
export function applyAudioHeard(record, now = new Date()) {
    return withJourney(record, j => { if (!j.audioAt) j.audioAt = now.toISOString(); });
}

// نقطة التوقف: لقطة النشاط الجاري (نوعه وأسئلته ومكانه) ليكمل الطالب من السؤال نفسه المرة القادمة
export function setResume(record, snapshot, now = new Date()) {
    return withJourney(record, j => { j.resume = snapshot ? { ...snapshot, savedAt: now.toISOString() } : null; });
}
export const clearResume = (record) => setResume(record, null);
