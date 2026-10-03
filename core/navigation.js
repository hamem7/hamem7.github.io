// core/navigation.js

// 🌟 استيراد دالة الترجمة من المنطق المركزي 🌟
import { applyLanguage } from './app.js';
// 🌟 [جديد] تتبع تحليلات خصوصي (GoatCounter) — راجع core/analytics.js للشرح الكامل. استدعاء
// trackPageview هنا يدوي لأن المنصة SPA بالكامل (fetch + إحقان innerHTML بلا تحميل صفحة فعلي)
import { trackPageview } from './analytics.js';

// دالة لجلب كود الـ HTML من المجلدات الأخرى وحقنه في الـ Root
export async function loadScreen(route) {
    const root = document.getElementById('app-root');
    // إضافة رسالة تحميل تدعم اللغتين مؤقتاً
    // 🌟 [2026-10-03 — مراجعة تجربة الهاتف] رسالة تحميل بحجم عادي (كانت 2rem بحشوة 50px فتقفز الصفحة لحظة التنقل)
    root.innerHTML = '<div class="dh-screen-loading" style="text-align:center; font-size:1rem; padding:32px 16px; opacity:.8;">⏳ جاري التحميل... Loading</div>';

    try {
        // 🌟 cache: 'no-store' يمنع المتصفح من عرض نسخة قديمة مخزّنة من ملفات
        // الشاشات (زي report.html) بعد تعديلها على السيرفر 🌟
        let response = await fetch(route.templateUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let html = await response.text();
        
        // حقن الواجهة
        root.innerHTML = html;
        // 🌟 [2026-10-03 — مراجعة تجربة الهاتف] كل شاشة جديدة تبدأ من أعلاها: كان موضع التمرير يبقى من الشاشة السابقة فيصل المعلم
        // لمنتصف الشاشة الجديدة (أو أسفلها) ويضطر للصعود يدوياً بعد كل تنقّل
        window.scrollTo(0, 0);

        // 🌟 [جديد 2026-10-01 — الدخول السريع] نسجّل الشاشة الحالية على <body> (data-dh-screen — خاصية بيانات لا class حتى لا
        // تمسحها switchTheme التي تستبدل className كاملاً) ونبلّغ components/homeFast.js بحدث dh:screen لضبط الترويسة والشريط السفلي
        document.body.dataset.dhScreen = route.templateUrl;
        document.dispatchEvent(new CustomEvent('dh:screen', { detail: { screen: route.templateUrl } }));

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
        console.error("فشل في تحميل الواجهة:", error);
        root.innerHTML = `<div style="color:red; text-align:center; font-size:2rem;">عفواً، حدث خطأ في تحميل الشاشة. ❌ Error loading screen.</div>`;
    }
}

// التحكم في الأنماط (تغيير الخلفية والألوان حسب القسم)
export function switchTheme(theme) {
    const body = document.getElementById('main-body');
    const headerTitle = document.getElementById('header-title');
    
    if(theme === 'kids') {
        body.className = 'kids-theme';
        // 🌟 نغير مفتاح الترجمة بدلاً من النص الثابت 🌟
        headerTitle.setAttribute('data-i18n', 'header_title_kids');
    } else {
        body.className = 'adult-theme';
        // 🌟 نعود لمفتاح الترجمة الأصلي 🌟
        headerTitle.setAttribute('data-i18n', 'header_title');
    }
    
    // 🌟 تحديث الترجمة فور تغيير الثيم 🌟
    applyLanguage();
}