// core/i18n-badges.js
// =============================================================================
// نصوص الأوسمة والحضور وتوقع الختم وخطة الشهر القادم (عربي/English) — تُدمج في نفس كائن translations الذي تستعمله المنصة كلها
// (core/i18n.js)، فتعمل t() وtf() وdata-i18n عليها كأي مفتاح آخر. يُستورد هذا الملف من كل وحدة تستعمل هذه المفاتيح.
// =============================================================================
import { translations } from './i18n.js';

const BADGES = {
    skilled:  ['الماهر', 'The Skilled', 'ألعاب فردية بنتيجة ٩٠٪ فأكثر (حتى لعبتين في اليوم)', 'Individual games scoring 90%+ (max 2 per day)', 'الألعاب', 'games'],
    perfect:  ['الكامل', 'The Perfect', 'ألعاب فردية بنتيجة ١٠٠٪ (حتى لعبتين في اليوم)', 'Individual games scoring 100% (max 2 per day)', 'الألعاب', 'games'],
    active:   ['المثابر', 'The Persistent', 'ألعاب فردية جادّة بنتيجة ٥٠٪ فأكثر (حتى لعبتين في اليوم)', 'Serious individual games scoring 50%+ (max 2 per day)', 'الألعاب', 'games'],
    fixer:    ['المُصلِح', 'The Fixer', 'جلسات «تحدي الأخطاء» بنتيجة ٨٠٪ فأكثر', '“Fix the mistakes” challenge sessions scoring 80%+', 'الجلسات', 'sessions'],
    riser:    ['الصاعد', 'The Riser', 'ارتفاع متوسط نتائج الألعاب عن الشهر السابق (٣ ألعاب على الأقل في كل شهر)', 'Rise in average game score vs. last month (at least 3 games each month)', 'النقاط', 'points'],
    hero:     ['البطل', 'The Champion', 'آيات حفظ جديدة سُجّلت هذا الشهر', 'New memorized ayahs recorded this month', 'الآيات', 'ayahs'],
    rasikh:   ['الراسخ', 'The Steadfast', 'أجزاء راجعها الطالب وسُجّلت مراجعتها هذا الشهر', 'Parts reviewed and recorded this month', 'الأجزاء', 'parts'],
    star:     ['النجم', 'The Star', 'إجابات صحيحة على «السؤال المميز»', 'Correct answers on the “featured question”', 'الأسئلة', 'questions'],
    steady:   ['المواظب', 'The Dedicated', 'نسبة الحضور من الحصص المجدولة (الماسي: ١٠٠٪ مع ٨ حصص على الأقل)', 'Attendance of scheduled sessions (Diamond: 100% with at least 8 sessions)', 'النسبة ٪', 'percent'],
    tjLearn:  ['المتعلّم', 'The Learner', 'أحكام تجويد أنهى شرحها هذا الشهر', 'Tajweed rules whose lesson was completed this month', 'الأحكام', 'rules'],
    tjApply:  ['المطبِّق', 'The Practitioner', 'أحكام تجويد اجتاز تطبيقها (ألعابها) هذا الشهر', 'Tajweed rules whose practice games were passed this month', 'الأحكام', 'rules'],
    tjExam:   ['الألمعي', 'The Brilliant', 'أحكام اجتاز اختبارها من أول محاولة', 'Tajweed rules whose exam was passed on the first attempt', 'الأحكام', 'rules'],
    tjMaster: ['متقن التجويد', 'Tajweed Master', 'أحكام تجويد اعتمدها المعلم هذا الشهر', 'Tajweed rules approved by the teacher this month', 'الأحكام', 'rules'],
    duelist:  ['المنافس', 'The Duelist', 'مواجهات ثنائية فاز بها هذا الشهر', 'Head-to-head matches won this month', 'الانتصارات', 'wins']
};
const UNITS_EN = { games: 'Games', sessions: 'Sessions', points: 'Points', ayahs: 'Ayahs', parts: 'Parts', questions: 'Questions', percent: 'Attendance %', rules: 'Rules', wins: 'Wins' };

const ar = {
    ms_card_sched_title: 'جدول الحصص والحضور', ms_card_sched_desc: 'أيام كل طالب ووقت سؤال الحضور',
    att_time_title: 'متى تحب أن يظهر سؤال الحضور؟', att_time_sub: 'يظهر مرة يوميًا بعد هذا الوقت، وفقط عن طلاب لهم حصة اليوم ولم يُسجَّل لهم أي نشاط. اختر وقتًا يناسب عملك (صباحًا أو مساءً).', att_time_enable: 'اسألني عن الحضور', att_time_save: 'حفظ', att_time_label: 'وقت السؤال',
    att_time_summary: 'سؤال الحضور: كل يوم بعد {t}', att_time_off: 'سؤال الحضور متوقف', att_time_change: 'تغيير',
    att_mgr_title: 'جدول الحصص والحضور', att_mgr_empty: 'لا طلاب بعد. أضف طالبًا أولًا.', att_mgr_days: '{d}', att_mgr_none: 'بلا جدول', att_mgr_close: 'إغلاق', att_mgr_edit: 'تعديل',
    bdg_save_img: 'حفظ كصورة', bdg_share_wa: 'إرسال واتساب', bdg_sound_on: 'تفعيل الصوت', bdg_sound_off: 'كتم الصوت', bdg_card_msg: '🏅 حصل {name} على وسام «{badge}» — الدرجة {tier}! بارك الله في جهده.',
    bdg_card_wa_note: 'نُزِّلت صورة الوسام. سيفتح واتساب لترفقها بالرسالة.', bdg_card_wa_btn: 'فتح واتساب', bdg_card_footer: 'بارك الله في جهدك',
    // الدرجات
    bdg_tier_bronze: 'البرونزية', bdg_tier_silver: 'الفضية', bdg_tier_gold: 'الذهبية', bdg_tier_diamond: 'الماسية',
    bdg_tier_n_bronze: 'برونزي', bdg_tier_n_silver: 'فضي', bdg_tier_n_gold: 'ذهبي', bdg_tier_n_diamond: 'ماسي',
    // المجموعات
    bdg_group_games: 'الألعاب الفردية', bdg_group_memorize: 'الحفظ والمراجعة', bdg_group_engage: 'الالتزام', bdg_group_tajweed: 'التجويد', bdg_group_duels: 'الاختبارات الثنائية',
    // المشهد السينمائي
    bdg_kicker: 'وسام جديد!', bdg_tier_chip: 'الدرجة {tier}', bdg_next_left: 'باقي {k} للدرجة {tier}', bdg_continue: 'متابعة', bdg_next: 'التالي', bdg_summary: 'عرض الملخص', bdg_close: 'إغلاق',
    bdg_board_title: 'أوسمتك هذا الشهر', bdg_board_count: 'أوسمة', bdg_board_note: 'أحسنت! هذه ثمرة جهدك الصادق. ننتظر المزيد الشهر القادم.',
    bdg_reason: '{desc}: {n}',
    // الخزانة
    bdg_cabinet_title: 'خزانة الأوسمة', bdg_cabinet_sub: 'الأوسمة التي نالها الطالب شهرًا بعد شهر، وأعلى درجة بلغها في كل وسام', bdg_cabinet_empty: 'لا أوسمة بعد — كل لعبة وكل حصة تقرّبه من أول وسام.',
    bdg_cabinet_best: 'أعلى درجة: {tier}', bdg_cabinet_months: 'نالها في {n} شهرًا', bdg_cabinet_replay: 'أعد المشهد', bdg_cabinet_ceremony: 'حفل أوسمة هذا الشهر', bdg_cabinet_locked: 'لم يُنَل بعد',
    bdg_cabinet_how: 'كيف يُنال؟', bdg_cabinet_thresholds: 'العتبات', bdg_cabinet_gold_months: 'ذهبي فأعلى في {n} أشهر', bdg_cabinet_this_month: 'هذا الشهر', bdg_cabinet_tap: 'اضغط على أي وسام لمعرفة كيف يُنال',
    bdg_title_steady: 'ثابت', bdg_title_radiant: 'متألق', bdg_title_legend: 'أسطورة', att_sched_none: 'لا جدول بعد', att_sched_clear: 'مسح الجدول',
    // التقرير: الأوسمة
    bdg_rep_title: 'أوسمة هذا الشهر', bdg_rep_sub: 'أوسمة نالها {name} هذا الشهر من أدائه المسجَّل فقط', bdg_rep_total: '{n} أوسمة', bdg_rep_none: 'لم يُسجَّل وسام هذا الشهر بعد.',
    bdg_rep_closest: 'أقرب وسام قادم: {badge} — باقي {k}', bdg_rep_legend: 'مفتاح الأوسمة وكيف تُنال', bdg_rep_legend_sub: 'كل وسام له أربع درجات، والرقم هو الحد الأدنى للحصول على الدرجة في الشهر الواحد',
    bdg_rep_value: 'حقّق {n}', bdg_rep_tiers_line: 'برونزي {a} · فضي {b} · ذهبي {c} · ماسي {d}',
    // التقرير: الحضور
    att_rep_title: 'الحضور والالتزام', att_rep_sub: 'حسب سجل المعلم لهذا الشهر', att_rep_expected: 'الحصص المقررة', att_rep_present: 'حضر', att_rep_absent: 'غياب',
    att_rep_hours: 'الساعات (تقدير)', att_rep_pct: 'نسبة الحضور', att_rep_cancelled: 'حصص لم تُعقد', att_rep_extra: 'حصص إضافية', att_rep_unconfirmed: 'غير مؤكَّدة', att_rep_session_len: 'مدة الحصة {n} دقيقة',
    att_rep_no_schedule: 'لم يُحدَّد جدول حصص لهذا الطالب بعد.', att_rep_note_hours: 'الساعات = الحصص الحاضرة × مدة الحصة.',
    // الحضور: الجدول والسؤال
    att_sched_title: 'جدول الحصص', att_sched_days: 'أيام الحصص', att_sched_minutes: 'مدة الحصة (دقيقة)', att_sched_save: 'حفظ الجدول', att_sched_saved: 'تم حفظ الجدول', att_sched_hint: 'يُحسب منه الحضور المتوقع والساعات. أي نشاط للطالب في يوم حصته يسجّل حضوره تلقائيًا.',
    att_day_0: 'الأحد', att_day_1: 'الإثنين', att_day_2: 'الثلاثاء', att_day_3: 'الأربعاء', att_day_4: 'الخميس', att_day_5: 'الجمعة', att_day_6: 'السبت',
    att_prompt_title: 'تأكيد حضور اليوم', att_prompt_sub: 'طلاب لهم حصة اليوم ولم يُسجَّل لهم أي نشاط. هل حضروا؟', att_prompt_present: 'حضر', att_prompt_absent: 'غاب', att_prompt_cancelled: 'لم تُعقد',
    att_prompt_later: 'لاحقًا', att_prompt_done: 'تم', att_prompt_day: 'حصة يوم {d}',
    // التقرير: التجويد
    tjr_title: 'التجويد هذا الشهر', tjr_sub: 'خطوات رحلة الأحكام المسجَّلة هذا الشهر', tjr_theory: 'النظري (شرح، تطبيق، اختبار)', tjr_practice: 'العملي (تسميع المعلم)',
    tjr_learned: 'أحكام أنهى شرحها', tjr_practiced: 'أحكام اجتاز تطبيقها', tjr_exam: 'أحكام اجتاز اختبارها', tjr_exam_first: 'منها من أول محاولة', tjr_approved: 'أحكام اعتمدها المعلم', tjr_none: 'لا نشاط تجويد مسجَّل هذا الشهر.',
    // التقرير: الختم
    khm_title: 'الطريق إلى ختم القرآن', khm_sub: 'تقدير مبني على وتيرة حفظ {name} الفعلية — وهو تقدير وليس وعدًا', khm_pos: 'موضع الحفظ الحالي', khm_pace: 'الوتيرة: ≈ {p} صفحة لكل حصة ({m} صفحة شهريًا)',
    khm_basis_default: 'تقدير مبدئي: لا بيانات كافية بعد', khm_m_juz: 'إتمام الجزء الحالي', khm_m_five: 'خمسة أجزاء', khm_m_quarter: 'ربع القرآن', khm_m_half: 'نصف القرآن', khm_m_khatm: 'ختم القرآن',
    khm_row: '≈ {s} حصة — حتى {d}', khm_row_avg: 'وعلى نسبة حضوره الفعلية: حتى {d}', khm_done: 'أتمّه ✓', khm_none: 'لا بيانات كافية لتقدير الختم بعد (يلزم شهر واحد مقفل على الأقل).',
    khm_foot: 'المسار من سورة الناس إلى الفاتحة. التقدير يتغيّر بتغيّر الوتيرة والحضور.',
    // التقرير: خطة الشهر القادم
    pln_title: 'خطة الشهر القادم', pln_disclaimer: 'تصوّر مبدئي مقترح بناءً على أداء هذا الشهر، وهو قابل للتغيير حسب مستوى الطالب وظروف الحلقة، وليس التزامًا نهائيًا.',
    pln_new: 'الحفظ الجديد', pln_new_val: 'نحو {n} صفحة تقريبًا خلال {s} حصص', pln_new_none: 'يحدّده المعلم بعد تسجيل حفظ شهر مقفل',
    pln_near: 'المراجعة القريبة', pln_near_val: 'ما حُفظ هذا الشهر ({n} آية) موزّعًا على أسابيع الشهر', pln_near_none: 'محفوظ هذا الشهر مقسَّمًا على الأسابيع',
    pln_far: 'المراجعة البعيدة', pln_far_val: 'أجزاء مستحقة: {parts}', pln_far_none: 'الأجزاء الأقدم حسب جدول المراجعة',
    pln_tajweed: 'التجويد', pln_tajweed_val: 'متابعة المسار: {rule}', pln_tajweed_none: 'متابعة المسار من حيث وقف الطالب',
    pln_focus: 'التركيز', pln_focus_val: 'تقوية: {skill}', pln_week: 'الأسبوع {n}',
    // اكتمال البيانات
    cmp_title: 'اكتمال بيانات التقرير', cmp_ok: 'البيانات مكتملة لهذا الشهر.', cmp_missing: 'بيانات ناقصة قد تُنقص دقة التقرير:',
    cmp_no_schedule: 'لم يُحدَّد جدول الحصص (لا يمكن حساب الحضور).', cmp_unconfirmed: '{n} حصة مجدولة بلا تأكيد حضور.', cmp_no_ending: 'لم يُسجَّل موضع نهاية الشهر.', cmp_no_games: 'لا ألعاب فردية مسجَّلة هذا الشهر.',
    cmp_open_att: 'تأكيد الحضور الآن',
    // الاختبارات الثنائية (أول اسم الخصم)
    dual_opponent_first: 'اسم الخصم يظهر بالاسم الأول فقط',
    tier_word: 'الدرجة'
};
const en = {
    ms_card_sched_title: 'Schedule & attendance', ms_card_sched_desc: 'Each student’s days and the attendance question time',
    att_time_title: 'When should the attendance question appear?', att_time_sub: 'It appears once a day after this time, only for students with a session today and no recorded activity. Pick a time that fits your work (morning or evening).', att_time_enable: 'Ask me about attendance', att_time_save: 'Save', att_time_label: 'Question time',
    att_time_summary: 'Attendance question: every day after {t}', att_time_off: 'Attendance question is off', att_time_change: 'Change',
    att_mgr_title: 'Schedule & attendance', att_mgr_empty: 'No students yet. Add a student first.', att_mgr_days: '{d}', att_mgr_none: 'No schedule', att_mgr_close: 'Close', att_mgr_edit: 'Edit',
    bdg_save_img: 'Save as image', bdg_share_wa: 'Send via WhatsApp', bdg_sound_on: 'Turn sound on', bdg_sound_off: 'Mute sound', bdg_card_msg: '🏅 {name} earned the “{badge}” badge — {tier} tier! May Allah bless the effort.',
    bdg_card_wa_note: 'The badge image was downloaded. WhatsApp will open so you can attach it.', bdg_card_wa_btn: 'Open WhatsApp', bdg_card_footer: 'May Allah bless your effort',
    bdg_tier_bronze: 'Bronze', bdg_tier_silver: 'Silver', bdg_tier_gold: 'Gold', bdg_tier_diamond: 'Diamond',
    bdg_tier_n_bronze: 'Bronze', bdg_tier_n_silver: 'Silver', bdg_tier_n_gold: 'Gold', bdg_tier_n_diamond: 'Diamond',
    bdg_group_games: 'Individual games', bdg_group_memorize: 'Memorization & review', bdg_group_engage: 'Commitment', bdg_group_tajweed: 'Tajweed', bdg_group_duels: 'Head-to-head tests',
    bdg_kicker: 'NEW BADGE!', bdg_tier_chip: '{tier} tier', bdg_next_left: '{k} left for {tier}', bdg_continue: 'Continue', bdg_next: 'Next', bdg_summary: 'Show summary', bdg_close: 'Close',
    bdg_board_title: 'Your badges this month', bdg_board_count: 'badges', bdg_board_note: 'Well done! This is the fruit of your honest effort. See you next month.',
    bdg_reason: '{desc}: {n}',
    bdg_cabinet_title: 'Badge cabinet', bdg_cabinet_sub: 'Badges earned month by month, and the highest tier reached in each', bdg_cabinet_empty: 'No badges yet — every game and every session brings the first one closer.',
    bdg_cabinet_best: 'Best tier: {tier}', bdg_cabinet_months: 'Earned in {n} months', bdg_cabinet_replay: 'Replay', bdg_cabinet_ceremony: 'This month’s ceremony', bdg_cabinet_locked: 'Not earned yet',
    bdg_cabinet_how: 'How to earn it', bdg_cabinet_thresholds: 'Thresholds', bdg_cabinet_gold_months: 'Gold or higher in {n} months', bdg_cabinet_this_month: 'This month', bdg_cabinet_tap: 'Tap any badge to see how to earn it',
    bdg_title_steady: 'Steady', bdg_title_radiant: 'Radiant', bdg_title_legend: 'Legend', att_sched_none: 'No schedule yet', att_sched_clear: 'Clear schedule',
    bdg_rep_title: 'Badges this month', bdg_rep_sub: 'Badges {name} earned this month, from recorded performance only', bdg_rep_total: '{n} badges', bdg_rep_none: 'No badge recorded this month yet.',
    bdg_rep_closest: 'Closest next badge: {badge} — {k} to go', bdg_rep_legend: 'Badge key and how to earn them', bdg_rep_legend_sub: 'Each badge has four tiers; the number is the minimum needed in a single month',
    bdg_rep_value: 'Achieved {n}', bdg_rep_tiers_line: 'Bronze {a} · Silver {b} · Gold {c} · Diamond {d}',
    att_rep_title: 'Attendance & commitment', att_rep_sub: 'According to the teacher’s record this month', att_rep_expected: 'Scheduled sessions', att_rep_present: 'Attended', att_rep_absent: 'Absent',
    att_rep_hours: 'Hours (estimate)', att_rep_pct: 'Attendance', att_rep_cancelled: 'Sessions not held', att_rep_extra: 'Extra sessions', att_rep_unconfirmed: 'Unconfirmed', att_rep_session_len: 'Session length {n} min',
    att_rep_no_schedule: 'No session schedule has been set for this student yet.', att_rep_note_hours: 'Hours = attended sessions × session length.',
    att_sched_title: 'Session schedule', att_sched_days: 'Session days', att_sched_minutes: 'Session length (minutes)', att_sched_save: 'Save schedule', att_sched_saved: 'Schedule saved', att_sched_hint: 'Used to compute expected attendance and hours. Any activity by the student on a session day records attendance automatically.',
    att_day_0: 'Sunday', att_day_1: 'Monday', att_day_2: 'Tuesday', att_day_3: 'Wednesday', att_day_4: 'Thursday', att_day_5: 'Friday', att_day_6: 'Saturday',
    att_prompt_title: 'Confirm today’s attendance', att_prompt_sub: 'These students had a session today and no activity was recorded. Did they attend?', att_prompt_present: 'Attended', att_prompt_absent: 'Absent', att_prompt_cancelled: 'Not held',
    att_prompt_later: 'Later', att_prompt_done: 'Done', att_prompt_day: 'Session on {d}',
    tjr_title: 'Tajweed this month', tjr_sub: 'Rule-journey steps recorded this month', tjr_theory: 'Theory (lesson, practice, exam)', tjr_practice: 'Practical (teacher recitation)',
    tjr_learned: 'Rules whose lesson was completed', tjr_practiced: 'Rules whose practice was passed', tjr_exam: 'Rules whose exam was passed', tjr_exam_first: 'of them on first attempt', tjr_approved: 'Rules approved by the teacher', tjr_none: 'No tajweed activity recorded this month.',
    khm_title: 'The road to completing the Quran', khm_sub: 'An estimate based on {name}’s actual memorization pace — an estimate, not a promise', khm_pos: 'Current memorization position', khm_pace: 'Pace: ≈ {p} pages per session ({m} pages a month)',
    khm_basis_default: 'Preliminary estimate: not enough data yet', khm_m_juz: 'Finish the current juz', khm_m_five: 'Five juz', khm_m_quarter: 'A quarter of the Quran', khm_m_half: 'Half of the Quran', khm_m_khatm: 'Complete the Quran',
    khm_row: '≈ {s} sessions — by {d}', khm_row_avg: 'At his/her actual attendance rate: by {d}', khm_done: 'Done ✓', khm_none: 'Not enough data to estimate yet (at least one closed month is needed).',
    khm_foot: 'The path runs from Surat An-Nas to Al-Fatihah. The estimate changes with pace and attendance.',
    pln_title: 'Next month’s plan', pln_disclaimer: 'A preliminary proposal based on this month’s performance. It may change according to the student’s level and circumstances, and is not a final commitment.',
    pln_new: 'New memorization', pln_new_val: 'About {n} pages over {s} sessions', pln_new_none: 'Set by the teacher once a closed month is recorded',
    pln_near: 'Near review', pln_near_val: 'This month’s memorization ({n} ayahs), spread over the weeks', pln_near_none: 'This month’s memorization, spread over the weeks',
    pln_far: 'Far review', pln_far_val: 'Parts due: {parts}', pln_far_none: 'Older parts per the review schedule',
    pln_tajweed: 'Tajweed', pln_tajweed_val: 'Continue the path: {rule}', pln_tajweed_none: 'Continue the path where the student stopped',
    pln_focus: 'Focus', pln_focus_val: 'Strengthen: {skill}', pln_week: 'Week {n}',
    cmp_title: 'Report data completeness', cmp_ok: 'Data is complete for this month.', cmp_missing: 'Missing data that may reduce the report’s accuracy:',
    cmp_no_schedule: 'No session schedule set (attendance cannot be computed).', cmp_unconfirmed: '{n} scheduled sessions without attendance confirmation.', cmp_no_ending: 'The month-end position was not recorded.', cmp_no_games: 'No individual games recorded this month.',
    cmp_open_att: 'Confirm attendance now',
    dual_opponent_first: 'Opponent shown by first name only',
    tier_word: 'Tier'
};
for (const [k, v] of Object.entries(BADGES)) {
    ar['bdg_' + k + '_name'] = v[0]; en['bdg_' + k + '_name'] = v[1];
    ar['bdg_' + k + '_desc'] = v[2]; en['bdg_' + k + '_desc'] = v[3];
    ar['bdg_' + k + '_unit'] = v[4]; en['bdg_' + k + '_unit'] = UNITS_EN[v[5]];
}
Object.assign(translations.ar, ar);
Object.assign(translations.en, en);
