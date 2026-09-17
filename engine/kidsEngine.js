// engine/kidsEngine.js
import { cleanName, cleanAyahText, pickTargetAyah } from './quranEngine.js';

export class KidsEngine {
    constructor(quranEngine) {
        this.quranEngine = quranEngine; // لكي نتمكن من الوصول لقاعدة بيانات القرآن
    }

    async generateKidsCatchGame(ayahsPool, chunkIndex, totalChunks) { 
        const ayah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); if(!ayah) return null; let cleanText = cleanAyahText(ayah.text); let words = cleanText.split(/\s+/); if(words.length < 4) return null; 
        let hideIdx = Math.floor(words.length / 2); let missingWord = words[hideIdx]; words[hideIdx] = " ..... "; let visibleWords = words.join(" "); 
        let sameSurahAyahs = ayahsPool.filter(a => a.surahNumber === ayah.surahNumber && a.number !== ayah.number); let distractors = []; sameSurahAyahs.forEach(a => distractors.push(...cleanAyahText(a.text).split(/\s+/))); distractors = [...new Set(distractors)].filter(w => w.length > 3 && w !== missingWord); distractors.sort(() => Math.random() - 0.5); 
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
        return { type: 'kids_mcq', questionTitle: "ماذا بعد هذه الآية يا بطل؟ ➡️", questionBody: `<div class="quran-text" style="font-size:3.5rem; color:#d97706; margin-bottom:15px;">﴿ ${targetText} ﴾</div><div style="font-size:1.8rem; font-weight:bold;">اختر الآية التي تليها:</div>`, correctAns: nextAyahText, options: options, ayahObj: targetAyah, reportText: targetText }; 
    }
    
    async generateKidsWordOrderGame(ayahsPool, chunkIndex, totalChunks) {
        let validAyahs = ayahsPool.filter(a => { let w = cleanAyahText(a.text).split(/\s+/); return w.length >= 3 && w.length <= 6; }); if(validAyahs.length === 0) return null; 
        const ayah = pickTargetAyah(validAyahs, chunkIndex, totalChunks); let cleanText = cleanAyahText(ayah.text); let words = cleanText.split(/\s+/); let shuffled = [...words].sort(() => Math.random() - 0.5); 
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
        let validAyahs = ayahsPool.filter(a => { let w = cleanAyahText(a.text).split(/\s+/); return w.length >= 4 && w.length <= 8; });
        if(validAyahs.length === 0) validAyahs = ayahsPool; 
        const ayah = pickTargetAyah(validAyahs, chunkIndex, totalChunks); if(!ayah) return null;
        
        let cleanText = cleanAyahText(ayah.text);
        let words = cleanText.split(/\s+/);
        
        let surah = await this.quranEngine.getSurah(ayah.surahNumber);
        let poolWords = [];
        let startA = Math.max(0, ayah.numberInSurah - 3); 
        let endA = Math.min(surah.ayahs.length - 1, ayah.numberInSurah + 1); 
        for(let i = startA; i <= endA; i++) {
            if (i !== (ayah.numberInSurah - 1)) { 
                let wArr = cleanAyahText(surah.ayahs[i].text).split(/\s+/);
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
        
        return { type: 'kids_mcq', questionTitle: "ماذا قبل هذه الآية؟ ⬅️", questionBody: `<div class="quran-text" style="font-size:3.5rem; color:#d97706; margin-bottom:15px;">﴿ ${targetText} ﴾</div>`, correctAns: prevAyahText, options: options, ayahObj: targetAyah, reportText: targetText };
    }

    async generateKidsAyahCount(ayahsPool, chunkIndex, totalChunks) {
        const ayah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); if(!ayah) return null;
        let surah = await this.quranEngine.getSurah(ayah.surahNumber);
        let correctCount = surah.ayahs.length;
        
        let options = [String(correctCount), String(correctCount + Math.floor(Math.random()*5)+1), String(Math.abs(correctCount - (Math.floor(Math.random()*3)+1)))];
        if(options[2] === "0") options[2] = "15"; 
        options = [...new Set(options)]; 
        while(options.length < 3) options.push(String(Math.floor(Math.random()*30)+5));
        options.sort(() => Math.random() - 0.5);
        
        return { type: 'kids_mcq', questionTitle: "كم عدد آيات هذه السورة؟ 🔢", questionBody: `<div style="font-size:2.5rem; color:var(--primary); font-weight:bold; margin-bottom:20px;">سورة ( ${cleanName(surah.name)} )</div>`, correctAns: String(correctCount), options: options, ayahObj: ayah, reportText: `عدد آيات سورة ${surah.name}` };
    }
}