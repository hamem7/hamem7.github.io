#!/usr/bin/env python3
"""يُحدّث فهارس الكلمات في database/data/tajweedAnnotations.json بعد اعتماد نسخة المصحف المصحَّحة.
الفرق الوحيد في عدد الكلمات: المصحَّحة تفصل «بَعْدَ مَا» كلمتين (2:181 و8:6 و13:37) وكان نص تنزيل يكتبها كلمة «بَعْدَمَا»،
فكل فهرس كلمة بعد موضع الفصل يزيد واحداً. الاستعمال: python3 tools/quran-text/shift-annotations.py <نص تنزيل الأصلي> <المصحف الجديد> <الجدول>"""
import json, re, sys

old_p, new_p, tab_p = sys.argv[1:4]
old = json.load(open(old_p, encoding='utf8'))['data']['surahs']
new = json.load(open(new_p, encoding='utf8'))['data']['surahs']
tab = json.load(open(tab_p, encoding='utf8'))
P = 'ۖۗۘۙۚۛۜ'
words = lambda t: [w for w in t.replace('﻿', '').split() if not (len(w) == 1 and w in P)]
SK = re.compile('[ؐ-ًؚ-ٰٟۖ-ࣰۭ-ࣿـ]')
n = 0
for so, sn in zip(old, new):
    for ao, an in zip(so['ayahs'], sn['ayahs']):
        wo, wn = words(ao['text']), words(an['text'])
        if len(wo) == len(wn):
            continue
        assert len(wn) == len(wo) + 1, (so['number'], ao['numberInSurah'])
        sk = lambda w: SK.sub('', w).replace('ی', 'ي').replace('ى', 'ي').replace('ئ', 'ي')
        k = next(i for i in range(len(wo)) if sk(wo[i]) == sk(wn[i]) + sk(wn[i + 1]))   # كلمة تنزيل المقسومة في المصحَّحة
        key = '%d:%d' % (so['number'], ao['numberInSurah'])
        flat = tab['ayahs'].get(key)
        if not flat:
            continue
        for j in range(0, len(flat), 3):
            if flat[j + 1] > k: flat[j + 1] += 1
            if flat[j + 2] >= k: flat[j + 2] += 1
        n += 1
        print('shifted', key, 'split word index', k)
json.dump(tab, open(tab_p, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('ayahs updated:', n)
