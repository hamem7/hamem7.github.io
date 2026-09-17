// =============================================================================
// reports/monthly-report.styles.js
// 🌟 [جديد] تنسيق العناصر الإضافية الخاصة بشاشة "تقرير الإنجاز الشهري" فقط —
// منتقي الشهر/السنة، بطاقات ملخص الشهر، جداول تفصيل الواجبات/الاختبارات الثنائية،
// وقائمة الإنجازات. بنفس فلسفة report.styles.js تمامًا (ملف CSS مستقل بدل تضخيم
// monthly-report.js)، ونفس لوحة الألوان (البرشمان/الذهبي) المستخدمة فعليًا في
// تقرير التقييم الفردي الحالي (report.styles.js) بالحرف — هذا تقرير رسمي من نفس
// العائلة البصرية، فلا داعٍ لتصميم مختلف. لا يلمس هذا الملف أي سطر من
// report.styles.js أو أي ملف CSS عام آخر (css/home.css وغيره) إطلاقًا — كل
// القواعد هنا محصورة تحت بادئة .mr- جديدة كليًا، تمامًا كما تنص قاعدة "افصل
// قواعدك في نطاق واضح بدل التعديل المباشر على قواعد موجودة". 🌟
export const MONTHLY_REPORT_STYLES = `
  /* ============== شريط اختيار الشهر/السنة (لا يظهر في الصورة/الملف) ============== */
  #report-screen .mr-month-bar{
    display:flex; align-items:center; justify-content:center; gap:10px; flex-wrap:wrap;
    padding:10px 16px; background:#332d24; border-top:1px solid #46403690;
  }
  #report-screen .mr-month-bar label{color:#c2b393; font-size:11.5px; font-weight:700;}
  #report-screen .mr-month-bar select{
    font-family:'Cairo',sans-serif; font-size:12.5px; font-weight:700;
    background:#3a352a; border:1px solid #55503f; border-radius:8px;
    padding:7px 10px; color:#f3ede1; cursor:pointer;
  }

  /* ============== بطاقات ملخص الشهر ============== */
  #report-screen .mr-summary-grid{
    display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));
    gap:14px; margin-bottom:22px;
  }
  #report-screen .mr-tile{
    background:#fffdf8; border:1px solid #e4d9c4; border-radius:14px;
    padding:16px 18px; text-align:center;
  }
  #report-screen .mr-tile-label{font-size:12px; color:#a79a83; font-weight:700; margin-bottom:8px;}
  #report-screen .mr-tile-value{font-family:'Amiri',serif; font-size:26px; font-weight:700; color:#8a6221;}
  #report-screen .mr-tile-sub{font-size:11.5px; color:#a79a83; font-weight:600; margin-top:4px;}

  /* ============== جداول تفصيل النشاط (واجبات / اختبارات ثنائية) ============== */
  #report-screen .mr-block{
    background:#fffdf8; border:1px solid #e4d9c4; border-radius:14px;
    padding:20px 24px; margin-bottom:22px;
  }
  #report-screen .mr-table{width:100%; border-collapse:collapse; margin-top:10px;}
  #report-screen .mr-table th{
    font-size:11.5px; font-weight:700; color:#a79a83; text-align:start;
    padding:6px 8px; border-bottom:1px solid #e4d9c4;
  }
  #report-screen .mr-table td{
    font-size:13px; font-weight:600; color:#2b2620; padding:9px 8px;
    border-bottom:1px solid #f0e9db;
  }
  #report-screen .mr-table tr:last-child td{border-bottom:none;}
  #report-screen .mr-empty-row{color:#a79a83; font-size:12.5px; font-weight:600; padding:10px 4px;}
  #report-screen .mr-badge{
    display:inline-block; padding:3px 10px; border-radius:999px;
    font-size:11.5px; font-weight:700; white-space:nowrap;
  }
  #report-screen .mr-badge-win{background:#eaf3ea; color:#166534;}
  #report-screen .mr-badge-loss{background:#f2e7e2; color:#a15230;}
  #report-screen .mr-badge-tie{background:#f5eee4; color:#b8863b;}

  /* ============== قائمة الإنجازات/الأوسمة داخل التقرير ============== */
  #report-screen .mr-achv-list{display:flex; flex-wrap:wrap; gap:10px; margin-top:10px;}
  #report-screen .mr-achv-chip{
    display:inline-flex; align-items:center; gap:6px;
    background:#fbf3e1; border:1px solid #e4d9c4; border-radius:999px;
    padding:6px 14px; font-size:13px; font-weight:700; color:#8a6221;
  }

  /* ============== ملاحظة "بيانات غير متتبَّعة حاليًا" (نطاق الحفظ) ============== */
  #report-screen .mr-note-inline{
    font-size:12px; color:#a79a83; font-weight:600; margin-top:8px; line-height:1.7;
  }

  @media (max-width:760px){
    #report-screen .mr-summary-grid{grid-template-columns:repeat(2, 1fr);}
  }
`;
