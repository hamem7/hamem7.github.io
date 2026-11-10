// tools/check-backend-version.mjs — يقارن VERSION في backend/Code.gs (المستودع) بما يعيده الخادم المنشور عبر ?action=ping.
// يكشف حالة «عدّلت Code.gs ونسيت نشر New version في Apps Script». الاستعمال: node tools/check-backend-version.mjs
// الخروج: 0 = متطابق، 1 = مختلف أو تعذّر الاتصال (لا يمنع الرفع؛ يعمل يدوياً وأسبوعياً في GitHub Actions).
import fs from 'node:fs';
const code = fs.readFileSync(new URL('../backend/Code.gs', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../core/api.js', import.meta.url), 'utf8');
const repoVer = (/var VERSION\s*=\s*'([^']+)'/.exec(code) || [])[1];
const url = (/export const DEFAULT_API_URL\s*=\s*'([^']+)'/.exec(api) || [])[1];
if (!repoVer || !url) { console.error('✗ تعذّر قراءة VERSION أو DEFAULT_API_URL من الملفات'); process.exit(1); }
let live;
try {
  const res = await fetch(url + '?action=ping', { redirect: 'follow', signal: AbortSignal.timeout(30000) });
  const j = await res.json();
  if (!j || j.ok !== true) throw new Error('ردّ غير متوقع: ' + JSON.stringify(j).slice(0, 200));
  live = j.version;
} catch (e) { console.error('✗ تعذّر الوصول للخادم المنشور: ' + (e && e.message || e)); process.exit(1); }
if (live !== repoVer) {
  console.error(`✗ الإصدار المنشور (${live}) يختلف عن المستودع (${repoVer}).\n  الحل: انسخ backend/Code.gs إلى محرر Apps Script ثم Deploy > Manage deployments > تعديل النشر الحالي > New version.`);
  process.exit(1);
}
console.log(`✓ الخادم المنشور مطابق للمستودع (الإصدار ${live})`);
