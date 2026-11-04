// previews/mr-honest-shared.js
// بيانات تجريبية + نصوص (عربي/English) مشتركة بين نموذجَي معاينة "التقرير الشهري الصادق":
//   previews/monthly-report-d-statement.html  (الكشف الموثَّق — ورقة A4 رسمية)
//   previews/monthly-report-e-canvas.html     (لوحة الشهر — بطاقة بصرية للجوال/واتساب)
// حالتان للعرض: طالب متميز / طالب يحتاج متابعة — حتى يُرى أن التقرير يقول الحقيقة في الحالتين.
// مبادئ الصدق المطبَّقة هنا:
//   1) لا رقم "إنجاز عام" مركَّب: كل مؤشر بمصدره وعدد أدلّته.
//   2) الخطة مقابل المُنجَز دائمًا (لا أرقام مطلقة بلا مرجع).
//   3) أي مؤشر أدلّته أقل من 3 يظهر "بيانات غير كافية" بدل تقدير.
//   4) قسم "يحتاج عناية" لا يُخفى أبدًا، وقسم "مصادر التقرير" يذكر ما بُني عليه.

export const MIN_EVIDENCE = 3;

// ---------- السُّلَّم الخماسي (نفس العتبات في النموذجين) ----------
export const SCALE = [
  { key: 'exc',  min: 90, ar: 'ممتاز',    en: 'Excellent' },
  { key: 'vgood',min: 80, ar: 'جيد جدًا', en: 'Very good' },
  { key: 'good', min: 70, ar: 'جيد',      en: 'Good' },
  { key: 'fair', min: 60, ar: 'مقبول',    en: 'Fair' },
  { key: 'weak', min: 0,  ar: 'يحتاج دعمًا', en: 'Needs support' }
];
export const levelOf = (score) => SCALE.find(s => score >= s.min) || SCALE[SCALE.length - 1];
export const levelIndex = (score) => SCALE.length - 1 - SCALE.indexOf(levelOf(score)); // 0..4 (4 = ممتاز)

// حالة الهدف (الخطة مقابل المُنجَز)
export function goalStatus(done, planned) {
  const r = planned ? done / planned : 0;
  if (r >= 1) return { key: 'met', ar: 'تحقّق', en: 'Met', r };
  if (r >= 0.75) return { key: 'near', ar: 'قريب', en: 'Close', r };
  return { key: 'miss', ar: 'لم يتحقّق', en: 'Not met', r };
}

// ---------- النصوص الثابتة ----------
export const L = {
  ar: {
    dir: 'rtl',
    brandSub: 'أبطال القرآن',
    reportTitle: 'التقرير الشهري لولي الأمر',
    statementTitle: 'كشف الإنجاز الشهري',
    reportNo: 'رقم التقرير',
    period: 'الفترة',
    grade: 'الصف',
    teacher: 'المعلم',
    scope: 'المحفوظ حتى الآن',
    summary: 'الخلاصة',
    summaryHint: 'ملخّص صادق لما حدث هذا الشهر في سطرين',
    teacherGrade: 'تقدير المعلم العام',
    planVsDone: 'الخطة مقابل المُنجَز',
    planVsDoneHint: 'ما اتُّفق عليه في بداية الشهر، وما تحقّق فعلًا',
    item: 'البند', planned: 'المقرَّر', done: 'المُنجَز', ratio: 'نسبة التحقّق', status: 'الحالة',
    mastery: 'مستوى الإتقان',
    masteryHint: 'التقدير مبني على الأدلّة المسجَّلة؛ بلا 3 أدلّة على الأقل لا نُصدر حكمًا',
    evidence: (n) => `${n} ${n === 1 ? 'دليل' : n === 2 ? 'دليلان' : n <= 10 ? 'أدلّة' : 'دليلًا'}`,
    insufficient: 'بيانات غير كافية',
    vsLast: 'مقارنة بالشهر السابق',
    same: 'ثابت',
    strengths: 'نقاط القوة',
    needs: 'يحتاج إلى عناية',
    journey: 'المسيرة نحو الختم',
    juzDone: 'جزء محفوظ', juzPart: 'قيد الحفظ', juzTodo: 'لم يبدأ',
    juzOf: (x) => `${x} من 30 جزءًا`,
    nextPlan: 'خطة الشهر القادم',
    nextPlanHint: 'أهداف قابلة للقياس — سيُقاس عليها تقرير الشهر القادم',
    homeRole: 'ما نرجوه من البيت',
    teacherNote: 'كلمة المعلم',
    signature: 'توقيع المعلم', stamp: 'الختم',
    sources: 'مصادر هذا التقرير',
    completeness: 'اكتمال البيانات',
    issued: 'تاريخ الإصدار',
    verse: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
    attendance: 'الحضور',
    calendar: 'تقويم الحضور',
    present: 'حضر', excused: 'غياب بعذر', absent: 'غياب', late: 'تأخّر', noSession: 'لا حصة',
    weeks: 'إيقاع الأسابيع',
    weeksHint: 'آيات جديدة كل أسبوع ونتيجة اختبار التسميع',
    week: (n) => `أسبوع ${n}`,
    newAyahs: 'آية جديدة',
    memoPath: 'مسار الحفظ',
    from: 'من', to: 'إلى', target: 'الهدف',
    honest: 'بصراحة',
    went: 'ما سار جيدًا',
    notWent: 'ما لم يسر كما يجب',
    ofPlan: 'من الخطة',
    sessions: 'حصة',
    days: ['أحد','إثنين','ثلاثاء','أربعاء','خميس','جمعة','سبت'],
    daysShort: ['ح','ن','ث','ر','خ','ج','س'],
    // واجهة المعاينة
    ui: { lang: 'English', strong: 'طالب متميز', needs: 'طالب يحتاج متابعة', print: 'طباعة', back: 'كل النماذج' }
  },
  en: {
    dir: 'ltr',
    brandSub: 'Quran Heroes',
    reportTitle: 'Monthly report for parents',
    statementTitle: 'Monthly Progress Statement',
    reportNo: 'Report no.',
    period: 'Period',
    grade: 'Grade',
    teacher: 'Teacher',
    scope: 'Memorized so far',
    summary: 'Summary',
    summaryHint: 'An honest two-line account of this month',
    teacherGrade: "Teacher's overall grade",
    planVsDone: 'Plan vs. achieved',
    planVsDoneHint: 'What was agreed at the start of the month, and what actually happened',
    item: 'Item', planned: 'Planned', done: 'Achieved', ratio: 'Completion', status: 'Status',
    mastery: 'Mastery level',
    masteryHint: 'Grades rest on recorded evidence; with fewer than 3 pieces we give no grade',
    evidence: (n) => `${n} ${n === 1 ? 'record' : 'records'}`,
    insufficient: 'Not enough data',
    vsLast: 'vs. last month',
    same: 'steady',
    strengths: 'Strengths',
    needs: 'Needs attention',
    journey: 'Road to completing the Quran',
    juzDone: 'Memorized juz', juzPart: 'In progress', juzTodo: 'Not started',
    juzOf: (x) => `${x} of 30 juz`,
    nextPlan: "Next month's plan",
    nextPlanHint: "Measurable goals — next month's report will be checked against them",
    homeRole: 'How home can help',
    teacherNote: "Teacher's word",
    signature: "Teacher's signature", stamp: 'Stamp',
    sources: 'What this report is based on',
    completeness: 'Data completeness',
    issued: 'Issued',
    verse: 'وَقُل رَّبِّ زِدْنِي عِلْمًا',
    attendance: 'Attendance',
    calendar: 'Attendance calendar',
    present: 'Present', excused: 'Excused', absent: 'Absent', late: 'Late', noSession: 'No class',
    weeks: 'Weekly rhythm',
    weeksHint: 'New verses each week and the recitation-test score',
    week: (n) => `Week ${n}`,
    newAyahs: 'new verses',
    memoPath: 'Memorization path',
    from: 'From', to: 'To', target: 'Target',
    honest: 'Honestly',
    went: 'What went well',
    notWent: "What didn't go as planned",
    ofPlan: 'of plan',
    sessions: 'classes',
    days: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    daysShort: ['S','M','T','W','T','F','S'],
    ui: { lang: 'العربية', strong: 'Strong student', needs: 'Needs follow-up', print: 'Print', back: 'All previews' }
  }
};

// ---------- تقويم أكتوبر 2026 (يبدأ الخميس) — حصص الأحد/الثلاثاء/الخميس ----------
const SESSION_DAYS = [1, 4, 6, 8, 11, 13, 15, 18, 20, 22, 25, 27, 29];
function buildCalendar(overrides) {
  const days = [];
  for (let d = 1; d <= 31; d++) days.push({ d, s: SESSION_DAYS.includes(d) ? (overrides[d] || 'p') : '-' });
  return days;
}

// ---------- الحالتان ----------
export const SCENARIOS = {
  strong: {
    name: { ar: 'يوسف أحمد', en: 'Yousef Ahmed' }, initial: { ar: 'ي', en: 'Y' },
    grade: { ar: 'الرابع الابتدائي', en: 'Grade 4' },
    teacher: { ar: 'أ. محمد عبد الله', en: 'Mr. Mohamed Abdullah' },
    scope: { ar: 'جزء عمّ كاملًا + النازعات', en: 'Juz 30 complete + An-Nazi‘at' },
    reportNo: 'MR-2026-10-0147',
    period: { ar: 'أكتوبر 2026 · ربيع الآخر – جمادى الأولى 1448 هـ', en: 'October 2026 · Rabi‘ II – Jumada I 1448 AH' },
    monthShort: { ar: 'أكتوبر 2026', en: 'October 2026' },
    issued: { ar: '1 نوفمبر 2026', en: '1 Nov 2026' },
    teacherGrade: { score: 91 },
    verdict: {
      ar: 'شهر ممتاز: تجاوز يوسف خطة الحفظ (46 آية من 40) بإتقان عالٍ، والتزم بالحضور والواجبات. الملاحظة الوحيدة الواضحة: تطبيق حكم الإخفاء أثناء التلاوة السريعة يحتاج ضبطًا.',
      en: 'An excellent month: Yousef exceeded his memorization plan (46 of 40 verses) with high accuracy and kept up attendance and homework. The one clear note: applying ikhfa’ during faster recitation needs work.'
    },
    facts: [
      { ar: '46 آية جديدة', en: '46 new verses' },
      { ar: '12 من 13 حصة', en: '12 of 13 classes' },
      { ar: '8 من 8 واجبات', en: '8 of 8 homework' }
    ],
    plan: [
      { k: 'memo',    ar: 'الحفظ الجديد', en: 'New memorization', unit: { ar: 'آية', en: 'verses' }, planned: 40, done: 46 },
      { k: 'review',  ar: 'المراجعة',     en: 'Revision',         unit: { ar: 'صفحة', en: 'pages' },  planned: 60, done: 52 },
      { k: 'att',     ar: 'الحضور',       en: 'Attendance',       unit: { ar: 'حصة', en: 'classes' }, planned: 13, done: 12 },
      { k: 'hw',      ar: 'الواجبات',     en: 'Homework',         unit: { ar: 'واجب', en: 'tasks' },  planned: 8,  done: 8 },
      { k: 'tajweed', ar: 'حكم تجويد جديد', en: 'New tajweed rule', unit: { ar: 'حكم', en: 'rule' }, planned: 1,  done: 1 }
    ],
    mastery: [
      { k: 'memoQ',   ar: 'جودة الحفظ الجديد',  en: 'New memorization accuracy', src: { ar: 'اختبارات التسميع', en: 'recitation tests' }, score: 92, n: 7, prev: 88 },
      { k: 'reviewQ', ar: 'تثبيت المراجعة',      en: 'Revision retention',        src: { ar: 'جلسات المراجعة',   en: 'revision sessions' }, score: 84, n: 9, prev: 80 },
      { k: 'tajT',    ar: 'التجويد (نظري)',      en: 'Tajweed (theory)',          src: { ar: 'أسئلة الأحكام',    en: 'rule quizzes' },      score: 95, n: 4, prev: 90 },
      { k: 'tajP',    ar: 'التجويد (تطبيق)',     en: 'Tajweed (in recitation)',   src: { ar: 'ملاحظات التلاوة',  en: 'recitation notes' },  score: 74, n: 5, prev: 72 },
      { k: 'hwQ',     ar: 'جودة الواجبات',       en: 'Homework quality',          src: { ar: 'واجبات مصحَّحة',   en: 'graded homework' },   score: 90, n: 8, prev: 86 }
    ],
    strengths: [
      { ar: 'تجاوز خطة الحفظ بـ 6 آيات مع دقة 92% في التسميع.', en: 'Beat the memorization plan by 6 verses at 92% recitation accuracy.' },
      { ar: 'سلّم كل الواجبات في موعدها، ومتوسطها 90%.', en: 'Handed in every homework on time, averaging 90%.' },
      { ar: 'عالج 6 أخطاء متكررة (منها متشابهات النبأ والنازعات).', en: 'Fixed 6 recurring mistakes (incl. similar verses in An-Naba’ / An-Nazi‘at).' }
    ],
    needs: [
      { ar: 'تطبيق الإخفاء عمليًا 74% فقط مقابل 95% نظريًا — يعرف الحكم ولا يطبّقه دائمًا عند الإسراع.', en: 'Ikhfa’ in practice is 74% vs 95% in theory — he knows the rule but drops it when reading fast.' },
      { ar: 'المراجعة 52 من 60 صفحة؛ جزء تبارك (29) أقل الأجزاء مراجعةً.', en: 'Revision reached 52 of 60 pages; Juz 29 was the least revised.' },
      { ar: 'خطآن لا يزالان قيد الإصلاح.', en: 'Two mistakes are still being fixed.' }
    ],
    juz: { full: 1, partialPct: 30, total: 1.3 },
    weeks: [{ n: 12, t: 90 }, { n: 10, t: 88 }, { n: 14, t: 95 }, { n: 10, t: 94 }],
    path: { from: { ar: 'النازعات 1', en: 'An-Nazi‘at 1' }, to: { ar: 'النازعات 46', en: 'An-Nazi‘at 46' }, target: { ar: 'النازعات 40', en: 'An-Nazi‘at 40' } },
    calendar: buildCalendar({ 20: 'e', 8: 'l' }),
    next: [
      { ar: 'حفظ سورة عبس كاملة (42 آية).', en: 'Memorize Surah ‘Abasa in full (42 verses).' },
      { ar: 'مراجعة 60 صفحة مع أولوية لجزء تبارك.', en: 'Revise 60 pages, prioritising Juz 29.' },
      { ar: 'رفع تطبيق الإخفاء من 74% إلى 85% في التلاوة.', en: 'Lift ikhfa’ in recitation from 74% to 85%.' }
    ],
    home: [
      { ar: 'استماع 10 دقائق يوميًا لتلاوته من النازعات مع التنبيه على الإخفاء.', en: 'Listen to him recite An-Nazi‘at for 10 minutes a day, pointing out ikhfa’.' },
      { ar: 'تشجيعه على الإبطاء قليلًا عند التلاوة — السرعة سبب أغلب أخطائه.', en: 'Encourage him to slow down a little — speed causes most of his mistakes.' }
    ],
    note: {
      ar: 'يوسف من أكثر الطلاب انضباطًا هذا الشهر، وحفظه متين. أطمح أن يصبح أداؤه التجويدي في التلاوة بنفس مستوى معرفته النظرية، وهذا قريب بإذن الله.',
      en: 'Yousef was among the most disciplined students this month and his memorization is solid. I want his applied tajweed to match his theory — and that is within reach, God willing.'
    },
    sources: { sessions: 12, tests: 7, homework: 8, reviews: 9, notes: 5 },
    complete: { ok: true, ar: 'مكتملة — سُجِّلت بداية الشهر ونهايته وكل الحصص', en: 'Complete — start and end of month and every class recorded' },
    errors: { resolved: 6, pending: 2 }
  },

  needs: {
    name: { ar: 'عمر خالد', en: 'Omar Khaled' }, initial: { ar: 'ع', en: 'O' },
    grade: { ar: 'الثالث الابتدائي', en: 'Grade 3' },
    teacher: { ar: 'أ. محمد عبد الله', en: 'Mr. Mohamed Abdullah' },
    scope: { ar: 'من الناس إلى النازعات', en: 'An-Nas to An-Nazi‘at' },
    reportNo: 'MR-2026-10-0152',
    period: { ar: 'أكتوبر 2026 · ربيع الآخر – جمادى الأولى 1448 هـ', en: 'October 2026 · Rabi‘ II – Jumada I 1448 AH' },
    monthShort: { ar: 'أكتوبر 2026', en: 'October 2026' },
    issued: { ar: '1 نوفمبر 2026', en: '1 Nov 2026' },
    teacherGrade: { score: 66 },
    verdict: {
      ar: 'شهر دون المعتاد: حفظ عمر 17 آية من 40، والسبب الأوضح 4 غيابات بلا عذر في الأسبوعين الثاني والرابع. حين يحضر يحفظ جيدًا (3 من 5 اختبارات فوق 80%)، فالمشكلة في الانتظام لا في القدرة.',
      en: 'A below-usual month: Omar memorized 17 of 40 verses, mainly because of 4 unexcused absences in weeks 2 and 4. When he attends he memorizes well (3 of 5 tests above 80%) — the issue is consistency, not ability.'
    },
    facts: [
      { ar: '17 من 40 آية', en: '17 of 40 verses' },
      { ar: '8 من 13 حصة', en: '8 of 13 classes' },
      { ar: '4 من 8 واجبات', en: '4 of 8 homework' }
    ],
    plan: [
      { k: 'memo',    ar: 'الحفظ الجديد', en: 'New memorization', unit: { ar: 'آية', en: 'verses' }, planned: 40, done: 17 },
      { k: 'review',  ar: 'المراجعة',     en: 'Revision',         unit: { ar: 'صفحة', en: 'pages' },  planned: 60, done: 24 },
      { k: 'att',     ar: 'الحضور',       en: 'Attendance',       unit: { ar: 'حصة', en: 'classes' }, planned: 13, done: 8 },
      { k: 'hw',      ar: 'الواجبات',     en: 'Homework',         unit: { ar: 'واجب', en: 'tasks' },  planned: 8,  done: 4 },
      { k: 'tajweed', ar: 'حكم تجويد جديد', en: 'New tajweed rule', unit: { ar: 'حكم', en: 'rule' }, planned: 1,  done: 1 }
    ],
    mastery: [
      { k: 'memoQ',   ar: 'جودة الحفظ الجديد',  en: 'New memorization accuracy', src: { ar: 'اختبارات التسميع', en: 'recitation tests' }, score: 78, n: 5, prev: 74 },
      { k: 'reviewQ', ar: 'تثبيت المراجعة',      en: 'Revision retention',        src: { ar: 'جلسات المراجعة',   en: 'revision sessions' }, score: 63, n: 4, prev: 70 },
      { k: 'tajT',    ar: 'التجويد (نظري)',      en: 'Tajweed (theory)',          src: { ar: 'أسئلة الأحكام',    en: 'rule quizzes' },      score: 80, n: 3, prev: 76 },
      { k: 'tajP',    ar: 'التجويد (تطبيق)',     en: 'Tajweed (in recitation)',   src: { ar: 'ملاحظات التلاوة',  en: 'recitation notes' },  score: 70, n: 1, prev: null },
      { k: 'hwQ',     ar: 'جودة الواجبات',       en: 'Homework quality',          src: { ar: 'واجبات مصحَّحة',   en: 'graded homework' },   score: 76, n: 4, prev: 82 }
    ],
    strengths: [
      { ar: 'حين يحضر يحفظ جيدًا: 3 من 5 اختبارات تسميع فوق 80%.', en: 'When present he memorizes well: 3 of 5 recitation tests above 80%.' },
      { ar: 'تحسّن واضح في مخارج الحروف عن الشهر الماضي.', en: 'Clear improvement in letter articulation since last month.' },
      { ar: 'أتقن نظريًا حكم الإظهار الحلقي.', en: 'Mastered the theory of izhar halqi.' }
    ],
    needs: [
      { ar: '4 غيابات بلا عذر (11 و13 و25 و27 أكتوبر) — الأسبوع الثالث بلا أي حفظ جديد.', en: '4 unexcused absences (Oct 11, 13, 25, 27) — week 3 had no new memorization at all.' },
      { ar: '4 واجبات لم تُسلَّم من أصل 8.', en: '4 of 8 homework tasks were not handed in.' },
      { ar: 'المراجعة 24 من 60 صفحة فقط، وتراجع تثبيتها من 70% إلى 63%.', en: 'Only 24 of 60 revision pages, and retention dropped from 70% to 63%.' },
      { ar: '6 أخطاء متكررة لا تزال قيد الإصلاح.', en: '6 recurring mistakes are still being fixed.' }
    ],
    juz: { full: 0, partialPct: 85, total: 0.85 },
    weeks: [{ n: 8, t: 84 }, { n: 6, t: 72 }, { n: 0, t: null }, { n: 3, t: 81 }],
    path: { from: { ar: 'عبس 1', en: '‘Abasa 1' }, to: { ar: 'عبس 17', en: '‘Abasa 17' }, target: { ar: 'عبس 40', en: '‘Abasa 40' } },
    calendar: buildCalendar({ 11: 'a', 13: 'a', 25: 'a', 27: 'a', 18: 'e', 6: 'l' }),
    next: [
      { ar: 'إكمال سورة عبس (25 آية متبقية) — هدف واقعي بدل 40.', en: 'Finish Surah ‘Abasa (25 verses left) — a realistic goal instead of 40.' },
      { ar: 'حضور 12 حصة على الأقل من 13.', en: 'Attend at least 12 of 13 classes.' },
      { ar: 'مراجعة 40 صفحة وتسليم كل الواجبات.', en: 'Revise 40 pages and hand in every homework.' }
    ],
    home: [
      { ar: 'الحرص على الحضور؛ وإن تعذّر فإبلاغ المعلم مسبقًا لترتيب تعويض.', en: 'Make attendance a priority; if he must miss, tell the teacher ahead so a make-up can be arranged.' },
      { ar: '10 دقائق مراجعة يومية بعد المغرب من سورتي النبأ والنازعات.', en: '10 minutes of daily revision after Maghrib from An-Naba’ and An-Nazi‘at.' },
      { ar: 'متابعة الواجب قبل موعده بيوم.', en: 'Check his homework a day before it is due.' }
    ],
    note: {
      ar: 'عمر قادر على الحفظ الجيد، وقد رأيت ذلك في كل حصة حضرها. ما ينقصه هو الانتظام، وأثق أنه بتعاوننا معًا سيعود لمستواه في الشهر القادم.',
      en: 'Omar can memorize well — I saw it in every class he attended. What he lacks is consistency, and I trust that working together he will be back on track next month.'
    },
    sources: { sessions: 8, tests: 5, homework: 4, reviews: 4, notes: 1 },
    complete: { ok: true, ar: 'مكتملة — مع ملاحظة: تطبيق التجويد دليل واحد فقط فلم يُقيَّم', en: 'Complete — note: applied tajweed has a single record, so it was not graded' },
    errors: { resolved: 2, pending: 6 }
  }
};

// ---------- حالة الواجهة (لغة + حالة) ----------
export function setupPreview(render) {
  const qs = new URLSearchParams(location.search);
  const state = {
    lang: qs.get('lang') === 'en' ? 'en' : 'ar',
    sc: qs.get('s') === 'needs' ? 'needs' : 'strong'
  };
  const apply = () => {
    const T = L[state.lang];
    document.documentElement.lang = state.lang;
    document.documentElement.dir = T.dir;
    document.querySelectorAll('[data-ui]').forEach(el => { el.textContent = T.ui[el.dataset.ui]; });
    document.querySelectorAll('[data-sc]').forEach(el => el.classList.toggle('on', el.dataset.sc === state.sc));
    const u = new URL(location.href); u.searchParams.set('lang', state.lang); u.searchParams.set('s', state.sc);
    history.replaceState(null, '', u);
    render({ T, D: SCENARIOS[state.sc], lang: state.lang, tx: (o) => (o && typeof o === 'object' ? o[state.lang] : o) });
  };
  document.querySelectorAll('[data-sc]').forEach(b => b.addEventListener('click', () => { state.sc = b.dataset.sc; apply(); }));
  const lb = document.getElementById('btn-lang');
  if (lb) lb.addEventListener('click', () => { state.lang = state.lang === 'ar' ? 'en' : 'ar'; apply(); });
  const pb = document.getElementById('btn-print');
  if (pb) pb.addEventListener('click', () => window.print());
  apply();
}

export const pct = (done, planned) => Math.round((done / planned) * 100);
export const delta = (now, prev) => (prev == null ? null : now - prev);
