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
const TIER_COLOR = {
    excellent: '#0d5c46',
    good: '#147c5e',
    average: '#b8863b',
    weak: '#a15230'
};

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
        .hwcert-card { background: linear-gradient(160deg, #fdf6e3, #f7ead0); border: 3px solid var(--dh-gold-500, #d4af37);
            border-radius: 20px; padding: 30px 26px; text-align: center; box-shadow: 0 30px 60px rgba(0,0,0,0.35);
            font-family: inherit; position: relative; }
        /* 🌟 [2026-10-03] ختم شعار المنصة أعلى الشهادة: <img> لملف SVG ثابت (لا SVG مضمَّن) لأن html2canvas يرسم الصور
           المحمَّلة بثبات عند حفظ الشهادة/مشاركتها. يقفز مرة عند فتح الشهادة مع شرارات ذهبية (تختفي قبل أي حفظ) */
        .hwcert-seal { position: relative; width: 92px; height: 92px; margin: 0 auto 10px; border-radius: 50%; background: #fffdf6;
            border: 2px solid var(--dh-gold-500, #d4af37); box-shadow: 0 0 0 5px rgba(212,175,55,0.18);
            display: flex; align-items: center; justify-content: center; animation: hwcert-seal-pop .7s cubic-bezier(.3,1.5,.5,1) both; }
        .hwcert-seal img { width: 56px; height: auto; display: block; }
        .hwcert-seal i { position: absolute; left: 50%; top: 50%; width: 9px; height: 9px; margin: -4.5px; background: #f0d878;
            opacity: 0; transform: rotate(45deg); animation: hwcert-spark .9s ease-out .15s both; }
        @keyframes hwcert-seal-pop { 0% { transform: scale(.6); opacity: 0; } 60% { transform: scale(1.12); opacity: 1; } 100% { transform: none; opacity: 1; } }
        @keyframes hwcert-spark { 0% { opacity: 1; transform: translate(0,0) rotate(45deg) scale(.4); }
            100% { opacity: 0; transform: translate(var(--dx), var(--dy)) rotate(45deg) scale(1); } }
        @media (prefers-reduced-motion: reduce) { .hwcert-seal, .hwcert-seal i { animation: none; } .hwcert-seal i { display: none; } }
        .hwcert-title { font-size: 1.6rem; font-weight: bold; color: var(--dh-emerald-700, #0d5c46); margin: 0 0 4px; }
        .hwcert-subtitle { font-size: 0.85rem; color: var(--dh-ink-soft, #4a6058); margin: 0 0 18px; }
        .hwcert-avatar { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; margin: 0 auto 12px;
            border: 3px solid var(--dh-gold-500, #d4af37); display: block; background: #fff; }
        .hwcert-avatar-fallback { width: 96px; height: 96px; border-radius: 50%; margin: 0 auto 12px; display: flex;
            align-items: center; justify-content: center; font-size: 2.4rem; background: var(--dh-emerald-700, #0d5c46);
            color: #fdf6e3; border: 3px solid var(--dh-gold-500, #d4af37); }
        .hwcert-name { font-size: 1.4rem; font-weight: bold; color: var(--dh-ink, #10241c); margin: 4px 0 14px; }
        .hwcert-score-badge { display: inline-block; padding: 10px 26px; border-radius: 999px; color: #fff;
            font-size: 1.8rem; font-weight: bold; margin-bottom: 6px; }
        .hwcert-score-caption { font-size: 0.85rem; color: var(--dh-ink-soft, #4a6058); margin-bottom: 16px; }
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

// شرارات الختم: 10 معيّنات ذهبية تنطلق في دائرة (اتجاه كل واحدة عبر --dx/--dy)
const SEAL_SPARKS = Array.from({ length: 10 }, (_, k) => {
    const a = k / 10 * Math.PI * 2, r = 70 + (k % 3) * 14;
    return `<i style="--dx:${Math.round(Math.cos(a) * r)}px;--dy:${Math.round(Math.sin(a) * r)}px;animation-delay:${150 + (k % 4) * 40}ms"></i>`;
}).join('');

async function buildCertificateBlob(cardEl) {
    await ensureHtml2Canvas();
    // 🌟 [2026-10-03] html2canvas يرسم نسخة مستنسخة تبدأ فيها حركات CSS من أولها، فيظهر ختم الشعار صغيراً شفافاً والشرارات
    // في منتصفها — نوقف حركة الختم ونخفي الشرارات في النسخة المستنسخة فقط (الشاشة نفسها لا تتأثر)
    const canvas = await window.html2canvas(cardEl, {
        scale: 3, backgroundColor: '#fdf6e3', useCORS: true,
        onclone: (doc) => {
            const st = doc.createElement('style');
            st.textContent = '.hwcert-seal{animation:none!important}.hwcert-seal i{display:none!important}';
            doc.head.appendChild(st);
        }
    });
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
    const scopeText = formatScope(scope);

    const studentName = (student && student.name) || submission.studentName || t('hwcert_default_student');
    const score = Math.round(submission.finalScore);
    const tier = getTier(score);
    const color = TIER_COLOR[tier];
    const avatarUrl = getStudentAvatar(student);
    const mistakes = collectMistakes(submission);
    // 🌟 [جديد] كلمة المعلم الاختيارية (تُحفظ مع التسليم من غرفة التصحيح) — لا تظهر الكتلة لو فارغة
    const teacherNote = String(submission.teacherNote || '').trim();
    const filename = `شهادة-${studentName}.png`.replace(/[\\/:*?"<>|]/g, '_');

    const overlay = document.createElement('div');
    overlay.className = 'hwcert-overlay';
    overlay.innerHTML = `
        <div class="hwcert-card-wrap">
            <div class="hwcert-card" id="hwcert-card">
                <div class="hwcert-seal">
                    <img src="assets/brand/ham-logo.svg" alt="${t('hwcert_logo_alt')}">
                    ${SEAL_SPARKS}
                </div>
                <h2 class="hwcert-title">${t('hwcert_title')}</h2>
                <p class="hwcert-subtitle">${t('hwcert_subtitle')}</p>
                ${avatarUrl
                    ? `<img class="hwcert-avatar" src="${esc(avatarUrl)}" alt="">`
                    : `<div class="hwcert-avatar-fallback">🎓</div>`}
                <div class="hwcert-name">${esc(studentName)}</div>
                ${scopeText ? `
                    <div class="hwcert-scope">
                        <div class="hwcert-scope-title">${t('hwcert_scope_title')}</div>
                        <div class="hwcert-scope-text">${esc(scopeText)}</div>
                    </div>
                ` : ''}
                <div class="hwcert-score-badge" style="background:${color};">${score}%</div>
                <div class="hwcert-score-caption">${t('hwcert_score_label')}</div>
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
            </div>
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
