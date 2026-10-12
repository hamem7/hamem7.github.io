// engine/homeworkEngine.js
import { cleanAyahText, isWaqfMark, splitAyahWords } from './quranEngine.js';

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

function pickDistractorWords(correctWord, wordsPool, count = 3) {
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
    return pickFromClosest(scored.map(x => x.w), count);
}

// مشتتات نصية (آيات/خواتيم): الأقرب في الطول وفي الكلمات المشتركة والحرف الأخير (القافية) أولاً
function pickDistractorTexts(correctText, candidateTexts, count = 3, exclude = []) {
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
    return pickFromClosest(scored.map(x => x.t), count, 8);
}

export class HomeworkEngine {
    constructor(quranEngine) {
        this.quranEngine = quranEngine;
    }

    // 🌟 [جديد — الواجب الذكي] إنشاء سؤال لمفتاح صيغة معيّن (المفاتيح نفسها المعرّفة في HW_FORMATS بـ engine/skillMap.js).
    // فُصل هنا بدل تكرار الـswitch في موضعين. يرجع null لو الآية لا تلائم الصيغة.
    async createQuestionByKey(typeKey, ayah, pool) {
        switch (typeKey) {
            case 'mcq_surah': return this.createMCQSurahGuess(ayah, pool);
            case 'mcq_next': return this.createMCQNextAyah(ayah, pool);
            case 'mcq_prev': return this.createMCQPrevAyah(ayah, pool);
            case 'ayah_ending': return this.createAyahEndingMatch(ayah, pool);
            case 'intruder_word': return this.createIntruderWordQuestion(ayah, pool);
            case 'dropdown': return this.createMissingWordDropdown(ayah, pool);
            case 'written_blank': return this.createWrittenBlankQuestion(ayah, pool);
            case 'dual_dropdown': return this.createDualMissingWordDropdown(ayah, pool);
            case 'checkbox': return this.createCheckboxQuestion(ayah, pool);
            case 'matrix_order': return this.createMatrixOrderQuestion(ayah, pool);
            case 'write_3_ayahs': return this.createWrite3AyahsQuestion(ayah, pool);
            case 'matching': return this.createMatchingQuestion(ayah, pool);
            case 'tajweed_extract': return this.createTajweedExtractQuestion(ayah, pool);
            case 'visual_page': return this.createVisualPageQuestion(ayah, pool);
            case 'word_meaning': return this.createWordMeaningQuestion(ayah, pool);
            default: return null;
        }
    }

    // 🌟 [جديد — الواجب الذكي] سؤال لصيغة وآية محدّدتين مسبقاً من خطة التتبّع. يرجع { question, fmt } حيث fmt هي الصيغة
    // التي أُنتجت فعلاً (قد تختلف عن المطلوبة إن لم تلائم الآية، فنقع على سؤال "أكمل الفراغ" كما في التوليد العشوائي).
    // التتبّع يسجّل الصيغة الفعلية دائماً، لا المطلوبة. allowFallback=false: يرجع null بدل البديل (تتولّى الخطة اختيار بديل أنسب).
    async buildQuestionForPlan(typeKey, ayah, pool, { allowFallback = true } = {}) {
        let question = await this.createQuestionByKey(typeKey, ayah, pool);
        let fmt = typeKey;
        if (!question && allowFallback) { question = await this.createMissingWordDropdown(ayah, pool); fmt = 'dropdown'; }
        if (!question) return null;
        question.id = 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        if (!question.points) question.points = (question.type === 'checkbox' || question.type === 'dual_dropdown') ? 2 : 1;
        return { question, fmt };
    }

    // 🌟 [جديد — الواجب الذكي] الذاكرة البصرية: "هذه الآية في الصفحة اليمنى أم اليسرى؟" (بدون فتح المصحف).
    // ⚠️ افتراض صريح: ترقيم مصحف المدينة (604 صفحة)؛ الصفحة الفردية = اليمنى (صفحة 1 الفاتحة يميناً). ولا نسأل إلا عن آية
    // تقع كلها في صفحة واحدة (الآية التالية في نفس الصفحة) كي لا يلتبس الجواب بآية تمتد على صفحتين. نوعه mcq فيُصحَّح آلياً
    // في الخادم والواجهة بلا أي تعديل عليهما.
    async createVisualPageQuestion(targetAyah, pool) {
        const page = Number(targetAyah.page);
        if (!(page >= 1 && page <= 604)) return null;
        const surah = await this.quranEngine.getSurah(targetAyah.surahNumber);
        const next = surah && surah.ayahs ? surah.ayahs[targetAyah.numberInSurah] : null;
        if (!next || Number(next.page) !== page) return null;
        const right = 'الصفحة اليمنى', left = 'الصفحة اليسرى';
        return {
            type: 'mcq',
            title: 'تنبيه: لا تفتح المصحف ✋ — هذه الآية تقع في الصفحة اليمنى أم اليسرى من المصحف؟',
            text: `﴿\u00A0${cleanAyahText(targetAyah.text)}\u00A0﴾`,
            options: [right, left],
            correctAnswer: (page % 2 === 1) ? right : left,
            points: 1
        };
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

    async createWordMeaningQuestion(targetAyah, pool) {
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
        const wrong = unique.slice(0, 12).sort(() => 0.5 - Math.random()).slice(0, 3);
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
    async createMCQSurahGuess(targetAyah, pool) {
        let cleanText = cleanAyahText(targetAyah.text);
        let correctAnswer = `سورة ${targetAyah.surahName}`;
        
        let allSurahs = await this.quranEngine.getAllSurahsList();
        // 🌟 [عدّل — 2026-10-12] المشتتات: سور قريبة في الترتيب وفي عدد الآيات (تتشابه في الطول والطابع) بدل أي سورة من ±5 عشوائياً
        const me = allSurahs.find(s => s.number === targetAyah.surahNumber);
        const rank = (s) => Math.abs(s.number - targetAyah.surahNumber) * 3 + (me && s.ayahsCount && me.ayahsCount ? Math.abs(s.ayahsCount - me.ayahsCount) / Math.max(me.ayahsCount, 1) * 10 : 0);
        let similarSurahs = allSurahs.filter(s => s.name !== targetAyah.surahName).sort((x, y) => rank(x) - rank(y)).slice(0, 8);

        let wrongOptions = similarSurahs.sort(() => 0.5 - Math.random()).slice(0, 3).map(s => `سورة ${s.name}`);
        let options = [correctAnswer, ...wrongOptions].sort(() => 0.5 - Math.random());

        return { type: 'mcq', title: "في أي سورة تقع هذه الآية؟", text: `﴿\u00A0${cleanText}\u00A0﴾`, options: options, correctAnswer: correctAnswer, points: 1 };
    }

    // 🌟 نمط 2: ما الآية التالية؟ 
    async createMCQNextAyah(targetAyah, pool) {
        let cleanText = cleanAyahText(targetAyah.text);
        let surah = await this.quranEngine.getSurah(targetAyah.surahNumber);

        // 🌟 إصلاح: الشرط القديم (length - 1) كان يستبعد بالخطأ آخر آيتين بدل آية واحدة فقط،
        // فتقل احتمالية ظهور هذا النوع من الأسئلة على آخر آية قبل الأخيرة في كل سورة دون داعٍ.
        if (targetAyah.numberInSurah >= surah.ayahs.length) return null;

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
    async createMCQPrevAyah(targetAyah, pool) {
        let cleanText = cleanAyahText(targetAyah.text);
        let surah = await this.quranEngine.getSurah(targetAyah.surahNumber);
        
        if (targetAyah.numberInSurah <= 1) return null; 

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
    async createAyahEndingMatch(targetAyah, pool) {
        let words = getCleanWords(targetAyah.text);
        if (words.length < 5) return null; 

        let endingCount = Math.min(3, Math.floor(words.length / 2)); 
        let endingWords = words.slice(-endingCount).join(" ");
        let startWords = words.slice(0, -endingCount).join(" ");
        let textWithBlank = startWords + " [ ....... ]";
        let correctAnswer = endingWords;

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

    // 🌟 نمط 5: الكلمة الدخيلة
    async createIntruderWordQuestion(targetAyah, pool) {
        let words = getCleanWords(targetAyah.text);
        if (words.length < 4) return null;

        let poolWords = pool.map(a => getCleanWords(a.text)).flat().filter(w => w.length > 3 && !words.includes(w));
        let intruderWord = poolWords.length > 0 ? poolWords[Math.floor(Math.random() * poolWords.length)] : "القرآن";
        
        let insertIdx = Math.floor(Math.random() * (words.length - 1)) + 1;
        let injectedWords = [...words];
        injectedWords.splice(insertIdx, 0, intruderWord); 
        let displayedText = injectedWords.join(" ");

        // 🌟 [عدّل — 2026-10-12] كلمات الآية المعروضة كخيارات: الأقرب شكلاً للدخيلة ليصعب كشفها بالطول/الشكل
        let validOptions = [...new Set(words)].filter(w => w.length > 2 && !isWaqfMark(w) && w !== intruderWord).sort((x, y) => wordDistance(intruderWord, x) - wordDistance(intruderWord, y) || (0.5 - Math.random())).slice(0, 5).sort(() => 0.5 - Math.random()).slice(0, 3);
        let options = [intruderWord, ...validOptions].sort(() => 0.5 - Math.random());

        return { type: 'mcq', title: "استخرج (الكلمة الدخيلة) التي تم إضافتها خطأً إلى هذه الآية:", text: `﴿\u00A0${displayedText}\u00A0﴾`, options: options, correctAnswer: intruderWord, points: 1 };
    }

    // 🌟 نمط 6 المطور: القائمة المنسدلة (عشوائية 20% - 80%)
    async createMissingWordDropdown(targetAyah, pool) {
        let words = getCleanWords(targetAyah.text);
        if (words.length < 4) return null; 

        let minIdx = Math.floor(words.length * 0.2);
        let maxIdx = Math.floor(words.length * 0.8);
        if (minIdx >= maxIdx) maxIdx = minIdx + 1;
        let hideIdx = Math.floor(Math.random() * (maxIdx - minIdx + 1)) + minIdx;

        let correctWord = words[hideIdx];
        words[hideIdx] = " [ ....... ] ";
        let textWithBlank = words.join(" ");

        let wrongWords = pickDistractorWords(correctWord, pool.map(a => getCleanWords(a.text)).flat(), 3);

        if(wrongWords.length < 3) wrongWords.push(...["الله", "الذي", "فيها"].filter(w => w !== correctWord && !wrongWords.includes(w)));
        let options = [correctWord, ...wrongWords].sort(() => 0.5 - Math.random());

        return { type: 'dropdown', title: "اختر الكلمة الصحيحة لإكمال الفراغ 🔽:", text: `﴿\u00A0${textWithBlank}\u00A0﴾`, options: options, correctAnswer: correctWord, points: 1 };
    }

    // 🌟 نمط 7 الجديد: الفراغ الكتابي اليدوي (تقييم المعلم)
    async createWrittenBlankQuestion(targetAyah, pool) {
        let words = getCleanWords(targetAyah.text);
        if (words.length < 4) return null; 

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
    async createDualMissingWordDropdown(targetAyah, pool) {
        let words = getCleanWords(targetAyah.text);
        if (words.length < 7) return null; 

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
        if (hideIdx1 > hideIdx2) [hideIdx1, hideIdx2] = [hideIdx2, hideIdx1]; 
        
        let correctWord1 = words[hideIdx1];
        let correctWord2 = words[hideIdx2];
        
        words[hideIdx1] = " [ 1 ] ";
        words[hideIdx2] = " [ 2 ] ";
        let textWithBlanks = words.join(" ");

        let dualPoolWords = pool.map(a => getCleanWords(a.text)).flat();

        let wrongWords1 = pickDistractorWords(correctWord1, dualPoolWords, 3);
        if(wrongWords1.length < 3) wrongWords1.push(...["الله", "الذي", "بما"].filter(w => w !== correctWord1 && !wrongWords1.includes(w)));
        let options1 = [correctWord1, ...wrongWords1].sort(() => 0.5 - Math.random());

        let wrongWords2 = pickDistractorWords(correctWord2, dualPoolWords, 3);
        if(wrongWords2.length < 3) wrongWords2.push(...["الأرض", "السماء", "كان"].filter(w => w !== correctWord2 && !wrongWords2.includes(w)));
        let options2 = [correctWord2, ...wrongWords2].sort(() => 0.5 - Math.random());

        return {
            type: 'dual_dropdown', title: "اختر الكلمتين الصحيحتين لإكمال الفراغين (1) و (2) 🔽:", text: `﴿\u00A0${textWithBlanks}\u00A0﴾`,
            options1: options1, options2: options2, correctAnswer: [correctWord1, correctWord2], points: 2
        };
    }

    // 🌟 نمط 9: مربعات الاختيار (تعدد الإجابات)
    async createCheckboxQuestion(targetAyah, pool) {
        let targetSurah = targetAyah.surahName;
        let correctAyahs = pool.filter(a => a.surahName === targetSurah).sort(() => 0.5 - Math.random()).slice(0, 2);
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
            if (wrongAyahs.length === 2) break;
        }
        if (wrongAyahs.length < 2) return null; 

        let allOptions = [...correctAyahs, ...wrongAyahs].map(a => cleanAyahText(a.text)).sort(() => 0.5 - Math.random());
        let correctAnswers = correctAyahs.map(a => cleanAyahText(a.text)); 

        return { type: 'checkbox', title: `حدد كل الآيات التي تنتمي إلى (سورة ${targetSurah}) ☑️:`, text: "اختر جميع الإجابات الصحيحة من القائمة:", options: allOptions, correctAnswer: correctAnswers, points: 2 };
    }

    // 🌟 نمط 10: شبكة ترتيب الآيات
    async createMatrixOrderQuestion(targetAyah, pool) {
        let surah = await this.quranEngine.getSurah(targetAyah.surahNumber);
        let startIdx = targetAyah.numberInSurah - 1;

        if (startIdx + 4 > surah.ayahs.length) {
            startIdx = Math.max(0, surah.ayahs.length - 4);
        }

        let fourAyahs = surah.ayahs.slice(startIdx, startIdx + 4);
        if (fourAyahs.length < 3) return null;

        let correctAnswers = fourAyahs.map(a => cleanAyahText(a.text));
        let shuffledOptions = [...correctAnswers].sort(() => 0.5 - Math.random());

        return { type: 'matrix_order', title: `رتب الآيات التالية لتكوين المقطع القرآني الصحيح (من 1 إلى ${fourAyahs.length}): *`, text: "اقرأ الآيات جيداً، ثم اختر الترتيب الصحيح لكل آية.", options: shuffledOptions, correctAnswer: correctAnswers, points: fourAyahs.length };
    }

    // 🌟 نمط 11 الجديد: تسميع 3 آيات متتالية كتابياً (تقييم المعلم)
    async createWrite3AyahsQuestion(targetAyah, pool) {
        let surah = await this.quranEngine.getSurah(targetAyah.surahNumber);
        let startIdx = targetAyah.numberInSurah - 1;

        if (startIdx + 3 > surah.ayahs.length) {
            startIdx = Math.max(0, surah.ayahs.length - 3);
        }

        let ayahs = surah.ayahs.slice(startIdx, startIdx + 3);
        if (ayahs.length < 3) return null;

        let firstAyahPart = getCleanWords(ayahs[0].text).slice(0, 3).join(" ");
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
    async createTajweedExtractQuestion(targetAyah, pool) {
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
    async createMatchingQuestion(targetAyah, pool) {
        let surah = await this.quranEngine.getSurah(targetAyah.surahNumber);
        let startIdx = targetAyah.numberInSurah - 1;
        const PAIRS_COUNT = 4;

        if (startIdx + PAIRS_COUNT > surah.ayahs.length) {
            startIdx = Math.max(0, surah.ayahs.length - PAIRS_COUNT);
        }

        // نحتاج آيات ذات كلمات كافية (5 فأكثر) لتقسيمها لبداية ونهاية لهما معنى واضح للطفل
        let candidateAyahs = surah.ayahs.slice(startIdx, startIdx + PAIRS_COUNT)
            .filter(a => getCleanWords(a.text).length >= 5);

        if (candidateAyahs.length < 3) return null; // أقل من 3 أزواج غير كافٍ لسؤال مطابقة مفيد

        let leftItems = [];
        let rightItems = [];
        let correctPairs = [];

        candidateAyahs.forEach((ayah, idx) => {
            let words = getCleanWords(ayah.text);
            let endCount = Math.min(3, Math.floor(words.length / 2));
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