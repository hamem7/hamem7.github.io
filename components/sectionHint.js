// components/sectionHint.js
//
// 🌟 [جديد بالكامل] نظام "تلميحات الأقسام عند أول دخول" — بطاقة عائمة خفيفة (position: fixed)
// غير حاجبة للشاشة، على عكس تماماً `.whats-new-modal` الحاجب الموجود أصلاً في index.html
// (خلفية سوداء شبه شفافة تمنع أي تفاعل). المعلم يقدر يستمر بالتفاعل مع الشاشة تحتها وهو لسه
// شايف البطاقة. راجع مستند المشروع "تصميم-نظام-تلميحات-الأقسام-عند-أول-دخول-المقترح.md"
// لتفاصيل القرار الكامل الذي بُني عليه هذا الملف (دُرس فيه نمط whats-new-modal ونمط
// openModal/showToastEncouragement في components/ui.js قبل اختيار هذا الحل الوسط).
//
// الآلية: علم بوليني واحد لكل قسم (sectionKey) في كائن JSON واحد داخل localStorage (وليس
// IndexedDB — نفس فلسفة `dh_last_seen_version` في core/app.js: مجرد أعلام بوليانية صغيرة جداً
// جداً، بلا أي مزامنة سحابية لأن المنصة لمعلم واحد). العلم يُسجَّل عند "الإغلاق" لا عند
// "الظهور" — لو المعلم قفل الشاشة بسرعة قبل ما يقرأ التلميح، يفضل يظهر له تاني في المرة الجاية.
//
// نقطة الربط تكون من داخل كل initFunction/openXScreen الخاصة بكل شاشة (وليس مركزياً من
// core/navigation.js أو core/app.js) — بنفس القرار الموثّق في المستند، حتى لا يخاطر أي خطأ هنا
// بكسر التنقل العام لكل شاشات المنصة دفعة واحدة.

import { t } from '../core/i18n.js';

const SEEN_HINTS_STORAGE_KEY = 'dh_seen_section_hints';

function getSeenMap() {
    try {
        const raw = localStorage.getItem(SEEN_HINTS_STORAGE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch (e) {
        // 🌟 لو التخزين محظور (وضع تصفح خاص صارم مثلاً) أو المحتوى تالف، نتعامل كأنه "لسه
        // ما شافش حاجة" بدل ما نكسر الشاشة بخطأ غير متوقع
        return {};
    }
}

function markSeen(sectionKey) {
    const map = getSeenMap();
    map[sectionKey] = true;
    try {
        localStorage.setItem(SEEN_HINTS_STORAGE_KEY, JSON.stringify(map));
    } catch (e) {
        // تجاهل بصمت — أسوأ حالة أن يظهر التلميح مرة أخرى، وهذا غير ضار إطلاقاً
    }
}

/**
 * تعرض بطاقة تلميح/تنبيه عائمة خاصة بقسم معيّن، مرة واحدة فقط لكل قسم على هذا الجهاز.
 *
 * @param {string} sectionKey - مفتاح فريد وثابت لهذا القسم (مثال: 'adult_game')
 * @param {Object} opts
 * @param {'tip'|'warning'} [opts.type='tip'] - النوع البصري: تلميح ذهبي أو تنبيه بلون الخطر
 * @param {string} opts.titleKey - مفتاح ترجمة العنوان (core/i18n.js)
 * @param {string} opts.bodyKey - مفتاح ترجمة النص — يدعم عدة أسطر عبر "\n" (كل سطر نقطة
 *        منفصلة تُعرض كقائمة، أو فقرة واحدة لو سطر واحد فقط)
 * @param {string} [opts.okKey='hint_ok_btn'] - مفتاح ترجمة زر الإغلاق الرئيسي
 * @param {{labelKey: string, onClick: Function}} [opts.extraAction] - زر إضافي اختياري
 *        (مثال: زر "الانتقال إلى طلابي الآن" في تلميح شاشة تسجيل الدخول)
 * @param {boolean} [opts.force=false] - تجاهل علم "شافه من قبل" وعرضه بأي حال (لأغراض
 *        الاختبار أثناء التطوير فقط)
 */
export function showSectionHintOnce(sectionKey, opts) {
    if (!opts || !opts.titleKey || !opts.bodyKey) return;

    if (!opts.force && getSeenMap()[sectionKey]) return;

    const card = document.getElementById('section-hint-card');
    if (!card) return; // الشاشة لسه ما فيهاش العنصر الثابت (مثلاً أثناء تطوير مستقبلي)

    const type = opts.type === 'warning' ? 'warning' : 'tip';
    card.className = `dh-hint-card dh-hint-${type}`;

    const iconEl = card.querySelector('.dh-hint-icon');
    const titleEl = card.querySelector('.dh-hint-title');
    const bodyEl = card.querySelector('.dh-hint-body');
    const okBtn = card.querySelector('.dh-hint-ok-btn');
    const closeBtn = card.querySelector('.dh-hint-close-btn');
    const extraBtn = card.querySelector('.dh-hint-extra-btn');
    if (!iconEl || !titleEl || !bodyEl || !okBtn || !closeBtn || !extraBtn) return;

    iconEl.textContent = type === 'warning' ? '⚠️' : '💡';
    titleEl.textContent = t(opts.titleKey);

    // 🌟 سطر واحد = فقرة عادية، أكتر من سطر (مفصولة بـ "\n" في core/i18n.js) = نقاط قائمة —
    // نفس فكرة عرض بنود متعددة الموجودة أصلاً في renderWhatsNewModal بـ core/app.js
    const lines = String(t(opts.bodyKey)).split('\n').map(l => l.trim()).filter(Boolean);
    bodyEl.innerHTML = lines.length > 1
        ? `<ul class="dh-hint-list">${lines.map(l => `<li>${l}</li>`).join('')}</ul>`
        : `<p>${lines[0] || ''}</p>`;

    okBtn.textContent = t(opts.okKey || 'hint_ok_btn');

    const dismiss = () => {
        markSeen(sectionKey);
        card.style.display = 'none';
        okBtn.onclick = null;
        closeBtn.onclick = null;
        extraBtn.onclick = null;
    };
    okBtn.onclick = dismiss;
    closeBtn.onclick = dismiss;

    if (opts.extraAction && opts.extraAction.labelKey && typeof opts.extraAction.onClick === 'function') {
        extraBtn.style.display = 'inline-flex';
        extraBtn.textContent = t(opts.extraAction.labelKey);
        extraBtn.onclick = () => {
            markSeen(sectionKey);
            card.style.display = 'none';
            opts.extraAction.onClick();
        };
    } else {
        extraBtn.style.display = 'none';
        extraBtn.onclick = null;
    }

    card.style.display = 'flex';
}

// 🌟 [جديد] إعادة تعيين كل تلميحات الأقسام — مفيدة للاختبار أثناء التطوير، أو لو المعلم حب
// يراجع كل التلميحات من جديد على جهازه. غير مربوطة بأي زر في الواجهة حالياً بطلب صريح
// (القرار النهائي لمكان إضافة زر لها، لو رغب المعلم، متروك له لاحقاً)
export function resetAllSectionHints() {
    try {
        localStorage.removeItem(SEEN_HINTS_STORAGE_KEY);
    } catch (e) { /* تجاهل بصمت */ }
}
