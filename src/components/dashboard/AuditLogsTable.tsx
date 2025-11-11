import { useState, useMemo } from 'react';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AuditLog, AuditLogEvent } from '@shared/types';
interface AuditLogsTableProps {
  auditLogs: AuditLog[];
}
const AuditLogsTable = ({ auditLogs }: AuditLogsTableProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [eventFilter, setEventFilter] = useState('all');
  const formatEvent = (event: string) => {
    return event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };
  const uniqueEvents = useMemo(() => {
    const events = new Set(auditLogs.map(log => log.event));
    return Array.from(events);
  }, [auditLogs]);
  const filteredLogs = useMemo(() => {
    return auditLogs
      .filter(log => {
        if (eventFilter !== 'all' && log.event !== eventFilter) {
          return false;
        }
        if (searchTerm) {
          const lowerSearch = searchTerm.toLowerCase();
          return (
            log.userName.toLowerCase().includes(lowerSearch) ||
            log.deviceInfo.toLowerCase().includes(lowerSearch) ||
            (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(lowerSearch))
          );
        }
        return true;
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLogs, searchTerm, eventFilter]);
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
    <div>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <Input
          placeholder="Search logs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by event" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Events</SelectItem>
            {uniqueEvents.map(event => (
              <SelectItem key={event} value={event}>{formatEvent(event)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
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
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
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
    </div>
  );
};
export default AuditLogsTable;