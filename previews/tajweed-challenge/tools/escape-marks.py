#!/usr/bin/env python3
"""يحوّل علامات التشكيل والرموز غير المرئية داخل ملفات الشيفرة إلى تسلسلات \\uXXXX حتى تبقى الشيفرة مقروءة وقابلة للمراجعة،
ويجرّد التشكيل من التعليقات (// ...). لا يمسّ الحروف العربية الأساسية ولا ملفات البيانات المولَّدة (النص القرآني)."""
import sys, re, unicodedata, pathlib
SKIP = {'pool.js'}
MARK_ESC = re.compile(r'\\u(064[B-F]|065[0-9A-F]|0670|06D[6-9A-F]|06E[0-9A-D])')
def esc(s):
    return ''.join('\\u%04X' % ord(c) if (unicodedata.category(c) in ('Mn', 'Me', 'Cf') or c in 'ـ۝۞۩') else c for c in s)
def strip(s):
    s = MARK_ESC.sub('', s)
    return ''.join(c for c in s if unicodedata.category(c) not in ('Mn', 'Me') and c != 'ـ')
for arg in sys.argv[1:]:
    p = pathlib.Path(arg)
    if p.name in SKIP: continue
    src = p.read_text(encoding='utf-8'); out = []
    for line in src.split('\n'):
        m = re.search(r'(^|\s)//', line)
        if m: code, com = line[:m.start() + len(m.group(1))], line[m.start() + len(m.group(1)):]
        else: code, com = line, ''
        out.append(esc(code) + strip(com))
    new = '\n'.join(out)
    if new != src: p.write_text(new, encoding='utf-8'); print('normalized', p)
