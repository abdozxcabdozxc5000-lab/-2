
-- ---------------------------------------------------------
-- تشغيل هذا السكريبت في Supabase SQL Editor
-- الغرض: إنشاء جداول المرتبات والسلف وتحديث الموظفين
-- ---------------------------------------------------------

-- 1. تحديث جدول الموظفين لإضافة حقول المرتب
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS basic_salary numeric DEFAULT 0;
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS employment_type text DEFAULT 'office';

-- 2. إنشاء جدول السلف (Loans)
CREATE TABLE IF NOT EXISTS public.loans (
    id text PRIMARY KEY,
    "employeeId" text REFERENCES public.employees(id) ON DELETE CASCADE,
    "totalAmount" numeric NOT NULL,
    "paidAmount" numeric DEFAULT 0,
    "installmentPerMonth" numeric NOT NULL,
    "startDate" timestamp with time zone,
    status text DEFAULT 'active', -- active, completed
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 3. إنشاء جدول الرواتب (Payrolls) - سجلات القبض الشهرية
CREATE TABLE IF NOT EXISTS public.payrolls (
    id text PRIMARY KEY, -- Composite key recommended in logic (empId-year-month), but text is fine
    "employeeId" text REFERENCES public.employees(id) ON DELETE CASCADE,
    month int NOT NULL,
    year int NOT NULL,
    "basicSalary" numeric DEFAULT 0,
    "overtimeHours" numeric DEFAULT 0,
    "overtimeValue" numeric DEFAULT 0,
    incentives numeric DEFAULT 0,
    commissions numeric DEFAULT 0,
    bonuses numeric DEFAULT 0,
    "absentDays" numeric DEFAULT 0,
    "absentValue" numeric DEFAULT 0,
    "penaltyValue" numeric DEFAULT 0,
    "loanDeduction" numeric DEFAULT 0,
    insurance numeric DEFAULT 0,
    "netSalary" numeric DEFAULT 0,
    status text DEFAULT 'draft', -- draft, paid
    "generatedAt" timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- 4. تفعيل سياسات الأمان (RLS)
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payrolls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all for loans" ON public.loans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for payrolls" ON public.payrolls FOR ALL USING (true) WITH CHECK (true);

-- 5. تفعيل Realtime للجداول الجديدة
ALTER PUBLICATION supabase_realtime ADD TABLE loans;
ALTER PUBLICATION supabase_realtime ADD TABLE payrolls;
ALTER PUBLICATION supabase_realtime ADD TABLE employees; -- Ensure emp updates are broadcasted
