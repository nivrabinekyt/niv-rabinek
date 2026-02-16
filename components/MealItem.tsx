
import React, { useState } from 'react';
import { Meal } from '../types';
import { Flame, Droplets, Zap, Dumbbell, Loader2 } from 'lucide-react';

interface MealItemProps {
  meal: Meal;
}

const MealItem: React.FC<MealItemProps> = ({ meal }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fallbackImage = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80";

  return (
    <div className="group relative overflow-hidden rounded-[32px] glass transition-all hover:ring-4 hover:ring-emerald-500/30 flex flex-col h-full bg-slate-900/30 border-white/5">
      {/* Image Section - Adjusted for high quality visibility */}
      <div className="h-64 overflow-hidden relative bg-slate-950">
        {!imageLoaded && !hasError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          </div>
        )}
        <img 
          src={hasError ? fallbackImage : meal.imageUrl} 
          alt={meal.name}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setHasError(true);
            setImageLoaded(true);
          }}
          className={`w-full h-full object-cover transition-all duration-1000 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'} group-hover:scale-105`}
        />
        <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black text-slate-950 border border-emerald-400/50 shadow-lg">
          {meal.type}
        </div>
      </div>
      
      {/* Content Section - Significantly enlarged for better readability */}
      <div className="p-8 flex flex-col flex-1 text-right">
        <h3 className="text-2xl font-black text-white mb-4 group-hover:text-emerald-400 transition-colors leading-tight">
          {meal.name}
        </h3>
        
        <div className="bg-white/5 rounded-2xl p-4 mb-6 border border-white/5 flex-1">
          <p className="text-slate-300 text-lg leading-relaxed font-medium">
            {meal.description}
          </p>
        </div>
        
        {/* Macros Grid */}
        <div className="grid grid-cols-4 gap-3 mt-auto">
          <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-950/80 border border-white/10 shadow-inner group/stat hover:border-orange-500/50 transition-colors">
            <Flame className="w-5 h-5 text-orange-500 mb-2" />
            <span className="text-lg font-black text-white">{meal.calories}</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">קלוריות</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-950/80 border border-white/10 shadow-inner group/stat hover:border-blue-400/50 transition-colors">
            <Dumbbell className="w-5 h-5 text-blue-400 mb-2" />
            <span className="text-lg font-black text-white">{meal.protein}g</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">חלבון</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-950/80 border border-white/10 shadow-inner group/stat hover:border-yellow-400/50 transition-colors">
            <Zap className="w-5 h-5 text-yellow-400 mb-2" />
            <span className="text-lg font-black text-white">{meal.carbs}g</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">פחמימה</span>
          </div>
          <div className="flex flex-col items-center p-3 rounded-2xl bg-slate-950/80 border border-white/10 shadow-inner group/stat hover:border-pink-400/50 transition-colors">
            <Droplets className="w-5 h-5 text-pink-400 mb-2" />
            <span className="text-lg font-black text-white">{meal.fat}g</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">שומן</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MealItem;
