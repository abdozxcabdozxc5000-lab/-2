
import React, { useMemo, useState, useEffect } from 'react';
import { Employee, AttendanceRecord, AppConfig, UserRole } from '../types';
import { calculateRanking, minutesToTime, Permissions, calculateDailyStats, formatTime12H, getMonthDates, generatePerformanceReview } from '../utils';
import { Printer, Users, List, Table2, UserPlus, X, Calendar, FileSpreadsheet, CheckSquare, Building, Factory, Square } from 'lucide-react';

const MONTHS = [
    { value: 0, label: 'يناير' }, { value: 1, label: 'فبراير' }, { value: 2, label: 'مارس' },
    { value: 3, label: 'أبريل' }, { value: 4, label: 'مايو' }, { value: 5, label: 'يونيو' },
    { value: 6, label: 'يوليو' }, { value: 7, label: 'أغسطس' }, { value: 8, label: 'سبتمبر' },
    { value: 9, label: 'أكتوبر' }, { value: 10, label: 'نوفمبر' }, { value: 11, label: 'ديسمبر' }
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

interface ReportsProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  config: AppConfig;
  currentUserRole: UserRole;
  currentEmployeeId: string;
}

const Reports: React.FC<ReportsProps> = ({ employees, attendanceRecords, config, currentUserRole, currentEmployeeId }) => {
  const [reportType, setReportType] = useState<'summary' | 'detailed'>('summary');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const activeEmployeeIds = useMemo(() => {
    if ((currentUserRole as string) === 'office_manager') {
        return new Set(employees.filter(e => e.branch === 'office').map(e => e.id));
    }
    return new Set(employees.map(e => e.id));
  }, [employees, currentUserRole]);
  
  const activeRecords = useMemo(() => {
      return attendanceRecords.filter(r => {
          if (!activeEmployeeIds.has(r.employeeId)) return false;
          const [rYear, rMonth] = r.date.split('-').map(Number);
          return rMonth - 1 === selectedMonth && rYear === selectedYear;
      });
  }, [attendanceRecords, activeEmployeeIds, selectedMonth, selectedYear]);

  const visibleEmployees = useMemo(() => {
      if ((currentUserRole as string) === 'office_manager') {
          return employees.filter(e => e.branch === 'office');
      }
      return employees;
  }, [employees, currentUserRole]);

  const data = useMemo(() => calculateRanking(visibleEmployees, activeRecords, config), [visibleEmployees, activeRecords, config]);
  
  const canViewAll = Permissions.canViewAllReports(currentUserRole) || Permissions.isOwner(currentUserRole) || (currentUserRole as string) === 'office_manager';
  
  const displayData = canViewAll ? data : data.filter(d => d.employeeId === currentEmployeeId);

  useEffect(() => {
      if (canViewAll) {
          setSelectedIds(displayData.map(e => e.employeeId));
      } else {
          setSelectedIds([currentEmployeeId]);
      }
  }, [displayData.length, canViewAll, selectedMonth, selectedYear]);

  const toggleEmployeeSelection = (id: string) => {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleBulkSelect = (type: 'all' | 'office' | 'factory' | 'none') => {
      if (type === 'none') {
          setSelectedIds([]);
          return;
      }

      const targetIds = displayData.filter(d => {
          if (type === 'all') return true;
          const emp = employees.find(e => e.id === d.employeeId);
          return emp?.branch === type;
      }).map(d => d.employeeId);

      setSelectedIds(targetIds);
  };

  const handlePrint = () => window.print();

  const handleDownloadCSV = () => {
      const headers = ['الترتيب', 'الموظف', 'المنصب', 'النقاط', 'التأخير (دقيقة)', 'غياب غير مبرر', 'إضافي كلي (دقيقة)', 'إضافي صافي (دقيقة)', 'نسبة الالتزام', 'نسبة الإضافي'];
      
      const rows = displayData.map(row => [
          row.rank,
          `"${row.name}"`, 
          `"${row.position}"`,
          row.score,
          row.totalDelay,
          row.unexcusedAbsences,
          row.totalRawOvertime,
          row.totalNetOvertime,
          `"${row.commitmentScore}%"`,
          `"${row.overtimeScore}%"`
      ]);

      const csvContent = "\uFEFF" + 
          [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Attendance_Report_${MONTHS[selectedMonth].label}_${selectedYear}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const monthName = MONTHS[selectedMonth].label;
  const monthDates = getMonthDates(selectedYear, selectedMonth);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 print:hidden">
        <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">نظام التقارير الذكي</h2>
            <div className="flex items-center gap-2 mt-2 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 w-fit">
                <Calendar size={16} className="text-blue-500 mr-1" />
                <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="bg-transparent text-xs font-bold outline-none cursor-pointer">
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value))} className="bg-transparent text-xs font-bold outline-none cursor-pointer">
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 mt-4 md:mt-0">
             <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                <button onClick={() => setReportType('summary')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'summary' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><List size={14} /> التقرير الشامل</button>
                <button onClick={() => setReportType('detailed')} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${reportType === 'detailed' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}><Table2 size={14} /> كشف تفصيلي</button>
             </div>
             
             <button onClick={handleDownloadCSV} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold shadow-lg shadow-emerald-500/20 transition-colors">
                <FileSpreadsheet size={16} /> 
                <span className="hidden sm:inline">تصدير Excel</span>
             </button>
             
             <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/20 transition-colors">
                <Printer size={16} /> 
                <span className="hidden sm:inline">طباعة PDF</span>
             </button>
        </div>
      </div>

      {reportType === 'detailed' && canViewAll && (
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 print:hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                  <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <UserPlus size={18} className="text-blue-500" /> تحديد الموظفين لإدراجهم في الكشف التفصيلي
                  </h3>
                  
                  {/* --- BULK SELECTION BUTTONS --- */}
                  <div className="flex flex-wrap gap-2">
                      <button onClick={() => handleBulkSelect('all')} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-[10px] font-bold transition-colors">
                          <CheckSquare size={12} /> تحديد الكل
                      </button>
                      <button onClick={() => handleBulkSelect('office')} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold transition-colors">
                          <Building size={12} /> موظفي المكتب
                      </button>
                      <button onClick={() => handleBulkSelect('factory')} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-[10px] font-bold transition-colors">
                          <Factory size={12} /> موظفي المصنع
                      </button>
                      <button onClick={() => handleBulkSelect('none')} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 hover:bg-slate-100 rounded-lg text-[10px] font-bold transition-colors border border-slate-200">
                          <Square size={12} /> إلغاء التحديد
                      </button>
                  </div>
              </div>

              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                  {displayData.map(emp => (
                      <button key={emp.employeeId} onClick={() => toggleEmployeeSelection(emp.employeeId)} className={`px-4 py-1.5 rounded-full border text-xs transition-all ${selectedIds.includes(emp.employeeId) ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                          {emp.name}
                      </button>
                  ))}
              </div>
          </div>
      )}

      {/* --- REPORT VIEW START --- */}
      <div className="bg-white dark:bg-slate-900 p-0 md:p-4 rounded-3xl min-h-screen print:p-0 print:bg-white">
        
        {reportType === 'summary' ? (
          /* --- SUMMARY REPORT (PAGE 1) --- */
          <div className="p-8 bg-white text-slate-900 print:p-0">
            <div className="flex justify-between items-start mb-10 border-b pb-6">
                <div className="text-right">
                    <h1 className="text-3xl font-black text-slate-800">التقرير الشامل (ملخص)</h1>
                    <p className="text-slate-500 font-bold mt-1">تقرير شهر {monthName} {selectedYear}</p>
                </div>
                <div className="text-left">
                    <h2 className="text-xl font-black text-blue-600">برنامج الحضور والانصراف</h2>
                    <p className="text-[10px] text-slate-400 font-mono tracking-widest">{new Date().toLocaleDateString('ar-EG')}</p>
                </div>
            </div>

            <div className="mb-6">
                <h3 className="bg-slate-50 p-3 rounded-t-xl border border-b-0 font-black text-slate-700">جدول الترتيب العام</h3>
                <div className="border rounded-b-xl overflow-hidden shadow-sm">
                    <table className="w-full text-right text-[11px] border-collapse">
                        <thead className="bg-slate-50 border-b">
                            <tr className="text-slate-500">
                                <th className="p-3 border-l text-center w-10">#</th>
                                <th className="p-3 border-l min-w-[150px]">الموظف</th>
                                <th className="p-3 border-l text-center">النقاط</th>
                                <th className="p-3 border-l text-center">التأخير</th>
                                <th className="p-3 border-l text-center">غياب (ب.ع)</th>
                                <th className="p-3 border-l text-center">إضافي (كلي)</th>
                                <th className="p-3 border-l text-center">إضافي (صافي)</th>
                                <th className="p-3 border-l text-center w-24">التزام</th>
                                <th className="p-3 border-l text-center w-24">إضافي</th>
                                <th className="p-3 text-center w-24">حضور</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayData.map((row, idx) => (
                                <tr key={row.employeeId} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="p-3 border-l text-center font-black">
                                        <div className="w-6 h-6 rounded-full bg-yellow-400/20 text-yellow-700 flex items-center justify-center mx-auto">{idx+1}</div>
                                    </td>
                                    <td className="p-3 border-l">
                                        <div className="font-black text-slate-800">{row.name}</div>
                                        <div className="text-[9px] text-slate-400">{row.position}</div>
                                    </td>
                                    <td className="p-3 border-l text-center font-black">{row.score}</td>
                                    <td className="p-3 border-l text-center font-mono">{minutesToTime(row.totalDelay)}</td>
                                    <td className="p-3 border-l text-center font-bold text-red-600">{row.unexcusedAbsences}</td>
                                    <td className="p-3 border-l text-center font-mono">{minutesToTime(row.totalRawOvertime)}</td>
                                    <td className={`p-3 border-l text-center font-black dir-ltr ${row.totalNetOvertime < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                                        {minutesToTime(row.totalNetOvertime)}
                                    </td>
                                    <td className="p-3 border-l">
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-slate-700 h-full" style={{ width: `${row.commitmentScore}%` }}></div>
                                        </div>
                                    </td>
                                    <td className="p-3 border-l">
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-slate-700 h-full" style={{ width: `${row.overtimeScore}%` }}></div>
                                        </div>
                                    </td>
                                    <td className="p-3">
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-slate-700 h-full" style={{ width: `${row.absenceScore}%` }}></div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
          </div>
        ) : (
          <div className="block">
            {displayData.filter(e => selectedIds.includes(e.employeeId)).map((emp, index, arr) => {
                const initials = emp.name.split(' ').map(n => n[0]).join('').slice(0, 2);
                const narrative = generatePerformanceReview(emp);
                const employeeRecords = activeRecords.filter(r => r.employeeId === emp.employeeId);
                const isLast = index === arr.length - 1;
                
                const fullEmployee = employees.find(e => e.id === emp.employeeId);

                return (
                    <div key={emp.employeeId} className={`p-8 bg-white text-slate-900 border-b-2 last:border-0 border-dashed print:border-none print:p-0 ${!isLast ? 'break-after-page' : ''}`}>
                        <div className="flex justify-between items-center mb-10">
                            <div>
                                <h1 className="text-3xl font-black text-slate-800">كشف حضور وانصراف تفصيلي</h1>
                                <p className="text-slate-500 font-bold mt-1">تقرير شهر {monthName} {selectedYear}</p>
                            </div>
                            <div className="text-left">
                                <h2 className="text-xl font-black text-blue-600">برنامج الحضور والانصراف</h2>
                                <p className="text-[10px] text-slate-500 font-bold">نظام إدارة الموارد البشرية</p>
                            </div>
                        </div>

                        <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 flex flex-col md:flex-row items-center gap-12 relative mb-8">
                             <div className="w-24 h-24 rounded-full bg-blue-700 flex items-center justify-center text-white text-3xl font-black shadow-xl shrink-0">
                                {initials}
                             </div>
                             <div className="flex-1 text-center md:text-right">
                                <h2 className="text-3xl font-black text-slate-800 mb-1">{emp.name}</h2>
                                <p className="text-slate-500 font-bold">{emp.position}</p>
                             </div>
                             <div className="flex gap-8 border-r-2 pr-8 border-slate-200">
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1">الترتيب</p>
                                    <p className="text-3xl font-black text-slate-800">#{emp.rank}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1">النقاط</p>
                                    <p className="text-3xl font-black text-blue-600">{emp.score}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] text-slate-400 font-black uppercase mb-1">صافي الإضافي</p>
                                    <p className={`text-3xl font-black font-mono dir-ltr ${emp.totalNetOvertime < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                        {minutesToTime(emp.totalNetOvertime)}
                                    </p>
                                </div>
                             </div>
                        </div>

                        <div className="mb-10 p-6 border-r-4 border-blue-500 bg-blue-50/30 rounded-l-2xl">
                            <p className="text-sm italic text-slate-600 leading-relaxed font-medium">"{narrative}"</p>
                        </div>

                        <div>
                            <h3 className="font-black text-slate-800 mb-4 text-lg">سجل الحركات اليومي</h3>
                            <div className="border rounded-2xl overflow-hidden shadow-sm">
                                <table className="w-full text-right text-[10px] border-collapse">
                                    <thead className="bg-slate-50 border-b">
                                        <tr className="text-slate-500 uppercase font-black">
                                            <th className="p-3 border-l">التاريخ</th>
                                            <th className="p-3 border-l">الحالة</th>
                                            <th className="p-3 border-l text-center">دخول</th>
                                            <th className="p-3 border-l text-center">خروج</th>
                                            <th className="p-3 border-l text-center">تأخير</th>
                                            <th className="p-3 border-l text-center">إضافي (كلي)</th>
                                            <th className="p-3 border-l text-center">انصراف مبكر</th>
                                            <th className="p-3 border-l text-center">إضافي (صافي)</th>
                                            <th className="p-3">ملاحظات</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {monthDates.map(date => {
                                            const record = employeeRecords.find(r => r.date === date);
                                            const stats = calculateDailyStats(date, config, record, fullEmployee);
                                            const d = new Date(date);
                                            const dayName = d.toLocaleDateString('ar-EG', { weekday: 'long' });
                                            
                                            return (
                                                <tr key={date} className={`${stats.isFriday ? 'bg-slate-50/50' : ''}`}>
                                                    <td className="p-3 border-l font-mono flex gap-2">
                                                        <span className="font-black text-slate-400">{date}</span>
                                                        <span className="text-slate-300">{dayName}</span>
                                                    </td>
                                                    <td className="p-3 border-l">
                                                        <span className={`px-2 py-0.5 rounded-md font-bold text-[9px] ${
                                                            stats.statusLabel === 'ملتزم' ? 'bg-emerald-100 text-emerald-700' :
                                                            stats.statusLabel === 'تأخير' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {stats.statusLabel}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 border-l text-center font-mono">{formatTime12H(record?.checkIn)}</td>
                                                    <td className="p-3 border-l text-center font-mono">{formatTime12H(record?.checkOut)}</td>
                                                    <td className="p-3 border-l text-center font-black text-red-600">{stats.delayMinutes || '-'}</td>
                                                    <td className="p-3 border-l text-center font-mono">{minutesToTime(stats.overtimeMinutes) || '-'}</td>
                                                    <td className="p-3 border-l text-center font-black text-orange-600">{stats.earlyDepartureMinutes || '-'}</td>
                                                    <td className={`p-3 border-l text-center font-black dir-ltr ${stats.netOvertimeMinutes < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                                                        {minutesToTime(stats.netOvertimeMinutes) || '-'}
                                                    </td>
                                                    <td className="p-3 text-slate-400 italic text-[9px]">{record?.note || ''}</td>
                                                </tr>
                                            );
                                        })}
                                        <tr className="bg-slate-50 font-black">
                                            <td colSpan={4} className="p-3 border-l text-left pr-4">الإجمالي</td>
                                            <td className="p-3 border-l text-center font-mono">{minutesToTime(emp.totalDelay)}</td>
                                            <td className="p-3 border-l text-center font-mono">{minutesToTime(emp.totalRawOvertime)}</td>
                                            <td className="p-3 border-l text-center">-</td>
                                            <td className={`p-3 border-l text-center font-mono dir-ltr ${emp.totalNetOvertime < 0 ? 'text-red-600' : 'text-blue-700'}`}>
                                                {minutesToTime(emp.totalNetOvertime)}
                                            </td>
                                            <td className="p-3"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
