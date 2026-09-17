// components/teacherProfile.js
// 🌟 كل منطق واجهة "ملف المعلم" في الشاشة الرئيسية: الترحيب الديناميكي (وقت + اسم)،
// شارة "أكمل بياناتك" التدريجية غير الإجبارية، نافذة تعديل البيانات، ملخص الواجبات
// السريع، وتنبيه عيد ميلاد المعلم نفسه (بانر داخل التطبيق + إشعار جهاز).
// لا يوجد أي إجبار هنا على إدخال أي بيانات — كل شيء اختياري ويعمل التطبيق بدونه بالكامل.

import { AppState } from '../core/app.js';
import { t } from '../core/i18n.js';

// تصغير الصورة قبل حفظها (نفس فكرة resizeImageToDataUrl الموجودة في reports/report.js
// لكن نسخة محلية صغيرة هنا لتفادي تضخيم حجم قاعدة البيانات المحلية بصور كبيرة جداً)
function resizeImageToDataUrl(file, maxSize = 300, quality = 0.85) {
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
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function greetingPrefix() {
    const hour = new Date().getHours();
    return hour < 12 ? t('greeting_morning') : t('greeting_evening');
}

export function renderTeacherGreeting() {
    const el = document.getElementById('home-greeting');
    if (!el) return;
    const profile = AppState.currentTeacher;
    const name = profile && profile.name ? profile.name : '';
    let text = greetingPrefix();
    if (name) {
        text += AppState.currentLang === 'ar' ? ` ${t('greeting_title')} ${name}` : `, ${name}`;
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

function showTeacherBirthdayBanner(name) {
    const banner = document.getElementById('teacher-bday-banner');
    if (!banner) return;
    const textEl = banner.querySelector('.bday-banner-text');
    if (textEl) textEl.textContent = `${t('teacher_bday_notification_msg')}${name || ''} 🎉`;
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

    showTeacherBirthdayBanner(profile.name);
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(t('teacher_bday_notification_title'), {
            body: `${t('teacher_bday_notification_msg')}${profile.name || ''} 🎉`,
            icon: "icons/icon-192.png"
        });
    }
}

// يُستدعى مرة واحدة من setupSplashListeners() في core/app.js عند تحميل الشاشة الرئيسية
export function initTeacherProfileUI() {
    renderTeacherGreeting();
    renderFooterCredit();
    renderProfileBadge();
    renderHomeworkSummary();
    checkTeacherBirthday();

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
    const bdayBannerClose = document.getElementById('teacher-bday-banner-close');

    if (!badge || !modal) return; // شاشة أخرى غير الرئيسية، لا شيء لعمله هنا

    let pendingPhoto = null;
    let pendingStamp = null;

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
        pendingPhoto = profile.photo || null;
        if (photoPreview) photoPreview.src = profile.photo || 'icons/icon-192.png';
        pendingStamp = profile.stamp || null;
        renderStampPreview();
        modal.style.display = 'flex';
    }
    function closeModal() { modal.style.display = 'none'; }

    badge.addEventListener('click', openModal);
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
                pendingStamp = await resizeImageToDataUrl(file, 420, 0.9);
                renderStampPreview();
            } catch (e) {
                console.error("تعذر معالجة صورة الختم:", e);
            }
        });
    }

    if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
            const data = {
                name: (nameInput?.value || '').trim(),
                dob: dobInput?.value || null,
                photo: pendingPhoto || null,
                stamp: pendingStamp || null
            };
            const saved = await AppState.teacherManager.saveProfile(data);
            AppState.currentTeacher = saved;
            AppState.teacherName = saved.name || '';
            renderTeacherGreeting();
            renderFooterCredit();
            renderProfileBadge();
            closeModal();
        });
    }
}
