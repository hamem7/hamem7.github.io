// components/teacherProfile.js
// 🌟 كل منطق واجهة "ملف المعلم" في الشاشة الرئيسية: الترحيب الديناميكي (وقت + اسم)،
// شارة "أكمل بياناتك" التدريجية غير الإجبارية، نافذة تعديل البيانات، ملخص الواجبات
// السريع، وتنبيه عيد ميلاد المعلم نفسه (بانر داخل التطبيق + إشعار جهاز).
// لا يوجد أي إجبار هنا على إدخال أي بيانات — كل شيء اختياري ويعمل التطبيق بدونه بالكامل.

import { AppState } from '../core/app.js';
import { t } from '../core/i18n.js';
// 🌟 [جديد] نظام "النسخة الاحتياطية المحلية" — راجع core/backupRestore.js للآلية الكاملة
// وشرح الافتراضات. الأزرار الفعلية أُضيفت داخل نافذة ملف المعلم (splash.html) لعدم وجود
// شاشة "إعدادات" عامة مستقلة بعد في المشروع
import { exportFullBackup, restoreFromBackupFile, getLastBackupAt } from '../core/backupRestore.js';

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

// النص الافتراضي المترجم (المُدرج مسبقاً في splash.html) يبقى كما هو ما لم يُكمل
// المعلم اسمه في ملفه الشخصي — عندها فقط نستبدله باسمه الحقيقي.
export function renderFooterCredit() {
    const nameEl = document.getElementById('footer-teacher-name');
    if (!nameEl) return;
    const profile = AppState.currentTeacher;
    if (profile && profile.name) {
        nameEl.textContent = profile.name;
        nameEl.removeAttribute('data-i18n');
    }
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
    // 🌟 [جديد] تحديد الجنس (ذكر/أنثى) — اختياري، "ذكر" افتراضياً (يبقى اللقب "شيخ"
    // كما كان قبل هذه الميزة)
    const genderInput = document.getElementById('teacher-profile-gender-input');
    const bdayBannerClose = document.getElementById('teacher-bday-banner-close');
    // 🌟 [جديد] عناصر قسم "نسخة احتياطية للبيانات" — راجع core/backupRestore.js
    const backupLastInfoEl = document.getElementById('teacher-profile-backup-last-info');
    const backupBtn = document.getElementById('teacher-profile-backup-btn');
    const restoreBtn = document.getElementById('teacher-profile-restore-btn');
    const restoreInput = document.getElementById('teacher-profile-restore-input');

    if (!badge || !modal) return; // شاشة أخرى غير الرئيسية، لا شيء لعمله هنا

    let pendingPhoto = null;
    let pendingStamp = null;

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

    function openModal() {
        const profile = AppState.currentTeacher || {};
        if (nameInput) nameInput.value = profile.name || '';
        if (dobInput) dobInput.value = profile.dob || '';
        if (genderInput) genderInput.value = profile.gender === 'female' ? 'female' : 'male';
        pendingPhoto = profile.photo || null;
        if (photoPreview) photoPreview.src = profile.photo || 'icons/icon-192.png';
        pendingStamp = profile.stamp || null;
        renderStampPreview();
        renderBackupLastInfo();
        modal.style.display = 'flex';
    }
    function closeModal() { modal.style.display = 'none'; }

    badge.addEventListener('click', openModal);
    // 🌟 [جديد] دائرة الصورة بجانب الترحيب تفتح نفس نافذة التعديل — وتبقى موجودة حتى
    // بعد اختفاء شارة "أكمل بياناتك" عند اكتمال البيانات
    if (avatarBtn) avatarBtn.addEventListener('click', openModal);
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

    // 🌟 [جديد] زر "استرجاع نسخة احتياطية" — مجرد فتح لمنتقي الملف المخفي (نفس نمط
    // photoZone/stampZone أعلاه بالضبط)؛ منطق الاسترجاع الفعلي في مستمع input[change] التالي
    if (restoreBtn && restoreInput) {
        restoreBtn.addEventListener('click', () => restoreInput.click());
    }

    if (restoreInput) {
        restoreInput.addEventListener('change', async () => {
            const file = restoreInput.files && restoreInput.files[0];
            restoreInput.value = '';
            if (!file) return;

            // ⚠️ إجراء غير قابل للتراجع (يستبدل كل بيانات المنصة الحالية على هذا الجهاز) —
            // تأكيد صريح إجباري قبل المتابعة، بنفس فلسفة أي إجراء حذف خطير آخر بالمنصة
            if (!confirm(t('profile_backup_restore_confirm'))) return;

            try {
                await restoreFromBackupFile(file);
                alert(t('profile_backup_restore_success'));
                // 🌟 إعادة تحميل كاملة للصفحة بدل محاولة تحديث AppState/الشاشة الحالية
                // يدوياً — أبسط وأضمن طريقة لضمان أن كل مدير قاعدة بيانات وكل شاشة مفتوحة
                // تعكس البيانات المُسترجَعة فعلياً بلا أي حالة قديمة عالقة في الذاكرة
                location.reload();
            } catch (e) {
                console.error('تعذر استرجاع النسخة الاحتياطية:', e);
                const msgKey = (e && e.message === 'INVALID_JSON') || (e && e.message === 'INVALID_FORMAT')
                    ? 'profile_backup_restore_invalid_file'
                    : 'profile_backup_restore_error';
                alert(t(msgKey));
            }
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const data = {
                name: (nameInput?.value || '').trim(),
                dob: dobInput?.value || null,
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
