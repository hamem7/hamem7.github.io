// core/dialog.js
// 🌟 رسائل alert() الافتراضية للمتصفح تظهر دائماً في أعلى الشاشة بشكل لا يمكن التحكم فيه (يرسمها المتصفح نفسه).
// هذا السكربت (عادي، غير module) يستبدل window.alert بنافذة في منتصف الصفحة بهوية المنصة، فتتحول كل رسائل التنبيه
// الحالية (والمستقبلية) تلقائياً دون تعديل مواضع الاستدعاء. نص الرسالة يُعرض كنص عادي (textContent) ويحترم أسطر \n.
// ملاحظة: confirm() يبقى كما هو لأنه متزامن (يُرجع true/false فوراً) واستبداله يحتاج تعديل كل مواضع استدعائه.
(function () {
    'use strict';
    if (window.__hamDialogReady) return;
    window.__hamDialogReady = true;

    var nativeAlert = window.alert ? window.alert.bind(window) : null;
    var queue = [];
    var showing = false;

    function injectStyle() {
        if (document.getElementById('ham-dialog-style')) return;
        var st = document.createElement('style');
        st.id = 'ham-dialog-style';
        st.textContent =
            '.ham-dialog-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;' +
            'padding:20px;background:rgba(10,30,24,.55);animation:hamDlgFade .15s ease-out}' +
            '.ham-dialog{background:#fff;color:#1f2d28;width:100%;max-width:420px;max-height:85vh;overflow:auto;border-radius:18px;' +
            'padding:22px 22px 18px;box-shadow:0 18px 50px rgba(0,0,0,.35);border-top:5px solid #d4af37;text-align:center;' +
            'font-family:inherit;animation:hamDlgPop .18s ease-out}' +
            '.ham-dialog-title{font-size:.95rem;font-weight:700;color:#0d5c46;margin:0 0 10px}' +
            '.ham-dialog-msg{font-size:1.05rem;line-height:1.8;white-space:pre-wrap;word-break:break-word;margin:0 0 18px}' +
            '.ham-dialog-btn{min-width:120px;padding:10px 26px;border:0;border-radius:999px;background:#0d5c46;color:#fff;' +
            'font-size:1rem;font-weight:700;font-family:inherit;cursor:pointer}' +
            '.ham-dialog-btn:focus-visible{outline:3px solid #d4af37;outline-offset:2px}' +
            '@keyframes hamDlgFade{from{opacity:0}to{opacity:1}}' +
            '@keyframes hamDlgPop{from{transform:scale(.92);opacity:0}to{transform:scale(1);opacity:1}}';
        (document.head || document.documentElement).appendChild(st);
    }

    function next() {
        if (showing || !queue.length) return;
        showing = true;
        injectStyle();
        var msg = queue.shift();
        var prevFocus = document.activeElement;

        var overlay = document.createElement('div');
        overlay.className = 'ham-dialog-overlay';
        var box = document.createElement('div');
        box.className = 'ham-dialog';
        box.setAttribute('role', 'alertdialog');
        box.setAttribute('aria-modal', 'true');
        var title = document.createElement('div');
        title.className = 'ham-dialog-title';
        title.textContent = 'منصة حمٓ';
        var body = document.createElement('p');
        body.className = 'ham-dialog-msg';
        body.textContent = msg;
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ham-dialog-btn';
        btn.textContent = 'حسنًا';
        box.appendChild(title);
        box.appendChild(body);
        box.appendChild(btn);
        overlay.appendChild(box);

        function close() {
            document.removeEventListener('keydown', onKey, true);
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            try { if (prevFocus && prevFocus.focus) prevFocus.focus(); } catch (e) { /* تجاهل */ }
            showing = false;
            next();
        }
        function onKey(e) {
            if (e.key === 'Escape' || e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); close(); }
        }
        btn.addEventListener('click', close);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        document.addEventListener('keydown', onKey, true);
        (document.body || document.documentElement).appendChild(overlay);
        btn.focus();
    }

    window.alert = function (message) {
        var text = message == null ? '' : String(message);
        if (!document.body && !document.documentElement) { if (nativeAlert) nativeAlert(text); return; }
        queue.push(text);
        if (document.body) next();
        else document.addEventListener('DOMContentLoaded', next, { once: true });
    };
})();
