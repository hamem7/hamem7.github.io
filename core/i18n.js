// core/i18n.js
import { AppState } from './app.js';
import { registerTranslator } from './langBridge.js';

// 🌟 القاموس الشامل لكل شاشات المنصة والواجبات الجديدة 🌟
export const translations = {
    ar: {
        header_title: "🏆 رحلة إتقان القرآن",
        header_title_kids: "🎈 ركن الأبطال الصغار",
        header_subtitle: "منصة حمٓ",
        login_kids_title: "تسجيل دخول الأبطال 🎈",
        login_adults_title: "تسجيل الدخول",
        lang_toggle: "English",

        // Splash Screen
        // 🌟 [عدّل] العنوان الرئيسي صار اسم المنصة "منصة حمٓ" (بعلامة المد U+0653 فوق الميم)
        // 🌟 كلمة "حمٓ" في span لتلوينها بالذهبي (يُطبَّق النص عبر innerHTML في applyTranslations)
        splash_title: '<span class="home-title-ha">حمٓ</span> وَٱلۡكِتَٰبِ ٱلۡمُبِينِ',
        splash_subtitle: "منصة حمٓ لتثبيت الحفظ و المراجعة",
        btn_adult: "واجهة الكبار",
        btn_kids: "ركن الأطفال",
        btn_dual: "الاختبارات الثنائية",
        // 🌟 [عدّل] بطاقة "تحدي المتشابهات" في الشاشة الرئيسية — أصبحت الآن تفتح شاشات
        // تصفح وألعاب تفاعلية فعلية كاملة (راجع similarities/ وengine/similarityEngine.js)
        btn_similarities: "تحدي المتشابهات",
        // 🌟 [جديد] بطاقة الدخول لمسار "أبطال التجويد" — لسه قيد البناء على مراحل (راجع
        // مستندي التصميم في مشروع المنصة)، والزر حالياً يعرض رسالة "قيد التطوير" فقط
        btn_tajweed: "أبطال التجويد",
        btn_my_students: "طلابي",
        my_students_title: "طلابي",
        my_students_subtitle: "إدارة سجلات الطلاب",
        // 🌟 [2026-10-03] شاشة «طلابي» بالتصميم الجديد (بطاقات + أرقام)
        ms_back: "العودة للقائمة الرئيسية",
        ms_stat_students: "عدد الطلاب",
        ms_stat_memo: "بانتظار الحفظ",
        ms_stat_reports_generic: "تقارير صُدِّرت",
        ms_stat_reports: "تقارير {month} صُدِّرت",
        ms_section_students: "الطلاب",
        ms_section_monthly_generic: "المتابعة الشهرية",
        ms_section_monthly: "المتابعة الشهرية · {month}",
        ms_card_all_title: "سجل الطلاب",
        ms_card_all_desc: "افتح ملف أي طالب أو عدّل بياناته",
        ms_card_add_title: "طالب جديد",
        ms_card_add_desc: "الاسم فقط مطلوب",
        ms_card_memo_title: "الحفظ الشهري",
        ms_card_memo_desc: "أين توقف كل طالب هذا الشهر؟",
        ms_card_reports_title: "تقارير الشهر",
        ms_card_reports_desc: "واتساب لولي الأمر أو PDF",
        ms_badge_memo: "{n} بانتظارك",
        ms_badge_reports: "{n} متبقية",
        ms_reminder_memo: "طلاب لم يُسجَّل حفظهم الشهري بعد: {n}",
        ms_reminder_start: "ابدأ الآن",
        prep_by: "إعداد معلم القرآن الكريم:",
        teacher_name: "عبدالله بن المياح الأزهري",

        // 🌟 الشاشة الرئيسية الجديدة: قسم "لماذا حمٓ؟" ووصف بطاقات القائمة والفوتر 🌟
        why_darham_title: "لماذا حمٓ؟",
        why_darham_subtitle: "منصة متكاملة لحفظ القرآن ومراجعته وتقييمه",
        why_free_title: "مجانية",
        why_free_desc: "مجانية بالكامل",
        why_complete_title: "شاملة",
        why_complete_desc: "القرآن الكريم كاملاً",
        why_privacy_title: "خصوصية",
        why_privacy_desc: "نهتم بخصوصية المستخدمين",
        why_ages_title: "لجميع الأعمار",
        why_ages_desc: "تجربة للصغار والناشئة والكبار",
        why_eval_title: "تقييم دقيق",
        why_eval_desc: "تحديات متنوعة لقياس إتقان الحفظ",
        why_reports_title: "تقارير احترافية",
        why_reports_desc: "تقارير واضحة لمتابعة مستوى الطالب",
        why_homework_title: "واجبات منزلية",
        why_homework_desc: "متابعة المراجعة خارج وقت الحلقة",
        why_experts_title: "بإعداد متخصصين",
        why_experts_desc: "أدوات مصممة لخدمة تعليم القرآن",

        card_adult_desc: "تقييم الطلاب من الأول الإعدادي فما فوق",
        card_kids_desc: "تقييم الأطفال (حتى السادس الابتدائي) بألعاب مبسّطة",
        card_students_desc: "أضف طلابك وتابع سجلاتهم وتقاريرهم",
        card_homework_desc: "إرسال ومتابعة واجبات الحفظ",
        // 🌟 [عدّل] بعد اكتمال أساسيات فكرة الاختبارات الثنائية (إعداد + لعب فعلي)، أُزيلت
        // عبارة "(قيد التطوير)" من وصف البطاقة بطلب صريح من المعلم — راجع تعليق البطاقة نفسها
        // في components/splash.html لتفاصيل إزالة الشارة المصاحبة أيضاً
        card_dual_desc: "تحدٍ بين طالبين",
        // 🏅 الشهادات والتقارير (certificates/certificates.js)
        btn_certs: "الشهادات والتقارير",
        card_certs_desc: "شهادات تقدير جاهزة وسجل بتقاريرك السابقة",
        sheet_certs: "الشهادات والتقارير",
        cc_title: "🏅 الشهادات والتقارير",
        cc_close: "إغلاق",
        cc_tab_issue: "إصدار شهادة",
        cc_tab_history: "سجل الشهادات",
        cc_tab_reports: "التقارير السابقة",
        cc_step_type: "نوع الشهادة",
        cc_step_student: "الطالب",
        cc_step_details: "التفاصيل",
        cc_step_text: "الصيغة واللغة",
        cc_step_verse: "آية أو حديث",
        cc_step_template: "القالب",
        cc_font: "الخط (لنص الشهادة العربي)",
        cc_font_default: "خط القالب",
        cc_font_hint: "",
        cc_step_date: "التاريخ",
        cc_pick_student: "اختر من طلابك",
        cc_select_student: "— اختر طالباً —",
        cc_other_name: "✏️ كتابة اسم آخر",
        cc_student_name: "اسم الطالب",
        cc_gender: "الجنس (لصياغة الجمل)",
        cc_boy: "👦 طالب",
        cc_girl: "👧 طالبة",
        cc_surah: "السورة",
        cc_juz: "الجزء",
        cc_half: "أي نصف؟",
        cc_half_first: "النصف الأول من الجزء",
        cc_half_second: "النصف الثاني من الجزء",
        cc_month_auto: "يُكتب الشهر تلقائياً من تاريخ الشهادة (الخطوة 7).",
        cc_no_details: "لا تحتاج هذه الشهادة إلى تفاصيل إضافية.",
        cc_lang: "لغة نص الشهادة",
        cc_lang_hint: "الشهادة قد تكون بلغة تختلف عن لغة المنصة.",
        cc_lang_ar: "العربية",
        cc_lang_en: "English",
        cc_next_variant: "🔀 صيغة أخرى",
        cc_extra_label: "سطر خاص منك (اختياري)",
        cc_extra_ph: "مثال: ما شاء الله، استمر على هذا النهج",
        cc_basmala: "إظهار البسملة في أعلى الشهادة",
        cc_baked_note: "هذا القالب يحمل البسملة أو العنوان في تصميمه، فلا نكرّرهما.",
        cc_verse_none: "بدون",
        cc_btn_png: "🖼️ حفظ كصورة",
        cc_btn_pdf: "📄 حفظ PDF",
        cc_btn_wa: "📲 مشاركة واتساب",
        cc_btn_keep: "💾 حفظ في السجل",
        cc_busy: "⏳ جارٍ التجهيز...",
        cc_need_name: "اكتب اسم الطالب أولاً (الخطوة 2).",
        cc_saved_png: "تم حفظ الصورة وإضافتها إلى السجل ✅",
        cc_saved_pdf: "تم حفظ ملف PDF (A4) وإضافته إلى السجل ✅",
        cc_share_fallback: "نزّلنا الصورة على جهازك: افتح واتساب وأرفقها يدوياً (المتصفح لا يدعم المشاركة المباشرة).",
        cc_kept: "تمت إضافتها إلى السجل ✅",
        cc_already_kept: "هذه الشهادة محفوظة في السجل بالفعل.",
        cc_keep_fail: "تعذّر الحفظ في السجل.",
        cc_fail: "تعذّر إنشاء الشهادة. تأكد من اتصال الإنترنت (لتحميل الخطوط والمكتبات) ثم أعد المحاولة.",
        cc_search_ph: "ابحث باسم الطالب",
        cc_all_types: "كل الأنواع",
        cc_open_edit: "فتح وتعديل",
        cc_delete: "حذف",
        cc_confirm_delete: "حذف هذه الشهادة من السجل؟",
        cc_hist_empty: "لا توجد شهادات صادرة بعد.<br>كل شهادة تحفظها أو تشاركها تظهر هنا، ويمكنك إعادة فتحها وتعديلها في أي وقت.",
        cc_no_match: "لا نتائج مطابقة.",
        cc_rep_note: "التقارير التي تصدّرها (صورة أو PDF أو واتساب) تُحفظ هنا تلقائياً لتعود إليها وتعيد إرسالها.",
        cc_rep_empty: "لا توجد تقارير محفوظة بعد.<br>ستظهر هنا تلقائياً كل ما تصدّره من الآن: تقرير التقييم الفردي أو الاختبار الثنائي أو التقرير الشهري.",
        cc_rep_kind_individual: "تقييم فردي",
        cc_rep_kind_dual: "اختبار ثنائي",
        cc_rep_kind_monthly: "تقرير شهري",
        cc_rep_view: "عرض",
        cc_rep_download: "تنزيل",
        cc_rep_share: "مشاركة",
        cc_rep_confirm_delete: "حذف هذا التقرير من الأرشيف؟",
        cc_rep_saved_as_image: "محفوظ كصورة من لحظة التصدير. للحصول على ملف PDF جديد افتح التقرير من شاشته الأصلية.",
        cc_rep_search_ph: "ابحث باسم الطالب",
        cc_placeholder_name: "اسم الطالب",
        cc_teacher: "المعلم",
        cc_date: "التاريخ",
        cc_cert_no: "رقم الشهادة",
        tour_home_certs: "هنا تصدر شهادات تقدير جاهزة لطلابك بقوالب جميلة، وتجد تقاريرك السابقة محفوظة تلقائياً.",
        tour_cc_tabs: "ثلاثة أقسام: إصدار شهادة جديدة، وسجل شهاداتك السابقة، والتقارير التي صدّرتها من قبل.",
        tour_cc_type: "ابدأ باختيار نوع الشهادة: إتمام سورة أو جزء، التميز في المراجعة، ختم القرآن، شكر وتقدير...",
        tour_cc_student: "اختر الطالب من قائمة طلابك، فيُضبط الجنس تلقائياً لتصاغ الجمل صحيحة. ولو ليس مسجلاً اختر «كتابة اسم آخر».",
        tour_cc_text: "اختر صيغة جاهزة تعجبك (أو اضغط «صيغة أخرى»)، واختر لغة الشهادة، ويمكنك إضافة سطر خاص منك.",
        tour_cc_template: "اختر القالب الذي يعجبك من بين عشرات القوالب، وستتغير المعاينة فوراً.",
        tour_cc_preview: "هذه معاينة حية للشهادة كما ستخرج تماماً.",
        tour_cc_save: "احفظ الشهادة صورة أو PDF للطباعة، أو شاركها على واتساب. وتُضاف تلقائياً إلى السجل.",
        tour_cc_reports: "وهنا تجد كل تقرير صدّرته (تقييم فردي، اختبار ثنائي، تقرير شهري) محفوظاً تلقائياً لتعرضه أو تعيد إرساله.",
        // 🌟 [عدّل] كانت "قيد التطوير" بالكامل، ثم أصبح التصفح فعلياً وشغالاً بلا ألعاب
        // تفاعلية، والآن (بعد بناء similarities-play.js) أصبحت الميزة كاملة: تصفح + ألعاب
        // تفاعلية بتصحيح تلقائي فوري — حدّثنا الوصف ليعكس هذا بدقة
        card_similarities_desc: "تصفح الآيات المتشابهة بين السور والعب ألعاباً تفاعلية لتثبيت حفظها",
        // 🌟 [جديد] وصف بطاقة "أبطال التجويد"
        card_tajweed_desc: "رحلة تعلّم تجويد تدريجية وممتعة لكل طالب",

        footer_about_title: "عن حمٓ",
        footer_about_text: "فكرة قديمة حديثة لتثبيت الحفظ والمراجعة",
        footer_contact: "تواصل معنا",
        footer_copyright: "© 2026 حمٓ - جميع الحقوق محفوظة",

        // Login Screen
        login_subtitle: "اختر طالباً مسجلاً لمتابعة التقدم",
        search_student_ph: "🔍 اكتب اسم الطالب للبحث...",
        btn_quick_login: "دخول سريع للتقييم 🚀",
        // 🌟 [جديد 2026-10-01 — فحص سهولة الاستخدام] اقتراحات الأسماء أثناء الكتابة + وسم الحقول
        // الاختيارية/المطلوبة + أزرار "ابدأ تقييم" في سجل الطلاب وملف الطالب + "تقييم طالب آخر" + خيارات الدخول الأخرى
        login_no_match: "لا يوجد طالب بهذا الاسم",
        stu_required_tag: "(مطلوب)",
        stu_optional_tag: "(اختياري)",
        as_col_start_eval: "تقييم",
        stu_start_eval_row: "🚀 تقييم",
        stu_start_eval_adult: "🚀 ابدأ تقييم (الكبار)",
        stu_start_eval_kids: "🧒 ابدأ تقييم (الأطفال)",
        rep_tb_another: "تقييم طالب آخر",
        btn_all_students: "📊 سجل الطلاب العام",
        // 🌟 [جديد] رسائل النسخة الاحتياطية (v2 تشمل سجل التقييمات)
        backup_restore_ok: "تم استعادة البيانات بنجاح (الطلاب + سجل التقييمات)!",
        backup_restore_ok_legacy: "تم استعادة بيانات الطلاب. ⚠️ هذا ملف بصيغة قديمة لا يحتوي على سجل التقييمات — صدّر نسخة جديدة من الجهاز الأصلي لاستعادتها.",
        backup_invalid_file: "ملف غير صالح!",
        // 🌟 [إصلاح فحص الأزرار] توضيح الفرق بين نسخة السجل (طلاب فقط، دمج) والنسخة الشاملة (ملف المعلم)
        // 🌟 [إصلاح فحص الأزرار] عناوين جدول السجل العام (تُستخدم أيضًا كتسميات بطاقات الهاتف)
        as_col_no: "م", as_col_name: "اسم الطالب", as_col_age: "العمر", as_col_grade: "الصف", as_col_points: "النقاط", as_col_evals: "التقييمات", as_col_manage: "إدارة وتعديل", as_col_errors: "علاج الأخطاء",
        backup_export_students_btn: "📥 تصدير الطلاب فقط",
        backup_import_students_btn: "📤 استيراد الطلاب",
        profile_backup_restore_students_only: "هذا ملف «تصدير الطلاب» من سجل الطلاب العام، وليس نسخة شاملة. استورده من زر «استيراد الطلاب» في سجل الطلاب العام.",
        btn_add_student: "تسجيل طالب جديد ➕",
        // 🌟 [جديد] زر "تسجيل الحفظ الشهري لكل الطلاب" + مفاتيح شاشة
        // components/monthlyMemorizationBulkScreen.js
        btn_monthly_memo_bulk: "📋 تسجيل الحفظ الشهري لكل الطلاب",
        mmb_title: "تسجيل الحفظ الشهري لكل الطلاب",
        mmb_late_hint: "هذا موضع الطالب عند نهاية {month}/{year} وليس موضعه اليوم — اكتب آخر سورة وآية توقّف عندها في ذلك الشهر.",
        // 🌟 [جديد] مركز التقارير الشهرية (components/monthlyReportsHub.js)
        btn_monthly_reports_hub: "📅 تقارير الشهر",
        mrh_title: "تقارير الشهر",
        mrh_close: "إغلاق",
        mrh_search_ph: "اكتب اسم الطالب…",
        mrh_no_match: "لا يوجد طالب بهذا الاسم",
        mrh_change_student: "تغيير الطالب",
        mrh_current_month: "الشهر الحالي",
        mrh_status_ready: "✅ جاهز",
        mrh_status_missing: "⚠️ ينقص",
        mrh_missing_msg: "آخر سورة وآية توقّف عندها الطالب في {month}",
        mrh_fix_btn: "سجّل الآن",
        mrh_edit_btn: "تعديل الموضع",
        mrh_nodata: "لا توجد بيانات لهذا الشهر (قبل بدء تسجيل الطالب)",
        mrh_summary_memo: "الحفظ: من {from} إلى {to} — {n} آية جديدة",
        mrh_summary_end_only: "آخر موضع:",
        mrh_summary_games: "غرفة اللعب: {n} جلسة بمتوسط {avg}%",
        mrh_summary_games_none: "غرفة اللعب: لا جلسات هذا الشهر",
        mrh_summary_hw_note: "الواجبات والاختبارات الثنائية تُجلب عند التصدير.",
        mrh_btn_whatsapp: "📱 نسخة واتساب",
        mrh_btn_pdf: "🖨️ طباعة PDF",
        mrh_btn_preview: "👁️ معاينة التقرير",
        mrh_exported_before: "سبق تصديره: {date}",
        mrh_missing_export_hint: "يمكنك التصدير الآن، لكن سيخرج التقرير بلا رحلة الحفظ.",
        mrh_done_today: "تم اليوم: {n}",
        mrh_exported_ok: "✅ تم تصدير تقرير {name}",
        mrh_prev_banner: "تقارير {month} لم تُصدَّر بعد لـ {n} طالب",
        mrh_banner_show: "عرض الأسماء",
        // 🌟 [جديد] مراجعة الشهر — الأجزاء الخمسة (components/monthlyReviewScreen.js + قسم التقرير)
        mrv_title: "مراجعة الشهر",
        mrv_col_from: "بداية الشهر (سورة)",
        mrv_col_to: "نهاية الشهر (وصل إلى)",
        mrv_not_reviewed: "— لم يراجع هذا الجزء —",
        mrv_count_fmt: "راجع {n} آية — {pct}% من الجزء",
        mrv_wrapped: "دورة جديدة من أول الجزء",
        mrv_hint: "أضف الأجزاء التي راجعها الطالب هذا الشهر فقط. اختر السورة وسيُملأ رقم الآية تلقائيًا، وعدّله عند الحاجة (للسور الطويلة).",
        mrv_add: "أضف جزءًا",
        mrv_remove: "حذف هذا الجزء",
        mrv_from: "من",
        mrv_to: "إلى",
        mrv_not_reached: "— لم يصل بعد —",
        mrv_out_of_range: "الموضع خارج نطاق الجزء المختار، يرجى التحقق.",
        mrv_juz_n: "الجزء {n}",
        mrv_save: "حفظ المراجعة",
        mrv_cancel: "إلغاء",
        mrv_part_ahqaf: "جزء الأحقاف",
        mrv_part_dhariyat: "جزء الذاريات",
        mrv_part_mujadila: "جزء المجادلة",
        mrv_part_tabarak: "جزء تبارك",
        mrv_part_amma: "جزء عمّ",
        mrh_review_done: "المراجعة: {k} أجزاء — {n} آية",
        mrh_review_missing: "المراجعة: لم تُسجَّل بعد (اختياري)",
        mrh_review_add: "سجّل المراجعة",
        mrh_review_edit: "تعديل المراجعة",
        mr_revparts_title: "رحلة المراجعة هذا الشهر",
        mr_revparts_sub: "من أين بدأ الطالب مراجعة كل جزء وإلى أين وصل",
        mr_revparts_none: "لم تُسجَّل مراجعة هذا الشهر بعد.",
        mr_revparts_count_fmt: "{n} آية",
        mr_revparts_total_fmt: "راجع الطالب {n} آية من {k} أجزاء هذا الشهر",
        mr_journey_sentence: "حفظ {name} {n} آية جديدة خلال هذا الشهر",
        mmb_progress: "الطالب {i} من {n}",
        mmb_skip_btn: "تخطٍّ",
        mmb_close_btn: "إغلاق",
        mmb_done_title: "تم بحمد الله! 🎉",
        mmb_done_desc: "تم تحديث سجلات الحفظ لكل الطلاب المطلوبين.",
        mmb_nothing_pending: "لا يوجد أي طالب يحتاج تسجيل حفظ الآن — كل شيء محدَّث ✅",
        // 🌟 [جديد] عنوان خطوة "نقطة البداية الأولى" — تظهر مرة واحدة فقط لكل طالب
        // (أول استخدام للميزة، أو عند تسجيل طالب جديد)، بعدها لا يُسأل المعلم إلا
        // "أين توقف؟" في نهاية كل شهر — بداية كل شهر تالٍ تُحسب تلقائيًا
        mmb_firsttime_title: "تسجيل نقطة البداية الأولى للحفظ",
        // 🌟 [2026-10-03] جدول الحفظ الجماعي (mmt_) — يستبدل شاشة "طالب طالب" في components/monthlyMemorizationBulkScreen.js
        mmt_heading: "الحفظ",
        mmt_sub: "اكتب آخر سورة وآية وصل إليها كل طالب. الصف الذي لا تغيّره يُسجَّل «لم يتقدّم».",
        mmt_month_fmt: "نهاية شهر {m}/{y}",
        mmt_stat_students: "الطلاب",
        mmt_stat_moved: "تقدّموا",
        mmt_stat_total: "آيات جديدة للحلقة",
        mmt_search_ph: "ابحث باسم الطالب…",
        mmt_col_student: "الطالب",
        mmt_col_start: "بدأ الشهر عند",
        mmt_col_surah: "وصل إلى سورة",
        mmt_col_ayah: "آية",
        mmt_col_new: "الجديد",
        mmt_col_last: "الشهر الماضي",
        mmt_col_later: "لاحقًا",
        mmt_later_title: "أجّل هذا الطالب — لن يُحفظ الآن وسيظهر في المرة القادمة",
        mmt_first_start: "أول تسجيل",
        mmt_first_badge: "نقطة بداية",
        mmt_backward: "قبل البداية",
        mmt_hint_ok: "الجديد يُحسب تلقائيًا من الناس نحو الفاتحة",
        mmt_hint_err: "{n} صف يحتاج تصحيحًا: الموضع قبل بداية الشهر",
        mmt_hint_zero: "{n} بلا تقدّم — يُسجَّلون 0 آية",
        mmt_save_btn: "حفظ {n} طلاب",
        mmt_saving: "جارٍ الحفظ…",
        mmt_saved_banner: "تم حفظ {n} طلاب ✓ — هؤلاء ما زالوا بانتظارك:",
        mmt_unsaved_confirm: "لديك تعديلات لم تُحفظ. هل تريد الإغلاق بدون حفظ؟",
        mmt_done_desc: "سُجّل {n} طلاب · {k} آية جديدة للحلقة",
        mmt_done_later: "{n} طلاب أجّلتهم وسيظهرون في المرة القادمة.",
        mmt_save_error: "تعذّر حفظ بعض الصفوف. حاول مرة أخرى.",
        btn_back: "🔙 العودة للقائمة الرئيسية",
        add_new_champion: "إضافة طالب جديد",
        name_full: "الاسم (ثلاثي):",
        name_ph: "اسم الطالب...",
        dob: "تاريخ الميلاد:",
        grade: "الصف الدراسي:",
        country: "البلد:",
        country_ph: "مثال: مصر، السعودية...",
        parent_phone: "رقم ولي الأمر (اختياري للواتساب):",
        phone_ph: "لإرسال التقارير...",
        memo_amount: "مقدار الحفظ (من سورة - إلى سورة):",
        choose_avatar: "اختر أفاتار للطالب:",
        upload_photo: "أو ارفع صورة شخصية حقيقية:",
        save_champ: "حفظ بيانات الطالب ✔️",
        cancel: "إلغاء",

        // Dashboard
        dash_title: "لوحة التقييم ⚙️",
        eval_surah: "سورة محددة",
        eval_range: "عدة سور",
        eval_juz: "بالأجزاء",
        surah_label: "السورة:",
        q_count: "عدد الأسئلة:",
        range_label: "النطاق (من - إلى):",
        from_surah: "من سورة:",
        to_surah: "إلى سورة:",
        select_juz: "اختر الجزء:",
        kids_range_label: "نطاق الأسئلة (من الأحقاف إلى الناس):",
        kids_q_count: "عدد الألعاب (الأسئلة):",
        btn_start_eval: "🚀 ابدأ التقييم الآن",
        btn_change_student: "🔙 تغيير الطالب / العودة",
        btn_homework_module: "📝 نظام الواجبات المنزلية",
        bday_notification_title: "🎉 تنبيه يوم ميلاد!",
        bday_notification_msg: "اليوم يوافق يوم ميلاد الطالب: ",

        // 🌟 ترحيب الشاشة الرئيسية وملف المعلم الشخصي 🌟
        greeting_morning: "صبّحكم الله بالخير",
        greeting_evening: "مساء الخير",
        // 🌟 [جديد] دورة يومية لصيغ ترحيب إضافية — بنفس فلسفة DAILY_QUOTES في
        // components/homeQuickview.js: صيغة واحدة لكل يوم (حسب رقم اليوم منذ Epoch)،
        // وليست عشوائية حقيقية، فتبقى ثابتة طول اليوم وتتغيّر تلقائيًا غدًا. راجع
        // MORNING_GREETING_KEYS / EVENING_GREETING_KEYS في components/teacherProfile.js
        greeting_morning_2: "صباح الخير والبركة",
        greeting_morning_3: "بارك الله في صباحكم",
        greeting_morning_4: "صباح النور والعلم",
        greeting_evening_2: "مساء النور والبركة",
        greeting_evening_3: "مساء الخير والتوفيق",
        greeting_evening_4: "بارك الله مساءكم",
        // 🌟 [جديد] تحية خاصة بيوم الجمعة — تحل محل دورة الصباح/المساء أعلاه طوال يوم
        // الجمعة بأكمله (بلا اعتبار للوقت)، وتدور هي الأخرى بين صيغتين حسب رقم الأسبوع
        greeting_friday: "جمعة مباركة",
        greeting_friday_2: "جمعة مباركة، تقبّل الله دعاءكم",
        greeting_title: "يا شيخ",
        // 🌟 [جديد] صيغة التحية المؤنّثة — تُستخدم بدل السطر أعلاه إن كان جنس المعلم/ـة
        // المحفوظ "أنثى" (راجع profile_gender_* أدناه)
        greeting_title_female: "يا أستاذة",
        home_summary_hw_label: "واجب منشور حالياً",
        profile_badge_text: "أكمل بياناتك 👋",
        profile_modal_title: "بياناتك الشخصية",
        profile_photo_label: "الصورة الشخصية",
        // 🌟 [جديد] رفع اختياري لصورة الختم الرسمي (يُستخدم عند توقيع التقارير) 🌟
        profile_stamp_label: "الختم (اختياري)",
        profile_name_label: "الاسم:",
        // 🌟 [جديد] تحديد الجنس — اختياري تمامًا ويبقى "ذكر" افتراضيًا (فيبقى اللقب
        // "شيخ" كما كان قبل هذه الميزة تمامًا) ما لم يُختَر "أنثى" صراحةً. حقل بيانات
        // عام (وليس مجرد اختيار نص لقب) حتى يصلح لاحقًا لأي نص آخر بالمنصة يحتاج
        // تذكير/تأنيث نحوي، لا لتحية الشاشة الرئيسية فقط.
        profile_gender_label: "الجنس:",
        profile_gender_male: "ذكر",
        profile_gender_female: "أنثى",
        profile_dob_label: "تاريخ الميلاد:",
        // 🌟 [جديد] حقول تاريخ الميلاد بترتيب ثابت: اليوم / الشهر / السنة + زر تعديل البيانات
        profile_dob_day: "اليوم",
        profile_dob_month: "الشهر",
        profile_dob_year: "السنة",
        profile_edit_btn: "تعديل بياناتي",
        profile_save_btn: "حفظ",
        profile_close_btn: "إغلاق",

        // 🌟 [جديد] قسم "نسخة احتياطية للبيانات" داخل نافذة ملف المعلم — تصدير/استرجاع
        // كل بيانات المنصة المحفوظة في IndexedDB (طلاب، واجبات، جلسات تسميع، اختبارات
        // ثنائية...) من/إلى ملف واحد يبقى على جهاز المعلم فقط بلا أي رفع على الإنترنت،
        // بناءً على طلب صريح من المعلم. راجع core/backupRestore.js للآلية الكاملة 🌟
        profile_backup_section_title: "🗄️ نسخة احتياطية للبيانات",
        profile_backup_last_never: "لم تُؤخَذ أي نسخة احتياطية بعد على هذا الجهاز",
        profile_backup_last_prefix: "آخر نسخة احتياطية: ",
        profile_backup_download_btn: "⬇️ نسخة احتياطية الآن",
        profile_backup_restore_btn: "⬆️ استرجاع نسخة احتياطية",
        profile_backup_restore_confirm: "سيتم استبدال كل البيانات الحالية على هذا الجهاز بمحتوى ملف النسخة الاحتياطية المختار، ولا يمكن التراجع عن هذه الخطوة. هل أنت متأكد من المتابعة؟",
        profile_backup_restore_invalid_file: "هذا الملف ليس نسخة احتياطية صالحة من منصة حمٓ.",
        profile_backup_restore_error: "تعذّر استرجاع النسخة الاحتياطية. تأكد من اختيار الملف الصحيح.",
        profile_backup_restore_success: "تم استرجاع البيانات بنجاح ✅ سيُعاد تحميل المنصة الآن.",

        teacher_bday_notification_title: "🎉 يوم ميلاد سعيد!",
        teacher_bday_notification_msg: "كل عام وأنت بخير يا شيخ ",
        // 🌟 [جديد] صيغة مؤنّثة لرسالة يوم ميلاد المعلمة نفسها (وأنتِ بدل وأنت)
        teacher_bday_notification_msg_female: "كل عام وأنتِ بخير يا أستاذة ",

        // 🌟 الشاشة الرئيسية الجديدة: الهيرو وبطاقة "نظرة سريعة" 🌟
        // 🌟 [عدّل] الشارة العلوية تصف وظيفة المنصة بدل العبارة العامة
        hero_eyebrow: "منصة تعليمية متكاملة",
        home_card_homework_title: "نظام الواجبات المنزلية",
        dual_in_progress_badge: "قيد التطوير",
        // 🌟 [قديم، لم يعد مستخدماً بعد بناء شاشات التصفح الفعلية أسفل] أُبقي عليه بلا حذف
        // تفادياً لكسر أي مرجع قديم، لكن البطاقة تستخدم الآن similarities_browse_badge
        similarities_in_progress_badge: "قيد التطوير",
        similarities_toast_soon: "⚔️ تحدي المتشابهات قيد التطوير حالياً، تابعنا قريباً بإذن الله!",
        // 🌟 [جديد] شارة ورسالة بطاقة "أبطال التجويد" على الشاشة الرئيسية — تُستخدم فعلياً
        // من core/app.js (setupSplashListeners) عبر alert() بسيطة، بنفس آلية الرجوع
        // المستخدمة أصلاً عند فشل تحميل أي شاشة في هذا الملف (راجع openHomeworkPrep وغيرها)
        tajweed_in_progress_badge: "قيد التطوير",
        tajweed_toast_soon: "🌟 أبطال التجويد قيد التصميم حالياً، تابعونا قريباً بإذن الله!",

        // 🌟 [جديد] شاشات "ركن المتشابهات" الفعلية (مجلد similarities/) — التصفح بقى حقيقياً
        // الآن (القراءة فقط، بلا ألعاب تفاعلية بعد)، فالشارة على البطاقة تغيّرت من "قيد
        // التطوير" لتعكس هذا بدقة. باقي المفاتيح هنا لكل شاشات: القائمة الرئيسية (5 أزرار:
        // 4 أجزاء + جزء عمّ)، قوائم السور، شاشة تفصيل السورة، فرع جزء عمّ (سور/كلمات)،
        // وقائمة/تفصيل الكلمات
        similarities_browse_badge: "تصفح متاح",
        sim_home_title: "ركن المتشابهات",
        sim_home_subtitle: "اختر الجزء الذي تريد تصفح متشابهاته",
        sim_juz_46: "جزء الأحقاف",
        sim_juz_51: "جزء الذاريات",
        sim_juz_58: "جزء المجادلة",
        sim_juz_67: "جزء تبارك",
        sim_juz_amma: "جزء عمّ",
        // 🌟 [محدَّث] الأيقونة اتغيّرت من 🔙 إلى ⬅️ لتمييزه بصرياً عن زر "sim_btn_exit_home"
        // (الخروج الكامل من ركن المتشابهات) اللي بيستخدم نفس أيقونة 🔙 المعتمدة في باقي
        // شاشات المنصة لزر "العودة للقائمة الرئيسية" — الاثنان كانا بنفس الأيقونة رغم اختلاف
        // ثقل الإجراء (رجوع خطوة واحدة داخل المتشابهات، مقابل خروج كامل منها)
        sim_btn_back_level: "⬅️ رجوع",
        sim_choose_surah_hint: "اختر السورة لعرض متشابهاتها",
        sim_groups_count_suffix: "مجموعة متشابهة",
        sim_surahs_count_suffix: "سورة مشتركة",
        sim_amma_choice_subtitle: "اختر طريقة التصفح",
        sim_amma_btn_surahs: "السور",
        sim_amma_btn_words: "الكلمات",
        sim_words_list_title: "متشابهات الكلمات - جزء عمّ",
        sim_words_list_subtitle: "اختر اللفظ لعرض كل مواضعه بين السور",
        sim_no_data: "لا توجد متشابهات مسجلة لهذا الاختيار بعد",
        sim_loading: "⏳ جاري التحميل...",
        sim_ayah_word: "آية",
        sim_note_label: "📝 ملاحظة:",
        sim_tail_diff_label: "الاختلاف:",
        sim_own_position_label: "موضعها في هذه السورة:",
        sim_other_surahs_label: "وردت أيضاً في:",
        // 🌟 [قديم — 2026-09-16، الجولة الثانية] لم يعد هذا المفتاح مستخدماً بعد حذف زر
        // اللعب الفردي على كل بطاقة (راجع sim_start_game_surah_btn/sim_start_game_juz_btn
        // الجديدين أدناه)، أُبقي عليه بلا حذف تحسباً لأي استخدام آخر مستقبلي
        sim_start_game_btn: "🎮 ابدأ لعبة",
        // 🌟 [قديم] لم يعد هذا المفتاح مستخدماً بعد بناء شاشة اللعب الفعلية (راجع مفاتيح
        // sim_game_* أدناه)، أُبقي عليه بلا حذف تحسباً لأي استخدام آخر مستقبلي
        sim_game_toast_soon: "⚔️ ألعاب المتشابهات قيد التطوير حالياً، تابعنا قريباً بإذن الله!",
        sim_cat_common: "لفظ مشترك",
        sim_cat_ending: "اختلاف الخاتمة",
        sim_cat_refrain: "تكرار لازمة",
        sim_cat_form: "اختلاف الصيغة",
        sim_cat_thematic: "ربط موضوعي",
        // 🌟 [جديد — 2026-09-16، الجولة الثانية] أزرار "لعبة السورة/الجزء بالكامل" الجديدة —
        // راجع تعليق طلب المعلم أعلى similarities/similarities.js
        sim_start_game_surah_btn: "🎮 العب لعبة هذه السورة",
        sim_start_game_juz_btn: "🎮 العب لعبة هذا الجزء",

        // 🌟 [جديد — 2026-09-16] نموذج "إضافة متشابهة يدويًا" (متشابهات داخل السورة فقط —
        // راجع مستند المشروع لتفاصيل قرار النطاق). يدعم إضافة/تعديل/حذف كامل، والمجموعات
        // المُضافة يدويًا محفوظة في IndexedDB مباشرة (لا تُمسح أبداً عند تحديث بيانات الـ
        // Seed مستقبلاً — راجع similaritiesDB.js)
        // 🌟 [عدّل — 2026-09-16، الجولة الثانية] sim_add_group_btn انتقل من زر داخل شاشة
        // تفصيل السورة إلى زر في الشاشة الرئيسية.
        // 🌟 [عدّل — الجولة الثالثة] مسار الاختيار كان جزء ثم سورة (داخل نطاق 46-77 فقط)،
        // وأصبح الآن يفتح مباشرة قائمة كل سور القرآن (114 سورة) — راجع تعليق الجولة الثالثة
        // في similarities/similarities.js لتفاصيل السبب. sim_add_pick_juz_hint أصبح غير
        // مستخدَم (أُبقي بلا حذف بنفس فلسفة sim_amma_choice_subtitle سابقاً)، ونص
        // sim_add_pick_surah_hint تحدَّث ليعكس أن الاختيار أصبح من عموم سور القرآن لا سور
        // جزء واحد فقط.
        sim_add_group_btn: "➕ إضافة متشابهة يدويًا",
        sim_add_pick_juz_hint: "اختر الجزء الذي تريد إضافة متشابهة جديدة فيه",
        sim_add_pick_surah_hint: "ابحث عن السورة واخترها من بين كل سور القرآن",
        sim_add_surah_search_placeholder: "🔍 ابحث باسم السورة أو رقمها",
        sim_manual_badge: "✏️ إضافة يدوية",
        sim_quick_add_occ_title: "إضافة موضع سريع لهذه المجموعة",
        sim_edit_btn_title: "تعديل",
        sim_delete_btn_title: "حذف",
        sim_form_title_add: "إضافة متشابهة جديدة",
        sim_form_title_edit: "تعديل متشابهة",
        sim_form_category_label: "التصنيف",
        sim_form_anchor_label: "اللفظ/العبارة المشتركة",
        sim_form_anchor_placeholder: "مثال: السَّمَاوَاتِ وَالْأَرْضِ",
        sim_form_note_label: "ملاحظة إضافية (اختياري)",
        sim_form_occurrences_label: "المواضع (آيتان على الأقل)",
        sim_form_ayah_number_label: "رقم الآية",
        sim_form_ayah_text_label: "نص الآية",
        sim_form_tail_word_label: "الكلمة المميِّزة (اختياري — لتفعيل لعبة أكمل الآية)",
        sim_form_add_occurrence_btn: "➕ إضافة موضع آخر",
        sim_form_remove_occurrence_btn: "✖ حذف هذا الموضع",
        sim_form_save_btn: "💾 حفظ",
        sim_form_cancel_btn: "إلغاء",
        sim_form_delete_group_btn: "🗑️ حذف المجموعة",
        sim_form_delete_confirm: "هل أنت متأكد من حذف هذه المتشابهة؟ لا يمكن التراجع.",
        sim_form_error_min_occurrences: "أضف موضعين على الأقل لكل متشابهة",
        sim_form_error_required: "من فضلك أكمل اللفظ المشترك ونص كل الآيات قبل الحفظ",
        sim_form_saved_toast: "✅ تم الحفظ بنجاح",
        sim_form_deleted_toast: "🗑️ تم الحذف",

        // 🌟 [جديد] شاشة لعب "ركن المتشابهات" التفاعلية (similarities/similarities-play.js) —
        // لعبتان بتصحيح تلقائي فوري: "من أي موضع؟" (sim_position، الأساسية) و"أكمل الآية
        // الصحيحة" (sim_ending، إضافية لمن يملك بيانات كافية) — راجع engine/similarityEngine.js
        sim_game_title: "🎮 لعبة المتشابهات",
        sim_game_q_position_ayah: "في أي آية وردت هذه العبارة؟",
        sim_game_q_position_surah: "في أي سورة وردت هذه الآية؟",
        sim_game_q_ending: "ما الكلمة الصحيحة التي تُكمل الآية؟",
        // 🌟 [جديد — 2026-09-23] 4 أنواع أسئلة جديدة تغطي مهارات "التعرّف/التمييز/الاستدعاء/منع
        // الخلط أثناء التسميع" الأربعة بطلب صريح من المعلم — راجع تعليق رأس
        // engine/similarityEngine.js للخريطة الكاملة بين كل مهارة ونوع السؤال المقابل لها
        sim_game_q_discrimination: "ما النهاية الصحيحة لهذه الآية بالذات؟",
        sim_game_q_recitation_check: "وصلت إلى هنا وأنت تُسمِّع... بم تُكمل؟",
        sim_game_q_recognition: "أي هذه الآيات وردت فيها هذه العبارة فعلاً؟",
        sim_game_q_recall_ayah: "اختر النص الصحيح الذي ورد في هذا الموضع",
        sim_game_q_recall_surah: "اختر نص الآية الصحيحة التي وردت في هذه السورة",
        sim_game_opt_ayah_prefix: "آية",
        sim_game_correct_feedback: "🎉 إجابة صحيحة!",
        sim_game_wrong_feedback: "❌ حاول أن تنتبه أكثر في المرة القادمة",
        sim_game_not_enough_data: "لا توجد بيانات كافية لبناء لعبة لهذه المجموعة بعد",
        sim_game_results_title: "🏆 نتيجتك في هذه الجولة",
        sim_game_play_again_btn: "🔁 العب مرة أخرى",

        // 🌟 [جديد] شاشة إعداد "الاختبارات الثنائية" — منفصلة تماماً عن شاشات الواجبات
        // والألعاب الأخرى (بطلب صريح من المعلم)، راجع dualtests/dual-test-setup.js
        dts_title: "إعداد اختبار ثنائي",
        dts_back: "العودة",
        dts_list_title: "الاختبارات المحفوظة",
        dts_new_test_btn: "+ اختبار جديد",
        dts_no_tests: "لا يوجد أي اختبار محفوظ بعد. اضغط «اختبار جديد» للبدء.",
        dts_status_draft: "مسودة",
        dts_status_ready: "جاهز ✅",
        dts_edit_btn: "تعديل",
        dts_start_match_btn: "ابدأ مواجهة",
        dts_delete_btn: "حذف",
        dts_delete_confirm: "هل أنت متأكد من حذف هذا الاختبار؟ لا يمكن التراجع.",
        // 🌟 [جديد] نافذة "سجل المباريات السابقة" — راجع openMatchesHistoryModal في
        // dual-test-setup.js. dtp_view_report_btn المُستخدَم لزر كل صف موجود مسبقاً (من تقرير
        // المواجهة نفسه) وأُعيد استخدامه هنا للاتساق بدل تكرار نفس النص بمفتاح مختلف.
        dts_history_btn: "المباريات السابقة",
        dts_history_modal_title: "سجل مباريات هذا الاختبار",
        dts_history_close_btn: "إغلاق",
        dts_history_empty: "لا توجد مباريات منتهية على هذا الاختبار بعد.",
        // 🌟 [جديد] "المواجهات المعلقة" — بعد تحويل المواجهة إلى جولة واحدة لكل جلسة، صارت
        // المواجهة تبقى محفوظة بين الجلسات ويُستكمَل منها لاحقاً (راجع openPendingMatchesModal
        // في dual-test-setup.js و finishRound في dual-test-play.js)
        dts_pending_btn: "⏸️ مواجهات معلقة ({n})",
        // 🌟 [جديد] زر مستقل لكل زوج طلاب له مواجهات معلقة (بدل رقم واحد مجمّع على الاختبار
        // كله) — راجع pendingPairKeyCache في dual-test-setup.js
        dts_pending_pair_btn: "معلّقة: {a} · {b} ({n})",
        dts_pending_pair_label: "مواجهات {a} 🆚 {b} المعلقة فقط:",
        dts_pending_modal_title: "⏸️ مواجهات لم تكتمل",
        dts_pending_modal_desc: "اختر مواجهة لاستكمالها من الجولة التالية بنفس الطالبَين ونتائجهما المحفوظة.",
        dts_pending_empty: "لا توجد مواجهات معلقة على هذا الاختبار.",
        dts_pending_next_round: "يُستكمَل من الجولة {n}",
        dts_pending_rounds_tally: "الجولات المكسوبة: {a} — {b}",
        dts_pending_resume_btn: "▶️ استكمال",
        dts_pending_delete_btn: "🗑️ حذف",
        dts_pending_delete_confirm: "حذف هذه المواجهة المعلقة نهائياً؟ كل نتائج جولاتها المحفوظة ستُفقَد ولن يمكن استكمالها.",
        dts_pending_conflict_confirm: "⏸️ يوجد بالفعل مواجهة معلقة بين هذين الطالبَين على هذا الاختبار، متوقفة عند الجولة {n}.\n\n• «موافق» = استكمال المواجهة المعلقة من الجولة {n}.\n• «إلغاء» = بدء مواجهة جديدة من الصفر (المعلقة تبقى محفوظة كما هي).",
        dts_competitor_a: "المتسابق الأول",
        dts_competitor_b: "المتسابق الثاني",
        dts_choose_student: "-- اختر الطالب --",
        dts_no_students_hint: "سجّل طلاباً أولاً من «طلابي» قبل إعداد اختبار ثنائي.",
        dts_round1_title: "الجولة الأولى — النصف الأول 🌓",
        dts_round2_title: "الجولة الثانية — النصف الثاني 🌗",
        dts_round3_title: "الجولة الثالثة — الجزء الكامل 🌕",
        // 🌟 [مُحدَّث] النطاق أصبح اسم السورة كاملة فقط (بلا رقم آية) — راجع createEmptyRound
        dts_round_range_label: "نطاق الجولة (السورة كاملة، اختياري للتوثيق فقط):",
        // 🌟 [جديد] عدّاد الأسئلة المضافة في رأس كل جولة (شكل احترافي + وضوح الحالة بلمحة)
        dts_round_progress_label: "📝 {main} أساسي · 🔄 {swap} استبدال",
        dts_from_ayah: "من آية",
        dts_to_ayah: "إلى آية",
        dts_main_questions_title: "الأسئلة الأساسية",
        dts_add_question_btn: "إضافة سؤال",
        // 🌟 [جديد] شاشة الأسئلة بتبويبين (الاقتراح ١ المعتمد)
        dts_swap_tab_title: "أسئلة الاستبدال",
        dts_main_tab_desc: "تظهر على لوحة الأسئلة بأرقامها، ويختار منها الطالبان بالتناوب.",
        dts_no_main_questions: "لا توجد أسئلة بعد. اكتب أول سؤال في الخانتين بالأسفل.",
        dts_no_swap_questions: "لا توجد أسئلة استبدال بعد. اكتب أول سؤال في الخانتين بالأسفل.",
        dts_entry_enter_hint: "اكتب السؤال يدوياً. Enter في «سمّع من» ينقلك لـ«إلى»، وEnter في «إلى» يضيف السؤال.",
        dts_swap_questions_title: "🔄 أسئلة الاستبدال (احتياطية، برمز مستقل)",
        dts_swap_questions_desc: "هذه الأسئلة غير معروضة على لوحة الأسئلة، وتُستخدم فقط عند طلب أي طالب تبديل سؤاله — الطالب نفسه يختار أي رمز يريده من هذه القائمة.",
        dts_add_swap_btn: "إضافة سؤال استبدال",
        dts_question_number_prefix: "سؤال",
        // 🌟 [جديد] نموذج إدخال السؤال بنص حر — مربعا "من"/"إلى" يكتبهما المعلم بيده بالكامل
        dts_from_label: "سمّع من",
        dts_to_label: "إلى",
        dts_from_placeholder: "مثال: سورة البقرة آية 1",
        dts_to_placeholder: "مثال: سورة البقرة آية 10",
        dts_fill_both_fields_alert: "الرجاء كتابة نص «من» و«إلى» قبل إضافة السؤال.",
        dts_remove_btn: "إزالة",
        dts_save_draft_btn: "حفظ كمسودة",
        dts_save_ready_btn: "حفظ كاختبار جاهز",
        dts_ready_validation_error: "لكل جولة من الثلاث سؤال أساسي واحد مكتمل البيانات على الأقل قبل الحفظ كـ«جاهز». تقدر تحفظه كمسودة وتكمله لاحقاً.",
        dts_saved_draft_toast: "تم حفظ الاختبار كمسودة 📝",
        dts_saved_ready_toast: "تم حفظ الاختبار وأصبح جاهزاً ✅",
        dts_reuse_hint: "الاسمان هنا افتراض أولي فقط — تقدر تستخدم نفس الاختبار مع طلاب آخرين لاحقاً من زر «ابدأ مواجهة» في القائمة.",
        dts_start_match_modal_title: "بدء مواجهة جديدة",
        dts_start_match_confirm_btn: "🚀 ابدأ",
        dts_start_match_cancel_btn: "إلغاء",
        dts_play_screen_soon: "شاشة اللعب الفعلية قيد الإنشاء 🛠️ — الاختبار محفوظ بأمان وسيعمل معها فور جاهزيتها بإذن الله.",
        dts_choose_both_students_alert: "الرجاء اختيار الطالبَين أولاً.",
        dts_same_student_alert: "لازم يكون المتسابقان طالبَين مختلفَين.",

        // 🌟 [جديد] محرر الاختبار أصبح 3 خطوات متتالية بدل صفحة واحدة طويلة تعرض كل الجولات
        // مرة واحدة — بطلب صريح من المعلم. الخطوة 1: المتسابقان + نطاق كل جولة (اسم سورة
        // فقط). الخطوة 2: اختيار أي جولة يريد تجهيزها الآن (3 أزرار كبيرة). الخطوة 3: إضافة
        // أسئلة الجولة المختارة وحفظها. راجع goToStep في dual-test-setup.js.
        dts_step_label: "الخطوة {n} من 3",
        dts_step1_heading: "١) المتسابقان والنطاق",
        dts_step1_hint: "حدّد السورة التي يبدأ منها النطاق والسورة التي ينتهي عندها. تقدر تعدّل هذا لاحقاً في أي وقت من زر «تعديل النطاق».",
        dts_step1_next_btn: "التالي: اختيار الجولة",
        dts_step2_heading: "٢) اختر الجولة التي تريد تجهيزها",
        dts_step2_hint: "اختر الجولة التي تريد تجهيزها، ثم اضغط «التالي» لوضع أسئلتها.",
        dts_step2_back_btn: "رجوع لتعديل النطاق",
        dts_step2_next_btn: "التالي: وضع الأسئلة",
        dts_step3_back_btn: "رجوع لاختيار الجولة",
        dts_range_not_set: "لم تُحدَّد بعد",
        dts_round_range_summary_label: "نطاق هذه الجولة:",
        dts_edit_range_btn: "تعديل النطاق",

        // 🌟 [جديد] شاشة اللعب الفعلية dualtests/dual-test-play.js
        // 🌟 [جديد] حفظ تلقائي دوري لتقدّم الجولة الجارية — راجع تعليق persistInProgressRound
        // في dual-test-play.js لتفاصيل الفكرة الكاملة
        dtp_round_restored_toast: "✅ تم استرجاع تقدّم الجولة السابق بعد التحديث",
        dtp_round_label: "الجولة {n} من 3",
        // 🌟 [جديد — التصميم الاحترافي] تسميات مؤشر خطوات المحرر + عنوان الجولات المكسوبة في شاشة الترحيب
        dtp_vs_wins_label: "جولات مكسوبة",
        dtp_turn_now_label: "الدور الآن",
        dtp_board_pick_label: "اختر رقم السؤال",
        dts_step_label_1: "المتسابقان والنطاق",
        dts_step_label_2: "اختيار الجولة",
        dts_step_label_3: "الأسئلة",
        // 🌟 [جديد] تجهيز الجولات تدريجياً (جولة بجولة)
        dts_round_locked_note: "تُفتح بعد لعب الجولة {n}",
        dts_round_needs_prep: "الجولة {n} بانتظار التجهيز",
        dtp_round_not_ready_label: "الجولة {n} لم تُجهَّز أسئلتها بعد",
        dtp_round_not_ready_btn: "جهّز الجولة {n} الآن",
        dtp_start_round_btn: "ابدأ الجولة",
        dtp_coin_flip_start_msg: "🎲 مين يبدأ؟...",
        dtp_coin_flip_result_msg: "يبدأ: {name} 🎉",
        dtp_end_round_manual_btn: "⏹️ إنهاء الجولة الآن يدوياً",
        dtp_question_turn_label: "دور: {name}",
        dtp_btn_mistake: "تسجيل خطأ",
        dtp_btn_helper: "مساعدة",
        dtp_btn_swap: "تبديل",
        dtp_btn_finish: "اعتماد الإجابة",
        dtp_mistakes_count_label: "عدد الأخطاء المسجَّلة لهذا السؤال: {n}",
        // 🌟 [جديد] كل سؤال = 10 درجات، والدرجة الحالية المتوقعة تُعرض حياً قبل الاعتماد
        dtp_current_points_label: "الدرجة الحالية لهذا السؤال: {score} من {max}",
        dtp_result_title: "نتيجة السؤال",
        dtp_result_points_of_label: "الدرجة",
        dtp_result_mistakes_label: "عدد الأخطاء",
        dtp_result_deduction_label: "الخصم",
        dtp_result_helper_label: "استخدام المساعدة",
        dtp_result_continue_btn: "متابعة",
        dtp_yes: "نعم ✅",
        dtp_no: "لا",
        dtp_no_swap_available_alert: "لا يوجد أي رمز استبدال متاح حالياً في هذه الجولة.",
        dtp_swap_modal_title: "اختر رمز سؤال الاستبدال",
        dtp_swap_modal_desc: "هذه المرة فقط — اختر أي رمز تريده من المتاح.",
        dtp_summary_title: "نتيجة الجولة {n}",
        // 🌟 [مُحتفَظ به] dtp_winner_label لم يعد مستخدَماً في شاشة نتيجة الجولة بعد إعادة
        // تصميمها (صار اسم الفائز يظهر بخط ضخم مستقل + شارة "الفائز بالجولة" فوقه)، لكنه
        // يبقى معرَّفاً هنا بلا حذف — توافقاً مع أي استخدام قديم أو لاحق (نفس سياسة عدم
        // حذف المفاتيح فجأة)
        dtp_winner_label: "الفائز بالجولة: {name} 🏆",
        dtp_tie_label: "تعادل الجولة 🤝",
        // 🌟 [جديد] مفاتيح شاشة "نتيجة الجولة" بتصميمها الجديد (منصة تتويج + بطاقتا نقاط +
        // تقدّم المواجهة + إحصائيات الجولة) — راجع renderRoundSummary في dual-test-play.js
        dtp_summary_winner_caption: "🏆 الفائز بهذه الجولة",
        dtp_summary_tie_caption: "🤝 لا غالب ولا مغلوب",
        // نسخة بلا إيموجي من نص التعادل — لأنه يُعرض بخط ضخم بجوار رمز 🤝 ظاهر أصلاً بين
        // صورتَي الطالبَين، فلا داعي لتكراره مرتين (dtp_tie_label الأصلي باقٍ كما هو)
        dtp_summary_tie_big: "تعادل الجولة",
        dtp_summary_diff_label: "بفارق {n} نقطة 🔥",
        dtp_summary_card_winner_flag: "🏆 الفائز",
        dtp_summary_points_unit: "نقطة",
        dtp_summary_series_title: "تقدّم المواجهة",
        dtp_summary_round_pending: "الجولة {n}: لم تُلعب بعد",
        dtp_summary_round_tied: "الجولة {n}: تعادل",
        dtp_summary_round_won_by: "الجولة {n}: {name}",
        dtp_summary_stats_title: "إحصائيات الجولة",
        dtp_summary_stat_mistakes: "الأخطاء",
        dtp_summary_stat_helper: "المساعدة",
        dtp_summary_stat_swap: "التبديل",
        dtp_summary_used_yes: "استُخدمت ✔️",
        dtp_summary_used_no: "لم تُستخدم",
        // 🌟 [مُحتفَظ به] dtp_next_round_btn لم يعد مستخدَماً بعد اعتماد "جولة واحدة لكل جلسة"
        // (الجولة التالية لم تعد تبدأ من شاشة نتيجة الجولة إطلاقاً)، لكنه يبقى معرَّفاً بلا حذف
        dtp_next_round_btn: "التالي ▶️",
        // 🌟 [جديد] زر إنهاء الجلسة بعد كل جولة + سطر التطمين تحته
        dtp_end_session_btn: "💾 إنهاء الجلسة وحفظ التقدّم",
        dtp_session_saved_note: "✅ تم حفظ نتيجة هذه الجولة. المواجهة ستبقى محفوظة بنفس الطالبَين، وتُستكمَل من الجولة {n} في جلسة قادمة من: الاختبارات الثنائية ← ⏸️ مواجهات معلقة.",
        dtp_view_final_btn: "عرض النتيجة النهائية 🏁",
        dtp_final_title: "النتيجة النهائية",
        dtp_final_winner_label: "الفائز: {name} 🏆🎉",
        dtp_final_tie_label: "تعادل الأبطال 🤝",
        dtp_final_rounds_label: "عدد الجولات: {n}",
        dtp_final_points_label: "مجموع النقاط: {n}",
        dtp_final_back_btn: "العودة للرئيسية",
        // 🌟 [جديد] زر فتح تقرير المواجهة الكامل من شاشة النتيجة النهائية، ومُعاد استخدامه
        // أيضاً لكل صف في نافذة "📜 المباريات السابقة" (dual-test-setup.js) — راجع
        // reports/dual-test-report.js. ⚠️ كان هذا المفتاح مُستخدَماً بالفعل في dual-test-play.html
        // (data-i18n="dtp_view_report_btn") لكنه لم يكن مُعرَّفاً هنا فعلياً — تم تداركه الآن.
        dtp_view_report_btn: "عرض تقرير المواجهة",
        // 🌟 [جديد] نظام الأوسمة/الإنجازات — راجع BADGE_CATALOG في engine/dualTestEngine.js
        dtp_new_badges_title: "🎖️ أوسمة جديدة!",
        badge_first_duel_name: "أول نزال 🥇",
        badge_first_duel_desc: "أول مواجهة ثنائية مكتملة لهذا الطالب",
        badge_perfect_name: "أداء مثالي 🌟",
        badge_perfect_desc: "فوز بكل الجولات الثلاث بلا أي خطأ في المواجهة كاملة",
        badge_no_swap_name: "بلا تبديل 💎",
        badge_no_swap_desc: "فوز بالمواجهة كاملة دون استخدام حق التبديل في أي جولة",
        badge_streak_name: "سلسلة انتصارات 🔥",
        badge_streak_desc: "تحقيق 3 انتصارات متتالية (أو مضاعفاتها) عبر المواجهات",
        dtpa_no_badges_yet: "لا توجد أوسمة بعد — أول مواجهة ثنائية مكتملة ستُغيّر ذلك! 🎯",
        home_quickview_title: "مهام اليوم",
        home_bday_today: "يوم ميلاد الطالب {name} اليوم",
        home_mastery_avg_label: "متوسط نسبة الإتقان العام",
        home_mastery_avg_sub: "بناءً على آخر التقييمات",
        home_mastery_no_data: "لا توجد بيانات كافية بعد",
        home_reports_count_label: "تقييمات وتقارير صادرة هذا الشهر",
        // 🌟 [جديد] نظام "المراجعة المتباعدة" (Anki/Duolingo) — قائمة "مستحق اليوم"
        home_due_title: "مستحق المراجعة اليوم",
        // 🌟🌟 [جديد] سطر الملخص المطوي فوق القائمة التفصيلية (بطلب المعلم لتقليل
        // طول بطاقة "نظرة سريعة") — النقر عليه يفتح/يطوي القائمة أسفله. راجع
        // renderDueForReview في components/homeQuickview.js
        home_due_badge: "📚 {n} مستحق المراجعة اليوم",
        home_due_no_range: "لا يوجد نطاق حفظ مسجَّل",
        home_due_overdue_by: "متأخر",
        home_due_days_unit: "يوم",
        home_due_today: "اليوم",
        // 🌟🌟 [جديد] تذكير "مواجهات ثنائية تنتظر الاستكمال" على الشاشة الرئيسية — راجع
        // renderPendingDualMatchesReminder في components/homeQuickview.js
        home_pm_title: "⏰ مواجهات تنتظر الاستكمال",
        // 🌟🌟 [جديد] سطر الملخص المطوي (نفس فلسفة home_due_badge أعلاه)
        home_pm_badge: "⏰ {n} مواجهات تنتظر الاستكمال",
        home_pm_paused_since: "معلّقة منذ",
        // 🌟 [جديد] تذكير شهري بتحديث بيانات حفظ الطلاب (بانر الشاشة الرئيسية)
        home_memo_reminder_text: "حان وقت مراجعة نطاق حفظ الطلاب وتحديثه لمن تقدّم في الحفظ هذا الشهر 📖",
        home_memo_reminder_btn: "تحديث الآن",
        home_memo_reminder_notif_title: "📖 تذكير شهري: تحديث بيانات الحفظ",
        home_memo_reminder_notif_body: "راجع نطاق حفظ كل طالب (من - إلى) وحدّثه لمن تقدّم هذا الشهر",

        // Games (Adult & Kids) HTML
        eval_path: "مسار التقييم الشامل",
        exit_game: "🚪 خروج وإنهاء",
        game_fs_enter: "⛶ ملء الشاشة",
        game_fs_exit: "🗗 الخروج من ملء الشاشة",
        // 🌟 [جديد] رسالة تأكيد قبل الخروج من جلسة تقييم بها إجابات مسجَّلة بالفعل — نفس فكرة
        // التأكيد الموجودة في dualtests/dual-test-play.js عند الخروج من مواجهة جارية، لمنع فقد
        // تقييم كامل بضغطة واحدة بالخطأ (راجع الشرط في adultGame.js/kidsGame.js: لا يظهر
        // التأكيد إلا لو فيه إجابة واحدة على الأقل مسجَّلة في هذه الجلسة)
        // 🌟 [عدّل] أُضيفت الإشارة لزر "حفظ والعودة لاحقًا" الجديد كبديل عن فقد الإجابات
        exit_game_confirm_msg: "سجّلت إجابات في هذه الجلسة ولم تُحفظ بعد. الخروج الآن سيفقدها نهائياً (لو تريد الاستكمال لاحقاً اضغط «⏸️ حفظ والعودة لاحقًا» بدل الخروج). هل تريد المتابعة بالخروج؟",
        // 🌟 [جديد] "حفظ والعودة لاحقًا" لاختبار الطالب — راجع components/pausedSession.js
        pause_game_btn: "⏸️ حفظ والعودة لاحقًا",
        pause_confirm_msg: "هل تريد حفظ هذا الاختبار والعودة لاستكماله لاحقاً؟ ستبقى إجاباتك محفوظة وسيُغلق الاختبار الآن.",
        pause_nothing_yet: "أجب عن سؤال واحد على الأقل أولاً، ثم يمكنك حفظ الاختبار والعودة لاستكماله لاحقاً.",
        pause_replace_confirm: "لهذا الطالب اختبار غير مكتمل محفوظ من قبل. حفظ هذا الاختبار سيستبدله. هل تريد المتابعة؟",
        pause_save_failed: "تعذّر حفظ الاختبار. لم يتغيّر شيء — يمكنك المحاولة مرة أخرى.",
        pause_saved_msg: "✅ تم حفظ الاختبار. عند اختيار هذا الطالب مرة أخرى ستظهر بطاقة «استكمال».",
        paused_card_title: "اختبار غير مكتمل",
        paused_card_progress: "أنجز {done} من {total}",
        paused_card_resume_btn: "▶️ استكمال",
        paused_card_discard_btn: "🗑️ إلغاء",
        paused_discard_confirm: "سيُحذف هذا الاختبار غير المكتمل نهائياً ولن يمكن استكماله. (أخطاء الطالب ونقاطه المسجَّلة سابقاً تبقى محفوظة). هل أنت متأكد؟",
        paused_when_today: "اليوم",
        paused_when_yesterday: "أمس",
        paused_when_days: "منذ {n} أيام",
        notes_on_q: "📝 ملاحظات على السؤال",
        show_ans_match: "👁️ إظهار الإجابة للمطابقة",
        hide_ans: "🙈 إخفاء الإجابة",
        correct_ans_btn: "🟢 إجابة صحيحة تامة",
        record_note_btn: "📝 تسجيل ملاحظة",
        // 🌟 [تعديل] كان "اعتماد والانتقال للسؤال التالي" — صار أخف وأوضح كنهاية للسؤال 🌟
        submit_next_btn: "⏭️ تم، إلى السؤال التالي",
        order_inst: "اضغط على الآية لنقلها، وللإرجاع اضغط عليها في الترتيب الصحيح",
        correct_order: "الترتيب الصحيح",
        shuffled_ayahs: "الآيات المبعثرة",
        right_page: "(الصفحة اليمنى)",
        left_page: "(الصفحة اليسرى)",
        close_zoom: "✖️ إغلاق التكبير",
        // 🌟 [تعديل] استبدلنا كلمة "خطأ" في عنوان النافذة واختيارات التسجيل بصياغة أهدأ
        // ("ملاحظة"/"تحتاج مراجعة") — لأن هذه النافذة تظهر على نفس شاشة الطفل أثناء
        // التسميع المباشر، وكانت كلمة "خطأ" بالأحمر تخوّف بعض الأطفال. القيمة المخزَّنة
        // فعلياً (attribute value في checkbox بالـ HTML) اتغيّرت بنفس الصياغة الجديدة
        // حتى يتطابق كل ما يُعرض للطفل الآن مع ما يُحفظ ويُعرض لاحقاً في التقارير 🌟
        record_error_title: "تسجيل ملاحظة مؤقتة",
        // 🌟 [تعديل] الوصف صار يذكر الاسم الجديد للزر (حفظ وتكملة السؤال) بدل "إضافة ومتابعة" 🌟
        record_error_desc: "سجل الملاحظة ثم اضغط (حفظ وتكملة السؤال) ليبقى الطالب في نفس السؤال.",
        err_word: "كلمة تحتاج مراجعة",
        err_multi: "أكتر من نقطة تحتاج مراجعة",
        err_haraka: "حركة تحتاج تصحيح",
        err_forget: "نسيان آية",
        err_dont_know: "لم يعرف الإجابة",
        note_ph: "اكتب ملاحظتك اليدوية هنا (اختياري)...",
        // 🌟 [تعديل] كان "إضافة الملاحظة ومتابعة التسميع" — عبارة "متابعة التسميع" كانت غامضة
        // (توحي بالانتقال للسؤال التالي)، والاسم الجديد يوضح أن الزر يحفظ الملاحظة ويُبقي
        // الطالب في نفس السؤال 🌟
        add_err_cont: "➕ حفظ وتكملة السؤال",
        hint_btn: "💡 تلميح",
        kids_club: "🎈 نادي الأبطال الصغار",
        kids_order_inst: "اضغط على الكلمة لنقلها وتكوين الآية الصحيحة! 👆",
        correct_ayah: "الآية الصحيحة",
        shuffled_words: "الكلمات المبعثرة",

        // 🌟 [جديد] لعبة "اربط أول الآية بآخرها" (ركن الكبار وركن الأطفال معاً)
        link_inst: "اضغط على بداية الآية أولاً من العمود الأول، ثم اضغط على نهايتها الصحيحة من العمود الثاني لتوصيلهما",
        link_starts_title: "بدايات الآيات",
        link_ends_title: "نهايات الآيات",

        // 🌟 [قديم — غير مُستخدَمة حالياً] كانت خاصة بلعبة "رتب السور" (استُبدلت بلعبة "اربط
        // الكلمة بالسورة" أدناه)، تركناها بلا حذف احترازًا
        order_surahs_inst: "اضغط على اسم السورة لنقلها، وللإرجاع اضغط عليها في الترتيب الصحيح",
        shuffled_surahs: "السور المبعثرة",

        // 🌟 [إعادة تصميم] لعبة "اربط الكلمة بالسورة" (ركن الكبار في وضع الجزء، وركن الأطفال ضمن
        // نطاقه المختار) — محل لعبة "رتب السور" أعلاه. تشارك نفس حاوية لعبة "اربط أول الآية
        // بآخرها" فتحتاج نصوص تعليمة وعناوين أعمدة مستقلة خاصة بها
        link_word_surah_inst: "اضغط على الكلمة أولاً من العمود الأول، ثم اضغط على اسم السورة التي وردت فيها هذه الكلمة من العمود الثاني",
        link_word_surah_starts_title: "كلمات من القرآن الكريم",
        link_word_surah_ends_title: "أسماء السور",

        // Reports HTML
        report_title: "تقرير التقييم القرآني",
        report_subtitle: "منظومة الإتقان والقياس المهاري",
        student_label: "👤 الطالب:",
        eval_label: "📖 التقييم:",
        date_label: "📅 التاريخ:",
        time_taken: "الوقت المستغرق",
        answered_qs: "الأسئلة المُجابة",
        edu_analysis: "📊 التحليل المهاري التربوي",
        measured_skill: "المهارة التي تم قياسها",
        mastery_level: "مستوى الإتقان",
        strengths_title: "🌟 أبرز نقاط القوة:",
        weaknesses_title: "📈 يحتاج إلى مراجعة:",
        // 🌟 [جديد] تاريخ تسجيل الخطأ — يظهر في شاشة "علاج الخطأ السابق" حتى يعرف
        // المعلم متى أخطأ الطالب في هذا السؤال تحديداً 🌟
        error_recorded_on: "سُجل بتاريخ:",
        // 🌟 [جديد] ترويسة صيغة السؤال في شاشة "علاج الخطأ السابق" + تنبيه الأخطاء القديمة غير القابلة للاسترجاع 🌟
        weak_q_label: "السؤال:",
        weak_q_legacy: "خطأ قديم: سُجِّل قبل أن تُحفظ تفاصيل السؤال، لذلك لا يمكن استرجاع صيغة السؤال الأصلية. اسأل الطالب عن الآية بالصيغة التي تراها مناسبة.",
        // 🌟 [جديد] تحديد موضع الخطأ بالتحديد (من آية ... إلى آية ...) في أسئلة التسميع —
        // راجع components/reciteRangePicker.js
        recite_range_title: "📍 موضع الخطأ بالتحديد (اختياري)",
        recite_range_desc: "حدد الآيات التي وقع فيها الخطأ ليظهر الموضع بدقة عند علاج الخطأ لاحقاً.",
        recite_range_from: "من",
        recite_range_to: "إلى",
        recite_range_any: "— غير محدد —",
        recite_range_ayah: "آية",
        recite_range_label: "موضع الخطأ:",
        recite_range_q_prefix: "سمّع",
        recite_range_surah: "سورة",
        recite_range_start_from: "ابدأ من قوله تعالى:",
        recite_range_end_at: "إلى قوله تعالى:",
        // 🌟 [جديد] نافذة "أرشيف الأخطاء المصححة" في شاشة ملف الطالب — تعرض كل خطأ
        // سابق صحّحه الطالب بدل ما يختفي أثره نهائياً بعد تصحيحه (راجع
        // resolvedWeaknesses في student.js وadultGame.js/kidsGame.js) 🌟
        archive_title: "أرشيف الأخطاء المعالَجة",
        archive_desc: "سجل كامل لكل خطأ سابق صحّحه الطالب، مع تاريخ ارتكابه وتاريخ تصحيحه.",
        archive_empty: "لا يوجد أرشيف بعد 🎉",
        archive_resolved_on: "تم تصحيحه بتاريخ:",
        detailed_log: "📝 السجل التفصيلي (أسئلة وملاحظات الجلسة الحالية)",
        seq: "م",
        activity_ayah: "النشاط / الآيات",
        ans_status_note: "حالة الإجابة والملاحظة",
        note_title: "ملاحظة:",
        note_body1: "هذا التقييم لا يقيس الحفظ المسموع فقط، بل يقيس دقة الحفظ، وسرعة الاستدعاء، وترتيب الآيات، والربط بينها، والتمييز بين المتشابهات، لبناء وتأسيس ذاكرة قرآنية قوية وراسخة بإذن الله.",
        note_body2: "هذا التقييم خاص بهذه الأسئلة أو نطاق السور المحددة التي اختبر فيها الطالب.",
        teacher_sig: "معلم القرآن الكريم:",
        upload_stamp: "رفع الختم / التوقيع",
        remove_stamp: "إزالة الختم",
        print_rep: "🖨️ حفظ التقرير (PDF)",
        send_wa: "💬 إرسال لولي الأمر",
        open_profile: "📊 فتح ملف الطالب",
        back: "🔙 العودة",

        // 🌟 Homework System Additions (نظام الواجبات) 🌟
        // 🌟 [إصلاح] كانت الترجمة تنتهي بإيموجي 📚 إضافي رغم وجود أيقونة 📚 منفصلة بجانب العنوان
        // في settings/homework-prep.html (.hwp2-header-icon) — التكرار كان يظهر بصرياً وكأن
        // الكلمة الأخيرة من العنوان "متداخلة"/ملتصقة بأيقونة أخرى مطابقة لها بجوارها مباشرة
        hw_management_title: "نظام إدارة الواجبات",
        // 🌟🌟 [جديد] عنوان فرعي صغير أسفل عنوان الشاشة في التصميم الجديد بعرض الصفحة الكامل —
        // نص ثابت وصفي فقط (اسم المنصة + دور الشاشة)، وليس بيانات تُجلب من مكان آخر
        hw_header_subtitle: "منصة حمٓ — لوحة تحكم المعلم",
        hw_published_now: "منشور الآن 🚀",
        hw_draft_status: "مسودة 📝",
        // 🌟🌟 [محدَّث] استُبدل مفتاح hw_total_submissions (بطاقة كانت تعرض "0" ثابتة، بلا أي كود
        // يحدّثها فعلياً) ببطاقة "يحتاج تصحيح" الفعّالة — تُحسب من السحابة فعلاً وتنقل المعلم
        // بالنقر لتبويب سجل الواجبات مباشرة
        hw_needs_grading: "يحتاج تصحيح ✍️",
        // 🌟 نص العلامة الصغيرة التي تظهر بجانب أي واجب في السجل له تسليم بانتظار التصحيح اليدوي
        hw_needs_grading_row_badge: "يحتاج تصحيح",
        // 🌟 تلميح (title) بطاقة "يحتاج تصحيح" — يُضبط ديناميكياً من JS وليس عبر data-i18n
        hw_needs_grading_tooltip: "اضغط للانتقال لسجل الواجبات 📊",
        // 🌟 [جديد] نص صغير ثابت الظهور داخل البطاقة نفسها (مش tooltip بيظهر بالـ hover فقط)
        // يوضّح إنها قابلة للنقر — مهم خصوصاً على تابلت/موبايل حيث لا يوجد hover أصلاً
        // فيبقى ظاهر إن هذه البطاقة تحديداً (بعكس جارتيها "منشور الآن"/"مسودة") فعّالة
        hw_needs_grading_hint: "اضغط لعرض التفاصيل ›",
        hw_btn_new: "➕ إعداد واجب جديد",
        hw_btn_history: "📊 سجل الواجبات",
        hw_desc: "حدد النطاق لتوليد الأسئلة، ويمكنك التعديل عليها أو إضافة أسئلة يدوية.",
        hw_assign_student: "👤 تخصيص الواجب لطالب محدد (اختياري):",
        hw_general_link: "-- رابط عام (لجميع الطلاب) --",
        // 🌟 [جديد] البحث بالاسم في قائمة تخصيص الواجب لطالب محدد
        hw_student_search_placeholder: "🔍 ابحث عن اسم طالب...",
        hw_student_search_noresult: "لا يوجد طالب بهذا الاسم",
        hw_general_btn: "🌐 رابط عام لكل الطلاب",
        hw_or_specific: "أو خصّص الواجب لطالب محدد:",
        hw_hint_general: "سيكتب الطالب اسمه بنفسه عند فتح الرابط.",
        hw_hint_student: "سيظهر الواجب باسم هذا الطالب مباشرة، ولا يكتب اسمه.",
        // 🌟 [جديد] اقتراح نطاق الاختبار تلقائياً بناءً على حفظ الطالب المسجَّل
        hw_memo_suggestion_prefix: "🌟 اقتراحات سريعة بناءً على حفظ الطالب المسجَّل:",
        // 🌟🌟 [جديد] نفس النص أعلاه لكن لحالة "نطاق حفظ واسع" — يظهر فقط آخر عدد محدود من
        // السور بدل نطاق حفظ الطالب كاملاً (راجع MEMO_SUGGESTION_MAX_SURAHS في
        // settings/homework-prep.js). {n} = عدد السور المعروضة.
        hw_memo_suggestion_recent_prefix: "🌟 آخر {n} سور من حفظ الطالب المسجَّل:",
        // 🌟 [جديد] رقاقة اقتراح خاصة لحالة "جزء عم كاملاً" (بدل سورة بسورة)
        hw_memo_suggestion_juz_amma: "جزء عم كاملاً (الجزء 30)",
        // 🌟 [جديد] تنبيه تغطية السور لجزء عمّ (components/juzAmmaCoverageNote.js)
        juz_amma_coverage_note: "النطاق فيه {total} سورة، وهذا الاختبار يغطي {n} منها. السور الباقية ستأتي في الاختبارات القادمة. للتغطية الكاملة في جلسة واحدة ارفع عدد الأسئلة.",
        juz_amma_coverage_btn: "اجعلها {total} سؤالاً",
        hw_btn_generate: "⚙️ توليد الأسئلة آلياً",
        hw_review_q: "🔍 مراجعة الأسئلة",
        hw_add_manual_q: "➕ إضافة سؤال يدوي",
        hw_publish_btn: "🚀 اعتماد ونشر الواجب",
        hw_draft_btn: "📝 حفظ كمسودة",
        hw_history_title: "سجل الواجبات المُنْشأة",
        hw_created_date: "تاريخ الإنشاء",
        hw_q_type: "الأسئلة والنوع",
        hw_status: "الحالة",
        hw_actions: "إجراءات",
        hw_btn_back_home: "🔙 العودة للرئيسية",
        hw_modal_q_title: "إضافة/تعديل سؤال",
        hw_q_type_label: "نوع السؤال:",
        hw_q_title_label: "عنوان السؤال:",
        hw_q_text_label: "نص السؤال / الآية:",
        hw_q_options_label: "الخيارات المتاحة (افصل بينها بسطر جديد):",
        hw_q_correct_label: "الإجابة الصحيحة:",
        hw_save_q_btn: "حفظ السؤال في الواجب",
        hw_cancel_btn: "إلغاء",
        hw_share_success: "تم الحفظ بنجاح! 🎉",
        hw_share_desc: "قم بنسخ الرابط التالي وإرساله لطلابك عبر الواتساب ليبدأوا التحدي مباشرة:",
        // 🌟 [جديد] تحذير يظهر في نافذة المشاركة فقط لو فشل رفع الواجب للسحابة (راجع
        // saveHomeworkToDB في settings/homework-prep.js) — الرابط في هذه الحالة يعمل حالياً
        // على جهاز المعلم فقط (عبر النسخة المحلية)، وسيُعاد رفعه تلقائياً لاحقاً
        hw_cloud_sync_warning: "⚠️ تم حفظ الواجب على هذا الجهاز، لكن تعذّر رفعه للسحابة الآن (تحقق من الاتصال بالإنترنت). لن يعمل هذا الرابط إلا على هذا الجهاز حتى تتم إعادة رفعه — يُفضَّل عدم إرساله للطلاب الآن. سيُعاد رفعه تلقائياً بمجرد عودة الاتصال أو عند فتح هذه الشاشة لاحقاً، أو يمكنك الضغط على زر إعادة المحاولة تحت مباشرة.",
        // 🌟🌟 [جديد] زر يظهر فقط بجانب التحذير أعلاه — يعيد محاولة رفع هذا الواجب للسحابة فوراً
        // بضغطة واحدة (راجع retryHomeworkCloudSync في settings/homework-prep.js)
        hw_retry_sync_btn: "🔄 إعادة المحاولة الآن",
        // 🌟🌟 [جديد] علامة صغيرة تظهر بجانب أي واجب منشور في سجل الواجبات لا يزال عالقاً محلياً
        // ولم يصل للسحابة بعد (راجع isHomeworkPendingSync في core/firebase.js)
        hw_pending_sync_row_badge: "لم يُرفع للسحابة بعد",
        // 🌟🌟 [جديد — المرحلة 2] تنبيه يظهر في شاشة نتائج واجب معيّن لو فيه تسليم طالب (أو أكثر)
        // فشل رفعه للسحابة ولا يزال عالقاً محلياً على جهاز الطالب نفسه فقط — راجع
        // getPendingSubmissionsCountForHomework في core/firebase.js. {n} = العدد.
        hw_pending_submissions_banner: "يوجد {n} تسليم(ات) لطلاب حلّوا هذا الواجب لكن لم تصل نتيجتهم للسحابة بعد (لا تزال عالقة على جهاز الطالب). ستصل تلقائياً بمجرد توفر الاتصال لديه.",
        // 🌟🌟 [جديد — دمج نظام الواجبات الجديد] مفاتيح الخادم الجديد وشاشة الطالب وبوابة المعلم
        hw_err_network: "تعذّر الاتصال بالإنترنت أو بالخادم.",
        hw_err_timeout: "استغرق الاتصال وقتاً طويلاً. تأكد من الإنترنت وحاول مرة أخرى.",
        hw_err_bad_response: "ردّ الخادم غير مفهوم. حاول مرة أخرى بعد قليل.",
        hw_err_unauthorized: "انتهت جلسة نظام الواجبات. أعد فتح نظام الواجبات وسجّل الدخول بجوجل من جديد.",
        hw_err_not_found: "هذا الواجب غير موجود. تأكد أن الرابط كامل وصحيح.",
        hw_err_closed: "هذا الواجب مغلق ولا يستقبل تسليمات جديدة.",
        hw_err_already: "تم تسليم هذا الواجب مسبقاً بنفس الاسم.",
        hw_err_busy: "الخادم مشغول الآن. حاول بعد لحظات.",
        hw_err_not_persisted: "لم يتأكد الخادم من حفظ البيانات. حاول مرة أخرى.",
        hw_err_ungraded: "يوجد أسئلة تحتاج تصحيحاً يدوياً لم تُدخل لها درجة.",
        hw_err_conflict: "تم تعديل هذا التسليم من مكان آخر. حدّث الصفحة ثم حاول.",
        hw_err_generic: "حدث خطأ غير متوقع",
        // 🌟 [جديد] شاشة فشل الإقلاع (تدقيق ما قبل الإطلاق)
        boot_fail_quran_title: "تعذّر تحميل نص القرآن",
        boot_fail_quran_body: "يحتاج التطبيق إلى الإنترنت في أول تشغيل لتنزيل نص المصحف مرة واحدة فقط. تأكد من الاتصال ثم أعد المحاولة.",
        boot_fail_generic_title: "تعذّر تشغيل المنصة",
        boot_fail_generic_body: "حدث خطأ أثناء التشغيل. جرّب إعادة التحميل، وإن تكرّر فأغلق التبويبات الأخرى للمنصة ثم أعد المحاولة.",
        boot_fail_retry: "إعادة المحاولة",
        // 🌟 [إصلاح تدقيق ما قبل الإطلاق] مفاتيح تقرير الاختبارات الثنائية (كانت تظهر كأسماء خام لأنها غير معرَّفة)
        dtr_teacher_data_label: "بيانات المعلم",
        dtr_teacher_name_placeholder: "اسم المعلم",
        dtr_upload_signature_btn: "رفع توقيع",
        dtr_export_label: "تصدير",
        dtr_png_btn: "صورة عالية الجودة",
        dtr_pdf_btn: "ملف PDF",
        dtr_home_btn: "العودة للرئيسية",
        dtr_note_label: "ملاحظة لولي الأمر (اختياري):",
        dtr_note_placeholder: "اكتب هنا ملاحظتك لولي الأمر — إن تركتها فارغة سيظهر تعليق تلقائي مبني على نتيجة المواجهة.",
        dtr_note_hint: "تظهر في صندوق \"ملاحظة المعلم\" بالأسفل",
        dtr_eyebrow: "🆚 تقرير مواجهة — الاختبارات الثنائية",
        dtr_total_points_sub: "مجموع النقاط",
        dtr_ladder_title: "📊 سلّم الجولات",
        dtr_rounds_detail_title: "📋 تفاصيل كل جولة — كل الأسئلة كما جرت بالفعل",
        dtr_note_box_label: "ملاحظة المعلم لولي الأمر",
        dtr_footer_auto_line: "تقرير مواجهة تلقائي، معتمد من المعلم",
        dtr_sign_label: "توقيع المعلم",
        dtr_default_teacher_label: "المعلم",
        dtr_export_error_alert: "تعذّر تصدير التقرير:",
        dtr_invalid_image_alert: "الرجاء اختيار ملف صورة صالح.",
        dtr_signature_upload_error: "تعذّر رفع التوقيع.",
        dtr_busy_label: "جاري التجهيز...",
        dtr_points_unit: "نقطة",
        dtr_question_unavailable: "السؤال غير متاح",
        dtr_mistakes_deduction: "أخطاء: {n} (خصم {d})",
        dtr_no_mistakes: "بلا أخطاء",
        dtr_helper_used_tag: "استخدم المساعد",
        dtr_swap_tag: "سؤال استبدال",
        dtr_qcol_empty: "لا أسئلة مسجّلة لـ {name}",
        dtr_qcol_questions_of: "أسئلة {name}",
        dtr_round_summary_mistakes: "الأخطاء: {a} / {b}",
        dtr_round_summary_helper: "المساعد: {a} / {b}",
        dtr_round_summary_swap: "الاستبدال: {a} / {b}",
        dtr_auto_note_tie: "انتهت المواجهة بين {a} و{b} بالتعادل ({pa} - {pb} نقطة). أداء متكافئ ما شاء الله، بارك الله فيهما.",
        dtr_auto_note_win: "فاز {winner} في المواجهة أمام {loser} (الجولات {wr} - {lr}، فارق {diff} نقطة). بارك الله في الطالبين وزادهما حرصاً على كتاب الله.",
        header_home_btn: "الرئيسية",
        hw_publish_failed: "❌ لم يتم نشر الواجب (لم يؤكد الخادم حفظه). لم يُنشأ أي رابط.",
        hw_link_check_failed: "❌ تعذّر التأكد من الرابط.",
        hw_link_check_late_failed: "⚠️ الواجب منشور، لكن تعذّر التأكد من أن الرابط يفتح عند الطالب. جرّب فتح الرابط بنفسك قبل إرساله.", // 🌟
        hw_results_load_error: "⚠️ تعذّر تحميل النتائج:",
        hw_legacy_row_badge: "واجب قديم",
        hw_grade_save_btn: "💾 حفظ الدرجات واعتماد النتيجة",
        hw_grade_saved: "✅ تم اعتماد النتيجة النهائية: {score}%",
        hw_grade_failed: "❌ لم يتم حفظ التصحيح.",
        hw_grade_record_saved: "وأُضيفت إلى سجل الطالب «{name}».",
        hw_grade_record_failed: "⚠️ اعتُمدت النتيجة في الخادم لكن تعذّرت كتابتها في سجل الطالب على هذا الجهاز.",
        hw_grade_record_skipped: "لم تُضف النتيجة لسجل أي طالب (يمكنك ربطها لاحقاً).",
        stu_login_name_required: "الرجاء كتابة أو اختيار اسم الطالب أولاً!",
        stu_name_required: "الاسم مطلوب!",
        stu_name_duplicate: "يوجد طالب مسجّل بنفس هذا الاسم بالفعل؛ أضف ما يميّزه (مثل حرف أو رقم) حتى لا تختلط سجلاتهما.",
        stu_saved_ok: "تم الحفظ بنجاح!",
        // 🌟 [جديد 2026-10-03] شاشة "ماذا تريد أن تبدأ معه؟" بعد تسجيل طالب جديد (components/newStudentChoice.js)
        nsc_title: "تم تسجيل {name} بنجاح 🎉",
        nsc_question: "ماذا تريد أن تبدأ معه؟",
        nsc_kids_btn: "🧒 ألعاب الصغار",
        nsc_adults_btn: "🧑 ألعاب الكبار",
        nsc_back_btn: "العودة إلى طلابي",
        stu_edited_ok: "تم التعديل ✔️",
        stu_delete_confirm: "⚠️ تحذير: هل أنت متأكد من حذف بيانات وسجل هذا الطالب نهائياً؟",
        stu_screen_preparing: "جاري تجهيز الشاشة 🛠️",
        hw_ambiguous_student_confirm: "يوجد {n} طلاب بنفس الاسم «{name}» في سجلك. هل تريد ربط النتيجة بأول طالب منهم؟ (إلغاء = اعتماد النتيجة بلا ربط بسجل أي طالب)",
        hw_create_student_confirm: "لا يوجد طالب باسم «{name}» في سجلك. هل تريد إنشاءه وإضافة النتيجة لسجله؟",
        // 🌟🌟 [جديد] شهادة التقدير التي تظهر فور اعتماد المعلم للدرجة النهائية لأي تسليم واجب —
        // راجع reports/hwCertificate.js
        hwcert_title: "شهادة تقدير 🏅",
        hwcert_logo_alt: "شعار منصة حمٓ",
        hwcert_number_label: "رقم الشهادة",
        hwcert_granted_to: "تُمنح هذه الشهادة للطالب",
        hwcert_tier_name_excellent: "ممتاز",
        hwcert_tier_name_good: "جيد جدًا",
        hwcert_tier_name_average: "جيد",
        hwcert_tier_name_weak: "واصل",
        hwcert_verse: "﴿ وَرَتِّلِ الْقُرْآنَ تَرْتِيلًا ﴾",
        hwcert_verse_ref: "سورة المزمل: 4",
        hwcert_teacher_label: "المعلم",
        hwcert_date_label: "التاريخ",
        hwcert_subtitle: "منصة حمٓ لتثبيت الحفظ و المراجعة", // 🌟 الاسم المعتمد بعلامة المد (U+0653) وبدون "دار"
        hwcert_score_label: "النتيجة النهائية",
        hwcert_tier_excellent: "🌟 أداء رائع ومتميز! استمر بهذا التألق، أنت قدوة لزملائك.",
        hwcert_tier_good: "👏 عمل جيد جدًا! خطوة كبيرة نحو الإتقان، واصل بهذا الجهد.",
        hwcert_tier_average: "💪 بداية طيبة، وبمزيد من المراجعة ستصل بإذن الله للتميز.",
        hwcert_tier_weak: "🌱 كل محاولة تتعلم منها هي تقدم حقيقي — لا تستسلم وواصل المحاولة، نحن معك.",
        hwcert_mistakes_title: "📝 نقاط تحتاج مراجعة",
        hwcert_no_mistakes: "🎉 بلا أي أخطاء — إجابات كاملة في كل الأسئلة!",
        hwcert_correct_answer_label: "الصواب:",
        hwcert_save_btn: "💾 حفظ كصورة",
        hwcert_share_btn: "📲 إرسال عبر واتساب",
        hwcert_close_btn: "إغلاق ✖️",
        hwcert_share_unsupported_note: "تم تنزيل الشهادة كصورة — أرفقها يدوياً في محادثة واتساب مع الطالب.",
        hwcert_save_failed: "❌ تعذّر إنشاء صورة الشهادة. حاول مرة أخرى.",
        hwcert_default_student: "الطالب",
        // 🌟 [جديد] مربع "كلمة من المعلم" الاختياري في غرفة التصحيح + ظهوره في شهادة التقدير
        hw_teacher_note_label: "كلمة من المعلم للطالب (اختياري)",
        hw_teacher_note_placeholder: "اكتب هنا كلمة تشجيع أو توجيه تظهر في شهادة التقدير…",
        hw_teacher_note_hint: "اختياري — لو تركته فارغًا لن يظهر شيء في الشهادة. الحد الأقصى 300 حرف.",
        hw_grade_wrong: "خطأ",
        hwcert_teacher_note_title: "💬 كلمة من المعلم",
        // 🌟 نطاق الواجب في شهادة التقدير (يُملأ من النطاق الحقيقي المسجَّل مع الواجب)
        hwcert_scope_title: "📖 نطاق الواجب",
        hwcert_scope_surah: "سورة {surah} — من الآية {from} إلى الآية {to}",
        hwcert_scope_range: "من سورة {from} إلى سورة {to}",
        hwcert_scope_juz: "الجزء {juz}",
        // 🌟 حذف الواجب: نافذة تأكيد بوسط الشاشة + تنبيه "لم يحل الواجب" (بلا أي إرسال تلقائي)
        hw_delete_confirm_title: "حذف الواجب",
        hw_delete_confirm_body: "هل أنت متأكد من حذف هذا الواجب نهائياً؟",
        hw_delete_confirm_btn: "نعم، احذف",
        hw_delete_cancel_btn: "إلغاء",
        hw_delete_q_title: "حذف السؤال",
        hw_delete_q_body: "هل أنت متأكد من حذف هذا السؤال من الواجب؟",
        hw_overdue_not_solved: "الطالب {name} لم يحلّ الواجب بعد",
        // 🌟🌟 [جديد] زر ونافذة "النتائج النهائية للطلاب" — قائمة كل الواجبات المصحَّحة والمعتمدة
        // مع إمكانية إعادة فتح شهادة أي طالب منها
        hw_final_results_btn: "🎓 النتائج النهائية للطلاب",
        hw_final_results_title: "🎓 الاختبارات المصحَّحة والنتائج النهائية",
        hw_final_results_empty: "لا توجد نتائج معتمدة بعد.",
        hw_final_results_load_error: "⚠️ تعذّر تحميل النتائج النهائية:",
        hw_final_results_view_cert_btn: "🏅 عرض الشهادة",
        hw_final_results_close_btn: "إغلاق النافذة ✖️",
        // 🌟🌟 [جديد] رسالة نسخ رابط الواجب — جاهزة كاملة للمشاركة عبر واتساب أو أي تطبيق
        // مراسلة، لا مجرد الرابط وحده — راجع buildHomeworkShareMessage في settings/homework-prep.js
        hw_copy_msg_title: "📚 واجب منزلي",
        hw_copy_msg_student_label: "👤 الطالب:",
        hw_copy_msg_link_label: "🔗 الرابط:",
        hw_copy_msg_footer: "يرجى الدخول إلى الرابط وحل الواجب، ثم الضغط على «تسليم» بعد الانتهاء ... مع تمنياتي لك بالتوفيق 🌟",
        // 🌟🌟 [جديد] نص التنبيه العائم (Toast) لإشعار المعلم بتسليم واجب جديد — راجع
        // core/homeworkNotifier.js
        hw_notif_new_submission_title: "🔔 تسليم واجب جديد",
        hw_notif_new_submission_body: "الطالب {name} سلّم واجبه الآن.",
        hw_notif_many_body: "وصلك {n} تسليمات جديدة.", // 🌟 إشعار سطح المكتب المجمَّع
        hw_notif_unknown_student: "أحد الطلاب",
        hw_st_legacy_link: "هذا رابط واجب قديم لم يعد يعمل. اطلب من معلمك رابطاً جديداً.",
        hw_st_loading: "⏳ جاري تحميل الواجب...",
        hw_st_nothing_submitted: "لم يُرسل شيء بعد.",
        hw_st_retry_load: "🔄 إعادة المحاولة",
        hw_st_welcome_prefix: "أهلاً بك يا بطل",
        hw_st_name_label: "اكتب اسمك الكامل ليصل واجبك لمعلمك:",
        hw_st_name_placeholder: "مثال: أحمد محمد",
        hw_st_name_required: "اكتب اسمك (حرفان على الأقل) أولاً.",
        hw_st_play_load_error: "تعذّر فتح شاشة الواجب. أعد تحميل الصفحة.",
        hw_st_incomplete_data: "بيانات الواجب غير مكتملة. ارجع للرابط وحاول من جديد.",
        hw_st_hero_prefix: "الطالب:",
        hw_st_offline_banner: "📴 لا يوجد اتصال بالإنترنت. إجاباتك محفوظة على جهازك وستُرسل تلقائياً عند عودة الاتصال.",
        hw_st_storage_banner: "⚠️ المتصفح لا يسمح بحفظ الإجابات على الجهاز (ربما وضع التصفح الخاص). لا تُغلق الصفحة قبل تأكيد الاستلام.",
        hw_st_retry_btn: "🔄 إعادة الإرسال الآن",
        // 🌟 [جديد 2026-10-02] الاسم مكرَّر: نطلب من الطالب تغيير اسمه بدل إلغاء إجاباته
        hw_st_dup_title: "هذا الاسم مسجَّل مسبقاً",
        hw_st_dup_text: "يوجد طالب سلّم هذا الواجب بنفس الاسم. إجاباتك محفوظة ولم تضِع — اكتب اسمك الكامل (مثلاً: اسمك واسم أبيك) ثم اضغط إرسال.",
        hw_st_dup_label: "اسمك الكامل",
        hw_st_dup_btn: "📨 إرسال بالاسم الجديد",
        hw_st_dup_same: "غيّر الاسم أولاً — هذا هو الاسم المسجَّل نفسه.",
        hw_st_close_btn: "✖️ إغلاق الصفحة",
        hw_st_badge_confirmed: "✅ وصل لمعلمك",
        hw_st_badge_pending: "⏳ جاري الإرسال",
        hw_st_badge_failed: "⚠️ لم يصل بعد",
        hw_st_badge_rejected: "❌ مرفوض",
        hw_st_confirmed_title: "وصل واجبك لمعلمك!",
        hw_st_confirmed_text: "تم تسليم الواجب بنجاح ✅",
        hw_st_confirmed_note: "سيراجع معلمك إجاباتك ويُعلمك بالنتيجة.",
        hw_st_pending_title: "جاري إرسال واجبك...",
        hw_st_pending_text: "انتظر لحظات ولا تُغلق الصفحة.",
        hw_st_failed_title: "لم يصل واجبك بعد",
        hw_st_failed_text: "إجاباتك محفوظة على جهازك، لكن الإرسال لم يكتمل.",
        hw_st_failed_note: "سنحاول تلقائياً، أو اضغط «إعادة الإرسال». لا تمسح بيانات المتصفح.",
        hw_st_rejected_title: "لم يُقبل التسليم",
        hw_st_reason: "السبب:",
        hw_st_receipt: "رقم الاستلام:",
        hw_st_confirmed_at: "وقت التأكيد:",
        hw_st_attempts: "عدد المحاولات:",
        teacher_auth_title: "دخول نظام الواجبات المنزلية",
        // 🌟 [جديد] تسجيل الدخول بجوجل — يظهر أولاً في بوابة الدخول، والمفتاح القديم أصبح خياراً احتياطياً
        teacher_auth_subtitle_google: "نظام الواجبات وحده يحتاج تسجيل الدخول بجوجل، حتى تُحفظ واجباتك وطلابك ونتائجهم في حسابك وتصل إليها من الهاتف أو الكمبيوتر. باقي المنصة لا يحتاج أي تسجيل دخول.",
        teacher_auth_google_error: "تعذّر تحميل تسجيل الدخول بجوجل. تحقق من الإنترنت ثم أعد فتح نظام الواجبات. (باقي المنصة يعمل كالمعتاد)",
        teacher_auth_cancel_btn: "إلغاء",
        teacher_auth_loading: "جاري التحقق...",
        teacher_auth_error_network: "تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.",
        // 🌟 [جديد 2026-10-01] رسائل دقيقة لرفض الخادم لتسجيل الدخول بجوجل — كانت كل الأخطاء تظهر كأنها "تعذّر الاتصال"
        teacher_auth_error_wrong_app: "جلسة جوجل صادرة لتطبيق مختلف. حدّث الصفحة وحاول مرة أخرى.",
        teacher_auth_error_expired: "انتهت صلاحية تسجيل الدخول بجوجل. اضغط زر جوجل وحاول مرة أخرى.",
        teacher_auth_error_busy: "الخادم مشغول الآن. انتظر لحظات وحاول مرة أخرى.",
        teacher_auth_error_server: "حدث خطأ من الخادم أثناء تسجيل الدخول. حاول مرة أخرى بعد قليل.",
        // 🌟 [2026-10-03] لا يرفض الخادم الجديد أي بريد موثَّق؛ هذه الرسالة تظهر فقط لو كان الخادم المنشور نسخة قديمة
        teacher_auth_error_server_outdated: "خادم الواجبات المنشور ما زال نسخة قديمة تقيّد الدخول بقائمة بريد. يجب نشر النسخة الجديدة من backend/Code.gs (أو حذف خاصية TEACHER_EMAILS من إعدادات السكربت). هذا لا يؤثر على باقي المنصة.",
        teacher_auth_error_unverified: "حساب جوجل هذا ليس له بريد موثَّق. استخدم حساب جوجل آخر.",
        hw_copy_btn: "📋 نسخ",
        hw_close_return: "إغلاق",
        // 🌟 [جديد 2026-10-01] نصوص أزرار سجل الواجبات + رسالة نسخ الرابط + بطاقة "ابدأ من هنا" (الرئيسية)
        hw_act_results: "النتائج", hw_act_link: "نسخ الرابط", hw_act_delete: "حذف", hw_act_publish: "نشر",
        // 🌟 [جديد 2026-10-01 — إعادة تصميم سجل الواجبات]
        hw_hero_title: "إعداد واجب جديد", hw_hero_sub: "اختر السورة والآيات، وتُولَّد الأسئلة تلقائياً، ثم شارك الرابط مع الطالب",
        hw_act_grade_now: "يحتاج تصحيح", hw_act_remind: "تذكير الطالب", hw_act_more: "المزيد من الإجراءات",
        hw_filter_all: "الكل", hw_filter_published: "منشور", hw_filter_draft: "مسودة", hw_filter_grading: "يحتاج تصحيح", hw_filter_overdue: "متأخر",
        hw_search_ph: "ابحث باسم الطالب", hw_filter_empty: "لا توجد واجبات مطابقة.",
        hw_remind_msg: "السلام عليكم {name}، تذكير بواجبك المنزلي في منصة حمٓ. رابط الواجب:",
        // 🌟 [جديد 2026-10-01 — التنظيف التلقائي]
        hw_cleanup_title: "🧹 تنظيف تلقائي:",
        hw_cleanup_body: "الواجب الذي تم تصحيحه واعتماده تُحذف تسليماته وشهاداته معه تلقائياً بعد 20 يوماً من اعتماد آخر تسليم فيه، ولا يُحذف إلا إذا كانت كل تسليماته معتمدة. والواجب الذي لم يسلّمه أحد يُحذف بعد 14 يوماً من إنشائه. أما الواجب الذي ينتظر تصحيحك فلا يُحذف أبداً. احفظ الشهادة كصورة قبل الحذف إن أردت الاحتفاظ بها، وتبقى درجات الطلاب المسجّلة في سجلاتهم.",
        hw_stale_alert: "هذا الواجب ينتظر تصحيحك منذ {days} يوماً", hw_stale_ok: "حسناً",
        hw_link_copied: "تم نسخ الرابط ✅",
        hw_draft_publish_empty: "هذه المسودة لا تحتوي أسئلة.",
        home_start_title: "ابدأ من هنا 👋",
        home_start_body: "لم تسجّل أي طالب بعد. أضف أول طالب لتبدأ التقييم ومتابعة الواجبات.",
        home_start_btn: "➕ أضف أول طالب",
        hw_subs_modal_title: "📊 نتائج وتسليمات الطلاب",
        hw_sub_student: "اسم الطالب",
        hw_sub_date: "تاريخ التسليم",
        hw_sub_score: "النتيجة",
        hw_close_window: "إغلاق النافذة ✖️",
        hw_submitting: "⏳ جاري الاعتماد...",
        hw_submitted_success: "✅ تم الاعتماد",

        // Homework Welcome & Play (واجهة الطالب)
        hw_student_welcome_title: "تحدي قرآني جديد! 🎯",
        hw_student_welcome_subtitle: "معلمك يرسل لك مهمة خاصة.. هل أنت مستعد لإثبات مهارتك؟",
        hw_student_welcome_msg: "مرحباً بك في تحدي الإتقان:",
        hw_student_who_are_you: "أخبرنا من أنت لنسجل درجاتك:",
        hw_student_select_ph: "-- اختر اسمك من هنا --",
        hw_student_start_btn: "🚀 انطلق للتحدي!",
        hw_student_cancel_btn: "✖️ لست مستعداً الآن (عودة)",
        hw_champion_prefix: "الطالب:",
        hw_earned_score: "النتيجة المكتسبة:",
        hw_feedback_excellent: "أداء ممتاز! 🌟",
        hw_feedback_good: "أداء جيد، يمكنك أن تكون أفضل! 👍",
        hw_feedback_needs_work: "تحتاج إلى مراجعة وحفظ أكثر 💪",
        hw_finish_title: "تم إرسال التقييم! 👋",
        hw_finish_desc: "يمكنك إغلاق هذه الصفحة (النافذة) الآن بأمان.",

        // 🌟 شاشة "الجديد في هذا التحديث" — نصوص الواجهة الثابتة فقط؛ نصوص عناصر
        // السجل نفسها بيانات ثنائية اللغة في core/version.js وليست مفاتيح هنا 🌟
        whats_new_title: "✨ الجديد في هذا التحديث",
        whats_new_close_btn: "تمام، فهمت 👍",
        whats_new_version_prefix: "الإصدار",
        whats_new_cat_new: "جديد",
        whats_new_cat_improved: "تحسين",
        whats_new_cat_fixed: "إصلاح",

        // 🌟 [جديد] نافذة التذكير الشهري بالنسخة الاحتياطية — تظهر مرة واحدة تلقائياً عند
        // أول دخول للمعلم في كل شهر جديد على هذا الجهاز (localStorage فقط، بلا مزامنة
        // سحابية، بنفس فلسفة dh_last_seen_version في core/app.js). راجع checkMonthlyBackupReminder
        // في core/app.js وcore/backupRestore.js لتفاصيل الآلية الكاملة 🌟
        backup_reminder_title: "🗄️ تذكير شهري بالنسخة الاحتياطية",
        backup_reminder_body: "مرّ شهر منذ آخر مرة أخذت فيها نسخة احتياطية من بيانات طلابك. يُفضَّل تنزيل نسخة جديدة الآن والاحتفاظ بها على جهازك للطوارئ.",
        backup_reminder_download_btn: "⬇️ نزّل النسخة الآن",
        backup_reminder_later_btn: "لاحقاً",
        backup_export_error: "تعذّر إنشاء النسخة الاحتياطية. حاول مرة أخرى.",
        backup_export_success: "تم تنزيل النسخة الاحتياطية بنجاح ✅",

        // 🌟 [جديد] شاشة "تقرير الإنجاز الشهري" — تجميع الواجبات + الاختبارات الثنائية +
        // الأخطاء المعالَجة + انتظام المراجعة المتباعدة عبر شهر كامل (راجع
        // reports/monthly-report.js ومستند المشروع "تصميم-تقرير-الإنجاز-الشهري-المقترح.md") 🌟
        monthly_report_btn: "📅 تقرير الإنجاز الشهري",
        mr_title: "تقرير إنجاز شهري",
        mr_eyebrow: "منصة حمٓ · تحفيظ القرآن الكريم",
        mr_teacher_group_label: "بيانات المعلم",
        mr_teacher_name_ph: "اسم المعلم",
        mr_upload_sig_btn: "رفع توقيع",
        mr_export_group_label: "تصدير",
        mr_export_png: "صورة عالية الجودة",
        mr_export_pdf: "ملف PDF",
        // 🌟 [جديد] مقاس واتساب جاهز — صورة JPEG بعرض مضبوط على شاشة الهاتف (راجع
        // exportWhatsApp في reports/monthly-report.js)
        mr_export_whatsapp: "نسخة واتساب",
        mr_export_whatsapp_hint: "صورة بمقاس مناسب لإرسالها مباشرة في واتساب (أخف حجمًا وأوضح على الهاتف)",
        mr_export_whatsapp_suffix: "واتساب",
        // 🌟 [جديد] هوية التقرير الشهري "منازل القمر" (reports/monthly-report.identity.js)
        mr2_brand_sub: "أبطال القرآن",
        mr2_eyebrow: "التقرير الشهري لولي الأمر",
        mr2_hero_overall: "الإنجاز العام هذا الشهر",
        mr2_hero_new_memo: "آية جديدة هذا الشهر",
        mr2_summary_title: "منازل هذا الشهر",
        mr2_summary_sub: "المنزل يدل على مستوى الإتقان في كل مؤشر",
        mr2_legend_title: "كيف نقرأ منازل القمر؟",
        mr2_lvl_full: "ممتاز", mr2_lvl_gibbous: "متقدّم", mr2_lvl_quarter: "في تقدّم", mr2_lvl_crescent: "بداية الطريق",
        mr2_moon_full: "بدر", mr2_moon_gibbous: "أحدب", mr2_moon_quarter: "تربيع", mr2_moon_crescent: "هلال",
        mr2_plan_title: "خطة الشهر القادم",
        mr2_plan_chip_review: "مراجعة أكثر", mr2_plan_chip_new: "آيات جديدة", mr2_plan_chip_tajweed: "إتقان التجويد",
        mr2_plan_text: "شهرٌ جديد يفتح أبوابه يا {name}! نطمح فيه إلى مراجعة أكبر قدر ممكن مما حفظت، وحفظ آيات جديدة بإذن الله، وإتقان أحكام التجويد. بالمثابرة والدعاء تبلغ ما تتمنّى — ونحن معك خطوة بخطوة.",
        mr2_footer_bless: "بارك الله في جهودكم وجعل القرآن ربيع قلوبكم",
        mr2_period_range: "من {a} إلى {b} {m}",
        mr2_hijri_suffix: "هـ",
        mr2_memo_scope_fmt: "من {from} إلى {to}",
        mr2_scope_label: "نطاق الحفظ:",
        mr_auto_note_open_warm: "السلام عليكم ورحمة الله، ولي أمر الطالب الغالي {name} —",
        mr_auto_note_close_warm: "بارك الله فيك يا {name}، وزادك الله حرصًا وتوفيقًا.",
        mr_note_tone_label: "نبرة الملاحظة التلقائية:",
        mr_note_tone_formal: "رسمية",
        mr_note_tone_warm: "دافئة",
        mr_back_btn: "العودة لملف الطالب",
        mr_month_label: "الشهر:",
        mr_year_label: "السنة:",
        mr_auto_refresh_hint: "يتحدّث التقرير تلقائيًا عند تغيير الشهر/السنة",
        mr_note_label_input: "ملاحظة لولي الأمر (اختياري):",
        mr_note_placeholder: "اكتب هنا ملاحظتك الخاصة لولي الأمر — إن تركتها فارغة سيظهر ملخص تلقائي مبني على نشاط الشهر.",
        mr_note_hint: "تظهر في صندوق \"ملاحظة المعلم\" بالأسفل",
        mr_meta_teacher: "المعلم:",
        mr_meta_generated: "تاريخ الإصدار:",
        mr_summary_title: "ملخص الشهر",
        mr_summary_sub: "نظرة عامة سريعة على نشاط الطالب خلال هذا الشهر",
        mr_homework_section_title: "الواجبات المنزلية هذا الشهر",
        mr_homework_section_sub: "كل واجب سلَّمه الطالب هذا الشهر مع درجته النهائية المعتمدة",
        mr_dual_section_title: "الاختبارات الثنائية هذا الشهر",
        mr_dual_section_sub: "كل مواجهة مكتملة خاض فيها الطالب هذا الشهر",
        mr_achv_section_title: "إنجازات وأوسمة جديدة هذا الشهر",
        mr_errors_section_title: "أخطاء عولجت هذا الشهر",
        mr_review_section_title: "انتظام المراجعة المتباعدة",
        mr_note_box_label: "رسالة المعلم لولي الأمر",
        mr_footer_line1: "منصة حمٓ · مراجعة القرآن التفاعلية",
        mr_teacher_sign_label: "توقيع المعلم",
        mr_tile_homework_avg: "متوسط درجات الواجبات",
        mr_tile_homework_count: "عدد الواجبات المسلَّمة: {n}",
        mr_tile_dual_results: "سجل الاختبارات الثنائية (فوز–خسارة–تعادل)",
        mr_tile_dual_sub: "خلال هذا الشهر",
        mr_tile_errors_resolved: "أخطاء عولجت",
        mr_tile_errors_sub: "تم تصحيحها هذا الشهر",
        mr_tile_achievements: "أوسمة جديدة",
        mr_tile_achievements_sub: "من الاختبارات الثنائية",
        mr_homework_empty: "لم يُسلَّم أي واجب منزلي هذا الشهر.",
        mr_dual_empty: "لا توجد مواجهات ثنائية مكتملة هذا الشهر.",
        mr_achv_empty: "لا توجد أوسمة جديدة هذا الشهر.",
        mr_errors_empty: "لم تُعالَج أي أخطاء مسجَّلة هذا الشهر.",
        // 🌟 [جديد] ملخص "تحدي الأخطاء" داخل قسم الأخطاء في التقرير الشهري
        mr_fix_sessions: "جلسات إصلاح",
        mr_fix_resolved: "أخطاء عولجت",
        mr_fix_new: "أخطاء سُجّلت هذا الشهر",
        mr_fix_remaining: "متبقية الآن",
        // 🌟 [جديد] مسار "إصلاح الأخطاء السابقة عند الدخول" مع التثبيت بمراجعتين
        // (components/fixErrorsPrompt.js)
        fixp_title: "أخطاء سابقة تنتظر العلاج 🛠️",
        fixp_body: "لدى {name} {n} من الأخطاء المسجَّلة سابقاً تحتاج علاجاً أو مراجعة ثانية للتثبيت. الأفضل البدء بها ثم الانتقال إلى الألعاب.",
        fixp_body_kids: "يا {name}، عندك {n} من الأخطاء القديمة نراجعها معاً! هيا نثبّتها ثم نلعب 🎈",
        fixp_start_btn: "🛠️ ابدأ علاج الأخطاء الآن",
        fixp_later_btn: "لاحقاً — إلى الألعاب",
        fixp_sum_title: "انتهت جلسة العلاج 🎉",
        fixp_sum_line_correct: "أجبت صح على {correct} من {total}.",
        fixp_sum_line_done: "تم تثبيت {resolved} نهائياً.",
        fixp_sum_line_confirm: "{pending} تنتظر المراجعة الثانية في المرة القادمة لتثبيتها.",
        fixp_sum_line_left: "وتبقّى {remaining} للمحاولة لاحقاً.",
        fixp_sum_continue_btn: "➡️ الانتقال إلى الألعاب",
        fixp_none_due: "لا توجد أخطاء مستحقة للإصلاح الآن — الباقي ينتظر مراجعته الثانية في يوم لاحق.",
        fixp_prof_start: "🛠️ علاج الأخطاء ({n})",
        fixp_prof_waiting: "⏳ بانتظار المراجعة الثانية ({n})",
        mr_review_never: "لم تُسجَّل أي مراجعة متباعدة لهذا الطالب بعد.",
        mr_reviewed_this_month: "تمت مراجعته هذا الشهر ✓",
        mr_not_reviewed_this_month: "لم تقع آخر مراجعة ضمن هذا الشهر",
        mr_review_last: "آخر مراجعة:",
        mr_review_last_score: "بدرجة",
        mr_review_next: "الموعد القادم:",
        mr_table_col_date: "التاريخ",
        mr_table_col_homework: "الواجب",
        mr_table_col_score: "الدرجة",
        mr_table_col_opponent: "المنافس",
        mr_table_col_rounds: "الجولات",
        mr_table_col_result: "النتيجة",
        mr_table_col_location: "الموضع",
        mr_surah_prefix: "سورة",
        mr_win: "فوز",
        mr_loss: "خسارة",
        mr_tie: "تعادل",
        mr_loading: "جارِ تحميل بيانات الشهر…",
        mr_exporting: "جارِ التجهيز…",
        mr_export_error: "حدث خطأ أثناء التصدير",
        mr_invalid_image: "يرجى اختيار ملف صورة صالح للختم.",
        mr_no_student_selected: "لم يتم تحديد طالب لعرض تقريره.",
        mr_default_teacher_label: "المعلم",
        mr_default_student_label: "الطالب",
        mr_no_memo_range: "نطاق الحفظ غير مسجَّل",
        mr_hw_untitled: "واجب بلا عنوان",
        mr_hw_not_signed_in: "نتائج الواجبات المنزلية تظهر هنا بعد تسجيل الدخول بجوجل داخل نظام الواجبات على هذا الجهاز.",

        // 🌟 [جديد] "رحلة الحفظ الشهرية" + "المقارنة الشهرية" في التقرير الشهري —
        // راجع reports/monthly-report.js وengine/memorizationEngine.js
        mr_journey_section_title: "رحلة الحفظ هذا الشهر",
        mr_journey_section_sub: "من أين إلى أين وصل الطالب في حفظه خلال هذا الشهر",
        mr_journey_begin_label: "بداية الشهر",
        mr_journey_end_label: "نهاية الشهر",
        mr_journey_new_label: "حفظ جديد هذا الشهر",
        mr_journey_no_data: "لم يتم تسجيل موقع حفظ الطالب لهذا الشهر بعد.",
        mr_journey_no_ending_yet: "تم تسجيل بداية الشهر، ولم تُسجَّل نهايته بعد.",
        mr_tile_new_memo: "حفظ جديد",
        mr_tile_new_memo_sub: "آية هذا الشهر",
        mr_compare_section_title: "المقارنة الشهرية",
        mr_compare_section_sub: "مقارنة فعلية بين هذا الشهر والشهر السابق",
        // 🌟 [جديد] "اتجاه الحفظ التراكمي" — يظهر فقط بعد توفر 3 أشهر مسجَّلة على
        // الأقل (راجع TREND_MIN_MONTHS في reports/monthly-report.js)
        mr_trend_section_title: "اتجاه الحفظ عبر الأشهر",
        mr_trend_section_sub: "إجمالي الحفظ الجديد تراكميًا خلال آخر أشهر مسجَّلة",
        mr_trend_total_label: "إجمالي هذه الفترة",
        mr_compare_no_data: "لا تتوفر بيانات كافية عن الشهر السابق لعرض مقارنة.",
        mr_compare_col_indicator: "المؤشر",
        mr_compare_col_prev: "الشهر السابق",
        mr_compare_col_current: "الشهر الحالي",
        mr_compare_col_change: "التغيّر",
        mr_compare_row_memo: "حفظ جديد (آية)",
        mr_compare_row_gameeval: "عدد التقييمات الفردية",
        mr_compare_row_gameeval_avg: "متوسط درجة التقييمات الفردية",
        mr_auto_note_memo_journey: "حفظ {name} {n} آية جديدة هذا الشهر.",
        // 🌟 [جديد] نبرة "دافئة" اختيارية للملاحظة التلقائية — راجع مفتاح
        // "نبرة الملاحظة" الجديد في شاشة التقرير الشهري (toneKey في monthly-report.js)
        mr_auto_note_memo_journey_warm: "ما شاء الله! {name} حفظ {n} آية جديدة هذا الشهر 🌱",

        // 🌟 [جديد] نافذتا "تسجيل موقع الحفظ الشهري" (بداية/نهاية الشهر) —
        // راجع components/monthlyMemorizationPrompt.js
        mmp_beginning_title: "تسجيل موقع الحفظ — بداية الشهر",
        mmp_beginning_desc: "حدّد آخر موضع وصل إليه الطالب في حفظه عند بداية هذا الشهر (سورة وآخر آية محفوظة).",
        mmp_ending_title: "تسجيل موقع الحفظ — نهاية الشهر",
        mmp_ending_desc: "حدّد آخر موضع وصل إليه الطالب في حفظه عند نهاية هذا الشهر — النظام سيحسب عدد الآيات الجديدة تلقائيًا.",
        mmp_student_label: "الطالب: {name}",
        mmp_surah_label: "السورة",
        mmp_ayah_label: "آخر آية محفوظة",
        mmp_ayah_range_hint: "من 1 إلى {max}",
        mmp_cancel_btn: "لاحقًا",
        mmp_confirm_btn: "تأكيد",
        mmp_next_btn: "التالي",
        mmp_invalid_ayah: "رقم الآية غير صحيح لهذه السورة، يرجى التحقق.",
        mmp_confirm_screen_title: "تأكيد الحفظ الجديد",
        mmp_warning_backward: "يبدو أن موضع النهاية قبل موضع البداية حسب اتجاه حفظ الطالب المعتمد (من آخر القرآن إلى أوله). يرجى مراجعة البيانات المدخلة والرجوع للتصحيح.",
        mmp_new_ayahs_label: "الحفظ الجديد المحسوب",
        mmp_ayahs_unit: "آية",
        mmp_back_btn: "رجوع للتعديل",
        mmp_confirm_save_btn: "تأكيد وحفظ",
        mr_cloud_error: "تعذر الاتصال بالسحابة لجلب درجات الواجبات — تحقق من اتصال الإنترنت وحاول مرة أخرى.",
        mr_auto_note_hw: "سلَّم {name} {n} واجبًا منزليًا هذا الشهر بمتوسط درجات {avg}%.",
        mr_auto_note_hw_warm: "بذل {name} مجهودًا جميلاً في {n} واجبًا هذا الشهر، بمتوسط {avg}% 👏",
        mr_auto_note_dual: "خاض اختبارات ثنائية بنتيجة {w} فوز و{l} خسارة و{t} تعادل.",
        mr_auto_note_dual_warm: "استمتع بخوض بعض الاختبارات الثنائية هذا الشهر: {w} فوز و{l} خسارة و{t} تعادل — كل تجربة فيها فائدة 💪",
        mr_auto_note_errors: "تمت معالجة {n} من الأخطاء المسجَّلة سابقًا.",
        mr_auto_note_errors_warm: "تم التغلب على {n} من نقاط الضعف السابقة بحمد الله ✨",
        mr_auto_note_empty: "لم يُسجَّل نشاط (واجبات أو اختبارات ثنائية) لـ{name} هذا الشهر.",
        mr_auto_note_empty_warm: "شهر هادئ لـ{name} من ناحية الواجبات والاختبارات — نتطلع لنشاط أكثر الشهر القادم بإذن الله 🌙",
        mr_auto_note_memo: "النطاق الحالي المسجَّل لحفظ الطالب: {scope}.",
        mr_auto_note_memo_warm: "استمر يا بطل! النطاق الحالي لحفظك: {scope} 🌟",

        // 🌟 [جديد] تقييمات غرفة اللعب الفردية (كبار/أطفال) داخل التقرير الشهري — راجع
        // persistEvaluationToHistory في games/adultGame.js/kidsGame.js ومصادر البيانات أعلى
        // reports/monthly-report.js 🌟
        hist_eval_default_range: "جلسة تقييم",
        mr_gameeval_section_title: "تقييمات غرفة اللعب هذا الشهر",
        mr_gameeval_section_sub: "كل جلسة تقييم فردية (كبار/أطفال) خاضها الطالب هذا الشهر",
        mr_gameeval_empty: "لم تُسجَّل أي جلسة تقييم فردية (كبار/أطفال) هذا الشهر — الجلسات المُلعَبة قبل تفعيل هذا الحفظ لا تظهر هنا.",
        mr_tile_gameeval_avg: "متوسط تقييمات غرفة اللعب",
        mr_tile_gameeval_count: "عدد الجلسات: {n}",
        mr_source_adult: "غرفة الكبار",
        mr_source_kids: "ركن الأطفال",
        mr_table_col_range: "النطاق",
        mr_table_col_section: "القسم",
        mr_auto_note_gameeval: "خاض {name} {n} جلسة تقييم فردية في غرفة اللعب هذا الشهر بمتوسط درجات {avg}%.",
        mr_auto_note_gameeval_warm: "خاض {name} {n} جلسة تقييم في غرفة اللعب هذا الشهر بمتوسط {avg}% — تقدّم جميل 🌟",

        // 🌟 [جديد بالكامل] لعبة "استمع وخمّن الآية" (ركن الأطفال فقط) — راجع تعليق
        // generateKidsListenAyah في engine/kidsEngine.js لتفاصيل الفكرة الكاملة. عنوان اللعبة
        // فقط له مفتاح i18n حقيقي هنا (نصوص questionBody داخل المحرك نفسه بالعربي مباشرة بلا
        // ترجمة، بنفس أسلوب كل ألعاب kidsEngine.js الأخرى — راجع تعليق الدالة هناك)
        kids_listen_title: "استمع وخمّن الآية يا بطل 🎧",
        kids_listen_audio_error: "تعذّر تشغيل الصوت، تأكد من اتصال الإنترنت وحاول مرة أخرى 🌐",
        // 🌟 [جديد] خطوة ثانية للعبة "استمع وخمّن الآية": بعد اختيار الآية الصحيحة، يُسأل الطفل
        // من أي سورة هذه الآية — راجع تعليق generateKidsListenAyah في engine/kidsEngine.js
        kids_listen_which_surah: "🕌 من أي سورة هذه الآية؟",
        kids_listen_wrong_ayah_error: "أخطأ في اختيار الآية المسموعة",
        kids_listen_wrong_surah_error: "عرف الآية الصحيحة، لكن أخطأ في تحديد السورة",

        // 🌟 [جديد] تعديل بيانات ملف الطالب مباشرة من نفس الشاشة (بدون مودال منفصل) —
        // راجع setupInlineProfileEditing في student/student.js
        prof_edit_hint: "💡 اضغط على أي بيانة لتعديلها مباشرة، ثم استخدم زر \"تقرير الإنجاز الشهري\" للطباعة بعد الانتهاء",
        prof_avatar_change_title: "تغيير الصورة",

        // 🌟 [جديد] "بطاقة الترحيب بالطالب" — تحية قصيرة في وسط الشاشة مع صورة الطالب، تظهر
        // فور اختيار اسمه وقبل لوحة التقييم مباشرة ثم تختفي وحدها بعد ثوانٍ قليلة.
        // راجع components/welcomeBanner.js. النص مقسَّم إلى ثلاثة مفاتيح منفصلة (وليس نصاً
        // واحداً فيه {name}) لأن كل سطر له حجم ولون مختلف في البطاقة، والاسم نفسه يُحقَن
        // بـ textContent لا innerHTML حمايةً من أي اسم يحتوي رموزاً خاصة 🌟
        welcome_hello: "مرحباً",
        welcome_back_line: "أهلاً بعودتك 🌟",

        // 🌟 [جديد] نظام "تلميحات الأقسام عند أول دخول" — بطاقات عائمة غير حاجبة (بعكس
        // whats-new-modal الحاجب) تظهر مرة واحدة فقط لكل قسم على هذا الجهاز بالذات (تخزين
        // localStorage فقط، بلا مزامنة سحابية، بنفس فلسفة dh_last_seen_version في core/app.js).
        // راجع components/sectionHint.js ومستند "تصميم نظام تلميحات الأقسام عند أول دخول
        // المقترح" في توثيق المشروع لتفاصيل القرار، وكل الصياغات هنا معتمدة نهائياً من المعلم
        // بالفصحى بعد عدة جولات مراجعة صريحة 🌟
        hint_ok_btn: "حسناً، فهمت 👍",

        // 🌟 [جديد 2026-10-02] نصوص "الجولة الإرشادية" (components/guidedTour.js) — تحلّ محل تلميحات
        // general / homework_prep / dual_test_setup أعلاه. أسماء الأزرار هي الأسماء الفعلية في الواجهة.
        tour_btn_next: "التالي",
        tour_btn_prev: "السابق",
        tour_btn_finish: "إنهاء",
        tour_btn_skip: "تخطي الجولة",
        tour_btn_start: "ابدأ الجولة",
        tour_btn_skip_welcome: "تخطي",
        tour_welcome_title: "أهلًا بك في حمٓ 👋",
        tour_welcome_body: "دعنا نعرّفك سريعًا على أهم أجزاء المنصة.",
        tour_done: "أحسنت! انتهت الجولة، ويمكنك الآن استخدام المنصة.",
        tour_restart_btn: "🧭 إعادة الجولات الإرشادية",
        acct_section_title: "🔐 حساب جوجل (للواجبات)",
        acct_current_prefix: "الإيميل الحالي: ",
        acct_signed_in_unknown: "مسجَّل الدخول بحساب جوجل",
        acct_not_signed_in: "غير مسجَّل الدخول بجوجل على هذا الجهاز",
        acct_change_btn: "🔁 تغيير الإيميل",
        acct_signin_btn: "🔐 تسجيل الدخول بجوجل",
        acct_signout_btn: "🚪 تسجيل الخروج",
        acct_change_confirm: "سيتم الخروج من هذا الحساب لتختار حساب جوجل آخر.\n\nتنبيه: لكل حساب واجباته ونتائجه المنفصلة؛ واجبات الحساب الحالي لن تظهر مع الحساب الجديد، لكنها تبقى محفوظة وتعود عند الدخول به مرة أخرى.\n\nمتابعة؟",
        acct_signout_confirm: "تسجيل الخروج من حساب جوجل على هذا الجهاز؟ واجباتك تبقى محفوظة وتعود عند الدخول مرة أخرى.",
        tour_restart_done: "تمّت إعادة الجولات، وستظهر عند دخول كل قسم.",
        tour_home_name: "هنا يظهر اسمك كمعلم داخل المنصة.",
        tour_home_students: "من هنا تضيف طلابك وتتابع سجلاتهم.",
        tour_home_kids: "من هنا تدخل إلى مسار الأنشطة والألعاب المخصص للصغار.",
        tour_home_adults: "من هنا تدخل إلى مسار الأنشطة المخصص للكبار.",
        tour_home_homework: "من هنا تنشئ الواجبات وترسلها للطلاب وتراجع النتائج.",
        tour_home_dual: "من هنا تدخل إلى نظام الاختبارات الثنائية.",
        tour_home_contact: "من هنا يمكنك التواصل معنا عند الحاجة إلى المساعدة أو الاستفسار.",
        tour_install_title: "ثبّت المنصة على جهازك 💻",
        tour_install_addressbar: "لتفتح حمٓ كتطبيق مستقل بنقرة واحدة: اضغط أيقونة التثبيت ⊕ في شريط العنوان أعلى المتصفح (بجانب النجمة)، ثم اختر «تثبيت».",
        tour_install_safari: "لتفتح حمٓ كتطبيق مستقل: من قائمة «ملف» أعلى الشاشة اختر «إضافة إلى Dock».",
        tour_install_btn: "⬇ تثبيت الآن",
        tour_students_add: "من هنا تسجّل طالبًا جديدًا — الاسم وحده مطلوب وباقي البيانات اختيارية.",
        tour_students_intro: "هذا ركن «طلابي»: هنا تدير كل سجلات طلابك ومتابعتهم الشهرية.",
        tour_students_all: "سجل الطلاب العام: قائمة كل طلابك — افتح ملف أي طالب، أو عدّل بياناته، أو صدّر واستورد نسخة احتياطية منهم.",
        tour_students_stats: "هنا ملخص سريع: عدد طلابك، ومن ينتظر تسجيل حفظه الشهري، وكم تقريرًا صدّرت هذا الشهر.",
        tour_students_monthly_memo: "من هنا تسجّل الحفظ الشهري لكل الطلاب دفعة واحدة: «أين توقف كل طالب؟» طالبًا بعد طالب. الرقم على البطاقة = الطلاب الذين ينتظرونك.",
        tour_students_reports: "تقارير الشهر: اكتب اسم الطالب واختر الشهر، ثم أرسل التقرير لولي الأمر واتساب أو اطبعه PDF.",
        tour_students_back: "وهذا السهم يعيدك للقائمة الرئيسية.",
        tour_kids_intro: "هذا ركن الأطفال: مسار الألعاب والأنشطة المخصص للصغار.",
        tour_adults_intro: "هذه واجهة الكبار: مسار الأنشطة والتقييم المخصص للكبار.",
        tour_login_search: "اكتب أي جزء من اسم الطالب ثم اخترْه من القائمة.",
        tour_login_start: "بعد اختيار الطالب اضغط هنا للانتقال إلى لوحة التقييم.",
        tour_dash_type: "اختر نوع التقييم: سورة محددة، أو عدة سور، أو بالأجزاء.",
        tour_dash_start: "اضغط هنا ليبدأ التقييم.",
        tour_kdash_scope: "اختر السور التي تُبنى منها الألعاب، وعدد الألعاب.",
        tour_hw_new: "من هنا تبدأ بإعداد واجب جديد.",
        tour_hw_assign: "اتركه «رابطًا عامًا لكل الطلاب»، أو خصّصه لطالب محدد.",
        tour_hw_config: "اختر السورة والآيات (أو عدة سور أو جزءًا)، وعدد الأسئلة.",
        tour_hw_generate: "اضغط «توليد الأسئلة آلياً» وراجعها، ثم «اعتماد ونشر الواجب».",
        tour_hw_share: "بعد النشر يظهر الواجب في «سجل الواجبات»؛ اضغط «نسخ الرابط» وأرسله للطالب.",
        tour_hw_history: "هنا سجل واجباتك وحالة كل واحد منها.",
        tour_hw_grading: "هنا يظهر ما وصلته إجابات الطلاب وينتظر تصحيحك؛ افتح «النتائج» أو «يحتاج تصحيح» أمام الواجب لتراجع الإجابات وتصحح وتعرض النتيجة.",
        tour_hw_final: "هنا الدرجات المعتمدة وشهادات التقدير.",
        tour_dual_new: "من هنا تجهّز اختبارًا ثنائيًا جديدًا: تختار المتسابقين ونطاق كل جولة ثم تحفظه.",
        tour_dual_saved: "هنا الاختبارات المحفوظة: ابدأ مواجهة بزر «ابدأ مواجهة»، وتجد نتائجها في «المباريات السابقة».",

        hint_general_title: "🌟 مرحباً بك في منصة حمٓ",
        hint_general_body: "مرحباً شيخنا، نرحّب بك في منصة حمٓ لتحفيظ القرآن الكريم ومراجعته وتقييمه. يمكنك من الصفحة الرئيسية الدخول إلى «واجهة الكبار» أو «ركن الأطفال» للتقييم المباشر، وإدارة سجلات طلابك من «طلابي»، وإرسال الواجبات المنزلية ومتابعتها، بالإضافة إلى تحدي المتشابهات والاختبارات الثنائية. وستظهر لك تنبيهات خاصة بكل قسم عند أول دخول إليه.\nوفي حال رغبتك في اقتراح فكرة إضافية، فلا تتردد في التواصل معنا.",

        hint_login_title: "مرحباً شيخنا 👋",
        hint_login_body: "قبل أن تتمكن من بدء أي تقييم، يُرجى إضافة اسم طالب واحد على الأقل من قسم «طلابي»، وبعد ذلك يمكنك اختياره من هذه الشاشة والبدء معه.",
        hint_login_action_btn: "الانتقال إلى طلابي الآن ➕",
        // 🌟 [عدّل] صياغة أقصر لتنبيه الاسم غير المسجَّل عند تسجيل الدخول، بطلب صريح من المعلم —
        // كانت أطول وأكثر تفصيلاً (النص القديم كان دالة alert() مباشرة في setupLoginListeners
        // بـ student/student.js بلا مفتاح ترجمة أصلاً؛ أصبح له الآن مفتاح كباقي نصوص الواجهة)
        login_name_not_found_alert: "هذا الاسم غير مسجَّل. تأكد من كتابته صحيحاً، أو أضِفه أولاً من «طلابي».",

        hint_adult_game_title: "⚠️ تنبيه قبل بدء التقييم",
        hint_adult_game_body: "استخدام الطالب زر «تلميح 💡» في سؤال الآية التي قبل يؤدي إلى خصم نقطتين من عشر.\nترتيب جميع آيات السؤال بترتيب خاطئ بالكامل من المحاولة الأولى يؤدي إلى خصم نقطتين، وفي حال الخطأ مرة أخرى يُخصم أربع نقاط.\nزر «تسجيل ملاحظة 📝» ليس عقوبة، بل وسيلة لتسجيل نقاط الضعف في سجل الطالب للرجوع إليها لاحقاً ومعالجتها.",
        hint_adult_game_ok_btn: "حسناً، لنبدأ 🚀",

        // 🌟 [مهم] بلا أي ذكر لميزة "التلميح" هنا عمداً بطلب صريح من المعلم — زر التلميح في ركن
        // الأطفال موجود شكلياً في games/kidsGame.html فقط بلا أي منطق فعلي موصول به بعد (راجع
        // تعليق GameState.hintUsed في games/kidsGame.js)
        hint_kids_game_title: "🎈 تنبيه قبل بدء اللعب",
        hint_kids_game_body: "ترتيب الطالب جميع الآيات بترتيب خاطئ بالكامل من المحاولة الأولى يؤدي إلى خصم نقطتين من عشر، وفي حال الخطأ مرة أخرى يُخصم أربع نقاط.\nزر «تسجيل ملاحظة 📝» ليس عقوبة، بل تذكير بسيط بنقطة تحتاج مراجعة، لنعود إليها معاً ونتدرّب عليها لاحقاً.",
        hint_kids_game_ok_btn: "حسناً، لنبدأ 🎈",

        hint_homework_title: "📚 تنبيه قبل إعداد الواجب",
        hint_homework_body: "يمكنك تخصيص الواجب لطالب معين من خانة «تخصيص الواجب لطالب محدد»، أو تركه رابطاً عاماً يصل إلى جميع طلابك. وبعد توليد الأسئلة تلقائياً، يمكنك مراجعتها وتعديلها أو إضافة أسئلة يدوية قبل اعتماد النشر. كما أن بطاقة «يحتاج تصحيح ✍️» أعلى الشاشة تنقلك مباشرة إلى أي تسليم لا يزال بحاجة إلى مراجعتك.",

        // 🌟 [عدّل] حُذفت الإشارة إلى أن الميزة "لا تزال قيد التطوير" بطلب صريح من المعلم بعد
        // اكتمال أساسيات الفكرة (راجع حذف الشارة المقابلة في components/splash.html)
        hint_dual_test_title: "🆚 تنبيه حول الاختبارات الثنائية",
        hint_dual_test_body: "يتم إعداد الاختبار عبر معالج من ثلاث خطوات: تحديد المتسابقين ونطاق كل جولة، ثم اختيار الجولة، ثم إضافة أسئلتها. أثناء اللعب، يتيح زر «تبديل 🔄» سؤالاً بديلاً مرة واحدة فقط في كل جولة، ويسجّل زر «مساعدة 💡» استخدام الطالب حقَّه في مساعدتك الصوتية له مرة واحدة في الجولة دون خصم مباشر، بينما يُحتسب الخصم الفعلي من عدد الأخطاء المسجَّلة في كل سؤال (نصف نقطة عن كل خطأ من أصل عشر).",

        hint_similarities_title: "🧩 تنبيه قبل بدء ركن المتشابهات",
        hint_similarities_body: "الهدف من هذا الركن تعريف الطالب بالآيات المتشابهة وتيسير حفظها، وليس تقييمه رسمياً. تُصحَّح الإجابة فور اختيارها، وفي حال الخطأ تُعرض الإجابة الصحيحة مباشرة، دون احتساب درجة نهائية أو تسجيل ملاحظة في سجل الطالب.",
        // 🌟 [جديد] تقرير التقييم الفردي — التصميم الجديد (reports/report.js)
        // كل نص جديد في هذا التقرير يمر من هنا بالعربية والإنجليزية، حتى لو كان
        // الاستخدام الأساسي بالعربية، التزامًا بقاعدة ثنائية اللغة في المنصة.
        rep_tb_teacher_data: "بيانات المعلم",
        rep_tb_teacher_name_ph: "اسم المعلم",
        rep_tb_upload_stamp: "رفع ختم المعلم",
        rep_tb_export: "تصدير",
        rep_tb_png: "صورة مختصرة",
        rep_tb_pdf: "ملف PDF شامل",
        rep_tb_home: "العودة للوحة التقييم",
        rep_tb_note_label: "ملاحظة لولي الأمر (اختياري):",
        rep_tb_note_ph: "اكتب هنا ملاحظتك الخاصة لولي الأمر — إن تركتها فارغة سيظهر تعليق تلقائي مبني على نتيجة الاختبار.",
        rep_tb_note_hint: "تظهر في صندوق \"ملاحظة المعلم\" بالأسفل",
        rep_tb_extra_label: "نص إضافي داخل التقرير (اختياري):",
        rep_tb_extra_ph: "أي نص إضافي تحب إضافته داخل التقرير — اتركه فارغًا إن لم تكن بحاجة إليه.",
        rep_tb_extra_hint: "يظهر كصندوق منفصل، ولا يظهر إطلاقًا لو تُرك فارغًا",

        rep_eyebrow: "منصة حمٓ · تحفيظ القرآن الكريم",
        rep_title: "تقرير تقدّم الطالب",
        rep_subtitle: "في حفظ القرآن الكريم",
        rep_tagline: "خطوة بخطوة ... نحو كتاب الله",

        rep_avatar_hint: "اضغط أو اسحب صورة لتغيير صورة الطالب",
        rep_avatar_change: "تغيير صورة الطالب",

        rep_fact_grade: "الصف",
        rep_fact_scope: "نطاق التقييم",
        rep_fact_duration: "مدة التقييم",

        rep_this_eval: "نتيجة هذا التقييم",
        rep_delta_vs_prev: "عن المحاولة السابقة",
        rep_delta_same: "مثل المحاولة السابقة",

        rep_ladder_title: "مستوى التقدّم العام",
        rep_ladder_sub: "مقارنة هذا التقييم بآخر محاولات الطالب المسجَّلة",
        rep_ladder_no_regular: "لا توجد تقييمات عادية سابقة في سجل الطالب بعد — جلسات علاج الأخطاء لا تدخل في هذا السُّلّم.",
        rep_ladder_first_attempt: "هذه أول محاولة مسجَّلة في سجل الطالب — ستظهر المقارنة مع المحاولات السابقة بدءًا من التقييم القادم.",
        rep_step_current: "هذا التقييم",
        rep_step_prev1: "المحاولة السابقة",
        rep_step_prev2: "قبلها",
        rep_step_prev3: "أقدم محاولة",
        rep_step_prev_generic: "محاولة سابقة",

        rep_qtable_title: "تفاصيل الاختبار — سؤالًا بسؤال",
        rep_qtable_sub: "كل الأسئلة التي وردت في هذا الاختبار كما جرت بالفعل، دون حذف",
        rep_col_num: "م",
        rep_col_status: "الاستجابة",
        rep_col_subject: "السؤال / الموضوع",
        rep_col_score: "الدرجة",
        rep_col_note: "ملاحظة",
        rep_no_questions: "لا توجد تفاصيل أسئلة متاحة لهذا التقييم.",

        rep_chip_full: "صحيحة بالكامل",
        rep_chip_partial: "صحيحة جزئيًا",
        rep_chip_wrong: "غير صحيحة",

        rep_stat_avgtime: "متوسط وقت الإجابة",
        rep_stat_hints: "تلميحات مستخدمة",
        rep_stat_reorders: "محاولات ترتيب متكررة",

        rep_strengths: "نقاط القوة",
        rep_needs: "بحاجة إلى تركيز",
        rep_note_label: "ملاحظة المعلم لولي الأمر",
        rep_extra_label: "ملاحظة إضافية",

        rep_report_no: "رقم التقرير",
        rep_date: "التاريخ",
        rep_sign_label_stamp: "ختم المعلم",
        rep_sign_label_plain: "المعلم",

        // 🌟 [إصلاح] مفاتيح صندوق "بحاجة إلى تركيز" المعاد تصميمه كانت مستخدمة في
        // reports/report.js عبر t() لكنها غير معرَّفة هنا إطلاقًا، وt() ترجع المفتاح
        // نفسه عند عدم إيجاده — فكانت الأسماء البرمجية (report_focus_group_today ...)
        // تظهر نصًّا خامًا داخل التقرير المطبوع لولي الأمر. القيم أدناه مكتوبة لتطابق
        // بالضبط تركيب الجمل في focusMoreLabel و focusAgeLabel و needsFocusHtml 🌟
        report_focus_group_today: "أخطاء اختبار اليوم",
        report_focus_group_partial: "يحتاج تثبيتًا اليوم",
        report_focus_group_past: "متابعة من جلسات سابقة",
        report_focus_repeated: "خطأ متكرر",
        // 🌟 [جديد] سبب تسجيل الإجابة الصحيحة ضمن الأخطاء التي تُعالَج (ترتيب خاطئ سابق / تلميح) 🌟
        weak_origin_reorder: "ترتيب خاطئ قبل الإجابة الصحيحة",
        weak_origin_hint: "استخدم تلميحًا للوصول إلى الإجابة",
        report_focus_not_resolved: "لم يُعالَج بعد",
        report_note_focus_past_prefix: "بند سابق:",
        report_focus_more_one: "بند آخر",
        report_focus_more_two: "بندان آخران",
        report_focus_more_few: "بنود أخرى",
        report_focus_more_many: "بندًا آخر",
        report_focus_age_today: "اليوم",
        report_focus_age_day1: "أمس",
        report_focus_age_day2: "قبل يومين",
        report_focus_age_since: "منذ",
        report_focus_age_unit_few: "أيام",
        report_focus_age_unit_many: "يومًا",

        // ============================================================
        // 🌟 [جديد بالكامل] شاشات "أبطال التجويد" — المرحلة 1 (كتالوج + تصفّح ثابت)
        // راجع tajweed/tajweed-map.js وengine/tajweedRulesCatalog.js ومستند المشروع
        // "التصور-المعماري-الكامل-لمسار-التجويد.md". بادئة tjw_ لكل مفاتيح هذا القسم.
        // ============================================================
        tjw_home_title: "أبطال التجويد",
        tjw_home_subtitle: "اختر اسم الطالب لتبدأ رحلته في تعلّم أحكام التجويد",
        tjw_no_students: "لا يوجد طلاب مسجَّلون بعد — أضف طالباً أولاً من قسم 'طلابي'",
        // 🌟 [جديد] مفاتيح شاشة اختيار الطالب الجديدة (حقل بحث + قائمة منسدلة + زر)، بنفس نمط
        // شاشة تسجيل الدخول الأساسية في student/login.html — راجع renderPickStudentHTML في
        // tajweed-map.js. مفتاحا search_student_ph وlogin_name_not_found_alert أعلاه في هذا
        // الملف (قسم تسجيل الدخول) يُعاد استخدامهما هنا كما هما لضمان نفس الصياغة تماماً 🌟
        tjw_pick_label: "اختر اسم الطالب من القائمة أو اكتبه للبحث",
        tjw_start_journey_btn: "ابدأ الرحلة 🚀",
        tjw_pick_name_required_alert: "الرجاء كتابة أو اختيار اسم الطالب أولاً!",
        // 🌟 {name} يُستبدَل باسم الطالب المختار فعلياً (راجع renderBrowseHTML في tajweed-map.js)
        tjw_browsing_intro: "تتصفّح الآن بطاقات التجويد مع {name} 🌟",
        tjw_change_student: "تغيير الطالب",
        tjw_rule_not_found: "تعذّر العثور على هذا الحكم",
        tjw_example_unavailable: "تعذّر تحميل المثال القرآني حالياً (تحقّق من الاتصال بالإنترنت)",
        tjw_listen_btn: "استمع للآية",
        tjw_ayah_word: "آية",
        tjw_letters_label: "الحروف:",
        tjw_example_source_note: "مثال حقيقي من نص القرآن — يُعرَض مباشرة من محرك القرآن الفعلي بالمنصة",
        tjw_reveal_btn: "شاهدت، ماذا يعني؟ 🤔",
        // 🌟 شارة البطاقة على الشاشة الرئيسية بعد اكتمال التصفّح الفعلي — بنفس منطق ترقية
        // similarities_browse_badge بعد اكتمال شاشات التصفّح الحقيقية لركن المتشابهات
        tjw_browse_badge: "تصفح متاح",

        tjw_stage_qalqalah_name: "القلقلة",
        // 🌟🌟 [جديد ٢٨ سبتمبر — تعميق المحتوى من كتاب "فتوحات الرحمن"] مرحلتان جديدتان +
        // تقسيم الإدغام لنوعين — راجع التعليق التوثيقي الكامل في tajweedRulesCatalog.js
        tjw_stage_meem_noon_mushaddadah_name: "غنة الميم والنون المشدَّدتين",
        tjw_stage_meem_sakinah_name: "الميم الساكنة",
        tjw_stage_noon_sakinah_name: "النون الساكنة والتنوين",

        // 🌟🌟 [تعديل ٢٨ سبتمبر — دُمجت الصغرى والكبرى بحكم واحد، راجع تعليق tajweedRulesCatalog.js]
        tjw_rule_qalqalah_name: "القلقلة",
        tjw_rule_qalqalah_def: "لحرف القلقلة (ق ط ب ج د) حالتان: صغرى (ساكن في وسط الكلمة، صوته يرتدّ برفق) وكبرى (آخر الكلمة عند الوقف عليه، صوته يرتدّ ويهتزّ بقوة أوضح)",
        tjw_rule_qalqalah_notice: "استمع لصوت القاف في 'قُلْ' وسط الكلمة (ارتداد خفيف)، ثم قارنه بالقاف في نهاية 'الْفَلَقِ' عند الوقف عليها (ارتداد أقوى)",

        // 🌟 غنة الميم والنون المشدَّدتين — أي ميم أو نون عليها شدة تُغَنّ بمقدار حركتين، بلا
        // تفريق حالات (حكم واحد بسيط، أول ما يتعلّمه الطفل قبل أحكام الميم/النون الساكنة)
        tjw_rule_ghunna_wajiba_name: "غنة الميم والنون المشدَّدتين",
        tjw_rule_ghunna_wajiba_def: "أي ميم أو نون عليها شدة (مّ أو نّ) تُنطق بغنة كاملة من الأنف بمقدار حركتين",
        tjw_rule_ghunna_wajiba_notice: "استمع لـ 'عَمَّ' — هل تسمع رنيناً من الأنف يمتدّ على الميم المشدَّدة؟",

        // 🌟 أحكام الميم الساكنة الثلاثة (من الكتاب) — راجع makhrajNote/commonMistakes بكل
        // حكم في tajweedRulesCatalog.js للتفاصيل الكاملة (نص عربي خام، غير مترجم بعد)
        tjw_rule_ikhfa_shafawi_name: "الإخفاء الشفوي",
        tjw_rule_ikhfa_shafawi_def: "لما تيجي الميم الساكنة قبل حرف الباء، تُخفى بغنة بمقدار حركتين — حالة وسط بين الإظهار والإدغام",
        tjw_rule_ikhfa_shafawi_notice: "استمع لـ 'تَرْمِيهِم بِحِجَارَةٍ' — هل تسمع غنة خفيفة بدل ميم واضحة قبل الباء؟",

        tjw_rule_idgham_shafawi_name: "الإدغام الشفوي (المثلين)",
        tjw_rule_idgham_shafawi_def: "لما تيجي الميم الساكنة قبل ميم متحرّكة، تندمجان في ميم واحدة مشدَّدة بغنة كاملة",
        tjw_rule_idgham_shafawi_notice: "استمع لـ 'لَهُم مَّغْفِرَةٌ' — هل تسمع ميماً واحدة مشدَّدة بدل ميمين منفصلتين؟",

        tjw_rule_izhar_shafawi_name: "الإظهار الشفوي",
        tjw_rule_izhar_shafawi_def: "لما تيجي الميم الساكنة قبل أي حرف عدا الباء والميم، تُنطق واضحة تماماً من مخرجها بلا أي غنة زائدة",
        tjw_rule_izhar_shafawi_notice: "استمع لـ 'عَلَيْهِمْ غَيْرِ' — هل تسمع الميم واضحة تماماً بلا أي غنة؟",

        tjw_rule_izhar_name: "الإظهار الحلقي",
        tjw_rule_izhar_def: "لما تيجي النون الساكنة أو التنوين قبل أحد حروف الحلق الستة، تُنطق النون واضحة تماماً بلا أي تغيير",
        tjw_rule_izhar_notice: "استمع للنون في 'مِّنْ خَوْفٍ' — هل تسمع نطقها واضحة بلا أي تغيير؟",

        // 🌟🌟 [تقسيم صريح بدل حكم "إدغام" واحد — راجع الملاحظة التوثيقية في tajweedRulesCatalog.js
        // عند noon_sakinah لسبب هذا التقسيم] مفاتيح tjw_rule_idgham_* القديمة (بلا لاحقة
        // bighunnah/bila_ghunnah) أُزيلت لعدم وجود بيانات طلاب حقيقية تشير إليها بعد
        tjw_rule_idgham_bighunnah_name: "الإدغام بغنة",
        tjw_rule_idgham_bighunnah_def: "لما تيجي النون الساكنة أو التنوين قبل أحد حروف (ي ن م و)، تندمج النون في الحرف اللي بعدها تماماً مع بقاء غنة كاملة بمقدار حركتين",
        tjw_rule_idgham_bighunnah_notice: "استمع لـ 'مَن يَعْمَلْ' — هل تسمع اندماج النون في الياء مع غنة تمتدّ؟",

        tjw_rule_idgham_bila_ghunnah_name: "الإدغام بغير غنة",
        tjw_rule_idgham_bila_ghunnah_def: "لما تيجي النون الساكنة أو التنوين قبل حرفَي (ل ر)، تندمج النون فيهما تماماً وبسرعة بلا أي غنة إطلاقاً",
        tjw_rule_idgham_bila_ghunnah_notice: "استمع لـ 'هُدًى لِّلْمُتَّقِينَ' — هل تسمع اندماجاً سريعاً بلا أي أثر لغنة؟",

        tjw_rule_iqlab_name: "الإقلاب",
        tjw_rule_iqlab_def: "لما تيجي النون الساكنة أو التنوين قبل حرف الباء، تتحوّل النون لصوت ميم مخفاة مع غنّة",
        tjw_rule_iqlab_notice: "استمع لـ 'عَلِيمٌ بِذَاتِ الصُّدُورِ' — هل تسمع صوت ميم خفيفة بدل النون قبل الباء؟",

        tjw_rule_ikhfa_name: "الإخفاء",
        tjw_rule_ikhfa_def: "لما تيجي النون الساكنة أو التنوين قبل أحد باقي الحروف، تُنطق النون بصوت بين الإظهار والإدغام مع غنّة",
        tjw_rule_ikhfa_notice: "استمع لـ 'مِّن سِجِّيلٍ' — هل تسمع غنّة خفيفة بدل نطق النون بوضوح؟",

        // 🌟 [جديد — المراحل 2+3+4+5] خريطة التقدّم، بوّابة المراجعة، الأنشطة التفاعلية،
        // شاشة النتيجة، الأوسمة، اللوحة، وقسم ملف الطالب — راجع
        // "التصور-المعماري-الكامل-لمسار-التجويد.md" §3-§9
        tjw_review_gate_alert: "عندك مراجعة مستحقة أولاً — أكمل جولة المراجعة قبل فتح حكم جديد 🔔",
        tjw_leaderboard_title: "أبطال التجويد",
        tjw_stage_locked_note: "أكمل المرحلة السابقة أولاً لفتح هذه المرحلة 🔒",
        tjw_link_activity_btn: "اربط الأحكام بحروفها",
        tjw_challenge_btn: "تحدي المرحلة",
        tjw_review_due_banner: "عندك {n} حكم يحتاج مراجعة قبل أن تفتح حكماً جديداً",
        tjw_start_review_btn: "ابدأ المراجعة الآن",
        tjw_status_mastered: "✅ متقَن",
        tjw_status_needs_review: "🔁 يحتاج مراجعة",
        tjw_status_in_progress: "⏳ قيد التدرّب",
        tjw_status_available: "لم يبدأ بعد",
        tjw_start_practice_btn: "ابدأ التدرّب",
        tjw_lb_progress_week: "الأكثر تقدّماً هذا الأسبوع",
        tjw_lb_review_streak: "أطول سلسلة مراجعة يومية",
        tjw_lb_latest_badge: "آخر من حصل على وسام جديد",
        tjw_lb_sessions_unit: "جلسة",
        tjw_lb_days_unit: "يوم",
        tjw_lb_empty: "لا يوجد بيانات كافية بعد",

        tjw_activity_title: "🎯 نشاط تفاعلي",
        tjw_activity_error: "تعذّر تجهيز هذا النشاط، برجاء المحاولة مرة أخرى",
        tjw_act_choose_prompt: "أي حكم يُطبَّق على هذه الحروف الساكنة؟",
        tjw_act_discover_prompt: "أي كلمة في هذه الآية فيها الحكم الذي تعلّمته؟",
        tjw_act_apply_prompt: "طبّق ما تعلّمته: أي كلمة في هذه الآية الجديدة فيها نفس الحكم؟",
        tjw_act_link_prompt: "اربط كل حكم بحروفه الصحيحة",
        tjw_question_label: "سؤال",
        tjw_finish_activity_btn: "إنهاء النشاط",
        tjw_next_question_btn: "السؤال التالي",
        tjw_rule_mastered_note: "أتقنت هذا الحكم! 🎉",
        tjw_stage_completed_note: "أكملت هذه المرحلة بالكامل! المرحلة التالية فُتحت الآن",
        tjw_next_rule_btn: "الحكم التالي",
        tjw_correct_answers_unit: "إجابة صحيحة",
        tjw_retry_activity_btn: "حاول مرة أخرى",
        tjw_back_to_map_btn: "العودة للخريطة",

        // 🌟🌟 [جديد ٢٨ سبتمبر] بوّابة تسميع المعلم "سمّع لي" — بُعد pronounces، راجع §2 من
        // مستند "تعميق-مادة-وتقييم-أبطال-التجويد-المقترح.md"
        tjw_start_checkpoint_btn: "سمّع لي",
        tjw_awaiting_checkpoint_note: "الطالب جاهز علميًا لهذا الحكم — بقي فقط تسميعك المباشر له لتأكيد الإتقان",
        tjw_checkpoint_prompt: "استمع لتلاوة الطالب لهاتين الآيتين، ثم قيّم كل معيار بدقة",
        tjw_checkpoint_generic_criterion: "نطق الحكم بشكل صحيح وواضح",
        tjw_checkpoint_rate_yes: "أتقنه تمامًا",
        tjw_checkpoint_rate_partial: "أتقنه جزئيًا",
        tjw_checkpoint_rate_no: "يحتاج تدريبًا",
        tjw_checkpoint_note_placeholder: "ملاحظة اختيارية عن أداء الطالب (اختياري)...",
        tjw_checkpoint_submit_btn: "إرسال التقييم",
        tjw_checkpoint_incomplete_alert: "يرجى تقييم كل المعايير قبل الإرسال",

        tjw_badge_first_step_name: "أول خطوة",
        tjw_badge_first_step_desc: "أول نشاط تلعبه في مسار أبطال التجويد",
        tjw_badge_first_mastery_name: "أول إتقان",
        tjw_badge_first_mastery_desc: "أتقنت أول حكم تجويد لك بالكامل",
        tjw_badge_stage_master_qalqalah_name: "بطل القلقلة",
        // 🌟🌟 [جديد ٢٨ سبتمبر] وسامان للمرحلتين الجديدتين — راجع TAJWEED_BADGE_CATALOG في tajweedEngine.js
        tjw_badge_stage_master_meem_noon_mushaddadah_name: "بطل الغنة",
        tjw_badge_stage_master_meem_sakinah_name: "بطل الميم الساكنة",
        tjw_badge_stage_master_noon_sakinah_name: "بطل النون الساكنة",
        tjw_badge_stage_master_desc: "أتقنت كل أحكام هذه المرحلة",
        tjw_badge_perfect_challenge_name: "أداء مثالي",
        tjw_badge_perfect_challenge_desc: "أجبت بلا أي خطأ في تحدي مرحلة أو جولة مراجعة",
        tjw_badge_review_streak_name: "مراجع مواظب",
        tjw_badge_review_streak_desc: "راجعت 3 أيام متتالية على الأقل",
        tjw_badge_five_rules_name: "خمسة أحكام",
        tjw_badge_five_rules_desc: "أتقنت خمسة أحكام تجويد",
        tjw_badge_all_rules_name: "تاج الإتقان",
        tjw_badge_all_rules_desc: "أتقنت كل الأحكام المتاحة حالياً",
        tjw_badge_no_mistakes_name: "بلا أخطاء",
        tjw_badge_no_mistakes_desc: "أجبت عن كل أسئلة نشاط واحد بشكل صحيح",
        tjw_badge_comeback_name: "عودة قوية",
        tjw_badge_comeback_desc: "راجعت حكماً كان يحتاج مراجعة ونجحت فيه",
        tjw_badge_daily_practice_name: "ممارسة منتظمة",
        tjw_badge_daily_practice_desc: "تدرّبت على مسار التجويد في 5 أيام مختلفة",
        tjw_badge_ten_sessions_name: "عشر جلسات",
        tjw_badge_ten_sessions_desc: "أكملت عشر جلسات نشاط في مسار التجويد",
        tjw_badge_quick_learner_name: "متعلّم سريع",
        tjw_badge_quick_learner_desc: "أتقنت حكماً من أول محاولتين فقط",

        tjw_profile_section_title: "مسار التجويد 🏆",
        tjw_profile_no_progress: "لم يبدأ هذا الطالب مسار أبطال التجويد بعد",
        tjw_profile_current_stage: "المرحلة الحالية",
        tjw_profile_mastered_count: "أحكام متقَنة",
        tjw_profile_badges_empty: "لا توجد أوسمة تجويد بعد",
        // 🌟 [جديد] ترجمة نصوص محرّك أسئلة الأطفال
        kids_tf_question: "هل هذه الآية من سورة <span style=\"color:#0284c7;\">( {surah} )</span> ؟",
        kids_choose_next_ayah: "اختر الآية التي تليها:",
        kids_surah_label: "سورة ( {name} )",
        report_first_ayah_of_surah: "أول آية من سورة {name}",
        report_extract_word: "استخراج كلمة {word}",
        kids_listen_instruction: "🎧 استمع جيدًا، ثم اختر الآية التي سمعتها",
        kids_listen_play_btn: "🔊 استمع للآية",
        // 🌟 [جديد] محرّك أسئلة الكبار (quranEngine)
        list_sep: "، ",
        qe_visual_question: "في أي صفحة تقع هذه الآية من المصحف الشريف؟ (اليمنى أم اليسرى؟)",
        qe_page_right: "الصفحة اليمنى",
        qe_page_left: "الصفحة اليسرى",
        qe_tap_unblur: "(اضغط على الصورة لرفع الضباب عنها)",
        qe_correct_page: "( الإجابة الصحيحة: الصفحة {side} )",
        qe_side_right: "اليمنى",
        qe_side_left: "اليسرى",
        qe_zoom_mushaf: "🔍 تكبير المصحف للمراجعة",
        qe_none: "لا يوجد",
        qe_range_start: "أول النطاق",
        qe_surah_start: "أول السورة",
        qe_report_order_ayahs: "الآيات (ترتيب): {nums}",
        qe_recite_surah_pre: "سمّع سورة",
        qe_recite_surah_post: "كاملة",
        qe_recite_n_pre: "سمّع {n} آيات من سورة",
        qe_from_verse: "من قوله تعالى:",
        qe_to_verse: "إلى قوله تعالى:",
        qe_report_recite_full: "تسميع سورة {name} كاملة",
        qe_report_recite_part: "تسميع من سورة {name} ({n} آيات)",
        qe_report_link_kids: "ربط بدايات ونهايات الآيات: {nums}",
        qe_report_link_adult: "ربط أوائل الآيات بأواخرها: {nums}",
        qe_report_order_surahs: "ترتيب السور: {names}",
        qe_report_word_surah_kids: "ربط كلمة بسورتها: {names}",
        qe_report_word_surah_adult: "ربط كلمات بسورها: {names}",
        // 🌟 [جديد] شاشة لوحة التقييم
        dash_kids_play_title: "🎈 هيا نلعب 🎈",
        dash_choose_surah: "-- اختر السورة --",
        dash_alert_choose_surah: "الرجاء اختيار السورة أولاً!",
        dash_alert_bad_range: "نطاق الآيات غير صحيح!",
        dash_juz_label: "الجزء {n} {name}",
        dash_ayah_label: "آية {n}",
        dash_surah_option: "{n}. سورة {name}",
        dash_header_surah: "🏆 رحلة إتقان القرآن - سورة {name}",
        dash_header_multi: "🏆 رحلة إتقان القرآن - عدة سور",
        dash_header_other: "🏆 رحلة إتقان القرآن - {label}",
        // 🌟 [جديد] نصوص شاشتَي اللعب (الأطفال والكبار)
        game_ref_label: "( سورة {name} - آية {n} )",
        kids_range_text: "ألعاب أطفال (من سورة {sfrom} إلى {sto})",
        adult_range_text: "نطاق (من سورة {sfrom} إلى {sto})",
        adult_juz_text: "الجزء {n}",
        adult_surah_text: "سورة {name} (من {a} إلى {b})",
        adult_reduced_questions: "تم تقليل الأسئلة إلى {n} لتناسب حجم السورة.",
        gen_note_prefix: "ملاحظة: {text}",
        // 🌟 [جديد] التقرير الفردي (report.js)
        rp_question: "سؤال",
        rp_loc_ayah: "سورة {name} - آية {n}",
        rp_loc_surah: "سورة {name}",
        rp_note_hint: "استخدم تلميحًا للوصول إلى الإجابة",
        rp_note_reorder_many: "احتاج أكثر من محاولة لترتيب الكلمات بشكل صحيح",
        rp_note_reorder_one: "احتاج محاولة إضافية لترتيب الكلمات بشكل صحيح",
        rp_note_error: "خطأ: {errors}",
        rp_note_wrong: "إجابة غير صحيحة",
        rp_dur_min_sec: "{m} د {s} ث",
        rp_dur_sec: "{s} ث",
        rp_strength_correct: "حفظ صحيح ودقيق لعدد {c} من {n} سؤالًا دون أي مساعدة",
        rp_strength_speed: "متوسط زمن الإجابة {now} — أسرع من متوسط محاولاته السابقة ({prev})",
        rp_strength_consistent: "ثبات واضح في الحفظ عبر أكثر من سؤال في هذا النطاق دون الحاجة لأي مساعدة",
        rp_strength_default: "إكمال المحاولة كاملة رغم صعوبة بعض الأسئلة، وهذا بحد ذاته إنجاز يستحق التقدير",
        rp_focus_default: "الاستمرار في المراجعة اليومية المعتادة للحفاظ على هذا المستوى",
        rp_tone_excellent: "ممتاز",
        rp_tone_good: "جيد",
        rp_tone_average: "متوسط",
        rp_tone_weak: "بحاجة إلى دعم إضافي",
        rp_honesty_excellent: "نتيجة تعكس إتقانًا حقيقيًا لمعظم أسئلة هذا الاختبار.",
        rp_honesty_good: "نتيجة جيدة تدل على حفظ متين لمعظم الأسئلة، مع بعض الجوانب التي تستحق مزيدًا من المراجعة والتثبيت.",
        rp_honesty_average: "نتيجة متوسطة تُظهر أساسًا موجودًا يمكن تقويته بمراجعة أكثر انتظامًا.",
        rp_honesty_weak: "الأداء في هذا الاختبار ما زال دون المستوى المطلوب، وهذه فرصة جيدة لتكثيف المراجعة معًا خطوة بخطوة.",
        rp_note_lead_excellent: "أداء {name} في هذا الاختبار كان ممتازًا وعكس حفظًا متينًا لمعظم الأسئلة.",
        rp_note_lead_good: "أداء {name} كان جيدًا وتضمّن حفظًا صحيحًا لغالبية الأسئلة، مع بعض النقاط التي تحتاج مزيدًا من المراجعة والتثبيت.",
        rp_note_lead_average: "أداء {name} كان متوسطًا بشكل عام، وهناك نقاط محددة يمكن تحسينها بمراجعة منتظمة.",
        rp_note_lead_weak: "بذل {name} جهدًا في هذا الاختبار، لكنه ما زال بحاجة إلى دعم إضافي في بعض الجوانب.",
        rp_note_focus: " نوصي بالتركيز على: {text}.",
        rp_note_close_weak: " ونثق أن متابعة قريبة معًا خلال الأيام القادمة ستُحدث فرقًا واضحًا بإذن الله.",
        rp_note_close_other: " وسنتابع التقدم معًا أولًا بأول.",
        rp_default_student: "الطالب",
        rp_default_teacher: "المعلم",
        rp_err_read_file: "تعذّرت قراءة الملف",
        rp_err_bad_image: "الملف ليس صورة صالحة",
        rp_err_pick_image: "يرجى اختيار ملف صورة صالح (JPG أو PNG).",
        rp_err_load_image: "تعذّر تحميل الصورة، حاول مرة أخرى بصورة أخرى.",
        rp_err_load_lib: "تعذّر تحميل المكتبة: {src}",
        rp_err_export: "حدث خطأ أثناء التصدير: {msg}",
        rp_err_pick_stamp: "يرجى اختيار ملف صورة صالح للختم.",
        rp_err_load_stamp: "تعذّر تحميل صورة الختم، حاول مرة أخرى.",
        rp_busy: "جارِ التجهيز…",
        rp_file_prefix: "تقرير",
        // 🌟 [جديد] عبارات التشجيع
        enc_1: "ما شاء الله عليك! 🌟",
        enc_2: "بطل! استمر 🚀",
        enc_3: "ممتاز جداً! 👏",
        enc_4: "بارك الله فيك! 💚",
        enc_5: "أحسنت يا مبدع! 🎯",
        // 🌟 [جديد] صفحة الخصوصية
        priv_title: "سياسة الخصوصية",
        priv_sub: "منصة حمٓ لتثبيت الحفظ و المراجعة",
        priv_updated: "آخر تحديث: 27 سبتمبر 2026",
        priv_intro: "منصة \"حمٓ\" لا تجمع أي بيانات شخصية من الطلاب أو المعلمين بشكل افتراضي.",
        priv_h_email: "استخدام البريد الإلكتروني",
        priv_email_p: "يُستخدم البريد الإلكتروني فقط عند تسجيل دخول المعلم، لغرضين اثنين لا غير:",
        priv_li1: "حفظ بيانات كل معلم بشكل مستقل وآمن، دون اختلاطها ببيانات معلم آخر.",
        priv_li2: "ضمان وصول إجابات الطلاب وتسليماتهم إلى المعلم الصحيح المسؤول عنهم.",
        priv_h_share: "مشاركة البيانات",
        priv_share_p: "لا تتم مشاركة هذا البريد أو أي بيانات مرتبطة به مع أي طرف ثالث، ولا يُستخدم لأي غرض تسويقي أو إعلاني.",
        priv_contact: "لأي استفسار، تواصل عبر:",
        priv_footer: "© حمٓ",
        // 🌟 [جديد] ملف الطالب
        stu_and: " و ",
        stu_age_paren: "(العمر: {n} سنة)",
        stu_age_years: "{n} سنة",
        stu_not_set: "غير محدد",
        stu_age_not_set: "العمر غير محدد",
        stu_grade_not_set: "الصف غير محدد",
        stu_country_not_set: "🌍 البلد غير محدد",
        stu_phone_not_set: "📱 الهاتف غير مسجل",
        stu_hero_name: "الطالب: {name}",
        stu_no_errors_btn: "لا توجد أخطاء مسجلة 🎉",
        stu_no_history: "لا توجد تقييمات سابقة لهذا الطالب.",
        stu_restore: "استعادة الطالب",
        stu_hide: "إخفاء الطالب",
        stu_edit_data: "تعديل البيانات",
        stu_delete_final: "حذف الطالب نهائياً",
        stu_errors_btn: "🛠️ الأخطاء ({n})",
        stu_no_errors: "لا أخطاء",
        stu_loc_text: "سورة {surah}{ayah}",
        stu_loc_ayah: " - آية {n}",
        // 🌟 [جديد] لعب الواجب
        hw_pl_title: "تحدي الأبطال 🏆",
        hw_pl_prev: "السابق",
        hw_pl_next: "التالي ➡️",
        hw_pl_submit: "📨 إنهاء وتسليم الواجب",
        // 🌟 [جديد] سجل الطلاب والتسميع
        as_col_age: "العمر",
        as_col_errors: "علاج الأخطاء",
        as_col_evals: "التقييمات",
        as_col_grade: "الصف",
        as_col_manage: "إدارة وتعديل",
        as_col_name: "اسم الطالب",
        as_col_points: "النقاط",
        btn_back_to_my_students: "🔙 رجوع لطلابي",
        hw_overdue_stat: "متأخر عن التسليم",
        rec_cancel_btn: "↩️ رجوع للتسجيل",
        rec_err_hesitation: "تردد",
        rec_err_pronounce: "خطأ نطق",
        rec_err_verse: "نسيان آية",
        rec_err_word: "نسيان كلمة",
        rec_finish_btn: "✅ إنهاء التسميع",
        rec_location_ph: "أين حدث؟ (اختياري)",
        rec_location_save_btn: "✓",
        rec_note_label: "ملاحظة عامة على الجلسة (اختياري)",
        rec_note_ph: "اكتب أي ملاحظة عامة هنا...",
        rec_play_hint: "اضغط الزر المناسب فور حدوث الملاحظة أثناء استماعك للطالب — بلا توقف.",
        rec_range_from: "من",
        rec_range_from_ph: "مثال: سورة البقرة - آية 1",
        rec_range_to: "إلى",
        rec_range_to_ph: "مثال: سورة البقرة - آية 20",
        rec_save_btn: "💾 حفظ الجلسة",
        rec_setup_sub: "اختر نوع الجلسة ونطاقها، ثم ابدأ — تسجيل أي ملاحظة أثناء الاستماع بضغطة واحدة فقط.",
        rec_setup_title: "🎙️ بدء جلسة تسميع",
        rec_start_btn: "🎙️ ابدأ التسميع",
        rec_summary_title: "ملخص جلسة التسميع",
        rec_total_label: "إجمالي الملاحظات المسجَّلة:",
        rec_type_new: "حفظ جديد",
        rec_type_review: "مراجعة",
        as_page_title: "📊 السجل العام لبيانات وإنجازات الطلاب",
        as_edit_title: "تعديل بيانات الطالب",
        as_gender_label: "الجنس (للصورة الرمزية):",
        as_gender_boy: "👦🏻 ولد",
        as_gender_girl: "👧🏻 بنت",
        as_photo_label: "صورة شخصية (اختياري):",
        as_save_edits: "حفظ التعديلات ✔️",
        as_memo_label: "مقدار الحفظ (من سورة - إلى سورة):",
        // 🌟 [جديد 2026-10-03] شكل القائمة المبسّطة لسجل الطلاب العام
        as_count: "{n} طالب",
        as_search_ph: "🔎 ابحث عن طالب...",
        as_points_unit: "نقطة",
        as_more_options: "خيارات",
        as_fix_errors: "🛠️ {n} أخطاء للعلاج",
        as_hidden_group: "🙈 الطلاب المخفيون ({n})",
        as_show_btn: "👁️ إظهار",
        as_no_match: "لا يوجد طالب بهذا الاسم.",
        as_empty: "لا يوجد طلاب مسجلون بعد.",
        // 🌟 [جديد 2026-10-03] نافذة "إضافة طالب جديد" السريعة
        add_choose_photo: "اختر صورة:",
        add_step_next: "التالي ←",
        add_step_back: "→ رجوع",
        add_skip_save: "تخطَّ واحفظ الآن",
        add_step_of: "الخطوة {n} من 3: {title}",
        add_step1_title: "الاسم والصورة",
        add_step2_title: "الصف والعمر",
        add_step3_title: "ولي الأمر والحفظ",
        save_and_add_another: "حفظ وإضافة آخر ➕",
        add_saved_next: "✔️ تم تسجيل «{name}». أضف الطالب التالي.",
        dob_day: "يوم",
        dob_month: "شهر",
        dob_year: "سنة",
        upload_photo_title: "رفع صورة حقيقية",
        as_parent_phone: "رقم ولي الأمر (اختياري):",
        // 🌟 [جديد] تسميع وملف الطالب
        rec_no_student_selected: "لم يتم اختيار طالب. اختر طالبًا أولاً.",
        rec_last_logged: "آخر ما سُجِّل:",
        rec_exit_confirm_msg: "هل تريد الخروج؟ ستُفقد الملاحظات غير المحفوظة.",
        rec_no_errors_note: "لم تُسجَّل أي ملاحظات في هذه الجلسة.",
        rec_saved_toast: "تم حفظ الجلسة ✅",
        rec_range_required_alert: "الرجاء كتابة بداية ونهاية نطاق التسميع.",
        hw_overdue_row_badge: "متأخر عن التسليم",
        hw_overdue_tooltip: "واجبات منشورة منذ فترة لم يُسلّمها الطالب المخصَّص له بعد",
        pfx_back: "🔙 العودة",
        pfx_total_points: "إجمالي النقاط المكتسبة 🏆",
        pfx_eval_count: "عدد التقييمات السابقة 📈",
        pfx_dual_wins: "انتصارات الاختبارات الثنائية 🆚",
        pfx_dual_badges: "🎖️ أوسمة الاختبارات الثنائية",
        pfx_history_title: "سجل التقييمات السابقة 📅",
        pfx_col_no: "م",
        pfx_col_date: "التاريخ",
        pfx_col_range: "نطاق التقييم",
        pfx_col_pct: "النسبة المئوية",
        pfx_back_in_prof: "🔙 العودة",
    },
    en: {
        header_title: "🏆 Quran Mastery Journey",
        header_title_kids: "🎈 Little Champions Corner",
        header_subtitle: "Ham Platform",
        login_kids_title: "Heroes Login 🎈",
        login_adults_title: "Login",
        lang_toggle: "العربية",

        // Splash Screen
        // 🌟 كلمة "حمٓ" في span لتلوينها بالذهبي (يُطبَّق النص عبر innerHTML في applyTranslations)
        splash_title: '<span class="home-title-ha">حمٓ</span> وَٱلۡكِتَٰبِ ٱلۡمُبِينِ',
        splash_subtitle: "Ham Platform for Retaining & Reviewing Memorization",
        btn_adult: "Adults Interface",
        btn_kids: "Kids Corner",
        btn_dual: "Dual Tests",
        // 🌟 [New] "Similarities Challenge" card on the home screen — the feature itself is
        // still under construction (engine/similarityEngine.js and database/similaritiesDB.js
        // exist as a partial base, but there's no actual gameplay screen yet)
        btn_similarities: "Similarities Challenge",
        // 🌟 [New] entry card for the "Tajweed Heroes" path — still being built in phases
        btn_tajweed: "Tajweed Heroes",
        btn_my_students: "My Students",
        my_students_title: "My Students",
        my_students_subtitle: "Manage Student Records",
        // 🌟 [2026-10-03] "My Students" redesigned screen (cards + numbers)
        ms_back: "Back to main menu",
        ms_stat_students: "Students",
        ms_stat_memo: "Awaiting memorization",
        ms_stat_reports_generic: "Reports exported",
        ms_stat_reports: "{month} reports exported",
        ms_section_students: "Students",
        ms_section_monthly_generic: "Monthly follow-up",
        ms_section_monthly: "Monthly follow-up · {month}",
        ms_card_all_title: "Students record",
        ms_card_all_desc: "Open any student's file or edit their details",
        ms_card_add_title: "New student",
        ms_card_add_desc: "Only the name is required",
        ms_card_memo_title: "Monthly memorization",
        ms_card_memo_desc: "Where did each student stop this month?",
        ms_card_reports_title: "Monthly reports",
        ms_card_reports_desc: "WhatsApp to the parent, or PDF",
        ms_badge_memo: "{n} waiting",
        ms_badge_reports: "{n} left",
        ms_reminder_memo: "Students still missing their monthly memorization: {n}",
        ms_reminder_start: "Start now",
        prep_by: "Prepared by Quran Teacher:",
        teacher_name: "Abdullah Bin Al-Mayyah Al-Azhari",

        // 🌟 New Home Screen: "Why Ham?" section, menu card descriptions & footer 🌟
        why_darham_title: "Why Ham?",
        why_darham_subtitle: "A complete platform for memorizing, reviewing and evaluating the Quran",
        why_free_title: "Free",
        why_free_desc: "Completely free",
        why_complete_title: "Comprehensive",
        why_complete_desc: "The entire Holy Quran",
        why_privacy_title: "Privacy",
        why_privacy_desc: "We care about users' privacy",
        why_ages_title: "For All Ages",
        why_ages_desc: "An experience for kids, youth and adults",
        why_eval_title: "Accurate Evaluation",
        why_eval_desc: "Varied challenges to measure mastery of memorization",
        why_reports_title: "Professional Reports",
        why_reports_desc: "Clear reports to track the student's level",
        why_homework_title: "Homework",
        why_homework_desc: "Follow up on review outside class time",
        why_experts_title: "Built by Specialists",
        why_experts_desc: "Tools designed to serve Quran education",

        card_adult_desc: "Evaluate students from grade 7 and above",
        card_kids_desc: "Evaluate children (up to grade 6) with simple games",
        card_students_desc: "Add your students and follow their records and reports",
        card_homework_desc: "Send and track memorization homework",
        // 🌟 [Updated] after the dual-tests basics (setup + real play) were completed, removed
        // "(in development)" from the card description at the teacher's explicit request — see
        // the card's own comment in components/splash.html for the matching badge removal
        card_dual_desc: "A challenge between two students",
        // 🏅 Certificates & Reports (certificates/certificates.js)
        btn_certs: "Certificates & Reports",
        card_certs_desc: "Ready-made certificates and your past reports",
        sheet_certs: "Certificates & Reports",
        cc_title: "🏅 Certificates & Reports",
        cc_close: "Close",
        cc_tab_issue: "Issue a certificate",
        cc_tab_history: "Certificates log",
        cc_tab_reports: "Past reports",
        cc_step_type: "Certificate type",
        cc_step_student: "Student",
        cc_step_details: "Details",
        cc_step_text: "Wording & language",
        cc_step_verse: "Verse or hadith",
        cc_step_template: "Template",
        cc_font: "Font (Arabic certificates)",
        cc_font_default: "Template font",
        cc_font_hint: "Font choice applies to Arabic certificates only.",
        cc_step_date: "Date",
        cc_pick_student: "Choose from your students",
        cc_select_student: "— Choose a student —",
        cc_other_name: "✏️ Type another name",
        cc_student_name: "Student name",
        cc_gender: "Gender (for the wording)",
        cc_boy: "👦 Male",
        cc_girl: "👧 Female",
        cc_surah: "Surah",
        cc_juz: "Juz'",
        cc_half: "Which half?",
        cc_half_first: "First half of the Juz'",
        cc_half_second: "Second half of the Juz'",
        cc_month_auto: "The month is taken automatically from the certificate date (step 7).",
        cc_no_details: "This certificate needs no extra details.",
        cc_lang: "Certificate language",
        cc_lang_hint: "The certificate can be in a different language than the platform.",
        cc_lang_ar: "العربية",
        cc_lang_en: "English",
        cc_next_variant: "🔀 Another wording",
        cc_extra_label: "Your own line (optional)",
        cc_extra_ph: "e.g. Masha'Allah, keep it up",
        cc_basmala: "Show the Basmala at the top",
        cc_baked_note: "This template already has the Basmala/title in its design, so we do not repeat them.",
        cc_verse_none: "None",
        cc_btn_png: "🖼️ Save as image",
        cc_btn_pdf: "📄 Save PDF",
        cc_btn_wa: "📲 Share on WhatsApp",
        cc_btn_keep: "💾 Save to log",
        cc_busy: "⏳ Preparing...",
        cc_need_name: "Enter the student name first (step 2).",
        cc_saved_png: "Image saved and added to the log ✅",
        cc_saved_pdf: "PDF (A4) saved and added to the log ✅",
        cc_share_fallback: "The image was downloaded: open WhatsApp and attach it manually (this browser does not support direct sharing).",
        cc_kept: "Added to the log ✅",
        cc_already_kept: "This certificate is already in the log.",
        cc_keep_fail: "Could not save to the log.",
        cc_fail: "Could not create the certificate. Check your internet connection (needed to load fonts and libraries) and try again.",
        cc_search_ph: "Search by student name",
        cc_all_types: "All types",
        cc_open_edit: "Open & edit",
        cc_delete: "Delete",
        cc_confirm_delete: "Delete this certificate from the log?",
        cc_hist_empty: "No certificates issued yet.<br>Every certificate you save or share appears here, and you can reopen and edit it anytime.",
        cc_no_match: "No matching results.",
        cc_rep_note: "Reports you export (image, PDF or WhatsApp) are saved here automatically so you can come back and resend them.",
        cc_rep_empty: "No saved reports yet.<br>From now on, every individual evaluation, dual test or monthly report you export will appear here automatically.",
        cc_rep_kind_individual: "Individual evaluation",
        cc_rep_kind_dual: "Dual test",
        cc_rep_kind_monthly: "Monthly report",
        cc_rep_view: "View",
        cc_rep_download: "Download",
        cc_rep_share: "Share",
        cc_rep_confirm_delete: "Delete this report from the archive?",
        cc_rep_saved_as_image: "Saved as an image at export time. For a fresh PDF, open the report from its original screen.",
        cc_rep_search_ph: "Search by student name",
        cc_placeholder_name: "Student name",
        cc_teacher: "Teacher",
        cc_date: "Date",
        cc_cert_no: "Certificate No.",
        tour_home_certs: "Issue ready-made appreciation certificates for your students with beautiful templates, and find your past reports saved automatically.",
        tour_cc_tabs: "Three sections: issue a new certificate, your past certificates log, and the reports you exported before.",
        tour_cc_type: "Start by choosing the certificate type: surah or juz completion, review excellence, Qur'an completion, thanks...",
        tour_cc_student: "Pick the student from your list and the gender is set automatically so the wording is correct. If not registered, choose \"Type another name\".",
        tour_cc_text: "Choose a ready wording you like (or tap \"Another wording\"), pick the certificate language, and optionally add your own line.",
        tour_cc_template: "Pick the template you like from dozens of designs; the preview updates instantly.",
        tour_cc_preview: "This is a live preview of the certificate exactly as it will come out.",
        tour_cc_save: "Save the certificate as an image or a print-ready PDF, or share it on WhatsApp. It is added to the log automatically.",
        tour_cc_reports: "Here you will find every report you exported (individual, dual test, monthly) saved automatically so you can view or resend it.",
        // 🌟 [Updated] used to say "in development" entirely, then browsing became real
        // with no games yet, and now (after building similarities-play.js) the feature is
        // complete: browsing + auto-graded interactive games — description updated to match
        card_similarities_desc: "Browse similar verses across surahs and play interactive games to master them",
        // 🌟 [New] "Tajweed Heroes" card description
        card_tajweed_desc: "A gradual, fun Tajweed learning journey for every student",

        footer_about_title: "About Ham",
        footer_about_text: "An old-new idea for solidifying memorization and review",
        footer_contact: "Contact Us",
        footer_copyright: "© 2026 Ham - All Rights Reserved",

        // Login Screen
        login_subtitle: "Select a registered student to continue",
        search_student_ph: "🔍 Type student's name to search...",
        btn_quick_login: "Quick Entry for Evaluation 🚀",
        // 🌟 [New 2026-10-01 — usability audit] name suggestions while typing + optional/required field tags
        // + "Start evaluation" buttons in the students list and profile + "Evaluate another student" + other sign-in options
        login_no_match: "No student with this name",
        stu_required_tag: "(required)",
        stu_optional_tag: "(optional)",
        as_col_start_eval: "Evaluate",
        stu_start_eval_row: "🚀 Evaluate",
        stu_start_eval_adult: "🚀 Start evaluation (Adults)",
        stu_start_eval_kids: "🧒 Start evaluation (Kids)",
        rep_tb_another: "Evaluate another student",
        btn_all_students: "📊 General Students Record",
        // 🌟 [New] Backup messages (v2 includes evaluations history)
        backup_restore_ok: "Data restored successfully (students + evaluations history)!",
        backup_restore_ok_legacy: "Students restored. ⚠️ This is an old-format file without evaluations history — export a new backup from the original device to restore it.",
        backup_invalid_file: "Invalid file!",
        // 🌟 [Button audit fix] Clarifies students-only export vs. the full backup in the teacher profile
        // 🌟 [Button audit fix] General record table headings (also used as phone card labels)
        as_col_no: "#", as_col_name: "Student", as_col_age: "Age", as_col_grade: "Grade", as_col_points: "Points", as_col_evals: "Evaluations", as_col_manage: "Manage", as_col_errors: "Fix mistakes",
        backup_export_students_btn: "📥 Export students only",
        backup_import_students_btn: "📤 Import students",
        profile_backup_restore_students_only: "This is a students-only export from the General Record. Import it with the \"Import students\" button in the General Students Record.",
        btn_add_student: "Register New Student ➕",
        // 🌟 [New] "Record monthly memorization for all students" button + screen keys
        // (components/monthlyMemorizationBulkScreen.js)
        btn_monthly_memo_bulk: "📋 Record Monthly Memorization for All Students",
        mmb_title: "Record Monthly Memorization for All Students",
        mmb_late_hint: "This is the student's position at the end of {month}/{year}, not today's — enter the last surah and ayah reached in that month.",
        // 🌟 [new] Monthly Reports Hub (components/monthlyReportsHub.js)
        btn_monthly_reports_hub: "📅 Monthly Reports",
        mrh_title: "Monthly Reports",
        mrh_close: "Close",
        mrh_search_ph: "Type the student's name…",
        mrh_no_match: "No student with this name",
        mrh_change_student: "Change student",
        mrh_current_month: "Current month",
        mrh_status_ready: "✅ Ready",
        mrh_status_missing: "⚠️ Missing",
        mrh_missing_msg: "the last surah and ayah the student reached in {month}",
        mrh_fix_btn: "Record now",
        mrh_edit_btn: "Edit position",
        mrh_nodata: "No data for this month (before the student was tracked)",
        mrh_summary_memo: "Memorization: from {from} to {to} — {n} new ayahs",
        mrh_summary_end_only: "Last position:",
        mrh_summary_games: "Game room: {n} sessions, average {avg}%",
        mrh_summary_games_none: "Game room: no sessions this month",
        mrh_summary_hw_note: "Homework and dual tests are fetched at export time.",
        mrh_btn_whatsapp: "📱 WhatsApp version",
        mrh_btn_pdf: "🖨️ Print PDF",
        mrh_btn_preview: "👁️ Preview report",
        mrh_exported_before: "Exported before: {date}",
        mrh_missing_export_hint: "You can export now, but the report will have no memorization journey.",
        mrh_done_today: "Done today: {n}",
        mrh_exported_ok: "✅ Report exported for {name}",
        mrh_prev_banner: "{month} reports not yet exported for {n} students",
        mrh_banner_show: "Show names",
        // 🌟 [new] Monthly review — the five parts (components/monthlyReviewScreen.js + report section)
        mrv_title: "Monthly Review",
        mrv_col_from: "Start of month (surah)",
        mrv_col_to: "End of month (reached)",
        mrv_not_reviewed: "— Did not review this part —",
        mrv_count_fmt: "Reviewed {n} ayahs — {pct}% of the juz",
        mrv_wrapped: "New cycle from the start of the part",
        mrv_hint: "Add only the juz the student reviewed this month. Pick the surah and the ayah fills in automatically; edit it when needed (for long surahs).",
        mrv_add: "Add a juz",
        mrv_remove: "Remove this juz",
        mrv_from: "From",
        mrv_to: "To",
        mrv_not_reached: "— Not reached yet —",
        mrv_out_of_range: "The position is outside the selected juz, please check.",
        mrv_juz_n: "Juz' {n}",
        mrv_save: "Save review",
        mrv_cancel: "Cancel",
        mrv_part_ahqaf: "Juz' Al-Ahqaf",
        mrv_part_dhariyat: "Juz' Adh-Dhariyat",
        mrv_part_mujadila: "Juz' Al-Mujadila",
        mrv_part_tabarak: "Juz' Tabarak",
        mrv_part_amma: "Juz' 'Amma",
        mrh_review_done: "Review: {k} juz — {n} ayahs",
        mrh_review_missing: "Review: not recorded yet (optional)",
        mrh_review_add: "Record review",
        mrh_review_edit: "Edit review",
        mr_revparts_title: "Review Journey This Month",
        mr_revparts_sub: "Where the student started reviewing each juz and how far he reached",
        mr_revparts_none: "No review has been recorded this month yet.",
        mr_revparts_count_fmt: "{n} ayahs",
        mr_revparts_total_fmt: "The student reviewed {n} ayahs across {k} juz this month",
        mr_journey_sentence: "{name} memorized {n} new ayahs this month",
        mmb_progress: "Student {i} of {n}",
        mmb_skip_btn: "Skip",
        mmb_close_btn: "Close",
        mmb_done_title: "All done! 🎉",
        mmb_done_desc: "Memorization records were updated for all required students.",
        mmb_nothing_pending: "No student needs a memorization record right now — everything is up to date ✅",
        mmb_firsttime_title: "Record First Memorization Position",
        mmt_heading: "Memorization",
        mmt_sub: "Enter the last surah and ayah each student reached. Rows you leave unchanged are saved as \"no progress\".",
        mmt_month_fmt: "End of {m}/{y}",
        mmt_stat_students: "Students",
        mmt_stat_moved: "Progressed",
        mmt_stat_total: "New ayahs for the class",
        mmt_search_ph: "Search by student name…",
        mmt_col_student: "Student",
        mmt_col_start: "Month started at",
        mmt_col_surah: "Reached surah",
        mmt_col_ayah: "Ayah",
        mmt_col_new: "New",
        mmt_col_last: "Last month",
        mmt_col_later: "Later",
        mmt_later_title: "Postpone this student — not saved now, shown again next time",
        mmt_first_start: "First record",
        mmt_first_badge: "Starting point",
        mmt_backward: "Before start",
        mmt_hint_ok: "New ayahs are calculated automatically from An-Nas toward Al-Fatihah",
        mmt_hint_err: "{n} row(s) need fixing: position is before the month's start",
        mmt_hint_zero: "{n} without progress — saved as 0 ayahs",
        mmt_save_btn: "Save {n} students",
        mmt_saving: "Saving…",
        mmt_saved_banner: "Saved {n} students ✓ — these are still waiting:",
        mmt_unsaved_confirm: "You have unsaved changes. Close without saving?",
        mmt_done_desc: "{n} students recorded · {k} new ayahs for the class",
        mmt_done_later: "{n} postponed student(s) will appear next time.",
        mmt_save_error: "Some rows could not be saved. Please try again.",
        btn_back: "🔙 Back to Main Menu",
        add_new_champion: "Add New Student",
        name_full: "Name (Full):",
        name_ph: "Student Name...",
        dob: "Date of Birth:",
        grade: "Grade:",
        country: "Country:",
        country_ph: "e.g., Egypt, KSA...",
        parent_phone: "Parent's Phone (Optional for WhatsApp):",
        phone_ph: "For sending reports...",
        memo_amount: "Memorization Amount (From - To):",
        choose_avatar: "Choose an Avatar:",
        upload_photo: "Or upload a real photo:",
        save_champ: "Save Student Data ✔️",
        cancel: "Cancel",

        // Dashboard
        dash_title: "Evaluation Dashboard ⚙️",
        eval_surah: "Specific Surah",
        eval_range: "Multiple Surahs",
        eval_juz: "By Juz",
        surah_label: "Surah:",
        q_count: "Number of Questions:",
        range_label: "Range (From - To):",
        from_surah: "From Surah:",
        to_surah: "To Surah:",
        select_juz: "Select Juz:",
        kids_range_label: "Questions Range (Al-Ahqaf to An-Nas):",
        kids_q_count: "Number of Games (Questions):",
        btn_start_eval: "🚀 Start Evaluation Now",
        btn_change_student: "🔙 Change Student / Back",
        btn_homework_module: "📝 Homework System",
        bday_notification_title: "🎉 Birthday Alert!",
        bday_notification_msg: "Today is the birthday of student: ",

        // 🌟 Home screen greeting & teacher profile 🌟
        greeting_morning: "Good morning",
        greeting_evening: "Good evening",
        // 🌟 [New] Daily rotation of extra greeting phrasings — same philosophy as
        // DAILY_QUOTES in components/homeQuickview.js: one phrasing per day (by day
        // number since Epoch), not truly random, so it stays fixed all day and changes
        // automatically tomorrow. See MORNING_GREETING_KEYS / EVENING_GREETING_KEYS in
        // components/teacherProfile.js
        greeting_morning_2: "Good morning, a blessed day to you",
        greeting_morning_3: "Wishing you a blessed morning",
        greeting_morning_4: "Good morning, full of light and knowledge",
        greeting_evening_2: "Good evening, peace and blessings",
        greeting_evening_3: "Good evening, wishing you well",
        greeting_evening_4: "A blessed evening to you",
        // 🌟 [New] Special Friday greeting — replaces the morning/evening rotation above
        // for the whole day on Fridays (regardless of time), rotating between two
        // phrasings by week number
        greeting_friday: "Blessed Friday",
        greeting_friday_2: "Blessed Friday, may your prayers be answered",
        greeting_title: "Sheikh",
        // 🌟 [New] Feminine greeting form — used instead of the line above when the
        // teacher's saved gender is female (see profile_gender_* below)
        greeting_title_female: "Ustadha",
        home_summary_hw_label: "homework(s) currently published",
        profile_badge_text: "Complete your profile 👋",
        profile_modal_title: "Your Profile",
        profile_photo_label: "Profile Photo",
        // 🌟 [New] Optional official stamp/seal upload (used when signing reports) 🌟
        profile_stamp_label: "Seal/Stamp (optional)",
        profile_name_label: "Name:",
        // 🌟 [New] Gender selection — fully optional, defaults to "Male" (unchanged old
        // behavior, title stays "Sheikh") unless "Female" is explicitly picked. A general
        // data field (not just a title label) so any other gender-agreeing text added
        // later in the platform can reuse it, not only the home screen greeting.
        profile_gender_label: "Gender:",
        profile_gender_male: "Male",
        profile_gender_female: "Female",
        profile_dob_label: "Date of Birth:",
        profile_dob_day: "Day",
        profile_dob_month: "Month",
        profile_dob_year: "Year",
        profile_edit_btn: "Edit my profile",
        profile_save_btn: "Save",
        profile_close_btn: "Close",

        // 🌟 [New] "Data Backup" section inside the teacher profile modal — export/restore
        // all platform data stored in IndexedDB (students, homework, recitation sessions,
        // dual tests...) to/from a single file that stays on the teacher's own device only,
        // with no upload to the internet, per the teacher's explicit request. See
        // core/backupRestore.js for the full export/restore mechanism 🌟
        profile_backup_section_title: "🗄️ Data Backup",
        profile_backup_last_never: "No backup has been taken on this device yet",
        profile_backup_last_prefix: "Last backup: ",
        profile_backup_download_btn: "⬇️ Backup Now",
        profile_backup_restore_btn: "⬆️ Restore Backup",
        profile_backup_restore_confirm: "This will replace ALL current data on this device with the content of the selected backup file, and cannot be undone. Are you sure you want to continue?",
        profile_backup_restore_invalid_file: "This file is not a valid Ham Platform backup.",
        profile_backup_restore_error: "Couldn't restore the backup. Make sure you selected the correct file.",
        profile_backup_restore_success: "Data restored successfully ✅ The platform will reload now.",

        teacher_bday_notification_title: "🎉 Happy Birthday!",
        teacher_bday_notification_msg: "Happy birthday, Sheikh ",
        // 🌟 [New] Feminine variant of the teacher's own birthday message
        teacher_bday_notification_msg_female: "Happy birthday, Ustadha ",

        // 🌟 New home screen: hero & "Quick Overview" card 🌟
        hero_eyebrow: "A Complete Learning Platform",
        home_card_homework_title: "Homework System",
        dual_in_progress_badge: "In Progress",
        // 🌟 [Old, no longer used now that the real browsing screens below exist] Kept
        // without deleting to avoid breaking any old reference — the card now uses
        // similarities_browse_badge instead
        similarities_in_progress_badge: "In Progress",
        similarities_toast_soon: "⚔️ The Similarities Challenge is still in development — stay tuned, God willing!",
        // 🌟 [New] badge & message for the "Tajweed Heroes" home card — actually used from
        // core/app.js (setupSplashListeners) via a plain alert(), the same fallback mechanism
        // already used elsewhere in that file when a screen isn't ready yet
        tajweed_in_progress_badge: "In Progress",
        tajweed_toast_soon: "🌟 Tajweed Heroes is still being designed — stay tuned, God willing!",

        // 🌟 [New] The real "Similar Verses Corner" screens (similarities/ folder) — browsing
        // is now real (read-only, no interactive games yet), so the card badge changed from
        // "In Progress" to reflect that accurately. The rest of the keys here cover: the home
        // screen (5 buttons: 4 juz' + Juz' Amma), surah lists, the surah detail screen, the
        // Juz' Amma branch (surahs/words), and the words list/detail
        similarities_browse_badge: "Browse Available",
        sim_home_title: "Similar Verses Corner",
        sim_home_subtitle: "Choose the juz' you want to browse",
        sim_juz_46: "Juz' Al-Ahqaf",
        sim_juz_51: "Juz' Adh-Dhariyat",
        sim_juz_58: "Juz' Al-Mujadila",
        sim_juz_67: "Juz' Tabarak",
        sim_juz_amma: "Juz' Amma",
        // 🌟 [Updated] Icon changed from 🔙 to ⬅️ to visually distinguish it from the full
        // "exit similarities corner" button, which keeps the site-wide 🔙 "return to main
        // menu" icon — both previously shared the same icon despite differing in weight.
        sim_btn_back_level: "⬅️ Back",
        sim_choose_surah_hint: "Choose a surah to view its matches",
        sim_groups_count_suffix: "similar group(s)",
        sim_surahs_count_suffix: "shared surah(s)",
        sim_amma_choice_subtitle: "Choose how to browse",
        sim_amma_btn_surahs: "Surahs",
        sim_amma_btn_words: "Words",
        sim_words_list_title: "Word Similarities - Juz' Amma",
        sim_words_list_subtitle: "Choose a phrase to view all its occurrences across surahs",
        sim_no_data: "No matches recorded for this selection yet",
        sim_loading: "⏳ Loading...",
        sim_ayah_word: "Ayah",
        sim_note_label: "📝 Note:",
        sim_tail_diff_label: "Difference:",
        sim_own_position_label: "Its position in this surah:",
        sim_other_surahs_label: "Also appears in:",
        // 🌟 [Old — 2026-09-16, round 2] No longer used after the per-card play button was
        // removed (see the new sim_start_game_surah_btn/sim_start_game_juz_btn below), kept
        // without deleting in case of any other future use
        sim_start_game_btn: "🎮 Start Game",
        // 🌟 [Old] No longer used now that the real game screen is built (see sim_game_*
        // keys below), kept without deleting in case of any other future use
        sim_game_toast_soon: "⚔️ Similarities games are still in development — stay tuned, God willing!",
        sim_cat_common: "Common Phrase",
        sim_cat_ending: "Ending Variation",
        sim_cat_refrain: "Repeated Refrain",
        sim_cat_form: "Form Variation",
        sim_cat_thematic: "Thematic Link",
        // 🌟 [New — 2026-09-16, round 2] New "play the whole surah/juz" buttons — see the
        // teacher's request note atop similarities/similarities.js
        sim_start_game_surah_btn: "🎮 Play This Surah",
        sim_start_game_juz_btn: "🎮 Play This Juz'",

        // 🌟 [New — 2026-09-16] "Add match manually" form (internal within-surah matches
        // only — see project doc for the scope decision). Full add/edit/delete support;
        // manually-added groups are stored directly in IndexedDB and are never wiped by a
        // future seed data update (see similaritiesDB.js)
        // 🌟 [Changed — 2026-09-16, round 2] sim_add_group_btn moved from a button inside the
        // surah detail screen to a button on the main home screen.
        // 🌟 [Changed — round 3] the picker used to be juz-then-surah (46-77 only); it now
        // opens a full list of all 114 surahs directly — see the round-3 comment in
        // similarities/similarities.js. sim_add_pick_juz_hint is now unused (kept, same as
        // sim_amma_choice_subtitle before it), and sim_add_pick_surah_hint's text was updated
        // to reflect picking from the whole Quran instead of one juz.
        sim_add_group_btn: "➕ Add Match Manually",
        sim_add_pick_juz_hint: "Choose the juz' you want to add a new match in",
        sim_add_pick_surah_hint: "Search and choose the surah from the whole Quran",
        sim_add_surah_search_placeholder: "🔍 Search by surah name or number",
        sim_manual_badge: "✏️ Manually Added",
        sim_quick_add_occ_title: "Quickly add an occurrence to this match",
        sim_edit_btn_title: "Edit",
        sim_delete_btn_title: "Delete",
        sim_form_title_add: "Add New Match",
        sim_form_title_edit: "Edit Match",
        sim_form_category_label: "Category",
        sim_form_anchor_label: "Common Phrase",
        sim_form_anchor_placeholder: "e.g. السَّمَاوَاتِ وَالْأَرْضِ",
        sim_form_note_label: "Additional Note (optional)",
        sim_form_occurrences_label: "Occurrences (at least two)",
        sim_form_ayah_number_label: "Ayah Number",
        sim_form_ayah_text_label: "Ayah Text",
        sim_form_tail_word_label: "Distinctive Word (optional — enables the Complete the Ayah game)",
        sim_form_add_occurrence_btn: "➕ Add Another Occurrence",
        sim_form_remove_occurrence_btn: "✖ Remove This Occurrence",
        sim_form_save_btn: "💾 Save",
        sim_form_cancel_btn: "Cancel",
        sim_form_delete_group_btn: "🗑️ Delete Group",
        sim_form_delete_confirm: "Are you sure you want to delete this match? This cannot be undone.",
        sim_form_error_min_occurrences: "Add at least two occurrences for each match",
        sim_form_error_required: "Please fill in the common phrase and every ayah's text before saving",
        sim_form_saved_toast: "✅ Saved successfully",
        sim_form_deleted_toast: "🗑️ Deleted",

        // 🌟 [New] "Similar Verses Corner" interactive game screen
        // (similarities/similarities-play.js) — two auto-graded games: "Where does it
        // appear?" (sim_position, the core game) and "Complete the correct ayah"
        // (sim_ending, bonus for groups with enough data) — see engine/similarityEngine.js
        sim_game_title: "🎮 Similarities Game",
        sim_game_q_position_ayah: "In which ayah does this phrase appear?",
        sim_game_q_position_surah: "In which surah does this ayah appear?",
        sim_game_q_ending: "What is the correct word that completes the ayah?",
        // 🌟 [New — 2026-09-23] 4 new question types covering "recognition / discrimination /
        // recall / avoiding confusion during recitation" — see engine/similarityEngine.js
        // header comment for the full skill → question-type mapping
        sim_game_q_discrimination: "What is the correct ending for this specific ayah?",
        sim_game_q_recitation_check: "You've reached this point while reciting... how does it continue?",
        sim_game_q_recognition: "Which of these ayahs actually contains this phrase?",
        sim_game_q_recall_ayah: "Choose the correct text that appears at this position",
        sim_game_q_recall_surah: "Choose the correct ayah that appears in this surah",
        sim_game_opt_ayah_prefix: "Ayah",
        sim_game_correct_feedback: "🎉 Correct answer!",
        sim_game_wrong_feedback: "❌ Pay closer attention next time",
        sim_game_not_enough_data: "Not enough data to build a game for this group yet",
        sim_game_results_title: "🏆 Your Score This Round",
        sim_game_play_again_btn: "🔁 Play Again",

        // 🌟 [New] "Dual Tests" setup screen — kept fully separate from homework and
        // game screens (explicit teacher request), see dualtests/dual-test-setup.js
        dts_title: "Set Up a Dual Test",
        dts_back: "Back",
        dts_list_title: "Saved Tests",
        dts_new_test_btn: "+ New Test",
        dts_no_tests: "No saved tests yet. Tap “New Test” to start.",
        dts_status_draft: "Draft",
        dts_status_ready: "Ready ✅",
        dts_edit_btn: "Edit",
        dts_start_match_btn: "Start Match",
        dts_delete_btn: "Delete",
        dts_delete_confirm: "Delete this test? This cannot be undone.",
        // 🌟 [New] "Past Matches" history modal — see openMatchesHistoryModal in
        // dual-test-setup.js. dtp_view_report_btn is reused for each row's button.
        dts_history_btn: "Past Matches",
        dts_history_modal_title: "This Test's Match History",
        dts_history_close_btn: "Close",
        dts_history_empty: "No finished matches for this test yet.",
        // 🌟 [جديد] Unfinished (paused) matches — one round per session, resumed later
        dts_pending_btn: "⏸️ Unfinished ({n})",
        // 🌟 [New] one button per student pair with pending matches (instead of one merged
        // count for the whole test) — see pendingPairKeyCache in dual-test-setup.js
        dts_pending_pair_btn: "Pending: {a} · {b} ({n})",
        dts_pending_pair_label: "Showing only {a} vs {b}'s unfinished matches:",
        dts_pending_modal_title: "⏸️ Unfinished Matches",
        dts_pending_modal_desc: "Pick a match to resume from its next round, with the same students and their saved scores.",
        dts_pending_empty: "No unfinished matches for this test.",
        dts_pending_next_round: "Resumes at round {n}",
        dts_pending_rounds_tally: "Rounds won: {a} — {b}",
        dts_pending_resume_btn: "▶️ Resume",
        dts_pending_delete_btn: "🗑️ Delete",
        dts_pending_delete_confirm: "Permanently delete this unfinished match? All its saved round results will be lost and it cannot be resumed.",
        dts_pending_conflict_confirm: "⏸️ These two students already have an unfinished match on this test, paused at round {n}.\n\n• “OK” = resume the unfinished match from round {n}.\n• “Cancel” = start a brand new match from scratch (the unfinished one is kept).",
        dts_competitor_a: "Competitor A",
        dts_competitor_b: "Competitor B",
        dts_choose_student: "-- Choose Student --",
        dts_no_students_hint: "Register students first from “My Students” before setting up a dual test.",
        dts_round1_title: "Round 1 — First Half 🌓",
        dts_round2_title: "Round 2 — Second Half 🌗",
        dts_round3_title: "Round 3 — Full Range 🌕",
        dts_round_range_label: "Round range (whole surah, optional, for reference only):",
        // 🌟 [New] Question-count progress badge in each round's header
        dts_round_progress_label: "📝 {main} main · 🔄 {swap} swap",
        dts_from_ayah: "From Ayah",
        dts_to_ayah: "To Ayah",
        dts_main_questions_title: "Main Questions",
        dts_add_question_btn: "Add Question",
        // 🌟 [New] Two-tab questions screen (approved proposal 1)
        dts_swap_tab_title: "Swap Questions",
        dts_main_tab_desc: "Shown on the question board by number; the two students pick from them in turn.",
        dts_no_main_questions: "No questions yet. Type the first one in the two fields below.",
        dts_no_swap_questions: "No swap questions yet. Type the first one in the two fields below.",
        dts_entry_enter_hint: "Type the question manually. Enter in “Recite from” moves to “To”; Enter in “To” adds the question.",
        dts_swap_questions_title: "🔄 Swap Questions (reserve, independent codes)",
        dts_swap_questions_desc: "These are not shown on the question board — used only when a student asks to swap. The student picks whichever code they want from this list.",
        dts_add_swap_btn: "Add Swap Question",
        dts_question_number_prefix: "Question",
        // 🌟 [New] Free-text question entry form — teacher writes "from"/"to" fully by hand
        dts_from_label: "Recite from",
        dts_to_label: "To",
        dts_from_placeholder: "e.g. Surah Al-Baqarah, Ayah 1",
        dts_to_placeholder: "e.g. Surah Al-Baqarah, Ayah 10",
        dts_fill_both_fields_alert: "Please write both the “from” and “to” text before adding the question.",
        dts_remove_btn: "Remove",
        dts_save_draft_btn: "Save as Draft",
        dts_save_ready_btn: "Save as Ready",
        dts_ready_validation_error: "Each of the 3 rounds needs at least one complete main question before saving as “Ready”. You can save as a draft and finish it later.",
        dts_saved_draft_toast: "Test saved as a draft 📝",
        dts_saved_ready_toast: "Test saved and marked ready ✅",
        dts_reuse_hint: "These names are just an initial default — you can reuse the same test with other students later via “Start Match” in the list.",
        dts_start_match_modal_title: "Start a New Match",
        dts_start_match_confirm_btn: "🚀 Start",
        dts_start_match_cancel_btn: "Cancel",
        dts_play_screen_soon: "The live play screen is still being built 🛠️ — your test is saved safely and will work with it once ready.",
        dts_choose_both_students_alert: "Please choose both students first.",
        dts_same_student_alert: "The two competitors must be different students.",

        // 🌟 [New] The test editor is now 3 sequential steps instead of one long page showing
        // all rounds at once. Step 1: competitors + each round's range (surah name only).
        // Step 2: pick which round to prepare now (3 big buttons). Step 3: add the chosen
        // round's questions and save. See goToStep in dual-test-setup.js.
        dts_step_label: "Step {n} of 3",
        dts_step1_heading: "1) Competitors & Range",
        dts_step1_hint: "Choose the surah the range starts from and the surah it ends at. You can change this later anytime from the “Edit range” button.",
        dts_step1_next_btn: "Next: Choose Round",
        dts_step2_heading: "2) Choose the Round You Want to Prepare",
        dts_step2_hint: "Pick the round you want to prepare, then press “Next” to add its questions.",
        dts_step2_back_btn: "Back to Range",
        dts_step2_next_btn: "Next: Add Questions",
        dts_step3_back_btn: "Back to Choose Round",
        dts_range_not_set: "Not set yet",
        dts_round_range_summary_label: "This round's range:",
        dts_edit_range_btn: "Edit range",

        // 🌟 [New] Live play screen dualtests/dual-test-play.js
        // 🌟 [New] Periodic autosave for the in-progress round — see the persistInProgressRound
        // comment in dual-test-play.js for the full idea
        dtp_round_restored_toast: "✅ Round progress restored after the refresh",
        dtp_round_label: "Round {n} of 3",
        // 🌟 [New — professional design] Editor step labels + rounds-won caption on the welcome screen
        dtp_vs_wins_label: "Rounds won",
        dtp_turn_now_label: "Their turn",
        dtp_board_pick_label: "Pick a question number",
        dts_step_label_1: "Competitors & range",
        dts_step_label_2: "Pick a round",
        dts_step_label_3: "Questions",
        // 🌟 [New] Round-by-round preparation
        dts_round_locked_note: "Unlocks after round {n} is played",
        dts_round_needs_prep: "Round {n} needs preparing",
        dtp_round_not_ready_label: "Round {n} has no questions yet",
        dtp_round_not_ready_btn: "Prepare round {n} now",
        dtp_start_round_btn: "Start Round",
        dtp_coin_flip_start_msg: "🎲 Who starts?...",
        dtp_coin_flip_result_msg: "Starting: {name} 🎉",
        dtp_end_round_manual_btn: "⏹️ End Round Now Manually",
        dtp_question_turn_label: "Turn: {name}",
        dtp_btn_mistake: "Log Mistake",
        dtp_btn_helper: "Hint",
        dtp_btn_swap: "Swap",
        dtp_btn_finish: "Confirm Answer",
        dtp_mistakes_count_label: "Mistakes logged for this question: {n}",
        // 🌟 [New] Each question is worth 10 points; the live expected score shows before confirming
        dtp_current_points_label: "Current score for this question: {score} of {max}",
        dtp_result_title: "Question Result",
        dtp_result_points_of_label: "Score",
        dtp_result_mistakes_label: "Mistakes",
        dtp_result_deduction_label: "Deduction",
        dtp_result_helper_label: "Used Hint",
        dtp_result_continue_btn: "Continue",
        dtp_yes: "Yes ✅",
        dtp_no: "No",
        dtp_no_swap_available_alert: "No swap code is available in this round right now.",
        dtp_swap_modal_title: "Choose a Swap Question Code",
        dtp_swap_modal_desc: "This time only — pick any available code.",
        dtp_summary_title: "Round {n} Result",
        dtp_winner_label: "Round winner: {name} 🏆",
        dtp_tie_label: "Round tied 🤝",
        // 🌟 [جديد] Redesigned round-result screen keys (see renderRoundSummary)
        dtp_summary_winner_caption: "🏆 Winner of this round",
        dtp_summary_tie_caption: "🤝 No winner this round",
        dtp_summary_tie_big: "Round tied",
        dtp_summary_diff_label: "By {n} points 🔥",
        dtp_summary_card_winner_flag: "🏆 Winner",
        dtp_summary_points_unit: "points",
        dtp_summary_series_title: "Match progress",
        dtp_summary_round_pending: "Round {n}: not played yet",
        dtp_summary_round_tied: "Round {n}: tied",
        dtp_summary_round_won_by: "Round {n}: {name}",
        dtp_summary_stats_title: "Round stats",
        dtp_summary_stat_mistakes: "Mistakes",
        dtp_summary_stat_helper: "Helper",
        dtp_summary_stat_swap: "Swap",
        dtp_summary_used_yes: "Used ✔️",
        dtp_summary_used_no: "Not used",
        dtp_next_round_btn: "Next ▶️",
        // 🌟 [جديد] One round per session: end the session and resume later
        dtp_end_session_btn: "💾 End session & save progress",
        dtp_session_saved_note: "✅ This round's result is saved. The match stays saved with the same students and resumes at round {n} in a later session from: Dual Tests → ⏸️ Unfinished matches.",
        dtp_view_final_btn: "View Final Result 🏁",
        dtp_final_title: "Final Result",
        dtp_final_winner_label: "Winner: {name} 🏆🎉",
        dtp_final_tie_label: "Champions' Tie 🤝",
        dtp_final_rounds_label: "Rounds won: {n}",
        dtp_final_points_label: "Total points: {n}",
        dtp_final_back_btn: "Back to Home",
        // 🌟 [New] Opens the full match report from the final result screen, also reused for
        // each row in the "Past Matches" modal (dual-test-setup.js) — see
        // reports/dual-test-report.js. This key was already referenced in dual-test-play.html
        // (data-i18n="dtp_view_report_btn") but was missing here — now fixed.
        dtp_view_report_btn: "View Match Report",
        // 🌟 [New] Badges/achievements system — see BADGE_CATALOG in engine/dualTestEngine.js
        dtp_new_badges_title: "🎖️ New Badges!",
        badge_first_duel_name: "First Duel 🥇",
        badge_first_duel_desc: "This student's first completed dual test",
        badge_perfect_name: "Perfect Performance 🌟",
        badge_perfect_desc: "Won all 3 rounds with zero mistakes in the whole match",
        badge_no_swap_name: "No Swap 💎",
        badge_no_swap_desc: "Won the whole match without using the swap right in any round",
        badge_streak_name: "Win Streak 🔥",
        badge_streak_desc: "Reached 3 consecutive wins (or a multiple of it) across matches",
        dtpa_no_badges_yet: "No badges yet — the first completed dual test will change that! 🎯",
        home_quickview_title: "Today's Tasks",
        home_bday_today: "It's {name}'s birthday today",
        home_mastery_avg_label: "Overall average mastery",
        home_mastery_avg_sub: "Based on the latest evaluations",
        home_mastery_no_data: "Not enough data yet",
        home_reports_count_label: "Evaluations & reports issued this month",
        // 🌟 New: spaced-repetition system (Anki/Duolingo) — "due today" list
        home_due_title: "Due for review today",
        // 🌟🌟 [New] Collapsed summary line shown above the detailed list (requested
        // by the teacher to shorten the "Quick Overview" card) — clicking it toggles
        // the list below. See renderDueForReview in components/homeQuickview.js
        home_due_badge: "📚 {n} due for review today",
        home_due_no_range: "No memorization range on file",
        home_due_overdue_by: "Overdue by",
        home_due_days_unit: "day(s)",
        home_due_today: "Today",
        // 🌟🌟 [New] "Matches waiting to resume" reminder on the home screen — see
        // renderPendingDualMatchesReminder in components/homeQuickview.js
        home_pm_title: "⏰ Matches Waiting to Resume",
        // 🌟🌟 [New] Collapsed summary line (same idea as home_due_badge above)
        home_pm_badge: "⏰ {n} matches waiting to resume",
        home_pm_paused_since: "Paused for",
        // 🌟 New: monthly reminder to update students' memorization data (home banner)
        home_memo_reminder_text: "Time to review and update each student's memorization range for anyone who's progressed this month 📖",
        home_memo_reminder_btn: "Update Now",
        home_memo_reminder_notif_title: "📖 Monthly Reminder: Update Memorization Data",
        home_memo_reminder_notif_body: "Review each student's memorization range (from - to) and update it for anyone who progressed this month",

        // Games (Adult & Kids) HTML
        eval_path: "Comprehensive Evaluation Path",
        exit_game: "🚪 Exit and End",
        game_fs_enter: "⛶ Full screen",
        game_fs_exit: "🗗 Exit full screen",
        // 🌟 [New] Confirmation message before exiting an evaluation session that already has
        // recorded answers — mirrors the confirm() used in dualtests/dual-test-play.js when
        // leaving a live match, to prevent losing a whole evaluation with one accidental click.
        // 🌟 [Updated] now mentions the new "Save & continue later" button as an alternative to losing answers
        exit_game_confirm_msg: "You've recorded answers in this session that haven't been saved yet. Leaving now will lose them permanently (to continue later, press “⏸️ Save & continue later” instead of exiting). Leave anyway?",
        // 🌟 [New] "Save & continue later" for a student's test — see components/pausedSession.js
        pause_game_btn: "⏸️ Save & continue later",
        pause_confirm_msg: "Do you want to save this test and continue it later? Your answers will be kept and the test will close now.",
        pause_nothing_yet: "Answer at least one question first, then you can save the test and continue it later.",
        pause_replace_confirm: "This student already has a saved unfinished test. Saving this one will replace it. Continue?",
        pause_save_failed: "Couldn't save the test. Nothing was changed — you can try again.",
        pause_saved_msg: "✅ Test saved. When you select this student again, a “Resume” card will appear.",
        paused_card_title: "Unfinished test",
        paused_card_progress: "Completed {done} of {total}",
        paused_card_resume_btn: "▶️ Resume",
        paused_card_discard_btn: "🗑️ Discard",
        paused_discard_confirm: "This unfinished test will be permanently deleted and can't be resumed. (The student's previously recorded mistakes and points stay saved.) Are you sure?",
        paused_when_today: "Today",
        paused_when_yesterday: "Yesterday",
        paused_when_days: "{n} days ago",
        notes_on_q: "📝 Notes on Question",
        show_ans_match: "👁️ Show Answer for Matching",
        hide_ans: "🙈 Hide Answer",
        correct_ans_btn: "🟢 Completely Correct Answer",
        record_note_btn: "📝 Record Note",
        // 🌟 [Updated] Renamed to match the new Arabic label 🌟
        submit_next_btn: "⏭️ Done, Next Question",
        order_inst: "Click an Ayah to move it. To return it, click it in the correct order",
        correct_order: "Correct Order",
        shuffled_ayahs: "Shuffled Ayahs",
        right_page: "(Right Page)",
        left_page: "(Left Page)",
        close_zoom: "✖️ Close Zoom",
        // 🌟 [تعديل] نفس تخفيف الصياغة في النسخة العربية — بديل أهدأ لكلمة "Error" 🌟
        record_error_title: "Record a Temporary Note",
        // 🌟 [Updated] Description now references the new button name 🌟
        record_error_desc: "Record the note then click (Save & Continue Question) to keep the student on the same question.",
        err_word: "Word Needs Review",
        err_multi: "Multiple Points to Review",
        err_haraka: "Vowel/Haraka Needs Correction",
        err_forget: "Forgot Ayah",
        err_dont_know: "Didn't Know Answer",
        note_ph: "Write your manual note here (optional)...",
        // 🌟 [Updated] Was "Add Note & Continue Reciting" — renamed to match the Arabic label 🌟
        add_err_cont: "➕ Save & Continue Question",
        hint_btn: "💡 Hint",
        kids_club: "🎈 Little Champions Club",
        kids_order_inst: "Click the word to move it and form the correct Ayah! 👆",
        correct_ayah: "Correct Ayah",
        shuffled_words: "Shuffled Words",

        // 🌟 [جديد] "Link the ayah's beginning to its ending" game (adults' and kids' corners)
        link_inst: "Tap a verse's beginning in the first column, then tap its correct ending in the second column to connect them",
        link_starts_title: "Verse Beginnings",
        link_ends_title: "Verse Endings",
        // 🌟 عناوين اللعبة الديناميكية من محرك الأسئلة (quranEngine.generateLinkGame) — نفس
        // أسلوب باقي عناوين الألعاب في المنصة (النص العربي نفسه هو المفتاح)، لكننا أضفنا لها
        // ترجمة إنجليزية فعلية هنا التزاماً بقاعدة دعم اللغتين لكل نص جديد
        "🔗 اربط أول الآية بآخرها": "🔗 Link the Beginning of the Ayah to Its Ending",
        "اربط بداية الآية بنهايتها يا بطل 🔗": "Link the ayah's beginning to its ending, champ! 🔗",
        "🔗 ربط الآيات": "🔗 Link the Ayahs",

        // 🌟 [قديم — غير مُستخدَمة حالياً] "Order the Surahs" game (replaced below by "Link the
        // Word to Its Surah") — kept without deleting as a precaution
        order_surahs_inst: "Tap a surah's name to move it. To return it, tap it in the correct order",
        shuffled_surahs: "Shuffled Surahs",
        "📚 رتب السور": "📚 Order the Surahs",
        "رتب السور يا بطل 📚": "Order the surahs, champ! 📚",

        // 🌟 [إعادة تصميم] "Link the Word to Its Surah" game — replaces "Order the Surahs" above
        link_word_surah_inst: "Tap a word from the first column, then tap the name of the surah it appears in from the second column",
        link_word_surah_starts_title: "Words from the Quran",
        link_word_surah_ends_title: "Surah Names",
        "🔗📖 اربط الكلمة بالسورة": "🔗📖 Link the Word to Its Surah",
        "اربط الكلمة بسورتها يا بطل 🔗📖": "Link the word to its surah, champ! 🔗📖",
        "اربط الكلمة بسورتها 🔗📖": "Link the word to its surah 🔗📖",

        // 🌟 [جديد] عناوين بقية أسئلة/ألعاب المنصة التي كانت لسه بلا ترجمة إنجليزية فعلية — نفس
        // أسلوب النصوص أعلاه تمامًا (النص العربي نفسه هو المفتاح)، والوضع العربي يعمل تلقائيًا
        // برجوع t() للمفتاح كما هو دون أي حاجة لإضافته هنا. تغطي عناوين ألعاب واجهة الكبار
        // (engine/quranEngine.js) وركن الأطفال (engine/kidsEngine.js)، عنوان جولة "علاج الخطأ
        // السابق" المشترك بينهما، وتصنيفات الأنشطة (typeLabel) في تقارير واجهة الكبار فقط
        // (games/adultGame.js) — ركن الأطفال يستخدم questionTitle نفسه كتصنيف فلا يحتاج مفاتيح
        // إضافية له 🌟

        // عناوين ألعاب واجهة الكبار (engine/quranEngine.js)
        "الذاكرة البصرية للمصحف 📖": "Visual Memory of the Mushaf 📖",
        "استدعِ الآية التي تحتوي على الكلمات 🏹:": "Recall the ayah containing these words 🏹:",
        "خمن السورة 🔍": "Guess the Surah 🔍",
        "ماذا بعدها؟ ⬅️": "What comes after it? ⬅️",
        "ماذا قبلها؟ ➡️": "What comes before it? ➡️",
        "رتب الآيات يا بطل 🔀": "Order the ayahs, champ! 🔀",
        "🔀 رتب الآيات": "🔀 Order the Ayahs",
        "الآية بين آيتين ↔️": "The Ayah Between Two Ayahs ↔️",
        "🎙️ أسمعنا صوتك العذب!": "🎙️ Let us hear your beautiful voice!",
        "تسميع مقطع 🎙️": "Recite a Passage 🎙️",
        "اكتشف الخطأ 🔍": "Spot the Mistake 🔍",
        "اكتشف الخطأين 🔍": "Spot the Two Mistakes 🔍",
        "أكمل الجزء الناقص من الآية الكريمة 🧩": "Complete the Missing Part of the Noble Ayah 🧩",

        // عناوين ألعاب ركن الأطفال (engine/kidsEngine.js)
        "اختر الكلمة الناقصة يا بطل! 🎯": "Choose the missing word, champ! 🎯",
        "ماذا بعد هذه الآية يا بطل؟ ⬅️": "What comes after this ayah, champ? ⬅️",
        "رتب كلمات الآية يا بطل 🧩": "Order the ayah's words, champ! 🧩",
        "صح أم خطأ؟ 🚦": "True or False? 🚦",
        "خمن السورة يا بطل! 🌟": "Guess the surah, champ! 🌟",
        "بأي آية تبدأ هذه السورة؟ 🏁": "Which ayah does this surah start with? 🏁",
        "استخرج الكلمة الزائدة الخاطئة! 🚫": "Find the wrong extra word! 🚫",
        "ماذا قبل هذه الآية؟ ➡️": "What comes before this ayah? ➡️",

        // عنوان جولة "علاج الخطأ السابق" (مشترك بين واجهة الكبار وركن الأطفال)
        "تحدي تصحيح الخطأ السابق": "Previous Mistake Correction Challenge",
        "علاج الخطأ السابق": "Fixing the Previous Mistake",

        // تصنيفات الأنشطة (typeLabel) في سجل تقارير واجهة الكبار (games/adultGame.js)
        "تحدي علاج الخطأ": "Mistake-Fixing Challenge",
        "نشاط": "Activity",
        "🏹 صيد الآية": "🏹 Catch the Ayah",
        "⬅️ ماذا بعدها؟": "⬅️ What Comes After It?",
        "➡️ ماذا قبلها؟": "➡️ What Comes Before It?",
        "↔️ الآية بين آيتين": "↔️ The Ayah Between Two Ayahs",
        "🔍 خمن السورة": "🔍 Guess the Surah",
        "🎙️ تسميع مقطع": "🎙️ Recite a Passage",
        "🔍 اكتشف الخطأ": "🔍 Spot the Mistake",
        "🧩 أكمل الآية": "🧩 Complete the Ayah",
        "📖 الذاكرة البصرية": "📖 Visual Memory",

        // Reports HTML
        report_title: "Quranic Evaluation Report",
        report_subtitle: "Mastery & Skill Measurement System",
        student_label: "👤 Student:",
        eval_label: "📖 Evaluation:",
        date_label: "📅 Date:",
        time_taken: "Time Taken",
        answered_qs: "Answered Questions",
        edu_analysis: "📊 Educational Skill Analysis",
        measured_skill: "Measured Skill",
        mastery_level: "Mastery Level",
        strengths_title: "🌟 Main Strengths:",
        weaknesses_title: "📈 Needs Review:",
        error_recorded_on: "Recorded on:",
        // 🌟 [New] Question header on the "Fix previous mistake" screen + notice for old, unrecoverable records 🌟
        weak_q_label: "Question:",
        weak_q_legacy: "Old mistake: it was recorded before question details were saved, so the original question can't be recovered. Ask the student about this ayah in whatever form you prefer.",
        // 🌟 [New] Pinpoint where the mistake happened (from ayah ... to ayah ...) in recitation questions —
        // see components/reciteRangePicker.js
        recite_range_title: "📍 Exact mistake location (optional)",
        recite_range_desc: "Select the ayahs where the mistake happened so the exact spot shows when fixing the mistake later.",
        recite_range_from: "From",
        recite_range_to: "to",
        recite_range_any: "— Not specified —",
        recite_range_ayah: "Ayah",
        recite_range_label: "Mistake location:",
        recite_range_q_prefix: "Recite",
        recite_range_surah: "Surah",
        recite_range_start_from: "Start from the verse:",
        recite_range_end_at: "Until the verse:",
        archive_title: "Corrected Mistakes Archive",
        archive_desc: "A complete record of every past mistake the student has corrected, with the date it happened and the date it was fixed.",
        archive_empty: "No archive yet 🎉",
        archive_resolved_on: "Resolved on:",
        detailed_log: "📝 Detailed Log (Current Session Questions & Notes)",
        seq: "#",
        activity_ayah: "Activity / Ayahs",
        ans_status_note: "Answer Status & Note",
        note_title: "Note:",
        note_body1: "This evaluation doesn't just measure oral memorization; it measures accuracy, recall speed, ayah ordering, linkage, and distinguishing similarities to build a strong Quranic memory.",
        note_body2: "This evaluation is specific to these questions or the selected Surah range.",
        teacher_sig: "Quran Teacher:",
        upload_stamp: "Upload Stamp / Signature",
        remove_stamp: "Remove Stamp",
        print_rep: "🖨️ Save Report (PDF)",
        send_wa: "💬 Send to Parent",
        open_profile: "📊 Open Student Profile",
        back: "🔙 Back",

        // 🌟 Homework System Additions 🌟
        hw_management_title: "Homework Management System",
        hw_header_subtitle: "Ham Platform — Teacher Dashboard",
        hw_published_now: "Published Now 🚀",
        hw_draft_status: "Drafts 📝",
        // 🌟🌟 [Updated] Replaced hw_total_submissions (a card stuck at "0" — nothing ever updated
        // it) with an active "Needs Grading" card: a real count from the cloud, clickable to jump
        // straight to the homework history tab
        hw_needs_grading: "Needs Grading ✍️",
        // 🌟 Small badge label shown next to any homework in the history table that has a
        // submission still waiting for manual grading
        hw_needs_grading_row_badge: "Needs Grading",
        // 🌟 Tooltip (title) for the "Needs Grading" card — set dynamically from JS, not via data-i18n
        hw_needs_grading_tooltip: "Click to go to homework history 📊",
        // 🌟 [New] Small always-visible hint inside the card itself (not a hover-only tooltip)
        // making its clickability obvious — important on tablet/mobile where hover doesn't
        // exist, so it stays clear this card (unlike its two neighbors) is actionable
        hw_needs_grading_hint: "Tap for details ›",
        hw_btn_new: "➕ Create New Homework",
        hw_btn_history: "📊 Homework History",
        hw_desc: "Select the range to generate questions. You can edit them or add manual questions.",
        hw_assign_student: "👤 Assign to specific student (Optional):",
        hw_general_link: "-- General Link (All Students) --",
        // 🌟 New: name search inside the "assign to specific student" list
        hw_student_search_placeholder: "🔍 Search for a student name...",
        hw_student_search_noresult: "No student with this name",
        hw_general_btn: "🌐 General link for all students",
        hw_or_specific: "Or assign to a specific student:",
        hw_hint_general: "The student will type their own name when opening the link.",
        hw_hint_student: "The homework opens under this student's name; they don't type it.",
        // 🌟 New: auto-suggested range based on the student's registered memorization
        hw_memo_suggestion_prefix: "🌟 Quick suggestions based on this student's registered memorization:",
        hw_memo_suggestion_recent_prefix: "🌟 Last {n} surahs from this student's registered memorization:",
        // 🌟 New: special suggestion chip for the "whole Juz Amma" case (instead of surah-by-surah)
        hw_memo_suggestion_juz_amma: "Whole Juz Amma (Part 30)",
        // 🌟 New: Juz Amma surah-coverage note (components/juzAmmaCoverageNote.js)
        juz_amma_coverage_note: "This range has {total} surahs and this test covers {n} of them. The remaining surahs will come in upcoming tests. Raise the number of questions to cover them all in one session.",
        juz_amma_coverage_btn: "Make it {total} questions",
        hw_btn_generate: "⚙️ Auto-Generate Questions",
        hw_review_q: "🔍 Review Questions",
        hw_add_manual_q: "➕ Add Manual Question",
        hw_publish_btn: "🚀 Approve & Publish",
        hw_draft_btn: "📝 Save as Draft",
        hw_history_title: "Created Homeworks History",
        hw_created_date: "Creation Date",
        hw_q_type: "Questions & Type",
        hw_status: "Status",
        hw_actions: "Actions",
        hw_btn_back_home: "🔙 Back to Home",
        hw_modal_q_title: "Add/Edit Question",
        hw_q_type_label: "Question Type:",
        hw_q_title_label: "Question Title:",
        hw_q_text_label: "Question Text / Ayah:",
        hw_q_options_label: "Available Options (separated by new line):",
        hw_q_correct_label: "Correct Answer:",
        hw_save_q_btn: "Save Question",
        hw_cancel_btn: "Cancel",
        hw_share_success: "Saved Successfully! 🎉",
        hw_share_desc: "Copy the following link and send it via WhatsApp to your students to start the challenge:",
        // 🌟 New: warning shown in the share modal only if the cloud upload failed
        hw_cloud_sync_warning: "⚠️ The homework was saved on this device, but uploading it to the cloud failed just now (check your internet connection). This link will only work on this device until it's re-uploaded — it's best not to send it to students yet. It will retry automatically once your connection returns or when you reopen this screen, or you can press the retry button below now.",
        // 🌟🌟 New: button shown only next to the warning above — retries uploading this
        // homework right away (see retryHomeworkCloudSync in settings/homework-prep.js)
        hw_retry_sync_btn: "🔄 Retry Now",
        // 🌟🌟 New: small badge next to any published homework in the history table that is
        // still stuck locally and hasn't reached the cloud yet (see isHomeworkPendingSync in
        // core/firebase.js)
        hw_pending_sync_row_badge: "Not uploaded to cloud yet",
        // 🌟🌟 New — Phase 2: banner shown on a homework's results screen when one or more
        // student submissions failed to upload and are still stuck on the student's own device
        // — see getPendingSubmissionsCountForHomework in core/firebase.js. {n} = the count.
        hw_pending_submissions_banner: "{n} submission(s) from students who finished this homework haven't reached the cloud yet (still stuck on the student's device). They'll arrive automatically once that device is back online.",
        // 🌟🌟 [جديد — دمج نظام الواجبات الجديد] مفاتيح الخادم الجديد وشاشة الطالب وبوابة المعلم
        hw_err_network: "Could not reach the internet or the server.",
        hw_err_timeout: "The connection took too long. Check your internet and try again.",
        hw_err_bad_response: "The server reply was not understood. Try again shortly.",
        hw_err_unauthorized: "Your homework-system session ended. Reopen the homework system and sign in with Google again.",
        hw_err_not_found: "This homework does not exist. Make sure the link is complete and correct.",
        hw_err_closed: "This homework is closed and no longer accepts submissions.",
        hw_err_already: "This homework was already submitted with this name.",
        hw_err_busy: "The server is busy. Try again in a moment.",
        hw_err_not_persisted: "The server could not confirm saving the data. Try again.",
        hw_err_ungraded: "Some manual questions still have no score.",
        hw_err_conflict: "This submission was changed elsewhere. Refresh and try again.",
        hw_err_generic: "Unexpected error",
        // 🌟 [new] startup failure screen (pre-launch audit)
        boot_fail_quran_title: "Could not load the Quran text",
        boot_fail_quran_body: "The app needs the internet on first launch to download the Quran text once. Check your connection and try again.",
        boot_fail_generic_title: "Could not start the platform",
        boot_fail_generic_body: "An error occurred while starting. Try reloading; if it persists, close other tabs of the platform and try again.",
        boot_fail_retry: "Retry",
        // 🌟 [pre-launch audit fix] dual-test report keys (previously undefined and rendered as raw key names)
        dtr_teacher_data_label: "Teacher details",
        dtr_teacher_name_placeholder: "Teacher name",
        dtr_upload_signature_btn: "Upload signature",
        dtr_export_label: "Export",
        dtr_png_btn: "High-quality image",
        dtr_pdf_btn: "PDF file",
        dtr_home_btn: "Back to home",
        dtr_note_label: "Note to parent (optional):",
        dtr_note_placeholder: "Write your note to the parent here — if left empty, an automatic comment based on the match result is shown.",
        dtr_note_hint: "Shown in the \"Teacher's note\" box below",
        dtr_eyebrow: "🆚 Match report — Dual tests",
        dtr_total_points_sub: "Total points",
        dtr_ladder_title: "📊 Rounds ladder",
        dtr_rounds_detail_title: "📋 Round details — every question as it actually happened",
        dtr_note_box_label: "Teacher's note to the parent",
        dtr_footer_auto_line: "Automatic match report, approved by the teacher",
        dtr_sign_label: "Teacher's signature",
        dtr_default_teacher_label: "Teacher",
        dtr_export_error_alert: "Could not export the report:",
        dtr_invalid_image_alert: "Please choose a valid image file.",
        dtr_signature_upload_error: "Could not upload the signature.",
        dtr_busy_label: "Preparing...",
        dtr_points_unit: "pts",
        dtr_question_unavailable: "Question unavailable",
        dtr_mistakes_deduction: "Mistakes: {n} (deduction {d})",
        dtr_no_mistakes: "No mistakes",
        dtr_helper_used_tag: "Helper used",
        dtr_swap_tag: "Swap question",
        dtr_qcol_empty: "No recorded questions for {name}",
        dtr_qcol_questions_of: "{name}'s questions",
        dtr_round_summary_mistakes: "Mistakes: {a} / {b}",
        dtr_round_summary_helper: "Helper: {a} / {b}",
        dtr_round_summary_swap: "Swap: {a} / {b}",
        dtr_auto_note_tie: "The match between {a} and {b} ended in a tie ({pa} - {pb} points). An evenly matched performance — well done to both.",
        dtr_auto_note_win: "{winner} won the match against {loser} (rounds {wr} - {lr}, {diff} points apart). Well done to both students — keep up the care for the Book of Allah.",
        header_home_btn: "Home",
        hw_publish_failed: "❌ Homework was NOT published (the server did not confirm saving). No link was created.",
        hw_link_check_failed: "❌ Could not verify the link.",
        hw_link_check_late_failed: "⚠️ The homework is published, but we could not confirm the link opens for students. Try opening it yourself before sending.", // 🌟
        hw_results_load_error: "⚠️ Could not load results:",
        hw_legacy_row_badge: "Old homework",
        hw_grade_save_btn: "💾 Save scores & approve result",
        hw_grade_saved: "✅ Final result approved: {score}%",
        hw_grade_failed: "❌ Grading was not saved.",
        hw_grade_record_saved: "And added to the record of student \"{name}\".",
        hw_grade_record_failed: "⚠️ Result approved on the server but could not be written to the student record on this device.",
        hw_grade_record_skipped: "Result was not added to any student record (you can link it later).",
        stu_login_name_required: "Please type or choose the student's name first!",
        stu_name_required: "Name is required!",
        stu_name_duplicate: "A student with this same name already exists; add something to tell them apart (a letter or number) so their records don't get mixed up.",
        stu_saved_ok: "Saved successfully!",
        nsc_title: "{name} has been registered successfully 🎉",
        nsc_question: "What would you like to start with?",
        nsc_kids_btn: "🧒 Kids' games",
        nsc_adults_btn: "🧑 Adults' games",
        nsc_back_btn: "Back to My Students",
        stu_edited_ok: "Updated ✔️",
        stu_delete_confirm: "⚠️ Warning: are you sure you want to permanently delete this student's data and record?",
        stu_screen_preparing: "Preparing this screen 🛠️",
        hw_ambiguous_student_confirm: "{n} students named \"{name}\" exist in your records. Link this result to the first one? (Cancel = approve without linking to any student record)",
        hw_create_student_confirm: "No student named \"{name}\" in your records. Create them and add the result to their record?",
        hwcert_title: "Certificate of Appreciation 🏅",
        hwcert_logo_alt: "Ham platform logo",
        hwcert_number_label: "Certificate No.",
        hwcert_granted_to: "This certificate is awarded to",
        hwcert_tier_name_excellent: "Excellent",
        hwcert_tier_name_good: "Very good",
        hwcert_tier_name_average: "Good",
        hwcert_tier_name_weak: "Keep going",
        hwcert_verse: "﴿ And recite the Quran with measured recitation ﴾",
        hwcert_verse_ref: "Al-Muzzammil: 4",
        hwcert_teacher_label: "Teacher",
        hwcert_date_label: "Date",
        hwcert_subtitle: "Ham Platform for Retaining & Reviewing Memorization", // 🌟 نفس صياغة splash_subtitle
        hwcert_score_label: "Final Score",
        hwcert_tier_excellent: "🌟 Outstanding performance! Keep shining, you're a role model for your classmates.",
        hwcert_tier_good: "👏 Very good work! A big step towards mastery, keep up the effort.",
        hwcert_tier_average: "💪 A good start — with more review you'll reach excellence, God willing.",
        hwcert_tier_weak: "🌱 Every attempt you learn from is real progress — don't give up, we're with you.",
        hwcert_mistakes_title: "📝 Points to review",
        hwcert_no_mistakes: "🎉 No mistakes at all — perfect answers on every question!",
        hwcert_correct_answer_label: "Correct answer:",
        hwcert_save_btn: "💾 Save as image",
        hwcert_share_btn: "📲 Send via WhatsApp",
        hwcert_close_btn: "Close ✖️",
        hwcert_share_unsupported_note: "The certificate image was downloaded — attach it manually in a WhatsApp chat with the student.",
        hwcert_save_failed: "❌ Could not generate the certificate image. Try again.",
        hwcert_default_student: "Student",
        // 🌟 [جديد] optional teacher note box in the grading room + shown on the certificate
        hw_teacher_note_label: "A word from the teacher to the student (optional)",
        hw_teacher_note_placeholder: "Write an encouraging or guiding note to appear on the certificate…",
        hw_teacher_note_hint: "Optional — if left empty, nothing extra appears on the certificate. Max 300 characters.",
        hw_grade_wrong: "Wrong",
        hwcert_teacher_note_title: "💬 A word from the teacher",
        // 🌟 Homework scope on the certificate (filled from the real scope recorded with the homework)
        hwcert_scope_title: "📖 Homework scope",
        hwcert_scope_surah: "Surah {surah} — verse {from} to verse {to}",
        hwcert_scope_range: "From Surah {from} to Surah {to}",
        hwcert_scope_juz: "Juz {juz}",
        // 🌟 Delete homework: centered confirmation dialog + "student has not solved it" alert (no automatic sending)
        hw_delete_confirm_title: "Delete homework",
        hw_delete_confirm_body: "Are you sure you want to permanently delete this homework?",
        hw_delete_confirm_btn: "Yes, delete",
        hw_delete_cancel_btn: "Cancel",
        hw_delete_q_title: "Delete question",
        hw_delete_q_body: "Are you sure you want to delete this question from the homework?",
        hw_overdue_not_solved: "{name} has not solved the homework yet",
        hw_final_results_btn: "🎓 Students' Final Results",
        hw_final_results_title: "🎓 Graded Tests & Final Results",
        hw_final_results_empty: "No approved results yet.",
        hw_final_results_load_error: "⚠️ Could not load final results:",
        hw_final_results_view_cert_btn: "🏅 View Certificate",
        hw_final_results_close_btn: "Close Window ✖️",
        hw_copy_msg_title: "📚 Homework",
        hw_copy_msg_student_label: "👤 Student:",
        hw_copy_msg_link_label: "🔗 Link:",
        hw_copy_msg_footer: "Please open the link and solve the homework, then press \"Submit\" when you finish ... wishing you the best of luck 🌟",
        hw_notif_new_submission_title: "🔔 New homework submission",
        hw_notif_new_submission_body: "{name} just submitted their homework.",
        hw_notif_many_body: "You received {n} new submissions.", // 🌟 grouped desktop notification
        hw_notif_unknown_student: "A student",
        hw_st_legacy_link: "This is an old homework link and no longer works. Ask your teacher for a new one.",
        hw_st_loading: "⏳ Loading homework...",
        hw_st_nothing_submitted: "Nothing has been submitted yet.",
        hw_st_retry_load: "🔄 Try again",
        hw_st_welcome_prefix: "Welcome, champion",
        hw_st_name_label: "Write your full name so your homework reaches your teacher:",
        hw_st_name_placeholder: "e.g. Ahmed Mohamed",
        hw_st_name_required: "Please write your name (at least 2 letters) first.",
        hw_st_play_load_error: "Could not open the homework screen. Reload the page.",
        hw_st_incomplete_data: "Homework data is incomplete. Go back to the link and try again.",
        hw_st_hero_prefix: "Student:",
        hw_st_offline_banner: "📴 No internet connection. Your answers are saved on your device and will be sent automatically when the connection returns.",
        hw_st_storage_banner: "⚠️ Your browser does not allow saving answers on the device (maybe private mode). Do not close the page before receipt is confirmed.",
        hw_st_retry_btn: "🔄 Resend now",
        // 🌟 [new 2026-10-02] Duplicate name: ask the student to change it instead of discarding the answers
        hw_st_dup_title: "This name is already used",
        hw_st_dup_text: "Another student already submitted this homework with the same name. Your answers are saved and not lost — write your full name (e.g. your name and your father's name) and press send.",
        hw_st_dup_label: "Your full name",
        hw_st_dup_btn: "📨 Send with the new name",
        hw_st_dup_same: "Please change the name first — it is the same registered name.",
        hw_st_close_btn: "✖️ Close page",
        hw_st_badge_confirmed: "✅ Reached your teacher",
        hw_st_badge_pending: "⏳ Sending",
        hw_st_badge_failed: "⚠️ Not delivered yet",
        hw_st_badge_rejected: "❌ Rejected",
        hw_st_confirmed_title: "Your homework reached your teacher!",
        hw_st_confirmed_text: "Homework submitted successfully ✅",
        hw_st_confirmed_note: "Your teacher will review your answers and tell you the result.",
        hw_st_pending_title: "Sending your homework...",
        hw_st_pending_text: "Wait a moment and do not close the page.",
        hw_st_failed_title: "Your homework has not arrived yet",
        hw_st_failed_text: "Your answers are saved on your device, but sending did not finish.",
        hw_st_failed_note: "We will retry automatically, or tap \"Resend now\". Do not clear browser data.",
        hw_st_rejected_title: "Submission not accepted",
        hw_st_reason: "Reason:",
        hw_st_receipt: "Receipt no.:",
        hw_st_confirmed_at: "Confirmed at:",
        hw_st_attempts: "Attempts:",
        teacher_auth_title: "Homework system sign-in",
        teacher_auth_subtitle_google: "Only the homework system needs Google sign-in, so your homework, students and results are saved to your account and reachable from your phone or computer. The rest of the platform needs no sign-in.",
        teacher_auth_google_error: "Couldn't load Google sign-in. Check your internet, then reopen the homework system. (The rest of the platform works as usual.)",
        teacher_auth_cancel_btn: "Cancel",
        teacher_auth_loading: "Verifying...",
        teacher_auth_error_network: "Could not reach the server. Check your internet and try again.",
        // 🌟 [new 2026-10-01] precise messages when the server rejects Google sign-in — every error used to look like "could not reach the server"
        teacher_auth_error_wrong_app: "The Google sign-in was issued for a different app. Refresh the page and try again.",
        teacher_auth_error_expired: "Your Google sign-in expired. Press the Google button and try again.",
        teacher_auth_error_busy: "The server is busy right now. Wait a moment and try again.",
        teacher_auth_error_server: "The server returned an error while signing in. Please try again shortly.",
        teacher_auth_error_server_outdated: "The deployed homework server is still an old version that restricts sign-in to an email list. Deploy the new backend/Code.gs (or delete the TEACHER_EMAILS script property). The rest of the platform is not affected.",
        teacher_auth_error_unverified: "This Google account has no verified email. Use another Google account.",
        hw_copy_btn: "📋 Copy",
        hw_close_return: "Close",
        // 🌟 [New 2026-10-01] Homework history action labels + copy-link message + "Start here" home card
        hw_act_results: "Results", hw_act_link: "Copy link", hw_act_delete: "Delete", hw_act_publish: "Publish",
        // 🌟 [New 2026-10-01 — homework history redesign]
        hw_hero_title: "Create new homework", hw_hero_sub: "Pick the surah and verses, questions are generated automatically, then share the link with the student",
        hw_act_grade_now: "Needs grading", hw_act_remind: "Remind student", hw_act_more: "More actions",
        hw_filter_all: "All", hw_filter_published: "Published", hw_filter_draft: "Draft", hw_filter_grading: "Needs grading", hw_filter_overdue: "Overdue",
        hw_search_ph: "Search by student name", hw_filter_empty: "No matching homework.",
        hw_remind_msg: "Peace be upon you {name}, a reminder about your homework on Ham. Homework link:",
        // 🌟 [New 2026-10-01 — automatic cleanup]
        hw_cleanup_title: "🧹 Automatic cleanup:",
        hw_cleanup_body: "A homework that has been graded and approved is deleted automatically, together with its submissions and certificates, 20 days after its last submission was approved, and only if all of its submissions are approved. A homework nobody submitted is deleted 14 days after it was created. A homework that is waiting for your grading is never deleted. Save the certificate as an image before deletion if you want to keep it; students' scores recorded in their records are kept.",
        hw_stale_alert: "This homework has been waiting for your grading for {days} days", hw_stale_ok: "OK",
        hw_link_copied: "Link copied ✅",
        hw_draft_publish_empty: "This draft has no questions.",
        home_start_title: "Start here 👋",
        home_start_body: "You haven't registered any student yet. Add your first student to start evaluating and following homework.",
        home_start_btn: "➕ Add your first student",
        hw_subs_modal_title: "📊 Students Results & Submissions",
        hw_sub_student: "Student Name",
        hw_sub_date: "Submission Date",
        hw_sub_score: "Score",
        hw_close_window: "Close Window ✖️",
        hw_submitting: "⏳ Submitting...",
        hw_submitted_success: "✅ Submitted",

        // Homework Welcome & Play
        hw_student_welcome_title: "New Quranic Challenge! 🎯",
        hw_student_welcome_subtitle: "Your teacher sent you a special mission.. Are you ready to prove your skills?",
        hw_student_welcome_msg: "Welcome to the Mastery Challenge:",
        hw_student_who_are_you: "Tell us who you are to record your score:",
        hw_student_select_ph: "-- Select your name here --",
        hw_student_start_btn: "🚀 Start the Challenge!",
        hw_student_cancel_btn: "✖️ Not ready now (Return)",
        hw_champion_prefix: "Student:",
        hw_earned_score: "Earned Score:",
        hw_feedback_excellent: "Excellent performance! 🌟",
        hw_feedback_good: "Good job, you can do even better! 👍",
        hw_feedback_needs_work: "You need more review and memorization 💪",
        hw_finish_title: "Evaluation Sent! 👋",
        hw_finish_desc: "You can safely close this page (window) now.",

        // 🌟 "What's New" screen — static UI text only; the changelog items themselves
        // are bilingual data in core/version.js, not keys here 🌟
        whats_new_title: "✨ What's New",
        whats_new_close_btn: "Got it 👍",
        whats_new_version_prefix: "Version",
        whats_new_cat_new: "New",
        whats_new_cat_improved: "Improved",
        whats_new_cat_fixed: "Fixed",

        // 🌟 [New] Monthly backup reminder modal — shown automatically once, the first time
        // the teacher opens the platform in a new calendar month on this device
        // (localStorage only, no cloud sync, same philosophy as dh_last_seen_version in
        // core/app.js). See checkMonthlyBackupReminder in core/app.js and
        // core/backupRestore.js for the full mechanism 🌟
        backup_reminder_title: "🗄️ Monthly Backup Reminder",
        backup_reminder_body: "It's been a month since you last backed up your students' data. It's best to download a fresh backup now and keep it on your device for emergencies.",
        backup_reminder_download_btn: "⬇️ Download Now",
        backup_reminder_later_btn: "Later",
        backup_export_error: "Couldn't create the backup. Please try again.",
        backup_export_success: "Backup downloaded successfully ✅",

        // 🌟 [New] "Monthly Achievement Report" screen — aggregates homework + dual tests +
        // resolved mistakes + spaced-review consistency over a full month (see
        // reports/monthly-report.js) 🌟
        monthly_report_btn: "📅 Monthly Achievement Report",
        mr_title: "Monthly Achievement Report",
        mr_eyebrow: "Ham Platform · Quran Memorization",
        mr_teacher_group_label: "Teacher Info",
        mr_teacher_name_ph: "Teacher name",
        mr_upload_sig_btn: "Upload signature",
        mr_export_group_label: "Export",
        mr_export_png: "High-quality image",
        mr_export_pdf: "PDF file",
        mr_export_whatsapp: "WhatsApp copy",
        mr_export_whatsapp_hint: "An image sized for sending directly on WhatsApp (smaller file, sharp on phones)",
        mr_export_whatsapp_suffix: "whatsapp",
        // 🌟 [new] Monthly report "Moon Phases" identity (reports/monthly-report.identity.js)
        mr2_brand_sub: "Heroes of the Quran",
        mr2_eyebrow: "Monthly report for parents",
        mr2_hero_overall: "Overall achievement this month",
        mr2_hero_new_memo: "new ayahs this month",
        mr2_summary_title: "This month's phases",
        mr2_summary_sub: "Each phase shows the mastery level of that indicator",
        mr2_legend_title: "How to read the moon phases",
        mr2_lvl_full: "Excellent", mr2_lvl_gibbous: "Advanced", mr2_lvl_quarter: "Progressing", mr2_lvl_crescent: "Just starting",
        mr2_moon_full: "Full", mr2_moon_gibbous: "Gibbous", mr2_moon_quarter: "Quarter", mr2_moon_crescent: "Crescent",
        mr2_plan_title: "Next month's plan",
        mr2_plan_chip_review: "More review", mr2_plan_chip_new: "New ayahs", mr2_plan_chip_tajweed: "Master tajweed",
        mr2_plan_text: "A new month begins, {name}! Let's aim to review as much as we can of what you've memorized, learn new ayahs, God willing, and master the tajweed rules. With perseverance and dua you'll reach your goals — and we're with you every step.",
        mr2_footer_bless: "May God bless your efforts and make the Quran the spring of your hearts",
        mr2_period_range: "{a}–{b} {m}",
        mr2_hijri_suffix: "AH",
        mr2_memo_scope_fmt: "from {from} to {to}",
        mr2_scope_label: "Memorization range:",
        mr_auto_note_open_warm: "Peace be upon you, dear parent of {name} —",
        mr_auto_note_close_warm: "Barakallahu feek, {name} — may God increase you in diligence and success.",
        mr_note_tone_label: "Auto-note tone:",
        mr_note_tone_formal: "Formal",
        mr_note_tone_warm: "Warm",
        mr_back_btn: "Back to student profile",
        mr_month_label: "Month:",
        mr_year_label: "Year:",
        mr_auto_refresh_hint: "The report updates automatically when you change the month/year",
        mr_note_label_input: "Note for the parent (optional):",
        mr_note_placeholder: "Write your note for the parent here — leave it empty to show an automatic summary based on this month's activity.",
        mr_note_hint: "Shown in the \"Teacher's note\" box below",
        mr_meta_teacher: "Teacher:",
        mr_meta_generated: "Generated on:",
        mr_summary_title: "Month Summary",
        mr_summary_sub: "A quick overview of the student's activity this month",
        mr_homework_section_title: "Homework this month",
        mr_homework_section_sub: "Every homework the student submitted this month, with its final approved score",
        mr_dual_section_title: "Dual tests this month",
        mr_dual_section_sub: "Every completed dual-test match the student played this month",
        mr_achv_section_title: "New achievements and badges this month",
        mr_errors_section_title: "Mistakes resolved this month",
        mr_review_section_title: "Spaced review consistency",
        mr_note_box_label: "Teacher's message to the parent",
        mr_footer_line1: "Ham Platform · Interactive Quran Review",
        mr_teacher_sign_label: "Teacher's signature",
        mr_tile_homework_avg: "Average homework score",
        mr_tile_homework_count: "Homework submitted: {n}",
        mr_tile_dual_results: "Dual tests record (W–L–T)",
        mr_tile_dual_sub: "This month",
        mr_tile_errors_resolved: "Mistakes resolved",
        mr_tile_errors_sub: "Fixed this month",
        mr_tile_achievements: "New badges",
        mr_tile_achievements_sub: "From dual tests",
        mr_homework_empty: "No homework was submitted this month.",
        mr_dual_empty: "No completed dual tests this month.",
        mr_achv_empty: "No new badges this month.",
        mr_errors_empty: "No recorded mistakes were resolved this month.",
        // 🌟 [New] "Mistakes challenge" summary inside the monthly report's mistakes section
        mr_fix_sessions: "Fix sessions",
        mr_fix_resolved: "Mistakes resolved",
        mr_fix_new: "Mistakes recorded this month",
        mr_fix_remaining: "Remaining now",
        // 🌟 [New] "Fix previous mistakes on login" flow with two-review confirmation
        // (components/fixErrorsPrompt.js)
        fixp_title: "Previous mistakes are waiting to be fixed 🛠️",
        fixp_body: "{name} has {n} previously recorded mistake(s) that need fixing or a second review to lock them in. It's best to start with them, then move on to the games.",
        fixp_body_kids: "Hey {name}, you have {n} old mistake(s) to review together! Let's lock them in, then play 🎈",
        fixp_start_btn: "🛠️ Start fixing now",
        fixp_later_btn: "Later — go to the games",
        fixp_sum_title: "Fix session complete 🎉",
        fixp_sum_line_correct: "You got {correct} of {total} right.",
        fixp_sum_line_done: "{resolved} locked in for good.",
        fixp_sum_line_confirm: "{pending} will be reviewed a second time next visit to lock them in.",
        fixp_sum_line_left: "{remaining} left to try later.",
        fixp_sum_continue_btn: "➡️ Go to the games",
        fixp_none_due: "No mistakes are due for fixing right now — the rest are waiting for their second review on a later day.",
        fixp_prof_start: "🛠️ Fix mistakes ({n})",
        fixp_prof_waiting: "⏳ Awaiting second review ({n})",
        mr_review_never: "No spaced review has been recorded for this student yet.",
        mr_reviewed_this_month: "Reviewed this month ✓",
        mr_not_reviewed_this_month: "Last review wasn't within this month",
        mr_review_last: "Last review:",
        mr_review_last_score: "scored",
        mr_review_next: "Next due:",
        mr_table_col_date: "Date",
        mr_table_col_homework: "Homework",
        mr_table_col_score: "Score",
        mr_table_col_opponent: "Opponent",
        mr_table_col_rounds: "Rounds",
        mr_table_col_result: "Result",
        mr_table_col_location: "Location",
        mr_surah_prefix: "Surah",
        mr_win: "Win",
        mr_loss: "Loss",
        mr_tie: "Tie",
        mr_loading: "Loading this month's data…",
        mr_exporting: "Preparing…",
        mr_export_error: "An error occurred while exporting",
        mr_invalid_image: "Please choose a valid image file for the signature.",
        mr_no_student_selected: "No student selected to show a report for.",
        mr_default_teacher_label: "Teacher",
        mr_default_student_label: "Student",
        mr_no_memo_range: "Memorization range not registered",
        mr_hw_untitled: "Untitled homework",
        mr_hw_not_signed_in: "Homework results appear here after signing in with Google inside the homework system on this device.",

        // 🌟 [New] Monthly memorization journey + monthly comparison in the monthly report —
        // see reports/monthly-report.js and engine/memorizationEngine.js
        mr_journey_section_title: "This Month's Memorization Journey",
        mr_journey_section_sub: "Where the student's memorization started and ended this month",
        mr_journey_begin_label: "Start of month",
        mr_journey_end_label: "End of month",
        mr_journey_new_label: "New memorization this month",
        mr_journey_no_data: "The student's memorization position has not been recorded for this month yet.",
        mr_journey_no_ending_yet: "The start-of-month position was recorded, but the end-of-month position hasn't been recorded yet.",
        mr_tile_new_memo: "New memorization",
        mr_tile_new_memo_sub: "ayahs this month",
        mr_compare_section_title: "Monthly Comparison",
        mr_compare_section_sub: "An actual comparison between this month and the previous month",
        mr_trend_section_title: "Memorization Trend Over Months",
        mr_trend_section_sub: "Cumulative new memorization over the last recorded months",
        mr_trend_total_label: "Total for this period",
        mr_compare_no_data: "Not enough data is available for the previous month to show a comparison.",
        mr_compare_col_indicator: "Indicator",
        mr_compare_col_prev: "Previous month",
        mr_compare_col_current: "Current month",
        mr_compare_col_change: "Change",
        mr_compare_row_memo: "New memorization (ayahs)",
        mr_compare_row_gameeval: "Individual evaluations",
        mr_compare_row_gameeval_avg: "Average individual evaluation score",
        mr_auto_note_memo_journey: "{name} memorized {n} new ayah(s) this month.",
        mr_auto_note_memo_journey_warm: "Well done! {name} memorized {n} new ayah(s) this month 🌱",

        // 🌟 [New] The two "record monthly memorization position" windows (start/end of month) —
        // see components/monthlyMemorizationPrompt.js
        mmp_beginning_title: "Record Memorization Position — Start of Month",
        mmp_beginning_desc: "Set the student's last memorized position at the start of this month (surah and last memorized ayah).",
        mmp_ending_title: "Record Memorization Position — End of Month",
        mmp_ending_desc: "Set the student's last memorized position at the end of this month — the system will calculate the number of new ayahs automatically.",
        mmp_student_label: "Student: {name}",
        mmp_surah_label: "Surah",
        mmp_ayah_label: "Last memorized ayah",
        mmp_ayah_range_hint: "From 1 to {max}",
        mmp_cancel_btn: "Later",
        mmp_confirm_btn: "Confirm",
        mmp_next_btn: "Next",
        mmp_invalid_ayah: "Invalid ayah number for this surah, please check.",
        mmp_confirm_screen_title: "Confirm New Memorization",
        mmp_warning_backward: "The end position appears to be before the start position according to the student's memorization direction (from the end of the Quran to its beginning). Please review the entered data and go back to correct it.",
        mmp_new_ayahs_label: "Calculated new memorization",
        mmp_ayahs_unit: "ayahs",
        mmp_back_btn: "Back to edit",
        mmp_confirm_save_btn: "Confirm and save",
        mr_cloud_error: "Could not reach the cloud to fetch homework scores — check your internet connection and try again.",
        mr_auto_note_hw: "{name} submitted {n} homework assignments this month with an average score of {avg}%.",
        mr_auto_note_hw_warm: "{name} put in lovely effort on {n} homework assignment(s) this month, averaging {avg}% 👏",
        mr_auto_note_dual: "Played dual tests with a record of {w} win(s), {l} loss(es), and {t} tie(s).",
        mr_auto_note_dual_warm: "Enjoyed a few dual tests this month: {w} win(s), {l} loss(es), {t} tie(s) — every round is a chance to learn 💪",
        mr_auto_note_errors: "{n} previously recorded mistake(s) were resolved.",
        mr_auto_note_errors_warm: "{n} earlier weak spot(s) were worked through, alhamdulillah ✨",
        mr_auto_note_empty: "No activity (homework or dual tests) was recorded for {name} this month.",
        mr_auto_note_empty_warm: "A quiet month for {name} on homework and tests — looking forward to more activity next month, in shaa Allah 🌙",
        mr_auto_note_memo: "Student's currently registered memorization range: {scope}.",
        mr_auto_note_memo_warm: "Keep it up, champ! Your current memorization range: {scope} 🌟",

        // 🌟 [New] Individual game-room evaluations (adults/kids) inside the monthly report —
        // see persistEvaluationToHistory in games/adultGame.js/kidsGame.js and the data-sources
        // note at the top of reports/monthly-report.js 🌟
        hist_eval_default_range: "Evaluation session",
        mr_gameeval_section_title: "Game-room evaluations this month",
        mr_gameeval_section_sub: "Every individual evaluation session (adults/kids) the student played this month",
        mr_gameeval_empty: "No individual evaluation session (adults/kids) was recorded this month — sessions played before this tracking was added don't appear here.",
        mr_tile_gameeval_avg: "Average game-room evaluation score",
        mr_tile_gameeval_count: "Sessions: {n}",
        mr_source_adult: "Adults room",
        mr_source_kids: "Kids corner",
        mr_table_col_range: "Range",
        mr_table_col_section: "Section",
        mr_auto_note_gameeval: "{name} played {n} individual game-room evaluation session(s) this month with an average score of {avg}%.",
        mr_auto_note_gameeval_warm: "{name} played {n} game-room evaluation session(s) this month, averaging {avg}% — lovely progress 🌟",

        // 🌟 [جديد بالكامل] "Listen and Guess the Ayah" game (kids corner only)
        kids_listen_title: "Listen and Guess the Ayah, Champ! 🎧",
        kids_listen_audio_error: "Couldn't play the audio — check your internet connection and try again 🌐",
        // 🌟 [New] Second step of "Listen and Guess the Ayah": after picking the right ayah,
        // the child is asked which surah it's from — see generateKidsListenAyah in
        // engine/kidsEngine.js
        kids_listen_which_surah: "🕌 Which surah is this ayah from?",
        kids_listen_wrong_ayah_error: "Picked the wrong ayah",
        kids_listen_wrong_surah_error: "Got the ayah right, but the surah wrong",

        // 🌟 [New] Inline editing of the student profile screen (no separate modal) —
        // see setupInlineProfileEditing in student/student.js
        prof_edit_hint: "💡 Click any info to edit it directly, then use the \"Monthly Achievement Report\" button to print once you're done",
        prof_avatar_change_title: "Change photo",

        // 🌟 [New] "Student welcome card" — see the matching Arabic block above for the full
        // rationale comment (components/welcomeBanner.js)
        welcome_hello: "Welcome",
        welcome_back_line: "Good to have you back 🌟",

        // 🌟 [New] "Section hints on first entry" system — see the matching Arabic block above
        // for the full rationale comment; English strings mirror the teacher-approved Arabic
        // wording in meaning, not a literal word-for-word translation
        hint_ok_btn: "Alright, got it 👍",

        // 🌟 [New 2026-10-02] "Guided Tour" strings (components/guidedTour.js) — replace the general /
        // homework_prep / dual_test_setup hints above. Names mirror the actual UI labels.
        tour_btn_next: "Next",
        tour_btn_prev: "Back",
        tour_btn_finish: "Finish",
        tour_btn_skip: "Skip tour",
        tour_btn_start: "Start tour",
        tour_btn_skip_welcome: "Skip",
        tour_welcome_title: "Welcome to Ham 👋",
        tour_welcome_body: "Let us quickly show you the key parts of the platform.",
        tour_done: "Well done! The tour is over, and you can start using the platform now.",
        tour_restart_btn: "🧭 Restart guided tours",
        acct_section_title: "🔐 Google account (homework)",
        acct_current_prefix: "Current email: ",
        acct_signed_in_unknown: "Signed in with a Google account",
        acct_not_signed_in: "Not signed in with Google on this device",
        acct_change_btn: "🔁 Change email",
        acct_signin_btn: "🔐 Sign in with Google",
        acct_signout_btn: "🚪 Sign out",
        acct_change_confirm: "You will be signed out so you can pick another Google account.\n\nNote: each account has its own separate homework and results; this account's homework won't appear under the new one, but it stays saved and returns when you sign back in with it.\n\nContinue?",
        acct_signout_confirm: "Sign out of the Google account on this device? Your homework stays saved and returns when you sign in again.",
        tour_restart_done: "Tours reset. They will appear when you open each section.",
        tour_home_name: "Your name as a teacher appears here on the platform.",
        tour_home_students: "Add your students here and follow their records.",
        tour_home_kids: "Enter the activities and games track made for children.",
        tour_home_adults: "Enter the activities track made for adults.",
        tour_home_homework: "Create homework here, send it to students, and review the results.",
        tour_home_dual: "Enter the Dual Tests system from here.",
        tour_home_contact: "Reach us from here whenever you need help or have a question.",
        tour_install_title: "Install the platform on your computer 💻",
        tour_install_addressbar: "Open Ham as a standalone app in one click: press the install icon ⊕ in the browser's address bar at the top (next to the star), then choose \"Install\".",
        tour_install_safari: "Open Ham as a standalone app: from the \"File\" menu at the top of the screen, choose \"Add to Dock\".",
        tour_install_btn: "⬇ Install now",
        tour_students_add: "Register a new student here — only the name is required, everything else is optional.",
        tour_students_intro: "This is \"My Students\": manage all your students' records and monthly follow-up here.",
        tour_students_all: "General students record: a list of all your students — open any student's file, edit their details, or export/import a backup.",
        tour_students_stats: "A quick summary: how many students you have, who still needs their monthly memorization recorded, and how many reports you exported this month.",
        tour_students_monthly_memo: "Record monthly memorization for all students at once: \"where did each student stop?\", one student after another. The number on the card is how many are waiting for you.",
        tour_students_reports: "Monthly reports: type the student's name and pick the month, then send the report to the parent via WhatsApp or print it as PDF.",
        tour_students_back: "This arrow takes you back to the main menu.",
        tour_kids_intro: "This is the Kids Corner: the games and activities track for children.",
        tour_adults_intro: "This is the Adults Interface: the evaluation and activities track for adults.",
        tour_login_search: "Type any part of the student's name, then pick it from the list.",
        tour_login_start: "After choosing the student, press here to go to the evaluation panel.",
        tour_dash_type: "Choose the evaluation type: a specific surah, several surahs, or by juz.",
        tour_dash_start: "Press here to start the evaluation.",
        tour_kdash_scope: "Choose the surahs the games are built from, and the number of games.",
        tour_hw_new: "Start preparing a new homework from here.",
        tour_hw_assign: "Keep it a \"general link for all students\", or assign it to a specific student.",
        tour_hw_config: "Pick the surah and verses (or several surahs, or a juz), and the number of questions.",
        tour_hw_generate: "Press \"Auto-Generate Questions\", review them, then \"Approve & Publish\".",
        tour_hw_share: "Once published, the homework appears in the history; press \"Copy link\" and send it to the student.",
        tour_hw_history: "Here is your homework history and the status of each one.",
        tour_hw_grading: "Homework with new student answers waiting for you shows up here; open \"Results\" or \"Needs grading\" next to it to review answers, grade, and show the result.",
        tour_hw_final: "Approved scores and appreciation certificates are here.",
        tour_dual_new: "Prepare a new dual test from here: pick the competitors and each round's range, then save it.",
        tour_dual_saved: "Saved tests are here: start a match with \"Start Match\", and find the results under \"Past Matches\".",

        hint_general_title: "🌟 Welcome to Ham",
        hint_general_body: "Welcome, Sheikh. We are pleased to welcome you to the Ham platform for memorizing, reviewing, and evaluating the Holy Quran. From the home screen you can open the Adults Interface or the Kids Corner for direct evaluation, manage your students' records from My Students, and send and track homework, in addition to the Similarities Challenge and the Dual Tests. Each section will show you its own notes the first time you open it.\nIf you would like to suggest an idea, please do not hesitate to contact us.",

        hint_login_title: "Welcome, Sheikh 👋",
        hint_login_body: "Before you can start any evaluation, please add at least one student's name from the My Students section. You can then select them from this screen and begin.",
        hint_login_action_btn: "Go to My Students now ➕",
        login_name_not_found_alert: "This name is not registered. Make sure it is spelled correctly, or add it first from My Students.",

        hint_adult_game_title: "⚠️ Notice before starting the evaluation",
        hint_adult_game_body: "If the student uses the Hint 💡 button on the \"preceding verse\" question, two points out of ten are deducted.\nArranging all the verses of a question completely wrong on the first attempt deducts two points, and a second wrong attempt deducts four points.\nThe Record Note 📝 button is not a punishment — it records the weak point in the student's file so you can return to it later and address it.",
        hint_adult_game_ok_btn: "Alright, let's begin 🚀",

        // 🌟 [Important] Deliberately no mention of the "Hint" feature here — the hint button in
        // the kids corner exists only visually in games/kidsGame.html with no working logic yet
        hint_kids_game_title: "🎈 Notice before starting the game",
        hint_kids_game_body: "If the student arranges all the verses completely wrong on the first attempt, two points out of ten are deducted, and a second wrong attempt deducts four points.\nThe Record Note 📝 button is not a punishment — it is a simple reminder of a point that needs review, so we can come back to it together and practice it later.",
        hint_kids_game_ok_btn: "Alright, let's begin 🎈",

        hint_homework_title: "📚 Notice before preparing homework",
        hint_homework_body: "You can assign the homework to a specific student from the \"Assign homework to a specific student\" field, or leave it as a general link reachable by all your students. After the questions are generated automatically, you can review and edit them or add manual questions before approving publication. The \"Needs Grading ✍️\" card at the top of the screen also takes you directly to any submission still awaiting your review.",

        hint_dual_test_title: "🆚 Notice about the Dual Tests",
        hint_dual_test_body: "The test is prepared through a three-step wizard: choosing the two competitors and the range for each round, then selecting the round, then adding its questions. During play, the Swap 🔄 button gives one alternative question per round only, and the Help 💡 button records that the student used their one-time right to your verbal assistance during the round without a direct deduction, while the actual deduction is calculated from the number of mistakes recorded on each question (half a point per mistake out of ten).",

        hint_similarities_title: "🧩 Notice before starting the Similarities Corner",
        hint_similarities_body: "The purpose of this corner is to introduce the student to similar verses and make them easier to memorize, not to formally evaluate the student. The answer is corrected as soon as it is chosen, and if wrong, the correct answer is shown immediately, without a final score or a note being recorded in the student's file.",
        // 🌟 [New] Individual evaluation report — new design (reports/report.js)
        rep_tb_teacher_data: "Teacher details",
        rep_tb_teacher_name_ph: "Teacher name",
        rep_tb_upload_stamp: "Upload teacher stamp",
        rep_tb_export: "Export",
        rep_tb_png: "Summary image",
        rep_tb_pdf: "Full PDF file",
        rep_tb_home: "Back to evaluation panel",
        rep_tb_note_label: "Note to the parent (optional):",
        rep_tb_note_ph: "Write your own note to the parent here — if left empty, an automatic comment based on the test result is shown.",
        rep_tb_note_hint: "Appears in the \"Teacher's note\" box below",
        rep_tb_extra_label: "Extra text inside the report (optional):",
        rep_tb_extra_ph: "Any additional text you would like inside the report — leave it empty if you do not need it.",
        rep_tb_extra_hint: "Appears as a separate box, and is hidden entirely if left empty",

        rep_eyebrow: "Ham Platform · Quran Memorization",
        rep_title: "Student Progress Report",
        rep_subtitle: "In memorizing the Holy Quran",
        rep_tagline: "Step by step ... towards the Book of Allah",

        rep_avatar_hint: "Click or drag an image to change the student's photo",
        rep_avatar_change: "Change student photo",

        rep_fact_grade: "Grade",
        rep_fact_scope: "Evaluation range",
        rep_fact_duration: "Evaluation duration",

        rep_this_eval: "This evaluation's result",
        rep_delta_vs_prev: "vs. the previous attempt",
        rep_delta_same: "same as the previous attempt",

        rep_ladder_title: "Overall progress level",
        rep_ladder_sub: "This evaluation compared with the student's latest recorded attempts",
        rep_ladder_no_regular: "No previous regular evaluations in the student's history yet — mistake-fixing sessions are not part of this ladder.",
        rep_ladder_first_attempt: "This is the first attempt recorded in the student's history — the comparison with previous attempts will appear from the next evaluation onwards.",
        rep_step_current: "This evaluation",
        rep_step_prev1: "Previous attempt",
        rep_step_prev2: "The one before",
        rep_step_prev3: "Oldest attempt",
        rep_step_prev_generic: "Earlier attempt",

        rep_qtable_title: "Test details — question by question",
        rep_qtable_sub: "Every question asked in this test exactly as it happened, with nothing omitted",
        rep_col_num: "#",
        rep_col_status: "Response",
        rep_col_subject: "Question / Topic",
        rep_col_score: "Score",
        rep_col_note: "Note",
        rep_no_questions: "No question details are available for this evaluation.",

        rep_chip_full: "Fully correct",
        rep_chip_partial: "Partially correct",
        rep_chip_wrong: "Incorrect",

        rep_stat_avgtime: "Average answer time",
        rep_stat_hints: "Hints used",
        rep_stat_reorders: "Repeated ordering attempts",

        rep_strengths: "Strengths",
        rep_needs: "Needs focus",
        rep_note_label: "Teacher's note to the parent",
        rep_extra_label: "Additional note",

        rep_report_no: "Report no.",
        rep_date: "Date",
        rep_sign_label_stamp: "Teacher's stamp",
        rep_sign_label_plain: "Teacher",

        // 🌟 [Fix] Keys for the redesigned "Needs focus" box — they were used via t()
        // in reports/report.js but never defined, so the raw key names were printed
        // inside the parent-facing report.
        report_focus_group_today: "Mistakes in today's test",
        report_focus_group_partial: "Needs reinforcement today",
        report_focus_group_past: "Follow-up from earlier sessions",
        report_focus_repeated: "Repeated mistake",
        // 🌟 [New] Why a correct answer was logged as a mistake to fix (wrong ordering attempt / hint used) 🌟
        weak_origin_reorder: "Wrong ordering attempt before the correct answer",
        weak_origin_hint: "Used a hint to reach the answer",
        report_focus_not_resolved: "not resolved yet",
        report_note_focus_past_prefix: "an earlier item:",
        report_focus_more_one: "more item",
        report_focus_more_two: "more items",
        report_focus_more_few: "more items",
        report_focus_more_many: "more items",
        report_focus_age_today: "today",
        report_focus_age_day1: "yesterday",
        report_focus_age_day2: "2 days ago",
        report_focus_age_since: "",
        report_focus_age_unit_few: "days ago",
        report_focus_age_unit_many: "days ago",

        // ============================================================
        // 🌟 [New] "Tajweed Heroes" screens — Phase 1 (catalog + static browsing)
        // ============================================================
        tjw_home_title: "Tajweed Heroes",
        tjw_home_subtitle: "Choose a student's name to begin their Tajweed learning journey",
        tjw_no_students: "No students registered yet — add a student first from 'My Students'",
        tjw_pick_label: "Select the student's name from the list or type to search",
        tjw_start_journey_btn: "Start the Journey 🚀",
        tjw_pick_name_required_alert: "Please type or select the student's name first!",
        tjw_browsing_intro: "You're browsing the Tajweed cards with {name} 🌟",
        tjw_change_student: "Change Student",
        tjw_rule_not_found: "This rule could not be found",
        tjw_example_unavailable: "Could not load the Quranic example right now (check your internet connection)",
        tjw_listen_btn: "Listen to the Ayah",
        tjw_ayah_word: "Ayah",
        tjw_letters_label: "Letters:",
        tjw_example_source_note: "A real example from the Quran — shown directly from the platform's actual Quran engine",
        tjw_reveal_btn: "I noticed it, what does it mean? 🤔",
        tjw_browse_badge: "Browsing Available",

        tjw_stage_qalqalah_name: "Qalqalah",
        // 🌟🌟 [New Sep 28 — content deepened from "Futuhat Al-Rahman" reference book] two new
        // stages + Idgham split into two rules — see the full documentation comment in
        // tajweedRulesCatalog.js
        tjw_stage_meem_noon_mushaddadah_name: "Ghunnah of Doubled Meem & Noon",
        tjw_stage_meem_sakinah_name: "Meem Sakinah",
        tjw_stage_noon_sakinah_name: "Noon Sakinah & Tanween",

        // 🌟🌟 [Sept 28 — Minor/Major merged into one rule, see tajweedRulesCatalog.js comment]
        tjw_rule_qalqalah_name: "Qalqalah",
        tjw_rule_qalqalah_def: "A Qalqalah letter (ق ط ب ج د) has two cases: minor (silent mid-word, sound rebounds gently) and major (end of word when stopping on it, sound rebounds and vibrates more strongly)",
        tjw_rule_qalqalah_notice: "Listen to the qaaf in 'Qul' mid-word (a gentle rebound), then compare it to the qaaf at the end of 'al-Falaq' when stopping on it (a stronger rebound)",

        // 🌟 Ghunnah of doubled Meem/Noon — one simple rule, no sub-cases, taught first (before
        // Meem/Noon Sakinah rules) in the reference book
        tjw_rule_ghunna_wajiba_name: "Ghunnah of Doubled Meem & Noon",
        tjw_rule_ghunna_wajiba_def: "Any doubled meem or noon (مّ or نّ) is pronounced with a full nasal hum for the duration of two harakat",
        tjw_rule_ghunna_wajiba_notice: "Listen to 'Amma' — can you hear a nasal hum stretching through the doubled meem?",

        // 🌟 The three Meem Sakinah rules (from the reference book)
        tjw_rule_ikhfa_shafawi_name: "Labial Ikhfa (Ikhfa Shafawi)",
        tjw_rule_ikhfa_shafawi_def: "When Meem Sakinah is followed by the letter baa, it is concealed with a nasal hum for two harakat — a state midway between clear and merged",
        tjw_rule_ikhfa_shafawi_notice: "Listen to 'tarmeehim bihijaarah' — can you hear a light hum instead of a clear meem before the baa?",

        tjw_rule_idgham_shafawi_name: "Labial Idgham (Meem into Meem)",
        tjw_rule_idgham_shafawi_def: "When Meem Sakinah is followed by a moving meem, the two merge into one doubled meem with a full nasal hum",
        tjw_rule_idgham_shafawi_notice: "Listen to 'lahum maghfiratun' — can you hear one doubled meem instead of two separate meems?",

        tjw_rule_izhar_shafawi_name: "Labial Izhar (Izhar Shafawi)",
        tjw_rule_izhar_shafawi_def: "When Meem Sakinah is followed by any letter other than baa or meem, it is pronounced clearly from its articulation point with no extra nasal hum",
        tjw_rule_izhar_shafawi_notice: "Listen to 'alayhim ghayri' — can you hear the meem pronounced clearly with no hum at all?",

        tjw_rule_izhar_name: "Clear Pronunciation (Izhar)",
        tjw_rule_izhar_def: "When Noon Sakinah or Tanween is followed by one of the six throat letters, the noon is pronounced clearly with no change",
        tjw_rule_izhar_notice: "Listen to the noon in 'min khawf' — do you hear it pronounced clearly, unchanged?",

        // 🌟🌟 [Explicit split instead of one "Idgham" rule — see the documentation note next to
        // noon_sakinah in tajweedRulesCatalog.js for why] the old tjw_rule_idgham_* keys were
        // removed — no real student data referenced them yet
        tjw_rule_idgham_bighunnah_name: "Idgham with Nasalization",
        tjw_rule_idgham_bighunnah_def: "When Noon Sakinah or Tanween is followed by one of the letters (ي ن م و), the noon fully merges into the next letter while a full nasal hum is kept for two harakat",
        tjw_rule_idgham_bighunnah_notice: "Listen to 'man ya'mal' — can you hear the noon merge into the yaa with a lingering hum?",

        tjw_rule_idgham_bila_ghunnah_name: "Idgham without Nasalization",
        tjw_rule_idgham_bila_ghunnah_def: "When Noon Sakinah or Tanween is followed by the letters (ل ر), the noon fully and quickly merges into them with no nasal hum at all",
        tjw_rule_idgham_bila_ghunnah_notice: "Listen to 'hudal-lilmuttaqeen' — can you hear a quick merge with no hum at all?",

        tjw_rule_iqlab_name: "Iqlab (Conversion)",
        tjw_rule_iqlab_def: "When Noon Sakinah or Tanween is followed by the letter baa, the noon converts into a hidden meem sound with a nasal tone",
        tjw_rule_iqlab_notice: "Listen to 'aleemun bidhaatis-sudoor' — can you hear a light meem sound instead of the noon before the baa?",

        tjw_rule_ikhfa_name: "Ikhfa (Concealment)",
        tjw_rule_ikhfa_def: "When Noon Sakinah or Tanween is followed by one of the remaining letters, the noon is pronounced midway between clear and merged, with a nasal tone",
        tjw_rule_ikhfa_notice: "Listen to 'min sijjeel' — can you hear a light nasal tone instead of a clear noon?",

        // 🌟 [New — Phases 2+3+4+5] progress map, mandatory review gate, interactive
        // activities, result screen, badges, leaderboard, and student-profile section
        tjw_review_gate_alert: "You have a review due first — finish it before opening a new rule 🔔",
        tjw_leaderboard_title: "Tajweed Heroes",
        tjw_stage_locked_note: "Complete the previous stage first to unlock this one 🔒",
        tjw_link_activity_btn: "Match rules to their letters",
        tjw_challenge_btn: "Stage challenge",
        tjw_review_due_banner: "You have {n} rule(s) due for review before opening a new one",
        tjw_start_review_btn: "Start review now",
        tjw_status_mastered: "✅ Mastered",
        tjw_status_needs_review: "🔁 Needs review",
        tjw_status_in_progress: "⏳ In progress",
        tjw_status_available: "Not started yet",
        tjw_start_practice_btn: "Start practicing",
        tjw_lb_progress_week: "Most progress this week",
        tjw_lb_review_streak: "Longest daily review streak",
        tjw_lb_latest_badge: "Latest new badge earned",
        tjw_lb_sessions_unit: "session(s)",
        tjw_lb_days_unit: "day(s)",
        tjw_lb_empty: "Not enough data yet",

        tjw_activity_title: "🎯 Interactive activity",
        tjw_activity_error: "Couldn't prepare this activity, please try again",
        tjw_act_choose_prompt: "Which rule applies to these silent letters?",
        tjw_act_discover_prompt: "Which word in this ayah has the rule you just learned?",
        tjw_act_apply_prompt: "Apply what you learned: which word in this new ayah has the same rule?",
        tjw_act_link_prompt: "Match each rule to its correct letters",
        tjw_question_label: "Question",
        tjw_finish_activity_btn: "Finish activity",
        tjw_next_question_btn: "Next question",
        tjw_rule_mastered_note: "You mastered this rule! 🎉",
        tjw_stage_completed_note: "You completed this whole stage! The next stage is now unlocked",
        tjw_next_rule_btn: "Next rule",
        tjw_correct_answers_unit: "correct",
        tjw_retry_activity_btn: "Try again",
        tjw_back_to_map_btn: "Back to map",

        // 🌟🌟 [New Sept 28] teacher checkpoint gate "Listen to me" — pronounces dimension
        tjw_start_checkpoint_btn: "Listen to me",
        tjw_awaiting_checkpoint_note: "The student is academically ready for this rule — only your direct listening check remains to confirm mastery",
        tjw_checkpoint_prompt: "Listen to the student recite these two ayahs, then rate each criterion carefully",
        tjw_checkpoint_generic_criterion: "Pronounced the rule correctly and clearly",
        tjw_checkpoint_rate_yes: "Fully mastered",
        tjw_checkpoint_rate_partial: "Partially mastered",
        tjw_checkpoint_rate_no: "Needs more practice",
        tjw_checkpoint_note_placeholder: "Optional note about the student's performance...",
        tjw_checkpoint_submit_btn: "Submit assessment",
        tjw_checkpoint_incomplete_alert: "Please rate every criterion before submitting",

        tjw_badge_first_step_name: "First step",
        tjw_badge_first_step_desc: "The first activity you played in Tajweed Heroes",
        tjw_badge_first_mastery_name: "First mastery",
        tjw_badge_first_mastery_desc: "You fully mastered your first tajweed rule",
        tjw_badge_stage_master_qalqalah_name: "Qalqalah Hero",
        // 🌟🌟 [New Sep 28] two badges for the two new stages — see TAJWEED_BADGE_CATALOG in tajweedEngine.js
        tjw_badge_stage_master_meem_noon_mushaddadah_name: "Ghunnah Hero",
        tjw_badge_stage_master_meem_sakinah_name: "Meem Sakinah Hero",
        tjw_badge_stage_master_noon_sakinah_name: "Noon Sakinah Hero",
        tjw_badge_stage_master_desc: "You mastered every rule in this stage",
        tjw_badge_perfect_challenge_name: "Perfect performance",
        tjw_badge_perfect_challenge_desc: "You answered a stage challenge or review with zero mistakes",
        tjw_badge_review_streak_name: "Dedicated reviewer",
        tjw_badge_review_streak_desc: "You reviewed for at least 3 days in a row",
        tjw_badge_five_rules_name: "Five rules",
        tjw_badge_five_rules_desc: "You mastered five tajweed rules",
        tjw_badge_all_rules_name: "Crown of mastery",
        tjw_badge_all_rules_desc: "You mastered every rule currently available",
        tjw_badge_no_mistakes_name: "No mistakes",
        tjw_badge_no_mistakes_desc: "You answered every question in an activity correctly",
        tjw_badge_comeback_name: "Strong comeback",
        tjw_badge_comeback_desc: "You reviewed a rule that needed review and succeeded",
        tjw_badge_daily_practice_name: "Regular practice",
        tjw_badge_daily_practice_desc: "You practiced Tajweed on 5 different days",
        tjw_badge_ten_sessions_name: "Ten sessions",
        tjw_badge_ten_sessions_desc: "You completed ten Tajweed activity sessions",
        tjw_badge_quick_learner_name: "Quick learner",
        tjw_badge_quick_learner_desc: "You mastered a rule in just two attempts",

        tjw_profile_section_title: "Tajweed Journey 🏆",
        tjw_profile_no_progress: "This student hasn't started the Tajweed Heroes journey yet",
        tjw_profile_current_stage: "Current stage",
        tjw_profile_mastered_count: "Rules mastered",
        tjw_profile_badges_empty: "No Tajweed badges yet",
        // 🌟 [جديد] ترجمة نصوص محرّك أسئلة الأطفال
        kids_tf_question: "Is this ayah from Surah <span style=\"color:#0284c7;\">( {surah} )</span> ?",
        kids_choose_next_ayah: "Choose the ayah that follows it:",
        kids_surah_label: "Surah ( {name} )",
        report_first_ayah_of_surah: "First ayah of Surah {name}",
        report_extract_word: "Extracting the word {word}",
        kids_listen_instruction: "🎧 Listen carefully, then choose the ayah you heard",
        kids_listen_play_btn: "🔊 Listen to the ayah",
        // 🌟 [جديد] مستويات الإتقان
        "بانتظار أول تقييم 🎯": "Awaiting first evaluation 🎯",
        "إتقان ممتاز 🏆": "Excellent Mastery 🏆",
        "إتقان متقدم 🌟": "Advanced Mastery 🌟",
        "إتقان جيد 👍": "Good Mastery 👍",
        "إتقان متوسط ⚖️": "Average Mastery ⚖️",
        "إتقان ضعيف ⚠️": "Weak Mastery ⚠️",
        "يحتاج إلى تأسيس وتثبيت 🛠️": "Needs Foundation and Reinforcement 🛠️",
        // 🌟 [جديد] محرّك أسئلة الكبار (quranEngine)
        list_sep: ", ",
        qe_visual_question: "On which page of the Holy Mushaf does this ayah appear? (right or left?)",
        qe_page_right: "Right page",
        qe_page_left: "Left page",
        qe_tap_unblur: "(Tap the image to remove the blur)",
        qe_correct_page: "( Correct answer: {side} page )",
        qe_side_right: "right",
        qe_side_left: "left",
        qe_zoom_mushaf: "🔍 Zoom in on the Mushaf to review",
        qe_none: "None",
        qe_range_start: "Start of the range",
        qe_surah_start: "Start of the surah",
        qe_report_order_ayahs: "Ayahs (ordering): {nums}",
        qe_recite_surah_pre: "Recite Surah",
        qe_recite_surah_post: "in full",
        qe_recite_n_pre: "Recite {n} ayahs from Surah",
        qe_from_verse: "Starting from the verse:",
        qe_to_verse: "Ending at the verse:",
        qe_report_recite_full: "Reciting Surah {name} in full",
        qe_report_recite_part: "Reciting from Surah {name} ({n} ayahs)",
        qe_report_link_kids: "Linking ayah beginnings and endings: {nums}",
        qe_report_link_adult: "Linking the starts of ayahs to their ends: {nums}",
        qe_report_order_surahs: "Ordering the surahs: {names}",
        qe_report_word_surah_kids: "Linking a word to its surah: {names}",
        qe_report_word_surah_adult: "Linking words to their surahs: {names}",
        // 🌟 [جديد] شاشة لوحة التقييم
        dash_kids_play_title: "🎈 Let's Play 🎈",
        dash_choose_surah: "-- Choose the surah --",
        dash_alert_choose_surah: "Please choose the surah first!",
        dash_alert_bad_range: "The ayah range is not valid!",
        dash_juz_label: "Juz {n} {name}",
        dash_ayah_label: "Ayah {n}",
        dash_surah_option: "{n}. Surah {name}",
        dash_header_surah: "🏆 Quran Mastery Journey - Surah {name}",
        dash_header_multi: "🏆 Quran Mastery Journey - Multiple Surahs",
        dash_header_other: "🏆 Quran Mastery Journey - {label}",
        // 🌟 [جديد] نصوص شاشتَي اللعب (الأطفال والكبار)
        "لا توجد أخطاء مسجلة!": "No mistakes are recorded!",
        "جلسة علاج وتصحيح الأخطاء السابقة": "Previous mistakes treatment and correction session",
        "عفواً، لا توجد آيات في النطاق المحدد!": "Sorry, there are no ayahs in the selected range!",
        "لقد سجّلت ملاحظات مسبقاً. هل تريد إلغاءها واعتبار الإجابة صحيحة؟": "You have already recorded notes. Do you want to cancel them and mark the answer as correct?",
        "الإجابة الصحيحة:": "Correct answer:",
        "نـعـم": "Yes",
        "لا": "No",
        "ملاحظة:": "Note:",
        "حدد نوع الملاحظة أو اكتب ملاحظة أولاً!": "Select a note type or write a note first!",
        "مكان فارغ...": "Empty slot...",
        "انتهى الوقت المخصص للاختبار!": "The time allotted for the test is over!",
        "لقد سجّلت ملاحظات على هذا السؤال مسبقاً. هل أنت متأكد أنك تريد إلغاءها واعتبار الإجابة صحيحة تامة؟": "You have already recorded notes on this question. Are you sure you want to cancel them and mark the answer as fully correct?",
        "الكلمات المفقودة:": "Missing words:",
        "الخطأ السابق المسجل:": "Previously recorded mistake:",
        "الجزء": "Juz",
        "سورة": "Surah",
        "آية": "Ayah",
        game_ref_label: "( Surah {name} - Ayah {n} )",
        kids_range_text: "Kids games (from Surah {sfrom} to {sto})",
        adult_range_text: "Range (from Surah {sfrom} to {sto})",
        adult_juz_text: "Juz {n}",
        adult_surah_text: "Surah {name} (from {a} to {b})",
        adult_reduced_questions: "The number of questions was reduced to {n} to fit the size of the surah.",
        gen_note_prefix: "Note: {text}",
        // 🌟 [جديد] التقرير الفردي (report.js)
        rp_question: "Question",
        rp_loc_ayah: "Surah {name} - Ayah {n}",
        rp_loc_surah: "Surah {name}",
        rp_note_hint: "Used a hint to reach the answer",
        rp_note_reorder_many: "Needed more than one attempt to order the words correctly",
        rp_note_reorder_one: "Needed one extra attempt to order the words correctly",
        rp_note_error: "Mistake: {errors}",
        rp_note_wrong: "Incorrect answer",
        rp_dur_min_sec: "{m} min {s} s",
        rp_dur_sec: "{s} s",
        rp_strength_correct: "Correct and accurate memorization in {c} of {n} questions without any help",
        rp_strength_speed: "Average answer time {now} — faster than the average of previous attempts ({prev})",
        rp_strength_consistent: "Clear consistency in memorization across more than one question in this range, without any help",
        rp_strength_default: "Completing the whole attempt despite the difficulty of some questions is an achievement worth appreciating",
        rp_focus_default: "Continue the usual daily review to maintain this level",
        rp_tone_excellent: "Excellent",
        rp_tone_good: "Good",
        rp_tone_average: "Average",
        rp_tone_weak: "Needs extra support",
        rp_honesty_excellent: "A result that reflects real mastery of most questions in this test.",
        rp_honesty_good: "A good result that shows solid memorization of most questions, with some aspects that deserve more review and reinforcement.",
        rp_honesty_average: "An average result that shows an existing foundation that can be strengthened with more regular review.",
        rp_honesty_weak: "Performance in this test is still below the required level, which is a good opportunity to intensify review together, step by step.",
        rp_note_lead_excellent: "{name}'s performance in this test was excellent and reflected solid memorization of most questions.",
        rp_note_lead_good: "{name}'s performance was good and included correct memorization of most questions, with some points that need more review and reinforcement.",
        rp_note_lead_average: "{name}'s performance was average overall, and there are specific points that can be improved with regular review.",
        rp_note_lead_weak: "{name} made an effort in this test, but still needs extra support in some areas.",
        rp_note_focus: " We recommend focusing on: {text}.",
        rp_note_close_weak: " We are confident that close follow-up together over the coming days will make a clear difference, God willing.",
        rp_note_close_other: " And we will follow the progress together step by step.",
        rp_default_student: "Student",
        rp_default_teacher: "Teacher",
        rp_err_read_file: "Could not read the file",
        rp_err_bad_image: "The file is not a valid image",
        rp_err_pick_image: "Please choose a valid image file (JPG or PNG).",
        rp_err_load_image: "Could not load the image. Please try again with another image.",
        rp_err_load_lib: "Could not load the library: {src}",
        rp_err_export: "An error occurred during export: {msg}",
        rp_err_pick_stamp: "Please choose a valid image file for the stamp.",
        rp_err_load_stamp: "Could not load the stamp image. Please try again.",
        rp_busy: "Preparing…",
        rp_file_prefix: "Report",
        // 🌟 [جديد] رسائل أخطاء الألعاب
        "أخطأ في الاختيار": "Wrong choice",
        // 🌟 [جديد] عبارات التشجيع
        enc_1: "Masha'Allah, well done! 🌟",
        enc_2: "Champion! Keep going 🚀",
        enc_3: "Excellent! 👏",
        enc_4: "May God bless you! 💚",
        enc_5: "Well done, creative one! 🎯",
        // 🌟 [جديد] صفحة الخصوصية
        priv_title: "Privacy Policy",
        priv_sub: "Ham Platform for consolidating memorization and review",
        priv_updated: "Last updated: 27 September 2026",
        priv_intro: "The \"Ham\" platform does not collect any personal data from students or teachers by default.",
        priv_h_email: "Use of Email",
        priv_email_p: "The email address is used only when a teacher signs in, for these two purposes only:",
        priv_li1: "Keeping each teacher's data separate and secure, never mixed with another teacher's data.",
        priv_li2: "Making sure students' answers and submissions reach the correct teacher responsible for them.",
        priv_h_share: "Data Sharing",
        priv_share_p: "This email or any data linked to it is never shared with any third party, and is never used for marketing or advertising.",
        priv_contact: "For any inquiries, contact:",
        priv_footer: "© Ham",
        // 🌟 [جديد] ملف الطالب
        stu_and: " and ",
        stu_age_paren: "(Age: {n} years)",
        stu_age_years: "{n} years",
        stu_not_set: "Not set",
        stu_age_not_set: "Age not set",
        stu_grade_not_set: "Grade not set",
        stu_country_not_set: "🌍 Country not set",
        stu_phone_not_set: "📱 Phone not recorded",
        stu_hero_name: "Student: {name}",
        stu_no_errors_btn: "No recorded errors 🎉",
        stu_no_history: "No previous evaluations for this student.",
        stu_restore: "Restore student",
        stu_hide: "Hide student",
        stu_edit_data: "Edit details",
        stu_delete_final: "Delete student permanently",
        stu_errors_btn: "🛠️ Errors ({n})",
        stu_no_errors: "No errors",
        stu_loc_text: "Surah {surah}{ayah}",
        stu_loc_ayah: " - Ayah {n}",
        // 🌟 [جديد] الواجبات المنزلية
        "في أي سورة تقع هذه الآية؟": "Which surah is this ayah from?",
        "ما هي الآية التي تلي هذه الآية مباشرة؟": "Which ayah comes right after this ayah?",
        "ما هي الآية التي تَسبِق هذه الآية مباشرة؟ (استرجاع عكسي)": "Which ayah comes right before this ayah? (reverse recall)",
        "اختر الخاتمة الصحيحة والدقيقة لهذه الآية:": "Choose the correct and exact ending of this ayah:",
        "استخرج (الكلمة الدخيلة) التي تم إضافتها خطأً إلى هذه الآية:": "Find the (intruder word) that was wrongly added to this ayah:",
        "اختر الكلمة الصحيحة لإكمال الفراغ 🔽:": "Choose the correct word to fill the blank 🔽:",
        "أكمل الفراغ بكتابة الكلمة الصحيحة (بدون اختيارات): ✍️": "Fill in the blank by typing the correct word (no choices): ✍️",
        "اختر الكلمتين الصحيحتين لإكمال الفراغين (1) و (2) 🔽:": "Choose the two correct words to fill blanks (1) and (2) 🔽:",
        "اختر جميع الإجابات الصحيحة من القائمة:": "Select all the correct answers from the list:",
        "اقرأ الآيات جيداً، ثم اختر الترتيب الصحيح لكل آية.": "Read the ayahs carefully, then choose the correct order for each ayah.",
        "تسميع كتابي للمقاطع: ✍️": "Written recitation of passages: ✍️",
        "طابق بداية كل آية بنهايتها الصحيحة 🔗:": "Match the beginning of each ayah with its correct ending 🔗:",
        "اضغط على بداية من العمود الأول، ثم على نهايتها المطابقة من العمود الثاني:": "Tap a beginning from the first column, then its matching ending from the second column:",
        "اكتب الآيات الثلاث المتتالية ابتداءً من قوله تعالى:": "Write the three consecutive ayahs starting from the words of Allah:",
        "يحتاج تصحيح": "Needs grading",
        "⏳ بانتظار التصحيح": "⏳ Awaiting grading",
        "مراجعة وتصحيح": "Review & grade",
        "إعادة المحاولة": "Retry",
        "غرفة التصحيح:": "Grading room:",
        "⏳ الدرجة النهائية ستظهر بعد اعتماد كل الأسئلة اليدوية": "⏳ The final score will appear after all manual questions are approved",
        "النتيجة:": "Result:",
        "— لم يربطها —": "— Not matched —",
        "(الاقتراح:": "(Suggested:",
        "إجابة الطالب:": "Student's answer:",
        "الإجابة النموذجية:": "Model answer:",
        "أعطِ الطالب درجة من": "Give the student a score out of",
        "✅ تم التصحيح آلياً (صحيح)": "✅ Auto-graded (correct)",
        "🟡 تم التصحيح آلياً (جزئي)": "🟡 Auto-graded (partial)",
        "❌ تم التصحيح آلياً (خاطئ)": "❌ Auto-graded (wrong)",
        "حفظ الدرجات وإعادة الحساب": "Save scores & recalculate",
        "إغلاق": "Close",
        "⏳ جاري الحفظ في السحابة...": "⏳ Saving to the cloud...",
        "الآية المبعثرة": "Scrambled ayah",
        "الترتيب الصحيح لها": "Its correct order",
        "إجابة الفراغ الأول [ 1 ]:": "Answer for blank 1 [ 1 ]:",
        "إجابة الفراغ الثاني [ 2 ]:": "Answer for blank 2 [ 2 ]:",
        "الكلمة المطلوبة:": "Required word:",
        "الآيات الثلاث المطلوبة:": "The three required ayahs:",
        "يحتاج تقييم يدوي ✍️": "Needs manual grading ✍️",
        "نقاط": "points",
        "اختيار من متعدد (إجابة واحدة)": "Multiple choice (single answer)",
        "مربعات اختيار (عدة إجابات)": "Checkboxes (multiple answers)",
        "قائمة منسدلة (فراغات)": "Dropdown (blanks)",
        "أكمل الفراغ (كتابة يدوية)": "Fill in the blank (manual writing)",
        "تسميع مقطع (كتابة يدوية)": "Passage recitation (manual writing)",
        "تم إرسال التقييم!": "Evaluation sent!",
        "يمكنك إغلاق هذه الصفحة (النافذة) الآن بأمان يا بطل.": "You can safely close this page (window) now, champion.",
        "-- اختر الكلمة الصحيحة --": "-- Choose the correct word --",
        "اكتب الكلمة الناقصة هنا...": "Type the missing word here...",
        "اكتب الآيات الثلاث هنا بتركيز...": "Write the three ayahs here, with focus...",
        "اختر الفراغ الأول [ 1 ]:": "Choose blank 1 [ 1 ]:",
        "اختر الفراغ الثاني [ 2 ]:": "Choose blank 2 [ 2 ]:",
        "-- اختر الكلمة الأولى --": "-- Choose the first word --",
        "-- اختر الكلمة الثانية --": "-- Choose the second word --",
        "البدايات": "Beginnings",
        "النهايات": "Endings",
        "اضغط على بداية، ثم على نهايتها المطابقة لها. اضغط على أي بطاقة مربوطة لفك ربطها.": "Tap a beginning, then its matching ending. Tap any linked card to unlink it.",
        // 🌟 [جديد] الواجبات 2
        "محرك القرآن غير متوفر!": "Quran engine is unavailable!",
        "لا توجد واجبات سابقة مسجلة.": "No previous homework recorded.",
        "سؤال": "question(s)",
        "حذف": "Delete",
        "هل أنت متأكد من حذف هذا الواجب نهائياً؟": "Are you sure you want to permanently delete this homework?",
        "يرجى نسخ الرابط يدوياً.": "Please copy the link manually.",
        "لم يقم أي طالب بتسليم هذا الواجب حتى الآن.": "No student has submitted this homework yet.",
        "السؤال": "Question",
        "خطأ في تحميل المحرك!": "Error loading the engine!",
        "الرجاء اختيار السورة أولاً!": "Please choose the surah first!",
        "الرجاء اختيار عدد صحيح وموجب للأسئلة!": "Please enter a valid positive whole number of questions!",
        "لم يتم العثور على آيات كافية.": "Not enough ayahs were found.",
        "تعديل": "Edit",
        "هل أنت متأكد من حذف هذا السؤال؟": "Are you sure you want to delete this question?",
        "الرجاء كتابة عنوان ونص السؤال!": "Please write the question title and text!",
        "لا يوجد أسئلة لحفظها!": "There are no questions to save!",
        "✅ تم حفظ الواجب كمسودة محلياً بنجاح.": "✅ Homework saved locally as a draft.",
        "حدث خطأ أثناء الحفظ. يرجى تحديث الصفحة.": "An error occurred while saving. Please refresh the page.",
        // 🌟 [جديد] لعب الواجب
        hw_pl_title: "Champions' Challenge 🏆",
        hw_pl_prev: "Previous",
        hw_pl_next: "Next ➡️",
        hw_pl_submit: "📨 Finish & submit homework",
        // 🌟 [جديد] سجل الطلاب والتسميع
        as_col_age: "Age",
        as_col_errors: "Fix mistakes",
        as_col_evals: "Evaluations",
        as_col_grade: "Grade",
        as_col_manage: "Manage & edit",
        as_col_name: "Student name",
        as_col_points: "Points",
        btn_back_to_my_students: "🔙 Back to My Students",
        hw_overdue_stat: "Overdue",
        rec_cancel_btn: "↩️ Back to recording",
        rec_err_hesitation: "Hesitation",
        rec_err_pronounce: "Mispronunciation",
        rec_err_verse: "Forgot an ayah",
        rec_err_word: "Forgot a word",
        rec_finish_btn: "✅ Finish recitation",
        rec_location_ph: "Where did it happen? (optional)",
        rec_location_save_btn: "✓",
        rec_note_label: "General note on the session (optional)",
        rec_note_ph: "Write any general note here...",
        rec_play_hint: "Press the matching button as soon as you notice something while listening to the student — without stopping them.",
        rec_range_from: "From",
        rec_range_from_ph: "Example: Surah Al-Baqarah - Ayah 1",
        rec_range_to: "To",
        rec_range_to_ph: "Example: Surah Al-Baqarah - Ayah 20",
        rec_save_btn: "💾 Save session",
        rec_setup_sub: "Choose the session type and range, then start — log any note while listening with a single tap.",
        rec_setup_title: "🎙️ Start a recitation session",
        rec_start_btn: "🎙️ Start recitation",
        rec_summary_title: "Recitation session summary",
        rec_total_label: "Total recorded notes:",
        rec_type_new: "New memorization",
        rec_type_review: "Review",
        as_page_title: "📊 General Record of Student Data & Achievements",
        as_edit_title: "Edit student details",
        as_gender_label: "Gender (for the avatar):",
        as_gender_boy: "👦🏻 Boy",
        as_gender_girl: "👧🏻 Girl",
        as_photo_label: "Profile photo (optional):",
        as_save_edits: "Save changes ✔️",
        as_memo_label: "Memorized amount (from surah – to surah):",
        as_count: "{n} students",
        as_search_ph: "🔎 Search for a student...",
        as_points_unit: "pts",
        as_more_options: "Options",
        as_fix_errors: "🛠️ {n} mistakes to fix",
        as_hidden_group: "🙈 Hidden students ({n})",
        as_show_btn: "👁️ Show",
        as_no_match: "No student with this name.",
        as_empty: "No students registered yet.",
        add_choose_photo: "Choose a picture:",
        add_step_next: "Next →",
        add_step_back: "← Back",
        add_skip_save: "Skip & save now",
        add_step_of: "Step {n} of 3: {title}",
        add_step1_title: "Name & picture",
        add_step2_title: "Grade & age",
        add_step3_title: "Parent & memorization",
        save_and_add_another: "Save & add another ➕",
        add_saved_next: "✔️ «{name}» registered. Add the next student.",
        dob_day: "Day",
        dob_month: "Month",
        dob_year: "Year",
        upload_photo_title: "Upload a real photo",
        as_parent_phone: "Parent's phone (optional):",
        "التمهيدي": "Kindergarten (KG)",
        "الأول الابتدائي": "Primary 1",
        "الثاني الابتدائي": "Primary 2",
        "الثالث الابتدائي": "Primary 3",
        "الرابع الابتدائي": "Primary 4",
        "الخامس الابتدائي": "Primary 5",
        "السادس الابتدائي": "Primary 6",
        "الأول الإعدادي": "Preparatory 1",
        "الثاني الإعدادي": "Preparatory 2",
        "الثالث الإعدادي": "Preparatory 3",
        "الأول الثانوي": "Secondary 1",
        "الثاني الثانوي": "Secondary 2",
        "الثالث الثانوي": "Secondary 3",
        "المرحلة الجامعية": "University",
        "خريج جامعي": "University graduate",
        // 🌟 [جديد] تسميع وملف الطالب
        rec_no_student_selected: "No student selected. Please choose a student first.",
        rec_last_logged: "Last logged:",
        rec_exit_confirm_msg: "Do you want to exit? Unsaved notes will be lost.",
        rec_no_errors_note: "No notes were recorded in this session.",
        rec_saved_toast: "Session saved ✅",
        rec_range_required_alert: "Please enter the start and end of the recitation range.",
        hw_overdue_row_badge: "Overdue",
        hw_overdue_tooltip: "Homework published a while ago that the assigned student has not submitted yet",
        pfx_back: "🔙 Back",
        pfx_total_points: "Total points earned 🏆",
        pfx_eval_count: "Number of previous evaluations 📈",
        pfx_dual_wins: "Dual-test wins 🆚",
        pfx_dual_badges: "🎖️ Dual-test badges",
        pfx_history_title: "Previous evaluations log 📅",
        pfx_col_no: "#",
        pfx_col_date: "Date",
        pfx_col_range: "Evaluation range",
        pfx_col_pct: "Percentage",
        pfx_back_in_prof: "🔙 Back",
        // 🌟 [جديد] معايير بوابة التجويد
        "حرف القلقلة الساكن يُنطق بضغط ثم انفتاح مفاجئ يُحدِث \"نبرة\" أو ارتداداً صوتياً خفيفاً — وليس حركة كاملة (ليس فتحة ولا ضمة ولا كسرة)": "The silent qalqalah letter is pronounced with a squeeze followed by a sudden release that produces a light \"bounce\" or echo — it is not a full vowel (not a fatha, damma or kasra).",
        "الخطأ الأشيع عند الأطفال: تحويل القلقلة لحركة كاملة (مثلاً نطق الساكن كأنه مفتوح)، أو العكس: إهمال الارتداد تماماً والوقوف على الحرف ساكناً بلا أي نبرة، خصوصاً في القلقلة الكبرى عند الوقف": "Most common mistake in children: turning the qalqalah into a full vowel (e.g. pronouncing the silent letter as if it had a fatha), or the opposite: dropping the bounce completely and stopping on the letter flatly with no echo, especially in the major qalqalah when stopping.",
        "الغنة صوت يخرج من الخيشوم (الأنف) لا من الفم، بمقدار حركتين (زمن قبض إصبعين أو بسطهما تقريباً) — استمر بصوت الميم أو النون المشدَّدة حتى تحس بالرنين في أنفك لا في فمك.": "Ghunnah is a sound that comes from the nasal passage (the nose), not the mouth, held for two counts (about the time of folding or extending two fingers) — keep the sound of the doubled meem or noon going until you feel the resonance in your nose, not your mouth.",
        "أشيع خطأ عند الأطفال: تقصير الغنة لأقل من حركتين (نطق سريع يشبه الحرف العادي غير المشدَّد)، أو العكس: مطّها أطول من اللازم فتشبه المد.": "Most common mistake in children: shortening the ghunnah to less than two counts (a quick pronunciation that sounds like an ordinary, non-doubled letter), or the opposite: stretching it longer than needed so it sounds like a madd.",
        "الشفتان تُخفيان انطباقهما التام (لا إظهار كامل ولا إدغام كامل) مع غنة بمقدار حركتين — حالة وسط تماماً بين الإظهار والإدغام.": "The lips hide their full closure (neither full clarity nor full merging) with a ghunnah of two counts — a state exactly between clear pronunciation and merging.",
        "أشيع خطأ: تحويلها لإدغام كامل (دمج الميم في الباء تماماً)، أو العكس: إظهار الميم بوضوح تام بلا أي غنة مخفاة.": "Most common mistake: turning it into a complete merging (blending the meem fully into the baa), or the opposite: pronouncing the meem completely clearly with no hidden ghunnah at all.",
        "الميمان تندمجان في ميم واحدة مشدَّدة بغنة كاملة بمقدار حركتين — نفس حكم الغنة الواجبة (المرحلة السابقة) لكن سببها هنا التقاء ميمين لا التشديد المكتوب.": "The two meems merge into one doubled meem with a full ghunnah of two counts — the same rule as the obligatory ghunnah (previous stage), but here the cause is the meeting of two meems rather than a written shaddah.",
        "أشيع خطأ: نطق الميمين منفصلتين بدل دمجهما في ميم واحدة، أو تقصير مدة الغنة عن حركتين.": "Most common mistake: pronouncing the two meems separately instead of merging them into one, or shortening the ghunnah to less than two counts.",
        "إطباق الشفتين على الميم الساكنة بوضوح تام من مخرجها من غير أي غنة زائدة — أوضح أحكام الميم الساكنة الثلاثة نطقاً.": "The lips close clearly on the silent meem from its proper articulation point with no extra ghunnah — the clearest of the three silent-meem rules in pronunciation.",
        "أشيع خطأ عند الأطفال تحديداً قبل حرفي الفاء والواو (قريبَي مخرج من الباء): إضافة غنة خفيفة بالخطأ وكأنها إخفاء شفوي رغم أن الحكم إظهار تام.": "Most common mistake in children, specifically before the letters faa and waw (close to the baa in articulation): wrongly adding a light ghunnah as if it were a labial ikhfa, although the rule is full clear pronunciation.",
        "النون الساكنة تُنطق من مخرجها الطبيعي (طرف اللسان) واضحة تماماً بلا غنة زائدة عن غنتها الطبيعية الخفيفة — لأن حروف الحلق الستة بعيدة المخرج عن النون فلا تؤثر فيها.": "The silent noon is pronounced from its natural articulation point (the tip of the tongue) completely clearly, with no ghunnah beyond its natural light one — because the six throat letters are far from the noon in articulation and do not affect it.",
        "أشيع خطأ: إضافة غنة زائدة بالخطأ (كأنها إخفاء) خصوصاً قبل حرفي الغين والخاء تحديداً لقربهما نسبياً من وسط الفم.": "Most common mistake: wrongly adding an extra ghunnah (as if it were ikhfa), especially before the letters ghayn and khaa, because they are relatively close to the middle of the mouth.",
        "النون الساكنة أو التنوين يندمجان تماماً في الحرف التالي (من حروف \"ينمو\") مع بقاء غنة كاملة بمقدار حركتين أثناء الاندماج.": "The silent noon or tanween merges completely into the following letter (one of the letters of \"yanmu\") while a full ghunnah of two counts remains during the merging.",
        "أشيع خطأ: إسقاط الغنة تماماً وكأنه إدغام بغير غنة، أو نطق النون منفصلة قبل الحرف التالي بدل اندماجها الكامل فيه.": "Most common mistake: dropping the ghunnah completely as if it were a merging without ghunnah, or pronouncing the noon separately before the next letter instead of merging fully into it.",
        "النون الساكنة أو التنوين يندمجان تماماً في اللام أو الراء التالية بلا أي غنة إطلاقاً — اندماج كامل وسريع، على عكس النوع السابق.": "The silent noon or tanween merges completely into the following laam or raa with no ghunnah at all — a full, quick merging, unlike the previous type.",
        "أشيع خطأ: إبقاء أثر غنة خفيف بالخطأ (خلط مع الإدغام بغنة)، وهذا هو الفارق الجوهري الذي يجب أن يميّزه الطالب بوضوح بين الحكمين.": "Most common mistake: wrongly leaving a light trace of ghunnah (confusing it with merging with ghunnah), which is the key difference the student must clearly tell apart between the two rules.",
        "النون الساكنة أو التنوين يتحوّلان فعلياً لصوت ميم مخفاة (بغنة) قبل نطق الباء — تحوّل حقيقي في الصوت وليس مجرد إخفاء.": "The silent noon or tanween actually changes into the sound of a hidden meem (with ghunnah) before pronouncing the baa — a real change in the sound, not just hiding.",
        "أشيع خطأ: نطق النون الأصلية دون تحويلها لميم، أو نسيان علامة الميم الصغيرة فوق النون عند الكتابة بخط اليد.": "Most common mistake: pronouncing the original noon without turning it into a meem, or forgetting the small meem sign above the noon when writing by hand.",
        "حالة وسط تماماً بين الإظهار والإدغام: النون الساكنة أو التنوين تُخفَيان بغنة بمقدار حركتين بلا إدغام كامل وبلا إظهار كامل — أدق أحكام النون الساكنة نطقاً ويحتاج تدريباً أطول من الطفل.": "A state exactly between clear pronunciation and merging: the silent noon or tanween is hidden with a ghunnah of two counts, with neither full merging nor full clarity — the most delicate of the silent-noon rules to pronounce and it needs longer training for a child.",
        "أشيع خطأ: الميل لأحد طرفَي الحكم بالكامل (إظهار واضح جداً أو إدغام كامل) بدل الحالة الوسطى الدقيقة، خصوصاً مع الحروف الخمسة عشر الكثيرة.": "Most common mistake: leaning completely to one extreme of the rule (very clear pronunciation or full merging) instead of the delicate middle state, especially with the many fifteen letters.",
        // 🌟 [جديد] رسائل متفرقة
        "جاري تجهيز شاشة ترحيب الطالب 🛠️ (انتقل للخطوة التالية من فضلك!)": "Preparing the student welcome screen 🛠️ (please move on to the next step!)",
        "جاري تجهيز شاشة إعداد الواجبات 🛠️ (انتقل للخطوة التالية من فضلك)": "Preparing the homework setup screen 🛠️ (please move on to the next step)",
        "جاري تجهيز شاشة الاختبارات الثنائية 🛠️": "Preparing the dual tests screen 🛠️",
        "جاري تجهيز شاشة الشهادات 🛠️": "Preparing the certificates screen 🛠️",
        "جاري تجهيز شاشات ركن المتشابهات 🛠️": "Preparing the similarities corner screens 🛠️",
        "جاري تجهيز شاشات أبطال التجويد 🛠️": "Preparing the Tajweed Heroes screens 🛠️",
        "جاري تجهيز شاشة النشاط 🛠️": "Preparing the activity screen 🛠️",
        "جاري تجهيز شاشة اللعب 🛠️": "Preparing the game screen 🛠️",
        "تعذر العثور على المواجهة.": "The match could not be found.",
        "تعذر العثور على الاختبار المرتبط بهذه المواجهة.": "The test linked to this match could not be found.",
        "العودة الآن ستُغلق الجلسة. تقدّمك محفوظ تلقائياً حتى آخر سؤال اعتمدته — فقط السؤال المفتوح حالياً (لو لم تعتمده بعد) قد يُفقَد. متابعة؟": "Going back now will close the session. Your progress is saved automatically up to the last question you approved — only the currently open question (if not yet approved) may be lost. Continue?",
        "إنهاء الجولة الآن يدوياً؟ الأسئلة المتبقية على اللوحة تبقى بلا إجابة.": "End the round manually now? The remaining questions on the board stay unanswered.",
        // 🌟 [جديد] واجب الطالب ومنشئ الأسئلة
        "تحدي قرآني جديد!": "A new Quran challenge!",
        "معلمك يرسل لك مهمة خاصة.. هل أنت مستعد لإثبات مهارتك يا بطل؟": "Your teacher is sending you a special task.. Are you ready to prove your skill, champion?",
        "🚀 انطلق للتحدي!": "🚀 Start the challenge!",
        "✖️ لست مستعداً الآن (عودة)": "✖️ Not ready now (back)",
        "اكتب عنوان السؤال...": "Write the question title...",
        "اكتب الآية أو النص هنا...": "Write the ayah or text here...",
        "الخيار الأول\nالخيار الثاني\nالخيار الثالث": "First option\nSecond option\nThird option",
        "اكتب الإجابة الصحيحة هنا...": "Write the correct answer here...",
        "* إذا كان النوع (مربعات اختيار)، افصل الإجابات الصحيحة بفاصلة (،).": "* If the type is (checkboxes), separate the correct answers with a comma (,).",
        "لم تُؤخَذ أي نسخة احتياطية بعد على هذا الجهاز": "No backup has been taken on this device yet"
    }
};

export function t(key) {
    const lang = AppState.currentLang;
    if (translations[lang] && translations[lang][key]) {
        return translations[lang][key];
    }
    return key;
}

// 🌟 [جديد — إصلاح شامل لنظام الترجمة] أدوات مركزية لترجمة النصوص المولَّدة ديناميكياً داخل JS
// (محرّكات الأسئلة، الألعاب، التقارير، الرسائل). كلها إضافات فقط — لم يُعدَّل أي سلوك قائم.
// ملاحظة صريحة: نص القرآن نفسه (الآيات وكلماتها) لا يمر على هذه الدوال أبداً؛ تُستخدم فقط للنصوص
// المحيطة به (السؤال، التعليمات، أسماء السور خارج الآية، الأزرار...).

// 🌟 tf: مثل t() لكن تدعم متغيرات بصيغة {name} داخل النص — مثال: tf('k', { n: 5 })
export function tf(key, params) {
    let s = t(key);
    if (params) {
        Object.keys(params).forEach(k => { s = s.split('{' + k + '}').join(String(params[k])); });
    }
    return s;
}

// 🌟 هل اللغة الحالية إنجليزية؟ (اختصار مقروء للتفرعات البسيطة)
export function isEnglish() { return AppState.currentLang === 'en'; }

// 🌟 أسماء السور الـ 114 بالإنجليزية (بترتيب المصحف) — تُعرَض فقط عند اختيار الإنجليزية، أما
// المنطق الداخلي (المقارنة، التخزين، سجل الطالب) فيبقى على الاسم العربي الأصلي دائماً
export const SURAH_NAMES_EN = ["Al-Fatihah","Al-Baqarah","Al-Imran","An-Nisa","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal","At-Tawbah","Yunus","Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl","Al-Isra","Al-Kahf","Maryam","Ta-Ha","Al-Anbiya","Al-Hajj","Al-Mu'minun","An-Nur","Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas","Al-Ankabut","Ar-Rum","Luqman","As-Sajdah","Al-Ahzab","Saba","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir","Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiyah","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf","Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah","Al-Hadid","Al-Mujadila","Al-Hashr","Al-Mumtahanah","As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij","Nuh","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","Abasa","At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Ad-Duha","Ash-Sharh","At-Tin","Al-Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-Adiyat","Al-Qari'ah","At-Takathur","Al-Asr","Al-Humazah","Al-Fil","Quraysh","Al-Ma'un","Al-Kawthar","Al-Kafirun","An-Nasr","Al-Masad","Al-Ikhlas","Al-Falaq","An-Nas"];
export const SURAH_NAMES_AR_BARE = ["الفاتحة","البقرة","آل عمران","النساء","المائدة","الأنعام","الأعراف","الأنفال","التوبة","يونس","هود","يوسف","الرعد","إبراهيم","الحجر","النحل","الإسراء","الكهف","مريم","طه","الأنبياء","الحج","المؤمنون","النور","الفرقان","الشعراء","النمل","القصص","العنكبوت","الروم","لقمان","السجدة","الأحزاب","سبأ","فاطر","يس","الصافات","ص","الزمر","غافر","فصلت","الشورى","الزخرف","الدخان","الجاثية","الأحقاف","محمد","الفتح","الحجرات","ق","الذاريات","الطور","النجم","القمر","الرحمن","الواقعة","الحديد","المجادلة","الحشر","الممتحنة","الصف","الجمعة","المنافقون","التغابن","الطلاق","التحريم","الملك","القلم","الحاقة","المعارج","نوح","الجن","المزمل","المدثر","القيامة","الإنسان","المرسلات","النبأ","النازعات","عبس","التكوير","الانفطار","المطففين","الانشقاق","البروج","الطارق","الأعلى","الغاشية","الفجر","البلد","الشمس","الليل","الضحى","الشرح","التين","العلق","القدر","البينة","الزلزلة","العاديات","القارعة","التكاثر","العصر","الهمزة","الفيل","قريش","الماعون","الكوثر","الكافرون","النصر","المسد","الإخلاص","الفلق","الناس"];

// تطبيع اسم عربي للمقارنة فقط: إزالة التشكيل والهمزات وكلمة "سورة" والمسافات
function _normSurahKey(s) {
    return String(s == null ? '' : s)
        .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '')
        .replace(/[\u0671\u0622\u0623\u0625]/g, '\u0627')
        .replace(/\u0649/g, '\u064A')
        .replace(/\u0629/g, '\u0647')
        .replace(/^\s*\u0633\u0648\u0631\u0647\s*/, '')
        .replace(/\s+/g, '');
}
let _surahEnByKey = null;
function _surahMap() {
    if (_surahEnByKey) return _surahEnByKey;
    _surahEnByKey = {};
    SURAH_NAMES_AR_BARE.forEach((ar, i) => { _surahEnByKey[_normSurahKey(ar)] = SURAH_NAMES_EN[i]; });
    return _surahEnByKey;
}

// 🌟 surahNameLocal: اسم السورة بلغة الواجهة الحالية — يقبل رقم السورة أو اسمها العربي (بأي تشكيل،
// مع أو بدون كلمة "سورة"). في العربية يرجع الاسم كما هو (بلا كلمة "سورة")، وفي الإنجليزية الاسم
// المترجم؛ ولو لم يُعثر على مطابقة (اسم غير معروف) يرجع النص الأصلي بدون تغيير.
export function surahNameLocal(nameOrNumber) {
    const isNum = typeof nameOrNumber === 'number' || /^\d+$/.test(String(nameOrNumber || '').trim());
    let en = null;
    if (isNum) en = SURAH_NAMES_EN[Number(nameOrNumber) - 1] || null;
    else en = _surahMap()[_normSurahKey(nameOrNumber)] || null;
    if (AppState.currentLang === 'en' && en) return en;
    if (isNum) return SURAH_NAMES_AR_BARE[Number(nameOrNumber) - 1] || String(nameOrNumber);
    return String(nameOrNumber == null ? '' : nameOrNumber).replace(/^\s*(سُورَةُ|سُورَةَ|سورة)\s*/, '');
}

// 🌟 surahLabel: "سورة الأعلى" / "Surah Al-A'la" — الاسم مع كلمة "سورة" بلغة الواجهة
export function surahLabel(nameOrNumber) {
    return (AppState.currentLang === 'en' ? 'Surah ' : 'سورة ') + surahNameLocal(nameOrNumber);
}

// 🌟 isSurahName: هل النص بالضبط اسم سورة؟ (يُستخدم لعرض اختيارات "خمن السورة" فقط)
export function isSurahName(text) {
    return !!_surahMap()[_normSurahKey(text)];
}

// 🌟 trStored: ترجمة نص "محفوظ سابقاً" في سجلات الطالب/التقارير (كُتب وقت اللعب بلغة معينة) إلى لغة
// الواجهة الحالية عبر البحث العكسي في القاموس: لو النص يطابق بالضبط قيمة قاموس بالعربية (أو
// الإنجليزية) يرجع نظيره باللغة الحالية، وإلا يرجع النص كما هو. لا تُستخدم أبداً على نص قرآني.
let _revAr = null, _revEn = null;
function _buildReverse() {
    _revAr = {}; _revEn = {};
    const A = translations.ar || {}, E = translations.en || {};
    Object.keys(A).forEach(k => {
        const a = A[k], e = E[k];
        if (typeof a !== 'string' || typeof e !== 'string') return;
        const na = a.trim(), ne = e.trim();
        if (na && !(na in _revAr)) _revAr[na] = e;
        if (ne && !(ne in _revEn)) _revEn[ne] = a;
    });
    // مفاتيح عربية-النص (الأسلوب القديم: t("نص عربي")) — المفتاح نفسه هو النص العربي
    Object.keys(E).forEach(k => {
        if (/[\u0600-\u06FF]/.test(k) && typeof E[k] === 'string') {
            const kk = k.trim();
            if (!(kk in _revAr)) _revAr[kk] = E[k];
            const ee = E[k].trim();
            if (!(ee in _revEn)) _revEn[ee] = k;
        }
    });
}
export function trStored(text) {
    if (typeof text !== 'string' || !text) return text;
    if (!_revAr) _buildReverse();
    const s = text.trim();
    if (AppState.currentLang === 'en') return (s in _revAr) ? _revAr[s] : text;
    return (s in _revEn) ? _revEn[s] : text;
}

// 🌟 تسجيل المترجم في جسر المحرّكات النقية (راجع core/langBridge.js للشرح)
registerTranslator({ t, tf, surahNameLocal, surahLabel });

// 🌟 localizeGenerated: ترجمة "النصوص المولَّدة" (نصوص التقارير وسجل الطالب وأسئلة الواجبات) التي تُخزَّن
// بصيغة عربية قياسية مع متغيرات (اسم سورة، أرقام، كلمة...). كل قالب هنا هو مفتاح قاموس عربي فيه
// متغيرات {name} {names} {nums} {n} {word} — يُحوَّل تلقائياً إلى تعبير نمطي يطابق النص المخزَّن، ثم
// يُعاد بناء النص بلغة الواجهة الحالية مع ترجمة أسماء السور (والأرقام تبقى كما هي، والكلمة القرآنية
// {word} لا تُترجم). لو لا يوجد تطابق يُرجَع النص كما هو دون أي تعديل (فيبقى النص القرآني سليماً).
const GENERATED_KEYS = [
    'report_first_ayah_of_surah', 'report_extract_word',
    'qe_report_order_ayahs', 'qe_report_recite_full', 'qe_report_recite_part',
    'qe_report_link_kids', 'qe_report_link_adult', 'qe_report_order_surahs',
    'qe_report_word_surah_kids', 'qe_report_word_surah_adult',
    'kids_range_text', 'adult_range_text', 'adult_juz_text', 'adult_surah_text', 'gen_note_prefix'
];
let _genPatterns = null;
function _escRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function _buildGenPatterns() {
    _genPatterns = [];
    GENERATED_KEYS.forEach(key => {
        const tpl = translations.ar[key];
        if (!tpl) return;
        const names = [];
        const src = tpl.split(/(\{[a-z]+\})/).map(part => {
            const m = part.match(/^\{([a-z]+)\}$/);
            if (m) { names.push(m[1]); return '(.+?)'; }
            return _escRe(part);
        }).join('').replace(/\(\.\+\?\)$/, '([\\s\\S]+)');
        _genPatterns.push({ key, names, re: new RegExp('^' + src + '$') });
    });
}
function _localizeList(str) {
    return String(str).split(/[،,]\s*/).map(x => surahNameLocal(x.trim())).join(AppState.currentLang === 'en' ? ', ' : '، ');
}
// 🌟 tfAr: نفس tf() لكن بالعربية دائماً بغض النظر عن لغة الواجهة — لتخزين النصوص "القياسية" في السجلات
// بصيغة ثابتة (تُترجم لاحقاً عند العرض عبر localizeGenerated) فلا تتأثر السجلات بلغة اللحظة التي لُعب فيها
export function tfAr(key, params) {
    let s = (translations.ar && translations.ar[key]) || key;
    if (params) Object.keys(params).forEach(k => { s = s.split('{' + k + '}').join(String(params[k])); });
    return s;
}

// 🌟 surahNamesLocal: اسم سورة واحدة أو قائمة أسماء مفصولة بـ "،" (مثل لعبة "اربط الكلمة بالسورة") بلغة الواجهة
export function surahNamesLocal(str) {
    const s = String(str == null ? '' : str);
    if (/[،,]/.test(s)) return _localizeList(s);
    return surahNameLocal(s);
}

export function localizeGenerated(text) {
    if (typeof text !== 'string' || !text) return text;
    const exact = trStored(text);
    if (exact !== text) return exact;
    if (!_genPatterns) _buildGenPatterns();
    const s = text.trim();
    for (const pat of _genPatterns) {
        const m = s.match(pat.re);
        if (!m) continue;
        const params = {};
        pat.names.forEach((nm, i) => {
            const v = m[i + 1];
            if (nm === 'name' || nm === 'sfrom' || nm === 'sto') params[nm] = surahNameLocal(v);
            else if (nm === 'names') params[nm] = _localizeList(v);
            else if (nm === 'nums') params[nm] = String(v).split(/[،,]\s*/).join(AppState.currentLang === 'en' ? ', ' : '، ');
            else params[nm] = v;
        });
        return tf(pat.key, params);
    }
    // 🌟 [إصلاح ترجمة التقارير] شريحة "📍 موضع الخطأ: من آية 3 إلى آية 5" المخزَّنة ضمن الأخطاء
    const chip = s.match(/^📍\s*(.+)$/);
    if (chip) {
        for (const src of [translations.ar, translations.en]) {
            const lbl = src.recite_range_label;
            if (lbl && chip[1].startsWith(lbl)) {
                const r = _rangeListLocal(chip[1].slice(lbl.length).trim());
                if (r) return `📍 ${t('recite_range_label')} ${r}`;
            }
        }
    }
    // 🌟 نص تسميع مع موضع الخطأ ملحق بين قوسين: "تسميع سورة X كاملة (من آية 3 إلى آية 5)"
    const tail = s.match(/^(.*\S)\s*\(([^()]+)\)$/);
    if (tail) {
        const r = _rangeListLocal(tail[2]);
        if (r) return `${localizeGenerated(tail[1])} (${r})`;
    }
    return text;
}

// 🌟 وصف موضع الخطأ ("من آية 3 إلى آية 5" / "آية 3"، وقد تتعدد مفصولة بفاصلة) بلغة الواجهة الحالية.
// يقبل الصيغة العربية أو الإنجليزية المخزَّنة؛ يرجع null لو النص ليس وصف موضع (فلا يُمَسّ).
function _rangeListLocal(str) {
    const cur = AppState.currentLang === 'en' ? translations.en : translations.ar;
    const one = (desc) => {
        for (const src of [translations.ar, translations.en]) {
            const a = _escRe(src.recite_range_ayah || ''), f = _escRe(src.recite_range_from || ''), to = _escRe(src.recite_range_to || '');
            if (!a) continue;
            let m = desc.match(new RegExp('^' + f + '\\s+' + a + '\\s+(\\d+)\\s+' + to + '\\s+' + a + '\\s+(\\d+)$', 'i'));
            if (m) return `${cur.recite_range_from} ${cur.recite_range_ayah} ${m[1]} ${cur.recite_range_to} ${cur.recite_range_ayah} ${m[2]}`;
            m = desc.match(new RegExp('^' + a + '\\s+(\\d+)$', 'i'));
            if (m) return `${cur.recite_range_ayah} ${m[1]}`;
        }
        return null;
    };
    const parts = String(str).split(/[،,]\s*/).map(p => one(p.trim()));
    return parts.every(Boolean) ? parts.join(AppState.currentLang === 'en' ? ', ' : '، ') : null;
}

// 🌟 localizeErrorTypes: نص "أنواع الأخطاء" المخزَّن (قائمة عربية مفصولة بفاصلة عربية) يُعرَض بلغة الواجهة الحالية
// عنصرًا عنصرًا (نسيان كلمة، تردد، ملاحظة: ...)، دون المساس بالمخزَّن ولا بنص الملاحظة الحرّة التي كتبها المعلم.
export function localizeErrorTypes(str) {
    if (str == null || str === '') return '';
    const parts = Array.isArray(str) ? str.map(String) : String(str).split(/[،,]\s*/);
    return parts.map(x => localizeGenerated(trStored(x.trim()))).join(AppState.currentLang === 'en' ? ', ' : '، ');
}

// 🌟 localizeHomeworkText: عرض نص سؤال واجب (محفوظ دائماً بالعربية الأصلية) بلغة الواجهة الحالية وقت العرض فقط.
// لا يغيّر المخزَّن ولا الإجابات الصحيحة ولا مقارنة الطالب. نص القرآن داخل ﴿ ﴾ أو الخيارات القرآنية لا يُمَسّ:
// الدالة تترجم فقط العناوين الثابتة والأنماط المعروفة (سورة X / رتب الآيات ... / حدد كل الآيات ...) وأسماء السور.
export function localizeHomeworkText(text) {
    if (text == null) return text;
    const s = String(text);
    if (AppState.currentLang !== 'en') return s;
    const exact = trStored(s);
    if (exact !== s) return exact;
    let m;
    if ((m = s.match(/^سورة\s+(.+)$/))) return 'Surah ' + surahNameLocal(m[1].trim());
    if ((m = s.match(/^حدد كل الآيات التي تنتمي إلى \(سورة (.+)\) ☑️:$/))) return 'Select all the ayahs that belong to (Surah ' + surahNameLocal(m[1].trim()) + ') ☑️:';
    if ((m = s.match(/^رتب الآيات التالية لتكوين المقطع القرآني الصحيح \(من 1 إلى (\d+)\): \*$/))) return 'Arrange the following ayahs to form the correct Quranic passage (from 1 to ' + m[1] + '): *';
    // نص فيه تعليمات ثم <br> ثم آية: نترجم التعليمات فقط ونترك الآية كما هي
    const i = s.indexOf('<br>');
    if (i > 0) { const head = s.slice(0, i); const th = trStored(head); if (th !== head) return th + s.slice(i); }
    return s;
}

export function applyLanguage() {
    const lang = AppState.currentLang;

    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key]) {
            el.placeholder = translations[lang][key];
        }
    });

    // 🌟 [جديد] دعم ترجمة سمة title (تلميحات الأزرار الصغيرة) — نفس فلسفة
    // data-i18n-placeholder أعلاه بالحرف، لكن لسمة title بدل placeholder
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (translations[lang] && translations[lang][key]) {
            el.title = translations[lang][key];
        }
    });
}

export function toggleLanguage() {
    AppState.currentLang = AppState.currentLang === 'ar' ? 'en' : 'ar';
    localStorage.setItem('app_lang', AppState.currentLang);
    applyLanguage();

    const title = document.getElementById('login-title');
    if (title) {
        title.innerText = AppState.isKidsMode ? translations[AppState.currentLang]['login_kids_title'] : translations[AppState.currentLang]['login_adults_title'];
    }
}
