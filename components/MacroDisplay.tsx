
import React from 'react';

interface MacroDisplayProps {
  label: string;
  value: number;
  target: number;
  unit: string;
  colorClass: string;
  icon?: React.ReactNode;
}

const MacroDisplay: React.FC<MacroDisplayProps> = ({ label, value, target, unit, colorClass, icon }) => {
  const percentage = Math.min((value / target) * 100, 100);
  
  return (
    <div className="glass p-6 rounded-[32px] transition-all hover:bg-white/5 group border border-white/5 relative overflow-hidden">
      {/* Background Glow */}
      <div 
        className="absolute -right-4 -top-4 w-16 h-16 opacity-10 blur-2xl rounded-full"
        style={{ backgroundColor: colorClass }}
      />
      
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{label}</span>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black text-white group-hover:scale-110 transition-transform origin-right">{value}</span>
            <span className="text-slate-500 text-sm font-bold">{unit}</span>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-slate-900/50 border border-white/5">
          {icon}
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold text-slate-500">
          <span>{Math.round(percentage)}%</span>
          <span>יעד: {target}{unit}</span>
        </div>
        <div className="w-full bg-slate-900/80 rounded-full h-3 p-1 border border-white/5 overflow-hidden">
          <div 
            className="h-full rounded-full transition-all duration-1000 ease-out relative"
            style={{ 
              width: `${percentage}%`, 
              backgroundColor: colorClass,
              boxShadow: `0 0 12px ${colorClass}80` 
            }}
          >
            {/* Animated shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent w-full animate-[shimmer_2s_infinite]" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MacroDisplay;
