import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { AuditLog } from '@shared/types';
interface AuditLogsTableProps {
  auditLogs: AuditLog[];
}
const AuditLogsTable = ({ auditLogs }: AuditLogsTableProps) => {
  const formatEvent = (event: string) => {
    return event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  const renderDetails = (log: AuditLog) => {
    const { event, metadata, deviceInfo } = log;
    if (!metadata) return deviceInfo;
    let details = '';
    switch (event) {
      case 'login':
        details = `Logged in from: ${deviceInfo}`;
        break;
      case 'expense_created':
        details = `Amount: ${metadata.amount} AED. From: ${deviceInfo}`;
        break;
      case 'expense_updated':
        details = `Expense for ${metadata.memberName} updated. Changes: ${JSON.stringify(metadata.changes)}. From: ${deviceInfo}`;
        break;
      case 'expense_deleted':
        details = `Expense of ${metadata.amount} AED for ${metadata.memberName} deleted. From: ${deviceInfo}`;
        break;
      case 'member_created':
        details = `New member '${metadata.name}' created. From: ${deviceInfo}`;
        break;
      case 'member_updated':
        details = `Member details updated. Changes: ${JSON.stringify(metadata.changes)}. From: ${deviceInfo}`;
        break;
      case 'member_deleted':
        details = `Member '${metadata.name}' deleted. From: ${deviceInfo}`;
        break;
      case 'report_download':
        details = `Report downloaded from: ${deviceInfo}`;
        break;
      default:
        details = deviceInfo;
    }
    return details;
  };
  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Event</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Timestamp</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {auditLogs.length > 0 ? (
            auditLogs.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant="secondary">{formatEvent(log.event)}</Badge>
                </TableCell>
                <TableCell className="font-medium whitespace-nowrap">{log.userName}</TableCell>
                <TableCell className="whitespace-nowrap">{format(new Date(log.timestamp), 'PPpp')}</TableCell>
                <TableCell className="text-muted-foreground text-sm">{renderDetails(log)}</TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center">
                No audit logs found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
export default AuditLogsTable;