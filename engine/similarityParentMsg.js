// engine/similarityParentMsg.js
//
// 🌟 [2026-11-07 — بطلب المعلم] رسالة ولي الأمر عن «متشابهات القرآن» — منطق بحت (بلا DOM) فيُختبر بـ Node.
// نوعان: (1) بعد جلسة «تدريب اليوم»: النتيجة + ما أتقنه + المواضع التي أخطأ فيها اليوم (3 على الأكثر) + توصية للبيت،
//        (2) ملخّص أسبوعي من بطاقة الطالب: عدد الجلسات + ما أتقنه + ما يحتاج تثبيتاً.
// النصوص كلها من core/i18n.js (عربي/إنجليزي) عبر tr(key, params) الممرَّرة؛ والمؤنّث بمفتاح ‎_f‎ إن وُجد.
// النص القرآني يُكتب بين ﴿ ﴾ كما هو (الرسالة نص عادي في واتساب، لا تنسيق خط).

// tr(key, params): مترجم بصيغة tf في core/i18n.js — يعيد المفتاح نفسه إن لم يوجد
export function makeGendered(tr, girl) {
    return (key, params) => {
        if (girl) {
            const f = tr(key + '_f', params);
            if (f && f !== key + '_f') return f;
        }
        return tr(key, params);
    };
}

// «في سورة أ» / «في سورتي أ و ب» / «في سور أ، ب، ج»
// أكثر من 3 سور: أول 3 ثم «وغيرها» (قائمة طويلة لا تفيد ولي الأمر)
export function placeOf(tr, names) {
    const all = (names || []).filter(Boolean);
    const list = all.slice(0, 3);
    if (list.length === 0) return '';
    if (all.length > 3) return tr('sim_pm_in_many', { list: list.join(tr('sim_pm_list_sep')) }) + tr('sim_pm_and_more');
    if (list.length === 1) return tr('sim_pm_in_one', { s: list[0] });
    if (list.length === 2) return tr('sim_pm_in_two', { a: list[0], b: list[1] });
    return tr('sim_pm_in_many', { list: list.join(tr('sim_pm_list_sep')) });
}

// المواضع التي أخطأ فيها في الجلسة: مجموعة واحدة لكل عبارة، بترتيب أول خطأ، 3 على الأكثر
// answers: [{ sig, anchorPhrase, surahs:[أرقام], isCorrect }]
export function weakPlaces(answers, max = 3) {
    const out = [], seen = new Set();
    for (const a of answers || []) {
        if (a.isCorrect || seen.has(a.sig)) continue;
        seen.add(a.sig);
        // رموز التلخيص اليدوية في العبارة («يَوْمَ ...»، «أ / ب») لا تُعرض لولي الأمر
        const phrase = String(a.anchorPhrase || '').split('/')[0].replace(/\.{2,}|…/g, ' ').replace(/\s+/g, ' ').trim();
        if (!phrase) continue;
        out.push({ phrase, surahs: [...new Set((a.surahs || []).map(Number).filter(Boolean))] });
        if (out.length >= max) break;
    }
    return out;
}

// d = { name, girl, correct, total, mastered, eligible, weak:[{phrase, surahNames:[...]}], teacher }
export function buildSessionMessage(tr0, d) {
    const tr = makeGendered(tr0, d.girl);
    const lines = [tr('sim_pm_greet'), tr('sim_pm_intro', { name: d.name }), ''];
    lines.push(tr('sim_pm_score', { c: d.correct, n: d.total }));
    // «أتقن 0 من 28» بعد أول جلسة تُقرأ سلبية: نكتب «بدأ التدريب على 28 متشابهة» حتى يتقن أول واحدة
    if (d.eligible) lines.push(d.mastered ? tr('sim_pm_mastered', { m: d.mastered, t: d.eligible }) : tr('sim_pm_started', { t: d.eligible }));
    lines.push('');
    if (d.weak && d.weak.length) {
        lines.push(tr('sim_pm_weak_h'));
        d.weak.forEach(w => {
            const where = placeOf(tr, w.surahNames);
            lines.push(`﴿ ${w.phrase} ﴾${where ? ' — ' + where : ''}`);
        });
        lines.push('', tr('sim_pm_home'));
    } else {
        lines.push(tr('sim_pm_all_right'));
    }
    lines.push('', tr('sim_pm_bless'));
    if (d.teacher) lines.push(tr('sim_pm_sign', { teacher: d.teacher }));
    return lines.join('\n');
}

// d = { name, girl, sessions, mastered, eligible, needWork, teacher }
export function buildWeeklyMessage(tr0, d) {
    const tr = makeGendered(tr0, d.girl);
    const lines = [tr('sim_pm_greet')];
    let body = d.sessions
        ? tr(d.mastered ? 'sim_pm_week' : 'sim_pm_week_start', { name: d.name, s: d.sessions, m: d.mastered, t: d.eligible })
        : tr('sim_pm_week_none', { name: d.name, m: d.mastered, t: d.eligible });
    if (d.needWork) body += ' ' + tr('sim_pm_week_need', { w: d.needWork });
    body += ' ' + tr('sim_pm_week_ask');
    lines.push(body, '', tr('sim_pm_bless'));
    if (d.teacher) lines.push(tr('sim_pm_sign', { teacher: d.teacher }));
    return lines.join('\n');
}

// رابط واتساب: برقم ولي الأمر إن كان رقماً دولياً صالحاً، وإلا يختار المعلم جهة الاتصال
export function parentWaUrl(phone, text) {
    let digits = String(phone || '').replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);
    else if (digits.startsWith('00')) digits = digits.slice(2);
    else digits = digits.length >= 10 && !digits.startsWith('0') ? digits : '';
    digits = digits.replace(/\D/g, '');
    const ok = digits.length >= 10 && digits.length <= 15 && !digits.startsWith('0');
    return { url: `https://wa.me/${ok ? digits : ''}?text=${encodeURIComponent(text)}`, hasPhone: ok };
}
