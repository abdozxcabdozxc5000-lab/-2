
-- ==============================================================================
-- SQL Script: Add 'deductions' column to 'payrolls' table for manual deductions
-- تشغيل هذا السكريبت في Supabase SQL Editor
-- ==============================================================================

-- 1. إضافة العمود إذا لم يكن موجوداً
ALTER TABLE public.payrolls 
ADD COLUMN IF NOT EXISTS deductions numeric DEFAULT 0;

-- 2. تحديث السجلات القديمة لتكون القيمة 0 بدلاً من null (لضمان صحة الحسابات)
UPDATE public.payrolls 
SET deductions = 0 
WHERE deductions IS NULL;

-- تم التحديث بنجاح. الآن يمكنك إدخال الخصومات اليدوية.
