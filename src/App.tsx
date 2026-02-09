
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
import { INITIAL_EMPLOYEES, generateMockAttendance, DEFAULT_CONFIG } from './constants';
import { Employee, AttendanceRecord, AppConfig, UserRole, ActivityLog, ActionType } from './types';
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
import { Cloud, Loader2, Fingerprint } from 'lucide-react';

// Loud notification sound (Digital Alarm Beep)
const NOTIFICATION_SOUND_URL = "data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjI5LjEwMAAAAAAAAAAAAAAA//uQZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWgAAAA0AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA//uQZAAP8AAAgAAAAAAAgAAAAAAAEAAAgAAAAAAAgAAAAAAAD/84AAgAAAAAAACAAAAAAAAAAA";

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('mowazeb_theme') === 'dark');
  const [notifications, setNotifications] = useState<Array<{id: string, message: string, type: 'info' | 'success' | 'error'}>>([]);
  
  // Data State
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  
  // App State
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isPermissionError, setIsPermissionError] = useState(false);
  const [currentUser, setCurrentUser] = useState<Employee | null>(null);

  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Geo-Notification State
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

  // Initialize Audio & PWA Prompt
  useEffect(() => {
      audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
      
      // Request permission immediately for Notifications
      if ('Notification' in window) {
          Notification.requestPermission();
      }

      // Capture PWA Install Prompt
      window.addEventListener('beforeinstallprompt', (e) => {
          e.preventDefault();
          setInstallPrompt(e);
      });
  }, []);

  const handleInstallApp = async () => {
      if (!installPrompt) return;
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') {
          setInstallPrompt(null);
      }
  };

  // --- SMART SHIFT NOTIFICATION SCHEDULER ---
  useEffect(() => {
      if (!currentUser || !config) return;

      const checkShiftTime = () => {
          const now = new Date();
          const branchName = currentUser.branch === 'factory' ? 'factory' : 'office';
          const settings = config[branchName];
          
          if (!settings?.workStartTime) return;

          const [startHour, startMinute] = settings.workStartTime.split(':').map(Number);
          const shiftStart = new Date();
          shiftStart.setHours(startHour, startMinute, 0, 0);

          const diffMs = shiftStart.getTime() - now.getTime();
          const diffMinutes = Math.floor(diffMs / 60000);

          // Notify 15 minutes before shift OR exactly at shift start
          if (diffMinutes === 15 || diffMinutes === 0) {
              
              const todayStr = now.toISOString().split('T')[0];
              const recordId = `${currentUser.id}-${todayStr}`;
              const hasCheckedIn = attendanceRecords.some(r => r.id === recordId && r.checkIn);

              if (!hasCheckedIn) {
                  const msg = diffMinutes === 15 
                      ? `⏳ تنبيه: باقي 15 دقيقة على موعد حضورك في ${branchName === 'factory' ? 'المصنع' : 'المكتب'}!` 
                      : `🚨 حان الآن موعد الحضور! يرجى تسجيل الدخول فوراً.`;

                  if (Notification.permission === 'granted') {
                      new Notification("نظام مواظب PRO", {
                          body: msg,
                          icon: "https://cdn-icons-png.flaticon.com/512/9320/9320288.png",
                          requireInteraction: true
                      });
                  }

                  notify(msg, 'info');
                  if (audioRef.current) audioRef.current.play().catch(() => {});
              }
          }
      };

      const interval = setInterval(checkShiftTime, 60000);
      checkShiftTime(); // Initial

      return () => clearInterval(interval);
  }, [currentUser, config, attendanceRecords]);

  // --- FAST PROXIMITY NOTIFICATION LOGIC ---
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
                      if (audioRef.current) {
                          audioRef.current.play().catch(e => console.log("Audio autoplay blocked", e));
                      }
                      
                      const msg = `🔔 تنبيه: لقد وصلت إلى ${branchName === 'factory' ? 'المصنع' : 'المكتب'}! لا تنس تسجيل الحضور.`;
                      notify(msg, 'info');
                      
                      if (Notification.permission === 'granted') {
                          new Notification("أنت في الموقع!", { body: msg, icon: "https://cdn-icons-png.flaticon.com/512/9320/9320288.png" });
                      }

                      setHasNotifiedProximity(true);
                  }
              },
              (err) => {
                  console.warn("Background Geo Warning (Silent):", err.message);
              },
              { 
                  enableHighAccuracy: true, 
                  maximumAge: 60000, 
                  timeout: 20000     
              }
          );

          return () => navigator.geolocation.clearWatch(watchId);
      }

  }, [currentUser, config, attendanceRecords, hasNotifiedProximity]);

  const processLoadedConfig = (dbConfig: any): AppConfig => {
      if (!dbConfig) return DEFAULT_CONFIG;
      const newConfig: AppConfig = { ...DEFAULT_CONFIG, ...dbConfig };

      if (!dbConfig.factory && dbConfig.companyLat !== undefined) {
          console.log("Migrating legacy config...");
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

  const loadDataFromCloud = useCallback(async () => {
      setIsLoading(true);
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
              setConfig(processLoadedConfig(data.config));

              const savedSessionId = localStorage.getItem('mowazeb_session_id');
              if (savedSessionId && !currentUser) {
                  const foundUser = fetchedEmployees.find(e => e.id === savedSessionId);
                  if (foundUser) {
                      setCurrentUser(foundUser);
                      const isTopManagement = foundUser.role === 'general_manager' || foundUser.role === 'owner';
                      setActiveTab(isTopManagement ? 'dashboard' : 'biometric');
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
      setIsLoading(false);
  }, []);

  useEffect(() => {
      loadDataFromCloud();
      const sbConfig = getSupabaseConfig();
      if (sbConfig.isConnected) {
          subscribeToRealtime(() => {
               downloadAllData().then(data => {
                   if(data.success) {
                       if (data.employees) setEmployees(data.employees);
                       if (data.records) setAttendanceRecords(data.records || []);
                       if (data.logs) setLogs(data.logs);
                       if (data.config) setConfig(processLoadedConfig(data.config));
                   }
               });
          });
      }
  }, [loadDataFromCloud]);

  const handleLogin = (user: Employee) => {
      setCurrentUser(user);
      localStorage.setItem('mowazeb_session_id', user.id);
      
      const isTopManagement = user.role === 'general_manager' || user.role === 'owner';
      setActiveTab(isTopManagement ? 'dashboard' : 'biometric');

      if (Notification.permission === 'default') {
          Notification.requestPermission();
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
      let status: 'in' | 'out' | 'error' = 'in';
      let message = '';
      
      if (yesterdayRecord && yesterdayRecord.checkIn && !yesterdayRecord.checkOut) {
          newRecord = { 
              ...yesterdayRecord, 
              checkOut: timeStr, 
              source: 'device', 
              photo: photo || yesterdayRecord.photo 
          };
          message = `تم تسجيل خروج (وردية أمس) ${timeStr}`;
          status = 'out';
          
          setAttendanceRecords(prev => prev.map(r => r.id === yesterdayRecordId ? newRecord : r));
          addLog('ATTENDANCE', `Device: ${employeeName}`, `خروج ليلية (بعد 12 ص) ${timeStr}`);
          upsertSingleRecord(newRecord).then(res => { if (res?.error) notify(`فشل حفظ البصمة: ${res.error.message}`, 'error'); });
          notify(`تم تسجيل انصراف ${employeeName} (وردية أمس)`, 'success');
          
          return { status, time: timeStr, message };
      }

      if (!todayRecord) {
          newRecord = { id: todayRecordId, employeeId, date: dateStr, checkIn: timeStr, status: 'present', source: 'device', location, photo };
          message = `تم تسجيل دخول ${timeStr}`;
          setAttendanceRecords(prev => [...prev, newRecord]);
          addLog('ATTENDANCE', `Device: ${employeeName}`, `دخول ${timeStr}`);
          upsertSingleRecord(newRecord).then(res => { if (res?.error) notify(`فشل حفظ البصمة: ${res.error.message}`, 'error'); });
          notify(`تم تسجيل حضور ${employeeName}`, 'success');
      } else if (todayRecord.checkIn && !todayRecord.checkOut) {
          newRecord = { ...todayRecord, checkOut: timeStr, source: 'device', photo: photo || todayRecord.photo };
          message = `تم تسجيل خروج ${timeStr}`;
          status = 'out';
          setAttendanceRecords(prev => prev.map(r => r.id === todayRecordId ? newRecord : r));
          addLog('ATTENDANCE', `Device: ${employeeName}`, `خروج ${timeStr}`);
          upsertSingleRecord(newRecord).then(res => { if (res?.error) notify(`فشل حفظ البصمة: ${res.error.message}`, 'error'); });
          notify(`تم تسجيل انصراف ${employeeName}`, 'success');
      } else {
          return { status: 'error', time: timeStr, message: 'تم التسجيل مسبقاً لهذا اليوم' };
      }

      return { status, time: timeStr, message };
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
              <div className="absolute top-[-20%] left-[-20%] w-[70%] h-[70%] bg-blue-600/10 blur-[120px] rounded-full animate-pulse"></div>
              <div className="absolute bottom-[-20%] right-[-20%] w-[70%] h-[70%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse animation-delay-2000"></div>
              <div className="relative z-10 flex flex-col items-center gap-8 animate-fade-in">
                  <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 rounded-full animate-pulse"></div>
                      <div className="w-28 h-28 bg-gradient-to-tr from-slate-800 to-slate-900 rounded-[2.5rem] border border-white/10 flex items-center justify-center shadow-2xl relative rotate-3">
                           <Fingerprint size={56} className="text-blue-500 animate-pulse drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
                      </div>
                  </div>
                  <div className="text-center space-y-4">
                      <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
                          برنامج <span className="text-blue-500">الحضور والانصراف</span>
                      </h1>
                      <div className="flex flex-col items-center gap-3">
                          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5 backdrop-blur-sm">
                              <Loader2 size={16} className="animate-spin text-blue-400" />
                              <span className="text-sm font-bold text-slate-300">جاري تهيئة النظام...</span>
                          </div>
                      </div>
                  </div>
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

  const userRole = currentUser.role;

  return (
    <Layout 
        activeTab={activeTab} onTabChange={setActiveTab} 
        userRole={userRole} currentUserName={currentUser.name} currentUserRole={userRole}
        onLogout={handleLogout} darkMode={darkMode} toggleDarkMode={() => setDarkMode(!darkMode)}
        isSyncing={isSyncing} cloudError={cloudError}
        notifications={notifications} removeNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
        installPrompt={installPrompt} onInstall={handleInstallApp}
    >
      <AnimatePresence mode="wait">
        <PageTransition key={activeTab}>
            {activeTab === 'dashboard' && <Dashboard employees={employees} attendanceRecords={attendanceRecords} config={config} currentUserRole={userRole} currentEmployeeId={currentUser.id} />}
            {activeTab === 'employees' && <EmployeeManager employees={employees} attendanceRecords={attendanceRecords} config={config} userRole={userRole} onUpdateRecord={handleUpdateRecord} onDeleteRecord={handleDeleteRecord} />}
            {activeTab === 'biometric' && <BiometricSimulator employees={employees} onDevicePunch={handleDevicePunch} currentUser={currentUser} config={config} />}
            {activeTab === 'reports' && <Reports employees={employees} attendanceRecords={attendanceRecords} config={config} currentUserRole={userRole} currentEmployeeId={currentUser.id} />}
            {activeTab === 'users' && <UserManagement employees={employees} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
            {activeTab === 'logs' && <ActivityLogs logs={logs} />}
            {activeTab === 'settings' && <Settings config={config} onConfigChange={handleConfigChange} userRole={userRole} onRoleChange={() => {}} onResetData={() => {}} darkMode={darkMode} notify={notify} />}
        </PageTransition>
      </AnimatePresence>
    </Layout>
  );
}

export default App;
