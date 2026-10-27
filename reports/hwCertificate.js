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
// 🌟 سجل نتائج الواجبات المعتمدة في ملف الطالب (نفس مصدر الكتابة في recordApprovedResult)
import { readStudentHistory } from '../core/homeworkRecords.js';

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

// 🌟 [2026-10-18] تصميم «قالب المصحف» (assets/certificates/template-quran.jpg) — معاينة معتمدة: previews/hwcert-f-quran.html.
// كل المقاسات بوحدة u = 1% من عرض البطاقة (المتغير --u بالبكسل يضبطه fitCertificate)، لا cqw لأن html2canvas لا يدعمها.
// نصوص العمود الرئيسي تتكبّر/تتصغّر بالمعامل --f ليتّسع أي عدد من الأخطاء فوق ذيل المعلم دون تداخل.
const U = (n) => `calc(var(--u) * ${n})`;
const S = (n) => `calc(var(--u) * ${n} * var(--f))`;

function ensureStyles() {
    if (document.getElementById('hwcert-style')) return;
    const style = document.createElement('style');
    style.id = 'hwcert-style';
    style.textContent = `
        .hwcert-overlay { position: fixed; inset: 0; background: rgba(6,35,28,0.82); z-index: 10050;
            display: flex; align-items: center; justify-content: center; padding: 16px; overflow-y: auto; }
        .hwcert-card-wrap { max-width: 600px; width: 100%; margin: auto; }
        .hwcert-card { --u: 6px; --f: 1; position: relative; width: 100%; overflow: hidden; text-align: center;
            background: #fdf6e3 url(assets/certificates/template-quran.jpg) center/100% 100% no-repeat;
            box-shadow: 0 30px 60px rgba(0,0,0,0.35); font-family: 'Reem Kufi', 'Cairo', sans-serif; color: #2a1e10; }
        .hwcert-main { position: absolute; top: ${U(11)}; left: ${U(13.5)}; right: ${U(13.5)}; display: flex; flex-direction: column; align-items: center; }
        .hwcert-brand { display: flex; align-items: center; gap: ${S(1.6)}; color: #276b59; font-size: ${S(2.4)}; white-space: nowrap; letter-spacing: 0; word-spacing: 0; }
        .hwcert-brand img { width: ${S(4.4)}; height: auto; display: block; }
        .hwcert-title { margin: ${S(.3)} 0 0; line-height: 0; }
        .hwcert-title img { height: ${S(8.4)}; width: auto; display: block; margin: 0 auto; }
        .hwcert-orn { display: flex; align-items: center; gap: ${S(2)}; color: #a8841c; font-size: ${S(2.4)}; margin-top: ${S(.2)}; }
        .hwcert-orn i { height: 1px; width: ${S(15)}; background: linear-gradient(90deg, transparent, #a8841c); }
        .hwcert-orn i:last-child { transform: scaleX(-1); }
        .hwcert-person { display: flex; align-items: center; justify-content: center; gap: ${S(2.6)}; margin-top: ${S(1.2)}; max-width: 100%; }
        .hwcert-avatar { width: ${S(10)}; height: ${S(10)}; border-radius: 50%; object-fit: cover; flex: none; display: block; background: #fff;
            border: ${S(.7)} solid #d4af37; box-shadow: 0 ${S(.8)} ${S(1.8)} rgba(0,0,0,.2); }
        .hwcert-avatar-fallback { width: ${S(10)}; height: ${S(10)}; border-radius: 50%; flex: none; display: flex; align-items: center; justify-content: center;
            font-size: ${S(5)}; background: #2f7f6a; color: #fdf6e3; border: ${S(.7)} solid #d4af37; box-shadow: 0 ${S(.8)} ${S(1.8)} rgba(0,0,0,.2); }
        .hwcert-who { text-align: start; min-width: 0; }
        .hwcert-grant { font-family: 'Amiri', serif; color: #6a5a44; font-size: ${S(2.8)}; }
        .hwcert-name { font-family: 'Amiri', serif; font-size: ${S(7.2)}; font-weight: 700; color: #6b4a1e; line-height: 1.2; word-break: break-word; }
        .hwcert-result { display: grid; grid-template-columns: ${S(17)} 1fr; gap: ${S(3)}; align-items: center; width: 100%; margin-top: ${S(1.4)}; }
        .hwcert-medalcol { text-align: center; }
        .hwcert-medalwrap { position: relative; width: ${S(13)}; height: ${S(15.8)}; margin: 0 auto; }
        .hwcert-tails { position: absolute; bottom: 0; left: 50%; margin-left: ${S(-4)}; width: ${S(8)}; height: ${S(5.4)}; display: block; }
        .hwcert-medal { position: absolute; top: 0; left: 0; width: ${S(13)}; height: ${S(13)}; border-radius: 50%; box-sizing: border-box;
            display: flex; flex-direction: column; align-items: center; justify-content: center; color: #4a3408;
            border: ${S(1)} solid #a8841c; box-shadow: 0 ${S(1.2)} ${S(2.4)} rgba(0,0,0,.28); }
        .hwcert-medal b { font-size: ${S(4)}; line-height: 1; }
        .hwcert-medal span { font-size: ${S(1.9)}; font-weight: 700; margin-top: ${S(.4)}; }
        .hwcert-cap { font-size: ${S(2.1)}; color: #6a5a44; margin-top: ${S(.8)}; }
        .hwcert-side { display: flex; flex-direction: column; gap: ${S(1.3)}; text-align: start; min-width: 0; }
        .hwcert-scope { background: rgba(44,111,115,.08); border: 1px solid rgba(44,111,115,.3); border-radius: ${S(2.2)}; padding: ${S(1)} ${S(2.4)}; }
        .hwcert-scope small { display: block; font-size: ${S(2)}; color: #6a5a44; }
        .hwcert-scope b { font-family: 'Amiri', serif; font-size: ${S(2.8)}; color: #2c6f73; line-height: 1.45; }
        .hwcert-enc { font-family: 'Amiri', serif; font-size: ${S(2.7)}; line-height: 1.5; background: rgba(212,175,55,.16); border-radius: ${S(2.2)}; padding: ${S(1)} ${S(2.4)}; }
        .hwcert-ladder { width: 100%; margin-top: ${S(1.6)}; background: rgba(255,255,255,.82); border: 1px solid #e0cd98; border-radius: ${S(2.4)}; padding: ${S(1.1)} ${S(2)} ${S(1)}; box-sizing: border-box; }
        .hwcert-ladder h3 { font-size: ${S(2.5)}; color: #2c6f73; font-weight: 700; margin: 0 0 ${S(1)}; text-align: center; }
            border: ${S(.35)} solid #fffdf8; box-shadow: 0 0 0 ${S(.25)} currentColor; }
        .hwcert-lfirst { font-size: ${S(1.9)}; color: #6a5a44; text-align: center; margin-top: ${S(.8)}; }
        .hwcert-split { display: flex; align-items: stretch; gap: ${S(1.6)}; width: 100%; margin-top: ${S(1.6)}; }
        .hwcert-split .hwcert-ladder { width: ${S(26)}; flex: none; margin-top: 0; }
        .hwcert-split .hwcert-mist { flex: 1 1 0; min-width: 0; margin-top: 0; }
        .hwcert-split .hwcert-mlist { grid-template-columns: 1fr; }
        .hwcert-split .hwcert-mi:nth-child(2) { border-top: 1px dashed #d9c58c; }
        .hwcert-ladder.vt { padding-bottom: ${S(1)}; }
        .hwcert-vstep { display: flex; gap: ${S(1.3)}; text-align: start; }
        .hwcert-vdotcol { display: flex; flex-direction: column; align-items: center; flex: none; padding-top: ${S(.5)}; }
        .hwcert-vdot { display: block; width: ${S(2.4)}; height: ${S(2.4)}; border-radius: 50%; box-sizing: border-box; border: ${S(.3)} solid #fffdf8; box-shadow: 0 0 0 ${S(.22)} currentColor; flex: none; }
        .hwcert-vstep.cur .hwcert-vdot { box-shadow: 0 0 0 ${S(.22)} currentColor, 0 0 0 ${S(.65)} rgba(212,175,55,.45); }
        .hwcert-vline { display: block; flex: 1 1 auto; width: 1px; background: #d9c58c; min-height: ${S(3)}; margin: ${S(.3)} 0; }
        .hwcert-vtxt { padding-bottom: ${S(1)}; line-height: 1.3; }
        .hwcert-vtxt small { display: block; font-size: ${S(1.8)}; color: #6a5a44; font-weight: 700; }
        .hwcert-vstep.cur .hwcert-vtxt small { color: #2a1e10; }
        .hwcert-vtxt b { display: block; font-size: ${S(2.3)}; }
        .hwcert-vtxt span { display: block; font-size: ${S(1.6)}; color: #6a5a44; }
        .hwcert-vstep:last-of-type .hwcert-vtxt { padding-bottom: 0; }
        .hwcert-mist { width: 100%; margin-top: ${S(1.6)}; text-align: start; background: rgba(255,255,255,.82); border: 1px solid #e0cd98;
            border-radius: ${S(2.4)}; padding: ${S(1.3)} ${S(2.4)} ${S(1)}; box-sizing: border-box; }
        .hwcert-mist h3 { font-size: ${S(2.5)}; color: #a15230; font-weight: 700; margin: 0 0 ${S(.4)}; text-align: center; }
        .hwcert-mlist { display: grid; grid-template-columns: 1fr 1fr; gap: 0 ${S(2.4)}; }
        .hwcert-mi { font-family: 'Amiri', serif; font-size: ${S(2.3)}; line-height: 1.45; padding: ${S(.7)} 0; border-top: 1px dashed #d9c58c; word-break: break-word; }
        .hwcert-mi:nth-child(-n+2) { border-top: none; }
        .hwcert-mlist.one { grid-template-columns: 1fr; }
        .hwcert-mlist.one .hwcert-mi:nth-child(2) { border-top: 1px dashed #d9c58c; }
        .hwcert-mlist.one .hwcert-mi { display: flex; align-items: flex-start; gap: ${S(2.4)}; }
        .hwcert-mlist.one .hwcert-mi em { flex: 1 1 55%; }
        .hwcert-mi em { display: block; font-style: normal; font-weight: 700; color: #147c5e; }
        .hwcert-mmore { font-size: ${S(2.1)}; color: #a15230; text-align: center; padding-top: ${S(.4)}; }
        .hwcert-nomist { text-align: center; color: #147c5e; font-weight: 700; font-size: ${S(2.6)}; padding: ${S(.8)} 0; }
        .hwcert-note { width: 100%; margin-top: ${S(1.3)}; text-align: start; background: rgba(47,127,106,.08); border: 1px dashed #2f7f6a;
            border-radius: ${S(2.4)}; padding: ${S(.9)} ${S(2.4)}; box-sizing: border-box; }
        .hwcert-note b { font-size: ${S(2.3)}; color: #2f7f6a; margin-inline-end: ${S(1)}; }
        .hwcert-note span { font-family: 'Amiri', serif; font-size: ${S(2.5)}; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }
        .hwcert-close { position: absolute; left: ${U(11)}; width: ${U(46)}; top: ${U(102.8)}; text-align: center; font-family: 'Amiri', serif; color: #6a5a44; }
        .hwcert-row { display: flex; justify-content: center; align-items: flex-end; gap: ${U(2.5)}; margin-bottom: ${U(1)}; }
        .hwcert-sig { min-width: ${U(20)}; font-size: ${U(2.6)}; }
        .hwcert-sig-line { border-bottom: ${U(.35)} solid #6a5a44; height: ${U(3.4)}; margin-bottom: ${U(.7)}; }
        .hwcert-sig b { display: block; color: #2a1e10; font-size: ${U(2.9)}; line-height: 1.5; white-space: nowrap; }
        .hwcert-stamp { width: ${U(10)}; height: ${U(10)}; display: flex; align-items: center; justify-content: center; }
        .hwcert-stamp img { max-width: 100%; max-height: 100%; object-fit: contain; display: block; }
        .hwcert-when { font-size: ${U(2.3)}; line-height: 1.5; white-space: nowrap; }
        .hwcert-when b { color: #2a1e10; }
        .hwcert-number { position: absolute; right: ${U(5)}; bottom: ${U(1.2)}; font-family: 'Reem Kufi', sans-serif; font-size: ${U(2.3)}; font-weight: 700; color: #1f4d40;
            background: rgba(255,255,255,.85); border-radius: ${U(1.2)}; padding: ${U(.4)} ${U(1.6)}; white-space: nowrap; }
        .hwcert-number bdi { letter-spacing: ${U(.1)}; }
        .hwcert-actions { display: flex; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
        .hwcert-actions button { flex: 1 1 140px; padding: 12px 10px; border: none; border-radius: 12px; font-size: 1rem;
            font-weight: bold; cursor: pointer; font-family: inherit; }
        .hwcert-btn-save { background: var(--dh-emerald-700, #0d5c46); color: #fdf6e3; }
        .hwcert-btn-share { background: #25D366; color: #04361a; }
        .hwcert-btn-close { background: transparent; color: #f0b394; border: 2px solid #f0b394 !important; }
        .hwcert-note-msg { font-size: 0.8rem; color: #fdf6e3; margin-top: 10px; }
    `;
    document.head.appendChild(style);
}

// يضبط وحدة القياس --u من عرض البطاقة الفعلي وارتفاعها بنسبة القالب، ثم يُصغّر نصوص العمود الرئيسي (--f)
// بالقدر اللازم حتى لا يتجاوز آخر عنصر فيه موضع ذيل المعلم (يسار المصحف).
const CERT_RATIO = 1608 / 1200;
function fitCertificate(card, maxF = 1) {
    const w = card.clientWidth;
    if (!w) return;
    card.style.setProperty('--u', (w / 100) + 'px');
    card.style.height = (w * CERT_RATIO) + 'px';
    card.style.setProperty('--f', String(maxF));
    const main = card.querySelector('.hwcert-main');
    const limit = 102 * w / 100;
    let f = maxF;
    while (f > 0.5 && main.offsetTop + main.offsetHeight > limit) {
        f = Math.round((f - 0.03) * 100) / 100;
        card.style.setProperty('--f', String(f));
    }
}


// 🌟 «مستوى التقدّم العام» للواجبات: هذا الواجب ثم آخر 3 واجبات معتمدة سابقة للطالب (الأحدث أولاً، أقصى اليمين في RTL).
// يقرأ نتائج الواجبات فقط (source: 'homework') — الاختبارات الفردية مسار مستقل ولا تدخل هنا. يستبعد التسليم نفسه،
// ويستبعد ما اعتُمد بعده (فتبقى شهادة قديمة تعرض ما كان قبلها). بلا طالب مربوط ← لا سُلّم (null).
const LADDER_COLOR = { excellent: '#147c5e', good: '#2c6f73', average: '#b8862b', weak: '#a15230' };
function shortDate(ms) {
    const d = new Date(ms);
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function buildHwLadder(submission, student, score, issuedAt) {
    if (!student || student.id == null) return null;
    let list = [];
    try { list = readStudentHistory(student.id) || []; } catch (e) { return null; }
    const currentMs = issuedAt.getTime();
    const previous = list
        .filter(h => h && h.source === 'homework' && h.approved && h.submissionId !== submission.id
            && typeof h.score === 'number' && (Number(h.timestamp) || 0) <= currentMs)
        .sort((a, b) => (Number(a.timestamp) || 0) - (Number(b.timestamp) || 0))
        .slice(-3).reverse();
    const labels = [t('hwcert_step_prev1'), t('hwcert_step_prev2'), t('hwcert_step_prev3')];
    const step = (label, ms, sc, isCurrent) => {
        const tier = getTier(sc);
        return { label, date: shortDate(ms), score: Math.round(sc), tierLabel: t('hwcert_tier_name_' + tier), color: LADDER_COLOR[tier], isCurrent };
    };
    return [step(t('hwcert_step_current'), currentMs, score, true)]
        .concat(previous.map((h, i) => step(labels[i], Number(h.timestamp) || currentMs, h.score, false)));
}
function ladderHtml(steps) {
    if (!steps) return '';
    const rows = steps.map((s, i) => `<div class="hwcert-vstep${s.isCurrent ? ' cur' : ''}" style="color:${s.color};">
            <div class="hwcert-vdotcol"><i class="hwcert-vdot" style="background:${s.color};"></i>${i < steps.length - 1 ? '<i class="hwcert-vline"></i>' : ''}</div>
            <div class="hwcert-vtxt"><small>${esc(s.label)}</small><b>${s.score}% · ${esc(s.tierLabel)}</b><span dir="ltr">${esc(s.date)}</span></div>
        </div>`).join('');
    const first = steps.length < 2 ? `<div class="hwcert-lfirst">${t('hwcert_ladder_first')}</div>` : '';
    return `<div class="hwcert-ladder vt"><h3>${t('hwcert_ladder_title')}</h3>${rows}${first}</div>`;
}

const MAX_MISTAKES = 10;
// بجانب سُلّم التقدّم (4 محطات) لا يمتدّ مستطيل الأخطاء أسفل السُلّم: يُعرض بعدد محطاته فقط والباقي «و N أخطاء أخرى»
const MAX_MISTAKES_BESIDE_LADDER = 4;

// 🌟 [2026-10-06] خطوط الشهادة (Reem Kufi للعناوين/الاسم، Amiri للآية) من Google Fonts — تُحمَّل مرة واحدة،
// وينتظر حفظ الصورة اكتمالها حتى لا يرسم html2canvas خط احتياطياً.
function ensureCertFonts() {
    if (document.getElementById('hwcert-fonts')) return;
    const link = document.createElement('link');
    link.id = 'hwcert-fonts'; link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Aref+Ruqaa:wght@400;700&family=Reem+Kufi:wght@500;700&display=swap';
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
    const ladderBlock = ladderHtml(buildHwLadder(submission, student, score, issuedAt));
    // 🌟 [جديد] كلمة المعلم الاختيارية (تُحفظ مع التسليم من غرفة التصحيح) — لا تظهر الكتلة لو فارغة
    const teacherNote = String(submission.teacherNote || '').trim();
    const filename = `شهادة-${studentName}.png`.replace(/[\\/:*?"<>|]/g, '_');

    const overlay = document.createElement('div');
    overlay.className = 'hwcert-overlay';
    const shownMistakes = mistakes.slice(0, ladderBlock ? MAX_MISTAKES_BESIDE_LADDER : MAX_MISTAKES);
    const moreMistakes = mistakes.length - shownMistakes.length;
    const dir = (AppState && AppState.currentLang === 'en') ? 'ltr' : 'rtl';
    const titleText = t('hwcert_title').replace(/\s*🏅/, '');
    overlay.innerHTML = `
        <div class="hwcert-card-wrap">
            <div class="hwcert-card" id="hwcert-card" dir="${dir}">
                <div class="hwcert-main">
                    <div class="hwcert-brand"><img src="assets/brand/ham-mark.svg" alt="${t('hwcert_logo_alt')}">${t('hwcert_subtitle')}</div>
                    <h2 class="hwcert-title"><img src="assets/certificates/title-thuluth.png" alt="${titleText}"></h2>
                    <div class="hwcert-orn"><i></i>✦<i></i></div>
                    <div class="hwcert-person">
                        ${avatarUrl
                            ? `<img class="hwcert-avatar" src="${esc(avatarUrl)}" alt="">`
                            : `<div class="hwcert-avatar-fallback">🎓</div>`}
                        <div class="hwcert-who">
                            <div class="hwcert-grant">${t('hwcert_granted_to')}</div>
                            <div class="hwcert-name">${esc(studentName)}</div>
                        </div>
                    </div>
                    <div class="hwcert-result">
                        <div class="hwcert-medalcol">
                            <div class="hwcert-medalwrap">
                                <svg class="hwcert-tails" viewBox="0 0 80 54"><polygon points="0,0 35,0 35,54 17.5,42 0,54" fill="#2a7f84"/><polygon points="45,0 80,0 80,54 62.5,42 45,54" fill="#1f6468"/></svg>
                                <div class="hwcert-medal" style="background:${MEDAL_BG[tier]};"><b>${score}%</b><span>${t('hwcert_tier_name_' + tier)}</span></div>
                            </div>
                            <div class="hwcert-cap">${t('hwcert_score_label')}</div>
                        </div>
                        <div class="hwcert-side">
                            ${scopeText ? `<div class="hwcert-scope"><small>${t('hwcert_scope_title')}</small><b>${esc(scopeText)}</b></div>` : ''}
                            <div class="hwcert-enc">${t('hwcert_tier_' + tier)}</div>
                        </div>
                    </div>
                    ${ladderBlock ? '<div class="hwcert-split">' : ''}${ladderBlock}
                    <div class="hwcert-mist">
                        ${shownMistakes.length ? `
                            <h3>${t('hwcert_mistakes_title')}</h3>
                            <div class="hwcert-mlist${shownMistakes.length === 1 ? ' one' : ''}">
                                ${shownMistakes.map(m => `<div class="hwcert-mi">${esc(m.question)}${m.correctAnswer ? `<em>${t('hwcert_correct_answer_label')} ${esc(m.correctAnswer)}</em>` : ''}</div>`).join('')}
                            </div>
                            ${moreMistakes > 0 ? `<div class="hwcert-mmore">${t('hwcert_mistakes_more').replace('{n}', moreMistakes)}</div>` : ''}
                        ` : `<div class="hwcert-nomist">${t('hwcert_no_mistakes')}</div>`}
                    </div>
                    ${ladderBlock ? '</div>' : ''}
                    ${teacherNote ? `<div class="hwcert-note"><b>${t('hwcert_teacher_note_title')}</b><span>${esc(teacherNote)}</span></div>` : ''}
                </div>
                <div class="hwcert-close">
                    <div class="hwcert-row">
                        ${teacher.stamp ? `<div class="hwcert-stamp"><img src="${esc(teacher.stamp)}" alt=""></div>` : ''}
                        <div class="hwcert-sig"><div class="hwcert-sig-line"></div>${t('hwcert_teacher_label')}<b>${esc(teacher.name)}</b></div>
                    </div>
                    <div class="hwcert-when">${t('hwcert_issued_on')} <b>${esc(dates.hijri || dates.greg)}</b>${dates.hijri ? `<br><b>${esc(dates.greg)}</b>` : ''}</div>
                </div>
                <div class="hwcert-number">${t('hwcert_number_label')} <bdi dir="ltr">${esc(certNo)}</bdi></div>
            </div>
            <div class="hwcert-actions">
                <button type="button" class="hwcert-btn-save" id="hwcert-save-btn">${t('hwcert_save_btn')}</button>
                <button type="button" class="hwcert-btn-share" id="hwcert-share-btn">${t('hwcert_share_btn')}</button>
                <button type="button" class="hwcert-btn-close" id="hwcert-close-btn">${t('hwcert_close_btn')}</button>
            </div>
            <div class="hwcert-note-msg" id="hwcert-note" style="display:none;"></div>
        </div>
    `;
    document.body.appendChild(overlay);

    const cardEl = overlay.querySelector('#hwcert-card');
    // بلا كلمة معلم: يُوزَّع المكان الفارغ بتكبير نصوص العمود الرئيسي (حتى 1.3×) بدل تركه خالياً
    const maxF = teacherNote ? 1 : 1.3;
    fitCertificate(cardEl, maxF);
    try { if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => fitCertificate(cardEl, maxF)); } catch (e) { /* تجاهل */ }
    const noteEl = overlay.querySelector('#hwcert-note');
    const showNote = (msg) => { noteEl.textContent = msg; noteEl.style.display = 'block'; };

    // 🗂️ حفظ تلقائي للشهادة في «الشهادات والتقارير ← التقارير السابقة» بمجرد عرضها (تظهر في صفحة الطالب بنوعها ونطاقها وتاريخها)
    import('./reportArchive.js').then(m => m.autoArchiveOnOpen({
        kind: 'homework', pageId: 'hwcert-card', delay: 800, background: '#fdf6e3',
        prepare: async () => { await ensureHtml2Canvas(); try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch (e) { /* تجاهل */ } },
        getMeta: () => ({ name: studentName, students: [studentName], scope: scopeText || '', dateLabel: dates.greg, sub: [scopeText, certNo].filter(Boolean).join(' — ') })
    })).catch(() => {});

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
