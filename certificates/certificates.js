// certificates/certificates.js
// ==========================================================
// 🏅 شاشة «الشهادات والتقارير» (ثنائية اللغة ar/en) — ثلاثة تبويبات:
//   1) إصدار شهادة: المعلم يختار نوع الشهادة والطالب والصيغة الجاهزة واللغة والقالب، فتظهر المعاينة الحية، ثم يحفظ صورة أو PDF
//      أو يشاركها واتساب. كل شهادة تُسجَّل كلقطة بيانات صغيرة (certificatesDB.js) ويُعاد فتحها وتعديلها في أي وقت.
//   2) سجل الشهادات الصادرة.
//   3) التقارير السابقة: أرشيف تلقائي لتقارير التقييم الفردي/الثنائي/الشهري المُصدَّرة (reports/reportArchive.js).
//
// 🌟 العزل التقني: ملف مستقل (بادئة CSS/DOM: cc-). القوالب خلفيات فارغة (templates.js) والنصوص تُكتب فوقها بخطوط حادة،
// والتصدير بـ html2canvas (نفس المكتبة/النسخة المستخدمة في reports/report.js). لغة الواجهة تتبع لغة المنصة (t())، أما لغة
// نص الشهادة نفسها (spec.lang) فيختارها المعلم مستقلةً (الافتراضي: لغة المنصة).
// نقطة الدخول: openCertificatesHub() من بطاقة الرئيسية (core/app.js) ولوحة «المزيد» (components/homeFast.js).
// ==========================================================
import { AppState } from '../core/app.js';
import { esc } from '../core/escape.js';
import { t, SURAH_NAMES_AR_BARE, SURAH_NAMES_EN } from '../core/i18n.js';
import { TEMPLATES, templateImage, templateThumb, getTemplate } from './templates.js';
import { TYPES, getType, VERSES, getVerse, juzName, L } from './texts.js';
import { addCertificate, getAllCertificates, deleteCertificate } from './certificatesDB.js';
import { listArchivedReports, getArchivedReportFile, deleteArchivedReport } from '../reports/reportArchive.js';

const PAGE_W = 1000, PAGE_H = 707;               // مقاس التصميم الداخلي (نسبة A4 أفقي)، ويُصدَّر بدقة ×2 = 2000×1414
const GIRL_AVATARS = ['👧🏻', '👩🏻', '🧕🏻'];     // نفس قائمة student/student.js لتحديد الجنس تلقائياً من الصورة الرمزية
const PREFS_KEY = 'darham_cert_prefs';
const EXTRA_MAX = 140;
// خطوط الشهادة العربية التي يختار منها المعلم ('' = خط القالب الافتراضي). css: اسم العائلة في Google Fonts
const CERT_FONTS = [
    { id: '', ar: 'خط القالب', en: 'Template font' },
    { id: 'amiri', css: 'Amiri', ar: 'أميري' },
    { id: 'kufi', css: 'Reem Kufi', ar: 'ريم كوفي' },
    { id: 'ruqaa', css: 'Aref Ruqaa', ar: 'عارف رقعة' },
    { id: 'cairo', css: 'Cairo', ar: 'القاهرة' },
    { id: 'tajawal', css: 'Tajawal', ar: 'تجوال' },
    { id: 'naskh', css: 'Noto Naskh Arabic', ar: 'نسخ' },
    { id: 'scheherazade', css: 'Scheherazade New', ar: 'شهرزاد' },
    { id: 'elmessiri', css: 'El Messiri', ar: 'المسيري' },
    { id: 'lateef', css: 'Lateef', ar: 'لطيف' },
    { id: 'katibeh', css: 'Katibeh', ar: 'كاتبة' },
    { id: 'markazi', css: 'Markazi Text', ar: 'مركزي' },
    { id: 'lemonada', css: 'Lemonada', ar: 'ليمونادا' }
];
const getFont = (id) => CERT_FONTS.find(f => f.id === id && id) || null;
const loadCertFont = (id) => { const f = getFont(id); return f && document.fonts ? document.fonts.load(`700 24px "${f.css}"`, 'بسم الله').catch(() => {}) : Promise.resolve(); };
const BASMALA = 'بسم الله الرحمن الرحيم';
const uiLang = () => (AppState && AppState.currentLang === 'en' ? 'en' : 'ar');

// ------------------------------------------------------------
// تحميل المكتبات والخطوط
// ------------------------------------------------------------
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) return resolve();
        const el = document.createElement('script');
        el.src = src;
        el.onload = resolve;
        el.onerror = () => reject(new Error('تعذّر تحميل المكتبة: ' + src));
        document.head.appendChild(el);
    });
}
const ensureHtml2Canvas = async () => { if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'); };
const ensureJsPdf = async () => { if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'); };

let fontsPromise = null;
function ensureFonts() {
    if (fontsPromise) return fontsPromise;
    if (!document.getElementById('cc-fonts')) {
        const link = document.createElement('link');
        link.id = 'cc-fonts'; link.rel = 'stylesheet';
        link.href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Reem+Kufi:wght@500;700&family=Aref+Ruqaa:wght@400;700'
            + '&family=Playfair+Display:wght@600;700&family=Cormorant+Garamond:ital,wght@0,500;0,700;1,500'
            + '&family=Cairo:wght@400;700&family=Tajawal:wght@400;700&family=Noto+Naskh+Arabic:wght@400;700&family=Scheherazade+New:wght@400;700'
            + '&family=El+Messiri:wght@400;700&family=Lateef:wght@400;700&family=Katibeh&family=Markazi+Text:wght@400;700&family=Lemonada:wght@400;700&display=swap';
        document.head.appendChild(link);
    }
    const load = Promise.all(['700 40px "Reem Kufi"', '700 40px "Aref Ruqaa"', '400 20px "Amiri"', '700 20px "Amiri"', '700 40px "Playfair Display"', '500 20px "Cormorant Garamond"']
        .map(f => (document.fonts ? document.fonts.load(f, 'بسم الله Abc') : Promise.resolve()).catch(() => {})));
    // لا ننتظر الشبكة أكثر من 4 ثوانٍ (بلا إنترنت تظهر الخطوط الاحتياطية)
    fontsPromise = Promise.race([load, new Promise(r => setTimeout(r, 4000))]).then(() => (document.fonts && document.fonts.ready) || null).catch(() => {});
    return fontsPromise;
}

// ------------------------------------------------------------
// الأنماط
// ------------------------------------------------------------
function ensureStyles() {
    if (document.getElementById('cc-style')) return;
    const style = document.createElement('style');
    style.id = 'cc-style';
    style.textContent = `
    .cc-overlay { position: fixed; inset: var(--cc-top, 0px) 0 0 0; z-index: 10040; background: #f4f1e6; display: flex; flex-direction: column; font-family: inherit; color: #10241c; }
    /* الجولة الإرشادية (z-index:9000) يجب أن تعلو هذه الشاشة */
    body.cc-open .dh-tour-root { z-index: 10100; }
    /* ترويسة المنصة (الرئيسية + تغيير اللغة) تبقى ظاهرة فوق الشاشة كباقي شاشات المنصة */
    body.cc-open #main-header { display: flex !important; position: fixed; top: 0; left: 0; right: 0; z-index: 10050; transform: none !important; }
    .cc-head { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: #fffdf6; border-bottom: 1px solid #e3dcc2; color: #0d5c46; flex: none; flex-wrap: wrap; }
    /* تنسيق h2/h3 العام في المنصة يضيف ظلاً/حدوداً للعناوين؛ نلغيها داخل هذه الشاشة */
    .cc-overlay h2, .cc-overlay h3 { text-shadow: none !important; -webkit-text-stroke: 0; filter: none; }
    /* .adult-theme يفرض لون العناوين والتسميات بـ !important؛ نعيد ألوان هذه الشاشة */
    .cc-overlay .cc-head h2 { color: #0d5c46 !important; }
    .cc-overlay .cc-step > h3 { color: #0d5c46 !important; }
    .cc-overlay .cc-field label { color: #4a6058 !important; }
    .cc-head h2 { margin: 0; font-size: 1.2rem; font-weight: 700; flex: none; }
    .cc-tabs { display: flex; gap: 6px; margin-inline-start: auto; flex-wrap: wrap; }
    .cc-tab { border: 1px solid rgba(13,92,70,.35); background: transparent; color: #0d5c46; border-radius: 999px; padding: 7px 14px; font: inherit; font-weight: 700; cursor: pointer; font-size: .88rem; }
    .cc-tab.is-on { background: #0d5c46; color: #fffdf6; border-color: #0d5c46; }
    .cc-x { border: none; background: rgba(13,92,70,.1); color: #0d5c46; width: 36px; height: 36px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; flex: none; }
    .cc-pane { flex: 1; overflow-y: auto; padding: 16px; }
    .cc-pane[hidden] { display: none; }
    .cc-layout { max-width: 1240px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 18px; align-items: start; }
    .cc-preview { position: sticky; top: 0; }
    .cc-stage { position: relative; width: 100%; aspect-ratio: ${PAGE_W} / ${PAGE_H}; overflow: hidden; border-radius: 10px; background: #fff; box-shadow: 0 10px 30px rgba(6,35,28,.25); direction: ltr; }
    .cc-stage .cc-page { position: absolute; top: 0; left: 0; transform-origin: 0 0; }
    .cc-controls { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
    .cc-step { background: #fff; border: 1px solid #e3dcc2; border-radius: 14px; padding: 12px 14px; }
    .cc-step > h3 { margin: 0 0 10px; font-size: .98rem; color: #0d5c46; display: flex; align-items: center; gap: 8px; }
    .cc-step > h3 span { width: 24px; height: 24px; border-radius: 50%; background: #0d5c46; color: #fdf6e3; font-size: .8rem; display: inline-flex; align-items: center; justify-content: center; flex: none; }
    .cc-types { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; }
    .cc-type { border: 1.5px solid #e3dcc2; background: #fffdf6; border-radius: 12px; padding: 9px 10px; font: inherit; cursor: pointer; display: flex; align-items: center; gap: 8px; text-align: start; font-size: .9rem; font-weight: 600; color: #10241c; }
    .cc-type.is-on { border-color: #0d5c46; background: #e8f3ee; box-shadow: 0 0 0 2px rgba(13,92,70,.18); }
    .cc-field { display: flex; flex-direction: column; gap: 4px; margin-bottom: 9px; }
    .cc-field:last-child { margin-bottom: 0; }
    .cc-field[hidden] { display: none; }
    .cc-field label { font-size: .84rem; color: #4a6058; font-weight: 600; }
    .cc-field input, .cc-field select, .cc-field textarea { font: inherit; padding: 9px 10px; border: 1.5px solid #d9d2b6; border-radius: 10px; background: #fff; color: #10241c; width: 100%; box-sizing: border-box; }
    .cc-field input:focus, .cc-field select:focus, .cc-field textarea:focus { outline: none; border-color: #0d5c46; box-shadow: 0 0 0 3px rgba(13,92,70,.15); }
    .cc-field small, .cc-hint { color: #6b7a73; font-size: .76rem; }
    .cc-hint[hidden] { display: none; }
    .cc-seg { display: flex; gap: 6px; }
    .cc-seg button { flex: 1; border: 1.5px solid #d9d2b6; background: #fff; border-radius: 10px; padding: 8px; font: inherit; cursor: pointer; font-weight: 600; }
    .cc-seg button.is-on { border-color: #0d5c46; background: #e8f3ee; color: #0d5c46; }
    .cc-variants { display: flex; flex-direction: column; gap: 8px; }
    .cc-variant { border: 1.5px solid #e3dcc2; background: #fffdf6; border-radius: 12px; padding: 9px 12px; font: inherit; cursor: pointer; text-align: start; line-height: 1.7; font-size: .88rem; color: #10241c; }
    .cc-variant.is-on { border-color: #0d5c46; background: #e8f3ee; box-shadow: 0 0 0 2px rgba(13,92,70,.18); }
    .cc-link { background: none; border: none; color: #0d5c46; font: inherit; font-weight: 700; cursor: pointer; padding: 4px 0; align-self: flex-start; }
    .cc-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; max-height: 380px; overflow-y: auto; padding: 4px; }
    .cc-thumb { border: 2px solid transparent; background: #fff; border-radius: 10px; padding: 0; cursor: pointer; overflow: hidden; position: relative; box-shadow: 0 2px 8px rgba(0,0,0,.12); font: inherit; }
    .cc-thumb img { display: block; width: 100%; aspect-ratio: ${PAGE_W} / ${PAGE_H}; object-fit: cover; }
    .cc-thumb span { display: block; font-size: .72rem; padding: 3px 4px; color: #4a6058; background: #fffdf6; }
    .cc-thumb.is-on { border-color: #0d5c46; box-shadow: 0 0 0 3px rgba(13,92,70,.25); }
    .cc-thumb.is-on::after { content: "✓"; position: absolute; top: 4px; inset-inline-start: 4px; width: 20px; height: 20px; border-radius: 50%; background: #0d5c46; color: #fff; font-size: .75rem; display: flex; align-items: center; justify-content: center; }
    .cc-check { display: flex; align-items: center; gap: 8px; font-size: .9rem; cursor: pointer; }
    .cc-actionbar { flex: none; display: flex; gap: 8px; padding: 10px 16px; background: #fffdf6; border-top: 1px solid #e3dcc2; flex-wrap: wrap; justify-content: center; }
    .cc-actionbar[hidden] { display: none; }
    .cc-btn { flex: 1 1 130px; max-width: 230px; border: none; border-radius: 12px; padding: 11px 10px; font: inherit; font-weight: 700; cursor: pointer; font-size: .95rem; }
    .cc-btn:disabled { opacity: .6; cursor: wait; }
    .cc-btn-png { background: #0d5c46; color: #fdf6e3; }
    .cc-btn-pdf { background: #8a6612; color: #fff; }
    .cc-btn-wa { background: #25D366; color: #fff; }
    .cc-btn-keep { background: transparent; color: #0d5c46; border: 2px solid #0d5c46; }
    .cc-note { text-align: center; font-size: .82rem; color: #4a6058; padding: 4px 16px 0; min-height: 0; }
    .cc-note:empty { display: none; }
    .cc-note.is-err { color: #a15230; font-weight: 700; }
    .cc-hist { max-width: 900px; margin: 0 auto; }
    .cc-hist-note { font-size: .84rem; color: #4a6058; background: #fffdf6; border: 1px dashed #d9d2b6; border-radius: 10px; padding: 8px 12px; margin-bottom: 10px; line-height: 1.7; }
    .cc-hist-tools { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .cc-hist-tools input, .cc-hist-tools select { font: inherit; padding: 9px 12px; border: 1.5px solid #d9d2b6; border-radius: 10px; background: #fff; flex: 1 1 180px; min-width: 0; }
    .cc-row { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #e3dcc2; border-radius: 14px; padding: 10px; margin-bottom: 8px; }
    .cc-row img { width: 92px; aspect-ratio: ${PAGE_W} / ${PAGE_H}; object-fit: cover; border-radius: 6px; flex: none; box-shadow: 0 2px 6px rgba(0,0,0,.18); }
    .cc-row img.is-report { width: 64px; height: 84px; aspect-ratio: auto; object-position: top; background: #f1ecdc; }
    .cc-row-main { flex: 1; min-width: 0; }
    .cc-row-name { font-weight: 700; color: #0d5c46; word-break: break-word; }
    .cc-row-meta { font-size: .82rem; color: #4a6058; line-height: 1.6; }
    .cc-badge { display: inline-block; font-size: .72rem; font-weight: 700; padding: 1px 8px; border-radius: 999px; background: #e8f3ee; color: #0d5c46; margin-inline-end: 6px; }
    .cc-row-btns { display: flex; gap: 6px; flex: none; flex-wrap: wrap; justify-content: flex-end; }
    .cc-row-btns button { border: 1.5px solid #0d5c46; background: #fff; color: #0d5c46; border-radius: 10px; padding: 7px 12px; font: inherit; font-weight: 700; cursor: pointer; font-size: .85rem; }
    .cc-row-btns button.cc-del { border-color: #c9a7a0; color: #a15230; }
    .cc-empty { text-align: center; color: #4a6058; padding: 40px 10px; line-height: 1.9; }
    .cc-viewer { position: fixed; inset: 0; z-index: 10060; background: rgba(6,35,28,.9); display: flex; flex-direction: column; }
    .cc-viewer-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px; color: #fdf6e3; flex: none; }
    .cc-viewer-head b { flex: 1; min-width: 0; word-break: break-word; }
    .cc-viewer-body { flex: 1; overflow: auto; padding: 8px 12px 16px; text-align: center; }
    .cc-viewer-body img { width: min(100%, 900px); height: auto; border-radius: 6px; background: #fff; box-shadow: 0 10px 30px rgba(0,0,0,.4); }
    .cc-viewer-foot { flex: none; padding: 8px 14px 12px; display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; color: #fdf6e3; font-size: .8rem; }

    /* ===== الشهادة نفسها: مقاس تصميم ثابت ${PAGE_W}×${PAGE_H}px ويُكبَّر/يُصغَّر بالمعاينة فقط ===== */
    .cc-page { width: ${PAGE_W}px; height: ${PAGE_H}px; position: relative; overflow: hidden; background: #fff; direction: rtl; --s: 1; font-family: 'Amiri', 'Cairo', serif; color: var(--ink); }
    .cc-page * { box-sizing: border-box; }
    .cc-f-kufi { --hf: 'Reem Kufi', 'Cairo', 'Amiri', sans-serif; }
    .cc-f-ruqaa { --hf: 'Aref Ruqaa', 'Amiri', serif; }
    .cc-f-amiri { --hf: 'Amiri', serif; }
    /* الإنجليزية: نص من اليسار لليمين بخطوط لاتينية أنيقة، وآية/حديث بالعربية أصغر ثم ترجمتها */
    .cc-ff-amiri { --hf: 'Amiri', serif; --bf: 'Amiri', serif; }
    .cc-ff-kufi { --hf: 'Reem Kufi', 'Cairo', sans-serif; --bf: 'Reem Kufi', 'Cairo', sans-serif; }
    .cc-ff-ruqaa { --hf: 'Aref Ruqaa', 'Amiri', serif; --bf: 'Aref Ruqaa', 'Amiri', serif; }
    .cc-ff-cairo { --hf: 'Cairo', sans-serif; --bf: 'Cairo', sans-serif; }
    .cc-ff-tajawal { --hf: 'Tajawal', sans-serif; --bf: 'Tajawal', sans-serif; }
    .cc-ff-naskh { --hf: 'Noto Naskh Arabic', 'Amiri', serif; --bf: 'Noto Naskh Arabic', 'Amiri', serif; }
    .cc-ff-scheherazade { --hf: 'Scheherazade New', 'Amiri', serif; --bf: 'Scheherazade New', 'Amiri', serif; }
    .cc-ff-elmessiri { --hf: 'El Messiri', 'Amiri', serif; --bf: 'El Messiri', 'Amiri', serif; }
    .cc-ff-lateef { --hf: 'Lateef', 'Amiri', serif; --bf: 'Lateef', 'Amiri', serif; }
    .cc-ff-katibeh { --hf: 'Katibeh', 'Amiri', serif; --bf: 'Katibeh', 'Amiri', serif; }
    .cc-ff-markazi { --hf: 'Markazi Text', 'Amiri', serif; --bf: 'Markazi Text', 'Amiri', serif; }
    .cc-ff-lemonada { --hf: 'Lemonada', 'Cairo', sans-serif; --bf: 'Lemonada', 'Cairo', sans-serif; }
    /* الخط المختار يشمل النص والتوقيع أيضاً (العربية فقط) */
    .cc-page[class*="cc-ff-"].cc-lang-ar .cc-text, .cc-page[class*="cc-ff-"].cc-lang-ar .cc-extra, .cc-page[class*="cc-ff-"].cc-lang-ar .cc-sig, .cc-page[class*="cc-ff-"].cc-lang-ar .cc-no { font-family: var(--bf); }
    .cc-fonts { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 6px; }
    .cc-fonts button { border: 1.5px solid #d9d2b6; background: #fff; border-radius: 10px; padding: 7px 4px; font: inherit; cursor: pointer; font-size: 1.05rem; color: #10241c; }
    .cc-fonts button.is-on { border-color: #0d5c46; background: #e8f3ee; color: #0d5c46; box-shadow: 0 0 0 2px rgba(13,92,70,.18); }
    .cc-tab-reports { background: #8a6612; border-color: #8a6612; color: #fff; box-shadow: 0 2px 8px rgba(138,102,18,.35); }
    .cc-tab-reports.is-on { background: #6b4e0b; border-color: #6b4e0b; color: #fff; box-shadow: 0 0 0 3px rgba(138,102,18,.3); }
    .cc-lang-en { direction: ltr; --hf: 'Playfair Display', 'Amiri', serif; font-family: 'Cormorant Garamond', 'Amiri', serif; }
    .cc-lang-en .cc-title { font-size: calc(38px * var(--s)); }
    .cc-lang-en .cc-name { font-size: calc(38px * var(--s)); }
    .cc-lang-en .cc-text { font-size: calc(23px * var(--s)); line-height: 1.55; }
    .cc-lang-en .cc-extra { font-size: calc(20px * var(--s)); }
    .cc-lang-en .cc-sig { font-size: calc(15px * var(--s)); }
    .cc-lang-en .cc-sig b { font-size: calc(17px * var(--s)); }
    .cc-lang-en .cc-no { font-size: calc(12px * var(--s)); }
    .cc-bg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    .cc-box { position: absolute; }
    .cc-inner { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; gap: calc(4px * var(--s)); }
    .cc-logo { position: absolute; transform: translateX(-50%); width: auto; display: block; pointer-events: none; }
    .cc-basmala { font-family: 'Aref Ruqaa', 'Amiri', serif; font-size: calc(25px * var(--s)); color: var(--title); line-height: 1.3; direction: rtl; }
    .cc-title { font-family: var(--hf); font-weight: 700; font-size: calc(46px * var(--s)); color: var(--title); line-height: 1.25; }
    .cc-rule { display: flex; align-items: center; gap: 10px; width: 62%; color: var(--acc); line-height: 1; }
    .cc-rule i { flex: 1; height: 2px; background: linear-gradient(90deg, transparent, var(--acc), transparent); }
    .cc-rule b { font-size: calc(14px * var(--s)); }
    .cc-name { font-family: var(--hf); font-weight: 700; font-size: calc(40px * var(--s)); color: var(--name); line-height: 1.35; overflow-wrap: anywhere; }
    .cc-body { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: calc(6px * var(--s)); width: 100%; }
    .cc-text { font-size: calc(22px * var(--s)); line-height: 1.85; color: var(--ink); }
    .cc-text b { color: var(--title); font-weight: 700; }
    .cc-extra { font-size: calc(19px * var(--s)); line-height: 1.7; color: var(--ink); opacity: .92; font-style: italic; }
    .cc-verse { font-size: calc(19px * var(--s)); line-height: 1.8; color: var(--title); }
    .cc-verse .cc-ar { display: block; font-family: 'Amiri', serif; direction: rtl; }
    .cc-lang-en .cc-verse .cc-ar { font-size: calc(17px * var(--s)); line-height: 1.7; }
    .cc-verse .cc-tr { display: block; font-style: italic; font-size: calc(17px * var(--s)); line-height: 1.4; }
    .cc-verse small { display: block; font-size: calc(13px * var(--s)); opacity: .75; }
    .cc-foot { width: 100%; display: grid; grid-template-columns: 1fr auto 1fr; align-items: start; gap: calc(10px * var(--s)); }
    .cc-sig { font-size: calc(14px * var(--s)); line-height: 1.5; color: var(--ink); }
    .cc-sig .cc-sigline { height: calc(20px * var(--s)); border-bottom: 1.5px solid currentColor; margin-bottom: 2px; opacity: .55; }
    .cc-sig b { display: block; font-size: calc(16px * var(--s)); color: var(--title); line-height: 1.45; }
    .cc-stamp { width: calc(64px * var(--s)); height: calc(64px * var(--s)); display: flex; align-items: center; justify-content: center; }
    .cc-stamp img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
    .cc-no { font-size: calc(11px * var(--s)); color: var(--ink); opacity: .65; }
    .cc-no bdi { direction: ltr; unicode-bidi: isolate; }
    .cc-offscreen { position: fixed; left: -20000px; top: 0; width: ${PAGE_W}px; height: ${PAGE_H}px; pointer-events: none; }

    @media (max-width: 900px) {
        .cc-layout { grid-template-columns: minmax(0, 1fr); gap: 12px; }
        .cc-preview { top: -16px; z-index: 5; background: #f4f1e6; padding: 16px 0 6px; margin-top: -16px; }
        .cc-pane { padding: 16px 12px; }
        .cc-row { flex-wrap: wrap; }
        .cc-row-btns { width: 100%; }
        .cc-row-btns button { flex: 1; }
        .cc-btn { max-width: none; }
        .cc-head h2 { font-size: 1.05rem; }
    }
    @media (prefers-reduced-motion: reduce) { .cc-overlay * { transition: none !important; } }
    `;
    document.head.appendChild(style);
}

// ------------------------------------------------------------
// أدوات صياغة
// ------------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0');
function todayISO() { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function parseISO(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12) : new Date();
}
function formatDates(date, lang) {
    const en = lang === 'en';
    let hijri = '', greg = '';
    try {
        hijri = new Intl.DateTimeFormat((en ? 'en' : 'ar-SA') + '-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
        if (en && !/AH/.test(hijri)) hijri += ' AH';
    } catch (e) { /* المتصفح لا يدعم تقويم أم القرى — يختفي السطر الهجري */ }
    try { greg = new Intl.DateTimeFormat(en ? 'en-GB' : 'ar-EG-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(date); } catch (e) { greg = date.toLocaleDateString(); }
    return { hijri, greg };
}
function monthLabel(date, lang) {
    try {
        return lang === 'en'
            ? 'the month of ' + new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(date)
            : 'شهر ' + new Intl.DateTimeFormat('ar-EG-u-ca-gregory', { month: 'long', year: 'numeric' }).format(date);
    } catch (e) { return lang === 'en' ? 'this month' : 'هذا الشهر'; }
}
function certNumber(spec) {
    const seed = [spec.name, spec.typeId, spec.dateISO, spec.what].join('|');
    let h = 5381;
    for (let i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
    return `HAM-${parseISO(spec.dateISO).getFullYear()}-${String(h % 1000000).padStart(6, '0')}`;
}
const stripTags = (html) => String(html).replace(/<[^>]+>/g, '');
const surahName = (n, lang) => ((lang === 'en' ? SURAH_NAMES_EN : SURAH_NAMES_AR_BARE)[(n || 1) - 1] || '');
const certLang = (spec) => (spec && spec.lang === 'en' ? 'en' : 'ar');
const tplLabel = (tpl) => (uiLang() === 'en' && tpl.labelEn ? tpl.labelEn : tpl.label);

function buildWhat(type, v, dateISO, lang) {
    switch (type.id) {
        case 'surah': return (lang === 'en' ? 'Surah ' : 'سورة ') + surahName(v.surah, lang);
        case 'juz': return juzName(v.juz || 1, lang);
        case 'half': return lang === 'en'
            ? (v.half === 'second' ? 'the second half of ' : 'the first half of ') + juzName(v.juz || 1, lang)
            : 'نصف ' + juzName(v.juz || 1, lang) + (v.half === 'second' ? ' (النصف الثاني)' : ' (النصف الأول)');
        case 'month': return monthLabel(parseISO(dateISO), lang);
        case 'khatm': return '';
        default: return String(v.text || '').trim() || L(type.whatDefault, lang) || '';
    }
}

// spec = كل ما يلزم لرسم الشهادة (وهو نفسه ما يُحفظ في السجل)
function bodyHtml(spec) {
    const type = getType(spec.typeId);
    const lang = certLang(spec);
    const s = { name: esc(spec.name || t('cc_placeholder_name')), f: !!spec.female, what: esc(spec.what) };
    const list = type.bodies[lang] || type.bodies.ar;
    return (list[spec.bodyIdx % list.length] || list[0])(s);
}

function getTeacher() {
    const tch = (AppState && AppState.currentTeacher) || {};
    return { name: tch.name || (AppState && AppState.teacherName) || '', stamp: tch.stamp || null };
}

const cssVars = (tpl) => `--ink:${tpl.ink};--title:${tpl.title};--name:${tpl.name};--acc:${tpl.accent};`;

function verseHtml(verse, lang) {
    if (!verse.text) return '';
    const ref = L(verse.ref, lang);
    return lang === 'en'
        ? `<div class="cc-verse"><span class="cc-ar">${verse.text}</span><span class="cc-tr">${esc(verse.tr)}</span><small>${esc(ref)}</small></div>`
        : `<div class="cc-verse"><span class="cc-ar">${verse.text}</span><small>${esc(ref)}</small></div>`;
}
function boxHtml(spec, teacher) {
    const tpl = getTemplate(spec.templateId);
    const type = getType(spec.typeId);
    const lang = certLang(spec);
    const d = formatDates(parseISO(spec.dateISO), lang);
    const b = tpl.box;
    const extra = String(spec.extra || '').trim();
    const placeholder = (lang === 'en' ? "Student's name" : 'اسم الطالب');
    return `<div class="cc-box" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%;"><div class="cc-inner">
        ${spec.basmala && !tpl.noBasmala ? `<div class="cc-basmala">${BASMALA}</div>` : ''}
        ${tpl.noTitle ? '' : `<div class="cc-title">${esc(L(type.title, lang))}</div><div class="cc-rule"><i></i><b>✦</b><i></i></div>`}
        <div class="cc-name">${esc(spec.name || placeholder)}</div>
        <div class="cc-body">
            <div class="cc-text">${bodyHtml(spec)}</div>
            ${extra ? `<div class="cc-extra">${esc(extra)}</div>` : ''}
        </div>
        ${verseHtml(getVerse(spec.verseId), lang)}
        <div class="cc-foot">
            <div class="cc-sig"><div class="cc-sigline"></div>${lang === 'en' ? 'Teacher' : 'المعلم'}<b>${esc(teacher.name)}</b></div>
            <div class="cc-stamp">${teacher.stamp ? `<img src="${esc(teacher.stamp)}" alt="">` : ''}</div>
            <div class="cc-sig"><div class="cc-sigline"></div>${lang === 'en' ? 'Date' : 'التاريخ'}<b>${d.hijri ? esc(d.hijri) + '<br>' : ''}${esc(d.greg)}</b></div>
        </div>
        <div class="cc-no">${lang === 'en' ? 'Certificate No.' : 'رقم الشهادة'}: <bdi>${esc(certNumber(spec))}</bdi></div>
    </div></div>`;
}
function logoHtml(tpl) {
    const g = tpl.logo;
    if (!g) return '';
    const file = g.tone === 'light' ? 'ham-logo-light' : g.tone === 'mono' ? 'ham-logo-mono' : 'ham-logo';
    return `<img class="cc-logo" src="assets/brand/${file}.svg" alt="" style="left:${g.x}%;top:${g.y}%;height:${g.h}%;">`;
}
function pageHtml(spec, teacher) {
    const tpl = getTemplate(spec.templateId);
    const ff = certLang(spec) === 'ar' && getFont(spec.font) ? ` cc-ff-${spec.font}` : '';
    return `<div class="cc-page cc-f-${tpl.font}${ff} cc-lang-${certLang(spec)}" data-tpl="${tpl.id}" data-lang="${certLang(spec)}" data-font="${ff ? spec.font : ''}" style="${cssVars(tpl)}">
        <img class="cc-bg" src="${templateImage(tpl.id)}" alt="">${logoHtml(tpl)}${boxHtml(spec, teacher)}</div>`;
}

// تصغير الخط تدريجياً حتى يتّسع المحتوى داخل منطقة الكتابة الآمنة للقالب
function fitPage(page) {
    const inner = page.querySelector('.cc-inner');
    if (!inner) return;
    let s = 1;
    page.style.setProperty('--s', '1');
    for (let i = 0; i < 18 && s > 0.45 && inner.scrollHeight > inner.clientHeight + 1; i++) {
        s = Math.round((s - 0.04) * 100) / 100;
        page.style.setProperty('--s', String(s));
    }
}

// ------------------------------------------------------------
// التصدير: صورة / PDF / مشاركة
// ------------------------------------------------------------
async function renderCanvas(spec) {
    await Promise.all([ensureHtml2Canvas(), ensureFonts(), loadCertFont(spec.font)]);
    const holder = document.createElement('div');
    holder.className = 'cc-offscreen';
    holder.innerHTML = pageHtml(spec, getTeacher());
    document.body.appendChild(holder);
    try {
        const page = holder.firstElementChild;
        await Promise.all(Array.from(holder.querySelectorAll('img')).map(img => (img.complete ? Promise.resolve() : new Promise(r => { img.onload = img.onerror = r; }))));
        fitPage(page);
        return await window.html2canvas(page, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false, width: PAGE_W, height: PAGE_H });
    } finally {
        holder.remove();
    }
}
const toPngBlob = (canvas) => new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
async function canvasToPdfBlob(canvas) {
    await ensureJsPdf();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, 297, 210);
    return pdf.output('blob');
}
const safeName = (s) => String(s).replace(/[\\/:*?"<>|]/g, '_').trim() || 'certificate';
// مشاركة ملف عبر Web Share API إن أمكن، وإلا تنزيل (يُرجع true لو شُورك فعلاً)
async function shareOrDownload(blob, filename, title, text) {
    const file = new File([blob], filename, { type: blob.type || 'image/png' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title, text });
        return true;
    }
    downloadBlob(blob, filename);
    return false;
}

// ------------------------------------------------------------
// الشاشة الرئيسية للميزة
// ------------------------------------------------------------
// ⭐ إصدار شهادة «النجوم الذهبية» تلقائياً عند بلوغ طالب عتبة نجوم (يستدعيها games/adultGame.js). تُسجَّل في سجل الشهادات
// الصادرة فتظهر في تبويب «السجل» ويفتحها المعلم لتعديلها/حفظها/مشاركتها. القالب والخط من آخر اختيارات المعلم.
// best-effort: أي فشل يُسجَّل في الـconsole ولا يعطّل اللعبة. تُرجع true عند النجاح.
export async function autoIssueStarCertificate(student, stars) {
    try {
        let prefs = {};
        try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { prefs = {}; }
        const type = getType('star');
        const lang = prefs.lang === 'en' ? 'en' : 'ar';
        const values = { surah: 1, juz: 1, half: 'first', text: lang === 'en' ? `${stars} golden stars` : `${stars} نجوم ذهبية` };
        const spec = {
            typeId: 'star', name: String(student.name || '').trim(),
            female: GIRL_AVATARS.includes(student.avatar) || student.gender === 'girl' || student.gender === 'female',
            lang, what: buildWhat(type, values, todayISO(), lang), values, bodyIdx: 0, extra: '', verseId: type.verse,
            basmala: prefs.basmala !== false,
            templateId: TEMPLATES.some(x => x.id === prefs.templateId) ? prefs.templateId : TEMPLATES[0].id,
            dateISO: todayISO(), studentId: String(student.id == null ? '' : student.id), manualName: '',
            font: getFont(prefs.font) ? prefs.font : '', auto: true
        };
        await addCertificate(spec);
        return true;
    } catch (e) { console.warn('تعذّر إصدار شهادة النجوم تلقائياً:', e); return false; }
}

export async function openCertificatesHub(opts = {}) {
    if (document.querySelector('.cc-overlay')) return;
    ensureStyles();
    ensureFonts();

    // ----- الحالة -----
    let prefs = {};
    try { prefs = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { prefs = {}; }
    const firstType = getType(opts.typeId || 'surah');
    const S = {
        typeId: firstType.id,
        studentId: '',            // '' = غير محدد، 'other' = اسم يدوي، وإلا معرّف الطالب
        manualName: '',
        female: false,
        lang: prefs.lang === 'en' || prefs.lang === 'ar' ? prefs.lang : uiLang(),   // لغة نص الشهادة (الافتراضي: آخر اختيار ثم لغة المنصة)
        values: { surah: 1, juz: 1, half: 'first', text: '' },
        font: getFont(prefs.font) ? prefs.font : '',
        bodyIdx: 0,
        extra: '',
        verseId: firstType.verse,
        basmala: prefs.basmala !== false,
        templateId: TEMPLATES.some(x => x.id === prefs.templateId) ? prefs.templateId : TEMPLATES[0].id,
        dateISO: todayISO()
    };
    let students = [];
    let lastSavedKey = '';
    let history = [];
    let reports = [];
    const objectUrls = [];     // صور مصغّرة مؤقتة لقائمة التقارير (تُحرَّر عند إعادة الرسم/الإغلاق)

    const currentName = () => {
        if (S.studentId && S.studentId !== 'other') { const st = students.find(x => String(x.id) === String(S.studentId)); if (st) return st.name; }
        return S.manualName.trim();
    };
    const buildSpec = () => {
        const type = getType(S.typeId);
        return {
            typeId: S.typeId, name: currentName(), female: S.female, lang: S.lang, what: buildWhat(type, S.values, S.dateISO, S.lang),
            values: { ...S.values }, bodyIdx: S.bodyIdx, extra: S.extra, verseId: S.verseId, basmala: S.basmala,
            templateId: S.templateId, dateISO: S.dateISO, studentId: S.studentId, manualName: S.manualName, font: S.font
        };
    };
    const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ templateId: S.templateId, basmala: S.basmala, lang: S.lang, font: S.font })); } catch (e) { /* تجاهل */ } };

    // ----- الهيكل -----
    const overlay = document.createElement('div');
    overlay.className = 'cc-overlay';
    overlay.dir = document.documentElement.dir || (uiLang() === 'en' ? 'ltr' : 'rtl');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', t('cc_title'));
    overlay.innerHTML = `
        <header class="cc-head">
            <h2>${esc(t('cc_title'))}</h2>
            <nav class="cc-tabs">
                <button type="button" class="cc-tab is-on" data-tab="issue">${esc(t('cc_tab_issue'))}</button>
                <button type="button" class="cc-tab" data-tab="history">${esc(t('cc_tab_history'))} <span id="cc-count"></span></button>
                <button type="button" class="cc-tab cc-tab-reports" data-tab="reports">🗂️ ${esc(t('cc_tab_reports'))} <span id="cc-rep-count"></span></button>
            </nav>
            <button type="button" class="cc-x" id="cc-close" aria-label="${esc(t('cc_close'))}">✕</button>
        </header>
        <section class="cc-pane" data-pane="issue">
            <div class="cc-layout">
                <aside class="cc-preview"><div class="cc-stage" id="cc-stage"></div></aside>
                <div class="cc-controls">
                    <div class="cc-step" id="cc-step-type"><h3><span>1</span>${esc(t('cc_step_type'))}</h3><div class="cc-types" id="cc-types"></div></div>
                    <div class="cc-step" id="cc-step-student"><h3><span>2</span>${esc(t('cc_step_student'))}</h3>
                        <div class="cc-field"><label for="cc-student">${esc(t('cc_pick_student'))}</label><select id="cc-student"></select></div>
                        <div class="cc-field" id="cc-manual-wrap" hidden><label for="cc-manual">${esc(t('cc_student_name'))}</label><input id="cc-manual" type="text" maxlength="60" autocomplete="off"></div>
                        <div class="cc-field"><label>${esc(t('cc_gender'))}</label><div class="cc-seg" id="cc-gender"><button type="button" data-g="m">${esc(t('cc_boy'))}</button><button type="button" data-g="f">${esc(t('cc_girl'))}</button></div></div>
                    </div>
                    <div class="cc-step" id="cc-details-step"><h3><span>3</span>${esc(t('cc_step_details'))}</h3><div id="cc-details"></div></div>
                    <div class="cc-step" id="cc-step-text"><h3><span>4</span>${esc(t('cc_step_text'))}</h3>
                        <div class="cc-field"><label>${esc(t('cc_lang'))}</label><div class="cc-seg" id="cc-lang"><button type="button" data-l="ar">${esc(t('cc_lang_ar'))}</button><button type="button" data-l="en">${esc(t('cc_lang_en'))}</button></div><small>${esc(t('cc_lang_hint'))}</small></div>
                        <div class="cc-variants" id="cc-variants"></div>
                        <button type="button" class="cc-link" id="cc-next-variant">${esc(t('cc_next_variant'))}</button>
                        <div class="cc-field"><label for="cc-extra">${esc(t('cc_extra_label'))}</label><textarea id="cc-extra" rows="2" maxlength="${EXTRA_MAX}" placeholder="${esc(t('cc_extra_ph'))}"></textarea><small id="cc-extra-count"></small></div>
                    </div>
                    <div class="cc-step" id="cc-step-verse"><h3><span>5</span>${esc(t('cc_step_verse'))}</h3>
                        <div class="cc-field"><select id="cc-verse"></select></div>
                        <label class="cc-check"><input type="checkbox" id="cc-basmala"> ${esc(t('cc_basmala'))}</label>
                        <div class="cc-hint" id="cc-baked-note" hidden>${esc(t('cc_baked_note'))}</div>
                    </div>
                    <div class="cc-step" id="cc-step-template"><h3><span>6</span>${esc(t('cc_step_template'))}</h3><div class="cc-field"><label>${esc(t('cc_font'))}</label><div class="cc-fonts" id="cc-fonts"></div><small id="cc-font-hint">${esc(t('cc_font_hint'))}</small></div><div class="cc-gallery" id="cc-gallery"></div></div>
                    <div class="cc-step"><h3><span>7</span>${esc(t('cc_step_date'))}</h3>
                        <div class="cc-field"><input id="cc-date" type="date"><small id="cc-date-hint"></small></div>
                    </div>
                </div>
            </div>
        </section>
        <section class="cc-pane" data-pane="history" hidden>
            <div class="cc-hist">
                <div class="cc-hist-tools">
                    <input id="cc-search" type="search" placeholder="${esc(t('cc_search_ph'))}" autocomplete="off">
                    <select id="cc-filter"><option value="">${esc(t('cc_all_types'))}</option></select>
                </div>
                <div id="cc-hist-list"></div>
            </div>
        </section>
        <section class="cc-pane" data-pane="reports" hidden>
            <div class="cc-hist">
                <div class="cc-hist-note">${esc(t('cc_rep_note'))}</div>
                <div class="cc-hist-tools">
                    <input id="cc-rep-search" type="search" placeholder="${esc(t('cc_rep_search_ph'))}" autocomplete="off">
                    <select id="cc-rep-filter">
                        <option value="">${esc(t('cc_all_types'))}</option>
                        <option value="individual">${esc(t('cc_rep_kind_individual'))}</option>
                        <option value="dual">${esc(t('cc_rep_kind_dual'))}</option>
                        <option value="monthly">${esc(t('cc_rep_kind_monthly'))}</option>
                    </select>
                </div>
                <div id="cc-rep-list"></div>
            </div>
        </section>
        <div class="cc-note" id="cc-note" role="status"></div>
        <div class="cc-actionbar" id="cc-actionbar">
            <button type="button" class="cc-btn cc-btn-png" id="cc-png">${esc(t('cc_btn_png'))}</button>
            <button type="button" class="cc-btn cc-btn-pdf" id="cc-pdf">${esc(t('cc_btn_pdf'))}</button>
            <button type="button" class="cc-btn cc-btn-wa" id="cc-wa">${esc(t('cc_btn_wa'))}</button>
            <button type="button" class="cc-btn cc-btn-keep" id="cc-keep">${esc(t('cc_btn_keep'))}</button>
        </div>`;
    document.body.appendChild(overlay);
    document.body.classList.add('cc-open');
    // الشاشة تبدأ تحت ترويسة المنصة (تُحسب ارتفاعها لأنها تتغير بين الحاسوب والهاتف)
    const mainHeader = document.getElementById('main-header');
    const placeBelowHeader = () => overlay.style.setProperty('--cc-top', (mainHeader ? Math.ceil(mainHeader.getBoundingClientRect().height) : 0) + 'px');
    placeBelowHeader();
    window.addEventListener('resize', placeBelowHeader);
    const headerRo = (mainHeader && window.ResizeObserver) ? new ResizeObserver(placeBelowHeader) : null;
    if (headerRo) headerRo.observe(mainHeader);
    // «الرئيسية» تغلق الشاشة، وتغيير اللغة يعيد فتحها بلغتها الجديدة (يعمل بعد معالج app.js الذي يبدّل اللغة)
    const homeBtn = document.getElementById('header-home-btn');
    const langBtn = document.getElementById('lang-toggle-btn');
    const onLang = () => { close(); setTimeout(() => openCertificatesHub({ ...opts, noTour: true }), 0); };
    if (homeBtn) homeBtn.addEventListener('click', close);
    if (langBtn) langBtn.addEventListener('click', onLang);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const $ = (sel) => overlay.querySelector(sel);
    const stage = $('#cc-stage');
    const noteEl = $('#cc-note');
    const showNote = (msg, isErr) => { noteEl.textContent = msg || ''; noteEl.classList.toggle('is-err', !!isErr); };

    let ro = null;
    let viewerEl = null;
    function closeViewer() { if (viewerEl) { viewerEl.remove(); viewerEl = null; } }
    function releaseUrls() { while (objectUrls.length) { try { URL.revokeObjectURL(objectUrls.pop()); } catch (e) { /* تجاهل */ } } }
    function close() {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', scalePreview);
        window.removeEventListener('resize', placeBelowHeader);
        if (headerRo) headerRo.disconnect();
        if (homeBtn) homeBtn.removeEventListener('click', close);
        if (langBtn) langBtn.removeEventListener('click', onLang);
        if (ro) ro.disconnect();
        closeViewer();
        releaseUrls();
        document.body.classList.remove('cc-open');
        document.body.style.overflow = prevOverflow;
        overlay.remove();
    }
    function onKey(e) {
        if (e.key !== 'Escape') return;
        // أثناء الجولة الإرشادية يتولى Escape إنهاءها
        if (document.querySelector('.dh-tour-root')) return;
        if (viewerEl) closeViewer(); else close();
    }
    document.addEventListener('keydown', onKey);
    $('#cc-close').addEventListener('click', close);

    // ----- المعاينة الحية -----
    function scalePreview() {
        const page = stage.querySelector('.cc-page');
        if (!page) return;
        page.style.transform = `scale(${stage.clientWidth / PAGE_W})`;
    }
    function renderPreview() {
        const spec = buildSpec();
        const teacher = getTeacher();
        let page = stage.querySelector('.cc-page');
        if (!page || page.dataset.tpl !== spec.templateId || page.dataset.lang !== spec.lang || page.dataset.font !== (getFont(spec.font) && spec.lang === 'ar' ? spec.font : '')) {
            stage.innerHTML = pageHtml(spec, teacher);
            page = stage.querySelector('.cc-page');
        } else {
            const tmp = document.createElement('div');
            tmp.innerHTML = boxHtml(spec, teacher);
            page.querySelector('.cc-box').replaceWith(tmp.firstElementChild);
        }
        scalePreview();
        fitPage(page);
    }
    if (window.ResizeObserver) { ro = new ResizeObserver(scalePreview); ro.observe(stage); }
    window.addEventListener('resize', scalePreview, { passive: true });
    ensureFonts().then(() => { if (overlay.isConnected) renderPreview(); });

    // ----- الأنواع -----
    const typesEl = $('#cc-types');
    typesEl.innerHTML = TYPES.map(x => `<button type="button" class="cc-type" data-type="${x.id}"><span aria-hidden="true">${x.icon}</span>${esc(L(x.label, uiLang()))}</button>`).join('');
    function markTypes() { typesEl.querySelectorAll('.cc-type').forEach(b => b.classList.toggle('is-on', b.dataset.type === S.typeId)); }
    typesEl.addEventListener('click', (e) => {
        const b = e.target.closest('.cc-type');
        if (!b || b.dataset.type === S.typeId) return;
        S.typeId = b.dataset.type;
        S.bodyIdx = 0;
        S.verseId = getType(S.typeId).verse;
        refresh(true);
    });

    // ----- الطالب والجنس -----
    const studentSel = $('#cc-student');
    function fillStudents() {
        studentSel.innerHTML = `<option value="">${esc(t('cc_select_student'))}</option>`
            + students.map(st => `<option value="${esc(st.id)}">${esc(st.name)}</option>`).join('')
            + `<option value="other">${esc(t('cc_other_name'))}</option>`;
        studentSel.value = S.studentId;
    }
    const genderFromStudent = (st) => !!(st && (GIRL_AVATARS.includes(st.avatar) || st.gender === 'girl' || st.gender === 'female'));
    studentSel.addEventListener('change', () => {
        S.studentId = studentSel.value;
        const st = students.find(x => String(x.id) === String(S.studentId));
        if (st) S.female = genderFromStudent(st);
        refresh();
    });
    $('#cc-manual').addEventListener('input', (e) => { S.manualName = e.target.value; refresh(); });
    $('#cc-gender').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-g]');
        if (!b) return;
        S.female = b.dataset.g === 'f';
        refresh();
    });
    $('#cc-lang').addEventListener('click', (e) => {
        const b = e.target.closest('button[data-l]');
        if (!b || b.dataset.l === S.lang) return;
        S.lang = b.dataset.l;
        savePrefs();
        refresh(true);
    });

    // ----- التفاصيل (تتغير حسب النوع) -----
    const detailsEl = $('#cc-details');
    function renderDetails() {
        const type = getType(S.typeId);
        const ul = uiLang();
        const parts = [];
        if (type.fields.includes('surah')) {
            parts.push(`<div class="cc-field"><label for="cc-surah">${esc(t('cc_surah'))}</label><select id="cc-surah" data-v="surah">${(ul === 'en' ? SURAH_NAMES_EN : SURAH_NAMES_AR_BARE).map((n, i) => `<option value="${i + 1}">${i + 1}. ${esc(n)}</option>`).join('')}</select></div>`);
        }
        if (type.fields.includes('juz')) {
            parts.push(`<div class="cc-field"><label for="cc-juz">${esc(t('cc_juz'))}</label><select id="cc-juz" data-v="juz">${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">${esc(juzName(i + 1, ul))}</option>`).join('')}</select></div>`);
        }
        if (type.fields.includes('half')) {
            parts.push(`<div class="cc-field"><label for="cc-half">${esc(t('cc_half'))}</label><select id="cc-half" data-v="half"><option value="first">${esc(t('cc_half_first'))}</option><option value="second">${esc(t('cc_half_second'))}</option></select></div>`);
        }
        if (type.fields.includes('text')) {
            parts.push(`<div class="cc-field"><label for="cc-text">${esc(L(type.textLabel, ul))}</label><input id="cc-text" data-v="text" type="text" maxlength="70" placeholder="${esc(L(type.textPlaceholder, ul))}"></div>`);
        }
        if (type.fields.includes('monthAuto')) parts.push(`<div class="cc-field"><small>${esc(t('cc_month_auto'))}</small></div>`);
        if (!parts.length) parts.push(`<div class="cc-field"><small>${esc(t('cc_no_details'))}</small></div>`);
        detailsEl.innerHTML = parts.join('');
        detailsEl.querySelectorAll('[data-v]').forEach(el => { el.value = S.values[el.dataset.v] ?? ''; });
    }
    detailsEl.addEventListener('input', (e) => {
        const el = e.target.closest('[data-v]');
        if (!el) return;
        const k = el.dataset.v;
        S.values[k] = (k === 'surah' || k === 'juz') ? Number(el.value) : el.value;
        refresh();
    });

    // ----- الصيغ -----
    const variantsEl = $('#cc-variants');
    function renderVariants() {
        const type = getType(S.typeId);
        const spec = buildSpec();
        const list = type.bodies[S.lang] || type.bodies.ar;
        variantsEl.dir = S.lang === 'en' ? 'ltr' : 'rtl';
        variantsEl.innerHTML = list.map((_, i) =>
            `<button type="button" class="cc-variant${i === S.bodyIdx % list.length ? ' is-on' : ''}" data-i="${i}">${esc(stripTags(bodyHtml({ ...spec, bodyIdx: i })))}</button>`).join('');
    }
    variantsEl.addEventListener('click', (e) => {
        const b = e.target.closest('.cc-variant');
        if (!b) return;
        S.bodyIdx = Number(b.dataset.i);
        refresh();
    });
    $('#cc-next-variant').addEventListener('click', () => {
        const type = getType(S.typeId);
        S.bodyIdx = (S.bodyIdx + 1) % (type.bodies[S.lang] || type.bodies.ar).length;
        refresh();
    });
    const extraEl = $('#cc-extra');
    extraEl.addEventListener('input', () => { S.extra = extraEl.value; $('#cc-extra-count').textContent = `${extraEl.value.length}/${EXTRA_MAX}`; renderPreview(); });

    // ----- آية/حديث + بسملة + قالب + تاريخ -----
    const verseSel = $('#cc-verse');
    verseSel.innerHTML = VERSES.map(v => `<option value="${v.id}">${esc(v.id === 'none' ? t('cc_verse_none') : L(v.label, uiLang()) + ' — ' + L(v.ref, uiLang()))}</option>`).join('');
    verseSel.addEventListener('change', () => { S.verseId = verseSel.value; renderPreview(); });
    $('#cc-basmala').addEventListener('change', (e) => { S.basmala = e.target.checked; savePrefs(); renderPreview(); });

    const fontsEl = $('#cc-fonts');
    fontsEl.innerHTML = CERT_FONTS.map(f => `<button type="button" data-f="${f.id}" style="${f.css ? `font-family:'${f.css}',serif;` : ''}">${esc(f.id === '' ? t('cc_font_default') : f.ar)}</button>`).join('');
    function markFonts() {
        fontsEl.querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b.dataset.f === S.font));
        $('#cc-font-hint').hidden = S.lang !== 'en' ? true : false;
    }
    fontsEl.addEventListener('click', async (e) => {
        const b = e.target.closest('button[data-f]');
        if (!b) return;
        S.font = b.dataset.f;
        savePrefs();
        markFonts();
        renderPreview();
        await Promise.all([ensureFonts(), loadCertFont(S.font)]);
        if (overlay.isConnected) renderPreview();
    });

    const galleryEl = $('#cc-gallery');
    galleryEl.innerHTML = TEMPLATES.map(x => `<button type="button" class="cc-thumb" data-t="${x.id}" aria-label="${esc(tplLabel(x))}"><img src="${templateThumb(x.id)}" alt="" loading="lazy"><span>${esc(tplLabel(x))}</span></button>`).join('');
    function markGallery() { galleryEl.querySelectorAll('.cc-thumb').forEach(b => b.classList.toggle('is-on', b.dataset.t === S.templateId)); }
    galleryEl.addEventListener('click', (e) => {
        const b = e.target.closest('.cc-thumb');
        if (!b) return;
        S.templateId = b.dataset.t;
        savePrefs();
        refresh();
    });

    const dateEl = $('#cc-date');
    dateEl.addEventListener('input', () => {
        if (!dateEl.value) return;
        S.dateISO = dateEl.value;
        refresh();
    });

    // ----- مزامنة الواجهة مع الحالة -----
    function syncControls(full) {
        markTypes();
        const tpl = getTemplate(S.templateId);
        $('#cc-manual-wrap').hidden = !(S.studentId === 'other' || !students.length);
        $('#cc-gender').querySelectorAll('button').forEach(b => b.classList.toggle('is-on', (b.dataset.g === 'f') === S.female));
        $('#cc-lang').querySelectorAll('button').forEach(b => b.classList.toggle('is-on', b.dataset.l === S.lang));
        if (full) renderDetails();
        verseSel.value = S.verseId;
        const baked = !!(tpl.noBasmala || tpl.noTitle);
        $('#cc-basmala').checked = S.basmala && !tpl.noBasmala;
        $('#cc-basmala').disabled = !!tpl.noBasmala;
        $('#cc-baked-note').hidden = !baked;
        markGallery();
        markFonts();
        const d = formatDates(parseISO(S.dateISO), S.lang);
        $('#cc-date-hint').textContent = [d.hijri, d.greg].filter(Boolean).join(' — ');
        if (document.activeElement !== dateEl) dateEl.value = S.dateISO;
    }
    function refresh(full) {
        syncControls(full);
        renderVariants();
        renderPreview();
        showNote('');
    }

    // ----- الحفظ في السجل + التصدير -----
    const specKey = (spec) => JSON.stringify([spec.typeId, spec.name, spec.female, spec.lang, spec.what, spec.bodyIdx, spec.extra, spec.verseId, spec.basmala, spec.templateId, spec.dateISO, spec.font || '']);
    async function saveToHistory(spec) {
        const key = specKey(spec);
        if (key === lastSavedKey) return false;
        await addCertificate(spec);
        lastSavedKey = key;
        await loadHistory();
        return true;
    }
    function requireName() {
        if (currentName()) return true;
        showNote(t('cc_need_name'), true);
        ((S.studentId === 'other' || !students.length) ? $('#cc-manual') : studentSel).focus();
        return false;
    }
    function withBusy(btn, fn) {
        return async () => {
            if (btn.disabled || !requireName()) return;
            const original = btn.textContent;
            btn.disabled = true; btn.textContent = t('cc_busy');
            showNote('');
            try { await fn(buildSpec()); }
            catch (err) {
                if (err && err.name === 'AbortError') return;     // المعلم ألغى نافذة المشاركة
                console.error('تعذّر إنشاء الشهادة:', err);
                showNote(t('cc_fail'), true);
            } finally { btn.disabled = false; btn.textContent = original; }
        };
    }
    const fileBase = (spec) => `${spec.lang === 'en' ? 'certificate' : 'شهادة'}-${safeName(L(getType(spec.typeId).label, spec.lang))}-${safeName(spec.name)}`;

    $('#cc-png').addEventListener('click', withBusy($('#cc-png'), async (spec) => {
        downloadBlob(await toPngBlob(await renderCanvas(spec)), fileBase(spec) + '.png');
        await saveToHistory(spec);
        showNote(t('cc_saved_png'));
    }));
    $('#cc-pdf').addEventListener('click', withBusy($('#cc-pdf'), async (spec) => {
        downloadBlob(await canvasToPdfBlob(await renderCanvas(spec)), fileBase(spec) + '.pdf');
        await saveToHistory(spec);
        showNote(t('cc_saved_pdf'));
    }));
    $('#cc-wa').addEventListener('click', withBusy($('#cc-wa'), async (spec) => {
        const blob = await toPngBlob(await renderCanvas(spec));
        await saveToHistory(spec);
        // Web Share API مع ملف مرفَق: الطريقة الوحيدة لوصول الصورة جاهزة إلى واتساب (رابط wa.me يدعم نصاً فقط)
        const shared = await shareOrDownload(blob, fileBase(spec) + '.png', L(getType(spec.typeId).title, spec.lang), spec.name);
        if (!shared) showNote(t('cc_share_fallback'));
    }));
    $('#cc-keep').addEventListener('click', async () => {
        if (!requireName()) return;
        try { showNote((await saveToHistory(buildSpec())) ? t('cc_kept') : t('cc_already_kept')); }
        catch (err) { console.error(err); showNote(t('cc_keep_fail'), true); }
    });

    // ----- سجل الشهادات -----
    const histList = $('#cc-hist-list');
    const filterSel = $('#cc-filter');
    filterSel.innerHTML += TYPES.map(x => `<option value="${x.id}">${esc(L(x.label, uiLang()))}</option>`).join('');
    async function loadHistory() {
        try { history = await getAllCertificates(); } catch (e) { console.warn('تعذّر قراءة سجل الشهادات:', e); history = []; }
        $('#cc-count').textContent = history.length ? `(${history.length})` : '';
        renderHistory();
    }
    function renderHistory() {
        const q = $('#cc-search').value.trim();
        const f = filterSel.value;
        const rows = history.filter(r => (!f || r.typeId === f) && (!q || String(r.name || '').includes(q)));
        if (!rows.length) {
            histList.innerHTML = `<div class="cc-empty">${history.length ? esc(t('cc_no_match')) : t('cc_hist_empty')}</div>`;
            return;
        }
        histList.innerHTML = rows.map(r => {
            const type = getType(r.typeId);
            const d = formatDates(parseISO(r.dateISO), uiLang());
            return `<div class="cc-row" data-id="${r.id}">
                <img src="${templateThumb(getTemplate(r.templateId).id)}" alt="" loading="lazy">
                <div class="cc-row-main"><div class="cc-row-name">${esc(r.name)}</div>
                    <div class="cc-row-meta">${esc(L(type.title, uiLang()))}${r.what ? ' — ' + esc(r.what) : ''}<br>${esc(d.greg)}</div></div>
                <div class="cc-row-btns"><button type="button" data-act="open">${esc(t('cc_open_edit'))}</button><button type="button" class="cc-del" data-act="del" aria-label="${esc(t('cc_delete'))}">🗑️</button></div>
            </div>`;
        }).join('');
    }
    $('#cc-search').addEventListener('input', renderHistory);
    filterSel.addEventListener('change', renderHistory);
    histList.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-act]');
        const row = e.target.closest('.cc-row');
        if (!btn || !row) return;
        const rec = history.find(r => String(r.id) === row.dataset.id);
        if (!rec) return;
        if (btn.dataset.act === 'del') {
            if (!confirm(t('cc_confirm_delete'))) return;
            try { await deleteCertificate(rec.id); } catch (err) { console.error(err); }
            await loadHistory();
            return;
        }
        // فتح وتعديل: تحميل اللقطة كاملة في شاشة الإصدار
        const type = getType(rec.typeId);
        S.typeId = type.id;
        S.values = { surah: 1, juz: 1, half: 'first', text: '', ...(rec.values || {}) };
        S.bodyIdx = rec.bodyIdx || 0;
        S.extra = rec.extra || '';
        S.verseId = rec.verseId || type.verse;
        S.basmala = rec.basmala !== false;
        S.templateId = getTemplate(rec.templateId).id;
        S.font = getFont(rec.font) ? rec.font : '';
        S.dateISO = rec.dateISO || todayISO();
        S.female = !!rec.female;
        S.lang = rec.lang === 'en' ? 'en' : 'ar';      // الشهادات القديمة المحفوظة قبل دعم الإنجليزية عربية دائماً
        const known = students.find(x => String(x.id) === String(rec.studentId));
        S.studentId = known ? String(known.id) : 'other';
        S.manualName = known ? '' : (rec.name || '');
        extraEl.value = S.extra;
        $('#cc-extra-count').textContent = S.extra ? `${S.extra.length}/${EXTRA_MAX}` : '';
        studentSel.value = S.studentId;
        $('#cc-manual').value = S.manualName;
        lastSavedKey = specKey(buildSpec());
        switchTab('issue');
        refresh(true);
    });

    // ----- التقارير السابقة (الأرشيف التلقائي) -----
    const repList = $('#cc-rep-list');
    const repKindLabel = (k) => t('cc_rep_kind_' + k);
    async function loadReports() {
        try { reports = await listArchivedReports(); } catch (e) { console.warn('تعذّر قراءة أرشيف التقارير:', e); reports = []; }
        $('#cc-rep-count').textContent = reports.length ? `(${reports.length})` : '';
        renderReports();
    }
    function renderReports() {
        releaseUrls();
        const q = $('#cc-rep-search').value.trim();
        const f = $('#cc-rep-filter').value;
        const rows = reports.filter(r => (!f || r.kind === f) && (!q || String(r.name || '').includes(q)));
        if (!rows.length) {
            repList.innerHTML = `<div class="cc-empty">${reports.length ? esc(t('cc_no_match')) : t('cc_rep_empty')}</div>`;
            return;
        }
        repList.innerHTML = rows.map(r => {
            const dt = new Date(r.createdAt || Date.now());
            const when = formatDates(dt, uiLang()).greg;
            return `<div class="cc-row" data-id="${r.id}">
                <img class="is-report" alt="" data-thumb="${r.id}">
                <div class="cc-row-main"><div class="cc-row-name">${esc(r.name)}</div>
                    <div class="cc-row-meta"><span class="cc-badge">${esc(repKindLabel(r.kind))}</span>${esc(r.sub || '')}<br>${esc(when)}</div></div>
                <div class="cc-row-btns">
                    <button type="button" data-act="view">${esc(t('cc_rep_view'))}</button>
                    <button type="button" data-act="download">${esc(t('cc_rep_download'))}</button>
                    <button type="button" data-act="share">${esc(t('cc_rep_share'))}</button>
                    <button type="button" class="cc-del" data-act="del" aria-label="${esc(t('cc_delete'))}">🗑️</button>
                </div>
            </div>`;
        }).join('');
        // تحميل الصور المصغّرة تدريجياً (أول 24 فقط، والباقي عند العرض)
        rows.slice(0, 24).forEach(async (r) => {
            try {
                const blob = await getArchivedReportFile(r.id);
                const img = repList.querySelector(`img[data-thumb="${r.id}"]`);
                if (blob && img) { const url = URL.createObjectURL(blob); objectUrls.push(url); img.src = url; }
            } catch (e) { /* بلا صورة مصغّرة */ }
        });
    }
    $('#cc-rep-search').addEventListener('input', renderReports);
    $('#cc-rep-filter').addEventListener('change', renderReports);
    const reportFileName = (r) => `${safeName(repKindLabel(r.kind))}-${safeName(r.name)}.jpg`;
    function openViewer(rec, blob) {
        closeViewer();
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        viewerEl = document.createElement('div');
        viewerEl.className = 'cc-viewer';
        viewerEl.dir = overlay.dir;
        viewerEl.innerHTML = `
            <div class="cc-viewer-head"><b>${esc(repKindLabel(rec.kind))} — ${esc(rec.name)}</b><button type="button" class="cc-x" data-v="close" aria-label="${esc(t('cc_close'))}">✕</button></div>
            <div class="cc-viewer-body"><img src="${url}" alt=""></div>
            <div class="cc-viewer-foot"><span>${esc(t('cc_rep_saved_as_image'))}</span>
                <button type="button" class="cc-btn cc-btn-png" data-v="download">${esc(t('cc_rep_download'))}</button>
                <button type="button" class="cc-btn cc-btn-wa" data-v="share">${esc(t('cc_rep_share'))}</button></div>`;
        viewerEl.addEventListener('click', async (e) => {
            const b = e.target.closest('[data-v]');
            if (!b) return;
            if (b.dataset.v === 'close') closeViewer();
            else if (b.dataset.v === 'download') downloadBlob(blob, reportFileName(rec));
            else if (b.dataset.v === 'share') {
                try { if (!(await shareOrDownload(blob, reportFileName(rec), repKindLabel(rec.kind), rec.name))) showNote(t('cc_share_fallback')); }
                catch (err) { if (!err || err.name !== 'AbortError') console.error(err); }
            }
        });
        document.body.appendChild(viewerEl);
    }
    repList.addEventListener('click', async (e) => {
        const btn = e.target.closest('button[data-act]');
        const row = e.target.closest('.cc-row');
        if (!btn || !row) return;
        const rec = reports.find(r => String(r.id) === row.dataset.id);
        if (!rec) return;
        if (btn.dataset.act === 'del') {
            if (!confirm(t('cc_rep_confirm_delete'))) return;
            try { await deleteArchivedReport(rec.id); } catch (err) { console.error(err); }
            await loadReports();
            return;
        }
        let blob = null;
        try { blob = await getArchivedReportFile(rec.id); } catch (err) { console.error(err); }
        if (!blob) return;
        if (btn.dataset.act === 'view') openViewer(rec, blob);
        else if (btn.dataset.act === 'download') downloadBlob(blob, reportFileName(rec));
        else {
            try { if (!(await shareOrDownload(blob, reportFileName(rec), repKindLabel(rec.kind), rec.name))) showNote(t('cc_share_fallback')); }
            catch (err) { if (!err || err.name !== 'AbortError') console.error(err); }
        }
    });

    // ----- التبويبات -----
    function switchTab(tab) {
        closeViewer();
        overlay.querySelectorAll('.cc-tab').forEach(b => b.classList.toggle('is-on', b.dataset.tab === tab));
        overlay.querySelectorAll('.cc-pane').forEach(p => { p.hidden = p.dataset.pane !== tab; });
        $('#cc-actionbar').hidden = tab !== 'issue';
        showNote('');
        if (tab === 'issue') { scalePreview(); renderPreview(); }
        else if (tab === 'history') loadHistory();
        else loadReports();
    }
    overlay.querySelector('.cc-tabs').addEventListener('click', (e) => {
        const b = e.target.closest('.cc-tab');
        if (b) switchTab(b.dataset.tab);
    });

    // ----- الإقلاع -----
    try {
        if (AppState && AppState.studentManager) {
            students = (await AppState.studentManager.getAllStudents() || []).filter(s => s && s.name && !s.isHidden)
                .sort((a, b) => String(a.name).localeCompare(String(b.name), uiLang()));
        }
    } catch (e) { console.warn('تعذّر تحميل قائمة الطلاب:', e); }
    if (opts.studentId != null) {
        const st = students.find(x => String(x.id) === String(opts.studentId));
        if (st) { S.studentId = String(st.id); S.female = genderFromStudent(st); }
    }
    fillStudents();
    $('#cc-manual').value = S.manualName;
    refresh(true);
    loadHistory();
    loadReports();
    if (opts.tab === 'reports' || opts.tab === 'history') switchTab(opts.tab);
    // الجولة الإرشادية (تظهر مرة واحدة فقط، ثم لا تتكرر إلا بإعادة الجولات من بيانات المعلم)
    if (!opts.noTour) import('../components/guidedTour.js').then(m => m.maybeStartTour('certificates')).catch(() => {});
}
