// engine/dualTestEngine.js
//
// 🌟 [جديد بالكامل] منطق حساب نظام "الاختبارات الثنائية" — منفصل تماماً عن أي محرك آخر
// موجود في المنصة (homeworkEngine.js، quranEngine.js...) بطلب صريح من المعلم أن تبقى هذه
// الميزة في ملفات خاصة بعيدة عن الاختبارات والألعاب الحالية. دوال حسابية خالصة (بلا أي لمس
// لـ DOM أو IndexedDB) حتى يسهل اختبارها والتأكد من صحتها بمعزل عن الواجهة.
//
// القرارات المعتمدة من المعلم المطبَّقة هنا (راجع مستند المشروع للتفاصيل الكاملة):
// - خصم كل خطأ: نصف نقطة (0.5) ثابت دائماً، بغض النظر عن قيمة السؤال.
// - المساعدة المجانية: مرة واحدة لكل طالب لكل جولة (تُتابَع في شاشة اللعب لاحقاً، لا هنا).
// - نتيجة الجولة: من حقق نقاطاً أعلى في الجولة يفوز بها؛ تعادل نقاط الجولة = "جولة متعادلة"
//   بلا فوز لأي طرف (التعادل نتيجة رسمية مقبولة في هذه المنصة، ليس عيباً يُصحَّح).
// - النتيجة الإجمالية للمواجهة: عدد الجولات التي فاز بها كل طرف (Best of 3) + إجمالي النقاط
//   عبر الجولات الثلاث معاً (الاثنان يُعرضان جنباً إلى جنب، وليس أحدهما بديلاً عن الآخر).
//   الفائز = صاحب الجولات الأكثر؛ تعادل عدد الجولات (نادر) = تعادل رسمي للمواجهة كلها.

// خصم الخطأ الثابت — نصف نقطة دائماً (وليس نصف قيمة السؤال، حسب قرار المعلم الصريح)
export const MISTAKE_DEDUCTION = 0.5;

// 🌟 [جديد] قيمة كل سؤال ثابتة = 10 درجات، بتوضيح صريح من المعلم. عند اعتماد إجابة الطالب
// على سؤال، درجته لهذا السؤال تحديداً = 10 درجات كاملة، أو أقل بمقدار (عدد الأخطاء × 0.5)
// لو سجّل المعلم أي أخطاء أثناء هذا السؤال تحديداً — راجع computeQuestionScore أدناه.
export const QUESTION_POINTS = 10;

/**
 * تطبيق خصم خطأ واحد على نقاط طالب في الجولة الحالية.
 * 🌟 افتراض صريح غير محسوم بالتوضيح المباشر من المعلم: النقاط لا تنزل تحت الصفر (سقف أدنى
 * = 0)، تفادياً لنتيجة سالبة قد تبدو غريبة للطلاب الصغار. لو رغب المعلم مستقبلاً أن تُسمح
 * نقاط سالبة (تمييزاً أدق بين من أخطأ كثيراً جداً ومن لم يخطئ إطلاقاً)، يحتاج توضيحاً صريحاً
 * لتغيير هذا السقف.
 */
export function applyMistake(currentScore) {
    const next = (currentScore || 0) - MISTAKE_DEDUCTION;
    return next < 0 ? 0 : next;
}

/**
 * 🌟 [جديد] درجة سؤال واحد بعد اعتماد إجابة الطالب عليه، بناءً على عدد الأخطاء المسجَّلة له
 * تحديداً أثناء هذا السؤال (لا علاقة لأخطاء الأسئلة الأخرى). الدرجة الكاملة = QUESTION_POINTS
 * (10)، وكل خطأ يخصم MISTAKE_DEDUCTION (0.5) بنفس سقف عدم النزول تحت الصفر المطبَّق في
 * applyMistake أعلاه. تُستخدَم في شاشة اللعب عند الضغط على "✅ اعتماد الإجابة".
 */
export function computeQuestionScore(mistakes) {
    const raw = QUESTION_POINTS - (mistakes || 0) * MISTAKE_DEDUCTION;
    const floored = raw < 0 ? 0 : raw;
    return Math.round(floored * 100) / 100;
}

/**
 * نتيجة جولة واحدة بناءً على نقاط الطالبين فيها بعد كل الخصومات.
 * يُرجع 'A' أو 'B' أو 'tie'.
 */
export function computeRoundWinner(scoreA, scoreB) {
    if (scoreA > scoreB) return 'A';
    if (scoreB > scoreA) return 'B';
    return 'tie';
}

/**
 * تجميع نتيجة المواجهة الكاملة من مصفوفة الجولات الثلاث (كل عنصر لازم يحوي
 * scoreA و scoreB على الأقل — roundWinner يُحسَب هنا لو لم يكن محسوباً مسبقاً).
 */
export function computeSeriesResult(rounds) {
    let roundsWonA = 0, roundsWonB = 0, roundsTied = 0;
    let totalPointsA = 0, totalPointsB = 0;

    (rounds || []).forEach(r => {
        const scoreA = r.scoreA || 0;
        const scoreB = r.scoreB || 0;
        totalPointsA += scoreA;
        totalPointsB += scoreB;

        const winner = r.roundWinner || computeRoundWinner(scoreA, scoreB);
        if (winner === 'A') roundsWonA++;
        else if (winner === 'B') roundsWonB++;
        else roundsTied++;
    });

    let result = 'tie';
    if (roundsWonA > roundsWonB) result = 'A_win';
    else if (roundsWonB > roundsWonA) result = 'B_win';
    // تعادل عدد الجولات → تعادل رسمي للمواجهة كلها (مقبول كنتيجة نهائية حسب قرار المعلم)

    return {
        roundsWonA, roundsWonB, roundsTied,
        totalPointsA: Math.round(totalPointsA * 100) / 100,
        totalPointsB: Math.round(totalPointsB * 100) / 100,
        result
    };
}

/**
 * 🌟 [جديد] خلط عشوائي عادل لمصفوفة (خوارزمية Fisher–Yates الصحيحة، وليست
 * `.sort(() => 0.5 - Math.random())` المنحازة إحصائياً المستخدمة في أماكن أخرى من المنصة —
 * راجع ملاحظة "توصيات تكامل عامة" في مستند "تصميم-نظام-الاختبارات-المقترح.md" التي تشير لهذا
 * التحيّز صراحة). دالة خالصة لا تُعدِّل المصفوفة الأصلية، بل تُرجع نسخة جديدة مخلوطة — تُستخدَم
 * في dual-test-play.js لعشوائية ترتيب ظهور الأسئلة الأساسية على لوحة اللعب لكل جولة (طلب صريح
 * من المعلم: ترتيب الأسئلة أمام الطالبَين يجب ألا يطابق ترتيب إدخالها في شاشة الإعداد).
 */
export function shuffleArray(arr) {
    const result = (arr || []).slice();
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

/**
 * توليد رمز سؤال استبدال جديد مستقل (⭐1، ⭐2...) — غير مرتبط بلاعب أول/ثانٍ، الطالب نفسه
 * يختار أي رمز يريده من مجموعة أسئلة الاستبدال المتاحة وقت طلب التبديل.
 */
export function generateSwapCode(existingSwapQuestions) {
    const count = (existingSwapQuestions || []).length;
    return `⭐${count + 1}`;
}

/**
 * 🌟 [مُحدَّث] تسمية نطاق سؤال (سواء أساسي أو احتياطي) بصيغة "سمّع من ... إلى ...".
 * بعد توضيح المعلم أنه يكتب نص "من"/"إلى" بنفسه يدوياً (نص حر، وليس اختياراً من قوائم
 * سور/آيات منسدلة)، أصبح السؤال {fromText, toText} بدل {fromSurah, fromAyah, toSurah,
 * toAyah} القديمة — الدالة أبسط الآن، مجرد تنسيق النصين بالصيغة الثنائية اللغة المعتادة.
 */
export function formatQuestionRange(question, lang = 'ar') {
    if (!question) return '';
    const from = question.fromText || '';
    const to = question.toText || '';
    if (lang === 'ar') {
        return `سمّع من: ${from} — إلى: ${to}`;
    }
    return `Recite from: ${from} — to: ${to}`;
}

/**
 * تحقق أساسي من اكتمال سؤال واحد (الحقلان النصيان "من"/"إلى" مكتوبان وغير فارغين).
 */
export function isQuestionComplete(question) {
    if (!question) return false;
    return !!(question.fromText && question.fromText.trim()) && !!(question.toText && question.toText.trim());
}

/**
 * 🌟 [ملاحظة] لم تعد هذه الدالة مُفعَّلة كشرط إجباري لحفظ الاختبار كـ"جاهز" — المعلم صرَّح
 * صراحة أنه لا يلتزم بإضافة كل أسئلة الجولات الثلاث دفعة واحدة (ممكن يضيف أسئلة الجولة
 * الثانية بعد أسبوع أو شهر مثلاً)، فأصبح الحفظ كـ"جاهز" متاحاً في أي وقت بلا أي شرط اكتمال.
 * الدالة نفسها أُبقيت هنا (غير مستخدمة حالياً في شاشة الإعداد) تحسّباً لاستخدام مستقبلي
 * اختياري (مثلاً تنبيه لطيف غير مانع عند بدء مواجهة لجولة فارغة تماماً من الأسئلة).
 */
export function isTestReadyForPublish(test) {
    if (!test || !Array.isArray(test.rounds) || test.rounds.length !== 3) return false;
    return test.rounds.every(round => {
        const mains = round.mainQuestions || [];
        const swaps = round.swapQuestions || [];
        if (mains.length === 0) return false;
        return mains.every(isQuestionComplete) && swaps.every(isQuestionComplete);
    });
}

// ============================================================================
// 🌟 [جديد بالكامل] نظام الأوسمة/الإنجازات — بطلب المعلم "شيء مميز" يُحفَظ في ملف الطالب
// بعد إتمام المواجهة. هذه مجموعة أولية (4 أوسمة) اخترتها كنقطة بداية معقولة — افتراض صريح
// غير محسوم بتوضيح مباشر من المعلم، قابل للتعديل أو التوسعة متى طلب ذلك:
//   🥇 أول نزال       — أول مواجهة مكتملة للطالب على الإطلاق (مرة واحدة فقط).
//   🌟 أداء مثالي      — فوز بكل الجولات الثلاث بلا أي خطأ في المواجهة كلها (قابل للتكرار).
//   💎 بلا تبديل       — فوز بالمواجهة كاملة دون استخدام حق التبديل في أي جولة (قابل للتكرار).
//   🔥 سلسلة انتصارات — كل مضاعفات الثلاثة من الانتصارات المتتالية (3، 6، 9...) عبر كل
//      مواجهات الطالب (قابل للتكرار في كل مرة يصل فيها لمضاعف جديد).
// ============================================================================

// 🌟 بيانات وصفية للأوسمة (الأيقونة + مفاتيح ترجمة للاسم والوصف) — تُستخدَم في شاشة اللعب
// (بطاقة إعلان الوسام) وملف الطالب الشخصي معاً، حتى لا يتكرر تعريفها في أكثر من مكان
export const BADGE_CATALOG = {
    first_duel: { icon: '🥇', nameKey: 'badge_first_duel_name', descKey: 'badge_first_duel_desc', repeatable: false },
    perfect_performance: { icon: '🌟', nameKey: 'badge_perfect_name', descKey: 'badge_perfect_desc', repeatable: true },
    no_swap_win: { icon: '💎', nameKey: 'badge_no_swap_name', descKey: 'badge_no_swap_desc', repeatable: true },
    win_streak: { icon: '🔥', nameKey: 'badge_streak_name', descKey: 'badge_streak_desc', repeatable: true }
};

/**
 * نتيجة مواجهة واحدة (فوز/خسارة/تعادل) من منظور طالب معيّن بمعرّفه — يُرجع null لو المواجهة
 * غير مكتملة أو الطالب ليس طرفاً فيها أصلاً.
 */
export function studentOutcomeInMatch(match, studentId) {
    if (!match || match.status !== 'completed') return null;
    const sid = String(studentId);
    let side = null;
    if (String(match.studentIdA) === sid) side = 'A';
    else if (String(match.studentIdB) === sid) side = 'B';
    if (!side) return null;

    if (match.result === 'tie') return 'tie';
    if (match.result === 'A_win') return side === 'A' ? 'win' : 'loss';
    if (match.result === 'B_win') return side === 'B' ? 'win' : 'loss';
    return null;
}

/**
 * تقييم الأوسمة التي يستحقها طالب معيّن فور إتمام مواجهة (currentMatch) بناءً على هذه
 * المواجهة نفسها وكل محفوظات مواجهاته السابقة (allMatches). دالة حسابية خالصة (لا تلمس
 * IndexedDB نفسها) — الاستدعاء الفعلي وحفظ النتيجة يتم من dualtests/dual-test-play.js عبر
 * database/dualTestAchievementsDB الملحق بـ DualTestsManager.
 * تُرجع مصفوفة عناصر {badgeKey, meta?} — فارغة لو لم يستحق الطالب أي وسام هذه المرة.
 */
export function evaluateMatchAchievements(studentId, currentMatch, allMatches) {
    const sid = String(studentId);
    const side = String(currentMatch.studentIdA) === sid ? 'A' : 'B';
    const earned = [];

    const studentMatches = (allMatches || [])
        .filter(m => m.status === 'completed' && (String(m.studentIdA) === sid || String(m.studentIdB) === sid))
        .sort((a, b) => new Date(a.finishedAt) - new Date(b.finishedAt));

    // 🥇 أول مواجهة مكتملة للطالب (currentMatch نفسها لازم تكون ضمن allMatches بعد حفظها)
    if (studentMatches.length === 1) {
        earned.push({ badgeKey: 'first_duel' });
    }

    // 🌟 أداء مثالي: فوز بكل الجولات الثلاث + صفر أخطاء في المواجهة كلها
    const roundsWon = side === 'A' ? currentMatch.roundsWonA : currentMatch.roundsWonB;
    const totalMistakes = (currentMatch.rounds || [])
        .reduce((sum, r) => sum + (side === 'A' ? (r.mistakesA || 0) : (r.mistakesB || 0)), 0);
    if (roundsWon === 3 && totalMistakes === 0) {
        earned.push({ badgeKey: 'perfect_performance' });
    }

    // 💎 فوز بالمواجهة كاملة دون استخدام حق التبديل في أي جولة من الثلاث
    const wonMatch = currentMatch.result === (side === 'A' ? 'A_win' : 'B_win');
    const usedSwapEver = (currentMatch.rounds || []).some(r => side === 'A' ? r.swapUsedA : r.swapUsedB);
    if (wonMatch && !usedSwapEver) {
        earned.push({ badgeKey: 'no_swap_win' });
    }

    // 🔥 سلسلة انتصارات متتالية — يُمنَح فقط عند الوصول لمضاعف جديد من 3 (3، 6, 9...)
    // تفادياً لتكرار منح نفس نوع الوسام في كل مواجهة بعد تخطي السلسلة الأولى
    let streak = 0;
    for (let i = studentMatches.length - 1; i >= 0; i--) {
        if (studentOutcomeInMatch(studentMatches[i], sid) === 'win') streak++;
        else break;
    }
    if (streak > 0 && streak % 3 === 0) {
        earned.push({ badgeKey: 'win_streak', meta: { streak } });
    }

    return earned;
}
