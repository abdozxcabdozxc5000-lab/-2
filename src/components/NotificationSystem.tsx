
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

interface NotificationSystemProps {
    notifications: Array<{id: string, message: string, type: 'info' | 'success' | 'error'}>;
    removeNotification: (id: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({ notifications, removeNotification }) => {
    return (
        <div className="fixed bottom-6 left-6 flex flex-col gap-3 z-[200] pointer-events-none max-w-sm w-full print:hidden">
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
                            ? 'bg-white/95 dark:bg-slate-800/95 border-emerald-100 dark:border-emerald-900/30' 
                            : notif.type === 'error' 
                            ? 'bg-white/95 dark:bg-slate-800/95 border-red-100 dark:border-red-900/30' 
                            : 'bg-white/95 dark:bg-slate-800/95 border-blue-100 dark:border-blue-900/30'}
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
    );
};

export default NotificationSystem;
