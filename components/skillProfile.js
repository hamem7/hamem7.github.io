// components/skillProfile.js
// ==========================================================
// 🌟 [جديد — الواجب الذكي] «ملف مهارات الطالب»: واجهة عرض ما يحسبه engine/trackingEngine.js من سجل أداء الطالب —
// دقة كل مهارة، التشخيص التلقائي (ضعف مهارة أم ضعف موضع)، جودة الأداء من تسجيلات المعلم، مصفوفة (مهارة × مقطع)، وخريطة
// إتقان المقاطع. يُستخدم في: نافذة "ملف المهارات" (من شاشة إنشاء الواجب وملف الطالب)، وسطور «لماذا هذا السؤال؟» في المعاينة،
// وملخص المهارات في التقرير الشهري. كل النصوص ثنائية اللغة عبر L(ar, en) (نصوص هذه الميزة فقط، لا مفاتيح i18n عامة).
// ==========================================================

import { AppState } from '../core/app.js';
import { isEnglish, surahNameLocal } from '../core/i18n.js';
import { esc } from '../core/escape.js';
import { SKILLS, QUALITY } from '../engine/skillMap.js';
import { parseSegmentId, THRESHOLDS, eventScore } from '../engine/trackingEngine.js';

const L = (ar, en) => (isEnglish() ? en : ar);

const SKILL_EN = {
    sequence: 'Sequence & linking', recall: 'Free recall', structure: 'Verse structure & order',
    precision: 'Precision & discrimination', context: 'Surah & context linking', visual: 'Visual memory', fluency: 'Mastery & fluency'
};
const SKILL_AR = {
    sequence: 'التسلسل والترابط', recall: 'الاستدعاء الحر', structure: 'بنية الآية وترتيبها',
    precision: 'الدقة والتمييز بين المتشابه', context: 'الربط بالسورة والسياق', visual: 'الذاكرة البصرية', fluency: 'الإتقان والطلاقة'
};
export const skillLabel = (sk) => (isEnglish() ? SKILL_EN[sk] : SKILL_AR[sk]) || sk;

const QUALITY_EN = { dont_know: "Didn't know the answer", forget: 'Forgot an ayah', multi: 'More than one point', word: 'Word to review', haraka: 'Vowel to correct' };
export const qualityLabel = (c) => (isEnglish() ? QUALITY_EN[c] : QUALITY[c] && QUALITY[c].label) || c;

const LEVEL_META = {
    unseen:    { ar: 'لم يُسأل', en: 'Not asked', color: '#cbd5e1' },
    needs_fix: { ar: 'يحتاج علاجاً', en: 'Needs fixing', color: '#dc2626' },
    shaky:     { ar: 'هشّ', en: 'Shaky', color: '#f59e0b' },
    solid:     { ar: 'ثابت', en: 'Solid', color: '#34d399' },
    mastered:  { ar: 'متقن', en: 'Mastered', color: '#047857' }
};
export const levelLabel = (lv) => { const m = LEVEL_META[lv] || LEVEL_META.unseen; return isEnglish() ? m.en : m.ar; };

const CAT_META = {
    new: { ar: 'حفظ جديد', en: 'New', cls: 'sk-p-new' },
    near: { ar: 'مراجعة قريبة', en: 'Recent review', cls: 'sk-p-near' },
    far: { ar: 'مراجعة بعيدة', en: 'Older review', cls: 'sk-p-far' },
    err: { ar: 'من أخطائه السابقة', en: 'From past mistakes', cls: 'sk-p-err' }
};
export const catLabel = (c) => { const m = CAT_META[c]; return m ? (isEnglish() ? m.en : m.ar) : c; };
export const catClass = (c) => (CAT_META[c] ? CAT_META[c].cls : 'sk-p-far');

// ------------------------------------------
// نصوص مشتركة
// ------------------------------------------
export function segLabel(segId) {
    const p = parseSegmentId(segId);
    if (!p) return String(segId || '');
    const surah = (AppState.surahsData || []).find(s => s.number === p.surah);
    const name = surah ? surahNameLocal(surah.name) : String(p.surah);
    return p.from === p.to ? `${name} ${p.from}` : `${name} ${p.from}–${p.to}`;
}

// «مقطع» بحسب العدد: مقطع واحد / مقطعان / 3–10 مقاطع / 11 فأكثر مقطعاً
export function segCount(n) {
    if (isEnglish()) return `${n} segment${n === 1 ? '' : 's'}`;
    if (n === 1) return 'مقطع واحد';
    if (n === 2) return 'مقطعان';
    return n <= 10 ? `${n} مقاطع` : `${n} مقطعاً`;
}

// «سؤال» بحسب العدد: سؤال واحد / سؤالان / 3–10 أسئلة / 11 فأكثر سؤالاً
export function qCount(n) {
    if (isEnglish()) return `${n} question${n === 1 ? '' : 's'}`;
    if (n === 1) return 'سؤال واحد';
    if (n === 2) return 'سؤالان';
    return n <= 10 ? `${n} أسئلة` : `${n} سؤالاً`;
}

const daysAgo = (ts) => Math.max(0, Math.round((Date.now() - ts) / 86400000));

// سبب اختيار السؤال (يُعرض للمعلم فقط تحت كل سؤال في المعاينة)
export function reasonText(meta) {
    let base;
    if (meta.cat === 'err') {
        base = meta.lastWrongTs
            ? L(`أخطأ فيه قبل ${daysAgo(meta.lastWrongTs)} يوم — يعود بصيغة مختلفة`, `Missed ${daysAgo(meta.lastWrongTs)} days ago — returns in a different format`)
            : L('من أخطائه السابقة', 'From past mistakes');
    } else if (meta.level === 'unseen') {
        base = meta.cat === 'new' ? L('حفظ جديد — لم يُسأل عنه بعد', 'New memorization — not asked yet')
            : L(`${catLabel(meta.cat)} — لم يُسأل عنه من قبل`, `${catLabel(meta.cat)} — never asked before`);
    } else {
        base = L(`${catLabel(meta.cat)} — مستواه الحالي: ${levelLabel(meta.level)}`, `${catLabel(meta.cat)} — current level: ${levelLabel(meta.level)}`);
    }
    if (meta.skillFocus) base += L(` · تعزيز مهارة «${skillLabel(meta.skillFocus)}»`, ` · strengthening "${skillLabel(meta.skillFocus)}"`);
    return base;
}

// حالة "تعلّم" النظام لطالب: كم واجباً/جلسة متتبَّعة؟
export function learningStatus(ctx) {
    const refs = new Set();
    (ctx.events || []).forEach(e => { if (e.source === 'homework' || e.source === 'backfill_homework') refs.add(e.refId); });
    const n = refs.size;
    if (ctx.eventCount === 0) return { ready: false, n, text: L('لا بيانات بعد — الواجب الأول يبدأ التعلّم', 'No data yet — the first homework starts the learning') };
    if (n < 4) return { ready: false, n, text: L(`النظام يتعلّم — ${n} من 4 واجبات (التوزيع أقرب للعشوائي حتى تتجمّع بيانات كافية)`, `Still learning — ${n} of 4 homeworks (distribution is close to random until enough data builds up)`) };
    return { ready: true, n, text: L(`ذكاء كامل — ${n} واجبات متتبَّعة`, `Fully active — ${n} tracked homeworks`) };
}

// جمل التشخيص التلقائي
export function diagnosisLines(ctx) {
    const out = [];
    (ctx.diagnosis || []).forEach(d => {
        if (d.kind === 'skill_weak') {
            out.push({ tone: 'bad', text: L(`يخطئ في «${skillLabel(d.skill)}» في ${d.segments} مواضع مختلفة (دقة ${Math.round(d.acc * 100)}٪) — ضعف في المهارة نفسها، فيرتفع نصيبها في الواجب القادم.`,
                `Misses "${skillLabel(d.skill)}" in ${d.segments} different places (${Math.round(d.acc * 100)}% accuracy) — a weakness in the skill itself, so it gets a larger share next time.`) });
        } else if (d.kind === 'segment_weak') {
            out.push({ tone: 'warn', text: L(`${segLabel(d.segment)}: أخطأ فيه ${d.wrongs} مرات بـ ${d.formats} صيغ مختلفة — ضعف في حفظ الموضع نفسه لا في مهارة، فيُكرَّر بصيغ متنوعة.`,
                `${segLabel(d.segment)}: missed ${d.wrongs} times in ${d.formats} formats — a weakness in the memorization of that spot, not a skill, so it repeats in varied formats.`) });
        } else if (d.kind === 'skill_strong') {
            out.push({ tone: 'good', text: L(`«${skillLabel(d.skill)}» ممتاز (${Math.round(d.acc * 100)}٪) — يتراجع نصيبه ويُسأل بصيغة أصعب.`,
                `"${skillLabel(d.skill)}" is excellent (${Math.round(d.acc * 100)}%) — gets a smaller share and harder formats.`) });
        } else if (d.kind === 'skill_few') {
            out.push({ tone: 'mute', text: L(`«${skillLabel(d.skill)}»: بيانات غير كافية (${d.count} أحداث) — لا نحكم قبل ${THRESHOLDS.minEvidence} أدلة على الأقل.`,
                `"${skillLabel(d.skill)}": not enough data (${d.count} events) — no verdict before at least ${THRESHOLDS.minEvidence} pieces of evidence.`) });
        }
    });
    return out;
}

// سطور ملخص المهارات للتقرير الشهري (summary من skillSummaryForWindow)
export function monthlySummaryLines(summary) {
    if (!summary) return [];
    const rated = SKILLS.map(sk => ({ sk, st: summary.stats[sk] })).filter(x => x.st && x.st.count > 0 && x.st.acc !== null);
    const lines = [];
    const enough = rated.filter(x => x.st.rawN >= THRESHOLDS.minEvidence).sort((a, b) => b.st.acc - a.st.acc);
    if (enough.length) {
        const best = enough[0], worst = enough[enough.length - 1];
        lines.push(L(`أقوى مهارة هذا الشهر: ${skillLabel(best.sk)} (${Math.round(best.st.acc * 100)}٪)`, `Strongest skill this month: ${skillLabel(best.sk)} (${Math.round(best.st.acc * 100)}%)`));
        if (worst.sk !== best.sk && worst.st.acc < THRESHOLDS.strongAcc) {
            lines.push(L(`تحتاج تعزيزاً: ${skillLabel(worst.sk)} (${Math.round(worst.st.acc * 100)}٪)`, `Needs strengthening: ${skillLabel(worst.sk)} (${Math.round(worst.st.acc * 100)}%)`));
        }
    }
    const q = Object.keys(summary.quality || {}).filter(k => summary.quality[k] > 0).sort((a, b) => summary.quality[b] - summary.quality[a]);
    if (q.length) {
        lines.push(L('أكثر ملاحظات المعلم تكراراً: ', 'Most frequent teacher notes: ') + q.slice(0, 2).map(k => `${qualityLabel(k)} (${summary.quality[k]})`).join(isEnglish() ? ', ' : '، '));
    }
    lines.push(L(`استند التقييم إلى ${summary.eventCount} إجابة مسجَّلة`, `Based on ${summary.eventCount} recorded answers`));
    return lines;
}

// ------------------------------------------
// الواجهة
// ------------------------------------------
let styleInjected = false;
export function ensureSkillStyles() {
    if (styleInjected || document.getElementById('sk-style')) { styleInjected = true; return; }
    const st = document.createElement('style');
    st.id = 'sk-style';
    st.textContent = `
    .sk-ov{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:100000;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:16px}
    .sk-box{background:#fff;color:#0f172a;border-radius:16px;max-width:760px;width:100%;padding:18px 18px 22px;box-shadow:0 20px 50px rgba(0,0,0,.3);text-align:right}
    .sk-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:6px}
    .sk-head h2{margin:0;font-size:1.25rem;color:#0f172a}
    .sk-x{border:0;background:#f1f5f9;border-radius:10px;width:36px;height:36px;font-size:1.1rem;cursor:pointer}
    .sk-sec{border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-top:12px}
    .sk-sec h3{margin:0 0 8px;font-size:1.05rem;color:#334155}
    .sk-note{font-size:.88rem;color:#64748b;margin-top:4px}
    .sk-row{margin-top:10px}
    .sk-row-top{display:flex;justify-content:space-between;font-size:.95rem}
    .sk-bar{height:12px;background:#e2e8f0;border-radius:6px;overflow:hidden;margin:4px 0 2px}
    .sk-bar i{display:block;height:100%;border-radius:6px}
    .sk-diag{display:flex;gap:10px;align-items:flex-start;border:1px solid #e2e8f0;border-radius:10px;padding:9px 11px;margin-top:8px;font-size:.95rem;line-height:1.55}
    .sk-dot{width:10px;height:10px;border-radius:50%;flex:0 0 auto;margin-top:7px}
    .sk-kv{display:flex;justify-content:space-between;gap:10px;padding:6px 0;border-bottom:1px dashed #e2e8f0;font-size:.95rem}
    .sk-kv:last-child{border:0}
    .sk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(22px,1fr));gap:3px;margin-top:8px}
    .sk-cell{aspect-ratio:1;border-radius:5px}
    .sk-legend{display:flex;flex-wrap:wrap;gap:6px 14px;font-size:.82rem;color:#475569;margin-top:8px}
    .sk-legend i{display:inline-block;width:11px;height:11px;border-radius:3px;margin-inline-end:4px;vertical-align:-1px}
    .sk-mx{border-collapse:separate;border-spacing:3px;width:100%;font-size:.78rem}
    .sk-mx td{height:24px;border-radius:5px;text-align:center}
    .sk-mx th{font-weight:normal;color:#64748b;white-space:nowrap}
    .sk-p{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.78rem;font-weight:700;margin-inline-end:6px}
    .sk-p-new{background:#dbeafe;color:#1d4ed8}.sk-p-near{background:#ccfbf1;color:#0f766e}.sk-p-far{background:#ede9fe;color:#6d28d9}.sk-p-err{background:#ffedd5;color:#c2410c}
    .sk-p-skill{background:#f1f5f9;color:#475569}
    .sk-btn{border:0;border-radius:10px;padding:10px 16px;font-size:.95rem;cursor:pointer;background:#0ea5e9;color:#fff;font-family:inherit}
    .sk-btn.sec{background:#f1f5f9;color:#0f172a}`;
    document.head.appendChild(st);
    styleInjected = true;
}

const toneColor = { bad: '#dc2626', warn: '#f59e0b', good: '#047857', mute: '#94a3b8' };

function skillBarsHTML(ctx) {
    return SKILLS.map(sk => {
        const st = ctx.stats[sk];
        const has = st && st.count > 0 && st.acc !== null;
        const pct = has ? Math.round(st.acc * 100) : 0;
        const color = !has ? '#cbd5e1' : !st.enough ? '#94a3b8' : st.acc < THRESHOLDS.weakAcc ? '#dc2626' : st.acc >= THRESHOLDS.strongAcc ? '#047857' : '#f59e0b';
        const hint = !has ? L('لا بيانات', 'No data')
            : L(`${st.count} سؤالاً`, `${st.count} questions`) + (st.enough ? '' : L(' — غير كافٍ للحكم', ' — not enough to judge'));
        const extra = sk === 'fluency' ? L(' (تُقاس في الحصة)', ' (measured in class)') : '';
        return `<div class="sk-row"><div class="sk-row-top"><span>${esc(skillLabel(sk))}${extra}</span><b style="${has && !st.enough ? 'color:#94a3b8;font-weight:normal;' : ''}">${has ? pct + '٪' : '—'}</b></div>
            <div class="sk-bar"><i style="width:${pct}%;background:${color}"></i></div><div class="sk-note" style="margin:0">${hint}</div></div>`;
    }).join('');
}

function matrixHTML(ctx) {
    const bySeg = new Map();
    ctx.events.forEach(e => {
        if (!e.segment || !e.skill) return;
        if (!bySeg.has(e.segment)) bySeg.set(e.segment, { last: 0, cells: {} });
        const g = bySeg.get(e.segment);
        g.last = Math.max(g.last, e.ts);
        const c = g.cells[e.skill] || (g.cells[e.skill] = { n: 0, s: 0 });
        c.n++; c.s += eventScore(e);
    });
    const cols = [...bySeg.entries()].sort((a, b) => b[1].last - a[1].last).slice(0, 8);
    if (!cols.length) return `<div class="sk-note">${L('لا أحداث مرتبطة بمواضع بعد.', 'No position-linked events yet.')}</div>`;
    const skills = SKILLS.filter(sk => cols.some(([, g]) => g.cells[sk]));
    const head = `<tr><th></th>${cols.map(([id]) => `<th>${esc(segLabel(id))}</th>`).join('')}</tr>`;
    const rows = skills.map(sk => `<tr><th style="text-align:right">${esc(skillLabel(sk))}</th>${cols.map(([, g]) => {
        const c = g.cells[sk];
        const bg = !c ? '#f1f5f9' : (c.s / c.n) < 0.5 ? '#dc2626' : (c.s / c.n) < 0.8 ? '#fbbf24' : '#34d399';
        return `<td style="background:${bg}"></td>`;
    }).join('')}</tr>`).join('');
    return `<div style="overflow-x:auto"><table class="sk-mx">${head}${rows}</table></div>
        <div class="sk-note">${L('عمود أحمر كله = ضعف في الموضع نفسه. صف أحمر في مواضع متفرقة = ضعف في المهارة.', 'A fully red column = the spot itself is weak. A red row across different spots = the skill is weak.')}</div>`;
}

function masteryMapHTML(ctx) {
    if (!ctx.path) return '';
    const cells = ctx.path.segments.map(seg => {
        const st = ctx.states.get(seg.id);
        const lv = st ? st.level : 'unseen';
        return `<div class="sk-cell" style="background:${LEVEL_META[lv].color}" title="${esc(segLabel(seg.id))} — ${esc(levelLabel(lv))}"></div>`;
    }).join('');
    const legend = Object.keys(LEVEL_META).map(lv => `<span><i style="background:${LEVEL_META[lv].color}"></i>${esc(levelLabel(lv))}: ${ctx.levels[lv] || 0}</span>`).join('');
    return `<div class="sk-grid">${cells}</div><div class="sk-legend">${legend}</div>`;
}

export function renderSkillProfileHTML(ctx, student) {
    const status = learningStatus(ctx);
    const diag = diagnosisLines(ctx);
    const q = ctx.quality || {};
    const qHtml = Object.keys(QUALITY).map(k => `<div class="sk-kv"><span>${esc(qualityLabel(k))}${k === 'haraka' ? ` <span class="sk-note">${L('— ضبط تلاوة/تجويد، لا يُعالَج بالواجب', '— recitation/tajweed, not fixed by homework')}</span>` : ''}</span><b>${q[k] || 0}</b></div>`).join('');
    const rangeNote = ctx.range && ctx.range.ok
        ? `<div class="sk-note">${L('نطاق الحفظ المعتمد', 'Memorization range used')}: ${esc(segLabel(ctx.path.segments[0].id))} → ${esc(segLabel(ctx.path.segments[ctx.path.segments.length - 1].id))} (${ctx.path.total} ${L('آية', 'ayahs')}, ${segCount(ctx.path.segments.length)})</div>`
        : `<div class="sk-note" style="color:#dc2626">${L('لا يوجد نطاق حفظ مسجَّل لهذا الطالب.', 'No memorization range is recorded for this student.')}</div>`;
    return `
    <div class="sk-note">${esc(status.text)}</div>${rangeNote}
    <div class="sk-sec"><h3>${L('مهارات الطالب', 'Student skills')}</h3>
        <div class="sk-note">${L('تُحسب تلقائياً من الواجبات والاختبارات الفردية وملاحظاتك. الأحدث أثقل وزناً.', 'Computed automatically from homework, individual tests and your notes. Recent answers weigh more.')}</div>
        ${skillBarsHTML(ctx)}</div>
    <div class="sk-sec"><h3>${L('التشخيص التلقائي', 'Automatic diagnosis')}</h3>
        ${diag.length ? diag.map(d => `<div class="sk-diag"><i class="sk-dot" style="background:${toneColor[d.tone]}"></i><div>${esc(d.text)}</div></div>`).join('')
            : `<div class="sk-note">${L('لا تشخيص بعد — تجمّع البيانات مع كل واجب.', 'No diagnosis yet — data builds up with every homework.')}</div>`}</div>
    <div class="sk-sec"><h3>${L('جودة الأداء (من تسجيلاتك)', 'Performance quality (from your notes)')}</h3>${qHtml}</div>
    <div class="sk-sec"><h3>${L('هل الخطأ في المهارة أم في الموضع؟', 'Is the problem the skill or the spot?')}</h3>${matrixHTML(ctx)}</div>
    <div class="sk-sec"><h3>${L('خريطة إتقان المقاطع', 'Segment mastery map')}</h3>${masteryMapHTML(ctx)}</div>`;
}

// نافذة كاملة لملف مهارات طالب. تعيد تحميل السياق عند "إعادة البناء".
export async function openSkillProfileModal(student) {
    ensureSkillStyles();
    const { loadContext, rebuildFromExisting } = await import('../core/trackingService.js');
    const ov = document.createElement('div');
    ov.className = 'sk-ov';
    ov.innerHTML = `<div class="sk-box" role="dialog" aria-modal="true">
        <div class="sk-head"><h2>📊 ${L('ملف المهارات', 'Skills profile')} — ${esc(student.name)}</h2><button class="sk-x" aria-label="${L('إغلاق', 'Close')}">✕</button></div>
        <div id="sk-body" class="sk-note">${L('جارٍ التحميل…', 'Loading…')}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">
            <button class="sk-btn sec" id="sk-rebuild">🔄 ${L('إعادة بناء الملف من بيانات الطالب الحالية', 'Rebuild from the student\'s existing data')}</button>
        </div></div>`;
    document.body.appendChild(ov);
    const close = () => ov.remove();
    ov.querySelector('.sk-x').addEventListener('click', close);
    ov.addEventListener('click', (e) => { if (e.target === ov) close(); });
    const body = ov.querySelector('#sk-body');
    const load = async () => {
        try {
            const ctx = await loadContext(student);
            if (!ctx) { body.textContent = L('سجل التتبّع غير متاح.', 'Tracking log is unavailable.'); return; }
            body.className = ''; body.innerHTML = renderSkillProfileHTML(ctx, student);
        } catch (e) { console.error(e); body.textContent = L('تعذر تحميل ملف المهارات.', 'Could not load the skills profile.'); }
    };
    ov.querySelector('#sk-rebuild').addEventListener('click', async (e) => {
        e.currentTarget.disabled = true;
        try {
            const st = await rebuildFromExisting(student);
            alert(L(`تم: ${st.homeworkEvents} إجابة من الواجبات السابقة، و${st.weaknessEvents} من قائمة الأخطاء.` +
                (st.gameSessionsNoDetail ? `\n(${st.gameSessionsNoDetail} جلسة لعب قديمة حُفظت بدرجتها العامة فقط ولا تدخل في المهارات؛ الجلسات الجديدة تُحفظ بتفاصيلها.)` : ''),
                `Done: ${st.homeworkEvents} answers from past homework and ${st.weaknessEvents} from the mistakes list.` +
                (st.gameSessionsNoDetail ? `\n(${st.gameSessionsNoDetail} older game sessions were saved with an overall score only and do not feed the skills; new sessions are saved in detail.)` : '')));
        } catch (err) { console.error(err); alert(L('تعذرت إعادة البناء.', 'Rebuild failed.')); }
        e.currentTarget.disabled = false;
        await load();
    });
    await load();
}
