// student/student.js
import { AppState, loadSplashScreen, loadDashboardScreen, loadLoginScreen, t } from '../core/app.js';
import { loadScreen } from '../core/navigation.js';
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
// 🌟 [جديد] بطاقة الترحيب بالطالب عند اختيار اسمه — راجع components/welcomeBanner.js
import { showStudentWelcome } from '../components/welcomeBanner.js';

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
        setTimeout(() => alert(`🎉 إشعار تربوي هام:\nاليوم يوافق يوم ميلاد البطل (${bdayBoys.join(' و ')})! لا تنسَ تهنئته 🎂`), 800);
    }
}

function calcAgeDynamic(inputId, displayId) {
    const dobInput = document.getElementById(inputId);
    const displaySpan = document.getElementById(displayId);
    if (!dobInput || !displaySpan) return;
    const dob = new Date(dobInput.value);
    if (isNaN(dob)) return;
    const ageDate = new Date(Date.now() - dob.getTime());
    displaySpan.innerText = `(العمر: ${Math.abs(ageDate.getUTCFullYear() - 1970)} سنة)`;
}

function populateSurahOptions(fromId, toId) {
    const selFrom = document.getElementById(fromId);
    const selTo = document.getElementById(toId);
    if (!selFrom || !selTo) return;
    selFrom.innerHTML = '';
    selTo.innerHTML = '';
    AppState.surahsData.forEach(s => {
        selFrom.appendChild(new Option(s.name, s.name));
        selTo.appendChild(new Option(s.name, s.name));
    });
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
        }
    }).catch(() => { /* تجاهل بصمت — التلميح غير حرج لعمل الشاشة */ });

    const searchInput = document.getElementById('student-search-input');
    if(searchInput) {
        searchInput.removeAttribute('list');

        searchInput.addEventListener('input', function() {
            if(this.value.trim().length > 0) {
                this.setAttribute('list', 'student-list');
            } else {
                this.removeAttribute('list');
            }
        });

        searchInput.addEventListener('focus', function() {
            if(this.value.trim().length === 0) {
                this.removeAttribute('list');
            }
        });
    }

    // زر دخول المعلم المعتاد
    document.getElementById('btn-login-submit')?.addEventListener('click', async () => {
        const typedName = document.getElementById('student-search-input').value.trim();
        if (!typedName) return alert("الرجاء كتابة أو اختيار اسم الطالب أولاً!");

        const students = await AppState.studentManager.getAllStudents();
        AppState.currentStudent = students.find(s => s.name === typedName);

        if (AppState.currentStudent) {
            document.getElementById('top-student-name').innerText = `البطل: ${AppState.currentStudent.name}`;

            // 🌟 [جديد] بطاقة الترحيب بالطالب — تُعرض هنا تحديداً: بعد التأكد من أن الاسم
            // مسجَّل فعلاً وقبل الدخول إلى لوحة التقييم مباشرة. مقصود ألا ننتظرها (بلا await
            // ولا setTimeout قبل التحميل): البطاقة تظهر فوق الشاشة بينما تُحمَّل لوحة التقييم
            // خلفها في نفس اللحظة، فلا يضيع على المعلم أي وقت، وتختفي هي وحدها بعد ثوانٍ
            // قليلة أو فوراً بأي نقرة/زر Esc. وضع الأطفال يُمرَّر لتكبير البطاقة قليلاً فقط
            // (نفس محتوى وألوان الهوية، راجع dh-welcome-kids في css/welcomeBanner.css) 🌟
            showStudentWelcome(AppState.currentStudent, { kids: AppState.isKidsMode });

            loadDashboardScreen();
        } else {
            // 🌟 [عدّل] صياغة أقصر بطلب صريح من المعلم — أصبح لها مفتاح ترجمة في core/i18n.js
            // بدل نص عربي ثابت هنا (نفس أسلوب بقية رسائل الشاشة)
            alert(t('login_name_not_found_alert'));
        }
    });
}

export async function loadMyStudentsScreen() {
    await loadScreen({
        templateUrl: 'student/my-students.html',
        initFunction: setupMyStudentsListeners
    });
}

function setupMyStudentsListeners() {
    document.getElementById('btn-back-my-students')?.addEventListener('click', loadSplashScreen);
    document.getElementById('btn-all-students')?.addEventListener('click', loadAllStudentsScreen);

    document.getElementById('btn-add-student')?.addEventListener('click', () => {
        populateSurahOptions('stu-memo-from', 'stu-memo-to');
        openModal('add-modal');
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
        if (!data.name) return alert("الاسم مطلوب!");

        const fileInput = document.getElementById('stu-avatar');
        if (fileInput && fileInput.files.length > 0) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                data.avatar = e.target.result;
                await AppState.studentManager.addStudent(data);
                closeModal('add-modal');
                populateStudentsDropdown();
                alert("تم الحفظ بنجاح!");
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            await AppState.studentManager.addStudent(data);
            closeModal('add-modal');
            populateStudentsDropdown();
            alert("تم الحفظ بنجاح!");
        }
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

async function renderAllStudentsTable() {
    const students = await AppState.studentManager.getAllStudents();
    const tbody = document.getElementById('all-students-body');
    if(!tbody) return;
    tbody.innerHTML = "";
    students.forEach((s, index) => {
        let ageStr = "غير محدد";
        if(s.dob) {
            let d = new Date(s.dob);
            ageStr = Math.abs(new Date(Date.now() - d.getTime()).getUTCFullYear() - 1970) + " سنة";
        }
        let evalsCount = JSON.parse(localStorage.getItem(`history_${s.id}`))?.length || 0;
        let hideBtn = s.isHidden ? `<button class="btn btn-show" data-id="${s.id}" style="padding:5px; font-size:1rem; min-width:unset;" title="استعادة البطل">👁️</button>` : `<button class="btn btn-outline btn-hide" data-id="${s.id}" style="padding:5px; font-size:1rem; min-width:unset;" title="إخفاء البطل">🙈</button>`;
        let manageBtns = `<button class="btn btn-edit" data-id="${s.id}" style="padding:5px; font-size:1rem; min-width:unset;" title="تعديل البيانات">✏️</button>${hideBtn}<button class="btn btn-wrong btn-delete" data-id="${s.id}" style="padding:5px; font-size:1rem; min-width:unset;" title="حذف البطل نهائياً">🗑️</button>`;
        let weaknessBtn = (s.weaknesses && s.weaknesses.length > 0) ? `<button class="btn btn-weakness" data-id="${s.id}" style="padding:5px 10px; font-size:1rem;">🛠️ الأخطاء (${s.weaknesses.length})</button>` : `<span style="color:#aaa;">لا أخطاء</span>`;

        let nameButton = `<button class="btn-prof-link" data-id="${s.id}" style="background:none; border:none; color:#10b981; font-weight:bold; font-size:1.2rem; cursor:pointer; text-decoration:underline; font-family:inherit; padding:0;">${s.name}</button>`;

        tbody.innerHTML += `<tr style="${s.isHidden ? 'opacity:0.5; background:rgba(0,0,0,0.05);' : ''}"><td>${index+1}</td><td>${nameButton}</td><td>${ageStr}</td><td>${s.grade || 'غير محدد'}</td><td style="font-weight:bold;">${s.totalScore || 0}</td><td>${evalsCount}</td><td>${manageBtns}</td><td>${weaknessBtn}</td></tr>`;
    });
}

function setupAllStudentsListeners() {
    document.getElementById('btn-back-login')?.addEventListener('click', loadMyStudentsScreen);
    document.getElementById('all-students-body')?.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if(!target) return;
        const id = parseInt(target.dataset.id);

        if(target.classList.contains('btn-prof-link')) {
            const students = await AppState.studentManager.getAllStudents();
            const studentProfile = students.find(s => s.id === id);
            if(studentProfile) {
                AppState.currentStudent = studentProfile;
                loadStudentProfileScreen();
            }
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
    let typeLabel = w.questionTypeLabel || t('hw_q_type_label');
    let locationText = w.surahName ? `سورة ${w.surahName}${w.num ? ' - آية ' + w.num : ''}` : '';
    let lang = AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US';
    let recordedDate = w.dateRecorded ? new Date(w.dateRecorded).toLocaleDateString(lang) : '—';
    let resolvedDate = w.dateResolved ? new Date(w.dateResolved).toLocaleDateString(lang) : '—';
    let errorLine = w.errorTypes ? `<div style="font-size:0.95rem; color:#991b1b; margin-bottom:8px;">${t("الخطأ السابق المسجل:")} [ ${w.errorTypes} ]</div>` : '';

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
            document.getElementById('prof-grade').innerText = student.grade || "الصف غير محدد";
            document.getElementById('prof-points').innerText = student.totalScore || 0;

            let ageStr = "العمر غير محدد";
            if(student.dob) {
                let d = new Date(student.dob);
                ageStr = Math.abs(new Date(Date.now() - d.getTime()).getUTCFullYear() - 1970) + " سنة";
            }
            document.getElementById('prof-age').innerText = `🎂 ${ageStr}`;
            document.getElementById('prof-country').innerText = student.country ? `🌍 ${student.country}` : "🌍 البلد غير محدد";
            document.getElementById('prof-phone').innerText = student.phone ? `📱 ${student.phone}` : "📱 الهاتف غير مسجل";

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

            const btnWeakness = document.getElementById('btn-prof-weakness');
            if (student.weaknesses && student.weaknesses.length > 0) {
                btnWeakness.innerText = `🛠️ بدء تحدي الأخطاء (${student.weaknesses.length})`;
                btnWeakness.onclick = () => {
                    if (AppState.isKidsMode) {
                        openKidsGameScreen({}, true);
                    } else {
                        openAdultGameScreen({}, true);
                    }
                };
            } else {
                btnWeakness.style.background = "#cbd5e1";
                btnWeakness.style.color = "#475569";
                btnWeakness.innerText = "لا توجد أخطاء مسجلة 🎉";
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
                    alert('جاري تجهيز شاشة التقرير الشهري 🛠️');
                });
            });

            const histData = JSON.parse(localStorage.getItem(`history_${student.id}`)) || [];
            document.getElementById('prof-evals').innerText = histData.length;

            const tbody = document.getElementById('prof-history-body');
            tbody.innerHTML = "";
            if (histData.length === 0) {
                tbody.innerHTML = `<tr><td colspan="4">لا توجد تقييمات سابقة لهذا البطل.</td></tr>`;
            } else {
                histData.reverse().forEach((record, index) => {
                    let color = record.score >= 90 ? '#166534' : (record.score >= 80 ? '#064e3b' : (record.score >= 70 ? '#b45309' : '#dc2626'));
                    tbody.innerHTML += `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${record.date}</td>
                            <td>${record.range}</td>
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
    if (!dob) return "العمر غير محدد";
    const d = new Date(dob);
    if (isNaN(d)) return "العمر غير محدد";
    const years = Math.abs(new Date(Date.now() - d.getTime()).getUTCFullYear() - 1970);
    return `${years} سنة`;
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
        render: () => student.grade || "الصف غير محدد"
    });

    // الدولة — اختياري
    bindInlineFieldEdit(document.getElementById('prof-country'), {
        getValue: () => student.country || '',
        setValue: (v) => { student.country = v.trim(); },
        render: () => student.country ? `🌍 ${student.country}` : "🌍 البلد غير محدد"
    });

    // الهاتف — اختياري
    bindInlineFieldEdit(document.getElementById('prof-phone'), {
        inputType: 'tel',
        getValue: () => student.phone || '',
        setValue: (v) => { student.phone = v.trim(); },
        render: () => student.phone ? `📱 ${student.phone}` : "📱 الهاتف غير مسجل"
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
    openModal('edit-modal');
}

async function saveEditedStudentAction() {
    let id = parseInt(document.getElementById('edit-stu-id').value);
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
    const fileInput = document.getElementById('edit-stu-avatar');
    if(fileInput && fileInput.files.length > 0) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            s.avatar = e.target.result;
            await AppState.studentManager.updateStudent(s);
            closeModal('edit-modal'); renderAllStudentsTable(); alert("تم التعديل ✔️");
        };
        reader.readAsDataURL(fileInput.files[0]);
    } else {
        await AppState.studentManager.updateStudent(s);
        closeModal('edit-modal'); renderAllStudentsTable(); alert("تم التعديل ✔️");
    }
}

async function deleteStudentAction(id) {
    if(confirm("⚠️ تحذير: هل أنت متأكد من حذف بيانات وسجل هذا البطل نهائياً؟")) {
        await AppState.studentManager.deleteStudent(id);
        localStorage.removeItem(`history_${id}`);
        renderAllStudentsTable();
    }
}

async function toggleHideStudentAction(id, hide) {
    const students = await AppState.studentManager.getAllStudents();
    let s = students.find(x => x.id === id);
    if(s) { s.isHidden = hide; await AppState.studentManager.updateStudent(s); renderAllStudentsTable(); }
}