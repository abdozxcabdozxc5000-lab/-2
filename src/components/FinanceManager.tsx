
import React, { useState, useMemo } from 'react';
import { Employee, CustodyRecord, ExpenseRecord, UserRole } from '../types';
import { upsertCustody, deleteCustody, upsertExpense, deleteExpense } from '../supabaseClient';
import { 
    DollarSign, FileText, TrendingUp, Clock, Briefcase, 
    ArrowRight, Plus, Search, Trash2, CheckCircle, XCircle, 
    Moon, Sun, LogOut, Menu, X, ChevronLeft, ChevronRight
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

interface FinanceManagerProps {
    employees: Employee[];
    custodies: CustodyRecord[];
    expenses: ExpenseRecord[];
    currentUserRole: UserRole;
    currentUserId: string;
    onUpdateData: () => void;
    onExit: () => void;
}

// --- CUSTOM UI COMPONENTS (Inline) ---

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: 'blue' | 'red' | 'green' | 'yellow'; darkMode: boolean }> = ({ title, value, icon, color, darkMode }) => {
  const styles = {
    blue: { bg: 'bg-blue-500', gradient: 'from-blue-500 to-cyan-400', shadow: 'shadow-blue-500/30' },
    red: { bg: 'bg-red-500', gradient: 'from-red-500 to-pink-500', shadow: 'shadow-red-500/30' },
    green: { bg: 'bg-emerald-500', gradient: 'from-emerald-500 to-green-400', shadow: 'shadow-emerald-500/30' },
    yellow: { bg: 'bg-amber-500', gradient: 'from-amber-500 to-yellow-400', shadow: 'shadow-amber-500/30' }
  };

  const style = styles[color];

  return (
    <div className={`relative overflow-hidden rounded-[2rem] p-6 transition-all duration-300 group hover:-translate-y-1 ${darkMode ? 'bg-slate-800/60 border border-white/5' : 'bg-white border border-slate-100 shadow-xl shadow-slate-200/50'}`}>
        <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${style.gradient} opacity-10 rounded-bl-[100%] transition-opacity group-hover:opacity-20`}></div>
        <div className="flex flex-col relative z-10">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white bg-gradient-to-br ${style.gradient} shadow-lg ${style.shadow} mb-4`}>
                {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { size: 24 }) : icon}
            </div>
            <h3 className={`text-sm font-bold mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{title}</h3>
            <p className={`text-3xl font-black ${darkMode ? 'text-white' : 'text-slate-800'}`}>{value}</p>
        </div>
    </div>
  );
};

const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; text: string; badge?: number; isCollapsed: boolean; darkMode: boolean }> = ({ active, onClick, icon, text, badge, isCollapsed, darkMode }) => (
  <button
    onClick={onClick}
    className={`group w-full flex items-center py-4 px-4 rounded-2xl font-bold transition-all duration-300 relative overflow-hidden ${
      active
        ? 'text-white shadow-lg shadow-blue-500/30' 
        : `${darkMode ? 'text-slate-400 hover:bg-white/5 hover:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'}`
    }`}
  >
    {active && (
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl"></div>
    )}
    <div className="relative z-10 flex items-center w-full">
        <span className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>
            {icon}
        </span>
        <span className={`mr-4 transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100 flex-1'}`}>
            {text}
        </span>
        {badge ? (
        <span className={`text-[10px] font-black rounded-full h-5 min-w-[1.25rem] flex items-center justify-center px-1 transition-all ${
            active ? 'bg-white text-blue-600' : 'bg-red-500 text-white'
        } ${isCollapsed ? 'absolute top-2 left-2' : ''}`}>
            {badge}
        </span>
        ) : null}
    </div>
  </button>
);

// --- MAIN COMPONENT ---

const FinanceManager: React.FC<FinanceManagerProps> = ({ 
    employees, custodies, expenses, currentUserRole, currentUserId, onUpdateData, onExit 
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'custodies' | 'expenses'>('dashboard');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [darkMode, setDarkMode] = useState(false); // Local dark mode for this module
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Forms State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'custody' | 'expense' | null>(null);
    const [formData, setFormData] = useState<any>({});

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

    // Stats Calculation
    const stats = useMemo(() => {
        const totalCustody = visibleCustodies.filter(c => c.status === 'confirmed').reduce((sum, c) => sum + c.amount, 0);
        const totalExpenses = visibleExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
        return {
            totalCustody,
            totalExpenses,
            pendingExpenses: visibleExpenses.filter(e => e.status === 'pending').length,
            balance: totalCustody - totalExpenses
        };
    }, [visibleCustodies, visibleExpenses]);

    // --- HANDLERS ---
    const handleOpenModal = (type: 'custody' | 'expense') => {
        setModalType(type);
        setFormData(type === 'custody' ? { empId: '', amount: '', desc: '' } : { amount: '', category: 'عام', desc: '', date: new Date().toISOString().split('T')[0] });
        setIsModalOpen(true);
    };

    const handleSubmit = async () => {
        if (modalType === 'custody') {
            if (!formData.empId || !formData.amount) return;
            const emp = employees.find(e => e.id === formData.empId);
            await upsertCustody({
                id: Date.now().toString(),
                employeeId: formData.empId,
                userName: emp?.name || 'Unknown',
                amount: parseFloat(formData.amount),
                description: formData.desc,
                type: 'cash',
                receivedDate: new Date().toISOString(),
                status: 'confirmed'
            });
        } else {
            if (!formData.amount || !formData.desc) return;
            const emp = employees.find(e => e.id === currentUserId);
            await upsertExpense({
                id: Date.now().toString(),
                employeeId: currentUserId,
                userName: emp?.name || 'Unknown',
                amount: parseFloat(formData.amount),
                category: formData.category,
                description: formData.desc,
                date: formData.date,
                status: 'pending'
            });
        }
        setIsModalOpen(false);
        onUpdateData();
    };

    const handleAction = async (type: 'expense' | 'custody', id: string, status: string) => {
        if (!confirm('هل أنت متأكد من تغيير الحالة؟')) return;
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
        if (!confirm('هل أنت متأكد من الحذف؟ لا يمكن التراجع.')) return;
        if (type === 'expense') await deleteExpense(id);
        else await deleteCustody(id);
        onUpdateData();
    };

    // --- CHART DATA ---
    const pieData = useMemo(() => {
        const data: {[key: string]: number} = {};
        visibleExpenses.filter(e => e.status === 'approved').forEach(e => {
            data[e.category] = (data[e.category] || 0) + e.amount;
        });
        return Object.entries(data).map(([name, value]) => ({ name, value }));
    }, [visibleExpenses]);

    const areaData = useMemo(() => {
        const data: {[key: string]: number} = {};
        // Mocking last 7 days data for visuals if not enough real data
        const today = new Date();
        for(let i=6; i>=0; i--) {
            const d = new Date(today);
            d.setDate(today.getDate() - i);
            const dateStr = d.toISOString().split('T')[0];
            data[dateStr] = 0;
        }
        visibleExpenses.filter(e => e.status === 'approved').forEach(e => {
            if (data[e.date] !== undefined) data[e.date] += e.amount;
        });
        return Object.entries(data).map(([date, amount]) => ({ 
            date: new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }), 
            amount 
        }));
    }, [visibleExpenses]);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    // --- RENDER ---
    return (
        <div className={`fixed inset-0 z-50 flex h-screen font-['Cairo'] text-right transition-colors duration-500 ${darkMode ? 'bg-[#0f172a] text-white' : 'bg-[#f8fafc] text-slate-800'}`} dir="rtl">
            
            {/* BACKGROUND BLOBS */}
            <div className={`fixed inset-0 -z-10 overflow-hidden pointer-events-none`}>
                <div className={`absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-blue-500/20 rounded-full blur-[100px] animate-pulse`}></div>
                <div className={`absolute bottom-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-purple-500/20 rounded-full blur-[100px] animate-pulse animation-delay-2000`}></div>
            </div>

            {/* SIDEBAR */}
            <aside className={`
                fixed inset-y-0 right-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-l border-slate-200 dark:border-slate-800 transition-all duration-300 flex flex-col
                ${isCollapsed ? 'w-24' : 'w-72'}
                ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            `}>
                <div className="h-24 flex items-center justify-between px-6 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
                            <DollarSign size={22} />
                        </div>
                        <h1 className={`text-2xl font-black tracking-tight transition-opacity duration-300 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100'}`}>
                            مصروف
                        </h1>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-slate-500 hover:text-red-500"><X /></button>
                </div>

                <div className="flex-1 px-4 py-6 space-y-3 overflow-y-auto">
                    <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<TrendingUp size={20}/>} text="نظرة عامة" isCollapsed={isCollapsed} darkMode={darkMode} />
                    <NavButton active={activeTab === 'custodies'} onClick={() => setActiveTab('custodies')} icon={<Briefcase size={20}/>} text="سجل العهد" isCollapsed={isCollapsed} darkMode={darkMode} />
                    <NavButton active={activeTab === 'expenses'} onClick={() => setActiveTab('expenses')} icon={<FileText size={20}/>} text="المصروفات" badge={stats.pendingExpenses} isCollapsed={isCollapsed} darkMode={darkMode} />
                </div>

                <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    <button onClick={() => setDarkMode(!darkMode)} className={`w-full p-4 rounded-2xl flex items-center justify-center transition-all ${darkMode ? 'bg-slate-800 text-yellow-400' : 'bg-slate-100 text-slate-600'}`}>
                        {darkMode ? <Sun size={20}/> : <Moon size={20}/>}
                    </button>
                    <button onClick={onExit} className={`w-full p-4 rounded-2xl flex items-center justify-center gap-2 font-bold transition-all ${darkMode ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}>
                        <LogOut size={20} /> 
                        {!isCollapsed && <span>خروج</span>}
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <main className={`flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ${isCollapsed ? 'lg:mr-24' : 'lg:mr-72'}`}>
                
                {/* HEADER */}
                <header className="h-24 px-8 flex items-center justify-between z-30">
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm"><Menu /></button>
                        <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:flex p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-slate-500 hover:text-blue-600">
                            {isCollapsed ? <ChevronLeft /> : <ChevronRight />}
                        </button>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white">
                                {activeTab === 'dashboard' && 'لوحة المعلومات'}
                                {activeTab === 'custodies' && 'إدارة العهد'}
                                {activeTab === 'expenses' && 'سجل المصروفات'}
                            </h2>
                            <p className="text-xs text-slate-500 font-bold mt-1">
                                {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white dark:bg-slate-800 rounded-full shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">متصل الآن</span>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300 border-2 border-white dark:border-slate-600 shadow-md">
                            {employees.find(e => e.id === currentUserId)?.name.charAt(0)}
                        </div>
                    </div>
                </header>

                {/* CONTENT AREA */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-hide">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                <StatCard title="الرصيد الحالي" value={`${stats.balance.toLocaleString()} ج`} icon={<DollarSign/>} color="blue" darkMode={darkMode} />
                                <StatCard title="إجمالي المصروفات" value={`${stats.totalExpenses.toLocaleString()} ج`} icon={<TrendingUp/>} color="red" darkMode={darkMode} />
                                <StatCard title="إجمالي العهد" value={`${stats.totalCustody.toLocaleString()} ج`} icon={<Briefcase/>} color="green" darkMode={darkMode} />
                                <StatCard title="طلبات معلقة" value={stats.pendingExpenses} icon={<Clock/>} color="yellow" darkMode={darkMode} />
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className={`lg:col-span-2 p-6 rounded-[2.5rem] shadow-sm ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-100'}`}>
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><TrendingUp className="text-blue-500"/> النشاط اليومي</h3>
                                    <div className="h-72">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <AreaChart data={areaData}>
                                                <defs>
                                                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                                    </linearGradient>
                                                </defs>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? '#334155' : '#e2e8f0'} />
                                                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12}} />
                                                <YAxis axisLine={false} tickLine={false} tick={{fill: darkMode ? '#94a3b8' : '#64748b', fontSize: 12}} />
                                                <Tooltip contentStyle={{backgroundColor: darkMode ? '#1e293b' : '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}} />
                                                <Area type="monotone" dataKey="amount" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className={`p-6 rounded-[2.5rem] shadow-sm ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-slate-100'}`}>
                                    <h3 className="text-xl font-bold mb-6 flex items-center gap-2"><FileText className="text-purple-500"/> التوزيع</h3>
                                    <div className="h-64 relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                                </Pie>
                                                <Tooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                            <div className="text-center">
                                                <span className="block text-2xl font-black text-slate-800 dark:text-white">{stats.totalExpenses}</span>
                                                <span className="text-xs text-slate-400">إجمالي</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 space-y-2">
                                        {pieData.slice(0, 3).map((entry, i) => (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[i % COLORS.length]}}></div>
                                                    <span className="text-slate-600 dark:text-slate-300">{entry.name}</span>
                                                </div>
                                                <span className="font-bold text-slate-800 dark:text-white">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'custodies' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <div className="relative max-w-md w-full">
                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                                    <input type="text" placeholder="بحث في العهد..." className={`w-full pr-12 pl-4 py-4 rounded-2xl outline-none transition-all ${darkMode ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white text-slate-800 shadow-sm'}`} />
                                </div>
                                {canManageFinance && (
                                    <button onClick={() => handleOpenModal('custody')} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all hover:-translate-y-1">
                                        <Plus size={20} /> عهدة جديدة
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {visibleCustodies.map(custody => (
                                    <div key={custody.id} className={`p-6 rounded-[2rem] border transition-all hover:-translate-y-1 group relative ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm hover:shadow-lg'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
                                            <p className="text-3xl font-black text-slate-800 dark:text-white">{custody.amount.toLocaleString()} <span className="text-sm text-slate-400 font-medium">ج.م</span></p>
                                            <p className="text-sm text-slate-500 mt-2 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl">{custody.description}</p>
                                        </div>
                                        {canManageFinance && (
                                            <button onClick={() => handleDelete('custody', custody.id)} className="absolute top-6 left-6 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100">
                                                <Trash2 size={20} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'expenses' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <div className="relative max-w-md w-full">
                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                                    <input type="text" placeholder="بحث في المصروفات..." className={`w-full pr-12 pl-4 py-4 rounded-2xl outline-none transition-all ${darkMode ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white text-slate-800 shadow-sm'}`} />
                                </div>
                                <button onClick={() => handleOpenModal('expense')} className="flex items-center gap-2 bg-red-500 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-red-500/30 hover:bg-red-600 transition-all hover:-translate-y-1">
                                    <Plus size={20} /> مصروف جديد
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {visibleExpenses.map(expense => (
                                    <div key={expense.id} className={`p-6 rounded-[2rem] border transition-all hover:-translate-y-1 group ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100 shadow-sm hover:shadow-lg'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${expense.category === 'وقود' ? 'bg-amber-500' : expense.category === 'صيانة' ? 'bg-slate-600' : 'bg-red-500'}`}>
                                                    <FileText size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800 dark:text-white">{expense.category}</h4>
                                                    <p className="text-xs text-slate-500">{expense.userName} • {expense.date}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-xl text-xs font-bold ${
                                                expense.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 
                                                expense.status === 'rejected' ? 'bg-red-100 text-red-700' : 
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                                {expense.status === 'approved' ? 'معتمد' : expense.status === 'rejected' ? 'مرفوض' : 'معلق'}
                                            </span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-xl line-clamp-2 h-16">{expense.description}</p>
                                        <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-700 pt-4">
                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{expense.amount} <span className="text-sm text-slate-400">ج.م</span></p>
                                            
                                            <div className="flex gap-2">
                                                {canManageFinance && expense.status === 'pending' && (
                                                    <>
                                                        <button onClick={() => handleAction('expense', expense.id, 'approved')} className="p-2 rounded-xl bg-emerald-50 text-emerald-600 hover:bg-emerald-100"><CheckCircle size={20}/></button>
                                                        <button onClick={() => handleAction('expense', expense.id, 'rejected')} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"><XCircle size={20}/></button>
                                                    </>
                                                )}
                                                {canManageFinance && (
                                                    <button onClick={() => handleDelete('expense', expense.id)} className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50"><Trash2 size={20}/></button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className={`w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-scale-in ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"><X /></button>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                            {modalType === 'custody' ? 'إضافة عهدة جديدة' : 'تسجيل مصروف جديد'}
                        </h3>
                        
                        <div className="space-y-4">
                            {modalType === 'custody' && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">الموظف</label>
                                    <select 
                                        value={formData.empId} 
                                        onChange={e => setFormData({...formData, empId: e.target.value})}
                                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- اختر الموظف --</option>
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">المبلغ (ج.م)</label>
                                <input 
                                    type="number" 
                                    value={formData.amount} 
                                    onChange={e => setFormData({...formData, amount: e.target.value})}
                                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-lg text-center"
                                    placeholder="0.00"
                                />
                            </div>

                            {modalType === 'expense' && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">التصنيف</label>
                                    <select 
                                        value={formData.category} 
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="عام">عام</option>
                                        <option value="وقود">وقود</option>
                                        <option value="صيانة">صيانة</option>
                                        <option value="ضيافة">ضيافة</option>
                                        <option value="خامات">خامات</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-2">الوصف / التفاصيل</label>
                                <textarea 
                                    value={formData.desc} 
                                    onChange={e => setFormData({...formData, desc: e.target.value})}
                                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-blue-500 resize-none h-32"
                                    placeholder="اكتب التفاصيل هنا..."
                                />
                            </div>

                            <button onClick={handleSubmit} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all hover:-translate-y-1">
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
