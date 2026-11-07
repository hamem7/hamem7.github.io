// tests/colormushaf.test.mjs — سلامة بيانات المصحف الملوّن: الفهرس، رموز الآيات، الخطوط وتجزئاتها، ومفتاح الألوان مقابل لوحة الخط.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto'; import { fileURLToPath } from 'node:url';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const { CM_SURAHS, CM_PALETTE } = await import('../data/mushaf-color-index.js');
const { GLYPHS, BASMALA } = await import('../data/mushaf-color-glyphs.js');
const { CM_LEGEND } = await import('../js/colormushaf.js').catch(() => ({ CM_LEGEND: null }));
const { UI_DICT } = await import('../js/i18n.js');
const errs = []; const fail = (m) => errs.push(m);
if (CM_SURAHS.length !== 114) fail('عدد السور');
let total = 0; const pages = new Set([BASMALA[0]]);
for (const s of CM_SURAHS) {
  const a = GLYPHS[s.n]; if (!a || a.length !== s.ayahs) { fail(`سورة ${s.n}: عدد الآيات`); continue; } total += a.length;
  a.forEach((parts, i) => { if (!parts.length || parts.length % 2) fail(`${s.n}:${i + 1} بنية`); for (let k = 0; k < parts.length; k += 2) { pages.add(parts[k]); if (!/^[-�]/.test(parts[k + 1])) fail(`${s.n}:${i + 1} رموز`); } });
}
if (total !== 6236) fail(`مجموع الآيات ${total}`);
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/qpc-v4-tajweed/manifest.json'), 'utf8'));
for (const p of pages) { const m = man[p]; if (!m) { fail(`خط الصفحة ${p} ناقص`); continue; } }
if (process.argv.includes('--hash')) for (const [p, m] of Object.entries(man)) { const h = crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, 'assets/qpc-v4-tajweed', m.file))).digest('hex'); if (h !== m.sha256) fail(`تجزئة الخط ${p}`); }
if (Object.keys(man).length !== 604) fail('عدد الخطوط');
if (CM_PALETTE.length !== 16) fail('لوحة الألوان');
const must = ['#b50000', '#f40000', '#ff7b00', '#ce9e00', '#09b000', '#2fadff', '#3f48e6'];
if (CM_LEGEND) { const hex = CM_LEGEND.flatMap((e) => e.c.map((i) => CM_PALETTE[i])); for (const h of must) if (!hex.includes(h)) fail(`لون غائب عن المفتاح ${h}`); }
for (const k of Object.keys(UI_DICT).filter((k) => k.startsWith('cm_'))) if (!UI_DICT[k].ar || !UI_DICT[k].en) fail(`ترجمة ${k}`);
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }
console.log(`✓ المصحف الملوّن: 114 سورة، ${total} آية، ${pages.size} خط مستعمل، 604 خط في المانيفست`);
