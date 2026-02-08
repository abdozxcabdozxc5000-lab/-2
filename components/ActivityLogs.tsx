
import React, { useState } from 'react';
import { ActivityLog, ActionType } from '../types';
import { Search, Filter, History, Clock } from 'lucide-react';

interface ActivityLogsProps {
    logs: ActivityLog[];
}

const ActivityLogs: React.FC<ActivityLogsProps> = ({ logs }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<ActionType | 'ALL'>('ALL');

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            log.actorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
            log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.details.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesFilter = filterType === 'ALL' || log.action === filterType;

        return matchesSearch && matchesFilter;
    });

    const getActionColor = (action: ActionType) => {
        switch(action) {
            case 'LOGIN': return 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400';
            case 'LOGOUT': return 'text-slate-600 bg-slate-100 dark:bg-slate-700 dark:text-slate-400';
            case 'CREATE': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400';
            case 'UPDATE': return 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400';
            case 'DELETE': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400';
            case 'ATTENDANCE': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400';
            case 'SETTINGS': return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getActionLabel = (action: ActionType) => {
        switch(action) {
            case 'LOGIN': return 'تسجيل دخول';
            case 'LOGOUT': return 'تسجيل خروج';
            case 'CREATE': return 'إضافة';
            case 'UPDATE': return 'تعديل';
            case 'DELETE': return 'حذف';
            case 'ATTENDANCE': return 'حركة حضور';
            case 'SETTINGS': return 'إعدادات';
            default: return action;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <History className="text-blue-600" />
                        سجل الحركات والنظام
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400">تتبع جميع العمليات التي تمت في النظام</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0 w-full md:w-auto">
                    <div className="relative">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="بحث في السجلات..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64 pr-10 pl-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                        />
                    </div>
                    
                    <div className="relative">
                        <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select 
                            value={filterType}
                            onChange={e => setFilterType(e.target.value as any)}
                            className="w-full sm:w-48 pr-10 pl-4 py-2 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white appearance-none"
                        >
                            <option value="ALL">كل العمليات</option>
                            <option value="LOGIN">دخول</option>
                            <option value="LOGOUT">خروج</option>
                            <option value="ATTENDANCE">حضور وانصراف</option>
                            <option value="CREATE">إضافة</option>
                            <option value="UPDATE">تعديل</option>
                            <option value="DELETE">حذف</option>
                            <option value="SETTINGS">إعدادات</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                            <tr>
                                <th className="p-4">نوع الحركة</th>
                                <th className="p-4">القائم بالحركة</th>
                                <th className="p-4">الهدف</th>
                                <th className="p-4">التفاصيل</th>
                                <th className="p-4">الوقت والتاريخ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {filteredLogs.length > 0 ? (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                        <td className="p-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getActionColor(log.action)}`}>
                                                {getActionLabel(log.action)}
                                            </span>
                                        </td>
                                        <td className="p-4 font-bold text-slate-700 dark:text-slate-200">
                                            {log.actorName}
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-300">
                                            {log.target}
                                        </td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400 text-sm max-w-xs truncate" title={log.details}>
                                            {log.details}
                                        </td>
                                        <td className="p-4 text-slate-500 dark:text-slate-400 dir-ltr text-right text-xs">
                                            <div className="flex items-center gap-1 justify-end">
                                                {new Date(log.timestamp).toLocaleDateString('en-GB')}
                                                <span className="w-1 h-1 bg-slate-300 rounded-full mx-1"></span>
                                                {new Date(log.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                                        لا توجد سجلات مطابقة للبحث
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ActivityLogs;
