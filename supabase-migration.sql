-- ==========================================================
-- منصة دار حم — إعداد قاعدة بيانات Supabase (بديل Firestore/Storage)
-- ==========================================================
-- نفّذ هذا الملف كاملاً مرة واحدة من: Supabase Dashboard → مشروعك → SQL Editor →
-- New query → الصق كل المحتوى → Run.
--
-- [ملخص القرار الأمني]: بما إن المنصة لمعلم واحد فقط، أضفنا تسجيل دخول حقيقي للمعلم
-- (Supabase Auth). كل قراءة لبيانات الطلاب الحساسة (أسماء/درجات/تسجيلات صوتية) ونشر/تعديل
-- الواجبات أصبح يتطلب تسجيل دخول (auth.role() = 'authenticated'). الشيء الوحيد المتاح بدون
-- تسجيل دخول: (أ) الطالب يقدر يرسل تسليمه، (ب) قراءة واجب واحد بمعرفه (خط رجوع نادر فقط —
-- راجع core/supabase.js).

-- ------------------------------------------------------------
-- 1) الجداول
-- ------------------------------------------------------------

create table if not exists homeworks (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2) تفعيل الحماية على مستوى الصفوف (Row Level Security)
-- ------------------------------------------------------------

alter table homeworks enable row level security;
alter table submissions enable row level security;

-- 📚 الواجبات
-- القراءة بمعرفها متاحة للجميع (نفس "allow get: if true" في Firestore سابقاً) — خط رجوع
-- نادر فقط؛ الرابط الحديث المكتفي ذاتياً في database/homeworkDB.js لا يحتاج هذا إطلاقاً.
drop policy if exists "homeworks_select_public" on homeworks;
create policy "homeworks_select_public" on homeworks
  for select using (true);

-- الكتابة (نشر/تعديل واجب) للمعلم المسجّل دخوله فقط — تحسين عن Firestore القديم الذي كان
-- مفتوحاً بالكامل لغياب أي تسجيل دخول وقتها.
drop policy if exists "homeworks_insert_teacher" on homeworks;
create policy "homeworks_insert_teacher" on homeworks
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "homeworks_update_teacher" on homeworks;
create policy "homeworks_update_teacher" on homeworks
  for update using (auth.role() = 'authenticated');

-- لا سياسة لـ delete = ممنوع تماماً من العميل (نفس "allow delete: if false" سابقاً).

-- 📊 التسليمات
-- الطالب يرسل تسليمه بدون تسجيل دخول (نفس فلسفة Firestore القديمة تماماً).
drop policy if exists "submissions_insert_public" on submissions;
create policy "submissions_insert_public" on submissions
  for insert with check (true);

-- 🔒 القراءة والتعديل (رؤية الدرجات/الأسماء/التسجيلات الصوتية وتصحيحها) للمعلم المسجّل
-- دخوله فقط — هذا يقفل الثغرة الأصلية في Firestore (كانت "allow get, list: if true" بالكامل).
drop policy if exists "submissions_select_teacher" on submissions;
create policy "submissions_select_teacher" on submissions
  for select using (auth.role() = 'authenticated');

drop policy if exists "submissions_update_teacher" on submissions;
create policy "submissions_update_teacher" on submissions
  for update using (auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 3) مساحة تخزين التسجيلات الصوتية (Storage)
-- ------------------------------------------------------------
-- bucket غير عام (private) عمداً — كانت التسجيلات الصوتية للأطفال قابلة للاستماع من أي حد
-- يعرف/يخمّن مسارها بدون أي تسجيل دخول في Firebase القديم (موثَّق كخطر خصوصية حقيقي في
-- storage.rules). الآن: رفع التسجيل مفتوح للطالب (بدون تسجيل دخول)، لكن الاستماع إليه لاحقاً
-- يتطلب تسجيل دخول المعلم عبر رابط مؤقت (Signed URL صالح لساعة واحدة فقط — راجع
-- getSignedAudioUrl في core/supabase.js).

insert into storage.buckets (id, name, public)
values ('homework_audio', 'homework_audio', false)
on conflict (id) do nothing;

drop policy if exists "homework_audio_insert_public" on storage.objects;
create policy "homework_audio_insert_public" on storage.objects
  for insert with check (bucket_id = 'homework_audio');

drop policy if exists "homework_audio_select_teacher" on storage.objects;
create policy "homework_audio_select_teacher" on storage.objects
  for select using (bucket_id = 'homework_audio' and auth.role() = 'authenticated');

-- ------------------------------------------------------------
-- 4) حساب المعلم (خطوة يدوية منفصلة، خارج هذا الملف)
-- ------------------------------------------------------------
-- لا يُنشأ حساب المعلم من هذا الملف عمداً. من Supabase Dashboard:
-- Authentication → Users → Add user → أدخل بريدك الإلكتروني وكلمة سر تختارها → احفظ.
-- هذا هو الحساب الذي ستسجّل به دخولك في نافذة "تسجيل دخول المعلم" داخل المنصة.
