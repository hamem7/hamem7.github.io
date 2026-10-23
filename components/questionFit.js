// components/questionFit.js
// 🌟 [جديد 2026-10-23] «ملاءمة السؤال للمساحة» — آلية واحدة مشتركة بدل قواعد vh/vw منفصلة لكل نوع سؤال.
// السبب الجذري الذي عالجناه: كل نوع سؤال (المتشابهات، معنى الكلمة، الربط...) كان له أحجام خطوط ثابتة أو clamp(…vh) مكتوبة
// يدويًا في css/gameFullscreen.css وcss/mobile.css؛ فإما تتكدّس العناصر أعلى اللوحة ويبقى باقيها فارغًا (شاشة كبيرة)،
// أو تتجاوز الشاشة فيظهر تمرير (شاشة قصيرة/هاتف)، وكل حل مؤقت لحالة يكسر أخرى (آية طويلة، تشكيل كثيف، لغة أخرى).
// الآن: نُعلّم <body> بعائلة السؤال (data-qfit = "sim" | "link") ونحسب معامل تكبير واحد (--qf) هو أكبر قيمة
// لا يتجاوز بها المحتوى المساحة المتاحة (بحث ثنائي)، وكل أحجام تلك الأسئلة في css/questionLayout.css مضروبة فيه.
// فيكبر الخط تلقائيًا حيث توجد مساحة (الأطفال)، ويصغر بقدر الحاجة فقط حيث لا توجد، مهما كان النص أو اللغة أو الشاشة.
// - تُعاد الملاءمة عند: تغيّر محتوى لوحة اللعب، تغيّر حجم النافذة/اتجاهها، تحميل الخطوط، تبديل اللغة، وضع ملء الشاشة.
// - لا تُحسب إجابة المعلم/التلميح/لوحة الملاحظات ضمن المساحة (تظهر عند الطلب وتُمرَّر داخل اللوحة على سطح المكتب).
const MIN_QF = 0.5, MAX_QF = 1.7, ITERATIONS = 9;
const DESKTOP = '(min-width: 901px)';

let observer = null, raf = 0, wired = false, busy = false;

const shown = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0;

// عائلة السؤال المعروض حاليًا ('' = غير معنيّ فلا نلمسه)
export function questionFamily() {
    if (shown(document.getElementById('interactive-link-area')) || shown(document.getElementById('kids-link-area'))) return 'link';
    const q = document.getElementById('game-question');
    if (shown(q) && q.querySelector('.sim-q-text, .sim-opt-btn')) return 'sim';
    return '';
}

// مقدار تجاوز المحتوى للمساحة (px): على سطح المكتب داخل لوحة اللعب نفسها، وعلى الهاتف/الآيباد الرأسي في الصفحة كلها
function overflowPx(main) {
    if (window.matchMedia(DESKTOP).matches) return main.scrollHeight - main.clientHeight;
    const de = document.scrollingElement || document.documentElement;
    return de.scrollHeight - window.innerHeight;
}

function fitNow() {
    raf = 0;
    const main = document.querySelector('.game-main-area');
    if (!main || !/Game\.html$/.test(document.body.dataset.dhScreen || '')) return;
    const fam = questionFamily();
    const body = document.body;
    if (!fam) { if (body.dataset.qfit) { delete body.dataset.qfit; body.style.removeProperty('--qf'); } return; }
    busy = true;
    // global.css يضع transition:.2s على .link-item (وبعض الأزرار) فيُقاس تخطيط «قديم» أثناء الانتقال ويخرج المعامل خاطئًا — نوقف الانتقالات أثناء القياس فقط
    document.body.dataset.qfitMeasuring = '1';
    // المحتوى الاختياري الذي يظهر عند الطلب لا يدخل في الحساب (وإلا انكمش السؤال كلما كُشف تلميح)
    const optional = ['game-answer', 'hint-text'].map(id => document.getElementById(id)).filter(Boolean);
    const saved = optional.map(el => el.style.display);
    optional.forEach(el => el.style.setProperty('display', 'none', 'important'));
    body.dataset.qfit = fam;
    const set = (v) => body.style.setProperty('--qf', v.toFixed(3));
    let lo = MIN_QF, hi = MAX_QF, best = MIN_QF;
    set(hi);
    if (overflowPx(main) <= 1) best = hi;
    else {
        for (let i = 0; i < ITERATIONS; i++) {
            const mid = (lo + hi) / 2;
            set(mid);
            if (overflowPx(main) <= 1) { best = mid; lo = mid; } else hi = mid;
        }
    }
    set(best);
    optional.forEach((el, i) => { el.style.display = saved[i]; if (!saved[i]) el.style.removeProperty('display'); });
    // القراءة الأخيرة تُجبر المتصفح على حساب الأنماط النهائية قبل إعادة الانتقالات فلا تبدأ حركة بسبب القياس
    void main.offsetHeight;
    delete document.body.dataset.qfitMeasuring;
    if (observer) observer.takeRecords();
    busy = false;
}

export function scheduleQuestionFit() {
    if (busy || raf) return;
    raf = requestAnimationFrame(fitNow);
}

export function initQuestionFit() {
    const main = document.querySelector('.game-main-area');
    if (!main) return;
    if (observer) observer.disconnect();
    observer = new MutationObserver(scheduleQuestionFit);
    observer.observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
    if (!wired) {
        wired = true;
        window.addEventListener('resize', scheduleQuestionFit);
        window.addEventListener('orientationchange', scheduleQuestionFit);
        document.addEventListener('app-lang-changed', scheduleQuestionFit);
        document.addEventListener('fullscreenchange', scheduleQuestionFit);
        document.fonts && document.fonts.ready.then(scheduleQuestionFit).catch(() => {});
        new MutationObserver(scheduleQuestionFit).observe(document.body, { attributes: true, attributeFilter: ['data-game-fs'] });
        // مغادرة شاشة الاختبار: نُنظّف العلامة والمعامل حتى لا يتسرّبا إلى شاشة أخرى
        document.addEventListener('dh:screen', () => {
            if (/Game\.html$/.test(document.body.dataset.dhScreen || '')) return;
            if (observer) observer.disconnect();
            delete document.body.dataset.qfit; document.body.style.removeProperty('--qf');
        });
    }
    scheduleQuestionFit();
}
