// =============================================================================
// reports/monthly-report.identity.js
// 🌟 [جديد بالكامل] هوية "منازل القمر" الخاصة بالتقرير الشهري لولي الأمر فقط.
//
// الفكرة: كلمة "الشهر" مأخوذة من الهلال، فكل تقرير شهري رحلة قمر — يبدأ الطالب هلالًا
// ويقترب من البدر بقدر إتقانه (هلال/تربيع/أحدب/بدر). النقش هو "الخاتم" ذو الثمانية رؤوس
// (مربعان متراكبان). الألوان هي نفسها ألوان المنصة (--dh-emerald / --dh-gold المعرّفة في
// css/home.css) بقيمها الحرفية — نسخناها هنا كقيم ثابتة لا كمتغيرات CSS لأن html2canvas
// (المستخدَم في تصدير PNG/PDF) لا يحلّ var() و color-mix() بثبات.
//
// 🌟 العزل: كل القواعد هنا محصورة تحت `#report-screen .page.mr2` (وهي فئة إضافية جديدة
// على صفحة التقرير الشهري وحدها) — لا تُلمَس report.styles.js ولا أي CSS عام، ولا يتأثر
// تقرير التقييم الفردي (report.js) إطلاقًا. القواعد الأقدم في monthly-report.styles.js
// (شريط الشهر، مفتاح النبرة...) بقيت كما هي، وما يخص الصفحة المطبوعة فقط يُعاد تعريفه هنا
// بخصوصية أعلى.
//
// ⚠️ بلا letter-spacing على أي نص عربي (نفس سبب تحذير report.styles.js: html2canvas يفكّك
// الحروف العربية عندها). وبلا الاختصار `inset` (نكتب top/right/bottom/left صراحةً).
// =============================================================================

// الخطوط: Reem Kufi للأرقام والعناوين القصيرة، IBM Plex Sans Arabic للنصوص والجداول،
// Amiri وAmiri Quran للأسماء والرسالة والآيات. (Amiri موجود أصلًا في المنصة، ونحمّله هنا
// أيضًا لضمان توفره في هذه الشاشة وحدها.) وسم <style> مستقل لأن @import يجب أن يكون
// أول قاعدة في وسمه.
export const MONTHLY_REPORT_FONTS_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Amiri+Quran&family=IBM+Plex+Sans+Arabic:wght@400;500;600&family=Reem+Kufi:wght@500;600;700&display=swap');`;

export const MONTHLY_REPORT_IDENTITY_STYLES = `
  /* ============== إطار الصفحة (ورق كريمي بلا حشو — الهيرو بعرض كامل) ============== */
  #report-screen .page.mr2{
    width:794px; max-width:100%; padding:0; overflow:hidden;
    /* 🌟 [2026-10-03] علامة مائية باهتة جداً لشعار المنصة تحت الهيرو (الشفافية مدمجة في ملف SVG نفسه) */
    background:#fffdf6 url("assets/brand/ham-logo-watermark.svg") no-repeat center 62% / 46% auto; color:#10241c;
    font-family:'IBM Plex Sans Arabic','Cairo',sans-serif;
  }
  /* الأقسام (غير الهيرو والفوتر) تأخذ هوامشها الجانبية بنفسها حتى يبقى الهيرو بعرض كامل */
  #report-screen .page.mr2 > .pdf-block:not(.mr2-hero):not(.mr2-footer){margin:0 48px 20px;}
  #report-screen .page.mr2 > .pdf-block.mr2-body-top:not(.mr2-hero):not(.mr2-footer){margin-top:44px;}

  /* ============== الهيرو ============== */
  #report-screen .page.mr2 .mr2-hero{
    position:relative; background:#06231c; color:#f6f3e8;
    border-bottom:3px solid #d4af37; margin-bottom:0;
  }
  #report-screen .page.mr2 .mr2-hero-bg{position:absolute; top:0; right:0; bottom:0; left:0; width:100%; height:100%;}
  #report-screen .page.mr2 .mr2-hero-frame{
    position:absolute; top:14px; right:14px; bottom:14px; left:14px;
    border:1px solid rgba(212,175,55,.35); border-radius:4px; pointer-events:none;
  }
  #report-screen .page.mr2 .mr2-hero-inner{
    position:relative; padding:24px 48px 30px;
    display:flex; flex-direction:column; gap:12px;
  }
  #report-screen .page.mr2 .mr2-hero-star{
    position:absolute; left:50%; margin-left:-26px; bottom:-27px; width:52px; height:52px;
  }

  #report-screen .page.mr2 .mr2-topbar{display:flex; align-items:center; gap:14px;}
  #report-screen .page.mr2 .mr2-logo{width:54px; height:auto; flex-shrink:0; display:block;}
  #report-screen .page.mr2 .mr2-brand-name{font-family:'Reem Kufi','Amiri',serif; font-size:26px; line-height:1; color:#fffdf6; font-weight:600;}
  #report-screen .page.mr2 .mr2-brand-sub{font-size:12.5px; color:#d4af37; margin-top:3px; font-weight:500;}
  #report-screen .page.mr2 .mr2-period{margin-inline-start:auto; display:flex; flex-direction:column; gap:3px;}
  #report-screen .page.mr2 .mr2-period-month{font-family:'Reem Kufi','Amiri',serif; font-size:24px; line-height:1.1; color:#f0d878; font-weight:600;}
  #report-screen .page.mr2 .mr2-period-range{font-size:13px; color:#f6f3e8; font-weight:500;}
  #report-screen .page.mr2 .mr2-period-hijri{font-size:13px; color:#c9d8d0; font-weight:500;}

  #report-screen .page.mr2 .mr2-hero-main{display:flex; align-items:center; justify-content:space-between; gap:20px;}
  #report-screen .page.mr2 .mr2-hero-text{flex:1; min-width:0; display:flex; flex-direction:column; gap:6px;}
  #report-screen .page.mr2 .mr2-eyebrow{
    display:flex; align-items:center; gap:10px;
    font-family:'Reem Kufi','Amiri',serif; font-size:15px; color:#d4af37; font-weight:500;
  }
  #report-screen .page.mr2 .mr2-eyebrow::before{content:''; width:28px; height:1px; background:#d4af37; display:block;}
  #report-screen .page.mr2 .mr2-id-row{display:flex; align-items:center; gap:16px;}
  #report-screen .page.mr2 .mr2-avatar{
    flex:none; width:82px; height:82px; box-sizing:border-box;
    border-radius:50%; padding:4px; background:#d4af37;
  }
  #report-screen .page.mr2 .mr2-avatar-inner{
    width:100%; height:100%; border-radius:50%; background:#0b3d30; overflow:hidden;
    display:flex; align-items:center; justify-content:center;
    font-family:'Amiri',serif; font-size:36px; font-weight:700; color:#f0d878; line-height:1;
  }
  #report-screen .page.mr2 .mr2-avatar-inner img{width:100%; height:100%; object-fit:cover; display:block;}
  #report-screen .page.mr2 .mr2-id-text{display:flex; flex-direction:column; gap:4px; align-items:flex-start; min-width:0;}
  #report-screen .page.mr2 .mr2-name{font-family:'Amiri',serif; font-weight:700; font-size:34px; line-height:1.15; color:#fffdf6;}
  #report-screen .page.mr2 .mr2-grade{font-size:15px; color:#c9d8d0; font-weight:500;}
  #report-screen .page.mr2 .mr2-scope{
    font-size:13px; color:#f0d878; font-weight:500; padding:4px 14px;
    border:1px solid rgba(212,175,55,.6); border-radius:20px; display:inline-block;
  }
  #report-screen .page.mr2 .mr2-verse{font-family:'Amiri Quran','Amiri',serif; font-size:20px; line-height:1.5; color:#f0d878; flex:1; text-align:center;}
  #report-screen .page.mr2 .mr2-figures{display:flex; gap:22px; align-items:center; margin-top:2px;}
  #report-screen .page.mr2 .mr2-fig-num{font-family:'Reem Kufi','Amiri',serif; font-size:30px; line-height:1; color:#f0d878; font-weight:500;}
  #report-screen .page.mr2 .mr2-fig-num small{font-size:16px;}
  #report-screen .page.mr2 .mr2-fig-lbl{font-size:12.5px; color:#c9d8d0; margin-top:4px; font-weight:500;}
  #report-screen .page.mr2 .mr2-fig-sep{width:1px; height:34px; background:rgba(212,175,55,.45);}
  #report-screen .page.mr2 .mr2-moon{flex:none; width:150px; height:150px;}

  /* ============== عناوين الأقسام ============== */
  #report-screen .page.mr2 .section-title{
    display:flex; align-items:center; gap:12px;
    font-family:'Reem Kufi','Amiri',serif; font-size:20px; font-weight:600; color:#0b3d30; margin:0;
  }
  #report-screen .page.mr2 .section-title::after{content:''; flex:1; height:1px; background:#e3dbbd; display:block;}
  #report-screen .page.mr2 .section-sub{font-size:12.5px; color:#4a6058; font-weight:500; margin:5px 0 0;}

  /* ============== بطاقات المنازل (ملخص الشهر) ============== */
  #report-screen .page.mr2 .mr-summary-grid{
    display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; margin:12px 0 14px;
  }
  #report-screen .page.mr2 .mr-tile{
    background:#ffffff; border:1px solid #e3dbbd; border-radius:14px;
    padding:14px; text-align:start; display:flex; flex-direction:column; gap:7px;
  }
  #report-screen .page.mr2 .mr-tile-top{display:flex; justify-content:space-between; align-items:flex-start;}
  #report-screen .page.mr2 .mr-tile-value{
    font-family:'Reem Kufi','Amiri',serif; font-size:34px; line-height:1; color:#0b3d30; font-weight:500; margin:0;
  }
  #report-screen .page.mr2 .mr-tile-label{font-size:14px; font-weight:600; color:#10241c; margin:0;}
  #report-screen .page.mr2 .mr-tile-sub{font-size:12px; font-weight:500; color:#4a6058; margin:0;}
  #report-screen .page.mr2 .mr2-chip{font-size:12px; font-weight:600; padding:3px 10px; border-radius:20px; white-space:nowrap;}
  #report-screen .page.mr2 .mr2-chip.full{background:#0b3d30; color:#f0d878;}
  #report-screen .page.mr2 .mr2-chip.gibbous{background:#cfe7dc; color:#0b3d30;}
  #report-screen .page.mr2 .mr2-chip.quarter{background:#f3e7b5; color:#5c4508;}
  #report-screen .page.mr2 .mr2-chip.crescent{background:#efe6c8; color:#6b4f0a;}

  /* دليل المنازل */
  #report-screen .page.mr2 .mr2-legend{
    background:#f6f3e8; border-radius:14px; padding:12px 18px;
    display:flex; align-items:center; gap:18px;
  }
  #report-screen .page.mr2 .mr2-legend-title{font-family:'Reem Kufi','Amiri',serif; font-size:15px; font-weight:600; color:#0b3d30; white-space:nowrap;}
  #report-screen .page.mr2 .mr2-legend-items{flex:1; display:flex; justify-content:space-between; gap:8px;}
  #report-screen .page.mr2 .mr2-legend-item{display:flex; align-items:center; gap:8px;}
  #report-screen .page.mr2 .mr2-legend-name{font-size:13px; font-weight:600; line-height:1.35;}
  #report-screen .page.mr2 .mr2-legend-lvl{font-size:12px; font-weight:500; color:#4a6058; line-height:1.35;}

  /* ============== كتل الأقسام والجداول ============== */
  #report-screen .page.mr2 .mr-block{
    background:#ffffff; border:1px solid #e3dbbd; border-radius:16px; padding:18px 22px;
  }
  #report-screen .page.mr2 .mr-table th{
    background:#f6f3e8; color:#4a6058; font-size:12.5px; font-weight:600;
    padding:9px 12px; border-bottom:1px solid #e3dbbd; text-align:start;
  }
  #report-screen .page.mr2 .mr-table td{
    font-size:13.5px; font-weight:500; color:#10241c; padding:10px 12px; border-bottom:1px solid #e3dbbd;
  }
  #report-screen .page.mr2 .mr-empty-row{font-size:13px; font-weight:500; color:#4a6058;}
  #report-screen .page.mr2 .mr-note-inline{font-size:13px; font-weight:500; color:#4a6058; line-height:1.8;}
  #report-screen .page.mr2 .mr-badge-win{background:#cfe7dc; color:#0b3d30;}
  #report-screen .page.mr2 .mr-badge-loss{background:#efe6c8; color:#6b4f0a;}
  #report-screen .page.mr2 .mr-badge-tie{background:#f3e7b5; color:#5c4508;}
  #report-screen .page.mr2 .mr-achv-chip{background:#f6f3e8; border:1px solid #e3dbbd; color:#0b3d30;}

  /* رحلة الحفظ — بطاقة زمردية بنص ذهبي (أهم قسم بصري في التقرير) */
  #report-screen .page.mr2 .mr-journey-box{
    background:#0b3d30; border:1px solid #d4af37; border-radius:16px; padding:20px 24px;
  }
  #report-screen .page.mr2 .mr-journey-label{color:#c9d8d0; font-weight:500;}
  #report-screen .page.mr2 .mr-journey-pos{font-family:'Amiri',serif; font-size:22px; color:#f0d878;}
  #report-screen .page.mr2 .mr-journey-arrow{color:#d4af37;}
  #report-screen .page.mr2 .mr-journey-new{font-family:'Amiri',serif; color:#f6f3e8; font-size:20px;}

  /* اتجاه الحفظ */
  #report-screen .page.mr2 .mr-trend-total{color:#0b3d30;}

  /* ============== رسالة المعلم ============== */
  #report-screen .page.mr2 .note-box{
    position:relative; overflow:hidden;
    background:#0b3d30; color:#f6f3e8; border:none; border-radius:16px; padding:20px 24px;
  }
  #report-screen .page.mr2 .note-box::before{display:none;}
  #report-screen .page.mr2 .note-box::after{
    content:'\\201D'; position:absolute; top:-8px; left:16px;
    font-family:'Amiri',serif; font-size:110px; line-height:1; color:#d4af37; opacity:.25;
  }
  #report-screen .page.mr2 .note-label{
    font-family:'Reem Kufi','Amiri',serif; font-size:17px; font-weight:600; color:#f0d878; margin-bottom:8px;
  }
  #report-screen .page.mr2 .note-text{
    position:relative; font-family:'Amiri',serif; font-size:17px; line-height:1.95;
    color:#f6f3e8; text-align:start;
  }

  /* ============== خطة الشهر القادم (رسالة تحفيز) ============== */
  #report-screen .page.mr2 .mr2-plan-card{
    margin-top:12px; background:#fffdf6; border:1px solid #d4af37; border-radius:16px;
    padding:18px 24px; display:flex; flex-direction:column; gap:12px;
  }
  #report-screen .page.mr2 .mr2-plan-text{font-family:'Amiri',serif; font-size:17px; line-height:1.95; color:#10241c; margin:0;}
  #report-screen .page.mr2 .mr2-plan-chips{display:flex; gap:10px; flex-wrap:wrap;}
  #report-screen .page.mr2 .mr2-plan-chip{
    display:inline-flex; align-items:center; gap:8px; padding:5px 14px;
    border:1px solid #d4af37; border-radius:24px; background:#0b3d30;
    font-family:'Reem Kufi','Amiri',serif; font-size:14px; font-weight:500; color:#f0d878;
  }

  /* ============== التوقيع والختم ============== */
  #report-screen .page.mr2 .closing{
    margin-top:0; padding:20px 0 6px; border-top:1px solid #e3dbbd;
    display:flex; align-items:flex-end; justify-content:space-between; gap:20px;
  }
  #report-screen .page.mr2 .teacher-sign{text-align:center; min-width:220px;}
  #report-screen .page.mr2 .teacher-line{border-bottom:1px solid #4a6058; height:44px; min-width:220px;}
  #report-screen .page.mr2 .sig-name{font-family:'Amiri',serif; font-weight:700; font-size:16px; color:#0b3d30; margin-top:8px;}
  #report-screen .page.mr2 .teacher-label{font-size:12.5px; color:#4a6058; font-weight:500; margin-top:2px;}
  /* ختم المعلم الرسمي (من ملف المعلم) — بلا خلفية ولا حدود حتى يجلس على الورق مباشرة
     (نفس تحذير report.styles.js: أي خلفية هنا تعيد إنتاج "المربع الأسود" القديم).
     يُخفى بالكامل من جافاسكريبت إن لم يرفع المعلم ختمًا. */
  #report-screen .page.mr2 .mr2-stamp-wrap{display:flex; align-items:flex-end; justify-content:center; min-width:110px;}
  #report-screen .page.mr2 .mr2-stamp-wrap img{
    display:block; max-height:104px; max-width:180px; width:auto; height:auto;
    object-fit:contain; background:none; border:none;
  }

  /* ============== الفوتر ============== */
  /* 🌟 [جديد] "رحلة المراجعة": صفوف الأجزاء الخمسة (بلا var()/color-mix لأجل html2canvas) */
  #report-screen .page.mr2 .mr-rev-row{display:flex; flex-wrap:wrap; align-items:center; gap:6px 14px; padding:10px 0; border-bottom:1px solid #efe7d2;}
  #report-screen .page.mr2 .mr-rev-row:last-of-type{border-bottom:none;}
  #report-screen .page.mr2 .mr-rev-name{font-family:'Amiri',serif; font-weight:700; font-size:18px; color:#0d5c46; min-width:120px;}
  #report-screen .page.mr2 .mr-rev-range{flex:1; font-size:14px; font-weight:600; color:#2b2620; min-width:160px;}
  #report-screen .page.mr2 .mr-rev-arrow{color:#b8863b; font-weight:700; padding:0 4px;}
  #report-screen .page.mr2 .mr-rev-count{font-size:13px; font-weight:700; color:#8a6221; min-width:64px; text-align:end;}
  #report-screen .page.mr2 .mr-rev-bar{flex-basis:100%; height:6px; border-radius:6px; background:#efe7d2; overflow:hidden;}
  #report-screen .page.mr2 .mr-rev-fill{height:100%; border-radius:6px; background:#d4af37;}
  #report-screen .page.mr2 .mr-rev-total{margin-top:10px; font-family:'Amiri',serif; font-size:17px; font-weight:700; color:#0d5c46; text-align:center;}

  #report-screen .page.mr2 .mr2-footer{
    margin:0; padding:0 48px; height:60px; box-sizing:border-box;
    background:#06231c; border-top:3px solid #d4af37;
    display:flex; align-items:center; justify-content:space-between; gap:16px;
  }
  #report-screen .page.mr2 .mr2-footer-bless{font-family:'Amiri',serif; font-size:16px; color:#f0d878;}
  #report-screen .page.mr2 .mr2-footer-meta{font-size:12.5px; font-weight:500; color:#b9cbc2; text-align:start;}
  #report-screen .page.mr2 .mr2-footer-meta b{color:#f6f3e8; font-weight:600;}

  @media (max-width:760px){
    #report-screen .page.mr2 .mr2-hero-inner{padding:28px 20px 34px;}
    #report-screen .page.mr2 .mr2-hero-main{flex-direction:column;}
    #report-screen .page.mr2 .mr2-moon{width:130px; height:130px;}
    #report-screen .page.mr2 > .pdf-block:not(.mr2-hero):not(.mr2-footer){margin:0 16px 16px;}
    #report-screen .page.mr2 .mr-summary-grid{grid-template-columns:repeat(2, minmax(0, 1fr));}
    #report-screen .page.mr2 .mr2-legend{flex-direction:column; align-items:flex-start;}
    #report-screen .page.mr2 .mr2-legend-items{flex-wrap:wrap;}
  }
`;
