// يولّد عيّنة مراجعة (5 مجموعات من كل جزء) بصيغة Word + JSON، وتقرير الاختبارات Markdown
// الاستعمال: node tools/mutashabihat-questions/build_sample.mjs [مجلد_المخرجات]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { runAll, summarize } from './qa.mjs';
import { mulberry32, SIM_TYPE_LABELS } from '../../engine/similarityQuestions.js';

const require = createRequire(import.meta.url);
let docx;
try { docx = require('docx'); } catch { docx = require(path.join(process.env.NODE_PATH || '/opt/node22/lib/node_modules', 'docx')); }
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, PageBreak, BorderStyle } = docx;

const outDir = process.argv[2] || 'reports/similarity-questions';
fs.mkdirSync(outDir, { recursive: true });
const res = await runAll({ seed: 7 });
const sum = summarize(res);

// ---------- العيّنة: 5 مجموعات لكل جزء (تفضَّل المجموعات ذات الأربعة أسئلة، وفي الجزء 30 مجموعتان من جزء عمّ) ----------
const rng = mulberry32(2026);
const pick = (arr, n) => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); };
const byJuz = new Map();
for (const g of res.groups) if (g.count > 0) { (byJuz.get(g.juz) || byJuz.set(g.juz, []).get(g.juz)).push(g); }
const sample = [];
for (let j = 1; j <= 30; j++) {
    const all = byJuz.get(j) || [];
    const chosen = [];
    if (j === 30) chosen.push(...pick(all.filter(g => g.scope === 'juzAmma' && g.count >= 3), 2));
    const rest = all.filter(g => !chosen.includes(g));
    const full = pick(rest.filter(g => g.count === 4), 5 - chosen.length);
    chosen.push(...full);
    if (chosen.length < 5) chosen.push(...pick(rest.filter(g => !chosen.includes(g)), 5 - chosen.length));
    sample.push({ juz: j, available: all.length, groups: chosen });
}
fs.writeFileSync(path.join(outDir, 'sample.json'), JSON.stringify(sample.map(s => ({ juz: s.juz, groups: s.groups.map(g => ({ groupId: g.groupId, anchorPhrase: g.anchorPhrase, questions: g.questions })) })), null, 1));

// ---------- Word ----------
const FONT = 'Amiri'; const QFONT = 'Amiri Quran';
const run = (text, o = {}) => new TextRun({ text, rightToLeft: true, font: { name: o.quran ? QFONT : FONT, cs: o.quran ? QFONT : FONT }, size: o.size || 26, sizeComplex: o.size || 26, bold: o.bold, boldComplex: o.bold, color: o.color });
const para = (children, o = {}) => new Paragraph({ bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { after: o.after ?? 80, line: o.line || 340 }, indent: o.indent ? { right: o.indent } : undefined, children, ...(o.extra || {}) });
// نص السؤال: الآيات بين ﴿ ﴾ بخط المصحف، والأسطر فقرات مستقلة
const qParas = (text) => text.split('\n').map(line => {
    const parts = line.split(/(﴿[^﴾]*﴾)/).filter(Boolean);
    return para(parts.map(p => p.startsWith('﴿') ? run(p, { quran: true, size: 30, color: '0B5D3B' }) : run(p, { bold: !p.includes('﴿') })), { indent: 360 });
});
const LET = ['أ', 'ب', 'ج', 'د'];
const kids = [];
kids.push(new Paragraph({ bidirectional: true, alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [run('عيّنة مراجعة أسئلة المتشابهات', { bold: true, size: 44 })] }));
kids.push(para([run('خمس مجموعات من كل جزء (150 مجموعة). الجواب الصحيح مُعلَّم بـ ✓ وباللون الأخضر، وسطر «المرجع» للمعلم فقط ولا يظهر للطالب. كل نص بين ﴿ ﴾ منقول حرفياً من مصحف المنصة.', { size: 24 })]));
kids.push(para([run(`إجمالي ما تُنتجه الصيغة الجديدة على القرآن كله: ${sum.total} سؤالاً من ${sum.groups} مجموعة (${Object.entries(sum.byType).map(([t, n]) => `${SIM_TYPE_LABELS[t]}: ${n}`).join('، ')}).`, { size: 24 })]));
let first = true;
for (const s of sample) {
    kids.push(new Paragraph({ bidirectional: true, heading: HeadingLevel.HEADING_1, pageBreakBefore: !first || true, alignment: AlignmentType.RIGHT, spacing: { before: 120, after: 160 }, children: [run(`الجزء ${s.juz}`, { bold: true, size: 36, color: '1F4E79' })] }));
    first = false;
    if (!s.groups.length) kids.push(para([run('لا توجد مجموعات متشابهات في هذا الجزء في بيانات المنصة الحالية.', { size: 24 })]));
    for (const g of s.groups) {
        kids.push(new Paragraph({ bidirectional: true, heading: HeadingLevel.HEADING_2, alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 100 }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'BBBBBB', space: 2 } },
            children: [run(`المجموعة ${g.groupId} — «${g.anchorPhrase}» — ${g.questions.length} أسئلة`, { bold: true, size: 28, color: '7A4B00' })] }));
        g.questions.forEach((q, qi) => {
            kids.push(para([run(`${qi + 1}) ${SIM_TYPE_LABELS[q.type]}`, { bold: true, size: 24, color: '555555' })], { after: 40, extra: { keepNext: true } }));
            kids.push(...qParas(q.text));
            q.options.forEach((o, i) => {
                const ok = i === q.correctIndex;
                kids.push(para([run(`${LET[i]}) `, { bold: true, size: 26, color: ok ? '0B7A3B' : undefined }), run(q.type === 'sim_surah' ? o : '﴿ ' + o + ' ﴾', { quran: q.type !== 'sim_surah', size: 28, bold: ok, color: ok ? '0B7A3B' : undefined }), ...(ok ? [run('  ✓', { bold: true, color: '0B7A3B' })] : [])], { indent: 720, after: 40 }));
            });
            kids.push(para([run('المرجع (للمعلم): ' + q.ref, { size: 20, color: '888888' })], { indent: 360, after: 160 }));
        });
    }
}
const doc = new Document({
    styles: { default: { document: { run: { font: FONT, size: 26 } } } },
    sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 } } }, children: kids }]
});
fs.writeFileSync(path.join(outDir, 'عينة_أسئلة_المتشابهات.docx'), await Packer.toBuffer(doc));

// ---------- تقرير الاختبارات ----------
const perJuz = {};
for (const g of res.groups) { const j = g.juz ?? 'بلا أسئلة'; (perJuz[j] ||= { groups: 0, q: 0, lt4: 0 }); perJuz[j].groups++; perJuz[j].q += g.count; if (g.count < 4) perJuz[j].lt4++; }
const lt4 = res.groups.filter(g => g.count < 4);
const reasonGroups = {};
for (const g of lt4) { const k = g.count === 0 ? (g.reason.startsWith('أقل من موضعين') ? 'لا موضعان صالحان بعد مطابقة المصحف' : 'لا مرشّحات صالحة (الجواب غير وحيد في السياق أو أقل من 3 خيارات)') : 'تكرار/كشف جواب: المرشّحات المتبقية تكرر حقيقة أو تكشف جواباً'; (reasonGroups[k] ||= []).push(g); }
const md = [];
md.push('# تقرير اختبارات أسئلة المتشابهات (القرآن كله)', '');
md.push(`الأمر: \`node tests/similarityQuestions.test.mjs\` — كل المجموعات (${sum.groups}) على نص \`database/quran-uthmani.json\`.`, '');
md.push('## الملخص', '', `- عدد الأسئلة المُولَّدة: **${sum.total}**`, `- حسب النوع: ${Object.entries(sum.byType).map(([t, n]) => `${SIM_TYPE_LABELS[t]} ${n}`).join(' · ')}`);
md.push(`- توزيع المجموعات حسب عدد أسئلتها: ${Object.entries(sum.byCount).map(([c, n]) => `${c} أسئلة: ${n}`).join(' · ')}`);
md.push(`- توزيع موضع الجواب الصحيح (0..3): ${[0, 1, 2, 3].map(i => sum.pos[i] || 0).join(' / ')} (الخيار الرابع غير موجود في أسئلة الثلاثة خيارات)`);
md.push(`- **أسئلة فاشلة في الفحوص: ${sum.failures}** · **مجموعات فيها تكرار/كشف جواب: ${sum.groupFailures}**`, '');
md.push('## الفحوص المنفَّذة (كلها مستقلة عن المولّد: تقرأ ملف المصحف الخام وتطبّع بطريقتها)', '',
    '1. لا رقم (عربي/هندي/لاتيني) في نص السؤال أو خياراته.',
    '2. كل ما بين ﴿ ﴾ مطابق حرفياً لآية في قاعدة البيانات (أو مطلع آية حرفي متبوعاً بنقاط).',
    '3. كل خيار خاطئ ليس صحيحاً في السياق: «ماذا بعدها/ما قبلها» يُبحث عن الآية المعروضة في السورة كلها ويُتحقق أن الجواب وحيد؛ «أكمل الآية» يُتحقق أن الإكمال وحيد بعد الآية المعروضة (أو أول السورة)؛ كل خيار نهاية آية حقيقية.',
    '4. «من أي سورة؟»: لا تحوي أي سورة خاطئة الآية (أو الآيتين المتتاليتين) المعروضة.',
    '5. داخل المجموعة: لا نص مكرر، ولا سؤالان بالحقيقة نفسها (الآية س تلي الآية ص)، ولا جواب ظاهر في نص سؤال آخر.',
    '6. عدد الخيارات 3–4، وتوزيع موضع الصحيح متوازن.',
    '7. ضوابط سلبية: يُدخَل خطأ متعمَّد (حرف مغيَّر، رقم، خيار خاطئ صحيح) ويُتأكَّد أن الفحص يكشفه.', '');
md.push('## عدد الأسئلة لكل جزء (الجزء = جزء أول موضع في المجموعة)', '', '| الجزء | مجموعات | أسئلة | مجموعات بأقل من 4 |', '|---|---|---|---|');
Object.keys(perJuz).sort((a, b) => (+a || 99) - (+b || 99)).forEach(j => md.push(`| ${j} | ${perJuz[j].groups} | ${perJuz[j].q} | ${perJuz[j].lt4} |`));
md.push('', `## المجموعات التي قلّت أسئلتها عن أربعة (${lt4.length} مجموعة)`, '');
for (const [k, arr] of Object.entries(reasonGroups)) {
    md.push(`### ${k} — ${arr.length} مجموعة`, '');
    if (arr.length <= 60) { md.push('| المجموعة | العبارة | الأسئلة |', '|---|---|---|'); arr.forEach(g => md.push(`| ${g.groupId} | ${g.anchorPhrase} | ${g.count} |`)); }
    else md.push(`أمثلة: ${arr.slice(0, 12).map(g => g.groupId + '(' + g.count + ')').join('، ')} … والقائمة الكاملة في \`low_count_groups.json\`.`);
    md.push('');
}
fs.writeFileSync(path.join(outDir, 'QA_REPORT.md'), md.join('\n'));
fs.writeFileSync(path.join(outDir, 'low_count_groups.json'), JSON.stringify(lt4.map(g => ({ groupId: g.groupId, anchorPhrase: g.anchorPhrase, juz: g.juz, count: g.count, reason: g.reason, notes: g.notes })), null, 1));
console.log('تم:', outDir, { total: sum.total, lt4: lt4.length });
