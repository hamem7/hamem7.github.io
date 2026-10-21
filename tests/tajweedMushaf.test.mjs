// tests/tajweedMushaf.test.mjs — node tests/tajweedMushaf.test.mjs
// فحوص مرحلة «تعرّف على مصحفك» (engine/tajweedMushaf.js + core/i18nMushaf.js): حساب فانوس الهامش من بيانات المصحف نفسها، وجود كل علامة في النص،
// سلامة أسئلة الدروس الثمانية في كل نطاق حفظ (واحد صحيح، ضغط له صحيح، وصل بزوجين)، «أقرب نطاق» حين لا توجد العلامة في المحفوظ،
// تنويع الاختبار، وتطابق الترجمتين العربية والإنجليزية (كل مفتاح مستعمل موجود، بالمتغيرات نفسها).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../engine/tajweedMushaf.js';
import { TAJWEED_STAGES, getTajweedStage, isMushafRule } from '../engine/tajweedRulesCatalog.js';
import { cleanAyahText, cleanName, toQuranicSukun } from '../engine/quranEngine.js';
import { gamesForRule } from '../engine/tajweedPath.js';
import { MUSHAF_I18N } from '../core/i18nMushaf.js';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

const raw = JSON.parse(fs.readFileSync(new URL('../database/quran-uthmani.json', import.meta.url), 'utf8')).data.surahs;
const all = M.flattenQuran(raw, (t) => cleanAyahText(t), (s) => toQuranicSukun(cleanName(s.name)));
const SCOPES = { amma: (a) => a.sn >= 78, tabarak: (a) => a.sn >= 67 && a.sn <= 77, short: (a) => a.sn >= 105, fatiha: (a) => a.sn === 1, baqarah: (a) => a.sn === 2 && a.n <= 100, none: () => false, all: () => true };
const ctxOf = (scope) => M.buildMushafCtx(all, all.filter(SCOPES[scope]).map((a) => ({ surah: a.sn, ayah: a.n })));
const labelOf = (o) => [o.labelKey, JSON.stringify(o.labelVars || {}), o.label, o.glyph].join('|');

test('الدروس الثمانية في الكتالوج بترتيبها، ولكل درس مولّدات وعلامات', () => {
    const stage = getTajweedStage(M.MUSHAF_STAGE_ID);
    assert.equal(TAJWEED_STAGES[0].id, M.MUSHAF_STAGE_ID);
    assert.deepEqual(stage.rules.map((r) => M.lessonOfRule(r)), M.MUSHAF_LESSONS);
    assert.ok(stage.rules.every((r) => isMushafRule(r) && r.id === M.lessonRuleId(M.lessonOfRule(r))));
    M.MUSHAF_LESSONS.forEach((l) => assert.ok(M.recipesOf(l).length >= 4, l));
    ['waqf', 'silent_sukun', 'madd_letters', 'sin_saad', 'sajda', 'juz_hizb', 'ayah_number'].forEach((l) => assert.ok(M.signsOfLesson(l).length >= 1, l));   // دروس العلامات
});

test('ألعاب دروس المصحف: تدرّب ثم استكشف المصحف فقط (لا حروف ولا شجرة ولا ربط)', () => {
    getTajweedStage(M.MUSHAF_STAGE_ID).rules.forEach((r) => assert.deepEqual(gamesForRule(r, M.MUSHAF_STAGE_ID), ['practice', 'mushaf']));
});

test('فانوس الهامش: 240 ربعاً، كل ربع بنوعه وأرقامه، والجزء/الحزب المحسوبان يطابقان حقول المصحف لكل آية', () => {
    const kinds = {};
    for (let q = 1; q <= 240; q++) { const m = M.quarterMarker(q); kinds[m.kind] = (kinds[m.kind] || 0) + 1; assert.equal(m.full, m.kind === 'juz' || m.kind === 'hizb'); }
    assert.deepEqual(kinds, { juz: 30, hizb: 30, rub: 60, nisf: 60, thalatha: 60 });
    const bad = all.filter((a) => M.quarterMarker(a.q).juz !== a.juz);
    assert.equal(bad.length, 0, `${bad.length} آية يختلف جزؤها عن حساب الربع (أولها ${bad[0] && bad[0].sn + ':' + bad[0].n})`);
    assert.deepEqual(M.quarterMarker(209).lines, ['الجزء ٢٧', 'الحزب ٥٣']);   // كما في صورة المصحف
    assert.deepEqual(M.quarterMarker(206).lines, ['ربع', 'الحزب', '٥٢']);
    assert.deepEqual(M.quarterMarker(207).lines, ['نصف', 'الحزب', '٥٢']);
    assert.deepEqual(M.quarterMarker(208).lines, ['ثلاثة أرباع', 'الحزب', '٥٢']);
    assert.deepEqual(M.quarterMarker(205).lines, ['الحزب', '٥٢']);
});

test('حقائق الجزء والحزب والربع: ثلاثون جزءاً وستون حزباً و240 ربعاً، والجزء حزبان وثمانية أرباع', () => {
    assert.deepEqual(M.MUSHAF_FACTS, { juz: 30, hizb: 60, quarter: 240, hizbPerJuz: 2, quartersPerHizb: 4, quartersPerJuz: 8, sajda: 15 });
    assert.equal(M.MUSHAF_FACTS.hizb, M.MUSHAF_FACTS.juz * M.MUSHAF_FACTS.hizbPerJuz);
    assert.equal(M.MUSHAF_FACTS.quarter, M.MUSHAF_FACTS.hizb * M.MUSHAF_FACTS.quartersPerHizb);
    assert.equal(M.JUZ_ORDINALS_AR.length, 30);
    assert.equal(new Set(M.JUZ_ORDINALS_AR).size, 30);
});

test('كل علامة لها شكل في نص مصحف المنصة، ومراجع السكتة والسين مكان الصاد صحيحة', () => {
    M.MUSHAF_SIGNS.filter((s) => s.code).forEach((s) => {
        const some = all.some((a) => M.ayahHasSign(a, s.id));
        assert.ok(some, 'لا آية فيها العلامة ' + s.id);
        (s.refs || []).forEach(([sn, n]) => assert.ok(M.ayahHasSign(all.find((a) => a.sn === sn && a.n === n), s.id), `${s.id} ← ${sn}:${n}`));
    });
    assert.ok(all.every((a) => !a.text.includes('ْ')), 'سكون عادي في نص معروض (يجب ۡ)');
    assert.ok(all.some((a) => a.text.includes('ۡ')));
});

test('السكتة والسين فوق الصاد شكل واحد لا يلتبس: كلمة مستقلة مقابل داخل الكلمة', () => {
    const sak = all.find((a) => a.sn === 83 && a.n === 14), sin = all.find((a) => a.sn === 7 && a.n === 69);
    assert.ok(M.ayahHasSign(sak, 'saktah') && !M.ayahHasSign(sak, 'sin_over'));
    assert.ok(M.ayahHasSign(sin, 'sin_over') && !M.ayahHasSign(sin, 'saktah'));
    assert.ok(M.ayahHasSign(all.find((a) => a.sn === 52 && a.n === 37), 'sin_under'));
});

test('خمس عشرة آية سجدة في المصحف، ولكل منها علامة ۩ في نصها', () => {
    const saj = all.filter((a) => a.sajda);
    assert.equal(saj.length, 15);
    const missing = saj.filter((a) => !M.ayahHasSign(a, 'sajda_sign')).map((a) => a.sn + ':' + a.n);
    assert.deepEqual(missing, []);
});

test('أسئلة الدروس الثمانية سليمة في كل نطاق حفظ وكل وضع: اختيار بصحيح واحد، وضغط بصحيح، ووصل بزوجين فأكثر', () => {
    const bad = [], kinds = new Set();
    Object.keys(SCOPES).forEach((sc) => {
        const ctx = ctxOf(sc);
        for (let rep = 0; rep < 12; rep++) M.MUSHAF_LESSONS.forEach((l) => ['practice', 'explore', 'exam', 'review'].forEach((mode) => {
            const size = mode === 'exam' ? 8 : mode === 'review' ? 2 : 5;
            const qs = M.buildMushafQuestions(l, ctx, { mode, size });
            if (qs.length < Math.min(size, 5)) bad.push(`${sc}/${l}/${mode}: ${qs.length} أسئلة`);
            qs.forEach((q) => {
                kinds.add(q.type);
                const tag = `${sc}/${l}/${q.kind}`;
                if (!M.isMushafQuestionType(q.type) || q.ruleId !== M.lessonRuleId(l) || !q.stemKey) bad.push(tag + ': نوع/ حكم/ نص');
                if (q.type === 'mushaf_choice') {
                    const labels = q.options.map(labelOf);
                    if (q.options.filter((o) => o.ok).length !== 1) bad.push(tag + ': ليس صحيحاً واحداً');
                    if (new Set(q.options.map((o) => o.id)).size !== q.options.length || new Set(labels).size !== labels.length) bad.push(tag + ': خيارات مكررة');
                    if (q.options.length < 2 || q.options.length > 5) bad.push(tag + ': عدد الخيارات');
                } else if (q.type === 'mushaf_tap') {
                    if (!q.segments.some((s) => s.ok)) bad.push(tag + ': بلا صحيح');
                    if (q.segments.filter((s) => !s.ok).length < 2) bad.push(tag + ': مشتتات قليلة');
                } else if (q.type === 'mushaf_match') {
                    if (q.pairs.length < 2 || new Set(q.pairs.map((p) => p.id)).size !== q.pairs.length) bad.push(tag + ': وصل');
                }
                if (JSON.stringify(q).includes('ْ')) bad.push(tag + ': سكون عادي في السؤال');
            });
        }));
    });
    assert.deepEqual([...kinds].sort(), ['mushaf_choice', 'mushaf_match', 'mushaf_tap']);
    assert.deepEqual(bad.slice(0, 8), []);
});

test('الأسئلة قابلة للحفظ في نقطة التوقف: كائنات بيانات بحتة (JSON) بلا دوال', () => {
    const ctx = ctxOf('amma');
    M.MUSHAF_LESSONS.forEach((l) => M.buildMushafQuestions(l, ctx, { mode: 'exam', size: 8 }).forEach((q) => assert.deepEqual(JSON.parse(JSON.stringify(q)), q)));
});

test('أقرب نطاق: العلامة غير الموجودة في المحفوظ تُؤخذ من أقرب موضع وتُوسَم near، والموجودة تُؤخذ من المحفوظ بلا وسم', () => {
    const fatiha = ctxOf('fatiha');
    const saj = M.pickSignAyah(fatiha, M.signById('sajda_sign'));
    assert.equal(saj.near, true); assert.ok([7, 13, 16, 17, 19, 22].includes(saj.a.sn), 'سجدة بعيدة: ' + saj.a.sn);   // من أقرب ست سجدات للفاتحة (الأعراف، الرعد، النحل، الإسراء، مريم، الحج)
    const short = ctxOf('short');
    const nearest = M.pickSignAyah(short, M.signById('sajda_sign'));
    assert.equal(nearest.near, true); assert.ok([96, 84, 53, 41, 38, 32].includes(nearest.a.sn), 'سجدة بعيدة: ' + nearest.a.sn);   // من أقرب ست سجدات لقصار السور (العلق، الانشقاق، النجم، فصلت، ص، السجدة)
    const amma = ctxOf('amma');
    const mine = M.pickSignAyah(amma, M.signById('sajda_sign'));
    assert.equal(mine.near, false); assert.ok(mine.a.sn >= 78);
    // درس السجدة لطالب الفاتحة: الأسئلة من أقرب نطاق وموسومة، ولطالب جزء عمّ من حفظه
    const nearQs = M.buildMushafQuestions('sajda', fatiha, { mode: 'explore', size: 8 }).filter((q) => q.kind === 'tap' || q.kind === 'sj_has' || q.kind === 'sj_tap');
    assert.ok(nearQs.length > 0 && nearQs.every((q) => q.near || q.kind === 'sj_has'));
    const mineQs = M.buildMushafQuestions('sajda', amma, { mode: 'explore', size: 8 }).filter((q) => q.kind === 'sj_tap');
    assert.ok(mineQs.every((q) => !q.near));
});

test('بلا نطاق حفظ أصلاً: لا وسم «قريب من حفظك» (لا حفظ يُقاس عليه)', () => {
    const none = ctxOf('none');
    assert.equal(none.hasPool, false);
    M.MUSHAF_LESSONS.forEach((l) => M.buildMushafQuestions(l, none, { mode: 'practice', size: 8 }).forEach((q) => assert.equal(q.near, false, l + '/' + q.kind)));
});

test('أسئلة من الحفظ: آيات الأسئلة (ضغط/عرض) داخل محفوظ الطالب حين تتوفر فيه العلامة', () => {
    const ctx = ctxOf('baqarah');   // أول البقرة فيه علامات وقف كثيرة
    const qs = []; for (let i = 0; i < 20; i++) qs.push(...M.buildMushafQuestions('waqf', ctx, { mode: 'explore', size: 8 }).filter((q) => q.kind === 'tap_waqf'));
    assert.ok(qs.length > 0 && qs.every((q) => !q.near));
    const texts = new Set(all.filter((a) => a.sn === 2 && a.n <= 100).map((a) => a.text.split(' ').filter(Boolean).join(' ')));
    qs.forEach((q) => assert.ok(texts.has(q.segments.map((s) => s.t).join(' ')), 'آية خارج المحفوظ'));
});

test('اختبار المصحف: من 5 إلى 8 أسئلة بأنواع متعددة، والأنواع التي لم تظهر في آخر اختبار تُقدَّم', () => {
    const ctx = ctxOf('amma');
    M.MUSHAF_LESSONS.forEach((l) => {
        for (let n = 0; n < 6; n++) {
            const qs = M.buildMushafQuestions(l, ctx, { mode: 'exam', size: 8 });
            assert.ok(qs.length >= 5 && qs.length <= 8, `${l}: ${qs.length}`);
            assert.ok(new Set(qs.map((q) => q.kind)).size >= 3, `${l}: أنواع قليلة`);
            assert.equal(new Set(qs.map((q) => q.key)).size, qs.length, `${l}: مفاتيح مكررة`);
        }
    });
    const prev = ['name', 'meaning'];
    let firstSeen = 0, tries = 0;
    for (let n = 0; n < 40; n++) { const qs = M.buildMushafQuestions('waqf', ctx, { mode: 'exam', size: 3, prevKinds: prev }); tries++; if (qs.every((q) => !prev.includes(q.kind))) firstSeen++; }
    assert.ok(firstSeen / tries > 0.6, `الأنواع الجديدة لم تُقدَّم (${firstSeen}/${tries})`);
});

test('تحدي المرحلة: سؤال من كل درس مختلف حتى خمسة', () => {
    const qs = M.buildMushafStageChallenge(ctxOf('amma'), 5);
    assert.equal(qs.length, 5);
    assert.equal(new Set(qs.map((q) => q.ruleId)).size, 5);
});

// ---------- الترجمة ----------
const AR = MUSHAF_I18N.ar, EN = MUSHAF_I18N.en;
const vars = (s) => [...String(s).matchAll(/\{([a-z]+)\}/g)].map((m) => m[1]).sort().join(',');

test('الترجمتان العربية والإنجليزية متطابقتا المفاتيح والمتغيرات، بلا قيم فارغة', () => {
    assert.deepEqual(Object.keys(AR).sort(), Object.keys(EN).sort());
    const bad = Object.keys(AR).filter((k) => !AR[k] || !EN[k] || vars(AR[k]) !== vars(EN[k]));
    assert.deepEqual(bad, []);
});

test('الإنجليزية ليست نسخة من العربية: كل نص إنجليزي فيه حروف لاتينية', () => {
    const bad = Object.keys(EN).filter((k) => !/[A-Za-z]/.test(EN[k]) && !/^tjw_mu_juz_caption$/.test(k));
    assert.deepEqual(bad, []);
});

test('كل مفتاح ترجمة تستعمله المرحلة موجود (المباشر في الشيفرة والمولَّد من العلامات والدروس والأنواع)', () => {
    const src = ['../engine/tajweedMushaf.js', '../tajweed/tajweed-mushaf-ui.js', '../engine/tajweedRulesCatalog.js'].map((f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8')).join('\n');
    const used = new Set([...src.matchAll(/tjw_(?:mq|mo|ex|mul|mu|mk|rule_mushaf|stage_know)_[a-z0-9_]+/g)].map((m) => m[0]).filter((k) => !k.endsWith('_')));
    M.MUSHAF_SIGNS.forEach((s) => { used.add(M.signNameKey(s.id)); used.add(M.signDefKey(s.id)); });
    M.MARKER_KINDS.forEach((k) => used.add(M.markerKindKey(k)));
    ['an', 'sh', 'jh', 'wq', 'sk', 'md', 'sn', 'sj'].forEach((s) => { used.add(`tjw_mul_${s}_intro`); used.add(`tjw_mul_${s}_tip`); });
    TAJWEED_STAGES[0].rules.forEach((r) => [r.nameKey, r.defKey, r.noticeKey].forEach((k) => used.add(k)));
    used.add(TAJWEED_STAGES[0].nameKey);
    const missing = [...used].filter((k) => !(k in AR) || !(k in EN));
    assert.deepEqual(missing, []);
});

console.log(`\n${pass} نجح، ${fail} فشل`);
if (fail) process.exit(1);
