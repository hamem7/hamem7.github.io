// components/reciteRangePicker.js
// 🌟 [جديد] تحديد "موضع الخطأ بالتحديد" (من آية ... إلى آية ...) في أسئلة التسميع.
//
// المشكلة: سؤال التسميع قد يكون سورة كاملة (أو مقطعاً من 6-10 آيات)، وعند تسجيل ملاحظة
// كانت تُخزَّن فقط عبارة عامة مثل "تسميع سورة المطففين كاملة" + نوع الخطأ (خطأ كلمة)،
// فلا يعرف المعلم في شاشة "علاج الخطأ السابق" أين وقع الخطأ بالضبط.
//
// الحل: داخل نافذة "تسجيل ملاحظة" يظهر (لأسئلة التسميع فقط) صندوق اختياري فيه قائمتان
// "من آية ... إلى آية ..."، وما يختاره المعلم يُخزَّن مع الخطأ، وتُعاد صياغة السؤال في شاشة
// العلاج ليطلب من الطالب تسميع هذا الموضع تحديداً (بدل السورة كلها).
//
// ⚠️ افتراض صريح: التحديد على مستوى الآية (وليس الكلمة)، ومن بين آيات مقطع التسميع
// المعروض فعلاً للطالب في هذا السؤال. لو لم يختر المعلم شيئاً يبقى السلوك القديم كما هو
// بالضبط (بيانات اختيارية لا تُطلب إجباريًا).
//
// الملف مشترك بين ركن الكبار (games/adultGame.js) وركن الأطفال (games/kidsGame.js) حتى
// لا نكرر المنطق نفسه في الملفين.

import { t } from '../core/app.js';

// 🌟 هل السؤال الحالي سؤال تسميع ويملك قائمة آياته (reciteAyahs من quranEngine.generateReciteGame)؟
export function isReciteQuestion(cd) {
    return !!cd && (cd.type === 'recite' || cd.type === 'kids_recite')
        && Array.isArray(cd.reciteAyahs) && cd.reciteAyahs.length > 0;
}

// 🌟 يُستدعى عند فتح نافذة "تسجيل ملاحظة": يُظهر الصندوق ويملأ القائمتين لأسئلة التسميع،
// ويُخفيه تماماً لأي نوع سؤال آخر (فلا يتأثر أي سؤال آخر إطلاقاً)
export function prepareReciteRangeBox(cd) {
    const box = document.getElementById('recite-range-box');
    if (!box) return;
    if (!isReciteQuestion(cd)) { box.style.display = 'none'; return; }

    const fromSel = document.getElementById('recite-range-from');
    const toSel = document.getElementById('recite-range-to');
    if (!fromSel || !toSel) { box.style.display = 'none'; return; }

    const ayahWord = t('recite_range_ayah');
    let opts = `<option value="">${t('recite_range_any')}</option>`;
    cd.reciteAyahs.forEach(a => {
        const preview = (a.text || '').split(/\s+/).slice(0, 3).join(' ');
        opts += `<option value="${a.num}">${ayahWord} ${a.num} — ${preview} …</option>`;
    });
    fromSel.innerHTML = opts;
    toSel.innerHTML = opts;
    fromSel.value = '';
    toSel.value = '';
    box.style.display = 'block';
}

// 🌟 قراءة اختيار المعلم: يرجع { from, to } (أرقام الآيات في السورة، from <= to) أو null لو لم يختر شيئاً.
// لو اختار طرفاً واحداً فقط يُعتبر الموضع آية واحدة، ولو عكس الترتيب نصحّحه تلقائياً
export function readReciteRangeSelection() {
    const box = document.getElementById('recite-range-box');
    if (!box || box.style.display === 'none') return null; // غير تسميع → لا موضع
    const fromSel = document.getElementById('recite-range-from');
    const toSel = document.getElementById('recite-range-to');
    if (!fromSel || !toSel) return null;
    let from = parseInt(fromSel.value, 10);
    let to = parseInt(toSel.value, 10);
    if (isNaN(from) && isNaN(to)) return null;
    if (isNaN(from)) from = to;
    if (isNaN(to)) to = from;
    if (from > to) { const tmp = from; from = to; to = tmp; }
    return { from, to };
}

// 🌟 وصف نصي قصير للموضع: "من آية 3 إلى آية 5" أو "آية 3" لو آية واحدة
export function describeReciteRange(r) {
    if (r.from === r.to) return `${t('recite_range_ayah')} ${r.from}`;
    return `${t('recite_range_from')} ${t('recite_range_ayah')} ${r.from} ${t('recite_range_to')} ${t('recite_range_ayah')} ${r.to}`;
}

// 🌟 نص الأخطاء المؤقتة (الشريحة الحمراء) المرتبط بالموضع، ويدخل ضمن errorTypes فيظهر أيضاً في التقرير
export function reciteRangeChipText(r) {
    return `📍 ${t('recite_range_label')} ${describeReciteRange(r)}`;
}

// 🌟 نصف الآية الأول/الأخير كتلميح (نفس أسلوب سؤال التسميع الأصلي في quranEngine)
function firstHalf(text) {
    const w = (text || '').split(/\s+/);
    return w.length > 3 ? w.slice(0, Math.ceil(w.length / 2)).join(' ') + ' ....' : text + ' ....';
}
function lastHalf(text) {
    const w = (text || '').split(/\s+/);
    return w.length > 3 ? '.... ' + w.slice(Math.floor(w.length / 2)).join(' ') : '.... ' + text;
}

// 🌟 يبني بيانات الخطأ المخزَّنة لسؤال تسميع تم تحديد موضع الخطأ فيه:
//   reportText   نص موجز (يميّز هذا الموضع عن غيره فلا يُدمج مع خطأ آخر في نفس السورة)
//   num          أول آية في الموضع (تظهر في "( سورة X - آية N )")
//   questionBody السؤال المعاد صياغته لشاشة "علاج الخطأ السابق" (يطلب تسميع الموضع فقط)
//   fullAnswer   نص الآيات الصحيحة للموضع (للمطابقة عبر زر "إظهار الإجابة")
//   ranges       المواضع الخام (للتوثيق/الأرشيف/التقارير لاحقاً)
export function buildReciteRangeRecord(cd, ranges) {
    const byNum = new Map(cd.reciteAyahs.map(a => [a.num, a.text]));
    const surahName = cd.reciteSurahName || (cd.ayahObj && cd.ayahObj.surahName) || '';
    const accent = cd.type === 'kids_recite' ? '#0d5c46' : '#156643';

    const boxes = [];
    const answers = [];
    const stored = [];
    ranges.forEach(r => {
        const nums = [];
        for (let n = r.from; n <= r.to; n++) if (byNum.has(n)) nums.push(n);
        if (nums.length === 0) return;
        const startText = byNum.get(nums[0]);
        const endText = byNum.get(nums[nums.length - 1]);
        const label = describeReciteRange(r);
        let inner;
        if (nums.length === 1) {
            inner = `<div style="font-size:1.4rem; margin-bottom:10px;">${t('recite_range_start_from')}</div>` +
                `<div class="quran-text" style="font-size:3.2rem; color:${accent};">﴿\u00A0${firstHalf(startText)}\u00A0﴾</div>`;
        } else {
            inner = `<div style="font-size:1.4rem; margin-bottom:10px;">${t('recite_range_start_from')}</div>` +
                `<div class="quran-text" style="font-size:3.2rem; margin-bottom:25px; color:${accent};">﴿\u00A0${firstHalf(startText)}\u00A0﴾</div>` +
                `<div style="font-size:1.4rem; margin-bottom:10px;">${t('recite_range_end_at')}</div>` +
                `<div class="quran-text" style="font-size:3.2rem; color:${accent};">﴿\u00A0${lastHalf(endText)}\u00A0﴾</div>`;
        }
        boxes.push(`<div style="background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 12px; padding: 25px 40px; text-align: center; max-width: 800px; margin: 15px auto 0;">` +
            `<div style="font-size:1.6rem; font-weight:bold; margin-bottom:20px;">${t('recite_range_q_prefix')} ${label} — ${surahName ? `${t('recite_range_surah')} [ ${surahName} ]` : ''}</div>` +
            inner + `</div>`);
        answers.push(nums.map(n => ` ﴿\u00A0${byNum.get(n)}\u00A0﴾ `).join(''));
        stored.push({ from: r.from, to: r.to, label });
    });

    if (stored.length === 0) return null;
    const rangeDesc = stored.map(s => s.label).join('، ');
    return {
        reportText: `${cd.reportText} (${rangeDesc})`,
        num: stored[0].from,
        questionBody: boxes.join(''),
        fullAnswer: answers.join(' … '),
        ranges: stored
    };
}
