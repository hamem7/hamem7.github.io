#!/usr/bin/env python3
"""يهيّئ خط المصحف (KFGQPC Uthmanic Script HAFS) لنص المصحف المصحَّح: (١) يضيف التنوين المفتوح (U+08F0 فتحتان مفتوحتان، U+08F1 ضمتان مفتوحتان، U+08F2 كسرتان مفتوحتان) إلى خط المصحف (KFGQPC Uthmanic Script HAFS).

نص المصحف المصحَّح يكتب التنوين في حالات الإدغام والإخفاء بهذه الرموز (يُطبع في مصحف المدينة حركتين متتابعتين لا متراكبتين)، وخط الإصدار 0.09 لا يعرفها
فكانت تسقط إلى خط احتياطي. هنا نرسم كل رمز حركتين متجاورتين من حركة الخط نفسه (فتحة/ضمة/كسرة) بمركز التنوين المتراكب نفسه، وننسخ موضعه فوق/تحت
الحرف من التنوين العادي المقابل.
(٢) يجعل المدّة U+06E4 تُرسم فوق الحرف بمدّة الخط U+0653؛ (٣) يجعل الياء الفارسية U+06CC (التي يكتب بها النص المصحَّح كل ياء) تُرسم بحروف الياء العربية U+064A نفسها بأشكالها الأربعة؛ كان الخط يرسمها دائرة منقّطة.
الاستعمال: python3 tools/fonts/adapt-uthmanic-hafs-corrected-text.py <الخط> <الناتج>   (يُشغَّل بعد patch-uthmanic-hafs.py؛ آمن لو أُعيد تشغيله)
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
glyf, hmtx = f['glyf'], f['hmtx']
cmap = f.getBestCmap()

# (الرمز الجديد، التنوين المتراكب المقابل، الحركة المفردة، نسبة إزاحة الثانية من عرض الحركة)
SPECS = [(0x08F0, 0x064B, 0x064E, 0.86), (0x08F1, 0x064C, 0x064F, 0.80), (0x08F2, 0x064D, 0x0650, 0.86)]


def bounds(name):
    bp = BoundsPen(gs)
    gs[name].draw(bp)
    return bp.bounds


order = f.getGlyphOrder()
new_names = {}
for code, stacked, single, k in SPECS:
    if code in cmap:
        continue
    name = 'uni%04X' % code
    sx0, sy0, sx1, sy1 = bounds(cmap[stacked])
    x0, y0, x1, y1 = bounds(cmap[single])
    w = x1 - x0
    total = w * (1 + k)
    left = (sx0 + sx1) / 2 - total / 2 - x0       # مركز الزوج = مركز التنوين المتراكب
    ty = (sy0 + sy1) / 2 - (y0 + y1) / 2 if False else 0
    pen = TTGlyphPen(gs)
    for i in (0, 1):
        # الثانية (في اتجاه القراءة) أقرب إلى يسار الحرف، فنزيحها يميناً بالنسبة للأولى كما في الطباعة: الأولى يميناً والثانية يساراً
        dx = left + (k * w if i == 0 else 0)
        gs[cmap[single]].draw(TransformPen(pen, (1, 0, 0, 1, dx, ty)))
    glyf[name] = pen.glyph()
    hmtx[name] = (0, int(left + x0))
    new_names[name] = cmap[stacked]
    for t in f['cmap'].tables:
        if t.isUnicode():
            if t.format == 4 and code > 0xFFFF:
                continue
            t.cmap[code] = name
# الياء الفارسية ← الياء العربية (فتنطبق عليها قواعد الاتصال والزخارف نفسها)
for t in f['cmap'].tables:
    if t.isUnicode():
        t.cmap[0x06CC] = cmap[0x064A]
        t.cmap[0x06E4] = cmap[0x0653]   # المدّة U+06E4 (النص المصحَّح) ← مدّة الخط U+0653: رسمها نفسه، وأما U+06E4 فيه فكان يُرسم شرطة بجانب الألف
order = list(glyf.glyphOrder)   # glyf يُلحق الأسماء الجديدة بترتيبه عند الإضافة
f.setGlyphOrder(order)
if new_names:
    f['maxp'].numGlyphs = len(order)
    f['hhea'].numberOfHMetrics = len(order)
    if 'post' in f and getattr(f['post'], 'extraNames', None) is not None:
        pass
    classes = f['GDEF'].table.GlyphClassDef.classDefs
    gid = {n: i for i, n in enumerate(order)}
    for n in new_names:
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
                for new, donor in new_names.items():
                    clone(t_, donor, new)
f.flavor = 'woff2'
f.save(dst)
print('saved', dst, 'new glyphs:', list(new_names))
