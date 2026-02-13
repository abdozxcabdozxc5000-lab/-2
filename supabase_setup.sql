
-- تشغيل هذا السكريبت في Supabase SQL Editor لإصلاح هيكل قاعدة البيانات

-- 1. إصلاح عمود تاريخ الانصراف ليكون (checkout_date) بدلاً من (checkOutDate) لتجنب مشاكل الأحرف
DO $$
BEGIN
    -- إذا كان العمود القديم موجوداً، قم بإعادة تسميته
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='attendance_records' AND column_name='checkOutDate') THEN
        ALTER TABLE public.attendance_records RENAME COLUMN "checkOutDate" TO checkout_date;
    
    -- إذا لم يكن موجوداً، تأكد من إنشاء العمود الجديد
    ELSE
        ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS checkout_date text;
    END IF;
END $$;

-- 2. التأكد من وجود باقي الأعمدة المطلوبة
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS photo text;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS location jsonb;
ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS "earlyDeparturePermission" boolean DEFAULT false;

-- 3. إضافة عمود الفرع للموظفين
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS branch text DEFAULT 'office';

-- 4. تحديث صلاحيات الوصول (RLS) لضمان السماح بالتعديل
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for records" ON attendance_records;

CREATE POLICY "Enable all access for records" ON attendance_records 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 5. إصلاح المشاكل المحتملة في جدول الموظفين
UPDATE public.employees SET branch = 'office' WHERE branch IS NULL;
