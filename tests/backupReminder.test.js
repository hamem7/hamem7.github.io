// tests/backupReminder.test.js — node tests/backupReminder.test.js
import assert from 'node:assert/strict';
import { backupReminder, GROWTH_NOW, GROWTH_AFTER_DAYS } from '../engine/backupReminder.js';
import { accountProgress } from '../engine/accountProgress.js';

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; console.log('✅', name); } catch (e) { fail++; console.log('❌', name, '\n    ', e.message); } }

test('بلا طلاب أو بلا نسخة أو بلا معلومة = لا تذكير', () => {
    assert.equal(backupReminder({ students: 0, backedStudents: 0, ageDays: 1 }).remind, false);
    assert.equal(backupReminder({ students: 9, backedStudents: 0, ageDays: null }).remind, false);
    assert.equal(backupReminder({ students: 9, backedStudents: null, ageDays: 1 }).remind, false);
});
test('زيادة كبيرة تُذكّر فوراً', () => {
    const r = backupReminder({ students: 10 + GROWTH_NOW, backedStudents: 10, ageDays: 0 });
    assert.deepEqual(r, { remind: true, reason: 'growth', added: GROWTH_NOW });
});
test('زيادة صغيرة لا تُذكّر إلا بعد مدة', () => {
    assert.equal(backupReminder({ students: 11, backedStudents: 10, ageDays: GROWTH_AFTER_DAYS - 1 }).remind, false);
    assert.equal(backupReminder({ students: 11, backedStudents: 10, ageDays: GROWTH_AFTER_DAYS }).remind, true);
});
test('لا زيادة أو نقص = لا تذكير', () => {
    assert.equal(backupReminder({ students: 10, backedStudents: 10, ageDays: 6 }).remind, false);
    assert.equal(backupReminder({ students: 8, backedStudents: 10, ageDays: 6 }).added, 0);
});
test('اكتمال الحساب: النسبة والخطوة التالية', () => {
    assert.deepEqual(accountProgress({}).pct, 0);
    assert.equal(accountProgress({}).next, 'profile');
    const p = accountProgress({ name: 'a', photo: 'p', dob: 'd', email: 'e@x.com' });
    assert.equal(p.pct, 50); assert.equal(p.next, 'drive');
    const all = accountProgress({ name: 'a', photo: 'p', dob: 'd', email: 'e', driveOn: true, hasBackup: true });
    assert.equal(all.pct, 100); assert.equal(all.next, null);
});
test('الصورة الناقصة تُبقي «البيانات» غير مكتملة', () => assert.equal(accountProgress({ name: 'a', dob: 'd' }).items[0].done, false));
console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
