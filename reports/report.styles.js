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


  /* ============== بطاقة النتيجة العلوية + لوحة التخصيص (لا تظهر في الصورة/الملف) ============== */
  #report-screen .res-hero{
    --hg1:#0d5c46; --hg2:#0b3d30;
    display:flex; align-items:center; gap:26px; padding:22px 28px; flex-wrap:wrap; justify-content:center;
    background:linear-gradient(135deg,var(--hg1),var(--hg2)); color:#fffdf8; border-radius:12px 12px 0 0;
  }
  #report-screen .res-hero.tier-excellent{--hg1:#0d5c46; --hg2:#0b3d30;}
  #report-screen .res-hero.tier-good{--hg1:#147c5e; --hg2:#0d4d3a;}
  #report-screen .res-hero.tier-average{--hg1:#b8863b; --hg2:#6f4f1c;}
  #report-screen .res-hero.tier-weak{--hg1:#a15230; --hg2:#5e2a16;}
  #report-screen .res-ring{position:relative; width:132px; height:132px; flex:none;}
  #report-screen .res-ring-arc{transition:stroke-dashoffset 1s ease;}
  #report-screen #res-ring-arc{transition:stroke-dashoffset 1s ease;}
  #report-screen .res-ring-c{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.1;}
  #report-screen .res-ring-c b{font-size:2rem; font-weight:900;}
  #report-screen .res-ring-c span{font-size:.78rem; font-weight:800; background:rgba(255,255,255,.16); padding:2px 10px; border-radius:999px; margin-top:5px;}
  #report-screen .res-main{flex:1 1 320px; min-width:0; max-width:620px;}
  #report-screen .res-kicker{font-size:.8rem; font-weight:800; color:#f1c75b; letter-spacing:.02em;}
  #report-screen .res-name{margin:2px 0 4px; font-size:1.7rem; font-weight:900; color:#fffdf8 !important; text-shadow:none !important; /* kids.css يفرض ظلاً أبيض سميكاً على كل h2 فيصنع هالة حول الاسم الأبيض */}
  #report-screen .res-msg{margin:0 0 14px; font-size:.95rem; font-weight:600; opacity:.92; line-height:1.6;}
  #report-screen .res-tiles{display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; text-align:center;}
  #report-screen .res-tile{background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.18); border-radius:12px; padding:9px 6px; text-align:center; display:flex; flex-direction:column; gap:2px;}
  #report-screen .res-tile b{font-size:1.4rem; font-weight:900;}
  #report-screen .res-tile span{font-size:.7rem; font-weight:700; opacity:.85;}
  #report-screen .res-tile.ok b{color:#8ee0b4;} #report-screen .res-tile.mid b{color:#f1c75b;} #report-screen .res-tile.bad b{color:#ffa79a;}
  #report-screen .report-toolbar{border-radius:0; padding:14px 16px;}
  #report-screen .rep-custom{background:#332d24; border-top:1px solid #46403690;}
  #report-screen .rep-custom > summary{cursor:pointer; padding:11px 18px; color:#e8dcc0; font-weight:800; font-size:.85rem; list-style:none;}
  #report-screen .rep-custom > summary::-webkit-details-marker{display:none;}
  #report-screen .rep-custom[open] > summary{border-bottom:1px solid #46403690;}
  #report-screen .rep-custom-body{display:flex; justify-content:center; padding:12px 16px;}
  @media (max-width:640px){
    #report-screen .res-hero{padding:14px 12px; gap:8px; flex-direction:column; text-align:center;}
    #report-screen .res-main{flex:none; width:100%;} #report-screen .res-ring{width:104px; height:104px;} #report-screen .res-ring svg{width:104px; height:104px;}
    #report-screen .res-ring-c b{font-size:1.6rem;}
    #report-screen .res-msg{margin-bottom:10px; font-size:.85rem;}
    #report-screen .res-tiles{gap:6px;} #report-screen .res-tile b{font-size:1.1rem;} #report-screen .res-tile span{font-size:.6rem;}
    #report-screen .res-name{font-size:1.4rem;}
  }

  /* ============== أدوات التحكم أعلى الشاشة (لا تظهر في الصورة/الملف) ============== */
  #report-screen .report-toolbar{
    display:flex; align-items:center; justify-content:center; gap:10px;
    padding:12px 16px; background:#2b2620; flex-wrap:wrap; border-radius:12px 12px 0 0;
  }
  #report-screen .grp{display:flex; align-items:center; gap:8px; padding-inline-end:12px; border-inline-end:1px solid #46403690;}
  #report-screen .grp:last-child{border-inline-end:none; padding-inline-end:0;}
  #report-screen .grp-label{color:#a89f8a; font-size:10.5px; font-weight:700; margin-inline-end:4px;}
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
  #report-screen .teacher-name-input::placeholder{color:#a89f8a;}

  #report-screen .note-bar{
    display:flex; align-items:center; gap:10px; padding:10px 16px;
    background:#332d24; border-top:1px solid #46403690;
  }
  #report-screen .note-bar label{color:#c2b393 !important; font-size:11.5px; font-weight:700; flex:none;}
  #report-screen .note-bar textarea{
    flex:1; resize:vertical; min-height:34px; max-height:110px;
    font-family:'Cairo',sans-serif; font-size:12.5px; font-weight:600;
    background:#f9f4ea; border:1px solid #55503f; border-radius:8px;
    padding:8px 12px; color:#2b2620;
  }
  #report-screen .note-bar .hint{color:#a89f8a; font-size:10px; font-weight:600; flex:none;}
  #report-screen .note-bar .qa-theme-select{
    flex:0 1 280px; font-family:'IBM Plex Sans Arabic',sans-serif; font-size:12.5px; font-weight:600;
    background:#f9f4ea; border:1px solid #55503f; border-radius:8px; padding:6px 10px; color:#2b2620;
  }

  #report-screen .report-stage{display:flex; justify-content:center; padding:36px 16px 60px; background:#e9e4d8; border-radius:0 0 12px 12px;}

  /* 🌟 [إصلاح التوافق مع الشاشات] ورقة التقرير عرضها 720px (max-width:100% لا يعمل داخل عنصر flex بلا min-width:0)،
     فكانت توسّع الصفحة كلها على الهاتف. نجعل إطار المعاينة نفسه قابلًا للتمرير أفقيًا والورقة بأبعادها الأصلية تمامًا
     (فلا يتغير ناتج التصدير PDF/PNG). محصور بالإطار الذي يحوي #report-stage-inner فقط. 🌟 */
  #report-screen .report-stage:has(#report-stage-inner){
    min-width:0; max-width:100%; box-sizing:border-box; overflow-x:auto; justify-content:safe center;
    -webkit-overflow-scrolling:touch;
  }
  #report-screen .report-stage:has(#report-stage-inner) #report-stage-inner{flex:none;}

  /* 🌟 [جديد] تقسيم المعاينة: يمين = صورة واتساب، يسار = ملف PDF. direction:rtl ثابت هنا (تخطيط فيزيائي) حتى يبقى واتساب
     يمينًا في اللغتين؛ ويتكدّس الجزءان رأسيًا (واتساب أولًا) إذا ضاق العرض. المحتوى داخل كل جزء يحتفظ باتجاهه الأصلي. */
  #report-screen .report-split{display:flex; flex-wrap:wrap; direction:rtl; gap:28px; align-items:flex-start; justify-content:center; width:100%; min-width:0;}
  #report-screen .split-pane{min-width:0; direction:ltr;}
  #report-screen .pdf-pane{flex:none; width:720px; max-width:100%;}
  #report-screen .wa-pane{flex:1 1 360px; max-width:720px;}
  #report-screen .pane-title{unicode-bidi:plaintext;
    margin:0 0 12px; text-align:center; font-size:14px; font-weight:800; color:#5b5240; letter-spacing:0;
  }
  #report-screen .wa-frame{position:relative; width:100%; overflow:hidden; border-radius:14px; box-shadow:0 10px 40px rgba(0,0,0,0.12); background:#f9f4ea;}
  #report-screen .wa-scaler{position:absolute; top:0; inset-inline-start:0; transform-origin:top left; direction:ltr;}
  #report-screen .wa-scaler .qac, #report-screen .wa-scaler .rc{direction:inherit;}
  #report-screen .wa-scaler .qac[dir="rtl"]{direction:rtl;}

  /* ============== إطار الصفحة ============== */
  #report-screen .page{
    width:720px; max-width:100%;
    /* 🌟 [2026-10-03] علامة مائية باهتة جداً لشعار المنصة في وسط الورقة (الشفافية مدمجة في ملف SVG نفسه) */
    color:#2b2620; background:#f9f4ea url("assets/brand/ham-logo-watermark.svg") no-repeat center 55% / 46% auto;
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
  /* 🌟 [2026-10-03] شعار المنصة أعلى يمين الترويسة (بدل عنقود النجوم) — نفس المساحة المحجوزة بـ padding-inline أدناه */
  #report-screen .head-logo{position:absolute; top:-8px; right:-4px; width:70px; height:auto;}
  #report-screen .footer-logo{width:20px; height:auto; vertical-align:middle; margin-inline-end:6px;}
  /* ⚠️ بلا letter-spacing إطلاقًا على أي نص عربي هنا.
     السبب حقيقي لا تجميلي: html2canvas (المستخدَم في تصدير الصورة والـ PDF) يرسم النص
     حرفًا حرفًا حين يجد letter-spacing غير صفري، وتقطيع النص العربي إلى حروف منفصلة
     يُفقده التشكيل السياقي (الوصل بين الحروف)، فتخرج العبارة في الملف المطبوع مفكّكة
     ومقلوبة الترتيب بينما تبدو سليمة تمامًا على الشاشة — وهو بالضبط ما حدث في سطر
     "منصة حمٓ لتثبيت الحفظ و المراجعة" أعلى التقرير. */
  #report-screen .eyebrow{font-size:11.5px; font-weight:700; color:#6f644e;}
  #report-screen .r-title{
    font-family:'Amiri',serif; font-weight:700; font-size:38px; line-height:1.15;
    color:#0b3d30; margin:6px 0 0;
  }
  #report-screen .r-subtitle{font-family:'Amiri',serif; font-size:22px; font-weight:700; color:#2b2620; margin-top:2px;}
  #report-screen .r-tagline{
    display:inline-flex; align-items:center; gap:12px; margin-top:12px;
    font-size:13px; font-weight:600; color:#6f644e;
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
  #report-screen .section-sub{font-size:12px; color:#6f644e; font-weight:600; margin:0;}

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
  #report-screen .step-when span{display:block; font-size:12.5px; color:#4a4234; font-weight:700; margin-top:2px;}
  #report-screen .step-tier{font-size:12px; font-weight:800;}
  #report-screen .conn-cell{flex:0 1 46px; display:flex; align-items:center; justify-content:center; margin-top:19px;}
  #report-screen .conn-cell i{display:block; width:100%; height:2px; background:#e4d9c4; border-radius:2px;}
  #report-screen .ladder-empty{
    font-size:12.5px; font-weight:600; color:#6f644e; text-align:center; margin:14px 0 2px;
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
  #report-screen .qtype{font-size:11.5px; font-weight:700; color:#6f644e;}
  #report-screen .qloc{font-size:13px; font-weight:700; color:#2b2620; margin-top:2px;}
  /* خط 'Amiri Quran' موحَّد مع class="quran-text" بباقي المنصة حتى تظهر نصوص الآيات
     في التقرير المُصدَّر بنفس رسم المصحف (رموز الرسم العثماني لا يدعمها Amiri العادي) */
  #report-screen .qtext{font-family:'Amiri Quran',serif; font-size:15px; color:#4a4238; margin-top:4px; line-height:1.75;}
  #report-screen .qscore{text-align:center; font-weight:800; white-space:nowrap;}
  #report-screen .qnote{font-size:12px; font-weight:600; color:#8a726b; line-height:1.6;}
  #report-screen .qempty{text-align:center; color:#6f644e; font-size:14.5px; padding:18px 0;}

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
  /* تجميع حسب السورة: اسم السورة ثم أنواع الأخطاء جنبًا إلى جنب (تلتف عند ضيق المكان)، وأسماء مضغوطة سورتان في السطر */
  #report-screen .focus-body{flex:1; min-width:0;}
  #report-screen .focus-name{font-weight:800; font-size:14px; line-height:1.6;}
  #report-screen .focus-lines{display:flex; flex-wrap:wrap; gap:2px 16px; margin-top:2px;}
  #report-screen .focus-line{font-size:13px; font-weight:600; line-height:1.65; min-width:0;}
  #report-screen .focus-tag{font-size:11px; font-weight:800; background:#9e3b2d; color:#fff7f3; border-radius:20px; padding:1px 9px; margin-inline-end:6px;}
  #report-screen .focus-compact{list-style:none; display:grid; grid-template-columns:1fr 1fr; gap:6px 12px;}
  #report-screen .focus-c{display:flex; align-items:flex-start; gap:7px; font-size:13px; font-weight:700; min-width:0; line-height:1.6;}
  #report-screen .focus-c svg{flex:none; margin-top:3px;}
  #report-screen .focus-c small{color:#8a726b; font-weight:600;}
  #report-screen .focus-pattern{list-style:none; font-size:12.5px; font-weight:700; background:rgba(158,59,45,.09); color:#9e3b2d; border-radius:10px; padding:8px 11px;}
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
  #report-screen .scope-disclaimer{margin:14px 6px 0; font-size:13px; line-height:1.9; color:#6f644e; text-align:center;}

  /* ============== الختم والتوقيع والتذييل ============== */
  #report-screen .closing{
    margin-top:8px; padding-top:20px; border-top:1px solid #e4d9c4;
    display:flex; align-items:flex-end; justify-content:space-between; gap:20px; flex-wrap:wrap;
  }
  #report-screen .footer-meta{font-size:12px; color:#6f644e; font-weight:600; line-height:2;}
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
  #report-screen .teacher-label{font-size:11.5px; color:#6f644e; font-weight:700; margin-top:3px;}

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

  /* وضع PDF المباشر: الاسم والبيانات والدرجة ثم الأسئلة مباشرة — بلا سطر الصراحة (بطاقة مستوى التقدّم تبقى).
     يُفعَّل أثناء التقاط PDF فقط (exportPdfAtPageWidth) ويُزال في finally. */
  #report-screen .page.dh-pdf-lean .honesty-line{display:none !important;}

  @media (max-width:760px){
    /* 🌟 [2026-10-03 — مراجعة تجربة الهاتف] الورقة بعرض الشاشة على الهاتف: كانت #report-stage-inner بـ flex:none فتبقى الورقة 720px
       مقصوصة داخل إطار يُمرَّر أفقيًا (يرى المعلم جزءًا من التقرير فقط)، فلا تعمل قواعد الهاتف أدناه أصلًا. أثناء التصدير يضيف
       report.js الكلاس dh-export-width فتعود الورقة 720px كما كانت تمامًا، فلا يتغير ناتج الصورة/PDF. */
    #report-screen .report-stage:has(#report-stage-inner){padding:12px 8px 24px;}
    #report-screen .pdf-pane{flex:1 1 100%; width:100%; min-width:0;}
    #report-screen .report-stage:has(#report-stage-inner) #report-stage-inner{flex:1 1 auto; width:100%; min-width:0;}
    #report-screen .report-stage.dh-export-width:has(#report-stage-inner) #report-stage-inner{flex:none; width:auto;}
    #report-screen .report-stage.dh-export-width .pdf-pane{flex:none; width:720px;}
    #report-screen .page{padding:30px 18px 26px;}
    #report-screen .r-title{font-size:28px;}
    #report-screen .r-subtitle{font-size:18px;}
    #report-screen .dh-head{padding-inline:0; min-height:0;}
    #report-screen .head-art{position:static; display:block; width:140px; margin-inline:0 auto; margin-bottom:4px;}
    #report-screen .head-logo{display:none;}
    #report-screen .gauge-card{flex:1 1 100%;}
    #report-screen .ladder{flex-wrap:wrap; gap:16px 0;}
    #report-screen .step{flex:1 1 50%;}
    #report-screen .conn-cell{display:none;}
    /* الجدول أضيق من أن يُعرض بخمسة أعمدة على الجوال — يُمرَّر أفقيًا داخل حاويته وحده */
    #report-screen .qlist{overflow-x:auto;}
    #report-screen .qgrid-head, #report-screen .qrow{min-width:560px;}
    /* 🌟 [2026-10-03] على شاشة الهاتف (لا أثناء التصدير): كل سؤال صف بعرض الشاشة بلا تمرير أفقي — م | الحالة | السؤال | الدرجة،
       والملاحظة في سطر تحته بدل عمود مخفي خارج الشاشة. التصدير (dh-export-width) يبقى بالجدول كما كان تمامًا. */
    #report-screen .report-stage:not(.dh-export-width) .qlist{overflow-x:visible;}
    #report-screen .report-stage:not(.dh-export-width) .qgrid-head,
    #report-screen .report-stage:not(.dh-export-width) .qrow{min-width:0; grid-template-columns:22px 22px minmax(0,1fr) auto; gap:4px 8px;}
    #report-screen .report-stage:not(.dh-export-width) .qgrid-head > :nth-child(5){display:none;}
    #report-screen .report-stage:not(.dh-export-width) .qrow{padding:9px 6px;}
    #report-screen .report-stage:not(.dh-export-width) .qnote{grid-column:3 / -1;}
    #report-screen .closing{flex-direction:column; align-items:center; text-align:center;}
    /* 🌟 [إصلاح التوافق مع الشاشات] شريط الملاحظة وشريط الأدوات كانا لا يلتفّان (label/hint بـ flex:none + textarea بعرض ~26px)
       فيتّسع عرض الصفحة كلها على الهاتف. الآن يلتفّان ويأخذ مربع الملاحظة سطرًا كاملًا. تؤثر فقط في شاشة التقرير (#report-screen). 🌟 */
    #report-screen .note-bar{flex-wrap:wrap;}
    #report-screen .note-bar textarea{flex:1 1 100%; min-width:0;}
    #report-screen .note-bar .hint{flex:1 1 auto; min-width:0;}
    #report-screen .report-toolbar{padding-inline:10px;}
    #report-screen .report-toolbar .grp{flex-wrap:wrap; justify-content:center; padding-inline-end:0; border-inline-end:none;}
    #report-screen .teacher-name-input{min-width:0; max-width:100%;}
  }

  /* ============== شريط الأدوات (نموذج أ): تحميل + واتساب + قائمة تخصيص ============== */
  #report-screen .tb-a{justify-content:flex-start; gap:10px; position:relative; z-index:5;}
  #report-screen .tb-split{display:inline-flex; border-radius:10px; overflow:hidden;}
  #report-screen .tb-split .rbtn{border-radius:0;}
  #report-screen .tb-split .rbtn + .rbtn{border-inline-start:1px solid rgba(0,0,0,.18);}
  #report-screen .rbtn.wa{background:#1fa855; color:#fff;}
  #report-screen .rbtn.ic{padding:9px 11px;}
  #report-screen .tb-sp{flex:1;}
  #report-screen .tb-sr{position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0 0 0 0); white-space:nowrap;}
  #report-screen .tb-menu{position:relative; background:none; border:none;}
  #report-screen .tb-menu > summary{list-style:none; padding:9px 14px; font-size:12.5px; color:#f3ede1;}
  #report-screen .tb-menu > summary::-webkit-details-marker{display:none;}
  #report-screen .tb-menu[open] > summary{border-bottom:1px solid #55503f; background:#3a352a;}
  #report-screen .tb-dd{position:absolute; top:calc(100% + 8px); inset-inline-end:0; width:min(520px, calc(100vw - 32px)); background:#332d24; border:1px solid #55503f; border-radius:14px; box-shadow:0 14px 34px rgba(0,0,0,.4); padding:8px 0; z-index:20;}
  #report-screen .tb-dd .rep-custom-body{padding:8px 14px;}
  #report-screen .tb-dd .note-bar{flex-wrap:wrap; border-top:1px solid #46403690;}
  #report-screen .tb-dd .note-bar textarea{flex:1 1 100%; min-width:0;}
  @media (max-width:640px){
    #report-screen .tb-a{justify-content:center;}
    #report-screen .tb-sp{display:none;}
    #report-screen .tb-dd{position:fixed; top:auto; bottom:70px; inset-inline:12px; width:auto; max-height:70vh; overflow:auto;}
  }

  /* ============== ورقة PDF (نموذج ب): شريط جانبي أخضر للملخص + محتوى واضح ==============
     ⚠️ كل الألوان ثابتة (بلا color-mix ولا conic-gradient) لأن html2canvas لا يدعمها.
     المقدمة كلها قسم واحد (.pdf-block) فلا يتأثر تقسيم صفحات PDF. */
  #report-screen .page .corner-orn.tr, #report-screen .page .corner-orn.tl{display:none;}
  #report-screen .sb-intro{display:grid; grid-template-columns:212px minmax(0,1fr); margin:-44px -46px 22px;}
  #report-screen .sb-side{background:linear-gradient(180deg,#0d5c46,#0b3d30); color:#fffdf8; padding:24px 14px 20px; display:flex; flex-direction:column; align-items:center; gap:12px; text-align:center;}
  #report-screen .sb-logo{width:70px; height:70px; border-radius:50%; background:#fffdf8; display:flex; align-items:center; justify-content:center;}
  #report-screen .sb-logo .head-logo{position:static; width:50px;}
  #report-screen .sb-side .avatar-circle{border-color:#f1c75b; box-shadow:0 0 0 4px #0d5c46, 0 0 0 5px #2c7a62;}
  #report-screen .sb-body{width:100%;}
  #report-screen .sb-side .student-name{color:#fffdf8; font-size:20px; text-align:center;}
  #report-screen .sb-side .fact{background:#1d6a53; border:none; border-radius:9px; padding:6px 8px; margin-top:6px; color:#d8eadf; font-size:11.5px; text-align:start;}
  #report-screen .sb-side .fact.is-first{padding-top:6px;}
  #report-screen .sb-side .fact b{color:#f1c75b;}
  #report-screen .sb-side .gauge-card{flex:none; width:100%; background:transparent; border:none; padding:0;}
  #report-screen .sb-side .gauge-pct{color:#f1c75b;}
  #report-screen .sb-side .gauge-tier{background:#f1c75b; color:#4a3410;}
  #report-screen .sb-side .gauge-label{background:#1d6a53; border-color:#2c7a62; color:#d8eadf;}
  #report-screen .sb-counts{width:100%; display:flex; flex-direction:column; gap:7px;}
  #report-screen .sb-counts .chip-status{flex:0 0 auto; display:flex; align-items:center; gap:7px; justify-content:flex-start; width:100%; margin:0; background:#1d6a53; border:none; border-radius:10px; padding:8px 10px; font-size:12px; color:#e8f1ec;}
  #report-screen .sb-counts .chip-full{color:#9fe6bf;} #report-screen .sb-counts .chip-partial{color:#f6d77f;} #report-screen .sb-counts .chip-wrong{color:#ffb3a7;}
  #report-screen .sb-main{padding:30px 26px 18px; min-width:0;}
  #report-screen .sb-main .dh-head{text-align:start; padding:0 0 12px; padding-inline-end:118px; min-height:0; border-bottom:3px solid #0d5c46; margin-bottom:14px;}
  #report-screen .sb-main .head-art{top:-8px; left:auto; right:auto; inset-inline-end:-10px; width:120px;}
  #report-screen .sb-main .r-title{font-size:32px;}
  #report-screen .sb-main .r-subtitle{font-size:18px;}
  #report-screen .sb-main .r-tagline{margin-top:6px; font-size:12px;}
  #report-screen .sb-main .r-tagline::before{display:none;}
  #report-screen .sb-main .honesty-line{text-align:start; background:#f7efdd; color:#6f4f1c; border-radius:10px; padding:10px 12px; font-size:13.5px; margin-bottom:14px;}
  #report-screen .sb-h{font-size:14px; font-weight:800; color:#0b3d30; margin:4px 0 8px; display:flex; align-items:center; gap:8px;}
  #report-screen .sb-h::before{content:''; width:6px; height:16px; border-radius:3px; background:#c9932f;}
  #report-screen .qmap{display:grid; grid-template-columns:repeat(auto-fill,minmax(54px,1fr)); gap:6px;}
  #report-screen .qm{border-radius:8px; padding:6px 4px; text-align:center; font-size:11px; font-weight:800;}
  #report-screen .qm-g{background:#e8f1ec; color:#0d5c46;} #report-screen .qm-y{background:#f7efdd; color:#8a6428;} #report-screen .qm-r{background:#f6e8e6; color:#a15230;}
  #report-screen .section-title{display:flex; align-items:center; gap:8px; color:#0b3d30;}
  #report-screen .section-title::before{content:''; width:6px; height:17px; border-radius:3px; background:#c9932f; flex:none;}
  #report-screen .sb-ladder{margin-top:16px; padding:14px 14px 12px;}
  @media (max-width:760px){
    #report-screen .report-stage:not(.dh-export-width) .sb-intro{grid-template-columns:1fr; margin:-30px -18px 18px; min-height:0;}
    #report-screen .report-stage:not(.dh-export-width) .sb-main .dh-head{padding-inline-end:0;}
    #report-screen .report-stage:not(.dh-export-width) .sb-main .head-art{display:none;}
    #report-screen .report-stage:not(.dh-export-width) .sb-logo .head-logo{display:block;}
  }

  /* أسئلة كثيرة (>10): صفوف مضغوطة، النوع والموضع في سطر واحد، والنص بسطر واحد مختصر؛ (>20): بلا نص السؤال */
  #report-screen .page.q-many .qrow{padding:6px 8px; font-size:12px;}
  #report-screen .page.q-many .qsubject{display:flex; flex-wrap:wrap; align-items:baseline; gap:2px 8px;}
  #report-screen .page.q-many .qtext{flex:1 1 100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-size:11px;}
  #report-screen .page.q-many .qnote{font-size:11px;}
  #report-screen .page.q-many .qmap{grid-template-columns:repeat(auto-fill,minmax(42px,1fr)); gap:4px;}
  #report-screen .page.q-many .qm{padding:4px 2px; font-size:10px;}
  #report-screen .page.q-huge .qtext{display:none;}
`;
