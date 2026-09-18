// =============================================================================
// reports/dual-test-report.styles.js
// 🌟 [جديد بالكامل] تنسيق شاشة "تقرير مواجهة الاختبارات الثنائية" — ملف مستقل تماماً
// بنفس فلسفة report.styles.js وmonthly-report.styles.js (CSS في ملف خاص بدل تضخيم ملف
// المنطق)، لكن بتصميم مختلف عمداً عن عائلة report.styles.js (البرشمان/الذهبي لشهادة
// إتقان فردية) — راجع مستند المشروع "تصميم-تقرير-الاختبارات-الثنائية-المقترح.md" لتفاصيل
// القرار: هذا تقرير "مواجهة" لا "شهادة"، فبُني كبطاقة نتيجة (VS) بترويسة زمردية بدل
// الاستمرار في نفس قالب الشهادة الفردية.
// كل القواعد هنا محصورة تحت بادئة .dtr- جديدة كلياً ومعرّف جذر #dtr-screen، ولا تلمس أي
// سطر من report.styles.js أو monthly-report.styles.js أو أي ملف CSS عام آخر.
// 🌟 نفس منطق report.styles.js بالحرف: قيم لونية ثابتة (hex) بدل var(--dh-emerald...)
// لأن html2canvas (المستخدم فعلياً للتصدير هنا أيضاً) لا يضمن تحليل المتغيرات المخصصة
// بشكل موثوق دائماً أثناء الالتقاط — القيم هنا مطابقة بالحرف لمتغيرات css/home.css:
// --dh-emerald-900:#06231c / 800:#0b3d30 / 700:#0d5c46 / 600:#147c5e
// --dh-gold-500:#d4af37 / 300:#f0d878
// =============================================================================
export const DUAL_TEST_REPORT_STYLES = `
  #dtr-screen{font-family:'Cairo',sans-serif;}
  #dtr-screen *{box-sizing:border-box;}

  /* ============== شريط الأدوات العلوي (لا يظهر في الصورة/الملف — نفس نمط شريط أدوات
       التقارير الأخرى في المنصة بالحرف، حفاظاً على تجربة موحّدة بين كل شاشات التقارير) ============== */
  #dtr-screen .dtr-toolbar{
    display:flex; align-items:center; justify-content:center; gap:10px;
    padding:12px 16px; background:#2b2620; flex-wrap:wrap; border-radius:12px 12px 0 0;
  }
  #dtr-screen .dtr-tb-grp{display:flex; align-items:center; gap:8px; padding-inline-end:12px; border-inline-end:1px solid #46403690;}
  #dtr-screen .dtr-tb-grp:last-child{border-inline-end:none; padding-inline-end:0;}
  #dtr-screen .dtr-tb-label{color:#8f8674; font-size:10.5px; font-weight:700; margin-inline-end:4px;}
  #dtr-screen .dtr-rbtn{
    display:inline-flex; align-items:center; gap:7px;
    background:#f9f4ea; color:#2b2620; border:none;
    font-family:'Cairo',sans-serif; font-weight:800; font-size:12.5px;
    padding:9px 16px; border-radius:9px; cursor:pointer; white-space:nowrap;
  }
  #dtr-screen .dtr-rbtn.primary{background:var(--dtr-gold-500,#d4af37);}
  #dtr-screen .dtr-rbtn.ghost{background:transparent; color:#f3ede1; border:1px solid #55503f;}
  #dtr-screen .dtr-rbtn[disabled]{opacity:.6; cursor:wait;}
  #dtr-screen .dtr-teacher-name-input{
    font-family:'Cairo',sans-serif; font-size:12.5px; font-weight:700;
    background:#3a352a; border:1px solid #55503f; border-radius:8px;
    padding:8px 12px; color:#f3ede1; width:150px;
  }
  #dtr-screen .dtr-teacher-name-input::placeholder{color:#8f8674;}

  #dtr-screen .dtr-note-bar{
    display:flex; align-items:center; gap:10px; padding:10px 16px;
    background:#332d24; border-top:1px solid #46403690;
  }
  #dtr-screen .dtr-note-bar label{color:#c2b393; font-size:11.5px; font-weight:700; flex:none;}
  #dtr-screen .dtr-note-bar textarea{
    flex:1; resize:vertical; min-height:34px; max-height:110px;
    font-family:'Cairo',sans-serif; font-size:12.5px; font-weight:600;
    background:#f9f4ea; border:1px solid #55503f; border-radius:8px;
    padding:8px 12px; color:#2b2620;
  }
  #dtr-screen .dtr-note-bar .dtr-hint{color:#8f8674; font-size:10px; font-weight:600; flex:none;}

  #dtr-screen .dtr-stage{display:flex; flex-direction:column; align-items:center; padding:36px 16px 40px; background:#e9e4d8; border-radius:0 0 12px 12px;}

  /* ============== إطار الصفحة ============== */
  #dtr-screen .dtr-page{
    width:760px; max-width:100%;
    color:#10241c; background:#fffdf6;
    overflow:hidden; border-radius:20px;
    box-shadow:0 10px 40px rgba(0,0,0,0.12);
  }

  /* ============== الترويسة الزمردية (الفرق الأول عن عائلة report.styles.js) ============== */
  #dtr-screen .dtr-header{
    background:linear-gradient(165deg, #06231c 0%, #0b3d30 45%, #0d5c46 100%);
    border-bottom:3px solid #d4af37;
    padding:26px 30px 22px; color:#fff; position:relative;
  }
  #dtr-screen .dtr-eyebrow-row{display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px; margin-bottom:18px;}
  #dtr-screen .dtr-eyebrow{font-size:12.5px; font-weight:700; color:#f0d878; letter-spacing:.3px;}
  #dtr-screen .dtr-meta{font-size:12px; font-weight:600; color:#cfe3da;}

  #dtr-screen .dtr-winner-ribbon{
    display:flex; align-items:center; justify-content:center; gap:10px;
    background:linear-gradient(90deg, #d4af37, #f0d878);
    color:#06231c; border-radius:999px; padding:10px 22px;
    font-family:'Amiri',serif; font-weight:700; font-size:19px; margin:0 auto 22px; width:fit-content;
    box-shadow:0 6px 18px rgba(212,175,55,0.35);
  }
  #dtr-screen .dtr-winner-ribbon.tie{background:linear-gradient(90deg, #cfe3da, #eef7f3); color:#0d5c46; box-shadow:none;}
  #dtr-screen .dtr-winner-ribbon .dtr-trophy{font-size:22px;}

  #dtr-screen .dtr-vs-row{display:flex; align-items:center; justify-content:center; gap:22px; flex-wrap:wrap;}
  #dtr-screen .dtr-side{flex:1; min-width:190px; max-width:260px; text-align:center;}
  #dtr-screen .dtr-side.winner .dtr-avatar{border-color:#d4af37; box-shadow:0 0 0 5px rgba(212,175,55,0.25);}
  #dtr-screen .dtr-avatar{
    width:84px; height:84px; border-radius:50%; margin:0 auto 10px; border:3px solid rgba(255,255,255,0.35);
    background:linear-gradient(135deg, #f0d878, #d4af37); overflow:hidden;
    display:flex; align-items:center; justify-content:center;
    font-family:'Amiri',serif; font-size:32px; font-weight:700; color:#06231c;
  }
  #dtr-screen .dtr-avatar img{width:100%; height:100%; object-fit:cover;}
  #dtr-screen .dtr-side-name{font-size:18px; font-weight:800;}
  #dtr-screen .dtr-side-roundswon{font-size:13px; color:#f0d878; font-weight:700; margin-top:4px;}
  #dtr-screen .dtr-side-points{font-family:'Amiri',serif; font-size:30px; font-weight:700; margin-top:8px; color:#fff;}
  #dtr-screen .dtr-side-points small{font-size:13px; font-weight:600; color:#cfe3da; font-family:'Cairo',sans-serif;}

  #dtr-screen .dtr-vs-center{flex:none; text-align:center; padding:0 6px;}
  #dtr-screen .dtr-vs-icon{font-size:26px;}
  #dtr-screen .dtr-vs-sub{font-size:11px; color:#f0d878; font-weight:700; margin-top:4px;}

  #dtr-screen .dtr-badges-row{display:flex; justify-content:center; gap:10px; margin-top:18px; flex-wrap:wrap;}
  #dtr-screen .dtr-badge-chip{
    display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.1);
    border:1px solid rgba(240,216,120,0.4); border-radius:999px; padding:6px 14px;
    font-size:12.5px; font-weight:700; color:#f0d878;
  }
  #dtr-screen .dtr-badge-chip .dtr-badge-icon{font-size:15px;}

  /* ============== جسم التقرير ============== */
  #dtr-screen .dtr-body{padding:28px 30px;}
  #dtr-screen .dtr-section-title{font-size:16px; font-weight:800; color:#0b3d30; margin:0 0 14px; display:flex; align-items:center; gap:8px;}

  /* ---- سلّم الجولات الثلاث (عنصر جديد كلياً، لا نظير له في التقارير الأخرى) ---- */
  #dtr-screen .dtr-ladder{display:flex; gap:12px; margin-bottom:30px; flex-wrap:wrap;}
  #dtr-screen .dtr-ladder-card{
    flex:1; min-width:170px; background:#f6f3e8; border:1px solid #e4d9c4;
    border-radius:18px; padding:16px; text-align:center;
  }
  #dtr-screen .dtr-ladder-card.won-a{border-color:#d4af37; background:#fdf8ea;}
  #dtr-screen .dtr-ladder-card.won-b{border-color:#147c5e; background:#eef7f3;}
  #dtr-screen .dtr-ladder-round-label{font-size:12px; font-weight:700; color:#4a6058; margin-bottom:10px;}
  #dtr-screen .dtr-ladder-scores{display:flex; align-items:center; justify-content:center; gap:10px; font-family:'Amiri',serif; font-weight:700; font-size:22px;}
  #dtr-screen .dtr-ladder-scores .dtr-dash{font-size:13px; color:#4a6058; font-family:'Cairo',sans-serif;}
  #dtr-screen .dtr-ladder-scores .dtr-lead{color:#d4af37;}
  #dtr-screen .dtr-ladder-winner-tag{margin-top:8px; font-size:11.5px; font-weight:700; color:#0d5c46;}

  /* ---- تفاصيل كل جولة — عمودان متقابلان (لا قائمة واحدة كعائلة report.styles.js) ---- */
  #dtr-screen .dtr-round-block{margin-bottom:26px; background:#fffdf6; border:1px solid #e4d9c4; border-radius:18px; padding:18px 20px;}
  #dtr-screen .dtr-round-head{display:flex; align-items:center; gap:10px; margin-bottom:6px; flex-wrap:wrap;}
  #dtr-screen .dtr-round-badge{
    width:30px; height:30px; border-radius:50%; background:#0d5c46; color:#fff;
    display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px; flex:none;
  }
  #dtr-screen .dtr-round-title{font-size:15.5px; font-weight:800; color:#10241c;}
  #dtr-screen .dtr-round-summary-line{font-size:12px; color:#4a6058; font-weight:600; margin:8px 0 16px; line-height:1.9;}
  #dtr-screen .dtr-round-summary-line b{color:#10241c; font-weight:700;}
  #dtr-screen .dtr-chip-mini{display:inline-flex; align-items:center; gap:4px; background:#f6f3e8; border:1px solid #e4d9c4; border-radius:999px; padding:2px 9px; margin-inline-end:6px; font-size:11px; font-weight:700; color:#4a6058;}

  #dtr-screen .dtr-qcols{display:grid; grid-template-columns:1fr 1fr; gap:16px;}
  #dtr-screen .dtr-qcol{background:#f6f3e8; border:1px solid #e4d9c4; border-radius:14px; padding:14px 16px;}
  #dtr-screen .dtr-qcol-head{display:flex; align-items:center; gap:8px; font-size:13px; font-weight:800; color:#0b3d30; margin-bottom:10px; padding-bottom:8px; border-bottom:1px dashed #d8cca8;}
  #dtr-screen .dtr-qcol-avatar{width:22px; height:22px; border-radius:50%; overflow:hidden; background:linear-gradient(135deg, #f0d878, #d4af37); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#06231c;}
  #dtr-screen .dtr-qcol-avatar img{width:100%; height:100%; object-fit:cover;}
  #dtr-screen .dtr-qcol-empty{font-size:12px; color:#a79a83; font-weight:600; padding:6px 0;}

  #dtr-screen .dtr-qrow{padding:9px 0; border-top:1px solid #ece4d1;}
  #dtr-screen .dtr-qrow:first-child{border-top:none;}
  #dtr-screen .dtr-qtop{display:flex; align-items:flex-start; justify-content:space-between; gap:8px;}
  #dtr-screen .dtr-qrange{font-family:'Amiri',serif; font-size:14px; color:#10241c; font-weight:700; line-height:1.5;}
  #dtr-screen .dtr-qpoints{font-size:13px; font-weight:800; white-space:nowrap;}
  #dtr-screen .dtr-qpoints.full{color:#0d5c46;}
  #dtr-screen .dtr-qpoints.mid{color:#b8863b;}
  #dtr-screen .dtr-qpoints.low{color:#a15230;}
  #dtr-screen .dtr-qmeta{font-size:11px; color:#4a6058; font-weight:600; margin-top:4px; display:flex; gap:8px; flex-wrap:wrap;}
  #dtr-screen .dtr-qmeta .dtr-tag-swap{color:#a15230; font-weight:700;}
  #dtr-screen .dtr-qmeta .dtr-tag-helper{color:#b8863b; font-weight:700;}

  /* ============== صندوق ملاحظة المعلم لولي الأمر ============== */
  #dtr-screen .dtr-note-box{background:#fffdf6; border:1px solid #e4d9c4; border-radius:18px; padding:20px 24px; margin-bottom:22px; position:relative;}
  #dtr-screen .dtr-note-box::before{content:''; position:absolute; top:0; right:24px; left:24px; height:3px; background:#d4af37; border-radius:0 0 3px 3px;}
  #dtr-screen .dtr-note-label{font-size:12.5px; font-weight:700; color:#a79a83; margin-bottom:10px;}
  #dtr-screen .dtr-note-text{font-family:'Amiri',serif; font-size:16.5px; line-height:1.9; color:#10241c; margin:0;}

  /* ============== التذييل ============== */
  #dtr-screen .dtr-footer{padding-top:18px; border-top:1px solid #e4d9c4; display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap;}
  #dtr-screen .dtr-footer-note{font-size:12px; color:#a79a83; font-weight:600; line-height:1.8;}
  #dtr-screen .dtr-sign{text-align:center; min-width:150px;}
  #dtr-screen .dtr-sig-img-wrap{height:36px; display:flex; align-items:flex-end; justify-content:center;}
  #dtr-screen .dtr-sig-img-wrap img{height:36px; width:auto; max-width:150px; object-fit:contain;}
  #dtr-screen .dtr-sign-line{border-bottom:1.3px solid #cdbf9f; height:8px; min-width:150px;}
  #dtr-screen .dtr-sign-name{font-family:'Amiri',serif; font-style:italic; font-weight:700; font-size:15px; color:#8a6221; margin-top:6px;}
  #dtr-screen .dtr-sign-label{font-size:12px; color:#a79a83; font-weight:700; margin-top:4px;}

  #dtr-screen .dtr-home-bar{display:flex; justify-content:center; padding:18px 16px 0;}
  #dtr-screen .dtr-home-btn{
    display:inline-flex; align-items:center; gap:8px;
    background:#2b2620; color:#f3ede1; border:none;
    font-family:'Cairo',sans-serif; font-weight:800; font-size:13.5px;
    padding:11px 22px; border-radius:10px; cursor:pointer;
  }
  #dtr-screen .dtr-home-btn:hover{background:#3a352a;}

  @media (max-width:760px){
    #dtr-screen .dtr-header{padding:20px 18px 18px;}
    #dtr-screen .dtr-body{padding:20px 18px;}
    #dtr-screen .dtr-qcols{grid-template-columns:1fr;}
    #dtr-screen .dtr-vs-row{gap:14px;}
    #dtr-screen .dtr-side{max-width:150px;}
  }
`;
