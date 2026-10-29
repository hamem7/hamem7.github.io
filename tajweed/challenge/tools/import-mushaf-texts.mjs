// tools/import-mushaf-texts.mjs — ينسخ حرفيًا نصوص قسم «تعرّف على مصحفك» المعتمدة في المنصة (core/i18nMushaf.js، قراءة فقط)
// إلى data/mushaf-texts.js: نصوص الأسئلة (mq_) والخيارات (mo_) والدروس (mul_) والتفسير (ex_) والواجهة (mu_). لا تعدّل الملف الناتج يدويًا.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { PLATFORM } from './lib/source.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(PLATFORM, 'core/i18nMushaf.js'), 'utf8');
const mod = await import('data:text/javascript;base64,' + Buffer.from(src).toString('base64'));
const { ar, en } = mod.MUSHAF_I18N; const out = {}; const missing = [];
for (const k of Object.keys(ar).sort()) {
  const m = k.match(/^tjw_(mq|mo|mul|ex|mu)_(.+)$/); if (!m) continue;
  if (typeof en[k] !== 'string') { missing.push(k); continue; }
  out[`${m[1]}_${m[2]}`] = { ar: ar[k], en: en[k] };
}
if (missing.length) { console.error('نقص ترجمة إنجليزية:', missing); process.exit(1); }
const body = `// data/mushaf-texts.js — مولَّد آليًا بـ tools/import-mushaf-texts.mjs من core/i18nMushaf.js في المنصة (نصوص معتمدة، منسوخة حرفيًا). لا تعدّله يدويًا.\nexport const TXT = ${JSON.stringify(out, null, 1)};\nexport const X = (k, vars = {}) => { const o = TXT[k]; if (!o) throw new Error('نص غير موجود: ' + k); const f = (s, l) => s.replace(/\\{(\\w+)\\}/g, (_, n) => (vars[n] == null ? '{' + n + '}' : typeof vars[n] === 'object' ? vars[n][l] : vars[n])); return { ar: f(o.ar, 'ar'), en: f(o.en, 'en') }; };\n`;
fs.writeFileSync(path.join(ROOT, 'data/mushaf-texts.js'), body);
console.log('نُقلت', Object.keys(out).length, 'عبارة');
