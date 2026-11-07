#!/usr/bin/env python3
"""يحوّل قاعدة ayahinfo_1024.db (مشروع quran_android) إلى ملفات JSON صغيرة لكل صفحة مصحف:
assets/mushaf/ayah/gNN.json (كل ملف 20 صفحة، لتقليل عدد الملفات المنشورة)  =>  { "رقم الصفحة": { "سورة:آية": [[x1,y1,x2,y2], ...] } }  (نِسَب مئوية من أبعاد الصورة الأصلية 1024×1656)
تُستعمل لتظليل الآية في سؤال الذاكرة البصرية (components/visualMemoryHighlight.js). تُشغَّل عبر .github/workflows/fetch-ayah-rects.yml
الاستعمال: build-ayah-rects.py <ayahinfo_1024.db> <مجلد الإخراج>"""
import json, os, sqlite3, sys
from collections import defaultdict

W, H = 1024.0, 1656.0
PAGES_PER_FILE = 20   # يطابق components/visualMemoryHighlight.js
db_path, out_dir = sys.argv[1], sys.argv[2]
con = sqlite3.connect(db_path)
cols = [r[1] for r in con.execute("PRAGMA table_info(glyphs)")]
need = {"page_number", "line_number", "sura_number", "ayah_number", "min_x", "max_x", "min_y", "max_y"}
if not need.issubset(cols):
    sys.exit(f"أعمدة غير متوقعة في glyphs: {cols}")

# (page, sura, ayah, line) -> [minx, miny, maxx, maxy]
lines = {}
for page, line, sura, ayah, x1, x2, y1, y2 in con.execute(
        "SELECT page_number, line_number, sura_number, ayah_number, min_x, max_x, min_y, max_y FROM glyphs"):
    if not ayah or ayah < 1:
        continue
    k = (page, sura, ayah, line)
    r = lines.get(k)
    if r is None:
        lines[k] = [x1, y1, x2, y2]
    else:
        r[0] = min(r[0], x1); r[1] = min(r[1], y1); r[2] = max(r[2], x2); r[3] = max(r[3], y2)

pages = defaultdict(lambda: defaultdict(list))
for (page, sura, ayah, line), r in sorted(lines.items(), key=lambda kv: (kv[0][0], kv[0][1], kv[0][2], kv[0][3])):
    pages[page][f"{sura}:{ayah}"].append(r)

def pct(v, total):
    return round(max(0.0, min(100.0, v * 100.0 / total)), 2)

os.makedirs(out_dir, exist_ok=True)
ayahs = set()
chunks = defaultdict(dict)
for page, items in pages.items():
    out = {}
    for key, rects in items.items():
        rects.sort(key=lambda r: r[1])
        # نسدّ فجوة التباعد بين سطرين متتاليين من الآية نفسها حتى لا يظهر التظليل أشرطةً منفصلة
        for a, b in zip(rects, rects[1:]):
            if 0 < b[1] - a[3] < 0.03 * H:
                mid = (a[3] + b[1]) / 2.0
                a[3] = mid; b[1] = mid
        out[key] = [[pct(r[0], W), pct(r[1], H), pct(r[2], W), pct(r[3], H)] for r in rects]
        ayahs.add(key)
    chunks[(page - 1) // PAGES_PER_FILE][str(page)] = out
for c, data in chunks.items():
    with open(os.path.join(out_dir, f"g{c:02d}.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(",", ":"))

print(f"صفحات: {len(pages)} — آيات: {len(ayahs)}")
if len(pages) != 604 or len(ayahs) < 6200:
    sys.exit("عدد الصفحات/الآيات غير متوقع")
