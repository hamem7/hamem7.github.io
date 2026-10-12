#!/usr/bin/env python3
"""يبني database/data/wordMeanings.json من نسخة HTML لكتاب «كلمات القرآن: تفسير وبيان» (حسنين محمد مخلوف).
الاستعمال: python3 tools/build_word_meanings.py book.html  (book.html ناتج تحويل ملف الـ doc عبر LibreOffice)
لا نثق بعناوين السور ولا بترتيب الأعمدة في الملف المصدر: نحدّد السورة وعمود الكلمة بمطابقة الكلمة مع نص الآية في
database/quran-uthmani.json، ونُسقط أي صف لا يطابق. الناتج: {"سورة":[[آية, كلمة, معنى], ...]}"""
import re, sys, json, os
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DIAC = re.compile(r'[ؐ-ًؚ-ٰٟۖ-ۭـ࣓-ࣿ]')
def norm(s):
    s = DIAC.sub('', s)
    s = re.sub('[ٱأإآ]', 'ا', s).replace('ى', 'ي').replace('﻿', '')
    s = re.sub(r'\(.*?\)', '', s)
    s = re.sub(r'[^ء-ي]', '', s)
    return s.replace('ا', '')  # الألف الخنجرية والإملاء العثماني يختلفان عن إملاء الكتاب

class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.tables = []; s.cur = None; s.row = None; s.cell = None; s.para = ''
    def handle_starttag(s, t, a):
        if t == 'table': s.cur = []; s.tables.append(s.cur)
        elif t == 'tr' and s.cur is not None: s.row = []; s.cur.append(s.row)
        elif t == 'td' and s.row is not None: s.cell = []; s.row.append(s.cell); s.para = ''
        elif t == 'p' and s.cell is not None: s.para = ''
    def handle_endtag(s, t):
        if t == 'p' and s.cell is not None: s.cell.append(re.sub(r'\s+', ' ', s.para).strip()); s.para = ''
        elif t == 'td' and s.cell is not None:
            if s.para.strip(): s.cell.append(re.sub(r'\s+', ' ', s.para).strip())
            s.cell = None
        elif t == 'table': s.cur = None
    def handle_data(s, d):
        if s.cell is not None: s.para += d

# جدولان في المصدر عدد فقرات التفسير فيهما لا يساوي عدد الكلمات (فقرة تفسير واحدة لكلمتين في النجم، وفقرة مجزّأة في التكوير).
# المفتاح: أول كلمة في الجدول بعد norm. dup: كرّر فقرة التفسير ذات الترتيب i في الموضع i+1. merge: ادمج الفقرتين i وi+1.
# حُدّدت الإزاحة بقراءة الجدولين كاملين يدوياً (راجع التفاصيل في رسالة الإيداع).
FIXES = {norm('و النّجم إذا هوَى'): ('dup', 18), norm('الشّمس كوّرت'): ('merge', 15)}

def apply_fix(cols, vi):
    others = [i for i in range(3) if i != vi]
    for key, (op, i) in FIXES.items():
        for wi in others:
            if cols[wi] and norm(cols[wi][0]) == key:
                mi = [x for x in others if x != wi][0]; t = cols[mi]
                if op == 'dup': t.insert(i + 1, t[i])
                else: t[i:i + 2] = [t[i] + ' ' + t[i + 1]]
                return True
    return False

def main(src):
    q = json.load(open(os.path.join(ROOT, 'database/quran-uthmani.json'), encoding='utf-8'))
    ayat = {}
    for sr in q['data']['surahs']:
        for a in sr['ayahs']: ayat[(sr['number'], a['numberInSurah'])] = norm(a['text'])
    p = P(); p.feed(open(src, encoding='utf-8', errors='ignore').read())
    out = {}; kept = dropped = skipped = 0
    for t in p.tables:
        for r in t:
            if len(r) != 3: continue
            cols = [[x for x in c if x] for c in r]
            vi = [i for i, c in enumerate(cols) if c and all(re.match(r'^\d+', x) for x in c)]
            if len(vi) != 1: continue
            vi = vi[0]
            if not (len(cols[0]) == len(cols[1]) == len(cols[2])):
                apply_fix(cols, vi)
                if not (len(cols[0]) == len(cols[1]) == len(cols[2])): skipped += len(cols[0]); continue
            a, b = [i for i in range(3) if i != vi]
            n = len(cols[vi])
            if n < 1: continue
            verses = [int(re.match(r'\d+', x).group()) for x in cols[vi]]
            best = (-1, None, None)
            for wi, mi in ((a, b), (b, a)):
                for sn in range(1, 115):
                    sc = sum(1 for k in range(n) if (sn, verses[k]) in ayat and len(norm(cols[wi][k])) >= 2 and norm(cols[wi][k]) in ayat[(sn, verses[k])])
                    if sc > best[0]: best = (sc, (sn, wi, mi), None)
            sc, (sn, wi, mi), _ = best
            if sc < max(1, n // 3): dropped += n; continue
            for k in range(n):
                w, m = cols[wi][k], cols[mi][k]
                nw = norm(w)
                if len(nw) >= 2 and (sn, verses[k]) in ayat and nw in ayat[(sn, verses[k])] and m:
                    w = re.sub(r'[‌‍]', '', w).replace('ـ', '')
                    out.setdefault(str(sn), []).append([verses[k], w, re.sub(r'\s+', ' ', m.replace('ـ', ''))]); kept += 1
                else: dropped += 1
    for k in out: out[k].sort(key=lambda e: e[0])
    dst = os.path.join(ROOT, 'database/data/wordMeanings.json')
    json.dump(out, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(f'surahs={len(out)} kept={kept} dropped={dropped} skipped_misaligned={skipped}')

if __name__ == '__main__': main(sys.argv[1])
