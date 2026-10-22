// engine/tajweedMushaf.js
//
// 🌟 [2026-10-21 — مرحلة «تعرّف على مصحفك»، المرحلة الأولى قبل القلقلة] محرك بيانات وأسئلة خالص (بلا DOM ولا قاعدة بيانات) لما في المصحف
// خلاف الآيات نفسها: رقم الآية، لوحة اسم السورة ورأس الصفحة، فانوس الجزء والحزب والربع، علامات الوقف، السكون والحروف الصامتة،
// المدّ والحروف الصغيرة، السين مكان الصاد، علامات السجدة. تعريفات العلامات مأخوذة من «علامات الوقف ومصطلحات الضبط» في المصحف المطبوع.
//
// قاعدة أساسية (بطلب المعلم): كل مثال وسؤال يُؤخذ من آيات حفظ الطالب أولاً؛ فإن لم توجد العلامة في محفوظه تُؤخذ من أقرب نطاق إلى حفظه
// في ترتيب المصحف، وتُوسَم الأسئلة بـ near=true ليعرف الطالب أن المثال خارج حفظه. لا نصّ قرآني مكتوب هنا: كل نص يأتي من ctx.all (مصحف المنصة).
//
// السياق ctx يُبنى بـ buildMushafCtx(all, poolRefs): all = كل الآيات [{i, sn, n, text, juz, q (hizbQuarter), page, sajda, sname, count}]،
// وpoolRefs = آيات حفظ الطالب [{surah, ayah}]. كل مولّد يرجع سؤالاً أو null.

export const MUSHAF_STAGE_ID = 'know_mushaf';
export const MUSHAF_LESSONS = ['ayah_number', 'juz_hizb', 'waqf', 'silent_sukun', 'madd_letters', 'sin_saad', 'sajda'];
export const MUSHAF_RULE_PREFIX = 'mushaf_';
export const lessonRuleId = (lesson) => MUSHAF_RULE_PREFIX + lesson;
export const lessonOfRule = (rule) => (rule && rule.mushaf && rule.mushaf.lesson) || null;

export const AR = (n) => String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

export const MUSHAF_FACTS = { juz: 30, hizb: 60, quarter: 240, hizbPerJuz: 2, quartersPerHizb: 4, quartersPerJuz: 8, sajda: 15 };

// ============================================================
// العلامات (مرتبة بدروسها). code = الرمز كما يظهر في نص المنصة (السكون ۡ بعد toQuranicSukun). standalone = تأتي كلمةً مستقلة بين مسافتين.
// مفاتيح الترجمة: tjw_mk_<id>_name / tjw_mk_<id>_def (تعريف المصحف المطبوع). abbr = ما يُكتب في المصحف حرفاً (م، لا، ج…).
// ============================================================
export const MUSHAF_SIGNS = [
    { id: 'ayah_end', code: '', lesson: 'ayah_number', kind: 'rosette' },
    { id: 'rub_mark', code: '۞', lesson: 'juz_hizb', standalone: true },
    { id: 'waqf_lazim', code: 'ۘ', lesson: 'waqf', standalone: true, abbr: 'م' },
    { id: 'waqf_jaiz', code: 'ۚ', lesson: 'waqf', standalone: true, abbr: 'ج' },
    { id: 'waqf_sala', code: 'ۖ', lesson: 'waqf', standalone: true, abbr: 'صلى' },
    { id: 'waqf_qala', code: 'ۗ', lesson: 'waqf', standalone: true, abbr: 'قلى' },
    { id: 'waqf_muanaqa', code: 'ۛ', lesson: 'waqf', standalone: true, abbr: '∴' },
    { id: 'saktah', code: 'ۜ', lesson: 'waqf', standalone: true, abbr: 'س', refs: [[83, 14], [75, 27], [36, 52], [18, 1], [69, 28]] },
    { id: 'zero_round', code: '۟', demo: 'ا۟', lesson: 'silent_sukun' },
    { id: 'zero_rect', code: '۠', demo: 'ا۠', lesson: 'silent_sukun' },
    { id: 'sukun', code: 'ۡ', demo: 'مۡ', lesson: 'silent_sukun' },
    { id: 'shadda', code: 'ّ', demo: 'لَّ', lesson: 'silent_sukun' },
    { id: 'small_meem', code: 'ۢ', demo: 'نۢ', lesson: 'silent_sukun' },
    { id: 'madd', code: '\u06E4', demo: 'حم\u06E4', lesson: 'madd_letters' },   // المدّة في نص المصحف المصحَّح U+06E4 (كانت U+0653)
    { id: 'dagger_alif', code: 'ٰ', demo: 'ذَٰلِكَ', lesson: 'madd_letters' },
    { id: 'small_waw', code: 'ۥ', demo: 'لَهُۥ', lesson: 'madd_letters' },
    { id: 'small_yaa', code: 'ۦ', demo: 'بِهِۦ', lesson: 'madd_letters' },
    { id: 'sin_over', code: 'ۜ', demo: 'صۜ', lesson: 'sin_saad', refs: [[2, 245], [7, 69]] },
    { id: 'sin_under', code: 'ۣ', demo: 'صۣ', lesson: 'sin_saad', refs: [[52, 37]] },
    { id: 'sajda_sign', code: '۩', lesson: 'sajda', standalone: true }
];
// الرسم الذي يراه الطالب للعلامة: العلامات التي تُكتب على حرف (السكون، الشدّة، الألف الخنجرية…) تُعرض على حرف حامل داخل الكلمة كما تُرسم في المصحف،
// لأن العلامة وحدها بلا حرف تُرسم في الخط شكلاً مختلفاً (شرطة أو نقطة) لا يشبه المصحف. العلامات المستقلة (الوقف، ۞، ۩) تُعرض كما هي.
export const signShow = (sign) => sign.demo || sign.code;
const showOfCode = (code) => { const s = MUSHAF_SIGNS.find((x) => x.code === code && x.demo && x.id !== 'sin_over'); return s ? s.demo : code; };
export const signById = (id) => MUSHAF_SIGNS.find((s) => s.id === id) || null;
export const signsOfLesson = (lesson) => MUSHAF_SIGNS.filter((s) => s.lesson === lesson);
export const signNameKey = (id) => `tjw_mk_${id}_name`;
export const signDefKey = (id) => `tjw_mk_${id}_def`;
// علامتان بشكل واحد (س): لا يُسأل عن شكلها منفردةً بلا سياق
const AMBIGUOUS_GLYPH = new Set(['saktah', 'sin_over']);

// ============================================================
// فانوس الهامش ورأس الصفحة (من رقم الربع 1..240)
// ============================================================
// كل 8 أرباع جزء، وكل 4 أرباع حزب: بداية الجزء والحزب فانوس بقبّتين، والربع والنصف وثلاثة الأرباع بقبّة علوية فقط (من صور المصحف).
// lines = ما يُكتب داخل الإطار (عربي دائماً كما في المطبوع، بأرقام هندية).
export function quarterMarker(q) {
    const hizb = Math.floor((q - 1) / 4) + 1, r = (q - 1) % 4, juz = Math.floor((q - 1) / 8) + 1;
    if (q % 8 === 1) return { kind: 'juz', full: true, juz, hizb, lines: ['الجزء ' + AR(juz), 'الحزب ' + AR(hizb)] };
    if (r === 0) return { kind: 'hizb', full: true, juz, hizb, lines: ['الحزب', AR(hizb)] };
    if (r === 1) return { kind: 'rub', full: false, juz, hizb, lines: ['ربع', 'الحزب', AR(hizb)] };
    if (r === 2) return { kind: 'nisf', full: false, juz, hizb, lines: ['نصف', 'الحزب', AR(hizb)] };
    return { kind: 'thalatha', full: false, juz, hizb, lines: ['ثلاثة أرباع', 'الحزب', AR(hizb)] };
}
export const MARKER_KINDS = ['rub', 'nisf', 'thalatha', 'hizb', 'juz'];
export const markerKindKey = (kind) => `tjw_mo_marker_${kind}`;

export const JUZ_ORDINALS_AR = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
    'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر', 'الثامن عشر', 'التاسع عشر', 'العشرون',
    'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون', 'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون',
    'الثامن والعشرون', 'التاسع والعشرون', 'الثلاثون'];

// ============================================================
// السياق ونطاق الحفظ
// ============================================================
export function buildMushafCtx(all, poolRefs = [], rng = Math.random) {
    const byKey = new Map(all.map((a) => [a.sn + ':' + a.n, a]));
    const pool = (poolRefs || []).map((r) => byKey.get(r.surah + ':' + r.ayah)).filter(Boolean);
    const poolSet = new Set(pool.map((a) => a.sn + ':' + a.n));
    const idx = pool.map((a) => a.i).sort((x, y) => x - y);
    const dist = (a) => {
        if (!idx.length) return 0;
        let lo = 0, hi = idx.length - 1;
        while (lo < hi) { const m = (lo + hi) >> 1; if (idx[m] < a.i) lo = m + 1; else hi = m; }
        const d1 = Math.abs(idx[lo] - a.i), d2 = lo > 0 ? Math.abs(idx[lo - 1] - a.i) : Infinity;
        return Math.min(d1, d2);
    };
    return {
        all, byKey, pool, poolSet, rng, hasPool: pool.length > 0, dist,
        isMine: (a) => poolSet.has(a.sn + ':' + a.n),
        nearest: (arr, k = 20) => arr.slice().sort((x, y) => dist(x) - dist(y) || x.text.length - y.text.length).slice(0, k)
    };
}

function shuffle(arr, rng = Math.random) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}
const sample = (arr, n, rng) => shuffle(arr, rng).slice(0, n);
const pickOne = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length)];

// المرشَّحون لشرط ما: من محفوظ الطالب إن وُجد، وإلا الأقرب إلى حفظه (near=true). بلا نطاق حفظ أصلاً لا تُوسَم near.
export function candidates(ctx, filter, { k = 20 } = {}) {
    const mine = ctx.pool.filter(filter);
    if (mine.length) return { list: mine, near: false };
    const list = ctx.nearest(ctx.all.filter(filter), k);
    return { list, near: ctx.hasPool && list.length > 0 };
}
export function pickAyah(ctx, filter, { maxLen = 150 } = {}) {
    const c = candidates(ctx, filter);
    if (!c.list.length) return null;
    const short = c.list.filter((a) => a.text.length <= maxLen);
    return { a: pickOne(short.length ? short : c.list, ctx.rng), near: c.near };
}

// ============================================================
// كلمات الآية وعلاماتها
// ============================================================
export const ayahTokens = (a) => String(a.text).split(' ').filter(Boolean);
export function tokenHasSign(signId, tok) {
    const s = signById(signId);
    if (!s || !s.code) return false;
    if (signId === 'saktah') return tok === 'ۜ';
    if (signId === 'sin_over') return tok.length > 1 && tok.includes('ۜ');
    if (s.standalone) return tok === s.code;
    return tok.includes(s.code);
}
export const ayahHasSign = (a, signId) => ayahTokens(a).some((tok) => tokenHasSign(signId, tok));
const WAQF_IDS = ['waqf_lazim', 'waqf_jaiz', 'waqf_sala', 'waqf_qala', 'waqf_muanaqa'];
export const isWaqfToken = (tok) => WAQF_IDS.some((id) => tokenHasSign(id, tok));
const refAyahs = (ctx, sign) => (sign.refs || []).map(([sn, n]) => ctx.byKey.get(sn + ':' + n)).filter(Boolean);
const ayahsWithSign = (ctx, sign) => (sign.refs ? refAyahs(ctx, sign) : ctx.all.filter((a) => ayahHasSign(a, sign.id)));

export function pickSignAyah(ctx, sign) {
    const base = ayahsWithSign(ctx, sign);
    const mine = base.filter((a) => ctx.isMine(a));
    // من المحفوظ إن وُجد؛ وإلا من أقرب ستة مواضع إلى حفظ الطالب، نفضّل القصير منها (الآية الطويلة لا تصلح بطاقة مثال)
    const list = mine.length ? mine : ctx.nearest(base, 6);
    if (!list.length) return null;
    const short = list.filter((a) => a.text.length <= 150);
    const a = short.length ? pickOne(mine.length ? short : short.slice(0, 3), ctx.rng) : list.slice().sort((x, y) => x.text.length - y.text.length)[0];
    return { a, near: !mine.length && ctx.hasPool };
}

// ============================================================
// بناة الأسئلة العامة
// ============================================================
const keyOfAyah = (a) => a.sn + ':' + a.n;
function opt(id, ok, extra) { return { id: String(id), ok: !!ok, ...extra }; }
function choice({ ruleId, kind, key, stemKey, stemVars, media, options, explain, near }, ctx) {
    if (!options || options.length < 2 || !options.some((o) => o.ok)) return null;
    return { type: 'mushaf_choice', ruleId, kind, key, stemKey, stemVars: stemVars || {}, media: media || null, options: shuffle(options, ctx.rng), explain: explain || null, near: !!near };
}
function tap({ ruleId, kind, key, stemKey, stemVars, segments, layout, media, explain, near }) {
    if (!segments || segments.length < 3 || !segments.some((s) => s.ok) || segments.filter((s) => !s.ok).length < 2) return null;
    return { type: 'mushaf_tap', ruleId, kind, key, stemKey, stemVars: stemVars || {}, segments, layout: layout || 'words', media: media || null, explain: explain || null, near: !!near };
}
const ayahMedia = (a, extra) => ({ kind: 'ayah', parts: [{ t: 'text', v: a.text }, { t: 'rosette', n: a.n }], sname: a.sname, ...(extra || {}) });

// اختيار أسماء علامات (خيارات): الصحيح + مشتتات من الدرس نفسه ثم من بقية العلامات ذات الشكل المميَّز
function signOptions(signId, { pool = null, n = 4, field = 'name' } = {}) {
    const me = signById(signId);
    const fromLesson = signsOfLesson(me.lesson).filter((s) => s.id !== signId && s.code);
    const others = MUSHAF_SIGNS.filter((s) => s.id !== signId && s.code && s.lesson !== me.lesson && !AMBIGUOUS_GLYPH.has(s.id));
    const pickPool = pool || [...shuffle(fromLesson), ...shuffle(others)];
    const keyFn = field === 'def' ? signDefKey : signNameKey;
    const seen = new Set([keyFn(signId)]);
    const out = [opt(signId, true, { labelKey: keyFn(signId) })];
    for (const s of pickPool) {
        if (out.length >= n) break;
        if (s.id === signId || seen.has(keyFn(s.id))) continue;
        seen.add(keyFn(s.id));
        out.push(opt(s.id, false, { labelKey: keyFn(s.id) }));
    }
    return out;
}
const glyphMedia = (sign) => ({ kind: 'glyph', code: signShow(sign), abbr: sign.abbr || '' });
const explainSign = (...ids) => ({ signs: ids });

// ============================================================
// مولّدات الدروس
// ============================================================
// --- ١) رقم الآية ---
function g_an_place(ctx, R) {
    const p = pickAyah(ctx, (a) => a.n >= 1 && a.text.length > 20, { maxLen: 110 });
    if (!p) return null;
    return choice({ ruleId: R, kind: 'an_place', key: 'an_place:' + keyOfAyah(p.a), stemKey: 'tjw_mq_an_place', media: ayahMedia(p.a), near: p.near,
        options: [opt('end', true, { labelKey: 'tjw_mo_end_of_ayah' }), opt('start', false, { labelKey: 'tjw_mo_start_of_ayah' })], explain: explainSign('ayah_end') }, ctx);
}
function g_an_meaning(ctx, R) {
    const p = pickAyah(ctx, (a) => a.text.length > 20, { maxLen: 110 });
    if (!p) return null;
    return choice({ ruleId: R, kind: 'an_meaning', key: 'an_meaning', stemKey: 'tjw_mq_an_meaning', media: { kind: 'rosette', n: p.a.n }, near: false,
        options: [opt('end', true, { labelKey: 'tjw_mo_ayah_end_num' }), opt('surah', false, { labelKey: 'tjw_mo_surah_start' }), opt('waqf', false, { labelKey: 'tjw_mo_stop_sign' }), opt('sajda', false, { labelKey: 'tjw_mo_sajda_place' })], explain: explainSign('ayah_end') }, ctx);
}
export function pairOfAyahs(ctx) {
    const c = candidates(ctx, (a) => a.n >= 1 && a.text.length > 15 && a.text.length < 90 && ctx.byKey.get(a.sn + ':' + (a.n + 1)) && ctx.byKey.get(a.sn + ':' + (a.n + 1)).text.length < 110, { k: 40 });
    if (!c.list.length) return null;
    const a = pickOne(c.list, ctx.rng);
    return { a, b: ctx.byKey.get(a.sn + ':' + (a.n + 1)), near: c.near };
}
function g_an_tap(ctx, R) {
    const pr = pairOfAyahs(ctx);
    if (!pr) return null;
    const { a, b, near } = pr;
    const segments = [{ rosette: true, n: a.n, ok: false, trap: 'start' }, { t: a.text, ok: false, text: true }, { rosette: true, n: a.n, ok: true }, { t: b.text, ok: false, text: true }, { rosette: true, n: b.n, ok: false, trap: 'next' }];
    // اضغط على رقم الآية الأولى: الصحيح الرقم الذي يلي نهايتها، والفخاخ: رقم قبلها ورقم الآية التالية
    return { type: 'mushaf_tap', ruleId: R, kind: 'an_tap', key: 'an_tap:' + keyOfAyah(a), stemKey: 'tjw_mq_an_tap', stemVars: {}, segments, layout: 'ayah_numbers', media: null, explain: explainSign('ayah_end'), near: !!near };
}
function g_an_which(ctx, R) {
    const pr = pairOfAyahs(ctx);
    if (!pr) return null;
    const { a, b, near } = pr;
    const words = ayahTokens(a), last = words[words.length - 1];
    const nums = new Set([a.n, b.n]);
    if (a.n > 1) nums.add(a.n - 1);
    while (nums.size < 4) nums.add(a.n + 2 + Math.floor(ctx.rng() * 3));
    return choice({ ruleId: R, kind: 'an_which', key: 'an_which:' + keyOfAyah(a), stemKey: 'tjw_mq_an_which', stemVars: { word: last }, near,
        media: { kind: 'ayah', parts: [{ t: 'text', v: a.text }, { t: 'rosette', n: a.n }, { t: 'text', v: b.text }, { t: 'rosette', n: b.n }], sname: a.sname },
        options: [...nums].map((n) => opt(n, n === a.n, { label: AR(n) })), explain: explainSign('ayah_end') }, ctx);
}

// --- ٢) اسم السورة ورأس الصفحة ---
function surahNameOptions(ctx, a, n = 4) {
    const want = a.sn, names = [];
    const pool = ctx.hasPool ? ctx.pool : ctx.all;
    const bySurah = new Map();
    pool.forEach((x) => { if (!bySurah.has(x.sn)) bySurah.set(x.sn, x); });
    ctx.all.forEach((x) => { if (x.n === 1 && !bySurah.has(x.sn)) bySurah.set(x.sn, x); });
    const others = shuffle([...bySurah.values()].filter((x) => x.sn !== want), ctx.rng).slice(0, n - 1);
    names.push(opt(want, true, { label: a.sname, surah: want }), ...others.map((x) => opt(x.sn, false, { label: x.sname, surah: x.sn })));
    return names;
}
function g_sh_banner(ctx, R) {
    const p = pickAyah(ctx, (a) => a.n === 1);
    if (!p) return null;
    return choice({ ruleId: R, kind: 'sh_banner', key: 'sh_banner:' + p.a.sn, stemKey: 'tjw_mq_sh_banner', media: { kind: 'banner', sname: p.a.sname }, near: p.near, options: surahNameOptions(ctx, p.a), explain: { extraKey: 'tjw_ex_banner' } }, ctx);
}
function g_sh_after(ctx, R) {
    return choice({ ruleId: R, kind: 'sh_after', key: 'sh_after', stemKey: 'tjw_mq_sh_after', near: false, media: null,
        options: [opt('bsm', true, { labelKey: 'tjw_mo_basmala' }), opt('juz', false, { labelKey: 'tjw_mo_juz_number' }), opt('sajda', false, { labelKey: 'tjw_mo_sajda_place' }), opt('waqf', false, { labelKey: 'tjw_mo_stop_sign' })],
        explain: { extraKey: 'tjw_ex_basmala' } }, ctx);
}
function g_sh_page_juz(ctx, R) {
    const p = pickAyah(ctx, () => true);
    if (!p) return null;
    const ans = p.a.juz, ch = new Set([ans]);
    let guard = 0;
    while (ch.size < 4 && guard++ < 50) { const d = ans + Math.floor(ctx.rng() * 7) - 3; if (d >= 1 && d <= 30) ch.add(d); }
    return choice({ ruleId: R, kind: 'sh_page_juz', key: 'sh_page_juz:' + keyOfAyah(p.a), stemKey: 'tjw_mq_sh_page_juz', media: { kind: 'pagehead', juz: ans, sname: p.a.sname }, near: p.near,
        options: [...ch].map((n) => opt(n, n === ans, { labelKey: 'tjw_mo_juz_n', labelVars: { n } })), explain: { extraKey: 'tjw_ex_pagehead' } }, ctx);
}
function g_sh_page_surah(ctx, R) {
    const p = pickAyah(ctx, () => true);
    if (!p) return null;
    return choice({ ruleId: R, kind: 'sh_page_surah', key: 'sh_page_surah:' + p.a.sn, stemKey: 'tjw_mq_sh_page_surah', media: { kind: 'pagehead', juz: p.a.juz, sname: p.a.sname }, near: p.near, options: surahNameOptions(ctx, p.a), explain: { extraKey: 'tjw_ex_pagehead' } }, ctx);
}
function g_sh_tap_bsm(ctx, R) {
    const p = pickAyah(ctx, (a) => a.n === 1 && a.sn !== 1 && a.sn !== 9, { maxLen: 90 });
    const bsm = ctx.byKey.get('1:1');
    if (!p || !bsm) return null;
    const next = ctx.byKey.get(p.a.sn + ':2');
    const segments = [{ t: bsm.text, ok: true, text: true }, { t: p.a.text, ok: false, text: true, rosetteN: 1 }, ...(next ? [{ t: next.text, ok: false, text: true, rosetteN: 2 }] : [])];
    if (segments.length < 3) return null;
    return { type: 'mushaf_tap', ruleId: R, kind: 'sh_tap_bsm', key: 'sh_tap_bsm:' + p.a.sn, stemKey: 'tjw_mq_sh_tap_bsm', stemVars: {}, segments, layout: 'lines', media: { kind: 'banner', sname: p.a.sname }, explain: { extraKey: 'tjw_ex_basmala' }, near: p.near };
}

// --- ٣) الجزء والحزب والربع ---
const quarterStarts = (ctx) => ctx.all.filter((a, i) => i === 0 || a.q !== ctx.all[i - 1].q);
export function pickQuarterStart(ctx) {
    const all = quarterStarts(ctx);
    const mine = all.filter((a) => ctx.isMine(a));
    const list = mine.length ? mine : ctx.nearest(all, 8);
    if (!list.length) return null;
    return { a: pickOne(list, ctx.rng), near: !mine.length && ctx.hasPool };
}
function g_jh_name(ctx, R) {
    const p = pickQuarterStart(ctx);
    if (!p) return null;
    const m = quarterMarker(p.a.q);
    return choice({ ruleId: R, kind: 'jh_name', key: 'jh_name:' + p.a.q, stemKey: 'tjw_mq_jh_name', media: { kind: 'lantern', q: p.a.q, sname: p.a.sname, n: p.a.n }, near: p.near,
        options: MARKER_KINDS.map((k) => opt(k, k === m.kind, { labelKey: markerKindKey(k) })), explain: { extraKey: 'tjw_ex_lantern', q: p.a.q } }, ctx);
}
function g_jh_read(ctx, R) {
    const p = pickQuarterStart(ctx);
    if (!p) return null;
    const m = quarterMarker(p.a.q), isJuz = m.kind === 'juz', ans = isJuz ? m.juz : m.hizb, max = isJuz ? 30 : 60, ch = new Set([ans]);
    let guard = 0;
    while (ch.size < 4 && guard++ < 50) { const d = ans + Math.floor(ctx.rng() * 7) - 3; if (d >= 1 && d <= max) ch.add(d); }
    return choice({ ruleId: R, kind: 'jh_read', key: 'jh_read:' + p.a.q, stemKey: isJuz ? 'tjw_mq_jh_read_juz' : 'tjw_mq_jh_read_hizb', media: { kind: 'lantern', q: p.a.q, sname: p.a.sname, n: p.a.n }, near: p.near,
        options: [...ch].map((n) => opt(n, n === ans, { labelKey: isJuz ? 'tjw_mo_juz_n' : 'tjw_mo_hizb_n', labelVars: { n } })), explain: { extraKey: 'tjw_ex_lantern', q: p.a.q } }, ctx);
}
function g_jh_rub_meaning(ctx, R) {
    const p = pickAyah(ctx, (a) => ayahHasSign(a, 'rub_mark'));
    if (!p) return null;
    return choice({ ruleId: R, kind: 'jh_rub_meaning', key: 'jh_rub_meaning', stemKey: 'tjw_mq_meaning', media: { kind: 'glyph', code: '۞', abbr: '' }, near: p.near,
        options: signOptions('rub_mark', { field: 'def', pool: shuffle([signById('waqf_lazim'), signById('zero_round'), signById('madd'), signById('sajda_sign')], ctx.rng) }), explain: explainSign('rub_mark') }, ctx);
}
function g_jh_rub_tap(ctx, R) {
    const p = pickAyah(ctx, (a) => ayahHasSign(a, 'rub_mark') && a.text.length < 150);
    if (!p) return null;
    return tap({ ruleId: R, kind: 'jh_rub_tap', key: 'jh_rub_tap:' + keyOfAyah(p.a), stemKey: 'tjw_mq_tap_sign', stemVars: { sign: signNameKey('rub_mark') }, layout: 'words', near: p.near,
        segments: ayahTokens(p.a).map((tok) => ({ t: tok, ok: tokenHasSign('rub_mark', tok), mark: tokenHasSign('rub_mark', tok) })), explain: explainSign('rub_mark') });
}
const FACTS = [
    { id: 'hizb_in_juz', stem: 'tjw_mq_fact_hizb_in_juz', ans: 2, set: [1, 2, 3, 4] },
    { id: 'quarter_in_hizb', stem: 'tjw_mq_fact_quarter_in_hizb', ans: 4, set: [2, 3, 4, 8] },
    { id: 'quarter_in_juz', stem: 'tjw_mq_fact_quarter_in_juz', ans: 8, set: [4, 6, 8, 12] },
    { id: 'juz_in_quran', stem: 'tjw_mq_fact_juz_in_quran', ans: 30, set: [20, 30, 40, 60] },
    { id: 'hizb_in_quran', stem: 'tjw_mq_fact_hizb_in_quran', ans: 60, set: [30, 40, 60, 120] }
];
function g_jh_fact(ctx, R) {
    const f = pickOne(FACTS, ctx.rng);
    return choice({ ruleId: R, kind: 'jh_fact', key: 'jh_fact:' + f.id, stemKey: f.stem, near: false, media: null, options: f.set.map((n) => opt(n, n === f.ans, { label: AR(n) })), explain: { extraKey: 'tjw_ex_counts' } }, ctx);
}

// --- ٤ و٥ و٦ و٧) العلامات الصغيرة ---
function g_sign_name(lesson, { skip = [] } = {}) {
    return (ctx, R) => {
        const signs = signsOfLesson(lesson).filter((s) => s.code && !skip.includes(s.id) && (lesson === 'waqf' || !AMBIGUOUS_GLYPH.has(s.id)));
        const sign = pickOne(signs, ctx.rng);
        if (!sign) return null;
        const pool = lesson === 'waqf' ? shuffle(signs.filter((s) => s.id !== sign.id), ctx.rng) : null;
        return choice({ ruleId: R, kind: 'name', key: 'name:' + sign.id, stemKey: lesson === 'waqf' ? 'tjw_mq_name_waqf' : 'tjw_mq_name', near: false, media: glyphMedia(sign), options: signOptions(sign.id, { pool, field: 'name' }), explain: explainSign(sign.id) }, ctx);
    };
}
function g_sign_meaning(lesson) {
    return (ctx, R) => {
        const signs = signsOfLesson(lesson).filter((s) => s.code && (lesson === 'waqf' || !AMBIGUOUS_GLYPH.has(s.id)));
        const sign = pickOne(signs, ctx.rng);
        if (!sign) return null;
        const pool = lesson === 'waqf' ? shuffle(signs.filter((s) => s.id !== sign.id), ctx.rng) : null;
        return choice({ ruleId: R, kind: 'meaning', key: 'meaning:' + sign.id, stemKey: 'tjw_mq_meaning', near: false, media: glyphMedia(sign), options: signOptions(sign.id, { pool, field: 'def' }), explain: explainSign(sign.id) }, ctx);
    };
}
function g_sign_reverse(lesson) {
    return (ctx, R) => {
        const signs = signsOfLesson(lesson).filter((s) => s.code && (lesson === 'waqf' || !AMBIGUOUS_GLYPH.has(s.id)));
        const sign = pickOne(signs, ctx.rng);
        if (!sign || signs.length < 3) return null;
        const others = shuffle(signs.filter((s) => s.id !== sign.id), ctx.rng).slice(0, 3);
        return choice({ ruleId: R, kind: 'reverse', key: 'reverse:' + sign.id, stemKey: 'tjw_mq_reverse', stemVars: { def: signDefKey(sign.id) }, near: false, media: null,
            options: [sign, ...others].map((s) => opt(s.id, s.id === sign.id, { glyph: signShow(s), abbr: s.abbr || '' })), explain: explainSign(sign.id) }, ctx);
    };
}
function g_sign_tap(lesson, { onlyIds = null } = {}) {
    return (ctx, R) => {
        const signs = signsOfLesson(lesson).filter((s) => s.code && !AMBIGUOUS_GLYPH.has(s.id) && s.id !== 'sukun' && s.id !== 'shadda' && (!onlyIds || onlyIds.includes(s.id)));
        const sign = pickOne(signs, ctx.rng);
        if (!sign) return null;
        const p = pickAyah(ctx, (a) => ayahHasSign(a, sign.id) && ayahTokens(a).length <= 16);
        if (!p) return null;
        const mark = !!sign.standalone;
        return tap({ ruleId: R, kind: 'tap', key: 'tap:' + sign.id + ':' + keyOfAyah(p.a), stemKey: mark ? 'tjw_mq_tap_sign' : 'tjw_mq_tap_word_sign', stemVars: { sign: signNameKey(sign.id) }, layout: 'words', near: p.near,
            segments: ayahTokens(p.a).map((tok) => ({ t: tok, ok: tokenHasSign(sign.id, tok), mark: mark && tokenHasSign(sign.id, tok) })), explain: explainSign(sign.id) });
    };
}
function g_waqf_tap_any(ctx, R) {
    const p = pickAyah(ctx, (a) => ayahTokens(a).some(isWaqfToken) && ayahTokens(a).length <= 16);
    if (!p) return null;
    return tap({ ruleId: R, kind: 'tap_waqf', key: 'tap_waqf:' + keyOfAyah(p.a), stemKey: 'tjw_mq_tap_waqf', layout: 'words', near: p.near,
        segments: ayahTokens(p.a).map((tok) => ({ t: tok, ok: isWaqfToken(tok), mark: isWaqfToken(tok) })), explain: { extraKey: 'tjw_ex_waqf_tap' } });
}
function g_waqf_match(ctx, R) {
    const signs = shuffle(signsOfLesson('waqf').filter((s) => s.id !== 'saktah'), ctx.rng).slice(0, 4);
    return { type: 'mushaf_match', ruleId: R, kind: 'match', key: 'match:' + signs.map((s) => s.id).join(','), stemKey: 'tjw_mq_match', stemVars: {}, near: false,
        pairs: signs.map((s) => ({ id: s.id, glyph: signShow(s), abbr: s.abbr || '', labelKey: signNameKey(s.id) })), explain: { extraKey: 'tjw_ex_waqf_match' }, media: null };
}
function g_waqf_sakta(ctx, R) {
    const sign = signById('saktah');
    const p = pickSignAyah(ctx, sign);
    if (!p) return null;
    const toks = ayahTokens(p.a);
    return tap({ ruleId: R, kind: 'tap_sakta', key: 'tap_sakta:' + keyOfAyah(p.a), stemKey: 'tjw_mq_tap_sakta', layout: 'words', near: p.near,
        segments: toks.map((tok) => ({ t: tok, ok: tokenHasSign('saktah', tok), mark: tokenHasSign('saktah', tok) })), explain: explainSign('saktah') });
}
function g_sk_when(ctx, R) {
    const pick = pickOne(['zero_round', 'zero_rect'], ctx.rng);
    const opts = [
        opt('none', pick === 'zero_round', { labelKey: 'tjw_mo_never_read' }),
        opt('wasl_no', pick === 'zero_rect', { labelKey: 'tjw_mo_waqf_only' }),
        opt('always', false, { labelKey: 'tjw_mo_always_read' }),
        opt('wasl_only', false, { labelKey: 'tjw_mo_wasl_only' })
    ];
    return choice({ ruleId: R, kind: 'when', key: 'when:' + pick, stemKey: 'tjw_mq_sk_when', stemVars: { sign: signNameKey(pick) }, near: false, media: glyphMedia(signById(pick)), options: opts, explain: explainSign(pick) }, ctx);
}
function g_sk_sukun(ctx, R) {
    const p = pickAyah(ctx, (a) => ayahHasSign(a, 'sukun') && ayahTokens(a).length <= 12, { maxLen: 90 });
    if (!p) return null;
    return choice({ ruleId: R, kind: 'sukun_shape', key: 'sukun_shape:' + keyOfAyah(p.a), stemKey: 'tjw_mq_sk_shape', near: p.near, media: { kind: 'ayah', parts: [{ t: 'text', v: p.a.text }, { t: 'rosette', n: p.a.n }], sname: p.a.sname },
        options: [opt('head', true, { glyph: showOfCode('ۡ') }), opt('circle', false, { glyph: showOfCode('۟') }), opt('hat', false, { glyph: showOfCode('\u06E4') }), opt('dot', false, { glyph: showOfCode('ۢ') })], explain: explainSign('sukun') }, ctx);
}
function g_sin_word(ctx, R) {
    const sign = signById(pickOne(['sin_over', 'sin_under', 'saktah'], ctx.rng));
    const p = pickSignAyah(ctx, sign);
    if (!p) return null;
    const toks = ayahTokens(p.a), i = toks.findIndex((x) => tokenHasSign(sign.id, x));
    if (i < 0) return null;
    const word = sign.id === 'saktah' ? [toks[i - 1], toks[i], toks[i + 1]].filter(Boolean).join(' ') : toks[i];
    return choice({ ruleId: R, kind: 'sin_word', key: 'sin_word:' + sign.id + ':' + keyOfAyah(p.a), stemKey: 'tjw_mq_sin_word', near: p.near, media: { kind: 'word', text: word },
        options: [opt('saktah', sign.id === 'saktah', { labelKey: 'tjw_mk_saktah_name' }), opt('sin_over', sign.id === 'sin_over', { labelKey: 'tjw_mk_sin_over_name' }), opt('sin_under', sign.id === 'sin_under', { labelKey: 'tjw_mk_sin_under_name' })], explain: explainSign(sign.id) }, ctx);
}
function g_sin_tap(ctx, R) {
    const sign = signById(pickOne(['sin_over', 'sin_under'], ctx.rng));
    const p = pickSignAyah(ctx, sign);
    if (!p) return null;
    return tap({ ruleId: R, kind: 'tap', key: 'tap:' + sign.id + ':' + keyOfAyah(p.a), stemKey: 'tjw_mq_tap_word_sign', stemVars: { sign: signNameKey(sign.id) }, layout: 'words', near: p.near,
        segments: ayahTokens(p.a).map((tok) => ({ t: tok, ok: tokenHasSign(sign.id, tok) })), explain: explainSign(sign.id) });
}
function g_sin_which(ctx, R) {
    const sign = pickOne(['sin_over', 'sin_under'], ctx.rng);
    const asked = sign === 'sin_over' ? 'sin' : 'saad';
    return choice({ ruleId: R, kind: 'sin_which', key: 'sin_which:' + sign, stemKey: 'tjw_mq_sin_which', stemVars: { sign: signNameKey(sign) }, near: false, media: null,
        options: [opt('sin', asked === 'sin', { labelKey: 'tjw_mo_say_sin' }), opt('saad', asked === 'saad', { labelKey: 'tjw_mo_say_saad' })], explain: explainSign(sign) }, ctx);
}

// --- ٨) السجدة ---
const sajdaAyahs = (ctx) => ctx.all.filter((a) => a.sajda);
function g_sj_name(ctx, R) {
    return choice({ ruleId: R, kind: 'sj_name', key: 'sj_name', stemKey: 'tjw_mq_sj_name', near: false, media: { kind: 'sajda_icon' },
        options: [opt('sajda', true, { labelKey: 'tjw_mo_sajda_place' }), opt('hizb', false, { labelKey: 'tjw_mo_hizb_start' }), opt('ayah', false, { labelKey: 'tjw_mo_ayah_end_num' }), opt('waqf', false, { labelKey: 'tjw_mo_stop_sign' })], explain: explainSign('sajda_sign') }, ctx);
}
function g_sj_margin(ctx, R) {
    return choice({ ruleId: R, kind: 'sj_margin', key: 'sj_margin', stemKey: 'tjw_mq_sj_margin', near: false, media: { kind: 'frame', text: 'سجدة' },
        options: [opt('sajda', true, { labelKey: 'tjw_mo_sajda_place' }), opt('hizb', false, { labelKey: 'tjw_mo_hizb_start' }), opt('surah', false, { labelKey: 'tjw_mo_surah_end' }), opt('page', false, { labelKey: 'tjw_mo_page_number' })], explain: explainSign('sajda_sign') }, ctx);
}
function g_sj_overline(ctx, R) {
    return choice({ ruleId: R, kind: 'sj_overline', key: 'sj_overline', stemKey: 'tjw_mq_sj_overline', near: false, media: { kind: 'overline' },
        options: [opt('words', true, { labelKey: 'tjw_mo_prostration_words' }), opt('madd', false, { labelKey: 'tjw_mo_madd_words' }), opt('stop', false, { labelKey: 'tjw_mo_stop_words' }), opt('silent', false, { labelKey: 'tjw_mo_silent_words' })], explain: explainSign('sajda_sign') }, ctx);
}
function g_sj_tap(ctx, R) {
    const base = sajdaAyahs(ctx).filter((a) => ayahHasSign(a, 'sajda_sign') && ayahTokens(a).length <= 18);
    const mine = base.filter((a) => ctx.isMine(a));
    const list = mine.length ? mine : ctx.nearest(base, 6);
    if (!list.length) return null;
    const a = pickOne(list, ctx.rng), near = !mine.length && ctx.hasPool;
    return tap({ ruleId: R, kind: 'tap', key: 'tap_saj:' + keyOfAyah(a), stemKey: 'tjw_mq_tap_sign', stemVars: { sign: signNameKey('sajda_sign') }, layout: 'words', near,
        segments: ayahTokens(a).map((tok) => ({ t: tok, ok: tokenHasSign('sajda_sign', tok), mark: tokenHasSign('sajda_sign', tok) })), explain: explainSign('sajda_sign') });
}
function g_sj_has(ctx, R) {
    const saj = sajdaAyahs(ctx), sajMine = saj.filter((a) => ctx.isMine(a));
    const wantYes = ctx.rng() < 0.5;
    let a, near = false;
    if (wantYes) {
        const list = sajMine.length ? sajMine : ctx.nearest(saj, 6);
        if (!list.length) return null;
        a = pickOne(list, ctx.rng); near = !sajMine.length && ctx.hasPool;
    } else {
        const p = pickAyah(ctx, (x) => !x.sajda && x.text.length > 20, { maxLen: 110 });
        if (!p) return null;
        a = p.a; near = p.near;
    }
    const shown = a.text.replace(/۩/g, '').replace(/\s+/g, ' ').trim();
    return choice({ ruleId: R, kind: 'sj_has', key: 'sj_has:' + keyOfAyah(a), stemKey: 'tjw_mq_sj_has', near, media: { kind: 'ayah', parts: [{ t: 'text', v: a.sajda ? a.text : shown }, { t: 'rosette', n: a.n }], sname: a.sname },
        options: [opt('yes', !!a.sajda, { labelKey: 'tjw_mo_yes' }), opt('no', !a.sajda, { labelKey: 'tjw_mo_no' })], explain: { extraKey: a.sajda ? 'tjw_ex_sajda_yes' : 'tjw_ex_sajda_no' } }, ctx);
}
function g_sj_count(ctx, R) {
    return choice({ ruleId: R, kind: 'sj_count', key: 'sj_count', stemKey: 'tjw_mq_sj_count', near: false, media: null, options: [10, 12, 15, 20].map((n) => opt(n, n === 15, { label: AR(n) })), explain: { extraKey: 'tjw_ex_counts' } }, ctx);
}

// ============================================================
// وصفات الدروس: مولّدات كل درس وفي أي وضع تصلح (practice: تعرّف، explore: تفاعل ضغط ووصل، exam: تنوّع)
// ============================================================
const RECIPES = {
    // درس واحد: رقم الآية + لوحة اسم السورة ورأس الصفحة (كانا درسين منفصلين)
    ayah_number: [
        { id: 'an_place', fn: g_an_place, group: 'choice' }, { id: 'sh_banner', fn: g_sh_banner, group: 'choice' }, { id: 'an_meaning', fn: g_an_meaning, group: 'choice' },
        { id: 'sh_after', fn: g_sh_after, group: 'choice' }, { id: 'an_which', fn: g_an_which, group: 'choice' }, { id: 'sh_page_juz', fn: g_sh_page_juz, group: 'choice' },
        { id: 'an_tap', fn: g_an_tap, group: 'tap' }, { id: 'sh_tap_bsm', fn: g_sh_tap_bsm, group: 'tap' }, { id: 'sh_page_surah', fn: g_sh_page_surah, group: 'choice' }
    ],
    juz_hizb: [
        { id: 'jh_name', fn: g_jh_name, group: 'choice' }, { id: 'jh_read', fn: g_jh_read, group: 'choice' }, { id: 'jh_rub_meaning', fn: g_jh_rub_meaning, group: 'choice' },
        { id: 'jh_fact', fn: g_jh_fact, group: 'choice' }, { id: 'jh_rub_tap', fn: g_jh_rub_tap, group: 'tap' }
    ],
    waqf: [
        { id: 'name', fn: g_sign_name('waqf'), group: 'choice' }, { id: 'meaning', fn: g_sign_meaning('waqf'), group: 'choice' }, { id: 'reverse', fn: g_sign_reverse('waqf'), group: 'choice' },
        { id: 'tap_waqf', fn: g_waqf_tap_any, group: 'tap' }, { id: 'match', fn: g_waqf_match, group: 'match' }, { id: 'tap_sakta', fn: g_waqf_sakta, group: 'tap' }
    ],
    silent_sukun: [
        { id: 'name', fn: g_sign_name('silent_sukun'), group: 'choice' }, { id: 'meaning', fn: g_sign_meaning('silent_sukun'), group: 'choice' }, { id: 'reverse', fn: g_sign_reverse('silent_sukun'), group: 'choice' },
        { id: 'when', fn: g_sk_when, group: 'choice' }, { id: 'sukun_shape', fn: g_sk_sukun, group: 'choice' }, { id: 'tap', fn: g_sign_tap('silent_sukun'), group: 'tap' }
    ],
    madd_letters: [
        { id: 'name', fn: g_sign_name('madd_letters'), group: 'choice' }, { id: 'meaning', fn: g_sign_meaning('madd_letters'), group: 'choice' }, { id: 'reverse', fn: g_sign_reverse('madd_letters'), group: 'choice' },
        { id: 'tap', fn: g_sign_tap('madd_letters'), group: 'tap' }, { id: 'tap2', fn: g_sign_tap('madd_letters'), group: 'tap' }
    ],
    sin_saad: [
        { id: 'sin_word', fn: g_sin_word, group: 'choice' }, { id: 'sin_which', fn: g_sin_which, group: 'choice' }, { id: 'sin_tap', fn: g_sin_tap, group: 'tap' },
        { id: 'sin_word2', fn: g_sin_word, group: 'choice' }, { id: 'sin_tap2', fn: g_sin_tap, group: 'tap' }
    ],
    sajda: [
        { id: 'sj_name', fn: g_sj_name, group: 'choice' }, { id: 'sj_margin', fn: g_sj_margin, group: 'choice' }, { id: 'sj_overline', fn: g_sj_overline, group: 'choice' },
        { id: 'sj_has', fn: g_sj_has, group: 'choice' }, { id: 'sj_tap', fn: g_sj_tap, group: 'tap' }, { id: 'sj_count', fn: g_sj_count, group: 'choice' }
    ]
};
export const recipesOf = (lesson) => RECIPES[lesson] || [];

// size: عدد الأسئلة. mode: practice (تعرّف) | explore (تفاعل) | exam (تنويع) | review.
// prevKinds: أنواع آخر اختبار (الاختبار يقدّم الأنواع التي لم تظهر فيه). لا تتكرر مفاتيح الأسئلة (key) داخل الجلسة الواحدة.
export function buildMushafQuestions(lesson, ctx, { mode = 'practice', size = 5, prevKinds = [], exclude = null } = {}) {
    const R = lessonRuleId(lesson);
    let recipes = recipesOf(lesson);
    if (!recipes.length) return [];
    if (mode === 'explore') recipes = [...recipes.filter((r) => r.group !== 'choice'), ...recipes.filter((r) => r.group === 'choice')];
    else if (mode === 'practice') recipes = [...recipes.filter((r) => r.group === 'choice'), ...recipes.filter((r) => r.group !== 'choice')];
    else recipes = shuffle(recipes, ctx.rng).sort((a, b) => (prevKinds.includes(a.id) ? 1 : 0) - (prevKinds.includes(b.id) ? 1 : 0));
    // exclude: مفاتيح أسئلة ظهرت للطالب في ألعاب هذا الحكم؛ لا تُعاد إلا إن لم يبقَ سؤال جديد (يُملأ من المستبعَدة آخراً)
    const out = [], used = new Set(), skipped = [];
    let attempts = 0;
    while (out.length < size && attempts < size * 24) {
        const r = recipes[attempts % recipes.length];
        attempts++;
        const q = r.fn(ctx, R);
        if (!q || used.has(q.key)) continue;
        if (exclude && exclude.has(q.key)) { skipped.push({ ...q, kind: r.id }); continue; }
        used.add(q.key);
        out.push({ ...q, kind: r.id });
    }
    for (const q of skipped) { if (out.length >= size) break; if (!used.has(q.key)) { used.add(q.key); out.push(q); } }
    return mode === 'exam' ? shuffle(out, ctx.rng) : out;
}

// تحدي المرحلة: يقيس كل دروس المرحلة (رقم الآية، الجزء والحزب، الوقف، السكون، المد، السين/الصاد، السجدة)
// perLesson أسئلة من كل درس بأنواع متنوعة دون تكرار، ثم تُخلط كلها في اختبار واحد
export function buildMushafStageChallenge(ctx, perLesson = 3) {
    const out = [], used = new Set();
    for (const l of MUSHAF_LESSONS) {
        for (const q of buildMushafQuestions(l, ctx, { mode: 'exam', size: perLesson })) {
            if (used.has(q.key)) continue;
            used.add(q.key);
            out.push(q);
        }
    }
    return shuffle(out, ctx.rng);
}

export const isMushafQuestionType = (type) => type === 'mushaf_choice' || type === 'mushaf_tap' || type === 'mushaf_match';

// تحويل مصحف quran-uthmani.json الخام إلى قائمة آيات مسطّحة للمحرك (للاختبارات؛ التطبيق يبني القائمة نفسها من قاعدة المنصة)
export function flattenQuran(surahs, textOf, nameOf = (s) => s.name) {
    const all = [];
    surahs.forEach((s) => s.ayahs.forEach((a) => {
        all.push({ i: all.length, g: a.number, sn: s.number, n: a.numberInSurah, text: textOf(a.text, a, s), juz: a.juz, q: a.hizbQuarter, page: a.page, sajda: a.sajda || false, sname: nameOf(s), count: s.ayahs.length, stype: s.revelationType || '' });
    }));
    return all;
}
