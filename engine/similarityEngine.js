// engine/similarityEngine.js
//
// 🌟 [إعادة كتابة — أسئلة المتشابهات] استُبدلت الأنواع الخمسة القديمة (الموضع/التمييز/منع الخلط/التعرّف/الاستدعاء)
// بنوعين بصياغة معتمدة من المعلم، يولّدها engine/similarityQuestions.js (منطق بحت يُختبر بـ Node على القرآن كله):
//   sim_surah    من أي سورة؟          (جزء عمّ، متعددة السور)
//   sim_complete أكمل الآية            (مطلع + نهايات المتشابهات الحقيقية)
//   (حُذف «ماذا بعدها؟/ما قبلها؟»: ترتيب مكرر لأسئلة السابقة واللاحقة، والغرض هنا تمييز الآية عن شبيهتها في سورة أخرى)
// لا رقم آية في السؤال ولا الخيارات؛ ونص الآيات يُقرأ من مصحف المنصة لا من حقل fullText في بيانات المجموعات.
// هذا الملف يبقى الواجهة التي تستهلكها الشاشات: بناء جولة لعب، وتحويل السؤال لسؤال واجب (mcq).
//
// ⚠️ يلزم تحميل المصحف مرة واحدة قبل التوليد: await ensureSimilarityQuran(AppState.quranEngine) (راجع similarityQuestions.js).
import {
    generateGroupQuestions, getSimilarityQuran, SIM_TYPES, SIM_TYPE_LABELS
} from './similarityQuestions.js';
export { SIM_TYPES, SIM_TYPE_LABELS };

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// عدّاد توزيع موضع الجواب الصحيح بين الخيارات بالتساوي عبر كل الأسئلة المولَّدة في الجلسة
const posRef = { n: Math.floor(Math.random() * 4) };

// أسئلة مجموعة واحدة (حتى 4)؛ مصفوفة فارغة إن لم يُحمَّل المصحف أو لم تكفِ بيانات المجموعة
export function generateQuestionsForGroup(group) {
    const Q = getSimilarityQuran();
    if (!Q || !group) return [];
    try { return generateGroupQuestions(Q, group, { rng: Math.random, posRef }).questions; }
    catch (err) { console.warn('تعذّر توليد أسئلة المجموعة', group && group.groupId, err); return []; }
}

// ============================================================
// بناء جولة لعب من مجموعة أو أكثر
// ============================================================
// سقف 18 سؤالاً للجولة الواحدة (بطلب المعلم): جزء كامل قد يحوي عشرات المجموعات فيطول اللعب على الطفل. تُختار الأسئلة
// عشوائياً من كل ما يُولَّد، فتتغيّر العينة في «العب مرة أخرى». (المعامل الثاني قديم ومتروك للتوافق.)
const MAX_ROUND_QUESTIONS = 18;

// 🌟 مفتاح تشغيل أسئلة «المتشابهات داخل السورة» (scope === 'internal') في كل المنصة. عُطّل سابقاً بطلب المعلم لحين إصلاح
// الأسئلة؛ وفُعّل (2026-10-15) بعد إعادة توليدها ومراجعتها على القرآن كله. غيّره إلى false لإيقافها مؤقتاً.
export const INTERNAL_SIM_QUESTIONS_ENABLED = true;
const isDisabledScope = (g) => !INTERNAL_SIM_QUESTIONS_ENABLED && g && g.scope === 'internal';
export { isDisabledScope as isSimScopeDisabled };

export function buildGameRound(groups) {
    const list = (Array.isArray(groups) ? groups : (groups ? [groups] : [])).filter(g => !isDisabledScope(g));
    let all = [];
    list.forEach(g => { all = all.concat(generateQuestionsForGroup(g)); });
    const shuffled = shuffle(all);
    const questions = shuffled.slice(0, MAX_ROUND_QUESTIONS);
    return {
        groupIds: list.map(g => g && g.groupId).filter(Boolean),
        questions,
        hasEnoughData: questions.length > 0,
        totalAvailable: shuffled.length
    };
}

// ============================================================
// تحويل سؤال متشابهات إلى سؤال واجب (mcq) — للواجب الذكي
// ============================================================
// الواجب يُصحَّح آلياً بنوع 'mcq' (title/text/options/correctAnswer نصوص)، فنحوّل السؤال إلى هذا الشكل بلا تعديل على التصحيح.
export function toHomeworkQuestion(simQ) {
    if (!simQ || !Array.isArray(simQ.options) || simQ.options.length < 3 || !SIM_TYPES.includes(simQ.type)) return null;
    // الطالب يرى الخيارات المقصوصة (أول ~12 كلمة)، ولا يتطابق منها خياران (مضمون في المولّد)، والتصحيح بمطابقة النص المعروض
    const shown = (simQ.optionsDisplay && simQ.optionsDisplay.length === simQ.options.length ? simQ.optionsDisplay : simQ.options).map(String);
    const idx = simQ.options.map(String).indexOf(String(simQ.correctAnswer));
    if (idx < 0 || new Set(shown).size !== shown.length) return null;
    return {
        type: 'mcq', title: 'من المتشابهات: ' + SIM_TYPE_LABELS[simQ.type], text: simQ.text, options: shown, correctAnswer: shown[idx], points: 1,
        simGroupId: simQ.groupId, simKind: simQ.type
    };
}

// سؤال واجب واحد من مجموعة متشابهات (نوعه عشوائي من الأنواع الممكنة لها)، أو null لو بياناتها لا تكفي.
export function buildHomeworkSimilarityQuestion(group) {
    if (isDisabledScope(group)) return null;
    for (const c of shuffle(generateQuestionsForGroup(group))) {
        const q = toHomeworkQuestion(c);
        if (q) return q;
    }
    return null;
}
