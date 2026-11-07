#!/usr/bin/env python3
"""يبني بيانات «المصحف الملوّن بأحكام التجويد» من خطوط مجمع الملك فهد V4 الملونة (ملف لكل صفحة، 604 ملفًا).

المدخلات (تُنزَّل من npm وتُفك خارج المستودع):
  --fonts DIR   مجلد خطوط @tlawat/mushaf-fonts-qpc-v4-tajweed/fonts  (p1.woff2 … p604.woff2؛ والصفحة 328 بصيغة .woff)
  --qcf4  DIR   حزمة quran-qcf4 (index.json لأسماء السور وعدد آياتها، وpages/*.json للتحقق فقط)
المخرجات:
  data/mushaf-color-index.js   فهرس السور (صغير)
  data/mushaf-color-glyphs.js  رموز الخط لكل آية (يُحمَّل عند الحاجة)
  assets/qpc-v4-tajweed/       نسخ الخطوط كما هي بلا أي تعديل (+ manifest بالتجزئات)

الفكرة: كل صفحة مطبوعة لها خط ملوّن يحوي رموز كلماتها بالترتيب (U+FC41…). الألوان داخل الخط نفسه (COLR/CPAL) فلا يُلوَّن شيء بالاجتهاد.
نعرف علامة نهاية الآية من الخط نفسه (وردة بطبقات من لوحة الألوان 10–13، عرضها 2509)، ونتحقق أن عددها في كل صفحة يطابق
عدد علامات النهاية في حزمة quran-qcf4 (6236 في المجموع)؛ فيُرقَّم تسلسل العلامات بترتيب المصحف على آيات السور (7، 286، 200…).
الرمز الذي عرضه صفر (علامة تُرسم فوق الحرف) يتبع الرمز السابق له في الكلمة نفسها (لا يُفصل عنه عند كسر السطر).
"""
import argparse, hashlib, json, os, shutil, sys
from fontTools.ttLib import TTFont

ap = argparse.ArgumentParser()
ap.add_argument('--fonts', required=True)
ap.add_argument('--qcf4', required=True)
ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..'))
ap.add_argument('--no-copy', action='store_true')
a = ap.parse_args()

END_W = 2509
chapters = json.load(open(os.path.join(a.qcf4, 'index.json'), encoding='utf-8'))['chapters']
assert len(chapters) == 114 and sum(c['verses_count'] for c in chapters) == 6236

def font_path(p):
    for ext in ('woff2', 'woff'):
        f = os.path.join(a.fonts, f'p{p}.{ext}')
        if os.path.exists(f):
            return f
    raise SystemExit(f'خط الصفحة {p} غير موجود')

def is_end(ft, cm, colr, g):
    ids = {l.colorID for l in (colr.ColorLayers.get(g) or [])}
    return len(ids & {10, 11, 12, 13}) >= 3 and ft['hmtx'][g][0] == END_W

# 1) لكل صفحة: تسلسل الرموز [(code, zero_width, is_end)]
pages = {}
TOPFONT = None
for p in range(1, 605):
    ft = TTFont(font_path(p)); cm = ft.getBestCmap(); colr = ft['COLR']
    if TOPFONT is None: TOPFONT = ft
    seq = []
    for c in sorted(k for k in cm if k >= 0xE000):
        g = cm[c]
        seq.append((c, ft['hmtx'][g][0] == 0, is_end(ft, cm, colr, g)))
    expected = sum(1 for l in json.load(open(os.path.join(a.qcf4, 'pages', f'{p:03d}.json'), encoding='utf-8'))['lines'] for w in l['words'] if w['type'] == 'end')
    got = sum(1 for s in seq if s[2])
    if got != expected:
        raise SystemExit(f'الصفحة {p}: علامات النهاية في الخط {got} ≠ {expected} في المرجع المستقل')
    pages[p] = seq

# 2) تدفّق الآيات: نقطع عند كل علامة نهاية، ونرقّم بالتسلسل على السور
order = [(c['id'], v) for c in chapters for v in range(1, c['verses_count'] + 1)]
ayahs = {}            # (s, v) -> [(page, [words])]   word = str of code points
cur = []              # أجزاء الآية الجارية: [(page, words)]
k = 0
for p in range(1, 605):
    words = []
    for code, zero, end in pages[p]:
        ch = chr(code)
        if zero and words:
            words[-1] += ch
        else:
            words.append(ch)
        if end:
            cur.append((p, words)); words = []
            ayahs[order[k]] = cur; cur = []; k += 1
    if words:
        cur.append((p, words))
assert k == 6236 and not cur, (k, cur)

# 3) البسملة: كلمات الآية الأولى من الفاتحة (الصفحة 1) — هي نفسها بألوانها في المصحف المطبوع
bism_words = ayahs[(1, 1)][0][1][:-1]
assert len(bism_words) == 4, bism_words

# 4) المخرجات
out = os.path.abspath(a.out)
def esc(s): return ''.join(f'\\u{ord(ch):04x}' if ord(ch) >= 0x80 else ch for ch in s)
glyphs = {}
for c in chapters:
    s = c['id']; arr = []
    for v in range(1, c['verses_count'] + 1):
        parts = []
        for pg, ws in ayahs[(s, v)]:
            parts += [pg, ' '.join(ws)]
        arr.append(parts)
    glyphs[s] = arr
with open(os.path.join(out, 'data', 'mushaf-color-glyphs.js'), 'w', encoding='utf-8') as f:
    f.write('// data/mushaf-color-glyphs.js — مولَّد آليًا بـ tools/build-mushaf-color.py (لا يُعدَّل يدويًا).\n'
            '// رموز خطوط مجمع الملك فهد V4 الملونة لكل آية: [صفحة، "كلمات مفصولة بمسافة"، (صفحة، كلمات)…]. آخر كلمة في الآية هي وردة رقمها.\n'
            '// الرموز تُرسم فقط بخط صفحتها assets/qpc-v4-tajweed/p<صفحة>.woff2 ؛ ليست نصًّا يُقرأ أو يُنسخ.\n')
    f.write('export const BASMALA = ' + json.dumps([1, ' '.join(bism_words)], ensure_ascii=True) + ';\n')
    f.write('export const GLYPHS = {\n')
    for s, arr in glyphs.items():
        f.write(f'  {s}: ' + json.dumps(arr, ensure_ascii=True, separators=(',', ':')) + ',\n')
    f.write('};\n')
idx = []
for c in chapters:
    idx.append({'n': c['id'], 'ar': c['name_arabic'], 'en': c['name_complex'], 'tr': c['translated_name'], 'ayahs': c['verses_count'],
                'place': c['revelation_place'], 'p': c['pages'][0], 'bism': bool(c['bismillah_pre'])})
with open(os.path.join(out, 'data', 'mushaf-color-index.js'), 'w', encoding='utf-8') as f:
    f.write('// data/mushaf-color-index.js — مولَّد آليًا بـ tools/build-mushaf-color.py (لا يُعدَّل يدويًا). فهرس السور الـ114.\n')
    f.write('// n رقم السورة · ar الاسم · en الاسم اللاتيني · tr معناه بالإنجليزية · ayahs عدد الآيات · place مكية/مدنية · p صفحة بدايتها في المصحف · bism تسبقها البسملة.\n')
    f.write('export const CM_SURAHS = [\n' + ',\n'.join('  ' + json.dumps(x, ensure_ascii=False, separators=(',', ':')) for x in idx) + '\n];\n')
    # لوحة ألوان الخط (CPAL، اللوحة 0 = الحبر الأسود للورق الفاتح) كما هي في الخط؛ مفتاح الألوان يقرأ منها فقط
    pal = TOPFONT['CPAL'].palettes[0]
    f.write('// ألوان لوحة الخط (CPAL اللوحة 0) بالترتيب نفسه؛ فهرس اللون هو colorID في طبقات COLR.\n')
    f.write('export const CM_PALETTE = ' + json.dumps(['#%02x%02x%02x' % (c.red, c.green, c.blue) for c in pal]) + ';\n')

fdir = os.path.join(out, 'assets', 'qpc-v4-tajweed')
if not a.no_copy:
    os.makedirs(fdir, exist_ok=True)
    man = {}
    for p in range(1, 605):
        src = font_path(p); dst = os.path.join(fdir, os.path.basename(src))
        shutil.copyfile(src, dst)
        man[p] = {'file': os.path.basename(src), 'bytes': os.path.getsize(dst), 'sha256': hashlib.sha256(open(dst, 'rb').read()).hexdigest()}
    json.dump(man, open(os.path.join(fdir, 'manifest.json'), 'w'), separators=(',', ':'))
print('تم: 114 سورة، 6236 آية، 604 خط')
