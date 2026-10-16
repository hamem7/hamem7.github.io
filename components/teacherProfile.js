// components/teacherProfile.js
// 🌟 كل منطق واجهة "ملف المعلم" في الشاشة الرئيسية: الترحيب الديناميكي (وقت + اسم)،
// شارة "أكمل بياناتك" التدريجية غير الإجبارية، نافذة تعديل البيانات، ملخص الواجبات
// السريع، وتنبيه يوم ميلاد المعلم نفسه (بانر داخل التطبيق + إشعار جهاز).
// لا يوجد أي إجبار هنا على إدخال أي بيانات — كل شيء اختياري ويعمل التطبيق بدونه بالكامل.

import { AppState } from '../core/app.js';
import { t } from '../core/i18n.js';
// 🌟 [جديد] نظام "النسخة الاحتياطية المحلية" — راجع core/backupRestore.js للآلية الكاملة
// وشرح الافتراضات. الأزرار الفعلية أُضيفت داخل نافذة ملف المعلم (splash.html) لعدم وجود
// شاشة "إعدادات" عامة مستقلة بعد في المشروع
import { exportFullBackup, restoreFromBackupFile, getLastBackupAt, inspectBackupFile, getSafetySnapshotInfo, restoreFromSafetySnapshot } from '../core/backupRestore.js';
// 🌟 [جديد 2026-10-06] حساب جوجل: عرض الإيميل الحالي + «تغيير الإيميل» دائماً + تسجيل الخروج
import { getTeacherEmail, isTeacherAuthed, signOutTeacher } from '../core/api.js';

// 🌟 [جديد] أيقونة شخص افتراضية (SVG لا إيموجي، اتساقًا مع الهوية البصرية الأهدأ
// المعتمدة أصلاً في هذه الشاشة) — تظهر في دائرة الترحيب فقط قبل إدخال أي اسم ولا رفع
// أي صورة بعد، أي حالة "بداية تمامًا" فقط
const DEFAULT_AVATAR_ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>';

// تصغير الصورة قبل حفظها (نفس فكرة resizeImageToDataUrl الموجودة في reports/report.js
// لكن نسخة محلية صغيرة هنا لتفادي تضخيم حجم قاعدة البيانات المحلية بصور كبيرة جداً)
// 🌟 [إصلاح] أضفنا معامل format (افتراضيًا jpeg كما كان، بدون أي تغيير على صورة المعلم
// الشخصية). سبب الإصلاح: صورة الختم/التوقيع غالبًا ملف PNG بخلفية شفافة، ولون البكسلات
// تحت الشفافية عادة أسود. عند تحويلها بـ toDataURL('image/jpeg', ...) تُفقَد قناة
// الشفافية تمامًا لأن JPEG لا يدعمها، فتظهر الخلفية الشفافة كمربع أسود كامل حول التوقيع
// بدل أن تختفي — وهذا هو سبب المربع الأسود الذي يظهر في التقارير. الحل: نحفظ الختم
// بصيغة PNG (تحافظ على الشفافية) بدل JPEG، فيظهر خط التوقيع فقط بلا أي خلفية.
function resizeImageToDataUrl(file, maxSize = 300, quality = 0.85, format = 'image/jpeg') {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () => {
            const img = new Image();
            img.onerror = reject;
            img.onload = () => {
                let { width, height } = img;
                if (width > height && width > maxSize) { height = Math.round(height * (maxSize / width)); width = maxSize; }
                else if (height > maxSize) { width = Math.round(width * (maxSize / height)); height = maxSize; }
                const canvas = document.createElement('canvas');
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL(format, quality));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

// 🌟 [جديد] دورة يومية لصيغ الترحيب — بنفس فلسفة DAILY_QUOTES الموجودة أصلاً في
// components/homeQuickview.js: صيغة واحدة ثابتة لكل يوم (حسب رقم اليوم منذ Epoch)،
// وليست عشوائية حقيقية، فتتغيّر تلقائيًا يوميًا بلا أي تخزين أو حالة إضافية. الصيغة
// الأولى في كل قائمة (index 0) هي نفس نص greeting_morning/evening الافتراضي القديم
// بالحرف، حتى لا يتغيّر أول انطباع لمن فتح المنصة قبل هذا التحديث.
const MORNING_GREETING_KEYS = ['greeting_morning', 'greeting_morning_2', 'greeting_morning_3', 'greeting_morning_4'];
const EVENING_GREETING_KEYS = ['greeting_evening', 'greeting_evening_2', 'greeting_evening_3', 'greeting_evening_4'];
// 🌟 [جديد] تحية خاصة بيوم الجمعة — تحل محل دورة الصباح/المساء أعلاه طوال يوم الجمعة
// بأكمله (بلا اعتبار لوقت اليوم)، لأن بركة الجمعة لا ترتبط بساعة محددة. افتراض صريح:
// "الجمعة" هنا محسوبة بالتقويم الميلادي المحلي لجهاز المعلم (Date.getDay() === 5)،
// بلا أي اعتبار لفروق التقويم الهجري أو المنطقة الزمنية.
const FRIDAY_GREETING_KEYS = ['greeting_friday', 'greeting_friday_2'];

// نفس رقم اليوم المستخدَم في homeQuickview.js (أيام كاملة منذ Epoch) — يضمن دورانًا
// ثابتًا مستقلاً عن أي حالة داخل الجلسة، ويتغيّر تلقائيًا عند تغيّر اليوم الميلادي
function dayRotationIndex(poolLength) {
    const dayIndex = Math.floor(Date.now() / 86400000);
    return dayIndex % poolLength;
}

function greetingPrefix() {
    const now = new Date();
    if (now.getDay() === 5) { // 🌟 الجمعة
        return t(FRIDAY_GREETING_KEYS[dayRotationIndex(FRIDAY_GREETING_KEYS.length)]);
    }
    const pool = now.getHours() < 12 ? MORNING_GREETING_KEYS : EVENING_GREETING_KEYS;
    return t(pool[dayRotationIndex(pool.length)]);
}

// 🌟 [جديد] اللقب المناسب حسب جنس المعلم/ـة المحفوظ في ملفه الشخصي — "شيخ"
// افتراضياً (نفس السلوك القديم تماماً، ولمن لم يحدد الجنس بعد) ما لم يكن الجنس
// المحفوظ "أنثى" صراحةً (profile.gender === 'female'). لا يوجد أي تخمين من الاسم
// أو غيره — حقل بيانات صريح فقط.
function teacherTitleKey(profile) {
    return profile && profile.gender === 'female' ? 'greeting_title_female' : 'greeting_title';
}

export function renderTeacherGreeting() {
    const el = document.getElementById('home-greeting');
    if (!el) return;
    const profile = AppState.currentTeacher;
    const name = profile && profile.name ? profile.name : '';
    let text = greetingPrefix();
    if (name) {
        text += AppState.currentLang === 'ar' ? ` ${t(teacherTitleKey(profile))} ${name}` : `, ${name}`;
    }
    // 🌟 حذفنا إيموجي 👋 الثابت هنا كجزء من تحديث الشاشة الرئيسية (هوية بصرية أهدأ
    // بأيقونات SVG بدل الإيموجي) — النص نفسه ومنطق الترحيب لم يتغيّرا إطلاقاً
    el.textContent = text;
}

// 🔒 اسم منشئ المنصة في الفوتر ثابت أبداً — لا يتغير باسم المعلم المسجَّل في ملفه
// الشخصي. النص مُدرج في splash.html عبر مفتاح الترجمة teacher_name (يتبدّل فقط مع اللغة).
// أُبقيت الدالة لأن مستدعيها ما زالوا يستوردونها، لكنها لا تستبدل الاسم إطلاقاً.
export function renderFooterCredit() {
    const nameEl = document.getElementById('footer-teacher-name');
    if (!nameEl) return;
    nameEl.setAttribute('data-i18n', 'teacher_name');
}

export function renderProfileBadge() {
    const badge = document.getElementById('teacher-profile-badge');
    if (!badge) return;
    const profile = AppState.currentTeacher || {};
    const fields = [profile.name, profile.photo, profile.dob];
    const filled = fields.filter(Boolean).length;
    if (filled >= fields.length) {
        badge.style.display = 'none';
        return;
    }
    const pct = Math.round((filled / fields.length) * 100);
    badge.style.display = 'inline-flex';
    const pctEl = badge.querySelector('.badge-pct');
    if (pctEl) pctEl.textContent = `${pct}%`;
}

// 🌟 [جديد] دائرة صورة المعلم/ـة الدائمة بجانب الترحيب — بعكس renderProfileBadge أعلاه
// (يختفي تمامًا بعد اكتمال البيانات)، هذه الدائرة ظاهرة دائمًا مهما كانت حالة البيانات،
// فتبقى نقطة دخول ثابتة لفتح نافذة التعديل حتى بعد إكمال كل الحقول. أولوية العرض: الصورة
// المرفوعة ← أول حرف من الاسم ← أيقونة شخص افتراضية (لا يوجد اسم ولا صورة بعد).
export function renderTeacherAvatar() {
    const photoEl = document.getElementById('teacher-avatar-btn-photo');
    const fallbackEl = document.getElementById('teacher-avatar-btn-fallback');
    if (!photoEl || !fallbackEl) return;
    const profile = AppState.currentTeacher;
    const name = profile && profile.name ? profile.name.trim() : '';

    const showFallback = () => {
        photoEl.hidden = true;
        fallbackEl.hidden = false;
        fallbackEl.innerHTML = name ? '' : DEFAULT_AVATAR_ICON;
        if (name) fallbackEl.textContent = name.charAt(0);
    };

    if (profile && profile.photo) {
        photoEl.src = profile.photo;
        photoEl.hidden = false;
        fallbackEl.hidden = true;
        // 🌟 خط رجوع دفاعي: لو تلفت الصورة المخزّنة لأي سبب، نستبدلها بدل مربع مكسور
        photoEl.onerror = showFallback;
    } else {
        showFallback();
    }
}

export function renderHomeworkSummary() {
    const el = document.getElementById('home-summary-bar');
    if (!el || !AppState.homeworkManager) return;
    AppState.homeworkManager.getAllHomeworks().then(list => {
        const pendingCount = (list || []).filter(h => h.status === 'published').length;
        if (pendingCount > 0) {
            el.style.display = 'inline-flex';
            const countEl = el.querySelector('.summary-hw-count');
            if (countEl) countEl.textContent = pendingCount;
        } else {
            el.style.display = 'none';
        }
    }).catch(() => { el.style.display = 'none'; });
}

function showTeacherBirthdayBanner(name, profile) {
    const banner = document.getElementById('teacher-bday-banner');
    if (!banner) return;
    const msgKey = profile && profile.gender === 'female' ? 'teacher_bday_notification_msg_female' : 'teacher_bday_notification_msg';
    const textEl = banner.querySelector('.bday-banner-text');
    if (textEl) textEl.textContent = `${t(msgKey)}${name || ''} 🎉`;
    banner.style.display = 'flex';
}

// 🎂 مكافئ لدالة checkBirthdays() الخاصة بالطلاب في core/app.js، لكن لملف المعلم نفسه.
// لا حاجة لإرسال واتساب هنا (المعلم لن يهنّئ نفسه!) — فقط بانر ترحيبي داخل التطبيق
// + إشعار جهاز عادي إن كان الإذن ممنوحاً مسبقاً.
export async function checkTeacherBirthday() {
    const profile = AppState.currentTeacher;
    if (!profile || !profile.dob) return;
    const parts = profile.dob.split('-');
    if (parts.length !== 3) return;

    const today = new Date();
    const birthMonth = parseInt(parts[1], 10);
    const birthDay = parseInt(parts[2], 10);
    if (birthMonth !== today.getMonth() + 1 || birthDay !== today.getDate()) return;

    showTeacherBirthdayBanner(profile.name, profile);
    if ("Notification" in window && Notification.permission === "granted") {
        const msgKey = profile.gender === 'female' ? 'teacher_bday_notification_msg_female' : 'teacher_bday_notification_msg';
        new Notification(t('teacher_bday_notification_title'), {
            body: `${t(msgKey)}${profile.name || ''} 🎉`,
            icon: "icons/icon-192.png"
        });
    }
}

// يُستدعى مرة واحدة من setupSplashListeners() في core/app.js عند تحميل الشاشة الرئيسية
export function initTeacherProfileUI() {
    renderTeacherGreeting();
    renderFooterCredit();
    renderProfileBadge();
    renderTeacherAvatar();
    renderHomeworkSummary();
    checkTeacherBirthday();

    const avatarBtn = document.getElementById('teacher-avatar-btn');
    const badge = document.getElementById('teacher-profile-badge');
    const modal = document.getElementById('teacher-profile-modal');
    const closeBtn = document.getElementById('teacher-profile-close');
    const saveBtn = document.getElementById('teacher-profile-save');
    const photoInput = document.getElementById('teacher-profile-photo-input');
    const photoZone = document.getElementById('teacher-profile-photo-zone');
    const photoPreview = document.getElementById('teacher-profile-photo-preview');
    // 🌟 [جديد] عناصر منطقة رفع "الختم" الرسمي — نفس فكرة عناصر الصورة الشخصية أعلاه
    const stampInput = document.getElementById('teacher-profile-stamp-input');
    const stampZone = document.getElementById('teacher-profile-stamp-zone');
    const stampPreview = document.getElementById('teacher-profile-stamp-preview');
    const stampPlaceholder = document.getElementById('teacher-profile-stamp-placeholder');
    const nameInput = document.getElementById('teacher-profile-name-input');
    const dobInput = document.getElementById('teacher-profile-dob-input');
    // 🌟 [جديد] قوائم تاريخ الميلاد (اليوم/الشهر/السنة) + زر "تعديل بياناتي" الظاهر بجانب الترحيب
    const dobDay = document.getElementById('teacher-profile-dob-day');
    const dobMonth = document.getElementById('teacher-profile-dob-month');
    const dobYear = document.getElementById('teacher-profile-dob-year');
    const editBtn = document.getElementById('teacher-profile-edit-btn');
    // 🌟 [جديد] تحديد الجنس (ذكر/أنثى) — اختياري، "ذكر" افتراضياً (يبقى اللقب "شيخ"
    // كما كان قبل هذه الميزة)
    const genderInput = document.getElementById('teacher-profile-gender-input');
    const bdayBannerClose = document.getElementById('teacher-bday-banner-close');
    // 🌟 [جديد] عناصر قسم "نسخة احتياطية للبيانات" — راجع core/backupRestore.js
    const backupLastInfoEl = document.getElementById('teacher-profile-backup-last-info');
    const backupBtn = document.getElementById('teacher-profile-backup-btn');
    const restoreBtn = document.getElementById('teacher-profile-restore-btn');
    const restoreInput = document.getElementById('teacher-profile-restore-input');
    const undoRestoreBtn = document.getElementById('teacher-profile-undo-restore-btn');
    // ☁️ [جديد] عناصر قسم Google Drive — راجع core/driveBackup.js (تُحمَّل عند الحاجة فقط)
    const driveInfoEl = document.getElementById('teacher-drive-info');
    const driveBackupBtn = document.getElementById('teacher-drive-backup-btn');
    const driveRestoreBtn = document.getElementById('teacher-drive-restore-btn');
    const drivePickerEl = document.getElementById('teacher-drive-picker');
    const driveSelectEl = document.getElementById('teacher-drive-select');
    const drivePickGo = document.getElementById('teacher-drive-pick-go');
    const drivePickCancel = document.getElementById('teacher-drive-pick-cancel');
    const driveAutoRow = document.getElementById('teacher-drive-auto-row');
    const driveAutoInput = document.getElementById('teacher-drive-auto');
    const driveDisconnectBtn = document.getElementById('teacher-drive-disconnect-btn');
    // 🌟 [جديد 2026-10-13] مزامنة سجل الطلاب بين الأجهزة — راجع core/cloudSync.js (تُحمَّل عند الحاجة فقط)
    const syncInfoEl = document.getElementById('teacher-sync-info');
    const syncBtn = document.getElementById('teacher-sync-btn');

    if (!badge || !modal) return; // شاشة أخرى غير الرئيسية، لا شيء لعمله هنا

    let pendingPhoto = null;
    let pendingStamp = null;

    function fmtDateTime(iso) {
        return new Intl.DateTimeFormat(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US', {
            day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit'
        }).format(new Date(iso));
    }

    // 🌟 [جديد] تحديث نص "آخر نسخة احتياطية" — يُستدعى عند فتح النافذة وبعد كل تنزيل ناجح
    function renderBackupLastInfo() {
        if (!backupLastInfoEl) return;
        const lastAt = getLastBackupAt();
        if (!lastAt) {
            backupLastInfoEl.textContent = t('profile_backup_last_never');
            return;
        }
        try {
            const formatted = new Intl.DateTimeFormat(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US', {
                day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit'
            }).format(new Date(lastAt));
            backupLastInfoEl.textContent = `${t('profile_backup_last_prefix')}${formatted}`;
        } catch (e) {
            backupLastInfoEl.textContent = `${t('profile_backup_last_prefix')}${lastAt}`;
        }
    }

    // 🛟 زر «التراجع عن آخر استعادة» يظهر فقط لو توجد لقطة أمان (تُحفظ تلقائياً قبل كل استعادة)
    async function renderUndoRestore() {
        if (!undoRestoreBtn) return;
        const info = await getSafetySnapshotInfo();
        undoRestoreBtn.style.display = info ? '' : 'none';
        if (info) {
            let when = info.createdAt;
            try { when = fmtDateTime(info.createdAt); } catch (e) { /* نعرض الخام */ }
            undoRestoreBtn.dataset.when = when;
        }
    }

    async function renderSyncInfo() {
        if (!syncInfoEl) return;
        try {
            const { getSyncStatus } = await import('../core/cloudSync.js');
            const st = getSyncStatus();
            if (!st.lastAt) { syncInfoEl.textContent = t('sync_never'); return; }
            const formatted = new Intl.DateTimeFormat(AppState.currentLang === 'ar' ? 'ar-EG' : 'en-US', {
                day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit'
            }).format(new Date(st.lastAt));
            syncInfoEl.textContent = `${t('sync_last_prefix')}${formatted}`;
        } catch (e) { syncInfoEl.textContent = t('sync_never'); }
    }

    // 🌟 إظهار/إخفاء أيقونة الختم الافتراضية مقابل معاينة الختم المرفوع فعلياً
    function renderStampPreview() {
        if (!stampPreview || !stampPlaceholder) return;
        if (pendingStamp) {
            stampPreview.src = pendingStamp;
            stampPreview.hidden = false;
            stampPlaceholder.hidden = true;
        } else {
            stampPreview.hidden = true;
            stampPlaceholder.hidden = false;
        }
    }

    // 🌟 [إصلاح ترتيب تاريخ الميلاد] ثلاث قوائم بترتيب DOM ثابت (يوم ← شهر ← سنة) بدل <input type="date">
    // الذي كان يعكس الترتيب مع RTL. القيمة المحفوظة تبقى بنفس الصيغة القديمة YYYY-MM-DD تمامًا
    // (الحقل المخفي dobInput هو مصدر القيمة عند الحفظ)، فلا يتأثر أي كود آخر يقرأ profile.dob.
    function fillDobSelect(sel, placeholderKey, from, to, descending, pad) {
        if (!sel) return;
        sel.innerHTML = '';
        const ph = document.createElement('option');
        ph.value = '';
        ph.textContent = t(placeholderKey);
        sel.appendChild(ph);
        const add = (n) => {
            const o = document.createElement('option');
            o.value = String(n);
            o.textContent = pad ? String(n).padStart(2, '0') : String(n);
            sel.appendChild(o);
        };
        if (descending) { for (let n = to; n >= from; n--) add(n); }
        else { for (let n = from; n <= to; n++) add(n); }
        sel.setAttribute('aria-label', t(placeholderKey));
    }
    function buildDobSelects() {
        fillDobSelect(dobDay, 'profile_dob_day', 1, 31, false, false);
        fillDobSelect(dobMonth, 'profile_dob_month', 1, 12, false, false);
        fillDobSelect(dobYear, 'profile_dob_year', 1900, new Date().getFullYear(), true, false);
    }
    // يملأ القوائم من القيمة المحفوظة YYYY-MM-DD (لا يغيّر القيمة نفسها، فقط عرضها)
    function setDobSelects(dob) {
        buildDobSelects();
        const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(dob || '');
        if (!m) return;
        if (dobYear) dobYear.value = String(parseInt(m[1], 10));
        if (dobMonth) dobMonth.value = String(parseInt(m[2], 10));
        if (dobDay) dobDay.value = String(parseInt(m[3], 10));
    }
    // يجمع القوائم إلى YYYY-MM-DD؛ يُرجع null إن لم تكتمل الأجزاء الثلاثة أو كان التاريخ غير حقيقي (مثل 31 فبراير)
    function readDobFromSelects() {
        const y = parseInt(dobYear?.value, 10), mo = parseInt(dobMonth?.value, 10), d = parseInt(dobDay?.value, 10);
        if (!y || !mo || !d) return null;
        const check = new Date(y, mo - 1, d);
        if (check.getFullYear() !== y || check.getMonth() !== mo - 1 || check.getDate() !== d) return null;
        return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }

    // 🌟 [جديد 2026-10-06] قسم الحساب: «تغيير الإيميل» متاح دائماً (مسجَّل أو لا). التغيير = خروج من الحساب الحالي ثم فتح
    // نافذة دخول جوجل ليختار المعلم حساباً آخر. كل حساب جوجل له واجباته المنفصلة على الخادم، فنوضّح ذلك قبل التنفيذ.
    const acctEmailEl = document.getElementById('teacher-account-email');
    const acctChangeBtn = document.getElementById('teacher-account-change-btn');
    const acctSignoutBtn = document.getElementById('teacher-account-signout-btn');
    function renderAccount() {
        const authed = isTeacherAuthed();
        if (acctEmailEl) {
            const mail = getTeacherEmail();
            acctEmailEl.textContent = authed ? (mail ? `${t('acct_current_prefix')}${mail}` : t('acct_signed_in_unknown')) : t('acct_not_signed_in');
        }
        if (acctChangeBtn) acctChangeBtn.textContent = authed ? t('acct_change_btn') : t('acct_signin_btn');
        if (acctSignoutBtn) acctSignoutBtn.style.display = authed ? '' : 'none';
    }
    if (acctChangeBtn) {
        acctChangeBtn.addEventListener('click', async () => {
            const { changeTeacherAccount } = await import('./teacherAccount.js');
            renderAccount();
            await changeTeacherAccount();
            renderAccount();
        });
    }
    if (acctSignoutBtn) {
        acctSignoutBtn.addEventListener('click', () => {
            if (!confirm(t('acct_signout_confirm'))) return;
            signOutTeacher();
            renderAccount();
        });
    }

    function openModal() {
        renderAccount();
        const profile = AppState.currentTeacher || {};
        if (nameInput) nameInput.value = profile.name || '';
        if (dobInput) dobInput.value = profile.dob || '';
        setDobSelects(profile.dob || '');
        if (genderInput) genderInput.value = profile.gender === 'female' ? 'female' : 'male';
        pendingPhoto = profile.photo || null;
        if (photoPreview) photoPreview.src = profile.photo || 'icons/icon-192.png';
        pendingStamp = profile.stamp || null;
        renderStampPreview();
        renderBackupLastInfo();
        renderUndoRestore();
        renderDrive();
        renderSyncInfo();
        modal.style.display = 'flex';
    }
    function closeModal() { modal.style.display = 'none'; }

    badge.addEventListener('click', openModal);
    // 🌟 [جديد] دائرة الصورة بجانب الترحيب تفتح نفس نافذة التعديل — وتبقى موجودة حتى
    // بعد اختفاء شارة "أكمل بياناتك" عند اكتمال البيانات
    if (avatarBtn) avatarBtn.addEventListener('click', openModal);
    // 🌟 [جديد] زر "تعديل بياناتي" الواضح — يفتح نفس النافذة بالبيانات المسجّلة، والحفظ يحدّث سجل 'main' نفسه
    if (editBtn) editBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    if (bdayBannerClose) {
        bdayBannerClose.addEventListener('click', () => {
            const banner = document.getElementById('teacher-bday-banner');
            if (banner) banner.style.display = 'none';
        });
    }

    if (photoZone && photoInput) {
        photoZone.addEventListener('click', () => photoInput.click());
    }
    if (photoInput) {
        photoInput.addEventListener('change', async () => {
            const file = photoInput.files && photoInput.files[0];
            photoInput.value = '';
            if (!file) return;
            if (!file.type || !file.type.startsWith('image/')) return;
            try {
                pendingPhoto = await resizeImageToDataUrl(file, 300, 0.85);
                if (photoPreview) photoPreview.src = pendingPhoto;
            } catch (e) {
                console.error("تعذر معالجة صورة المعلم:", e);
            }
        });
    }

    // 🌟 [جديد] رفع صورة الختم — نفس منطق رفع الصورة الشخصية أعلاه تماماً، بحجم أكبر
    // قليلاً (420px بدل 300px) حتى يبقى الختم واضحاً عند طباعته صغيراً في التقرير
    if (stampZone && stampInput) {
        stampZone.addEventListener('click', () => stampInput.click());
    }
    if (stampInput) {
        stampInput.addEventListener('change', async () => {
            const file = stampInput.files && stampInput.files[0];
            stampInput.value = '';
            if (!file) return;
            if (!file.type || !file.type.startsWith('image/')) return;
            try {
                // 🌟 [إصلاح] نحفظ الختم بصيغة PNG لا JPEG حتى تبقى خلفيته الشفافة شفافة
                // فعليًا (راجع تعليق resizeImageToDataUrl أعلى الملف لتفاصيل السبب)
                pendingStamp = await resizeImageToDataUrl(file, 420, 0.9, 'image/png');
                renderStampPreview();
            } catch (e) {
                console.error("تعذر معالجة صورة الختم:", e);
            }
        });
    }

    // 🌟 [جديد] زر "نسخة احتياطية الآن" — يبني الملف ويبدأ تنزيله فوراً (بلا أي رفع
    // سحابي)، ثم يحدّث نص "آخر نسخة احتياطية" مباشرة. تعطيل الزر أثناء العملية يمنع نقرة
    // مزدوجة قد تبدأ تصديرين متزامنين على نفس البيانات الكبيرة نسبياً (خصوصاً صوتيات
    // ركن الأطفال)
    if (backupBtn) {
        backupBtn.addEventListener('click', async () => {
            backupBtn.disabled = true;
            try {
                await exportFullBackup();
                renderBackupLastInfo();
            } catch (e) {
                console.error('تعذر إنشاء النسخة الاحتياطية:', e);
                alert(t('backup_export_error'));
            } finally {
                backupBtn.disabled = false;
            }
        });
    }

    // 🌟 [جديد 2026-10-13] زر «زامن الآن»: يفتح بوابة جوجل إن لزم، ثم يدمج سجل الطلاب مع الخادم (اتحاد فقط، بلا حذف)
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            syncBtn.disabled = true;
            if (syncInfoEl) syncInfoEl.textContent = t('sync_syncing');
            try {
                const { syncNow } = await import('../core/cloudSync.js');
                const r = await syncNow({ signIn: true });
                let msg;
                if (r.skipped === 'cancelled') msg = t('sync_cancelled');
                else if (r.conflicts) msg = t('sync_conflict');
                else if (r.errors && r.errors.length && !r.code) msg = t('sync_partial').replace('{errors}', r.errors.slice(0, 3).join(' | '));
                else if (!r.ok) msg = t('sync_error');
                else msg = t('sync_done') + '\n' + t('sync_done_detail')
                    .replace('{students}', r.newStudents).replace('{history}', r.historyAdded)
                    .replace('{events}', r.eventsAdded).replace('{pushed}', r.partsPushed);
                alert(msg);
                if (r.newStudents || r.historyAdded || r.eventsAdded) setTimeout(() => location.reload(), 300);   // لتظهر الشاشات بالبيانات الجديدة
            } catch (e) {
                console.error('تعذرت المزامنة:', e);
                alert(t('sync_error'));
            } finally {
                syncBtn.disabled = false;
                renderSyncInfo();
            }
        });
    }

    // 🌟 [جديد] زر "استرجاع نسخة احتياطية" — مجرد فتح لمنتقي الملف المخفي (نفس نمط
    // photoZone/stampZone أعلاه بالضبط)؛ منطق الاسترجاع الفعلي في مستمع input[change] التالي
    if (restoreBtn && restoreInput) {
        restoreBtn.addEventListener('click', () => restoreInput.click());
    }

    // معاينة + تأكيد + استعادة آمنة لملف نسخة (يُستخدم لملف الجهاز ولنسخة Drive معاً)
    async function confirmAndRestore(file) {
        // 🛟 نقرأ الملف أولاً (بلا أي تعديل) لنعرض للمعلم تاريخ النسخة وعدد الطلاب فيها مقابل الحاليين،
        // ثم نطلب التأكيد. الاستعادة نفسها تحفظ لقطة أمان تلقائياً قبل أي تغيير (يمكن التراجع عنها).
        let confirmMsg = t('profile_backup_restore_confirm');
        try {
            const info = await inspectBackupFile(file);
            let when = info.exportedAt || '—';
            try { if (info.exportedAt) when = fmtDateTime(info.exportedAt); } catch (e2) { /* نعرض الخام */ }
            confirmMsg = t('profile_backup_restore_confirm_detail')
                .replace('{date}', when)
                .replace('{backupStudents}', info.studentsInBackup)
                .replace('{nowStudents}', info.studentsNow);
        } catch (e) {
            const k = (e && e.message === 'STUDENTS_ONLY_BACKUP') ? 'profile_backup_restore_students_only'
                : (e && (e.message === 'INVALID_JSON' || e.message === 'INVALID_FORMAT')) ? 'profile_backup_restore_invalid_file'
                : 'profile_backup_restore_error';
            alert(t(k));
            return false;
        }
        if (!confirm(confirmMsg)) return false;

        try {
            await restoreFromBackupFile(file);
            alert(t('profile_backup_restore_success'));
            // 🌟 إعادة تحميل كاملة للصفحة بدل محاولة تحديث AppState/الشاشة الحالية
            // يدوياً — أبسط وأضمن طريقة لضمان أن كل مدير قاعدة بيانات وكل شاشة مفتوحة
            // تعكس البيانات المُسترجَعة فعلياً بلا أي حالة قديمة عالقة في الذاكرة
            location.reload();
            return true;
        } catch (e) {
            console.error('تعذر استرجاع النسخة الاحتياطية:', e);
            const msgKey = (e && e.message === 'STUDENTS_ONLY_BACKUP') ? 'profile_backup_restore_students_only'
                : (e && (e.message === 'INVALID_JSON' || e.message === 'INVALID_FORMAT')) ? 'profile_backup_restore_invalid_file'
                : (e && e.message === 'SAFETY_SNAPSHOT_FAILED') ? 'profile_backup_restore_no_safety'
                : (e && e.message === 'RESTORE_FAILED_ROLLED_BACK') ? 'profile_backup_restore_rolled_back'
                : 'profile_backup_restore_error';
            alert(t(msgKey));
            return false;
        }
    }

    if (restoreInput) {
        restoreInput.addEventListener('change', async () => {
            const file = restoreInput.files && restoreInput.files[0];
            restoreInput.value = '';
            if (!file) return;
            await confirmAndRestore(file);
        });
    }

    // ☁️ ===== Google Drive =====
    let driveMod = null;
    const loadDrive = async () => driveMod || (driveMod = await import('../core/driveBackup.js'));
    const driveErrKey = (r) => ({
        ACCESS_DENIED: 'drive_err_denied', SCOPE_NOT_GRANTED: 'drive_err_scope', QUOTA: 'drive_err_quota',
        NETWORK: 'drive_err_network', GIS_UNAVAILABLE: 'drive_err_network', AUTH_REQUIRED: 'drive_err_auth',
        VERIFY_FAILED: 'drive_err_verify'
    })[r && r.code] || 'drive_err_generic';

    async function renderDrive() {
        if (!driveInfoEl) return;
        let m;
        try { m = await loadDrive(); } catch (e) { return; }
        const enabled = m.isDriveEnabled();
        driveBackupBtn.textContent = t(enabled ? 'drive_backup_now_btn' : 'drive_connect_btn');
        driveRestoreBtn.style.display = '';   // دائماً ظاهر: جهاز جديد فارغ يحتاجه قبل أي نسخة
        driveAutoRow.style.display = enabled ? 'flex' : 'none';
        driveDisconnectBtn.style.display = enabled ? '' : 'none';
        driveAutoInput.checked = m.isDriveAuto();
        const last = m.getDriveLastOk();
        let txt = t('drive_info_off');
        if (enabled) {
            let when = last || '';
            try { if (last) when = fmtDateTime(last); } catch (e) { /* نعرض الخام */ }
            txt = last ? t('drive_info_last').replace('{date}', when) : t('drive_info_none_yet');
            if (m.driveNeedsReconnect()) txt += '\n' + t('drive_info_reconnect');
        }
        driveInfoEl.textContent = txt;
        driveInfoEl.style.whiteSpace = 'pre-line';
    }

    if (driveBackupBtn) {
        driveBackupBtn.addEventListener('click', async () => {
            driveBackupBtn.disabled = true;
            driveInfoEl.textContent = t('drive_working');
            try {
                const m = await loadDrive();
                const r = await m.runDriveBackup({ interactive: true });
                if (r.ok && r.skipped === 'no_students') alert(t('drive_skip_no_students'));
                else if (r.ok) alert(t('drive_done').replace('{students}', r.students).replace('{kb}', Math.max(1, Math.round(r.size / 1024))));
                else alert(t(driveErrKey(r)));
            } catch (e) {
                console.error('تعذرت النسخة على Drive:', e);
                alert(t('drive_err_generic'));
            } finally {
                driveBackupBtn.disabled = false;
                renderDrive();
            }
        });
    }

    if (driveRestoreBtn) {
        driveRestoreBtn.addEventListener('click', async () => {
            driveRestoreBtn.disabled = true;
            try {
                const m = await loadDrive();
                const list = await m.listBackupsForRestore();
                if (!list.length) { alert(t('drive_restore_none')); return; }
                driveSelectEl.innerHTML = '';
                list.forEach(f => {
                    const o = document.createElement('option');
                    o.value = f.id; o.dataset.name = f.name;
                    let when = f.createdTime;
                    try { when = fmtDateTime(f.createdTime); } catch (e) { /* نعرض الخام */ }
                    const n = f.appProperties && f.appProperties.students;
                    o.textContent = `${when}${n ? ' — ' + t('drive_students_n').replace('{n}', n) : ''}`;
                    driveSelectEl.appendChild(o);
                });
                drivePickerEl.style.display = '';
            } catch (e) {
                console.error('تعذر جلب نسخ Drive:', e);
                alert(t(driveErrKey(e)));
            } finally { driveRestoreBtn.disabled = false; }
        });
    }
    if (drivePickCancel) drivePickCancel.addEventListener('click', () => { drivePickerEl.style.display = 'none'; });
    if (drivePickGo) {
        drivePickGo.addEventListener('click', async () => {
            const opt = driveSelectEl.selectedOptions && driveSelectEl.selectedOptions[0];
            if (!opt) return;
            drivePickGo.disabled = true;
            try {
                const m = await loadDrive();
                const file = await m.downloadBackupAsFile(opt.value, opt.dataset.name);
                await confirmAndRestore(file);
            } catch (e) {
                console.error('تعذر تنزيل نسخة Drive:', e);
                alert(t(driveErrKey(e)));
            } finally { drivePickGo.disabled = false; }
        });
    }
    if (driveAutoInput) {
        driveAutoInput.addEventListener('change', async () => { (await loadDrive()).setDriveAuto(driveAutoInput.checked); });
    }
    if (driveDisconnectBtn) {
        driveDisconnectBtn.addEventListener('click', async () => {
            if (!confirm(t('drive_disconnect_confirm'))) return;
            (await loadDrive()).disconnectDrive();
            drivePickerEl.style.display = 'none';
            renderDrive();
        });
    }

    // 🛟 «التراجع عن آخر استعادة»: يعيد الوضع الذي كان قبلها (اللقطة التلقائية)
    if (undoRestoreBtn) {
        undoRestoreBtn.addEventListener('click', async () => {
            if (!confirm(t('profile_backup_undo_confirm').replace('{date}', undoRestoreBtn.dataset.when || ''))) return;
            undoRestoreBtn.disabled = true;
            try {
                await restoreFromSafetySnapshot();
                alert(t('profile_backup_undo_success'));
                location.reload();
            } catch (e) {
                console.error('تعذر التراجع عن الاستعادة:', e);
                alert(t('profile_backup_restore_error'));
                undoRestoreBtn.disabled = false;
            }
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const data = {
                name: (nameInput?.value || '').trim(),
                // 🌟 يُحفظ بنفس صيغة YYYY-MM-DD القديمة؛ لو لم يكتمل اليوم/الشهر/السنة (أو تاريخ غير حقيقي) يُحفظ null كما كان عند ترك الحقل فارغًا
                dob: readDobFromSelects(),
                gender: genderInput?.value === 'female' ? 'female' : 'male',
                photo: pendingPhoto || null,
                stamp: pendingStamp || null
            };
            const saved = await AppState.teacherManager.saveProfile(data);
            AppState.currentTeacher = saved;
            AppState.teacherName = saved.name || '';
            renderTeacherGreeting();
            renderFooterCredit();
            renderProfileBadge();
            renderTeacherAvatar();
            closeModal();
        });
    }
}
