
import { AttendanceRecord, DailyStats, Employee, EmployeeScore, AppConfig, UserRole } from './types';
import { DEFAULT_CONFIG } from './constants';

// Permissions Logic
export const Permissions = {
    // Update: Allow office_manager to manage users (restricted to their branch inside the component)
    canManageUsers: (role: UserRole) => role === 'general_manager' || role === 'owner' || role === 'office_manager',
    canManageSettings: (role: UserRole) => role === 'general_manager' || role === 'owner',
    canViewAllReports: (role: UserRole) => role !== 'employee',
    canViewAllDashboard: (role: UserRole) => role !== 'employee',
    canEditAttendance: (role: UserRole) => role === 'general_manager' || role === 'office_manager',
    isOwner: (role: UserRole) => role === 'owner',
    canAccessBiometricDevice: (role: UserRole) => role !== 'owner',
    canViewLogs: (role: UserRole) => role === 'general_manager' || role === 'owner',
};

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

export const formatTime12H = (time24?: string): string => {
  if (!time24) return '--:--';
  const [h, m] = time24.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m.toString().padStart(2, '0')} ${suffix}`;
};

// --- GEOLOCATION UTILS ---
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c); 
};

const checkIsHoliday = (dateStr: string, config: AppConfig): boolean => {
    if (!config.holidays || config.holidays.length === 0) return false;
    return config.holidays.some(holiday => {
        const d = new Date(dateStr);
        const start = new Date(holiday.startDate);
        const end = new Date(holiday.endDate);
        d.setHours(0,0,0,0);
        start.setHours(0,0,0,0);
        end.setHours(0,0,0,0);
        return d >= start && d <= end;
    });
};

// --- UPDATED STATS CALCULATION TO SUPPORT BRANCHES ---
export const calculateDailyStats = (dateStr: string, config: AppConfig, record?: AttendanceRecord, employee?: Employee): DailyStats => {
  const dateObj = new Date(dateStr);
  const dayOfWeek = dateObj.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

  // Fallback if config structure is old/missing (safety check)
  const safeConfig = config || DEFAULT_CONFIG;
  const officeConfig = safeConfig.office || DEFAULT_CONFIG.office;
  const factoryConfig = safeConfig.factory || DEFAULT_CONFIG.factory;

  // Determine which branch settings to use
  // Default to office if employee branch is undefined
  const branchSettings = (employee?.branch === 'factory') ? factoryConfig : officeConfig;

  // Check if today is a weekend for this specific branch
  const isWeekend = branchSettings.weekendDays ? branchSettings.weekendDays.includes(dayOfWeek) : (dayOfWeek === 5); // Fallback to Fri
  const isOfficialHoliday = checkIsHoliday(dateStr, safeConfig);
  // NEW: Treat 'leave' status with attendance as a holiday (work on vacation)
  const isManualLeave = record?.status === 'leave';
  
  const isHoliday = isWeekend || isOfficialHoliday || isManualLeave;
  
  const defaultStats: DailyStats = {
    record: record || null,
    date: dateStr,
    isFriday: isWeekend, // Mapping 'isFriday' prop to 'isWeekend' logic
    isOfficialHoliday,
    delayMinutes: 0,
    overtimeMinutes: 0,
    netOvertimeMinutes: 0,
    workingHours: 0,
    statusLabel: isOfficialHoliday ? 'إجازة رسمية' : (isWeekend ? 'إجازة أسبوعية' : (record ? '' : 'غياب')),
    colorClass: isOfficialHoliday ? 'bg-purple-50 border-purple-200 text-purple-700' : (isWeekend ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-red-50 border-red-200 text-red-700'),
    earlyDepartureMinutes: 0
  };

  if (record?.status === 'under_review') {
      defaultStats.statusLabel = 'تحت المراجعة';
      defaultStats.colorClass = 'bg-gray-100 border-gray-300 text-gray-500 border-dashed';
      return defaultStats;
  }

  if (record?.status === 'absent_penalty') {
      defaultStats.statusLabel = 'غياب بدون إذن';
      defaultStats.colorClass = 'bg-red-100 border-red-400 text-red-900 font-bold';
      return defaultStats;
  }

  if (!record || !record.checkIn || !record.checkOut) {
    if (record?.status === 'leave') {
        defaultStats.statusLabel = 'إجازة';
        defaultStats.colorClass = 'bg-orange-50 border-orange-200 text-orange-700';
    }
    return defaultStats;
  }

  const checkInMin = timeToMinutes(record.checkIn);
  let checkOutMin = timeToMinutes(record.checkOut);
  
  // Use Branch Specific Times
  const workStartMin = timeToMinutes(branchSettings.workStartTime);
  const workEndMin = timeToMinutes(branchSettings.workEndTime);

  if (checkOutMin < checkInMin) {
      checkOutMin += 1440;
  }

  let delay = 0;
  let rawOvertime = 0;
  let netOvertime = 0;
  let earlyDepartureDeduction = 0;
  let earlyDeparture = 0;

  const workedMinutes = checkOutMin - checkInMin;

  if (isHoliday) {
    rawOvertime = workedMinutes;
    netOvertime = workedMinutes;
    
    // Customize label based on holiday type
    if (isManualLeave) {
        defaultStats.statusLabel = 'عمل بإجازة (إضافي)';
    } else {
        defaultStats.statusLabel = isOfficialHoliday ? 'عمل بإجازة رسمية (إضافي)' : 'عمل بعطلة (إضافي)';
    }
    defaultStats.colorClass = 'bg-indigo-50 border-indigo-200 text-indigo-700';
  } else {
    const gracePeriod = safeConfig.gracePeriodMinutes || 0;
    let actualDelay = 0;
    
    // 1. Check Entry
    if (checkInMin > workStartMin) {
        actualDelay = checkInMin - workStartMin;
        if (actualDelay > gracePeriod) {
            delay = actualDelay;
        }
    } else {
        // Early Arrival
        rawOvertime += (workStartMin - checkInMin);
    }

    // 2. Check Exit
    if (checkOutMin > workEndMin) {
        // Late Departure
        rawOvertime += (checkOutMin - workEndMin);
    } else if (checkOutMin < workEndMin) {
        // Early Departure
        earlyDeparture = workEndMin - checkOutMin;
        if (!record.earlyDeparturePermission) {
            earlyDepartureDeduction = earlyDeparture;
        }
    }
    
    // 3. Net Calculation
    let delayPenalty = 0;
    if (delay > 0) {
        delayPenalty = Math.max(0, delay - gracePeriod);
    }

    netOvertime = Math.max(0, rawOvertime - delayPenalty - earlyDepartureDeduction);

    if (record.status === 'absent') {
        defaultStats.statusLabel = 'غياب';
        defaultStats.colorClass = 'bg-red-100 border-red-300 text-red-800';
    } else if (delay > 0) {
        defaultStats.statusLabel = 'تأخير';
        defaultStats.colorClass = 'bg-yellow-50 border-yellow-200 text-yellow-700';
    } else if (earlyDeparture > 0 && !record.earlyDeparturePermission) {
         defaultStats.statusLabel = 'انصراف مبكر';
         defaultStats.colorClass = 'bg-orange-50 border-orange-200 text-orange-700';
    } else {
        defaultStats.statusLabel = 'ملتزم';
        defaultStats.colorClass = 'bg-emerald-50 border-emerald-200 text-emerald-700';
    }
  }

  return {
    ...defaultStats,
    delayMinutes: delay,
    overtimeMinutes: rawOvertime,
    netOvertimeMinutes: netOvertime,
    workingHours: workedMinutes,
    earlyDepartureMinutes: earlyDepartureDeduction
  };
};

export const calculateRanking = (employees: Employee[], records: AttendanceRecord[], config: AppConfig): EmployeeScore[] => {
  const rankableEmployees = employees.filter(e => 
    e.role !== 'owner' && 
    e.role !== 'general_manager' && 
    e.role !== 'manager' &&
    e.role !== 'office_manager'
  );

  const processedStats = rankableEmployees.map(emp => {
      const empRecords = records.filter(r => r.employeeId === emp.id);
      let totalDelay = 0;
      let totalNetOvertime = 0;
      let totalRawOvertime = 0;
      let daysPresent = 0;
      let unexcusedAbsences = 0;
      let authorizedLeaves = 0;
      let totalActualWorkMinutes = 0; 
      let totalWorkingDays = 0;

      empRecords.forEach(r => {
          // Pass 'emp' to calculateDailyStats
          const stats = calculateDailyStats(r.date, config, r, emp);
          
          if (stats.record?.status === 'under_review') return;

          totalDelay += stats.delayMinutes;
          totalNetOvertime += stats.netOvertimeMinutes;
          totalRawOvertime += stats.overtimeMinutes;
          totalActualWorkMinutes += stats.workingHours;
          
          // Use updated stats.isFriday (which now represents Weekend logic)
          if (!stats.isFriday && !stats.isOfficialHoliday) {
               totalWorkingDays++;
               if (r.status === 'absent_penalty') unexcusedAbsences++;
               else if (r.status === 'leave') authorizedLeaves++;
               else if (r.checkIn || r.status === 'present' || r.status === 'late') daysPresent++;
          }
      });
      totalWorkingDays = totalWorkingDays || 1;

      return {
          emp,
          totalDelay,
          totalNetOvertime,
          totalRawOvertime,
          totalActualWorkMinutes,
          daysPresent,
          unexcusedAbsences,
          authorizedLeaves,
          totalWorkingDays
      };
  });

  const maxNetOvertime = Math.max(...processedStats.map(s => s.totalNetOvertime), 1);
  const maxWorkMinutes = Math.max(...processedStats.map(s => s.totalActualWorkMinutes), 1);
  const maxDaysPresent = Math.max(...processedStats.map(s => s.daysPresent), 1);

  const scores: EmployeeScore[] = processedStats.map(stats => {
      const overtimeScore = (stats.totalNetOvertime / maxNetOvertime) * 80;
      const commitmentScore = (stats.totalActualWorkMinutes / maxWorkMinutes) * 10;
      const absenceScore = (stats.daysPresent / maxDaysPresent) * 10;
      const manualPenalty = stats.unexcusedAbsences * (config.penaltyValue || 0);

      let rawScore = (overtimeScore + commitmentScore + absenceScore) - manualPenalty;
      let finalScore = Math.min(100, Math.max(0, Math.round(rawScore)));

      const uiCommitmentPercent = (commitmentScore / 10) * 100;
      const uiOvertimePercent = (overtimeScore / 80) * 100;
      const uiAbsencePercent = (absenceScore / 10) * 100;

      return {
        employeeId: stats.emp.id,
        name: stats.emp.name,
        avatar: stats.emp.avatar,
        position: stats.emp.position,
        score: finalScore,
        commitmentScore: Math.round(uiCommitmentPercent),
        overtimeScore: Math.round(uiOvertimePercent),
        absenceScore: Math.round(uiAbsencePercent),
        totalNetOvertime: stats.totalNetOvertime,
        totalRawOvertime: stats.totalRawOvertime,
        totalDelay: stats.totalDelay,
        unexcusedAbsences: stats.unexcusedAbsences,
        penaltyPoints: manualPenalty,
        rank: 0,
        pointsToNextRank: 0,
        pointsToFirst: 0
      };
  });

  scores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.totalNetOvertime - a.totalNetOvertime;
  });
  
  const firstPlaceScore = scores.length > 0 ? scores[0].score : 0;
  
  scores.forEach((s, idx) => {
      s.rank = idx + 1;
      if (idx > 0) {
          s.pointsToNextRank = scores[idx - 1].score - s.score + 1;
      }
      if (idx > 0) {
          s.pointsToFirst = firstPlaceScore - s.score + 1;
      }
  });
  
  return scores;
};

export const generatePerformanceReview = (scoreData: EmployeeScore): string => {
    const parts = [];
    if (scoreData.rank === 1) {
        parts.push("حقق الموظف أداءً استثنائيًا وتصدر قائمة الترتيب العام،");
    } else if (scoreData.score >= 90) {
        parts.push(`حصل الموظف على ${scoreData.score} نقطة وهو معدل ممتاز،`);
    } else {
        parts.push(`حصل الموظف على ${scoreData.score} نقطة،`);
    }

    if (scoreData.overtimeScore >= 95) {
        parts.push("وذلك بفضل تحقيقه أعلى معدلات ساعات العمل الإضافي في الشركة،");
    } else if (scoreData.overtimeScore >= 70) {
        parts.push("مع تحقيقه معدل ساعات إضافية جيد مقارنة بالأعلى أداءً،");
    } else if (scoreData.overtimeScore >= 40) {
        parts.push("حيث كان معدل الساعات الإضافية متوسطاً مقارنةً بأعلى موظف في الشركة،");
    } else {
        parts.push("حيث تأثر التقييم بشكل رئيسي بانخفاض عدد ساعات العمل الإضافي مقارنةً بالموظف الأعلى إنتاجية،");
    }

    if (scoreData.unexcusedAbsences > 0) {
        parts.push(`كما أثر وجود ${scoreData.unexcusedAbsences} يوم غياب بدون إذن سلبًا على النتيجة النهائية`);
        if (scoreData.penaltyPoints > 0) parts.push(`(وتم تطبيق خصم ${scoreData.penaltyPoints} نقطة كجزاء)`);
        parts.push("،");
    } else if (scoreData.absenceScore >= 98) {
        parts.push("مع التزام تام بالحضور وعدم تسجيل أي حالات غياب،");
    }

    if (scoreData.totalDelay > 60) {
        parts.push("إلا أنه لوحظ وجود تأخيرات متكررة أثرت جزئياً على درجة الالتزام.");
    } else if (scoreData.totalDelay > 0) {
        parts.push("مع وجود بعض دقائق التأخير البسيطة.");
    } else {
        parts.push("وبالتزام ممتاز بالمواعيد.");
    }

    let result = parts.join(" ");
    if (result.endsWith("،")) result = result.slice(0, -1) + ".";
    return result;
};

export const getMonthDates = (year: number, month: number): string[] => {
    const date = new Date(year, month, 1);
    const dates = [];
    while (date.getMonth() === month) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        dates.push(`${y}-${m}-${d}`);
        date.setDate(date.getDate() + 1);
    }
    return dates;
};
