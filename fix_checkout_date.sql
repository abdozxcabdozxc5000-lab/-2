
-- ---------------------------------------------------------
-- تشغيل هذا السكريبت في Supabase SQL Editor
-- الغرض: إصلاح عمود تاريخ الانصراف لضمان حفظ البيانات للورديات الليلية
-- ---------------------------------------------------------

DO $$
BEGIN
    -- 1. التحقق مما إذا كان العمود موجوداً بالاسم القديم (checkOutDate)
    -- إذا وجد، نقوم بإعادة تسميته إلى (checkout_date) لتجنب مشاكل الأحرف الحساسة
    IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='attendance_records' AND column_name='checkOutDate') THEN
        ALTER TABLE public.attendance_records RENAME COLUMN "checkOutDate" TO checkout_date;
    
    -- 2. إذا لم يكن العمود موجوداً بأي اسم، نقوم بإنشائه
    ELSE
        ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS checkout_date text;
    END IF;
END $$;

-- 3. تحديث أي سجلات قديمة لا تحتوي على تاريخ انصراف
-- نجعل تاريخ الانصراف هو نفسه تاريخ الحضور كقيمة افتراضية للسجلات القديمة
UPDATE public.attendance_records 
SET checkout_date = date 
WHERE checkout_date IS NULL;

-- 4. إعادة تفعيل وتحديث سياسات الأمان (RLS) للتأكد من السماح بالتعديل
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for records" ON attendance_records;

CREATE POLICY "Enable all access for records" ON attendance_records 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- تم الإصلاح. الآن سيتم حفظ تاريخ الانصراف بشكل صحيح.
