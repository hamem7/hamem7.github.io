// js/viz.js — رسوم توضيحية أصلية (SVG مضمن، بلا صور خارجية ولا مكتبات) لكل حكم.
// الفكرة التعليمية: كل رسم يبين «ماذا يحدث للصوت» لا زينة: وضوح، ذوبان، غنة، ارتداد، مد.
// الألوان من متغيرات CSS (--c لون المرحلة، --c2 ذهبي للحرف المؤثر) فتنقلب تلقائيا مع المظهر الداكن.
// حروف الرسم رموز تعليمية (لا آيات)، وتحمل الصنف quran-text لترسم بخط المصحف نفسه.

const W = 360, H = 150;
const wrap = (inner, label) => `<svg class="viz" viewBox="0 0 ${W} ${H}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const block = (x, y, w, h, txt, cls = '', fs = 34) =>
  `<g class="vz-block ${cls}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="16"/><text class="quran-text" x="${x + w / 2}" y="${y + h / 2 + fs * 0.34}" text-anchor="middle" style="font-size:${fs}px">${txt}</text></g>`;
const waves = (cx, y, n = 3, cls = '') => Array.from({ length: n }, (_, i) => `<path class="vz-wave ${cls}" style="animation-delay:${i * 0.25}s" d="M${cx - 26 - i * 10} ${y + i * 9} q ${26 + i * 10} -${14 + i * 4} ${52 + i * 20} 0"/>`).join('');
const dots = (cx, y, n) => Array.from({ length: n }, (_, i) => `<circle class="vz-dot" style="animation-delay:${i * 0.4}s" cx="${cx - (n - 1) * 14 + i * 28}" cy="${y}" r="7"/>`).join('');
const arrow = (x1, x2, y) => `<path class="vz-arrow" d="M${x1} ${y} H${x2}" /><path class="vz-arrow" d="M${x2 + 9} ${y - 7} L${x2} ${y} L${x2 + 9} ${y + 7}"/>`;

const R = 230;           // موضع الحرف الأول (يمين) — القراءة من اليمين لليسار
const Lx = 70;           // موضع الحرف الثاني (يسار)
const BW = 64, BH = 64, BY = 38;

export const VIZ = {
  noon_izhar: () => wrap(
    `${block(R, BY, BW, BH, 'ن\u0652', 'cause')}${block(Lx, BY, BW, BH, 'ح', 'trigger')}
     <path class="vz-gap" d="M${(R + Lx + BW) / 2} 28 V122"/>${arrow(R - 14, Lx + BW + 22, 70)}
     <g class="vz-check"><circle cx="180" cy="128" r="12"/><path d="M174 128 l5 5 l9 -10"/></g>`, 'نون واضحة قبل حرف حلقي'),

  noon_idgham_ghunna: () => wrap(
    `<g class="vz-slide-r">${block(R, BY, BW, BH, 'ن\u0652', 'cause fade-out')}</g>${block(Lx + 60, BY - 6, BW + 40, BH + 12, 'ي\u0651', 'trigger big', 42)}${waves(190, 122, 3)}`, 'النون تذوب مع بقاء الغنة'),

  noon_idgham_no_ghunna: () => wrap(
    `<g class="vz-slide-r">${block(R, BY, BW, BH, 'ن\u0652', 'cause fade-out')}</g>${block(Lx + 60, BY - 6, BW + 40, BH + 12, 'ل\u0651', 'trigger big', 42)}
     <g class="vz-no"><circle cx="300" cy="118" r="15"/><path d="M290 108 L310 128"/></g>`, 'النون تذوب كامل\u064Bا بلا غنة'),

  noon_iqlab: () => wrap(
    `${block(R, BY, BW, BH, 'ن\u0652', 'cause morph-a')}${block(R, BY, BW, BH, 'م\u06E2', 'cause morph-b')}${block(Lx, BY, BW, BH, 'ب', 'trigger')}${arrow(R - 14, Lx + BW + 22, 70)}${waves(250, 128, 2)}`, 'النون تنقلب ميم\u064Bا عند الباء'),

  noon_ikhfa: () => wrap(
    `${block(R, BY, BW, BH, 'ن\u0652', 'cause ghost')}${block(Lx, BY, BW, BH, 'ت', 'trigger')}<path class="vz-hide" d="M${R - 6} 70 q -40 -34 -80 0"/>${waves(170, 126, 2)}`, 'النون مخفاة بين الإظهار والإدغام'),

  meem_ikhfa: () => wrap(
    `${block(R, BY, BW, BH, 'م\u0652', 'cause ghost')}${block(Lx, BY, BW, BH, 'ب', 'trigger')}
     <g class="vz-lips"><path d="M150 112 q30 -22 60 0 q-30 22 -60 0z"/><path d="M150 112 h60"/></g>${waves(180, 140, 2)}`, 'الميم مخفاة عند الباء بإطباق خفيف للشفتين'),

  meem_idgham: () => wrap(
    `<g class="vz-slide-r">${block(R, BY, BW, BH, 'م\u0652', 'cause fade-out')}</g>${block(Lx + 60, BY - 6, BW + 40, BH + 12, 'م\u0651', 'trigger big', 42)}${waves(190, 122, 3)}`, 'ميمان تصيران ميم\u064Bا مشددة واحدة'),

  meem_izhar: () => wrap(
    `${block(R, BY, BW, BH, 'م\u0652', 'cause')}${block(Lx, BY, BW, BH, 'ك', 'trigger')}<path class="vz-gap" d="M${(R + Lx + BW) / 2} 28 V122"/>${arrow(R - 14, Lx + BW + 22, 70)}
     <g class="vz-check"><circle cx="180" cy="128" r="12"/><path d="M174 128 l5 5 l9 -10"/></g>`, 'ميم واضحة'),

  ghunna: () => wrap(
    `${block(150, 30, 90, 80, 'ن\u0651', 'cause big', 50)}${waves(195, 128, 3)}${dots(195, 22, 2)}
     <text class="vz-cap" x="195" y="148" text-anchor="middle">٢</text>`, 'غنة من الأنف بمقدار حركتين'),

  qalqalah: () => wrap(
    `<path class="vz-ground" d="M40 118 H320"/>${block(150, 70, 70, 48, 'د\u0652', 'cause', 32)}
     <circle class="vz-ball" cx="185" cy="50" r="13"/><g class="vz-echo"><path d="M125 112 q-18 -12 0 -24"/><path d="M245 112 q18 -12 0 -24"/></g>`, 'القلقلة: ارتداد كالكرة'),

  lam_qamari: () => wrap(
    `<path class="vz-moon" d="M92 36 a30 30 0 1 0 28 46 a24 24 0 1 1 -28 -46z"/>${block(190, BY + 6, 56, 56, 'ل\u0652', 'cause', 32)}${block(120, BY + 6, 56, 56, 'ق', 'trigger', 32)}
     <g class="vz-check"><circle cx="218" cy="122" r="11"/><path d="M212 122 l4 5 l8 -9"/></g>`, 'اللام القمرية ظاهرة'),

  lam_shamsi: () => wrap(
    `<g class="vz-sun"><circle cx="90" cy="64" r="22"/>${Array.from({ length: 8 }, (_, i) => `<path d="M90 ${64 - 30} v-10" transform="rotate(${i * 45} 90 64)"/>`).join('')}</g>
     ${block(190, BY + 6, 56, 56, 'ل', 'cause ghost dashed', 32)}${block(120, BY + 6, 56, 56, 'ش\u0651', 'trigger', 32)}`, 'اللام الشمسية تختفي'),

  madd_tabii: () => madd(2, 'ا', 0),
  madd_muttasil: () => madd(5, 'ا', 1),
  madd_munfasil: () => madd(5, 'ا', 2)
};

function madd(n, letter, kind) {
  const unit = 34, total = n * unit, x0 = 180 + total / 2;          // يبدأ من اليمين
  const segs = Array.from({ length: n }, (_, i) => `<rect class="vz-seg${n === 5 && i === 4 ? ' opt' : ''}" style="animation-delay:${i * 0.18}s" x="${x0 - (i + 1) * unit + 3}" y="64" width="${unit - 6}" height="26" rx="8"/><text class="vz-cap" x="${x0 - i * unit - unit / 2}" y="108" text-anchor="middle">${'١٢٣٤٥'[i]}</text>`).join('');
  const lead = `${block(x0 + 8, 52, 44, 50, letter, 'cause', 30)}`;
  const tail = kind === 1 ? `${block(x0 - total - 54, 52, 44, 50, 'ء', 'trigger', 30)}<path class="vz-brace" d="M${x0 + 56} 46 H${x0 - total - 58}"/>`
    : kind === 2 ? `<path class="vz-brace" d="M${x0 + 56} 46 H${x0 + 4}"/>${block(x0 - total - 70, 52, 44, 50, 'ء', 'trigger', 30)}<path class="vz-brace" d="M${x0 - total - 16} 46 H${x0 - total - 74}"/>` : '';
  return wrap(`${segs}${lead}${tail}`, 'مقدار المد بالحركات');
}

// الرسم + جملة شرح تحتها (ثنائية اللغة)
export const VIZ_CAPTION = {
  noon_izhar: { ar: 'النون تبقى واضحة، ولا غن\u0651ة مطو\u0651لة', en: 'The noon stays clear; no stretched ghunna' },
  noon_idgham_ghunna: { ar: 'تذوب النون في الحرف التالي ويبقى رنين الغن\u0651ة', en: 'The noon melts into the next letter; the hum remains' },
  noon_idgham_no_ghunna: { ar: 'تذوب النون كلي\u064B\u0651ا: لا نون ولا غن\u0651ة', en: 'The noon dissolves completely: no noon, no ghunna' },
  noon_iqlab: { ar: 'النون تنقلب ميم\u064Bا مخفاة ثم تأتي الباء', en: 'The noon flips into a hidden meem, then comes the baa' },
  noon_ikhfa: { ar: 'النون نصف ظاهرة: لا واضحة ولا ذائبة، مع غن\u0651ة', en: 'The noon is half-hidden: neither clear nor melted, with ghunna' },
  meem_ikhfa: { ar: 'إطباق خفيف للشفتين مع غن\u0651ة ثم الباء', en: 'Lips lightly closed with ghunna, then the baa' },
  meem_idgham: { ar: 'ميمان تتعانقان فتصيران ميم\u064Bا مشد\u0651دة واحدة', en: 'Two meems hug and become one doubled meem' },
  meem_izhar: { ar: 'الميم واضحة صافية ثم ننتقل للحرف التالي', en: 'A crisp, clear meem, then on to the next letter' },
  ghunna: { ar: 'رنين في الأنف بمقدار حركتين (١ ٢)', en: 'A hum in the nose for two counts (1 2)' },
  qalqalah: { ar: 'ي\u064Fحبس الحرف لحظة ثم ينبعث بنبرة كارتداد الكرة', en: 'The letter is held for a moment, then bounces out like a ball' },
  lam_qamari: { ar: 'مثل القمر: اللام ظاهرة ت\u064Fسم\u064Eع', en: 'Like the moon: the lam is visible and heard' },
  lam_shamsi: { ar: 'مثل الشمس: اللام تختفي والحرف بعدها مشد\u0651د', en: 'Like the sun: the lam hides and the next letter is doubled' },
  madd_tabii: { ar: 'مد\u0651 بمقدار حركتين', en: 'Stretch for two counts' },
  madd_muttasil: { ar: 'المد\u0651 والهمزة في كلمة واحدة: ٤ أو ٥ حركات', en: 'Madd and hamza in one word: 4 or 5 counts' },
  madd_munfasil: { ar: 'المد\u0651 في كلمة والهمزة في التي بعدها: ٤ أو ٥ حركات', en: 'Madd in one word, hamza in the next: 4 or 5 counts' }
};

// أيقونات المراحل
export const STAGE_ICONS = {
  book: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 12 C18 8 10 8 6 10 V38 C10 36 18 36 24 40 C30 36 38 36 42 38 V10 C38 8 30 8 24 12Z" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/><path d="M24 12 V40" stroke="currentColor" stroke-width="3"/><circle cx="33" cy="20" r="3.5" fill="currentColor"/></svg>',
  wave: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 26 q6 -14 12 0 t12 0 t12 0" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/><path d="M10 36 q5 -8 10 0 t10 0 t8 0" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" opacity=".55"/></svg>',
  lips: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 26 q9 -12 18 -4 q9 -8 18 4 q-9 14 -18 14 q-9 0 -18 -14z" fill="currentColor"/><path d="M8 26 h32" stroke="var(--surface)" stroke-width="2.5" fill="none"/></svg>',
  noon: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 28 q14 14 28 0" fill="none" stroke="currentColor" stroke-width="4.5" stroke-linecap="round"/><circle cx="24" cy="14" r="4.5" fill="currentColor"/></svg>',
  sun: '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="9" fill="currentColor"/>' + Array.from({ length: 8 }, (_, i) => `<path d="M24 6 v6" stroke="currentColor" stroke-width="3" stroke-linecap="round" transform="rotate(${i * 45} 24 24)"/>`).join('') + '</svg>',
  madd: '<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="19" width="38" height="10" rx="5" fill="currentColor"/><path d="M36 10 l8 14 -8 14" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
};

export const vizFor = (ruleId) => (VIZ[ruleId] ? VIZ[ruleId]() : '');
