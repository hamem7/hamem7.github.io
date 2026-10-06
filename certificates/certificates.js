// certificates/certificates.js
// ==========================================================
// 🏅 شاشة "الشهادات": المعلم يختار نوع الشهادة والطالب والصيغة الجاهزة والقالب، فتظهر المعاينة الحية، ثم يحفظ صورة أو PDF
// أو يشاركها واتساب. كل شهادة تُسجَّل في "السجل" كلقطة بيانات صغيرة (certificatesDB.js) ويُعاد فتحها وتعديلها في أي وقت.
//
// 🌟 العزل التقني: ملف مستقل (بادئة CSS/DOM: cc-)، لا يلمس reports/* ولا أي شاشة أخرى. القوالب خلفيات فارغة (templates.js)
// والنصوص تُكتب فوقها بخطوط عربية حادة، والتصدير بـ html2canvas (نفس المكتبة والنسخة المستخدمة في reports/report.js).
// نقطة الدخول: openCertificatesHub() من بطاقة الرئيسية (core/app.js) ولوحة "المزيد" (components/homeFast.js).
// ==========================================================
import { AppState } from '../core/app.js';
import { esc } from '../core/escape.js';
import { SURAH_NAMES_AR_BARE } from '../core/i18n.js';
import { TEMPLATES, templateImage, templateThumb, getTemplate } from './templates.js';
import { TYPES, getType, VERSES, getVerse, juzName } from './texts.js';
import { addCertificate, getAllCertificates, deleteCertificate } from './certificatesDB.js';

const PAGE_W = 1000, PAGE_H = 707;               // مقاس التصميم الداخلي (نسبة A4 أفقي)، ويُصدَّر بدقة ×2 = 2000×1414
const GIRL_AVATARS = ['👧🏻', '👩🏻', '🧕🏻'];     // نفس قائمة student/student.js لتحديد الجنس تلقائياً من الصورة الرمزية
const PREFS_KEY = 'darham_cert_prefs';
const EXTRA_MAX = 140;
const BASMALA = 'بسم الله الرحمن الرحيم';

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
        link.href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Reem+Kufi:wght@500;700&family=Aref+Ruqaa:wght@400;700&display=swap';
        document.head.appendChild(link);
    }
    const load = Promise.all(['700 40px "Reem Kufi"', '700 40px "Aref Ruqaa"', '400 20px "Amiri"', '700 20px "Amiri"']
        .map(f => (document.fonts ? document.fonts.load(f, 'بسم الله الرحمن') : Promise.resolve()).catch(() => {})));
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
    .cc-overlay { position: fixed; inset: 0; z-index: 10040; background: #f4f1e6; display: flex; flex-direction: column; font-family: inherit; direction: rtl; color: #10241c; }
    .cc-head { display: flex; align-items: center; gap: 12px; padding: 10px 16px; background: linear-gradient(135deg, #06352a, #0d5c46); color: #fdf6e3; flex: none; flex-wrap: wrap; }
    .cc-head h2 { margin: 0; font-size: 1.2rem; font-weight: 700; flex: none; }
    .cc-tabs { display: flex; gap: 6px; margin-inline-start: auto; }
    .cc-tab { border: 1px solid rgba(253,246,227,.35); background: transparent; color: #fdf6e3; border-radius: 999px; padding: 7px 16px; font: inherit; font-weight: 700; cursor: pointer; font-size: .92rem; }
    .cc-tab.is-on { background: #fdf6e3; color: #06352a; border-color: #fdf6e3; }
    .cc-x { border: none; background: rgba(253,246,227,.16); color: #fdf6e3; width: 36px; height: 36px; border-radius: 50%; font-size: 1.1rem; cursor: pointer; flex: none; }
    .cc-pane { flex: 1; overflow-y: auto; padding: 16px; }
    .cc-pane[hidden] { display: none; }
    .cc-layout { max-width: 1240px; margin: 0 auto; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr); gap: 18px; align-items: start; }
    .cc-preview { position: sticky; top: 0; }
    .cc-stage { position: relative; width: 100%; aspect-ratio: ${PAGE_W} / ${PAGE_H}; overflow: hidden; border-radius: 10px; background: #fff; box-shadow: 0 10px 30px rgba(6,35,28,.25); }
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
    .cc-field small { color: #6b7a73; font-size: .76rem; }
    .cc-seg { display: flex; gap: 6px; }
    .cc-seg button { flex: 1; border: 1.5px solid #d9d2b6; background: #fff; border-radius: 10px; padding: 8px; font: inherit; cursor: pointer; font-weight: 600; }
    .cc-seg button.is-on { border-color: #0d5c46; background: #e8f3ee; color: #0d5c46; }
    .cc-variants { display: flex; flex-direction: column; gap: 8px; }
    .cc-variant { border: 1.5px solid #e3dcc2; background: #fffdf6; border-radius: 12px; padding: 9px 12px; font: inherit; cursor: pointer; text-align: start; line-height: 1.7; font-size: .88rem; color: #10241c; }
    .cc-variant.is-on { border-color: #0d5c46; background: #e8f3ee; box-shadow: 0 0 0 2px rgba(13,92,70,.18); }
    .cc-link { background: none; border: none; color: #0d5c46; font: inherit; font-weight: 700; cursor: pointer; padding: 4px 0; align-self: flex-start; }
    .cc-gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(112px, 1fr)); gap: 8px; }
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
    .cc-hist-tools { display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
    .cc-hist-tools input, .cc-hist-tools select { font: inherit; padding: 9px 12px; border: 1.5px solid #d9d2b6; border-radius: 10px; background: #fff; flex: 1 1 180px; min-width: 0; }
    .cc-row { display: flex; align-items: center; gap: 12px; background: #fff; border: 1px solid #e3dcc2; border-radius: 14px; padding: 10px; margin-bottom: 8px; }
    .cc-row img { width: 92px; aspect-ratio: ${PAGE_W} / ${PAGE_H}; object-fit: cover; border-radius: 6px; flex: none; box-shadow: 0 2px 6px rgba(0,0,0,.18); }
    .cc-row-main { flex: 1; min-width: 0; }
    .cc-row-name { font-weight: 700; color: #0d5c46; word-break: break-word; }
    .cc-row-meta { font-size: .82rem; color: #4a6058; line-height: 1.6; }
    .cc-row-btns { display: flex; gap: 6px; flex: none; }
    .cc-row-btns button { border: 1.5px solid #0d5c46; background: #fff; color: #0d5c46; border-radius: 10px; padding: 7px 12px; font: inherit; font-weight: 700; cursor: pointer; font-size: .85rem; }
    .cc-row-btns button.cc-del { border-color: #c9a7a0; color: #a15230; }
    .cc-empty { text-align: center; color: #4a6058; padding: 40px 10px; line-height: 1.9; }

    /* ===== الشهادة نفسها: مقاس تصميم ثابت ${PAGE_W}×${PAGE_H}px ويُكبَّر/يُصغَّر بالمعاينة فقط ===== */
    .cc-page { width: ${PAGE_W}px; height: ${PAGE_H}px; position: relative; overflow: hidden; background: #fff; direction: rtl; --s: 1; font-family: 'Amiri', 'Cairo', serif; color: var(--ink); }
    .cc-page * { box-sizing: border-box; }
    .cc-f-kufi { --hf: 'Reem Kufi', 'Cairo', 'Amiri', sans-serif; }
    .cc-f-ruqaa { --hf: 'Aref Ruqaa', 'Amiri', serif; }
    .cc-f-amiri { --hf: 'Amiri', serif; }
    .cc-bg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
    .cc-box { position: absolute; }
    .cc-inner { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; gap: calc(4px * var(--s)); }
    .cc-basmala { font-family: 'Aref Ruqaa', 'Amiri', serif; font-size: calc(25px * var(--s)); color: var(--title); line-height: 1.3; }
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
    .cc-verse small { display: block; font-size: calc(13px * var(--s)); opacity: .75; }
    .cc-foot { width: 100%; display: grid; grid-template-columns: 1fr auto 1fr; align-items: end; gap: calc(10px * var(--s)); }
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
function formatDates(date) {
    let hijri = '', greg = '';
    try { hijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(date); } catch (e) { /* لا يدعم أم القرى */ }
    try { greg = new Intl.DateTimeFormat('ar-EG-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(date); } catch (e) { greg = date.toLocaleDateString(); }
    return { hijri, greg };
}
function monthLabel(date) {
    try { return 'شهر ' + new Intl.DateTimeFormat('ar-EG-u-ca-gregory', { month: 'long', year: 'numeric' }).format(date); } catch (e) { return 'هذا الشهر'; }
}
function certNumber(spec) {
    const seed = [spec.name, spec.typeId, spec.dateISO, spec.what].join('|');
    let h = 5381;
    for (let i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
    return `HAM-${parseISO(spec.dateISO).getFullYear()}-${String(h % 1000000).padStart(6, '0')}`;
}
const stripTags = (html) => String(html).replace(/<[^>]+>/g, '');

function buildWhat(type, v, dateISO) {
    switch (type.id) {
        case 'surah': return 'سورة ' + (SURAH_NAMES_AR_BARE[(v.surah || 1) - 1] || '');
        case 'juz': return juzName(v.juz || 1);
        case 'half': return (v.half === 'second' ? 'النصف الثاني' : 'النصف الأول') + ' من ' + juzName(v.juz || 1);
        case 'month': return monthLabel(parseISO(dateISO));
        case 'khatm': return '';
        default: return String(v.text || '').trim() || type.whatDefault || '';
    }
}

// spec = كل ما يلزم لرسم الشهادة (وهو نفسه ما يُحفظ في السجل)
function bodyHtml(spec) {
    const type = getType(spec.typeId);
    const s = { name: esc(spec.name || 'اسم الطالب'), f: !!spec.female, what: esc(spec.what) };
    const fn = type.bodies[spec.bodyIdx % type.bodies.length] || type.bodies[0];
    return fn(s);
}

function getTeacher() {
    const tch = (AppState && AppState.currentTeacher) || {};
    return { name: tch.name || (AppState && AppState.teacherName) || '', stamp: tch.stamp || null };
}

function cssVars(tpl) {
    return `--ink:${tpl.ink};--title:${tpl.title};--name:${tpl.name};--acc:${tpl.accent};`;
}
function boxHtml(spec, teacher) {
    const tpl = getTemplate(spec.templateId);
    const type = getType(spec.typeId);
    const verse = getVerse(spec.verseId);
    const d = formatDates(parseISO(spec.dateISO));
    const b = tpl.box;
    const extra = String(spec.extra || '').trim();
    return `<div class="cc-box" style="left:${b.x}%;top:${b.y}%;width:${b.w}%;height:${b.h}%;"><div class="cc-inner">
        ${spec.basmala ? `<div class="cc-basmala">${BASMALA}</div>` : ''}
        <div class="cc-title">${esc(type.title)}</div>
        <div class="cc-rule"><i></i><b>✦</b><i></i></div>
        <div class="cc-name">${esc(spec.name || 'اسم الطالب')}</div>
        <div class="cc-body">
            <div class="cc-text">${bodyHtml(spec)}</div>
            ${extra ? `<div class="cc-extra">${esc(extra)}</div>` : ''}
        </div>
        ${verse.text ? `<div class="cc-verse">${verse.text}<small>${esc(verse.ref)}</small></div>` : ''}
        <div class="cc-foot">
            <div class="cc-sig"><div class="cc-sigline"></div>المعلم<b>${esc(teacher.name)}</b></div>
            <div class="cc-stamp">${teacher.stamp ? `<img src="${esc(teacher.stamp)}" alt="">` : ''}</div>
            <div class="cc-sig"><div class="cc-sigline"></div>التاريخ<b>${d.hijri ? esc(d.hijri) + '<br>' : ''}${esc(d.greg)}</b></div>
        </div>
        <div class="cc-no">رقم الشهادة: <bdi>${esc(certNumber(spec))}</bdi></div>
    </div></div>`;
}
function pageHtml(spec, teacher) {
    const tpl = getTemplate(spec.templateId);
    return `<div class="cc-page cc-f-${tpl.font}" data-tpl="${tpl.id}" style="${cssVars(tpl)}">
        <img class="cc-bg" src="${templateImage(tpl.id)}" alt="">${boxHtml(spec, teacher)}</div>`;
}

// تصغير الخط تدريجياً حتى يتّسع المحتوى داخل منطقة الكتابة الآمنة للقالب
function fitPage(page) {
    const inner = page.querySelector('.cc-inner');
    if (!inner) return;
    let s = 1;
    page.style.setProperty('--s', '1');
    for (let i = 0; i < 16 && s > 0.5 && inner.scrollHeight > inner.clientHeight + 1; i++) {
        s = Math.round((s - 0.04) * 100) / 100;
        page.style.setProperty('--s', String(s));
    }
}

// ------------------------------------------------------------
// التصدير: صورة / PDF / مشاركة
// ------------------------------------------------------------
async function renderCanvas(spec) {
    await Promise.all([ensureHtml2Canvas(), ensureFonts()]);
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
const safeName = (s) => String(s).replace(/[\\/:*?"<>|]/g, '_').trim() || 'شهادة';

// ------------------------------------------------------------
// الشاشة الرئيسية للميزة
// ------------------------------------------------------------
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
        values: { surah: 1, juz: 1, half: 'first', text: '' },
        bodyIdx: 0,
        extra: '',
        verseId: firstType.verse,
        basmala: prefs.basmala !== false,
        templateId: TEMPLATES.some(t => t.id === prefs.templateId) ? prefs.templateId : TEMPLATES[0].id,
        dateISO: todayISO()
    };
    let students = [];
    let lastSavedKey = '';
    let history = [];

    const currentName = () => {
        if (S.studentId && S.studentId !== 'other') { const st = students.find(x => String(x.id) === String(S.studentId)); if (st) return st.name; }
        return S.manualName.trim();
    };
    const buildSpec = () => {
        const type = getType(S.typeId);
        const name = currentName();
        return {
            typeId: S.typeId, name, female: S.female, what: buildWhat(type, S.values, S.dateISO),
            values: { ...S.values }, bodyIdx: S.bodyIdx, extra: S.extra, verseId: S.verseId, basmala: S.basmala,
            templateId: S.templateId, dateISO: S.dateISO, studentId: S.studentId, manualName: S.manualName
        };
    };
    const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify({ templateId: S.templateId, basmala: S.basmala })); } catch (e) { /* تجاهل */ } };

    // ----- الهيكل -----
    const overlay = document.createElement('div');
    overlay.className = 'cc-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'الشهادات');
    overlay.innerHTML = `
        <header class="cc-head">
            <h2>🏅 الشهادات</h2>
            <nav class="cc-tabs">
                <button type="button" class="cc-tab is-on" data-tab="issue">إصدار شهادة</button>
                <button type="button" class="cc-tab" data-tab="history">السجل <span id="cc-count"></span></button>
            </nav>
            <button type="button" class="cc-x" id="cc-close" aria-label="إغلاق">✕</button>
        </header>
        <section class="cc-pane" data-pane="issue">
            <div class="cc-layout">
                <aside class="cc-preview"><div class="cc-stage" id="cc-stage"></div></aside>
                <div class="cc-controls">
                    <div class="cc-step"><h3><span>1</span>نوع الشهادة</h3><div class="cc-types" id="cc-types"></div></div>
                    <div class="cc-step"><h3><span>2</span>الطالب</h3>
                        <div class="cc-field"><label for="cc-student">اختر من طلابك</label><select id="cc-student"></select></div>
                        <div class="cc-field" id="cc-manual-wrap" hidden><label for="cc-manual">اسم الطالب</label><input id="cc-manual" type="text" maxlength="60" autocomplete="off"></div>
                        <div class="cc-field"><label>الجنس (لصياغة الجمل)</label><div class="cc-seg" id="cc-gender"><button type="button" data-g="m">👦 طالب</button><button type="button" data-g="f">👧 طالبة</button></div></div>
                    </div>
                    <div class="cc-step" id="cc-details-step"><h3><span>3</span>التفاصيل</h3><div id="cc-details"></div></div>
                    <div class="cc-step"><h3><span>4</span>الصيغة</h3>
                        <div class="cc-variants" id="cc-variants"></div>
                        <button type="button" class="cc-link" id="cc-next-variant">🔀 صيغة أخرى</button>
                        <div class="cc-field"><label for="cc-extra">سطر خاص منك (اختياري)</label><textarea id="cc-extra" rows="2" maxlength="${EXTRA_MAX}" placeholder="مثال: ما شاء الله، استمر على هذا النهج"></textarea><small id="cc-extra-count"></small></div>
                    </div>
                    <div class="cc-step"><h3><span>5</span>آية أو حديث</h3>
                        <div class="cc-field"><select id="cc-verse"></select></div>
                        <label class="cc-check"><input type="checkbox" id="cc-basmala"> إظهار البسملة في أعلى الشهادة</label>
                    </div>
                    <div class="cc-step"><h3><span>6</span>القالب</h3><div class="cc-gallery" id="cc-gallery"></div></div>
                    <div class="cc-step"><h3><span>7</span>التاريخ</h3>
                        <div class="cc-field"><input id="cc-date" type="date"><small id="cc-date-hint"></small></div>
                    </div>
                </div>
            </div>
        </section>
        <section class="cc-pane" data-pane="history" hidden>
            <div class="cc-hist">
                <div class="cc-hist-tools">
                    <input id="cc-search" type="search" placeholder="ابحث باسم الطالب" autocomplete="off">
                    <select id="cc-filter"><option value="">كل الأنواع</option></select>
                </div>
                <div id="cc-hist-list"></div>
            </div>
        </section>
        <div class="cc-note" id="cc-note" role="status"></div>
        <div class="cc-actionbar" id="cc-actionbar">
            <button type="button" class="cc-btn cc-btn-png" id="cc-png">🖼️ حفظ كصورة</button>
            <button type="button" class="cc-btn cc-btn-pdf" id="cc-pdf">📄 حفظ PDF</button>
            <button type="button" class="cc-btn cc-btn-wa" id="cc-wa">📲 مشاركة واتساب</button>
            <button type="button" class="cc-btn cc-btn-keep" id="cc-keep">💾 حفظ في السجل</button>
        </div>`;
    document.body.appendChild(overlay);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const $ = (sel) => overlay.querySelector(sel);
    const stage = $('#cc-stage');
    const noteEl = $('#cc-note');
    const showNote = (msg, isErr) => { noteEl.textContent = msg || ''; noteEl.classList.toggle('is-err', !!isErr); };

    function close() {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', scalePreview);
        if (ro) ro.disconnect();
        document.body.style.overflow = prevOverflow;
        overlay.remove();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    $('#cc-close').addEventListener('click', close);

    // ----- المعاينة الحية -----
    let ro = null;
    function scalePreview() {
        const page = stage.querySelector('.cc-page');
        if (!page) return;
        page.style.transform = `scale(${stage.clientWidth / PAGE_W})`;
    }
    function renderPreview() {
        const spec = buildSpec();
        const teacher = getTeacher();
        let page = stage.querySelector('.cc-page');
        if (!page || page.dataset.tpl !== spec.templateId) {
            stage.innerHTML = pageHtml(spec, teacher);
            page = stage.querySelector('.cc-page');
        } else {
            const old = page.querySelector('.cc-box');
            const tmp = document.createElement('div');
            tmp.innerHTML = boxHtml(spec, teacher);
            old.replaceWith(tmp.firstElementChild);
        }
        scalePreview();
        fitPage(page);
    }
    if (window.ResizeObserver) { ro = new ResizeObserver(scalePreview); ro.observe(stage); }
    window.addEventListener('resize', scalePreview, { passive: true });
    ensureFonts().then(() => { if (overlay.isConnected) renderPreview(); });

    // ----- الأنواع -----
    const typesEl = $('#cc-types');
    typesEl.innerHTML = TYPES.map(t => `<button type="button" class="cc-type" data-type="${t.id}"><span aria-hidden="true">${t.icon}</span>${esc(t.label)}</button>`).join('');
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
        studentSel.innerHTML = '<option value="">— اختر طالباً —</option>'
            + students.map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('')
            + '<option value="other">✏️ كتابة اسم آخر</option>';
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

    // ----- التفاصيل (تتغير حسب النوع) -----
    const detailsEl = $('#cc-details');
    function renderDetails() {
        const type = getType(S.typeId);
        const parts = [];
        if (type.fields.includes('surah')) {
            parts.push(`<div class="cc-field"><label for="cc-surah">السورة</label><select id="cc-surah" data-v="surah">${SURAH_NAMES_AR_BARE.map((n, i) => `<option value="${i + 1}">${i + 1}. ${esc(n)}</option>`).join('')}</select></div>`);
        }
        if (type.fields.includes('juz')) {
            parts.push(`<div class="cc-field"><label for="cc-juz">الجزء</label><select id="cc-juz" data-v="juz">${Array.from({ length: 30 }, (_, i) => `<option value="${i + 1}">${esc(juzName(i + 1))}</option>`).join('')}</select></div>`);
        }
        if (type.fields.includes('half')) {
            parts.push(`<div class="cc-field"><label for="cc-half">أي نصف؟</label><select id="cc-half" data-v="half"><option value="first">النصف الأول من الجزء</option><option value="second">النصف الثاني من الجزء</option></select></div>`);
        }
        if (type.fields.includes('text')) {
            parts.push(`<div class="cc-field"><label for="cc-text">${esc(type.textLabel || 'تفاصيل')}</label><input id="cc-text" data-v="text" type="text" maxlength="70" placeholder="${esc(type.textPlaceholder || '')}"></div>`);
        }
        if (type.fields.includes('monthAuto')) {
            parts.push('<div class="cc-field"><small>يُكتب الشهر تلقائياً من تاريخ الشهادة (الخطوة 7).</small></div>');
        }
        if (!parts.length) parts.push('<div class="cc-field"><small>لا تحتاج هذه الشهادة إلى تفاصيل إضافية.</small></div>');
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
        variantsEl.innerHTML = type.bodies.map((_, i) =>
            `<button type="button" class="cc-variant${i === S.bodyIdx % type.bodies.length ? ' is-on' : ''}" data-i="${i}">${esc(stripTags(bodyHtml({ ...spec, bodyIdx: i })))}</button>`).join('');
    }
    variantsEl.addEventListener('click', (e) => {
        const b = e.target.closest('.cc-variant');
        if (!b) return;
        S.bodyIdx = Number(b.dataset.i);
        refresh();
    });
    $('#cc-next-variant').addEventListener('click', () => { S.bodyIdx = (S.bodyIdx + 1) % getType(S.typeId).bodies.length; refresh(); });
    const extraEl = $('#cc-extra');
    extraEl.addEventListener('input', () => { S.extra = extraEl.value; $('#cc-extra-count').textContent = `${extraEl.value.length}/${EXTRA_MAX}`; renderPreview(); });

    // ----- آية/حديث + بسملة + قالب + تاريخ -----
    const verseSel = $('#cc-verse');
    verseSel.innerHTML = VERSES.map(v => `<option value="${v.id}">${esc(v.id === 'none' ? 'بدون' : v.label + ' — ' + v.ref)}</option>`).join('');
    verseSel.addEventListener('change', () => { S.verseId = verseSel.value; renderPreview(); });
    $('#cc-basmala').addEventListener('change', (e) => { S.basmala = e.target.checked; savePrefs(); renderPreview(); });

    const galleryEl = $('#cc-gallery');
    galleryEl.innerHTML = TEMPLATES.map(t => `<button type="button" class="cc-thumb" data-t="${t.id}" aria-label="${esc(t.label)}"><img src="${templateThumb(t.id)}" alt="" loading="lazy"><span>${esc(t.label)}</span></button>`).join('');
    function markGallery() { galleryEl.querySelectorAll('.cc-thumb').forEach(b => b.classList.toggle('is-on', b.dataset.t === S.templateId)); }
    galleryEl.addEventListener('click', (e) => {
        const b = e.target.closest('.cc-thumb');
        if (!b) return;
        S.templateId = b.dataset.t;
        savePrefs();
        markGallery();
        renderPreview();
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
        $('#cc-manual-wrap').hidden = !(S.studentId === 'other' || !students.length);
        $('#cc-gender').querySelectorAll('button').forEach(b => b.classList.toggle('is-on', (b.dataset.g === 'f') === S.female));
        if (full) renderDetails();
        verseSel.value = S.verseId;
        $('#cc-basmala').checked = S.basmala;
        markGallery();
        const d = formatDates(parseISO(S.dateISO));
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
    const specKey = (spec) => JSON.stringify([spec.typeId, spec.name, spec.female, spec.what, spec.bodyIdx, spec.extra, spec.verseId, spec.basmala, spec.templateId, spec.dateISO]);
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
        showNote('اكتب اسم الطالب أولاً (الخطوة 2).', true);
        const target = (S.studentId === 'other' || !students.length) ? $('#cc-manual') : studentSel;
        target.focus();
        return false;
    }
    function withBusy(btn, fn) {
        return async () => {
            if (btn.disabled || !requireName()) return;
            const original = btn.textContent;
            btn.disabled = true; btn.textContent = '⏳ جارٍ التجهيز...';
            showNote('');
            try { await fn(buildSpec()); }
            catch (err) {
                if (err && err.name === 'AbortError') return;     // المعلم ألغى نافذة المشاركة
                console.error('تعذّر إنشاء الشهادة:', err);
                showNote('تعذّر إنشاء الشهادة. تأكد من اتصال الإنترنت (لتحميل الخطوط والمكتبات) ثم أعد المحاولة.', true);
            } finally { btn.disabled = false; btn.textContent = original; }
        };
    }
    const fileBase = (spec) => `شهادة-${safeName(getType(spec.typeId).label)}-${safeName(spec.name)}`;

    $('#cc-png').addEventListener('click', withBusy($('#cc-png'), async (spec) => {
        const blob = await toPngBlob(await renderCanvas(spec));
        downloadBlob(blob, fileBase(spec) + '.png');
        await saveToHistory(spec);
        showNote('تم حفظ الصورة وإضافتها إلى السجل ✅');
    }));
    $('#cc-pdf').addEventListener('click', withBusy($('#cc-pdf'), async (spec) => {
        const blob = await canvasToPdfBlob(await renderCanvas(spec));
        downloadBlob(blob, fileBase(spec) + '.pdf');
        await saveToHistory(spec);
        showNote('تم حفظ ملف PDF (A4) وإضافته إلى السجل ✅');
    }));
    $('#cc-wa').addEventListener('click', withBusy($('#cc-wa'), async (spec) => {
        const blob = await toPngBlob(await renderCanvas(spec));
        const file = new File([blob], fileBase(spec) + '.png', { type: 'image/png' });
        await saveToHistory(spec);
        // Web Share API مع ملف مرفَق: الطريقة الوحيدة لوصول الصورة جاهزة إلى واتساب (رابط wa.me يدعم نصاً فقط)
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: getType(spec.typeId).title, text: spec.name });
        } else {
            downloadBlob(blob, file.name);
            showNote('نزّلنا الصورة على جهازك: افتح واتساب وأرفقها يدوياً (المتصفح لا يدعم المشاركة المباشرة).');
        }
    }));
    $('#cc-keep').addEventListener('click', async () => {
        if (!requireName()) return;
        try { showNote((await saveToHistory(buildSpec())) ? 'تمت إضافتها إلى السجل ✅' : 'هذه الشهادة محفوظة في السجل بالفعل.'); }
        catch (err) { console.error(err); showNote('تعذّر الحفظ في السجل.', true); }
    });

    // ----- السجل -----
    const histList = $('#cc-hist-list');
    const filterSel = $('#cc-filter');
    filterSel.innerHTML += TYPES.map(t => `<option value="${t.id}">${esc(t.label)}</option>`).join('');
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
            histList.innerHTML = `<div class="cc-empty">${history.length ? 'لا نتائج مطابقة.' : 'لا توجد شهادات صادرة بعد.<br>كل شهادة تحفظها أو تشاركها تظهر هنا، ويمكنك إعادة فتحها وتعديلها في أي وقت.'}</div>`;
            return;
        }
        histList.innerHTML = rows.map(r => {
            const type = getType(r.typeId);
            const d = formatDates(parseISO(r.dateISO));
            return `<div class="cc-row" data-id="${r.id}">
                <img src="${templateThumb(getTemplate(r.templateId).id)}" alt="" loading="lazy">
                <div class="cc-row-main"><div class="cc-row-name">${esc(r.name)}</div>
                    <div class="cc-row-meta">${esc(type.title)}${r.what ? ' — ' + esc(r.what) : ''}<br>${esc(d.greg)}</div></div>
                <div class="cc-row-btns"><button type="button" data-act="open">فتح وتعديل</button><button type="button" class="cc-del" data-act="del" aria-label="حذف">🗑️</button></div>
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
            if (!confirm('حذف هذه الشهادة من السجل؟')) return;
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
        S.dateISO = rec.dateISO || todayISO();
        S.female = !!rec.female;
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

    // ----- التبويبات -----
    function switchTab(tab) {
        overlay.querySelectorAll('.cc-tab').forEach(b => b.classList.toggle('is-on', b.dataset.tab === tab));
        overlay.querySelectorAll('.cc-pane').forEach(p => { p.hidden = p.dataset.pane !== tab; });
        $('#cc-actionbar').hidden = tab !== 'issue';
        showNote('');
        if (tab === 'issue') { scalePreview(); renderPreview(); } else loadHistory();
    }
    overlay.querySelector('.cc-tabs').addEventListener('click', (e) => {
        const b = e.target.closest('.cc-tab');
        if (b) switchTab(b.dataset.tab);
    });

    // ----- الإقلاع -----
    try {
        if (AppState && AppState.studentManager) {
            students = (await AppState.studentManager.getAllStudents() || []).filter(s => s && s.name && !s.isHidden)
                .sort((a, b) => String(a.name).localeCompare(String(b.name), 'ar'));
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
}
