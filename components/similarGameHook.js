// components/similarGameHook.js
//
// 🌟 [جديد — 2026-10-11] ربط «أسئلة المتشابهات» بألعاب الصغار والكبار (سؤال لكل 10 أسئلة، بطلب المعلم).
// المنطق النقي في engine/similarityInject.js؛ هنا فقط: قراءة المجموعات من قاعدة المتشابهات، حقن الطابور، وتنسيق السؤال
// بشكل البيانات الذي تعرضه كل لعبة (الصغار: kids_mcq بأزرار اختيار، الكبار: سؤال شفهي يقيّمه المعلم مع عرض الخيارات).
// أي فشل (لا مدير متشابهات، نطاق بلا مجموعات...) يترك الطابور كما هو تماماً فتستمر اللعبة بلا هذه الأسئلة.
import { AppState, t, tf, surahNameLocal } from '../core/app.js';
import { similarCountFor, buildSimilarQuestions, injectIntoQueue, cleanOccurrenceText } from '../engine/similarityInject.js';
import { ensureSimilarityQuran, questionTextToHTML, localizedQuestionText, pairOptionLabel } from '../engine/similarityQuestions.js';
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
// أزرار الاختيار: «في أي سورتين؟» تُعرض أسماء السورتين (optionsKind: 'sim_pair')، وبقية الأنواع آيات داخل ﴿ ﴾ (الافتراضي)
export function formatKidsSimilar(sim, pool) {
    if (!sim || !['sim_pair', 'sim_notin'].includes(sim.kind)) return null;
    return {
        type: 'kids_mcq',
        questionTitle: sim.kind === 'sim_notin' ? 'أيُّ سورة لم ترد؟ من المتشابهات 🌟' : 'في أي سورتين من المتشابهات؟ 🌟',
        questionBody: `<div style="font-size:1.8rem; font-weight:bold; line-height:1.9; color:#0284c7;">${questionTextToHTML(localizedQuestionText(sim), toQuranicSukun)}</div>`,
        correctAns: sim.correctAnswer, options: sim.options, simDisplay: sim.optionsDisplay, optionsKind: 'sim_pair',
        ayahObj: ayahObjFor(sim, pool), reportText: qtext(sim.occurrence.fullText), simKind: sim.kind, simGroupId: sim.groupId
    };
}

// تسمية خيار للصغار (يستعملها kidsGame.js عند رسم الأزرار)
export function kidsSimilarOptionLabel(opt, kind, cd) {
    if (kind === 'sim_text') {   // آية/نهاية آية: النص المقصوص للعرض (الأصل للمقارنة)
        const shown = cd && cd.simDisplay ? cd.simDisplay[cd.options.indexOf(opt)] : null;
        return `﴿\u00A0${toQuranicSukun(shown || opt)}\u00A0﴾`;
    }
    if (kind === 'sim_pair') return pairOptionLabel(opt);
    return tf('sim_inj_surah_label', { name: surahLabel(opt) });
}

// ---------------- الكبار ----------------
// سؤال المتشابهات في لعبة الكبار: خياراته أزرار يضغطها الطالب فتُقيَّم إجابته تلقائياً (راجع adultGame.js).
const ADULT_TITLES = { sim_pair: 'في أي سورتين؟ 🔀', sim_notin: 'أيُّ سورة لم ترد؟ 🔀', sim_complete: 'أكمل الآية 🔀', sim_which: 'أيُّ الآيتين من السورة؟ 🔀', sim_next: 'ماذا بعدها؟ 🔀', sim_prev: 'ما الآية التي قبلها؟ 🔀' };

export function formatAdultSimilar(sim, pool) {
    if (!sim || !ADULT_TITLES[sim.kind]) return null;
    const isSurah = sim.kind === 'sim_pair' || sim.kind === 'sim_notin'; // خيارات نصية قصيرة (أسماء سور) لا آيات
    const label = (v, i) => isSurah ? pairOptionLabel(v) : '﴿ ' + toQuranicSukun((sim.optionsDisplay && i != null && sim.optionsDisplay[i]) || v) + ' ﴾';
    const cls = isSurah ? 'btn btn-outline sim-opt-btn' : 'btn btn-outline sim-opt-btn quran-text';
    const size = isSurah ? '2rem' : '1.7rem';
    // نفس خط ووزن آيات بقية المنصة (Amiri Quran بوزن عادي) — كان وزن زر .btn الغامق يطغى على الخيارات
    const font = isSurah ? '' : " font-family:'Amiri Quran', serif !important; font-weight:400 !important; line-height:2;";
    // 🌟 كل خيار زرٌّ يضغطه الطالب فتُسجَّل إجابته (صحيحة أو خاطئة) تلقائياً — يربطها adultGame.js عبر .sim-opt-btn
    // الأحجام والمسافات من css/gameFullscreen.css (data-game-q="similar") فيظهر السؤال وخياراته كاملاً بلا تمرير
    const lines = sim.options.map((opt, i) =>
        `<button type="button" class="${cls}" data-idx="${i}" style="display:block; width:100%; font-size:${size};${font} margin:12px 0; padding:12px 16px; text-align:center;">${label(opt, i)}</button>`
    ).join('');
    const body = `<div class="sim-q-text sim-q-adult" style="font-size:1.8rem; font-weight:bold; line-height:1.9; margin:10px 0 16px;">${questionTextToHTML(localizedQuestionText(sim), toQuranicSukun)}</div>` +
        `<div class="sim-opts" style="max-width:760px; margin:0 auto;">${lines}</div>`;
    const correctIndex = sim.options.findIndex(o => String(o) === String(sim.correctAnswer));
    return {
        type: 'similar', questionTitle: ADULT_TITLES[sim.kind], questionBody: body,
        correctIndex, optionTexts: sim.options.map((o, i) => String(label(o, i)).replace(/<[^>]*>/g, '')),
        fullAnswer: label(sim.correctAnswer),
        answerHTML: `<span class="${isSurah ? '' : 'quran-text'}" style="font-size:1.8rem;">${label(sim.correctAnswer)}</span>`,
        ayahObj: ayahObjFor(sim, pool), reportText: qtext(sim.occurrence.fullText), simKind: sim.kind, simGroupId: sim.groupId
    };
}
