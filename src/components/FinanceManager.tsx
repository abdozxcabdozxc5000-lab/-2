
import React, { useState, useMemo } from 'react';
import { Employee, CustodyRecord, ExpenseRecord, UserRole } from '../types';
import { 
    ArrowLeft, Search, Wallet, Receipt, Trash2, Plus, 
    TrendingUp, X, CheckCircle 
} from 'lucide-react';
import { upsertCustody, upsertExpense, deleteCustody, deleteExpense } from '../supabaseClient';

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
    const [activeTab, setActiveTab] = useState<'custody' | 'expenses'>('custody');
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // New Item States
    const [newCustody, setNewCustody] = useState<Partial<CustodyRecord>>({
        amount: 0, description: '', type: 'عهدة نقدية', paymentMethod: 'cash', status: 'confirmed', receivedDate: new Date().toISOString().split('T')[0]
    });
    const [newExpense, setNewExpense] = useState<Partial<ExpenseRecord>>({
        amount: 0, category: 'تشغيل', description: '', date: new Date().toISOString().split('T')[0], status: 'approved'
    });
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

    const canManageFinance = ['owner', 'general_manager', 'accountant'].includes(currentUserRole);

    const visibleCustodies = useMemo(() => {
        return custodies.filter(c => 
            c.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.description.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [custodies, searchTerm]);

    const visibleExpenses = useMemo(() => {
        return expenses.filter(e => 
            e.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            e.category.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [expenses, searchTerm]);

    const handleAddCustody = async () => {
        if (!selectedEmployeeId || !newCustody.amount) return;
        setIsSubmitting(true);
        const emp = employees.find(e => e.id === selectedEmployeeId);
        
        const record: CustodyRecord = {
            id: Date.now().toString(),
            employeeId: selectedEmployeeId,
            userName: emp?.name || 'Unknown',
            amount: newCustody.amount || 0,
            description: newCustody.description || '',
            type: newCustody.type || 'عهدة',
            category: newCustody.category,
            paymentMethod: newCustody.paymentMethod,
            source: newCustody.source,
            receivedDate: newCustody.receivedDate || new Date().toISOString(),
            status: 'confirmed'
        };

        await upsertCustody(record);
        setIsSubmitting(false);
        setShowModal(false);
        onUpdateData();
        setNewCustody({ amount: 0, description: '', type: 'عهدة نقدية', paymentMethod: 'cash', status: 'confirmed', receivedDate: new Date().toISOString().split('T')[0] });
        setSelectedEmployeeId('');
    };

    const handleAddExpense = async () => {
        if (!selectedEmployeeId || !newExpense.amount) return;
        setIsSubmitting(true);
        const emp = employees.find(e => e.id === selectedEmployeeId);

        const record: ExpenseRecord = {
            id: Date.now().toString(),
            employeeId: selectedEmployeeId,
            userName: emp?.name || 'Unknown',
            amount: newExpense.amount || 0,
            category: newExpense.category || 'عام',
            description: newExpense.description || '',
            date: newExpense.date || new Date().toISOString(),
            status: 'approved'
        };

        await upsertExpense(record);
        setIsSubmitting(false);
        setShowModal(false);
        onUpdateData();
        setNewExpense({ amount: 0, category: 'تشغيل', description: '', date: new Date().toISOString().split('T')[0], status: 'approved' });
        setSelectedEmployeeId('');
    };

    const handleDelete = async (type: 'custody' | 'expense', id: string) => {
        if(!confirm('هل أنت متأكد من الحذف؟')) return;
        if (type === 'custody') await deleteCustody(id);
        else await deleteExpense(id);
        onUpdateData();
    };

    const totalCustody = visibleCustodies.reduce((sum, c) => sum + c.amount, 0);
    const totalExpenses = visibleExpenses.reduce((sum, e) => sum + e.amount, 0);

    return (
        <div className="space-y-8 pb-20 animate-fade-in relative">
             {/* Header */}
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onExit}
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 transition-all shadow-sm"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <Wallet className="text-purple-500" /> العهد والمصروفات
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">إدارة العهد النقدية وتسجيل المصروفات</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-center md:self-auto shadow-inner">
                    <button
                        onClick={() => setActiveTab('custody')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'custody' 
                            ? 'bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-purple-400' 
                            : 'text-slate-500 hover:text-purple-600'
                        }`}
                    >
                        <Wallet size={16} /> العهد النقدية
                    </button>
                    <button
                        onClick={() => setActiveTab('expenses')}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                            activeTab === 'expenses' 
                            ? 'bg-white dark:bg-slate-700 shadow text-purple-600 dark:text-purple-400' 
                            : 'text-slate-500 hover:text-purple-600'
                        }`}
                    >
                        <Receipt size={16} /> المصروفات
                    </button>
                </div>
            </div>

            {/* Stats & Actions */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-6 px-4">
                    <div>
                        <p className="text-xs text-slate-500 font-bold mb-1">{activeTab === 'custody' ? 'إجمالي العهد' : 'إجمالي المصروفات'}</p>
                        <p className="text-2xl font-black text-slate-800 dark:text-white font-mono">
                            {(activeTab === 'custody' ? totalCustody : totalExpenses).toLocaleString()} 
                            <span className="text-xs text-slate-400 font-medium mr-1">ج.م</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-none">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="بحث..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 pr-10 pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                        />
                    </div>
                    {canManageFinance && (
                        <button 
                            onClick={() => setShowModal(true)}
                            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-purple-700 shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 text-sm shrink-0"
                        >
                            <Plus size={18} /> إضافة {activeTab === 'custody' ? 'عهدة' : 'مصروف'}
                        </button>
                    )}
                </div>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === 'custody' ? (
                    visibleCustodies.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-slate-400">
                            <Wallet size={48} className="mx-auto mb-4 opacity-50" />
                            <p>لا توجد عهد مسجلة</p>
                        </div>
                    ) : visibleCustodies.map(custody => (
                        <div key={custody.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 flex items-center justify-center font-bold text-lg">
                                        {custody.userName.charAt(0)}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-white">{custody.userName}</h4>
                                        <p className="text-xs text-slate-500">{new Date(custody.receivedDate).toLocaleDateString('ar-EG')}</p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-xl text-xs font-bold ${custody.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {custody.status === 'confirmed' ? 'نشط' : 'معلق'}
                                </span>
                            </div>
                            <div className="mb-4">
                                <p className="text-3xl font-black text-slate-800 dark:text-white font-mono mb-2">{custody.amount.toLocaleString()} <span className="text-sm text-slate-400 font-medium">ج.م</span></p>
                                <div className="flex flex-wrap gap-2">
                                    <span className="text-[10px] px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg font-bold">{custody.type}</span>
                                    {custody.paymentMethod && <span className="text-[10px] px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-bold">{custody.paymentMethod}</span>}
                                </div>
                                {custody.description && <p className="mt-3 text-sm text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">{custody.description}</p>}
                            </div>
                            {canManageFinance && (
                                <button 
                                    onClick={() => handleDelete('custody', custody.id)}
                                    className="absolute top-4 left-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))
                ) : (
                    visibleExpenses.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-slate-400">
                            <Receipt size={48} className="mx-auto mb-4 opacity-50" />
                            <p>لا توجد مصروفات مسجلة</p>
                        </div>
                    ) : visibleExpenses.map(expense => (
                        <div key={expense.id} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 flex items-center justify-center font-bold text-lg">
                                        <TrendingUp size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 dark:text-white">{expense.category}</h4>
                                        <p className="text-xs text-slate-500">{new Date(expense.date).toLocaleDateString('ar-EG')}</p>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{expense.userName}</p>
                                </div>
                            </div>
                            <div className="mb-4">
                                <p className="text-3xl font-black text-slate-800 dark:text-white font-mono mb-2">{expense.amount.toLocaleString()} <span className="text-sm text-slate-400 font-medium">ج.م</span></p>
                                {expense.description && <p className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">{expense.description}</p>}
                            </div>
                            {canManageFinance && (
                                <button 
                                    onClick={() => handleDelete('expense', expense.id)}
                                    className="absolute top-4 left-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Modal for Adding Items */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative animate-scale-in border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <button onClick={() => setShowModal(false)} className="absolute top-6 left-6 p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all">
                            <X size={24} />
                        </button>
                        
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                            {activeTab === 'custody' ? 'تسجيل عهدة جديدة' : 'تسجيل مصروف جديد'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">الموظف المسؤول</label>
                                <select 
                                    value={selectedEmployeeId}
                                    onChange={e => setSelectedEmployeeId(e.target.value)}
                                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500 appearance-none text-sm font-bold"
                                >
                                    <option value="">-- اختر الموظف --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">المبلغ (ج.م)</label>
                                    <input 
                                        type="number"
                                        value={activeTab === 'custody' ? newCustody.amount : newExpense.amount}
                                        onChange={e => activeTab === 'custody' ? setNewCustody({...newCustody, amount: parseFloat(e.target.value)}) : setNewExpense({...newExpense, amount: parseFloat(e.target.value)})}
                                        className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500 text-center font-mono font-bold text-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">التاريخ</label>
                                    <input 
                                        type="date"
                                        value={activeTab === 'custody' ? newCustody.receivedDate : newExpense.date}
                                        onChange={e => activeTab === 'custody' ? setNewCustody({...newCustody, receivedDate: e.target.value}) : setNewExpense({...newExpense, date: e.target.value})}
                                        className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500 text-sm font-bold"
                                    />
                                </div>
                            </div>

                            {activeTab === 'custody' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">نوع العهدة</label>
                                        <input 
                                            type="text" placeholder="عهدة نقدية"
                                            value={newCustody.type}
                                            onChange={e => setNewCustody({...newCustody, type: e.target.value})}
                                            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 mb-1.5">طريقة الدفع</label>
                                        <select 
                                            value={newCustody.paymentMethod}
                                            onChange={e => setNewCustody({...newCustody, paymentMethod: e.target.value})}
                                            className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                        >
                                            <option value="cash">كاش</option>
                                            <option value="bank">تحويل بنكي</option>
                                            <option value="wallet">محفظة إلكترونية</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'expenses' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">التصنيف</label>
                                    <select 
                                        value={newExpense.category}
                                        onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                                        className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                                    >
                                        <option value="تشغيل">مصاريف تشغيل</option>
                                        <option value="صيانة">صيانة وإصلاحات</option>
                                        <option value="نقل">نقل ومواصلات</option>
                                        <option value="خامات">مشتريات خامات</option>
                                        <option value="نثرية">نثريات مكتب</option>
                                        <option value="أخرى">أخرى</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">الوصف / ملاحظات</label>
                                <textarea 
                                    rows={3}
                                    value={activeTab === 'custody' ? newCustody.description : newExpense.description}
                                    onChange={e => activeTab === 'custody' ? setNewCustody({...newCustody, description: e.target.value}) : setNewExpense({...newExpense, description: e.target.value})}
                                    className="w-full p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-purple-500 text-sm resize-none"
                                    placeholder="أضف تفاصيل..."
                                />
                            </div>

                            <button 
                                onClick={activeTab === 'custody' ? handleAddCustody : handleAddExpense}
                                disabled={isSubmitting}
                                className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-[0.98] mt-4 flex justify-center"
                            >
                                {isSubmitting ? <span className="animate-spin text-xl">⏳</span> : 'حفظ البيانات'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinanceManager;
