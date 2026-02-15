
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, AttendanceRecord, PayrollRecord, Loan, AppConfig, EmploymentType } from '../types';
import { calculateDailyStats, minutesToTime } from '../utils';
import { upsertPayroll, upsertLoan, upsertSingleEmployee, deleteLoan, deletePayrollArchive } from '../supabaseClient';
import { DEFAULT_PENALTY_VALUE } from '../constants';
import * as XLSX from 'xlsx';
import { 
    Banknote, Users, Calculator, Wallet, Save, Printer, 
    TrendingUp, Calendar, AlertCircle, CheckCircle, ArrowLeft, Search, Building, Factory, DollarSign, Crown, Trash2,
    FileText, Download, X, Share2, CreditCard, ChevronLeft, ChevronRight, MoreHorizontal, Filter, Plus, Eye
} from 'lucide-react';

interface PayrollManagerProps {
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    loans: Loan[];
    payrolls: PayrollRecord[];
    config: AppConfig;
    onUpdateData: () => void;
    onExit: () => void;
}

const ITEMS_PER_PAGE = 20; // عدد العناصر في الصفحة الواحدة

const PayrollManager: React.FC<PayrollManagerProps> = ({ 
    employees, attendanceRecords, loans, payrolls, config, onUpdateData, onExit 
}) => {
    const [activeTab, setActiveTab] = useState<'setup' | 'loans' | 'generate' | 'history'>('generate');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchQuery, setSearchQuery] = useState('');
    const [processing, setProcessing] = useState(false);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);

    // --- SETUP STATE ---
    const [editingEmp, setEditingEmp] = useState<string | null>(null);
    const [tempSalary, setTempSalary] = useState<{basic: number, type: EmploymentType}>({ basic: 0, type: 'office' });

    // --- LOAN STATE ---
    const [newLoan, setNewLoan] = useState<{empId: string, total: number, installment: number}>({ empId: '', total: 0, installment: 0 });

    // --- GENERATE STATE ---
    const [generatedData, setGeneratedData] = useState<PayrollRecord[]>([]);
    
    // --- HISTORY STATE ---
    const [historyView, setHistoryView] = useState<PayrollRecord[] | null>(null);
    
    // --- PAYSLIP MODAL STATE ---
    const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

    // Reset pagination when tab or search changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, searchQuery]);

    // Helper: Is Quarterly Month? (Mar=2, Jun=5, Sep=8, Dec=11)
    const isQuarterlyMonth = (selectedMonth + 1) % 3 === 0;

    // --- STATS CALCULATION FOR HEADER ---
    const totalPayrollValue = generatedData.reduce((acc, curr) => acc + curr.netSalary, 0);
    const totalLoansValue = loans.reduce((acc, curr) => acc + (curr.totalAmount - curr.paidAmount), 0);
    
    // --- GROUP HISTORY DATA ---
    const historyGroups = useMemo(() => {
        const groups: { [key: string]: PayrollRecord[] } = {};
        payrolls.forEach(p => {
            const key = `${p.year}-${p.month}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(p);
        });
        return Object.entries(groups).map(([key, records]) => {
            const [year, month] = key.split('-').map(Number);
            const totalAmount = records.reduce((sum, r) => sum + r.netSalary, 0);
            return { key, year, month, records, totalAmount, count: records.length };
        }).sort((a, b) => {
            if (b.year !== a.year) return b.year - a.year;
            return b.month - a.month;
        });
    }, [payrolls]);

    // --- LOGIC: Calculate Salary ---
    const calculatePayroll = () => {
        const records = attendanceRecords.filter(r => {
            const d = new Date(r.date);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });

        const payrolls: PayrollRecord[] = employees.map(emp => {
            // 1. Basic Setup
            const basic = emp.basicSalary || 0;
            const type = emp.employmentType || 'office';
            
            // 2. Attendance Stats
            const empRecords = records.filter(r => r.employeeId === emp.id);
            let totalOvertimeMinutes = 0;
            let unexcusedAbsences = 0;

            empRecords.forEach(r => {
                const stats = calculateDailyStats(r.date, config, r, emp);
                totalOvertimeMinutes += stats.netOvertimeMinutes;
                if (r.status === 'absent_penalty') unexcusedAbsences++;
            });

            // 3. Overtime Calc
            const branchConfig = (emp.branch === 'factory') ? config.factory : config.office;
            const daysBase = branchConfig.payrollDaysBase || 30;
            const hoursBase = branchConfig.payrollHoursBase || 8; 

            const hourlyRate = basic > 0 ? (basic / daysBase / hoursBase) : 0;
            let overtimeValue = 0;
            
            if (type === 'factory') {
                const overtimeHours = totalOvertimeMinutes / 60;
                overtimeValue = Math.round(overtimeHours * hourlyRate * 1); 
            }

            // 4. Deductions
            const dayRate = basic / daysBase;
            const penaltyVal = branchConfig.penaltyValue ?? DEFAULT_PENALTY_VALUE;
            const penaltyValue = Math.round(unexcusedAbsences * dayRate * penaltyVal); 

            // 5. Loans
            const activeLoan = loans.find(l => l.employeeId === emp.id && l.status === 'active');
            let loanDeduction = 0;
            if (activeLoan) {
                const remaining = activeLoan.totalAmount - activeLoan.paidAmount;
                loanDeduction = Math.min(activeLoan.installmentPerMonth, remaining);
            }

            // 6. Init Record
            return {
                id: `${emp.id}-${selectedYear}-${selectedMonth}`,
                employeeId: emp.id,
                month: selectedMonth,
                year: selectedYear,
                basicSalary: basic,
                overtimeHours: totalOvertimeMinutes / 60,
                overtimeValue: overtimeValue,
                incentives: 0,
                commissions: 0,
                bonuses: 0,
                absentDays: unexcusedAbsences,
                absentValue: Math.round(unexcusedAbsences * dayRate),
                penaltyValue: penaltyValue,
                deductions: 0, // Default manual deductions
                loanDeduction: loanDeduction,
                insurance: 0,
                netSalary: 0, 
                status: 'draft',
                generatedAt: new Date().toISOString()
            };
        });

        // Final Net Calculation
        const finalPayrolls = payrolls.map(p => ({
            ...p,
            netSalary: (p.basicSalary + p.overtimeValue + p.incentives + p.commissions + p.bonuses) - (p.absentValue + p.penaltyValue + p.deductions + p.loanDeduction + p.insurance)
        }));

        setGeneratedData(finalPayrolls);
        setCurrentPage(1); // Reset to first page on new calculation
    };

    // Updated to use ID instead of Index for safety with pagination
    const handleUpdateRecord = (id: string, field: keyof PayrollRecord, value: number) => {
        setGeneratedData(prevData => {
            const updatedData = prevData.map(record => {
                if (record.id === id) {
                    const updatedRecord = { ...record, [field]: value };
                    // Recalculate Net
                    updatedRecord.netSalary = (updatedRecord.basicSalary + updatedRecord.overtimeValue + updatedRecord.incentives + updatedRecord.commissions + updatedRecord.bonuses) - (updatedRecord.absentValue + updatedRecord.penaltyValue + updatedRecord.deductions + updatedRecord.loanDeduction + updatedRecord.insurance);
                    return updatedRecord;
                }
                return record;
            });
            return updatedData;
        });
    };

    const handleSavePayroll = async () => {
        if (!confirm('هل أنت متأكد من اعتماد الرواتب؟ سيتم تحديث أرصدة السلف وحفظ السجل في الأرشيف.')) return;
        setProcessing(true);
        
        for (const record of generatedData) {
            await upsertPayroll({ ...record, status: 'paid' });

            if (record.loanDeduction > 0) {
                const loan = loans.find(l => l.employeeId === record.employeeId && l.status === 'active');
                if (loan) {
                    const newPaid = loan.paidAmount + record.loanDeduction;
                    const newStatus = newPaid >= loan.totalAmount ? 'completed' : 'active';
                    await upsertLoan({ ...loan, paidAmount: newPaid, status: newStatus });
                }
            }
        }
        
        setProcessing(false);
        alert('تم حفظ الرواتب وترحيل السلف بنجاح!');
        onUpdateData(); 
        setGeneratedData([]); 
        setActiveTab('history'); 
    };

    const handleDeleteArchive = async (month: number, year: number) => {
        if (!confirm(`هل أنت متأكد من حذف أرشيف رواتب شهر ${new Date(0, month).toLocaleDateString('ar-EG', {month: 'long'})} ${year} نهائياً؟`)) return;
        
        const res = await deletePayrollArchive(month, year);
        if (res.success) {
            alert('تم حذف الأرشيف بنجاح');
            onUpdateData();
        } else {
            alert('حدث خطأ أثناء الحذف: ' + (res.error?.message || 'غير معروف'));
        }
    };

    // --- SETUP HANDLERS ---
    const saveEmployeeSetup = async (id: string) => {
        const emp = employees.find(e => e.id === id);
        if (emp) {
            const safeBasic = isNaN(tempSalary.basic) ? 0 : tempSalary.basic;
            const safeType = tempSalary.type || 'office';

            await upsertSingleEmployee({ 
                ...emp, 
                basicSalary: safeBasic,
                employmentType: safeType 
            });
            
            setEditingEmp(null);
            setTimeout(() => onUpdateData(), 100); 
        }
    };

    // --- LOAN HANDLERS ---
    const handleAddLoan = async () => {
        if (!newLoan.empId || newLoan.total <= 0) return;
        
        const loan: Loan = {
            id: Date.now().toString(),
            employeeId: newLoan.empId,
            totalAmount: newLoan.total,
            paidAmount: 0,
            installmentPerMonth: newLoan.installment,
            startDate: new Date().toISOString(),
            status: 'active'
        };
        
        await upsertLoan(loan);
        setNewLoan({ empId: '', total: 0, installment: 0 });
        alert('تم إضافة السلفة بنجاح');
        onUpdateData();
    };

    const handleDeleteLoan = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه السلفة نهائياً؟')) return;
        const res = await deleteLoan(id);
        if (res.success) onUpdateData();
        else alert('حدث خطأ أثناء الحذف');
    };

    const handleExportExcel = (data: PayrollRecord[]) => {
        if (data.length === 0) {
            alert('لا توجد بيانات للتصدير');
            return;
        }

        const formattedData = data.map(record => {
            const emp = employees.find(e => e.id === record.employeeId);
            const branchName = emp?.branch === 'factory' ? 'مصنع' : 'مكتب';
            
            return {
                'كود الموظف': emp?.id.substring(0, 6) || '-',
                'اسم الموظف': emp?.name || 'غير معروف',
                'المسمى الوظيفي': emp?.position,
                'الفرع': branchName,
                'الراتب الأساسي': record.basicSalary,
                'قيمة الساعة': (record.basicSalary / 30 / 8).toFixed(2),
                'ساعات إضافي': record.overtimeHours,
                'قيمة الإضافي': record.overtimeValue,
                'الحوافز': record.incentives,
                'العمولات': record.commissions,
                'المكافآت': record.bonuses,
                'إجمالي المستحق': (record.basicSalary + record.overtimeValue + record.incentives + record.commissions + record.bonuses),
                'أيام الغياب': record.absentDays,
                'خصم الغياب': record.absentValue + record.penaltyValue,
                'خصومات إضافية': record.deductions,
                'سداد السلف': record.loanDeduction,
                'تأمينات': record.insurance,
                'إجمالي الاستقطاعات': (record.absentValue + record.penaltyValue + record.deductions + record.loanDeduction + record.insurance),
                'صافي الراتب': record.netSalary,
                'حالة الصرف': record.status === 'paid' ? 'تم الصرف' : 'معلق'
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(formattedData);
        const wscols = [
            { wch: 10 }, { wch: 25 }, { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 12 }, 
            { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 10 }, { wch: 15 }, 
            { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }
        ];
        worksheet['!cols'] = wscols;

        const workbook = XLSX.utils.book_new();
        workbook.Workbook = { Views: [{ RTL: true }] };
        XLSX.utils.book_append_sheet(workbook, worksheet, "مسير الرواتب");

        const fileName = `Payroll_Report_${new Date().getFullYear()}_${new Date().getMonth()+1}_${new Date().getTime()}.xlsx`;
        XLSX.writeFile(workbook, fileName);
    };

    const getEmploymentLabel = (type?: EmploymentType) => {
        switch(type) {
            case 'factory': return 'موظف مصنع';
            case 'office': return 'موظف مكتب';
            case 'sales': return 'مبيعات';
            case 'owner': return 'مالك / شريك';
            default: return 'غير محدد';
        }
    };

    // --- RENDER HELPERS ---
    
    // 1. Prepare GENERATE Data
    const filteredPayroll = useMemo(() => {
        return generatedData.filter(row => {
            const empName = employees.find(e => e.id === row.employeeId)?.name || '';
            return empName.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [generatedData, employees, searchQuery]);

    const paginatedPayroll = useMemo(() => {
        return filteredPayroll.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filteredPayroll, currentPage]);

    // 2. Prepare SETUP Data
    const filteredEmployees = useMemo(() => {
        return employees.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [employees, searchQuery]);

    const paginatedEmployees = useMemo(() => {
        return filteredEmployees.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filteredEmployees, currentPage]);

    // 3. Prepare LOANS Data
    const filteredLoans = useMemo(() => {
        return loans.filter(l => {
            const name = employees.find(e => e.id === l.employeeId)?.name || '';
            return name.toLowerCase().includes(searchQuery.toLowerCase());
        });
    }, [loans, employees, searchQuery]);

    const paginatedLoans = useMemo(() => {
        return filteredLoans.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    }, [filteredLoans, currentPage]);


    return (
        <div className="space-y-8 pb-20 relative animate-fade-in">
            {/* Top Navigation & Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={(e) => { e.preventDefault(); onExit(); }}
                        className="p-3 bg-white dark:bg-slate-800 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-500 transition-all shadow-sm"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <Banknote className="text-emerald-500" /> نظام المرتبات والأجور
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">إدارة الرواتب، السلف، والحوافز</p>
                    </div>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl self-center md:self-auto shadow-inner">
                    {[
                        { id: 'generate', label: 'صرف الرواتب', icon: Calculator },
                        { id: 'setup', label: 'البيانات الأساسية', icon: Users },
                        { id: 'loans', label: 'إدارة السلف', icon: Wallet },
                        { id: 'history', label: 'الأرشيف', icon: Calendar },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-slate-700 shadow text-emerald-600 dark:text-emerald-400' 
                                : 'text-slate-500 hover:text-emerald-600'
                            }`}
                        >
                            <tab.icon size={16} /> <span className="hidden md:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Cards (Only Visible in Generate Tab) */}
            {activeTab === 'generate' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:translate-y-[-2px] transition-all">
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                            <Banknote size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">إجمالي الرواتب</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{totalPayrollValue.toLocaleString()} <span className="text-xs text-slate-400">ج.م</span></h3>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:translate-y-[-2px] transition-all">
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">الموظفين المعالجين</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{generatedData.length} <span className="text-sm text-slate-400">/ {employees.length}</span></h3>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:translate-y-[-2px] transition-all">
                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-2xl">
                            <Wallet size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">إجمالي السلف</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{totalLoansValue.toLocaleString()} <span className="text-xs text-slate-400">ج.م</span></h3>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-4 hover:translate-y-[-2px] transition-all">
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-2xl">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold mb-1">تاريخ الاستحقاق</p>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">28 {new Date(0, selectedMonth).toLocaleDateString('ar-EG', {month: 'long'})}</h3>
                        </div>
                    </div>
                </div>
            )}

            {/* --- TAB CONTENT AREA --- */}
            
            {/* 1. GENERATE PAYROLL TAB */}
            {activeTab === 'generate' && (
                <div className="space-y-6">
                    {/* Action Bar */}
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex gap-2 w-full md:w-auto">
                            <button 
                                onClick={calculatePayroll}
                                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 text-sm w-full md:w-auto justify-center"
                            >
                                <Calculator size={18} /> إعداد الكشف
                            </button>
                            {generatedData.length > 0 && (
                                <button 
                                    onClick={handleSavePayroll}
                                    disabled={processing}
                                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 text-sm w-full md:w-auto justify-center"
                                >
                                    {processing ? <span className="animate-spin">⌛</span> : <Save size={18} />} 
                                    اعتماد وحفظ
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700 w-full md:w-auto">
                            <Calendar size={18} className="text-slate-400 mr-2" />
                            <select 
                                value={selectedMonth} 
                                onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-transparent font-bold text-sm outline-none cursor-pointer text-slate-700 dark:text-white"
                            >
                                {[0,1,2,3,4,5,6,7,8,9,10,11].map(m => <option key={m} value={m}>{new Date(0, m).toLocaleDateString('ar-EG', {month: 'long'})}</option>)}
                            </select>
                            <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-2"></div>
                            <select 
                                value={selectedYear} 
                                onChange={e => setSelectedYear(parseInt(e.target.value))}
                                className="bg-transparent font-bold text-sm outline-none cursor-pointer text-slate-700 dark:text-white"
                            >
                                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <div className="relative w-full md:w-64">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" 
                                placeholder="بحث باسم الموظف..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pr-10 pl-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                            />
                        </div>
                    </div>

                    {/* Data Table */}
                    {generatedData.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-sm">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 font-bold text-xs uppercase border-b border-slate-100 dark:border-slate-700">
                                        <tr>
                                            <th className="p-5 min-w-[200px]">الموظف</th>
                                            <th className="p-5 text-center">الأساسي</th>
                                            <th className="p-5 text-center">سعر الساعة</th>
                                            <th className="p-5 text-center text-emerald-600">س.إضافي</th>
                                            <th className="p-5 text-center text-emerald-600">ق.إضافي</th>
                                            <th className="p-5 text-center">عمولات</th>
                                            <th className="p-5 text-center">مكافآت</th>
                                            <th className="p-5 text-center text-red-500">خصم سلفة</th>
                                            <th className="p-5 text-center text-red-500">خصومات يدوية</th>
                                            <th className="p-5 text-center">الصافي</th>
                                            <th className="p-5 text-center">إجراءات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                        {paginatedPayroll.map((row) => {
                                            const emp = employees.find(e => e.id === row.employeeId);
                                            const isFactory = emp?.employmentType === 'factory';
                                            
                                            // Get Configuration Used for Calc
                                            const branchConfig = (emp?.branch === 'factory') ? config.factory : config.office;
                                            const daysBase = branchConfig.payrollDaysBase || 30;
                                            const hoursBase = branchConfig.payrollHoursBase || 8;
                                            const hourlyRate = row.basicSalary > 0 ? (row.basicSalary / daysBase / hoursBase) : 0;

                                            // Get active loan to set max limit
                                            const activeLoan = loans.find(l => l.employeeId === emp?.id && l.status === 'active');
                                            const remainingLoan = activeLoan ? (activeLoan.totalAmount - activeLoan.paidAmount) : 0;

                                            return (
                                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors group">
                                                    <td className="p-5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center font-bold text-sm">
                                                                {emp?.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-bold text-slate-800 dark:text-white">{emp?.name}</h4>
                                                                <span className={`text-[10px] px-2 py-0.5 rounded-md ${isFactory ? 'bg-amber-100 text-amber-700' : 'bg-blue-50 text-blue-600'}`}>
                                                                    {getEmploymentLabel(emp?.employmentType)}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-5 text-center font-mono text-slate-600 dark:text-slate-300">
                                                        {row.basicSalary.toLocaleString()}
                                                    </td>
                                                    <td className="p-5 text-center font-mono text-xs text-slate-400">
                                                        {isFactory && hourlyRate > 0 ? hourlyRate.toFixed(2) : '-'}
                                                    </td>
                                                    <td className="p-5 text-center font-bold text-emerald-600">
                                                        {isFactory ? row.overtimeHours.toFixed(1) : '-'}
                                                    </td>
                                                    <td className="p-5 text-center font-mono text-slate-600 dark:text-slate-300">
                                                        {isFactory ? row.overtimeValue.toLocaleString() : '-'}
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        {emp?.employmentType === 'sales' ? (
                                                            <input 
                                                                type="number" value={row.commissions} 
                                                                onChange={e => handleUpdateRecord(row.id, 'commissions', parseFloat(e.target.value))}
                                                                className="w-20 p-1.5 border border-slate-200 rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                                                            />
                                                        ) : '-'}
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <input 
                                                            type="number" value={row.bonuses} 
                                                            onChange={e => handleUpdateRecord(row.id, 'bonuses', parseFloat(e.target.value))}
                                                            className="w-20 p-1.5 border border-slate-200 rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 focus:bg-white transition-all"
                                                        />
                                                    </td>
                                                    <td className="p-5 text-center font-bold text-red-500">
                                                        {activeLoan ? (
                                                            <div className="flex flex-col items-center">
                                                                <input 
                                                                    type="number" 
                                                                    min="0"
                                                                    max={remainingLoan}
                                                                    value={row.loanDeduction} 
                                                                    onChange={e => {
                                                                        let val = parseFloat(e.target.value);
                                                                        if (isNaN(val)) val = 0;
                                                                        if (val > remainingLoan) val = remainingLoan;
                                                                        handleUpdateRecord(row.id, 'loanDeduction', val);
                                                                    }}
                                                                    className="w-20 p-1.5 border border-orange-200 rounded-lg text-center text-sm font-bold text-orange-600 outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50 focus:bg-white transition-all"
                                                                />
                                                                <span className="text-[9px] text-slate-400 mt-1">متبقي: {remainingLoan}</span>
                                                            </div>
                                                        ) : '-'}
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <input 
                                                            type="number" value={row.deductions || 0} 
                                                            onChange={e => handleUpdateRecord(row.id, 'deductions', parseFloat(e.target.value))}
                                                            className="w-20 p-1.5 border border-red-200 rounded-lg text-center text-sm font-bold text-red-600 outline-none focus:ring-2 focus:ring-red-500 bg-red-50 focus:bg-white transition-all"
                                                        />
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-xl font-black text-sm">
                                                            {row.netSalary.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="p-5 text-center">
                                                        <button 
                                                            onClick={() => setSelectedPayslip(row)}
                                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        >
                                                            <FileText size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            
                            {/* Conditional Pagination Footer */}
                            {filteredPayroll.length > ITEMS_PER_PAGE && (
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-sm text-slate-500">
                                    <div>عرض {((currentPage - 1) * ITEMS_PER_PAGE) + 1} إلى {Math.min(currentPage * ITEMS_PER_PAGE, filteredPayroll.length)} من {filteredPayroll.length} نتيجة</div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                            className="px-3 py-1 bg-white border rounded hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            السابق
                                        </button>
                                        <span className="px-3 py-1 bg-blue-600 text-white rounded font-bold">{currentPage}</span>
                                        <button 
                                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredPayroll.length / ITEMS_PER_PAGE), p + 1))}
                                            disabled={currentPage * ITEMS_PER_PAGE >= filteredPayroll.length}
                                            className="px-3 py-1 bg-white border rounded hover:bg-slate-50 disabled:opacity-50"
                                        >
                                            التالي
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* 2. SETUP TAB */}
            {activeTab === 'setup' && (
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm overflow-hidden border border-slate-100 dark:border-slate-700">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">تحديد الرواتب الأساسية وأنواع الوظائف</h3>
                            <p className="text-sm text-slate-500 mt-1">إدارة بيانات الموظفين وتعديل الهيكل الوظيفي</p>
                        </div>
                        <div className="relative max-w-xs">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" placeholder="بحث باسم الموظف..." 
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>
                    </div>
                    <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 font-bold text-xs uppercase">
                            <tr>
                                <th className="p-5">الموظف</th>
                                <th className="p-5">نوع الوظيفة</th>
                                <th className="p-5">الراتب الأساسي</th>
                                <th className="p-5 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {paginatedEmployees.map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                    <td className="p-5 font-bold text-slate-700 dark:text-white flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-black">
                                            {emp.name.split(' ').map(n => n[0]).join('').slice(0,2)}
                                        </div>
                                        <div>
                                            <div className="text-base">{emp.name}</div>
                                            <div className="text-[10px] text-slate-400 font-normal mt-0.5">ID: #{emp.id.slice(0,4)} - {emp.position}</div>
                                        </div>
                                    </td>
                                    <td className="p-5">
                                        {editingEmp === emp.id ? (
                                            <select 
                                                value={tempSalary.type}
                                                onChange={e => setTempSalary({...tempSalary, type: e.target.value as any})}
                                                className="p-2.5 rounded-xl border text-sm w-full outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white shadow-sm"
                                            >
                                                <option value="office">موظف مكتب</option>
                                                <option value="factory">موظف مصنع</option>
                                                <option value="sales">موظف مبيعات</option>
                                                <option value="owner">مالك</option>
                                            </select>
                                        ) : (
                                            <span className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 w-fit ${
                                                emp.employmentType === 'factory' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                                emp.employmentType === 'sales' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                                emp.employmentType === 'owner' ? 'bg-slate-800 text-white' :
                                                'bg-blue-50 text-blue-700 border border-blue-100'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${emp.employmentType === 'factory' ? 'bg-amber-500' : 'bg-blue-500'}`}></span>
                                                {getEmploymentLabel(emp.employmentType)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-5 font-mono font-bold text-slate-800 dark:text-slate-200">
                                        {editingEmp === emp.id ? (
                                            <div className="relative">
                                                <input 
                                                    type="number" 
                                                    value={tempSalary.basic}
                                                    onChange={e => setTempSalary({...tempSalary, basic: parseFloat(e.target.value)})}
                                                    className="p-2.5 pl-10 rounded-xl border w-40 outline-none focus:border-blue-500 bg-white dark:bg-slate-900 dark:border-slate-600 dark:text-white shadow-sm"
                                                />
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">ج.م</span>
                                            </div>
                                        ) : (
                                            <span className="flex items-center gap-1 dir-ltr">
                                                {emp.basicSalary?.toLocaleString() || 0} <span className="text-xs text-slate-400">ج.م</span>
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-5 text-center">
                                        {editingEmp === emp.id ? (
                                            <div className="flex gap-2 justify-center">
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); saveEmployeeSetup(emp.id); }} 
                                                    className="text-emerald-500 hover:bg-emerald-50 p-2 rounded-full transition-colors"
                                                >
                                                    <CheckCircle size={20} />
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingEmp(null); }} 
                                                    className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"
                                                >
                                                    <X size={20} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                type="button"
                                                onClick={(e) => { 
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setEditingEmp(emp.id); 
                                                    setTempSalary({ basic: emp.basicSalary || 0, type: emp.employmentType || 'office' });
                                                }}
                                                className="text-blue-500 hover:bg-blue-50 p-2 rounded-full transition-colors"
                                            >
                                                <CreditCard size={18} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    
                    {/* Conditional Pagination Footer */}
                    {filteredEmployees.length > ITEMS_PER_PAGE && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center text-sm text-slate-500">
                            <div>عرض {((currentPage - 1) * ITEMS_PER_PAGE) + 1} إلى {Math.min(currentPage * ITEMS_PER_PAGE, filteredEmployees.length)} من {filteredEmployees.length} موظف</div>
                            <div className="flex gap-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1 rounded hover:bg-white"><ChevronRight size={16} /></button>
                                <span className="px-3 py-0.5 bg-emerald-500 text-white rounded text-xs font-bold">{currentPage}</span>
                                <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredEmployees.length / ITEMS_PER_PAGE), p + 1))} disabled={currentPage * ITEMS_PER_PAGE >= filteredEmployees.length} className="p-1 rounded hover:bg-white"><ChevronLeft size={16} /></button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- TAB: LOANS --- */}
            {activeTab === 'loans' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* New Loan Form */}
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 h-fit">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg flex items-center gap-2 text-slate-800 dark:text-white">
                                <Wallet className="text-emerald-500" /> إضافة سلفة جديدة
                            </h3>
                            <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center">
                                <Plus size={16} className="text-emerald-600" />
                            </div>
                        </div>
                        
                        <div className="space-y-5">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1.5">الموظف</label>
                                <div className="relative">
                                    <select 
                                        value={newLoan.empId} 
                                        onChange={e => setNewLoan({...newLoan, empId: e.target.value})}
                                        className="w-full p-3.5 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-sm outline-none focus:ring-2 focus:ring-emerald-500 appearance-none"
                                    >
                                        <option value="">-- اختر الموظف --</option>
                                        {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                    <ChevronLeft className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 rotate-[-90deg]" size={16} />
                                </div>
                            </div>
                            
                            <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">قيمة السلفة (ج.م)</label>
                                    <input 
                                        type="number"
                                        placeholder="0"
                                        value={newLoan.total} 
                                        onChange={e => setNewLoan({...newLoan, total: parseFloat(e.target.value)})}
                                        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none focus:border-emerald-500 text-center font-mono font-bold text-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1.5">القسط الشهري (الخصم)</label>
                                    <input 
                                        type="number"
                                        placeholder="0"
                                        value={newLoan.installment} 
                                        onChange={e => setNewLoan({...newLoan, installment: parseFloat(e.target.value)})}
                                        className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-600 outline-none focus:border-emerald-500 text-center font-mono font-bold text-lg"
                                    />
                                    <p className="text-[10px] text-slate-400 mt-1 text-center">يتم خصم هذا المبلغ تلقائياً كل شهر</p>
                                </div>
                            </div>

                            <button 
                                type="button"
                                onClick={(e) => { e.preventDefault(); handleAddLoan(); }}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <CheckCircle size={18} /> اعتماد السلفة
                            </button>
                        </div>
                    </div>

                    {/* Active Loans Table */}
                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">سجل السلف الجارية</h3>
                            <div className="relative w-64">
                                <input type="text" placeholder="بحث باسم الموظف..." className="w-full pl-8 pr-4 py-2 bg-slate-50 rounded-lg text-sm border-none outline-none focus:ring-1 focus:ring-emerald-500" />
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                            </div>
                        </div>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-right text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 font-bold text-xs uppercase">
                                    <tr>
                                        <th className="p-4">الموظف</th>
                                        <th className="p-4">إجمالي السلفة</th>
                                        <th className="p-4">تم سداد</th>
                                        <th className="p-4 text-center">المتبقي (مرحل)</th>
                                        <th className="p-4">القسط</th>
                                        <th className="p-4">الحالة</th>
                                        <th className="p-4 text-center">إجراءات</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {loans.length === 0 ? (
                                        <tr><td colSpan={7} className="p-12 text-center text-slate-400">لا توجد سلف نشطة حالياً</td></tr>
                                    ) : paginatedLoans.map(loan => {
                                        const emp = employees.find(e => e.id === loan.employeeId);
                                        const remaining = loan.totalAmount - loan.paidAmount;
                                        return (
                                            <tr key={loan.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs">
                                                            {emp?.name.slice(0,2)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800 dark:text-white">{emp?.name}</div>
                                                            <div className="text-[10px] text-slate-400">#{loan.id.slice(-4)}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-mono">{loan.totalAmount.toLocaleString()}</td>
                                                <td className="p-4 font-mono text-emerald-600">{loan.paidAmount.toLocaleString()}</td>
                                                <td className="p-4 font-mono text-red-500 font-bold text-center">{remaining.toLocaleString()}</td>
                                                <td className="p-4 font-mono">{loan.installmentPerMonth.toLocaleString()}</td>
                                                <td className="p-4">
                                                    <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded text-[10px] font-bold">نشطة</span>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button 
                                                        onClick={() => handleDeleteLoan(loan.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {/* Conditional Pagination Footer */}
                        {filteredLoans.length > ITEMS_PER_PAGE && (
                            <div className="bg-slate-50 p-3 text-center text-xs text-slate-400 border-t border-slate-100 flex justify-between items-center px-4">
                                <div>عرض {((currentPage - 1) * ITEMS_PER_PAGE) + 1} إلى {Math.min(currentPage * ITEMS_PER_PAGE, filteredLoans.length)} من {filteredLoans.length} سجل</div>
                                <div className="flex gap-2">
                                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 border rounded bg-white">السابق</button>
                                    <span className="px-2 py-1">{currentPage}</span>
                                    <button onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredLoans.length / ITEMS_PER_PAGE), p + 1))} disabled={currentPage * ITEMS_PER_PAGE >= filteredLoans.length} className="px-2 py-1 border rounded bg-white">التالي</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- TAB: HISTORY (ARCHIVE) --- */}
            {activeTab === 'history' && (
                <div className="space-y-6">
                    {historyView ? (
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-in-right">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setHistoryView(null)} className="p-2 rounded-full hover:bg-white dark:hover:bg-slate-700 transition-colors">
                                        <ArrowLeft size={20} />
                                    </button>
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-800 dark:text-white">تفاصيل الرواتب المؤرشفة</h3>
                                        <p className="text-sm text-slate-500">عرض للقراءة فقط</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleExportExcel(historyView)}
                                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 rounded-xl text-slate-600 dark:text-slate-200 text-sm font-bold shadow-sm hover:shadow transition-all"
                                >
                                    <Download size={16} /> تحميل Excel
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 font-bold uppercase">
                                        <tr>
                                            <th className="p-4 min-w-[150px]">الموظف</th>
                                            <th className="p-4 text-center">الأساسي</th>
                                            <th className="p-4 text-center bg-green-50/50 dark:bg-green-900/10">ق.إضافي</th>
                                            <th className="p-4 text-center bg-purple-50/50 dark:bg-purple-900/10">حوافز وعمولات</th>
                                            <th className="p-4 text-center bg-red-50/50 dark:bg-red-900/10">خصومات</th>
                                            <th className="p-4 text-center font-black text-base">الصافي</th>
                                            <th className="p-4 text-center">الحالة</th>
                                            <th className="p-4 text-center">قسيمة</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {historyView.map((row) => {
                                            const emp = employees.find(e => e.id === row.employeeId);
                                            return (
                                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                                    <td className="p-4 font-bold flex flex-col">
                                                        <span className="text-sm">{emp?.name}</span>
                                                        <span className="text-[10px] text-slate-400">{getEmploymentLabel(emp?.employmentType)}</span>
                                                    </td>
                                                    <td className="p-4 text-center font-mono">{row.basicSalary.toLocaleString()}</td>
                                                    <td className="p-4 text-center font-mono text-green-600 font-bold">{row.overtimeValue.toLocaleString()}</td>
                                                    <td className="p-4 text-center text-purple-600">{(row.incentives + row.commissions + row.bonuses).toLocaleString()}</td>
                                                    <td className="p-4 text-center text-red-600 font-bold">{(row.absentValue + row.penaltyValue + row.deductions + row.loanDeduction + row.insurance).toLocaleString()}</td>
                                                    <td className="p-4 text-center">
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black text-sm">
                                                            {row.netSalary.toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-bold">مدفوع</span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        <button 
                                                            onClick={() => setSelectedPayslip(row)}
                                                            className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {historyGroups.length === 0 ? (
                                <div className="col-span-full py-20 text-center text-slate-400">
                                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>لا توجد سجلات رواتب مؤرشفة حتى الآن.</p>
                                </div>
                            ) : historyGroups.map((group) => (
                                <div key={group.key} onClick={() => setHistoryView(group.records)} className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all group relative">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center font-bold text-xl">
                                                {group.month + 1}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-lg text-slate-800 dark:text-white">رواتب شهر {new Date(0, group.month).toLocaleDateString('ar-EG', {month: 'long'})}</h4>
                                                <p className="text-slate-400 text-xs font-mono">{group.year}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-full bg-slate-50 dark:bg-slate-700 text-slate-400 group-hover:text-emerald-500 transition-colors">
                                                <Eye size={20} />
                                            </div>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteArchive(group.month, group.year);
                                                }}
                                                className="p-2 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 transition-colors"
                                                title="حذف الأرشيف"
                                            >
                                                <Trash2 size={20} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">إجمالي المصروف</p>
                                            <p className="text-2xl font-black text-slate-800 dark:text-white">{group.totalAmount.toLocaleString()} <span className="text-xs font-medium text-slate-400">ج.م</span></p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-slate-500 mb-1">الموظفين</p>
                                            <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                                                <Users size={14} /> {group.count}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* --- PAYSLIP MODAL --- */}
            {selectedPayslip && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setSelectedPayslip(null)}>
                    <div className="bg-white rounded-[1.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-in relative" onClick={e => e.stopPropagation()}>
                        {/* Header Gradient */}
                        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white flex justify-between items-start">
                            <div>
                                <h3 className="text-2xl font-black mb-1">قسيمة راتب</h3>
                                <p className="opacity-70 text-sm">شهر {new Date(0, selectedPayslip.month).toLocaleDateString('ar-EG', {month: 'long'})} {selectedPayslip.year}</p>
                            </div>
                            <div className="text-left">
                                <div className="font-bold text-lg">Mowazeb PRO</div>
                                <div className="text-[10px] opacity-60 tracking-widest uppercase">Payroll System</div>
                            </div>
                        </div>

                        {/* Employee Info */}
                        <div className="p-6 border-b border-slate-100">
                            <div className="flex items-center gap-4">
                                <img 
                                    src={employees.find(e => e.id === selectedPayslip.employeeId)?.avatar} 
                                    className="w-16 h-16 rounded-full border-4 border-slate-50 shadow-sm" 
                                    alt="" 
                                />
                                <div>
                                    <h4 className="text-xl font-bold text-slate-800">{employees.find(e => e.id === selectedPayslip.employeeId)?.name}</h4>
                                    <div className="flex gap-2 text-sm text-slate-500 mt-1">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs">{employees.find(e => e.id === selectedPayslip.employeeId)?.position}</span>
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-xs dir-ltr">ID: {selectedPayslip.employeeId.slice(0,6)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Financial Details */}
                        <div className="p-6 grid grid-cols-2 gap-8">
                            {/* Earnings */}
                            <div className="space-y-3">
                                <h5 className="text-xs font-black text-emerald-600 uppercase tracking-widest mb-4 border-b border-emerald-100 pb-2">المستحقات</h5>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">الراتب الأساسي</span>
                                    <span className="font-bold">{selectedPayslip.basicSalary.toLocaleString()}</span>
                                </div>
                                {selectedPayslip.overtimeValue > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">عمل إضافي</span>
                                        <span className="font-bold">{selectedPayslip.overtimeValue.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedPayslip.incentives > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">حوافز</span>
                                        <span className="font-bold">{selectedPayslip.incentives.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedPayslip.commissions > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">عمولات</span>
                                        <span className="font-bold">{selectedPayslip.commissions.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedPayslip.bonuses > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">مكافآت</span>
                                        <span className="font-bold">{selectedPayslip.bonuses.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>

                            {/* Deductions */}
                            <div className="space-y-3">
                                <h5 className="text-xs font-black text-red-600 uppercase tracking-widest mb-4 border-b border-red-100 pb-2">الاستقطاعات</h5>
                                {(selectedPayslip.absentValue + selectedPayslip.penaltyValue) > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">غياب وجزاءات</span>
                                        <span className="font-bold text-red-600">{(selectedPayslip.absentValue + selectedPayslip.penaltyValue).toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedPayslip.deductions > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">خصومات إضافية</span>
                                        <span className="font-bold text-red-600">{selectedPayslip.deductions.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedPayslip.loanDeduction > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">سلف</span>
                                        <span className="font-bold text-red-600">{selectedPayslip.loanDeduction.toLocaleString()}</span>
                                    </div>
                                )}
                                {selectedPayslip.insurance > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">تأمينات</span>
                                        <span className="font-bold text-red-600">{selectedPayslip.insurance.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Net Salary Footer */}
                        <div className="bg-slate-50 p-6 flex justify-between items-center border-t border-slate-100">
                            <div>
                                <div className="text-xs text-slate-400 font-bold uppercase mb-1">صافي الراتب المستحق</div>
                                <div className="text-3xl font-black text-slate-800">{selectedPayslip.netSalary.toLocaleString()} <span className="text-sm font-medium text-slate-400">ج.م</span></div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => window.print()} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm">
                                    <Printer size={20} />
                                </button>
                                <button className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors shadow-sm">
                                    <Share2 size={20} />
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={() => setSelectedPayslip(null)}
                            className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollManager;
