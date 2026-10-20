// tajweed/tajweed-illustrations.js
//
// 🌟 [جديد] رسومات توضيحية (SVG مرسومة بالكود) لكل حكم في «أبطال التجويد» — فكرة بصرية تقرّب الحكم للطفل
// (كرة على نابض للقلقلة، نحلة للغنة، سحابة تُخفي الحرف للإخفاء، شمس/قمر للام «ال»، شريط عدّات للمد…).
// الرسم نفسه بلا أي نصّ قرآني: كل كلمة قرآنية تُقتطع وقت العرض من مصحف المنصة (مثال الحكم + مثال التطبيق)
// عبر getAyahForExample وfindPhraseRanges فتُوضَع داخل الرسم. التسمية النصية تحت الرسم مفتاح ترجمة (tjw_ill_*)،
// أما داخل الـSVG فحروف وأرقام فقط فلا يحتاج ترجمة.
import { t } from '../core/app.js';
import { findPhraseRanges } from '../core/quranTextUtils.js';
import { getAyahForExample } from './tajweed-shared.js';
import { hasIllustration, buildIllustrationSVG, buildMakharijSVG, buildMakharijLegendHTML } from './tajweed-illustrations-art.js';

// عبارة المثال من آية حقيقية في مصحف المنصة
async function phraseOf(ex) {
    if (!ex) return '';
    const info = await getAyahForExample(ex.surah, ex.ayah);
    if (!info) return '';
    const r = findPhraseRanges(info.text, ex.highlight);
    return r.length ? info.text.slice(r[0][0], r[0][1]) : '';
}

// 🌟 يُستدعى من شاشة الدرس: يُرجع HTML القسم كاملاً، أو '' إن لم يكن للحكم رسم
export async function renderRuleIllustrationHTML(rule) {
    if (!hasIllustration(rule.id)) return '';
    const words = [];
    for (const ex of [rule.example, rule.practiceExample]) {
        const w = await phraseOf(ex);
        if (w && !words.includes(w)) words.push(w);
    }
    const caption = t('tjw_ill_' + rule.id);
    return `<section class="tjw-illus"><h3 class="tjw-section-title">${t('tjw_illus_title')}</h3>
        <figure>${buildIllustrationSVG(rule.id, words.slice(0, 2), caption)}<figcaption>${caption}</figcaption></figure></section>`;
}

// 🌟 مخارج الحروف: الرسم + قائمة المخارج الـ17 (جاهز للإدراج في أي شاشة؛ غير مربوط بدرس حتى الآن)
export function renderMakharijHTML() {
    const title = t('tjw_mkh_title');
    return `<section class="tjw-illus"><h3 class="tjw-section-title">${title}</h3>
        <figure>${buildMakharijSVG(title)}</figure>${buildMakharijLegendHTML(k => t('tjw_mkh_' + k))}</section>`;
}
