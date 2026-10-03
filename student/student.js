// student/student.js
import { AppState, loadSplashScreen, loadDashboardScreen, loadLoginScreen, setEvaluationMode, t, tf, surahNameLocal, localizeGenerated, trStored, localizeErrorTypes } from '../core/app.js';
import { loadScreen } from '../core/navigation.js';
import { esc } from '../core/escape.js';
import { purgeStudentRelatedData } from '../core/studentCleanup.js';
import { openModal, closeModal } from '../components/ui.js';
import { openAdultGameScreen } from '../games/adultGame.js';
import { openKidsGameScreen } from '../games/kidsGame.js';
// 🌟 [جديد] عرض إنجازات/أوسمة "الاختبارات الثنائية" في ملف الطالب — راجع
// renderDualTestAchievements أدناه وBADGE_CATALOG في engine/dualTestEngine.js
import { BADGE_CATALOG, studentOutcomeInMatch } from '../engine/dualTestEngine.js';
// 🌟 [جديد — المرحلة 5] كتالوج أوسمة وحساب تقدّم "أبطال التجويد" — لعرض قسم "مسار التجويد"
// في ملف الطالب (راجع renderTajweedProfileSection أدناه)
import { TAJWEED_BADGE_CATALOG, computeAllStageProgress } from '../engine/tajweedEngine.js';
import { TAJWEED_STAGES } from '../engine/tajweedRulesCatalog.js';
// 🌟 [جديد] نظام "تلميحات الأقسام عند أول دخول" — راجع components/sectionHint.js
import { showSectionHintOnce } from '../components/sectionHint.js';
// 🌟 [جديد] مسار "إصلاح الأخطاء السابقة عند الدخول" — راجع components/fixErrorsPrompt.js
import { showFixErrorsPrompt, shouldShowFixPromptToday, markFixPromptHandledToday, getDueWeaknesses } from '../components/fixErrorsPrompt.js';
// 🌟 [جديد] بطاقة "اختبار غير مكتمل" عند اختيار الطالب (حفظ والعودة لاحقًا) — راجع components/pausedSession.js
import { getPausedEvaluation, clearPausedEvaluation, showPausedEvaluationPrompt } from '../components/pausedSession.js';
// 🌟 [جديد] بطاقة الترحيب بالطالب عند اختيار اسمه — راجع components/welcomeBanner.js
import { showStudentWelcome } from '../components/welcomeBanner.js';
// 🌟 [جديد 2026-10-03] شاشة "ماذا تريد أن تبدأ معه؟" بعد تسجيل أي طالب جديد — راجع components/newStudentChoice.js
import { showNewStudentChoice } from '../components/newStudentChoice.js';
// 🌟 [إصلاح فحص الأزرار] لتوجيه ملف "النسخة الشاملة" المرفوع بالخطأ هنا إلى مسار استرجاعه الصحيح
import { restoreFromBackupFile } from '../core/backupRestore.js';

export async function populateStudentsDropdown() {
    const students = await AppState.studentManager.getAllStudents();
    const dataList = document.getElementById('student-list');
    const searchInput = document.getElementById('student-search-input');

    if (!dataList || !searchInput) return;

    dataList.innerHTML = '';

    students.filter(s => !s.isHidden).forEach(s => {
        let option = document.createElement('option');
        option.value = s.name;
        dataList.appendChild(option);
    });
    // 🌟 [2026-10-03 — بطلب المعلم] حُذفت نافذة alert ليوم ميلاد الطالب التي كانت تظهر عند
    // دخول شاشة الكبار/الصغار: التذكير يكفيه بطاقة «نظرة سريعة» + إشعار الجهاز (مرة يوميًا)
}

function calcAgeDynamic(inputId, displayId) {
    const dobInput = document.getElementById(inputId);
    const displaySpan = document.getElementById(displayId);
    if (!dobInput || !displaySpan) return;
    const dob = new Date(dobInput.value);
    if (isNaN(dob)) return;
    const ageDate = new Date(Date.now() - dob.getTime());
    displaySpan.innerText = tf('stu_age_paren', { n: Math.abs(ageDate.getUTCFullYear() - 1970) });
}

function populateSurahOptions(fromId, toId) {
    const selFrom = document.getElementById(fromId);
    const selTo = document.getElementById(toId);
    if (!selFrom || !selTo) return;
    selFrom.innerHTML = '';
    selTo.innerHTML = '';
    // 🌟 [جديد 2026-10-01 — فحص سهولة الاستخدام] خيار أول فارغ "غير محدد": كان أول سورة (الفاتحة) تُحفظ تلقائياً
    // كنطاق حفظ للطالب حتى لو لم يُرِد المعلم إدخاله، والمطلوب أن الاسم وحده هو الإلزامي. كل الأماكن التي
    // تقرأ memoFrom/memoTo تتعامل مع القيمة الفارغة أصلاً (راجع homeQuickview/homework-prep/monthly-report) 🌟
    selFrom.appendChild(new Option(t('stu_not_set'), ''));
    selTo.appendChild(new Option(t('stu_not_set'), ''));
    AppState.surahsData.forEach(s => {
        selFrom.appendChild(new Option(surahNameLocal(s.name), s.name));
        selTo.appendChild(new Option(surahNameLocal(s.name), s.name));
    });
}

// 🌟🌟 [جديد 2026-10-01 — فحص سهولة الاستخدام] اقتراحات أسماء الطلاب أثناء الكتابة في شاشة اختيار الطالب.
// كان المعلم مضطراً لكتابة الاسم كاملاً بالحرف. الآن بمجرد كتابة أي حرف تظهر الأسماء المطابقة، وتضيق القائمة
// مع كل حرف إضافي إلى أن يضغط على الاسم المطلوب. المطابقة تتجاهل التشكيل واختلاف الهمزات (أ/إ/آ/ا) و(ة/ه) و(ى/ي)،
// وتُقدِّم الأسماء التي تبدأ بما كُتب، ثم التي تبدأ إحدى كلماتها به، ثم التي تحتويه. الطلاب المخفيون لا يُقترحون
// (نفس سلوك القائمة السابقة). 🌟🌟
export function normName(x) {
    return String(x == null ? '' : x)
        .replace(/[ً-ٰٟـ]/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

export function rankStudentMatches(students, query) {
    const q = normName(query);
    if (!q) return [];
    const scored = [];
    students.forEach(st => {
        const n = normName(st.name);
        let score = -1;
        if (n.startsWith(q)) score = 0;
        else if (n.split(' ').some(w => w.startsWith(q))) score = 1;
        else if (n.includes(q)) score = 2;
        if (score >= 0) scored.push({ st, score });
    });
    scored.sort((a, b) => a.score - b.score || String(a.st.name).localeCompare(String(b.st.name), 'ar'));
    return scored.map(x => x.st);
}

function setupStudentSuggest(input, listEl) {
    let cache = [];
    let current = [];
    let active = -1;

    AppState.studentManager.getAllStudents()
        .then(all => { cache = all.filter(s => !s.isHidden); if (document.activeElement === input) render(); })
        .catch(() => { /* بلا اقتراحات لو فشلت القراءة — الكتابة اليدوية تبقى تعمل */ });

    function close() {
        listEl.classList.remove('is-open');
        listEl.innerHTML = '';
        input.setAttribute('aria-expanded', 'false');
        current = [];
        active = -1;
    }

    function pick(st) {
        input.value = st.name;
        close();
    }

    function setActive(i) {
        const items = listEl.querySelectorAll('.dhs-item');
        items.forEach((el, idx) => el.classList.toggle('is-active', idx === i));
        active = i;
        if (items[i]) items[i].scrollIntoView({ block: 'nearest' });
    }

    function render() {
        if (!normName(input.value)) { close(); return; }
        current = rankStudentMatches(cache, input.value).slice(0, 8);
        listEl.innerHTML = '';
        if (current.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'dhs-empty';
            empty.textContent = t('login_no_match');
            listEl.appendChild(empty);
        } else {
            current.forEach(st => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'dhs-item';
                b.setAttribute('role', 'option');
                b.textContent = st.name;
                // mousedown + preventDefault حتى لا يفقد الحقل التركيز قبل وصول النقرة
                b.addEventListener('mousedown', e => e.preventDefault());
                b.addEventListener('click', () => pick(st));
                listEl.appendChild(b);
            });
        }
        active = -1;
        listEl.classList.add('is-open');
        input.setAttribute('aria-expanded', 'true');
    }

    input.removeAttribute('list');   // نعتمد القائمة المخصّصة بدل datalist المتصفح (سلوكه يختلف بين المتصفحات)
    input.addEventListener('input', render);
    input.addEventListener('focus', () => { if (normName(input.value)) render(); });
    input.addEventListener('keydown', (e) => {
        const open = listEl.classList.contains('is-open') && current.length > 0;
        if (e.key === 'ArrowDown' && open) { e.preventDefault(); setActive((active + 1) % current.length); }
        else if (e.key === 'ArrowUp' && open) { e.preventDefault(); setActive((active - 1 + current.length) % current.length); }
        else if (e.key === 'Escape') { close(); }
        else if (e.key === 'Enter') {
            if (open && active >= 0) { e.preventDefault(); pick(current[active]); }
            else document.getElementById('btn-login-submit')?.click();
        }
    });

    // إغلاق القائمة عند النقر خارجها (يُزيل المستمع تلقائياً عند مغادرة الشاشة)
    const outside = (e) => {
        if (!input.isConnected) { document.removeEventListener('pointerdown', outside); return; }
        if (e.target !== input && !listEl.contains(e.target)) close();
    };
    document.addEventListener('pointerdown', outside);

    return { refresh: render };
}

// 🌟 [جديد] الصفوف من التمهيدي حتى السادس الابتدائي → "ركن الأطفال" افتراضياً عند بدء تقييم من سجل الطلاب/ملف
// الطالب؛ غير ذلك (أو صف غير محدد) → واجهة الكبار. ⚠️ افتراض صريح: هذه قاعدة تخمين فقط، وملف الطالب يعرض زراً
// ثانياً لبدء التقييم بالوضع الآخر لو أراد المعلم عكسها.
const KIDS_GRADES = ['التمهيدي', 'الأول الابتدائي', 'الثاني الابتدائي', 'الثالث الابتدائي', 'الرابع الابتدائي', 'الخامس الابتدائي', 'السادس الابتدائي'];
function isKidsGrade(grade) { return KIDS_GRADES.includes(grade); }

// 🌟 [جديد] بدء تقييم طالب مباشرة (من سجل الطلاب أو ملفه) بدل المرور بالرئيسية ثم واجهة الكبار/الأطفال
// ثم كتابة الاسم — يضبط الوضع (كبار/أطفال) ثم يدخل نفس مسار الدخول المعتاد (بطاقة إصلاح الأخطاء إن وُجدت،
// ثم الترحيب ثم لوحة التقييم).
function startEvaluationForStudent(student, kids) {
    setEvaluationMode(!!kids);
    enterStudentEvaluation(student);
}

export function setupLoginListeners() {
    document.getElementById('btn-back-splash')?.addEventListener('click', loadSplashScreen);

    // 🌟 [جديد] تلميح "أضف طالباً أولاً" — يظهر تلقائياً فقط لو لا يوجد أي طالب مسجَّل في
    // المنصة إطلاقاً بعد (وليس بعد محاولة كتابة اسم خاطئ، ذلك تنبيه alert منفصل أسفل هذا
    // الملف). راجع مستند "تصميم نظام تلميحات الأقسام عند أول دخول المقترح" — القسم الموضّح
    // فيه أن لوحة التقييم نفسها لا تُفتح إلا بعد اختيار طالب، فمكان هذا التلميح هنا تحديداً
    // في شاشة تسجيل الدخول، لا في لوحة التقييم كما كان مقترحاً أول مرة 🌟
    AppState.studentManager.getAllStudents().then(students => {
        if (!students || students.length === 0) {
            showSectionHintOnce('login_no_students', {
                type: 'tip',
                titleKey: 'hint_login_title',
                bodyKey: 'hint_login_body',
                extraAction: {
                    labelKey: 'hint_login_action_btn',
                    onClick: loadMyStudentsScreen
                }
            });
        } else {
            // 🌟 [جديد 2026-10-02] الجولة الإرشادية لمدخل الكبار/الأطفال (مرة واحدة لكل مسار). تُبدأ فقط حين يوجد
            // طلاب؛ أما مع عدم وجود أي طالب فتلميح "أضف طالباً أولاً" أعلاه هو المناسب (له زر انتقال فعلي)
            import('../components/guidedTour.js')
                .then(m => m.maybeStartTour(AppState.isKidsMode ? 'kids' : 'adults'))
                .catch(() => {});
        }
    }).catch(() => { /* تجاهل بصمت — التلميح غير حرج لعمل الشاشة */ });

    // 🌟 [عدّل 2026-10-01] اقتراحات الأسماء أثناء الكتابة بدل datalist المتصفح (راجع setupStudentSuggest أعلاه)
    const searchInput = document.getElementById('student-search-input');
    const suggestList = document.getElementById('student-suggest-list');
    const suggest = (searchInput && suggestList) ? setupStudentSuggest(searchInput, suggestList) : null;

    // زر دخول المعلم المعتاد
    document.getElementById('btn-login-submit')?.addEventListener('click', async () => {
        const typedName = document.getElementById('student-search-input').value.trim();
        if (!typedName) return alert(t("stu_login_name_required"));

        const students = await AppState.studentManager.getAllStudents();
        let found = students.find(s => s.name === typedName);

        // 🌟 [جديد 2026-10-01] لو لم يطابق ما كُتب اسماً حرفياً: (أ) تطابق بعد تجاهل التشكيل/الهمزات لطالب واحد
        // → ندخل مباشرة؛ (ب) ما كُتب جزء من اسم طالب واحد فقط → نملأ الحقل باسمه الكامل ليؤكد المعلم بضغطة
        // ثانية (لا ندخل تلقائياً حتى لا يُقيَّم طالب خطأ)؛ (ج) عدة احتمالات → نعرض القائمة؛ (د) لا شيء → التنبيه القديم.
        if (!found) {
            const nt = normName(typedName);
            const sameNorm = students.filter(s => normName(s.name) === nt);
            if (sameNorm.length === 1) {
                found = sameNorm[0];
            } else {
                const partial = rankStudentMatches(students.filter(s => !s.isHidden), typedName);
                if (partial.length === 1) {
                    document.getElementById('student-search-input').value = partial[0].name;
                    return;
                }
                if (partial.length > 1 && suggest) { suggest.refresh(); return; }
            }
        }

        if (found) {
            enterStudentEvaluation(found);
        } else {
            // 🌟 [عدّل] صياغة أقصر بطلب صريح من المعلم — أصبح لها مفتاح ترجمة في core/i18n.js
            // بدل نص عربي ثابت هنا (نفس أسلوب بقية رسائل الشاشة)
            alert(t('login_name_not_found_alert'));
        }
    });
}


// 🌟 [استُخرجت 2026-10-01 من مستمع زر "دخول سريع للتقييم" أعلاه بلا أي تغيير في المنطق] مسار الدخول لتقييم طالب:
// بطاقة إصلاح الأخطاء (لو للطالب أخطاء مستحقة) ثم بطاقة الترحيب ثم لوحة التقييم. صارت دالة مستقلة حتى يستعملها أيضاً
// زرّا "ابدأ تقييم" في سجل الطلاب وملف الطالب (راجع startEvaluationForStudent).
export function enterStudentEvaluation(student) {
    AppState.currentStudent = student;
    // 🌟 [جديد] اختبار معلّق ("⏸️ حفظ والعودة لاحقًا") — أول ما يُختار الطالب، قبل بطاقتي "علاج الأخطاء" والترحيب:
    // لو له اختبار غير مكتمل في هذا القسم (كبار/أطفال) تظهر بطاقة "اختبار غير مكتمل" بزرّين:
    //   • ▶️ استكمال: يفتح الاختبار من أول سؤال لم يُجَب (راجع resumeSnapshot في games/adultGame.js وkidsGame.js).
    //   • 🗑️ إلغاء: يحذف المعلّق (بعد تأكيد داخل البطاقة) ثم يكمل المسار المعتاد أدناه كما هو.
    // طالب بلا اختبار معلّق (كل الطلاب الحاليين) لا يرى أي تغيير. كل طرق الدخول للتقييم (الدخول السريع، سجل
    // الطلاب، ملف الطالب) تمر من هذه الدالة فتشملها هذه الخطوة تلقائياً.
    const pausedEval = getPausedEvaluation(student, AppState.isKidsMode);
    if (pausedEval) {
        showPausedEvaluationPrompt(student, pausedEval, {
            kids: AppState.isKidsMode,
            onResume: () => {
                if (AppState.isKidsMode) openKidsGameScreen(pausedEval.config || {}, false, pausedEval);
                else openAdultGameScreen(pausedEval.config || {}, false, pausedEval);
            },
            onDiscard: async () => {
                clearPausedEvaluation(student);
                try { await AppState.studentManager.updateStudent(student); } catch (e) { console.error('تعذر حذف الاختبار المعلّق:', e); }
                continueStudentEvaluationEntry();
            }
        });
        return;
    }
    continueStudentEvaluationEntry();
}

// 🌟 [استُخرجت 2026-10-01 من enterStudentEvaluation أعلاه بلا أي تغيير في المنطق] بقية مسار الدخول بعد التأكد من
// عدم وجود اختبار معلّق: بطاقة علاج الأخطاء (إن لزمت) ثم بطاقة الترحيب ثم لوحة التقييم.
function continueStudentEvaluationEntry() {
    {
        document.getElementById('top-student-name').innerText = tf('stu_hero_name', { name: AppState.currentStudent.name });

        // 🌟 [جديد] بطاقة الترحيب بالطالب — تُعرض هنا تحديداً: بعد التأكد من أن الاسم
        // مسجَّل فعلاً وقبل الدخول إلى لوحة التقييم مباشرة. مقصود ألا ننتظرها (بلا await
        // ولا setTimeout قبل التحميل): البطاقة تظهر فوق الشاشة بينما تُحمَّل لوحة التقييم
        // خلفها في نفس اللحظة، فلا يضيع على المعلم أي وقت، وتختفي هي وحدها بعد ثوانٍ
        // قليلة أو فوراً بأي نقرة/زر Esc. وضع الأطفال يُمرَّر لتكبير البطاقة قليلاً فقط
        // (نفس محتوى وألوان الهوية، راجع dh-welcome-kids في css/welcomeBanner.css) 🌟
        // 🌟 [جديد] مسار "إصلاح الأخطاء السابقة أولاً": لو للطالب أخطاء مسجَّلة، نعرض بطاقة
        // تعرض عليه بدء جلسة الإصلاح الآن (نفس جلسة "تحدي الأخطاء" الموجودة أصلاً) ثم — بعد
        // انتهائها وملخصها القصير — الانتقال إلى شاشة الألعاب (راجع games/adultGame.js
        // وkidsGame.js: GameState.fixFromLogin). ليست إجبارية: "لاحقاً" يدخل الألعاب فوراً
        // بنفس السلوك القديم بالضبط (بطاقة الترحيب ثم لوحة التقييم). طالب بلا أخطاء لا يرى
        // أي تغيير إطلاقاً 🌟
        // 🌟 [تعديل] العدّاد = الأخطاء "المستحقة" الآن فقط (جديدة أو تنتظر مراجعتها الثانية
        // للتثبيت في يوم لاحق — راجع getDueWeaknesses). فالخطأ الذي أُجيب صح اليوم لا يستدعي
        // البطاقة، ويعود تلقائياً في أول دخول بعد اليوم (بعد يوم أو أسبوع) 🌟
        // 🌟 [افتراض صريح] البطاقة تظهر مرة واحدة يومياً لكل طالب: أي اختيار فيها (ابدأ أو
        // لاحقاً) يسجّل "تم التعامل اليوم" فلا تتكرر لنفس الطالب حتى اليوم التالي 🌟
        const pendingFixCount = getDueWeaknesses(AppState.currentStudent).length;
        if (pendingFixCount > 0 && shouldShowFixPromptToday(AppState.currentStudent)) {
            const enterGames = () => {
                markFixPromptHandledToday(AppState.currentStudent);
                showStudentWelcome(AppState.currentStudent, { kids: AppState.isKidsMode });
                loadDashboardScreen();
            };
            showFixErrorsPrompt(AppState.currentStudent, {
                kids: AppState.isKidsMode,
                onStart: () => {
                    markFixPromptHandledToday(AppState.currentStudent);
                    AppState.fixFlow = { fromLogin: true };
                    if (AppState.isKidsMode) openKidsGameScreen({}, true);
                    else openAdultGameScreen({}, true);
                },
                onLater: enterGames
            });
            return;
        }

        showStudentWelcome(AppState.currentStudent, { kids: AppState.isKidsMode });

        loadDashboardScreen();
    }
}

export async function loadMyStudentsScreen() {
    await loadScreen({
        templateUrl: 'student/my-students.html',
        initFunction: setupMyStudentsListeners
    });
}

function setupMyStudentsListeners() {
    // 🌟 [جديد 2026-10-02] الجولة الإرشادية لقسم «طلابي» (مرة واحدة) — best-effort، لا تؤثر على الشاشة
    import('../components/guidedTour.js').then(m => m.maybeStartTour('my_students')).catch(() => {});

    const backBtn = document.getElementById('btn-back-my-students');
    backBtn?.setAttribute('aria-label', t('ms_back'));
    backBtn?.setAttribute('title', t('ms_back'));
    backBtn?.addEventListener('click', loadSplashScreen);
    document.getElementById('btn-all-students')?.addEventListener('click', loadAllStudentsScreen);

    // 🌟 [جديد 2026-10-03] أرقام «طلابي» (عدد الطلاب / بانتظار الحفظ / تقارير الشهر) + سطر التذكير
    refreshMyStudentsSummary();
    watchMyStudentsOverlays();
    document.getElementById('ms-reminder-btn')?.addEventListener('click', () => {
        document.getElementById('btn-monthly-memo-bulk')?.click();
    });

    document.getElementById('btn-add-student')?.addEventListener('click', () => {
        populateSurahOptions('stu-memo-from', 'stu-memo-to');
        resetAddStudentForm();
        AppState.studentManager.getAllStudents().then(list => { _addExistingNames = list.map(x => normStudentName(x.name)); }).catch(() => { _addExistingNames = []; });
        openModal('add-modal');
        setTimeout(() => document.getElementById('stu-name')?.focus(), 50);
    });

    // 🌟 [جديد] فتح شاشة "تسجيل الحفظ الشهري لكل الطلاب" يدويًا — استيراد ديناميكي
    // بنفس نمط بقية الشاشات المستوردة ديناميكيًا في هذا الملف
    // 🌟 [جديد] مركز التقارير الشهرية — استيراد ديناميكي (نفس نمط الأزرار المجاورة)
    document.getElementById('btn-monthly-reports-hub')?.addEventListener('click', () => {
        import('../components/monthlyReportsHub.js')
            .then(m => m.openMonthlyReportsHub())
            .catch(err => console.error('تعذر فتح مركز التقارير الشهرية:', err));
    });

    document.getElementById('btn-monthly-memo-bulk')?.addEventListener('click', () => {
        import('../components/monthlyMemorizationBulkScreen.js')
            .then(m => m.openMonthlyMemorizationBulkScreen())
            .catch(err => {
                console.error('تعذر تحميل شاشة الحفظ الشهري الجماعية:', err);
                alert(t('stu_screen_preparing'));
            });
    });

    // 🌟 [عدّل 2026-10-03] الصور الرمزية أزرار في سطر واحد، و📷 يفتح اختيار صورة حقيقية ويعرضها داخل الدائرة
    document.querySelectorAll('#avatar-gallery .avatar-opt[data-av]').forEach(opt => {
        opt.addEventListener('click', () => {
            selectAddAvatarOption(opt);
            document.getElementById('selected-avatar').value = opt.dataset.av;
            const fileInput = document.getElementById('stu-avatar');
            if (fileInput) fileInput.value = '';
            const up = document.getElementById('btn-avatar-upload');
            if (up) up.textContent = '📷';
        });
    });
    document.getElementById('btn-avatar-upload')?.addEventListener('click', () => document.getElementById('stu-avatar')?.click());
    document.getElementById('stu-avatar')?.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        const up = document.getElementById('btn-avatar-upload');
        if (!file || !up) return;
        const url = URL.createObjectURL(file);
        up.innerHTML = `<img src="${url}" alt="">`;
        selectAddAvatarOption(up);
    });

    setupAddStudentDobSelects();

    document.getElementById('btn-close-add-modal')?.addEventListener('click', () => closeModal('add-modal'));

    // 🌟 [جديد 2026-10-03] "حفظ" يُغلق النافذة ويعرض الخطوات المعتادة بعد التسجيل (نقطة البداية ثم اختيار الألعاب)،
    // و"حفظ وإضافة آخر" يحفظ ويُفرغ النموذج ويُبقيه مفتوحاً لتسجيل حلقة كاملة متتابعة.
    // ⚠️ [افتراض صريح] في "حفظ وإضافة آخر" لا تظهر شاشة نقطة البداية ولا اختيار الألعاب حتى لا تقطع التسجيل المتتابع؛
    // نقطة البداية لها خط رجوع موجود فعلاً في شاشة الحفظ الشهري الجماعية (راجع openInitialPositionForNewStudent).
    document.getElementById('btn-save-new-student')?.addEventListener('click', () => saveNewStudentAction(false));
    document.getElementById('btn-save-add-another')?.addEventListener('click', () => saveNewStudentAction(true));
    document.getElementById('btn-add-skip-save')?.addEventListener('click', () => saveNewStudentAction(false));

    // 🌟 [جديد 2026-10-03] التنقل بين خطوات نافذة الإضافة الثلاث
    document.getElementById('btn-add-step-next')?.addEventListener('click', () => {
        if (_addStep === 1 && !checkAddStudentName()) return;
        setAddStep(_addStep + 1);
    });
    document.getElementById('btn-add-step-back')?.addEventListener('click', () => setAddStep(_addStep - 1));
    document.getElementById('stu-name')?.addEventListener('input', () => { checkAddStudentName(true); refreshAddStepButtons(); });
    document.getElementById('stu-name')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && _addStep === 1) { e.preventDefault(); document.getElementById('btn-add-step-next')?.click(); }
    });

}

async function saveNewStudentAction(addAnother) {
    const data = {
        name: document.getElementById('stu-name').value.trim(),
        dob: document.getElementById('stu-dob').value,
        grade: document.getElementById('stu-grade').value,
        country: document.getElementById('stu-country').value,
        phone: document.getElementById('stu-phone').value,
        gender: 'boy',
        memoFrom: document.getElementById('stu-memo-from').value,
        memoTo: document.getElementById('stu-memo-to').value,
        avatar: document.getElementById('selected-avatar').value,
        isHidden: false,
        weaknesses: [],
        // 🌟 أرشيف الأخطاء المصححة — يحتفظ بتفاصيل كل خطأ بعد حله بدل حذفه نهائياً،
        // ليبقى سجل تاريخي كامل لأخطاء الطالب حتى يوم الاختبار (راجع adultGame.js/
        // kidsGame.js في recordAnswer) 🌟
        resolvedWeaknesses: []
    };
    if (!data.name) return alert(t("stu_name_required"));
    // 🌟 [إصلاح تدقيق] منع تسجيل طالبين بنفس الاسم: تسجيل الدخول وربط الواجبات يعتمدان على الاسم فيختلط الطلاب.
    // ⚠️ [افتراض صريح]: المقارنة على الاسم بعد إزالة التشكيل والمسافات الزائدة وبلا حساسية لحالة الأحرف.
    {
        const _existing = await AppState.studentManager.getAllStudents();
        if (_existing.some(x => normStudentName(x.name) === normStudentName(data.name))) { setAddStep(1); return alert(t("stu_name_duplicate")); }
    }

    const fileInput = document.getElementById('stu-avatar');
    if (fileInput && fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            // 🌟 [إصلاح تدقيق] كانت الصورة تُخزَّن بحجمها الأصلي كاملاً (قد تبلغ عدة ميجابايت لكل طالب فتتضخم القاعدة والنسخ
            // الاحتياطي). الآن تُصغَّر إلى 256px كحد أقصى (JPEG) عبر canvas المدمج في المتصفح؛ لو فشل التصغير نستخدم الأصل.
            data.avatar = await shrinkAvatarDataUrl(e.target.result);
            const newId = await AppState.studentManager.addStudent(data);
            await afterNewStudentSaved(data, newId, addAnother);
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        const newId = await AppState.studentManager.addStudent(data);
        await afterNewStudentSaved(data, newId, addAnother);
    }
}

async function afterNewStudentSaved(data, newId, addAnother) {
    refreshMyStudentsSummary();
    populateStudentsDropdown();
    if (addAnother) {
        _addExistingNames.push(normStudentName(data.name));
        resetAddStudentForm();
        const toast = document.getElementById('add-saved-toast');
        if (toast) { toast.textContent = tf('add_saved_next', { name: data.name }); toast.style.display = ''; }
        document.getElementById('stu-name')?.focus();
        return;
    }
    closeModal('add-modal');
    alert(t("stu_saved_ok"));
    await promptInitialMemorizationPositionForNewStudent({ ...data, id: newId });
    offerNewStudentGames({ ...data, id: newId });
}

function selectAddAvatarOption(el) {
    document.querySelectorAll('#avatar-gallery .avatar-opt').forEach(o => o.classList.remove('active'));
    el.classList.add('active');
}

// يُفرغ نافذة الإضافة (يُستدعى عند فتحها وبعد "حفظ وإضافة آخر")؛ يُبقي اختيار "تفاصيل إضافية" مفتوحاً/مغلقاً كما هو
function resetAddStudentForm() {
    ['stu-name', 'stu-country', 'stu-phone', 'stu-dob'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    ['stu-grade', 'stu-dob-d', 'stu-dob-m', 'stu-dob-y', 'stu-memo-from', 'stu-memo-to'].forEach(id => { const el = document.getElementById(id); if (el) el.selectedIndex = 0; });
    const age = document.getElementById('age-display'); if (age) age.textContent = '';
    const toast = document.getElementById('add-saved-toast'); if (toast) toast.style.display = 'none';
    const fileInput = document.getElementById('stu-avatar'); if (fileInput) fileInput.value = '';
    const up = document.getElementById('btn-avatar-upload'); if (up) up.textContent = '📷';
    const first = document.querySelector('#avatar-gallery .avatar-opt[data-av]');
    if (first) { selectAddAvatarOption(first); document.getElementById('selected-avatar').value = first.dataset.av; }
    const warn = document.getElementById('add-name-warn'); if (warn) warn.style.display = 'none';
    setAddStep(1);
}

// 🌟 [جديد 2026-10-03] خطوات نافذة الإضافة: ① الاسم والصورة ② الصف والعمر ③ ولي الأمر والحفظ + معاينة
let _addStep = 1;
let _addExistingNames = [];
const ADD_STEP_TITLES = ['add_step1_title', 'add_step2_title', 'add_step3_title'];

// ⚠️ [افتراض صريح]: مقارنة الأسماء بعد إزالة التشكيل والمسافات الزائدة وبلا حساسية لحالة الأحرف (نفس قاعدة منع التكرار عند الحفظ)
function normStudentName(x) {
    return String(x || '').replace(/[ً-ٰٟـ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// يتحقق من الاسم في الخطوة الأولى: فارغ أو مكرر → رسالة تحت الحقل. silent=true أثناء الكتابة (لا رسالة "مطلوب")
function checkAddStudentName(silent) {
    const name = document.getElementById('stu-name')?.value.trim() || '';
    const warn = document.getElementById('add-name-warn');
    let msg = '';
    if (!name) msg = silent ? '' : t('stu_name_required');
    else if (_addExistingNames.includes(normStudentName(name))) msg = t('stu_name_duplicate');
    if (warn) { warn.textContent = msg; warn.style.display = msg ? '' : 'none'; }
    return !!name && !msg;
}

function refreshAddStepButtons() {
    const hasName = !!(document.getElementById('stu-name')?.value.trim());
    const show = (id, on) => { const el = document.getElementById(id); if (el) el.style.display = on ? '' : 'none'; };
    show('btn-add-step-back', _addStep > 1);
    show('btn-add-step-next', _addStep < 3);
    show('btn-save-new-student', _addStep === 3);
    show('btn-save-add-another', _addStep === 3);
    show('btn-add-skip-save', _addStep === 2);
    show('btn-close-add-modal', _addStep === 1);
    const next = document.getElementById('btn-add-step-next');
    if (next) next.disabled = _addStep === 1 && !hasName;
}

function setAddStep(n) {
    _addStep = Math.min(3, Math.max(1, n));
    document.querySelectorAll('#add-modal .as-step').forEach(el => el.classList.toggle('on', Number(el.dataset.step) === _addStep));
    document.querySelectorAll('#add-modal .as-dot').forEach(el => {
        const d = Number(el.dataset.dot);
        el.classList.toggle('on', d === _addStep);
        el.classList.toggle('done', d < _addStep);
        el.textContent = d < _addStep ? '✓' : String(d);
    });
    const title = document.getElementById('add-step-title');
    if (title) title.textContent = tf('add_step_of', { n: _addStep, title: t(ADD_STEP_TITLES[_addStep - 1]) });
    if (_addStep === 3) renderAddStudentPreview();
    refreshAddStepButtons();
    if (_addStep === 1) setTimeout(() => document.getElementById('stu-name')?.focus(), 30);
}

// بطاقة المعاينة في الخطوة الثالثة: نفس الصورة المختارة + الاسم + الصف + العمر
function renderAddStudentPreview() {
    const box = document.getElementById('add-preview');
    if (!box) return;
    const active = document.querySelector('#avatar-gallery .avatar-opt.active');
    const name = document.getElementById('stu-name')?.value.trim() || '—';
    const grade = document.getElementById('stu-grade')?.value;
    const age = document.getElementById('age-display')?.textContent || '';
    const parts = [grade ? trStored(grade) : t('stu_not_set')];
    if (age) parts.push(age.replace(/[()]/g, '').trim());
    box.innerHTML = `<span class="avatar-opt active">${active ? active.innerHTML : '👦🏻'}</span><div><b>${esc(name)}</b><span>${esc(parts.join(' · '))}</span></div>`;
}

// 🌟 [جديد 2026-10-03] تاريخ الميلاد بثلاث قوائم (يوم/شهر/سنة) تكتب في #stu-dob المخفي بصيغة YYYY-MM-DD.
// ⚠️ [افتراض صريح] السنة وحدها تكفي لحساب العمر: لو لم يُختر اليوم/الشهر نعتبرهما 1 (أول يناير).
function setupAddStudentDobSelects() {
    const d = document.getElementById('stu-dob-d'), m = document.getElementById('stu-dob-m'), y = document.getElementById('stu-dob-y');
    if (!d || !m || !y) return;
    const pad = n => String(n).padStart(2, '0');
    const locale = (AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US') + '-u-nu-latn';
    let monthName = i => String(i);
    try { const f = new Intl.DateTimeFormat(locale, { month: 'long' }); monthName = i => f.format(new Date(2000, i - 1, 1)); } catch (e) { /* أرقام */ }
    d.innerHTML = `<option value="">${t('dob_day')}</option>` + Array.from({ length: 31 }, (_, i) => `<option value="${pad(i + 1)}">${i + 1}</option>`).join('');
    m.innerHTML = `<option value="">${t('dob_month')}</option>` + Array.from({ length: 12 }, (_, i) => `<option value="${pad(i + 1)}">${esc(monthName(i + 1))}</option>`).join('');
    const thisYear = new Date().getFullYear();
    y.innerHTML = `<option value="">${t('dob_year')}</option>` + Array.from({ length: 70 }, (_, i) => thisYear - 2 - i).map(v => `<option value="${v}">${v}</option>`).join('');
    const sync = () => {
        const hidden = document.getElementById('stu-dob');
        const age = document.getElementById('age-display');
        if (!y.value) { hidden.value = ''; if (age) age.textContent = ''; return; }
        hidden.value = `${y.value}-${m.value || '01'}-${d.value || '01'}`;
        calcAgeDynamic('stu-dob', 'age-display');
    };
    [d, m, y].forEach(el => el.addEventListener('change', sync));
}

// 🌟 [جديد 2026-10-03] ملء أرقام وشارات شاشة «طلابي» (التصميم الجديد في student/my-students.html).
// كل شيء best-effort: أي فشل يترك «—» ولا يمسّ الأزرار. الحسابات للقراءة فقط (لا كتابة في أي قاعدة):
//   • عدد الطلاب = غير المخفيين (نفس فلترة شاشة الحفظ الشهري ومركز التقارير).
//   • بانتظار الحفظ = countPendingMonthlyMemorization (نفس شروط قائمة الشاشة الجماعية).
//   • التقارير = getReportsExportSummary (شهر التقارير + كم صُدِّر منها)؛ شارة «متبقية» في موسم التقارير فقط.
let _msSummaryRun = 0;
async function refreshMyStudentsSummary() {
    const run = ++_msSummaryRun;
    const $ = (id) => document.getElementById(id);
    if (!$('ms-screen')) return;
    const stale = () => run !== _msSummaryRun || !$('ms-screen');

    if (AppState.studentManager) try {
        const all = await AppState.studentManager.getAllStudents();
        if (stale()) return;
        $('ms-stat-students').textContent = all.filter(s => !s.isHidden).length;
    } catch (e) { console.warn('تعذر حساب عدد الطلاب:', e); }

    // المتابعة الشهرية: عنوان القسم باسم الشهر الحالي
    try {
        const loc = (AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US') + '-u-nu-latn';
        const month = new Intl.DateTimeFormat(loc, { month: 'long' }).format(new Date());
        $('ms-section-monthly').textContent = tf('ms_section_monthly', { month });
    } catch (e) { /* يبقى العنوان العام */ }

    try {
        const m = await import('../components/monthlyMemorizationBulkScreen.js');
        const n = await m.countPendingMonthlyMemorization();
        if (stale() || n == null) return;
        const num = $('ms-stat-memo');
        num.textContent = n;
        num.classList.toggle('is-alert', n > 0);
        num.classList.toggle('is-ok', n === 0);
        const badge = $('ms-badge-memo');
        badge.textContent = tf('ms_badge_memo', { n });
        badge.hidden = n === 0;
        $('ms-reminder-text').textContent = tf('ms_reminder_memo', { n });
        $('ms-reminder').hidden = n === 0;
    } catch (e) { console.warn('تعذر حساب الحفظ الشهري المعلّق:', e); }

    try {
        const m = await import('../components/monthlyReportsHub.js');
        const r = await m.getReportsExportSummary();
        if (stale() || !r) return;
        $('ms-stat-reports').textContent = r.done;
        $('ms-stat-reports-of').textContent = ` / ${r.total}`;
        $('ms-stat-reports-label').textContent = tf('ms_stat_reports', { month: r.monthLabel });
        const left = r.total - r.done;
        const badge = $('ms-badge-reports');
        badge.textContent = tf('ms_badge_reports', { n: left });
        badge.hidden = !(r.season && left > 0);
    } catch (e) { console.warn('تعذر حساب ملخص التقارير الشهرية:', e); }
}

// عند إغلاق شاشة الحفظ الشهري (.mmb-overlay) أو مركز التقارير (.mrh-overlay) — وكلاهما يُزال من body —
// تتحدّث الأرقام فوراً. المراقِب يفصل نفسه عند مغادرة شاشة «طلابي».
let _msOverlayObserver = null;
function watchMyStudentsOverlays() {
    _msOverlayObserver?.disconnect();
    _msOverlayObserver = new MutationObserver((mutations) => {
        if (!document.getElementById('ms-screen')) { _msOverlayObserver.disconnect(); _msOverlayObserver = null; return; }
        const closed = mutations.some(mu => [...mu.removedNodes].some(n => n.nodeType === 1 && n.classList && (n.classList.contains('mmb-overlay') || n.classList.contains('mrh-overlay'))));
        if (closed) refreshMyStudentsSummary();
    });
    _msOverlayObserver.observe(document.body, { childList: true });
}

// 🌟 [جديد] بعد حفظ بطل جديد مباشرة — نطلب منه "نقطة البداية الأولى" في الحفظ
// مرة واحدة فقط (بدل انتظار ظهورها لاحقًا كخطوة "first-time" في الشاشة الجماعية
// الشهرية). استيراد ديناميكي بنفس نمط بقية الاستدعاءات في هذا الملف؛ الشاشة نفسها
// قابلة للتخطي بزر "لاحقًا"، فلا تُجبر المعلم على إدخال بيانة اختيارية فورًا —
// راجع openInitialPositionForNewStudent في components/monthlyMemorizationBulkScreen.js
// لتفاصيل خط الرجوع لو تخطّاها المعلم الآن.
// 🌟 [تعديل 2026-10-03] صارت ترجع الوعد (يكتمل بعد إغلاق شاشة نقطة البداية أو تخطّيها أو فشلها) كي تظهر شاشة
// اختيار الألعاب بعدها مباشرة بدل أن تتراكب فوقها؛ لا تغيير في سلوكها نفسه.
function promptInitialMemorizationPositionForNewStudent(student) {
    return import('../components/monthlyMemorizationBulkScreen.js')
        .then(m => m.openInitialPositionForNewStudent(student))
        .catch(err => console.error('تعذر عرض شاشة نقطة البداية الأولى للطالب الجديد:', err));
}

// 🌟 [جديد 2026-10-03] بعد نجاح تسجيل أي طالب جديد (من «أبدأ من هنا» أو «طلابي»): شاشة تسأل المعلم
// «ماذا تريد أن تبدأ معه؟» → ألعاب الصغار/الكبار لنفس الطالب عبر startEvaluationForStudent (نفس مسار
// زر "ابدأ تقييم" الموجود)؛ و«العودة إلى طلابي» تغلقها فقط. لا تظهر إلا من هنا (لا عند فتح المنصة ولا عند
// اختيار طالب موجود). نعيد قراءة سجل الطالب المحفوظ ليكون الطالب الحالي هو السجل الفعلي لا نسخة النموذج.
// ⚠️ [افتراض صريح] لو كانت شاشة "نقطة البداية الأولى" متاحة تظهر هي أولاً (كانت تظهر بعد الحفظ أصلاً) ثم هذه الشاشة.
async function offerNewStudentGames(fallbackStudent) {
    let student = fallbackStudent;
    if (AppState.studentManager) try {
        const all = await AppState.studentManager.getAllStudents();
        student = all.find(x => x.id === fallbackStudent.id) || fallbackStudent;
    } catch (e) { /* نستخدم نسخة النموذج */ }
    showNewStudentChoice(student, {
        onChoose: (kids) => startEvaluationForStudent(student, kids)
    });
}

export async function loadAllStudentsScreen() {
    await loadScreen({
        templateUrl: 'student/all-students.html',
        initFunction: async () => {
            await renderAllStudentsTable();
            setupAllStudentsListeners();
        }
    });
}

// 🌟 [إصلاح تدقيق] معرّف الطالب قد يكون رقماً (طلاب المنصة) أو نصاً std_... (طلاب أُنشئوا من الواجبات)؛ parseInt كان يحوّل
// النصي إلى NaN فتتعطل أزرار التعديل/الحذف/الإخفاء/الملف. الرقمي الخالص يُحوَّل رقماً، وغيره يبقى نصاً كما هو 🌟
function parseStudentId(raw) {
    const str = String(raw == null ? '' : raw).trim();
    return /^\d+$/.test(str) ? Number(str) : str;
}

// 🌟 [عدّل 2026-10-03] السجل العام صار قائمة مبسّطة بدل جدول التسعة أعمدة (راجع تعليق all-students.html):
// صف لكل طالب (صورة + اسم + صف/عمر + نقاط + زر تقييم + قائمة ⋯)، والمخفيون في مجموعة قابلة للطي أسفل القائمة.
// أسماء الأصناف (btn-prof-link/btn-start-eval/btn-edit/btn-hide/btn-show/btn-delete/btn-weakness) كما هي ليعمل مستمع النقر بلا تغيير.
const AS_AVATAR_COLORS = ['#0d5c46', '#147c5e', '#8a6a12', '#1e5a7a', '#6b3f8a', '#9a3b3b', '#3d6b2f', '#8a5a1e'];

function allStudentsAvatarHtml(s) {
    const a = s.avatar || '';
    if (a && a.length >= 10) return `<div class="as-avatar"><img src="${esc(a)}" alt=""></div>`;
    const key = String(s.id);
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
    const bg = AS_AVATAR_COLORS[h % AS_AVATAR_COLORS.length];
    const inner = a ? esc(a) : esc((s.name || '؟').trim().charAt(0) || '★');
    return `<div class="as-avatar" style="background:${bg}">${inner}</div>`;
}

function allStudentsRowHtml(s) {
    const id = esc(s.id);
    const details = [s.grade ? trStored(s.grade) : t('stu_not_set')];
    if (s.dob) {
        const d = new Date(s.dob);
        details.push(tf("stu_age_years", { n: Math.abs(new Date(Date.now() - d.getTime()).getUTCFullYear() - 1970) }));
    }
    const weakness = (s.weaknesses && s.weaknesses.length > 0)
        ? `<button class="btn-weakness" data-id="${id}">${tf('as_fix_errors', { n: s.weaknesses.length })}</button>` : '';
    const mainBtn = s.isHidden
        ? `<button class="btn as-go btn-show" data-id="${id}">${t('as_show_btn')}</button>`
        : `<button class="btn as-go btn-start-eval" data-id="${id}">${t('stu_start_eval_row')}</button>`;
    const hideItem = s.isHidden
        ? `<button class="btn-show" data-id="${id}">👁️ ${t('stu_restore')}</button>`
        : `<button class="btn-hide" data-id="${id}">🙈 ${t('stu_hide')}</button>`;
    return `<div class="as-row${s.isHidden ? ' as-hidden-row' : ''}" data-name="${esc((s.name || '').toLowerCase())}">
        ${allStudentsAvatarHtml(s)}
        <div class="as-info">
            <button class="btn-prof-link" data-id="${id}">${esc(s.name)}</button>
            <span class="as-sub">${esc(details.join(' · '))}</span>
            ${weakness}
        </div>
        <div class="as-pts">${s.totalScore || 0} <small>${t('as_points_unit')}</small></div>
        ${mainBtn}
        <div class="as-menu-wrap">
            <button class="as-more" aria-label="${t('as_more_options')}" title="${t('as_more_options')}">⋯</button>
            <div class="as-menu">
                <button class="btn-edit" data-id="${id}">✏️ ${t('stu_edit_data')}</button>
                ${hideItem}
                <button class="btn-delete" data-id="${id}">🗑️ ${t('stu_delete_final')}</button>
            </div>
        </div>
    </div>`;
}

async function renderAllStudentsTable() {
    const students = await AppState.studentManager.getAllStudents();
    const box = document.getElementById('all-students-body');
    if(!box) return;
    const visible = students.filter(s => !s.isHidden);
    const hidden = students.filter(s => s.isHidden);
    const countEl = document.getElementById('as-count');
    if (countEl) countEl.textContent = tf('as_count', { n: visible.length });

    if (!students.length) { box.innerHTML = `<div class="as-empty">${t('as_empty')}</div>`; return; }
    let html = visible.length ? `<div class="as-list">${visible.map(allStudentsRowHtml).join('')}</div>` : '';
    if (hidden.length) {
        html += `<details class="as-hidden-box"${visible.length ? '' : ' open'}><summary>${tf('as_hidden_group', { n: hidden.length })}</summary><div class="as-list">${hidden.map(allStudentsRowHtml).join('')}</div></details>`;
    }
    html += `<div class="as-empty" id="as-no-match" style="display:none;">${t('as_no_match')}</div>`;
    box.innerHTML = html;
    filterAllStudentsList();
}

// بحث فوري بالاسم: يخفي الصفوف غير المطابقة بلا إعادة رسم
function filterAllStudentsList() {
    const q = (document.getElementById('as-search')?.value || '').trim().toLowerCase();
    const rows = document.querySelectorAll('#all-students-body .as-row');
    let shown = 0;
    rows.forEach(r => { const ok = !q || r.dataset.name.includes(q); r.style.display = ok ? '' : 'none'; if (ok) shown++; });
    const hiddenBox = document.querySelector('#all-students-body .as-hidden-box');
    if (hiddenBox) {
        const anyHidden = [...hiddenBox.querySelectorAll('.as-row')].some(r => r.style.display !== 'none');
        hiddenBox.style.display = anyHidden ? '' : 'none';
        if (q && anyHidden) hiddenBox.open = true;
    }
    document.querySelectorAll('#all-students-body > .as-list').forEach(l => {
        l.style.display = [...l.querySelectorAll('.as-row')].some(r => r.style.display !== 'none') ? '' : 'none';
    });
    const none = document.getElementById('as-no-match');
    if (none) none.style.display = (q && rows.length && !shown) ? '' : 'none';
}

function closeAllStudentsMenus(except) {
    document.querySelectorAll('#all-students-body .as-menu-wrap.open').forEach(w => { if (w !== except) w.classList.remove('open'); });
}

function setupAllStudentsListeners() {
    document.getElementById('btn-back-login')?.addEventListener('click', loadMyStudentsScreen);

    // 🌟 [جديد] زر "تسجيل بطل جديد" المضاف حديثاً في أعلى هذه الشاشة — لا يكرر نافذة
    // الإضافة هنا، بل يفتح شاشة "طلابي" (حيث نافذة الإضافة الحقيقية موجودة فعلاً) ثم
    // يُطلق تلقائياً نفس زرها #btn-add-student، فيفتح المعلم النافذة مباشرة بلا خطوة
    // وسيطة يدوية 🌟
    document.getElementById('btn-add-champion-shortcut')?.addEventListener('click', async () => {
        await loadMyStudentsScreen();
        document.getElementById('btn-add-student')?.click();
    });
    document.getElementById('as-search')?.addEventListener('input', filterAllStudentsList);
    // إغلاق قائمة ⋯ المفتوحة عند النقر في أي مكان آخر من الشاشة
    document.querySelector('#app-root .as-panel')?.addEventListener('click', (e) => {
        if (!e.target.closest('.as-menu-wrap')) closeAllStudentsMenus(null);
    });
    document.getElementById('all-students-body')?.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if(!target) return;
        if (target.classList.contains('as-more')) {
            const wrap = target.closest('.as-menu-wrap');
            closeAllStudentsMenus(wrap);
            wrap.classList.toggle('open');
            return;
        }
        closeAllStudentsMenus(null);
        const id = parseStudentId(target.dataset.id);

        if(target.classList.contains('btn-prof-link')) {
            const students = await AppState.studentManager.getAllStudents();
            const studentProfile = students.find(s => s.id === id);
            if(studentProfile) {
                AppState.currentStudent = studentProfile;
                loadStudentProfileScreen();
            }
        }
        // 🌟 [جديد 2026-10-01] بدء تقييم الطالب من صفه مباشرة (الوضع كبار/أطفال بحسب صفه — راجع isKidsGrade)
        else if(target.classList.contains('btn-start-eval')) {
            const students = await AppState.studentManager.getAllStudents();
            const stu = students.find(x => x.id === id);
            if (stu) startEvaluationForStudent(stu, isKidsGrade(stu.grade));
        }
        else if(target.classList.contains('btn-edit')) await openEditStudentModal(id);
        else if(target.classList.contains('btn-delete')) await deleteStudentAction(id);
        else if(target.classList.contains('btn-hide')) await toggleHideStudentAction(id, true);
        else if(target.classList.contains('btn-show')) await toggleHideStudentAction(id, false);
        else if(target.classList.contains('btn-weakness')) {
            const students = await AppState.studentManager.getAllStudents();
            const studentToChallenge = students.find(s => s.id === id);
            if(studentToChallenge && studentToChallenge.weaknesses.length > 0) {
                AppState.currentStudent = studentToChallenge;
                if (AppState.isKidsMode) {
                    openKidsGameScreen({}, true);
                } else {
                    openAdultGameScreen({}, true);
                }
            }
        }
    });
    document.getElementById('btn-close-edit-modal')?.addEventListener('click', () => closeModal('edit-modal'));
    document.getElementById('edit-stu-dob')?.addEventListener('change', () => calcAgeDynamic('edit-stu-dob', 'edit-age-display'));
    document.getElementById('btn-save-edited-student')?.addEventListener('click', saveEditedStudentAction);

    // 🌟 [إصلاح] النسخة الاحتياطية كانت تحفظ مخزن "students" فقط من IndexedDB، بينما سجل
    // التقييمات (history_<id>) وصور الطلاب (darham_avatar_<id>) وعدّاد التقارير
    // (darham_reports_log) وبيانات المعلم محفوظة في localStorage ولم تكن تُصدَّر إطلاقاً —
    // لذلك بعد الاستعادة على جهاز/متصفح آخر كان عمود "التقييمات" يظهر ناقصاً أو صفراً.
    // الآن الملف بصيغة جديدة (v2) تحمل الطلاب + هذه المفاتيح معاً 🌟
    document.getElementById('btn-export-backup')?.addEventListener('click', () => {
        AppState.studentManager.getAllStudents().then(students => {
            const backup = {
                format: BACKUP_FORMAT_ID,
                version: 2,
                exportedAt: new Date().toISOString(),
                students,
                localStorage: collectBackupLocalStorage()
            };
            const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            let dl = document.createElement('a'); dl.href = url; dl.download = `DarHam_Backup_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(dl); dl.click(); document.body.removeChild(dl);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
    });

    const fileInput = document.getElementById('importFile');
    document.getElementById('btn-import-backup-trigger')?.addEventListener('click', () => fileInput.click());
    fileInput?.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let imported = JSON.parse(e.target.result);
                // 🌟 [إصلاح فحص الأزرار] لو الملف هو النسخة الشاملة (databases) من ملف المعلم، كان يُرفض هنا
                // بـ"ملف غير صالح". الآن نوجّهه تلقائيًا لدالة الاسترجاع الشاملة نفسها بعد تأكيد صريح
                // (لأنها تستبدل بيانات المنصة كلها لا تدمجها كما يفعل هذا الزر مع ملف السجل) 🌟
                if (imported && !Array.isArray(imported) && imported.databases && typeof imported.databases === 'object') {
                    if (confirm(t('profile_backup_restore_confirm'))) {
                        try {
                            await restoreFromBackupFile(file);
                            alert(t('profile_backup_restore_success'));
                            location.reload();
                            return;
                        } catch (err2) { alert(t('profile_backup_restore_error')); }
                    }
                    fileInput.value = '';
                    return;
                }
                // 🌟 توافق مع الملفات القديمة: الصيغة القديمة كانت مصفوفة طلاب مباشرة
                // (بدون أي سجل تقييمات)، والجديدة كائن فيه students + localStorage 🌟
                const isV2 = imported && !Array.isArray(imported) && imported.format === BACKUP_FORMAT_ID;
                const students = isV2 ? (imported.students || []) : imported;
                if (!Array.isArray(students)) throw new Error('bad backup');

                let db = AppState.studentManager.db;
                let tx = db.transaction("students", "readwrite");
                let store = tx.objectStore("students");
                students.forEach(stu => store.put(stu));
                tx.oncomplete = () => {
                    if (isV2) restoreBackupLocalStorage(imported.localStorage || {});
                    alert(isV2 ? t('backup_restore_ok') : t('backup_restore_ok_legacy'));
                    renderAllStudentsTable();
                };
                tx.onerror = () => alert(t('backup_invalid_file'));
            } catch(err) { alert(t('backup_invalid_file')); }
            fileInput.value = ''; // 🌟 للسماح باختيار نفس الملف مرة أخرى
        };
        reader.readAsText(file);
    });
}

// 🌟 [جديد] معرّف صيغة النسخة الاحتياطية الجديدة (v2)
const BACKUP_FORMAT_ID = 'darham_backup';

// 🌟 [جديد] مفاتيح localStorage التي تدخل في النسخة الاحتياطية:
// - history_<id>: سجل التقييمات (هو مصدر عمود "التقييمات" وتقارير التطور)
// - darham_avatar_<id>: صورة الطالب في التقارير
// - darham_reports_log: عدّاد التقارير المُصدَّرة
// - darham_teacher_name / darham_teacher_signature: خط الرجوع القديم لبيانات المعلم
// لا نُصدِّر مفاتيح خاصة بالجهاز نفسه (اللغة، التلميحات المشاهَدة، طوابير المزامنة المعلقة) 🌟
function isBackupLocalStorageKey(key) {
    return key.startsWith('history_') || key.startsWith('darham_avatar_') ||
           key === 'darham_reports_log' || key === 'darham_teacher_name' || key === 'darham_teacher_signature';
}

function collectBackupLocalStorage() {
    const out = {};
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && isBackupLocalStorageKey(key)) out[key] = localStorage.getItem(key);
        }
    } catch (e) { console.error('تعذر قراءة localStorage للنسخة الاحتياطية:', e); }
    return out;
}

// 🌟 [جديد] دمج مصفوفتين بدون تكرار — يُستخدم لسجل التقييمات وسجل التقارير، حتى لا
// تمسح الاستعادة أي تقييمات جديدة موجودة على هذا الجهاز ولا تكرر الموجود منها.
// الافتراض: التقييم المكرر = نفس السجل حرفياً (نفس التاريخ/المدى/الدرجة/الوقت) 🌟
function mergeJsonArrays(existingRaw, incomingRaw) {
    let a = [], b = [];
    try { a = JSON.parse(existingRaw) || []; } catch (e) {}
    try { b = JSON.parse(incomingRaw) || []; } catch (e) {}
    if (!Array.isArray(a)) a = [];
    if (!Array.isArray(b)) return JSON.stringify(a);
    const seen = new Set(a.map(x => JSON.stringify(x)));
    const merged = [...a];
    b.forEach(x => { const k = JSON.stringify(x); if (!seen.has(k)) { seen.add(k); merged.push(x); } });
    // ترتيب زمني عند توفر timestamp (السجلات الأقدم بلا timestamp تبقى بترتيبها)
    if (merged.every(x => x && typeof x === 'object' && x.timestamp)) merged.sort((x, y) => x.timestamp - y.timestamp);
    else if (merged.every(x => typeof x === 'string')) merged.sort();
    return JSON.stringify(merged);
}

function restoreBackupLocalStorage(data) {
    Object.keys(data).forEach(key => {
        if (!isBackupLocalStorageKey(key)) return;
        const incoming = data[key];
        if (typeof incoming !== 'string') return;
        try {
            const existing = localStorage.getItem(key);
            if (key.startsWith('history_') || key === 'darham_reports_log') {
                localStorage.setItem(key, existing ? mergeJsonArrays(existing, incoming) : incoming);
            } else if (existing === null) {
                // الصور وبيانات المعلم: لا نستبدل الموجود على هذا الجهاز، نضيف الناقص فقط
                localStorage.setItem(key, incoming);
            }
        } catch (e) { console.error('تعذر استعادة المفتاح', key, e); }
    });
}

// 🌟 [جديد] بناء بطاقة عرض واحدة لعنصر مؤرشَف في "أرشيف الأخطاء المصححة" —
// تعرض نوع السؤال، مصدره (ركن الكبار/الصغار)، نص الآية، الخطأ الذي سُجِّل وقتها،
// وتاريخي الارتكاب والتصحيح. نفس فلسفة تخزين تفاصيل السؤال الكاملة المستخدمة في
// شاشة "علاج الخطأ السابق" بـ adultGame.js/kidsGame.js 🌟
function buildArchiveCard(w) {
    let sectionBadge = w.sourceSection === 'kids' ? '🎈' : (w.sourceSection === 'adult' ? '👤' : '');
    let typeLabel = w.questionTypeLabel ? localizeGenerated(trStored(w.questionTypeLabel)) : t('hw_q_type_label'); // 🌟 نص مخزَّن عربي ← يُترجم وقت العرض
    let locationText = w.surahName ? tf('stu_loc_text', { surah: surahNameLocal(w.surahName), ayah: w.num ? tf('stu_loc_ayah', { n: w.num }) : '' }) : '';
    let lang = AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US';
    let recordedDate = w.dateRecorded ? new Date(w.dateRecorded).toLocaleDateString(lang) : '—';
    let resolvedDate = w.dateResolved ? new Date(w.dateResolved).toLocaleDateString(lang) : '—';
    let errorLine = w.errorTypes ? `<div style="font-size:0.95rem; color:#991b1b; margin-bottom:8px;">${t("الخطأ السابق المسجل:")} [ ${localizeErrorTypes(w.errorTypes)} ]</div>` : '';

    return `
    <div style="border:2px solid #e2e8f0; border-radius: 14px; padding: 15px; background:#f8fafc;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:8px;">
            <span style="background: var(--dh-emerald-700); color:white; padding:4px 12px; border-radius:20px; font-size:0.95rem; font-weight:bold;">${sectionBadge} ${typeLabel}</span>
            <span style="color:#94a3b8; font-size:0.9rem;">${locationText}</span>
        </div>
        <div class="quran-text" style="font-size:1.8rem; color:#1e293b; margin-bottom:10px; line-height:1.6;">﴿\u00A0${w.text || ''}\u00A0﴾</div>
        ${errorLine}
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:10px; font-size:0.85rem; color:#64748b; border-top:1px dashed #e2e8f0; padding-top:8px;">
            <span>📌 ${t('error_recorded_on')} ${recordedDate}</span>
            <span>✅ ${t('archive_resolved_on')} ${resolvedDate}</span>
        </div>
    </div>`;
}

// 🌟 [جديد] يملأ نافذة الأرشيف بكل عناصر resolvedWeaknesses الخاصة بالطالب
// (الأحدث أولاً) — أو رسالة "لا يوجد أرشيف بعد" لو القائمة فارغة 🌟
function renderArchiveList(student) {
    const listDiv = document.getElementById('archive-list');
    if (!listDiv) return;
    const archive = Array.isArray(student.resolvedWeaknesses) ? [...student.resolvedWeaknesses].reverse() : [];
    if (archive.length === 0) {
        listDiv.innerHTML = `<p style="text-align:center; color:#94a3b8; padding: 30px 0;">${t('archive_empty')}</p>`;
        return;
    }
    listDiv.innerHTML = archive.map(w => buildArchiveCard(w)).join('');
}

export async function loadStudentProfileScreen() {
    await loadScreen({
        templateUrl: 'student/student-profile.html',
        // 🌟 [مُحدَّث] initFunction أصبحت async لإتاحة انتظار قراءة إنجازات "الاختبارات الثنائية"
        // من IndexedDB (renderDualTestAchievements) — آمن تماماً لأن loadScreen في
        // core/navigation.js لا ينتظر (await) initFunction أصلاً (fire-and-forget)، فلا يتأثر
        // أي سلوك آخر بهذا التحويل
        initFunction: async () => {
            const student = AppState.currentStudent;
            if (!student) return;

            document.getElementById('btn-back-from-prof')?.addEventListener('click', () => {
                loadAllStudentsScreen();
            });

            document.getElementById('prof-name').innerText = student.name;
            document.getElementById('prof-grade').innerText = (student.grade ? trStored(student.grade) : t("stu_grade_not_set"));
            document.getElementById('prof-points').innerText = student.totalScore || 0;

            let ageStr = t("stu_age_not_set");
            if(student.dob) {
                let d = new Date(student.dob);
                ageStr = tf("stu_age_years", { n: Math.abs(new Date(Date.now() - d.getTime()).getUTCFullYear() - 1970) });
            }
            document.getElementById('prof-age').innerText = `🎂 ${ageStr}`;
            document.getElementById('prof-country').innerText = student.country ? `🌍 ${student.country}` : t("stu_country_not_set");
            document.getElementById('prof-phone').innerText = student.phone ? `📱 ${student.phone}` : t("stu_phone_not_set");

            const avatarImg = document.getElementById('prof-avatar');
            if (student.avatar) {
                if(student.avatar.length < 10) {
                    avatarImg.style.display = 'none';
                    const parent = avatarImg.parentElement;
                    const emojiDiv = document.createElement('div');
                    emojiDiv.className = 'profile-avatar';
                    emojiDiv.innerText = student.avatar;
                    parent.insertBefore(emojiDiv, avatarImg);
                } else {
                    avatarImg.src = student.avatar;
                    avatarImg.style.display = 'block';
                }
            }

            // 🌟 [جديد 2026-10-01] زرّا بدء التقييم من ملف الطالب — الأول بالوضع المناسب لصفه والثاني بالوضع الآخر
            {
                const kidsDefault = isKidsGrade(student.grade);
                const mainEval = document.getElementById('btn-prof-start-eval');
                const altEval = document.getElementById('btn-prof-start-eval-alt');
                if (mainEval) {
                    mainEval.textContent = t(kidsDefault ? 'stu_start_eval_kids' : 'stu_start_eval_adult');
                    mainEval.onclick = () => startEvaluationForStudent(student, kidsDefault);
                }
                if (altEval) {
                    altEval.textContent = t(kidsDefault ? 'stu_start_eval_adult' : 'stu_start_eval_kids');
                    altEval.onclick = () => startEvaluationForStudent(student, !kidsDefault);
                }
            }

            const btnWeakness = document.getElementById('btn-prof-weakness');
            // 🌟 [تعديل] الزر يعدّ الأخطاء "المستحقة" الآن (راجع getDueWeaknesses). لو كل ما تبقّى
            // أُجيب صح اليوم وينتظر مراجعته الثانية، يظهر الزر معطَّلاً بنص "بانتظار المراجعة
            // الثانية" بدل أن يفتح جلسة فارغة 🌟
            const dueWeaknessCount = getDueWeaknesses(student).length;
            const totalWeaknessCount = Array.isArray(student.weaknesses) ? student.weaknesses.length : 0;
            if (dueWeaknessCount > 0) {
                btnWeakness.innerText = t('fixp_prof_start').replace('{n}', dueWeaknessCount);
                btnWeakness.onclick = () => {
                    if (AppState.isKidsMode) {
                        openKidsGameScreen({}, true);
                    } else {
                        openAdultGameScreen({}, true);
                    }
                };
            } else if (totalWeaknessCount > 0) {
                btnWeakness.style.background = "#cbd5e1";
                btnWeakness.style.color = "#475569";
                btnWeakness.innerText = t('fixp_prof_waiting').replace('{n}', totalWeaknessCount);
                btnWeakness.disabled = true;
            } else {
                btnWeakness.style.background = "#cbd5e1";
                btnWeakness.style.color = "#475569";
                btnWeakness.innerText = t("stu_no_errors_btn");
                btnWeakness.disabled = true;
            }

            // 🌟 [جديد] زر أرشيف الأخطاء المصححة — يفتح نافذة تعرض كل خطأ سابق
            // صحّحه الطالب بكامل تفاصيله (راجع resolvedWeaknesses في recordAnswer
            // بـ adultGame.js/kidsGame.js) بدل ما يختفي أثره نهائياً بعد تصحيحه 🌟
            const btnArchive = document.getElementById('btn-prof-archive');
            const archiveCount = Array.isArray(student.resolvedWeaknesses) ? student.resolvedWeaknesses.length : 0;
            if (archiveCount > 0) {
                btnArchive.innerHTML = `📂 ${t('archive_title')} (${archiveCount})`;
                btnArchive.disabled = false;
                btnArchive.onclick = () => { renderArchiveList(student); openModal('archive-modal'); };
            } else {
                btnArchive.innerHTML = `📂 ${t('archive_empty')}`;
                btnArchive.disabled = true;
            }
            document.getElementById('btn-close-archive')?.addEventListener('click', () => closeModal('archive-modal'));

            // 🌟 [جديد] زر فتح "تقرير الإنجاز الشهري" — يستورد reports/monthly-report.js
            // ديناميكيًا (نفس نمط openHomeworkPrep/openDualTestSetup في core/app.js بالضبط)
            // بدل استيراد ثابت أعلى الملف، تفادياً لأي حلقة استيراد بين الملفين (الشاشة
            // الجديدة تعود لملف الطالب عبر استيراد ديناميكي مماثل لـ loadStudentProfileScreen) 🌟
            document.getElementById('btn-prof-monthly-report')?.addEventListener('click', () => {
                import('../reports/monthly-report.js').then(m => m.openMonthlyReportScreen()).catch(err => {
                    console.error('تعذر تحميل شاشة التقرير الشهري:', err);
                    alert(t('stu_screen_preparing'));
                });
            });

            // 🌟 [مُعدَّل — بطلب صريح من المعلم بعد أول تجربة] كان هنا فحص "تسجيل الحفظ
            // الشهري" يظهر عند فتح كل ملف طالب على حدة — أُزيل نهائيًا من هنا لأنه كان
            // يظهر بشكل مزعج (نفس النافذة تتكرر عند كل دخول لنفس الطالب طالما لم تُكمَّل
            // كل خطواته). الفحص الآن أصبح شاشة واحدة جامعة لكل الطلاب معًا، تُفتح تلقائيًا
            // مرة واحدة يوميًا من الشاشة الرئيسية (راجع maybeAutoOpenMonthlyMemorizationBulk
            // في core/app.js)، أو يدويًا في أي وقت من زر "📋 تسجيل الحفظ الشهري لكل
            // الطلاب" في شاشة "طلابي" (راجع components/monthlyMemorizationBulkScreen.js).

            const histData = JSON.parse(localStorage.getItem(`history_${student.id}`)) || [];
            document.getElementById('prof-evals').innerText = histData.length;

            const tbody = document.getElementById('prof-history-body');
            tbody.innerHTML = "";
            if (histData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4">${t('stu_no_history')}</td></tr>`;
            } else {
                histData.reverse().forEach((record, index) => {
                    let color = record.score >= 90 ? '#166534' : (record.score >= 80 ? '#064e3b' : (record.score >= 70 ? '#b45309' : '#dc2626'));
                    tbody.innerHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${record.date}</td>
                            <td>${esc(localizeGenerated(trStored(String(record.range || ''))))}</td>
                            <td style="color:${color}; font-size:1.3rem;">${record.score}%</td>
                        </tr>
                    `;
                });
            }

            // 🌟 [جديد] عدد انتصارات وأوسمة "الاختبارات الثنائية" — راجع الدالة أدناه
            renderDualTestAchievements(student);

            // 🌟 [جديد — المرحلة 5] قسم "مسار التجويد" — راجع الدالة أدناه
            renderTajweedProfileSection(student);

            // 🌟 [جديد] تفعيل التعديل المباشر لكل بيانات ملف الطالب المعروضة هنا (الصورة،
            // الاسم، الصف، تاريخ الميلاد، الدولة، الهاتف) — راجع الدالة أدناه لتفاصيل الفكرة
            setupInlineProfileEditing(student);
        }
    });
}

// 🌟 [جديد] عرض عدد انتصارات وأوسمة "الاختبارات الثنائية" في ملف الطالب — يُقرأ من
// AppState.dualTestsManager (راجع database/dualTestsDB.js وengine/dualTestEngine.js).
// best-effort بالكامل: لو فشلت القراءة لأي سبب (مثلاً الميزة غير مُهيَّأة بعد)، تُعرض حالة
// "لا توجد أوسمة بعد" بدل تعطيل باقي شاشة الملف الشخصي.
async function renderDualTestAchievements(student) {
    const winsEl = document.getElementById('prof-duel-wins');
    const gridEl = document.getElementById('dtpa-badges-grid');
    if (!winsEl || !gridEl) return;

    if (!AppState.dualTestsManager) {
        winsEl.textContent = '0';
        gridEl.innerHTML = `<p class="dtpa-badges-empty">${t('dtpa_no_badges_yet')}</p>`;
        return;
    }

    try {
        const [allMatches, achievements] = await Promise.all([
            AppState.dualTestsManager.getAllMatches(),
            AppState.dualTestsManager.getAchievementsByStudent(student.id)
        ]);

        const winsCount = allMatches.filter(m => studentOutcomeInMatch(m, student.id) === 'win').length;
        winsEl.textContent = winsCount;

        if (achievements.length === 0) {
            gridEl.innerHTML = `<p class="dtpa-badges-empty">${t('dtpa_no_badges_yet')}</p>`;
            return;
        }

        // 🌟 تجميع الأوسمة القابلة للتكرار في بطاقة واحدة بعدّاد (×n) بدل تكرار نفس الوسام
        const counts = {};
        achievements.forEach(a => { counts[a.badgeKey] = (counts[a.badgeKey] || 0) + 1; });

        gridEl.innerHTML = Object.keys(counts).map(badgeKey => {
            const def = BADGE_CATALOG[badgeKey];
            if (!def) return '';
            const count = counts[badgeKey];
            const countHTML = count > 1 ? `<span class="dtpa-badge-count">×${count}</span>` : '';
            return `
            <div class="dtpa-badge-item" title="${t(def.descKey)}">
                <span class="dtpa-badge-icon">${def.icon}</span>
                <span class="dtpa-badge-info">
                    <span class="dtpa-badge-name">${t(def.nameKey)}</span>
                    ${countHTML}
                </span>
            </div>`;
        }).join('');
    } catch (e) {
        winsEl.textContent = '0';
        gridEl.innerHTML = `<p class="dtpa-badges-empty">${t('dtpa_no_badges_yet')}</p>`;
    }
}

// 🌟 [جديد — المرحلة 5] قسم "مسار التجويد" في ملف الطالب — نفس فلسفة best-effort في
// renderDualTestAchievements أعلاه بالضبط: لو AppState.tajweedManager غير مُهيَّأ لأي سبب،
// أو فشلت القراءة، تُعرض حالة "لم يبدأ بعد" بدل تعطيل باقي شاشة الملف الشخصي.
async function renderTajweedProfileSection(student) {
    const contentEl = document.getElementById('tjp-content');
    if (!contentEl) return;

    if (!AppState.tajweedManager) {
        contentEl.innerHTML = `<p class="tjp-empty">${t('tjw_profile_no_progress')}</p>`;
        return;
    }

    try {
        const [allMastery, achievements] = await Promise.all([
            AppState.tajweedManager.getMasteryByStudent(student.id),
            AppState.tajweedManager.getAchievementsByStudent(student.id)
        ]);

        if (allMastery.length === 0 && achievements.length === 0) {
            contentEl.innerHTML = `<p class="tjp-empty">${t('tjw_profile_no_progress')}</p>`;
            return;
        }

        const stageProgress = computeAllStageProgress(allMastery);
        const masteredCount = allMastery.filter(m => m.status === 'mastered').length;
        const currentStageDef = TAJWEED_STAGES.find(s => stageProgress[s.id] && stageProgress[s.id].status !== 'completed')
            || TAJWEED_STAGES[TAJWEED_STAGES.length - 1];
        const currentStageLabel = currentStageDef ? `${currentStageDef.icon} ${t(currentStageDef.nameKey)}` : '—';

        // 🌟 تجميع الأوسمة القابلة للتكرار في بطاقة واحدة بعدّاد (×n)، بنفس أسلوب
        // renderDualTestAchievements أعلاه بالضبط
        const counts = {};
        achievements.forEach(a => { counts[a.badgeKey] = (counts[a.badgeKey] || 0) + 1; });
        const badgesHTML = Object.keys(counts).length === 0
            ? `<p class="tjp-empty">${t('tjw_profile_badges_empty')}</p>`
            : `<div class="tjp-badges-grid">${Object.keys(counts).map(badgeKey => {
                const def = TAJWEED_BADGE_CATALOG[badgeKey];
                if (!def) return '';
                const count = counts[badgeKey];
                const countHTML = count > 1 ? ` ×${count}` : '';
                return `
                <div class="tjp-badge-item" title="${t(def.descKey)}">
                    <span class="tjp-badge-icon">${def.icon}</span>
                    <span class="tjp-badge-name">${t(def.nameKey)}${countHTML}</span>
                </div>`;
            }).join('')}</div>`;

        contentEl.innerHTML = `
            <div class="tjp-summary">
                <div class="tjp-summary-item"><strong>${currentStageLabel}</strong><span>${t('tjw_profile_current_stage')}</span></div>
                <div class="tjp-summary-item"><strong>${masteredCount}</strong><span>${t('tjw_profile_mastered_count')}</span></div>
            </div>
            ${badgesHTML}`;
    } catch (e) {
        console.warn('تعذرت قراءة تقدّم أبطال التجويد لهذا الطالب:', e);
        contentEl.innerHTML = `<p class="tjp-empty">${t('tjw_profile_no_progress')}</p>`;
    }
}

// 🌟 [جديد بالكامل] التعديل المباشر (Inline Edit) لملف الطالب — بدل ما يضطر المعلم
// يقفل الملف ويروح لجدول "كل الطلاب" عشان يعدّل (زر ✏️ هناك يفتح مودال منفصل)، أصبح
// ملف الطالب نفسه (الشاشة اللي بيفتحها المعلم أولاً) قابل للتعديل المباشر في مكانه:
// أي بيانة معروضة (الاسم، الصف، تاريخ الميلاد، الدولة، الهاتف، الصورة) بيضغط عليها
// فتتحول لحقل إدخال، والحفظ فوري عند الخروج من الحقل (blur) أو Enter — عبر نفس
// AppState.studentManager.updateStudent() المستخدم أصلاً في saveEditedStudentAction.
// بعد الانتهاء من أي تعديل، زر "📅 تقرير الإنجاز الشهري" الموجود بالفعل في نفس الشاشة
// هو أمر "الطباعة" — بلا مودال جديد، بلا وضع تعديل عام، وبلا أي شاشة معاينة إضافية،
// التزامًا بطلب المعلم صراحة بالبساطة.
// ⚠️ الافتراض المتّبع هنا: "كل حاجة في الشاشة" تعني بيانات هوية الطالب المعروضة في
// رأس الملف تحديدًا (الصورة/الاسم/الصف/العمر/الدولة/الهاتف) — أما الإحصائيات المحسوبة
// (النقاط، عدد التقييمات، الانتصارات)، الأوسمة، وسجل التقييمات السابقة فهي نتائج/سجلات
// تُبنى تلقائيًا من نشاط الطالب الفعلي، فتبقى للعرض فقط ولا تُعدَّل يدويًا هنا.
function computeAgeLabel(dob) {
    if (!dob) return t("stu_age_not_set");
    const d = new Date(dob);
    if (isNaN(d)) return t("stu_age_not_set");
    const years = Math.abs(new Date(Date.now() - d.getTime()).getUTCFullYear() - 1970);
    return tf("stu_age_years", { n: years });
}

function setupInlineProfileEditing(student) {
    // دالة عامة تحوّل أي عنصر عرض بسيط لحقل إدخال بالضغط عليه، وتحفظ القيمة تلقائيًا
    // عند الخروج منه — نفس السلوك لكل الحقول، فرقها بس نوع الحقل وطريقة العرض/الحفظ
    function bindInlineFieldEdit(el, { inputType = 'text', getValue, setValue, render, onAfterSave }) {
        if (!el) return;
        el.classList.add('prof-editable-field');
        el.addEventListener('click', () => {
            if (el.dataset.editing === '1') return;
            el.dataset.editing = '1';
            el.classList.add('is-editing');

            const input = document.createElement('input');
            input.type = inputType;
            input.className = 'prof-inline-input';
            input.value = getValue();
            el.textContent = '';
            el.appendChild(input);
            input.focus();
            if (input.select) input.select();

            let settled = false;
            const finish = async (commit) => {
                if (settled) return;
                settled = true;
                el.dataset.editing = '0';
                el.classList.remove('is-editing');
                if (commit) {
                    setValue(input.value);
                    await AppState.studentManager.updateStudent(student);
                    if (onAfterSave) onAfterSave();
                }
                el.innerHTML = render();
            };
            input.addEventListener('blur', () => finish(true));
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
                else if (e.key === 'Escape') finish(false);
            });
        });
    }

    // الاسم — مطلوب دائمًا (يُستخدم في تسجيل الدخول بالبحث بالاسم)، فلو تُرك فارغًا
    // يُحتفَظ بالاسم القديم بدل حفظ اسم فارغ يكسر تسجيل الدخول
    bindInlineFieldEdit(document.getElementById('prof-name'), {
        getValue: () => student.name || '',
        setValue: (v) => { const trimmed = v.trim(); if (trimmed) student.name = trimmed; },
        render: () => student.name,
        onAfterSave: () => populateStudentsDropdown()
    });

    // الصف الدراسي — اختياري
    bindInlineFieldEdit(document.getElementById('prof-grade'), {
        getValue: () => student.grade || '',
        setValue: (v) => { student.grade = v.trim(); },
        render: () => (student.grade ? trStored(student.grade) : t("stu_grade_not_set"))
    });

    // الدولة — اختياري
    bindInlineFieldEdit(document.getElementById('prof-country'), {
        getValue: () => student.country || '',
        setValue: (v) => { student.country = v.trim(); },
        render: () => student.country ? `🌍 ${esc(student.country)}` : t("stu_country_not_set")
    });

    // الهاتف — اختياري
    bindInlineFieldEdit(document.getElementById('prof-phone'), {
        inputType: 'tel',
        getValue: () => student.phone || '',
        setValue: (v) => { student.phone = v.trim(); },
        render: () => student.phone ? `📱 ${esc(student.phone)}` : t("stu_phone_not_set")
    });

    // تاريخ الميلاد — الحقل المعروض فعليًا هو "العمر" المحسوب، لكن التعديل يتم على
    // تاريخ الميلاد نفسه (منتقي تاريخ) ثم يُعاد حساب العمر وعرضه بعد الحفظ
    bindInlineFieldEdit(document.getElementById('prof-age'), {
        inputType: 'date',
        getValue: () => student.dob || '',
        setValue: (v) => { student.dob = v; },
        render: () => `🎂 ${computeAgeLabel(student.dob)}`
    });

    setupAvatarEdit(student);
}

// 🌟 [جديد] تعديل صورة الطالب مباشرة من ملف الطالب — نفس أسلوب قراءة الملف
// (FileReader → DataURL) المستخدم أصلاً في مودالي إضافة/تعديل الطالب، لكن بلا مودال:
// الضغط على شارة الكاميرا الصغيرة فوق الصورة يفتح منتقي الملفات مباشرة
function setupAvatarEdit(student) {
    const wrap = document.getElementById('prof-avatar-wrap');
    const fileInput = document.getElementById('prof-avatar-file');
    const editBtn = document.getElementById('btn-prof-avatar-edit');
    if (!wrap || !fileInput || !editBtn) return;

    editBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
        if (!fileInput.files || fileInput.files.length === 0) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            student.avatar = e.target.result;
            await AppState.studentManager.updateStudent(student);

            // إزالة أي شكل إيموجي بديل كان معروضًا قبل رفع صورة حقيقية، وإظهار الصورة الجديدة
            wrap.querySelectorAll('.profile-avatar').forEach(elx => { if (elx.tagName !== 'IMG') elx.remove(); });
            const img = document.getElementById('prof-avatar');
            img.src = student.avatar;
            img.style.display = 'block';
        };
        reader.readAsDataURL(fileInput.files[0]);
    });
}

// 🌟 [جديد] يضبط قيمة <select> الصف الدراسي مع الحفاظ على أي قيمة قديمة لم تعد
// موجودة ضمن خياراته الحالية (راجع تعليق استدعائها في openEditStudentModal). لو
// القيمة فارغة أو موجودة أصلاً كخيار، لا يفعل شيئًا زيادة عن select.value العادي.
function setGradeSelectValuePreservingLegacy(selectId, value) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.value = value;
    if (!value || select.value === value) return;
    // لا نضيف خيارًا مكرَّرًا لو سبق فتح طالب آخر بنفس القيمة القديمة في نفس الجلسة
    const alreadyExists = Array.from(select.options).some(o => o.value === value);
    if (!alreadyExists) {
        const legacyOption = document.createElement('option');
        legacyOption.value = value;
        legacyOption.textContent = value;
        select.insertBefore(legacyOption, select.firstChild);
    }
    select.value = value;
}
async function openEditStudentModal(id) {
    populateSurahOptions('edit-stu-memo-from', 'edit-stu-memo-to');
    const students = await AppState.studentManager.getAllStudents();
    let s = students.find(x => x.id === id);
    if(!s) return;
    document.getElementById('edit-stu-id').value = s.id;
    document.getElementById('edit-stu-name').value = s.name;
    document.getElementById('edit-stu-dob').value = s.dob || '';
    if(s.dob) calcAgeDynamic('edit-stu-dob', 'edit-age-display');
    // 🌟 [جديد] بعد تفصيل "المرحلة الإعدادية/الثانوية" إلى صفوف فردية في قائمة
    // edit-stu-grade، أي طالب قديم محفوظ بقيمة "المرحلة الإعدادية" أو "المرحلة
    // الثانوية" أو "خريج" (القيم المحذوفة من القائمة) لن تجد <option> مطابقًا، فيعرض
    // المتصفح القائمة فارغة ويُخاطر بمسح بيانة الصف الحقيقية للطالب لو حُفظ التعديل
    // دون انتباه. حفاظًا على التوافق مع البيانات القديمة (بدل حذفها بصمت)، نضيف خيارًا
    // مؤقتًا بنفس القيمة القديمة إن لم تكن أصلاً ضمن خيارات القائمة الجديدة.
    setGradeSelectValuePreservingLegacy('edit-stu-grade', s.grade || '');
    document.getElementById('edit-stu-country').value = s.country || '';
    document.getElementById('edit-stu-phone').value = s.phone || '';
    document.getElementById('edit-stu-memo-from').value = s.memoFrom || '';
    document.getElementById('edit-stu-memo-to').value = s.memoTo || '';
    // 🌟 [إصلاح فحص الأزرار] كان حقل "الجنس (للصورة الرمزية)" يظهر بلا أي ربط بالحفظ. الآن يعكس نوع
    // الصورة الرمزية الحالية (لو كانت رمزًا تعبيريًا) ويُطبَّق عند الحفظ؛ ولا أثر له إن كان للطالب صورة مرفوعة 🌟
    const _genderSel = document.getElementById('edit-stu-gender');
    if (_genderSel) _genderSel.value = (s.avatar && s.avatar.length < 10 && EDIT_GIRL_AVATARS.includes(s.avatar)) ? 'girl' : 'boy';
    openModal('edit-modal');
}

// 🌟 رموز الصور الرمزية للبنات (مطابقة لخيارات my-students.html) 🌟
const EDIT_GIRL_AVATARS = ['👧🏻', '👩🏻', '🧕🏻'];

async function saveEditedStudentAction() {
    let id = parseStudentId(document.getElementById('edit-stu-id').value);
    const students = await AppState.studentManager.getAllStudents();
    let s = students.find(x => x.id === id);
    if(!s) return;
    s.name = document.getElementById('edit-stu-name').value.trim();
    s.dob = document.getElementById('edit-stu-dob').value;
    s.grade = document.getElementById('edit-stu-grade').value;
    s.country = document.getElementById('edit-stu-country').value;
    s.phone = document.getElementById('edit-stu-phone').value;
    s.memoFrom = document.getElementById('edit-stu-memo-from').value;
    s.memoTo = document.getElementById('edit-stu-memo-to').value;
    // 🌟 [إصلاح فحص الأزرار] تطبيق اختيار الجنس على الصورة الرمزية (رمز تعبيري فقط، لا الصور المرفوعة) 🌟
    const _g = document.getElementById('edit-stu-gender')?.value;
    if (_g && (!s.avatar || s.avatar.length < 10)) {
        const isGirlNow = EDIT_GIRL_AVATARS.includes(s.avatar);
        if (_g === 'girl' && !isGirlNow) s.avatar = '👧🏻';
        else if (_g === 'boy' && (isGirlNow)) s.avatar = '👦🏻';
    }
    const fileInput = document.getElementById('edit-stu-avatar');
    if(fileInput && fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            // 🌟 [إصلاح فحص الأزرار] نفس تصغير صورة مسار الإضافة (256px) كي لا تتضخم القاعدة عند التعديل 🌟
            s.avatar = await shrinkAvatarDataUrl(e.target.result);
            await AppState.studentManager.updateStudent(s);
            closeModal('edit-modal'); renderAllStudentsTable(); alert(t("stu_edited_ok"));
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        await AppState.studentManager.updateStudent(s);
        closeModal('edit-modal'); renderAllStudentsTable(); alert(t("stu_edited_ok"));
    }
}

async function deleteStudentAction(id) {
    if(confirm(t("stu_delete_confirm"))) {
        await AppState.studentManager.deleteStudent(id);
        // 🌟 [إصلاح تدقيق] تنظيف كل بقايا الطالب (history_ + الصورة + جلسات/مراجعات/أوسمة/حفظ شهري) لا history_ فقط
        await purgeStudentRelatedData(id);
        renderAllStudentsTable();
    }
}

async function toggleHideStudentAction(id, hide) {
    const students = await AppState.studentManager.getAllStudents();
    let s = students.find(x => x.id === id);
    if(s) { s.isHidden = hide; await AppState.studentManager.updateStudent(s); renderAllStudentsTable(); }
}


// 🌟 [جديد] تصغير صورة الطالب (data URL) إلى 256px كحد أقصى — حل مدمج بالمتصفح بلا مكتبات. يُرجع الأصل عند أي فشل.
function shrinkAvatarDataUrl(dataUrl, max = 256) {
    return new Promise((resolve) => {
        try {
            const img = new Image();
            img.onload = () => {
                try {
                    const ratio = Math.min(1, max / Math.max(img.width, img.height));
                    const w = Math.max(1, Math.round(img.width * ratio));
                    const h = Math.max(1, Math.round(img.height * ratio));
                    const c = document.createElement('canvas');
                    c.width = w; c.height = h;
                    c.getContext('2d').drawImage(img, 0, 0, w, h);
                    const out = c.toDataURL('image/jpeg', 0.85);
                    resolve(out && out.length < dataUrl.length ? out : dataUrl);
                } catch (err) { resolve(dataUrl); }
            };
            img.onerror = () => resolve(dataUrl);
            img.src = dataUrl;
        } catch (err) { resolve(dataUrl); }
    });
}
