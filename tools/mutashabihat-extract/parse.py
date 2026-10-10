import re,sys,json
sys.path.insert(0,'.')
from norm import *
def grams(s,n=4): return {s[i:i+n] for i in range(max(0,len(s)-n+1))}
QN={s:[(n,norm(t)) for n,t in v] for s,v in QURAN.items()}
def score(unit,ay):
    g=grams(unit)
    return len(g&grams(ay))/len(g) if g else 0
def clean_lines(page):
    t=re.sub(r'[‎‏‪-‮⁦-⁩]','',page)
    out=[]
    for l in t.split('\n'):
        l=l.strip()
        if not l or re.fullmatch(r'\d{1,3}',l): continue
        out.append(l)
    return out
def parse_pages(pages, surah):
    """returns groups [{anchor_raw, entries:[{num_raw, text, best:(ayah,score)}]}]"""
    groups=[];cur=None;buf=''
    for p in pages:
        for l in clean_lines(p):
            if 'متشاهبات' in l and 'سُورة' in l.replace('سورة','سُورة') and len(norm(l))<20: continue
            if l.startswith('*'):
                cur={'anchor_raw':l,'entries':[]};groups.append(cur);buf='';continue
            if cur is None: continue
            buf+=' '+l
            ms=list(re.finditer(r'\)\)?\s*(\d{1,3})(?:\s*-\s*(\d{1,3}))?\s*\(?|\(?\s*(\d{1,3})\s*\)\)',buf))
            if ms:
                m=ms[-1]
                digits=[d for d in m.groups() if d]
                text=buf[:m.start()]
                cur['entries'].append({'digits':digits,'text':text.strip()})
                buf=buf[m.end():]
    return groups
