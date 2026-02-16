
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseConfig, Employee, AttendanceRecord, AppConfig, ActivityLog, Loan, PayrollRecord, CustodyRecord, ExpenseRecord } from './types';

const STORAGE_KEY_SUPABASE = 'mowazeb_supabase_config';

// Fallback defaults (Hardcoded)
const FALLBACK_PROJECT_URL = 'https://xsotqedbwmhmdoihyrrr.supabase.co';
const FALLBACK_API_KEY = 'sb_publishable_tqhUw7R3GpXY0rTnczsKEw_otnGUvt9';

let supabase: SupabaseClient | null = null;
let realtimeChannel: RealtimeChannel | null = null;

export const getSupabaseConfig = (): SupabaseConfig => {
    const envUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
    const envKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    if (envUrl && envKey) {
        return {
            projectUrl: envUrl,
            apiKey: envKey,
            isConnected: true
        };
    }

    try {
        const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_SUPABASE) : null;
        if (stored) {
            const parsed = JSON.parse(stored);
            return { 
                ...parsed, 
                projectUrl: parsed.projectUrl || FALLBACK_PROJECT_URL, 
                apiKey: parsed.apiKey || FALLBACK_API_KEY 
            };
        }
    } catch (e) {
        console.error("Error reading supabase config", e);
    }

    return {
        projectUrl: FALLBACK_PROJECT_URL,
        apiKey: FALLBACK_API_KEY,
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
        .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, () => onUpdate())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'payrolls' }, () => onUpdate())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'custodies' }, () => onUpdate())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => onUpdate())
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
        const [empRes, recRes, confRes, logRes, loanRes, payrollRes, custodyRes, expenseRes] = await Promise.all([
            supabase.from('employees').select('*'),
            supabase.from('attendance_records').select('*'),
            supabase.from('app_config').select('config').eq('id', 1).maybeSingle(),
            supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(500),
            supabase.from('loans').select('*').eq('status', 'active'),
            supabase.from('payrolls').select('*').order('year', { ascending: false }).order('month', { ascending: false }).limit(200),
            supabase.from('custodies').select('*').eq('status', 'active'),
            supabase.from('expenses').select('*').order('date', { ascending: false }).limit(300)
        ]);

        if (empRes.error) return { success: false, message: empRes.error.message };
        
        const employees = (empRes.data || []).map((e: any) => ({
            ...e,
            basicSalary: e.basic_salary ?? e.basicSalary ?? 0,        
            employmentType: e.employment_type ?? e.employmentType ?? 'office',  
            branch: e.branch || 'office'       
        })) as Employee[];

        const records = (recRes.data || []).map((r: any) => ({
            ...r,
            checkOutDate: r.checkout_date || r.checkOutDate || r.date
        })) as AttendanceRecord[];

        return {
            success: true,
            employees: employees,
            records: records,
            config: confRes.data?.config as AppConfig | null,
            logs: logRes.data as ActivityLog[] | [],
            loans: loanRes.data as Loan[] | [],
            payrolls: payrollRes.data as PayrollRecord[] | [],
            custodies: custodyRes.data as CustodyRecord[] | [],
            expenses: expenseRes.data as ExpenseRecord[] | [],
            code: null
        };
    } catch (err: any) {
        console.error('Unexpected error during download:', err);
        return { 
            success: false, 
            message: err.message || 'حدث خطأ غير متوقع', 
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
        branch: employee.branch || 'office',
        joinDate: employee.joinDate,
        avatar: employee.avatar,
        basic_salary: employee.basicSalary || 0,
        employment_type: employee.employmentType || 'office',
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    
    return { success: !error, error };
};

export const upsertSingleRecord = async (record: AttendanceRecord) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    
    const payload = {
        id: record.id,
        "employeeId": record.employeeId,
        date: record.date,
        "checkIn": record.checkIn || null,
        "checkOut": record.checkOut || null,
        "checkout_date": record.checkOutDate || record.date,
        status: record.status,
        note: record.note || null,
        source: record.source || 'manual',
        "earlyDeparturePermission": record.earlyDeparturePermission || false,
        photo: record.photo || null,
        location: record.location || null,
        created_at: new Date().toISOString()
    };

    const { error } = await supabase.from('attendance_records').upsert(payload, { onConflict: 'id' });
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
    
    const { error } = await supabase.from('activity_logs').upsert({
        ...log,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });

    return { success: !error, error };
};

// --- PAYROLL & LOANS ---

export const upsertLoan = async (loan: Loan) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('loans').upsert({
        ...loan,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    return { success: !error, error };
};

export const deleteLoan = async (id: string) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('loans').delete().eq('id', id);
    return { success: !error, error };
};

export const upsertPayroll = async (payroll: PayrollRecord) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('payrolls').upsert({
        ...payroll,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    return { success: !error, error };
};

export const deletePayrollArchive = async (month: number, year: number) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('payrolls').delete().eq('month', month).eq('year', year);
    return { success: !error, error };
};

// --- CUSTODY & EXPENSES (FINANCE) ---

export const upsertCustody = async (custody: CustodyRecord) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('custodies').upsert({
        ...custody,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    return { success: !error, error };
};

export const deleteCustody = async (id: string) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('custodies').delete().eq('id', id);
    return { success: !error, error };
};

export const upsertExpense = async (expense: ExpenseRecord) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('expenses').upsert({
        ...expense,
        created_at: new Date().toISOString()
    }, { onConflict: 'id' });
    return { success: !error, error };
};

export const deleteExpense = async (id: string) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    return { success: !error, error };
};

export const uploadAllData = async (employees: Employee[], records: AttendanceRecord[], config: AppConfig) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false, message: 'Not connected' };
    return { success: true };
};

export const deleteSingleEmployee = async (id: string) => {
    if (!supabase) initSupabase();
    if (!supabase) return { success: false };
    const { error } = await supabase.from('employees').delete().eq('id', id);
    return { success: !error, error };
};
