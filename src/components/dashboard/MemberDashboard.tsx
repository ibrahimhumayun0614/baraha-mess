import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { DollarSign, ShoppingCart, Wallet, PlusCircle, Download } from 'lucide-react';
import type { MessSettings, Member, Expense, AuditLog } from '@shared/types';
import { api } from '@/lib/api-client';
import { getDeviceInfo } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import StatCard from '@/components/dashboard/StatCard';
import ExpensesTable from '@/components/dashboard/ExpensesTable';
import ExpenseForm from '@/components/forms/ExpenseForm';
import { exportMemberReport } from '@/lib/reporting';
interface MessState {
  settings: MessSettings;
  members: Member[];
  expenses: Expense[];
}
interface MemberDashboardProps {
  messState: MessState;
  currentUser: Member;
}
const MemberDashboard = ({ messState, currentUser }: MemberDashboardProps) => {
  const [isExpenseOpen, setExpenseOpen] = useState(false);
  const { mutate: createAuditLog } = useMutation({
    mutationFn: (log: Partial<AuditLog>) => api('/api/audit-logs', { method: 'POST', body: JSON.stringify(log) }),
    onError: (err) => console.error("Failed to create audit log:", err),
  });
  const { myExpenses, myTotalSpent, myBalance } = useMemo(() => {
    const myExpenses = messState.expenses.filter(e => e.memberId === currentUser.id);
    const myTotalSpent = myExpenses.reduce((sum, e) => sum + e.amount, 0);
    const myBalance = currentUser.contribution - myTotalSpent;
    return { myExpenses, myTotalSpent, myBalance };
  }, [messState, currentUser]);
  const handleDownloadReport = () => {
    try {
      const memberWithBalance = {
        ...currentUser,
        totalExpenses: myTotalSpent,
        balance: myBalance,
      };
      exportMemberReport(memberWithBalance, myExpenses, (log) => {
        createAuditLog({
          ...log,
          userId: currentUser.id,
          userName: currentUser.name,
          deviceInfo: getDeviceInfo(),
        });
      });
      toast.success("Your report has been downloaded!");
    } catch (error) {
      toast.error("Failed to generate your report.");
      console.error(error);
    }
  };
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
      <div className="flex flex-wrap gap-4 items-center justify-between p-4 bg-white rounded-lg shadow-md">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">My Dashboard</h2>
          <p className="text-sm text-muted-foreground">Here's your personal mess summary.</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isExpenseOpen} onOpenChange={setExpenseOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log a New Expense</DialogTitle>
              </DialogHeader>
              <ExpenseForm members={[currentUser]} onSuccess={() => setExpenseOpen(false)} />
            </DialogContent>
          </Dialog>
          <Button onClick={handleDownloadReport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download My Report
          </Button>
        </div>
      </div>
      <motion.div
        className="grid gap-6 md:grid-cols-3 mt-8"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } }
        }}
      >
        <StatCard title="My Contribution" value={currentUser.contribution} icon={DollarSign} formatAsCurrency />
        <StatCard title="My Total Spent" value={myTotalSpent} icon={ShoppingCart} formatAsCurrency />
        <StatCard title="My Remaining Balance" value={myBalance} icon={Wallet} formatAsCurrency isPositive={myBalance >= 0} />
      </motion.div>
      <div className="mt-10">
        <Card className="shadow-lg">
          <CardContent className="p-6">
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">My Expense History</h2>
            <ExpensesTable
              expenses={myExpenses}
              members={[currentUser]}
            />
          </CardContent>
        </Card>
      </div>
    </main>
  );
};
export default MemberDashboard;