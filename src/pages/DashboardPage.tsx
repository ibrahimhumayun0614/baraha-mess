import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Toaster, toast } from 'sonner';
import { DollarSign, Users, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/hooks/use-auth-store';
import { api } from '@/lib/api-client';
import type { MessSettings, Member, Expense } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import StatCard from '@/components/dashboard/StatCard';
import MembersTable from '@/components/dashboard/MembersTable';
import ExpensesTable from '@/components/dashboard/ExpensesTable';
import DashboardActions from '@/components/dashboard/DashboardActions';
interface MessState {
  settings: MessSettings;
  members: Member[];
  expenses: Expense[];
}
export function DashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role, member, logout } = useAuthStore((state) => ({
    role: state.role,
    member: state.member,
    logout: state.logout,
  }));
  const { data: messState, isLoading, error } = useQuery<MessState>({
    queryKey: ['messState'],
    queryFn: () => api('/api/mess/state'),
    enabled: !!role,
  });
  useEffect(() => {
    if (!role) {
      navigate('/');
    }
  }, [role, navigate]);
  const { mutate: deleteMember } = useMutation({
    mutationFn: (id: string) => api(`/api/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Member deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['messState'] });
    },
    onError: (err) => toast.error(err.message),
  });
  const { mutate: deleteExpense } = useMutation({
    mutationFn: (id: string) => api(`/api/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Expense deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['messState'] });
    },
    onError: (err) => toast.error(err.message),
  });
  const { totalContribution, totalSpent, balance, membersWithExpenses } = useMemo(() => {
    if (!messState) return { totalContribution: 0, totalSpent: 0, balance: 0, membersWithExpenses: [] };
    const totalContribution = messState.members.reduce((sum, m) => sum + m.contribution, 0);
    const totalSpent = messState.expenses.reduce((sum, e) => sum + e.amount, 0);
    const balance = totalContribution - totalSpent;
    const membersWithExpenses = messState.members.map(m => {
      const memberExpenses = messState.expenses.filter(e => e.memberId === m.id);
      const totalExpenses = memberExpenses.reduce((sum, e) => sum + e.amount, 0);
      const memberBalance = m.contribution - totalExpenses;
      return { ...m, totalExpenses, balance: memberBalance };
    });
    return { totalContribution, totalSpent, balance, membersWithExpenses };
  }, [messState]);
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  if (isLoading) {
    return <DashboardSkeleton />;
  }
  if (error) {
    return <div className="p-8 text-red-500">Error loading dashboard data: {error.message}</div>;
  }
  const isAdmin = role === 'admin';
  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster richColors />
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <UtensilsCrossed className="h-8 w-8 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-800">DineFlow Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, <span className="font-semibold text-gray-800">{member?.name || 'Admin'}</span>
            </span>
            <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {isAdmin && <DashboardActions settings={messState?.settings} members={messState?.members || []} />}
        <motion.div
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mt-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.1 } }
          }}
        >
          <StatCard title="Total Contribution" value={totalContribution} icon={DollarSign} formatAsCurrency />
          <StatCard title="Total Spent" value={totalSpent} icon={ShoppingCart} formatAsCurrency />
          <StatCard title="Remaining Balance" value={balance} icon={DollarSign} formatAsCurrency isPositive={balance >= 0} />
          <StatCard title="Total Members" value={messState?.members.length || 0} icon={Users} />
        </motion.div>
        <div className="mt-10 space-y-10">
          {isAdmin && (
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h2 className="text-2xl font-semibold mb-4 text-gray-800">Members Overview</h2>
                <MembersTable members={membersWithExpenses} onEdit={() => {}} onDelete={deleteMember} />
              </CardContent>
            </Card>
          )}
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800">Recent Expenses</h2>
              <ExpensesTable
                expenses={messState?.expenses || []}
                members={messState?.members || []}
                onDelete={isAdmin ? deleteExpense : undefined}
              />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
function DashboardSkeleton() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <Skeleton className="h-12 w-1/4 mb-8" />
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <div className="mt-10">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}