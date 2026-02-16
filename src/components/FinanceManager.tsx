
import React, { useState, useMemo } from 'react';
import { Employee, CustodyRecord, ExpenseRecord, UserRole } from '../types';
import { upsertCustody, deleteCustody, upsertExpense, deleteExpense } from '../supabaseClient';
import { 
    DollarSign, FileText, TrendingUp, Clock, Calendar, Briefcase, 
    ArrowRight, Plus, Search, Trash2, CheckCircle, XCircle, AlertTriangle,
    Moon, Sun, LogOut
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface FinanceManagerProps {
    employees: Employee[];
    custodies: CustodyRecord[];
    expenses: ExpenseRecord[];
    currentUserRole: UserRole;
    currentUserId: string;
    onUpdateData: () => void;
    onExit: () => void;
}

// --- INLINED SUB-COMPONENTS FROM YOUR FILES ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: 'blue' | 'red' | 'green' | 'yellow'; darkMode: boolean }> = ({ title, value, icon, color, darkMode }) => {
  const darkStyles = {
    blue: { bg: 'bg-blue-600', glow: 'shadow-[0_0_15px_rgba(37,99,235,0.5)]', border: 'border-blue-500/30', text: 'text-blue-200' },
    red: { bg: 'bg-red-600', glow: 'shadow-[0_0_15px_rgba(220,38,38,0.5)]', border: 'border-red-500/30', text: 'text-red-200' },
    green: { bg: 'bg-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]', border: 'border-emerald-500/30', text: 'text-emerald-200' },
    yellow: { bg: 'bg-orange-500', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.5)]', border: 'border-orange-500/30', text: 'text-orange-200' }
  };

  const lightStyles = {
    blue: { iconBg: 'bg-cyan-100 text-cyan-600', border: 'border-cyan-100' },
    red: { iconBg: 'bg-rose-100 text-rose-600', border: 'border-rose-100' },
    green: { iconBg: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100' },
    yellow: { iconBg: 'bg-amber-100 text-amber-600', border: 'border-amber-100' }
  };

  if (darkMode) {
    const style = darkStyles[color];
    return (
        <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 bg-slate-800/40 backdrop-blur-md border border-white/10 group hover:-translate-y-1`}>
          <div className={`absolute inset-0 rounded-2xl border ${style.border} group-hover:border-opacity-100 transition-colors pointer-events-none`}></div>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${style.bg} ${style.glow}`}></div>
          <div className="flex flex-col items-center text-center">
            <div className={`mb-4 p-4 rounded-2xl text-white ${style.bg} ${style.glow} bg-opacity-90`}>
              {icon}
            </div>
            <h3 className="text-gray-300 text-base font-bold mb-2">{title}</h3>
            <p className="text-3xl font-black text-white tracking-tight drop-shadow-md">{value}</p>
          </div>
        </div>
    );
  } else {
    const style = lightStyles[color];
    return (
        <div className={`relative p-6 rounded-3xl bg-white transition-transform duration-300 hover:-translate-y-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] border-2 border-white ring-1 ring-slate-100/50`}>
             <div className="flex flex-col items-center text-center">
                <div className={`mb-4 p-5 rounded-2xl ${style.iconBg} shadow-sm`}>
                    {icon}
                </div>
                <h3 className="text-slate-500 text-sm font-bold mb-1 tracking-wide uppercase">{title}</h3>
                <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
             </div>
        </div>
    )
  }
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; text: string; badge?: number; isCollapsed: boolean }> = ({ active, onClick, icon, text, badge, isCollapsed }) => (
  <button
    onClick={onClick}
    className={`group w-full flex items-center py-3 rounded-xl font-bold transition-all duration-200 relative ${
      isCollapsed ? 'justify-center px-2' : 'px-4 gap-4 text-right'
    } ${
      active
        ? 'bg-blue-600 text-white shadow-lg -translate-y-0.5' 
        : 'hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-slate-300'
    }`}
  >
    {icon}
    <span className={`transition-all duration-200 ${isCollapsed ? 'w-0 opacity-0' : 'flex-1 opacity-100 whitespace-nowrap'}`}>{text}</span>
    {badge ? (
      <span className={`text-xs font-bold rounded-full flex items-center justify-center transition-all duration-200 ${
        isCollapsed ? 'w-0 h-0 opacity-0' : 'w-5 h-5 opacity-100'
      } ${
        active ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
      }`}>
        {badge}
      </span>
    ) : null}
  </button>
);

// --- MAIN COMPONENT ---

const FinanceManager: React.FC<FinanceManagerProps> = ({ 
    employees, custodies, expenses, currentUserRole, currentUserId, onUpdateData, onExit 
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'custodies' | 'expenses'>('dashboard');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [darkMode, setDarkMode] = useState(false); 
    
    // Forms State
    const [newCustody, setNewCustody] = useState({ empId: '', amount: '', desc: '' });
    const [newExpense, setNewExpense] = useState({ amount: '', category: 'عام', desc: '', date: new Date().toISOString().split('T')[0] });

    // Permissions
    const canManageFinance = ['general_manager', 'owner', 'accountant', 'manager', 'office_manager'].includes(currentUserRole);

    // Filter Logic
    const visibleCustodies = useMemo(() => {
        if (!canManageFinance) return custodies.filter(c => c.employeeId === currentUserId);
        return custodies;
    }, [custodies, canManageFinance, currentUserId]);

    const visibleExpenses = useMemo(() => {
        if (!canManageFinance) return expenses.filter(e => e.employeeId === currentUserId);
        return expenses;
    }, [expenses, canManageFinance, currentUserId]);

    // Stats
    const stats = {
        totalCustody: visibleCustodies.filter(c => c.status === 'confirmed').reduce((sum, c) => sum + c.amount, 0),
        totalExpenses: visibleExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
        pendingExpenses: visibleExpenses.filter(e => e.status === 'pending').length,
        balance: visibleCustodies.filter(c => c.status === 'confirmed').reduce((sum, c) => sum + c.amount, 0) - visibleExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0)
    };

    // --- HANDLERS ---
    const handleAddCustody = async () => {
        if (!newCustody.empId || !newCustody.amount) return;
        const emp = employees.find(e => e.id === newCustody.empId);
        await upsertCustody({
            id: Date.now().toString(),
            employeeId: newCustody.empId,
            userName: emp?.name || 'Unknown',
            amount: parseFloat(newCustody.amount),
            description: newCustody.desc,
            type: 'cash',
            receivedDate: new Date().toISOString(),
            status: 'confirmed' // Assuming direct confirmation for simplicity or change to 'pending'
        });
        setNewCustody({ empId: '', amount: '', desc: '' });
        onUpdateData();
    };

    const handleAddExpense = async () => {
        if (!newExpense.amount || !newExpense.desc) return;
        const emp = employees.find(e => e.id === currentUserId);
        await upsertExpense({
            id: Date.now().toString(),
            employeeId: currentUserId,
            userName: emp?.name || 'Unknown',
            amount: parseFloat(newExpense.amount),
            category: newExpense.category,
            description: newExpense.desc,
            date: newExpense.date,
            status: 'pending'
        });
        setNewExpense({ amount: '', category: 'عام', desc: '', date: new Date().toISOString().split('T')[0] });
        onUpdateData();
    };

    const handleAction = async (type: 'expense' | 'custody', id: string, status: string) => {
        if (type === 'expense') {
            const exp = expenses.find(e => e.id === id);
            if (exp) await upsertExpense({ ...exp, status: status as any });
        } else {
            const cust = custodies.find(c => c.id === id);
            if (cust) await upsertCustody({ ...cust, status: status as any });
        }
        onUpdateData();
    };

    const handleDelete = async (type: 'expense' | 'custody', id: string) => {
        if (!confirm('هل أنت متأكد من الحذف؟')) return;
        if (type === 'expense') await deleteExpense(id);
        else await deleteCustody(id);
        onUpdateData();
    };

    // --- VIEW COMPONENTS ---

    const DashboardView = () => {
        const categoryData = useMemo(() => {
            const data: {[key: string]: number} = {};
            visibleExpenses.filter(e => e.status === 'approved').forEach(e => {
                data[e.category] = (data[e.category] || 0) + e.amount;
            });
            return Object.entries(data).map(([name, value]) => ({ name, value }));
        }, [visibleExpenses]);
        const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

        return (
            <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <StatCard title="مصروفات معلقة" value={stats.pendingExpenses} icon={<Clock size={28}/>} color="yellow" darkMode={darkMode} />
                    <StatCard title="الرصيد المتبقي" value={`${stats.balance.toLocaleString()} ج`} icon={<TrendingUp size={28}/>} color="green" darkMode={darkMode} />
                    <StatCard title="إجمالي المصروفات" value={`${stats.totalExpenses.toLocaleString()} ج`} icon={<FileText size={28}/>} color="red" darkMode={darkMode} />
                    <StatCard title="إجمالي العهد" value={`${stats.totalCustody.toLocaleString()} ج`} icon={<DollarSign size={28}/>} color="blue" darkMode={darkMode} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className={`lg:col-span-1 rounded-2xl p-6 shadow-lg ${darkMode ? 'bg-slate-800/40 border border-white/5' : 'bg-white border border-slate-100'}`}>
                        <h3 className="text-lg font-bold mb-4">توزيع المصروفات</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                        {categoryData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className={`lg:col-span-2 rounded-2xl p-6 shadow-lg ${darkMode ? 'bg-slate-800/40 border border-white/5' : 'bg-white border border-slate-100'}`}>
                        <h3 className="text-lg font-bold mb-4">آخر العمليات</h3>
                        <div className="space-y-3">
                            {visibleExpenses.slice(0, 5).map(expense => (
                                <div key={expense.id} className={`flex justify-between items-center p-4 rounded-xl border ${darkMode ? 'bg-slate-700/30 border-white/5' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${darkMode ? 'bg-slate-800' : 'bg-white'} shadow-sm`}>
                                            <FileText size={18} className="text-blue-500" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{expense.description}</p>
                                            <p className="text-xs text-gray-500">{expense.category} • {expense.userName}</p>
                                        </div>
                                    </div>
                                    <span className="font-bold text-red-500">-{expense.amount} ج</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const CustodyView = () => (
        <div className="space-y-6 animate-fade-in">
            {canManageFinance && (
                <div className={`p-6 rounded-2xl shadow-sm ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus size={18}/> إضافة عهدة جديدة</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <select className="p-3 rounded-xl border bg-gray-50 dark:bg-slate-700 dark:border-slate-600" value={newCustody.empId} onChange={e => setNewCustody({...newCustody, empId: e.target.value})}>
                            <option value="">اختر الموظف</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                        <input type="number" placeholder="المبلغ" className="p-3 rounded-xl border bg-gray-50 dark:bg-slate-700 dark:border-slate-600" value={newCustody.amount} onChange={e => setNewCustody({...newCustody, amount: e.target.value})} />
                        <input type="text" placeholder="الوصف" className="p-3 rounded-xl border bg-gray-50 dark:bg-slate-700 dark:border-slate-600" value={newCustody.desc} onChange={e => setNewCustody({...newCustody, desc: e.target.value})} />
                        <button onClick={handleAddCustody} className="bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">حفظ</button>
                    </div>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleCustodies.map(custody => (
                    <div key={custody.id} className={`p-5 rounded-2xl border shadow-sm ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="font-bold text-sm">{custody.userName}</h4>
                                <p className="text-xs text-gray-500">{new Date(custody.receivedDate).toLocaleDateString('ar-EG')}</p>
                            </div>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${custody.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100'}`}>{custody.status}</span>
                        </div>
                        <p className="text-2xl font-black mb-2">{custody.amount.toLocaleString()} ج</p>
                        <p className="text-xs text-gray-500">{custody.description}</p>
                        {canManageFinance && <button onClick={() => handleDelete('custody', custody.id)} className="mt-4 text-red-500 text-xs flex items-center gap-1"><Trash2 size={12}/> حذف</button>}
                    </div>
                ))}
            </div>
        </div>
    );

    const ExpenseView = () => (
        <div className="space-y-6 animate-fade-in">
            <div className={`p-6 rounded-2xl shadow-sm ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Plus size={18}/> تسجيل مصروف</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <input type="number" placeholder="المبلغ" className="p-3 rounded-xl border bg-gray-50 dark:bg-slate-700 dark:border-slate-600" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                    <select className="p-3 rounded-xl border bg-gray-50 dark:bg-slate-700 dark:border-slate-600" value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                        <option value="عام">عام</option>
                        <option value="وقود">وقود</option>
                        <option value="ضيافة">ضيافة</option>
                        <option value="صيانة">صيانة</option>
                    </select>
                    <input type="text" placeholder="الوصف" className="p-3 rounded-xl border bg-gray-50 dark:bg-slate-700 dark:border-slate-600" value={newExpense.desc} onChange={e => setNewExpense({...newExpense, desc: e.target.value})} />
                    <input type="date" className="p-3 rounded-xl border bg-gray-50 dark:bg-slate-700 dark:border-slate-600" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                    <button onClick={handleAddExpense} className="bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">تسجيل</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleExpenses.map(expense => (
                    <div key={expense.id} className={`p-5 rounded-2xl border shadow-sm ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-100'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold">{expense.category}</h4>
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${expense.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : expense.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{expense.status}</span>
                        </div>
                        <p className="text-xs text-gray-500 mb-2">{expense.userName} • {expense.date}</p>
                        <p className="text-xl font-black text-red-500">{expense.amount} ج</p>
                        <p className="text-sm text-gray-600 mt-2">{expense.description}</p>
                        {canManageFinance && expense.status === 'pending' && (
                            <div className="flex gap-2 mt-4">
                                <button onClick={() => handleAction('expense', expense.id, 'approved')} className="flex-1 bg-emerald-100 text-emerald-700 py-2 rounded-lg text-xs font-bold">قبول</button>
                                <button onClick={() => handleAction('expense', expense.id, 'rejected')} className="flex-1 bg-red-100 text-red-700 py-2 rounded-lg text-xs font-bold">رفض</button>
                            </div>
                        )}
                        {canManageFinance && (
                             <button onClick={() => handleDelete('expense', expense.id)} className="mt-2 text-slate-400 hover:text-red-500 text-xs flex items-center gap-1"><Trash2 size={12}/> حذف</button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    // --- MAIN RENDER ---
    const sidebarClasses = darkMode
    ? 'bg-slate-900/90 backdrop-blur-xl border-l border-white/10 text-white'
    : 'bg-white/80 backdrop-blur-2xl border-l border-white/50 text-slate-700';

    return (
        <div className={`fixed inset-0 z-50 flex h-screen font-['Cairo'] text-right transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-white' : 'bg-[#f3f4f6] text-gray-800'}`} dir="rtl">
            
            {/* Background Gradient */}
            <div className={`fixed inset-0 -z-10 overflow-hidden`}>
                {!darkMode && (
                    <>
                        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-cyan-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
                        <div className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-pink-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
                        <div className="absolute -bottom-8 left-20 w-[50vw] h-[50vw] bg-yellow-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
                    </>
                )}
            </div>

            {/* Sidebar */}
            <aside className={`transition-all duration-300 ease-in-out h-full z-40 ${sidebarClasses} ${isCollapsed ? 'w-24' : 'w-72'} flex flex-col`}>
                <div className="flex items-center p-6 h-24 border-b border-gray-100 dark:border-white/10 justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-white shadow-lg shrink-0">
                            <DollarSign size={24} />
                        </div>
                        <h1 className={`text-xl font-extrabold whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                            الإدارة المالية
                        </h1>
                    </div>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
                    <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<TrendingUp />} text="لوحة التحكم" isCollapsed={isCollapsed} />
                    <NavButton active={activeTab === 'custodies'} onClick={() => setActiveTab('custodies')} icon={<Briefcase />} text="سجل العهد" isCollapsed={isCollapsed} />
                    <NavButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<FileText />} text="المصروفات" badge={stats.pendingExpenses} isCollapsed={isCollapsed} />
                </nav>

                <div className="p-6 border-t border-gray-100 dark:border-white/10 space-y-4">
                    <button onClick={() => setDarkMode(!darkMode)} className={`w-full p-3 rounded-xl border flex items-center justify-center transition-all ${darkMode ? 'bg-white/5 border-white/10' : 'bg-slate-100 border-slate-200'}`}>
                        {darkMode ? <Sun className="text-yellow-400"/> : <Moon className="text-blue-500"/>}
                    </button>
                    <button onClick={onExit} className={`w-full p-3 rounded-xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 font-bold flex items-center justify-center gap-2 transition-all`}>
                        <ArrowRight size={18} /> {!isCollapsed && 'خروج للنظام'}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-hidden flex flex-col h-full relative">
                <header className={`h-20 flex items-center justify-between px-8 backdrop-blur-md z-30 ${darkMode ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                        {activeTab === 'dashboard' && 'نظرة عامة'}
                        {activeTab === 'custodies' && 'إدارة العهد'}
                        {activeTab === 'expenses' && 'المصروفات اليومية'}
                    </h2>
                    
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                            {employees.find(e => e.id === currentUserId)?.name.charAt(0)}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-8 scrollbar-thin">
                    {activeTab === 'dashboard' && <DashboardView />}
                    {activeTab === 'custodies' && <CustodyView />}
                    {activeTab === 'expenses' && <ExpenseView />}
                </div>
            </main>
        </div>
    );
};

export default FinanceManager;
