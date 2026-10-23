// engine/similarityEngine.js
//
// 🌟 [إعادة كتابة — أسئلة المتشابهات] استُبدلت الأنواع الخمسة القديمة (الموضع/التمييز/منع الخلط/التعرّف/الاستدعاء)
// بنوعين بصياغة معتمدة من المعلم، يولّدها engine/similarityQuestions.js (منطق بحت يُختبر بـ Node على القرآن كله):
//   sim_pair     في أي سورتين؟        (الأجزاء 26–30: العبارة وردت في سورتين بالضبط ضمن جزء عمّ أو الأجزاء الخمسة الأخيرة)
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
// match=false (الافتراضي): بلا «صِل الآية بسورتها» لأنه لا يصلح لأزرار الاختيار في الألعاب؛ الواجب وحده يطلبه
export function generateQuestionsForGroup(group, { match = false, types = null } = {}) {
    const Q = getSimilarityQuran();
    if (!Q || !group) return [];
    try { return generateGroupQuestions(Q, group, { rng: Math.random, posRef, match, types }).questions; }
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

// 🌟 [2026-10-23] بطلب المعلم: الأنواع المعروضة للطالب في الألعاب هي «في أي سورتين؟» و«أي سورة لم ترد؟» (و«اقرأ الآية من السورة المذكورة» من recallQuestions).
// بقية الأنواع (sim_which / sim_complete) تبقى مولَّدة ومحفوظة في الشيفرة لكن لا تظهر في الألعاب؛ الواجب المنزلي لا يتأثر. للتفعيل أضفها هنا.
export const STUDENT_SIM_TYPES = ['sim_pair', 'sim_notin'];

export function buildGameRound(groups) {
    const list = (Array.isArray(groups) ? groups : (groups ? [groups] : [])).filter(g => !isDisabledScope(g));
    let all = [];
    list.forEach(g => { all = all.concat(generateQuestionsForGroup(g, { types: STUDENT_SIM_TYPES })); });
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
    if (simQ && simQ.type === 'sim_match' && simQ.match) {
        const m = simQ.match;
        if (!m.left || m.left.length < 3 || m.right.length !== m.left.length) return null;
        return {
            type: 'matching', title: 'من المتشابهات: ' + SIM_TYPE_LABELS.sim_match, text: simQ.text,
            leftItems: m.left, rightItems: m.right, correctAnswer: m.pairs, points: m.pairs.length, needsManualGrading: false,
            leftTitle: 'الآيات', rightTitle: 'السور', matchHint: 'اضغط على آية، ثم على السورة التي وردت فيها. اضغط على أي بطاقة مربوطة لفك ربطها.',
            simGroupId: simQ.groupId, simKind: simQ.type
        };
    }
    if (!simQ || !Array.isArray(simQ.options) || simQ.options.length < (simQ.type === 'sim_which' ? 2 : 3) || !SIM_TYPES.includes(simQ.type)) return null;
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
    // «صِل الآية بسورتها» يحتاج مجموعة من ثلاث سور فأكثر، وهو يزاحم بقية الأنواع في الاختيار، فنجرّبه أولاً بنسبة معقولة
    if (Math.random() < 0.4) {
        const m = generateQuestionsForGroup(group, { match: true, types: ['sim_match'] }).map(toHomeworkQuestion).find(Boolean);
        if (m) return m;
    }
    for (const c of shuffle(generateQuestionsForGroup(group, { match: true }))) {
        const q = toHomeworkQuestion(c);
        if (q) return q;
    }
    return null;
}
