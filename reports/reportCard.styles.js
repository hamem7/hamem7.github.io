// =============================================================================
// reports/reportCard.styles.js
// تنسيق بطاقة «متابعة ولي الأمر» (صورة واتساب 1080 عرضًا). عرضها ثابت 540px وتُلتقط بمقياس ×2،
// فكل المقاسات بالبكسل (لا وحدات cqw لأن html2canvas لا يدعم استعلامات الحاوية).
// ألوانها ثابتة عمدًا (صورة تُصدَّر، لا شاشة تتبع المظهر الداكن) — مجلد reports/ مستثنى من فحص الداكن.
// الخط القرآني غير مستعمل هنا إطلاقًا (أرقام آيات وأسماء سور فقط).
// =============================================================================
export const RC_STYLES = `
.rc{width:540px;position:relative;overflow:hidden;border-radius:0;
  background:#f8f3e8;color:#1c2a23;font-family:'IBM Plex Sans Arabic',sans-serif;display:flex;flex-direction:column}
.rc .band{background:linear-gradient(135deg,#0b3d30,#0d5c46 60%,#147c5e);color:#fff;padding:18.36px 27px 43.2px;position:relative}
.rc .band::after{content:"";position:absolute;inset:auto 0 -1px 0;height:32.4px;background:#f8f3e8;border-radius:32.4px 32.4px 0 0}
.rc .band>*{position:relative;z-index:1}
.rc .chips{display:flex;flex-wrap:wrap;gap:6.48px;margin-top:6.48px}
.rc .chips .scope{margin-top:0;display:inline-flex;align-items:center;gap:5.4px}
.rc .chips .scope svg{width:17.28px;height:17.28px;flex:none}
.rc .chips .dur{background:rgba(240,216,120,.22);border-color:rgba(240,216,120,.6)}
.rc .brandrow{display:flex;align-items:center;justify-content:space-between;gap:10.8px}
.rc .brandrow .b{display:flex;align-items:center;gap:10.8px;font-size:14.58px;font-weight:600;opacity:.95}
.rc .brandrow img{width:34.56px}
.rc .brandrow .dt{font-size:13.5px;opacity:.9;text-align:end;line-height:1.35}
.rc .hello{margin-top:11.88px;display:flex;align-items:center;gap:18.36px}
.rc .av{width:70.2px;height:70.2px;border-radius:50%;background:#fff;color:#0d5c46;display:flex;align-items:center;justify-content:center;font-size:37.8px;font-weight:800;flex:none;border:4.32px solid #f0d878}
.rc .av img{width:100%;height:100%;border-radius:50%;object-fit:cover;display:block}
.rc .nm{font-size:33.48px;font-weight:800;line-height:1.2}
.rc .scope{display:inline-block;margin-top:5.4px;font-size:15.12px;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.28);padding:2.16px 12.96px;border-radius:534.6px}
.rc .body{padding:0 27px 18.36px;margin-top:-21.6px;position:relative;z-index:1;display:flex;flex-direction:column;gap:12.96px;flex:1}
.rc .hero{display:grid;grid-template-columns:145.8px 1fr;gap:18.36px;align-items:center;background:#fff;border:1px solid #e6dcc6;border-radius:18.36px;padding:16.2px 18.36px}
.rc .ring{position:relative;width:145.8px;height:145.8px}
.rc .ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.rc .ring .c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
.rc .stars{display:flex;gap:3.24px;margin-bottom:2.16px}
.rc .stars svg{width:19.44px;height:19.44px}
.rc .pct{font-size:43.2px;font-weight:800;line-height:1}
.rc .pct.p3{font-size:34px}
.rc .tier{font-size:15.12px;font-weight:700;color:#fff;padding:1.08px 12.96px;border-radius:534.6px;margin-top:4.32px}
.rc .msg{font-size:22.14px;font-weight:800;line-height:1.4}
.rc .trend{margin-top:7.56px;display:flex;align-items:flex-end;gap:10.8px}
.rc .trend .bar{display:flex;flex-direction:column;align-items:center;font-size:12.42px;color:#6b6b63;gap:3.24px}
.rc .trend .bar i{display:block;width:32.4px;border-radius:6.48px 6.48px 2.16px 2.16px;background:#d9cfb8}
.rc .trend .bar.cur i{background:var(--tc)}
.rc .trend .bar b{color:#1c2a23;font-size:14.04px}
.rc .trendtx{font-size:15.12px;font-weight:700;margin-top:5.4px;line-height:1.45}
.rc .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:10.8px}
.rc .tile{border-radius:15.12px;padding:7.56px 5.4px;border:1px solid;display:flex;align-items:center;justify-content:center;gap:9.72px}
.rc .tile b{font-size:30.24px;line-height:1.1}
.rc .tile span{font-size:15.66px;font-weight:700}
.rc .t1{background:#e8f2ec;border-color:#bcd9c8;color:#0d5c46}
.rc .t2{background:#f8efd9;border-color:#e6cf98;color:#8a6221}
.rc .t3{background:#f6e4df;border-color:#e2bcb1;color:#9e3b2d}
.rc .two{display:grid;grid-template-columns:1fr 1fr;gap:10.8px}
.rc .box{background:#fff;border:1px solid #e6dcc6;border-radius:15.12px;padding:11.88px 14.04px}
.rc .box h5{margin:0 0 4.32px;font-size:16.74px;display:flex;align-items:center;gap:6.48px}
.rc .box h5 i{width:12.96px;height:12.96px;border-radius:50%;display:inline-block}
.rc .box ul{margin:0;padding:0;list-style:none;font-size:15.12px;line-height:1.5}
.rc .box li{margin-bottom:2.7px}
.rc .box li b{color:#9e3b2d}
.rc .task{background:#fff6dc;border:2.7px dashed #c9a13b;border-radius:16.2px;padding:12.96px 16.2px;display:flex;gap:12.96px;align-items:flex-start}
.rc .task .ic{flex:none;width:43.2px;height:43.2px;border-radius:50%;background:#c9a13b;display:flex;align-items:center;justify-content:center}
.rc .task .ic svg{width:24.84px;height:24.84px}
.rc .task h5{margin:0;font-size:17.82px;color:#6b4a10}
.rc .task p{margin:1.62px 0 0;font-size:16.2px;line-height:1.5;font-weight:600}
.rc .disc{text-align:center;font-size:12.96px;line-height:1.6;color:#6f644e;padding:0 8px}
.rc .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end;font-size:12.96px;color:#6b6b63;gap:10.8px}
.rc .foot .sg{text-align:center}
.rc .foot .sg b{display:block;color:#0b3d30;font-size:15.66px}
.rc .foot .sg{display:flex;align-items:center;gap:10.8px;text-align:start}
.rc .foot .sg .stamp{flex:none;width:54px;height:54px;border-radius:50%;border:2.16px dashed #9eb8ad;display:flex;align-items:center;justify-content:center;font-size:10.8px;color:#7a978b}
.rc,.rc *{font-family:'IBM Plex Sans Arabic',sans-serif}
.rc *{box-sizing:border-box}
.rc .band>.gorn{position:absolute;z-index:0;inset:0;background:url(assets/report/report-geo-orn.png) repeat 0 0/172.8px;opacity:.3;pointer-events:none}
.rc .foot .sg .stampimg{width:64px;height:64px;object-fit:contain;flex:none}
.rc .msg{min-height:0}
`;
