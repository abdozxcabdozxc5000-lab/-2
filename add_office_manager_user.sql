
-- ---------------------------------------------------------
-- تشغيل هذا السكريبت في Supabase SQL Editor
-- الغرض: إضافة مستخدم تجريبي بصلاحية "مدير مكتب" (Office Manager)
-- ملاحظة: بما أن عمود role من نوع text، لا حاجة لتعديل هيكل الجدول، فقط نقوم بإضافة البيانات.
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
    'user_office_manager_01',           -- ID فريد
    'مدير المكتب (تجريبي)',             -- الاسم
    'office@mowazeb.com',               -- البريد الإلكتروني للتجربة
    '123',                              -- كلمة المرور
    'office_manager',                   -- الصلاحية الجديدة
    'مدير إداري',                       -- الوظيفة
    'الإدارة',                          -- القسم
    'office',                           -- الفرع (مهم جداً أن يكون office)
    CURRENT_DATE,                       -- تاريخ الانضمام
    'https://ui-avatars.com/api/?name=Office+Manager&background=6366f1&color=fff' -- صورة رمزية
)
ON CONFLICT (id) DO UPDATE SET 
    role = 'office_manager',
    branch = 'office';

-- تم إضافة المستخدم بنجاح.
-- يمكنك الآن تسجيل الدخول بـ:
-- البريد: office@mowazeb.com
-- كلمة المرور: 123
