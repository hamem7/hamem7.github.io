// يولّد css/theme-dark-auto.css: نسخة داكنة تلقائية للألوان الفاتحة الثابتة في تنسيقات الشاشات التي لم تُحوَّل لمتغيرات الهوية بعد.
// التشغيل: node tools/gen-dark-theme.mjs   (يعيد كتابة الملف كاملاً — لا تعدّله يدوياً؛ التعديلات اليدوية تذهب إلى css/theme-dark.css الذي يُحمَّل بعده)
// القواعد: خلفية فاتحة ← خلفية داكنة بنفس الصبغة · نص داكن ← نص فاتح بنفس الصبغة · حدود فاتحة ← حدود داكنة.
// لا نلمس: التدرجات الملوّنة (هوية)، الخلفيات المتوسطة/الداكنة، ما يستعمل var(--…)، ولا ركن الأطفال (body.kids-theme).
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
// الملفات المشمولة (والباقي منسَّق يدوياً في css/theme-dark.css). أضف هنا أي شاشة جديدة بألوان ثابتة.
const INCLUDE = [
  'css/global.css', 'css/homeFast.css', 'css/mobile.css', 'css/components.css', 'css/similarities.css', 'css/tajweed.css', 'css/questionLayout.css',
  'css/sectionHint.css', 'css/welcomeBanner.css', 'css/guidedTour.css', 'css/gameFullscreen.css',
  'components/splash.html', 'components/privacy-screen.html',
  'settings/homework-prep.html', 'settings/homework-prep.js', 'settings/bulk-send.html',
  'student/homework-welcome.html',
  'dualtests/dual-test-setup.html', 'dualtests/dual-test-play.html', 'dualtests/dual-test-play.js', 'dualtests/dual-test-setup.js',
  'similarities/similarities-home.html', 'similarities/similarities-play.html', 'similarities/similarities-play.js', 'similarities/similarities.js',
  'tajweed/tajweed-activity.html', 'tajweed/tajweed-map.html',
  'games/adultGame.html', 'games/homework-play.html', 'games/homework-play.js',
  'certificates/certificates.js',
  'components/monthlyMemorizationPrompt.js', 'components/monthlyMemorizationBulkScreen.js', 'components/bulkSend.js', 'components/newStudentChoice.js',
  'components/monthlyReviewScreen.js', 'components/fixErrorsPrompt.js', 'components/pausedSession.js', 'components/weekSchedule.js',
  'components/homeQuickview.js', 'components/monthlyReportsHub.js', 'components/accountScreen.js', 'components/skillProfile.js',
  'components/teacherProfile.js', 'components/noteSheet.js', 'components/driveReconnectBanner.js',
  'student/student.js', 'core/homeworkNotifier.js',
  'components/questionTextRecord.js', 'components/similarGameHook.js', 'core/app.js', 'games/adultGame.js'
];
const CHECK = process.argv.includes('--check');   // فحص فقط (CI): لا يكتب شيئاً، يرجع 1 إن كان الملف المولَّد قديماً أو ظهرت شاشة بألوان فاتحة ثابتة غير مشمولة
// ملفات منسَّقة يدوياً للمظهر الداكن (css/theme-dark.css) أو مقصودة فاتحة — لا تحتاج التوليد التلقائي
const HANDLED = new Set(['css/home.css', 'css/adults.css', 'css/kids.css', 'css/tokens.css', 'css/fonts.css', 'css/theme-dark.css', 'css/theme-dark-auto.css',
  'student/my-students.html', 'student/all-students.html', 'student/login.html', 'student/student-profile.html', 'components/account-screen.html', 'settings/dashboard.html',
  'css/teacherAuthGate.css', 'core/dialog.js']);
const SCAN_SKIP_DIRS = new Set(['node_modules', '.git', 'previews', 'docs', 'tools', 'tests', 'backend', 'Dar-Ham-Homework-Lab', 'assets', 'icons', 'database', 'engine', 'similarities-data']);
// مقصودة فاتحة: ركن الأطفال، والمطبوعات (تقارير/شهادات تُصدَّر صوراً وPDF بورقة فاتحة دائماً)
const INTENTIONAL_LIGHT = [/^games\/kidsGame\./, /^reports\//, /^certificates\//, /^privacy\.html$/, /^index\.html$/, /^service-worker\.js$/, /kids/i];
const SCOPE = 'html[data-theme="dark"] body:not(.kids-theme) ';

// ---------- ألوان ----------
const NAMED = { white: '#ffffff', black: '#000000' };
function parseColor(s) {
  s = s.trim().toLowerCase();
  if (NAMED[s]) s = NAMED[s];
  let m = s.match(/^#([0-9a-f]{3,8})$/);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = [...h].map(c => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16), a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1 };
  }
  m = s.match(/^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+%?))?\s*\)$/);
  if (m) { let a = m[4] === undefined ? 1 : (m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4])); return { r: +m[1], g: +m[2], b: +m[3], a }; }
  return null;
}
function hsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if (mx !== mn) {
    const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60;
  }
  return { h, s, l };
}
const hex = (h, s, l) => {
  const a = s * Math.min(l, 1 - l), f = n => { const k = (n + h / 30) % 12; const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); return Math.round(c * 255).toString(16).padStart(2, '0'); };
  return '#' + f(0) + f(8) + f(4);
};
const withAlpha = (c, a) => a >= 1 ? c : `${c}${Math.round(a * 255).toString(16).padStart(2, '0')}`;

// خلفية فاتحة ← داكنة (null = لا تغيير)
function darkBg(c) {
  const { h, s, l } = hsl(c);
  if (l < 0.78) return null;
  if (s < 0.14) return withAlpha(l >= 0.985 ? '#14241f' : l >= 0.93 ? '#0f1d19' : l >= 0.85 ? '#1d2f28' : '#26382f', c.a);
  const warm = h >= 30 && h <= 75;               // الكريمي/الأصفر الفاتح يصير بنيّاً موحلاً إن حافظنا على إشباعه: نخفّفه ونميل به قليلاً للزمردي
  return withAlpha(hex(warm ? 150 : h, Math.min(s, 0.5) * (warm ? 0.3 : 0.7), 0.11 + (1 - l) * 0.55), c.a);
}
// نص داكن ← فاتح
function lightText(c) {
  const { h, s, l } = hsl(c);
  if (l >= 0.5 || c.a < 0.6) return null;
  return hex(h, Math.min(s, 0.6), Math.min(0.92, 0.97 - l * 0.7));
}
// حدود فاتحة ← داكنة
function darkBorder(c) {
  const { h, s, l } = hsl(c);
  if (l < 0.75) return null;
  return s < 0.14 ? withAlpha('#2a3d34', c.a) : withAlpha(hex(h, Math.min(s, 0.4) * 0.6, 0.2), c.a);
}

// متغيرات الهوية الثابتة (الزمردي) المستعملة كلون نص فوق سطح فاتح — تُعامل كأنها ألوان صريحة
const VARS = { 'var(--dh-emerald-900)': '#06231c', 'var(--dh-emerald-800)': '#0b3d30', 'var(--dh-emerald-700)': '#0d5c46', 'var(--dh-emerald-600)': '#147c5e', 'var(--primary)': '#0d5c46', 'var(--secondary)': '#147c5e' };
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|\bwhite\b|\bblack\b/g;
// var(--اسم-خاص, #لون) لمتغير غير مُدرج في رموز الهوية: نعامل اللون الاحتياطي كأنه الصريح (الرموز --dh-* و--tjw-* تنقلب وحدها)
const unwrapVar = v => v.replace(/var\(\s*--(?!dh-|tjw-)[\w-]+\s*,\s*((?:#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|white|black))\s*\)/g, '$1');
function mapBackground(v) {
  v = unwrapVar(v);
  if (/url\(/.test(v)) return { skip: true };
  if (/var\(\s*--(?:dh-(?:gold|emerald)-\d+|primary|secondary|gold)\b/.test(v)) return { dark: true, skip: true };   // خلفية هوية ثابتة (زمردي/ذهبي): لا تنقلب فلا نقلب نصّها
  if (/var\(/.test(v) && !/gradient\(/.test(v)) return { skip: true };   // var وحده: ينقلب بالرموز؛ تدرّج يخلط var مع ألوان صريحة: نحوّل الصريحة فقط
  const cols = v.match(COLOR_RE) || [];
  if (!cols.length) return { skip: true };
  const isGrad = /gradient\(/.test(v);
  let allLight = true, out = v;
  for (const t of cols) { const c = parseColor(t); if (!c) return { skip: true }; if (c.a < 0.05) continue; if (hsl(c).l < 0.78) allLight = false; }
  if (!allLight) return { dark: true, skip: true };           // تدرّج/لون هوية: نتركه ونمنع تحويل النص داخله
  out = v.replace(COLOR_RE, t => { const c = parseColor(t); return c && c.a >= 0.05 ? (darkBg(c) || t) : t; });
  return { value: out, light: true, isGrad };
}

// ---------- استخراج القواعد ----------
function cssSources(file, text) {
  if (file.endsWith('.css')) return [text];
  // html/js: نمرّ على النص كله ونلتقط أي «محدِّد { تصريحات }» يشبه CSS
  return [text];
}
const PROPS = /^(background(?:-color)?|color|border(?:-(?:top|bottom|left|right|inline-start|inline-end|block-start|block-end))?(?:-color)?)$/;
const RULE_RE = /([^{}]+)\{([^{}]*)\}/g;
function looksLikeSelector(sel) {
  sel = sel.trim();
  if (!sel || sel.length > 400) return false;
  if (/[;`'"]|\$\{|=>|\bfunction\b|\breturn\b|\bif\b|\belse\b|\bfor\b|\bwhile\b|^@|\bimport\b|\bconst\b|\blet\b/.test(sel)) return false;
  if (/^(from|to|\d+%)(\s*,\s*(from|to|\d+%))*$/.test(sel)) return false;
  return /^[.#\w\[\]*:>+~,\s()\-="^$|\\@]+$/.test(sel.replace(/\s+/g, ' ')) && /[.#\[\w]/.test(sel);
}
function parseDecls(body) {
  const out = [];
  for (const d of body.split(';')) {
    const i = d.indexOf(':'); if (i < 0) continue;
    const prop = d.slice(0, i).trim().toLowerCase(), val = d.slice(i + 1).replace(/!important/i, '').trim();
    if (!/^[a-z-]+$/.test(prop) || !val || /\$\{/.test(val)) continue;
    out.push([prop, val]);
  }
  return out;
}
function splitSelectors(sel) {
  const parts = []; let depth = 0, cur = '';
  for (const ch of sel) { if (ch === '(' || ch === '[') depth++; if (ch === ')' || ch === ']') depth--; if (ch === ',' && !depth) { parts.push(cur); cur = ''; } else cur += ch; }
  parts.push(cur); return parts.map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

function generate(file) {
  const text = readFileSync(join(ROOT, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const rules = []; const seen = new Set();
  for (const src of cssSources(file, text)) {
    let m; RULE_RE.lastIndex = 0;
    while ((m = RULE_RE.exec(src))) {
      let sel = m[1]; const last = sel.lastIndexOf('\n'); // أحياناً يلتصق بالمحدد سطر قبله من كود آخر
      if (!looksLikeSelector(sel)) { sel = sel.split(/[;}`]/).pop(); if (!looksLikeSelector(sel)) continue; }
      const decls = parseDecls(m[2]).filter(([p]) => PROPS.test(p));
      if (!decls.length) continue;
      const lines = []; let bgState = 'none';
      for (const [p, v] of decls) if (p.startsWith('background')) {
        const r = mapBackground(v);
        if (r.value) { lines.push(`${p}: ${r.value} !important`); bgState = 'light'; } else bgState = r.dark ? 'dark' : (bgState === 'none' ? 'other' : bgState);
      }
      for (const [p, v] of decls) {
        if (p === 'color') {
          if (bgState === 'dark' || bgState === 'other' && false) continue;
          const vk = v.replace(/\s+/g, '').replace(/^var\((--[\w-]+),.*\)$/, 'var($1)');   // var(--dh-emerald-700, #0d5c46) ≡ var(--dh-emerald-700)
          if (/var\(/.test(v) && !VARS[vk]) continue;
          const c = parseColor(VARS[vk] || v);
          // نص بنّي غامق أو زر بلا خلفية في نفس القاعدة: غالباً فوق خلفية ذهبية معرَّفة في قاعدة أخرى فلا نقلبه
          if (bgState === 'none' && c) { const k = hsl(c); if (k.h >= 25 && k.h <= 55 && k.s > 0.4 && k.l < 0.3) continue; if (/btn|button|cta|gold/i.test(sel)) continue; }
          const n = c && lightText(c);
          if (n) lines.push(`color: ${n} !important`);
        } else if (p.startsWith('border')) {
          if (/var\(/.test(v)) continue;
          const nv = v.replace(COLOR_RE, t => { const c = parseColor(t); return c && darkBorder(c) || t; });
          if (nv !== v) lines.push(`${p}: ${nv} !important`);
        }
      }
      if (!lines.length) continue;
      const sels = splitSelectors(sel).filter(s => !/kids|\.kid/.test(s)).map(s => SCOPE + s);
      if (!sels.length) continue;
      const body = lines.join('; ');
      const key = sels.join(',') + '{' + body;
      if (seen.has(key)) continue; seen.add(key);
      rules.push(`${sels.join(',\n')} { ${body}; }`);
    }
  }
  return rules;
}

// ---------- أنماط inline (style="…") في القوالب: محدِّدات [style*="…"] بنفس النص المكتوب في المصدر ----------
function generateInline(file) {
  const text = readFileSync(join(ROOT, file), 'utf8');
  const rules = []; const seen = new Set();
  const re = /style\s*=\s*(?:"([^"]*)"|'([^']*)')/g; let m;
  while ((m = re.exec(text))) {
    const attr = m[1] ?? m[2];
    if (/\$\{|\+/.test(attr) && /\$\{/.test(attr)) { /* قد تحتوي أجزاء ديناميكية: نعالج التصريحات الصريحة فقط */ }
    const hasGrad = /gradient|url\(/.test(attr);
    for (const raw of attr.split(';')) {
      const i = raw.indexOf(':'); if (i < 0 || /\$\{/.test(raw)) continue;
      const prop = raw.slice(0, i).trim().toLowerCase(), val = raw.slice(i + 1).replace(/!important/i, '').trim();
      const frag = raw.trim().replace(/!important/i, '').trim();
      if (!frag || /["\\]/.test(frag)) continue;
      let decl = null;
      if (/^background(-color)?$/.test(prop)) { const r = mapBackground(val); if (r.value) decl = `${prop}: ${r.value} !important`; }
      else if (prop === 'color' && !hasGrad) {
        const c = parseColor(val); if (c) { const k = hsl(c); const n = lightText(c); if (n && !(k.h >= 25 && k.h <= 55 && k.s > 0.4 && k.l < 0.3)) decl = `color: ${n} !important`; }
      } else if (/^border/.test(prop) && !/var\(/.test(val)) {
        const nv = val.replace(COLOR_RE, t => { const c = parseColor(t); return c && darkBorder(c) || t; }); if (nv !== val) decl = `${prop}: ${nv} !important`;
      }
      if (!decl) continue;
      const base = frag.replace(/\s+/g, ' ');
      for (const variant of new Set([frag, base])) {
        const rule = `${SCOPE}[style*="${variant}"]${prop === 'color' ? ':not([style*="gradient"])' : ''} { ${decl}; }`;
        if (!seen.has(rule)) { seen.add(rule); rules.push(rule); }
      }
    }
  }
  return rules;
}

const out = [`/* css/theme-dark-auto.css — مُولَّد تلقائياً بـ node tools/gen-dark-theme.mjs — لا تعدّله يدوياً (يُعاد كتابته كاملاً).
   النسخة الداكنة للألوان الفاتحة الثابتة في الشاشات التي لم تُحوَّل لمتغيرات الهوية. التعديلات اليدوية: css/theme-dark.css (يُحمَّل بعده). */`];
let total = 0;
for (const f of INCLUDE) {
  let r; try { statSync(join(ROOT, f)); r = generate(f).concat(f.endsWith('.css') ? [] : generateInline(f)); } catch (e) { console.error('تعذر:', f, e.message); continue; }
  if (!r.length) continue;
  total += r.length;
  out.push(`\n/* ===== ${f} (${r.length}) ===== */\n` + r.join('\n'));
}
const generated = out.join('\n') + '\n';
if (!CHECK) {
  writeFileSync(join(ROOT, 'css/theme-dark-auto.css'), generated);
  console.log(`✓ css/theme-dark-auto.css — ${total} قاعدة من ${INCLUDE.length} ملف`);
}

if (CHECK) {
  const errors = [];
  let current = ''; try { current = readFileSync(join(ROOT, 'css/theme-dark-auto.css'), 'utf8'); } catch (e) { /* مفقود */ }
  if (current !== generated) errors.push('css/theme-dark-auto.css قديم أو مفقود — شغّل: node tools/gen-dark-theme.mjs ثم ارفع الناتج');
  // شاشة/ملف بألوان فاتحة ثابتة لم يُدرَج في INCLUDE ولا في HANDLED
  const covered = new Set([...INCLUDE, ...HANDLED]);
  const uncovered = [];
  (function walk(d) {
    for (const n of readdirSync(d)) {
      if (SCAN_SKIP_DIRS.has(n)) continue;
      const p = join(d, n);
      if (statSync(p).isDirectory()) { walk(p); continue; }
      if (!/\.(css|html|js)$/.test(n)) continue;
      const rel = relative(ROOT, p).replace(/\\/g, '/');
      if (covered.has(rel) || INTENTIONAL_LIGHT.some(re => re.test(rel))) continue;
      let n2 = 0; try { n2 = generate(rel).length + (rel.endsWith('.css') ? 0 : generateInline(rel).length); } catch (e) { /* تجاهل */ }
      if (n2) uncovered.push(`${rel} (${n2} لون فاتح ثابت)`);
    }
  })(ROOT);
  for (const u of uncovered) errors.push(`${u} — أضِفه إلى INCLUDE في tools/gen-dark-theme.mjs (للتوليد التلقائي) أو إلى HANDLED إن نسّقته يدوياً في css/theme-dark.css، أو استعمل رموز --dh-*`);
  if (errors.length) { console.error('✗ المظهر الداكن:\n' + errors.join('\n')); process.exit(1); }
  console.log('✓ المظهر الداكن: الملف المولَّد محدَّث ولا توجد شاشة بألوان فاتحة غير مشمولة');
}
