
import { Employee, AttendanceRecord, AppConfig } from './types';

// System Constants
export const DB_VERSION = 4; 
export const DEFAULT_GRACE_PERIOD = 15; 
export const WEIGHT_COMMITMENT = 0.1;
export const WEIGHT_OVERTIME = 0.8;
export const WEIGHT_ABSENCE = 0.1;
export const DEFAULT_PENALTY_VALUE = 5;

// Default Settings Constants
export const WORK_START_TIME = "09:00";
export const WORK_END_TIME = "17:00";
export const DEFAULT_LAT = 30.0444;
export const DEFAULT_LNG = 31.2357;
export const DEFAULT_RADIUS = 100;

// Initial Config (Used for seeding)
export const DEFAULT_CONFIG: AppConfig = {
    weightCommitment: WEIGHT_COMMITMENT,
    weightOvertime: WEIGHT_OVERTIME,
    weightAbsence: WEIGHT_ABSENCE,
    holidays: [],
    office: {
        workStartTime: WORK_START_TIME,
        workEndTime: WORK_END_TIME,
        locationEnabled: false,
        lat: DEFAULT_LAT,
        lng: DEFAULT_LNG,
        radius: DEFAULT_RADIUS,
        weekendDays: [5, 6], // Friday and Saturday
        payrollDaysBase: 30, 
        payrollHoursBase: 8,
        gracePeriodMinutes: 30, // Office Specific Default
        penaltyValue: 0         // Office Specific Default
    },
    factory: {
        workStartTime: "08:00",
        workEndTime: "16:00",
        locationEnabled: false,
        lat: DEFAULT_LAT,
        lng: DEFAULT_LNG,
        radius: 200,
        weekendDays: [5], // Friday only
        payrollDaysBase: 30, 
        payrollHoursBase: 9,
        gracePeriodMinutes: 15, // Factory Specific Default
        penaltyValue: 1         // Factory Specific Default
    },
    permissions: {
        financeManage: ['owner', 'general_manager', 'accountant'] // Default roles
    }
};

// Data Seeding
export const INITIAL_EMPLOYEES: Employee[] = [
  { id: '1', name: 'المدير العام (Abdo)', email: 'Abdo@gmail.com', password: 'Abdozxc123@#', role: 'general_manager', position: 'المدير العام', department: 'الإدارة العليا', branch: 'office', joinDate: '2024-01-01', avatar: 'https://ui-avatars.com/api/?name=Abdo&background=0D8ABC&color=fff' },
  { id: '2', name: 'صاحب الشركة', email: 'owner@mowazeb.com', password: '123', role: 'owner', position: 'رئيس مجلس الإدارة', department: 'الإدارة العليا', branch: 'office', joinDate: '2021-01-01', avatar: 'https://ui-avatars.com/api/?name=Owner&background=gold&color=fff' },
  { id: '3', name: 'أحمد محمد', email: 'ahmed@mowazeb.com', password: '123', role: 'employee', position: 'مهندس برمجيات', department: 'تطوير', branch: 'office', joinDate: '2023-01-15', avatar: 'https://picsum.photos/100/100?random=1' },
  { id: '4', name: 'سارة علي', email: 'sara@mowazeb.com', password: '123', role: 'manager', position: 'مديرة موارد بشرية', department: 'إدارة', branch: 'office', joinDate: '2022-05-20', avatar: 'https://picsum.photos/100/100?random=2' },
  { id: '5', name: 'خالد عمر', email: 'khaled@mowazeb.com', password: '123', role: 'accountant', position: 'محاسب', department: 'مالية', branch: 'office', joinDate: '2023-08-01', avatar: 'https://picsum.photos/100/100?random=3' },
  { id: '6', name: 'علي حسن', email: 'ali@factory.com', password: '123', role: 'employee', position: 'فني إنتاج', department: 'الإنتاج', branch: 'factory', joinDate: '2023-09-01', avatar: 'https://picsum.photos/100/100?random=4' },
  { id: '7', name: 'محمود سيد', email: 'mahmoud@factory.com', password: '123', role: 'manager', position: 'مدير المصنع', department: 'الإنتاج', branch: 'factory', joinDate: '2022-01-01', avatar: 'https://picsum.photos/100/100?random=5' },
];

export const generateMockAttendance = (employees: Employee[]): AttendanceRecord[] => {
  const records: AttendanceRecord[] = [];
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  employees.forEach(emp => {
    // Determine weekend based on branch
    const weekendDays = emp.branch === 'factory' ? [5] : [5, 6];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      const isWeekend = weekendDays.includes(dateObj.getDay());
      const dateStr = dateObj.toISOString().split('T')[0];
      const rand = Math.random();
      
      if (isWeekend) {
         if (rand > 0.8) {
             records.push({
                 id: `${emp.id}-${dateStr}`,
                 employeeId: emp.id,
                 date: dateStr,
                 checkIn: "10:00",
                 checkOut: "16:00",
                 status: 'weekend',
                 note: 'عمل إضافي في يوم إجازة'
             });
         }
      } else {
          if (rand > 0.15) {
              const isLate = Math.random() > 0.7;
              // Office starts 9, Factory starts 8 (simplified logic for mock)
              const startHour = emp.branch === 'factory' ? 8 : 9;
              const checkIn = isLate ? `${startHour}:${Math.floor(Math.random() * 59)}` : `${startHour-1}:${Math.floor(Math.random() * 50)}`;
              const isOvertime = Math.random() > 0.6;
              const endHour = emp.branch === 'factory' ? 16 : 17;
              const checkOut = isOvertime ? `${endHour+1}:${Math.floor(Math.random() * 30)}` : `${endHour}:00`;

              records.push({
                  id: `${emp.id}-${dateStr}`,
                  employeeId: emp.id,
                  date: dateStr,
                  checkIn,
                  checkOut,
                  status: isLate ? 'late' : 'present'
              });
          } else {
              const isUnexcused = Math.random() > 0.7; 
              records.push({
                  id: `${emp.id}-${dateStr}`,
                  employeeId: emp.id,
                  date: dateStr,
                  status: isUnexcused ? 'absent_penalty' : 'absent'
              });
          }
      }
    }
  });
  return records;
};
