

-- هذا السكريبت آمن الآن (Safe Script) - لن يقوم بمسح البيانات القديمة
-- تشغيل هذا السكريبت في Supabase SQL Editor لضمان وجود الأعمدة المطلوبة

-- 1. جدول سجل الحركات (تم تعديله ليحفظ البيانات القديمة)
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id text PRIMARY KEY,
  "actorName" text,
  "actorRole" text,
  action text,
  target text,
  details text,
  timestamp text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. جدول الموظفين
CREATE TABLE IF NOT EXISTS public.employees (
  id text PRIMARY KEY,
  name text,
  email text,
  password text,
  role text,
  position text,
  department text,
  branch text DEFAULT 'office', -- New Column for Branch (Office/Factory)
  "joinDate" text,
  avatar text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- تحديث جدول الموظفين لإضافة عمود الفرع إذا لم يكن موجوداً
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch text DEFAULT 'office';

-- 3. جدول الحضور (تم إضافة أعمدة الصور والموقع بأمان)
CREATE TABLE IF NOT EXISTS public.attendance_records (
  id text PRIMARY KEY,
  "employeeId" text REFERENCES public.employees(id) ON DELETE CASCADE,
  date text,
  "checkIn" text,
  "checkOut" text,
  status text,
  note text,
  photo text,
  location jsonb,
  source text,
  "earlyDeparturePermission" boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- تحديث الجدول الموجود لإضافة الأعمدة إذا كانت ناقصة (بدون حذف البيانات)
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS photo text;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS location jsonb;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS "earlyDeparturePermission" boolean DEFAULT false;

-- 4. إعدادات التطبيق
CREATE TABLE IF NOT EXISTS public.app_config (
  id int PRIMARY KEY,
  config jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 5. تفعيل الحماية (RLS)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- 6. تحديث السياسات (حذف السياسات القديمة فقط وإعادة إنشائها - هذا آمن للبيانات)
DROP POLICY IF EXISTS "Enable insert for logs" ON activity_logs;
DROP POLICY IF EXISTS "Enable select for logs" ON activity_logs;
DROP POLICY IF EXISTS "Enable update for logs" ON activity_logs;
DROP POLICY IF EXISTS "Enable delete for logs" ON activity_logs;
DROP POLICY IF EXISTS "Enable all access for logs" ON activity_logs;

DROP POLICY IF EXISTS "Enable all access for employees" ON employees;
DROP POLICY IF EXISTS "Enable all access for records" ON attendance_records;
DROP POLICY IF EXISTS "Enable all access for config" ON app_config;

-- إنشاء سياسات شاملة
CREATE POLICY "Enable all access for logs" ON activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for employees" ON employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for records" ON attendance_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for config" ON app_config FOR ALL USING (true) WITH CHECK (true);

-- 7. تفعيل Realtime
alter publication supabase_realtime add table activity_logs;
alter publication supabase_realtime add table attendance_records;
alter publication supabase_realtime add table employees;
alter publication supabase_realtime add table app_config;