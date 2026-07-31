import { useMemo, useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DollarSign, Users, ShoppingCart, Download, TrendingUp, KeyRound, XCircle, Info } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';
import { api } from '@/lib/api-client';
import { getDeviceInfo } from '@/lib/utils';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useExpenses, useAuditLogs, QUERY_KEYS, invalidateMessData } from '@/hooks/use-mess-queries';
import type { MessSettings, Member, Expense, AuditLog } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import StatCard from '@/components/dashboard/StatCard';
import MembersTable from '@/components/dashboard/MembersTable';
import ExpensesTable from '@/components/dashboard/ExpensesTable';
import AuditLogsTable from '@/components/dashboard/AuditLogsTable';
import DashboardActions from '@/components/dashboard/DashboardActions';
import MemberForm from '@/components/forms/MemberForm';
import ExpenseForm from '@/components/forms/ExpenseForm';
import { exportAdminReport } from '@/lib/reporting';
import { getAdjustedDailyRate, getMessPoolBalance, getPersonalBalance } from '@/lib/mess-stats';
import SetAdminPasswordDialog from './SetAdminPasswordDialog';
import ResetAdminPasswordDialog from './ResetAdminPasswordDialog';
import SuperAdminChangePasswordDialog from './SuperAdminChangePasswordDialog';

interface AdminDashboardProps {
  settings: MessSettings;
  members: Member[];
  adminUser: Member | null;
  initialExpenses: Expense[];
}

const AdminDashboard = ({ settings, members, adminUser, initialExpenses }: AdminDashboardProps) => {
  const queryClient = useQueryClient();
  const { role, member } = useAuthStore();
  const isSuperAdmin = role === 'admin' && !member;
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [promotingMember, setPromotingMember] = useState<Member | null>(null);
  const [resettingPasswordFor, setResettingPasswordFor] = useState<Member | null>(null);
  const [isChangePasswordOpen, setChangePasswordOpen] = useState(false);
  const [expenseFilters, setExpenseFilters] = useState<any>({ period: 'current' });
  const [isDownloading, setIsDownloading] = useState(false);
  const [loadAuditLogs, setLoadAuditLogs] = useState(false);

  const needsAllExpenses = expenseFilters.period !== 'current';
  const { data: allExpenses = [] } = useExpenses({ period: 'all' }, needsAllExpenses);
  const expenses = needsAllExpenses ? allExpenses : initialExpenses;
  const { data: auditLogs = [] } = useAuditLogs(isSuperAdmin && loadAuditLogs);

  useEffect(() => {
    if (!isSuperAdmin) return;
    const timer = window.setTimeout(() => setLoadAuditLogs(true), 100);
    return () => window.clearTimeout(timer);
  }, [isSuperAdmin]);

  const { mutate: createAuditLog } = useMutation({
    mutationFn: (log: Partial<AuditLog>) => api('/api/audit-logs', { method: 'POST', body: JSON.stringify(log) }),
    onError: (err) => console.error('Failed to create audit log:', err),
  });

  const { mutate: deleteMember } = useMutation({
    mutationFn: (id: string) => api(`/api/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Member deleted successfully');
      invalidateMessData(queryClient);
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const { mutate: deleteExpense } = useMutation({
    mutationFn: (id: string) => api(`/api/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Expense deleted successfully');
      invalidateMessData(queryClient);
    },
    onError: (err) => toast.error((err as Error).message),
  });

  const { mutate: toggleAdminRole } = useMutation({
    mutationFn: ({ memberId, newRole, password }: { memberId: string; newRole: 'admin' | 'member'; password?: string }) =>
      api(`/api/members/${memberId}/role`, { method: 'PUT', body: JSON.stringify({ role: newRole, password }) }),
    onSuccess: () => {
      toast.success("Member's role updated successfully");
      invalidateMessData(queryClient);
      setPromotingMember(null);
    },
    onError: (err) => toast.error(`Failed to update role: ${(err as Error).message}`),
  });

  const { mutate: resetPassword } = useMutation({
    mutationFn: ({ memberId, password }: { memberId: string; password?: string }) =>
      api(`/api/members/${memberId}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
    onSuccess: () => {
      toast.success('Admin password has been reset.');
      setResettingPasswordFor(null);
    },
    onError: (err) => toast.error(`Failed to reset password: ${(err as Error).message}`),
  });

  const { mutate: clearAuditLogs } = useMutation({
    mutationFn: (dateRange: DateRange) => {
      const params = new URLSearchParams({
        startDate: dateRange.from!.toISOString(),
        endDate: dateRange.to!.toISOString(),
      });
      return api(`/api/audit-logs?${params.toString()}`, { method: 'DELETE' });
    },
    onSuccess: (data: { deletedCount: number }) => {
      toast.success(`${data.deletedCount} audit logs cleared successfully.`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auditLogs });
    },
    onError: (err) => toast.error(`Failed to clear audit logs: ${(err as Error).message}`),
  });

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m.name])), [members]);

  const filteredExpensesForReport = useMemo(() => {
    return expenses.filter(expense => {
      if (expenseFilters.search) {
        const searchTerm = expenseFilters.search.toLowerCase();
        const memberName = memberMap.get(expense.memberId)?.toLowerCase() || '';
        const addedByName = expense.addedByName.toLowerCase();
        const note = expense.note?.toLowerCase() || '';
        const amount = expense.amount.toString();
        if (!memberName.includes(searchTerm) && !addedByName.includes(searchTerm) && !note.includes(searchTerm) && !amount.includes(searchTerm)) {
          return false;
        }
      }
      if (expenseFilters.memberId && expenseFilters.memberId !== 'all' && expense.memberId !== expenseFilters.memberId) return false;
      if (expenseFilters.addedById && expenseFilters.addedById !== 'all' && expense.addedById !== expenseFilters.addedById) return false;
      if (expenseFilters.period && expenseFilters.period !== 'all') {
        if (expenseFilters.period === 'current' && expense.period) return false;
        if (expenseFilters.period !== 'current' && expense.period !== expenseFilters.period) return false;
      }
      if (expenseFilters.dateRange?.from && new Date(expense.date) < startOfDay(expenseFilters.dateRange.from)) return false;
      if (expenseFilters.dateRange?.to && new Date(expense.date) > endOfDay(expenseFilters.dateRange.to)) return false;
      if (expenseFilters.minAmount && expense.amount < parseFloat(expenseFilters.minAmount)) return false;
      if (expenseFilters.maxAmount && expense.amount > parseFloat(expenseFilters.maxAmount)) return false;
      return true;
    });
  }, [expenses, expenseFilters, memberMap]);

  const { totalContribution, totalSpent, balance, membersWithExpenses, adjustedDailyRate, remainingDays, cycleEnded } = useMemo(() => {
    const currentExpenses = expenses.filter(e => !e.period);
    const totalContribution = members.reduce((sum, m) => sum + m.contribution, 0);
    const totalSpent = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = getMessPoolBalance(totalContribution, totalSpent);
    const expenseTotals = new Map<string, number>();
    for (const e of currentExpenses) {
      expenseTotals.set(e.memberId, (expenseTotals.get(e.memberId) ?? 0) + e.amount);
    }
    const membersWithExpenses = members.map(m => {
      const totalExpenses = expenseTotals.get(m.id) ?? 0;
      return { ...m, totalExpenses, balance: getPersonalBalance(m.contribution, totalExpenses) };
    });
    const { rate, remainingDays, cycleEnded } = getAdjustedDailyRate(balance, settings.totalDays);
    return {
      totalContribution,
      totalSpent,
      balance,
      membersWithExpenses,
      adjustedDailyRate: rate,
      remainingDays,
      cycleEnded,
    };
  }, [settings, members, expenses]);

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const userName = member?.name || 'Super Admin';
      await exportAdminReport(membersWithExpenses, filteredExpensesForReport, (log) => {
        createAuditLog({
          ...log,
          userId: member?.id || 'super_admin',
          userName,
          deviceInfo: getDeviceInfo(),
        });
      }, expenseFilters);
      toast.success('Report downloaded successfully!');
    } catch (error) {
      toast.error('Failed to generate report.');
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadLogs = async (logs: AuditLog[]) => {
    try {
      const { exportAuditLogs } = await import('@/lib/reporting');
      await exportAuditLogs(logs);
      toast.success('Audit logs downloaded successfully!');
    } catch (error) {
      toast.error('Failed to download audit logs.');
      console.error(error);
    }
  };

  const isFiltersActive = expenseFilters.period !== 'current' || expenseFilters.dateRange || expenseFilters.search || expenseFilters.memberId !== 'all' || expenseFilters.addedById !== 'all' || expenseFilters.minAmount || expenseFilters.maxAmount;

  return (
    <div className="py-8 md:py-10 lg:py-12">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <DashboardActions settings={settings} members={members} />
        <div className="flex flex-col items-stretch sm:items-end space-y-2 w-full md:w-auto">
          <Button onClick={handleDownloadReport} variant="outline" className="w-full sm:w-auto" disabled={isDownloading}>
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? 'Generating...' : 'Download Report'}
          </Button>
          {isSuperAdmin && (
            <Button onClick={() => setChangePasswordOpen(true)} variant="secondary" className="w-full sm:w-auto">
              <KeyRound className="mr-2 h-4 w-4" />
              Change My Password
            </Button>
          )}
        </div>
      </div>
      <div className="grid gap-6 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 mt-8">
        <StatCard
          title="Total Contributions"
          value={totalContribution}
          icon={DollarSign}
          formatAsCurrency
          description="All members combined"
        />
        <StatCard
          title="Total Spent"
          value={totalSpent}
          icon={ShoppingCart}
          formatAsCurrency
          description="All expenses this cycle"
        />
        <StatCard
          title="Mess Pool Left"
          value={balance}
          icon={DollarSign}
          formatAsCurrency
          isPositive={balance >= 0}
          description="Contributions − all expenses (shared money)"
        />
        <StatCard
          title="Daily Spend Guide"
          value={adjustedDailyRate}
          icon={TrendingUp}
          formatAsCurrency
          isPositive={!cycleEnded && adjustedDailyRate >= 0}
          displayValue={cycleEnded ? 'Cycle ended' : undefined}
          description={
            cycleEnded
              ? 'No days left in this cycle'
              : `${remainingDays} day${remainingDays === 1 ? '' : 's'} left · pool ÷ days`
          }
        />
        <StatCard title="Total Members" value={members.length} icon={Users} />
      </div>
      <Alert className="mt-6 bg-slate-50 border-slate-200">
        <Info className="h-4 w-4" />
        <AlertTitle className="text-sm font-semibold">How to read these numbers</AlertTitle>
        <AlertDescription className="text-sm text-muted-foreground mt-1">
          <strong>Mess Pool Left</strong> is money left for the whole group (contributions minus all expenses).
          The table below shows each member&apos;s <strong>personal balance</strong> (their contribution minus what they paid).
          Red personal balances are normal when someone paid more bills than they contributed — the pool can still be positive.
        </AlertDescription>
      </Alert>
      <div className="mt-10 space-y-10">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold mb-1 text-gray-800">Members Overview</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Personal balance = contribution − expenses paid by that member (not the shared pool).
            </p>
            <MembersTable
              members={membersWithExpenses}
              onEdit={(m) => setEditingMember(m)}
              onDelete={deleteMember}
              isSuperAdmin={isSuperAdmin}
              onToggleAdmin={toggleAdminRole}
              onPromote={(m) => setPromotingMember(m)}
              onResetPassword={(m) => setResettingPasswordFor(m)}
            />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
              <h2 className="text-2xl font-semibold text-gray-800">Expenses History</h2>
              {isFiltersActive && (
                <Badge variant="secondary" className="flex items-center gap-2">
                  Filtered View
                  <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setExpenseFilters({ period: 'current', memberId: 'all', addedById: 'all' })}>
                    <XCircle className="h-3 w-3" />
                  </Button>
                </Badge>
              )}
            </div>
            <ExpensesTable
              expenses={expenses}
              members={members}
              onEdit={(expense) => setEditingExpense(expense)}
              onDelete={deleteExpense}
              onFiltersChange={setExpenseFilters}
            />
          </CardContent>
        </Card>
        {isSuperAdmin && (
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Audit Logs</h2>
              <AuditLogsTable
                auditLogs={auditLogs}
                onClearLogs={clearAuditLogs}
                onDownloadLogs={handleDownloadLogs}
              />
            </CardContent>
          </Card>
        )}
      </div>
      <Dialog open={!!editingMember} onOpenChange={(isOpen) => !isOpen && setEditingMember(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Member</DialogTitle></DialogHeader>
          {editingMember && <MemberForm member={editingMember} onSuccess={() => setEditingMember(null)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingExpense} onOpenChange={(isOpen) => !isOpen && setEditingExpense(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Expense</DialogTitle></DialogHeader>
          {editingExpense && <ExpenseForm expense={editingExpense} members={members} onSuccess={() => setEditingExpense(null)} />}
        </DialogContent>
      </Dialog>
      {promotingMember && <SetAdminPasswordDialog member={promotingMember} onClose={() => setPromotingMember(null)} onConfirm={(password) => toggleAdminRole({ memberId: promotingMember.id, newRole: 'admin', password })} />}
      {resettingPasswordFor && <ResetAdminPasswordDialog member={resettingPasswordFor} onClose={() => setResettingPasswordFor(null)} onConfirm={(password) => resetPassword({ memberId: resettingPasswordFor.id, password })} />}
      {isSuperAdmin && <SuperAdminChangePasswordDialog isOpen={isChangePasswordOpen} onClose={() => setChangePasswordOpen(false)} />}
    </div>
  );
};

export default AdminDashboard;
