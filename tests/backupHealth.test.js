// tests/backupHealth.test.js — node tests/backupHealth.test.js
import assert from 'node:assert/strict';
import { backupHealth, WARN_AFTER_DAYS } from '../engine/backupHealth.js';

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; console.log('✅', name); } catch (e) { fail++; console.log('❌', name, '\n    ', e.message); } }
const DAY = 24 * 3600 * 1000;
const NOW = Date.UTC(2026, 9, 16, 12);
const ago = (d) => new Date(NOW - d * DAY).toISOString();

test('لا نسخة أبداً = bad', () => {
    assert.equal(backupHealth({ now: NOW }).level, 'bad');
    assert.equal(backupHealth({ driveAt: null, localAt: '', now: NOW }).level, 'bad');
    assert.equal(backupHealth({ driveAt: 'غير صالح', now: NOW }).level, 'bad');
});
test('نسخة حديثة على Drive فقط = ok', () => {
    const h = backupHealth({ driveAt: ago(1), now: NOW });
    assert.equal(h.level, 'ok'); assert.equal(h.driveAgeDays, 1); assert.equal(h.localAgeDays, null);
});
test('نسخة حديثة على الجهاز فقط = ok', () => assert.equal(backupHealth({ localAt: ago(3), now: NOW }).level, 'ok'));
test('الحد: 7 أيام = ok و8 = warn', () => {
    assert.equal(WARN_AFTER_DAYS, 7);
    assert.equal(backupHealth({ driveAt: ago(7), now: NOW }).level, 'ok');
    assert.equal(backupHealth({ driveAt: ago(8), now: NOW }).level, 'warn');
});
test('الأحدث من الاثنين هو الحاسم', () => {
    const h = backupHealth({ driveAt: ago(40), localAt: ago(2), now: NOW });
    assert.equal(h.level, 'ok'); assert.equal(h.ageDays, 2); assert.equal(h.driveAgeDays, 40); assert.equal(h.localAgeDays, 2);
});
test('الاثنان قديمان = warn', () => assert.equal(backupHealth({ driveAt: ago(12), localAt: ago(40), now: NOW }).level, 'warn'));
test('مللي ثانية كمدخل، وتاريخ مستقبلي لا يكسر', () => {
    assert.equal(backupHealth({ driveAt: NOW - DAY, now: NOW }).level, 'ok');
    assert.equal(backupHealth({ driveAt: NOW + DAY, now: NOW }).ageDays, 0);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
