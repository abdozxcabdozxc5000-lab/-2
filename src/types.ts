
export type UserRole = 'general_manager' | 'owner' | 'manager' | 'office_manager' | 'accountant' | 'employee';

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
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'weekend' | 'leave' | 'absent_penalty' | 'under_review';

export type RecordSource = 'manual' | 'device' | 'app';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:mm format
  checkOut?: string; // HH:mm format
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
    weekendDays: number[]; // 5=Friday, 6=Saturday, etc.
}

export interface AppConfig {
  // Global Settings
  gracePeriodMinutes: number;
  weightCommitment: number;
  weightOvertime: number;
  weightAbsence: number;
  penaltyValue: number;
  holidays: Holiday[];

  // Branch Specific Settings
  office: BranchSettings;
  factory: BranchSettings;
}

export interface SupabaseConfig {
    projectUrl: string;
    apiKey: string;
    isConnected: boolean;
}

export type ActionType = 'LOGIN' | 'LOGOUT' | 'CREATE' | 'UPDATE' | 'DELETE' | 'SETTINGS' | 'ATTENDANCE';

export interface ActivityLog {
    id: string;
    actorName: string;
    actorRole: UserRole;
    action: ActionType;
    target: string;
    details: string;
    timestamp: string;
}
