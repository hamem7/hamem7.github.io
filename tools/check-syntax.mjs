// tools/check-syntax.mjs — يفحص صياغة كل ملفات JS (وحدات ES) في المنصة؛ يفشل عند أول خطأ صياغة (فاصلة ناقصة، قوس غير مغلق...).
// الاستعمال: node tools/check-syntax.mjs
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
const files = execFileSync('git', ['ls-files', '*.js', '*.mjs'], { encoding: 'utf8' }).split('\n')
  .filter(f => f && !f.startsWith('backend/') && !f.startsWith('Dar-Ham-Homework-Lab/') && fs.existsSync(f));
let bad = 0;
for (const f of files) {
  const r = spawnSync(process.execPath, ['--input-type=module', '--check'], { input: fs.readFileSync(f), encoding: 'utf8' });
  if (r.status !== 0) { bad++; console.error(`✗ ${f}\n${(r.stderr || '').split('\n').slice(0, 4).join('\n')}`); }
}
if (bad) { console.error(`\n✗ ${bad} ملف فيه خطأ صياغة`); process.exit(1); }
console.log(`✓ الصياغة سليمة في ${files.length} ملف JS`);
