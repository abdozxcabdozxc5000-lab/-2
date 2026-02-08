
import React, { useRef, useEffect, useState } from 'react';
import { calculateDailyStats, formatTime12H, getMonthDates } from '../utils';
import { AttendanceRecord, Employee, AppConfig } from '../types';
import { Image as ImageIcon, X } from 'lucide-react';

interface SmartCalendarProps {
  employee: Employee;
  records: AttendanceRecord[];
  config: AppConfig;
  onEditDay: (date: string, record: AttendanceRecord | undefined) => void;
  readOnly?: boolean;
  lastFocusedDate?: string | null;
  selectedMonth: number;
  selectedYear: number;
}

const SmartCalendar: React.FC<SmartCalendarProps> = ({ 
  employee, records, config, onEditDay, readOnly, lastFocusedDate, 
  selectedMonth, selectedYear 
}) => {
  const dates = getMonthDates(selectedYear, selectedMonth);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    dayRefs.current = dayRefs.current.slice(0, dates.length);
  }, [dates]);

  useEffect(() => {
      if (lastFocusedDate) {
          const index = dates.indexOf(lastFocusedDate);
          if (index !== -1 && dayRefs.current[index]) {
               setTimeout(() => {
                   dayRefs.current[index]?.focus();
               }, 100);
          }
      }
  }, [lastFocusedDate, dates]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number, date: string, record: AttendanceRecord | undefined) => {
      if (readOnly) return;

      const total = dates.length;
      let nextIndex: number | null = null;

      switch (e.key) {
          case 'ArrowLeft':
              nextIndex = index + 1;
              break;
          case 'ArrowRight':
              nextIndex = index - 1;
              break;
          case 'ArrowDown':
              nextIndex = index + 4; 
              break;
          case 'ArrowUp':
              nextIndex = index - 4;
              break;
          case 'Enter':
              e.preventDefault();
              onEditDay(date, record);
              return;
          default:
              return;
      }

      if (nextIndex !== null && nextIndex >= 0 && nextIndex < total) {
          e.preventDefault();
          dayRefs.current[nextIndex]?.focus();
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {employee && (
        <div className="flex items-center gap-4 mb-4">
            <img src={employee.avatar} className="w-16 h-16 rounded-full border-2 border-white dark:border-slate-700 shadow object-cover" alt={employee.name} />
            <div>
            <h3 className="text-xl font-bold text-slate-800 dark:text-white">{employee.name}</h3>
            <p className="text-slate-500 dark:text-slate-400">{employee.position}</p>
            </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {dates.map((date, idx) => {
          const record = records.find(r => r.date === date);
          const stats = calculateDailyStats(date, config, record, employee);
          const dayName = new Date(date).toLocaleDateString('ar-EG', { weekday: 'long' });
          const dayNumber = new Date(date).getDate();

          return (
            <div 
              key={date}
              ref={el => { dayRefs.current[idx] = el }}
              tabIndex={!readOnly ? 0 : -1}
              onKeyDown={(e) => handleKeyDown(e, idx, date, record)}
              className={`
                relative p-4 rounded-xl border transition-all duration-300 group animate-scale-in outline-none
                ${stats.colorClass} dark:bg-opacity-10 dark:border-opacity-30
                ${!readOnly ? 'cursor-pointer hover:shadow-md hover:-translate-y-1 focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500' : 'opacity-90'}
              `}
              onClick={() => !readOnly && onEditDay(date, record)}
            >
              <div className="flex justify-between items-start mb-3">
                 <div className="flex flex-col">
                    <span className="text-2xl font-bold opacity-80 dark:text-slate-200">{dayNumber}</span>
                    <span className="text-xs opacity-60 dark:text-slate-300">{dayName}</span>
                 </div>
                 <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold mix-blend-multiply dark:mix-blend-normal bg-white/50 dark:bg-white/10 shadow-sm`}>
                        {stats.statusLabel}
                    </span>
                    {record?.photo && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); setPreviewPhoto(record.photo!); }}
                            className="p-1 bg-white dark:bg-slate-700 rounded-lg text-blue-500 hover:scale-110 transition-transform shadow-sm"
                            title="عرض صورة التحقق"
                        >
                            <ImageIcon size={14} />
                        </button>
                    )}
                 </div>
              </div>

              <div className="space-y-2 text-sm dark:text-slate-200">
                 <div className="flex justify-between">
                    <span className="opacity-70 text-[11px]">دخول:</span>
                    <span className="font-semibold dir-ltr">{formatTime12H(record?.checkIn)}</span>
                 </div>
                 <div className="flex justify-between">
                    <span className="opacity-70 text-[11px]">خروج:</span>
                    <span className="font-semibold dir-ltr">{formatTime12H(record?.checkOut)}</span>
                 </div>
                 {stats.delayMinutes > 0 && <div className="flex justify-between text-amber-700 dark:text-amber-400 font-medium text-xs"><span>تأخير:</span><span>{stats.delayMinutes} د</span></div>}
                 {stats.netOvertimeMinutes > 0 && <div className="flex justify-between text-indigo-700 dark:text-indigo-300 font-medium border-t border-indigo-200/50 pt-1 mt-1 text-xs"><span>إضافي:</span><span>{stats.netOvertimeMinutes} د</span></div>}
              </div>
            </div>
          );
        })}
      </div>

      {previewPhoto && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setPreviewPhoto(null)}>
              <div className="relative bg-white dark:bg-slate-800 p-2 rounded-2xl max-w-lg w-full shadow-2xl animate-scale-in" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setPreviewPhoto(null)} className="absolute -top-3 -left-3 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors">
                      <X size={20} />
                  </button>
                  <img src={previewPhoto} className="w-full h-auto rounded-xl" alt="Verification" />
                  <p className="text-center p-3 text-sm text-slate-500 font-bold">صورة تحقق الحضور من موقع العمل</p>
              </div>
          </div>
      )}
    </div>
  );
};

export default SmartCalendar;
