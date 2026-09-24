// =============================================================================
// reports/report.styles.js
// تنسيق شاشة التقرير بالكامل — مفصول عن report.js في ملف مستقل بدل تضخيم
// الملف الرئيسي بمئات أسطر CSS داخل نص جافاسكريبت. report.js يستورد
// REPORT_STYLES ويحقنها داخل وسم <style> بنفس الطريقة تمامًا كما كانت
// مضمَّنة سابقًا — لا تغيير في آلية التحميل أو في النتيجة المعروضة، فقط
// تنظيم أوضح لمكان وجود كل جزء من الكود.
//
// 🌟 [إعادة تصميم كاملة] "تقرير تقدّم الطالب" — بناءً على تصميم مرجعي اعتمده المعلم
// (راجع مستند المشروع "تصميم-تقرير-التقييم-الفردي-الجديد.md"). أهم الفروق عن التصميم
// السابق:
//   1) ترويسة مزخرفة بصور حقيقية من assets/report/ (مصحف على رحل + نجمة ثمانية +
//      زخرفة أركان) بدل الزخارف الخطية البسيطة، وحُذف الإطار الذهبي الرفيع
//      (.page::before سابقًا) لأن الزخارف وحدها هي التي تصنع البرواز في التصميم المعتمد.
//   2) بطاقة طالب مستقلة (صورة + اسم + الصف + نطاق الحفظ + مدة التقييم) بجانب
//      دائرة النسبة، بدل صف بيانات صغير أعلى الصفحة.
//   3) "سُلّم التقدّم" بمحطات نجمية بدل أعمدة رسم بيانية.
//   4) جدول أسئلة بأعمدة (م / الاستجابة / السؤال / الدرجة / ملاحظة) بدل قائمة بطاقات.
//      ⚠️ الجدول مبني بـ CSS Grid لا بوسم <table> — عمدًا: خوارزمية تقسيم PDF في
//      report.js تعتمد على عناصر .pdf-block وقياس getBoundingClientRect لكل منها،
//      وصفوف <tr> داخل جدول حقيقي تجعل هذا القياس أقل قابلية للتنبؤ عبر المتصفحات.
//   5) اللون الأساسي للنتيجة صار أخضر الهوية (--dh-emerald) بدل الذهبي البُني،
//      والذهبي (--dh-gold) صار للنجوم والزخارف فقط.
//
// 🌟 نطاق "dh-brief": عند تصدير الصورة فقط، يضيف report.js الكلاس dh-brief على
// #report-page فيختفي كل ما هو .pdf-only (جدول الأسئلة) من الـ DOM الحقيقي — راجع
// تعليق exportPng في report.js لسبب عدم استخدام ignoreElements هنا.
// =============================================================================
export const REPORT_STYLES = `
  #report-screen{font-family:'Cairo',sans-serif;}
  #report-screen *{box-sizing:border-box;}

  /* ============== أدوات التحكم أعلى الشاشة (لا تظهر في الصورة/الملف) ============== */
  #report-screen .report-toolbar{
    display:flex; align-items:center; justify-content:center; gap:10px;
    padding:12px 16px; background:#2b2620; flex-wrap:wrap; border-radius:12px 12px 0 0;
  }
  #report-screen .grp{display:flex; align-items:center; gap:8px; padding-inline-end:12px; border-inline-end:1px solid #46403690;}
  #report-screen .grp:last-child{border-inline-end:none; padding-inline-end:0;}
  #report-screen .grp-label{color:#8f8674; font-size:10.5px; font-weight:700; margin-inline-end:4px;}
  #report-screen .chip{
    font-family:'Cairo',sans-serif; font-weight:700; font-size:12.5px; cursor:pointer;
    background:transparent; color:#c2b393; border:1px solid #4d4738; border-radius:999px;
    padding:7px 14px; transition:.15s ease;
  }
  #report-screen .chip:hover{border-color:#c9932f;}
  #report-screen .rbtn{
    display:inline-flex; align-items:center; gap:7px;
    background:#f9f4ea; color:#2b2620; border:none;
    font-family:'Cairo',sans-serif; font-weight:800; font-size:12.5px;
    padding:9px 16px; border-radius:9px; cursor:pointer; white-space:nowrap;
  }
  #report-screen .rbtn.primary{background:#c9932f;}
  #report-screen .rbtn.ghost{background:transparent; color:#f3ede1; border:1px solid #55503f;}
  #report-screen .rbtn[disabled]{opacity:.6; cursor:wait;}
  #report-screen .rbtn svg{flex:none;}
  #report-screen .teacher-name-input{
    font-family:'Cairo',sans-serif; font-size:12.5px; font-weight:700;
    background:#3a352a; border:1px solid #55503f; border-radius:8px;
    padding:8px 12px; color:#f3ede1; width:150px;
  }
  #report-screen .teacher-name-input::placeholder{color:#8f8674;}

  #report-screen .note-bar{
    display:flex; align-items:center; gap:10px; padding:10px 16px;
    background:#332d24; border-top:1px solid #46403690;
  }
  #report-screen .note-bar label{color:#c2b393; font-size:11.5px; font-weight:700; flex:none;}
  #report-screen .note-bar textarea{
    flex:1; resize:vertical; min-height:34px; max-height:110px;
    font-family:'Cairo',sans-serif; font-size:12.5px; font-weight:600;
    background:#f9f4ea; border:1px solid #55503f; border-radius:8px;
    padding:8px 12px; color:#2b2620;
  }
  #report-screen .note-bar .hint{color:#8f8674; font-size:10px; font-weight:600; flex:none;}

  #report-screen .report-stage{display:flex; justify-content:center; padding:36px 16px 60px; background:#e9e4d8; border-radius:0 0 12px 12px;}

  /* ============== إطار الصفحة ============== */
  #report-screen .page{
    width:720px; max-width:100%;
    color:#2b2620; background:#f9f4ea;
    padding:44px 46px 34px; position:relative;
    box-shadow:0 10px 40px rgba(0,0,0,0.12);
  }
  /* 🌟 زخرفة الأركان — صورة واحدة معكوسة بالـ CSS على الأركان الأربعة.
     الصورة معدّة أصلاً لاتجاه الركن العلوي الأيمن، فبقية الأركان انعكاسات منها. */
  #report-screen .corner-orn{position:absolute; width:46px; height:auto; opacity:.9; pointer-events:none;}
  #report-screen .corner-orn.tr{top:14px; right:14px;}
  #report-screen .corner-orn.tl{top:14px; left:14px; transform:scaleX(-1);}
  #report-screen .corner-orn.br{bottom:14px; right:14px; transform:scaleY(-1);}
  #report-screen .corner-orn.bl{bottom:14px; left:14px; transform:scale(-1,-1);}

  /* ألوان الفئة (تُطبَّق على العنصر الأب #report-stage-inner) — قيم ثابتة
     محسوبة مسبقًا (بلا color-mix()) لأن html2canvas لا يدعم تحليلها.
     ⚠️ المستويات أربعة فقط ومطابقة حرفيًا لـ getTier() في report.js — لم تُغيَّر
     حدودها إطلاقًا في إعادة التصميم، فقط ألوانها: الأعلى صار أخضر الهوية بدل
     الذهبي البُني، والأدنى بقي على تدرّجه الدافئ ثم الأحمر البُني. */
  #report-stage-inner.tier-excellent{ --tacc:#0d5c46; --tacc-bg:#e8f1ec; --tacc-bd:#bcd8c9; }
  #report-stage-inner.tier-good{ --tacc:#147c5e; --tacc-bg:#e8f1ec; --tacc-bd:#bcd8c9; }
  #report-stage-inner.tier-average{ --tacc:#b8863b; --tacc-bg:#f7efdd; --tacc-bd:#e6d2a4; }
  #report-stage-inner.tier-weak{ --tacc:#a15230; --tacc-bg:#f6e8e6; --tacc-bd:#e0bcb5; }

  /* ============== الترويسة ============== */
  /* الحشو الجانبي هنا ليس زخرفيًا: هو ما يضمن ألّا يلامس نص العنوان رسمة المصحف
     على اليسار ولا النجمة على اليمين مهما طال العنوان أو اختلف الخط. */
  #report-screen .dh-head{
    position:relative; text-align:center;
    padding-block:8px 20px; padding-inline:104px; min-height:118px;
  }
  #report-screen .head-art{position:absolute; top:-6px; left:-24px; width:158px; height:auto;}
  #report-screen .head-star{position:absolute; top:8px; right:-10px; width:76px; height:auto;}
  /* ⚠️ بلا letter-spacing إطلاقًا على أي نص عربي هنا.
     السبب حقيقي لا تجميلي: html2canvas (المستخدَم في تصدير الصورة والـ PDF) يرسم النص
     حرفًا حرفًا حين يجد letter-spacing غير صفري، وتقطيع النص العربي إلى حروف منفصلة
     يُفقده التشكيل السياقي (الوصل بين الحروف)، فتخرج العبارة في الملف المطبوع مفكّكة
     ومقلوبة الترتيب بينما تبدو سليمة تمامًا على الشاشة — وهو بالضبط ما حدث في سطر
     "دار حم · منصة تحفيظ القرآن الكريم" أعلى التقرير. */
  #report-screen .eyebrow{font-size:11.5px; font-weight:700; color:#a79a83;}
  #report-screen .r-title{
    font-family:'Amiri',serif; font-weight:700; font-size:38px; line-height:1.15;
    color:#0b3d30; margin:6px 0 0;
  }
  #report-screen .r-subtitle{font-family:'Amiri',serif; font-size:22px; font-weight:700; color:#2b2620; margin-top:2px;}
  #report-screen .r-tagline{
    display:inline-flex; align-items:center; gap:12px; margin-top:12px;
    font-size:13px; font-weight:600; color:#a79a83;
  }
  #report-screen .r-tagline::before, #report-screen .r-tagline::after{
    content:''; width:34px; height:1px; background:#c9932f; opacity:.6;
  }

  /* ============== بطاقة الطالب + دائرة النسبة ============== */
  #report-screen .top-row{display:flex; gap:18px; align-items:stretch; margin-bottom:16px; flex-wrap:wrap;}

  #report-screen .student-card{
    flex:1 1 300px; background:#fffdf8; border:1px solid #e4d9c4;
    border-radius:18px; padding:18px 20px;
    display:flex; align-items:center; gap:16px;
  }
  #report-screen .avatar-wrap{position:relative; flex:none;}
  #report-screen .avatar-circle{
    width:82px; height:82px; border-radius:50%; overflow:hidden;
    background:#e8f1ec; border:3px solid #147c5e; cursor:pointer;
    box-shadow:0 0 0 4px #fffdf8, 0 0 0 5px #e4d9c4;
    display:flex; align-items:center; justify-content:center;
    font-family:'Amiri',serif; font-size:31px; font-weight:700; color:#0d5c46;
    transition:.15s ease;
  }
  #report-screen .avatar-circle.drag-over{box-shadow:0 0 0 4px rgba(20,124,94,0.35);}
  #report-screen .avatar-circle img{width:100%; height:100%; object-fit:cover;}
  #report-screen .avatar-edit-btn{
    position:absolute; bottom:-2px; left:-2px; width:24px; height:24px; border-radius:50%;
    background:#0b3d30; border:2px solid #fffdf8; color:#f3ede1;
    display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0;
  }
  #report-screen .student-body{flex:1; min-width:0;}
  #report-screen .student-name{font-size:23px; font-weight:800; color:#2b2620; line-height:1.3;}
  /* كل سطر بيانات اختياري بالكامل: report.js يخفيه (display:none) إن لم تكن قيمته مسجّلة */
  #report-screen .fact{
    display:flex; align-items:flex-start; gap:9px; margin-top:8px;
    font-size:13.5px; font-weight:600; color:#6b6252; line-height:1.6;
    padding-top:8px; border-top:1px solid #efe9e0;
  }
  #report-screen .fact.is-first{border-top:none; padding-top:0;}
  #report-screen .fact svg{flex:none; margin-top:2px;}
  #report-screen .fact span{flex:1; min-width:0;}
  #report-screen .fact b{color:#2b2620; font-weight:700;}

  #report-screen .gauge-card{
    flex:0 0 206px; background:#fffdf8; border:1px solid #e4d9c4;
    border-radius:18px; padding:14px 8px 15px;
    display:flex; flex-direction:column; align-items:center; justify-content:center; gap:9px;
  }
  #report-screen .gauge-wrap{position:relative; width:158px; height:158px;}
  #report-screen .gauge-center{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;}
  #report-screen .gauge-stars{display:flex; gap:4px; margin-bottom:4px;}
  #report-screen .gauge-pct{font-size:40px; font-weight:800; line-height:1; color:var(--tacc);}
  #report-screen .gauge-tier{
    font-size:13px; font-weight:800; color:#fffdf8; background:var(--tacc);
    padding:4px 14px; border-radius:999px; margin-top:6px; white-space:nowrap;
  }
  #report-screen .gauge-arc{stroke:var(--tacc); transition:stroke .2s ease;}
  #report-screen .gauge-foot{display:flex; flex-direction:column; align-items:center; gap:7px;}
  #report-screen .gauge-label{
    font-size:12.5px; font-weight:700; color:var(--tacc);
    background:var(--tacc-bg); border:1px solid var(--tacc-bd); border-radius:999px; padding:5px 16px;
  }
  /* 🌟 فرق النتيجة عن المحاولة السابقة — يبقى مخفيًا تمامًا ما لم يوجد سجل سابق فعلي */
  #report-screen .delta{
    display:inline-flex; align-items:center; gap:5px;
    font-size:11.5px; font-weight:800; padding:4px 11px; border-radius:999px; border:1px solid;
  }
  #report-screen .delta.up{background:#e8f1ec; color:#10694c; border-color:#bcd8c9;}
  #report-screen .delta.down{background:#f6e8e6; color:#9e3b2d; border-color:#e0bcb5;}
  #report-screen .delta.flat{background:#f3ece0; color:#6b6252; border-color:#e4d9c4;}

  #report-screen .honesty-line{
    font-size:14.5px; font-weight:700; color:#2b2620; margin:0 0 18px;
    text-align:center; line-height:1.8;
  }

  /* ============== عناوين الأقسام ============== */
  #report-screen .sec-head{display:flex; align-items:baseline; justify-content:space-between; gap:12px; flex-wrap:wrap; margin-bottom:4px;}
  #report-screen .section-title{font-size:16.5px; font-weight:800; color:#2b2620; margin:0;}
  #report-screen .section-sub{font-size:12px; color:#a79a83; font-weight:600; margin:0;}

  /* ============== سُلّم التقدّم ============== */
  #report-screen .ladder-card{
    background:#fffdf8; border:1px solid #e4d9c4; border-radius:18px;
    padding:18px 22px 16px; margin-bottom:18px;
  }
  #report-screen .ladder{display:flex; align-items:flex-start; margin-top:16px;}
  #report-screen .step{flex:1 1 0; display:flex; flex-direction:column; align-items:center; gap:7px; text-align:center; min-width:0;}
  #report-screen .step-dot{
    width:42px; height:42px; border-radius:50%; flex:none;
    display:flex; align-items:center; justify-content:center;
    border:3px solid #fffdf8; box-shadow:0 0 0 2px currentColor;
  }
  /* المحطة الحالية تتميّز بحلقة ذهبية لا بلون مختلف — تمييز زمني لا تمييز مستوى.
     ⚠️ مقصود: تلوين كل محطة بلون مختلف يوحي بأربعة مستويات مختلفة قد لا تكون موجودة
     فعلاً (ثلاث محاولات في نفس المستوى تأخذ نفس اللون بالضرورة). */
  #report-screen .step.is-current .step-dot{box-shadow:0 0 0 2px currentColor, 0 0 0 6px rgba(212,175,55,.35);}
  #report-screen .step.is-current .step-when{font-weight:800; color:#2b2620;}
  #report-screen .step-when{font-size:12.5px; font-weight:700; color:#6b6252; line-height:1.45;}
  #report-screen .step-when span{display:block; font-size:11.5px; color:#a79a83; font-weight:600;}
  #report-screen .step-tier{font-size:12px; font-weight:800;}
  #report-screen .conn-cell{flex:0 1 46px; display:flex; align-items:center; justify-content:center; margin-top:19px;}
  #report-screen .conn-cell i{display:block; width:100%; height:2px; background:#e4d9c4; border-radius:2px;}
  #report-screen .ladder-empty{
    font-size:12.5px; font-weight:600; color:#a79a83; text-align:center; margin:14px 0 2px;
  }

  /* ============== جدول الأسئلة (يظهر في PDF فقط) ============== */
  #report-screen .qlist{
    background:#fffdf8; border:1px solid #e4d9c4; border-radius:18px;
    padding:18px 22px 14px; margin-bottom:18px;
  }
  /* جدول مبني بـ Grid لا بوسم <table> — راجع تعليق أعلى الملف للسبب */
  #report-screen .qgrid-head, #report-screen .qrow{
    display:grid; grid-template-columns:34px 58px 1fr 68px 132px; align-items:start; gap:10px;
  }
  #report-screen .qgrid-head{
    background:#f3ece0; border-radius:9px; padding:10px; margin-top:14px;
    font-size:12.5px; font-weight:700; color:#6b6252; text-align:center;
  }
  /* الفاصل border-top لا border-bottom عمدًا: أول صف يعيش في حاوية منفصلة
     (#report-qrow-first، حتى يبقى ملتصقًا بترويسة الجدول عند تقسيم صفحات PDF)،
     فلو كان الفاصل أسفل الصف لاختفى فاصل الصف الأول لأنه last-child في حاويته. */
  #report-screen .qrow{padding:11px 10px; border-top:1px solid #efe9e0; font-size:13px;}
  #report-screen #report-qrow-first .qrow{border-top:none;}
  #report-screen .qrow.is-partial{background:#faf3e4; border-radius:8px;}
  #report-screen .qrow.is-wrong{background:#fbf0ee; border-radius:8px;}
  #report-screen .qnum{text-align:center; font-weight:700; color:#8a726b;}
  #report-screen .qicon{display:flex; justify-content:center;}
  #report-screen .qsubject{min-width:0;}
  #report-screen .qtype{font-size:11.5px; font-weight:700; color:#a79a83;}
  #report-screen .qloc{font-size:13px; font-weight:700; color:#2b2620; margin-top:2px;}
  /* خط 'Amiri Quran' موحَّد مع class="quran-text" بباقي المنصة حتى تظهر نصوص الآيات
     في التقرير المُصدَّر بنفس رسم المصحف (رموز الرسم العثماني لا يدعمها Amiri العادي) */
  #report-screen .qtext{font-family:'Amiri Quran',serif; font-size:15px; color:#4a4238; margin-top:4px; line-height:1.75;}
  #report-screen .qscore{text-align:center; font-weight:800; white-space:nowrap;}
  #report-screen .qnote{font-size:12px; font-weight:600; color:#8a726b; line-height:1.6;}
  #report-screen .qempty{text-align:center; color:#a79a83; font-size:14.5px; padding:18px 0;}

  /* ============== شرائط العدّ ============== */
  /* ⚠️ خارج بطاقة الجدول عمدًا: لو بقيت داخلها لاختفت مع الجدول في وضع الصورة المختصرة */
  #report-screen .chips-row{display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap;}
  #report-screen .chip-status{
    flex:1 1 170px; display:flex; align-items:center; justify-content:center; gap:8px;
    padding:11px 14px; border-radius:12px; border:1px solid;
    font-size:13.5px; font-weight:800; white-space:nowrap;
  }
  #report-screen .chip-full{background:#e8f1ec; border-color:#bcd8c9; color:#10694c;}
  #report-screen .chip-partial{background:#f7efdd; border-color:#e6d2a4; color:#a07a1c;}
  #report-screen .chip-wrong{background:#f6e8e6; border-color:#e0bcb5; color:#9e3b2d;}

  /* ============== شريط الإحصائيات ============== */
  #report-screen .stat-line{
    display:flex; flex-wrap:wrap; gap:8px 22px; justify-content:center;
    padding:11px 16px; margin-bottom:18px;
    background:#fffdf8; border:1px solid #e4d9c4; border-radius:12px;
  }
  #report-screen .stat-item{display:flex; align-items:center; gap:7px; font-size:12.5px; color:#6b6252; font-weight:600;}
  #report-screen .stat-item svg{flex:none;}
  #report-screen .stat-item b{color:#2b2620; font-weight:800;}

  /* ============== نقاط القوة / بحاجة إلى تركيز ============== */
  #report-screen .insights{display:flex; gap:14px; margin-bottom:18px; flex-wrap:wrap;}
  #report-screen .insight-card{flex:1 1 250px; border-radius:18px; padding:16px 20px 18px; border:1px solid;}
  #report-screen .insight-card.good{background:#eef5f1; border-color:#c6dcd0;}
  #report-screen .insight-card.focus{background:#f8eeec; border-color:#e5c8c1;}
  #report-screen .insight-head{display:flex; align-items:center; gap:9px; padding-bottom:11px; margin-bottom:11px; border-bottom:1px solid rgba(0,0,0,.07);}
  #report-screen .insight-title{font-size:15px; font-weight:800;}
  #report-screen .insight-card.good .insight-title{color:#10694c;}
  #report-screen .insight-card.focus .insight-title{color:#9e3b2d;}
  #report-screen .insight-list{margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:9px;}
  #report-screen .insight-item{display:flex; align-items:flex-start; gap:9px; font-size:13.5px; color:#2b2620; line-height:1.65; font-weight:600;}
  /* الأيقونة تأتي من renderInsights في report.js (SVG لكل بند) — لم نستبدلها بنقطة
     CSS حتى لا نكسر عرض بنود "بحاجة إلى تركيز" المعاد تصميمه 🌟 */
  #report-screen .insight-item svg{flex:none; margin-top:3px;}

  /* 🌟 عنوان فرعي داخل بطاقة "بحاجة إلى تركيز" يوضّح مصدر كل مجموعة بنود
     (أخطاء اليوم / يحتاج تثبيتًا / متابعة سابقة)، وسطر يذكر عدد البنود الفائضة عن
     السقف — قواعد أضيفت مع إعادة تصميم ذلك الصندوق، محفوظة كما هي هنا بعد إعادة
     تصميم التقرير، مع تحديث ألوانها لتناسب خلفية البطاقة الجديدة فقط 🌟 */
  /* بلا letter-spacing — نفس سبب .eyebrow أعلاه بالضبط */
  #report-screen .insight-sub{list-style:none; font-size:11.5px; font-weight:800; color:#9e3b2d; opacity:.85; margin-top:4px;}
  #report-screen .insight-list .insight-sub:first-child{margin-top:0;}
  #report-screen .insight-more{list-style:none; font-size:12px; font-weight:700; color:#8a726b; background:rgba(255,253,248,.75); border:1px solid rgba(0,0,0,.06); border-radius:6px; padding:5px 9px; align-self:flex-start;}

  /* ============== ملاحظة المعلم لولي الأمر ============== */
  #report-screen .note-box{
    background:#f7f2e5; border:1px solid #e4d9c4; border-radius:18px;
    padding:18px 22px 20px; margin-bottom:18px; position:relative;
  }
  #report-screen .note-box::before{content:''; position:absolute; top:0; right:24px; left:24px; height:3px; background:#d4af37; border-radius:0 0 3px 3px;}
  #report-screen .note-head{display:flex; align-items:center; gap:9px; margin-bottom:10px;}
  #report-screen .note-label{font-size:14.5px; font-weight:800; color:#0b3d30;}
  #report-screen .note-text{font-family:'Amiri',serif; font-size:17.5px; line-height:1.95; color:#2b2620; margin:0; text-align:center;}

  /* ============== الختم والتوقيع والتذييل ============== */
  #report-screen .closing{
    margin-top:8px; padding-top:20px; border-top:1px solid #e4d9c4;
    display:flex; align-items:flex-end; justify-content:space-between; gap:20px; flex-wrap:wrap;
  }
  #report-screen .footer-meta{font-size:12px; color:#a79a83; font-weight:600; line-height:2;}
  #report-screen .footer-meta b{color:#6b6252; font-weight:700;}
  /* 🌟 ختم المعلم الرسمي — الصورة التي يرفعها المعلم في "ملف المعلم" (teacherDB.stamp)،
     فوق سطر الاسم مباشرة. الحاوية كلها تُخفى من جافاسكريبت إن لم يرفع المعلم ختمًا،
     فلا يبقى أي فراغ أعلى الاسم في الصورة أو الـ PDF.
     ⚠️ بلا background ولا border ولا border-radius: الختم صورة شفافة يجب أن تجلس على
     ورق التقرير مباشرة — أي خلفية هنا ستعيد إنتاج "المربع" الذي أصلحناه أصلاً. */
  #report-screen .stamp-wrap{display:flex; align-items:flex-end; justify-content:center; margin-bottom:6px;}
  #report-screen .stamp-img{
    display:block; max-height:96px; max-width:180px; width:auto; height:auto;
    object-fit:contain; background:none; border:none;
  }
  #report-screen .sign{text-align:center; min-width:190px;}
  #report-screen .sign-line{border-bottom:1.4px solid #cdbf9f; height:8px; min-width:190px;}
  #report-screen .sign-name{font-family:'Amiri',serif; font-weight:700; font-size:15.5px; color:#0b3d30; margin-top:7px;}
  #report-screen .teacher-label{font-size:11.5px; color:#a79a83; font-weight:700; margin-top:3px;}

  #report-screen .home-bar{display:flex; justify-content:center; padding:18px 16px 0;}
  #report-screen .home-btn{
    display:inline-flex; align-items:center; gap:8px;
    background:#2b2620; color:#f3ede1; border:none;
    font-family:'Cairo',sans-serif; font-weight:800; font-size:13.5px;
    padding:11px 22px; border-radius:10px; cursor:pointer;
  }
  #report-screen .home-btn:hover{background:#3a352a;}

  /* ============== وضع الصورة المختصرة ==============
     يُفعَّل للحظات فقط أثناء التقاط PNG ثم يُزال فورًا (راجع exportPng في report.js).
     نستخدم display:none على الـ DOM الحقيقي — لا ignoreElements — حتى يُعاد التخطيط
     فعليًا فلا يبقى فراغ أبيض أسفل الصورة بمقدار ارتفاع الجدول المحذوف. */
  #report-screen .page.dh-brief .pdf-only{display:none !important;}

  @media (max-width:760px){
    #report-screen .page{padding:30px 18px 26px;}
    #report-screen .r-title{font-size:28px;}
    #report-screen .r-subtitle{font-size:18px;}
    #report-screen .dh-head{padding-inline:0; min-height:0;}
    #report-screen .head-art{position:static; display:block; width:140px; margin-inline:0 auto; margin-bottom:4px;}
    #report-screen .head-star{display:none;}
    #report-screen .gauge-card{flex:1 1 100%;}
    #report-screen .ladder{flex-wrap:wrap; gap:16px 0;}
    #report-screen .step{flex:1 1 50%;}
    #report-screen .conn-cell{display:none;}
    /* الجدول أضيق من أن يُعرض بخمسة أعمدة على الجوال — يُمرَّر أفقيًا داخل حاويته وحده */
    #report-screen .qlist{overflow-x:auto;}
    #report-screen .qgrid-head, #report-screen .qrow{min-width:560px;}
    #report-screen .closing{flex-direction:column; align-items:center; text-align:center;}
  }
`;
