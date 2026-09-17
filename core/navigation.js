// core/navigation.js

// 🌟 استيراد دالة الترجمة من المنطق المركزي 🌟
import { applyLanguage } from './app.js';

// دالة لجلب كود الـ HTML من المجلدات الأخرى وحقنه في الـ Root
export async function loadScreen(route) {
    const root = document.getElementById('app-root');
    // إضافة رسالة تحميل تدعم اللغتين مؤقتاً
    root.innerHTML = '<div style="text-align:center; font-size:2rem; padding:50px;">Loading... ⏳ جاري التحميل...</div>';

    try {
        // 🌟 cache: 'no-store' يمنع المتصفح من عرض نسخة قديمة مخزّنة من ملفات
        // الشاشات (زي report.html) بعد تعديلها على السيرفر 🌟
        let response = await fetch(route.templateUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        let html = await response.text();
        
        // حقن الواجهة
        root.innerHTML = html;

        // 🌟 السحر هنا: تطبيق لغة النظام فوراً على الشاشة الجديدة المجلوبة 🌟
        applyLanguage();

        // تنفيذ كود الجافاسكريبت الخاص بهذه الواجهة إن وجد
        if (route.initFunction) {
            route.initFunction();
        }
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