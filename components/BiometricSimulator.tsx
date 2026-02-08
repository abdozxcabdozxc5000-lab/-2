
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Employee, AppConfig } from '../types';
import { Fingerprint, Scan, CheckCircle, AlertTriangle, Radio, Activity, MapPin, Camera, X, RotateCcw, ShieldCheck, AlertOctagon } from 'lucide-react';
import { calculateDistance } from '../utils';
import { DEFAULT_CONFIG } from '../constants';

interface BiometricSimulatorProps {
  employees: Employee[];
  onDevicePunch: (employeeId: string, location?: {lat: number, lng: number, inRange: boolean, distance: number}, photo?: string) => { status: 'in' | 'out' | 'error', time: string, message: string };
  currentUser: Employee; 
  config: AppConfig;
}

const BiometricSimulator: React.FC<BiometricSimulatorProps> = ({ employees, onDevicePunch, currentUser, config }) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [logs, setLogs] = useState<{ id: string; msg: string; type: 'success' | 'error' | 'warning'; time: string }[]>([]);
  const [scanning, setScanning] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Verification States
  const [currentLocation, setCurrentLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [tempLocationData, setTempLocationData] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  
  // Geo Error Modal State
  const [geoError, setGeoError] = useState<{distance: number, limit: number} | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isEmployeeRole = currentUser.role === 'employee';

  // Ensure config has fallback defaults (Safety Merge)
  const safeConfig = useMemo(() => ({
      ...DEFAULT_CONFIG,
      ...config,
      office: { ...DEFAULT_CONFIG.office, ...(config.office || {}) },
      factory: { ...DEFAULT_CONFIG.factory, ...(config.factory || {}) }
  }), [config]);

  // Determine current user's branch for UI display
  const userBranch = currentUser.branch === 'factory' ? 'factory' : 'office';
  const targetSettings = safeConfig[userBranch];

  // Filter employees for Office Manager
  const visibleEmployees = useMemo(() => {
    if (currentUser.role === 'office_manager') {
        return employees.filter(e => e.branch === 'office');
    }
    return employees;
  }, [employees, currentUser.role]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Automatically select the logged-in user to facilitate quick attendance registration for everyone
    if (currentUser && !selectedId) {
        setSelectedId(currentUser.id);
    }
  }, [currentUser, selectedId]);

  // Handle Geolocation Access based on user's branch setting
  useEffect(() => {
      if (targetSettings.locationEnabled) {
          if ('geolocation' in navigator) {
              const watchId = navigator.geolocation.watchPosition(
                  (pos) => {
                      setCurrentLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                      setLocationError(null);
                  },
                  (err) => {
                      let msg = "خطأ في تحديد الموقع";
                      if (err.code === 1) msg = "يرجى السماح بالوصول للموقع الجغرافي (GPS)";
                      setLocationError(msg);
                  },
                  { enableHighAccuracy: true }
              );
              return () => navigator.geolocation.clearWatch(watchId);
          } else {
              setLocationError("المتصفح لا يدعم تحديد الموقع");
          }
      }
  }, [targetSettings.locationEnabled]);

  const startCamera = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                  facingMode: 'user', 
                  width: { ideal: 640 }, 
                  height: { ideal: 480 } 
              } 
          });
          streamRef.current = stream;
          if (videoRef.current) {
              videoRef.current.srcObject = stream;
          }
      } catch (err) {
          console.error("Camera access error:", err);
          alert("خطأ: لا يمكن فتح الكاميرا. يرجى التأكد من إعطاء الصلاحيات اللازمة.");
          setShowCamera(false);
      }
  };

  const stopCamera = () => {
      if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
      }
  };

  const handleStartPunch = () => {
    if (!selectedId) return;

    const employee = employees.find(e => e.id === selectedId);
    if (!employee) return;

    // Get Branch Specific Config dynamically based on the employee being punched
    const empBranch = employee.branch === 'factory' ? 'factory' : 'office';
    const empSettings = safeConfig[empBranch];

    // STEP 1: Strict Geofencing Check
    if (empSettings.locationEnabled) {
        if (locationError) {
            alert(locationError);
            return;
        }
        if (!currentLocation) {
            alert("جارٍ تحديد موقعك... يرجى الانتظار ثوانٍ قليلة.");
            return;
        }

        const distance = calculateDistance(
            currentLocation.lat, 
            currentLocation.lng, 
            empSettings.lat || 0, 
            empSettings.lng || 0
        );

        const allowedRadius = empSettings.radius || 100;
        const inRange = distance <= allowedRadius;
        const locInfo = { lat: currentLocation.lat, lng: currentLocation.lng, inRange, distance };
        setTempLocationData(locInfo);

        if (!inRange) {
             const newLog = {
                id: Date.now().toString(),
                msg: `تنبيه: محاولة تسجيل خارج النطاق (${distance} متر)`,
                type: 'error' as const,
                time: currentTime.toLocaleTimeString('en-GB')
            };
            setLogs(prev => [newLog, ...prev].slice(0, 10));
            
            setGeoError({ distance, limit: allowedRadius });
            return; // STOP EXECUTION HERE
        }
    }

    // STEP 2: Location is OK -> Open Camera
    setShowCamera(true);
    setTimeout(() => startCamera(), 300);
  };

  const capturePhoto = () => {
      if (videoRef.current && canvasRef.current) {
          const context = canvasRef.current.getContext('2d');
          if (context) {
              canvasRef.current.width = videoRef.current.videoWidth;
              canvasRef.current.height = videoRef.current.videoHeight;
              context.translate(canvasRef.current.width, 0);
              context.scale(-1, 1);
              context.drawImage(videoRef.current, 0, 0);
              
              const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.7);
              setCapturedPhoto(dataUrl);
              stopCamera();
          }
      }
  };

  const finalizePunch = () => {
    if (!capturedPhoto) return;
    
    setScanning(true);
    setShowCamera(false);

    setTimeout(() => {
        const result = onDevicePunch(selectedId, tempLocationData, capturedPhoto);
        const emp = employees.find(e => e.id === selectedId);
        
        const newLog = {
            id: Date.now().toString(),
            msg: `${emp?.name}: ${result.message}`,
            type: result.status === 'error' ? 'error' as const : 'success' as const,
            time: result.time
        };

        setLogs(prev => [newLog, ...prev].slice(0, 10)); 
        setScanning(false);
        setCapturedPhoto(null);
        if (!isEmployeeRole) setSelectedId(''); 
    }, 1200);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full animate-fade-in">
        {/* Verification Terminal Interface */}
        <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border-8 border-slate-800 relative overflow-hidden flex flex-col items-center justify-between min-h-[550px]">
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none"></div>
            
            <div className="w-full flex justify-between items-center border-b border-slate-800 pb-4 z-10">
                <div className="flex items-center gap-2 text-emerald-400">
                    <Radio className="animate-pulse" size={16} />
                    <span className="text-xs font-mono tracking-widest">SECURE_LINK_ACTIVE</span>
                </div>
                <div className="flex items-center gap-4">
                     {targetSettings.locationEnabled && (
                         <div className={`flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded bg-black/40 border ${currentLocation ? 'text-blue-400 border-blue-900/50' : 'text-red-400 border-red-900/50'}`}>
                             <MapPin size={12} />
                             {currentLocation ? 'LOC_VERIFIED' : 'LOC_WAITING'}
                         </div>
                     )}
                     <div className="text-slate-400 font-mono text-sm">
                        {currentTime.toLocaleTimeString('en-US', { hour12: false })}
                     </div>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full my-8 z-10">
                 {scanning ? (
                     <div className="text-center animate-pulse">
                         <div className="relative inline-block">
                             <Fingerprint size={120} className="text-emerald-500 mx-auto" />
                             <Scan size={140} className="absolute -top-[10px] -left-[10px] text-blue-500 opacity-50 animate-bounce" />
                         </div>
                         <div className="mt-8 text-emerald-400 font-mono text-lg tracking-widest">معالجة البيانات...</div>
                     </div>
                 ) : (
                     <div className="flex flex-col items-center gap-8 w-full max-w-xs">
                        <div className="w-full space-y-2">
                             <label className="block text-[10px] text-slate-500 uppercase tracking-tighter mr-1">Employee Auth ID</label>
                             <div className="relative">
                                 <select 
                                    value={selectedId}
                                    onChange={e => setSelectedId(e.target.value)}
                                    disabled={isEmployeeRole}
                                    className={`w-full p-4 rounded-2xl outline-none border-2 transition-all appearance-none font-mono text-sm ${isEmployeeRole ? 'bg-slate-800 text-emerald-400 border-emerald-900/30' : 'bg-slate-900 text-white border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                                 >
                                     {!isEmployeeRole && <option value="">-- كود الموظف --</option>}
                                     {visibleEmployees.map(emp => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
                                 </select>
                                 {!isEmployeeRole && <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />}
                             </div>
                        </div>
                        
                        <div className="relative group">
                            <div className={`absolute inset-0 rounded-full blur-2xl transition-all duration-500 ${selectedId ? 'bg-emerald-500/20 group-hover:bg-emerald-500/40' : 'bg-transparent'}`}></div>
                            <button 
                                onClick={handleStartPunch}
                                disabled={!selectedId}
                                className={`relative w-28 h-28 rounded-full border-4 flex items-center justify-center transition-all duration-300 shadow-xl ${selectedId ? 'border-emerald-500 bg-emerald-900/30 text-emerald-400 hover:scale-105 active:scale-90' : 'border-slate-800 bg-slate-800/50 text-slate-700'}`}
                            >
                                <Fingerprint size={52} />
                            </button>
                        </div>
                        
                        <p className="text-slate-500 text-[10px] font-mono uppercase tracking-widest">اضغط لبدء التحقق الثنائي</p>
                     </div>
                 )}
            </div>
            
            <div className="mb-2 text-center z-10">
                 <p className="text-emerald-400/80 font-bold text-lg tracking-widest drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">اللهم صلِّ على سيدنا محمد</p>
            </div>
        </div>

        {/* Live Monitoring Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-xl p-6 flex flex-col h-full overflow-hidden transition-all duration-300">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Activity size={20} className="text-blue-500" /> المراقبة المباشرة
                </h3>
                <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-slate-500">REALTIME_LOGS</span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400/60 py-20">
                        <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mb-4">
                            <Scan size={32} />
                        </div>
                        <p className="text-sm font-medium">في انتظار استلام بيانات من الجهاز...</p>
                    </div>
                ) : (
                    logs.map(log => (
                        <div key={log.id} className={`flex items-center gap-4 p-4 rounded-2xl border-r-4 animate-slide-in-right ${log.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-500 text-emerald-900 dark:text-emerald-200' : 'bg-red-50 dark:bg-red-900/10 border-red-500 text-red-900 dark:text-red-200'}`}>
                             <div className={`p-2 rounded-full ${log.type === 'success' ? 'bg-emerald-200/50 dark:bg-emerald-800/50' : 'bg-red-200/50 dark:bg-red-800/50'}`}>
                                 {log.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                             </div>
                             <div className="flex-1">
                                 <p className="text-xs font-bold leading-relaxed">{log.msg}</p>
                                 <p className="text-[10px] opacity-60 font-mono mt-1">{log.time}</p>
                             </div>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* --- GEO ERROR MODAL --- */}
        {geoError && (
             <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
                 <div className="bg-white dark:bg-slate-800 rounded-[2rem] w-full max-w-sm p-6 shadow-2xl border-2 border-red-500/20 text-center animate-scale-in">
                     <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                         <AlertOctagon size={40} />
                     </div>
                     <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2">خارج النطاق الجغرافي</h3>
                     <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                         عذراً، لا يمكنك تسجيل الحضور والانصراف لأنك خارج نطاق الشركة المسموح به.
                     </p>
                     
                     <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-4 mb-6 space-y-3">
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500">المسافة الحالية:</span>
                             <span className="font-bold text-red-600 font-mono text-base">{geoError.distance} متر</span>
                         </div>
                         <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                             <div className="h-full bg-red-500 w-full animate-pulse"></div>
                         </div>
                         <div className="flex justify-between items-center text-sm">
                             <span className="text-slate-500">الحد المسموح:</span>
                             <span className="font-bold text-emerald-600 font-mono">{geoError.limit} متر</span>
                         </div>
                     </div>

                     <button 
                         onClick={() => setGeoError(null)}
                         className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold shadow-lg shadow-red-500/30 transition-all active:scale-95"
                     >
                         حسناً، فهمت
                     </button>
                 </div>
             </div>
        )}

        {/* --- FULLSCREEN CAMERA VERIFICATION OVERLAY --- */}
        {showCamera && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-xl p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] overflow-hidden w-full max-w-md shadow-2xl border border-white/5 border-slate-100 dark:border-slate-700">
                    <div className="p-6 flex justify-between items-center border-b dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
                            <h3 className="font-bold text-slate-800 dark:text-white">التقاط صورة التحقق</h3>
                        </div>
                        <button onClick={() => { setShowCamera(false); stopCamera(); }} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                    
                    <div className="relative aspect-square bg-black overflow-hidden group">
                        {!capturedPhoto ? (
                            <>
                                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
                                {/* Selfie Guide Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-64 h-80 border-4 border-dashed border-white/40 rounded-[100px] shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]"></div>
                                </div>
                                <div className="absolute bottom-6 left-0 right-0 text-center">
                                    <span className="bg-black/60 text-white text-[10px] px-3 py-1.5 rounded-full font-bold backdrop-blur-md border border-white/20">ضع وجهك داخل الإطار</span>
                                </div>
                            </>
                        ) : (
                            <img src={capturedPhoto} className="w-full h-full object-cover" alt="Captured Verification" />
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <div className="p-8">
                        {!capturedPhoto ? (
                            <button 
                                onClick={capturePhoto} 
                                className="w-full py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-bold flex items-center justify-center gap-3 shadow-2xl shadow-blue-500/30 transition-all active:scale-95"
                            >
                                <Camera size={26} /> التقاط الصورة الآن
                            </button>
                        ) : (
                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={finalizePunch} 
                                    className="w-full py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-3xl font-bold flex items-center justify-center gap-3 shadow-2xl shadow-emerald-500/30 transition-all active:scale-95"
                                >
                                    <CheckCircle size={26} /> اعتماد البصمة والصورة
                                </button>
                                <button 
                                    onClick={() => { setCapturedPhoto(null); startCamera(); }} 
                                    className="w-full py-3 text-slate-500 dark:text-slate-400 font-bold flex items-center justify-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-2xl transition-all"
                                >
                                    <RotateCcw size={18} /> إعادة التقاط الصورة
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default BiometricSimulator;
