
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, CustodyRecord, ExpenseRecord, UserRole, AppConfig } from '../types';
import { upsertCustody, deleteCustody, upsertExpense, deleteExpense } from '../supabaseClient';
import { 
    DollarSign, FileText, TrendingUp, Clock, Briefcase, 
    ArrowRight, Plus, Search, Trash2, CheckCircle, XCircle, 
    Moon, Sun, LogOut, Menu, X, ChevronLeft, ChevronRight, Settings, Tag, Wallet, CreditCard, User
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

interface FinanceManagerProps {
    employees: Employee[];
    custodies: CustodyRecord[];
    expenses: ExpenseRecord[];
    currentUserRole: UserRole;
    currentUserId: string;
    config: AppConfig;
    onUpdateData: () => void;
    onExit: () => void;
}

// --- DEFAULTS ---
const DEFAULT_CATEGORIES = ['عام', 'وقود', 'صيانة', 'ضيافة', 'خامات', 'نثرية', 'كهرباء', 'إيجار'];

// Custody Specific Defaults
const DEFAULT_CUSTODY_CLASSIFICATIONS = ['عهدة مصنع', 'عهدة مكتب', 'عهدة سيارة', 'عهدة مشروع'];
const DEFAULT_PAYMENT_METHODS = ['كاش (نقدية)', 'تحويل بنكي', 'شيك', 'فودافون كاش'];
const DEFAULT_SOURCES = ['الخزينة الرئيسية', 'البنك', 'عهدة المدير العام'];

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const FinanceManager: React.FC<FinanceManagerProps> = ({
    employees,
    custodies,
    expenses,
    currentUserRole,
    currentUserId,
    config,
    onUpdateData,
    onExit
}) => {
    // Permission check
    const canManage = config.permissions?.financeManage?.includes(currentUserRole) || currentUserRole === 'owner';

    const [activeTab, setActiveTab] = useState<'dashboard' | 'custody' | 'expenses'>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState<'custody' | 'expense'>('custody');

    // Form States
    const [newCustody, setNewCustody] = useState<Partial<CustodyRecord>>({
        amount: 0, description: '', type: DEFAULT_CUSTODY_CLASSIFICATIONS[0],
        paymentMethod: DEFAULT_PAYMENT_METHODS[0], source: DEFAULT_SOURCES[0],
        receivedDate: new Date().toISOString().split('T')[0], status: 'confirmed'
    });
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

    const [newExpense, setNewExpense] = useState<Partial<ExpenseRecord>>({
        amount: 0, description: '', category: DEFAULT_CATEGORIES[0],
        date: new Date().toISOString().split('T')[0], status: 'approved'
    });

    // Filtering
    const filteredCustodies = useMemo(() => {
        return custodies.filter(c => 
            c.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
            c.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [custodies, searchQuery]);

    const filteredExpenses = useMemo(() => {
        return expenses.filter(e => 
            e.userName.toLowerCase().includes(searchQuery.toLowerCase()) || 
            e.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.category.includes(searchQuery)
        );
    }, [expenses, searchQuery]);

    // Analytics
    const totalCustody = custodies.reduce((sum, c) => sum + c.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    // const balance = totalCustody - totalExpenses; 

    const expenseByCategory = useMemo(() => {
        const data: {[key: string]: number} = {};
        expenses.forEach(e => {
            data[e.category] = (data[e.category] || 0) + e.amount;
        });
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [expenses]);

    // Handlers
    const handleAddCustody = async () => {
        if (!selectedEmployeeId || !newCustody.amount) return;
        const emp = employees.find(e => e.id === selectedEmployeeId);
        
        const record: CustodyRecord = {
            id: Date.now().toString(),
            employeeId: selectedEmployeeId,
            userName: emp?.name || 'Unknown',
            amount: newCustody.amount!,
            description: newCustody.description || '',
            type: newCustody.type || 'عام',
            category: newCustody.category,
            paymentMethod: newCustody.paymentMethod,
            source: newCustody.source,
            receivedDate: newCustody.receivedDate || new Date().toISOString(),
            status: 'confirmed'
        };
        
        await upsertCustody(record);
        onUpdateData();
        setShowModal(false);
    };

    const handleAddExpense = async () => {
        if (!newExpense.amount || !newExpense.description) return;
        const emp = employees.find(e => e.id === (selectedEmployeeId || currentUserId)); 
        
        const record: ExpenseRecord = {
            id: Date.now().toString(),
            employeeId: emp?.id || currentUserId,
            userName: emp?.name || 'System',
            amount: newExpense.amount!,
            description: newExpense.description!,
            category: newExpense.category || 'عام',
            date: newExpense.date || new Date().toISOString(),
            status: 'approved'
        };

        await upsertExpense(record);
        onUpdateData();
        setShowModal(false);
    };

    const handleDeleteItem = async (id: string, type: 'custody' | 'expense') => {
        if(!confirm('هل أنت متأكد من الحذف؟')) return;
        if(type === 'custody') await deleteCustody(id);
        else await deleteExpense(id);
        onUpdateData();
    };

    return (
       <div className="space-y-6 animate-fade-in pb-20">
           {/* Header */}
           <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
               <div className="flex items-center gap-4">
                   <button onClick={onExit} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 transition-colors">
                       <ArrowRight className="transform rotate-180" />
                   </button>
                   <div>
                       <h1 className="text-2xl font-black text-slate-800 dark:text-white">الإدارة المالية والعهد</h1>
                       <p className="text-slate-500 text-sm">متابعة المصروفات، العهد، والتسويات المالية</p>
                   </div>
               </div>
               
               <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-xl">
                   <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-white dark:bg-slate-700 shadow text-purple-600' : 'text-slate-500'}`}>لوحة المؤشرات</button>
                   <button onClick={() => setActiveTab('custody')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'custody' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-500'}`}>سجل العهد</button>
                   <button onClick={() => setActiveTab('expenses')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'expenses' ? 'bg-white dark:bg-slate-700 shadow text-red-600' : 'text-slate-500'}`}>المصروفات</button>
               </div>
           </div>

           {/* Dashboard View */}
           {activeTab === 'dashboard' && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {/* KPI Cards */}
                   <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                       <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600"><Wallet /></div>
                           <span className="text-xs font-bold text-slate-400">إجمالي العهد المنصرفة</span>
                       </div>
                       <h3 className="text-3xl font-black text-slate-800 dark:text-white">{totalCustody.toLocaleString()} <span className="text-sm font-medium text-slate-400">ج.م</span></h3>
                   </div>
                   <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                       <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600"><TrendingUp /></div>
                           <span className="text-xs font-bold text-slate-400">إجمالي المصروفات</span>
                       </div>
                       <h3 className="text-3xl font-black text-slate-800 dark:text-white">{totalExpenses.toLocaleString()} <span className="text-sm font-medium text-slate-400">ج.م</span></h3>
                   </div>
                   <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                       <div className="flex justify-between items-start mb-4">
                           <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl text-purple-600"><Briefcase /></div>
                           <span className="text-xs font-bold text-slate-400">عدد الحركات</span>
                       </div>
                       <h3 className="text-3xl font-black text-slate-800 dark:text-white">{custodies.length + expenses.length} <span className="text-sm font-medium text-slate-400">حركة</span></h3>
                   </div>

                   {/* Charts */}
                   <div className="md:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-80">
                       <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4">توزيع المصروفات حسب الفئة</h4>
                       <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={expenseByCategory}>
                               <defs>
                                   <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                       <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                                       <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                                   </linearGradient>
                               </defs>
                               <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                               <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                               <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                               <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorVal)" />
                           </AreaChart>
                       </ResponsiveContainer>
                   </div>
                   <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 h-80 flex flex-col items-center justify-center">
                       <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-4 w-full text-right">نسب المصروفات</h4>
                       <ResponsiveContainer width="100%" height="100%">
                           <PieChart>
                               <Pie data={expenseByCategory} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                   {expenseByCategory.map((entry, index) => (
                                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                   ))}
                               </Pie>
                               <Tooltip />
                           </PieChart>
                       </ResponsiveContainer>
                   </div>
               </div>
           )}

           {/* Custody & Expenses Tables */}
           {(activeTab === 'custody' || activeTab === 'expenses') && (
               <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                   <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                       <div className="relative w-full md:w-64">
                           <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                           <input 
                               type="text" 
                               placeholder="بحث..." 
                               value={searchQuery}
                               onChange={e => setSearchQuery(e.target.value)}
                               className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-purple-500"
                           />
                       </div>
                       
                       {canManage && (
                           <button 
                               onClick={() => {
                                   setModalType(activeTab === 'custody' ? 'custody' : 'expense');
                                   setShowModal(true);
                               }}
                               className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20"
                           >
                               <Plus size={18} /> {activeTab === 'custody' ? 'إضافة عهدة' : 'تسجيل مصروف'}
                           </button>
                       )}
                   </div>

                   <div className="overflow-x-auto">
                       <table className="w-full text-right text-sm">
                           <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold text-xs uppercase">
                               <tr>
                                   <th className="p-4">#</th>
                                   <th className="p-4">الموظف / المستفيد</th>
                                   <th className="p-4">البيان</th>
                                   <th className="p-4">المبلغ</th>
                                   <th className="p-4">{activeTab === 'custody' ? 'النوع' : 'الفئة'}</th>
                                   <th className="p-4">التاريخ</th>
                                   {canManage && <th className="p-4 text-center">إجراءات</th>}
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                               {activeTab === 'custody' ? (
                                   filteredCustodies.map((item, idx) => (
                                       <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                           <td className="p-4 text-slate-400">{idx+1}</td>
                                           <td className="p-4 font-bold text-slate-800 dark:text-white">{item.userName}</td>
                                           <td className="p-4 text-slate-600 dark:text-slate-300">{item.description}</td>
                                           <td className="p-4 font-mono font-bold text-blue-600">{item.amount.toLocaleString()}</td>
                                           <td className="p-4">
                                               <span className="px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">{item.type}</span>
                                           </td>
                                           <td className="p-4 font-mono text-slate-500">{item.receivedDate.split('T')[0]}</td>
                                           {canManage && (
                                               <td className="p-4 text-center">
                                                   <button onClick={() => handleDeleteItem(item.id, 'custody')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                       <Trash2 size={16} />
                                                   </button>
                                               </td>
                                           )}
                                       </tr>
                                   ))
                               ) : (
                                   filteredExpenses.map((item, idx) => (
                                       <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                           <td className="p-4 text-slate-400">{idx+1}</td>
                                           <td className="p-4 font-bold text-slate-800 dark:text-white">{item.userName}</td>
                                           <td className="p-4 text-slate-600 dark:text-slate-300">{item.description}</td>
                                           <td className="p-4 font-mono font-bold text-red-600">{item.amount.toLocaleString()}</td>
                                           <td className="p-4">
                                               <span className="px-2 py-1 rounded bg-amber-50 text-amber-700 text-xs font-bold border border-amber-100">{item.category}</span>
                                           </td>
                                           <td className="p-4 font-mono text-slate-500">{item.date.split('T')[0]}</td>
                                           {canManage && (
                                               <td className="p-4 text-center">
                                                   <button onClick={() => handleDeleteItem(item.id, 'expense')} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                       <Trash2 size={16} />
                                                   </button>
                                               </td>
                                           )}
                                       </tr>
                                   ))
                               )}
                           </tbody>
                       </table>
                   </div>
               </div>
           )}

           {/* ADD MODAL */}
           {showModal && (
               <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                   <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl animate-scale-in">
                       <div className="flex justify-between items-center mb-6">
                           <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                               {modalType === 'custody' ? 'إضافة عهدة جديدة' : 'تسجيل مصروف جديد'}
                           </h3>
                           <button onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X size={20} /></button>
                       </div>
                       
                       <div className="space-y-4">
                           <div>
                               <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">الموظف / المسؤول</label>
                               <select 
                                   value={selectedEmployeeId}
                                   onChange={e => setSelectedEmployeeId(e.target.value)}
                                   className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 outline-none"
                               >
                                   <option value="">-- اختر الموظف --</option>
                                   {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                               </select>
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                               <div>
                                   <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">المبلغ (ج.م)</label>
                                   <input 
                                       type="number" 
                                       value={modalType === 'custody' ? newCustody.amount : newExpense.amount}
                                       onChange={e => modalType === 'custody' ? setNewCustody({...newCustody, amount: parseFloat(e.target.value)}) : setNewExpense({...newExpense, amount: parseFloat(e.target.value)})}
                                       className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 outline-none font-bold"
                                   />
                               </div>
                               <div>
                                   <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">التاريخ</label>
                                   <input 
                                       type="date" 
                                       value={modalType === 'custody' ? (newCustody.receivedDate?.split('T')[0]) : (newExpense.date?.split('T')[0])}
                                       onChange={e => modalType === 'custody' ? setNewCustody({...newCustody, receivedDate: e.target.value}) : setNewExpense({...newExpense, date: e.target.value})}
                                       className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 outline-none"
                                   />
                               </div>
                           </div>

                           <div>
                               <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">التفاصيل / البيان</label>
                               <textarea 
                                   rows={3}
                                   value={modalType === 'custody' ? newCustody.description : newExpense.description}
                                   onChange={e => modalType === 'custody' ? setNewCustody({...newCustody, description: e.target.value}) : setNewExpense({...newExpense, description: e.target.value})}
                                   className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 outline-none"
                                   placeholder="اكتب تفاصيل العملية..."
                               />
                           </div>

                           {modalType === 'custody' ? (
                               <div className="grid grid-cols-2 gap-4">
                                   <div>
                                       <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">نوع العهدة</label>
                                       <select 
                                           value={newCustody.type}
                                           onChange={e => setNewCustody({...newCustody, type: e.target.value})}
                                           className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 outline-none"
                                       >
                                           {DEFAULT_CUSTODY_CLASSIFICATIONS.map(c => <option key={c} value={c}>{c}</option>)}
                                       </select>
                                   </div>
                                   <div>
                                       <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">طريقة الدفع</label>
                                       <select 
                                           value={newCustody.paymentMethod}
                                           onChange={e => setNewCustody({...newCustody, paymentMethod: e.target.value})}
                                           className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 outline-none"
                                       >
                                           {DEFAULT_PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                       </select>
                                   </div>
                               </div>
                           ) : (
                               <div>
                                   <label className="block text-sm font-bold text-slate-600 dark:text-slate-300 mb-1">بند المصروف</label>
                                   <select 
                                       value={newExpense.category}
                                       onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                                       className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 outline-none"
                                   >
                                       {DEFAULT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                   </select>
                               </div>
                           )}

                           <button 
                               onClick={modalType === 'custody' ? handleAddCustody : handleAddExpense}
                               className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-500/20 mt-4"
                           >
                               حفظ البيانات
                           </button>
                       </div>
                   </div>
               </div>
           )}
       </div>
    );
};

export default FinanceManager;
