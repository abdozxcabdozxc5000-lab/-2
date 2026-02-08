

import React, { useState } from 'react';
import { Employee, UserRole } from '../types';
import { Plus, Trash2, Shield, User, X, Mail, Key, Edit, AlertTriangle, Building, Factory } from 'lucide-react';

interface UserManagementProps {
  employees: Employee[];
  onAddUser: (user: Omit<Employee, 'id'>) => void;
  onUpdateUser: (id: string, user: Partial<Employee>) => void;
  onDeleteUser: (id: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ employees, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    position: '',
    department: '',
    branch: 'office', // Default branch
    joinDate: new Date().toISOString().split('T')[0]
  });

  const resetForm = () => {
      setFormData({ 
        name: '', 
        email: '', 
        password: '', 
        role: 'employee', 
        position: '', 
        department: '', 
        branch: 'office',
        joinDate: new Date().toISOString().split('T')[0] 
      });
      setEditingId(null);
  };

  const handleOpenAdd = () => {
      resetForm();
      setShowModal(true);
  };

  const handleOpenEdit = (emp: Employee) => {
      setFormData({
          name: emp.name,
          email: emp.email,
          role: emp.role,
          position: emp.position,
          department: emp.department,
          branch: emp.branch || 'office',
          joinDate: emp.joinDate,
          password: emp.password || '' 
      });
      setEditingId(emp.id);
      setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.role || !formData.position) {
         alert('يرجى ملء الحقول الأساسية (الاسم، البريد، الدور، الوظيفة)');
         return;
    }

    if (editingId) {
        const updates: Partial<Employee> = {
            name: formData.name,
            email: formData.email,
            role: formData.role as UserRole,
            position: formData.position,
            department: formData.department || 'عام',
            branch: formData.branch as 'office' | 'factory',
            joinDate: formData.joinDate,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || '')}&background=random`
        };
        
        if (formData.password) {
            updates.password = formData.password;
        }

        onUpdateUser(editingId, updates);

    } else {
        if (!formData.password) {
            alert('كلمة المرور مطلوبة عند إضافة مستخدم جديد');
            return;
        }

        onAddUser({
            name: formData.name!,
            email: formData.email!,
            password: formData.password,
            role: formData.role as UserRole,
            position: formData.position!,
            department: formData.department || 'عام',
            branch: formData.branch as 'office' | 'factory',
            joinDate: formData.joinDate || new Date().toISOString().split('T')[0],
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name!)}&background=random`
        } as Employee);
    }
      
    setShowModal(false);
    resetForm();
  };

  const executeDelete = () => {
      if (deleteConfirmId) {
          onDeleteUser(deleteConfirmId);
          setDeleteConfirmId(null);
      }
  };

  const roleLabels: Record<string, string> = {
    'general_manager': 'مدير عام',
    'manager': 'مدير',
    'owner': 'صاحب شركة',
    'accountant': 'محاسب',
    'office_manager': 'مدير مكتب',
    'employee': 'موظف'
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 dark:text-white">إدارة المستخدمين والموظفين</h2>
           <p className="text-slate-500 dark:text-slate-400">إضافة وتعديل وحذف المستخدمين وتحديد الصلاحيات</p>
        </div>
        <button 
           onClick={handleOpenAdd}
           className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 dark:shadow-blue-900/50"
        >
           <Plus size={20} />
           إضافة مستخدم
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
            <tr>
              <th className="p-4">المستخدم</th>
              <th className="p-4">بيانات الدخول</th>
              <th className="p-4">الصلاحية</th>
              <th className="p-4">القسم/الفرع</th>
              <th className="p-4 text-center">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-full" />
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white">{emp.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{emp.position}</div>
                  </div>
                </td>
                <td className="p-4">
                    <div className="flex flex-col text-sm">
                        <span className="text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1">
                            <Mail size={12} className="text-slate-400"/> {emp.email}
                        </span>
                        <span className="text-slate-400 dark:text-slate-500 text-xs flex items-center gap-1 mt-1">
                            <Key size={12}/> ******
                        </span>
                    </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      emp.role === 'general_manager' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' :
                      emp.role === 'owner' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' :
                      emp.role === 'manager' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                      emp.role === 'office_manager' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' :
                      'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                  }`}>
                    {roleLabels[emp.role] || emp.role}
                  </span>
                </td>
                <td className="p-4 text-slate-600 dark:text-slate-400">
                    <div className="flex flex-col gap-1">
                        <span>{emp.department}</span>
                        {emp.branch === 'factory' ? 
                            <span className="text-[10px] w-fit bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">مصنع</span> : 
                            <span className="text-[10px] w-fit bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">مكتب</span>
                        }
                    </div>
                </td>
                <td className="p-4 text-center flex justify-center gap-2">
                   <button 
                      onClick={() => handleOpenEdit(emp)}
                      className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      title="تعديل المستخدم"
                   >
                      <Edit size={18} />
                   </button>
                   <button 
                      onClick={() => setDeleteConfirmId(emp.id)}
                      className="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="حذف المستخدم"
                    >
                      <Trash2 size={18} />
                   </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-scale-in max-h-[90vh] overflow-y-auto">
            <button 
                onClick={() => { setShowModal(false); resetForm(); }}
                className="absolute top-4 left-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
                <X size={24} />
            </button>
            <h3 className="text-xl font-bold mb-6 text-slate-800 dark:text-white">
                {editingId ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الاسم الكامل</label>
                <input 
                  type="text" required
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  placeholder="مثال: محمد أحمد"
                />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">بيانات الدخول</h4>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">البريد الإلكتروني</label>
                    <input 
                      type="email" required
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dir-ltr dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder="user@company.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        كلمة المرور
                        {editingId && <span className="text-xs font-normal text-slate-400 mr-2">(اتركها فارغة لعدم التغيير)</span>}
                    </label>
                    <input 
                      type="password" 
                      required={!editingId} 
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dir-ltr dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder="********"
                    />
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الصلاحية (الدور)</label>
                    <select 
                      value={formData.role}
                      onChange={e => setFormData({...formData, role: e.target.value as UserRole})}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                      <option value="employee">موظف</option>
                      <option value="accountant">محاسب</option>
                      <option value="manager">مدير</option>
                      <option value="office_manager">مدير مكتب (خاص)</option>
                      <option value="general_manager">مدير عام</option>
                      <option value="owner">صاحب شركة</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الفرع الرئيسي</label>
                    <select 
                      value={formData.branch}
                      onChange={e => setFormData({...formData, branch: e.target.value as 'office' | 'factory'})}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    >
                      <option value="office">المكتب الرئيسي</option>
                      <option value="factory">المصنع</option>
                    </select>
                 </div>
              </div>

              <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المسمى الوظيفي</label>
                  <input 
                    type="text" required
                    value={formData.position}
                    onChange={e => setFormData({...formData, position: e.target.value})}
                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    placeholder="مثال: محاسب، مهندس، فني..."
                  />
               </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">القسم</label>
                    <input 
                      type="text" required
                      value={formData.department}
                      onChange={e => setFormData({...formData, department: e.target.value})}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                      placeholder="مثال: المالية، الإنتاج"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">تاريخ الانضمام</label>
                    <input 
                      type="date" required
                      value={formData.joinDate}
                      onChange={e => setFormData({...formData, joinDate: e.target.value})}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    />
                 </div>
              </div>

              <div className="pt-4">
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-blue-900/50 transition-all active:scale-[0.98]">
                  {editingId ? 'حفظ التغييرات' : 'حفظ وإضافة المستخدم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CHIC INTERNAL DELETE CONFIRMATION --- */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl text-center animate-scale-in border-2 border-slate-100 dark:border-slate-700 relative">
                 <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 shadow-inner">
                     <AlertTriangle size={40} />
                 </div>
                 
                 <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">حذف المستخدم نهائياً</h3>
                 <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                     هل أنت متأكد من رغبتك في حذف هذا المستخدم؟ <br/>
                     <span className="font-bold text-red-500">سيتم مسح جميع سجلات الحضور الخاصة به ولا يمكن التراجع.</span>
                 </p>
                 
                 <div className="flex flex-col gap-3">
                     <button 
                         onClick={executeDelete} 
                         className="w-full bg-red-600 text-white py-4 rounded-2xl font-black hover:bg-red-700 shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                     >
                         نعم، حذف المستخدم
                     </button>
                     <button 
                         onClick={() => setDeleteConfirmId(null)} 
                         className="w-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 py-4 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                     >
                         إلغاء الأمر
                     </button>
                 </div>
             </div>
        </div>
      )}

    </div>
  );
};

export default UserManagement;