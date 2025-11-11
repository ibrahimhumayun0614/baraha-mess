import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import type { MessSettings } from '@shared/types';
const formSchema = z.object({
  standardContribution: z.coerce.number().min(0, 'Must be a positive number'),
  reducedContribution: z.coerce.number().min(0, 'Must be a positive number'),
  totalDays: z.coerce.number().int().min(1, 'Must be at least 1 day'),
});
interface SetupMessFormProps {
  settings?: MessSettings;
  onSuccess: () => void;
}
const SetupMessForm = ({ settings, onSuccess }: SetupMessFormProps) => {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      standardContribution: settings?.standardContribution || 450,
      reducedContribution: settings?.reducedContribution || 250,
      totalDays: settings?.totalDays || 30,
    },
  });
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof formSchema>) => api('/api/mess/init', { method: 'POST', body: JSON.stringify(values) }),
    onSuccess: () => {
      toast.success('Mess settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['messState'] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed to save settings: ${error.message}`);
    },
  });
  function onSubmit(values: z.infer<typeof formSchema>) {
    mutation.mutate(values);
  }
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="standardContribution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Standard Contribution (AED)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 450" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="reducedContribution"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reduced Contribution (AED)</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 250" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="totalDays"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Total Mess Days</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 30" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving...' : 'Save Settings'}
        </Button>
      </form>
    </Form>
  );
};
export default SetupMessForm;