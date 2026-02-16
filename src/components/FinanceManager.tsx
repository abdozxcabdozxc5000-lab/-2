
import React, { useState, useMemo } from 'react';
import { Employee, CustodyRecord, ExpenseRecord, UserRole } from '../types';
import { upsertCustody, deleteCustody, upsertExpense, deleteExpense } from '../supabaseClient';
import { 
    Wallet, DollarSign, Plus, Trash2, Calendar, FileText, 
    ArrowLeft, Search, CheckCircle, XCircle, Clock, Filter, Briefcase
} from 'lucide-react';

interface FinanceManagerProps {
    employees: Employee[];
    custodies: CustodyRecord[];
    expenses: ExpenseRecord[];
    currentUserRole: UserRole;
    currentUserId: string;
    onUpdateData: () => void;
    onExit: () => void;
}

const FinanceManager: React.FC<FinanceManagerProps> = ({ 
    employees, custodies, expenses, currentUserRole, currentUserId, onUpdateData, onExit 
}) => {
    const [activeTab, setActiveTab] = useState<'custodies' | 'expenses'>('custodies');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Forms
    const [newCustody, setNewCustody] = useState<{empId: string, amount: number, desc: string}>({ empId: '', amount: 0, desc: '' });
    const [newExpense, setNewExpense] = useState<{amount: number, category: string, desc: string, date: string}>({ amount: 0, category: 'عام', desc: '', date: new Date().toISOString().split('T')[0] });

    // Permissions
    const canManageFinance = ['general_manager', 'owner', 'accountant', 'manager', 'office_manager'].includes(currentUserRole);

    // Filter Data based on Role
    const visibleCustodies = useMemo(() => {
        let filtered = custodies;
        // If not admin, see only own data
        if (!canManageFinance) {
            filtered = custodies.filter(c => c.employeeId === currentUserId);
        }
        return filtered.filter(c => {
            const empName = employees.find(e => e.id === c.employeeId)?.name || '';
            return empName.toLowerCase().includes(searchQuery.toLowerCase()) || c.description.includes(searchQuery);
        });
    }, [custodies, searchQuery, canManageFinance, currentUserId, employees]);

    const visibleExpenses = useMemo(() => {
        let filtered = expenses;
        if (!canManageFinance) {
            filtered = expenses.filter(e => e.employeeId === currentUserId);
        }
        return filtered.filter(e => {
            const empName = employees.find(emp => emp.id === e.employeeId)?.name || '';
            return empName.toLowerCase().includes(searchQuery.toLowerCase()) || e.description.includes(searchQuery);
        });
    }, [expenses, searchQuery, canManageFinance, currentUserId, employees]);

    // Totals
    const totalCustodyAmount = visibleCustodies.filter(c => c.status === 'active').reduce((sum, c) => sum + c.amount, 0);
    const totalPendingExpenses = visibleExpenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);

    // Handlers
    const handleAddCustody = async () => {
        if (!newCustody.empId || newCustody.amount <= 0) return;
        const custody: CustodyRecord = {
            id: Date.now().toString(),
            employeeId: newCustody.empId,
            amount: newCustody.amount,
            description: newCustody.desc,
            type: 'cash',
            receivedDate: new Date().toISOString(),
            status: 'active'
        };
        await upsertCustody(custody);
        setNewCustody({ empId: '', amount: 0, desc: '' });
        onUpdateData();
        alert('تم إضافة العهدة بنجاح');
    };

    const handleAddExpense = async () => {
        if (newExpense.amount <= 0 || !newExpense.desc) return;
        const expense: ExpenseRecord = {
            id: Date.now().toString(),
            employeeId: currentUserId, // Employee submits for themselves
            amount: newExpense.amount,
            category: newExpense.category,
            description: newExpense.desc,
            date: newExpense.date,
            status: 'pending'
        };
        await upsertExpense(expense);
        setNewExpense({ amount: 0, category: 'عام', desc: '', date: new Date().toISOString().split('T')[0] });
        onUpdateData();
        alert('تم تقديم طلب المصروف بنجاح');
    };

    const handleExpenseAction = async (expense: ExpenseRecord, status: 'approved' | 'rejected') => {
        if (!confirm(status === 'approved' ? 'اعتماد المصروف؟' : 'رفض المصروف؟')) return;
        await upsertExpense({ ...expense, status });
        
        // If approved, verify if we need to deduct from custody automatically? 
        // For now, keep it simple.
        
        onUpdateData();
    };

    const handleDeleteCustody = async (id: string) => {
        if (!confirm('حذف العهدة نهائياً؟')) return;
        await deleteCustody(id);
        onUpdateData();
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={onExit} className="p-3 bg-white dark:bg-slate-800 rounded-2xl hover:bg-slate-50 shadow-sm text-slate-500">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <Wallet className="text-purple-500" /> إدارة العهد والمصروفات
                        </h1>
                        <p className="text-slate-500 text-sm">متابعة العهد الشخصية وتسوية المصروفات</p>
                    </div>
                </div>
                
                {/* Stats Cards */}
                <div className="flex gap-4">
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><Briefcase size={20}/></div>
                        <div>
                            <p className="text-xs text-slate-500">إجمالي العهد الحالية</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{totalCustodyAmount.toLocaleString()} ج.م</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-3">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Clock size={20}/></div>
                        <div>
                            <p className="text-xs text-slate-500">مصروفات تحت المراجعة</p>
                            <p className="text-lg font-black text-slate-800 dark:text-white">{totalPendingExpenses.toLocaleString()} ج.م</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 pb-1">
                <button 
                    onClick={() => setActiveTab('custodies')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'custodies' ? 'border-purple-500 text-purple-600' : 'border-transparent text-slate-500'}`}
                >
                    سجل العهد
                </button>
                <button 
                    onClick={() => setActiveTab('expenses')}
                    className={`pb-3 px-4 text-sm font-bold border-b-2 transition-all ${activeTab === 'expenses' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'}`}
                >
                    المصروفات والتسويات
                </button>
            </div>

            {/* --- CUSTODIES TAB --- */}
            {activeTab === 'custodies' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add Form (Only for Admins) */}
                    {canManageFinance && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 h-fit">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                                <Plus className="text-purple-500" size={20}/> صرف عهدة جديدة
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">الموظف المستلم</label>
                                    <select 
                                        value={newCustody.empId} 
                                        onChange={e => setNewCustody({...newCustody, empId: e.target.value})}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm"
                                    >
                                        <option value="">-- اختر الموظف --</option>
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">قيمة العهدة</label>
                                    <input 
                                        type="number" 
                                        value={newCustody.amount}
                                        onChange={e => setNewCustody({...newCustody, amount: parseFloat(e.target.value)})}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-center font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">وصف العهدة</label>
                                    <input 
                                        type="text" 
                                        placeholder="مثال: عهدة وقود، عهدة شراء خامات..."
                                        value={newCustody.desc}
                                        onChange={e => setNewCustody({...newCustody, desc: e.target.value})}
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm"
                                    />
                                </div>
                                <button 
                                    onClick={handleAddCustody}
                                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all"
                                >
                                    تسجيل العهدة
                                </button>
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className={`${canManageFinance ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-4`}>
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">سجل العهد {canManageFinance ? 'للموظفين' : 'الخاص بي'}</h3>
                            <div className="relative w-64">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                <input 
                                    type="text" placeholder="بحث..."
                                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pr-10 pl-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {visibleCustodies.map(custody => {
                                const emp = employees.find(e => e.id === custody.employeeId);
                                return (
                                    <div key={custody.id} className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500">
                                                    {emp?.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-white">{emp?.name}</h4>
                                                    <p className="text-xs text-slate-500">{new Date(custody.receivedDate).toLocaleDateString('ar-EG')}</p>
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${custody.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {custody.status === 'active' ? 'في العهدة' : 'تمت التسوية'}
                                            </span>
                                        </div>
                                        <div className="mb-4">
                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{custody.amount.toLocaleString()} <span className="text-sm font-medium text-slate-400">ج.م</span></p>
                                            <p className="text-sm text-slate-500 mt-1">{custody.description}</p>
                                        </div>
                                        {canManageFinance && (
                                            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-700">
                                                <button onClick={() => handleDeleteCustody(custody.id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                                                    <Trash2 size={18}/>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {visibleCustodies.length === 0 && <div className="col-span-full text-center py-10 text-slate-400">لا توجد عهد مسجلة</div>}
                        </div>
                    </div>
                </div>
            )}

            {/* --- EXPENSES TAB --- */}
            {activeTab === 'expenses' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add Expense (Available to everyone) */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 h-fit">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-slate-800 dark:text-white">
                            <FileText className="text-blue-500" size={20}/> تسجيل مصروف جديد
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">المبلغ المصروف</label>
                                <input 
                                    type="number" 
                                    value={newExpense.amount}
                                    onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-center font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">التاريخ</label>
                                <input 
                                    type="date" 
                                    value={newExpense.date}
                                    onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">بند الصرف</label>
                                <select 
                                    value={newExpense.category}
                                    onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm"
                                >
                                    <option value="عام">مصروفات عامة</option>
                                    <option value="وقود">وقود وانتقالات</option>
                                    <option value="ضيافة">ضيافة وبوفيه</option>
                                    <option value="خامات">شراء خامات</option>
                                    <option value="صيانة">صيانة</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">التفاصيل</label>
                                <textarea 
                                    rows={3}
                                    placeholder="اكتب تفاصيل المصروف..."
                                    value={newExpense.desc}
                                    onChange={e => setNewExpense({...newExpense, desc: e.target.value})}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm resize-none"
                                />
                            </div>
                            <button 
                                onClick={handleAddExpense}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all"
                            >
                                إرسال للمراجعة
                            </button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">سجل المصروفات</h3>
                            <div className="relative w-64">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                                <input 
                                    type="text" placeholder="بحث..."
                                    value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    className="w-full pr-10 pl-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm outline-none"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            {visibleExpenses.map(expense => {
                                const emp = employees.find(e => e.id === expense.employeeId);
                                return (
                                    <div key={expense.id} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                                        <div className="flex items-center gap-3 w-full sm:w-auto">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold">
                                                <DollarSign size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800 dark:text-white">{expense.category}</h4>
                                                <p className="text-xs text-slate-500">{emp?.name}</p>
                                            </div>
                                        </div>
                                        
                                        <div className="flex-1 text-center sm:text-right w-full">
                                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{expense.description}</p>
                                            <p className="text-[10px] text-slate-400">{expense.date}</p>
                                        </div>

                                        <div className="text-center w-full sm:w-auto">
                                            <p className="text-lg font-black text-slate-800 dark:text-white">{expense.amount} ج.م</p>
                                        </div>

                                        <div className="flex items-center gap-2 w-full sm:w-auto justify-center">
                                            {expense.status === 'pending' ? (
                                                canManageFinance ? (
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleExpenseAction(expense, 'approved')} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200"><CheckCircle size={18}/></button>
                                                        <button onClick={() => handleExpenseAction(expense, 'rejected')} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><XCircle size={18}/></button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-bold text-amber-500 bg-amber-50 px-3 py-1 rounded-full">قيد المراجعة</span>
                                                )
                                            ) : (
                                                <span className={`text-xs font-bold px-3 py-1 rounded-full ${expense.status === 'approved' ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                                                    {expense.status === 'approved' ? 'معتمد' : 'مرفوض'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {visibleExpenses.length === 0 && <div className="text-center py-10 text-slate-400">لا توجد مصروفات</div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceManager;
