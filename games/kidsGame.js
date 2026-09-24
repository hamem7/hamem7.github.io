// games/kidsGame.js
// 🌟 استيراد الدالة السحرية للترجمة 🌟
import { AppState, loadDashboardScreen, t } from '../core/app.js';
import { loadScreen } from '../core/navigation.js';
import { openModal, closeModal, showToastEncouragement, triggerConfetti } from '../components/ui.js';
import { openReportScreen } from '../reports/report.js';
// 🌟 [جديد] لمقارنة نصوص "نقاط الضعف" المحفوظة سابقًا مع النص المُولَّد حالياً بأمان (راجع
// تعليق normalizeForCompare في quranEngine.js لتفاصيل السبب)
import { normalizeForCompare } from '../engine/quranEngine.js';
// 🌟 [جديد] نظام "تلميحات الأقسام عند أول دخول" — راجع components/sectionHint.js
import { showSectionHintOnce } from '../components/sectionHint.js';

export let GameState = { config: null, pool: [], queue: [], currentIndex: 0, currentData: null, reportDetails: [], timerInterval: null, timeRemaining: 0, sessionStartTime: null, consecutiveCorrect: 0, isWeaknessMode: false, evalRangeText: "", hintUsed: false, currentQuestionStartTime: null, tempErrors: [], orderAttempts: 0 };

const AudioContext = window.AudioContext || window.webkitAudioContext; let audioCtx;

function initAudio() { 
    if(!audioCtx) audioCtx = new AudioContext(); 
    if(audioCtx.state === 'suspended') audioCtx.resume(); 
}

function playSuccessSound() { 
    initAudio(); 
    const osc = audioCtx.createOscillator(); 
    const gain = audioCtx.createGain(); 
    osc.type = 'square'; 
    osc.frequency.setValueAtTime(600, audioCtx.currentTime); 
    osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.1); 
    osc.connect(gain); gain.connect(audioCtx.destination); 
    osc.start(); 
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.5); 
    osc.stop(audioCtx.currentTime + 0.5); 
}

// 🌟 [تعديل] كان الصوت هنا "sawtooth" بحدة كاملة (gain افتراضي = 1) بيطلع كـ"بزّة"
// حادة كل ما المعلم يسجّل ملاحظة، وده اللي كان بيخوّف الأطفال أثناء الجلسة المباشرة.
// استبدلناه بنغمة "sine" ناعمة وهادئة بحجم صوت منخفض (0.15 بدل 1.0) — إشارة محايدة
// بس مش مخيفة. صوت النجاح (playSuccessSound) والاستخدام في باقي الملف لم يتغيّرا 🌟
function playErrorSound() {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(392, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.35);
    osc.stop(audioCtx.currentTime + 0.35);
}

function getShuffledBag(gamesList) {
    let bag = [...gamesList];
    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }
    return bag;
}

export async function openKidsGameScreen(config, isWeakness = false) {
    // 🌟 [جديد] تنبيه ما قبل بدء اللعب — بلا أي ذكر لميزة "التلميح" عمداً (بطلب صريح من
    // المعلم)، لأنها غير موصولة فعلياً في ركن الأطفال بعد (راجع تعليق GameState.hintUsed
    // أسفل هذا الملف ومستند "تصميم نظام تلميحات الأقسام عند أول دخول المقترح")
    showSectionHintOnce('kids_game', {
        type: 'warning',
        titleKey: 'hint_kids_game_title',
        bodyKey: 'hint_kids_game_body',
        okKey: 'hint_kids_game_ok_btn'
    });

    GameState.config = config;
    GameState.isWeaknessMode = isWeakness; 
    GameState.reportDetails = []; 
    GameState.currentIndex = 0; 
    GameState.consecutiveCorrect = 0;
    
    try {
        if (isWeakness) {
            if(!AppState.currentStudent.weaknesses || AppState.currentStudent.weaknesses.length === 0) return alert(t("لا توجد أخطاء مسجلة!"));
            GameState.queue = AppState.currentStudent.weaknesses.map(w => ({type: 'weakness', chunkIndex: 0}));
            GameState.evalRangeText = t("جلسة علاج وتصحيح الأخطاء السابقة");
        } else {
            let qCount = config.qCount; 
            let ayahsPool = await AppState.quranEngine.getAyahsBySurahRange(config.kidsFrom, config.kidsTo);
            let sNameF = AppState.surahsData.find(s => s.number === config.kidsFrom).name; 
            let sNameT = AppState.surahsData.find(s => s.number === config.kidsTo).name; 
            GameState.evalRangeText = `${t("ألعاب أطفال (من سورة")} ${sNameF} ${t("إلى")} ${sNameT})`;
            
            if(ayahsPool.length === 0) return alert(t("عفواً، لا توجد آيات في النطاق المحدد!"));

            GameState.pool = ayahsPool;
            GameState.queue = [];

            // 🌟 [جديد] تحميل مسبق لصوت كل آيات نطاق هذا الطالب دفعة واحدة في الخلفية (بقرار
            // المعلم — راجع تعليق database/kidsAudioDB.js لتفاصيل الافتراضات) لصالح لعبة "استمع
            // وخمّن الآية" أدناه. بلا انتظار (لا نُجمّد بدء الألعاب بسببه — بنفس فلسفة
            // flushPendingHomeworkSync في core/app.js) وبصمت تام سواء نجح بالكامل، أو فشلت بعض
            // الآيات (تُعاد محاولتها تلقائيًا في المرة القادمة لهذا الطالب). لو استُدعِيت آية
            // ضمن اللعبة قبل اكتمال تحميلها هنا، هناك خط رجوع مباشر في playKidsListenAyahAudio
            // أدناه فلا يتأثر تدفق اللعبة بهذا التحميل أصلاً 🌟
            if (AppState.kidsAudioManager) {
                const ayahNumbersForAudio = ayahsPool.map(a => a.number);
                AppState.kidsAudioManager.prefetchAyahs(ayahNumbersForAudio)
                    .catch(err => console.error("خطأ أثناء التحميل المسبق لأصوات آيات ركن الأطفال:", err));
            }

            // 🌟 [تعديل] حذفنا 'kids_ayah_count' (سؤال "كم عدد آيات هذه السورة؟") بطلب المعلم
            // لأنها صعبة على الصغار، وأضفنا 'kids_link_ends' (لعبة اربط أول الآية بآخرها) بدلاً
            // منها 🌟
            // 🌟 [إعادة تصميم] استبدلنا 'kids_order_surahs' (لعبة "رتب السور" القديمة — كانت تطلب
            // ترتيب السور بترتيب المصحف الفاتحة←الناس، مربك لأن الأطفال غالباً يحفظون من آخر
            // السور للخلف) بـ'kids_link_word_surah' (لعبة "اربط الكلمة بالسورة" الجديدة — لا تحتاج
            // معرفة أي ترتيب، راجع تعليق generateLinkWordSurahGame في quranEngine.js)، ضمن نطاق
            // السور المختار للطفل نفسه بلا أي قيد إضافي، تمامًا كسابقتها 🌟
            // 🌟 [جديد] 'kids_listen_ayah' — لعبة "استمع وخمّن الآية" (راجع تعليق
            // generateKidsListenAyah في engine/kidsEngine.js لتفاصيل الفكرة والافتراضات
            // الكاملة). تعتمد على نفس ayahsPool بالضبط كباقي ألعاب هذه القائمة (بلا نطاق مستقل)
            let gamesList = ['kids_catch', 'kids_next', 'kids_word_order', 'kids_tf', 'kids_guess_surah', 'kids_recite', 'kids_start_surah', 'kids_extra_word', 'kids_previous', 'kids_link_ends', 'kids_link_word_surah', 'kids_listen_ayah'];
            let currentBag = getShuffledBag(gamesList);
            for(let i=0; i<qCount; i++) { 
                if (currentBag.length === 0) currentBag = getShuffledBag(gamesList);
                let selectedType = currentBag.pop();
                GameState.queue.push({ type: selectedType, chunkIndex: i }); 
            }
        }
        await loadScreen({ templateUrl: 'games/kidsGame.html', initFunction: initGameUI });
    } catch (err) { alert("حدث خطأ: " + err.message); }
}

function initGameUI() {
    window.recordKidsAnswer = recordKidsAnswer; 
    initAudio(); 
    
    GameState.sessionStartTime = new Date(); 
    
    const tracker = document.getElementById('questions-tracker'); 
    tracker.innerHTML = ''; 
    for(let i=0; i<GameState.queue.length; i++) { 
        let div = document.createElement('div'); 
        div.className = 'q-circle'; div.id = `trk-${i}`; div.innerText = i + 1; 
        tracker.appendChild(div); 
    }
    
    // 🌟 [جديد] نفس تأكيد الخروج المضاف في adultGame.js — تجنّب فقد تقييم الطفل كاملاً بضغطة
    // واحدة بالخطأ لو فيه إجابات مسجَّلة بالفعل. لو الجلسة لسه في أولها نخرج مباشرة بلا إزعاج
    document.getElementById('btn-exit-game')?.addEventListener('click', () => {
        if (GameState.reportDetails.length > 0 && !confirm(t('exit_game_confirm_msg'))) return;
        loadDashboardScreen();
    });

    // 🌟 زر "إظهار الإجابة للمطابقة" كان بلا أي مستمع نقر في نسخة الأطفال (بعكس نسخة
    // الكبار)، فكان لا يفعل شيئاً عند الضغط عليه — سواء في سؤال التسميع (kids_recite)
    // أو الآن في شاشة "علاج الخطأ السابق". أضفناه هنا بنفس منطق نسخة الكبار 🌟
    document.getElementById('show-ans-btn')?.addEventListener('click', toggleAnswer);

    document.getElementById('btn-record-wrong')?.addEventListener('click', () => {
        document.querySelectorAll('#error-modal input[type="checkbox"]').forEach(cb => cb.checked = false); 
        document.getElementById('custom-note').value = ''; 
        openModal('error-modal'); 
    });
    
    document.getElementById('btn-record-correct')?.addEventListener('click', () => {
        if(GameState.tempErrors.length > 0) {
            let confirmClear = confirm(t("لقد سجّلت ملاحظات مسبقاً. هل تريد إلغاءها واعتبار الإجابة صحيحة؟"));
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

// 🌟 نفس دالة نسخة الكبار (adultGame.js) — كانت غير موجودة هنا رغم أن زر إظهار
// الإجابة يُعرض أحياناً (سؤال التسميع)، لذلك أضفناها لتفعيل الزر فعلياً 🌟
function toggleAnswer() {
    const ansDiv = document.getElementById('game-answer');
    const btn = document.getElementById('show-ans-btn');
    if(ansDiv.style.display === 'none' || ansDiv.style.display === '') {
        ansDiv.style.display = 'block';
        btn.innerHTML = t('hide_ans');
    } else {
        ansDiv.style.display = 'none';
        btn.innerHTML = t('show_ans_match');
    }
}

// 🌟 [جديد] نفس معادلة احتساب درجة السؤال المستخدمة بالحرف في reports/report.js
// (computeQuestionScore) — مكررة عمدًا هنا (لا مستوردة من report.js)، بنفس أسباب
// التكرار الموضَّحة في games/adultGame.js (persistEvaluationToHistory).
function computeQuestionScoreForHistory(d) {
    if (!d.isCorrect) return 0;
    if (d.orderAttempts === 1) return 8;
    if (d.orderAttempts >= 2) return 6;
    if (d.usedHint) return 8;
    return 10;
}

// 🌟 [جديد] تسجيل تقييم "ركن الأطفال" الفردي في نفس سجل history_${studentId} — نسخة
// مطابقة تماماً لـ persistEvaluationToHistory في games/adultGame.js (راجع تعليقها هناك
// لكل تفاصيل السبب والافتراضات)، والفرق الوحيد هنا هو source: 'kids_game' بدل 'adult_game'
// لتمييز مصدر الجلسة عند عرضها لاحقاً في تقرير الإنجاز الشهري.
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
            date: new Date().toLocaleDateString('ar-EG'),
            range: GameState.evalRangeText || t('hist_eval_default_range'),
            score: scorePercent,
            source: 'kids_game',
            timestamp: Date.now()
        });
        localStorage.setItem(historyKey, JSON.stringify(historyArray));
    } catch (e) {
        console.error('تعذر تسجيل تقييم ركن الأطفال في السجل التاريخي:', e);
    }
}

async function playNextMission() {
    try {
        if(GameState.currentIndex >= GameState.queue.length) {
            updateTrackerUI();
            playSuccessSound();
            triggerConfetti();
            // 🌟 [جديد] تسجيل هذا التقييم في history_ قبل عرض التقرير — راجع تعليق
            // persistEvaluationToHistory أعلاه لتفاصيل السبب والافتراضات
            persistEvaluationToHistory();
            // 🌟 [إصلاح] نمرر GameState بتاع ركن الأطفال صراحة لـ openReportScreen، لأن
            // report.js لم يعد يستورد GameState من adultGame.js بشكل ثابت (كان هذا هو
            // سبب ظهور نسب تقييم خاطئة زي 154% في تقارير ألعاب الأطفال — كان التقرير
            // يقرأ GameState الفاضي بتاع adultGame.js بدل GameState الحقيقي هنا) 🌟
            return openReportScreen(GameState);
        }
        
        updateTrackerUI();
        GameState.hintUsed = false; 
        GameState.currentQuestionStartTime = Date.now();
        GameState.tempErrors = [];
        GameState.orderAttempts = 0;
        
        document.getElementById('temp-errors-container').style.display = 'none';
        document.getElementById('temp-errors-list').innerHTML = '';
        document.getElementById('btn-submit-all-errors').style.display = 'none';
        
        document.getElementById('in-game-student-info').style.display = 'flex'; 
        document.getElementById('in-game-name').innerText = AppState.currentStudent.name; 
        
        let avatarImg = document.getElementById('in-game-avatar');
        if (avatarImg) {
            avatarImg.src = AppState.currentStudent.avatar || 'assets/default.png'; 
            avatarImg.onerror = function() { 
                this.onerror = null; 
                this.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="%23cbd5e1"><circle cx="50" cy="50" r="50"/><path fill="%23fff" d="M50 55c-11 0-20-9-20-20s9-20 20-20 20 9 20 20-9 20-20 20zm0 5c15 0 30 10 30 25v5H20v-5c0-15 15-25 30-25z"/></svg>';
            };
        }
        
        document.getElementById('teacher-eval-buttons').style.display = 'none'; 
        document.getElementById('teacher-eval-area').style.display = 'none'; 
        document.getElementById('kids-word-order-area').style.display = 'none';
        // 🌟 [جديد] إخفاء منطقة لعبة "اربط بداية الآية بنهايتها" عند بداية كل سؤال جديد 🌟
        document.getElementById('kids-link-area').style.display = 'none';
        // 🌟 [جديد] إخفاء منطقة لعبة "رتب السور" عند بداية كل سؤال جديد 🌟
        document.getElementById('kids-order-surahs-area').style.display = 'none';
        document.getElementById('kids-mcq-area').style.display = 'none';
        // 🌟 [جديد] إعادة ضبط خطوتَي لعبة "استمع وخمّن الآية" (الآيات ثم السور) عند بداية كل
        // سؤال جديد — راجع تعليق generateKidsListenAyah و showKidsListenSurahStep أدناه 🌟
        document.getElementById('kids-listen-surah-area').style.display = 'none';
        document.getElementById('kids-options-container').style.display = '';
        document.getElementById('game-answer').style.display = 'none'; 
        document.getElementById('show-ans-btn').style.display = 'none'; 
        // 🌟 تطبيق الترجمة هنا 🌟
        document.getElementById('show-ans-btn').innerHTML = t('show_ans_match'); 
        document.getElementById('hint-btn').style.display = 'none'; 
        document.getElementById('hint-text').style.display = 'none';

        let queueItem = GameState.queue[GameState.currentIndex]; 
        let type = queueItem.type;
        let pool = GameState.pool; 
        let chunkIndex = queueItem.chunkIndex; 
        let totalChunks = GameState.config ? GameState.config.qCount : 1;
        
        let activePool = pool;
        if (type !== 'kids_word_order') {
            let filtered = pool.filter(a => {
                let plainText = a.text.replace(/[\u0617-\u061A\u064B-\u0652\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED]/g, '');
                return !plainText.includes('فبأي آلاء ربكما تكذبان') && 
                       !plainText.includes('فباي الاء ربكما تكذبان') && 
                       !plainText.includes('ويل يومئذ للمكذبين');
            });
            if (filtered.length > 0) activePool = filtered;
        }

        if (GameState.isWeaknessMode) {
            let wItem = AppState.currentStudent.weaknesses[GameState.currentIndex];

            // 🌟 نفس فكرة نسخة الكبار: نعيد عرض السؤال الأصلي بكل تفاصيله (نوع اللعبة
            // الصغيرة التي أخطأ فيها الطفل، ونص السؤال كما ظهر له أول مرة) بدل نص
            // الآية المجرد فقط. "ترتيب كلمات الآية" لا يملك questionBody جاهزاً لأنه
            // سؤال تفاعلي، فنعرض كلمات الآية مرتبة بدلاً من ذلك. وأي خطأ قديم مسجّل من
            // قبل هذا التحديث (بلا هذه الحقول الجديدة) يرجع تلقائياً لعرض نص الآية
            // المجرد فقط كما كان يعمل سابقاً 🌟
            let originalBodyHTML;
            if (wItem.questionType === 'kids_word_order' && Array.isArray(wItem.originalWords) && wItem.originalWords.length) {
                originalBodyHTML = `<div class="quran-text" style="font-size:3.5rem;">﴿ ${wItem.originalWords.join(' ')} ﴾</div>`;
            } else if (wItem.questionBody) {
                originalBodyHTML = wItem.questionBody;
            } else {
                originalBodyHTML = `<div class="quran-text" style="font-size:3.5rem;">﴿ ${wItem.text} ﴾</div>`;
            }

            let typeLine = wItem.questionTypeLabel ? `<div style="font-size:1.3rem; font-weight:bold; margin-top:15px; color:var(--kids-primary);">${t('hw_q_type_label')} ${wItem.questionTypeLabel}</div>` : '';
            let dateLine = wItem.dateRecorded ? `<div style="font-size:1rem; color:#64748b; margin-top:5px;">${t('error_recorded_on')} ${new Date(wItem.dateRecorded).toLocaleDateString(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US')}</div>` : '';
            let errorLine = `<div style="font-size:1.4rem; font-weight:bold; margin-top:10px;">${t("الخطأ السابق المسجل:")} [ ${wItem.errorTypes} ]</div>`;

            GameState.currentData = { type: 'weakness', questionTitle: t("تحدي تصحيح الخطأ السابق"), questionBody: `${originalBodyHTML}${typeLine}${errorLine}${dateLine}`, fullAnswer: wItem.fullAnswer || wItem.correctAns || wItem.text, ayahObj: { numberInSurah: wItem.num, surahName: wItem.surahName }, reportText: wItem.text };
            document.getElementById('teacher-eval-area').style.display = 'block';
            document.getElementById('teacher-eval-buttons').style.display = 'flex';
            document.getElementById('game-title').innerHTML = `<span style="padding:10px 30px; border-radius:50px; display:inline-block; border:2px solid var(--primary); background: rgba(0,0,0,0.05); font-size:1.8rem;">🛠️ ${t("علاج الخطأ السابق")}</span>`;
            document.getElementById('game-question').innerHTML = GameState.currentData.questionBody;

            // 🌟 [جديد] كانت شاشة علاج الخطأ عند الأطفال لا تعرض الإجابة الصحيحة إطلاقاً
            // (خلافاً لنسخة الكبار) — أضفناها هنا مع زر "إظهار الإجابة للمطابقة" 🌟
            document.getElementById('show-ans-btn').style.display = 'inline-block';
            document.getElementById('game-answer').innerHTML = `${t("الإجابة الصحيحة:")}<br><div style="color:var(--secondary); font-size:1.4rem; font-weight:bold; margin: 10px 0;">( سورة ${wItem.surahName} - آية ${wItem.num} )</div><span class="quran-text">﴿ ${GameState.currentData.fullAnswer} ﴾</span>`;
            return;
        }

        if(type === 'kids_catch') GameState.currentData = await AppState.kidsEngine.generateKidsCatchGame(activePool, chunkIndex, totalChunks);
        else if(type === 'kids_next') GameState.currentData = await AppState.kidsEngine.generateKidsNextAyahGame(activePool, chunkIndex, totalChunks);
        else if(type === 'kids_tf') GameState.currentData = await AppState.kidsEngine.generateKidsTrueFalse(activePool, chunkIndex, totalChunks);
        else if(type === 'kids_guess_surah') GameState.currentData = await AppState.kidsEngine.generateKidsGuessSurah(activePool, chunkIndex, totalChunks);
        else if(type === 'kids_recite') GameState.currentData = await AppState.quranEngine.generateReciteGame(activePool, false, true, chunkIndex, totalChunks);
        else if(type === 'kids_word_order') GameState.currentData = await AppState.kidsEngine.generateKidsWordOrderGame(activePool, chunkIndex, totalChunks);
        else if(type === 'kids_start_surah') GameState.currentData = await AppState.kidsEngine.generateKidsStartSurah(activePool, chunkIndex, totalChunks);
        else if(type === 'kids_extra_word') GameState.currentData = await AppState.kidsEngine.generateKidsExtraWord(activePool, chunkIndex, totalChunks);
        else if(type === 'kids_previous') GameState.currentData = await AppState.kidsEngine.generateKidsPrevious(activePool, chunkIndex, totalChunks);
        // 🌟 [جديد] لعبة "اربط بداية الآية بنهايتها" — تستخدم نفس دالة محرك الكبار
        // (quranEngine.generateLinkGame) بمعامل isKids=true لصياغة عنوان مناسبة للأطفال 🌟
        else if(type === 'kids_link_ends') GameState.currentData = await AppState.quranEngine.generateLinkGame(activePool, true, chunkIndex, totalChunks);
        // 🌟 [إعادة تصميم] لعبة "اربط الكلمة بالسورة" — محل "رتب السور" القديمة، تستخدم نفس دالة
        // محرك الكبار (quranEngine.generateLinkWordSurahGame) بمعامل isKids=true؛ ضمن نطاق السور
        // الذي اختاره المعلم للطفل (kidsFrom/kidsTo) مباشرة 🌟
        else if(type === 'kids_link_word_surah') GameState.currentData = await AppState.quranEngine.generateLinkWordSurahGame(activePool, true);
        // 🌟 [جديد] لعبة "استمع وخمّن الآية" — ترجع type: 'kids_mcq' بالضبط مثل باقي ألعاب
        // الاختيار من متعدد، فتُعرض تلقائيًا عبر نفس مسار kids-mcq-area أدناه بلا أي تعديل عليه 🌟
        else if(type === 'kids_listen_ayah') GameState.currentData = await AppState.kidsEngine.generateKidsListenAyah(activePool, chunkIndex, totalChunks);

        if(!GameState.currentData) { GameState.currentData = await AppState.kidsEngine.generateKidsCatchGame(activePool, -1, 1); }
        
        document.getElementById('game-title').innerHTML = `<span style="background:white; padding:10px 30px; border-radius:50px; display:inline-block; font-size:1.8rem; border:2px solid var(--kids-accent); color:var(--kids-primary); font-weight:bold;">${t(GameState.currentData.questionTitle)}</span>`;
        
        if(GameState.currentData.type === 'kids_word_order') {
            GameState.currentData.studentAnswer = [];
            GameState.currentData.studentAnswerIndices = [];
            document.getElementById('kids-word-order-area').style.display = 'block';
            buildWordOrderUI();
        } else if (GameState.currentData.type === 'kids_link_ends') {
            // 🌟 [جديد] لعبة "اربط بداية الآية بنهايتها" — نفس منطق ركن الكبار بالضبط (راجع
            // buildLinkGameUI في adultGame.js لتفاصيل الفكرة، هذه نسخة مطابقة هنا) 🌟
            GameState.currentData.matchedPairs = [];
            GameState.currentData.selectedStart = null;
            GameState.currentData.locked = false;
            document.getElementById('kids-link-area').style.display = 'block';
            // 🌟 [جديد] نعيد نص التعليمة وعنواني العمودين لأصلهما الخاص بـ"اربط بداية الآية
            // بنهايتها" — لازم الآن بعد أن أصبحت الحاوية مشتركة مع لعبة "اربط الكلمة بالسورة"
            // الجديدة (kids_order_surahs سابقاً) التي تُغيّر هذه النصوص مؤقتاً أثناء عرضها 🌟
            let kidsLinkInstEl = document.querySelector('#kids-link-area p[data-i18n="link_inst"]');
            if (kidsLinkInstEl) kidsLinkInstEl.innerHTML = t('link_inst');
            let kidsLinkStartsTitleEl = document.querySelector('#kids-link-area h3[data-i18n="link_starts_title"]');
            if (kidsLinkStartsTitleEl) kidsLinkStartsTitleEl.innerHTML = t('link_starts_title');
            let kidsLinkEndsTitleEl = document.querySelector('#kids-link-area h3[data-i18n="link_ends_title"]');
            if (kidsLinkEndsTitleEl) kidsLinkEndsTitleEl.innerHTML = t('link_ends_title');
            buildLinkGameUI();
        } else if (GameState.currentData.type === 'kids_link_word_surah') {
            // 🌟 [إعادة تصميم] لعبة "اربط الكلمة بالسورة" — محل "رتب السور" القديمة عند الأطفال.
            // تعيد استخدام نفس حاوية ودالة بناء واجهة "اربط بداية الآية بنهايتها"
            // (kids-link-area / buildLinkGameUI) بالحرف بلا أي كود جديد — راجع تعليق
            // generateLinkWordSurahGame في quranEngine.js لتفاصيل الفكرة الكاملة. حاوية "رتب
            // السور" القديمة (kids-order-surahs-area) تركناها في القالب بلا حذف ولم تعد
            // تُستخدَم من أي مكان 🌟
            GameState.currentData.matchedPairs = [];
            GameState.currentData.selectedStart = null;
            GameState.currentData.locked = false;
            document.getElementById('kids-link-area').style.display = 'block';
            let kidsWsInstEl = document.querySelector('#kids-link-area p[data-i18n="link_inst"]');
            if (kidsWsInstEl) kidsWsInstEl.innerHTML = t('link_word_surah_inst');
            let kidsWsStartsTitleEl = document.querySelector('#kids-link-area h3[data-i18n="link_starts_title"]');
            if (kidsWsStartsTitleEl) kidsWsStartsTitleEl.innerHTML = t('link_word_surah_starts_title');
            let kidsWsEndsTitleEl = document.querySelector('#kids-link-area h3[data-i18n="link_ends_title"]');
            if (kidsWsEndsTitleEl) kidsWsEndsTitleEl.innerHTML = t('link_word_surah_ends_title');
            buildLinkGameUI();
        } else {
            document.getElementById('game-question').innerHTML = GameState.currentData.questionBody;
            
            if (GameState.currentData.type === 'kids_recite') {
                document.getElementById('teacher-eval-area').style.display = 'block'; 
                document.getElementById('teacher-eval-buttons').style.display = 'flex'; 
                // 🌟 إظهار زر الإجابة في التسميع للأطفال 🌟
                document.getElementById('show-ans-btn').style.display = 'inline-block';
                document.getElementById('game-answer').innerHTML = `<span class="quran-text">﴿ ${GameState.currentData.fullAnswer} ﴾</span>`;
            } else {
                document.getElementById('teacher-eval-area').style.display = 'block'; 
                let optsContainer = document.getElementById('kids-options-container'); 
                optsContainer.innerHTML = '';
                
                if(GameState.currentData.type === 'kids_tf') { 
                    optsContainer.innerHTML = `
                        <div style="display:flex; justify-content:center; gap:20px; margin-top:20px; flex-wrap:wrap;">
                            <button class="kids-tf-btn" style="background:#10b981;" onclick="window.recordKidsAnswer(${GameState.currentData.isTrue})">✅ ${t("نـعـم")}</button>
                            <button class="kids-tf-btn" style="background:#ef4444;" onclick="window.recordKidsAnswer(${!GameState.currentData.isTrue})">❌ ${t("لا")}</button>
                        </div>`; 
                } else {
                    GameState.currentData.options.forEach(opt => {
                        let btn = document.createElement('button');
                        btn.className = 'kids-mcq-btn quran-text';
                        btn.innerHTML = `﴿ ${opt} ﴾`;
                        let isAyahCorrect = opt.trim() === GameState.currentData.correctAns.trim();
                        // 🌟 [جديد] لعبة "استمع وخمّن الآية" فقط — تُميَّز بوجود surahOptions في
                        // بيانات السؤال (راجع generateKidsListenAyah في engine/kidsEngine.js)،
                        // بلا أي أثر على أي لعبة kids_mcq أخرى لا تملك هذا الحقل إطلاقًا. لو
                        // اختار الطفل الآية الصحيحة، لا نُنهي السؤال فورًا كباقي الألعاب — بل
                        // نعرض خطوة ثانية "من أي سورة هذه الآية؟"، ولا تُحتسب الإجابة صحيحة
                        // نهائيًا إلا لو اختار السورة الصحيحة أيضًا (بطلب صريح من المعلم: لازم
                        // الاثنان صح). لو أخطأ في اختيار الآية من الأساس، يُسجَّل السؤال خاطئًا
                        // فورًا كالمعتاد بلا عرض خطوة السورة إطلاقًا 🌟
                        if (Array.isArray(GameState.currentData.surahOptions)) {
                            btn.onclick = () => {
                                if (isAyahCorrect) showKidsListenSurahStep();
                                else window.recordKidsAnswer(false, 'kids_listen_wrong_ayah_error');
                            };
                        } else {
                            btn.onclick = () => window.recordKidsAnswer(isAyahCorrect);
                        }
                        optsContainer.appendChild(btn);
                    });
                }
                document.getElementById('kids-mcq-area').style.display = 'block'; 
            }
        }
    } catch (err) { console.error(err); GameState.currentIndex++; playNextMission(); }
}

// 🌟 [تعديل] أضفنا معامل ثانٍ اختياري errorKey (مفتاح i18n) لدعم رسائل خطأ مخصّصة للعبة
// "استمع وخمّن الآية" (راجع showKidsListenSurahStep أدناه) — بلا أي تغيير في سلوك أي استدعاء
// قديم لا يمرّر هذا المعامل إطلاقًا (يبقى يستخدم الرسالة الافتراضية كما كانت) 🌟
window.recordKidsAnswer = function(isCorrect, errorKey) {
    if(isCorrect) recordAnswer(true);
    else { playErrorSound(); recordAnswer(false, [t(errorKey || "أخطأ في الاختيار")]); }
}

// 🌟 [جديد بالكامل] الخطوة الثانية من لعبة "استمع وخمّن الآية": تُستدعى فقط بعد اختيار الطفل
// للآية الصحيحة (راجع فرع surahOptions أعلاه) — تُخفي خيارات الآيات وتعرض بدلاً منها خيارات
// أسماء السور (GameState.currentData.surahOptions) ليختار الطفل من أي سورة هذه الآية. الإجابة
// النهائية للسؤال بالكامل (صح/خطأ) لا تُحسَم إلا هنا — بطلب صريح من المعلم: لازم الآية والسورة
// معًا صحيحتين حتى يُحتسب السؤال صحيحًا 🌟
function showKidsListenSurahStep() {
    document.getElementById('kids-options-container').style.display = 'none';
    let surahContainer = document.getElementById('kids-listen-surah-options');
    surahContainer.innerHTML = '';
    GameState.currentData.surahOptions.forEach(surahName => {
        let btn = document.createElement('button');
        // 🌟 نفس الكلاس المستخدَم لأسماء السور في لعبة "خمن السورة" (generateKidsGuessSurah)
        // بالضبط — للحفاظ على نفس الهوية البصرية بين اللعبتين 🌟
        btn.className = 'kids-mcq-btn quran-text';
        btn.innerText = surahName;
        btn.onclick = () => {
            if (surahName === GameState.currentData.correctSurah) window.recordKidsAnswer(true);
            else window.recordKidsAnswer(false, 'kids_listen_wrong_surah_error');
        };
        surahContainer.appendChild(btn);
    });
    document.getElementById('kids-listen-surah-area').style.display = 'block';
}

// 🌟 [جديد بالكامل] تشغيل صوت الآية للعبة "استمع وخمّن الآية" — أول تشغيل صوت تلاوة حقيقي في
// المنصة كلها (راجع تعليق generateKidsListenAyah في engine/kidsEngine.js لتفاصيل المصدر
// والافتراضات). مُعرَّفة هنا (لا في kidsEngine.js) لأن كل التحكم بالـDOM/الصوت في هذا الملف
// بالضبط — بنفس فلسفة window.recordKidsAnswer أعلاه — والمحرك نفسه يبقى نقياً بلا DOM. بلا أي
// تشغيل تلقائي (autoplay) عمدًا: المتصفحات غالبًا تمنعه بعد أول سؤال في الجلسة، والأنسب
// للطفل أصلاً إنه يضغط الزر بنفسه ويقدر يعيد الاستماع عدة مرات قبل الاختيار.
// 🌟 [تعديل] كانت هذه الدالة تُشغِّل audio.src (رابط CDN) مباشرة بلا أي تخزين محلي — الآن تتحقق
// أولاً من database/kidsAudioDB.js (عبر AppState.kidsAudioManager): لو الصوت مخزَّن مسبقًا
// (الحالة المعتادة، بفضل التحميل المسبق في openKidsGameScreen أعلاه) تشغّله من النسخة المحلية
// مباشرة — يعمل بدون إنترنت تمامًا. ولو غير مخزَّن بعد (نادر) تشغّله من رابط الـCDN كخط رجوع
// كما كان سابقًا، وتخزّنه في نفس اللحظة بصمت ليكون جاهزًا أوفلاين من المرة القادمة.
window.playKidsListenAyahAudio = async function() {
    const audio = document.getElementById('kids-listen-audio-player');
    const btn = document.getElementById('kids-listen-play-btn');
    if (!audio) return;
    const ayahNumber = GameState.currentData && GameState.currentData.ayahObj ? GameState.currentData.ayahObj.number : null;

    const stopPulse = () => { if (btn) btn.classList.remove('playing'); };
    const startPlayback = () => {
        audio.currentTime = 0;
        if (btn) btn.classList.add('playing');
        audio.onended = stopPulse;
        audio.onpause = stopPulse;
        // 🌟 تنبيه واضح للمعلم/الطفل لو تعذّر التشغيل نهائيًا (لا إنترنت + غير مخزَّن محليًا
        // بعد) بدل فشل صامت
        audio.play().catch(() => { stopPulse(); alert(t('kids_listen_audio_error')); });
    };

    // 🌟 المحاولة الأولى: تشغيل من التخزين المحلي (Blob في IndexedDB) لو موجود — offline بالكامل
    if (ayahNumber && AppState.kidsAudioManager) {
        try {
            const cachedBlob = await AppState.kidsAudioManager.getAudio(ayahNumber);
            if (cachedBlob) {
                // نبني object URL مرة واحدة فقط لكل سؤال (لا نعيد بناءه مع كل ضغطة على الزر
                // لنفس الآية)، بدل تكرار الاستدعاء الكامل من IndexedDB بلا داعٍ
                if (audio.dataset.cachedAyahNumber !== String(ayahNumber)) {
                    audio.src = URL.createObjectURL(cachedBlob);
                    audio.dataset.cachedAyahNumber = String(ayahNumber);
                }
                startPlayback();
                return;
            }
        } catch (e) {
            console.warn("تعذر قراءة صوت الآية المخزَّن محليًا، سيُستخدَم رابط CDN كخط رجوع:", e);
        }
    }

    // 🌟 خط الرجوع: الصوت غير مخزَّن محليًا بعد — نشغّله من رابط الـCDN الموجود أصلاً في
    // audio.src (راجع generateKidsListenAyah)، ونخزّنه بصمت في الخلفية لأي مرة قادمة
    startPlayback();
    if (ayahNumber && AppState.kidsAudioManager && audio.dataset.cachedAyahNumber !== String(ayahNumber)) {
        AppState.kidsAudioManager.cacheFromUrl(ayahNumber, audio.src).catch(() => {});
    }
}

function saveTempError() {
    let errorTypes = []; 
    document.querySelectorAll('#error-modal input[type="checkbox"]:checked').forEach(cb => errorTypes.push(cb.value)); 
    let customNote = document.getElementById('custom-note').value.trim();
    if(customNote) errorTypes.push(`${t("ملاحظة:")} ${customNote}`);
    if(errorTypes.length === 0) return alert(t("حدد نوع الملاحظة أو اكتب ملاحظة أولاً!"));
    GameState.tempErrors.push(...errorTypes);
    closeModal('error-modal'); 
    document.getElementById('temp-errors-container').style.display = 'block';
    const listDiv = document.getElementById('temp-errors-list');
    listDiv.innerHTML = GameState.tempErrors.map(e => `<span style="background:#fecaca; color:#7f1d1d; padding:4px 10px; border-radius:15px; font-size:1rem;">❌ ${t(e)}</span>`).join('');
    document.getElementById('btn-submit-all-errors').style.display = 'block';
    playErrorSound();
}

function submitAllErrors() {
    if(GameState.tempErrors.length === 0) return;
    recordAnswer(false, GameState.tempErrors);
}

async function recordAnswer(isCorrect, errorTypes = []) {
    let timeTaken = GameState.currentQuestionStartTime ? (Date.now() - GameState.currentQuestionStartTime) / 1000 : 0;
    let typeLabel = GameState.isWeaknessMode ? t("تحدي علاج الخطأ") : t(GameState.currentData.questionTitle);
    
    let ayahNum = GameState.currentData.ayahObj ? GameState.currentData.ayahObj.numberInSurah : (GameState.currentData.original ? GameState.currentData.original[0].numberInSurah : 0);
    let surahName = GameState.currentData.ayahObj ? GameState.currentData.ayahObj.surahName : (GameState.currentData.surahName || "");
    let reportText = GameState.currentData.reportText;

    GameState.reportDetails.push({ label: typeLabel, num: ayahNum, surahName: surahName, text: reportText, isCorrect: isCorrect, errors: errorTypes, usedHint: false, timeTaken: timeTaken, orderAttempts: GameState.orderAttempts });

    // 🌟 تتبّع عدد الأسئلة المُجابة وعدد الإجابات الصحيحة لكل طالب — أساس حساب نسبة
    // الإتقان الحقيقية (0-100%) في بطاقة "نظرة سريعة" بالشاشة الرئيسية. نحسب كل سؤال
    // هنا (بما فيها إعادة أسئلة علاج الأخطاء) كمحاولة تقييم حقيقية. الفحص بـ (|| 0)
    // ضروري لأي طالب قديم/مستورَد من نسخة سابقة لا يملك هذين الحقلين بعد.
    AppState.currentStudent.totalAttempts = (AppState.currentStudent.totalAttempts || 0) + 1;
    if (isCorrect) AppState.currentStudent.totalCorrect = (AppState.currentStudent.totalCorrect || 0) + 1;

    if(GameState.isWeaknessMode && isCorrect) {
        // 🌟 نفس فكرة نسخة الكبار: أرشفة بدل الحذف — ننقل الخطأ المصحَّح بكل تفاصيله
        // إلى student.resolvedWeaknesses + تاريخ الحل، بدل حذفه نهائياً وفقدان أثره 🌟
        // 🌟 نفس تعديل نسخة الكبار: مقارنة عبر normalizeForCompare بدل تطابق حرفي كامل
        let resolvedItem = AppState.currentStudent.weaknesses.find(w => normalizeForCompare(w.text) === normalizeForCompare(reportText));
        if (resolvedItem) {
            if (!AppState.currentStudent.resolvedWeaknesses) AppState.currentStudent.resolvedWeaknesses = [];
            AppState.currentStudent.resolvedWeaknesses.push({ ...resolvedItem, dateResolved: new Date().toISOString() });
        }
        AppState.currentStudent.weaknesses = AppState.currentStudent.weaknesses.filter(w => normalizeForCompare(w.text) !== normalizeForCompare(reportText));
        await AppState.studentManager.updateStudent(AppState.currentStudent);
    }
    
    if(isCorrect) { 
        playSuccessSound();
        let earnedScore = 10;
        if (GameState.orderAttempts === 1) earnedScore = 8;
        else if (GameState.orderAttempts >= 2) earnedScore = 6;
        
        AppState.currentStudent.totalScore += earnedScore; 
        GameState.consecutiveCorrect++;
        if(GameState.consecutiveCorrect === 2) { setTimeout(() => { showToastEncouragement(); }, 500); GameState.consecutiveCorrect = 0; }
        await AppState.studentManager.updateStudent(AppState.currentStudent); 
        GameState.currentIndex++; 
        setTimeout(playNextMission, 1000); 
    } else { 
        GameState.tempErrors = []; 
        GameState.consecutiveCorrect = 0; 
        if(!GameState.isWeaknessMode) {
            // 🌟 نفس فكرة نسخة الكبار: نخزّن تفاصيل السؤال الأصلي كاملة (نوعه، نص
            // السؤال بصيغته الكاملة، الإجابة الصحيحة...) وليس نص الآية المجرد فقط كما
            // كان سابقاً — حتى يظهر السؤال بنفس صيغته الأصلية يوم "علاج الخطأ السابق".
            // "ترتيب كلمات الآية" استثناء لأنه سؤال تفاعلي بلا questionBody جاهز،
            // فنخزّن كلماته الأصلية بدلاً من ذلك (originalWords) 🌟
            let cd = GameState.currentData;
            let errorObj = {
                text: reportText,
                num: ayahNum,
                surahName: surahName,
                errorTypes: errorTypes.join(" | "),
                errorTypesList: errorTypes,
                questionType: cd.type || null,
                questionTypeLabel: typeLabel,
                questionBody: (cd.type !== 'kids_word_order' && cd.questionBody) ? cd.questionBody : null,
                fullAnswer: cd.fullAnswer || null,
                correctAns: cd.correctAns || null,
                options: Array.isArray(cd.options) ? cd.options : null,
                originalWords: (cd.type === 'kids_word_order' && Array.isArray(cd.originalWords)) ? cd.originalWords : null,
                sourceSection: 'kids',
                dateRecorded: new Date().toISOString()
            };
            if(!AppState.currentStudent.weaknesses) AppState.currentStudent.weaknesses = [];
            if(!AppState.currentStudent.weaknesses.some(w => normalizeForCompare(w.text) === normalizeForCompare(reportText))) AppState.currentStudent.weaknesses.push(errorObj);
            await AppState.studentManager.updateStudent(AppState.currentStudent);
        }
        GameState.currentIndex++; 
        setTimeout(playNextMission, 1000); 
    }
}

function buildWordOrderUI() {
    const shufDiv = document.getElementById('word-order-shuffled'); 
    const slotDiv = document.getElementById('word-order-slots'); 
    shufDiv.innerHTML = ""; slotDiv.innerHTML = "";
    
    GameState.currentData.shuffledWords.forEach((word, idx) => {
        if (!GameState.currentData.studentAnswerIndices.includes(idx)) {
            let item = document.createElement('div'); 
            item.className = 'order-item quran-text'; 
            item.style.fontSize = '2.5rem'; 
            item.innerText = word;
            item.onclick = () => { 
                let pos = GameState.currentData.studentAnswer.length; 
                GameState.currentData.studentAnswer.push({pos, origIdx:idx, word}); 
                GameState.currentData.studentAnswerIndices.push(idx); 
                buildWordOrderUI(); 
                if(GameState.currentData.studentAnswer.length === GameState.currentData.originalWords.length) { 
                    let isCorrect = GameState.currentData.studentAnswer.map(a=>a.word).join(" ") === GameState.currentData.originalWords.join(" "); 
                    if(isCorrect) { recordAnswer(true); } 
                    else { 
                        playErrorSound(); GameState.orderAttempts++;
                        setTimeout(() => { GameState.currentData.studentAnswer = []; GameState.currentData.studentAnswerIndices = []; buildWordOrderUI(); }, 800);
                    } 
                } 
            }; 
            shufDiv.appendChild(item);
        }
    });
    
    for(let i=0; i < GameState.currentData.originalWords.length; i++) {
        let slot = document.createElement('div');
        let ans = GameState.currentData.studentAnswer.find(a => a.pos === i);
        if (ans) {
            slot.className = 'order-slot filled quran-text'; 
            slot.style.fontSize = '2.5rem'; 
            slot.innerText = ans.word;
            slot.onclick = () => { 
                GameState.currentData.studentAnswer = GameState.currentData.studentAnswer.filter(a => a.pos !== i); 
                GameState.currentData.studentAnswerIndices = GameState.currentData.studentAnswerIndices.filter(x => x !== ans.origIdx); 
                GameState.currentData.studentAnswer.forEach((a, index) => a.pos = index); 
                buildWordOrderUI(); 
            }; 
        } else {
            slot.className = 'order-slot'; slot.style.minWidth = '60px'; slot.innerHTML = `<span style="color:#cbd5e1;">...</span>`;
        }
        slotDiv.appendChild(slot);
    }
}

// 🌟 [جديد] بناء واجهة لعبة "اربط بداية الآية بنهايتها" — نسخة مطابقة تماماً لـ buildLinkGameUI
// في games/adultGame.js (راجع تعليقها هناك لتفاصيل الفكرة الكاملة)، بنفس أسباب التكرار
// الموضَّحة أعلاه في هذا الملف (persistEvaluationToHistory/computeQuestionScoreForHistory):
// كل ملف لعبة مستقل بالكامل عن الآخر ولا يستورد من واجهة الآخر.
function buildLinkGameUI() {
    const startsDiv = document.getElementById('link-starts-col');
    const endsDiv = document.getElementById('link-ends-col');
    if (!startsDiv || !endsDiv) return;
    startsDiv.innerHTML = ""; endsDiv.innerHTML = "";
    const data = GameState.currentData;
    // 🌟 [جديد] نسخة مطابقة تماماً لتلوين الأزواج + صوت المطابقة الفوري + حركة correct-pop
    // المضافة في buildLinkGameUI بـgames/adultGame.js (راجع تعليقاتها هناك لتفاصيل الفكرة
    // الكاملة)، بنفس أسباب التكرار الموضَّحة أعلى الملف: كل ملف لعبة مستقل بالكامل 🌟
    const PAIR_COLORS_COUNT = 6;

    data.starts.forEach((item, idx) => {
        let isMatched = data.matchedPairs.includes(item.id);
        let el = document.createElement('div');
        let cls = 'link-item quran-text';
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
                    data.justMatchedId = item.id;
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

// 🌟 [قديم — غير مُستخدَمة حالياً] كانت تبني واجهة لعبة "رتب السور" لركن الأطفال (نسخة مطابقة
// تماماً لدالة buildOrderGameUI الموجودة في games/adultGame.js). بعد استبدال هذه اللعبة بلعبة
// "اربط الكلمة بالسورة" (kids_link_word_surah، تستخدم buildLinkGameUI أدناه بدلاً منها) لم تعد
// أي شاشة تستدعي هذه الدالة — تركناها بلا حذف احترازًا بدل حذفها فجأة، وحاوية kids-order-surahs-area
// المرتبطة بها ما زالت موجودة في kidsGame.html أيضاً لنفس السبب.
function buildOrderSurahsUI() {
    const shufDiv = document.getElementById('kids-order-surahs-shuffled');
    const slotDiv = document.getElementById('kids-order-surahs-slots');
    if (!shufDiv || !slotDiv) return;
    shufDiv.innerHTML = ""; slotDiv.innerHTML = "";

    GameState.currentData.shuffled.forEach((surah) => {
        if (!GameState.currentData.studentAnswer.some(a => a.numberInSurah === surah.numberInSurah)) {
            let item = document.createElement('div');
            item.className = 'order-item quran-text';
            item.innerText = surah.text;
            item.onclick = () => {
                GameState.currentData.studentAnswer.push(surah);
                buildOrderSurahsUI();
                if(GameState.currentData.studentAnswer.length === GameState.currentData.original.length) {
                    let isCorrect = true;
                    for(let i=0; i<GameState.currentData.original.length; i++) {
                        if(GameState.currentData.studentAnswer[i].numberInSurah !== GameState.currentData.original[i].numberInSurah) isCorrect = false;
                    }
                    if(isCorrect) { recordAnswer(true); }
                    else {
                        playErrorSound(); GameState.orderAttempts++;
                        setTimeout(() => { GameState.currentData.studentAnswer = []; buildOrderSurahsUI(); }, 800);
                    }
                }
            };
            shufDiv.appendChild(item);
        }
    });

    for(let i=0; i < GameState.currentData.original.length; i++) {
        let slot = document.createElement('div');
        if (GameState.currentData.studentAnswer[i]) {
            slot.className = 'order-slot filled quran-text';
            slot.innerText = GameState.currentData.studentAnswer[i].text;
            slot.onclick = () => { GameState.currentData.studentAnswer.splice(i, 1); buildOrderSurahsUI(); };
        } else {
            slot.className = 'order-slot'; slot.innerHTML = `<span style="color:#cbd5e1;">${t("مكان فارغ...")}</span>`;
        }
        slotDiv.appendChild(slot);
    }
}