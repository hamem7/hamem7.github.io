// similarities/similarities-play.js
//
// 🌟 [جديد] شاشة لعب "ركن المتشابهات" التفاعلية — تستهلك engine/similarityEngine.js (منطق
// بحت بلا أي DOM) لبناء جولة أسئلة اختيار من متعدد (MCQ)، وتعرضها هنا سؤالاً بعد الآخر
// بتصحيح تلقائي فوري (نفس فلسفة ألعاب الأطفال الحالية في games/kidsGame.js: صوت نجاح/خطأ +
// كونفيتي + توست تشجيع) لكن بواجهة DOM مستقلة تماماً (معزولة عن games/kidsGame.html/js
// بالكامل) بنفس فلسفة عزل similarities.js عن games/ وsettings/ — حتى لا يخاطر أي تعديل هنا
// بكسر شاشة ألعاب الأطفال الحالية الشغالة فعلياً.
//
// هدف اللعبة (بطلب صريح من المعلم): تعريف الطفل على المتشابهات وتسهيل حفظها، لا تقييمه
// رسمياً — لذلك كل إجابة تُصحَّح آلياً وفورياً بلا أي تدخل من المعلم (بخلاف نمط "التسميع
// اليدوي" المستخدم في بقية شاشات المنصة).
//
// 🌟 [عدّل — 2026-09-16، الجولة الثانية] كانت الشاشة تلعب مجموعة واحدة فقط (AppState.
// similarityGamePlayGroupId). بطلب صريح من المعلم أصبح نطاق اللعب أوسع: "لعبة السورة
// بالكامل" أو "لعبة الجزء بالكامل" — تُجمع كل مجموعات النطاق المطلوب معاً في جولة واحدة
// (buildGameRound الجديدة تستقبل مصفوفة مجموعات، راجع engine/similarityEngine.js). لذلك
// PlayState أصبح يحمل مصفوفة groups بدل مجموعة واحدة، وكل سؤال يحمل بيانات مجموعته الخاصة
// (anchorPhrase/scope) بدل الاعتماد على مجموعة ثابتة للجولة كلها (راجع buildOccurrenceHTML/
// renderQuestion أدناه).
import { AppState, loadSplashScreen, t } from '../core/app.js';
import { showToastEncouragement, triggerConfetti } from '../components/ui.js';
import { getOfficialAyahText, JUZ_BUCKETS } from './similarities.js';
import { highlightAnchorInText, blankPhraseInText, splitRangeFullTextIntoAyahs } from '../core/quranTextUtils.js';
import { buildGameRound } from '../engine/similarityEngine.js';

// 🌟 نفس آلية الصوت المستخدمة في games/kidsGame.js بالضبط (Web Audio API المدمجة في
// المتصفح، بلا أي ملف صوتي خارجي) — نسخة مستقلة هنا (وليست استيراداً من kidsGame.js) حتى
// تبقى شاشة اللعب هذه معزولة تماماً بلا أي أثر جانبي على GameState الخاص بألعاب الأطفال.
const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
let audioCtx;

function initAudio() {
    if (!audioCtx) audioCtx = new AudioContextCtor();
    if (audioCtx.state === 'suspended') audioCtx.resume();
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

// 🌟 [تعديل] نفس التعديل المطبَّق على playErrorSound في games/kidsGame.js بالضبط —
// النغمة "sawtooth" الحادة بحجم صوت كامل (gain=1 افتراضياً) كانت بتخوّف الطفل لما يجاوب
// غلط في لعبة المتشابهات (نفس الآلية المنسوخة من kidsGame.js، فنفس المشكلة موجودة هنا
// أيضاً). استبدلناها بنفس النغمة الهادئة "sine" بحجم صوت منخفض 🌟
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

// 🌟 [عدّل — 2026-09-16، الجولة الثانية] group الواحدة أصبحت groups (مصفوفة) + scopeTitle
// (عنوان النطاق المعروض في شريط العنوان: اسم السورة أو اسم الجزء) — بلا حاجة لأي تخزين دائم
// (لا تقارير، لا حفظ في سجل الطالب)، لأن هذه لعبة تعريف/تدريب سريعة وليست تقييماً رسمياً
// يُحفظ لملف الطالب (بخلاف ألعاب الأطفال الرسمية في games/kidsGame.js).
let PlayState = { groups: [], scopeTitle: '', round: null, currentIndex: 0, correctCount: 0 };

// 🌟 [جديد] يحل مجموعات اللعب الفعلية + عنوان النطاق من كائن scope الممرَّر عبر
// AppState.similarityGamePlayScope — راجع تعليق رأس الملف وتعليق الحقل في core/app.js.
async function resolveScopeGroups(scope) {
    if (!scope || !AppState.similaritiesManager) return { groups: [], title: '' };

    if (scope.type === 'surah') {
        const groups = await AppState.similaritiesManager.getInternalBySurah(scope.surahNumber);
        const surahInfo = (AppState.surahsData || []).find(s => s.number === scope.surahNumber);
        return { groups, title: surahInfo ? surahInfo.name : '' };
    }

    if (scope.type === 'juz') {
        const all = await AppState.similaritiesManager.getAllSimilarities();
        if (scope.juzId === 'amma') {
            return { groups: all.filter(r => r.scope === 'juzAmma'), title: t('sim_juz_amma') };
        }
        const bucket = JUZ_BUCKETS.find(b => b.id === scope.juzId);
        if (!bucket) return { groups: [], title: '' };
        const groups = all.filter(r => r.scope === 'internal' && (r.surahs || []).some(sn => sn >= bucket.from && sn <= bucket.to));
        return { groups, title: t(bucket.titleKey) };
    }

    return { groups: [], title: '' };
}

export async function initSimilarityGamePlay() {
    // 🌟 نفس فكرة dualTestPlayMatchId في core/app.js بالضبط: حقل "لقطة واحدة" يُقرأ هنا مرة
    // واحدة ثم يُفرَّغ فوراً حتى لا يؤثر على أي فتح لاحق عادي للشاشة
    const scope = AppState.similarityGamePlayScope;
    AppState.similarityGamePlayScope = null;

    const exitBtn = document.getElementById('simplay-btn-exit');
    if (exitBtn) exitBtn.addEventListener('click', () => loadSplashScreen());

    const container = document.getElementById('simplay-container');
    if (!container) return;

    if (!scope) {
        container.innerHTML = `<div class="sim-empty">${t('sim_no_data')}</div>`;
        return;
    }

    const { groups, title } = await resolveScopeGroups(scope);
    if (groups.length === 0) {
        container.innerHTML = `<div class="sim-empty">${t('sim_no_data')}</div>`;
        return;
    }

    const anchorEl = document.getElementById('simplay-anchor');
    if (anchorEl) anchorEl.textContent = ''; // 🌟 يُحدَّث لاحقاً لكل سؤال على حدة (راجع renderQuestion)
    const titleEl = document.getElementById('simplay-title');
    if (titleEl) titleEl.textContent = `${t('sim_game_title')} — ${title}`;

    const round = buildGameRound(groups);
    // 🛡️ خط دفاع صريح (لا نفترض صمتاً أن كل مجموعة صالحة للعب): لو لم تتوفر بيانات كافية
    // (كل المجموعات بموضع واحد، أو كل مواضعها بنفس رقم آية/سورة...) نعرض رسالة ودّية للمعلم
    // بدل شاشة أسئلة فارغة أو خطأ برمجي — راجع تعليق buildGameRound في
    // engine/similarityEngine.js لتفاصيل الحالات المُستبعَدة.
    if (!round.hasEnoughData) {
        container.innerHTML = `<div class="sim-empty">${t('sim_game_not_enough_data')}</div>`;
        return;
    }

    PlayState = { groups, scopeTitle: title, round, currentIndex: 0, correctCount: 0 };
    initAudio();
    renderQuestion();
}

function updateProgressUI() {
    const el = document.getElementById('simplay-progress');
    if (el) el.textContent = `${PlayState.currentIndex + 1} / ${PlayState.round.questions.length}`;
}

// 🌟 نفس منطق renderOccurrenceHTML في similarities.js بالضبط: نحاول جلب النص الرسمي
// الموثّق من QuranEngine أولاً للمتشابهات الداخلية، ونرجع لـ fullText المُفرَّغ يدوياً
// تلقائياً لو تعذّر ذلك (سورة/رقم آية خارج النطاق...) — بنفس فلسفة الحفاظ على التوافق.
async function resolveDisplayText(o, scope) {
    if (scope === 'internal' && o.ayahNumber) {
        const officialText = await getOfficialAyahText(o.surahNumber, o.ayahNumber);
        if (officialText) return officialText;
    }
    return o.fullText;
}

// 🌟 [مهم جداً] منع تسريب الإجابة عبر واجهة العرض نفسها: سؤال "في أي آية وردت هذه
// العبارة؟" (sim_game_q_position_ayah) يجب ألا يُظهر دائرة رقم الآية (sim-ayah-badge) لأنها
// الإجابة الصحيحة بعينها، وسؤال "في أي سورة؟" (sim_game_q_position_surah) يجب ألا يُظهر اسم
// السورة في سطر المعلومات السفلي لنفس السبب بالضبط. باقي أنواع الأسئلة (وباقي مواضع نفس
// المجموعة المعروضة كمشتتات لا كنص السؤال) لا تُظهر أياً منهما كإجابة أصلاً فلا خطر فيها.
// 🌟 [عدّل — 2026-09-16، الجولة الثانية] كانت تستقبل group ثابتة للجولة كلها (anchorPhrase
// منها). بعد خلط أسئلة من عدة مجموعات في نفس الجولة، anchorPhrase يجب أن يأتي من السؤال
// نفسه (q.anchorPhrase — أضيف لكل سؤال في engine/similarityEngine.js) بدل مجموعة ثابتة.
function buildOccurrenceHTML(text, q, occurrence, showBadge) {
    const isSingleAyah = occurrence.ayahNumber != null;

    if (q.type === 'sim_ending') {
        // ⚠️ الترتيب هنا مقصود: نُخفي الكلمة المميزة على النص الكامل غير المُقسَّم أولاً
        // (وليس بعد التقسيم لآيات) لأن بعض مواضع جزء عمّ تحمل صيغتين للكلمة المميزة مفصولتين
        // بـ "/" قد تقع كل واحدة منهما في آية مختلفة ضمن نفس النطاق (مثال حقيقي موثّق: مجموعة
        // "amma-12" — "الفُجَّارِ / سِجِّينٍ" تقع أولاها في الآية 7 والثانية في الآية 8). لو
        // قسّمنا الآيات أولاً ثم أخفينا على كل آية منفصلة، كانت الاثنتان ستُخفيان معاً بدل
        // إخفاء موضع واحد فقط (راجع blankPhraseInText في core/quranTextUtils.js التي تختار
        // آخر مطابقة فقط). اختبرنا فعلياً أن علامات ﴿رقم﴾ المضمّنة تبقى سليمة بعد الإخفاء
        // على كل مواضع جزء عمّ الحقيقية التي تملك distinctiveTailWord (لا تداخل بين نطاق
        // الإخفاء وأي علامة نهاية آية).
        const blanked = blankPhraseInText(text, q.correctAnswer);
        const resultText = blanked.found ? blanked.html : text;
        if (isSingleAyah) {
            const badge = showBadge ? `<span class="sim-ayah-badge">${occurrence.ayahNumber}</span>` : '';
            return `<div class="sim-occ-text quran-text">${badge}${resultText}</div>`;
        }
        const ayahsHTML = splitRangeFullTextIntoAyahs(resultText).map(a => {
            const badge = showBadge && a.ayahNumber ? `<span class="sim-ayah-badge">${a.ayahNumber}</span>` : '';
            return `<div class="sim-occ-text quran-text">${badge}${a.text}</div>`;
        }).join('');
        return `<div class="sim-occ-ayah-group">${ayahsHTML}</div>`;
    }

    // sim_position: نفس منطق renderOccurrenceHTML في similarities.js بالضبط — نُقسِّم أولاً
    // (لو نطاق آيات) ثم نظلّل كل آية بمفردها، لأن العبارة المشتركة (anchorPhrase) تقع داخل
    // آية واحدة محددة دائماً ولا تشترك بين آيتين كحال الكلمة المميزة أعلاه. نفس بنية
    // .sim-occ-ayah-group المستخدمة في شاشات التصفح بالضبط (راجع css/similarities.css)
    // للحفاظ على نفس المسافات البصرية بين الأسطر.
    if (isSingleAyah) {
        const badge = showBadge ? `<span class="sim-ayah-badge">${occurrence.ayahNumber}</span>` : '';
        return `<div class="sim-occ-text quran-text">${badge}${highlightAnchorInText(text, q.anchorPhrase)}</div>`;
    }
    const ayahsHTML = splitRangeFullTextIntoAyahs(text).map(a => {
        const highlighted = highlightAnchorInText(a.text, q.anchorPhrase);
        const badge = showBadge && a.ayahNumber ? `<span class="sim-ayah-badge">${a.ayahNumber}</span>` : '';
        return `<div class="sim-occ-text quran-text">${badge}${highlighted}</div>`;
    }).join('');
    return `<div class="sim-occ-ayah-group">${ayahsHTML}</div>`;
}

async function renderQuestion() {
    const container = document.getElementById('simplay-container');
    if (!container) return;
    updateProgressUI();

    const q = PlayState.round.questions[PlayState.currentIndex];
    const o = q.occurrence;
    const baseText = await resolveDisplayText(o, q.scope);

    // 🌟 [جديد — 2026-09-16، الجولة الثانية] صندوق العنوان الذهبي (#simplay-anchor) كان
    // يُضبط مرة واحدة فقط عند بداية الجولة (لأن الجولة كانت كلها من مجموعة واحدة بعبارة
    // واحدة). بعد خلط مجموعات مختلفة في الجولة الواحدة، أصبح يتحدّث مع كل سؤال ليعرض عبارة
    // مجموعة هذا السؤال تحديداً — بنفس شكل الصندوق المستخدم في شاشات التصفح بالضبط.
    const anchorEl = document.getElementById('simplay-anchor');
    if (anchorEl) anchorEl.textContent = `« ${q.anchorPhrase} »`;

    const isAyahGuessQuestion = q.promptKey === 'sim_game_q_position_ayah';
    const isSurahGuessQuestion = q.promptKey === 'sim_game_q_position_surah';
    const showBadge = !isAyahGuessQuestion; // راجع تعليق buildOccurrenceHTML أعلاه
    const showSurahMeta = !isSurahGuessQuestion;

    const occurrenceHTML = buildOccurrenceHTML(baseText, q, o, showBadge);
    const metaHTML = showSurahMeta ? `<div class="sim-occ-meta">${o.surahName || ''}</div>` : '';

    const promptText = t(q.promptKey);
    const optionsHTML = q.options.map(opt => {
        const label = isAyahGuessQuestion ? `${t('sim_game_opt_ayah_prefix')} ${opt}` : opt;
        const extraClass = q.type === 'sim_ending' ? ' quran-text' : '';
        return `<button class="btn btn-outline sim-play-option-btn${extraClass}" data-opt="${encodeURIComponent(String(opt))}">${label}</button>`;
    }).join('');

    container.innerHTML = `
        <div class="sim-group-card">
            <div class="sim-occ sim-occ-single">
                ${occurrenceHTML}
                ${metaHTML}
            </div>
            <div class="sim-play-prompt">${promptText}</div>
            <div class="sim-play-options">${optionsHTML}</div>
            <div class="sim-play-feedback" id="simplay-feedback"></div>
        </div>`;

    container.querySelectorAll('.sim-play-option-btn').forEach(btn => {
        btn.addEventListener('click', () => handleAnswer(btn, q));
    });
}

function handleAnswer(btn, q) {
    // 🛡️ تعطيل كل الأزرار فور أول اختيار — يمنع نقرات متعددة سريعة قبل انتقال السؤال التالي
    document.querySelectorAll('.sim-play-option-btn').forEach(b => b.disabled = true);

    const chosen = decodeURIComponent(btn.dataset.opt);
    const isCorrect = String(chosen) === String(q.correctAnswer);
    const feedbackEl = document.getElementById('simplay-feedback');

    if (isCorrect) {
        // 🌟 نفس فئات .btn-correct/.btn-wrong المستخدمة فعلياً في شاشات التقييم الأخرى تحت
        // ثيم "الكبار" (adults.css) — إعادة استخدام بدل اختراع ألوان جديدة، حفاظاً على نفس
        // الهوية البصرية المعتمدة في المنصة.
        btn.classList.add('btn-correct');
        playSuccessSound();
        PlayState.correctCount++;
        if (feedbackEl) feedbackEl.textContent = t('sim_game_correct_feedback');
        showToastEncouragement('toast-encouragement');
    } else {
        btn.classList.add('btn-wrong');
        playErrorSound();
        // 🌟 نُظهر الإجابة الصحيحة أيضاً حتى يتعلّم الطفل من خطئه فوراً بدل الاكتفاء بتعليمه
        // أنه أخطأ فقط — هذا بالضبط ما يُرسِّخ حفظ الفرق بين المتشابهات (هدف اللعبة الأساسي)
        document.querySelectorAll('.sim-play-option-btn').forEach(b => {
            if (decodeURIComponent(b.dataset.opt) === String(q.correctAnswer)) b.classList.add('btn-correct');
        });
        if (feedbackEl) feedbackEl.textContent = t('sim_game_wrong_feedback');
    }

    setTimeout(nextQuestion, 1400);
}

function nextQuestion() {
    PlayState.currentIndex++;
    if (PlayState.currentIndex >= PlayState.round.questions.length) {
        renderResultsScreen();
    } else {
        renderQuestion();
    }
}

function renderResultsScreen() {
    const container = document.getElementById('simplay-container');
    if (!container) return;
    triggerConfetti();
    playSuccessSound();
    const total = PlayState.round.questions.length;
    container.innerHTML = `
        <div class="sim-group-card sim-play-results">
            <div class="sim-play-results-title">${t('sim_game_results_title')}</div>
            <div class="sim-play-results-score">${PlayState.correctCount} / ${total}</div>
            <button class="btn btn-outline" id="simplay-btn-again">${t('sim_game_play_again_btn')}</button>
        </div>`;
    document.getElementById('simplay-btn-again')?.addEventListener('click', () => {
        // 🌟 إعادة بناء الجولة من الصفر (وليس فقط خلط نفس المصفوفة القديمة) حتى تتغيّر
        // المشتتات عشوائياً أيضاً في كل محاولة — ولأن buildGameRound تختار عشوائياً من كل
        // الأسئلة المتاحة (سقف MAX_ROUND_QUESTIONS)، هذا يعني أيضاً مجموعة فرعية مختلفة من
        // الأسئلة نفسها في كل محاولة لو النطاق أكبر من السقف، بدل تكرار نفس الخيارات بالضبط
        PlayState.round = buildGameRound(PlayState.groups);
        PlayState.currentIndex = 0;
        PlayState.correctCount = 0;
        renderQuestion();
    });
}
