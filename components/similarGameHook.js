// components/similarGameHook.js
//
// 🌟 [جديد — 2026-10-11] ربط «أسئلة المتشابهات» بألعاب الصغار والكبار (سؤال لكل 10 أسئلة، بطلب المعلم).
// المنطق النقي في engine/similarityInject.js؛ هنا فقط: قراءة المجموعات من قاعدة المتشابهات، حقن الطابور، وتنسيق السؤال
// بشكل البيانات الذي تعرضه كل لعبة (الصغار: kids_mcq بأزرار اختيار، الكبار: سؤال شفهي يقيّمه المعلم مع عرض الخيارات).
// أي فشل (لا مدير متشابهات، نطاق بلا مجموعات...) يترك الطابور كما هو تماماً فتستمر اللعبة بلا هذه الأسئلة.
import { AppState, t, tf, surahNameLocal } from '../core/app.js';
import { similarCountFor, buildSimilarQuestions, injectIntoQueue, cleanOccurrenceText } from '../engine/similarityInject.js';
import { toQuranicSukun } from '../engine/quranEngine.js';

// 🌟 كل نص قرآني معروض هنا يمر على السكون القرآني (U+06E1) كباقي المنصة (راجع cleanAyahText في quranEngine.js)،
// فتظهر آيات المتشابهات بنفس رسم بقية الألعاب والواجبات والتقارير.
const qtext = (s) => toQuranicSukun(cleanOccurrenceText(s));

export async function injectSimilarQuestions(queue, pool, qCount, kids) {
    try {
        const count = similarCountFor(qCount);
        if (!count || !AppState.similaritiesManager) return queue;
        if (AppState.similaritiesReady) await AppState.similaritiesReady;
        const allGroups = await AppState.similaritiesManager.getAllSimilarities();
        const ayahCountOf = (n) => {
            const s = (AppState.surahsData || []).find(x => x.number === n);
            return s ? s.ayahsCount : null;
        };
        const sims = buildSimilarQuestions({ allGroups, pool, count, kids, ayahCountOf });
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
// أزرار الاختيار: أرقام الآيات تُعرض «الآية 3» (optionsKind: 'sim_ayah')، وأسماء السور «سورة X» (optionsKind: 'sim_surah')
export function formatKidsSimilar(sim, pool) {
    if (!sim || sim.kind !== 'sim_position') return null;
    const internal = sim.scope === 'internal';
    const o = sim.occurrence;
    const text = qtext(o.fullText);
    const inSurah = internal ? `<div style="font-size:1.8rem; font-weight:bold; margin-top:14px;">${tf('sim_inj_in_surah', { surah: surahLabel(o.surahName) })}</div>` : '';
    const options = internal ? [...sim.options].sort((a, b) => Number(a) - Number(b)) : sim.options;
    return {
        type: 'kids_mcq',
        questionTitle: internal ? 'في أي آية من المتشابهات؟ 🔢' : 'في أي سورة من المتشابهات؟ 🌟',
        questionBody: `<div class="quran-text" style="font-size:3.5rem; color:#0284c7; line-height:1.6;">﴿ ${text} ﴾</div>${inSurah}`,
        correctAns: sim.correctAnswer, options, optionsKind: internal ? 'sim_ayah' : 'sim_surah',
        ayahObj: ayahObjFor(sim, pool), reportText: text, simKind: sim.kind, simGroupId: sim.groupId
    };
}

// تسمية خيار للصغار (يستعملها kidsGame.js عند رسم الأزرار)
export function kidsSimilarOptionLabel(opt, kind) {
    if (kind === 'sim_ayah') return tf('sim_inj_ayah_label', { n: opt });
    return tf('sim_inj_surah_label', { name: surahLabel(opt) });
}

// ---------------- الكبار ----------------
// سؤال المتشابهات في لعبة الكبار: خياراته أزرار يضغطها الطالب فتُقيَّم إجابته تلقائياً (راجع adultGame.js).
const LETTERS_AR = ['أ', 'ب', 'ج', 'د'];
const LETTERS_EN = ['A', 'B', 'C', 'D'];

export function formatAdultSimilar(sim, pool) {
    if (!sim) return null;
    const o = sim.occurrence;
    const internal = sim.scope === 'internal';
    const letters = AppState.currentLang === 'en' ? LETTERS_EN : LETTERS_AR;
    const surah = surahLabel(o.surahName);
    const clean = qtext;
    let question, shown, optionLabel, correctLabel;
    if (sim.kind === 'sim_position') {
        question = internal ? tf('sim_inj_q_ayah', { surah }) : t('sim_inj_q_surah');
        shown = clean(o.fullText);
        optionLabel = (v) => internal ? tf('sim_inj_ayah_label', { n: v }) : tf('sim_inj_surah_label', { name: surahLabel(v) });
    } else if (sim.kind === 'sim_discrimination') {
        question = internal ? tf('sim_inj_q_disc_ayah', { n: o.ayahNumber, surah }) : tf('sim_inj_q_disc_surah', { surah });
        shown = qtext(sim.anchorPhrase);
        optionLabel = (v) => qtext(v);
    } else if (sim.kind === 'sim_recall') {
        question = internal ? tf('sim_inj_q_recall_ayah', { n: o.ayahNumber, surah }) : tf('sim_inj_q_recall_surah', { surah });
        shown = qtext(sim.anchorPhrase);
        optionLabel = (v) => clean(v);
    } else return null;

    const options = internal && sim.kind === 'sim_position' ? [...sim.options].sort((a, b) => Number(a) - Number(b)) : sim.options;
    const isQuran = sim.kind !== 'sim_position';
    // 🌟 [تعديل] كل خيار صار زراً يضغطه الطالب فتُسجَّل إجابته (صحيحة أو خاطئة) تلقائياً — يربطها adultGame.js عبر .sim-opt-btn
    const lines = options.map((opt, i) => {
        const lbl = optionLabel(opt);
        const cls = isQuran ? 'btn btn-outline sim-opt-btn quran-text' : 'btn btn-outline sim-opt-btn';
        const size = sim.kind === 'sim_recall' ? '1.7rem' : '2rem';
        return `<button type="button" class="${cls}" data-idx="${i}" style="display:block; width:100%; font-size:${size}; margin:12px 0; padding:12px 16px; text-align:center;"><b>${letters[i]})</b> ${isQuran ? '﴿ ' + lbl + ' ﴾' : lbl}</button>`;
    }).join('');
    const correctIndex = options.findIndex(opt => String(opt) === String(sim.correctAnswer));
    correctLabel = isQuran ? '﴿ ' + optionLabel(sim.correctAnswer) + ' ﴾' : optionLabel(sim.correctAnswer);
    const body = `<div style="font-size:1.6rem; font-weight:bold; margin-bottom:12px;">${question}</div>` +
        `<div class="quran-text" style="font-size:3rem; margin:10px 0 16px;">﴿ ${shown} ﴾</div>` +
        `<div style="max-width:760px; margin:0 auto;">${lines}</div>`;
    return {
        type: 'similar', questionTitle: 'من المتشابهات 🔀', questionBody: body,
        correctIndex, optionTexts: options.map(o => String(optionLabel(o)).replace(/<[^>]*>/g, '')),
        fullAnswer: optionLabel(sim.correctAnswer),
        answerHTML: `<span class="quran-text" style="font-size:1.8rem;">${correctLabel}</span>`,
        ayahObj: ayahObjFor(sim, pool), reportText: clean(o.fullText), simKind: sim.kind, simGroupId: sim.groupId
    };
}
