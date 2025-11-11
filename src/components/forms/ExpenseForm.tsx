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
import { getDeviceInfo } from '@/lib/utils';
import { useAuthStore } from '@/hooks/use-auth-store';
import type { Member } from '@shared/types';
const formSchema = z.object({
  memberId: z.string().min(1, 'Please select a member'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
});
interface ExpenseFormProps {
  members: Member[];
  onSuccess: () => void;
}
const ExpenseForm = ({ members, onSuccess }: ExpenseFormProps) => {
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const loggedInMember = useAuthStore((state) => state.member);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      memberId: role === 'member' ? loggedInMember?.id : '',
      amount: undefined, // Use undefined for placeholder to show
      date: format(new Date(), 'yyyy-MM-dd'),
      note: '',
    },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => {
      const payload = { ...values, deviceInfo: getDeviceInfo() };
      return api('/api/expenses', { method: 'POST', body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast.success('Expense logged successfully!');
      queryClient.invalidateQueries({ queryKey: ['messState'] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to log expense: ${error.message}`);
    },
  });
  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {role === 'admin' && (
          <FormField
            control={form.control}
            name="memberId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Member</FormLabel>
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
                <Input type="number" step="0.01" placeholder="e.g., 50.75" {...field} />
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
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Logging...' : 'Log Expense'}
        </Button>
      </form>
    </Form>
  );
};
export default ExpenseForm;