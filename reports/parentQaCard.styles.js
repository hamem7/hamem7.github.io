// =============================================================================
// reports/parentQaCard.styles.js
// تنسيق صورة «أسئلة ولي الأمر» (reports/parentQaCard.js): 720×900 تُلتقط ×1.5 = 1080×1350.
// ألوانها ثابتة عمدًا (صورة تُصدَّر فاتحة دائمًا، لا شاشة تتبع المظهر الداكن) — مجلد reports/
// مستثنى من فحص الداكن. المقاسات بالبكسل لأن html2canvas لا يدعم وحدات الحاوية، والمربعات
// شبه شفافة (rgba) لتظهر الخلفية من خلفها — بلا backdrop-filter لأن html2canvas لا يرسمه.
// =============================================================================
export const QA_STYLES = `
.qac{position:relative;width:720px;height:900px;overflow:hidden;background:#f9f4ea center/cover no-repeat;color:#23302a;
  font-family:'IBM Plex Sans Arabic',sans-serif;font-size:14px;line-height:1.45;
  --cbg:#fffdf8;--cbd:#ddd0b3;--cr:16px;--csh:none;--ttl:#0b3d30;--acc:#c9a13b;--acc2:#8a6221;--sub:#6f644e;--kbg:#f6f0e2;--kbd:#e6dcc6}
.qac *{box-sizing:border-box}
.qac .ltr{direction:ltr;unicode-bidi:isolate;display:inline-block}
.qac .safe{position:absolute}
.qac .pg{transform-origin:top right;display:flex;flex-direction:column;gap:9px}
.qac[dir="ltr"] .pg{transform-origin:top left}
.qac .ok{--c:#147c5e;--bg:rgba(220,240,230,.72);--bd:#9fcdb5}
.qac .pa{--c:#9a6b18;--bg:rgba(250,236,205,.72);--bd:#e6c98a}
.qac .no{--c:#a8402f;--bg:rgba(250,222,216,.72);--bd:#e7b0a6}
.qac .hm{--c:#0b3d30;--bg:rgba(226,236,229,.72);--bd:#b7c9bd}
.qac .sq{background:var(--cbg);border:1.5px solid var(--cbd);border-radius:var(--cr);box-shadow:var(--csh)}
.qac .hd{display:flex;align-items:center;gap:12px;justify-content:space-between}
.qac .hd .brand{display:flex;align-items:center;gap:12px}
.qac .hd img{width:48px}
.qac .hd .t small{display:block;font-size:12px;color:var(--sub);margin-bottom:7px;line-height:1.5}
.qac .hd .t b{display:block;font-family:'Amiri',serif;font-size:27px;color:var(--ttl);line-height:1.4}
.qac .hd .d{font-size:11.5px;color:var(--sub);line-height:1.5;text-align:end}
.qac .idr{display:grid;grid-template-columns:1fr 150px;gap:9px}
.qac .who{padding:10px 14px;display:flex;gap:14px;align-items:center}
.qac .av{flex:none;width:68px;height:68px;border-radius:50%;border:3px solid var(--ttl);box-shadow:0 0 0 4px var(--kbg);background:#fff;overflow:hidden;display:flex;align-items:center;justify-content:center;font-family:'Amiri',serif;font-size:32px;font-weight:700;color:var(--ttl)}
.qac .av img{width:100%;height:100%;object-fit:cover;display:block}
.qac .av .emo{font-family:sans-serif;font-size:36px}
.qac .who .nm{font-family:'Amiri',serif;font-size:27px;font-weight:700;color:#14231c;line-height:1.2}
.qac .who .nm small{font-family:'IBM Plex Sans Arabic',sans-serif;font-size:13px;color:var(--sub);font-weight:600}
.qac .facts{display:flex;flex-wrap:wrap;gap:6px;margin-top:5px}
.qac .facts span{background:var(--kbg);border:1px solid var(--kbd);border-radius:10px;padding:2px 10px;font-size:12.5px;color:var(--sub)}
.qac .facts b{color:#14231c}
.qac .sc{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;text-align:center}
.qac .sc .p{font-size:44px;font-weight:700;color:var(--acc2);line-height:1}
.qac .sc .tier{margin-top:5px;background:var(--acc);color:#fff;border-radius:999px;padding:0 14px;font-size:13px;font-weight:700}
.qac .qa{display:grid;grid-template-columns:1fr 1fr;gap:9px;flex:1}
.qac .c{padding:11px 14px 12px;display:flex;flex-direction:column;gap:6px;position:relative;overflow:hidden}
.qac .c:before{content:"";position:absolute;left:0;right:0;top:0;height:5px;background:var(--c)}
.qac .k{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:var(--sub)}
.qac .k em{font-style:normal;flex:none;width:28px;height:28px;border-radius:50%;background:var(--c);color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px}
.qac .k svg{flex:none}
.qac .ans{font-size:27px;font-weight:700;color:var(--c);line-height:1.2}
.qac .det{font-size:13px;color:#4b4a40}
.qac .vis{flex:1;display:flex;flex-direction:column;justify-content:center}
.qac .tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.qac .tile{background:var(--bg);border:1.5px solid var(--bd);border-radius:12px;padding:5px 4px;text-align:center;color:var(--c);line-height:1.25}
.qac .tile b{display:block;font-size:25px}
.qac .tile span{font-size:11.5px;font-weight:700}
.qac .tile.zero{opacity:.9}
.qac .sbar{display:flex;height:9px;border-radius:999px;overflow:hidden;background:rgba(220,210,185,.6);margin-top:7px}
.qac .sbar i{display:block;background:var(--c)}
.qac .rows{display:flex;flex-direction:column;gap:6px}
.qac .row{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
.qac .row .s{flex:none;min-width:62px;font-weight:700;font-size:13.5px;color:#14231c}
.qac .row .s small{font-weight:600;color:var(--sub)}
.qac .chip{background:var(--bg);border:1.5px solid var(--bd);color:var(--c);border-radius:9px;padding:0 10px;font-weight:700;font-size:14px}
.qac .more{font-size:12px;color:var(--sub);font-weight:600}
.qac .happy{font-size:14px;color:#147c5e;font-weight:700;background:rgba(220,240,230,.8);border:1.5px solid #9fcdb5;border-radius:12px;padding:10px;text-align:center}
.qac .tl{display:flex;align-items:flex-end;gap:10px;height:76px}
.qac .tl div{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;font-size:11.5px;color:var(--sub)}
.qac .tl i{display:block;width:100%;border-radius:6px 6px 0 0;background:#e2d4b3}
.qac .tl b{font-size:13px;color:#14231c}
.qac .steps{margin:0;padding:0;list-style:none;font-size:13px}
.qac .steps li{display:flex;gap:7px;margin:3px 0;align-items:flex-start;line-height:1.45}
.qac .steps li:before{content:"☐";color:#8a6221;font-weight:700;flex:none}
.qac .steps li.pen{background:rgba(255,246,224,.85);border:1px dashed #e6c98a;border-radius:9px;padding:3px 7px}
.qac .steps li.pen:before{content:"✎"}
.qac .ft{position:absolute;left:0;right:0;display:flex;justify-content:center;align-items:center}
.qac .fbox{display:flex;align-items:center;gap:12px}
.qac .tname{display:flex;align-items:baseline;gap:8px;line-height:1.3}
.qac .tname .n{font-family:'Amiri',serif;font-size:20px;font-weight:700;color:var(--ttl);border-bottom:1px solid var(--cbd);padding:0 10px 2px}
.qac .tname .l{font-size:14px;font-weight:600;color:var(--sub)}
.qac .tstamp{text-align:center}
.qac .tstamp img{height:74px;display:inline-block}

/* ---------- تصميم 1: أرابيسك ذهبي ---------- */
.qac.t1{background-image:url(assets/report/parent-bg/bg-geo-arch.webp);--cbg:rgba(255,251,238,.80);--cbd:#d2ae55;--cr:16px;--csh:0 3px 10px rgba(120,90,20,.10);--ttl:#125a57;--acc:#1d7a74;--acc2:#125a57;--sub:#6e6450;--kbg:rgba(246,236,208,.7);--kbd:#e0cc95}
.qac.t1 .sq{border:4px double #d2ae55}
.qac.t1 .c:before{height:4px;background:linear-gradient(90deg,#c9a13b,#f3dc95,#c9a13b)}
.qac.t1 .k{color:#125a57}
.qac.t1 .hd .d{background:rgba(255,251,238,.85);border:1px solid #e0cc95;border-radius:10px;padding:3px 10px}
.qac.t1 .hm{--c:#125a57;--bg:rgba(220,236,234,.72);--bd:#a9cbc8}
.qac.t1 .tl i{background:#e2cd93}
.qac.t1 .ft{bottom:24px}
.qac.t1 .hd .brand{background:rgba(255,251,238,.88);border:4px double #d2ae55;border-radius:16px;padding:6px 16px 6px 12px}

/* ---------- تصميم 2: سماء الصباح ---------- */
.qac.t2{background-image:url(assets/report/parent-bg/bg-sky-mosque.webp);--cbg:rgba(255,255,255,.72);--cbd:rgba(255,255,255,.95);--cr:22px;--csh:0 6px 18px rgba(31,95,80,.12);--ttl:#0e6a5a;--acc:#e9a100;--acc2:#c47f00;--sub:#4f6b62;--kbg:rgba(238,248,243,.75);--kbd:#cfe9de}
.qac.t2 .sq{border-width:2px}
.qac.t2 .c:before{display:none}
.qac.t2 .k em{width:32px;height:32px;border-radius:11px}
.qac.t2 .ok{--c:#119174;--bg:rgba(226,246,238,.75);--bd:#a6e0c9}.qac.t2 .pa{--c:#c47f00;--bg:rgba(255,243,214,.78);--bd:#f6d58a}.qac.t2 .no{--c:#d0473a;--bg:rgba(255,232,228,.78);--bd:#f6b5ab}.qac.t2 .hm{--c:#2a6fb0;--bg:rgba(230,240,251,.78);--bd:#b5d0ee}
.qac.t2 .hd .brand{background:rgba(255,255,255,.85);border:2px solid #fff;border-radius:20px;padding:6px 16px 6px 12px;box-shadow:0 4px 14px rgba(31,95,80,.12)}
.qac.t2 .hd .d{background:rgba(255,255,255,.8);border:2px solid #fff;border-radius:16px;padding:4px 12px}
.qac.t2 .tl i{background:#a9ddd0}
.qac.t2 .ft{bottom:16px}
.qac.t2 .tname .n,.qac.t2 .tname .l{color:#111}

/* ---------- تصميم 3: ورق المندالا (مؤشرات أقوى حتى لا تذوب في الورق، والعنوان في مربع) ---------- */
.qac.t3{background-image:url(assets/report/parent-bg/bg-mandala-paper.webp);--cbg:rgba(251,250,247,.74);--cbd:#9d9b95;--cr:8px;--csh:0 1px 0 rgba(0,0,0,.04);--ttl:#2f2f2d;--acc:#3a3a38;--acc2:#2f2f2d;--sub:#5e5e5a;--kbg:rgba(238,237,233,.8);--kbd:#c9c7c1}
.qac.t3 .sq{border-width:1px}
.qac.t3 .c:before{display:none}
.qac.t3 .k{color:#2f2f2d;border-bottom:1px dashed #c9c7c1;padding-bottom:5px}
.qac.t3 .k em{border-radius:6px}
.qac.t3 .ok{--c:#2e7556;--bg:#dcebe2;--bd:#7fae95}.qac.t3 .pa{--c:#8a6418;--bg:#f2e4c4;--bd:#c9a55a}.qac.t3 .no{--c:#a03a2b;--bg:#f2d9d3;--bd:#cf8f82}.qac.t3 .hm{--c:#2f2f2d;--bg:rgba(232,231,226,.9);--bd:#bdbbb4}
.qac.t3 .tile,.qac.t3 .chip{border-width:2px}
.qac.t3 .sbar{background:#d8d6d0}
.qac.t3 .c.hm .k svg rect{fill:#3a3a38}
.qac.t3 .av{border-color:#3a3a38}
.qac.t3 .tl i{background:#bcb9b1}
.qac.t3 .tl div.now i{background:#3a3a38}
.qac.t3 .steps li.pen{background:#f2e4c4;border-color:#c9a55a}
.qac.t3 .hd .brand{background:rgba(251,250,247,.92);border:1px solid #9d9b95;border-radius:8px;padding:4px 14px 4px 10px}
.qac.t3 .hd .d{background:rgba(251,250,247,.92);border:1px solid #c9c7c1;border-radius:8px;padding:4px 10px;color:#4a4a48}
.qac.t3 .ft{bottom:16px}

/* ---------- تصميم 4: إطار زمردي ---------- */
.qac.t4{background:#0b3d30;--cbg:rgba(255,253,247,.78);--cbd:#e0cfa3;--cr:12px;--ttl:#0b3d30;--acc:#c9a13b;--sub:#6f644e;--kbg:rgba(246,239,222,.75)}
.qac.t4:before{content:"";position:absolute;left:0;right:0;top:0;bottom:0;background:radial-gradient(circle at 20% 20%,rgba(201,161,59,.14) 0 2px,transparent 3px) 0 0/22px 22px}
.qac.t4 .frame{position:absolute;left:14px;right:14px;top:14px;bottom:14px;border-radius:18px;border:2px solid #c9a13b;background:radial-gradient(circle,rgba(201,161,59,.16) 1.4px,transparent 2px) 0 0/18px 18px,#f8f1e1}
.qac.t4 .frame:after{content:"";position:absolute;left:4px;right:4px;top:4px;bottom:4px;border:1px solid #c9a13b;border-radius:14px}
.qac.t4 .frame img{position:absolute;width:44px;opacity:.8}
.qac.t4 .frame .o1{top:10px;right:10px}.qac.t4 .frame .o2{top:10px;left:10px;transform:scaleX(-1)}
.qac.t4 .frame .o3{bottom:10px;right:10px;transform:scaleY(-1)}.qac.t4 .frame .o4{bottom:10px;left:10px;transform:scale(-1)}
.qac.t4 .c{padding:0 0 11px;gap:6px}
.qac.t4 .c:before{display:none}
.qac.t4 .c>*:not(.k){margin:0 14px}
.qac.t4 .k{background:var(--c);color:#fff;padding:7px 14px;margin:0}
.qac.t4 .k em{background:#fff;color:var(--c)}
.qac.t4 .k svg rect{fill:#fff}.qac.t4 .k svg path{fill:#0b3d30}
.qac.t4 .hd .brand{background:#0b3d30;border:4px double #c9a13b;border-radius:14px;padding:6px 16px 6px 12px}
.qac.t4 .hd .d{background:rgba(255,253,247,.9);border:1px solid #e0cfa3;border-radius:10px;padding:4px 12px}
.qac.t4 .hd img{width:52px}
.qac.t4 .hd .t b{color:#f2d684}.qac.t4 .hd .t small{color:#cfe0d6}.qac.t4 .hd .d{color:#4b4a40}
.qac.t4 .ft{bottom:26px}

.qac .tl div.now i{background:var(--acc)}
`;
