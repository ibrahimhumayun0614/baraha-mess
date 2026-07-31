import { useNavigate } from 'react-router-dom';
import { Toaster, toast } from 'sonner';
import { useAuthStore } from '@/hooks/use-auth-store';
import { useAdminDashboard } from '@/hooks/use-mess-queries';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export function AdminDashboardPage() {
  const navigate = useNavigate();
  const { member, logout } = useAuthStore();
  const { data, isLoading, error } = useAdminDashboard();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const adminUser = member || { name: 'Super Admin' };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12 space-y-8">
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12 text-center">
            <p className="text-red-500">Failed to load dashboard data: {error.message}</p>
          </div>
        </div>
      );
    }
    if (data) {
      return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AdminDashboard
            settings={data.settings}
            members={data.members}
            adminUser={member}
            initialExpenses={data.expenses}
          />
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Toaster richColors />
      <DashboardHeader user={adminUser} onLogout={handleLogout} />
      {renderContent()}
    </div>
  );
}
