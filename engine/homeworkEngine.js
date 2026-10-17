// engine/homeworkEngine.js
import { cleanAyahText, isWaqfMark, splitAyahWords } from './quranEngine.js';
import { HW_FORMATS } from './skillMap.js';

// ==========================================
// 🌟🌟 فلترة علامات الوقف القرآنية من "كلمات" الآية — [نُقلت للمحرك المركزي]
// ==========================================
// المشكلة: نص الآية عند تقطيعه بالمسافات (split(/\s+/)) قد يحتوي على علامات وقف قرآنية
// (مثل: ج، صلى، صلي، قلى، قلي...) تظهر كأنها "كلمة" مستقلة بذاتها لأنها محاطة بمسافات في
// النص. هذا كان يتسبب في ظهورها بالخطأ كاختيار (صحيح أو خاطئ) في أسئلة الاختيار من متعدد
// والقوائم المنسدلة، رغم أنها ليست كلمة من كلمات الآية إطلاقاً بل رمز توجيهي للوقف أثناء التلاوة.
// الحل: أي مكان في هذا الملف كان يقطّع نص الآية إلى كلمات، أصبح يستخدم الدالة getCleanWords
// أدناه بدلاً من cleanAyahText(...).split(/\s+/) مباشرة، والتي تستبعد رموز الوقف تلقائياً.
// 🌟 [تحديث] نفس المشكلة ظهرت في ألعاب الأطفال والكبار، فنُقل تعريف isWaqfMark/splitAyahWords
// إلى engine/quranEngine.js (مصدر واحد للحقيقة) ونستوردهما من هناك بدل تكرارهما هنا. أبقينا
// اسم getCleanWords كما هو حتى لا يتغير أي سطر آخر داخل هذا الملف.
const getCleanWords = (text) => splitAyahWords(text);

// ==========================================
// 🌟🌟 [جديد] اختيار اختيارات خاطئة "مشتتة" فعلاً لانتباه الطالب
// ==========================================
// المشكلة: الاختيارات الخاطئة كانت تُنتقى بشكل شبه عشوائي بالكامل من مخزون كلمات متفرقة، مما
// يجعلها سهلة الاستبعاد بالتخمين (طول مختلف جداً، شكل مختلف تماماً عن الإجابة الصحيحة).
// الحل: نرتب المرشحين حسب مدى تقارب طول الكلمة مع الكلمة الصحيحة (الأقرب طولاً أولاً)، وهو ما
// يجعل الاختيارات الخاطئة أقرب شكلاً للإجابة الصحيحة وأصعب في التمييز بالتخمين البصري السريع.
// 🌟 [عدّل — 2026-10-12] «التشتيت» الحقيقي: لا يكفي تقارب الطول؛ الخيار الخاطئ يجب أن يُشبه الصحيح في الرسم
// (نفس الحروف تقريباً/نفس البداية والنهاية) ليحتاج الطالب لاستحضار الصحيح فعلاً. نقيس التقارب على هيكل الكلمة بلا تشكيل.
const skeleton = (w) => String(w || '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه');

function editDistance(a, b) {
    const m = a.length, n = b.length;
    if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
        const cur = [i];
        for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = cur;
    }
    return prev[n];
}

const commonSuffix = (a, b) => { let k = 0; while (k < a.length && k < b.length && a[a.length - 1 - k] === b[b.length - 1 - k]) k++; return k; };
const commonPrefix = (a, b) => { let k = 0; while (k < a.length && k < b.length && a[k] === b[k]) k++; return k; };

// مسافة كلمة لكلمة (الأصغر = أشدّ تشتيتاً)
function wordDistance(correct, w) {
    const a = skeleton(correct), b = skeleton(w);
    return editDistance(a, b) * 2 + Math.abs(a.length - b.length) - Math.min(2, commonSuffix(a, b)) - Math.min(2, commonPrefix(a, b));
}

// يختار من أقرب المرشحين (أول 8 بعد الترتيب) عشوائياً حتى لا يتكرر نفس الشكل في كل مرة
function pickFromClosest(sortedCandidates, count, window = 8) {
    const top = sortedCandidates.slice(0, Math.max(count, window));
    return top.sort(() => 0.5 - Math.random()).slice(0, count);
}

function pickDistractorWords(correctWord, wordsPool, count = 3, window = 8) {
    const cs = skeleton(correctWord);
    const seen = new Set();
    const scored = [];
    for (const w of wordsPool) {
        if (!w || w === correctWord || isWaqfMark(w)) continue;
        const sk = skeleton(w);
        if (sk === cs || sk.length < 2 || seen.has(sk)) continue;   // نفس الكلمة بتشكيل مختلف = التباس غير عادل
        seen.add(sk);
        scored.push({ w, d: wordDistance(correctWord, w) });
    }
    scored.sort((x, y) => x.d - y.d);
    return pickFromClosest(scored.map(x => x.w), count, window);
}

// مشتتات نصية (آيات/خواتيم): الأقرب في الطول وفي الكلمات المشتركة والحرف الأخير (القافية) أولاً
function pickDistractorTexts(correctText, candidateTexts, count = 3, exclude = [], window = 8) {
    const words = (t) => new Set(skeleton(t).split(/\s+/).filter(Boolean));
    const cw = words(correctText), cs = skeleton(correctText);
    const banned = new Set([correctText, ...exclude]);
    const seen = new Set();
    const scored = [];
    for (const t of candidateTexts) {
        if (!t || banned.has(t) || seen.has(t)) continue;
        seen.add(t);
        const tw = words(t);
        let shared = 0; tw.forEach(x => { if (cw.has(x)) shared++; });
        const jacc = shared / (cw.size + tw.size - shared || 1);
        const ts = skeleton(t);
        const rhyme = ts.slice(-1) === cs.slice(-1) ? 1 : 0;
        scored.push({ t, score: Math.abs(ts.length - cs.length) / Math.max(cs.length, 1) - jacc * 1.5 - rhyme * 0.3 });
    }
    scored.sort((x, y) => x.score - y.score);
    return pickFromClosest(scored.map(x => x.t), count, window);
}

// ==========================================
// 🌟 [جديد — مستوى الصعوبة] الواجب «صعب» يُبنى من نفس الصيغ بتقليل ما يراه الطالب من السؤال وتكثير الخيارات الموهِمة.
// opts.difficulty: 'medium' (السلوك الأصلي بلا أي تغيير) | 'hard'. كل مولّد يقبل opts كمعامل أخير ويتجاهله إن لم يكن صعباً.
// ==========================================
const isHard = (opts) => !!opts && opts.difficulty === 'hard';

// كلمات وظيفية متكررة يسهل استنتاجها من السياق: لا تُخفى في الفراغ الصعب
const COMMON_WORDS = new Set(['الله', 'الذي', 'الذين', 'ذلك', 'اولئك', 'هولاء', 'عليهم', 'عليه', 'منهم', 'فيها', 'فيه', 'كانوا', 'يكون']);
const isGuessableWord = (w) => skeleton(w).length < 4 || COMMON_WORDS.has(skeleton(w));

// أماكن كلمات تصلح للإخفاء في الصعب (طويلة وليست وظيفية) ضمن 20%–80% من الآية؛ فارغة إن لم يكفِ عددها
function hardHideIndexes(words) {
    const lo = Math.floor(words.length * 0.2), hi = Math.floor(words.length * 0.8);
    const out = [];
    for (let i = lo; i <= Math.min(hi, words.length - 1); i++) if (!isGuessableWord(words[i])) out.push(i);
    return out;
}

// عرض جزئي للآية في الصعب: نصفها الأخير (للسؤال «ما التالية؟») أو الأول (للسؤال «ما السابقة؟»). الآيات القصيرة (<7 كلمات) تُعرض كاملة
function partialStem(text, part) {
    const words = getCleanWords(text);
    if (words.length < 7) return cleanAyahText(text);
    const k = Math.max(4, Math.ceil(words.length * 0.5));
    return part === 'tail' ? '… ' + words.slice(-k).join(' ') : words.slice(0, k).join(' ') + ' …';
}

// يستبدل كلمة واحدة من الكلمات بأقرب كلمة شكلاً من المخزون (خيار «شبه صحيح» لا يُكشف إلا بحفظ دقيق). null إن تعذّر
// usedIdx: مواضع سبق تبديلها في خيار آخر — لا يتكرر نفس الموضع حتى لا تظهر عدة خيارات تختلف في الكلمة نفسها فقط (إلى/إلا/على)
function mutateWords(words, poolWords, usedIdx = new Set()) {
    const idxs = words.map((w, i) => i).filter(i => skeleton(words[i]).length >= 3 && !usedIdx.has(i)).sort(() => 0.5 - Math.random());
    for (const i of idxs) {
        const subs = pickDistractorWords(words[i], poolWords.filter(w => !words.includes(w)), 1, 3);
        if (subs.length) { const out = [...words]; out[i] = subs[0]; usedIdx.add(i); return out.join(' '); }
    }
    return null;
}

export class HomeworkEngine {
    constructor(quranEngine) {
        this.quranEngine = quranEngine;
    }

    // 🌟 [جديد — الواجب الذكي] إنشاء سؤال لمفتاح صيغة معيّن (المفاتيح نفسها المعرّفة في HW_FORMATS بـ engine/skillMap.js).
    // فُصل هنا بدل تكرار الـswitch في موضعين. يرجع null لو الآية لا تلائم الصيغة.
    async createQuestionByKey(typeKey, ayah, pool, opts = {}) {
        switch (typeKey) {
            case 'mcq_surah': return this.createMCQSurahGuess(ayah, pool, opts);
            case 'mcq_next': return this.createMCQNextAyah(ayah, pool, opts);
            case 'mcq_prev': return this.createMCQPrevAyah(ayah, pool, opts);
            case 'ayah_ending': return this.createAyahEndingMatch(ayah, pool, opts);
            case 'dropdown': return this.createMissingWordDropdown(ayah, pool, opts);
            case 'written_blank': return this.createWrittenBlankQuestion(ayah, pool, opts);
            case 'dual_dropdown': return this.createDualMissingWordDropdown(ayah, pool, opts);
            case 'around_ayah': return this.createAroundAyahQuestion(ayah, pool, opts);
            case 'checkbox': return this.createCheckboxQuestion(ayah, pool, opts);
            case 'matrix_order': return this.createMatrixOrderQuestion(ayah, pool, opts);
            case 'write_3_ayahs': return this.createWrite3AyahsQuestion(ayah, pool, opts);
            case 'matching': return this.createMatchingQuestion(ayah, pool, opts);
            case 'tajweed_extract': return this.createTajweedExtractQuestion(ayah, pool, opts);
            case 'word_meaning': return this.createWordMeaningQuestion(ayah, pool, opts);
            default: return null;
        }
    }

    // 🌟 [جديد — الواجب الذكي] سؤال لصيغة وآية محدّدتين مسبقاً من خطة التتبّع. يرجع { question, fmt } حيث fmt هي الصيغة
    // التي أُنتجت فعلاً (قد تختلف عن المطلوبة إن لم تلائم الآية، فنقع على سؤال "أكمل الفراغ" كما في التوليد العشوائي).
    // التتبّع يسجّل الصيغة الفعلية دائماً، لا المطلوبة. allowFallback=false: يرجع null بدل البديل (تتولّى الخطة اختيار بديل أنسب).
    async buildQuestionForPlan(typeKey, ayah, pool, { allowFallback = true } = {}) {
        // مستوى الصعوبة تحدده الصيغة نفسها (HW_FORMATS[..].diff): لا خيار صعب/متوسط للمعلم
        const opts = { difficulty: (HW_FORMATS[typeKey] && HW_FORMATS[typeKey].diff) || 'medium' };
        let question = await this.createQuestionByKey(typeKey, ayah, pool, opts);
        let fmt = typeKey;
        if (!question && allowFallback) { question = await this.createMissingWordDropdown(ayah, pool, { difficulty: HW_FORMATS.dropdown.diff }); fmt = 'dropdown'; }
        if (!question) return null;
        question.id = 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        if (!question.points) question.points = (question.type === 'checkbox' || question.type === 'dual_dropdown') ? 2 : 1;
        return { question, fmt };
    }

    // 🌟 [جديد] معاني الكلمات: "ما معنى (كلمة) في هذه الآية؟" — اختيار من متعدد يُصحَّح آلياً (type: 'mcq').
    // المصدر: database/data/wordMeanings.json (من كتاب «كلمات القرآن: تفسير وبيان» للشيخ حسنين محمد مخلوف؛ طريقة بنائه في
    // tools/build_word_meanings.py). يُحمَّل مرة واحدة عند أول طلب؛ لو تعذّر التحميل نرجع null فيقع التوليد على سؤال بديل.
    // ليست كل آية فيها كلمات مشروحة، فلو آية السؤال بلا شرح نبحث عن آية أخرى من نفس السورة (ثم من النطاق) لها شرح.
    async loadWordMeanings() {
        if (HomeworkEngine._wordMeanings !== undefined) return HomeworkEngine._wordMeanings;
        try {
            const res = await fetch(new URL('../database/data/wordMeanings.json', import.meta.url));
            HomeworkEngine._wordMeanings = res.ok ? await res.json() : null;
        } catch (e) { HomeworkEngine._wordMeanings = null; }
        return HomeworkEngine._wordMeanings;
    }

    async createWordMeaningQuestion(targetAyah, pool, opts = {}) {
        const hard = isHard(opts);
        const data = await this.loadWordMeanings();
        if (!data) return null;
        const entriesOf = (a) => ((data[String(a.surahNumber)] || []).filter(e => e[0] === a.numberInSurah && e[1].length <= 40 && e[2].length <= 90));
        let ayah = targetAyah, entries = entriesOf(ayah);
        if (!entries.length) {
            const withMeaning = (pool || []).filter(a => entriesOf(a).length);
            const sameSurah = withMeaning.filter(a => a.surahNumber === targetAyah.surahNumber);
            const from = sameSurah.length ? sameSurah : withMeaning;
            if (!from.length) return null;
            ayah = from[Math.floor(Math.random() * from.length)];
            entries = entriesOf(ayah);
        }
        const entry = entries[Math.floor(Math.random() * entries.length)];
        const correctAnswer = entry[2];

        // اختيارات خاطئة: معاني كلمات أخرى (من نفس السورة أولاً ثم السور القريبة)، الأقرب طولاً أولاً حتى لا يُكشف الجواب بالطول
        const others = [];
        for (const sn of [ayah.surahNumber, ayah.surahNumber - 1, ayah.surahNumber + 1, ayah.surahNumber - 2, ayah.surahNumber + 2]) {
            for (const e of (data[String(sn)] || [])) if (e[2] !== correctAnswer && e[2].length <= 90 && e[1] !== entry[1]) others.push(e[2]);
        }
        const unique = [...new Set(others)].sort((a, b) => Math.abs(a.length - correctAnswer.length) - Math.abs(b.length - correctAnswer.length) || (0.5 - Math.random()));
        // الصعب: خمسة خيارات من أقرب المعاني طولاً فقط (نافذة 6) بدل أربعة من نافذة 12
        const wrongCount = 3;   // أربعة خيارات كحد أقصى حتى لا يضطر الطفل للتمرير
        const wrong = unique.slice(0, hard ? 6 : 12).sort(() => 0.5 - Math.random()).slice(0, wrongCount);
        if (wrong.length < 3) return null;

        return {
            type: 'mcq',
            title: `ما معنى «${entry[1]}» في هذه الآية؟`,
            text: `﴿\u00A0${cleanAyahText(ayah.text)}\u00A0﴾`,
            options: [correctAnswer, ...wrong].sort(() => 0.5 - Math.random()),
            correctAnswer,
            points: 1
        };
    }

    // 🌟 نمط 1: تخمين السورة (يتم التحكم بظهوره من الدالة الرئيسية)
    async createMCQSurahGuess(targetAyah, pool, opts = {}) {
        const hard = isHard(opts);
        let cleanText = cleanAyahText(targetAyah.text);
        let correctAnswer = `سورة ${targetAyah.surahName}`;
        
        let allSurahs = await this.quranEngine.getAllSurahsList();
        // 🌟 [عدّل — 2026-10-12] المشتتات: سور قريبة في الترتيب وفي عدد الآيات (تتشابه في الطول والطابع) بدل أي سورة من ±5 عشوائياً
        const me = allSurahs.find(s => s.number === targetAyah.surahNumber);
        const rank = (s) => Math.abs(s.number - targetAyah.surahNumber) * 3 + (me && s.ayahsCount && me.ayahsCount ? Math.abs(s.ayahsCount - me.ayahsCount) / Math.max(me.ayahsCount, 1) * 10 : 0);
        let similarSurahs = allSurahs.filter(s => s.name !== targetAyah.surahName).sort((x, y) => rank(x) - rank(y)).slice(0, hard ? 6 : 8);

        // الصعب: خمسة خيارات من أقرب ست سور في الترتيب والطول
        let wrongOptions = similarSurahs.sort(() => 0.5 - Math.random()).slice(0, 3).map(s => `سورة ${s.name}`);
        let options = [correctAnswer, ...wrongOptions].sort(() => 0.5 - Math.random());

        return { type: 'mcq', title: "في أي سورة تقع هذه الآية؟", text: `﴿\u00A0${cleanText}\u00A0﴾`, options: options, correctAnswer: correctAnswer, points: 1 };
    }

    // 🌟 [جديد — الصعب] التالية/السابقة: (١) تُعرض نصف الآية فقط (الأخير للتالية، الأول للسابقة)، (٢) نصف الأسئلة يُسأل عن الآية
    // الثانية بعد/قبل الهدف (فالتالية مباشرة فخّ في الخيارات)، (٣) خمسة خيارات كلها من نفس السورة وأقرب الآيات للهدف.
    // يرجع null إن لم يتوفر ثلاثة مشتتات (فيقع المولّد على سلوكه المعتاد).
    async createHardSequenceQuestion(dir, targetAyah, pool) {
        const surah = await this.quranEngine.getSurah(targetAyah.surahNumber);
        const list = surah.ayahs, t = targetAyah.numberInSurah - 1;
        const sign = dir === 'next' ? 1 : -1;
        const exists = (i) => i >= 0 && i < list.length;
        const skip = false;   // بقرار المعلم: أُلغي سؤال «بعد/قبل هذه بآيتين» (كان معقّداً على الطفل)
        const ci = t + sign * (skip ? 2 : 1);
        if (!exists(ci)) return null;

        const correct = cleanAyahText(list[ci].text);
        const stemFull = cleanAyahText(targetAyah.text);
        let wrong = [];
        for (let d = 1; d <= 6 && wrong.length < 3; d++) {
            for (const i of [t + sign * d, t - sign * d]) {
                if (wrong.length >= 3 || i === ci || !exists(i)) continue;
                const txt = cleanAyahText(list[i].text);
                if (txt !== correct && !wrong.includes(txt)) wrong.push(txt);
            }
        }
        if (wrong.length < 3) {
            const cands = (pool || []).filter(a => a.number !== targetAyah.number).map(a => cleanAyahText(a.text));
            wrong.push(...pickDistractorTexts(correct, cands, 3 - wrong.length, [...wrong, stemFull], 4));
        }
        wrong = [...new Set(wrong)].filter(w => w !== correct).slice(0, 3);
        if (wrong.length < 3) return null;

        const stem = partialStem(targetAyah.text, dir === 'next' ? 'tail' : 'head');
        const partialNote = stem !== stemFull ? ' (ترى جزءاً من الآية فقط)' : '';
        const title = dir === 'next'
            ? (skip ? 'اختر الآية التي تأتي بعد هذه الآية بآيتين (بينهما آية واحدة).' : 'ما هي الآية التي تلي هذه الآية مباشرة؟')
            : (skip ? 'اختر الآية التي تأتي قبل هذه الآية بآيتين (بينهما آية واحدة).' : 'ما هي الآية التي تَسبِق هذه الآية مباشرة؟ (استرجاع عكسي)');
        return {
            type: 'mcq', title: title + partialNote, text: `﴿ ${stem} ﴾`,
            options: [correct, ...wrong].sort(() => 0.5 - Math.random()), correctAnswer: correct, points: 1
        };
    }

    // 🌟 نمط 2: ما الآية التالية؟
    async createMCQNextAyah(targetAyah, pool, opts = {}) {
        let cleanText = cleanAyahText(targetAyah.text);
        let surah = await this.quranEngine.getSurah(targetAyah.surahNumber);

        // 🌟 إصلاح: الشرط القديم (length - 1) كان يستبعد بالخطأ آخر آيتين بدل آية واحدة فقط،
        // فتقل احتمالية ظهور هذا النوع من الأسئلة على آخر آية قبل الأخيرة في كل سورة دون داعٍ.
        if (targetAyah.numberInSurah >= surah.ayahs.length) return null;

        if (isHard(opts)) {
            const hardQ = await this.createHardSequenceQuestion('next', targetAyah, pool);
            if (hardQ) return hardQ;
        }

        let nextAyah = surah.ayahs[targetAyah.numberInSurah];
        let correctAnswer = cleanAyahText(nextAyah.text);
        let wrongOptions = [];

        if (targetAyah.numberInSurah > 1) wrongOptions.push(cleanAyahText(surah.ayahs[targetAyah.numberInSurah - 2].text));
        if (targetAyah.numberInSurah + 1 < surah.ayahs.length) wrongOptions.push(cleanAyahText(surah.ayahs[targetAyah.numberInSurah + 1].text));

        // ==========================================
        // 🌟🌟 [إصلاح — المرحلة 5] منع تكرار نفس الآية كاختيارين مختلفين في نفس السؤال
        // ==========================================
        // اكتشفناه عبر اختبارات tests/homeworkEngine.test.js الجديدة: extraWrongs كان يُستبعد منه
        // فقط nextAyah وtargetAyah (بالـ number)، لكن لم يكن يُستبعد الآيتان اللتان أُضيفتا يدوياً
        // فوق (الآية السابقة للهدف، والآية التالية لـ nextAyah) — فلو رجعت extraWrongs بنفس نص
        // إحداهما (ممكن فعلياً مع آيات القرآن المتكررة حرفياً، مثل "فبأي آلاء ربكما تكذبان" في سورة
        // الرحمن)، يظهر نفس النص مرتين كاختيارين منفصلين في نفس السؤال. الحل: نتحقق من عدم التكرار
        // النصي (وليس فقط رقم الآية) قبل إضافة أي اختيار جديد.
        // 🌟 [عدّل — 2026-10-12] تكملة المشتتات من آيات النطاق الأشبه بالجواب (طولاً وكلمات وقافية) لا عشوائياً
        if (wrongOptions.length < 3) {
            const cands = pool.filter(a => a.number !== nextAyah.number && a.number !== targetAyah.number).map(a => cleanAyahText(a.text));
            wrongOptions.push(...pickDistractorTexts(correctAnswer, cands, 3 - wrongOptions.length, wrongOptions));
        }
        wrongOptions = [...new Set(wrongOptions)].filter(w => w !== correctAnswer);

        let options = [correctAnswer, ...wrongOptions].slice(0, 4).sort(() => 0.5 - Math.random());

        return { type: 'mcq', title: "ما هي الآية التي تلي هذه الآية مباشرة؟", text: `﴿\u00A0${cleanText}\u00A0﴾`, options: options, correctAnswer: correctAnswer, points: 1 };
    }

    // 🌟 نمط 3: الآية السابقة (الاسترجاع العكسي)
    async createMCQPrevAyah(targetAyah, pool, opts = {}) {
        let cleanText = cleanAyahText(targetAyah.text);
        let surah = await this.quranEngine.getSurah(targetAyah.surahNumber);

        if (targetAyah.numberInSurah <= 1) return null;

        if (isHard(opts)) {
            const hardQ = await this.createHardSequenceQuestion('prev', targetAyah, pool);
            if (hardQ) return hardQ;
        }

        let prevAyah = surah.ayahs[targetAyah.numberInSurah - 2]; 
        let correctAnswer = cleanAyahText(prevAyah.text);
        let wrongOptions = [];

        if (targetAyah.numberInSurah < surah.ayahs.length) wrongOptions.push(cleanAyahText(surah.ayahs[targetAyah.numberInSurah].text));
        if (targetAyah.numberInSurah > 2) wrongOptions.push(cleanAyahText(surah.ayahs[targetAyah.numberInSurah - 3].text));

        // 🌟🌟 [إصلاح — المرحلة 5] نفس إصلاح تكرار الاختيارات المطبَّق في createMCQNextAyah أعلاه
        // (راجع تعليقه للشرح الكامل) — اكتُشف بنفس اختبارات tests/homeworkEngine.test.js الجديدة.
        // 🌟 [عدّل — 2026-10-12] تكملة المشتتات من آيات النطاق الأشبه بالجواب (طولاً وكلمات وقافية) لا عشوائياً
        if (wrongOptions.length < 3) {
            const cands = pool.filter(a => a.number !== prevAyah.number && a.number !== targetAyah.number).map(a => cleanAyahText(a.text));
            wrongOptions.push(...pickDistractorTexts(correctAnswer, cands, 3 - wrongOptions.length, wrongOptions));
        }
        wrongOptions = [...new Set(wrongOptions)].filter(w => w !== correctAnswer);

        let options = [correctAnswer, ...wrongOptions].slice(0, 4).sort(() => 0.5 - Math.random());

        return { type: 'mcq', title: "ما هي الآية التي تَسبِق هذه الآية مباشرة؟ (استرجاع عكسي)", text: `﴿\u00A0${cleanText}\u00A0﴾`, options: options, correctAnswer: correctAnswer, points: 1 };
    }

    // 🌟 نمط 4: خواتيم الآيات
    async createAyahEndingMatch(targetAyah, pool, opts = {}) {
        let words = getCleanWords(targetAyah.text);
        if (words.length < 5) return null;

        // الصعب (آية من 7 كلمات فأكثر): تُخفى نصف الآية الأخير (4–7 كلمات) بدل 3، وخمسة خيارات منها خياران «مُعدَّلان»
        // بكلمة واحدة مبدَّلة بأقرب كلمة شكلاً، فلا يُميَّز الصحيح إلا بحفظ دقيق
        const hard = isHard(opts) && words.length >= 7;
        let endingCount = hard ? Math.min(7, Math.max(4, Math.ceil(words.length * 0.5))) : Math.min(3, Math.floor(words.length / 2));
        let endingWords = words.slice(-endingCount).join(" ");
        let startWords = words.slice(0, -endingCount).join(" ");
        let textWithBlank = startWords + " [ ....... ]";
        let correctAnswer = endingWords;

        if (hard) {
            const poolWordLists = pool.map(a => getCleanWords(a.text));
            const endings = [...new Set(poolWordLists.filter(w => w.length >= endingCount).map(w => w.slice(-endingCount).join(" ")))];
            const known = new Set([correctAnswer, ...endings]);
            const flatWords = poolWordLists.flat();
            // [إصلاح 2026-10-17] خياران «مُعدَّلان» على الأكثر وبمواضع مختلفة، والتفرّد يُقاس على الهيكل بلا تشكيل
            // فلا يظهر خياران متطابقان تقريباً (كان يتكرر تبديل الكلمة نفسها فتظهر ٣ خيارات متشابهة)
            const hardWrong = pickDistractorTexts(correctAnswer, endings, 2, [], 4);
            const seenSk = new Set([skeleton(correctAnswer), ...hardWrong.map(skeleton)]);
            const usedIdx = new Set();
            for (let tries = 0; tries < 8 && hardWrong.length < 4 && usedIdx.size < 2; tries++) {
                const mutated = mutateWords(words.slice(-endingCount), flatWords, usedIdx);
                if (mutated && !known.has(mutated) && !seenSk.has(skeleton(mutated))) { hardWrong.push(mutated); seenSk.add(skeleton(mutated)); }
            }
            if (hardWrong.length < 4) {
                const extra = pickDistractorTexts(correctAnswer, endings, 6, hardWrong, 8).filter(t => !seenSk.has(skeleton(t)));
                for (const t of extra) { if (hardWrong.length >= 4) break; hardWrong.push(t); seenSk.add(skeleton(t)); }
            }
            const uniqueWrong = [...new Set(hardWrong)].filter(w => w !== correctAnswer).slice(0, 4);
            if (uniqueWrong.length >= 3) {
                return { type: 'mcq', title: "اختر الخاتمة الصحيحة والدقيقة لهذه الآية:", text: `﴿ ${textWithBlank} ﴾`,
                    options: [correctAnswer, ...uniqueWrong].sort(() => 0.5 - Math.random()), correctAnswer: correctAnswer, points: 1 };
            }
            // لم تتوفر مشتتات كافية: نكمل بالسلوك المعتاد (3 كلمات)
            endingCount = Math.min(3, Math.floor(words.length / 2));
            endingWords = words.slice(-endingCount).join(" ");
            startWords = words.slice(0, -endingCount).join(" ");
            textWithBlank = startWords + " [ ....... ]";
            correctAnswer = endingWords;
        }

        // 🌟🌟 [إصلاح — المرحلة 5] نفس مشكلة تكرار الاختيارات: آيتان مختلفتان تماماً قد تنتهيان
        // بنفس آخر 2-3 كلمات (شائع في القرآن، مثل "وَاللَّهُ غَفُورٌ رَّحِيمٌ" في آيات متعددة)، وكان
        // ذلك يُنتج نفس نص الخاتمة كاختيارين منفصلين. أضفنا new Set لضمان تفرّد كل خاتمة قبل الأخذ.
        // 🌟 [عدّل — 2026-10-12] الخواتيم الخاطئة الأقرب للصحيحة في الطول والكلمات المشتركة والقافية (لا عشوائية)
        let wrongOptions = pickDistractorTexts(correctAnswer, [...new Set(
            pool.map(a => getCleanWords(a.text))
                .filter(w => w.length >= endingCount)
                .map(w => w.slice(-endingCount).join(" "))
        )], 3);

        if (wrongOptions.length < 3) wrongOptions.push("وَاللَّهُ غَفُورٌ رَّحِيمٌ", "وَاللَّهُ سَمِيعٌ عَلِيمٌ", "وَهُوَ الْعَزِيزُ الْحَكِيمُ");
        let options = [correctAnswer, ...wrongOptions].sort(() => 0.5 - Math.random());

        return { type: 'mcq', title: "اختر الخاتمة الصحيحة والدقيقة لهذه الآية:", text: `﴿\u00A0${textWithBlank}\u00A0﴾`, options: options, correctAnswer: correctAnswer, points: 1 };
    }

    // 🌟 نمط 6 المطور: القائمة المنسدلة (عشوائية 20% - 80%)
    async createMissingWordDropdown(targetAyah, pool, opts = {}) {
        let words = getCleanWords(targetAyah.text);
        if (words.length < 4) return null;

        const hard = isHard(opts);
        let minIdx = Math.floor(words.length * 0.2);
        let maxIdx = Math.floor(words.length * 0.8);
        if (minIdx >= maxIdx) maxIdx = minIdx + 1;
        let hideIdx = Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;
        // الصعب: لا تُخفى كلمة وظيفية/قصيرة يُستنتج مكانها من السياق، وخمسة خيارات هي أقرب الكلمات شكلاً (نافذة 5)
        if (hard) { const hi = hardHideIndexes(words); if (hi.length) hideIdx = hi[Math.floor(Math.random() * hi.length)]; }

        let correctWord = words[hideIdx];
        words[hideIdx] = " [ ....... ] ";
        let textWithBlank = words.join(" ");

        const wrongCount = 3;
        let wrongWords = pickDistractorWords(correctWord, pool.map(a => getCleanWords(a.text)).flat(), wrongCount, hard ? wrongCount + 1 : 8);

        if(wrongWords.length < wrongCount) wrongWords.push(...["الله", "الذي", "فيها", "بما"].filter(w => w !== correctWord && !wrongWords.includes(w)));
        wrongWords = wrongWords.slice(0, Math.max(wrongCount, 3));
        let options = [correctWord, ...wrongWords].sort(() => 0.5 - Math.random());

        return { type: 'dropdown', title: "اختر الكلمة الصحيحة لإكمال الفراغ 🔽:", text: `﴿\u00A0${textWithBlank}\u00A0﴾`, options: options, correctAnswer: correctWord, points: 1 };
    }

    // 🌟 نمط 7 الجديد: الفراغ الكتابي اليدوي (تقييم المعلم)
    async createWrittenBlankQuestion(targetAyah, pool, opts = {}) {
        let words = getCleanWords(targetAyah.text);
        if (words.length < 4) return null;

        // الصعب (6 كلمات فأكثر): تُخفى كلمتان متجاورتان يكتبهما الطالب، وهي أصعب صيغة استدعاء
        if (isHard(opts) && words.length >= 6) {
            const lo = Math.floor(words.length * 0.2), hi = Math.floor(words.length * 0.8) - 1;
            const starts = [];
            for (let i = lo; i <= hi && i + 1 < words.length; i++) if (!isGuessableWord(words[i]) || !isGuessableWord(words[i + 1])) starts.push(i);
            if (starts.length) {
                const s = starts[Math.floor(Math.random() * starts.length)];
                const answer = `${words[s]} ${words[s + 1]}`;
                words.splice(s, 2, " [ ....... ....... ] ");
                return {
                    type: 'written_blank',
                    title: "أكمل الفراغ بكتابة الكلمتين الصحيحتين (بدون اختيارات): ✍️",
                    text: `﴿ ${words.join(" ")} ﴾`,
                    correctAnswer: answer,
                    points: 1,
                    needsManualGrading: true
                };
            }
        }

        let minIdx = Math.floor(words.length * 0.2);
        let maxIdx = Math.floor(words.length * 0.8);
        if (minIdx >= maxIdx) maxIdx = minIdx + 1;
        let hideIdx = Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;

        let correctWord = words[hideIdx];
        words[hideIdx] = " [ ....... ] ";
        let textWithBlank = words.join(" ");

        return { 
            type: 'written_blank', 
            title: "أكمل الفراغ بكتابة الكلمة الصحيحة (بدون اختيارات): ✍️", 
            text: `﴿\u00A0${textWithBlank}\u00A0﴾`, 
            correctAnswer: correctWord, 
            points: 1,
            needsManualGrading: true 
        };
    }

    // 🌟 نمط 8 المطور: فراغين بقائمة منسدلة (عشوائية 20% - 80% مع ضمان التباعد)
    async createDualMissingWordDropdown(targetAyah, pool, opts = {}) {
        let words = getCleanWords(targetAyah.text);
        if (words.length < 7) return null;

        const hard = isHard(opts);
        let minIdx = Math.floor(words.length * 0.2);
        let maxIdx = Math.floor(words.length * 0.8);

        let hideIdx1 = Math.floor(Math.random() * (maxIdx - minIdx)) + minIdx;
        let hideIdx2 = Math.floor(Math.random() * (maxIdx - minIdx)) + minIdx;

        let attempts = 0;
        while(hideIdx1 === hideIdx2 && attempts < 10) {
            hideIdx2 = Math.floor(Math.random() * (maxIdx - minIdx)) + minIdx;
            attempts++;
        }
        if (hideIdx1 === hideIdx2) hideIdx2 = Math.min(words.length - 1, hideIdx1 + 1);
        // الصعب: الفراغان كلمتان طويلتان غير وظيفيتين متى توفرتا
        if (hard) {
            const hi = hardHideIndexes(words).sort(() => 0.5 - Math.random());
            if (hi.length >= 2) { hideIdx1 = hi[0]; hideIdx2 = hi[1]; }
        }
        if (hideIdx1 > hideIdx2) [hideIdx1, hideIdx2] = [hideIdx2, hideIdx1];
        
        let correctWord1 = words[hideIdx1];
        let correctWord2 = words[hideIdx2];
        
        words[hideIdx1] = " [ 1 ] ";
        words[hideIdx2] = " [ 2 ] ";
        let textWithBlanks = words.join(" ");

        let dualPoolWords = pool.map(a => getCleanWords(a.text)).flat();

        // الصعب: خمسة خيارات لكل فراغ من أقرب الكلمات شكلاً
        const wrongCount = 3, window = hard ? wrongCount + 1 : 8;
        let wrongWords1 = pickDistractorWords(correctWord1, dualPoolWords, wrongCount, window);
        if(wrongWords1.length < wrongCount) wrongWords1.push(...["الله", "الذي", "بما", "فيها"].filter(w => w !== correctWord1 && !wrongWords1.includes(w)));
        let options1 = [correctWord1, ...wrongWords1.slice(0, Math.max(wrongCount, 3))].sort(() => 0.5 - Math.random());

        let wrongWords2 = pickDistractorWords(correctWord2, dualPoolWords, wrongCount, window);
        if(wrongWords2.length < wrongCount) wrongWords2.push(...["الأرض", "السماء", "كان", "ذلك"].filter(w => w !== correctWord2 && !wrongWords2.includes(w)));
        let options2 = [correctWord2, ...wrongWords2.slice(0, Math.max(wrongCount, 3))].sort(() => 0.5 - Math.random());

        return {
            type: 'dual_dropdown', title: "اختر الكلمتين الصحيحتين لإكمال الفراغين (1) و (2) 🔽:", text: `﴿\u00A0${textWithBlanks}\u00A0﴾`,
            options1: options1, options2: options2, correctAnswer: [correctWord1, correctWord2], points: 2
        };
    }

    // 🌟 [جديد] «الآية قبلها وبعدها»: تُعرض آية ويكتب الطالب بيده الآية التي قبلها والتي بعدها (تصحيح المعلم يدوياً، نقطتان:
    // نقطة لكل جزء). يرجع null إن لم يكن للآية سابقة وتالية في سورتها.
    async createAroundAyahQuestion(targetAyah, pool, opts = {}) {
        const surah = await this.quranEngine.getSurah(targetAyah.surahNumber);
        const list = surah.ayahs, t = targetAyah.numberInSurah - 1;
        if (t < 1 || t >= list.length - 1) return null;
        const prevText = cleanAyahText(list[t - 1].text), nextText = cleanAyahText(list[t + 1].text);
        return {
            type: 'around_ayah', title: 'اكتب الآية التي قبلها والآية التي بعدها ✍️',
            text: `﴿\u00A0${cleanAyahText(targetAyah.text)}\u00A0﴾`,
            correctAnswer: `الآية التي قبلها: ${prevText}\nالآية التي بعدها: ${nextText}`,
            points: 2, needsManualGrading: true
        };
    }

    // 🌟 نمط 9: مربعات الاختيار (تعدد الإجابات)
    async createCheckboxQuestion(targetAyah, pool, opts = {}) {
        let targetSurah = targetAyah.surahName;
        // الصعب: ثلاث آيات صحيحة بين ست خيارات (يبقى العدد غير معلن للطالب)؛ إن لم تتوفر ثلاث آيات من السورة نرجع لآيتين
        const sameSurahAyahs = pool.filter(a => a.surahName === targetSurah).sort(() => 0.5 - Math.random());
        const correctCount = isHard(opts) && sameSurahAyahs.length >= 3 ? 3 : 2;
        let correctAyahs = sameSurahAyahs.slice(0, correctCount);
        if (correctAyahs.length < 2) return null;

        // 🌟 [عدّل — 2026-10-12] المشتتات كانت عشوائية من أي سورة فتظهر غريبة وواضحة. الآن: من أقرب السور عدداً (ثم الأبعد)،
        // والأقرب طولاً للآيتين الصحيحتين أولاً، فلا يُكشف الجواب بالطول ولا بالانتماء لسورة بعيدة.
        const avgLen = correctAyahs.reduce((n, a) => n + cleanAyahText(a.text).length, 0) / correctAyahs.length;
        const targetNum = correctAyahs[0].surahNumber;
        const others = pool.filter(a => a.surahName !== targetSurah);
        const score = (a) => Math.abs(a.surahNumber - targetNum) * 40 + Math.abs(cleanAyahText(a.text).length - avgLen) + Math.random() * 25;
        let wrongAyahs = [];
        const seenSurah = new Set();
        for (const a of others.sort((x, y) => score(x) - score(y))) {
            if (seenSurah.has(a.surahName) && others.some(o => !seenSurah.has(o.surahName) && o.surahName !== a.surahName)) continue;
            wrongAyahs.push(a); seenSurah.add(a.surahName);
            if (wrongAyahs.length === correctCount) break;
        }
        if (wrongAyahs.length < correctCount) return null;

        let allOptions = [...correctAyahs, ...wrongAyahs].map(a => cleanAyahText(a.text)).sort(() => 0.5 - Math.random());
        let correctAnswers = correctAyahs.map(a => cleanAyahText(a.text)); 

        return { type: 'checkbox', title: `حدد كل الآيات التي تنتمي إلى (سورة ${targetSurah}) ☑️:`, text: "اختر جميع الإجابات الصحيحة من القائمة:", options: allOptions, correctAnswer: correctAnswers, points: correctCount };
    }

    // 🌟 نمط 10: شبكة ترتيب الآيات (الصعب: ست آيات بدل أربع)
    async createMatrixOrderQuestion(targetAyah, pool, opts = {}) {
        let surah = await this.quranEngine.getSurah(targetAyah.surahNumber);
        let startIdx = targetAyah.numberInSurah - 1;
        const want = isHard(opts) ? 6 : 4;

        if (startIdx + want > surah.ayahs.length) {
            startIdx = Math.max(0, surah.ayahs.length - want);
        }

        let fourAyahs = surah.ayahs.slice(startIdx, startIdx + want);
        if (fourAyahs.length < 3) return null;
        // آيتان بنص واحد (آية مكررة كـ«فبأي آلاء ربكما تكذبان») تُربكان شبكة الترتيب: نتركها لصيغة أخرى
        if (new Set(fourAyahs.map(a => cleanAyahText(a.text))).size !== fourAyahs.length) return null;

        let correctAnswers = fourAyahs.map(a => cleanAyahText(a.text));
        let shuffledOptions = [...correctAnswers].sort(() => 0.5 - Math.random());

        return { type: 'matrix_order', title: `رتب الآيات التالية لتكوين المقطع القرآني الصحيح (من 1 إلى ${fourAyahs.length}): *`, text: "اقرأ الآيات جيداً، ثم اختر الترتيب الصحيح لكل آية.", options: shuffledOptions, correctAnswer: correctAnswers, points: fourAyahs.length };
    }

    // 🌟 نمط 11 الجديد: تسميع 3 آيات متتالية كتابياً (تقييم المعلم)
    async createWrite3AyahsQuestion(targetAyah, pool, opts = {}) {
        let surah = await this.quranEngine.getSurah(targetAyah.surahNumber);
        let startIdx = targetAyah.numberInSurah - 1;

        if (startIdx + 3 > surah.ayahs.length) {
            startIdx = Math.max(0, surah.ayahs.length - 3);
        }

        let ayahs = surah.ayahs.slice(startIdx, startIdx + 3);
        if (ayahs.length < 3) return null;

        // الصعب: كلمتان فقط تُعطيان للطالب كبداية بدل ثلاث
        let firstAyahPart = getCleanWords(ayahs[0].text).slice(0, isHard(opts) ? 2 : 3).join(" ");
        let fullText = ayahs.map(a => cleanAyahText(a.text)).join(" ۞ ");

        return {
            type: 'write_3_ayahs',
            title: "تسميع كتابي للمقاطع: ✍️",
            text: `اكتب الآيات الثلاث المتتالية ابتداءً من قوله تعالى:<br>﴿\u00A0${firstAyahPart} ...\u00A0﴾`,
            correctAnswer: fullText,
            points: 3, 
            needsManualGrading: true
        };
    }

    // ==========================================
    // 🌟 [جديد — بطلب المعلم] استخراج حكمين تجويديين من مقطع (تصحيح يدوي كامل، نقطتان)
    // ==========================================
    // - المقطع من آيات نطاق الواجب نفسه (pool = آيات نطاق حفظ الطالب) فقط: نأخذ حتى 3 آيات متتالية
    //   من نفس السورة تبدأ بالآية المختارة، ونكمل للخلف داخل النطاق إن قصر المقطع؛ لا نخرج عن النطاق أبداً.
    // - بلا مفتاح إجابة بقرار المعلم: correctAnswer نص فارغ (الخادم يشترط وجود الحقل فقط) والمعلم يصحّح بنفسه.
    // - نشترط 8 كلمات على الأقل في المقطع كي يحوي حكمين غالباً؛ وإلا يرجع null فيقع التوليد على البديل المعتاد.
    async createTajweedExtractQuestion(targetAyah, pool, opts = {}) {
        const sameSurah = (pool || [])
            .filter(a => a.surahNumber === targetAyah.surahNumber)
            .sort((a, b) => a.numberInSurah - b.numberInSurah);
        let idx = sameSurah.findIndex(a => a.numberInSurah === targetAyah.numberInSurah);
        if (idx < 0) return null;

        let passage = [sameSurah[idx]];
        let hi = idx, lo = idx;
        while (passage.length < 3) {
            const next = sameSurah[hi + 1];
            const prev = sameSurah[lo - 1];
            if (next && next.numberInSurah === sameSurah[hi].numberInSurah + 1) { passage.push(next); hi++; }
            else if (prev && prev.numberInSurah === sameSurah[lo].numberInSurah - 1) { passage.unshift(prev); lo--; }
            else break;
        }

        const wordsCount = passage.reduce((n, a) => n + getCleanWords(a.text).length, 0);
        if (wordsCount < 8) return null;

        const fullText = passage.map(a => cleanAyahText(a.text)).join(" ۞ ");
        return {
            type: 'tajweed_extract',
            title: "استخرج حكمين من أحكام التجويد من الآيات التالية: 📖",
            text: `﴿\u00A0${fullText}\u00A0﴾`,
            correctAnswer: '',
            points: 2,
            needsManualGrading: true
        };
    }

    // ==========================================
    // 🌟🌟 [جديد] نمط 13: مطابقة بدايات الآيات بنهاياتها (تصحيح آلي كامل)
    // ==========================================
    // 🌟🌟 [عُدّل — بقرار صريح من المعلم 2026-09-28] كان هذا السؤال needsManualGrading دائماً
    // (قرار سابق مقصود بحجة أن القرار النهائي يجب أن يبقى بيد المعلم)، لكن بما أن النظام أصلاً
    // يعرف الأزواج الصحيحة (correctAnswer أدناه من بيانات التوليد الحقيقية، لا تخميناً) ويقارنها
    // بدقة تامة — طلب المعلم تحويله لتصحيح آلي مثل باقي أسئلة الاختيار، بلا أي فرق في الموثوقية.
    // الدرجة الآن = عدد الأزواج الصحيحة (كل زوج نقطة واحدة من points)، تُحسب في الخادم عبر
    // autoGradeQuestion_ في backend/Code.gs (حالة 'matching' جديدة تقارن ans[left] === right لكل زوج).
    async createMatchingQuestion(targetAyah, pool, opts = {}) {
        let surah = await this.quranEngine.getSurah(targetAyah.surahNumber);
        let startIdx = targetAyah.numberInSurah - 1;
        const hard = isHard(opts);
        const PAIRS_COUNT = hard ? 6 : 4;   // الصعب: ست آيات وتطول النهاية حتى 4 كلمات

        if (startIdx + PAIRS_COUNT > surah.ayahs.length) {
            startIdx = Math.max(0, surah.ayahs.length - PAIRS_COUNT);
        }

        // نحتاج آيات ذات كلمات كافية (5 فأكثر) لتقسيمها لبداية ونهاية لهما معنى واضح للطفل
        let candidateAyahs = surah.ayahs.slice(startIdx, startIdx + PAIRS_COUNT)
            .filter(a => getCleanWords(a.text).length >= 5);

        if (candidateAyahs.length < (hard ? 4 : 3)) return null; // أقل من 3 أزواج (4 في الصعب) غير كافٍ لسؤال مطابقة مفيد

        let leftItems = [];
        let rightItems = [];
        let correctPairs = [];

        candidateAyahs.forEach((ayah, idx) => {
            let words = getCleanWords(ayah.text);
            let endCount = Math.min(hard ? 4 : 3, Math.floor(words.length / 2));
            let endingWords = words.slice(-endCount).join(" ");
            let startingWords = words.slice(0, -endCount).join(" ");

            const leftId = `L${idx}`;
            const rightId = `R${idx}`;
            leftItems.push({ id: leftId, text: startingWords });
            rightItems.push({ id: rightId, text: endingWords });
            correctPairs.push({ left: leftId, right: rightId });
        });

        // 🌟 نبعثر ترتيب عمود "النهايات" فقط؛ عمود "البدايات" يبقى بترتيبه الطبيعي كمرجع بصري ثابت للطالب
        rightItems = rightItems.sort(() => 0.5 - Math.random());

        return {
            type: 'matching',
            title: "طابق بداية كل آية بنهايتها الصحيحة 🔗:",
            text: "اضغط على بداية من العمود الأول، ثم على نهايتها المطابقة من العمود الثاني:",
            leftItems: leftItems,
            rightItems: rightItems,
            correctAnswer: correctPairs,
            points: correctPairs.length,
            needsManualGrading: false
        };
    }
}