import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import type { Member, Expense } from '@shared/types';
interface MemberWithBalance extends Member {
  totalExpenses: number;
  balance: number;
}
export const exportAdminReport = (members: MemberWithBalance[], expenses: Expense[]) => {
  const wb = XLSX.utils.book_new();
  // Members Sheet
  const membersData = members.map(m => ({
    Name: m.name,
    Type: m.type,
    Contribution: m.contribution,
    'Total Expenses': m.totalExpenses,
    'Remaining Balance': m.balance,
  }));
  const membersWs = XLSX.utils.json_to_sheet(membersData);
  XLSX.utils.book_append_sheet(wb, membersWs, 'Members Summary');
  // Expenses Sheet
  const memberMap = new Map(members.map(m => [m.id, m.name]));
  const expensesData = expenses.map(e => ({
    Member: memberMap.get(e.memberId) || 'Unknown',
    Date: format(new Date(e.date), 'yyyy-MM-dd'),
    Amount: e.amount,
    Note: e.note || '',
    'Device Info': e.deviceInfo,
  }));
  const expensesWs = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(wb, expensesWs, 'All Expenses');
  // Download
  const fileName = `DineFlow_Admin_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
export const exportMemberReport = (member: MemberWithBalance, expenses: Expense[]) => {
  const wb = XLSX.utils.book_new();
  // Summary Sheet
  const summaryData = [{
    Name: member.name,
    Type: member.type,
    Contribution: member.contribution,
    'Total Expenses': member.totalExpenses,
    'Remaining Balance': member.balance,
  }];
  const summaryWs = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWs, 'My Summary');
  // Expenses Sheet
  const expensesData = expenses.map(e => ({
    Date: format(new Date(e.date), 'yyyy-MM-dd'),
    Amount: e.amount,
    Note: e.note || '',
  }));
  const expensesWs = XLSX.utils.json_to_sheet(expensesData);
  XLSX.utils.book_append_sheet(wb, expensesWs, 'My Expenses');
  // Download
  const fileName = `DineFlow_${member.name}_Report_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};