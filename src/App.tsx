
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import EmployeeManager from './components/EmployeeManager';
import Reports from './components/Reports';
import Settings from './components/Settings';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import BiometricSimulator from './components/BiometricSimulator'; 
import ActivityLogs from './components/ActivityLogs';
import PageTransition from './components/PageTransition';
import SystemPortal from './components/SystemPortal';
import PayrollManager from './components/PayrollManager';
import FinanceManager from './components/FinanceManager'; 
import NotificationSystem from './components/NotificationSystem'; // Import Notification System
import { INITIAL_EMPLOYEES, generateMockAttendance, DEFAULT_CONFIG } from './constants';
import { Employee, AttendanceRecord, AppConfig, UserRole, ActivityLog, ActionType, Loan, PayrollRecord, CustodyRecord, ExpenseRecord } from './types';
import { 
    initSupabase, 
    subscribeToRealtime, 
    downloadAllData, 
    uploadAllData, 
    getSupabaseConfig,
    upsertSingleRecord,
    upsertSingleEmployee,
    deleteSingleEmployee,
    upsertConfig,
    deleteSingleRecord,
    upsertSingleLog
} from './supabaseClient';
import { calculateDistance } from './utils';
import { AnimatePresence } from 'framer-motion';
import { Cloud, Loader2 } from 'lucide-react';

const NOTIFICATION_SOUND_URL = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA";

function App() {
  const [currentSystem, setCurrentSystem] = useState<'portal' | 'attendance' | 'payroll' | 'finance'>('portal'); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mowazeb_theme') === 'dark');
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'info' | 'success' | 'error'}>>([]);
  
  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollRecord[]>([]);
  const [custodies, setCustodies] = useState<CustodyRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  
  // App State
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  const [hasNotifiedProximity, setHasNotifiedProximity] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const notify = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      const id = Date.now().toString();
      setNotifications(prev => [...prev, {id, message, type}]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000);
  };

  const addLog = (action: ActionType, target: string, details: string) => {
      const newLog: ActivityLog = {
          id: Date.now().toString(),
          actorName: currentUser?.name || 'System',
          actorRole: currentUser?.role || 'employee',
          action,
          target,
          details,
          timestamp: new Date().toISOString()
      };
      
      setLogs(prev => [newLog, ...prev]);
      upsertSingleLog(newLog).catch(err => console.error("Log sync failed:", err));
  };

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('mowazeb_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
  }, []);

  useEffect(() => {
      if (!currentUser || !config) return;
      
      const branchName = currentUser.branch === 'factory' ? 'factory' : 'office';
      const branchSettings = config[branchName];
      if (!branchSettings?.locationEnabled) return;
      const today = new Date().toISOString().split('T')[0];
      const recordId = `${currentUser.id}-${today}`;
      const record = attendanceRecords.find(r => r.id === recordId);
      if (record?.checkIn) {
          if (hasNotifiedProximity) setHasNotifiedProximity(false); 
          return;
      }
      if (hasNotifiedProximity) return;
      if ('geolocation' in navigator) {
          const watchId = navigator.geolocation.watchPosition(
              (position) => {
                  const currentLat = position.coords.latitude;
                  const currentLng = position.coords.longitude;
                  const targetLat = branchSettings.lat || 0;
                  const targetLng = branchSettings.lng || 0;
                  const distance = calculateDistance(currentLat, currentLng, targetLat, targetLng);
                  const allowedRadius = branchSettings.radius || 100;
                  if (distance <= (allowedRadius + 50)) {
                      if (audioRef.current) audioRef.current.play().catch(e => console.log("Audio autoplay blocked", e));
                      notify(`🔔 تنبيه: لقد وصلت إلى ${branchName === 'factory' ? 'المصنع' : 'المكتب'}! لا تنس تسجيل الحضور.`, 'info');
                      setHasNotifiedProximity(true);
                  }
              },
              (err) => console.warn("Background Geo Warning (Silent):", err.message),
              { enableHighAccuracy: true, maximumAge: 60000, timeout: 20000 }
          );
          return () => navigator.geolocation.clearWatch(watchId);
      }
  }, [currentUser, config, attendanceRecords, hasNotifiedProximity]);

  const processLoadedConfig = (dbConfig: any): AppConfig => {
      if (!dbConfig) return DEFAULT_CONFIG;
      const newConfig: AppConfig = { ...DEFAULT_CONFIG, ...dbConfig };
      if (!dbConfig.factory && dbConfig.companyLat !== undefined) {
          newConfig.factory = {
              ...DEFAULT_CONFIG.factory,
              lat: Number(dbConfig.companyLat),
              lng: Number(dbConfig.companyLng),
              radius: Number(dbConfig.allowedRadiusMeters || dbConfig.radius || DEFAULT_CONFIG.factory.radius),
              locationEnabled: dbConfig.locationEnabled ?? false,
              workStartTime: dbConfig.workStartTime || DEFAULT_CONFIG.factory.workStartTime,
              workEndTime: dbConfig.workEndTime || DEFAULT_CONFIG.factory.workEndTime,
              weekendDays: DEFAULT_CONFIG.factory.weekendDays 
          };
      } else {
          newConfig.factory = { ...DEFAULT_CONFIG.factory, ...(dbConfig.factory || {}) };
      }
      newConfig.office = { ...DEFAULT_CONFIG.office, ...(dbConfig.office || {}) };
      return newConfig;
  };

  const loadDataFromCloud = useCallback(async (silent = false) => {
      if (!silent) setIsLoading(true);
      if (silent) setIsSyncing(true);

      setCloudError(null);
      initSupabase();
      const data = await downloadAllData();

      if (data.success) {
          const fetchedEmployees = data.employees || [];
          if (!fetchedEmployees || fetchedEmployees.length === 0) {
              const defaultConfig: AppConfig = DEFAULT_CONFIG;
              const mockRecords = generateMockAttendance(INITIAL_EMPLOYEES);
              await uploadAllData(INITIAL_EMPLOYEES, mockRecords, defaultConfig);
              setEmployees(INITIAL_EMPLOYEES);
              setAttendanceRecords(mockRecords);
              setConfig(defaultConfig);
          } else {
              setEmployees(fetchedEmployees);
              setAttendanceRecords(data.records || []);
              setLogs(data.logs || []);
              setLoans(data.loans || []);
              setPayrolls(data.payrolls || []);
              setCustodies(data.custodies || []);
              setExpenses(data.expenses || []);
              setConfig(processLoadedConfig(data.config));

              if (!silent) {
                  const savedSessionId = localStorage.getItem('mowazeb_session_id');
                  if (savedSessionId) {
                      const foundUser = fetchedEmployees.find(e => e.id === savedSessionId);
                      if (foundUser) {
                          setCurrentUser(foundUser);
                          const isTopManagement = foundUser.role === 'general_manager' || foundUser.role === 'owner';
                          if (isTopManagement) setCurrentSystem('portal');
                          else {
                              setCurrentSystem('attendance');
                              setActiveTab('biometric');
                          }
                      }
                  }
              }
          }
      } else {
          setCloudError(data.message || 'فشل الاتصال بالنظام السحابي');
          const isPerm = data.code === '42501' || (typeof data.message === 'string' && data.message.toLowerCase().includes('permission denied'));
          if (isPerm) {
              setIsPermissionError(true);
              notify('خطأ في أذونات النظام السحابي (RLS).', 'error');
          }
      }
      if (!silent) setIsLoading(false);
      if (silent) setIsSyncing(false);
  }, []); 

  useEffect(() => {
      loadDataFromCloud();
      const sbConfig = getSupabaseConfig();
      if (sbConfig.isConnected) {
          subscribeToRealtime(() => {
               loadDataFromCloud(true);
          });
      }
  }, []); 

  const handleLogin = (user: Employee) => {
      setCurrentUser(user);
      localStorage.setItem('mowazeb_session_id', user.id);
      
      const isTopManagement = user.role === 'general_manager' || user.role === 'owner';
      
      if (isTopManagement) {
          setCurrentSystem('portal');
      } else {
          setCurrentSystem('attendance');
          setActiveTab(user.role === 'employee' ? 'biometric' : 'dashboard');
      }

      setTimeout(() => {
          addLog('LOGIN', 'System', 'قام المستخدم بتسجيل الدخول');
      }, 500);
      notify(`مرحباً بك، ${user.name}`, 'success');
  };

  const handleLogout = () => {
      if (currentUser) addLog('LOGOUT', 'System', 'قام المستخدم بتسجيل الخروج');
      localStorage.removeItem('mowazeb_session_id');
      setCurrentUser(null);
      setCurrentSystem('portal');
  };

  const handleUpdateRecord = async (newRecord: AttendanceRecord) => {
      const updatedRecords = [...attendanceRecords];
      const existsIdx = updatedRecords.findIndex(r => r.id === newRecord.id);
      if (existsIdx >= 0) updatedRecords[existsIdx] = newRecord;
      else updatedRecords.push(newRecord);
      setAttendanceRecords(updatedRecords);
      const res = await upsertSingleRecord(newRecord);
      if (res?.error) notify(`فشل الحفظ السحابي: ${res.error.message}`, 'error');
      const empName = employees.find(e => e.id === newRecord.employeeId)?.name || 'مجهول';
      addLog('UPDATE', `Attendance: ${empName}`, `تعديل سجل بتاريخ ${newRecord.date}`);
  };

  const handleDeleteRecord = async (id: string) => {
      const recordToDelete = attendanceRecords.find(r => r.id === id);
      if (!recordToDelete) return;
      setAttendanceRecords(prev => prev.filter(r => r.id !== id));
      const res = await deleteSingleRecord(id);
      if (res?.error) notify(`فشل الحذف السحابي: ${res.error.message}`, 'error');
      const empName = employees.find(e => e.id === recordToDelete.employeeId)?.name || 'مجهول';
      addLog('DELETE', `Attendance: ${empName}`, `مسح سجل بتاريخ ${recordToDelete.date}`);
      notify('تم مسح بيانات السجل بنجاح', 'success');
  };

  const handleDevicePunch = (employeeId: string, location?: any, photo?: string): { status: 'in' | 'out' | 'error'; time: string; message: string } => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const todayRecordId = `${employeeId}-${dateStr}`;
      const yesterdayRecordId = `${employeeId}-${yesterdayStr}`;
      const todayRecord = attendanceRecords.find(r => r.id === todayRecordId);
      const yesterdayRecord = attendanceRecords.find(r => r.id === yesterdayRecordId);
      const employeeName = employees.find(e => e.id === employeeId)?.name || 'Unknown';
      let newRecord: AttendanceRecord;
      
      if (yesterdayRecord && yesterdayRecord.checkIn && !yesterdayRecord.checkOut) {
          newRecord = { ...yesterdayRecord, checkOut: timeStr, source: 'device', photo: photo || yesterdayRecord.photo };
          setAttendanceRecords(prev => prev.map(r => r.id === yesterdayRecordId ? newRecord : r));
          addLog('ATTENDANCE', `Device: ${employeeName}`, `خروج ليلية ${timeStr}`);
          upsertSingleRecord(newRecord);
          notify(`تم تسجيل انصراف ${employeeName} (وردية أمس)`, 'success');
          return { status: 'out', time: timeStr, message: `تم تسجيل خروج (وردية أمس) ${timeStr}` };
      }

      if (!todayRecord) {
          newRecord = { id: todayRecordId, employeeId, date: dateStr, checkIn: timeStr, status: 'present', source: 'device', location, photo };
          setAttendanceRecords(prev => [...prev, newRecord]);
          addLog('ATTENDANCE', `Device: ${employeeName}`, `دخول ${timeStr}`);
          upsertSingleRecord(newRecord);
          notify(`تم تسجيل حضور ${employeeName}`, 'success');
          return { status: 'in', time: timeStr, message: `تم تسجيل دخول ${timeStr}` };
      } else if (todayRecord.checkIn && !todayRecord.checkOut) {
          // --- Safety Check: Prevent immediate sign-out ---
          if (todayRecord.checkIn) {
              const checkInParts = todayRecord.checkIn.split(':');
              const checkInTime = new Date();
              checkInTime.setHours(parseInt(checkInParts[0]), parseInt(checkInParts[1]), 0);
              const diffMinutes = (new Date().getTime() - checkInTime.getTime()) / 60000;

              // Prevent checkout if less than 5 minutes have passed since check-in
              if (diffMinutes < 5) {
                  return { 
                      status: 'error', 
                      time: timeStr, 
                      message: `عفواً، لا يمكن تسجيل الانصراف قبل مرور 5 دقائق على الأقل من تسجيل الحضور.` 
                  };
              }
          }
          // ------------------------------------------------

          newRecord = { ...todayRecord, checkOut: timeStr, source: 'device', photo: photo || todayRecord.photo };
          setAttendanceRecords(prev => prev.map(r => r.id === todayRecordId ? newRecord : r));
          addLog('ATTENDANCE', `Device: ${employeeName}`, `خروج ${timeStr}`);
          upsertSingleRecord(newRecord);
          notify(`تم تسجيل انصراف ${employeeName}`, 'success');
          return { status: 'out', time: timeStr, message: `تم تسجيل خروج ${timeStr}` };
      } else {
          return { status: 'error', time: timeStr, message: 'تم التسجيل مسبقاً لهذا اليوم' };
      }
  };

  const handleConfigChange = async (newConfig: AppConfig) => {
      setConfig(newConfig);
      const res = await upsertConfig(newConfig);
      if (res?.error) notify(`فشل حفظ الإعدادات: ${res.error.message}`, 'error');
      addLog('SETTINGS', 'Configuration', 'تحديث إعدادات النظام');
  };

  const handleAddUser = async (user: Omit<Employee, 'id'>) => {
      const newId = Date.now().toString();
      const newUser: Employee = { ...user, id: newId };
      setEmployees(prev => [...prev, newUser]);
      const res = await upsertSingleEmployee(newUser);
      if (res?.error) notify(`فشل حفظ المستخدم: ${res.error.message}`, 'error');
      addLog('CREATE', `User: ${user.name}`, 'إضافة موظف جديد');
  };

  const handleUpdateUser = async (id: string, updates: Partial<Employee>) => {
      const updatedUser = { ...employees.find(e => e.id === id)!, ...updates };
      setEmployees(prev => prev.map(e => e.id === id ? updatedUser : e));
      const res = await upsertSingleEmployee(updatedUser);
      if (res?.error) notify(`فشل تحديث المستخدم: ${res.error.message}`, 'error');
      addLog('UPDATE', `User: ${updatedUser.name}`, 'تحديث بيانات موظف');
  };

  const handleDeleteUser = async (id: string) => {
      const user = employees.find(e => e.id === id);
      setEmployees(prev => prev.filter(e => e.id !== id));
      const res = await deleteSingleEmployee(id);
      if (res?.error) notify(`فشل حذف المستخدم: ${res.error.message}`, 'error');
      addLog('DELETE', `User: ${user?.name}`, 'حذف موظف من النظام');
  };

  if (isLoading) {
      return (
          <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#060B18] text-white relative overflow-hidden font-sans" dir="rtl">
              <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
                  <Loader2 size={48} className="animate-spin text-blue-600" />
                  <span className="text-sm font-bold text-slate-300">جاري تحميل النظام...</span>
              </div>
          </div>
      );
  }

  if (cloudError && employees.length === 0) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-red-500 gap-4 p-8 text-center">
              <Cloud size={64} />
              <h2 className="text-2xl font-bold">فشل الاتصال بالنظام السحابي</h2>
              <p className="text-slate-600 dark:text-slate-300 max-w-md">{cloudError}</p>
              <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold mt-4 hover:bg-blue-700">إعادة المحاولة</button>
          </div>
      );
  }

  if (!currentUser) return <Login employees={employees} onLogin={handleLogin} isPermissionError={isPermissionError} />;
  
  if (!config) return null;

  if (currentSystem === 'portal') {
      return <SystemPortal 
                userName={currentUser.name} 
                userRole={currentUser.role}
                onSelectSystem={(sys) => setCurrentSystem(sys)} 
                onLogout={handleLogout} 
             />;
  }

  if (currentSystem === 'payroll') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white p-6 font-sans dir-rtl">
              <PayrollManager 
                  employees={employees}
                  attendanceRecords={attendanceRecords}
                  loans={loans}
                  payrolls={payrolls}
                  config={config}
                  onUpdateData={() => loadDataFromCloud(true)}
                  onExit={() => setCurrentSystem('portal')}
              />
              <NotificationSystem notifications={notifications} removeNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
          </div>
      );
  }

  if (currentSystem === 'finance') {
      return (
          <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white p-6 font-sans dir-rtl">
              <FinanceManager 
                  employees={employees}
                  custodies={custodies}
                  expenses={expenses}
                  currentUserRole={currentUser.role}
                  currentUserId={currentUser.id}
                  onUpdateData={() => loadDataFromCloud(true)}
                  onExit={() => setCurrentSystem('portal')}
                  onNotify={notify} // Pass the notify function
              />
              <NotificationSystem notifications={notifications} removeNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))} />
          </div>
      );
  }

  return (
    <Layout 
        activeTab={activeTab} onTabChange={setActiveTab} 
        userRole={currentUser.role} currentUserName={currentUser.name} currentUserRole={currentUser.role}
        onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)}
        isSyncing={isSyncing} cloudError={cloudError}
        notifications={notifications} removeNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
        onExit={() => setCurrentSystem('portal')}
    >
      <AnimatePresence mode="wait">
        <PageTransition key={activeTab}>
            {activeTab === 'dashboard' && <Dashboard employees={employees} attendanceRecords={attendanceRecords} config={config} currentUserRole={currentUser.role} currentEmployeeId={currentUser.id} />}
            {activeTab === 'employees' && <EmployeeManager employees={employees} attendanceRecords={attendanceRecords} config={config} userRole={currentUser.role} onUpdateRecord={handleUpdateRecord} onDeleteRecord={handleDeleteRecord} />}
            {activeTab === 'biometric' && <BiometricSimulator employees={employees} onDevicePunch={handleDevicePunch} currentUser={currentUser} config={config} />}
            {activeTab === 'reports' && <Reports employees={employees} attendanceRecords={attendanceRecords} config={config} currentUserRole={currentUser.role} currentEmployeeId={currentUser.id} />}
            {activeTab === 'users' && <UserManagement employees={employees} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
            {activeTab === 'logs' && <ActivityLogs logs={logs} />}
            {activeTab === 'settings' && <Settings config={config} onConfigChange={handleConfigChange} userRole={currentUser.role} onRoleChange={() => {}} onResetData={() => {}} />}
        </PageTransition>
      </AnimatePresence>
    </Layout>
  );
}

export default App;
