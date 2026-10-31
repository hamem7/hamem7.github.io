// tests/monthlyThemes.test.js — تشغيل: node tests/monthlyThemes.test.js
// يتحقق من ثيمات الواجب الشهرية (config/monthly-themes.js): 12 شهراً هجرياً كاملة، ثنائية اللغة، بألوان فاتحة/داكنة مقروءة، وبملفات صور موجودة.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEMES, FLAGS, COLOR_KEYS, hijriMonth, activeMonth, getTheme, themeColors, assetUrl, encouragement } from '../config/monthly-themes.js';
const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log('✅', m); } else { fail++; console.log('❌', m); } };

const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => (v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)); return .2126 * r + .7152 * g + .0722 * b; };
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + .05) / (y + .05); };

ok(THEMES.length === 12 && THEMES.every((t, i) => t.n === i + 1), '12 ثيمة مرقّمة 1..12 بالترتيب');
for (const th of THEMES) {
    for (const lang of ['ar', 'en']) {
        const x = th[lang];
        ok(['name', 'occ', 'badge', 'title', 'sub', 'done', 'medal'].every(k => typeof x[k] === 'string' && x[k].trim()) && Array.isArray(x.enc) && x.enc.length === 3 && x.enc.every(e => e.trim()),
            `شهر ${th.n} (${lang}): كل النصوص موجودة`);
    }
    ok(th.L.length === 12 && th.D.length === 12 && [...th.L, ...th.D].every(c => /^#[0-9a-f]{6}$/i.test(c)), `شهر ${th.n}: 12 لوناً فاتحاً وداكناً صحيحة`);
    for (const [mode, dark] of [['فاتح', false], ['داكن', true]]) {
        const c = themeColors(th, dark);
        ok(contrast(c.ink, c.surface) >= 7, `شهر ${th.n} ${mode}: نص/سطح ≥ 7`);
        ok(contrast(c.accent, c.surface) >= 4.5, `شهر ${th.n} ${mode}: لون الهوية على السطح ≥ 4.5`);
        ok(contrast(c.onAccent, c.accent) >= 4.5, `شهر ${th.n} ${mode}: نص زر الهوية ≥ 4.5`);
        ok(contrast(c.onHi, c.hi) >= 4.5, `شهر ${th.n} ${mode}: نص الزر الذهبي ≥ 4.5`);
    }
    for (const kind of ['hero', 'medal']) {
        const need = kind === 'hero' || FLAGS.MEDALP[th.n] || FLAGS.MEDAL_IMG[th.n];
        if (need) ok(fs.existsSync(path.join(REPO, 'assets/themes', `m${String(th.n).padStart(2, '0')}-${kind}.webp`)), `شهر ${th.n}: ملف ${kind} موجود`);
    }
    for (const [flag, kind] of [['STRIP', 'strip'], ['DECO', 'deco'], ['LOGO_END', 'logo']]) {
        if (FLAGS[flag][th.n]) ok(fs.existsSync(path.join(REPO, 'assets/themes', `m${String(th.n).padStart(2, '0')}-${kind}.webp`)), `شهر ${th.n}: ملف ${kind} موجود`);
    }
    if (FLAGS.ORI[th.n]) ok(fs.existsSync(path.join(REPO, 'assets/themes', `m${String(th.n).padStart(2, '0')}-corner.webp`)), `شهر ${th.n}: ملف corner موجود`);
}

// الشهر الهجري (أم القرى): 1 محرّم 1447 = 2025-06-26 تقريباً، ورمضان 1447 ≈ 2026-02-18
ok(hijriMonth(new Date('2026-03-01T12:00:00Z')) === 9, 'مارس 2026 = رمضان (9)');
ok(hijriMonth(new Date('2025-07-10T12:00:00Z')) === 1, 'يوليو 2025 = محرّم (1)');
ok(activeMonth({ force: '7' }) === 7 && activeMonth({ force: 'off' }) === 0, 'تجاوز اختباري ?hm= وتعطيل off');
ok(activeMonth({ search: '?hm=12', force: null }) === 12, 'قراءة hm من الرابط');
ok(getTheme(5).n === 5 && getTheme(13) === null, 'getTheme');
ok(assetUrl(3, 'hero', 'http://x/a/').endsWith('/a/m03-hero.webp'), 'مسار الأصل');

// عبارات التشجيع: أول إجابة / قبل النصف / بعده / الاكتمال (null)
const th = getTheme(9);
ok(encouragement(th, 'ar', 1, 10) === th.ar.enc[0] && encouragement(th, 'en', 3, 10) === th.en.enc[1] && encouragement(th, 'ar', 6, 10) === th.ar.enc[2] && encouragement(th, 'ar', 10, 10) === null, 'اختيار عبارة التشجيع حسب التقدّم');
ok(COLOR_KEYS.length === 12, 'مفاتيح الألوان 12');

console.log(`\n${pass} ناجح، ${fail} فاشل`);
process.exit(fail ? 1 : 0);
