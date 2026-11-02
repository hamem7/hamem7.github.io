// data/rules.js — محتوى الأحكام التعليمي (عربي/إنجليزي) لتجربة «تحدي التجويد».
//
// ⚠️ هذا الملف يحمل «القاعدة والتعريف والتوضيح» فقط. نصوص الآيات لا تُكتب هنا أبدًا: تُؤخذ حرفيًا من data/pool.js
//    (نسخة مولَّدة من مصحف المنصة) وتُشار إليها بمفتاح «سورة:آية» + فهارس الكلمات، ويتحقق tools/verify.mjs من كل مثال.
// ⚠️ أبيات المتون (poem) منقولة بالمطابقة مع نسخة «متن تحفة الأطفال» (docs/تحفة الاطفال.pdf) أو معلَّمة review إن لم يتيسر التحقق.
// كل عنصر يحمل review:'سبب' يُعرض في الواجهة بشارة «قيد المراجعة» ويُسجَّل في docs/REVIEW_CHECKLIST.md.
//
// بنية الحكم:
//   id, stage, name, tagline, def (التعريف الاصطلاحي)، kid (تبسيط للطفل)، how (خطوات التعرّف)، needs (ما يلزم لوقوع الحكم)،
//   find (تلميح البحث)، why (سبب الإجابة، {t}=الحرف المؤثّر)، watch (تنبيه)، vs (مقارنة بأحكام مشابهة)، letters، poem، length، examples
// أمثلة الدرس: [مفتاح الآية، كلمة١، كلمة٢، ملاحظة اختيارية] — كلمة١/كلمة٢ فهرسا الكلمتين كما في pool.js.

import { MUSHAF } from './mushaf.js';
import { KNOW } from './know.js';

const T = (ar, en) => ({ ar, en });

export const SOURCES = {
  tuhfa: {
    id: 'tuhfa',
    title: T('متن «تحفة الأطفال والغلمان» — الشيخ سليمان الجمزوري', 'Matn “Tuhfat al-Atfal wa-l-Ghilman” — Sheikh Sulayman al-Jamzuri'),
    ref: T('نسخة PDF من شبكة الألوكة (alukah.net) محفوظة في المنصة: docs/تحفة الاطفال.pdf — الأبيات 6–50 (ص٤–٧)', 'PDF edition from alukah.net kept in the platform repo: docs/تحفة الاطفال.pdf — verses 6–50 (pp. 4–7)'),
    status: 'verified',
    note: T('طُوبقت الأبيات المقتبسة بصريًا مع صفحات الـPDF. لم يُراجع المتن مع نسخة مطبوعة ثانية.', 'Quoted verses were checked visually against the PDF pages. Not yet cross-checked against a second printed edition.')
  },
  jazariyya: {
    id: 'jazariyya',
    title: T('«المقدمة الجزرية» — الإمام ابن الجزري', '“al-Muqaddima al-Jazariyya” — Imam Ibn al-Jazari'),
    ref: T('بيت القلقلة «وبيّنن مقلقلًا إن سكنا…» — غير متوفر ضمن ملفات المنصة', 'The qalqalah verse “wa-bayyinan muqalqalan in sakana…” — not available among the platform files'),
    status: 'review',
    note: T('البيت مكتوب من الحفظ ولم يُطابَق مع نسخة. يلزم تحقق المعلم قبل عرضه كاقتباس.', 'The verse is written from memory and was not matched against an edition. The teacher must verify it before it is shown as a quotation.')
  },
  quran: {
    id: 'quran',
    title: T('نص المصحف المستعمل في المنصة', 'Qur’an text used by the platform'),
    ref: T('database/quran-uthmani.json — «النسخة المصحَّحة» المشتقة من نص تنزيل ومجمع الملك فهد (انظر database/QURAN_SOURCE.md)', 'database/quran-uthmani.json — the “corrected” text derived from Tanzil and the King Fahd Complex (see database/QURAN_SOURCE.md)'),
    status: 'verified',
    note: T('نُسخت الآيات آليًا دون أي تعديل (حرفًا حرفًا)، ويتحقق tools/verify.mjs من التطابق التام مع المصدر. ترخيص النص: انظر QURAN_SOURCE.md.', 'Verses were copied mechanically with no edits (character-for-character); tools/verify.mjs checks exact equality with the source. Text licence: see QURAN_SOURCE.md.')
  },
  ghunna: {
    id: 'ghunna',
    title: T('جدول التوسيم ghunna 0.1.1 (MIT)', 'ghunna 0.1.1 annotation table (MIT)'),
    ref: T('database/data/tajweedAnnotations.json (انظر docs/TAJWEED_DATA.md في المنصة)', 'database/data/tajweedAnnotations.json (see docs/TAJWEED_DATA.md in the platform)'),
    status: 'cross-check',
    note: T('رأي ثانٍ آلي فقط: لا يدخل بنك الأسئلة إلا موضع اتفق عليه هذا الجدول وكاشف التجربة المستقل. ليس مرجعًا علميًا بحد ذاته.', 'An automatic second opinion only: a position enters the question bank only if this table and the prototype’s independent detector agree. It is not a scholarly reference in itself.')
  },
  teaching: {
    id: 'teaching',
    title: T('الصياغة التعليمية والتعريفات الاصطلاحية', 'Teaching wording and technical definitions'),
    ref: T('مبنية على نص التحفة والمصطلحات الشائعة في شروحها', 'Based on the Tuhfa text and the terminology common in its commentaries'),
    status: 'review',
    note: T('التعريفات الاصطلاحية (إخفاء، إدغام، غنة…) صيغت بما يوافق المشهور في كتب التجويد، لكنها لم تُطابَق بعد مع كتاب شرح محدد؛ يعتمدها المعلم أو يعدّلها.', 'The technical definitions follow the commonly taught wording, but were not yet matched to one specific commentary; the teacher should approve or amend them.')
  },
  audio: {
    id: 'audio',
    title: T('التلاوة الصوتية (اختيارية)', 'Recitation audio (optional)'),
    ref: T('everyayah.com — قارئ: محمد صديق المنشاوي (مرتّل)، نفس قارئ المنصة كلها، ملفات MP3 لكل آية. نمط الرابط: /data/Minshawy_Murattal_128kbps/SSSAAA.mp3', 'everyayah.com — reciter: Muhammad Siddiq al-Minshawi (murattal), the same reciter as the rest of the platform, one MP3 per verse. URL pattern: /data/Minshawy_Murattal_128kbps/SSSAAA.mp3'),
    status: 'review',
    note: T('تعذّر اختبار الروابط من بيئة التطوير (محجوبة). صحة التلاوة وتوفّر الروابط تحتاج سماعًا ومراجعة بشرية. يعمل التطبيق كاملًا دون الصوت.', 'The links could not be tested from the development environment (blocked). The correctness of the recitation and availability of the links need a human listen. The app works fully without audio.')
  }
};

export const LETTER_NAMES = {
  'ء': T('همزة', 'hamza'), 'ه': T('هاء', 'haa'), 'ع': T('عين', '‘ayn'), 'ح': T('حاء', 'ḥaa'), 'غ': T('غين', 'ghayn'), 'خ': T('خاء', 'khaa'),
  'ي': T('ياء', 'yaa'), 'ن': T('نون', 'noon'), 'م': T('ميم', 'meem'), 'و': T('واو', 'waw'), 'ل': T('لام', 'lam'), 'ر': T('راء', 'raa'),
  'ب': T('باء', 'baa'), 'ت': T('تاء', 'taa'), 'ث': T('ثاء', 'thaa'), 'ج': T('جيم', 'jeem'), 'د': T('دال', 'dal'), 'ذ': T('ذال', 'dhal'),
  'ز': T('زاي', 'zay'), 'س': T('سين', 'seen'), 'ش': T('شين', 'sheen'), 'ص': T('صاد', 'sad'), 'ض': T('ضاد', 'dad'), 'ط': T('طاء', 'ṭaa'),
  'ظ': T('ظاء', 'ẓaa'), 'ف': T('فاء', 'faa'), 'ق': T('قاف', 'qaf'), 'ك': T('كاف', 'kaf'), 'ا': T('ألف', 'alif')
};

export const L_IZHAR = ['ء', 'ه', 'ع', 'ح', 'غ', 'خ'];
export const L_IDGHAM_G = ['ي', 'ن', 'م', 'و'];
export const L_IDGHAM_N = ['ل', 'ر'];
export const L_IKHFA = ['ص', 'ذ', 'ث', 'ك', 'ج', 'ش', 'ق', 'س', 'د', 'ط', 'ز', 'ف', 'ت', 'ض', 'ظ'];
export const L_QALQALAH = ['ق', 'ط', 'ب', 'ج', 'د'];
export const L_QAMARI = ['ا', 'ب', 'غ', 'ح', 'ج', 'ك', 'و', 'خ', 'ف', 'ع', 'ق', 'ي', 'م', 'ه'];
export const L_SHAMSI = ['ط', 'ث', 'ص', 'ر', 'ت', 'ض', 'ذ', 'ن', 'د', 'س', 'ظ', 'ز', 'ش', 'ل'];

// ترتيب المراحل المقترح: من الأبسط (صوتان) ← ثلاثة أحكام للميم ← النون (٥) ← لام «ال» ← المدود
export const STAGES = [
  { id: 'mushaf', level: 'l_mushaf', hue: 'teal', icon: 'book', name: T('أتعرّف على مصحفي', 'Meet My Mushaf'), blurb: T('الآداب، رقم الآية، السور، الأجزاء، كيف أجد الآية، والسجدة', 'Manners, ayah numbers, surahs, juz, finding an ayah, and sajdah'), rules: ['mushaf_adab', 'mushaf_ayah_number', 'mushaf_surahs', 'mushaf_juz_hizb', 'mushaf_find', 'mushaf_sajda'] },
  { id: 'mushaf_marks', level: 'l_mushaf', hue: 'sky', icon: 'book', name: T('حركات الحروف وعلاماتها', 'Vowels and Letter Marks'), blurb: T('الحركات والتنوين، الهمزة، السكون والحروف الصامتة، والحروف الصغيرة', 'Vowels and tanween, hamza, sukun and silent letters, small letters'), rules: ['mushaf_harakat', 'mushaf_hamza', 'mushaf_silent_sukun', 'mushaf_madd_letters'] },
  { id: 'mushaf_signs', level: 'l_mushaf', hue: 'violet', icon: 'stop', name: T('علامات الوقف والعلامات النادرة', 'Stop Signs and Rare Marks'), blurb: T('علامات الوقف، السين مكان الصاد، وعلامتان نادرتان', 'Stop signs, seen in place of saad, and two rare marks'), rules: ['mushaf_waqf', 'mushaf_sin_saad', 'mushaf_special'] },
  { id: 'qalqalah_s', level: 'l_qalqalah', hue: 'sky', icon: 'wave', name: T('القلقلة', 'Qalqalah'), blurb: T('الحروف النطّاطة «قطب جد»', 'The bouncing letters «قطب جد»'), rules: ['qalqalah'] },
  { id: 'ghunna_s', level: 'l_ghunna', hue: 'violet', icon: 'wave', name: T('الغنّة', 'Ghunna'), blurb: T('النون والميم المشدّدتان: رنين من الأنف', 'Doubled noon and meem: a hum from the nose'), rules: ['ghunna'] },
  { id: 'tafkhim', level: 'l_tafkhim', hue: 'amber', icon: 'weight', name: T('التفخيم والترقيق', 'Heavy & Light Letters'), blurb: T('الراء ولام لفظ الجلالة: متى تكون سمينة ومتى نحيفة؟', 'The raa and the lam of “Allah”: when heavy, when light?'), rules: ['ra_tafkhim', 'ra_tarqiq', 'lam_jalala_tafkhim', 'lam_jalala_tarqiq'] },
  { id: 'meem', level: 'l_sakin', hue: 'rose', icon: 'lips', name: T('الميم الساكنة', 'Meem Sakinah'), blurb: T('ثلاثة أحكام للميم الساكنة (مْ)', 'Three rulings for the silent meem (مْ)'), rules: ['meem_ikhfa', 'meem_idgham', 'meem_izhar'] },
  { id: 'noon', level: 'l_sakin', hue: 'emerald', icon: 'noon', name: T('النون الساكنة والتنوين', 'Noon Sakinah & Tanween'), blurb: T('خمس صور: إظهار، إدغام بغنة، إدغام بلا غنة، إقلاب، إخفاء', 'Five forms: izhar, idgham with/without ghunna, iqlab, ikhfa'), rules: ['noon_izhar', 'noon_idgham_ghunna', 'noon_idgham_no_ghunna', 'noon_iqlab', 'noon_ikhfa'] },
  { id: 'lam', level: 'l_sakin', hue: 'amber', icon: 'sun', name: T('لام «أل»', 'The Lam of “Al”'), blurb: T('قمرية تظهر وشمسية تختفي', 'Moon letters show, sun letters hide'), rules: ['lam_qamari', 'lam_shamsi'] },
  { id: 'idgham', level: 'l_sakin', hue: 'rose', icon: 'merge', name: T('المثلان والمتجانسان والمتقاربان', 'Identical, Related & Neighbouring Letters'), blurb: T('حرفان يلتقيان فيصيران حرفًا مشدّدًا واحدًا', 'Two letters meet and become one doubled letter'), rules: ['mithlain', 'mutajanisain', 'mutaqaribain'] },
  { id: 'makharij', level: 'l_makharij', hue: 'sky', icon: 'mouth', name: T('المخارج والصفات', 'Articulation & Qualities'), blurb: T('من أين يخرج كل حرف؟ وما الحروف الهامسة والثقيلة والنطّاطة؟', 'Where does each letter come from? Which letters whisper, which are heavy, which bounce?'), rules: ['know_makharij', 'know_sifat'] },
  { id: 'madd', level: 'l_madd', hue: 'sky', icon: 'madd', name: T('المدود', 'Maddat (Elongation)'), blurb: T('المد الطبيعي والمتصل والمنفصل', 'Natural, connected and separated elongation'), rules: ['madd_tabii', 'madd_muttasil', 'madd_munfasil'] },
  { id: 'madd2', level: 'l_madd', hue: 'teal', icon: 'madd', name: T('مدود أخرى', 'More Maddat'), blurb: T('العارض للسكون واللين والبدل واللازم', 'ʿArid, leen, badal and lazim'), rules: ['madd_aridh', 'madd_leen', 'madd_badal', 'madd_lazim'] },
  { id: 'waqf', level: 'l_madd', hue: 'violet', icon: 'stop', name: T('الوقف على أواخر الكلمات', 'Stopping at Word Ends'), blurb: T('كيف ننطق آخر الكلمة إذا وقفنا عليها؟', 'How do we say the end of a word when we stop on it?'), rules: ['know_waqf'] }
];
// المستويات: تجمع المحطات بالترتيب الذي يُدرَّس به (الرئيسية تعرض مستوى واحدًا في كل مرة)
export const GROUPS = [
  { id: 'l_mushaf', icon: '📖', name: T('مصحفي', 'My Mushaf') },
  { id: 'l_qalqalah', icon: '🏀', name: T('القلقلة', 'Qalqalah') },
  { id: 'l_ghunna', icon: '🐝', name: T('الغنّة', 'Ghunna') },
  { id: 'l_tafkhim', icon: '🎈', name: T('التفخيم والترقيق', 'Heavy & Light') },
  { id: 'l_sakin', icon: '🔗', name: T('الحرف الساكن', 'The Silent Letter') },
  { id: 'l_makharij', icon: '👄', name: T('المخارج والصفات', 'Articulation & Qualities') },
  { id: 'l_madd', icon: '📏', name: T('المدّ والوقف', 'Madd & Stopping') }
];
export const groupOf = (stageId) => GROUPS.find((g) => g.id === STAGES.find((s) => s.id === stageId)?.level);

export const RULES = {
  // ───────────────────────── المرحلة ١: أصوات خاصة ─────────────────────────
  ghunna: {
    id: 'ghunna', stage: 'ghunna_s', viz: 'ghunna',
    name: T('الغنّة (النون والميم المشدّدتان)', 'Ghunna (doubled Noon & Meem)'),
    short: T('نّ  مّ', 'نّ  مّ'),
    tagline: T('رنين لطيف في الأنف', 'A gentle hum in the nose'),
    def: T('الغنّة صوت لذيذ يخرج من الخيشوم (الأنف) لا عمل للسان فيه. وتظهر ظهورًا كاملًا في النون والميم المشدّدتين (نّ، مّ)، ومقدارها حركتان.', 'Ghunna is a pleasant nasal sound produced in the nasal passage, with no work for the tongue. It shows fully on a doubled noon or meem (نّ، مّ), and lasts two harakat.'),
    kid: T('إذا رأيتَ نونًا أو ميمًا عليها شدّة، دندن بها في أنفك كأنك تقول «نننن» أو «ممم» لمدة قصيرة: بمقدار حركتين، لا أكثر.', 'When you see a noon or meem with a shadda, hum it through your nose like “nnnn” or “mmmm” for a short moment: two harakat, no more.'),
    how: [
      T('ابحث عن نون أو ميم عليها شدّة (ّ).', 'Look for a noon or meem carrying a shadda (ّ).'),
      T('اثبت على الحرف المشدّد ولا تسرع.', 'Stay on the doubled letter; do not rush.'),
      T('أخرج الصوت من أنفك بمقدار حركتين.', 'Let the sound resonate in your nose for two harakat.')
    ],
    needs: T('نون أو ميم عليها شدّة أصلية في الكلمة', 'a noon or meem with an original shadda in the word'),
    find: T('ابحث عن كلمة فيها نون أو ميم مشدّدة (نّ / مّ).', 'Find a word with a doubled noon or meem (نّ / مّ).'),
    why: T('في هذه الكلمة حرف «{t}» عليه شدّة، لذلك تُنطق غنّة بمقدار حركتين.', 'This word has “{t}” with a shadda, so ghunna is pronounced for two harakat.'),
    watch: T('لا تُطِل الغنّة أكثر من حركتين ولا تقطعها قبل تمامها. (الشدّة هنا أصلية، أما الشدّة الناتجة عن إدغام فلها حكمها في بابها.)', 'Do not stretch the ghunna beyond two harakat, and do not cut it short. (The shadda here is original; a shadda created by idgham belongs to that rule.)'),
    vs: [{ with: 'qalqalah', tip: T('القلقلة نبرة عند حروف «قطب جد» الساكنة، أما الغنّة فرنين في الأنف عند النون والميم المشدّدتين.', 'Qalqalah is a bounce on the silent letters of “qutb jad”; ghunna is a nasal hum on a doubled noon or meem.') }],
    length: T('حركتان', 'two harakat'),
    letters: { list: ['ن', 'م'], label: T('الحرفان (بشدّة)', 'The two letters (with shadda)') },
    poem: { ar: ['وَغُنَّ مِيمًا ثُمَّ نُونًا شُدِّدَا', 'وَسَمِّ كُلًّا حَرْفَ غُنَّةٍ بَدَا'], ref: T('تحفة الأطفال — البيت ١٧', 'Tuhfat al-Atfal — verse 17'), src: 'tuhfa' },
    examples: [['78:17', 0, 0], ['79:22', 0, 0], ['114:2', 1, 1]]
  },

  qalqalah: {
    id: 'qalqalah', stage: 'qalqalah_s', viz: 'qalqalah',
    name: T('القلقلة', 'Qalqalah (the bounce)'),
    short: T('قطب جد', 'قطب جد'),
    tagline: T('نبرة ترتدّ كالكرة', 'A bounce like a ball'),
    def: T('القلقلة: اضطراب المخرج عند النطق بالحرف الساكن حتى يُسمع له نبرة قوية. وحروفها خمسة تجمعها عبارة «قطب جد»: ق، ط، ب، ج، د.', 'Qalqalah is a vibration at the point of articulation when one of its letters is sakin, producing a strong echo. Its five letters are gathered in the phrase “qutb jad”: ق ط ب ج د.'),
    kid: T('تخيّل كرة تضرب الأرض فترتدّ: تحبس الحرف لحظة ثم تُطلقه بنبرة خفيفة، دون أن تجعله فتحة أو ضمة أو كسرة.', 'Imagine a ball hitting the floor and bouncing back: hold the letter for an instant, then release it with a light echo, without turning it into a fatha, damma or kasra.'),
    how: [
      T('هل الحرف من «قطب جد»؟', 'Is the letter one of “qutb jad”?'),
      T('هل عليه سكون (ْ)؟', 'Does it carry a sukun (ْ)?'),
      T('اضغط عليه ثم أطلقه بنبرة خفيفة، دون حركة كاملة.', 'Press it, then release it with a light echo, with no full vowel.')
    ],
    needs: T('حرف من «قطب جد» عليه سكون', 'a letter of “qutb jad” carrying a sukun'),
    find: T('ابحث عن حرف من ق ط ب ج د عليه سكون.', 'Find a letter from ق ط ب ج د that carries a sukun.'),
    why: T('الحرف «{t}» من حروف «قطب جد» وهو ساكن، فيُنطق بقلقلة.', 'The letter “{t}” is one of “qutb jad” and is sakin, so it is pronounced with qalqalah.'),
    watch: T('لا تحوّل القلقلة إلى حركة كاملة، ولا تتركها بلا نبرة. وتكون أوضح إذا وقفتَ على الحرف في آخر الكلمة (تتعلّمها في مستوى لاحق).', 'Do not turn the qalqalah into a full vowel, and do not leave it without any echo. It is clearer when you stop on the letter at the end of a word (learned at a later level).'),
    vs: [{ with: 'ghunna', tip: T('الغنّة في الأنف مع النون والميم المشدّدتين، والقلقلة اهتزاز عند الحرف الساكن من «قطب جد».', 'Ghunna is nasal with a doubled noon or meem; qalqalah is a bounce on a silent letter of “qutb jad”.') }],
    length: T('نبرة قصيرة', 'a short echo'),
    letters: { list: L_QALQALAH, label: T('حروف القلقلة «قطب جد»', 'The qalqalah letters “qutb jad”') },
    poem: { ar: ['وَبَيِّنَنْ مُقَلْقَلًا إِنْ سَكَنَا', 'وَإِنْ يَكُنْ فِي الْوَقْفِ كَانَ أَبْيَنَا'], ref: T('المقدمة الجزرية — بيت القلقلة', 'al-Muqaddima al-Jazariyya — the qalqalah verse'), src: 'jazariyya', review: 'البيت مكتوب من الحفظ — يلزم مطابقته مع نسخة' },
    examples: [['78:8', 0, 0, 'ق'], ['80:19', 1, 1, 'ط'], ['79:3', 1, 1, 'ب'], ['78:6', 1, 1, 'ج'], ['79:22', 1, 1, 'د']]
  },

  // ───────────────────────── المرحلة ٢: الميم الساكنة ─────────────────────────
  meem_ikhfa: {
    id: 'meem_ikhfa', stage: 'meem', viz: 'meem_ikhfa',
    name: T('الإخفاء الشفوي', 'Ikhfa Shafawi (lip concealment)'),
    short: T('مْ + ب', 'مْ + ب'),
    tagline: T('ميم مخفاة عند الباء', 'A hidden meem before baa'),
    def: T('إذا جاءت الميم الساكنة وبعدها حرف الباء أُخفيت الميم: تُنطق بصفة بين الإظهار والإدغام، دون تشديد، مع بقاء الغنّة (حركتان). وسُمّي «شفويًا» لأن مخرج الميم والباء من الشفتين.', 'When a meem sakinah is followed by baa, the meem is concealed: it is pronounced between clear and merged, without shadda, keeping the ghunna (two harakat). It is called “labial” because both meem and baa come from the lips.'),
    kid: T('أطبق شفتيك برفق (لا تضغطهما بقوة) واترك الغنّة تخرج من أنفك قليلًا، ثم انطق الباء.', 'Close your lips gently (do not squeeze), let the ghunna hum through your nose briefly, then say the baa.'),
    how: [
      T('ابحث عن ميم ساكنة (مْ) في آخر الكلمة.', 'Find a meem sakinah (مْ) at the end of a word.'),
      T('انظر الحرف التالي: هل هو الباء؟', 'Look at the next letter: is it baa?'),
      T('أطبق الشفتين برفق وأخرج غنّة حركتين ثم انطق الباء.', 'Close the lips gently, hum for two harakat, then say the baa.')
    ],
    needs: T('الباء بعد الميم الساكنة', 'a baa after the meem sakinah'),
    find: T('ابحث عن ميم ساكنة يليها حرف الباء.', 'Find a meem sakinah followed by the letter baa.'),
    why: T('جاء بعد الميم الساكنة حرف «{t}»، وهو الباء، فالحكم إخفاء شفوي.', 'After the meem sakinah comes “{t}”, which is baa, so the rule is ikhfa shafawi.'),
    watch: T('لا تُطبق الشفتين بقوة حتى تصير الميم ظاهرة تمامًا، ولا تحذف الغنّة.', 'Do not close the lips so hard that the meem becomes fully clear, and do not drop the ghunna.'),
    vs: [
      { with: 'meem_idgham', tip: T('الإدغام الشفوي: بعد الميم الساكنة ميم متحرّكة (فتذوب فيها)؛ أما الإخفاء فبعدها باء.', 'Idgham shafawi: a moving meem follows (the first merges into it); in ikhfa a baa follows.') },
      { with: 'meem_izhar', tip: T('الإظهار الشفوي: بعد الميم أي حرف غير الباء والميم، وتُنطق واضحة.', 'Izhar shafawi: any letter other than baa and meem follows, and the meem is clear.') }
    ],
    length: T('غنّة حركتان', 'ghunna for two harakat'),
    letters: { list: ['ب'], label: T('حرف الإخفاء الشفوي', 'The ikhfa shafawi letter') },
    poem: { ar: ['فَالْأَوَّلُ الْإِخْفَاءُ عِنْدَ الْبَاءِ', 'وَسَمِّهِ الشَّفْوِيَّ لِلْقُرَّاءِ'], ref: T('تحفة الأطفال — البيت ٢٠', 'Tuhfat al-Atfal — verse 20'), src: 'tuhfa' },
    examples: [['84:24', 0, 1], ['105:4', 0, 1], ['88:22', 1, 2]]
  },

  meem_idgham: {
    id: 'meem_idgham', stage: 'meem', viz: 'meem_idgham',
    name: T('الإدغام الشفوي (المثلين الصغير)', 'Idgham Shafawi (small mithlayn)'),
    short: T('مْ + م', 'مْ + م'),
    tagline: T('ميمان يصيران ميمًا واحدة', 'Two meems become one'),
    def: T('إذا جاءت ميم ساكنة وبعدها ميم متحرّكة أُدغمت الأولى في الثانية فصارتا ميمًا واحدة مشدّدة مع غنّة (حركتان). ويُسمّى «إدغامًا صغيرًا» لأن الأول ساكن والثاني متحرّك.', 'When a meem sakinah is followed by a moving meem, the first merges into the second and they become one doubled meem with ghunna (two harakat). It is “small” idgham because the first letter is sakin and the second moves.'),
    kid: T('الميمان يتعانقان: لا تنطق الأولى منفصلة، بل ميم واحدة قوية مشدّدة مع دندنة الغنّة.', 'The two meems hug each other: do not say the first one apart; say one strong doubled meem with a hum.'),
    how: [
      T('ابحث عن ميم ساكنة في آخر الكلمة.', 'Find a meem sakinah at the end of a word.'),
      T('هل أول الكلمة التالية ميم (وعليها شدّة)؟', 'Does the next word start with a meem (carrying a shadda)?'),
      T('ادمجهما في ميم مشدّدة واحدة مع غنّة حركتين.', 'Merge them into one doubled meem with two harakat of ghunna.')
    ],
    needs: T('ميم متحرّكة بعد الميم الساكنة', 'a moving meem after the meem sakinah'),
    find: T('ابحث عن ميم ساكنة يليها ميم.', 'Find a meem sakinah followed by another meem.'),
    why: T('جاء بعد الميم الساكنة حرف «{t}» (ميم أخرى)، فتُدغم الأولى في الثانية.', 'After the meem sakinah comes “{t}” (another meem), so the first merges into it.'),
    watch: T('لا تنطق ميمين منفصلتين، ولا تنسَ الغنّة.', 'Do not pronounce two separate meems, and do not forget the ghunna.'),
    vs: [
      { with: 'meem_ikhfa', tip: T('الإخفاء الشفوي بعده باء؛ والإدغام الشفوي بعده ميم.', 'Ikhfa shafawi is followed by baa; idgham shafawi by meem.') },
      { with: 'noon_idgham_ghunna', tip: T('هنا الإدغام في الميم من الميم نفسها؛ أما إدغام النون فله أربعة حروف (ينمو).', 'Here a meem merges into a meem; noon’s idgham has four letters (yanmū).') }
    ],
    length: T('غنّة حركتان', 'ghunna for two harakat'),
    letters: { list: ['م'], label: T('حرف الإدغام الشفوي', 'The idgham shafawi letter') },
    poem: { ar: ['وَالثَّانِ إِدْغَامٌ بِمِثْلِهَا أَتَى', 'وَسَمِّ إِدْغَامًا صَغِيرًا يَا فَتَى'], ref: T('تحفة الأطفال — البيت ٢١', 'Tuhfat al-Atfal — verse 21'), src: 'tuhfa' },
    examples: [['104:8', 1, 2], ['83:4', 3, 4], ['85:20', 2, 3]]
  },

  meem_izhar: {
    id: 'meem_izhar', stage: 'meem', viz: 'meem_izhar',
    name: T('الإظهار الشفوي', 'Izhar Shafawi (clear lip meem)'),
    short: T('مْ + غير (ب، م)', 'مْ + other'),
    tagline: T('ميم واضحة صافية', 'A clear, crisp meem'),
    def: T('إذا جاء بعد الميم الساكنة أي حرف غير الباء والميم نُطقت الميم واضحة من الشفتين دون غنّة زائدة. وسُمّي «شفويًا» لأن مخرج الميم من الشفتين.', 'When any letter other than baa and meem follows a meem sakinah, the meem is pronounced clearly from the lips with no extra ghunna. It is “labial” because the meem comes from the lips.'),
    kid: T('انطق الميم واضحة كأنك تقول «مْ» ثم انتقل إلى الحرف التالي دون أن تخلط بينهما.', 'Say the meem clearly, like “m”, then move to the next letter without blending them.'),
    how: [
      T('ابحث عن ميم ساكنة في آخر الكلمة.', 'Find a meem sakinah at the end of a word.'),
      T('تأكد أن الحرف التالي ليس باء ولا ميمًا.', 'Check the next letter is neither baa nor meem.'),
      T('انطق الميم واضحة وأغلق الشفتين لحظة دون تطويل.', 'Say the meem clearly, closing the lips for an instant without stretching.')
    ],
    needs: T('أي حرف غير الباء والميم بعد الميم الساكنة', 'any letter except baa and meem after the meem sakinah'),
    find: T('ابحث عن ميم ساكنة يليها حرف غير الباء والميم.', 'Find a meem sakinah followed by a letter other than baa or meem.'),
    why: T('جاء بعد الميم الساكنة حرف «{t}» وهو ليس باءً ولا ميمًا، فالحكم إظهار شفوي.', 'After the meem sakinah comes “{t}”, which is neither baa nor meem, so the rule is izhar shafawi.'),
    watch: T('احذر عند الواو والفاء: لا تُخفِ الميم عندهما لقرب مخرجهما من الميم.', 'Take care before waw and faa: do not hide the meem there, because their points of articulation are close to the meem.'),
    vs: [
      { with: 'meem_ikhfa', tip: T('الإخفاء بعده باء فقط، وتبقى الغنّة؛ أما الإظهار فبعده باقي الحروف وتُنطق الميم واضحة.', 'Ikhfa is only before baa and keeps ghunna; izhar is before all other letters and the meem is clear.') }
    ],
    length: T('بلا مدّ زائد', 'no extra stretch'),
    letters: { list: [], label: T('باقي حروف الهجاء ما عدا الباء والميم', 'All other letters except baa and meem') },
    poem: { ar: ['وَالثَّالِثُ الْإِظْهَارُ فِي الْبَقِيَّهْ', 'مِنْ أَحْرُفٍ وَسَمِّهَا شَفْوِيَّهْ'], ref: T('تحفة الأطفال — البيت ٢٢ (والتحذير من الواو والفاء في ٢٣)', 'Tuhfat al-Atfal — verse 22 (the warning about waw and faa is in 23)'), src: 'tuhfa' },
    examples: [['78:27', 0, 1], ['82:10', 1, 2], ['78:3', 1, 2, 'ف']]
  },

  // ───────────────────────── المرحلة ٣: النون الساكنة والتنوين ─────────────────────────
  noon_izhar: {
    id: 'noon_izhar', stage: 'noon', viz: 'noon_izhar',
    name: T('الإظهار الحلقي', 'Izhar Halqi (clear, throat letters)'),
    short: T('نْ + حرف حلقي', 'نْ + throat letter'),
    tagline: T('النون واضحة قبل حروف الحلق', 'A clear noon before throat letters'),
    def: T('الإظهار لغةً: البيان. واصطلاحًا: إخراج كل حرف من مخرجه من غير غنّة في الحرف المُظهَر. وهو أن تُنطق النون الساكنة أو التنوين واضحة إذا جاء بعدها أحد حروف الحلق الستة: ء ه ع ح غ خ.', 'Izhar means clarity. Technically: pronouncing each letter from its own articulation point with no ghunna on the clarified letter. The noon sakinah or tanween is read clearly when one of the six throat letters follows: ء ه ع ح غ خ.'),
    kid: T('حروف الحلق بعيدة عن مكان النون، فلا تلتقي بها: انطق النون صافية ثم الحرف الحلقي، من غير غنّة طويلة.', 'The throat letters are far from where noon is made, so they never blend: say a crisp noon, then the throat letter, without a long hum.'),
    how: [
      T('ابحث عن نون ساكنة أو تنوين.', 'Find a noon sakinah or tanween.'),
      T('انظر أول حرف في الكلمة التالية (أو الحرف التالي في الكلمة).', 'Look at the first letter of the next word (or the next letter in the word).'),
      T('إن كان من ء ه ع ح غ خ فانطق النون واضحة.', 'If it is one of ء ه ع ح غ خ, pronounce the noon clearly.')
    ],
    needs: T('أحد حروف الحلق: ء ه ع ح غ خ', 'a throat letter: ء ه ع ح غ خ'),
    find: T('ابحث عن نون ساكنة أو تنوين يليه حرف حلقي (ء ه ع ح غ خ).', 'Find a noon sakinah or tanween followed by a throat letter (ء ه ع ح غ خ).'),
    why: T('جاء بعد النون الساكنة (أو التنوين) حرف «{t}» وهو من حروف الحلق الستة، فالحكم إظهار.', 'After the noon sakinah (or tanween) comes “{t}”, one of the six throat letters, so the rule is izhar.'),
    watch: T('لا تُدخل غنّة طويلة على النون، ولا تُخفها: اجعلها واضحة.', 'Do not add a long ghunna to the noon and do not hide it: keep it clear.'),
    vs: [{ with: 'noon_ikhfa', tip: T('الإظهار قبل الحروف الستة الحلقية فقط. إن لم يكن الحرف حلقيًا فانظر: ينمو؟ لر؟ ب؟ وإلا فهو إخفاء.', 'Izhar is only before the six throat letters. If it is not a throat letter, check: yanmū? lam/raa? baa? Otherwise it is ikhfa.') }],
    length: T('بلا غنّة مطوّلة', 'no stretched ghunna'),
    letters: { list: L_IZHAR, label: T('حروف الإظهار (الحلق)', 'Izhar letters (throat)'), mnemonic: { ar: 'أَخِي هَاكَ عِلْمًا حَازَهُ غَيْرُ خَاسِرٍ', en: 'Akhī hāka ‘ilman ḥāzahu ghayru khāsir', note: T('عبارة حفظ شائعة: أوائل كلماتها ء ه ع ح غ خ', 'A common memory phrase: the first letters of its words are ء ه ع ح غ خ'), review: 'عبارة حفظ شائعة غير منقولة عن مرجع بعينه' } },
    poem: { ar: ['فَالْأَوَّلُ الْإِظْهَارُ قَبْلَ أَحْرُفِ', 'لِلْحَلْقِ سِتٍّ رُتِّبَتْ فَلْتَعْرِفِ', 'هَمْزٌ فَهَاءٌ ثُمَّ عَيْنٌ حَاءُ', 'مُهْمَلَتَانِ ثُمَّ غَيْنٌ خَاءُ'], ref: T('تحفة الأطفال — الأبيات ٧–٨', 'Tuhfat al-Atfal — verses 7–8'), src: 'tuhfa' },
    examples: [['96:2', 2, 3], ['88:10', 1, 2], ['93:10', 3, 3]]
  },

  noon_idgham_ghunna: {
    id: 'noon_idgham_ghunna', stage: 'noon', viz: 'noon_idgham_ghunna',
    name: T('الإدغام بغنّة', 'Idgham with Ghunna'),
    short: T('نْ + ي ن م و', 'نْ + ي ن م و'),
    tagline: T('تذوب النون وتبقى الغنّة', 'The noon melts but the hum stays'),
    def: T('الإدغام: إدخال حرف ساكن في حرف متحرّك بحيث يصيران حرفًا واحدًا مشدّدًا. فإذا جاء بعد النون الساكنة أو التنوين أحد حروف «ينمو» (ي ن م و) في كلمة أخرى أُدغمت النون فيه مع بقاء الغنّة (حركتان).', 'Idgham means entering a silent letter into a moving one so they become one doubled letter. When one of the letters of “yanmū” (ي ن م و) follows a noon sakinah or tanween in the next word, the noon merges into it while the ghunna remains (two harakat).'),
    kid: T('النون تذوب في الحرف التالي ولا تُسمع وحدها، لكن «دندنة» الأنف تبقى حركتين.', 'The noon melts into the next letter and is not heard on its own, but the nose-hum stays for two harakat.'),
    how: [
      T('ابحث عن نون ساكنة أو تنوين في آخر كلمة.', 'Find a noon sakinah or tanween at the end of a word.'),
      T('هل أول الكلمة التالية من ي ن م و؟', 'Does the next word start with ي ن م و?'),
      T('أدغم النون في الحرف مع غنّة حركتين.', 'Merge the noon into the letter with two harakat of ghunna.')
    ],
    needs: T('أحد حروف «ينمو» (ي ن م و) في الكلمة التالية', 'one of the letters “yanmū” (ي ن م و) in the next word'),
    find: T('ابحث عن نون ساكنة أو تنوين يليه حرف من ي ن م و.', 'Find a noon sakinah or tanween followed by one of ي ن م و.'),
    why: T('جاء بعد النون الساكنة (أو التنوين) حرف «{t}» وهو من حروف «ينمو»، فالحكم إدغام بغنّة.', 'After the noon sakinah (or tanween) comes “{t}”, a letter of “yanmū”, so the rule is idgham with ghunna.'),
    watch: T('إن كانت النون والحرف في كلمة واحدة (مثل «دُنْيَا» و«صِنْوَانٌ») فلا إدغام: تُظهر النون.', 'If the noon and the letter are in the same word (like “dunyā” and “ṣinwān”) there is no idgham: the noon is clear.'),
    vs: [
      { with: 'noon_idgham_no_ghunna', tip: T('الإدغام بغنّة حروفه ي ن م و؛ والإدغام بلا غنّة حرفاه ل ر فقط وتذوب النون تمامًا.', 'Idgham with ghunna uses ي ن م و; idgham without ghunna uses only ل ر and the noon dissolves completely.') },
      { with: 'noon_ikhfa', tip: T('في الإدغام تُنطق النون حرفًا مشدّدًا واحدًا مع التالي؛ أما الإخفاء فتبقى النون مخفاة ولا تشدّد.', 'In idgham the noon merges into a doubled letter; in ikhfa it stays hidden and there is no shadda.') }
    ],
    length: T('غنّة حركتان', 'ghunna for two harakat'),
    letters: { list: L_IDGHAM_G, label: T('حروف الإدغام بغنّة «ينمو»', 'Idgham-with-ghunna letters “yanmū”'), mnemonic: { ar: 'يَنْمُو', en: 'yanmū', note: T('من بيت التحفة: «بِيَنْمُو عُلِمَا»', 'From the Tuhfa: “bi-yanmū ‘ulimā”'), src: 'tuhfa' } },
    poem: { ar: ['لَكِنَّهَا قِسْمَانِ قِسْمٌ يُدْغَمَا', 'فِيهِ بِغُنَّةٍ بِيَنْمُو عُلِمَا', 'إِلَّا إِذَا كَانَا بِكِلْمَةٍ فَلَا', 'تُدْغِمْ كَدُنْيَا ثُمَّ صِنْوَانٌ تَلَا'], ref: T('تحفة الأطفال — الأبيات ١٠–١١', 'Tuhfat al-Atfal — verses 10–11'), src: 'tuhfa' },
    examples: [['80:19', 0, 1, 'ن'], ['83:9', 0, 1, 'م'], ['84:8', 2, 3, 'ي'], ['78:25', 1, 2, 'و']]
  },

  noon_idgham_no_ghunna: {
    id: 'noon_idgham_no_ghunna', stage: 'noon', viz: 'noon_idgham_no_ghunna',
    name: T('الإدغام بلا غنّة', 'Idgham without Ghunna'),
    short: T('نْ + ل ر', 'نْ + ل ر'),
    tagline: T('تذوب النون كليًّا', 'The noon dissolves completely'),
    def: T('إذا جاء بعد النون الساكنة أو التنوين حرف اللام أو الراء في كلمة أخرى أُدغمت النون فيه إدغامًا كاملًا بلا غنّة: لا تُسمع النون ولا يُسمع صوت الأنف.', 'When lam or raa follows a noon sakinah or tanween in the next word, the noon merges completely with no ghunna: neither the noon nor any nasal sound is heard.'),
    kid: T('هنا تختفي النون تمامًا كأنها لم تكن، ويُشدَّد اللام أو الراء مباشرة، من غير دندنة في الأنف.', 'Here the noon vanishes as if it were not there, and the lam or raa is doubled straight away, with no nose-hum.'),
    how: [
      T('ابحث عن نون ساكنة أو تنوين في آخر كلمة.', 'Find a noon sakinah or tanween at the end of a word.'),
      T('هل أول الكلمة التالية اللام أو الراء؟', 'Does the next word start with lam or raa?'),
      T('أدغم النون كليًّا بلا غنّة وشدّد الحرف.', 'Merge the noon completely, no ghunna, and double the letter.')
    ],
    needs: T('اللام أو الراء في الكلمة التالية', 'lam or raa in the next word'),
    find: T('ابحث عن نون ساكنة أو تنوين يليه لام أو راء.', 'Find a noon sakinah or tanween followed by lam or raa.'),
    why: T('جاء بعد النون الساكنة (أو التنوين) حرف «{t}» وهو من حرفي اللام والراء، فالحكم إدغام بلا غنّة.', 'After the noon sakinah (or tanween) comes “{t}”, one of lam and raa, so the rule is idgham without ghunna.'),
    watch: T('لا تُدخل غنّة هنا؛ الغنّة تختص بحروف «ينمو».', 'Do not add ghunna here; ghunna belongs only to the letters of “yanmū”.'),
    vs: [{ with: 'noon_idgham_ghunna', tip: T('الفرق الوحيد: بغنّة مع ي ن م و، وبلا غنّة مع ل ر.', 'The only difference: with ghunna for ي ن م و, without it for ل ر.') }],
    length: T('بلا غنّة', 'no ghunna'),
    letters: { list: L_IDGHAM_N, label: T('حروف الإدغام بلا غنّة', 'Idgham-without-ghunna letters'), mnemonic: { ar: 'يَرْمَلُونَ ← (ل ر)', en: 'yarmalūn → (ل ر)', note: T('الحرفان ل ر من مجموع «يرملون»', 'ل ر are the two letters of “yarmalūn” that take no ghunna'), src: 'tuhfa' } },
    poem: { ar: ['وَالثَّانِ إِدْغَامٌ بِغَيْرِ غُنَّهْ', 'فِي اللَّامِ وَالرَّا ثُمَّ كَرِّرَنَّهْ'], ref: T('تحفة الأطفال — البيت ١٢', 'Tuhfat al-Atfal — verse 12'), src: 'tuhfa' },
    examples: [['83:25', 1, 2, 'ر'], ['107:4', 0, 1, 'ل'], ['81:25', 3, 4, 'ر'], ['90:5', 1, 2, 'ل']]
  },

  noon_iqlab: {
    id: 'noon_iqlab', stage: 'noon', viz: 'noon_iqlab',
    name: T('الإقلاب', 'Iqlab (the flip)'),
    short: T('نْ + ب', 'نْ + ب'),
    tagline: T('النون تنقلب ميمًا عند الباء', 'The noon flips into a meem before baa'),
    def: T('الإقلاب: قلب النون الساكنة أو التنوين ميمًا خالصة عند الباء، مع إخفائها وبقاء الغنّة (حركتان). وفي المصحف علامة تدلّ عليه: ميم صغيرة (ۢ) فوق النون أو التنوين.', 'Iqlab: turning a noon sakinah or tanween into a pure meem before baa, concealing it and keeping ghunna (two harakat). The mushaf marks it with a small meem (ۢ) above the noon or tanween.'),
    kid: T('النون تلبس قناع الميم! انطق ميمًا خفيفة (بشفتين شبه مطبقتين) مع غنّة، ثم الباء.', 'The noon puts on a meem mask! Say a light meem (lips nearly closed) with ghunna, then the baa.'),
    how: [
      T('ابحث عن نون ساكنة أو تنوين.', 'Find a noon sakinah or tanween.'),
      T('هل الحرف التالي الباء؟ (وفي المصحف ميم صغيرة ۢ علامة).', 'Is the next letter baa? (The mushaf shows a small meem ۢ as a sign.)'),
      T('اقلبها ميمًا مخفاة مع غنّة حركتين ثم انطق الباء.', 'Flip it to a hidden meem with two harakat of ghunna, then say the baa.')
    ],
    needs: T('الباء بعد النون الساكنة أو التنوين', 'a baa after the noon sakinah or tanween'),
    find: T('ابحث عن نون ساكنة أو تنوين يليه حرف الباء (وفوقه ميم صغيرة ۢ).', 'Find a noon sakinah or tanween followed by baa (with a small meem ۢ above).'),
    why: T('جاء بعد النون الساكنة (أو التنوين) حرف «{t}» وهو الباء، فتُقلب النون ميمًا: إقلاب.', 'After the noon sakinah (or tanween) comes “{t}”, which is baa, so the noon flips to meem: iqlab.'),
    watch: T('لا تنطق النون نونًا، ولا تُظهر الميم بقوة: ميم مخفاة بغنّة.', 'Do not say a noon, and do not make the meem strong: a hidden meem with ghunna.'),
    vs: [{ with: 'meem_ikhfa', tip: T('الإخفاء الشفوي يبدأ بميم موجودة أصلًا؛ والإقلاب يبدأ بنون أو تنوين تتحوّل إلى ميم.', 'Ikhfa shafawi starts with a real meem; iqlab starts with a noon or tanween that turns into a meem.') }],
    length: T('غنّة حركتان', 'ghunna for two harakat'),
    letters: { list: ['ب'], label: T('حرف الإقلاب', 'The iqlab letter') },
    poem: { ar: ['وَالثَّالِثُ الْإِقْلَابُ عِنْدَ الْبَاءِ', 'مِيمًا بِغُنَّةٍ مَعَ الْإِخْفَاءِ'], ref: T('تحفة الأطفال — البيت ١٣', 'Tuhfat al-Atfal — verse 13'), src: 'tuhfa' },
    examples: [['86:7', 1, 2], ['80:16', 0, 1], ['80:27', 0, 0]]
  },

  noon_ikhfa: {
    id: 'noon_ikhfa', stage: 'noon', viz: 'noon_ikhfa',
    name: T('الإخفاء الحقيقي', 'Ikhfa Haqiqi (true concealment)'),
    short: T('نْ + ١٥ حرفًا', 'نْ + 15 letters'),
    tagline: T('النون مخفاة بين الإظهار والإدغام', 'A hidden noon between clear and merged'),
    def: T('الإخفاء: النطق بالنون الساكنة أو التنوين بصفة بين الإظهار والإدغام، عارية عن التشديد، مع بقاء الغنّة (حركتان). ويقع إذا جاء بعدها أحد خمسة عشر حرفًا (الباقية).', 'Ikhfa: pronouncing the noon sakinah or tanween between clear and merged, without shadda, keeping the ghunna (two harakat). It occurs before any of fifteen letters (the remaining ones).'),
    kid: T('اللسان يقترب من مكان الحرف التالي دون أن يلمسه تمامًا، والصوت يرنّ في الأنف: النون «متخفّية» لا ظاهرة ولا ذائبة.', 'The tongue moves toward the next letter’s spot without fully touching it while the sound hums in the nose: the noon is “in hiding”, neither clear nor melted.'),
    how: [
      T('ابحث عن نون ساكنة أو تنوين.', 'Find a noon sakinah or tanween.'),
      T('تأكد أن الحرف التالي ليس حلقيًا ولا من «ينمو» ولا «لر» ولا باء.', 'Check that the next letter is not a throat letter, not from “yanmū”, not lam/raa and not baa.'),
      T('أخفِ النون بغنّة حركتين وقرّب لسانك من الحرف التالي.', 'Hide the noon with two harakat of ghunna and bring your tongue toward the next letter.')
    ],
    needs: T('أحد الحروف الخمسة عشر: ص ذ ث ك ج ش ق س د ط ز ف ت ض ظ', 'one of the fifteen letters: ص ذ ث ك ج ش ق س د ط ز ف ت ض ظ'),
    find: T('ابحث عن نون ساكنة أو تنوين يليه أحد حروف الإخفاء الخمسة عشر.', 'Find a noon sakinah or tanween followed by one of the fifteen ikhfa letters.'),
    why: T('جاء بعد النون الساكنة (أو التنوين) حرف «{t}» وهو من حروف الإخفاء الخمسة عشر، فالحكم إخفاء.', 'After the noon sakinah (or tanween) comes “{t}”, one of the fifteen ikhfa letters, so the rule is ikhfa.'),
    watch: T('لا تُظهر النون ولا تُدغمها: اتركها مخفاة بغنّة.', 'Do not clarify the noon or merge it: leave it hidden with ghunna.'),
    vs: [
      { with: 'noon_izhar', tip: T('الإظهار قبل حروف الحلق الستة فقط، ويكون بلا غنّة مطوّلة؛ الإخفاء قبل خمسة عشر حرفًا ومعه غنّة.', 'Izhar is only before the six throat letters and has no stretched ghunna; ikhfa is before fifteen letters and keeps ghunna.') },
      { with: 'noon_iqlab', tip: T('الإقلاب للباء وحدها، وتُقلب فيه النون ميمًا.', 'Iqlab is only for baa, and the noon turns into a meem.') }
    ],
    length: T('غنّة حركتان', 'ghunna for two harakat'),
    letters: { list: L_IKHFA, label: T('حروف الإخفاء الخمسة عشر', 'The fifteen ikhfa letters'), mnemonic: { ar: 'صِفْ ذَا ثَنَا كَمْ جَادَ شَخْصٌ قَدْ سَمَا ⸺ دُمْ طَيِّبًا زِدْ فِي تُقًى ضَعْ ظَالِمَا', en: 'Ṣif dhā thanā kam jāda shakhṣun qad samā — dum ṭayyiban zid fī tuqan ḍa‘ ẓālimā', note: T('أوائل كلمات البيت = حروف الإخفاء', 'The first letters of the words = the ikhfa letters'), src: 'tuhfa' } },
    poem: { ar: ['وَالرَّابِعُ الْإِخْفَاءُ عِنْدَ الْفَاضِلِ', 'مِنَ الْحُرُوفِ وَاجِبٌ لِلْفَاضِلِ', 'صِفْ ذَا ثَنَا كَمْ جَادَ شَخْصٌ قَدْ سَمَا', 'دُمْ طَيِّبًا زِدْ فِي تُقًى ضَعْ ظَالِمَا'], ref: T('تحفة الأطفال — الأبيات ١٤ و١٦', 'Tuhfat al-Atfal — verses 14 and 16'), src: 'tuhfa' },
    examples: [['79:37', 1, 2], ['78:34', 0, 1], ['79:44', 2, 2]]
  },

  // ───────────────────────── المرحلة ٤: لام «أل» ─────────────────────────
  lam_qamari: {
    id: 'lam_qamari', stage: 'lam', viz: 'lam_qamari',
    name: T('اللام القمرية', 'Lam Qamariyyah (moon lam)'),
    short: T('ٱلْ + حرف قمري', 'ٱلْ + moon letter'),
    tagline: T('اللام تظهر كالقمر', 'The lam shows like the moon'),
    def: T('لام «أل» التعريف نوعان؛ الأول إظهارها: أن تُنطق اللام واضحة إذا جاء بعدها أحد الحروف الأربعة عشر القمرية: ا ب غ ح ج ك و خ ف ع ق ي م ه. وفي المصحف تكون اللام ساكنة عليها سكون (ٱلْ).', 'The “al” lam has two cases; the first is clarity: the lam is pronounced clearly before one of the fourteen moon letters: ا ب غ ح ج ك و خ ف ع ق ي م ه. In the mushaf the lam carries a sukun (ٱلْ).'),
    kid: T('مثل «القمر» نفسه: اللام ظاهرة في الكلمة كما يظهر القمر في السماء. انطق «ال» ثم الحرف.', 'Just like the word “al-qamar”: the lam is visible as the moon is visible. Say “al” and then the letter.'),
    how: [
      T('ابحث عن «ٱل» في أول الكلمة.', 'Find “ٱل” at the start of a word.'),
      T('انظر الحرف بعد اللام: هل هو من ا ب غ ح ج ك و خ ف ع ق ي م ه؟', 'Look at the letter after the lam: is it one of ا ب غ ح ج ك و خ ف ع ق ي م ه?'),
      T('إن كان كذلك انطق اللام واضحة (وعليها سكون في المصحف).', 'If so, pronounce the lam clearly (it carries a sukun in the mushaf).')
    ],
    needs: T('أحد الحروف القمرية (ا ب غ ح ج ك و خ ف ع ق ي م ه) بعد لام «ال»', 'one of the moon letters (ا ب غ ح ج ك و خ ف ع ق ي م ه) after the “al” lam'),
    find: T('ابحث عن كلمة تبدأ بـ«ٱلْ» وبعد اللام حرف قمري.', 'Find a word starting with “ٱلْ” followed by a moon letter.'),
    why: T('بعد لام «ال» جاء الحرف «{t}» وهو من الحروف القمرية الأربعة عشر، فاللام تُنطق ظاهرة.', 'After the “al” lam comes “{t}”, one of the fourteen moon letters, so the lam is pronounced.'),
    watch: T('لا تُسقط اللام ولا تشدّد الحرف بعدها في هذه الحالة.', 'Do not drop the lam and do not double the letter after it in this case.'),
    vs: [{ with: 'lam_shamsi', tip: T('القمرية: اللام تُنطق، وعليها سكون. الشمسية: اللام لا تُنطق، والحرف بعدها مشدّد.', 'Moon: the lam is pronounced and has a sukun. Sun: the lam is silent and the next letter is doubled.') }],
    length: T('بلا مدّ', 'no stretch'),
    letters: { list: L_QAMARI, label: T('الحروف القمرية (١٤)', 'The 14 moon letters'), mnemonic: { ar: 'إِبْغِ حَجَّكَ وَخَفْ عَقِيمَهْ', en: 'Ibghi ḥajjaka wa-khaf ‘aqīmah', note: T('أوائل كلماتها هي الحروف القمرية (الألف، ب، غ، ح، ج، ك، و، خ، ف، ع، ق، ي، م، ه)', 'Its letters give the moon letters'), src: 'tuhfa' } },
    poem: { ar: ['قَبْلَ أَرْبَعٍ مَعْ عَشْرَةٍ خُذْ عِلْمَهُ', 'مِنْ إِبْغِ حَجَّكَ وَخَفْ عَقِيمَهْ'], ref: T('تحفة الأطفال — البيت ٢٥', 'Tuhfat al-Atfal — verse 25'), src: 'tuhfa' },
    examples: [['78:7', 0, 0], ['79:5', 0, 0], ['78:17', 2, 2]]
  },

  lam_shamsi: {
    id: 'lam_shamsi', stage: 'lam', viz: 'lam_shamsi',
    name: T('اللام الشمسية', 'Lam Shamsiyyah (sun lam)'),
    short: T('ٱل + حرف شمسي', 'ٱل + sun letter'),
    tagline: T('اللام تختفي كالشمس', 'The lam hides like the sun'),
    def: T('الحال الثانية للام «أل»: إدغامها في الحرف الذي بعدها إذا كان من الحروف الأربعة عشر الشمسية: ط ث ص ر ت ض ذ ن د س ظ ز ش ل. فلا تُنطق اللام ويُنطق الحرف بعدها مشدّدًا (وعليه شدّة في المصحف).', 'The second case of the “al” lam: it merges into the letter after it when that letter is one of the fourteen sun letters: ط ث ص ر ت ض ذ ن د س ظ ز ش ل. The lam is not pronounced and the next letter is doubled (it carries a shadda in the mushaf).'),
    kid: T('كما تُخفي الشمس ما حولها: اللام تختفي، والحرف بعدها يقوى بشدّة. فنقول «اشّمس» لا «ال-شمس».', 'Like the sun hiding what is near it: the lam disappears and the next letter grows strong with a shadda. We say “ash-shams”, not “al-shams”.'),
    how: [
      T('ابحث عن «ٱل» في أول الكلمة.', 'Find “ٱل” at the start of a word.'),
      T('انظر الحرف بعد اللام: هل عليه شدّة وهو من الحروف الشمسية؟', 'Look at the letter after the lam: does it carry a shadda and is it a sun letter?'),
      T('لا تنطق اللام، وشدّد الحرف الذي بعدها.', 'Do not pronounce the lam; double the letter after it.')
    ],
    needs: T('أحد الحروف الشمسية (ط ث ص ر ت ض ذ ن د س ظ ز ش ل) بعد لام «ال»', 'one of the sun letters (ط ث ص ر ت ض ذ ن د س ظ ز ش ل) after the “al” lam'),
    find: T('ابحث عن كلمة تبدأ بـ«ٱل» وبعد اللام حرف شمسي عليه شدّة.', 'Find a word starting with “ٱل” followed by a sun letter carrying a shadda.'),
    why: T('بعد لام «ال» جاء الحرف «{t}» وهو من الحروف الشمسية، فتُدغم اللام فيه ولا تُنطق.', 'After the “al” lam comes “{t}”, one of the sun letters, so the lam merges into it and is not pronounced.'),
    watch: T('لا تنطق اللام، وتأكد من تشديد الحرف التالي.', 'Do not pronounce the lam, and make sure the next letter is doubled.'),
    vs: [{ with: 'lam_qamari', tip: T('الشمسية: بلا نطق للام + شدّة على ما بعدها. القمرية: اللام تُنطق + سكون عليها.', 'Sun: no lam sound + a shadda on the next letter. Moon: the lam is heard + a sukun on it.') }],
    length: T('بلا مدّ', 'no stretch'),
    letters: { list: L_SHAMSI, label: T('الحروف الشمسية (١٤)', 'The 14 sun letters'), mnemonic: { ar: 'طِبْ ثُمَّ صِلْ رَحِمًا تَفُزْ ضِفْ ذَا نِعَمْ ⸺ دَعْ سُوءَ ظَنٍّ زُرْ شَرِيفًا لِلْكَرَمْ', en: 'Ṭib thumma ṣil raḥiman tafuz ḍif dhā ni‘am — da‘ sū’a ẓannin zur sharīfan lil-karam', note: T('أوائل كلماتها هي الحروف الشمسية', 'Its first letters give the sun letters'), src: 'tuhfa' } },
    poem: { ar: ['ثَانِيهِمَا إِدْغَامُهَا فِي أَرْبَعِ', 'وَعَشْرَةٍ أَيْضًا وَرَمْزُهَا فَعِ', 'طِبْ ثُمَّ صِلْ رَحِمًا تَفُزْ ضِفْ ذَا نِعَمْ', 'دَعْ سُوءَ ظَنٍّ زُرْ شَرِيفًا لِلْكَرَمْ'], ref: T('تحفة الأطفال — الأبيات ٢٦–٢٧', 'Tuhfat al-Atfal — verses 26–27'), src: 'tuhfa' },
    examples: [['91:1', 0, 0], ['1:4', 2, 2], ['79:7', 1, 1]]
  },

  // ───────────────────────── المرحلة ٥: المدود ─────────────────────────
  madd_tabii: {
    id: 'madd_tabii', stage: 'madd', viz: 'madd_tabii',
    name: T('المد الطبيعي', 'Madd Tabi‘i (natural elongation)'),
    short: T('ا و ي = ٢ حركة', 'ا و ي = 2 counts'),
    tagline: T('مدّ بمقدار حركتين', 'Stretch for two counts'),
    def: T('المد الطبيعي (الأصلي): ما لا يتوقف على سبب من همز أو سكون، ولا تُوجد حروفه (ا و ي) دونه. فهو مدّ حرف المدّ: الألف بعد فتح، والواو الساكنة بعد ضمّ، والياء الساكنة بعد كسر، بمقدار حركتين.', 'Natural (original) madd: the one that does not depend on a cause such as a hamza or a sukun. It is the lengthening of a madd letter: alif after a fatha, a silent waw after a damma, a silent yaa after a kasra — for two counts.'),
    kid: T('الحركة تساوي قبض إصبع وبسطه. امدد الصوت إلى أن تعدّ حركتين (إصبعان)، لا أقل ولا أكثر.', 'One count is the time to close and open a finger. Stretch the sound for two counts (two fingers), no less and no more.'),
    how: [
      T('ابحث عن حرف مدّ: ألف بعد فتحة، أو واو بعد ضمّة، أو ياء بعد كسرة.', 'Find a madd letter: an alif after a fatha, a waw after a damma, or a yaa after a kasra.'),
      T('تأكد أنه لا همزة بعده ولا سكون ولا شدّة.', 'Make sure no hamza, sukun or shadda follows it.'),
      T('امدده حركتين.', 'Stretch it for two counts.')
    ],
    needs: T('حرف مدّ (ا/و/ي) بعده حرف متحرّك غير مهموز', 'a madd letter (ا/و/ي) followed by a moving, non-hamza letter'),
    find: T('اضغط على حرف المدّ في الكلمة (الألف أو الواو أو الياء الممدودة).', 'Tap the madd letter in the word (the stretched alif, waw or yaa).'),
    why: T('الحرف «{t}» حرف مدّ، وبعده حرف متحرّك ليس همزة ولا ساكنًا، فهو مدّ طبيعي: حركتان.', 'The letter “{t}” is a madd letter followed by a moving letter that is not a hamza or sakin, so it is natural madd: two counts.'),
    watch: T('لا تزد على حركتين إن لم يوجد سبب للزيادة (همز أو سكون).', 'Do not go beyond two counts when there is no cause (hamza or sukun).'),
    vs: [
      { with: 'madd_muttasil', tip: T('إن جاءت همزة بعد حرف المدّ في الكلمة نفسها فهو المد المتصل (٤–٥ حركات).', 'If a hamza follows the madd letter in the same word, it is the connected madd (4–5 counts).') },
      { with: 'madd_munfasil', tip: T('إن كان المدّ في آخر كلمة والهمزة في أول التي بعدها فهو المنفصل.', 'If the madd ends one word and the hamza starts the next, it is the separated madd.') }
    ],
    length: T('حركتان', 'two counts'),
    letters: { list: ['ا', 'و', 'ي'], label: T('حروف المدّ', 'The madd letters') },
    poem: { ar: ['وَالْمَدُّ أَصْلِيٌّ وَفَرْعِيٌّ لَهُ', 'وَسَمِّ أَوَّلًا طَبِيعِيًّا وَهُوْ', 'مَا لَا تَوَقُّفٌ لَهُ عَلَى سَبَبْ', 'وَلَا بِدُونِهِ الْحُرُوفُ تُجْتَلَبْ'], ref: T('تحفة الأطفال — الأبيات ٣٥–٣٦', 'Tuhfat al-Atfal — verses 35–36'), src: 'tuhfa' },
    examples: [['114:2', 1, 1], ['109:6', 1, 1], ['78:4', 1, 1]]
  },

  madd_muttasil: {
    id: 'madd_muttasil', stage: 'madd', viz: 'madd_muttasil',
    name: T('المد الواجب المتصل', 'Madd Muttasil (connected, obligatory)'),
    short: T('مدّ + همزة في كلمة', 'madd + hamza, one word'),
    tagline: T('همزة بعد المدّ في الكلمة نفسها', 'A hamza right after the madd, same word'),
    def: T('المد المتصل: أن يأتي بعد حرف المدّ همزة في الكلمة نفسها، مثل «جَآءَ». وهو واجب (لا يجوز قصره)، ويُمدّ أربع أو خمس حركات.', 'Connected madd: a hamza comes after a madd letter in the same word, like “jā’a”. It is obligatory (it cannot be shortened) and is stretched four or five counts.'),
    kid: T('المدّ والهمزة «متّصلان» في كلمة واحدة، فنمدّ أكثر: كأن الصوت يركض نحو الهمزة. عُدّ أربع حركات أو خمسًا.', 'The madd and the hamza are “connected” in one word, so we stretch longer: the sound runs toward the hamza. Count four or five.'),
    how: [
      T('ابحث عن حرف مدّ (ا و ي).', 'Find a madd letter (ا و ي).'),
      T('هل بعده همزة في الكلمة نفسها؟ (وفوقه علامة مدّ ۤ).', 'Does a hamza follow in the same word? (With a madd sign ۤ above.)'),
      T('امدده أربع أو خمس حركات بالتساوي.', 'Stretch it four or five counts, evenly.')
    ],
    needs: T('همزة بعد حرف المدّ في الكلمة نفسها', 'a hamza after the madd letter in the same word'),
    find: T('ابحث عن كلمة فيها حرف مدّ تليه همزة في الكلمة نفسها.', 'Find a word with a madd letter followed by a hamza in the same word.'),
    why: T('في هذه الكلمة حرف مدّ تليه همزة «{t}» في الكلمة نفسها، فهو مدّ متصل.', 'This word has a madd letter followed by a hamza “{t}” in the same word, so it is connected madd.'),
    watch: T('لا تقصر المد المتصل، وحافظ على المقدار نفسه في كل المواضع. (المقدار ٤ أو ٥ بحسب ما يقرأ به معلمك.)', 'Do not shorten connected madd and keep the same length every time. (Four or five counts, according to your teacher’s recitation.)'),
    vs: [
      { with: 'madd_munfasil', tip: T('المتصل: الهمزة في الكلمة نفسها. المنفصل: الهمزة في أول الكلمة التي بعدها.', 'Connected: the hamza is in the same word. Separated: the hamza begins the next word.') },
      { with: 'madd_tabii', tip: T('الطبيعي بلا همزة ولا سكون بعد المدّ ويكون حركتين.', 'Natural has no hamza or sukun after the madd and is two counts.') }
    ],
    length: T('٤ أو ٥ حركات', '4 or 5 counts'),
    letters: { list: [], label: T('السبب: همزة بعد حرف المدّ في كلمة واحدة', 'The cause: a hamza after the madd letter in one word') },
    review: 'مقدار المد (٤ أو ٥) يعتمده المعلم بحسب طريق القراءة',
    poem: { ar: ['فَوَاجِبٌ إِنْ جَاءَ هَمْزٌ بَعْدَ مَدّ', 'فِي كِلْمَةٍ وَذَا بِمُتَّصِلْ يُعَدّ'], ref: T('تحفة الأطفال — البيت ٤٣', 'Tuhfat al-Atfal — verse 43'), src: 'tuhfa' },
    examples: [['110:1', 1, 1], ['82:1', 1, 1], ['80:42', 0, 0]]
  },

  madd_munfasil: {
    id: 'madd_munfasil', stage: 'madd', viz: 'madd_munfasil',
    name: T('المد الجائز المنفصل', 'Madd Munfasil (separated, permissible)'),
    short: T('مدّ | همزة في كلمة تالية', 'madd | hamza, next word'),
    tagline: T('المدّ في كلمة والهمزة في التي بعدها', 'Madd in one word, hamza in the next'),
    def: T('المد المنفصل: أن يأتي حرف المدّ في آخر كلمة وتأتي الهمزة في أول الكلمة التي بعدها، مثل «إِنَّا أَعْطَيْنَاكَ». وهو جائز، ويُمدّ أربع أو خمس حركات في الوصل.', 'Separated madd: a madd letter ends one word and a hamza begins the next, like “innā a‘ṭaynāka”. It is permissible, and in continuous reading it is stretched four or five counts.'),
    kid: T('المدّ والهمزة «منفصلان» في كلمتين. قف بذهنك بينهما وامدد أربع أو خمس حركات ثم انطق الهمزة.', 'The madd and the hamza are “separated” in two words. Pause in your mind between them, stretch four or five counts, then say the hamza.'),
    how: [
      T('ابحث عن حرف مدّ في آخر كلمة (وفوقه علامة مدّ ۤ).', 'Find a madd letter at the end of a word (with a madd sign ۤ above).'),
      T('هل أول الكلمة التالية همزة؟', 'Does the next word begin with a hamza?'),
      T('امدد أربع أو خمس حركات ثم انطق الهمزة.', 'Stretch four or five counts, then say the hamza.')
    ],
    needs: T('همزة في أول الكلمة التي تلي كلمة تنتهي بحرف مدّ', 'a hamza starting the word after a word that ends with a madd letter'),
    find: T('ابحث عن كلمة تنتهي بحرف مدّ وبعدها كلمة تبدأ بهمزة.', 'Find a word ending with a madd letter followed by a word starting with a hamza.'),
    why: T('كلمة تنتهي بحرف مدّ، وبعدها كلمة تبدأ بهمزة «{t}»، فهو مدّ منفصل.', 'A word ends with a madd letter and the next word begins with a hamza “{t}”, so it is separated madd.'),
    watch: T('لا تجعل المدّ المنفصل أقصر من المتصل في القراءة الواحدة؛ اتبع الطريقة التي يقرأ بها معلمك.', 'Do not make separated madd shorter than connected madd within one reading; follow the way your teacher recites.'),
    vs: [{ with: 'madd_muttasil', tip: T('المنفصل بين كلمتين (جائز)، والمتصل داخل كلمة واحدة (واجب).', 'Separated is across two words (permissible); connected is inside one word (obligatory).') }],
    length: T('٤ أو ٥ حركات في الوصل', '4 or 5 counts when continuing'),
    letters: { list: [], label: T('السبب: همزة في أول الكلمة التالية', 'The cause: a hamza starting the next word') },
    review: 'جواز القصر (حركتان) وتحديد المقدار يعتمده المعلم بحسب طريق القراءة',
    poem: { ar: ['وَجَائِزٌ مَدٌّ وَقَصْرٌ إِنْ فُصِلْ', 'كُلٌّ بِكِلْمَةٍ وَهَذَا الْمُنْفَصِلْ'], ref: T('تحفة الأطفال — البيت ٤٤', 'Tuhfat al-Atfal — verse 44'), src: 'tuhfa' },
    examples: [['108:1', 0, 1], ['82:17', 0, 1], ['81:15', 0, 1]]
  },

  // ───────────────────────── المثلان والمتجانسان والمتقاربان ─────────────────────────
  mithlain: {
    id: 'mithlain', stage: 'idgham', viz: 'mithlain',
    name: T('إدغام المثلين', 'Idgham of Identical Letters (Mithlayn)'), short: T('لْ لّ', 'لْ لّ'),
    tagline: T('حرفان توأمان يصيران حرفًا واحدًا', 'Twin letters become one'),
    def: T('المثلان: حرفان اتّفقا مخرجًا وصفةً (نفس الحرف)، فإذا سكن الأول وتحرّك الثاني أُدغم الأول في الثاني وصارا حرفًا واحدًا مشدّدًا، ويسمّى «المثلين الصغير».', 'Mithlayn: two letters identical in articulation and qualities (the same letter). When the first is silent and the second is voweled, the first merges into the second and they become one doubled letter — the “small mithlayn”.'),
    kid: T('حرفان توأمان: الأول ساكن والثاني متحرّك. لا تقرأ الأول وحده، بل اضغط على الثاني ضغطة واحدة قوية كأنهما حرف واحد.', 'Two twin letters: the first silent, the second moving. Do not read the first on its own; press the second once, strongly, as if they were one letter.'),
    how: [T('ابحث عن حرف ساكن في آخر كلمة.', 'Find a silent letter at the end of a word.'), T('هل أول الكلمة التالية الحرف نفسه وعليه شدّة؟', 'Does the next word begin with the same letter, carrying a shadda?'), T('اقرأهما حرفًا واحدًا مشدّدًا.', 'Read them as one doubled letter.')],
    needs: T('حرف ساكن بعده الحرف نفسه متحرّكًا', 'a silent letter followed by the same letter, voweled'),
    find: T('ابحث عن حرف في آخر كلمة، وأول الكلمة التالية هو الحرف نفسه مشدّدًا.', 'Find a letter ending a word where the next word starts with the same letter, doubled.'),
    why: T('الحرف «{t}» ساكن وبعده «{t}» مثله متحرّك، فهما مثلان يُدغمان.', 'The letter “{t}” is silent and followed by another “{t}”, voweled: identical letters that merge.'),
    watch: T('لا تقطع بين الحرفين ولا تُظهر الأول. وإدغام الميم في الميم والنون في النون سبق في دروسهما.', 'Do not separate the two letters or pronounce the first one. Meem-into-meem and noon-into-noon were covered in their own lessons.'),
    vs: [{ with: 'mutajanisain', tip: T('المثلان: الحرف نفسه. المتجانسان: حرفان مختلفان من مخرج واحد.', 'Mithlayn: the same letter. Mutajanisayn: two different letters from one articulation point.') }, { with: 'mutaqaribain', tip: T('المتقاربان: حرفان مختلفان مخرجاهما متقاربان (مثل اللام والراء).', 'Mutaqaribayn: two different letters with nearby articulation points (like lam and raa).') }],
    length: T('حرف واحد مشدّد', 'one doubled letter'),
    letters: { list: [], label: T('أي حرفين متماثلين', 'any two identical letters') },
    poem: { ar: ['إِنْ فِي الصِّفَاتِ وَالْمَخَارِجِ اتَّفَقْ', 'حَرْفَانِ فَالْمِثْلَانِ فِيهِمَا أَحَقّْ'], ref: T('تحفة الأطفال — البيت ٣٠', 'Tuhfat al-Atfal — verse 30'), src: 'tuhfa' },
    examples: [['90:8', 1, 2], ['20:29', 0, 1], ['79:18', 1, 2]]
  },
  mutajanisain: {
    id: 'mutajanisain', stage: 'idgham', viz: 'mutajanisain',
    name: T('إدغام المتجانسين', 'Idgham of Related Letters (Mutajanisayn)'), short: T('دْ تّ', 'دْ تّ'),
    tagline: T('حرفان من بيت واحد بثوبين مختلفين', 'Two letters from one house, in different clothes'),
    def: T('المتجانسان: حرفان اتّفقا مخرجًا واختلفا صفةً، كالدال والتاء، والتاء والطاء، والذال والظاء، والثاء والذال، والباء والميم. فإذا سكن الأول أُدغم في الثاني.', 'Mutajanisayn: two letters sharing an articulation point but differing in qualities — dal and taa, taa and ṭaa, dhal and ẓaa, thaa and dhal, baa and meem. When the first is silent it merges into the second.'),
    kid: T('حرفان يسكنان في بيت واحد (يخرجان من المكان نفسه في الفم) لكن لكل منهما ثوب مختلف. إذا سكن الأول دخل في الثاني وصار الثاني مشدّدًا.', 'Two letters live in one house (they come from the same spot in the mouth) but each wears different clothes. When the first is silent it slips into the second, which becomes doubled.'),
    how: [T('ابحث عن حرف ساكن بلا علامة سكون، وبعده حرف مشدّد.', 'Find a silent letter with no sukun mark, followed by a doubled letter.'), T('هل هما من مخرج واحد (مثل د و ت)؟', 'Do they share an articulation point (like د and ت)?'), T('انطق الثاني مشدّدًا ولا تُظهر الأول.', 'Say the second one doubled and do not pronounce the first.')],
    needs: T('حرف ساكن بعده حرف من مخرجه نفسه', 'a silent letter followed by a letter from the same articulation point'),
    find: T('ابحث عن حرف بلا حركة ولا سكون، وبعده حرف مختلف عليه شدّة (مثل دتّ).', 'Find a letter with no vowel or sukun, followed by a different letter carrying a shadda (like دتّ).'),
    why: T('الحرف قبل «{t}» ساكن ومن مخرجه نفسه، فهما متجانسان يُدغم الأول في «{t}».', 'The letter before “{t}” is silent and shares its articulation point: related letters, the first merges into “{t}”.'),
    watch: T('في بعض الكلمات يبقى أثر الحرف الأول (مثل الطاء قبل التاء) فلا يكون الإدغام كاملًا؛ اسمعها من معلمك.', 'In some words a trace of the first letter remains (like ṭaa before taa), so the merge is incomplete — hear it from your teacher.'),
    vs: [{ with: 'mithlain', tip: T('المثلان: الحرف نفسه مرتين. المتجانسان: حرفان مختلفان من مخرج واحد.', 'Mithlayn: the same letter twice. Mutajanisayn: two different letters from one articulation point.') }, { with: 'mutaqaribain', tip: T('المتقاربان مخرجاهما متقاربان لا متّحدان.', 'Mutaqaribayn have nearby, not identical, articulation points.') }],
    length: T('حرف واحد مشدّد', 'one doubled letter'),
    letters: { list: ['د', 'ت', 'ط', 'ذ', 'ظ', 'ث', 'ب', 'م'], label: T('أزواجه: د ت · ت ط · ذ ظ · ث ذ · ب م', 'Its pairs: د ت · ت ط · ذ ظ · ث ذ · ب م') },
    poem: { ar: ['مُتَقَارِبَيْنِ أَوْ يَكُونَا اتَّفَقَا', 'فِي مَخْرَجٍ دُونَ الصِّفَاتِ حُقِّقَا', 'بِالْمُتَجَانِسَيْنِ ثُمَّ إِنْ سَكَنْ', 'أَوَّلُ كُلٍّ فَالصَّغِيرَ سَمِّيَنْ'], ref: T('تحفة الأطفال — البيتان ٣٢ و٣٣', 'Tuhfat al-Atfal — verses 32–33'), src: 'tuhfa' },
    examples: [['109:4', 4, 4], ['74:14', 0, 0], ['37:56', 3, 3]]
  },
  mutaqaribain: {
    id: 'mutaqaribain', stage: 'idgham', viz: 'mutaqaribain',
    name: T('إدغام المتقاربين', 'Idgham of Neighbouring Letters (Mutaqaribayn)'), short: T('لْ رّ', 'لْ رّ'),
    tagline: T('جاران متقاربان يتعانقان', 'Two close neighbours embrace'),
    def: T('المتقاربان: حرفان تقاربا مخرجًا وصفةً، كاللام والراء، والقاف والكاف. فإذا سكن الأول أُدغم في الثاني.', 'Mutaqaribayn: two letters with nearby articulation points and qualities — lam and raa, qaf and kaf. When the first is silent it merges into the second.'),
    kid: T('حرفان جاران يسكنان في بيتين متجاورين. إذا سكن الأول ذهب إلى جاره، فنقرأ الثاني مشدّدًا ولا نسمع الأول.', 'Two letters are neighbours in houses side by side. When the first is silent it goes over to its neighbour: we read the second doubled and do not hear the first.'),
    how: [T('ابحث عن لام ساكنة قبل راء، أو قاف ساكنة قبل كاف.', 'Find a silent lam before a raa, or a silent qaf before a kaf.'), T('انظر: الحرف الثاني عليه شدّة.', 'Look: the second letter carries a shadda.'), T('انطق الثاني مشدّدًا ولا تُظهر الأول.', 'Say the second doubled without pronouncing the first.')],
    needs: T('لام ساكنة قبل راء، أو قاف ساكنة قبل كاف', 'a silent lam before raa, or a silent qaf before kaf'),
    find: T('ابحث عن لام بلا حركة وبعدها راء مشدّدة، أو قاف بلا حركة وبعدها كاف مشدّدة.', 'Find a lam with no vowel followed by a doubled raa, or a qaf with no vowel followed by a doubled kaf.'),
    why: T('قبل «{t}» حرف ساكن من مخرج قريب منه، فهما متقاربان يُدغم الأول في «{t}».', 'Before “{t}” is a silent letter from a nearby articulation point: neighbouring letters, the first merges into “{t}”.'),
    watch: T('في «بل ران» سكتة في رواية حفص تمنع الإدغام، فتُقرأ اللام ظاهرة.', 'In «بل ران» Hafs makes a saktah that prevents the merge, so the lam is pronounced.'),
    vs: [{ with: 'mutajanisain', tip: T('المتجانسان مخرجهما واحد، والمتقاربان مخرجاهما متقاربان.', 'Mutajanisayn share one articulation point; mutaqaribayn are only close.') }, { with: 'noon_idgham_no_ghunna', tip: T('إدغام النون في اللام والراء حكم النون الساكنة، أما هنا فاللام أو القاف هي الساكنة.', 'Merging noon into lam/raa is a noon rule; here the silent letter is lam or qaf.') }],
    length: T('حرف واحد مشدّد', 'one doubled letter'),
    letters: { list: ['ل', 'ر', 'ق', 'ك'], label: T('زوجاه: ل ← ر · ق ← ك', 'Its pairs: ل → ر · ق → ك') },
    poem: { ar: ['وَإِنْ يَكُونَا مَخْرَجًا تَقَارَبَا', 'وَفِي الصِّفَاتِ اخْتَلَفَا يُلَقَّبَا', 'مُتَقَارِبَيْنِ…'], ref: T('تحفة الأطفال — البيتان ٣١ و٣٢', 'Tuhfat al-Atfal — verses 31–32'), src: 'tuhfa' },
    examples: [['77:20', 1, 1], ['23:93', 0, 1], ['4:158', 0, 1]]
  },

  // ───────────────────────── التفخيم والترقيق ─────────────────────────
  ra_tafkhim: {
    id: 'ra_tafkhim', stage: 'tafkhim', viz: 'ra_tafkhim',
    name: T('تفخيم الراء', 'Heavy Raa (Tafkhim)'), short: T('رَ رُ', 'رَ رُ'),
    tagline: T('راء مفتوحة أو مضمومة: صوت ممتلئ', 'Raa with fatha or damma: a full sound'),
    def: T('التفخيم: تسمين صوت الحرف حتى يمتلئ الفم بصداه. وتُفخَّم الراء إذا كانت مفتوحة أو مضمومة (وفي أحوال أخرى للراء الساكنة يشرحها المعلم).', 'Tafkhim is making a letter’s sound heavy so its echo fills the mouth. The raa is heavy when it carries a fatha or a damma (other cases of the silent raa are explained by the teacher).'),
    kid: T('الراء المفتوحة أو المضمومة راء «سمينة»: ارفع مؤخرة لسانك قليلًا ودع صوتها يملأ فمك كأنه صدى في كهف.', 'A raa with fatha or damma is a “chubby” raa: lift the back of your tongue a little and let its sound fill your mouth like an echo in a cave.'),
    how: [T('ابحث عن الراء وانظر إلى حركتها.', 'Find the raa and look at its vowel.'), T('فتحة أو ضمّة؟ إذن هي مفخّمة.', 'Fatha or damma? Then it is heavy.'), T('انطقها بصوت ممتلئ دون أن تحوّل الفتحة إلى ضمّة.', 'Say it with a full sound without turning the fatha into a damma.')],
    needs: T('راء عليها فتحة أو ضمّة', 'a raa with a fatha or a damma'),
    find: T('ابحث عن راء عليها فتحة أو ضمّة.', 'Find a raa with a fatha or damma.'),
    why: T('الحرف «{t}»: راء مفتوحة أو مضمومة، فتُفخَّم.', 'The letter “{t}” is a raa with fatha or damma, so it is heavy.'),
    watch: T('التفخيم ليس ضمًّا: لا تجعل «رَ» تُسمع «رُو». وحالات الراء الساكنة والوقف يعلّمك إياها المعلم.', 'Heaviness is not a damma: do not let “ra” sound like “ru”. The silent raa and stopping cases are taught by the teacher.'),
    vs: [{ with: 'ra_tarqiq', tip: T('المفتوحة والمضمومة سمينة، والمكسورة نحيفة.', 'Fatha and damma make it heavy; kasra makes it light.') }],
    length: T('حرف واحد بصوت ممتلئ', 'one letter with a full sound'),
    letters: { list: ['ر'], label: T('الحرف: الراء', 'The letter: raa') },
    poem: { ar: ['وَرَقِّقِ الرَّاءَ إِذَا مَا كُسِرَتْ', 'كَذَاكَ بَعْدَ الْكَسْرِ حَيْثُ سَكَنَتْ'], ref: T('المقدمة الجزرية — باب الراءات', 'al-Muqaddima al-Jazariyya — on the raa'), src: 'jazariyya', review: 'البيت مكتوب من الحفظ ولم يُطابَق مع نسخة مطبوعة؛ يلزم تحقق المعلم' },
    examples: [['1:3', 0, 0], ['78:33', 1, 1], ['82:11', 0, 0]]
  },
  ra_tarqiq: {
    id: 'ra_tarqiq', stage: 'tafkhim', viz: 'ra_tarqiq',
    name: T('ترقيق الراء', 'Light Raa (Tarqiq)'), short: T('رِ', 'رِ'),
    tagline: T('راء مكسورة: صوت نحيف', 'Raa with kasra: a thin sound'),
    def: T('الترقيق: تنحيف صوت الحرف فلا يمتلئ الفم بصداه. وتُرقَّق الراء إذا كانت مكسورة (وكذلك إذا سكنت بعد كسر في أحوال يشرحها المعلم).', 'Tarqiq is making a letter’s sound thin so it does not fill the mouth. The raa is light when it carries a kasra (and when silent after a kasra in cases the teacher explains).'),
    kid: T('الراء المكسورة راء «نحيفة»: ابتسم قليلًا وانطقها خفيفة رقيقة كأنك تهمس بها.', 'A raa with kasra is a “thin” raa: smile a little and say it lightly and gently, as if whispering it.'),
    how: [T('ابحث عن الراء وانظر إلى حركتها.', 'Find the raa and look at its vowel.'), T('كسرة تحتها؟ إذن هي مرقّقة.', 'A kasra under it? Then it is light.'), T('انطقها خفيفة دون أن تُفخّمها.', 'Say it lightly, not heavy.')],
    needs: T('راء تحتها كسرة', 'a raa with a kasra'),
    find: T('ابحث عن راء تحتها كسرة.', 'Find a raa with a kasra under it.'),
    why: T('الحرف «{t}»: راء مكسورة، فتُرقَّق.', 'The letter “{t}” is a raa with kasra, so it is light.'),
    watch: T('لا تُفخّم الراء المكسورة بسبب حرف ثقيل قبلها؛ الكسرة تجعلها رقيقة دائمًا.', 'Do not make a raa with kasra heavy because of a heavy letter before it; the kasra always makes it light.'),
    vs: [{ with: 'ra_tafkhim', tip: T('المكسورة نحيفة، والمفتوحة والمضمومة سمينة.', 'Kasra makes it light; fatha and damma make it heavy.') }],
    length: T('حرف واحد بصوت رقيق', 'one letter with a light sound'),
    letters: { list: ['ر'], label: T('الحرف: الراء', 'The letter: raa') },
    poem: { ar: ['وَرَقِّقِ الرَّاءَ إِذَا مَا كُسِرَتْ', 'كَذَاكَ بَعْدَ الْكَسْرِ حَيْثُ سَكَنَتْ'], ref: T('المقدمة الجزرية — باب الراءات', 'al-Muqaddima al-Jazariyya — on the raa'), src: 'jazariyya', review: 'البيت مكتوب من الحفظ ولم يُطابَق مع نسخة مطبوعة؛ يلزم تحقق المعلم' },
    examples: [['101:1', 0, 0], ['86:1', 1, 1], ['95:2', 0, 0]]
  },
  lam_jalala_tafkhim: {
    id: 'lam_jalala_tafkhim', stage: 'tafkhim', viz: 'lam_jalala_tafkhim',
    name: T('تفخيم لام لفظ الجلالة', 'Heavy Lam in “Allah”'), short: T('ـَ ٱللَّه', 'ـَ ٱللَّه'),
    tagline: T('بعد فتح أو ضم: لام ممتلئة', 'After fatha or damma: a full lam'),
    def: T('تُفخَّم لام لفظ الجلالة «الله» إذا سبقتها فتحة أو ضمّة.', 'The lam of the word “Allah” is heavy when a fatha or damma comes before it.'),
    kid: T('إذا جاء قبل اسم الله فتحة أو ضمّة، نقول «الله» بلام ممتلئة عظيمة يملأ صوتها الفم.', 'When a fatha or damma comes before the name of Allah, we say “Allah” with a full, majestic lam that fills the mouth.'),
    how: [T('جد لفظ الجلالة «الله».', 'Find the word “Allah”.'), T('انظر إلى الحركة قبله مباشرة.', 'Look at the vowel just before it.'), T('فتحة أو ضمّة؟ فخّم اللام.', 'Fatha or damma? Make the lam heavy.')],
    needs: T('فتحة أو ضمّة قبل لفظ الجلالة', 'a fatha or damma before the word “Allah”'),
    find: T('ابحث عن لفظ الجلالة وقبله فتحة أو ضمّة.', 'Find the word “Allah” with a fatha or damma before it.'),
    why: T('قبل لفظ الجلالة «{t}» بفتح أو ضم، فتُفخَّم لامه.', 'Before the word “Allah” comes “{t}” with fatha or damma, so its lam is heavy.'),
    watch: T('ننظر إلى الحرف الذي ننطقه قبل اللام فعلًا، لا إلى ألف الوصل التي تسقط في الوصل.', 'Look at the letter actually pronounced before the lam, not at the alif wasla that drops when joining.'),
    vs: [{ with: 'lam_jalala_tarqiq', tip: T('بعد الفتح والضم تُفخَّم، وبعد الكسر تُرقَّق.', 'Heavy after fatha and damma; light after kasra.') }],
    length: T('لام بصوت ممتلئ', 'a full-sounding lam'),
    letters: { list: ['ل'], label: T('الحرف: لام لفظ الجلالة', 'The letter: the lam of “Allah”') },
    poem: { ar: ['وَفَخِّمِ اللَّامَ مِنِ اسْمِ اللَّهِ', 'عَنْ فَتْحٍ اوْ ضَمٍّ كَعَبْدُ اللَّهِ'], ref: T('المقدمة الجزرية — باب اللامات', 'al-Muqaddima al-Jazariyya — on the lam'), src: 'jazariyya', review: 'البيت مكتوب من الحفظ ولم يُطابَق مع نسخة مطبوعة؛ يلزم تحقق المعلم' },
    examples: [['104:6', 1, 1], ['95:8', 1, 1], ['88:24', 1, 1]]
  },
  lam_jalala_tarqiq: {
    id: 'lam_jalala_tarqiq', stage: 'tafkhim', viz: 'lam_jalala_tarqiq',
    name: T('ترقيق لام لفظ الجلالة', 'Light Lam in “Allah”'), short: T('ـِ ٱللَّه', 'ـِ ٱللَّه'),
    tagline: T('بعد كسر: لام رقيقة', 'After kasra: a light lam'),
    def: T('تُرقَّق لام لفظ الجلالة «الله» إذا سبقتها كسرة.', 'The lam of the word “Allah” is light when a kasra comes before it.'),
    kid: T('إذا جاء قبل اسم الله كسرة، نقول «الله» بلام رقيقة خفيفة، كما في البسملة.', 'When a kasra comes before the name of Allah, we say “Allah” with a light, gentle lam — as in the basmala.'),
    how: [T('جد لفظ الجلالة «الله».', 'Find the word “Allah”.'), T('انظر إلى الحركة قبله مباشرة.', 'Look at the vowel just before it.'), T('كسرة؟ رقّق اللام.', 'Kasra? Make the lam light.')],
    needs: T('كسرة قبل لفظ الجلالة', 'a kasra before the word “Allah”'),
    find: T('ابحث عن لفظ الجلالة وقبله كسرة.', 'Find the word “Allah” with a kasra before it.'),
    why: T('قبل لفظ الجلالة «{t}» بكسر، فتُرقَّق لامه.', 'Before the word “Allah” comes “{t}” with kasra, so its lam is light.'),
    watch: T('في «لله» و«بالله» الكسرة على الحرف المتصل بالكلمة نفسها، فاللام رقيقة.', 'In «لله» and «بالله» the kasra is on the letter attached to the word itself, so the lam is light.'),
    vs: [{ with: 'lam_jalala_tafkhim', tip: T('بعد الكسر تُرقَّق، وبعد الفتح والضم تُفخَّم.', 'Light after kasra; heavy after fatha and damma.') }],
    length: T('لام بصوت رقيق', 'a light-sounding lam'),
    letters: { list: ['ل'], label: T('الحرف: لام لفظ الجلالة', 'The letter: the lam of “Allah”') },
    poem: { ar: ['وَفَخِّمِ اللَّامَ مِنِ اسْمِ اللَّهِ', 'عَنْ فَتْحٍ اوْ ضَمٍّ كَعَبْدُ اللَّهِ'], ref: T('المقدمة الجزرية — باب اللامات', 'al-Muqaddima al-Jazariyya — on the lam'), src: 'jazariyya', review: 'البيت مكتوب من الحفظ ولم يُطابَق مع نسخة مطبوعة؛ يلزم تحقق المعلم' },
    examples: [['1:1', 1, 1], ['110:2', 5, 5], ['85:8', 6, 6]]
  },

  // ───────────────────────── مدود أخرى ─────────────────────────
  madd_aridh: {
    id: 'madd_aridh', stage: 'madd2', viz: 'madd_aridh',
    name: T('المد العارض للسكون', 'Madd ʿArid (stop-caused)'), short: T('ـِينْ ۝', 'ـِينْ ۝'),
    tagline: T('نقف فيطول المد', 'We stop, and the madd grows'),
    def: T('المد العارض للسكون: أن يأتي بعد حرف المد حرف متحرّك في آخر الكلمة فنقف عليه بالسكون، فيجوز مدّه حركتين أو أربعًا أو ستًّا.', 'Madd ʿarid: a voweled letter after a madd letter at the end of a word, which we stop on with a sukun; it may be stretched two, four or six counts.'),
    kid: T('في آخر الآية نقف، فيسكن الحرف الأخير. فإن كان قبله حرف مد صار مدًّا عارضًا: نمدّه ٢ أو ٤ أو ٦ حركات، ونختار مقدارًا واحدًا في القراءة كلها.', 'At the end of an ayah we stop, so the last letter becomes silent. If a madd letter comes before it, it becomes madd ʿarid: we stretch it 2, 4 or 6 counts — choosing one length for the whole recitation.'),
    how: [T('في آخر الآية، انظر إلى الحرف قبل الأخير.', 'At the end of the ayah, look at the letter before the last.'), T('هل هو حرف مد؟', 'Is it a madd letter?'), T('قف على الأخير بالسكون وامدد ٢ أو ٤ أو ٦ حركات.', 'Stop on the last letter with a sukun and stretch 2, 4 or 6 counts.')],
    needs: T('حرف مد قبل الحرف الأخير الذي نقف عليه', 'a madd letter before the last letter we stop on'),
    find: T('ابحث في آخر الآية عن كلمة فيها حرف مد قبل آخر حرف.', 'At the end of the ayah, find a word with a madd letter before its last letter.'),
    why: T('قبل الحرف الأخير «{t}» حرف مد، ونقف على «{t}» بالسكون، فيصير المد عارضًا للسكون.', 'A madd letter comes before the last letter “{t}”, and we stop on “{t}” with a sukun, so the madd is ʿarid.'),
    watch: T('إذا وصلنا الآية بما بعدها زال السكون فرجع المد طبيعيًا حركتين. والتزم مقدارًا واحدًا في القراءة كلها.', 'If we join the ayah to the next, the sukun disappears and the madd returns to two natural counts. Keep one length throughout.'),
    vs: [{ with: 'madd_tabii', tip: T('الطبيعي حركتان دائمًا، والعارض عند الوقف فقط ويجوز فيه ٢ أو ٤ أو ٦.', 'Natural is always two counts; ʿarid happens only when stopping and may be 2, 4 or 6.') }, { with: 'madd_leen', tip: T('العارض قبله حرف مد، واللين قبله واو أو ياء ساكنة بعد فتح.', 'ʿArid has a madd letter; leen has a silent waw or yaa after a fatha.') }],
    length: T('٢ أو ٤ أو ٦ حركات عند الوقف', '2, 4 or 6 counts when stopping'),
    letters: { list: [], label: T('السبب: الوقف بالسكون بعد حرف مد', 'The cause: stopping with sukun after a madd letter') },
    poem: { ar: ['وَمِثْلُ ذَا إِنْ عَرَضَ السُّكُونُ', 'وَقْفًا كَتَعْلَمُونَ نَسْتَعِينُ'], ref: T('تحفة الأطفال — البيت ٤٥', 'Tuhfat al-Atfal — verse 45'), src: 'tuhfa' },
    examples: [['1:3', 1, 1], ['78:1', 1, 1], ['81:26', 1, 1]]
  },
  madd_leen: {
    id: 'madd_leen', stage: 'madd2', viz: 'madd_leen',
    name: T('مد اللين', 'Madd Leen (soft)'), short: T('ـَيْـ ـَوْـ', 'ـَيْـ ـَوْـ'),
    tagline: T('واو أو ياء ساكنة بعد فتحة', 'A silent waw or yaa after a fatha'),
    def: T('حرفا اللين: الواو والياء الساكنتان بعد فتحة. فإذا جاء بعدهما حرف نقف عليه بالسكون جاز مدّهما حركتين أو أربعًا أو ستًّا.', 'The soft letters are a silent waw or yaa after a fatha. When followed by a letter we stop on with a sukun, they may be stretched two, four or six counts.'),
    kid: T('واو أو ياء ساكنة قبلها فتحة: صوت ناعم ليّن. إذا وقفنا على الحرف الذي بعدها مددناها مدًّا لطيفًا.', 'A silent waw or yaa with a fatha before it: a soft, gentle sound. When we stop on the letter after it we stretch it gently.'),
    how: [T('ابحث عن واو أو ياء ساكنة قبلها فتحة.', 'Find a silent waw or yaa with a fatha before it.'), T('هل نقف على الحرف الذي بعدها؟', 'Do we stop on the letter after it?'), T('امدد مدًّا لطيفًا (٢ أو ٤ أو ٦).', 'Stretch gently (2, 4 or 6).')],
    needs: T('واو أو ياء ساكنة بعد فتح، ثم حرف نقف عليه', 'a silent waw or yaa after a fatha, then a letter we stop on'),
    find: T('ابحث في آخر الآية عن كلمة فيها ـَيْـ أو ـَوْـ قبل آخر حرف.', 'At the end of the ayah, find a word with ـَيْـ or ـَوْـ before its last letter.'),
    why: T('قبل «{t}» واو أو ياء ساكنة بعد فتح، ونقف على «{t}»، فهو مد لين.', 'Before “{t}” is a silent waw or yaa after a fatha, and we stop on “{t}”: madd leen.'),
    watch: T('في الوصل لا يُمدّ اللين، بل يُنطق قصيرًا.', 'When joining, leen is not stretched; it is said short.'),
    vs: [{ with: 'madd_aridh', tip: T('في العارض حرف مد حقيقي (ا و ي بحركة مناسبة)، وفي اللين واو أو ياء ساكنة بعد فتحة.', 'ʿArid has a true madd letter; leen has a silent waw or yaa after a fatha.') }],
    length: T('٢ أو ٤ أو ٦ حركات عند الوقف', '2, 4 or 6 counts when stopping'),
    letters: { list: ['و', 'ي'], label: T('حرفا اللين: و ي (ساكنتان بعد فتح)', 'The soft letters: و ي (silent, after fatha)') },
    poem: { ar: ['وَاللِّينُ مِنْهَا الْيَا وَوَاوٌ سُكِّنَا', 'إِنِ انْفِتَاحٌ قَبْلَ كُلٍّ أُعْلِنَا'], ref: T('تحفة الأطفال — البيت ٤١', 'Tuhfat al-Atfal — verse 41'), src: 'tuhfa' },
    examples: [['90:9', 1, 1], ['106:1', 1, 1], ['106:3', 3, 3]]
  },
  madd_badal: {
    id: 'madd_badal', stage: 'madd2', viz: 'madd_badal',
    name: T('مد البدل', 'Madd Badal'), short: T('ءَا', 'ءَا'),
    tagline: T('الهمزة قبل حرف المد', 'The hamza comes before the madd'),
    def: T('مد البدل: أن تتقدّم الهمزة على حرف المد في كلمة واحدة، ويُمدّ حركتين في رواية حفص.', 'Madd badal: the hamza comes before the madd letter in one word; in Hafs it is stretched two counts.'),
    kid: T('هنا الهمزة تسبق حرف المد كأنها تفتح له الباب. نمدّه حركتين فقط مثل المد الطبيعي.', 'Here the hamza goes before the madd letter, as if opening the door for it. We stretch it two counts only, like the natural madd.'),
    how: [T('ابحث عن همزة بعدها حرف مد.', 'Find a hamza followed by a madd letter.'), T('هل هما في كلمة واحدة؟', 'Are they in one word?'), T('امدد حركتين فقط.', 'Stretch two counts only.')],
    needs: T('همزة قبل حرف المد في كلمة واحدة', 'a hamza before the madd letter in one word'),
    find: T('ابحث عن كلمة فيها همزة بعدها حرف مد (مثل ءَا).', 'Find a word with a hamza followed by a madd letter (like ءَا).'),
    why: T('الهمزة «{t}» قبل حرف المد في الكلمة نفسها، فهو مد بدل.', 'The hamza “{t}” comes before the madd letter in the same word: madd badal.'),
    watch: T('لا تُطِل البدل كالمتصل: في المتصل الهمزة بعد المد، وفي البدل قبله.', 'Do not stretch badal like muttasil: in muttasil the hamza is after the madd, in badal before it.'),
    vs: [{ with: 'madd_muttasil', tip: T('المتصل: مد ثم همزة (٤–٥). البدل: همزة ثم مد (حركتان).', 'Muttasil: madd then hamza (4–5). Badal: hamza then madd (2).') }],
    length: T('حركتان', 'two counts'),
    letters: { list: [], label: T('السبب: همزة قبل حرف المد', 'The cause: a hamza before the madd letter') },
    poem: { ar: ['أَوْ قُدِّمَ الْهَمْزُ عَلَى الْمَدِّ وَذَا', 'بَدَلْ كَآمَنُوا وَإِيمَانًا خُذَا'], ref: T('تحفة الأطفال — البيت ٤٦', 'Tuhfat al-Atfal — verse 46'), src: 'tuhfa' },
    examples: [['78:22', 1, 1], ['106:1', 0, 0], ['96:7', 1, 1]]
  },
  madd_lazim: {
    id: 'madd_lazim', stage: 'madd2', viz: 'madd_lazim',
    name: T('المد اللازم', 'Madd Lazim (required, six counts)'), short: T('ـآدّ', 'ـآدّ'),
    tagline: T('أطول مد: ست حركات', 'The longest madd: six counts'),
    def: T('المد اللازم: أن يأتي بعد حرف المد سكون أصلي ثابت وصلًا ووقفًا (وأكثره حرف مشدّد)، فيُمدّ ست حركات لزومًا. وأقسامه أربعة: كلمي مثقّل ومخفّف، وحرفي مثقّل ومخفّف (في فواتح السور).', 'Madd lazim: a madd letter followed by an original sukun present both when joining and stopping (usually a doubled letter); it is stretched six counts. It has four kinds: word-based (doubled or not) and letter-based (in the opening letters of surahs).'),
    kid: T('هذا أطول مد في القرآن! حرف مد عليه علامة المدّ وبعده حرف مشدّد. نمدّه ست حركات: عدّ على ست أصابع 🖐️☝️.', 'The longest madd in the Qur’an! A madd letter with the madd sign, followed by a doubled letter. Stretch it six counts: count on six fingers 🖐️☝️.'),
    how: [T('ابحث عن حرف مد عليه علامة المدّ ۤ.', 'Find a madd letter with the madd sign ۤ.'), T('هل بعده حرف مشدّد أو ساكن في الكلمة نفسها؟', 'Is it followed by a doubled or silent letter in the same word?'), T('امدد ست حركات كاملة.', 'Stretch a full six counts.')],
    needs: T('حرف مد بعده سكون أصلي (غالبًا حرف مشدّد) في الكلمة نفسها', 'a madd letter followed by an original sukun (usually a doubled letter) in the same word'),
    find: T('ابحث عن مدّة ۤ بعدها حرف مشدّد في الكلمة نفسها.', 'Find a madd sign ۤ followed by a doubled letter in the same word.'),
    why: T('بعد حرف المد «{t}» مشدّد في الكلمة نفسها، فهو مد لازم ست حركات.', 'After the madd letter comes a doubled “{t}” in the same word: madd lazim, six counts.'),
    watch: T('لا تُنقص المد اللازم عن ست حركات أبدًا.', 'Never make madd lazim shorter than six counts.'),
    vs: [{ with: 'madd_muttasil', tip: T('المتصل: بعد المد همزة (٤–٥). اللازم: بعد المد سكون أو شدّة (٦).', 'Muttasil: a hamza after the madd (4–5). Lazim: a sukun or shadda after the madd (6).') }, { with: 'madd_aridh', tip: T('العارض سكونه بسبب الوقف فقط، واللازم سكونه ثابت دائمًا.', 'ʿArid’s sukun comes only from stopping; lazim’s sukun is always there.') }],
    length: T('ست حركات لزومًا', 'six counts, always'),
    letters: { list: [], label: T('السبب: سكون أصلي أو شدّة بعد حرف المد', 'The cause: an original sukun or shadda after the madd letter') },
    poem: { ar: ['وَلَازِمٌ إِنِ السُّكُونُ أُصِّلَا', 'وَصْلًا وَوَقْفًا بَعْدَ مَدٍّ طُوِّلَا'], ref: T('تحفة الأطفال — البيت ٤٧', 'Tuhfat al-Atfal — verse 47'), src: 'tuhfa' },
    examples: [['80:33', 2, 2], ['79:34', 2, 2], ['1:7', 8, 8]]
  }

};

// ترتيب المقارنة (للتمييز): من يُخلَط بمن؟ — يُستعمل لاختيار الخيارات الخاطئة المعقولة.
export const CONFUSABLES = {
  ghunna: ['qalqalah', 'noon_idgham_ghunna', 'madd_tabii'],
  qalqalah: ['ghunna', 'madd_tabii', 'noon_izhar'],
  meem_ikhfa: ['meem_idgham', 'meem_izhar', 'noon_iqlab'],
  meem_idgham: ['meem_ikhfa', 'meem_izhar', 'noon_idgham_ghunna'],
  meem_izhar: ['meem_ikhfa', 'meem_idgham', 'noon_izhar'],
  noon_izhar: ['noon_ikhfa', 'noon_idgham_ghunna', 'noon_iqlab'],
  noon_idgham_ghunna: ['noon_idgham_no_ghunna', 'noon_ikhfa', 'noon_izhar'],
  noon_idgham_no_ghunna: ['noon_idgham_ghunna', 'noon_ikhfa', 'noon_izhar'],
  noon_iqlab: ['noon_ikhfa', 'meem_ikhfa', 'noon_idgham_ghunna'],
  noon_ikhfa: ['noon_izhar', 'noon_iqlab', 'noon_idgham_ghunna'],
  lam_qamari: ['lam_shamsi', 'noon_izhar', 'madd_tabii'],
  lam_shamsi: ['lam_qamari', 'ghunna', 'noon_idgham_no_ghunna'],
  madd_tabii: ['madd_muttasil', 'madd_munfasil', 'ghunna'],
  madd_muttasil: ['madd_munfasil', 'madd_tabii', 'lam_qamari'],
  madd_munfasil: ['madd_muttasil', 'madd_tabii', 'lam_shamsi'],
  mithlain: ['mutajanisain', 'mutaqaribain', 'meem_idgham'],
  mutajanisain: ['mithlain', 'mutaqaribain', 'noon_ikhfa'],
  mutaqaribain: ['mutajanisain', 'mithlain', 'noon_idgham_no_ghunna'],
  ra_tafkhim: ['ra_tarqiq', 'lam_jalala_tafkhim', 'qalqalah'],
  ra_tarqiq: ['ra_tafkhim', 'lam_jalala_tarqiq', 'madd_tabii'],
  lam_jalala_tafkhim: ['lam_jalala_tarqiq', 'ra_tafkhim', 'lam_shamsi'],
  lam_jalala_tarqiq: ['lam_jalala_tafkhim', 'ra_tarqiq', 'lam_qamari'],
  madd_aridh: ['madd_tabii', 'madd_leen', 'madd_lazim'],
  madd_leen: ['madd_aridh', 'madd_tabii', 'madd_badal'],
  madd_badal: ['madd_muttasil', 'madd_tabii', 'madd_aridh'],
  madd_lazim: ['madd_muttasil', 'madd_aridh', 'ghunna']
};

export const stageOf = (ruleId) => STAGES.find(s => s.rules.includes(ruleId));
// أحكام تُشتق من الرسم وحده (الحركة) فلا تحتاج مصدرًا ثانيًا: المد الطبيعي، والراء المتحركة، ولام لفظ الجلالة
export const SINGLE_SOURCE = new Set(['madd_tabii', 'ra_tafkhim', 'ra_tarqiq', 'lam_jalala_tafkhim', 'lam_jalala_tarqiq']);
export const minSources = (ruleId) => (SINGLE_SOURCE.has(ruleId) ? 1 : 2);

// بيانات كل الدروس (أحكام التجويد + دروس المصحف) بحقول موحّدة: name, short, tagline
export const META = { ...RULES, ...MUSHAF, ...KNOW };
