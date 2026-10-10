// engine/quranEngine.js
import { QURAN_STORE } from "../database/quranDB.js";
import { tl, labelL, nameL } from "../core/langBridge.js";
// اسم السورة بخط واضح في ألعاب الأطفال: نستبدل علامات المصحف الخاصة (السكون المصحفي ۡ وغيره) بالتشكيل العادي
// ونعرضه بخط Tajawal الواضح بدل خط المصحف الصعب القراءة.
const kidsSurahNameHtml = (name) => `<span style="font-family:'Tajawal','Cairo',sans-serif; font-weight:800; color:#db2777;">[ ${String(name).replace(/\u06E1/g, '\u0652').replace(/[\u06D6-\u06ED\u08D3-\u08FF]/g, '')} ]</span>`;

// 🌟 [2026-10-03] مفتاح فهرس السور الخفيف (راجع getAllSurahsList)
const SURAH_INDEX_KEY = 'dh_surah_index_v1';

export const cleanName = (name) => { 
    if(!name) return ""; 
    return name.replace(/سُورَةُ\s*/g, '').replace(/سورة\s*/g, '').trim(); 
};

// 🌟 [جديد] السكون القرآني العثماني الحقيقي (يشبه رأس الخاء/الحاء الصغير بلا نقطة، Unicode:
// U+06E1) مختلف تمامًا عن السكون الدائري العادي المستخدم في الكتابة العربية العامة (U+0652) —
// نص "quran-uthmani" اللي بنجيبه من alquran.cloud (المبني على نص تنزيل الموثّق) يستخدم U+0652
// العادي لكل السكنات العادية، ويحتفظ بـ U+06E1 فقط للحروف الزائدة الساكتة (زي الألف في "مائة").
// المطلوب هنا: كل الآيات المعروضة بالمنصة تظهر بعلامة السكون القرآنية المميزة U+06E1 بدل الدائرية
// العادية، مطابقةً لرسم المصحف الفعلي. لذلك نستبدل كل سكون دائري بالسكون القرآني عند العرض.
export function toQuranicSukun(text) {
    if (!text) return text;
    return text.replace(/ْ/g, 'ۡ');
}

// 🌟 [جديد] دالة تطبيع مخصّصة للمقارنة فقط (اكتشاف تكرار "نقاط الضعف" المحفوظة سابقًا، أو
// إزالتها عند إجابة الطالب صح) — تجرّد النص تمامًا من كل التشكيل وعلامات الرسم العثماني الخاصة
// (بما فيها كل من U+0652 وU+06E1 معًا) قبل المقارنة، حتى تبقى المقارنة صحيحة بغض النظر عن أي
// اختلاف مستقبلي في شكل علامة السكون المستخدمة بالعرض — بدل مقارنة النص المنسّق بالكامل حرفيًا
// (كان بيفشل لو تغيّر شكل التشكيل المعروض بين وقت حفظ نقطة الضعف ووقت مراجعتها لاحقًا).
export function normalizeForCompare(text) {
    if (!text) return "";
    return text
        .replace(/[ؐ-ًؚ-ٰٟۖ-ۭ]/g, '')
        .replace(/[ٱأإآ]/g, 'ا')
        .replace(/\s+/g, ' ')
        .trim();
}

export const cleanAyahText = (text) => {
    if(!text) return "";
    let original = text.trim();
    let noDiacritics = original.replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '');
    noDiacritics = noDiacritics.replace(/[ٱأإآ]/g, 'ا'); 
    let bareText = noDiacritics.replace(/\s+/g, ''); 
    if (bareText.startsWith('بسماللهالرحمنالرحيم')) { 
        let words = original.split(/\s+/); 
        if (words.length > 4) original = words.slice(4).join(' ').trim();
    }
    // 🌟 التحويل لعلامة السكون القرآنية يتم هنا مركزيًا — كل نصوص القرآن المعروضة بالمنصة
    // (الألعاب، الواجبات، التقرير، المتشابهات...) تمر عبر هذه الدالة، فيضمن ظهور نفس السكون
    // القرآني الصحيح في كل مكان دفعة واحدة بدل تعديل كل شاشة على حدة.
    return toQuranicSukun(original);
};

// ==========================================
// 🌟🌟 [نقل مركزي] فلترة علامات الوقف القرآنية من "كلمات" الآية
// ==========================================
// المشكلة: نص الآية في الرسم العثماني عند تقطيعه بالمسافات (split(/\s+/)) قد يحتوي على علامات
// وقف قرآنية (مثل: ۚ الجيم الصغيرة "الوقف الجائز"، ۖ، ۗ، صلى، قلى...) تظهر كأنها "كلمة" مستقلة
// بذاتها لأنها محاطة بمسافات في النص. هذا كان يتسبب في ظهورها بالخطأ كاختيار (صحيح أو خاطئ)
// داخل أسئلة الاختيار من متعدد وألعاب الأطفال، رغم أنها ليست كلمة من كلمات الآية إطلاقاً بل رمز
// توجيهي للوقف أثناء التلاوة — فيجد الطالب نفسه مطالباً باختيار "علامة" بدل كلمة.
// كانت هذه الفلترة موجودة أصلاً *محلية وغير مُصدَّرة* داخل engine/homeworkEngine.js فقط، فتم
// رفعها هنا للمحرك المركزي ليستفيد منها كل مكان يقطّع الآية إلى كلمات (ألعاب الأطفال، ألعاب
// الكبار، الواجبات، الاختبارات...) بدل تكرار نفس المنطق في كل ملف على حدة.
// ⚠️ [افتراض صريح]: أي "كلمة" مكوّنة من حرف عربي واحد منفرد محاط بمسافات تُعتبر علامة وقف وليست
// كلمة فعلية، لأن حروف المعاني المفردة (و، ب، ل، ف...) تُكتب في الرسم العثماني متصلة بالكلمة
// التالية ولا تظهر منفصلة بمسافة عنها إطلاقاً.
const WAQF_MARKS = new Set(['صلى', 'صلي', 'قلى', 'قلي', 'سكتة', 'سكته']);

export function isWaqfMark(word) {
    if (!word) return true;
    const w = word.trim();
    if (!w) return true;
    // نطاق يونيكود رموز الوقف القرآنية الرسمية (تُستخدم في بعض مصادر النص كرموز منفصلة)
    if (/^[ۖ-ۭ]+$/.test(w)) return true;
    // الأسماء المتعارف عليها لعلامات الوقف عندما تُكتب كنص عادي
    if (WAQF_MARKS.has(w)) return true;
    // حرف عربي واحد منفرد ومحاط بمسافات يكاد يكون دائماً رمز وقف (مثل: ج، م، ص، ق...)
    if (w.length === 1 && /^[ء-ي]$/.test(w)) return true;
    return false;
}

// 🌟 [جديد] هل هذه الكلمة هي اسم السورة نفسه (أو جذره بعد حذف ال وحروف العطف/الجر الملتصقة
// بها مثل: والعصر / فالعصر / بالناس)؟ تُستخدم لمنع الأسئلة التي تكشف إجابتها بذاتها.
// صيغ فعلية/مشتقة لأسماء سور لا تشبه الاسم رسماً لكنها تكشفه (مثلاً "إذا الشمس كُوِّرت" ← التكوير)
const SURAH_NAME_EXTRA_FORMS = {
    'التكوير': ['كورت'], 'الانفطار': ['انفطرت'], 'الانشقاق': ['انشقت'], 'الزلزلة': ['زلزلت', 'زلزالها'],
    'التحريم': ['تحرم', 'تحريم'], 'الشرح': ['نشرح'], 'المجادله': ['تجادلك', 'يجادل'],
    'الممتحنه': ['فامتحنوهن'], 'الانسان': ['انسان'], 'المرسلات': ['مرسلات'], 'الحجرات': ['حجرات']
};

// 🌟 [جديد] هل هذه الكلمة هي اسم السورة نفسه (أو شكل منه)؟ تُستخدم لمنع الأسئلة التي تكشف إجابتها
// بذاتها (والعصر ← العصر، ألهاكم التكاثر ← التكاثر). تعمل على أي سورة من الـ114 بالاسم نفسه:
// - تتجاهل التشكيل والألف الخنجرية، وتوحّد الألف/الهمزة/التاء المربوطة/الألف المقصورة.
// - تحذف "ال" وحروف العطف/الجر الملتصقة (و ف ب ل ك) من الكلمة.
// - تقارن "هيكل" الحروف بدون ألفات (الرسم العثماني يحذف ألفاً كثيرة: الذاريات = ٱلذَّٰرِيَٰتِ)،
//   وتعامل ون/ين كشيء واحد (الكافرون/الكافرين) وتقبل كلمة تبدأ باسم السورة (قدرنا ← القدر).
// - الأسماء المركّبة (آل عمران) تُفحص بكل جزء مميّز منها (عمران).
export function wordIsSurahName(word, surahName) {
    const b = s => normalizeForCompare(s || '').replace(/ـ/g, '').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/[ؤئ]/g, m => (m === 'ؤ' ? 'و' : 'ي'));
    const sk = s => s.replace(/ا/g, '').replace(/ين$/, 'ون');
    const nameBare = b(cleanName(surahName)).replace(/^سوره\s*/, '');
    // أسماء الحرف الواحد (ق، ص، ن): الاسم هو الحرف نفسه — مطابقة تامة فقط
    if (nameBare.length === 1) return b(word) === nameBare;
    const parts = nameBare.split(/\s+/).map(x => x.replace(/^ال/, '')).filter(x => sk(x).length >= 2);
    if (!parts.length) return false;
    const targets = new Set();
    parts.forEach(x => { targets.add(sk(x)); targets.add(sk('ال' + x)); });
    (SURAH_NAME_EXTRA_FORMS[nameBare.replace(/\s+/g, '')] || []).forEach(x => targets.add(sk(b(x))));
    const w = b(word);
    const forms = [w, w.replace(/^[وفبلك]/, ''), w.replace(/^[وف][بلك]/, '')].map(sk);
    return forms.some(f => [...targets].some(t => f === t || (t.length >= 3 && f.length > t.length && f.startsWith(t) && f.length - t.length <= 2)));
}

// 🌟 تقطيع نص الآية إلى كلمات فعلية فقط (بعد استبعاد رموز الوقف تماماً) — تُستخدم في كل موضع
// كانت النتيجة فيه ستظهر للطالب كاختيار أو كبطاقة كلمة أو كمشتت.
export function splitAyahWords(text) {
    return cleanAyahText(text).split(/\s+/).filter(w => w && !isWaqfMark(w));
}

// 🌟 تقطيع يحافظ على رموز الوقف داخل المصفوفة (لأن النص المعروض للطالب يجب أن يظل كما هو في
// المصحف برموز وقفه)، ويُستخدم مع realWordIndexes أدناه لمعرفة مواضع الكلمات الفعلية فقط.
export function splitAyahTokens(text) {
    return cleanAyahText(text).split(/\s+/).filter(w => w);
}

// 🌟 مواضع (فهارس) الكلمات الفعلية داخل مصفوفة ناتجة عن splitAyahTokens — أي موضع ليس رمز وقف.
export function realWordIndexes(tokens) {
    let idxs = [];
    (tokens || []).forEach((t, i) => { if (!isWaqfMark(t)) idxs.push(i); });
    return idxs;
}

// 🌟 [جديد] تغطية السور في جزء عمّ (الجزء 30، السور 78–114)
// المشكلة: التقسيم إلى مقاطع متساوية بعدد الآيات يجعل السور الطويلة تبتلع الأسئلة وقد تغيب سور قصيرة كلياً.
// الحل: خطة "سورة لكل سؤال" — كل سورة تُسأل مرة قبل أن تتكرر أي سورة.
export const JUZ_AMMA_NUMBER = 30;

/**
 * خطة السور لاختبار من qCount سؤالاً: مصفوفة أرقام سور بطول qCount، بترتيب المصحف.
 *  • qCount <= عدد السور: تُقسَّم السور (بترتيب المصحف) إلى qCount مجموعات متساوية، وتُختار سورة عشوائية من كل مجموعة
 *    (فلا تتكرر سورة، ويتوزع الاختيار على الجزء كله بدل أخذ أوله).
 *  • qCount > عدد السور: كل سورة مرة، والزيادة تُوزَّع على الأطول آياتاً أولاً.
 */
export function planSurahCoverage(pool, qCount) {
    if (!pool || !pool.length || !(qCount > 0)) return [];
    const counts = new Map();
    for (const a of pool) counts.set(a.surahNumber, (counts.get(a.surahNumber) || 0) + 1);
    const surahs = [...counts.keys()].sort((x, y) => x - y);
    const n = surahs.length;
    let plan;
    if (qCount <= n) {
        plan = [];
        for (let i = 0; i < qCount; i++) {
            const lo = Math.floor(i * n / qCount);
            const hi = Math.max(lo + 1, Math.floor((i + 1) * n / qCount));
            plan.push(surahs[lo + Math.floor(Math.random() * (hi - lo))]);
        }
    } else {
        plan = [...surahs];
        const byLength = [...surahs].sort((x, y) => counts.get(y) - counts.get(x) || x - y);
        for (let i = 0; i < qCount - n; i++) plan.push(byLength[i % n]);
    }
    return plan.sort((x, y) => x - y);
}

// الخطة النشطة للاختبار الجاري: أرقام السور بحسب chunkIndex (null = السلوك القديم). تُحفظ مع طابور الاختبار
// (queue[i].surahNum) لتُستعاد عند استكمال اختبار معلّق.
let activeSurahPlan = null;
export function setActiveSurahPlan(plan) { activeSurahPlan = Array.isArray(plan) && plan.length ? plan : null; }

export function pickTargetAyah(pool, chunkIndex, totalChunks) {
    if (!pool || pool.length === 0) return null;
    if (activeSurahPlan && chunkIndex >= 0 && activeSurahPlan[chunkIndex] !== undefined) {
        const own = pool.filter(a => a.surahNumber === activeSurahPlan[chunkIndex]);
        if (own.length) return own[Math.floor(Math.random() * own.length)];
    }
    if (chunkIndex === undefined || chunkIndex === -1 || totalChunks === undefined || totalChunks === 0) {
        return pool[Math.floor(Math.random() * pool.length)];
    }
    let chunkSize = pool.length / totalChunks;
    let start = Math.floor(chunkIndex * chunkSize); 
    let end = Math.floor((chunkIndex + 1) * chunkSize);
    
    if (start >= pool.length) start = Math.max(0, pool.length - 1); 
    if (end <= start) end = start + 1; 
    if (end > pool.length) end = pool.length;
    
    let region = pool.slice(start, end); 
    if (region.length === 0) region = pool; 
    
    let ayah = region[Math.floor(Math.random() * region.length)];
    if (!ayah) ayah = pool[Math.floor(Math.random() * pool.length)];
    return ayah;
}

export class QuranEngine {
    constructor(db) { this.db = db; }
    
    async getSurah(surahNumber) { return new Promise((resolve) => { const tx = this.db.transaction(QURAN_STORE, "readonly"); const req = tx.objectStore(QURAN_STORE).get(surahNumber); req.onsuccess = () => resolve(req.result); }); }
    // 🌟 [2026-10-03 — سرعة الفتح] كانت تقرأ المصحف كاملاً (6236 آية) من IndexedDB في كل فتح للمنصة لأجل الأسماء وعدد الآيات فقط.
    // الآن تُحفظ هذه القائمة الصغيرة (الاسم الخام كما في القاعدة) في localStorage بعد أول قراءة، وcleanName يُطبَّق عند كل قراءة كما كان،
    // فالناتج مطابق حرفياً. أي خلل في النسخة المحفوظة (ليست 114 سورة/تالفة/التخزين غير متاح) → الرجوع للقراءة الكاملة كالسابق.
    async getAllSurahsList() {
        const toList = (rows) => rows.map(s => ({ number: s.number, name: cleanName(s.name), ayahsCount: s.ayahsCount }));
        try {
            const cached = JSON.parse(localStorage.getItem(SURAH_INDEX_KEY) || 'null');
            if (Array.isArray(cached) && cached.length === 114 && cached.every(s => s && typeof s.number === 'number' && typeof s.name === 'string' && typeof s.ayahsCount === 'number')) {
                return toList(cached);
            }
        } catch (e) { /* نسخة تالفة أو تخزين غير متاح: نكمل بالقراءة الكاملة */ }
        const rows = await new Promise((resolve) => { const tx = this.db.transaction(QURAN_STORE, "readonly"); const req = tx.objectStore(QURAN_STORE).getAll(); req.onsuccess = () => resolve(req.result.map(s => ({ number: s.number, name: s.name, ayahsCount: s.ayahs.length }))); });
        if (rows.length === 114) { try { localStorage.setItem(SURAH_INDEX_KEY, JSON.stringify(rows)); } catch (e) { /* التخزين ممتلئ: لا مشكلة */ } }
        return toList(rows);
    }
    async getAllAyahsOnPage(pageNum) { return new Promise((resolve) => { const tx = this.db.transaction(QURAN_STORE, "readonly"); const req = tx.objectStore(QURAN_STORE).getAll(); req.onsuccess = () => { let pageAyahs = []; req.result.forEach(surah => { surah.ayahs.forEach(a => { if (a.page === pageNum) { a.surahName = cleanName(surah.name); a.surahNumber = surah.number; pageAyahs.push(a); } }); }); resolve(pageAyahs); }; }); }
    async getAyahsByJuz(juzNumber) { return new Promise((resolve) => { const tx = this.db.transaction(QURAN_STORE, "readonly"); const req = tx.objectStore(QURAN_STORE).getAll(); req.onsuccess = () => { let allSurahs = req.result; let juzAyahs = []; allSurahs.forEach(surah => { let filtered = surah.ayahs.filter(a => a.juz === juzNumber); if(filtered.length > 0) { let cName = cleanName(surah.name); filtered.forEach(a => { a.surahName = cName; a.surahNumber = surah.number; }); juzAyahs = juzAyahs.concat(filtered); } }); resolve(juzAyahs); }; }); }
    getAyahsInRange(surah, start, end) { let cName = cleanName(surah.name); let ayahs = surah.ayahs.filter(a => a.numberInSurah >= start && a.numberInSurah <= end); ayahs.forEach(a => { a.surahName = cName; a.surahNumber = surah.number; }); return ayahs; }
    async getAyahsBySurahRange(fromSurahNum, toSurahNum) { return new Promise((resolve) => { const tx = this.db.transaction(QURAN_STORE, "readonly"); const req = tx.objectStore(QURAN_STORE).getAll(); req.onsuccess = () => { let allSurahs = req.result; let start = Math.min(fromSurahNum, toSurahNum); let end = Math.max(fromSurahNum, toSurahNum); let pool = []; allSurahs.forEach(surah => { if (surah.number >= start && surah.number <= end) { let cName = cleanName(surah.name); surah.ayahs.forEach(a => { a.surahName = cName; a.surahNumber = surah.number; pool.push(a); }); } }); resolve(pool); }; }); }

    // 🌟 الألعاب الخاصة بالكبار (مسار الإتقان) فقط 🌟
    async generateVisualMemoryGame(ayahsPool, chunkIndex, totalChunks) {
        const ayah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); 
        if (!ayah || !ayah.page) return null; 
        
        let cleanText = cleanAyahText(ayah.text);
        
        let pageRight = (ayah.page % 2 !== 0) ? ayah.page : ayah.page - 1;
        let pageLeft = (ayah.page % 2 === 0) ? ayah.page : ayah.page + 1;
        if (pageRight < 1) pageRight = 1; 
        if (pageLeft > 604) pageLeft = 604;

        let correctSide = (ayah.page % 2 !== 0) ? "اليمنى" : "اليسرى";
        
        // 🌟 صور الصفحات محلية (assets/mushaf/ — راجع SOURCE.md فيه)؛ الرابط الخارجي احتياطي فقط عبر onerror
        let imgRight = `assets/mushaf/page${String(pageRight).padStart(3, '0')}.webp`;
        let imgLeft = `assets/mushaf/page${String(pageLeft).padStart(3, '0')}.webp`;

        let qBody = `
        <div style="text-align: center;">
            <div class="quran-text" style="font-size: 2.8rem; border: 2px dashed #10b981; border-radius: 15px; padding: 20px; color: var(--primary); line-height: 1.6; margin-bottom: 25px; background: #f0fdf4;">﴿\u00A0${cleanText}\u00A0﴾</div>
            <h3 style="font-size: 1.6rem; color:#0f172a; font-weight:bold; margin-bottom:15px;">${tl('qe_visual_question', 'في أي صفحة تقع هذه الآية من المصحف الشريف؟ (اليمنى أم اليسرى؟)')}</h3>
            
            <div style="display: flex; justify-content: center; gap: 15px; align-items: flex-end; margin-top: 15px;">
                <div style="width: 48%; position: relative;">
                    <div style="background:#94a3b8; color:white; padding:5px; border-radius:5px 5px 0 0; font-weight:bold; font-size:1.2rem;">${tl('qe_page_right', 'الصفحة اليمنى')}</div>
                    <img src="${imgRight}" class="visual-blur-img" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src='https://android.quran.com/data/width_1024/'+this.src.split('/').pop().replace('.webp','.png');}" style="width: 100%; height: auto; border: 3px solid #cbd5e1; border-radius: 0 0 5px 5px; cursor:pointer; filter: blur(10px); transition: 0.3s;" onclick="this.style.filter='none'">
                </div>
                <div style="width: 48%; position: relative;">
                    <div style="background:#94a3b8; color:white; padding:5px; border-radius:5px 5px 0 0; font-weight:bold; font-size:1.2rem;">${tl('qe_page_left', 'الصفحة اليسرى')}</div>
                    <img src="${imgLeft}" class="visual-blur-img" onerror="if(!this.dataset.fb){this.dataset.fb=1;this.src='https://android.quran.com/data/width_1024/'+this.src.split('/').pop().replace('.webp','.png');}" style="width: 100%; height: auto; border: 3px solid #cbd5e1; border-radius: 0 0 5px 5px; cursor:pointer; filter: blur(10px); transition: 0.3s;" onclick="this.style.filter='none'">
                </div>
            </div>
            <div style="font-size:1rem; color:#64748b; margin-top:10px;">${tl('qe_tap_unblur', '(اضغط على الصورة لرفع الضباب عنها)')}</div>
        </div>`;

        let ansHTML = `
        <div style="text-align: center; margin-top: 10px;">
            <div style="font-size:1.8rem; font-weight:bold; color:#10b981; margin-bottom:15px; background:#f0fdf4; padding:10px; border-radius:10px; border:2px dashed #10b981;">${tl('qe_correct_page', '( الإجابة الصحيحة: الصفحة {side} )', { side: (ayah.page % 2 !== 0) ? tl('qe_side_right', 'اليمنى') : tl('qe_side_left', 'اليسرى') })}</div>
            <button class="btn btn-outline" style="font-size:1.2rem; padding:10px 20px; border-radius:10px; background:#157e8d; color:white; border:none; margin-top: 5px; cursor:pointer;" onclick="window.openZoomVisual('${imgRight}', '${imgLeft}')">${tl('qe_zoom_mushaf', '🔍 تكبير المصحف للمراجعة')}</button>
        </div>`;

        return { 
            type: 'visual_memory', 
            questionTitle: "الذاكرة البصرية للمصحف 📖", 
            questionBody: qBody, 
            fullAnswer: ansHTML, 
            correctAns: correctSide, 
            ayahObj: ayah, 
            reportText: cleanText 
        }; 
    }

    async generateCatchGame(ayahsPool, isJuz, chunkIndex, totalChunks) { 
        let validPool = ayahsPool.filter(a => cleanAyahText(a.text).split(/\s+/).length >= 4);
        if (validPool.length === 0) validPool = ayahsPool; 
        const ayah = pickTargetAyah(validPool, chunkIndex, totalChunks); 
        if (!ayah) return null; 
        
        let cleanText = cleanAyahText(ayah.text);
        const stopWords = ['في', 'من', 'على', 'إلى', 'عن', 'بها', 'له', 'لها', 'الذين', 'الذي', 'إن', 'أن', 'هو', 'هي', 'ثم', 'أو', 'بل', 'قد', 'وما', 'وأن', 'الله', 'كان', 'التي', 'بما', 'ذلك', 'عذاب', 'عليهم', 'وهم', 'فيها'];
        const words = cleanText.split(/\s+/); 
        
        let hintWords = "";
        for (let i = 0; i < words.length - 1; i++) { 
            let w1 = words[i].replace(/[\u0617-\u061A\u064B-\u0652\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, ''); 
            let w2 = words[i+1].replace(/[\u0617-\u061A\u064B-\u0652\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, ''); 
            if (w1.length >= 3 && w2.length >= 3 && !stopWords.includes(w1) && !stopWords.includes(w2)) { 
                hintWords = words[i] + ' ' + words[i+1]; 
                break; 
            } 
        }
        if (!hintWords) hintWords = words.slice(0, 2).join(' '); 
        
        return { type: 'catch', questionTitle: "استدعِ الآية التي تحتوي على الكلمات 🏹:", questionBody: `<div class="quran-text" style="font-size:3.5rem; margin-top:20px; color:var(--primary);">[ ${hintWords} ]</div>`, fullAnswer: cleanText, ayahObj: ayah, reportText: cleanText }; 
    }

    async generateGuessSurahGame(ayahsPool, chunkIndex, totalChunks) {
        const ayah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); if(!ayah) return null; let cleanText = cleanAyahText(ayah.text);
        return { type: 'guess_surah', questionTitle: "خمن السورة 🔍", questionBody: `<div class="quran-text" style="font-size:3.5rem; margin-top:10px;">﴿\u00A0${cleanText}\u00A0﴾</div>`, fullAnswer: labelL(ayah.surahName), ayahObj: ayah, reportText: cleanText }; 
    }
    
    async generateNextAyahGame(ayahsPool, isJuz, chunkIndex, totalChunks) { 
        const targetAyah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); if(!targetAyah) return null; 
        // 🌟 [إصلاح] كان المولّد يأخذ "الآية التالية" من ترتيب النطاق (pool) دون التأكد أنها من نفس السورة،
        // فإذا كانت الآية المختارة هي آخر آية في سورة داخل نطاق يضم عدة سور (وضع الجزء أو نطاق سور)
        // تظهر أول آية من السورة التالية كإجابة خاطئة. أضفنا شرط تطابق surahNumber، وعند عدم التطابق
        // يقع الكود في فرع الرجوع لقاعدة البيانات الذي يُرجع null لآخر آية في السورة (فتُختار لعبة أخرى).
        let nextAyahText = ""; let currentIndex = ayahsPool.findIndex(a => a.number === targetAyah.number);
        if(currentIndex !== -1 && currentIndex < ayahsPool.length - 1 && ayahsPool[currentIndex + 1].surahNumber === targetAyah.surahNumber) { nextAyahText = cleanAyahText(ayahsPool[currentIndex + 1].text); } 
        else { let surah = await this.getSurah(targetAyah.surahNumber); if(!surah || targetAyah.numberInSurah >= surah.ayahs.length) return null; nextAyahText = cleanAyahText(surah.ayahs[targetAyah.numberInSurah].text); }
        let targetText = cleanAyahText(targetAyah.text);
        // 🌟 [تصحيح] اتجاه السهم عُكِس ليوافق اتجاه القراءة العربية (RTL): ما بعد الآية يقع إلى يسارها، فالسهم ⬅️ 🌟
        return { type: 'next', questionTitle: "ماذا بعدها؟ ⬅️", questionBody: `<div class="quran-text" style="font-size:3.5rem; margin-top:10px;">﴿\u00A0${targetText}\u00A0﴾</div>`, fullAnswer: nextAyahText, ayahObj: targetAyah, reportText: targetText }; 
    }
    
    async generatePreviousAyahGame(ayahsPool, isJuz, chunkIndex, totalChunks) { 
        let validAyahs = ayahsPool.filter(a => a.numberInSurah > 1); if(validAyahs.length === 0) return null; const targetAyah = pickTargetAyah(validAyahs, chunkIndex, totalChunks); if(!targetAyah) return null; 
        let prevAyahText = ""; let hintText = tl('qe_none', 'لا يوجد'); let currentIndex = ayahsPool.findIndex(a => a.number === targetAyah.number);
        if(currentIndex > 0) { prevAyahText = cleanAyahText(ayahsPool[currentIndex - 1].text); if(currentIndex > 1) { let prev2 = cleanAyahText(ayahsPool[currentIndex - 2].text); hintText = prev2.split(/\s+/).slice(0, 3).join(' ') + '...'; } else { hintText = tl('qe_range_start', 'أول النطاق'); } } 
        else { let surah = await this.getSurah(targetAyah.surahNumber); prevAyahText = cleanAyahText(surah.ayahs[targetAyah.numberInSurah - 2].text); if(targetAyah.numberInSurah > 2) { let prev2 = cleanAyahText(surah.ayahs[targetAyah.numberInSurah - 3].text); hintText = prev2.split(/\s+/).slice(0, 3).join(' ') + '...'; } else { hintText = tl('qe_surah_start', 'أول السورة'); } }
        let targetText = cleanAyahText(targetAyah.text);
        // 🌟 [تصحيح] اتجاه السهم عُكِس ليوافق اتجاه القراءة العربية (RTL): ما قبل الآية يقع إلى يمينها، فالسهم ➡️ 🌟
        return { type: 'previous', questionTitle: "ماذا قبلها؟ ➡️", questionBody: `<div class="quran-text" style="font-size:3.5rem; margin-top:10px;">﴿\u00A0${targetText}\u00A0﴾</div>`, fullAnswer: prevAyahText, ayahObj: targetAyah, hint: hintText, reportText: targetText }; 
    }
    
    // 🌟 [جديد 2026-10-10] «سؤال مميز»: تُعرض آية واحدة ويطلب من الطالب ذكر الآية التي قبلها والتي بعدها
    // معاً. يُعلَّم السؤال بـspecial:true فتعرض الشاشة شارة «سؤال مميز» فوقه، وعند الإجابة الصحيحة
    // تظهر مكافأة خاصة (راجع showSpecialReward في adultGame.js). الآيتان المحيطتان من نفس سورة الآية
    // دائماً (تُرفض أول آية وآخر آية في السورة بإرجاع null فيُعاد التوليد). 🌟
    async generateAroundAyahGame(ayahsPool, isJuz, chunkIndex, totalChunks) {
        const validAyahs = ayahsPool.filter(a => a.numberInSurah > 1); if(validAyahs.length === 0) return null;
        const targetAyah = pickTargetAyah(validAyahs, chunkIndex, totalChunks); if(!targetAyah) return null;
        const surah = await this.getSurah(targetAyah.surahNumber);
        if(!surah || targetAyah.numberInSurah < 2 || targetAyah.numberInSurah >= surah.ayahs.length) return null;
        const prevText = cleanAyahText(surah.ayahs[targetAyah.numberInSurah - 2].text);
        const nextText = cleanAyahText(surah.ayahs[targetAyah.numberInSurah].text);
        const targetText = cleanAyahText(targetAyah.text);
        const ansBox = (label, txt) => `<div style="margin:8px 0;"><div style="color:var(--secondary); font-size:1.2rem; font-weight:bold;">${label}</div><span class="quran-text">﴿\u00A0${txt}\u00A0﴾</span></div>`;
        return {
            type: 'around', special: true,
            questionTitle: "اذكر الآية قبلها والآية بعدها ↔️",
            questionBody: `<div class="quran-text" style="font-size:3.5rem; margin-top:10px;">﴿\u00A0${targetText}\u00A0﴾</div>`,
            fullAnswer: `${prevText}\u00A0﴾ ﴿\u00A0${nextText}`,
            answerHTML: ansBox('➡️ الآية التي قبلها', prevText) + ansBox('⬅️ الآية التي بعدها', nextText),
            ayahObj: targetAyah, reportText: targetText
        };
    }

    async generateOrderGame(ayahsPool, isKids, chunkIndex, totalChunks) { 
        let count = isKids ? 3 : 4; if(ayahsPool.length < count) return null; 
        let ayah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); let startIdx = ayahsPool.findIndex(a => a.numberInSurah === ayah.numberInSurah && a.surahNumber === ayah.surahNumber);
        if (startIdx > ayahsPool.length - count) startIdx = ayahsPool.length - count;
        if (ayahsPool[startIdx].surahNumber !== ayahsPool[startIdx + count - 1].surahNumber) { let validStarts = []; for(let i=0; i<=ayahsPool.length - count; i++) { if(ayahsPool[i].surahNumber === ayahsPool[i+count-1].surahNumber) validStarts.push(i); } if(validStarts.length === 0) return null; startIdx = validStarts[Math.floor(Math.random() * validStarts.length)]; }
        const ayahs = []; for(let i=0; i<count; i++) ayahs.push(ayahsPool[startIdx + i]);
        ayahs.forEach(a => a.text = cleanAyahText(a.text)); const shuffled = [...ayahs].sort(() => Math.random() - 0.5); let verseNums = ayahs.map(a => a.numberInSurah).join('، '); 
        return { type: 'order', questionTitle: isKids ? "رتب الآيات يا بطل 🔀" : "🔀 رتب الآيات", original: ayahs, shuffled: shuffled, surahName: ayahs[0].surahName, reportText: `الآيات (ترتيب): ${verseNums}`, ayahObj: ayahs[0] }; 
    }
    
    async generateBetweenGame(ayahsPool, isJuz, chunkIndex, totalChunks) { 
        if(ayahsPool.length < 3) return null; let validAyahs = ayahsPool.filter(a => a.numberInSurah > 1); if(validAyahs.length === 0) return null; const targetAyah = pickTargetAyah(validAyahs, chunkIndex, totalChunks); if(!targetAyah) return null; 
        // 🌟 [إصلاح] نفس علة "الآية التالية": الآيتان المحيطتان لازم تكونا من نفس سورة الآية المختارة، وإلا
        // نرجع لقاعدة البيانات (التي ترفض آخر آية في السورة بإرجاع null) بدل عرض آية من سورة أخرى.
        let prevText = "", nextText = ""; let currentIndex = ayahsPool.findIndex(a => a.number === targetAyah.number);
        if(currentIndex > 0 && currentIndex < ayahsPool.length - 1 && ayahsPool[currentIndex - 1].surahNumber === targetAyah.surahNumber && ayahsPool[currentIndex + 1].surahNumber === targetAyah.surahNumber) { prevText = cleanAyahText(ayahsPool[currentIndex - 1].text); nextText = cleanAyahText(ayahsPool[currentIndex + 1].text); } 
        else { let surah = await this.getSurah(targetAyah.surahNumber); if(targetAyah.numberInSurah < 2 || targetAyah.numberInSurah >= surah.ayahs.length) return null; prevText = cleanAyahText(surah.ayahs[targetAyah.numberInSurah - 2].text); nextText = cleanAyahText(surah.ayahs[targetAyah.numberInSurah].text); }
        return { type: 'between', questionTitle: "الآية بين آيتين ↔️", questionBody: `<div class="quran-text" style="font-size:3rem; margin-top:10px; line-height:1.5;">﴿\u00A0${prevText}\u00A0﴾<br><span class="between-gap" aria-label="آية ناقصة" style="display:block; margin:22px auto; font-family:Arial,sans-serif; font-weight:900; font-size:1.8rem; line-height:1; letter-spacing:0.5em; color:var(--dh-emerald-800, #064e3b); direction:ltr; white-space:nowrap; overflow:hidden; text-align:center;">•&nbsp;•&nbsp;•&nbsp;•&nbsp;•&nbsp;•</span>﴿\u00A0${nextText}\u00A0﴾</div>`, fullAnswer: cleanAyahText(targetAyah.text), ayahObj: targetAyah, reportText: cleanAyahText(targetAyah.text) }; 
    }
    
    async generateReciteGame(ayahsPool, isJuz, isKids, chunkIndex, totalChunks) { 
        if(ayahsPool.length === 0) return null; const startAyah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); let surah = await this.getSurah(startAyah.surahNumber); let totalSurahAyahs = surah.ayahs.length;
        // 🌟 [جديد] حدود التسميع داخل النطاق المختار: في وضع الجزء (isJuz) قد يبدأ الجزء أو ينتهي في منتصف السورة،
        // فلا نُسمّع آيات خارج الجزء. في الأوضاع الأخرى تبقى الحدود كل السورة (السلوك القديم بلا تغيير).
        // ⚠️ افتراض صريح: في وضع الجزء لا نستخدم فرع "السورة كاملة" إلا لو كانت السورة كلها داخل الجزء.
        let reciteLo = 0, reciteHi = totalSurahAyahs - 1, surahFullyInPool = true;
        if (isJuz) {
            const inSurah = ayahsPool.filter(a => a.surahNumber === startAyah.surahNumber);
            if (inSurah.length > 0) {
                reciteLo = Math.min(...inSurah.map(a => a.numberInSurah)) - 1;
                reciteHi = Math.max(...inSurah.map(a => a.numberInSurah)) - 1;
                surahFullyInPool = (reciteHi - reciteLo + 1) === totalSurahAyahs;
            }
        }
        let qBody = ""; let fullText = ""; let reportText = ""; let qTitle = isKids ? "🎙️ أسمعنا صوتك العذب!" : "تسميع مقطع 🎙️";
        // 🌟 [جديد] قائمة آيات المقطع المعروض للطالب فعلاً (رقم الآية في السورة + نصها) — يستخدمها
        // components/reciteRangePicker.js ليحدد المعلم "من آية ... إلى آية ..." موضع الخطأ بالتحديد
        let reciteAyahs = [];
        if (totalSurahAyahs <= 10 && surahFullyInPool) {
            fullText = surah.ayahs.map(a => ` ﴿\u00A0${cleanAyahText(a.text)}\u00A0﴾ `).join("");
            reciteAyahs = surah.ayahs.map(a => ({ num: a.numberInSurah, text: cleanAyahText(a.text) }));
            qBody = `<div style="background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 25px 40px; text-align: center; max-width: 800px; margin: 15px auto 0;"><div style="font-size: 1.8rem; font-weight: bold; margin-bottom: 5px;">${tl('qe_recite_surah_pre', 'سمّع سورة')} ${isKids ? kidsSurahNameHtml(nameL(startAyah.surahName)) : `<span style="color:var(--danger)">[ ${nameL(startAyah.surahName)} ]</span>`} ${tl('qe_recite_surah_post', 'كاملة')}</div><div style="font-size:1.4rem; margin-bottom:10px;">( بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ )</div></div>`; reportText = `تسميع سورة ${startAyah.surahName} كاملة`;
        } else {
            let startIdx = surah.ayahs.findIndex(a => a.numberInSurah === startAyah.numberInSurah); let jump = Math.floor(Math.random() * 4) + 6; 
            if (startIdx < reciteLo) startIdx = reciteLo;
            if (startIdx + jump > reciteHi) startIdx = Math.max(reciteLo, reciteHi - jump);
            let endIdx = Math.min(startIdx + jump, reciteHi); let actualCount = (endIdx - startIdx) + 1;
            for(let i=startIdx; i<=endIdx; i++) fullText += ` ﴿\u00A0${cleanAyahText(surah.ayahs[i].text)}\u00A0﴾ `; 
            for(let i=startIdx; i<=endIdx; i++) reciteAyahs.push({ num: surah.ayahs[i].numberInSurah, text: cleanAyahText(surah.ayahs[i].text) });
            let startClean = cleanAyahText(surah.ayahs[startIdx].text); let endClean = cleanAyahText(surah.ayahs[endIdx].text);
            let startWords = startClean.split(/\s+/); let startHalf = startWords.length > 3 ? startWords.slice(0, Math.ceil(startWords.length / 2)).join(" ") + " ...." : startClean + " ....";
            let endWords = endClean.split(/\s+/); let endHalf = endWords.length > 3 ? ".... " + endWords.slice(Math.floor(endWords.length / 2)).join(" ") : ".... " + endClean;
            qBody = `<div style="background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 25px 40px; text-align: center; max-width: 800px; margin: 15px auto 0;"><div style="font-size: 1.6rem; font-weight: bold; margin-bottom: 20px;">${tl('qe_recite_n_pre', 'سمّع {n} آيات من سورة', { n: actualCount })} ${isKids ? kidsSurahNameHtml(nameL(startAyah.surahName)) : `<span>[ ${nameL(startAyah.surahName)} ]</span>`}</div><div style="font-size:1.4rem; margin-bottom:10px;">${tl('qe_from_verse', 'من قوله تعالى:')}</div><div class="quran-text" style="font-size: 3.2rem; margin-bottom: 25px; ${isKids ? 'color:#0d5c46;' : 'color:#156643;'}">﴿\u00A0${startHalf}\u00A0﴾</div><div style="font-size:1.4rem; margin-bottom:10px;">${tl('qe_to_verse', 'إلى قوله تعالى:')}</div><div class="quran-text" style="font-size: 3.2rem; ${isKids ? 'color:#0d5c46;' : 'color:#156643;'}">﴿\u00A0${endHalf}\u00A0﴾</div></div>`; reportText = `تسميع من سورة ${startAyah.surahName} (${actualCount} آيات)`;
        }
        return { type: isKids ? 'kids_recite' : 'recite', questionTitle: qTitle, questionBody: qBody, fullAnswer: fullText, ayahObj: startAyah, reportText: reportText, reciteAyahs: reciteAyahs, reciteSurahName: startAyah.surahName }; 
    }
    
    async generateMistakeGame(ayahsPool, isJuz, chunkIndex, totalChunks) { 
        const ayah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); if(!ayah) return null; let cleanText = cleanAyahText(ayah.text);
        const words = cleanText.split(/\s+/); if(words.length < 3) return null; 
        let candidates = []; for(let i=0; i<words.length; i++) { if(words[i].replace(/[^أ-ي]/g, "").length >= 3) candidates.push(i); } 
        // 🌟 خط الرجوع نفسه يتجنب رموز الوقف: نأخذ مواضع الكلمات الفعلية، وفقط لو لم توجد إطلاقاً
        // نرجع للسلوك القديم (منتصف الآية) 🌟
        if(candidates.length === 0) { let realIdxs = realWordIndexes(words); candidates = realIdxs.length ? realIdxs : [Math.floor(words.length / 2)]; }
        // 🌟 الآية الطويلة (12 كلمة فأكثر) يُدسّ فيها خطآن بدل خطأ واحد، في موضعين غير متجاورين
        // (فجوة كلمتين على الأقل) — وإن لم يتوفر موضعان صالحان نرجع لخطأ واحد 🌟
        const replaceIdxs = [candidates[Math.floor(Math.random() * candidates.length)]];
        if(words.length >= 12) {
            const second = candidates.filter(i => Math.abs(i - replaceIdxs[0]) > 2);
            if(second.length > 0) replaceIdxs.push(second[Math.floor(Math.random() * second.length)]);
        }
        let otherAyahs = ayahsPool.filter(a => a.numberInSurah !== ayah.numberInSurah || a.number !== ayah.number); if(otherAyahs.length === 0) otherAyahs = ayahsPool; 
        const wrongWords = [...words];
        const used = new Set();
        replaceIdxs.forEach(replaceIdx => {
            let targetLen = words[replaceIdx].length; let stolenWord = "بَلْ";
            // 🌟 الكلمة "المدسوسة" تُسحب من كلمات فعلية فقط (splitAyahWords) — قبل ذلك كان ممكن أن
            // تُسحب علامة وقف منفردة فتظهر داخل الآية كأنها الكلمة الخاطئة المطلوب اكتشافها 🌟
            for(let attempt=0; attempt<10; attempt++) { let randAyah = otherAyahs[Math.floor(Math.random() * otherAyahs.length)]; let randWords = splitAyahWords(randAyah.text); let matchingWords = randWords.filter(w => Math.abs(w.length - targetLen) <= 2 && w !== words[replaceIdx] && !used.has(w)); if(matchingWords.length > 0) { stolenWord = matchingWords[Math.floor(Math.random() * matchingWords.length)]; break; } }
            used.add(stolenWord); wrongWords[replaceIdx] = stolenWord;
        });
        const mistakeTitle = replaceIdxs.length > 1 ? "اكتشف الخطأين 🔍" : "اكتشف الخطأ 🔍";
        return { type: 'mistake', questionTitle: mistakeTitle, questionBody: `<div class="quran-text" style="font-size:3.5rem; margin-top:10px;">﴿\u00A0${wrongWords.join(" ")}\u00A0﴾</div>`, fullAnswer: cleanText, ayahObj: ayah, reportText: cleanText }; 
    }

    async generateCompleteAyahGame(ayahsPool, chunkIndex, totalChunks) {
        const ayah = pickTargetAyah(ayahsPool, chunkIndex, totalChunks); if(!ayah) return null; let cleanText = cleanAyahText(ayah.text); let words = cleanText.split(/\s+/); if (words.length < 4) return null; 
        let hideCount = Math.max(1, Math.floor(words.length * 0.3)); let pos = Math.floor(Math.random() * 3); let hiddenPart = ""; let displayWords = [...words];
        if (pos === 0) { hiddenPart = displayWords.splice(0, hideCount).join(' '); displayWords.unshift("....."); } 
        else if (pos === 2) { hiddenPart = displayWords.splice(words.length - hideCount, hideCount).join(' '); displayWords.push("....."); } 
        else { let mid = Math.floor(words.length / 2) - Math.floor(hideCount / 2); hiddenPart = displayWords.splice(mid, hideCount).join(' '); displayWords.splice(mid, 0, "....."); }
        return { type: 'complete_ayah', questionTitle: "أكمل الجزء الناقص من الآية الكريمة 🧩", questionBody: `<div class="quran-text" style="font-size:3.5rem; margin-top:10px;">﴿\u00A0${displayWords.join(' ')}\u00A0﴾</div>`, fullAnswer: cleanText, correctAns: hiddenPart, ayahObj: ayah, reportText: cleanText };
    }

    // 🌟 [جديد] لعبة "اربط أول الآية بآخرها" — تُستخدم في ركن الكبار وركن الأطفال معاً (نفس
    // الدالة بالضبط، بمعامل isKids فقط لاختيار صياغة العنوان المناسبة). تختار حتى 5 آيات (أو
    // أقل لو النطاق صغيراً) وتقسّم كل واحدة لنصفين (بدايتها ونهايتها)، ثم تخلط عمود البدايات
    // وعمود النهايات كل واحد بترتيب عشوائي مستقل، والمطلوب من الطالب الربط بين كل بداية
    // ونهايتها الصحيحة. بخلاف لعبة "رتب الآيات" لا يُشترط أن تكون الآيات المختارة متتابعة أو من
    // نفس السورة — فقط فريدة وغير مكررة، لأن الهدف هنا اختبار حفظ بداية/نهاية كل آية بمفردها
    // لا ترتيبها النسبي ضمن السورة.
    // ⚠️ [افتراض صريح]: نقطة تقسيم كل آية لنصفين هي منتصف عدد الكلمات (بالتقريب للأعلى)، وليس
    // تقسيماً لغوياً/نحوياً دقيقاً لموضع الوقف — اختيار مبسّط وثابت بدل محاولة اكتشاف "منتصف
    // المعنى" آلياً.
    // 🌟 [جديد] تقليل النص المعروض في ركن الكبار فقط: عرض نصفي الآية كاملين (نصف على اليمين
    // ونصف على اليسار) كان بيخلّي الربط أحياناً مجرد قراءة مباشرة لنص الآية موزَّعاً على
    // العمودين، بدل استحضار حقيقي للمحفوظ. عند الكبار صارت اللعبة تعرض أول كلمات قليلة من الآية
    // في عمود البدايات وآخر كلمات قليلة منها في عمود النهايات فقط، مع حذف وسط الآية تماماً
    // والإشارة للمحذوف بعلامة (…) — فيضطر الطالب يفتكر الآية كاملة ليعرف أي بداية تخص أي نهاية.
    // ركن الأطفال باقٍ كما هو بالضبط (نصف/نصف) بلا أي تغيير، لأن الهدف هناك التعرّف المبسّط لا
    // اختبار الإتقان.
    // ⚠️ [افتراض صريح 2]: عدد الكلمات المعروضة في كل طرف عند الكبار = ثلث كلمات الآية تقريباً،
    // بحدّ أقصى 3 كلمات وحدّ أدنى كلمتان — اختيار عددي مبسّط بدل محاولة تحديد "أقل قدر مميِّز"
    // لغوياً. ولأن أغلب آيات قصار السور 4 كلمات فقط (وعندها 2+2 = الآية كاملة موزّعة على
    // العمودين، أي المشكلة نفسها)، نضمن حذف كلمة واحدة على الأقل من وسط أي آية طولها 4 كلمات
    // فأكثر، والتقليص يقع على طرف النهاية لا البداية (فتظهر مثلاً: "ألم نجعل …" ↔ "… مهادًا").
    // أما الآيات الأقصر من ذلك (كلمتان أو ثلاث، ولا تظهر إلا في خط الرجوع النادر) فتُعرض كاملة
    // موزّعة بلا حذف ولا علامة (…) لتعذّر التقليص أصلاً.
    async generateLinkGame(ayahsPool, isKids, chunkIndex, totalChunks) {
        // 🌟 [تعديل] عدد الأزواج صار 5 بدل 4 (في الركنين معاً: الكبار والأطفال) — طلب المعلم أن
        // يكون العدد فردياً حتى لا يسهل على الطالب توقّع أن كل نهاية أمام بدايتها. العدد يقلّ
        // تلقائياً لو كان النطاق المختار يحتوي آيات صالحة أقل من 5 (راجع neededCount أدناه).
        // ⚠️ [افتراض صريح]: منطق الخلط بقي كما هو بلا تغيير — الضمان الموجود يمنع فقط أن يخرج
        // عمود النهايات مطابقاً لعمود البدايات صفاً بصف بالكامل، ولا يمنع أن تصادف آية أو اثنتان
        // وقوفهما في نفس الصف مع نهايتهما الصحيحة (وهذا وارد مع أي عدد، فردياً كان أو زوجياً).
        // 🌟 [2026-10-06] بطلب المعلم: صار العدد 6 أزواج (للصغار والكبار) — ألوان الأزواج في CSS تكفي 6 (pair-0..5)
        const targetCount = 6;
        // 🌟 [جديد] حدود عدد الكلمات المعروضة في كل طرف عند الكبار (راجع الافتراض الصريح 2 أعلاه)
        const ADULT_SIDE_MAX_WORDS = 3;
        const ADULT_SIDE_MIN_WORDS = 2;
        let validPool = ayahsPool.filter(a => cleanAyahText(a.text).split(/\s+/).length >= 4);
        if (validPool.length < 2) validPool = ayahsPool.filter(a => cleanAyahText(a.text).split(/\s+/).length >= 2);
        if (validPool.length < 2) return null;

        let anchor = pickTargetAyah(validPool, chunkIndex, totalChunks);
        if (!anchor) return null;
        let anchorKey = `${anchor.surahNumber}-${anchor.numberInSurah}`;
        let restShuffled = [...validPool].sort(() => Math.random() - 0.5);

        let picked = [anchor];
        let usedKeys = new Set([anchorKey]);
        let neededCount = Math.min(targetCount, validPool.length);
        for (let a of restShuffled) {
            if (picked.length >= neededCount) break;
            let key = `${a.surahNumber}-${a.numberInSurah}`;
            if (!usedKeys.has(key)) { usedKeys.add(key); picked.push(a); }
        }
        if (picked.length < 2) return null;

        let pairs = picked.map(a => {
            let cleanText = cleanAyahText(a.text);
            let words = cleanText.split(/\s+/);
            let startText, endText;
            if (isKids) {
                // 🌟 ركن الأطفال: نفس السلوك القديم حرفياً بلا أي تغيير — نصف الآية الأول في عمود
                // البدايات ونصفها الثاني في عمود النهايات (بلا حذف ولا علامة …) 🌟
                let splitIdx = Math.ceil(words.length / 2);
                if (splitIdx < 1) splitIdx = 1;
                if (splitIdx >= words.length) splitIdx = words.length - 1;
                startText = words.slice(0, splitIdx).join(' ');
                endText = words.slice(splitIdx).join(' ');
            } else {
                // 🌟 [جديد] ركن الكبار: طرفان قصيران فقط ووسط الآية محذوف (راجع شرح الدالة أعلاه) 🌟
                let desired = Math.min(ADULT_SIDE_MAX_WORDS, Math.max(ADULT_SIDE_MIN_WORDS, Math.round(words.length / 3)));
                // نمنع تداخل الطرفين: مجموع كلمات الطرفين لا يتجاوز كلمات الآية أبداً
                let startSide = Math.max(1, Math.min(desired, words.length - 1));
                let endSide = Math.max(1, Math.min(desired, words.length - startSide));
                // 🌟 نضمن حذف كلمة واحدة على الأقل من وسط أي آية طولها 4 كلمات فأكثر (وهي الغالبة
                // في قصار السور) — وإلا لظهرت الآية كاملة موزّعة على العمودين وعاد الربط قراءةً
                // مباشرة. التقليص يقع على طرف النهاية لا البداية، لأن آخر كلمة هي الفاصلة
                // المميِّزة للآية، بينما أول كلمة وحدها (زي "إنَّ" أو "ألم") غالباً بلا دلالة 🌟
                if (words.length - (startSide + endSide) === 0 && words.length >= 4 && endSide > 1) endSide--;
                let omittedCount = words.length - (startSide + endSide);
                startText = words.slice(0, startSide).join(' ') + (omittedCount > 0 ? ' …' : '');
                endText = (omittedCount > 0 ? '… ' : '') + words.slice(words.length - endSide).join(' ');
            }
            return {
                id: `${a.surahNumber}-${a.numberInSurah}`,
                startText: startText,
                endText: endText,
                ayah: a
            };
        });

        let starts = pairs.map(p => ({ id: p.id, text: p.startText })).sort(() => Math.random() - 0.5);
        let ends = pairs.map(p => ({ id: p.id, text: p.endText })).sort(() => Math.random() - 0.5);
        // 🌟 [تعديل] ضمان أقوى بطلب المعلم: لا تقف أي نهاية في نفس صف بدايتها الصحيحة إطلاقاً
        // (بدل الاكتفاء بمنع التطابق الكامل فقط) — راجع arrangeEndsNotFacing أسفل الملف 🌟
        ends = arrangeEndsNotFacing(starts, ends);

        let verseNums = pairs.map(p => p.ayah.numberInSurah).join('، ');
        return {
            type: isKids ? 'kids_link_ends' : 'link_ends',
            questionTitle: isKids ? "اربط بداية الآية بنهايتها يا بطل 🔗" : "🔗 اربط أول الآية بآخرها",
            starts: starts,
            ends: ends,
            original: pairs.map(p => p.ayah),
            surahName: pairs[0].ayah.surahName,
            ayahObj: pairs[0].ayah,
            reportText: `${isKids ? "ربط بدايات ونهايات الآيات" : "ربط أوائل الآيات بأواخرها"}: ${verseNums}`
        };
    }

    // 🌟 [جديد] لعبة "رتب السور" — نفس فكرة "رتب الآيات" تماماً لكن العناصر المُراد ترتيبها هي
    // أسماء السور الموجودة فعلياً ضمن النطاق الممرَّر (ayahsPool) بدل آيات سورة واحدة. تُستخدم في
    // ركن الأطفال ضمن أي نطاق سور يختاره المعلم، وفي ركن الكبار فقط عند اختيار نطاق "جزء" (حيث
    // تتوفر غالباً أكثر من سورة ضمن الجزء نفسه) — هذا القيد الخاص بالكبار مطبَّق من طرف المستدعي
    // (games/adultGame.js) عبر عدم إضافة هذا النوع لقائمة الألعاب إلا في وضع الجزء، وليس هنا.
    // 🌟 [حيلة تقنية متعمَّدة]: نُرجع كل سورة بنفس شكل كائن الآية الذي تتوقعه دالة بناء واجهة
    // "رتب الآيات" الحالية (buildOrderGameUI في كلا ملفي اللعبة) — أي بحقلي `text` و
    // `numberInSurah` — لكن بقيمة numberInSurah هنا هي رقم السورة نفسه (لا رقم آية). هذا يسمح
    // بإعادة استخدام نفس دالة بناء الواجهة عند الكبار حرفياً بلا أي تعديل عليها.
    // ⚠️ [افتراض صريح]: لو كان النطاق المُمرَّر يحتوي على أكثر من 4 سور، نختار نافذة عشوائية من
    // 4 سور متتالية (بترتيب المصحف) ضمنه بدل عرض كل السور دفعة واحدة، حفاظاً على نفس صعوبة بقية
    // ألعاب الترتيب في المنصة (رتب الآيات تستخدم نفس عدد الأربعة عند الكبار).
    async generateOrderSurahsGame(ayahsPool, isKids) {
        let seen = new Set();
        let surahsInRange = [];
        for (let a of ayahsPool) {
            if (!seen.has(a.surahNumber)) { seen.add(a.surahNumber); surahsInRange.push({ number: a.surahNumber, name: a.surahName }); }
        }
        surahsInRange.sort((x, y) => x.number - y.number);
        if (surahsInRange.length < 2) return null;

        let count = Math.min(4, surahsInRange.length);
        let maxStart = surahsInRange.length - count;
        let startIdx = maxStart > 0 ? Math.floor(Math.random() * (maxStart + 1)) : 0;
        let chosenSurahs = surahsInRange.slice(startIdx, startIdx + count);
        if (chosenSurahs.length < 2) return null;

        let toItem = (s) => ({ text: s.name, numberInSurah: s.number, surahNumber: s.number, surahName: s.name });
        let original = chosenSurahs.map(toItem);
        let shuffled = [...original].sort(() => Math.random() - 0.5);
        // 🌟 نضمن ألا يخرج الترتيب المبعثر مطابقاً للترتيب الصحيح بمحض الصدفة 🌟
        if (shuffled.length > 1) {
            let attempts = 0;
            while (attempts < 5 && shuffled.every((s, i) => s.numberInSurah === original[i].numberInSurah)) {
                shuffled.sort(() => Math.random() - 0.5);
                attempts++;
            }
        }

        let namesList = chosenSurahs.map(s => s.name).join('، ');
        return {
            type: isKids ? 'kids_order_surahs' : 'order_surahs',
            questionTitle: isKids ? "رتب السور يا بطل 📚" : "📚 رتب السور",
            original: original,
            shuffled: shuffled,
            surahName: namesList,
            reportText: `ترتيب السور: ${namesList}`
        };
    }

    // 🌟 [إعادة تصميم] لعبة "اربط الكلمة بالسورة" — تحل محل لعبة "رتب السور" أعلاه في كل شاشات
    // اللعب الفعلية (games/adultGame.js وgames/kidsGame.js لم يعودا يستدعيان
    // generateOrderSurahsGame إطلاقاً)، لكن الدالة القديمة تركناها كما هي بلا حذف حفاظاً على أي
    // مرجع مستقبلي محتمل، بدل حذفها فجأة.
    // 🌟 [سبب إعادة التصميم — ملاحظة صريحة من المعلم]: الأطفال غالباً يحفظون القرآن ابتداءً من
    // آخر السور (سورة الناس) للخلف، فترتيب المصحف الصحيح (الفاتحة ← الناس) الذي كانت تطلبه لعبة
    // "رتب السور" يجيء معكوسًا تمامًا عن ترتيب حفظهم الفعلي ويسبب لخبطة حقيقية لا تقيس حفظهم. لعبة
    // "ربط" لا تحتاج معرفة أي ترتيب نسبي بين السور إطلاقاً — فقط التعرّف على السورة من كلمة وردت
    // فيها فعلاً — فتزول المشكلة من جذرها بدل تلطيفها.
    // الفكرة: تختار حتى 4 سور مختلفة **عشوائياً بلا أي قيد على ترتيبها أو تتاليها** (بخلاف نافذة
    // الأربع سور المتتالية التي كانت تُستخدم في لعبة الترتيب) من السور المتاحة فعلياً ضمن النطاق
    // الممرَّر (ayahsPool)، ولكل سورة كلمة واحدة "مميِّزة" من إحدى آياتها الموجودة فعلياً ضمن
    // النطاق، ثم تُبنى منها بيانات بنفس الشكل الذي تتوقعه لعبة "اربط أول الآية بآخرها" الموجودة
    // (starts/ends/id) — فتُعرض بنفس حاويتها ودالة بنائها (buildLinkGameUI في كلا ملفي اللعبة)
    // بلا أي كود واجهة جديد: عمود الكلمات وعمود أسماء السور، كل واحد بترتيب عشوائي مستقل، والمطلوب
    // الربط بينهما بالنقر.
    // ⚠️ [افتراض صريح 1]: "الكلمة المميِّزة" = كلمة عربية من 4 أحرف فعلية على الأقل (بعد إزالة
    // التشكيل) وليست ضمن قائمة كلمات شائعة جداً تتكرر في أغلب السور (الله، الرحمن، الذين...) —
    // اختيار مبسّط يقلل احتمال ظهور نفس الكلمة (أو كلمة شبه بديهية) في أكثر من سورة بالجولة نفسها،
    // وليس تحليلاً لغوياً دقيقاً لـ"تفرّد" الكلمة الفعلي.
    // ⚠️ [افتراض صريح 2]: لو تعذّر إيجاد كلمة تحقق الشرط أعلاه لسورة معينة ضمن كل آياتها المتاحة في
    // النطاق (سور قصيرة جداً أو كل كلماتها شائعة)، نقبل أي كلمة عربية من حرفين فأكثر من أول آية
    // متاحة بدل استبعاد السورة من الجولة كلياً — أفضل من تقليل عدد أزواج الجولة بلا داعٍ.
    // ⚠️ [افتراض صريح 3]: بقيت نفس قيود مكان الظهور القديمة (ركن الأطفال: دائماً ضمن نطاق الطفل،
    // ركن الكبار: وضع "الجزء" فقط) لأن السبب الأصلي ما زال قائماً — الحاجة لسورتين مختلفتين على
    // الأقل ضمن النطاق، وهذا غالباً غير متوفر في نطاق "سورة واحدة" أو "من سورة لأخرى" بنفس السورة.
    async generateLinkWordSurahGame(ayahsPool, isKids) {
        // كلمات شائعة جداً تتكرر في أغلب السور فلا تصلح "علامة مميِّزة" لسورة بعينها
        // 🌟 [إصلاح] وسّعنا القائمة لتشمل أفعالاً وتراكيب شائعة جداً كانت تمر من الفلتر القديم رغم
        // شيوعها الفعلي (زي "يجعل"/"إنما"/"الليل") لأنها ببساطة ≥4 أحرف وغير موجودة بالقائمة
        // القصيرة السابقة — راجع التعليق الأكبر أسفل الدالة لتفاصيل الإصلاح الرئيسي (فلتر التكرار) 🌟
        const COMMON_WORDS = new Set([
            "الله", "لله", "بالله", "والله", "اللهم", "الرحمن", "الرحيم", "رب", "ربك", "ربكم", "ربهم", "ربنا",
            "الذين", "الذي", "التي", "اللذين", "اللاتي", "كان", "كانوا", "كانت", "إن", "أن", "إنه", "إنها",
            "لا", "لم", "لن", "ما", "من", "في", "على", "إلى", "قال", "قالوا", "قالت", "ثم", "أو", "بل", "قد",
            "لقد", "ولا", "فلا", "ذلك", "هذا", "هذه", "هؤلاء", "عليهم", "عليكم", "لهم", "لكم", "منهم",
            "بهم", "فيهم", "إليهم", "معهم", "أنتم", "أنفسهم", "يومئذ", "فإن", "وإن", "وما", "فما",
            "جعل", "جعلنا", "نجعل", "يجعل", "وجعل", "فجعل", "وجعلنا", "إنما", "فإنما", "وإنما", "كأنما",
            "بينما", "حتى", "عند", "عندما", "بعد", "قبل", "الليل", "النهار", "اليوم", "يوم", "يومهم",
            "الأرض", "السماء", "السماوات", "جميعا", "جميعاً", "أيضا", "أيضاً", "إذ", "إذا", "لعل", "لعلكم",
            "لعلهم", "كي", "لكي", "سوف", "غير", "سوى", "نحو", "مثل", "كل", "بعض", "جميع", "يقول", "تقول",
            "نقول", "أقول", "قل", "قلنا", "فقال", "وقال", "له", "لها", "منها", "فيها", "عليها", "إليها",
            "بها", "معها", "كذلك", "وكذلك", "أولئك", "الذي", "أولاء"
        ]);

        let bySurah = new Map();
        for (let a of ayahsPool) {
            if (!bySurah.has(a.surahNumber)) bySurah.set(a.surahNumber, { number: a.surahNumber, name: a.surahName, ayahs: [] });
            bySurah.get(a.surahNumber).ayahs.push(a);
        }
        let surahsInRange = [...bySurah.values()];
        if (surahsInRange.length < 2) return null;

        let shuffledSurahs = [...surahsInRange].sort(() => Math.random() - 0.5);
        // 🌟 [2026-10-06] بطلب المعلم: 5 كلمات و5 سور (للصغار والكبار)، وتقلّ تلقائياً لو النطاق أقل من 5 سور
        let targetCount = Math.min(5, shuffledSurahs.length);
        let chosen = shuffledSurahs.slice(0, targetCount);

        // 🌟 [إصلاح جوهري] المشكلة اللي بلّغ عنها المعلم: الكلمات المُختارة كانت "عشوائية" فعلاً —
        // شائعة جداً وتتكرر بمواضع كثيرة (زي "فإنما"، "يجعل"، "والليل") فيصعب على الطالب معرفة أي
        // سورة تخصّها تحديداً لأنها لا ترتبط ذهنياً بسورة بعينها. القائمة اليدوية أعلاه وحدها غير
        // كافية لأنها لا تغطي كل الأفعال/التراكيب المتكررة في القرآن كله.
        // الحل: نحسب تكرار كل كلمة عربية (بعد إزالة التشكيل) عبر *كل* آيات النطاق الممرَّر بالكامل
        // (ayahsPool)، لا فقط آيات السور المختارة لهذه الجولة تحديداً — ثم نُفضّل دائماً الكلمة
        // الأقل تكراراً (والأفضل: التي تظهر مرة واحدة فقط `freq === 1`) كـ"الكلمة المميِّزة" لكل
        // سورة. هذا يضمن أن الكلمة لا تتكرر فعلياً في أي مكان آخر ضمن نفس النطاق الذي يُختبر فيه
        // الطالب في هذه الجولة تحديداً — معيار تفرّد حقيقي محسوب من البيانات الفعلية بدل قائمة
        // شائعة ثابتة فقط. ⚠️ [افتراض صريح]: "الأقل تكراراً" هنا يُحسب داخل النطاق الممرَّر فقط
        // (مثلاً الجزء أو نطاق سور الطفل)، وليس عبر القرآن الكريم كاملاً — لا حاجة لتحميل نص
        // القرآن كله لهذا الحساب، والنطاق المحلي كافٍ عملياً لأن الجولة نفسها لا تختبر إلا سوراً من
        // نفس النطاق.
        let globalFreq = new Map();
        for (let a of ayahsPool) {
            let words = cleanAyahText(a.text).split(/\s+/);
            for (let w of words) {
                let bare = w.replace(/[^أ-ي]/g, "");
                if (bare.length < 2) continue;
                globalFreq.set(bare, (globalFreq.get(bare) || 0) + 1);
            }
        }

        let usedWords = new Set();
        let pairs = [];
        for (let s of chosen) {
            // 🌟 نجمع كل الكلمات المرشَّحة من *كل* آيات السورة المتاحة بالنطاق (لا نتوقف عند أول
            // آية فيها مرشَّح واحد كما كان سابقاً) لنقدر نختار الأندر فعلياً من بينها كلها 🌟
            let candidates = [];
            for (let ayah of s.ayahs) {
                let words = cleanAyahText(ayah.text).split(/\s+/);
                for (let w of words) {
                    let bare = w.replace(/[^أ-ي]/g, "");
                    if (bare.length < 4 || usedWords.has(bare)) continue;
                    // 🌟 [تعديل بطلب المعلم] لا تكون الكلمة هي اسم السورة نفسه (والعصر ← العصر):
                    // الإجابة تصبح بديهية بلا حفظ — كان مسموحاً سابقاً ككلمة مميِّزة، وأُلغي ذلك
                    if (wordIsSurahName(w, s.name)) continue;
                    if (COMMON_WORDS.has(bare)) continue;
                    candidates.push({ word: w, bare, freq: globalFreq.get(bare) || 1 });
                }
            }
            let picked = null;
            if (candidates.length > 0) {
                let minFreq = Math.min(...candidates.map(c => c.freq));
                let rarest = candidates.filter(c => c.freq === minFreq);
                picked = rarest[Math.floor(Math.random() * rarest.length)].word;
            }
            if (!picked) {
                // خط رجوع: أي كلمة عربية من حرفين فأكثر من أول آية متاحة، حتى لو شائعة أو مكررة
                let ayahsShuffled = [...s.ayahs].sort(() => Math.random() - 0.5);
                let fallbackWords = ayahsShuffled.flatMap(a => cleanAyahText(a.text).split(/\s+/)).filter(w => w.replace(/[^أ-ي]/g, "").length >= 2 && !wordIsSurahName(w, s.name));
                picked = fallbackWords.length ? fallbackWords[Math.floor(Math.random() * fallbackWords.length)] : s.name;
            }
            usedWords.add(picked.replace(/[^أ-ي]/g, ""));
            pairs.push({ number: s.number, name: s.name, word: picked });
        }
        if (pairs.length < 2) return null;

        let starts = pairs.map(p => ({ id: p.number, text: p.word })).sort(() => Math.random() - 0.5);
        let ends = pairs.map(p => ({ id: p.number, text: p.name })).sort(() => Math.random() - 0.5);
        // 🌟 [تعديل] نفس ضمان generateLinkGame أعلاه: لا تقف أي إجابة صحيحة أمام أختها في نفس الصف 🌟
        ends = arrangeEndsNotFacing(starts, ends);

        let namesList = pairs.map(p => p.name).join('، ');
        return {
            type: isKids ? 'kids_link_word_surah' : 'link_word_surah',
            // 🌟 [2026-10-06] بطلب المعلم: «يا بطل» للأطفال فقط، وعنوان الكبار بدونها
            questionTitle: isKids ? "اربط الكلمة بسورتها يا بطل 🔗📖" : "اربط الكلمة بسورتها 🔗📖",
            starts: starts,
            ends: ends,
            // 🌟 نفس شكل original الذي كانت تُرجعه generateOrderSurahsGame (numberInSurah = رقم
            // السورة) — يبقى مفيداً لـrecordAnswer في كلا ملفي اللعبة كخط رجوع عند غياب ayahObj 🌟
            original: pairs.map(p => ({ text: p.name, numberInSurah: p.number, surahNumber: p.number, surahName: p.name })),
            surahName: namesList,
            reportText: `${isKids ? "ربط كلمة بسورتها" : "ربط كلمات بسورها"}: ${namesList}`
        };
    }
}
// 🌟 [جديد] ترتيب عمود النهايات بحيث لا تقف أي نهاية في نفس صف بدايتها الصحيحة إطلاقاً
// (طلب المعلم: الإجابة الصحيحة يجب ألا تكون أمام أختها في أي صف). يُستخدم في لعبتي
// "اربط أول الآية بآخرها" و"اربط الكلمة بالسورة" (الركنين: الكبار والأطفال).
// الطريقة: محاولات خلط عشوائي أولاً (للحفاظ على العشوائية)، ثم خط رجوع مضمون: ترتيب النهايات
// بمحاذاة البدايات ثم إزاحتها دورياً بمقدار k (من 1 إلى n-1) فيستحيل أن يبقى أي زوج في صفه.
function arrangeEndsNotFacing(starts, ends) {
    const n = ends.length;
    if (n < 2) return ends;
    for (let t = 0; t < 50; t++) {
        const candidate = [...ends].sort(() => Math.random() - 0.5);
        if (candidate.every((e, i) => e.id !== starts[i].id)) return candidate;
    }
    const byId = new Map(ends.map(e => [e.id, e]));
    const aligned = starts.map(s => byId.get(s.id));
    const k = 1 + Math.floor(Math.random() * (n - 1));
    return aligned.map((_, i) => aligned[(i + k) % n]);
}
