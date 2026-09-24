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
// 🌟 [جديد — 2026-09-23] allGroupsPool: كل مجموعات المتشابهات في المنصة (لا فقط مجموعات نطاق
// الجولة الحالية) — يُحمَّل مرة واحدة عند بدء اللعبة ويُخزَّن هنا لإعادة استخدامه في "العب مرة
// أخرى" بلا إعادة استعلام IndexedDB. يلزم لسؤال "التعرّف" (sim_recognition) الذي يحتاج مشتتات
// دخيلة من مجموعات أخرى تماماً — راجع تعليق generateRecognitionQuestions في
// engine/similarityEngine.js.
let PlayState = { groups: [], allGroupsPool: [], scopeTitle: '', round: null, currentIndex: 0, correctCount: 0 };

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

    // 🌟 [جديد — 2026-09-23] نجلب كل مجموعات المتشابهات في المنصة (وليس فقط مجموعات هذا
    // النطاق) لبناء مشتتات "التعرّف" الدخيلة — راجع تعليق PlayState.allGroupsPool أعلاه.
    const allGroupsPool = await AppState.similaritiesManager.getAllSimilarities();

    const round = buildGameRound(groups, allGroupsPool);
    // 🛡️ خط دفاع صريح (لا نفترض صمتاً أن كل مجموعة صالحة للعب): لو لم تتوفر بيانات كافية
    // (كل المجموعات بموضع واحد، أو كل مواضعها بنفس رقم آية/سورة...) نعرض رسالة ودّية للمعلم
    // بدل شاشة أسئلة فارغة أو خطأ برمجي — راجع تعليق buildGameRound في
    // engine/similarityEngine.js لتفاصيل الحالات المُستبعَدة.
    if (!round.hasEnoughData) {
        container.innerHTML = `<div class="sim-empty">${t('sim_game_not_enough_data')}</div>`;
        return;
    }

    PlayState = { groups, allGroupsPool, scopeTitle: title, round, currentIndex: 0, correctCount: 0 };
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

    // 🌟 [عدّل — 2026-09-23] sim_discrimination (التمييز) تستخدم بالضبط نفس منطق الإخفاء
    // المستخدم في sim_ending — الفارق الوحيد أن q.correctAnswer هنا "مقطع مميِّز" مُشتق آلياً
    // من fullText (deriveDistinguishingSegment في engine/similarityEngine.js) بدل
    // distinctiveTailWord اليدوي، لكن blankPhraseInText/findPhraseRanges يتعاملان مع أي نص
    // مُمرَّر بنفس الطريقة تماماً بلا حاجة لأي تمييز إضافي هنا.
    if (q.type === 'sim_ending' || q.type === 'sim_discrimination') {
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

// 🌟 [جديد — 2026-09-23] بناء سياق العرض (النص/الموضع المعروض قبل الخيارات) لكل نوع سؤال —
// أنواع "التعرّف"/"الاستدعاء"/"منع الخلط" الجديدة لا تعرض نصاً كاملاً ومظلَّلاً كسائر
// الأسئلة (هذا هو صلب الفرق بينها وبين sim_position/sim_ending/sim_discrimination)، فاستُخرج
// هذا المنطق لدالة مستقلة بدل توسيع renderQuestion بفروع if/else متشابكة. راجع تعليق كل فرع
// لسبب اختيار طريقة العرض هذه تحديداً وربطها بالمهارة المستهدفة (تفصيل كامل في تعليق رأس
// engine/similarityEngine.js).
async function buildContextHTML(q, o) {
    if (q.type === 'sim_position' || q.type === 'sim_ending' || q.type === 'sim_discrimination') {
        const isAyahGuessQuestion = q.promptKey === 'sim_game_q_position_ayah';
        const isSurahGuessQuestion = q.promptKey === 'sim_game_q_position_surah';
        const showBadge = !isAyahGuessQuestion; // راجع تعليق buildOccurrenceHTML أعلاه
        const showSurahMeta = !isSurahGuessQuestion;
        const baseText = await resolveDisplayText(o, q.scope);
        const occurrenceHTML = buildOccurrenceHTML(baseText, q, o, showBadge);
        const metaHTML = showSurahMeta ? `<div class="sim-occ-meta">${o.surahName || ''}</div>` : '';
        return `<div class="sim-occ sim-occ-single">${occurrenceHTML}${metaHTML}</div>`;
    }

    if (q.type === 'sim_recitation_check' || q.type === 'sim_recognition') {
        // منع الخلط أثناء التسميع: بلا أي سياق مساعد (لا نص، لا رقم آية، لا اسم سورة) — فقط
        // عبارة الالتقاء المشتركة (المعروضة أصلاً في صندوق العنوان أعلى الشاشة) ثم الخيارات
        // مباشرة، بقصد محاكاة لحظة الالتباس الحقيقية أثناء التسميع الحي.
        // التعرّف: أيضاً بلا سياق — الخيارات نفسها آيات كاملة (واحدة صحيحة من نفس المجموعة،
        // والباقي دخيل من مجموعات مختلفة)، فلا داعي لعرض أي نص إضافي قبلها.
        return '';
    }

    if (q.type === 'sim_recall') {
        // الاستدعاء (موجّه): نعرض "أين" فقط (رقم الآية أو اسم السورة) بلا أي نص — عكس اتجاه
        // sim_position تماماً بقصد (راجع تعليق generateGuidedRecallQuestions في
        // engine/similarityEngine.js). لا خطر تسريب هنا: الإجابة المطلوبة هي النص لا الموضع.
        const positionLabel = o.ayahNumber != null
            ? `${o.surahName || ''} — ${t('sim_game_opt_ayah_prefix')} ${o.ayahNumber}`
            : (o.surahName || '');
        return `<div class="sim-recall-position">${positionLabel}</div>`;
    }

    return '';
}

// 🌟 [جديد — 2026-09-23] أنواع الخيارات: "قصيرة" (أرقام آيات/أسماء سور/مقاطع مميِّزة، أزرار
// متجاورة أفقياً كالسابق) أو "نص كامل" (آيات كاملة لأسئلة التعرّف/الاستدعاء، تحتاج عرضاً
// كاملاً وسطراً مستقلاً لكل خيار — راجع .sim-play-option-fulltext في css/similarities.css).
const FULLTEXT_OPTION_TYPES = new Set(['sim_recognition', 'sim_recall']);

function buildOptionsHTML(q) {
    const isAyahGuessQuestion = q.promptKey === 'sim_game_q_position_ayah';
    const isFullText = FULLTEXT_OPTION_TYPES.has(q.type);
    const useQuranFont = q.type !== 'sim_position'; // sim_position خياراتها أرقام/أسماء سور، لا نص قرآني
    return q.options.map(opt => {
        const label = isAyahGuessQuestion ? `${t('sim_game_opt_ayah_prefix')} ${opt}` : opt;
        const classes = ['btn', 'btn-outline', 'sim-play-option-btn'];
        if (useQuranFont) classes.push('quran-text');
        if (isFullText) classes.push('sim-play-option-fulltext');
        return `<button class="${classes.join(' ')}" data-opt="${encodeURIComponent(String(opt))}">${label}</button>`;
    }).join('');
}

async function renderQuestion() {
    const container = document.getElementById('simplay-container');
    if (!container) return;
    updateProgressUI();

    const q = PlayState.round.questions[PlayState.currentIndex];
    const o = q.occurrence;

    // 🌟 [جديد — 2026-09-16، الجولة الثانية] صندوق العنوان الذهبي (#simplay-anchor) كان
    // يُضبط مرة واحدة فقط عند بداية الجولة (لأن الجولة كانت كلها من مجموعة واحدة بعبارة
    // واحدة). بعد خلط مجموعات مختلفة في الجولة الواحدة، أصبح يتحدّث مع كل سؤال ليعرض عبارة
    // مجموعة هذا السؤال تحديداً — بنفس شكل الصندوق المستخدم في شاشات التصفح بالضبط.
    const anchorEl = document.getElementById('simplay-anchor');
    if (anchorEl) anchorEl.textContent = `« ${q.anchorPhrase} »`;

    const contextHTML = await buildContextHTML(q, o);
    const promptText = t(q.promptKey);
    const optionsHTML = buildOptionsHTML(q);
    const optionsExtraClass = FULLTEXT_OPTION_TYPES.has(q.type) ? ' sim-play-options-fulltext' : '';

    container.innerHTML = `
        <div class="sim-group-card">
            ${contextHTML}
            <div class="sim-play-prompt">${promptText}</div>
            <div class="sim-play-options${optionsExtraClass}">${optionsHTML}</div>
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
        PlayState.round = buildGameRound(PlayState.groups, PlayState.allGroupsPool);
        PlayState.currentIndex = 0;
        PlayState.correctCount = 0;
        renderQuestion();
    });
}
