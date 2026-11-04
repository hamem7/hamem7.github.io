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
  /* 🌟 [2026-11] أرقام الهيرو بلا صندوق: خط أقوى وأبيض صريح، مع ظلّ ناعم يفصله عن الزخرفة خلفه */
  #report-screen .page.mr2 .mr2-fig-num{font-family:'Reem Kufi','Amiri',serif; font-size:36px; line-height:1; color:#f0d878; font-weight:700; text-shadow:0 2px 10px rgba(0,0,0,.75);}
  #report-screen .page.mr2 .mr2-fig-num small{font-size:18px;}
  #report-screen .page.mr2 .mr2-fig-lbl{font-size:14.5px; color:#ffffff; margin-top:6px; font-weight:700; text-shadow:0 1px 8px rgba(0,0,0,.85);}
  #report-screen .page.mr2 .mr2-fig-ev{font-size:12px; color:#ffffff; margin-top:3px; font-weight:500; max-width:300px; line-height:1.6; text-shadow:0 1px 6px rgba(0,0,0,.9);}
  #report-screen .page.mr2 .mr2-fig-ev:empty{display:none;}
  #report-screen .page.mr2 .mr2-fig-sep{width:1px; height:44px; background:rgba(212,175,55,.6);}
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
  /* 🌟 [2026-11] مؤشر أدلّته أقل من 3: لا منزل */
  #report-screen .page.mr2 .mr2-chip.mr2-chip-na{background:#eceae3; color:#6b6b63; border:1px dashed #b9b4a4;}

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

  /* رحلة الحفظ — «حلقة الجزء»: حلقة بعدد الآيات + من/إلى + وتيرة الحفظ + موعد الختم المتوقع */
  #report-screen .page.mr2 .mr-jm{display:grid; grid-template-columns:250px 1fr; gap:22px; align-items:center; padding:20px 22px; text-align:start;}
  #report-screen .page.mr2 .mr-jm-ring{position:relative; width:250px; height:250px;}
  #report-screen .page.mr2 .mr-jm-ring svg{display:block; width:100%; height:100%; overflow:visible;}
  #report-screen .page.mr2 .mr-jm-ring-c{position:absolute; top:0; right:0; bottom:0; left:0; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;}
  #report-screen .page.mr2 .mr-jm-ring-c b{font-family:'Amiri',serif; font-size:54px; line-height:1; font-weight:700; color:#f0d878;}
  #report-screen .page.mr2 .mr-jm-ring-c strong{font-size:13px; font-weight:700; color:#f6f3e8; margin-top:2px; max-width:140px;}
  #report-screen .page.mr2 .mr-jm-ring-c small{font-size:10.5px; color:#9fb8ad; margin-top:7px; padding-top:6px; border-top:1px solid rgba(240,216,120,.25); line-height:1.5; max-width:140px;}
  #report-screen .page.mr2 .mr-jm-ring-c small em{font-style:normal; font-weight:700; color:#d9c27a;}
  #report-screen .page.mr2 .mr-jm-side{min-width:0; display:flex; flex-direction:column; gap:12px;}
  #report-screen .page.mr2 .mr-jm-box{background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:11px 14px;}
  #report-screen .page.mr2 .mr-jm-route{display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:8px 12px;}
  #report-screen .page.mr2 .mr-jm-pt{display:flex; flex-direction:column; gap:2px;}
  #report-screen .page.mr2 .mr-jm-pt .mr-journey-pos{font-size:20px;}
  #report-screen .page.mr2 .mr-jm-way + .mr-jm-pt{text-align:end;}
  #report-screen .page.mr2 .mr-jm-way{order:3; flex-basis:100%; display:flex; flex-direction:column; align-items:center; gap:4px;}
  #report-screen .page.mr2 .mr-jm-way i{display:block; width:100%; height:2px; background:#d4af37; opacity:.75;}
  #report-screen .page.mr2 .mr-jm-way em{font-style:normal; font-size:11px; font-weight:700; color:#d4af37; text-align:center;}
  #report-screen .page.mr2 .mr-jm-pace{display:flex; flex-direction:column; gap:7px;}
  #report-screen .page.mr2 .mr-jm-ph{display:flex; justify-content:space-between; align-items:center; gap:8px; font-size:12.5px; font-weight:700; color:#d7e4dd;}
  #report-screen .page.mr2 .mr-jm-delta{font-size:11.5px; font-weight:700; border-radius:99px; padding:1px 10px; white-space:nowrap;}
  #report-screen .page.mr2 .mr-jm-delta.up{background:#9ee0bf; color:#0b3d30;}
  #report-screen .page.mr2 .mr-jm-delta.down{background:#efe6c8; color:#6b4f0a;}
  #report-screen .page.mr2 .mr-jm-delta.same{background:#c9d8d0; color:#0b3d30;}
  #report-screen .page.mr2 .mr-jm-prow{display:grid; grid-template-columns:86px 1fr 66px; gap:8px; align-items:center; font-size:11.5px; color:#9fb8ad;}
  #report-screen .page.mr2 .mr-jm-pbar{display:block; height:10px; border-radius:6px; background:rgba(255,255,255,.08); overflow:hidden;}
  #report-screen .page.mr2 .mr-jm-pbar i{display:block; height:100%; border-radius:6px; background:#f0d878;}
  #report-screen .page.mr2 .mr-jm-prow.prev .mr-jm-pbar i{background:#7f948b;}
  #report-screen .page.mr2 .mr-jm-prow b{font-family:'Amiri',serif; font-size:17px; line-height:1; color:#f0d878; text-align:end; white-space:nowrap;}
  #report-screen .page.mr2 .mr-jm-prow.prev b{color:#c9d8d0;}
  #report-screen .page.mr2 .mr-jm-prow b small{font-family:'IBM Plex Sans Arabic',sans-serif; font-size:10.5px; font-weight:500; color:#9fb8ad; margin-inline-start:3px;}
  #report-screen .page.mr2 .mr-jm-eta{display:flex; align-items:center; gap:14px; background:rgba(212,175,55,.13); border-color:rgba(212,175,55,.55);}
  #report-screen .page.mr2 .mr-jm-eta-ic{flex:none; width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; background:rgba(240,216,120,.15); font-size:21px;}
  #report-screen .page.mr2 .mr-jm-eta small{display:block; font-size:11.5px; font-weight:600; color:#d7e4dd;}
  #report-screen .page.mr2 .mr-jm-eta b{display:block; font-family:'Amiri',serif; font-size:21px; line-height:1.35; color:#f0d878;}
  #report-screen .page.mr2 .mr-jm-eta p{margin:0; font-size:11.5px; color:#9fb8ad; line-height:1.6;}
  #report-screen .page.mr2 .mr-jm-foot{font-size:11.5px; font-weight:600; color:#9fb8ad;}
  #report-screen .page.mr2 .mr-jm-legend{grid-column:1 / -1; display:flex; flex-wrap:wrap; gap:16px; font-size:11px; color:#9fb8ad; border-top:1px solid rgba(240,216,120,.18); padding-top:11px;}
  #report-screen .page.mr2 .mr-jm-legend i{display:inline-block; width:22px; height:10px; border-radius:5px; vertical-align:middle; margin-inline-end:6px;}
  #report-screen .page.mr2 .mr-jm-legend i.b{background:#a88a32;}
  #report-screen .page.mr2 .mr-jm-legend i.m{background:#f0d878;}
  #report-screen .page.mr2 .mr-jm-legend i.r{background:#2a5446;}
  #report-screen .page.mr2 .mr-err-surah{color:#4a6058;}

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

  /* =====================================================================================
     🌟 [2026-11] أقسام معاد تصميمها: تقييمات غرفة اللعب · الواجبات (تذاكر) · أخطاء عولجت (مجمّعة) · المقارنة الشهرية
     · «بُني هذا التقرير على». ألوان ثابتة وSVG فقط (html2canvas)، بلا var() ولا letter-spacing.
     ===================================================================================== */
  #report-screen .page.mr2 .mrp-panel{background:#0b3d30; border:1px solid #d4af37; border-radius:16px; padding:12px 14px; color:#f6f3e8;}
  #report-screen .page.mr2 .mrp-panel small{font-size:11px; color:#a9c7ba;}
  #report-screen .page.mr2 .mrp-num{font-family:'Reem Kufi','Amiri',serif; color:#f0d878; line-height:1.05; font-weight:600;}
  /* تقييمات غرفة اللعب */
  #report-screen .page.mr2 .mrp-ge{display:grid; grid-template-columns:200px 1fr; gap:14px; align-items:stretch;}
  #report-screen .page.mr2 .mrp-ge .mrp-panel{display:flex; flex-direction:column; gap:6px;}
  #report-screen .page.mr2 .mrp-ge-avg{display:flex; align-items:center; gap:10px;}
  #report-screen .page.mr2 .mrp-ge-avg .mrp-num{display:block; font-size:34px; margin-bottom:4px;}
  #report-screen .page.mr2 .mrp-kv3{display:grid; grid-template-columns:repeat(3,1fr); gap:4px; text-align:center; border-top:1px solid rgba(255,255,255,.12); border-bottom:1px solid rgba(255,255,255,.12); padding:8px 0;}
  #report-screen .page.mr2 .mrp-kv3 .mrp-num{display:block; font-size:18px;}
  #report-screen .page.mr2 .mrp-kv3 span{font-size:10.5px; color:#c9d8d0;}
  #report-screen .page.mr2 .mrp-tags{display:flex; flex-direction:column; gap:4px; font-size:11px; color:#d7e4dd;}
  #report-screen .page.mr2 .mrp-tags span{background:rgba(255,255,255,.07); border-radius:8px; padding:2px 8px;}
  #report-screen .page.mr2 .mrp-ge-chart{background:#ffffff; border:1px solid #eadfbd; border-radius:16px; padding:10px 12px 8px; display:flex; flex-direction:column; justify-content:space-between;}
  #report-screen .page.mr2 .mrp-ge-chart svg{display:block; width:100%; height:auto;}
  #report-screen .page.mr2 .mrp-ge-note{font-size:11.5px; color:#4a6058; border-top:1px dashed #e6dcbc; padding-top:6px; margin-top:4px;}
  #report-screen .page.mr2 .mrp-ge-note .xl{display:inline-block; width:22px; border-top:2px dashed #d4af37; vertical-align:middle; margin-inline-end:6px;}
  /* الواجبات — تذاكر مدمجة (5 في الصف: 10 واجبات في صفّين) */
  #report-screen .page.mr2 .mrp-hw{display:grid; grid-template-columns:180px 1fr; gap:14px; align-items:stretch;}
  #report-screen .page.mr2 .mrp-hw .mrp-panel{display:flex; flex-direction:column; gap:8px; justify-content:center;}
  #report-screen .page.mr2 .mrp-hw-top{display:flex; align-items:baseline; gap:8px; border-bottom:1px solid rgba(255,255,255,.12); padding-bottom:6px;}
  #report-screen .page.mr2 .mrp-hw-top .mrp-num{font-size:34px;}
  #report-screen .page.mr2 .mrp-hw-top span{font-size:12px; color:#d7e4dd;}
  #report-screen .page.mr2 .mrp-hw-avg{display:flex; align-items:center; gap:8px;}
  #report-screen .page.mr2 .mrp-hw-avg .mrp-num{display:block; font-size:24px; margin-bottom:3px;}
  #report-screen .page.mr2 .mrp-kv2{display:grid; grid-template-columns:1fr 1fr; gap:4px; text-align:center; border-top:1px solid rgba(255,255,255,.12); padding-top:6px;}
  #report-screen .page.mr2 .mrp-kv2 .mrp-num{display:block; font-size:17px;}
  #report-screen .page.mr2 .mrp-kv2 span{font-size:10.5px; color:#c9d8d0;}
  #report-screen .page.mr2 .mrp-tk-grid{display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); gap:7px; align-content:start;}
  #report-screen .page.mr2 .mrp-tk{background:#ffffff; border:1px solid #eadfbd; border-top:3px solid #0b3d30; border-radius:10px; padding:6px 8px 7px; min-width:0;}
  #report-screen .page.mr2 .mrp-tk-r1{display:flex; align-items:baseline; justify-content:space-between; gap:4px;}
  #report-screen .page.mr2 .mrp-tk-dt{font-size:10.5px; font-weight:700; color:#8a6221; white-space:nowrap;}
  #report-screen .page.mr2 .mrp-tk-sc{font-family:'Reem Kufi','Amiri',serif; font-size:20px; line-height:1; font-weight:600;}
  #report-screen .page.mr2 .mrp-tk-sc small{font-size:11px;}
  #report-screen .page.mr2 .mrp-tk-scope{font-size:11px; color:#4a6058; margin-top:3px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
  #report-screen .page.mr2 .mrp-tk-bar{display:block; height:4px; border-radius:99px; background:#f1ecdc; margin-top:5px; overflow:hidden;}
  #report-screen .page.mr2 .mrp-tk-bar i{display:block; height:100%; border-radius:99px;}
  /* أخطاء عولجت — مجمّعة حسب السورة */
  #report-screen .page.mr2 .mrp-err{display:grid; grid-template-columns:150px 1fr; gap:12px; align-items:stretch;}
  #report-screen .page.mr2 .mrp-err .mrp-panel{display:flex; flex-direction:column; justify-content:center; text-align:center;}
  #report-screen .page.mr2 .mrp-err .mrp-num{font-size:34px;}
  #report-screen .page.mr2 .mrp-err .mrp-panel span{font-size:12px; color:#c9d8d0; margin-top:4px;}
  #report-screen .page.mr2 .mrp-err .mrp-panel em{font-style:normal; font-size:11px; font-weight:700; color:#06231c; background:#f3e7b5; border-radius:99px; padding:1px 8px; margin:6px auto 0;}
  #report-screen .page.mr2 .mrp-err-list{display:flex; flex-direction:column; gap:6px;}
  #report-screen .page.mr2 .mrp-err-g{display:grid; grid-template-columns:120px 1fr 28px; gap:8px; align-items:center; background:#ffffff; border:1px solid #eadfbd; border-radius:10px; padding:6px 10px;}
  #report-screen .page.mr2 .mrp-err-g .s{font-size:13px; font-weight:700; color:#164f40;}
  #report-screen .page.mr2 .mrp-err-g .a{display:flex; flex-wrap:wrap; gap:4px;}
  #report-screen .page.mr2 .mrp-err-g .a i{font-style:normal; font-size:11.5px; background:#eef6f2; color:#0b3d30; border:1px solid #cfe5da; border-radius:99px; padding:0 8px;}
  #report-screen .page.mr2 .mrp-err-g .n{font-family:'Reem Kufi','Amiri',serif; font-size:15px; color:#8a6221; text-align:center;}
  #report-screen .page.mr2 .mrp-err-g.pend{background:#fffaf0; border-style:dashed;}
  #report-screen .page.mr2 .mrp-err-g.pend .s{color:#8a6221;}
  #report-screen .page.mr2 .mrp-err-g.pend .a i{background:#fbf1d6; border-color:#ecd58a; color:#6f5410;}
  /* المقارنة الشهرية — لوحة نتائج: بطاقة لكل مؤشر (القيمة الآن، والسابقة، والفرق، وشريطان صغيران) */
  #report-screen .page.mr2 .mrp-cmp-head{display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin:2px 0 10px;}
  #report-screen .page.mr2 .mrp-cmp-head .up, #report-screen .page.mr2 .mrp-cmp-head .down, #report-screen .page.mr2 .mrp-cmp-head .same{font-size:12px; font-weight:700; border-radius:99px; padding:3px 12px;}
  #report-screen .page.mr2 .mrp-cmp-head .up{background:#e5f4ec; color:#1f7a55;}
  #report-screen .page.mr2 .mrp-cmp-head .down{background:#fbe7e3; color:#a63a2a;}
  #report-screen .page.mr2 .mrp-cmp-head .same{background:#f1efe8; color:#6b6b63;}
  #report-screen .page.mr2 .mrp-cmp-head .months{margin-inline-start:auto; font-size:12px; color:#4a6058; font-weight:600;}
  #report-screen .page.mr2 .mrp-cmp-grid{display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:10px;}
  #report-screen .page.mr2 .mrp-cc{position:relative; background:#ffffff; border:1px solid #eadfbd; border-radius:14px; padding:10px 12px 11px; overflow:hidden;}
  #report-screen .page.mr2 .mrp-cc::before{content:''; position:absolute; top:0; right:0; left:0; height:4px; background:#cfc6a8;}
  #report-screen .page.mr2 .mrp-cc.up::before{background:#1f7a55;}
  #report-screen .page.mr2 .mrp-cc.down::before{background:#c0613f;}
  #report-screen .page.mr2 .mrp-cc-h{display:flex; justify-content:space-between; align-items:flex-start; gap:6px;}
  #report-screen .page.mr2 .mrp-cc-h b{font-size:12.5px; color:#4a6058; font-weight:700; line-height:1.4;}
  #report-screen .page.mr2 .mrp-cc-d{flex:none; font-size:12px; font-weight:800; border-radius:99px; padding:1px 9px; white-space:nowrap;}
  #report-screen .page.mr2 .mrp-cc.up .mrp-cc-d{background:#e5f4ec; color:#1f7a55;}
  #report-screen .page.mr2 .mrp-cc.down .mrp-cc-d{background:#fbe7e3; color:#a63a2a;}
  #report-screen .page.mr2 .mrp-cc.same .mrp-cc-d{background:#f1efe8; color:#6b6b63;}
  #report-screen .page.mr2 .mrp-cc-v{display:flex; align-items:baseline; gap:8px; margin:6px 0 2px;}
  #report-screen .page.mr2 .mrp-cc-v .mrp-num{font-size:30px; color:#0b3d30;}
  #report-screen .page.mr2 .mrp-cc-v span{font-size:12px; color:#8a7d5c;}
  #report-screen .page.mr2 .mrp-cc-bars{display:flex; flex-direction:column; gap:3px; margin-top:6px;}
  #report-screen .page.mr2 .mrp-cc-bars i{display:block; height:6px; border-radius:99px; min-width:3px;}
  #report-screen .page.mr2 .mrp-cc-bars i.pv{background:#d9d1b6;}
  #report-screen .page.mr2 .mrp-cc-bars i.cu{background:#0b3d30;}
  #report-screen .page.mr2 .mrp-cc.down .mrp-cc-bars i.cu{background:#c0613f;}
  #report-screen .page.mr2 .mrp-cc-prev{font-size:11px; color:#8a7d5c; margin-top:4px;}
  #report-screen .page.mr2 .mrp-cmp-note{font-size:11px; color:#8a7d5c; margin-top:8px;}
  /* «بُني هذا التقرير على» */
  #report-screen .page.mr2 .mr2-sources{padding:10px 14px; background:#f7f2e2; border:1px solid #e6dcbc; border-radius:12px; font-size:12px; line-height:1.9; color:#4a6058;}
  #report-screen .page.mr2 .mr2-sources:empty{display:none;}
  #report-screen .page.mr2 .mr2-sources b{color:#164f40;}
  @media (max-width:640px){
    #report-screen .page.mr2 .mrp-ge, #report-screen .page.mr2 .mrp-hw, #report-screen .page.mr2 .mrp-err{grid-template-columns:1fr;}
    #report-screen .page.mr2 .mrp-tk-grid{grid-template-columns:repeat(3,minmax(0,1fr));}
    #report-screen .page.mr2 .mrp-cmp-grid{grid-template-columns:repeat(2,minmax(0,1fr));}
  }
`;
