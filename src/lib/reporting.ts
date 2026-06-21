import { format } from 'date-fns';
import type { Member, Expense, AuditLog } from '@shared/types';
import { DateRange } from 'react-day-picker';

interface MemberWithBalance extends Member {
  totalExpenses: number;
  balance: number;
}

type AuditLogMutation = (log: Partial<AuditLog>) => void;

const createFileName = (base: string, filtersApplied: boolean) => {
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const suffix = filtersApplied ? '_filtered' : '';
  return `${base}_${dateStr}${suffix}.xlsx`;
};

export const exportAdminReport = async (
  members: MemberWithBalance[],
  expenses: Expense[],
  createAuditLog: AuditLogMutation,
  filters?: any
) => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const filtersApplied = filters && (filters.search || filters.dateRange || filters.period !== 'all' || filters.memberId !== 'all' || filters.addedById !== 'all' || filters.minAmount || filters.maxAmount);

  const membersData = members.map(m => ({
    Name: m.name,
    Type: m.type,
    Contribution: m.contribution,
    'Total Expenses': m.totalExpenses,
    'Remaining Balance': m.balance,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(membersData), 'Members Summary');

  const memberMap = new Map(members.map(m => [m.id, m.name]));
  const expensesData = expenses.map(e => ({
    'Paid By': memberMap.get(e.memberId) || 'Unknown',
    'Added By': e.addedByName,
    Date: format(new Date(e.date), 'yyyy-MM-dd'),
    Period: e.period || 'Current',
    Note: e.note || '',
    Amount: e.amount,
    'Device Info': e.deviceInfo,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesData), 'Filtered Expenses');

  const fileName = createFileName('Baraha_Bad_Boys_Mess_Admin_Report', !!filtersApplied);
  XLSX.writeFile(wb, fileName);
  createAuditLog({ event: 'report_download', metadata: { filters } });
};

export const exportMemberReport = async (
  member: MemberWithBalance,
  expenses: Expense[],
  createAuditLog: AuditLogMutation,
  filters?: any
) => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const filtersApplied = filters && (filters.search || filters.dateRange || filters.period !== 'all' || filters.minAmount || filters.maxAmount);

  const summaryData = [{
    Name: member.name,
    Type: member.type,
    Contribution: member.contribution,
    'Total Expenses': member.totalExpenses,
    'Remaining Balance': member.balance,
  }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryData), 'My Summary');

  const expensesData = expenses.map(e => ({
    Date: format(new Date(e.date), 'yyyy-MM-dd'),
    Period: e.period || 'Current',
    Amount: e.amount,
    Note: e.note || '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(expensesData), 'My Expenses');

  const fileName = createFileName(`Baraha_Bad_Boys_Mess_${member.name}_Report`, !!filtersApplied);
  XLSX.writeFile(wb, fileName);
  createAuditLog({ event: 'report_download', metadata: { filters } });
};

export const exportAuditLogs = async (logs: AuditLog[]) => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const formatEvent = (event: string) => event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const logsData = logs.map(log => ({
    Event: formatEvent(log.event),
    User: log.userName,
    Timestamp: format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss'),
    Details: JSON.stringify(log.metadata) || log.deviceInfo,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logsData), 'Audit Logs');
  const fileName = `Baraha_Bad_Boys_Mess_Audit_Logs_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
  XLSX.writeFile(wb, fileName);
};
