import { format } from 'date-fns';
import { MoreHorizontal, Trash2, Pencil } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import type { Expense, Member } from '@shared/types';
interface ExpensesTableProps {
  expenses: Expense[];
  members: Member[];
  onEdit?: (expense: Expense) => void;
  onDelete?: (id: string) => void;
}
const ExpensesTable = ({ expenses, members, onEdit, onDelete }: ExpensesTableProps) => {
  const memberMap = new Map(members.map((m) => [m.id, m.name]));
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(amount);
  const hasActions = !!onEdit || !!onDelete;
  return (
    <div className="rounded-lg border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Note</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            {hasActions && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.length > 0 ? (
            expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium whitespace-nowrap">{memberMap.get(expense.memberId) || 'Unknown'}</TableCell>
                <TableCell className="whitespace-nowrap">{format(new Date(expense.date), 'PP')}</TableCell>
                <TableCell className="text-muted-foreground">{expense.note || '-'}</TableCell>
                <TableCell className="text-right whitespace-nowrap">{formatCurrency(expense.amount)}</TableCell>
                {hasActions && (
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(expense)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                          </DropdownMenuItem>
                        )}
                        {onDelete && (
                          <DropdownMenuItem onClick={() => onDelete(expense.id)} className="text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={hasActions ? 5 : 4} className="h-24 text-center">
                No expenses found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
export default ExpensesTable;