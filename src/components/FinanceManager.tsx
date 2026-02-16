
import React, { useState, useMemo, useEffect } from 'react';
import { Employee, CustodyRecord, ExpenseRecord, UserRole, AppConfig } from '../types';
import { upsertCustody, deleteCustody, upsertExpense, deleteExpense } from '../supabaseClient';
import { 
    DollarSign, FileText, TrendingUp, Clock, Briefcase, 
    ArrowRight, Plus, Search, Trash2, CheckCircle, XCircle, 
    Moon, Sun, LogOut, Menu, X, ChevronLeft, ChevronRight, Settings, Tag, Wallet, CreditCard, User
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';

interface FinanceManagerProps {
    employees: Employee[];
    custodies: CustodyRecord[];
    expenses: ExpenseRecord[];
    currentUserRole: UserRole;
    currentUserId: string;
    config: AppConfig; // Added config prop
    onUpdateData: () => void;
    onExit: () => void;
}

// --- DEFAULTS ---
const DEFAULT_CATEGORIES = ['عام', 'وقود', 'صيانة', 'ضيافة', 'خامات', 'نثرية', 'كهرباء', 'إيجار'];

// Custody Specific Defaults
const DEFAULT_CUSTODY_CLASSIFICATIONS = ['عهدة مصنع', 'عهدة مكتب', 'عهدة سيارة', 'عهدة مشروع'];
const DEFAULT_PAYMENT_METHODS = ['كاش (نقدية)', 'تحويل بنكي', 'شيك', 'فودافون كاش'];
const DEFAULT_SOURCES =