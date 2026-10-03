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

    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    let bdayBoys = [];

    students.filter(s => !s.isHidden).forEach(s => {
        let option = document.createElement('option');
        option.value = s.name;
        dataList.appendChild(option);

        if (s.dob) {
            const parts = s.dob.split('-');
            if (parts.length === 3) {
                if (parseInt(parts[1], 10) === currentMonth && parseInt(parts[2], 10) === currentDay) {
                    bdayBoys.push(s.name);
                }
            }
        }
    });

    if (bdayBoys.length > 0 && !window.bdayShown) {
        window.bdayShown = true;
        setTimeout(() => alert(tf('stu_bday_alert', { names: bdayBoys.join(t('stu_and')) })), 800);
    }
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
    // 🌟 [جديد 2026-10-01 — الدخول السريع] تسجيل "آخر تقييم" (طالب + وضع كبار/أطفال) لبطاقة "تابع من حيث توقفت" في الرئيسية
    // (components/homeFast.js). localStorage خفيف وbest-effort: أي فشل لا يؤثر على الدخول للتقييم إطلاقاً.
    try { if (student && student.id != null) localStorage.setItem('dh_last_evaluation', JSON.stringify({ id: student.id, name: student.name || '', kids: !!AppState.isKidsMode, at: Date.now() })); } catch (e) { /* اختياري */ }

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
    import('../components/guidedTour.js').then(m => m.maybeStartTour('students')).catch(() => {});

    document.getElementById('btn-back-my-students')?.addEventListener('click', loadSplashScreen);
    document.getElementById('btn-all-students')?.addEventListener('click', loadAllStudentsScreen);

    document.getElementById('btn-add-student')?.addEventListener('click', () => {
        populateSurahOptions('stu-memo-from', 'stu-memo-to');
        openModal('add-modal');
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

    document.querySelectorAll('.avatar-opt').forEach(opt => {
        opt.addEventListener('click', (e) => {
            document.querySelectorAll('.avatar-opt').forEach(o => o.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById('selected-avatar').value = e.target.dataset.av;
        });
    });

    document.getElementById('btn-close-add-modal')?.addEventListener('click', () => closeModal('add-modal'));
    document.getElementById('stu-dob')?.addEventListener('change', () => calcAgeDynamic('stu-dob', 'age-display'));

    document.getElementById('btn-save-new-student')?.addEventListener('click', async () => {
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
            const _norm = (x) => String(x || '').replace(/[ً-ٰٟـ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
            const _existing = await AppState.studentManager.getAllStudents();
            if (_existing.some(x => _norm(x.name) === _norm(data.name))) return alert(t("stu_name_duplicate"));
        }

        const fileInput = document.getElementById('stu-avatar');
        if (fileInput && fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                // 🌟 [إصلاح تدقيق] كانت الصورة تُخزَّن بحجمها الأصلي كاملاً (قد تبلغ عدة ميجابايت لكل طالب فتتضخم القاعدة والنسخ
                // الاحتياطي). الآن تُصغَّر إلى 256px كحد أقصى (JPEG) عبر canvas المدمج في المتصفح؛ لو فشل التصغير نستخدم الأصل.
                data.avatar = await shrinkAvatarDataUrl(e.target.result);
                const newId = await AppState.studentManager.addStudent(data);
                closeModal('add-modal');
                populateStudentsDropdown();
                alert(t("stu_saved_ok"));
                await promptInitialMemorizationPositionForNewStudent({ ...data, id: newId });
                offerNewStudentGames({ ...data, id: newId });
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            const newId = await AppState.studentManager.addStudent(data);
            closeModal('add-modal');
            populateStudentsDropdown();
            alert(t("stu_saved_ok"));
            await promptInitialMemorizationPositionForNewStudent({ ...data, id: newId });
            offerNewStudentGames({ ...data, id: newId });
        }
    });
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
    try {
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

async function renderAllStudentsTable() {
    const students = await AppState.studentManager.getAllStudents();
    const tbody = document.getElementById('all-students-body');
    if(!tbody) return;
    tbody.innerHTML = "";
    students.forEach((s, index) => {
        let ageStr = t("stu_not_set");
        if(s.dob) {
            let d = new Date(s.dob);
            ageStr = tf("stu_age_years", { n: Math.abs(new Date(Date.now() - d.getTime()).getUTCFullYear() - 1970) });
        }
        let evalsCount = JSON.parse(localStorage.getItem(`history_${s.id}`))?.length || 0;
        let hideBtn = s.isHidden ? `<button class="btn btn-show" data-id="${esc(s.id)}" style="padding:5px; font-size:1rem; min-width:unset;" title="${t('stu_restore')}">👁️</button>` : `<button class="btn btn-outline btn-hide" data-id="${esc(s.id)}" style="padding:5px; font-size:1rem; min-width:unset;" title="${t('stu_hide')}">🙈</button>`;
        let manageBtns = `<button class="btn btn-edit" data-id="${esc(s.id)}" style="padding:5px; font-size:1rem; min-width:unset;" title="${t('stu_edit_data')}">✏️</button>${hideBtn}<button class="btn btn-wrong btn-delete" data-id="${esc(s.id)}" style="padding:5px; font-size:1rem; min-width:unset;" title="${t('stu_delete_final')}">🗑️</button>`;
        let weaknessBtn = (s.weaknesses && s.weaknesses.length > 0) ? `<button class="btn btn-weakness" data-id="${esc(s.id)}" style="padding:5px 10px; font-size:1rem;">${tf('stu_errors_btn', { n: s.weaknesses.length })}</button>` : `<span style="color:#aaa;">${t('stu_no_errors')}</span>`;

        let nameButton = `<button class="btn-prof-link" data-id="${esc(s.id)}" style="background:none; border:none; color:#10b981; font-weight:bold; font-size:1.2rem; cursor:pointer; text-decoration:underline; font-family:inherit; padding:0;">${esc(s.name)}</button>`;

        // 🌟 [جديد 2026-10-01] زر "ابدأ تقييم" في صف الطالب (مخفي للطالب المخفي) — يبدأ التقييم مباشرة بلا المرور بالرئيسية
        let startEvalBtn = s.isHidden ? '<span style="color:#aaa;">—</span>' : `<button class="btn as-btn-primary btn-start-eval" data-id="${esc(s.id)}" style="padding:6px 12px; font-size:1rem; min-width:unset;">${t('stu_start_eval_row')}</button>`;

        // 🌟 [إصلاح فحص الأزرار] data-label على كل خلية ليعرض CSS الهاتف (بطاقات) اسم الحقل بجانب قيمته 🌟
        tbody.innerHTML += `<tr style="${s.isHidden ? 'opacity:0.5; background:rgba(0,0,0,0.05);' : ''}"><td data-label="${t('as_col_no')}">${index+1}</td><td data-label="${t('as_col_name')}">${nameButton}</td><td data-label="${t('as_col_age')}">${ageStr}</td><td data-label="${t('as_col_grade')}">${esc(s.grade ? trStored(s.grade) : t('stu_not_set'))}</td><td data-label="${t('as_col_points')}" style="font-weight:bold;">${s.totalScore || 0}</td><td data-label="${t('as_col_start_eval')}">${startEvalBtn}</td><td data-label="${t('as_col_evals')}">${evalsCount}</td><td data-label="${t('as_col_manage')}">${manageBtns}</td><td data-label="${t('as_col_errors')}">${weaknessBtn}</td></tr>`;
    });
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
    document.getElementById('all-students-body')?.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if(!target) return;
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
        <div class="quran-text" style="font-size:1.8rem; color:#1e293b; margin-bottom:10px; line-height:1.6;">﴿ ${w.text || ''} ﴾</div>
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
