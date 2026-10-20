// tests/tajweedLetterGames.test.mjs — node tests/tajweedLetterGames.test.mjs
// فحوص محرك تدريبات الحروف والأزواج وشجرة الحكم (engine/tajweedLetterGames.js) وربطه باختبار الحكم.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TAJWEED_STAGES, getAllRulesFlat } from '../engine/tajweedRulesCatalog.js';
import {
    ALL_LETTERS, getRuleLetters, getRulePairs, isLetterGameRule,
    generateLetterCollectQuestion, generateOddLetterQuestion, generateClassifyLetterQuestion,
    generateClassifyPairQuestion, generatePairLinkQuestion,
    buildRuleLetterGameQuestions, buildStageTreeQuestions, buildStageTree, hasStageTreeActivity
} from '../engine/tajweedLetterGames.js';
import { buildExamQuestions, ACTIVITY_DIMENSION_MAP } from '../engine/tajweedEngine.js';
import { EXAM_SIZE } from '../engine/tajweedJourney.js';

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); pass++; console.log('✅ ' + name); } catch (e) { fail++; console.log('❌ ' + name + '\n   ' + e.message); } };
const flat = getAllRulesFlat();
const REPS = 25; // التوليد عشوائي: نكرر لتغطية حالات كثيرة
const rule = (id) => flat.find(x => x.rule.id === id).rule;

test('أي الأحكام قائمة على حروف أو أزواج: كل ما في الكتالوج عدا أحكام المواقف', () => {
    const game = flat.filter(x => isLetterGameRule(x.rule)).map(x => x.rule.id);
    ['qalqalah', 'ghunna_wajiba', 'ikhfa_shafawi', 'idgham_shafawi', 'izhar_shafawi', 'izhar', 'idgham_bighunnah', 'idgham_bila_ghunnah', 'iqlab', 'ikhfa',
        'izhar_qamari', 'idgham_shamsi', 'madd_tabii', 'mithlain', 'mutaqaribain', 'mutajanisain'].forEach(id => assert.ok(game.includes(id), id));
    ['izhar_lam_fil', 'madd_wajib_muttasil', 'madd_lazim', 'lazim_harfi_muthaqqal'].forEach(id => assert.ok(!game.includes(id), id));
});

test('حروف الأحكام: مفردة بلا تشكيل وضمن الحروف الثمانية والعشرين (عدا الهمزة)', () => {
    for (const { rule: r } of flat) {
        const L = getRuleLetters(r);
        if (!L) continue;
        L.forEach(c => assert.ok(ALL_LETTERS.includes(c) || c === 'ء', `${r.id}: ${c}`));
    }
    assert.equal(getRuleLetters(rule('izhar_shafawi')).length, 26);
    assert.deepEqual(getRuleLetters(rule('ghunna_wajiba')), ['م', 'ن']);
});

test('اجمع الحروف: الأهداف من حروف الحكم والمشتِّتات من خارجه (12 لوحة)', () => {
    for (const { rule: r } of flat) {
        const L = getRuleLetters(r);
        if (!L) continue;
        for (let i = 0; i < REPS; i++) {
            const q = generateLetterCollectQuestion(r);
            if (!q) continue;
            assert.equal(q.tiles.length, q.targets.length + (q.tiles.length - q.targets.length));
            assert.ok(q.targets.length >= 1 && q.targets.length <= 6);
            q.tiles.forEach(x => assert.equal(L.includes(x.letter), x.isTarget, `${r.id}: ${x.letter}`));
            assert.equal(q.tiles.filter(x => x.isTarget).length, q.targets.length);
            assert.equal(new Set(q.tiles.map(x => x.letter)).size, q.tiles.length);
        }
    }
    assert.equal(generateLetterCollectQuestion(rule('izhar_shafawi')), null); // المشتِّتات (ب م) أقل من 3
});

test('الحرف الدخيل: صيغتان صحيحتان والجواب الوحيد', () => {
    for (const { rule: r } of flat) {
        const L = getRuleLetters(r);
        if (!L) continue;
        for (let i = 0; i < REPS; i++) {
            const q = generateOddLetterQuestion(r);
            if (!q) continue;
            assert.equal(q.options.length, 4);
            assert.equal(new Set(q.options).size, 4);
            assert.equal(q.askNot, L.length >= 3);
            const inRule = q.options.filter(c => L.includes(c));
            if (q.askNot) { assert.equal(inRule.length, 3); assert.ok(!L.includes(q.correctLetter)); }
            else { assert.deepEqual(inRule, [q.correctLetter]); }
            assert.ok(q.options.includes(q.correctLetter));
        }
    }
});

test('صنّف الحرف: الجواب حكم يحوي الحرف وأحكام المرحلة وحدها خيارات', () => {
    let seen = 0;
    for (const { rule: r, stageId } of flat) {
        for (let i = 0; i < REPS; i++) {
            const q = generateClassifyLetterQuestion(r);
            if (!q) continue;
            seen++;
            assert.equal(q.correctRuleId, r.id);
            assert.ok(getRuleLetters(r).includes(q.letter));
            const stageIds = TAJWEED_STAGES.find(s => s.id === stageId).rules.map(x => x.id);
            q.options.forEach(o => assert.ok(stageIds.includes(o.ruleId)));
            assert.ok(q.options.length >= 2 && q.options.length <= 4);
            assert.ok(q.options.some(o => o.ruleId === r.id));
            // لا حكم آخر في الخيارات يحوي الحرف نفسه (جواب وحيد)
            const owners = q.options.filter(o => (getRuleLetters(rule(o.ruleId)) || []).includes(q.letter));
            assert.equal(owners.length, 1, `${r.id}: ${q.letter}`);
        }
    }
    assert.ok(seen > 0);
});

test('صنّف الزوج واربط الحرفين: الزوج من الحكم والمشتِّتات لا تكوّن زوجاً مع الحرف الأول', () => {
    for (const id of ['mithlain', 'mutaqaribain', 'mutajanisain']) {
        const r = rule(id), pairs = getRulePairs(r);
        const stagePairs = ['mithlain', 'mutaqaribain', 'mutajanisain'].flatMap(x => getRulePairs(rule(x)));
        for (let i = 0; i < REPS; i++) {
            const c = generateClassifyPairQuestion(r);
            assert.equal(c.options.length, 3);
            assert.ok(pairs.some(p => p.a === c.pair.a && p.b === c.pair.b));
            const l = generatePairLinkQuestion(r);
            assert.ok(pairs.some(p => p.a === l.first && p.b === l.correctLetter));
            assert.equal(l.options.length, 4);
            l.options.filter(o => o !== l.correctLetter).forEach(o => assert.ok(!stagePairs.some(p => p.a === l.first && p.b === o), `${l.first}${o}`));
        }
    }
});

test('ألعاب الحروف للحكم: خمسة أسئلة لكل حكم حروف/أزواج، وصفر لأحكام المواقف', () => {
    flat.forEach(({ rule: r }) => {
        const qs = buildRuleLetterGameQuestions(r);
        if (!isLetterGameRule(r)) return assert.deepEqual(qs, [], r.id);
        assert.ok(qs.length >= 3 && qs.length <= 5, `${r.id}: ${qs.length}`);
        qs.forEach(q => assert.equal(q.ruleId, r.id));
    });
    // الحكم القائم على أزواج يعطي صنّف/اربط فقط، والقائم على حروف يعطي اجمع/الدخيل (+صنّف إن وُجد حكم ثانٍ في المرحلة)
    assert.ok(buildRuleLetterGameQuestions(rule('mutajanisain')).every(q => ['classify_pair', 'pair_link'].includes(q.type)));
    assert.ok(buildRuleLetterGameQuestions(rule('qalqalah')).every(q => ['letter_collect', 'odd_letter'].includes(q.type)));
    assert.ok(buildRuleLetterGameQuestions(rule('ikhfa')).some(q => q.type === 'classify_letter'));
});

test('إضافة لا استبدال: اختبار الحكم كما كان تماماً (لا أسئلة حروف فيه) ولا تغيير في خريطة أنشطته', () => {
    for (const { rule: r } of flat) {
        const qs = buildExamQuestions(r, []);
        assert.ok(qs.length <= EXAM_SIZE, r.id);
        assert.ok(qs.every(q => q.type === 'choose_rule'), r.id);
    }
});

test('كل أنواع الأسئلة الجديدة لها بُعد إتقان', () => {
    ['letter_collect', 'odd_letter', 'classify_letter', 'classify_pair', 'pair_link'].forEach(k => assert.ok(ACTIVITY_DIMENSION_MAP[k], k));
});

test('نشاط شجرة الحكم: يعمل للمراحل ذات الحروف/الأزواج ولا يعمل لمراحل المواقف', () => {
    ['qalqalah', 'noon_sakinah', 'meem_sakinah', 'lam_al', 'mithlain', 'meem_noon_mushaddadah'].forEach(id => assert.ok(hasStageTreeActivity(id), id));
    ['madd_lazim'].forEach(id => assert.ok(!hasStageTreeActivity(id), id));
    const noon = buildStageTreeQuestions('noon_sakinah');
    assert.equal(noon.length, 8);
    assert.ok(noon.every(q => q.type === 'classify_letter'));
    assert.equal(new Set(noon.map(q => q.ruleId)).size >= 4, true);
    assert.equal(buildStageTreeQuestions('qalqalah')[0].type, 'letter_collect');
    assert.ok(buildStageTreeQuestions('mithlain').every(q => q.type === 'classify_pair'));
});

test('شجرة التلخيص: كل أحكام المرحلة حاضرة، والإدغام مجمَّع في النون الساكنة', () => {
    for (const st of TAJWEED_STAGES) {
        const tree = buildStageTree(st.id);
        const ids = tree.branches.flatMap(b => b.children.map(c => c.ruleId));
        assert.deepEqual(ids.sort(), st.rules.map(r => r.id).sort(), st.id);
    }
    const noon = buildStageTree('noon_sakinah');
    const grp = noon.branches.find(b => b.groupKey);
    assert.deepEqual(grp.children.map(c => c.ruleId), ['idgham_bighunnah', 'idgham_bila_ghunnah']);
    assert.equal(buildStageTree('madd').branches[0].children[0].kind, 'letters'); // المد الطبيعي و ا ي
    assert.equal(buildStageTree('madd').branches[1].children[0].kind, 'text');
});

test('الترجمة: كل مفاتيح الواجهة الجديدة موجودة بالعربية والإنجليزية', () => {
    const src = fs.readFileSync(new URL('../core/i18n.js', import.meta.url), 'utf8');
    const keys = ['tjw_act_collect_prompt', 'tjw_act_odd_not_prompt', 'tjw_act_odd_is_prompt', 'tjw_act_classify_letter_prompt', 'tjw_act_classify_pair_prompt',
        'tjw_act_pair_link_prompt', 'tjw_act_link_examples_prompt', 'tjw_tree_title', 'tjw_tree_group_idgham', 'tjw_letter_cards_title', 'tjw_flip_hint',
        'tjw_pair_idgham', 'tjw_pair_izhar', 'tjw_tree_activity_btn', 'tjw_tree_activity_title', 'tjw_letters_play_btn', 'tjw_letters_activity_title'];
    keys.forEach(k => assert.equal(src.split(`${k}:`).length - 1, 2, k));
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
