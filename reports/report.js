// =============================================================================
// reports/report.js
// شاشة تقرير التقييم — التصميم الجديد "تحليل الأداء" (يحل محل تصميمَي الرسالة
// اليومية/بطاقة الرحلة القديمَين بالكامل).
//
// الإضافات في هذه النسخة (بناءً على طلبكم):
//   1) مكان لسحب/رفع صورة الطالب (أو الضغط لاختيارها) داخل الدائرة الرمزية.
//   2) اسم المعلم وتوقيعه في نهاية التقرير (نص + إمكانية رفع صورة توقيع).
//   3) زر "العودة للرئيسية" في نهاية التقرير.
//   4) تصدير كصورة PNG عالية الجودة أو ملف PDF.
//   5) ملف PDF عالي الجودة ومقسّم على عدة صفحات A4 بدون قصّ أي عنصر منتصفه
//      وبدون ترك فراغات كبيرة — كل صفحة تُملأ بأكبر قدر ممكن من المحتوى قبل
//      الانتقال للتالية (تفصيل الخوارزمية في "طبقة تقسيم PDF" بالأسفل).
//
// ⚠️ نقطة تحتاج تأكيدك: اسم المعلم الحقيقي غير متوفر بعد كحقل مسجَّل (كما
// اتفقنا)، لذا نحاول أولًا قراءته من AppState (لو صار متاحًا لاحقًا)، وإلا
// نستخدم آخر اسم/توقيع أدخلهما المعلم يدويًا من شريط الأدوات (محفوظان في
// localStorage) — عدّل getTeacherIdentity() فور توفر نظام تسجيل دخول حقيقي.
// =============================================================================

import { AppState, applyLanguage, loadDashboardScreen } from '../core/app.js';
// TODO: عدّل هذا المسار إذا كان GameState في ملف مختلف عندك
// (games/adultGame.js أو games/kidsGame.js حسب نوع اللعبة الجاري تقييمها).
import { GameState } from '../games/adultGame.js';
// التنسيق (CSS) منقول بالكامل إلى report.styles.js بدل تضخيم هذا الملف —
// نفس المحتوى تمامًا، منظَّم في ملف مستقل فقط.
import { REPORT_STYLES } from './report.styles.js';

// -----------------------------------------------------------------------------
// 0) القالب الكامل لشاشة التقرير — مضمَّن هنا كنص مباشرة بدل تحميله من ملف
// HTML منفصل عبر fetch (نفس الحل الذي أصلح مشكلة "التقرير المبتور" سابقًا،
// لأن أداة الـ Live Reload عندكم كانت تتدخل في استجابات fetch لملفات HTML
// تحديدًا). REPORT_STYLES المستوردة أعلاه تُحقن هنا كوسم <style> عادي —
// نفس آلية الحقن المباشر تمامًا، فلا علاقة لها بمشكلة الـ fetch تلك.
// (لا يوجد بعد الآن ملف report.html منفصل يُطابق هذا القالب — كان نسخة
// مكررة غير مستخدمة فعليًا في التشغيل، وحذفه أزال خطر تعارض النسختين.)
// -----------------------------------------------------------------------------
const CORNER_ORN_INNER = `<path d="M2 20C2 9 9 2 20 2" stroke="#c9932f" stroke-width="1.3" opacity=".55"/><circle cx="2" cy="20" r="2" fill="#c9932f" opacity=".55"/><circle cx="20" cy="2" r="2" fill="#c9932f" opacity=".55"/>`;
const cornerOrnSvg = (cls) => `<svg class="corner-orn ${cls}" width="34" height="34" viewBox="0 0 40 40" fill="none">${CORNER_ORN_INNER}</svg>`;

const REPORT_TEMPLATE = `
<style>${REPORT_STYLES}</style>

<div id="report-screen">

  <div class="report-toolbar">
    <div class="grp">
      <span class="grp-label">بيانات المعلم</span>
      <input type="text" id="report-teacher-name-input" class="teacher-name-input" placeholder="اسم المعلم">
      <button class="rbtn ghost" id="btn-teacher-sig">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
        رفع توقيع
      </button>
      <input type="file" id="report-teacher-sig-input" accept="image/*" style="display:none;">
    </div>
    <div class="grp">
      <span class="grp-label">تصدير</span>
      <button class="rbtn primary" id="btn-report-png">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><path d="M21 15l-5-5L5 21"></path></svg>
        صورة عالية الجودة
      </button>
      <button class="rbtn" id="btn-report-pdf">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><path d="M14 2v6h6"></path></svg>
        ملف PDF
      </button>
    </div>
    <div class="grp">
      <button class="rbtn ghost" id="btn-report-home">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7"/><path d="M9 22V12h6v10"/></svg>
        العودة للرئيسية
      </button>
    </div>
  </div>
  <div class="note-bar">
    <label for="report-custom-note-input">ملاحظة لولي الأمر (اختياري):</label>
    <textarea id="report-custom-note-input" placeholder="اكتب هنا ملاحظتك الخاصة لولي الأمر — إن تركتها فارغة سيظهر تعليق تلقائي مبني على نتيجة الاختبار."></textarea>
    <span class="hint">تظهر في صندوق "ملاحظة المعلم" بالأسفل</span>
  </div>
  <div class="note-bar">
    <label for="report-extra-note-input">نص إضافي داخل التقرير (اختياري):</label>
    <textarea id="report-extra-note-input" placeholder="أي نص إضافي تحب إضافته داخل التقرير — اتركه فارغًا إن لم تكن بحاجة إليه."></textarea>
    <span class="hint">يظهر كصندوق منفصل، ولا يظهر إطلاقًا لو تُرك فارغًا</span>
  </div>

  <div class="report-stage">
    <div id="report-stage-inner" class="tier-excellent">
      <div>

      <div class="page" id="report-page" dir="rtl">
        ${cornerOrnSvg('tl')}
        ${cornerOrnSvg('tr')}
        ${cornerOrnSvg('bl')}
        ${cornerOrnSvg('br')}

        <div class="pdf-block" id="report-intro-block">
          <div class="eyebrow">دار حم · منصة تحفيظ القرآن الكريم</div>
          <div class="title-row">
            <h1 class="title">تقرير تحليل الأداء</h1>
            <div class="title-sub" id="report-title-date">--</div>
          </div>
          <div class="gold-rule"></div>

          <div class="meta-row">
            <div class="meta-student">
              <div class="avatar-wrap">
                <div class="avatar-circle" id="report-avatar-circle" title="اضغط أو اسحب صورة لتغيير صورة الطالب">
                  <img id="report-avatar-img" style="display:none;" alt="">
                </div>
                <button type="button" class="avatar-edit-btn no-export" id="report-avatar-edit-btn" title="تغيير صورة الطالب">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2Z"/><circle cx="12" cy="13" r="4"/></svg>
                </button>
                <input type="file" id="report-avatar-input" accept="image/*" style="display:none;">
              </div>
              <div>
                <div class="student-name" id="report-student-name">--</div>
                <div class="student-scope" id="report-student-scope">--</div>
              </div>
            </div>
            <div class="meta-right">
              المعلم: <b id="report-teacher-name-meta">--</b><br>
              المدة الإجمالية: <b id="report-total-time-meta">--</b>
            </div>
          </div>

          <div class="hero">
            <div class="gauge-wrap">
              <svg width="168" height="168" viewBox="0 0 208 208">
                <circle cx="104" cy="104" r="86" fill="none" stroke="#e4d9c4" stroke-width="18"></circle>
                <circle class="gauge-arc" id="report-gauge-arc" cx="104" cy="104" r="86" fill="none" stroke-width="18"
                  stroke-linecap="round" stroke-dasharray="540.35" stroke-dashoffset="0"
                  transform="rotate(-90 104 104)"></circle>
              </svg>
              <div class="gauge-center">
                <div class="gauge-pct" id="report-gauge-pct">--</div>
                <div class="gauge-tier" id="report-gauge-tier">--</div>
              </div>
            </div>
            <div class="hero-body">
              <p class="hero-headline" id="report-honesty-line"></p>
              <div class="status-chips">
                <span class="chip-status chip-full">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M6.5 10.2l2.3 2.3 4.7-5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
                  صحيحة بالكامل: <span id="report-count-full">0</span>
                </span>
                <span class="chip-status chip-partial">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M10 6v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="13.6" r="0.9" fill="currentColor"/></svg>
                  صحيحة جزئيًا: <span id="report-count-partial">0</span>
                </span>
                <span class="chip-status chip-wrong">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.8"/><path d="M7.3 7.3l5.4 5.4M12.7 7.3l-5.4 5.4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
                  غير صحيحة: <span id="report-count-wrong">0</span>
                </span>
              </div>
              <div class="stat-line">
                <span class="stat-item">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.5" stroke="#a79a83" stroke-width="1.6"/><path d="M10 6v4.3l3 1.7" stroke="#a79a83" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  متوسط وقت الإجابة: <span id="report-stat-avgtime">--</span>
                </span>
                <span class="stat-item">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M10 3.5a4.5 4.5 0 0 0-2.4 8.3c.5.3.9.9.9 1.5v.4h3v-.4c0-.6.4-1.2.9-1.5A4.5 4.5 0 0 0 10 3.5z" stroke="#a79a83" stroke-width="1.6" stroke-linejoin="round"/><path d="M8.7 16.3h2.6M9.1 17.8h1.8" stroke="#a79a83" stroke-width="1.6" stroke-linecap="round"/></svg>
                  تلميحات مستخدمة: <span id="report-stat-hints">0</span>
                </span>
                <span class="stat-item">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M4 10a6 6 0 0 1 10.2-4.2M16 10a6 6 0 0 1-10.2 4.2" stroke="#a79a83" stroke-width="1.6" stroke-linecap="round"/><path d="M14 3.5v2.6h-2.6M6 16.5v-2.6h2.6" stroke="#a79a83" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  محاولات ترتيب متكررة: <span id="report-stat-reorders">0</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="trend-block pdf-block">
          <div class="section-title">الأداء عبر آخر التقييمات</div>
          <div class="section-sub">مقارنة هذا التقييم بمحاولات الطالب السابقة في نفس النطاق</div>
          <div class="trend-bars" id="report-trend-bars"></div>
        </div>

        <div class="qlist">
          <div class="pdf-block" id="report-qhead-group">
            <div class="section-title">تفاصيل الاختبار — سؤالاً بسؤال</div>
            <div class="section-sub">كل الأسئلة التي وردت في هذا الاختبار كما جرت بالفعل، دون حذف</div>
            <div id="report-qrow-first"></div>
          </div>
          <div id="report-qrows-rest"></div>
        </div>

        <div class="insights pdf-block">
          <div class="insight-card">
            <div class="insight-head">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 2.5l2.1 4.6 5 .6-3.7 3.5.9 5-4.3-2.5-4.3 2.5.9-5-3.7-3.5 5-.6z" stroke="#8a6221" stroke-width="1.4" stroke-linejoin="round" fill="#efe9e0"/></svg>
              <span class="insight-title" style="color:#8a6221;">نقاط القوة</span>
            </div>
            <ul class="insight-list" id="report-strengths-list"></ul>
          </div>
          <div class="insight-card">
            <div class="insight-head">
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7.2" stroke="#a15230" stroke-width="1.4" fill="#f2e7e2"/><circle cx="10" cy="10" r="3.6" stroke="#a15230" stroke-width="1.4"/><circle cx="10" cy="10" r="1" fill="#a15230"/></svg>
              <span class="insight-title" style="color:#a15230;">بحاجة إلى تركيز</span>
            </div>
            <ul class="insight-list" id="report-needs-list"></ul>
          </div>
        </div>

        <div class="note-box pdf-block">
          <div class="note-label">ملاحظة المعلم لولي الأمر — للمتابعة أولًا بأول</div>
          <p class="note-text" id="report-note-text"></p>
        </div>

        <!-- صندوق اختياري: يظهر فقط لو المعلم كتب نصًا إضافيًا من شريط الأدوات
             أعلى الشاشة (report-extra-note-input) — يبقى مخفيًا تمامًا (display:none)
             ولا يأخذ أي مساحة في الصورة أو PDF إن تُرك فارغًا. -->
        <div class="note-box pdf-block" id="report-extra-note-block" style="display:none;">
          <div class="note-label">ملاحظة إضافية</div>
          <p class="note-text" id="report-extra-note-text"></p>
        </div>

        <div class="closing pdf-block">
          <div class="footer-note">
            دار حم · منصة مراجعة القرآن التفاعلية<br>
            <span dir="ltr" id="report-footer-id">--</span> &nbsp;·&nbsp; <span dir="ltr" id="report-footer-date">--</span>
          </div>
          <div class="teacher-sign">
            <div class="sig-img-wrap"><img id="report-sign-img" style="display:none;" alt=""></div>
            <div class="teacher-line"></div>
            <div class="sig-name" id="report-sign-name">المعلم</div>
            <div class="teacher-label">توقيع المعلم</div>
          </div>
        </div>
      </div>

      <div class="home-bar no-export">
        <button class="home-btn" id="btn-report-home-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7"/><path d="M9 22V12h6v10"/></svg>
          العودة للرئيسية
        </button>
      </div>

      </div>
    </div>
  </div>
</div>

`;

// -----------------------------------------------------------------------------
// 1) طبقة قراءة البيانات الحقيقية
// -----------------------------------------------------------------------------

function formatDateArabic(d){
  const dd = d.getDate(), mm = d.getMonth() + 1, yyyy = d.getFullYear();
  return `${yyyy} / ${String(mm).padStart(2,'0')} / ${String(dd).padStart(2,'0')}`;
}

function getHistory(studentId){
  try {
    const raw = localStorage.getItem(`history_${studentId}`);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.slice(-7) : [];
  } catch (e) { return []; }
}

// ✅ مطابقة فعلية لشكل GameState.reportDetails كما هو موجود بالحرف في
// games/adultGame.js (دالة recordAnswer):
//   { label, num, surahName, text, isCorrect, errors, usedHint, timeTaken, orderAttempts }
function computeQuestionScore(d){
  if (!d.isCorrect) return 0;
  if (d.orderAttempts === 1) return 8;
  if (d.orderAttempts >= 2) return 6;
  if (d.usedHint) return 8;
  return 10;
}
// تصنيف صادق لكل سؤال: صحيحة بالكامل / صحيحة بمساعدة تلميح / صحيحة بعد
// إعادة ترتيب / غير صحيحة — هذا التصنيف هو ما يبني عليه التقرير كل شيء
// (الأيقونة، اللون، النقاط، والملاحظة أسفل كل سؤال).
// ⚠️ الترتيب هنا مطابق بالحرف لأولوية computeQuestionScore بالأعلى (محاولات
// الترتيب أولًا، ثم التلميح)، حتى لا يظهر أبدًا سؤال بأيقونة "صحيحة بالكامل"
// بينما نقاطه الفعلية أقل من 10 — وهو بالضبط ما تعنيه "الصدق" في هذا التقرير.
function classifyQuestion(d){
  if (!d.isCorrect) return 'wrong';
  if (d.orderAttempts >= 1) return 'reorder';
  if (d.usedHint) return 'hint';
  return 'full';
}
function questionNoteText(d, status){
  if (status === 'hint') return 'استخدم تلميحًا للوصول إلى الإجابة';
  if (status === 'reorder') {
    return d.orderAttempts >= 2
      ? 'احتاج أكثر من محاولة لترتيب الكلمات بشكل صحيح'
      : 'احتاج محاولة إضافية لترتيب الكلمات بشكل صحيح';
  }
  if (status === 'wrong') {
    if (Array.isArray(d.errors) && d.errors.length) return 'خطأ: ' + d.errors.join('، ');
    return 'إجابة غير صحيحة';
  }
  return '';
}
function getQuestionResults(){
  const details = (GameState && Array.isArray(GameState.reportDetails)) ? GameState.reportDetails : [];
  if (!details.length) return [];
  return details.map((d, i) => {
    const status = classifyQuestion(d);
    return {
      num: i + 1,
      type: d.label || d.question || d.title || 'سؤال',
      location: d.surahName
        ? `سورة ${d.surahName}${d.num != null ? ' - آية ' + d.num : ''}`
        : (d.location || d.ayahRef || d.reference || ''),
      text: d.text || '',
      status,
      score: computeQuestionScore(d),
      max: 10,
      note: questionNoteText(d, status),
      timeTaken: typeof d.timeTaken === 'number' ? d.timeTaken : null,
      usedHint: !!d.usedHint,
      orderAttempts: d.orderAttempts || 0
    };
  });
}

function formatDuration(totalSeconds){
  if (!totalSeconds || totalSeconds <= 0) return '—';
  const m = Math.floor(totalSeconds / 60), s = Math.round(totalSeconds % 60);
  return m > 0 ? `${m} د ${s} ث` : `${s} ث`;
}
function buildStats(questionResults){
  const withTime = questionResults.filter(r => typeof r.timeTaken === 'number');
  const totalTime = withTime.reduce((s, r) => s + r.timeTaken, 0);
  const avgTime = withTime.length ? totalTime / withTime.length : 0;
  return {
    totalTime: withTime.length ? formatDuration(totalTime) : ((GameState && GameState.totalTimeLabel) || '—'),
    avgTime: withTime.length ? formatDuration(avgTime) : ((GameState && GameState.avgTimeLabel) || '—'),
    hints: questionResults.filter(r => r.usedHint).length,
    reorders: questionResults.filter(r => r.orderAttempts >= 2).length
  };
}

// TODO: نظام المهارات الحقيقي عندكم (analyzeSkills()) يرجّع تفاصيل أدق —
// لو الدالة متاحة استوردها واستخدمها بدل هذا التبسيط. حاليًا نبني نقاط
// القوة/التركيز من نتائج الأسئلة الفعلية + currentStudent.weaknesses
// (عناصرها كائنات {text, num, surahName, errorTypes} كما في adultGame.js).
function getSkillHighlights(student, questionResults){
  const correct = questionResults.filter(r => r.status === 'full');
  const wrong = questionResults.filter(r => r.status === 'wrong');

  const strengths = [];
  if (correct.length) {
    strengths.push(`حفظ صحيح ودقيق لعدد ${correct.length} من ${questionResults.length} سؤالًا دون أي مساعدة`);
  }
  // ⚠️ لا نضيف أي وصف غير مبني على بيانات فعلية (مثل "سريع" أو "واثق") ما لم
  // يكن مقيسًا فعليًا من timeTaken — هذا هو المقصود بـ"الصدق" في هذا التقرير:
  // لا يظهر أي مديح لا تدعمه بيانات حقيقية.
  if (correct.length >= 2) {
    strengths.push(`ثبات واضح في الحفظ عبر أكثر من سؤال في هذا النطاق دون الحاجة لأي مساعدة`);
  }

  const weaknesses = Array.isArray(student.weaknesses) ? student.weaknesses : [];
  const needsFocus = [];
  weaknesses.slice(0, 3).forEach(w => {
    const label = typeof w === 'string'
      ? w
      : (w.text || (Array.isArray(w.errorTypes) ? w.errorTypes.join('، ') : w.errorTypes) || null);
    if (label) needsFocus.push(label);
  });
  if (!needsFocus.length && wrong.length) {
    wrong.slice(0, 3).forEach(r => needsFocus.push(`${r.location || r.type}: ${r.note || 'إجابة غير صحيحة'}`));
  }

  if (!strengths.length) strengths.push('إكمال المحاولة كاملة رغم صعوبة بعض الأسئلة، وهذا بحد ذاته إنجاز يستحق التقدير');
  if (!needsFocus.length) needsFocus.push('الاستمرار في المراجعة اليومية المعتادة للحفاظ على هذا المستوى');
  return { strengths, needsFocus };
}

function getAvatarValue(student){
  if (student.avatar) return student.avatar;
  try {
    const saved = localStorage.getItem(avatarStorageKey(student));
    if (saved) return saved;
  } catch (e) { /* تجاهل */ }
  return null;
}
function getAvatarHtml(student){
  // نفس منطق طريقة عرض الصورة الرمزية المستخدم في student.js بالحرف:
  // avatar.length < 10 => إيموجي نصي، غير ذلك => صورة base64، وإلا => حرف أول الاسم.
  const avatarVal = getAvatarValue(student);
  if (avatarVal) {
    if (avatarVal.length < 10) return { type: 'emoji', value: avatarVal };
    return { type: 'image', value: avatarVal };
  }
  return { type: 'letter', value: (student.name || '؟').trim().charAt(0) };
}

function applyAvatar(prefix, avatarInfo){
  const circle = $(`${prefix}-avatar-circle`);
  const img = $(`${prefix}-avatar-img`);
  if (!circle || !img) return;
  if (avatarInfo.type === 'image') {
    img.src = avatarInfo.value;
    img.style.display = 'block';
    Array.from(circle.childNodes).forEach(n => { if (n.nodeType === 3) n.remove(); });
  } else {
    img.style.display = 'none';
    Array.from(circle.childNodes).forEach(n => { if (n !== img) n.remove(); });
    circle.appendChild(document.createTextNode(avatarInfo.value));
  }
}

// تصنيف مستمر للدرجة على أربعة مستويات فعلية (ممتاز / جيد / متوسط / ضعيف)
// بدل ثلاثة فقط — هذا هو المطلوب لتقرير يشمل جميع مستويات الطلاب بإنصاف:
// طالب حصل على 70% مثلًا يستحق توصيفًا مختلفًا عن طالب حصل على 60%، ولا
// يصح أن يُحشرا معًا في نفس التصنيف.
function getTier(score){
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'average';
  return 'weak';
}
const TONE = {
  excellent: { color: '#8a6221', label: 'ممتاز' },
  good:      { color: '#a97b2e', label: 'جيد' },
  average:   { color: '#b8863b', label: 'متوسط' },
  weak:      { color: '#a15230', label: 'بحاجة إلى دعم إضافي' }
};
const GAUGE_R = 86;
const GAUGE_CIRC = 2 * Math.PI * GAUGE_R;

// نصوص كل مستوى: صادقة دون تجميل، لكن — خصوصًا في مستوى "ضعيف" — مصاغة
// بلغة تحترم أن القارئ ولي أمر طفل، فتُبرز المحاولة والأمل بدل الاكتفاء
// بوصف القصور فقط.
function getHonestyLine(tier){
  if (tier === 'excellent') return 'نتيجة تعكس إتقانًا حقيقيًا لمعظم أسئلة هذا الاختبار.';
  if (tier === 'good') return 'نتيجة جيدة تدل على حفظ متين لمعظم الأسئلة، مع بعض الجوانب التي تستحق مزيدًا من الصقل.';
  if (tier === 'average') return 'نتيجة متوسطة تُظهر أساسًا موجودًا يمكن تقويته بمراجعة أكثر انتظامًا.';
  return 'الأداء في هذا الاختبار ما زال دون المستوى المطلوب، وهذه فرصة جيدة لتكثيف المراجعة معًا خطوة بخطوة.';
}
function getAutoParentNote(tier, name, needsFocus){
  const leadByTier = {
    excellent: `أداء ${name} في هذا الاختبار كان ممتازًا وعكس حفظًا متينًا لمعظم الأسئلة.`,
    good: `أداء ${name} كان جيدًا وتضمّن حفظًا صحيحًا لغالبية الأسئلة، مع بعض النقاط التي تحتاج مزيدًا من الصقل.`,
    average: `أداء ${name} كان متوسطًا بشكل عام، وهناك نقاط محددة يمكن تحسينها بمراجعة منتظمة.`,
    weak: `بذل ${name} جهدًا في هذا الاختبار، لكنه ما زال بحاجة إلى دعم إضافي في بعض الجوانب.`
  };
  const lead = leadByTier[tier] || leadByTier.average;
  const focus = needsFocus[0] ? ` نوصي بالتركيز على: ${needsFocus[0]}.` : '';
  const closing = tier === 'weak'
    ? ' ونثق أن متابعة قريبة معًا خلال الأيام القادمة ستُحدث فرقًا واضحًا بإذن الله.'
    : ' وسنتابع التقدم معًا أولًا بأول.';
  return lead + focus + closing;
}

// -----------------------------------------------------------------------------
// 1ب) هوية المعلم — اسم وختم في نهاية التقرير
// 🌟 صار لدينا الآن ملف معلم حقيقي (database/teacherDB.js) يُحمَّل في AppState.currentTeacher
// عند إقلاع النظام، وهو ما يُعتمد عليه أولاً. يبقى localStorage كخط رجوع فقط لأي جهاز/نسخة
// قديمة أدخل فيها المعلم اسمه/ختمه يدوياً من شريط الأدوات قبل وجود هذا الملف.
// -----------------------------------------------------------------------------
function getTeacherIdentity(){
  const teacher = AppState.currentTeacher || {};
  const fromApp = teacher.name || AppState.teacherName || null;
  const fromAppStamp = teacher.stamp || null;
  let savedName = '';
  try { savedName = localStorage.getItem('darham_teacher_name') || ''; } catch (e) { /* تجاهل */ }
  let savedSig = '';
  try { savedSig = localStorage.getItem('darham_teacher_signature') || ''; } catch (e) { /* تجاهل */ }
  return { name: fromApp || savedName || 'المعلم', signature: fromAppStamp || savedSig || null };
}

// 🌟 يحفظ أي تعديل يدخله المعلم من شريط أدوات التقرير في ملفه الدائم (teacherDB) أيضاً،
// حتى تبقى بياناته موحّدة في كل مكان بالمنصة (الترحيب، الفوتر، والتقارير القادمة).
function persistTeacherIdentity(partial){
  try {
    if (AppState.teacherManager) {
      AppState.teacherManager.saveProfile(partial).then((saved) => {
        AppState.currentTeacher = saved;
        AppState.teacherName = saved.name || '';
      });
    }
  } catch (e) { console.warn("تعذر حفظ بيانات المعلم في الملف الدائم:", e); }
}

function buildReportData(){
  const student = AppState.currentStudent || {};
  const questionResults = getQuestionResults();
  const totalMax = questionResults.reduce((sum, r) => sum + (r.max || 0), 0);
  const totalEarned = questionResults.reduce((sum, r) => sum + (r.score || 0), 0);
  const score = totalMax > 0 ? Math.round((totalEarned / totalMax) * 100) : Math.round(student.totalScore || 0);
  const tier = getTier(score);
  const tone = TONE[tier];
  const { strengths, needsFocus } = getSkillHighlights(student, questionResults);
  const history = getHistory(student.id);
  const historyForChart = history.length ? history : [{ date: formatDateArabic(new Date()), score }];
  const stats = buildStats(questionResults);
  const teacher = getTeacherIdentity();

  return {
    id: student.id != null ? ('#' + String(student.id).padStart(5, '0')) : '#00000',
    name: student.name || 'الطالب',
    scope: (GameState && GameState.range) || (history.length ? history[history.length - 1].range : '') || '—',
    date: formatDateArabic(new Date()),
    score,
    tier,
    toneColor: tone.color,
    tierLabel: tone.label,
    gaugeOffset: GAUGE_CIRC * (1 - Math.max(0, Math.min(100, score)) / 100),
    honestyLine: getHonestyLine(tier),
    avatar: getAvatarHtml(student),
    history: historyForChart.map(h => h.score),
    counts: {
      full: questionResults.filter(r => r.status === 'full').length,
      partial: questionResults.filter(r => r.status === 'hint' || r.status === 'reorder').length,
      wrong: questionResults.filter(r => r.status === 'wrong').length
    },
    stats,
    ledger: questionResults,
    strengths,
    needsFocus,
    autoNote: getAutoParentNote(tier, student.name || 'الطالب', needsFocus),
    teacher
  };
}

// -----------------------------------------------------------------------------
// 2) العرض على الشاشة
// -----------------------------------------------------------------------------

let reportData = null;

// 🛡️ دوال آمنة للوصول للعناصر: بدل ما ينهار الكود لو عنصر مش موجود، بنكتفي
// بتحذير واضح في الـ console يوضح رقم العنصر الناقص بالظبط، ونكمل عرض الباقي.
function $(id){
  const el = document.getElementById(id);
  if (!el) {
    console.warn(
      `[report.js] تعذّر إيجاد العنصر #${id} داخل الصفحة. ` +
      `على الأغلب أن نسخة القالب المعروضة فعليًا مختلفة عن آخر نسخة — ` +
      `تأكد من استبدال الملف فعليًا وتفريغ كاش المتصفح (Hard Refresh).`
    );
  }
  return el;
}
function setText(id, val){ const el = $(id); if (el) el.textContent = val; }
function setHTML(id, val){ const el = $(id); if (el) el.innerHTML = val; }

// 🛡️ أي نص مصدره بيانات (نص سؤال، ملاحظة خطأ، نقطة قوة/ضعف...) يُمرَّر عبر
// innerHTML يجب تنقيته أولًا، وإلا فأي محتوى يحتوي "<" أو "&" قد يكسر
// التنسيق أو يُحقن كعنصر HTML فعلي بدل أن يُعرض كنص عادي.
function escapeHtml(str){
  return String(str == null ? '' : str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
}

function renderTrend(d){
  const container = $('report-trend-bars');
  if (!container) return;
  const maxH = 66, minH = 10;
  container.innerHTML = d.history.map((score, i) => {
    const isLast = i === d.history.length - 1;
    const h = Math.round(minH + (Math.max(0, Math.min(100, score)) / 100) * (maxH - minH));
    const color = isLast ? d.toneColor : '#e4d9c4';
    const labelColor = isLast ? d.toneColor : '#a79a83';
    return `<div class="trend-bar-col"><div class="trend-bar" style="height:${h}px;background:${color};"></div><div class="trend-label" style="color:${labelColor}">${score}%</div></div>`;
  }).join('');
}

// أيقونة الدائرة الخضراء "صحيح" مستخدَمة في مكانين بمقاسين مختلفين (20px
// لكل سؤال في القائمة التفصيلية، 14px في بطاقة "نقاط القوة") — دالة واحدة
// بدل رسم نفس الـ SVG مرتين بشكل منفصل في الكود.
function checkCircleIcon(size){
  const r = size >= 18 ? 9 : 8;
  const strokeWidth = size >= 18 ? 1.8 : 1.7;
  return `<svg width="${size}" height="${size}" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="${r}" fill="#efe9e0" stroke="#d3c3ab"/><path d="M6.2 10.3l2.4 2.4 5-5.4" stroke="#8a6221" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
}
function statusIconSvg(status){
  if (status === 'full') return checkCircleIcon(20);
  if (status === 'wrong') {
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#f2e7e2" stroke="#dbbdb0"/><path d="M7.2 7.2l5.6 5.6M12.8 7.2l-5.6 5.6" stroke="#a15230" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  }
  return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="#f5eee4" stroke="#e4d1b5"/><path d="M10 6v4.4" stroke="#b8863b" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="13.6" r="1" fill="#b8863b"/></svg>`;
}
function qrowHtml(r, withBreakClass){
  const pointsColor = r.status === 'full' ? '#8a6221' : (r.status === 'wrong' ? '#a15230' : '#b8863b');
  const typeLine = escapeHtml(r.type) + (r.location ? ' · ' + escapeHtml(r.location) : '');
  return `<div class="qrow${withBreakClass ? ' pdf-block' : ''}">
    <div class="qnum">${r.num}</div>
    <div class="qicon">${statusIconSvg(r.status)}</div>
    <div class="qbody">
      <div class="qtop"><span class="qtype">${typeLine}</span><span class="qpoints" style="color:${pointsColor}">${r.score} / ${r.max}</span></div>
      <div class="qtext">${escapeHtml(r.text)}</div>
      ${r.note ? `<div class="qnote">${escapeHtml(r.note)}</div>` : ''}
    </div>
  </div>`;
}
function renderQuestions(d){
  const firstWrap = $('report-qrow-first');
  const restWrap = $('report-qrows-rest');
  if (!firstWrap || !restWrap) return;
  if (!d.ledger.length) {
    firstWrap.innerHTML = '<p style="text-align:center;color:#a79a83;font-size:14.5px;">لا توجد تفاصيل أسئلة متاحة لهذا التقييم.</p>';
    restWrap.innerHTML = '';
    return;
  }
  firstWrap.innerHTML = qrowHtml(d.ledger[0], false);
  restWrap.innerHTML = d.ledger.slice(1).map(r => qrowHtml(r, true)).join('');
}

function renderInsights(d){
  const checkIcon = checkCircleIcon(14);
  const dotIcon = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" fill="#f2e7e2" stroke="#dbbdb0"/><path d="M10 6.3v4.4M10 13.2v.1" stroke="#a15230" stroke-width="1.7" stroke-linecap="round"/></svg>`;
  setHTML('report-strengths-list', d.strengths.map(s => `<li class="insight-item">${checkIcon}<span>${escapeHtml(s)}</span></li>`).join(''));
  setHTML('report-needs-list', d.needsFocus.map(s => `<li class="insight-item">${dotIcon}<span>${escapeHtml(s)}</span></li>`).join(''));
}

function renderNoteBox(){
  const input = $('report-custom-note-input');
  const custom = input ? input.value.trim() : '';
  const text = custom || (reportData ? reportData.autoNote : '');
  setText('report-note-text', text);
}

// صندوق "ملاحظة إضافية" اختياري بالكامل: يظهر فقط لو المعلم كتب فيه نصًا،
// ويختفي تمامًا (بلا أي مساحة فارغة في الصورة أو PDF) لو تُرك فارغًا.
function renderExtraNote(){
  const input = $('report-extra-note-input');
  const block = $('report-extra-note-block');
  if (!input || !block) return;
  const text = input.value.trim();
  setText('report-extra-note-text', text);
  block.style.display = text ? '' : 'none';
}

function renderTeacherSign(d){
  setText('report-sign-name', d.teacher.name);
  setText('report-teacher-name-meta', d.teacher.name);
  const sigImg = $('report-sign-img');
  if (sigImg) {
    if (d.teacher.signature) { sigImg.src = d.teacher.signature; sigImg.style.display = 'block'; }
    else sigImg.style.display = 'none';
  }
}

// -----------------------------------------------------------------------------
// 🌟 [جديد] احتفال صوتي بسيط عند نتيجة "ممتاز" (النسبة ≥ 90%، نفس عتبة getTier أعلاه —
// بطلب صريح من المعلم: "لما نسبة التقرير 90% يصدر صوت تصفيق"). نفس أسلوب التخليق الصوتي
// المستخدم فعلاً في dualtests/dual-test-sounds.js (Web Audio API مدمج بالكامل، بلا أي
// ملف صوتي خارجي)، لكن نسخة مستقلة هنا بدل الاستيراد من dualtests/ — حفاظاً على عزل كل
// ميزة عن غيرها (نفس فلسفة العزل المتبعة بالفعل بين report.js وmonthly-report.js). لاحظ:
// الملاحظة نفسها الموجودة في dual-test-sounds.js تنطبق هنا — هذا تصفيق "مُصطنَع" (نبضات
// ضوضاء قصيرة) وليس تسجيلاً بشرياً حقيقياً.
// يُستدعى مرة واحدة فقط من renderReport أدناه، وهي بدورها تُستدعى مرة واحدة فقط عند فتح
// التقرير (initReportScreen → renderAll، راجع تعليقهما)، فلا يتكرر الصوت عند أي إعادة رسم.
// -----------------------------------------------------------------------------
let reportAudioCtx = null;
function getReportAudioCtx() {
  try {
    if (!reportAudioCtx) {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      reportAudioCtx = new Ctor();
    }
    if (reportAudioCtx.state === 'suspended') reportAudioCtx.resume().catch(() => { /* best-effort */ });
    return reportAudioCtx;
  } catch (e) { return null; } // 🌟 لا نكسر عرض التقرير بسبب فشل الصوت في متصفح قديم
}
function playReportTone(freq, duration, when, gainPeak) {
  const ctx = getReportAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const startAt = ctx.currentTime + when;
    gain.gain.setValueAtTime(0, startAt);
    gain.gain.linearRampToValueAtTime(gainPeak, startAt + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
  } catch (e) { /* best-effort */ }
}
function playReportClapBurst(when, gainPeak) {
  const ctx = getReportAudioCtx();
  if (!ctx) return;
  try {
    const duration = 0.09;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    const gain = ctx.createGain();
    const startAt = ctx.currentTime + when;
    gain.gain.setValueAtTime(gainPeak, startAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startAt + duration);
    src.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    src.start(startAt);
  } catch (e) { /* best-effort */ }
}
function playExcellentReportSound() {
  for (let i = 0; i < 4; i++) playReportClapBurst(i * 0.09 + Math.random() * 0.02, 0.28);
  [659.25, 783.99, 987.77].forEach((f, i) => playReportTone(f, 0.2, 0.4 + i * 0.13, 0.18));
}

function renderReport(d){
  const stage = $('report-stage-inner');
  if (stage) stage.className = 'tier-' + d.tier;

  setText('report-title-date', d.date);
  setText('report-footer-date', d.date);
  setText('report-footer-id', d.id);
  setText('report-student-name', d.name);
  setText('report-student-scope', d.scope);
  setText('report-total-time-meta', d.stats.totalTime);
  applyAvatar('report', d.avatar);

  const arc = $('report-gauge-arc');
  if (arc) { arc.style.stroke = d.toneColor; arc.style.strokeDashoffset = String(d.gaugeOffset); }
  const pctEl = $('report-gauge-pct'); if (pctEl) pctEl.textContent = d.score + '%';
  const tierEl = $('report-gauge-tier'); if (tierEl) tierEl.textContent = d.tierLabel;
  setText('report-honesty-line', d.honestyLine);

  // 🌟 [جديد] صوت تصفيق احتفالي عند نتيجة "ممتاز" (راجع تعليق playExcellentReportSound أعلاه)
  if (d.tier === 'excellent') playExcellentReportSound();

  setText('report-count-full', d.counts.full);
  setText('report-count-partial', d.counts.partial);
  setText('report-count-wrong', d.counts.wrong);
  setText('report-stat-avgtime', d.stats.avgTime);
  setText('report-stat-hints', d.stats.hints);
  setText('report-stat-reorders', d.stats.reorders);

  renderTrend(d);
  renderQuestions(d);
  renderInsights(d);
  renderNoteBox();
  renderTeacherSign(d);
}

function renderAll(){
  reportData = buildReportData();
  renderReport(reportData);
}

// -----------------------------------------------------------------------------
// 2ب) رفع صورة الطالب — سحب وإفلات أو ضغط لاختيار ملف
// -----------------------------------------------------------------------------
function slugifyForFilename(str){
  return String(str || '').replace(/[،,()]/g, ' ').trim().replace(/\s+/g, '_');
}
function avatarStorageKey(student){
  const s = student || AppState.currentStudent || {};
  return 'darham_avatar_' + (s.id != null ? s.id : slugifyForFilename(s.name || 'unknown'));
}
function resizeImageToDataUrl(file, maxSize, quality){
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
        resolve(canvas.toDataURL('image/jpeg', quality || 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function handleAvatarFile(file){
  if (!file || !file.type || !file.type.startsWith('image/')) {
    alert('يرجى اختيار ملف صورة صالح (JPG أو PNG).');
    return;
  }
  try {
    const dataUrl = await resizeImageToDataUrl(file, 320, 0.85);
    if (AppState.currentStudent) AppState.currentStudent.avatar = dataUrl;
    try { localStorage.setItem(avatarStorageKey(), dataUrl); } catch (e) { /* تجاهل */ }
    if (reportData) {
      reportData.avatar = { type: 'image', value: dataUrl };
      applyAvatar('report', reportData.avatar);
    }
  } catch (e) {
    console.error(e);
    alert('تعذّر تحميل الصورة، حاول مرة أخرى بصورة أخرى.');
  }
}

// -----------------------------------------------------------------------------
// 3) التصدير: صورة PNG عالية الجودة، أو ملف PDF متعدد الصفحات
// -----------------------------------------------------------------------------

function loadScript(src){
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const el = document.createElement('script');
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error('تعذّر تحميل المكتبة: ' + src));
    document.head.appendChild(el);
  });
}
async function ensureHtml2Canvas(){
  if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
}
async function ensureJsPdf(){
  if (!(window.jspdf && window.jspdf.jsPDF)) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
}
async function ensureFontsReady(){
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
function withBusyLabel(btn, busyText, fn){
  return async function () {
    const original = btn.innerHTML;
    btn.disabled = true; btn.innerHTML = busyText;
    try { await fn(); }
    catch (err) { console.error(err); alert('حدث خطأ أثناء التصدير: ' + err.message); }
    finally { btn.disabled = false; btn.innerHTML = original; }
  };
}
function currentTarget(){ return $('report-page'); }
function ignoreNoExport(el){ return !!(el.classList && el.classList.contains('no-export')); }
function buildFileName(ext){
  const namePart = slugifyForFilename(reportData.name);
  const datePart = reportData.date.replace(/\s+/g, '').replace(/\//g, '-');
  const scopePart = slugifyForFilename(reportData.scope);
  return `تقرير_${namePart}_${datePart}_${scopePart}.${ext}`;
}
const HQ_SCALE = 3; // جودة عالية جدًا للتصدير

// 🌟 سجل بسيط لعدد التقارير المُصدَّرة فعلياً (PDF أو PNG) — يُستخدم في بطاقة
// "نظرة سريعة" بالشاشة الرئيسية الجديدة (عدد التقييمات/التقارير هذا الشهر).
// نفس أسلوب localStorage المستخدم أصلاً في هذا الملف (اسم المعلم، التوقيع،
// السجل التاريخي)، بدل إضافة قاعدة بيانات جديدة كاملة لعدّاد بسيط كهذا.
// ملاحظة: يحسب فقط التقارير المُصدَّرة بعد إضافة هذا السطر، ولا يمكنه معرفة
// تقارير صُدِّرت قبل ذلك لأنها لم تُسجَّل وقتها.
const REPORTS_LOG_KEY = 'darham_reports_log';
const REPORTS_LOG_MAX = 300; // حد أقصى لحجم السجل حتى لا ينمو بلا نهاية
function logReportGenerated(){
  try {
    const raw = localStorage.getItem(REPORTS_LOG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const arr = Array.isArray(list) ? list : [];
    arr.push(new Date().toISOString());
    localStorage.setItem(REPORTS_LOG_KEY, JSON.stringify(arr.slice(-REPORTS_LOG_MAX)));
  } catch (e) { /* تجاهل — لا نمنع التصدير بسبب فشل تسجيل العدّاد فقط */ }
}

async function exportPng(){
  await ensureHtml2Canvas();
  await ensureFontsReady();
  const target = currentTarget();
  const canvas = await window.html2canvas(target, {
    scale: HQ_SCALE, backgroundColor: '#f9f4ea', useCORS: true,
    ignoreElements: ignoreNoExport
  });
  const link = document.createElement('a');
  link.download = buildFileName('png');
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  logReportGenerated();
}

// ---------------------------------------------------------------------------
// طبقة تقسيم PDF على صفحات A4 بدون قصّ أي قسم من منتصفه وبدون فراغات كبيرة:
// 1) نجمع حدود كل "قسم آمن للقطع" (عناصر .pdf-block) من الصفحة الحقيقية —
//    المقدمة، بطاقة المقياس، رسم الأداء، (عنوان الأسئلة + أول سؤال معًا حتى لا
//    يظهر العنوان وحيدًا آخر صفحة)، كل سؤال بعدها فرديًا، بطاقتا "نقاط
//    القوة/بحاجة إلى تركيز"، صندوق الملاحظة، وأخيرًا شريط التوقيع.
// 2) نلتقط الصفحة بالكامل كصورة واحدة عالية الجودة بـ html2canvas.
// 3) نملأ كل صفحة PDF بأكبر عدد ممكن من هذه الأقسام الكاملة (بدون قصّ أي
//    قسم منتصفه)، فتُستغل كل المساحة المتاحة في الصفحة قبل الانتقال للتالية،
//    بدل صفحة واحدة بحجم المحتوى الكامل أو صفحات ثابتة الحجم تترك فراغًا.
// ---------------------------------------------------------------------------
function collectPdfBlocks(target){
  const targetRect = target.getBoundingClientRect();
  return Array.from(target.querySelectorAll('.pdf-block')).map(el => {
    const rect = el.getBoundingClientRect();
    return { top: rect.top - targetRect.top, height: rect.height };
  }).filter(b => b.height > 0);
}
// يقسّم أي قسم أطول من صفحة كاملة (حالة نادرة، مثل ملاحظة طويلة جدًا) إلى
// أجزاء بحجم صفحة كاملة بدل أن يفيض عن حدود الصفحة في ملف PDF.
function splitOversizedRange(top, height, maxPageHeight){
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
function packBlocksIntoPages(blocks, maxPageHeight){
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

async function exportPdf(){
  await ensureHtml2Canvas();
  await ensureJsPdf();
  await ensureFontsReady();
  const target = currentTarget();

  // نقيس حدود الأقسام قبل الالتقاط (بوحدات بكسل DOM الفعلية).
  const domBlocks = collectPdfBlocks(target);

  const canvas = await window.html2canvas(target, {
    scale: HQ_SCALE, backgroundColor: '#f9f4ea', useCORS: true,
    ignoreElements: ignoreNoExport
  });

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const pageWidthPt = pdf.internal.pageSize.getWidth();
  const pageHeightPt = pdf.internal.pageSize.getHeight();
  // 🌟 إصلاح: كان هامش 24pt يُطبَّق على الجوانب الأربعة فوق صفحة PDF بيضاء
  // افتراضيًا، فتظهر حواف بيضاء واضحة حول محتوى التقرير الكريمي اللون —
  // خصوصًا على الجانبين. كمان آخر صفحة (لو تبقّى فيها قسم صغير زي شريط
  // التوقيع فقط) كانت تترك مساحة بيضاء كبيرة تحتها فتبدو "ناقصة". الحل:
  // نلغي الهامش الجانبي بالكامل (يمتلئ عرض الصفحة)، ونملأ خلفية كل صفحة PDF
  // بنفس لون خلفية التقرير (#f9f4ea) — نفس اللون المُستخدم أصلًا في التقاط
  // html2canvas أعلاه — قبل رسم الصورة، فتختفي أي حواف بيضاء وتبدو نهاية
  // آخر صفحة متّسقة مع باقي التقرير بدل فراغ أبيض فجّ.
  const REPORT_BG_RGB = [249, 244, 234]; // يقابل #f9f4ea
  const marginXPt = 0;
  const marginYPt = 20;
  const contentWidthPt = pageWidthPt - marginXPt * 2;
  const contentHeightPt = pageHeightPt - marginYPt * 2;

  const domToCanvasScale = canvas.width / target.offsetWidth; // = HQ_SCALE عمليًا
  const domToPtScale = contentWidthPt / target.offsetWidth;
  const maxPageDomHeight = contentHeightPt / domToPtScale;
  const maxPageCanvasHeight = maxPageDomHeight * domToCanvasScale;

  const canvasBlocks = domBlocks.map(b => ({ top: b.top * domToCanvasScale, height: b.height * domToCanvasScale }));
  let pages = packBlocksIntoPages(canvasBlocks, maxPageCanvasHeight);
  // لو لم نعثر على أي أقسام (مثلًا لو تغيّرت بنية الصفحة يومًا)، نُرجع لتقسيم
  // ثابت الارتفاع بدل تعطّل التصدير بالكامل.
  if (!pages.length) {
    pages = [];
    for (let y = 0; y < canvas.height; y += maxPageCanvasHeight) {
      pages.push({ start: y, end: Math.min(y + maxPageCanvasHeight, canvas.height) });
    }
  }

  pages.forEach((p, idx) => {
    if (idx > 0) pdf.addPage();
    // 🌟 تعبئة خلفية الصفحة كاملة بلون التقرير قبل رسم الصورة — يمنع ظهور
    // أي إطار أبيض حول المحتوى أو تحت آخر قسم في آخر صفحة.
    pdf.setFillColor(REPORT_BG_RGB[0], REPORT_BG_RGB[1], REPORT_BG_RGB[2]);
    pdf.rect(0, 0, pageWidthPt, pageHeightPt, 'F');
    const sliceHeightCanvasPx = Math.max(1, Math.round(p.end - p.start));
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightCanvasPx;
    const ctx = sliceCanvas.getContext('2d');
    ctx.fillStyle = '#f9f4ea';
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
// 4) نقطة الدخول — تحقن قالب الشاشة (REPORT_TEMPLATE) مباشرة في #app-root.
// -----------------------------------------------------------------------------

function goHome(){
  try {
    if (typeof loadDashboardScreen === 'function') { loadDashboardScreen(); return; }
  } catch (e) { console.error(e); }
  if (typeof window.loadDashboardScreen === 'function') { window.loadDashboardScreen(); return; }
  console.warn(
    '[report.js] لم يتم العثور على loadDashboardScreen — عدّل الاستيراد أعلى ' +
    'الملف (من core/app.js) ليطابق دالة العودة للرئيسية الفعلية عندكم.'
  );
}

function initReportScreen(){
  renderAll();
  renderNoteBox();
  renderExtraNote();

  const noteInput = $('report-custom-note-input');
  if (noteInput) noteInput.addEventListener('input', renderNoteBox);

  const extraNoteInput = $('report-extra-note-input');
  if (extraNoteInput) extraNoteInput.addEventListener('input', renderExtraNote);

  // -- رفع صورة الطالب (سحب وإفلات أو ضغط) --
  const avatarZone = $('report-avatar-circle');
  const avatarInput = $('report-avatar-input');
  const avatarEditBtn = $('report-avatar-edit-btn');
  if (avatarZone && avatarInput) {
    const openPicker = () => avatarInput.click();
    avatarZone.addEventListener('click', openPicker);
    if (avatarEditBtn) avatarEditBtn.addEventListener('click', (e) => { e.stopPropagation(); openPicker(); });
    avatarZone.addEventListener('dragover', (e) => { e.preventDefault(); avatarZone.classList.add('drag-over'); });
    avatarZone.addEventListener('dragleave', () => avatarZone.classList.remove('drag-over'));
    avatarZone.addEventListener('drop', (e) => {
      e.preventDefault();
      avatarZone.classList.remove('drag-over');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleAvatarFile(file);
    });
    avatarInput.addEventListener('change', () => {
      const file = avatarInput.files && avatarInput.files[0];
      if (file) handleAvatarFile(file);
      avatarInput.value = '';
    });
  }

  // -- اسم المعلم وختمه --
  // 🌟 نملأ الحقل أولاً من الملف الدائم (teacherDB)، وإلا من localStorage كخط رجوع قديم
  const teacherNameInput = $('report-teacher-name-input');
  if (teacherNameInput) {
    let initialName = (AppState.currentTeacher && AppState.currentTeacher.name) || '';
    if (!initialName) { try { initialName = localStorage.getItem('darham_teacher_name') || ''; } catch (e) { /* تجاهل */ } }
    teacherNameInput.value = initialName;
    teacherNameInput.addEventListener('input', () => {
      const val = teacherNameInput.value.trim();
      try { localStorage.setItem('darham_teacher_name', val); } catch (e) { /* تجاهل */ }
      persistTeacherIdentity({ name: val });
      if (reportData) { reportData.teacher.name = val || 'المعلم'; renderTeacherSign(reportData); }
    });
  }
  const teacherSigBtn = $('btn-teacher-sig');
  const teacherSigInput = $('report-teacher-sig-input');
  if (teacherSigBtn && teacherSigInput) {
    teacherSigBtn.addEventListener('click', () => teacherSigInput.click());
    teacherSigInput.addEventListener('change', async () => {
      const file = teacherSigInput.files && teacherSigInput.files[0];
      teacherSigInput.value = '';
      if (!file) return;
      if (!file.type || !file.type.startsWith('image/')) { alert('يرجى اختيار ملف صورة صالح للختم.'); return; }
      try {
        const dataUrl = await resizeImageToDataUrl(file, 260, 0.9);
        try { localStorage.setItem('darham_teacher_signature', dataUrl); } catch (e) { /* تجاهل */ }
        persistTeacherIdentity({ stamp: dataUrl });
        if (reportData) { reportData.teacher.signature = dataUrl; renderTeacherSign(reportData); }
      } catch (e) { console.error(e); alert('تعذّر تحميل صورة الختم، حاول مرة أخرى.'); }
    });
  }

  // -- التصدير --
  const pngBtn = $('btn-report-png');
  const pdfBtn = $('btn-report-pdf');
  if (pngBtn) pngBtn.addEventListener('click', withBusyLabel(pngBtn, 'جارِ التجهيز…', exportPng));
  if (pdfBtn) pdfBtn.addEventListener('click', withBusyLabel(pdfBtn, 'جارِ التجهيز…', exportPdf));

  // -- العودة للرئيسية (زر في الشريط العلوي وآخر في نهاية التقرير) --
  const homeBtn = $('btn-report-home');
  const homeBtn2 = $('btn-report-home-2');
  if (homeBtn) homeBtn.addEventListener('click', goHome);
  if (homeBtn2) homeBtn2.addEventListener('click', goHome);
}

export function openReportScreen(){
  const root = document.getElementById('app-root');
  if (!root) {
    console.error(
      '[report.js] لم يتم العثور على الحاوية الرئيسية #app-root في الصفحة. ' +
      'تأكد من معرّف حاوية الشاشات الرئيسية في تطبيقكم وعدّله في report.js.'
    );
    return;
  }
  root.innerHTML = REPORT_TEMPLATE;
  try { applyLanguage(); } catch (e) { /* غير حرِج — نكمل حتى لو لم تتوفر */ }
  initReportScreen();
}

window.openReportScreen = openReportScreen;