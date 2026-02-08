
// This file is DEPRECATED.
// The application now relies entirely on Supabase for data persistence.
// LocalStorage logic has been removed to enforce cloud-only operation.

import { ActivityLog, Employee } from './types';

// Dummy services to satisfy any legacy imports during build process.
// The main logic has moved to App.tsx using supabaseClient.ts

export const LogService = {
    getAll: (): ActivityLog[] => [],
    add: (log: ActivityLog): void => {}
};

export const EmployeeService = {
    getAll: (): Employee[] => [],
    add: (employee: Omit<Employee, 'id'>): Employee => ({ ...employee, id: 'dummy' }),
    delete: (id: string): void => {},
    update: (id: string, updates: Partial<Employee>): void => {}
};

export const initializeDatabase = () => {
    return {
        employees: [],
        records: [],
        config: null,
        logs: []
    };
};
