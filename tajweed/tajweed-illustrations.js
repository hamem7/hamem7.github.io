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

const INK = '#2b2118';
const PAPER = '#fff8e6';
const QFONT = "'Amiri Quran', serif";
const SHADDA = 'ّ';

const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const baseLen = (s) => s.replace(/[ً-ٰٟۖ-ۭ]/g, '').length;

// ------------------------------------------------------------
// أدوات رسم صغيرة
// ------------------------------------------------------------
function badge(cx, cy, r, ch, fill, opts = {}) {
    const fs = opts.fs || Math.round(r * 1.1);
    const stroke = opts.stroke || INK;
    return `<g${opts.opacity ? ` opacity="${opts.opacity}"` : ''}><circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"${opts.dash ? ' stroke-dasharray="5 4"' : ''}/>
        <text x="${cx}" y="${cy + fs * 0.2}" text-anchor="middle" font-family="${QFONT}" font-size="${fs}" fill="${opts.color || '#fff'}">${esc(ch)}</text></g>`;
}
function arrow(x1, y1, x2, y2, color = INK, dash = false) {
    const a = Math.atan2(y2 - y1, x2 - x1), h = 9;
    const p1 = [x2 - h * Math.cos(a - 0.45), y2 - h * Math.sin(a - 0.45)], p2 = [x2 - h * Math.cos(a + 0.45), y2 - h * Math.sin(a + 0.45)];
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="3" stroke-linecap="round"${dash ? ' stroke-dasharray="6 5"' : ''}/>
        <polygon points="${x2},${y2} ${p1[0].toFixed(1)},${p1[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}" fill="${color}"/>`;
}
const wave = (x, y, len, color, amp = 7) => {
    let d = `M ${x} ${y}`;
    for (let i = 0; i < len; i += 20) d += ` q 5 ${-amp} 10 0 t 10 0`;
    return `<path d="${d}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>`;
};
const dots = (cx, cy, n, color) => {
    const gap = 17, x0 = cx - ((n - 1) * gap) / 2;
    return Array.from({ length: n }, (_, i) => `<circle cx="${(x0 + i * gap).toFixed(1)}" cy="${cy}" r="6" fill="${color}" stroke="${INK}" stroke-width="1.5"/>`).join('');
};
function wordCard(cx, y, w, text, color) {
    const n = baseLen(text), fs = n <= 6 ? 26 : n <= 11 ? 22 : n <= 16 ? 19 : 16;
    return `<g><rect x="${cx - w / 2}" y="${y}" width="${w}" height="54" rx="14" fill="#fff" stroke="${color}" stroke-width="3"/>
        <text x="${cx}" y="${y + 36}" text-anchor="middle" direction="rtl" font-family="${QFONT}" font-size="${fs}" fill="${INK}">${esc(text)}</text></g>`;
}
function wordCards(words, color) {
    const ws = words.filter(Boolean);
    if (!ws.length) return '';
    if (ws.length === 1) return wordCard(180, 136, 230, ws[0], color);
    return wordCard(94, 136, 168, ws[0], color) + wordCard(266, 136, 168, ws[1], color);
}

// ------------------------------------------------------------
// المشاهد (منطقة الرسم y: 0..132 — وتحتها بطاقات الكلمات القرآنية)
// ------------------------------------------------------------
const SCENES = {
    // القلقلة: كرة ترتدّ على نابض فوق أحجار حروف «قطب جد»
    bounce() {
        const spring = 'M 62 118 l 18 -7 l -36 -7 l 36 -7 l -36 -7 l 36 -7 l -36 -7 l 18 -7';
        const stones = ['ق', 'ط', 'ب', 'ج', 'د'].map((c, i) => badge(160 + i * 42, 104, 17, c, '#8c2f3d', { fs: 22 })).join('');
        return `<ellipse cx="62" cy="122" rx="30" ry="6" fill="#d9c9a3"/>
            <path d="${spring}" fill="none" stroke="#5b7fa6" stroke-width="5" stroke-linejoin="round" transform="translate(0,-4)"/>
            <circle cx="62" cy="30" r="16" fill="#ef8a3c" stroke="${INK}" stroke-width="2.5"/>
            <ellipse cx="57" cy="24" rx="5" ry="3.5" fill="#ffd9b0"/>
            <path d="M 78 34 Q 112 -2 150 30 T 232 30 T 330 30" fill="none" stroke="#ef8a3c" stroke-width="3" stroke-dasharray="5 6" stroke-linecap="round"/>
            <path d="M 40 42 l -10 -6 M 38 54 l -12 0 M 40 66 l -10 6" stroke="#ef8a3c" stroke-width="3" stroke-linecap="round"/>${stones}`;
    },
    // الغنّة: نحلة تطنّ، والصوت يخرج من الأنف
    hum() {
        return `<ellipse cx="86" cy="60" rx="34" ry="24" fill="#f4c542" stroke="${INK}" stroke-width="2.5"/>
            <path d="M 72 38 q -4 22 0 44 M 90 36 q -4 24 0 48" stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round"/>
            <ellipse cx="78" cy="30" rx="18" ry="11" fill="#cfe8ff" stroke="${INK}" stroke-width="2" transform="rotate(-24 78 30)"/>
            <ellipse cx="98" cy="30" rx="18" ry="11" fill="#cfe8ff" stroke="${INK}" stroke-width="2" transform="rotate(24 98 30)"/>
            <circle cx="112" cy="54" r="4.5" fill="${INK}"/><path d="M 52 60 l -14 3" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
            ${wave(134, 62, 80, '#d65db1')}${wave(134, 76, 80, '#d65db1', 5)}
            ${badge(262, 58, 28, 'نّ', '#d65db1', { fs: 34 })}${badge(322, 58, 22, 'مّ', '#7b5cc4', { fs: 28 })}
            ${dots(262, 108, 2, '#d65db1')}`;
    },
    // الإخفاء: سحابة تُخفي الحرف الأول ويبقى أثره (غنة) نحو الحرف التالي
    hide(from, to) {
        return `${badge(70, 44, 30, from, '#3f8fd2', { fs: 38 })}
            <g fill="#fff" stroke="#b9c7d8" stroke-width="2.5"><ellipse cx="88" cy="82" rx="50" ry="24"/><ellipse cx="60" cy="72" rx="26" ry="20"/><ellipse cx="108" cy="68" rx="28" ry="22"/></g>
            ${wave(160, 56, 40, '#d65db1')}${arrow(206, 56, 228, 56, '#d65db1')}
            ${badge(284, 58, 30, to, '#4aa84a', { fs: 38 })}${dots(284, 106, 2, '#d65db1')}`;
    },
    // الإدغام: حرفان يصيران حرفًا واحدًا مشدّدًا (بغنّة أو بغير غنّة)
    merge(from, to, ghunna) {
        const out = ghunna
            ? `${wave(204, 46, 60, '#d65db1')}${dots(300, 108, 2, '#d65db1')}`
            : `<path d="M 208 50 q 5 -7 10 0 t 10 0 t 10 0" fill="none" stroke="#9aa5b1" stroke-width="3" stroke-linecap="round"/><path d="M 204 36 l 62 28 M 266 36 l -62 28" stroke="#b3261e" stroke-width="4" stroke-linecap="round"/>`;
        return `${badge(52, 58, 26, from, '#3f8fd2', { fs: 32 })}<text x="86" y="68" text-anchor="middle" font-size="26" font-weight="700" fill="${INK}">+</text>${badge(122, 58, 26, to, '#4aa84a', { fs: 32 })}
            ${arrow(154, 58, 198, 58)}${out}${badge(300, 58, 38, to + SHADDA, '#4aa84a', { fs: 46 })}`;
    },
    // الإظهار: عدسة تُظهر الحرف واضحًا وبعده الحرف التالي بلا مزج
    clear(from, to) {
        const rays = Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return `<line x1="${(86 + 42 * Math.cos(a)).toFixed(1)}" y1="${(58 + 42 * Math.sin(a)).toFixed(1)}" x2="${(86 + 54 * Math.cos(a)).toFixed(1)}" y2="${(58 + 54 * Math.sin(a)).toFixed(1)}" stroke="#f2a51c" stroke-width="3.5" stroke-linecap="round"/>`; }).join('');
        return `${rays}${badge(86, 58, 34, from, '#f2a51c', { fs: 42 })}
            <circle cx="86" cy="58" r="46" fill="none" stroke="#5b7fa6" stroke-width="5"/><path d="M 118 92 l 24 24" stroke="#5b7fa6" stroke-width="8" stroke-linecap="round"/>
            <path d="M 170 60 H 226" stroke="${INK}" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round"/><path d="M 170 46 v 28 M 226 46 v 28" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
            ${badge(290, 58, 30, to, '#4aa84a', { fs: 38 })}`;
    },
    // الإقلاب: النون تنقلب ميمًا قبل الباء
    flip(from, mid, to) {
        return `${badge(58, 58, 30, from, '#3f8fd2', { fs: 38 })}
            <path d="M 94 40 q 30 -30 60 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><polygon points="156,44 142,40 150,30" fill="${INK}"/>
            <path d="M 154 76 q -30 30 -60 0" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><polygon points="92,72 106,76 98,86" fill="${INK}"/>
            ${badge(190, 58, 32, mid, '#7b5cc4', { fs: 40 })}${wave(228, 100, 40, '#d65db1', 5)}
            <text x="252" y="68" text-anchor="middle" font-size="24" font-weight="700" fill="${INK}">+</text>${badge(300, 58, 30, to, '#4aa84a', { fs: 38 })}`;
    },
    // لام «ال» القمرية: قمر مضيء تُنطق اللام عنده
    moon(next) {
        const star = (x, y, k) => `<path d="M ${x} ${y - 9 * k} l ${2.6 * k} ${6 * k} l ${6.4 * k} ${0.6 * k} l ${-5 * k} ${4 * k} l ${1.6 * k} ${6.4 * k} l ${-5.6 * k} ${-3.6 * k} l ${-5.6 * k} ${3.6 * k} l ${1.6 * k} ${-6.4 * k} l ${-5 * k} ${-4 * k} l ${6.4 * k} ${-0.6 * k} z" fill="#f6d65a" stroke="${INK}" stroke-width="1.5"/>`;
        return `<circle cx="92" cy="60" r="46" fill="#fff3b0" opacity=".7"/><circle cx="92" cy="60" r="38" fill="#f6d65a" stroke="${INK}" stroke-width="2.5"/>
            <circle cx="70" cy="42" r="5" fill="#e3bf3d"/><circle cx="118" cy="78" r="6" fill="#e3bf3d"/><circle cx="116" cy="40" r="3.5" fill="#e3bf3d"/>
            ${badge(92, 60, 22, 'ل', '#17796c', { fs: 28 })}${star(160, 24, 1.2)}${star(40, 112, 1)}
            ${arrow(160, 64, 226, 64, '#17796c')}${badge(284, 60, 30, next, '#4aa84a', { fs: 38 })}`;
    },
    // لام «ال» الشمسية: شمس تُخفي اللام وتُدغم في الحرف بعدها
    sun(next) {
        const rays = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="${(86 + 40 * Math.cos(a)).toFixed(1)}" y1="${(58 + 40 * Math.sin(a)).toFixed(1)}" x2="${(86 + 54 * Math.cos(a)).toFixed(1)}" y2="${(58 + 54 * Math.sin(a)).toFixed(1)}" stroke="#f2a51c" stroke-width="4" stroke-linecap="round"/>`; }).join('');
        return `${rays}<circle cx="86" cy="58" r="36" fill="#ffd54a" stroke="${INK}" stroke-width="2.5"/>
            ${badge(86, 58, 24, 'ل', '#17796c', { fs: 30, dash: true, opacity: '.35' })}
            ${arrow(150, 58, 214, 58, '#a8571e', true)}${badge(280, 58, 36, next + SHADDA, '#a8571e', { fs: 44 })}`;
    },
    // المثلان/المتقاربان/المتجانسان
    twins(a, b) {
        return `${badge(110, 58, 36, a, '#5d4691', { fs: 44 })}<text x="180" y="70" text-anchor="middle" font-size="40" font-weight="700" fill="${INK}">=</text>${badge(250, 58, 36, b, '#5d4691', { fs: 44 })}
            <path d="M 110 104 q 70 22 140 0" fill="none" stroke="#5d4691" stroke-width="3.5" stroke-linecap="round"/>`;
    },
    neighbors(a, b) {
        const house = (x, col) => `<polygon points="${x - 44},60 ${x},22 ${x + 44},60" fill="${col}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="${x - 36}" y="60" width="72" height="56" fill="#fff" stroke="${INK}" stroke-width="2.5"/>`;
        return `${house(100, '#c96a5b')}${badge(100, 88, 22, a, '#5d4691', { fs: 28 })}${house(260, '#5b8fc9')}${badge(260, 88, 22, b, '#17796c', { fs: 28 })}
            ${arrow(148, 92, 212, 92, INK)}${arrow(212, 92, 148, 92, INK)}`;
    },
    sameHouse(a, b) {
        return `<polygon points="100,62 180,16 260,62" fill="#c96a5b" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="110" y="62" width="140" height="56" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
            ${badge(148, 90, 22, a, '#5d4691', { fs: 28 })}${badge(212, 90, 22, b, '#17796c', { fs: 28 })}`;
    },
    // المد: شريط مطاطي يُمدّ بعدد من العدّات + رموز الحالة
    beats(tokens, rows, opts = {}) {
        const tx = (i) => 180 - ((tokens.length - 1) * 58) / 2 + i * 58;
        const tk = tokens.map(([ch, col], i) => badge(tx(i), 36, 24, ch, col, { fs: 28 })).join('');
        const join = opts.together
            ? `<rect x="${tx(0) - 32}" y="6" width="${(tokens.length - 1) * 58 + 64}" height="60" rx="30" fill="none" stroke="${INK}" stroke-width="2.5" stroke-dasharray="6 5"/>`
            : opts.apart ? `<path d="M 180 4 v 64" stroke="#b3261e" stroke-width="4" stroke-dasharray="5 4" stroke-linecap="round"/>` : '';
        const maxN = Math.max(...rows), gx = 180 - (26 + maxN * 17) / 2;
        const y0 = rows.length === 1 ? 100 : 82;
        const band = rows.map((n, i) => {
            const y = y0 + i * 18;
            return `<text x="${gx + 6}" y="${y + 6}" text-anchor="middle" font-size="16" font-weight="700" fill="${INK}" font-family="system-ui,sans-serif">${n}</text>` +
                Array.from({ length: n }, (_, k) => `<circle cx="${gx + 28 + k * 17}" cy="${y}" r="6.5" fill="#2f7d32" stroke="${INK}" stroke-width="1.5"/>`).join('');
        }).join('');
        const sx = tx(tokens.length - 1);
        const stop = opts.stop ? `<g transform="translate(${sx + 40},34)"><polygon points="-6,-14 6,-14 14,-6 14,6 6,14 -6,14 -14,6 -14,-6" fill="#d9301f" stroke="${INK}" stroke-width="2"/><rect x="-8" y="-3" width="16" height="6" fill="#fff"/></g>` : '';
        return `${join}${tk}${stop}${band}`;
    }
};

// ------------------------------------------------------------
// ربط كل حكم بمشهده (وحروف المشهد)
// ------------------------------------------------------------
const RULE_SCENES = {
    qalqalah: { scene: () => SCENES.bounce(), color: '#8c2f3d' },
    ghunna_wajiba: { scene: () => SCENES.hum(), color: '#d65db1' },
    ikhfa_shafawi: { scene: () => SCENES.hide('م', 'ب'), color: '#3f8fd2' },
    idgham_shafawi: { scene: () => SCENES.merge('م', 'م', true), color: '#4aa84a' },
    izhar_shafawi: { scene: () => SCENES.clear('م', 'ت'), color: '#f2a51c' },
    izhar: { scene: () => SCENES.clear('ن', 'ع'), color: '#f2a51c' },
    idgham_bighunnah: { scene: () => SCENES.merge('ن', 'ي', true), color: '#4aa84a' },
    idgham_bila_ghunnah: { scene: () => SCENES.merge('ن', 'ر', false), color: '#4aa84a' },
    iqlab: { scene: () => SCENES.flip('ن', 'م', 'ب'), color: '#7b5cc4' },
    ikhfa: { scene: () => SCENES.hide('ن', 'س'), color: '#3f8fd2' },
    izhar_qamari: { scene: () => SCENES.moon('ك'), color: '#17796c' },
    idgham_shamsi: { scene: () => SCENES.sun('ش'), color: '#a8571e' },
    izhar_lam_fil: { scene: () => SCENES.clear('ل', 'ت'), color: '#17796c' },
    mithlain: { scene: () => SCENES.twins('ب', 'ب'), color: '#5d4691' },
    mutaqaribain: { scene: () => SCENES.neighbors('ل', 'ر'), color: '#5d4691' },
    mutajanisain: { scene: () => SCENES.sameHouse('د', 'ت'), color: '#5d4691' },
    madd_tabii: { scene: () => SCENES.beats([['ا', '#2f7d32'], ['و', '#2f7d32'], ['ي', '#2f7d32']], [2]), color: '#2f7d32' },
    madd_wajib_muttasil: { scene: () => SCENES.beats([['ا', '#2f7d32'], ['ء', '#c0392b']], [4, 5], { together: true }), color: '#2f7d32' },
    madd_jaiz_munfasil: { scene: () => SCENES.beats([['ا', '#2f7d32'], ['ء', '#c0392b']], [2, 4, 5], { apart: true }), color: '#2f7d32' },
    madd_arid_sukun: { scene: () => SCENES.beats([['ي', '#2f7d32'], ['ن', '#3f8fd2']], [2, 4, 6], { stop: true }), color: '#2f7d32' },
    madd_leen: { scene: () => SCENES.beats([['بَ', '#3f8fd2'], ['يْ', '#2f7d32']], [2, 4, 6], { stop: true }), color: '#2f7d32' },
    madd_badal: { scene: () => SCENES.beats([['ء', '#c0392b'], ['ا', '#2f7d32']], [2]), color: '#2f7d32' },
    madd_lazim: { scene: () => SCENES.beats([['ا', '#2f7d32'], ['لّ', '#a23b72']], [6]), color: '#a23b72' },
    lazim_kalami_muthaqqal: { scene: () => SCENES.beats([['ا', '#2f7d32'], ['مّ', '#a23b72']], [6], { together: true }), color: '#a23b72' },
    lazim_kalami_mukhaffaf: { scene: () => SCENES.beats([['ا', '#2f7d32'], ['نْ', '#a23b72']], [6], { together: true }), color: '#a23b72' },
    lazim_harfi_muthaqqal: { scene: () => SCENES.beats([['لا', '#a23b72'], ['مّ', '#a23b72']], [6]), color: '#a23b72' },
    lazim_harfi_mukhaffaf: { scene: () => SCENES.beats([['نٓ', '#a23b72']], [6]), color: '#a23b72' }
};

export const ILLUSTRATED_RULE_IDS = Object.keys(RULE_SCENES);

export function buildIllustrationSVG(ruleId, words = [], label = '') {
    const def = RULE_SCENES[ruleId];
    if (!def) return '';
    return `<svg class="tjw-illus-svg" viewBox="0 0 360 196" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">
        <rect x="1.5" y="1.5" width="357" height="193" rx="20" fill="${PAPER}" stroke="${def.color}" stroke-width="3"/>
        ${def.scene()}${wordCards(words, def.color)}</svg>`;
}

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
    if (!RULE_SCENES[rule.id]) return '';
    const words = [];
    for (const ex of [rule.example, rule.practiceExample]) {
        const w = await phraseOf(ex);
        if (w && !words.includes(w)) words.push(w);
    }
    const caption = t('tjw_ill_' + rule.id);
    return `<section class="tjw-illus"><h3 class="tjw-section-title">${t('tjw_illus_title')}</h3>
        <figure>${buildIllustrationSVG(rule.id, words.slice(0, 2), caption)}<figcaption>${caption}</figcaption></figure></section>`;
}
