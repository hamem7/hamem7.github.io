// يفحص توحيد ترويسة المنصة. التشغيل: node tools/check-header.mjs  (يرجع 1 عند أي مخالفة)
// القاعدة (راجع CLAUDE.md): الصفحة الكاملة (<html>) تحتوي نسخة #main-header المعتمدة من index.html؛
// الشاشات الجزئية (fragments) التي تُحقن داخل #app-root لا تحتوي ترويسة خاصة بها إطلاقًا.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SKIP = new Set(['node_modules', '.git', 'previews', 'docs', 'tools', 'Dar-Ham-Homework-Lab']);
const REQUIRED = ['id="main-header"', 'class="home-header-brand', 'data-ham-logo="full"', 'id="header-title"', 'id="top-student-name"',
  'class="header-actions"', 'id="header-home-btn"', 'id="header-account-btn"', 'id="theme-toggle-btn"', 'id="lang-toggle-btn"'];
const FORBIDDEN = ['class="dh-header"', 'class="dh-brand"', 'class="dh-logo"'];

const files = [];
(function walk(d) {
  for (const n of readdirSync(d)) {
    if (SKIP.has(n)) continue;
    const p = join(d, n);
    if (statSync(p).isDirectory()) walk(p); else if (n.endsWith('.html')) files.push(p);
  }
})(ROOT);

const errors = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const rel = relative(ROOT, f);
  const full = /<html[\s>]/i.test(src);
  for (const x of FORBIDDEN) if (src.includes(x)) errors.push(`${rel}: ترويسة مستقلة غير معتمدة (${x}) — استخدم #main-header`);
  if (full) {
    for (const x of REQUIRED) if (!src.includes(x)) errors.push(`${rel}: ينقص الترويسة المعتمدة العنصر ${x}`);
    if (!src.includes('css/home.css')) errors.push(`${rel}: يجب تحميل css/home.css (تنسيق الترويسة)`);
  } else if (src.includes('id="main-header"')) {
    errors.push(`${rel}: شاشة جزئية لا يجوز أن تحتوي #main-header (الترويسة في index.html)`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`✓ الترويسة موحّدة في ${files.length} ملف HTML`);
