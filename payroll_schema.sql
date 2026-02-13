
-- ==============================================================================
-- SQL Schema for Professional Payroll & Loans System (نظام المرتبات والسلف الاحترافي)
-- ==============================================================================

-- 1. تحديث جدول الموظفين (Employees)
-- إضافة الأعمدة الخاصة بالراتب الأساسي ونوع التوظيف
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS basic_salary numeric DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'office';

-- ------------------------------------------------------------------------------

-- 2. إنشاء جدول السلف (Loans)
-- نستخدم علامات التنصيص " " للحفاظ على حالة الأحرف (CamelCase) لتسهيل الربط مع الكود
CREATE TABLE IF NOT EXISTS public.loans (
    id text PRIMARY KEY,
    "employeeId" text REFERENCES public.employees(id) ON DELETE CASCADE,
    "totalAmount" numeric NOT NULL,       -- قيمة السلفة الإجمالية
    "paidAmount" numeric DEFAULT 0,       -- ما تم سداده حتى الآن
    "installmentPerMonth" numeric NOT NULL, -- القسط الشهري
    "startDate" timestamp with time zone,
    status text DEFAULT 'active',         -- active (جارية) / completed (منتهية)
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------

-- 3. إنشاء جدول الرواتب (Payrolls)
-- هذا الجدول يخزن "قسيمة القبض" لكل موظف شهرياً
CREATE TABLE IF NOT EXISTS public.payrolls (
    id text PRIMARY KEY,
    "employeeId" text REFERENCES public.employees(id) ON DELETE CASCADE,
    month int NOT NULL,
    year int NOT NULL,
    
    -- المستحقات (Additions)
    "basicSalary" numeric DEFAULT 0,
    "overtimeHours" numeric DEFAULT 0,    -- ساعات الإضافي (للمصنع)
    "overtimeValue" numeric DEFAULT 0,    -- قيمة الإضافي
    incentives numeric DEFAULT 0,         -- حوافز (للمكتب)
    commissions numeric DEFAULT 0,        -- عمولات (للمبيعات)
    bonuses numeric DEFAULT 0,            -- مكافآت أخرى
    
    -- الاستقطاعات (Deductions)
    "absentDays" numeric DEFAULT 0,       -- عدد أيام الغياب
    "absentValue" numeric DEFAULT 0,      -- قيمة خصم الغياب
    "penaltyValue" numeric DEFAULT 0,     -- قيمة الجزاءات
    "loanDeduction" numeric DEFAULT 0,    -- قسط السلفة المخصوم هذا الشهر
    insurance numeric DEFAULT 0,          -- تأمينات اجتماعية
    
    -- الصافي (Net)
    "netSalary" numeric DEFAULT 0,
    
    status text DEFAULT 'draft',          -- draft (مسودة) / paid (تم الصرف)
    "generatedAt" timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------

-- 4. إعدادات الأمان (Row Level Security - RLS)
-- تفعيل الحماية والسماح بالوصول (يمكن تخصيصها لاحقاً حسب الصلاحيات)

ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

-- حذف السياسات القديمة إن وجدت لتجنب التكرار
DROP POLICY IF EXISTS "Enable all access for loans" ON public.loans;
DROP POLICY IF EXISTS "Enable all access for payrolls" ON public.payrolls;

-- إنشاء سياسات تسمح بالقراءة والكتابة للجميع (لضمان عمل التطبيق بسلاسة)
CREATE POLICY "Enable all access for loans" ON public.loans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for payrolls" ON public.payrolls FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------

-- 5. تفعيل التحديث اللحظي (Realtime)
-- لكي تظهر السلف والرواتب فوراً عند الإضافة بدون تحديث الصفحة

DO $$
BEGIN
    -- إضافة جدول السلف للـ Realtime
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'loans') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE loans;
    END IF;

    -- إضافة جدول الرواتب للـ Realtime
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'payrolls') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE payrolls;
    END IF;
    
    -- التأكد من وجود جدول الموظفين والإعدادات
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'employees') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE employees;
    END IF;
END $$;

-- تم الانتهاء. قاعدة البيانات جاهزة الآن لنظام المرتبات.
