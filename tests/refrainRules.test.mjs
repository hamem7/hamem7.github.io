// يفحص أن آية التكرار (الرحمن/المرسلات) لا تُختار هدفاً لأسئلة الألعاب — على نص المصحف الحقيقي.
import fs from 'fs';
import assert from 'assert';
import { isRefrainAyah, excludeRefrainAyahs, hasDuplicateAyahTexts } from '../engine/refrainRules.js';

const d = JSON.parse(fs.readFileSync(new URL('../database/quran-uthmani.json', import.meta.url), 'utf8'));
const surahs = d.data ? d.data.surahs : (d.surahs || d);
const pool = n => surahs.find(s => s.number === n).ayahs.map(a => ({ ...a, surahNumber: n }));

assert.strictEqual(pool(55).filter(isRefrainAyah).length, 31, 'الرحمن: ٣١ آية تكرار');
assert.strictEqual(excludeRefrainAyahs(pool(55)).length, 47, 'الرحمن: ٤٧ آية فريدة تبقى');
assert.ok(excludeRefrainAyahs(pool(55)).every(a => !isRefrainAyah(a)));
assert.strictEqual(pool(77).filter(isRefrainAyah).length, 10, 'المرسلات: ١٠');
assert.strictEqual(pool(2).filter(isRefrainAyah).length, 0);
assert.ok(hasDuplicateAyahTexts(pool(55).slice(12, 16)), 'نافذة فيها تكرار');
assert.ok(!hasDuplicateAyahTexts(pool(55).slice(0, 4)));
console.log('refrainRules OK');
