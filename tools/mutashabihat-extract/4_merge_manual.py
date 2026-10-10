# يدمج القراءة المباشرة (manual/pages.txt) مع المجموعات الآلية (work/groups.json) ثم يبني الـ seed.
# القاعدة: كل صفحة وردت في pages.txt تُستبدل مجموعاتها الآلية (المبدوءة فيها) بما قُرئ منها؛ سطر «+» = تتمة مجموعة من الصفحة السابقة.
import json,re,sys,collections
sys.path.insert(0,'.')
from norm import *
A=json.load(open('work/assign.json'))
def surah_of(page):
    for k,(a,b) in enumerate(A['sections']):
        if a<=page<=b: return A['assign'][k][0]
auto=json.load(open('work/groups.json'))
def tierA(x): return all(q in('strong','digit') for q in x['_qs']) and x['_anchorHow'] in('heading','lcw')
manual=[];problems=[]
for ln in open('manual/pages.txt',encoding='utf8'):
    ln=ln.strip()
    if not ln or ln.startswith('#'): continue
    p,anc,ay=ln.split('|');p=int(p);s=surah_of(p)
    if s is None or s>45: continue
    ays=sorted({int(x) for x in ay.split(',')})
    L=len(QURAN[s])
    bad=[a for a in ays if not 1<=a<=L]
    if bad: problems.append((p,anc,'out of range',bad));ays=[a for a in ays if a not in bad]
    manual.append({'page':p,'surah':s,'anchor':anc,'ayahs':ays})
pages={m['page'] for m in manual}
def anchor_phrase(s,anc,ays):
    hn=norm(anc.split(' - ')[0].split('-')[0]);vs=[QURAN[s][a-1][1] for a in ays]
    vn=[norm(v) for v in vs];best=None
    cb=collections.Counter(hn)
    for v in vs[:3]:
        ws=v.split();nw=[norm(w) for w in ws]
        for i in range(len(ws)):
            acc=''
            for j in range(i,min(len(ws),i+9)):
                acc+=nw[j]
                if not acc: continue
                cov=sum(1 for x in vn if acc in x)/len(vn)
                if cov<0.6: continue
                d=2*sum((collections.Counter(acc)&cb).values())/(len(acc)+len(hn))
                key=(round(d,3),cov,-len(acc))
                if d>=0.82 and (best is None or key>best[0]): best=(key,' '.join(ws[i:j+1]))
    if best: return best[1]
    # بديل: أطول مقطع كلمات مشترك بين كل الآيات
    ws=[[norm(w) for w in v.split()] for v in vs];first=ws[0];b2=None
    for i in range(len(first)):
        for j in range(len(first),i,-1):
            seq=first[i:j]
            if b2 and len(seq)<=len(b2[1]): break
            if all(any(x[k:k+len(seq)]==seq for k in range(len(x)-len(seq)+1)) for x in ws[1:]): b2=(i,seq,j);break
    return ' '.join(vs[0].split()[b2[0]:b2[2]]) if b2 else None
final=[];perpage=collections.defaultdict(list)
# المجموعات الآلية: الشريحة A فقط خارج الصفحات المقروءة
def _ov(x):
    a={o['ayahNumber'] for o in x['occurrences']};s=x['surahs'][0]
    return any(m['surah']==s and m['anchor']!='+' and len(a&set(m['ayahs']))>=2 for m in manual)
keep=[x for x in auto if tierA(x) and not _ov(x)]
# المجموعات المقروءة
conts=[]
for m in manual:
    if m['anchor']=='+': conts.append(m);continue
    ph=anchor_phrase(m['surah'],m['anchor'],m['ayahs'])
    if not ph: problems.append((m['page'],m['anchor'],'anchor not found in verses',m['ayahs']));
    final.append({'surah':m['surah'],'page':m['page'],'anchorPhrase':ph or m['anchor'],'ayahs':m['ayahs'],'src':'manual','anchorOK':bool(ph)})
for x in keep:
    final.append({'surah':x['surahs'][0],'page':x['_page'],'anchorPhrase':x['anchorPhrase'],'ayahs':sorted(o['ayahNumber'] for o in x['occurrences']),'src':'auto','anchorOK':True})
# التتمات: تُضم لآخر مجموعة في الصفحة السابقة (مقروءة أو آلية)
for c in conts:
    prev=[g for g in final if g['surah']==c['surah'] and g['page']==c['page']-1]
    if not prev:
        a_prev=[x for x in auto if x['surahs'][0]==c['surah'] and x['_page']==c['page']-1]
        if a_prev:
            x=a_prev[-1];g={'surah':c['surah'],'page':x['_page'],'anchorPhrase':x['anchorPhrase'],'ayahs':sorted(o['ayahNumber'] for o in x['occurrences']),'src':'auto+cont','anchorOK':True};final.append(g);prev=[g]
    if prev: prev[-1]['ayahs']=sorted(set(prev[-1]['ayahs'])|set(c['ayahs']))
    else: problems.append((c['page'],'+','no previous group',c['ayahs']))
final=[g for g in final if len(g['ayahs'])>=2]
final.sort(key=lambda g:(g['surah'],g['page']))
per={};out=[]
for g in final:
    s=g['surah'];per[s]=per.get(s,0)+1
    out.append({'groupId':f'{s}-{per[s]}','scope':'internal','surahs':[s],'anchorPhrase':g['anchorPhrase'],'category':'لفظ_مشترك',
      'occurrences':[{'surahNumber':s,'surahName':NAMES[s].replace('سُورَةُ ','').strip(),'ayahNumber':a,'fullText':QURAN[s][a-1][1].strip()} for a in g['ayahs']]})
if '--write' in sys.argv:
    hdr=open('../../database/data/mutashabihatSeedPart1.js',encoding='utf8').read().split('export const')[0]
    open('../../database/data/mutashabihatSeedPart1.js','w',encoding='utf8').write(hdr+'export const MUTASHABIHAT_SEED_PART1 = '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
print('manual groups',len([m for m in manual if m['anchor']!='+']),'auto kept',len(keep),'final groups',len(out),'occurrences',sum(len(g['occurrences']) for g in out))
for p in problems: print('PROBLEM',p)
# مقارنة بالآلي على الصفحات المقروءة
am={}
for x in auto:
    if x['_page'] in pages: am.setdefault(x['_page'],[]).append(frozenset(o['ayahNumber'] for o in x['occurrences']))
tot=hit=0
for m in manual:
    if m['anchor']=='+': continue
    tot+=1
    if frozenset(m['ayahs']) in am.get(m['page'],[]): hit+=1
print(f'manual groups already identical in auto output: {hit}/{tot}')
