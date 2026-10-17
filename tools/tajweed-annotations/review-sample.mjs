// tools/tajweed-annotations/review-sample.mjs
// يولّد docs/review/tajweed-sample.html: ورقة مراجعة بشرية لعيّنة من جدول التوسيم (آيتان لكل حكم + آيات اختلف فيها
// المصدران). العيّنة ثابتة (بذرة ثابتة) ليمكن إعادة توليدها. الاستعمال: node tools/tajweed-annotations/review-sample.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanAyahText, cleanName, isWaqfMark } from '../../engine/quranEngine.js';
import { CATALOG_TO_ANNOTATION } from '../../engine/tajweedAnnotations.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'database/data/tajweedAnnotations.json'), 'utf8'));
const quran = JSON.parse(fs.readFileSync(path.join(ROOT, 'database/quran-uthmani.json'), 'utf8')).data.surahs;
const i18n = fs.readFileSync(path.join(ROOT, 'core/i18n.js'), 'utf8');

const rng = (() => { let a = 20261017; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; })();
const shuffle = (arr) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const AR = {
    'qalqalah-sughra': 'القلقلة الصغرى', 'qalqalah-kubra': 'القلقلة الكبرى (عند الوقف)', 'ghunnah-mushaddadah': 'غنة النون/الميم المشددة',
    'izhar-halqi': 'الإظهار الحلقي', 'idgham-bighunnah': 'الإدغام بغنة', 'idgham-bila-ghunnah': 'الإدغام بغير غنة', 'iqlab': 'الإقلاب', 'ikhfa-haqiqi': 'الإخفاء الحقيقي',
    'izhar-shafawi': 'الإظهار الشفوي', 'ikhfa-shafawi': 'الإخفاء الشفوي', 'idgham-shafawi': 'الإدغام الشفوي (مثلين صغير)',
    'lam-qamariyyah': 'اللام القمرية (إظهار)', 'lam-shamsiyyah': 'اللام الشمسية (إدغام)',
    'idgham-mithlayn': 'المثلان', 'idgham-mutajanisayn': 'المتجانسان', 'idgham-mutaqaribayn': 'المتقاربان',
    'madd-muttasil': 'المد الواجب المتصل', 'madd-munfasil': 'المد الجائز المنفصل', 'madd-badal': 'مد البدل', 'madd-arid-lissukun': 'المد العارض للسكون (عند الوقف)', 'madd-lin': 'مد اللين (عند الوقف)',
    'madd-lazim-kalimi-muthaqqal': 'اللازم الكلمي المثقل', 'madd-lazim-kalimi-mukhaffaf': 'اللازم الكلمي المخفف', 'madd-lazim-harfi-muthaqqal': 'اللازم الحرفي المثقل', 'madd-lazim-harfi-mukhaffaf': 'اللازم الحرفي المخفف'
};
const catalogIdOf = (rule) => Object.entries(CATALOG_TO_ANNOTATION).filter(([, v]) => v.length === 1 && v[0] === rule).map(([k]) => k)[0]
    || (rule.startsWith('qalqalah') ? 'qalqalah' : null);
const defOf = (rule) => { const id = catalogIdOf(rule); if (!id) return ''; const m = i18n.match(new RegExp('tjw_rule_' + id + '_def:\\s*"([^"]*)"')); return m ? m[1] : ''; };

const wordsOf = (s, a) => cleanAyahText(quran[s - 1].ayahs[a - 1].text.replace(/^﻿/, '')).split(/\s+/).filter(w => w && !isWaqfMark(w));
const esc = (t) => t.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// فهرس: قاعدة ← قائمة (آية، مواضع)
const byRule = new Map(data.rules.map(r => [r, []]));
for (const [key, flat] of Object.entries(data.ayahs)) {
    const per = new Map();
    for (let i = 0; i < flat.length; i += 3) { const r = data.rules[flat[i]]; if (!per.has(r)) per.set(r, []); per.get(r).push([flat[i + 1], flat[i + 2]]); }
    const [s, a] = key.split(':').map(Number);
    for (const [r, occ] of per) byRule.get(r).push({ s, a, occ });
}

const cards = [];
for (const rule of data.rules) {
    const all = byRule.get(rule).filter(x => { const n = wordsOf(x.s, x.a).length; return n >= 4 && n <= 20; });
    const amma = shuffle(all.filter(x => x.s >= 78)), other = shuffle(all.filter(x => x.s < 78));
    const pick = [];
    if (amma[0]) pick.push(amma[0]);
    if (other[0]) pick.push(other[0]);
    for (const x of shuffle(all)) { if (pick.length >= 2) break; if (!pick.includes(x)) pick.push(x); }
    pick.forEach(x => cards.push({ ...x, rule, kind: 'sample' }));
}
// آيات اختلف فيها المصدران (tarekeldeeb مقابل ghunna): نقرأ ما حُسب سابقاً إن وُجد
const disputeFile = path.join(ROOT, 'docs/review/disputes.json');
if (fs.existsSync(disputeFile)) {
    for (const d of JSON.parse(fs.readFileSync(disputeFile, 'utf8'))) {
        const e = byRule.get(d.rule).find(x => x.s === d.s && x.a === d.a);
        cards.push({ s: d.s, a: d.a, rule: d.rule, occ: e ? e.occ : [], kind: 'dispute', note: d.note });
    }
}

const html = cards.map((c, i) => {
    const words = wordsOf(c.s, c.a); const covered = new Set(); c.occ.forEach(([w1, w2]) => { for (let w = w1; w <= w2; w++) covered.add(w); });
    const text = words.map((w, k) => covered.has(k) ? `<mark>${esc(w)}</mark>` : esc(w)).join(' ');
    const def = defOf(c.rule);
    return `<article class="card" data-id="${i + 1}" data-ref="${c.s}:${c.a}" data-rule="${AR[c.rule]}">
  <header><span class="num">${i + 1}</span><span class="rule">${AR[c.rule]}</span>${c.kind === 'dispute' ? '<span class="tag">اختلف فيه المصدران</span>' : ''}</header>
  <p class="ayah">${text}</p>
  <p class="ref">${esc(cleanName(quran[c.s - 1].name))} — آية ${c.a} <small>(${c.s}:${c.a})</small></p>
  ${def ? `<details><summary>تعريف الحكم</summary><p>${esc(def)}</p></details>` : ''}
  ${c.note ? `<p class="note-src">⚠️ ${esc(c.note)}</p>` : ''}
  <div class="choices" role="group" aria-label="رأيك في الموضع المظلَّل">
    <label><input type="radio" name="r${i + 1}" value="ok"> ✅ صحيح</label>
    <label><input type="radio" name="r${i + 1}" value="wrong"> ❌ المظلَّل خطأ</label>
    <label><input type="radio" name="r${i + 1}" value="missed"> ➕ فات موضع آخر</label>
    <label><input type="radio" name="r${i + 1}" value="unsure"> ❓ لست متأكداً</label>
  </div>
  <input class="note" type="text" placeholder="ملاحظة (اختياري)">
</article>`;
}).join('\n');

const page = `<!doctype html>
<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>مراجعة عيّنة جدول التجويد</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Amiri+Quran&family=IBM+Plex+Sans+Arabic:wght@400;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#f6f1e6;--card:#fffdf8;--ink:#2b2118;--muted:#6f6150;--line:#e2d8c3;--mark:#f3d27a;--ok:#1f7a45;--bad:#b3261e;--accent:#1e3a5f}
@media (prefers-color-scheme:dark){:root{--bg:#0f1b2b;--card:#16263b;--ink:#f2ead8;--muted:#a9b4c4;--line:#2a3d57;--mark:#7a5d12;--accent:#9cc3f0}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:'IBM Plex Sans Arabic',system-ui,sans-serif;line-height:1.7}
.wrap{max-width:860px;margin:0 auto;padding:16px 16px 90px}h1{font-size:1.5rem;margin:.4rem 0}
.intro{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px;color:var(--muted)}
.intro b{color:var(--ink)}.legend mark{padding:0 6px;border-radius:6px}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 16px;margin:14px 0}
.card header{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.num{background:var(--accent);color:var(--bg);border-radius:999px;min-width:30px;height:30px;display:grid;place-items:center;font-weight:700}
.rule{font-weight:700;color:var(--accent)}.tag{font-size:.8rem;background:#b3261e22;color:var(--bad);border:1px solid var(--bad);border-radius:999px;padding:1px 10px}
.ayah{font-family:'Amiri Quran',serif;font-size:1.7rem;line-height:2.3;margin:.6rem 0 .2rem;text-align:center}mark{background:var(--mark);color:inherit;border-radius:8px;padding:0 5px}
.ref{text-align:center;color:var(--muted);margin:0}details{margin:.4rem 0;color:var(--muted)}summary{cursor:pointer}.note-src{color:var(--bad);font-size:.9rem;margin:.3rem 0}
.choices{display:flex;flex-wrap:wrap;gap:8px;margin:.6rem 0}.choices label{border:1.5px solid var(--line);border-radius:12px;padding:6px 12px;cursor:pointer;user-select:none}
.choices input{margin-inline-end:6px}.choices label:has(input:checked){border-color:var(--accent);background:color-mix(in srgb,var(--accent) 14%,transparent);font-weight:700}
.note{width:100%;padding:8px 10px;border:1.5px solid var(--line);border-radius:10px;background:transparent;color:inherit;font:inherit}
.bar{position:fixed;inset-inline:0;bottom:0;background:var(--card);border-top:1px solid var(--line);padding:10px 14px;display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
button{font:inherit;font-weight:700;background:var(--accent);color:var(--bg);border:0;border-radius:12px;padding:9px 18px;cursor:pointer}
#out{display:none;width:100%;max-width:860px;margin:8px auto;min-height:160px;padding:10px;border-radius:12px;border:1.5px solid var(--line);background:var(--card);color:var(--ink);font:inherit;direction:rtl}
</style></head><body><div class="wrap">
<h1>مراجعة عيّنة جدول توسيم التجويد</h1>
<div class="intro"><p><b>ما المطلوب؟</b> كل بطاقة آية أخذناها من الجدول، والكلمة <mark>المظلَّلة</mark> هي التي يقول الجدول إن فيها الحكم المكتوب أعلى البطاقة. أجب بنظرك أنت:</p>
<ul><li><b>✅ صحيح</b>: المظلَّل فيه الحكم فعلاً ولم يفتك موضع آخر.</li><li><b>❌ المظلَّل خطأ</b>: الكلمة المظلَّلة ليس فيها هذا الحكم.</li><li><b>➕ فات موضع آخر</b>: في الآية موضع للحكم غير مظلَّل.</li><li><b>❓</b>: لست متأكداً.</li></ul>
<p>اختياراتك تُحفظ تلقائياً في متصفحك. عند الانتهاء (أو في أي وقت) اضغط <b>«تلخيص الملاحظات»</b> وانسخ الناتج وأرسله لي — يكفي أن ترسل غير الصحيح.</p>
<p>البطاقات ${cards.length}: آيتان لكل حكم (واحدة من جزء عمّ إن وُجدت) + آيات اختلف فيها مصدران مختلفان.</p></div>
${html}
<textarea id="out" readonly></textarea>
</div>
<div class="bar"><span id="count">0 / ${cards.length}</span><button id="sum">تلخيص الملاحظات</button><button id="clr" style="background:transparent;color:var(--accent);border:1.5px solid var(--accent)">مسح اختياراتي</button></div>
<script>
const KEY='tajweedReview_v1', cards=[...document.querySelectorAll('.card')];
let st={}; try{st=JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(st))}catch(e){}};
const upd=()=>{document.getElementById('count').textContent=Object.values(st).filter(x=>x.v).length+' / '+cards.length};
cards.forEach(c=>{const id=c.dataset.id,s=st[id]||{};
 if(s.v){const r=c.querySelector('input[value="'+s.v+'"]');if(r)r.checked=true} if(s.n)c.querySelector('.note').value=s.n;
 c.querySelectorAll('input[type=radio]').forEach(r=>r.addEventListener('change',()=>{st[id]={...st[id],v:r.value};save();upd()}));
 c.querySelector('.note').addEventListener('input',e=>{st[id]={...st[id],n:e.target.value};save()});});
upd();
const LBL={ok:'صحيح',wrong:'المظلَّل خطأ',missed:'فات موضع آخر',unsure:'غير متأكد'};
document.getElementById('sum').onclick=()=>{
 const done=Object.values(st).filter(x=>x.v).length, lines=[];
 cards.forEach(c=>{const s=st[c.dataset.id]||{}; if((s.v&&s.v!=='ok')||s.n) lines.push('#'+c.dataset.id+' | '+c.dataset.ref+' | '+c.dataset.rule+' | '+(LBL[s.v]||'—')+(s.n?' | '+s.n:''));});
 const ok=cards.filter(c=>(st[c.dataset.id]||{}).v==='ok').length;
 const o=document.getElementById('out'); o.style.display='block';
 o.value='راجعت '+done+' من '+cards.length+' — صحيح '+ok+'\\n'+(lines.length?lines.join('\\n'):'لا ملاحظات.'); o.select();
 try{navigator.clipboard.writeText(o.value)}catch(e){} o.scrollIntoView({behavior:'smooth'});};
document.getElementById('clr').onclick=()=>{if(confirm('مسح كل اختياراتك؟')){st={};save();location.reload()}};
</script></body></html>`;
fs.writeFileSync(path.join(ROOT, 'docs/review/tajweed-sample.html'), page);
console.log({ cards: cards.length, samples: cards.filter(c => c.kind === 'sample').length, disputes: cards.filter(c => c.kind === 'dispute').length });
