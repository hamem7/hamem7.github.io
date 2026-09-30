// components/fixErrorsPrompt.js
//
// 🌟 [جديد بالكامل] مسار "إصلاح الأخطاء السابقة عند الدخول" — بطاقتان مستقلتان:
//   1) showFixErrorsPrompt: تظهر فور اختيار اسم الطالب (في ركن الكبار أو الأطفال) لو كان له أخطاء
//      مسجَّلة سابقاً، وتعرض خيارين: "ابدأ الإصلاح الآن" (يفتح جلسة تحدي الأخطاء الموجودة أصلاً)
//      أو "لاحقاً — إلى الألعاب" (الدخول العادي كما كان دائماً). ليست إجبارية أبداً — نفس فلسفة
//      المنصة بأن لا شيء يُفرض على المعلم أو الطالب.
//   2) showFixErrorsSummary: تظهر عند انتهاء جلسة الإصلاح تلك (وليس أي تحدٍّ آخر مفتوح من ملف
//      الطالب) لتعرض كم خطأً أُصلح وكم تبقّى، ثم زر واحد ينقل إلى شاشة الألعاب.
//
// لماذا ملف مستقل؟ بنفس فلسفة components/welcomeBanner.js وsectionHint.js: نقطة الربط تُستدعى
// من الشاشات (student/student.js ثم games/adultGame.js وkidsGame.js)، ومنطق العرض في مكان واحد.
//
// 🌟 العزل: البطاقة تُنشأ ديناميكياً وتُحذف بعد الاستخدام، وكل قواعد CSS هنا بادئتها dh-fixp-
// ومحقونة من هذا الملف نفسه (لا لمس لأي CSS عام موجود)، بألوان الهوية --dh-emerald/--dh-gold
// مع قيم احتياطية لو لم تكن المتغيرات معرَّفة في الشاشة الحالية.
//
// ⚠️ [افتراض صريح]: تظهر البطاقة الأولى في كل مرة يُختار فيها طالب لديه أخطاء (وليس مرة في
// اليوم)، لأن "لاحقاً" خيار بنقرة واحدة ولا يكلّف شيئاً. لو رغب المعلم بحد أقصى مرة يومياً
// لكل طالب يمكن إضافة علم بسيط في localStorage هنا فقط بلا تعديل أي ملف آخر.

import { t } from '../core/i18n.js';

const STYLE_ID = 'dh-fixp-style';
const OVERLAY_ID = 'dh-fixp-overlay';

function injectStyleOnce() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
    #${OVERLAY_ID} { position: fixed; inset: 0; z-index: 10050; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(15, 23, 42, 0.55); }
    #${OVERLAY_ID} .dh-fixp-card { width: min(92vw, 460px); background: #fff; border-radius: 22px; padding: 28px 24px 22px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border-top: 6px solid var(--dh-gold-500, #d4a017); font-family: 'Tajawal', sans-serif; }
    #${OVERLAY_ID} .dh-fixp-avatar { width: 84px; height: 84px; margin: 0 auto 12px; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 2.6rem; font-weight: bold; color: #fff; background: var(--dh-emerald-700, #047857); border: 4px solid var(--dh-gold-500, #d4a017); }
    #${OVERLAY_ID} .dh-fixp-avatar img { width: 100%; height: 100%; object-fit: cover; }
    #${OVERLAY_ID} .dh-fixp-title { margin: 0 0 10px; font-size: 1.5rem; color: var(--dh-emerald-700, #047857); }
    #${OVERLAY_ID} .dh-fixp-body { margin: 0 0 20px; font-size: 1.15rem; line-height: 1.8; color: #334155; }
    #${OVERLAY_ID} .dh-fixp-actions { display: flex; flex-direction: column; gap: 10px; }
    #${OVERLAY_ID} .dh-fixp-btn { border: 0; border-radius: 14px; padding: 14px 18px; font-size: 1.15rem; font-weight: bold; cursor: pointer; font-family: inherit; }
    #${OVERLAY_ID} .dh-fixp-btn-primary { background: var(--dh-emerald-700, #047857); color: #fff; }
    #${OVERLAY_ID} .dh-fixp-btn-secondary { background: #fff; color: var(--dh-emerald-700, #047857); border: 2px solid var(--dh-gold-500, #d4a017); }
    #${OVERLAY_ID} .dh-fixp-stat { display: inline-block; margin: 0 0 14px; padding: 6px 16px; border-radius: 999px; background: #ecfdf5; color: var(--dh-emerald-700, #047857); font-weight: bold; font-size: 1.05rem; }
    #${OVERLAY_ID}.dh-fixp-kids .dh-fixp-card { width: min(94vw, 520px); border-radius: 30px; }
    #${OVERLAY_ID}.dh-fixp-kids .dh-fixp-title { font-size: 1.8rem; }
    #${OVERLAY_ID}.dh-fixp-kids .dh-fixp-body { font-size: 1.35rem; }
    #${OVERLAY_ID}.dh-fixp-kids .dh-fixp-btn { font-size: 1.35rem; padding: 16px 20px; }
    `;
    document.head.appendChild(style);
}

// 🌟 [جديد] "مرة واحدة يوميًا لكل طالب": بمجرد أن يختار المعلم أي خيار في البطاقة الأولى
// ("ابدأ الإصلاح" أو "لاحقًا")، لا تظهر لنفس الطالب مرة أخرى حتى اليوم التالي. العلم مجرد
// خريطة صغيرة {معرّف الطالب: تاريخ اليوم} في localStorage (نفس فلسفة أعلام sectionHint.js:
// بلا أي مساس بسجل الطالب نفسه). لو التخزين محظور أو تالف نتصرف كأن البطاقة لم تُعرض اليوم،
// فأسوأ حالة أن تظهر مرة زائدة، وهذا غير ضار إطلاقاً.
const SHOWN_STORAGE_KEY = 'dh_fixp_last_handled';

export function todayLocalKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function readHandledMap() {
    try {
        const raw = localStorage.getItem(SHOWN_STORAGE_KEY);
        const map = raw ? JSON.parse(raw) : {};
        return map && typeof map === 'object' ? map : {};
    } catch (e) { return {}; }
}

/** هل يجب عرض بطاقة "إصلاح الأخطاء" لهذا الطالب الآن؟ (لا، لو سبق التعامل معها اليوم) */
export function shouldShowFixPromptToday(student) {
    if (!student || student.id == null) return true;
    return readHandledMap()[String(student.id)] !== todayLocalKey();
}

/** تسجيل أن المعلم تعامل مع البطاقة اليوم (بدء الإصلاح أو التأجيل) */
export function markFixPromptHandledToday(student) {
    if (!student || student.id == null) return;
    const map = readHandledMap();
    map[String(student.id)] = todayLocalKey();
    try { localStorage.setItem(SHOWN_STORAGE_KEY, JSON.stringify(map)); } catch (e) { /* تجاهل بصمت */ }
}

// 🌟 [جديد] "التثبيت بمراجعتين": الخطأ لا يُؤرشَف من أول إجابة صحيحة. أول إجابة صحيحة تعلّمه
// (confirmCount = 1 + firstCorrectDay = يوم الإجابة) ويبقى في student.weaknesses، ولا يُسأل
// مرة أخرى في نفس اليوم؛ فيعود "مستحقاً" في أول جلسة إصلاح تبدأ في أي يوم لاحق (بعد يوم أو
// أسبوع — أي وقت يدخل فيه الطالب مجدداً). الإجابة الصحيحة الثانية في يوم مختلف هي التي
// تؤرشفه وتحسبه "عولج". أي إجابة خاطئة أثناء المراجعة تُصفّر العدّاد. ⚠️ [افتراض صريح]:
// الأخطاء المسجَّلة قبل هذا التحديث (بلا confirmCount) تُعامَل كأنها جديدة وتحتاج إجابتين،
// والتاريخ بتوقيت جهاز المعلم المحلي (اليوم = يوم تقويمي، وليس 24 ساعة).

/** هل هذا الخطأ مستحق للمراجعة الآن؟ (لم يُجَب صح اليوم بعد) */
export function isWeaknessDue(w) {
    return !w || !w.firstCorrectDay || w.firstCorrectDay !== todayLocalKey();
}

/** الأخطاء المستحقة الآن لهذا الطالب (تُبنى منها جلسة الإصلاح وعدّاد البطاقة) */
export function getDueWeaknesses(student) {
    const list = student && Array.isArray(student.weaknesses) ? student.weaknesses : [];
    return list.filter(isWeaknessDue);
}

/**
 * يطبّق إجابة صحيحة في جلسة الإصلاح على سجل الطالب (بلا حفظ — الحفظ على المستدعي).
 * @param {(w: Object) => boolean} isSameError - مطابقة الخطأ (normalizeForCompare في اللعبة)
 */
export function applyFixCorrectAnswer(student, isSameError) {
    const list = Array.isArray(student.weaknesses) ? student.weaknesses : [];
    const item = list.find(isSameError);
    if (!item) return;
    const today = todayLocalKey();
    if ((item.confirmCount || 0) >= 1 && item.firstCorrectDay !== today) {
        // المراجعة الثانية في يوم مختلف → تثبيت نهائي: أرشفة بكل التفاصيل
        if (!Array.isArray(student.resolvedWeaknesses)) student.resolvedWeaknesses = [];
        student.resolvedWeaknesses.push({ ...item, confirmCount: 2, dateResolved: new Date().toISOString() });
        student.weaknesses = list.filter(w => !isSameError(w));
    } else {
        item.confirmCount = 1;
        item.firstCorrectAt = new Date().toISOString();
        item.firstCorrectDay = today;
    }
}

/** إجابة خاطئة أثناء المراجعة: تصفير التثبيت. يرجع true لو تغيّر شيء (ليُحفَظ السجل) */
export function applyFixWrongAnswer(student, isSameError) {
    const list = Array.isArray(student.weaknesses) ? student.weaknesses : [];
    const item = list.find(isSameError);
    if (!item || !(item.confirmCount > 0)) return false;
    item.confirmCount = 0;
    delete item.firstCorrectAt;
    delete item.firstCorrectDay;
    return true;
}

/**
 * ملخص جلسة إصلاح انتهت — بمقارنة لقطة الجلسة بحالة السجل الآن:
 *   resolved = تثبّت نهائياً (أُرشف)، pendingConfirm = أجاب صح اليوم وتنتظر مراجعة ثانية،
 *   remaining = لم يُجَب صح (تبقى مستحقاً).
 */
export function summarizeFixSession(student, snapshot, isSame) {
    const current = student && Array.isArray(student.weaknesses) ? student.weaknesses : [];
    const today = todayLocalKey();
    let resolved = 0, pendingConfirm = 0, remaining = 0;
    (snapshot || []).forEach(w => {
        const now = current.find(c => isSame(c, w));
        if (!now) resolved++;
        else if ((now.confirmCount || 0) >= 1 && now.firstCorrectDay === today) pendingConfirm++;
        else remaining++;
    });
    return { total: (snapshot || []).length, correct: resolved + pendingConfirm, resolved, pendingConfirm, remaining };
}

// يستبدل {key} في نص الترجمة بقيم فعلية
function fill(text, vars) {
    return String(text).replace(/\{(\w+)\}/g, (m, k) => (vars && vars[k] !== undefined ? vars[k] : m));
}

function buildAvatar(student) {
    const el = document.createElement('div');
    el.className = 'dh-fixp-avatar';
    const name = (student && student.name ? String(student.name) : '').trim();
    const avatar = student && student.avatar ? String(student.avatar) : '';
    if (avatar && avatar.length >= 10) {
        const img = document.createElement('img');
        img.src = avatar;
        img.alt = name;
        img.onerror = () => { el.innerHTML = ''; el.textContent = name.charAt(0) || '★'; };
        el.appendChild(img);
    } else if (avatar) {
        el.textContent = avatar; // إيموجي قصير
    } else {
        el.textContent = name.charAt(0) || '★'; // البديل المعتمد: أول حرف من الاسم
    }
    return el;
}

function closeOverlay() {
    document.getElementById(OVERLAY_ID)?.remove();
}

function mountCard(student, { kids, title, bodyHtml, statText, buttons }) {
    injectStyleOnce();
    closeOverlay(); // لا تتراكم بطاقتان لو استُدعيت مرتين بسرعة

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    if (kids) overlay.classList.add('dh-fixp-kids');

    const card = document.createElement('div');
    card.className = 'dh-fixp-card';
    card.setAttribute('role', 'dialog');
    card.appendChild(buildAvatar(student));

    const h = document.createElement('h2');
    h.className = 'dh-fixp-title';
    h.textContent = title;
    card.appendChild(h);

    if (statText) {
        const stat = document.createElement('div');
        stat.className = 'dh-fixp-stat';
        stat.textContent = statText;
        card.appendChild(stat);
    }

    const p = document.createElement('p');
    p.className = 'dh-fixp-body';
    p.textContent = bodyHtml;
    card.appendChild(p);

    const actions = document.createElement('div');
    actions.className = 'dh-fixp-actions';
    buttons.forEach(b => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `dh-fixp-btn ${b.primary ? 'dh-fixp-btn-primary' : 'dh-fixp-btn-secondary'}`;
        btn.textContent = b.label;
        btn.onclick = () => { closeOverlay(); b.onClick(); };
        actions.appendChild(btn);
    });
    card.appendChild(actions);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    // التركيز على الزر الرئيسي ليعمل Enter مباشرة
    actions.querySelector('.dh-fixp-btn-primary')?.focus();
}

/**
 * البطاقة الأولى: "عند هذا الطالب أخطاء سابقة — ابدأ الإصلاح الآن أو لاحقاً".
 * @param {Object} student - سجل الطالب (name/avatar/weaknesses)
 * @param {{kids?: boolean, onStart: Function, onLater: Function}} opts
 */
export function showFixErrorsPrompt(student, opts = {}) {
    // 🌟 العدد = الأخطاء "المستحقة" الآن فقط (تشمل ما ينتظر مراجعته الثانية في يوم لاحق) 🌟
    const count = getDueWeaknesses(student).length;
    const vars = { name: student && student.name ? student.name : '', n: count };
    mountCard(student, {
        kids: !!opts.kids,
        title: t('fixp_title'),
        bodyHtml: fill(t(opts.kids ? 'fixp_body_kids' : 'fixp_body'), vars),
        statText: null,
        buttons: [
            { label: t('fixp_start_btn'), primary: true, onClick: () => opts.onStart && opts.onStart() },
            { label: t('fixp_later_btn'), primary: false, onClick: () => opts.onLater && opts.onLater() }
        ]
    });
}

/**
 * البطاقة الثانية: ملخص نهاية جلسة الإصلاح ثم الانتقال إلى الألعاب.
 * @param {Object} student
 * @param {{kids?: boolean, total: number, correct: number, resolved: number, pendingConfirm: number, remaining: number, onContinue: Function}} opts
 *        (الأرقام من summarizeFixSession أعلاه)
 */
export function showFixErrorsSummary(student, opts = {}) {
    const total = opts.total || 0, correct = opts.correct || 0, resolved = opts.resolved || 0;
    const pendingConfirm = opts.pendingConfirm || 0, remaining = opts.remaining || 0;
    // 🌟 جمل قصيرة تُضاف حسب الحالة: أجاب صح على كم، كم تثبّت نهائياً، كم ينتظر المراجعة
    // الثانية في المرة القادمة، وكم لم يُجَب صح بعد 🌟
    const lines = [fill(t('fixp_sum_line_correct'), { correct, total })];
    if (resolved > 0) lines.push(fill(t('fixp_sum_line_done'), { resolved }));
    if (pendingConfirm > 0) lines.push(fill(t('fixp_sum_line_confirm'), { pending: pendingConfirm }));
    if (remaining > 0) lines.push(fill(t('fixp_sum_line_left'), { remaining }));
    mountCard(student, {
        kids: !!opts.kids,
        title: t('fixp_sum_title'),
        statText: `${correct} / ${total}`,
        bodyHtml: lines.join(' '),
        buttons: [
            { label: t('fixp_sum_continue_btn'), primary: true, onClick: () => opts.onContinue && opts.onContinue() }
        ]
    });
}
