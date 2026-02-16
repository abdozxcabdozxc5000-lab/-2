
import React, { useState, useMemo } from 'react';
import { Employee, CustodyRecord, ExpenseRecord, UserRole } from '../types';
import { upsertCustody, deleteCustody, upsertExpense, deleteExpense } from '../supabaseClient';
import { 
    Wallet, DollarSign, Plus, Trash2, Calendar, FileText, 
    ArrowLeft, Search, CheckCircle, XCircle, Clock, Briefcase, 
    TrendingUp, AlertTriangle, Filter
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
    const [isLoading, setIsLoading] = useState(false);
    
    // Forms
    const [newCustody, setNewCustody] = useState<{empId: string, amount: string, desc: string}>({ empId: '', amount: '', desc: '' });
    const [newExpense, setNewExpense] = useState<{amount: string, category: string, desc: string, date: string}>({ amount: '', category: 'عام', desc: '', date: new Date().toISOString().split('T')[0] });

    // Permissions
    const canManageFinance = ['general_manager', 'owner', 'accountant', 'manager', 'office_manager'].includes(currentUserRole as string);

    // Filter Data
    const visibleCustodies = useMemo(() => {
        let filtered = custodies;
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
        if (!newCustody.empId || !newCustody.amount) return;
        setIsLoading(true);
        const custody: CustodyRecord = {
            id: Date.now().toString(),
            employeeId: newCustody.empId,
            amount: parseFloat(newCustody.amount),
            description: newCustody.desc,
            type: 'cash',
            receivedDate: new Date().toISOString(),
            status: 'active'
        };
        await upsertCustody(custody);
        setNewCustody({ empId: '', amount: '', desc: '' });
        onUpdateData();
        setIsLoading(false);
    };

    const handleAddExpense = async () => {
        if (!newExpense.amount || !newExpense.desc) return;
        setIsLoading(true);
        const expense: ExpenseRecord = {
            id: Date.now().toString(),
            employeeId: currentUserId,
            amount: parseFloat(newExpense.amount),
            category: newExpense.category,
            description: newExpense.desc,
            date: newExpense.date,
            status: 'pending'
        };
        await upsertExpense(expense);
        setNewExpense({ amount: '', category: 'عام', desc: '', date: new Date().toISOString().split('T')[0] });
        onUpdateData();
        setIsLoading(false);
    };

    const handleExpenseAction = async (expense: ExpenseRecord, status: 'approved' | 'rejected') => {
        if (!confirm(status === 'approved' ? 'اعتماد المصروف؟' : 'رفض المصروف؟')) return;
        await upsertExpense({ ...expense, status });
        onUpdateData();
    };

    const handleDeleteCustody = async (id: string) => {
        if (!confirm('حذف العهدة نهائياً؟')) return;
        await deleteCustody(id);
        onUpdateData();
    };

    const handleDeleteExpense = async (id: string) => {
        if (!confirm('حذف المصروف نهائياً؟')) return;
        await deleteExpense(id);
        onUpdateData();
    };

    return (
        <div className="space-y-8 pb-20 animate-fade-in">
            {/* Header Section (Matching Dashboard Style) */}
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onExit}
                        className="p-3 bg-slate-50 dark:bg-slate-700 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-600 transition-all text-slate-500 dark:text-slate-300"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                            <Wallet className="text-purple-600" /> الإدارة المالية
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                            {activeTab === 'custodies' ? 'متابعة العهد المسلمة للموظفين' : 'مراجعة واعتماد المصروفات'}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    {/* Stats */}
                    <div className="flex items-center gap-3 px-5 py-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800/30">
                        <Briefcase size={20} className="text-purple-600 dark:text-purple-400" />
                        <div>
                            <p className="text-[10px] text-purple-600/70 dark:text-purple-300 font-bold uppercase">إجمالي العهد</p>
                            <p className="text-lg font-black text-purple-700 dark:text-purple-200">{totalCustodyAmount.toLocaleString()} ج.م</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                        <Clock size={20} className="text-amber-600 dark:text-amber-400" />
                        <div>
                            <p className="text-[10px] text-amber-600/70 dark:text-amber-300 font-bold uppercase">مصروفات معلقة</p>
                            <p className="text-lg font-black text-amber-700 dark:text-amber-200">{totalPendingExpenses.toLocaleString()} ج.م</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs (Matching Settings Tabs Style) */}
            <div className="flex gap-4 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl max-w-md mx-auto xl:mx-0">
                <button 
                    onClick={() => setActiveTab('custodies')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'custodies' ? 'bg-white dark:bg-slate-700 shadow-md text-purple-600 dark:text-purple-400' : 'text-slate-500'}`}
                >
                    <Briefcase size={18} /> سجل العهد
                </button>
                <button 
                    onClick={() => setActiveTab('expenses')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
                >
                    <FileText size={18} /> المصروفات
                </button>
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* --- INPUT FORM CARD (Left Column) --- */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 sticky top-4">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                            <Plus className="text-emerald-500" size={24} /> 
                            {activeTab === 'custodies' ? 'صرف عهدة جديدة' : 'تسجيل مصروف جديد'}
                        </h3>
                        
                        {activeTab === 'custodies' ? (
                            /* CUSTODY FORM */
                            canManageFinance ? (
                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">الموظف المستلم</label>
                                        <select 
                                            value={newCustody.empId} 
                                            onChange={e => setNewCustody({...newCustody, empId: e.target.value})}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white"
                                        >
                                            <option value="">-- اختر الموظف --</option>
                                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">قيمة العهدة (ج.م)</label>
                                        <input 
                                            type="number" 
                                            value={newCustody.amount}
                                            onChange={e => setNewCustody({...newCustody, amount: e.target.value})}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-center font-black text-lg dark:text-white"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">وصف العهدة</label>
                                        <input 
                                            type="text" 
                                            placeholder="مثال: عهدة وقود، شراء خامات..."
                                            value={newCustody.desc}
                                            onChange={e => setNewCustody({...newCustody, desc: e.target.value})}
                                            className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white"
                                        />
                                    </div>
                                    <button 
                                        onClick={handleAddCustody}
                                        disabled={isLoading}
                                        className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isLoading ? 'جاري الحفظ...' : 'تسجيل العهدة'} <CheckCircle size={18} />
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center py-10 text-slate-400">
                                    <p>ليس لديك صلاحية صرف عهد.</p>
                                </div>
                            )
                        ) : (
                            /* EXPENSE FORM */
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">قيمة المصروف (ج.م)</label>
                                    <input 
                                        type="number" 
                                        value={newExpense.amount}
                                        onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-center font-black text-lg dark:text-white"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">تاريخ المصروف</label>
                                    <input 
                                        type="date" 
                                        value={newExpense.date}
                                        onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">بند الصرف</label>
                                    <select 
                                        value={newExpense.category}
                                        onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm dark:text-white"
                                    >
                                        <option value="عام">مصروفات عامة</option>
                                        <option value="وقود">وقود وانتقالات</option>
                                        <option value="ضيافة">ضيافة وبوفيه</option>
                                        <option value="خامات">شراء خامات</option>
                                        <option value="صيانة">صيانة وإصلاحات</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">التفاصيل</label>
                                    <textarea 
                                        rows={3}
                                        placeholder="اكتب تفاصيل المصروف..."
                                        value={newExpense.desc}
                                        onChange={e => setNewExpense({...newExpense, desc: e.target.value})}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-sm resize-none dark:text-white"
                                    />
                                </div>
                                <button 
                                    onClick={handleAddExpense}
                                    disabled={isLoading}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    {isLoading ? 'جاري الإرسال...' : 'إرسال للمراجعة'} <TrendingUp size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* --- DATA LIST (Right Column - Spans 2) --- */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Search Bar */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                        <Search className="text-slate-400" size={20}/>
                        <input 
                            type="text" 
                            placeholder={activeTab === 'custodies' ? "بحث باسم الموظف أو وصف العهدة..." : "بحث في المصروفات..."}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-transparent outline-none text-slate-700 dark:text-white font-medium"
                        />
                    </div>

                    {/* Records List */}
                    <div className="space-y-4">
                        {activeTab === 'custodies' ? (
                            visibleCustodies.length > 0 ? (
                                visibleCustodies.map(custody => {
                                    const emp = employees.find(e => e.id === custody.employeeId);
                                    return (
                                        <div key={custody.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-purple-200 transition-all group relative">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center font-bold text-lg">
                                                        {emp?.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-white text-lg">{emp?.name}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            <Calendar size={12} /> {new Date(custody.receivedDate).toLocaleDateString('ar-EG')}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-left">
                                                    <span className={`px-3 py-1 rounded-lg text-xs font-bold ${custody.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {custody.status === 'active' ? 'في العهدة' : 'تمت التسوية'}
                                                    </span>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl flex justify-between items-center">
                                                <div>
                                                    <p className="text-xs text-slate-500 mb-1">وصف العهدة</p>
                                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{custody.description}</p>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xs text-slate-500 mb-1">القيمة</p>
                                                    <p className="text-xl font-black text-slate-800 dark:text-white">{custody.amount.toLocaleString()} ج.م</p>
                                                </div>
                                            </div>

                                            {canManageFinance && (
                                                <button 
                                                    onClick={() => handleDeleteCustody(custody.id)}
                                                    className="absolute top-6 left-6 text-slate-300 hover:text-red-500 p-2 transition-colors opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-20 text-slate-400">
                                    <Briefcase size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>لا توجد سجلات عهد حالياً</p>
                                </div>
                            )
                        ) : (
                            visibleExpenses.length > 0 ? (
                                visibleExpenses.map(expense => {
                                    const emp = employees.find(e => e.id === expense.employeeId);
                                    return (
                                        <div key={expense.id} className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:border-blue-200 transition-all group relative">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold">
                                                        <DollarSign size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 dark:text-white text-lg">{expense.category}</h4>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                            <span>{emp?.name}</span> • <span>{expense.date}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-slate-800 dark:text-white">{expense.amount} <span className="text-xs font-medium text-slate-400">ج.م</span></p>
                                                </div>
                                            </div>

                                            <div className="mt-4 flex items-center justify-between">
                                                <p className="text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 py-2 px-4 rounded-xl flex-1 ml-4">
                                                    {expense.description}
                                                </p>
                                                
                                                <div className="flex items-center gap-2">
                                                    {expense.status === 'pending' ? (
                                                        canManageFinance ? (
                                                            <>
                                                                <button onClick={() => handleExpenseAction(expense, 'approved')} className="flex items-center gap-1 px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-xs font-bold transition-colors">
                                                                    <CheckCircle size={14} /> اعتماد
                                                                </button>
                                                                <button onClick={() => handleExpenseAction(expense, 'rejected')} className="flex items-center gap-1 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-xl text-xs font-bold transition-colors">
                                                                    <XCircle size={14} /> رفض
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <span className="flex items-center gap-1 px-3 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold border border-amber-100">
                                                                <Clock size={14} /> قيد المراجعة
                                                            </span>
                                                        )
                                                    ) : (
                                                        <span className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold ${expense.status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                                            {expense.status === 'approved' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                                            {expense.status === 'approved' ? 'تم الاعتماد' : 'مرفوض'}
                                                        </span>
                                                    )}
                                                    
                                                    {canManageFinance && (
                                                        <button onClick={() => handleDeleteExpense(expense.id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-20 text-slate-400">
                                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>لا توجد مصروفات مسجلة</p>
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinanceManager;
