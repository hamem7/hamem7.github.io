// engine/similarityInject.js
//
// 🌟 حقن أسئلة المتشابهات داخل ألعاب الصغار والكبار (بطلب المعلم: سؤال لكل 10 أسئلة).
// منطق بحت (بلا DOM ولا i18n) فيُختبر مباشرة بـ Node. يعيد استخدام مولّد الأسئلة الأربعة المعتمد
// (engine/similarityQuestions.js عبر similarityEngine.generateQuestionsForGroup) ويضيف: (1) اختيار المجموعات التي يقع
// موضعٌ منها داخل نطاق الطالب، (2) سؤال لكل مجموعة مختلفة. الناتج كائنات JSON خالصة تُخزَّن في طابور اللعبة (فتنجو من
// «استكمال اختبار معلّق») وتُنسَّق للعرض عند الحاجة (components/similarGameHook.js).
//
// الأنواع: الصغار = «من أي سورة؟» و«ماذا بعدها؟» (الأبسط)، الكبار = الأنواع الأربعة كلها.
// ⚠️ يلزم تحميل المصحف قبل الاستدعاء (ensureSimilarityQuran) وإلا لا تُولَّد أسئلة.
import { generateQuestionsForGroup, isSimScopeDisabled } from './similarityEngine.js';
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// عدد الأسئلة المحقونة: سؤال لكل 10 (10 → 1، 20 → 2...) وبحدٍّ أدنى سؤال لأي جلسة من 5 أسئلة فأكثر
export const similarCountFor = (n) => (n >= 5 ? Math.max(1, Math.round(n / 10)) : 0);

// أول آية في موضع (ayahNumber مفرد أو بداية ayahRange مثل "15-19" أو "8...19")
export function occurrenceFirstAyah(o) {
    if (!o) return null;
    const n = o.ayahNumber != null ? Number(o.ayahNumber) : parseInt(o.ayahRange, 10);
    return Number.isFinite(n) ? n : null;
}

const keyOf = (surahNumber, ayah) => `${surahNumber}:${ayah}`;

// نص الموضع للعرض: بدون علامة رقم الآية ﴿١٥﴾ (لأنها قد تكشف الإجابة في «في أي آية؟» وتتكرر مع أقواس العرض)
export function cleanOccurrenceText(txt) {
    return String(txt || '').replace(/\s*﴿[\d٠-٩]+﴾\s*/g, ' ').replace(/\s+/g, ' ').trim();
}

// المجموعات التي فيها موضعان على الأقل وموضع واحد على الأقل داخل نطاق الطالب (pool = آياته بحقول surahNumber/numberInSurah)
export function eligibleGroups(allGroups, pool) {
    const index = new Set((pool || []).map(a => keyOf(a.surahNumber, a.numberInSurah)));
    return (allGroups || []).filter(g => g && !isSimScopeDisabled(g) && (g.occurrences || []).length >= 2 &&
        g.occurrences.some(o => index.has(keyOf(o.surahNumber, occurrenceFirstAyah(o)))));
}

const KIDS_TYPES = new Set(['sim_surah', 'sim_next']);

// يبني حتى `count` سؤالاً، كل واحد من مجموعة مختلفة، والموضع المسؤول عنه داخل النطاق.
// يرجع كائنات JSON: { kind:'sim_*', groupId, anchorPhrase, scope, text, options, optionsDisplay (للعرض، مقصوصة)، correctAnswer, correctIndex, ref, occurrence:{...} }
export function buildSimilarQuestions({ allGroups, pool, count, kids }) {
    if (!count || count <= 0) return [];
    const index = new Set((pool || []).map(a => keyOf(a.surahNumber, a.numberInSurah)));
    const inPool = (o) => index.has(keyOf(o.surahNumber, o.ayahNumber));
    const out = [];
    for (const g of shuffle(eligibleGroups(allGroups, pool))) {
        if (out.length >= count) break;
        const cands = shuffle(generateQuestionsForGroup(g).filter(q => inPool(q.occurrence) && (!kids || KIDS_TYPES.has(q.type))));
        if (!cands.length) continue;
        const q = cands[0];
        out.push({
            kind: q.type, groupId: q.groupId, anchorPhrase: q.anchorPhrase, scope: q.scope,
            text: q.text, options: q.options.map(String), optionsDisplay: (q.optionsDisplay || q.options).map(String), correctAnswer: String(q.correctAnswer), correctIndex: q.correctIndex, ref: q.ref,
            occurrence: { ...q.occurrence }
        });
    }
    return out;
}

// يضع الأسئلة في خانات عشوائية من الطابور (تستبدل خانة عادية بخانة type:'similar' تحمل السؤال). لا تغيّر طول الطابور.
export function injectIntoQueue(queue, simQuestions) {
    if (!Array.isArray(queue) || !simQuestions || !simQuestions.length) return queue;
    const slots = shuffle(queue.map((_, i) => i)).slice(0, simQuestions.length);
    slots.forEach((slot, k) => { queue[slot] = { ...queue[slot], type: 'similar', sim: simQuestions[k] }; });
    return queue;
}
