
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Activity, 
  Search, 
  Settings, 
  LayoutDashboard, 
  UtensilsCrossed, 
  RefreshCw,
  Zap,
  Camera,
  CheckCircle2,
  Flame,
  Dumbbell,
  Timer,
  Watch,
  ArrowRightLeft,
  User,
  Lock,
  LogOut,
  Weight,
  Smartphone,
  Download,
  Share
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Meal, DailyProgress, MealType } from './types';
import { generateDailyMealPlan, analyzeProductForCutting, fetchReplacementMeal } from './services/geminiService';
import MacroDisplay from './components/MacroDisplay';
import MealItem from './components/MealItem';

interface UserProfile {
  name: string;
  weight: number;
  password?: string;
  isLoggedIn: boolean;
}

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('niv_user');
    return saved ? JSON.parse(saved) : { name: '', weight: 90, isLoggedIn: false };
  });

  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [authForm, setAuthForm] = useState({ name: '', weight: 90, password: '' });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'planner' | 'activity' | 'scanner' | 'settings'>('dashboard');
  const [meals, setMeals] = useState<Meal[]>([]);
  const [dailyPlan, setDailyPlan] = useState<Record<string, Meal | null>>({
    [MealType.BREAKFAST]: null,
    [MealType.LUNCH]: null,
    [MealType.DINNER]: null,
    [MealType.SNACK]: null,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [replacingType, setReplacingType] = useState<string | null>(null);
  const [scanning, setScanning] = useState<boolean>(false);
  const [syncingGarmin, setSyncingGarmin] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{score: number, analysis: string, productName: string} | null>(null);
  const [activitySearch, setActivitySearch] = useState<string>('');
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [progress, setProgress] = useState<DailyProgress>({
    consumed: { protein: 0, carbs: 0, fat: 0, calories: 0 },
    target: { protein: user.weight * 2, carbs: user.weight * 1.5, fat: user.weight * 0.8, calories: user.weight * 24 }
  });

  const [garminActivities, setGarminActivities] = useState<{name: string, calories: number, date: string}[]>([]);

  const fetchFullMealPlan = useCallback(async () => {
    if (!user.isLoggedIn) return;
    setLoading(true);
    try {
      const suggestedMeals = await generateDailyMealPlan("חיטוב", user.weight);
      setMeals(suggestedMeals);
      
      const plan: Record<string, Meal | null> = {};
      let totalP = 0, totalC = 0, totalF = 0, totalCal = 0;
      
      Object.values(MealType).forEach(type => {
        const options = suggestedMeals.filter(m => m.type === type);
        const selected = options[Math.floor(Math.random() * options.length)] || null;
        plan[type] = selected;
        if (selected) {
          totalP += selected.protein;
          totalC += selected.carbs;
          totalF += selected.fat;
          totalCal += selected.calories;
        }
      });
      setDailyPlan(plan);
      setProgress(prev => ({
        ...prev,
        consumed: { protein: totalP, carbs: totalC, fat: totalF, calories: totalCal }
      }));
    } catch (err) {
      console.error("Error fetching meals:", err);
    } finally {
      setLoading(false);
    }
  }, [user.isLoggedIn, user.weight]);

  useEffect(() => {
    if (user.isLoggedIn) {
      fetchFullMealPlan();
    }
  }, [user.isLoggedIn, fetchFullMealPlan]);

  useEffect(() => {
    localStorage.setItem('niv_user', JSON.stringify(user));
  }, [user]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'register') {
      const newUser = { ...authForm, isLoggedIn: true };
      setUser(newUser);
    } else {
      setUser(prev => ({ ...prev, name: authForm.name, isLoggedIn: true }));
    }
  };

  const handleLogout = () => {
    setUser(prev => ({ ...prev, isLoggedIn: false }));
    setActiveTab('dashboard');
  };

  const handleReplaceMeal = async (type: MealType) => {
    setReplacingType(type);
    try {
      const newMeal = await fetchReplacementMeal(type, "חיטוב", user.weight);
      if (newMeal) {
        setDailyPlan(prev => ({ ...prev, [type]: newMeal }));
      }
    } catch (err) {
      console.error("Failed to replace meal", err);
    } finally {
      setReplacingType(null);
    }
  };

  const startCamera = async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access denied", err);
      setScanning(false);
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current) return;
    setLoading(true);
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(videoRef.current, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
    try {
      const result = await analyzeProductForCutting(base64);
      setScanResult(result);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setScanning(false);
  };

  useEffect(() => {
    if (activeTab === 'scanner') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [activeTab]);

  const syncGarmin = () => {
    setSyncingGarmin(true);
    setTimeout(() => {
      const newActivity = { 
        name: "ריצת בוקר - Garmin", 
        calories: 645, 
        date: "היום, 07:30" 
      };
      setGarminActivities([newActivity, ...garminActivities]);
      setSyncingGarmin(false);
    }, 2000);
  };

  const chartData = [
    { name: 'Consumed', value: progress.consumed.calories },
    { name: 'Remaining', value: Math.max(0, progress.target.calories - progress.consumed.calories) },
  ];

  const COLORS = ['#10b981', '#1e293b'];

  const sportActivities = [
    { name: "ריצה מהירה (12 קמ\"ש)", burn: 1050, duration: "שעה", level: "עצים", color: "#ef4444" },
    { name: "אימון HIIT אגרסיבי", burn: 850, duration: "45 דק'", level: "עצים", color: "#ef4444" },
    { name: "קיקבוקסינג / איגרוף", burn: 800, duration: "שעה", level: "עצים", color: "#ef4444" },
    { name: "קרוספיט (WOD)", burn: 950, duration: "שעה", level: "עצים", color: "#ef4444" },
    { name: "כדורסל (משחק תחרותי)", burn: 750, duration: "שעה", level: "עצים", color: "#ef4444" },
    { name: "ספינינג עצים", burn: 900, duration: "שעה", level: "עצים", color: "#ef4444" },
    { name: "הליכה מהירה (6 קמ\"ש)", burn: 450, duration: "שעה", level: "בינוני", color: "#22c55e" },
    { name: "אימון כוח משקולות", burn: 400, duration: "שעה", level: "בינוני", color: "#22c55e" },
    { name: "שחייה (קצב רציף)", burn: 550, duration: "שעה", level: "בינוני", color: "#22c55e" },
    { name: "טניס (משחק יחידים)", burn: 600, duration: "שעה", level: "בינוני", color: "#22c55e" },
    { name: "מכשיר חתירה", burn: 650, duration: "שעה", level: "בינוני", color: "#22c55e" },
    { name: "יוגה ויניאסה", burn: 250, duration: "שעה", level: "קליל", color: "#3b82f6" },
    { name: "פילאטיס מכשירים", burn: 280, duration: "שעה", level: "קליל", color: "#3b82f6" },
    { name: "הליכה נינוחה", burn: 300, duration: "שעה", level: "קליל", color: "#3b82f6" },
  ];

  const filteredActivities = sportActivities.filter(act => 
    act.name.toLowerCase().includes(activitySearch.toLowerCase())
  );

  if (!user.isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-['Assistant']">
        <div className="max-w-md w-full glass p-10 rounded-[48px] border border-emerald-500/20 shadow-2xl animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center gap-4 mb-10">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center neon-glow-green">
              <Zap className="text-white w-10 h-10" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter neon-text-green">NiVmAgNiV</h1>
            <p className="text-slate-400 font-bold">{authMode === 'register' ? 'צור חשבון חדש' : 'התחבר למערכת'}</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-4">
              <div className="relative">
                <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder="שם מלא"
                  required
                  value={authForm.name}
                  onChange={(e) => setAuthForm({...authForm, name: e.target.value})}
                  className="w-full glass bg-slate-900 pr-12 pl-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold"
                />
              </div>
              
              {authMode === 'register' && (
                <div className="relative">
                  <Weight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input 
                    type="number" 
                    placeholder="משקל (קג)"
                    required
                    value={authForm.weight}
                    onChange={(e) => setAuthForm({...authForm, weight: Number(e.target.value)})}
                    className="w-full glass bg-slate-900 pr-12 pl-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold"
                  />
                </div>
              )}

              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                <input 
                  type="password" 
                  placeholder="סיסמה"
                  required
                  value={authForm.password}
                  onChange={(e) => setAuthForm({...authForm, password: e.target.value})}
                  className="w-full glass bg-slate-900 pr-12 pl-4 py-4 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500/50 text-white font-bold"
                />
              </div>
            </div>

            <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-4 rounded-2xl font-black text-xl transition-all neon-glow-green transform hover:scale-[1.02]">
              {authMode === 'register' ? 'הירשם כעת' : 'התחבר'}
            </button>
          </form>

          <button 
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className="w-full mt-6 text-slate-500 font-bold hover:text-emerald-400 transition-colors"
          >
            {authMode === 'login' ? 'אין לך חשבון? הירשם כאן' : 'כבר רשום? התחבר כאן'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 lg:pb-0 lg:pr-64 bg-slate-950 font-['Assistant']">
      <nav className="fixed bottom-0 right-0 left-0 lg:top-0 lg:bottom-0 lg:w-64 glass border-t lg:border-t-0 lg:border-l border-slate-800 z-50 flex lg:flex-col justify-around lg:justify-start items-center lg:items-stretch p-4 lg:p-6 gap-4">
        <div className="hidden lg:flex items-center gap-3 mb-10">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center neon-glow-green">
            <Zap className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-white tracking-tighter neon-text-green">NiVmAgNiV</span>
        </div>

        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'דאשבורד' },
          { id: 'planner', icon: UtensilsCrossed, label: 'תפריט יומי' },
          { id: 'activity', icon: Activity, label: 'פעילות' },
          { id: 'scanner', icon: Camera, label: 'סורק' },
          { id: 'settings', icon: Settings, label: 'הגדרות' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex flex-col lg:flex-row items-center gap-3 p-3 rounded-2xl transition-all ${
              activeTab === item.id 
                ? 'bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30' 
                : 'text-slate-400 hover:text-white hover:bg-slate-900/50'
            }`}
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] lg:text-base font-bold">{item.label}</span>
          </button>
        ))}
      </nav>

      <main className="max-w-7xl mx-auto p-4 lg:p-10">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white mb-2">שלום {user.name} 👋</h1>
            <div className="flex items-center gap-3">
              <span className="bg-slate-900 px-3 py-1 rounded-full text-xs font-bold text-slate-400 border border-slate-800">משקל נוכחי: {user.weight} ק"ג</span>
            </div>
          </div>
          <button onClick={() => setActiveTab('settings')} className="glass p-3 rounded-xl text-slate-400 hover:text-emerald-400 transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </header>

        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <section className="lg:col-span-5 glass rounded-[48px] p-10 flex flex-col items-center relative overflow-hidden">
              <h2 className="text-2xl font-black text-white mb-10 w-full text-right">מאזן קלורי</h2>
              <div className="relative w-full aspect-square max-w-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData} cx="50%" cy="50%" innerRadius={90} outerRadius={115} paddingAngle={8} dataKey="value" stroke="none" cornerRadius={10}>
                      {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-5xl font-black text-white tracking-tighter">{progress.consumed.calories}</span>
                  <span className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">קלוריות נצרכו</span>
                </div>
              </div>
              <div className="mt-12 grid grid-cols-2 gap-4 w-full">
                <div className="glass bg-white/5 p-5 rounded-[32px] text-center border border-white/5">
                  <p className="text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-widest">נותרו להיום</p>
                  <p className="text-emerald-400 text-2xl font-black">{Math.max(0, progress.target.calories - progress.consumed.calories)}</p>
                </div>
                <div className="glass bg-white/5 p-5 rounded-[32px] text-center border border-white/5">
                  <p className="text-slate-500 text-[10px] font-bold mb-2 uppercase tracking-widest">משקל יעד</p>
                  <p className="text-blue-400 text-2xl font-black">{user.weight - 5}kg</p>
                </div>
              </div>
            </section>

            <section className="lg:col-span-7 flex flex-col gap-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MacroDisplay label="חלבון" value={progress.consumed.protein} target={progress.target.protein} unit="g" colorClass="#3b82f6" icon={<Dumbbell className="w-5 h-5 text-blue-400" />} />
                <MacroDisplay label="פחמימות" value={progress.consumed.carbs} target={progress.target.carbs} unit="g" colorClass="#fbbf24" icon={<Zap className="w-5 h-5 text-yellow-400" />} />
                <MacroDisplay label="שומן" value={progress.consumed.fat} target={progress.target.fat} unit="g" colorClass="#f472b6" icon={<Flame className="w-5 h-5 text-pink-400" />} />
              </div>
              <div className="glass rounded-[40px] p-8 flex-1 border border-white/5">
                <h2 className="text-xl font-black text-white mb-6">סיכום תזונה יומי</h2>
                <div className="space-y-4">
                  {(Object.values(dailyPlan).filter(Boolean) as Meal[]).map((meal) => (
                    <div key={meal.id} className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/5">
                      <img src={meal.imageUrl} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-sm">{meal.name}</h4>
                        <p className="text-slate-500 text-[10px]">{meal.type}</p>
                      </div>
                      <p className="font-black text-emerald-400">{meal.calories} קל'</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'planner' && (
          <section className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h2 className="text-3xl font-black text-white">התפריט המותאם עבורך</h2>
                <p className="text-slate-500">תכנון יומי מבוסס על משקלך הנוכחי ({user.weight} ק"ג)</p>
              </div>
              <button onClick={fetchFullMealPlan} disabled={loading} className="glass px-6 py-3 rounded-2xl text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 flex items-center gap-2 font-bold transition-all">
                <RefreshCw className={loading ? 'animate-spin' : ''} />
                רענן הכל
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {Object.values(MealType).map((type) => {
                const meal = dailyPlan[type];
                const isReplacing = replacingType === type;
                return (
                  <div key={type} className="flex flex-col gap-4">
                    <div className="flex justify-between items-center px-4">
                      <h3 className="font-black text-white flex items-center gap-2 text-xl">{type}</h3>
                      <button onClick={() => handleReplaceMeal(type)} disabled={isReplacing || loading} className="text-xs font-bold text-slate-400 hover:text-emerald-400 flex items-center gap-2 transition-colors uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-full">
                        <ArrowRightLeft className={`w-4 h-4 ${isReplacing ? 'animate-spin' : ''}`} />
                        החלף
                      </button>
                    </div>
                    <div className="relative group min-h-[500px]">
                      {isReplacing && <div className="absolute inset-0 z-10 glass rounded-[32px] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md"><RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" /></div>}
                      {meal ? <MealItem meal={meal} /> : <div className="glass h-full min-h-[500px] rounded-[32px] flex items-center justify-center border-dashed border-2 border-slate-800"><RefreshCw className="w-10 h-10 text-slate-800 animate-spin" /></div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeTab === 'activity' && (
          <section className="space-y-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h2 className="text-3xl font-black text-white">חיפוש פעילות</h2>
                <p className="text-slate-500">גלה כמה קלוריות תשרוף (מחושב עבור {user.weight} ק"ג)</p>
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input type="text" placeholder="חפש פעילות..." value={activitySearch} onChange={(e) => setActivitySearch(e.target.value)} className="glass w-full pr-12 pl-4 py-3 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-emerald-500/50" />
                </div>
                <button onClick={syncGarmin} disabled={syncingGarmin} className="bg-blue-500 hover:bg-blue-400 text-white px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"><Watch className="w-5 h-5" /> <span>Garmin</span></button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredActivities.length > 0 ? filteredActivities.map((act, idx) => (
                <div key={idx} className="glass rounded-[32px] p-6 border-r-8 transition-all hover:scale-[1.02] hover:bg-white/5" style={{ borderRightColor: act.color }}>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-2xl bg-white/5">
                      {act.color === '#ef4444' ? <Flame className="w-6 h-6 text-red-500" /> : 
                       act.color === '#22c55e' ? <Dumbbell className="w-6 h-6 text-green-500" /> : 
                       <Timer className="w-6 h-6 text-blue-500" />}
                    </div>
                    <div className="text-left font-black">
                      <span className="text-3xl text-white">{act.burn}</span>
                      <span className="text-slate-500 text-[10px] block uppercase tracking-widest">קלוריות</span>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{act.name}</h3>
                  <p className="text-slate-500 text-sm font-bold">{act.level} • {act.duration}</p>
                </div>
              )) : (
                <div className="col-span-full py-20 text-center">
                   <p className="text-slate-500 text-xl font-bold">לא נמצאו פעילויות...</p>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'scanner' && (
          <section className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6">
             <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-white">סורק רכיבים חכם</h2>
              <p className="text-slate-500 font-medium">נתח מוצרים והשפעתם על החיטוב שלך בזמן אמת</p>
            </div>
            <div className="glass rounded-[48px] p-8">
              <div className="relative aspect-video bg-slate-900 rounded-[32px] overflow-hidden mb-8 border-2 border-slate-800">
                {!scanResult ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-0.5 bg-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.8)] animate-pulse" />
                  </>
                ) : (
                  <div className="absolute inset-0 bg-slate-900 flex items-center justify-center p-10 text-center"><CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto" /></div>
                )}
                {loading && <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center"><RefreshCw className="w-12 h-12 text-emerald-500 animate-spin" /></div>}
              </div>
              {!scanResult ? <button onClick={captureAndAnalyze} disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 py-5 rounded-[24px] font-black text-2xl neon-glow-green">נתח מוצר כעת</button> : (
                <div className="space-y-8">
                  <h3 className="text-2xl font-black text-white">{scanResult.productName}</h3>
                  <div className="px-6 py-2 rounded-2xl font-black text-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">ציון חיטוב: {scanResult.score}/100</div>
                  <p className="text-slate-200 text-lg leading-relaxed">{scanResult.analysis}</p>
                  <button onClick={() => { setScanResult(null); startCamera(); }} className="w-full glass py-4 rounded-[24px] text-slate-400 font-bold">סריקה חדשה</button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTab === 'settings' && (
          <section className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6">
            <h2 className="text-3xl font-black text-white">הגדרות חשבון</h2>
            
            <div className="glass p-8 rounded-[40px] border border-emerald-500/30 bg-emerald-500/5 relative overflow-hidden">
              <div className="absolute -left-10 -top-10 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full" />
              <div className="flex flex-col md:flex-row gap-6 items-center relative z-10">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-3xl flex items-center justify-center border border-emerald-500/30 shadow-lg">
                  <Smartphone className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="flex-1 text-center md:text-right">
                  <h3 className="text-xl font-black text-white mb-2">הורד את האפליקציה לטלפון</h3>
                  <p className="text-slate-400 text-sm font-medium leading-relaxed">
                    קבל גישה מהירה מכל מקום ללא צורך בדפדפן. <br/>
                    <span className="text-emerald-400 font-bold">אנדרואיד:</span> לחץ על שלוש הנקודות ובחר "התקן אפליקציה". <br/>
                    <span className="text-emerald-400 font-bold">אייפון:</span> לחץ על <Share className="inline w-4 h-4 mb-1"/> ובחר "הוסף למסך הבית".
                  </p>
                </div>
                <button className="bg-emerald-500 text-slate-950 px-6 py-3 rounded-2xl font-black flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-emerald-500/20">
                  <Download className="w-5 h-5" />
                  התקן כעת
                </button>
              </div>
            </div>

            <div className="glass p-8 rounded-[40px] space-y-6">
              <div className="space-y-4">
                <label className="block text-slate-400 font-bold mr-2">עדכון משקל</label>
                <div className="relative">
                  <Weight className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                  <input 
                    type="number" 
                    value={user.weight}
                    onChange={(e) => setUser({...user, weight: Number(e.target.value)})}
                    className="w-full glass bg-slate-900/50 pr-12 pl-4 py-4 rounded-2xl outline-none border border-white/5 text-white font-bold"
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-white/5 space-y-4">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 py-4 rounded-2xl font-bold transition-all border border-red-500/20"
                >
                  <LogOut className="w-5 h-5" />
                  התנתק מהמערכת
                </button>
                <p className="text-center text-slate-500 text-sm">NiVmAgNiV v1.2.8 - Standard Vite Build</p>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
