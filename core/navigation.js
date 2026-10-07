// core/navigation.js

// 🌟 استيراد دالة الترجمة من المنطق المركزي 🌟
import { applyLanguage } from './app.js';
// 🌟 [جديد] تتبع تحليلات خصوصي (GoatCounter) — راجع core/analytics.js للشرح الكامل. استدعاء
// trackPageview هنا يدوي لأن المنصة SPA بالكامل (fetch + إحقان innerHTML بلا تحميل صفحة فعلي)
import { trackPageview } from './analytics.js';

// 🌟 [2026-10-07 — سرعة فتح الواجبات/الشهادات/الاختبارات] تسخين مسبق لقوالب الشاشات الثقيلة في وقت خمول الشاشة الرئيسية.
// القالب المسخَّن يُستهلك مرة واحدة فقط (أول فتح) ثم يعود الجلب الطازج بـ no-store كالمعتاد فلا نعرض نسخة قديمة لاحقاً.
const prefetchedTemplates = new Map();
export function prefetchTemplate(url) {
    if (prefetchedTemplates.has(url)) return;
    prefetchedTemplates.set(url, fetch(url, { cache: 'no-store' }).then(r => r.ok ? r.text() : null).catch(() => null));
}
async function fetchTemplate(url) {
    const warm = prefetchedTemplates.get(url);
    if (warm) {
        prefetchedTemplates.delete(url);
        const html = await warm;
        if (html !== null) return html;
    }
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return response.text();
}

// دالة لجلب كود الـ HTML من المجلدات الأخرى وحقنه في الـ Root
export async function loadScreen(route) {
    const root = document.getElementById('app-root');
    // إضافة رسالة تحميل تدعم اللغتين مؤقتاً
    // 🌟 [2026-10-03 — مراجعة تجربة الهاتف] رسالة تحميل بحجم عادي (كانت 2rem بحشوة 50px فتقفز الصفحة لحظة التنقل)
    // 🌟 [2026-10-03 — سرعة الفتح] أثناء الإقلاع نُبقي شاشة الإقلاع ذات الهوية الجديدة (index.html) بدل استبدالها برسالة التحميل
    const booting = document.documentElement.classList.contains('dh-booting');
    // 🌟 [2026-10-07 — إصلاح وميض الشكل القديم] لا نمسح الشاشة الحالية ولا نغيّر ثيمها أثناء جلب الشاشة الجديدة: كان
    // الانتظار (تحميل الوحدة + الملف + بوابة الدخول) يعرض لثوانٍ رسالة "جاري التحميل" على ثيم الكبار الأزرق القديم.
    // الآن تبقى الشاشة السابقة كما هي حتى تجهز الجديدة فتُستبدل دفعة واحدة؛ والرسالة تظهر فقط إن كان الجذر فارغاً.
    if (!booting && !root.firstElementChild) root.innerHTML = '<div class="dh-screen-loading" style="text-align:center; font-size:1rem; padding:32px 16px; opacity:.8;">⏳ جاري التحميل... Loading</div>';
    document.body.classList.add('dh-nav-pending');

    try {
        // 🌟 cache: 'no-store' يمنع المتصفح من عرض نسخة قديمة مخزّنة من ملفات
        // الشاشات (زي report.html) بعد تعديلها على السيرفر 🌟
        let html = await fetchTemplate(route.templateUrl);
        
        // الثيم المؤجَّل (راجع switchTheme) يُطبَّق الآن لحظة استبدال المحتوى لا قبلها
        flushPendingTheme();
        // حقن الواجهة
        root.innerHTML = html;
        // 🌟 [2026-10-03 — مراجعة تجربة الهاتف] كل شاشة جديدة تبدأ من أعلاها: كان موضع التمرير يبقى من الشاشة السابقة فيصل المعلم
        // لمنتصف الشاشة الجديدة (أو أسفلها) ويضطر للصعود يدوياً بعد كل تنقّل
        window.scrollTo(0, 0);

        // 🌟 [جديد 2026-10-01 — الدخول السريع] نسجّل الشاشة الحالية على <body> (data-dh-screen — خاصية بيانات لا class حتى لا
        // تمسحها switchTheme التي تستبدل className كاملاً) ونبلّغ components/homeFast.js بحدث dh:screen لضبط الترويسة والشريط السفلي
        document.body.dataset.dhScreen = route.templateUrl;
        document.dispatchEvent(new CustomEvent('dh:screen', { detail: { screen: route.templateUrl } }));
        // 🌟 [2026-10-03] أول شاشة جاهزة (وكلاسات الترويسة ضُبطت عبر dh:screen أعلاه): ننهي وضع الإقلاع فتظهر الترويسة والخلفية العادية
        document.documentElement.classList.remove('dh-booting');

        // 🌟 السحر هنا: تطبيق لغة النظام فوراً على الشاشة الجديدة المجلوبة 🌟
        applyLanguage();

        // تنفيذ كود الجافاسكريبت الخاص بهذه الواجهة إن وجد
        if (route.initFunction) {
            route.initFunction();
        }

        // 🌟 [جديد] كل تغيير شاشة هنا يعادل "زيارة صفحة جديدة" من منظور التحليلات، رغم عدم
        // وجود أي تحميل فعلي جديد من المتصفح — نُبلّغ GoatCounter يدوياً بكل شاشة (وليس فقط
        // أول تحميل لـ index.html) حتى تظهر "الصفحات الأكثر زيارة" بشكل صحيح في لوحته
        trackPageview(route.templateUrl);
    } catch (error) {
        flushPendingTheme();
        console.error("فشل في تحميل الواجهة:", error);
        document.documentElement.classList.remove('dh-booting');
        root.innerHTML = `<div style="color:red; text-align:center; font-size:2rem;">عفواً، حدث خطأ في تحميل الشاشة. ❌ Error loading screen.</div>`;
    } finally {
        document.body.classList.remove('dh-nav-pending');
    }
}

// التحكم في الأنماط (تغيير الخلفية والألوان حسب القسم)
// 🌟 [2026-10-07] التطبيق مؤجَّل: كل من يستدعي switchTheme يتبعه loadScreen عادةً بعد انتظار غير متزامن، وتطبيق الثيم فوراً كان
// يُظهر الشاشة القديمة بألوان الثيم الجديد (الأزرق القديم) لثوانٍ. نحفظ الطلب ونطبّقه عند حقن الشاشة؛ ومؤقّت أمان 15 ثانية
// يطبّقه إن لم يتبعه loadScreen (لا تتعطل أي حالة).
let pendingTheme = null;
let pendingTimer = null;
function flushPendingTheme() {
    clearTimeout(pendingTimer);
    pendingTimer = null;
    if (pendingTheme === null) return;
    const theme = pendingTheme;
    pendingTheme = null;
    applyThemeNow(theme);
}
// مؤقّت الأمان لا يطبّق الثيم ما دام loadScreen يجلب الشاشة فعلاً (شبكة بطيئة): يعيد الانتظار بدل كشف الشكل القديم
function safetyFlush() {
    if (document.body.classList.contains('dh-nav-pending')) { pendingTimer = setTimeout(safetyFlush, 15000); return; }
    flushPendingTheme();
}
export function switchTheme(theme) {
    // الشاشة الفارغة/الإقلاع لا شيء يُحافظ عليه: نطبّق فوراً
    const root = document.getElementById('app-root');
    if (document.documentElement.classList.contains('dh-booting') || !root || !root.firstElementChild) { applyThemeNow(theme); return; }
    pendingTheme = theme;
    clearTimeout(pendingTimer);
    pendingTimer = setTimeout(safetyFlush, 15000);
}
function applyThemeNow(theme) {
    const body = document.getElementById('main-body');
    const headerTitle = document.getElementById('header-title');
    const keep = body.classList.contains('dh-nav-pending');

    if(theme === 'kids') {
        body.className = 'kids-theme';
        headerTitle.setAttribute('data-i18n', 'header_title_kids');
    } else {
        body.className = 'adult-theme';
        headerTitle.setAttribute('data-i18n', 'header_title');
    }
    if (keep) body.classList.add('dh-nav-pending');
    applyLanguage();
}
