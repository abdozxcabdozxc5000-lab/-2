
import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Employee, AttendanceRecord, AppConfig, UserRole } from '../types';
import { calculateRanking, minutesToTime, Permissions, calculateDailyStats } from '../utils';
import { Trophy, Clock, AlertTriangle, CalendarCheck, Users, Calendar, Building, Factory } from 'lucide-react';
import { DEFAULT_CONFIG } from '../constants';

interface DashboardProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  config: AppConfig;
  currentUserRole: UserRole;
  currentEmployeeId: string;
}

const COLORS = ['#10B981', '#F59E0B', '#EF4444', '#7F1D1D'];

const MONTHS = [
    { value: 0, label: 'يناير' }, { value: 1, label: 'فبراير' }, { value: 2, label: 'مارس' },
    { value: 3, label: 'أبريل' }, { value: 4, label: 'مايو' }, { value: 5, label: 'يونيو' },
    { value: 6, label: 'يوليو' }, { value: 7, label: 'أغسطس' }, { value: 8, label: 'سبتمبر' },
    { value: 9, label: 'أكتوبر' }, { value: 10, label: 'نوفمبر' }, { value: 11, label: 'ديسمبر' }
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700 text-sm">
        <p className="font-bold text-slate-800 dark:text-white mb-1">{label ? label : payload[0].name}</p>
        <p className="text-blue-600 dark:text-blue-400 font-bold">
           {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

const Dashboard: React.FC<DashboardProps> = ({ employees, attendanceRecords, config, currentUserRole, currentEmployeeId }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBranch, setSelectedBranch] = useState<'all' | 'office' | 'factory'>('all');

  // Enforce branch filter for Office Manager
  useEffect(() => {
    if (currentUserRole === 'office_manager') {
        setSelectedBranch('office');
    }
  }, [currentUserRole]);

  // Filter Employees based on Branch
  const filteredEmployees = useMemo(() => {
      let emps = employees;
      
      // Strict filtering for Office Manager role (Backend logic simulation in frontend)
      if (currentUserRole === 'office_manager') {
          return emps.filter(e => e.branch === 'office');
      }

      // Normal filtering for others
      if (selectedBranch === 'all') return emps;
      return emps.filter(e => e.branch === selectedBranch);
  }, [employees, selectedBranch, currentUserRole]);

  const activeEmployeeIds = useMemo(() => new Set(filteredEmployees.map(e => e.id)), [filteredEmployees]);
  
  const activeRecords = useMemo(() => {
      return attendanceRecords.filter(r => {
          if (!activeEmployeeIds.has(r.employeeId)) return false;
          const [rYear, rMonth] = r.date.split('-').map(Number);
          return rMonth - 1 === selectedMonth && rYear === selectedYear;
      });
  }, [attendanceRecords, activeEmployeeIds, selectedMonth, selectedYear]);

  const ranking = useMemo(() => calculateRanking(filteredEmployees, activeRecords, config), [filteredEmployees, activeRecords, config]);
  
  const canViewAll = Permissions.canViewAllDashboard(currentUserRole) || Permissions.isOwner(currentUserRole) || currentUserRole === 'office_manager';

  const myData = ranking.find(r => r.employeeId === currentEmployeeId);
  const topEmployees = ranking.slice(0, 3);
  
  const totalEmployees = filteredEmployees.length;
  
  // Update: Calculate Late status using calculateDailyStats to respect branch timings
  const totalLate = activeRecords.filter(r => {
      const emp = employees.find(e => e.id === r.employeeId);
      const stats = calculateDailyStats(r.date, config, r, emp);
      return stats.delayMinutes > 0;
  }).length;

  const totalAbsent = activeRecords.filter(r => r.status === 'absent' || r.status === 'absent_penalty').length;

  const totalRecordsCount = Math.max(1, activeRecords.length);
  const commitmentRate = activeRecords.length > 0 
      ? Math.round(((activeRecords.length - totalAbsent - totalLate) / totalRecordsCount) * 100)
      : 0;

  const chartData = ranking.slice(0, 10).map(emp => ({
      name: emp.name.split(' ')[0],
      score: emp.score
  }));

  const pieData = [
      { name: 'ملتزم', value: Math.max(0, activeRecords.length - totalLate - totalAbsent) },
      { name: 'تأخير', value: totalLate },
      { name: 'غياب', value: totalAbsent },
  ];

  if (canViewAll && employees.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-400 dark:text-slate-500 animate-scale-in">
              <Users size={64} className="mb-4 opacity-50" />
              <h2 className="text-xl font-bold">لا يوجد موظفين حالياً</h2>
              <p>قم بإضافة موظفين من صفحة "إدارة المستخدمين" لبدء عرض الإحصائيات.</p>
          </div>
      );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">
              {canViewAll ? 'لوحة التحكم العامة' : `أهلاً بك، ${myData?.name || ''}`}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              {canViewAll ? 'متابعة أداء الموظفين خلال الفترة المختارة' : 'إحصائيات أدائك وترتيبك الحالي'}
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
            {/* Branch Filter Tabs - Hidden for Office Manager as they are restricted */}
            {canViewAll && currentUserRole !== 'office_manager' && (
                <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl self-start md:self-auto">
                    <button 
                        onClick={() => setSelectedBranch('all')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedBranch === 'all' ? 'bg-white shadow text-blue-600' : 'text-slate-500 dark:text-slate-300'}`}
                    >
                        <Users size={14} /> الكل
                    </button>
                    <button 
                        onClick={() => setSelectedBranch('office')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedBranch === 'office' ? 'bg-white shadow text-blue-600' : 'text-slate-500 dark:text-slate-300'}`}
                    >
                        <Building size={14} /> المكتب
                    </button>
                    <button 
                        onClick={() => setSelectedBranch('factory')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${selectedBranch === 'factory' ? 'bg-white shadow text-blue-600' : 'text-slate-500 dark:text-slate-300'}`}
                    >
                        <Factory size={14} /> المصنع
                    </button>
                </div>
            )}

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 self-start md:self-auto">
                <Calendar size={18} className="text-blue-500 mr-2" />
                <select 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(parseInt(e.target.value))}
                    className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer p-1"
                >
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select 
                    value={selectedYear} 
                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                    className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer p-1"
                >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>
      </div>

      {!canViewAll && myData ? (
          <div className="space-y-8">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden transition-all hover:scale-[1.01] duration-300">
                  <div className="relative z-10">
                      <div className="text-indigo-100 text-lg mb-2">ترتيبك في {MONTHS[selectedMonth].label}</div>
                      <div className="text-6xl font-black mb-4 drop-shadow-md">#{myData.rank}</div>
                      <div className="text-2xl font-bold mb-1">{myData.score} نقطة</div>
                      <p className="text-indigo-100 opacity-90 max-w-md">
                        {myData.rank === 1 
                            ? "أنت في الصدارة! حافظ على أدائك الممتاز." 
                            : `تحتاج إلى ${myData.pointsToNextRank} نقطة لتتجاوز زميلك في المركز ${myData.rank - 1}.`
                        }
                      </p>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-10 translate-y-10">
                      <Trophy size={200} />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                      <div className="text-slate-500 dark:text-slate-400 mb-2">التزامك بالحضور</div>
                      <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{Math.round(myData.commitmentScore)}%</div>
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2 mt-2">
                          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-1000" style={{ width: `${myData.commitmentScore}%` }}></div>
                      </div>
                  </div>
                   <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                      <div className="text-slate-500 dark:text-slate-400 mb-2">ساعات الإضافي (الصافي)</div>
                      <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{Math.round(myData.totalNetOvertime / 60)} ساعة</div>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                      <div className="text-slate-500 dark:text-slate-400 mb-2">نقاط مخصومة</div>
                      <div className="text-3xl font-bold text-red-500 dark:text-red-400">{myData.penaltyPoints}</div>
                  </div>
              </div>
          </div>
      ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="order-2 md:order-1 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center pt-8 mt-4 relative transition-all hover:-translate-y-1 duration-300">
                     <div className="absolute -top-4 w-8 h-8 bg-slate-200 dark:bg-slate-600 rounded-full flex items-center justify-center font-bold text-slate-600 dark:text-slate-200 shadow-sm border-4 border-white dark:border-slate-800">2</div>
                     {topEmployees[1] ? (
                         <>
                            <img src={topEmployees[1].avatar} alt={topEmployees[1].name} className="w-20 h-20 rounded-full mb-3 border-4 border-white dark:border-slate-700 shadow-md object-cover" />
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">{topEmployees[1].name}</h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mb-2">{topEmployees[1].position}</span>
                            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{topEmployees[1].score}</div>
                            <span className="text-xs text-slate-400">نقطة</span>
                         </>
                     ) : <div className="text-slate-300 py-10">شاغر</div>}
                </div>
                <div className="order-1 md:order-2 bg-gradient-to-b from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-800 p-6 rounded-[2.5rem] shadow-lg border border-blue-400 dark:border-blue-700 flex flex-col items-center relative transform -translate-y-4 hover:-translate-y-5 transition-transform duration-300">
                     <div className="absolute -top-6 text-yellow-300 drop-shadow-lg">
                         <Trophy size={48} fill="currentColor" />
                     </div>
                     {topEmployees[0] ? (
                         <>
                            <img src={topEmployees[0].avatar} alt={topEmployees[0].name} className="w-24 h-24 rounded-full mb-3 border-4 border-white/30 shadow-inner mt-6 object-cover" />
                            <h3 className="font-bold text-white text-lg">{topEmployees[0].name}</h3>
                            <span className="text-xs text-blue-100 mb-2">{topEmployees[0].position}</span>
                            <div className="text-3xl font-black text-white">{topEmployees[0].score}</div>
                            <span className="text-xs text-blue-100">نقطة</span>
                         </>
                     ) : <div className="text-white/30 py-12">لا توجد بيانات</div>}
                </div>
                <div className="order-3 bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center pt-8 mt-4 relative transition-all hover:-translate-y-1 duration-300">
                     <div className="absolute -top-4 w-8 h-8 bg-amber-700/20 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 rounded-full flex items-center justify-center font-bold shadow-sm border-4 border-white dark:border-slate-800">3</div>
                     {topEmployees[2] ? (
                         <>
                            <img src={topEmployees[2].avatar} alt={topEmployees[2].name} className="w-20 h-20 rounded-full mb-3 border-4 border-white dark:border-slate-700 shadow-md object-cover" />
                            <h3 className="font-bold text-slate-800 dark:text-slate-100">{topEmployees[2].name}</h3>
                            <span className="text-xs text-slate-500 dark:text-slate-400 mb-2">{topEmployees[2].position}</span>
                            <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{topEmployees[2].score}</div>
                            <span className="text-xs text-slate-400">نقطة</span>
                         </>
                     ) : <div className="text-slate-300 py-10">شاغر</div>}
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'إجمالي الموظفين', val: totalEmployees, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'حالات التأخير', val: totalLate, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/20' },
                    { label: 'حالات الغياب', val: totalAbsent, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-900/20' },
                    { label: 'نسبة الالتزام', val: `${commitmentRate}%`, icon: CalendarCheck, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' }
                ].map((item, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-center gap-4 hover:scale-[1.02] transition-transform duration-200">
                        <div className={`p-3 rounded-lg ${item.bg} ${item.color}`}>
                            <item.icon size={24} />
                        </div>
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{item.val}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 lg:col-span-2">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-6">ترتيب الموظفين لشهر {MONTHS[selectedMonth].label}</h3>
                    {chartData.length > 0 ? (
                    <div className="h-64 w-full min-w-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:opacity-10" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                                <Tooltip cursor={{ fill: '#64748b', opacity: 0.1 }} content={<CustomTooltip />} />
                                <Bar dataKey="score" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} animationDuration={1500} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    ) : <div className="h-64 flex items-center justify-center text-slate-400 border border-dashed rounded-xl">لا توجد سجلات</div>}
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-6">توزيع الحالات</h3>
                    {activeRecords.length > 0 ? (
                        <>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" animationDuration={1500}>
                                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex justify-center gap-4 text-xs text-slate-500 mt-2">
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> ملتزم</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500"></div> تأخير</div>
                                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> غياب</div>
                            </div>
                        </>
                    ) : <div className="h-64 flex items-center justify-center text-slate-400 border border-dashed rounded-xl">لا توجد بيانات</div>}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                     <h3 className="font-bold text-slate-800 dark:text-white">جدول أداء الموظفين - {MONTHS[selectedMonth].label}</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-right text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-medium">
                            <tr>
                                <th className="p-3">#</th>
                                <th className="p-3">الموظف</th>
                                <th className="p-3">الفرع</th>
                                <th className="p-3">النقاط</th>
                                <th className="p-3">التأخير</th>
                                <th className="p-3">غياب</th>
                                <th className="p-3">إضافي صافي</th>
                                <th className="p-3 text-center">التزام</th>
                                <th className="p-3 text-center">إضافي</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {ranking.map((row) => {
                                const emp = employees.find(e => e.id === row.employeeId);
                                return (
                                <tr key={row.employeeId} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="p-3"><span className="font-bold text-slate-400">#{row.rank}</span></td>
                                    <td className="p-3 flex items-center gap-2">
                                        <img src={row.avatar} className="w-8 h-8 rounded-full object-cover" alt="" />
                                        <div className="font-bold text-slate-800 dark:text-white">{row.name}</div>
                                    </td>
                                    <td className="p-3">
                                        {emp?.branch === 'factory' ? 
                                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-1 rounded-full font-bold">المصنع</span> : 
                                            <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-bold">المكتب</span>
                                        }
                                    </td>
                                    <td className="p-3 font-bold text-blue-600">{row.score}</td>
                                    <td className="p-3 text-red-600">{minutesToTime(row.totalDelay)}</td>
                                    <td className="p-3 text-red-800 font-bold">{row.unexcusedAbsences}</td>
                                    <td className="p-3 text-emerald-600 font-bold">{minutesToTime(row.totalNetOvertime)}</td>
                                    <td className="p-3 text-center">
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[50px] mx-auto overflow-hidden">
                                            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${row.commitmentScore}%` }}></div>
                                        </div>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 max-w-[50px] mx-auto overflow-hidden">
                                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${row.overtimeScore}%` }}></div>
                                        </div>
                                    </td>
                                </tr>
                            )})}
                        </tbody>
                    </table>
                </div>
            </div>
          </>
      )}
    </div>
  );
};

export default Dashboard;
