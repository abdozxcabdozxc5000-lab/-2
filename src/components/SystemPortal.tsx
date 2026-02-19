
import React from 'react';
import { motion } from 'framer-motion';
import { Fingerprint, Banknote, ShieldCheck, ArrowLeft, LogOut, Wallet } from 'lucide-react';
import { UserRole } from '../types';

interface SystemPortalProps {
    onSelectSystem: (system: 'attendance' | 'payroll' | 'finance') => void;
    onLogout: () => void;
    userName: string;
    userRole: UserRole;
}

const SystemPortal: React.FC<SystemPortalProps> = ({ onSelectSystem, onLogout, userName, userRole }) => {
    // Define who can see the Finance Module
    const canAccessFinance = ['owner', 'general_manager', 'accountant'].includes(userRole);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6 relative overflow-hidden" dir="rtl">
            
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none"></div>

            <div className="relative z-10 w-full max-w-6xl">
                <div className="text-center mb-12">
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-block p-4 rounded-full bg-white/5 border border-white/10 mb-6 backdrop-blur-sm"
                    >
                        <ShieldCheck size={48} className="text-emerald-400" />
                    </motion.div>
                    <motion.h1 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight"
                    >
                        بوابة الإدارة المركزية
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-slate-400 text-lg"
                    >
                        مرحباً بك، <span className="text-white font-bold">{userName}</span>. اختر النظام للمتابعة.
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mx-auto justify-center">
                    {/* Attendance Card */}
                    <motion.div
                        whileHover={{ scale: 1.02, translateY: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelectSystem('attendance')}
                        className="group cursor-pointer relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/50 rounded-[2.5rem] p-8 transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/10 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:shadow-[0_0_40px_rgba(37,99,235,0.5)] transition-all duration-300">
                                <Fingerprint size={40} className="text-blue-400 group-hover:text-white" />
                            </div>
                            <h2 className="text-xl font-black text-white mb-2">الحضور والانصراف</h2>
                            <p className="text-slate-400 text-xs leading-relaxed mb-6">
                                متابعة البصمة، الورديات، إحصائيات الغياب والتأخير.
                            </p>
                            <span className="flex items-center gap-2 text-blue-400 font-bold text-sm group-hover:translate-x-[-5px] transition-transform">
                                الدخول للنظام <ArrowLeft size={16} />
                            </span>
                        </div>
                    </motion.div>

                    {/* Finance / Custody Card - RESTRICTED */}
                    {canAccessFinance && (
                        <motion.div
                            whileHover={{ scale: 1.02, translateY: -5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelectSystem('finance')}
                            className="group cursor-pointer relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 rounded-[2.5rem] p-8 transition-all duration-300"
                        >
                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-purple-500/10 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-purple-600/20 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:shadow-[0_0_40px_rgba(168,85,247,0.5)] transition-all duration-300">
                                    <Wallet size={40} className="text-purple-400 group-hover:text-white" />
                                </div>
                                <h2 className="text-xl font-black text-white mb-2">العهد والمصروفات</h2>
                                <p className="text-slate-400 text-xs leading-relaxed mb-6">
                                    إدارة العهد النقدية، تسجيل المصروفات والتسويات.
                                </p>
                                <span className="flex items-center gap-2 text-purple-400 font-bold text-sm group-hover:translate-x-[-5px] transition-transform">
                                    الدخول للنظام <ArrowLeft size={16} />
                                </span>
                            </div>
                        </motion.div>
                    )}

                    {/* Payroll Card */}
                    <motion.div
                        whileHover={{ scale: 1.02, translateY: -5 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onSelectSystem('payroll')}
                        className="group cursor-pointer relative bg-white/5 hover:bg-white/10 border border-white/10 hover:border-emerald-500/50 rounded-[2.5rem] p-8 transition-all duration-300"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-emerald-500/10 rounded-[2.5rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-emerald-600/20 rounded-3xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] transition-all duration-300">
                                <Banknote size={40} className="text-emerald-400 group-hover:text-white" />
                            </div>
                            <h2 className="text-xl font-black text-white mb-2">المرتبات والأجور</h2>
                            <p className="text-slate-400 text-xs leading-relaxed mb-6">
                                حساب الرواتب، الإضافي، الحوافز، وإدارة السلف.
                            </p>
                            <span className="flex items-center gap-2 text-emerald-400 font-bold text-sm group-hover:translate-x-[-5px] transition-transform">
                                الدخول للنظام <ArrowLeft size={16} />
                            </span>
                        </div>
                    </motion.div>
                </div>

                <div className="mt-12 text-center">
                    <button 
                        onClick={onLogout}
                        className="text-slate-500 hover:text-red-400 font-bold flex items-center justify-center gap-2 mx-auto transition-colors"
                    >
                        <LogOut size={18} /> تسجيل الخروج
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemPortal;
