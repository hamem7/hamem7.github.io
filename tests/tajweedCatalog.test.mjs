// tests/tajweedCatalog.test.mjs — node tests/tajweedCatalog.test.mjs
// فحوص كتالوج «أبطال التجويد»: تفرّد المعرّفات، اكتمال الترجمة، وأن مثال كل حكم موجود في مصحف تنزيل
// المحلي ويولّد سؤال «اكتشف/طبّق» سليماً (كلمة صحيحة واحدة، ومشتِّتات ليست من العبارة الموسومة).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TAJWEED_STAGES, getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import { generateDiscoverQuestion, generateApplyQuestion, generateChooseRuleQuestion, TAJWEED_BADGE_CATALOG, badgeKeyForStageMaster } from '../engine/tajweedEngine.js';
import { TAJWEED_RULE_DETAILS } from '../engine/tajweedRuleDetails.js';
import { cleanAyahText } from '../engine/quranEngine.js';
import { findPhraseRanges, buildStrippedCharMap } from '../core/quranTextUtils.js';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };

const quran = JSON.parse(fs.readFileSync(new URL('../database/quran-uthmani.json', import.meta.url), 'utf8')).data.surahs;
const i18nSrc = fs.readFileSync(new URL('../core/i18n.js', import.meta.url), 'utf8');
const flat = getAllRulesFlat();

const ayahInfo = (surah, ayah) => {
    const a = quran[surah - 1] && quran[surah - 1].ayahs[ayah - 1];
    return a ? { text: cleanAyahText(a.text), number: a.number, surahName: quran[surah - 1].name } : null;
};

test('أحكام المتن كلها حاضرة: 8 مراحل و27 حكماً', () => {
    assert.equal(TAJWEED_STAGES.length, 8);
    assert.equal(flat.length, 27);
});

test('معرّفات الأحكام والمراحل فريدة', () => {
    const rules = flat.map(x => x.rule.id), stages = TAJWEED_STAGES.map(s => s.id);
    assert.equal(new Set(rules).size, rules.length);
    assert.equal(new Set(stages).size, stages.length);
});

test('لكل مرحلة وحكم مفاتيح الترجمة العربية والإنجليزية (مرتان على الأقل في i18n.js)', () => {
    const keys = [];
    TAJWEED_STAGES.forEach(s => { keys.push(s.nameKey); s.rules.forEach(r => keys.push(r.nameKey, r.defKey, r.noticeKey)); });
    const missing = keys.filter(k => (i18nSrc.split(k + ':').length - 1) < 2);
    assert.deepEqual(missing, []);
});

test('لكل مرحلة وسام «بطل» معرَّف بالاسم والمفتاح', () => {
    TAJWEED_STAGES.forEach(s => {
        const def = TAJWEED_BADGE_CATALOG[badgeKeyForStageMaster(s.id)];
        assert.ok(def, 'لا وسام للمرحلة ' + s.id);
        assert.ok((i18nSrc.split(def.nameKey + ':').length - 1) >= 2, 'ترجمة وسام ' + s.id);
    });
});

test('نص «اختر الحكم» لا يتطابق بين حكمين (لا سؤال بإجابتين صحيحتين)', () => {
    const seen = new Map();
    flat.forEach(({ rule }) => {
        const k = generateChooseRuleQuestion(rule).letters.trim();
        assert.ok(!seen.has(k), `${rule.id} و${seen.get(k)} لهما نفس النص «${k}»`);
        seen.set(k, rule.id);
    });
});

test('كل مثال: الآية موجودة، والعبارة تُطابَق، ويولَّد سؤال بكلمة صحيحة ومشتِّتات سليمة', () => {
    const problems = [];
    flat.forEach(({ rule }) => {
        [['example', rule.example, generateDiscoverQuestion], ['practiceExample', rule.practiceExample, generateApplyQuestion],
            ...(rule.extraExamples || []).map((e, i) => ['extra' + i, e, generateApplyQuestion])].forEach(([field, ex, gen]) => {
            const info = ayahInfo(ex.surah, ex.ayah);
            if (!info) { problems.push(`${rule.id}.${field}: الآية غير موجودة`); return; }
            if (findPhraseRanges(info.text, ex.highlight).length === 0) { problems.push(`${rule.id}.${field}: العبارة لا تُطابَق`); return; }
            if (ex.skipQuestion) return;
            for (let n = 0; n < 20; n++) {   // عشوائية المشتِّتات: نكرّر
                const q = gen(field.startsWith('extra') ? { ...rule, practiceExample: ex } : rule, info);   // المثال الإضافي يُمرَّر كمثال تطبيق
                if (!q) { problems.push(`${rule.id}.${field}: لم يُولَّد سؤال`); return; }
                const joined = q.ayahText;
                const ranges = findPhraseRanges(joined, ex.highlight).slice(0, ex.firstOnly ? 1 : undefined);
                // كل كلمة تتقاطع مع العبارة الموسومة تُحسب «من العبارة» (بالفهرس لا بالنص)
                let pos = 0; const covered = new Set();
                joined.split(' ').forEach((w, i) => { if (ranges.some(([a, b]) => pos < b && pos + w.length > a)) covered.add(i); pos += w.length + 1; });
                const correct = q.options.find(o => o.index === q.correctIndex);
                if (!correct) { problems.push(`${rule.id}.${field}: الخيار الصحيح غير موجود`); return; }
                const wrongInPhrase = q.options.filter(o => o.index !== q.correctIndex && covered.has(o.index));
                if (wrongInPhrase.length) { problems.push(`${rule.id}.${field}: مشتِّت من العبارة الموسومة (${wrongInPhrase[0].word})`); return; }
                if (q.options.length < 2) { problems.push(`${rule.id}.${field}: أقل من خيارين`); return; }
            }
        });
    });
    assert.deepEqual(problems, []);
});

test('أمثلة لام «ال»: الحرف بعد «ال» ضمن حروف الحكم (قمري/شمسي) فعلاً', () => {
    const problems = [];
    ['izhar_qamari', 'idgham_shamsi'].forEach(id => {
        const rule = flat.find(x => x.rule.id === id).rule;
        const set = new Set(buildStrippedCharMap(rule.letters).stripped.split(''));
        ['example', 'practiceExample'].forEach(f => {
            const sk = buildStrippedCharMap(rule[f].highlight).stripped;
            const m = sk.match(/^[وفبكل]?ال(.)/);
            if (!m || !set.has(m[1])) problems.push(`${id}.${f}: «${rule[f].highlight}» ← ${m ? m[1] : 'لا ال'}`);
        });
    });
    assert.deepEqual(problems, []);
});

console.log(`\n${pass} نجح، ${fail} فشل`);
if (fail) process.exit(1);

test('تفاصيل الأحكام الإضافية: كل حكم مذكور موجود وكل مفتاح له ترجمة عربية وإنجليزية', () => {
    const ids = new Set(getAllRulesFlat().map(f => f.rule.id));
    for (const [rid, keys] of Object.entries(TAJWEED_RULE_DETAILS)) {
        assert.ok(ids.has(rid), 'حكم غير موجود ' + rid);
        keys.forEach(k => assert.ok((i18nSrc.split(k + ':').length - 1) >= 2, 'ترجمة ناقصة ' + k));
    }
});
