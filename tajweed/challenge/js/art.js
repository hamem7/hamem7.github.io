// js/art.js — رسوم توضيحية للأطفال (SVG أصلية مرسومة بالكود) لدروس «الحكاية المصوّرة».
// كل رسم يحمل فكرة واحدة يفهمها الطفل بنظرة: السورة قطار والآيات عرباته، الجزء كعكة بثمانية أرباع، علامات الوقف إشارات مرور،
// النون تلبس قبعة الساحر في الإقلاب، الشمس تُخفي اللام… الألوان من متغيرات الركن (--c لون المرحلة، --gold، --ink، --surface…)
// فتنقلب تلقائيًا مع المظهر الداكن. الحروف المفردة بحركاتها رموز تعليمية (لا آيات) وتحمل الصنف quran-text فتُرسم بخط المصحف نفسه.
// التسميات داخل الرسم ثنائية اللغة عبر L(ar, en).
import { tx, num, getLang } from './i18n.js';

const L = (ar, en) => tx({ ar, en });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const svg = (w, h, inner, label) => `<svg class="art" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
// حرف (رمز تعليمي) داخل بلاطة
const tile = (x, y, w, h, ch, cls = '', fs = 40) => `<g class="a-tile ${cls}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(18, h / 3)}"/><text class="quran-text" x="${x + w / 2}" y="${y + h / 2 + fs * 0.3}" text-anchor="middle" font-size="${fs}">${esc(ch)}</text></g>`;
const glyph = (x, y, ch, fs = 40, cls = '') => `<text class="quran-text a-gl ${cls}" x="${x}" y="${y}" text-anchor="middle" font-size="${fs}">${esc(ch)}</text>`;
const cap = (x, y, s, cls = '', fs = 15) => `<text class="a-cap ${cls}" x="${x}" y="${y}" text-anchor="middle" font-size="${fs}">${esc(s)}</text>`;
const face = (cx, cy, r = 14, mood = 'smile') => `<g class="a-face"><circle cx="${cx - r * 0.38}" cy="${cy - r * 0.15}" r="${r * 0.13}"/><circle cx="${cx + r * 0.38}" cy="${cy - r * 0.15}" r="${r * 0.13}"/>${mood === 'smile' ? `<path d="M${cx - r * 0.4} ${cy + r * 0.22} q${r * 0.4} ${r * 0.38} ${r * 0.8} 0" />` : mood === 'sleep' ? `<path d="M${cx - r * 0.55} ${cy - r * 0.15} h${r * 0.3} M${cx + r * 0.25} ${cy - r * 0.15} h${r * 0.3}"/><path d="M${cx - r * 0.2} ${cy + r * 0.3} h${r * 0.4}"/>` : `<circle cx="${cx}" cy="${cy + r * 0.35}" r="${r * 0.2}"/>`}</g>`;
const arrow = (x1, y1, x2, y2, cls = '') => { const a = Math.atan2(y2 - y1, x2 - x1), s = 9; return `<g class="a-arrow ${cls}"><path d="M${x1} ${y1} L${x2} ${y2}"/><path d="M${x2 - s * Math.cos(a - 0.5)} ${y2 - s * Math.sin(a - 0.5)} L${x2} ${y2} L${x2 - s * Math.cos(a + 0.5)} ${y2 - s * Math.sin(a + 0.5)}"/></g>`; };
const waves = (cx, cy, n = 3, cls = '') => Array.from({ length: n }, (_, i) => `<path class="a-wave ${cls}" style="animation-delay:${i * 0.25}s" d="M${cx - 14 - i * 9} ${cy - 10 - i * 6} q${14 + i * 9} -${12 + i * 5} ${28 + i * 18} 0"/>`).join('');
const speaker = (x, y, on = true) => `<g class="a-spk ${on ? 'on' : 'off'}" transform="translate(${x} ${y})"><path d="M0 -7 h7 l9 -8 v30 l-9 -8 h-7z"/>${on ? '<path class="w" d="M21 -6 q6 7 0 14 M26 -11 q11 12 0 24"/>' : '<path class="x" d="M21 -7 l12 14 M33 -7 l-12 14"/>'}</g>`;
const rosette = (cx, cy, n, r = 15) => `<g class="a-ros"><circle cx="${cx}" cy="${cy}" r="${r}"/><circle class="in" cx="${cx}" cy="${cy}" r="${r - 4}"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="${r * 0.85}">${num(n)}</text></g>`;
const lines = (x, y, w, n, gap = 12) => Array.from({ length: n }, (_, i) => `<path class="a-line" d="M${x} ${y + i * gap} H${x + w - (i === n - 1 ? w * 0.35 : 0)}"/>`).join('');
const counts = (x, y, n, cls = '') => Array.from({ length: n }, (_, i) => `<g class="a-count ${cls}"><circle cx="${x + i * 26}" cy="${y}" r="10"/><text x="${x + i * 26}" y="${y + 4.5}" text-anchor="middle" font-size="12">${num(i + 1)}</text></g>`).join('');
const sun = (cx, cy, r = 20) => `<g class="a-sun"><circle cx="${cx}" cy="${cy}" r="${r}"/>${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<path d="M${cx + Math.cos(a) * (r + 5)} ${cy + Math.sin(a) * (r + 5)} L${cx + Math.cos(a) * (r + 13)} ${cy + Math.sin(a) * (r + 13)}"/>`; }).join('')}</g>`;
const moon = (cx, cy, r = 20) => `<path class="a-moon" d="M${cx + r * 0.3} ${cy - r} a${r} ${r} 0 1 0 0 ${2 * r} a${r * 0.78} ${r * 0.78} 0 1 1 0 ${-2 * r}z"/>`;
const curtain = (x, y, w, h) => `<g class="a-curtain"><path d="M${x} ${y} h${w} v${h} q-${w / 4} -14 -${w / 2} 0 q-${w / 4} 14 -${w / 2} 0z"/><path class="fold" d="M${x + w * 0.33} ${y + 4} v${h - 10} M${x + w * 0.66} ${y + 4} v${h - 10}"/></g>`;

const ART = {
  // ───────────── تعرّف على مصحفك ─────────────
  ayah_train: () => {
    const cars = [0, 1, 2].map((i) => { const x = 250 - i * 118; return `<g class="a-car"><rect x="${x}" y="70" width="92" height="56" rx="10"/>${lines(x + 12, 86, 68, 3, 11)}<circle class="wh" cx="${x + 20}" cy="132" r="8"/><circle class="wh" cx="${x + 72}" cy="132" r="8"/></g>${rosette(x - 13, 98, i + 1, 14)}`; }).join('');
    return svg(420, 190, `<path class="a-ground" d="M10 141 H410"/><g class="a-engine"><rect x="350" y="58" width="58" height="68" rx="12"/><rect class="win" x="362" y="68" width="34" height="22" rx="5"/><circle class="wh" cx="366" cy="132" r="9"/><circle class="wh" cx="394" cy="132" r="9"/></g>${cars}
      ${cap(379, 48, L('السورة', 'Surah'), 'b')}${cap(296, 170, L('آية', 'Ayah'))}${cap(178, 170, L('آية', 'Ayah'))}${cap(60, 170, L('آية', 'Ayah'))}${cap(210, 26, L('الرقم يأتي في آخر كل عربة (آية)', 'The number comes at the end of each car (ayah)'), 'b gold')}`, L('السورة قطار، والآيات عرباته، ورقم كل آية في آخرها', 'A surah is a train, its ayahs are the cars, and each ayah’s number comes at its end'));
  },
  surah_start: () => svg(420, 230, `
      <g class="a-banner"><rect x="70" y="16" width="280" height="44" rx="10"/><rect class="in" x="130" y="24" width="160" height="28" rx="14"/><circle class="orn" cx="98" cy="38" r="10"/><circle class="orn" cx="322" cy="38" r="10"/></g>${cap(210, 43, L('اسم السورة', 'Surah name'), 'b')}
      <path class="a-line thick" d="M110 98 H310"/>${cap(210, 88, L('البسملة', 'Basmala'), 'soft')}
      ${lines(96, 140, 210, 2, 16)}${rosette(80, 156, 1, 15)}
      <g class="a-step"><circle cx="388" cy="38" r="13"/><text x="388" y="43" text-anchor="middle">${num(1)}</text></g><g class="a-step"><circle cx="388" cy="96" r="13"/><text x="388" y="101" text-anchor="middle">${num(2)}</text></g><g class="a-step"><circle cx="388" cy="148" r="13"/><text x="388" y="153" text-anchor="middle">${num(3)}</text></g>
      ${cap(210, 202, L('لوحة الاسم ← البسملة ← أول آية', 'Name panel → Basmala → first ayah'), 'b gold')}${cap(210, 222, L('(سورة التوبة وحدها تبدأ بلا بسملة)', '(only Surah At-Tawbah starts without a basmala)'), 'soft', 13)}`,
    L('بداية كل سورة: لوحة الاسم ثم البسملة ثم أول آية', 'Every surah starts with its name panel, then the basmala, then the first ayah')),
  page_map: () => svg(420, 300, `
      <rect class="a-page" x="120" y="14" width="190" height="270" rx="8"/>
      <rect class="a-hl" x="128" y="22" width="70" height="18" rx="5"/><rect class="a-hl" x="232" y="22" width="70" height="18" rx="5"/>
      ${lines(136, 62, 160, 12, 16)}<text class="quran-text a-gl rub" x="288" y="130" text-anchor="middle" font-size="16">۞</text>
      <g class="a-lant"><path d="M322 108 q12 -18 24 0 v34 q-12 18 -24 0z"/></g>
      <circle class="a-hl" cx="215" cy="266" r="10"/>
      ${arrow(98, 31, 126, 31)}${cap(56, 36, L('اسم الجزء', 'Juz name'), 'b', 13)}
      ${arrow(360, 31, 306, 31)}${cap(380, 22, L('اسم', 'Surah'), 'b', 13)}${cap(380, 38, L('السورة', 'name'), 'b', 13)}
      ${arrow(374, 125, 350, 125)}${cap(388, 110, L('فانوس', 'Margin'), 'b', 13)}${cap(388, 126, L('الهامش', 'lantern'), 'b', 13)}
      ${arrow(80, 128, 280, 128, 'soft')}${cap(56, 120, L('علامة', 'Quarter'), 'b', 13)}${cap(56, 136, L('الربع ۞', 'mark ۞'), 'b', 13)}
      ${arrow(100, 266, 200, 266)}${cap(56, 270, L('رقم الصفحة', 'Page number'), 'b', 13)}`,
    L('خريطة صفحة المصحف', 'Map of a mushaf page')),
  cake: () => {
    const cx = 130, cy = 120, r = 92;
    const slice = (i) => { const a0 = -Math.PI / 2 + (i * Math.PI) / 4, a1 = a0 + Math.PI / 4; return `<path class="a-slice ${i < 4 ? 'h1' : 'h2'}" d="M${cx} ${cy} L${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}Z"/><text class="a-sn" x="${cx + r * 0.66 * Math.cos(a0 + Math.PI / 8)}" y="${cy + r * 0.66 * Math.sin(a0 + Math.PI / 8) + 5}" text-anchor="middle" font-size="14">${num(i + 1)}</text>`; };
    return svg(420, 240, `${Array.from({ length: 8 }, (_, i) => slice(i)).join('')}<circle class="a-cherry" cx="${cx}" cy="${cy}" r="9"/>
      <g class="a-leg"><rect class="h1" x="252" y="50" width="22" height="22" rx="6"/>${cap(330, 66, L('الحزب الأول', '1st hizb'), 'b')}<rect class="h2" x="252" y="86" width="22" height="22" rx="6"/>${cap(330, 102, L('الحزب الثاني', '2nd hizb'), 'b')}</g>
      ${cap(320, 146, L('الكعكة كلها = جزء', 'Whole cake = 1 juz'), 'b gold')}${cap(320, 170, L('كل نصف = حزب', 'Each half = 1 hizb'))}${cap(320, 194, L('كل قطعة = ربع (٨ قطع)', 'Each slice = a quarter (8)'))}`,
      L('الجزء كعكة: نصفان (حزبان) وثمانية أرباع', 'A juz is a cake: two halves (hizbs) and eight quarters'));
  },
  facts: () => {
    const box = (x, n, a, e, cls) => `<g class="a-fact ${cls}"><rect x="${x}" y="30" width="118" height="120" rx="20"/><text x="${x + 59}" y="92" text-anchor="middle" font-size="42">${num(n)}</text>${cap(x + 59, 126, L(a, e), 'b')}</g>`;
    return svg(420, 180, `${box(286, 30, 'جزءًا', 'juz')}${box(151, 60, 'حزبًا', 'hizb')}${box(16, 240, 'ربعًا', 'quarters')}${cap(210, 172, L('القرآن كله', 'The whole Qur’an'), 'soft')}`, L('٣٠ جزءًا، ٦٠ حزبًا، ٢٤٠ ربعًا', '30 juz, 60 hizb, 240 quarters'));
  },
  mouths: () => {
    const m = (x, kind, ch, a, e) => `<g class="a-mouth"><circle class="hd" cx="${x}" cy="82" r="50"/><g class="a-face"><circle cx="${x - 17}" cy="64" r="5"/><circle cx="${x + 17}" cy="64" r="5"/></g>
      ${kind === 'open' ? `<ellipse class="mo" cx="${x}" cy="104" rx="15" ry="18"/>` : kind === 'round' ? `<circle class="mo" cx="${x}" cy="102" r="9"/><circle class="lip" cx="${x}" cy="102" r="13"/>` : `<path class="mo" d="M${x - 22} 100 q22 18 44 0 q-22 6 -44 0z"/>`}
      ${glyph(x, 186, ch, 46)}${cap(x, 214, L(a, e), 'b')}</g>`;
    return svg(420, 228, `${m(340, 'open', 'بَ', 'فتحة: افتح فمك', 'Fatha: open your mouth')}${m(210, 'round', 'بُ', 'ضمّة: ضُمّ شفتيك', 'Damma: round your lips')}${m(80, 'flat', 'بِ', 'كسرة: انزل بفكّك', 'Kasra: lower your jaw')}`, L('شكل الفم مع الحركات الثلاث', 'Mouth shapes for the three vowels'));
  },
  harakat_pos: () => svg(420, 200, `${tile(150, 50, 120, 110, 'ب', 'big', 74)}
      ${arrow(330, 46, 238, 62)}${cap(366, 50, L('فتحة · ضمّة', 'Fatha · damma'), 'b', 14)}${cap(366, 68, L('فوق الحرف', 'above'), 'soft', 13)}
      ${arrow(330, 170, 238, 150)}${cap(366, 166, L('كسرة', 'Kasra'), 'b', 14)}${cap(366, 184, L('تحت الحرف', 'below'), 'soft', 13)}
      `, L('الفتحة والضمة فوق الحرف، والكسرة تحته', 'Fatha and damma go above the letter, kasra below')),
  tanween_eq: () => {
    const row = (y, a, b) => `${tile(300, y, 74, 54, a, 'cause', 34)}<text class="a-op" x="276" y="${y + 36}" text-anchor="middle">=</text>${tile(178, y, 74, 54, b, '', 34)}<text class="a-op" x="154" y="${y + 36}" text-anchor="middle">+</text>${tile(56, y, 74, 54, 'نْ', 'ghost', 34)}`;
    return svg(420, 230, `${row(14, 'بً', 'بَ')}${row(80, 'بٌ', 'بُ')}${row(146, 'بٍ', 'بِ')}${cap(93, 222, L('نون تُقرأ ولا تُكتب', 'A noon heard, not written'), 'gold b', 13)}${cap(337, 222, L('تنوين', 'Tanween'), 'b', 13)}`, L('التنوين = حركة + نون ساكنة لا تُكتب', 'Tanween = a vowel + an unwritten silent noon'));
  },
  hamza_wasla: () => svg(420, 230, `
      <g class="a-panel"><rect x="10" y="10" width="190" height="210" rx="20"/></g><g class="a-panel"><rect x="220" y="10" width="190" height="210" rx="20"/></g>
      ${tile(270, 34, 90, 80, 'أ', 'cause', 56)}${speaker(296, 150, true)}${cap(315, 198, L('همزة القطع: تُقرأ دائمًا', 'Hamza: always heard'), 'b', 13)}
      ${tile(60, 34, 90, 80, 'ٱ', 'trigger', 56)}${cap(105, 136, L('في البداية 🔊', 'At the start 🔊'), '', 13)}${cap(105, 160, L('في الوصل 🔇', 'When joining 🔇'), '', 13)}${cap(105, 198, L('ألف الوصل: تسقط في الوصل', 'Alif wasla: drops when joining'), 'b', 13)}`,
    L('الهمزة تُقرأ دائمًا، وألف الوصل تسقط إذا وصلنا', 'The hamza is always read; the alif wasla drops when we join')),
  traffic: () => {
    const sign = (x, sym, cls, a, e) => `<g class="a-sig ${cls}"><path class="pole" d="M${x} 112 V160"/><circle cx="${x}" cy="82" r="30"/><text class="quran-text" x="${x}" y="${sym.length > 2 ? 90 : 94}" text-anchor="middle" font-size="${sym.length > 2 ? 20 : 30}">${esc(sym)}</text>${cap(x, 182, L(a[0], e[0]), 'b', 12.5)}${cap(x, 198, L(a[1], e[1]), 'soft', 12)}</g>`;
    return svg(420, 210, `<path class="a-ground" d="M6 160 H414"/>
      ${sign(380, 'م', 'red', ['م', 'قف لازمًا'], ['م', 'must stop'])}${sign(312, 'قلى', 'orange', ['قلى', 'الوقف أحسن'], ['qala', 'stop is better'])}${sign(244, 'ج', 'yellow', ['ج', 'كما تحب'], ['jim', 'either'])}
      ${sign(176, 'صلى', 'green', ['صلى', 'الوصل أحسن'], ['sala', 'go is better'])}${sign(108, '∴', 'blue', ['∴', 'قف عند واحدة'], ['∴', 'stop at one'])}${sign(40, 'س', 'purple', ['س', 'سكتة بلا نفَس'], ['sin', 'pause, no breath'])}
      ${cap(210, 30, L('علامات الوقف إشارات مرور فوق السطر', 'Stop signs are traffic lights above the line'), 'b gold')}`, L('علامات الوقف مثل إشارات المرور', 'Stopping signs are like traffic lights'));
  },
  saktah: () => svg(420, 170, `${tile(300, 50, 100, 60, L('كلمة', 'word'), 'plain', 22)}${tile(20, 50, 100, 60, L('كلمة', 'word'), 'plain', 22)}
      <rect class="a-pause" x="150" y="64" width="120" height="32" rx="16"/>${counts(184, 80, 2, 'in')}<text class="quran-text a-gl gold" x="210" y="44" text-anchor="middle" font-size="30">س</text>
      <g class="a-nobreath" transform="translate(210 132)"><path d="M-26 0 q8 -10 16 0 t16 0 t16 0"/><path class="x" d="M-12 -12 l24 24 M12 -12 l-24 24"/></g>${cap(210, 164, L('وقفة قصيرة بقدر حركتين بلا نفَس، ثم أكمل', 'A short two-count pause, no breath, then go on'), 'b', 13)}`,
    L('السكتة: توقّف قصير بلا نفَس', 'Saktah: a short pause with no breath')),
  sukun_sleep: () => svg(420, 200, `
      ${tile(260, 40, 120, 110, 'مۡ', 'cause', 64)}${face(320, 165, 16, 'sleep')}<text class="a-z" x="372" y="36">z</text><text class="a-z" x="388" y="22" font-size="14">z</text>
      ${cap(320, 196, L('سكون: الحرف نائم بلا حركة', 'Sukun: the letter sleeps, no vowel'), 'b', 13)}
      ${tile(40, 40, 120, 110, 'ا۟', 'ghost', 64)}${cap(100, 172, L('دائرة صغيرة = حرف لا يُقرأ', 'Small circle = letter not read'), 'b', 13)}${cap(100, 192, L('(ليست سكونًا!)', '(not a sukun!)'), 'bad', 13)}`,
    L('السكون رأس خاء صغيرة، والدائرة الصغيرة حرف زائد', 'The sukun is a small khā’ head; the small circle marks an extra letter')),
  shadda_eq: () => svg(420, 150, `${tile(300, 30, 90, 76, 'بّ', 'cause', 52)}<text class="a-op" x="270" y="78" text-anchor="middle">=</text>${tile(160, 30, 90, 76, 'بۡ', '', 52)}<text class="a-op" x="132" y="78" text-anchor="middle">+</text>${tile(20, 30, 90, 76, 'بَ', '', 52)}
      ${cap(345, 132, L('شدّة', 'Shadda'), 'b')}${cap(205, 132, L('ساكن', 'Still'), '')}${cap(65, 132, L('متحرّك', 'Moving'), '')}`, L('الشدة = حرف ساكن + حرف متحرك', 'Shadda = a still letter + a moving letter')),
  ghost_letters: () => svg(420, 210, `
      <g class="a-panel"><rect x="10" y="10" width="400" height="190" rx="18"/></g><path class="a-sep" d="M10 105 H410 M150 18 V192 M280 18 V192"/>
      ${cap(215, 40, L('عند الوصل', 'Joining'), 'b')}${cap(345, 40, L('عند الوقف', 'Stopping'), 'b')}
      ${tile(28, 56, 100, 42, L('٠ دائري', 'round 0'), 'plain', 18)}${speaker(200, 80, false)}${speaker(330, 80, false)}
      ${tile(28, 132, 100, 42, L('٠ مستطيل', 'oblong 0'), 'plain', 18)}${speaker(200, 156, false)}${speaker(330, 156, true)}`,
    L('الصفر الدائري لا يُقرأ أبدًا، والمستطيل يُقرأ عند الوقف فقط', 'The round zero is never read; the oblong zero is read only when stopping')),
  small_helpers: () => svg(420, 200, `${tile(290, 30, 110, 100, 'ـٰـ', 'cause', 58)}${cap(345, 156, L('ألف صغيرة', 'Small alif'), 'b')}${cap(345, 176, L('تُقرأ مدًّا', 'read long'), 'soft', 13)}
      ${tile(155, 30, 110, 100, 'هُۥ', 'cause', 54)}${cap(210, 156, L('واو صغيرة', 'Small waw'), 'b')}${cap(210, 176, L('تُقرأ في الوصل', 'read when joining'), 'soft', 13)}
      ${tile(20, 30, 110, 100, 'هِۦ', 'cause', 54)}${cap(75, 156, L('ياء صغيرة', 'Small yaa'), 'b')}${cap(75, 176, L('تُقرأ في الوصل', 'read when joining'), 'soft', 13)}`,
    L('حروف صغيرة تُقرأ ولا تُكتب كاملة', 'Small letters that are read but not written in full')),
  stretch: () => svg(420, 190, `<g class="a-band"><path class="short" d="M300 60 H380"/><path class="long" d="M30 130 H300"/></g>
      <circle class="a-hand" cx="296" cy="60" r="10"/><circle class="a-hand" cx="384" cy="60" r="10"/><circle class="a-hand" cx="26" cy="130" r="10"/><circle class="a-hand" cx="304" cy="130" r="10"/>
      ${counts(318, 90, 2)}${counts(70, 160, 5, 'gold')}${cap(150, 46, L('مدّ طبيعي: حركتان', 'Natural madd: 2 counts'), 'b')}${glyph(380, 140, 'ـۤـ', 46, 'gold')}${cap(380, 176, L('مدّ أطول', 'longer'), 'b', 13)}`,
    L('المدّة ۤ تعني مدًّا أطول من الطبيعي', 'The madd sign means stretching longer than the natural madd')),
  gems: () => {
    const gem = (x, cls, a, e, a2, e2) => `<g class="a-gem ${cls}"><path d="M${x - 46} 70 L${x - 24} 40 H${x + 24} L${x + 46} 70 L${x} 130Z"/><path class="f" d="M${x - 46} 70 H${x + 46} M${x - 24} 40 L${x - 10} 70 L${x} 130 L${x + 10} 70 L${x + 24} 40"/>${cap(x, 162, L(a, e), 'b')}${cap(x, 182, L(a2, e2), 'soft', 13)}</g>`;
    return svg(420, 200, `${gem(300, 'g1', 'الإشمام', 'Ishmam', 'سورة يوسف', 'Surah Yusuf')}${gem(120, 'g2', 'الإمالة', 'Imala', 'سورة هود', 'Surah Hud')}${cap(210, 24, L('كنزان: كل واحد في موضع واحد فقط', 'Two treasures: each appears in one place only'), 'b gold')}`, L('علامتان نادرتان', 'Two rare marks'));
  },
  costume: () => svg(420, 200, `${tile(270, 54, 110, 100, 'ص', '', 64)}<g class="a-hat"><path d="M300 54 L325 14 L350 54Z"/></g><text class="quran-text a-gl onhat" x="325" y="47" text-anchor="middle" font-size="20">س</text>
      ${arrow(250, 104, 170, 104)}${tile(40, 54, 110, 100, 'س', 'cause', 64)}${cap(325, 182, L('صاد عليها سين صغيرة', 'A saad with a small seen'), 'b', 13)}${cap(95, 182, L('نقرؤها سينًا', 'we read it as seen'), 'b', 13)}`,
    L('الصاد تلبس قبعة السين فتُقرأ سينًا', 'The saad wears a seen hat, so it is read as seen')),
  sajda_map: () => svg(420, 260, `<rect class="a-page" x="120" y="14" width="190" height="232" rx="8"/>${lines(136, 44, 160, 11, 18)}
      <rect class="a-hl" x="196" y="120" width="70" height="8" rx="4"/><g class="a-dome"><path d="M160 134 q10 -18 20 0z"/><rect x="160" y="134" width="20" height="8"/></g>
      <g class="a-lant"><rect x="322" y="108" width="34" height="48" rx="8"/></g>
      ${arrow(372, 132, 360, 132)}${cap(390, 128, L('سجدة', 'Sajdah'), 'b', 13)}${cap(390, 144, L('في الهامش', 'in margin'), 'soft', 12)}
      ${arrow(70, 138, 156, 138)}${cap(46, 130, L('۩ قبّة', '۩ dome'), 'b', 13)}${cap(46, 146, L('في السطر', 'in the line'), 'soft', 12)}
      ${arrow(230, 92, 230, 116)}${cap(230, 84, L('خط فوق كلمة السجود', 'A line over the sajdah word'), 'b', 13)}`,
    L('ثلاث علامات تدلّك على السجدة', 'Three signs show you the sajdah')),

  // ───────────── أحكام التجويد ─────────────
  bee_nose: () => svg(420, 210, `<path class="a-nose" d="M250 30 q-20 50 -40 80 q20 10 40 0"/><circle class="a-nostril" cx="232" cy="104" r="5"/>${waves(170, 92, 3)}
      <g class="a-bee" transform="translate(110 70)"><ellipse class="b" cx="0" cy="0" rx="20" ry="14"/><path class="s" d="M-6 -13 v26 M6 -13 v26"/><ellipse class="w" cx="-4" cy="-18" rx="10" ry="7"/><ellipse class="w" cx="8" cy="-17" rx="9" ry="6"/></g>
      ${tile(300, 46, 90, 76, 'نّ', 'cause', 50)}${tile(300, 128, 90, 64, 'مّ', 'cause', 44)}${counts(150, 170, 2, 'gold')}${cap(176, 200, L('غنّة من الأنف: عدّ ١ ٢', 'Hum from the nose: count 1 2'), 'b', 13)}`,
    L('النون والميم المشددتان: نحلة تطنّ في الأنف بمقدار حركتين', 'Doubled noon and meem: a bee humming in the nose for two counts')),
  ball: () => svg(400, 220, `<path class="a-ground" d="M40 186 H360"/>${tile(150, 120, 100, 66, 'بۡ', 'cause', 44)}
      <g class="a-echo"><path d="M128 176 q-20 -16 0 -32"/><path d="M114 182 q-30 -24 0 -46"/><path d="M272 176 q20 -16 0 -32"/><path d="M286 182 q30 -24 0 -46"/></g>
      <g class="a-ballg"><circle class="a-ball" cx="200" cy="96" r="22"/>${face(200, 96, 20)}</g>`, L('الحرف الساكن من «قطب جد» يرتدّ كالكرة', 'A silent «qutb jad» letter bounces like a ball')),
  meem_curtain: () => svg(420, 190, `${tile(250, 44, 100, 90, 'مۡ', 'cause', 56)}${curtain(240, 30, 120, 118)}${tile(60, 44, 100, 90, 'ب', 'trigger', 56)}${waves(212, 60, 2)}
      <g class="a-lips" transform="translate(300 170)"><path d="M-26 0 q13 -10 26 -2 q13 -8 26 2 q-26 12 -52 0z"/></g>${cap(110, 170, L('شفتان مطبقتان برفق + غنّة', 'Lips gently closed + a hum'), 'b', 13)}`,
    L('الميم تختبئ قبل الباء مع غنّة', 'The meem hides before baa, with a hum')),
  meem_hug: () => svg(420, 170, `${tile(290, 40, 90, 80, 'مۡ', 'cause', 50)}<text class="a-op" x="262" y="90" text-anchor="middle">+</text>${tile(150, 40, 90, 80, 'م', 'trigger', 50)}${arrow(140, 80, 106, 80)}${tile(10, 40, 90, 80, 'مّ', 'cause big', 50)}
      <path class="a-heart" d="M55 30 q-10 -14 -20 -4 q-6 8 20 22 q26 -14 20 -22 q-10 -10 -20 4z"/>${cap(55, 150, L('ميم مشدّدة بغنّة', 'One doubled meem with a hum'), 'b', 13)}`,
    L('ميمان تتعانقان فتصيران ميمًا مشددة', 'Two meems hug and become one doubled meem')),
  meem_clear: () => svg(420, 190, `${tile(290, 46, 100, 90, 'مۡ', 'cause', 56)}${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<path class="a-ray" d="M${340 + Math.cos(a) * 62} ${91 + Math.sin(a) * 58} L${340 + Math.cos(a) * 74} ${91 + Math.sin(a) * 70}"/>`; }).join('')}
      ${['ت', 'ف', 'ع', 'ك'].map((c, i) => tile(170 - i * 0 - (i % 2) * 70, 30 + Math.floor(i / 2) * 64, 56, 52, c, 'trigger', 30)).join('')}
      ${tile(20, 30, 56, 52, 'ب', 'no', 30)}${tile(20, 94, 56, 52, 'م', 'no', 30)}${cap(48, 166, L('إلا الباء والميم', 'except baa & meem'), 'bad', 12.5)}${cap(170, 176, L('ميم واضحة مع باقي الحروف', 'A clear meem before the other letters'), 'b', 13)}`,
    L('الإظهار الشفوي: الميم واضحة قبل كل الحروف إلا الباء والميم', 'Clear meem before every letter except baa and meem')),
  noon_lamp: () => {
    const T6 = ['ء', 'ه', 'ع', 'ح', 'غ', 'خ'];
    return svg(420, 210, `${tile(300, 70, 96, 86, 'نۡ', 'cause', 54)}${Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return `<path class="a-ray" d="M${348 + Math.cos(a) * 60} ${113 + Math.sin(a) * 56} L${348 + Math.cos(a) * 72} ${113 + Math.sin(a) * 68}"/>`; }).join('')}
      <path class="a-throat" d="M40 186 q100 -190 220 0"/>${T6.map((c, i) => { const a = Math.PI + (i + 0.5) * (Math.PI / 6); return tile(150 + Math.cos(a) * 100 - 22, 150 + Math.sin(a) * 110 - 20, 44, 40, c, 'trigger', 24); }).join('')}
      ${cap(150, 200, L('حروف الحلق الستة: بعيدة عن النون', 'The six throat letters: far from the noon'), 'b', 13)}`, L('الإظهار: النون واضحة قبل حروف الحلق', 'Izhar: the noon is clear before the throat letters'));
  },
  noon_melt: () => svg(420, 200, `<path class="a-drop" d="M340 40 q-30 40 -30 62 a30 30 0 0 0 60 0 q0 -22 -30 -62z"/>${glyph(340, 116, 'نۡ', 34)}${arrow(296, 100, 250, 100)}
      ${['ي', 'ن', 'م', 'و'].map((c, i) => tile(170 - (i % 2) * 70, 40 + Math.floor(i / 2) * 64, 58, 54, c, 'trigger', 32)).join('')}${waves(130, 30, 2)}${cap(140, 190, L('تذوب النون في «ينمو» وتبقى الغنّة', 'The noon melts into “yanmū” and the hum stays'), 'b', 13)}`,
    L('الإدغام بغنة: تذوب النون وتبقى الغنة', 'Idgham with ghunna: the noon melts, the hum stays')),
  noon_vanish: () => svg(420, 180, `${tile(300, 46, 96, 86, 'نۡ', 'ghost', 54)}${arrow(286, 90, 226, 90)}${tile(120, 30, 90, 70, 'لّ', 'trigger', 44)}${tile(120, 104, 90, 62, 'رّ', 'trigger', 40)}
      <g class="a-nobreath" transform="translate(60 90)"><path d="M-22 0 q8 -10 16 0 t16 0 t16 0"/><path class="x" d="M-10 -12 l20 24 M10 -12 l-20 24"/></g>${cap(60, 130, L('بلا غنّة', 'no hum'), 'bad', 13)}${cap(348, 160, L('النون تختفي', 'The noon vanishes'), 'b', 13)}`,
    L('الإدغام بلا غنة: تختفي النون في اللام والراء', 'Idgham without ghunna: the noon vanishes into lam and raa')),
  noon_hat: () => svg(420, 200, `${tile(300, 70, 96, 86, 'نۡ', 'cause', 54)}<g class="a-hat"><path d="M318 70 L348 22 L378 70Z"/><circle class="st" cx="348" cy="44" r="5"/></g>${arrow(286, 112, 238, 112)}
      ${tile(140, 70, 90, 86, 'م', 'cause', 54)}<text class="a-spark" x="186" y="58" text-anchor="middle">✦</text>${tile(30, 70, 90, 86, 'ب', 'trigger', 54)}
      ${cap(185, 186, L('قبل الباء تصير النون ميمًا مخفاة بغنّة', 'Before baa the noon becomes a hidden meem with a hum'), 'b', 13)}`,
    L('الإقلاب: النون تلبس قبعة الساحر فتصير ميمًا', 'Iqlab: the noon puts on a magic hat and becomes a meem')),
  noon_curtain: () => svg(420, 200, `${tile(290, 56, 100, 90, 'نۡ', 'cause', 56)}${curtain(276, 40, 128, 120)}${waves(250, 64, 2)}
      <g class="a-cloud"><path d="M30 130 q-10 -40 30 -44 q10 -34 50 -24 q20 -26 54 -6 q40 -6 40 34 q20 20 -4 40z"/></g>${['ت', 'ث', 'ج', 'د', 'ذ'].map((c, i) => glyph(58 + i * 30, 120, c, 24)).join('')}${cap(110, 160, L('١٥ حرفًا', '15 letters'), 'b', 13)}
      ${cap(330, 186, L('لا تظهر ولا تذوب: نصف مخفية', 'Neither clear nor merged: half hidden'), 'b', 13)}`,
    L('الإخفاء: النون خلف ستارة مع غنة', 'Ikhfa: the noon behind a curtain, with a hum')),
  moon: () => svg(420, 190, `${moon(350, 60, 32)}<g class="a-word"><rect x="80" y="70" width="230" height="80" rx="18"/>${glyph(265, 128, 'ا', 52)}${glyph(220, 128, 'لۡ', 52, 'cause')}${glyph(150, 128, 'ق', 52, 'trigger')}</g>
      ${arrow(220, 168, 220, 152)}${cap(220, 184, L('اللام ظاهرة بسكون', 'The lam shows with a sukun'), 'b', 13)}${cap(100, 50, L('مثل القمر: نراه', 'Like the moon: we see it'), 'b gold', 14)}`,
    L('اللام القمرية: اللام ظاهرة', 'Moon lam: the lam is clear')),
  sun: () => svg(420, 190, `${sun(350, 56, 24)}<g class="a-word"><rect x="80" y="70" width="230" height="80" rx="18"/>${glyph(265, 128, 'ا', 52)}${glyph(220, 128, 'ل', 52, 'ghost')}${glyph(150, 128, 'شّ', 52, 'trigger')}</g>
      ${cap(220, 170, L('اللام تختفي', 'The lam hides'), 'bad', 13)}${cap(150, 186, L('والحرف بعدها مشدّد', 'and the next letter is doubled'), 'b', 13)}${cap(100, 50, L('مثل الشمس: تُخفي ما حولها', 'Like the sun: it outshines what is near'), 'b gold', 14)}`,
    L('اللام الشمسية: اللام لا تُنطق والحرف بعدها مشدد', 'Sun lam: the lam is silent and the next letter is doubled')),
  madd2: () => svg(420, 200, `${tile(300, 30, 90, 80, 'ا', 'cause', 56)}${tile(190, 30, 90, 80, 'و', 'cause', 56)}${tile(80, 30, 90, 80, 'ي', 'cause', 56)}
      <g class="a-ruler"><rect x="100" y="130" width="220" height="30" rx="8"/><path d="M155 130 v14 M210 130 v20 M265 130 v14"/></g>${counts(185, 145, 2, 'gold')}${cap(210, 190, L('نمدّ حركتين: عدّ على إصبعين ✌️', 'Stretch two counts: count on two fingers ✌️'), 'b', 13)}`,
    L('المد الطبيعي: حرف المد بمقدار حركتين', 'Natural madd: the madd letter for two counts')),
  madd_one_word: () => svg(420, 190, `<g class="a-word"><rect x="80" y="24" width="260" height="84" rx="20"/>${glyph(270, 86, 'ـا', 50, 'cause')}${glyph(170, 86, 'ء', 50, 'trigger')}</g>${cap(210, 16, L('كلمة واحدة', 'one word'), 'soft', 13)}
      ${counts(150, 140, 5, 'gold')}${cap(210, 178, L('مدّ ٤ أو ٥ حركات — واجب', '4 or 5 counts — required'), 'b', 13)}`,
    L('المد المتصل: المد والهمزة في كلمة واحدة', 'Connected madd: madd and hamza in one word')),
  madd_two_words: () => svg(420, 190, `<g class="a-word"><rect x="230" y="24" width="160" height="84" rx="20"/>${glyph(290, 86, 'ـا', 50, 'cause')}</g><g class="a-word"><rect x="30" y="24" width="160" height="84" rx="20"/>${glyph(130, 86, 'أ', 50, 'trigger')}</g>
      <path class="a-bridge" d="M230 70 q-20 -30 -40 0"/>${cap(310, 16, L('آخر الكلمة', 'end of word'), 'soft', 13)}${cap(110, 16, L('أول التالية', 'start of next'), 'soft', 13)}
      ${counts(150, 140, 5, 'gold')}${cap(210, 178, L('مدّ ٤ أو ٥ حركات — جائز', '4 or 5 counts — permitted'), 'b', 13)}`,
    L('المد المنفصل: المد في كلمة والهمزة في التي بعدها', 'Separated madd: madd at the end of one word, hamza at the start of the next'))
};
void getLang;

export const ART_IDS = Object.keys(ART);
export function art(id) { return ART[id] ? ART[id]() : ''; }
