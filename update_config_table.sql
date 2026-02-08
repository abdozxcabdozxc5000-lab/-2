
-- ---------------------------------------------------------
-- تشغيل هذا السكريبت في Supabase SQL Editor
-- الغرض: التأكد من جدول الإعدادات وإضافة الهيكل الجديد (مكتب/مصنع)
-- ---------------------------------------------------------

-- 1. إنشاء الجدول إذا لم يكن موجوداً (يستخدم JSONB لتخزين الإعدادات بمرونة)
CREATE TABLE IF NOT EXISTS public.app_config (
  id int PRIMARY KEY,
  config jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 2. تفعيل سياسات الأمان (RLS) للسماح بالقراءة والكتابة
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- حذف السياسة القديمة إذا وجدت لتجنب التكرار
DROP POLICY IF EXISTS "Enable all access for config" ON public.app_config;

-- إنشاء سياسة تسمح للجميع (أو للمصرح لهم في التطبيق) بالوصول
CREATE POLICY "Enable all access for config" ON public.app_config 
FOR ALL USING (true) WITH CHECK (true);

-- 3. تفعيل التحديث المباشر (Realtime) - (تم التعديل لتجنب الخطأ إذا كان مفعل مسبقاً)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE app_config;
    EXCEPTION
        WHEN duplicate_object OR sqlstate '42710' THEN
            RAISE NOTICE 'Table app_config is already in publication supabase_realtime, skipping.';
    END;
END $$;

-- 4. إدخال القيم الافتراضية للهيكل الجديد (المكتب والمصنع)
-- سيتم تنفيذ هذا فقط إذا لم يكن هناك إعدادات محفوظة مسبقاً (رقم التعريف 1)
INSERT INTO public.app_config (id, config)
VALUES (
    1,
    '{
        "gracePeriodMinutes": 15,
        "penaltyValue": 5,
        "weightCommitment": 0.1,
        "weightOvertime": 0.8,
        "weightAbsence": 0.1,
        "holidays": [],
        "office": {
            "lat": 30.0444,
            "lng": 31.2357,
            "radius": 100,
            "weekendDays": [5, 6],
            "workEndTime": "17:00",
            "workStartTime": "09:00",
            "locationEnabled": false
        },
        "factory": {
            "lat": 30.0444,
            "lng": 31.2357,
            "radius": 200,
            "weekendDays": [5],
            "workEndTime": "16:00",
            "workStartTime": "08:00",
            "locationEnabled": false
        }
    }'::jsonb
)
ON CONFLICT (id) DO NOTHING;
