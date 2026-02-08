
-- ---------------------------------------------------------
-- الخطوة 1: إصلاح قيد قاعدة البيانات (Constraint Fix)
-- المشكلة كانت أن قاعدة البيانات لا تسمح بكلمة 'office_manager'
-- هذا الكود سيقوم بتحديث القائمة المسموح بها
-- ---------------------------------------------------------

ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS check_role;

ALTER TABLE public.employees ADD CONSTRAINT check_role 
CHECK (role IN ('general_manager', 'owner', 'manager', 'office_manager', 'accountant', 'employee'));

-- ---------------------------------------------------------
-- الخطوة 2: إضافة المستخدم الجديد (مدير مكتب خاص)
-- ---------------------------------------------------------

INSERT INTO public.employees (
    id, 
    name, 
    email, 
    password, 
    role, 
    position, 
    department, 
    branch, 
    "joinDate", 
    avatar
)
VALUES (
    'user_private_office_mgr_02',       -- ID
    'مدير مكتب (خاص)',                  -- الاسم
    'hager@gmail.com',                  -- البريد (كما طلبت)
    '123123456',                        -- كلمة المرور (كما طلبت)
    'office_manager',                   -- الصلاحية
    'مدير مكتب خاص',                    -- الوظيفة
    'الإدارة العليا',                   -- القسم
    'office',                           -- الفرع
    CURRENT_DATE,                       -- التاريخ
    'https://ui-avatars.com/api/?name=Private+Manager&background=4f46e5&color=fff' -- الصورة
)
ON CONFLICT (id) DO UPDATE SET 
    email = 'hager@gmail.com',
    password = '123123456',
    role = 'office_manager',
    branch = 'office';

-- تم. يمكنك الآن الدخول بـ:
-- البريد: hager@gmail.com
-- الرقم السري: 123123456

