# تعليمات العمل على المستودع

## الرفع (Git)
- بطلب صريح من صاحب المنصة: كل التعديلات تُرفع مباشرة على الفرع الرئيسي `main` (الموقع المنشور على GitHub Pages)،
  بدل الاكتفاء بفرع جانبي أو فتح Pull Request.
- قبل الرفع: `git fetch origin main` ثم دمج/تحديث محلي حتى يكون الرفع fast-forward، ثم `git push origin HEAD:main`.

## اللغات (Languages)
- أي تعديل أو إضافة جديدة (صفحة، قسم، نص، ميزة، رسالة، زر...) يجب أن تكون متاحة تلقائيًا باللغتين العربية والإنجليزية.
- لا يُضاف أي نص بلغة واحدة فقط: أضف الترجمتين معًا في نفس التعديل، وبنفس آلية تعدد اللغات المستخدمة حاليًا في الموقع.
- الاتجاه (RTL/LTR) يجب أن يعمل بشكل صحيح مع كل لغة.

## الهوية البصرية والترويسة (شرط قبول إلزامي)
- المرجع الثابت: `#main-header` في `index.html` (تنسيقها في `css/home.css`، والشعار من `core/brandLogo.js`) — يشمل الشعار والنص، وأزرار «الرئيسية» و«حسابي» (صورة المعلم) و«English» بنفس الترتيب والأحجام.
- شاشات المنصة تُحقن داخل `#app-root` وتظهر تحت هذه الترويسة الوحيدة: **لا تنشئ ترويسة خاصة بشاشة**. الشاشات الكاملة التي تغطي الصفحة (overlays) تبدأ من أسفل الترويسة (انظر `placeBelowMainHeader` في `components/monthlyMemorizationBulkScreen.js`).
- أي صفحة HTML مستقلة جديدة (ذات `<html>`) تنسخ كتلة `#main-header` من `index.html` كما هي وتحمّل `css/tokens.css` و`css/global.css` و`css/home.css` و`core/brandLogo.js` (المثال: `privacy.html`).
- قبل أي رفع: شغّل `node tools/check-header.mjs` — يجب أن ينجح (يعمل أيضًا في GitHub Actions: `.github/workflows/check-header.yml`). لا تُقبل صفحة تفشل فيه.

## المظهر الداكن (فاتح/داكن)
- المظهر يُضبط بـ `<html data-theme="light|dark">` (من `core/themeInit.js` المحمَّل أول `<head>`، والزر في `core/theme.js`). التفضيل: `localStorage.dh_theme` = `auto|light|dark`.
- الشاشات الجديدة: استعمل رموز الهوية (`--dh-surface` و`--dh-ink` و`--dh-ink-soft` و`--dh-line` و`--dh-ok/warn/danger/info` وخلفياتها) ولا تكتب ألواناً فاتحة ثابتة؛ فتنقلب تلقائياً في `css/tokens.css` / `css/theme-dark.css`.
- الألوان الثابتة القديمة في الشاشات غير المحوَّلة تُولَّد لها نسخة داكنة تلقائياً: `node tools/gen-dark-theme.mjs` يعيد كتابة `css/theme-dark-auto.css` (لا تعدّله يدوياً). شاشة/ملف جديد بألوان ثابتة: أضفه إلى قائمة `INCLUDE` في الأداة ثم أعد التوليد. التعديلات اليدوية في `css/theme-dark.css`.
- ركن الأطفال (`body.kids-theme`) يبقى فاتحاً في المظهرين.
- قبل أي رفع: شغّل `node tools/gen-dark-theme.mjs --check` — يجب أن ينجح (يعمل أيضًا في GitHub Actions: `.github/workflows/check-dark-theme.yml`). يفشل إن كان `css/theme-dark-auto.css` قديماً (أعد التوليد وارفعه) أو ظهر ملف بألوان فاتحة ثابتة غير مشمول (أضِفه إلى `INCLUDE`/`HANDLED` في الأداة).

## الخط القرآني (ممنوع تغييره أبدًا)
- يُمنع تغيير الخط القرآني (`Amiri Quran` عبر `.quran-text` في `css/global.css`، وملفات الخط في `assets/fonts` و`css/fonts.css`) أو نوعه أو وزنه أو تشكيله في أي تعديل، لأي سبب.
- يُسمح فقط بتغيير التخطيط حول النص (الأسطر والهوامش)، ولا يُمسّ `font-family` ولا `font-weight` ولا `letter-spacing` للنص القرآني. أي فراغ/نقاط داخل سؤال تُكتب نقاطًا عادية `.....` بخط النص نفسه.
- تنبيه تقني: `css/global.css` يضبط `* { font-family: 'IBM Plex Sans Arabic' }` فلا يرث أي عنصر (div/span) داخل `.quran-text` خط القرآن؛ أي عنصر يحوي نصًا قرآنيًا (آية أو قوسين ﴿ ﴾ أو نقاط الفراغ) يجب أن يحمل بنفسه `class="quran-text"`، ولا يُوضع نص قرآني داخل عنصر فرعي بلا هذا الصنف.
