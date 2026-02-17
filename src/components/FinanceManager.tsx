
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, CustodyRecord, ExpenseRecord, UserRole } from '../types';
import { upsertCustody, deleteCustody, upsertExpense, deleteExpense } from '../supabaseClient';
import { 
    DollarSign, FileText, TrendingUp, Clock, Briefcase, 
    ArrowRight, Plus, Search, Trash2, CheckCircle, XCircle, 
    Moon, Sun, LogOut, Menu, X, ChevronLeft, ChevronRight, Settings, Tag, Wallet, CreditCard, User, AlertTriangle
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
    onNotify: (message: string, type: 'info' | 'success' | 'error') => void;
}

// --- DEFAULTS ---
const DEFAULT_CATEGORIES = ['عام', 'وقود', 'صيانة', 'ضيافة', 'خامات', 'نثرية', 'كهرباء', 'إيجار'];
const DEFAULT_CUSTODY_CLASSIFICATIONS = ['عهدة مصنع', 'عهدة مكتب', 'عهدة سيارة', 'عهدة مشروع'];
const DEFAULT_PAYMENT_METHODS = ['كاش (نقدية)', 'تحويل بنكي', 'شيك', 'فودافون كاش'];
const DEFAULT_SOURCES = ['بلال', 'ماجد', 'خزينة المكتب', 'حساب الشركة - بنك مصر', 'حساب الشركة - CIB'];

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
    employees, custodies, expenses, currentUserRole, currentUserId, onUpdateData, onExit, onNotify
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'custodies' | 'expenses' | 'settings'>('dashboard');
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [darkMode, setDarkMode] = useState(false); 
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // --- Dynamic Lists State ---
    const [expenseCategories, setExpenseCategories] = useState<string[]>(() => {
        const saved = localStorage.getItem('mowazeb_expense_categories');
        return saved ? JSON.parse(saved) : DEFAULT_CATEGORIES;
    });

    const [custodyClassifications, setCustodyClassifications] = useState<string[]>(() => {
        const saved = localStorage.getItem('mowazeb_custody_classifications');
        return saved ? JSON.parse(saved) : DEFAULT_CUSTODY_CLASSIFICATIONS;
    });

    const [paymentMethods, setPaymentMethods] = useState<string[]>(() => {
        const saved = localStorage.getItem('mowazeb_payment_methods');
        return saved ? JSON.parse(saved) : DEFAULT_PAYMENT_METHODS;
    });

    const [fundingSources, setFundingSources] = useState<string[]>(() => {
        const saved = localStorage.getItem('mowazeb_funding_sources');
        return saved ? JSON.parse(saved) : DEFAULT_SOURCES;
    });

    const [newItemInput, setNewItemInput] = useState('');
    
    // Forms State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCustodySettingsOpen, setIsCustodySettingsOpen] = useState(false);
    const [modalType, setModalType] = useState<'custody' | 'expense' | null>(null);
    const [formData, setFormData] = useState<any>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Confirm Modal State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isDestructive?: boolean;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

    // Persistence Effects
    useEffect(() => { localStorage.setItem('mowazeb_expense_categories', JSON.stringify(expenseCategories)); }, [expenseCategories]);
    useEffect(() => { localStorage.setItem('mowazeb_custody_classifications', JSON.stringify(custodyClassifications)); }, [custodyClassifications]);
    useEffect(() => { localStorage.setItem('mowazeb_payment_methods', JSON.stringify(paymentMethods)); }, [paymentMethods]);
    useEffect(() => { localStorage.setItem('mowazeb_funding_sources', JSON.stringify(fundingSources)); }, [fundingSources]);

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
        const defaultCategory = expenseCategories.length > 0 ? expenseCategories[0] : 'عام';
        const defaultClass = custodyClassifications.length > 0 ? custodyClassifications[0] : 'عهدة مكتب';
        const defaultMethod = paymentMethods.length > 0 ? paymentMethods[0] : 'كاش';
        const defaultSource = fundingSources.length > 0 ? fundingSources[0] : 'الخزينة';
        
        // Get simple date string YYYY-MM-DD
        const todayStr = new Date().toLocaleDateString('en-CA'); // 'en-CA' outputs YYYY-MM-DD

        setFormData(type === 'custody' 
            ? { 
                empId: '', 
                amount: '', 
                desc: '', 
                classification: defaultClass,
                paymentMethod: defaultMethod,
                source: defaultSource,
                receivedDate: todayStr
              } 
            : { amount: '', category: defaultCategory, desc: '', date: todayStr }
        );
        setIsModalOpen(true);
    };

    const showConfirm = (title: string, message: string, onConfirm: () => void, isDestructive = false) => {
        setConfirmModal({
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                setConfirmModal(prev => ({ ...prev, isOpen: false }));
            },
            isDestructive
        });
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        if (modalType === 'custody') {
            if (!formData.empId) {
                onNotify("يرجى اختيار الموظف المستلم", "error");
                setIsSubmitting(false);
                return;
            }
            if (!formData.amount || parseFloat(formData.amount) <= 0) {
                onNotify("يرجى إدخال مبلغ صحيح", "error");
                setIsSubmitting(false);
                return;
            }

            const emp = employees.find(e => e.id === formData.empId);
            const record: CustodyRecord = {
                id: Date.now().toString(),
                employeeId: formData.empId,
                userName: emp?.name || 'Unknown',
                amount: parseFloat(formData.amount),
                description: formData.desc || '',
                type: formData.classification,
                category: formData.classification, 
                paymentMethod: formData.paymentMethod,
                source: formData.source,
                // Save as direct string YYYY-MM-DD
                receivedDate: formData.receivedDate || new Date().toLocaleDateString('en-CA'),
                status: 'confirmed'
            };

            const { error } = await upsertCustody(record);
            if (error) {
                onNotify(`خطأ في الحفظ: ${error.message}`, "error");
                setIsSubmitting(false);
                return;
            } else {
                onNotify("تم إضافة العهدة بنجاح", "success");
            }

        } else {
            if (!formData.amount || parseFloat(formData.amount) <= 0) {
                onNotify("يرجى إدخال مبلغ المصروف", "error");
                setIsSubmitting(false);
                return;
            }
            if (!formData.desc) {
                onNotify("يرجى كتابة وصف للمصروف", "error");
                setIsSubmitting(false);
                return;
            }

            const emp = employees.find(e => e.id === currentUserId);
            const record: ExpenseRecord = {
                id: Date.now().toString(),
                employeeId: currentUserId,
                userName: emp?.name || 'Unknown',
                amount: parseFloat(formData.amount),
                category: formData.category,
                description: formData.desc,
                // Save as direct string YYYY-MM-DD
                date: formData.date || new Date().toLocaleDateString('en-CA'),
                status: 'pending'
            };

            const { error } = await upsertExpense(record);
            if (error) {
                onNotify(`خطأ في حفظ المصروف: ${error.message}`, "error");
                setIsSubmitting(false);
                return;
            } else {
                onNotify("تم إضافة المصروف بنجاح", "success");
            }
        }
        
        setIsSubmitting(false);
        setIsModalOpen(false);
        onUpdateData();
    };

    const handleAction = (type: 'expense' | 'custody', id: string, status: string) => {
        showConfirm(
            "تغيير الحالة",
            "هل أنت متأكد من تغيير حالة السجل؟",
            async () => {
                if (type === 'expense') {
                    const exp = expenses.find(e => e.id === id);
                    if (exp) await upsertExpense({ ...exp, status: status as any });
                } else {
                    const cust = custodies.find(c => c.id === id);
                    if (cust) await upsertCustody({ ...cust, status: status as any });
                }
                onNotify("تم تحديث الحالة بنجاح", "success");
                onUpdateData();
            }
        );
    };

    const handleDelete = (type: 'expense' | 'custody', id: string) => {
        showConfirm(
            "تأكيد الحذف",
            "هل أنت متأكد من الحذف نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.",
            async () => {
                if (type === 'expense') await deleteExpense(id);
                else await deleteCustody(id);
                onNotify("تم الحذف بنجاح", "success");
                onUpdateData();
            },
            true
        );
    };

    const addItemToList = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
        if (item && !list.includes(item)) {
            setList([...list, item]);
            onNotify(`تم إضافة "${item}" للقائمة`, "success");
        }
    };

    const removeItemFromList = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
        showConfirm("حذف تصنيف", `هل تريد حذف "${item}" من القائمة؟`, () => {
            setList(list.filter(i => i !== item));
            onNotify("تم الحذف بنجاح", "success");
        }, true);
    };

    const addCategory = () => {
        if (newItemInput) {
            addItemToList(expenseCategories, setExpenseCategories, newItemInput);
            setNewItemInput('');
        }
    };

    const removeCategory = (item: string) => {
        removeItemFromList(expenseCategories, setExpenseCategories, item);
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

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

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
                    {canManageFinance && (
                        <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20}/>} text="إعدادات التصنيفات" isCollapsed={isCollapsed} darkMode={darkMode} />
                    )}
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
                                {activeTab === 'settings' && 'إعدادات النظام'}
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
                            {/* Charts */}
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
                            <div className="flex justify-between items-center gap-4 flex-wrap">
                                <div className="relative max-w-md w-full">
                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20}/>
                                    <input type="text" placeholder="بحث في العهد..." className={`w-full pr-12 pl-4 py-4 rounded-2xl outline-none transition-all ${darkMode ? 'bg-slate-800 text-white placeholder-slate-500' : 'bg-white text-slate-800 shadow-sm'}`} />
                                </div>
                                {canManageFinance && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setIsCustodySettingsOpen(true)}
                                            className="flex items-center gap-2 bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 px-4 py-4 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                                            title="تصنيفات العهد"
                                        >
                                            <Settings size={20} /> تصنيفات العهد
                                        </button>
                                        <button onClick={() => handleOpenModal('custody')} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all hover:-translate-y-1">
                                            <Plus size={20} /> عهدة جديدة
                                        </button>
                                    </div>
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
                                                    <p className="text-xs text-slate-500">{custody.receivedDate}</p>
                                                </div>
                                            </div>
                                            <span className={`px-3 py-1 rounded-xl text-xs font-bold ${custody.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {custody.status === 'confirmed' ? 'نشط' : 'معلق'}
                                            </span>
                                        </div>
                                        <div className="mb-4">
                                            <p className="text-3xl font-black text-slate-800 dark:text-white">{custody.amount.toLocaleString()} <span className="text-sm text-slate-400 font-medium">ج.م</span></p>
                                            <div className="flex flex-wrap gap-2 mt-2">
                                                <span className="text-[10px] px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg font-bold">{custody.type}</span>
                                                {custody.paymentMethod && <span className="text-[10px] px-2 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-lg font-bold">{custody.paymentMethod}</span>}
                                                {custody.source && <span className="text-[10px] px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg font-bold">{custody.source}</span>}
                                                <p className="text-sm text-slate-500 bg-slate-50 dark:bg-slate-700/50 px-2 py-1 rounded-lg flex-1 truncate">{custody.description}</p>
                                            </div>
                                        </div>
                                        {canManageFinance && (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleDelete('custody', custody.id); }} 
                                                className="absolute top-5 left-5 p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-all border border-slate-100 dark:border-slate-600 hover:border-red-200 dark:hover:border-red-800 shadow-sm"
                                                title="حذف العهدة"
                                            >
                                                <Trash2 size={18} />
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

                    {activeTab === 'settings' && (
                        <div className="space-y-8 animate-fade-in">
                            {/* Original Settings Content: Expense Categories */}
                            <div className={`p-8 rounded-[2.5rem] shadow-sm border ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'}`}>
                                <h3 className="font-bold text-xl text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                    <Tag className="text-blue-500" /> تصنيفات المصروفات
                                </h3>
                                
                                <div className="flex gap-2 mb-6">
                                    <input 
                                        type="text" 
                                        placeholder="إضافة تصنيف جديد..." 
                                        value={newItemInput}
                                        onChange={e => setNewItemInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && addCategory()}
                                        className={`flex-1 p-4 rounded-xl outline-none border ${darkMode ? 'bg-slate-900 border-slate-600 text-white' : 'bg-slate-50 border-slate-200'}`}
                                    />
                                    <button onClick={addCategory} className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-xl shadow-lg transition-all">
                                        <Plus />
                                    </button>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    {expenseCategories.map(cat => (
                                        <div key={cat} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm border ${darkMode ? 'bg-slate-900 border-slate-600 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>
                                            {cat}
                                            <button onClick={() => removeCategory(cat)} className="hover:text-red-500 transition-colors"><X size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* --- CONFIRMATION MODAL --- */}
            {confirmModal.isOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className={`w-full max-w-sm p-6 rounded-[2rem] shadow-2xl relative animate-scale-in text-center ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100'} border-2`}>
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmModal.isDestructive ? 'bg-red-100 text-red-500' : 'bg-blue-100 text-blue-500'}`}>
                            <AlertTriangle size={32} />
                        </div>
                        <h3 className={`text-xl font-black mb-2 ${darkMode ? 'text-white' : 'text-slate-800'}`}>{confirmModal.title}</h3>
                        <p className={`text-sm mb-6 ${darkMode ? 'text-slate-400' : 'text-slate-500'}`}>{confirmModal.message}</p>
                        
                        <div className="flex gap-3">
                            <button 
                                onClick={confirmModal.onConfirm} 
                                className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 ${confirmModal.isDestructive ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'}`}
                            >
                                نعم، تأكيد
                            </button>
                            <button 
                                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                                className={`flex-1 py-3 rounded-xl font-bold transition-all ${darkMode ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                إلغاء
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- CUSTODY SETTINGS MODAL (New) --- */}
            {isCustodySettingsOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className={`w-full max-w-2xl rounded-[2.5rem] p-8 shadow-2xl relative animate-scale-in overflow-y-auto max-h-[90vh] ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <button onClick={() => setIsCustodySettingsOpen(false)} className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"><X /></button>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-8 flex items-center gap-2">
                            <Settings className="text-blue-500" /> إعدادات تصنيفات العهد
                        </h3>

                        <div className="space-y-8">
                            {/* Classifications */}
                            <div>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"><Briefcase size={18}/> أنواع العهد</h4>
                                <div className="flex gap-2 mb-3">
                                    <input type="text" id="newClass" placeholder="مثال: عهدة مصنع" className="flex-1 p-3 rounded-xl border outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                                    <button onClick={() => {
                                        const val = (document.getElementById('newClass') as HTMLInputElement).value;
                                        if(val) { addItemToList(custodyClassifications, setCustodyClassifications, val); (document.getElementById('newClass') as HTMLInputElement).value = ''; }
                                    }} className="bg-blue-600 text-white p-3 rounded-xl"><Plus/></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {custodyClassifications.map(c => (
                                        <span key={c} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            {c} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItemFromList(custodyClassifications, setCustodyClassifications, c)} />
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Payment Methods */}
                            <div>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"><CreditCard size={18}/> طرق الاستلام</h4>
                                <div className="flex gap-2 mb-3">
                                    <input type="text" id="newMethod" placeholder="مثال: تحويل بنكي" className="flex-1 p-3 rounded-xl border outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                                    <button onClick={() => {
                                        const val = (document.getElementById('newMethod') as HTMLInputElement).value;
                                        if(val) { addItemToList(paymentMethods, setPaymentMethods, val); (document.getElementById('newMethod') as HTMLInputElement).value = ''; }
                                    }} className="bg-emerald-600 text-white p-3 rounded-xl"><Plus/></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {paymentMethods.map(c => (
                                        <span key={c} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            {c} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItemFromList(paymentMethods, setPaymentMethods, c)} />
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Funding Sources */}
                            <div>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2"><Wallet size={18}/> المصدر (الجهة الممولة)</h4>
                                <div className="flex gap-2 mb-3">
                                    <input type="text" id="newSource" placeholder="مثال: خزينة الشركة" className="flex-1 p-3 rounded-xl border outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white" />
                                    <button onClick={() => {
                                        const val = (document.getElementById('newSource') as HTMLInputElement).value;
                                        if(val) { addItemToList(fundingSources, setFundingSources, val); (document.getElementById('newSource') as HTMLInputElement).value = ''; }
                                    }} className="bg-purple-600 text-white p-3 rounded-xl"><Plus/></button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {fundingSources.map(c => (
                                        <span key={c} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 text-slate-600 dark:text-slate-300">
                                            {c} <X size={12} className="cursor-pointer hover:text-red-500" onClick={() => removeItemFromList(fundingSources, setFundingSources, c)} />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN ADD/EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className={`w-full max-w-lg rounded-[2.5rem] p-8 shadow-2xl relative animate-scale-in ${darkMode ? 'bg-slate-800' : 'bg-white'}`}>
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 left-6 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"><X /></button>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-6">
                            {modalType === 'custody' ? 'إضافة عهدة جديدة' : 'تسجيل مصروف جديد'}
                        </h3>
                        
                        <div className="space-y-4">
                            {modalType === 'custody' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-500 mb-2">الموظف المستلم</label>
                                        <div className="relative">
                                            <select 
                                                value={formData.empId} 
                                                onChange={e => setFormData({...formData, empId: e.target.value})}
                                                className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                            >
                                                <option value="">-- اختر الموظف --</option>
                                                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                            </select>
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                        </div>
                                    </div>
                                    
                                    {/* Dynamic Custody Classification */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-500 mb-2">تصنيف العهدة</label>
                                        <select 
                                            value={formData.classification} 
                                            onChange={e => setFormData({...formData, classification: e.target.value})}
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {custodyClassifications.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    {/* Dynamic Payment Method */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-500 mb-2">طريقة الاستلام</label>
                                        <select 
                                            value={formData.paymentMethod} 
                                            onChange={e => setFormData({...formData, paymentMethod: e.target.value})}
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {paymentMethods.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    {/* Dynamic Funding Source */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-500 mb-2">المصدر (وارد من)</label>
                                        <select 
                                            value={formData.source} 
                                            onChange={e => setFormData({...formData, source: e.target.value})}
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {fundingSources.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                </>
                            )}
                            
                            <div className="grid grid-cols-2 gap-4">
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
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">التاريخ</label>
                                    <input 
                                        type="date" 
                                        value={modalType === 'custody' ? formData.receivedDate : formData.date} 
                                        onChange={e => modalType === 'custody' ? setFormData({...formData, receivedDate: e.target.value}) : setFormData({...formData, date: e.target.value})}
                                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-blue-500 font-bold text-center"
                                    />
                                </div>
                            </div>

                            {modalType === 'expense' && (
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">التصنيف</label>
                                    <select 
                                        value={formData.category} 
                                        onChange={e => setFormData({...formData, category: e.target.value})}
                                        className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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

                            <button onClick={handleSubmit} disabled={isSubmitting} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all hover:-translate-y-1 disabled:opacity-50 disabled:hover:translate-y-0">
                                {isSubmitting ? 'جاري الحفظ...' : 'حفظ البيانات'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default FinanceManager;
