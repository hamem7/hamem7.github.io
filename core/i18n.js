// core/i18n.js
import { AppState } from './app.js';

// 🌟 القاموس الشامل لكل شاشات المنصة والواجبات الجديدة 🌟
export const translations = {
    ar: {
        header_title: "🏆 رحلة إتقان القرآن",
        header_title_kids: "🎈 ركن الأبطال الصغار",
        header_subtitle: "منصة دار حم",
        login_kids_title: "تسجيل دخول الأبطال 🎈",
        login_adults_title: "تسجيل الدخول",
        lang_toggle: "English",

        // Splash Screen
        splash_title: "أبطال القرآن الكريم",
        splash_subtitle: "منظومة التثبيت والمراجعة التفاعلية 🏆",
        btn_adult: "واجهة الكبار",
        btn_kids: "ركن الأطفال",
        btn_dual: "الاختبارات الثنائية",
        // 🌟 [عدّل] بطاقة "تحدي المتشابهات" في الشاشة الرئيسية — أصبحت الآن تفتح شاشات
        // تصفح وألعاب تفاعلية فعلية كاملة (راجع similarities/ وengine/similarityEngine.js)
        btn_similarities: "تحدي المتشابهات",
        btn_my_students: "طلابي",
        my_students_title: "طلابي",
        my_students_subtitle: "إدارة سجلات الطلاب",
        prep_by: "إعداد معلم القرآن الكريم:",
        teacher_name: "عبدالله بن المياح الأزهري",

        // 🌟 الشاشة الرئيسية الجديدة: قسم "لماذا دار حم؟" ووصف بطاقات القائمة والفوتر 🌟
        why_darham_title: "لماذا دار حم؟",
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

        card_adult_desc: "للطلاب البالغين والمراجعة الفردية",
        card_kids_desc: "تجربة ممتعة وتفاعلية للصغار",
        card_students_desc: "إدارة سجلات الطلاب وبياناتهم",
        card_homework_desc: "إرسال ومتابعة واجبات الحفظ",
        // 🌟 [عدّل] بعد اكتمال أساسيات فكرة الاختبارات الثنائية (إعداد + لعب فعلي)، أُزيلت
        // عبارة "(قيد التطوير)" من وصف البطاقة بطلب صريح من المعلم — راجع تعليق البطاقة نفسها
        // في components/splash.html لتفاصيل إزالة الشارة المصاحبة أيضاً
        card_dual_desc: "تحدٍ بين طالبين",
        // 🌟 [عدّل] كانت "قيد التطوير" بالكامل، ثم أصبح التصفح فعلياً وشغالاً بلا ألعاب
        // تفاعلية، والآن (بعد بناء similarities-play.js) أصبحت الميزة كاملة: تصفح + ألعاب
        // تفاعلية بتصحيح تلقائي فوري — حدّثنا الوصف ليعكس هذا بدقة
        card_similarities_desc: "تصفح الآيات المتشابهة بين السور والعب ألعاباً تفاعلية لتثبيت حفظها",

        footer_about_title: "عن دار حم",
        footer_about_text: "فكرة قديمة حديثة لتثبيت الحفظ والمراجعة",
        footer_contact: "تواصل معنا",
        footer_copyright: "© 2026 دار حم - جميع الحقوق محفوظة",

        // Login Screen
        login_subtitle: "اختر طالباً مسجلاً لمتابعة التقدم",
        search_student_ph: "🔍 اكتب اسم البطل للبحث...",
        btn_quick_login: "دخول سريع للتقييم 🚀",
        btn_all_students: "📊 سجل الطلاب العام",
        btn_add_student: "تسجيل بطل جديد ➕",
        btn_back: "🔙 العودة للقائمة الرئيسية",
        add_new_champion: "إضافة بطل جديد",
        name_full: "الاسم (ثلاثي):",
        name_ph: "اسم الطالب...",
        dob: "تاريخ الميلاد:",
        grade: "الصف الدراسي:",
        country: "البلد:",
        country_ph: "مثال: مصر، السعودية...",
        parent_phone: "رقم ولي الأمر (اختياري للواتساب):",
        phone_ph: "لإرسال التقارير...",
        memo_amount: "مقدار الحفظ (من سورة - إلى سورة):",
        choose_avatar: "اختر أفاتار للبطل:",
        upload_photo: "أو ارفع صورة شخصية حقيقية:",
        save_champ: "حفظ بيانات البطل ✔️",
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
        kids_range_label: "نطاق الأسئلة (جزئي تبارك وعم):",
        kids_q_count: "عدد الألعاب (الأسئلة):",
        btn_start_eval: "🚀 ابدأ التقييم الآن",
        btn_change_student: "🔙 تغيير الطالب / العودة",
        btn_homework_module: "📝 نظام الواجبات المنزلية",
        bday_notification_title: "🎉 تنبيه عيد ميلاد!",
        bday_notification_msg: "اليوم يوافق عيد ميلاد البطل: ",

        // 🌟 ترحيب الشاشة الرئيسية وملف المعلم الشخصي 🌟
        greeting_morning: "صبّحكم الله بالخير",
        greeting_evening: "مساء الخير",
        greeting_title: "يا شيخ",
        home_summary_hw_label: "واجب منشور حالياً",
        profile_badge_text: "أكمل بياناتك 👋",
        profile_modal_title: "بياناتك الشخصية",
        profile_photo_label: "الصورة الشخصية",
        // 🌟 [جديد] رفع اختياري لصورة الختم الرسمي (يُستخدم عند توقيع التقارير) 🌟
        profile_stamp_label: "الختم (اختياري)",
        profile_name_label: "الاسم:",
        profile_dob_label: "تاريخ الميلاد:",
        profile_save_btn: "حفظ",
        profile_close_btn: "إغلاق",
        teacher_bday_notification_title: "🎉 عيد ميلاد سعيد!",
        teacher_bday_notification_msg: "كل عام وأنت بخير يا شيخ ",

        // 🌟 الشاشة الرئيسية الجديدة: الهيرو وبطاقة "نظرة سريعة" 🌟
        hero_eyebrow: "منصة تعليمية متكاملة",
        home_card_homework_title: "نظام الواجبات المنزلية",
        dual_in_progress_badge: "قيد التطوير",
        // 🌟 [قديم، لم يعد مستخدماً بعد بناء شاشات التصفح الفعلية أسفل] أُبقي عليه بلا حذف
        // تفادياً لكسر أي مرجع قديم، لكن البطاقة تستخدم الآن similarities_browse_badge
        similarities_in_progress_badge: "قيد التطوير",
        similarities_toast_soon: "⚔️ تحدي المتشابهات قيد التطوير حالياً، تابعنا قريباً بإذن الله!",

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
        sim_game_opt_ayah_prefix: "آية",
        sim_game_correct_feedback: "🎉 إجابة صحيحة!",
        sim_game_wrong_feedback: "❌ حاول أن تنتبه أكثر في المرة القادمة",
        sim_game_not_enough_data: "لا توجد بيانات كافية لبناء لعبة لهذه المجموعة بعد",
        sim_game_results_title: "🏆 نتيجتك في هذه الجولة",
        sim_game_play_again_btn: "🔁 العب مرة أخرى",

        // 🌟 [جديد] شاشة إعداد "الاختبارات الثنائية" — منفصلة تماماً عن شاشات الواجبات
        // والألعاب الأخرى (بطلب صريح من المعلم)، راجع dualtests/dual-test-setup.js
        dts_title: "إعداد اختبار ثنائي 🆚",
        dts_back: "العودة",
        dts_list_title: "الاختبارات المحفوظة",
        dts_new_test_btn: "+ اختبار جديد",
        dts_no_tests: "لا يوجد أي اختبار محفوظ بعد. اضغط «اختبار جديد» للبدء.",
        dts_status_draft: "مسودة",
        dts_status_ready: "جاهز ✅",
        dts_edit_btn: "✏️ تعديل",
        dts_start_match_btn: "▶️ ابدأ مواجهة",
        dts_delete_btn: "🗑️ حذف",
        dts_delete_confirm: "هل أنت متأكد من حذف هذا الاختبار؟ لا يمكن التراجع.",
        // 🌟 [جديد] نافذة "سجل المباريات السابقة" — راجع openMatchesHistoryModal في
        // dual-test-setup.js. dtp_view_report_btn المُستخدَم لزر كل صف موجود مسبقاً (من تقرير
        // المواجهة نفسه) وأُعيد استخدامه هنا للاتساق بدل تكرار نفس النص بمفتاح مختلف.
        dts_history_btn: "📜 المباريات السابقة",
        dts_history_modal_title: "سجل مباريات هذا الاختبار",
        dts_history_close_btn: "إغلاق",
        dts_history_empty: "لا توجد مباريات منتهية على هذا الاختبار بعد.",
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
        dts_add_question_btn: "+ إضافة سؤال",
        dts_swap_questions_title: "🔄 أسئلة الاستبدال (احتياطية، برمز مستقل)",
        dts_swap_questions_desc: "هذه الأسئلة غير معروضة على لوحة الأسئلة، وتُستخدم فقط عند طلب أي طالب تبديل سؤاله — الطالب نفسه يختار أي رمز يريده من هذه القائمة.",
        dts_add_swap_btn: "+ إضافة سؤال استبدال",
        dts_question_number_prefix: "سؤال",
        // 🌟 [جديد] نموذج إدخال السؤال بنص حر — مربعا "من"/"إلى" يكتبهما المعلم بيده بالكامل
        dts_from_label: "سمّع من",
        dts_to_label: "إلى",
        dts_from_placeholder: "مثال: سورة البقرة آية 1",
        dts_to_placeholder: "مثال: سورة البقرة آية 10",
        dts_fill_both_fields_alert: "الرجاء كتابة نص «من» و«إلى» قبل إضافة السؤال.",
        dts_remove_btn: "إزالة",
        dts_save_draft_btn: "💾 حفظ كمسودة",
        dts_save_ready_btn: "✅ حفظ كاختبار جاهز",
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
        dts_step1_heading: "١) المتسابقان ونطاق كل جولة",
        dts_step1_hint: "حدّد اسم السورة التي سيختبر فيها الطالبان في كل جولة (السورة كاملة). تقدر تعدّل هذا لاحقاً في أي وقت من زر «✏️ تعديل».",
        dts_step1_next_btn: "التالي: اختيار الجولة ▶️",
        dts_step2_heading: "٢) اختر الجولة التي تريد تجهيزها",
        dts_step2_hint: "اختر أي جولة تريد إضافة أو مراجعة أسئلتها الآن. تقدر ترجع تختار جولة أخرى في أي وقت.",
        dts_step2_back_btn: "⬅️ رجوع لتعديل النطاق",
        dts_step3_back_btn: "⬅️ رجوع لاختيار الجولة",
        dts_range_not_set: "لم تُحدَّد بعد",
        dts_round_range_summary_label: "نطاق هذه الجولة:",
        dts_edit_range_btn: "✏️ تعديل",

        // 🌟 [جديد] شاشة اللعب الفعلية dualtests/dual-test-play.js
        // 🌟 [جديد] حفظ تلقائي دوري لتقدّم الجولة الجارية — راجع تعليق persistInProgressRound
        // في dual-test-play.js لتفاصيل الفكرة الكاملة
        dtp_round_restored_toast: "✅ تم استرجاع تقدّم الجولة السابق بعد التحديث",
        dtp_round_label: "الجولة {n} من 3",
        dtp_start_round_btn: "🚀 ابدأ الجولة",
        dtp_coin_flip_start_msg: "🎲 مين يبدأ؟...",
        dtp_coin_flip_result_msg: "يبدأ: {name} 🎉",
        dtp_end_round_manual_btn: "⏹️ إنهاء الجولة الآن يدوياً",
        dtp_question_turn_label: "دور: {name}",
        dtp_btn_mistake: "❌ تسجيل خطأ",
        dtp_btn_helper: "💡 مساعدة",
        dtp_btn_swap: "🔄 تبديل",
        dtp_btn_finish: "✅ اعتماد الإجابة",
        dtp_mistakes_count_label: "عدد الأخطاء المسجَّلة لهذا السؤال: {n}",
        // 🌟 [جديد] كل سؤال = 10 درجات، والدرجة الحالية المتوقعة تُعرض حياً قبل الاعتماد
        dtp_current_points_label: "الدرجة الحالية لهذا السؤال: {score} من {max}",
        dtp_result_title: "✅ نتيجة السؤال",
        dtp_result_points_of_label: "الدرجة",
        dtp_result_mistakes_label: "عدد الأخطاء",
        dtp_result_deduction_label: "الخصم",
        dtp_result_helper_label: "استخدام المساعدة",
        dtp_result_continue_btn: "متابعة ▶️",
        dtp_yes: "نعم ✅",
        dtp_no: "لا",
        dtp_no_swap_available_alert: "لا يوجد أي رمز استبدال متاح حالياً في هذه الجولة.",
        dtp_swap_modal_title: "اختر رمز سؤال الاستبدال",
        dtp_swap_modal_desc: "هذه المرة فقط — اختر أي رمز تريده من المتاح.",
        dtp_summary_title: "نتيجة الجولة {n}",
        dtp_winner_label: "الفائز بالجولة: {name} 🏆",
        dtp_tie_label: "تعادل الجولة 🤝",
        dtp_next_round_btn: "التالي ▶️",
        dtp_view_final_btn: "عرض النتيجة النهائية 🏁",
        dtp_final_title: "🏆 النتيجة النهائية",
        dtp_final_winner_label: "الفائز: {name} 🏆🎉",
        dtp_final_tie_label: "تعادل الأبطال 🤝",
        dtp_final_rounds_label: "عدد الجولات: {n}",
        dtp_final_points_label: "مجموع النقاط: {n}",
        dtp_final_back_btn: "🏠 العودة للرئيسية",
        // 🌟 [جديد] زر فتح تقرير المواجهة الكامل من شاشة النتيجة النهائية، ومُعاد استخدامه
        // أيضاً لكل صف في نافذة "📜 المباريات السابقة" (dual-test-setup.js) — راجع
        // reports/dual-test-report.js. ⚠️ كان هذا المفتاح مُستخدَماً بالفعل في dual-test-play.html
        // (data-i18n="dtp_view_report_btn") لكنه لم يكن مُعرَّفاً هنا فعلياً — تم تداركه الآن.
        dtp_view_report_btn: "📄 عرض تقرير المواجهة",
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
        home_quickview_title: "نظرة سريعة",
        home_bday_today: "عيد ميلاد الطالب {name} اليوم",
        home_mastery_avg_label: "متوسط نسبة الإتقان العام",
        home_mastery_avg_sub: "بناءً على آخر التقييمات",
        home_mastery_no_data: "لا توجد بيانات كافية بعد",
        home_reports_count_label: "تقييمات وتقارير صادرة هذا الشهر",
        home_quick_publish_btn: "نشر واجب جديد الآن",
        // 🌟 [جديد] نظام "المراجعة المتباعدة" (Anki/Duolingo) — قائمة "مستحق اليوم"
        home_due_title: "مستحق المراجعة اليوم",
        home_due_no_range: "لا يوجد نطاق حفظ مسجَّل",
        home_due_overdue_by: "متأخر",
        home_due_days_unit: "يوم",
        home_due_today: "اليوم",
        // 🌟 [جديد] تذكير شهري بتحديث بيانات حفظ الطلاب (بانر الشاشة الرئيسية)
        home_memo_reminder_text: "حان وقت مراجعة نطاق حفظ الطلاب وتحديثه لمن تقدّم في الحفظ هذا الشهر 📖",
        home_memo_reminder_btn: "تحديث الآن",
        home_memo_reminder_notif_title: "📖 تذكير شهري: تحديث بيانات الحفظ",
        home_memo_reminder_notif_body: "راجع نطاق حفظ كل طالب (من - إلى) وحدّثه لمن تقدّم هذا الشهر",

        // Games (Adult & Kids) HTML
        eval_path: "مسار التقييم الشامل",
        exit_game: "🚪 خروج وإنهاء",
        // 🌟 [جديد] رسالة تأكيد قبل الخروج من جلسة تقييم بها إجابات مسجَّلة بالفعل — نفس فكرة
        // التأكيد الموجودة في dualtests/dual-test-play.js عند الخروج من مواجهة جارية، لمنع فقد
        // تقييم كامل بضغطة واحدة بالخطأ (راجع الشرط في adultGame.js/kidsGame.js: لا يظهر
        // التأكيد إلا لو فيه إجابة واحدة على الأقل مسجَّلة في هذه الجلسة)
        exit_game_confirm_msg: "سجّلت إجابات في هذه الجلسة ولم تُحفظ بعد. الخروج الآن سيفقدها نهائياً. هل تريد المتابعة؟",
        notes_on_q: "📝 ملاحظات على السؤال",
        show_ans_match: "👁️ إظهار الإجابة للمطابقة",
        hide_ans: "🙈 إخفاء الإجابة",
        correct_ans_btn: "🟢 إجابة صحيحة تامة",
        record_note_btn: "📝 تسجيل ملاحظة",
        submit_next_btn: "✅ اعتماد والانتقال للسؤال التالي",
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
        record_error_desc: "سجل الملاحظة ثم اضغط (إضافة ومتابعة) ليبقى الطالب في نفس السؤال.",
        err_word: "كلمة تحتاج مراجعة",
        err_multi: "أكتر من نقطة تحتاج مراجعة",
        err_haraka: "حركة تحتاج تصحيح",
        err_forget: "نسيان آية",
        err_dont_know: "لم يعرف الإجابة",
        note_ph: "اكتب ملاحظتك اليدوية هنا (اختياري)...",
        add_err_cont: "➕ إضافة الملاحظة ومتابعة التسميع",
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
        // 🌟 [جديد] نافذة "أرشيف الأخطاء المصححة" في شاشة ملف الطالب — تعرض كل خطأ
        // سابق صحّحه الطالب بدل ما يختفي أثره نهائياً بعد تصحيحه (راجع
        // resolvedWeaknesses في student.js وadultGame.js/kidsGame.js) 🌟
        archive_title: "أرشيف الأخطاء المصححة",
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
        hw_management_title: "نظام إدارة الواجبات 📚",
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
        // 🌟 [جديد] اقتراح نطاق الاختبار تلقائياً بناءً على حفظ الطالب المسجَّل
        hw_memo_suggestion_prefix: "🌟 اقتراحات سريعة بناءً على حفظ الطالب المسجَّل:",
        // 🌟 [جديد] رقاقة اقتراح خاصة لحالة "جزء عم كاملاً" (بدل سورة بسورة)
        hw_memo_suggestion_juz_amma: "جزء عم كاملاً (الجزء 30)",
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
        hw_cloud_sync_warning: "⚠️ تم حفظ الواجب على هذا الجهاز، لكن تعذّر رفعه للسحابة الآن (تحقق من الاتصال بالإنترنت). لن يعمل هذا الرابط إلا على هذا الجهاز حتى تتم إعادة رفعه تلقائياً — يُفضَّل عدم إرساله للطلاب الآن، وإعادة فتح هذه الشاشة لاحقاً للتأكد من نجاح الرفع.",
        hw_copy_btn: "📋 نسخ",
        hw_close_return: "إغلاق والعودة 🏠",
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
        hw_champion_prefix: "البطل:",
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

        // 🌟 [جديد] شاشة "تقرير الإنجاز الشهري" — تجميع الواجبات + الاختبارات الثنائية +
        // الأخطاء المعالَجة + انتظام المراجعة المتباعدة عبر شهر كامل (راجع
        // reports/monthly-report.js ومستند المشروع "تصميم-تقرير-الإنجاز-الشهري-المقترح.md") 🌟
        monthly_report_btn: "📅 تقرير الإنجاز الشهري",
        mr_title: "تقرير إنجاز شهري",
        mr_eyebrow: "دار حم · منصة تحفيظ القرآن الكريم",
        mr_teacher_group_label: "بيانات المعلم",
        mr_teacher_name_ph: "اسم المعلم",
        mr_upload_sig_btn: "رفع توقيع",
        mr_export_group_label: "تصدير",
        mr_export_png: "صورة عالية الجودة",
        mr_export_pdf: "ملف PDF",
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
        mr_note_box_label: "ملاحظة المعلم لولي الأمر — للمتابعة أولًا بأول",
        mr_footer_line1: "دار حم · منصة مراجعة القرآن التفاعلية",
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
        mr_cloud_error: "تعذر الاتصال بالسحابة لجلب درجات الواجبات — تحقق من اتصال الإنترنت وحاول مرة أخرى.",
        mr_auto_note_hw: "سلَّم {name} {n} واجبًا منزليًا هذا الشهر بمتوسط درجات {avg}%.",
        mr_auto_note_dual: "خاض اختبارات ثنائية بنتيجة {w} فوز و{l} خسارة و{t} تعادل.",
        mr_auto_note_errors: "تمت معالجة {n} من الأخطاء المسجَّلة سابقًا.",
        mr_auto_note_empty: "لم يُسجَّل نشاط (واجبات أو اختبارات ثنائية) لـ{name} هذا الشهر.",
        mr_auto_note_memo: "النطاق الحالي المسجَّل لحفظ الطالب: {scope}.",

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

        // 🌟 [جديد بالكامل] لعبة "استمع وخمّن الآية" (ركن الأطفال فقط) — راجع تعليق
        // generateKidsListenAyah في engine/kidsEngine.js لتفاصيل الفكرة الكاملة. عنوان اللعبة
        // فقط له مفتاح i18n حقيقي هنا (نصوص questionBody داخل المحرك نفسه بالعربي مباشرة بلا
        // ترجمة، بنفس أسلوب كل ألعاب kidsEngine.js الأخرى — راجع تعليق الدالة هناك)
        kids_listen_title: "استمع وخمّن الآية يا بطل 🎧",
        kids_listen_audio_error: "تعذّر تشغيل الصوت، تأكد من اتصال الإنترنت وحاول مرة أخرى 🌐",

        // 🌟 [جديد] تعديل بيانات ملف الطالب مباشرة من نفس الشاشة (بدون مودال منفصل) —
        // راجع setupInlineProfileEditing في student/student.js
        prof_edit_hint: "💡 اضغط على أي بيانة لتعديلها مباشرة، ثم استخدم زر \"تقرير الإنجاز الشهري\" للطباعة بعد الانتهاء",
        prof_avatar_change_title: "تغيير الصورة",

        // 🌟 [جديد] نظام "تلميحات الأقسام عند أول دخول" — بطاقات عائمة غير حاجبة (بعكس
        // whats-new-modal الحاجب) تظهر مرة واحدة فقط لكل قسم على هذا الجهاز بالذات (تخزين
        // localStorage فقط، بلا مزامنة سحابية، بنفس فلسفة dh_last_seen_version في core/app.js).
        // راجع components/sectionHint.js ومستند "تصميم نظام تلميحات الأقسام عند أول دخول
        // المقترح" في توثيق المشروع لتفاصيل القرار، وكل الصياغات هنا معتمدة نهائياً من المعلم
        // بالفصحى بعد عدة جولات مراجعة صريحة 🌟
        hint_ok_btn: "حسناً، فهمت 👍",

        hint_general_title: "🌟 مرحباً بك في منصة دار حم",
        hint_general_body: "مرحباً شيخنا، نرحّب بك في منصة دار حم لتحفيظ القرآن الكريم ومراجعته وتقييمه. يمكنك من الصفحة الرئيسية الدخول إلى «واجهة الكبار» أو «ركن الأطفال» للتقييم المباشر، وإدارة سجلات طلابك من «طلابي»، وإرسال الواجبات المنزلية ومتابعتها، بالإضافة إلى تحدي المتشابهات والاختبارات الثنائية. وستظهر لك تنبيهات خاصة بكل قسم عند أول دخول إليه.\nوفي حال رغبتك في اقتراح فكرة إضافية، فلا تتردد في التواصل معنا.",

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
        hint_similarities_body: "الهدف من هذا الركن تعريف الطالب بالآيات المتشابهة وتيسير حفظها، وليس تقييمه رسمياً. تُصحَّح الإجابة فور اختيارها، وفي حال الخطأ تُعرض الإجابة الصحيحة مباشرة، دون احتساب درجة نهائية أو تسجيل ملاحظة في سجل الطالب."
    },
    en: {
        header_title: "🏆 Quran Mastery Journey",
        header_title_kids: "🎈 Little Champions Corner",
        header_subtitle: "Dar Ham Platform",
        login_kids_title: "Heroes Login 🎈",
        login_adults_title: "Login",
        lang_toggle: "العربية",

        // Splash Screen
        splash_title: "Quran Champions",
        splash_subtitle: "Interactive Review & Memorization System 🏆",
        btn_adult: "Adults Interface",
        btn_kids: "Kids Corner",
        btn_dual: "Dual Tests",
        // 🌟 [New] "Similarities Challenge" card on the home screen — the feature itself is
        // still under construction (engine/similarityEngine.js and database/similaritiesDB.js
        // exist as a partial base, but there's no actual gameplay screen yet)
        btn_similarities: "Similarities Challenge",
        btn_my_students: "My Students",
        my_students_title: "My Students",
        my_students_subtitle: "Manage Student Records",
        prep_by: "Prepared by Quran Teacher:",
        teacher_name: "Abdullah Bin Al-Mayyah Al-Azhari",

        // 🌟 New Home Screen: "Why Dar Ham?" section, menu card descriptions & footer 🌟
        why_darham_title: "Why Dar Ham?",
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

        card_adult_desc: "For adult students & individual review",
        card_kids_desc: "A fun, interactive experience for kids",
        card_students_desc: "Manage student records and data",
        card_homework_desc: "Send and track memorization homework",
        // 🌟 [Updated] after the dual-tests basics (setup + real play) were completed, removed
        // "(in development)" from the card description at the teacher's explicit request — see
        // the card's own comment in components/splash.html for the matching badge removal
        card_dual_desc: "A challenge between two students",
        // 🌟 [Updated] used to say "in development" entirely, then browsing became real
        // with no games yet, and now (after building similarities-play.js) the feature is
        // complete: browsing + auto-graded interactive games — description updated to match
        card_similarities_desc: "Browse similar verses across surahs and play interactive games to master them",

        footer_about_title: "About Dar Ham",
        footer_about_text: "An old-new idea for solidifying memorization and review",
        footer_contact: "Contact Us",
        footer_copyright: "© 2026 Dar Ham - All Rights Reserved",

        // Login Screen
        login_subtitle: "Select a registered student to continue",
        search_student_ph: "🔍 Type champion's name to search...",
        btn_quick_login: "Quick Entry for Evaluation 🚀",
        btn_all_students: "📊 General Students Record",
        btn_add_student: "Register New Champion ➕",
        btn_back: "🔙 Back to Main Menu",
        add_new_champion: "Add New Champion",
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
        save_champ: "Save Champion Data ✔️",
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
        kids_range_label: "Questions Range (Tabarak & Amma):",
        kids_q_count: "Number of Games (Questions):",
        btn_start_eval: "🚀 Start Evaluation Now",
        btn_change_student: "🔙 Change Student / Back",
        btn_homework_module: "📝 Homework System",
        bday_notification_title: "🎉 Birthday Alert!",
        bday_notification_msg: "Today is the birthday of champion: ",

        // 🌟 Home screen greeting & teacher profile 🌟
        greeting_morning: "Good morning",
        greeting_evening: "Good evening",
        greeting_title: "Sheikh",
        home_summary_hw_label: "homework(s) currently published",
        profile_badge_text: "Complete your profile 👋",
        profile_modal_title: "Your Profile",
        profile_photo_label: "Profile Photo",
        // 🌟 [New] Optional official stamp/seal upload (used when signing reports) 🌟
        profile_stamp_label: "Seal/Stamp (optional)",
        profile_name_label: "Name:",
        profile_dob_label: "Date of Birth:",
        profile_save_btn: "Save",
        profile_close_btn: "Close",
        teacher_bday_notification_title: "🎉 Happy Birthday!",
        teacher_bday_notification_msg: "Happy birthday, Sheikh ",

        // 🌟 New home screen: hero & "Quick Overview" card 🌟
        hero_eyebrow: "A complete educational platform",
        home_card_homework_title: "Homework System",
        dual_in_progress_badge: "In Progress",
        // 🌟 [Old, no longer used now that the real browsing screens below exist] Kept
        // without deleting to avoid breaking any old reference — the card now uses
        // similarities_browse_badge instead
        similarities_in_progress_badge: "In Progress",
        similarities_toast_soon: "⚔️ The Similarities Challenge is still in development — stay tuned, God willing!",

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
        sim_game_opt_ayah_prefix: "Ayah",
        sim_game_correct_feedback: "🎉 Correct answer!",
        sim_game_wrong_feedback: "❌ Pay closer attention next time",
        sim_game_not_enough_data: "Not enough data to build a game for this group yet",
        sim_game_results_title: "🏆 Your Score This Round",
        sim_game_play_again_btn: "🔁 Play Again",

        // 🌟 [New] "Dual Tests" setup screen — kept fully separate from homework and
        // game screens (explicit teacher request), see dualtests/dual-test-setup.js
        dts_title: "Set Up a Dual Test 🆚",
        dts_back: "Back",
        dts_list_title: "Saved Tests",
        dts_new_test_btn: "+ New Test",
        dts_no_tests: "No saved tests yet. Tap “New Test” to start.",
        dts_status_draft: "Draft",
        dts_status_ready: "Ready ✅",
        dts_edit_btn: "✏️ Edit",
        dts_start_match_btn: "▶️ Start Match",
        dts_delete_btn: "🗑️ Delete",
        dts_delete_confirm: "Delete this test? This cannot be undone.",
        // 🌟 [New] "Past Matches" history modal — see openMatchesHistoryModal in
        // dual-test-setup.js. dtp_view_report_btn is reused for each row's button.
        dts_history_btn: "📜 Past Matches",
        dts_history_modal_title: "This Test's Match History",
        dts_history_close_btn: "Close",
        dts_history_empty: "No finished matches for this test yet.",
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
        dts_add_question_btn: "+ Add Question",
        dts_swap_questions_title: "🔄 Swap Questions (reserve, independent codes)",
        dts_swap_questions_desc: "These are not shown on the question board — used only when a student asks to swap. The student picks whichever code they want from this list.",
        dts_add_swap_btn: "+ Add Swap Question",
        dts_question_number_prefix: "Question",
        // 🌟 [New] Free-text question entry form — teacher writes "from"/"to" fully by hand
        dts_from_label: "Recite from",
        dts_to_label: "To",
        dts_from_placeholder: "e.g. Surah Al-Baqarah, Ayah 1",
        dts_to_placeholder: "e.g. Surah Al-Baqarah, Ayah 10",
        dts_fill_both_fields_alert: "Please write both the “from” and “to” text before adding the question.",
        dts_remove_btn: "Remove",
        dts_save_draft_btn: "💾 Save as Draft",
        dts_save_ready_btn: "✅ Save as Ready",
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
        dts_step1_heading: "1) Competitors & Each Round's Range",
        dts_step1_hint: "Pick the surah the two students will be tested on in each round (the whole surah). You can change this later anytime from the “✏️ Edit” button.",
        dts_step1_next_btn: "Next: Choose Round ▶️",
        dts_step2_heading: "2) Choose the Round You Want to Prepare",
        dts_step2_hint: "Pick any round to add or review its questions now. You can come back and pick another round anytime.",
        dts_step2_back_btn: "⬅️ Back to Range",
        dts_step3_back_btn: "⬅️ Back to Round Selection",
        dts_range_not_set: "Not set yet",
        dts_round_range_summary_label: "This round's range:",
        dts_edit_range_btn: "✏️ Edit",

        // 🌟 [New] Live play screen dualtests/dual-test-play.js
        // 🌟 [New] Periodic autosave for the in-progress round — see the persistInProgressRound
        // comment in dual-test-play.js for the full idea
        dtp_round_restored_toast: "✅ Round progress restored after the refresh",
        dtp_round_label: "Round {n} of 3",
        dtp_start_round_btn: "🚀 Start Round",
        dtp_coin_flip_start_msg: "🎲 Who starts?...",
        dtp_coin_flip_result_msg: "Starting: {name} 🎉",
        dtp_end_round_manual_btn: "⏹️ End Round Now Manually",
        dtp_question_turn_label: "Turn: {name}",
        dtp_btn_mistake: "❌ Log Mistake",
        dtp_btn_helper: "💡 Hint",
        dtp_btn_swap: "🔄 Swap",
        dtp_btn_finish: "✅ Confirm Answer",
        dtp_mistakes_count_label: "Mistakes logged for this question: {n}",
        // 🌟 [New] Each question is worth 10 points; the live expected score shows before confirming
        dtp_current_points_label: "Current score for this question: {score} of {max}",
        dtp_result_title: "✅ Question Result",
        dtp_result_points_of_label: "Score",
        dtp_result_mistakes_label: "Mistakes",
        dtp_result_deduction_label: "Deduction",
        dtp_result_helper_label: "Used Hint",
        dtp_result_continue_btn: "Continue ▶️",
        dtp_yes: "Yes ✅",
        dtp_no: "No",
        dtp_no_swap_available_alert: "No swap code is available in this round right now.",
        dtp_swap_modal_title: "Choose a Swap Question Code",
        dtp_swap_modal_desc: "This time only — pick any available code.",
        dtp_summary_title: "Round {n} Result",
        dtp_winner_label: "Round winner: {name} 🏆",
        dtp_tie_label: "Round tied 🤝",
        dtp_next_round_btn: "Next ▶️",
        dtp_view_final_btn: "View Final Result 🏁",
        dtp_final_title: "🏆 Final Result",
        dtp_final_winner_label: "Winner: {name} 🏆🎉",
        dtp_final_tie_label: "Champions' Tie 🤝",
        dtp_final_rounds_label: "Rounds won: {n}",
        dtp_final_points_label: "Total points: {n}",
        dtp_final_back_btn: "🏠 Back to Home",
        // 🌟 [New] Opens the full match report from the final result screen, also reused for
        // each row in the "Past Matches" modal (dual-test-setup.js) — see
        // reports/dual-test-report.js. This key was already referenced in dual-test-play.html
        // (data-i18n="dtp_view_report_btn") but was missing here — now fixed.
        dtp_view_report_btn: "📄 View Match Report",
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
        home_quickview_title: "Quick Overview",
        home_bday_today: "It's {name}'s birthday today",
        home_mastery_avg_label: "Overall average mastery",
        home_mastery_avg_sub: "Based on the latest evaluations",
        home_mastery_no_data: "Not enough data yet",
        home_reports_count_label: "Evaluations & reports issued this month",
        home_quick_publish_btn: "Publish New Homework Now",
        // 🌟 New: spaced-repetition system (Anki/Duolingo) — "due today" list
        home_due_title: "Due for review today",
        home_due_no_range: "No memorization range on file",
        home_due_overdue_by: "Overdue by",
        home_due_days_unit: "day(s)",
        home_due_today: "Today",
        // 🌟 New: monthly reminder to update students' memorization data (home banner)
        home_memo_reminder_text: "Time to review and update each student's memorization range for anyone who's progressed this month 📖",
        home_memo_reminder_btn: "Update Now",
        home_memo_reminder_notif_title: "📖 Monthly Reminder: Update Memorization Data",
        home_memo_reminder_notif_body: "Review each student's memorization range (from - to) and update it for anyone who progressed this month",

        // Games (Adult & Kids) HTML
        eval_path: "Comprehensive Evaluation Path",
        exit_game: "🚪 Exit and End",
        // 🌟 [New] Confirmation message before exiting an evaluation session that already has
        // recorded answers — mirrors the confirm() used in dualtests/dual-test-play.js when
        // leaving a live match, to prevent losing a whole evaluation with one accidental click.
        exit_game_confirm_msg: "You've recorded answers in this session that haven't been saved yet. Leaving now will lose them permanently. Continue?",
        notes_on_q: "📝 Notes on Question",
        show_ans_match: "👁️ Show Answer for Matching",
        hide_ans: "🙈 Hide Answer",
        correct_ans_btn: "🟢 Completely Correct Answer",
        record_note_btn: "📝 Record Note",
        submit_next_btn: "✅ Confirm & Move to Next",
        order_inst: "Click an Ayah to move it. To return it, click it in the correct order",
        correct_order: "Correct Order",
        shuffled_ayahs: "Shuffled Ayahs",
        right_page: "(Right Page)",
        left_page: "(Left Page)",
        close_zoom: "✖️ Close Zoom",
        // 🌟 [تعديل] نفس تخفيف الصياغة في النسخة العربية — بديل أهدأ لكلمة "Error" 🌟
        record_error_title: "Record a Temporary Note",
        record_error_desc: "Record the note then click (Add & Continue) to keep the student on the same question.",
        err_word: "Word Needs Review",
        err_multi: "Multiple Points to Review",
        err_haraka: "Vowel/Haraka Needs Correction",
        err_forget: "Forgot Ayah",
        err_dont_know: "Didn't Know Answer",
        note_ph: "Write your manual note here (optional)...",
        add_err_cont: "➕ Add Note & Continue Reciting",
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
        hw_management_title: "Homework Management System 📚",
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
        // 🌟 New: auto-suggested range based on the student's registered memorization
        hw_memo_suggestion_prefix: "🌟 Quick suggestions based on this student's registered memorization:",
        // 🌟 New: special suggestion chip for the "whole Juz Amma" case (instead of surah-by-surah)
        hw_memo_suggestion_juz_amma: "Whole Juz Amma (Part 30)",
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
        hw_cloud_sync_warning: "⚠️ The homework was saved on this device, but uploading it to the cloud failed just now (check your internet connection). This link will only work on this device until it's re-uploaded automatically — it's best not to send it to students yet; reopen this screen later to confirm the upload succeeded.",
        hw_copy_btn: "📋 Copy",
        hw_close_return: "Close & Return 🏠",
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
        hw_champion_prefix: "Champion:",
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

        // 🌟 [New] "Monthly Achievement Report" screen — aggregates homework + dual tests +
        // resolved mistakes + spaced-review consistency over a full month (see
        // reports/monthly-report.js) 🌟
        monthly_report_btn: "📅 Monthly Achievement Report",
        mr_title: "Monthly Achievement Report",
        mr_eyebrow: "Dar Ham · Quran Memorization Platform",
        mr_teacher_group_label: "Teacher Info",
        mr_teacher_name_ph: "Teacher name",
        mr_upload_sig_btn: "Upload signature",
        mr_export_group_label: "Export",
        mr_export_png: "High-quality image",
        mr_export_pdf: "PDF file",
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
        mr_note_box_label: "Teacher's note to the parent — for ongoing follow-up",
        mr_footer_line1: "Dar Ham · Interactive Quran Review Platform",
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
        mr_cloud_error: "Could not reach the cloud to fetch homework scores — check your internet connection and try again.",
        mr_auto_note_hw: "{name} submitted {n} homework assignments this month with an average score of {avg}%.",
        mr_auto_note_dual: "Played dual tests with a record of {w} win(s), {l} loss(es), and {t} tie(s).",
        mr_auto_note_errors: "{n} previously recorded mistake(s) were resolved.",
        mr_auto_note_empty: "No activity (homework or dual tests) was recorded for {name} this month.",
        mr_auto_note_memo: "Student's currently registered memorization range: {scope}.",

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

        // 🌟 [جديد بالكامل] "Listen and Guess the Ayah" game (kids corner only)
        kids_listen_title: "Listen and Guess the Ayah, Champ! 🎧",
        kids_listen_audio_error: "Couldn't play the audio — check your internet connection and try again 🌐",

        // 🌟 [New] Inline editing of the student profile screen (no separate modal) —
        // see setupInlineProfileEditing in student/student.js
        prof_edit_hint: "💡 Click any info to edit it directly, then use the \"Monthly Achievement Report\" button to print once you're done",
        prof_avatar_change_title: "Change photo",

        // 🌟 [New] "Section hints on first entry" system — see the matching Arabic block above
        // for the full rationale comment; English strings mirror the teacher-approved Arabic
        // wording in meaning, not a literal word-for-word translation
        hint_ok_btn: "Alright, got it 👍",

        hint_general_title: "🌟 Welcome to Dar Ham",
        hint_general_body: "Welcome, Sheikh. We are pleased to welcome you to the Dar Ham platform for memorizing, reviewing, and evaluating the Holy Quran. From the home screen you can open the Adults Interface or the Kids Corner for direct evaluation, manage your students' records from My Students, and send and track homework, in addition to the Similarities Challenge and the Dual Tests. Each section will show you its own notes the first time you open it.\nIf you would like to suggest an idea, please do not hesitate to contact us.",

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
        hint_similarities_body: "The purpose of this corner is to introduce the student to similar verses and make them easier to memorize, not to formally evaluate the student. The answer is corrected as soon as it is chosen, and if wrong, the correct answer is shown immediately, without a final score or a note being recorded in the student's file."
    }
};

export function t(key) {
    const lang = AppState.currentLang;
    if (translations[lang] && translations[lang][key]) {
        return translations[lang][key];
    }
    return key;
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