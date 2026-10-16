// tests/backupRetention.test.js — node tests/backupRetention.test.js
import assert from 'node:assert/strict';
import { selectBackupsToDelete } from '../engine/backupRetention.js';

let pass = 0, fail = 0;
function test(name, fn) { try { fn(); pass++; console.log('✅', name); } catch (e) { fail++; console.log('❌', name, '\n    ', e.message); } }

const DAY = 24 * 3600 * 1000;
const NOW = Date.UTC(2026, 9, 16, 12);
const daily = (n) => Array.from({ length: n }, (_, i) => ({ id: 'b' + i, createdTime: NOW - i * DAY }));

test('7 نسخ أو أقل: لا يُحذف شيء', () => {
    assert.deepEqual(selectBackupsToDelete(daily(7), NOW), []);
    assert.deepEqual(selectBackupsToDelete([], NOW), []);
    assert.deepEqual(selectBackupsToDelete(null, NOW), []);
});
test('أحدث 7 نسخ تبقى دائماً', () => {
    const del = selectBackupsToDelete(daily(60), NOW);
    for (let i = 0; i < 7; i++) assert.ok(!del.includes('b' + i), 'b' + i);
});
test('نسخ يومية 60 يوماً: يُحذف الكثير ويبقى أسبوعية وشهرية', () => {
    const del = new Set(selectBackupsToDelete(daily(60), NOW));
    const kept = daily(60).filter(x => !del.has(x.id));
    assert.ok(kept.length >= 7 && kept.length <= 7 + 4 + 6, 'kept=' + kept.length);
    assert.ok(del.size > 0);
});
test('نسخة قديمة جداً (أكثر من 6 أشهر) تُحذف ولا تُحذف الأحدث', () => {
    const items = [...daily(7), { id: 'old', createdTime: NOW - 400 * DAY }];
    assert.deepEqual(selectBackupsToDelete(items, NOW), ['old']);
});
test('حقول ISO وحقول غير صالحة تُتجاهل بأمان', () => {
    const items = [...daily(8).map(x => ({ ...x, createdTime: new Date(x.createdTime).toISOString() })), { id: 'bad', createdTime: 'xx' }, { createdTime: NOW }];
    const del = selectBackupsToDelete(items, NOW);
    assert.ok(!del.includes('bad'));
});
test('لا تحذف أبداً أحدث نسخة حتى لو كل النسخ قديمة', () => {
    const items = Array.from({ length: 10 }, (_, i) => ({ id: 'o' + i, createdTime: NOW - (500 + i) * DAY }));
    const del = selectBackupsToDelete(items, NOW);
    assert.ok(!del.includes('o0'));
    assert.ok(del.length <= 3);   // آخر 7 تبقى
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
