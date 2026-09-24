// engine/kidsEngine.js
// 🌟 splitAyahWords / splitAyahTokens / realWordIndexes: دوال مركزية في quranEngine.js تستبعد
// علامات الوقف القرآنية (ۚ ۖ ۗ / ج / صلى / قلى...) من "كلمات" الآية، حتى لا تظهر كبطاقة اختيار
// أو كبطاقة ترتيب أمام الطفل وهي ليست كلمة من كلمات الآية أصلاً 🌟
import { cleanName, cleanAyahText, pickTargetAyah, splitAyahWords, splitAyahTokens, realWordIndexes } from './quranEngine.js';

export class KidsEngine {
    constructor(quranEngine) {
        this.quranEngine = quranEngine; // لكي نتمكن من الوصول لقاعدة بيانات القرآن
    }

    async generateKidsCatchGame(ayahsPool, chunkIndex, totalChunks) { 
        // 🌟🌟 [إصلاح] الكلمة المخفية لا يجوز أن تكون علامة وقف (زي ۚ "الجيم الصغيرة") — كانت
        // القسمة بالمسافات تعتبر رمز الوقف كلمةً مستقلة، فلو صادف وقوعه في منتصف الآية بالضبط
        // يصبح هو "الإجابة الصحيحة" ويظهر للطفل كبطاقة اختيار، وهو رمز تلاوة لا كلمة من الآية.
        // الحل: نحتفظ بالنص المعروض كما هو (برموز وقفه، splitAyahTokens)، لكن نختار موضع الإخفاء
        // من مواضع الكلمات الفعلية فقط (realWordIndexes)، ونسحب المشتتات من splitAyahWords 🌟🌟
        const ayah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); if(!ayah) return null; let cleanText = cleanAyahText(ayah.text); let words = splitAyahTokens(ayah.text); let realIdxs = realWordIndexes(words); if(realIdxs.length < 4) return null;
        let hideIdx = realIdxs[Math.floor(realIdxs.length / 2)]; let missingWord = words[hideIdx]; words[hideIdx] = " ..... "; let visibleWords = words.join(" ");
        let sameSurahAyahs = ayahsPool.filter(a => a.surahNumber === ayah.surahNumber && a.number !== ayah.number); let distractors = []; sameSurahAyahs.forEach(a => distractors.push(...splitAyahWords(a.text))); distractors = [...new Set(distractors)].filter(w => w.length > 3 && w !== missingWord); distractors.sort(() => Math.random() - 0.5);
        let options = [missingWord]; while(options.length < 3 && distractors.length > 0) { let d = distractors.pop(); if(!options.includes(d)) options.push(d); } 
        let backup = ["الْأَرْضِ", "السَّمَاءِ", "الْعَظِيمِ", "الْكَرِيمِ"]; while(options.length < 3 && backup.length > 0) { let b = backup.pop(); if(!options.includes(b)) options.push(b); } options.sort(() => Math.random() - 0.5); 
        return { type: 'kids_mcq', questionTitle: "اختر الكلمة الناقصة يا بطل! 🎯", questionBody: `<div class="quran-text" style="font-size:3.5rem; color:#0284c7; line-height: 1.6;">﴿ ${visibleWords} ﴾</div>`, correctAns: missingWord, options: options, ayahObj: ayah, reportText: cleanText }; 
    }

    async generateKidsNextAyahGame(ayahsPool, chunkIndex, totalChunks) {
        let validAyahs = ayahsPool.filter(a => a.numberInSurah < 50); if(validAyahs.length === 0) return null; const targetAyah = pickTargetAyah(validAyahs, chunkIndex, totalChunks); if(!targetAyah) return null; let surah = await this.quranEngine.getSurah(targetAyah.surahNumber); if(!surah || targetAyah.numberInSurah >= surah.ayahs.length) return null; 
        let nextAyahText = cleanAyahText(surah.ayahs[targetAyah.numberInSurah].text); let targetText = cleanAyahText(targetAyah.text);
        let options = [nextAyahText]; let otherAyahs = surah.ayahs.filter(a => Math.abs(a.numberInSurah - targetAyah.numberInSurah) > 1 && cleanAyahText(a.text).length > 5); otherAyahs.sort(() => Math.random() - 0.5); 
        for(let a of otherAyahs) { if(options.length >= 3) break; let txt = cleanAyahText(a.text); if(txt !== nextAyahText) options.push(txt); }
        if(options.length < 3) { let externalAyahs = ayahsPool.filter(a => a.surahNumber !== targetAyah.surahNumber); externalAyahs.sort(() => Math.random() - 0.5); for(let a of externalAyahs) { if(options.length >= 3) break; let txt = cleanAyahText(a.text); if(!options.includes(txt)) options.push(txt); } } options.sort(() => Math.random() - 0.5); 
        // 🌟 [تصحيح] اتجاه السهم عُكِس ليوافق اتجاه القراءة العربية (RTL): ما بعد الآية يقع إلى يسارها، فالسهم ⬅️ 🌟
        return { type: 'kids_mcq', questionTitle: "ماذا بعد هذه الآية يا بطل؟ ⬅️", questionBody: `<div class="quran-text" style="font-size:3.5rem; color:#d97706; margin-bottom:15px;">﴿ ${targetText} ﴾</div><div style="font-size:1.8rem; font-weight:bold;">اختر الآية التي تليها:</div>`, correctAns: nextAyahText, options: options, ayahObj: targetAyah, reportText: targetText }; 
    }
    
    async generateKidsWordOrderGame(ayahsPool, chunkIndex, totalChunks) {
        // 🌟 [إصلاح] بطاقات الترتيب = كلمات فعلية فقط؛ رمز الوقف كان يظهر كبطاقة مستقلة يُطلب من
        // الطفل وضعها في مكانها الصحيح، وهو ليس كلمة من كلمات الآية 🌟
        let validAyahs = ayahsPool.filter(a => { let w = splitAyahWords(a.text); return w.length >= 3 && w.length <= 6; }); if(validAyahs.length === 0) return null;
        const ayah = pickTargetAyah(validAyahs, chunkIndex, totalChunks); let cleanText = cleanAyahText(ayah.text); let words = splitAyahWords(ayah.text); let shuffled = [...words].sort(() => Math.random() - 0.5);
        return { type: 'kids_word_order', questionTitle: "رتب كلمات الآية يا بطل 🧩", originalWords: words, shuffledWords: shuffled, ayahObj: ayah, reportText: cleanText }; 
    }

    async generateKidsTrueFalse(ayahsPool, chunkIndex, totalChunks) { 
        const ayah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); if(!ayah) return null; let isTrue = Math.random() > 0.5; let displayedSurahName = ayah.surahName; 
        if(!isTrue) { let otherSurahs = [...new Set(ayahsPool.map(a => a.surahName))].filter(n => n !== ayah.surahName); if(otherSurahs.length === 0) { let allSurahsList = await this.quranEngine.getAllSurahsList(); otherSurahs = allSurahsList.map(s => s.name).filter(n => n !== ayah.surahName); } if(otherSurahs.length > 0) displayedSurahName = otherSurahs[Math.floor(Math.random() * otherSurahs.length)]; else isTrue = true; } 
        let cleanText = cleanAyahText(ayah.text); return { type: 'kids_tf', questionTitle: `صح أم خطأ؟ 🚦`, questionBody: `<div class="quran-text" style="font-size:3.5rem; color:#b91c1c; margin-bottom:20px;">﴿ ${cleanText} ﴾</div><div style="font-size:2.2rem; font-weight:bold; background:white; padding:15px; border-radius:15px; border:4px dashed #38bdf8; display:inline-block;">هل هذه الآية من سورة <span style="color:#0284c7;">( ${displayedSurahName} )</span> ؟</div>`, isTrue: isTrue, ayahObj: ayah, reportText: cleanText }; 
    }

    async generateKidsGuessSurah(ayahsPool, chunkIndex, totalChunks) {
        const ayah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); if(!ayah) return null; let correctSurah = ayah.surahName; let allSurahNames = [...new Set(ayahsPool.map(a => a.surahName))].filter(n => n !== correctSurah); 
        if (allSurahNames.length < 2) { let allQuranSurahs = await this.quranEngine.getAllSurahsList(); let extraNames = allQuranSurahs.map(s => s.name).filter(n => n !== correctSurah); extraNames.sort(() => Math.random() - 0.5); allSurahNames = allSurahNames.concat(extraNames); }
        let options = [correctSurah]; while(options.length < 3 && allSurahNames.length > 0) { let rIdx = Math.floor(Math.random() * allSurahNames.length); let choice = allSurahNames.splice(rIdx, 1)[0]; if(!options.includes(choice)) options.push(choice); } options.sort(() => Math.random() - 0.5); 
        let cleanText = cleanAyahText(ayah.text); return { type: 'kids_mcq', questionTitle: "خمن السورة يا بطل! 🌟", questionBody: `<div class="quran-text" style="font-size:3.5rem; color:#0284c7;">﴿ ${cleanText} ﴾</div>`, correctAns: correctSurah, options: options, ayahObj: ayah, reportText: cleanText }; 
    }

    async generateKidsStartSurah(ayahsPool, chunkIndex, totalChunks) {
        const ayah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); if(!ayah) return null;
        let surah = await this.quranEngine.getSurah(ayah.surahNumber);
        let firstAyahText = cleanAyahText(surah.ayahs[0].text);
        
        let options = [firstAyahText];
        
        let poolSurahs = [...new Set(ayahsPool.map(a => a.surahNumber))];
        let otherSurahs = poolSurahs.filter(num => num !== surah.number).sort(() => Math.random() - 0.5).slice(0, 2);
        
        if(otherSurahs.length < 2) {
            let allList = await this.quranEngine.getAllSurahsList();
            let extras = allList.filter(s => s.number >= 67 && s.number !== surah.number && !otherSurahs.includes(s.number)).sort(() => Math.random() - 0.5);
            for(let ex of extras) {
                if(otherSurahs.length >= 2) break;
                otherSurahs.push(ex.number);
            }
        }
        
        for (let num of otherSurahs) {
            let sData = await this.quranEngine.getSurah(num);
            options.push(cleanAyahText(sData.ayahs[0].text));
        }
        options.sort(() => Math.random() - 0.5);
        
        return { type: 'kids_mcq', questionTitle: "بأي آية تبدأ هذه السورة؟ 🏁", questionBody: `<div style="font-size:2.5rem; color:var(--primary); font-weight:bold; margin-bottom:20px;">سورة ( ${cleanName(surah.name)} )</div>`, correctAns: firstAyahText, options: options, ayahObj: surah.ayahs[0], reportText: `أول آية من سورة ${surah.name}` };
    }

    async generateKidsExtraWord(ayahsPool, chunkIndex, totalChunks) {
        // 🌟 [إصلاح] الآية هنا تُعرض بعد دسّ كلمة زائدة، والاختيارات الثلاثة كلها كلمات من الآية
        // (أول كلمة / آخر كلمة / الكلمة المدسوسة) — فنستبعد رموز الوقف من التقطيع كلياً حتى لا
        // يصادف أن تكون أول أو آخر "كلمة" رمز وقف فتظهر كبطاقة اختيار أمام الطفل 🌟
        let validAyahs = ayahsPool.filter(a => { let w = splitAyahWords(a.text); return w.length >= 4 && w.length <= 8; });
        if(validAyahs.length === 0) validAyahs = ayahsPool;
        const ayah = pickTargetAyah(validAyahs, chunkIndex, totalChunks); if(!ayah) return null;

        let cleanText = cleanAyahText(ayah.text);
        let words = splitAyahWords(ayah.text);
        
        let surah = await this.quranEngine.getSurah(ayah.surahNumber);
        let poolWords = [];
        let startA = Math.max(0, ayah.numberInSurah - 3); 
        let endA = Math.min(surah.ayahs.length - 1, ayah.numberInSurah + 1); 
        for(let i = startA; i <= endA; i++) {
            if (i !== (ayah.numberInSurah - 1)) { 
                let wArr = splitAyahWords(surah.ayahs[i].text);
                poolWords.push(...wArr);
            }
        }
        
        let validDistractors = poolWords.filter(w => w.length >= 3 && w.length <= 6 && !words.includes(w));
        let extraWord = "";
        
        if (validDistractors.length > 0) {
            extraWord = validDistractors[Math.floor(Math.random() * validDistractors.length)];
        } else {
            let backupDistractors = ["بَلْ", "قَدْ", "سَوْفَ", "لَقَدْ", "كَأَنَّ", "إِنَّمَا", "وَهُوَ"];
            extraWord = backupDistractors[Math.floor(Math.random() * backupDistractors.length)];
        }
        
        let insertPos = Math.floor(Math.random() * (words.length - 1)) + 1; 
        let fakeAyahText = [...words];
        fakeAyahText.splice(insertPos, 0, extraWord);
        
        let options = [extraWord, words[0], words[words.length-1]]; 
        options.sort(() => Math.random() - 0.5);
        
        return { type: 'kids_mcq', questionTitle: "استخرج الكلمة الزائدة الخاطئة! 🚫", questionBody: `<div class="quran-text" style="font-size:3.5rem; color:#0284c7; line-height: 1.6;">﴿ ${fakeAyahText.join(" ")} ﴾</div>`, correctAns: extraWord, options: options, ayahObj: ayah, reportText: `استخراج كلمة ${extraWord}` };
    }

    async generateKidsPrevious(ayahsPool, chunkIndex, totalChunks) {
        let validAyahs = ayahsPool.filter(a => a.numberInSurah > 1); if(validAyahs.length === 0) return null;
        const targetAyah = pickTargetAyah(validAyahs, chunkIndex, totalChunks); if(!targetAyah) return null;
        let surah = await this.quranEngine.getSurah(targetAyah.surahNumber);
        let prevAyahText = cleanAyahText(surah.ayahs[targetAyah.numberInSurah - 2].text);
        let targetText = cleanAyahText(targetAyah.text);
        
        let options = [prevAyahText];
        let otherAyahs = surah.ayahs.filter(a => Math.abs(a.numberInSurah - targetAyah.numberInSurah) > 1);
        otherAyahs.sort(() => Math.random() - 0.5); 
        for(let a of otherAyahs) { if(options.length >= 3) break; options.push(cleanAyahText(a.text)); }
        options.sort(() => Math.random() - 0.5);
        
        // 🌟 [تصحيح] اتجاه السهم عُكِس ليوافق اتجاه القراءة العربية (RTL): ما قبل الآية يقع إلى يمينها، فالسهم ➡️ 🌟
        return { type: 'kids_mcq', questionTitle: "ماذا قبل هذه الآية؟ ➡️", questionBody: `<div class="quran-text" style="font-size:3.5rem; color:#d97706; margin-bottom:15px;">﴿ ${targetText} ﴾</div>`, correctAns: prevAyahText, options: options, ayahObj: targetAyah, reportText: targetText };
    }
    // 🌟 [حذف] لعبة "كم عدد آيات هذه السورة؟" (generateKidsAyahCount) — طلب المعلم إزالتها من
    // ركن الأطفال لأنها صعبة على الصغار (تتطلب حفظ عدد آيات دقيق بدل حفظ نص/معنى الآية نفسها).
    // أُزيلت من قائمة ألعاب kidsGame.js بالكامل (gamesList + استدعاؤها)، وحُذفت الدالة هنا لأنها
    // أصبحت غير مستخدَمة في أي مكان آخر بالمنصة (تحققنا بالبحث في كل الملفات قبل الحذف).

    // 🌟 [جديد بالكامل] لعبة "استمع وخمّن الآية" — أول ميزة استماع فعلي لتلاوة قرآنية حقيقية في
    // المنصة كلها. قبل هذه الميزة لم يوجد أي صوت تلاوة مسجَّل يُشغَّل من المنصة إطلاقًا؛ قسم
    // "التسميع المباشر" (recitation/) هو فقط لتسجيل ملاحظات المعلم أثناء استماعه هو للطالب مباشرة
    // (بلا أي صوت تشغّله المنصة نفسها). تُشغَّل الآية هنا بصوت القارئ عبد الباسط عبد الصمد —
    // رواية "المرتل" تحديدًا (`ar.abdulbasitmurattal`)، وليس "المجوَّد" رغم طلب المعلم الأصلي:
    // تأكدنا فعليًا (بطلب رابط آية مفردة من واجهة alquran.cloud قبل البناء) أن نسخة "المجوَّد"
    // مسجَّلة فقط كملفات سور كاملة (نمط التلاوة المجوَّدة نفسه مبني على مقاطع طويلة متصلة لا آية
    // منفردة)، فرجعت خطأ 404 عند طلب آية واحدة منها — بخلاف "المرتل" المتوفرة فعليًا لكل آية على
    // حدة. عُرض هذا على المعلم صراحة واختار "المرتل" بديلاً.
    // 🌟 [تعديل] الرابط هنا (audioUrl) أصبح مجرد "خط رجوع" فقط، وليس مصدر التشغيل المعتاد كما
    // كان أول ما بُنيت هذه اللعبة: أضفنا طبقة تخزين محلي (database/kidsAudioDB.js، بنفس فلسفة
    // IndexedDB المتّبعة في كل قواعد بيانات المشروع) تُحمِّل صوت كل آيات نطاق الطالب دفعة واحدة
    // في الخلفية عند فتح شاشة ألعاب الأطفال (راجع الاستدعاء في openKidsGameScreen بـ
    // games/kidsGame.js)، فتعمل اللعبة بعدها بدون إنترنت تمامًا مثل باقي ألعاب المنصة. الرابط هنا
    // يُستخدَم فقط لو (نادرًا) طُلبت آية قبل اكتمال تحميلها المسبق — عندها window.playKidsListenAyahAudio
    // (راجع تعليقها في kidsGame.js) تشغّله مباشرة وتخزّنه في نفس اللحظة للمرة القادمة، ولو تعذّر
    // ذلك أيضًا (لا إنترنت + غير مخزَّن بعد) تظهر رسالة تنبيه بدل فشل صامت.
    // ⚠️ [افتراض صريح — بقرار المعلم]: جودة الصوت 64kbps بدل 192kbps المُستخدَمة أول بناء لهذه
    // اللعبة — راجع تفاصيل السبب والتحقق الفعلي منها في تعليق database/kidsAudioDB.js. الرقم 64
    // هنا مكرَّر يدويًا من ذلك الملف (وليس مستوردًا منه) لأن kidsEngine.js لا يستورد من database/
    // في أي مكان بالمشروع كله حاليًا — حافظنا على نفس هذا الفصل القائم بين "محرك نقي" و"طبقة
    // تخزين" بدل كسره لأجل توحيد سطر واحد فقط. ⚠️ لو تغيّر الـbitrate مستقبلاً يلزم تعديل الرقم
    // في الملفين معًا (هنا وفي database/kidsAudioDB.js).
    // ⚠️ [افتراض صريح — بقرار المعلم]: نطاق آيات هذه اللعبة هو نفس ayahsPool الممرَّر من المستدعي
    // (نطاق حفظ الطفل نفسه المحدَّد من المعلم)، بلا جلب نطاق مستقل عبر getAyahsByJuz(29)/(30)،
    // لأن نطاق ركن الأطفال بالكامل أصلاً محصور في جزء عمّ وتبارك بقرار المعلم.
    // ⚠️ [افتراض صريح — بقرار المعلم]: المشتِّتان (الخياران الخطآن) يُفضَّلان من نفس سورة الآية
    // الصحيحة قدر الإمكان (تدريب أدق وأصعب)، ولو السورة لا تحتوي آيتين بديلتين مختلفتين كافيتين
    // (نصًا، لا رقمًا فقط — تجنبًا لتكرار الآيات المتشابهة لفظيًا زي "ويل يومئذ للمكذبين")، تُكمَّل
    // المشتتات تلقائيًا من باقي آيات النطاق (سور أخرى) بدل إرجاع اللعبة null بلا داعٍ.
    async generateKidsListenAyah(ayahsPool, chunkIndex, totalChunks) {
        // 🌟 عدّ الكلمات الفعلية فقط (بلا رموز وقف) حتى لا تُعتبر آية قصيرة "صالحة" بالخطأ 🌟
        let validAyahs = ayahsPool.filter(a => splitAyahWords(a.text).length >= 3);
        if (validAyahs.length === 0) validAyahs = ayahsPool;
        const ayah = pickTargetAyah(validAyahs, chunkIndex, totalChunks);
        if (!ayah || !ayah.number) return null;

        let cleanText = cleanAyahText(ayah.text);
        let usedKeys = new Set([`${ayah.surahNumber}-${ayah.numberInSurah}`]);
        let usedTexts = new Set([cleanText]);

        // 🌟 المشتتات من نفس السورة أولاً (أصعب وأدق تدريبًا، بطلب صريح من المعلم)
        let sameSurahCandidates = validAyahs.filter(a => a.surahNumber === ayah.surahNumber && a.numberInSurah !== ayah.numberInSurah);
        sameSurahCandidates.sort(() => Math.random() - 0.5);

        let distractors = [];
        for (let a of sameSurahCandidates) {
            if (distractors.length >= 2) break;
            let key = `${a.surahNumber}-${a.numberInSurah}`;
            let txt = cleanAyahText(a.text);
            if (usedKeys.has(key) || usedTexts.has(txt)) continue;
            usedKeys.add(key); usedTexts.add(txt); distractors.push(txt);
        }

        // 🌟 لو نفس السورة ما فيهاش آيتين بديلتين كافيتين، نكمل من باقي النطاق (سور أخرى)
        if (distractors.length < 2) {
            let otherCandidates = validAyahs.filter(a => a.surahNumber !== ayah.surahNumber);
            otherCandidates.sort(() => Math.random() - 0.5);
            for (let a of otherCandidates) {
                if (distractors.length >= 2) break;
                let key = `${a.surahNumber}-${a.numberInSurah}`;
                let txt = cleanAyahText(a.text);
                if (usedKeys.has(key) || usedTexts.has(txt)) continue;
                usedKeys.add(key); usedTexts.add(txt); distractors.push(txt);
            }
        }
        if (distractors.length < 2) return null;

        let options = [cleanText, ...distractors].sort(() => Math.random() - 0.5);
        // 🌟 رقم الآية العام (number، لا numberInSurah) هو نفسه المستخدَم في مسار الصوت على
        // cdn.islamic.network — نفس ترقيم alquran.cloud الذي تُبنى منه قاعدة بيانات القرآن أصلاً.
        // 🌟 [تعديل] 64 بدل 192 (bitrate أقل — راجع الشرح أعلى الدالة ثم في kidsAudioDB.js)
        let audioUrl = `https://cdn.islamic.network/quran/audio/64/ar.abdulbasitmurattal/${ayah.number}.mp3`;

        // 🌟 نصوص هذا الـquestionBody (التعليمة وزر الاستماع) بالعربي مباشرة بلا مفاتيح i18n —
        // بنفس أسلوب كل دوال هذا الملف تمامًا (لا توجد أي ترجمة لنصوص questionBody/questionTitle
        // في أي منها)، حفاظًا على مبدأ "محرك نقي بلا استيراد t()/DOM" في kidsEngine.js. عنوان
        // اللعبة (questionTitle) وحده مفتاح i18n حقيقي (`kids_listen_title`) لأنه يمر أصلاً عبر
        // t() في games/kidsGame.js عند العرض بلا أي تكلفة إضافية هنا.
        let questionBody = `
        <div style="text-align:center;">
            <div style="font-size:1.5rem; font-weight:bold; color:#1e3a5f; margin-bottom:20px;">🎧 استمع جيدًا، ثم اختر الآية التي سمعتها</div>
            <audio id="kids-listen-audio-player" src="${audioUrl}" preload="auto"></audio>
            <button type="button" id="kids-listen-play-btn" class="kids-listen-play-btn" onclick="window.playKidsListenAyahAudio()">🔊 استمع للآية</button>
        </div>`;

        // 🌟 [جديد] الخطوة الثانية من اللعبة (بطلب المعلم): بعد ما يختار الطفل الآية الصحيحة
        // اللي سمعها، تظهر له خطوة ثانية يختار فيها من أي سورة هذه الآية — نفس فكرة لعبة "خمن
        // السورة" (generateKidsGuessSurah أعلاه) لكن بفارق مهم بقرار صريح من المعلم: مشتّتات
        // أسماء السور هنا تُسحب من نطاق حفظ الطالب فقط (validAyahs/activePool)، ولا يوجد أي
        // رجوع لكامل سور المصحف عبر getAllSurahsList() كما تفعل generateKidsGuessSurah — لأن
        // الهدف تدريب الطفل على سور نطاقه الفعلي فقط. لو النطاق يحوي أقل من 3 سور مختلفة (حالة
        // نادرة لنطاق ضيق جداً)، لا يمكن توليد 3 خيارات سور صادقة، فتُرجع الدالة null بالكامل —
        // نفس آلية fallback القياسية الموجودة أصلاً لهذه اللعبة (تتحول تلقائيًا للعبة بديلة) 🌟
        let correctSurah = ayah.surahName;
        let otherSurahNames = [...new Set(validAyahs.map(a => a.surahName))].filter(n => n !== correctSurah);
        if (otherSurahNames.length < 2) return null;
        otherSurahNames.sort(() => Math.random() - 0.5);
        let surahOptions = [correctSurah, ...otherSurahNames.slice(0, 2)].sort(() => Math.random() - 0.5);

        return {
            type: 'kids_mcq',
            questionTitle: 'kids_listen_title',
            questionBody: questionBody,
            correctAns: cleanText,
            options: options,
            ayahObj: ayah,
            reportText: cleanText,
            // 🌟 [جديد] وجود surahOptions هو ما يميّز هذه اللعبة عن باقي ألعاب kids_mcq في
            // games/kidsGame.js — لتفعيل خطوة "من أي سورة؟" الإضافية بعد الإجابة الصحيحة، بلا
            // أي أثر على أي لعبة kids_mcq أخرى لا تملك هذا الحقل إطلاقًا 🌟
            surahOptions: surahOptions,
            correctSurah: correctSurah
        };
    }
}