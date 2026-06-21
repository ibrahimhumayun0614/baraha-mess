import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type { MessSettings, Member, Expense, AuditLog } from '@shared/types';

export const QUERY_KEYS = {
  members: ['members'] as const,
  messSettings: ['messSettings'] as const,
  expenses: (filters?: Record<string, string>) => ['expenses', filters ?? {}] as const,
  auditLogs: ['auditLogs'] as const,
  messStats: ['messStats'] as const,
};

export function useMembers() {
  return useQuery<Member[]>({
    queryKey: QUERY_KEYS.members,
    queryFn: () => api('/api/members'),
    placeholderData: [],
  });
}

export function useMessSettings() {
  return useQuery<MessSettings>({
    queryKey: QUERY_KEYS.messSettings,
    queryFn: () => api('/api/mess/settings'),
  });
}

export function useExpenses(filters?: Record<string, string>) {
  const params = filters ? `?${new URLSearchParams(filters).toString()}` : '';
  return useQuery<Expense[]>({
    queryKey: QUERY_KEYS.expenses(filters),
    queryFn: () => api(`/api/expenses${params}`),
    placeholderData: [],
  });
}

export function useAuditLogs(enabled = true) {
  return useQuery<AuditLog[]>({
    queryKey: QUERY_KEYS.auditLogs,
    queryFn: () => api('/api/audit-logs'),
    placeholderData: [],
    enabled,
  });
}

export function useMessStats() {
  return useQuery<{ totalContribution: number; totalSpent: number; balance: number; adjustedDailyRate: number }>({
    queryKey: QUERY_KEYS.messStats,
    queryFn: () => api('/api/mess/stats'),
  });
}
