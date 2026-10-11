// engine/similarityInject.js
//
// 🌟 [جديد — 2026-10-11] حقن أسئلة المتشابهات داخل ألعاب الصغار والكبار (بطلب المعلم: سؤال لكل 10 أسئلة).
// منطق بحت (بلا DOM ولا i18n) فيُختبر مباشرة بـ Node. يعيد استخدام مولّدات engine/similarityEngine.js كما هي،
// ويضيف: (1) اختيار المجموعات التي يقع موضعٌ منها داخل نطاق الطالب، (2) تكميل خيارات «من أي سورة/آية؟» إلى 3
// بمشتتات دخيلة معقولة (بطلب المعلم، لأن المجموعة ذات الموضعين تعطي خيارين فقط = تخمين 50%)، (3) سؤال لكل مجموعة
// مختلفة. الناتج كائنات JSON خالصة تُخزَّن في طابور اللعبة (فتنجو من «استكمال اختبار معلّق») وتُنسَّق للعرض عند دورها.
//
// الأنواع: الصغار = «الربط بالموضع» فقط (أبسط وأنسب). الكبار = الموضع + التمييز + الاستدعاء الموجّه.
import {
    generatePositionQuestions, generateDiscriminationQuestions, generateGuidedRecallQuestions
} from './similarityEngine.js';

const TARGET_OPTIONS = 3;

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
    return (allGroups || []).filter(g => g && (g.occurrences || []).length >= 2 &&
        g.occurrences.some(o => index.has(keyOf(o.surahNumber, occurrenceFirstAyah(o)))));
}

// تكميل خيارات «الموضع» إلى 3. ayahCountOf(surahNumber) → عدد آيات السورة (للمتشابهات الداخلية)
export function padPositionOptions(simQ, group, allGroups, ayahCountOf) {
    if (!simQ || simQ.type !== 'sim_position' || simQ.options.length >= TARGET_OPTIONS) return simQ;
    const need = TARGET_OPTIONS - simQ.options.length;
    const have = new Set(simQ.options.map(String));
    let extra = [];
    if (group.scope === 'internal') {
        const count = ayahCountOf ? ayahCountOf(simQ.occurrence.surahNumber) : null;
        if (!count) return simQ;
        // لا نستخدم أي رقم آية هو موضع حقيقي في المجموعة نفسها، ونفضّل الأرقام القريبة (±6) لأنها الأكثر إرباكاً
        const real = new Set(group.occurrences.map(o => String(o.ayahNumber)));
        const all = [];
        for (let n = 1; n <= count; n++) if (!real.has(String(n)) && !have.has(String(n))) all.push(n);
        const center = simQ.correctAnswer;
        const near = shuffle(all.filter(n => Math.abs(n - center) <= 6));
        const far = shuffle(all.filter(n => Math.abs(n - center) > 6));
        extra = [...near, ...far].slice(0, need);
    } else {
        const own = new Set(group.occurrences.map(o => o.surahName));
        const names = [...new Set((allGroups || []).filter(g => g.scope === 'juzAmma')
            .flatMap(g => g.occurrences.map(o => o.surahName)).filter(Boolean))]
            .filter(n => !own.has(n) && !have.has(n));
        extra = shuffle(names).slice(0, need);
    }
    return { ...simQ, options: shuffle([...simQ.options, ...extra]), padded: extra.length > 0 };
}

function candidatesFor(group, kids) {
    return kids
        ? generatePositionQuestions(group)
        : [...generatePositionQuestions(group), ...generateDiscriminationQuestions(group), ...generateGuidedRecallQuestions(group)];
}

// يبني حتى `count` سؤالاً، كل واحد من مجموعة مختلفة، والموضع المسؤول عنه داخل النطاق.
// يرجع كائنات JSON: { type, kind:'sim_*', groupId, anchorPhrase, scope, occurrence:{...}, options, correctAnswer }
export function buildSimilarQuestions({ allGroups, pool, count, kids, ayahCountOf }) {
    if (!count || count <= 0) return [];
    const index = new Set((pool || []).map(a => keyOf(a.surahNumber, a.numberInSurah)));
    const inPool = (o) => index.has(keyOf(o.surahNumber, occurrenceFirstAyah(o)));
    const out = [];
    for (const g of shuffle(eligibleGroups(allGroups, pool))) {
        if (out.length >= count) break;
        const cands = shuffle(candidatesFor(g, kids).filter(q => q.occurrence && inPool(q.occurrence) &&
            new Set(q.options.map(String)).size === q.options.length && q.options.map(String).includes(String(q.correctAnswer))));
        if (!cands.length) continue;
        let q = padPositionOptions(cands[0], g, allGroups, ayahCountOf);
        // احتياط (كما في الواجب): لو ظهرت العبارة المشتركة في خيار واحد فقط من خيارات «التمييز» لكشفت الإجابة
        if (q.type === 'sim_discrimination' && q.options.filter(o => String(o).includes(q.anchorPhrase)).length === 1) continue;
        out.push({
            kind: q.type, groupId: q.groupId, anchorPhrase: q.anchorPhrase, scope: q.scope,
            occurrence: {
                surahNumber: q.occurrence.surahNumber, surahName: q.occurrence.surahName,
                ayahNumber: occurrenceFirstAyah(q.occurrence), fullText: q.occurrence.fullText
            },
            options: q.options.map(String), correctAnswer: String(q.correctAnswer)
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
