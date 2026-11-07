// اختبار «مدرّب المتشابهات»: ترتيب تدريب اليوم (حان موعده ← ضعيف ← جديد) والتقيّد بمحفوظ الطالب
import test from 'node:test';
import assert from 'node:assert/strict';
import { planStudentRound, studentCoachSummary, groupInMemo, diffWords } from '../engine/similarityCoach.js';
import { groupSignature } from '../engine/similarityMastery.js';

// المجموعة تمتد على سورتين (أسئلة الطالب «في أي سورتين؟» لا تُولَّد لمتشابهات السورة مع نفسها)
const g = (id, surah, ayahs) => ({ groupId: id, scope: 'juzAmma', surahs: [surah, surah + 10], occurrences: [{ surahNumber: surah, ayahNumber: ayahs[0] }, { surahNumber: surah + 10, ayahNumber: ayahs[1] }] });
const single = { groupId: 'single', scope: 'internal', surahs: [100], occurrences: [{ surahNumber: 100, ayahNumber: 1 }, { surahNumber: 100, ayahNumber: 7 }] };
const groups = [g('a', 100, [1, 3]), g('b', 101, [2, 5]), g('c', 102, [1, 4]), g('d', 103, [1, 2]), g('out', 2, [5, 9]), single];
const now = 1_000_000_000_000, DAY = 86400000;
const rec = (grp, o) => ({ sig: groupSignature(grp), attempts: 4, correct: 2, box: 1, ...o });
const memo = new Set([100, 101, 102, 103, 110, 111, 112, 113]);

test('خارج المحفوظ لا يدخل', () => {
  assert.equal(groupInMemo(groups[4], memo), false);
  const p = planStudentRound(groups, [], memo, { now, limit: 10 });
  assert.ok(!p.groups.some(x => x.groupId === 'out'));
  // متشابهات السورة مع نفسها تدخل التدريب (بسؤال «أكمل الآية»)
  assert.ok(p.groups.some(x => x.groupId === 'single'));
  assert.equal(p.eligible, 5);
});

test('الترتيب: حان موعده ثم الضعيف ثم الجديد ثم المتقن', () => {
  const records = [
    rec(groups[0], { box: 5, correct: 4, dueAt: now + 10 * DAY }),        // a متقن
    rec(groups[1], { box: 1, correct: 1, dueAt: now + DAY }),             // b ضعيف
    rec(groups[2], { box: 3, correct: 3, dueAt: now - DAY }),             // c حان موعده
  ];
  const p = planStudentRound(groups, records, memo, { now, limit: 4 });
  assert.deepEqual(p.groups.map(x => x.groupId), ['c', 'b', 'single', 'd']);
  const s = studentCoachSummary(groups, records, memo, { now });
  assert.equal(s.total, 5); assert.equal(s.fresh, 2); assert.equal(s.due, 1); assert.equal(s.mastered, 1);
});

test('قارن بين الموضعين: تمييز الكلمات المختلفة فقط', () => {
  const [a, b] = diffWords(['إِنَّ ٱللَّهَ غَفُورٌ رَّحِيمٌ', 'إِنَّ ٱللَّهَ عَزِيزٌ حَكِيمٌ']);
  assert.deepEqual(a.filter(x => x.diff).map(x => x.w), ['غَفُورٌ', 'رَّحِيمٌ']);
  assert.deepEqual(b.filter(x => !x.diff).map(x => x.w), ['إِنَّ', 'ٱللَّهَ']);
});
