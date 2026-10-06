// reports/hwCertificate.js
// ==========================================================
// 🌟🌟 [جديد] شهادة تقدير تظهر فور اعتماد المعلم للدرجة النهائية لأي تسليم واجب
// ==========================================================
// نقطة الاستدعاء الوحيدة: saveManualGrades() في settings/homework-prep.js، مباشرة بعد نجاح
// gradeSubmissionOnServer (اعتماد مؤكَّد من الخادم). تعرض: اسم الطالب وصورته (إن وُجدت في سجله)،
// الدرجة النهائية، كلمة تشجيعية تتدرَّج حسب مستوى الدرجة، وقائمة الأسئلة التي أخطأ فيها الطالب
// إن وُجدت. زرّان: حفظ كصورة (html2canvas — نفس مكتبة reports/report.js بالضبط، بلا أي مكتبة
// جديدة) ومشاركة عبر واتساب (Web Share API مع الصورة كملف مرفَق لو دعمها المتصفح، وإلا تنزيل
// الصورة + توجيه المعلم لإرفاقها يدوياً في واتساب — واتساب لا يقبل صورة جاهزة عبر رابط wa.me
// إطلاقاً بأي حال).
//
// 🌟 العزل التقني: ملف مستقل تماماً (بادئة CSS/DOM خاصة به hwcert-)، بلا استيراد أو لمس أي
// سطر من reports/report.js أو reports/dual-test-report.js — نفس فلسفة العزل المتّبعة فعلاً في
// كل ملفات التقارير بالمنصة، حتى لو كرّرنا هنا تحميل html2canvas محلياً.
import { t, surahNameLocal, isSurahName, localizeHomeworkText } from '../core/i18n.js';
// 🌟 [جديد — إصلاح XSS] تنظيف اسم الطالب وإجاباته (قادمة من الخادم) قبل الحقن في innerHTML
import { esc } from '../core/escape.js';
// 🌟 ملف المعلم (الاسم + الختم) من AppState — نفس مصدر reports/dual-test-report.js، مع حماية لو لم يُحمَّل بعد
import { AppState } from '../core/app.js';

// ------------------------------------------------------------
// تحميل html2canvas من cdnjs — نفس الرابط والنسخة المستخدمة بالضبط في reports/report.js
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
async function ensureHtml2Canvas() {
    if (!window.html2canvas) await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
}

// ------------------------------------------------------------
// تدرّج الدرجة → لون/كلمة تشجيعية — نفس حدود getTier في reports/report.js بالحرف (>=90/75/60)
// حتى تبقى تصنيفات "ممتاز/جيد/متوسط" موحّدة في كل تقارير المنصة، بلا استيراد مباشر (عزل الملف).
// ------------------------------------------------------------
function getTier(score) {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'average';
    return 'weak';
}

function getStudentAvatar(student) {
    if (!student) return null;
    return student.avatar || student.image || student.photo || student.profilePic || student.picture || student.icon || null;
}

// 🌟 يجمع الأسئلة التي لم يحصل الطالب فيها على الدرجة الكاملة — تلقائية التصحيح (isCorrect
// === false) أو يدوية (manualScore أقل من points القصوى) — لعرضها في قسم "نقاط تحتاج مراجعة".
function collectMistakes(submission) {
    return (submission.details || []).filter(d => {
        if (d.needsManualGrading) {
            const max = d.points || 1;
            const got = d.manualScore !== undefined ? d.manualScore : 0;
            return got < max;
        }
        return d.isCorrect === false;
    }).map(d => ({
        question: localizeHomeworkText(d.question || ''),
        correctAnswer: d.correctAnswer ? (isSurahName(d.correctAnswer) ? surahNameLocal(d.correctAnswer) : d.correctAnswer) : null
    }));
}

// 🌟 [جديد] نص نطاق الواجب من النطاق الحقيقي المسجَّل مع الواجب (scope) — لا نص ثابت ولا تخمين.
// surah: "سورة X — من الآية a إلى الآية b" | range: "من سورة A إلى سورة B" | juz: "الجزء N".
// أي نطاق ناقص/غير صالح (أو واجب قديم بلا نطاق) → '' فلا يظهر سطر النطاق أصلاً.
function formatScope(scope) {
    if (!scope || typeof scope !== 'object') return '';
    const fill = (key, map) => Object.keys(map).reduce((s, k) => s.replace('{' + k + '}', map[k]), t(key));
    if (scope.mode === 'surah' && scope.surahName && scope.startAyah && scope.endAyah) {
        return fill('hwcert_scope_surah', { surah: surahNameLocal(scope.surahName), from: scope.startAyah, to: scope.endAyah });
    }
    if (scope.mode === 'range' && scope.fromName && scope.toName) {
        return fill('hwcert_scope_range', { from: surahNameLocal(scope.fromName), to: surahNameLocal(scope.toName) });
    }
    if (scope.mode === 'juz' && scope.juzNum) {
        return fill('hwcert_scope_juz', { juz: scope.juzNum });
    }
    return '';
}

function ensureStyles() {
    if (document.getElementById('hwcert-style')) return;
    const style = document.createElement('style');
    style.id = 'hwcert-style';
    style.textContent = `
        .hwcert-overlay { position: fixed; inset: 0; background: rgba(6,35,28,0.82); z-index: 10050;
            display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }
        .hwcert-card-wrap { max-width: 560px; width: 100%; }
        /* 🌟 [2026-10-06] تصميم "عصري بشريط زمردي": إطار ذهبي مزدوج + شريط علوي أخضر بالشعار يميناً والعنوان في المنتصف،
           ميدالية للدرجة، وذيل رسمي (المعلم/الختم/التاريخ). خطوط Reem Kufi للعناوين والأسماء وAmiri للآية. */
        .hwcert-card { background: var(--dh-paper, #fdf6e3); border: 3px solid var(--dh-gold-500, #d4af37); border-radius: 18px;
            padding: 6px; text-align: center; box-shadow: 0 30px 60px rgba(0,0,0,0.35); font-family: inherit; position: relative; }
        .hwcert-frame { border: 1px solid #a8841c; border-radius: 13px; overflow: hidden; background: #fdf6e3; }
        .hwcert-band { position: relative; background: linear-gradient(135deg, #06352a, #0d5c46); color: #fdf6e3;
            padding: 16px 84px 14px; min-height: 76px; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        .hwcert-band::after { content: ""; position: absolute; inset: 0; opacity: .07; pointer-events: none;
            background: repeating-linear-gradient(45deg,#fff 0 2px,transparent 2px 14px), repeating-linear-gradient(-45deg,#fff 0 2px,transparent 2px 14px); }
        .hwcert-band > * { position: relative; z-index: 1; }
        .hwcert-logo { position: absolute; right: 18px; top: 50%; transform: translateY(-50%); width: 40px; height: auto; display: block; z-index: 1; }
        .hwcert-body { padding: 18px 20px 14px; }
        .hwcert-tail { border-top: 1px solid rgba(212,175,55,.6); padding: 12px 20px 14px; background: rgba(212,175,55,.08); }
        .hwcert-title { font-family: 'Reem Kufi', 'Cairo', inherit; font-size: 1.75rem; font-weight: 700; color: #fdf6e3; margin: 0; line-height: 1.3; }
        .hwcert-subtitle { font-size: 0.78rem; color: #fdf6e3; opacity: .88; margin: 2px 0 0; }
        .hwcert-number { font-size: 0.68rem; color: #e3c35a; margin-top: 6px; letter-spacing: .3px; direction: ltr; font-variant-numeric: tabular-nums; }
        .hwcert-person { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 14px; }
        .hwcert-who { text-align: right; min-width: 0; }
        .hwcert-grant { font-size: 0.8rem; color: var(--dh-ink-soft, #4a6058); }
        .hwcert-avatar { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; flex: none;
            border: 4px solid var(--dh-gold-500, #d4af37); display: block; background: #fff; }
        .hwcert-avatar-fallback { width: 80px; height: 80px; border-radius: 50%; flex: none; display: flex;
            align-items: center; justify-content: center; font-size: 2rem; background: var(--dh-emerald-700, #0d5c46);
            color: #fdf6e3; border: 4px solid var(--dh-gold-500, #d4af37); }
        .hwcert-name { font-family: 'Reem Kufi', 'Cairo', inherit; font-size: 1.6rem; font-weight: bold; color: var(--dh-emerald-700, #0d5c46); margin: 0; line-height: 1.3; word-break: break-word; }
        .hwcert-medal { width: 92px; height: 92px; border-radius: 50%; margin: 0 auto 6px; display: flex; flex-direction: column;
            align-items: center; justify-content: center; color: #06352a; border: 3px double rgba(255,255,255,.55);
            box-shadow: 0 6px 14px rgba(0,0,0,.25); }
        .hwcert-medal b { font-family: 'Reem Kufi', 'Cairo', inherit; font-size: 1.6rem; line-height: 1; }
        .hwcert-medal span { font-size: .62rem; font-weight: 700; }
        .hwcert-verse { font-family: 'Amiri', serif; font-size: 1.15rem; line-height: 1.9; color: #06352a; margin: 4px 0 14px; }
        .hwcert-verse small { display: block; font-size: .72rem; opacity: .7; font-family: inherit; }
        .hwcert-foot { display: grid; grid-template-columns: 1fr 84px 1fr; align-items: end; gap: 10px; }
        .hwcert-sig { font-size: .75rem; color: var(--dh-ink-soft, #4a6058); }
        .hwcert-sig-line { border-bottom: 1.5px solid currentColor; height: 34px; margin-bottom: 4px; }
        .hwcert-sig b { display: block; color: var(--dh-ink, #10241c); font-size: .85rem; line-height: 1.5; word-break: break-word; }
        .hwcert-stamp { width: 84px; height: 84px; display: flex; align-items: center; justify-content: center; }
        .hwcert-stamp img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
        .hwcert-score-caption { font-size: 0.85rem; text-align: center; color: var(--dh-ink-soft, #4a6058); margin-bottom: 16px; }
        .hwcert-scope { background: rgba(13,92,70,0.08); border: 1px solid rgba(13,92,70,0.28); border-radius: 14px;
            padding: 10px 16px; margin-bottom: 14px; }
        .hwcert-scope-title { font-size: 0.8rem; color: var(--dh-ink-soft, #4a6058); margin-bottom: 2px; }
        .hwcert-scope-text { font-size: 1.1rem; font-weight: bold; color: var(--dh-emerald-700, #0d5c46); line-height: 1.6; }
        .hwcert-encourage { font-size: 1.05rem; line-height: 1.7; color: var(--dh-ink, #10241c); background: rgba(212,175,55,0.14);
            border-radius: 14px; padding: 12px 16px; margin-bottom: 16px; }
        .hwcert-mistakes { text-align: right; background: #fff; border: 1px solid #e7d9ad; border-radius: 14px;
            padding: 14px 16px; margin-bottom: 6px; }
        .hwcert-mistakes-title { font-weight: bold; color: #a15230; margin: 0 0 8px; font-size: 0.95rem; }
        .hwcert-mistake-item { font-size: 0.92rem; color: var(--dh-ink, #10241c); padding: 6px 0; border-top: 1px dashed #e7d9ad; }
        .hwcert-mistake-item:first-child { border-top: none; }
        .hwcert-mistake-correct { color: #147c5e; font-weight: bold; }
        .hwcert-no-mistakes { text-align: center; color: #147c5e; font-weight: bold; padding: 10px; }
        .hwcert-teacher-note { background: rgba(13,92,70,0.07); border: 1px dashed var(--dh-emerald-700, #0d5c46);
            border-radius: 14px; padding: 12px 16px; margin: 12px 0 6px; text-align: right; }
        .hwcert-teacher-note-title { font-weight: bold; color: var(--dh-emerald-700, #0d5c46); font-size: 0.9rem; margin-bottom: 4px; }
        .hwcert-teacher-note-text { color: var(--dh-ink, #10241c); line-height: 1.8; font-size: 1rem; white-space: pre-wrap; word-break: break-word; }
        .hwcert-actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
        .hwcert-actions button { flex: 1 1 140px; padding: 12px 10px; border: none; border-radius: 12px; font-size: 1rem;
            font-weight: bold; cursor: pointer; font-family: inherit; }
        .hwcert-btn-save { background: var(--dh-emerald-700, #0d5c46); color: #fdf6e3; }
        .hwcert-btn-share { background: #25D366; color: #fff; }
        .hwcert-btn-close { background: transparent; color: #a15230; border: 2px solid #a15230 !important; }
        .hwcert-note { font-size: 0.8rem; color: var(--dh-ink-soft, #4a6058); margin-top: 10px; }
    `;
    document.head.appendChild(style);
}

// 🌟 [2026-10-06] خطوط الشهادة (Reem Kufi للعناوين/الاسم، Amiri للآية) من Google Fonts — تُحمَّل مرة واحدة،
// وينتظر حفظ الصورة اكتمالها حتى لا يرسم html2canvas خط احتياطياً.
function ensureCertFonts() {
    if (document.getElementById('hwcert-fonts')) return;
    const link = document.createElement('link');
    link.id = 'hwcert-fonts'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Reem+Kufi:wght@500;700&display=swap';
    document.head.appendChild(link);
}

// ميدالية الدرجة حسب المستوى: ذهبية / فضية / برونزية / زمردية
const MEDAL_BG = {
    excellent: 'radial-gradient(circle at 35% 30%, #f6e08a, #d4af37 55%, #a8841c)',
    good: 'radial-gradient(circle at 35% 30%, #f4f6f7, #c4ccd0 55%, #8f9a9f)',
    average: 'radial-gradient(circle at 35% 30%, #efc7a0, #c98a52 55%, #8f5a2c)',
    weak: 'radial-gradient(circle at 35% 30%, #cfe8dc, #6fb59a 55%, #2f7f64)'
};

// رقم الشهادة: ثابت لكل تسليم (يُشتق من معرّف التسليم)، فيبقى نفسه كلما أُعيد فتح الشهادة
function certificateNumber(submission, date) {
    const seed = String(submission.id || submission.submissionId || ((submission.studentName || '') + '|' + (submission.hwId || '') + '|' + submission.finalScore));
    let h = 5381;
    for (let i = 0; i < seed.length; i++) h = ((h * 33) ^ seed.charCodeAt(i)) >>> 0;
    return `HAM-${date.getFullYear()}-${String(h % 1000000).padStart(6, '0')}`;
}

function formatCertDates(date) {
    const en = AppState && AppState.currentLang === 'en';
    let hijri = '', greg = '';
    try {
        hijri = new Intl.DateTimeFormat((en ? 'en-US' : 'ar-SA') + '-u-ca-islamic-umalqura', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch (e) { /* المتصفح لا يدعم تقويم أم القرى — يختفي السطر الهجري */ }
    try {
        greg = new Intl.DateTimeFormat(en ? 'en-GB' : 'ar-EG-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
    } catch (e) { greg = date.toLocaleDateString(); }
    return { hijri, greg };
}

// اسم المعلم وختمه من ملفه الشخصي (database/teacherDB.js عبر AppState) — اختياريان تماماً
function getTeacherForCertificate() {
    const tch = (AppState && AppState.currentTeacher) || {};
    return { name: tch.name || (AppState && AppState.teacherName) || '', stamp: tch.stamp || null };
}

async function buildCertificateBlob(cardEl) {
    await ensureHtml2Canvas();
    try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* تجاهل */ }
    const canvas = await window.html2canvas(cardEl, { scale: 3, backgroundColor: '#fdf6e3', useCORS: true });
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// submission = نتيجة gradeSubmissionOnServer المُعتمَدة (finalScore/details/studentName/...)
// student = سجل الطالب المحلي (قد يكون null لو لم يُربط التسليم بأي طالب في سجل المعلم)
// 🌟 scope = نطاق الواجب الحقيقي المسجَّل مع الواجب وقت نشره (اختياري؛ null لواجب قديم بلا نطاق مسجَّل)
export function showHomeworkCertificate(submission, student, scope) {
    ensureStyles();
    ensureCertFonts();
    const scopeText = formatScope(scope);

    const studentName = (student && student.name) || submission.studentName || t('hwcert_default_student');
    const score = Math.round(submission.finalScore);
    const tier = getTier(score);
    const issuedAt = new Date(Date.parse(submission.approvedAt) || Date.now());
    const certNo = certificateNumber(submission, issuedAt);
    const dates = formatCertDates(issuedAt);
    const teacher = getTeacherForCertificate();
    const avatarUrl = getStudentAvatar(student);
    const mistakes = collectMistakes(submission);
    // 🌟 [جديد] كلمة المعلم الاختيارية (تُحفظ مع التسليم من غرفة التصحيح) — لا تظهر الكتلة لو فارغة
    const teacherNote = String(submission.teacherNote || '').trim();
    const filename = `شهادة-${studentName}.png`.replace(/[\\/:*?"<>|]/g, '_');

    const overlay = document.createElement('div');
    overlay.className = 'hwcert-overlay';
    overlay.innerHTML = `
        <div class="hwcert-card-wrap">
            <div class="hwcert-card" id="hwcert-card"><div class="hwcert-frame">
                <div class="hwcert-band">
                    <img class="hwcert-logo" src="assets/brand/ham-logo-light.svg" alt="${t('hwcert_logo_alt')}">
                    <h2 class="hwcert-title">${t('hwcert_title')}</h2>
                    <p class="hwcert-subtitle">${t('hwcert_subtitle')}</p>
                    <div class="hwcert-number">${t('hwcert_number_label')} ${esc(certNo)}</div>
                </div>
                <div class="hwcert-body">
                    <div class="hwcert-person">
                        ${avatarUrl
                            ? `<img class="hwcert-avatar" src="${esc(avatarUrl)}" alt="">`
                            : `<div class="hwcert-avatar-fallback">🎓</div>`}
                        <div class="hwcert-who">
                            <div class="hwcert-grant">${t('hwcert_granted_to')}</div>
                            <div class="hwcert-name">${esc(studentName)}</div>
                        </div>
                    </div>
                    <div class="hwcert-medal" style="background:${MEDAL_BG[tier]};"><b>${score}%</b><span>${t('hwcert_tier_name_' + tier)}</span></div>
                    <div class="hwcert-score-caption">${t('hwcert_score_label')}</div>
                    ${scopeText ? `
                        <div class="hwcert-scope">
                            <div class="hwcert-scope-title">${t('hwcert_scope_title')}</div>
                            <div class="hwcert-scope-text">${esc(scopeText)}</div>
                        </div>
                    ` : ''}
                    <div class="hwcert-encourage">${t('hwcert_tier_' + tier)}</div>
                    ${mistakes.length ? `
                        <div class="hwcert-mistakes">
                            <div class="hwcert-mistakes-title">${t('hwcert_mistakes_title')}</div>
                            ${mistakes.map(m => `
                                <div class="hwcert-mistake-item">
                                    ${esc(m.question)}
                                    ${m.correctAnswer ? `<br><span class="hwcert-mistake-correct">${t('hwcert_correct_answer_label')} ${esc(m.correctAnswer)}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : `<div class="hwcert-mistakes"><div class="hwcert-no-mistakes">${t('hwcert_no_mistakes')}</div></div>`}
                    ${teacherNote ? `
                        <div class="hwcert-teacher-note">
                            <div class="hwcert-teacher-note-title">${t('hwcert_teacher_note_title')}</div>
                            <div class="hwcert-teacher-note-text">${esc(teacherNote)}</div>
                        </div>
                    ` : ''}
                    <div class="hwcert-verse">${t('hwcert_verse')}<small>${t('hwcert_verse_ref')}</small></div>
                </div>
                <div class="hwcert-tail">
                    <div class="hwcert-foot">
                        <div class="hwcert-sig"><div class="hwcert-sig-line"></div>${t('hwcert_teacher_label')}<b>${esc(teacher.name)}</b></div>
                        <div class="hwcert-stamp">${teacher.stamp ? `<img src="${esc(teacher.stamp)}" alt="">` : ''}</div>
                        <div class="hwcert-sig"><div class="hwcert-sig-line"></div>${t('hwcert_date_label')}<b>${dates.hijri ? esc(dates.hijri) + '<br>' : ''}${esc(dates.greg)}</b></div>
                    </div>
                </div>
            </div></div>
            <div class="hwcert-actions">
                <button type="button" class="hwcert-btn-save" id="hwcert-save-btn">${t('hwcert_save_btn')}</button>
                <button type="button" class="hwcert-btn-share" id="hwcert-share-btn">${t('hwcert_share_btn')}</button>
                <button type="button" class="hwcert-btn-close" id="hwcert-close-btn">${t('hwcert_close_btn')}</button>
            </div>
            <div class="hwcert-note" id="hwcert-note" style="display:none;"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const cardEl = overlay.querySelector('#hwcert-card');
    const noteEl = overlay.querySelector('#hwcert-note');
    const showNote = (msg) => { noteEl.textContent = msg; noteEl.style.display = 'block'; };

    overlay.querySelector('#hwcert-close-btn').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#hwcert-save-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const original = btn.textContent;
        btn.disabled = true; btn.textContent = '⏳';
        try {
            const blob = await buildCertificateBlob(cardEl);
            downloadBlob(blob, filename);
        } catch (err) {
            console.error('تعذّر إنشاء صورة الشهادة:', err);
            alert(t('hwcert_save_failed'));
        } finally {
            btn.disabled = false; btn.textContent = original;
        }
    });

    overlay.querySelector('#hwcert-share-btn').addEventListener('click', async (e) => {
        const btn = e.currentTarget;
        const original = btn.textContent;
        btn.disabled = true; btn.textContent = '⏳';
        try {
            const blob = await buildCertificateBlob(cardEl);
            const file = new File([blob], filename, { type: 'image/png' });
            // 🌟 Web Share API مع ملف مرفَق — الطريقة الوحيدة التي تسمح لواتساب باستقبال الصورة
            // جاهزة مباشرة (رابط wa.me يدعم نصاً فقط، بلا أي مرفق، في كل الحالات بلا استثناء).
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: t('hwcert_title'), text: studentName });
            } else {
                downloadBlob(blob, filename);
                showNote(t('hwcert_share_unsupported_note'));
            }
        } catch (err) {
            // 🌟 المستخدم قد يُلغي نافذة المشاركة نفسها (AbortError) — ليست خطأً فعلياً
            if (err && err.name !== 'AbortError') {
                console.error('تعذّر مشاركة الشهادة:', err);
                alert(t('hwcert_save_failed'));
            }
        } finally {
            btn.disabled = false; btn.textContent = original;
        }
    });
}
