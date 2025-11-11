import { useMemo } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { DollarSign, Users, ShoppingCart, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '@/lib/api-client';
import type { MessSettings, Member, Expense } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import StatCard from '@/components/dashboard/StatCard';
import MembersTable from '@/components/dashboard/MembersTable';
import ExpensesTable from '@/components/dashboard/ExpensesTable';
import DashboardActions from '@/components/dashboard/DashboardActions';
import { exportAdminReport } from '@/lib/reporting';
interface MessState {
  settings: MessSettings;
  members: Member[];
  expenses: Expense[];
}
interface AdminDashboardProps {
  messState: MessState;
}
const AdminDashboard = ({ messState }: AdminDashboardProps) => {
  const queryClient = useQueryClient();
  const { mutate: deleteMember } = useMutation({
    mutationFn: (id: string) => api(`/api/members/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Member deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['messState'] });
    },
    onError: (err) => toast.error((err as Error).message),
  });
  const { mutate: deleteExpense } = useMutation({
    mutationFn: (id: string) => api(`/api/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      toast.success('Expense deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['messState'] });
    },
    onError: (err) => toast.error((err as Error).message),
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
  const handleDownloadReport = () => {
    try {
      exportAdminReport(membersWithExpenses, messState.expenses);
      toast.success("Report downloaded successfully!");
    } catch (error) {
      toast.error("Failed to generate report.");
      console.error(error);
    }
  };
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="flex justify-between items-start">
        <DashboardActions settings={messState?.settings} members={messState?.members || []} />
        <Button onClick={handleDownloadReport} variant="outline" className="ml-4 mt-4">
          <Download className="mr-2 h-4 w-4" />
          Download Report
        </Button>
      </div>
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
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Members Overview</h2>
            <MembersTable members={membersWithExpenses} onEdit={() => { /* TODO */ }} onDelete={deleteMember} />
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Recent Expenses</h2>
            <ExpensesTable
              expenses={messState?.expenses || []}
              members={messState?.members || []}
              onDelete={deleteExpense}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
};
export default AdminDashboard;