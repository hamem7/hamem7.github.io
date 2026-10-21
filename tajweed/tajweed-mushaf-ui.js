// tajweed/tajweed-mushaf-ui.js
//
// 🌟 [2026-10-21 — مرحلة «تعرّف على مصحفك»] عرض دروس المرحلة وأسئلتها: فانوس الهامش وإطار «سجدة» ولوحة اسم السورة بصور مقتطعة من مصحف مطبوع
// (assets/tajweed/mushaf/، والكلمات تُكتب فوقها وقت العرض)، وبقية الأشكال (وردة الآية، رأس الصفحة، علامات الوقف…) من نصوص مصحف المنصة نفسها.
// كل منطق الأسئلة في engine/tajweedMushaf.js (خالص)؛ هنا العرض ومعالجة النقرات فقط. أنواع الأسئلة الثلاثة: mushaf_choice (اختيار)،
// mushaf_tap (اضغط داخل الآية)، mushaf_match (وصل). tajweed-activity.js يستدعي renderMushafQuestionHTML وhandleMushafClick.
// كل الأمثلة والأسئلة من آيات حفظ الطالب أولاً، وإلا أقرب نطاق إليها (وسم «📍 من نطاق قريب من حفظك»).
import { AppState, t } from '../core/app.js';
import { surahNameLocal } from '../core/i18n.js';
import { cleanAyahText, toQuranicSukun } from '../engine/quranEngine.js';
import { buildAyahAudioUrl } from '../database/kidsAudioDB.js';
import { getStudentAyahPool } from './tajweed-shared.js';
import * as M from '../engine/tajweedMushaf.js';

const ASSET = 'assets/tajweed/mushaf/';
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fill = (str, vars) => Object.entries(vars || {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(v), str);
const isEn = () => AppState.currentLang === 'en';

// ============================================================
// بيانات المصحف والسياق (نطاق حفظ الطالب)
// ============================================================
let allPromise = null;
export function loadMushafAll() {
    if (!allPromise) {
        allPromise = (async () => {
            const list = await AppState.quranEngine.getAyahsBySurahRange(1, 114);
            const counts = {};
            list.forEach((a) => { counts[a.surahNumber] = (counts[a.surahNumber] || 0) + 1; });
            return list.map((a, i) => ({
                i, g: a.number, sn: a.surahNumber, n: a.numberInSurah, text: cleanAyahText(a.text),
                juz: a.juz, q: a.hizbQuarter, page: a.page, sajda: a.sajda || false, sname: toQuranicSukun(a.surahName), count: counts[a.surahNumber]   // أسماء السور أيضاً بالسكون القرآني ۡ كبقية المنصة
            }));
        })().catch((e) => { allPromise = null; throw e; });
    }
    return allPromise;
}

const ctxCache = new Map();
export async function getMushafCtx(student) {
    const all = await loadMushafAll();
    const pool = student ? await getStudentAyahPool(student) : [];
    const key = student ? `${student.id}|${pool.length}|${pool.length ? pool[0].surah + ':' + pool[0].ayah : ''}` : 'none';
    let ctx = ctxCache.get(key);
    if (!ctx) { ctx = M.buildMushafCtx(all, pool); ctxCache.set(key, ctx); }
    return ctx;
}

// ============================================================
// أشكال المصحف
// ============================================================
export const rosetteHTML = (n, cls = '') => `<span class="tjw-mk-rosette ${cls}" dir="ltr">${M.AR(n)}</span>`;
const markGlyph = (code) => (code === '۩' || code === '۞' ? code : `ـ${code}ـ`);

export function lanternHTML(q) {
    const m = M.quarterMarker(q), n = m.lines.length;
    const fs = n === 3 ? (m.lines[0].length > 5 ? 9.5 : 12.5) : (m.kind === 'juz' ? 11.5 : 15);
    const box = m.full ? 'left:19.6%;right:19.8%;top:42.4%;bottom:37.3%' : 'left:19.6%;right:19.8%;top:60.2%;bottom:10.8%';
    return `<div class="tjw-mk-lantern" role="img" aria-label="${esc(m.lines.join(' '))}"><img src="${ASSET}lantern-${m.full ? 'full' : 'top'}.webp" alt="">` +
        `<div class="tjw-mk-lantern-text" dir="rtl" style="${box};font-size:${fs}cqw">${m.lines.map((l) => `<span>${l}</span>`).join('')}</div></div>`;
}
export const frameHTML = (text) => `<div class="tjw-mk-lantern" role="img" aria-label="${esc(text)}"><img src="${ASSET}lantern-frame.webp" alt=""><div class="tjw-mk-lantern-text" dir="rtl" style="left:18%;right:19%;top:17%;bottom:21%;font-size:21cqw">${text}</div></div>`;
export const bannerHTML = (sname) => `<div class="tjw-mk-banner" role="img" aria-label="${esc(sname)}"><img src="${ASSET}banner-blank.webp" alt=""><span class="tjw-mk-banner-name" dir="rtl">سُورَةُ ${esc(sname)}</span></div>`;
export const pageHeadHTML = (juz, sname) => `<div class="tjw-mk-pagehead" dir="rtl"><span>الجزء ${M.JUZ_ORDINALS_AR[juz - 1]}</span><span>سُورَةُ ${esc(sname)}</span></div>`;

// اسم سورة بحسب اللغة: العربية كما هي، وفي الإنجليزية «الاسم العربي — English»
const surahDisplay = (arName, sn) => (isEn() ? `${esc(arName)} — ${esc(surahNameLocal(sn || arName))}` : esc(arName));

function ayahMediaHTML(media) {
    const parts = media.parts.map((p) => (p.t === 'rosette' ? ` ${rosetteHTML(p.n)} ` : esc(p.v)));
    return `<div class="tjw-activity-ayah-box tjw-mk-ayahbox"><div class="tjw-example-text tjw-mk-ar" dir="rtl">${parts.join('')}</div></div>`;
}
function mediaHTML(media) {
    if (!media) return '';
    switch (media.kind) {
        case 'glyph': return `<div class="tjw-mk-signglyph" dir="rtl">${markGlyph(media.code)}</div>`;
        case 'lantern': return `<div class="tjw-mk-media-lantern">${lanternHTML(media.q)}</div>`;
        case 'frame': return `<div class="tjw-mk-media-lantern">${frameHTML(media.text)}</div>`;
        case 'pagehead': return `<div class="tjw-mk-pageheadbox">${pageHeadHTML(media.juz, media.sname)}<small>${esc(fill(t('tjw_mu_juz_caption'), { n: media.juz }))}</small></div>`;
        case 'banner': return `<div class="tjw-mk-bannerbox">${bannerHTML(media.sname)}</div>`;
        case 'ayah': return ayahMediaHTML(media);
        case 'rosette': return `<div class="tjw-mk-bigrosette">${rosetteHTML(media.n, 'is-big')}</div>`;
        case 'word': return `<div class="tjw-mk-wordbox tjw-mk-ar" dir="rtl">${esc(media.text)}</div>`;
        case 'sajda_icon': return `<div class="tjw-mk-imgbox"><img src="${ASSET}sajda-mark.webp" alt=""></div>`;
        case 'overline': return `<div class="tjw-mk-imgbox"><img src="${ASSET}sajda-overline.webp" alt="" class="is-wide"></div>`;
        default: return '';
    }
}

// نصوص الأسئلة: قيم المتغيرات التي تبدأ بـ tjw_ مفاتيح ترجمة، واسم السورة يُعرَّب بحسب اللغة
function stemOf(q) {
    const vars = {};
    Object.entries(q.stemVars || {}).forEach(([k, v]) => {
        vars[k] = typeof v === 'string' && v.startsWith('tjw_') ? t(v) : (k === 'surah' && isEn() ? surahNameLocal(v) : v);
    });
    return fill(t(q.stemKey), vars);
}
const nearTag = (q) => (q.near ? `<div class="tjw-hifz-tag tjw-mk-near">${t('tjw_mu_near')}</div>` : '');

function optionLabelHTML(o) {
    if (o.glyph !== undefined) return `<span class="tjw-mk-optglyph" dir="rtl">${markGlyph(o.glyph)}</span>`;
    if (o.labelKey) return esc(fill(t(o.labelKey), o.labelVars));
    if (o.surah) return surahDisplay(o.label, o.surah);
    return esc(o.label);
}
function optionLabelText(o) {
    if (o.glyph !== undefined) return markGlyph(o.glyph);
    if (o.labelKey) return fill(t(o.labelKey), o.labelVars);
    if (o.surah) return isEn() ? `${o.label} — ${surahNameLocal(o.surah)}` : o.label;
    return String(o.label);
}

// ============================================================
// عرض السؤال
// ============================================================
const matchStates = new WeakMap();
const matchState = (q) => {
    let s = matchStates.get(q);
    if (!s) {
        const order = q.pairs.map((_, i) => i);
        for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
        s = { sel: null, matched: new Set(), wrong: 0, flash: null, order };
        matchStates.set(q, s);
    }
    return s;
};

function tapBodyHTML(q) {
    if (q.layout === 'ayah_numbers') {
        const parts = q.segments.map((s, i) => (s.rosette
            ? `<button type="button" class="tjw-mk-seg tjw-mk-segnum" data-mk-seg="${i}">${M.AR(s.n)}</button>`
            : `<span class="tjw-mk-segtext">${esc(s.t)}</span>`));
        return `<div class="tjw-activity-ayah-box tjw-mk-ayahbox"><div class="tjw-example-text tjw-mk-ar tjw-mk-flow" dir="rtl">${parts.join(' ')}</div></div>`;
    }
    if (q.layout === 'lines') {
        const lines = q.segments.map((s, i) => `<button type="button" class="tjw-mk-seg tjw-mk-segline" data-mk-seg="${i}" dir="rtl"><span class="tjw-mk-ar">${esc(s.t)}</span>${s.rosetteN ? ' ' + rosetteHTML(s.rosetteN) : ''}</button>`);
        return `<div class="tjw-mk-lines">${lines.join('')}</div>`;
    }
    const words = q.segments.map((s, i) => `<button type="button" class="tjw-mk-seg ${s.mark ? 'is-mark' : ''}" data-mk-seg="${i}" dir="rtl">${s.mark ? markGlyph(s.t) : esc(s.t)}</button>`);   // علامة الوقف وحدها تُرسم على حرف أساس (تطويل) فلا تطفو خارج الزر
    return `<div class="tjw-activity-ayah-box tjw-mk-ayahbox"><div class="tjw-example-text tjw-mk-ar tjw-mk-flow" dir="rtl">${words.join(' ')}</div></div>`;
}
function matchBodyHTML(q) {
    const st = matchState(q);
    const rightOrder = st.order.map((i) => q.pairs[i]);
    const left = q.pairs.map((p) => `<button type="button" class="tjw-answer-btn tjw-mk-matchbtn ${st.matched.has(p.id) ? 'tjw-link-matched' : ''} ${st.sel === p.id ? 'tjw-link-selected' : ''}" data-mk-l="${p.id}" ${st.matched.has(p.id) ? 'disabled' : ''}><span class="tjw-mk-optglyph" dir="rtl">${markGlyph(p.glyph)}</span></button>`).join('');
    const right = rightOrder.map((p) => `<button type="button" class="tjw-answer-btn tjw-mk-matchbtn ${st.matched.has(p.id) ? 'tjw-link-matched' : ''} ${st.flash === p.id ? 'tjw-answer-wrong' : ''}" data-mk-r="${p.id}" ${st.matched.has(p.id) ? 'disabled' : ''}>${esc(t(p.labelKey))}</button>`).join('');
    return `<div class="tjw-link-columns tjw-mk-match"><div class="tjw-link-col">${left}</div><div class="tjw-link-col">${right}</div></div>`;
}

export function renderMushafQuestionHTML(q) {
    let body = '';
    if (q.type === 'mushaf_choice') {
        const grid = q.options.map((o) => `<button type="button" class="tjw-answer-btn ${o.glyph !== undefined ? 'tjw-mk-glyphopt' : ''}" data-mk-opt="${esc(o.id)}">${optionLabelHTML(o)}</button>`).join('');
        body = `<div class="tjw-answer-grid">${grid}</div>`;
    } else if (q.type === 'mushaf_tap') body = tapBodyHTML(q);
    else if (q.type === 'mushaf_match') body = matchBodyHTML(q);
    return `<div class="tjw-activity-card tjw-mk-card">
        <p class="tjw-activity-prompt">${esc(stemOf(q))}</p>
        ${nearTag(q)}
        ${mediaHTML(q.media)}
        ${body}
    </div>`;
}

// ============================================================
// معالجة النقرات والتغذية الراجعة
// ============================================================
function feedbackHTML(q, ok) {
    const ex = q.explain || {};
    const rows = [];
    (ex.signs || []).forEach((id) => rows.push(`<div><span class="tjw-feedback-rule">${esc(t(M.signNameKey(id)))}</span> — ${esc(t(M.signDefKey(id)))}</div>`));
    if (ex.extraKey) rows.push(`<div>${esc(t(ex.extraKey))}</div>`);
    return `<div class="tjw-feedback-title">${t(ok ? 'tjw_feedback_correct' : 'tjw_feedback_wrong')}</div>${rows.join('')}`;
}
const segLabel = (s) => (s.rosette ? M.AR(s.n) : s.t);

// يُرجع null إن لم تكن النقرة لهذا السؤال؛ {handled} أثناء وصلٍ لم يكتمل؛ {handled, done, correct, detail, feedbackHTML} عند الإجابة
export function handleMushafClick(e, q, { exam = false } = {}) {
    if (!q) return null;
    if (q.type === 'mushaf_choice') {
        const b = e.target.closest('[data-mk-opt]');
        if (!b) return null;
        const picked = q.options.find((o) => String(o.id) === b.dataset.mkOpt);
        if (!picked) return null;
        const right = q.options.find((o) => o.ok);
        if (exam) b.classList.add('tjw-answer-picked');
        else document.querySelectorAll('[data-mk-opt]').forEach((btn) => {
            btn.disabled = true;
            if (btn.dataset.mkOpt === String(right.id)) btn.classList.add('tjw-answer-correct');
            else if (btn === b) btn.classList.add('tjw-answer-wrong');
        });
        return { handled: true, done: true, correct: !!picked.ok, detail: { correctLabel: optionLabelText(right), yourLabel: optionLabelText(picked) }, feedbackHTML: feedbackHTML(q, !!picked.ok) };
    }
    if (q.type === 'mushaf_tap') {
        const b = e.target.closest('[data-mk-seg]');
        if (!b) return null;
        const i = Number(b.dataset.mkSeg), seg = q.segments[i];
        if (!seg) return null;
        const okSegs = q.segments.filter((s) => s.ok);
        if (exam) b.classList.add('tjw-answer-picked');
        else document.querySelectorAll('[data-mk-seg]').forEach((btn) => {
            btn.disabled = true;
            if (q.segments[Number(btn.dataset.mkSeg)].ok) btn.classList.add('tjw-answer-correct');
            else if (btn === b) btn.classList.add('tjw-answer-wrong');
        });
        return { handled: true, done: true, correct: !!seg.ok, detail: { correctLabel: okSegs.map(segLabel).join(' / '), yourLabel: segLabel(seg) }, feedbackHTML: feedbackHTML(q, !!seg.ok) };
    }
    if (q.type === 'mushaf_match') {
        const st = matchState(q);
        const l = e.target.closest('[data-mk-l]'), r = e.target.closest('[data-mk-r]');
        if (!l && !r) return null;
        if (l) { st.sel = l.dataset.mkL; st.flash = null; return { handled: true, redraw: true }; }
        if (!st.sel) return { handled: true };
        if (st.sel === r.dataset.mkR) { st.matched.add(st.sel); st.flash = null; }
        else { st.wrong++; st.flash = r.dataset.mkR; }
        st.sel = null;
        if (st.matched.size >= q.pairs.length) {
            const score = Math.max(0, 100 - st.wrong * 15), correct = score >= 70;
            return { handled: true, done: true, redraw: true, correct, detail: { correctLabel: q.pairs.map((p) => `${markGlyph(p.glyph)} ${t(p.labelKey)}`).join(' · '), yourLabel: fill(t('tjw_mu_match_errors'), { n: st.wrong }) }, feedbackHTML: feedbackHTML(q, correct) };
        }
        return { handled: true, redraw: true };
    }
    return null;
}

// ============================================================
// الدرس: يُركَّب داخل شاشة الحكم (tajweed-map.js) بدل بطاقات الحروف والأمثلة
// ============================================================
const SHORT = { ayah_number: 'an', surah_head: 'sh', juz_hizb: 'jh', waqf: 'wq', silent_sukun: 'sk', madd_letters: 'md', sin_saad: 'sn', sajda: 'sj' };
const markTokens = (a, signId) => M.ayahTokens(a).map((tok) => (M.tokenHasSign(signId, tok) ? `<mark class="tjw-highlight">${esc(tok)}</mark>` : esc(tok))).join(' ');
const audioBtn = (a) => (a && a.g ? `<button type="button" class="tjw-listen-btn" data-tjw-audio="${buildAyahAudioUrl(a.g)}">🔊 ${t('tjw_listen_btn')}</button>` : '');
const refLine = (a, near) => `<div class="tjw-example-ref">${surahDisplay(a.sname, a.sn)} — ${t('tjw_ayah_word')} ${a.n}</div>${near ? `<div class="tjw-hifz-tag tjw-mk-near">${t('tjw_mu_near')}</div>` : ''}`;

function signCardHTML(ctx, sign) {
    let ex;
    if (sign.id === 'ayah_end') {
        const pr = M.pickAyah(ctx, (a) => a.text.length > 20 && a.n >= 1, { maxLen: 90 });
        ex = pr && { a: pr.a, near: pr.near, html: `${esc(pr.a.text)} ${rosetteHTML(pr.a.n)}` };
    } else {
        const pr = M.pickSignAyah(ctx, sign);
        ex = pr && { a: pr.a, near: pr.near, html: `${markTokens(pr.a, sign.id)} ${rosetteHTML(pr.a.n)}` };
    }
    const glyph = sign.id === 'ayah_end' ? `<img src="${ASSET}ayah-number.webp" alt="" class="tjw-mk-signimg">` : `<span dir="rtl">${markGlyph(sign.code)}</span>`;
    return `<div class="tjw-mk-signcard">
        <div class="tjw-mk-signglyph is-card">${glyph}</div>
        <h4>${esc(t(M.signNameKey(sign.id)))}</h4>
        <p>${esc(t(M.signDefKey(sign.id)))}</p>
        ${ex ? `<div class="tjw-mk-signex tjw-mk-ar" dir="rtl">${ex.html}</div>${refLine(ex.a, ex.near)}${audioBtn(ex.a)}` : ''}
    </div>`;
}

export async function renderMushafLessonHTML(rule, student) {
    const lesson = M.lessonOfRule(rule);
    if (!lesson) return '';
    const ctx = await getMushafCtx(student);
    const s = SHORT[lesson];
    const intro = `<p class="tjw-mk-intro">${esc(t(`tjw_mul_${s}_intro`))}</p>`;
    const tip = `<div class="tjw-mk-tip">💡 ${esc(t(`tjw_mul_${s}_tip`))}</div>`;
    let visual = '';

    if (lesson === 'ayah_number') {
        const pr = M.pairOfAyahs(ctx);
        if (pr) {
            const { a, b } = pr;
            visual = `<div class="tjw-mk-cmp"><div class="is-wrong"><h4>❌ ${esc(t('tjw_mul_an_wrong'))}</h4><div class="tjw-mk-ar" dir="rtl">${rosetteHTML(a.n)} ${esc(a.text)} ${rosetteHTML(b.n)} ${esc(b.text)}</div></div>
                <div class="is-right"><h4>✅ ${esc(t('tjw_mul_an_right'))}</h4><div class="tjw-mk-ar" dir="rtl">${esc(a.text)} ${rosetteHTML(a.n)} ${esc(b.text)} ${rosetteHTML(b.n)}</div></div></div>
                ${refLine(a, pr.near)}${audioBtn(a)}`;
        }
    } else if (lesson === 'surah_head') {
        const pr = M.pickAyah(ctx, (a) => a.n === 1 && a.sn !== 1 && a.sn !== 9, { maxLen: 90 });
        if (pr) {
            const bsm = ctx.byKey.get('1:1');
            visual = `<div class="tjw-mk-figs"><figure><div class="tjw-mk-bannerbox">${bannerHTML(pr.a.sname)}</div><figcaption>${esc(t('tjw_mul_sh_banner_cap'))}</figcaption></figure>
                <div class="tjw-activity-ayah-box tjw-mk-ayahbox"><div class="tjw-example-text tjw-mk-ar" dir="rtl"><div class="tjw-mk-bsm">${bsm ? esc(bsm.text) : ''}</div>${esc(pr.a.text)} ${rosetteHTML(pr.a.n)}</div></div>
                ${refLine(pr.a, pr.near)}${audioBtn(pr.a)}
                <figure><div class="tjw-mk-pageheadbox">${pageHeadHTML(pr.a.juz, pr.a.sname)}<small>${esc(fill(t('tjw_mu_juz_caption'), { n: pr.a.juz }))}</small></div><figcaption>${esc(t('tjw_mul_sh_page_cap'))}</figcaption></figure></div>
                <p class="tjw-mk-note">${esc(t('tjw_mu_tawba_note'))}</p>`;
        }
    } else if (lesson === 'juz_hizb') {
        const gallery = [[2, 'rub'], [3, 'nisf'], [4, 'thalatha'], [5, 'hizb'], [9, 'juz']].map(([q, k]) => `<figure>${lanternHTML(q)}<figcaption><b>${esc(t(M.markerKindKey(k)))}</b></figcaption></figure>`).join('');
        const pq = M.pickQuarterStart(ctx);
        let page = '';
        if (pq) page = `<div class="tjw-mk-pagedemo"><div class="tjw-mk-pagedemo-margin">${lanternHTML(pq.a.q)}</div><div class="tjw-mk-pagedemo-body">${pageHeadHTML(pq.a.juz, pq.a.sname)}<div class="tjw-mk-ar tjw-example-text" dir="rtl">${esc(pq.a.text)} ${rosetteHTML(pq.a.n)}</div>${refLine(pq.a, pq.near)}${audioBtn(pq.a)}</div></div>
            <p class="tjw-mk-note">${esc(t('tjw_mul_jh_margin_cap'))}</p>`;
        visual = `<div class="tjw-mk-gallery">${gallery}</div><div class="tjw-mk-counts">${esc(t('tjw_mul_jh_counts'))}</div>${page}`;
    } else {
        const signs = M.signsOfLesson(lesson);
        const cards = signs.map((sg) => signCardHTML(ctx, sg)).join('');
        let extra = '';
        if (lesson === 'sajda') {
            extra = `<div class="tjw-mk-gallery"><figure>${frameHTML('سجدة')}<figcaption><b>${esc(t('tjw_mul_sj_c1'))}</b><br>${esc(t('tjw_mul_sj_c1d'))}</figcaption></figure>
                <figure><img src="${ASSET}sajda-mark.webp" alt="" class="tjw-mk-signimg"><figcaption><b>${esc(t('tjw_mul_sj_c2'))}</b><br>${esc(t('tjw_mul_sj_c2d'))}</figcaption></figure>
                <figure><img src="${ASSET}sajda-overline.webp" alt="" class="tjw-mk-signimg is-wide"><figcaption><b>${esc(t('tjw_mul_sj_c3'))}</b><br>${esc(t('tjw_mul_sj_c3d'))}</figcaption></figure></div>`;
        }
        visual = `${extra}<h4 class="tjw-mk-sub">${esc(t('tjw_mu_lesson_signs'))}</h4><div class="tjw-mk-signgrid">${cards}</div>`;
    }
    return `<section class="tjw-mk-lesson">${intro}${visual}${tip}</section>`;
}
