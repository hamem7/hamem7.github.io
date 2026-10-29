#!/usr/bin/env node
// يبني data/pool.js: نصوص الآيات (الفاتحة + سور جزء عم) منسوخة حرفيا من مصحف المنصة، مع مواضع الأحكام الموثقة بمصدرين:
//   (1) كاشف التجربة المستقل (tools/lib/detect.mjs) و (2) جدول التوسيم القديم للمنصة (ghunna) — لا يدخل البنك إلا ما اتفق عليه المصدران.
// المد الطبيعي لا يغطيه الجدول القديم، فيوسم بمصدر واحد (v:1) ولا يستعمل إلا في أنشطة حرفية يراجعها المعلم.
// التشغيل: node tools/build-data.mjs   (يقرأ من مجلد المنصة فقط ولا يكتب خارج مجلد التجربة)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadQuran, loadAnnotations, annotationOccurrences, ayahText, inPool } from './lib/source.mjs';
import { detectAyah } from './lib/detect.mjs';
import { tokenize, isWaqfToken } from '../js/arabic.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'data', 'pool.js');
const Q = loadQuran(), A = loadAnnotations();
const pool = {}, surahs = {}; const stats = {}; const dropped = {};
for (const s of Q) {
  if (!s.ayahs.some((a) => inPool(s.number, a.numberInSurah))) continue;
  surahs[s.number] = { ar: s.name.replace(/^س\u064Fور\u064Eة\u064F\s*/, ''), en: s.englishName, n: s.ayahs.length };
  for (const a of s.ayahs) {
    if (!inPool(s.number, a.numberInSurah)) continue;
    const text = ayahText(s, a); const key = `${s.number}:${a.numberInSurah}`;
    const det = detectAyah(text);
    const tk = text.trim().split(/\s+/); const wq = {}; let wi = -1;
    for (const t of tk) { if (isWaqfToken(t)) { if (wi >= 0) wq[wi] = wq[wi] ? wq[wi] + ' ' + t : t; } else wi++; }
    const occ = [];
    for (const o of det.occ) {
      const theirs = annotationOccurrences(A, key, o.rule);
      let v = 2;
      if (theirs === null) v = 1;                       // حكم لا يغطيه الجدول القديم (المد الطبيعي)
      else if (!theirs.some(t => t[0] <= o.w2 && t[1] >= o.w1)) { dropped[o.rule] = (dropped[o.rule] || 0) + 1; continue; }
      occ.push([o.rule, o.w1, o.w2, o.trigger, o.at ?? -1, v]);
      stats[o.rule] = (stats[o.rule] || 0) + 1;
    }
    const lead = text.trim().split(/\s+/)[0];
    pool[key] = { w: det.words, wq, o: occ, p: a.page, j: a.juz, q: a.hizbQuarter, ...(a.sajda ? { sj: 1 } : {}), ...(isWaqfToken(lead) && lead.includes('\u06DE') ? { rb: 1 } : {}) };
    if (det.words.length !== tk.filter(t => !isWaqfToken(t)).length) throw new Error('word mismatch ' + key);
  }
}
const banner = `// data/pool.js — مول\u064E\u0651د آلي\u064Bا ب\u0640 tools/build-data.mjs (لا تعد\u0651له يدوي\u064Bا).
// المحتوى: نص الآيات كما هو في مصحف المنصة (database/quran-uthmani.json — «النسخة المصححة» المشتقة من نص تنزيل ومجمع الملك فهد)،
// منسوخا نسخة مستقلة، مع حذف بسملة أول السور (كما تفعل المنصة) وتقسيم الكلمات. w: الكلمات، wq: علامات الوقف بعد الكلمة،
// o: مواضع الأحكام [الحكم، كلمة1، كلمة2، الحرف المؤثر، فهرس الحرف داخل الكلمة، عدد المصادر المتفقة]، p: الصفحة، j: الجزء، q: ربع الحزب (١–٢٤٠)، sj: فيها سجدة، rb: تبدأ بعلامة الربع ۞.
`;
fs.writeFileSync(OUT, banner + 'export const SURAHS = ' + JSON.stringify(surahs) + ';\nexport const POOL = ' + JSON.stringify(pool) + ';\n');
console.log('ayahs:', Object.keys(pool).length, 'bytes:', fs.statSync(OUT).size);
console.table(stats); console.log('dropped (disagreement):', dropped);
