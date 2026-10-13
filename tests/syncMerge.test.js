// tests/syncMerge.test.js — node tests/syncMerge.test.js
import assert from 'node:assert/strict';
import {
    stableStringify, hashOf, eventKey, mergeEvents, mergeHistory, profileOf, adoptByUniqueName,
    partitionItems, profileKey, isProfileKey, uidOfKey, kindOfKey, newSyncUid
} from '../engine/syncMerge.js';

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; console.log('✅', name); } catch (e) { fail++; console.log('❌', name, '\n    ', e.message); } }

const ev = (o) => ({ ts: 1000, source: 'game', refId: 'g1', qid: 'g0', surah: 1, ayah: 1, skill: 'recall', fmt: 'dropdown', score: 1, weight: 1, ...o });

test('stableStringify لا يتأثر بترتيب المفاتيح ويتجاهل undefined', () => {
    assert.equal(stableStringify({ b: 1, a: [2, { d: 1, c: undefined }] }), stableStringify({ a: [2, { c: undefined, d: 1 }], b: 1 }));
    assert.notEqual(hashOf({ a: 1 }), hashOf({ a: 2 }));
});

test('مفتاح الحدث يتجاهل id وstudentId (يختلفان بين الأجهزة)', () => {
    assert.equal(eventKey({ ...ev(), id: 5, studentId: '7' }), eventKey({ ...ev(), id: 99, studentId: '12' }));
});

test('mergeEvents: اتحاد بلا تكرار، وتُضاف البعيدة الجديدة فقط، ولا يتغير شيء عند إعادة الدمج (idempotent)', () => {
    const local = [ev({ qid: 'a' }), ev({ qid: 'b' })].map((e, i) => ({ ...e, id: i + 1, studentId: '3' }));
    const remote = [ev({ qid: 'b' }), ev({ qid: 'c' })].map((e, i) => ({ ...e, id: i + 1, studentId: '8' }));
    const r = mergeEvents(local, remote);
    assert.equal(r.merged.length, 3);
    assert.deepEqual(r.toAdd.map(e => e.qid), ['c']);
    assert.ok(r.toAdd.every(e => !('id' in e) && !('studentId' in e)));
    const again = mergeEvents(r.merged, remote);
    assert.equal(again.toAdd.length, 0); assert.equal(again.merged.length, 3);
});

test('mergeEvents: الترتيب لا يهم (commutative)', () => {
    const A = [ev({ qid: 'a', ts: 5 }), ev({ qid: 'b', ts: 3 })], B = [ev({ qid: 'c', ts: 4 }), ev({ qid: 'a', ts: 5 })];
    assert.deepEqual(mergeEvents(A, B).merged, mergeEvents(B, A).merged);
});

test('mergeEvents: إعادة اعتماد التسليم → أحدث نسخة فقط (لا تضاعف الأحداث) وتُحذف المحلية القديمة', () => {
    const old = [ev({ source: 'homework', refId: 'S1', qid: 'q1', ts: 100, score: 0 }), ev({ source: 'homework', refId: 'S1', qid: 'q2', ts: 100, score: 0 })];
    const fresh = [ev({ source: 'homework', refId: 'S1', qid: 'q1', ts: 200, score: 1 }), ev({ source: 'homework', refId: 'S1', qid: 'q2', ts: 200, score: 1 })];
    const r = mergeEvents(old, fresh);
    assert.equal(r.merged.length, 2); assert.ok(r.merged.every(e => e.ts === 200));
    assert.equal(r.toAdd.length, 2);
    assert.deepEqual(r.supersededGroups, [{ refId: 'S1', sources: ['homework'] }]);
    const rev = mergeEvents(fresh, old);                      // الجهاز الأحدث يستقبل القديم: لا يتغير شيء محلياً
    assert.equal(rev.merged.length, 2); assert.equal(rev.toAdd.length, 0); assert.equal(rev.supersededGroups.length, 0);
});

test('mergeEvents: حدث حيّ homework يفوز على backfill_homework لنفس التسليم', () => {
    const bf = [ev({ source: 'backfill_homework', refId: 'S2', ts: 999999, qid: 'q' })];
    const live = [ev({ source: 'homework', refId: 'S2', ts: 10, qid: 'q' })];
    const r = mergeEvents(bf, live);
    assert.deepEqual(r.merged.map(e => e.source), ['homework']);
    assert.deepEqual(r.supersededGroups, [{ refId: 'S2', sources: ['backfill_homework'] }]);
});

test('mergeEvents: مدخلات فارغة/null آمنة', () => {
    assert.deepEqual(mergeEvents(null, undefined), { merged: [], toAdd: [], supersededGroups: [] });
    assert.equal(mergeEvents([ev()], []).toAdd.length, 0);
});

test('mergeHistory: اتحاد بـsubmissionId، الأحدث يفوز، مدخلات بلا submissionId تُدمج بالمحتوى', () => {
    const a = [{ submissionId: 'S1', score: 50, timestamp: 100 }, { range: 'لعبة', score: 80 }];
    const b = [{ submissionId: 'S1', score: 90, timestamp: 200 }, { submissionId: 'S2', score: 70, timestamp: 150 }, { range: 'لعبة', score: 80 }];
    const r = mergeHistory(a, b);
    assert.equal(r.merged.length, 3); assert.equal(r.added, 1); assert.equal(r.changed, 1);
    assert.equal(r.merged.find(h => h.submissionId === 'S1').score, 90);
    const old = mergeHistory(b, a);                                  // الأقدم لا يطغى على الأحدث
    assert.equal(old.merged.find(h => h.submissionId === 'S1').score, 90);
    assert.deepEqual(mergeHistory(r.merged, b).merged, r.merged);    // idempotent
});

test('profileOf يستثني id والصورة ويحتفظ بباقي الحقول', () => {
    const p = profileOf({ id: 4, name: 'سارة', avatar: 'data:...', totalScore: 12, weaknesses: [1], syncUid: 'Sx' });
    assert.deepEqual(Object.keys(p).sort(), ['name', 'syncUid', 'totalScore', 'weaknesses']);
});

test('adoptByUniqueName: يطابق الاسم الفريد من الجهتين فقط', () => {
    const remote = [{ uid: 'U1', name: 'أحمد  علي' }, { uid: 'U2', name: 'سارة' }, { uid: 'U3', name: 'سارة' }, { uid: 'U4', name: 'خالد' }];
    const local = [{ id: 1, name: 'أحمد علي' }, { id: 2, name: 'سارة' }, { id: 3, name: 'خالد', syncUid: 'U4' }, { id: 4, name: 'عمر' }];
    const m = adoptByUniqueName(remote, local);
    assert.equal(m.get(1), 'U1');            // فريد
    assert.ok(!m.has(2));                    // «سارة» مكررة عن بُعد
    assert.ok(!m.has(3));                    // مرتبط بالفعل
    assert.ok(!m.has(4));                    // لا مقابل
});

test('partitionItems: بالشهر، حتمي، ويُقسَّم عند تجاوز الحد، بلا فقد عناصر', () => {
    const base = Date.UTC(2026, 9, 5);
    const items = Array.from({ length: 50 }, (_, i) => ({ ts: base + i, pad: 'x'.repeat(100) }));
    items.push({ ts: Date.UTC(2026, 8, 1) });
    const p = partitionItems('Su', 'e', items, i => i.ts, 2000);
    assert.ok(p.has('Su:e:2026-09'));
    const octKeys = [...p.keys()].filter(k => k.startsWith('Su:e:2026-10'));
    assert.ok(octKeys.length > 1);
    assert.equal([...p.values()].reduce((n, a) => n + a.length, 0), 51);
    [...p.values()].forEach(a => assert.ok(JSON.stringify(a).length <= 2000 + 150));
    const again = partitionItems('Su', 'e', items, i => i.ts, 2000);
    assert.deepEqual([...again.keys()], [...p.keys()]);
    assert.equal(partitionItems('Su', 'e', [{ }], i => i.ts).has('Su:e:0000-00'), true);
});

test('مفاتيح: profileKey/uidOfKey/kindOfKey/isProfileKey ومولّد المعرّف', () => {
    assert.equal(profileKey('Sab'), 'Sab:s'); assert.ok(isProfileKey('Sab:s')); assert.ok(!isProfileKey('Sab:e:2026-10'));
    assert.equal(uidOfKey('Sab:h:2026-10.1'), 'Sab'); assert.equal(kindOfKey('Sab:h:2026-10.1'), 'h'); assert.equal(kindOfKey('Sab:s'), 's'); assert.equal(kindOfKey('Sab:zz'), null);
    assert.match(newSyncUid(), /^S[0-9a-f]{16}$/);
    assert.notEqual(newSyncUid(), newSyncUid());
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
