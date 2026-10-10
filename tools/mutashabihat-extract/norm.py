import re,json
def norm(s):
    s=re.sub(r'[‌-‏‪-‮⁦-⁩﻿-]','',s)
    s=re.sub(r'[ؐ-ًؚ-ٰٟۖ-ۭـ]','',s)
    s=s.replace('هلل','لله')
    s=re.sub('[أإآٱ]','ا',s); s=s.replace('ى','ي').replace('ة','ه').replace('ؤ','و').replace('ئ','ي').replace('ء','')
    s=re.sub(r'[^ء-ي]','',s)   # drop spaces, digits, punctuation
    s=s.replace('ا','')                  # alef removed: immune to the PDF's lam-alef transpositions
    return s
q=json.load(open('../../database/quran-uthmani.json',encoding='utf8'))
d=q.get('data',q)
QURAN={s['number']:[(a['numberInSurah'],a['text']) for a in s['ayahs']] for s in d['surahs']}
NAMES={s['number']:s['name'] for s in d['surahs']}
