import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Employee, AttendanceRecord, AppConfig, UserRole } from '../types';
import SmartCalendar from './SmartCalendar';
import { ArrowRight, Search, Trash2, Calendar, X, AlertTriangle, FileText, Users, Building, Factory, Clock } from 'lucide-react';
import { Permissions, getMonthDates } from '../utils';

const MONTHS = [
    { value: 0, label: 'يناير' }, { value: 1, label: 'فبراير' }, { value: 2, label: 'مارس' },
    { value: 3, label: 'أبريل' }, { value: 4, label: 'مايو' }, { value: 5, label: 'يونيو' },
    { value: 6, label: 'يوليو' }, { value: 7, label: 'أغسطس' }, { value: 8, label: 'سبتمبر' },
    { value: 9, label: 'أكتوبر' }, { value: 10, label: 'نوفمبر' }, { value: 11, label: 'ديسمبر' }
];

const YEARS = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

interface EmployeeManagerProps {
  employees: Employee[];
  attendanceRecords: AttendanceRecord[];
  config: AppConfig;
  userRole: UserRole;
  onUpdateRecord: (record: AttendanceRecord) => void;
  onDeleteRecord?: (id: string) => void;
}

const EmployeeManager: React.FC<EmployeeManagerProps> = ({ employees, attendanceRecords, config, userRole, onUpdateRecord, onDeleteRecord }) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<'all' | 'office' | 'factory'>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [lastFocusedDate, setLastFocusedDate] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // State
  const [editForm, setEditForm] = useState<{ 
      id?: string; 
      checkIn: string; 
      checkOut: string; 
      checkOutDate: string; 
      status: string; 
      earlyPermission: boolean;
      note: string;
  }>({
      checkIn: '', checkOut: '', checkOutDate: '', status: 'present', earlyPermission: false, note: ''
  });

  useEffect(() => {
    if (userRole === 'office_manager') {
        setSelectedBranch('office');
    }
  }, [userRole]);

  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null); 

  useEffect(() => {
      if (editingDate && checkInRef.current) {
          setTimeout(() => {
              checkInRef.current?.focus();
          }, 100);
      }
  }, [editingDate]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (userRole === 'office_manager') {
            return matchesSearch && e.branch === 'office';
        }

        const matchesBranch = selectedBranch === 'all' || e.branch === selectedBranch;
        return matchesSearch && matchesBranch;
    });
  }, [employees, searchTerm, selectedBranch, userRole]);

  const handleDayClick = (date: string, record: AttendanceRecord | undefined) => {
      setLastFocusedDate(null);
      setShowDeleteConfirm(false);
      setEditingDate(date);
      setEditForm({
          id: record?.id,
          checkIn: record?.checkIn || '',
          checkOut: record?.checkOut || '',
          checkOutDate: record?.checkOutDate || date, 
          status: record?.status || 'present',
          earlyPermission: record?.earlyDeparturePermission || false,
          note: record?.note || '' 
      });
  };

  const handleSave = () => {
      if (!selectedEmployee || !editingDate) return;

      const newRecord: AttendanceRecord = {
          id: editForm.id || `${selectedEmployee.id}-${editingDate}`,
          employeeId: selectedEmployee.id,
          date: editingDate,
          checkIn: editForm.checkIn.trim() || undefined,
          checkOut: editForm.checkOut.trim() || undefined,
          checkOutDate: editForm.checkOutDate || editingDate, 
          status: editForm.status as any,
          earlyDeparturePermission: editForm.earlyPermission,
          note: editForm.note.trim() || undefined 
      };

      onUpdateRecord(newRecord);
      
      const dates = getMonthDates(selectedYear, selectedMonth);
      const currentIndex = dates.indexOf(editingDate);
      if (currentIndex !== -1 && currentIndex < dates.length - 1) {
          const nextDate = dates[currentIndex + 1];
          setLastFocusedDate(nextDate);
      } else {
          setLastFocusedDate(editingDate);
      }

      setEditingDate(null);
  };

  const handleConfirmDelete = () => {
      if (editForm.id && onDeleteRecord) {
          onDeleteRecord(editForm.id);
          setEditingDate(null);
          setShowDeleteConfirm(false);
          setLastFocusedDate(editingDate);
      }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent, field: 'checkIn' | 'checkOut' | 'note') => {
      if (field === 'note' && e.shiftKey && e.key === 'Enter') return;

      if (e.key === 'Enter') {
          e.preventDefault();
          if (field === 'checkIn') {
              checkOutRef.current?.focus();
          } else if (field === 'checkOut') {
              noteRef.current?.focus();
          } else if (field === 'note') {
              handleSave();
          }
      }
  };

  const noteLabel = (editForm.status === 'leave' || editForm.status === 'absent' || editForm.status === 'absent_penalty') 
    ? 'سبب الإجازة / الغياب' 
    : 'ملاحظات إضافية';

  if (selectedEmployee) {
    const employeeRecords = attendanceRecords.filter(r => r.employeeId === selectedEmployee.id);
    const canEdit = Permissions.canEditAttendance(userRole);

    return (
      <div className="animate-slide-in-right">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <button 
                onClick={() => setSelectedEmployee(null)}
                className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors"
            >
                <ArrowRight size={20} />
                عودة للقائمة
            </button>

            <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <Calendar size={18} className="text-blue-500 mr-2" />
                <select 
                    value={selectedMonth} 
                    onChange={e => setSelectedMonth(parseInt(e.target.value))}
                    className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                    {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select 
                    value={selectedYear} 
                    onChange={e => setSelectedYear(parseInt(e.target.value))}
                    className="bg-transparent text-sm font-bold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
                >
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
            </div>
        </div>

        <SmartCalendar 
            employee={selectedEmployee} 
            records={employeeRecords} 
            config={config} 
            onEditDay={handleDayClick}
            readOnly={!canEdit}
            lastFocusedDate={lastFocusedDate}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
        />

        {editingDate && canEdit && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in border border-slate-100 dark:border-slate-700 max-h-[90vh] overflow-y-auto">
                    
                    {!showDeleteConfirm ? (
                        <div className="animate-fade-in">
                            <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                                <div>
                                    <h3 className="text-lg font-black text-slate-800 dark:text-white">تعديل سجل {new Date(editingDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'numeric', year: 'numeric' })}</h3>
                                    {editForm.id && (
                                        <button 
                                            onClick={() => setShowDeleteConfirm(true)}
                                            className="text-red-500 text-[11px] font-bold hover:text-red-600 mt-1 flex items-center gap-1 transition-colors"
                                        >
                                            <Trash2 size={12} /> حذف السجل بالكامل
                                        </button>
                                    )}
                                </div>
                                <button onClick={() => setEditingDate(null)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                                            <Clock size={10} /> وقت الحضور
                                        </label>
                                        <input 
                                            ref={checkInRef}
                                            type="time" 
                                            value={editForm.checkIn}
                                            onChange={e => setEditForm({...editForm, checkIn: e.target.value})}
                                            onKeyDown={e => handleInputKeyDown(e, 'checkIn')}
                                            style={{ direction: 'ltr' }}
                                            className="w-full bg-transparent outline-none dark:text-white font-mono text-xl font-bold"
                                        />
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                                            <Clock size={10} /> وقت الانصراف
                                        </label>
                                        <input 
                                            ref={checkOutRef}
                                            type="time" 
                                            value={editForm.checkOut}
                                            onChange={e => setEditForm({...editForm, checkOut: e.target.value})}
                                            onKeyDown={e => handleInputKeyDown(e, 'checkOut')}
                                            style={{ direction: 'ltr' }}
                                            className="w-full bg-transparent outline-none dark:text-white font-mono text-xl font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                                    <label className="block text-[10px] font-black text-blue-600 dark:text-blue-400 mb-1 flex items-center gap-1">
                                        <Calendar size={10} /> تاريخ الانصراف (هام للورديات الليلية)
                                    </label>
                                    <input 
                                        type="date"
                                        value={editForm.checkOutDate}
                                        onChange={e => setEditForm({...editForm, checkOutDate: e.target.value})}
                                        className="w-full bg-transparent outline-none dark:text-white font-bold text-sm"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-500 dark:text-slate-400 mb-1.5">الحالة الإدارية</label>
                                    <select 
                                        value={editForm.status}
                                        onChange={e => setEditForm({...editForm, status: e.target.value})}
                                        className="w-full p-3.5 border-2 border-slate-100 rounded-xl outline-none focus:border-blue-500 dark:bg-slate-900 dark:border-slate-700 dark:text-white font-bold text-sm transition-all appearance-none"
                                    >
                                        <option value="present">حضور (ملتزم)</option>
                                        <option value="absent">غياب (بإذن)</option>
                                        <option value="late">تأخير</option>
                                        <option value="leave">إجازة سنوية/مرضية</option>
                                        <option value="absent_penalty">غياب بدون إذن</option>
                                        <option value="under_review">تحت المراجعة</option>
                                    </select>
                                </div>

                                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                                    <input 
                                        type="checkbox" id="earlyPerm"
                                        checked={editForm.earlyPermission}
                                        onChange={e => setEditForm({...editForm, earlyPermission: e.target.checked})}
                                        className="w-5 h-5 text-blue-600 rounded-lg focus:ring-blue-500 cursor-pointer"
                                    />
                                    <label htmlFor="earlyPerm" className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">إذن انصراف مبكر (تجاوز الخصم)</label>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 mb-1.5 mr-1 flex items-center gap-1">
                                        <FileText size={12} /> {noteLabel}
                                    </label>
                                    <textarea
                                        ref={noteRef}
                                        rows={2}
                                        value={editForm.note}
                                        onChange={e => setEditForm({...editForm, note: e.target.value})}
                                        onKeyDown={e => handleInputKeyDown(e, 'note')}
                                        placeholder={editForm.status === 'leave' ? 'اكتب سبب الإجازة هنا...' : 'اكتب أي ملاحظات إضافية هنا...'}
                                        className="w-full p-3 border-2 border-slate-100 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm transition-all resize-none"
                                    />
                                </div>

                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 transition-all">حفظ البيانات</button>
                                <button onClick={() => setEditingDate(null)} className="flex-1 bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all">إلغاء</button>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-scale-in py-4 text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">تأكيد المسح النهائى</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed px-2">
                                هل أنت متأكد من مسح جميع بيانات الحضور والانصراف لهذا اليوم؟ <br/>
                                <span className="font-black text-red-500">(هذا الإجراء سيؤثر على نقاط الموظف)</span>
                            </p>
                            
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={handleConfirmDelete} 
                                    className="w-full bg-red-600 text-white py-4 rounded-2xl font-black hover:bg-red-700 shadow-xl shadow-red-500/20 active:scale-95 transition-all"
                                >
                                    نعم، قم بمسح السجل
                                </button>
                                <button 
                                    onClick={() => setShowDeleteConfirm(false)} 
                                    className="w-full bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 py-4 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                                >
                                    تراجع، العودة للتعديل
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>
    );
};

export default EmployeeManager;