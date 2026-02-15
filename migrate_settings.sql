
-- ==============================================================================
-- SQL Migration: Update Configuration Structure (Branch-Specific Rules)
-- تشغيل هذا السكريبت في Supabase SQL Editor
-- ==============================================================================

-- 1. التأكد من وجود سجل الإعدادات (إذا لم يكن موجوداً، قم بإنشائه فارغاً)
INSERT INTO public.app_config (id, config)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 2. تحديث إعدادات "المكتب" (Office)
-- نقوم بدمج القيم الجديدة مع القيم الموجودة حالياً للحفاظ على الإحداثيات ومواعيد العمل
UPDATE public.app_config
SET config = jsonb_set(
    config,
    '{office}',
    COALESCE(config->'office', '{}'::jsonb) || 
    '{
        "gracePeriodMinutes": 30,
        "penaltyValue": 0,
        "payrollDaysBase": 30,
        "payrollHoursBase": 8
    }'::jsonb
)
WHERE id = 1;

-- 3. تحديث إعدادات "المصنع" (Factory)
-- نقوم بدمج القيم الجديدة (فترة سماح أقل، جزاء أعلى، ساعات عمل مختلفة للرواتب)
UPDATE public.app_config
SET config = jsonb_set(
    config,
    '{factory}',
    COALESCE(config->'factory', '{}'::jsonb) || 
    '{
        "gracePeriodMinutes": 15,
        "penaltyValue": 1,
        "payrollDaysBase": 30,
        "payrollHoursBase": 9
    }'::jsonb
)
WHERE id = 1;

-- 4. تنظيف الإعدادات القديمة (Global Settings Cleanup)
-- حذف المفاتيح التي تم نقلها من المستوى العام لأنها لم تعد مستخدمة
UPDATE public.app_config
SET config = config - 'gracePeriodMinutes' - 'penaltyValue'
WHERE id = 1;

-- تم التحديث بنجاح! الآن قاعدة البيانات متوافقة مع الكود الجديد.
