
import React, { useState, useMemo } from 'react';
import { Employee, AttendanceRecord, PayrollRecord, Loan, AppConfig, EmploymentType } from '../types';
import { calculateDailyStats, minutesToTime } from '../utils';
import { upsertPayroll, upsertLoan, upsertSingleEmployee } from '../supabaseClient';
import { 
    Banknote, Users, Calculator, Wallet, Save, Printer, 
    TrendingUp, Calendar, AlertCircle, CheckCircle, ArrowLeft, Search, Building, Factory, DollarSign, Crown
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

const PayrollManager: React.FC<PayrollManagerProps> = ({ 
    employees, attendanceRecords, loans, payrolls, config, onUpdateData, onExit 
}) => {
    const [activeTab, setActiveTab] = useState<'setup' | 'loans' | 'generate' | 'history'>('generate');
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [searchQuery, setSearchQuery] = useState('');
    const [processing, setProcessing] = useState(false);

    // --- SETUP STATE ---
    const [editingEmp, setEditingEmp] = useState<string | null>(null);
    const [tempSalary, setTempSalary] = useState<{basic: number, type: EmploymentType}>({ basic: 0, type: 'office' });

    // --- LOAN STATE ---
    const [newLoan, setNewLoan] = useState<{empId: string, total: number, installment: number}>({ empId: '', total: 0, installment: 0 });

    // --- GENERATE STATE ---
    const [generatedData, setGeneratedData] = useState<PayrollRecord[]>([]);

    // Helper: Is Quarterly Month? (Mar=2, Jun=5, Sep=8, Dec=11)
    const isQuarterlyMonth = (selectedMonth + 1) % 3 === 0;

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

            // 3. Overtime Calc (Factory Only usually, but logic allows general)
            // Rate assumption: Basic / 30 days / 8 hours
            const hourlyRate = basic > 0 ? (basic / 30 / 8) : 0;
            let overtimeValue = 0;
            
            if (type === 'factory') {
                // Factory: Overtime is calculated. Maybe 1.5x rate? Let's assume 1.5x for simplicity or standard rate
                const overtimeHours = totalOvertimeMinutes / 60;
                overtimeValue = Math.round(overtimeHours * hourlyRate * 1.5); // 1.5x multiplier
            }

            // 4. Deductions
            // Penalty value from config or day rate
            const dayRate = basic / 30;
            const penaltyValue = Math.round(unexcusedAbsences * dayRate * (config.penaltyValue || 1)); // Penalty multiplier

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
                incentives: 0, // Manual input later
                commissions: 0, // Manual input later
                bonuses: 0,
                absentDays: unexcusedAbsences,
                absentValue: Math.round(unexcusedAbsences * dayRate), // Basic deduction for absence
                penaltyValue: penaltyValue, // Extra penalty
                loanDeduction: loanDeduction,
                insurance: 0,
                netSalary: 0, // Calc at end
                status: 'draft',
                generatedAt: new Date().toISOString()
            };
        });

        // Final Net Calculation
        const finalPayrolls = payrolls.map(p => ({
            ...p,
            netSalary: (p.basicSalary + p.overtimeValue + p.incentives + p.commissions + p.bonuses) - (p.absentValue + p.penaltyValue + p.loanDeduction + p.insurance)
        }));

        setGeneratedData(finalPayrolls);
    };

    const handleUpdateRecord = (index: number, field: keyof PayrollRecord, value: number) => {
        const updated = [...generatedData];
        updated[index] = { ...updated[index], [field]: value };
        
        // Recalculate Net
        const p = updated[index];
        p.netSalary = (p.basicSalary + p.overtimeValue + p.incentives + p.commissions + p.bonuses) - (p.absentValue + p.penaltyValue + p.loanDeduction + p.insurance);
        
        setGeneratedData(updated);
    };

    const handleSavePayroll = async () => {
        if (!confirm('هل أنت متأكد من اعتماد الرواتب؟ سيتم تحديث أرصدة السلف.')) return;
        setProcessing(true);
        
        for (const record of generatedData) {
            // 1. Save Payroll
            await upsertPayroll({ ...record, status: 'paid' });

            // 2. Update Loan Balance
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
        setActiveTab('history');
    };

    // --- SETUP HANDLERS ---
    const saveEmployeeSetup = async (id: string) => {
        const emp = employees.find(e => e.id === id);
        if (emp) {
            await upsertSingleEmployee({ 
                ...emp, 
                basicSalary: tempSalary.basic,
                employmentType: tempSalary.type 
            });
            setEditingEmp(null);
            onUpdateData();
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

    // --- RENDER HELPERS ---
    const getEmploymentLabel = (type?: EmploymentType) => {
        switch(type) {
            case 'factory': return 'موظف مصنع';
            case 'office': return 'موظف مكتب';
            case 'sales': return 'مبيعات';
            case 'owner': return 'مالك / شريك';
            default: return 'غير محدد';
        }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-4 mb-4 md:mb-0">
                    <button onClick={onExit} className="p-3 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-colors">
                        <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
                    </button>
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            <Banknote className="text-emerald-500" /> نظام المرتبات والأجور
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">إدارة الرواتب، السلف، والحوافز</p>
                    </div>
                </div>
                
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl">
                    {[
                        { id: 'generate', label: 'صرف الرواتب', icon: Calculator },
                        { id: 'setup', label: 'البيانات الأساسية', icon: Users },
                        { id: 'loans', label: 'إدارة السلف', icon: Wallet },
                        { id: 'history', label: 'الأرشيف', icon: Calendar },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all ${
                                activeTab === tab.id 
                                ? 'bg-white dark:bg-slate-700 shadow-md text-emerald-600 dark:text-emerald-400' 
                                : 'text-slate-500 hover:text-emerald-600'
                            }`}
                        >
                            <tab.icon size={18} /> <span className="hidden md:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* --- TAB: SETUP --- */}
            {activeTab === 'setup' && (
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm overflow-hidden border border-slate-100 dark:border-slate-700">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-4">تحديد الرواتب الأساسية وأنواع الوظائف</h3>
                        <div className="relative max-w-md">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text" placeholder="بحث باسم الموظف..." 
                                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pr-10 pl-4 py-3 rounded-xl border-none ring-1 ring-slate-200 dark:ring-slate-700 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                        </div>
                    </div>
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 dark:bg-slate-700/30 text-slate-500 font-bold text-xs uppercase">
                            <tr>
                                <th className="p-4">الموظف</th>
                                <th className="p-4">نوع الوظيفة</th>
                                <th className="p-4">الراتب الأساسي</th>
                                <th className="p-4 text-center">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {employees.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())).map(emp => (
                                <tr key={emp.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                    <td className="p-4 font-bold text-slate-700 dark:text-white flex items-center gap-3">
                                        <img src={emp.avatar} className="w-10 h-10 rounded-full" alt="" />
                                        <div>
                                            <div>{emp.name}</div>
                                            <div className="text-[10px] text-slate-400">{emp.position}</div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        {editingEmp === emp.id ? (
                                            <select 
                                                value={tempSalary.type}
                                                onChange={e => setTempSalary({...tempSalary, type: e.target.value as any})}
                                                className="p-2 rounded-lg border text-sm w-full outline-none focus:border-emerald-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                            >
                                                <option value="office">مكتب (حوافز ربع سنوية)</option>
                                                <option value="factory">مصنع (حساب إضافي)</option>
                                                <option value="sales">مبيعات (عمولات)</option>
                                                <option value="owner">مالك (راتب فقط)</option>
                                            </select>
                                        ) : (
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit ${
                                                emp.employmentType === 'factory' ? 'bg-amber-100 text-amber-700' :
                                                emp.employmentType === 'sales' ? 'bg-purple-100 text-purple-700' :
                                                emp.employmentType === 'owner' ? 'bg-slate-800 text-white' :
                                                'bg-blue-100 text-blue-700'
                                            }`}>
                                                {emp.employmentType === 'factory' ? <Factory size={12} /> : 
                                                 emp.employmentType === 'sales' ? <TrendingUp size={12} /> :
                                                 emp.employmentType === 'owner' ? <Crown size={12} /> : <Building size={12} />}
                                                {getEmploymentLabel(emp.employmentType)}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 font-mono font-bold text-slate-800 dark:text-slate-200">
                                        {editingEmp === emp.id ? (
                                            <input 
                                                type="number" 
                                                value={tempSalary.basic}
                                                onChange={e => setTempSalary({...tempSalary, basic: parseFloat(e.target.value)})}
                                                className="p-2 rounded-lg border w-32 outline-none focus:border-emerald-500 dark:bg-slate-900 dark:border-slate-600 dark:text-white"
                                            />
                                        ) : (
                                            `${emp.basicSalary?.toLocaleString() || 0} ج.م`
                                        )}
                                    </td>
                                    <td className="p-4 text-center">
                                        {editingEmp === emp.id ? (
                                            <div className="flex gap-2 justify-center">
                                                <button onClick={() => saveEmployeeSetup(emp.id)} className="bg-emerald-500 text-white p-2 rounded-lg hover:bg-emerald-600"><CheckCircle size={16} /></button>
                                                <button onClick={() => setEditingEmp(null)} className="bg-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-300"><AlertCircle size={16} /></button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => { setEditingEmp(emp.id); setTempSalary({ basic: emp.basicSalary || 0, type: emp.employmentType || 'office' }) }}
                                                className="text-blue-500 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                            >
                                                تعديل
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* --- TAB: LOANS --- */}
            {activeTab === 'loans' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 h-fit">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><Wallet className="text-emerald-500" /> إضافة سلفة جديدة</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">الموظف</label>
                                <select 
                                    value={newLoan.empId} 
                                    onChange={e => setNewLoan({...newLoan, empId: e.target.value})}
                                    className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                >
                                    <option value="">-- اختر الموظف --</option>
                                    {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">قيمة السلفة</label>
                                <input 
                                    type="number"
                                    value={newLoan.total} 
                                    onChange={e => setNewLoan({...newLoan, total: parseFloat(e.target.value)})}
                                    className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-500 mb-1">القسط الشهري (الخصم)</label>
                                <input 
                                    type="number"
                                    value={newLoan.installment} 
                                    onChange={e => setNewLoan({...newLoan, installment: parseFloat(e.target.value)})}
                                    className="w-full p-3 rounded-xl border dark:bg-slate-900 dark:border-slate-600 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <button 
                                onClick={handleAddLoan}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all"
                            >
                                اعتماد السلفة
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="font-bold text-lg mb-6">سجل السلف الجارية</h3>
                        <table className="w-full text-right text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700/30 text-slate-500">
                                <tr>
                                    <th className="p-3">الموظف</th>
                                    <th className="p-3">إجمالي السلفة</th>
                                    <th className="p-3">تم سداد</th>
                                    <th className="p-3">المتبقي (مرحل)</th>
                                    <th className="p-3">القسط</th>
                                    <th className="p-3">الحالة</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loans.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">لا توجد سلف نشطة</td></tr>
                                ) : loans.map(loan => {
                                    const emp = employees.find(e => e.id === loan.employeeId);
                                    const remaining = loan.totalAmount - loan.paidAmount;
                                    return (
                                        <tr key={loan.id}>
                                            <td className="p-3 font-bold">{emp?.name}</td>
                                            <td className="p-3">{loan.totalAmount}</td>
                                            <td className="p-3 text-emerald-600">{loan.paidAmount}</td>
                                            <td className="p-3 font-bold text-red-500">{remaining}</td>
                                            <td className="p-3">{loan.installmentPerMonth}</td>
                                            <td className="p-3">
                                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">نشط</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- TAB: GENERATE PAYROLL --- */}
            {activeTab === 'generate' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm flex items-center justify-between border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-2 rounded-xl">
                                <Calendar className="text-emerald-500" />
                                <select 
                                    value={selectedMonth} 
                                    onChange={e => setSelectedMonth(parseInt(e.target.value))}
                                    className="bg-transparent font-bold outline-none"
                                >
                                    {[0,1,2,3,4,5,6,7,8,9,10,11].map(m => <option key={m} value={m}>{new Date(0, m).toLocaleDateString('ar-EG', {month: 'long'})}</option>)}
                                </select>
                                <select 
                                    value={selectedYear} 
                                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                                    className="bg-transparent font-bold outline-none"
                                >
                                    {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <button 
                                onClick={calculatePayroll}
                                className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all"
                            >
                                <Calculator size={18} className="inline ml-2" /> إعداد الكشف
                            </button>
                        </div>
                        {generatedData.length > 0 && (
                            <button 
                                onClick={handleSavePayroll}
                                disabled={processing}
                                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all flex items-center gap-2"
                            >
                                {processing ? <span className="animate-spin">⌛</span> : <Save size={20} />} 
                                اعتماد وحفظ الرواتب
                            </button>
                        )}
                    </div>

                    {generatedData.length > 0 && (
                        <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm overflow-hidden border border-slate-100 dark:border-slate-700 animate-slide-up">
                            <div className="overflow-x-auto">
                                <table className="w-full text-right text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-600 font-bold uppercase">
                                        <tr>
                                            <th className="p-4 min-w-[150px]">الموظف</th>
                                            <th className="p-4 text-center">الأساسي</th>
                                            <th className="p-4 text-center bg-green-50/50">س.إضافي</th>
                                            <th className="p-4 text-center bg-green-50/50">ق.إضافي</th>
                                            {isQuarterlyMonth && <th className="p-4 text-center bg-blue-50/50 text-blue-700">حافز ربع سنوي</th>}
                                            <th className="p-4 text-center bg-purple-50/50 text-purple-700">عمولات</th>
                                            <th className="p-4 text-center bg-yellow-50/50">مكافآت</th>
                                            <th className="p-4 text-center bg-red-50/50">غياب/جزاء</th>
                                            <th className="p-4 text-center bg-red-50/50 font-bold text-red-600">خصم سلفة</th>
                                            <th className="p-4 text-center font-black text-base">الصافي</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {generatedData.map((row, idx) => {
                                            const emp = employees.find(e => e.id === row.employeeId);
                                            const isOwner = emp?.employmentType === 'owner';
                                            const isFactory = emp?.employmentType === 'factory';
                                            const isOffice = emp?.employmentType === 'office';
                                            const isSales = emp?.employmentType === 'sales';

                                            return (
                                                <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                                                    <td className="p-4 font-bold flex flex-col">
                                                        <span className="text-sm">{emp?.name}</span>
                                                        <span className="text-[10px] text-slate-400">{getEmploymentLabel(emp?.employmentType)}</span>
                                                    </td>
                                                    <td className="p-4 text-center font-mono">{row.basicSalary.toLocaleString()}</td>
                                                    
                                                    {/* Overtime (Factory Only Logic Display) */}
                                                    <td className="p-4 text-center text-slate-500">
                                                        {isFactory ? row.overtimeHours.toFixed(1) : '-'}
                                                    </td>
                                                    <td className="p-4 text-center font-mono text-green-600 font-bold">
                                                        {isFactory ? row.overtimeValue : '-'}
                                                    </td>

                                                    {/* Incentives (Office Quarterly) */}
                                                    {isQuarterlyMonth && (
                                                        <td className="p-4 text-center">
                                                            {isOffice ? (
                                                                <input 
                                                                    type="number" value={row.incentives} 
                                                                    onChange={e => handleUpdateRecord(idx, 'incentives', parseFloat(e.target.value))}
                                                                    className="w-20 p-1 border rounded text-center text-blue-600 font-bold outline-none focus:ring-1 focus:ring-blue-500"
                                                                />
                                                            ) : '-'}
                                                        </td>
                                                    )}

                                                    {/* Commissions (Sales Only) */}
                                                    <td className="p-4 text-center">
                                                        {isSales ? (
                                                            <input 
                                                                type="number" value={row.commissions} 
                                                                onChange={e => handleUpdateRecord(idx, 'commissions', parseFloat(e.target.value))}
                                                                className="w-20 p-1 border rounded text-center text-purple-600 font-bold outline-none focus:ring-1 focus:ring-purple-500"
                                                            />
                                                        ) : '-'}
                                                    </td>

                                                    {/* Bonuses (General, except Owners usually but allowed) */}
                                                    <td className="p-4 text-center">
                                                        {!isOwner ? (
                                                            <input 
                                                                type="number" value={row.bonuses} 
                                                                onChange={e => handleUpdateRecord(idx, 'bonuses', parseFloat(e.target.value))}
                                                                className="w-20 p-1 border rounded text-center bg-yellow-50 outline-none"
                                                            />
                                                        ) : '-'}
                                                    </td>

                                                    {/* Deductions */}
                                                    <td className="p-4 text-center text-red-500">
                                                        {(row.absentValue + row.penaltyValue)}
                                                    </td>
                                                    <td className="p-4 text-center font-bold text-red-700">
                                                        {row.loanDeduction > 0 ? row.loanDeduction : '-'}
                                                    </td>

                                                    {/* Net */}
                                                    <td className="p-4 text-center">
                                                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-black text-sm">
                                                            {row.netSalary.toLocaleString()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- TAB: HISTORY --- */}
            {activeTab === 'history' && (
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm p-8 text-center text-slate-400">
                    <p>سجل الرواتب السابقة (قيد التطوير للعرض)</p>
                </div>
            )}
        </div>
    );
};

export default PayrollManager;
