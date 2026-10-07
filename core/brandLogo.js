// core/brandLogo.js
// 🌟 [2026-10-03] شعار منصة حمٓ — مصدر واحد للشعار في كل المنصة (الإقلاع، الترويسة، الرئيسية، صفحة واجب الطالب، الشهادة).
// أُعيد رسم الشعار من صورة المعلم بصيغة SVG، وكلمة «حمٓ» مأخوذة من خط «القاهري» (Qahiri، رخصة SIL OFL 1.1:
// github.com/aliftype/qahiri) ومحوَّلة إلى مسارات ثابتة فلا يُحمَّل أي خط. الألوان: ألوان المنصة (#0d5c46 / #d4af37).
// سكربت عادي (ليس module) ويُحمَّل في index.html مباشرة بعد شاشة الإقلاع حتى يظهر الشعار فوراً قبل core/app.js.
//
// الاستعمال في أي HTML: <span data-ham-logo="full" data-ham-tone="light" data-ham-play="intro"></span>
//   data-ham-logo  : full (الشعار مع «حمٓ») | mark (الرمز فقط) | square (الرمز في مربع، للأيقونات)
//   data-ham-tone  : color (الافتراضي، للخلفيات الفاتحة) | light (للخلفيات الخضراء) | mono (لون واحد)
//   data-ham-play  : intro (الافتتاحية — مرة واحدة في الجلسة وتُحسب فقط إذا اكتملت) | joy (قفزة وشرارات عند الظهور)
//   data-ham-shine : أي قيمة = لمعة عند مرور الماوس على العنصر الأب الذي يحمل الكلاس ham-shine-host
// أي عنصر بهذه الخصائص يُضاف لاحقاً إلى الصفحة (شاشة تُحقن عبر loadScreen) يُملأ تلقائياً (MutationObserver).
// النسخ الثابتة في assets/brand/*.svg وأيقونات icons/ وُلّدت من HamLogo.svg() نفسها — عند تعديل الرسم هنا أعد توليدها.
(function () {
    'use strict';
    if (window.HamLogo) return;

    var ARCH = 'M184.5 15C172 30 140 46 126 62C110 82 108 110 118 130L134 198L147 196L134 134C125 112 128 92 142 78C156 63 174 52 184.5 35Z';
    var PEN = 'M184.5 24C168 40 145 52 133 66C118 84 117 110 125 131L141 200';
    var WING = 'M65 102L108 108L107 121L82 118L103 172C130 180 160 198 184 232L181 238C155 212 125 195 92 182Z';
    var BOOK = 'M80 197C120 198 165 215 184.5 249L184.5 262C165 242 120 222 70 215Z';
    var DOME = 'M185 82C186 92 196 96 205 102C214 108 216 118 214 126L156 126C154 118 156 108 165 102C174 96 184 92 185 82Z';
    var BAND = 'M164.5 129H205.5V150H164.5Z';
    var BODY = 'M161 153L209 153L209 213L185 231L161 213Z';
    var WORD = 'M84.5 352.2 97.8 329.1Q99.9 331.9 103.1 333.1Q106.3 334.2 110.1 334.2H136.3Q136 333.2 135.9 331.8Q135.8 330.4 135.8 329.1Q135.8 322.7 139.2 317.4Q142.7 312.2 148.6 309.1Q154.5 306 161.4 306Q168.6 306 174.4 309.1Q180.1 312.2 183.6 317.4Q187.1 322.7 187.1 329.1L186.8 334.2H197.3V352.2ZM161.4 334.2Q163.5 334.2 165 332.7Q166.6 331.2 166.6 329.1Q166.6 327.1 165 325.5Q163.5 324 161.4 324Q159.4 324 157.8 325.5Q156.3 327.1 156.3 329.1Q156.3 331.2 157.8 332.7Q159.4 334.2 161.4 334.2ZM187.1 352.2V334.2H208.1Q205.3 331.7 200.5 326.7Q195.8 321.7 192.2 316.3L203.2 298.3Q211.2 307.8 218.9 316Q226.6 324.2 234.2 329.2Q241.9 334.2 249.4 334.2H284.5L274 352.2Z';
    var MADDA = 'M143.2 281.7 141.4 279.9 153 267.8Q158.3 271.4 165.9 272.6Q173.5 273.7 181 272.4Q188.6 271.2 194 267.8L194.5 269.1Q190.1 275.3 182.8 278.2Q175.5 281.2 167.3 281.2Q157.6 281.2 148.3 277.3Z';
    var MIRROR = 'matrix(-1 0 0 1 369 0)';
    var VIEW = { full: '58 8 253 352', mark: '58 8 253 258', square: '53.5 7.5 262 262' };
    var TONES = {
        color: { g: '#0d5c46', y: '#d4af37' },
        light: { g: '#fffdf6', y: '#e3c35a' },
        mono: { g: '#06231c', y: '#06231c' }
    };
    var uid = 0;

    // static = ألوان صريحة بلا أقنعة (يصلح لـ <img> وhtml2canvas). anim = نفس الرسم + أقنعة وكلاسات الحركة.
    function svg(opts) {
        opts = opts || {};
        var crop = VIEW[opts.crop] ? opts.crop : 'full';
        var c = TONES[opts.tone] || TONES.color;
        var anim = !!opts.anim, i = ++uid;
        var G = ' fill="' + c.g + '"', Y = ' fill="' + c.y + '"';
        var cls = function (n) { return anim ? ' class="' + n + '"' : ''; };
        var pair = function (d, fill, name, mask) {
            var m = mask ? ' mask="url(#' + mask + ')"' : '';
            return '<path' + cls(name) + fill + m + ' d="' + d + '"/><g transform="' + MIRROR + '"><path' + cls(name) + fill + m + ' d="' + d + '"/></g>';
        };
        var out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + VIEW[crop] + '"' +
            (opts.title ? ' role="img" aria-label="' + opts.title + '"' : ' aria-hidden="true" focusable="false"') + '>';
        if (anim) {
            out += '<defs>' +
                '<mask id="hamA' + i + '" maskUnits="userSpaceOnUse" x="0" y="0" width="383" height="380"><path class="ham-pen" d="' + PEN + '" pathLength="1" fill="none" stroke="#fff" stroke-width="40"/></mask>' +
                '<mask id="hamW' + i + '" maskUnits="userSpaceOnUse" x="0" y="0" width="383" height="380"><rect class="ham-ink" x="60" y="236" width="240" height="130" fill="#fff"/></mask>' +
                '<clipPath id="hamM' + i + '"><rect x="140" y="60" width="90" height="182"/></clipPath>' +
                '<clipPath id="hamS' + i + '"><path d="' + DOME + '"/><path d="' + BAND + '"/><path d="' + BODY + '"/></clipPath>' +
                '<linearGradient id="hamL' + i + '" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
                '</defs>';
        }
        out += pair(WING, Y, 'ham-wing');
        out += pair(ARCH, G, '', anim ? 'hamA' + i : '');
        out += anim ? '<g clip-path="url(#hamM' + i + ')"><g class="ham-minaret">' : '<g>';
        out += '<path' + G + ' d="' + DOME + '"/><path' + Y + ' d="' + BAND + '"/><path' + G + ' d="' + BODY + '"/></g>' + (anim ? '</g>' : '');
        if (anim) out += '<g clip-path="url(#hamS' + i + ')"><rect class="ham-shine" x="70" y="70" width="44" height="170" fill="url(#hamL' + i + ')" transform="skewX(-12)"/></g>';
        out += pair(BOOK, G, 'ham-book');
        if (crop === 'full') {
            out += (anim ? '<g mask="url(#hamW' + i + ')">' : '') + '<path' + G + ' d="' + WORD + '"/>' + (anim ? '</g>' : '');
            out += '<path' + cls('ham-madda') + G + ' d="' + MADDA + '"/>';
        }
        return out + '</svg>';
    }

    var CSS = '' +
        '[data-ham-logo]{display:inline-block;line-height:0;position:relative}' +
        '[data-ham-logo]>svg{display:block;width:100%;height:100%;overflow:visible;transform-origin:50% 55%}' +
        '[data-ham-logo] svg *{transform-box:view-box}' +
        '.ham-book{transform-origin:184.5px 256px}.ham-wing{transform-origin:184px 236px}' +
        '.ham-madda{transform-box:fill-box!important;transform-origin:center}.ham-ink{transform-origin:290px 0}' +
        '.ham-pen{stroke-dasharray:1;stroke-dashoffset:0}' +
        '.ham-play .ham-book{animation:ham-book .75s cubic-bezier(.2,.8,.2,1) both}' +
        '.ham-play .ham-wing{animation:ham-wing .75s cubic-bezier(.2,.8,.2,1) .35s both}' +
        '.ham-play .ham-minaret{animation:ham-rise .85s cubic-bezier(.2,.9,.25,1.05) .75s both}' +
        '.ham-play .ham-pen{animation:ham-draw .95s ease-in-out 1.05s both}' +
        '.ham-play .ham-ink{animation:ham-write .85s ease-in-out 1.75s both}' +
        '.ham-play .ham-madda{animation:ham-pop .5s cubic-bezier(.3,1.6,.5,1) 2.45s both}' +
        '.ham-play .ham-shine{animation:ham-shine .9s ease-in-out 2.75s both}' +
        '.ham-joy>svg{animation:ham-joy .7s cubic-bezier(.3,1.5,.5,1) both}' +
        '.ham-joy .ham-shine{animation:ham-shine .8s ease-in-out .2s both}' +
        '.ham-shine-host:hover .ham-shine{animation:ham-shine .8s ease-in-out both}' +
        '.ham-sparks{position:absolute;inset:0;pointer-events:none}' +
        '.ham-sparks i{position:absolute;left:50%;top:48%;width:9px;height:9px;margin:-4.5px;background:#f0d878;opacity:0;transform:rotate(45deg)}' +
        '.ham-joy .ham-sparks i{animation:ham-spark .9s ease-out both}' +
        '@keyframes ham-book{from{transform:rotate(70deg);opacity:0}30%{opacity:1}to{transform:none;opacity:1}}' +
        '@keyframes ham-wing{from{transform:rotate(52deg) scale(.6);opacity:0}40%{opacity:1}to{transform:none;opacity:1}}' +
        '@keyframes ham-rise{from{transform:translateY(150px)}to{transform:none}}' +
        '@keyframes ham-draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}' +
        '@keyframes ham-write{from{transform:scaleX(0)}to{transform:none}}' +
        '@keyframes ham-pop{from{transform:scale(0);opacity:0}to{transform:none;opacity:1}}' +
        '@keyframes ham-shine{from{transform:translateX(0)}to{transform:translateX(190px)}}' +
        '@keyframes ham-joy{0%{transform:none}40%{transform:scale(1.13) translateY(-4%)}100%{transform:none}}' +
        '@keyframes ham-spark{0%{opacity:1;transform:translate(0,0) rotate(45deg) scale(.4)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) rotate(45deg) scale(1)}}' +
        '@media (prefers-reduced-motion:reduce){[data-ham-logo] *,[data-ham-logo]>svg{animation:none!important}}';

    var INTRO_KEY = 'dh_ham_intro_done';
    function introDone() { try { return sessionStorage.getItem(INTRO_KEY) === '1'; } catch (e) { return false; } }
    function markIntroDone() { try { sessionStorage.setItem(INTRO_KEY, '1'); } catch (e) { /* تخزين محظور: تتكرر الافتتاحية فقط */ } }

    function sparks(el, size) {
        var s = document.createElement('span');
        s.className = 'ham-sparks';
        for (var k = 0; k < 10; k++) {
            var a = k / 10 * Math.PI * 2, r = size * (0.55 + (k % 3) * 0.12), dot = document.createElement('i');
            dot.style.setProperty('--dx', Math.round(Math.cos(a) * r) + 'px');
            dot.style.setProperty('--dy', Math.round(Math.sin(a) * r) + 'px');
            dot.style.animationDelay = (k % 4) * 40 + 'ms';
            s.appendChild(dot);
        }
        el.appendChild(s);
    }

    function mountOne(el) {
        var play = el.getAttribute('data-ham-play') || '';
        var wantsIntro = play === 'intro' && !introDone();
        var anim = wantsIntro || play === 'joy' || el.hasAttribute('data-ham-shine');
        el.innerHTML = svg({ crop: el.getAttribute('data-ham-logo'), tone: el.getAttribute('data-ham-tone'), anim: anim, title: el.getAttribute('data-ham-title') || '' });
        el.setAttribute('data-ham-ready', '1');
        if (wantsIntro) {
            el.classList.add('ham-play');
            var last = el.querySelector('.ham-shine');
            if (last) last.addEventListener('animationend', markIntroDone, { once: true });
        } else if (play === 'joy') {
            sparks(el, el.getBoundingClientRect().width || 80);
            el.classList.add('ham-joy');
        }
    }

    function mount(root) {
        var list = (root || document).querySelectorAll('[data-ham-logo]:not([data-ham-ready])');
        for (var k = 0; k < list.length; k++) mountOne(list[k]);
    }

    var style = document.createElement('style');
    style.id = 'ham-logo-css';
    style.textContent = CSS;
    (document.head || document.documentElement).appendChild(style);

    window.HamLogo = { svg: svg, mount: mount };
    mount(document);

    var queued = false;
    new MutationObserver(function () {
        if (queued) return;
        queued = true;
        requestAnimationFrame(function () { queued = false; mount(document); });
    }).observe(document.documentElement, { childList: true, subtree: true });
})();
