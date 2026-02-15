
import React from 'react';
import { LayoutDashboard, Users, FileText, Settings, LogOut, Menu, UserCog, Moon, Sun, Fingerprint, History, Cloud, CloudOff, Info, X, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { UserRole } from '../types';
import { Permissions } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
  userRole: UserRole;
  currentUserName: string;
  currentUserRole: string;
  onLogout: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;
  isSyncing: boolean;
  cloudError?: string | null;
  notifications: Array<{id: string, message: string, type: 'info' | 'success' | 'error'}>;
  removeNotification: (id: string) => void;
  onExit: () => void; // New prop for back navigation
}

const Layout: React.FC<LayoutProps> = ({ 
  children, activeTab, onTabChange, userRole, currentUserName, 
  currentUserRole, onLogout, darkMode, toggleDarkMode,
  isSyncing, cloudError, notifications, removeNotification, onExit
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, visible: true },
    { id: 'employees', label: 'الموظفين والحضور', icon: Users, visible: Permissions.canViewAllDashboard(userRole) }, 
    { id: 'biometric', label: 'جهاز البصمة (Live)', icon: Fingerprint, visible: Permissions.canAccessBiometricDevice(userRole) },
    { id: 'reports', label: 'التقارير', icon: FileText, visible: true },
    { id: 'users', label: 'إدارة المستخدمين', icon: UserCog, visible: Permissions.canManageUsers(userRole) },
    { id: 'logs', label: 'سجل الحركات', icon: History, visible: Permissions.canViewLogs(userRole) },
    { id: 'settings', label: 'الإعدادات', icon: Settings, visible: Permissions.canManageSettings(userRole) },
  ];

  return (
    <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 transition-colors duration-300 overflow-hidden font-sans print:bg-white`}>
      
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden backdrop-blur-sm print:hidden" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 right-0 z-50 w-72 bg-white dark:bg-slate-800 shadow-2xl lg:shadow-none transform transition-transform duration-300 ease-in-out border-l border-slate-100 dark:border-slate-700
        ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static lg:block
        print:hidden
      `}>
        <div className="flex items-center justify-between px-8 h-24 border-b border-slate-50 dark:border-slate-700">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                <Fingerprint size={24} />
              </div>
              <div>
                <h1 className="text-lg font-black text-slate-800 dark:text-white leading-none">برنامج <span className="text-blue-600">الحضور والانصراف</span></h1>
                <p className="text-[10px] text-slate-400 font-bold mt-1 tracking-widest uppercase">Management System</p>
              </div>
           </div>
        </div>
        
        <div className="p-6 m-4 rounded-[2rem] bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg">
                {currentUserName.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <div className="text-sm font-black text-slate-800 dark:text-white truncate">{currentUserName}</div>
                <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase">
                   {currentUserRole === 'general_manager' ? 'المدير العام' : 
                    currentUserRole === 'owner' ? 'صاحب الشركة' :
                    currentUserRole === 'manager' ? 'مدير الإدارة' :
                    currentUserRole === 'accountant' ? 'المحاسب المالي' : 'موظف'}
                </div>
              </div>
            </div>
        </div>

        <nav className="px-4 py-2 space-y-2">
          {menuItems.filter(i => i.visible).map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center w-full px-5 py-4 text-sm font-bold transition-all duration-300 rounded-[1.25rem] group
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/50 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
              >
                <Icon size={20} className={`ml-4 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : ''}`} />
                {item.label}
                {isActive && <div className="mr-auto w-1.5 h-1.5 bg-white rounded-full"></div>}
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
            <button 
                onClick={onLogout}
                className="flex items-center justify-center w-full px-5 py-4 text-sm font-black text-red-500 transition-all rounded-[1.25rem] border-2 border-transparent hover:border-red-100 dark:hover:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/10 group"
            >
                <LogOut size={20} className="ml-3 group-hover:translate-x-1 transition-transform" />
                تسجيل الخروج
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden print:overflow-visible print:block print:h-auto">
        {/* Header */}
        <header className="flex items-center justify-between px-8 h-24 bg-white dark:bg-slate-800 border-b border-slate-50 dark:border-slate-700 shadow-sm z-30 print:hidden">
          <div className="flex items-center gap-4 md:gap-6">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-3 text-slate-600 dark:text-slate-300 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
              <Menu size={24} />
            </button>
            
            {/* Back Button */}
            <button 
                onClick={onExit} 
                className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 transition-colors text-slate-600 dark:text-slate-300 shadow-sm"
                title="العودة للبوابة الرئيسية"
            >
                <ArrowRight size={20} />
            </button>

            <div className="hidden md:flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 text-[11px] font-black transition-all">
                {isSyncing ? (
                  <div className="flex items-center gap-2 text-blue-500">
                    <Cloud className="animate-pulse" size={16} />
                    <span>جاري تحديث البيانات...</span>
                  </div>
                ) : cloudError ? (
                  <div className="flex items-center gap-2 text-red-500">
                    <CloudOff size={16} />
                    <span>خطأ في الربط السحابي</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-500">
                    <Cloud size={16} />
                    <span>متصل بالنظام السحابي</span>
                  </div>
                )}
            </div>
          </div>

          <div className="flex items-center gap-4">
             <button 
                onClick={toggleDarkMode}
                className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 hover:scale-105 transition-all border border-slate-100 dark:border-slate-600"
             >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
                <LayoutDashboard size={20} />
             </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8 relative print:overflow-visible print:p-0 print:block print:h-auto">
            {children}

            {/* Chic Internal Notifications System */}
            <div className="fixed bottom-6 left-6 flex flex-col gap-3 z-[100] pointer-events-none max-w-sm w-full print:hidden">
                <AnimatePresence>
                  {notifications.map(notif => (
                      <motion.div 
                          key={notif.id}
                          initial={{ opacity: 0, y: 50, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, x: -50, scale: 0.95 }}
                          layout
                          className={`
                            pointer-events-auto flex items-center gap-4 p-4 rounded-[1.25rem] shadow-[0_8px_30px_rgb(0,0,0,0.12)] border backdrop-blur-xl
                            ${notif.type === 'success' 
                                ? 'bg-white/80 dark:bg-slate-800/90 border-emerald-100 dark:border-emerald-900/30' 
                                : notif.type === 'error' 
                                ? 'bg-white/80 dark:bg-slate-800/90 border-red-100 dark:border-red-900/30' 
                                : 'bg-white/80 dark:bg-slate-800/90 border-blue-100 dark:border-blue-900/30'}
                          `}
                      >
                          <div className={`
                            w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg
                            ${notif.type === 'success' ? 'bg-emerald-500 text-white' : notif.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}
                          `}>
                              {notif.type === 'success' ? <CheckCircle size={20} /> : notif.type === 'error' ? <AlertTriangle size={20} /> : <Info size={20} />}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                              <h4 className={`text-xs font-bold mb-0.5 ${notif.type === 'success' ? 'text-emerald-600 dark:text-emerald-400' : notif.type === 'error' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                  {notif.type === 'success' ? 'عملية ناجحة' : notif.type === 'error' ? 'تنبيه هام' : 'معلومة'}
                              </h4>
                              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{notif.message}</p>
                          </div>

                          <button onClick={() => removeNotification(notif.id)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors">
                              <X size={16} />
                          </button>
                      </motion.div>
                  ))}
                </AnimatePresence>
            </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
