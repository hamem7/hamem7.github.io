// components/similarGameHook.js
//
// 🌟 [جديد — 2026-10-11] ربط «أسئلة المتشابهات» بألعاب الصغار والكبار (سؤال لكل 10 أسئلة، بطلب المعلم).
// المنطق النقي في engine/similarityInject.js؛ هنا فقط: قراءة المجموعات من قاعدة المتشابهات، حقن الطابور، وتنسيق السؤال
// بشكل البيانات الذي تعرضه كل لعبة (الصغار: kids_mcq بأزرار اختيار، الكبار: سؤال شفهي يقيّمه المعلم مع عرض الخيارات).
// أي فشل (لا مدير متشابهات، نطاق بلا مجموعات...) يترك الطابور كما هو تماماً فتستمر اللعبة بلا هذه الأسئلة.
import { AppState, t, tf, surahNameLocal } from '../core/app.js';
import { similarCountFor, buildSimilarQuestions, injectIntoQueue, cleanOccurrenceText } from '../engine/similarityInject.js';
import { ensureSimilarityQuran, questionTextToHTML } from '../engine/similarityQuestions.js';
import { toQuranicSukun } from '../engine/quranEngine.js';

// 🌟 كل نص قرآني معروض هنا يمر على السكون القرآني (U+06E1) كباقي المنصة (راجع cleanAyahText في quranEngine.js)،
// فتظهر آيات المتشابهات بنفس رسم بقية الألعاب والواجبات والتقارير.
const qtext = (s) => toQuranicSukun(cleanOccurrenceText(s));

export async function injectSimilarQuestions(queue, pool, qCount, kids) {
    try {
        const count = similarCountFor(qCount);
        if (!count || !AppState.similaritiesManager) return queue;
        if (AppState.similaritiesReady) await AppState.similaritiesReady;
        await ensureSimilarityQuran(AppState.quranEngine); // نص الآيات من مصحف المنصة
        const allGroups = await AppState.similaritiesManager.getAllSimilarities();
        const sims = buildSimilarQuestions({ allGroups, pool, count, kids });
        return injectIntoQueue(queue, sims);
    } catch (err) {
        console.warn('تعذّر حقن أسئلة المتشابهات في اللعبة:', err);
        return queue;
    }
}

// الآية الفعلية من نطاق الطالب (للتقرير ونقاط الضعف)، وإلا كائن مبسّط
function ayahObjFor(sim, pool) {
    const o = sim.occurrence;
    const hit = (pool || []).find(a => a.surahNumber === o.surahNumber && a.numberInSurah === o.ayahNumber);
    return hit || { surahNumber: o.surahNumber, surahName: o.surahName, numberInSurah: o.ayahNumber };
}

const surahLabel = (name) => surahNameLocal ? surahNameLocal(name) : name;

// ---------------- الصغار ----------------
// أزرار الاختيار: أسماء السور تُعرض «سورة X» (optionsKind: 'sim_surah')، وبقية الأنواع آيات داخل ﴿ ﴾ (الافتراضي)
export function formatKidsSimilar(sim, pool) {
    if (!sim || (sim.kind !== 'sim_surah' && sim.kind !== 'sim_next')) return null;
    const isSurah = sim.kind === 'sim_surah';
    return {
        type: 'kids_mcq',
        questionTitle: isSurah ? 'في أي سورة من المتشابهات؟ 🌟' : 'ماذا بعدها؟ من المتشابهات 🔀',
        questionBody: `<div style="font-size:2.2rem; line-height:1.9; color:#0284c7;">${questionTextToHTML(sim.text, toQuranicSukun)}</div>`,
        correctAns: sim.correctAnswer, options: sim.options, optionsKind: isSurah ? 'sim_surah' : undefined,
        ayahObj: ayahObjFor(sim, pool), reportText: qtext(sim.occurrence.fullText), simKind: sim.kind, simGroupId: sim.groupId
    };
}

// تسمية خيار للصغار (يستعملها kidsGame.js عند رسم الأزرار)
export function kidsSimilarOptionLabel(opt, kind) {
    return tf('sim_inj_surah_label', { name: surahLabel(opt) });
}

// ---------------- الكبار ----------------
// سؤال المتشابهات في لعبة الكبار: خياراته أزرار يضغطها الطالب فتُقيَّم إجابته تلقائياً (راجع adultGame.js).
const LETTERS_AR = ['أ', 'ب', 'ج', 'د'];
const LETTERS_EN = ['A', 'B', 'C', 'D'];
const ADULT_TITLES = { sim_surah: 'من أي سورة؟ 🔀', sim_complete: 'أكمل الآية 🔀', sim_next: 'ماذا بعدها؟ 🔀', sim_prev: 'ما الآية التي قبلها؟ 🔀' };

export function formatAdultSimilar(sim, pool) {
    if (!sim || !ADULT_TITLES[sim.kind]) return null;
    const letters = AppState.currentLang === 'en' ? LETTERS_EN : LETTERS_AR;
    const isSurah = sim.kind === 'sim_surah';
    const label = (v) => isSurah ? tf('sim_inj_surah_label', { name: surahLabel(v) }) : '﴿ ' + toQuranicSukun(v) + ' ﴾';
    const cls = isSurah ? 'btn btn-outline sim-opt-btn' : 'btn btn-outline sim-opt-btn quran-text';
    const size = isSurah ? '2rem' : '1.7rem';
    // 🌟 كل خيار زرٌّ يضغطه الطالب فتُسجَّل إجابته (صحيحة أو خاطئة) تلقائياً — يربطها adultGame.js عبر .sim-opt-btn
    const lines = sim.options.map((opt, i) =>
        `<button type="button" class="${cls}" data-idx="${i}" style="display:block; width:100%; font-size:${size}; margin:12px 0; padding:12px 16px; text-align:center;"><b>${letters[i]})</b> ${label(opt)}</button>`
    ).join('');
    const body = `<div style="font-size:2rem; line-height:1.9; margin:10px 0 16px;">${questionTextToHTML(sim.text, toQuranicSukun)}</div>` +
        `<div style="max-width:760px; margin:0 auto;">${lines}</div>`;
    const correctIndex = sim.options.findIndex(o => String(o) === String(sim.correctAnswer));
    return {
        type: 'similar', questionTitle: ADULT_TITLES[sim.kind], questionBody: body,
        correctIndex, optionTexts: sim.options.map(o => String(label(o)).replace(/<[^>]*>/g, '')),
        fullAnswer: label(sim.correctAnswer),
        answerHTML: `<span class="${isSurah ? '' : 'quran-text'}" style="font-size:1.8rem;">${label(sim.correctAnswer)}</span>`,
        ayahObj: ayahObjFor(sim, pool), reportText: qtext(sim.occurrence.fullText), simKind: sim.kind, simGroupId: sim.groupId
    };
}
