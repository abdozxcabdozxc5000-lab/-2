
import React, { useState, useEffect, useCallback } from 'react';
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
import { AnimatePresence } from 'framer-motion';
import { Cloud, Loader2 } from 'lucide-react';

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

  const notify = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
      const id = Date.now().toString();
      setNotifications(prev => [...prev, {id, message, type}]);
      setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 6000);
  };

  const addLog = (action: ActionType, target: string, details: string) => {
      // Optimistic Update
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
      
      // Fire and forget to Supabase
      upsertSingleLog(newLog).catch(err => console.error("Log sync failed:", err));
  };

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    localStorage.setItem('mowazeb_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  // Helper to migrate legacy DB config to new structure
  const processLoadedConfig = (dbConfig: any): AppConfig => {
      if (!dbConfig) return DEFAULT_CONFIG;

      // Start with defaults to ensure structure exists
      const newConfig: AppConfig = { ...DEFAULT_CONFIG, ...dbConfig };

      // MIGRATION: If DB has old keys (companyLat) but NO factory object, map them to factory
      if (!dbConfig.factory && dbConfig.companyLat !== undefined) {
          console.log("Migrating legacy config to factory settings...");
          newConfig.factory = {
              ...DEFAULT_CONFIG.factory,
              lat: Number(dbConfig.companyLat),
              lng: Number(dbConfig.companyLng),
              radius: Number(dbConfig.allowedRadiusMeters || dbConfig.radius || DEFAULT_CONFIG.factory.radius),
              locationEnabled: dbConfig.locationEnabled ?? false,
              workStartTime: dbConfig.workStartTime || DEFAULT_CONFIG.factory.workStartTime,
              workEndTime: dbConfig.workEndTime || DEFAULT_CONFIG.factory.workEndTime,
              // Preserve old weekend setting if it exists, otherwise default
              weekendDays: DEFAULT_CONFIG.factory.weekendDays 
          };
      } else {
          // Normal merge if factory exists
          newConfig.factory = { ...DEFAULT_CONFIG.factory, ...(dbConfig.factory || {}) };
      }

      // Ensure office object exists
      newConfig.office = { ...DEFAULT_CONFIG.office, ...(dbConfig.office || {}) };

      return newConfig;
  };

  // Load Data from Supabase
  const loadDataFromCloud = useCallback(async () => {
      setIsLoading(true);
      setCloudError(null);
      
      initSupabase();
      const data = await downloadAllData();

      if (data.success) {
          const fetchedEmployees = data.employees || [];
          
          // SEEDING: If DB is empty, fill with initial mock data
          if (!fetchedEmployees || fetchedEmployees.length === 0) {
              console.log("Database empty. Seeding initial data...");
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
              
              // Process Config with Migration Logic
              const processedConfig = processLoadedConfig(data.config);
              setConfig(processedConfig);

              // --- AUTO LOGIN LOGIC (PERSISTENT SESSION) ---
              // Check if there is a saved session ID in local storage
              const savedSessionId = localStorage.getItem('mowazeb_session_id');
              if (savedSessionId && !currentUser) {
                  const foundUser = fetchedEmployees.find(e => e.id === savedSessionId);
                  if (foundUser) {
                      console.log("Auto-logging in user:", foundUser.name);
                      setCurrentUser(foundUser);
                      // Set active tab based on role logic
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
  }, []); // Remove currentUser dependency to avoid loop

  // Initial Load
  useEffect(() => {
      loadDataFromCloud();
      
      const sbConfig = getSupabaseConfig();
      if (sbConfig.isConnected) {
          subscribeToRealtime(() => {
               // On Realtime event, re-fetch to stay in sync
               downloadAllData().then(data => {
                   if(data.success) {
                       if (data.employees) setEmployees(data.employees);
                       if (data.records) setAttendanceRecords(data.records || []);
                       if (data.logs) setLogs(data.logs);
                       
                       // Apply same migration logic for realtime updates
                       if (data.config) {
                           const processed = processLoadedConfig(data.config);
                           setConfig(processed);
                       }
                   }
               });
          });
      }
  }, [loadDataFromCloud]);

  const handleLogin = (user: Employee) => {
      setCurrentUser(user);
      
      // PERSIST SESSION: Save user ID to localStorage
      localStorage.setItem('mowazeb_session_id', user.id);
      
      // Update: Redirect employees, managers, accountants, etc. directly to biometric page
      // Only Top Management (General Manager & Owner) go to Dashboard
      const isTopManagement = user.role === 'general_manager' || user.role === 'owner';

      if (!isTopManagement) {
          setActiveTab('biometric');
      } else {
          setActiveTab('dashboard');
      }

      setTimeout(() => {
          const logEntry: ActivityLog = {
            id: Date.now().toString(),
            actorName: user.name,
            actorRole: user.role,
            action: 'LOGIN',
            target: 'System',
            details: 'قام المستخدم بتسجيل الدخول',
            timestamp: new Date().toISOString()
        };
        setLogs(prev => [logEntry, ...prev]);
        upsertSingleLog(logEntry);
      }, 500);
      notify(`مرحباً بك، ${user.name}`, 'success');
  };

  const handleLogout = () => {
      if (currentUser) addLog('LOGOUT', 'System', 'قام المستخدم بتسجيل الخروج');
      
      // CLEAR SESSION: Remove user ID from localStorage
      localStorage.removeItem('mowazeb_session_id');
      
      setCurrentUser(null);
  };

  const handleUpdateRecord = async (newRecord: AttendanceRecord) => {
      // Optimistic Update
      const updatedRecords = [...attendanceRecords];
      const existsIdx = updatedRecords.findIndex(r => r.id === newRecord.id);
      if (existsIdx >= 0) updatedRecords[existsIdx] = newRecord;
      else updatedRecords.push(newRecord);
      setAttendanceRecords(updatedRecords);
      
      const res = await upsertSingleRecord(newRecord);
      
      if (res?.error) {
          console.error("Save failed:", res.error);
          notify(`فشل الحفظ السحابي: ${res.error.message}`, 'error');
      }

      const empName = employees.find(e => e.id === newRecord.employeeId)?.name || 'مجهول';
      addLog('UPDATE', `Attendance: ${empName}`, `تعديل سجل بتاريخ ${newRecord.date}`);
  };

  const handleDeleteRecord = async (id: string) => {
      const recordToDelete = attendanceRecords.find(r => r.id === id);
      if (!recordToDelete) return;

      setAttendanceRecords(prev => prev.filter(r => r.id !== id));
      
      const res = await deleteSingleRecord(id);
      if (res?.error) {
           notify(`فشل الحذف السحابي: ${res.error.message}`, 'error');
      }

      const empName = employees.find(e => e.id === recordToDelete.employeeId)?.name || 'مجهول';
      addLog('DELETE', `Attendance: ${empName}`, `مسح سجل بتاريخ ${recordToDelete.date}`);
      notify('تم مسح بيانات السجل بنجاح', 'success');
  };

  const handleDevicePunch = (employeeId: string, location?: any, photo?: string): { status: 'in' | 'out' | 'error'; time: string; message: string } => {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];
      const timeStr = today.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      
      // منطق التعامل مع الورديات الليلية (بعد منتصف الليل)
      // حساب تاريخ الأمس
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // معرفات السجلات لليوم ولأمس
      const todayRecordId = `${employeeId}-${dateStr}`;
      const yesterdayRecordId = `${employeeId}-${yesterdayStr}`;
      
      // البحث عن السجلات
      const todayRecord = attendanceRecords.find(r => r.id === todayRecordId);
      const yesterdayRecord = attendanceRecords.find(r => r.id === yesterdayRecordId);
      
      const employeeName = employees.find(e => e.id === employeeId)?.name || 'Unknown';
      
      let newRecord: AttendanceRecord;
      let status: 'in' | 'out' | 'error' = 'in';
      let message = '';
      
      // السيناريو 1: يوجد سجل دخول مفتوح من يوم أمس (لم يتم تسجيل خروج له)
      // إذا كانت الساعة الآن بعد منتصف الليل، يجب إغلاق وردية الأمس بدلاً من فتح وردية جديدة لليوم
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
          upsertSingleRecord(newRecord).then(res => {
             if (res?.error) notify(`فشل حفظ البصمة: ${res.error.message}`, 'error');
          });
          notify(`تم تسجيل انصراف ${employeeName} (وردية أمس)`, 'success');
          
          return { status, time: timeStr, message };
      }

      // السيناريو 2: التعامل الطبيعي مع اليوم الحالي
      if (!todayRecord) {
          // تسجيل دخول جديد لليوم
          newRecord = { id: todayRecordId, employeeId, date: dateStr, checkIn: timeStr, status: 'present', source: 'device', location, photo };
          message = `تم تسجيل دخول ${timeStr}`;
          setAttendanceRecords(prev => [...prev, newRecord]);
          addLog('ATTENDANCE', `Device: ${employeeName}`, `دخول ${timeStr}`);
          upsertSingleRecord(newRecord).then(res => {
             if (res?.error) notify(`فشل حفظ البصمة: ${res.error.message}`, 'error');
          });
          notify(`تم تسجيل حضور ${employeeName}`, 'success');
      } else if (todayRecord.checkIn && !todayRecord.checkOut) {
          // تسجيل خروج لليوم الحالي
          newRecord = { ...todayRecord, checkOut: timeStr, source: 'device', photo: photo || todayRecord.photo };
          message = `تم تسجيل خروج ${timeStr}`;
          status = 'out';
          setAttendanceRecords(prev => prev.map(r => r.id === todayRecordId ? newRecord : r));
          addLog('ATTENDANCE', `Device: ${employeeName}`, `خروج ${timeStr}`);
          upsertSingleRecord(newRecord).then(res => {
             if (res?.error) notify(`فشل حفظ البصمة: ${res.error.message}`, 'error');
          });
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

  // --- Loading Screen ---
  if (isLoading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white gap-4">
              <Loader2 size={48} className="animate-spin text-blue-600" />
              <div className="flex flex-col items-center gap-2">
                  <h2 className="text-xl font-bold">جاري الاتصال بقاعدة البيانات...</h2>
                  <p className="text-slate-400 text-sm">يتم جلب البيانات من Supabase</p>
              </div>
          </div>
      );
  }

  // --- Error Screen ---
  if (cloudError && employees.length === 0) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-red-500 gap-4 p-8 text-center">
              <Cloud size={64} />
              <h2 className="text-2xl font-bold">فشل الاتصال بالنظام السحابي</h2>
              <p className="text-slate-600 dark:text-slate-300 max-w-md">{cloudError}</p>
              <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold mt-4 hover:bg-blue-700">
                  إعادة المحاولة
              </button>
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
    >
      <AnimatePresence mode="wait">
        <PageTransition key={activeTab}>
            {activeTab === 'dashboard' && <Dashboard employees={employees} attendanceRecords={attendanceRecords} config={config} currentUserRole={userRole} currentEmployeeId={currentUser.id} />}
            {activeTab === 'employees' && <EmployeeManager employees={employees} attendanceRecords={attendanceRecords} config={config} userRole={userRole} onUpdateRecord={handleUpdateRecord} onDeleteRecord={handleDeleteRecord} />}
            {activeTab === 'biometric' && <BiometricSimulator employees={employees} onDevicePunch={handleDevicePunch} currentUser={currentUser} config={config} />}
            {activeTab === 'reports' && <Reports employees={employees} attendanceRecords={attendanceRecords} config={config} currentUserRole={userRole} currentEmployeeId={currentUser.id} />}
            {activeTab === 'users' && <UserManagement employees={employees} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
            {activeTab === 'logs' && <ActivityLogs logs={logs} />}
            {activeTab === 'settings' && <Settings config={config} onConfigChange={handleConfigChange} userRole={userRole} onRoleChange={() => {}} onResetData={() => {}} />}
        </PageTransition>
      </AnimatePresence>
    </Layout>
  );
}

export default App;
