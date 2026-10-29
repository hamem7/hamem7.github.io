// tajweed/tajweed-map.js
//
// 🌟 [استبدال كامل] نقطة دخول ركن التجويد: صارت تركّب «تحدي التجويد» الجديد (tajweed/challenge/) بدل شاشات «أبطال التجويد» القديمة.
// الوحدة الجديدة مستقلة (لا تستورد شيئًا من المنصة)؛ هذا الملف وحده يربطها بالمنصة: اللغة (AppState.currentLang) والمظهر
// (<html data-theme>) والخروج للقائمة الرئيسية واسم الطالب الحالي لحفظ التقدّم. الشاشات القديمة (tajweed-activity/entry/summary...)
// لم تعد مستعملة من أي زر، وتبقى في المستودع لحين تأكيد الاستغناء عنها.
import { AppState, loadSplashScreen } from '../core/app.js';
import { applySessionToMastery } from '../engine/tajweedEngine.js';
import { applyLearned } from '../engine/tajweedJourney.js';

// ربط الركن بسجلات الإتقان والجلسات في قاعدة المنصة (TajweedManager) باسم الطالب المختار، فتظهر في شاشات المتابعة وملخص ولي الأمر.
// الأحكام الأصلية فقط؛ دروس «الحركات» و«الألف والهمزة» و«العلامات النادرة» جديدة ولا تقابلها قاعدة في كتالوج المنصة فتبقى في تقدّم الركن وحده.
const RULE_MAP = {
    mushaf_ayah_number: ['know_mushaf', 'mushaf_ayah_number'], mushaf_juz_hizb: ['know_mushaf', 'mushaf_juz_hizb'], mushaf_waqf: ['know_mushaf', 'mushaf_waqf'],
    mushaf_silent_sukun: ['know_mushaf', 'mushaf_silent_sukun'], mushaf_madd_letters: ['know_mushaf', 'mushaf_madd_letters'], mushaf_sin_saad: ['know_mushaf', 'mushaf_sin_saad'], mushaf_sajda: ['know_mushaf', 'mushaf_sajda'],
    ghunna: ['meem_noon_mushaddadah', 'ghunna_wajiba'], qalqalah: ['qalqalah', 'qalqalah'],
    meem_ikhfa: ['meem_sakinah', 'ikhfa_shafawi'], meem_idgham: ['meem_sakinah', 'idgham_shafawi'], meem_izhar: ['meem_sakinah', 'izhar_shafawi'],
    noon_izhar: ['noon_sakinah', 'izhar'], noon_idgham_ghunna: ['noon_sakinah', 'idgham_bighunnah'], noon_idgham_no_ghunna: ['noon_sakinah', 'idgham_bila_ghunnah'], noon_iqlab: ['noon_sakinah', 'iqlab'], noon_ikhfa: ['noon_sakinah', 'ikhfa'],
    lam_qamari: ['lam_al', 'izhar_qamari'], lam_shamsi: ['lam_al', 'idgham_shamsi'],
    madd_tabii: ['madd', 'madd_tabii'], madd_muttasil: ['madd', 'madd_wajib_muttasil'], madd_munfasil: ['madd', 'madd_jaiz_munfasil']
};
// مستوى التعلّم ← نوع النشاط (يحدّد البُعد الذي يتحدّث): تعلّم=يعرف، ١=يميّز، ٢=يكتشف، ٣=يطبّق. «متقن» لا يُمنح تلقائيًا: يبقى باعتماد المعلم كما في النظام السابق.
const ACTIVITY = { 1: 'identify_rule', 2: 'discover_in_ayah', 3: 'exam' };

async function recordProgress(evt, student) {
    const mgr = AppState.tajweedManager; const map = RULE_MAP[evt.ruleId];
    if (!mgr || !map || !student || student.id == null) return;
    const [stageId, ruleId] = map;
    let rec = await mgr.getOrCreateMasteryRecord(student.id, stageId, ruleId);
    if (evt.type === 'learned') { rec = applyLearned(applySessionToMastery(rec, 'choose_rule', 100)); await mgr.saveMastery(rec); return; }
    if (evt.type !== 'level') return;
    const score = evt.total ? Math.round((evt.correct / evt.total) * 100) : 0;
    rec = applySessionToMastery(rec, ACTIVITY[evt.level] || 'identify_rule', score); await mgr.saveMastery(rec);
    await mgr.addSession({ studentId: student.id, stageId, ruleId, activityType: ACTIVITY[evt.level] || 'identify_rule', totalQuestions: evt.total, correctCount: evt.correct, scorePercent: score });
}

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
            onProgress: (evt, student) => recordProgress(evt, student).catch(err => console.warn('تعذر حفظ تقدم التجويد في قاعدة المنصة:', err)),
            profile: AppState.currentStudent && AppState.currentStudent.id ? String(AppState.currentStudent.id) : ''
        });
    } catch (err) {
        console.error('تعذر تشغيل تحدي التجويد:', err);
        host.textContent = 'تعذّر تحميل تحدي التجويد / Could not load the Tajweed Challenge';
    }
}
