#!/usr/bin/env python3
"""يبني database/quran-uthmani.json من «النسخة المصحَّحة» لنص المصحف (nuqayah/quran-text، المشتقة من نص تنزيل ونص مجمع الملك فهد QPC v13)
مع إبقاء بيانات كل آية (الجزء والصفحة والحزب والسجدة…) كما هي في الملف الحالي، ونص الآية من المصحَّحة كما هو (حروفاً وتنويناً وعلامات وقف).

الاستعمال: python3 tools/quran-text/build-quran-text.py <quran-uthmani.txt المصحَّحة> <الملف الحالي quran-uthmani.json> <الناتج>

تعديلان ميكانيكيان فقط على نص المصدر، لا يمسّان محتواه، لأنهما يقطّعان الكلمات في المنصة:
  ١) حذف U+200A (مسافة رفيعة) وU+2060 (رابط كلمة) والتطويل U+0640 قبل الألف الخنجرية مباشرة: حيل عرض أضافها المصدر لإنزال الألف الخنجرية على السطر. المسافة
     الرفيعة تُعدّ مسافة في \\s بجافاسكربت فتقسم الكلمة نصفين عند أي تقسيم للنص، وخطوطنا تضع الألف الخنجرية في موضعها بلا حاجة إليها.
     (التطويل الحامل للهمزة ـٔ يبقى لأنه جزء من رسم الهمزة.)
  ٢) إعادة المسافة قبل علامات الوقف (ۖ ۗ ۘ ۙ ۚ ۛ والسكتة ۜ) التي حذفها المصدر، فتبقى كل علامة وقف «كلمة» مستقلة بين مسافتين كما يفترض كود المنصة.
"""
import json, re, sys

src, cur, out = sys.argv[1:4]
lines = [l for l in open(src, encoding='utf8').read().split('\n') if l.strip()]
data = json.load(open(cur, encoding='utf8'))
surahs = data['data']['surahs']
if sum(len(s['ayahs']) for s in surahs) != len(lines):
    sys.exit('عدد الآيات لا يطابق: %d سطرًا في المصدر' % len(lines))


def adapt(t):
    t = t.replace(' ', '').replace('⁠', '')
    t = re.sub('ـ(?=ٰ)', '', t)
    t = re.sub('(?<=[^ ])([ۖ-ۛ])', r' \1', t)          # علامات الوقف الست
    t = re.sub('(?<=[^ ])(ۜ)(?= |$)', r' \1', t)             # السكتة ملتصقة بآخر الكلمة (السين فوق الصاد داخل الكلمة تبقى)
    return t


i = 0
for s in surahs:
    for a in s['ayahs']:
        a['text'] = adapt(lines[i])
        i += 1
json.dump(data, open(out, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('wrote', out, i, 'ayahs')
