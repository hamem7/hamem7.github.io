// =============================================================================
// reports/report.styles.js
// تنسيق شاشة التقرير بالكامل — مفصول عن report.js في ملف مستقل بدل تضخيم
// الملف الرئيسي بحوالي 190 سطر CSS داخل نص جافاسكريبت. report.js يستورد
// REPORT_STYLES ويحقنها داخل وسم <style> بنفس الطريقة تمامًا كما كانت
// مضمَّنة سابقًا — لا تغيير في آلية التحميل أو في النتيجة المعروضة، فقط
// تنظيم أوضح لمكان وجود كل جزء من الكود.
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
    padding:46px 52px 40px; position:relative;
    box-shadow:0 10px 40px rgba(0,0,0,0.12);
  }
  #report-screen .page::before{
    content:''; position:absolute; inset:12px; border:1px solid rgba(201,147,47,0.28);
    pointer-events:none;
  }
  #report-screen .corner-orn{position:absolute; opacity:.9; pointer-events:none;}
  #report-screen .corner-orn.tl{top:16px; left:16px;}
  #report-screen .corner-orn.tr{top:16px; right:16px; transform:scaleX(-1);}
  #report-screen .corner-orn.bl{bottom:16px; left:16px; transform:scaleY(-1);}
  #report-screen .corner-orn.br{bottom:16px; right:16px; transform:scale(-1,-1);}

  /* ألوان الفئة (تُطبَّق على العنصر الأب #report-stage-inner) — قيم ثابتة
     محسوبة مسبقًا (بلا color-mix()) لأن html2canvas لا يدعم تحليلها.
     أربعة مستويات: ممتاز / جيد / متوسط / ضعيف — متدرّجة من الذهبي الداكن
     إلى البنّي المحمّر حتى يُقرأ الفرق بينها بصريًا دون الحاجة لقراءة النص. */
  #report-stage-inner.tier-excellent{ --tacc:#8a6221; --tacc-bg:#efe9e0; --tacc-bd:#d3c3ab; }
  #report-stage-inner.tier-good{ --tacc:#a97b2e; --tacc-bg:#f2ebdf; --tacc-bd:#ddc99f; }
  #report-stage-inner.tier-average{ --tacc:#b8863b; --tacc-bg:#f5eee4; --tacc-bd:#e4d1b5; }
  #report-stage-inner.tier-weak{ --tacc:#a15230; --tacc-bg:#f2e7e2; --tacc-bd:#dbbdb0; }

  /* ============== الترويسة ============== */
  #report-screen .eyebrow{font-size:12.5px; font-weight:700; color:#a79a83;}
  #report-screen .title-row{display:flex; align-items:baseline; justify-content:space-between; margin-top:6px; gap:12px;}
  #report-screen .title{font-family:'Amiri',serif; font-weight:700; font-size:30px; color:#2b2620; margin:0;}
  #report-screen .title-sub{font-size:13.5px; color:#a79a83; font-weight:600; white-space:nowrap;}
  #report-screen .gold-rule{height:5px; margin:14px 0 24px; background:
      linear-gradient(#c9932f,#c9932f) top / 100% 1px no-repeat,
      linear-gradient(#c9932f,#c9932f) bottom / 100% 1px no-repeat;}

  #report-screen .meta-row{display:flex; align-items:center; justify-content:space-between; gap:16px; margin-bottom:28px; flex-wrap:wrap;}
  #report-screen .meta-student{display:flex; align-items:center; gap:14px;}
  #report-screen .avatar-wrap{position:relative; flex:none;}
  #report-screen .avatar-circle{
    width:58px; height:58px; border-radius:50%; overflow:hidden;
    background:#efe9e0; border:2px solid #c9932f; cursor:pointer;
    display:flex; align-items:center; justify-content:center;
    font-family:'Amiri',serif; font-size:23px; font-weight:700; color:#8a6221;
    transition:.15s ease;
  }
  #report-screen .avatar-circle.drag-over{box-shadow:0 0 0 4px rgba(201,147,47,0.3);}
  #report-screen .avatar-circle img{width:100%; height:100%; object-fit:cover;}
  #report-screen .avatar-edit-btn{
    position:absolute; bottom:-2px; left:-2px; width:22px; height:22px; border-radius:50%;
    background:#2b2620; border:2px solid #f9f4ea; color:#f3ede1;
    display:flex; align-items:center; justify-content:center; cursor:pointer; padding:0;
  }
  #report-screen .student-name{font-size:19px; font-weight:700; color:#2b2620;}
  #report-screen .student-scope{font-size:13px; color:#a79a83; font-weight:600; margin-top:2px;}
  #report-screen .meta-right{text-align:left; font-size:12.5px; color:#a79a83; font-weight:600; line-height:1.9;}
  #report-screen .meta-right b{color:#2b2620; font-weight:700;}

  /* ============== البطاقة الرئيسية: مقياس الإتقان ============== */
  #report-screen .hero{display:flex; align-items:center; gap:30px; padding:24px 26px; background:#fffdf8; border:1px solid #e4d9c4; border-radius:14px; margin-bottom:22px; flex-wrap:wrap;}
  #report-screen .gauge-wrap{position:relative; width:168px; height:168px; flex:none;}
  #report-screen .gauge-center{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;}
  #report-screen .gauge-pct{font-size:36px; font-weight:800; line-height:1; color:var(--tacc);}
  #report-screen .gauge-tier{font-size:13.5px; font-weight:700; margin-top:6px; color:var(--tacc);}
  #report-screen .gauge-arc{stroke:var(--tacc); transition:stroke .2s ease;}
  #report-screen .hero-body{flex:1; min-width:220px;}
  #report-screen .hero-headline{font-size:16px; font-weight:700; color:#2b2620; margin:0 0 14px;}
  #report-screen .status-chips{display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px;}
  #report-screen .chip-status{display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:8px; font-size:13px; font-weight:700; border:1px solid; white-space:nowrap;}
  #report-screen .chip-full{background:#efe9e0; border-color:#d3c3ab; color:#8a6221;}
  #report-screen .chip-partial{background:#f5eee4; border-color:#e4d1b5; color:#b8863b;}
  #report-screen .chip-wrong{background:#f2e7e2; border-color:#dbbdb0; color:#a15230;}
  #report-screen .stat-line{display:flex; flex-wrap:wrap; gap:16px;}
  #report-screen .stat-item{display:flex; align-items:center; gap:6px; font-size:13px; color:#6b6252; font-weight:600;}
  #report-screen .stat-item svg{flex:none;}

  #report-screen .section-title{font-size:16px; font-weight:700; color:#2b2620; margin:0 0 2px;}
  #report-screen .section-sub{font-size:12.5px; color:#a79a83; font-weight:600; margin:0 0 14px;}

  /* ============== رسم الأداء عبر آخر التقييمات ============== */
  #report-screen .trend-block{padding:20px 24px 16px; background:#fffdf8; border:1px solid #e4d9c4; border-radius:14px; margin-bottom:22px;}
  #report-screen .trend-bars{display:flex; align-items:flex-end; gap:12px; height:72px; border-bottom:1px solid #e4d9c4; margin-top:12px;}
  #report-screen .trend-bar-col{display:flex; flex-direction:column; align-items:center; gap:6px; flex:1;}
  #report-screen .trend-bar{width:100%; max-width:32px; border-radius:4px 4px 0 0;}
  #report-screen .trend-label{font-size:11px; color:#a79a83; font-weight:700;}

  /* ============== تفاصيل الأسئلة (ظاهرة بالكامل دائمًا) ============== */
  #report-screen .qlist{background:#fffdf8; border:1px solid #e4d9c4; border-radius:14px; padding:22px 24px 8px; margin-bottom:22px;}
  #report-screen .qrow{display:flex; align-items:flex-start; gap:14px; padding:14px 0; border-top:1px solid #efe9e0;}
  #report-screen .qrow:first-child{border-top:none;}
  #report-screen .qnum{width:27px; height:27px; border-radius:50%; background:#f3ede1; color:#8a726b; font-size:12.5px; font-weight:700; display:flex; align-items:center; justify-content:center; flex:none; margin-top:2px;}
  #report-screen .qicon{flex:none; margin-top:2px;}
  #report-screen .qbody{flex:1; min-width:0;}
  #report-screen .qtop{display:flex; align-items:baseline; justify-content:space-between; gap:12px; flex-wrap:wrap;}
  #report-screen .qtype{font-size:12px; font-weight:700; color:#a79a83;}
  /* 🌟 كان الخط هنا 'Amiri' العادي، وهو لا يدعم رموز الرسم العثماني الخاصة (كعلامة السكون
     المستديرة/رأس الخاء فوق الحروف الساكنة في القرآن) — تم توحيده مع خط 'Amiri Quran' المستخدم
     في class="quran-text" بباقي المنصة حتى تظهر نصوص الآيات في التقرير المُصدَّر (PDF/PNG) بنفس
     رسم المصحف بالضبط 🌟 */
  #report-screen .qtext{font-family:'Amiri Quran',serif; font-size:17px; color:#2b2620; margin:4px 0 3px; line-height:1.6;}
  #report-screen .qpoints{font-size:15.5px; font-weight:800; white-space:nowrap;}
  #report-screen .qnote{font-size:12.5px; color:#8a726b; font-weight:600; margin-top:6px; background:#f4efe6; border-radius:6px; padding:6px 10px; display:inline-block;}

  /* ============== نقاط القوة / بحاجة إلى تركيز ============== */
  #report-screen .insights{display:flex; gap:16px; margin-bottom:22px; flex-wrap:wrap;}
  #report-screen .insight-card{flex:1; min-width:220px; background:#fffdf8; border:1px solid #e4d9c4; border-radius:14px; padding:18px 20px;}
  #report-screen .insight-head{display:flex; align-items:center; gap:8px; padding-bottom:12px; margin-bottom:12px; border-bottom:1px solid #e4d9c4;}
  #report-screen .insight-title{font-size:14.5px; font-weight:700;}
  #report-screen .insight-list{margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap:10px;}
  #report-screen .insight-item{display:flex; align-items:flex-start; gap:8px; font-size:13.5px; color:#2b2620; line-height:1.6;}
  #report-screen .insight-item svg{flex:none; margin-top:3px;}

  /* ============== ملاحظة المعلم لولي الأمر ============== */
  #report-screen .note-box{background:#fffdf8; border:1px solid #e4d9c4; border-radius:14px; padding:20px 24px; margin-bottom:22px; position:relative;}
  #report-screen .note-box::before{content:''; position:absolute; top:0; right:24px; left:24px; height:3px; background:#c9932f; border-radius:0 0 3px 3px;}
  #report-screen .note-label{font-size:12.5px; font-weight:700; color:#a79a83; margin-bottom:10px;}
  #report-screen .note-text{font-family:'Amiri',serif; font-size:16.5px; line-height:1.9; color:#2b2620; margin:0;}

  /* ============== التوقيع والعودة ============== */
  #report-screen .closing{margin-top:8px; padding-top:22px; border-top:1px solid #e4d9c4; display:flex; align-items:flex-end; justify-content:space-between; gap:20px; flex-wrap:wrap;}
  #report-screen .footer-note{font-size:12.5px; color:#a79a83; font-weight:600; line-height:1.9;}
  #report-screen .teacher-sign{text-align:center; min-width:150px;}
  #report-screen .sig-img-wrap{height:36px; display:flex; align-items:flex-end; justify-content:center;}
  #report-screen .sig-img-wrap img{height:36px; width:auto; max-width:150px; object-fit:contain;}
  #report-screen .teacher-line{border-bottom:1.3px solid #cdbf9f; height:8px; min-width:150px;}
  #report-screen .sig-name{font-family:'Amiri',serif; font-style:italic; font-weight:700; font-size:15px; color:#8a6221; margin-top:6px;}
  #report-screen .teacher-label{font-size:12px; color:#a79a83; font-weight:700; margin-top:4px;}
  #report-screen .footer-id{text-align:center; font-size:12px; color:#c2b393; font-weight:600; margin-top:22px;}

  #report-screen .home-bar{display:flex; justify-content:center; padding:18px 16px 0;}
  #report-screen .home-btn{
    display:inline-flex; align-items:center; gap:8px;
    background:#2b2620; color:#f3ede1; border:none;
    font-family:'Cairo',sans-serif; font-weight:800; font-size:13.5px;
    padding:11px 22px; border-radius:10px; cursor:pointer;
  }
  #report-screen .home-btn:hover{background:#3a352a;}

  @media (max-width:760px){
    #report-screen .page{padding:32px 20px 28px;}
    #report-screen .title{font-size:25px;}
    #report-screen .hero{flex-direction:column; align-items:stretch; text-align:center;}
    #report-screen .hero-body{min-width:0;}
    #report-screen .closing{flex-direction:column; align-items:center; text-align:center;}
  }
`;