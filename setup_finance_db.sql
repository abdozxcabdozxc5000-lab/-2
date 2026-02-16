
-- ==============================================================================
-- SQL Script: Setup Finance Module & Permissions
-- تشغيل هذا السكريبت في Supabase SQL Editor
-- ==============================================================================

-- 1. إنشاء جدول العهد (Custodies)
CREATE TABLE IF NOT EXISTS public.custodies (
    id text PRIMARY KEY,
    "employeeId" text NOT NULL,
    "userName" text,
    amount numeric DEFAULT 0,
    description text,
    type text,                  -- نوع العهدة القديم
    category text,              -- التصنيف الجديد (مثال: عهدة مصنع)
    "paymentMethod" text,       -- طريقة الاستلام (كاش، تحويل)
    source text,                -- المصدر (بلال، خزينة)
    "receivedDate" timestamp with time zone,
    status text DEFAULT 'confirmed', -- confirmed / pending
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. إنشاء جدول المصروفات (Expenses)
CREATE TABLE IF NOT EXISTS public.expenses (
    id text PRIMARY KEY,
    "employeeId" text NOT NULL,
    "userName" text,
    amount numeric DEFAULT 0,
    category text,              -- تصنيف المصروف (وقود، ضيافة)
    description text,
    date text,                  -- YYYY-MM-DD
    status text DEFAULT 'pending', -- pending / approved / rejected
    "receiptImageUrl" text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. تفعيل التحديث اللحظي (Realtime) للجداول الجديدة
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'custodies') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE custodies;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'expenses') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE expenses;
    END IF;
END $$;

-- 4. إعداد سياسات الأمان (RLS) - السماح بالوصول الكامل للتطبيق
ALTER TABLE public.custodies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for custodies" ON public.custodies;
CREATE POLICY "Enable all access for custodies" ON public.custodies FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for expenses" ON public.expenses;
CREATE POLICY "Enable all access for expenses" ON public.expenses FOR ALL USING (true) WITH CHECK (true);

-- 5. تحديث إعدادات النظام لإضافة هيكل الصلاحيات الجديد (Permissions)
-- هذا الجزء يضيف permissions: { financeManage: [...] } إلى JSON الإعدادات
UPDATE public.app_config
SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb), -- التأكد من وجود كائن
    '{permissions}',               -- المسار الجديد
    '{
        "financeManage": ["owner", "general_manager", "accountant"]
    }'::jsonb,                     -- القيمة الافتراضية
    true                           -- إنشاء المسار إذا لم يكن موجوداً
)
WHERE id = 1;

-- 6. تنظيف: إذا كانت الأعمدة الجديدة غير موجودة في جدول العهد (لمن قام بإنشائه سابقاً)
ALTER TABLE public.custodies ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.custodies ADD COLUMN IF NOT EXISTS "paymentMethod" text;
ALTER TABLE public.custodies ADD COLUMN IF NOT EXISTS source text;

-- تعيين قيم افتراضية للسجلات القديمة (لتجنب القيم الفارغة)
UPDATE public.custodies SET category = type WHERE category IS NULL;
UPDATE public.custodies SET "paymentMethod" = 'نقدية' WHERE "paymentMethod" IS NULL;
UPDATE public.custodies SET source = 'الخزينة' WHERE source IS NULL;

-- تم الانتهاء! قاعدة البيانات جاهزة الآن.
