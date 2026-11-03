// data/know.js — «دروس المعرفة»: دروس لا تُبنى أسئلتها من كاشف الأحكام بل من بنك أسئلة وقواعد ثابتة (js/know-engine.js):
// آداب التلاوة، سور القرآن وترتيبها، كيف أجد الآية، مخارج الحروف، صفات الحروف (للأطفال)، الوقف على أواخر الكلمات.
// ثنائي اللغة. لا نص قرآني مكتوب هنا: كلمات الآيات تُقرأ من data/pool.js، والحروف المفردة رموز تعليمية.
const T = (ar, en) => ({ ar, en });

export const KNOW = {
  mushaf_adab: {
    id: 'mushaf_adab', kind: 'know', stage: 'mushaf', art: 'adab',
    name: T('آداب التلاوة', 'Manners of Recitation'), short: T('🤲', '🤲'), tagline: T('كيف نستقبل كلام الله؟', 'How do we welcome the words of Allah?'),
    def: T('قبل أن نتعلّم أحكام التلاوة نتعلّم أدبها: الطهارة، والاستعاذة، والبسملة في أول السورة، والجلوس بأدب، والقراءة بتمهّل، والإنصات إذا قُرئ القرآن، ووضع المصحف في مكان طاهر مرتفع.', 'Before the rules of recitation we learn its manners: purity, seeking refuge, the basmala at the start of a surah, sitting respectfully, reading slowly, listening quietly when the Qur’an is recited, and keeping the mushaf in a clean, raised place.'),
    watch: T('هذه آداب تربوية بسيطة للأطفال؛ وتفصيل أحكامها الفقهية يرجع فيه إلى المعلم.', 'These are simple manners for children; their detailed rulings are for the teacher to explain.'),
    review: 'صياغة الآداب تربوية مبسّطة؛ حكم مسّ الصبي للمصحف وتفصيل الاستعاذة والبسملة يرجع فيه المعلم إلى مذهبه؛ أُضيفت أسئلة المستويين ٢ و٣ (الاستقبال، السواك، سجود التلاوة، قطع القراءة، التثاؤب، البدء من وسط السورة وأول التوبة) وتحتاج مراجعة معلّم'
  },
  mushaf_surahs: {
    id: 'mushaf_surahs', kind: 'know', stage: 'mushaf', art: 'shelf',
    name: T('سور القرآن وترتيبها', 'The Surahs and Their Order'), short: T('١١٤', '114'), tagline: T('من الفاتحة إلى الناس', 'From Al-Fatiha to An-Nas'),
    def: T('في القرآن ١١٤ سورة مرتّبة في المصحف: أولها الفاتحة وآخرها الناس. وجزء عمّ هو الجزء الأخير، يبدأ بسورة النبأ وينتهي بسورة الناس. أطول سورة البقرة، وأقصرها الكوثر.', 'The Qur’an has 114 surahs in a fixed order: the first is Al-Fatiha and the last An-Nas. Juz ʿAmma is the last juz, from An-Naba to An-Nas. The longest surah is Al-Baqarah and the shortest Al-Kawthar.'),
    watch: T('ترتيب السور في المصحف ثابت؛ وترتيب الحفظ عند الأطفال يبدأ غالبًا من آخر المصحف (جزء عمّ) لأن سوره قصيرة.', 'The order of surahs in the mushaf is fixed; children usually memorize from the end (Juz ʿAmma) because its surahs are short.')
  },
  mushaf_find: {
    id: 'mushaf_find', kind: 'know', stage: 'mushaf', art: 'find_steps',
    name: T('كيف أجد الآية؟', 'How Do I Find an Ayah?'), short: T('🔍', '🔍'), tagline: T('الجزء ← السورة ← رقم الآية', 'Juz → surah → ayah number'),
    def: T('لنجد آية في المصحف: نعرف جزءها، ثم نبحث عن سورتها (اسمها في أعلى الصفحة)، ثم نعدّ الآيات بأرقامها في نهاياتها حتى نصل إلى رقمها.', 'To find an ayah: know its juz, then look for its surah (the name is at the top of the page), then follow the numbers at the ends of the ayahs until you reach it.'),
    watch: T('الرقم في آخر الآية: فإذا أردت الآية الخامسة فهي التي تنتهي بالرقم ٥، لا التي تبدأ بعده.', 'The number is at the end of the ayah: ayah five is the one that ends with 5, not the one after it.')
  },
  know_makharij: {
    id: 'know_makharij', kind: 'know', stage: 'makharij', art: 'makharij',
    name: T('مخارج الحروف', 'Where Letters Come From'), short: T('حلق · لسان · شفتان', 'throat · tongue · lips'), tagline: T('خمسة أماكن يخرج منها الصوت', 'Five places sounds come from'),
    def: T('المخرج مكان خروج الحرف. والمخارج العامة خمسة: الجوف (حروف المد)، والحلق (ء هـ ع ح غ خ)، واللسان (أكثر الحروف: ١٨ حرفًا)، والشفتان (ف و ب م)، والخيشوم (الغنّة). وتتفرّع إلى سبعة عشر مخرجًا يشرحها المعلم.', 'The makhraj is where a letter comes out. There are five general areas: the jawf (madd letters), the throat (ء هـ ع ح غ خ), the tongue (most letters: 18), the lips (ف و ب م) and the nasal passage (ghunna). They branch into seventeen points, explained by the teacher.'),
    watch: T('الواو والياء: إذا كانتا حرفي مد خرجتا من الجوف، وإذا لم تكونا مدًّا فالواو من الشفتين والياء من اللسان.', 'Waw and yaa: as madd letters they come from the jawf; otherwise waw comes from the lips and yaa from the tongue.')
  },
  know_sifat: {
    id: 'know_sifat', kind: 'know', stage: 'makharij', art: 'sifat',
    name: T('صفات الحروف', 'Qualities of Letters'), short: T('فحثه شخص سكت', 'فحثه شخص سكت'), tagline: T('حروف تهمس، وحروف ثقيلة، وحروف تقفز', 'Letters that whisper, heavy letters, bouncing letters'),
    def: T('الصفة كيفيّة خروج الحرف. ونتعلّم هنا ثلاث مجموعات مشهورة: الهمس (يجري معه النفَس) وحروفه «فحثه شخص سكت»، والاستعلاء (يرتفع اللسان فيُفخَّم الحرف) وحروفه «خص ضغط قظ»، والقلقلة وحروفها «قطب جد».', 'A quality is how a letter comes out. Here we learn three famous groups: hams (breath flows with it) — «فحثه شخص سكت»; istiʿla’ (the tongue rises, so the letter is heavy) — «خص ضغط قظ»; and qalqalah — «قطب جد».'),
    watch: T('الحرف الواحد قد يكون في أكثر من مجموعة: فالخاء والصاد هامستان ومستعليتان، والطاء والقاف مستعليتان ومقلقلتان.', 'One letter can be in more than one group: khaa and saad whisper and are heavy; ṭaa and qaf are heavy and bounce.')
  },
  know_waqf: {
    id: 'know_waqf', kind: 'know', stage: 'waqf', art: 'waqf_end',
    name: T('كيف أقف على آخر الكلمة؟', 'How Do I Stop on a Word?'), short: T('ـْ · ـا · ـهْ', 'ـْ · ـا · ـهْ'), tagline: T('سكون، أو ألف، أو هاء', 'A sukun, an alif or a haa'),
    def: T('إذا وقفنا على كلمة سكّنّا آخرها (الإسكان). وتنوين الفتح نقف عليه بألف، والتاء المربوطة نقف عليها هاءً ساكنة، وما آخره حرف مد يبقى كما هو. وللمعلم: الرَّوم والإشمام وجهان آخران في الوقف يُتلقّيان بالسماع.', 'When we stop on a word we make its end silent (iskan). Fathatan becomes an alif, taa marbuta becomes a silent haa, and a word ending in a madd letter stays as it is. For the teacher: rawm and ishmam are two further stopping styles, learned by listening.'),
    watch: T('لا نقف بالحركة: لا نقول آخر الكلمة بضمّة أو كسرة عند الوقف.', 'We do not stop with a vowel: never say the last letter with a damma or kasra when stopping.')
  }
};

// المخارج العامة الخمسة (للأطفال) وصورها من «التجويد المصوّر»
export const AREAS = {
  jawf: { name: T('الجوف', 'The jawf (mouth & throat space)'), kid: T('الفراغ داخل الفم والحلق: منه حروف المد الثلاثة.', 'The empty space in the mouth and throat: the three madd letters come from it.'), letters: ['ا', 'و', 'ي'], book: 'p094_0' },
  halq: { name: T('الحلق', 'The throat'), kid: T('من أعماق الحلق: ء هـ ع ح غ خ.', 'From deep in the throat: ء هـ ع ح غ خ.'), letters: ['ء', 'ه', 'ع', 'ح', 'غ', 'خ'], book: 'p099_1' },
  lisan: { name: T('اللسان', 'The tongue'), kid: T('أكثر الحروف تخرج من اللسان: ١٨ حرفًا.', 'Most letters come from the tongue: 18 of them.'), letters: ['ق', 'ك', 'ج', 'ش', 'ي', 'ض', 'ل', 'ن', 'ر', 'ط', 'د', 'ت', 'ص', 'س', 'ز', 'ظ', 'ذ', 'ث'], book: 'p101_0' },
  shafatan: { name: T('الشفتان', 'The lips'), kid: T('من الشفتين: ف و ب م.', 'From the lips: ف و ب م.'), letters: ['ف', 'و', 'ب', 'م'], book: 'p121_0' },
  khayshum: { name: T('الخيشوم', 'The nasal passage'), kid: T('من الأنف: صوت الغنّة.', 'From the nose: the ghunna sound.'), letters: [], book: 'p123_1' }
};
export const AREA_IDS = ['jawf', 'halq', 'lisan', 'shafatan', 'khayshum'];

// ثلاث مجموعات من الصفات (للأطفال)
export const SIFAT = {
  hams: { name: T('الهمس', 'Hams (whispering)'), mn: 'فحثه شخص سكت', kid: T('حروف هامسة: يجري معها النفَس كأنك تهمس.', 'Whispering letters: your breath flows with them.'), letters: ['ف', 'ح', 'ث', 'ه', 'ش', 'خ', 'ص', 'س', 'ك', 'ت'] },
  istila: { name: T('الاستعلاء', 'Istiʿla’ (heavy letters)'), mn: 'خص ضغط قظ', kid: T('حروف ثقيلة: يرتفع اللسان فتخرج مفخّمة ممتلئة.', 'Heavy letters: the tongue rises and they come out full.'), letters: ['خ', 'ص', 'ض', 'غ', 'ط', 'ق', 'ظ'] },
  qalqalah: { name: T('القلقلة', 'Qalqalah (bouncing)'), mn: 'قطب جد', kid: T('حروف نطّاطة: تقفز إذا سكنت.', 'Bouncing letters: they bounce when silent.'), letters: ['ق', 'ط', 'ب', 'ج', 'د'] }
};

// بنوك الأسئلة المكتوبة (الخيار الأول هو الصحيح؛ يُخلط عند العرض)
export const BANKS = {
  mushaf_adab: [
    { id: 'isti', lv: 1, stem: T('ماذا نقول قبل أن نبدأ القراءة؟', 'What do we say before we start reading?'), options: [T('أعوذ بالله من الشيطان الرجيم', 'I seek refuge in Allah from the accursed Satan'), T('سبحان الله', 'SubhanAllah'), T('الله أكبر', 'Allahu akbar')], explain: T('نبدأ بالاستعاذة: «أعوذ بالله من الشيطان الرجيم».', 'We start by seeking refuge: “I seek refuge in Allah from the accursed Satan.”') },
    { id: 'basmala', lv: 1, stem: T('متى نقرأ البسملة؟', 'When do we read the basmala?'), options: [T('في أول كل سورة إلا سورة التوبة', 'At the start of every surah except At-Tawbah'), T('في آخر كل سورة', 'At the end of every surah'), T('في أول سورة الفاتحة فقط', 'Only before Al-Fatiha')], explain: T('البسملة في أول كل سورة إلا سورة التوبة.', 'The basmala comes at the start of every surah except At-Tawbah.') },
    { id: 'wudu', lv: 1, stem: T('كيف نستعد قبل أن نمسك المصحف؟', 'How do we get ready before holding the mushaf?'), options: [T('نتوضّأ', 'We make wudu'), T('نأكل', 'We eat'), T('نلعب قليلًا', 'We play a little')], explain: T('من أدب المصحف أن نكون على وضوء.', 'Part of respecting the mushaf is being in wudu.') },
    { id: 'listen', lv: 1, stem: T('إذا سمعنا القرآن يُقرأ، ماذا نفعل؟', 'When we hear the Qur’an being recited, what do we do?'), options: [T('نستمع وننصت', 'We listen quietly'), T('نتكلّم بصوت عالٍ', 'We talk loudly'), T('نخرج من المكان', 'We leave the place')], explain: T('إذا قُرئ القرآن استمعنا له وأنصتنا.', 'When the Qur’an is recited we listen and stay quiet.') },
    { id: 'place', lv: 1, stem: T('أين نضع المصحف؟', 'Where do we put the mushaf?'), options: [T('في مكان مرتفع نظيف', 'In a clean, raised place'), T('على الأرض', 'On the floor'), T('تحت الوسادة', 'Under the pillow')], explain: T('نضع المصحف في مكان طاهر مرتفع احترامًا له.', 'We put the mushaf in a clean, raised place out of respect.') },
    { id: 'tartil', lv: 1, stem: T('كيف نقرأ القرآن؟', 'How do we read the Qur’an?'), options: [T('بتمهّل وترتيل', 'Slowly and clearly (tartil)'), T('بسرعة كبيرة', 'Very fast'), T('ونحن نلعب', 'While playing')], explain: T('نقرأ بتمهّل وترتيل ونتدبّر المعنى.', 'We read slowly and clearly, thinking about the meaning.') },
    { id: 'sit', lv: 1, stem: T('كيف نجلس ونحن نقرأ؟', 'How do we sit while reading?'), options: [T('بأدب واحترام', 'Politely and respectfully'), T('ونحن مستلقون نلعب', 'Lying down and playing'), T('ونحن نأكل', 'While eating')], explain: T('نجلس بأدب واحترام لأننا نقرأ كلام الله.', 'We sit politely and respectfully because we are reading the words of Allah.') },
    { id: 'reward', lv: 1, stem: T('كم حسنة لنا بكل حرف نقرؤه من القرآن؟', 'How many good deeds do we get for each letter we read of the Qur’an?'), options: [T('عشر حسنات', 'Ten good deeds'), T('حسنة واحدة فقط', 'Only one good deed'), T('لا شيء', 'Nothing')], explain: T('قال النبي ﷺ: «من قرأ حرفًا من كتاب الله فله به حسنة، والحسنة بعشر أمثالها» (رواه الترمذي).', 'The Prophet ﷺ said: “Whoever reads a letter of the Book of Allah gets a good deed, and a good deed is multiplied by ten” (at-Tirmidhi).') },
    { id: 'voice', lv: 1, stem: T('كيف يكون صوتنا ونحن نقرأ القرآن؟', 'How should our voice be when we read the Qur’an?'), options: [T('نُحسّن صوتنا ونقرأ بهدوء', 'We make our voice beautiful and read calmly'), T('نصرخ بأعلى صوت', 'We shout as loud as we can'), T('نقرأ ونحن نضحك', 'We read while laughing')], explain: T('قال النبي ﷺ: «زيّنوا القرآن بأصواتكم» (رواه أبو داود).', 'The Prophet ﷺ said: “Beautify the Qur’an with your voices” (Abu Dawud).') },
    { id: 'over', lv: 1, stem: T('هل نضع أشياء فوق المصحف؟', 'Do we put things on top of the mushaf?'), options: [T('لا، لا نضع فوقه شيئًا', 'No, we put nothing on top of it'), T('نعم، نضع فوقه الكتب', 'Yes, we put books on it'), T('نضع فوقه الطعام', 'We put food on it')], explain: T('نُكرم المصحف فلا نضع فوقه شيئًا.', 'We honour the mushaf, so we put nothing on top of it.') },
    { id: 'qibla', lv: 2, stem: T('إلى أين يُستحبّ أن نتّجه ونحن نقرأ؟', 'Which direction is it recommended to face while reading?'), options: [T('إلى القبلة', 'Towards the qibla'), T('عكس القبلة دائمًا', 'Always away from the qibla'), T('ونحن مستلقون على ظهورنا', 'Lying on our backs')], explain: T('يُستحبّ للقارئ أن يجلس مستقبلًا القبلة إن تيسّر.', 'It is recommended to sit facing the qibla when possible.') },
    { id: 'siwak', lv: 2, stem: T('ماذا نفعل لفمنا قبل أن نقرأ؟', 'What do we do for our mouth before reading?'), options: [T('ننظّفه بالسواك أو الفرشاة', 'We clean it with a siwak or toothbrush'), T('نأكل الحلوى', 'We eat sweets'), T('لا يهمّ شيء', 'Nothing matters')], explain: T('من أدب التلاوة تنظيف الفم بالسواك، فهو طريق القرآن.', 'Part of the etiquette of reciting is cleaning the mouth with a siwak.') },
    { id: 'sajda', lv: 2, stem: T('قرأنا آية فيها سجدة التلاوة، ماذا يُستحبّ أن نفعل؟', 'We read an ayah with a prostration of recitation. What is recommended?'), options: [T('نسجد سجدة التلاوة', 'We make the prostration of recitation'), T('نعيد السورة من أولها', 'We restart the surah'), T('نغلق المصحف', 'We close the mushaf')], explain: T('إذا مرّ القارئ بآية سجدة استُحبّ له أن يسجد سجدة التلاوة.', 'When the reader passes an ayah of prostration it is recommended to prostrate.') },
    { id: 'tadabbur', lv: 2, stem: T('ما معنى «التدبّر»؟', 'What does “tadabbur” mean?'), options: [T('التفكّر في معاني الآيات', 'Thinking about the meanings of the ayahs'), T('القراءة بأسرع ما يمكن', 'Reading as fast as possible'), T('حفظ أرقام الصفحات', 'Memorising page numbers')], explain: T('التدبّر أن نفكّر في معاني ما نقرأ ونعمل به.', 'Tadabbur is thinking about what we read and acting on it.') },
    { id: 'isti_mean', lv: 2, stem: T('ما معنى «أعوذ بالله من الشيطان الرجيم»؟', 'What does “I seek refuge in Allah from the accursed Satan” mean?'), options: [T('ألتجئ إلى الله ليحفظني من الشيطان', 'I turn to Allah to protect me from Satan'), T('أشكر الله على النعم', 'I thank Allah for His blessings'), T('أبدأ باسم الله', 'I begin with the name of Allah')], explain: T('الاستعاذة: الالتجاء إلى الله ليحفظنا من الشيطان أثناء القراءة.', 'Isti‘adha is turning to Allah for protection from Satan while we read.') },
    { id: 'talk', lv: 3, stem: T('كنت تقرأ ثم قطعت القراءة لتتكلّم مع أحد. ماذا تفعل حين تعود؟', 'You stopped reading to talk with someone. What do you do when you return?'), options: [T('أستعيذ بالله ثم أكمل من حيث توقفت', 'I seek refuge in Allah, then continue where I stopped'), T('أبدأ المصحف من أوله', 'I start the mushaf from the beginning'), T('أكمل وأنا ما زلت أتكلّم', 'I continue while still talking')], explain: T('إذا قطع القارئ قراءته لكلام ثم عاد، استُحبّ أن يستعيذ من جديد.', 'If the reader stops to talk and then returns, it is recommended to seek refuge again.') },
    { id: 'yawn', lv: 3, stem: T('تثاءبت وأنت تقرأ. ماذا تفعل؟', 'You yawn while reading. What do you do?'), options: [T('أتوقف عن القراءة حتى ينتهي التثاؤب', 'I pause my reading until the yawn ends'), T('أكمل القراءة وأنا أتثاءب', 'I keep reading while yawning'), T('أترك القراءة كلها', 'I give up reading altogether')], explain: T('من أدب التلاوة أن يُمسك القارئ عن القراءة حتى ينقضي التثاؤب.', 'Part of the etiquette is to pause the recitation until the yawn passes.') },
    { id: 'mistake', lv: 3, stem: T('أخطأت في كلمة وأنت تقرأ على معلّمك فصحّحها لك. ماذا تفعل؟', 'You misread a word in front of your teacher and they corrected you. What do you do?'), options: [T('أعيد الكلمة صحيحة كما صحّحها', 'I repeat the word correctly as they corrected it'), T('أكمل ولا أهتم', 'I carry on and ignore it'), T('أغضب وأترك القراءة', 'I get upset and stop reading')], explain: T('القرآن يُتلقّى من المعلّم: نعيد الكلمة صحيحة ونشكر من صحّحها.', 'The Qur’an is learned from a teacher: we repeat the word correctly and thank them.') },
    { id: 'middle', lv: 3, stem: T('ستبدأ القراءة من وسط سورة (لا من أولها). بماذا تبدأ؟', 'You will start reading from the middle of a surah. How do you begin?'), options: [T('بالاستعاذة، ولي أن أقرأ البسملة أو أتركها', 'With isti‘adha; reading the basmala is optional'), T('لا أقول شيئًا', 'I say nothing'), T('بالبسملة فقط وأترك الاستعاذة دائمًا', 'Only the basmala, always skipping isti‘adha')], explain: T('الاستعاذة عند بدء كل قراءة، أما البسملة في وسط السورة فالقارئ مخيّر فيها.', 'Isti‘adha comes at the start of any reading; in the middle of a surah the basmala is optional.') },
    { id: 'tawba', lv: 3, stem: T('ستبدأ القراءة من أول سورة التوبة. كيف تبدأ؟', 'You will start reading from the beginning of Surah At-Tawbah. How do you begin?'), options: [T('بالاستعاذة دون البسملة', 'With isti‘adha, without the basmala'), T('بالاستعاذة ثم البسملة', 'With isti‘adha, then the basmala'), T('بالبسملة فقط', 'With the basmala only')], explain: T('سورة التوبة هي السورة الوحيدة التي لا تُكتب في أولها البسملة، فنبدأ بالاستعاذة فقط.', 'At-Tawbah is the only surah without a basmala at its start, so we begin with isti‘adha only.') },
    { id: 'floor', lv: 3, stem: T('وجدت مصحفًا على الأرض. ماذا تفعل؟', 'You find a mushaf on the floor. What do you do?'), options: [T('أرفعه وأضعه في مكان نظيف مرتفع', 'I pick it up and put it in a clean, raised place'), T('أتركه مكانه', 'I leave it there'), T('أضع حقيبتي فوقه', 'I put my bag on top of it')], explain: T('نرفع المصحف إكرامًا له ونضعه في مكان لائق.', 'We pick up the mushaf to honour it and put it somewhere fitting.') },
    { id: 'toilet', lv: 3, stem: T('تريد دخول الحمّام والمصحف في يدك. ماذا تفعل؟', 'You need the bathroom and the mushaf is in your hand. What do you do?'), options: [T('أضعه في مكان لائق خارج الحمّام ثم أدخل', 'I put it somewhere fitting outside, then go in'), T('أدخل به معي', 'I take it in with me'), T('أرميه أمام الباب', 'I drop it at the door')], explain: T('لا نُدخل المصحف الحمّام احترامًا له.', 'We do not take the mushaf into the bathroom, out of respect.') }
  ],
  mushaf_surahs: [
    { id: 'count', stem: T('كم سورة في القرآن الكريم؟', 'How many surahs are in the Qur’an?'), layout: 'num', options: [T('١١٤', '114'), T('٣٠', '30'), T('٦٠', '60'), T('١٠٠', '100')], explain: T('في القرآن ١١٤ سورة.', 'The Qur’an has 114 surahs.') },
    { id: 'first', stem: T('ما أول سورة في المصحف؟', 'What is the first surah in the mushaf?'), options: [T('الفاتحة', 'Al-Fatiha'), T('البقرة', 'Al-Baqarah'), T('الناس', 'An-Nas')], explain: T('أول سورة في المصحف الفاتحة.', 'The first surah in the mushaf is Al-Fatiha.') },
    { id: 'last', stem: T('ما آخر سورة في المصحف؟', 'What is the last surah in the mushaf?'), options: [T('الناس', 'An-Nas'), T('الفلق', 'Al-Falaq'), T('الإخلاص', 'Al-Ikhlas')], explain: T('آخر سورة في المصحف سورة الناس.', 'The last surah in the mushaf is An-Nas.') },
    { id: 'amma', stem: T('بأي سورة يبدأ جزء عمّ؟', 'Which surah starts Juz ʿAmma?'), options: [T('النبأ', 'An-Naba'), T('الملك', 'Al-Mulk'), T('الفاتحة', 'Al-Fatiha')], explain: T('جزء عمّ (الجزء الثلاثون) يبدأ بسورة النبأ.', 'Juz ʿAmma (juz 30) starts with Surah An-Naba.') },
    { id: 'longest', stem: T('ما أطول سورة في القرآن؟', 'What is the longest surah in the Qur’an?'), options: [T('البقرة', 'Al-Baqarah'), T('الفاتحة', 'Al-Fatiha'), T('النبأ', 'An-Naba')], explain: T('أطول سورة البقرة (٢٨٦ آية).', 'The longest surah is Al-Baqarah (286 ayahs).') },
    { id: 'shortest', stem: T('ما أقصر سورة في القرآن؟', 'What is the shortest surah in the Qur’an?'), options: [T('الكوثر', 'Al-Kawthar'), T('البقرة', 'Al-Baqarah'), T('الملك', 'Al-Mulk')], explain: T('أقصر سورة الكوثر: ثلاث آيات قصيرة.', 'The shortest surah is Al-Kawthar: three short ayahs.') }
  ],
  mushaf_find: [
    { id: 'order', stem: T('ما الترتيب الصحيح للبحث عن آية؟', 'What is the right order to find an ayah?'), options: [T('الجزء ← السورة ← رقم الآية', 'Juz → surah → ayah number'), T('رقم الآية ← الجزء ← السورة', 'Ayah number → juz → surah'), T('السورة ← رقم الصفحة ← الجزء', 'Surah → page number → juz')], explain: T('نعرف الجزء، ثم نجد السورة، ثم نصل إلى رقم الآية.', 'Know the juz, find the surah, then reach the ayah number.') },
    { id: 'name', stem: T('أين تجد اسم السورة في الصفحة؟', 'Where is the surah name on the page?'), options: [T('في أعلى الصفحة', 'At the top of the page'), T('في أسفل الصفحة', 'At the bottom of the page'), T('على الهامش فقط', 'Only in the margin')], explain: T('اسم السورة في أعلى الصفحة.', 'The surah name is at the top of the page.') },
    { id: 'page', stem: T('أين رقم الصفحة في المصحف؟', 'Where is the page number in the mushaf?'), options: [T('في أسفل الصفحة', 'At the bottom of the page'), T('في أعلى الصفحة', 'At the top of the page'), T('في أول كل آية', 'At the start of each ayah')], explain: T('رقم الصفحة في أسفلها.', 'The page number is at the bottom.') },
    { id: 'amma', stem: T('تريد أن تقرأ سورة الإخلاص. في أي جزء تبحث؟', 'You want to read Surah Al-Ikhlas. Which juz do you look in?'), layout: 'num', options: [T('٣٠', '30'), T('١', '1'), T('١٥', '15'), T('٢٩', '29')], explain: T('سورة الإخلاص في جزء عمّ، وهو الجزء الثلاثون.', 'Surah Al-Ikhlas is in Juz ʿAmma, the thirtieth juz.') },
    { id: 'fifth', stem: T('أيّ آية هي الآية الخامسة؟', 'Which one is the fifth ayah?'), options: [T('التي تنتهي بالرقم ٥', 'The one that ends with 5'), T('التي تبدأ بعد الرقم ٥', 'The one that starts after 5'), T('التي في أعلى الصفحة', 'The one at the top of the page')], explain: T('الرقم في آخر الآية، فالخامسة هي التي تنتهي بالرقم ٥.', 'The number is at the end, so the fifth ayah is the one ending with 5.') }
  ],
  know_makharij: [
    { id: 'ghunna', stem: T('من أين تخرج الغنّة؟', 'Where does the ghunna come from?'), options: [T('الخيشوم (الأنف)', 'The nasal passage (nose)'), T('الحلق', 'The throat'), T('الشفتان', 'The lips')], explain: T('الغنّة صوت يخرج من الخيشوم.', 'The ghunna is a sound from the nasal passage.') },
    { id: 'halq6', stem: T('كم حرفًا يخرج من الحلق؟', 'How many letters come from the throat?'), layout: 'num', options: [T('٦', '6'), T('٤', '4'), T('١٨', '18'), T('٣', '3')], explain: T('حروف الحلق ستة: ء هـ ع ح غ خ.', 'The throat letters are six: ء هـ ع ح غ خ.') },
    { id: 'jawf', stem: T('حروف المد الثلاثة تخرج من:', 'The three madd letters come from:'), options: [T('الجوف', 'The jawf'), T('الشفتين', 'The lips'), T('الخيشوم', 'The nasal passage')], explain: T('حروف المد (ا و ي) تخرج من الجوف.', 'The madd letters (ا و ي) come from the jawf.') },
    { id: 'most', stem: T('أكثر الحروف تخرج من:', 'Most letters come from:'), options: [T('اللسان', 'The tongue'), T('الحلق', 'The throat'), T('الشفتين', 'The lips')], explain: T('اللسان مخرج ١٨ حرفًا.', 'The tongue is the source of 18 letters.') },
    { id: 'five', stem: T('كم مخرجًا عامًا للحروف؟', 'How many general articulation areas are there?'), layout: 'num', options: [T('٥', '5'), T('٣', '3'), T('١٧', '17'), T('٢٨', '28')], explain: T('المخارج العامة خمسة: الجوف والحلق واللسان والشفتان والخيشوم.', 'There are five general areas: jawf, throat, tongue, lips and nasal passage.') }
  ],
  know_sifat: [
    { id: 'istila', stem: T('حروف «خص ضغط قظ» تُنطق دائمًا:', 'The letters «خص ضغط قظ» are always said:'), options: [T('مفخّمة (ثقيلة)', 'Heavy (full)'), T('مرقّقة (خفيفة)', 'Light (thin)')], explain: T('هي حروف الاستعلاء: يرتفع اللسان فتُفخَّم.', 'They are the istiʿla’ letters: the tongue rises, so they are heavy.') },
    { id: 'hams', stem: T('مع حروف «فحثه شخص سكت»:', 'With the letters «فحثه شخص سكت»:'), options: [T('يجري النفَس', 'The breath flows'), T('ينحبس النفَس', 'The breath stops')], explain: T('هي حروف الهمس: يجري معها النفَس.', 'They are the hams letters: the breath flows with them.') },
    { id: 'qal', stem: T('حروف «قطب جد» إذا سكنت:', 'The letters «قطب جد» when silent:'), options: [T('تقفز (تُقلقل)', 'Bounce (qalqalah)'), T('تُمدّ', 'Are stretched'), T('تختفي', 'Disappear')], explain: T('هي حروف القلقلة: تقفز إذا سكنت.', 'They are the qalqalah letters: they bounce when silent.') }
  ],
  know_waqf: [
    { id: 'taa', stem: T('إذا وقفنا على كلمة آخرها تاء مربوطة (ة) نقف:', 'When stopping on a word ending in taa marbuta (ة) we stop with:'), options: [T('بهاء ساكنة', 'A silent haa'), T('بتاء مفتوحة', 'A taa with fatha'), T('بألف', 'An alif')], explain: T('التاء المربوطة نقف عليها هاءً ساكنة.', 'Taa marbuta becomes a silent haa when stopping.') },
    { id: 'fathatan', stem: T('إذا وقفنا على تنوين الفتح نقول:', 'When stopping on fathatan we say:'), options: [T('ألفًا', 'An alif'), T('نونًا', 'A noon'), T('ضمّة', 'A damma')], explain: T('تنوين الفتح نقف عليه بألف.', 'Fathatan becomes an alif when stopping.') },
    { id: 'vowel', stem: T('هل نقف على آخر الكلمة بضمّة أو كسرة؟', 'Do we stop on the last letter with a damma or kasra?'), options: [T('لا، نُسكّنه', 'No — we make it silent'), T('نعم', 'Yes')], explain: T('الأصل في الوقف الإسكان.', 'Stopping is done with a sukun.') }
  ]
};

export const STOP_KIND = {
  sukun: { label: T('بالسكون', 'With a sukun'), explain: T('آخرها حرف متحرّك، فنقف عليه بالسكون.', 'It ends with a voweled letter, so we stop on it with a sukun.') },
  alif: { label: T('بالألف', 'With an alif'), explain: T('آخرها تنوين فتح، فنقف عليه بألف.', 'It ends with fathatan, so we stop with an alif.') },
  ha: { label: T('بالهاء الساكنة', 'With a silent haa'), explain: T('آخرها تاء مربوطة، فنقف عليها هاءً ساكنة.', 'It ends with taa marbuta, so we stop with a silent haa.') },
  asis: { label: T('كما هي (حرف مد)', 'As it is (a madd letter)'), explain: T('آخرها حرف مد، فتبقى كما هي.', 'It ends with a madd letter, so it stays as it is.') }
};
