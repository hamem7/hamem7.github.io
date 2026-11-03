#!/usr/bin/env python3
"""يقصّ صور علامات المصحف من صفحات المصحف المطبوع الحقيقية (assets/mushaf/pageNNN.webp في المنصة، قراءة فقط) ويكتبها في assets/mushaf/signs/،
وينسخ الصفحات المستعملة في «استكشف الصفحة» إلى assets/mushaf/pages/. لا رسم ولا خط من عندنا: كل بكسل مقتطع من صفحة المصحف المصدر.
الإحداثيات بكسلات الصفحة الأصلية (٨٠٠×١٢٩٤). الخلفية الشفافة للصفحة تُوضَع على لون الورق العاجي. التشغيل: python3 tools/crop-signs.py"""
import json, os, shutil
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(HERE)
PLATFORM = os.path.abspath(os.path.join(ROOT, '..', '..'))
PAPER = (251, 245, 228)
SCALE = 2.5
# id: (صفحة, [x0,y0,x1,y1], الآية/الموضع للتوثيق)
CROPS = {
  'waqf_lazim':   (528, [480, 1178, 650, 1256], '54:6 «عنهم» + م'),
  'waqf_jaiz':    (584, [60, 332, 200, 392], '79:27 «السماء» + ج'),
  'waqf_sala':    (588, [545, 236, 615, 292], '83:14 «كلا» + صلى'),
  'saktah':       (588, [505, 236, 575, 292], '83:14 «بل» + س'),
  'waqf_qala':    (443, [270, 925, 345, 975], '36:52 «هذا» + قلى'),
  'waqf_muanaqa': (2, [230, 215, 380, 290], '2:2 «لا ريب» + ∴'),
  'zero_round':   (582, [390, 1092, 510, 1150], '78:28 «وكذبوا»'),
  'zero_rect':    (584, [520, 262, 610, 322], '79:24 «أنا»'),
  'sukun':        (2, [300, 238, 375, 290], '2:2 «لا ريب»'),
  'shadda':       (582, [690, 185, 780, 255], '78:1 «عمّ»'),
  'small_meem':   (585, [320, 758, 430, 812], '80:27 «فأنبتنا»'),
  'madd':         (582, [520, 598, 615, 662], '78:14 «ماء»'),
  'dagger_alif':  (2, [468, 230, 545, 285], '2:2 «ذلك»'),
  'small_waw':    (585, [150, 192, 260, 245], '80:6 «له»'),
  'small_yaa':    (582, [305, 608, 375, 660], '78:15 «به»'),
  'sin_over':     (39, [300, 1190, 430, 1255], '2:245 «يبصط»'),
  'sin_under':    (525, [500, 350, 660, 420], '52:37 «المصيطرون»'),
}
# أجزاء من الصفحة (لوحة السورة، البسملة، خط السجود) تُستعمل في «استكشف الصفحة»
CROPS.update({
  'part_banner':   (582, [30, 0, 770, 100], '78 لوحة سورة النبأ'),
  'part_basmala':  (582, [180, 100, 625, 172], 'البسملة'),
  'part_overline': (528, [170, 596, 390, 660], '53:62 خط فوق كلمات السجود'),
})
# علامات إضافية (الحركات والتنوين والألف والهمزة والعلامات النادرة): نفس الطريقة، التوثيق في PROVENANCE.json
CROPS.update({
  'fatha':       (583, [480, 285, 595, 335], '78:37 «يوم»'),
  'damma':       (583, [420, 280, 520, 335], '78:38 «الروح»'),
  'kasra':       (583, [560, 190, 650, 245], '78:37 «ربّ»'),
  'fathatan':    (582, [485, 620, 580, 672], '78:14 «ثجاجًا»'),
  'dammatan':    (226, [170, 535, 365, 595], '11:41 «لغفور رحيم»'),
  'kasratan':    (585, [20, 350, 140, 410], '80:13 «مكرمة»'),
  'alif_wasla':  (582, [440, 192, 530, 245], '78:2 «النبإ»'),
  'hamza_above': (585, [415, 190, 495, 238], '80:5 «أمّا»'),
  'hamza_below': (582, [575, 700, 650, 750], '78:17 «إنّ»'),
  'hamza_line':  (585, [310, 360, 380, 410], '80:12 «شاء»'),
  'ishmam':      (236, [265, 872, 385, 935], '12:11 «تأمنّا»'),
  'imala':       (226, [485, 535, 610, 600], '11:41 «مجراها»'),
})
# قصّ «الكلمة كاملة» (يحلّ محلّ الصناديق أعلاه للعلامات): كل صورة علامة = الكلمة التي تحمل العلامة كاملةً بسطرها من الفراغ إلى الفراغ،
# لا أنصاف كلمات ولا أطراف كلمات مجاورة. الحدود الأفقية مقيسة من فراغات الكلمات في الصفحة نفسها، والعمودية من الفراغ بين السطور.
# تُحاط الكلمة بهامش من لون الورق (PAD) فلا تلتصق بحافة الإطار. علامة ۞ ووردة رقم الآية وعلامة السجدة مقصوصة كاملة من صفحاتها.
WORD = {
  'rub_mark': (39, [170, 679, 207, 761]),
  'waqf_sala': (588, [576, 254, 614, 344]),
  'saktah': (588, [543, 254, 573, 344]),
  'waqf_lazim': (528, [546, 1184, 637, 1294]),
  'waqf_jaiz': (584, [87, 338, 153, 426]),
  'waqf_qala': (443, [240, 935, 300, 1016]),
  'waqf_muanaqa': (2, [245, 228, 358, 299]),
  'shadda': (582, [739, 179, 774, 259]),
  'zero_round': (582, [415, 1094, 502, 1177]),
  'zero_rect': (584, [554, 259, 580, 338]),
  'small_meem': (585, [322, 752, 426, 834]),
  'sukun': (2, [288, 228, 358, 299]),
  'madd': (582, [557, 592, 595, 680]),
  'small_yaa': (582, [310, 592, 348, 680]),
  'small_waw': (585, [175, 165, 203, 249]),
  'dagger_alif': (2, [473, 228, 523, 299]),
  'sin_over': (39, [354, 1177, 465, 1294]),
  'sin_under': (525, [483, 354, 636, 439]),
  'kasra': (583, [579, 175, 626, 257]),
  'fatha': (583, [544, 257, 582, 344]),
  'damma': (583, [420, 257, 483, 344]),
  'fathatan': (582, [490, 592, 551, 680]),
  'dammatan': (226, [226, 511, 300, 605]),
  'kasratan': (585, [27, 332, 103, 417]),
  'alif_wasla': (582, [476, 179, 528, 259]),
  'hamza_below': (582, [613, 680, 644, 762]),
  'hamza_above': (585, [446, 165, 474, 249]),
  'hamza_line': (585, [318, 332, 361, 417]),
  'ishmam': (236, [285, 853, 362, 939]),
  'imala': (226, [499, 511, 595, 605]),
  'sajda_sign': (528, [103, 598, 139, 676]),
  'ayah_end': (582, [570, 184, 632, 260]),
}
PAD = 12
for sid, (page, box) in WORD.items(): CROPS[sid] = (page, box, (CROPS.get(sid) or (0, 0, 'علامة كاملة'))[2])
PAGES = [2, 39, 226, 236, 443, 525, 528, 582, 583, 584, 585, 588]
def load(p):
    im = Image.open(os.path.join(PLATFORM, 'assets/mushaf', f'page{p:03d}.webp')).convert('RGBA')
    bg = Image.new('RGB', im.size, PAPER); bg.paste(im, mask=im.split()[3]); return bg
out = os.path.join(ROOT, 'assets/mushaf/signs'); os.makedirs(out, exist_ok=True)
pg = os.path.join(ROOT, 'assets/mushaf/pages'); os.makedirs(pg, exist_ok=True)
cache = {}; prov = {}
for sid, (page, box, note) in CROPS.items():
    im = cache.setdefault(page, load(page)); c = im.crop(tuple(box))
    if sid in WORD: p = Image.new('RGB', (c.width + 2 * PAD, c.height + PAD), PAPER); p.paste(c, (PAD, PAD // 2)); c = p
    c = c.resize((round(c.width * SCALE), round(c.height * SCALE)), Image.LANCZOS)
    c.save(os.path.join(out, sid + '.webp'), quality=90); prov[sid] = {'page': page, 'box': box, 'at': note, 'w': c.width, 'h': c.height}
for p in PAGES:
    im = cache.setdefault(p, load(p)); im.save(os.path.join(pg, f'page{p:03d}.webp'), quality=85)
json.dump(prov, open(os.path.join(out, 'PROVENANCE.json'), 'w'), ensure_ascii=False, indent=1)
print(len(prov), 'crops;', len(PAGES), 'pages')
