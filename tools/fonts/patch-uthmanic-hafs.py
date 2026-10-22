#!/usr/bin/env python3
"""إصلاح علامات الضبط الناقصة في خط المصحف (KFGQPC Uthmanic Script HAFS v0.09).

في الخط الأصلي خمسة رموز تُرسم «دائرة منقطة» بدل العلامة الصحيحة (ظهر ◉ في نص الآيات):
  U+06DF  الصفر المستدير ۟ (حرف زائد لا يُنطق، مثل «أُو۟لَٰٓئِكَ»)          ~٤٠٠٠ موضع
  U+06ED  الميم الصغيرة السفلى ۭ (إقلاب/إدغام مع التنوين المكسور)            ~٤٨٠٠ موضع
  U+06E3  السين الصغيرة تحت الحرف ۣ (الصاد أشهر)                           موضع واحد
  U+06EA  الوقف المجوّف السفلي ۪ ، U+06EB  الوقف المجوّف العلوي ۫           موضع واحد لكل منهما
وU+06E0 (المستطيل القائم ۠) كان يُرسم دائرة بدل مستطيل.
هنا: نُعيد رسمها بالشكل المطبوع، ونجعل موضعها بالنسبة للحرف مثل أقرب علامة موجودة في الخط نفسه
(فوق الحرف مثل الصفر الدائري الموجود، وتحته مثل الكسرة).
الاستعمال: python3 tools/fonts/patch-uthmanic-hafs.py <الخط الأصلي> <الخط المُصلَح>
"""
import copy
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

src, dst = sys.argv[1], sys.argv[2]
f = TTFont(src)
gs = f.getGlyphSet()
glyf, hmtx, order = f['glyf'], f['hmtx'], f.getGlyphOrder()
gid = {n: i for i, n in enumerate(order)}
cmap = f.getBestCmap()
CIRCLE = 'uni06E0'  # دائرة الخط القائمة (تُنسخ إلى 06DF قبل أن يُستبدل رسم 06E0 بالمستطيل)
ROUND_ZERO, RECT_ZERO, SIN_BELOW, MEEM_BELOW, RING_BELOW, RING_ABOVE = (
    'uni06DF', 'uni06E0', 'uni06E3', 'uni06ED', 'uni06EA', 'uni06EB')
KASRA, SIN_ABOVE, MEEM_ABOVE = cmap[0x650], cmap[0x6DC], cmap[0x6E2]


def bounds(name):
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    return bp.bounds


def put(name, draw, lsb):
    pen = TTGlyphPen(gs)
    draw(pen)
    glyf[name] = pen.glyph()
    hmtx[name] = (0, int(lsb))


def ring(pen, x0, y0, x1, y1, t):
    """إطار مستطيل أو دائري تقريباً (مستطيل ببيضاوي إن كان r)"""
    for (a, b, c, d, rev) in ((x0, y0, x1, y1, False), (x0 + t, y0 + t, x1 - t, y1 - t, True)):
        pts = [(a, b), (a, d), (c, d), (c, b)]
        pts = pts[::-1] if rev else pts
        pen.moveTo(pts[0])
        for p_ in pts[1:]:
            pen.lineTo(p_)
        pen.closePath()


def moved(donor, k, center):
    """رسم علامة موجودة مصغّرة ومنقولة ليكون مركزها center"""
    x0, y0, x1, y1 = bounds(donor)
    tx, ty = center[0] - k * (x0 + x1) / 2, center[1] - k * (y0 + y1) / 2

    def draw(pen):
        gs[donor].draw(TransformPen(pen, (k, 0, 0, k, tx, ty)))
    return draw, x0 * k + tx


cx0, cy0, cx1, cy1 = bounds(CIRCLE)
kx0, ky0, kx1, ky1 = bounds(KASRA)
kasra_center = ((kx0 + kx1) / 2, (ky0 + ky1) / 2)

# الصفر المستدير: دائرة الخط نفسها (تُنسخ قبل استبدال 06E0)
glyf[ROUND_ZERO] = copy.deepcopy(glyf[CIRCLE])
hmtx[ROUND_ZERO] = hmtx[CIRCLE]
# الوقف المجوّف العلوي: دائرة أصغر بنفس موضع الدائرة، والسفلي: بموضع الكسرة
small = 0.7
w, h = (cx1 - cx0) * small, (cy1 - cy0) * small
mx, my = (cx0 + cx1) / 2, (cy0 + cy1) / 2
put(RING_ABOVE, lambda p: ring(p, mx - w / 2, my - h / 2, mx + w / 2, my + h / 2, 46), mx - w / 2)
put(RING_BELOW, lambda p: ring(p, kasra_center[0] - w / 2, kasra_center[1] - h / 2, kasra_center[0] + w / 2, kasra_center[1] + h / 2, 46),
    kasra_center[0] - w / 2)
# المستطيل القائم: إطار بنفس ارتفاع الدائرة وأضيق منها
rw = (cx1 - cx0) * 0.82
put(RECT_ZERO, lambda p: ring(p, mx - rw / 2, cy0, mx + rw / 2, cy1, 66), mx - rw / 2)
# السين السفلية والميم السفلية: سين وميم الخط العلويتان منقولتان تحت الحرف
draw, lsb = moved(SIN_ABOVE, 0.62, kasra_center)
put(SIN_BELOW, draw, lsb)
draw, lsb = moved(MEEM_ABOVE, 0.8, kasra_center)
put(MEEM_BELOW, draw, lsb)

NEW = {RING_ABOVE: CIRCLE, ROUND_ZERO: CIRCLE, RING_BELOW: KASRA, SIN_BELOW: KASRA, MEEM_BELOW: KASRA}
classes = f['GDEF'].table.GlyphClassDef.classDefs
for n in (*NEW, RECT_ZERO):
    classes[n] = 3


def clone(subtable, donor, new):
    cov = subtable.MarkCoverage
    if donor not in cov.glyphs or new in cov.glyphs:
        return
    rec = copy.deepcopy(subtable.MarkArray.MarkRecord[cov.glyphs.index(donor)])
    pos = next((i for i, g in enumerate(cov.glyphs) if gid[g] > gid[new]), len(cov.glyphs))
    cov.glyphs.insert(pos, new)
    subtable.MarkArray.MarkRecord.insert(pos, rec)
    subtable.MarkArray.MarkCount = len(subtable.MarkArray.MarkRecord)


for lookup in f['GPOS'].table.LookupList.Lookup:
    for st in lookup.SubTable:
        t_ = st.ExtSubTable if hasattr(st, 'ExtSubTable') else st
        if hasattr(t_, 'MarkCoverage'):
            for new, donor in NEW.items():
                clone(t_, donor, new)

f.flavor = 'woff2'
f.save(dst)
print('saved', dst)
