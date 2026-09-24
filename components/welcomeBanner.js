// components/welcomeBanner.js
//
// 🌟 [جديد بالكامل] "بطاقة الترحيب بالطالب" — تظهر في وسط الشاشة لثوانٍ معدودة ثم تختفي
// وحدها، فور اختيار اسم الطالب وقبل الدخول إلى لوحة التقييم مباشرة، وتعرض صورته إن وُجدت.
//
// لماذا ملف مستقل وليس كوداً داخل student/student.js؟ بنفس فلسفة components/sectionHint.js
// المعتمدة سابقاً في المشروع: نقطة الربط تُستدعى من كل شاشة على حدة، لكن منطق العرض نفسه
// يبقى في مكان واحد حتى يمكن إعادة استخدام نفس البطاقة لاحقاً في مواضع أخرى (ركن الأطفال،
// شاشة الواجب المنزلي، أو بطاقتَي المتسابقَين في الاختبارات الثنائية) بلا تكرار أي كود.
//
// الفرق الجوهري بينها وبين bطاقة sectionHint: تلك بطاقة *معلومات* تنتظر ضغط المعلم على زر
// إغلاق وتظهر مرة واحدة فقط لكل قسم (علم في localStorage)، أما هذه فبطاقة *تحية* تختفي
// تلقائياً بعد مدة قصيرة، وتظهر في كل مرة يُختار فيها الطالب (لا تُخزَّن أي أعلام إطلاقاً).
//
// 🌟 غير حاجبة للعمل: البطاقة تُعرض فوق الشاشة، بينما تُحمَّل لوحة التقييم خلفها في نفس
// اللحظة، فلا تضيف أي تأخير حقيقي على المعلم — وتُغلق فوراً بلمسة/نقرة واحدة أو بزر Esc
// لمن يريد تخطّيها.
//
// مصدر الصورة: حقل student.avatar الموجود أصلاً في سجل الطالب (راجع student/student.js
// وstudent/student-profile.html) — وهو إما صورة حقيقية بصيغة DataURL (ناتج FileReader)
// أو إيموجي قصير مختار من شاشة الإضافة. ولأن أغلب الطلاب قد لا تكون لهم صورة مرفوعة،
// البديل المعتمد هو أول حرف من اسم الطالب داخل دائرة بألوان الهوية (--dh-emerald/--dh-gold)
// بدل أي مربع صورة مكسور — وذلك التزاماً بقاعدة "لا تُطلب أي بيانات اختيارية إجبارياً".

import { t } from '../core/i18n.js';

// المدة الافتراضية بالمللي ثانية قبل بدء التلاشي (يمكن تجاوزها عبر opts.duration)
const DEFAULT_DURATION = 2500;
// مدة حركة التلاشي نفسها — لازم تطابق قيمة transition في css/welcomeBanner.css
const FADE_MS = 400;

// مؤقّتات النسخة المعروضة حالياً، حتى لا تتصادم بطاقتان لو اختار المعلم طالباً آخر بسرعة
let hideTimer = null;
let removeTimer = null;

/**
 * يبني محتوى دائرة الصورة: صورة حقيقية، أو إيموجي، أو أول حرف من الاسم كخط رجوع أخير.
 * نفس منطق التمييز المستخدم أصلاً في عرض صورة الطالب بملفه الشخصي (avatar.length < 10
 * تعني إيموجي وليس DataURL).
 */
function renderAvatar(avatarEl, student) {
    const name = (student && student.name ? String(student.name) : '').trim();
    const avatar = student && student.avatar ? String(student.avatar) : '';

    avatarEl.innerHTML = '';
    avatarEl.classList.remove('dh-welcome-avatar-photo');

    if (avatar && avatar.length >= 10) {
        // صورة حقيقية مرفوعة (DataURL)
        const img = document.createElement('img');
        img.src = avatar;
        img.alt = name;
        // 🌟 خط رجوع إضافي: لو تلفت الصورة المخزّنة لأي سبب، نستبدلها بأول حرف بدل أن
        // يظهر للمعلم مربع صورة مكسور
        img.onerror = () => {
            avatarEl.classList.remove('dh-welcome-avatar-photo');
            avatarEl.innerHTML = '';
            avatarEl.textContent = name.charAt(0) || '★';
        };
        avatarEl.classList.add('dh-welcome-avatar-photo');
        avatarEl.appendChild(img);
        return;
    }

    if (avatar) {
        // إيموجي قصير مختار من شاشة إضافة الطالب
        avatarEl.textContent = avatar;
        return;
    }

    // البديل المعتمد: أول حرف من الاسم (يعمل بالعربية والإنجليزية على حد سواء)
    avatarEl.textContent = name.charAt(0) || '★';
}

/**
 * تعرض بطاقة الترحيب بالطالب في وسط الشاشة، وتخفيها تلقائياً بعد مدة قصيرة.
 *
 * @param {Object} student - سجل الطالب كما هو مخزَّن في IndexedDB (يُستخدم منه name وavatar)
 * @param {Object} [opts]
 * @param {boolean} [opts.kids=false] - نمط ركن الأطفال (ألوان أدفأ وحجم أكبر قليلاً)
 * @param {number} [opts.duration=2500] - مدة البقاء بالمللي ثانية قبل بدء التلاشي
 */
export function showStudentWelcome(student, opts = {}) {
    if (!student || !student.name) return;

    const overlay = document.getElementById('student-welcome-overlay');
    if (!overlay) return; // الشاشة لسه ما فيهاش العنصر الثابت (احتياط دفاعي فقط)

    const avatarEl = overlay.querySelector('.dh-welcome-avatar');
    const helloEl = overlay.querySelector('.dh-welcome-hello');
    const nameEl = overlay.querySelector('.dh-welcome-name');
    const subEl = overlay.querySelector('.dh-welcome-sub');
    if (!avatarEl || !helloEl || !nameEl || !subEl) return;

    // إلغاء أي مؤقّتات من بطاقة سابقة لم تختفِ بعد
    clearTimeout(hideTimer);
    clearTimeout(removeTimer);

    renderAvatar(avatarEl, student);
    helloEl.textContent = t('welcome_hello');
    nameEl.textContent = student.name;
    subEl.textContent = t('welcome_back_line');

    overlay.classList.toggle('dh-welcome-kids', !!opts.kids);

    const duration = typeof opts.duration === 'number' ? opts.duration : DEFAULT_DURATION;

    // دالة الإخفاء الموحّدة — تُستدعى من المؤقّت أو من نقرة المعلم أو من زر Esc
    const hide = () => {
        clearTimeout(hideTimer);
        clearTimeout(removeTimer);
        overlay.classList.remove('dh-welcome-visible');
        document.removeEventListener('keydown', onKeyDown);
        overlay.onclick = null;
        // ننتظر انتهاء حركة التلاشي قبل إخفاء العنصر نهائياً من تدفق الصفحة
        removeTimer = setTimeout(() => { overlay.style.display = 'none'; }, FADE_MS);
    };

    const onKeyDown = (e) => { if (e.key === 'Escape') hide(); };

    overlay.onclick = hide;
    document.addEventListener('keydown', onKeyDown);

    overlay.style.display = 'flex';
    // إجبار المتصفح على حساب التنسيق قبل إضافة كلاس الظهور، حتى تعمل حركة الدخول فعلياً
    void overlay.offsetWidth;
    overlay.classList.add('dh-welcome-visible');

    hideTimer = setTimeout(hide, duration);
}
