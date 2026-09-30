// tests/memorizationEngine.test.js
// ==========================================
// 🌟 [جديد] اختبارات آلية خفيفة لمحرك حساب "الحفظ الشهري" (engine/memorizationEngine.js)
// ==========================================
// نفس روح tests/homeworkEngine.test.js بالضبط: ملف Node.js عادي بلا أي مكتبة خارجية
// أو DOM أو IndexedDB، يُشغَّل يدويًا بـ: node tests/memorizationEngine.test.js
//
// بيانات السور هنا "بيانات وهمية" (Mock) لكن بأعداد آيات حقيقية للسور المستخدمة في
// أمثلة طلب الميزة نفسه (النبأ 40 آية، المرسلات 50 آية، النازعات 46 آية...)، حتى
// تُطابق نتائج الحساب هنا نفس الأمثلة المذكورة صراحة في طلب "التقرير الشهري"
// (الانتقال من النبأ:20 إلى المرسلات:15 = 35 آية جديدة).
//
// ⚠️ [افتراض صريح خاص بهذه الاختبارات]: قائمة السور الوهمية أدناه لا تحتوي على كل
// الـ114 سورة، بل فقط السور اللازمة لكل سيناريو + سور "حاجزة" أعلى من نطاق الاختبار
// (114، 113) لتقليد وجود سور بعد نطاق الاختبار دون التأثير على صحة الفرق المحسوب
// (لأنها تُطرح من الطرفين على حدٍ سواء في معادلة "فهرس الحفظ" فتُلغى تلقائيًا).

import assert from 'node:assert/strict';
import {
  calcMemorizationProgress,
  isValidPosition,
  getSurahAyahCount,
  getSurahInfo,
  defaultStartingPosition,
  getSurahsInMemorizationOrder
} from '../engine/memorizationEngine.js';

let passCount = 0;
let failCount = 0;
const failures = [];

async function test(name, fn) {
  try {
    await fn();
    passCount++;
    console.log(`✅ ${name}`);
  } catch (err) {
    failCount++;
    failures.push({ name, err });
    console.log(`❌ ${name}`);
    console.log(`   ${err.message}`);
  }
}

// أعداد آيات حقيقية (المصدر: عدّ آيات المصحف العثماني القياسي) للسور المستخدمة في
// السيناريوهات — تطابق ما يُبنى فعليًا من AppState.surahsData في المنصة الحقيقية.
const surahsData = [
  { number: 114, name: 'الناس', ayahsCount: 6 },
  { number: 113, name: 'الفلق', ayahsCount: 5 },
  { number: 79, name: 'النازعات', ayahsCount: 46 },
  { number: 78, name: 'النبأ', ayahsCount: 40 },
  { number: 77, name: 'المرسلات', ayahsCount: 50 },
  { number: 76, name: 'الإنسان', ayahsCount: 31 },
  { number: 2, name: 'البقرة', ayahsCount: 286 },
  { number: 1, name: 'الفاتحة', ayahsCount: 7 }
];

// ==========================================
// 1) نفس السور، تقدّم صغير
// ==========================================
await test('حالة 1: نفس السورة، تقدّم صغير (النبأ 5 ← 10 = 5 آيات)', () => {
  const r = calcMemorizationProgress(surahsData, { surahNumber: 78, ayahNumber: 5 }, { surahNumber: 78, ayahNumber: 10 });
  assert.equal(r.valid, true);
  assert.equal(r.newAyahs, 5);
});

// ==========================================
// 2) إكمال سورة كاملة
// ==========================================
await test('حالة 2: إكمال سورة كاملة (النبأ 1 ← 40 = 39 آية متبقية)', () => {
  const r = calcMemorizationProgress(surahsData, { surahNumber: 78, ayahNumber: 1 }, { surahNumber: 78, ayahNumber: 40 });
  assert.equal(r.valid, true);
  assert.equal(r.newAyahs, 39);
});

// ==========================================
// 3) المثال الحرفي المذكور في طلب الميزة: النبأ:20 ← المرسلات:15 = 35
// ==========================================
await test('حالة 3: الانتقال من النبأ إلى المرسلات (النبأ:20 ← المرسلات:15 = 35 آية) — والتالي للنبأ هو المرسلات وليس النازعات', () => {
  const r = calcMemorizationProgress(surahsData, { surahNumber: 78, ayahNumber: 20 }, { surahNumber: 77, ayahNumber: 15 });
  assert.equal(r.valid, true);
  assert.equal(r.newAyahs, 35);
});

// ==========================================
// 4) إكمال سورتين كاملتين (النازعات ثم النبأ) ثم جزء من المرسلات
// ==========================================
await test('حالة 4: إكمال سورتين كاملتين (النازعات:40 ← المرسلات:20 = 66 آية)', () => {
  // المتبقي من النازعات (41-46) = 6 + كل النبأ (40) + 20 من المرسلات = 66
  const r = calcMemorizationProgress(surahsData, { surahNumber: 79, ayahNumber: 40 }, { surahNumber: 77, ayahNumber: 20 });
  assert.equal(r.valid, true);
  assert.equal(r.newAyahs, 66);
});

// ==========================================
// 5) الانتقال عبر عدة سور (النازعات ← النبأ ← المرسلات ← الإنسان جزئيًا)
// ==========================================
await test('حالة 5: الانتقال عبر عدة سور (النازعات:46 ← الإنسان:15 = 105 آية)', () => {
  // النبأ (40) + المرسلات (50) + 15 من الإنسان = 105
  const r = calcMemorizationProgress(surahsData, { surahNumber: 79, ayahNumber: 46 }, { surahNumber: 76, ayahNumber: 15 });
  assert.equal(r.valid, true);
  assert.equal(r.newAyahs, 105);
});

// ==========================================
// 6) حركة رجوعية غير صحيحة (النهاية قبل البداية على مسار الحفظ)
// ==========================================
await test('حالة 6: حركة رجوعية غير صحيحة (المرسلات:20 ← النبأ:5) يجب رفضها بتحذير', () => {
  const r = calcMemorizationProgress(surahsData, { surahNumber: 77, ayahNumber: 20 }, { surahNumber: 78, ayahNumber: 5 });
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'backward');
  assert.ok(r.newAyahs < 0, 'يجب أن يكون الفرق سالبًا للإشارة لحركة رجوعية');
});

// ==========================================
// 7) نفس موضع البداية والنهاية بالضبط
// ==========================================
await test('حالة 7: نفس موضع البداية والنهاية = صفر آيات جديدة', () => {
  const r = calcMemorizationProgress(surahsData, { surahNumber: 78, ayahNumber: 20 }, { surahNumber: 78, ayahNumber: 20 });
  assert.equal(r.valid, true);
  assert.equal(r.newAyahs, 0);
});

// ==========================================
// 8) بداية ونهاية بآيات مختلفة ضمن نفس السورة
// ==========================================
await test('حالة 8: بداية ونهاية بآيات مختلفة ضمن نفس السورة (النبأ 10 ← 30 = 20 آية)', () => {
  const r = calcMemorizationProgress(surahsData, { surahNumber: 78, ayahNumber: 10 }, { surahNumber: 78, ayahNumber: 30 });
  assert.equal(r.valid, true);
  assert.equal(r.newAyahs, 20);
});

// ==========================================
// اختبارات إضافية: التحقق من صحة الموضع، والترتيب، والموضع الافتراضي
// ==========================================
await test('isValidPosition: يرفض رقم آية أكبر من عدد آيات السورة', () => {
  assert.equal(isValidPosition(surahsData, 78, 41), false); // النبأ 40 آية فقط
  assert.equal(isValidPosition(surahsData, 78, 40), true);
  assert.equal(isValidPosition(surahsData, 78, 0), false);
});

await test('calcMemorizationProgress: يرفض سورة غير موجودة في البيانات بلا استثناء برمجي', () => {
  const r = calcMemorizationProgress(surahsData, { surahNumber: 999, ayahNumber: 1 }, { surahNumber: 78, ayahNumber: 1 });
  assert.equal(r.valid, false);
  assert.equal(r.reason, 'invalid_position');
});

await test('getSurahAyahCount / getSurahInfo: يرجعان بيانات صحيحة أو null بأمان', () => {
  assert.equal(getSurahAyahCount(surahsData, 78), 40);
  assert.equal(getSurahAyahCount(surahsData, 999), null);
  assert.equal(getSurahInfo(surahsData, 999), null);
});

await test('defaultStartingPosition: الناس - آية 1 (أول نقطة على مسار الحفظ)', () => {
  const p = defaultStartingPosition();
  assert.equal(p.surahNumber, 114);
  assert.equal(p.ayahNumber, 1);
});

await test('getSurahsInMemorizationOrder: ترتيب تنازلي برقم السورة (الناس أولًا)', () => {
  const ordered = getSurahsInMemorizationOrder(surahsData);
  assert.equal(ordered[0].number, 114);
  assert.equal(ordered[ordered.length - 1].number, 1);
  for (let i = 1; i < ordered.length; i++) {
    assert.ok(ordered[i - 1].number > ordered[i].number, 'يجب أن يكون الترتيب تنازليًا بالكامل');
  }
});

// ==========================================
// الملخص النهائي
// ==========================================
console.log('');
console.log(`النتيجة: ${passCount} ناجح، ${failCount} فاشل، من إجمالي ${passCount + failCount} اختبار.`);
if (failCount > 0) {
  console.log('');
  console.log('تفاصيل الاختبارات الفاشلة:');
  for (const f of failures) {
    console.log(`- ${f.name}: ${f.err.message}`);
  }
  process.exitCode = 1;
}
