// =============================================================================
// reports/dual-test-report.js
// 🌟 [جديد بالكامل] شاشة "تقرير مواجهة الاختبارات الثنائية" — بناءً على طلب مباشر من
// المعلم: تقرير "صادق بجد" (بنفس فلسفة reports/report.js تماماً — راجع تعليقها "كل الأسئلة
// التي وردت في هذا الاختبار كما جرت بالفعل، دون حذف") يعرض كل سؤال أجاب عليه كل طالب في كل
// جولة، مع درجته، أخطاءه، هل استُخدمت له مساعدة، وهل كان سؤال استبدال — بلا أي تلخيص أو
// حذف — قابل للتنزيل صورة عالية الجودة أو ملف PDF لإرسالهما لولي الأمر.
//
// راجع مستند المشروع "تصميم-تقرير-الاختبارات-الثنائية-المقترح.md" لقرار التصميم (بطاقة
// "نتيجة مواجهة" بترويسة زمردية VS، بدل تكرار قالب "شهادة الإتقان الفردية" لـ report.js).
//
// 🌟 مصدر البيانات: match.rounds[].questionsLog (مبني فعلاً في dualtests/dual-test-play.js
// عند "✅ اعتماد الإجابة" لكل سؤال) + test.rounds[].mainQuestions/swapQuestions (بنك الأسئلة
// الأصلي) لاسترجاع نص "من/إلى" الفعلي لكل سؤال مُجاب. لا حاجة لأي تعديل على قاعدة البيانات —
// كل البيانات اللازمة محفوظة فعلاً بالكامل.
//
// 🌟 افتراض صريح غير محسوم: التقرير لا يعرض الأسئلة التي بقيت "متاحة" على اللوحة بلا إجابة
// عند إنهاء الجولة يدوياً قبل اكتمالها (زر "🏁 إنهاء الجولة") — لأنها لم "تجرِ بالفعل"، فعرضها
// كسؤال في التقرير سيكون غير صادق. كذلك، عند استخدام "🔄 تبديل"، لا نعرف رقم السؤال الأصلي
// الذي تُرك بلا إجابة (لم يُحفَظ في البيانات — فقط أن تبديلاً حدث ورمز البديل المُستخدَم)،
// فنكتفي بعرض ما حدث فعلياً (رمز البديل ودرجته)، لا بمحاولة تخمين ما تُرك.
//
// 🌟 بنفس فلسفة العزل المتّبعة فعلياً بين report.js وmonthly-report.js: لا يستورد هذا الملف
// أي دالة منطق واجهة من أي منهما (حتى لو متطابقة تقريباً، مثل التصدير PNG/PDF أو هوية
// المعلم) — بل يكرّرها محلياً هنا، حتى يبقى كل ملف تقرير قابلاً للتعديل بمعزل تام عن الآخرين
// دون خطر كسره. الاستيراد الوحيد المشترك هو BADGE_CATALOG من dualTestEngine.js (مصدر
// الحقيقة الوحيد لتعريف الأوسمة، لا معنى لتكراره).
// =============================================================================

import { AppState, applyLanguage, loadSplashScreen, t } from '../core/app.js';
import { DUAL_TEST_REPORT_STYLES } from './dual-test-report.styles.js';
import { BADGE_CATALOG } from '../engine/dualTestEngine.js';

let activeMatch = null;  // سجل المواجهة المكتملة (dual_matches) — يُمرَّر عند فتح التقرير
let activeTest = null;   // الاختبار المحفوظ (بنك الأسئلة) المرتبط بهذه المواجهة
let reportData = null;   // بيانات التقرير المبنية فعلياً بعد المعالجة

const ROUND_TITLE_KEYS = ['dts_round1_title', 'dts_round2_title', 'dts_round3_title'];

// -----------------------------------------------------------------------------
// 0) القالب الكامل — مضمَّن هنا كنص مباشرة (نفس حل report.js/monthly-report.js بالحرف
// بدل تحميله عبر fetch من ملف HTML منفصل، تفادياً لمشكلة "التقرير المبتور" التاريخية
// الموثَّقة في تعليق report.js أعلى REPORT_TEMPLATE هناك).
// -----------------------------------------------------------------------------
const DUAL_TEST_REPORT_TEMPLATE = `
<style>${DUAL_TEST_REPORT_STYLES}</style>

<div id="dtr-screen">

  <div class="dtr-toolbar">
    <div class="dtr-tb-grp">
      <span class="dtr-tb-label" data-i18n="dtr_teacher_data_label">بيانات المعلم</span>
      <input type="text" id="dtr-teacher-name-input" class="dtr-teacher-name-input" data-i18n-placeholder="dtr_teacher_name_placeholder" placeholder="اسم المعلم">
      <button type="button" class="dtr-rbtn ghost" id="dtr-teacher-sig-btn">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        <span data-i18n="dtr_upload_signature_btn">رفع توقيع</span>
      </button>
      <input type="file" id="dtr-teacher-sig-input" accept="image/*" style="display:none;">
    </div>
    <div class="dtr-tb-grp">
      <span class="dtr-tb-label" data-i18n="dtr_export_label">تصدير</span>
      <button type="button" class="dtr-rbtn primary" id="dtr-btn-png">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg>
        <span data-i18n="dtr_png_btn">صورة عالية الجودة</span>
      </button>
      <button type="button" class="dtr-rbtn" id="dtr-btn-pdf">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>
        <span data-i18n="dtr_pdf_btn">ملف PDF</span>
      </button>
    </div>
    <div class="dtr-tb-grp">
      <button type="button" class="dtr-rbtn ghost" id="dtr-btn-home">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7"/><path d="M9 22V12h6v10"/></svg>
        <span data-i18n="dtr_home_btn">العودة للرئيسية</span>
      </button>
    </div>
  </div>

  <div class="dtr-note-bar">
    <label for="dtr-note-input" data-i18n="dtr_note_label">ملاحظة لولي الأمر (اختياري):</label>
    <textarea id="dtr-note-input" data-i18n-placeholder="dtr_note_placeholder" placeholder="اكتب هنا ملاحظتك لولي الأمر — إن تركتها فارغة سيظهر تعليق تلقائي مبني على نتيجة المواجهة."></textarea>
    <span class="dtr-hint" data-i18n="dtr_note_hint">تظهر في صندوق "ملاحظة المعلم" بالأسفل</span>
  </div>

  <div class="dtr-stage">
    <div class="dtr-page" id="dtr-page">

      <div class="dtr-header">
        <div class="dtr-eyebrow-row">
          <span class="dtr-eyebrow" data-i18n="dtr_eyebrow">🆚 تقرير مواجهة — الاختبارات الثنائية</span>
          <span class="dtr-meta" id="dtr-title-date">--</span>
        </div>

        <div class="dtr-winner-ribbon" id="dtr-winner-ribbon"></div>

        <div class="dtr-vs-row">
          <div class="dtr-side" id="dtr-side-a">
            <div class="dtr-avatar" id="dtr-avatar-a">--</div>
            <div class="dtr-side-name" id="dtr-name-a">--</div>
            <div class="dtr-side-roundswon" id="dtr-roundswon-a">--</div>
            <div class="dtr-side-points" id="dtr-points-a">--</div>
          </div>
          <div class="dtr-vs-center">
            <div class="dtr-vs-icon">🆚</div>
            <div class="dtr-vs-sub" data-i18n="dtr_total_points_sub">مجموع النقاط</div>
          </div>
          <div class="dtr-side" id="dtr-side-b">
            <div class="dtr-avatar" id="dtr-avatar-b">--</div>
            <div class="dtr-side-name" id="dtr-name-b">--</div>
            <div class="dtr-side-roundswon" id="dtr-roundswon-b">--</div>
            <div class="dtr-side-points" id="dtr-points-b">--</div>
          </div>
        </div>

        <div class="dtr-badges-row" id="dtr-badges-row"></div>
      </div>

      <div class="dtr-body">
        <div class="pdf-block">
          <div class="dtr-section-title" data-i18n="dtr_ladder_title">📊 سلّم الجولات</div>
          <div class="dtr-ladder" id="dtr-ladder"></div>
        </div>

        <div class="dtr-section-title" data-i18n="dtr_rounds_detail_title">📋 تفاصيل كل جولة — كل الأسئلة كما جرت بالفعل</div>
        <div id="dtr-rounds-container"></div>

        <div class="dtr-note-box pdf-block">
          <div class="dtr-note-label" data-i18n="dtr_note_box_label">ملاحظة المعلم لولي الأمر</div>
          <p class="dtr-note-text" id="dtr-note-text"></p>
        </div>

        <div class="dtr-footer pdf-block">
          <div class="dtr-footer-note">
            <span data-i18n="mr_footer_line1">دار حم · منصة مراجعة القرآن التفاعلية</span><br>
            <span data-i18n="dtr_footer_auto_line">تقرير مواجهة تلقائي، معتمد من المعلم</span>
          </div>
          <div class="dtr-sign">
            <div class="dtr-sig-img-wrap"><img id="dtr-sign-img" style="display:none;" alt=""></div>
            <div class="dtr-sign-line"></div>
            <div class="dtr-sign-name" id="dtr-sign-name">--</div>
            <div class="dtr-sign-label" data-i18n="dtr_sign_label">توقيع المعلم</div>
          </div>
        </div>
      </div>
    </div>

    <div class="dtr-home-bar no-export">
      <button type="button" class="dtr-home-btn" id="dtr-btn-home-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7"/><path d="M9 22V12h6v10"/></svg>
        <span data-i18n="dtr_home_btn">العودة للرئيسية</span>
      </button>
    </div>
  </div>
</div>
`;

// -----------------------------------------------------------------------------
// 1) أدوات عامة صغيرة (مكرَّرة محلياً بنفس منطق report.js — راجع تعليق العزل أعلى الملف)
// -----------------------------------------------------------------------------
function $(id) {
  const el = document.getElementById(id);
  if (!el) {
    console.warn(`[dual-test-report.js] تعذّر إيجاد العنصر #${id} داخل الصفحة.`);
  }
  return el;
}
function setText(id, val) { const el = $(id); if (el) el.textContent = val; }
function setHTML(id, val) { const el = $(id); if (el) el.innerHTML = val; }
function escapeHtml(str) {
  return String(str == null ? '' : str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}
function slugifyForFilename(str) {
  return String(str || '').replace(/[،,()]/g, ' ').trim().replace(/\s+/g, '_');
}
function formatDateArabic(d) {
  const dd = d.getDate(), mm = d.getMonth() + 1, yyyy = d.getFullYear();
  return `${yyyy} / ${String(mm).padStart(2, '0')} / ${String(dd).padStart(2, '0')}`;
}

// -----------------------------------------------------------------------------
// 1أ) الأفاتار — نفس منطق dual-test-play.js/report.js بالحرف (مكرَّر محلياً للعزل)
// -----------------------------------------------------------------------------
function avatarStorageKey(studentId, studentName) {
  return 'darham_avatar_' + (studentId != null ? studentId : slugifyForFilename(studentName || 'unknown'));
}
async function resolveStudentAvatar(studentId) {
  try {
    if (AppState.studentManager) {
      const students = await AppState.studentManager.getAllStudents();
      const s = students.find(st => String(st.id) === String(studentId));
      if (s && s.avatar) return s.avatar;
    }
  } catch (e) { /* تجاهل */ }
  try {
    const saved = localStorage.getItem(avatarStorageKey(studentId));
    if (saved) return saved;
  } catch (e) { /* تجاهل */ }
  return null;
}
// avatar.length < 10 => إيموجي نصي، غير ذلك => صورة base64، وإلا => حرف أول الاسم
// (نفس المعيار المستخدم بالحرف في student.js وreport.js)
function avatarHtml(name, avatarVal) {
  if (avatarVal) {
    if (avatarVal.length < 10) return escapeHtml(avatarVal);
    return `<img src="${avatarVal}" alt="${escapeHtml(name || '')}">`;
  }
  return escapeHtml((name || '؟').trim().charAt(0));
}

// -----------------------------------------------------------------------------
// 1ب) نطاق الجولة — اسم السورة من رقمها (نفس منطق dual-test-setup.js)
// -----------------------------------------------------------------------------
function surahNameByNumber(num) {
  if (!num) return '';
  const surah = (AppState.surahsData || []).find(s => s.number === num);
  return surah ? `${surah.number}. ${surah.name}` : '';
}
function roundRangeLabel(round) {
  const fromName = surahNameByNumber(round && round.rangeFrom && round.rangeFrom.surah);
  const toName = surahNameByNumber(round && round.rangeTo && round.rangeTo.surah);
  if (!fromName && !toName) return t('dts_range_not_set');
  return `${fromName || '—'} ← ${toName || '—'}`;
}

// -----------------------------------------------------------------------------
// 1ج) هوية المعلم — مطابقة تماماً لمنطق report.js/monthly-report.js (مكرَّرة محلياً)
// -----------------------------------------------------------------------------
function getTeacherIdentity() {
  const teacher = AppState.currentTeacher || {};
  const fromApp = teacher.name || AppState.teacherName || null;
  const fromAppStamp = teacher.stamp || null;
  let savedName = '';
  try { savedName = localStorage.getItem('darham_teacher_name') || ''; } catch (e) { /* تجاهل */ }
  let savedSig = '';
  try { savedSig = localStorage.getItem('darham_teacher_signature') || ''; } catch (e) { /* تجاهل */ }
  return { name: fromApp || savedName || t('dtr_default_teacher_label'), signature: fromAppStamp || savedSig || null };
}
function persistTeacherIdentity(partial) {
  try {
    if (AppState.teacherManager) {
      AppState.teacherManager.saveProfile(partial).then((saved) => {
        AppState.currentTeacher = saved;
        AppState.teacherName = saved.name || '';
      });
    }
  } catch (e) { console.warn("تعذر حفظ بيانات المعلم في الملف الدائم:", e); }
}
// 🌟 [إصلاح] أضفنا معامل format اختياري (افتراضيًا jpeg كما كان). سبب الإصلاح: JPEG
// لا يدعم الشفافية، فأي صورة ختم/توقيع بخلفية شفافة (PNG) تتحول خلفيتها الشفافة إلى
// مربع أسود صلب عند التحويل لـ JPEG بدل أن تختفي — وهذا كان سبب المربع الأسود حول
// التوقيع في نهاية التقرير. نستخدم PNG عند نداء الدالة لرفع الختم تحديدًا (أسفل).
function resizeImageToDataUrl(file, maxSize, quality, format) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذّرت قراءة الملف'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('الملف ليس صورة صالحة'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);
          width = Math.max(1, Math.round(width * ratio));
          height = Math.max(1, Math.round(height * ratio));
        }
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(format || 'image/jpeg', quality || 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// -----------------------------------------------------------------------------
// 2) التصدير: PNG عالي الجودة أو PDF متعدد الصفحات — نفس خوارزمية report.js بالحرف
// (مكرَّرة محلياً للعزل، مع تعديل لون خلفية الصفحة فقط ليطابق خلفية هذا التقرير #fffdf6)
// -----------------------------------------------------------------------------
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
async function ensureHtml2Canvas() {
  if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
}
async function ensureJsPdf() {
  if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
}
async function ensureFontsReady() {
  if (document.fonts && document.fonts.ready) {
    try {
      await Promise.all([
        document.fonts.load('700 32px Amiri'), document.fonts.load('italic 700 16px Amiri'),
        document.fonts.load('700 14px Cairo'), document.fonts.load('600 13px Cairo'), document.fonts.load('800 14px Cairo')
      ]);
      await document.fonts.ready;
    } catch (e) { /* تجاهل — لن نمنع التصدير بسبب هذا فقط */ }
  }
}
function withBusyLabel(btn, busyText, fn) {
  return async function () {
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = busyText;
    try { await fn(); }
    catch (err) { console.error(err); alert(t('dtr_export_error_alert') + ' ' + err.message); }
    finally { btn.disabled = false; btn.innerHTML = original; }
  };
}
function currentTarget() { return $('dtr-page'); }
function ignoreNoExport(el) { return !!(el.classList && el.classList.contains('no-export')); }
function buildFileName(ext) {
  const a = slugifyForFilename(reportData.nameA);
  const b = slugifyForFilename(reportData.nameB);
  const datePart = reportData.date.replace(/\s+/g, '').replace(/\//g, '-');
  return `تقرير_مواجهة_${a}_ضد_${b}_${datePart}.${ext}`;
}
const HQ_SCALE = 3;
// 🌟 نفس مفتاح localStorage المستخدم في report.js/monthly-report.js بالحرف — تقارير
// المواجهات المُصدَّرة تُحتسَب ضمن نفس عدّاد "التقارير هذا الشهر" في بطاقة "نظرة سريعة"
// بالشاشة الرئيسية، بدل عدّاد منفصل لا داعي له. 🌟 افتراض صريح غير محسوم: هذا يوسّع تعريف
// "تقرير" في ذلك العدّاد ليشمل تقارير المواجهات أيضاً، وليس فقط تقارير التقييم الفردي — قرار
// معقول (العدّاد اسمه عام أصلاً "تقارير")، لكنه يستحق توضيحاً صريحاً لو رغب المعلم في عدّاد منفصل.
const REPORTS_LOG_KEY = 'darham_reports_log';
const REPORTS_LOG_MAX = 300;
function logReportGenerated() {
  try {
    const raw = localStorage.getItem(REPORTS_LOG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push(new Date().toISOString());
    localStorage.setItem(REPORTS_LOG_KEY, JSON.stringify(arr.slice(-REPORTS_LOG_MAX)));
  } catch (e) { /* تجاهل */ }
}

function collectPdfBlocks(target) {
  const targetRect = target.getBoundingClientRect();
  return Array.from(target.querySelectorAll('.pdf-block')).map(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top - targetRect.top, height: rect.height };
  }).filter(b => b.height > 0);
}
function splitOversizedRange(top, height, maxPageHeight) {
  const parts = [];
  let pos = top;
  const end = top + height;
  while (pos < end) {
    const partEnd = Math.min(pos + maxPageHeight, end);
    parts.push({ start: pos, end: partEnd });
    pos = partEnd;
  }
  return parts;
}
function packBlocksIntoPages(blocks, maxPageHeight) {
  const pages = [];
  let curStart = null, curEnd = null;
  for (const b of blocks) {
    const blockBottom = b.top + b.height;
    if (b.height > maxPageHeight) {
      if (curStart !== null) { pages.push({ start: curStart, end: curEnd }); curStart = null; curEnd = null; }
      splitOversizedRange(b.top, b.height, maxPageHeight).forEach(p => pages.push(p));
      continue;
    }
    if (curStart === null) { curStart = b.top; curEnd = blockBottom; continue; }
    if (blockBottom - curStart <= maxPageHeight) { curEnd = blockBottom; }
    else { pages.push({ start: curStart, end: curEnd }); curStart = b.top; curEnd = blockBottom; }
  }
  if (curStart !== null) pages.push({ start: curStart, end: curEnd });
  return pages;
}

async function exportPng() {
  await ensureHtml2Canvas();
  await ensureFontsReady();
  const target = currentTarget();
  const canvas = await window.html2canvas(target, {
    scale: HQ_SCALE, backgroundColor: '#fffdf6', useCORS: true,
    ignoreElements: ignoreNoExport
  });
  const link = document.createElement('a');
  link.download = buildFileName('png');
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  logReportGenerated();
}

async function exportPdf() {
  await ensureHtml2Canvas();
  await ensureJsPdf();
  await ensureFontsReady();
  const target = currentTarget();

  const domBlocks = collectPdfBlocks(target);

  const canvas = await window.html2canvas(target, {
    scale: HQ_SCALE, backgroundColor: '#fffdf6', useCORS: true,
    ignoreElements: ignoreNoExport
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageWidthPt = pdf.internal.pageSize.getWidth();
  const pageHeightPt = pdf.internal.pageSize.getHeight();
  const REPORT_BG_RGB = [255, 253, 246]; // يقابل #fffdf6
  const marginXPt = 0;
  const marginYPt = 20;
  const contentWidthPt = pageWidthPt - marginXPt * 2;
  const contentHeightPt = pageHeightPt - marginYPt * 2;

  const domToCanvasScale = canvas.width / target.offsetWidth;
  const domToPtScale = contentWidthPt / target.offsetWidth;
  const maxPageDomHeight = contentHeightPt / domToPtScale;
  const maxPageCanvasHeight = maxPageDomHeight * domToCanvasScale;

  const canvasBlocks = domBlocks.map(b => ({ top: b.top * domToCanvasScale, height: b.height * domToCanvasScale }));
  let pages = packBlocksIntoPages(canvasBlocks, maxPageCanvasHeight);
  if (!pages.length) {
    pages = [];
    for (let y = 0; y < canvas.height; y += maxPageCanvasHeight) {
      pages.push({ start: y, end: Math.min(y + maxPageCanvasHeight, canvas.height) });
    }
  }

  pages.forEach((p, idx) => {
    if (idx > 0) pdf.addPage();
    pdf.setFillColor(REPORT_BG_RGB[0], REPORT_BG_RGB[1], REPORT_BG_RGB[2]);
    pdf.rect(0, 0, pageWidthPt, pageHeightPt, 'F');
    const sliceHeightCanvasPx = Math.max(1, Math.round(p.end - p.start));
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightCanvasPx;
    const ctx = sliceCanvas.getContext('2d');
    ctx.fillStyle = '#fffdf6';
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, p.start, canvas.width, sliceHeightCanvasPx, 0, 0, canvas.width, sliceHeightCanvasPx);
    const sliceImg = sliceCanvas.toDataURL('image/png');
    const sliceHeightPt = (sliceHeightCanvasPx / domToCanvasScale) * domToPtScale;
    pdf.addImage(sliceImg, 'PNG', marginXPt, marginYPt, contentWidthPt, sliceHeightPt, undefined, 'FAST');
  });

  pdf.save(buildFileName('pdf'));
  logReportGenerated();
}

// -----------------------------------------------------------------------------
// 3) طبقة قراءة البيانات — كل سؤال من questionsLog لكل جولة، مُعاد ربطه بنصه الأصلي
// -----------------------------------------------------------------------------

// 🌟 استرجاع نص "من/إلى" الفعلي لسؤال مُجاب من بنك الأسئلة الأصلي (activeTest) — راجع
// الافتراض الصريح أعلى الملف بخصوص الأسئلة التي لم تُجَب (لا تظهر هنا أصلاً لأنها غير
// موجودة في questionsLog من الأساس)، وحالة السؤال المحذوف لاحقاً من بنك الأسئلة (نادرة).
function resolveQuestionText(roundIndex, entry) {
  const round = activeTest && activeTest.rounds && activeTest.rounds[roundIndex];
  if (!round) return { fromText: '', toText: '', missing: true };
  const pool = entry.kind === 'swap' ? (round.swapQuestions || []) : (round.mainQuestions || []);
  const q = entry.kind === 'swap'
    ? pool.find(x => x.code === entry.ref)
    : pool.find(x => x.number === entry.ref);
  if (!q) return { fromText: '', toText: '', missing: true };
  return { fromText: q.fromText || '', toText: q.toText || '', missing: false };
}

function buildRoundData(round, roundIndex) {
  const entries = (round.questionsLog || []).map(logEntry => {
    const resolved = resolveQuestionText(roundIndex, logEntry);
    return Object.assign({}, logEntry, resolved);
  });
  return {
    roundNumber: roundIndex + 1,
    titleKey: ROUND_TITLE_KEYS[roundIndex] || ROUND_TITLE_KEYS[0],
    rangeLabel: roundRangeLabel(round),
    scoreA: round.scoreA || 0, scoreB: round.scoreB || 0,
    mistakesA: round.mistakesA || 0, mistakesB: round.mistakesB || 0,
    helperUsedA: !!round.helperUsedA, helperUsedB: !!round.helperUsedB,
    swapUsedA: !!round.swapUsedA, swapUsedB: !!round.swapUsedB,
    swapCodeA: round.swapCodeA || null, swapCodeB: round.swapCodeB || null,
    winner: round.roundWinner,
    entriesA: entries.filter(e => e.student === 'A'),
    entriesB: entries.filter(e => e.student === 'B')
  };
}

function getAutoParentNote(d) {
  if (d.isTie) {
    return t('dtr_auto_note_tie')
      .replace('{a}', d.nameA).replace('{b}', d.nameB)
      .replace('{pa}', d.totalPointsA).replace('{pb}', d.totalPointsB);
  }
  const winnerRounds = d.winnerSide === 'A' ? d.roundsWonA : d.roundsWonB;
  const loserRounds = d.winnerSide === 'A' ? d.roundsWonB : d.roundsWonA;
  const loserName = d.winnerSide === 'A' ? d.nameB : d.nameA;
  const diff = Math.abs(d.totalPointsA - d.totalPointsB);
  return t('dtr_auto_note_win')
    .replace('{winner}', d.winnerName).replace('{loser}', loserName)
    .replace('{wr}', winnerRounds).replace('{lr}', loserRounds)
    .replace('{diff}', diff);
}

async function buildDualTestReportData() {
  const match = activeMatch;
  const nameA = match.studentNameA || '—', nameB = match.studentNameB || '—';

  const [avatarA, avatarB] = await Promise.all([
    resolveStudentAvatar(match.studentIdA),
    resolveStudentAvatar(match.studentIdB)
  ]);

  // 🌟 أوسمة هذه المواجهة تحديداً فقط (مربوطة بـ matchId) — لا كل تاريخ الطالب، حتى لا
  // تُعرَض في تقرير هذه المواجهة أوسمة استُحقَّت في مواجهات أخرى سابقة أو لاحقة
  let achievements = [];
  try {
    if (AppState.dualTestsManager) {
      const all = await AppState.dualTestsManager.getAllAchievements();
      achievements = all.filter(a => a.matchId === match.id);
    }
  } catch (e) { /* لا نمنع عرض التقرير بسبب فشل جلب الأوسمة */ }

  const badgesA = [], badgesB = [];
  achievements.forEach(a => {
    const def = BADGE_CATALOG[a.badgeKey];
    if (!def) return;
    const target = String(a.studentId) === String(match.studentIdA) ? badgesA : badgesB;
    target.push({ icon: def.icon, label: t(def.nameKey) });
  });

  const rounds = (match.rounds || []).map((r, i) => buildRoundData(r, i));

  const isTie = match.result === 'tie';
  const winnerSide = match.result === 'A_win' ? 'A' : (match.result === 'B_win' ? 'B' : null);

  const data = {
    nameA, nameB, avatarA, avatarB,
    roundsWonA: match.roundsWonA || 0, roundsWonB: match.roundsWonB || 0,
    totalPointsA: match.totalPointsA || 0, totalPointsB: match.totalPointsB || 0,
    isTie, winnerSide,
    winnerName: winnerSide === 'A' ? nameA : (winnerSide === 'B' ? nameB : null),
    date: match.finishedAt ? formatDateArabic(new Date(match.finishedAt)) : formatDateArabic(new Date()),
    rounds,
    badgesA, badgesB,
    teacher: getTeacherIdentity()
  };
  data.autoNote = getAutoParentNote(data);
  return data;
}

// -----------------------------------------------------------------------------
// 4) العرض على الشاشة
// -----------------------------------------------------------------------------

function renderHeader(d) {
  setText('dtr-title-date', d.date);

  const ribbon = $('dtr-winner-ribbon');
  if (ribbon) {
    if (d.isTie) {
      ribbon.className = 'dtr-winner-ribbon tie';
      ribbon.innerHTML = `<span class="dtr-trophy">🤝</span> ${t('dtp_final_tie_label')}`;
    } else {
      ribbon.className = 'dtr-winner-ribbon';
      ribbon.innerHTML = `<span class="dtr-trophy">🏆</span> ${t('dtp_final_winner_label').replace('{name}', escapeHtml(d.winnerName))}`;
    }
  }

  const sideA = $('dtr-side-a'); if (sideA) sideA.classList.toggle('winner', d.winnerSide === 'A');
  const sideB = $('dtr-side-b'); if (sideB) sideB.classList.toggle('winner', d.winnerSide === 'B');

  setHTML('dtr-avatar-a', avatarHtml(d.nameA, d.avatarA));
  setHTML('dtr-avatar-b', avatarHtml(d.nameB, d.avatarB));
  setText('dtr-name-a', d.nameA);
  setText('dtr-name-b', d.nameB);
  setText('dtr-roundswon-a', t('dtp_final_rounds_label').replace('{n}', d.roundsWonA));
  setText('dtr-roundswon-b', t('dtp_final_rounds_label').replace('{n}', d.roundsWonB));
  setHTML('dtr-points-a', `${d.totalPointsA}<small> ${t('dtr_points_unit')}</small>`);
  setHTML('dtr-points-b', `${d.totalPointsB}<small> ${t('dtr_points_unit')}</small>`);

  const badgesRow = $('dtr-badges-row');
  if (badgesRow) {
    const all = [
      ...d.badgesA.map(b => Object.assign({}, b, { studentName: d.nameA })),
      ...d.badgesB.map(b => Object.assign({}, b, { studentName: d.nameB }))
    ];
    if (!all.length) {
      badgesRow.style.display = 'none';
      badgesRow.innerHTML = '';
    } else {
      badgesRow.style.display = 'flex';
      badgesRow.innerHTML = all.map(b =>
        `<span class="dtr-badge-chip"><span class="dtr-badge-icon">${b.icon}</span> ${escapeHtml(b.label)} — ${escapeHtml(b.studentName)}</span>`
      ).join('');
    }
  }
}

function renderLadder(d) {
  const el = $('dtr-ladder');
  if (!el) return;
  el.innerHTML = d.rounds.map(r => {
    const wonClass = r.winner === 'A' ? 'won-a' : (r.winner === 'B' ? 'won-b' : '');
    const leadAClass = r.scoreA > r.scoreB ? 'dtr-lead' : '';
    const leadBClass = r.scoreB > r.scoreA ? 'dtr-lead' : '';
    const winnerTag = r.winner === 'tie'
      ? `🤝 ${t('dtp_tie_label')}`
      : `🏆 ${escapeHtml(r.winner === 'A' ? d.nameA : d.nameB)}`;
    return `<div class="dtr-ladder-card ${wonClass}">
      <div class="dtr-ladder-round-label">${t(r.titleKey)}</div>
      <div class="dtr-ladder-scores"><span class="${leadAClass}">${r.scoreA}</span><span class="dtr-dash">—</span><span class="${leadBClass}">${r.scoreB}</span></div>
      <div class="dtr-ladder-winner-tag">${winnerTag}</div>
    </div>`;
  }).join('');
}

// 🌟 صف سؤال واحد — يعرض كل ما طُلب صراحة: النص، الدرجة، الأخطاء والخصم، هل استُخدمت
// مساعدة، وهل كان سؤال استبدال. بلا أي حذف أو تلخيص — هذا هو المقصود بـ"صادق بجد".
function qEntryHtml(e) {
  const pointsClass = e.earnedPoints >= 10 ? 'full' : (e.earnedPoints >= 5 ? 'mid' : 'low');
  const rangeText = e.missing
    ? t('dtr_question_unavailable')
    : `${t('dts_from_label')}: ${escapeHtml(e.fromText)} — ${t('dts_to_label')}: ${escapeHtml(e.toText)}`;
  const metaParts = [];
  metaParts.push(e.mistakes > 0
    ? `<span>${t('dtr_mistakes_deduction').replace('{n}', e.mistakes).replace('{d}', e.deduction)}</span>`
    : `<span>${t('dtr_no_mistakes')}</span>`);
  if (e.helperUsed) metaParts.push(`<span class="dtr-tag-helper">${t('dtr_helper_used_tag')}</span>`);
  if (e.kind === 'swap') metaParts.push(`<span class="dtr-tag-swap">${t('dtr_swap_tag')} (${escapeHtml(e.ref)})</span>`);
  return `<div class="dtr-qrow">
    <div class="dtr-qtop">
      <span class="dtr-qrange">${rangeText}</span>
      <span class="dtr-qpoints ${pointsClass}">${e.earnedPoints} / 10</span>
    </div>
    <div class="dtr-qmeta">${metaParts.join('')}</div>
  </div>`;
}

function qColHtml(name, avatarVal, entries) {
  const rows = entries.length
    ? entries.map(qEntryHtml).join('')
    : `<div class="dtr-qcol-empty">${t('dtr_qcol_empty').replace('{name}', escapeHtml(name))}</div>`;
  return `<div class="dtr-qcol">
    <div class="dtr-qcol-head"><span class="dtr-qcol-avatar">${avatarHtml(name, avatarVal)}</span> ${t('dtr_qcol_questions_of').replace('{name}', escapeHtml(name))}</div>
    ${rows}
  </div>`;
}

function roundSummaryLineHtml(r) {
  const helperA = r.helperUsedA ? t('dtp_yes') : t('dtp_no');
  const helperB = r.helperUsedB ? t('dtp_yes') : t('dtp_no');
  const swapA = r.swapUsedA ? `${t('dtp_yes')} (${escapeHtml(r.swapCodeA || '')})` : t('dtp_no');
  const swapB = r.swapUsedB ? `${t('dtp_yes')} (${escapeHtml(r.swapCodeB || '')})` : t('dtp_no');
  return `
    <span class="dtr-chip-mini">${t('dtr_round_summary_mistakes').replace('{a}', r.mistakesA).replace('{b}', r.mistakesB)}</span>
    <span class="dtr-chip-mini">${t('dtr_round_summary_helper').replace('{a}', helperA).replace('{b}', helperB)}</span>
    <span class="dtr-chip-mini">${t('dtr_round_summary_swap').replace('{a}', swapA).replace('{b}', swapB)}</span>
  `;
}

function renderRounds(d) {
  const container = $('dtr-rounds-container');
  if (!container) return;
  container.innerHTML = d.rounds.map(r => `
    <div class="dtr-round-block pdf-block">
      <div class="dtr-round-head">
        <span class="dtr-round-badge">${r.roundNumber}</span>
        <span class="dtr-round-title">${t(r.titleKey)} — ${escapeHtml(r.rangeLabel)}</span>
      </div>
      <div class="dtr-round-summary-line">${roundSummaryLineHtml(r)}</div>
      <div class="dtr-qcols">
        ${qColHtml(d.nameA, d.avatarA, r.entriesA)}
        ${qColHtml(d.nameB, d.avatarB, r.entriesB)}
      </div>
    </div>
  `).join('');
}

function renderNoteBox() {
  const input = $('dtr-note-input');
  const custom = input ? input.value.trim() : '';
  const text = custom || (reportData ? reportData.autoNote : '');
  setText('dtr-note-text', text);
}

function renderTeacherSign(d) {
  setText('dtr-sign-name', d.teacher.name);
  const sigImg = $('dtr-sign-img');
  if (sigImg) {
    if (d.teacher.signature) { sigImg.src = d.teacher.signature; sigImg.style.display = 'block'; }
    else sigImg.style.display = 'none';
  }
}

function renderReport(d) {
  renderHeader(d);
  renderLadder(d);
  renderRounds(d);
  renderNoteBox();
  renderTeacherSign(d);
}

async function renderAll() {
  reportData = await buildDualTestReportData();
  renderReport(reportData);
}

// -----------------------------------------------------------------------------
// 5) نقطة الدخول
// -----------------------------------------------------------------------------

function goHome() {
  try { loadSplashScreen(); } catch (e) { console.error(e); }
}

async function initDualTestReportScreen() {
  await renderAll();

  const noteInput = $('dtr-note-input');
  if (noteInput) noteInput.addEventListener('input', renderNoteBox);

  // -- اسم المعلم وختمه (نفس منطق report.js: يُقرأ أولاً من teacherDB، وإلا localStorage) --
  const teacherNameInput = $('dtr-teacher-name-input');
  if (teacherNameInput) {
    let initialName = (AppState.currentTeacher && AppState.currentTeacher.name) || '';
    if (!initialName) { try { initialName = localStorage.getItem('darham_teacher_name') || ''; } catch (e) { /* تجاهل */ } }
    teacherNameInput.value = initialName;
    teacherNameInput.addEventListener('input', () => {
      const val = teacherNameInput.value.trim();
      try { localStorage.setItem('darham_teacher_name', val); } catch (e) { /* تجاهل */ }
      persistTeacherIdentity({ name: val });
      if (reportData) { reportData.teacher.name = val || t('dtr_default_teacher_label'); renderTeacherSign(reportData); }
    });
  }
  const teacherSigBtn = $('dtr-teacher-sig-btn');
  const teacherSigInput = $('dtr-teacher-sig-input');
  if (teacherSigBtn && teacherSigInput) {
    teacherSigBtn.addEventListener('click', () => teacherSigInput.click());
    teacherSigInput.addEventListener('change', async () => {
      const file = teacherSigInput.files && teacherSigInput.files[0];
      teacherSigInput.value = '';
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) { alert(t('dtr_invalid_image_alert')); return; }
      try {
        // 🌟 [إصلاح] PNG بدل JPEG هنا تحديدًا حتى تبقى خلفية الختم الشفافة شفافة فعليًا
        const dataUrl = await resizeImageToDataUrl(file, 260, 0.9, 'image/png');
        try { localStorage.setItem('darham_teacher_signature', dataUrl); } catch (e) { /* تجاهل */ }
        persistTeacherIdentity({ stamp: dataUrl });
        if (reportData) { reportData.teacher.signature = dataUrl; renderTeacherSign(reportData); }
      } catch (e) { console.error(e); alert(t('dtr_signature_upload_error')); }
    });
  }

  // -- التصدير --
  const pngBtn = $('dtr-btn-png');
  const pdfBtn = $('dtr-btn-pdf');
  if (pngBtn) pngBtn.addEventListener('click', withBusyLabel(pngBtn, t('dtr_busy_label'), exportPng));
  if (pdfBtn) pdfBtn.addEventListener('click', withBusyLabel(pdfBtn, t('dtr_busy_label'), exportPdf));

  // -- العودة للرئيسية --
  const homeBtn = $('dtr-btn-home');
  const homeBtn2 = $('dtr-btn-home-2');
  if (homeBtn) homeBtn.addEventListener('click', goHome);
  if (homeBtn2) homeBtn2.addEventListener('click', goHome);
}

// 🌟 نقطة الدخول العامة — تُستدعى من dualtests/dual-test-play.js (زر "📄 عرض تقرير
// المواجهة" في شاشة النتيجة النهائية dtp-final-view)، وتستقبل match وtest مباشرة (نفس
// أسلوب report.js الذي يستقبل GameState من adultGame.js/kidsGame.js مباشرة عند الاستدعاء،
// بدل استيراد نسخة ثابتة) — حتى تبقى هذه الشاشة قابلة للفتح لاحقاً من أي مكان آخر بالمنصة
// (مثلاً سجل مواجهات طالب) بمجرد تمرير match/test له، بلا أي تعديل هنا.
export async function openDualTestReportScreen(match, test) {
  activeMatch = match;
  activeTest = test;
  const root = document.getElementById('app-root');
  if (!root) {
    console.error('[dual-test-report.js] لم يتم العثور على الحاوية الرئيسية #app-root.');
    return;
  }
  root.innerHTML = DUAL_TEST_REPORT_TEMPLATE;
  try { applyLanguage(); } catch (e) { /* غير حرِج — نكمل حتى لو لم تتوفر */ }
  await initDualTestReportScreen();
}
window.openDualTestReportScreen = openDualTestReportScreen;
