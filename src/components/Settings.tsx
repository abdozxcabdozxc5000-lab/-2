
import React, { useState, useEffect } from 'react';
import { AppConfig, UserRole, Holiday, BranchSettings } from '../types';
import { Save, CheckCircle, Calendar, Plus, X, Clock, MapPin, Target, ShieldCheck, Building, Factory, Locate, Search, ExternalLink, Navigation, Link as LinkIcon, AlertCircle, Crosshair } from 'lucide-react';
import { Permissions } from '../utils';
import { DEFAULT_CONFIG } from '../constants';
import { MapContainer, TileLayer, Circle, useMapEvents, useMap } from 'react-leaflet';

interface SettingsProps {
  config: AppConfig;
  onConfigChange: (config: AppConfig) => void;
  userRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onResetData?: () => void;
  darkMode?: boolean;
}

// Component to handle map clicks
const LocationMarker = ({ onChange }: { onChange: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Component to re-center map when coordinates change externally
const RecenterMap = ({ lat, lng }: { lat: number, lng: number }) => {
  const map = useMap();
  useEffect(() => {
    if (lat && lng) {
        map.flyTo([lat, lng], 16, { duration: 1.5 });
    }
  }, [lat, lng, map]);
  return null;
};

const Settings: React.FC<SettingsProps> = ({ config, onConfigChange, userRole, darkMode }) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>({
      ...DEFAULT_CONFIG,
      ...config,
      office: { ...DEFAULT_CONFIG.office, ...(config.office || {}) },
      factory: { ...DEFAULT_CONFIG.factory, ...(config.factory || {}) },
  });
  
  const [showSaved, setShowSaved] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [activeTab, setActiveTab] = useState<'office' | 'factory'>('office');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  
  const [newHoliday, setNewHoliday] = useState<{name: string, startDate: string, endDate: string}>({
      name: '', startDate: '', endDate: ''
  });

  useEffect(() => {
    setLocalConfig({
        ...DEFAULT_CONFIG,
        ...config,
        office: { ...DEFAULT_CONFIG.office, ...(config.office || {}) },
        factory: { ...DEFAULT_CONFIG.factory, ...(config.factory || {}) },
    });
  }, [config]);

  const handleSave = () => {
    onConfigChange(localConfig);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const updateBranchSettings = (branch: 'office' | 'factory', updates: Partial<BranchSettings>) => {
      setLocalConfig(prev => ({
          ...prev,
          [branch]: {
              ...prev[branch],
              ...updates
          }
      }));
  };

  const toggleWeekendDay = (branch: 'office' | 'factory', dayIndex: number) => {
      const currentDays = localConfig[branch].weekendDays || [];
      let newDays;
      if (currentDays.includes(dayIndex)) {
          newDays = currentDays.filter(d => d !== dayIndex);
      } else {
          newDays = [...currentDays, dayIndex];
      }
      updateBranchSettings(branch, { weekendDays: newDays });
  };

  const handleAddHoliday = () => {
      if(!newHoliday.name || !newHoliday.startDate || !newHoliday.endDate) return;
      const holiday: Holiday = {
          id: Date.now().toString(),
          name: newHoliday.name,
          startDate: newHoliday.startDate,
          endDate: newHoliday.endDate
      };
      setLocalConfig(prev => ({ ...prev, holidays: [...(prev.holidays || []), holiday] }));
      setNewHoliday({ name: '', startDate: '', endDate: '' });
  };

  const getCurrentLocation = (branch: 'office' | 'factory') => {
      setIsLocating(true);
      if ('geolocation' in navigator) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  updateBranchSettings(branch, {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                  });
                  setIsLocating(false);
              },
              (error) => {
                  alert("فشل في جلب الموقع. تأكد من تفعيل الـ GPS والسماح للمتصفح بالوصول للموقع.");
                  setIsLocating(false);
              },
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
          );
      } else {
          alert("المتصفح لا يدعم تحديد الموقع");
          setIsLocating(false);
      }
  };

  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`);
        const data = await response.json();
        if (data && data.length > 0) {
            const { lat, lon } = data[0];
            updateBranchSettings(activeTab, { lat: parseFloat(lat), lng: parseFloat(lon) });
        } else {
            alert('لم يتم العثور على الموقع. حاول كتابة اسم المدينة أو المنطقة.');
        }
    } catch (e) {
        alert('حدث خطأ أثناء البحث. تأكد من اتصالك بالإنترنت.');
    } finally {
        setIsSearching(false);
    }
  };

  const handleExtractFromGoogleUrl = () => {
      if (!googleMapsUrl) return;

      const regexLatLong = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
      const regexQ = /q=(-?\d+\.\d+),(-?\d+\.\d+)/;
      const regexSearch = /search\/(-?\d+\.\d+),(-?\d+\.\d+)/;

      let match = googleMapsUrl.match(regexLatLong) || googleMapsUrl.match(regexQ) || googleMapsUrl.match(regexSearch);

      if (match && match.length >= 3) {
          const lat = parseFloat(match[1]);
          const lng = parseFloat(match[2]);
          updateBranchSettings(activeTab, { lat, lng });
          setGoogleMapsUrl(''); // Clear input on success
          alert('تم استخراج الموقع بنجاح!');
      } else {
          alert('تعذر استخراج الإحداثيات من الرابط. تأكد من نسخ رابط كامل من شريط العنوان في المتصفح بعد تحديد الموقع.');
      }
  };

  const handleMapClick = (lat: number, lng: number) => {
      updateBranchSettings(activeTab, { lat, lng });
  };

  if (!Permissions.canManageSettings(userRole)) {
      return (
        <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
            <ShieldCheck size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">عذراً، ليس لديك صلاحية الوصول للإعدادات.</h2>
        </div>
      );
  }

  const daysOfWeek = [
      { id: 6, label: 'السبت' }, { id: 0, label: 'الأحد' }, { id: 1, label: 'الاثنين' },
      { id: 2, label: 'الثلاثاء' }, { id: 3, label: 'الأربعاء' }, { id: 4, label: 'الخميس' },
      { id: 5, label: 'الجمعة' }
  ];

  const currentLat = localConfig[activeTab].lat || 30.0444; // Default to Cairo if 0
  const currentLng = localConfig[activeTab].lng || 31.2357;
  const currentRadius = localConfig[activeTab].radius || 100;

  // Use CartoDB tiles for a much cleaner, professional look. Supports Dark Mode.
  const tileLayerUrl = darkMode 
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

  return (
    <div className="space-y-8 pb-24 animate-fade-in">
      <div className="flex items-center justify-between">
          <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white">إعدادات النظام (حسب الفرع)</h2>
          {showSaved && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-full border border-emerald-100 dark:border-emerald-800 animate-pulse-soft">
                  <CheckCircle size={18} />
                  <span className="text-sm font-bold">تم حفظ التغييرات سحابياً</span>
              </div>
          )}
      </div>

      {/* --- Global Settings (Grace Period & Penalty) --- */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <ShieldCheck className="text-indigo-500" size={20} /> إعدادات عامة (تطبق على الكل)
          </h3>
          <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-1 p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800">
                    <label className="block text-sm font-bold text-indigo-700 dark:text-indigo-400 mb-2 flex items-center gap-2">
                        <Target size={18} />
                        فترة السماح بالدقائق
                    </label>
                    <div className="flex items-center gap-4">
                        <input 
                            type="number" min="0" max="60"
                            value={localConfig.gracePeriodMinutes || 0}
                            onChange={e => setLocalConfig({...localConfig, gracePeriodMinutes: parseInt(e.target.value) || 0})}
                            className="w-full p-3 border rounded-xl outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white font-bold text-center"
                        />
                    </div>
              </div>
              <div className="flex-1 p-4 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800">
                    <label className="block text-sm font-bold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                        <X size={18} />
                        جزاء الغياب (نقاط)
                    </label>
                    <div className="flex items-center gap-4">
                        <input 
                            type="number" min="0" max="50"
                            value={localConfig.penaltyValue || 0}
                            onChange={e => setLocalConfig({...localConfig, penaltyValue: parseInt(e.target.value) || 0})}
                            className="w-full p-3 border rounded-xl outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white font-bold text-center"
                        />
                    </div>
              </div>
          </div>
      </div>

      {/* --- Branch Settings Tabs --- */}
      <div className="flex gap-4 p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl max-w-md">
          <button 
            onClick={() => setActiveTab('office')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'office' ? 'bg-white dark:bg-slate-700 shadow-md text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}
          >
              <Building size={18} /> المكتب الرئيسي
          </button>
          <button 
            onClick={() => setActiveTab('factory')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${activeTab === 'factory' ? 'bg-white dark:bg-slate-700 shadow-md text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}
          >
              <Factory size={18} /> المصنع
          </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* --- Location Settings for Active Branch --- */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 transition-all animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
                <div className={`p-3 rounded-2xl ${activeTab === 'office' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}>
                    <MapPin size={24} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                    الموقع الجغرافي ({activeTab === 'office' ? 'المكتب' : 'المصنع'})
                </h3>
            </div>
            
            <div className="space-y-6">
                 <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700">
                     <label className="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none">
                         تفعيل التحقق من الموقع
                     </label>
                     <input 
                        type="checkbox"
                        checked={localConfig[activeTab].locationEnabled}
                        onChange={e => updateBranchSettings(activeTab, { locationEnabled: e.target.checked })}
                        className="w-6 h-6 text-blue-600 rounded-lg focus:ring-blue-500 cursor-pointer"
                     />
                 </div>

                 {localConfig[activeTab].locationEnabled && (
                    <div className="space-y-4 animate-slide-up">
                         
                         {/* --- Google Maps Link Import Section --- */}
                         <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800/30">
                            <div className="flex items-center gap-2 mb-3 text-blue-700 dark:text-blue-300 font-bold text-sm">
                                <LinkIcon size={16} /> استيراد من خرائط جوجل
                            </div>
                            <div className="flex flex-col gap-3">
                                <a 
                                    href="https://www.google.com/maps" 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="text-xs flex items-center gap-1 text-slate-500 hover:text-blue-600 font-bold"
                                >
                                    <ExternalLink size={12} /> افتح Google Maps في نافذة جديدة
                                </a>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={googleMapsUrl}
                                        onChange={e => setGoogleMapsUrl(e.target.value)}
                                        placeholder="الصق رابط الموقع هنا..."
                                        className="flex-1 p-2 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white text-xs"
                                    />
                                    <button 
                                        onClick={handleExtractFromGoogleUrl}
                                        disabled={!googleMapsUrl}
                                        className="px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        استخراج
                                    </button>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                    * حدد المكان على الخريطة، انسخ الرابط من المتصفح (URL) بالكامل، ثم الصقه هنا.
                                </div>
                            </div>
                         </div>

                         {/* Search Box */}
                         <div className="relative flex gap-2">
                            <div className="relative flex-1">
                                <input 
                                    type="text" 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearchLocation()}
                                    placeholder="أو ابحث هنا (مدينة، منطقة)..."
                                    className="w-full pl-4 pr-10 py-3 rounded-xl border border-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                                />
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            </div>
                            <button 
                                onClick={handleSearchLocation}
                                disabled={isSearching}
                                className="px-4 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white rounded-xl hover:bg-slate-300 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors font-bold text-sm"
                            >
                                {isSearching ? '...' : 'بحث'}
                            </button>
                         </div>

                         {/* Interactive Map */}
                         <div className="relative w-full h-96 rounded-3xl overflow-hidden shadow-2xl border-4 border-slate-200 dark:border-slate-700 z-0 group">
                             {typeof window !== 'undefined' && (
                                <MapContainer 
                                    center={[currentLat, currentLng]} 
                                    zoom={15} 
                                    style={{ height: '100%', width: '100%' }}
                                    scrollWheelZoom={true}
                                >
                                    <TileLayer
                                        attribution={attribution}
                                        url={tileLayerUrl}
                                    />
                                    {/* Visual Circle for Radius - Styled as a Radar Zone */}
                                    <Circle 
                                        center={[currentLat, currentLng]}
                                        pathOptions={{ 
                                            fillColor: activeTab === 'office' ? '#3b82f6' : '#f59e0b', 
                                            color: activeTab === 'office' ? '#2563eb' : '#d97706', 
                                            weight: 2, 
                                            dashArray: '10, 10', 
                                            fillOpacity: 0.15 
                                        }}
                                        radius={currentRadius}
                                    />
                                    {/* Center Pulse Marker */}
                                    <Circle 
                                        center={[currentLat, currentLng]}
                                        pathOptions={{ 
                                            fillColor: activeTab === 'office' ? '#2563eb' : '#d97706', 
                                            color: '#fff', 
                                            weight: 3, 
                                            fillOpacity: 1 
                                        }}
                                        radius={5}
                                    />
                                    
                                    <LocationMarker onChange={handleMapClick} />
                                    <RecenterMap lat={currentLat} lng={currentLng} />
                                </MapContainer>
                             )}
                             
                             {/* Floating Crosshair overlay for better UX */}
                             <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-[400] opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Crosshair className="text-slate-500/50" size={32} strokeWidth={1} />
                             </div>

                             <button 
                                onClick={() => getCurrentLocation(activeTab)}
                                disabled={isLocating}
                                className="absolute bottom-6 right-6 z-[400] bg-white dark:bg-slate-800 text-slate-700 dark:text-white p-4 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 transition-all"
                                title="تحديد موقعي الحالي"
                             >
                                 {isLocating ? <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div> : <Locate size={24} className="text-blue-600" />}
                             </button>

                             <div className="absolute top-4 left-4 z-[400] bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-2 rounded-xl text-xs font-bold shadow-lg border border-slate-200 dark:border-slate-700 pointer-events-none flex items-center gap-2">
                                 <Navigation size={14} className="text-blue-500" />
                                 اضغط على الخريطة لتغيير نقطة المركز
                             </div>
                         </div>
                         
                         <div className="flex justify-between items-center text-xs px-1">
                             <div className="flex items-center gap-2 font-mono">
                                 <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">Lat: {currentLat.toFixed(6)}</span>
                                 <span className="text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">Lng: {currentLng.toFixed(6)}</span>
                             </div>
                         </div>

                         <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700/50">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">نصف القطر (متر)</label>
                                <input 
                                    type="number" min="10"
                                    value={localConfig[activeTab].radius || 100}
                                    onChange={e => updateBranchSettings(activeTab, { radius: parseInt(e.target.value) })}
                                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500/50 outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white text-sm font-bold"
                                />
                            </div>
                         </div>
                    </div>
                 )}
            </div>
        </div>

        {/* --- Work Time & Weekends for Active Branch --- */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 transition-all animate-fade-in">
            <div className="flex items-center gap-3 mb-8">
                <div className={`p-3 rounded-2xl ${activeTab === 'office' ? 'bg-blue-50 text-blue-500' : 'bg-amber-50 text-amber-500'}`}>
                    <Clock size={24} />
                </div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">
                    مواعيد العمل والإجازات ({activeTab === 'office' ? 'المكتب' : 'المصنع'})
                </h3>
            </div>
            
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">وقت البدء</label>
                        <input 
                            type="time" 
                            value={localConfig[activeTab].workStartTime}
                            onChange={e => updateBranchSettings(activeTab, { workStartTime: e.target.value })}
                            className="w-full p-4 border rounded-xl outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white font-bold text-center text-lg"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">وقت الانتهاء</label>
                        <input 
                            type="time" 
                            value={localConfig[activeTab].workEndTime}
                            onChange={e => updateBranchSettings(activeTab, { workEndTime: e.target.value })}
                            className="w-full p-4 border rounded-xl outline-none dark:bg-slate-900 dark:border-slate-700 dark:text-white font-bold text-center text-lg"
                        />
                    </div>
                </div>
                
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                     <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">أيام الإجازة الأسبوعية</label>
                     <div className="flex flex-wrap gap-2">
                        {daysOfWeek.map(day => (
                            <button
                                key={day.id}
                                onClick={() => toggleWeekendDay(activeTab, day.id)}
                                className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
                                    (localConfig[activeTab].weekendDays || []).includes(day.id)
                                    ? 'bg-red-50 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400'
                                    : 'bg-white border-slate-200 text-slate-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'
                                }`}
                            >
                                {day.label}
                            </button>
                        ))}
                     </div>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-6 flex items-center gap-3">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl text-purple-500">
                <Calendar size={24} />
              </div>
              الإجازات الرسمية (مشتركة)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 items-end bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
              <div className="md:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 mb-2">اسم الإجازة</label>
                  <input 
                      type="text" placeholder="مثال: عيد الفطر"
                      value={newHoliday.name}
                      onChange={e => setNewHoliday({...newHoliday, name: e.target.value})}
                      className="w-full p-3 border rounded-xl outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
              </div>
              <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2">من تاريخ</label>
                   <input 
                      type="date"
                      value={newHoliday.startDate}
                      onChange={e => setNewHoliday({...newHoliday, startDate: e.target.value})}
                      className="w-full p-3 border rounded-xl outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
              </div>
              <div>
                   <label className="block text-xs font-bold text-slate-500 mb-2">إلى تاريخ</label>
                   <input 
                      type="date"
                      value={newHoliday.endDate}
                      onChange={e => setNewHoliday({...newHoliday, endDate: e.target.value})}
                      className="w-full p-3 border rounded-xl outline-none dark:bg-slate-800 dark:border-slate-700 dark:text-white"
                  />
              </div>
              <button 
                onClick={handleAddHoliday}
                className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 flex items-center justify-center gap-2 h-[48px] transition-all font-bold shadow-lg"
              >
                  <Plus size={18} /> إضافة الإجازة
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {localConfig.holidays?.map(h => (
                  <div key={h.id} className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm group hover:border-purple-200 transition-all">
                      <div>
                          <div className="font-extrabold text-slate-800 dark:text-slate-200 text-sm">{h.name}</div>
                          <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                              <Calendar size={10} /> {h.startDate} ➔ {h.endDate}
                          </div>
                      </div>
                      <button 
                        onClick={() => setLocalConfig(prev => ({ ...prev, holidays: prev.holidays.filter(item => item.id !== h.id) }))} 
                        className="text-slate-300 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-all"
                      >
                          <X size={18} />
                      </button>
                  </div>
              ))}
          </div>
      </div>

      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
         <button 
            onClick={handleSave}
            className={`flex items-center gap-4 px-10 py-5 ${showSaved ? 'bg-emerald-600' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-[2rem] shadow-2xl transition-all active:scale-95 font-black text-lg border-4 border-white dark:border-slate-900`}
         >
            {showSaved ? <CheckCircle size={24} /> : <Save size={24} />}
            {showSaved ? 'تم الحفظ والمزامنة' : 'حفظ الإعدادات سحابياً'}
         </button>
      </div>
    </div>
  );
};

export default Settings;
