import React, { useState, useMemo } from 'react';
import { Employee, CustodyRecord, ExpenseRecord, UserRole } from '../types';
import { upsertCustody, deleteCustody, upsertExpense, deleteExpense } from '../supabaseClient';
import { DollarSign, FileText, TrendingUp, Clock, LogOut, ChevronRight, Plus, Search, Trash2, Briefcase } from './finance/Icons';
import StatCard from './finance/StatCard';
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

const FinanceManager: React.FC<FinanceManagerProps> = ({ 
    employees, custodies, expenses, currentUserRole, currentUserId, onUpdateData, onExit 
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'custodies' | 'expenses'>('dashboard');
    const [darkMode, setDarkMode] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Permissions logic
    const canManageFinance = ['general_manager', 'owner', 'accountant'].includes(currentUserRole);

    const visibleCustodies = useMemo(() => 
        canManageFinance ? custodies : custodies.filter(c => c.employeeId === currentUserId)
    , [custodies, canManageFinance, currentUserId]);

    const visibleExpenses = useMemo(() => 
        canManageFinance ? expenses : expenses.filter(e => e.employeeId === currentUserId)
    , [expenses, canManageFinance, currentUserId]);

    const stats = {
        totalCustody: visibleCustodies.reduce((sum, c) => sum + c.amount, 0),
        totalExpenses: visibleExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0),
        pendingExpenses: visibleExpenses.filter(e => e.status === 'pending').length,
        balance: visibleCustodies.reduce((sum, c) => sum + c.amount, 0) - visibleExpenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0)
    };

    const DashboardView = () => {
        const categoryData = useMemo(() => {
            const data: {[key: string]: number} = {};
            visibleExpenses.filter(e => e.status === 'approved').forEach(e => {
                data[e.category] = (data[e.category] || 0) + e.amount;
            });
            return Object.entries(data).map(([name, value]) => ({ name, value }));
        }, [visibleExpenses]);

        const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

        return (
            <div className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="الرصيد المتبقي" value={`${stats.balance.toLocaleString()} ج`} icon={<TrendingUp />} color="green" darkMode={darkMode} />
                    <StatCard title="إجمالي المصروفات" value={`${stats.totalExpenses.toLocaleString()} ج`} icon={<FileText />} color="red" darkMode={darkMode} />
                    <StatCard title="إجمالي العهد" value={`${stats.totalCustody.toLocaleString()} ج`} icon={<DollarSign />} color="blue" darkMode={darkMode} />
                    <StatCard title="معلق" value={stats.pendingExpenses} icon={<Clock />} color="yellow" darkMode={darkMode} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className={`lg:col-span-1 rounded-[2.5rem] p-8 shadow-xl ${darkMode ? 'bg-slate-800/60 border border-white/5' : 'bg-white shadow-slate-200/50 border border-slate-100'}`}>
                        <h3 className="text-xl font-black mb-6">توزيع المصروفات</h3>
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

                    <div className={`lg:col-span-2 rounded-[2.5rem] p-8 shadow-xl ${darkMode ? 'bg-slate-800/60 border border-white/5' : 'bg-white shadow-slate-200/50 border border-slate-100'}`}>
                        <h3 className="text-xl font-black mb-6">آخر العمليات</h3>
                        <div className="space-y-4">
                            {visibleExpenses.slice(0, 5).map(exp => (
                                <div key={exp.id} className={`flex justify-between items-center p-4 rounded-2xl ${darkMode ? 'bg-slate-700/30' : 'bg-slate-50'}`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-500">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold">{exp.description}</p>
                                            <p className="text-xs text-slate-400">{exp.userName} • {exp.category}</p>
                                        </div>
                                    </div>
                                    <span className="font-black text-red-500">-{exp.amount} ج</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const sidebarClasses = darkMode
        ? 'bg-slate-900/90 backdrop-blur-xl border-l border-white/10 text-white'
        : 'bg-white/80 backdrop-blur-2xl border-l border-white/50 text-slate-700 shadow-2xl';

    return (
        <div className={`fixed inset-0 z-50 flex h-screen font-['Cairo'] text-right transition-all duration-500 ${darkMode ? 'bg-[#0f172a]' : 'bg-[#f3f4f6]'}`} dir="rtl">
            
            {/* Sidebar from original files */}
            <aside className={`transition-all duration-300 ease-in-out h-full z-40 ${sidebarClasses} ${isCollapsed ? 'w-24' : 'w-72'} flex flex-col`}>
                <div className="h-24 flex items-center px-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                            <DollarSign size={24} />
                        </div>
                        {!isCollapsed && <h1 className="text-2xl font-black tracking-tight">مصروف</h1>}
                    </div>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-3">
                    {[
                        { id: 'dashboard', label: 'الرئيسية', icon: <TrendingUp size={20} /> },
                        { id: 'custodies', label: 'العهد', icon: <Briefcase size={20} /> },
                        { id: 'expenses', label: 'المصروفات', icon: <FileText size={20} /> }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${
                                activeTab === item.id 
                                ? 'bg-blue-600 text-white shadow-lg' 
                                : 'hover:bg-white/5 text-slate-400 hover:text-white'
                            }`}
                        >
                            {item.icon}
                            {!isCollapsed && <span>{item.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="p-6 border-t border-white/10 space-y-4">
                    <button onClick={() => setDarkMode(!darkMode)} className="w-full p-4 rounded-2xl bg-white/5 flex items-center justify-center">
                        {darkMode ? '☀️ وضع النهار' : '🌙 وضع الليل'}
                    </button>
                    <button onClick={onExit} className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-red-500/10 text-red-500 font-bold">
                        <LogOut size={20} /> {!isCollapsed && 'خروج للنظام'}
                    </button>
                </div>
            </aside>

            <main className="flex-1 flex flex-col overflow-hidden">
                <header className="h-24 px-8 flex items-center justify-between">
                    <h2 className="text-3xl font-black">{activeTab === 'dashboard' ? 'نظرة عامة' : activeTab === 'custodies' ? 'إدارة العهد' : 'سجل المصروفات'}</h2>
                    <div className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-black">
                        {employees.find(e => e.id === currentUserId)?.name.charAt(0)}
                    </div>
                </header>
                
                <div className="flex-1 overflow-y-auto p-8 scrollbar-hide">
                    {activeTab === 'dashboard' && <DashboardView />}
                    {activeTab === 'custodies' && <div className="text-center py-20 text-slate-400">قيد التطوير بنفس نمط الملفات الإنجليزية...</div>}
                    {activeTab === 'expenses' && <div className="text-center py-20 text-slate-400">سجل المصروفات قيد التحميل...</div>}
                </div>
            </main>
        </div>
    );
};

export default FinanceManager;