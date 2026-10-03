// games/adultGame.js
// 🌟 استيراد دالة الترجمة t 🌟
import { AppState, loadDashboardScreen, t, tf, tfAr, surahNameLocal, localizeGenerated, trStored, localizeErrorTypes } from '../core/app.js';
import { loadScreen } from '../core/navigation.js';
import { openModal, closeModal, showToastEncouragement, triggerConfetti } from '../components/ui.js';
import { openReportScreen } from '../reports/report.js';
// 🌟 [جديد] لمقارنة نصوص "نقاط الضعف" المحفوظة سابقًا مع النص المُولَّد حالياً بأمان (راجع
// تعليق normalizeForCompare في quranEngine.js لتفاصيل السبب)
import { normalizeForCompare } from '../engine/quranEngine.js';
// 🌟 [جديد] نظام "تلميحات الأقسام عند أول دخول" — راجع components/sectionHint.js
import { showSectionHintOnce } from '../components/sectionHint.js';
// 🌟 [جديد] ملخص نهاية "جلسة إصلاح الأخطاء عند الدخول" — راجع components/fixErrorsPrompt.js
import { showFixErrorsSummary, getDueWeaknesses, applyFixCorrectAnswer, applyFixWrongAnswer, summarizeFixSession } from '../components/fixErrorsPrompt.js';
// 🌟 [جديد] تحديد موضع الخطأ (من آية ... إلى آية ...) في أسئلة التسميع — راجع components/reciteRangePicker.js
// 🌟 [جديد] حفظ نص أسئلة الربط (بداية/نهاية الآية، الكلمة/السورة) عند تسجيل الخطأ — راجع components/questionTextRecord.js
import { buildLinkQuestionRecord, buildWeaknessQuestionHeader, rebuildLinkFromRecord } from '../components/questionTextRecord.js';
import { prepareReciteRangeBox, readReciteRangeSelection, reciteRangeChipText, buildReciteRangeRecord } from '../components/reciteRangePicker.js';
// 🌟 [جديد] "حفظ والعودة لاحقًا" لاختبار الطالب — راجع components/pausedSession.js لكل التفاصيل والافتراضات
import { initGameFullscreen } from '../components/gameFullscreen.js';
import { buildPausedSnapshot, clearPausedEvaluation } from '../components/pausedSession.js';

export let GameState = { config: null, pool: [], queue: [], currentIndex: 0, currentData: null, reportDetails: [], timerInterval: null, timeRemaining: 900, sessionStartTime: null, consecutiveCorrect: 0, isWeaknessMode: false, evalRangeText: "", hintUsed: false, currentQuestionStartTime: null, tempErrors: [], orderAttempts: 0,
    // 🌟 [إصلاح] لقطة ثابتة من قائمة الأخطاء وقت بدء جلسة "تحدي الأخطاء" — كانت الشاشة تقرأ
    // student.weaknesses[currentIndex] مباشرة بينما القائمة نفسها تقصر مع كل إجابة صحيحة
    // (الخطأ المصحَّح ينتقل للأرشيف)، فكان المؤشر يتخطى أخطاء لم تُسأل أصلاً وقرب النهاية
    // يقرأ عنصراً غير موجود (undefined) فيتوقف التحدي. اللقطة تبقى بطول الطابور تماماً 🌟
    weaknessSnapshot: [],
    // 🌟 [جديد] هل بدأت هذه الجلسة من مسار "إصلاح الأخطاء عند الدخول"؟ لو نعم، بعد انتهائها
    // نعرض ملخصاً قصيراً ثم نذهب إلى شاشة الألعاب بدل شاشة التقرير 🌟
    fixFromLogin: false };

const AudioContext = window.AudioContext || window.webkitAudioContext; let audioCtx;

function initAudio() { 
    if(!audioCtx) audioCtx = new AudioContext(); 
    if(audioCtx.state === 'suspended') audioCtx.resume(); 
}

function playSuccessSound() { 
    initAudio(); 
    const osc = audioCtx.createOscillator(); 
    const gain = audioCtx.createGain(); 
    osc.type = 'sine'; 
    osc.frequency.setValueAtTime(600, audioCtx.currentTime); 
    osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1); 
    osc.connect(gain); gain.connect(audioCtx.destination); 
    osc.start(); 
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5); 
    osc.stop(audioCtx.currentTime + 0.5); 
}

// 🌟 [تعديل] هوية صوتية مستقلة تماماً عن نسخة الأطفال (بطلب صريح من المعلم) — بدل الصوت
// الحاد "sawtooth" السابق (اللي كانت نسخة الأطفال بالضبط منه فرق تردد بسيط)، بقى صوت
// الكبار "تكّتين" قصيرتين (triangle) بحجم صوت متوسط. شكل مختلف كليةً عن نغمة الأطفال
// الجديدة الهادئة المنزلقة (sine)، بدل ما يكونا نفس الصوت تقريباً بفرق تردد بسيط 🌟
function playErrorSound() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.0001, audioCtx.currentTime + 0.09);
    gain.gain.setValueAtTime(0.22, audioCtx.currentTime + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.32);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.34);
}

function startTimer(minutes) { 
    GameState.sessionStartTime = new Date(); 
    document.getElementById('timer-display').style.display = 'block';
    clearInterval(GameState.timerInterval); 
    GameState.timeRemaining = minutes * 60; 
    updateTimerDisplay(); 
    
    GameState.timerInterval = setInterval(() => { 
        GameState.timeRemaining--; 
        updateTimerDisplay(); 
        if(GameState.timeRemaining <= 0) { 
            clearInterval(GameState.timerInterval); 
            playErrorSound(); 
            alert(t("انتهى الوقت المخصص للاختبار!")); // سيتم عرض النص الأصلي إذا لم يضف للقاموس
        } 
    }, 1000); 
}

function updateTimerDisplay() { 
    let m = Math.floor(GameState.timeRemaining / 60).toString().padStart(2, '0'); 
    let s = (GameState.timeRemaining % 60).toString().padStart(2, '0'); 
    const display = document.getElementById('timer-display'); 
    if(!display) return; 
    display.innerText = `${m}:${s} ⏱️`; 
    if(GameState.timeRemaining <= 60) display.classList.add('timer-warning'); 
    else display.classList.remove('timer-warning'); 
}

function getShuffledBag(gamesList) {
    let bag = [...gamesList];
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
}

// 🌟 [إصلاح] نطاق الآيات الفعلي لكل سؤال — كان هذا المنطق مكتوباً مباشرة داخل playNextMission،
// أخرجناه لدالة مستقلة حتى يستخدمه أيضاً فحص الجاهزية أثناء بناء القائمة (probeGameType) بنفس
// الشروط بالضبط، فلا يختلف حكم "هل تُولَّد اللعبة؟" بين وقت البناء ووقت العرض.
// (سؤال "رتب الآيات" لا يُستثنى منه شيء، وباقي الأسئلة تستثني آيات التكرار الشهيرة كالرحمن والمرسلات)
function getActivePoolForType(type, pool) {
    if (type === 'order') return pool;
    let filtered = pool.filter(a => {
        let plainText = a.text.replace(/[ؗ-ًؚ-ْۖ-ۜ۟-۪ۨ-ۭ]/g, '');
        return !plainText.includes('فبأي آلاء ربكما تكذبان') &&
               !plainText.includes('فباي الاء ربكما تكذبان') &&
               !plainText.includes('ويل يومئذ للمكذبين');
    });
    return filtered.length > 0 ? filtered : pool;
}

// 🌟 [إصلاح] فحص جاهزية: هل تستطيع هذه اللعبة أن تُولِّد سؤالاً فعلياً في النطاق المختار؟
// السبب الجذري للمشكلة: كثير من مولّدات quranEngine.js تُرجع null في النطاقات الصغيرة (مثلاً
// "رتب الآيات" تحتاج 4 آيات متتالية من نفس السورة، و"أكمل الآية" تحتاج 4 كلمات، و"الذاكرة
// البصرية" تحتاج حقل page، ولعبتا الربط تحتاجان آيتين صالحتين على الأقل)، وكان الكود عند
// فشل أي منها يستبدلها صامتاً بـ"صيد الآية" — فتختفي ألعاب من القائمة ويتكرر "صيد الآية".
// هذه الدالة تجرّب التوليد مسبقاً (المولّدات لا تملك أي أثر جانبي؛ تبني نصوصاً فقط) وتُرجع
// true/false. أي استثناء يُعتبر فشلاً.
// 🌟 [إصلاح] بعض المولّدات تفشل أحياناً بمحض الصدفة (مثلاً اختارت آخر آية في السورة لسؤال "الآية
// التالية") رغم أنها تنجح في محاولة ثانية. نعيد المحاولة حتى n مرات قبل اعتبارها فاشلة، سواء في فحص
// الجاهزية أو وقت عرض السؤال، بدل التحويل الفوري لـ"صيد الآية".
async function retryGen(fn, attempts = 6) {
    for (let a = 0; a < attempts; a++) {
        const d = await fn();
        if (d) return d;
    }
    return null;
}

async function probeGameType(type, pool, chunkIndex, totalChunks, isJuz) {
    for (let a = 0; a < 4; a++) { if (await probeGameTypeOnce(type, pool, chunkIndex, totalChunks, isJuz)) return true; }
    return false;
}

async function probeGameTypeOnce(type, pool, chunkIndex, totalChunks, isJuz) {
    try {
        const eng = AppState.quranEngine;
        const p = getActivePoolForType(type, pool);
        let d = null;
        switch (type) {
            case 'catch': d = await eng.generateCatchGame(p, isJuz, chunkIndex, totalChunks); break;
            case 'next': d = await eng.generateNextAyahGame(p, isJuz, chunkIndex, totalChunks); break;
            case 'previous': d = await eng.generatePreviousAyahGame(p, isJuz, chunkIndex, totalChunks); break;
            case 'between': d = await eng.generateBetweenGame(p, isJuz, chunkIndex, totalChunks); break;
            case 'guess_surah': d = await eng.generateGuessSurahGame(p, chunkIndex, totalChunks); break;
            case 'recite': d = await eng.generateReciteGame(p, isJuz, false, chunkIndex, totalChunks); break;
            case 'mistake': d = await eng.generateMistakeGame(p, isJuz, chunkIndex, totalChunks); break;
            case 'complete_ayah': d = await eng.generateCompleteAyahGame(p, chunkIndex, totalChunks); break;
            case 'order': d = await eng.generateOrderGame(p, false, chunkIndex, totalChunks); break;
            case 'visual_memory': d = await eng.generateVisualMemoryGame(p, chunkIndex, totalChunks); break;
            case 'link_ends': d = await eng.generateLinkGame(p, false, chunkIndex, totalChunks); return !!d && d.type === 'link_ends';
            case 'link_word_surah': d = await eng.generateLinkWordSurahGame(p, false); return !!d && d.type === 'link_word_surah';
            default: return false;
        }
        return !!d;
    } catch (e) { return false; }
}

// 🌟 [إصلاح] بناء قائمة الأسئلة بنظام "الكيس المُخلوط" مع ضمانين جديدين:
// 1) لا تدخل القائمة إلا لعبة نجح فحصها (probeGameType). اللعبة الفاشلة تبقى في الكيس ولا
//    تُستهلك، فتُجرَّب في سؤال لاحق (قد ينجح لأن اختيار الآية عشوائي)، وتُتخطّى مؤقتاً فقط.
//    لو فشلت كل ألعاب الكيس الحالي في خانة ما، نستخدم 'catch' كملاذ أخير (سلوك قديم).
// 2) عند إعادة تعبئة الكيس بعد اكتمال كل الألعاب، لا نسمح بأن تكون أول لعبة فيه هي نفسها
//    آخر لعبة ظهرت (تكرار متتالي)، إلا لو كانت اللعبة الوحيدة الممكنة.
// ⚠️ [افتراض صريح]: "الدور الكامل" = كل ألعاب gamesList القابلة للتوليد في هذا النطاق. لو لعبة
//    لا يمكن توليدها إطلاقاً في النطاق (مثلاً نطاق صغير جداً) تُتخطّى في كل الأدوار ولا تُحسب.
async function buildGameQueue(gamesList, qCount, pool, isJuz) {
    const queue = [];
    let bag = getShuffledBag(gamesList);
    let lastType = null;
    for (let i = 0; i < qCount; i++) {
        if (bag.length === 0) {
            bag = getShuffledBag(gamesList);
            // نضع اللعبة المطابقة لآخر لعبة في أول الكيس (بداية القائمة) لأن الاختيار يبدأ من النهاية
            if (bag.length > 1 && bag[bag.length - 1] === lastType) {
                [bag[bag.length - 1], bag[0]] = [bag[0], bag[bag.length - 1]];
            }
        }
        let chosenIdx = -1;
        for (let k = bag.length - 1; k >= 0; k--) {
            if (await probeGameType(bag[k], pool, i, qCount, isJuz)) { chosenIdx = k; break; }
        }
        // ما تبقّى في الكيس كله غير قابل للتوليد (مثلاً "اربط الكلمة بالسورة" في جزء كله سورة واحدة):
        // نعتبر الدور مكتملاً ونبدأ كيساً جديداً بدل الوقوع في "صيد الآية" لباقي الأسئلة.
        if (chosenIdx === -1 && bag.length < gamesList.length) {
            bag = getShuffledBag(gamesList);
            if (bag.length > 1 && bag[bag.length - 1] === lastType) {
                [bag[bag.length - 1], bag[0]] = [bag[0], bag[bag.length - 1]];
            }
            for (let k = bag.length - 1; k >= 0; k--) {
                if (await probeGameType(bag[k], pool, i, qCount, isJuz)) { chosenIdx = k; break; }
            }
        }
        let selectedType;
        if (chosenIdx === -1) {
            // كل ألعاب الكيس الحالي تعذّر توليدها الآن — ملاذ أخير (بلا استهلاك الكيس)
            selectedType = 'catch';
        } else {
            selectedType = bag.splice(chosenIdx, 1)[0];
        }
        queue.push({ type: selectedType, chunkIndex: i });
        lastType = selectedType;
    }
    return queue;
}

// 🌟 [جديد] المعامل الثالث resumeSnapshot (اختياري): لقطة اختبار معلّق من components/pausedSession.js.
// لو مُرِّرت، يُستكمَل الاختبار من أول سؤال لم يُجَب بنفس النطاق والطابور ونتائج الأسئلة السابقة، ويُسجَّل
// التقرير والتاريخ في النهاية مرة واحدة لكل الأسئلة. غيابه = السلوك القديم تماماً بلا أي تغيير.
export async function openAdultGameScreen(config, isWeakness = false, resumeSnapshot = null) {
    if (resumeSnapshot) { config = resumeSnapshot.config || config; isWeakness = false; }
    // 🌟 [جديد] تنبيه ما قبل بدء التقييم — يشرح خصم نقاط التلميح والترتيب الخاطئ، وطبيعة
    // زر "تسجيل ملاحظة". راجع مستند "تصميم نظام تلميحات الأقسام عند أول دخول المقترح"
    showSectionHintOnce('adult_game', {
        type: 'warning',
        titleKey: 'hint_adult_game_title',
        bodyKey: 'hint_adult_game_body',
        okKey: 'hint_adult_game_ok_btn'
    });

    GameState.config = config;
    GameState.isWeaknessMode = isWeakness;
    // 🌟 [جديد] استهلاك علم "مسار الإصلاح عند الدخول" مرة واحدة فقط ثم تصفيره، حتى لا يتسرّب
    // لجلسة تحدٍّ لاحقة تُفتح من ملف الطالب (تلك تبقى تنتهي بشاشة التقرير كما كانت) 🌟
    GameState.fixFromLogin = !!(isWeakness && AppState.fixFlow && AppState.fixFlow.fromLogin);
    AppState.fixFlow = null;
    GameState.weaknessSnapshot = [];
    GameState.reportDetails = [];
    GameState.resumedFromPause = false; // 🌟 [جديد] يُضبط true فقط عند استكمال اختبار معلّق (أدناه)
    GameState.currentIndex = 0;
    GameState.consecutiveCorrect = 0;
    
    try {
        if (isWeakness) {
            if(!AppState.currentStudent.weaknesses || AppState.currentStudent.weaknesses.length === 0) return alert(t("لا توجد أخطاء مسجلة!"));
            // 🌟 [إصلاح] نأخذ اللقطة الثابتة ثم نبني الطابور منها (راجع weaknessSnapshot أعلاه) 🌟
            // 🌟 [جديد] الجلسة تشمل الأخطاء "المستحقة" فقط: الجديدة، أو التي أُجيبت صح في يوم سابق
            // وتنتظر مراجعتها الثانية للتثبيت. ما أُجيب صح اليوم يُستثنى حتى يوم لاحق 🌟
            const dueList = getDueWeaknesses(AppState.currentStudent);
            if (dueList.length === 0) return alert(t('fixp_none_due'));
            GameState.weaknessSnapshot = dueList;
            GameState.queue = GameState.weaknessSnapshot.map(w => ({type: 'weakness', chunkIndex: 0}));
            GameState.evalRangeText = t("جلسة علاج وتصحيح الأخطاء السابقة");
        } else {
            let qCount = config.qCount; 
            let ayahsPool = [];
            
            if(config.isJuzMode) {
                ayahsPool = await AppState.quranEngine.getAyahsByJuz(config.juzNum); 
                GameState.evalRangeText = tfAr('adult_juz_text', { n: config.juzNum });
            } else if(config.isRangeMode) {
                ayahsPool = await AppState.quranEngine.getAyahsBySurahRange(config.rangeFrom, config.rangeTo);
                let sNameF = AppState.surahsData.find(s => s.number === config.rangeFrom).name; 
                let sNameT = AppState.surahsData.find(s => s.number === config.rangeTo).name; 
                GameState.evalRangeText = tfAr('adult_range_text', { sfrom: sNameF, sto: sNameT });
            } else {
                let surah = await AppState.quranEngine.getSurah(config.surahNum); 
                ayahsPool = AppState.quranEngine.getAyahsInRange(surah, config.startAyah, config.endAyah); 
                let cleanName = surah.name.replace(/سُورَةُ\s*/g, '').replace(/سورة\s*/g, '').trim(); 
                GameState.evalRangeText = tfAr('adult_surah_text', { name: cleanName, a: config.startAyah, b: config.endAyah });
            }
            
            if(ayahsPool.length === 0) return alert(t("عفواً، لا توجد آيات في النطاق المحدد!"));
            if(!resumeSnapshot && ayahsPool.length < qCount) {
                alert(tf('adult_reduced_questions', { n: ayahsPool.length })); 
                qCount = ayahsPool.length; 
            }

            GameState.pool = ayahsPool; 
            GameState.queue = [];
            
            // 🌟 [جديد] أضفنا 'link_ends' (لعبة اربط أول الآية بآخرها) لكلا وضعي التقييم.
            // 🌟 [إعادة تصميم] استبدلنا 'order_surahs' (لعبة "رتب السور" القديمة، كانت تطلب
            // ترتيب السور بترتيب المصحف من الفاتحة للناس) بـ'link_word_surah' (لعبة "اربط الكلمة
            // بالسورة" الجديدة — راجع تعليق generateLinkWordSurahGame في quranEngine.js لسبب
            // الاستبدال الكامل). بقيت نفس القيود القديمة: وضع "الجزء" فقط عند الكبار، بطلب صريح
            // من المعلم، لأن وضع الجزء غالباً يحتوي على أكثر من سورة ضمنه (بعكس وضع نطاق سورة
            // واحدة أو نطاق من سورة لأخرى، حيث لا معنى واضح لهذه اللعبة لأن السورة غالباً واحدة) 🌟
            // 🌟 [تحديث] أضفنا 'next' (الآية التالية) و'between' (آية بين آيتين) و'recite' (التسميع) لوضع
            // "الجزء" أيضاً (كانت غائبة عنه دون سبب موثّق في الكود). ⚠️ افتراض صريح: أرجح سبب غيابها
            // القديم أن المولّدات كانت تعرض أحياناً آية من سورة مختلفة عند حدود السور داخل الجزء، ولا
            // تلتزم بحدود الجزء في التسميع — أصلحنا الأمرين في quranEngine.js (راجع تعليقات 🌟 في
            // generateNextAyahGame / generateBetweenGame / generateReciteGame). لو كان غيابها بقرار
            // تربوي من المعلم يمكن إرجاعها بحذفها من هذه القائمة فقط، بلا أي تعديل آخر.
            // وضع الجزء الآن 12 لعبة (كل الألعاب)، وضع السورة/النطاق 10 ألعاب.
            let gamesList = config.isJuzMode
                ? ['catch', 'next', 'previous', 'guess_surah', 'order', 'between', 'recite', 'mistake', 'complete_ayah', 'visual_memory', 'link_ends', 'link_word_surah']
                : ['catch', 'next', 'previous', 'order', 'between', 'recite', 'mistake', 'complete_ayah', 'visual_memory', 'link_ends'];
            
            // 🌟 [إصلاح] استبدلنا الحلقة القديمة (كانت تختار الأنواع بلا التأكد أنها ستُولَّد فعلاً،
            // فتتحول الألعاب الفاشلة صامتة إلى "صيد الآية") بـbuildGameQueue أعلاه
            if (resumeSnapshot && Array.isArray(resumeSnapshot.queue) && resumeSnapshot.queue.length) {
                // 🌟 [جديد] استكمال اختبار معلّق: نفس الطابور المحفوظ (بنفس عدد الأسئلة وأنواعها)، والأسئلة
                // الباقية تُولَّد من نفس نطاق الآيات عند وصول دورها في playNextMission كالمعتاد. نص النطاق
                // يُستعاد كما حُفظ (تفادياً لتغيّر لغة الواجهة بين الجلستين)، ونتائج الأسئلة السابقة تُعاد
                // كما هي ليشملها التقرير النهائي وسجل التاريخ مرة واحدة.
                GameState.queue = resumeSnapshot.queue;
                GameState.currentIndex = Math.min(resumeSnapshot.currentIndex || 0, GameState.queue.length - 1);
                GameState.reportDetails = Array.isArray(resumeSnapshot.reportDetails) ? resumeSnapshot.reportDetails : [];
                if (resumeSnapshot.evalRangeText) GameState.evalRangeText = resumeSnapshot.evalRangeText;
                GameState.resumedFromPause = true;
            } else {
                GameState.queue = await buildGameQueue(gamesList, qCount, ayahsPool, !!config.isJuzMode);
            }
        }
        await loadScreen({ templateUrl: 'games/adultGame.html', initFunction: initGameUI });
    } catch (err) { alert("حدث خطأ: " + err.message); }
}

function initGameUI() {
    window.openZoomVisual = function(imgR, imgL) {
        document.getElementById('zoom-img-right').src = imgR;
        document.getElementById('zoom-img-left').src = imgL;
        document.getElementById('zoomModal').style.display = 'flex';
    };

    initGameFullscreen(); // 🌟 [جديد] زر ملء الشاشة للعرض أمام الطلاب — راجع components/gameFullscreen.js
    initAudio(); 
    startTimer(30); 
    
    const tracker = document.getElementById('questions-tracker'); 
    tracker.innerHTML = ''; 
    for(let i=0; i<GameState.queue.length; i++) { 
        let div = document.createElement('div'); 
        div.className = 'q-circle'; div.id = `trk-${i}`; div.innerText = i + 1; 
        tracker.appendChild(div); 
    }
    
    document.getElementById('hint-btn')?.addEventListener('click', showHint);
    document.getElementById('show-ans-btn')?.addEventListener('click', toggleAnswer);
    // 🌟 [جديد] تأكيد قبل الخروج لو فيه إجابات مسجَّلة بالفعل في هذه الجلسة — كانت الضغطة
    // الواحدة على "خروج وإنهاء" تُلغي كل التقييم الجاري فوراً بلا أي تحذير (بعكس الاختبار
    // الثنائي dual-test-play.js اللي عنده confirm() مشابه). لو الجلسة لسه في أولها (مفيش أي
    // سؤال اتسجّل له إجابة) نخرج مباشرة زي السابق تماماً بدون إزعاج المعلم بتأكيد لا داعي له
    document.getElementById('btn-exit-game')?.addEventListener('click', () => {
        if (GameState.reportDetails.length > 0 && !confirm(t('exit_game_confirm_msg'))) return;
        clearInterval(GameState.timerInterval);
        loadDashboardScreen();
    });
    
    // 🌟 [جديد] زر "⏸️ حفظ والعودة لاحقًا": يحفظ لقطة الاختبار داخل سجل الطالب (راجع
    // components/pausedSession.js) ثم يعود للوحة. لا يظهر في جلسة "علاج الأخطاء" (إجاباتها محفوظة
    // أصلاً). السؤال المفتوح حالياً (غير المُجاب) يُعاد توليده عند الاستكمال — لا شيء منه يُحفَظ.
    const pauseBtn = document.getElementById('btn-pause-game');
    if (pauseBtn) {
        if (GameState.isWeaknessMode) pauseBtn.style.display = 'none';
        pauseBtn.addEventListener('click', async () => {
            if (GameState.isWeaknessMode) return;
            if (GameState.reportDetails.length === 0) { alert(t('pause_nothing_yet')); return; }
            if (GameState.reportDetails.length >= GameState.queue.length) return; // كل الأسئلة أُجيبت — الانتقال للتقرير جارٍ
            const student = AppState.currentStudent;
            if (!student) return;
            // اختبار معلّق آخر موجود (لم يبدأ منه هذا الاختبار) → تأكيد قبل استبداله (افتراض: معلّق واحد لكل طالب)
            // 🌟 [جديد] نافذة تأكيد قبل الحفظ والعودة لاحقاً (تجنّباً للضغط بالخطأ). لو فيه اختبار معلّق آخر
            // سيُستبدل نعرض رسالة الاستبدال وحدها (هي أصلاً تأكيد) بدل نافذتين متتاليتين؛ وإلا نعرض تأكيد الحفظ
            const replacing = student.pausedEvaluation && !GameState.resumedFromPause;
            if (!confirm(t(replacing ? 'pause_replace_confirm' : 'pause_confirm_msg'))) return;
            pauseBtn.disabled = true;
            try {
                student.pausedEvaluation = buildPausedSnapshot(GameState, false);
                await AppState.studentManager.updateStudent(student);
            } catch (err) {
                console.error('تعذر حفظ الاختبار المعلّق:', err);
                delete student.pausedEvaluation;
                pauseBtn.disabled = false;
                alert(t('pause_save_failed'));
                return;
            }
            clearInterval(GameState.timerInterval);
            alert(t('pause_saved_msg'));
            loadDashboardScreen();
        });
    }

    document.getElementById('btn-record-wrong')?.addEventListener('click', () => {
        document.querySelectorAll('#error-modal input[type="checkbox"]').forEach(cb => cb.checked = false); 
        document.getElementById('custom-note').value = ''; 
        // 🌟 صندوق "موضع الخطأ" يظهر لأسئلة التسميع فقط ويُخفى لغيرها
        prepareReciteRangeBox(GameState.currentData);
        openModal('error-modal'); 
    });
    
    document.getElementById('btn-record-correct')?.addEventListener('click', () => {
        if(GameState.tempErrors.length > 0) {
            let confirmClear = confirm(t("لقد سجّلت ملاحظات على هذا السؤال مسبقاً. هل أنت متأكد أنك تريد إلغاءها واعتبار الإجابة صحيحة تامة؟"));
            if(!confirmClear) return;
        }
        recordAnswer(true);
    });

    document.getElementById('btn-save-error-temp')?.addEventListener('click', saveTempError);
    document.getElementById('btn-submit-all-errors')?.addEventListener('click', submitAllErrors);
    document.getElementById('btn-close-error')?.addEventListener('click', () => closeModal('error-modal'));

    playNextMission();
}

function updateTrackerUI() { 
    const tracker = document.getElementById('questions-tracker'); 
    if(!tracker) return; 
    for(let i=0; i<GameState.queue.length; i++) { 
        let circle = document.getElementById(`trk-${i}`); 
        if(!circle) continue; 
        circle.className = 'q-circle'; 
        if (i < GameState.currentIndex) { 
            let reportObj = GameState.reportDetails[i]; 
            if(reportObj) circle.classList.add(reportObj.isCorrect ? 'correct' : 'wrong'); 
            else circle.classList.add('wrong'); 
        } else if (i === GameState.currentIndex) { 
            circle.classList.add('active'); 
        } 
    } 
}

// 🌟 [جديد] نفس معادلة احتساب درجة السؤال المستخدمة بالحرف في reports/report.js
// (computeQuestionScore) — مكررة عمدًا هنا (لا مستوردة من report.js) حتى لا نُدخل أي
// اعتمادية جديدة على شاشة التقرير من داخل محرك اللعبة، ولضمان أن أي تعديل مستقبلي على
// report.js لا يكسر تسجيل التاريخ هنا بصمت. لو عُدِّلت الصيغة هناك يومًا، عدّلها هنا أيضًا.
function computeQuestionScoreForHistory(d) {
    if (!d.isCorrect) return 0;
    if (d.orderAttempts === 1) return 8;
    if (d.orderAttempts >= 2) return 6;
    if (d.usedHint) return 8;
    return 10;
}

// 🌟 [جديد] تسجيل تقييم "غرفة الكبار" الفردي في نفس سجل history_${studentId} المستخدم
// أصلاً من games/homework-play.js للواجبات المنزلية — حتى الآن كانت تقييمات غرفة اللعب لا
// تُحفَظ في أي مكان دائم إطلاقًا بعد إغلاق شاشة التقرير (راجع ملاحظة الاكتشاف في مستند
// المشروع "تصميم-تقرير-الإنجاز-الشهري-المقترح.md")، فلا تظهر في "سجل التقييمات السابقة"
// بملف الطالب ولا في تقرير الإنجاز الشهري. هذا يصلح الفجوة: نفس بنية سجل الواجب بالضبط
// {date, range, score}، بالإضافة إلى حقلين جديدين:
//   - source: 'adult_game' لتمييزه عن سجلات الواجبات (التي تحمل hwId بدلاً من ذلك) وعن
//     سجلات "ركن الأطفال" (kidsGame.js)، بلا أي حاجة لتخمين المصدر من نص range.
//   - timestamp: رقم Date.now()، غير موجود في سجلات الواجبات القديمة، ويُستخدَم فقط
//     لفلترة تقرير الإنجاز الشهري بدقة بدل محاولة تحليل نص date المُوطَّن محليًا (ar-EG)
//     الذي قد يحمل أرقامًا هندية-عربية يصعب تحليلها برمجيًا بثقة.
// ⚠️ [افتراض صريح]: لا يوجد سجل رجعي — الجلسات التي لُعبت قبل هذا التحديث لن تظهر أبداً
// في history_ ولا في التقرير الشهري لأنها لم تُحفَظ وقتها أصلاً.
//
// 🌟 [إصلاح] كان حقل date هنا يُبنى بـ toLocaleDateString('ar-EG')، التي تُرجع الترتيب
// يوم/شهر/سنة، بينما shortDateLabel في reports/report.js (المسؤولة عن عرض تاريخ كل
// محطة في "سُلّم التقدّم") تفترض أن date دائمًا بترتيب سنة/شهر/يوم (نفس صيغة
// formatDateArabic هناك) فتقرأ جزء "السنة" هنا على أنه "اليوم" فيظهر رقم غير منطقي
// (كـ"٢٠٣٦") بدل يوم الشهر الصحيح. الحل: نبني date هنا بنفس ترتيب formatDateArabic
// حرفيًا (سنة / شهر / يوم بأرقام إنجليزية) بدل الاعتماد على تنسيق المتصفح المحلي،
// حتى يتطابق كل مصدر يكتب على history_ مع الصيغة التي يقرأها التقرير.
function historyDateLabel() {
    const now = new Date();
    const yyyy = now.getFullYear(), mm = now.getMonth() + 1, dd = now.getDate();
    return `${yyyy} / ${String(mm).padStart(2, '0')} / ${String(dd).padStart(2, '0')}`;
}
function persistEvaluationToHistory() {
    try {
        const student = AppState.currentStudent;
        if (!student || !Array.isArray(GameState.reportDetails) || GameState.reportDetails.length === 0) return;

        const totalMax = GameState.reportDetails.length * 10;
        const totalEarned = GameState.reportDetails.reduce((sum, d) => sum + computeQuestionScoreForHistory(d), 0);
        const scorePercent = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : 0;

        const historyKey = `history_${student.id}`;
        const historyArray = JSON.parse(localStorage.getItem(historyKey)) || [];
        historyArray.push({
            date: historyDateLabel(),
            range: GameState.evalRangeText || tfAr('hist_eval_default_range'),
            score: scorePercent,
            source: 'adult_game',
            // 🌟 [جديد] نوع الجلسة — 'weakness' لجلسات "تحدي الأخطاء" و'eval' لغيرها، ليتمكن التقرير
            // الشهري من عدّ جلسات الإصلاح بدقة بدل تخمينها من نص range (السجلات القديمة بلا
            // هذا الحقل يتعرّف عليها التقرير من نص range كخط رجوع) 🌟
            mode: GameState.isWeaknessMode ? 'weakness' : 'eval',
            // 🌟 [جديد] حقل اختياري: الاختبار أُكمل على مرحلتين (حفظ والعودة لاحقًا). غيابه = جلسة واحدة
            ...(GameState.resumedFromPause ? { resumed: true } : {}),
            timestamp: Date.now()
        });
        localStorage.setItem(historyKey, JSON.stringify(historyArray));
    } catch (e) {
        // best-effort بالكامل: فشل تسجيل التاريخ لا يجب أن يمنع عرض التقرير نفسه إطلاقاً
        console.error('تعذر تسجيل تقييم غرفة الكبار في السجل التاريخي:', e);
    }
}

async function playNextMission() {
    try {
        // 🌟 [جديد] سؤال "الذاكرة البصرية" مستثنى من ملء الشاشة (راجع css/gameFullscreen.css) — نمسح العلامة مع كل سؤال جديد
        delete document.body.dataset.gameQ;
        if(GameState.currentIndex >= GameState.queue.length) {
            updateTrackerUI();
            clearInterval(GameState.timerInterval);
            playSuccessSound();
            triggerConfetti();
            // 🌟 [جديد] تسجيل هذا التقييم في history_ قبل عرض التقرير — راجع تعليق
            // persistEvaluationToHistory أعلاه لتفاصيل السبب والافتراضات
            persistEvaluationToHistory();
            // 🌟 [جديد] اكتمل اختبار كان معلّقاً ← نحذف لقطته من سجل الطالب (best-effort) حتى لا تظهر
            // بطاقة "اختبار غير مكتمل" مرة أخرى. اختبار جديد عادي لا يمسّ أي لقطة موجودة
            if (GameState.resumedFromPause && AppState.currentStudent && AppState.currentStudent.pausedEvaluation) {
                clearPausedEvaluation(AppState.currentStudent);
                AppState.studentManager.updateStudent(AppState.currentStudent).catch(() => { /* best-effort */ });
            }
            // 🌟 openReportScreen() بقت تحقن واجهة التقرير بنفسها مباشرة في #app-root
            // (القالب مضمَّن داخل report.js نفسه)، فلم نعد نحتاج المرور عبر loadScreen
            // ولا جلب أي ملف report.html منفصل 🌟
            // 🌟 [إصلاح] نمرر GameState بتاع لعبة الكبار صراحة (راجع نفس التعليق في
            // kidsGame.js) — report.js بقى يستخدم أي GameState يُمرَّر له عند فتح
            // التقرير بدل استيراد ثابت من adultGame.js فقط 🌟
            // 🌟 [جديد] لو الجلسة بدأت من مسار "إصلاح الأخطاء عند الدخول": ملخص قصير (كم أُصلح وكم
            // تبقّى) ثم شاشة الألعاب، بدل شاشة التقرير الكاملة. ما عدا ذلك (تحدٍّ من ملف الطالب
            // أو تقييم عادي) يبقى السلوك القديم تماماً 🌟
            if (GameState.isWeaknessMode && GameState.fixFromLogin) {
                GameState.fixFromLogin = false;
                const summary = summarizeFixSession(AppState.currentStudent, GameState.weaknessSnapshot, (a, b) => normalizeForCompare(a.text) === normalizeForCompare(b.text));
                return showFixErrorsSummary(AppState.currentStudent, {
                    kids: false, ...summary,
                    onContinue: () => loadDashboardScreen()
                });
            }
            return openReportScreen(GameState);
        }

        updateTrackerUI();
        GameState.hintUsed = false;
        GameState.currentQuestionStartTime = Date.now();
        GameState.tempErrors = [];
        GameState.tempRanges = [];
        GameState.orderAttempts = 0;
        
        // 🌟 [إصلاح تدقيق] لو غادر المعلم اللعبة أثناء انتظار مؤقّت الانتقال للمهمة التالية تكون عناصر الشاشة قد أُزيلت فيحدث TypeError؛ نتوقف بهدوء
        if (!document.getElementById('temp-errors-container')) return;
        document.getElementById('temp-errors-container').style.display = 'none';
        document.getElementById('temp-errors-list').innerHTML = '';
        document.getElementById('btn-submit-all-errors').style.display = 'none';
        
        document.getElementById('in-game-student-info').style.display = 'flex'; 
        document.getElementById('in-game-name').innerText = AppState.currentStudent.name; 
        
        let avatarImg = document.getElementById('in-game-avatar');
        if (avatarImg) {
            // 🌟 [إصلاح تدقيق] assets/default.png غير موجود (404 عند كل فتح)، والأفاتار الإيموجي (نص قصير) لا يصلح كـ src لصورة —
            // لذا نستخدم الصورة فقط لو كانت data URL/مسار حقيقي، وإلا الأيقونة الافتراضية المدمجة مباشرة.
            const _av = AppState.currentStudent.avatar;
            avatarImg.src = (_av && _av.length >= 10) ? _av : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23cbd5e1"><circle cx="50" cy="50" r="50"/><path fill="%23fff" d="M50 55c-11 0-20-9-20-20s9-20 20-20 20 9 20 20-9 20-20 20zm0 5c15 0 30 10 30 25v5H20v-5c0-15 15-25 30-25z"/></svg>'; 
            avatarImg.onerror = function() { 
                this.onerror = null; 
                this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23cbd5e1"><circle cx="50" cy="50" r="50"/><path fill="%23fff" d="M50 55c-11 0-20-9-20-20s9-20 20-20 20 9 20 20-9 20-20 20zm0 5c15 0 30 10 30 25v5H20v-5c0-15 15-25 30-25z"/></svg>';
            };
        }
        
        document.getElementById('teacher-eval-buttons').style.display = 'none';
        document.getElementById('teacher-eval-area').style.display = 'none';
        document.getElementById('interactive-order-area').style.display = 'none';
        // 🌟 [جديد] إخفاء منطقة لعبة "اربط أول الآية بآخرها" عند بداية كل سؤال جديد 🌟
        document.getElementById('interactive-link-area').style.display = 'none';
        document.getElementById('game-answer').style.display = 'none';
        document.getElementById('show-ans-btn').style.display = 'inline-block'; 
        // 🌟 تطبيق الترجمة هنا 🌟
        document.getElementById('show-ans-btn').innerHTML = t('show_ans_match'); 
        document.getElementById('hint-btn').style.display = 'none'; 
        document.getElementById('hint-text').style.display = 'none';

        let queueItem = GameState.queue[GameState.currentIndex]; 
        let type = queueItem.type;
        let pool = GameState.pool; 
        let chunkIndex = queueItem.chunkIndex; 
        let totalChunks = GameState.config ? GameState.config.qCount : 1;
        
        // 🌟 [إصلاح] نفس المنطق القديم بالضبط لكن عبر الدالة المشتركة getActivePoolForType
        let activePool = getActivePoolForType(type, pool);

        if (GameState.isWeaknessMode) {
            // 🌟 [إصلاح] القراءة من اللقطة الثابتة بدل القائمة الحيّة التي تقصر مع كل إجابة صحيحة؛
            // الرجوع للقائمة الحيّة احتياط توافق فقط لو اللقطة غير موجودة لأي سبب 🌟
            let wItem = GameState.weaknessSnapshot[GameState.currentIndex] || AppState.currentStudent.weaknesses[GameState.currentIndex];

            // 🌟 إعادة بناء عرض السؤال الأصلي بكل تفاصيله (نوعه الكامل، ونصه بصيغته
            // التي ظهرت للطالب أول مرة) بدل الاكتفاء بعرض نص الآية المجرد بلا سياق كما
            // كان يحدث سابقاً (فمثلاً سؤال "أكمل الآية" كان يظهر هنا كآية كاملة عادية
            // دون توضيح أنه كان سؤال إكمال، وسؤال "الآية بين آيتين" كان يفقد سياق
            // الآيتين المحيطتين). "رتب الآيات" استثناء لأنه سؤال تفاعلي بلا نص جاهز
            // (questionBody)، فنعرض آياته بترتيبها الصحيح بدلاً من ذلك. ولو كان الخطأ
            // مسجّلاً من نسخة سابقة للمنصة (قبل هذا التحديث) ولا يملك أياً من هذه
            // الحقول الجديدة، نرجع تلقائياً لعرض نص الآية المجرد فقط كما كان يعمل من
            // قبل، حفاظاً على التوافق مع الأخطاء المسجّلة فعلياً عند المعلمين 🌟
            let originalBodyHTML;
            // 🌟 [جديد] "رتب الآيات" في علاج الخطأ صار يظهر بنفس طريقة ظهوره للطالب أول مرة:
            // آيات مخلوطة (بخلط جديد) يرتّبها الطالب بالنقر، مع تصحيح تلقائي — بدل عرض الترتيب
            // الصحيح جاهزًا (الذي كان يكشف الإجابة ولا يعيد التحدي فعليًا). الشرط يضمن أن كل آية
            // محفوظة بنصها ورقمها (numberInSurah) لتعمل المقارنة؛ وإلا (سجل ناقص) نرجع للعرض
            // الثابت القديم كما كان بلا كسر 🌟
            const isInteractiveOrder = wItem.questionType === 'order' && Array.isArray(wItem.orderAyahs) && wItem.orderAyahs.length > 1 &&
                wItem.orderAyahs.every(a => a && a.text && a.numberInSurah != null) &&
                new Set(wItem.orderAyahs.map(a => a.numberInSurah)).size === wItem.orderAyahs.length;
            // 🌟 [جديد] أسئلة الربط ("أول الآية بآخرها"، "الكلمة بالسورة") تُعاد أيضًا كلعبة تفاعلية بنفس
            // حاوية الجولة العادية؛ ولو تعذّرت إعادة بنائها (سجل قديم غير قابل للتحليل) يبقى العرض الثابت 🌟
            const linkRebuilt = (wItem.questionType === 'link_ends' || wItem.questionType === 'link_word_surah' ||
                wItem.questionType === 'kids_link_ends' || wItem.questionType === 'kids_link_word_surah') ? rebuildLinkFromRecord(wItem) : null;
            if (isInteractiveOrder || linkRebuilt) {
                originalBodyHTML = '';
            } else if (wItem.questionType === 'order' && Array.isArray(wItem.orderAyahs) && wItem.orderAyahs.length) {
                originalBodyHTML = `<div style="font-size:1.3rem; font-weight:bold; margin-bottom:10px;">${t('correct_order')}:</div>` +
                    wItem.orderAyahs.map((a, i) => `<div class="quran-text" style="font-size:2.2rem; margin-bottom:8px;">${i + 1}) ﴿\u00A0${a.text}\u00A0﴾</div>`).join('');
            } else if (wItem.questionBody) {
                originalBodyHTML = wItem.questionBody;
            } else {
                originalBodyHTML = `<div class="quran-text" style="font-size:3.5rem;">﴿\u00A0${wItem.text}\u00A0﴾</div>`;
            }

            // 🌟 [إصلاح] صيغة السؤال الأصلية بخط كبير فوق نصه (بدل سطر صغير تحت النص) + تنبيه للأخطاء القديمة 🌟
            let headLine = buildWeaknessQuestionHeader(wItem, (k) => localizeGenerated(trStored(t(k))), 'var(--primary)');
            let dateLine = wItem.dateRecorded ? `<div style="font-size:1rem; color:#64748b; margin-top:5px;">${t('error_recorded_on')} ${new Date(wItem.dateRecorded).toLocaleDateString(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US')}</div>` : '';
            let errorLine = `<div style="font-size:1.4rem; font-weight:bold; margin-top:10px;">${t("الخطأ السابق المسجل:")} [ ${localizeErrorTypes(wItem.errorTypes)} ]</div>`;

            GameState.currentData = { type: 'weakness', questionTitle: t("تحدي تصحيح الخطأ السابق"), questionBody: `${headLine}${originalBodyHTML}${errorLine}${dateLine}`, fullAnswer: wItem.fullAnswer || wItem.text, ayahObj: { numberInSurah: wItem.num, surahName: wItem.surahName }, reportText: wItem.text };
            document.getElementById('teacher-eval-area').style.display = 'block';
            document.getElementById('teacher-eval-buttons').style.display = 'flex';
            document.getElementById('game-title').innerHTML = `<span style="padding:10px 30px; border-radius:50px; display:inline-block; border:2px solid var(--primary); background: rgba(0,0,0,0.05); font-size:1.8rem;">🛠️ ${t("علاج الخطأ السابق")}</span>`;
            document.getElementById('game-question').innerHTML = GameState.currentData.questionBody;

            // 🌟 [جديد] تفعيل لعبة الترتيب التفاعلية نفسها (نفس الحاوية والدالة buildOrderGameUI
            // المستخدمة في الجولة العادية بلا أي تعديل عليهما). original = الترتيب الصحيح المحفوظ،
            // shuffled = خلط جديد يختلف عن الترتيب الصحيح. الإجابة الصحيحة (تظهر بزر "إظهار
            // الإجابة للمطابقة" فقط) هي الآيات مرتبة. أزرار المعلم تبقى ظاهرة كما كانت لتسجيل
            // الخطأ يدويًا عند الحاجة (recordAnswer يتجاهل التكرار بحارس __answered) 🌟
            if (isInteractiveOrder) {
                const orig = wItem.orderAyahs.map(a => ({ text: a.text, numberInSurah: a.numberInSurah, surahName: a.surahName }));
                GameState.currentData.original = orig;
                GameState.currentData.shuffled = shuffleDifferentFromOriginal(orig, a => a.numberInSurah);
                GameState.currentData.studentAnswer = [];
                document.getElementById('interactive-order-area').style.display = 'block';
                let orderInstEl = document.querySelector('#interactive-order-area p[data-i18n="order_inst"]');
                if (orderInstEl) orderInstEl.innerHTML = t('order_inst');
                let orderShufTitleEl = document.querySelector('#interactive-order-area h3[data-i18n="shuffled_ayahs"]');
                if (orderShufTitleEl) orderShufTitleEl.innerHTML = t('shuffled_ayahs');
                buildOrderGameUI();
                document.getElementById('game-answer').innerHTML = `${t("الإجابة الصحيحة:")}<br><div style="font-size:1.3rem; font-weight:bold; margin:10px 0;">${t('correct_order')}:</div>` +
                    orig.map((a, i) => `<div class="quran-text" style="font-size:2.2rem; margin-bottom:8px;">${i + 1}) ﴿\u00A0${a.text}\u00A0﴾</div>`).join('');
                return;
            }

            if (linkRebuilt) {
                const isWS = wItem.questionType.includes('word_surah');
                GameState.currentData.starts = linkRebuilt.starts;
                GameState.currentData.ends = linkRebuilt.ends;
                GameState.currentData.matchedPairs = [];
                GameState.currentData.selectedStart = null;
                GameState.currentData.locked = false;
                document.getElementById('interactive-link-area').style.display = 'block';
                let lInst = document.querySelector('#interactive-link-area p[data-i18n="link_inst"]');
                if (lInst) lInst.innerHTML = t(isWS ? 'link_word_surah_inst' : 'link_inst');
                let lStarts = document.querySelector('#interactive-link-area h3[data-i18n="link_starts_title"]');
                if (lStarts) lStarts.innerHTML = t(isWS ? 'link_word_surah_starts_title' : 'link_starts_title');
                let lEnds = document.querySelector('#interactive-link-area h3[data-i18n="link_ends_title"]');
                if (lEnds) lEnds.innerHTML = t(isWS ? 'link_word_surah_ends_title' : 'link_ends_title');
                buildLinkGameUI();
                document.getElementById('game-answer').innerHTML = `${t("الإجابة الصحيحة:")}<br><div class="quran-text" style="font-size:2rem; margin-top:10px;">${linkRebuilt.answerHTML}</div>`;
                return;
            }

            // 🌟 سؤال "الذاكرة البصرية" إجابته صندوق منسّق جاهز بالكامل (فيه زر تكبير
            // المصحف)، وليس نص آية عادي — فنعرضه كما هو دون لفّه بأقواس ﴿ ﴾ حتى لا
            // يظهر مكسور الشكل، تماماً كما تتعامل معه الشاشة الأصلية خارج وضع العلاج 🌟
            if (wItem.questionType === 'visual_memory' && wItem.fullAnswer) {
                document.getElementById('game-answer').innerHTML = wItem.fullAnswer;
            } else {
                let extraCorrectAns = (wItem.correctAns && wItem.questionType === 'complete_ayah') ? `<br><br><span style="color:var(--danger)">${t("الكلمات المفقودة:")} ${wItem.correctAns}</span>` : '';
                document.getElementById('game-answer').innerHTML = `${t("الإجابة الصحيحة:")}<br><div style="color:var(--secondary); font-size:1.4rem; font-weight:bold; margin: 10px 0;">${tf('game_ref_label', { name: surahNameLocal(wItem.surahName), n: wItem.num })}</div><span class="quran-text">﴿\u00A0${GameState.currentData.fullAnswer}\u00A0﴾</span>${extraCorrectAns}`;
            }
            return;
        }

        if(type === 'order') {
            GameState.currentData = await retryGen(() => AppState.quranEngine.generateOrderGame(activePool, false, chunkIndex, totalChunks));
            if(!GameState.currentData) GameState.currentData = await retryGen(() => AppState.quranEngine.generateCatchGame(activePool, GameState.config.isJuzMode, -1, 1));
            GameState.currentData.studentAnswer = [];
            document.getElementById('interactive-order-area').style.display = 'block';
            // 🌟 [قديم] نعيد نص التعليمة وعنوان العمود الثاني لأصلهما الخاص بـ"رتب الآيات" —
            // كانت لعبة "رتب السور" (order_surahs، مُستبدَلة الآن بـ'link_word_surah' التي تستخدم
            // حاوية الربط لا حاوية الترتيب) تشارك هذه الحاوية وتُغيّر هذين النصّين مؤقتاً أثناء
            // عرضها. أبقينا هذا التصحيح رغم ذلك بلا ضرر، احترازًا لأي استخدام مستقبلي مشابه 🌟
            let orderInstEl = document.querySelector('#interactive-order-area p[data-i18n="order_inst"]');
            if (orderInstEl) orderInstEl.innerHTML = t('order_inst');
            let orderShufTitleEl = document.querySelector('#interactive-order-area h3[data-i18n="shuffled_ayahs"]');
            if (orderShufTitleEl) orderShufTitleEl.innerHTML = t('shuffled_ayahs');
            buildOrderGameUI();
            document.getElementById('game-title').innerHTML = `<span style="padding:10px 30px; border-radius:50px; display:inline-block; border:2px solid var(--primary); background: rgba(0,0,0,0.05); font-size:1.8rem; font-weight:bold;">${t(GameState.currentData.questionTitle) || t('🔀 رتب الآيات')}</span>`;
        } else if (type === 'link_word_surah') {
            // 🌟 [إعادة تصميم] لعبة "اربط الكلمة بالسورة" — محل لعبة "رتب السور" القديمة (نفس
            // قيد الظهور السابق: ركن الكبار في وضع الجزء فقط). تعيد استخدام نفس حاوية ودالة بناء
            // واجهة لعبة "اربط أول الآية بآخرها" (interactive-link-area / buildLinkGameUI) بالحرف
            // بلا أي تعديل عليهما، لأن شكل البيانات (starts/ends/id/matchedPairs) مطابق تماماً —
            // راجع تعليق generateLinkWordSurahGame في quranEngine.js لتفاصيل الفكرة وسبب
            // الاستبدال والافتراضات الكاملة. بما إن الحاوية أصبحت مشتركة الآن بين نوعي ربط
            // مختلفين، لازم نضبط نص التعليمة وعنواني العمودين حسب النوع الحالي في كل مرة 🌟
            GameState.currentData = await retryGen(() => AppState.quranEngine.generateLinkWordSurahGame(activePool, false));
            if(!GameState.currentData) GameState.currentData = await retryGen(() => AppState.quranEngine.generateCatchGame(activePool, GameState.config.isJuzMode, -1, 1));

            if (GameState.currentData.type === 'link_word_surah') {
                GameState.currentData.matchedPairs = [];
                GameState.currentData.selectedStart = null;
                GameState.currentData.locked = false;
                document.getElementById('interactive-link-area').style.display = 'block';
                let instEl = document.querySelector('#interactive-link-area p[data-i18n="link_inst"]');
                if (instEl) instEl.innerHTML = t('link_word_surah_inst');
                let startsTitleEl = document.querySelector('#interactive-link-area h3[data-i18n="link_starts_title"]');
                if (startsTitleEl) startsTitleEl.innerHTML = t('link_word_surah_starts_title');
                let endsTitleEl = document.querySelector('#interactive-link-area h3[data-i18n="link_ends_title"]');
                if (endsTitleEl) endsTitleEl.innerHTML = t('link_word_surah_ends_title');
                buildLinkGameUI();
                document.getElementById('game-title').innerHTML = `<span style="padding:10px 30px; border-radius:50px; display:inline-block; border:2px solid var(--primary); background: rgba(0,0,0,0.05); font-size:1.8rem; font-weight:bold;">${t(GameState.currentData.questionTitle)}</span>`;
            } else {
                // 🌟 fallback نادر جداً: تعذّر إيجاد سورتين مختلفتين على الأقل ضمن الجزء المختار
                // — نعرض سؤال "صيد الآية" العادي بديلاً عنها بدل تعطّل الشاشة، بنفس فallback لعبة
                // "رتب السور" القديمة بالحرف 🌟
                document.getElementById('teacher-eval-area').style.display = 'block';
                document.getElementById('teacher-eval-buttons').style.display = 'flex';
                document.getElementById('game-title').innerHTML = `<span style="padding:10px 30px; border-radius:50px; display:inline-block; border:2px solid var(--primary); background: rgba(0,0,0,0.05); font-size:1.8rem; font-weight:bold;">${t(GameState.currentData.questionTitle)}</span>`;
                document.getElementById('game-question').innerHTML = GameState.currentData.questionBody;
                let linkWordSurahFallbackAnsHTML = `${t("الإجابة الصحيحة:")}<br>`;
                if(GameState.currentData.ayahObj && GameState.currentData.ayahObj.surahName) linkWordSurahFallbackAnsHTML += `<div style="color:var(--secondary); font-size:1.4rem; font-weight:bold; margin: 10px 0;">${tf('game_ref_label', { name: surahNameLocal(GameState.currentData.ayahObj.surahName), n: GameState.currentData.ayahObj.numberInSurah })}</div>`;
                linkWordSurahFallbackAnsHTML += `<span class="quran-text">﴿\u00A0${GameState.currentData.fullAnswer}\u00A0﴾</span>`;
                document.getElementById('game-answer').innerHTML = linkWordSurahFallbackAnsHTML;
            }
        } else if (type === 'visual_memory') {
            GameState.currentData = await retryGen(() => AppState.quranEngine.generateVisualMemoryGame(activePool, chunkIndex, totalChunks));
            if(!GameState.currentData) GameState.currentData = await retryGen(() => AppState.quranEngine.generateCatchGame(activePool, GameState.config.isJuzMode, -1, 1));
            if(GameState.currentData && GameState.currentData.type === 'visual_memory') document.body.dataset.gameQ = 'visual_memory';
            
            document.getElementById('teacher-eval-area').style.display = 'block'; 
            document.getElementById('teacher-eval-buttons').style.display = 'flex'; 
            document.getElementById('show-ans-btn').style.display = 'inline-block';
            
            document.getElementById('game-title').innerHTML = `<span style="padding:10px 30px; border-radius:50px; display:inline-block; border:2px solid var(--primary); background: rgba(0,0,0,0.05); font-size:1.8rem; font-weight:bold;">${t(GameState.currentData.questionTitle)}</span>`;
            document.getElementById('game-question').innerHTML = GameState.currentData.questionBody;
            // 🌟 [جديد] إجابة التسميع تحمل آيات بين ﴿ ﴾ مباشرة بلا .quran-text — نلفّها في .dh-verse
            // (css/global.css) فقط إذا احتوت أقواساً، حتى لا تنقلب في الإنجليزية، وبقية الأنواع كما هي.
            { const _fa = GameState.currentData.fullAnswer;
              document.getElementById('game-answer').innerHTML = (typeof _fa === 'string' && _fa.includes('\uFD3F')) ? `<div class="dh-verse">${_fa}</div>` : _fa; }
        } else if (type === 'link_ends') {
            // 🌟 [جديد] لعبة "اربط أول الآية بآخرها" — تفاعلية بالكامل بلا أزرار تقييم يدوية،
            // بنفس فلسفة لعبة "رتب الآيات" أعلاه (تصحيح تلقائي عند اكتمال الربط الصحيح) 🌟
            // 🌟 [إصلاح] كان هنا خطأ نسخ-ولصق: مُرِّر `GameState.config.isJuzMode` كمعامل ثانٍ
            // (المفروض يكون `isKids`) بدل `false` — نفس اسم المعامل بالترتيب المستخدم في استدعاءات
            // أخرى (generateCatchGame/generateNextAyahGame...) لكن بمعنى مختلف تمامًا هناك (وضع
            // الجزء)، لا علاقة له بكون الشاشة أطفال أو كبار. هذا الملف شاشة الكبار حصرًا، فالقيمة
            // الصحيحة هنا ثابتة دائمًا `false`. الأثر العملي للخطأ: عند اختيار وضع "الجزء" تحديدًا
            // (حيث isJuzMode=true)، كانت الدالة تُرجع type:'kids_link_ends' وعنواناً بصياغة الأطفال
            // ("يا بطل")، فيفشل الشرط `GameState.currentData.type === 'link_ends'` أدناه ويقع
            // الاختيار خطأً على فرع الـfallback (الذي يعرض `questionBody` غير موجود أصلاً في بيانات
            // لعبة الربط، فيظهر النص الحرفي "undefined" مع أزرار تقييم يدوية لا يجب ظهورها) 🌟
            GameState.currentData = await retryGen(() => AppState.quranEngine.generateLinkGame(activePool, false, chunkIndex, totalChunks));
            if(!GameState.currentData) GameState.currentData = await retryGen(() => AppState.quranEngine.generateCatchGame(activePool, GameState.config.isJuzMode, -1, 1));

            if (GameState.currentData.type === 'link_ends') {
                GameState.currentData.matchedPairs = [];
                GameState.currentData.selectedStart = null;
                GameState.currentData.locked = false;
                document.getElementById('interactive-link-area').style.display = 'block';
                // 🌟 [جديد] نعيد نص التعليمة وعنواني العمودين لأصلهما الخاص بـ"اربط أول الآية
                // بآخرها" — لازم الآن بعد أن أصبحت الحاوية مشتركة مع لعبة "اربط الكلمة بالسورة"
                // الجديدة (order_surahs سابقاً) التي تُغيّر هذه النصوص مؤقتاً أثناء عرضها 🌟
                let instEl = document.querySelector('#interactive-link-area p[data-i18n="link_inst"]');
                if (instEl) instEl.innerHTML = t('link_inst');
                let startsTitleEl = document.querySelector('#interactive-link-area h3[data-i18n="link_starts_title"]');
                if (startsTitleEl) startsTitleEl.innerHTML = t('link_starts_title');
                let endsTitleEl = document.querySelector('#interactive-link-area h3[data-i18n="link_ends_title"]');
                if (endsTitleEl) endsTitleEl.innerHTML = t('link_ends_title');
                buildLinkGameUI();
                document.getElementById('game-title').innerHTML = `<span style="padding:10px 30px; border-radius:50px; display:inline-block; border:2px solid var(--primary); background: rgba(0,0,0,0.05); font-size:1.8rem; font-weight:bold;">${t(GameState.currentData.questionTitle)}</span>`;
            } else {
                // 🌟 [جديد] فallback نادر جداً: لو تعذّر توليد لعبة الربط (نطاق الآيات المتاح
                // صغير جداً بلا آيتين صالحتين على الأقل) نعرض سؤال "صيد الآية" العادي بديلاً
                // عنها بدل تعطّل الشاشة، بنفس أسلوب فallback لعبة "رتب الآيات" أعلاه 🌟
                document.getElementById('teacher-eval-area').style.display = 'block';
                document.getElementById('teacher-eval-buttons').style.display = 'flex';
                document.getElementById('game-title').innerHTML = `<span style="padding:10px 30px; border-radius:50px; display:inline-block; border:2px solid var(--primary); background: rgba(0,0,0,0.05); font-size:1.8rem; font-weight:bold;">${t(GameState.currentData.questionTitle)}</span>`;
                document.getElementById('game-question').innerHTML = GameState.currentData.questionBody;
                let linkFallbackAnsHTML = `${t("الإجابة الصحيحة:")}<br>`;
                if(GameState.currentData.ayahObj && GameState.currentData.ayahObj.surahName) linkFallbackAnsHTML += `<div style="color:var(--secondary); font-size:1.4rem; font-weight:bold; margin: 10px 0;">${tf('game_ref_label', { name: surahNameLocal(GameState.currentData.ayahObj.surahName), n: GameState.currentData.ayahObj.numberInSurah })}</div>`;
                linkFallbackAnsHTML += `<span class="quran-text">﴿\u00A0${GameState.currentData.fullAnswer}\u00A0﴾</span>`;
                document.getElementById('game-answer').innerHTML = linkFallbackAnsHTML;
            }
        } else {
            document.getElementById('teacher-eval-area').style.display = 'block'; 
            document.getElementById('teacher-eval-buttons').style.display = 'flex';
            
            if(type === 'catch') GameState.currentData = await retryGen(() => AppState.quranEngine.generateCatchGame(activePool, GameState.config.isJuzMode, chunkIndex, totalChunks));
            else if(type === 'next') GameState.currentData = await retryGen(() => AppState.quranEngine.generateNextAyahGame(activePool, GameState.config.isJuzMode, chunkIndex, totalChunks));
            else if(type === 'previous') { GameState.currentData = await retryGen(() => AppState.quranEngine.generatePreviousAyahGame(activePool, GameState.config.isJuzMode, chunkIndex, totalChunks)); if(GameState.currentData && GameState.currentData.hint !== t('qe_none')) document.getElementById('hint-btn').style.display = 'inline-block'; }
            else if(type === 'between') GameState.currentData = await retryGen(() => AppState.quranEngine.generateBetweenGame(activePool, GameState.config.isJuzMode, chunkIndex, totalChunks));
            else if(type === 'guess_surah') GameState.currentData = await retryGen(() => AppState.quranEngine.generateGuessSurahGame(activePool, chunkIndex, totalChunks));
            else if(type === 'recite') GameState.currentData = await retryGen(() => AppState.quranEngine.generateReciteGame(activePool, GameState.config.isJuzMode, false, chunkIndex, totalChunks));
            else if(type === 'mistake') GameState.currentData = await retryGen(() => AppState.quranEngine.generateMistakeGame(activePool, GameState.config.isJuzMode, chunkIndex, totalChunks));
            else if(type === 'complete_ayah') GameState.currentData = await retryGen(() => AppState.quranEngine.generateCompleteAyahGame(activePool, chunkIndex, totalChunks)); 

            if(!GameState.currentData) GameState.currentData = await retryGen(() => AppState.quranEngine.generateCatchGame(activePool, GameState.config.isJuzMode, -1, 1));
            
            document.getElementById('game-title').innerHTML = `<span style="padding:10px 30px; border-radius:50px; display:inline-block; border:2px solid var(--primary); background: rgba(0,0,0,0.05); font-size:1.8rem; font-weight:bold;">${t(GameState.currentData.questionTitle)}</span>`; 
            document.getElementById('game-question').innerHTML = GameState.currentData.questionBody; 
            
            let ansHTML = `${t("الإجابة الصحيحة:")}<br>`;
            if(GameState.currentData.ayahObj && GameState.currentData.ayahObj.surahName) {
                if(GameState.currentData.type === 'recite') ansHTML += `<div style="color:var(--secondary); font-size:1.4rem; font-weight:bold; margin: 10px 0;">( ${localizeGenerated(GameState.currentData.reportText).replace(/^(تسميع من |تسميع |Reciting from |Reciting )/, '')} )</div>`;
                else ansHTML += `<div style="color:var(--secondary); font-size:1.4rem; font-weight:bold; margin: 10px 0;">${tf('game_ref_label', { name: surahNameLocal(GameState.currentData.ayahObj.surahName), n: GameState.currentData.ayahObj.numberInSurah })}</div>`;
            }
            ansHTML += `<span class="quran-text">﴿\u00A0${GameState.currentData.fullAnswer}\u00A0﴾</span>`;
            
            if(GameState.currentData.correctAns && GameState.currentData.type === 'complete_ayah') {
                ansHTML += `<br><br><span style="color:var(--danger)">${t("الكلمات المفقودة:")} ${GameState.currentData.correctAns}</span>`;
            }
            
            document.getElementById('game-answer').innerHTML = ansHTML;
        }
    } catch (err) { console.error(err); GameState.currentIndex++; playNextMission(); }
}

function showHint() { 
    GameState.hintUsed = true; 
    document.getElementById('hint-text').innerText = `﴿\u00A0${GameState.currentData.hint}\u00A0﴾`; 
    document.getElementById('hint-text').style.display = 'block'; 
    document.getElementById('hint-btn').style.display = 'none'; 
}

function toggleAnswer() { 
    const ansDiv = document.getElementById('game-answer'); 
    const btn = document.getElementById('show-ans-btn'); 
    if(ansDiv.style.display === 'none' || ansDiv.style.display === '') { 
        ansDiv.style.display = 'block'; 
        // 🌟 تطبيق الترجمة هنا 🌟
        btn.innerHTML = t('hide_ans'); 
        document.querySelectorAll('.visual-blur-img').forEach(img => { img.style.filter = 'none'; });
    } else { 
        ansDiv.style.display = 'none'; 
        // 🌟 تطبيق الترجمة هنا 🌟
        btn.innerHTML = t('show_ans_match'); 
    } 
}

function saveTempError() {
    let errorTypes = []; 
    document.querySelectorAll('#error-modal input[type="checkbox"]:checked').forEach(cb => errorTypes.push(cb.value)); 
    let customNote = document.getElementById('custom-note').value.trim();
    if(customNote) errorTypes.push(tfAr('gen_note_prefix', { text: customNote }));
    // 🌟 [جديد] موضع الخطأ بالتحديد (من آية ... إلى آية ...) لأسئلة التسميع — اختياري؛ يكفي
    // اختياره وحده كملاحظة. يُضاف كشريحة نصية ضمن errorTypes فيظهر أيضاً في التقرير وشاشة العلاج 🌟
    let rangeSel = readReciteRangeSelection();
    if(errorTypes.length === 0 && !rangeSel) return alert(t("حدد نوع الملاحظة أو اكتب ملاحظة أولاً!"));
    if(rangeSel) {
        if(!GameState.tempRanges) GameState.tempRanges = [];
        GameState.tempRanges.push(rangeSel);
        errorTypes.push(reciteRangeChipText(rangeSel));
    }
    GameState.tempErrors.push(...errorTypes);
    closeModal('error-modal'); 
    document.getElementById('temp-errors-container').style.display = 'block';
    const listDiv = document.getElementById('temp-errors-list');
    listDiv.innerHTML = GameState.tempErrors.map(e => `<span style="background:#fecaca; color:#7f1d1d; padding:4px 10px; border-radius:15px; font-size:1rem;">❌ ${e}</span>`).join('');
    document.getElementById('btn-submit-all-errors').style.display = 'block';
    playErrorSound();
}

function submitAllErrors() {
    if(GameState.tempErrors.length === 0) return;
    recordAnswer(false, GameState.tempErrors);
}

async function recordAnswer(isCorrect, errorTypes = []) {
    // 🌟 [إصلاح فحص الأزرار] حارس ضد الضغط المزدوج/السريع (خصوصًا على اللمس): كل سؤال
    // يُنشأ له كائن currentData جديد، فنعلّم الكائن الحالي بأنه أُجيب عليه، وأي استدعاء ثانٍ
    // لنفس السؤال يُتجاهل بدل أن يُسجَّل نتيجتين ويقفز سؤالين 🌟
    if (GameState.currentData && GameState.currentData.__answered) return;
    if (GameState.currentData) GameState.currentData.__answered = true;
    let timeTaken = GameState.currentQuestionStartTime ? (Date.now() - GameState.currentQuestionStartTime) / 1000 : 0;
    let typeLabel = GameState.isWeaknessMode ? t("تحدي علاج الخطأ") : t("نشاط");
    
    if(!GameState.isWeaknessMode) {
        let tType = GameState.currentData.type;
        // 🌟 نستخدم الدالة t() هنا، إن لم تكن في القاموس ستعيد النص العربي بأمان 🌟
        if(tType==='catch') typeLabel= t("🏹 صيد الآية"); 
        // 🌟 [تصحيح] اتجاه السهمين عُكِس ليوافق اتجاه القراءة العربية (RTL): "ماذا بعدها" ⬅️ و"ماذا قبلها" ➡️ 🌟
        else if(tType==='next') typeLabel= t("⬅️ ماذا بعدها؟"); 
        else if(tType==='previous') typeLabel= t("➡️ ماذا قبلها؟"); 
        else if(tType==='order') typeLabel= t("🔀 رتب الآيات");
        // 🌟 [قديم] تصنيف لعبة "رتب السور" السابقة — لم تعد هذه اللعبة تُستخدم في أي جولة جديدة
        // (استُبدلت بـ'link_word_surah' أدناه)، لكن أبقينا هذا السطر بلا حذف احترازًا 🌟
        else if(tType==='order_surahs') typeLabel= t("📚 رتب السور");
        else if(tType==='between') typeLabel= t("↔️ الآية بين آيتين");
        else if(tType==='guess_surah') typeLabel= t("🔍 خمن السورة");
        else if(tType==='recite') typeLabel= t("🎙️ تسميع مقطع");
        else if(tType==='mistake') typeLabel= t("🔍 اكتشف الخطأ");
        else if(tType==='complete_ayah') typeLabel= t("🧩 أكمل الآية");
        else if(tType==='visual_memory') typeLabel= t("📖 الذاكرة البصرية");
        // 🌟 [جديد] تصنيف لعبة "اربط أول الآية بآخرها" في التقرير وسجل التاريخ 🌟
        else if(tType==='link_ends') typeLabel= t("🔗 ربط الآيات");
        // 🌟 [إعادة تصميم] تصنيف لعبة "اربط الكلمة بالسورة" الجديدة (محل "رتب السور") 🌟
        else if(tType==='link_word_surah') typeLabel= t("🔗📖 اربط الكلمة بالسورة");
    }
    
    let ayahNum = GameState.currentData.ayahObj ? GameState.currentData.ayahObj.numberInSurah : (GameState.currentData.original ? GameState.currentData.original[0].numberInSurah : 0);
    let surahName = GameState.currentData.ayahObj ? GameState.currentData.ayahObj.surahName : (GameState.currentData.surahName || "");
    let reportText = GameState.currentData.reportText;

    // 🌟 [جديد] لو سُجّل خطأ في سؤال تسميع مع تحديد موضعه (من آية ... إلى آية ...)، نبني بيانات
    // الموضع هنا (قبل تصفير tempRanges أدناه): نص التقرير يتضمن الموضع، ورقم الآية = أول آية
    // في الموضع، ويُعاد لاحقاً بناء نص السؤال وإجابته في شاشة "علاج الخطأ السابق" ليخصّا
    // الموضع فقط بدل السورة كلها. بلا موضع (الاختياري) يبقى السلوك القديم كما هو تماماً 🌟
    let reciteRec = null;
    if (!GameState.isWeaknessMode && !isCorrect && Array.isArray(GameState.tempRanges) && GameState.tempRanges.length && Array.isArray(GameState.currentData.reciteAyahs)) {
        reciteRec = buildReciteRangeRecord(GameState.currentData, GameState.tempRanges);
        if (reciteRec) { reportText = reciteRec.reportText; ayahNum = reciteRec.num; }
    }

    GameState.reportDetails.push({ label: typeLabel, num: ayahNum, surahName: surahName, text: reportText, isCorrect: isCorrect, errors: errorTypes, usedHint: GameState.hintUsed, timeTaken: timeTaken, orderAttempts: GameState.orderAttempts });

    // 🌟 تتبّع عدد الأسئلة المُجابة وعدد الإجابات الصحيحة لكل طالب — أساس حساب نسبة
    // الإتقان الحقيقية (0-100%) في بطاقة "نظرة سريعة" بالشاشة الرئيسية. نحسب كل سؤال
    // هنا (بما فيها إعادة أسئلة علاج الأخطاء) كمحاولة تقييم حقيقية. الفحص بـ (|| 0)
    // ضروري لأي طالب قديم/مستورَد من نسخة سابقة لا يملك هذين الحقلين بعد.
    AppState.currentStudent.totalAttempts = (AppState.currentStudent.totalAttempts || 0) + 1;
    if (isCorrect) AppState.currentStudent.totalCorrect = (AppState.currentStudent.totalCorrect || 0) + 1;

    // 🌟 [جديد] بناء سجل الخطأ في دالة واحدة ليُستعمل في مسارين: (1) إجابة خاطئة صريحة (كما كان)،
    // (2) إجابة صحيحة لكن بترتيب خاطئ سابق أو بتلميح (origin = 'reorder' | 'hint'). الحقول واحدة
    // في الحالتين فتعمل شاشة العلاج والأرشيف والتقرير بلا أي تعديل. origin حقل اختياري جديد،
    // وغيابه (كل السجلات القديمة) يعني خطأ صريحًا كما كان 🌟
    const buildErrorObj = (errs, origin) => {
            let cd = GameState.currentData;
            let linkRec = buildLinkQuestionRecord(cd);
            const errorObj = {
                text: reportText,
                num: ayahNum,
                surahName: surahName,
                errorTypes: errs.join(" | "),
                errorTypesList: errs,
                questionType: cd.type || null,
                questionTypeLabel: typeLabel,
                questionTitle: cd.questionTitle || null,
                questionBody: reciteRec ? reciteRec.questionBody : (linkRec ? linkRec.questionBody : ((cd.type !== 'order' && cd.questionBody) ? cd.questionBody : null)),
                fullAnswer: reciteRec ? reciteRec.fullAnswer : (linkRec ? linkRec.fullAnswer : (cd.fullAnswer || null)),
                reciteRanges: reciteRec ? reciteRec.ranges : null,
                linkPairs: linkRec ? linkRec.linkPairs : null,
                correctAns: cd.correctAns || null,
                hint: cd.hint || null,
                orderAyahs: (cd.type === 'order' && Array.isArray(cd.original)) ? cd.original.map(a => ({ text: a.text, numberInSurah: a.numberInSurah, surahName: a.surahName })) : null,
                sourceSection: 'adult',
                dateRecorded: new Date().toISOString()
            };
            if (origin) errorObj.origin = origin;
            return errorObj;
    };

    if(GameState.isWeaknessMode && isCorrect) {
        // 🌟 أرشفة بدل الحذف: بدل ما نمسح الخطأ المصحَّح نهائياً ونفقد كل تفاصيله،
        // ننقله إلى student.resolvedWeaknesses بنفس بياناته الكاملة (نوع السؤال،
        // نصه، الأخطاء المسجَّلة...) + تاريخ الحل — يبقى سجل تاريخي كامل لكل أخطاء
        // الطالب حتى يوم الاختبار، حتى المصحَّح منها، بدل ما يختفي أثره نهائياً 🌟
        // 🌟 المقارنة بقت عبر normalizeForCompare (تجريد كامل من التشكيل) بدل تطابق حرفي
        // للنص المنسّق بالكامل، حتى تفضل شغالة صح حتى لو نقطة الضعف اتحفظت قديماً بشكل تشكيل
        // مختلف شوية عن النص المُولَّد حالياً (زي شكل علامة السكون)
        // 🌟 [تعديل] التثبيت بمراجعتين: الأرشفة صارت تحدث عند الإجابة الصحيحة "الثانية" في يوم
        // مختلف فقط (راجع applyFixCorrectAnswer في components/fixErrorsPrompt.js)؛ أول إجابة
        // صحيحة تعلّم الخطأ وتُبقيه في القائمة لمراجعته في المرة القادمة 🌟
        applyFixCorrectAnswer(AppState.currentStudent, w => normalizeForCompare(w.text) === normalizeForCompare(reportText));
        await AppState.studentManager.updateStudent(AppState.currentStudent);
    }
    
    if(isCorrect) { 
        // 🌟 [جديد] الإجابة الصحيحة بعد ترتيب خاطئ سابق أو باستخدام تلميح تُسجَّل ضمن الأخطاء التي تُعالَج
        // (بقرار المعلم). ⚠️ افتراض: أي محاولة ترتيب خاطئة واحدة تكفي (orderAttempts >= 1)، وهي نفس
        // عتبة حالة 'reorder' في التقرير. التسجيل لا يجري في وضع العلاج نفسه، ولا يتكرر لو الخطأ مسجَّل أصلًا 🌟
        if (!GameState.isWeaknessMode && (GameState.orderAttempts >= 1 || GameState.hintUsed)) {
            const origin = (GameState.orderAttempts >= 1 ? 'reorder' : 'hint');
            const errs = [t(origin === 'reorder' ? 'weak_origin_reorder' : 'weak_origin_hint')];
            if(!AppState.currentStudent.weaknesses) AppState.currentStudent.weaknesses = [];
            if(!AppState.currentStudent.weaknesses.some(w => normalizeForCompare(w.text) === normalizeForCompare(reportText))) AppState.currentStudent.weaknesses.push(buildErrorObj(errs, origin));
        }
        playSuccessSound();
        let earnedScore = 10;
        if (GameState.orderAttempts === 1) earnedScore = 8;
        else if (GameState.orderAttempts >= 2) earnedScore = 6;
        else if (GameState.hintUsed) earnedScore = 8;
        
        AppState.currentStudent.totalScore += earnedScore; 
        GameState.consecutiveCorrect++;
        if(GameState.consecutiveCorrect === 2) { setTimeout(() => { showToastEncouragement(); }, 500); GameState.consecutiveCorrect = 0; }
        await AppState.studentManager.updateStudent(AppState.currentStudent); 
        GameState.currentIndex++; 
        setTimeout(playNextMission, 1000); 
    } else { 
        GameState.tempErrors = []; 
        GameState.tempRanges = [];
        GameState.consecutiveCorrect = 0; 
        if(!GameState.isWeaknessMode) {
            // 🌟 نخزّن هنا كل تفاصيل السؤال الأصلي كما ظهر للطالب أول مرة (نوعه بعنوانه
            // الكامل، نص السؤال بصيغته الكاملة، الإجابة الصحيحة...) وليس نص الآية
            // المجرد فقط كما كان سابقاً — حتى تظهر بنفس صيغتها الأصلية يوم "علاج الخطأ
            // السابق" ويوم الاختبار، ويتضح للمعلّم نوع السؤال (أكمل الآية / التالية /
            // السابقة...) الذي أخطأ فيه الطالب فعلاً وليس فقط نص الآية المجرد. سؤال
            // "رتب الآيات" استثناء لأنه سؤال تفاعلي بلا questionBody جاهز، فنخزّن آياته
            // بدلاً من ذلك (orderAyahs) 🌟
            let errorObj = buildErrorObj(errorTypes);
            if(!AppState.currentStudent.weaknesses) AppState.currentStudent.weaknesses = [];
            if(!AppState.currentStudent.weaknesses.some(w => normalizeForCompare(w.text) === normalizeForCompare(reportText))) AppState.currentStudent.weaknesses.push(errorObj);
            await AppState.studentManager.updateStudent(AppState.currentStudent);
        } else if (applyFixWrongAnswer(AppState.currentStudent, w => normalizeForCompare(w.text) === normalizeForCompare(reportText))) {
            // 🌟 [جديد] إجابة خاطئة في مراجعة خطأ سبق أن أُجيب صح مرة: تصفير التثبيت (يحتاج
            // إجابتين صحيحتين من جديد) ثم حفظ السجل 🌟
            await AppState.studentManager.updateStudent(AppState.currentStudent);
        }
        GameState.currentIndex++; 
        setTimeout(playNextMission, 1000); 
    }
}

// 🌟 [جديد] تصغير خط الآيات الطويلة في لعبة "رتب الآيات" بدل تركها دايمًا 2.2rem — الآية
// الطويلة كانت بتخلي عمود كامل يمتد لعشر أسطر فيضطر الطالب يعمل سكرول للصفحة كلها بدل
// سكرول محلي بسيط، وده اللي طلب المعلم حله صراحة. الآيات القصيرة ما بتتأثرش إطلاقًا
// (بترجع '' فترجع الكلاس الافتراضي .order-item/.order-slot.filled بحجمه الأصلي).
// ⚠️ افتراض صريح: حدود الطول (70/140 حرفًا شاملة التشكيل) اختيار عملي مبدئي، راجع
// css/global.css لتفاصيل قاعدة order-text-long/xlong المرتبطة بيها 🌟
function getOrderTextSizeClass(text) {
    const len = (text || '').length;
    if (len > 140) return ' order-text-xlong';
    if (len > 70) return ' order-text-long';
    return '';
}

// 🌟 [جديد] خلط عشوائي (Fisher-Yates) لعناصر "رتب الآيات" في وضع علاج الخطأ، مع إعادة المحاولة
// حتى يختلف الترتيب عن الصحيح (حتى لا يظهر السؤال محلولًا صدفة). لو العنصران فقط أو تعذّر
// الاختلاف بعد عدة محاولات نعكس الترتيب كحل أخير مضمون 🌟
function shuffleDifferentFromOriginal(arr, keyFn) {
    const sameAsOrig = (s) => s.every((x, i) => keyFn(x) === keyFn(arr[i]));
    for (let attempt = 0; attempt < 20; attempt++) {
        const s = arr.slice();
        for (let i = s.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [s[i], s[j]] = [s[j], s[i]];
        }
        if (!sameAsOrig(s)) return s;
    }
    return arr.slice().reverse();
}

function buildOrderGameUI() {
    const shufDiv = document.getElementById('order-shuffled');
    const slotDiv = document.getElementById('order-slots');
    shufDiv.innerHTML = ""; slotDiv.innerHTML = "";

    GameState.currentData.shuffled.forEach((ayah) => {
        if (!GameState.currentData.studentAnswer.some(a => a.numberInSurah === ayah.numberInSurah)) {
            let item = document.createElement('div');
            item.className = 'order-item quran-text' + getOrderTextSizeClass(ayah.text);
            item.innerText = ayah.text;
            item.onclick = () => { 
                GameState.currentData.studentAnswer.push(ayah); 
                buildOrderGameUI(); 
                if(GameState.currentData.studentAnswer.length === GameState.currentData.original.length) { 
                    let isCorrect = true; 
                    for(let i=0; i<GameState.currentData.original.length; i++) { 
                        if(GameState.currentData.studentAnswer[i].numberInSurah !== GameState.currentData.original[i].numberInSurah) isCorrect = false; 
                    } 
                    if(isCorrect) { recordAnswer(true); } 
                    else { 
                        playErrorSound(); GameState.orderAttempts++;
                        setTimeout(() => { GameState.currentData.studentAnswer = []; buildOrderGameUI(); }, 800);
                    } 
                } 
            }; 
            shufDiv.appendChild(item);
        }
    });
    
    for(let i=0; i < GameState.currentData.original.length; i++) {
        let slot = document.createElement('div');
        if (GameState.currentData.studentAnswer[i]) {
            slot.className = 'order-slot filled quran-text' + getOrderTextSizeClass(GameState.currentData.studentAnswer[i].text);
            slot.innerText = GameState.currentData.studentAnswer[i].text;
            slot.onclick = () => { GameState.currentData.studentAnswer.splice(i, 1); buildOrderGameUI(); }; 
        } else {
            slot.className = 'order-slot'; slot.innerHTML = `<span style="color:#cbd5e1;">${t("مكان فارغ...")}</span>`;
        }
        slotDiv.appendChild(slot);
    }
}

// 🌟 [جديد] بناء واجهة لعبة "اربط أول الآية بآخرها" — تعتمد على النقر فقط (بلا سحب) بنفس فلسفة
// buildOrderGameUI أعلاه: يضغط المعلم/الطالب على بداية آية من العمود الأول (تُحدَّد بإطار ذهبي)،
// ثم على النهاية المتوقّعة من العمود الثاني. لو الربط صحيح تتحوّل الآيتان لحالة "مطابَقة" دائمة
// (لون أخضر)، ولو خطأ تظهر وميضة حمراء قصيرة على العنصرين معاً ثم يُلغى التحديد تلقائياً.
// GameState.orderAttempts (المستخدم أصلاً في تصحيح لعبة "رتب الآيات") يُستخدم هنا أيضاً لحساب
// عدد المحاولات الخاطئة — فتنطبق عليه بالضبط نفس معادلة الدرجة الموجودة في recordAnswer/
// computeQuestionScoreForHistory بلا أي تعديل إضافي.
function buildLinkGameUI() {
    const startsDiv = document.getElementById('link-starts-col');
    const endsDiv = document.getElementById('link-ends-col');
    if (!startsDiv || !endsDiv) return;
    startsDiv.innerHTML = ""; endsDiv.innerHTML = "";
    const data = GameState.currentData;
    // 🌟 [جديد] عدد ألوان الأزواج المتاحة في CSS (.pair-0 إلى .pair-5) - لو عدد الأزواج في
    // السؤال أكبر من العدد ده (نادر جداً) بيتكرر الترتيب (modulo) بدل ما تتوقف الميزة 🌟
    const PAIR_COLORS_COUNT = 6;

    data.starts.forEach((item, idx) => {
        let isMatched = data.matchedPairs.includes(item.id);
        let el = document.createElement('div');
        let cls = 'link-item quran-text';
        // 🌟 [جديد] كل زوج مطابَق بيتلوّن بلون مميز ثابت حسب ترتيبه الأصلي في data.starts (idx)
        // - بدل اللون الأخضر الموحّد لكل الأزواج سابقاً - عشان الطالب/المعلم يقدر يتابع بصريًا
        // كل ربط لوحده. correct-pop بتُضاف مرة واحدة فقط لحظة المطابقة (راجع data.justMatchedId
        // تحت) مش في كل إعادة رسم، حتى ما تتكرر حركة الـpop لكل الأزواج القديمة كل مرة 🌟
        if (isMatched) {
            cls += ' matched pair-' + (idx % PAIR_COLORS_COUNT);
            if (data.justMatchedId === item.id) cls += ' correct-pop';
        }
        if (data.selectedStart === idx) cls += ' selected';
        el.className = cls;
        el.innerText = item.text;
        if (!isMatched && !data.locked) {
            el.onclick = () => {
                data.selectedStart = (data.selectedStart === idx) ? null : idx;
                buildLinkGameUI();
            };
        }
        startsDiv.appendChild(el);
    });

    data.ends.forEach((item) => {
        let isMatched = data.matchedPairs.includes(item.id);
        let el = document.createElement('div');
        let cls = 'link-item quran-text';
        if (isMatched) {
            // 🌟 [جديد] نفس فكرة تلوين الزوج أعلاه، لكن لازم نحسب رقم الزوج من ترتيبه في
            // data.starts (مش ترتيبه هنا في data.ends) لأن كل عمود يُخلَط عشوائياً لوحده
            // باستقلال عن الآخر (راجع generateLinkGame في quranEngine.js)، فترتيب العنصر هنا
            // مش بالضرورة نفس ترتيب زوجه في العمود الأول 🌟
            let pairIdx = data.starts.findIndex(s => s.id === item.id);
            cls += ' matched pair-' + (pairIdx % PAIR_COLORS_COUNT);
            if (data.justMatchedId === item.id) cls += ' correct-pop';
        }
        el.className = cls;
        el.innerText = item.text;
        if (!isMatched && !data.locked) {
            el.onclick = () => {
                if (data.selectedStart === null) return;
                let startItem = data.starts[data.selectedStart];
                if (startItem.id === item.id) {
                    data.matchedPairs.push(item.id);
                    data.selectedStart = null;
                    // 🌟 [جديد] نعلّم الزوج اللي اتطابق حالاً بس، عشان حركة correct-pop تشتغل
                    // مرة واحدة له فقط في الرسم الجاي، ثم نصفّر العلامة فوراً بعد الرسم حتى ما
                    // تتكرر الحركة لنفس الزوج تاني في أي إعادة رسم لاحقة 🌟
                    data.justMatchedId = item.id;
                    // 🌟 [جديد] صوت تأكيد فوري لكل مطابقة صحيحة - افتراض صريح: إلا آخر زوج في
                    // السؤال، لأن recordAnswer أدناه هيشغّل صوت النجاح العام تلقائياً بعد 400ms
                    // فيبقى صوتان متتاليان لنفس اللحظة بلا فايدة حقيقية 🌟
                    if (data.matchedPairs.length < data.starts.length) playSuccessSound();
                    buildLinkGameUI();
                    data.justMatchedId = null;
                    if (data.matchedPairs.length === data.starts.length) setTimeout(() => recordAnswer(true), 400);
                } else {
                    playErrorSound();
                    GameState.orderAttempts++;
                    data.locked = true;
                    el.classList.add('wrong-flash');
                    startsDiv.children[data.selectedStart].classList.add('wrong-flash');
                    setTimeout(() => { data.locked = false; data.selectedStart = null; buildLinkGameUI(); }, 700);
                }
            };
        }
        endsDiv.appendChild(el);
    });
}