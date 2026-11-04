// tests/goalsEngine.test.mjs — تشغيل: node tests/goalsEngine.test.mjs
import { readFileSync } from 'node:fs';
import { evaluateGoals, pathIndexOf, buildPathOfMushaf, juzCoverage, topGoal } from '../engine/goalsEngine.js';
import { juzBounds, ayahIndex } from '../engine/reviewParts.js';
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('✅', m); } else { fail++; console.log('❌', m); } };
const raw = JSON.parse(readFileSync(new URL('../database/quran-uthmani.json', import.meta.url))).data.surahs;
const surahs = raw.map(s => ({ number: s.number, name: s.name, ayahsCount: s.ayahs.length }));
const flat = raw.flatMap(s => s.ayahs.map(a => ({ juz: a.juz, page: a.page })));
ok(flat.length === 6236, 'بيانات المصحف: 6236 آية');
// حدود الأجزاء في الكود تطابق رقم الجزء الفعلي لكل آية في بيانات المصحف
let mism = 0;
for (let j = 1; j <= 30; j++) { const b = juzBounds(surahs, j); const lo = ayahIndex(surahs, b.start.surah, b.start.ayah) - 1, hi = ayahIndex(surahs, b.end.surah, b.end.ayah); for (let i = lo; i < hi; i++) if (flat[i].juz !== j) mism++; }
ok(mism === 0, 'حدود الأجزاء الثلاثين تطابق بيانات المصحف آية بآية');
const total = 6236, pathOf = buildPathOfMushaf(surahs);
ok(pathOf[total - 1 - 5] === 1 && pathOf[total - 6] === 1, 'مسار الحفظ يبدأ بأول آية من الناس');
ok(pathIndexOf(surahs, 114, 1) === 1 && pathIndexOf(surahs, 1, 7) === total, 'فهرس المسار: الناس:1 = 1 والفاتحة:7 = 6236');
// طالب لم يبدأ
let g = evaluateGoals({ surahsData: surahs, startIdx: 1, posIdx: 0 });
ok(g.earned.length === 0 && g.fullJuz === 0, 'لا حفظ: لا أهداف');
// أتمّ جزء عمّ كاملًا: داخل السورة يسير المسار تصاعديًا، فآخر آية على المسار في الجزء 30 هي النبأ:40
const endAmma = pathIndexOf(surahs, 78, 40);
g = evaluateGoals({ surahsData: surahs, startIdx: 1, posIdx: endAmma });
ok(g.earned.some(e => e.id === 'juz_30') && g.fullJuz === 1, 'وسام جزء عمّ عند النبأ:40');
ok(g.earned.every(e => e.kind === 'juz'), 'لا أوسمة كبرى: أوسمة الأجزاء فقط');
g = evaluateGoals({ surahsData: surahs, startIdx: 1, posIdx: endAmma - 1 });
ok(g.fullJuz === 0 && g.next.juz.juz === 30 && g.next.juz.pct > 0.99, 'قبل آخر آية بواحدة: الجزء 30 غير مكتمل وهو التالي (≈100%)');
// الجزء 29 (تبارك): من الملك إلى المرسلات؛ ينتهي المسار فيه عند آخر آية من الملك (30)
const endTabarak = pathIndexOf(surahs, 67, 30);
g = evaluateGoals({ surahsData: surahs, startIdx: 1, posIdx: endTabarak });
ok(g.earned.some(e => e.id === 'juz_29') && g.fullJuz === 2, 'جزء تبارك بعد جزء عمّ: جزءان');
// ٣ أجزاء: الجزء 28 من المجادلة (58) إلى التحريم؛ ينتهي المسار فيه عند آخر آية من المجادلة (22)
g = evaluateGoals({ surahsData: surahs, startIdx: 1, posIdx: pathIndexOf(surahs, 58, 22) });
ok(g.earned.length === 3 && g.fullJuz === 3 && g.earned.every(e => e.kind === 'juz'), 'ثلاثة أجزاء = ثلاثة أوسمة جزء فقط');
// الختم الكامل
g = evaluateGoals({ surahsData: surahs, startIdx: 1, posIdx: total });
ok(g.fullJuz === 30 && g.earned.length === 30 && g.earned.every(e => e.kind === 'juz'), 'ختم القرآن: 30 وسام جزء فقط');
ok(g.next.juz === null, 'بعد الختم لا أهداف تالية');
// بداية نطاق مختلفة: طالب بدأ من الملك فلا يُحتسب جزء عمّ
g = evaluateGoals({ surahsData: surahs, startIdx: pathIndexOf(surahs, 67, 1), posIdx: pathIndexOf(surahs, 58, 22) });
ok(!g.earned.some(e => e.id === 'juz_30') && !g.earned.some(e => e.id === 'juz_29') && g.fullJuz === 1, 'نطاق يبدأ من الملك: لا عمّ ولا تبارك (لم يحفظ ما قبله)، ويكتمل الجزء 28 فقط');
console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل`);
process.exit(fail ? 1 : 0);
