// tajweed/tajweed-letters-ui.js
//
// 🌟 [جديد] مكوّنات عرض أنشطة الحروف والأزواج في «أبطال التجويد» (تُستهلَك من tajweed-map.js وtajweed-activity.js):
//   • شجرة الحكم: المرحلة ← الأحكام ← حروفها أو أزواجها (على غرار ص١٧ من كتاب «فتوحات الرحمن»)
//   • بطاقات الحروف القابلة للقلب: وجه الحرف، وظهر بكلمة قرآنية مقتطعة من مصحف المنصة (لا نصّ مكتوباً يدوياً)
//   • سؤال «صِل المثال بحكمه» لنشاط ربط المرحلة
// كل منطق البيانات في engine/tajweedLetterGames.js وملفَّي الأزواج والأمثلة؛ هذا الملف يبني HTML فقط.
import { t } from '../core/app.js';
import { getTajweedStage } from '../engine/tajweedRulesCatalog.js';
import { buildStageTree, getRuleLetters, getRulePairs } from '../engine/tajweedLetterGames.js';
import { LETTER_EXAMPLES, splitLetterExample, withoutWaqf } from '../engine/tajweedLetterExamples.js';
import { pairPhrase } from '../engine/tajweedLetterPairs.js';
import { findPhraseRanges } from '../core/quranTextUtils.js';
import { getAyahForExample } from './tajweed-shared.js';

const strip = (s) => s.replace(/[ً-ٰٟۖ-ۭ]/g, '');
const TREE_COLORS = 6; // عدد ألوان --tjw-tree-c0..5 في tajweed.css

// ============================================================
// شجرة الحكم
// ============================================================
export function renderStageTreeHTML(stageId, activeRuleId) {
    const tree = buildStageTree(stageId);
    if (!tree) return '';
    let colorIdx = 0;
    const nodeHTML = (node) => {
        const c = colorIdx++ % TREE_COLORS;
        const leaves = node.kind === 'pairs'
            ? node.items.map(p => `<span class="tjw-tree-leaf is-pair">${p.a}<i>+</i>${p.b}</span>`).join('')
            : node.kind === 'letters'
                ? node.items.map(l => `<span class="tjw-tree-leaf">${l}</span>`).join('')
                : `<span class="tjw-tree-text">${node.text}</span>`;
        return `
            <div class="tjw-tree-node ${node.ruleId === activeRuleId ? 'is-active' : ''}" style="--tjw-tree-c: var(--tjw-tree-c${c});">
                <div class="tjw-tree-node-name">${t(node.nameKey)}</div>
                <div class="tjw-tree-leaves ${node.count > 12 ? 'is-dense' : ''}">${leaves}</div>
            </div>`;
    };
    const branchesHTML = tree.branches.map(b => b.groupKey
        ? `<div class="tjw-tree-group"><div class="tjw-tree-group-name">${t(b.groupKey)}</div><div class="tjw-tree-group-children">${b.children.map(nodeHTML).join('')}</div></div>`
        : b.children.map(nodeHTML).join('')).join('');
    return `
        <div class="tjw-tree" style="--tjw-tree-root: var(${tree.colorVar});">
            <div class="tjw-tree-root">${t(tree.nameKey)}</div>
            <div class="tjw-tree-branches">${branchesHTML}</div>
        </div>`;
}

// ============================================================
// بطاقات الحروف القابلة للقلب (نص قرآني من المنصة)
// ============================================================
// ظهر بطاقة حرف: كلمة المثال بحرفها المظلَّل (من LETTER_EXAMPLES)، وإلا مثال الحكم نفسه من الكتالوج
function letterBackHTML(rule, letter, ayahByKey) {
    const ex = (LETTER_EXAMPLES[rule.id] || {})[letter];
    if (ex) {
        const ayah = ayahByKey.get(`${ex.s}:${ex.a}`);
        const parts = ayah && splitLetterExample(ayah.text, ex);
        if (parts) {
            return `<span class="tjw-flip-word">${parts.before}<mark class="tjw-flip-mark">${parts.mark}</mark>${parts.after}</span>
                    <small>${ayah.surahName} ${ex.a}</small>`;
        }
    }
    const ayah = ayahByKey.get(`${rule.example.surah}:${rule.example.ayah}`);
    if (!ayah) return `<small>${t(rule.nameKey)}</small>`;
    const ranges = findPhraseRanges(ayah.text, rule.example.highlight);
    const phrase = ranges.length ? ayah.text.slice(ranges[0][0], ranges[0][1]) : '';
    return `<span class="tjw-flip-word">${phrase || ayah.text}</span><small>${ayah.surahName} ${rule.example.ayah}</small>`;
}

function pairBackHTML(rule, p, ayahByKey) {
    const ayah = ayahByKey.get(`${p.s}:${p.v}`);
    const phrase = ayah ? pairPhrase(ayah.text, p) : null;
    const badge = `<small class="tjw-flip-badge ${p.g ? 'is-idgham' : 'is-izhar'}">${t(p.g ? 'tjw_pair_idgham' : 'tjw_pair_izhar')}</small>`;
    return `<span class="tjw-flip-word">${phrase || ''}</span>${badge}${ayah ? `<small>${ayah.surahName} ${p.v}</small>` : ''}`;
}

export async function renderLetterCardsHTML(rule) {
    const pairs = getRulePairs(rule), letters = getRuleLetters(rule);
    if (!pairs && !letters) return '';
    const keys = new Set([`${rule.example.surah}:${rule.example.ayah}`]);
    if (pairs) pairs.forEach(p => keys.add(`${p.s}:${p.v}`));
    else Object.values(LETTER_EXAMPLES[rule.id] || {}).forEach(e => keys.add(`${e.s}:${e.a}`));
    const ayahByKey = new Map();
    await Promise.all([...keys].map(async k => {
        const [s, a] = k.split(':').map(Number);
        const info = await getAyahForExample(s, a);
        if (info) ayahByKey.set(k, info);
    }));
    const cards = pairs
        ? pairs.map((p, i) => ({ front: `${p.a}<i>+</i>${p.b}`, back: pairBackHTML(rule, p, ayahByKey), pair: true, i }))
        : letters.map((l, i) => ({ front: l, back: letterBackHTML(rule, l, ayahByKey), pair: false, i }));
    return `
        <div class="tjw-flip-grid">${cards.map(c => `
            <button type="button" class="tjw-flip ${c.pair ? 'is-pair' : ''}" data-tjw-flip style="--tjw-fc: var(--tjw-tree-c${c.i % TREE_COLORS});">
                <span class="tjw-flip-inner">
                    <span class="tjw-flip-face tjw-flip-front"><b>${c.front}</b><small>${t('tjw_flip_hint')}</small></span>
                    <span class="tjw-flip-face tjw-flip-back">${c.back}</span>
                </span>
            </button>`).join('')}</div>`;
}

// ============================================================
// سؤال «صِل المثال بحكمه» لنشاط ربط المرحلة
// ============================================================
const pickOne = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

export async function buildExamplesLinkQuestion(stageId) {
    const stage = getTajweedStage(stageId);
    if (!stage) return null;
    const items = [];
    for (const rule of stage.rules) {
        const pairs = getRulePairs(rule), byLetter = LETTER_EXAMPLES[rule.id];
        if (pairs) {
            const p = pickOne(pairs), ayah = await getAyahForExample(p.s, p.v), phrase = ayah && pairPhrase(ayah.text, p);
            if (phrase) items.push({ ruleId: rule.id, html: `<span class="tjw-link-example">${phrase}</span>` });
        } else if (byLetter) {
            const e = byLetter[pickOne(Object.keys(byLetter))], ayah = await getAyahForExample(e.s, e.a), parts = ayah && splitLetterExample(ayah.text, e);
            if (parts) items.push({ ruleId: rule.id, html: `<span class="tjw-link-example">${parts.before}<mark class="tjw-flip-mark">${parts.mark}</mark>${parts.after}</span>` });
        }
    }
    if (items.length < 2) return null;
    const rules = items.map(i => stage.rules.find(r => r.id === i.ruleId));
    return {
        type: 'link_rule_letters', kind: 'examples', stageId,
        namesCol: shuffle(rules.map(r => ({ ruleId: r.id, nameKey: r.nameKey }))),
        lettersCol: shuffle(items.map(i => ({ ruleId: i.ruleId, html: i.html })))
    };
}
