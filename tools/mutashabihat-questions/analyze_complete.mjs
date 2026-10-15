// تقرير: لماذا نوع «أكمل الآية» غائب في أغلب المجموعات؟ وهل يمكن دعم العبارة في وسط الآية؟
// الاستعمال: node tools/mutashabihat-questions/analyze_complete.mjs [مجلد_المخرجات]
import fs from 'node:fs';
import path from 'node:path';
import { runAll, summarize } from './qa.mjs';
import { newCompleteStats, SIM_TYPE_LABELS, stripHizbMark } from '../../engine/similarityQuestions.js';

const outDir = process.argv[2] || 'reports/similarity-questions';
fs.mkdirSync(outDir, { recursive: true });
const pct = (a, b) => b ? (100 * a / b).toFixed(1) + '٪' : '—';

const run = async (midVerse) => { const stats = newCompleteStats(); const res = await runAll({ seed: 7, midVerse, stats }); return { stats, res, sum: summarize(res) }; };
const A = await run(false), B = await run(true);
const withComplete = (r) => r.res.groups.filter(g => g.questions.some(q => q.type === 'sim_complete')).length;
const completeQ = (r) => r.res.groups.reduce((n, g) => n + g.questions.filter(q => q.type === 'sim_complete').length, 0);
const nGroups = A.res.groups.length;
const st = A.stats, at = st.at;
const totalLocs = st.locs;

const md = [];
md.push('# لماذا نوع «أكمل الآية» غائب في أغلب المجموعات؟', '');
md.push(`مقاس على كل المجموعات (${nGroups}) ومواضعها الصالحة (${totalLocs} موضعاً) — الأمر: \`node tools/mutashabihat-questions/analyze_complete.mjs\`.`, '');
const stemLen = (q) => { const m = q.text.match(/﴿([^﴾]*) \.{6}﴾/); return m ? m[1].split(/\s+/).length : 0; };
const longStems = B.res.groups.flatMap(g => g.questions).filter(q => q.type === 'sim_complete' && stemLen(q) > 15).length;
const unusable = (at.mid || 0) + (at.end || 0) + (at.whole || 0) + (at.none || 0);
md.push('## الخلاصة', '',
  `- «أكمل الآية» يظهر الآن في **${withComplete(A)} مجموعة من ${nGroups} (${pct(withComplete(A), nGroups)})**، بمجموع **${completeQ(A)} سؤالاً** من ${A.sum.total}.`,
  `- **${pct(unusable, totalLocs)} من المواضع (${unusable} من ${totalLocs}) لا يصلح مطلعاً أصلاً** لأن العبارة المشتركة ليست في أول الآية: في وسطها ${at.mid || 0} (${pct(at.mid || 0, totalLocs)})، وفي آخرها ${at.end || 0} (${pct(at.end || 0, totalLocs)})، وهي الآية كلها ${at.whole || 0}، ولم تُطابَق مع المصحف ${at.none || 0} (${pct(at.none || 0, totalLocs)}).`,
  `- من المواضع التي تبدأ بالعبارة (${at.start || 0}) بقي ${st.built} مرشّحاً صالحاً، ولم يُختَر منها إلا ${completeQ(A)} لسببين: سقف أربعة أسئلة للمجموعة، وأن «أكمل الآية» للموضع نفسه تسأل الحقيقة نفسها التي يسألها «ما الآية التي قبلها؟» فلا يجتمعان (قاعدة منع التكرار).`,
  `- **نعم، يمكن دعم العبارة في وسط الآية** (${at.mid || 0} موضعاً إضافياً): جُرّب على القرآن كله بخيار \`midVerse\` فارتفع «أكمل الآية» من ${completeQ(A)} إلى ${completeQ(B)} سؤالاً (ومن ${withComplete(A)} إلى ${withComplete(B)} مجموعة) وبقيت فحوص الجودة بلا إخفاق. أما العبارة في **آخر** الآية أو الآية كلها فلا شيء بعدها لإكماله، فالنوع غير قابل للدعم هناك (يغطيه «ما قبلها/ماذا بعدها»).`, '');
md.push('## 1) أين تقع العبارة في آيات المجموعات (لكل موضع)', '', '| موضع العبارة في الآية | المواضع | النسبة | هل يُبنى منه «أكمل الآية» الآن؟ |', '|---|---|---|---|');
const L = { start: 'في أول الآية (مطلع)', mid: 'في وسط الآية', end: 'في آخر الآية', whole: 'هي الآية كلها', none: 'لم تُطابَق مع نص المصحف' };
const can = { start: 'نعم', mid: 'لا (يمكن دعمه، انظر 3)', end: 'لا: لا شيء بعدها لإكماله', whole: 'لا: لا شيء لإكماله', none: 'لا: مطابقة الإملاء/الصياغة اليدوية' };
for (const k of ['start', 'mid', 'end', 'whole', 'none']) md.push(`| ${L[k]} | ${at[k] || 0} | ${pct(at[k] || 0, totalLocs)} | ${can[k]} |`);
md.push('', '## 2) ماذا يحدث للمواضع التي تبدأ بالعبارة (قمع النوع الحالي)', '', '| المرحلة | العدد |', '|---|---|',
  `| مواضع تبدأ بالعبارة وتصلح مطلعاً | ${at.start || 0} |`,
  `| ... وتُسقَط لأن الآيتين متطابقتا اللفظ في موضعين (الجواب غير وحيد) | ${st.identicalBlocked} |`,
  `| ... وتُسقَط لأن الخيارات أقل من ثلاثة | ${st.fewOptions} |`,
  `| ... وتُسقَط لأن الإكمال الصحيح ليس وحيداً في السياق المعروض | ${st.notUnique} |`,
  `| ... مرشّحات «أكمل الآية» الصالحة | ${st.built} |`,
  `| مجموعات فيها مرشّح واحد على الأقل | ${st.groupsWithCand} |`,
  `| مجموعات اختير فيها «أكمل الآية» فعلاً (للأربعة أسئلة، بلا تكرار حقيقة) | ${st.groupsChosen} |`, '');
md.push('> ملاحظة: «أكمل الآية» للموضع س تسأل الحقيقة «الآية س تلي الآية التي قبلها»، وهي نفسها حقيقة «ما الآية التي قبلها؟» للموضع نفسه. لذلك لا يجتمعان في مجموعة واحدة لنفس الموضع (قاعدة منع التكرار)، فيُفضَّل أحدهما بحسب أكبر عدد أسئلة مختلفة ممكن.', '');
md.push('## 3) دعم العبارة في وسط الآية', '',
  '**الفكرة:** إن وقعت العبارة بعد كلمات في الآية، يكون المطلع المعروض **كل ما قبل العبارة ومعها** («قال تعالى: ﴿ ... العبارة ......﴾ ما الذي يُكمل الآية؟»)، والجواب الباقي. المشتّتات: نهايات الآيات التي ترد فيها العبارة نفسها في القرآن كله (متشابهات حقيقية) ونهايات مواضع المجموعة. ويُتحقق آلياً أن الإكمال وحيد في السياق (بعد الآية السابقة المعروضة) وأن كل مشتّت نهاية آية حقيقية.', '',
  `**التجربة على القرآن كله** (الخيار \`midVerse\`، معطّل افتراضياً):`, '',
  '| | بدونه (الحالي) | به |', '|---|---|---|',
  `| أسئلة «${SIM_TYPE_LABELS.sim_complete}» | ${completeQ(A)} | ${completeQ(B)} |`,
  `| مجموعات فيها «أكمل الآية» | ${withComplete(A)} | ${withComplete(B)} |`,
  `| مواضع صالحة مطلعاً | ${st.stemLocs} | ${B.stats.stemLocs} |`,
  `| إجمالي الأسئلة | ${A.sum.total} | ${B.sum.total} |`,
  `| مجموعات بأربعة أسئلة | ${A.sum.byCount[4]} | ${B.sum.byCount[4]} |`,
  `| أسئلة فاشلة في فحوص الجودة | ${A.sum.failures} | ${B.sum.failures} |`,
  `| مجموعات فيها تكرار/كشف جواب | ${A.sum.groupFailures} | ${B.sum.groupFailures} |`, '',
  `**مثال لسؤال بمطلع من وسط الآية** (مجموعة 3-59، العبارة «وَمَن»):`, '',
  '> في سورة آل عمران، جاء قوله تعالى: ﴿وَلَقَدْ كُنتُمْ تَمَنَّوْنَ ٱلْمَوْتَ مِن قَبْلِ أَن تَلْقَوْهُ فَقَدْ رَأَيْتُمُوهُ وَأَنتُمْ تَنظُرُونَ﴾ ثم جاءت بعدها الآية: ﴿وَمَا مُحَمَّدٌ إِلَّا رَسُولٌۭ قَدْ خَلَتْ مِن قَبْلِهِ ٱلرُّسُلُ ۚ أَفَإِي۟ن مَّاتَ أَوْ قُتِلَ ٱنقَلَبْتُمْ عَلَىٰٓ أَعْقَٰبِكُمْ ۚ وَمَن ......﴾ ما الذي يُكمل الآية؟ ← الصحيح: «يَنقَلِبْ عَلَىٰ عَقِبَيْهِ فَلَن يَضُرَّ ٱللَّهَ شَيْـًۭٔا ...»، والمشتّتات: «يَعْتَصِم بِٱللَّهِ ...» و«يَعْصِ ٱللَّهَ وَرَسُولَهُۥ ...» و«تَطَوَّعَ خَيْرًۭا ...».', '',
  '**محاذير:**',
  `- المطلع في وسط الآية قد يطول (كل ما قبل العبارة) فيصير السؤال أسهل لأن أغلب الآية معروضة: ${longStems} سؤالاً من أسئلة «أكمل الآية» في التجربة مطلعه أطول من 15 كلمة. ويصلح حدّ أقصى لطول المطلع (مثلاً 15 كلمة) يُسقط هذه الأسئلة، وهو غير مفعّل الآن.`,
  '- العبارات المكتوبة بصيغة تلخيص يدوي («... ذُو/ذِي ...»، «يَوْمَ ...») تُنظَّف قبل المطابقة، وما لم يُطابَق يبقى خارج النوع.',
  '- التفعيل: تمرير `midVerse: true` إلى `generateGroupQuestions` (أو جعله افتراضياً في `engine/similarityEngine.js`) — لم أفعّله بانتظار قرارك.', '');
fs.writeFileSync(path.join(outDir, 'COMPLETE_TYPE_REPORT.md'), md.join('\n'));
console.log(md.slice(0, 12).join('\n'));
console.log({ A: { q: completeQ(A), groups: withComplete(A), fail: A.sum.failures, gf: A.sum.groupFailures }, B: { q: completeQ(B), groups: withComplete(B), fail: B.sum.failures, gf: B.sum.groupFailures, byCount: B.sum.byCount } });
