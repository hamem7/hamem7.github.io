// engine/homeworkEngine.js
import { cleanAyahText } from './quranEngine.js';

// ==========================================
// 🌟🌟 [جديد] فلترة علامات الوقف القرآنية من "كلمات" الآية
// ==========================================
// المشكلة: نص الآية عند تقطيعه بالمسافات (split(/\s+/)) قد يحتوي على علامات وقف قرآنية
// (مثل: ج، صلى، صلي، قلى، قلي...) تظهر كأنها "كلمة" مستقلة بذاتها لأنها محاطة بمسافات في
// النص. هذا كان يتسبب في ظهورها بالخطأ كاختيار (صحيح أو خاطئ) في أسئلة الاختيار من متعدد
// والقوائم المنسدلة، رغم أنها ليست كلمة من كلمات الآية إطلاقاً بل رمز توجيهي للوقف أثناء التلاوة.
// الحل: أي مكان في هذا الملف كان يقطّع نص الآية إلى كلمات، أصبح يستخدم الدالة getCleanWords
// أدناه بدلاً من cleanAyahText(...).split(/\s+/) مباشرة، والتي تستبعد رموز الوقف تلقائياً.
const WAQF_MARKS = new Set(['صلى', 'صلي', 'قلى', 'قلي', 'سكتة', 'سكته']);

function isWaqfMark(word) {
    if (!word) return true;
    const w = word.trim();
    if (!w) return true;
    // نطاق يونيكود رموز الوقف القرآنية الرسمية (تُستخدم في بعض مصادر النص كرموز منفصلة)
    if (/^[ۖ-ۭ]+$/.test(w)) return true;
    // الأسماء المتعارف عليها لعلامات الوقف عندما تُكتب كنص عادي
    if (WAQF_MARKS.has(w)) return true;
    // حرف عربي واحد منفرد ومحاط بمسافات يكاد يكون دائماً رمز وقف (مثل: ج، م، ص، ق...) وليس
    // كلمة فعلية من كلمات الآية، لأن حروف المعاني المفردة (و، ب، ل...) تُكتب متصلة بالكلمة
    // التالية في الرسم العثماني ولا تظهر منفصلة بمسافة عنها.
    if (w.length === 1 && /^[ء-ي]$/.test(w)) return true;
    return false;
}

// تقطيع نص الآية إلى كلمات فعلية فقط (بعد استبعاد رموز الوقف تماماً)
function getCleanWords(text) {
    return cleanAyahText(text).split(/\s+/).filter(w => w && !isWaqfMark(w));
}

// ==========================================
// 🌟🌟 [جديد] اختيار اختيارات خاطئة "مشتتة" فعلاً لانتباه الطالب
// ==========================================
// المشكلة: الاختيارات الخاطئة كانت تُنتقى بشكل شبه عشوائي بالكامل من مخزون كلمات متفرقة، مما
// يجعلها سهلة الاستبعاد بالتخمين (طول مختلف جداً، شكل مختلف تماماً عن الإجابة الصحيحة).
// الحل: نرتب المرشحين حسب مدى تقارب طول الكلمة مع الكلمة الصحيحة (الأقرب طولاً أولاً)، وهو ما
// يجعل الاختيارات الخاطئة أقرب شكلاً للإجابة الصحيحة وأصعب في التمييز بالتخمين البصري السريع.
function pickDistractorWords(correctWord, wordsPool, count = 3) {
    const scored = wordsPool
        .filter(w => w && w !== correctWord && !isWaqfMark(w))
        .map(w => ({ w, diff: Math.abs(w.length - correctWord.length) }))
        .sort((a, b) => a.diff - b.diff || (0.5 - Math.random()));

    const result = [];
    const used = new Set();
    for (const item of scored) {
        if (used.has(item.w)) continue; // تجنّب تكرار نفس الكلمة كاختيارين مختلفين
        used.add(item.w);
        result.push(item.w);
        if (result.length >= count) break;
    }
    return result;
}

export class HomeworkEngine {
    constructor(quranEngine) {
        this.quranEngine = quranEngine;
    }

    async generateAutoQuestions(config) {
        let ayahsPool = [];
        
        if (config.mode === 'surah') {
            let surah = await this.quranEngine.getSurah(config.surahNum);
            if (surah) ayahsPool = this.quranEngine.getAyahsInRange(surah, config.startAyah, config.endAyah);
        } else if (config.mode === 'range') {
            ayahsPool = await this.quranEngine.getAyahsBySurahRange(config.rangeFrom, config.rangeTo);
        } else if (config.mode === 'juz') {
            ayahsPool = await this.quranEngine.getAyahsByJuz(config.juzNum);
        }

        if (!ayahsPool || ayahsPool.length === 0) return [];

        let validPool = ayahsPool.filter(a => getCleanWords(a.text).length > 3);
        if (validPool.length === 0) validPool = ayahsPool; 

        // 🌟 التغطية الشاملة والعادلة (Chunking)
        let qCount = Math.min(config.qCount, validPool.length);
        let selectedAyahs = [];
        let chunkSize = Math.max(1, Math.floor(validPool.length / qCount));

        for (let i = 0; i < qCount; i++) {
            let start = i * chunkSize;
            let end = (i === qCount - 1) ? validPool.length : (i + 1) * chunkSize;
            let chunk = validPool.slice(start, end);
            if (chunk.length > 0) {
                let randomAyah = chunk[Math.floor(Math.random() * chunk.length)];
                selectedAyahs.push(randomAyah);
            }
        }

        selectedAyahs = selectedAyahs.sort(() => 0.5 - Math.random());
        let questionsList = [];

        let isSingleSurah = (config.mode === 'surah');
        // 🌟 الأنواع الجديدة بعد التحديث وحذف الصح والخطأ
        // ⚠️ [تعديل] تم استبعاد 'audio_record' من التوليد التلقائي العشوائي مؤقتاً: هذا النوع يتطلب
        // رفع ملفات صوتية فعلية إلى Firebase Storage (وليس مجرد نص)، وهو أثقل تقنياً وأكثر عرضة للأعطال
        // من بقية الأنواع (يحتاج تفعيل Storage، صلاحيات، اتصال أقوى). لا يزال بإمكان المعلم إضافته
        // يدوياً وبوعي كامل من نافذة "إضافة سؤال يدوي" في homework-prep.js إن أراد فعلاً استخدامه.
        // 🌟 [جديد] أضفنا 'matching' (مطابقة بدايات الآيات بنهاياتها) لدورة التوليد التلقائي، بنفس
        // معاملة 'written_blank' و'write_3_ayahs' الموجودين أصلاً رغم كونهما تصحيحاً يدوياً — دخول
        // نوع ضمن هذه القائمة لا يعني تصحيحاً آلياً بالضرورة، فقط أنه مؤهل للظهور تلقائياً.
        let availableTypes = ['dropdown', 'written_blank', 'dual_dropdown', 'mcq_next', 'mcq_prev', 'ayah_ending', 'intruder_word', 'checkbox', 'matrix_order', 'write_3_ayahs', 'matching'];
        let cycle = [];
        let mcqSurahUsed = false; 

        for (let i = 0; i < selectedAyahs.length; i++) {
            let ayah = selectedAyahs[i];
            let qTypeKey = '';

            // 🌟 ذكاء سؤال السورة: لا يظهر أبداً إذا كان النطاق سورة واحدة
            if (!isSingleSurah && !mcqSurahUsed) {
                qTypeKey = 'mcq_surah';
                mcqSurahUsed = true;
            } else {
                if (cycle.length === 0) {
                    cycle = [...availableTypes].sort(() => 0.5 - Math.random());
                    if (!isSingleSurah) cycle.push('mcq_surah');
                    cycle = cycle.sort(() => 0.5 - Math.random());
                }
                qTypeKey = cycle.pop(); 
            }

            let questionObj = null;

            switch(qTypeKey) {
                case 'mcq_surah': questionObj = await this.createMCQSurahGuess(ayah, validPool); break;
                case 'mcq_next': questionObj = await this.createMCQNextAyah(ayah, validPool); break;
                case 'mcq_prev': questionObj = await this.createMCQPrevAyah(ayah, validPool); break;
                case 'ayah_ending': questionObj = await this.createAyahEndingMatch(ayah, validPool); break;
                case 'intruder_word': questionObj = await this.createIntruderWordQuestion(ayah, validPool); break;
                case 'dropdown': questionObj = await this.createMissingWordDropdown(ayah, validPool); break;
                case 'written_blank': questionObj = await this.createWrittenBlankQuestion(ayah, validPool); break;
                case 'dual_dropdown': questionObj = await this.createDualMissingWordDropdown(ayah, validPool); break;
                case 'checkbox': questionObj = await this.createCheckboxQuestion(ayah, validPool); break;
                case 'matrix_order': questionObj = await this.createMatrixOrderQuestion(ayah, validPool); break;
                case 'write_3_ayahs': questionObj = await this.createWrite3AyahsQuestion(ayah, validPool); break;
                case 'audio_record': questionObj = await this.createAudioRecordQuestion(ayah, validPool); break;
                case 'matching': questionObj = await this.createMatchingQuestion(ayah, validPool); break;
            }

            // بديل آمن في حال عدم ملائمة الآية للسؤال
            if (!questionObj) {
                questionObj = await this.createMissingWordDropdown(ayah, validPool);
            }

            if (questionObj) {
                questionObj.id = 'q_' + Date.now() + '_' + i;
                if(!questionObj.points) questionObj.points = (questionObj.type === 'checkbox' || questionObj.type === 'dual_dropdown') ? 2 : 1; 
                questionsList.push(questionObj);
            }
        }

        return questionsList;
    }

    // 🌟 نمط 1: تخمين السورة (يتم التحكم بظهوره من الدالة الرئيسية)
    async createMCQSurahGuess(targetAyah, pool) {
        let cleanText = cleanAyahText(targetAyah.text);
        let correctAnswer = `سورة ${targetAyah.surahName}`;
        
        let allSurahs = await this.quranEngine.getAllSurahsList();
        let similarSurahs = allSurahs.filter(s => Math.abs(s.number - targetAyah.surahNumber) <= 5 && s.name !== targetAyah.surahName);
        if(similarSurahs.length < 3) similarSurahs = allSurahs.filter(s => s.name !== targetAyah.surahName);

        let wrongOptions = similarSurahs.sort(() => 0.5 - Math.random()).slice(0, 3).map(s => `سورة ${s.name}`);
        let options = [correctAnswer, ...wrongOptions].sort(() => 0.5 - Math.random());

        return { type: 'mcq', title: "في أي سورة تقع هذه الآية؟", text: `﴿ ${cleanText} ﴾`, options: options, correctAnswer: correctAnswer, points: 1 };
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
        
        let extraWrongs = pool.filter(a => a.number !== nextAyah.number && a.number !== targetAyah.number).sort(() => 0.5 - Math.random());
        while (wrongOptions.length < 3 && extraWrongs.length > 0) wrongOptions.push(cleanAyahText(extraWrongs.pop().text));

        let options = [correctAnswer, ...wrongOptions].slice(0, 4).sort(() => 0.5 - Math.random());

        return { type: 'mcq', title: "ما هي الآية التي تلي هذه الآية مباشرة؟", text: `﴿ ${cleanText} ﴾`, options: options, correctAnswer: correctAnswer, points: 1 };
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
        
        let extraWrongs = pool.filter(a => a.number !== prevAyah.number && a.number !== targetAyah.number).sort(() => 0.5 - Math.random());
        while (wrongOptions.length < 3 && extraWrongs.length > 0) wrongOptions.push(cleanAyahText(extraWrongs.pop().text));

        let options = [correctAnswer, ...wrongOptions].slice(0, 4).sort(() => 0.5 - Math.random());

        return { type: 'mcq', title: "ما هي الآية التي تَسبِق هذه الآية مباشرة؟ (استرجاع عكسي)", text: `﴿ ${cleanText} ﴾`, options: options, correctAnswer: correctAnswer, points: 1 };
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

        let wrongOptions = pool.map(a => getCleanWords(a.text))
            .filter(w => w.length >= endingCount)
            .map(w => w.slice(-endingCount).join(" "))
            .filter(e => e !== correctAnswer)
            .sort(() => 0.5 - Math.random()).slice(0, 3);

        if (wrongOptions.length < 3) wrongOptions.push("وَاللَّهُ غَفُورٌ رَّحِيمٌ", "وَاللَّهُ سَمِيعٌ عَلِيمٌ", "وَهُوَ الْعَزِيزُ الْحَكِيمُ"); 
        let options = [correctAnswer, ...wrongOptions].sort(() => 0.5 - Math.random());

        return { type: 'mcq', title: "اختر الخاتمة الصحيحة والدقيقة لهذه الآية:", text: `﴿ ${textWithBlank} ﴾`, options: options, correctAnswer: correctAnswer, points: 1 };
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

        let validOptions = words.filter(w => w.length > 2).sort(() => 0.5 - Math.random()).slice(0, 3);
        let options = [intruderWord, ...validOptions].sort(() => 0.5 - Math.random());

        return { type: 'mcq', title: "استخرج (الكلمة الدخيلة) التي تم إضافتها خطأً إلى هذه الآية:", text: `﴿ ${displayedText} ﴾`, options: options, correctAnswer: intruderWord, points: 1 };
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

        return { type: 'dropdown', title: "اختر الكلمة الصحيحة لإكمال الفراغ 🔽:", text: `﴿ ${textWithBlank} ﴾`, options: options, correctAnswer: correctWord, points: 1 };
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
            text: `﴿ ${textWithBlank} ﴾`, 
            correctAnswer: correctWord, 
            points: 2,
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
            type: 'dual_dropdown', title: "اختر الكلمتين الصحيحتين لإكمال الفراغين (1) و (2) 🔽:", text: `﴿ ${textWithBlanks} ﴾`,
            options1: options1, options2: options2, correctAnswer: [correctWord1, correctWord2], points: 2
        };
    }

    // 🌟 نمط 9: مربعات الاختيار (تعدد الإجابات)
    async createCheckboxQuestion(targetAyah, pool) {
        let targetSurah = targetAyah.surahName;
        let correctAyahs = pool.filter(a => a.surahName === targetSurah).sort(() => 0.5 - Math.random()).slice(0, 2);
        if (correctAyahs.length < 2) return null; 

        let wrongAyahs = pool.filter(a => a.surahName !== targetSurah).sort(() => 0.5 - Math.random()).slice(0, 2);
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
            text: `اكتب الآيات الثلاث المتتالية ابتداءً من قوله تعالى:<br>﴿ ${firstAyahPart} ... ﴾`,
            correctAnswer: fullText,
            points: 3, 
            needsManualGrading: true
        };
    }

    // 🌟 نمط 12 الجديد: التسميع الصوتي (تقييم المعلم)
    async createAudioRecordQuestion(targetAyah, pool) {
        return {
            type: 'audio_record',
            title: "تسميع صوتي: 🎤",
            text: `قم بتسجيل قراءتك للآية التالية بصوتك:<br>سورة ${targetAyah.surahName} - الآية ${targetAyah.numberInSurah}`,
            correctAnswer: cleanAyahText(targetAyah.text),
            points: 2,
            needsManualGrading: true
        };
    }

    // ==========================================
    // 🌟🌟 [جديد] نمط 13: مطابقة بدايات الآيات بنهاياتها (تقييم المعلم بالكامل، لا تصحيح آلي)
    // ==========================================
    // اتفاق صريح مع المعلم: هذا السؤال needsManualGrading دائماً — لا تُحسب له أي درجة تلقائياً
    // مهما كانت إجابة الطالب مطابقة تماماً، لأن القرار النهائي يجب أن يبقى بيد المعلم دوماً.
    // النظام فقط يوفّر "الأزواج الصحيحة" كمرجع جاهز (من correctAnswer أدناه، نفس بيانات التوليد،
    // وليس تخميناً) لتُعرض كاقتراح في غرفة التصحيح بـ homework-prep.js، لا لحساب الدرجة نيابةً عنه.
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
            needsManualGrading: true
        };
    }
}