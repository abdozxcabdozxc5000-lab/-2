
-- ==============================================================================
-- SQL Script: Ensure Delete Permission for Loans Table
-- تشغيل هذا السكريبت في Supabase SQL Editor
-- الغرض: التأكد من السماح بحذف السلف (Loans) من قاعدة البيانات
-- ==============================================================================

-- 1. التأكد من تفعيل RLS (Row Level Security)
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- 2. حذف أي سياسات قديمة قد تمنع الحذف أو تسبب تعارض
DROP POLICY IF EXISTS "Enable all access for loans" ON public.loans;
DROP POLICY IF EXISTS "Allow delete loans" ON public.loans;

-- 3. إنشاء سياسة شاملة تسمح بكل العمليات (Select, Insert, Update, Delete)
-- عبارة (FOR ALL) تشمل كل العمليات بما فيها الحذف
CREATE POLICY "Enable all access for loans" ON public.loans 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- تم التحديث. الآن يمكنك حذف السلف من التطبيق.
