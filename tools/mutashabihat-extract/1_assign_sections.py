import sys,re,json;sys.path.insert(0,'.')
from parse import *
pages=open('work/layout.txt',encoding='utf8').read().split('\f')[:278]   # pdf pages 2..233
HEAD=[i for i,p in enumerate(pages) if re.search(r'متشاهبات\s*(?:ُ)?\s*سُورة|متشاهبات سُورة',re.sub(r'[‎‏‪-‮]','',p)) and any('متشاهبات' in l and len(norm(l))<20 for l in p.split('\n'))]
print('heading pages (pdf):',[i+2 for i in HEAD],len(HEAD))
SW={'2':'7','7':'2','4':'6','6':'4'}
def fixnum(d): return int(''.join(SW.get(c,c) for c in d))
GR={s:[(n,grams(t)) for n,t in v] for s,v in QN.items()}
def sc(unit,g2):
    g=grams(unit)
    return len(g&g2)/len(g) if g else 0
sections=[]
for k,h in enumerate(HEAD):
    end=HEAD[k+1] if k+1<len(HEAD) else len(pages)
    sections.append((h,end))
secg=[parse_pages(pages[h:e],0) for h,e in sections]
cur=2;assign=[]
for k,groups in enumerate(secg):
    units=[norm(e['text']) for g in groups for e in g['entries']]
    units=[u for u in units if len(u)>=10]
    best=None
    for s in range(cur,min(cur+3,115)):
        if s not in GR: continue
        tot=sum(max(sc(u,g2) for _,g2 in GR[s]) for u in units)/max(1,len(units))
        if best is None or tot>best[0]: best=(tot,s)
    assign.append((best[1],round(best[0],2),len(units)));cur=best[1]+1 if best[0]>0.6 else cur
print([(HEAD[k]+2,)+a for k,a in enumerate(assign)])
json.dump({'sections':[(h+2,e+1) for h,e in sections],'assign':assign},open('work/assign.json','w'))
