import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'red' | 'green' | 'yellow';
  darkMode: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, darkMode }) => {
  const darkStyles = {
    blue: { bg: 'bg-blue-600', glow: 'shadow-[0_0_15px_rgba(37,99,235,0.5)]', border: 'border-blue-500/30' },
    red: { bg: 'bg-red-600', glow: 'shadow-[0_0_15px_rgba(220,38,38,0.5)]', border: 'border-red-500/30' },
    green: { bg: 'bg-emerald-500', glow: 'shadow-[0_0_15px_rgba(16,185,129,0.5)]', border: 'border-emerald-500/30' },
    yellow: { bg: 'bg-orange-500', glow: 'shadow-[0_0_15px_rgba(249,115,22,0.5)]', border: 'border-orange-500/30' }
  };

  const lightStyles = {
    blue: { iconBg: 'bg-cyan-100 text-cyan-600', border: 'border-cyan-100' },
    red: { iconBg: 'bg-rose-100 text-rose-600', border: 'border-rose-100' },
    green: { iconBg: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100' },
    yellow: { iconBg: 'bg-amber-100 text-amber-600', border: 'border-amber-100' }
  };

  if (darkMode) {
    const style = darkStyles[color];
    return (
        <div className={`relative overflow-hidden rounded-2xl p-6 transition-all duration-300 bg-slate-800/40 backdrop-blur-md border border-white/10 group hover:-translate-y-1`}>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${style.bg} ${style.glow}`}></div>
          <div className="flex flex-col items-center text-center">
            <div className={`mb-4 p-4 rounded-2xl text-white ${style.bg} ${style.glow} bg-opacity-90`}>
              {React.isValidElement(icon) ? React.cloneElement(icon as any, { size: 28 }) : icon}
            </div>
            <h3 className="text-gray-300 text-base font-bold mb-2">{title}</h3>
            <p className="text-3xl font-black text-white tracking-tight">{value}</p>
          </div>
        </div>
    );
  } else {
    const style = lightStyles[color];
    return (
        <div className={`relative p-6 rounded-3xl bg-white transition-transform duration-300 hover:-translate-y-2 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] border-2 border-white ring-1 ring-slate-100/50`}>
             <div className="flex flex-col items-center text-center">
                <div className={`mb-4 p-5 rounded-2xl ${style.iconBg} shadow-sm`}>
                    {React.isValidElement(icon) ? React.cloneElement(icon as any, { size: 32 }) : icon}
                </div>
                <h3 className="text-slate-500 text-sm font-bold mb-1 uppercase">{title}</h3>
                <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
             </div>
        </div>
    )
  }
};

export default StatCard;