// components/pausedSession.js
//
// 🌟 [جديد بالكامل] "حفظ والعودة لاحقًا" لاختبار الطالب (ركن الكبار وركن الأطفال).
// الفكرة: وقت الحصة قد ينتهي في منتصف الاختبار، فيحفظ المعلم الاختبار بزر "⏸️ حفظ والعودة لاحقًا"،
// وبعد يوم أو يومين أو ثلاثة — أول ما يُختار نفس الطالب للتقييم — تظهر بطاقة "اختبار غير مكتمل"
// بزرّين: "▶️ استكمال" (يكمل من أول سؤال لم يُجَب) و"🗑️ إلغاء".
//
// 🌟 أين يُخزَّن؟ داخل سجل الطالب نفسه في الحقل الاختياري `student.pausedEvaluation` (IndexedDB عبر
// studentManager.updateStudent الموجودة أصلاً). السبب: بلا جدول جديد ولا ترقية لقاعدة البيانات،
// ويتبع الطالب تلقائياً في النسخ الاحتياطي والحذف. غياب الحقل (كل الطلاب الحاليين) = لا اختبار معلّق،
// فلا أثر إطلاقاً على أي طالب أو شاشة قائمة.
//
// 🌟 ماذا يُحفَظ؟ لقطة صغيرة بلا أي نص قرآني مُولَّد: نطاق الاختبار (config)، وطابور أنواع الأسئلة،
// ومؤشر السؤال الحالي، ونتائج الأسئلة المُجابة (reportDetails)، ونص النطاق. الأسئلة الباقية تُولَّد
// من جديد عند الاستكمال بنفس النطاق (لم تُعرَض للطالب أصلاً). أخطاء الطالب ونقاطه تُحفَظ أصلاً مع
// كل إجابة، فلا تُحسَب مرة ثانية عند الاستكمال (لا يُعاد تشغيل recordAnswer للأسئلة المُجابة).
//
// ⚠️ افتراضات صريحة:
//   1) اختبار معلّق واحد لكل طالب (الأحدث يحلّ محل الأقدم بعد تأكيد المعلم في شاشة اللعب).
//   2) جلسة "علاج الأخطاء" لا تُحفَظ هنا (إجاباتها محفوظة أصلاً والمتبقي يعود مستحقاً تلقائياً).
//   3) لا مدة صلاحية: يبقى المعلّق حتى يُستكمَل أو يُلغى.
//   4) مؤقّت الاختبار (30 دقيقة للكبار) يبدأ من جديد عند الاستكمال؛ أما الزمن في التقرير فيُحسَب من
//      زمن كل سؤال على حدة (timeTaken) فلا يتأثر بالفاصل بين الجلستين.
//   5) المعلّق مرتبط بالقسم الذي بدأ منه (كبار/أطفال) ويظهر عند الدخول من نفس القسم فقط.
//
// 🌟 العزل: البطاقة تُنشأ ديناميكياً وتُحذف بعد الاستخدام، وكل قواعد CSS هنا بادئتها dh-pause-
// ومحقونة من هذا الملف نفسه (لا لمس لأي CSS عام)، بألوان الهوية --dh-emerald/--dh-gold مع قيم احتياطية.

import { t, tf } from '../core/i18n.js';

const STYLE_ID = 'dh-pause-style';
const OVERLAY_ID = 'dh-pause-overlay';

// ===================== التخزين (داخل سجل الطالب) =====================

/**
 * يبني لقطة قابلة للتخزين من حالة اللعبة الحالية.
 * @param {Object} gameState - GameState الخاص بالكبار أو الأطفال
 * @param {boolean} kids - هل القسم هو ركن الأطفال؟
 */
export function buildPausedSnapshot(gameState, kids) {
    const answered = gameState.reportDetails.length;
    const snapshot = {
        version: 1,
        kids: !!kids,
        config: gameState.config || null,
        queue: gameState.queue,
        // 🌟 نعتمد على عدد الأسئلة المُجابة فعلاً (وليس currentIndex) كمؤشر استكمال: كل إجابة تضيف
        // عنصراً واحداً لـ reportDetails وتزيد المؤشر بواحد، فهما متطابقان، وهذا أدق عند الضغط
        // على الزر في الثانية الفاصلة بين الإجابة والانتقال للسؤال التالي
        currentIndex: answered,
        reportDetails: gameState.reportDetails,
        evalRangeText: gameState.evalRangeText || '',
        pausedAt: new Date().toISOString()
    };
    // نسخة عميقة آمنة: تضمن أن الحقول المخزَّنة بيانات بسيطة فقط (تتخلص من أي دوال/مراجع حيّة)
    return JSON.parse(JSON.stringify(snapshot));
}

/** هل الطالب لديه اختبار معلّق صالح للاستكمال في هذا القسم؟ يرجع اللقطة أو null */
export function getPausedEvaluation(student, kids) {
    const p = student && student.pausedEvaluation;
    if (!p || !Array.isArray(p.queue) || !p.queue.length) return null;
    if (!!p.kids !== !!kids) return null;
    if (!(p.currentIndex >= 0 && p.currentIndex < p.queue.length)) return null;
    return p;
}

/** يحذف الاختبار المعلّق من سجل الطالب في الذاكرة — الحفظ على المستدعي (updateStudent) */
export function clearPausedEvaluation(student) {
    if (student && student.pausedEvaluation) delete student.pausedEvaluation;
}

/**
 * 🌟 حارس مغادرة الاختبار من الترويسة («الرئيسية»/«حسابي») — يُسجَّل في core/leaveGuard.js.
 * - لا شاشة اختبار حالياً، أو جلسة علاج أخطاء، أو لا إجابات بعد، أو كل الأسئلة أُجيبت ← مغادرة مباشرة بلا أي حفظ ولا تأكيد.
 * - يوجد عمل فعلي ← تأكيد ثم حفظ تلقائي كلقطة «اختبار غير مكتمل» (نفس زر «حفظ والعودة لاحقًا»)؛ فشل الحفظ ← نبقى في الاختبار.
 * @param {Function} getGameState - يرجع GameState الحالي
 * @param {boolean} kids
 * @param {Function} getContext - يرجع { student, studentManager }
 */
export function createPausedLeaveGuard(getGameState, kids, getContext) {
    installUnloadWarning(getGameState);
    return async () => {
        if (!document.getElementById('btn-exit-game')) return true;
        const gs = getGameState();
        const { student, studentManager } = getContext();
        if (!gs || gs.isWeaknessMode || !student || !studentManager) return true;
        const answered = gs.reportDetails.length;
        if (answered === 0 || answered >= gs.queue.length) return true;
        const replacing = student.pausedEvaluation && !ownsPaused(gs);
        if (!await hamConfirm(t(replacing ? 'pause_leave_replace_confirm' : 'pause_leave_confirm'))) return false;
        const previous = student.pausedEvaluation;
        try {
            student.pausedEvaluation = buildPausedSnapshot(gs, kids);
            await studentManager.updateStudent(student);
        } catch (err) {
            console.error('تعذر الحفظ التلقائي للاختبار:', err);
            if (previous) student.pausedEvaluation = previous; else delete student.pausedEvaluation;
            alert(t('pause_save_failed'));
            return false;
        }
        gs.autoSaved = true;
        clearInterval(gs.timerInterval);
        return true;
    };
}

/** اللقطة المخزَّنة في سجل الطالب تخصّ هذه الجلسة (استُكملت منها أو حفظتها هذه الجلسة تلقائياً)؟ */
export function ownsPaused(gs) { return !!(gs && (gs.resumedFromPause || gs.autoSaved)); }

/**
 * 🌟 حفظ تلقائي صامت بعد كل إجابة: يحمي الاختبار من إغلاق تبويب/نافذة المتصفح (زر ✕) أو انقطاع الجهاز، حيث لا فرصة
 * لحفظ لحظة الخروج. يتم فقط عند وجود عمل فعلي (إجابة واحدة على الأقل ولم تنتهِ الأسئلة) وخارج جلسة علاج الأخطاء.
 * لا يستبدل اختباراً معلّقاً آخر للطالب لم تبدأ منه هذه الجلسة (يتخطى بصمت). أي فشل لا يقاطع الاختبار.
 */
export function autoSavePaused(gs, kids, student, studentManager) {
    try {
        if (!gs || gs.isWeaknessMode || !student || !studentManager) return;
        const answered = gs.reportDetails.length;
        if (answered === 0 || answered >= gs.queue.length) return;
        if (student.pausedEvaluation && !ownsPaused(gs)) return;
        student.pausedEvaluation = buildPausedSnapshot(gs, kids);
        gs.autoSaved = true;
        studentManager.updateStudent(student).catch(err => console.warn('تعذر الحفظ التلقائي للاختبار:', err));
    } catch (err) { console.warn('تعذر الحفظ التلقائي للاختبار:', err); }
}

/** يحذف لقطة الحفظ التلقائي التي صنعتها هذه الجلسة فقط (عند «خروج وإنهاء» الصريح أو اكتمال الاختبار) */
export function discardAutoSaved(gs, student, studentManager) {
    if (!gs || !gs.autoSaved || !student || !student.pausedEvaluation) return;
    clearPausedEvaluation(student);
    gs.autoSaved = false;
    studentManager.updateStudent(student).catch(() => { /* best-effort */ });
}

// 🌟 تنبيه المتصفح عند إغلاق التبويب/النافذة أو تحديث الصفحة أثناء اختبار فيه عمل فعلي (الحفظ التلقائي أعلاه يحفظ ما سبق)
let unloadGetter = null;
function installUnloadWarning(getGameState) {
    unloadGetter = getGameState;
    if (installUnloadWarning.done) return;
    installUnloadWarning.done = true;
    window.addEventListener('beforeunload', (e) => {
        if (!document.getElementById('btn-exit-game')) return;
        const gs = unloadGetter && unloadGetter();
        if (!gs || gs.isWeaknessMode || gs.reportDetails.length === 0 || gs.reportDetails.length >= gs.queue.length) return;
        e.preventDefault();
        e.returnValue = '';
    });
}

// ===================== نصوص مساعدة =====================

function startOfDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }

/** "اليوم" / "أمس" / "منذ N أيام" بحسب أيام التقويم المحلية (وليس 24 ساعة) */
export function pausedWhenText(iso) {
    const d = iso ? new Date(iso) : null;
    if (!d || isNaN(d.getTime())) return '';
    const days = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
    if (days <= 0) return t('paused_when_today');
    if (days === 1) return t('paused_when_yesterday');
    return tf('paused_when_days', { n: days });
}

// ===================== البطاقة =====================

function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
    #${OVERLAY_ID} { position: fixed; inset: 0; z-index: 10060; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(15, 23, 42, 0.55); }
    #${OVERLAY_ID} .dh-pause-card { width: min(92vw, 460px); background: #fff; border-radius: 22px; padding: 28px 24px 22px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border-top: 6px solid var(--dh-gold-500, #d4a017); font-family: 'IBM Plex Sans Arabic', sans-serif; }
    #${OVERLAY_ID} .dh-pause-icon { font-size: 2.6rem; margin-bottom: 4px; }
    #${OVERLAY_ID} .dh-pause-title { margin: 0 0 6px; font-size: 1.5rem; color: var(--dh-emerald-700, var(--dh-ok, #15803d)); }
    #${OVERLAY_ID} .dh-pause-student { margin: 0 0 12px; font-size: 1.1rem; color: #475569; font-weight: bold; }
    #${OVERLAY_ID} .dh-pause-range { margin: 0 0 12px; font-size: 1.15rem; line-height: 1.7; color: #334155; }
    #${OVERLAY_ID} .dh-pause-stats { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 0 0 14px; }
    #${OVERLAY_ID} .dh-pause-chip { padding: 6px 16px; border-radius: 999px; background: #ecfdf5; color: var(--dh-emerald-700, var(--dh-ok, #15803d)); font-weight: bold; font-size: 1.05rem; }
    #${OVERLAY_ID} .dh-pause-chip-when { background: #fffbeb; color: #92400e; }
    #${OVERLAY_ID} .dh-pause-bar { height: 10px; border-radius: 999px; background: #e2e8f0; overflow: hidden; margin: 0 0 20px; }
    #${OVERLAY_ID} .dh-pause-bar > span { display: block; height: 100%; background: linear-gradient(90deg, var(--dh-emerald-700, var(--dh-ok, #15803d)), var(--dh-gold-500, #d4a017)); border-radius: 999px; }
    #${OVERLAY_ID} .dh-pause-actions { display: flex; flex-direction: column; gap: 10px; }
    #${OVERLAY_ID} .dh-pause-btn { border: 0; border-radius: 14px; padding: 14px 18px; font-size: 1.15rem; font-weight: bold; cursor: pointer; font-family: inherit; }
    #${OVERLAY_ID} .dh-pause-btn-primary { background: var(--dh-emerald-700, var(--dh-ok, #15803d)); color: #fff; }
    #${OVERLAY_ID} .dh-pause-btn-secondary { background: #fff; color: var(--dh-danger, #b91c1c); border: 2px solid #fecaca; }
    #${OVERLAY_ID}.dh-pause-kids .dh-pause-card { width: min(94vw, 520px); border-radius: 30px; }
    #${OVERLAY_ID}.dh-pause-kids .dh-pause-title { font-size: 1.8rem; }
    #${OVERLAY_ID}.dh-pause-kids .dh-pause-range { font-size: 1.35rem; }
    #${OVERLAY_ID}.dh-pause-kids .dh-pause-btn { font-size: 1.35rem; padding: 16px 20px; }
    `;
    document.head.appendChild(style);
}

function escapeText(s) {
    const d = document.createElement('div');
    d.textContent = s == null ? '' : String(s);
    return d.innerHTML;
}

/**
 * يعرض بطاقة "اختبار غير مكتمل" للطالب.
 * @param {Object} student
 * @param {Object} snapshot - ناتج getPausedEvaluation
 * @param {{kids?: boolean, onResume: Function, onDiscard: Function}} opts
 *   onResume: يُستدعى بعد إغلاق البطاقة عند "استكمال".
 *   onDiscard: يُستدعى بعد تأكيد الإلغاء (المستدعي يحذف اللقطة ويحفظ السجل ثم يكمل المسار المعتاد).
 */
export function showPausedEvaluationPrompt(student, snapshot, opts = {}) {
    injectStyleOnce();
    document.getElementById(OVERLAY_ID)?.remove();

    const total = snapshot.queue.length;
    const done = snapshot.currentIndex;
    const pct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
    const when = pausedWhenText(snapshot.pausedAt);

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    if (opts.kids) overlay.classList.add('dh-pause-kids');
    overlay.innerHTML = `
        <div class="dh-pause-card" role="dialog" aria-modal="true">
            <div class="dh-pause-icon">⏸️</div>
            <h3 class="dh-pause-title">${escapeText(t('paused_card_title'))}</h3>
            <p class="dh-pause-student">${escapeText(student && student.name)}</p>
            ${snapshot.evalRangeText ? `<p class="dh-pause-range">${escapeText(snapshot.evalRangeText)}</p>` : ''}
            <div class="dh-pause-stats">
                <span class="dh-pause-chip">${escapeText(tf('paused_card_progress', { done, total }))}</span>
                ${when ? `<span class="dh-pause-chip dh-pause-chip-when">${escapeText(when)}</span>` : ''}
            </div>
            <div class="dh-pause-bar"><span style="width:${pct}%"></span></div>
            <div class="dh-pause-actions">
                <button type="button" class="dh-pause-btn dh-pause-btn-primary" data-act="resume">${escapeText(t('paused_card_resume_btn'))}</button>
                <button type="button" class="dh-pause-btn dh-pause-btn-secondary" data-act="discard">${escapeText(t('paused_card_discard_btn'))}</button>
            </div>
        </div>`;

    const close = () => overlay.remove();
    overlay.querySelector('[data-act="resume"]').addEventListener('click', () => {
        close();
        if (typeof opts.onResume === 'function') opts.onResume();
    });
    overlay.querySelector('[data-act="discard"]').addEventListener('click', async () => {
        // تأكيد قبل الحذف النهائي — الإلغاء يفقد إجابات الطالب في هذا الاختبار (تقرير هذه الجلسة فقط؛
        // أخطاؤه ونقاطه محفوظة أصلاً في سجله)
        if (!await hamConfirm(t('paused_discard_confirm'))) return;
        close();
        if (typeof opts.onDiscard === 'function') opts.onDiscard();
    });
    document.body.appendChild(overlay);
}
