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
import { AppState, loadSplashScreen, openSimilaritiesBrowser, t, tf, surahNameLocal } from '../core/app.js';
import { buildSessionMessage, weakPlaces } from '../engine/similarityParentMsg.js';
import { toggleParentShare } from '../components/simParentShare.js';
import { showToastEncouragement, triggerConfetti } from '../components/ui.js';
import { JUZ_BUCKETS, bucketTitle } from './similarities.js';
import { buildGameRound } from '../engine/similarityEngine.js';
import { memorizedSurahsOf } from '../engine/recallQuestions.js';
// سور محفوظ الطالب الحالي (إن وُجد طالب بنطاق حفظ) لئلا تُسأل أسئلة جوابها أو خياراتها سور لم يحفظها؛ null = بلا قيد
// 🌟 [2026-11-07] في «تدريب اليوم» الطالب معروف مسبقاً فنقيّد الخيارات بمحفوظه هو (لا بالطالب الحالي في ركن الكبار)
const studentMemorized = () => PlayState.dailyStudent
    ? coachMemo(memorizedSurahsOf(PlayState.dailyStudent, AppState.surahsData)).memo
    : memorizedSurahsOf(AppState.currentStudent, AppState.surahsData);
import { planStudentRound, studentCoachSummary, coachMemo, isMultiSurah, SINGLE_SURAH_TYPES, comparePlaces } from '../engine/similarityCoach.js';
import { toQuranicSukun } from '../engine/quranEngine.js';
import { isSimScopeDisabled, generateQuestionsForGroup } from '../engine/similarityEngine.js';
import { generateRecallQuestions } from '../engine/recallQuestions.js';
import { recallAnswerHTML, recallHintStages } from '../components/similarGameHook.js';
import { localizedRecallText } from '../engine/recallQuestions.js';
import { ensureSimilarityQuran, getSimilarityQuran, questionTextToHTML, stripHizbMark, localizedQuestionText, pairOptionLabel } from '../engine/similarityQuestions.js';
import { groupSignature, groupAnswersBySignature, summarizeByType, levelOf } from '../engine/similarityMastery.js';

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
let PlayState = { groups: [], scopeTitle: '', round: null, currentIndex: 0, correctCount: 0, student: null, answers: [], sigById: new Map() };

// 🌟 [2026-10-11] آخر طالب لعب (تذكّر بسيط لتسهيل الاختيار) — كل قراءة/كتابة محمية بـtry/catch
const LAST_STUDENT_KEY = 'dh_sim_last_student';
function readLastStudentId() { try { return localStorage.getItem(LAST_STUDENT_KEY); } catch (e) { return null; } }
function writeLastStudentId(id) { try { localStorage.setItem(LAST_STUDENT_KEY, String(id)); } catch (e) { /* لا شيء */ } }

function escapeHtmlText(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// 🌟 [جديد] يحل مجموعات اللعب الفعلية + عنوان النطاق من كائن scope الممرَّر عبر
// AppState.similarityGamePlayScope — راجع تعليق رأس الملف وتعليق الحقل في core/app.js.
// 🌟 [2026-11-07 — بطلب المعلم] أنواع أسئلة ركن المتشابهات (تدريب اليوم + لعبة السورة/الجزء):
//   مجموعة ممتدة على سورتين فأكثر ← «في أي سورتين؟» و«أي سورة لم ترد؟» و«أيّ الآيتين من سورة كذا؟» و«صِل الآية بسورتها»
//   متشابهات السورة مع نفسها      ← «أكمل الآية» (الأنواع السابقة لا تُولَّد لها)
//   ومن محفوظ الطالب كله           ← «اقرأ الآية من السورة المذكورة» (شفهي يقيّمه المعلم، من engine/recallQuestions.js)
// لعبة الكبار والواجب بلا تغيير (STUDENT_SIM_TYPES هناك كما هو).
const MULTI_TYPES = ['sim_pair', 'sim_notin', 'sim_which', 'sim_match'];
const typesFor = (g) => isMultiSurah(g) ? MULTI_TYPES : SINGLE_SURAH_TYPES;
const MAX_DAILY_QUESTIONS = 18;
const MAX_RETRIES = 3;   // «فرصة ثانية»: أقصى عدد أسئلة إعادة تُضاف لآخر الجولة
const RECALL_PER_ROUND = 2;   // «اقرأ الآية من السورة المذكورة» في الجولة
const shuffleArr = (a) => { const r = a.slice(); for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; } return r; };

// سور نطاق اللعبة (سورة/جزء)؛ «تدريب اليوم» نطاقه محفوظ الطالب كله فيعيد null
function scopeSurahSet(scope) {
    if (!scope) return null;
    if (scope.type === 'surah') return new Set([Number(scope.surahNumber)]);
    if (scope.type === 'juz') {
        const b = scope.juzId === 'amma' ? { from: 78, to: 114 } : JUZ_BUCKETS.find(x => x.id === scope.juzId);
        if (!b) return null;
        const out = new Set(); for (let n = b.from; n <= b.to; n++) out.add(n); return out;
    }
    return null;
}

// آيات نطاق الجولة (لأسئلة «اقرأ الآية من السورة المذكورة»: الآية المرجعية من النطاق دائماً، راجع CLAUDE.md)
function scopePoolOf(surahSet) {
    const Q = getSimilarityQuran();
    const pool = [];
    if (!Q || !surahSet) return pool;
    surahSet.forEach(sn => { const sd = Q.surahs.get(sn); if (sd) sd.verses.forEach((v, n) => pool.push({ surahNumber: sn, numberInSurah: n })); });
    return pool;
}

// سؤالان على الأكثر من كل مجموعة (فتظهر كل المجموعات) + أسئلة الاستحضار، ثم خلط بسقف 18
function buildPlayRound(groups) {
    const memo = studentMemorized();
    // «أي الآيتين من سورة كذا؟»: السورة المسمّاة يجب أن تكون من نطاق الجولة (سورة/جزء)، لا سورة شبيهة خارجه
    const scopeSet = PlayState.scopeSurahs || null;
    // توازن الأنواع: من كل مجموعة سؤالان من نوعين مختلفين، ويُفضَّل الأقل ظهوراً في الجولة حتى الآن
    // (كان «أيّ الآيتين» نصف الجولة لأنه يتولّد مع كل مجموعة)، وبسقف: «أيّ الآيتين» 4 و«صِل» 2 (أطول)
    const used = {};
    const CAP = { sim_match: 2, sim_which: 4 };   // سقف بعض الأنواع في الجولة الواحدة
    let all = [];
    shuffleArr(groups.filter(g => !isSimScopeDisabled(g))).forEach(g => {
        let qs = generateQuestionsForGroup(g, { types: typesFor(g), memorized: memo, match: true });
        if (scopeSet) qs = qs.filter(q => q.type !== 'sim_which' || scopeSet.has(q.occurrence.surahNumber));
        qs = shuffleArr(qs);
        const picked = [];
        for (let k = 0; k < 2; k++) {
            const pool = qs.filter(q => !picked.some(x => x.type === q.type) && (used[q.type] || 0) < (CAP[q.type] ?? Infinity));
            if (!pool.length) break;
            pool.sort((x, y) => (used[x.type] || 0) - (used[y.type] || 0));
            picked.push(pool[0]);
            used[pool[0].type] = (used[pool[0].type] || 0) + 1;
        }
        all = all.concat(picked);
    });
    let recall = [];
    try {
        const area = scopeSet || memo;
        const mem = memo || area;
        if (mem && area) recall = generateRecallQuestions(getSimilarityQuran(), mem, scopePoolOf(area), { count: RECALL_PER_ROUND, types: ['sim_named'] })
            .map(r => ({ ...r, type: r.kind }));
    } catch (e) { console.warn('تعذّر توليد «اقرأ الآية من السورة المذكورة»:', e); }
    const questions = shuffleArr(shuffleArr(all).slice(0, MAX_DAILY_QUESTIONS - recall.length).concat(recall));
    return { groupIds: groups.map(g => g.groupId), questions, hasEnoughData: questions.length > 0, totalAvailable: all.length + recall.length };
}
const buildRound = (groups) => buildPlayRound(groups);

async function resolveScopeGroups(scope) {
    if (!scope || !AppState.similaritiesManager) return { groups: [], title: '' };
    // 🌟 [2026-10-03] ننتظر تحميل الـ Seed الذي صار في الخلفية أثناء الإقلاع (core/app.js)
    if (AppState.similaritiesReady) await AppState.similaritiesReady;

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
        return { groups, title: bucketTitle(bucket) };
    }

    // 🌟 [2026-11-07] «تدريب اليوم» لطالب: مجموعات من محفوظه فقط بترتيب حان موعده ← ضعيف ← جديد
    if (scope.type === 'student') {
        let student = null;
        try { student = (await AppState.studentManager.getAllStudents()).find(st => String(st.id) === String(scope.studentId)) || null; } catch (e) { student = null; }
        if (!student) return { groups: [], title: '' };
        const all = await AppState.similaritiesManager.getAllSimilarities();
        let records = [];
        try { records = await AppState.similaritiesManager.getProgressByStudent(student.id); } catch (e) { records = []; }
        const { memo } = coachMemo(memorizedSurahsOf(student, AppState.surahsData));
        // نتأكد أن كل مجموعة مختارة تولّد سؤالاً فعلاً لهذا الطالب (الخيارات مقيّدة بمحفوظه)
        try { await ensureSimilarityQuran(AppState.quranEngine); } catch (e) { /* يُعالَج لاحقاً في initSimilarityGamePlay */ }
        const canAsk = (g) => generateQuestionsForGroup(g, { types: typesFor(g), memorized: memo, match: true }).length > 0;
        const plan = planStudentRound(all, records, memo, { isPlayable: g => !isSimScopeDisabled(g), canAsk });
        return { groups: plan.groups, title: `${t('sim_daily_title')} — ${student.name}`, student };
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

    const { groups, title, student: dailyStudent } = await resolveScopeGroups(scope);
    PlayState.dailyStudent = dailyStudent || null;
    PlayState.scopeSurahs = scopeSurahSet(scope);
    if (groups.length === 0) {
        container.innerHTML = `<div class="sim-empty">${t('sim_no_data')}</div>`;
        return;
    }

    const anchorEl = document.getElementById('simplay-anchor');
    if (anchorEl) anchorEl.textContent = ''; // 🌟 يُحدَّث لاحقاً لكل سؤال على حدة (راجع renderQuestion)
    const titleEl = document.getElementById('simplay-title');
    if (titleEl) titleEl.textContent = `${t('sim_game_title')} — ${title}`;

    // نص الآيات يُقرأ من مصحف المنصة (لا من fullText في بيانات المجموعات)
    try { await ensureSimilarityQuran(AppState.quranEngine); }
    catch (e) { console.warn('تعذّر تحميل المصحف لأسئلة المتشابهات:', e); container.innerHTML = `<div class="sim-empty">${t('sim_no_data')}</div>`; return; }

    const round = buildRound(groups);
    // 🛡️ خط دفاع صريح (لا نفترض صمتاً أن كل مجموعة صالحة للعب): لو لم تتوفر بيانات كافية
    // (كل المجموعات بموضع واحد، أو كل مواضعها بنفس رقم آية/سورة...) نعرض رسالة ودّية للمعلم
    // بدل شاشة أسئلة فارغة أو خطأ برمجي — راجع تعليق buildGameRound في
    // engine/similarityEngine.js لتفاصيل الحالات المُستبعَدة.
    if (!round.hasEnoughData) {
        container.innerHTML = `<div class="sim-empty">${t('sim_game_not_enough_data')}</div>`;
        return;
    }

    PlayState = { groups, scopeTitle: title, round, currentIndex: 0, correctCount: 0, student: null, answers: [], dailyStudent: dailyStudent || null, retries: 0, scopeSurahs: PlayState.scopeSurahs,
        sigById: new Map(groups.map(g => [g.groupId, groupSignature(g)])) };
    // «تدريب اليوم»: الطالب محدد مسبقاً فلا حاجة لشاشة اختياره
    if (dailyStudent) { PlayState.student = dailyStudent; writeLastStudentId(dailyStudent.id); initAudio(); renderQuestion(); return; }
    await showStudentPicker();
}

// 🌟 [2026-10-11] اختيار الطالب قبل الجولة: لتُحفظ نتيجته ويُقاس إتقانه لكل مجموعة. «بدون حفظ» يبقي
// السلوك القديم (لعب تدريبي حر بلا تسجيل).
async function showStudentPicker() {
    const container = document.getElementById('simplay-container');
    if (!container) return;
    let students = [];
    try { students = AppState.studentManager ? await AppState.studentManager.getAllStudents() : []; } catch (e) { students = []; }
    const lastId = readLastStudentId();
    const btns = students.map(st => `<button class="btn sim-pick-student-btn${String(st.id) === lastId ? ' sim-pick-last' : ''}" data-student="${escapeHtmlText(st.id)}">${escapeHtmlText(st.name)}</button>`).join('');
    container.innerHTML = `
        <div class="sim-group-card sim-pick-student">
            <div class="sim-play-prompt">${t('sim_pick_student_title')}</div>
            <p class="sim-pick-hint">${students.length ? t('sim_pick_student_hint') : t('sim_pick_no_students')}</p>
            <div class="sim-pick-grid">${btns}</div>
            <button class="btn btn-outline sim-pick-guest" id="simplay-guest">${t('sim_pick_guest_btn')}</button>
        </div>`;
    const anchorEl = document.getElementById('simplay-anchor');
    if (anchorEl) anchorEl.textContent = '';
    const progEl = document.getElementById('simplay-progress');
    if (progEl) progEl.textContent = '';
    const begin = (student) => {
        PlayState.student = student;
        if (student) writeLastStudentId(student.id);
        initAudio();
        renderQuestion();
    };
    container.querySelectorAll('.sim-pick-student-btn').forEach(b => {
        b.addEventListener('click', () => begin(students.find(st => String(st.id) === b.dataset.student) || null));
    });
    document.getElementById('simplay-guest')?.addEventListener('click', () => begin(null));
}

function updateProgressUI() {
    const el = document.getElementById('simplay-progress');
    if (el) el.textContent = `${PlayState.currentIndex + 1} / ${PlayState.round.questions.length}`;
}

// 🌟 [إعادة كتابة] الأسئلة الأربعة (من أي سورة؟ / أكمل الآية / ماذا بعدها؟ / ما قبلها؟) يولّدها engine/similarityQuestions.js
// بنص سؤال كامل جاهز (الآيات بين ﴿ ﴾ والسياق داخله، بلا أي رقم آية)، فلا حاجة لبناء سياق خاص بكل نوع هنا:
// نعرض نص السؤال كما هو ثم الخيارات. الخيارات القرآنية آيات/نهايات آيات تُعرض بسطر مستقل لكل خيار.
const SURAH_OPTION_TYPES = new Set(['sim_pair', 'sim_notin']);

function buildOptionsHTML(q) {
    const isSurah = SURAH_OPTION_TYPES.has(q.type);
    return q.options.map((opt, i) => {
        const classes = ['btn', 'btn-outline', 'sim-play-option-btn'];
        if (!isSurah) classes.push('quran-text', 'sim-play-option-fulltext');
        // 🌟 [2026-11-07] نفس عرض أسئلة المتشابهات في لعبة الكبار (components/similarGameHook.js): الآية بين ﴿ ﴾ وبالسكون القرآني
        const label = isSurah ? pairOptionLabel(opt) : '﴿ ' + toQuranicSukun((q.optionsDisplay && q.optionsDisplay[i]) || opt) + ' ﴾';
        return `<button class="${classes.join(' ')}" data-opt="${encodeURIComponent(String(opt))}">${escapeHtmlText(label)}</button>`;
    }).join('');
}

async function renderQuestion() {
    const container = document.getElementById('simplay-container');
    if (!container) return;
    updateProgressUI();

    const q = PlayState.round.questions[PlayState.currentIndex];

    // صندوق العنوان الذهبي (#simplay-anchor) يعرض عبارة مجموعة هذا السؤال تحديداً (الجولة تخلط مجموعات مختلفة)
    const anchorEl = document.getElementById('simplay-anchor');
    if (anchorEl) anchorEl.textContent = `« ${stripHizbMark(q.anchorPhrase)} »`;

    if (q.type === 'sim_match') { renderMatchQuestion(container, q); return; }
    if (q.type === 'sim_named') { renderNamedQuestion(container, q); return; }

    const optionsExtraClass = SURAH_OPTION_TYPES.has(q.type) ? '' : ' sim-play-options-fulltext';
    container.innerHTML = `
        <div class="sim-group-card">
            ${q.retry ? `<div class="sim-retry-badge">${t('sim_retry_badge')}</div>` : ''}
            <div class="sim-play-prompt sim-q-text sim-q-platform">${questionTextToHTML(localizedQuestionText(q), toQuranicSukun)}</div>
            <div class="sim-play-options${optionsExtraClass}">${buildOptionsHTML(q)}</div>
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
    recordAnswer(q, isCorrect);

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
        // 🌟 [2026-11-07] بدل الانتقال الآلي: «قارن بين المتشابهات» (الكلمات المختلفة مميَّزة) + «فرصة ثانية» آخر الجولة،
        // ثم ينتقل الطالب بزر «التالي» حين يفرغ من المقارنة
        queueRetry(q);
        showComparison(q, feedbackEl);
        return;
    }

    setTimeout(nextQuestion, 1400);
}

// نص رسالة ولي الأمر بعد الجلسة (الإتقان محسوب بعد حفظ الجولة، فيشمل نتيجة اليوم)
async function sessionParentText(student, total, correct, answers) {
    let mastered = 0, eligible = 0;
    try {
        const all = await AppState.similaritiesManager.getAllSimilarities();
        const records = await AppState.similaritiesManager.getProgressByStudent(student.id);
        const { memo } = coachMemo(memorizedSurahsOf(student, AppState.surahsData));
        const sum = studentCoachSummary(all, records, memo, { isPlayable: g => !isSimScopeDisabled(g) });
        mastered = sum.mastered; eligible = sum.total;
    } catch (e) { /* الرسالة تُبنى بلا سطر الإتقان */ }
    const weak = weakPlaces(answers).map(w => ({ phrase: stripHizbMark(w.phrase), surahNames: w.surahs.map(n => surahNameLocal(n)) }));
    const teacher = AppState.teacherName || (AppState.currentTeacher && AppState.currentTeacher.name) || '';
    return buildSessionMessage(tf, { name: student.name, girl: student.gender === 'girl', correct, total, mastered, eligible, weak, teacher });
}

// تسجيل الإجابة لنموذج الإتقان. أسئلة الاستحضار ليست من مجموعات قاعدة المتشابهات: مفتاحها ثابت بموضع الآية المرجعية
function recordAnswer(q, isCorrect) {
    const recall = q.scope === 'recall';
    const occ = q.occurrence || {};
    PlayState.answers.push({
        sig: recall ? `recall:${occ.surahNumber}:${occ.ayahNumber}` : (PlayState.sigById.get(q.groupId) || q.groupId),
        groupId: q.groupId, anchorPhrase: q.anchorPhrase,
        surahs: recall ? [occ.surahNumber] : ((PlayState.groups.find(g => g.groupId === q.groupId) || {}).surahs || []),
        scope: q.scope, type: q.type, isCorrect
    });
}

// صحيحة: تشجيع ثم السؤال التالي آلياً. خاطئة: «قارن» + «فرصة ثانية» + زر «التالي»
function afterAnswer(q, isCorrect, feedbackEl) {
    if (isCorrect) {
        playSuccessSound();
        PlayState.correctCount++;
        if (feedbackEl) feedbackEl.textContent = t('sim_game_correct_feedback');
        showToastEncouragement('toast-encouragement');
        setTimeout(nextQuestion, 1400);
        return;
    }
    playErrorSound();
    if (feedbackEl) feedbackEl.textContent = t('sim_game_wrong_feedback');
    queueRetry(q);
    showComparison(q, feedbackEl);
}

// ---- «صِل الآية بسورتها»: اضغط آية ثم سورتها؛ الضغط على زوج مربوط يفكّه؛ «تحقّق» حين تكتمل الأزواج ----
function renderMatchQuestion(container, q) {
    const m = q.match;
    const pairs = new Map();   // leftId -> rightId
    let selLeft = null;
    const leftHTML = m.left.map(l => `<button type="button" class="sim-match-item sim-match-left" data-id="${l.id}"><span class="quran-text">﴿ ${escapeHtmlText(toQuranicSukun(l.text))} ﴾</span></button>`).join('');
    const rightHTML = m.right.map(r => `<button type="button" class="sim-match-item sim-match-right" data-id="${r.id}">${escapeHtmlText(surahNameLocal(r.text))}</button>`).join('');
    container.innerHTML = `
        <div class="sim-group-card">
            ${q.retry ? `<div class="sim-retry-badge">${t('sim_retry_badge')}</div>` : ''}
            <div class="sim-play-prompt sim-q-text sim-q-platform">${t('sim_q_match_play')}</div>
            <p class="sim-match-hint">${t('sim_match_hint')}</p>
            <div class="sim-match-board"><div class="sim-match-col">${leftHTML}</div><div class="sim-match-col sim-match-col-r">${rightHTML}</div></div>
            <button class="btn sim-next-btn" id="simplay-match-check" disabled>${t('sim_match_check_btn')}</button>
            <div class="sim-play-feedback" id="simplay-feedback"></div>
        </div>`;
    const paint = () => {
        const rightUsed = new Map([...pairs].map(([l, r]) => [r, l]));
        const num = new Map([...pairs.keys()].map((l, i) => [l, i + 1]));
        container.querySelectorAll('.sim-match-left').forEach(b => {
            const id = b.dataset.id; b.classList.toggle('is-sel', id === selLeft); b.classList.toggle('is-paired', pairs.has(id));
            b.dataset.n = pairs.has(id) ? num.get(id) : '';
        });
        container.querySelectorAll('.sim-match-right').forEach(b => {
            const l = rightUsed.get(b.dataset.id); b.classList.toggle('is-paired', !!l); b.dataset.n = l ? num.get(l) : '';
        });
        const chk = document.getElementById('simplay-match-check');
        if (chk) chk.disabled = pairs.size !== m.left.length;
    };
    container.querySelectorAll('.sim-match-left').forEach(b => b.addEventListener('click', () => {
        if (b.disabled) return;
        const id = b.dataset.id;
        if (pairs.has(id)) { pairs.delete(id); selLeft = null; } else selLeft = selLeft === id ? null : id;
        paint();
    }));
    container.querySelectorAll('.sim-match-right').forEach(b => b.addEventListener('click', () => {
        if (b.disabled) return;
        const id = b.dataset.id;
        const owner = [...pairs].find(([, r]) => r === id);
        if (owner) { pairs.delete(owner[0]); paint(); return; }
        if (!selLeft) return;
        pairs.set(selLeft, id); selLeft = null; paint();
    }));
    document.getElementById('simplay-match-check').addEventListener('click', (e) => {
        e.currentTarget.disabled = true;
        container.querySelectorAll('.sim-match-item').forEach(b => { b.disabled = true; });
        const truth = new Map(m.pairs.map(p => [p.left, p.right]));
        let ok = true;
        container.querySelectorAll('.sim-match-left').forEach(b => {
            const good = pairs.get(b.dataset.id) === truth.get(b.dataset.id);
            if (!good) ok = false;
            b.classList.add(good ? 'is-right' : 'is-wrong');
            // الخاطئ يعرض سورته الصحيحة
            if (!good) {
                const r = m.right.find(x => x.id === truth.get(b.dataset.id));
                b.insertAdjacentHTML('beforeend', `<span class="sim-match-fix">← ${escapeHtmlText(surahNameLocal(r ? r.text : ''))}</span>`);
            }
        });
        recordAnswer(q, ok);
        afterAnswer(q, ok, document.getElementById('simplay-feedback'));
    });
}

// ---- «اقرأ الآية من السورة المذكورة»: سؤال شفهي — الطالب يقرأ، والمعلم يكشف الجواب ويقيّم (كما في لعبة الكبار) ----
function renderNamedQuestion(container, q) {
    const hints = (() => { try { return recallHintStages(q); } catch (e) { return []; } })();
    let shown = 0;
    container.innerHTML = `
        <div class="sim-group-card">
            ${q.retry ? `<div class="sim-retry-badge">${t('sim_retry_badge')}</div>` : ''}
            <div class="sim-oral-badge">${t('sim_oral_badge')}</div>
            <div class="sim-play-prompt sim-q-text sim-q-platform">${questionTextToHTML(localizedRecallText(q), toQuranicSukun)}</div>
            <div class="sim-named-hints" id="simplay-hints"></div>
            <div class="sim-named-answer" id="simplay-answer" hidden></div>
            <div class="sim-named-actions" id="simplay-named-actions">
                ${hints.length ? `<button class="btn btn-outline" id="simplay-hint">${t('sim_hint_btn')}</button>` : ''}
                <button class="btn" id="simplay-reveal">${t('sim_reveal_btn')}</button>
            </div>
            <div class="sim-play-feedback" id="simplay-feedback"></div>
        </div>`;
    document.getElementById('simplay-hint')?.addEventListener('click', (e) => {
        if (shown >= hints.length) return;
        document.getElementById('simplay-hints').insertAdjacentHTML('beforeend', `<div class="sim-named-hint">${hints[shown++]}</div>`);
        if (shown >= hints.length) e.currentTarget.disabled = true;
    });
    document.getElementById('simplay-reveal').addEventListener('click', () => {
        const ans = document.getElementById('simplay-answer');
        try { ans.innerHTML = recallAnswerHTML(q); } catch (e) { ans.innerHTML = `<span class="quran-text">﴿ ${escapeHtmlText(toQuranicSukun(q.correctAnswer))} ﴾</span>`; }
        ans.hidden = false;
        document.getElementById('simplay-named-actions').innerHTML = `
            <button class="btn sim-grade-btn sim-grade-ok" id="simplay-grade-ok">${t('sim_grade_ok')}</button>
            <button class="btn sim-grade-btn sim-grade-no" id="simplay-grade-no">${t('sim_grade_no')}</button>`;
        const grade = (ok) => {
            document.querySelectorAll('.sim-grade-btn').forEach(b => { b.disabled = true; });
            recordAnswer(q, ok);
            // الجواب معروض أصلاً: لا مقارنة ولا «فرصة ثانية» هنا (ليس من مجموعات القاعدة)، فقط زر «التالي» عند الخطأ
            if (ok) { afterAnswer(q, true, document.getElementById('simplay-feedback')); return; }
            playErrorSound();
            const fb = document.getElementById('simplay-feedback');
            if (fb) { fb.textContent = t('sim_game_wrong_feedback'); fb.insertAdjacentHTML('afterend', `<button class="btn sim-next-btn" id="simplay-btn-next">${t('sim_next_btn')}</button>`); }
            document.getElementById('simplay-btn-next')?.addEventListener('click', () => nextQuestion(), { once: true });
        };
        document.getElementById('simplay-grade-ok').addEventListener('click', () => grade(true));
        document.getElementById('simplay-grade-no').addEventListener('click', () => grade(false));
    });
}

// يضيف لآخر الجولة سؤالاً آخر من المجموعة نفسها (بنص مختلف إن أمكن) — مرة واحدة لكل سؤال، وبحد MAX_RETRIES للجولة
function queueRetry(q) {
    if (q.retry || (PlayState.retries || 0) >= MAX_RETRIES) return;
    const g = PlayState.groups.find(x => x.groupId === q.groupId);
    if (!g) return;
    let fresh = generateQuestionsForGroup(g, { types: typesFor(g), memorized: studentMemorized(), match: true });
    if (PlayState.scopeSurahs) fresh = fresh.filter(x => x.type !== 'sim_which' || PlayState.scopeSurahs.has(x.occurrence.surahNumber));
    if (!fresh.length) return;
    const pick = fresh.find(x => x.text !== q.text || x.correctAnswer !== q.correctAnswer) || fresh[0];
    PlayState.round.questions.push({ ...pick, retry: true });
    PlayState.retries = (PlayState.retries || 0) + 1;
}

function showComparison(q, feedbackEl) {
    if (!feedbackEl) { setTimeout(nextQuestion, 1400); return; }
    const g = PlayState.groups.find(x => x.groupId === q.groupId);
    const places = comparePlaces(getSimilarityQuran(), g, studentMemorized());
    const esc = escapeHtmlText;
    const word = (w) => { const x = esc(toQuranicSukun(w.w)); return w.diff ? `<span class="quran-text sim-diff">${x}</span>` : x; };
    const rows = places.map(p => `<div class="sim-compare-row">
            <span class="sim-compare-surah">${esc(surahNameLocal(p.name))}</span>
            <div class="quran-text sim-compare-verse">${p.words.map(word).join(' ')}</div>
        </div>`).join('');
    feedbackEl.insertAdjacentHTML('afterend', `
        ${rows ? `<div class="sim-compare"><div class="sim-compare-h">${t('sim_compare_title')}</div>${rows}</div>` : ''}
        <button class="btn sim-next-btn" id="simplay-btn-next">${t('sim_next_btn')}</button>`);
    const nb = document.getElementById('simplay-btn-next');
    nb?.addEventListener('click', () => nextQuestion(), { once: true });
    nb?.focus({ preventScroll: true });
}

function nextQuestion() {
    PlayState.currentIndex++;
    if (PlayState.currentIndex >= PlayState.round.questions.length) {
        renderResultsScreen();
    } else {
        renderQuestion();
    }
}

async function renderResultsScreen() {
    const container = document.getElementById('simplay-container');
    if (!container) return;
    triggerConfetti();
    playSuccessSound();
    const total = PlayState.round.questions.length;
    const staleAnchor = document.getElementById('simplay-anchor');
    if (staleAnchor) staleAnchor.textContent = ''; // صندوق عنوان آخر سؤال لا معنى له في شاشة النتيجة

    // 🌟 [2026-10-11] حفظ الجولة لملف الطالب وحساب تغيّر إتقان كل مجموعة. أي فشل في الحفظ لا يُسقط شاشة
    // النتيجة: تظهر النتيجة مع تنبيه أن الحفظ تعذّر.
    let changes = null, saveFailed = false;
    if (PlayState.student && AppState.similaritiesManager) {
        try {
            changes = await AppState.similaritiesManager.recordRound(
                PlayState.student.id,
                groupAnswersBySignature(PlayState.answers),
                { scopeTitle: PlayState.scopeTitle, total, correct: PlayState.correctCount, byType: summarizeByType(PlayState.answers), groupsCount: new Set(PlayState.answers.map(a => a.sig)).size }
            );
        } catch (e) { console.warn('تعذّر حفظ نتيجة المتشابهات:', e); saveFailed = true; }
    }

    const levelLabel = (rec) => t('sim_level_' + levelOf(rec));
    let detailsHTML = '';
    if (changes) {
        const weak = changes.filter(c => PlayState.answers.some(a => a.sig === c.sig && !a.isCorrect));
        const up = changes.filter(c => levelOf(c.after) !== levelOf(c.before) && !weak.includes(c) && c.after.box > c.before.box);
        const row = (c) => `<li><span class="quran-text sim-res-anchor">« ${escapeHtmlText(stripHizbMark(c.after.anchorPhrase))} »</span><span class="sim-level-chip sim-level-${levelOf(c.after)}">${levelLabel(c.after)}</span></li>`;
        // الجولة الواحدة قد تمسّ 17 مجموعة: نعرض أول 5 من كل قائمة ثم عدد الباقي
        const list = (arr) => `<ul class="sim-res-list">${arr.slice(0, 5).map(row).join('')}</ul>${arr.length > 5 ? `<p class="sim-res-more">+${arr.length - 5}</p>` : ''}`;
        detailsHTML = `
            <p class="sim-res-saved">${t('sim_results_saved_for')} <strong>${escapeHtmlText(PlayState.student.name)}</strong></p>
            ${weak.length ? `<h4 class="sim-res-h sim-res-weak">${t('sim_results_weak_title')}</h4>${list(weak)}` : ''}
            ${up.length ? `<h4 class="sim-res-h sim-res-up">${t('sim_results_improved_title')}</h4>${list(up)}` : ''}`;
    } else if (saveFailed) {
        detailsHTML = `<p class="sim-res-saved sim-res-failed">${t('sim_results_save_failed')}</p>`;
    } else {
        detailsHTML = `<p class="sim-res-saved">${t('sim_results_not_saved')}</p>`;
    }

    container.innerHTML = `
        <div class="sim-group-card sim-play-results">
            <div class="sim-play-results-title">${t('sim_game_results_title')}</div>
            <div class="sim-play-results-score">${PlayState.correctCount} / ${total}</div>
            ${detailsHTML}
            <button class="btn btn-outline" id="simplay-btn-again">${t('sim_game_play_again_btn')}</button>
            ${PlayState.dailyStudent ? `<button class="btn sim-back-students" id="simplay-btn-students">${t('sim_back_to_students')}</button>` : ''}
            ${changes ? `<div class="sim-pm-wrap"><button class="btn btn-outline sim-pm-btn" id="simplay-btn-parent">${t('sim_pm_btn')}</button></div>` : ''}
        </div>`;
    // 🌟 [2026-11-07] «إرسال لولي الأمر»: النتيجة + ما أتقنه + مواضع خطئه اليوم + توصية للبيت (راجع engine/similarityParentMsg.js)
    document.getElementById('simplay-btn-parent')?.addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const text = await sessionParentText(PlayState.student, total, PlayState.correctCount, PlayState.answers);
        toggleParentShare(btn, text, PlayState.student && PlayState.student.phone);
    });
    document.getElementById('simplay-btn-students')?.addEventListener('click', () => openSimilaritiesBrowser());
    document.getElementById('simplay-btn-again')?.addEventListener('click', () => {
        // 🌟 إعادة بناء الجولة من الصفر (وليس فقط خلط نفس المصفوفة القديمة) حتى تتغيّر
        // المشتتات عشوائياً أيضاً في كل محاولة — ولأن buildGameRound تختار عشوائياً من كل
        // الأسئلة المتاحة (سقف MAX_ROUND_QUESTIONS)، هذا يعني أيضاً مجموعة فرعية مختلفة من
        // الأسئلة نفسها في كل محاولة لو النطاق أكبر من السقف، بدل تكرار نفس الخيارات بالضبط
        // (نفس الطالب يستمر في الجولة التالية بلا إعادة اختيار)
        PlayState.round = buildRound(PlayState.groups);
        PlayState.retries = 0;
        PlayState.currentIndex = 0;
        PlayState.correctCount = 0;
        PlayState.answers = [];
        renderQuestion();
    });
}
