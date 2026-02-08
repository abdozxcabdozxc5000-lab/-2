

import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseConfig, Employee, AttendanceRecord, AppConfig, ActivityLog } from './types';

const STORAGE_KEY_SUPABASE = 'mowazeb_supabase_config';

const DEFAULT_PROJECT_URL = 'https://xsotqedbwmhmdoihyrrr.supabase.co';
const DEFAULT_API_KEY = 'sb_publishable_tqhUw7R3GpXY0rTnczsKEw_otnGUvt9';

let supabase: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;

export const getSupabaseConfig = (): SupabaseConfig => {
    try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SUPABASE) : null;
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...parsed, projectUrl: DEFAULT_PROJECT_URL, apiKey: DEFAULT_API_KEY };
        }
    } catch (e) {
        console.error("Error reading supabase config", e);
    }

    return {
        projectUrl: DEFAULT_PROJECT_URL,
        apiKey: DEFAULT_API_KEY,
        isConnected: true
    };
};

export const initSupabase = () => {
    const config = getSupabaseConfig();
    
    if (config.isConnected && config.projectUrl && config.apiKey) {
        try {
            supabase = createClient(config.projectUrl, config.apiKey, {
                auth: { persistSession: false }
            });
            console.log('Supabase client initialized');
        } catch (error) {
            console.error('Failed to initialize Supabase client:', error);
            supabase = null;
        }
    }
};

export const subscribeToRealtime = (onUpdate: () => void) => {
    if (!supabase) return;

    if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel);
    }

    realtimeChannel = supabase.channel('db-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => onUpdate())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'attendance_records' }, () => onUpdate())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'app_config' }, () => onUpdate())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_logs' }, () => onUpdate())
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to Realtime changes');
            }
        });
};

export const downloadAllData = async () => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false, message: 'Not connected', code: null };

    try {
        const [empRes, recRes, confRes, logRes] = await Promise.all([
            supabase.from('employees').select('*'),
            supabase.from('attendance_records').select('*'),
            supabase.from('app_config').select('config').eq('id', 1).maybeSingle(),
            supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500)
        ]);

        if (empRes.error) return { success: false, message: empRes.error.message, code: empRes.error.code };
        if (recRes.error) return { success: false, message: recRes.error.message, code: recRes.error.code };
        
        return {
            success: true,
            employees: empRes.data as Employee[],
            records: recRes.data as AttendanceRecord[],
            config: confRes.data?.config as AppConfig | null,
            logs: logRes.data as ActivityLog[] | [],
            code: null
        };
    } catch (err: any) {
        console.error('Unexpected error during download:', err);
        return { 
            success: false, 
            message: err.message || 'حدث خطأ غير متوقع أثناء تحميل البيانات', 
            code: err.code || 'UNKNOWN' 
        };
    }
};

export const upsertSingleEmployee = async (employee: Employee) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('employees').upsert({
        id: employee.id,
        name: employee.name,
        email: employee.email,
        password: employee.password,
        role: employee.role,
        position: employee.position,
        department: employee.department,
        branch: employee.branch || 'office', // Default to office if not set
        joinDate: employee.joinDate,
        avatar: employee.avatar,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    return { success: !error, error };
};

export const deleteSingleEmployee = async (id: string) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('employees').delete().eq('id', id);
    return { success: !error, error };
};

export const upsertSingleRecord = async (record: AttendanceRecord) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('attendance_records').upsert({
        id: record.id,
        employeeId: record.employeeId,
        date: record.date,
        checkIn: record.checkIn || null,
        checkOut: record.checkOut || null,
        status: record.status,
        note: record.note || null,
        source: record.source || 'manual',
        earlyDeparturePermission: record.earlyDeparturePermission || false,
        photo: record.photo || null,
        location: record.location || null,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    return { success: !error, error };
};

export const deleteSingleRecord = async (id: string) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('attendance_records').delete().eq('id', id);
    return { success: !error, error };
};

export const upsertConfig = async (config: AppConfig) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('app_config').upsert({ 
        id: 1, 
        config: config,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    return { success: !error, error };
};

export const upsertSingleLog = async (log: ActivityLog) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    
    // Explicitly mapping fields to ensure they match the Case-Sensitive columns in DB if created with quotes
    const { error } = await supabase.from('activity_logs').upsert({
        id: log.id,
        "actorName": log.actorName,
        "actorRole": log.actorRole,
        action: log.action,
        target: log.target,
        details: log.details,
        timestamp: log.timestamp,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });

    if (error) {
        console.error("FAILED TO SAVE LOG:", error.message, error.details, log);
    }

    return { success: !error, error };
};

export const uploadAllData = async (employees: Employee[], records: AttendanceRecord[], config: AppConfig) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false, message: 'Not connected' };

    try {
        const timestamp = new Date().toISOString();
        
        if (employees.length > 0) {
             const { error: empError } = await supabase.from('employees').upsert(
                 employees.map(e => ({
                     id: e.id,
                     name: e.name,
                     email: e.email,
                     password: e.password,
                     role: e.role,
                     position: e.position,
                     department: e.department,
                     branch: e.branch || 'office',
                     joinDate: e.joinDate,
                     avatar: e.avatar,
                     created_at: timestamp
                 })), 
                 { onConflict: 'id' }
             );
             if (empError) throw empError;
        }

        if (records.length > 0) {
            const chunkSize = 50;
            for (let i = 0; i < records.length; i += chunkSize) {
                const chunk = records.slice(i, i + chunkSize).map(r => ({
                    id: r.id,
                    employeeId: r.employeeId,
                    date: r.date,
                    checkIn: r.checkIn || null,
                    checkOut: r.checkOut || null,
                    status: r.status,
                    note: r.note || null,
                    source: r.source || 'manual',
                    earlyDeparturePermission: r.earlyDeparturePermission || false,
                    photo: r.photo || null,
                    location: r.location || null,
                    created_at: timestamp
                }));
                const { error: recError } = await supabase.from('attendance_records').upsert(chunk, { onConflict: 'id' });
                if (recError) throw recError;
            }
        }

        const { error: confError } = await supabase.from('app_config').upsert({ 
            id: 1, 
            config, 
            created_at: timestamp 
        }, { onConflict: 'id' });
        if (confError) throw confError;

        return { success: true, message: 'تم رفع البيانات بنجاح' };
    } catch (err: any) {
        return { success: false, message: err.message, code: err.code };
    }
};