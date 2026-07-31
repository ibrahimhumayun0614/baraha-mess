import { useEffect } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import type {
  MessSettings,
  Member,
  Expense,
  AuditLog,
  MessStats,
  AdminDashboardData,
  MemberDashboardData,
} from '@shared/types';

export const QUERY_KEYS = {
  members: ['members'] as const,
  messSettings: ['messSettings'] as const,
  expenses: (filters?: Record<string, string>) => ['expenses', filters ?? {}] as const,
  auditLogs: ['auditLogs'] as const,
  messStats: ['messStats'] as const,
  adminDashboard: ['adminDashboard'] as const,
  memberDashboard: (memberId: string) => ['memberDashboard', memberId] as const,
};

export function seedMessQueryCache(queryClient: QueryClient, data: {
  members?: Member[];
  settings?: MessSettings;
  expenses?: Expense[];
  stats?: MessStats;
  expenseFilters?: Record<string, string>;
}) {
  if (data.members) queryClient.setQueryData(QUERY_KEYS.members, data.members);
  if (data.settings) queryClient.setQueryData(QUERY_KEYS.messSettings, data.settings);
  if (data.expenses) {
    queryClient.setQueryData(QUERY_KEYS.expenses(data.expenseFilters ?? { period: 'current' }), data.expenses);
  }
  if (data.stats) queryClient.setQueryData(QUERY_KEYS.messStats, data.stats);
}

export function invalidateMessData(queryClient: QueryClient) {
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminDashboard });
  queryClient.invalidateQueries({ queryKey: ['memberDashboard'] });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.members });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messSettings });
  queryClient.invalidateQueries({ queryKey: ['expenses'] });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.messStats });
}

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

export function useExpenses(filters?: Record<string, string>, enabled = true) {
  const params = filters ? `?${new URLSearchParams(filters).toString()}` : '';
  return useQuery<Expense[]>({
    queryKey: QUERY_KEYS.expenses(filters),
    queryFn: () => api(`/api/expenses${params}`),
    placeholderData: [],
    enabled,
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
  return useQuery<MessStats>({
    queryKey: QUERY_KEYS.messStats,
    queryFn: () => api('/api/mess/stats'),
  });
}

export function useAdminDashboard() {
  const queryClient = useQueryClient();
  const query = useQuery<AdminDashboardData>({
    queryKey: QUERY_KEYS.adminDashboard,
    queryFn: () => api('/api/mess/dashboard'),
  });

  useEffect(() => {
    if (query.data) {
      seedMessQueryCache(queryClient, {
        members: query.data.members,
        settings: query.data.settings,
        expenses: query.data.expenses,
        stats: query.data.stats,
        expenseFilters: { period: 'current' },
      });
    }
  }, [query.data, queryClient]);

  return query;
}

export function useMemberDashboard(memberId: string) {
  const queryClient = useQueryClient();
  const query = useQuery<MemberDashboardData>({
    queryKey: QUERY_KEYS.memberDashboard(memberId),
    queryFn: () => api(`/api/mess/member-dashboard?memberId=${encodeURIComponent(memberId)}`),
    enabled: !!memberId,
  });

  useEffect(() => {
    if (query.data) {
      seedMessQueryCache(queryClient, {
        members: query.data.members,
        expenses: query.data.expenses,
        stats: query.data.stats,
        expenseFilters: { memberId, period: 'all' },
      });
    }
  }, [query.data, queryClient, memberId]);

  return query;
}
