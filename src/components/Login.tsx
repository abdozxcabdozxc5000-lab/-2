import React, { useState, useEffect } from 'react';
import { Employee } from '../types';
import { Lock, Mail, AlertCircle, Fingerprint, Eye, EyeOff, Sparkles, Sun, Coffee, Zap, Heart, Star, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LoginProps {
    employees: Employee[];
    onLogin: (employee: Employee) => void;
    isPermissionError?: boolean;
}

const MOTIVATIONAL_QUOTES = [
    { text: "تفاءل بما تهوى يكن، فالأفكار لها طاقة عجيبة.", icon: Sparkles },
    { text: "كل صباح هو بداية جديدة، وفرصة لتصنع الأفضل.", icon: Sun },
    { text: "النجاح يبدأ بخطوة بسيطة، استمر ولا تتوقف.", icon: Coffee },
    { text: "ما زرع الله في قلبك رغبة إلا لأنه يعلم أنك ستصل.", icon: Sparkles },
    { text: "القادم أجمل بإذن الله، ثق بالله وتوكل عليه.", icon: Sun },
    { text: "ابتسم، فالحياة مليئة بالأشياء الجميلة التي تنتظرك.", icon: Coffee },
    { text: "أنت أقوى مما تتخيل، وأقدر مما تظن.", icon: Sparkles },
    { text: "اصنع لنفسك يوماً جميلاً ولا تنتظر الظروف.", icon: Sun }
];

const DHIKR_LIST = [
    "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
    "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ",
    "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ وَأَتُوبُ إِلَيْهِ",
    "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
    "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
    "رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي",
    "يَا حَيُّ يَا قَيُّومُ بِرَحْمَتِكَ أَسْتَغِيثُ"
];

const Login: React.FC<LoginProps> = ({ employees, onLogin, isPermissionError }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dailyQuote, setDailyQuote] = useState(MOTIVATIONAL_QUOTES[0]);
    const [currentDhikr, setCurrentDhikr] = useState(DHIKR_LIST[0]);

    useEffect(() => {
        // Load saved credentials if they exist
        const savedEmail = localStorage.getItem('mowazeb_email');
        const savedPassword = localStorage.getItem('mowazeb_password');
        
        if (savedEmail && savedPassword) {
            setEmail(savedEmail);
            setPassword(savedPassword);
            setRememberMe(true);
        }

        const randomQuote = MOTIVATIONAL_QUOTES[Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)];
        setDailyQuote(randomQuote);
        
        const randomDhikr = DHIKR_LIST[Math.floor(Math.random() * DHIKR_LIST.length)];
        setCurrentDhikr(randomDhikr);
        
        const interval = setInterval(() => {
            setCurrentDhikr(prev => {
                const currentIndex = DHIKR_LIST.indexOf(prev);
                return DHIKR_LIST[(currentIndex + 1) % DHIKR_LIST.length];
            });
        }, 8000);
        return () => clearInterval(interval);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        setTimeout(() => {
            const user = employees.find(emp => 
                emp.email.toLowerCase() === email.toLowerCase() && 
                (emp.password === password || (!emp.password && password === '123'))
            );

            if (user) {
                // Handle "Remember Me" (Credentials)
                if (rememberMe) {
                    localStorage.setItem('mowazeb_email', email);
                    localStorage.setItem('mowazeb_password', password);
                } else {
                    localStorage.removeItem('mowazeb_email');
                    localStorage.removeItem('mowazeb_password');
                }
                
                onLogin(user);
            } else {
                setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
                setIsLoading(false);
            }
        }, 800);
    };

    const QuoteIcon = dailyQuote.icon;

    return (
        <div className="min-h-screen w-full flex relative bg-[#060B18] text-white overflow-hidden font-sans" dir="rtl">
            
            {/* --- Mobile Aura Background --- */}
            <div className="lg:hidden absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-25%] left-[-35%] w-[170%] h-[75%] bg-gradient-to-br from-blue-600/25 via-indigo-600/15 to-transparent blur-[150px] rounded-full animate-blob"></div>
                <div className="absolute bottom-[-25%] right-[-35%] w-[150%] h-[65%] bg-gradient-to-tr from-purple-600/15 via-blue-900/20 to-transparent blur-[130px] rounded-full animate-blob animation-delay-4000"></div>
                <div className="absolute inset-0 opacity-[0.05] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
            </div>

            {/* Desktop Static Lights */}
            <div className="hidden lg:block absolute top-[-15%] right-[-10%] w-[500px] h-[500px] bg-blue-600/25 rounded-full blur-[120px] pointer-events-none" />
            <div className="hidden lg:block absolute bottom-[-10%] left-[-15%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Right Side: Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 lg:p-12 z-20 relative">
                
                {/* Mobile Artistic Header */}
                <motion.div 
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="lg:hidden flex flex-col items-center mb-8 space-y-4"
                >
                    <div className="relative group">
                        <div className="absolute inset-0 bg-blue-500 blur-[55px] opacity-45 rounded-full animate-pulse"></div>
                        <div className="w-28 h-28 bg-gradient-to-t from-slate-900 via-slate-800 to-slate-900 rounded-[3.2rem] border-2 border-white/10 flex items-center justify-center shadow-[0_0_50px_rgba(37,99,235,0.4)] relative rotate-3 hover:rotate-0 transition-all duration-700">
                             <Fingerprint size={58} className="text-blue-400 drop-shadow-[0_0_20px_rgba(96,165,250,1)]" />
                             <div className="absolute -top-3 -right-3 w-9 h-9 bg-blue-500/30 backdrop-blur-xl rounded-full border border-white/20 animate-float flex items-center justify-center">
                                <Star size={16} className="text-yellow-400 fill-yellow-400" />
                             </div>
                        </div>
                    </div>
                    <div className="text-center">
                        <h2 className="text-4xl font-black text-white tracking-tighter shadow-sm">مواظب <span className="text-blue-500">برو</span></h2>
                        <div className="flex items-center justify-center gap-2 mt-2">
                             <div className="h-[2px] w-6 bg-gradient-to-l from-transparent to-emerald-500 rounded-full"></div>
                             <p className="text-emerald-400 font-bold text-[12px] uppercase tracking-[0.3em]">اللهم صلِّ على سيدنا محمد</p>
                             <div className="h-[2px] w-6 bg-gradient-to-r from-transparent to-emerald-500 rounded-full"></div>
                        </div>
                    </div>
                </motion.div>

                {/* Login Card */}
                <motion.div 
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full max-w-md space-y-6 lg:space-y-8 bg-white/[0.04] lg:bg-transparent p-8 lg:p-0 rounded-[3.8rem] border border-white/[0.1] lg:border-none backdrop-blur-[60px] lg:backdrop-blur-none shadow-[0_60px_120px_rgba(0,0,0,0.7)] lg:shadow-none relative"
                >
                    {/* Background Nano Shine */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.08] to-indigo-500/[0.08] rounded-[3.8rem] pointer-events-none"></div>
                    
                    {/* Inspiration Widget */}
                    <div className="bg-white/[0.05] border border-white/[0.1] p-5 rounded-[2.8rem] flex items-center gap-4 relative overflow-hidden group shadow-inner">
                        <div className="p-4 bg-blue-600/25 rounded-2xl text-blue-300 shadow-xl border border-blue-400/20">
                            <QuoteIcon size={26} className="group-hover:rotate-12 transition-transform duration-500" />
                        </div>
                        <div className="overflow-hidden">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1 opacity-80">إشراقة يومك</p>
                            <p className="text-[14px] text-slate-100 leading-snug font-bold italic">
                                "{dailyQuote.text}"
                            </p>
                        </div>
                    </div>

                    <div className="text-center lg:text-right space-y-1">
                        <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">سجل حضورك</h1>
                        <p className="text-slate-400 text-sm font-medium opacity-70">خطوة جديدة نحو التميز والإنجاز</p>
                    </div>

                    {error && (
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="bg-red-500/25 border border-red-500/40 text-red-100 p-4 rounded-3xl text-[13px] font-bold flex items-center gap-3 backdrop-blur-xl"
                        >
                            <AlertCircle size={20} className="text-red-400" />
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="relative group">
                            <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <Mail size={18} />
                            </div>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pr-14 pl-6 py-5 bg-black/50 border border-white/[0.08] rounded-[2rem] focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-slate-100 placeholder-slate-600 text-[15px] font-bold shadow-2xl"
                                placeholder="البريد الإلكتروني"
                                required
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors">
                                <Lock size={18} />
                            </div>
                            <input 
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pr-14 pl-14 py-5 bg-black/50 border border-white/[0.08] rounded-[2rem] focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/50 outline-none transition-all text-slate-100 placeholder-slate-600 text-[15px] font-bold shadow-2xl"
                                placeholder="كلمة المرور"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 left-0 pl-6 flex items-center text-slate-500 hover:text-white transition-colors outline-none"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        
                        <div className="flex items-center justify-between px-2">
                             <label className="flex items-center gap-3 cursor-pointer group">
                                <div className="relative">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only" 
                                        checked={rememberMe}
                                        onChange={(e) => setRememberMe(e.target.checked)}
                                    />
                                    <div className={`w-5 h-5 rounded-md border-2 transition-all duration-200 ${rememberMe ? 'bg-blue-600 border-blue-600' : 'border-slate-500 bg-transparent group-hover:border-blue-400'}`}></div>
                                    {rememberMe && <Check size={14} className="absolute top-0.5 left-0.5 text-white" />}
                                </div>
                                <span className="text-sm text-slate-400 font-bold group-hover:text-blue-400 transition-colors">تذكر بياناتي</span>
                            </label>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full relative group/btn overflow-hidden bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white py-5.5 rounded-[2.5rem] font-black text-lg shadow-[0_30px_60px_rgba(37,99,235,0.4)] active:scale-[0.96] transition-all disabled:opacity-70 flex justify-center items-center gap-3 mt-8 border-b-4 border-blue-800/40"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-700"></div>
                            {isLoading ? (
                                <span className="w-7 h-7 border-4 border-white/30 border-t-white rounded-full animate-spin"></span>
                            ) : (
                                <span className="relative z-10 flex items-center gap-3">دخول آمن للنظام <Zap size={20} className="fill-white" /></span>
                            )}
                        </button>
                    </form>

                    {/* Spiritual Mobile Footer */}
                    <div className="lg:hidden text-center pt-10 border-t border-white/[0.1]">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentDhikr}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={{ duration: 0.6 }}
                                className="flex flex-col items-center gap-3"
                            >
                                <div className="p-2 bg-emerald-500/10 rounded-full">
                                    <Heart size={16} className="text-red-500/60 fill-red-500/30 animate-pulse" />
                                </div>
                                <p className="text-[16px] text-emerald-400 font-black tracking-wide leading-relaxed italic px-6 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                                    {currentDhikr}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>

            {/* Left Side: PC View (Unchanged) */}
            <div className="hidden lg:flex w-1/2 relative items-center justify-center z-10 overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-[120%] bg-[#111827] transform -skew-x-6 origin-bottom-left translate-x-16 border-l border-slate-800 shadow-[0_0_100px_rgba(0,0,0,0.5)] z-0">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] opacity-90"></div>
                </div>

                <div className="relative z-10 flex flex-col items-center text-center space-y-8 transform translate-x-8">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-500 blur-[40px] opacity-20 rounded-full"></div>
                        <div className="w-40 h-40 bg-gradient-to-tr from-slate-800 to-slate-700 rounded-[2rem] border border-slate-600/50 flex items-center justify-center shadow-2xl relative rotate-3 hover:rotate-0 transition-transform duration-500">
                             <Fingerprint size={80} className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)]" />
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                        <h2 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-white">
                            نظام إدارة
                        </h2>
                        <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                           الحضور والانصراف
                        </h2>
                    </div>
                    
                    <div className="flex flex-col items-center gap-3">
                        <p className="text-emerald-400/90 text-xl font-bold tracking-wide drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
                            اللهم صلِّ على سيدنا محمد
                        </p>
                        <p className="text-slate-400/80 text-sm font-bold tracking-wide">
                            وفقك الله لما يحبه ويرضاه
                        </p>
                    </div>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes blob {
                    0%, 100% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(40px, -60px) scale(1.15); }
                    66% { transform: translate(-30px, 30px) scale(0.85); }
                }
                .animate-blob {
                    animation: blob 18s infinite alternate ease-in-out;
                }
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.8; }
                    50% { transform: translateY(-12px) rotate(8deg); opacity: 1; }
                }
                .animate-float {
                    animation: float 6s infinite ease-in-out;
                }
                .py-5.5 { padding-top: 1.375rem; padding-bottom: 1.375rem; }
            `}} />
        </div>
    );
};

export default Login;