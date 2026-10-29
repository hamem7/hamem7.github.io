// tajweed/tajweed-map.js
//
// 🌟 [استبدال كامل] نقطة دخول ركن التجويد: صارت تركّب «تحدي التجويد» الجديد (tajweed/challenge/) بدل شاشات «أبطال التجويد» القديمة.
// الوحدة الجديدة مستقلة (لا تستورد شيئًا من المنصة)؛ هذا الملف وحده يربطها بالمنصة: اللغة (AppState.currentLang) والمظهر
// (<html data-theme>) والخروج للقائمة الرئيسية واسم الطالب الحالي لحفظ التقدّم. الشاشات القديمة (tajweed-activity/entry/summary...)
// لم تعد مستعملة من أي زر، وتبقى في المستودع لحين تأكيد الاستغناء عنها.
import { AppState, loadSplashScreen } from '../core/app.js';

export async function initTajweedMap() {
    const host = document.getElementById('tjc-host');
    if (!host) return;
    try {
        const { start } = await import('./challenge/js/app.js');
        // قائمة الطلاب الظاهرين من قاعدة المنصة (بدونها يعمل الركن بلا اسم)
        let students = [];
        try { students = (await AppState.studentManager.getAllStudents()).filter(s => !s.isHidden).map(s => ({ id: s.id, name: s.name })); } catch (e) { /* بلا قائمة */ }
        await start(host, {
            getLang: () => AppState.currentLang,
            onExit: loadSplashScreen,
            students,
            profile: AppState.currentStudent && AppState.currentStudent.id ? String(AppState.currentStudent.id) : ''
        });
    } catch (err) {
        console.error('تعذر تشغيل تحدي التجويد:', err);
        host.textContent = 'تعذّر تحميل تحدي التجويد / Could not load the Tajweed Challenge';
    }
}
