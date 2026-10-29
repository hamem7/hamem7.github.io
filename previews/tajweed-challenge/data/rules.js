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
    ref: T('everyayah.com — قارئ: محمود خليل الحصري (مرتّل)، ملفات MP3 لكل آية. نمط الرابط: /data/Husary_128kbps/SSSAAA.mp3', 'everyayah.com — reciter: Mahmoud Khalil al-Husary (murattal), one MP3 per verse. URL pattern: /data/Husary_128kbps/SSSAAA.mp3'),
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
  { id: 'mushaf', hue: 'teal', icon: 'book', name: T('تعرّف على مصحفك', 'Know Your Mushaf'), blurb: T('أرقام الآيات، الجزء والحزب، الحركات والتنوين، الألف والهمزة، علامات الوقف والسكون والمدّ والسجدة', 'Ayah numbers, juz and hizb, vowel marks and tanween, alif and hamza, and the signs of stopping, sukun, madd and sajdah'), rules: ['mushaf_ayah_number', 'mushaf_juz_hizb', 'mushaf_harakat', 'mushaf_hamza', 'mushaf_waqf', 'mushaf_silent_sukun', 'mushaf_madd_letters', 'mushaf_special', 'mushaf_sin_saad', 'mushaf_sajda'] },
  { id: 'sounds', hue: 'violet', icon: 'wave', name: T('أصوات خاصة', 'Special Sounds'), blurb: T('الغنّة والقلقلة: صوتان يميّزان تلاوتك', 'Ghunna and Qalqalah: two sounds that colour your recitation'), rules: ['ghunna', 'qalqalah'] },
  { id: 'meem', hue: 'rose', icon: 'lips', name: T('الميم الساكنة', 'Meem Sakinah'), blurb: T('ثلاثة أحكام للميم الساكنة (مْ)', 'Three rulings for the silent meem (مْ)'), rules: ['meem_ikhfa', 'meem_idgham', 'meem_izhar'] },
  { id: 'noon', hue: 'emerald', icon: 'noon', name: T('النون الساكنة والتنوين', 'Noon Sakinah & Tanween'), blurb: T('خمس صور: إظهار، إدغام بغنة، إدغام بلا غنة، إقلاب، إخفاء', 'Five forms: izhar, idgham with/without ghunna, iqlab, ikhfa'), rules: ['noon_izhar', 'noon_idgham_ghunna', 'noon_idgham_no_ghunna', 'noon_iqlab', 'noon_ikhfa'] },
  { id: 'lam', hue: 'amber', icon: 'sun', name: T('لام «أل»', 'The Lam of “Al”'), blurb: T('قمرية تظهر وشمسية تختفي', 'Moon letters show, sun letters hide'), rules: ['lam_qamari', 'lam_shamsi'] },
  { id: 'madd', hue: 'sky', icon: 'madd', name: T('المدود', 'Maddat (Elongation)'), blurb: T('المد الطبيعي والمتصل والمنفصل', 'Natural, connected and separated elongation'), rules: ['madd_tabii', 'madd_muttasil', 'madd_munfasil'] }
];

export const RULES = {
  // ───────────────────────── المرحلة ١: أصوات خاصة ─────────────────────────
  ghunna: {
    id: 'ghunna', stage: 'sounds', viz: 'ghunna',
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
    id: 'qalqalah', stage: 'sounds', viz: 'qalqalah',
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
  madd_munfasil: ['madd_muttasil', 'madd_tabii', 'lam_shamsi']
};

export const stageOf = (ruleId) => STAGES.find(s => s.rules.includes(ruleId));

// بيانات كل الدروس (أحكام التجويد + دروس المصحف) بحقول موحّدة: name, short, tagline
export const META = { ...RULES, ...MUSHAF };
