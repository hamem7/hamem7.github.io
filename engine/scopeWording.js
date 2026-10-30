// engine/scopeWording.js
// ==========================================
// صياغة «نطاق الواجب» في رسالة ولي الأمر بلغة يفهمها الجميع بدل أرقام الأحزاب:
//   • كل نطاق الحفظ        ← «من سورة الناس إلى سورة ق»
//   • سورة واحدة            ← «سورة النبأ»
//   • حزب واحد أو بعضه      ← «من سورة الناس إلى سورة البروج» (بالسور التي يمسّها)
//   • حزبان يكوّنان جزءاً   ← «جزء عمّ كاملاً» / «جزء تبارك كاملاً»
// الترتيب دائماً بترتيب مسار حفظ الطالب (من الناس صعوداً) كما في نموذج الاختيار (buildSelectionModel).
// دالة نقية بلا اعتماد على الواجهة: اللغة وأسماء السور تُمرَّران من المستدعي.
// ==========================================

// أجزاء لها اسم مشهور بين الأطفال وأولياء الأمور؛ البقية «الجزء N»
const JUZ_NAMES = { 30: ['عمّ', "Amma"], 29: ['تبارك', 'Tabarak'] };

// model: { unit, groups[], surahs[] } من buildSelectionModel
// selection: { mode: 'all'|'hizb'|'surah', ids[] }
// ← نص النطاق، أو null إن تعذّر (نموذج ناقص/اختيار فارغ) فيلجأ المستدعي إلى صياغته القديمة
export function describeScope({ model, selection, L, surahName }) {
    if (!model || !Array.isArray(model.surahs) || !model.surahs.length) return null;
    const sName = (n) => `${L('سورة', 'Surah')} ${surahName(n)}`;
    const span = (from, to) => (from === to ? sName(from) : `${L('من', 'From')} ${sName(from)} ${L('إلى', 'to')} ${sName(to)}`);
    const sep = L('، ', ', ');
    const mode = selection && selection.mode;

    if (!mode || mode === 'all') {
        const nums = model.surahs.map(s => s.number);
        return span(nums[0], nums[nums.length - 1]);
    }

    if (mode === 'surah') {
        const picked = new Set(selection.ids);
        const runs = contiguousRuns(model.surahs, s => picked.has(s.number), (a, b) => true);
        if (!runs.length) return null;
        return runs.map(r => span(r[0].number, r[r.length - 1].number)).join(sep);
    }

    if (mode === 'hizb') {
        const picked = new Set(selection.ids);
        // الأحزاب المختارة بترتيب المسار؛ كل حزب بمجموعاته (حزب واحد، أو أرباعه الأربعة عند الحفظ الصغير)
        const byHizb = new Map();
        model.groups.forEach(g => {
            if (!picked.has(g.id)) return;
            if (!byHizb.has(g.hizb)) byHizb.set(g.hizb, []);
            byHizb.get(g.hizb).push(g);
        });
        if (!byHizb.size) return null;
        const hizbs = [...byHizb.entries()].map(([hizb, gs]) => ({
            hizb, juz: gs[0].juz, groups: gs,
            complete: gs.every(g => g.pctMemorized >= 100) && (gs[0].unit === 'quarter' ? gs.length === 4 : true)
        }));
        const runs = contiguousRuns(hizbs, () => true, (prev, cur) => Math.abs(prev.hizb - cur.hizb) === 1);
        const parts = [];
        runs.forEach(run => {
            const juzList = wholeJuzOf(run);
            if (juzList) {
                const name = (j) => (JUZ_NAMES[j] ? `${L('جزء', 'Juz')} ${L(JUZ_NAMES[j][0], JUZ_NAMES[j][1])}` : `${L('الجزء', 'Juz')} ${j}`);
                const tail = L('كاملاً', 'in full');
                parts.push(juzList.length === 1
                    ? `${name(juzList[0])} ${tail}`
                    : `${L('من', 'From')} ${name(juzList[0])} ${L('إلى', 'to')} ${name(juzList[juzList.length - 1])} ${tail}`);
                return;
            }
            // جزء مكتمل أو أقل: السور التي يمسّها، من الأعلى رقماً (الأقرب للناس) إلى الأدنى
            const nums = [];
            run.forEach(h => h.groups.forEach(g => { if (g.first) nums.push(g.first.surah); if (g.last) nums.push(g.last.surah); }));
            if (nums.length) parts.push(span(Math.max(...nums), Math.min(...nums)));
        });
        return parts.length ? parts.join(sep) : null;
    }

    return null;
}

// يقطع القائمة (بترتيبها) إلى مقاطع متصلة من العناصر المختارة؛ adjacent(prev, cur) يحدد اتصال عنصرين متتاليين في المقطع
function contiguousRuns(items, isPicked, adjacent) {
    const runs = [];
    let cur = null, prevIdx = -2;
    items.forEach((it, i) => {
        if (!isPicked(it)) { cur = null; return; }
        if (cur && i === prevIdx + 1 && adjacent(cur[cur.length - 1], it)) cur.push(it);
        else { cur = [it]; runs.push(cur); }
        prevIdx = i;
    });
    return runs;
}

// المقطع أجزاء كاملة (كل حزب مكتمل وكل جزء بحزبيه معاً)؟ ← أرقام الأجزاء بترتيب المسار، وإلا null
function wholeJuzOf(run) {
    if (!run.every(h => h.complete)) return null;
    const count = new Map();
    run.forEach(h => count.set(h.juz, (count.get(h.juz) || 0) + 1));
    const juzList = [];
    for (const h of run) if (!juzList.includes(h.juz)) juzList.push(h.juz);
    return juzList.every(j => count.get(j) === 2) ? juzList : null;
}
