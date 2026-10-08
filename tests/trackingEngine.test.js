// tests/trackingEngine.test.js
// ==========================================
// 🌟 [جديد — الواجب الذكي] اختبارات محرك التتبّع والتخطيط والمحوّلات (engine/trackingEngine.js، skillMap.js، trackingAdapters.js).
// نفس روح بقية اختبارات المشروع: ملف Node عادي بلا مكتبات: node tests/trackingEngine.test.js
// أعداد الآيات حقيقية للسور 78..114 (جزء عمّ).
// ==========================================

import assert from 'node:assert/strict';
import {
  SEGMENT_SIZE, DAY_MS, segmentsOfSurah, segmentIdFor, buildPath, pathPosition, resolveRange,
  classifyPath, monthlyStaleness, computeSegmentStates, computeSkillStats, qualityCounts, diagnose, planHomework,
  hizbOfQuarter, juzOfHizb, quarterInHizb, groupSegments, selectionSegIds, coverageOf, coverageAdvice, suggestGroups, buildContext, skillSummaryForWindow
} from '../engine/trackingEngine.js';
import { HW_FORMATS, inferHwFormat, skillOfGameType, parseQualityCodes } from '../engine/skillMap.js';
import {
  eventsFromHomeworkSubmission, eventsFromGameDetails, eventsFromWeaknesses,
  buildAyahTextIndex, locateByText, normalizeForMatch
} from '../engine/trackingAdapters.js';

let pass = 0, fail = 0;
const failures = [];
async function test(name, fn) {
  try { await fn(); pass++; console.log(`✅ ${name}`); }
  catch (e) { fail++; failures.push(name); console.log(`❌ ${name}\n   ${e.message}`); }
}

const COUNTS = { 114: 6, 113: 5, 112: 4, 111: 5, 110: 3, 109: 6, 108: 3, 107: 7, 106: 4, 105: 5, 104: 9, 103: 3, 102: 8, 101: 11, 100: 11,
  99: 8, 98: 8, 97: 5, 96: 19, 95: 8, 94: 8, 93: 11, 92: 21, 91: 15, 90: 20, 89: 30, 88: 26, 87: 19, 86: 17, 85: 22, 84: 25, 83: 36,
  82: 19, 81: 29, 80: 42, 79: 46, 78: 40 };
const NAMES = { 114: 'الناس', 113: 'الفلق', 112: 'الإخلاص', 80: 'عبس', 79: 'النازعات', 78: 'النبأ' };
const surahsData = Object.keys(COUNTS).map(n => ({ number: +n, name: NAMES[n] || ('سورة' + n), ayahsCount: COUNTS[n] }))
  .sort((a, b) => b.number - a.number);

function rngSeed(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const NOW = Date.UTC(2026, 9, 8);
const ev = (o) => ({ studentId: 1, ts: NOW, source: 'homework', refId: 'r', score: 1, weight: 1, hint: false, quality: [], ...o });

// ============ المقاطع ============
await test('segmentsOfSurah: سورة قصيرة = مقطع واحد، والطويلة بعشر آيات', () => {
  assert.equal(segmentsOfSurah(114, 6).length, 1);
  assert.equal(segmentsOfSurah(114, 6)[0].id, '114:1-6');
  assert.equal(segmentsOfSurah(89, 30).length, 3);
  assert.equal(SEGMENT_SIZE, 10);
});
await test('segmentsOfSurah: ذيل أقل من 4 آيات يُضمّ للسابق (عبس 42 آية)', () => {
  const s = segmentsOfSurah(80, 42);
  assert.equal(s.length, 4);
  assert.equal(s[3].id, '80:31-42');
});
await test('segmentsOfSurah: ذيل 4 آيات فأكثر مقطع مستقل (النازعات 46 = 5 مقاطع)', () => {
  const s = segmentsOfSurah(79, 46);
  assert.equal(s.length, 5);
  assert.equal(s[4].id, '79:41-46');
});
await test('segmentIdFor: يرجع المقطع الصحيح أو null لموضع غير صالح', () => {
  assert.equal(segmentIdFor(surahsData, 79, 25), '79:21-30');
  assert.equal(segmentIdFor(surahsData, 79, 99), null);
  assert.equal(segmentIdFor(surahsData, 5, 1), null);
});

// ============ نطاق الحفظ ومساره ============
await test('buildPath: من الناس إلى الإخلاص آية 3 (مقطع جزئي)', () => {
  const p = buildPath(surahsData, { direction: 'backward', fromSurah: 114, toSurah: 112, frontierAyah: 3 });
  assert.deepEqual(p.segments.map(s => s.id), ['114:1-6', '113:1-5', '112:1-4']);
  assert.equal(p.total, 6 + 5 + 3);
  assert.equal(p.byId.get('112:1-4').limit, 3);
});
await test('buildPath: لا يضمّ مقطعاً يبدأ بعد موضع التوقف', () => {
  const p = buildPath(surahsData, { direction: 'backward', fromSurah: 80, toSurah: 79, frontierAyah: 5 });
  const lastSeg = p.segments[p.segments.length - 1];
  assert.equal(lastSeg.id, '79:1-10');
  assert.equal(lastSeg.limit, 5);
  assert.ok(!p.byId.has('79:11-20'));
});
await test('pathPosition: موضع الآية على المسار', () => {
  const p = buildPath(surahsData, { direction: 'backward', fromSurah: 114, toSurah: 112, frontierAyah: 4 });
  assert.equal(pathPosition(p, 114, 1), 1);
  assert.equal(pathPosition(p, 112, 2), 6 + 5 + 2);
  assert.equal(pathPosition(p, 79, 1), null);
});
await test('resolveRange: بلا نطاق مسجّل = ok false', () => {
  assert.equal(resolveRange(surahsData, {}, []).ok, false);
  assert.equal(resolveRange(surahsData, { memoFrom: 'الناس', memoTo: 'غير موجودة' }, []).reason, 'no_range');
});
await test('resolveRange: ملف الطالب فقط → نهاية سورة memoTo', () => {
  const r = resolveRange(surahsData, { memoFrom: 'الناس', memoTo: 'النازعات' }, []);
  assert.deepEqual([r.ok, r.direction, r.fromSurah, r.toSurah, r.frontierAyah, r.source], [true, 'backward', 114, 79, 46, 'student']);
});
await test('resolveRange: سجل شهري أبعد تقدّماً يحدّد الآية بدقة', () => {
  const rec = [{ year: 2026, month: 10, beginning: { surahNumber: 79, ayahNumber: 40 }, ending: { surahNumber: 78, ayahNumber: 12 } }];
  const r = resolveRange(surahsData, { memoFrom: 'الناس', memoTo: 'النازعات' }, rec);
  assert.deepEqual([r.toSurah, r.frontierAyah, r.source], [78, 12, 'monthly']);
});
await test('resolveRange: سجل شهري أقدم من ملف الطالب لا يُنقص النطاق', () => {
  const rec = [{ year: 2026, month: 9, beginning: { surahNumber: 80, ayahNumber: 3 } }];
  const r = resolveRange(surahsData, { memoFrom: 'الناس', memoTo: 'النازعات' }, rec);
  assert.deepEqual([r.toSurah, r.frontierAyah], [79, 46]);
});
await test('resolveRange: سجل شهري داخل سورة memoTo نفسها يحدّد الآية', () => {
  const rec = [{ year: 2026, month: 10, beginning: { surahNumber: 79, ayahNumber: 20 } }];
  const r = resolveRange(surahsData, { memoFrom: 'الناس', memoTo: 'النازعات' }, rec);
  assert.deepEqual([r.toSurah, r.frontierAyah, r.source], [79, 20, 'monthly']);
});
await test('resolveRange: مسار عكسي (من الأصغر للأكبر) يعتمد ملف الطالب', () => {
  const r = resolveRange(surahsData, { memoFrom: 'النبأ', memoTo: 'النازعات' }, []);
  assert.equal(r.direction, 'forward');
  assert.ok(r.ok);
});

// ============ التصنيف والتقادم ============
await test('classifyPath: جديد/قريب/بعيد بحسب بداية الشهر الحالي والسابق', () => {
  const range = { direction: 'backward', fromSurah: 114, toSurah: 79, frontierAyah: 46 };
  const path = buildPath(surahsData, range);
  const recs = [
    { year: 2026, month: 9, beginning: { surahNumber: 82, ayahNumber: 1 } },
    { year: 2026, month: 10, beginning: { surahNumber: 80, ayahNumber: 1 } }
  ];
  const cls = classifyPath(path, surahsData, recs);
  assert.equal(cls.get('79:1-10'), 'new');
  assert.equal(cls.get('80:1-10'), 'new');
  assert.equal(cls.get('81:1-10'), 'near');
  assert.equal(cls.get('114:1-6'), 'far');
});
await test('classifyPath: بلا سجلات = آخر ~10% جديد والتالية قريب', () => {
  const path = buildPath(surahsData, { direction: 'backward', fromSurah: 114, toSurah: 79, frontierAyah: 46 });
  const cls = classifyPath(path, surahsData, []);
  const vals = [...cls.values()];
  assert.ok(vals.includes('new') && vals.includes('near') && vals.includes('far'));
  assert.equal(cls.get('79:41-46'), 'new');
});
await test('monthlyStaleness: لا سجلات / قديم / حديث', () => {
  assert.equal(monthlyStaleness([], NOW).hasRecords, false);
  assert.equal(monthlyStaleness([{ createdAt: NOW - 40 * DAY_MS }], NOW).stale, true);
  assert.equal(monthlyStaleness([{ updatedAt: NOW - 5 * DAY_MS }], NOW).stale, false);
});
await test('monthlyStaleness: تواريخ ISO النصية كما تُخزَّن فعلاً في السجل الشهري', () => {
  const iso = (d) => new Date(NOW - d * DAY_MS).toISOString();
  const r = monthlyStaleness([{ createdAt: iso(70), updatedAt: iso(12) }, { createdAt: iso(40) }], NOW);
  assert.equal(r.days, 12);
  assert.equal(r.stale, false);
  assert.equal(monthlyStaleness([{ createdAt: iso(45), updatedAt: iso(41) }], NOW).stale, true);
});

// ============ حالة المقاطع ============
await test('computeSegmentStates: خطأ أخير = يحتاج علاجاً', () => {
  const s = computeSegmentStates([ev({ segment: 'a', ts: NOW - 2 * DAY_MS, score: 0, fmt: 'mcq_next' })], NOW).get('a');
  assert.equal(s.level, 'needs_fix');
  assert.equal(s.lastWrong.fmt, 'mcq_next');
});
await test('computeSegmentStates: صحيح بعد خطأ = هشّ، وبعد صحيحين = ثابت', () => {
  const base = [ev({ segment: 'a', ts: NOW - 20 * DAY_MS, score: 0, fmt: 'mcq_next' }), ev({ segment: 'a', ts: NOW - 10 * DAY_MS, fmt: 'dropdown' })];
  assert.equal(computeSegmentStates(base, NOW).get('a').level, 'shaky');
  const more = [...base, ev({ segment: 'a', ts: NOW - 5 * DAY_MS, fmt: 'intruder_word' })];
  assert.equal(computeSegmentStates(more, NOW).get('a').level, 'solid');
});
await test('computeSegmentStates: متقن يحتاج ٣ صحيحات + صيغتين + ١٤ يوماً', () => {
  const quick = [1, 2, 3].map(i => ev({ segment: 'a', ts: NOW - (3 - i) * DAY_MS, fmt: i % 2 ? 'dropdown' : 'mcq_next' }));
  assert.equal(computeSegmentStates(quick, NOW).get('a').level, 'solid');
  const spaced = [0, 8, 16].map((d, i) => ev({ segment: 'a', ts: NOW - (16 - d) * DAY_MS, fmt: i % 2 ? 'dropdown' : 'mcq_next' }));
  assert.equal(computeSegmentStates(spaced, NOW).get('a').level, 'mastered');
  const oneFmt = [0, 8, 16].map(d => ev({ segment: 'a', ts: NOW - (16 - d) * DAY_MS, fmt: 'dropdown' }));
  assert.equal(computeSegmentStates(oneFmt, NOW).get('a').level, 'solid');
});
await test('computeSegmentStates: صحيح لكن "لم يعرف الإجابة" = يحتاج علاجاً', () => {
  const s = computeSegmentStates([ev({ segment: 'a', score: 1, quality: ['dont_know'] })], NOW).get('a');
  assert.equal(s.level, 'needs_fix');
});
await test('computeSegmentStates: إجابة بتلميح لا تُحسب صحيحة ولا خاطئة (تصفّر السلسلة)', () => {
  const s = computeSegmentStates([ev({ segment: 'a', ts: NOW - DAY_MS, fmt: 'x1' }), ev({ segment: 'a', ts: NOW, hint: true, fmt: 'x2' })], NOW).get('a');
  assert.equal(s.streak, 0);
  assert.equal(s.level, 'shaky');
});
await test('computeSegmentStates: الاستحقاق = آخر حدث + فاصل المستوى', () => {
  const s = computeSegmentStates([ev({ segment: 'a', ts: NOW, score: 0 })], NOW).get('a');
  assert.equal(s.dueTs, NOW + 3 * DAY_MS);
});

// ============ المهارات والتشخيص ============
await test('computeSkillStats: الدقة والكفاية (٣ أدلة)', () => {
  const evs = [ev({ skill: 'sequence', score: 0 }), ev({ skill: 'sequence', score: 0 }), ev({ skill: 'sequence', score: 1 }), ev({ skill: 'recall', score: 1 })];
  const st = computeSkillStats(evs, NOW);
  assert.ok(Math.abs(st.sequence.acc - 1 / 3) < 1e-9);
  assert.equal(st.sequence.enough, true);
  assert.equal(st.recall.enough, false);
});
await test('computeSkillStats: الأقدم يفقد وزنه فيظهر التحسّن', () => {
  const old = [0, 1, 2].map(i => ev({ skill: 'sequence', score: 0, ts: NOW - 120 * DAY_MS - i }));
  const recent = [0, 1, 2].map(i => ev({ skill: 'sequence', score: 1, ts: NOW - i * DAY_MS }));
  assert.ok(computeSkillStats([...old, ...recent], NOW).sequence.acc > 0.85);
});
await test('computeSkillStats: البصري وزنه نصف (يحتاج ٦ أحداث للكفاية)', () => {
  const evs = Array.from({ length: 4 }, () => ev({ skill: 'visual', weight: 0.5, score: 1 }));
  assert.equal(computeSkillStats(evs, NOW).visual.enough, false);
  const six = Array.from({ length: 6 }, () => ev({ skill: 'visual', weight: 0.5, score: 1 }));
  assert.equal(computeSkillStats(six, NOW).visual.enough, true);
});
await test('qualityCounts: يعدّ أنواع الخطأ الخمسة', () => {
  const q = qualityCounts([ev({ quality: ['forget', 'word'] }), ev({ quality: ['forget'] })]);
  assert.equal(q.forget, 2); assert.equal(q.word, 1); assert.equal(q.haraka, 0);
});
await test('diagnose: ضعف مهارة عبر ≥٢ مقطع يختلف عن ضعف موضع واحد', () => {
  const evs = [
    ev({ skill: 'sequence', score: 0, segment: 'a' }), ev({ skill: 'sequence', score: 0, segment: 'b' }),
    ev({ skill: 'sequence', score: 0, segment: 'c' }), ev({ skill: 'sequence', score: 1, segment: 'd' })
  ];
  const states = computeSegmentStates(evs, NOW);
  const d = diagnose(evs, states, computeSkillStats(evs, NOW));
  const w = d.find(x => x.kind === 'skill_weak');
  assert.ok(w && w.skill === 'sequence' && w.segments === 3);
  // خطأ متكرر في مقطع واحد فقط → ضعف موضع لا مهارة
  const evs2 = [
    ev({ skill: 'recall', score: 0, segment: 'z', fmt: 'dropdown', ts: NOW - 3 * DAY_MS }),
    ev({ skill: 'sequence', score: 0, segment: 'z', fmt: 'mcq_next', ts: NOW - 2 * DAY_MS }),
    ev({ skill: 'recall', score: 0, segment: 'z', fmt: 'written_blank', ts: NOW - DAY_MS })
  ];
  const d2 = diagnose(evs2, computeSegmentStates(evs2, NOW), computeSkillStats(evs2, NOW));
  assert.ok(d2.some(x => x.kind === 'segment_weak' && x.segment === 'z' && x.formats === 3));
  assert.ok(!d2.some(x => x.kind === 'skill_weak'));
});
await test('diagnose: مهارة ممتازة وبيانات غير كافية', () => {
  const evs = [...Array(4)].map(() => ev({ skill: 'recall', score: 1 })).concat([ev({ skill: 'visual', score: 1, weight: 0.5 })]);
  const d = diagnose(evs, new Map(), computeSkillStats(evs, NOW));
  assert.ok(d.some(x => x.kind === 'skill_strong' && x.skill === 'recall'));
  assert.ok(d.some(x => x.kind === 'skill_few' && x.skill === 'visual'));
});

// ============ التخطيط ============
const bigPath = buildPath(surahsData, { direction: 'backward', fromSurah: 114, toSurah: 79, frontierAyah: 46 });
const bigClasses = classifyPath(bigPath, surahsData, [{ year: 2026, month: 10, beginning: { surahNumber: 81, ayahNumber: 1 } }]);
function plan(n, events = [], extra = {}) {
  const states = computeSegmentStates(events, NOW);
  return planHomework({ n, path: bigPath, classes: bigClasses, states, skillStats: computeSkillStats(events, NOW), now: NOW, rng: rngSeed(7), ...extra });
}

await test('planHomework: العدد المطلوب بالضبط وكل بند له صيغة ومهارة ومقطع صالح', () => {
  [5, 10, 20, 30].forEach(n => {
    const p = plan(n);
    assert.equal(p.items.length, n);
    p.items.forEach(it => { assert.ok(HW_FORMATS[it.fmt]); assert.equal(it.skill, HW_FORMATS[it.fmt].skill); assert.ok(bigPath.byId.has(it.seg.id)); });
  });
});
await test('planHomework: طالب بلا أخطاء = لا أسئلة علاجية', () => {
  assert.equal(plan(10).items.filter(i => i.cat === 'err').length, 0);
});
await test('planHomework: العلاجي لا يتجاوز ٢٥٪ وكلّه من مقاطع أخطأ فيها وبصيغة مختلفة', () => {
  const bad = bigPath.segments.slice(0, 8).map((s, i) => ev({ segment: s.id, score: 0, fmt: 'mcq_next', skill: 'sequence', ts: NOW - (i + 1) * DAY_MS }));
  const p = plan(10, bad);
  const errs = p.items.filter(i => i.cat === 'err');
  assert.equal(errs.length, 2);
  errs.forEach(e => { assert.ok(bad.some(b => b.segment === e.seg.id)); assert.notEqual(e.fmt, 'mcq_next'); });
  assert.ok(plan(4, bad).items.filter(i => i.cat === 'err').length <= 1);
  assert.equal(plan(3, bad).items.filter(i => i.cat === 'err').length, 0);
});
await test('planHomework: المهارة الضعيفة تأخذ حصة موزونة لا الواجب كله', () => {
  const evs = [];
  for (let i = 0; i < 6; i++) evs.push(ev({ segment: bigPath.segments[i].id, skill: 'sequence', fmt: 'mcq_next', score: i < 4 ? 0 : 1, ts: NOW - i * DAY_MS }));
  const p = plan(20, evs);
  assert.deepEqual(p.weakSkills, ['sequence']);
  const focused = p.items.filter(i => i.reason.skillFocus === 'sequence').length;
  assert.ok(focused > 0 && focused <= Math.ceil(20 * 0.35), `focused=${focused}`);
  assert.ok(p.items.some(i => i.skill !== 'sequence'));
});
await test('planHomework: سقف الأسئلة اليدوية والبصرية وسؤال السورة', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const p = planHomework({ n: 20, path: bigPath, classes: bigClasses, states: new Map(), skillStats: computeSkillStats([], NOW), now: NOW, rng: rngSeed(seed) });
    assert.ok(p.items.filter(i => HW_FORMATS[i.fmt].manual).length <= 4);
    assert.ok(p.items.filter(i => i.fmt === 'visual_page').length <= 2);
    assert.ok(p.items.filter(i => i.fmt === 'mcq_surah').length <= 3);
  }
});
await test('planHomework: لا سؤال سورة عند نطاق سورة واحدة (multiSurah=false)', () => {
  const p = plan(20, [], { multiSurah: false });
  assert.equal(p.items.filter(i => i.fmt === 'mcq_surah').length, 0);
});
await test('planHomework: أول سؤال سهل (تعرّف، غير علاجي، غير يدوي)', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const p = planHomework({ n: 10, path: bigPath, classes: bigClasses, states: new Map(), skillStats: computeSkillStats([], NOW), now: NOW, rng: rngSeed(seed) });
    const first = p.items[0];
    assert.equal(HW_FORMATS[first.fmt].level, 'recognition');
    assert.notEqual(first.cat, 'err');
  }
});
await test('planHomework: فلتر التركيز يقيّد المقاطع داخل نطاق الطالب', () => {
  const p = plan(10, [], { focusFilter: s => s.surah === 79 });
  assert.ok(p.items.every(i => i.seg.surah === 79));
});
await test('planHomework: مقطع واحد فقط (نطاق صغير) يعمل بتكرار بصيغ مختلفة', () => {
  const tiny = buildPath(surahsData, { direction: 'backward', fromSurah: 114, toSurah: 114, frontierAyah: 6 });
  const cls = classifyPath(tiny, surahsData, []);
  const p = planHomework({ n: 6, path: tiny, classes: cls, states: new Map(), skillStats: computeSkillStats([], NOW), now: NOW, rng: rngSeed(3), multiSurah: false });
  assert.equal(p.items.length, 6);
  assert.ok(new Set(p.items.map(i => i.fmt)).size >= 3);
});
await test('planHomework: نفس البذرة = نفس الخطة (قابلية الاختبار)', () => {
  const a = plan(12).items.map(i => i.seg.id + i.fmt).join();
  const b = plan(12).items.map(i => i.seg.id + i.fmt).join();
  assert.equal(a, b);
});
await test('planHomework: لا يضع كل أسئلة نفس المقطع حين تتوفر مقاطع أخرى', () => {
  const p = plan(10);
  assert.ok(new Set(p.items.map(i => i.seg.id)).size >= 7);
});
await test('planHomework: ترتيب الأسئلة ليس بترتيب المصحف ولا الحفظ', () => {
  const p = plan(20);
  const ids = p.items.map(i => bigPath.segments.indexOf(bigPath.byId.get(i.seg.id)));
  const sortedAsc = [...ids].sort((a, b) => a - b), sortedDesc = [...ids].sort((a, b) => b - a);
  assert.notDeepEqual(ids, sortedAsc);
  assert.notDeepEqual(ids, sortedDesc);
});


// ============ الأحزاب والتغطية والاقتراح ============
// ربع وهمي رتيب: كلما نزل رقم السورة زاد الحزب نزولاً (يحاكي أن الناس في الحزب 60 وما قبلها أحزاب أدنى)
const fakeQuarter = (surah) => 240 - (114 - surah);
await test('hizb helpers: 240 ربعاً = 60 حزباً = 30 جزءاً، وجزء عمّ = الحزبان 59 و60', () => {
  assert.equal(hizbOfQuarter(240), 60); assert.equal(hizbOfQuarter(233), 59); assert.equal(hizbOfQuarter(1), 1); assert.equal(hizbOfQuarter(4), 1); assert.equal(hizbOfQuarter(5), 2);
  assert.equal(juzOfHizb(60), 30); assert.equal(juzOfHizb(59), 30); assert.equal(juzOfHizb(58), 29); assert.equal(juzOfHizb(1), 1);
  assert.equal(quarterInHizb(240), 4); assert.equal(quarterInHizb(237), 1);
});
await test('groupSegments: كل مقطع في مجموعة واحدة بترتيب المسار (الناس أولاً) والحزب يحوي ربعيه', () => {
  const groups = groupSegments(bigPath, fakeQuarter, 'hizb');
  const all = groups.flatMap(g => g.segIds);
  assert.equal(all.length, bigPath.segments.length);
  assert.equal(new Set(all).size, all.length);
  assert.equal(groups[0].hizb, 60);
  assert.ok(groups.every((g, i) => i === 0 || g.hizb <= groups[i - 1].hizb));
  assert.ok(groups.every(g => g.unit === 'hizb' && g.id === 'hizb:' + g.key && g.juz === Math.ceil(g.hizb / 2)));
  assert.equal(groups.reduce((a, g) => a + g.ayahs, 0), bigPath.total);
  const quarters = groupSegments(bigPath, fakeQuarter, 'quarter');
  assert.ok(quarters.length > groups.length && quarters[0].quarter >= 1 && quarters[0].quarter <= 4);
});
await test('groupSegments: ربع غير معروف يُتجاوز بأمان', () => {
  assert.equal(groupSegments(bigPath, () => null).length, 0);
});

const segIds15 = bigPath.segments.slice(0, 15).map(s => s.id);
await test('coverageOf: المفحوص خلال الدورة / المُسنَد المعلّق / غير المغطّى', () => {
  const events = [
    ev({ segment: segIds15[0], ts: NOW - 5 * DAY_MS }),
    ev({ segment: segIds15[1], ts: NOW - 50 * DAY_MS }),       // أقدم من الدورة (42 يوماً) فلا يُحسب
    ev({ segment: 'غريب', ts: NOW })
  ];
  const c = coverageOf(segIds15, events, NOW, { cycleDays: 42, pendingSegIds: new Set([segIds15[2], segIds15[0]]) });
  assert.deepEqual([c.total, c.examined, c.pending, c.uncoveredCount], [15, 1, 1, 13]);
  assert.ok(!c.uncovered.includes(segIds15[0]) && !c.uncovered.includes(segIds15[2]) && c.uncovered.includes(segIds15[1]));
  assert.equal(coverageOf(segIds15, events, NOW, { cycleDays: 60 }).examined, 2);
});
await test('coverageAdvice: حزب من 15 مقطعاً و10 أسئلة يغطي 67% ولتغطيته كله 15 سؤالاً', () => {
  const a = coverageAdvice({ total: 15, uncoveredCount: 15, n: 10 });
  assert.deepEqual([a.willCover, a.pctOfUncovered, a.pctAfter, a.needForAll, a.homeworksNeeded, a.tooMany], [10, 67, 67, 15, 2, false]);
});
await test('coverageAdvice: النطاق كله 300 مقطع: دورة 6 أسابيع بواجبين = 25 سؤالاً، و10 أسئلة = 15 أسبوعاً', () => {
  const a = coverageAdvice({ total: 300, uncoveredCount: 300, n: 10, hwPerWeek: 2, cycleWeeks: 6 });
  assert.equal(a.perHwForCycle, 25);
  assert.equal(a.homeworksNeeded, 30); assert.equal(a.weeksNeeded, 15);
  assert.equal(a.needForAll, 50); assert.equal(a.tooMany, true);
  assert.equal(coverageAdvice({ total: 700, uncoveredCount: 700, n: 10 }).cycleTooMany, true);
  assert.equal(coverageAdvice({ total: 600, uncoveredCount: 600, n: 10 }).cycleTooMany, false);   // 50 بالضبط يكفي
});
await test('coverageAdvice: ما غُطّي سابقاً يُحسب في التغطية بعد الواجب، وبلا متبقٍّ = 100%', () => {
  const a = coverageAdvice({ total: 20, uncoveredCount: 5, n: 10 });
  assert.deepEqual([a.willCover, a.pctOfUncovered, a.pctAfter, a.needForAll], [5, 100, 100, 5]);
  const done = coverageAdvice({ total: 20, uncoveredCount: 0, n: 10 });
  assert.deepEqual([done.willCover, done.homeworksNeeded, done.pctOfUncovered], [0, 0, 100]);
  assert.equal(coverageAdvice({ total: 3, uncoveredCount: 1, n: 10 }).needForAll, 3);   // حدّ أدنى 3
});
await test('suggestGroups: يقترح الأحوج (غير المغطّى/الأقدم/الأخطاء) بترتيب المسار وبحدّ أقصى', () => {
  const groups = groupSegments(bigPath, fakeQuarter, 'hizb');
  // نغطّي كل المجموعات حديثاً عدا الثالثة والخامسة، وفي الخامسة أخطاء
  const events = [];
  groups.forEach((g, i) => { if (i !== 2 && i !== 4) g.segIds.forEach(id => events.push(ev({ segment: id, ts: NOW - DAY_MS, score: 1 }))); });
  groups[4].segIds.slice(0, 2).forEach(id => events.push(ev({ segment: id, ts: NOW - 10 * DAY_MS, score: 0 })));
  const states = computeSegmentStates(events, NOW);
  const sug = suggestGroups(groups, states, (g) => coverageOf(g.segIds, events, NOW), NOW, { targetSegs: 100, maxGroups: 2 });
  assert.deepEqual(sug, [groups[2].id, groups[4].id]);
  const one = suggestGroups(groups, states, (g) => coverageOf(g.segIds, events, NOW), NOW, { targetSegs: 1, maxGroups: 3 });
  assert.equal(one.length, 1);
});
await test('suggestGroups: نطاق مغطّى كله حديثاً لا يقترح شيئاً', () => {
  const groups = groupSegments(bigPath, fakeQuarter, 'hizb');
  const events = bigPath.segments.map(s => ev({ segment: s.id, ts: NOW - DAY_MS, score: 1 }));
  const sug = suggestGroups(groups, computeSegmentStates(events, NOW), (g) => coverageOf(g.segIds, events, NOW), NOW);
  assert.deepEqual(sug, []);
});

await test('selectionSegIds: كل النطاق = null، وأحزاب/سور محددة اتحادها، و«أكمل» = المتبقي من النطاق السابق ضمن المسار', () => {
  const groups = groupSegments(bigPath, fakeQuarter, 'hizb');
  assert.equal(selectionSegIds({ path: bigPath, groups, selection: { mode: 'all' } }), null);
  const two = selectionSegIds({ path: bigPath, groups, selection: { mode: 'hizb', ids: [groups[0].id, groups[2].id] } });
  assert.equal(two.size, groups[0].segIds.length + groups[2].segIds.length);
  assert.ok(groups[0].segIds.every(id => two.has(id)) && !groups[1].segIds.some(id => two.has(id)));
  const surahs = selectionSegIds({ path: bigPath, groups, selection: { mode: 'surah', ids: [80, 79] } });
  assert.ok(surahs.size > 0 && [...surahs].every(id => id.startsWith('80:') || id.startsWith('79:')));
  const last = groups[0].segIds;
  const unc = new Set([last[1], last[3], 'غير-في-المسار']);
  const resume = selectionSegIds({ path: bigPath, groups, selection: { mode: 'resume' }, lastScopeSegIds: last, uncoveredSet: unc });
  assert.deepEqual([...resume].sort(), [last[1], last[3]].sort());
  assert.equal(selectionSegIds({ path: bigPath, groups, selection: { mode: 'hizb', ids: ['hizb:999'] } }).size, 0);
});
await test('planHomework: اختيار من 15 مقطعاً و15 سؤالاً يغطي كل المقاطع (بلا تكرار) مهما كانت فئاتها', () => {
  const set = new Set(segIds15);
  for (let seed = 1; seed <= 15; seed++) {
    const p = planHomework({ n: 15, path: bigPath, classes: bigClasses, states: new Map(), skillStats: computeSkillStats([], NOW), now: NOW, rng: rngSeed(seed), focusFilter: s => set.has(s.id) });
    assert.equal(p.items.length, 15);
    assert.equal(new Set(p.items.map(i => i.seg.id)).size, 15, 'seed ' + seed);
  }
  const p10 = planHomework({ n: 10, path: bigPath, classes: bigClasses, states: new Map(), skillStats: computeSkillStats([], NOW), now: NOW, rng: rngSeed(4), focusFilter: s => set.has(s.id) });
  assert.equal(new Set(p10.items.map(i => i.seg.id)).size, 10);
});
await test('planHomework: أكثر من عدد المقاطع المتاحة = تكرار بصيغ مختلفة (لا فقدان أسئلة)', () => {
  const set = new Set(segIds15.slice(0, 4));
  const p = planHomework({ n: 10, path: bigPath, classes: bigClasses, states: new Map(), skillStats: computeSkillStats([], NOW), now: NOW, rng: rngSeed(2), focusFilter: s => set.has(s.id) });
  assert.equal(p.items.length, 10);
  assert.equal(new Set(p.items.map(i => i.seg.id)).size, 4);
});
await test('planHomework: المقاطع المُسندة في واجب لم يُسلَّم تتأخر ما دام غيرها متاحاً', () => {
  const avoid = new Set(bigPath.segments.slice(0, 30).map(s => s.id));
  for (let seed = 1; seed <= 8; seed++) {
    const p = planHomework({ n: 10, path: bigPath, classes: bigClasses, states: new Map(), skillStats: computeSkillStats([], NOW), now: NOW, rng: rngSeed(seed), avoidSegIds: avoid });
    assert.ok(p.items.every(i => !avoid.has(i.seg.id)), 'seed ' + seed);
  }
});

await test('buildContext وskillSummaryForWindow: السياق الكامل وملخص نافذة زمنية', () => {
  const evs = [ev({ segment: segIds15[0], skill: 'recall', score: 1, ts: NOW - 2 * DAY_MS }), ev({ segment: segIds15[1], skill: 'recall', score: 0, ts: NOW - 40 * DAY_MS })];
  const ctx = buildContext({ surahsData, student: { memoFrom: 'الناس', memoTo: 'النازعات' }, records: [], events: evs, now: NOW });
  assert.ok(ctx.range.ok && ctx.path && ctx.levels.needs_fix === 1 && ctx.levels.shaky === 1);
  const sum = skillSummaryForWindow(evs, NOW - 10 * DAY_MS, NOW + 1);
  assert.equal(sum.eventCount, 1); assert.equal(sum.stats.recall.acc, 1);
  assert.equal(buildContext({ surahsData, student: {}, records: [], events: [], now: NOW }).range.ok, false);
});

// ============ خريطة المهارات ============
await test('skillMap: أنواع الألعاب والصغار ← المهارة', () => {
  assert.equal(skillOfGameType('next'), 'sequence');
  assert.equal(skillOfGameType('kids_next'), 'sequence');
  assert.equal(skillOfGameType('kids_word_order'), 'structure');
  assert.equal(skillOfGameType('kids_tf'), 'precision');
  assert.equal(skillOfGameType('link_word_surah'), 'context');
  assert.equal(skillOfGameType('kids_link_ends'), 'context');
  assert.equal(skillOfGameType('visual_memory'), 'visual');
  assert.equal(skillOfGameType('kids_recite'), 'fluency');
  assert.equal(skillOfGameType('kids_mcq', 'ماذا بعد هذه الآية يا بطل؟'), 'sequence');
  assert.equal(skillOfGameType('kids_mcq', 'استخرج الكلمة الزائدة الخاطئة!'), 'precision');
  assert.equal(skillOfGameType('غير معروف'), null);
});
await test('skillMap: استنتاج صيغة الواجب القديم من النوع والعنوان', () => {
  assert.equal(inferHwFormat({ type: 'mcq', title: 'ما هي الآية التي تلي هذه الآية مباشرة؟' }), 'mcq_next');
  assert.equal(inferHwFormat({ type: 'mcq', title: 'ما هي الآية التي تَسبِق هذه الآية مباشرة؟ (استرجاع عكسي)' }), 'mcq_prev');
  assert.equal(inferHwFormat({ type: 'mcq', title: 'في أي سورة تقع هذه الآية؟' }), 'mcq_surah');
  assert.equal(inferHwFormat({ type: 'dropdown' }), 'dropdown');
  assert.equal(inferHwFormat({ type: 'mcq', title: 'سؤال يدوي' }), null);
});
await test('skillMap: رموز جودة الخطأ الخمسة من النص المخزَّن', () => {
  assert.deepEqual(parseQualityCodes('كلمة تحتاج مراجعة | نسيان آية').sort(), ['forget', 'word']);
  assert.deepEqual(parseQualityCodes(['أكتر من نقطة تحتاج مراجعة']), ['multi']);
  assert.deepEqual(parseQualityCodes('حركة تحتاج تصحيح'), ['haraka']);
  assert.deepEqual(parseQualityCodes('لم يعرف الإجابة'), ['dont_know']);
  assert.deepEqual(parseQualityCodes('ملاحظة حرة: شيء'), []);
  assert.deepEqual(parseQualityCodes(null), []);
});

// ============ المحوّلات ============
await test('eventsFromHomeworkSubmission: يربط meta التتبّع بتفاصيل التسليم والدرجة الجزئية', () => {
  const submission = { id: 'S1', details: [
    { qid: 'q1', isCorrect: true, points: 1, earnedPoints: 1, type: 'mcq' },
    { qid: 'q2', isCorrect: false, points: 2, earnedPoints: 1, type: 'matrix_order' },
    { qid: 'q3', needsManualGrading: true, points: 1, manualScore: 0, type: 'written_blank' },
    { qid: 'q4', needsManualGrading: true, points: 1, type: 'write_3_ayahs' }
  ] };
  const tracking = {
    q1: { surah: 79, ayah: 5, segment: '79:1-10', skill: 'sequence', fmt: 'mcq_next' },
    q2: { surah: 79, ayah: 12, segment: '79:11-20', skill: 'structure', fmt: 'matrix_order' },
    q3: { surah: 80, ayah: 3, segment: '80:1-10', skill: 'recall', fmt: 'written_blank' },
    q4: { surah: 80, ayah: 3, segment: '80:1-10', skill: 'recall', fmt: 'write_3_ayahs' }
  };
  const evs = eventsFromHomeworkSubmission({ studentId: 9, submission, tracking, questions: [], surahsData, ts: NOW });
  assert.equal(evs.length, 3);   // q4 لم يُصحَّح بعد → لا حدث
  assert.equal(evs[0].score, 1);
  assert.equal(evs[1].score, 0.5);
  assert.equal(evs[2].score, 0);
  assert.ok(evs.every(e => e.refId === 'S1' && e.studentId === 9));
});
await test('eventsFromHomeworkSubmission: واجب قديم بلا meta → صيغة من العنوان + موضع من نص الآية', () => {
  const index = buildAyahTextIndex([{ number: 112, ayahs: [{ numberInSurah: 1, text: 'قُلْ هُوَ ٱللَّهُ أَحَدٌ' }, { numberInSurah: 2, text: 'ٱللَّهُ ٱلصَّمَدُ' }] }]);
  const submission = { id: 'S2', details: [{ qid: 'a', isCorrect: false, points: 1, earnedPoints: 0, type: 'mcq', question: '﴿ ٱللَّهُ ٱلصَّمَدُ ﴾' }] };
  const questions = [{ id: 'a', type: 'mcq', title: 'ما هي الآية التي تلي هذه الآية مباشرة؟' }];
  const evs = eventsFromHomeworkSubmission({ studentId: 1, submission, tracking: null, questions, surahsData, textIndex: index, ts: NOW });
  assert.equal(evs.length, 1);
  assert.deepEqual([evs[0].skill, evs[0].fmt, evs[0].surah, evs[0].ayah, evs[0].segment], ['sequence', 'mcq_next', 112, 2, '112:1-4']);
});
await test('locateByText: آية مكررة حرفياً لا تُخمَّن', () => {
  const index = buildAyahTextIndex([{ number: 55, ayahs: [{ numberInSurah: 13, text: 'فَبِأَىِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ' }, { numberInSurah: 16, text: 'فَبِأَىِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ' }] }]);
  assert.equal(locateByText(index, 'فَبِأَىِّ ءَالَآءِ رَبِّكُمَا تُكَذِّبَانِ'), null);
  assert.equal(normalizeForMatch('ٱللَّهُ'), 'الله');
});
await test('eventsFromGameDetails: نوع اللعبة والموضع والتلميح والجودة والترتيب الخاطئ', () => {
  const details = [
    { type: 'next', surahName: 'النازعات', num: 12, isCorrect: false, errors: ['نسيان آية', 'كلمة تحتاج مراجعة'], usedHint: false, timeTaken: 9.4 },
    { type: 'order', surahName: 'النازعات', num: 3, isCorrect: true, errors: [], usedHint: false, timeTaken: 20, orderAttempts: 1 },
    { type: 'visual_memory', surahName: 'غير موجودة', num: 0, isCorrect: true, errors: [] }
  ];
  const evs = eventsFromGameDetails({ studentId: 4, details, surahsData, ts: NOW, refId: 'G1' });
  assert.equal(evs.length, 3);
  assert.deepEqual([evs[0].skill, evs[0].segment, evs[0].score], ['sequence', '79:11-20', 0]);
  assert.deepEqual(evs[0].quality.sort(), ['forget', 'word']);
  assert.equal(evs[1].score, 0.75);
  assert.equal(evs[2].skill, 'visual');
  assert.equal(evs[2].segment, null);
});
await test('eventsFromWeaknesses: خطأ نشط = حدث خاطئ، ومؤرشَف = خطأ ثم صواب', () => {
  const evs = eventsFromWeaknesses({
    studentId: 3, surahsData,
    weaknesses: [{ surahName: 'عبس', num: 15, questionType: 'mistake', errorTypesList: ['كلمة تحتاج مراجعة'], dateRecorded: '2026-09-20T10:00:00Z' }],
    resolved: [{ surahName: 'عبس', num: 3, questionType: 'catch', errorTypes: 'نسيان آية', dateRecorded: '2026-09-01T10:00:00Z', dateResolved: '2026-09-10T10:00:00Z' }]
  });
  assert.equal(evs.length, 3);
  const w = evs.find(e => e.ayah === 15);
  assert.deepEqual([w.skill, w.score, w.segment, w.quality], ['precision', 0, '80:11-20', ['word']]);
  const fixed = evs.find(e => e.qid === 'fixed');
  assert.equal(fixed.score, 1);
  assert.ok(fixed.ts > evs.find(e => e.ayah === 3 && e.qid === 'wrong').ts);
});

await test('eventsFromWeaknesses: beforeTs يستبعد الأخطاء المسجَّلة بعد بدء التسجيل الحيّ (منع العدّ المزدوج)', () => {
  const w = [
    { surahName: 'عبس', num: 15, questionType: 'mistake', dateRecorded: '2026-09-20T10:00:00Z' },
    { surahName: 'عبس', num: 16, questionType: 'mistake', dateRecorded: '2026-10-05T10:00:00Z' }
  ];
  const evs = eventsFromWeaknesses({ studentId: 3, surahsData, weaknesses: w, resolved: [], beforeTs: Date.parse('2026-10-01T00:00:00Z') });
  assert.equal(evs.length, 1);
  assert.equal(evs[0].ayah, 15);
});

console.log(`\nالنتيجة: ${pass} ناجح، ${fail} فاشل، من إجمالي ${pass + fail} اختبار.`);
if (fail) { console.log('الفاشلة:', failures.join(' | ')); process.exit(1); }
