// js/i18n.js — نصوص الواجهة بالعربية والإنجليزية + تبديل اللغة والاتجاه (RTL/LTR). مستقل عن i18n المنصة.
const D = {
  mk_l1: { ar: 'ما موضوعنا؟', en: 'What is this about?' },
  mk_l2: { ar: 'العلامات', en: 'The signs' },
  mk_l3: { ar: 'شاهدها في المصحف', en: 'See it in the mushaf' },
  mk_l4: { ar: 'انتبه', en: 'Watch out' },
  mk_l5: { ar: 'المرجع', en: 'Reference' },
  mk_pick: { ar: 'اختر العلامة', en: 'Pick a sign' },
  mk_notice: { ar: 'لاحظ', en: 'Notice' },
  mk_source: { ar: 'تعريفات العلامات مأخوذة من دليل المصحف المطبوع (علامات الوقف ومصطلحات الضبط) كما اعتمدتها المنصة، والصور مقتطعة من صفحات المصحف المطبوع.', en: 'The sign definitions come from the printed-mushaf guide (stopping signs and marking terms) as adopted by the platform; the pictures are cut from printed mushaf pages.' },
  mk_lantern_title: { ar: 'فوانيس الهامش', en: 'Margin lanterns' },
  mk_sample_ayahs: { ar: 'انظر: الرقم يأتي بعد نهاية كل آية', en: 'Look: the number comes after the end of each ayah' },
  mk_no_example: { ar: 'لا مثال لهذه العلامة في بنك الآيات الحالي.', en: 'No example of this sign in the current verse bank.' },
  mk_rule_kind: { ar: 'درس مصحف', en: 'Mushaf lesson' },
  ex_prev: { ar: 'المثال السابق', en: 'Previous example' },
  ex_next: { ar: 'المثال التالي', en: 'Next example' },
  mk_explorer: { ar: 'مستكشف المصحف', en: 'Mushaf Explorer' },
  mk_explorer_lead: { ar: 'صفحات حقيقية من المصحف المطبوع عليها {n} علامة. اضغط أي رقم ذهبي لتعرف ما هي: اسمها ومعناها وشكلها.', en: 'Real pages of the printed mushaf with {n} marks on them. Tap any golden number to learn what it is: its name, meaning and look.' },
  mk_explore: { ar: 'استكشف صفحة المصحف', en: 'Explore a mushaf page' },
  mk_explore_hint: { ar: 'اضغط على الأرقام الذهبية في الصفحة لتعرف كل علامة.', en: 'Tap the golden numbers on the page to discover each sign.' },
  mk_explore_empty: { ar: '👆 اختر رقم\u064Bا من الصفحة أو من القائمة', en: '👆 Pick a number on the page or in the list' },
  mk_page_n: { ar: 'الصفحة {n} من المصحف', en: 'Mushaf page {n}' },
  mk_page_alt: { ar: 'صفحة {n} من المصحف المطبوع', en: 'Page {n} of the printed mushaf' },
  mk_how_looks: { ar: 'شكلها في المصحف', en: 'How it looks in the mushaf' },
  skip: { ar: 'تخط\u064E\u0651 إلى المحتوى', en: 'Skip to content' },
  app_title: { ar: 'تحدي التجويد', en: 'Tajweed Challenge' },
  app_sub: { ar: 'تعل\u0651م الأحكام خطوة خطوة، والعب لتتقنها', en: 'Learn the rules step by step, play to master them' },
  preview_tag: { ar: 'نموذج مستقل للمراجعة', en: 'Standalone preview' },
  nav_home: { ar: 'الرئيسية', en: 'Home' },
  nav_about: { ar: 'المصادر والمراجعة', en: 'Sources & review' },
  nav_theme: { ar: 'المظهر', en: 'Theme' },
  nav_lang: { ar: 'English', en: 'العربية' },
  nav_review: { ar: 'وضع المراجع', en: 'Reviewer mode' },
  back: { ar: 'رجوع', en: 'Back' },
  next: { ar: 'التالي', en: 'Next' },
  prev: { ar: 'السابق', en: 'Previous' },
  continue: { ar: 'تابع', en: 'Continue' },
  retry: { ar: 'أعد المحاولة', en: 'Try again' },
  finish: { ar: 'إنهاء', en: 'Finish' },
  hint: { ar: 'تلميح', en: 'Hint' },

  home_hello: { ar: 'مرحب\u064Bا يا قارئ! 🌟', en: 'Welcome, young reciter! 🌟' },
  home_lead: { ar: 'خمس محطات تأخذك من الأصوات الأولى إلى المدود. في كل حكم: تتعل\u0651م، ثم تلعب، ثم تتقن.', en: 'Five stops take you from the first sounds to elongation. In every rule: you learn, then play, then master.' },
  home_start: { ar: 'ابدأ الرحلة', en: 'Start the journey' },
  home_continue: { ar: 'تابع من حيث وقفت', en: 'Continue where you stopped' },
  home_progress: { ar: 'نجومك', en: 'Your stars' },
  home_mastered: { ar: 'أحكام أتقنتها', en: 'rules mastered' },
  home_mixed: { ar: 'التحد\u0651ي الكبير', en: 'The Big Challenge' },
  home_mixed_desc: { ar: 'أسئلة متنو\u0651عة من كل الأحكام التي تعل\u0651متها', en: 'Mixed questions from every rule you have learned' },
  path_title: { ar: 'خريطة الرحلة', en: 'Journey map' },
  stage_n: { ar: 'المحطة {n}', en: 'Stop {n}' },
  stage_challenge: { ar: 'تحد\u0651ي المحطة', en: 'Stop challenge' },
  stage_challenge_locked: { ar: 'أتقن حكم\u064Bا واحد\u064Bا على الأقل لتفتحه', en: 'Master at least one rule to unlock' },
  rules_count: { ar: '{n} أحكام', en: '{n} rules' },
  rule_one: { ar: 'حكم واحد', en: '1 rule' },

  rule_steps: { ar: 'خطوات التعل\u0651م', en: 'Learning steps' },
  step_learn: { ar: 'تعل\u0651م', en: 'Learn' },
  step_learn_d: { ar: 'تعريف وشرح وأمثلة من القرآن', en: 'Definition, explanation and Qur’an examples' },
  lvl_1: { ar: 'تعر\u0651ف', en: 'Recognize' },
  lvl_1_d: { ar: 'اكتشف الحكم في آيات قصيرة', en: 'Spot the rule in short verses' },
  lvl_2: { ar: 'مي\u0651ز', en: 'Distinguish' },
  lvl_2_d: { ar: 'فر\u0651ق بينه وبين الأحكام المشابهة', en: 'Tell it apart from similar rules' },
  lvl_3: { ar: 'طب\u0651ق', en: 'Apply' },
  lvl_3_d: { ar: 'آيات جديدة لم تمر\u0651 بك', en: 'New verses you have not seen' },
  locked_learn: { ar: 'أكمل الدرس أول\u064Bا', en: 'Finish the lesson first' },
  locked_prev: { ar: 'اجتز المستوى السابق أول\u064Bا', en: 'Pass the previous level first' },
  start: { ar: 'ابدأ', en: 'Start' },
  play_again: { ar: 'العب مجدد\u064Bا', en: 'Play again' },
  review_lesson: { ar: 'راجع الدرس', en: 'Review lesson' },
  rule_examples: { ar: 'أمثلة من القرآن', en: 'Examples from the Qur’an' },
  rule_letters: { ar: 'الحروف', en: 'Letters' },
  rule_length: { ar: 'المقدار', en: 'Length' },
  rule_refs: { ar: 'المراجع', en: 'References' },

  learn_step: { ar: 'الخطوة {i} من {n}', en: 'Step {i} of {n}' },
  learn_1: { ar: 'ما هو؟', en: 'What is it?' },
  learn_2: { ar: 'كيف أعرفه؟', en: 'How do I spot it?' },
  learn_3: { ar: 'شاهده في القرآن', en: 'See it in the Qur’an' },
  learn_4: { ar: 'انتبه ومي\u0651ز', en: 'Watch out & compare' },
  learn_5: { ar: 'من أين أخذنا هذا؟', en: 'Where does this come from?' },
  def_label: { ar: 'التعريف', en: 'Definition' },
  kid_label: { ar: 'بكلمات بسيطة', en: 'In simple words' },
  how_label: { ar: 'ثلاث خطوات للتعر\u0651ف عليه', en: 'Three steps to recognize it' },
  watch_label: { ar: 'انتبه', en: 'Watch out' },
  vs_label: { ar: 'لا تخلطه ب\u0640', en: 'Do not mix it up with' },
  poem_label: { ar: 'من المتن', en: 'From the poem' },
  source_label: { ar: 'المرجع', en: 'Source' },
  mnemonic_label: { ar: 'وسيلة حفظ', en: 'Memory aid' },
  legend_cause: { ar: 'السبب', en: 'The cause' },
  legend_trigger: { ar: 'الحرف المؤث\u0651ر', en: 'The deciding letter' },
  legend_hint: { ar: 'الحرف الملو\u064E\u0651ن بالأخضر هو سبب الحكم، والملو\u064E\u0651ن بالذهبي هو الحرف الذي يحد\u0651د نوعه.', en: 'The green letter is the cause of the rule; the gold one is the letter that decides its type.' },
  ex_toggle: { ar: 'إظهار / إخفاء التلوين', en: 'Show / hide colouring' },
  ex_of: { ar: 'مثال {i} من {n}', en: 'Example {i} of {n}' },
  listen: { ar: 'استمع', en: 'Listen' },
  listening: { ar: 'جار\u064D التشغيل…', en: 'Playing…' },
  audio_fail: { ar: 'تعذ\u0651ر تشغيل التلاوة الآن. جر\u0651ب لاحق\u064Bا أو تابع بدونها.', en: 'Recitation could not be played right now. Try later or continue without it.' },
  start_training: { ar: 'ابدأ التدريب', en: 'Start training' },
  lesson_done: { ar: 'أحسنت! أنهيت الدرس', en: 'Well done! Lesson complete' },

  q_n: { ar: 'سؤال {i} من {n}', en: 'Question {i} of {n}' },
  q_identify: { ar: 'ما حكم الحرفين المظل\u064E\u0651لين؟', en: 'What is the rule of the highlighted letters?' },
  q_spot: { ar: 'اضغط على الكلمة التي فيها: {r}', en: 'Tap the word that has: {r}' },
  q_spot_any: { ar: 'ابحث في الآية عن: {r}', en: 'Find in the verse: {r}' },
  q_tap_qalqalah: { ar: 'اضغط على حرف القلقلة في هذه الكلمة', en: 'Tap the qalqalah letter in this word' },
  q_tap_ghunna: { ar: 'اضغط على الحرف المشد\u0651د الذي فيه الغن\u0651ة', en: 'Tap the doubled letter that carries the ghunna' },
  q_tap_madd_tabii: { ar: 'اضغط على حرف المد\u0651 الطبيعي في هذه الكلمة', en: 'Tap the natural madd letter in this word' },
  q_sort: { ar: 'ضع كل مثال في الحكم الصحيح', en: 'Put each example in the right rule' },
  q_sort_pick: { ar: 'اختر مثال\u064Bا ثم اضغط على الحكم المناسب', en: 'Pick an example, then tap the matching rule' },
  q_letters_noon: { ar: 'إذا جاء هذا الحرف بعد النون الساكنة أو التنوين، فما الحكم؟', en: 'If this letter follows a noon sakinah or tanween, what is the rule?' },
  q_letters_meem: { ar: 'إذا جاء هذا الحرف بعد الميم الساكنة، فما الحكم؟', en: 'If this letter follows a meem sakinah, what is the rule?' },
  q_letters_lam: { ar: 'إذا جاء هذا الحرف بعد لام «أل»، فهل هي قمرية أم شمسية؟', en: 'If this letter follows the “al” lam, is it a moon or a sun lam?' },
  q_letters_qalqalah: { ar: 'هل هذا الحرف من حروف القلقلة «قطب جد»؟', en: 'Is this letter one of the qalqalah letters “qutb jad”?' },
  yes: { ar: 'نعم', en: 'Yes' },
  no: { ar: 'لا', en: 'No' },
  from_ayah: { ar: 'من سورة {s} · الآية {a}', en: 'Surah {s} · verse {a}' },
  good_title: { ar: 'أحسنت! ✨', en: 'Great job! ✨' },
  bad_title: { ar: 'لا بأس، لنفهم مع\u064Bا 💡', en: 'No worries, let’s understand together 💡' },
  wrong_pick: { ar: 'اخترت «{w}». هذا الحكم يلزمه {n}.', en: 'You chose “{w}”. That rule needs {n}.' },
  right_is: { ar: 'الصحيح: {r}.', en: 'The answer: {r}.' },
  wrong_sort: { ar: 'ليس هنا: «{w}» يلزمه {n}.', en: 'Not here: “{w}” needs {n}.' },
  spot_wrong_word: { ar: 'الكلمة «{w}» ليست موضع هذا الحكم.', en: 'The word “{w}” is not where this rule happens.' },
  try_again: { ar: 'جر\u0651ب كلمة أخرى', en: 'Try another word' },
  placed_all: { ar: 'رائع! صن\u0651فت كل الأمثلة.', en: 'Great! You sorted every example.' },

  res_title: { ar: 'انتهى التحد\u0651ي', en: 'Challenge complete' },
  res_score: { ar: '{c} من {n} إجابات صحيحة', en: '{c} of {n} correct' },
  res_pass: { ar: 'اجتزت\u064E المستوى! 🎉', en: 'Level passed! 🎉' },
  res_fail: { ar: 'قريب جد\u064Bا! راجع الدرس وحاول مجدد\u064Bا 💪', en: 'So close! Review the lesson and try again 💪' },
  res_next_level: { ar: 'المستوى التالي', en: 'Next level' },
  res_to_rule: { ar: 'العودة للحكم', en: 'Back to the rule' },
  res_home: { ar: 'الخريطة', en: 'Map' },
  stars: { ar: 'نجوم', en: 'stars' },

  about_title: { ar: 'المصادر والمراجعة', en: 'Sources & review' },
  about_lead: { ar: 'هذا نموذج مستقل للاعتماد. كل ما يظهر فيه من حكم أو مثال أو إجابة موث\u064E\u0651ق هنا، وما لم ي\u064Fتحق\u064E\u0651ق منه موسوم «قيد المراجعة».', en: 'This is a standalone prototype for approval. Every rule, example and answer is documented here; whatever could not be verified is marked “Under review”.' },
  about_sources: { ar: 'المصادر', en: 'Sources' },
  about_review: { ar: 'عناصر تحتاج مراجعة بشرية', en: 'Items needing human review' },
  about_status_verified: { ar: 'مطاب\u064Eق', en: 'Verified' },
  about_status_review: { ar: 'قيد المراجعة', en: 'Under review' },
  about_status_cross: { ar: 'رأي ثان\u064D آلي', en: 'Automatic cross-check' },
  about_reset: { ar: 'مسح تقد\u0651مي المحفوظ', en: 'Clear my saved progress' },
  about_reset_done: { ar: 'تم مسح التقد\u0651م.', en: 'Progress cleared.' },
  about_integration: { ar: 'هذا المجلد لا يعد\u0651ل أي ملف في المنصة، ويعمل وحده. عند الدمج ت\u064Fستبدل هذا الشريط العلوي بترويسة المنصة الموح\u0651دة.', en: 'This folder changes nothing in the platform and runs on its own. When merged, this top bar is replaced by the platform’s unified header.' },
  review_badge: { ar: 'قيد المراجعة', en: 'Under review' },
  review_mode_on: { ar: 'وضع المراجع مفع\u0651ل: كل المستويات مفتوحة وتظهر ملاحظات المراجعة.', en: 'Reviewer mode is on: every level is open and review notes are shown.' },
  data_version: { ar: 'بنك الآيات: {n} آية — نص المصحف منسوخ حرفي\u064Bا من مصحف المنصة', en: 'Verse bank: {n} verses — Qur’an text copied verbatim from the platform mushaf' },
  stage_done: { ar: 'اكتمل', en: 'Done' },
  none_yet: { ar: 'لم تبدأ بعد', en: 'Not started yet' }
};

let lang = 'ar';
try { lang = localStorage.getItem('tjc.lang') || ((navigator.language || 'ar').startsWith('ar') ? 'ar' : 'en'); } catch { /* افتراضي */ }
if (lang !== 'ar' && lang !== 'en') lang = 'ar';

export const getLang = () => lang;
export function setLang(l) {
  lang = l === 'en' ? 'en' : 'ar';
  try { localStorage.setItem('tjc.lang', lang); } catch { /* لا تخزين */ }
  applyDir();
}
export function applyDir() {
  const h = document.documentElement;
  h.lang = lang; h.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = D.app_title[lang];
}
// نص واجهة بمتغيرات
export function t(key, vars = {}) {
  const e = D[key]; if (!e) return `⟦${key}⟧`;
  return e[lang].replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ''));
}
// نص من كائن {ar,en} (محتوى الأحكام)
export const tx = (o) => (o ? o[lang] : '');
export const num = (n) => (lang === 'ar' ? String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]) : String(n));
export const UI_KEYS = Object.keys(D);
export const UI_DICT = D;
