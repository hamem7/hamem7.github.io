// tests/homeworkEngine.test.js
// ==========================================
// 🌟🌟 [جديد — المرحلة 5] اختبارات آلية خفيفة لمنطق توليد أسئلة الواجبات (بدون DOM)
// ==========================================
// السياق: بعد المرحلتين 1 و2 (توحيد طبقة المزامنة) والمرحلة 3 (مصدر حقيقة واحد للدرجات)، هذه
// آخر مرحلة في خطة تحسين نظام الواجبات: لا تعالج أي خطأ محدد، بل تضيف شبكة أمان تكتشف مستقبلاً
// أي كسر في منطق توليد الأسئلة (engine/homeworkEngine.js) قبل أن يصل لواجهة المعلم أو الطالب.
//
// ⚠️ [افتراض صريح]: هذا الملف لا يحتاج أي متصفح أو IndexedDB أو Firebase — نفّذناه كملف Node.js
// عادي (بدون مكتبات خارجية جديدة، تماشياً مع تفضيل المنصة للحلول المدمجة) يُشغَّل يدوياً من سطر
// الأوامر بـ: node tests/homeworkEngine.test.js — بنفس روح فحص تطابق مفاتيح core/i18n.js
// (عربي/إنجليزي) اللي تم التحقق منه يدوياً أثناء المرحلة 2. لا يوجد حالياً أي ربط تلقائي (CI) —
// هذا الملف أداة يشغّلها المعلم/المطوّر يدوياً بعد أي تعديل مستقبلي على homeworkEngine.js للتأكد
// من عدم كسر شيء، وليس جزءاً من تشغيل المنصة نفسها.
//
// لماذا يعمل الاستيراد المباشر لـ engine/homeworkEngine.js هنا رغم أنه يستورد engine/quranEngine.js
// الذي يستورد بدوره database/quranDB.js: تأكّدنا بقراءة الكود أن كل استخدام لـ indexedDB/fetch في
// تلك الملفات موجود *داخل أجساد دوال* فقط (initQuranDB, ensureQuranLoaded) وليس في المستوى العلوي
// للملف — فلا يُنفَّذ شيء يحتاج متصفحاً وقت الاستيراد نفسه، فقط عند استدعاء تلك الدوال تحديداً وهو
// ما لا تفعله اختبارات هذا الملف إطلاقاً (نستخدم quranEngine مزيّف بالكامل، انظر أدناه).

import assert from 'node:assert/strict';
import { HomeworkEngine } from '../engine/homeworkEngine.js';
import { cleanAyahText, isWaqfMark, splitAyahWords, normalizeForCompare } from '../engine/quranEngine.js';

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

// ==========================================
// القسم 1: دوال نص الآية الخالصة (engine/quranEngine.js) — نفس الدوال التي يعتمد عليها
// homeworkEngine.js في كل توليد سؤال (getCleanWords = splitAyahWords)
// ==========================================

await test('cleanAyahText: يحوّل السكون العادي (U+0652) إلى السكون القرآني (U+06E1) ولا يحذف باقي التشكيل', () => {
    // 🌟 [ملاحظة اختبار مهمة]: بالقراءة الفعلية للكود تبيّن أن cleanAyahText لا تحذف التشكيل
    // إطلاقاً من النص المُرجَع (التشكيل يبقى مقصوداً لأن النص يُعرض كاملاً للطالب) — الدالة تقوم
    // فقط بـ (1) تحويل رمز السكون لعلامة السكون القرآنية عبر toQuranicSukun و(2) حذف بسملة
    // مكررة من بداية آية طويلة. كانت الفرضية الأولى لهذا الاختبار خاطئة (افترضت حذف التشكيل من
    // اسم الدالة فقط دون قراءة الجسم الفعلي) — تم تصحيحها هنا لتعكس السلوك الحقيقي المقصود.
    const withDiacritics = 'بِسْمِ اللَّهِ';
    const cleaned = cleanAyahText(withDiacritics);
    assert.ok(!cleaned.includes('ْ'), 'يجب تحويل كل سكون عادي (U+0652) لسكون قرآني (U+06E1)');
    assert.ok(cleaned.includes('ٰ') || cleaned.includes('َ'), 'باقي التشكيل (كالفتحة أو ألف خنجرية) يجب أن يبقى كما هو');
});

await test('cleanAyahText: يحذف البسملة من بداية آية طويلة (أكثر من 4 كلمات)', () => {
    const text = 'بسم الله الرحمن الرحيم الحمد لله رب العالمين';
    const cleaned = cleanAyahText(text);
    assert.ok(!cleaned.startsWith('بسم'), 'يجب حذف البسملة عند وجود أكثر من 4 كلمات بعدها');
});

await test('isWaqfMark: يتعرف على علامات الوقف المعروفة وحروف المعاني المفردة', () => {
    assert.equal(isWaqfMark('صلى'), true);
    assert.equal(isWaqfMark('ج'), true); // حرف عربي واحد منفرد
    assert.equal(isWaqfMark('الكتاب'), false); // كلمة حقيقية
    assert.equal(isWaqfMark(''), true);
    assert.equal(isWaqfMark(null), true);
});

await test('splitAyahWords: يستبعد رموز الوقف من قائمة الكلمات', () => {
    const words = splitAyahWords('الحمد لله ج رب العالمين');
    assert.ok(!words.includes('ج'), 'رمز الوقف "ج" يجب ألا يظهر كأنه كلمة');
    assert.equal(words.length, 4); // الحمد / لله / رب / العالمين
});

await test('normalizeForCompare: يحذف التشكيل ويوحّد أشكال الألف المختلفة (أ/إ/آ/ٱ ← ا)', () => {
    assert.equal(normalizeForCompare('الْحَمْدُ'), normalizeForCompare('الحمد'), 'التشكيل يجب ألا يؤثر على المقارنة');
    assert.equal(normalizeForCompare('أحمد'), normalizeForCompare('احمد'), 'الهمزة على الألف يجب أن تُوحَّد مع الألف العادية');
    assert.equal(normalizeForCompare('إحسان'), normalizeForCompare('احسان'), 'الهمزة تحت الألف يجب أن تُوحَّد مع الألف العادية');
});

// ==========================================
// القسم 2: HomeworkEngine.generateAutoQuestions مع quranEngine مزيّف (Dependency Injection)
// ==========================================
// نستخدم بيانات وهمية بالكامل (ليست آيات حقيقية) — الهدف اختبار منطق التوليد نفسه فقط، وليس
// صحة نص القرآن (ده مصدره alquran.cloud خارج نطاق هذا الاختبار تماماً).

const FAKE_WORDS_PER_AYAH = [
    'الكتاب العلم الحكمة النور نبا رحمة سلام هدى',
    'طريق مبين وصبر كريم عظيم قويم رشيد سديد',
    'امانة صادقة راسخة واضحة جميلة بديعة رائعة مثيرة',
    'بستان مورق مزدهر يانع مثمر وارف ظليل عطر',
    'معرفة واسعة عميقة راقية سامية نبيلة كريمة طيبة',
    'نجاح باهر مؤزر مستمر دائم راسخ ثابت وطيد',
    'امل مشرق واعد بعيد قريب حاضر غائب باق',
    'سلامة تامة كاملة شاملة واسعة عريضة طويلة عميقة'
];

function buildFakeAyahs() {
    return FAKE_WORDS_PER_AYAH.map((text, idx) => ({
        number: idx + 1,
        surahNumber: 999,
        surahName: 'سورة الاختبار',
        numberInSurah: idx + 1,
        text
    }));
}

function buildFakeQuranEngine() {
    const fakeAyahs = buildFakeAyahs();
    const fakeSurah = { number: 999, name: 'سورة الاختبار', ayahs: fakeAyahs };
    const otherSurahs = [
        { number: 1, name: 'الاولى' },
        { number: 2, name: 'الثانية' },
        { number: 3, name: 'الثالثة' },
        { number: 4, name: 'الرابعة' },
        { number: 5, name: 'الخامسة' }
    ];

    return {
        async getSurah(num) {
            return num === 999 ? fakeSurah : null;
        },
        getAyahsInRange(surah, startAyah, endAyah) {
            return surah.ayahs.slice(startAyah - 1, endAyah);
        },
        async getAllSurahsList() {
            return [...otherSurahs, { number: 999, name: 'سورة الاختبار' }];
        },
        async getAyahsBySurahRange() { return buildFakeAyahs(); },
        async getAyahsByJuz() { return buildFakeAyahs(); }
    };
}

const KNOWN_TYPES = new Set([
    'mcq', 'dropdown', 'written_blank', 'dual_dropdown', 'checkbox',
    'matrix_order', 'write_3_ayahs', 'audio_record', 'matching'
]);

await test('generateAutoQuestions: يرجع العدد المطلوب من الأسئلة (عبر 15 تكرار عشوائي)', async () => {
    for (let run = 0; run < 15; run++) {
        const engine = new HomeworkEngine(buildFakeQuranEngine());
        const questions = await engine.generateAutoQuestions({
            mode: 'surah', surahNum: 999, startAyah: 1, endAyah: 8, qCount: 8
        });
        assert.equal(questions.length, 8, `الجولة ${run}: توقعنا 8 أسئلة، حصلنا على ${questions.length}`);
    }
});

await test('generateAutoQuestions: كل سؤال له id ونوع معروف ونقاط أكبر من صفر', async () => {
    const engine = new HomeworkEngine(buildFakeQuranEngine());
    const questions = await engine.generateAutoQuestions({
        mode: 'surah', surahNum: 999, startAyah: 1, endAyah: 8, qCount: 8
    });
    for (const q of questions) {
        assert.ok(q.id, `سؤال بدون id: ${JSON.stringify(q)}`);
        assert.ok(KNOWN_TYPES.has(q.type), `نوع سؤال غير معروف: ${q.type}`);
        assert.ok(q.points > 0, `سؤال بنقاط غير موجبة: ${JSON.stringify(q)}`);
    }
});

await test('generateAutoQuestions: الإجابة الصحيحة دائماً ضمن الاختيارات المعروضة (mcq/dropdown)', async () => {
    for (let run = 0; run < 15; run++) {
        const engine = new HomeworkEngine(buildFakeQuranEngine());
        const questions = await engine.generateAutoQuestions({
            mode: 'surah', surahNum: 999, startAyah: 1, endAyah: 8, qCount: 8
        });
        for (const q of questions) {
            if (q.type === 'mcq' || q.type === 'dropdown') {
                assert.ok(
                    q.options.includes(q.correctAnswer),
                    `الإجابة الصحيحة "${q.correctAnswer}" غير موجودة ضمن الاختيارات: ${JSON.stringify(q.options)}`
                );
                const unique = new Set(q.options);
                assert.equal(unique.size, q.options.length, `اختيارات مكررة في سؤال ${q.type}: ${JSON.stringify(q.options)}`);
            }
        }
    }
});

await test('generateAutoQuestions: dual_dropdown يحتوي إجابتين صحيحتين كل واحدة ضمن قائمتها', async () => {
    let foundAtLeastOne = false;
    for (let run = 0; run < 20 && !foundAtLeastOne; run++) {
        const engine = new HomeworkEngine(buildFakeQuranEngine());
        const questions = await engine.generateAutoQuestions({
            mode: 'surah', surahNum: 999, startAyah: 1, endAyah: 8, qCount: 8
        });
        const dual = questions.find(q => q.type === 'dual_dropdown');
        if (dual) {
            foundAtLeastOne = true;
            assert.equal(dual.correctAnswer.length, 2);
            assert.ok(dual.options1.includes(dual.correctAnswer[0]));
            assert.ok(dual.options2.includes(dual.correctAnswer[1]));
        }
    }
    assert.ok(foundAtLeastOne, 'لم يظهر أي سؤال dual_dropdown خلال 20 محاولة — تحقق من دورة التوليد');
});

await test('generateAutoQuestions: matching يبني أزواج متسقة (كل left/right له مرجع فعلي) ويتطلب تصحيحاً يدوياً', async () => {
    let foundAtLeastOne = false;
    for (let run = 0; run < 20 && !foundAtLeastOne; run++) {
        const engine = new HomeworkEngine(buildFakeQuranEngine());
        const questions = await engine.generateAutoQuestions({
            mode: 'surah', surahNum: 999, startAyah: 1, endAyah: 8, qCount: 8
        });
        const matching = questions.find(q => q.type === 'matching');
        if (matching) {
            foundAtLeastOne = true;
            assert.equal(matching.needsManualGrading, true, 'matching يجب أن يبقى needsManualGrading دائماً بحسب الاتفاق مع المعلم');
            const leftIds = new Set(matching.leftItems.map(i => i.id));
            const rightIds = new Set(matching.rightItems.map(i => i.id));
            for (const pair of matching.correctAnswer) {
                assert.ok(leftIds.has(pair.left), `left id غير موجود: ${pair.left}`);
                assert.ok(rightIds.has(pair.right), `right id غير موجود: ${pair.right}`);
            }
        }
    }
    assert.ok(foundAtLeastOne, 'لم يظهر أي سؤال matching خلال 20 محاولة — تحقق من دورة التوليد');
});

await test('generateAutoQuestions: checkbox و matrix_order — الإجابات الصحيحة كمجموعة فرعية من الاختيارات', async () => {
    for (let run = 0; run < 15; run++) {
        const engine = new HomeworkEngine(buildFakeQuranEngine());
        const questions = await engine.generateAutoQuestions({
            mode: 'surah', surahNum: 999, startAyah: 1, endAyah: 8, qCount: 8
        });
        for (const q of questions) {
            if (q.type === 'checkbox') {
                for (const ans of q.correctAnswer) {
                    assert.ok(q.options.includes(ans), `checkbox: إجابة صحيحة غير موجودة بالاختيارات: ${ans}`);
                }
            }
            if (q.type === 'matrix_order') {
                assert.equal(q.options.length, q.correctAnswer.length);
                for (const ans of q.correctAnswer) {
                    assert.ok(q.options.includes(ans), `matrix_order: إجابة صحيحة غير موجودة بالاختيارات: ${ans}`);
                }
            }
        }
    }
});

await test('generateAutoQuestions: الأنواع اليدوية (written_blank / write_3_ayahs) تحمل needsManualGrading=true وإجابة نصية غير فارغة', async () => {
    for (let run = 0; run < 15; run++) {
        const engine = new HomeworkEngine(buildFakeQuranEngine());
        const questions = await engine.generateAutoQuestions({
            mode: 'surah', surahNum: 999, startAyah: 1, endAyah: 8, qCount: 8
        });
        for (const q of questions) {
            if (q.type === 'written_blank' || q.type === 'write_3_ayahs') {
                assert.equal(q.needsManualGrading, true);
                assert.ok(q.correctAnswer && q.correctAnswer.length > 0);
            }
        }
    }
});

// ==========================================
// القسم 3: دالة اختيار المشتتات (pickDistractorWords) — اختبار غير مباشر عبر createMissingWordDropdown
// لأنها غير مُصدَّرة من الملف عمداً (تبقى تفصيل تنفيذي داخلي)، فنتحقق من سلوكها عبر الواجهة العامة.
// ==========================================

await test('createMissingWordDropdown: يرجع null بأمان لآية قصيرة جداً (أقل من 4 كلمات)', async () => {
    const engine = new HomeworkEngine(buildFakeQuranEngine());
    const shortAyah = { number: 1, surahNumber: 999, surahName: 'سورة الاختبار', numberInSurah: 1, text: 'كلمة واحدة فقط' };
    const result = await engine.createMissingWordDropdown(shortAyah, buildFakeAyahs());
    assert.equal(result, null, 'آية من 3 كلمات فقط يجب ألا تنتج سؤال فراغ');
});

await test('createMissingWordDropdown: الكلمة الصحيحة دائماً ضمن الاختيارات ولا تكرار فيها (30 تكرار)', async () => {
    const engine = new HomeworkEngine(buildFakeQuranEngine());
    const pool = buildFakeAyahs();
    for (let i = 0; i < 30; i++) {
        const ayah = pool[i % pool.length];
        const q = await engine.createMissingWordDropdown(ayah, pool);
        if (!q) continue;
        assert.ok(q.options.includes(q.correctAnswer));
        assert.equal(new Set(q.options).size, q.options.length, `اختيارات مكررة: ${JSON.stringify(q.options)}`);
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
