// components/monthlyMemorizationBulkScreen.js
// =============================================================================
// 🌟 [جديد — يستبدل الفحص لكل طالب على حدة] "تسجيل الحفظ الشهري لكل الطلاب" —
// شاشة كبيرة واحدة (وليست نافذة صغيرة متكررة) تستدعي كل طالب يحتاج تسجيل بداية
// شهر جديد أو نهاية شهر سابق غير مكتمل، واحدًا تلو الآخر، ثم تنتقل تلقائيًا للطالب
// التالي — بالضبط كما طلب المعلم صراحةً بعد أول تجربة لنافذة components/
// monthlyMemorizationPrompt.js (كانت تظهر عند فتح كل ملف طالب على حدة، فتكرّرت
// بإزعاج). هذا الملف الجديد **لا يحذف** monthlyMemorizationPrompt.js ولا يعدّل
// عليه — فقط يعيد استخدام دوال الحساب من engine/memorizationEngine.js وقاعدة
// database/monthlyMemorizationDB.js بنفس الطريقة، ببناء واجهة مستقلة تمامًا.
//
// 🌟🌟 [مُبسَّط — بطلب صريح من المعلم] "بداية الشهر" لم تعد تُطلب من المعلم يدويًا
// كل شهر — تُحسب تلقائيًا = نفس موضع "نهاية الشهر السابق" (راجع buildPendingQueue
// أدناه). المعلم الآن لا يُسأل إلا عن أمرين فقط:
//   (أ) "نقطة البداية الأولى" — مرة واحدة للأبد لكل طالب: إما عند أول استخدام
//       لهذه الميزة لطالب قديم (يظهر تلقائيًا كخطوة "first-time" في هذه الشاشة)،
//       أو عند تسجيل طالب جديد لأول مرة (راجع openInitialPositionForNewStudent
//       أدناه، المستدعاة من student/student.js بعد حفظ بطل جديد مباشرة).
//   (ب) "أين توقف؟" — في بداية كل شهر جديد، عن الشهر الذي انتهى للتو (خطوة
//       "ending" كما كانت بالضبط، بلا أي تغيير في شاشتها).
// أي حالة أخرى (طالب له نهاية شهر سابق مقفولة، ولا يوجد سجل بعد للشهر الحالي)
// تُحل بصمت داخل buildPendingQueue عبر استدعاء saveBeginning تلقائيًا بلا أي
// تفاعل من المعلم — تحقيقًا لمبدأ "المعلم يسجّل الحقائق فقط، والنظام يحسب الباقي".
//
// نقطتا الاستدعاء الرئيسيتان لهذه الشاشة الجماعية:
//   1) تلقائيًا مرة واحدة يوميًا كحد أقصى (وليس عند كل دخول) من الشاشة الرئيسية —
//      راجع maybeAutoOpenMonthlyMemorizationBulk في core/app.js.
//   2) يدويًا في أي وقت من زر "📋 تسجيل الحفظ الشهري لكل الطلاب" في شاشة
//      student/my-students.html — لمعالجة أي طالب تم تخطّيه سابقًا.
// (بالإضافة لنقطة استدعاء ثالثة أحادية الطالب: openInitialPositionForNewStudent)
//
// ⚠️ [افتراض صريح]: "مرة واحدة يوميًا" (وليس مرة واحدة فقط في الشهر كله) — حتى لو
// أنهى المعلم كل الطلاب أول يوم من الشهر، لن تُفتح الشاشة تلقائيًا مرة أخرى بلا
// داعٍ (القائمة ستكون فارغة أصلاً). السبب: لو أجّل المعلم بعض الطلاب (زر "تخطٍّ")،
// نذكّره تلقائيًا في اليوم التالي بدل تركه ينسى نهائيًا حتى الشهر القادم — توازن
// بين "لا تزعج" و"لا تنسَ" بدل عدم التذكير إطلاقًا بعد أول تأجيل.
// =============================================================================

import { AppState, t } from '../core/app.js';
import { esc } from '../core/escape.js';
import {
  calcMemorizationProgress,
  isValidPosition,
  getSurahsInMemorizationOrder,
  getSurahInfo,
  defaultStartingPosition
} from '../engine/memorizationEngine.js';

const STYLE_ID = 'mmb-styles';
const AUTO_SHOWN_FLAG_KEY = 'darham_monthly_memo_bulk_last_auto_shown';

function ensureStylesInjected() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.mmb-overlay {
  position: fixed; inset: 0; background: #0d1b16; z-index: 10000;
  display: flex; align-items: center; justify-content: center; padding: 24px;
  box-sizing: border-box; font-family: 'Tajawal', sans-serif;
}
.mmb-screen {
  background: #fffdf6; border-radius: 26px; max-width: 620px; width: 100%;
  padding: 0; box-shadow: 0 30px 70px rgba(0,0,0,0.45);
  border: 3px solid var(--dh-gold-500, #d4af37);
  max-height: 92vh; overflow-y: auto; direction: rtl;
}
.mmb-screen[dir="ltr"] { direction: ltr; }
.mmb-header {
  background: linear-gradient(135deg, var(--dh-emerald-700, #0d5c46), #0a4736);
  color: #fff; padding: 22px 30px; text-align: center;
  border-radius: 22px 22px 0 0;
}
.mmb-header-title { margin: 0 0 6px 0; font-size: 1.5rem; font-weight: 800; }
.mmb-progress-track { background: rgba(255,255,255,0.2); border-radius: 999px; height: 8px; margin-top: 14px; overflow: hidden; }
.mmb-progress-fill { background: var(--dh-gold-500, #d4af37); height: 100%; border-radius: 999px; transition: width .3s ease; }
.mmb-progress-text { margin-top: 8px; font-size: 0.9rem; opacity: 0.9; }
.mmb-body { padding: 28px 30px; }
.mmb-student-row { display: flex; align-items: center; gap: 14px; margin-bottom: 20px; }
.mmb-avatar {
  width: 58px; height: 58px; border-radius: 50%; background: #f0fdf4;
  border: 3px solid var(--dh-emerald-700, #0d5c46); display: flex; align-items: center;
  justify-content: center; font-size: 1.6rem; font-weight: 800; color: var(--dh-emerald-700, #0d5c46);
  overflow: hidden; flex-shrink: 0;
}
.mmb-avatar img { width: 100%; height: 100%; object-fit: cover; }
.mmb-student-name { font-size: 1.35rem; font-weight: 800; color: #1e293b; margin: 0; }
.mmb-student-kind { font-size: 0.9rem; color: #92400e; font-weight: 700; margin: 2px 0 0 0; }
.mmb-field { margin-bottom: 16px; }
.mmb-field label { display: block; font-weight: 700; color: #3a2c1f; margin-bottom: 6px; font-size: 1rem; }
.mmb-field select, .mmb-field input[type="number"] {
  width: 100%; box-sizing: border-box; padding: 12px 14px; border-radius: 12px;
  border: 2px solid #e2d9c4; font-size: 1.1rem; font-family: inherit; background: #fff;
}
.mmb-field select:focus, .mmb-field input:focus { outline: none; border-color: var(--dh-gold-500, #d4af37); }
.mmb-hint { font-size: 0.85rem; color: #92400e; margin-top: 4px; }
.mmb-warning {
  background: #fef2f2; border: 2px solid #fca5a5; color: #991b1b; border-radius: 12px;
  padding: 12px 14px; font-size: 0.92rem; margin-bottom: 16px; line-height: 1.7;
}
.mmb-journey { background: #f0fdf4; border: 2px dashed var(--dh-emerald-700, #0d5c46); border-radius: 14px; padding: 16px; margin-bottom: 16px; text-align: center; }
.mmb-journey-row { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; font-size: 1.1rem; font-weight: 700; color: #1e293b; }
.mmb-journey-arrow { color: var(--dh-gold-500, #d4af37); font-size: 1.3rem; }
.mmb-journey-new { margin-top: 10px; font-size: 1.35rem; font-weight: 800; color: var(--dh-emerald-700, #0d5c46); }
.mmb-actions { display: flex; gap: 10px; margin-top: 22px; }
.mmb-btn {
  flex: 1; padding: 13px 14px; border-radius: 12px; border: none; font-size: 1.02rem;
  font-weight: 800; cursor: pointer; font-family: inherit; transition: transform .1s ease;
}
.mmb-btn:active { transform: scale(0.98); }
.mmb-btn-primary { background: var(--dh-emerald-700, #0d5c46); color: #fff; }
.mmb-btn-primary:disabled { background: #cbd5e1; cursor: not-allowed; }
.mmb-btn-ghost { background: #f1f5f9; color: #334155; }
.mmb-btn-skip { background: #fff7ed; color: #9a3412; }
.mmb-done-wrap { text-align: center; padding: 20px 10px; }
.mmb-done-emoji { font-size: 3.2rem; margin-bottom: 10px; }
.mmb-done-title { font-size: 1.4rem; font-weight: 800; color: var(--dh-emerald-700, #0d5c46); margin-bottom: 8px; }
.mmb-done-desc { color: #6b6252; font-size: 1rem; margin-bottom: 22px; }
`;
  document.head.appendChild(style);
}

function surahOptionsHtml(surahsData, selectedNumber) {
  return getSurahsInMemorizationOrder(surahsData)
    .map(s => `<option value="${s.number}" ${s.number === selectedNumber ? 'selected' : ''}>${s.name}</option>`)
    .join('');
}

function studentAvatarHtml(student) {
  const name = (student.name || '؟').trim();
  const avatar = student.avatar || '';
  if (avatar && avatar.length >= 10) return `<img src="${avatar}" alt="${name}">`;
  if (avatar) return avatar;
  return name.charAt(0) || '★';
}

// 🌟 نفس خط الرجوع المستخدم في monthlyMemorizationPrompt.js بالحرف — راجع هناك
// للتوثيق الكامل لسبب استخدام آية 1 كافتراض عند غياب أي بيانة دقيقة سابقة.
function guessPositionFromLegacyMemoField(surahsData, surahName) {
  if (!surahName) return null;
  const match = (surahsData || []).find(s => s.name === surahName || s.name.includes(surahName) || surahName.includes(s.name));
  if (!match) return null;
  return { surahNumber: match.number, ayahNumber: 1 };
}

/**
 * يبني قائمة الإجراءات المطلوبة لكل الطلاب النشطين حاليًا. ثلاث حالات فقط:
 *   1) "نهاية شهر سابق غير مكتمل" (أولوية أعلى لو وُجدت) — خطوة "ending" تُعرض
 *      للمعلم كما هي بالضبط.
 *   2) لا يوجد أي سجل إطلاقًا لهذا الطالب من قبل (أول استخدام للميزة) — خطوة
 *      "first-time" تُعرض للمعلم مرة واحدة فقط في حياة الطالب مع هذه الميزة.
 *   3) لا يوجد سجل للشهر الحالي، لكن يوجد سجل سابق مقفول (نهاية شهر معروفة) —
 *      🌟 [مُبسَّط] لا نسأل المعلم شيئًا هنا إطلاقًا؛ نحفظ "بداية الشهر الحالي"
 *      تلقائيًا بنفس موضع "نهاية الشهر السابق" بصمت (saveBeginning)، ولا نضيف
 *      أي عنصر لقائمة الانتظار — ستظهر "نهاية" هذا الشهر تلقائيًا كحالة (1) في
 *      بداية الشهر التالي، وهكذا تُبنى السلسلة شهرًا بعد شهر بلا أي تكرار سؤال.
 * طالب واحد ← إجراء واحد فقط (تفاعلي) في كل بناء (بعد إتمامه، لو احتاج إجراءً
 * آخر، يظهر في المرة التالية التي تُبنى فيها القائمة — راجع runQueue أدناه).
 */
async function buildPendingQueue() {
  const mgr = AppState.monthlyMemorizationManager;
  if (!mgr || !AppState.surahsData || !AppState.surahsData.length) return [];
  const students = await AppState.studentManager.getAllStudents();
  const activeStudents = students.filter(s => !s.isHidden);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  const queue = [];
  for (const student of activeStudents) {
    const records = await mgr.getAllForStudent(student.id);

    const pastUnfinished = records
      .filter(r => (r.year < curYear || (r.year === curYear && r.month < curMonth)) && r.beginning && !r.ending)
      .sort((a, b) => (b.year - a.year) || (b.month - a.month));
    if (pastUnfinished.length) {
      const rec = pastUnfinished[0];
      queue.push({
        type: 'ending', student, year: rec.year, month: rec.month,
        beginningPosition: { surahNumber: rec.beginning.surahNumber, ayahNumber: rec.beginning.ayahNumber }
      });
      continue;
    }

    const currentRecord = records.find(r => r.year === curYear && r.month === curMonth);
    if (currentRecord && currentRecord.beginning) continue; // هذا الشهر جاهز فعلاً، لا شيء مطلوب الآن

    const latestLocked = [...records].reverse().find(r => r.locked && r.ending);
    if (latestLocked) {
      // 🌟 بداية الشهر الحالي = نهاية الشهر السابق، بلا سؤال المعلم (راجع تعليق الدالة أعلاه)
      await mgr.saveBeginning(student.id, curYear, curMonth, {
        surahNumber: latestLocked.ending.surahNumber, ayahNumber: latestLocked.ending.ayahNumber
      });
      continue;
    }

    // 🌟 [تحديث] سجل يحمل "مراجعة" فقط (بلا بداية ولا نهاية) لا يُعدّ سجل حفظ — راجع saveReview
    if (!records.some(r => r.beginning || r.ending)) {
      // أول استخدام إطلاقًا لهذا الطالب مع الميزة — نطلب نقطة البداية الأولى مرة واحدة فقط
      const prefill = guessPositionFromLegacyMemoField(AppState.surahsData, student.memoFrom) || defaultStartingPosition();
      queue.push({ type: 'first-time', student, year: curYear, month: curMonth, prefill });
    }
    // records.length > 0 بلا أي سجل مقفول: حالة نادرة (بداية مسجّلة سابقًا بلا أي
    // نهاية بعد لأي شهر) — مغطاة بالفعل عبر pastUnfinished أعلاه لأقرب شهر سابق.
  }
  return queue;
}

function closeOverlay(overlay) {
  if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
}

function renderHeader(overlay, index, total) {
  const pct = total ? Math.round((index / total) * 100) : 0;
  overlay.querySelector('#mmb-progress-fill').style.width = pct + '%';
  overlay.querySelector('#mmb-progress-text').textContent = t('mmb_progress').replace('{i}', index + 1).replace('{n}', total);
}

/**
 * يعرض خطوة واحدة (لطالب واحد) داخل الشاشة الكبيرة نفسها — بلا فتح أي نافذة
 * منفصلة، فقط تحديث محتوى #mmb-body. يرجع Promise تُحل بـ:
 *   {action:'saved'} بعد الحفظ بنجاح، {action:'skipped'} لو ضغط المعلم "تخطٍّ".
 */
// 🌟 [بُنية] خطوة واحدة (طالب واحد) قد تحتاج شاشتين فرعيتين متتاليتين لنوع
// "نهاية الشهر" (اختيار الموضع ← ثم تأكيد الحساب)، أو شاشة واحدة فقط لنوع "بداية
// الشهر". بُنيت كدالة داخلية قابلة للاستدعاء الذاتي (showPicker) بدل تكرار كود
// بناء نموذج الاختيار مرتين (مرة أول ظهور، ومرة عند الضغط على "رجوع للتعديل")،
// تجنبًا لأي تكرار أو تضارب في ربط الأحداث (event listeners).
function runStep(overlay, item) {
  const surahsData = AppState.surahsData || [];
  const body = overlay.querySelector('#mmb-body');
  const isEnding = item.type === 'ending';
  const initialPosition = isEnding ? item.beginningPosition : item.prefill;

  return new Promise((resolve) => {
    function showPicker(prefill) {
      body.innerHTML = `
        <div class="mmb-student-row">
          <div class="mmb-avatar">${studentAvatarHtml(item.student)}</div>
          <div>
            <p class="mmb-student-name">${esc(item.student.name || '')}</p>
            <p class="mmb-student-kind">${isEnding ? t('mmp_ending_title') : t('mmb_firsttime_title')} — ${item.month}/${item.year}</p>
          </div>
        </div>
        ${item.lateHint ? `<div class="mmb-warning" style="background:#fffbeb;border-color:#fcd34d;color:#92400e;">📌 ${item.lateHint}</div>` : ''}
        <div class="mmb-field">
          <label>${t('mmp_surah_label')}</label>
          <select id="mmb-surah-select">${surahOptionsHtml(surahsData, prefill.surahNumber)}</select>
        </div>
        <div class="mmb-field">
          <label>${t('mmp_ayah_label')}</label>
          <input type="number" id="mmb-ayah-input" min="1" value="${prefill.ayahNumber}">
          <div class="mmb-hint" id="mmb-ayah-hint"></div>
        </div>
        <div class="mmb-actions">
          <button class="mmb-btn mmb-btn-skip" id="mmb-btn-skip">${t('mmb_skip_btn')}</button>
          <button class="mmb-btn mmb-btn-primary" id="mmb-btn-next">${isEnding ? t('mmp_next_btn') : t('mmp_confirm_btn')}</button>
        </div>
      `;
      const surahSelect = body.querySelector('#mmb-surah-select');
      const ayahInput = body.querySelector('#mmb-ayah-input');
      const ayahHint = body.querySelector('#mmb-ayah-hint');

      function updateBounds() {
        const surahNumber = parseInt(surahSelect.value, 10);
        const info = getSurahInfo(surahsData, surahNumber);
        const max = info ? info.ayahsCount : 1;
        ayahInput.max = String(max);
        ayahHint.textContent = t('mmp_ayah_range_hint').replace('{max}', max);
        if (parseInt(ayahInput.value, 10) > max) ayahInput.value = String(max);
      }
      surahSelect.addEventListener('change', updateBounds);
      updateBounds();

      body.querySelector('#mmb-btn-skip').addEventListener('click', () => resolve({ action: 'skipped' }));
      body.querySelector('#mmb-btn-next').addEventListener('click', async () => {
        const surahNumber = parseInt(surahSelect.value, 10);
        const ayahNumber = parseInt(ayahInput.value, 10);
        if (!isValidPosition(surahsData, surahNumber, ayahNumber)) {
          alert(t('mmp_invalid_ayah'));
          return;
        }
        const position = { surahNumber, ayahNumber };

        if (!isEnding) {
          // بداية الشهر: حفظ مباشر بلا شاشة تأكيد إضافية
          await AppState.monthlyMemorizationManager.saveBeginning(item.student.id, item.year, item.month, position);
          resolve({ action: 'saved' });
          return;
        }
        showEndConfirm(position);
      });
    }

    function showEndConfirm(position) {
      const result = calcMemorizationProgress(surahsData, item.beginningPosition, position);
      const beginInfo = getSurahInfo(surahsData, item.beginningPosition.surahNumber);
      const endInfo = getSurahInfo(surahsData, position.surahNumber);
      const beginLabel = `${beginInfo ? beginInfo.name : '؟'} — ${item.beginningPosition.ayahNumber}`;
      const endLabel = `${endInfo ? endInfo.name : '؟'} — ${position.ayahNumber}`;

      body.innerHTML = `
        <div class="mmb-student-row">
          <div class="mmb-avatar">${studentAvatarHtml(item.student)}</div>
          <div>
            <p class="mmb-student-name">${esc(item.student.name || '')}</p>
            <p class="mmb-student-kind">${t('mmp_confirm_screen_title')} — ${item.month}/${item.year}</p>
          </div>
        </div>
        ${!result.valid ? `<div class="mmb-warning">⚠️ ${t('mmp_warning_backward')}</div>` : ''}
        <div class="mmb-journey">
          <div class="mmb-journey-row">
            <span>${beginLabel}</span><span class="mmb-journey-arrow">${AppState.currentLang === 'ar' ? '⬅️' : '➡️'}</span><span>${endLabel}</span>
          </div>
          ${result.valid ? `<div class="mmb-journey-new">${t('mmp_new_ayahs_label')}: ${result.newAyahs} ${t('mmp_ayahs_unit')}</div>` : ''}
        </div>
        <div class="mmb-actions">
          <button class="mmb-btn mmb-btn-ghost" id="mmb-btn-back">${t('mmp_back_btn')}</button>
          <button class="mmb-btn mmb-btn-primary" id="mmb-btn-save" ${!result.valid ? 'disabled' : ''}>${t('mmp_confirm_save_btn')}</button>
        </div>
      `;
      body.querySelector('#mmb-btn-back').addEventListener('click', () => showPicker(position));
      if (result.valid) {
        body.querySelector('#mmb-btn-save').addEventListener('click', async () => {
          await AppState.monthlyMemorizationManager.saveEnding(item.student.id, item.year, item.month, position, result.newAyahs);
          resolve({ action: 'saved' });
        });
      }
    }

    showPicker(initialPosition);
  });
}

function renderDoneScreen(overlay) {
  const body = overlay.querySelector('#mmb-body');
  body.innerHTML = `
    <div class="mmb-done-wrap">
      <div class="mmb-done-emoji">🎉</div>
      <div class="mmb-done-title">${t('mmb_done_title')}</div>
      <div class="mmb-done-desc">${t('mmb_done_desc')}</div>
      <button class="mmb-btn mmb-btn-primary" id="mmb-btn-close" style="width:100%;">${t('mmb_close_btn')}</button>
    </div>
  `;
  overlay.querySelector('#mmb-btn-close').addEventListener('click', () => closeOverlay(overlay));
}

function renderNothingPendingScreen(overlay) {
  const body = overlay.querySelector('#mmb-body');
  body.innerHTML = `
    <div class="mmb-done-wrap">
      <div class="mmb-done-emoji">✅</div>
      <div class="mmb-done-desc">${t('mmb_nothing_pending')}</div>
      <button class="mmb-btn mmb-btn-primary" id="mmb-btn-close" style="width:100%;">${t('mmb_close_btn')}</button>
    </div>
  `;
  overlay.querySelector('#mmb-btn-close').addEventListener('click', () => closeOverlay(overlay));
}

async function runQueue(overlay, queue) {
  for (let i = 0; i < queue.length; i++) {
    renderHeader(overlay, i, queue.length);
    // eslint-disable-next-line no-await-in-loop
    await runStep(overlay, queue[i]);
    if (!overlay.parentNode) return; // المعلم أغلق الشاشة يدويًا في المنتصف
  }
  renderHeader(overlay, queue.length, queue.length);
  renderDoneScreen(overlay);
}

function buildOverlayShell() {
  ensureStylesInjected();
  const overlay = document.createElement('div');
  overlay.className = 'mmb-overlay';
  overlay.innerHTML = `
    <div class="mmb-screen" dir="${AppState.currentLang === 'ar' ? 'rtl' : 'ltr'}">
      <div class="mmb-header">
        <h2 class="mmb-header-title">${t('mmb_title')}</h2>
        <div class="mmb-progress-track"><div class="mmb-progress-fill" id="mmb-progress-fill" style="width:0%"></div></div>
        <div class="mmb-progress-text" id="mmb-progress-text"></div>
      </div>
      <div class="mmb-body" id="mmb-body"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  return overlay;
}

/**
 * فتح الشاشة يدويًا — يُستخدم من زر "📋 تسجيل الحفظ الشهري لكل الطلاب" في
 * student/my-students.html. يعرض دائمًا (حتى لو القائمة فارغة، برسالة واضحة).
 */
export async function openMonthlyMemorizationBulkScreen() {
  try {
    const queue = await buildPendingQueue();
    const overlay = buildOverlayShell();
    if (!queue.length) {
      renderHeader(overlay, 0, 0);
      renderNothingPendingScreen(overlay);
      return;
    }
    await runQueue(overlay, queue);
  } catch (e) {
    console.error('[monthlyMemorizationBulkScreen.js] تعذر فتح شاشة الحفظ الشهري الجماعية:', e);
  }
}

/**
 * 🌟 [جديد] "نقطة البداية الأولى" لطالب جديد فقط — تُستدعى مرة واحدة مباشرة بعد
 * حفظ بطل جديد بنجاح في student/student.js (راجع setupMyStudentsListeners هناك).
 * خطوة واحدة فقط، قابلة للتخطي ("لاحقًا")، ولا تُجبر المعلم على إدخالها فورًا —
 * لو تخطّاها الآن، ستظهر له تلقائيًا لاحقًا كخطوة "first-time" في الشاشة الجماعية
 * (buildPendingQueue أعلاه، طالما لم يُسجَّل للطالب أي شيء إطلاقًا بعد).
 */
export async function openInitialPositionForNewStudent(student) {
  try {
    if (!AppState.monthlyMemorizationManager || !AppState.surahsData || !AppState.surahsData.length) return;
    const now = new Date();
    const prefill = guessPositionFromLegacyMemoField(AppState.surahsData, student.memoFrom) || defaultStartingPosition();
    const item = { type: 'first-time', student, year: now.getFullYear(), month: now.getMonth() + 1, prefill };
    const overlay = buildOverlayShell();
    renderHeader(overlay, 0, 1);
    await runStep(overlay, item);
    closeOverlay(overlay);
  } catch (e) {
    console.error('[monthlyMemorizationBulkScreen.js] تعذر عرض شاشة نقطة البداية الأولى للطالب الجديد:', e);
  }
}

/**
 * الفحص التلقائي — يُستدعى مرة واحدة عند إقلاع المنصة (راجع core/app.js). لا يعرض
 * شيئًا إطلاقًا لو: (أ) لا يوجد أي طالب معلَّق، أو (ب) سبق العرض تلقائيًا اليوم
 * بالفعل (راجع تعليق أعلى الملف لسبب "يوميًا" تحديدًا بدل "مرة كل الشهر").
 */
export async function maybeAutoOpenMonthlyMemorizationBulk() {
  try {
    const todayKey = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    let lastShown = null;
    try { lastShown = localStorage.getItem(AUTO_SHOWN_FLAG_KEY); } catch (e) { /* تجاهل */ }
    if (lastShown === todayKey) return;

    const queue = await buildPendingQueue();
    if (!queue.length) return;

    try { localStorage.setItem(AUTO_SHOWN_FLAG_KEY, todayKey); } catch (e) { /* تجاهل */ }

    const overlay = buildOverlayShell();
    await runQueue(overlay, queue);
  } catch (e) {
    console.error('[monthlyMemorizationBulkScreen.js] تعذر الفحص التلقائي للحفظ الشهري:', e);
  }
}


/**
 * 🌟 [جديد] تسجيل/تعديل "آخر سورة وآية" لشهر محدَّد لطالب واحد — تُستدعى من مركز
 * التقارير الشهرية (components/monthlyReportsHub.js) بزر "سجّل الآن"/"تعديل". تعيد استخدام
 * runStep نفسها بلا أي تغيير في منطقها، فتُحسب الآيات الجديدة وتُقفل الشهر بنفس الطريقة.
 * ترجع true لو حُفظت النهاية فعلًا، وfalse لو تخطّى المعلم أو تعذّر السجل.
 *  • لو الشهر مسجَّل النهاية سابقًا (تعديل): يُفتح القفل مؤقتًا، وإن تخطّى المعلم تُعاد
 *    النهاية القديمة كما كانت بالضبط (لا يبقى الشهر مفتوحًا بصمت فيتعطّل ربط الأشهر).
 *  • لو لا بداية مسجَّلة: تؤخذ من نهاية أقرب شهر سابق مقفول (بصمت)، وإلا تُطلب "نقطة
 *    البداية الأولى" أولًا (الخطوة first-time المعتادة) ثم خطوة النهاية.
 *  • بعد الحفظ: لو للشهر التالي سجل غير مقفول تُحدَّث بدايته لتساوي هذه النهاية (سلسلة الأشهر).
 * ⚠️ [افتراض صريح] لو كان الشهر ماضيًا يظهر تنبيه "هذا موضعه عند نهاية ذلك الشهر لا اليوم".
 */
export async function openMonthEndingForStudent(student, year, month) {
  const mgr = AppState.monthlyMemorizationManager;
  const surahsData = AppState.surahsData;
  if (!mgr || !student || !Array.isArray(surahsData) || !surahsData.length) return false;
  let overlay = null;
  let oldEnding = null;
  let oldNew = null;
  try {
    let rec = await mgr.getRecord(student.id, year, month);
    if (rec && rec.ending) {
      oldEnding = { surahNumber: rec.ending.surahNumber, ayahNumber: rec.ending.ayahNumber };
      oldNew = rec.newAyahs;
      await mgr.unlockRecordForEdit(student.id, year, month);
      rec = await mgr.getRecord(student.id, year, month);
    }

    const now = new Date();
    const isPast = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
    const lateHint = isPast ? t('mmb_late_hint').replace('{month}', month).replace('{year}', year) : '';

    let beginPos = rec && rec.beginning ? { surahNumber: rec.beginning.surahNumber, ayahNumber: rec.beginning.ayahNumber } : null;
    if (!beginPos) {
      const all = await mgr.getAllForStudent(student.id);
      const before = all
        .filter(r => r.locked && r.ending && (r.year < year || (r.year === year && r.month < month)))
        .sort((a, b) => (b.year - a.year) || (b.month - a.month))[0];
      if (before) {
        beginPos = { surahNumber: before.ending.surahNumber, ayahNumber: before.ending.ayahNumber };
        await mgr.saveBeginning(student.id, year, month, beginPos);
      }
    }

    overlay = buildOverlayShell();
    renderHeader(overlay, 0, 1);

    if (!beginPos) {
      const prefill = guessPositionFromLegacyMemoField(surahsData, student.memoFrom) || defaultStartingPosition();
      const first = await runStep(overlay, { type: 'first-time', student, year, month, prefill, lateHint });
      if (!first || first.action !== 'saved') { closeOverlay(overlay); return false; }
      const r2 = await mgr.getRecord(student.id, year, month);
      beginPos = r2 && r2.beginning ? { surahNumber: r2.beginning.surahNumber, ayahNumber: r2.beginning.ayahNumber } : prefill;
    }

    const result = await runStep(overlay, { type: 'ending', student, year, month, beginningPosition: beginPos, lateHint });
    closeOverlay(overlay);
    overlay = null;
    if (!result || result.action !== 'saved') {
      if (oldEnding) await mgr.saveEnding(student.id, year, month, oldEnding, oldNew); // إعادة القفل كما كان
      return false;
    }

    // سلسلة الأشهر: بداية الشهر التالي (لو سجله غير مقفول) = هذه النهاية الجديدة
    const saved = await mgr.getRecord(student.id, year, month);
    const ny = month === 12 ? year + 1 : year;
    const nm = month === 12 ? 1 : month + 1;
    const nextRec = await mgr.getRecord(student.id, ny, nm);
    if (saved && saved.ending && nextRec && !nextRec.locked) {
      await mgr.saveBeginning(student.id, ny, nm, { surahNumber: saved.ending.surahNumber, ayahNumber: saved.ending.ayahNumber });
    }
    return true;
  } catch (e) {
    console.error('[monthlyMemorizationBulkScreen.js] تعذر تسجيل نهاية الشهر لطالب واحد:', e);
    if (overlay) closeOverlay(overlay);
    try { if (oldEnding) await mgr.saveEnding(student.id, year, month, oldEnding, oldNew); } catch (e2) { /* تجاهل */ }
    return false;
  }
}
