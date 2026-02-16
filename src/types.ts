
export type UserRole = 'general_manager' | 'owner' | 'manager' | 'office_manager' | 'accountant' | 'employee';

export type EmploymentType = 'factory' | 'office' | 'sales' | 'owner';

export interface Employee {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  position: string;
  department: string;
  branch?: 'office' | 'factory'; 
  joinDate: string;
  avatar: string;
  basicSalary?: number;
  employmentType?: EmploymentType;
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'weekend' | 'leave' | 'absent_penalty' | 'under_review';

export type RecordSource = 'manual' | 'device' | 'app';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; 
  checkIn?: string; 
  checkOut?: string; 
  checkOutDate?: string; 
  status: AttendanceStatus;
  note?: string;
  source?: RecordSource;
  earlyDeparturePermission?: boolean;
  photo?: string; 
  location?: {
      lat: number;
      lng: number;
      inRange: boolean;
      distance: number;
  };
}

export interface Loan {
    id: string;
    employeeId: string;
    totalAmount: number;
    paidAmount: number;
    installmentPerMonth: number;
    startDate: string;
    status: 'active' | 'completed';
}

export interface PayrollRecord {
    id: string;
    employeeId: string;
    month: number;
    year: number;
    basicSalary: number;
    overtimeHours: number;
    overtimeValue: number;
    incentives: number;
    commissions: number;
    bonuses: number;
    absentDays: number;
    absentValue: number;
    penaltyValue: number;
    deductions: number;
    loanDeduction: number;
    insurance: number;
    netSalary: number;
    status: 'draft' | 'paid';
    generatedAt: string;
}

// --- UPDATED FINANCE TYPES ---
export interface CustodyRecord {
    id: string;
    employeeId: string;
    userName: string;
    amount: number;
    description: string;
    type: string; 
    category?: string; 
    paymentMethod?: string; 
    source?: string; 
    receivedDate: string;
    status: 'pending' | 'confirmed';
}

export interface ExpenseRecord {
    id: string;
    employeeId: string;
    userName: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected';
    receiptImageUrl?: string;
}
// -------------------------

export interface DailyStats {
  record: AttendanceRecord | null;
  date: string;
  isFriday: boolean;
  isOfficialHoliday: boolean;
  delayMinutes: number;
  overtimeMinutes: number;
  netOvertimeMinutes: number;
  workingHours: number;
  statusLabel: string;
  colorClass: string;
  earlyDepartureMinutes?: number;
}

export interface EmployeeScore {
  employeeId: string;
  name: string;
  avatar: string;
  position: string;
  score: number;
  commitmentScore: number;
  overtimeScore: number;
  absenceScore: number;
  totalNetOvertime: number;
  totalRawOvertime: number;
  totalDelay: number;
  rank: number;
  unexcusedAbsences: number;
  penaltyPoints: number;
  pointsToNextRank?: number;
  pointsToFirst?: number;
}

export interface Holiday {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface BranchSettings {
    workStartTime: string;
    workEndTime: string;
    locationEnabled: boolean;
    lat: number;
    lng: number;
    radius: number;
    weekendDays: number[];
    payrollDaysBase?: number; 
    payrollHoursBase?: number; 
    gracePeriodMinutes?: number;
    penaltyValue?: number;
}

// New Interface for Permissions
export interface AppPermissions {
    financeManage: UserRole[]; // Roles allowed to add/edit/delete finance items
}

export interface AppConfig {
  weightCommitment: number;
  weightOvertime: number;
  weightAbsence: number;
  holidays: Holiday[];
  office: BranchSettings;
  factory: BranchSettings;
  permissions?: AppPermissions; // Added permissions field
}

export interface SupabaseConfig {
    projectUrl: string;
    apiKey: string;
    isConnected: boolean;
}

export type ActionType = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'SETTINGS' | 'ATTENDANCE' | 'PAYROLL' | 'FINANCE';

export interface ActivityLog {
    id: string;
    actorName: string;
    actorRole: UserRole;
    action: ActionType;
    target: string;
    details: string;
    timestamp: string;
}
