import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api-client';
import { invalidateMessData } from '@/hooks/use-mess-queries';
import { getDeviceInfo } from '@/lib/utils';
import { useAuthStore } from '@/hooks/use-auth-store';
import type { Member, Expense } from '@shared/types';
const ExpenseFormSchema = z.object({
  memberId: z.string().min(1, 'Please select a member'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
  period: z.string().optional(),
});
type FormValues = z.infer<typeof ExpenseFormSchema>;
interface ExpenseFormProps {
  members: Member[];
  expense?: Expense;
  onSuccess: () => void;
}
const ExpenseForm = ({ members, expense, onSuccess }: ExpenseFormProps) => {
  const queryClient = useQueryClient();
  const { role, member: loggedInMember } = useAuthStore();
  const isEditMode = !!expense;
  const isAdmin = role === 'admin'; // Includes both Super Admin and Admin Members
  const isStandardMember = role === 'member'; // Standard Members only

  const initialMemberId = expense?.memberId || loggedInMember?.id || (members.length > 0 ? members[0].id : '');

  const form = useForm({
    resolver: zodResolver(ExpenseFormSchema),
    defaultValues: {
      memberId: initialMemberId,
      amount: expense?.amount || undefined,
      date: expense ? format(new Date(expense.date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      note: expense?.note || '',
      period: expense?.period || '',
    },
  });

  const activeMemberName = expense?.memberId
    ? members.find((m) => m.id === expense.memberId)?.name || loggedInMember?.name
    : loggedInMember?.name;

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const endpoint = isEditMode ? `/api/expenses/${expense.id}` : '/api/expenses';
      const method = isEditMode ? 'PUT' : 'POST';
      const loggedInUser = loggedInMember || { id: 'admin', name: 'Admin' };
      const payload = isEditMode
        ? values
        : {
            ...values,
            deviceInfo: getDeviceInfo(),
            addedById: loggedInUser.id,
            addedByName: loggedInUser.name,
          };
      return api(endpoint, { method, body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success(`Expense ${isEditMode ? 'updated' : 'logged'} successfully!`);
      invalidateMessData(queryClient);
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to ${isEditMode ? 'update' : 'log'} expense: ${error.message}`);
    },
  });

  function onSubmit(values: z.infer<typeof ExpenseFormSchema>) {
    mutation.mutate(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {isStandardMember ? (
          <FormItem>
            <FormLabel>Paid By</FormLabel>
            <div className="flex items-center gap-2 p-3 bg-muted/60 rounded-md border text-sm font-medium">
              <span>{activeMemberName || loggedInMember?.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">(Auto-assigned to your profile)</span>
            </div>
          </FormItem>
        ) : (
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Paid By</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a member" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount (AED)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="e.g., 50.75" {...field} value={field.value === undefined ? '' : String(field.value)} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Note (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Groceries from Lulu" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="period"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Period (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 2024-10" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? (isEditMode ? 'Updating...' : 'Logging...') : (isEditMode ? 'Update Expense' : 'Log Expense')}
        </Button>
      </form>
    </Form>
  );
};
export default ExpenseForm;